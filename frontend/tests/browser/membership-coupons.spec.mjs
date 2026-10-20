import { test, expect } from '@playwright/test';

const shop = 'http://127.0.0.1:5177';
const userId = '507f1f77bcf86cd799439011';
const offer = (code, extra = {}) => ({ _id: code, code, userType: 'membership', isActive: true, expiryDate: '2099-12-31', discountType: 'fixed', discountValue: 30, description: 'Save on your first membership', ...extra });

async function fixture(page, { signedIn = false, member = false, unavailable = false, verificationSucceeds = true, products = [] } = {}) {
  const state = { requests: [], errors: [], applied: [], payments: [], productRequests: [] };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (signedIn) await page.addInitScript(() => localStorage.setItem('token', 'local-membership-test'));
  await page.addInitScript(() => {
    window.Razorpay = function (options) { this.open = () => { window.testMembershipPayment = options; }; };
  });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { success: true, enabled: true, consentVersion: 'local-test' } });
      if (url.pathname === '/api/user/profile') return route.fulfill({ json: { success: true, user: { _id: userId, name: 'Local shopper', email: 'shopper@example.test', isLuxeMember: member } } });
      if (url.pathname === '/api/product/list') {
        state.productRequests.push({ luxeOnly: url.searchParams.get('isLuxePrive'), token: request.headers().token });
        return route.fulfill({ json: { success: true, products: member ? products : [] } });
      }
      if (url.pathname === '/api/order/get-key') return route.fulfill({ json: { success: true, key: 'rzp_test_local' } });
      if (url.pathname === '/api/order/razorpay') {
        state.payments.push({ path: url.pathname, body: request.postDataJSON(), token: request.headers().token });
        return route.fulfill({ json: { success: true, order: { id: 'order_membership_local', amount: 12900, currency: 'INR' } } });
      }
      if (url.pathname === '/api/order/verifyRazorpay') {
        state.payments.push({ path: url.pathname, body: request.postDataJSON(), token: request.headers().token });
        member = verificationSucceeds;
        return route.fulfill({ json: { success: verificationSucceeds } });
      }
      if (url.pathname === '/api/cms/luxePage') return route.fulfill({ json: { success: true, content: { features: [], promo: { enabled: false } } } });
      if (url.pathname === '/api/cms/siteSettings') return route.fulfill({ json: { success: true, content: { membershipPrice: 129, membershipPriceOriginal: 152 } } });
      if (['/api/coupon/active', '/api/coupon/all'].includes(url.pathname)) {
        state.requests.push({ path: url.pathname, purpose: url.searchParams.get('purpose'), token: request.headers().token });
        if (unavailable) return route.fulfill({ status: 503, json: { success: false } });
        return route.fulfill({ json: { success: true, coupons: [
          offer('JOIN30', { isLifetime: true, expiryDate: null }), offer('JOIN10PERCENT', { discountType: 'percentage', discountValue: 10 }),
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

test('verified membership purchase opens Luxe products with images and survives a refresh', async ({ page }) => {
  const product = { _id: '507f1f77bcf86cd799439012', name: 'Luxe Collection Preview', isLuxePrive: true, variations: [{ color: 'Rose', sku: 'LUXE-PREVIEW', images: ['/luxe-lingerie-still.gif'], sizes: [{ size: 'M', price: 999, mrp: 1499, stock: 5 }] }] };
  const state = await fixture(page, { signedIn: true, products: [product] });
  await page.goto(shop + '/luxe');
  await page.getByRole('button', { name: 'Become a Member', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(window.testMembershipPayment))).toBe(true);
  await page.evaluate(() => window.testMembershipPayment.handler({ razorpay_payment_id: 'pay_membership_local', razorpay_order_id: 'order_membership_local', razorpay_signature: 'signature_local' }));
  await expect(page).toHaveURL(shop + '/luxe');
  const luxe = page.getByRole('region', { name: 'Luxe page', exact: true });
  await expect(luxe.getByRole('heading', { name: 'LUXE PRIVE SALE', exact: true })).toBeVisible();
  await expect(luxe.getByRole('button', { name: 'Become a Member', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Welcome to Luxe!', exact: true })).toHaveCount(0);
  const productImage = luxe.getByRole('img', { name: product.name, exact: true });
  await expect(productImage).toBeVisible();
  await expect.poll(() => productImage.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(luxe.locator(`a[href="/product/${product._id}"]`).first()).toBeVisible();
  expect(state.productRequests).toContainEqual({ luxeOnly: 'true', token: 'local-membership-test' });
  await expect(page.getByText('404 Page Not Found', { exact: true })).toHaveCount(0);
  expect(state.payments).toHaveLength(2);
  expect(state.payments[1]).toEqual({ path: '/api/order/verifyRazorpay', token: 'local-membership-test', body: { userId, razorpay_payment_id: 'pay_membership_local', razorpay_order_id: 'order_membership_local', razorpay_signature: 'signature_local' } });
  await page.reload();
  await expect(productImage).toBeVisible();
  await page.goto(shop + '/PrimeMember');
  await expect(page).toHaveURL(shop + '/luxe');
  await expect(page.getByRole('heading', { name: 'LUXE PRIVE SALE', exact: true })).toBeVisible();
  await expect(productImage).toBeVisible();
  await expect(page.getByText('Elegance - Douceur - Amour', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath('luxe-products-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(productImage).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath('luxe-products-mobile.png'), animations: 'disabled' });
  expect(state.errors).toEqual([]);
});

test('failed payment verification keeps the customer on Luxe without showing the welcome page', async ({ page }) => {
  const state = await fixture(page, { signedIn: true, verificationSucceeds: false });
  await page.goto(shop + '/luxe');
  const join = page.getByRole('button', { name: 'Become a Member', exact: true });
  await join.click();
  await expect.poll(() => page.evaluate(() => Boolean(window.testMembershipPayment))).toBe(true);
  await page.evaluate(() => window.testMembershipPayment.handler({ razorpay_payment_id: 'pay_membership_local', razorpay_order_id: 'order_membership_local', razorpay_signature: 'signature_local' }));
  await expect(page.getByText('Payment verification failed.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(shop + '/luxe');
  await expect(page.getByRole('heading', { name: 'Welcome to Luxe!', exact: true })).toHaveCount(0);
  await expect(join).toBeEnabled();
  expect(state.errors).toEqual([]);
});
