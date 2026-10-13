import { test, expect } from '@playwright/test';

const shop = 'http://127.0.0.1:5177';
const productId = '507f1f77bcf86cd799439011';
const secondId = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439022';
const productPath = '/product/' + productId;
const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="160"%3E%3Crect width="120" height="160" fill="pink"/%3E%3C/svg%3E';
const product = {
  _id: productId, name: 'Variation coupon test', description: 'Local test product', category: 'Lingerie',
  variations: [
    { color: 'Rose', sku: 'STYLE-ROSE', images: [image], sizes: [{ size: 'S', price: 500, mrp: 900, stock: 10 }, { size: 'M', price: 600, mrp: 900, stock: 10 }] },
    { color: 'Black', sku: 'STYLE-BLACK', images: [image], sizes: [{ size: 'S', price: 800, mrp: 1000, stock: 10 }] },
  ],
};
const offer = (code, skus = [], extra = {}) => ({ _id: code, code, applicableSKUs: skus, isActive: true, expiryDate: '2099-12-31', discountType: 'percentage', discountValue: 20, minOrderAmount: 0, minQuantity: 0, offerType: 'none', userType: 'normal', specificUsers: [], ...extra });

async function mockShop(page, { signedIn = true, description = product.description } = {}) {
  const state = { calls: [], errors: [], delayed: [], delayCode: null };
  const coupons = [offer('ROSE20', ['STYLE-ROSE'], { isLifetime: true, expiryDate: null }), offer('BLACK20', ['STYLE-BLACK']), offer('ANY20'), offer('LUXE20', [], { userType: 'luxe' })];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (signedIn) await page.addInitScript(() => localStorage.setItem('token', 'local-test-token'));
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/api/')) {
      let body;
      try { body = req.postDataJSON(); } catch { /* GET */ }
      state.calls.push({ path: url.pathname, body, token: req.headers().token });
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { success: true, enabled: false } });
      if (url.pathname === '/api/user/profile') return route.fulfill({ json: { success: true, user: { _id: userId, name: 'Local shopper', email: 'shopper@example.test', addresses: [], isLuxeMember: false } } });
      if (url.pathname === '/api/product/single') return route.fulfill({ json: { success: true, product: { ...product, description, _id: body.productId, name: body.productId === productId ? product.name : 'Second product' } } });
      if (['/api/coupon/active', '/api/coupon/all'].includes(url.pathname)) return route.fulfill({ json: { success: true, coupons } });
      if (url.pathname === '/api/coupon/apply-product-coupon') {
        const coupon = coupons.find(c => c.code === body.code);
        if (state.delayCode === body.code) await new Promise(resolve => state.delayed.push(resolve));
        const matches = coupon && (!coupon.applicableSKUs.length || coupon.applicableSKUs.includes(body.productItem.sku));
        return route.fulfill({ status: matches ? 200 : 400, json: matches
          ? { success: true, code: coupon.code, discountType: 'percentage', discountValue: 20, discountAmount: body.productItem.price * 0.2 }
          : { success: false, message: 'Coupon does not match this SKU.' } });
      }
      if (url.pathname === '/api/cart/get') return route.fulfill({ json: { success: true, cartItems: [], giftWrap: null } });
      return route.fulfill({ json: { success: true, content: null, products: [], wishlist: [], tickets: [], coupons: [], giftWraps: [], reviews: [], policies: [], messages: [] } });
    }
    if (url.origin !== shop && url.protocol !== 'data:') return route.abort();
    return route.continue();
  });
  return state;
}
const card = (page, code) => page.getByRole('heading', { name: code, exact: true }).locator('../../..');
const price = page => page.locator('span.text-3xl.font-black').first();
async function openProduct(page, query = '') {
  await page.goto(shop + productPath + query);
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
}
async function apply(page, code) {
  await card(page, code).getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue Shopping', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue Shopping', exact: true }).click();
}
const cartCalls = state => state.calls.filter(c => c.path === '/api/cart/add');

test('guests see only the selected SKU and unrestricted coupons, with the existing sign-in return path', async ({ page }) => {
  const state = await mockShop(page, { signedIn: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await openProduct(page);
  await expect(card(page, 'ROSE20')).toBeVisible();
  await expect(card(page, 'ANY20')).toBeVisible();
  await expect(card(page, 'BLACK20')).toHaveCount(0);
  await expect(card(page, 'LUXE20')).toHaveCount(0);
  await page.getByAltText('Color Black', { exact: true }).click();
  await expect(card(page, 'BLACK20')).toBeVisible();
  await expect(card(page, 'ROSE20')).toHaveCount(0);
  await card(page, 'BLACK20').getByRole('button', { name: 'Log in to apply' }).click();
  await expect(page).toHaveURL(shop + '/auth');
  expect(await page.evaluate(() => history.state.usr.from)).toBe(productPath + '?color=Black&coupon=BLACK20');
  expect(state.calls.filter(c => c.path === '/api/coupon/apply-product-coupon')).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test('an applied SKU coupon never carries into a sibling price or either cart action', async ({ page }) => {
  const state = await mockShop(page);
  await openProduct(page);
  await apply(page, 'ROSE20');
  await expect(price(page)).toHaveText('\u20b9400');
  await page.getByRole('button', { name: 'Add to Bag', exact: true }).click();
  await expect.poll(() => cartCalls(state).length).toBe(1);
  expect(cartCalls(state)[0].body).toEqual({ userId, itemId: productId, size: 'S', color: 'Rose', appliedCoupon: 'ROSE20', discountAmount: 100 });
  await page.getByAltText('Color Black', { exact: true }).click();
  await expect(price(page)).toHaveText('\u20b9800');
  await expect(card(page, 'ROSE20')).toHaveCount(0);
  await expect(page.getByTitle('Remove Coupon')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add to Bag', exact: true }).click();
  await expect.poll(() => cartCalls(state).length).toBe(2);
  expect(cartCalls(state)[1].body).toEqual({ userId, itemId: productId, size: 'S', color: 'Black' });
  await apply(page, 'ANY20');
  await expect(price(page)).toHaveText('\u20b9640');
  await page.getByRole('button', { name: 'Buy It Now', exact: true }).click();
  await expect(page).toHaveURL(shop + '/cart');
  expect(cartCalls(state)[2].body).toEqual({ userId, itemId: productId, size: 'S', color: 'Black', appliedCoupon: 'ANY20', discountAmount: 160 });
  expect(state.errors).toEqual([]);
});

test('changing size clears the old price discount and allows validation at the new price', async ({ page }) => {
  const state = await mockShop(page);
  await openProduct(page); await apply(page, 'ROSE20');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await expect(price(page)).toHaveText('\u20b9600');
  expect(new URL(page.url()).searchParams.has('coupon')).toBe(false);
  await expect(page.getByTitle('Remove Coupon')).toHaveCount(0);
  await apply(page, 'ROSE20');
  await expect(price(page)).toHaveText('\u20b9480');
  await page.getByTitle('Remove Coupon').click();
  await expect(price(page)).toHaveText('\u20b9600');
  const requests = state.calls.filter(c => c.path === '/api/coupon/apply-product-coupon');
  expect(requests.map(c => c.body.productItem)).toEqual([
    { sku: 'STYLE-ROSE', price: 500, quantity: 1 }, { sku: 'STYLE-ROSE', price: 600, quantity: 1 },
  ]);
  expect(state.errors).toEqual([]);
});

test('a delayed response cannot overwrite a newly selected variation or its coupon', async ({ page }) => {
  const state = await mockShop(page);
  await openProduct(page);
  state.delayCode = 'ROSE20';
  await card(page, 'ROSE20').getByRole('button', { name: 'Apply', exact: true }).click();
  await expect.poll(() => state.delayed.length).toBe(1);
  await page.getByAltText('Color Black', { exact: true }).click();
  await expect(price(page)).toHaveText('\u20b9800');
  await apply(page, 'BLACK20');
  state.delayed.shift()();
  // Give the deliberately late response time to arrive, including a cancelled transport.
  await page.waitForTimeout(250);
  await expect(price(page)).toHaveText('\u20b9640');
  expect(new URL(page.url()).searchParams.get('color')).toBe('Black');
  expect(new URL(page.url()).searchParams.get('coupon')).toBe('BLACK20');
  await page.getByRole('button', { name: 'Add to Bag', exact: true }).click();
  await expect.poll(() => cartCalls(state).length).toBe(1);
  expect(cartCalls(state)[0].body.appliedCoupon).toBe('BLACK20');
  expect(state.errors).toEqual([]);
});

test('URL coupons validate the actual variation; product navigation clears prior discounts', async ({ page }) => {
  const state = await mockShop(page);
  await openProduct(page, '?color=Black&coupon=ROSE20');
  await expect(page.getByText('Coupon does not match this SKU.', { exact: true })).toBeVisible();
  await expect(price(page)).toHaveText('\u20b9800');
  await openProduct(page, '?color=Rose&coupon=ROSE20');
  await expect(price(page)).toHaveText('\u20b9400');
  const popup = page.getByRole('button', { name: 'Continue Shopping', exact: true });
  if (await popup.isVisible()) await popup.click();
  // Client-side route change keeps ProductPage mounted, as related-product links do.
  await page.evaluate(path => { history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, '/product/' + secondId);
  await expect(page.getByRole('heading', { name: 'Second product', exact: true })).toBeVisible();
  await expect(price(page)).toHaveText('\u20b9500');
  await expect(page.getByTitle('Remove Coupon')).toHaveCount(0);
  expect(state.calls.filter(c => c.path === '/api/coupon/apply-product-coupon')).toHaveLength(2);
  expect(state.errors).toEqual([]);
});


test('product HTML preserves formatting while removing scripts and executable attributes', async ({ page }) => {
  const state = await mockShop(page, { description: '<p><strong>Safe description</strong></p><img src="missing" onerror="window.securityXss = true"><script>window.securityXss = true</script><a href="javascript:window.securityXss=true">Unsafe link</a><svg onload="window.securityXss=true"></svg>' });
  await openProduct(page);
  const description = page.locator('.product-description');
  await expect(description.locator('strong')).toHaveText('Safe description');
  await expect(description.locator('script, svg, [onerror], [onload], [href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.securityXss)).toBeUndefined();
  expect(state.errors).toEqual([]);
});
