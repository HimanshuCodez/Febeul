import { test, expect } from '@playwright/test';
import { DEFAULT_HOME_GIFT_OFFER } from '../../../shared/homeGiftOffer.js';

const shop = 'http://127.0.0.1:5177', admin = 'http://127.0.0.1:5178';
const coupon = { _id: '507f1f77bcf86cd799439033', code: 'WELCOME20', isActive: true, userType: 'normal', specificUsers: [], isLifetime: true, expiryDate: null, usageLimit: 100, usageCount: 0, discountType: 'percentage', discountValue: 20, applicableSKUs: [] };

async function fixture(page, { signedIn = false, consentEnabled = false, role = 'admin', permissions = [], enabled = true } = {}) {
  const state = { content: { ...DEFAULT_HOME_GIFT_OFFER, enabled, couponCode: 'WELCOME20', badgeOffer: '20%', badgeCaption: 'OFF' }, coupons: [coupon], failLoad: false, failSave: false, calls: [], errors: [] };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.addInitScript(({ signedIn, role, permissions }) => {
    if (location.port === '5178') { localStorage.setItem('token', 'local-admin'); localStorage.setItem('role', role); localStorage.setItem('permissions', JSON.stringify(permissions)); }
    else if (signedIn) localStorage.setItem('token', 'local-shopper');
  }, { signedIn, role, permissions });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/api/')) {
      let body;
      try { body = req.postDataJSON(); } catch { /* no body */ }
      state.calls.push({ path: url.pathname, method: req.method(), token: req.headers().token, body });
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { success: true, enabled: consentEnabled, consentVersion: '2026-10-v1' } });
      if (url.pathname === '/api/user/profile') return route.fulfill({ json: { success: true, user: { _id: '507f1f77bcf86cd799439022', name: 'Local Buyer', email: 'buyer@example.test', isLuxeMember: false, addresses: [] } } });
      if (url.pathname === '/api/cart/get') return route.fulfill({ json: { success: true, cartItems: [], giftWrap: null } });
      if (url.pathname === '/api/cms/homeGiftOffer' || url.pathname === '/api/cms/admin/homeGiftOffer') return route.fulfill({ status: state.failLoad ? 503 : 200, json: state.failLoad ? { success: false, message: 'Local offer outage' } : { success: true, content: state.content } });
      if (url.pathname === '/api/cms' && req.method() === 'POST') {
        if (state.failSave) return route.fulfill({ status: 503, json: { success: false, message: 'Local save failure' } });
        state.content = body.content;
        return route.fulfill({ status: 201, json: { success: true, content: state.content } });
      }
      if (['/api/coupon/active', '/api/coupon/all'].includes(url.pathname)) return route.fulfill({ json: { success: true, coupons: state.coupons } });
      return route.fulfill({ json: { success: true, content: null, products: [], wishlist: [], tickets: [], coupons: [], giftWraps: [], reviews: [], policies: [], messages: [] } });
    }
    if (![shop, admin].includes(url.origin)) return route.abort();
    return route.continue();
  });
  return state;
}

test('admin edits text/colors, previews a reveal and publishes to the home page', async ({ page }) => {
  const state = await fixture(page);
  await page.goto(admin + '/home-gift-offer');
  await expect(page.getByRole('heading', { name: 'Home Gift Offer', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home Gift Offer', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByLabel('Popup heading', { exact: true }).fill('A lovely gift for you');
  await page.getByLabel('Reveal button text', { exact: true }).fill('Open my surprise');
  await page.getByLabel('Offer background', { exact: true }).fill('#f9aeaf');
  await page.getByLabel('Button background', { exact: true }).fill('#5b2340');
  await page.getByRole('button', { name: 'Open my surprise', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Gift offer live preview' }).getByText('WELCOME20')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('gift-admin-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save gift offer' }).click();
  await expect(page.getByRole('button', { name: 'Save gift offer' })).toBeDisabled();
  const saved = state.calls.find(call => call.method === 'POST');
  expect(saved.token).toBe('local-admin'); expect(saved.body.name).toBe('homeGiftOffer');
  expect(saved.body.content.title).toBe('A lovely gift for you');
  await page.reload(); await expect(page.getByLabel('Popup heading', { exact: true })).toHaveValue('A lovely gift for you');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Home Gift Offer', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('gift-admin-mobile.png'), fullPage: true });
  await page.goto(shop + '/'); await page.getByRole('button', { name: 'Open your gift offer' }).click();
  const popup = page.getByRole('dialog', { name: 'A lovely gift for you' });
  await expect(popup).toBeVisible(); await expect(popup).toHaveCSS('background-color', 'rgb(249, 174, 175)');
  await expect(popup.getByRole('button', { name: 'Open my surprise' })).toHaveCSS('background-color', 'rgb(91, 35, 64)');
  expect(state.errors).toEqual([]);
});

test('cookie choices stay available, gift pauses automatic membership popup and guests return via sign-in', async ({ page }) => {
  const state = await fixture(page, { consentEnabled: true });
  await page.goto(shop + '/');
  await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open your gift offer' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  const badge = page.getByRole('button', { name: 'Open your gift offer' });
  await badge.click();
  const popup = page.getByRole('dialog', { name: 'Exclusive welcome offer' });
  await page.clock.fastForward(3500);
  await expect(popup).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close membership popup' })).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await popup.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(await popup.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    if ([390, 1440].includes(width)) await page.screenshot({ path: test.info().outputPath('gift-popup-' + width + '.png') });
  }
  await page.setViewportSize({ width: 740, height: 360 });
  const short = await popup.boundingBox(); expect(short.height).toBeLessThanOrEqual(360);
  await page.keyboard.press('Escape'); await expect(popup).not.toBeVisible(); await expect(badge).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await badge.click(); await popup.getByRole('button', { name: 'Grab your gift' }).click();
  await expect(page).toHaveURL(shop + '/auth');
  expect(await page.evaluate(() => history.state.usr.from)).toBe('/?gift=1');
  expect(state.calls.filter(call => call.path === '/api/analytics/events')).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem('febeul.analytics-visitor'))).toBeNull();
  await page.evaluate(() => localStorage.setItem('token', 'local-shopper'));
  await page.goto(shop + '/?gift=1');
  await expect(page.getByRole('dialog', { name: 'Exclusive welcome offer' })).toBeVisible();
  await expect(page).toHaveURL(shop + '/');
  expect(state.errors).toEqual([]);
});

test('signed-in shoppers reveal, copy and continue shopping without applying or consuming a coupon', async ({ page }) => {
  const state = await fixture(page, { signedIn: true });
  await page.goto(shop + '/?gift=1');
  const popup = page.getByRole('dialog');
  await expect(popup).toBeVisible();
  await popup.getByRole('button', { name: 'Grab your gift' }).click();
  await expect(page.getByRole('heading', { name: 'Your gift is ready!' })).toBeVisible();
  await expect(popup.getByText('WELCOME20', { exact: true })).toBeVisible();
  const eligibility = state.calls.find(call => call.path === '/api/coupon/all'); expect(eligibility.token).toBe('local-shopper');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.copiedGift = value; } } }));
  await popup.getByRole('button', { name: 'Copy code' }).click();
  await expect(popup.getByRole('button', { name: 'Copied!' })).toBeVisible();
  expect(await page.evaluate(() => window.copiedGift)).toBe('WELCOME20');
  await page.screenshot({ path: test.info().outputPath('gift-revealed.png') });
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Clipboard unavailable'); } } }));
  await popup.getByRole('button', { name: 'Copied!' }).click();
  await expect(popup.getByRole('status')).toContainText('copy it manually');
  expect(state.calls.some(call => call.path.includes('/apply') || call.path.includes('/order/'))).toBe(false);
  await popup.getByRole('button', { name: 'Continue shopping' }).click();
  await expect(page).toHaveURL(shop + '/products');
  await expect(page.getByRole('button', { name: 'Open your gift offer' })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('disabled/unavailable offers fail quietly, account limits are respected, and dismissal works', async ({ page }) => {
  const state = await fixture(page, { signedIn: true, enabled: false });
  await page.goto(shop + '/');
  await expect(page.getByRole('button', { name: 'Open your gift offer' })).toHaveCount(0);
  state.failLoad = true; state.content.enabled = true;
  await page.reload(); await expect(page.getByRole('button', { name: 'Open your gift offer' })).toHaveCount(0);
  state.failLoad = false; state.coupons = [];
  await page.reload(); await page.getByRole('button', { name: 'Open your gift offer' }).click();
  const popup = page.getByRole('dialog', { name: 'Exclusive welcome offer' });
  await popup.getByRole('button', { name: 'Grab your gift' }).click();
  await expect(popup.getByRole('status')).toContainText('no longer available for your account');
  await expect(popup.getByText('WELCOME20', { exact: true })).toHaveCount(0);
  state.coupons = [coupon]; state.failLoad = true;
  await popup.getByRole('button', { name: 'Grab your gift' }).click();
  await expect(popup.getByRole('status')).toContainText('Local offer outage');
  state.failLoad = false;
  await popup.getByRole('button', { name: 'Grab your gift' }).click();
  await expect(page.getByRole('heading', { name: 'Your gift is ready!' })).toBeVisible();
  await page.getByRole('button', { name: 'Close gift offer' }).click();
  await page.getByRole('button', { name: 'Dismiss gift offer' }).click();
  await expect(page.getByRole('button', { name: 'Open your gift offer' })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('CMS staff can edit and recover from load/save errors; other staff have no menu access', async ({ page }) => {
  const state = await fixture(page, { role: 'staff', permissions: ['/cms'] });
  state.failLoad = true;
  await page.goto(admin + '/home-gift-offer');
  await expect(page.getByRole('alert')).toContainText('Local offer outage');
  state.failLoad = false; await page.getByRole('button', { name: 'Retry' }).click();
  await page.getByLabel('Popup heading', { exact: true }).fill('My edited gift');
  state.failSave = true; await page.getByRole('button', { name: 'Save gift offer' }).click();
  await expect(page.getByRole('alert')).toContainText('Local save failure');
  await expect(page.getByLabel('Popup heading', { exact: true })).toHaveValue('My edited gift');
  await expect(page.getByRole('button', { name: 'Save gift offer' })).toBeEnabled();
  state.failSave = false; await page.getByRole('button', { name: 'Save gift offer' }).click();
  await expect(page.getByRole('button', { name: 'Save gift offer' })).toBeDisabled();
  await page.addInitScript(() => localStorage.setItem('permissions', JSON.stringify(['/coupons'])));
  const before = state.calls.filter(call => call.path === '/api/cms/admin/homeGiftOffer').length;
  await page.reload();
  await expect(page.getByRole('link', { name: 'Home Gift Offer', exact: true })).toHaveCount(0);
  expect(state.calls.filter(call => call.path === '/api/cms/admin/homeGiftOffer')).toHaveLength(before);
  expect(state.errors).toEqual([]);
});
