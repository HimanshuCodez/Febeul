import orderModel from '../models/orderModel.js';

export const handleWebhook = async (req, res) => {
    // Verify webhook token
    const shiprocketToken = req.headers['x-api-key'];
    if (!shiprocketToken || shiprocketToken !== process.env.SHIPROCKET_WEBHOOK_SECRET) {
        console.warn('Unauthorized Shiprocket Webhook Access: Invalid or missing token');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log('Shiprocket Webhook Payload:', req.body);

    const { order_id, shipment_id, current_status } = req.body;

    if (!order_id && !shipment_id) {
        return res.status(400).json({ success: false, message: 'Missing order_id or shipment_id' });
    }

    try {
        let order;
        if (order_id) {
            order = await orderModel.findOne({ 'shiprocket.orderId': order_id });
        } else {
            order = await orderModel.findOne({ 'shiprocket.shipmentId': shipment_id });
        }

        if (!order) {
            console.log(`Order not found for Shiprocket order_id: ${order_id} or shipment_id: ${shipment_id}`);
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Map Shiprocket status to your application's status
        const statusMapping = {
            'NEW': 'Processing',
            'PICKUP SCHEDULED': 'Processing',
            'IN TRANSIT': 'Shipped',
            'SHIPPED': 'Shipped',
            'DELIVERED': 'Delivered',
            'CANCELLED': 'Cancelled',
            'RTO INITIATED': 'Return to Origin',
            'RTO DELIVERED': 'Return to Origin',
            // Add other mappings as needed
        };

        const newStatus = statusMapping[current_status] || order.orderStatus;

        if (newStatus !== order.orderStatus) {
            order.orderStatus = newStatus;
            await order.save();
            console.log(`Order ${order._id} status updated to ${newStatus}`);
        } else {
            console.log(`Order ${order._id} status is already ${newStatus}. No update needed.`);
        }

        res.status(200).json({ success: true, message: 'Webhook received' });

    } catch (error) {
        console.error('Error handling Shiprocket webhook:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
