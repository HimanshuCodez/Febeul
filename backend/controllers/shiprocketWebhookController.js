import orderModel from '../models/orderModel.js';

export const handleWebhook = async (req, res) => {
    // It's good practice to verify the webhook source. Shiprocket uses a signature.
    // However, the provided code uses a simple secret token which is less secure but better than nothing.
    const shiprocketToken = req.headers['x-api-key'];
    if (!shiprocketToken || shiprocketToken !== process.env.SHIPROCKET_WEBHOOK_SECRET) {
        console.warn('Unauthorized Shiprocket Webhook Access: Invalid or missing token');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log('Shiprocket Webhook Payload:', req.body);

    const { order_id, shipment_id, current_status } = req.body;

    // Use awb (Airway Bill Number) if available, as it's a reliable unique identifier
    const awb = req.body.awb;

    if (!awb && !order_id && !shipment_id) {
        console.log("Webhook ignored: Missing awb, order_id, or shipment_id");
        return res.status(400).json({ success: false, message: 'Missing tracking identifier' });
    }

    try {
        // Find the order in the database
        let order = await orderModel.findOne({
            $or: [
                { 'shiprocket.ourOrderId': order_id },
                { 'shiprocket.srOrderId': req.body.sr_order_id },
                { 'shiprocket.shipmentId': shipment_id },
                { 'shiprocket.awb': awb }
            ]
        }).populate('userId', 'name email'); // Populate user for potential notifications

        if (!order) {
            console.log(`Order not found for Shiprocket identifiers: awb: ${awb}, order_id: ${order_id}, shipment_id: ${shipment_id}`);
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // --- Status Mapping Logic ---
        const shiprocketToInternalStatus = {
            "NEW": { orderStatus: "Processing", shiprocketStatus: "NEW" },
            "PICKUP SCHEDULED": { orderStatus: "Processing", shiprocketStatus: "PICKUP SCHEDULED" },
            "Shipped": { orderStatus: "Shipped", shiprocketStatus: "SHIPPED" },
            "In Transit": { orderStatus: "Shipped", shiprocketStatus: "IN_TRANSIT" },
            "Out For Delivery": { orderStatus: "Out for delivery", shiprocketStatus: "IN_TRANSIT" },
            "Delivered": { orderStatus: "Delivered", shiprocketStatus: "DELIVERED" },
            "Cancelled": { orderStatus: "Cancelled", shiprocketStatus: "CANCELLED" },
            "RTO INITIATED": { orderStatus: "Returned", shiprocketStatus: "RTO" },
            "RTO DELIVERED": { orderStatus: "Returned", shiprocketStatus: "RTO" },
            "UNDELIVERED": { orderStatus: "Failed", shiprocketStatus: "UNKNOWN" },
        };

        const newStatus = shiprocketToInternalStatus[current_status];

        let statusChanged = false;
        if (newStatus) {
            if (order.orderStatus !== newStatus.orderStatus) {
                order.orderStatus = newStatus.orderStatus;
                statusChanged = true;
            }
            if (order.shiprocketStatus !== newStatus.shiprocketStatus) {
                order.shiprocketStatus = newStatus.shiprocketStatus;
                statusChanged = true;
            }
        } else {
             // If status is not in our map, we at least log it and maybe save it if it's a valid enum
            console.log(`Unknown Shiprocket status received: ${current_status} for order ${order._id}`);
            const validShiprocketEnums = orderModel.schema.path('shiprocketStatus').enumValues;
            if (validShiprocketEnums.includes(current_status) && order.shiprocketStatus !== current_status) {
                order.shiprocketStatus = current_status;
                statusChanged = true;
            }
        }

        // Update timestamps
        const webhookTimestampStr = req.body.current_timestamp;
        let webhookTimestamp = null;
        if (webhookTimestampStr) {
            // Shiprocket timestamp format: 'DD MM YYYY HH:MM:SS'
            const parts = webhookTimestampStr.match(/(\d{2}) (\d{2}) (\d{4}) (\d{2}):(\d{2}):(\d{2})/);
            if (parts) {
                // Reformat to YYYY-MM-DD HH:MM:SS for robust Date parsing
                webhookTimestamp = new Date(`${parts[3]}-${parts[2]}-${parts[1]} ${parts[4]}:${parts[5]}:${parts[6]}`);
            } else {
                // Fallback if regex parsing fails or format is different
                webhookTimestamp = new Date(webhookTimestampStr); 
            }
        }
        
        // Ensure webhookTimestamp is a valid Date object before using it
        if (!webhookTimestamp || isNaN(webhookTimestamp.getTime())) {
            webhookTimestamp = new Date(); // Fallback to current time if webhook timestamp is invalid
        }

        if (newStatus && newStatus.orderStatus === 'Shipped' && (!order.shippedAt || order.shippedAt < webhookTimestamp)) {
            order.shippedAt = webhookTimestamp;
            statusChanged = true;
        }
        if (newStatus && newStatus.orderStatus === 'Delivered' && (!order.deliveredAt || order.deliveredAt < webhookTimestamp)) {
            order.deliveredAt = webhookTimestamp;
            statusChanged = true;
        }

        if (statusChanged) {
            await order.save();
            console.log(`Order ${order._id} status updated. Internal: ${order.orderStatus}, Shiprocket: ${order.shiprocketStatus}`);
        } else {
            console.log(`Order ${order._id} status requires no update for Shiprocket status: ${current_status}`);
        }

        res.status(200).json({ success: true, message: 'Webhook received successfully' });

    } catch (error) {
        console.error('Error handling Shiprocket webhook:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
