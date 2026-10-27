import { adminTokenFor } from './helpers/auth.js';
import { userToken } from '../utils/authTokens.js';
import { after, before, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import cmsModel from '../models/cmsModel.js';
import userModel from '../models/userModel.js';
import { EMAIL_TEMPLATE_OPTIONS } from '../../shared/emailTemplates.js';
import {
    getDefaultEmailContent, getEmailTemplateMeta, getEmailTemplateDefinition,
    buildSampleEmailData, renderEmailTemplate, getSavedEmail, loadEmailContent,
} from '../utils/emailTemplates.js';
import { buildSampleOrder, getOrderConfirmationEmail } from '../utils/orderEmailTemplate.js';

// Disposable local database and intercepted email provider; never load production configuration.
process.env.JWT_SECRET = 'local-email-template-tests';
process.env.ADMIN_EMAIL = 'admin@email.test';
process.env.ADMIN_PASSWORD = 'local-only';
process.env.RESEND_API_KEY = 're_local_email_template_tests';
const { default: emailTemplateRouter } = await import('../routes/emailTemplateRoute.js');
const { sendTemplateEmail } = await import('../utils/sendTemplateEmail.js');
const types = EMAIL_TEMPLATE_OPTIONS.map(option => option.id);
const sample = type => type === 'order-confirmation' ? buildSampleOrder() : buildSampleEmailData();
const token = value => adminTokenFor(value);
const adminToken = () => token(process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD);
let database, server, base, editor, restricted;

async function request(path, { method = 'GET', body, auth = adminToken() } = {}) {
    const response = await fetch(base + path, {
        method, headers: { ...(auth ? { token: auth } : {}), 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
}

before(async () => {
    database = await MongoMemoryServer.create();
    await mongoose.connect(database.getUri(), { dbName: 'email-template-tests' });
    editor = await userModel.create({ name: 'Editor', email: 'editor@email.test', role: 'staff', permissions: ['/email-templates'] });
    restricted = await userModel.create({ email: 'limited@email.test', role: 'staff', permissions: ['/cms'] });
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/email-template', emailTemplateRouter);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api/email-template/`;
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
});

after(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    if (database) await database.stop();
});

test('every default renders complete HTML with template-specific data in both editor modes', () => {
    for (const type of types) {
        const content = getDefaultEmailContent(type);
        const meta = getEmailTemplateMeta(type);
        for (const mode of ['html', 'builder']) {
            const email = renderEmailTemplate(type, { ...content, mode }, sample(type));
            assert.match(email.html, /Priya Sharma/);
            assert.doesNotMatch(email.html, /\{\{/);
            assert.ok(email.subject);
        }
        if (type !== 'order-confirmation') {
            assert.deepEqual(meta.orderBlockTypes, []);
            assert.equal(meta.blockDefaults.items, undefined);
            assert.equal(meta.tokens.some(t => t.key === 'itemRows'), false);
        }
    }
    for (const [requestType, label] of Object.entries({ return: 'Return Request', refund: 'Refund Request', cancellation: 'Cancellation', courier_return: 'Courier Return', unknown: 'Return/Refund Request' })) {
        const email = renderEmailTemplate('return-request', null, { ...sample('return-request'), requestType });
        assert.ok(email.html.includes(`${label} Received`));
        assert.ok(email.html.includes(label.toLowerCase()));
    }
    const refund = renderEmailTemplate('refund-processed', null, { userName: '<img src=x> & Test', orderId: '123456789abcdef0', amount: 12.5, method: 'COD' });
    assert.match(refund.html, /&lt;img src=x&gt; &amp; Test/);
    assert.match(refund.html, /₹12\.50/);
    assert.match(refund.html, /Order #9ABCDEF0/);
    assert.match(refund.html, /your provided payout details/);
    const stripeRefund = renderEmailTemplate('refund-processed', null, { ...sample('refund-processed'), method: 'Stripe' });
    assert.match(stripeRefund.html, /your original payment source/);
});

test('welcome defaults preserve the HTML file and safely personalize every placeholder', () => {
    const content = getDefaultEmailContent('welcome');
    assert.equal(content.mode, 'html');
    assert.equal(content.html, readFileSync(new URL('../templates/welcomeEmail.html', import.meta.url), 'utf8'));
    const rendered = renderEmailTemplate('welcome', {
        ...content,
        html: '<p>{{userName}} / {{userName}} / {{currentYear}}</p>',
    }, { userName: '<img src=x> & Customer' });
    assert.equal(rendered.html, `<p>&lt;img src=x&gt; &amp; Customer / &lt;img src=x&gt; &amp; Customer / ${new Date().getFullYear()}</p>`);
});

test('admin permissions protect all operations and unknown template IDs cannot mutate CMS', async () => {
    for (const type of types) {
        const content = getDefaultEmailContent(type);
        for (const [auth, status] of [['', 401], [token(restricted._id), 403]]) {
            for (const [suffix, method, body] of [['', 'GET'], ['', 'POST', { content }], ['', 'DELETE'], ['/preview', 'POST', { content }], ['/test', 'POST', { content, to: 'test@example.test' }]]) {
                assert.equal((await request(type + suffix, { method, body, auth })).status, status);
            }
        }
        const response = await request(type, { auth: token(editor._id) });
        assert.equal(response.status, 200);
        assert.equal(response.data.isDefault, true);
    }
    for (const type of ['unknown-template', 'constructor', '__proto__']) {
        assert.equal((await request(type, { method: 'POST', body: { content: getDefaultEmailContent('luxe-expired') } })).status, 404);
    }
    assert.equal(await cmsModel.countDocuments(), 0);
});

test('saved subjects and HTML are isolated per template and used by real email sending', async () => {
    for (const type of types) {
        const nameToken = type === 'order-confirmation' ? 'billingAddressName' : 'userName';
        const code = type.endsWith('-otp') ? '<p>{{otp}}</p>' : '';
        const content = { ...getDefaultEmailContent(type), mode: 'html', subject: `${type} for {{${nameToken}}}`, html: `<p>${type}: {{${nameToken}}}</p>${code}` };
        const saved = await request(type, { method: 'POST', auth: token(editor._id), body: { content } });
        assert.equal(saved.status, 200);
        assert.equal(saved.data.creator.name, 'Editor');
        assert.deepEqual((await request(type)).data.content, saved.data.content);
        const rendered = type === 'order-confirmation' ? await getOrderConfirmationEmail(sample(type)) : await getSavedEmail(type, sample(type));
        assert.equal(rendered.subject, `${type} for Priya Sharma`);
        assert.equal(rendered.html, `<p>${type}: Priya Sharma</p>${type.endsWith('-otp') ? '<p>123456</p>' : ''}`);
        if (type !== 'order-confirmation') {
            const provider = nock('https://api.resend.com').post('/emails', body => body.subject === rendered.subject && body.html === rendered.html && body.to === 'customer@example.test').reply(200, { id: 'local-test' });
            assert.equal((await sendTemplateEmail(type, 'customer@example.test', sample(type))).success, true);
            assert.equal(provider.isDone(), true);
        }
    }
    assert.equal(await cmsModel.countDocuments(), types.length);
    for (const type of types) assert.ok((await request(type)).data.content.subject.startsWith(type));
});

test('preview and test email use unsaved edits without overwriting saved content', async () => {
    for (const type of types) {
        const content = { ...getDefaultEmailContent(type), subject: `Preview ${type}` };
        const preview = await request(`${type}/preview`, { method: 'POST', body: { content } });
        assert.equal(preview.status, 200);
        assert.deepEqual({ subject: preview.data.subject, html: preview.data.html }, renderEmailTemplate(type, content, sample(type)));
        assert.match(preview.data.template, /\{\{/);
        const provider = nock('https://api.resend.com').post('/emails', body => body.subject === `[TEST] Preview ${type}` && body.html === preview.data.html).reply(200, { id: 'preview-test' });
        assert.equal((await request(`${type}/test`, { method: 'POST', body: { content, to: 'test@example.test' } })).status, 200);
        assert.equal(provider.isDone(), true);
        assert.ok((await request(type)).data.content.subject.startsWith(type));
    }
});

test('invalid content is rejected and resetting one template preserves every other saved design', async () => {
    const type = 'refund-processed';
    for (const content of [null, [], { mode: 'invalid' }, { mode: 'html', html: ' ' }, { mode: 'html', html: 'x'.repeat(90001) }, { mode: 'builder', blocks: Array(81).fill({}) }]) {
        assert.equal((await request(type, { method: 'POST', body: { content } })).status, 400);
    }
    assert.equal((await request(`${type}/test`, { method: 'POST', body: { content: getDefaultEmailContent(type), to: 'invalid' } })).status, 400);
    assert.equal((await request(type, { method: 'DELETE' })).status, 200);
    assert.deepEqual((await request(type)).data.content, getDefaultEmailContent(type));
    assert.equal((await request(type)).data.isDefault, true);
    for (const other of types.filter(id => id !== type)) {
        assert.equal((await request(other)).data.isDefault, false);
        assert.ok((await request(other)).data.content.subject.startsWith(other));
    }
    assert.equal(await cmsModel.countDocuments(), types.length - 1);
});

test('resetting the welcome email restores the original design used for delivery', async () => {
    assert.equal((await request('welcome')).data.isDefault, false);
    assert.equal((await request('welcome', { method: 'DELETE' })).status, 200);
    const loaded = await request('welcome');
    assert.equal(loaded.data.isDefault, true);
    assert.deepEqual(loaded.data.content, getDefaultEmailContent('welcome'));
    assert.deepEqual(await getSavedEmail('welcome', sample('welcome')), renderEmailTemplate('welcome', null, sample('welcome')));
});

test('delivery falls back to the original template if the template lookup fails', async () => {
    const log = mock.method(console, 'error', () => {});
    const find = mock.method(cmsModel, 'findOne', () => ({ lean: async () => { throw new Error('Local simulated outage'); } }));
    try {
        for (const type of types) assert.deepEqual(await loadEmailContent(type), getDefaultEmailContent(type));
        assert.equal(getEmailTemplateDefinition('constructor'), null);
    } finally {
        find.mock.restore();
        log.mock.restore();
    }
});

test('OTP templates cannot omit the usable code in HTML or visual builder mode', async () => {
    for (const type of types.filter(type => type.endsWith('-otp'))) {
        const content = getDefaultEmailContent(type);
        for (const invalid of [{ ...content, html: '<p>No code</p>' }, { ...content, mode: 'builder', blocks: content.blocks.filter(block => block.id !== 'message') }]) {
            const response = await request(type, { method: 'POST', body: { content: invalid } });
            assert.equal(response.status, 400);
            assert.match(response.data.message, /\{\{otp\}\}/);
        }
        const preview = renderEmailTemplate(type, content, sample(type));
        assert.match(preview.html, /123456/);
        assert.match(preview.html, /5 minutes/);
    }
});

test('shipment links and membership dates render safely in both editing modes', () => {
    for (const mode of ['html', 'builder']) {
        const shipped = renderEmailTemplate('order-shipped', { ...getDefaultEmailContent('order-shipped'), mode }, sample('order-shipped'));
        assert.match(shipped.html, /href="https:\/\/febeul.onrender.com\/order-detail\/000000000000000A1B2C3D4E"/);
        const unsafe = renderEmailTemplate('order-shipped', { ...getDefaultEmailContent('order-shipped'), mode }, { ...sample('order-shipped'), trackingUrl: 'javascript:alert(1)', courierName: '<img src=x>' });
        assert.doesNotMatch(unsafe.html, /javascript:/);
        assert.match(unsafe.html, /&lt;img src=x&gt;/);
        const membership = renderEmailTemplate('luxe-activated', { ...getDefaultEmailContent('luxe-activated'), mode }, sample('luxe-activated'));
        assert.match(membership.html, /31 December 2030/);
    }
});
