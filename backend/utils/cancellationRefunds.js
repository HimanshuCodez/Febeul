import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import { processPrepaidRefund, processStripeRefund, fetchGatewayRefund, refundErrorMessage } from './paymentRefunds.js';

const MINUTE = 60 * 1000;
const history = (status, note, by) => ({ status, note, by, date: new Date() });

// The order is the durable queue. A lease coordinates requests, restarts and instances.
export async function runCancellationRefund(orderId, { force = false, reconcileCompleted = false, by = 'system' } = {}) {
    const now = new Date();
    const attemptToken = randomUUID();
    const order = await orderModel.findOneAndUpdate({
        _id: orderId, isCancelled: true, payment: true, paymentMethod: { $in: ['Razorpay', 'Stripe'] },
        'refundDetails.requestType': 'cancellation',
        ...(reconcileCompleted ? { 'refundDetails.status': 'completed', 'refundDetails.id': { $type: 'string', $ne: '' } } : { 'refundDetails.status': { $nin: ['completed', 'rejected'] } }),
        $and: [
            { $or: [{ 'refundDetails.processingUntil': null }, { 'refundDetails.processingUntil': { $lt: now } }] },
            ...(force ? [] : [{ 'refundDetails.autoProcess': true }, { $or: [{ 'refundDetails.nextRetryAt': null }, { 'refundDetails.nextRetryAt': { $lte: now } }] }]),
        ],
    }, { $set: { 'refundDetails.processingUntil': new Date(now.getTime() + MINUTE), 'refundDetails.attemptToken': attemptToken, 'refundDetails.lastAttemptAt': now }, $inc: { 'refundDetails.attempts': 1 } }, { new: true });
    if (!order) return orderModel.findById(orderId);

    let result;
    let errorMessage;
    try {
        result = order.refundDetails.id ? await fetchGatewayRefund(order)
            : order.paymentMethod === 'Razorpay'
                ? await processPrepaidRefund(order._id, order.razorpayPaymentId || order.paymentDetails?.razorpay_payment_id, order.orderTotal)
                : await processStripeRefund(order._id, order.orderTotal);
        if (!result.success) errorMessage = result.message;
    } catch (error) { errorMessage = refundErrorMessage(error); }

    // An unavailable provider cannot disprove a recorded completion. This
    // explicit check is read-only at the gateway and must never create a refund.
    if (reconcileCompleted && !result) return orderModel.findOneAndUpdate({ _id: orderId, 'refundDetails.attemptToken': attemptToken }, {
        $set: { 'refundDetails.processingUntil': null, 'refundDetails.lastError': errorMessage },
        $unset: { 'refundDetails.attemptToken': '' },
        $push: { 'refundDetails.returnTracking.history': history('REFUND_CHECK_FAILED', errorMessage, by) },
    }, { new: true });

    const status = result?.status || 'pending';
    const completed = status === 'completed';
    const keepRetrying = status === 'processing' || (!result && order.refundDetails.attempts < 5);
    const set = {
        orderStatus: 'Cancelled', 'refundDetails.status': status, 'refundDetails.lastError': errorMessage || '',
        'refundDetails.autoProcess': keepRetrying,
        'refundDetails.nextRetryAt': keepRetrying ? new Date(Date.now() + MINUTE * Math.min(2 ** (order.refundDetails.attempts - 1), 15)) : null,
        'refundDetails.processingUntil': null,
    };
    if (result?.refundId) set['refundDetails.id'] = result.refundId;
    if (result?.gatewayStatus) set['refundDetails.gatewayStatus'] = result.gatewayStatus;
    if (result?.success) set['refundDetails.returnTracking.refundInitiatedAt'] = order.refundDetails.returnTracking?.refundInitiatedAt || now;
    if (completed) {
        set['refundDetails.processedAt'] = order.refundDetails.processedAt || now;
        set['refundDetails.returnTracking.refundPaidAt'] = order.refundDetails.returnTracking?.refundPaidAt || now;
        set.isRefundable = false;
    } else if (reconcileCompleted) {
        set['refundDetails.processedAt'] = null;
        set['refundDetails.returnTracking.refundPaidAt'] = null;
    }
    const event = completed ? 'REFUND_COMPLETED' : result?.success ? 'REFUND_PROCESSING' : 'REFUND_ATTEMPT_FAILED';
    const note = errorMessage || `${order.paymentMethod} refund of INR ${order.orderTotal.toFixed(2)} ${completed ? 'processed' : 'accepted'} (reference ${result.refundId}).`;
    const update = { $set: set, $unset: { 'refundDetails.attemptToken': '' } };
    if (status !== order.refundDetails.status || errorMessage || !order.refundDetails.id) update.$push = { 'refundDetails.returnTracking.history': history(event, note, by) };
    return orderModel.findOneAndUpdate({ _id: orderId, 'refundDetails.attemptToken': attemptToken }, update, { new: true });
}

export async function processDueCancellationRefunds() {
    const now = new Date();
    const due = await orderModel.find({
        isCancelled: true, payment: true, 'refundDetails.requestType': 'cancellation',
        'refundDetails.autoProcess': true, 'refundDetails.status': { $in: ['pending', 'processing', 'initiated'] },
        $and: [
            { $or: [{ 'refundDetails.nextRetryAt': null }, { 'refundDetails.nextRetryAt': { $lte: now } }] },
            { $or: [{ 'refundDetails.processingUntil': null }, { 'refundDetails.processingUntil': { $lt: now } }] },
        ],
    }).sort({ 'refundDetails.nextRetryAt': 1 }).limit(10).select('_id');
    for (const order of due) await runCancellationRefund(order._id);
}

export function startCancellationRefundWorker() {
    let running = false;
    const tick = async () => {
        if (running || mongoose.connection.readyState !== 1) return;
        running = true;
        try { await processDueCancellationRefunds(); }
        catch (error) { console.error('Cancellation refund queue failed', { name: error.name }); }
        finally { running = false; }
    };
    const interval = setInterval(tick, 30 * 1000);
    interval.unref();
    void tick();
    return () => clearInterval(interval);
}
