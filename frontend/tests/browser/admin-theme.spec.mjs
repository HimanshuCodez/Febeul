import { test, expect } from '@playwright/test';

const admin = 'http://127.0.0.1:5179';
const product = { _id: 'product-one', name: 'Rose Lace Set', category: 'BABYDOLL', description: '<p>Soft lace</p>', date: Date.now(), variations: [{ sku: 'ROSE-42', color: 'Rose', images: [], sizes: [{ size: 'M', price: 399, mrp: 499, stock: 10 }] }] };
const user = { _id: 'user-one', name: 'Sample Customer', email: 'shopper@example.test', role: 'user', createdAt: '2026-10-01', addresses: [] };

async function fixture(context, { authenticated = true, preference } = {}) {
  const state = { errors: [], writes: [] };
  await context.addInitScript(({ authenticated, preference }) => {
    if (location.origin !== 'http://127.0.0.1:5179') return;
    if (localStorage.getItem('theme-test-ready')) return;
    localStorage.setItem('theme-test-ready', 'true');
    if (authenticated) {
      localStorage.setItem('token', 'local-theme-test');
      localStorage.setItem('role', 'admin');
      localStorage.setItem('userEmail', 'admin@example.test');
      localStorage.setItem('permissions', '[]');
    }
    if (preference) localStorage.setItem('febeul-admin-theme', preference);
  }, { authenticated, preference });
  context.on('page', page => page.on('pageerror', error => state.errors.push(error.message)));
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === admin) return route.continue();
    if (url.origin !== 'http://127.0.0.1:4198') return route.abort();
    if (url.pathname === '/api/giftwrap/list') return route.fulfill({ json: { success: true, data: [] } });
    if (url.pathname === '/api/policy') return route.fulfill({ json: [] });
    if (url.pathname === '/api/cms/socialSettings') return route.fulfill({ json: { success: true, content: { links: [] } } });
    if (request.method() !== 'GET' && !['/api/product/single', '/api/order/list'].includes(url.pathname)) state.writes.push(url.pathname);
    const result = {
      success: true, content: null, data: {}, products: [product], product, users: [user], orders: [],
      tickets: [], coupons: [], reviews: [], images: [], giftWraps: [], policies: [], exchanges: [], returns: [], requests: [], allUsage: [],
      stats: { totalUsers: 1, totalOrders: 12, revenue: 5400, avgOrderValue: 450 },
      sales: [{ name: 'BABYDOLL', value: 100 }],
      trends: url.pathname.endsWith('monthly-trends') ? [{ month: 'Oct', orders: 12 }] : [{ date: '2026-10-28', revenue: 2400 }, { date: '2026-10-29', revenue: 3000 }],
      skuSales: [{ sku: 'ROSE-42', name: product.name, quantity: 12 }],
      skuStocks: [{ sku: 'ROSE-42', name: product.name, stock: 10 }],
    };
    await route.fulfill({ json: result });
  });
  return state;
}

const toggle = (page, target = 'dark') => page.getByRole('button', { name: `Switch to ${target} mode`, exact: true });
const background = locator => locator.evaluate(element => getComputedStyle(element).backgroundColor);
const luminance = color => {
  const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels.reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
};
async function expectDarkSurface(locator) {
  const color = await background(locator);
  expect(color).not.toBe('rgba(0, 0, 0, 0)');
  expect(luminance(color)).toBeLessThan(.15);
}

test('dashboard toggles with the keyboard and updates cards, inputs, charts and contrast', async ({ context }, testInfo) => {
  const state = await fixture(context);
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto(admin);
  const metric = page.locator('.overview-metric:not(.overview-metric-featured)').first();
  await expect(metric).toBeVisible();
  expect(await background(metric)).toBe('rgb(255, 255, 255)');
  await toggle(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(toggle(page, 'light')).toHaveAttribute('aria-pressed', 'true');
  await expectDarkSurface(metric);
  await expectDarkSurface(page.locator('.overview-panel').first());
  const headingColor = await page.getByRole('heading', { name: /Store overview/ }).evaluate(element => getComputedStyle(element).color);
  const canvasColor = await background(page.locator('.admin-app'));
  expect((luminance(headingColor) + .05) / (luminance(canvasColor) + .05)).toBeGreaterThan(4.5);
  await expect(page.locator('.recharts-cartesian-grid line').first()).toHaveCSS('stroke', 'rgb(55, 65, 83)');
  await page.screenshot({ path: testInfo.outputPath('dashboard-dark.png'), fullPage: true });
  await toggle(page, 'light').click();
  expect(await background(metric)).toBe('rgb(255, 255, 255)');
  await page.screenshot({ path: testInfo.outputPath('dashboard-light.png'), fullPage: true });
  expect(state.errors).toEqual([]);
});

test('theme persists across navigation and reload without resetting product drafts', async ({ context }, testInfo) => {
  const state = await fixture(context, { preference: 'dark' });
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(`${admin}/add`);
  await expect(page.getByLabel('Product name', { exact: true })).toBeEnabled();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Product name', { exact: true }).fill('Keep my unsaved listing');
  await expectDarkSurface(page.locator('#product-basics'));
  await expectDarkSurface(page.getByLabel('Product name', { exact: true }));
  await expectDarkSurface(page.locator('.ql-toolbar'));
  await page.screenshot({ path: testInfo.outputPath('product-dark.png'), fullPage: true });
  await toggle(page, 'light').click();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Keep my unsaved listing');
  expect(await background(page.locator('#product-basics'))).toBe('rgb(255, 255, 255)');
  await toggle(page).click();
  await page.reload();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Keep my unsaved listing');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto(`${admin}/list`);
  await expect(page.getByText('Rose Lace Set', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectDarkSurface(page.getByPlaceholder('Search by Name, Category, SKU or Color'));
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('all admin page families inherit dark surfaces and dialogs remain readable', async ({ context }, testInfo) => {
  const state = await fixture(context, { preference: 'dark' });
  const page = await context.newPage();
  for (const path of ['/orders', '/allusers', '/tickets', '/reviews', '/coupons', '/configurations', '/product-taxonomy', '/update/product-one', '/gift-wraps', '/images', '/policy-update', '/send-mail', '/maintenance', '/socials-settings', '/reset-data', '/staff-tracking', '/exchanges', '/return-requests']) {
    await page.goto(admin + path);
    await expect(toggle(page, 'light')).toBeVisible();
    await expect(page.locator('.admin-app h1, .admin-app h2').first(), path).toBeVisible();
    await expectDarkSurface(page.locator('.admin-app'));
    expect(state.errors, path).toEqual([]);
  }
  await page.goto(`${admin}/coupons`);
  await page.getByRole('button', { name: 'Create coupon', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expectDarkSurface(dialog.getByLabel('Coupon code', { exact: true }));
  await page.screenshot({ path: testInfo.outputPath('coupon-dialog-dark.png'), fullPage: true });
  expect(state.errors).toEqual([]);
});

test('system theme is followed until overridden and manual preference synchronizes across tabs', async ({ context }) => {
  const state = await fixture(context);
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`${admin}/list`);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const other = await context.newPage();
  await other.goto(`${admin}/list`);
  await toggle(page).click();
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await toggle(other, 'light').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(state.errors).toEqual([]);
});

test('mobile toggle fits in the header and remains available after logout', async ({ context }, testInfo) => {
  const state = await fixture(context, { preference: 'light' });
  const page = await context.newPage();
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(`${admin}/list`);
  const box = await toggle(page).boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await toggle(page).click();
  await page.goto(`${admin}/`);
  await expect(page.locator('.overview-metric').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();
  await expect(toggle(page, 'light')).toBeVisible();
  await toggle(page, 'light').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(state.errors).toEqual([]);
});

test('storefront previews keep their original light palette inside a dark admin', async ({ context }) => {
  const state = await fixture(context, { preference: 'dark' });
  const page = await context.newPage();
  await page.goto(`${admin}/typography`);
  const preview = page.locator('[data-theme="light"]');
  await expect(preview).toBeVisible();
  expect(await background(preview)).toBe('rgb(255, 255, 255)');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(state.errors).toEqual([]);
});

test('theme can still be changed when saving its preference is unavailable', async ({ context }) => {
  const state = await fixture(context, { preference: 'light' });
  const page = await context.newPage();
  await page.goto(`${admin}/list`);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'febeul-admin-theme') throw new DOMException('Storage unavailable', 'QuotaExceededError');
      return write.call(this, key, value);
    };
  });
  await toggle(page).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(state.errors).toEqual([]);
});
