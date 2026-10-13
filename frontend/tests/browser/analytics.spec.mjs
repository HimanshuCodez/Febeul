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

test('Home keeps cookie choices accessible before the timed membership popup', async ({ page }) => {
  const data = await mockStore(page);
  await page.clock.install();
  await page.goto(`${shop}/`, { waitUntil: 'domcontentloaded' });
  const banner = page.getByRole('region', { name: 'Cookie consent' });
  await expect(banner).toBeVisible();
  await page.clock.fastForward(3500);
  await expect(page.getByRole('button', { name: 'Close membership popup' })).toHaveCount(0);
  expect(await storedIDs(page)).toEqual([null, null]);
  await page.screenshot({ path: test.info().outputPath('consent-home-desktop.png') });
  await page.getByRole('button', { name: 'Manage preferences', exact: true }).click();
  await page.clock.fastForward(3500);
  await expect(page.getByRole('dialog', { name: 'Cookie settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close membership popup' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  await page.clock.fastForward(2500);
  await expect(page.getByRole('button', { name: 'Close membership popup' })).toBeVisible();
  await expect(banner).toHaveCount(0);
  await page.getByRole('button', { name: 'Close membership popup' }).click();
  await page.clock.runFor(500);
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await page.clock.fastForward(2500);
  await expect(page.getByRole('button', { name: 'Close membership popup' })).toHaveCount(0);
  await flush(page);
  expect(data.events).toHaveLength(0);
  expect(data.errors).toEqual([]);
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

async function mockJourneyDetails(page) {
  await page.addInitScript(() => { localStorage.setItem('token', 'local-admin'); localStorage.setItem('role', 'admin'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const account = { _id: '650000000000000000000001', name: 'Amelia Rose', email: 'amelia@example.test' };
  const stages = { product: ['product_view'], cart: ['product_view', 'add_to_cart'], checkout: ['product_view', 'add_to_cart', 'checkout_started'], purchase: ['product_view', 'add_to_cart', 'checkout_started', 'purchase'] };
  const uuid = index => '00000000-0000-4000-8000-' + String(index).padStart(12, '0');
  const event = (name, userId) => ({ name, timestamp: '2026-10-10T10:00:00Z', path: '/products', ...(userId ? { userId } : {}), ...(['product_view', 'add_to_cart', 'remove_from_cart'].includes(name) ? { productId, productName: 'Rose Lace Set' } : {}), ...(['add_to_cart', 'remove_from_cart'].includes(name) ? { quantity: 2 } : {}), ...(name === 'search' ? { searchTerm: 'rose lace' } : {}), ...(name === 'purchase' ? { orderId: '650000000000000000000099', amount: 199, currency: 'INR', items: [{ productId, name: 'Rose Lace Set', quantity: 2 }] } : {}) });
  const rows = Array.from({ length: 16 }, (_, index) => {
    const names = index === 0 ? ['page_view', ...stages.purchase, 'remove_from_cart', 'search'] : index === 1 ? stages.checkout : index < 6 ? stages.product : ['add_to_cart'];
    const timeline = names.map(name => event(name, index === 0 && !['product_view', 'page_view'].includes(name) ? account._id : null));
    return { _id: uuid(index + 1), visitorId: uuid(index + 101), names, events: timeline.length, firstAt: '2026-10-10T10:00:00Z', lastAt: '2026-10-10T11:00:00Z', timeline };
  });
  const metrics = { success: true, config: { enabled: true, retentionDays: 90, abandonmentMinutes: 30 }, visitors: { total: 16, new: 16, returning: 0 }, sessions: { total: 16, purchasing: 1, product: 6, cart: 2, checkout: 2, purchase: 1 }, conversionRate: 6.25, activity: [{ _id: 'add_to_cart', events: 12 }, { _id: 'remove_from_cart', events: 1 }, { _id: 'checkout_started', events: 2 }], products: [], searches: [], sources: [], payments: [], trackedPayments: [], operational: [], abandonment: { abandoned: 1, checkouts: 2, purchased: 1 } };
  const state = { calls: [], errors: [], fail: false, empty: false, delay: false };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      state.calls.push({ url, method: request.method(), token: request.headers().token });
      if (!url.pathname.endsWith('/journeys')) return route.fulfill({ json: metrics });
      if (state.fail) return route.fulfill({ status: 503, json: { success: false, message: 'Journey details temporarily unavailable' } });
      const stage = url.searchParams.get('stage'), type = url.searchParams.get('event'), sessionId = url.searchParams.get('sessionId');
      if (state.delay && stage === 'cart') await new Promise(resolve => setTimeout(resolve, 700));
      const required = stages[stage] || (type ? [type] : []);
      const selected = required.at(-1), pageNumber = Number(url.searchParams.get('page') || 1);
      const matching = state.empty ? [] : rows.filter(row => required.every(name => row.names.includes(name)) && (!sessionId || row._id === sessionId));
      return route.fulfill({ json: { success: true, total: matching.length, page: pageNumber, pageSize: 10, rows: matching.slice((pageNumber - 1) * 10, pageNumber * 10).map(row => {
        const timeline = row.timeline.filter(item => !selected || item.name === selected);
        return { ...row, timeline, matchingEvents: timeline.length, anonymousEvents: timeline.filter(item => !item.userId).length, accounts: timeline.some(item => item.userId === account._id) ? [account] : [] };
      }) } });
    }
    if (url.origin === admin) return route.continue();
    return route.abort();
  });
  return state;
}

test('funnel stages reveal matching accounts and guest activity, purchase items and full sessions', async ({ page }) => {
  const state = await mockJourneyDetails(page);
  await page.goto(`${admin}/user-tracking`);
  const journeys = page.getByRole('region', { name: 'Consented visitor journeys' });
  for (const [stage, label, count] of [['product', 'Product viewed', 6], ['cart', 'Also added to cart', 2], ['checkout', 'Also started checkout', 2], ['purchase', 'Also purchased', 1]]) {
    await page.getByRole('button', { name: new RegExp('^' + label) }).click();
    await expect(page.getByLabel('Activity filter')).toHaveValue('stage:' + stage);
    await expect(journeys.locator('details')).toHaveCount(count);
    await expect(journeys.getByRole('heading', { name: label, exact: true })).toBeVisible();
    if (stage === 'product') await expect(journeys.getByText('amelia@example.test', { exact: true })).toHaveCount(0);
    else await expect(journeys.getByText('amelia@example.test', { exact: true })).toBeVisible();
  }
  await journeys.locator('summary').first().click();
  await expect(journeys.getByText('Verified payment: INR 199')).toBeVisible();
  await expect(journeys.getByText(/Order: 650000000000000000000099/)).toBeVisible();
  await expect(journeys.getByText(/Rose Lace Set.*Qty 2/)).toBeVisible();
  await journeys.getByRole('button', { name: 'View full journey' }).click();
  await expect(page.getByLabel('Activity filter')).toHaveValue('session');
  await expect(journeys.locator('details')).toHaveCount(1);
  await expect(journeys.getByText('Guest / unidentified', { exact: true }).first()).toBeVisible();
  await expect(journeys.getByText('Quantity: 2').first()).toBeVisible();
  await expect(journeys.getByText(/Search:.*rose lace/)).toBeVisible();
  await expect(journeys.locator('summary').getByText('Amelia Rose', { exact: false })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await journeys.evaluate(element => element.scrollIntoView({ block: 'start' }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    if ([390, 1440].includes(width)) await page.screenshot({ path: test.info().outputPath('journey-details-' + width + '.png') });
  }
  expect(state.calls.every(call => call.method === 'GET' && call.token === 'local-admin')).toBe(true);
  expect(state.errors).toEqual([]);
});

test('journey activity filters preserve pagination/dates and handle errors, empty and stale responses', async ({ page }) => {
  const state = await mockJourneyDetails(page);
  await page.goto(`${admin}/user-tracking`);
  const journeys = page.getByRole('region', { name: 'Consented visitor journeys' });
  await page.getByRole('button', { name: /^Add-to-cart events/ }).click();
  await expect(page.getByLabel('Activity filter')).toHaveValue('event:add_to_cart');
  await expect(journeys.locator('details')).toHaveCount(10);
  await journeys.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(journeys.locator('details')).toHaveCount(2);
  expect(state.calls.at(-1).url.searchParams.get('event')).toBe('add_to_cart');
  expect(state.calls.at(-1).url.searchParams.get('page')).toBe('2');
  await page.getByLabel('From (UTC)', { exact: true }).fill('2026-10-01');
  await page.getByLabel('To (UTC, inclusive)', { exact: true }).fill('2026-10-11');
  await page.getByRole('button', { name: 'Apply dates' }).click();
  await expect(journeys.locator('details')).toHaveCount(10);
  expect(state.calls.filter(call => call.url.pathname.endsWith('/journeys')).at(-1).url.searchParams.get('page')).toBe('1');
  await page.getByLabel('Activity filter').selectOption('event:search');
  await expect(journeys.locator('details')).toHaveCount(1);
  await journeys.locator('summary').click();
  await expect(journeys.getByText(/Search:.*rose lace/)).toBeVisible();
  state.fail = true;
  await page.getByLabel('Activity filter').selectOption('event:remove_from_cart');
  await expect(journeys.getByRole('alert')).toContainText('Journey details temporarily unavailable');
  state.fail = false;
  await journeys.getByRole('button', { name: 'Retry' }).click();
  await expect(journeys.locator('details')).toHaveCount(1);
  state.empty = true;
  await page.getByLabel('Activity filter').selectOption('event:page_view');
  await expect(journeys.getByText('No consented sessions match this activity in the selected range.')).toBeVisible();
  state.empty = false; state.delay = true;
  await page.getByRole('button', { name: /^Also added to cart/ }).click();
  await expect.poll(() => state.calls.some(call => call.url.searchParams.get('stage') === 'cart')).toBe(true);
  await page.getByRole('button', { name: /^Product viewed/ }).click();
  await expect(journeys.locator('details')).toHaveCount(6);
  await page.waitForTimeout(800);
  await expect(journeys.getByText('amelia@example.test', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Activity filter')).toHaveValue('stage:product');
  await journeys.getByRole('button', { name: 'Clear activity filter' }).click();
  await expect(page.getByLabel('Activity filter')).toHaveValue('all');
  await expect(journeys.locator('details')).toHaveCount(10);
  expect(state.errors).toEqual([]);
});
