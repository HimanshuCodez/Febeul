import { test, expect } from '@playwright/test';

const shop = 'http://127.0.0.1:5177', admin = 'http://127.0.0.1:5178';
const productId = '507f1f77bcf86cd799439011';
const product = { _id: productId, name: 'Rose Lace Set', description: 'Test product', category: 'Lingerie', sizes: ['M'], variations: [{ color: 'Rose', sku: 'TEST-ROSE', images: ['/test-product.svg'], sizes: [{ size: 'M', price: 199, mrp: 249, stock: 10 }] }], price: 199, quantity: 1, color: 'Rose', size: 'M', averageRating: 0, numOfReviews: 0 };
const user = { _id: '507f1f77bcf86cd799439022', email: 'buyer@example.test', name: 'Test Buyer', isLuxeMember: false, addresses: [{ _id: 'address-local', name: 'Test Buyer', address: 'Test street', city: 'Delhi', state: 'Delhi', zip: '110001', country: 'India', phone: '9999999999', addressType: 'Home' }] };

async function mockStore(page, { outage = false } = {}) {
  const calls = [], events = [];
  let cart = [{ ...product }];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/api/')) {
      let body;
      try { body = req.postDataJSON(); } catch { /* no body */ }
      calls.push({ path: url.pathname, body, headers: req.headers() });
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { enabled: true, success: true, consentVersion: '2026-10-v1', retentionDays: 90 } });
      if (url.pathname === '/api/analytics/events') { if (!outage) events.push(...body.events); return route.fulfill({ status: outage ? 503 : 202, json: { success: !outage } }); }
      if (url.pathname === '/api/analytics/withdraw') return route.fulfill({ status: 204 });
      if (url.pathname === '/api/user/profile') return route.fulfill({ json: { success: true, user } });
      if (url.pathname === '/api/product/single') return route.fulfill({ json: { success: true, product } });
      if (url.pathname === '/api/product/list') return route.fulfill({ json: { success: true, products: [product], totalPages: 1 } });
      if (url.pathname === '/api/cart/get') return route.fulfill({ json: { success: true, cartItems: cart, giftWrap: null } });
      if (url.pathname === '/api/cart/add') cart = [{ ...product }];
      if (url.pathname === '/api/cart/update') cart = [{ ...product, quantity: body.quantity }];
      if (url.pathname === '/api/cart/remove') cart = [];
      if (url.pathname === '/api/order/get-key') return route.fulfill({ json: { success: true, key: 'rzp_test_local' } });
      if (url.pathname === '/api/order/razorpay') return route.fulfill({ json: { success: true, order: { id: 'order_local', receipt: '507f1f77bcf86cd799439033', amount: 24900 } } });
      return route.fulfill({ json: { success: true, content: null, products: [], wishlist: [], tickets: [], coupons: [], giftWraps: [], reviews: [], policies: [], messages: [] } });
    }
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/test-product.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="pink"/></svg>' });
    return route.continue();
  });
  return { calls, events, errors };
}
const flush = page => page.evaluate(async () => { const { analytics } = await import('/src/analytics/runtime.js'); await analytics.flush(); });
const storedIDs = page => page.evaluate(() => [localStorage.getItem('febeul.analytics-visitor'), sessionStorage.getItem('febeul.analytics-session')]);

test('responsive consent, rejecting, accepting, no backfill, and withdrawal through footer', async ({ page }) => {
  const data = await mockStore(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(`${shop}/products`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('consent-mobile.png') });
  expect(await storedIDs(page)).toEqual([null, null]);
  await page.getByRole('button', { name: 'Manage preferences', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cookie settings' })).toBeVisible();
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  await flush(page); expect(data.events).toHaveLength(0); expect(await storedIDs(page)).toEqual([null, null]);
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await flush(page); expect(data.events).toHaveLength(0);
  await page.goto(`${shop}/products?search=pink%20lace&token=secret`, { waitUntil: 'domcontentloaded' });
  await expect.poll(async () => (await storedIDs(page))[0]).not.toBeNull(); await flush(page);
  expect(data.events.filter(event => event.name === 'page_view')).toHaveLength(1);
  expect(data.events.filter(event => event.name === 'search')).toHaveLength(1);
  expect(JSON.stringify(data.events)).not.toContain('secret');
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await page.getByRole('checkbox').uncheck(); await page.getByRole('button', { name: 'Save preferences' }).click();
  expect(await storedIDs(page)).toEqual([null, null]);
  await page.goto(`${shop}/products?search=another`, { waitUntil: 'domcontentloaded' }); await flush(page);
  expect(data.events).toHaveLength(2); expect(data.calls.some(call => call.path === '/api/analytics/withdraw')).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(data.errors).toEqual([]);
});

test('Accept all enables future activity without replaying the current page', async ({ page }) => {
  const data = await mockStore(page);
  await page.goto(`${shop}/products`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Accept all', exact: true }).click(); await flush(page);
  expect(data.events).toHaveLength(0);
  const consent = await page.evaluate(() => JSON.parse(localStorage.getItem('febeul.cookie-consent')));
  expect(consent.analytics).toBe(true); expect(consent.advertising).toBe(false); expect(consent.timestamp).toBeTruthy();
});

test('product view, add-to-bag and cart quantity/removal events follow actual UI success', async ({ page }) => {
  const data = await mockStore(page);
  await page.addInitScript(() => localStorage.setItem('token', 'local-test-token'));
  await page.goto(`${shop}/products`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await page.locator(`a[href^="/product/${productId}"]`).first().click();
  await page.getByRole('button', { name: 'Add to Bag', exact: true }).click();
  await expect.poll(() => data.calls.filter(call => call.path === '/api/cart/add').length).toBe(1);
  await flush(page);
  expect(data.events.filter(event => event.name === 'product_view')).toHaveLength(1);
  expect(data.events.filter(event => event.name === 'add_to_cart')).toHaveLength(1);
  await page.goto(`${shop}/cart`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '+', exact: true }).click();
  await expect.poll(() => data.calls.filter(call => call.path === '/api/cart/update').length).toBe(1);
  await page.getByRole('button', { name: '-', exact: true }).click();
  await expect.poll(() => data.calls.filter(call => call.path === '/api/cart/update').length).toBe(2);
  await page.getByRole('button', { name: '-', exact: true }).click();
  await expect.poll(() => data.calls.filter(call => call.path === '/api/cart/remove').length).toBe(1);
  await flush(page);
  expect(data.events.filter(event => event.name === 'remove_from_cart')).toHaveLength(2);
  expect(data.errors).toEqual([]);
});

test('cart and checkout complete with analytics unavailable; withdrawal before callback omits analytics context', async ({ page }) => {
  const data = await mockStore(page, { outage: true });
  await page.addInitScript(() => {
    localStorage.setItem('token', 'local-test-token');
    localStorage.setItem('febeul.cookie-consent', JSON.stringify({ version: '2026-10-v1', timestamp: new Date().toISOString(), analytics: true, advertising: false }));
    window.Razorpay = function (options) { window.testPayment = options; this.open = () => { window.paymentOpened = true; }; };
  });
  await page.goto(`${shop}/cart`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Rose Lace Set', { exact: true }).first()).toBeVisible();
  await flush(page);
  await page.goto(`${shop}/Checkout`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Use this address' }).click();
  await page.getByText('Upi / Net Banking / Card', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Place Order', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.paymentOpened)).toBe(true);
  const order = data.calls.find(call => call.path === '/api/order/razorpay');
  expect(order.body.items[0].productId).toBe(productId); expect(order.body.currency).toBe('INR');
  await page.evaluate(async () => { const { analytics } = await import('/src/analytics/runtime.js'); analytics.setConsent(false); await window.testPayment.handler({ razorpay_order_id: 'order_local', razorpay_payment_id: 'pay_local', razorpay_signature: 'signature_local' }); });
  const verification = data.calls.find(call => call.path === '/api/order/verifyRazorpay');
  expect(verification.headers['x-analytics-context']).toBeUndefined();
  expect(verification.body.razorpay_signature).toBe('signature_local'); expect(data.events).toHaveLength(0);
  expect(data.errors).toEqual([]);
});

test('User Tracking dashboard uses existing sidebar route, handles empty results, filters, pagination and errors', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'local-admin'); localStorage.setItem('role', 'admin'); });
  const seen = []; let fail = false;
  const metrics = { success: true, config: { enabled: true, retentionDays: 90, abandonmentMinutes: 30 }, visitors: { total: 0, new: 0, returning: 0 }, sessions: { total: 0, purchasing: 0, product: 0, cart: 0, checkout: 0, purchase: 0 }, conversionRate: 0, activity: [], products: [], searches: [], sources: [], payments: [], trackedPayments: [], operational: [], abandonment: { abandoned: 0, checkouts: 0, purchased: 0 } };
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()); seen.push(url);
    if (fail) return route.fulfill({ status: 503, json: { success: false, message: 'Test service unavailable' } });
    return route.fulfill({ json: url.pathname.endsWith('/journeys') ? { success: true, page: Number(url.searchParams.get('page')), total: 12, rows: [], pageSize: 10 } : metrics });
  });
  await page.goto(`${admin}/user-tracking`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Ecommerce analytics' })).toBeVisible();
  await expect(page.getByText('Partial coverage:', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'User Tracking' })).toHaveAttribute('href', '/user-tracking');
  await expect(page.getByText('No data in this range.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect.poll(() => seen.some(url => url.searchParams.get('page') === '2')).toBe(true);
  await page.getByLabel('From (UTC)', { exact: true }).fill('2026-10-01');
  await page.getByLabel('To (UTC, inclusive)', { exact: true }).fill('2026-10-05');
  await page.getByRole('button', { name: 'Apply dates' }).click();
  await expect.poll(() => seen.some(url => url.searchParams.get('from') === '2026-10-01')).toBe(true);
  fail = true; await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('alert').first()).toContainText('Test service unavailable');
  fail = false; await page.getByRole('button', { name: 'Retry', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Popular products' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('analytics-dashboard.png'), fullPage: true });
});
