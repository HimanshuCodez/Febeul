import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';
import userModel from '../models/userModel.js';
import { userToken, signToken } from '../utils/authTokens.js';
import { processDueCancellationRefunds, runCancellationRefund } from '../utils/cancellationRefunds.js';

// Disposable data and intercepted providers only; never load deployment secrets.
Object.assign(process.env, { JWT_SECRET: 'cancellation-tests-only-secret-32-bytes', RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_KEY_SECRET: 'local-secret', STRIPE_SECRET_KEY: 'sk_test_local', RESEND_API_KEY: 're_local', SHIPROCKET_WEBHOOK_SECRET: 'local-hook', ANALYTICS_ENABLED: 'false', NODE_ENV: 'test' });
const { default: orderRouter } = await import('../routes/orderRoute.js');
const { default: refundRouter } = await import('../routes/refundRoute.js');
let database, server, base, customer, other, admin, staff, product;
const request = async (path, body, token, headers = {}) => {
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', token: token || '', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() };
};
const adminToken = user => signToken({ id: String(user._id), version: 0 }, 'admin', '1h');
const makeOrder = extra => orderModel.create({ userId: customer._id, items: [{ productId: product._id, name: product.name, price: 100, quantity: 2, color: 'Rose', size: 'M', image: 'test.png' }], orderTotal: 250, productAmount: 200, shippingCharge: 50, address: { name: 'Buyer', state: 'Delhi', city: 'Delhi', zip: '110001' }, date: Date.now(), orderStatus: 'Confirmed', paymentMethod: 'Razorpay', payment: true, razorpayPaymentId: 'pay_local', paymentDetails: { razorpay_payment_id: 'pay_local' }, ...extra });
const cancel = (order, by = customer, body = {}) => request(by === customer ? '/api/order/cancel' : '/api/order/admin-cancel', { orderId: String(order._id), reason: 'Changed plans', ...body }, by === customer ? userToken(by) : adminToken(by));
const refundResponse = (status = 'processed') => ({ id: 'rfnd_local', payment_id: 'pay_local', amount: 25000, currency: 'INR', status });
const gateway = order => nock('https://api.razorpay.com', { reqheaders: { 'x-refund-idempotency': `febeul-refund-${order._id}` } }).post('/v1/payments/pay_local/refund', body => body.amount === 25000 && body.notes.order_id === String(order._id));
const retry = order => request('/api/refund/cancellation/retry', { orderId: String(order._id) }, adminToken(admin));
const stock = async () => (await productModel.findById(product._id)).variations[0].sizes[0].stock;

before(async () => {
    nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
    database = await MongoMemoryServer.create();
    await mongoose.connect(database.getUri());
    const app = express(); app.use(express.json());
    app.use('/api/order', orderRouter); app.use('/api/refund', refundRouter);
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
    [customer, other, admin, staff] = await userModel.create([{ name: 'Buyer', email: 'buyer@cancellation.test' }, { name: 'Other', email: 'other@cancellation.test' }, { name: 'Admin', email: 'admin@cancellation.test', role: 'admin' }, { name: 'Staff', email: 'staff@cancellation.test', role: 'staff', permissions: ['/list'] }]);
    product = await productModel.create({ name: 'Test garment', description: 'Local test', category: 'Test', date: Date.now(), variations: [{ color: 'Rose', sku: 'ROSE', images: ['test.png'], sizes: [{ size: 'M', price: 100, stock: 7 }] }] });
});
afterEach(() => { assert.equal(nock.isDone(), true, nock.pendingMocks().join(', ')); nock.cleanAll(); });
after(async () => { await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await database.stop(); nock.enableNetConnect(); });

test('customer cancellation persists before a full Razorpay refund and remains cancelled on both APIs', async () => {
    const order = await makeOrder();
    gateway(order).reply(async () => {
        const saved = await orderModel.findById(order._id);
        assert.equal(saved.orderStatus, 'Cancelled');
        assert.equal(saved.refundDetails.requestType, 'cancellation');
        assert.equal(saved.refundDetails.amount, 250);
        assert.equal(saved.refundDetails.returnTracking.history[0].status, 'ORDER_CANCELLED');
        return [200, refundResponse()];
    });
    const result = await cancel(order, customer, { refundAmount: 1, paymentId: 'pay_attacker' });
    assert.equal(result.data.success, true);
    assert.equal(result.data.refundStatus, 'completed');
    assert.equal(await stock(), 9);
    const own = (await request(`/api/order/${order._id}`, undefined, userToken(customer))).data.order;
    assert.equal(own.orderStatus, 'Cancelled');
    assert.equal(own.refundDetails.id, 'rfnd_local');
    assert.equal(own.refundDetails.lastError, undefined);
    assert.equal(own.refundDetails.returnTracking, undefined);
    assert.equal(own.cancellation.requestedByName, undefined);
    const list = await request('/api/order/list', {}, adminToken(admin));
    assert.equal(list.data.orders[0].refundDetails.returnTracking.history.length, 2);
    assert.equal((await cancel(order)).status, 409);
    assert.equal(await stock(), 9);
});

test('admin COD cancellation records zero refund and an actor without contacting a payment provider', async () => {
    const order = await makeOrder({ paymentMethod: 'COD', payment: false });
    assert.equal((await cancel(order, admin)).data.refundStatus, 'none');
    const saved = await orderModel.findById(order._id);
    assert.equal(saved.isCancelled, true);
    assert.equal(saved.refundDetails.amount, 0);
    assert.equal(saved.cancellation.requestedBy, 'admin');
    assert.equal(saved.cancellation.requestedByName, 'Admin');
    assert.equal(saved.refundDetails.returnTracking.history[0].by, 'Admin');
    assert.equal(await stock(), 9);
    assert.equal((await retry(order)).status, 400);
});

test('admin Stripe cancellation uses the stored payment intent and full amount', async () => {
    const order = await makeOrder({ paymentMethod: 'Stripe', paymentDetails: { stripePaymentIntentId: 'pi_local' } });
    nock('https://api.stripe.com', { reqheaders: { 'idempotency-key': `febeul-refund-${order._id}` } }).post('/v1/refunds', body => body.payment_intent === 'pi_local' && body.amount === '25000').reply(200, { id: 're_local', status: 'succeeded' });
    assert.equal((await cancel(order, admin)).data.refundStatus, 'completed');
    assert.equal((await orderModel.findById(order._id)).orderStatus, 'Cancelled');
    assert.equal(await stock(), 9);
});

test('pending gateway refunds stay processing until the durable worker observes completion', async () => {
    const order = await makeOrder();
    gateway(order).reply(200, refundResponse('pending'));
    assert.equal((await cancel(order)).data.refundStatus, 'processing');
    const saved = await orderModel.findById(order._id);
    assert.equal(saved.refundDetails.processedAt, undefined);
    assert.equal(saved.refundDetails.autoProcess, true);
    await orderModel.updateOne({ _id: order._id }, { $set: { 'refundDetails.nextRetryAt': new Date(0) } });
    nock('https://api.razorpay.com').get('/v1/refunds/rfnd_local').reply(200, refundResponse());
    await processDueCancellationRefunds();
    const completed = await orderModel.findById(order._id);
    assert.equal(completed.refundDetails.status, 'completed');
    assert.ok(completed.refundDetails.processedAt);
    assert.equal(completed.refundDetails.autoProcess, false);
    assert.equal(completed.orderStatus, 'Cancelled');
    assert.equal((await retry(order)).data.refundStatus, 'completed');
});

test('gateway rejection preserves history, records the actual provider reason, and retries with the same key', async () => {
    const order = await makeOrder();
    gateway(order).reply(400, { error: { description: 'Insufficient refund balance' } });
    assert.equal((await cancel(order)).data.refundStatus, 'pending');
    let saved = await orderModel.findById(order._id);
    assert.equal(saved.refundDetails.lastError, 'Insufficient refund balance');
    assert.equal(saved.refundDetails.returnTracking.history.at(-1).status, 'REFUND_ATTEMPT_FAILED');
    assert.equal(saved.isCancelled, true);
    gateway(order).reply(200, refundResponse());
    assert.equal((await retry(order)).data.refundStatus, 'completed');
    saved = await orderModel.findById(order._id);
    assert.equal(saved.refundDetails.attempts, 2);
    assert.equal(saved.refundDetails.lastError, '');
    assert.equal(await stock(), 9);
});

test('concurrent customer/admin cancellation makes one refund and one stock restoration', async () => {
    const order = await makeOrder();
    gateway(order).delay(50).reply(200, refundResponse());
    const results = await Promise.all([cancel(order), cancel(order, admin)]);
    assert.equal(results.filter(result => result.data.success).length, 1);
    assert.equal(await stock(), 9);
    assert.equal((await orderModel.findById(order._id)).refundDetails.attempts, 1);
});

test('leases prevent concurrent refund retries and expired leases recover after a restart', async () => {
    const order = await makeOrder({ isCancelled: true, orderStatus: 'Cancelled', refundDetails: { requestType: 'cancellation', status: 'pending', amount: 250, autoProcess: true, processingUntil: new Date(Date.now() + 60000) } });
    await processDueCancellationRefunds();
    assert.equal((await orderModel.findById(order._id)).refundDetails.attempts, 0);
    await orderModel.updateOne({ _id: order._id }, { $set: { 'refundDetails.processingUntil': new Date(0) } });
    gateway(order).delay(100).reply(200, refundResponse());
    await Promise.all([runCancellationRefund(order._id), runCancellationRefund(order._id, { force: true })]);
    assert.equal((await orderModel.findById(order._id)).refundDetails.attempts, 1);
});

test('older cancelled paid orders can be recovered without restoring stock a second time', async () => {
    const order = await makeOrder({ orderStatus: 'Cancelled', isCancelled: true });
    gateway(order).reply(200, refundResponse());
    assert.equal((await retry(order)).data.refundStatus, 'completed');
    assert.equal((await orderModel.findById(order._id)).refundDetails.requestType, 'cancellation');
    assert.equal(await stock(), 7);
});

test('unpaid gateway cancellations never request money or add stock', async () => {
    const order = await makeOrder({ payment: false });
    assert.equal((await cancel(order)).data.refundStatus, 'none');
    assert.equal(await stock(), 7);
});

test('customer identity and staff permissions protect both cancellation and refund retry', async () => {
    const order = await makeOrder();
    assert.equal((await request('/api/order/cancel', { orderId: String(order._id), userId: String(customer._id) }, userToken(other))).status, 404);
    assert.equal((await request('/api/order/admin-cancel', { orderId: String(order._id) }, userToken(customer))).status, 401);
    assert.equal((await cancel(order, staff)).status, 403);
    assert.equal((await request('/api/refund/cancellation/retry', { orderId: String(order._id) }, adminToken(staff))).status, 403);
    assert.equal((await request('/api/order/admin-cancel', { orderId: 'bad-id' }, adminToken(admin))).status, 400);
    assert.equal((await orderModel.findById(order._id)).isCancelled, false);
});

test('dispatched and delivered orders cannot be cancelled or refunded via either cancellation route', async () => {
    for (const extra of [{ orderStatus: 'Shipped' }, { orderStatus: 'Out for delivery' }, { orderStatus: 'Delivered' }, { shiprocket: { awb: 'awb_local' } }, { shippedAt: new Date() }, { refundDetails: { status: 'pending', requestType: 'return' } }]) {
        const order = await makeOrder(extra);
        assert.equal((await cancel(order, admin)).status, 409);
        assert.equal((await cancel(order)).status, 409);
    }
    assert.equal(await stock(), 7);
});

test('cancelled history cannot be overwritten, rejected, withdrawn or reopened', async () => {
    const order = await makeOrder({ isCancelled: true, orderStatus: 'Cancelled', refundDetails: { status: 'pending', requestType: 'cancellation', amount: 250 } });
    for (const path of ['/api/refund/cancel-request', '/api/refund/request']) assert.equal((await request(path, { orderId: String(order._id) }, userToken(customer))).status, 409);
    for (const [path, body] of [['/api/refund/reject', { rejectionReason: 'No' }], ['/api/refund/approve', {}], ['/api/order/status', { orderStatus: 'Confirmed' }], ['/api/order/status', { orderStatus: 'Refunded' }]]) assert.equal((await request(path, { orderId: String(order._id), ...body }, adminToken(admin))).status, 409);
    const webhook = await request('/api/order/shiprocket-webhook', { order_id: String(order._id), current_status: 'DELIVERED' }, null, { 'x-api-key': 'local-hook' });
    assert.equal(webhook.data.success, true);
    assert.equal((await orderModel.findById(order._id)).orderStatus, 'Cancelled');
});

test('paid membership cancellation requires admin and revokes membership when refund is accepted', async () => {
    await userModel.updateOne({ _id: customer._id }, { $set: { isLuxeMember: true, giftWrapsLeft: 5 } });
    const order = await makeOrder({ items: [{ productId: product._id, name: 'Febeul Luxe Membership', price: 250, quantity: 1, image: 'test.png' }] });
    assert.equal((await cancel(order)).status, 400);
    gateway(order).reply(200, refundResponse());
    assert.equal((await cancel(order, admin)).data.success, true);
    assert.equal((await userModel.findById(customer._id)).isLuxeMember, false);
    assert.equal(await stock(), 7);
});

test('an explicit status check corrects older pending gateway refunds incorrectly marked completed', async () => {
    const order = await makeOrder({ orderStatus: 'Cancelled', isCancelled: true, refundDetails: { status: 'completed', id: 'rfnd_local', amount: 250, processedAt: new Date() } });
    nock('https://api.razorpay.com').get('/v1/refunds/rfnd_local').reply(200, refundResponse('pending'));
    const response = await request('/api/refund/cancellation/retry', { orderId: String(order._id), checkStatus: true }, adminToken(admin));
    assert.equal(response.data.refundStatus, 'processing');
    const saved = await orderModel.findById(order._id);
    assert.equal(saved.refundDetails.processedAt, null);
    assert.equal(saved.refundDetails.autoProcess, true);
    assert.equal(saved.refundDetails.returnTracking.history[0].status, 'REFUND_PROCESSING');
    assert.equal(await stock(), 7);
});

test('failed completion checks preserve completion and a mismatched provider refund cannot be accepted', async () => {
    const order = await makeOrder({ orderStatus: 'Cancelled', isCancelled: true, refundDetails: { status: 'completed', id: 'rfnd_local', amount: 250 } });
    nock('https://api.razorpay.com').get('/v1/refunds/rfnd_local').reply(200, { ...refundResponse(), payment_id: 'pay_other' });
    await request('/api/refund/cancellation/retry', { orderId: String(order._id), checkStatus: true }, adminToken(admin));
    const saved = await orderModel.findById(order._id);
    assert.equal(saved.refundDetails.status, 'completed');
    assert.match(saved.refundDetails.lastError, /does not match/);
    assert.equal(saved.refundDetails.returnTracking.history[0].status, 'REFUND_CHECK_FAILED');
});

test('refund-only staff can read cancellation history, including unpaid gateway cancellations, without cancellation permission', async () => {
    const order = await makeOrder({ orderStatus: 'Cancelled', isCancelled: true, payment: false, refundDetails: { status: 'none', requestType: 'cancellation', amount: 0 } });
    await userModel.updateOne({ _id: staff._id }, { $set: { permissions: ['/refund-requests'] } });
    const response = await request('/api/refund/list', {}, adminToken(staff));
    assert.equal(response.data.success, true);
    assert.equal(response.data.orders[0]._id, String(order._id));
    assert.equal((await cancel(order, staff)).status, 403);
    assert.equal((await request('/api/refund/list', {}, userToken(customer))).status, 401);
});

test('shipment cancellation failure is recorded without losing the prepaid refund', async () => {
    const order = await makeOrder({ shiprocket: { srOrderId: '123456' } });
    nock('https://apiv2.shiprocket.in').post('/v1/external/auth/login').reply(200, { token: 'local-shipment-test' });
    nock('https://apiv2.shiprocket.in').post('/v1/external/orders/cancel', { ids: [123456] }).reply(503, { message: 'Temporarily unavailable' });
    gateway(order).reply(200, refundResponse());
    assert.equal((await cancel(order, admin)).data.refundStatus, 'completed');
    const saved = await orderModel.findById(order._id);
    assert.match(saved.cancellation.shipmentError, /Shiprocket/);
    assert.equal(saved.refundDetails.returnTracking.history.some(event => event.status === 'SHIPMENT_CANCELLATION_FAILED'), true);
});

test('failed provider refunds remain visible and are never represented as completed', async () => {
    const order = await makeOrder();
    gateway(order).reply(200, refundResponse('failed'));
    assert.equal((await cancel(order)).data.refundStatus, 'failed');
    const saved = await orderModel.findById(order._id);
    assert.equal(saved.refundDetails.id, 'rfnd_local');
    assert.equal(saved.refundDetails.autoProcess, false);
    assert.equal(saved.refundDetails.processedAt, undefined);
    nock('https://api.razorpay.com').get('/v1/refunds/rfnd_local').reply(200, refundResponse('failed'));
    assert.equal((await retry(order)).data.refundStatus, 'failed');
});
