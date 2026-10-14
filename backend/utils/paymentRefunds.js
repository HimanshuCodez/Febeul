import axios from 'axios';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';

const requestOptions = method => ({
    auth: method === 'Razorpay'
        ? { username: process.env.RAZORPAY_KEY_ID, password: process.env.RAZORPAY_KEY_SECRET }
        : { username: process.env.STRIPE_SECRET_KEY, password: '' },
    timeout: 10000, maxRedirects: 0,
});

export const refundErrorMessage = error => String(error?.response?.data?.error?.description || error?.response?.data?.error?.message || error?.error?.description || error?.message || 'Payment provider unavailable.').slice(0, 500);

const normalizeRefund = (data, method) => {
    if (!data || typeof data.id !== 'string') throw new Error('Payment provider returned no refund reference. Retry to reconcile the request.');
    const completed = data.status === (method === 'Stripe' ? 'succeeded' : 'processed');
    const pending = ['pending', 'processing', 'requires_action'].includes(data.status);
    return {
        success: completed || pending, refundId: data.id, gatewayStatus: data.status,
        status: completed ? 'completed' : pending ? 'processing' : 'failed',
        message: completed ? 'Refund processed by the payment provider.' : pending ? 'Refund accepted and processing.' : `Payment provider reported refund ${data.status || 'failure'}.`,
    };
};

const lockAmount = async (orderId, paymentMethod, refundAmount, paymentFilter) => {
    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || Math.abs(refundAmount * 100 - Math.round(refundAmount * 100)) > 0.00001) throw new Error('Invalid refund amount.');
    const order = await orderModel.findOneAndUpdate({
        _id: orderId, payment: true, paymentMethod, orderTotal: { $gte: refundAmount },
        $and: [paymentFilter, { $or: [{ refundRequestAmount: { $exists: false } }, { refundRequestAmount: refundAmount }] }],
    }, { $set: { refundRequestAmount: refundAmount } }, { new: true });
    if (!order) throw new Error('Refund does not match a paid order or the original refund amount.');
    return order;
};

const revokeRefundedMembership = async (order, result) => {
    if (result.success && order.items.some(item => item.name === 'Febeul Luxe Membership' || item.sku === 'LUXE-MEMBERSHIP')) {
        await userModel.updateOne({ _id: order.userId }, { $set: { isLuxeMember: false, giftWrapsLeft: 0, luxeMembershipExpires: null } });
    }
};

export const processPrepaidRefund = async (orderId, paymentId, amount) => {
    if (!paymentId) throw new Error('Razorpay payment ID is missing. Check the original payment before retrying.');
    if (amount === 0) return { success: true, status: 'completed', message: 'No refund due.', refundId: null };
    const order = await lockAmount(orderId, 'Razorpay', amount, { $or: [{ razorpayPaymentId: paymentId }, { 'paymentDetails.razorpay_payment_id': paymentId }] });
    if (order.refundDetails?.id) return fetchGatewayRefund(order);
    try {
        // Keep the key AND payload stable across timeouts and older cancellation retries.
        const { data } = await axios.post(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
            amount: Math.round(amount * 100), speed: 'normal',
            notes: { order_id: String(orderId), reason: 'Customer requested refund' },
        }, { ...requestOptions('Razorpay'), headers: { 'X-Refund-Idempotency': `febeul-refund-${orderId}` } });
        const result = normalizeRefund(data, 'Razorpay');
        await revokeRefundedMembership(order, result);
        return result;
    } catch (error) { throw new Error(refundErrorMessage(error)); }
};

export const processStripeRefund = async (orderId, amount) => {
    const order = await lockAmount(orderId, 'Stripe', amount, { 'paymentDetails.stripePaymentIntentId': { $type: 'string', $ne: '' } });
    if (order.refundDetails?.id) return fetchGatewayRefund(order);
    try {
        const body = new URLSearchParams({ payment_intent: order.paymentDetails.stripePaymentIntentId, amount: String(Math.round(amount * 100)), reason: 'requested_by_customer', 'metadata[order_id]': String(orderId) });
        const { data } = await axios.post('https://api.stripe.com/v1/refunds', body.toString(), {
            ...requestOptions('Stripe'), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `febeul-refund-${orderId}` },
        });
        const result = normalizeRefund(data, 'Stripe');
        await revokeRefundedMembership(order, result);
        return result;
    } catch (error) { throw new Error(refundErrorMessage(error)); }
};

export const fetchGatewayRefund = async order => {
    const method = order.paymentMethod;
    if (!['Razorpay', 'Stripe'].includes(method) || !order.payment || !order.refundDetails?.id) throw new Error('No paid gateway refund is available to reconcile.');
    const provider = method === 'Razorpay' ? 'razorpay' : 'stripe';
    const { data } = await axios.get(`https://api.${provider}.com/v1/refunds/${encodeURIComponent(order.refundDetails.id)}`, requestOptions(method));
    const paymentMatches = method === 'Razorpay'
        ? data.payment_id === (order.razorpayPaymentId || order.paymentDetails?.razorpay_payment_id)
        : data.payment_intent === order.paymentDetails?.stripePaymentIntentId;
    if (data.id !== order.refundDetails.id || !paymentMatches || data.amount !== Math.round((order.refundRequestAmount ?? order.refundDetails.amount) * 100)) throw new Error('Gateway refund does not match this order and refund amount.');
    const result = normalizeRefund(data, method);
    await revokeRefundedMembership(order, result);
    return result;
};
