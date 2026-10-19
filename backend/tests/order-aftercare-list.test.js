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

// Only a disposable local database and test credentials; external traffic is blocked.
Object.assign(process.env, { JWT_SECRET: 'aftercare-list-tests-only-secret-32-bytes', RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_KEY_SECRET: 'local-secret', STRIPE_SECRET_KEY: 'sk_test_local', RESEND_API_KEY: 're_local', ANALYTICS_ENABLED: 'false', NODE_ENV: 'test' });
const { default: orderRouter } = await import('../routes/orderRoute.js');
let database, server, base, customer, other;
const request = async (path, body) => {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { token: userToken(customer), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.success, true);
  return result;
};
const makeOrder = (extra = {}) => orderModel.create({ userId: customer._id, items: [{ productId: new mongoose.Types.ObjectId(), name: 'Test item', price: 500, quantity: 1, image: 'test.png' }], orderTotal: 500, productAmount: 500, address: { name: 'Test Buyer', state: 'Delhi' }, date: Date.now(), orderStatus: 'Delivered', shiprocketStatus: 'DELIVERED', deliveredAt: new Date(), paymentMethod: 'COD', payment: false, ...extra });
const makeExchange = (order, ticketId, extra = {}) => exchangeModel.create({ ticketId, userId: order.userId, orderId: order._id, orderItemIndex: 0, reason: 'damaged', status: 'VERIFICATION_APPROVED', qc: { notes: 'Private inspection notes' }, timeline: [{ status: 'VERIFICATION_APPROVED', note: 'Private audit note' }], ...extra });

before(async () => {
  nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'aftercare-list-tests' });
  const app = express(); app.use(express.json()); app.use('/api/order', orderRouter);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  await Promise.all([orderModel.deleteMany({}), exchangeModel.deleteMany({}), userModel.deleteMany({})]);
  [customer, other] = await userModel.create([{ name: 'Buyer', email: 'buyer@aftercare.test' }, { name: 'Other', email: 'other@aftercare.test' }]);
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); await database?.stop(); nock.cleanAll(); nock.enableNetConnect();
});

test('order list returns current, customer-safe exchanges for each owned visible order', async () => {
  const first = await makeOrder();
  const second = await makeOrder();
  const foreign = await makeOrder({ userId: other._id });
  const unpaid = await makeOrder({ paymentMethod: 'Razorpay', payment: false });
  const firstExchange = await makeExchange(first, 'EX-111111');
  await makeExchange(second, 'EX-222222', { status: 'NEW_PRODUCT_DISPATCHED' });
  await makeExchange(foreign, 'EX-333333');
  await makeExchange(unpaid, 'EX-444444');
  await makeExchange(first, 'EX-555555', { userId: other._id });
  let result = await request('/api/order/userorders', {});
  assert.equal(result.orders.length, 2);
  const own = result.orders.find(order => order._id === String(first._id));
  assert.equal(own.exchanges.length, 1);
  assert.equal(own.exchanges[0].exchangeStatus.label, 'Exchange Approved');
  assert.equal(own.exchanges[0].qc, undefined);
  assert.equal(own.exchanges[0].timeline, undefined);
  assert.equal(own.exchanges[0].status, undefined);
  assert.deepEqual(own.exchanges, (await request(`/api/order/${first._id}`)).order.exchanges);
  assert.equal(result.orders.find(order => order._id === String(second._id)).exchanges[0].exchangeStatus.stage, 'dispatched');
  await exchangeModel.updateOne({ _id: firstExchange._id }, { $set: { status: 'OUT_FOR_DELIVERY' } });
  result = await request('/api/order/userorders', {});
  assert.equal(result.orders.find(order => order._id === String(first._id)).exchanges[0].exchangeStatus.stage, 'out_for_delivery');
});

test('list and details apply the same exchange expiry and return milestones', async () => {
  const order = await makeOrder({ refundDetails: { requestType: 'return', status: 'pending', requestedAt: new Date(), pickup: { status: 'scheduled' } } });
  const expired = await makeExchange(order, 'EX-666666', { status: 'REQUESTED', windowExpiresAt: new Date(Date.now() - 1000) });
  const listed = (await request('/api/order/userorders', {})).orders[0];
  const detail = (await request(`/api/order/${order._id}`)).order;
  assert.deepEqual(listed.exchanges, detail.exchanges);
  assert.deepEqual(listed.returnStatus, detail.returnStatus);
  assert.equal(listed.returnStatus.stage, 'pickup_scheduled');
  assert.equal(listed.exchanges[0].exchangeStatus.blocked, true);
  assert.equal((await exchangeModel.findById(expired._id)).status, 'EXPIRED');
  assert.equal(listed.refundDetails.returnTracking, undefined);
});
