import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import orderModel from '../models/orderModel.js';
import exchangeModel from '../models/exchangeModel.js';
import userModel from '../models/userModel.js';
import { userToken } from '../utils/authTokens.js';
import { buildAdminOrderTracking } from '../utils/adminOrderTracking.js';

// Real controllers, a disposable database, test-only keys and no external traffic.
Object.assign(process.env, { JWT_SECRET: 'admin-tracking-tests-only-secret-32-bytes', RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_KEY_SECRET: 'local-secret', STRIPE_SECRET_KEY: 'sk_test_local', RESEND_API_KEY: 're_local', SHIPROCKET_WEBHOOK_SECRET: 'local-hook', ANALYTICS_ENABLED: 'false', NODE_ENV: 'test' });
const { default: orderRouter } = await import('../routes/orderRoute.js');
const { default: exchangeRouter } = await import('../routes/exchangeRoute.js');
const { default: returnRouter } = await import('../routes/returnRoute.js');
const { default: refundRouter } = await import('../routes/refundRoute.js');
let database, server, base, admin, customer;
const request = async (path, body, headers = { token: userToken(admin, 'admin') }) => {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.success, true, result.message);
  return result;
};
const makeOrder = (extra = {}) => orderModel.create({ userId: customer._id, items: [{ productId: new mongoose.Types.ObjectId(), name: 'Test item', image: 'test.png', price: 500, quantity: 1 }], orderTotal: 500, productAmount: 500, address: { name: 'Buyer', state: 'Delhi' }, date: Date.now() - 86400000, orderStatus: 'Delivered', shiprocketStatus: 'DELIVERED', deliveredAt: new Date(Date.now() - 3600000), paymentMethod: 'COD', payment: false, ...extra });
const hub = async order => (await request('/api/order/list', {})).orders.find(row => row._id === String(order._id)).tracking;
const journey = (tracking, key) => tracking.journeys.find(row => row.key === key || row.key.startsWith(`${key}-`));
const webhook = (id, current_status) => request('/api/order/shiprocket-webhook', { order_id: id, current_status, current_timestamp: new Date().toISOString() }, { 'x-api-key': 'local-hook' });

before(async () => {
  nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'admin-order-tracking-tests' });
  const app = express(); app.use(express.json()); app.use('/api/order', orderRouter); app.use('/api/exchange', exchangeRouter); app.use('/api/return', returnRouter); app.use('/api/refund', refundRouter);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  await Promise.all([orderModel.deleteMany({}), exchangeModel.deleteMany({}), userModel.deleteMany({})]);
  [admin, customer] = await userModel.create([{ name: 'Test Admin', email: 'admin@tracking.test', role: 'admin' }, { name: 'Buyer', email: 'buyer@tracking.test' }]);
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); await database?.stop(); nock.cleanAll(); nock.enableNetConnect();
});

test('Orders follows exchange approval, both courier legs and QC using the queue and customer milestones', async () => {
  const order = await makeOrder();
  const exchange = await exchangeModel.create({ ticketId: 'EX-111111', userId: customer._id, orderId: order._id, orderItemIndex: 0, reason: 'damaged', status: 'REQUESTED', originalItem: { name: 'Test item' }, windowExpiresAt: new Date(Date.now() + 86400000) });
  const compare = async () => {
    const tracking = await hub(order);
    const row = (await request('/api/exchange/list')).exchanges.find(row => row._id === String(exchange._id));
    const current = journey(tracking, 'exchange');
    assert.equal(current.label, row.view.label);
    const detail = (await request(`/api/order/${order._id}`, undefined, { token: userToken(customer) })).order;
    assert.equal(detail.tracking, undefined);
    assert.equal(current.customerLabel, detail.exchanges[0].exchangeStatus.label);
    assert.deepEqual(current.milestones.map(step => [step.key, step.reached, step.current]), detail.exchanges[0].exchangeStatus.milestones.map(step => [step.key, step.reached, step.current]));
    assert.equal(tracking.deliveryStatus, 'Delivered');
    return tracking;
  };
  await compare();
  await request('/api/exchange/verify', { exchangeId: exchange._id, decision: 'approve' });
  assert.equal(journey(await compare(), 'exchange').milestones.find(step => step.current).key, 'verified');
  // Seed courier assignment; the actual authenticated webhook drives pickup/delivery.
  await exchangeModel.updateOne({ _id: exchange._id }, { $set: { status: 'PICKUP_SCHEDULED', 'reversePickup.status': 'scheduled', 'reversePickup.scheduledDate': new Date() } });
  await webhook(`EXCR-${exchange._id}`, 'PICKED UP');
  assert.equal(journey(await compare(), 'exchange').milestones.find(step => step.current).key, 'picked_up');
  await request('/api/exchange/mark-received', { exchangeId: exchange._id, note: 'Warehouse receipt' });
  await request('/api/exchange/quality-check', { exchangeId: exchange._id, result: 'PASS', notes: 'Inspection passed' });
  const received = await compare();
  assert.equal(journey(received, 'exchange').references.qcResult, 'PASS');
  assert.ok(received.events.some(event => event.note.includes('Inspection passed') && event.by.includes('Test Admin')));
  await exchangeModel.updateOne({ _id: exchange._id }, { $set: { status: 'NEW_PRODUCT_DISPATCHED', 'forwardShipment.awb': 'REPLACEMENT-TEST', 'forwardShipment.dispatchedDate': new Date() } });
  await webhook(`EXCF-${exchange._id}`, 'OUT FOR DELIVERY');
  assert.equal(journey(await compare(), 'exchange').milestones.find(step => step.current).key, 'out_for_delivery');
  await webhook(`EXCF-${exchange._id}`, 'DELIVERED');
  const completed = await compare();
  assert.equal(journey(completed, 'exchange').milestones.find(step => step.current).key, 'delivered');
  assert.ok(completed.events.some(event => event.source === 'Replacement delivery' && event.label === 'Delivered'));
});

test('return queue actions, quality checks and settlement appear in Orders without losing delivery history', async () => {
  const order = await makeOrder({ refundDetails: { requestType: 'return', status: 'initiated', amount: 500, requestedAt: new Date(), pickup: { status: 'scheduled' } } });
  const compare = async () => {
    const tracking = await hub(order);
    const row = (await request('/api/return/list')).returns.find(row => row._id === String(order._id));
    assert.equal(journey(tracking, 'return').label, row.view.label);
    assert.equal(journey(tracking, 'delivery').label, 'Delivered');
    return tracking;
  };
  await request('/api/return/mark-picked-up', { orderId: order._id, note: 'Collected from buyer' });
  assert.ok(journey(await compare(), 'return').milestones.find(step => step.key === 'picked_up').reached);
  await request('/api/return/mark-received', { orderId: order._id });
  await request('/api/return/quality-check', { orderId: order._id, result: 'PASS', notes: 'Return inspected' });
  assert.equal(journey(await compare(), 'return').references.qcResult, 'PASS');
  await request('/api/return/refund-initiated', { orderId: order._id });
  assert.equal(journey(await compare(), 'refund').label, 'Refund initiated');
  // Avoid even attempting an email for this disposable buyer.
  await userModel.updateOne({ _id: customer._id }, { $unset: { email: 1 } });
  await request('/api/return/refund-settlement', { orderId: order._id, utr: 'LOCAL-TEST-UTR', amount: 500 });
  const settled = await compare();
  assert.equal(journey(settled, 'refund').label, 'Refund completed');
  assert.equal(journey(settled, 'refund').references.utr, 'LOCAL-TEST-UTR');
  assert.ok(settled.events.some(event => event.label === 'Qc Pass' && event.note.includes('Return inspected')));
  assert.ok(settled.events.some(event => event.label === 'Refund Completed' && event.note.includes('LOCAL-TEST-UTR')));
  assert.deepEqual(settled.events.filter(event => event.at).map(event => event.at), settled.events.filter(event => event.at).map(event => event.at).sort());
});

test('Orders access remains restricted and expired requests match the exchange queue', async () => {
  const order = await makeOrder();
  await exchangeModel.create({ ticketId: 'EX-222222', userId: customer._id, orderId: order._id, orderItemIndex: 0, reason: 'damaged', status: 'REQUESTED', windowExpiresAt: new Date(Date.now() - 1000) });
  const expired = journey(await hub(order), 'exchange');
  assert.equal(expired.label, 'Window Expired');
  assert.equal(expired.milestones.at(-1).key, 'blocked');
  const response = await fetch(base + '/api/order/list', { method: 'POST', headers: { token: userToken(customer), 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 401);
  const staff = await userModel.create({ name: 'Staff', email: 'staff@tracking.test', role: 'staff', permissions: ['/exchanges'] });
  const denied = await fetch(base + '/api/order/list', { method: 'POST', headers: { token: userToken(staff, 'admin'), 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(denied.status, 403);
});

test('early refunds, failed cancellation refunds and all historical scans remain distinct', () => {
  const order = { date: '2026-10-01', orderStatus: 'Refunded', deliveredAt: '2026-10-05', shiprocket: { trackingHistory: Array.from({ length: 6 }, (_, i) => ({ status: 'IN_TRANSIT', activity: `Scan ${i}`, date: `2026-10-0${i + 1}` })) }, refundDetails: { requestType: 'return', status: 'completed', requestedAt: '2026-10-06', processedAt: '2026-10-07', pickup: { status: 'scheduled' } } };
  const early = buildAdminOrderTracking(order);
  assert.equal(early.events.filter(event => event.note.startsWith('Scan')).length, 6);
  assert.equal(journey(early, 'refund').label, 'Refund completed');
  assert.equal(journey(early, 'return').milestones.find(step => step.key === 'received').reached, false);
  assert.equal(journey(early, 'return').milestones.find(step => step.key === 'received').at, null);
  const cancelled = buildAdminOrderTracking({ ...order, isCancelled: true, refundDetails: { requestType: 'cancellation', status: 'failed', lastError: 'Gateway temporarily unavailable', attempts: 2 } });
  assert.equal(cancelled.label, 'Cancelled');
  assert.equal(journey(cancelled, 'refund').label, 'Refund failed');
  assert.equal(journey(cancelled, 'refund').notice, 'Gateway temporarily unavailable');
  assert.equal(journey(cancelled, 'refund').milestones.some(step => step.key === 'refund_completed' && step.reached), false);
  assert.equal(journey(cancelled, 'refund').milestones.find(step => step.current).key, 'failed');
});

test('manual delivery updates are visible, and an open item exchange takes priority over a closed one', async () => {
  const order = await makeOrder({ orderStatus: 'Processing', shiprocketStatus: 'IN_TRANSIT', deliveredAt: undefined });
  await request('/api/order/status', { orderId: order._id, orderStatus: 'Delivered' });
  const delivered = await hub(order);
  assert.equal(delivered.label, 'Delivered');
  assert.equal(journey(delivered, 'delivery').milestones.find(step => step.key === 'delivered').at, null);
  const tracked = buildAdminOrderTracking(order, [
    { _id: 'completed', ticketId: 'EX-000001', status: 'DELIVERED', createdAt: '2026-10-10', closedAt: '2026-10-11' },
    { _id: 'active', ticketId: 'EX-000002', status: 'VERIFICATION_APPROVED', createdAt: '2026-10-09' },
  ]);
  assert.match(tracked.label, /Exchange.*Verified/);
  assert.equal(tracked.journeys.filter(row => row.key.startsWith('exchange-')).length, 2);
});

test('RefundRequests rejection is reflected in Orders with its decision date and reason', async () => {
  const order = await makeOrder({ refundDetails: { requestType: 'refund', status: 'pending', requestedAt: new Date(), returnTracking: { history: [{ status: 'RETURN_REQUESTED', date: new Date(), note: 'Customer requested a refund' }] } } });
  await request('/api/refund/reject', { orderId: order._id, rejectionReason: 'Duplicate refund request' });
  const tracking = await hub(order);
  const refund = journey(tracking, 'refund');
  assert.equal(refund.label, 'Request declined');
  assert.equal(refund.notice, 'Duplicate refund request');
  const decision = refund.milestones.find(step => step.current);
  assert.equal(decision.key, 'rejected');
  assert.ok(decision.at);
  assert.ok(tracking.events.some(event => event.label === 'Refund requested'));
  assert.ok(tracking.events.some(event => event.label === 'Request Rejected' && event.note === refund.notice));
  assert.deepEqual((await request('/api/refund/list', {})).orders[0].tracking, tracking);
});
