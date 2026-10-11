import { test, expect } from '@playwright/test';

const shop = 'http://127.0.0.1:5177';
const address = { _id: 'local-address', name: 'Amelia Rose', address: 'Apartment 12, Rose House', locality: 'Garden Road', city: 'Delhi', state: 'Delhi', zip: '110001', country: 'India', phone: '9000000000', alternatePhone: '9000000001', addressType: 'Home' };
const account = { accountHolderName: 'Amelia Rose', bankName: 'Local Test Bank', accountNumber: '123456789012', confirmAccountNumber: '123456789012', ifsc: 'HDFC0001234' };

async function mockProfile(page, { signedIn = true, luxe = false } = {}) {
  const state = {
    user: { _id: '507f1f77bcf86cd799439022', name: 'Amelia Rose', email: 'amelia@example.test', mobile: '9876543210', addresses: [address], isLuxeMember: luxe, ...(luxe ? { luxeMembershipExpires: '2099-12-01', giftWrapsLeft: 3 } : {}) },
    calls: [], errors: [], failSave: false, failRemove: false,
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (signedIn) await page.addInitScript(() => localStorage.setItem('token', 'local-test-token'));
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/api/')) {
      let body;
      try { body = req.postDataJSON(); } catch { /* no body */ }
      state.calls.push({ path: url.pathname, body, token: req.headers().token });
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { success: true, enabled: false } });
      if (url.pathname === '/api/user/profile') return route.fulfill({ json: { success: true, user: state.user } });
      if (url.pathname === '/api/user/bank-account/add') {
        if (state.failSave) return route.fulfill({ json: { success: false, message: 'Local save failure' } });
        state.user = { ...state.user, bankAccount: { accountHolderName: body.accountHolderName, bankName: body.bankName, accountNumber: body.accountNumber, ifsc: body.ifsc } };
        return route.fulfill({ json: { success: true } });
      }
      if (url.pathname === '/api/user/bank-account/remove') {
        if (state.failRemove) return route.fulfill({ json: { success: false, message: 'Local remove failure' } });
        state.user = { ...state.user, bankAccount: null };
        return route.fulfill({ json: { success: true } });
      }
      if (url.pathname === '/api/cart/get') return route.fulfill({ json: { success: true, cartItems: [], giftWrap: null } });
      if (url.pathname === '/api/order/userorders') return route.fulfill({ json: { success: true, orders: [{ _id: '507f1f77bcf86cd799439033', orderItemId: 'FEB-TEST-1001', date: Date.now(), orderStatus: 'Processing', paymentMethod: 'COD', orderTotal: 2046, items: [{ name: 'Rose Lace Set', price: 499, quantity: 4, size: 'M' }] }] } });
      return route.fulfill({ json: { success: true, content: null, products: [], wishlist: [], tickets: [], coupons: [], giftWraps: [], reviews: [], policies: [], messages: [] } });
    }
    if (url.origin !== shop) return route.abort();
    return route.continue();
  });
  return state;
}
const menu = page => page.getByRole('navigation', { name: 'Account navigation' });
const main = page => page.getByRole('main', { name: 'Account details' });
const tab = (page, name) => menu(page).getByRole('button', { name, exact: true }).click();

test('overview shows actual account details and all existing destinations remain accessible', async ({ page }) => {
  const state = await mockProfile(page);
  await page.goto(shop + '/profile');
  await expect(main(page).getByRole('heading', { name: 'Personal information' })).toBeVisible();
  await expect(main(page).getByText('9876543210', { exact: true })).toBeVisible();
  await expect(main(page).getByText('amelia@example.test', { exact: true })).toBeVisible();
  await expect(menu(page).getByRole('button', { name: 'My Profile' })).toHaveAttribute('aria-current', 'page');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const bounds = await main(page).boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(await main(page).evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    if ([390, 1440].includes(width)) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: test.info().outputPath('profile-' + width + '.png'), fullPage: true }); }
  }
  await main(page).getByRole('button', { name: /My Orders Track/ }).click();
  await expect(menu(page).getByRole('button', { name: 'My Orders' })).toHaveAttribute('aria-current', 'page');
  await expect(main(page).getByText('4 items in this order')).toBeVisible();
  await tab(page, 'Coupons & Offers'); await expect(main(page).getByRole('heading', { name: 'Coupons & Offers' })).toBeVisible();
  await tab(page, 'Luxe Membership'); await expect(main(page).getByRole('link', { name: 'Join Febeul Luxe' })).toHaveAttribute('href', '/luxe');
  await tab(page, 'My Tickets'); await expect(page).toHaveURL(shop + '/support');
  await page.goto(shop + '/profile');
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(shop + '/'); expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  expect(state.errors).toEqual([]);
});

test('addresses refresh once per visit, retain edit routing, and support incoming tab state', async ({ page }) => {
  const state = await mockProfile(page);
  await page.goto(shop + '/profile');
  await tab(page, 'Manage Addresses');
  await expect(main(page).getByRole('article', { name: 'Address for Amelia Rose' })).toBeVisible();
  const profileCalls = () => state.calls.filter(call => call.path === '/api/user/profile').length;
  const count = profileCalls();
  // A bounded quiet period catches the former response -> user -> fetch loop.
  await page.waitForTimeout(400);
  expect(profileCalls()).toBe(count); expect(count).toBe(2);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await main(page).evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await main(page).getByRole('button', { name: 'Edit address for Amelia Rose' }).click();
  await expect(page).toHaveURL(shop + '/address');
  expect(await page.evaluate(() => history.state.usr.address)).toEqual(address);
  await page.goto(shop + '/profile');
  await page.evaluate(() => history.replaceState({ ...history.state, usr: { activeTab: 'addresses' } }, '', '/profile'));
  await page.reload(); await expect(main(page).getByRole('heading', { name: 'Manage Addresses' })).toBeVisible();
  await expect(menu(page).getByRole('button', { name: 'Manage Addresses' })).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => history.state.usr)).toEqual({});
  state.user.addresses = [];
  await tab(page, 'My Profile'); await tab(page, 'Manage Addresses');
  await expect(main(page).getByRole('heading', { name: 'No Saved Addresses' })).toBeVisible();
  await main(page).getByRole('button', { name: 'Add New Address' }).click(); await expect(page).toHaveURL(shop + '/address');
  expect(state.errors).toEqual([]);
});

test('bank validation, request payloads, masking, cancel, error recovery and removal stay functional', async ({ page }) => {
  const state = await mockProfile(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(shop + '/profile'); await tab(page, 'Bank Account');
  await main(page).getByRole('button', { name: 'Add Bank Account' }).click();
  await main(page).getByRole('button', { name: 'Save Bank Account' }).click();
  await expect(page.getByLabel('Account Holder Name', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  expect(state.calls.filter(call => call.path.endsWith('/bank-account/add'))).toHaveLength(0);
  for (const [name, value] of Object.entries(account)) await page.locator('input[name="' + name + '"]').fill(value);
  await page.getByLabel('Confirm Account Number', { exact: true }).fill('123456789999');
  await main(page).getByRole('button', { name: 'Save Bank Account' }).click();
  await expect(page.getByText('Account numbers do not match')).toBeVisible();
  await page.getByLabel('Confirm Account Number', { exact: true }).fill(account.accountNumber);
  state.failSave = true; await main(page).getByRole('button', { name: 'Save Bank Account' }).click();
  await expect(page.getByText('Local save failure')).toBeVisible();
  await expect(page.getByLabel('Account Number', { exact: true })).toHaveValue(account.accountNumber);
  state.failSave = false; await main(page).getByRole('button', { name: 'Save Bank Account' }).click();
  await expect(main(page).getByText('Local Test Bank', { exact: true })).toBeVisible();
  const save = state.calls.find(call => call.path.endsWith('/bank-account/add'));
  expect(save.body).toEqual(account); expect(save.token).toBe('local-test-token');
  await expect(main(page).getByText(account.accountNumber, { exact: true })).toHaveCount(0);
  await expect(main(page).getByText('\u2022'.repeat(8) + ' 9012')).toBeVisible();
  await main(page).getByRole('button', { name: 'Remove', exact: true }).click();
  await page.screenshot({ path: test.info().outputPath('profile-bank-mobile.png'), fullPage: true });
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await main(page).evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  }
  await main(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(state.calls.filter(call => call.path.endsWith('/bank-account/remove'))).toHaveLength(0);
  await main(page).getByRole('button', { name: 'Remove', exact: true }).click();
  state.failRemove = true; await main(page).getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText('Local remove failure')).toBeVisible();
  await expect(main(page).getByText('Local Test Bank', { exact: true })).toBeVisible();
  state.failRemove = false; await main(page).getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(main(page).getByRole('heading', { name: 'No Bank Account Added' })).toBeVisible();
  const removal = state.calls.find(call => call.path.endsWith('/bank-account/remove')); expect(removal.body).toEqual({}); expect(removal.token).toBe('local-test-token');
  expect(state.errors).toEqual([]);
});

test('Luxe membership details remain available and fit mobile screens', async ({ page }) => {
  const state = await mockProfile(page, { luxe: true });
  state.user.email = 'averylongemailaddress.for.layoutchecks@example.test';
  await page.goto(shop + '/profile');
  await expect(main(page).getByText('Luxe Member', { exact: true })).toBeVisible();
  await tab(page, 'Luxe Membership');
  await expect(main(page).getByText('Luxe Status Active')).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await main(page).evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    if (width === 390) await page.screenshot({ path: test.info().outputPath('profile-luxe-mobile.png'), fullPage: true });
  }
  state.user = { ...state.user, isLuxeMember: false, luxeMembershipExpires: '2020-01-01' };
  await page.reload(); await tab(page, 'Luxe Membership');
  await expect(main(page).getByRole('link', { name: 'Renew Membership' })).toHaveAttribute('href', '/luxe');
  expect(state.errors).toEqual([]);
});

test('signed-out visitors retain the authentication redirect', async ({ page }) => {
  await mockProfile(page, { signedIn: false });
  await page.goto(shop + '/profile'); await expect(page).toHaveURL(shop + '/auth');
});
