import orderModel from '../models/orderModel.js';
import { mapShiprocketStatus, parseShiprocketTimestamp, mergeTrackingHistory } from '../utils/shiprocketStatusMap.js';
import { autoRefundOnCourierReturn } from './refundController.js';

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
        // First, try to match this update against a forward (outbound) shipment.
        let order = await orderModel.findOne({
            $or: [
                { 'shiprocket.ourOrderId': order_id },
                { 'shiprocket.srOrderId': srOrderId },
                { 'shiprocket.shipmentId': shipment_id },
                { 'shiprocket.awb': awb }
            ]
        }).populate('userId', 'name email');

        let matchedPickup = false;
        if (!order) {
            // Not a forward shipment — check if it's a return/reverse-pickup shipment instead.
            order = await orderModel.findOne({
                $or: [
                    { 'refundDetails.pickup.shiprocketReturnOrderId': order_id },
                    { 'refundDetails.pickup.shipmentId': shipment_id },
                    { 'refundDetails.pickup.awb': awb }
                ]
            }).populate('userId', 'name email');
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

            if (mapped) {
                if (order.orderStatus !== mapped.orderStatus) {
                    order.orderStatus = mapped.orderStatus;
                    statusChanged = true;
                }
                if (order.shiprocketStatus !== mapped.shiprocketStatus) {
                    order.shiprocketStatus = mapped.shiprocketStatus;
                    statusChanged = true;
                }
            } else {
                console.log(`Unknown Shiprocket status received: ${current_status} for order ${order._id}`);
            }

            if (mapped?.orderStatus === 'Shipped' && (!order.shippedAt || order.shippedAt < timestamp)) {
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
