import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createAdminSearchRouter } from '../routes/adminSearchRoute.js';
import { searchAdminRecords } from '../services/adminSearchService.js';
import userModel from '../models/userModel.js';
import couponModel from '../models/couponModel.js';
import productModel from '../models/productModel.js';
import orderModel from '../models/orderModel.js';
import { findSearchPages } from '../../admin/src/search/pages.js';

// No dotenv or production server import: all records are in disposable local MongoDB.
process.env.JWT_SECRET = 'isolated-admin-search-test';
process.env.ADMIN_EMAIL = 'admin@search.test';
process.env.ADMIN_PASSWORD = 'local-only';
let database, server, base, user, restrictedStaff, couponStaff, noDashboardStaff, order, product;
const token = value => jwt.sign(String(value), process.env.JWT_SECRET);
const adminToken = () => token(process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD);
const request = async (q, auth = adminToken(), endpoint = '') => {
  const response = await fetch(`${base}${endpoint}?${q}`, { headers: auth ? { token: auth } : {} });
  return { status: response.status, data: await response.json(), headers: response.headers };
};

before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'admin-search-tests' });
  user = await userModel.create({ name: 'Amelia Rose', email: 'amelia@search.test', mobile: '9876543210', password: 'secret-hash', otp: 'private-otp', bankAccount: { accountNumber: 'private-account' } });
  restrictedStaff = await userModel.create({ email: 'limited@search.test', role: 'staff', permissions: ['/'] });
  couponStaff = await userModel.create({ email: 'coupon@search.test', role: 'staff', permissions: ['/', '/coupons'] });
  noDashboardStaff = await userModel.create({ email: 'no-dashboard@search.test', role: 'staff', permissions: ['/coupons'] });
  product = await productModel.create({ name: 'Rose Lace Set', description: 'Test', category: 'Lingerie', date: Date.now(), sizes: [], variations: [{ sku: 'ROSE-42' }] });
  order = await orderModel.create({ orderItemId: '12345678', userId: user._id, items: [], orderTotal: 250, paymentMethod: 'COD', date: Date.now(), address: { phone: 'private-order-phone' } });
  await couponModel.create({ code: 'ROSE20', description: 'Rose offer', discountType: 'percentage', discountValue: 20, expiryDate: new Date('2030-01-01') });
  await couponModel.create({ code: 'ROSE[VIP]', discountType: 'fixed', discountValue: 20, expiryDate: new Date('2020-01-01'), isActive: false });
  const app = express();
  app.use('/api/admin/search', createAdminSearchRouter());
  app.use('/api/admin/limited/search', createAdminSearchRouter({ requestsPerMinute: 1 }));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/admin`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
});

test('existing authentication and per-category permissions protect record search', async () => {
  assert.equal((await request('q=Rose', '', '/search')).status, 401);
  assert.equal((await request('q=Rose', token(user._id), '/search')).status, 401);
  assert.equal((await request('q=Rose', token(noDashboardStaff._id), '/search')).status, 403);
  assert.deepEqual((await request('q=Rose', token(restrictedStaff._id), '/search')).data.groups, []);
  const result = await request('q=Rose', token(couponStaff._id), '/search');
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.groups.map(group => group.type), ['Coupons']);
  assert.ok(result.data.groups[0].items.length);
});

test('finds real users, coupons, products and safe destinations without returning private documents', async () => {
  const result = await request('q=Rose', adminToken(), '/search');
  assert.equal(result.headers.get('cache-control'), 'no-store');
  const items = result.data.groups.flatMap(group => group.items);
  assert.equal(items.find(item => item.type === 'Users').href, '/allusers?search=amelia%40search.test');
  assert.ok(items.some(item => item.href === '/coupons?search=ROSE20'));
  assert.ok(items.some(item => item.href === `/list?search=${product._id}`));
  for (const item of items) assert.deepEqual(Object.keys(item).sort(), ['href', 'id', 'subtitle', 'title', 'type']);
  assert.doesNotMatch(JSON.stringify(result.data), /secret-hash|private-otp|private-account|private-order-phone/);
  const sku = await request('q=ROSE-42', adminToken(), '/search');
  assert.equal(sku.data.groups.find(group => group.type === 'Products').items[0].title, 'Rose Lace Set');
});

test('matches full, short legacy and customer-facing order references including a leading hash', async () => {
  for (const query of ['12345678', '#12345678', String(order._id), String(order._id).slice(-8).toUpperCase()]) {
    const result = await request(`q=${encodeURIComponent(query)}`, adminToken(), '/search');
    assert.equal(result.data.groups.find(group => group.type === 'Orders').items[0].href, `/orders?search=${order._id}`);
  }
});

test('literal regex characters, invalid payloads and result limits are handled safely', async () => {
  const literal = await request('q=ROSE%5BVIP%5D', adminToken(), '/search');
  assert.equal(literal.data.groups.find(group => group.type === 'Coupons').items[0].title, 'ROSE[VIP]');
  const regex = await request('q=.*', adminToken(), '/search');
  assert.equal(regex.data.groups.flatMap(group => group.items).length, 0);
  assert.equal((await request('q[$ne]=x', adminToken(), '/search')).status, 400);
  assert.equal((await request(`q=${'x'.repeat(81)}`, adminToken(), '/search')).status, 400);
  assert.equal((await request('q=%00x', adminToken(), '/search')).status, 400);
  assert.deepEqual((await request('q=a', adminToken(), '/search')).data.groups, []);
  await userModel.insertMany(Array.from({ length: 8 }, (_, i) => ({ name: 'Bounded Example', email: `bounded-${i}@search.test` })));
  const bounded = await request('q=Bounded', adminToken(), '/search');
  const group = bounded.data.groups.find(group => group.type === 'Users');
  assert.equal(group.items.length, 6); assert.equal(group.hasMore, true);
});

test('category outages are isolated and do not mutate existing records', async () => {
  const original = couponModel.find;
  couponModel.find = () => { throw new Error('Simulated collection outage'); };
  try {
    const result = await searchAdminRecords('Rose', { role: 'admin' });
    assert.deepEqual(result.unavailable, ['Coupons']);
    assert.ok(result.groups.find(group => group.type === 'Users').items.length);
  } finally { couponModel.find = original; }
  assert.equal((await orderModel.findById(order._id)).orderStatus, 'Order Placed');
  assert.equal((await userModel.findById(user._id)).password, 'secret-hash');
});

test('authenticated search has a bounded request rate', async () => {
  assert.equal((await request('q=Rose', adminToken(), '/limited/search')).status, 200);
  const limited = await request('q=Rose', adminToken(), '/limited/search');
  assert.equal(limited.status, 429); assert.ok(limited.headers.get('retry-after'));
});

test('page and setting aliases use existing permission keys', () => {
  assert.ok(findSearchPages('shipping charge', 'admin').some(page => page.href === '/configurations'));
  assert.ok(findSearchPages('font', 'admin').some(page => page.href === '/typography'));
  assert.ok(findSearchPages('instagram', 'staff', ['/cms']).some(page => page.href === '/socials-settings'));
  assert.deepEqual(findSearchPages('settings', 'staff', ['/']), []);
  assert.deepEqual(findSearchPages('coupons', 'staff', ['/']), []);
});
