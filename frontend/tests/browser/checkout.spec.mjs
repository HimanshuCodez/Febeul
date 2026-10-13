import { test, expect } from '@playwright/test';

const shop = 'http://127.0.0.1:5177';
const productId = '507f1f77bcf86cd799439011';
const orderId = '507f1f77bcf86cd799439033';
const image = '/checkout-test-product.svg';
const address = { _id: 'address-home', name: 'Local shopper', address: '12 Rose Avenue', locality: 'Garden Colony', city: 'Delhi', state: 'Delhi', zip: '110001', country: 'India', phone: '9999999999', addressType: 'Home' };
const product = { _id: productId, name: 'Rose satin pyjama set', price: 499, quantity: 2, color: 'Dusty rose', size: 'M', image, appliedCoupon: 'SAVE100', discountAmount: 100, variations: [{ color: 'Dusty rose', sku: 'ROSE', images: [image], sizes: [{ size: 'M', price: 499 }] }] };
const wrap = { _id: 'wrap-rose', name: 'Rose gift box', price: 35, image };
const offer = { _id: 'prepaid-offer', code: 'ONLINE50', offerType: 'prepaid', isActive: true, isLifetime: true, expiryDate: null, discountType: 'fixed', discountValue: 50, description: 'Save ₹50 on eligible online orders.' };

async function fixture(page, options = {}) {
  const state = {
    calls: [], errors: [], cartError: false, orderError: false,
    user: { _id: '507f1f77bcf86cd799439022', name: 'Local shopper', email: 'shopper@example.test', isLuxeMember: Boolean(options.member), giftWrapsLeft: options.member ? 2 : 0, addresses: options.noAddress ? [] : [{ ...address }, { ...address, _id: 'address-work', name: 'Work address', address: '24 Market Road', zip: '110002', addressType: 'Business' }] },
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('token', 'local-checkout-test');
    window.Razorpay = function (config) { window.testPayment = config; this.open = () => { window.paymentOpened = true; }; };
  });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const reply = json => route.fulfill({ json });
    if (url.pathname.startsWith('/api/')) {
      const body = request.postData() ? request.postDataJSON() : null;
      state.calls.push({ path: url.pathname, body, token: request.headers().token });
      if (url.pathname === '/api/analytics/config') return reply({ success: true, enabled: false });
      if (url.pathname === '/api/user/profile') return reply({ success: true, user: state.user });
      if (url.pathname === '/api/cms/siteSettings') return reply({ success: true, content: { shippingThreshold: 499, defaultShippingCharge: 50, codCharge: 50 } });
      if (url.pathname === '/api/cms/pincodeBlocklist') return reply({ success: true, content: { entries: [{ pincode: '110002', blockCod: true }] } });
      if (url.pathname === '/api/cart/get') {
        if (options.cartError || state.cartError) return route.fulfill({ status: 503, json: { success: false } });
        return reply({ success: true, cartItems: options.empty ? [] : [product], giftWrap: options.giftWrap ? wrap : null });
      }
      if (url.pathname === '/api/order/get-key') return reply({ success: true, key: 'rzp_test_local' });
      if (url.pathname === '/api/coupon/all') return reply({ success: true, coupons: options.offers ? [offer] : [] });
      if (url.pathname === '/api/coupon/apply') return reply({ success: true, code: body.code, discountAmount: 50, offerType: 'prepaid', message: 'Coupon applied' });
      if (url.pathname === '/api/giftwrap/list') return reply({ success: true, data: [wrap] });
      if (url.pathname.startsWith('/api/user/pincode-check/')) return reply([{ Status: 'Success', PostOffice: [{ District: 'Delhi', State: 'Delhi' }] }]);
      if (url.pathname === '/api/user/add-address') { state.user.addresses.push({ ...body.address, _id: 'address-new' }); return reply({ success: true }); }
      if (url.pathname === '/api/user/update-address') { state.user.addresses = state.user.addresses.map(item => item._id === body.addressId ? { ...body.address, _id: item._id } : item); return reply({ success: true }); }
      if (url.pathname === '/api/order/place') return reply(state.orderError ? { success: false, message: 'Please try your order again.' } : { success: true, order: { _id: orderId } });
      if (url.pathname === '/api/order/razorpay') return reply({ success: true, order: { id: 'order_local', receipt: orderId, amount: 84800 } });
      if (url.pathname === '/api/order/verifyRazorpay') return reply({ success: true });
      return reply({ success: true, content: null, products: [], wishlist: [], tickets: [], coupons: [], giftWraps: [], reviews: [], policies: [], messages: [] });
    }
    if (url.origin !== shop) return route.abort();
    if (url.pathname === image) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200"><rect width="160" height="200" fill="#edd5d4"/><path d="M50 42L30 58 41 95 49 86 48 143H112L111 86 119 95 130 58 110 42 96 48H64Z" fill="#ba848a"/><path d="M64 48L80 66 96 48M80 66V143" fill="none" stroke="#f8e8e8" stroke-width="2"/></svg>' });
    return route.continue();
  });
  await page.goto(shop + '/checkout');
  await expect(page.getByRole('heading', { name: 'Checkout', exact: true })).toBeVisible();
  if (!options.empty && !options.cartError) await expect(page.getByLabel('Order total')).toHaveText('₹' + (options.giftWrap && !options.member ? '933.00' : '898.00'));
  return state;
}

const summary = page => page.getByRole('complementary', { name: 'Order Summary' });
const payment = page => page.getByRole('radio', { name: /UPI \/ Net Banking \/ Card/ });
const cod = page => page.getByRole('radio', { name: /Cash on Delivery/ });

test('responsive checkout keeps totals correct through gift wrapping, COD, failure and retry', async ({ page }, testInfo) => {
  const state = await fixture(page);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.getByRole('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('checkout-address-' + width + '.png'), fullPage: true });
  }
  await page.getByRole('button', { name: 'Use this address', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await cod(page).check();
  await expect(summary(page).getByText('COD Charges').locator('..')).toContainText('₹50.00');
  await page.getByRole('button', { name: 'Add gift wrap', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose Gift Wrap' });
  await expect(dialog.getByRole('button', { name: 'Select Wrap' })).toBeDisabled();
  await dialog.getByRole('radio', { name: /Rose gift box/ }).check();
  await dialog.getByLabel('Gift message').fill('With love');
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Select Wrap' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('Order total')).toHaveText('₹983.00');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ready to place your order' })).toBeVisible();
  state.orderError = true;
  await page.getByRole('button', { name: 'Place Order', exact: true }).click();
  await expect(page.getByText('Please try your order again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Place Order', exact: true })).toBeEnabled();
  const order = state.calls.find(call => call.path === '/api/order/place');
  expect(order.body).toMatchObject({ amount: 983, address: { _id: 'address-home' }, giftWrap: { _id: wrap._id, price: 35, message: 'With love' }, items: [{ productId, quantity: 2, appliedCoupon: 'SAVE100', discountAmount: 100 }] });
  expect(order.token).toBe('local-checkout-test');
  state.orderError = false;
  await page.getByRole('button', { name: 'Place Order', exact: true }).click();
  await expect(page.getByText('Order Placed!', { exact: true })).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('online lifetime offer, coupon removal and entry, and Razorpay verification still work', async ({ page }, testInfo) => {
  const state = await fixture(page, { offers: true });
  await page.getByRole('button', { name: 'Use this address' }).click();
  await payment(page).check();
  await expect(page.getByLabel('Order total')).toHaveText('₹848.00');
  await page.getByRole('button', { name: 'Remove coupon', exact: true }).click();
  await expect(page.getByLabel('Order total')).toHaveText('₹898.00');
  await page.getByRole('textbox', { name: 'Coupon code', exact: true }).fill('online50');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByLabel('Order total')).toHaveText('₹848.00');
  await cod(page).check();
  await expect(page.getByRole('button', { name: 'Remove coupon' })).toHaveCount(0);
  await expect(page.getByLabel('Order total')).toHaveText('₹948.00');
  await payment(page).check();
  await expect(page.getByLabel('Order total')).toHaveText('₹848.00');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.getByRole('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('checkout-review-' + width + '.png'), fullPage: true });
  }
  await page.getByRole('button', { name: 'Place Order', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.paymentOpened)).toBe(true);
  expect(state.calls.find(call => call.path === '/api/order/razorpay').body).toMatchObject({ amount: 848, couponCode: 'ONLINE50', couponDiscount: 50, currency: 'INR' });
  await page.evaluate(async () => window.testPayment.handler({ razorpay_order_id: 'order_local', razorpay_payment_id: 'pay_local', razorpay_signature: 'signature_local' }));
  await expect(page.getByText('Order Placed!', { exact: true })).toBeVisible();
  expect(state.calls.find(call => call.path === '/api/order/verifyRazorpay').body).toMatchObject({ razorpay_order_id: 'order_local', razorpay_signature: 'signature_local' });
  expect(state.errors).toEqual([]);
});

test('labelled address form saves and edits details including weekend preferences', async ({ page }, testInfo) => {
  const state = await fixture(page, { noAddress: true });
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.getByLabel('Full name', { exact: true }).fill('New shopper');
  await page.getByLabel('Phone number', { exact: true }).fill('9999999999');
  await page.getByLabel('House number & building').fill('7 Test House');
  await page.getByLabel('Area & street').fill('Rose Street');
  await page.getByLabel('Pincode', { exact: true }).fill('110001');
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('Delhi');
  await expect(page.getByLabel('State', { exact: true })).toHaveValue('Delhi');
  await page.getByRole('button', { name: 'Weekend deliveries' }).click();
  await page.getByRole('checkbox', { name: 'Sundays', exact: true }).uncheck();
  expect(await page.getByRole('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('checkout-address-form-320.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save Address', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use this address' })).toBeVisible();
  expect(state.calls.find(call => call.path === '/api/user/add-address').body.address).toMatchObject({ name: 'New shopper', city: 'Delhi', sundayDelivery: false, saturdayDelivery: true });
  await page.getByRole('button', { name: 'Edit address for New shopper' }).click();
  await page.getByLabel('House number & building').fill('9 Updated House');
  await page.getByRole('button', { name: 'Update Address', exact: true }).click();
  await expect(page.getByText('9 Updated House, Rose Street', { exact: true })).toBeVisible();
  expect(state.calls.find(call => call.path === '/api/user/update-address').body.addressId).toBe('address-new');
  expect(state.errors).toEqual([]);
});

test('changing to a COD-blocked address requires an available payment method', async ({ page }) => {
  const state = await fixture(page);
  await page.getByRole('button', { name: 'Use this address' }).click();
  await cod(page).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Change delivery address' }).click();
  const workAddress = page.getByRole('radio', { name: /Deliver to Work address/ });
  await workAddress.focus(); await workAddress.press('Space');
  await page.getByRole('button', { name: 'Use this address' }).click();
  await expect(cod(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await payment(page).check();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  expect(state.calls.filter(call => call.path.startsWith('/api/order/') && call.path !== '/api/order/get-key')).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test('Luxe gift wrapping is displayed as free and the dialog restores keyboard focus', async ({ page }) => {
  const state = await fixture(page, { member: true, giftWrap: true });
  await expect(summary(page).getByText('Gift Wrap', { exact: true }).locator('..')).toContainText('Free');
  await page.getByRole('button', { name: 'Remove gift wrap', exact: true }).click();
  await expect(summary(page).getByText('Gift Wrap', { exact: true })).toHaveCount(0);
  const addWrap = page.getByRole('button', { name: 'Add gift wrap', exact: true });
  await addWrap.click();
  const dialog = page.getByRole('dialog', { name: 'Choose Gift Wrap' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(addWrap).toBeFocused();
  await addWrap.click();
  await dialog.getByRole('radio', { name: /Rose gift box Free/ }).check();
  await dialog.getByRole('button', { name: 'Select Wrap' }).click();
  await expect(summary(page).getByText('Gift Wrap', { exact: true }).locator('..')).toContainText('Free');
  await expect(page.getByLabel('Order total')).toHaveText('₹898.00');
  expect(state.errors).toEqual([]);
});

for (const [option, heading] of [['empty', 'Your cart is empty'], ['cartError', 'We couldn’t load your checkout']]) {
  test(option + ' checkout cannot submit an order', async ({ page }) => {
    const state = await fixture(page, { [option]: true });
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Place Order', exact: true })).toHaveCount(0);
    expect(state.errors).toEqual([]);
  });
}
