import { test, expect } from '@playwright/test';

const admin = 'http://127.0.0.1:5182';
const coupon = (code, extra = {}) => ({
  _id: code, code, description: 'A little extra for your next order.', discountType: 'percentage', discountValue: 20,
  isActive: true, isLifetime: false, expiryDate: '2099-12-31T23:59:59.999Z', userType: 'normal', offerType: 'none',
  usageCount: 12, usageLimit: 100, usageLimitPerUser: 1, applicableSKUs: [], specificUsers: [], createdAt: '2026-10-01T10:00:00Z', ...extra,
});
async function fixture(page, { fail = false } = {}) {
  const state = { fail, errors: [], saved: [], coupons: [
    coupon('FOREVER10', { isLifetime: true, expiryDate: null, discountValue: 10, usageLimit: null }),
    coupon('WELCOME20'), coupon('SUMMER15', { expiryDate: '2020-01-01', discountValue: 15 }),
    coupon('LUXE30', { isLifetime: true, expiryDate: null, isActive: false, userType: 'luxe', discountValue: 30 }),
  ] };
  await page.addInitScript(() => {
    localStorage.setItem('token', 'local-coupon-test');
    localStorage.setItem('role', 'admin'); localStorage.setItem('permissions', '[]');
  });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === admin) return route.continue();
    if (url.origin !== 'http://127.0.0.1:4198') return route.abort();
    const respond = json => route.fulfill({ json });
    if (url.pathname === '/api/coupon/list') return state.fail
      ? route.fulfill({ status: 503, json: { success: false } }) : respond({ success: true, coupons: state.coupons });
    if (['/api/coupon/add', '/api/coupon/update'].includes(url.pathname)) {
      const body = route.request().postDataJSON(); state.saved.push(body);
      const saved = coupon(body.code, { ...body, _id: body.id || body.code });
      const index = state.coupons.findIndex(item => item._id === saved._id);
      if (index < 0) state.coupons.unshift(saved); else state.coupons[index] = saved;
      return respond({ success: true, coupon: saved });
    }
    if (url.pathname.startsWith('/api/coupon/usage/')) return respond({ success: true, users: [
      { userId: { _id: 'local-user', name: 'Sample customer', email: 'sample@example.test', mobile: '+910000000000' } },
    ] });
    return respond({ success: true, data: {}, content: {}, allUsage: [] });
  });
  await page.goto(admin + '/coupons');
  await expect(page.getByRole('heading', { name: 'Coupons', exact: true })).toBeVisible();
  return state;
}

test('create lifetime coupons, reopen them, and change validity without losing restrictions', async ({ page }, testInfo) => {
  const state = await fixture(page);
  await page.getByRole('button', { name: 'Create coupon', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Coupon code', { exact: true }).fill('EVERGREEN25');
  await dialog.getByLabel('Discount value (%)', { exact: true }).fill('25');
  await dialog.getByRole('radio', { name: /Lifetime/ }).check();
  await expect(dialog.getByLabel('Expiry date', { exact: true })).toHaveCount(0);
  await dialog.getByLabel('Product SKUs', { exact: true }).fill('ROSE-01, ROSE-02');
  await dialog.getByLabel('Specific customers', { exact: true }).fill('loyal@example.test');
  await dialog.getByLabel('Total redemption limit', { exact: true }).fill('50');
  await dialog.getByLabel('Limit per customer', { exact: true }).fill('2');
  await dialog.getByLabel('Coupon code', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('coupon-editor-desktop.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Create coupon', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.saved[0]).toMatchObject({ isLifetime: true, expiryDate: null, usageLimit: 50, usageLimitPerUser: 2, applicableSKUs: ['ROSE-01', 'ROSE-02'], specificUsers: ['loyal@example.test'] });
  await page.getByRole('button', { name: 'Edit EVERGREEN25', exact: true }).click();
  await expect(dialog.getByRole('radio', { name: /Lifetime/ })).toBeChecked();
  await expect(dialog.getByLabel('Product SKUs', { exact: true })).toHaveValue('ROSE-01, ROSE-02');
  await dialog.getByRole('radio', { name: /Fixed date/ }).check();
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  expect(state.saved).toHaveLength(1);
  await dialog.getByLabel('Expiry date', { exact: true }).fill('2099-12-31');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.saved[1]).toMatchObject({ isLifetime: false, expiryDate: '2099-12-31', applicableSKUs: ['ROSE-01', 'ROSE-02'] });
  await page.getByRole('button', { name: 'Edit WELCOME20', exact: true }).click();
  await dialog.getByRole('radio', { name: /Lifetime/ }).check();
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.saved[2]).toMatchObject({ isLifetime: true, expiryDate: null });
  expect(state.errors).toEqual([]);
});

test('status filters, CSV, usage history, and mobile layout handle lifetime coupons', async ({ page }, testInfo) => {
  const state = await fixture(page);
  const directory = page.getByRole('region', { name: 'Coupon directory' });
  await expect(directory.getByRole('row')).toHaveCount(5);
  await page.screenshot({ path: testInfo.outputPath('coupons-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Lifetime', exact: true }).click();
  await expect(directory.getByRole('row')).toHaveCount(3);
  await expect(directory.getByRole('row').filter({ hasText: 'FOREVER10' })).toContainText('Active');
  await expect(directory.getByRole('row').filter({ hasText: 'LUXE30' })).toContainText('Paused');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export coupons', exact: true }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream(); let csv = '';
  for await (const chunk of stream) csv += chunk.toString();
  expect(csv).toContain('Never expires'); expect(csv).not.toContain('Invalid Date'); expect(csv).not.toContain('WELCOME20');
  await page.getByRole('button', { name: 'View usage for FOREVER10', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('sample@example.test');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'All coupons', exact: true }).click();
  await page.getByLabel('Search coupons', { exact: true }).fill('summer');
  await expect(directory.getByRole('row')).toHaveCount(2);
  await expect(directory.getByRole('row').filter({ hasText: 'SUMMER15' })).toContainText('Expired');
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 850 });
    await expect(directory.getByRole('article', { name: 'Coupon FOREVER10', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Edit FOREVER10', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('radio', { name: /Lifetime/ })).toBeChecked();
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`coupon-editor-${width}.png`) });
    await page.keyboard.press('Escape');
    await page.screenshot({ path: testInfo.outputPath(`coupons-${width}.png`), fullPage: true });
  }
  expect(state.errors).toEqual([]);
});

test('failed loading offers a retry and empty filters remain recoverable', async ({ page }) => {
  const state = await fixture(page, { fail: true });
  await expect(page.getByRole('alert')).toContainText('could not load');
  state.fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByLabel('Search coupons', { exact: true }).fill('does-not-exist');
  await expect(page.getByRole('heading', { name: 'No matching coupons' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit FOREVER10', exact: true })).toBeVisible();
  expect(state.errors).toEqual([]);
});
