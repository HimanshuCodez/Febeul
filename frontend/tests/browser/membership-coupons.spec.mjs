import { test, expect } from '@playwright/test';

const shop = 'http://127.0.0.1:5177';
const userId = '507f1f77bcf86cd799439011';
const offer = (code, extra = {}) => ({ _id: code, code, userType: 'membership', isActive: true, expiryDate: '2099-12-31', discountType: 'fixed', discountValue: 30, description: 'Save on your first membership', ...extra });

async function fixture(page, { signedIn = false, member = false, unavailable = false } = {}) {
  const state = { requests: [], errors: [], applied: [] };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (signedIn) await page.addInitScript(() => localStorage.setItem('token', 'local-membership-test'));
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { success: true, enabled: true, consentVersion: 'local-test' } });
      if (url.pathname === '/api/user/profile') return route.fulfill({ json: { success: true, user: { _id: userId, name: 'Local shopper', email: 'shopper@example.test', isLuxeMember: member } } });
      if (url.pathname === '/api/cms/luxePage') return route.fulfill({ json: { success: true, content: { features: [], promo: { enabled: false } } } });
      if (url.pathname === '/api/cms/siteSettings') return route.fulfill({ json: { success: true, content: { membershipPrice: 129, membershipPriceOriginal: 152 } } });
      if (['/api/coupon/active', '/api/coupon/all'].includes(url.pathname)) {
        state.requests.push({ path: url.pathname, purpose: url.searchParams.get('purpose'), token: request.headers().token });
        if (unavailable) return route.fulfill({ status: 503, json: { success: false } });
        return route.fulfill({ json: { success: true, coupons: [
          offer('JOIN30'), offer('JOIN10PERCENT', { discountType: 'percentage', discountValue: 10 }),
          offer('SHOPPING', { userType: 'normal' }), offer('LUXESHOPPING', { userType: 'luxe' }),
          offer('EXPIRED', { expiryDate: '2000-01-01' }), offer('INACTIVE', { isActive: false }),
        ] } });
      }
      if (url.pathname === '/api/coupon/apply-product-coupon') {
        state.applied.push({ body: request.postDataJSON(), token: request.headers().token });
        return route.fulfill({ json: { success: true, code: 'JOIN30', discountAmount: 30 } });
      }
      return route.fulfill({ json: { success: true, content: null, products: [], wishlist: [], cartItems: [], messages: [] } });
    }
    return url.origin === shop ? route.continue() : route.abort();
  });
  return state;
}

test('membership coupons appear above the input on desktop and mobile and selecting a code fills it', async ({ page }) => {
  const state = await fixture(page);
  await page.goto(shop + '/luxe');
  const offers = page.getByRole('region', { name: 'Luxe membership coupons' });
  const input = page.getByRole('textbox', { name: 'Have a coupon?' });
  await expect(offers.getByText('JOIN30', { exact: true })).toBeVisible();
  await expect(offers.getByText('₹30 off membership', { exact: true })).toBeVisible();
  await expect(offers.getByText('10% off membership', { exact: true })).toBeVisible();
  for (const code of ['SHOPPING', 'LUXESHOPPING', 'EXPIRED', 'INACTIVE']) await expect(offers.getByText(code, { exact: true })).toHaveCount(0);
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await offers.boundingBox();
    const field = await input.boundingBox();
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(field.y);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  }
  await offers.getByRole('button', { name: 'Use coupon JOIN30', exact: true }).click();
  await expect(input).toHaveValue('JOIN30');
  await expect(input).toBeFocused();
  expect(state.requests).toContainEqual({ path: '/api/coupon/active', purpose: 'membership', token: undefined });
  expect(state.applied).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('signed-in non-members load eligible offers and apply through existing membership validation', async ({ page }) => {
  const state = await fixture(page, { signedIn: true });
  await page.goto(shop + '/luxe');
  await page.getByRole('button', { name: 'Use coupon JOIN30', exact: true }).click();
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeVisible();
  await expect(page.getByText('₹99', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Luxe membership coupons' })).toHaveCount(0);
  expect(state.requests).toContainEqual({ path: '/api/coupon/all', purpose: 'membership', token: 'local-membership-test' });
  expect(state.applied).toEqual([{ body: { code: 'JOIN30', productItem: { sku: 'LUXE-MEMBERSHIP', price: 129, quantity: 1 }, userId }, token: 'local-membership-test' }]);
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Luxe membership coupons' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Have a coupon?' })).toHaveValue('');
  expect(state.errors).toEqual([]);
});

test('manual entry remains available when offer loading fails', async ({ page }) => {
  const state = await fixture(page, { unavailable: true });
  await page.goto(shop + '/luxe');
  const input = page.getByRole('textbox', { name: 'Have a coupon?' });
  await expect(input).toBeVisible();
  await expect(page.getByRole('region', { name: 'Luxe membership coupons' })).toHaveCount(0);
  await input.fill('MYCODE');
  await expect(page.getByRole('button', { name: 'Apply', exact: true })).toBeEnabled();
  expect(state.errors).toEqual([]);
});

test('the existing members-only product view does not display membership purchase offers', async ({ page }) => {
  const state = await fixture(page, { signedIn: true, member: true });
  await page.goto(shop + '/luxe');
  await expect(page.getByRole('heading', { name: 'LUXE PRIVE SALE', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Luxe membership coupons' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Have a coupon?' })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});
