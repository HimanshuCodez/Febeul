import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import couponRouter from '../routes/couponRoute.js';
import couponModel from '../models/couponModel.js';
import userModel from '../models/userModel.js';

// Disposable local database only; never load dotenv or the production server.
process.env.JWT_SECRET = 'local-coupon-sku-tests';
process.env.ADMIN_EMAIL = 'admin@coupon.test';
process.env.ADMIN_PASSWORD = 'local-only';
let database, server, base, customer, customerToken, coupon;
const adminToken = () => jwt.sign(process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD, process.env.JWT_SECRET);
async function request(path, body, token = customerToken) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', token }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'coupon-sku-tests' });
  customer = await userModel.create({ email: 'shopper@coupon.test' });
  customerToken = jwt.sign({ id: String(customer._id) }, process.env.JWT_SECRET);
  const app = express();
  app.use(express.json()); app.use('/api/coupon', couponRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/coupon`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
});

test('admin creation and editing preserve the exact SKU list without expanding to sibling variations', async () => {
  const result = await request('/add', { code: 'ROSE20', discountType: 'percentage', discountValue: 20, expiryDate: '2099-12-31', applicableSKUs: ['STYLE-ROSE'] }, adminToken());
  assert.equal(result.status, 200); assert.equal(result.data.success, true);
  coupon = result.data.coupon;
  assert.deepEqual(coupon.applicableSKUs, ['STYLE-ROSE']);
  const updated = await request('/update', { id: coupon._id, description: 'Only the rose variation' }, adminToken());
  assert.deepEqual(updated.data.coupon.applicableSKUs, ['STYLE-ROSE']);
});

test('product validation accepts the configured SKU and rejects its sibling', async () => {
  for (const [sku, status] of [['STYLE-ROSE', 200], ['STYLE-BLACK', 400]]) {
    const result = await request('/apply-product-coupon', { code: 'ROSE20', productItem: { sku, price: 500, quantity: 1 }, userId: String(customer._id) });
    assert.equal(result.status, status);
    assert.equal(result.data.success, status === 200);
    if (status === 200) assert.equal(result.data.discountAmount, 100);
  }
});

test('cart coupons discount only matching lines; unrestricted coupons still cover all lines', async () => {
  const items = [{ sku: 'STYLE-ROSE', price: 500, quantity: 2 }, { sku: 'STYLE-BLACK', price: 800, quantity: 1 }];
  const result = await request('/apply', { code: 'ROSE20', items, userId: String(customer._id) });
  assert.equal(result.data.discountAmount, 200);
  assert.equal((await request('/apply', { code: 'ROSE20', items: [items[1]], userId: String(customer._id) })).status, 400);
  await couponModel.create({ code: 'ANY20', discountType: 'percentage', discountValue: 20, expiryDate: '2099-12-31' });
  const unrestricted = await request('/apply', { code: 'ANY20', items, userId: String(customer._id) });
  assert.equal(unrestricted.data.discountAmount, 360);
  assert.equal((await couponModel.findById(coupon._id)).usageCount, 0);
});
