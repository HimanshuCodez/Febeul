import axios from 'axios';
import { randomUUID } from 'node:crypto';
import orderModel from '../models/orderModel.js';
import { getReturnRefundBlockReason } from '../../shared/returnWorkflow.js';
import { appendReturnHistory } from './returnStatus.js';
import { sendRefundCompletedEmail } from './orderNotifications.js';

const API = 'https://api.razorpay.com/v1/payouts';
const terminalFailures = new Set(['failed', 'reversed', 'rejected', 'cancelled']);
const pending = new Set(['queued', 'pending', 'processing', 'scheduled']);
const fail = (message, status = 409) => Object.assign(new Error(message), { status });
const config = () => {
    const { RAZORPAYX_KEY_ID, RAZORPAYX_KEY_SECRET, RAZORPAYX_ACCOUNT_NUMBER } = process.env;
    if (!RAZORPAYX_KEY_ID || !RAZORPAYX_KEY_SECRET || !RAZORPAYX_ACCOUNT_NUMBER) {
        throw fail('RazorpayX payouts are not configured. Set RAZORPAYX_KEY_ID, RAZORPAYX_KEY_SECRET and RAZORPAYX_ACCOUNT_NUMBER on the backend.', 503);
    }
    return { account: RAZORPAYX_ACCOUNT_NUMBER, options: {
        auth: { username: RAZORPAYX_KEY_ID, password: RAZORPAYX_KEY_SECRET }, timeout: 15000, maxRedirects: 0,
    } };
};

export function payoutFailure(reason = '', description = '') {
    const text = `${reason} ${description}`.toLowerCase();
    if (/low_balance|insufficient|not enough.*fund/.test(text)) return {
        code: 'insufficient_balance', admin: 'RazorpayX has insufficient funds. Add funds before retrying the payout.',
        customer: 'Your refund is delayed while we arrange the payment. Your refund remains due; you do not need to submit another return request.',
    };
    if (/vpa|upi|ifsc|bank_account_invalid|account.*(invalid|closed|frozen|dormant)|beneficiary_bank_rejected/.test(text)) return {
        code: 'invalid_destination', admin: 'RazorpayX could not pay the supplied UPI ID or bank details. Verify the customer’s payout details before retrying.',
        customer: 'We could not send your refund to the supplied UPI ID or bank account. Please contact support with your order ID to correct your refund details.',
    };
    return { code: 'provider_error', admin: 'RazorpayX could not complete the payout. Check the provider status before retrying.',
        customer: 'Your refund payment needs attention. Our team is checking it; please contact support with your order ID if you need help.' };
}

function payloadFor(order, amountPaise, sequence, account) {
    const details = order.refundDetails.customerPayoutDetails || {};
    const contact = { name: String(details.accountHolderName || order.userId?.name || order.address?.name || '').trim().slice(0, 50),
        type: 'customer', reference_id: String(order.userId?._id || order.userId),
        ...(order.userId?.email ? { email: order.userId.email } : {}),
    };
    if (contact.name.length < 3) throw fail('A valid customer/account holder name is required for the payout.', 400);
    let fundAccount;
    if (details.type === 'upi') {
        const address = String(details.upiId || '').trim();
        if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(address)) throw fail('Invalid customer UPI ID. Verify the payout details before paying.', 400);
        fundAccount = { account_type: 'vpa', vpa: { address }, contact };
    } else if (details.type === 'bank') {
        const name = String(details.accountHolderName || '').trim();
        const ifsc = String(details.ifsc || '').trim().toUpperCase();
        const number = String(details.bankAccount || '').trim();
        if (name.length < 4 || name.length > 120 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) || !/^[a-zA-Z0-9]{5,35}$/.test(number)) {
            throw fail('Invalid bank account holder, account number or IFSC. Verify the customer’s payout details before paying.', 400);
        }
        fundAccount = { account_type: 'bank_account', bank_account: { name, ifsc, account_number: number }, contact };
    } else throw fail('Customer UPI or bank details are required before paying a COD refund.', 400);
    return { account_number: account, amount: amountPaise, currency: 'INR', mode: details.type === 'upi' ? 'UPI' : 'IMPS',
        purpose: 'refund', fund_account: fundAccount, queue_if_low_balance: false,
        reference_id: `febeul-${order._id}-${sequence}`, narration: 'Febeul refund', notes: { order_id: String(order._id) } };
}

// Persist the identical payload and key before any request that can move money.
// A timeout is an unknown outcome; replaying it never creates a second payout.
export async function runCodPayout(orderId, { amount, retry = false, note } = {}, actor = 'admin') {
    if (!/^[a-f\d]{24}$/i.test(String(orderId))) throw fail('Invalid order ID.', 400);
    let order = await orderModel.findById(orderId).populate('userId', 'name email');
    if (!order) throw fail('Order not found.', 404);
    if (order.paymentMethod !== 'COD' || order.refundDetails?.requestType !== 'return') throw fail('This action is only for COD return refunds.');
    const blocked = getReturnRefundBlockReason(order);
    if (blocked && !order.refundDetails.payout?.key) throw fail(blocked);
    if (order.refundDetails.status === 'completed' && !order.refundDetails.payout?.id) throw fail('This refund was already paid. No additional payout can be sent.');
    if (note !== undefined && (typeof note !== 'string' || note.length > 1000)) throw fail('Customer note must be 1000 characters or fewer.', 400);
    const lock = randomUUID();
    order = await orderModel.findOneAndUpdate({ _id: orderId, $or: [
        { 'refundDetails.payout.lockUntil': null }, { 'refundDetails.payout.lockUntil': { $lt: new Date() } },
    ] }, { $set: { 'refundDetails.payout.lockUntil': new Date(Date.now() + 45000), 'refundDetails.payout.lockToken': lock,
        ...(note !== undefined ? { 'refundDetails.payoutNote': note.trim() } : {}),
    } }, { new: true }).populate('userId', 'name email');
    if (!order) throw fail('A payout check is already running. Wait before trying again.');
    let attempted = false;
    try {
        const { options, account } = config();
        let payout = order.refundDetails.payout;
        const newAttempt = !payout.key || (retry === true && terminalFailures.has(payout.status));
        if (payout.id && !newAttempt) {
            const { data } = await axios.get(`${API}/${encodeURIComponent(payout.id)}`, options);
            return await applyCodPayout(order, data, actor, lock);
        }
        if (terminalFailures.has(payout.status) && !newAttempt) throw fail('Confirm Retry payout to start a new attempt after this failed payout.');
        if (newAttempt) {
            const currentBlock = getReturnRefundBlockReason(order);
            if (currentBlock) throw fail(currentBlock);
            if (order.refundDetails.status === 'completed') throw fail('This refund is already completed.');
            if (amount !== undefined && !['number', 'string'].includes(typeof amount)) throw fail('Enter a valid numeric refund amount.', 400);
            const rupees = amount === undefined || amount === '' ? Number(order.orderTotal) : Number(amount);
            const paise = Math.round(rupees * 100);
            if (!Number.isFinite(rupees) || !Number.isSafeInteger(paise) || paise < 100 || rupees > order.orderTotal || Math.abs(rupees * 100 - paise) > 0.00001) {
                throw fail(`Refund must be between ₹1 and ₹${order.orderTotal}, with at most two decimal places.`, 400);
            }
            const sequence = (payout.sequence || 0) + 1;
            const payload = payloadFor(order, paise, sequence, account);
            payout = { key: randomUUID(), payload, amountPaise: paise, sequence, status: 'creating', updatedAt: new Date(),
                lockUntil: payout.lockUntil, lockToken: lock };
            const initialized = await orderModel.updateOne({ _id: orderId, 'refundDetails.payout.lockToken': lock }, { $set: {
                'refundDetails.payout': payout, 'refundDetails.amount': rupees,
                'refundDetails.isPartialRefund': paise < Math.round(order.orderTotal * 100),
                'refundDetails.returnTracking.refundDecidedBy': actor,
            } });
            if (!initialized.matchedCount) throw fail('The payout lock changed. Refresh before trying again.');
            order.refundDetails.payout = payout;
        } else if (amount !== undefined && Math.round(Number(amount) * 100) !== payout.amountPaise) {
            throw fail('The original payout amount is locked while its outcome is unknown. Check its status first.');
        }
        attempted = true;
        const { data } = await axios.post(API, payout.payload, { ...options, headers: { 'X-Payout-Idempotency': payout.key } });
        return await applyCodPayout(order, data, actor, lock);
    } catch (error) {
        // Input conflicts must not turn an in-flight payout into a failed one.
        if (error.status === 409 && !error.response) throw error;
        const providerError = error.response?.data?.error || {};
        const description = String(providerError.description || error.message || 'Payout provider unavailable.').slice(0, 500);
        const diagnosis = payoutFailure(providerError.reason || providerError.code, description);
        const localStatus = error.response ? undefined : error.status;
        const definiteFailure = localStatus === 400 || localStatus === 503 || (attempted && [400, 401, 403, 422].includes(error.response?.status) && !/idempotenc/i.test(description));
        const existing = order.refundDetails.payout;
        if (existing.id) {
            await orderModel.updateOne({ _id: orderId, 'refundDetails.payout.lockToken': lock }, { $set: {
                'refundDetails.payout.adminError': description, 'refundDetails.payout.lastCheckedAt': new Date(),
            } });
            throw fail(`Unable to check the existing payout. Its payment state is unchanged. ${description}`, 502);
        }
        const state = existing.id ? existing.status : definiteFailure ? 'failed' : 'unknown';
        const message = localStatus === 503 ? 'Your refund is delayed while we arrange the payment. Our team is checking it.' : diagnosis.customer;
        await orderModel.updateOne({ _id: orderId, 'refundDetails.payout.lockToken': lock }, { $set: {
            'refundDetails.payout.status': state, 'refundDetails.payout.adminError': localStatus ? description : `${diagnosis.admin} ${description}`,
            'refundDetails.payout.failureCode': diagnosis.code, 'refundDetails.payout.customerMessage': message,
            'refundDetails.payout.updatedAt': new Date(),
            ...(!existing.id && definiteFailure ? { 'refundDetails.status': 'failed' } : {}),
        } });
        throw fail(localStatus === 400 || localStatus === 503 ? description : `${diagnosis.admin} ${description}`, localStatus || 502);
    } finally {
        await orderModel.updateOne({ _id: orderId, 'refundDetails.payout.lockToken': lock }, {
            $unset: { 'refundDetails.payout.lockUntil': '', 'refundDetails.payout.lockToken': '' },
        });
    }
}

async function applyCodPayout(order, data, actor, lock) {
    const payout = order.refundDetails.payout;
    if (!/^pout_[a-zA-Z0-9]+$/.test(data?.id || '') || (payout.id && data.id !== payout.id)
        || data.amount !== payout.amountPaise || data.currency !== 'INR'
        || data.reference_id !== payout.payload?.reference_id || data.mode !== payout.payload?.mode
        || (!pending.has(data.status) && !terminalFailures.has(data.status) && data.status !== 'processed')) {
        throw new Error('RazorpayX response does not match this payout. Check its status before retrying.');
    }
    const completed = data.status === 'processed';
    const failed = terminalFailures.has(data.status);
    const detail = data.status_details || data.error || {};
    const diagnosis = payoutFailure(detail.reason, detail.description);
    const message = completed ? 'Your refund has been paid to your selected bank account or UPI ID.'
        : failed || detail.reason === 'low_balance' ? diagnosis.customer : 'Your refund payment is processing. We will update this page when it is confirmed.';
    const previous = payout.status;
    const update = {
        'refundDetails.payout.id': data.id, 'refundDetails.payout.status': data.status,
        'refundDetails.payout.updatedAt': new Date(), 'refundDetails.payout.lastCheckedAt': new Date(),
        'refundDetails.payout.customerMessage': message,
        'refundDetails.payout.adminError': failed || detail.reason === 'low_balance' ? String(detail.description || diagnosis.admin).slice(0, 500) : '',
        'refundDetails.payout.failureCode': failed || detail.reason === 'low_balance' ? diagnosis.code : '',
        'refundDetails.id': data.id, 'refundDetails.gatewayStatus': data.status,
        'refundDetails.amount': payout.amountPaise / 100,
        'refundDetails.status': completed ? 'completed' : failed ? 'failed' : 'processing',
        'orderStatus': completed ? 'Refunded' : failed ? 'Delivered' : 'Refund Initiated',
    };
    if (data.utr) update['refundDetails.returnTracking.refundUtr'] = String(data.utr);
    if (!order.refundDetails.returnTracking.refundInitiatedAt) update['refundDetails.returnTracking.refundInitiatedAt'] = new Date();
    if (completed) {
        update['refundDetails.processedAt'] = order.refundDetails.processedAt || new Date();
        update['refundDetails.returnTracking.refundPaidAt'] = order.refundDetails.returnTracking.refundPaidAt || new Date();
        update.isRefundable = false;
    }
    const historyOrder = { refundDetails: { returnTracking: { history: [] } } };
    if (previous !== data.status) appendReturnHistory(historyOrder, { status: completed ? 'REFUND_COMPLETED' : `PAYOUT_${data.status.toUpperCase()}`,
        note: `RazorpayX payout ${data.id}: ${data.status} (₹${payout.amountPaise / 100}).`, by: actor });
    const changed = await orderModel.findOneAndUpdate({ _id: order._id, 'refundDetails.payout.key': payout.key,
        ...(lock ? { 'refundDetails.payout.lockToken': lock } : {}),
    }, { $set: update,
        ...(failed ? { $unset: { 'refundDetails.processedAt': '', 'refundDetails.returnTracking.refundPaidAt': '' } } : {}),
        ...(historyOrder.refundDetails.returnTracking.history.length ? { $push: { 'refundDetails.returnTracking.history': { $each: historyOrder.refundDetails.returnTracking.history } } } : {}),
    }, { new: true });
    if (!changed) throw fail('Payout changed while checking. Refresh to see the latest status.');
    if (completed) await sendRefundCompletedEmail(order._id);
    return { order: changed, success: !failed, message: completed ? 'COD refund paid through RazorpayX.' : failed ? diagnosis.admin : 'Payout accepted. Payment is still processing.' };
}

// GET only: safe for customer refreshes and webhook reconciliation. The provider
// is re-read so delayed webhook payloads cannot regress a later payout state.
export async function syncCodPayout(order, { force = false } = {}) {
    if (order.paymentMethod !== 'COD' || !order.refundDetails?.payout?.id) return order;
    const payout = order.refundDetails.payout;
    if (!force && Date.now() - new Date(payout.lastCheckedAt || 0).getTime() < 30000) return order;
    try {
        const result = await runCodPayout(String(order._id), {}, 'RazorpayX status sync');
        return result.order;
    } catch { return orderModel.findById(order._id); }
}
