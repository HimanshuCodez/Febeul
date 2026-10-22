import { adminTokenFor } from './helpers/auth.js';
import { userToken } from '../utils/authTokens.js';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import cmsRouter from '../routes/cmsRoute.js';
import cmsModel from '../models/cmsModel.js';
import couponModel from '../models/couponModel.js';
import userModel from '../models/userModel.js';
import { DEFAULT_HOME_GIFT_OFFER, getGiftDiscountLabel, validateHomeGiftOffer } from '../../shared/homeGiftOffer.js';
import { findSearchPages } from '../../admin/src/search/pages.js';

// Isolated local fixtures only. Do not import dotenv or the production server.
process.env.JWT_SECRET = 'local-gift-offer-tests';
process.env.ADMIN_EMAIL = 'admin@gift.test';
process.env.ADMIN_PASSWORD = 'local-only';
let database, server, base, editor, restricted, customer, coupon;
const token = value => adminTokenFor(value);
const adminToken = () => token(process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD);
const content = () => ({ ...DEFAULT_HOME_GIFT_OFFER, enabled: true, couponCode: 'WELCOME20' });
async function request(path, { auth, body } = {}) {
  const res = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { ...(auth ? { token: auth } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, data: await res.json(), headers: res.headers };
}
const save = (settings, auth = adminToken()) => request('', { auth, body: { name: 'homeGiftOffer', content: settings } });

before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'gift-offer-tests' });
  editor = await userModel.create({ email: 'editor@gift.test', role: 'staff', permissions: ['/cms'] });
  restricted = await userModel.create({ email: 'limited@gift.test', role: 'staff', permissions: ['/coupons'] });
  customer = await userModel.create({ email: 'customer@gift.test' });
  coupon = await couponModel.create({ code: 'WELCOME20', discountType: 'percentage', discountValue: 20, expiryDate: new Date(Date.now() + 86400000) });
  const app = express();
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/cms', cmsRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/cms`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
});

test('unconfigured offer is disabled and no coupon is invented', async () => {
  const result = await request('/homeGiftOffer');
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.content, DEFAULT_HOME_GIFT_OFFER);
  assert.equal(await cmsModel.countDocuments(), 0);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('existing admin and CMS staff authorization protects editing and draft reads', async () => {
  for (const [auth, status] of [[undefined, 401], [token(customer._id), 401], [token(restricted._id), 403]]) {
    assert.equal((await request('/admin/homeGiftOffer', { auth })).status, status);
    assert.equal((await save(content(), auth || '')).status, status);
  }
  assert.equal((await save(content(), token(editor._id))).status, 201);
  const result = await request('/admin/homeGiftOffer', { auth: token(editor._id) });
  assert.equal(result.data.content.couponCode, 'WELCOME20');
  assert.equal(findSearchPages('gift offer', 'staff', ['/cms'])[0].href, '/home-gift-offer');
  assert.equal(findSearchPages('gift offer', 'staff', ['/coupons']).length, 0);
});

test('text and colors round trip with a strict allowlist and no coupon mutation', async () => {
  const settings = { ...content(), title: 'A gift for you', backgroundColor: '#F9AEAF', couponCode: ' welcome20 ', extraField: 'not stored' };
  const saved = await save(settings);
  assert.equal(saved.status, 201);
  assert.equal(saved.data.content.backgroundColor, '#f9aeaf');
  assert.equal(saved.data.content.couponCode, 'WELCOME20');
  assert.equal(saved.data.content.extraField, undefined);
  assert.deepEqual((await request('/homeGiftOffer')).data.content, saved.data.content);
  assert.equal((await couponModel.findById(coupon._id)).usageCount, 0);
  assert.equal(await couponModel.countDocuments(), 1);
});

test('rejects malformed configuration, CSS values, missing or oversized text', async () => {
  for (const settings of [null, { ...content(), enabled: 'true' }, { ...content(), couponCode: '' }, { ...content(), title: ' ' }, { ...content(), title: 'x'.repeat(81) }, { ...content(), backgroundColor: 'url(https://example.test)' }, { ...content(), title: 'hello\u0000world' }]) {
    assert.throws(() => validateHomeGiftOffer(settings));
    assert.equal((await save(settings)).status, 400);
  }
});

test('only available public coupons may be promoted; private and Luxe codes are excluded', async () => {
  assert.equal((await save({ ...content(), couponCode: 'DOESNOTEXIST' })).status, 400);
  const variants = [{ isActive: false }, { expiryDate: new Date(0) }, { userType: 'luxe' }, { userType: 'membership' }, { specificUsers: ['private@example.test'] }, { usageLimit: 1, usageCount: 1 }];
  for (const variant of variants) {
    await couponModel.findByIdAndUpdate(coupon._id, { isActive: true, expiryDate: new Date(Date.now() + 86400000), userType: 'normal', specificUsers: [], usageLimit: null, usageCount: 0, ...variant });
    assert.equal((await save(content())).status, 400);
    const result = await request('/homeGiftOffer');
    assert.equal(result.data.content.enabled, false);
    assert.equal(result.data.content.couponCode, '');
    assert.equal((await request('/admin/homeGiftOffer', { auth: adminToken() })).data.content.couponCode, 'WELCOME20');
  }
});

test('disabled drafts remain editable and other CMS responses retain their format', async () => {
  assert.equal((await save({ ...content(), enabled: false, badgeOffer: '' })).status, 201);
  assert.equal((await request('/homeGiftOffer')).data.content.couponCode, '');
  const other = await request('', { auth: adminToken(), body: { name: 'existingTestContent', content: { heading: 'Unchanged' } } });
  assert.equal(other.status, 201);
  assert.deepEqual(other.data.content, { heading: 'Unchanged' });
  assert.deepEqual((await request('/existingTestContent')).data.content, { heading: 'Unchanged' });
});

test('public lifetime coupons can be promoted without bypassing privacy or usage limits', async () => {
  await couponModel.findByIdAndUpdate(coupon._id, {
    isActive: true, isLifetime: true, expiryDate: null, userType: 'normal', specificUsers: [], usageLimit: null, usageCount: 0,
  });
  assert.equal((await save(content())).status, 201);
  assert.equal((await request('/homeGiftOffer')).data.content.enabled, true);
  for (const restriction of [{ specificUsers: ['private@example.test'] }, { usageLimit: 1, usageCount: 1 }]) {
    await couponModel.findByIdAndUpdate(coupon._id, { specificUsers: [], usageLimit: null, usageCount: 0, ...restriction });
    assert.equal((await request('/homeGiftOffer')).data.content.enabled, false);
  }
});

test('CMS coupon dropdown includes every active coupon with discounts and eligibility, without customer data', async () => {
  await couponModel.findByIdAndUpdate(coupon._id, { isActive: true, isLifetime: true, expiryDate: null, usageLimit: null, usageCount: 0, specificUsers: [], userType: 'normal' });
  const baseCoupon = { discountType: 'fixed', discountValue: 500, isLifetime: true };
  await couponModel.create([
    { ...baseCoupon, code: 'FLAT500' },
    { ...baseCoupon, code: 'PRIVATE500', specificUsers: ['private-customer@example.test'] },
    { ...baseCoupon, code: 'LUXE500', userType: 'luxe' },
    { ...baseCoupon, code: 'MEMBER500', userType: 'membership' },
    { ...baseCoupon, code: 'PAUSED500', isActive: false },
    { ...baseCoupon, code: 'EXPIRED500', isLifetime: false, expiryDate: new Date(0) },
    { ...baseCoupon, code: 'USED500', usageLimit: 1, usageCount: 1 },
  ]);
  const result = await request('/admin/homeGiftOffer', { auth: token(editor._id) });
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.coupons.map(item => item.code), ['FLAT500', 'LUXE500', 'MEMBER500', 'PRIVATE500', 'WELCOME20']);
  assert.equal(result.data.coupons.find(item => item.code === 'FLAT500').discountValue, 500);
  assert.equal(result.data.coupons.find(item => item.code === 'WELCOME20').discountType, 'percentage');
  assert.equal(result.data.coupons.find(item => item.code === 'FLAT500').eligibleForGift, true);
  for (const code of ['LUXE500', 'MEMBER500', 'PRIVATE500']) {
    const item = result.data.coupons.find(item => item.code === code);
    assert.equal(item.eligibleForGift, false);
    assert.ok(item.restriction);
  }
  assert.ok(!JSON.stringify(result.data).includes('private-customer@example.test'));
  assert.ok(result.data.coupons.every(item => !('specificUsers' in item) && !('usersWhoUsed' in item)));
});

test('discounts come from Coupons on save and every read, including fixed amounts and existing CMS records', async () => {
  const saved = await save({ ...content(), badgeOffer: '99% OFF' });
  assert.equal(saved.status, 201);
  assert.equal(saved.data.content.badgeOffer, '20% OFF');
  await couponModel.findByIdAndUpdate(coupon._id, { discountType: 'percentage', discountValue: 12.5 });
  assert.equal((await request('/homeGiftOffer')).data.content.badgeOffer, '12.5% OFF');
  await couponModel.findByIdAndUpdate(coupon._id, { discountType: 'fixed', discountValue: 1250.5 });
  const publicOffer = (await request('/homeGiftOffer')).data.content;
  assert.equal(publicOffer.badgeOffer, '₹1,250.5 OFF');
  assert.equal(getGiftDiscountLabel(publicOffer.badgeOffer), '₹1,250.5 OFF');
  assert.equal(getGiftDiscountLabel('20%'), '20% OFF');
  assert.equal(getGiftDiscountLabel('YOUR'), '');
  assert.equal((await request('/admin/homeGiftOffer', { auth: adminToken() })).data.content.badgeOffer, '₹1,250.5 OFF');
  assert.equal((await cmsModel.findOne({ name: 'homeGiftOffer' })).content.badgeOffer, '20% OFF');
  assert.equal((await couponModel.findById(coupon._id)).usageCount, 0);
  assert.equal((await save({ ...content(), couponCode: 'FLAT500', badgeOffer: '' })).data.content.badgeOffer, '₹500 OFF');
});

test('deactivating the selected coupon removes the public discount and preserves an editable selection', async () => {
  await couponModel.updateOne({ code: 'FLAT500' }, { isActive: false });
  const publicOffer = (await request('/homeGiftOffer')).data.content;
  assert.equal(publicOffer.enabled, false);
  assert.equal(publicOffer.badgeOffer, '');
  assert.equal(publicOffer.couponCode, '');
  const adminOffer = await request('/admin/homeGiftOffer', { auth: adminToken() });
  assert.equal(adminOffer.data.content.couponCode, 'FLAT500');
  assert.ok(!adminOffer.data.coupons.some(item => item.code === 'FLAT500'));
  assert.equal((await save({ ...content(), couponCode: 'FLAT500' })).status, 400);
});
