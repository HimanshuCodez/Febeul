import { adminTokenFor } from './helpers/auth.js';
import { userToken } from '../utils/authTokens.js';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import couponRouter from '../routes/couponRoute.js';
import couponModel from '../models/couponModel.js';
import userModel from '../models/userModel.js';
import { couponDiscountFor } from '../utils/checkoutSecurity.js';
import { isCouponExpired } from '../../shared/couponValidity.js';

// Disposable local database only; never load dotenv or the production server.
process.env.JWT_SECRET = 'local-coupon-sku-tests';
process.env.ADMIN_EMAIL = 'admin@coupon.test';
process.env.ADMIN_PASSWORD = 'local-only';
let database, server, base, customer, customerToken, coupon;
const adminToken = () => adminTokenFor(process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD);
async function request(path, body, token = customerToken) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', token }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'coupon-sku-tests' });
  customer = await userModel.create({ email: 'shopper@coupon.test' });
  customerToken = userToken(customer);
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

test('membership purchase coupons are listed only for the membership page', async t => {
  const saved = await request('/add', { code: 'JOIN30', userType: 'membership', discountType: 'fixed', discountValue: 30, expiryDate: '2099-12-31' }, adminToken());
  assert.equal(saved.data.success, true);
  const fields = { discountType: 'fixed', discountValue: 20, expiryDate: '2099-12-31', userType: 'membership' };
  await couponModel.create([
    { ...fields, code: 'LUXESHOP', userType: 'luxe' },
    { ...fields, code: 'JOINPRIVATE', specificUsers: [customer.email] },
    { ...fields, code: 'JOINOTHER', specificUsers: ['someone-else@example.test'] },
    { ...fields, code: 'JOINUSED', usersWhoUsed: [{ userId: customer._id }], usageLimitPerUser: 1 },
    { ...fields, code: 'JOINEXHAUSTED', usageLimit: 1, usageCount: 1 },
    { ...fields, code: 'JOINEXPIRED', expiryDate: '2000-01-01' },
    { ...fields, code: 'JOININACTIVE', isActive: false },
  ]);
  const getCodes = async (path, token) => {
    const response = await fetch(base + path, { headers: token ? { token } : {} });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.success, true);
    return data.coupons.map(c => c.code).sort();
  };

  await t.test('ordinary coupon lists exclude membership offers while admin retains them', async () => {
    assert.deepEqual(await getCodes('/active'), ['ANY20', 'LUXESHOP', 'ROSE20']);
    assert.deepEqual(await getCodes('/all', customerToken), ['ANY20', 'ROSE20']);
    await userModel.findByIdAndUpdate(customer._id, { isLuxeMember: true });
    assert.deepEqual(await getCodes('/all', customerToken), ['ANY20', 'LUXESHOP', 'ROSE20']);
    await userModel.findByIdAndUpdate(customer._id, { isLuxeMember: false });
    assert.ok((await getCodes('/list', adminToken())).includes('JOIN30'));
  });

  await t.test('membership lists preserve audience, expiry and usage restrictions', async () => {
    assert.deepEqual(await getCodes('/active?purpose=membership'), ['JOIN30', 'JOINUSED']);
    assert.deepEqual(await getCodes('/all?purpose=membership', customerToken), ['JOIN30', 'JOINPRIVATE']);
  });

  await t.test('non-members can apply membership offers only to the membership purchase', async () => {
    const membership = await request('/apply-product-coupon', { code: 'JOIN30', productItem: { sku: 'LUXE-MEMBERSHIP', price: 129, quantity: 1 }, userId: String(customer._id) });
    assert.equal(membership.status, 200);
    assert.equal(membership.data.discountAmount, 30);
    const product = await request('/apply-product-coupon', { code: 'JOIN30', productItem: { sku: 'STYLE-ROSE', price: 500, quantity: 1 }, userId: String(customer._id) });
    assert.equal(product.status, 400);
    assert.equal(product.data.message, 'This coupon is valid for Luxe membership only.');
    const cart = await request('/apply', { code: 'JOIN30', items: [{ sku: 'STYLE-ROSE', price: 500, quantity: 1 }], userId: String(customer._id) });
    assert.equal(cart.status, 400);
    assert.equal(cart.data.success, false);
    assert.equal(cart.data.message, 'This coupon is valid for Luxe membership only.');
    assert.equal(cart.data.discountAmount, undefined);
  });

  await t.test('checkout rejects membership coupons for members, non-members, mixed carts and misleading item names', async () => {
    const membership = { sku: 'LUXE-MEMBERSHIP', price: 129, quantity: 1 };
    const product = { sku: 'STYLE-ROSE', price: 500, quantity: 1 };
    const savedCoupon = await couponModel.findOne({ code: 'JOIN30' });
    try {
      for (const isLuxeMember of [false, true]) {
        const shopper = await userModel.findByIdAndUpdate(customer._id, { isLuxeMember, luxeMembershipExpires: '2099-12-31' }, { new: true });
        for (const items of [[product], [membership, product], [{ ...product, name: 'Febeul Luxe Membership' }]]) {
          const result = await request('/apply', { code: 'join30', items, paymentMethod: 'card' });
          assert.equal(result.status, 400);
          assert.deepEqual(result.data, { success: false, message: 'This coupon is valid for Luxe membership only.' });
          assert.throws(() => couponDiscountFor(savedCoupon, items, shopper, 'Razorpay'), { message: result.data.message });
        }
        // Membership purchases still receive the discount, including for new members.
        assert.equal(couponDiscountFor(savedCoupon, [membership], shopper, 'Razorpay'), 30);
        // Discounts for existing Luxe members are a separate, valid product offer.
        const luxeOffer = await request('/apply', { code: 'LUXESHOP', items: [product] });
        assert.equal(luxeOffer.status, isLuxeMember ? 200 : 403);
        if (isLuxeMember) assert.equal(luxeOffer.data.discountAmount, 20);
      }
    } finally {
      await userModel.findByIdAndUpdate(customer._id, { isLuxeMember: false });
    }
    assert.equal((await couponModel.findOne({ code: 'JOIN30' })).usageCount, 0);
  });

  await t.test('membership restriction takes priority over payment restrictions at product checkout', async () => {
    const created = await request('/add', { code: 'JOINPREPAID', userType: 'membership', offerType: 'prepaid', discountType: 'fixed', discountValue: 30, isLifetime: true }, adminToken());
    assert.equal(created.data.success, true);
    const items = [{ sku: 'STYLE-ROSE', price: 500, quantity: 1 }];
    for (const paymentMethod of [undefined, 'card', 'cod']) {
      const result = await request('/apply', { code: 'JOINPREPAID', items, paymentMethod });
      assert.equal(result.status, 400);
      assert.equal(result.data.message, 'This coupon is valid for Luxe membership only.');
    }
    assert.throws(() => couponDiscountFor(created.data.coupon, items, customer, 'COD'), {
      message: 'This coupon is valid for Luxe membership only.',
    });
  });
});

test('lifetime validity is explicit, editable, and enforced consistently', async t => {
  const fields = { discountType: 'percentage', discountValue: 10, usageLimitPerUser: 1 };
  let lifetime;
  await t.test('create without an expiry, persist it, and expose it in eligible lists', async () => {
    const result = await request('/add', { ...fields, code: 'FOREVER10', isLifetime: true, expiryDate: '2000-01-01' }, adminToken());
    assert.equal(result.status, 200);
    lifetime = result.data.coupon;
    assert.equal(lifetime.isLifetime, true);
    assert.equal(lifetime.expiryDate, null);
    const stored = await couponModel.findById(lifetime._id);
    assert.equal(stored.isLifetime, true);
    assert.equal(stored.expiryDate, null);
    for (const path of ['/active', '/all']) {
      const response = await fetch(base + path, { headers: { token: customerToken } });
      const data = await response.json();
      assert.ok(data.coupons.some(c => c.code === 'FOREVER10'));
    }
  });
  await t.test('redeem through cart, product, and authoritative checkout pricing', async () => {
    const items = [{ sku: 'STYLE-ROSE', price: 500, quantity: 1 }];
    const cart = await request('/apply', { code: 'FOREVER10', items });
    assert.equal(cart.status, 200); assert.equal(cart.data.discountAmount, 50);
    const product = await request('/apply-product-coupon', { code: 'FOREVER10', productItem: items[0] });
    assert.equal(product.status, 200); assert.equal(product.data.discountAmount, 50);
    assert.equal(couponDiscountFor(lifetime, items, customer, 'Razorpay'), 50);
    assert.equal(isCouponExpired(lifetime, new Date('2199-01-01')), false);
  });
  await t.test('lifetime does not bypass status, usage, audience, SKU, or minimum restrictions', async () => {
    const items = [{ sku: 'STYLE-ROSE', price: 500, quantity: 1 }];
    for (const restriction of [
      { isActive: false }, { usageLimit: 1, usageCount: 1 },
      { usersWhoUsed: [{ userId: customer._id }], usageLimitPerUser: 1 },
      { userType: 'luxe' }, { userType: 'membership' },
      { specificUsers: ['another@example.test'] }, { applicableSKUs: ['OTHER'] },
      { minOrderAmount: 1000 }, { minQuantity: 2 }, { offerType: 'cod' },
    ]) assert.throws(() => couponDiscountFor({ ...lifetime, ...restriction }, items, customer, 'Razorpay'));
    await couponModel.findByIdAndUpdate(lifetime._id, { usageLimit: 1, usageCount: 1 });
    assert.equal((await request('/apply', { code: 'FOREVER10', items })).status, 400);
    const list = await (await fetch(base + '/active')).json();
    assert.ok(!list.coupons.some(c => c.code === 'FOREVER10'));
    await couponModel.findByIdAndUpdate(lifetime._id, { usageLimit: null, usageCount: 0 });
  });
  await t.test('partial edits preserve lifetime; converting to dated requires a valid date', async () => {
    const partial = await request('/update', { id: lifetime._id, description: 'Still no expiry' }, adminToken());
    assert.equal(partial.data.coupon.isLifetime, true);
    assert.equal(partial.data.coupon.expiryDate, null);
    for (const expiryDate of [undefined, null, '', 'bad-date', '2099-02-30']) {
      const invalid = await request('/update', { id: lifetime._id, isLifetime: false, expiryDate }, adminToken());
      assert.equal(invalid.status, 400);
      assert.equal((await couponModel.findById(lifetime._id)).isLifetime, true);
    }
    const dated = await request('/update', { id: lifetime._id, isLifetime: false, expiryDate: '2099-12-31' }, adminToken());
    assert.equal(dated.data.coupon.isLifetime, false);
    assert.equal(dated.data.coupon.expiryDate, '2099-12-31T23:59:59.999Z');
    const forever = await request('/update', { id: lifetime._id, isLifetime: true }, adminToken());
    assert.equal(forever.data.coupon.expiryDate, null);
  });
  await t.test('missing expiry and malformed lifetime flags fail closed', async () => {
    for (const extra of [{}, { expiryDate: null }, { expiryDate: 'invalid' }, { isLifetime: 'true' }, { isLifetime: null }]) {
      const result = await request('/add', { ...fields, code: 'INVALIDWINDOW', ...extra }, adminToken());
      assert.equal(result.status, 400);
    }
    for (const expiryDate of [null, undefined, 'invalid', '2000-01-01']) {
      assert.equal(isCouponExpired({ expiryDate }), true);
      assert.throws(() => couponDiscountFor({ ...lifetime, isLifetime: false, expiryDate }, [{ sku: 'STYLE-ROSE', price: 500, quantity: 1 }], customer, 'Razorpay'));
    }
  });
  await t.test('legacy dated coupons still expire and lifetime membership offers remain isolated', async () => {
    const legacy = await request('/add', { ...fields, code: 'OLDWINDOW', expiryDate: '2000-01-01' }, adminToken());
    assert.equal(legacy.data.coupon.isLifetime, false);
    assert.equal((await request('/apply', { code: 'OLDWINDOW', items: [{ sku: 'STYLE-ROSE', price: 500, quantity: 1 }] })).status, 400);
    await request('/add', { ...fields, code: 'LIFETIMEJOIN', isLifetime: true, userType: 'membership' }, adminToken());
    for (const path of ['/active', '/all']) {
      const regular = await (await fetch(base + path, { headers: { token: customerToken } })).json();
      assert.ok(!regular.coupons.some(c => ['LIFETIMEJOIN', 'OLDWINDOW'].includes(c.code)));
      const membership = await (await fetch(base + path + '?purpose=membership', { headers: { token: customerToken } })).json();
      assert.ok(membership.coupons.some(c => c.code === 'LIFETIMEJOIN'));
    }
  });
});
