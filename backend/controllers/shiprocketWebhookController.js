import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import { mapShiprocketStatus, parseShiprocketTimestamp, mergeTrackingHistory, isStatusProgression } from '../utils/shiprocketStatusMap.js';
import { autoRefundOnCourierReturn } from './refundController.js';

// Shiprocket omits identifiers it doesn't have yet (no `shipment_id` key at
// all, `awb: ''` before a courier is assigned). Feeding those straight into a
// `$or` is how a webhook ends up updating a completely unrelated order: an
// absent key serializes to `null`, and `{ 'shiprocket.shipmentId': null }`
// matches every order that has never been assigned one. So each identifier is
// tried on its own, most-specific first, and only when it actually has a value.
const findOrderByIdentifiers = async (candidates) => {
    for (const filter of candidates) {
        const [value] = Object.values(filter);
        if (value === undefined || value === null || value === '') continue;
        const order = await orderModel.findOne(filter).populate('userId', 'name email');
        if (order) return order;
    }
    return null;
};

// Single authenticated entry point for all Shiprocket webhook deliveries.
// Two routes point here (backend/routes/webhookRoute.js and the legacy
// /api/order/shiprocket-webhook mount) so whichever URL is configured in the
// Shiprocket panel, status updates go through the same logic.
export const handleWebhook = async (req, res) => {
    // Shiprocket signs webhooks with a shared secret header rather than a
    // cryptographic signature; this is what their platform supports.
    const shiprocketToken = req.headers['x-api-key'];
    if (!shiprocketToken || shiprocketToken !== process.env.SHIPROCKET_WEBHOOK_SECRET) {
        console.warn('Unauthorized Shiprocket Webhook Access: Invalid or missing token');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log('Shiprocket Webhook Payload:', req.body);

    const { order_id, shipment_id, current_status } = req.body;
    const awb = req.body.awb;
    const srOrderId = req.body.sr_order_id;

    if (!awb && !order_id && !shipment_id) {
        console.log("Webhook ignored: Missing awb, order_id, or shipment_id");
        return res.status(400).json({ success: false, message: 'Missing tracking identifier' });
    }

    try {
        // Reverse pickups are created with our order id prefixed (`RET-<id>`),
        // so that prefix is an unambiguous signal that this is a return leg.
        const isReturnOrderId = typeof order_id === 'string' && order_id.startsWith('RET-');
        const ourOrderId = isReturnOrderId ? order_id.slice(4) : order_id;

        // First, try to match this update against a forward (outbound) shipment.
        let order = isReturnOrderId ? null : await findOrderByIdentifiers([
            { 'shiprocket.ourOrderId': ourOrderId },
            { 'shiprocket.srOrderId': srOrderId },
            { 'shiprocket.shipmentId': shipment_id },
            { 'shiprocket.awb': awb },
            // Orders placed before the shiprocket sub-document existed (or whose
            // creation call failed) still carry our Mongo _id as the channel order id.
            { _id: mongoose.isValidObjectId(ourOrderId) ? ourOrderId : undefined }
        ]);

        let matchedPickup = false;
        if (!order) {
            // Not a forward shipment — check if it's a return/reverse-pickup shipment instead.
            order = await findOrderByIdentifiers([
                { 'refundDetails.pickup.shiprocketReturnOrderId': order_id },
                // createReturnOrder stores Shiprocket's own order id, which comes
                // back on the webhook as sr_order_id rather than order_id.
                { 'refundDetails.pickup.shiprocketReturnOrderId': srOrderId },
                { 'refundDetails.pickup.shipmentId': shipment_id },
                { 'refundDetails.pickup.awb': awb },
                { _id: isReturnOrderId && mongoose.isValidObjectId(ourOrderId) ? ourOrderId : undefined }
            ]);
            matchedPickup = !!order;
        }

        if (!order) {
            console.log(`Order not found for Shiprocket identifiers: awb: ${awb}, order_id: ${order_id}, shipment_id: ${shipment_id}`);
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const mapped = mapShiprocketStatus(current_status);
        const timestamp = parseShiprocketTimestamp(req.body.current_timestamp);
        const activityEntry = {
            status: mapped?.shiprocketStatus || 'UNKNOWN',
            activity: req.body.current_status_body || current_status || '',
            location: req.body.location || req.body.current_location || '',
            date: timestamp
        };

        let statusChanged = false;

        if (matchedPickup) {
            // --- Reverse pickup (return) tracking update ---
            const pickup = order.refundDetails.pickup;
            pickup.trackingHistory = mergeTrackingHistory(pickup.trackingHistory, [activityEntry]);

            if (mapped) {
                const pickupStatusMap = {
                    'NEW': 'scheduled',
                    'PICKUP SCHEDULED': 'scheduled',
                    'PICKED UP': 'picked_up',
                    'SHIPPED': 'picked_up',
                    'IN_TRANSIT': 'in_transit',
                    'DELIVERED': 'delivered_to_warehouse'
                };
                const newPickupStatus = pickupStatusMap[mapped.shiprocketStatus];
                if (newPickupStatus && pickup.status !== newPickupStatus) {
                    pickup.status = newPickupStatus;
                    statusChanged = true;
                }
            }
        } else {
            // --- Forward shipment tracking update ---
            order.shiprocket.trackingHistory = mergeTrackingHistory(order.shiprocket.trackingHistory, [activityEntry]);
            order.shiprocket.lastTrackedAt = new Date();

            // Manual shipments only get an AWB/courier once an admin ships
            // them from the Shiprocket dashboard — the webhook delivery that
            // reports that is often the first time we see this data, so
            // capture it here rather than waiting on the polling fallback.
            if (awb && order.shiprocket.awb !== awb) {
                order.shiprocket.awb = awb;
                order.shiprocket.trackingUrl = `https://shiprocket.co/tracking/${awb}`;
                statusChanged = true;
            }
            if (req.body.courier_name && order.shiprocket.courier !== req.body.courier_name) {
                order.shiprocket.courier = req.body.courier_name;
                statusChanged = true;
            }
            if (shipment_id && !order.shiprocket.shipmentId) {
                order.shiprocket.shipmentId = shipment_id;
            }
            if (req.body.etd) {
                const parsedEdd = new Date(req.body.etd);
                if (!isNaN(parsedEdd.getTime())) order.shiprocket.edd = parsedEdd;
            }

            // An AWB existing at all means the shipment was dispatched from the
            // Shiprocket panel. Some accounts push that delivery with a status
            // string we can't map (or with none at all), so treat the AWB itself
            // as the signal rather than leaving the order stuck on 'Processing'.
            const effective = mapped
                || (order.shiprocket.awb ? mapShiprocketStatus('AWB ASSIGNED') : null);

            if (!mapped) {
                console.log(`Unknown Shiprocket status received: ${current_status} for order ${order._id}`);
            }

            if (effective && isStatusProgression(order.shiprocketStatus, effective.shiprocketStatus)) {
                order.orderStatus = effective.orderStatus;
                order.shiprocketStatus = effective.shiprocketStatus;
                statusChanged = true;
            }

            if (effective?.orderStatus === 'Shipped' && !order.shippedAt) {
                order.shippedAt = timestamp;
                statusChanged = true;
            }
            if (mapped?.orderStatus === 'Delivered' && (!order.deliveredAt || order.deliveredAt < timestamp)) {
                order.deliveredAt = timestamp;
                statusChanged = true;
            }
        }

        // Tracking history is always worth persisting, even if the mapped
        // status didn't change, so the timeline UI has every scan event.
        await order.save();
        console.log(`Order ${order._id} ${matchedPickup ? 'pickup ' : ''}tracking updated (statusChanged=${statusChanged}) for Shiprocket status: ${current_status}`);

        // The parcel is confirmed back at origin — a prepaid customer never
        // received it, so refund it automatically rather than waiting on an
        // admin to notice. COD orders are a no-op (nothing was ever charged).
        if (!matchedPickup && mapped?.shiprocketStatus === 'RTO_DELIVERED') {
            await autoRefundOnCourierReturn(order);
        }

        res.status(200).json({ success: true, message: 'Webhook received successfully' });

    } catch (error) {
        console.error('Error handling Shiprocket webhook:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
