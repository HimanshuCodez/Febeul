import { test, expect } from '@playwright/test';

const admin = 'http://127.0.0.1:5179';
const user = { _id: '650000000000000000000001', name: 'Amelia Rose', email: 'amelia@example.test', role: 'user', createdAt: '2026-10-01' };
const order = { _id: '650000000000000000000002', orderItemId: '12345678', userId: user, items: [], orderTotal: 250, productAmount: 250, date: Date.now(), orderStatus: 'Order Placed', paymentMethod: 'COD', payment: false, address: { name: user.name, email: user.email, state: 'Delhi', city: 'Delhi', zip: '110001' } };
const coupon = { _id: '650000000000000000000003', code: 'ROSE20', description: 'Rose offer', discountType: 'percentage', discountValue: 20, expiryDate: '2030-01-01', isActive: true, usageCount: 0, createdAt: '2026-10-01', applicableSKUs: [], specificUsers: [] };
const product = { _id: '650000000000000000000004', name: 'Rose Lace Set', category: 'Lingerie', date: Date.now(), variations: [{ sku: 'ROSE-42', images: [], sizes: [{ size: 'M', price: 250, stock: 5 }] }] };
const entries = [
  { type: 'Users', title: user.name, subtitle: user.email, href: '/allusers?search=amelia%40example.test', keys: 'rose amelia' },
  { type: 'Orders', title: 'Order #12345678', subtitle: 'Order Placed', href: `/orders?search=${order._id}`, keys: '12345678' },
  { type: 'Coupons', title: coupon.code, subtitle: 'Rose offer', href: '/coupons?search=ROSE20', keys: 'rose rose20' },
  { type: 'Products', title: product.name, subtitle: 'Lingerie', href: `/list?search=${product._id}`, keys: 'rose rose-42' },
];

async function mockAdmin(page, { role = 'admin', permissions = [] } = {}) {
  await page.addInitScript(({ role, permissions }) => {
    localStorage.setItem('token', 'local-search-test');
    localStorage.setItem('role', role);
    localStorage.setItem('permissions', JSON.stringify(permissions));
  }, { role, permissions });
  const data = { calls: [], errors: [], outage: false, delay: false };
  page.on('pageerror', error => data.errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === admin) return route.continue();
    if (url.origin !== 'http://127.0.0.1:4198') return route.abort();
    data.calls.push({ path: url.pathname, query: url.searchParams.get('q'), method: route.request().method() });
    let body = { success: true };
    if (url.pathname === '/api/admin/search') {
      if (data.outage) return route.fulfill({ status: 503, json: { success: false } });
      const query = url.searchParams.get('q').toLowerCase();
      if (data.delay && query === 'rose') await new Promise(resolve => setTimeout(resolve, 800));
      const matched = role === 'admin' ? entries.filter(entry => entry.keys.includes(query)) : [];
      body = { success: true, groups: matched.map(entry => ({ type: entry.type, items: [{ ...entry, id: entry.href }] })), unavailable: [] };
    } else if (url.pathname.endsWith('/dashboard-stats')) {
      body.stats = { totalUsers: 2, totalOrders: 1, revenue: 250, avgOrderValue: 250 };
    } else if (url.pathname.endsWith('/monthly-trends') || url.pathname.endsWith('/daily-trends')) body.trends = [];
    else if (url.pathname.endsWith('/category-sales')) body.sales = [];
    else if (url.pathname.endsWith('/recent-orders')) body.orders = [];
    else if (url.pathname.endsWith('/sku-sales')) body.skuSales = [];
    else if (url.pathname.endsWith('/sku-stocks')) body.skuStocks = [];
    else if (url.pathname === '/api/user/allusers') body.users = [user, { ...user, _id: 'other', name: 'Other Customer', email: 'other@example.test' }];
    else if (url.pathname === '/api/order/list') body.orders = [order, { ...order, _id: '650000000000000000000099', orderItemId: '87654321' }];
    else if (url.pathname === '/api/coupon/list') body.coupons = [coupon, { ...coupon, _id: 'other', code: 'OTHER10', description: 'Another offer' }];
    else if (url.pathname === '/api/coupon/usage-all') body.allUsage = [];
    else if (url.pathname === '/api/product/list') body.products = [product, { ...product, _id: 'other', name: 'Other Product' }];
    else if (url.pathname.startsWith('/api/cms/')) body.data = {};
    await route.fulfill({ json: body });
  });
  return data;
}

test('search finds records and opens existing filtered user, coupon, order and product pages', async ({ page }) => {
  const data = await mockAdmin(page);
  for (const [query, title, placeholder, value, excluded] of [
    ['Amelia', 'Amelia Rose', 'Search name, email, phone...', user.email, 'Other Customer'],
    ['ROSE20', 'ROSE20', 'Search by code or description...', 'ROSE20', 'OTHER10'],
    ['12345678', 'Order #12345678', 'Search by Order ID, Order Item ID, name, email, phone, AWB...', order._id, '#87654321'],
    ['ROSE-42', 'Rose Lace Set', 'Search by Name, Category, SKU or Color', product._id, 'Other Product'],
  ]) {
    await page.goto(admin, { waitUntil: 'domcontentloaded' });
    await page.getByRole('combobox', { name: 'Search the admin' }).fill(query);
    await page.getByRole('option', { name: new RegExp(title) }).click();
    await expect(page.getByPlaceholder(placeholder)).toHaveValue(value);
    await expect(page.getByText(excluded, { exact: true })).toHaveCount(0);
    await page.getByPlaceholder(placeholder).fill('');
    await expect(page.getByText(excluded, { exact: true }).first()).toBeVisible();
  }
  expect(data.errors).toEqual([]);
  // Visiting records must not trigger any create/edit/delete action (order/list is an existing read POST).
  expect(data.calls.filter(call => call.method === 'POST').every(call => call.path === '/api/order/list')).toBe(true);
});

test('settings, keyboard navigation, dismissal and empty results work', async ({ page }) => {
  const data = await mockAdmin(page);
  await page.goto(admin);
  const input = page.getByRole('combobox', { name: 'Search the admin' });
  await expect(input).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await input.fill('not-a-real-entry');
  await expect(page.getByText('No matches.', { exact: false })).toBeVisible();
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await input.fill('shipping charge');
  await expect(page.getByRole('option', { name: 'Configurations Settings' })).toBeVisible();
  await expect(page.getByLabel('Searching records')).toHaveCount(0);
  await input.press('ArrowDown'); await input.press('Enter');
  await expect(page).toHaveURL(`${admin}/configurations`);
  await expect(page.getByRole('heading', { name: 'Site Configurations' })).toBeVisible();
  expect(data.errors).toEqual([]);
});

test('search errors leave dashboard controls and page shortcuts usable', async ({ page }) => {
  const data = await mockAdmin(page); data.outage = true;
  await page.goto(admin);
  await page.getByRole('combobox', { name: 'Search the admin' }).fill('coupon');
  await expect(page.getByRole('status')).toContainText('Record search is unavailable');
  await page.getByRole('option', { name: 'Coupons Sales' }).click();
  await expect(page).toHaveURL(`${admin}/coupons`);
  await expect(page.getByPlaceholder('Search by code or description...')).toHaveValue('');
  await page.goto(admin);
  const before = data.calls.filter(call => call.path.endsWith('/dashboard-stats')).length;
  await page.getByTitle('Refresh data').click();
  await expect.poll(() => data.calls.filter(call => call.path.endsWith('/dashboard-stats')).length).toBeGreaterThan(before);
  expect(data.errors).toEqual([]);
});

test('restricted staff only see permitted page shortcuts', async ({ page }) => {
  const data = await mockAdmin(page, { role: 'staff', permissions: ['/'] });
  await page.goto(admin);
  await page.getByRole('combobox', { name: 'Search the admin' }).fill('settings');
  await expect(page.getByText('No matches.', { exact: false })).toBeVisible();
  expect(data.calls.some(call => call.path === '/api/user/allusers')).toBe(false);
  expect(data.errors).toEqual([]);
});

test('debouncing and cancellation prevent stale records after clearing or changing a query', async ({ page }) => {
  const data = await mockAdmin(page); data.delay = true;
  await page.goto(admin);
  const input = page.getByRole('combobox', { name: 'Search the admin' });
  await input.fill('rose');
  await expect.poll(() => data.calls.some(call => call.query === 'rose')).toBe(true);
  await input.fill('12345678');
  await expect(page.getByRole('option', { name: 'Order #12345678 Order Placed' })).toBeVisible();
  await page.waitForTimeout(900);
  await expect(page.getByRole('option', { name: /Amelia/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear universal search' }).click();
  await expect(input).toHaveValue('');
  await expect(page.getByRole('option', { name: /Order #12345678/ })).toHaveCount(0);
  expect(data.errors).toEqual([]);
});

test('desktop and mobile search results remain accessible within the search bar width', async ({ page }) => {
  await mockAdmin(page);
  await page.goto(admin);
  const input = page.getByRole('combobox', { name: 'Search the admin' });
  await input.fill('rose');
  await expect(page.getByRole('option', { name: /Amelia/ })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('search-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await input.scrollIntoViewIfNeeded();
  const list = page.getByRole('listbox', { name: 'Admin search results' });
  const box = await list.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: test.info().outputPath('search-mobile.png') });
  await page.getByRole('option', { name: /Amelia/ }).click();
  await expect(page.getByPlaceholder('Search name, email, phone...')).toHaveValue(user.email);
});
