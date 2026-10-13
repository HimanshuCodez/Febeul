import { test, expect } from '@playwright/test';

const shop = 'http://127.0.0.1:5177';
const productId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439022';
const name = 'Five rupee product';
const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="160"%3E%3Crect width="120" height="160" fill="pink"/%3E%3C/svg%3E';
async function fixture(page, code = 'FIXED1') {
  const state = { code, quantity: 1, errors: [], updates: [], failUpdate: false, failGet: false, holdUpdate: false, release: null };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('token', 'local-cart-test'));
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return url.origin === shop ? route.continue() : route.abort();
    const reply = json => route.fulfill({ json });
    if (url.pathname === '/api/analytics/config') return reply({ success: true, enabled: false });
    if (url.pathname === '/api/user/profile') return reply({ success: true, user: {
      _id: userId, name: 'Local shopper', email: 'shopper@example.test', isLuxeMember: false,
      addresses: [{ _id: 'local-address', name: 'Local shopper', address: 'Test street', city: 'Delhi', state: 'Delhi', zip: '110001', country: 'India', phone: '9999999999' }],
    } });
    if (url.pathname === '/api/cms/siteSettings') return reply({ success: true, content: { shippingThreshold: 499, defaultShippingCharge: 50 } });
    if (url.pathname === '/api/cart/get') {
      if (state.failGet) return route.fulfill({ status: 503, json: { success: false } });
      const discountAmount = code === 'FIXED1' ? 1 : state.quantity;
      return reply({ success: true, giftWrap: null, cartItems: state.quantity ? [{
        _id: productId, name, price: 5, quantity: state.quantity, color: 'Rose', size: 'M', image,
        variations: [{ color: 'Rose', sku: 'ROSE', images: [image], sizes: [{ size: 'M', price: 5, stock: 99 }] }],
        appliedCoupon: code, discountAmount,
      }] : [] });
    }
    if (url.pathname === '/api/cart/update') {
      const body = route.request().postDataJSON(); state.updates.push(body);
      if (state.holdUpdate) await new Promise(resolve => { state.release = resolve; });
      if (state.failUpdate) return route.fulfill({ status: 500, json: { success: false } });
      state.quantity = body.quantity; return reply({ success: true });
    }
    if (url.pathname === '/api/cart/remove') { state.quantity = 0; return reply({ success: true }); }
    return reply({ success: true, content: null, products: [], wishlist: [], tickets: [], coupons: [], giftWraps: [], reviews: [], policies: [], messages: [] });
  });
  await page.goto(shop + '/cart');
  await expect(page.getByRole('heading', { name: 'Shopping Cart', exact: true })).toBeVisible();
  await expect(page.getByLabel('Product line total', { exact: true })).toHaveText('₹4.00');
  return state;
}
const increase = page => page.getByRole('button', { name: `Increase quantity of ${name}`, exact: true });
const decrease = page => page.getByRole('button', { name: `Decrease quantity of ${name}`, exact: true });
const checkout = page => page.getByRole('button', { name: 'Proceed to Checkout', exact: true });
const lineTotal = page => page.getByLabel('Product line total', { exact: true });
const quantityLabel = page => page.getByLabel(`Quantity of ${name}`, { exact: true });

for (const [code, expected] of [['FIXED1', [4, 9, 14]], ['PERCENT20', [4, 8, 12]]]) {
  test(`${code} recalculates after increases, decreases, refresh, and checkout`, async ({ page }, testInfo) => {
    const state = await fixture(page, code);
    for (const count of [2, 3]) {
      await increase(page).click();
      await expect(quantityLabel(page)).toHaveText(String(count));
      await expect(lineTotal(page)).toHaveText(`₹${expected[count - 1].toFixed(2)}`);
      await expect(page.getByText('Subtotal', { exact: true }).locator('..')).toContainText(`₹${(count * 5).toFixed(2)}`);
      await expect(page.getByText('Coupon Discount', { exact: true }).locator('..')).toContainText(`₹${(code === 'FIXED1' ? 1 : count).toFixed(2)}`);
    }
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(lineTotal(page)).toBeVisible();
      await expect(checkout(page)).toBeVisible();
      const cart = page.getByRole('main');
      expect(await cart.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath(`${code}-quantity-three-${width}.png`), fullPage: true });
    }
    await page.reload();
    await expect(lineTotal(page)).toHaveText(`₹${expected[2].toFixed(2)}`);
    await decrease(page).click();
    await expect(quantityLabel(page)).toHaveText('2');
    await expect(lineTotal(page)).toHaveText(`₹${expected[1].toFixed(2)}`);
    await checkout(page).click();
    await expect(page).toHaveURL(shop + '/checkout');
    await expect(page.getByText('Coupon Discount', { exact: true }).locator('..')).toContainText(`₹${(code === 'FIXED1' ? 1 : 2).toFixed(2)}`);
    expect(state.errors).toEqual([]);
  });
}

test('rapid quantity clicks are serialized and checkout waits for the refreshed totals', async ({ page }) => {
  const state = await fixture(page, 'PERCENT20'); state.holdUpdate = true;
  await increase(page).evaluate(button => { button.click(); button.click(); });
  await expect.poll(() => state.updates.length).toBe(1);
  await expect(increase(page)).toBeDisabled(); await expect(checkout(page)).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Updating quantity and discounts');
  await expect(lineTotal(page)).toHaveText('₹4.00');
  await expect.poll(() => Boolean(state.release)).toBe(true); state.release();
  await expect(quantityLabel(page)).toHaveText('2'); await expect(lineTotal(page)).toHaveText('₹8.00');
  await expect(checkout(page)).toBeEnabled(); expect(state.updates).toHaveLength(1); expect(state.errors).toEqual([]);
});

test('failed updates and failed total refreshes recover without allowing stale checkout', async ({ page }) => {
  const state = await fixture(page, 'PERCENT20'); state.failUpdate = true;
  await increase(page).click(); await expect(checkout(page)).toBeEnabled();
  await expect(quantityLabel(page)).toHaveText('1'); await expect(lineTotal(page)).toHaveText('₹4.00');
  state.failUpdate = false; state.failGet = true;
  await increase(page).click();
  await expect(page.getByRole('alert')).toContainText('could not refresh your cart totals');
  await expect(checkout(page)).toBeDisabled(); await expect(increase(page)).toBeDisabled();
  state.failGet = false; await page.getByRole('button', { name: 'Retry cart', exact: true }).click();
  await expect(quantityLabel(page)).toHaveText('2'); await expect(lineTotal(page)).toHaveText('₹8.00');
  await expect(checkout(page)).toBeEnabled(); expect(state.errors).toEqual([]);
});

test('decreasing the final item removes it without leaving discounted totals behind', async ({ page }) => {
  const state = await fixture(page);
  await decrease(page).click();
  await expect(page.getByRole('heading', { name: 'Your cart is empty', exact: true })).toBeVisible();
  await expect(checkout(page)).toHaveCount(0); expect(state.quantity).toBe(0); expect(state.errors).toEqual([]);
});
