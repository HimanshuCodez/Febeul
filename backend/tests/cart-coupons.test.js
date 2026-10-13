import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import userModel from '../models/userModel.js';
import productModel from '../models/productModel.js';
import couponModel from '../models/couponModel.js';
import orderModel from '../models/orderModel.js';
import cartRouter from '../routes/cartRoute.js';
import couponRouter from '../routes/couponRoute.js';
import { userToken } from '../utils/authTokens.js';
import { applyItemCoupons } from '../utils/itemCoupons.js';

// Disposable database and intercepted payments only. Do not load dotenv/server.js.
Object.assign(process.env, {
  JWT_SECRET: 'local-cart-coupon-tests-only', STRIPE_SECRET_KEY: 'sk_test_local',
  RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_KEY_SECRET: 'local-test-secret', RESEND_API_KEY: 're_local', ANALYTICS_ENABLED: 'false',
});
const { default: orderRouter } = await import('../routes/orderRoute.js');
let database, server, base, user, token, product;
async function request(path, body) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', token }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json() };
}
const item = (extra = {}) => ({ itemId: String(product._id), size: 'M', color: 'Rose', ...extra });
const add = (code, extra = {}) => request('/cart/add', item({ appliedCoupon: code, discountAmount: 999, ...extra }));
const quantity = count => request('/cart/update', item({ quantity: count }));
const cart = async () => (await request('/cart/get')).data.cartItems;
before(async () => {
  nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'cart-coupon-tests' });
  const app = express(); app.use(express.json()); app.use('/cart', cartRouter); app.use('/coupon', couponRouter); app.use('/order', orderRouter);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  nock.cleanAll();
  await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
  user = await userModel.create({ email: 'buyer@cart.test' }); token = userToken(user);
  product = await productModel.create({ name: 'Five rupee product', description: 'Local test', category: 'Test', date: Date.now(), variations: [
    { color: 'Rose', sku: 'ROSE', images: ['test.png'], sizes: [{ size: 'M', price: 5, mrp: 10, stock: 99 }] },
    { color: 'Black', sku: 'BLACK', images: ['test.png'], sizes: [{ size: 'M', price: 5, mrp: 10, stock: 99 }] },
  ] });
  await couponModel.create([
    { code: 'FIXED1', discountType: 'fixed', discountValue: 1, isLifetime: true },
    { code: 'PERCENT20', discountType: 'percentage', discountValue: 20, isLifetime: true },
  ]);
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); if (database) await database.stop(); nock.cleanAll(); nock.enableNetConnect();
});

test('a fixed rupee is subtracted once from the quantity subtotal; supplied discounts are ignored', async () => {
  assert.equal((await add('FIXED1')).data.success, true);
  for (const count of [1, 2, 3, 1]) {
    assert.equal((await quantity(count)).data.success, true);
    const [line] = await cart();
    assert.equal(line.quantity, count); assert.equal(line.discountAmount, 1);
    assert.equal(line.price * line.quantity - line.discountAmount, 5 * count - 1);
  }
  assert.equal((await userModel.findById(user._id)).cartData[0].discountAmount, 0);
  await add('FIXED1');
  const [line] = await cart(); assert.equal(line.quantity, 2); assert.equal(line.discountAmount, 1);
});

test('percentage savings follow the full quantity and current catalogue price', async () => {
  await add('PERCENT20');
  for (const count of [1, 2, 3, 2]) {
    await quantity(count); const [line] = await cart();
    assert.equal(line.discountAmount, count); assert.equal(line.price * count - line.discountAmount, 4 * count);
  }
  await productModel.updateOne({ _id: product._id }, { $set: { 'variations.0.sizes.0.price': 6 } });
  const [changed] = await cart(); assert.equal(changed.price, 6); assert.equal(changed.discountAmount, 2.4);
});

test('one fixed code shared by variants is applied once, and reallocated on removal', async () => {
  await add('FIXED1'); await add('FIXED1', { color: 'Black' });
  let lines = await cart();
  assert.deepEqual(lines.map(line => line.discountAmount), [0.5, 0.5]);
  await quantity(3); lines = await cart();
  assert.deepEqual(lines.map(line => line.discountAmount), [0.75, 0.25]);
  await request('/cart/remove', item({ color: 'Black' }));
  lines = await cart(); assert.equal(lines[0].discountAmount, 1);
});

test('quantity changes recheck minimums and restore eligible saved codes without spending a use', async () => {
  await couponModel.updateOne({ code: 'PERCENT20' }, { $set: { minQuantity: 2, minOrderAmount: 10 } });
  await add('PERCENT20');
  for (const count of [1, 3, 1, 2]) {
    await quantity(count); const [line] = await cart();
    assert.equal(line.discountAmount, count >= 2 ? count : 0);
    assert.equal(line.appliedCoupon, count >= 2 ? 'PERCENT20' : null);
    if (count === 1) assert.match(line.couponMessage, /minimum/);
  }
  assert.equal((await couponModel.findOne({ code: 'PERCENT20' })).usageCount, 0);
});

test('expired, exhausted, private, paused and mismatched coupons never retain stale discounts', async () => {
  await add('FIXED1');
  for (const restriction of [
    { isActive: false }, { isLifetime: false, expiryDate: new Date(0) },
    { usageLimit: 1, usageCount: 1 }, { usersWhoUsed: [{ userId: user._id }] },
    { specificUsers: ['other@cart.test'] }, { applicableSKUs: ['BLACK'] },
  ]) {
    await couponModel.updateOne({ code: 'FIXED1' }, { $set: { isActive: true, isLifetime: true, expiryDate: null, usageLimit: null, usageCount: 0, usersWhoUsed: [], specificUsers: [], applicableSKUs: [], ...restriction } });
    const [line] = await cart(); assert.equal(line.discountAmount, 0); assert.equal(line.appliedCoupon, null); assert.ok(line.couponMessage);
  }
});

test('large fixed discounts stay capped at the subtotal and allocation never makes a line negative', async () => {
  await couponModel.updateOne({ code: 'FIXED1' }, { $set: { discountValue: 10 } });
  await add('FIXED1');
  assert.equal((await cart())[0].discountAmount, 5);
  await quantity(3); assert.equal((await cart())[0].discountAmount, 10);
  await couponModel.updateOne({ code: 'FIXED1' }, { $set: { discountValue: 0.5 } });
  const tinyLines = Array.from({ length: 99 }, () => ({ price: 0.01, quantity: 1, appliedCoupon: 'FIXED1' }));
  const result = await applyItemCoupons(tinyLines, user, 'Razorpay');
  assert.equal(result.totalDiscount, 0.5);
  assert.equal(tinyLines.reduce((sum, line) => sum + Math.round(line.discountAmount * 100), 0), 50);
  assert.ok(tinyLines.every(line => line.discountAmount >= 0 && line.discountAmount <= 0.01));
});

test('product coupon preview uses the entire quantity and rejects invalid quantities', async () => {
  const productItem = { sku: 'ROSE', price: 5, quantity: 3 };
  const percent = await request('/coupon/apply-product-coupon', { code: 'PERCENT20', productItem });
  assert.equal(percent.data.discountAmount, 3);
  const fixed = await request('/coupon/apply-product-coupon', { code: 'FIXED1', productItem });
  assert.equal(fixed.data.discountAmount, 1);
  for (const count of [0, -1, 1.5, 100, '3']) assert.equal((await request('/coupon/apply-product-coupon', { code: 'FIXED1', productItem: { ...productItem, quantity: count } })).status, 400);
});

test('checkout charges the same product subtotal and discount as the cart after quantity changes', async () => {
  for (const [code, expectedDiscount] of [['FIXED1', 1], ['PERCENT20', 3]]) {
    await add(code); await quantity(3);
    const [line] = await cart();
    const gateway = nock('https://api.razorpay.com').post('/v1/orders', body => body.amount === (15 - expectedDiscount + 50) * 100).reply(200, { id: `order_${code}`, status: 'created' });
    const placed = await request('/order/razorpay', { items: [{ productId: String(product._id), size: 'M', color: 'Rose', quantity: 3, appliedCoupon: code, price: 0.01, discountAmount: 999 }], address: { state: 'Delhi' } });
    assert.equal(placed.data.success, true); assert.ok(gateway.isDone());
    const order = await orderModel.findOne({ 'paymentDetails.razorpay_order_id': `order_${code}` });
    assert.equal(order.productAmount, 15); assert.equal(order.couponDiscount, expectedDiscount);
    assert.equal(order.items[0].discountAmount, line.discountAmount);
    assert.equal(order.orderTotal - order.shippingCharge, line.price * line.quantity - line.discountAmount);
  }
});
