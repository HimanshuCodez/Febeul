import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import { userToken } from '../utils/authTokens.js';
import { isReturnAwaitingApproval } from '../../shared/returnWorkflow.js';

Object.assign(process.env, { JWT_SECRET: 'return-workflow-tests-only-secret', RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_KEY_SECRET: 'local-secret', STRIPE_SECRET_KEY: 'sk_test_local', RESEND_API_KEY: 're_local', NODE_ENV: 'test' });
const { default: returnRouter } = await import('../routes/returnRoute.js');
const { default: refundRouter } = await import('../routes/refundRoute.js');
let database, server, base, admin, customer, payments, pickups, emails, gatewayStatus, gatewayAmount, pickupFails;
const request = async (path, body, token = userToken(admin, 'admin')) => {
  const response = await fetch(base + path, { method: 'POST', headers: { token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
};
const success = async (path, body, token) => {
  const response = await request(path, body, token);
  assert.equal(response.status, 200, response.data.message);
  assert.equal(response.data.success, true, response.data.message);
  return response.data;
};
const makeOrder = (extra = {}) => orderModel.create({ userId: customer._id, items: [{ productId: new mongoose.Types.ObjectId(), name: 'Test garment', image: 'test.png', sku: 'TEST-BLACK', quantity: 1, price: 500 }],
  orderTotal: 500, productAmount: 500, address: { name: 'Test Buyer', address: 'Test street', city: 'Delhi', state: 'Delhi', zip: '110001', phone: '9999999999' },
  date: Date.now() - 86400000, deliveredAt: new Date(), orderStatus: 'Delivered', shiprocketStatus: 'DELIVERED',
  paymentMethod: 'Razorpay', payment: true, razorpayPaymentId: 'pay_local',
  refundDetails: { requestType: 'return', status: 'pending', reason: 'The item arrived damaged', requestedAt: new Date(), pickup: { status: 'none' } }, ...extra,
});
const receiveAndPass = async order => {
  await success('/api/return/mark-received', { orderId: order._id });
  await success('/api/return/quality-check', { orderId: order._id, result: 'PASS', notes: 'Inspection passed' });
};

before(async () => {
  nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'return-refund-workflow-tests' });
  const app = express(); app.use(express.json()); app.use('/api/return', returnRouter); app.use('/api/refund', refundRouter);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  nock.cleanAll(); payments = []; pickups = []; emails = []; gatewayStatus = 'processed'; gatewayAmount = 50000; pickupFails = false;
  nock('https://api.resend.com').persist().post('/emails').reply((uri, body) => { emails.push(body); return [200, { id: 'local-email' }]; });
  nock('https://apiv2.shiprocket.in').persist().post('/v1/external/auth/login').reply(200, { token: 'local-courier-token' });
  nock('https://apiv2.shiprocket.in').persist().post('/v1/external/orders/create/return').reply((uri, body) => {
    pickups.push(body); return pickupFails ? [503, { message: 'Courier unavailable' }] : [200, { order_id: 'local-return', shipment_id: 'local-shipment' }];
  });
  nock('https://api.razorpay.com').persist().post('/v1/payments/pay_local/refund').reply((uri, body) => {
    payments.push({ method: 'POST', body }); gatewayAmount = body.amount;
    return [200, { id: 'rfnd_local', status: gatewayStatus, payment_id: 'pay_local', amount: gatewayAmount }];
  });
  nock('https://api.razorpay.com').persist().get('/v1/refunds/rfnd_local').reply(() => {
    payments.push({ method: 'GET' }); return [200, { id: 'rfnd_local', status: gatewayStatus, payment_id: 'pay_local', amount: gatewayAmount }];
  });
  await Promise.all([orderModel.deleteMany({}), userModel.deleteMany({})]);
  [admin, customer] = await userModel.create([{ name: 'Admin', email: 'admin@return.test', role: 'admin' }, { name: 'Buyer', email: 'buyer@return.test' }]);
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); await database?.stop(); nock.cleanAll(); nock.enableNetConnect();
});

test('a customer return approves pickup first and refunds only after receipt and QC pass', async () => {
  const order = await makeOrder({ refundDetails: { status: 'none' } });
  await success('/api/refund/request', { orderId: order._id, requestType: 'return', reason: 'The item arrived damaged' }, userToken(customer));
  let saved = await orderModel.findById(order._id);
  assert.equal(saved.orderStatus, 'Delivered');
  assert.equal(isReturnAwaitingApproval(saved), true);
  await success('/api/return/approve', { orderId: order._id });
  await success('/api/return/approve', { orderId: order._id });
  saved = await orderModel.findById(order._id);
  assert.equal(isReturnAwaitingApproval(saved), false);
  assert.ok(saved.refundDetails.returnTracking.approvedAt);
  assert.equal(saved.refundDetails.pickup.status, 'scheduled');
  assert.equal(saved.refundDetails.status, 'pending');
  assert.equal(saved.refundDetails.id, undefined);
  assert.equal(saved.refundDetails.returnTracking.refundInitiatedAt, undefined);
  assert.equal(pickups.length, 1);
  assert.equal(payments.length, 0);
  for (const path of ['/api/refund/approve', '/api/return/refund', '/api/return/refund-initiated', '/api/return/refund-settlement']) {
    assert.equal((await request(path, { orderId: order._id, utr: 'NO-EARLY-REFUND' })).status, 409, path);
  }
  await success('/api/return/mark-received', { orderId: order._id });
  assert.equal((await request('/api/return/refund', { orderId: order._id })).status, 409);
  assert.equal(payments.length, 0);
  await success('/api/return/quality-check', { orderId: order._id, result: 'PASS' });
  await success('/api/return/refund', { orderId: order._id });
  saved = await orderModel.findById(order._id);
  assert.equal(saved.refundDetails.status, 'completed');
  assert.equal(saved.refundDetails.amount, 500);
  assert.equal(saved.orderStatus, 'Refunded');
  assert.ok(saved.refundDetails.returnTracking.refundPaidAt);
  assert.deepEqual(payments.map(call => call.method), ['POST']);
  assert.equal(pickups.length, 1);
  const history = saved.refundDetails.returnTracking.history.map(entry => entry.status);
  assert.ok(history.indexOf('RETURN_APPROVED') < history.indexOf('QC_PASS'));
  assert.ok(history.indexOf('QC_PASS') < history.indexOf('REFUND_COMPLETED'));
});

test('courier scheduling failure still never issues a refund', async () => {
  const order = await makeOrder(); pickupFails = true;
  await success('/api/return/approve', { orderId: order._id });
  const saved = await orderModel.findById(order._id);
  assert.equal(saved.refundDetails.pickup.status, 'failed');
  assert.equal(saved.refundDetails.status, 'pending');
  assert.ok(saved.refundDetails.returnTracking.approvedAt);
  assert.equal(payments.length, 0);
  assert.equal(saved.refundDetails.processedAt, undefined);
});

test('QC failure blocks every payout path, even when a return is overdue', async () => {
  const order = await makeOrder({ refundDetails: { requestType: 'return', status: 'pending', pickup: { status: 'delivered_to_warehouse' },
    returnTracking: { pickupDate: new Date(Date.now() - 20 * 86400000), receivedDate: new Date(), qcResult: 'FAIL', qcDate: new Date() } } });
  for (const path of ['/api/refund/approve', '/api/return/refund', '/api/return/refund-initiated', '/api/return/refund-settlement']) {
    assert.equal((await request(path, { orderId: order._id, utr: 'INVALID-EARLY-PAYOUT' })).status, 409);
  }
  assert.equal(payments.length, 0);
  assert.equal((await orderModel.findById(order._id)).refundDetails.status, 'pending');
});

test('pending gateway refunds stay open and status checks reconcile without a second payment', async () => {
  const order = await makeOrder(); await receiveAndPass(order); gatewayStatus = 'pending';
  await success('/api/return/refund', { orderId: order._id, manualRefundAmount: 350, adminRefundComment: 'Agreed partial refund' });
  let saved = await orderModel.findById(order._id);
  assert.equal(saved.refundDetails.status, 'processing');
  assert.equal(saved.refundDetails.returnTracking.refundPaidAt, undefined);
  assert.equal(saved.refundDetails.processedAt, undefined);
  assert.equal(saved.emailNotifications?.['refund-processed'], undefined);
  assert.equal(emails.length, 0);
  assert.equal((await request('/api/return/refund-settlement', { orderId: order._id, utr: 'NO-MANUAL-GATEWAY-OVERRIDE' })).status, 409);
  gatewayStatus = 'processed';
  await success('/api/return/refund', { orderId: order._id });
  saved = await orderModel.findById(order._id);
  assert.equal(saved.refundDetails.status, 'completed');
  assert.equal(saved.refundDetails.amount, 350);
  assert.equal(saved.refundDetails.adminRefundComment, 'Agreed partial refund');
  assert.deepEqual(payments.map(call => call.method), ['POST', 'GET']);
  assert.equal(emails.length, 1);
});

test('COD refunds require receipt, passed QC and a real bank reference', async () => {
  const order = await makeOrder({ paymentMethod: 'COD', payment: false });
  assert.equal((await request('/api/return/refund-settlement', { orderId: order._id, utr: 'EARLY' })).status, 409);
  await receiveAndPass(order);
  assert.equal((await request('/api/refund/approve', { orderId: order._id })).status, 409);
  assert.equal((await request('/api/return/refund-settlement', { orderId: order._id })).data.success, false);
  await success('/api/return/refund-initiated', { orderId: order._id });
  await success('/api/return/refund-settlement', { orderId: order._id, utr: 'TEST-BANK-REFERENCE', amount: 400 });
  assert.equal((await request('/api/return/refund-settlement', { orderId: order._id, utr: 'DUPLICATE' })).status, 409);
  const saved = await orderModel.findById(order._id);
  assert.equal(saved.refundDetails.returnTracking.refundUtr, 'TEST-BANK-REFERENCE');
  assert.equal(saved.refundDetails.amount, 400);
  assert.equal(saved.refundDetails.id, undefined);
  assert.equal(payments.length, 0);
});

test('Stripe returns use the original gateway only after QC', async () => {
  const order = await makeOrder({ paymentMethod: 'Stripe', paymentDetails: { stripePaymentIntentId: 'pi_local' } });
  nock('https://api.stripe.com').post('/v1/refunds').reply(200, { id: 're_local', status: 'succeeded' });
  assert.equal((await request('/api/return/refund', { orderId: order._id })).status, 409);
  await receiveAndPass(order);
  await success('/api/return/refund', { orderId: order._id });
  assert.equal((await orderModel.findById(order._id)).refundDetails.id, 're_local');
});

test('money-only refunds remain separate and return actions enforce staff permissions', async () => {
  const order = await makeOrder({ refundDetails: { requestType: 'refund', status: 'pending' } });
  assert.equal((await request('/api/return/approve', { orderId: order._id })).status, 400);
  assert.equal((await request('/api/return/refund', { orderId: order._id })).status, 400);
  await success('/api/refund/approve', { orderId: order._id });
  const physical = await makeOrder();
  assert.equal((await request('/api/return/approve', { orderId: physical._id }, userToken(customer))).status, 401);
  const staff = await userModel.create({ name: 'Support', email: 'staff@return.test', role: 'staff', permissions: ['/tickets'] });
  assert.equal((await request('/api/return/approve', { orderId: physical._id }, userToken(staff, 'admin'))).status, 403);
  await userModel.updateOne({ _id: staff._id }, { $set: { permissions: ['/return-requests'] } });
  await success('/api/return/approve', { orderId: physical._id }, userToken(staff, 'admin'));
});
