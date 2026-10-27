import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createHmac } from 'node:crypto';
import { access } from 'node:fs/promises';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';
import couponModel from '../models/couponModel.js';
import cmsModel from '../models/cmsModel.js';
import giftWrapModel from '../models/giftWrapModel.js';
import { ticketModel } from '../models/ticketModel.js';
import { userToken, envToken, envAccounts, signToken, verifyToken } from '../utils/authTokens.js';
import { issueOtp, checkOtp } from '../utils/otp.js';
import { installSecurity, rejectUnsafeInput, authRateLimit, authInput } from '../middleware/security.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';
import errorHandler from '../middleware/errorHandler.js';
import { Sessions } from '../node_modules/stripe/esm/resources/Checkout/Sessions.js';

// Never load dotenv or server.js. All data and gateway calls are disposable/local.
Object.assign(process.env, {
    JWT_SECRET: 'security-test-secret-only-with-32-bytes', ADMIN_EMAIL: 'admin@security.test', ADMIN_PASSWORD: 'test-only-password',
    STAFF_EMAIL: 'staff@security.test', STAFF_PASSWORD: 'test-only-staff', STAFF_PERMISSIONS: '',
    STRIPE_SECRET_KEY: 'sk_test_local', RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_KEY_SECRET: 'local-secret',
    RESEND_API_KEY: 're_local', CORS_ORIGINS: 'https://shop.security.test', NODE_ENV: 'test', ANALYTICS_ENABLED: 'false',
});
const users = await import('../controllers/userController.js');
const otps = await import('../controllers/otpController.js');
const orders = await import('../controllers/orderController.js');
const { getTicketById } = await import('../controllers/ticketController.js');
const { default: couponRouter } = await import('../routes/couponRoute.js');
const { processPrepaidRefund } = await import('../controllers/refundController.js');
const { default: cmsRouter } = await import('../routes/cmsRoute.js');
let database, server, base, customer, other, admin, staff;
const oldRetrieve = Sessions.prototype.retrieve;
const request = async (path, body, token, headers = {}) => {
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { token } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, headers: response.headers, data: await response.json() };
};
const makeOrder = (extra = {}) => orderModel.create({ userId: customer._id, items: [{ productId: new mongoose.Types.ObjectId(), name: 'Febeul Luxe Membership', quantity: 1, price: 129, image: 'test.png' }], orderTotal: 129, paymentMethod: 'Stripe', date: Date.now(), address: { state: 'Delhi' }, paymentDetails: { stripeSessionId: 'cs_test' }, ...extra });
before(async () => {
    nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
    database = await MongoMemoryServer.create();
    await mongoose.connect(database.getUri(), { dbName: 'security-tests' });
    const app = express(); installSecurity(app); app.use(express.json({ limit: '100kb' })); app.use(rejectUnsafeInput);
    app.post('/login', authInput, users.loginUser);
    app.post('/admin-login', authInput, users.adminLogin);
    app.post('/register', authInput, users.registerUser);
    app.post('/forgot', authInput, users.forgotPassword);
    app.post('/reset', authInput, users.resetPassword);
    app.post('/verify-reset', authInput, users.verifyPasswordOtp);
    app.post('/admin-otp', authInput, users.adminOtpLogin);
    app.post('/signup-otp', authInput, otps.verifyEmailOTP);
    app.post('/login-otp', authInput, otps.verifyEmailLoginOtp);
    app.post('/send-email', authInput, otps.sendEmailOTP);
    app.post('/limited/send', authInput, authRateLimit, (_req, res) => res.json({ success: true }));
    app.post('/identity', auth, (req, res) => res.json({ userId: req.userId, bodyId: req.body.userId }));
    app.get('/profile', auth, users.getProfile);
    app.post('/address', auth, users.addAddress);
    app.get('/api/order/:id', auth, orders.getOrderById);
    app.get('/invoice/:orderId', auth, orders.generateInvoice);
    app.post('/ticket/:id', auth, getTicketById);
    app.post('/stripe', auth, orders.placeOrderStripe);
    app.post('/razorpay', auth, orders.placeOrderRazorpay);
    app.post('/cancel', auth, orders.cancelOrder);
    app.post('/verify-stripe', auth, orders.verifyStripe);
    app.post('/verify-razorpay', auth, orders.verifyRazorpay);
    app.post('/api/reset/orders', adminAuth, (_req, res) => res.json({ success: true }));
    app.post('/api/product/update', adminAuth, (_req, res) => res.json({ success: true }));
    app.post('/unknown', adminAuth, (_req, res) => res.json({ success: true }));
    app.use('/api/coupon', couponRouter); app.use('/api/cms', cmsRouter);
    app.post('/upload', auth, upload.single('image'), (req, res) => res.json({ path: req.file.path, name: req.file.filename }));
    app.get('/failure', (_req, _res, next) => next(new Error('private database password')));
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
    nock.cleanAll(); Sessions.prototype.retrieve = oldRetrieve;
    await Promise.all(Object.values(mongoose.connection.collections).map(c => c.deleteMany({})));
    [customer, other, admin, staff] = await userModel.create([
        { email: 'buyer@security.test', name: 'Buyer', password: await bcrypt.hash('customer-password', 4) },
        { email: 'other@security.test', name: 'Other' },
        { email: 'db-admin@security.test', name: 'Admin', role: 'admin' },
        { email: 'db-staff@security.test', name: 'Staff', role: 'staff', permissions: ['/list', '/reset-data'] },
    ]);
});
after(async () => {
    Sessions.prototype.retrieve = oldRetrieve; nock.cleanAll(); nock.enableNetConnect();
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect(); await database?.stop();
});

test('missing, null, empty and malformed OTPs cannot reset passwords or grant admin access', async () => {
    for (const otp of [undefined, null, '', '123', 123456]) {
        const reset = await request('/reset', { email: customer.email, otp, newPassword: 'attacker-password' });
        assert.equal(reset.data.success, false);
        assert.equal((await request('/verify-reset', { email: customer.email, otp })).data.success, false);
        assert.equal((await request('/admin-otp', { email: admin.email, otp })).data.success, false);
    }
    assert.equal(await bcrypt.compare('customer-password', (await userModel.findById(customer._id)).password), true);
});

test('OTP purpose, expiry, five-attempt budget and concurrent single-use consumption are enforced', async () => {
    let code = await issueOtp(customer, 'email-login');
    assert.notEqual((await userModel.findById(customer._id)).otp, code);
    assert.equal(await checkOtp(customer, code, 'admin-login', true), false);
    const used = await Promise.all([checkOtp(customer, code, 'email-login', true), checkOtp(customer, code, 'email-login', true)]);
    assert.deepEqual(used.sort(), [false, true]);
    code = await issueOtp(customer, 'password-reset');
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) assert.equal(await checkOtp(customer, wrong, 'password-reset'), false);
    assert.equal(await checkOtp(customer, code, 'password-reset', true), false);
    code = await issueOtp(customer, 'password-reset');
    await userModel.updateOne({ _id: customer._id }, { $set: { otp_expiry: new Date(0) } });
    assert.equal(await checkOtp(customer, code, 'password-reset', true), false);
});

test('registration cannot overwrite existing accounts and requires a single-use email proof', async () => {
    await issueOtp(customer, 'password-reset');
    assert.equal((await request('/register', { email: customer.email, name: 'Attacker', password: 'attacker-password' })).data.success, false);
    assert.equal((await userModel.findById(customer._id)).name, 'Buyer');
    const pending = await userModel.create({ email: 'new@security.test', name: 'Temporary OTP User' });
    const code = await issueOtp(pending, 'email-signup');
    const verified = await request('/signup-otp', { email: pending.email, otp: code });
    assert.equal(verified.data.success, true);
    const registration = { email: pending.email, name: 'New Buyer', password: 'valid-password', registrationToken: verified.data.registrationToken, role: 'admin' };
    await cmsModel.create({ name: 'welcomeEmail', content: { mode: 'html', subject: 'A personal welcome for {{userName}}', html: '<p>Welcome {{userName}}!</p>' } });
    const welcome = nock('https://api.resend.com').post('/emails', body => body.to === pending.email && body.subject === 'A personal welcome for New Buyer' && body.html === '<p>Welcome New Buyer!</p>').reply(200, { id: 'welcome' });
    assert.equal((await request('/register', registration)).data.success, true);
    assert.equal(welcome.isDone(), true);
    assert.equal((await userModel.findById(pending._id)).role, 'user');
    assert.equal((await request('/register', registration)).data.success, false);
});

test('password reset revokes sessions and login responses never serialize credentials', async () => {
    const token = userToken(customer);
    const code = await issueOtp(customer, 'password-reset');
    assert.equal((await request('/reset', { email: customer.email, otp: code, newPassword: 'replacement-password' })).data.success, true);
    assert.equal((await request('/identity', {}, token)).status, 401);
    const login = await request('/login', { email: customer.email, password: 'replacement-password' });
    assert.equal(login.data.success, true);
    assert.ok(login.data.token);
    for (const key of ['password', 'otp', 'otp_expiry', 'otpPurpose', 'otpAttempts', 'tokenVersion']) assert.equal(login.data.user[key], undefined);
});

test('forgot-password email is delivered with a hashed reset code and no code in the response', async () => {
    const email = nock('https://api.resend.com').post('/emails', body => /\d{6}/.test(body.html)).reply(200, { id: 'reset' });
    const result = await request('/forgot', { email: customer.email });
    assert.equal(result.data.success, true); assert.equal(email.isDone(), true);
    const saved = await userModel.findById(customer._id);
    assert.equal(saved.otpPurpose, 'password-reset'); assert.match(saved.otp, /^[a-f\d]{64}$/);
    assert.doesNotMatch(JSON.stringify(result.data), /\d{6}/);
});

test('tokens are expiring, audience-specific, and contain no admin password; legacy tokens are rejected', async () => {
    const token = envToken(envAccounts()[0]);
    const payload = jwt.decode(token);
    assert.ok(payload.exp > payload.iat); assert.equal(payload.aud, 'admin');
    assert.ok(!JSON.stringify(payload).includes(process.env.ADMIN_PASSWORD));
    assert.throws(() => verifyToken(token, 'customer'));
    const old = jwt.sign(process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD, process.env.JWT_SECRET);
    assert.equal((await request('/api/product/update', {}, old)).status, 401);
    assert.equal((await request('/api/product/update', {}, userToken(customer))).status, 401);
    const expired = signToken({ id: String(customer._id), version: 0 }, 'customer', -1);
    assert.equal((await request('/identity', {}, expired)).status, 401);
});

test('admin password and OTP logins last 72 hours while customer sessions remain two hours', async (t) => {
    const assertAdminSession = result => {
        assert.equal(result.status, 200);
        assert.equal(result.data.success, true);
        const claims = verifyToken(result.data.token, 'admin');
        assert.equal(claims.exp - claims.iat, 72 * 60 * 60);
        const clock = t.mock.method(Date, 'now', () => (claims.exp - 1) * 1000);
        try {
            assert.doesNotThrow(() => verifyToken(result.data.token, 'admin'));
            clock.mock.mockImplementation(() => claims.exp * 1000);
            assert.throws(() => verifyToken(result.data.token, 'admin'), { name: 'TokenExpiredError' });
        } finally {
            clock.mock.restore();
        }
    };
    for (const account of envAccounts()) {
        assertAdminSession(await request('/admin-login', { email: account.email, password: account.password }));
    }
    const password = 'database-admin-password';
    for (const account of [admin, staff]) {
        account.password = await bcrypt.hash(password, 4);
        await account.save();
        assertAdminSession(await request('/admin-login', { email: account.email, password }));
        const otp = await issueOtp(account, 'admin-login');
        assertAdminSession(await request('/admin-otp', { email: account.email, otp }));
    }
    const login = await request('/login', { email: customer.email, password: 'customer-password' });
    assert.equal(login.data.success, true);
    const claims = verifyToken(login.data.token, 'customer');
    assert.equal(claims.exp - claims.iat, 2 * 60 * 60);
});

test('three-day admin sessions are still revoked by credential changes', async () => {
    const envSession = envToken(envAccounts()[0]);
    assert.equal((await request('/api/product/update', {}, envSession)).status, 200);
    const originalPassword = process.env.ADMIN_PASSWORD;
    try {
        process.env.ADMIN_PASSWORD = 'changed-admin-password';
        assert.equal((await request('/api/product/update', {}, envSession)).status, 401);
    } finally {
        process.env.ADMIN_PASSWORD = originalPassword;
    }
    const dbSession = userToken(admin, 'admin');
    assert.equal((await request('/api/product/update', {}, dbSession)).status, 200);
    const otp = await issueOtp(admin, 'password-reset');
    const reset = await request('/reset', { email: admin.email, otp, newPassword: 'replacement-admin-password' });
    assert.equal(reset.data.success, true);
    assert.equal((await request('/api/product/update', {}, dbSession)).status, 401);
});

test('account identity cannot be supplied by the client; revoked and blocked sessions fail', async () => {
    const token = userToken(customer);
    const identity = await request('/identity', { userId: String(other._id) }, token);
    assert.deepEqual(identity.data, { userId: String(customer._id), bodyId: String(customer._id) });
    await userModel.updateOne({ _id: customer._id }, { $set: { isBlocked: true } });
    assert.equal((await request('/identity', {}, token)).status, 403);
    await userModel.deleteOne({ _id: customer._id });
    assert.equal((await request('/identity', {}, token)).status, 401);
});

test('staff permissions deny by default, respect route casing, and prohibit destructive resets', async () => {
    const token = userToken(staff, 'admin');
    assert.equal((await request('/api/product/update', {}, token)).status, 200);
    assert.equal((await request('/API/PRODUCT/UPDATE', {}, token)).status, 200);
    assert.equal((await request('/api/reset/orders', {}, token)).status, 403);
    assert.equal((await request('/unknown', {}, token)).status, 403);
    assert.equal((await request('/api/product/update', {}, envToken(envAccounts().find(a => a.role === 'staff')))).status, 403);
    await userModel.updateOne({ _id: staff._id }, { $set: { isBlocked: true } });
    assert.equal((await request('/api/product/update', {}, token)).status, 401);
});

test('orders, invoices, tickets and addresses enforce customer ownership', async () => {
    const order = await makeOrder({ userId: other._id });
    const token = userToken(customer);
    assert.equal((await request(`/api/order/${order._id}`, undefined, token)).data.success, false);
    assert.equal((await request(`/invoice/${order._id}`, undefined, token)).data.success, false);
    const ticket = await ticketModel.create({ user: other._id, subject: 'Private', description: 'Private', ticketNumber: '123456', messages: [] });
    assert.equal((await request(`/ticket/${ticket._id}`, { isAdmin: true }, token)).status, 403);
    const address = { name: 'Buyer', address: 'Test street', city: 'Delhi', zip: '110001', state: 'Delhi', country: 'India', phone: '9999999999' };
    assert.equal((await request('/address', { userId: String(other._id), address }, token)).data.success, true);
    assert.equal((await userModel.findById(other._id)).addresses.length, 0);
    assert.equal((await userModel.findById(customer._id)).addresses.length, 1);
});

test('Stripe fails closed on unpaid, missing, mismatched and unavailable gateway proof', async () => {
    const order = await makeOrder();
    const token = userToken(customer);
    for (const proof of [null, { id: 'cs_test', payment_status: 'unpaid' }, { id: 'cs_test', payment_status: 'paid', amount_total: 1, currency: 'inr', client_reference_id: String(order._id) }]) {
        Sessions.prototype.retrieve = async () => proof;
        assert.equal((await request('/verify-stripe', { orderId: String(order._id), success: 'true' }, token)).data.success, false);
        assert.equal((await orderModel.findById(order._id)).payment, false);
    }
    Sessions.prototype.retrieve = async () => { throw new Error('Gateway unavailable'); };
    assert.equal((await request('/verify-stripe', { orderId: String(order._id), success: 'true' }, token)).data.success, false);
    assert.equal((await orderModel.findById(order._id)).payment, false);
    assert.equal((await request('/verify-stripe', { orderId: String(order._id), success: 'true' }, userToken(other))).status, 404);
    await request('/verify-stripe', { orderId: String(order._id), success: 'false' }, token);
    assert.ok(await orderModel.findById(order._id));
});

test('a paid Stripe session fulfills once and replay cannot renew membership', async () => {
    const order = await makeOrder();
    Sessions.prototype.retrieve = async () => ({ id: 'cs_test', payment_status: 'paid', amount_total: 12900, currency: 'inr', client_reference_id: String(order._id), payment_intent: 'pi_test' });
    nock('https://api.resend.com').post('/emails').reply(200, { id: 'membership' });
    const payload = { orderId: String(order._id), success: 'true', userId: String(other._id) };
    assert.equal((await request('/verify-stripe', payload, userToken(customer))).data.success, true);
    const first = await userModel.findById(customer._id);
    assert.equal(first.isLuxeMember, true);
    assert.equal((await userModel.findById(other._id)).isLuxeMember, false);
    assert.equal((await request('/verify-stripe', payload, userToken(customer))).data.success, true);
    assert.equal(+(await userModel.findById(customer._id)).luxeMembershipExpires, +first.luxeMembershipExpires);
});

test('Razorpay rejects a valid signed receipt belonging to another customer and a wrong amount', async () => {
    const order = await makeOrder({ paymentMethod: 'Razorpay', paymentDetails: { razorpay_order_id: 'order_local' } });
    const remote = { id: 'order_local', receipt: String(order._id), status: 'paid', currency: 'INR', amount_paid: 12900 };
    const payload = { razorpay_order_id: remote.id, razorpay_payment_id: 'pay_local', razorpay_signature: createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update('order_local|pay_local').digest('hex') };
    nock('https://api.razorpay.com').get('/v1/orders/order_local').twice().reply(200, remote);
    assert.equal((await request('/verify-razorpay', payload, userToken(other))).status, 404);
    nock('https://api.razorpay.com').get('/v1/payments/pay_local').reply(200, { id: 'pay_local', order_id: remote.id, status: 'captured', amount: 1, currency: 'INR' });
    assert.equal((await request('/verify-razorpay', payload, userToken(customer))).data.success, false);
    assert.equal((await orderModel.findById(order._id)).payment, false);
});

test('checkout ignores supplied discounts, currency, gift-wrap price and customer identity', async () => {
    const product = await productModel.create({ name: 'Test item', description: 'Test', category: 'Test', date: Date.now(), variations: [{ color: 'red', sku: 'TEST', images: ['https://example.test/a.png'], sizes: [{ size: 'M', price: 200, stock: 10 }] }] });
    const wrap = await giftWrapModel.create({ name: 'Wrap', image: 'https://example.test/w.png', price: 25 });
    const item = { productId: String(product._id), color: 'red', size: 'M', quantity: 1, discountAmount: 199 };
    nock('https://api.razorpay.com').post('/v1/orders', body => body.amount === 27500 && body.currency === 'INR').reply(200, { id: 'order_test', amount: 27500, currency: 'INR' });
    const result = await request('/razorpay', { userId: String(other._id), items: [item], address: { state: 'Delhi' }, currency: 'USD', couponDiscount: 500, giftWrap: { _id: String(wrap._id), price: -200 } }, userToken(customer));
    assert.equal(result.data.success, true);
    const order = await orderModel.findOne(); assert.equal(String(order.userId), String(customer._id));
    assert.equal(order.orderTotal, 275); assert.equal(order.items[0].discountAmount, 0); assert.equal(order.giftWrap.price, 25);
    for (const quantity of [-1, 0, 1.5, 100, '2']) assert.equal((await request('/razorpay', { items: [{ ...item, quantity }], address: { state: 'Delhi' } }, userToken(customer))).data.success, false);
    assert.equal((await request('/razorpay', { items: [item, item], address: { state: 'Delhi' } }, userToken(customer))).data.success, false);
    assert.equal(await orderModel.countDocuments(), 1);
});

test('public coupons omit customer redemption data and private CMS templates stay private', async () => {
    await couponModel.create({ code: 'PUBLIC', discountType: 'fixed', discountValue: 10, expiryDate: new Date('2035-01-01'), usersWhoUsed: [{ userId: other._id }] });
    const result = await request('/api/coupon/active');
    assert.equal(result.data.coupons.length, 1);
    assert.equal(result.data.coupons[0].usersWhoUsed, undefined); assert.equal(result.data.coupons[0].specificUsers, undefined);
    assert.equal((await request('/api/cms/orderConfirmationEmail')).status, 404);
    assert.equal((await request('/api/cms/welcomeEmail')).status, 404);
    assert.equal((await request('/api/cms', { name: 'welcomeEmail', content: { subject: 'Unauthorized edit' } }, userToken(admin, 'admin'))).status, 403);
    assert.equal(await cmsModel.countDocuments({ name: 'welcomeEmail' }), 0);
});

test('NoSQL operators, prototype keys and nested auth objects are rejected before querying', async () => {
    for (const body of [{ email: { $ne: null }, password: 'test' }, { email: ['test'], password: 'test' }, JSON.parse('{"__proto__":{"admin":true}}')]) {
        assert.equal((await request('/login', body)).status, 400);
    }
    assert.equal((await request('/identity', { nested: { 'account.role': 'admin' } }, userToken(customer))).status, 400);
});

test('authentication email limits are shared through MongoDB', async () => {
    for (let i = 0; i < 5; i++) assert.equal((await request('/limited/send', { email: 'rate@security.test' })).status, 200);
    const denied = await request('/limited/send', { email: 'rate@security.test' });
    assert.equal(denied.status, 429); assert.ok(Number(denied.headers.get('retry-after')) > 0);
});

test('uploads reject disguised HTML, enforce image limits, randomize names and remove temporary files', async () => {
    const sendFile = async bytes => {
        const body = new FormData(); body.append('image', new Blob([bytes], { type: 'image/png' }), '../../same.png');
        const response = await fetch(base + '/upload', { method: 'POST', body, headers: { token: userToken(customer) } });
        return { status: response.status, data: await response.json() };
    };
    assert.equal((await sendFile('<html><script>alert(1)</script></html>')).status, 400);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
    const good = await sendFile(png); assert.equal(good.status, 200); assert.match(good.data.name, /^[a-f\d-]{36}$/);
    await new Promise(resolve => setTimeout(resolve, 50)); await assert.rejects(access(good.data.path));
    assert.equal((await sendFile(Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]))).status, 400);
});

test('security headers, CORS allowlist, body limits and generic errors are applied', async () => {
    const good = await request('/failure', undefined, undefined, { Origin: 'https://shop.security.test' });
    assert.equal(good.headers.get('access-control-allow-origin'), 'https://shop.security.test');
    assert.equal(good.headers.get('x-content-type-options'), 'nosniff'); assert.equal(good.headers.get('x-powered-by'), null);
    assert.equal(good.data.message, 'Unable to complete request.');
    const bad = await request('/failure', undefined, undefined, { Origin: 'https://attacker.test' });
    assert.equal(bad.headers.get('access-control-allow-origin'), null);
    assert.equal((await request('/login', { email: 'x'.repeat(110000) })).status, 413);
});


test('unpaid cancellations never increase stock and concurrent cancellation only runs once', async () => {
    const product = await productModel.create({ name: 'Stock item', description: 'Test', category: 'Test', date: Date.now(), variations: [{ color: 'red', sku: 'STOCK', images: ['test.png'], sizes: [{ size: 'M', price: 100, stock: 7 }] }] });
    const item = { productId: product._id, name: product.name, price: 100, quantity: 2, color: 'red', size: 'M', image: 'test.png' };
    const unpaid = await makeOrder({ items: [item] });
    assert.equal((await request('/cancel', { orderId: String(unpaid._id) }, userToken(customer))).data.success, true);
    assert.equal((await productModel.findById(product._id)).variations[0].sizes[0].stock, 7);
    const cod = await makeOrder({ items: [item], paymentMethod: 'COD' });
    const results = await Promise.all([request('/cancel', { orderId: String(cod._id) }, userToken(customer)), request('/cancel', { orderId: String(cod._id) }, userToken(customer))]);
    assert.equal(results.filter(r => r.data.success).length, 1);
    assert.equal((await productModel.findById(product._id)).variations[0].sizes[0].stock, 9);
});

test('refund retries retain a stable gateway idempotency key and reject changed or excessive amounts', async () => {
    const order = await makeOrder({ paymentMethod: 'Razorpay', payment: true, razorpayPaymentId: 'pay_refund' });
    const gateway = nock('https://api.razorpay.com', { reqheaders: { 'x-refund-idempotency': `febeul-refund-${order._id}` } })
        .post('/v1/payments/pay_refund/refund', body => body.amount === 12900).twice().reply(200, { id: 'refund_test', status: 'processed' });
    assert.equal((await processPrepaidRefund(order._id, 'pay_refund', 129)).success, true);
    assert.equal((await processPrepaidRefund(order._id, 'pay_refund', 129)).refundId, 'refund_test');
    assert.equal(gateway.isDone(), true);
    for (const amount of [130, -1, NaN, 50]) await assert.rejects(processPrepaidRefund(order._id, 'pay_refund', amount));
    await assert.rejects(processPrepaidRefund(order._id, 'pay_other', 129));
});
