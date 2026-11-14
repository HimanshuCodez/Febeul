import { createHmac, timingSafeEqual } from 'node:crypto';
import orderModel from '../models/orderModel.js';
import { runCodPayout } from '../utils/codPayouts.js';
import { buildAdminReturnView, getReturnSettings } from '../utils/returnStatus.js';

export async function payCodRefund(req, res) {
    try {
        const result = await runCodPayout(req.body.orderId, req.body, req.userName || req.userEmail || 'admin');
        res.status(result.success ? 200 : 422).json({ ...result, view: buildAdminReturnView(result.order, await getReturnSettings()) });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Unable to check or send the COD payout. Refresh before retrying.' });
    }
}

export async function savePayoutNote(req, res) {
    const { orderId, note } = req.body;
    if (!/^[a-f\d]{24}$/i.test(String(orderId)) || typeof note !== 'string' || note.length > 1000) {
        return res.status(400).json({ success: false, message: 'Enter a valid order and a customer note of up to 1000 characters.' });
    }
    try {
        const order = await orderModel.findOneAndUpdate({ _id: orderId, paymentMethod: 'COD', 'refundDetails.requestType': 'return' },
            { $set: { 'refundDetails.payoutNote': note.trim() } }, { new: true });
        if (!order) return res.status(404).json({ success: false, message: 'COD return request not found.' });
        res.json({ success: true, message: 'Customer note saved.' });
    } catch { res.status(500).json({ success: false, message: 'Unable to save the customer note.' }); }
}

// This endpoint has its own raw parser, before the application JSON parser.
export async function razorpayXPayoutWebhook(req, res) {
    const secret = process.env.RAZORPAYX_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ success: false, message: 'Payout webhook is not configured.' });
    const signature = req.headers['x-razorpay-signature'];
    if (!Buffer.isBuffer(req.body) || typeof signature !== 'string' || !/^[a-f\d]{64}$/i.test(signature)) {
        return res.status(401).json({ success: false });
    }
    const expected = createHmac('sha256', secret).update(req.body).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return res.status(401).json({ success: false });
    try {
        const event = JSON.parse(req.body.toString('utf8'));
        const entity = event.payload?.payout?.entity;
        if (!event.event?.startsWith('payout.') || !/^pout_[a-zA-Z0-9]+$/.test(entity?.id || '')) return res.json({ success: true });
        const order = await orderModel.findOne({ paymentMethod: 'COD', 'refundDetails.requestType': 'return', $or: [
            { 'refundDetails.payout.id': entity.id },
            ...(typeof entity.reference_id === 'string' ? [{ 'refundDetails.payout.payload.reference_id': entity.reference_id }] : []),
        ] });
        if (!order) return res.json({ success: true });
        // A create response can be lost before its ID is saved. Replay that
        // original request with its existing key; never trust event order.
        await runCodPayout(String(order._id), {}, 'RazorpayX webhook');
        res.json({ success: true });
    } catch {
        // Ask Razorpay to retry rather than acknowledge an unrecorded result.
        res.status(503).json({ success: false, message: 'Payout reconciliation unavailable. Retry this event.' });
    }
}
