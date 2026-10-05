import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import axios from 'axios';
import { createAnalyticsClient, CONSENT_KEY, VISITOR_KEY, SESSION_KEY } from '../src/analytics/client.js';
import { installShoppingAnalytics } from '../src/analytics/shoppingBridge.js';
import { safePath, safeSearch, attributionFromUrl } from '../../shared/analyticsPrivacy.js';

const productId = '507f1f77bcf86cd799439011';
function storage() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; }
function setup(overrides = {}) {
  const local = storage(), session = storage(), requests = [], timers = new Map();
  let time = Date.now(), timerId = 0, responseStatus = 202;
  let location = new URL('https://shop.example/products?token=private&utm_source=Newsletter');
  const client = createAnalyticsClient({ local, session, crypto: webcrypto, now: () => time, location: () => location, referrer: () => 'https://private.search.example/path?password=secret', token: () => 'auth-header-only',
    setTimer: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; }, clearTimer: id => timers.delete(id),
    fetcher: async (url, config) => { requests.push({ url, config, body: config.body && JSON.parse(config.body) }); return { ok: true, status: url.endsWith('/config') ? 200 : responseStatus, json: async () => ({ enabled: true, consentVersion: '2026-10-v1', retentionDays: 90 }) }; },
    ...overrides,
  });
  return { client, local, session, requests, timers, advance: milliseconds => { time += milliseconds; }, go: path => { location = new URL(path, location); }, fail: status => { responseStatus = status; } };
}
const events = fixture => fixture.requests.filter(request => request.url.endsWith('/events'));

test('no identifiers or events before consent or after rejecting, and no backfill', async () => {
  const f = setup(); await f.client.initialize();
  f.client.track('page_view', {}, 'initial'); await f.client.flush();
  assert.equal(f.local.getItem(VISITOR_KEY), null); assert.equal(f.session.getItem(SESSION_KEY), null); assert.equal(events(f).length, 0);
  f.client.setConsent(false); f.client.track('page_view', {}, 'rejected'); await f.client.flush();
  const consent = JSON.parse(f.local.getItem(CONSENT_KEY));
  assert.equal(consent.analytics, false); assert.equal(consent.advertising, false); assert.ok(consent.timestamp); assert.equal(consent.version, '2026-10-v1');
  assert.equal(events(f).length, 0);
  f.client.setConsent(true); f.client.track('page_view', {}, 'initial'); f.client.track('page_view', {}, 'rejected'); await f.client.flush();
  assert.equal(events(f).length, 0);
  f.client.track('page_view', {}, 'next'); await f.client.flush();
  assert.equal(events(f).length, 1); assert.ok(f.local.getItem(VISITOR_KEY));
  assert.equal(events(f)[0].body.events.length, 1); assert.equal(events(f)[0].body.context.utm_source, 'newsletter');
  assert.equal(events(f)[0].body.context.referral, 'search.example');
  assert.ok(!JSON.stringify(events(f)[0].body).includes('private'));
});

test('withdrawal clears queue, storage and stale asynchronous successes; renewed consent gets new IDs', async () => {
  const f = setup(); await f.client.initialize(); f.client.setConsent(true);
  f.client.track('page_view'); const old = f.client.context().visitorId;
  const pending = f.client.prepare('add_to_cart', { productId, quantity: 1 });
  f.client.setConsent(false); f.client.commit(pending); await f.client.flush();
  assert.equal(events(f).length, 0); assert.equal(f.local.getItem(VISITOR_KEY), null); assert.equal(f.session.getItem(SESSION_KEY), null);
  assert.equal(f.requests.find(request => request.url.endsWith('/withdraw')).body.visitorId, old);
  f.client.setConsent(true); assert.notEqual(f.client.context().visitorId, old);
});

test('retries keep event IDs, stop after three attempts, and the queue is bounded', async () => {
  const f = setup(); await f.client.initialize(); f.client.setConsent(true); f.fail(503);
  f.client.track('page_view'); await f.client.flush(); await f.client.flush(); await f.client.flush(); await f.client.flush();
  assert.equal(events(f).length, 3); assert.equal(new Set(events(f).map(request => request.body.events[0].eventId)).size, 1);
  f.fail(202);
  for (let index = 0; index < 120; index++) f.client.track('page_view');
  for (let index = 0; index < 8; index++) await f.client.flush();
  assert.equal(events(f).slice(3).reduce((sum, request) => sum + request.body.events.length, 0), 100);
  assert.ok(events(f).every(request => request.body.events.length <= 20));
});

test('session expires after inactivity, disabled server stops collection, cross-tab withdrawal clears IDs', async () => {
  const f = setup(); await f.client.initialize(); f.client.setConsent(true);
  const before = f.client.context(); f.advance(30 * 60000); const after = f.client.context();
  assert.equal(before.visitorId, after.visitorId); assert.notEqual(before.sessionId, after.sessionId);
  f.local.setItem(CONSENT_KEY, JSON.stringify({ version: '2026-10-v1', analytics: false, timestamp: new Date().toISOString() })); f.client.syncConsent();
  assert.equal(f.client.context(), null); assert.equal(f.session.getItem(SESSION_KEY), null);
  f.client.setConsent(true); f.client.track('page_view'); f.fail(204); await f.client.flush();
  assert.equal(f.client.getSnapshot().enabled, false); assert.equal(f.local.getItem(VISITOR_KEY), null);
});

test('route/request retries and Strict Mode do not double count; cart and payment responses remain unchanged', async () => {
  const f = setup(); await f.client.initialize(); f.client.setConsent(true);
  let route = { pathname: `/product/${productId}`, key: 'product-1' };
  const requests = [];
  const shopping = axios.create({ adapter: async config => { requests.push(config); return { config, status: 200, headers: {}, data: { success: true, cartItems: [{ _id: productId, quantity: 2 }], message: 'Original response' } }; } });
  const uninstall = installShoppingAnalytics(shopping, f.client, () => route, 'https://api.example');
  await shopping.post('https://api.example/api/product/single', { productId });
  await shopping.post('https://api.example/api/product/single', { productId });
  const cart = await shopping.post('https://api.example/api/cart/add', { itemId: productId, size: 'M', color: 'Rose', userId: 'not-an-event-field' });
  assert.equal(cart.data.message, 'Original response');
  await shopping.post('https://api.example/api/cart/update', { itemId: productId, quantity: 1 }, { analyticsEvent: { name: 'remove_from_cart', quantity: 1, amount: 199, currency: 'INR' } });
  route = { pathname: '/Checkout', key: 'checkout-1' };
  await shopping.get('https://api.example/api/cart/get'); await shopping.get('https://api.example/api/cart/get');
  const paymentData = { razorpay_signature: 'unchanged', address: 'never recorded' };
  await shopping.post('https://api.example/api/order/verifyRazorpay', paymentData);
  assert.ok(requests.at(-1).headers['x-analytics-context']); assert.deepEqual(JSON.parse(requests.at(-1).data), paymentData);
  await f.client.flush();
  assert.deepEqual(events(f)[0].body.events.map(event => event.name), ['product_view', 'add_to_cart', 'remove_from_cart', 'checkout_started']);
  assert.ok(!JSON.stringify(events(f)[0].body).includes('unchanged'));
  f.client.setConsent(false);
  await shopping.post('https://api.example/api/order/verifyRazorpay', paymentData);
  assert.equal(requests.at(-1).headers['x-analytics-context'], undefined);
  uninstall();
});

test('tracking failure and blocked storage cannot reject shopping; sanitizer strips private data', async () => {
  const shopping = axios.create({ adapter: async config => ({ config, data: { success: true }, status: 200, headers: {} }) });
  installShoppingAnalytics(shopping, { prepare() { throw new Error('Offline'); }, context() { throw new Error('Offline'); } }, () => ({ pathname: '/cart', key: 'cart' }), 'https://api.example');
  assert.equal((await shopping.post('https://api.example/api/cart/add', { itemId: productId })).data.success, true);
  assert.equal((await shopping.post('https://api.example/api/order/verifyRazorpay', {})).data.success, true);
  const brokenStorage = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); }, removeItem() { throw new Error('Blocked'); } };
  const f = setup({ local: brokenStorage, session: brokenStorage }); await f.client.initialize(); f.client.setConsent(true); assert.ok(f.client.context());
  assert.equal(safePath('/order-detail/private-order?token=secret'), '/order-detail');
  assert.equal(safePath('/someone@example.com'), '/other');
  for (const term of ['me@example.com', '1234567890', 'https://secret.example', 'password please']) assert.equal(safeSearch(term), '');
  assert.equal(safeSearch('  Pink <lace>  '), 'pink lace');
  assert.deepEqual(attributionFromUrl('https://shop.example/?email=a@b.com&utm_source=a@b.com&utm_medium=email&utm_campaign=summer'), { utm_medium: 'email', utm_campaign: 'summer' });
});

test('a failed observed request can succeed on retry without duplicate events', async () => {
  const f = setup(); await f.client.initialize(); f.client.setConsent(true);
  const first = f.client.prepare('product_view', { productId }, 'retry-product');
  const retry = f.client.prepare('product_view', { productId }, 'retry-product');
  assert.equal(first, retry); f.client.commit(retry); f.client.commit(first); await f.client.flush();
  assert.equal(events(f)[0].body.events.length, 1);
  const preWithdrawal = f.client.prepare('product_view', { productId }, 'pending');
  f.client.setConsent(false); f.client.setConsent(true); f.client.commit(preWithdrawal);
  assert.equal(f.client.prepare('product_view', { productId }, 'pending'), null);
  await f.client.flush(); assert.equal(events(f).length, 1);
});

test('withdrawal aborts in-flight analytics and does not schedule a retry', async () => {
  let pendingSignal;
  const f = setup({ fetcher: async (url, options) => {
    if (url.endsWith('/config')) return { ok: true, json: async () => ({ enabled: true, consentVersion: '2026-10-v1' }) };
    if (url.endsWith('/withdraw')) return { status: 204 };
    pendingSignal = options.signal;
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Aborted'))));
  } });
  await f.client.initialize(); f.client.setConsent(true); f.client.track('page_view');
  const sending = f.client.flush(); f.client.setConsent(false); await sending;
  assert.equal(pendingSignal.aborted, true); assert.equal(f.timers.size, 0); assert.equal(f.client.context(), null);
});
