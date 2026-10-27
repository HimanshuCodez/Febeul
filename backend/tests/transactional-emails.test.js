import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Sessions } from '../node_modules/stripe/esm/resources/Checkout/Sessions.js';
import express from 'express';
import mongoose from 'mongoose';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import { userToken } from '../utils/authTokens.js';
import { checkOtp } from '../utils/otp.js';
import { getDefaultEmailContent, getEmailTemplateDefinition } from '../utils/emailTemplates.js';
import { EMAIL_TEMPLATE_OPTIONS } from '../../shared/emailTemplates.js';
import { syncOrderTracking } from '../utils/orderTrackingSync.js';
import { runCancellationRefund } from '../utils/cancellationRefunds.js';

// Real routes, disposable data and intercepted providers only. No deployment secrets.
Object.assign(process.env, {
    JWT_SECRET: 'transactional-email-tests-only', RESEND_API_KEY: 're_local',
    RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_KEY_SECRET: 'local-secret', STRIPE_SECRET_KEY: 'sk_test_local',
    SHIPROCKET_WEBHOOK_SECRET: 'local-hook', ANALYTICS_ENABLED: 'false', NODE_ENV: 'test',
});
const { default: orderRouter } = await import('../routes/orderRoute.js');
const { default: userRouter } = await import('../routes/userRoute.js');
const { default: ticketRouter } = await import('../routes/ticketRoute.js');
const { default: adminRouter } = await import('../routes/adminRoute.js');
const { default: emailRouter } = await import('../routes/emailTemplateRoute.js');
const { default: cmsRouter } = await import('../routes/cmsRoute.js');
const { sendEmailOTP } = await import('../controllers/otpController.js');
let database, server, base, customer, admin, messages, rejectEmail;

async function request(path, body, token = userToken(admin, 'admin'), extraHeaders = {}) {
    const response = await fetch(base + path, {
        method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', token, ...extraHeaders },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() };
}
async function saveTemplate(type, html, subject = `Edited ${type}`) {
    const response = await request(`/api/email-template/${type}`, { content: { ...getDefaultEmailContent(type), mode: 'html', subject, html } });
    assert.equal(response.status, 200, response.data.message);
}
const makeOrder = overrides => orderModel.create({
    userId: customer._id, items: [{ productId: new mongoose.Types.ObjectId(), name: 'Test garment', price: 500, quantity: 1, image: 'test.png' }],
    orderTotal: 500, productAmount: 500, address: { name: 'Buyer', state: 'Delhi' }, date: Date.now(),
    paymentMethod: 'COD', orderStatus: 'Confirmed', ...overrides,
});
const webhook = (order, current_status, extra = {}) => request('/api/order/shiprocket-webhook', {
    order_id: String(order._id), current_status, current_timestamp: new Date().toISOString(), ...extra,
}, '', { 'x-api-key': 'local-hook' });

before(async () => {
    nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
    database = await MongoMemoryServer.create();
    await mongoose.connect(database.getUri(), { dbName: 'transactional-email-tests' });
    const app = express(); app.use(express.json());
    app.use('/api/order', orderRouter); app.use('/api/user', userRouter); app.use('/api/ticket', ticketRouter);
    app.use('/api/admin', adminRouter); app.use('/api/email-template', emailRouter); app.use('/api/cms', cmsRouter);
    app.post('/email-otp', sendEmailOTP);
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
    nock.cleanAll(); messages = []; rejectEmail = false;
    nock('https://api.resend.com').persist().post('/emails').reply((_uri, body) => {
        messages.push(body);
        return rejectEmail ? [400, { name: 'validation_error', message: 'Local simulated failure' }] : [200, { id: 'local-email' }];
    });
    await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
    [customer, admin] = await userModel.create([{ name: 'Buyer', email: 'buyer@notifications.test' }, { name: 'Admin', email: 'admin@notifications.test', role: 'admin' }]);
});
afterEach(() => {
    assert.deepEqual(nock.pendingMocks().filter(mock => !mock.includes('api.resend.com')), []);
});
after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect(); await database?.stop(); nock.cleanAll(); nock.enableNetConnect();
});

test('customer, reset and admin OTP routes send edited templates with valid private codes', async () => {
    const cases = [
        ['email-otp', '/email-otp', { email: customer.email, purpose: 'login' }, customer, 'email-login'],
        ['password-reset-otp', '/api/user/forgot-password', { email: customer.email }, customer, 'password-reset'],
        ['admin-login-otp', '/api/user/admin-send-otp', { email: admin.email }, admin, 'admin-login'],
    ];
    for (const [type, path, body, user, purpose] of cases) {
        await saveTemplate(type, '<p>Hello {{userName}}. Code: {{otp}}. Expires in {{expiryMinutes}} minutes.</p>');
        const result = await request(path, body, '');
        assert.equal(result.data.success, true, result.data.message);
        const email = messages.at(-1);
        assert.equal(email.to, user.email); assert.equal(email.subject, `Edited ${type}`);
        const code = email.html.match(/Code: (\d{6})/)[1];
        assert.match(email.html, /Expires in 5 minutes/);
        assert.equal(await checkOtp(await userModel.findById(user._id), code, purpose), true);
        assert.ok(!JSON.stringify(result.data).includes(code));
    }
    assert.equal(messages.length, 3);
});

test('shipment admin updates and courier webhooks use saved templates only once per event', async () => {
    await saveTemplate('order-shipped', '<p>{{userName}}: {{orderId}} / {{courierName}} / {{trackingNumber}} / {{trackingUrl}}</p>');
    await saveTemplate('order-delivered', '<p>Delivered {{orderId}} to {{userName}}</p>');
    const order = await makeOrder({ shiprocket: { awb: 'LOCAL-AWB', courier: 'Test Courier', trackingUrl: 'https://example.test/track' } });
    const updates = await Promise.all([1, 2].map(() => request('/api/order/status', { orderId: order._id, orderStatus: 'Shipped' })));
    assert.ok(updates.every(result => result.data.success));
    assert.equal(messages.length, 1);
    assert.equal(messages[0].subject, 'Edited order-shipped');
    assert.match(messages[0].html, /Buyer: .*Test Courier \/ LOCAL-AWB \/ https:\/\/example.test\/track/);
    assert.equal((await webhook(order, 'SHIPPED')).data.success, true);
    assert.equal(messages.length, 1);
    assert.equal((await webhook(order, 'DELIVERED')).data.success, true);
    assert.equal((await webhook(order, 'DELIVERED')).data.success, true);
    assert.equal(messages.length, 2);
    assert.equal(messages[1].subject, 'Edited order-delivered');
    const detail = await request(`/api/order/${order._id}`, undefined, userToken(customer));
    assert.equal(detail.data.order.emailNotifications, undefined);
});

test('tracking polling sends the same edited shipment notifications without duplicates', async () => {
    await saveTemplate('order-shipped', '<p>Poll shipped {{orderId}}</p>');
    await saveTemplate('order-delivered', '<p>Poll delivered {{orderId}}</p>');
    const order = await makeOrder({ shiprocket: { awb: 'POLL-AWB' } });
    nock('https://apiv2.shiprocket.in').post('/v1/external/auth/login').reply(200, { token: 'local' });
    for (const status of ['SHIPPED', 'DELIVERED']) {
        nock('https://apiv2.shiprocket.in').get('/v1/external/courier/track/awb/POLL-AWB').reply(200, { tracking_data: { shipment_track: [{ current_status: status }] } });
        await syncOrderTracking(await orderModel.findById(order._id), { force: true });
    }
    await syncOrderTracking(await orderModel.findById(order._id), { force: true });
    assert.deepEqual(messages.map(message => message.subject), ['Edited order-shipped', 'Edited order-delivered']);
});

test('cancelled order and completed refund emails are distinct and wait for provider completion', async () => {
    await saveTemplate('order-cancelled', '<p>{{userName}}: cancelled {{orderId}}. {{cancellationReason}}</p>');
    await saveTemplate('refund-processed', '<p>{{userName}}: refund {{refundAmount}} for {{orderId}}</p>');
    const order = await makeOrder({ payment: true, paymentMethod: 'Razorpay', razorpayPaymentId: 'pay_local' });
    nock('https://api.razorpay.com').post('/v1/payments/pay_local/refund').reply(200, { id: 'rfnd_local', status: 'pending', amount: 50000, payment_id: 'pay_local' });
    const cancelled = await request('/api/order/cancel', { orderId: order._id, reason: 'Changed plans' }, userToken(customer));
    assert.equal(cancelled.data.success, true);
    assert.equal(cancelled.data.refundStatus, 'processing');
    assert.deepEqual(messages.map(message => message.subject), ['Edited order-cancelled']);
    assert.match(messages[0].html, /Changed plans/);
    nock('https://api.razorpay.com').get('/v1/refunds/rfnd_local').reply(200, { id: 'rfnd_local', status: 'processed', amount: 50000, payment_id: 'pay_local' });
    await runCancellationRefund(order._id, { force: true });
    await runCancellationRefund(order._id, { force: true });
    assert.equal(messages.length, 2);
    assert.equal(messages[1].subject, 'Edited refund-processed');
    assert.match(messages[1].html, /refund 500.00/);
    assert.equal((await request('/api/order/cancel', { orderId: order._id }, userToken(customer))).status, 409);
    assert.equal(messages.length, 2);
});

test('customer and admin ticket creation send saved receipts to the customer', async () => {
    await saveTemplate('support-ticket-received', '<p>{{userName}}: {{ticketNumber}} / {{ticketSubject}}</p>');
    for (const path of ['/api/ticket/create', '/api/ticket/admin-create']) {
        const result = await request(path, { identifier: customer.email, subject: '<b>Delivery help</b>', message: 'Please help' }, path.endsWith('/create') ? userToken(customer) : userToken(admin, 'admin'));
        assert.equal(result.data.success, true, result.data.message);
        assert.equal(messages.at(-1).to, customer.email);
        assert.equal(messages.at(-1).html, `<p>Buyer: ${result.data.ticket.ticketNumber} / &lt;b&gt;Delivery help&lt;/b&gt;</p>`);
    }
    assert.equal(messages.length, 2);
});

test('granting membership sends the saved activation design with the persisted expiry', async () => {
    await saveTemplate('luxe-activated', '<p>{{userName}} is active until {{expiryDate}}</p>');
    const result = await request('/api/admin/grant-luxe', { userId: customer._id });
    assert.equal(result.data.success, true);
    const user = await userModel.findById(customer._id);
    const expiry = user.luxeMembershipExpires.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    assert.equal(messages[0].html, `<p>Buyer is active until ${expiry}</p>`);
    assert.equal(messages[0].subject, 'Edited luxe-activated');
});

for (const paymentMethod of ['Stripe', 'Razorpay']) {
    test(`${paymentMethod} membership purchases use the edited activation email once`, async t => {
        await saveTemplate('luxe-activated', '<p>Paid activation for {{userName}} until {{expiryDate}}</p>');
        const order = await makeOrder({
            paymentMethod, payment: false, orderTotal: 129,
            items: [{ productId: new mongoose.Types.ObjectId(), name: 'Febeul Luxe Membership', price: 129, quantity: 1, image: 'test.png' }],
            paymentDetails: { stripeSessionId: 'cs_local', razorpay_order_id: 'order_local' },
        });
        let path, body;
        if (paymentMethod === 'Stripe') {
            t.mock.method(Sessions.prototype, 'retrieve', async () => ({
                id: 'cs_local', payment_status: 'paid', amount_total: 12900, currency: 'inr', client_reference_id: String(order._id), payment_intent: 'pi_local',
            }));
            path = '/api/order/verifyStripe'; body = { orderId: order._id, success: 'true' };
        } else {
            nock('https://api.razorpay.com').get('/v1/orders/order_local').twice().reply(200, {
                id: 'order_local', receipt: String(order._id), status: 'paid', amount_paid: 12900, currency: 'INR',
            });
            nock('https://api.razorpay.com').get('/v1/payments/pay_local').reply(200, {
                id: 'pay_local', order_id: 'order_local', status: 'captured', amount: 12900, currency: 'INR',
            });
            path = '/api/order/verifyRazorpay';
            body = { razorpay_order_id: 'order_local', razorpay_payment_id: 'pay_local', razorpay_signature: createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update('order_local|pay_local').digest('hex') };
        }
        assert.equal((await request(path, body, userToken(customer))).data.success, true);
        assert.equal((await request(path, body, userToken(customer))).data.success, true);
        assert.equal(messages.length, 1);
        assert.equal(messages[0].subject, 'Edited luxe-activated');
        assert.match(messages[0].html, /Paid activation for Buyer until/);
        assert.doesNotMatch(messages[0].html, /\{\{/);
    });
}

test('failed status email does not undo delivery and can be retried', async () => {
    const order = await makeOrder();
    rejectEmail = true;
    assert.equal((await request('/api/order/status', { orderId: order._id, orderStatus: 'Delivered' })).data.success, true);
    assert.equal((await orderModel.findById(order._id)).orderStatus, 'Delivered');
    rejectEmail = false;
    assert.equal((await request('/api/order/status', { orderId: order._id, orderStatus: 'Delivered' })).data.success, true);
    assert.equal(messages.length, 2);
    await request('/api/order/status', { orderId: order._id, orderStatus: 'Delivered' });
    assert.equal(messages.length, 2);
});

test('all template CMS names stay private and cannot bypass the template editor', async () => {
    for (const { id } of EMAIL_TEMPLATE_OPTIONS) {
        const name = getEmailTemplateDefinition(id).cmsName;
        assert.equal((await request(`/api/cms/${name}`, undefined, '')).status, 404);
        assert.equal((await request('/api/cms', { name, content: {} })).status, 403);
    }
});
