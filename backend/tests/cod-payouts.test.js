import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import { userToken } from '../utils/authTokens.js';
import { sanitizeOrderForCustomer } from '../utils/returnStatus.js';

Object.assign(process.env, { JWT_SECRET: 'cod-payout-tests-only-secret', RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_KEY_SECRET: 'local',
    STRIPE_SECRET_KEY: 'sk_test_local', RESEND_API_KEY: 're_local', NODE_ENV: 'test' });
const { default: returnRouter } = await import('../routes/returnRoute.js');
const { default: refundRouter } = await import('../routes/refundRoute.js');
const { razorpayXPayoutWebhook } = await import('../controllers/codPayoutController.js');
let server, database, base, admin, buyer, calls, current, emails;
const request = async (path, body, token = userToken(admin, 'admin')) => {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', token }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
};
const pay = (order, body = {}, token) => request('/api/return/cod-payout', { orderId: String(order._id), ...body }, token);
const saved = order => orderModel.findById(order._id);
const order = (extra = {}) => orderModel.create({ userId: buyer._id, paymentMethod: 'COD', payment: false, orderStatus: 'Delivered',
    orderTotal: 500, productAmount: 500, date: Date.now(), address: { name: 'Test Buyer', phone: '9999999999' },
    items: [{ productId: new mongoose.Types.ObjectId(), image: 'test.png', name: 'Test garment', quantity: 1, price: 500 }],
    refundDetails: { requestType: 'return', status: 'pending', customerPayoutDetails: { type: 'bank', accountHolderName: 'Test Buyer', bankAccount: '12345678901', ifsc: 'HDFC0001234' },
        returnTracking: { receivedDate: new Date(), qcResult: 'PASS', qcDate: new Date() } }, ...extra });
const provider = (status = 'processed', delay = 0) => {
    nock('https://api.razorpay.com').post('/v1/payouts').delay(delay).reply(function (_uri, body) {
        calls.push({ body, key: this.req.headers['x-payout-idempotency'] });
        current = { id: 'pout_local', amount: body.amount, mode: body.mode, currency: 'INR', reference_id: body.reference_id, status, utr: status === 'processed' ? 'TEST-UTR' : null };
        return [200, current];
    });
};
const fetchProvider = () => nock('https://api.razorpay.com').get('/v1/payouts/pout_local').reply(() => [200, current]);
const webhook = async (entity, valid = true) => {
    const body = JSON.stringify({ event: 'payout.updated', payload: { payout: { entity } } });
    const signature = createHmac('sha256', valid ? process.env.RAZORPAYX_WEBHOOK_SECRET : 'wrong').update(body).digest('hex');
    const response = await fetch(base + '/api/razorpayx/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature }, body });
    return response.status;
};

before(async () => {
    nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
    database = await MongoMemoryServer.create(); await mongoose.connect(database.getUri(), { dbName: 'cod-payout-tests' });
    const app = express(); app.post('/api/razorpayx/webhook', express.raw({ type: 'application/json' }), razorpayXPayoutWebhook);
    app.use(express.json()); app.use('/api/return', returnRouter); app.use('/api/refund', refundRouter);
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
    nock.cleanAll(); calls = []; emails = [];
    Object.assign(process.env, { RAZORPAYX_KEY_ID: 'rzp_test_x', RAZORPAYX_KEY_SECRET: 'local-x-secret', RAZORPAYX_ACCOUNT_NUMBER: 'local-funding-account', RAZORPAYX_WEBHOOK_SECRET: 'local-webhook-secret' });
    nock('https://api.resend.com').persist().post('/emails').reply((_uri, body) => { emails.push(body); return [200, { id: 'test-email' }]; });
    await Promise.all([orderModel.deleteMany({}), userModel.deleteMany({})]);
    [admin, buyer] = await userModel.create([{ name: 'Admin', email: 'admin@payout.test', role: 'admin' }, { name: 'Test Buyer', email: 'buyer@payout.test' }]);
});
after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect(); await database?.stop(); nock.cleanAll(); nock.enableNetConnect();
});

test('bank full and UPI partial payouts use real provider confirmations, paise and customer notes', async () => {
    for (const type of ['bank', 'upi']) {
        const item = await order();
        if (type === 'upi') { item.refundDetails.customerPayoutDetails = { type: 'upi', upiId: 'buyer@upi' }; await item.save(); }
        provider();
        const result = await pay(item, { ...(type === 'upi' ? { amount: 125.25 } : {}), note: 'Agreed refund after inspection.' });
        assert.equal(result.status, 200, result.data.message);
        const record = await saved(item);
        assert.equal(record.refundDetails.status, 'completed'); assert.equal(record.orderStatus, 'Refunded');
        assert.equal(record.refundDetails.amount, type === 'upi' ? 125.25 : 500);
        assert.equal(record.refundDetails.isPartialRefund, type === 'upi');
        assert.equal(record.refundDetails.returnTracking.refundUtr, 'TEST-UTR');
        assert.equal(record.refundDetails.payoutNote, 'Agreed refund after inspection.');
        assert.match(calls.at(-1).key, /^[a-f\d-]{36}$/);
        assert.equal(calls.at(-1).body.amount, type === 'upi' ? 12525 : 50000);
        assert.equal(calls.at(-1).body.queue_if_low_balance, false);
        assert.equal(calls.at(-1).body.mode, type === 'upi' ? 'UPI' : 'IMPS');
        assert.equal(calls.at(-1).body.account_number, 'local-funding-account');
    }
    assert.equal(emails.length, 2);
});

test('receipt, QC, amount limits, completed historical refunds and permissions prevent any payout', async () => {
    const item = await order();
    await orderModel.updateOne({ _id: item._id }, { $unset: { 'refundDetails.returnTracking.receivedDate': '' } });
    assert.equal((await pay(item)).status, 409);
    await orderModel.updateOne({ _id: item._id }, { $set: { 'refundDetails.returnTracking.receivedDate': new Date(), 'refundDetails.returnTracking.qcResult': 'FAIL' } });
    assert.equal((await pay(item)).status, 409);
    await orderModel.updateOne({ _id: item._id }, { $set: { 'refundDetails.returnTracking.qcResult': 'PASS' } });
    for (const amount of [0, -1, 501, 0.99, 1.001]) assert.equal((await pay(item, { amount })).status, 400);
    assert.equal((await pay(item, {}, userToken(buyer))).status, 401);
    const staff = await userModel.create({ name: 'Support', email: 'support@payout.test', role: 'staff', permissions: ['/tickets'] });
    assert.equal((await pay(item, {}, userToken(staff, 'admin'))).status, 403);
    await orderModel.updateOne({ _id: item._id }, { $set: { 'refundDetails.status': 'completed' } });
    assert.equal((await pay(item)).status, 409);
    assert.equal(calls.length, 0); assert.equal(emails.length, 0);
});

test('processing payout reconciles through GET, never asks for a manual UTR and cannot be manually overridden', async () => {
    const item = await order(); provider('processing');
    assert.equal((await pay(item, { amount: 100 })).status, 200);
    let record = await saved(item);
    assert.equal(record.refundDetails.status, 'processing'); assert.equal(record.refundDetails.returnTracking.refundPaidAt, undefined);
    assert.equal(emails.length, 0);
    assert.equal((await request('/api/return/refund-settlement', { orderId: String(item._id), utr: 'FAKE' })).status, 409);
    assert.equal((await request('/api/refund/reject', { orderId: String(item._id), rejectionReason: 'Stale admin action' })).status, 409);
    assert.equal((await request('/api/refund/request', { orderId: String(item._id), requestType: 'refund', reason: 'Replace old request' }, userToken(buyer))).status, 409);
    current.status = 'processed'; current.utr = 'AUTOMATIC-UTR'; fetchProvider();
    assert.equal((await pay(item)).status, 200);
    record = await saved(item); const paidAt = record.refundDetails.returnTracking.refundPaidAt;
    assert.equal(record.refundDetails.status, 'completed'); assert.equal(record.refundDetails.returnTracking.refundUtr, 'AUTOMATIC-UTR');
    fetchProvider(); await pay(item);
    assert.equal((await saved(item)).refundDetails.returnTracking.refundPaidAt.getTime(), paidAt.getTime());
    assert.equal(calls.length, 1); assert.equal(emails.length, 1);
});

test('insufficient funds and invalid payout details remain unpaid with safe customer messages', async () => {
    for (const reason of ['low_balance', 'beneficiary_vpa_invalid', 'invalid_ifsc_code']) {
        const item = await order();
        nock('https://api.razorpay.com').post('/v1/payouts').reply(400, { error: { reason, description: `Provider failure: ${reason}` } });
        const result = await pay(item, { note: 'Please contact us if your bank details have changed.' });
        assert.equal(result.status, 502);
        const record = await saved(item);
        assert.equal(record.refundDetails.status, 'failed'); assert.equal(record.refundDetails.returnTracking.refundPaidAt, undefined);
        const safe = sanitizeOrderForCustomer(record);
        assert.equal(safe.refundDetails.payoutNote, 'Please contact us if your bank details have changed.');
        assert.match(safe.refundDetails.payout.message, reason === 'low_balance' ? /refund is delayed/ : /UPI ID or bank account/);
        for (const key of ['payload', 'key', 'lockToken', 'adminError', 'failureCode']) assert.equal(safe.refundDetails.payout[key], undefined);
    }
    assert.equal(emails.length, 0);
});

test('invalid local bank/UPI input and missing configuration fail without sending money', async () => {
    const item = await order(); item.refundDetails.customerPayoutDetails = { type: 'upi', upiId: 'invalid-upi' }; await item.save();
    assert.equal((await pay(item)).status, 400);
    assert.match((await saved(item)).refundDetails.payout.customerMessage, /UPI ID or bank account/);
    delete process.env.RAZORPAYX_ACCOUNT_NUMBER;
    const result = await pay(item);
    assert.equal(result.status, 503); assert.match(result.data.message, /not configured/);
    assert.equal((await saved(item)).refundDetails.status, 'failed');
    assert.equal(calls.length, 0);
});

test('network uncertainty freezes amount and replays the identical request and idempotency key', async () => {
    const item = await order();
    let first;
    nock('https://api.razorpay.com').post('/v1/payouts').reply(function (_uri, body) {
        first = { body, key: this.req.headers['x-payout-idempotency'] }; return [503, { error: { description: 'Temporary provider interruption' } }];
    });
    assert.equal((await pay(item, { amount: 140 })).status, 502);
    assert.equal((await saved(item)).refundDetails.payout.status, 'unknown');
    assert.equal((await pay(item, { amount: 150 })).status, 409);
    provider('processing'); assert.equal((await pay(item)).status, 200);
    assert.deepEqual(calls[0], first);
    assert.equal((await saved(item)).refundDetails.amount, 140);
});

test('concurrent payout clicks create one payment and definitive failure retries use a new key', async () => {
    const item = await order(); provider('processing', 100);
    const outcomes = await Promise.all([pay(item), pay(item)]);
    assert.deepEqual(outcomes.map(result => result.status).sort(), [200, 409]); assert.equal(calls.length, 1);
    const firstKey = calls[0].key;
    current.status = 'reversed'; current.status_details = { reason: 'bank_account_invalid' }; fetchProvider();
    assert.equal((await pay(item)).data.success, false);
    provider('processed'); assert.equal((await pay(item, { retry: true, amount: 300 })).status, 200);
    assert.notEqual(calls[1].key, firstKey); assert.equal(calls[1].body.amount, 30000);
    assert.equal((await saved(item)).refundDetails.amount, 300);
});

test('signed webhooks reconcile authoritative status, handle reversal, preserve evidence and reject spoofing', async () => {
    const item = await order(); provider('processing'); await pay(item);
    assert.equal(await webhook(current, false), 401);
    current.status = 'processed'; current.utr = 'WEBHOOK-UTR'; fetchProvider();
    assert.equal(await webhook({ ...current, status: 'processing' }), 200);
    let record = await saved(item);
    assert.equal(record.refundDetails.status, 'completed'); assert.equal(emails.length, 1);
    current.status = 'reversed'; current.status_details = { reason: 'bank_account_invalid' }; fetchProvider();
    assert.equal(await webhook(current), 200);
    record = await saved(item);
    assert.equal(record.refundDetails.status, 'failed'); assert.equal(record.refundDetails.returnTracking.refundPaidAt, undefined);
    assert.ok(record.refundDetails.returnTracking.history.some(entry => entry.status === 'REFUND_COMPLETED'));
    assert.ok(record.refundDetails.returnTracking.history.some(entry => entry.status === 'PAYOUT_REVERSED'));
    assert.equal(calls.length, 1);
});

test('customer note is independent of payout and can be saved even on historical paid returns', async () => {
    const item = await order();
    await orderModel.updateOne({ _id: item._id }, { $set: { 'refundDetails.status': 'completed' } });
    assert.equal((await request('/api/return/payout-note', { orderId: String(item._id), note: 'Partial refund agreed with you.' })).status, 200);
    assert.equal(sanitizeOrderForCustomer(await saved(item)).refundDetails.payoutNote, 'Partial refund agreed with you.');
    assert.equal((await request('/api/return/payout-note', { orderId: String(item._id), note: 'x'.repeat(1001) })).status, 400);
    assert.equal(calls.length, 0);
});

test('a signed webhook recovers a lost create response using its original frozen request', async () => {
    const item = await order();
    let original;
    nock('https://api.razorpay.com').post('/v1/payouts').reply(function (_uri, body) {
        original = { body, key: this.req.headers['x-payout-idempotency'] };
        return [503, { error: { description: 'The response was interrupted' } }];
    });
    await pay(item, { amount: 150 });
    assert.equal((await saved(item)).refundDetails.payout.id, undefined);
    provider('processed');
    assert.equal(await webhook({ id: 'pout_local', reference_id: original.body.reference_id }), 200);
    assert.deepEqual(calls[0], original);
    assert.equal((await saved(item)).refundDetails.status, 'completed');
    assert.equal(emails.length, 1);
});

test('an unavailable status check cannot erase a confirmed payment or expose raw provider errors to the customer', async () => {
    const item = await order(); provider('processed'); await pay(item);
    const before = await saved(item);
    nock('https://api.razorpay.com').get('/v1/payouts/pout_local').reply(503, { error: { description: 'Private provider diagnostic' } });
    assert.equal((await pay(item)).status, 502);
    const record = await saved(item), safe = sanitizeOrderForCustomer(record);
    assert.equal(record.refundDetails.status, 'completed');
    assert.equal(record.refundDetails.returnTracking.refundPaidAt.getTime(), before.refundDetails.returnTracking.refundPaidAt.getTime());
    assert.match(safe.refundDetails.payout.message, /has been paid/);
    assert.ok(!JSON.stringify(safe).includes('Private provider diagnostic'));
    assert.equal(calls.length, 1);
});
