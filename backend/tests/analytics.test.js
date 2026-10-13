import { adminTokenFor } from './helpers/auth.js';
import { userToken } from '../utils/authTokens.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createAnalyticsRouter, createRateLimiter } from '../analytics/routes.js';
import { AnalyticsEvent, AnalyticsPayment, AnalyticsRevocation } from '../analytics/models.js';
import { recordVerifiedPurchase, ingestEvents, verifiedPayment } from '../analytics/service.js';
import { validateBatch, reportRange } from '../analytics/validation.js';
import { summaryReport, journeyReport } from '../analytics/reports.js';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';
import cartRouter from '../routes/cartRoute.js';
import { Sessions } from '../node_modules/stripe/esm/resources/Checkout/Sessions.js';

// No dotenv import: never read the project's database or gateway credentials.
Object.assign(process.env, { ANALYTICS_ENABLED: 'true', JWT_SECRET: 'analytics-local-test-only', ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'test-admin', STAFF_EMAIL: 'staff@example.test', STAFF_PASSWORD: 'test-staff', STRIPE_SECRET_KEY: 'sk_test_local', RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_KEY_SECRET: 'test-razorpay-secret', RESEND_API_KEY: 're_local_test' });
let database, server, base, user;
const context = () => ({ visitorId: randomUUID(), sessionId: randomUUID(), consentVersion: '2026-10-v1', path: '/checkout' });
const event = (ctx, name = 'page_view', extra = {}) => ({ ...ctx, eventId: randomUUID(), name, timestamp: new Date(), expiresAt: new Date(Date.now() + 86400000), ...extra });
const auth = () => userToken(user);
const admin = () => adminTokenFor(process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD);
const request = async (path, body, token) => {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
};
const createOrder = async (extra = {}) => orderModel.create({ userId: user._id, items: [{ productId: new mongoose.Types.ObjectId(), name: 'Febeul Luxe Membership', quantity: 1, price: 199, image: 'test.png' }], orderTotal: 199, address: { state: 'Delhi' }, paymentMethod: 'Razorpay', payment: true, date: Date.now(), ...extra });
const proofFor = order => ({ gateway: 'razorpay', receipt: String(order._id), status: 'paid', amount_paid: 19900, currency: 'INR' });

before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'analytics-tests' });
  await Promise.all([AnalyticsEvent.init(), AnalyticsPayment.init(), AnalyticsRevocation.init(), userModel.init(), orderModel.init()]);
  const orderRouter = (await import('../routes/orderRoute.js')).default;
  const app = express();
  app.use('/api/analytics', createAnalyticsRouter());
  app.use(express.json()); app.use('/api/cart', cartRouter); app.use('/api/order', orderRouter);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
});
after(async () => { nock.cleanAll(); nock.enableNetConnect(); if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (database) await database.stop(); });
beforeEach(async () => {
  process.env.ANALYTICS_ENABLED = 'true';
  await Promise.all([AnalyticsEvent.deleteMany({}), AnalyticsPayment.deleteMany({}), AnalyticsRevocation.deleteMany({}), userModel.deleteMany({}), orderModel.deleteMany({}), productModel.deleteMany({})]);
  user = await userModel.create({ email: 'buyer@example.test', name: 'Test buyer' });
});

test('allowlist, server timestamps, token-derived identity, unsafe search rejection and event deduplication', async () => {
  const ctx = context(), id = randomUUID();
  const payload = { context: { ...ctx, userId: new mongoose.Types.ObjectId(), password: 'never-save' }, events: [{ eventId: id, name: 'page_view', path: '/cart?token=secret', timestamp: '2000-01-01', userId: new mongoose.Types.ObjectId(), address: 'private', token: 'private' }] };
  assert.equal((await request('/api/analytics/events', payload, auth())).status, 202);
  assert.equal((await request('/api/analytics/events', payload, auth())).status, 202);
  const saved = await AnalyticsEvent.findOne().lean();
  assert.equal(await AnalyticsEvent.countDocuments(), 1); assert.equal(String(saved.userId), String(user._id)); assert.equal(saved.path, '/cart'); assert.ok(+saved.timestamp > Date.now() - 60000);
  assert.ok(!JSON.stringify(saved).includes('private')); assert.equal(saved.password, undefined);
  assert.throws(() => validateBatch({ context: ctx, events: [{ eventId: randomUUID(), name: 'purchase' }] }));
  assert.throws(() => validateBatch({ context: ctx, events: [{ eventId: randomUUID(), name: 'search', searchTerm: 'me@example.com' }] }));
  assert.equal((await request('/api/analytics/events', { ...payload, context: { ...ctx, consentVersion: 'old' } })).status, 400);
});

test('report access requires existing admin authorization or explicit User Tracking staff permission', async () => {
  assert.equal((await request('/api/analytics/reports/summary')).status, 401);
  assert.equal((await request('/api/analytics/reports/summary', null, auth())).status, 401);
  const deniedStaff = await userModel.create({ email: 'denied@example.test', role: 'staff', permissions: ['/orders'] });
  const allowedStaff = await userModel.create({ email: 'allowed@example.test', role: 'staff', permissions: ['/user-tracking'] });
  assert.equal((await request('/api/analytics/reports/summary', null, adminTokenFor(deniedStaff._id))).status, 403);
  assert.equal((await request('/api/analytics/reports/journeys', null, adminTokenFor(allowedStaff._id))).status, 200);
  assert.equal((await request('/api/analytics/reports/journeys', null, adminTokenFor(process.env.STAFF_EMAIL + process.env.STAFF_PASSWORD))).status, 403);
  assert.equal((await request('/api/analytics/reports/summary', null, admin())).status, 200);
  assert.equal((await request('/api/analytics/reports/summary?from=2026-02-30', null, admin())).status, 400);
});

test('revocation removes events and blocks delayed batches and purchase attribution, but keeps operational orders', async () => {
  const ctx = context(); await ingestEvents([event(ctx)]);
  assert.equal((await request('/api/analytics/withdraw', { visitorId: ctx.visitorId })).status, 204);
  await ingestEvents([event(ctx)]);
  const order = await createOrder(); await recordVerifiedPurchase({ order, proof: proofFor(order), context: ctx, userId: user._id });
  assert.equal(await AnalyticsEvent.countDocuments(), 0); assert.equal(await orderModel.countDocuments(), 1); assert.equal(await AnalyticsPayment.countDocuments(), 1);
});

test('only gateway-verified payments produce purchases; concurrency, callbacks and later consent cannot duplicate/backfill', async () => {
  const order = await createOrder(), ctx = context();
  assert.equal(verifiedPayment(order, { ...proofFor(order), status: 'created' }), null);
  assert.equal(verifiedPayment(order, { ...proofFor(order), receipt: 'other' }), null);
  await Promise.all(Array.from({ length: 5 }, () => recordVerifiedPurchase({ order, proof: proofFor(order), context: ctx, userId: user._id })));
  assert.equal(await AnalyticsEvent.countDocuments({ name: 'purchase' }), 1); assert.equal(await AnalyticsPayment.countDocuments(), 1);
  const rejectedOrder = await createOrder();
  await recordVerifiedPurchase({ order: rejectedOrder, proof: proofFor(rejectedOrder), context: null, userId: user._id });
  await recordVerifiedPurchase({ order: rejectedOrder, proof: proofFor(rejectedOrder), context: ctx, userId: user._id });
  assert.equal(await AnalyticsEvent.countDocuments({ name: 'purchase' }), 1); assert.equal(await AnalyticsPayment.countDocuments(), 2);
  const stripeOrder = await createOrder({ paymentMethod: 'Stripe', paymentDetails: { stripeSessionId: 'cs_test' } });
  assert.equal(verifiedPayment(stripeOrder, { gateway: 'stripe', id: 'cs_test', payment_status: 'unpaid', amount_total: 19900, currency: 'inr' }), null);
  assert.equal(verifiedPayment(stripeOrder, { gateway: 'stripe', id: 'cs_test', payment_status: 'paid', amount_total: 1200, currency: 'jpy' }).amount, 1200);
});

test('report arithmetic, currency/refund separation, future activity for abandonment, and journey pagination', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const day = offset => new Date(new Date(`${today}T00:00:00Z`).getTime() + offset * 86400000 + 3600000);
  const range = reportRange({ from: day(-2).toISOString().slice(0, 10), to: day(-1).toISOString().slice(0, 10) });
  const a = context(), b = context(), c = context();
  const order = await createOrder({ date: +day(-1), refundDetails: { status: 'completed', amount: 49 } });
  await AnalyticsPayment.create({ orderId: order._id, amount: 199, currency: 'INR', timestamp: day(-1) });
  await AnalyticsPayment.create({ orderId: new mongoose.Types.ObjectId(), amount: 12, currency: 'USD', timestamp: day(-1) });
  await AnalyticsEvent.insertMany([
    event({ ...a, sessionId: randomUUID() }, 'page_view', { timestamp: day(-5) }),
    ...['product_view', 'add_to_cart', 'checkout_started', 'purchase'].map((name, index) => event(a, name, { timestamp: new Date(+day(-1) + index * 1000), ...(name === 'purchase' ? { orderId: order._id, amount: 199, currency: 'INR' } : {}) })),
    event(b, 'checkout_started', { timestamp: day(-1) }),
    event(c, 'checkout_started', { timestamp: day(-1) }),
    event(c, 'purchase', { timestamp: day(0), orderId: new mongoose.Types.ObjectId(), amount: 10, currency: 'USD' }),
  ]);
  const report = await summaryReport(range);
  assert.equal(report.visitors.total, 3); assert.equal(report.visitors.new, 2); assert.equal(report.visitors.returning, 1);
  assert.equal(report.sessions.total, 3); assert.equal(report.sessions.purchase, 1); assert.ok(Math.abs(report.conversionRate - 100 / 3) < 0.00001);
  assert.equal(report.abandonment.checkouts, 3); assert.equal(report.abandonment.abandoned, 1); assert.equal(report.abandonment.purchased, 2);
  assert.equal(report.payments.find(row => row._id === 'INR').net, 150); assert.equal(report.payments.find(row => row._id === 'USD').gross, 12);
  assert.equal(report.trackedPayments[0].refunds, 49); assert.equal(report.operational[0]._id, 'INR');
  await AnalyticsEvent.insertMany(Array.from({ length: 12 }, () => event(context(), 'page_view', { timestamp: day(-1) })));
  const firstPage = await journeyReport(range, 1), nextPage = await journeyReport(range, 2);
  assert.equal(firstPage.rows.length, 10); assert.equal(nextPage.rows.length, 5); assert.equal(firstPage.total, 15);
  assert.ok(!JSON.stringify(firstPage).includes('buyer@example.test'));
});

test('payload limits, rate limits, retention indexes and safe feature disable', async () => {
  assert.equal((await request('/api/analytics/events', { extra: 'x'.repeat(33000) })).status, 413);
  const indexes = await AnalyticsEvent.collection.indexes();
  assert.ok(indexes.some(index => index.expireAfterSeconds === 0)); assert.ok(indexes.some(index => index.unique && index.key.eventId)); assert.ok(indexes.some(index => index.unique && index.key.orderId));
  let time = 0, next = 0, denied = 0;
  const limiter = createRateLimiter({ limit: 2, now: () => time });
  const res = { status(code) { assert.equal(code, 429); denied++; return this; }, json() {} };
  for (let index = 0; index < 3; index++) limiter({ ip: '127.0.0.1' }, res, () => next++);
  assert.equal(next, 2); assert.equal(denied, 1); time = 60000; limiter({ ip: '127.0.0.1' }, res, () => next++); assert.equal(next, 3);
  process.env.ANALYTICS_ENABLED = 'false';
  assert.equal((await request('/api/analytics/events', {})).status, 204);
  const order = await createOrder(); await recordVerifiedPurchase({ order, proof: proofFor(order), context: context(), userId: user._id });
  assert.equal(await AnalyticsEvent.countDocuments(), 0); assert.equal(await orderModel.countDocuments(), 1);
});

test('funnel drill-down totals match summary cohorts, with independent activity and session filters', async () => {
  const range = reportRange({});
  const stages = ['product_view', 'add_to_cart', 'checkout_started', 'purchase'];
  const contexts = Array.from({ length: 8 }, () => context());
  // Earlier stages outside the date range, in another session, or expired must not qualify.
  await AnalyticsEvent.insertMany([
    ...contexts.slice(0, 4).flatMap((ctx, index) => stages.slice(0, index + 1).map(name => event(ctx, name, name === 'purchase' ? { orderId: new mongoose.Types.ObjectId(), amount: 100, currency: 'INR' } : {}))),
    event(contexts[1], 'add_to_cart'),
    event(contexts[4], 'add_to_cart'),
    event(contexts[5], 'product_view', { timestamp: new Date(+range.start - 1) }), event(contexts[5], 'add_to_cart'),
    event(contexts[6], 'product_view', { expiresAt: new Date(Date.now() - 1000) }), event(contexts[6], 'add_to_cart'),
    event({ ...contexts[7], visitorId: contexts[0].visitorId }, 'purchase', { orderId: new mongoose.Types.ObjectId(), amount: 100, currency: 'INR' }),
  ]);
  const summary = await summaryReport(range);
  for (const stage of ['product', 'cart', 'checkout', 'purchase']) {
    const report = await journeyReport(range, 1, { stage });
    assert.equal(report.total, summary.sessions[stage]);
    const expectedEvent = stages[['product', 'cart', 'checkout', 'purchase'].indexOf(stage)];
    assert.ok(report.rows.every(row => row.timeline.every(item => item.name === expectedEvent)));
  }
  assert.equal((await journeyReport(range, 1, { stage: 'cart' })).total, 3);
  assert.equal((await journeyReport(range, 1, { event: 'add_to_cart' })).total, 6);
  assert.equal((await journeyReport(range, 1, { event: 'purchase' })).total, 2);
  const full = await journeyReport(range, 1, { sessionId: contexts[3].sessionId });
  assert.equal(full.total, 1); assert.equal(full.rows[0].timeline.length, 4);
  assert.equal((await journeyReport(range, 1, { stage: 'purchase', sessionId: contexts[0].sessionId })).total, 0);
});

test('journeys identify only recorded signed-in actions and expose allowlisted account/product/order details', async () => {
  const ctx = context(), range = reportRange({});
  await userModel.updateOne({ _id: user._id }, { $set: { password: 'private-password', otp: 'private-otp', bankAccount: { accountNumber: 'private-bank' } } });
  const secondUser = await userModel.create({ name: 'Second account', email: 'second@example.test' });
  const product = await productModel.create({ name: 'Rose lounge set', description: 'Test', category: 'Lingerie', date: Date.now(), variations: [] });
  const order = await createOrder({ address: { name: 'private-address' }, items: [{ productId: product._id, name: product.name, quantity: 2, price: 199, image: 'private-image' }] });
  await AnalyticsEvent.insertMany([
    event(ctx, 'product_view', { productId: product._id }),
    event(ctx, 'add_to_cart', { productId: product._id, quantity: 2, userId: user._id }),
    event(ctx, 'checkout_started', { userId: secondUser._id }),
    event(ctx, 'purchase', { userId: secondUser._id, orderId: order._id, amount: 199, currency: 'INR' }),
  ]);
  const full = (await journeyReport(range)).rows[0];
  assert.equal(full.accounts.length, 2); assert.equal(full.anonymousEvents, 1);
  assert.ok(full.accounts.some(account => account.email === user.email));
  assert.ok(full.accounts.every(account => Object.keys(account).sort().join(',') === '_id,email,name'));
  const view = full.timeline.find(item => item.name === 'product_view');
  assert.equal(view.userId, undefined); assert.equal(view.productName, product.name);
  const purchase = full.timeline.find(item => item.name === 'purchase');
  assert.equal(String(purchase.userId), String(secondUser._id));
  assert.deepEqual(purchase.items, [{ productId: product._id, name: product.name, quantity: 2 }]);
  assert.ok(!JSON.stringify(full).includes('private-'));
  const views = (await journeyReport(range, 1, { stage: 'product' })).rows[0];
  assert.deepEqual(views.accounts, []); assert.equal(views.anonymousEvents, 1);
  const cart = (await journeyReport(range, 1, { stage: 'cart' })).rows[0];
  assert.equal(cart.accounts.length, 1); assert.equal(cart.accounts[0].email, user.email);
  await userModel.deleteOne({ _id: user._id }); await productModel.deleteOne({ _id: product._id });
  const missing = (await journeyReport(range, 1, { event: 'add_to_cart' })).rows[0];
  assert.equal(missing.accounts[0].name, 'Unavailable account'); assert.equal(missing.accounts[0].email, undefined);
  assert.equal(missing.timeline[0].productName, 'Unavailable product');
  assert.equal((await request('/api/analytics/withdraw', { visitorId: ctx.visitorId })).status, 204);
  assert.equal((await journeyReport(range)).total, 0);
  assert.equal(await orderModel.countDocuments(), 1);
});

test('filtered journey pagination and event limits apply after selecting matching sessions/activity', async () => {
  const ctx = context(), range = reportRange({});
  const start = new Date(); start.setUTCHours(0, 0, 1, 0);
  await AnalyticsEvent.insertMany([
    ...Array.from({ length: 105 }, (_, index) => event(ctx, 'page_view', { timestamp: new Date(+start + index) })),
    event(ctx, 'product_view', { timestamp: new Date(+start + 106) }),
    ...Array.from({ length: 102 }, (_, index) => event(ctx, 'add_to_cart', { userId: user._id, timestamp: new Date(+start + 107 + index) })),
    ...Array.from({ length: 11 }, () => context()).flatMap(item => [event(item, 'product_view'), event(item, 'add_to_cart')]),
    ...Array.from({ length: 12 }, () => event(context(), 'search', { searchTerm: 'rose' })),
  ]);
  const first = await journeyReport(range, 1, { stage: 'cart' });
  const second = await journeyReport(range, 2, { stage: 'cart' });
  assert.equal(first.total, 12); assert.equal(first.rows.length, 10); assert.equal(second.rows.length, 2);
  assert.equal(new Set([...first.rows, ...second.rows].map(row => row._id)).size, 12);
  const delayed = [...first.rows, ...second.rows].find(row => row._id === ctx.sessionId);
  assert.equal(delayed.events, 208); assert.equal(delayed.matchingEvents, 102); assert.equal(delayed.timeline.length, 100);
  assert.ok(delayed.timeline.every(item => item.name === 'add_to_cart')); assert.equal(delayed.accounts[0].email, user.email);
  assert.equal((await journeyReport(range, 1, { event: 'search' })).total, 12);
});

test('identity-bearing journey filters retain admin authorization and reject invalid query values', async () => {
  await AnalyticsEvent.create(event(context(), 'add_to_cart', { userId: user._id }));
  const path = '/api/analytics/reports/journeys?event=add_to_cart';
  assert.equal((await request(path)).status, 401); assert.equal((await request(path, null, auth())).status, 401);
  const staff = await userModel.create({ email: 'report-staff@example.test', role: 'staff', permissions: ['/orders'] });
  const staffToken = adminTokenFor(staff._id);
  assert.equal((await request(path, null, staffToken)).status, 403);
  await userModel.updateOne({ _id: staff._id }, { $set: { permissions: ['/user-tracking'] } });
  assert.equal((await request(path, null, staffToken)).body.rows[0].accounts[0].email, user.email);
  assert.equal((await request(path, null, admin())).body.rows[0].accounts[0].email, user.email);
  for (const query of ['stage=nope', 'stage=toString', 'stage=cart&stage=product', 'event=password', 'event[$ne]=purchase', 'stage=cart&event=add_to_cart', 'sessionId=invalid', 'page=0']) {
    assert.equal((await request('/api/analytics/reports/journeys?' + query, null, admin())).status, 400, query);
  }
});

test('real cart routes keep add/update/remove behavior while analytics is unavailable', async () => {
  process.env.ANALYTICS_ENABLED = 'false';
  const product = await productModel.create({ name: 'Test lingerie', description: 'Test', category: 'Lingerie', sizes: ['M'], date: Date.now(), variations: [{ color: 'Rose', images: ['test.png'], sizes: [{ size: 'M', price: 199, stock: 10 }] }] });
  const item = { itemId: String(product._id), size: 'M', color: 'Rose' };
  assert.equal((await request('/api/cart/add', item, auth())).body.success, true);
  assert.equal((await request('/api/cart/update', { ...item, quantity: 2 }, auth())).body.success, true);
  assert.equal((await request('/api/cart/get', null, auth())).body.cartItems[0].quantity, 2);
  assert.equal((await request('/api/cart/remove', item, auth())).body.success, true);
  assert.equal((await request('/api/cart/get', null, auth())).body.cartItems.length, 0);
});

test('actual Razorpay callback preserves payment/membership and remains successful when analytics writes fail', async () => {
  const order = await createOrder({ payment: false, paymentDetails: { razorpay_order_id: 'order_local' } });
  const gatewayOrder = 'order_local', paymentId = 'pay_local';
  nock('https://api.razorpay.com').get(`/v1/orders/${gatewayOrder}`).twice().reply(200, { id: gatewayOrder, receipt: String(order._id), status: 'paid', amount_paid: 19900, currency: 'INR' });
  nock('https://api.razorpay.com').get(`/v1/payments/${paymentId}`).reply(200, { id: paymentId, order_id: gatewayOrder, status: 'captured', amount: 19900, currency: 'INR', acquirer_data: {} });
  nock('https://api.resend.com').post('/emails').twice().reply(200, { id: 'local-email' });
  const payload = { userId: String(user._id), razorpay_order_id: gatewayOrder, razorpay_payment_id: paymentId, razorpay_signature: createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${gatewayOrder}|${paymentId}`).digest('hex') };
  const ctx = context();
  const send = () => fetch(`${base}/api/order/verifyRazorpay`, { method: 'POST', headers: { 'Content-Type': 'application/json', token: auth(), 'x-analytics-context': JSON.stringify(ctx) }, body: JSON.stringify(payload) }).then(res => res.json());
  assert.deepEqual(await send(), { success: true, message: 'Payment Successful' });
  for (let i = 0; i < 50 && !await AnalyticsEvent.exists({ name: 'purchase' }); i++) await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(await AnalyticsEvent.countDocuments({ name: 'purchase' }), 1);
  const original = AnalyticsPayment.updateOne; AnalyticsPayment.updateOne = () => Promise.reject(new Error('Simulated outage'));
  try { assert.deepEqual(await send(), { success: true, message: 'Payment already verified.' }); await new Promise(resolve => setTimeout(resolve, 30)); }
  finally { AnalyticsPayment.updateOne = original; }
  assert.equal((await orderModel.findById(order._id)).payment, true); assert.equal((await userModel.findById(user._id)).isLuxeMember, true);
  assert.equal(await AnalyticsEvent.countDocuments({ name: 'purchase' }), 1);
  assert.equal((await request('/api/order/verifyRazorpay', { ...payload, razorpay_signature: 'invalid' }, auth())).body.success, false);
});

test('existing Razorpay order creation keeps server pricing and creates no premature purchase', async () => {
  nock('https://api.razorpay.com').post('/v1/orders', body => body.amount === 12900 && body.currency === 'INR').reply(200, { id: 'order_new', amount: 12900, currency: 'INR', status: 'created' });
  const placed = await request('/api/order/razorpay', { userId: String(user._id), items: [{ name: 'Febeul Luxe Membership', quantity: 1 }], address: { state: 'Delhi' }, amount: 1, currency: 'INR' }, auth());
  assert.equal(placed.body.success, true); assert.equal(placed.body.order.amount, 12900);
  const order = await orderModel.findOne(); assert.equal(order.orderTotal, 129); assert.equal(order.payment, false);
  assert.equal(await AnalyticsPayment.countDocuments(), 0); assert.equal(await AnalyticsEvent.countDocuments(), 0);
});

test('existing Stripe callback only attributes gateway-confirmed paid sessions', async () => {
  const retrieve = Sessions.prototype.retrieve;
  Sessions.prototype.retrieve = async id => ({ id, client_reference_id: String((await orderModel.findOne({ 'paymentDetails.stripeSessionId': id }))._id), payment_status: id === 'cs_paid' ? 'paid' : 'unpaid', amount_total: 19900, currency: 'inr', payment_intent: 'pi_local' });
  try {
  nock('https://api.resend.com').post('/emails').twice().reply(200, { id: 'local-email' });
  for (const paid of [false, true]) {
    const sessionId = `cs_${paid ? 'paid' : 'unpaid'}`;
    const order = await createOrder({ payment: false, paymentMethod: 'Stripe', paymentDetails: { stripeSessionId: sessionId } });
    const response = await fetch(`${base}/api/order/verifyStripe`, { method: 'POST', headers: { 'Content-Type': 'application/json', token: auth(), 'x-analytics-context': JSON.stringify(context()) }, body: JSON.stringify({ orderId: String(order._id), success: 'true', userId: String(user._id) }) });
    assert.equal((await response.json()).success, paid);
    assert.equal((await orderModel.findById(order._id)).payment, paid);
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(await AnalyticsEvent.countDocuments({ name: 'purchase' }), paid ? 1 : 0);
  }
  } finally { Sessions.prototype.retrieve = retrieve; }
});
