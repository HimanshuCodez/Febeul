import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';
import { cancelShiprocketOrder } from '../utils/shiprocket.js';
import { runCancellationRefund } from '../utils/cancellationRefunds.js';
import { sendOrderStatusEmail } from '../utils/orderNotifications.js';

const openStatuses = ['Order Placed', 'Processing', 'Confirmed'];
const unshippedStatuses = ['NEW', 'UNKNOWN'];
const actor = (req, admin) => admin ? req.userName || req.userEmail || 'admin' : 'customer';
const history = (status, note, by) => ({ status, note, by, date: new Date() });

const sendResult = (res, order) => {
    const status = order.refundDetails?.status || 'none';
    const message = status === 'completed' ? 'Order cancelled. The payment provider has processed the refund.'
        : status === 'processing' ? 'Order cancelled. Your refund is processing with the payment provider.'
            : status === 'none' ? 'Order cancelled. No payment was collected, so no refund is due.'
                : 'Order cancelled. Your refund is pending; the payment needs another attempt or review.';
    return res.json({ success: true, message, orderId: order._id, orderStatus: 'Cancelled', refundStatus: status });
};

const cancel = async (req, res, admin) => {
    const { orderId, reason } = req.body;
    if (!mongoose.isValidObjectId(orderId) || (reason !== undefined && (typeof reason !== 'string' || reason.length > 500))) return res.status(400).json({ success: false, message: 'Provide a valid order and a reason of at most 500 characters.' });
    try {
        const order = await orderModel.findOne({ _id: orderId, ...(admin ? {} : { userId: req.userId }) });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        if (order.isCancelled || !openStatuses.includes(order.orderStatus) || order.shippedAt || order.deliveredAt || order.shiprocket?.awb || !unshippedStatuses.includes(order.shiprocketStatus || 'NEW')) return res.status(409).json({ success: false, message: 'Only orders that have not been dispatched can be cancelled.' });
        if (order.refundDetails?.status && order.refundDetails.status !== 'none') return res.status(409).json({ success: false, message: 'This order already has a refund or return request.' });
        if (!admin && order.payment && order.items.some(item => item.name === 'Febeul Luxe Membership' || item.sku === 'LUXE-MEMBERSHIP')) return res.status(400).json({ success: false, message: 'Contact support to cancel a paid membership.' });
        const by = actor(req, admin);
        const note = reason?.trim() || (admin ? 'Cancelled by admin' : 'Customer requested cancellation');
        const now = new Date();
        const paid = Boolean(order.payment);
        const prepaid = paid && ['Razorpay', 'Stripe'].includes(order.paymentMethod);
        // Save the cancellation and refund queue before any external side effect.
        const claimed = await orderModel.findOneAndUpdate({
            _id: order._id, isCancelled: { $ne: true }, payment: order.payment, orderStatus: order.orderStatus,
            shiprocketStatus: order.shiprocketStatus, shippedAt: null, deliveredAt: null,
            'shiprocket.awb': { $in: [null, ''] }, 'refundDetails.status': { $in: [null, 'none'] },
        }, { $set: {
            isCancelled: true, orderStatus: 'Cancelled', shiprocketStatus: 'CANCELLED',
            cancellation: { requestedBy: admin ? 'admin' : 'customer', requestedByName: by, requestedAt: now, reason: note },
            'refundDetails.requestType': 'cancellation', 'refundDetails.status': paid ? 'pending' : 'none',
            'refundDetails.amount': paid ? order.orderTotal : 0, 'refundDetails.reason': note, 'refundDetails.requestedAt': now,
            'refundDetails.autoProcess': prepaid, 'refundDetails.nextRetryAt': prepaid ? now : null,
            'refundDetails.lastError': paid && !prepaid ? 'Collected COD payment requires a manual payout.' : '',
        }, $push: { 'refundDetails.returnTracking.history': history('ORDER_CANCELLED', `${note}. ${paid ? `Refund due: INR ${order.orderTotal.toFixed(2)}.` : 'No payment collected; no refund due.'}`, by) } }, { new: true });
        if (!claimed) return res.status(409).json({ success: false, message: 'Order changed or cancellation is already in progress. Refresh the order.' });

        // Only the winning cancellation restores stock. Increment rather than
        // overwriting another purchase/cancellation affecting the same product.
        try {
            for (const item of (paid || order.paymentMethod === 'COD' ? order.items : [])) {
                if (item.name === 'Febeul Luxe Membership' || item.sku === 'LUXE-MEMBERSHIP') continue;
                await productModel.updateOne({ _id: item.productId }, { $inc: { 'variations.$[variation].sizes.$[size].stock': item.quantity } }, { arrayFilters: [{ 'variation.color': item.color }, { 'size.size': item.size }] });
            }
            await orderModel.updateOne({ _id: orderId }, { $set: { 'cancellation.stockRestoredAt': new Date() } });
        } catch {
            await orderModel.updateOne({ _id: orderId }, { $set: { 'cancellation.stockError': 'Stock restoration needs review; do not repeat the whole cancellation.' }, $push: { 'refundDetails.returnTracking.history': history('STOCK_REVIEW_REQUIRED', 'Cancellation saved; stock restoration needs review.', 'system') } });
        }
        if (order.shiprocket?.srOrderId) {
            try {
                const result = await cancelShiprocketOrder([order.shiprocket.srOrderId]);
                if (!result) throw new Error('Shipment cancellation failed.');
            }
            catch {
                await orderModel.updateOne({ _id: orderId }, { $set: { 'cancellation.shipmentError': 'Cancel the shipment in Shiprocket; automatic cancellation failed.' }, $push: { 'refundDetails.returnTracking.history': history('SHIPMENT_CANCELLATION_FAILED', 'Cancel the shipment manually in Shiprocket.', 'system') } });
            }
        }
        await sendOrderStatusEmail(orderId, 'Cancelled');
        const settled = prepaid ? await runCancellationRefund(orderId, { by }) : claimed;
        return sendResult(res, settled || claimed);
    } catch (error) {
        console.error('Cancellation failed', { name: error.name });
        return res.status(500).json({ success: false, message: 'Unable to finish cancellation. Refresh the order before retrying.' });
    }
};

export const cancelCustomerOrder = (req, res) => cancel(req, res, false);
export const cancelAdminOrder = (req, res) => cancel(req, res, true);

export const retryCancellationRefund = async (req, res) => {
    if (!mongoose.isValidObjectId(req.body.orderId)) return res.status(400).json({ success: false, message: 'Invalid order.' });
    try {
        const order = await orderModel.findById(req.body.orderId);
        if (!order || !(order.isCancelled || order.orderStatus === 'Cancelled' || order.refundDetails?.requestType === 'cancellation')) return res.status(404).json({ success: false, message: 'Cancelled order not found.' });
        if (!order.payment || !['Razorpay', 'Stripe'].includes(order.paymentMethod)) return res.status(400).json({ success: false, message: 'This cancellation has no automatic prepaid refund due.' });
        if (order.refundDetails?.status === 'completed') {
            if (req.body.checkStatus !== true || !order.refundDetails.id) return sendResult(res, order);
            await orderModel.updateOne({ _id: order._id }, { $set: { isCancelled: true, orderStatus: 'Cancelled', 'refundDetails.requestType': 'cancellation' } });
            const checked = await runCancellationRefund(order._id, { force: true, reconcileCompleted: true, by: actor(req, true) });
            if (checked?.refundDetails.lastError && checked.refundDetails.status === 'completed') return res.json({ success: true, message: 'The saved refund status could not be refreshed. See the provider error in refund history.', orderStatus: 'Cancelled', refundStatus: 'completed', orderId: order._id });
            return sendResult(res, checked || order);
        }
        // An explicit admin retry can recover older cancellations outside the queue.
        await orderModel.updateOne({ _id: order._id, 'refundDetails.status': { $ne: 'completed' } }, { $set: {
            isCancelled: true, orderStatus: 'Cancelled', 'refundDetails.requestType': 'cancellation',
            'refundDetails.amount': order.orderTotal, 'refundDetails.requestedAt': order.refundDetails?.requestedAt || order.cancellation?.requestedAt || new Date(),
            'refundDetails.reason': order.refundDetails?.reason || 'Cancelled order refund',
        } });
        const updated = await runCancellationRefund(order._id, { force: true, by: actor(req, true) });
        return sendResult(res, updated || order);
    } catch (error) {
        console.error('Cancellation refund retry failed', { name: error.name });
        return res.status(500).json({ success: false, message: 'Unable to retry the refund. Refresh its history before trying again.' });
    }
};
