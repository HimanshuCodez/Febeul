import { test, expect } from '@playwright/test';

const shop = 'http://127.0.0.1:5177';
const user = { _id: '507f1f77bcf86cd799439022', name: 'Local shopper', email: 'shopper@example.test', addresses: [] };
// Provider fixtures exercise our integration without contacting Cloudflare, Google, or sending email.
const turnstileScript = `
  window.testWidgets = [];
  window.turnstile = {
    render(container, options) {
      const id = window.testWidgets.length;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Complete security verification';
      button.style.cssText = 'background:#fafafa;border:1px solid #ddd;border-radius:4px;font:13px sans-serif;padding:10px;flex-shrink:0';
      button.style.width = options.size === 'compact' ? '150px' : '300px';
      button.style.height = options.size === 'compact' ? '140px' : '65px';
      button.onclick = () => { options.callback('test-token-' + id); button.textContent = 'Verified'; };
      container.appendChild(button);
      window.testWidgets.push({ id, options, button, removed: false });
      return String(id);
    },
    remove(id) {
      const widget = window.testWidgets[Number(id)];
      widget.removed = true;
      widget.button.remove();
    },
  };
`;
const googleScript = `
  window.google = { accounts: { id: {
    initialize(options) { window.testGoogleCallback = options.callback; },
    renderButton(container) {
      const button = document.createElement('button');
      button.textContent = 'Mock Google login';
      button.onclick = () => window.testGoogleCallback({ credential: 'test-google-credential' });
      container.replaceChildren(button);
    },
    cancel() {},
  } } };
`;

async function mockAuth(page, overrides = {}) {
  const state = { calls: [], errors: [], enabled: true, configFails: false, scriptFails: false, loginFails: false, holdLogin: false, releases: [], ...overrides };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.hostname === 'challenges.cloudflare.com') {
      state.scriptRequests = (state.scriptRequests || 0) + 1;
      return state.scriptFails ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: turnstileScript });
    }
    if (url.href === 'https://accounts.google.com/gsi/client') return route.fulfill({ contentType: 'application/javascript', body: googleScript });
    if (url.pathname.startsWith('/api/')) {
      let body;
      try { body = req.postDataJSON(); } catch { /* GET */ }
      state.calls.push({ path: url.pathname, body });
      if (url.pathname === '/api/user/auth-config') return route.fulfill({ status: state.configFails ? 503 : 200, json: state.configFails
        ? { success: false } : { success: true, turnstile: { enabled: state.enabled, siteKey: state.enabled ? 'test-public-site-key' : null } } });
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { success: true, enabled: false } });
      if (url.pathname === '/api/user/login') {
        if (state.holdLogin) await new Promise(resolve => state.releases.push(resolve));
        return route.fulfill({ status: state.loginFails ? 400 : 200, json: state.loginFails
          ? { success: false, message: 'Invalid credentials' } : { success: true, token: 'local-test-token', user } });
      }
      if (['/api/user/google-login', '/api/user/register', '/api/otp/verify-email-login-otp'].includes(url.pathname)) return route.fulfill({ json: { success: true, token: 'local-test-token', user } });
      if (url.pathname === '/api/otp/verify-email-otp') return route.fulfill({ json: { success: true, registrationToken: 'signed-email-proof' } });
      if (url.pathname === '/api/user/profile') return route.fulfill({ json: { success: true, user } });
      return route.fulfill({ json: { success: true, content: null, products: [], wishlist: [], cartItems: [], tickets: [], coupons: [], giftWraps: [], reviews: [], policies: [], messages: [] } });
    }
    if (url.origin !== shop && url.protocol !== 'data:') return route.abort();
    return route.continue();
  });
  await page.goto(shop + '/auth');
  return state;
}
const submit = page => page.locator('form button[type="submit"]');
const calls = (state, path) => state.calls.filter(call => call.path === path);
const solve = page => page.getByRole('button', { name: 'Complete security verification', exact: true }).click();
async function credentials(page) {
  await page.getByPlaceholder('Email Address', { exact: true }).fill(user.email);
  await page.getByPlaceholder('Password', { exact: true }).fill('LocalPassword123!');
}
async function otp(page, prefix) {
  for (let i = 0; i < 6; i++) await page.locator('#' + prefix + '-otp-' + i).fill(String(i + 1));
}

test('password login waits for verification, prevents duplicate requests, and retries with a fresh token', async ({ page }) => {
  const state = await mockAuth(page, { loginFails: true, holdLogin: true });
  await credentials(page);
  await expect(submit(page)).toBeDisabled();
  await page.locator('form').evaluate(form => form.requestSubmit());
  expect(calls(state, '/api/user/login')).toHaveLength(0);
  await solve(page);
  await submit(page).click();
  await expect.poll(() => state.releases.length).toBe(1);
  await expect(submit(page)).toBeDisabled();
  await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  state.releases[0]();
  await expect(page.getByText('Invalid credentials', { exact: true }).first()).toBeVisible();
  expect(calls(state, '/api/user/login')).toHaveLength(1);
  await expect(submit(page)).toBeDisabled();
  state.holdLogin = false;
  state.loginFails = false;
  await solve(page);
  await submit(page).click();
  await expect(page).toHaveURL(shop + '/');
  const requests = calls(state, '/api/user/login');
  expect(requests).toHaveLength(2);
  expect(requests[0].body.turnstileToken).toMatch(/^test-token-/);
  expect(requests[1].body.turnstileToken).not.toBe(requests[0].body.turnstileToken);
  expect(state.errors).toEqual([]);
});

test('email OTP login requires fresh verification for sending and checking the code', async ({ page }) => {
  const state = await mockAuth(page);
  await page.getByPlaceholder('Email Address').fill(user.email);
  await expect(page.getByRole('button', { name: 'Login with OTP' })).toBeDisabled();
  await solve(page);
  await page.getByRole('button', { name: 'Login with OTP' }).click();
  await otp(page, 'login');
  await expect(submit(page)).toBeDisabled();
  await solve(page);
  await submit(page).click();
  await expect(page).toHaveURL(shop + '/');
  const sent = calls(state, '/api/otp/send-email-otp')[0].body;
  const verified = calls(state, '/api/otp/verify-email-login-otp')[0].body;
  expect(sent).toMatchObject({ email: user.email, purpose: 'login' });
  expect(verified).toMatchObject({ email: user.email, otp: '123456' });
  expect(verified.turnstileToken).toMatch(/^test-token-/);
  expect(verified.turnstileToken).not.toBe(sent.turnstileToken);
  expect(state.errors).toEqual([]);
});

test('signup checks CAPTCHA on both OTP steps and forwards the signed proof to registration', async ({ page }) => {
  const state = await mockAuth(page);
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await page.getByPlaceholder('Full Name').fill(user.name);
  await credentials(page);
  await page.getByPlaceholder('Mobile Number').fill('9876543210');
  await page.getByPlaceholder('Confirm Password').fill('LocalPassword123!');
  await solve(page);
  await submit(page).click();
  await otp(page, 'signup');
  await expect(submit(page)).toBeDisabled();
  await solve(page);
  await submit(page).click();
  await expect(page).toHaveURL(shop + '/');
  const sent = calls(state, '/api/otp/send-email-otp')[0].body;
  const verified = calls(state, '/api/otp/verify-email-otp')[0].body;
  expect(sent.purpose).toBe('signup');
  expect(verified.turnstileToken).not.toBe(sent.turnstileToken);
  expect(calls(state, '/api/user/register')[0].body).toEqual({ name: user.name, email: user.email, mobile: '9876543210', password: 'LocalPassword123!', registrationToken: 'signed-email-proof' });
  expect(state.errors).toEqual([]);
});

test('Google login is gated and includes the server-verifiable token', async ({ page }) => {
  const state = await mockAuth(page);
  const google = page.getByRole('button', { name: 'Mock Google login', includeHidden: true });
  await expect(google.locator('../..')).toHaveAttribute('inert', '');
  await page.evaluate(() => window.testGoogleCallback({ credential: 'blocked-credential' }));
  expect(calls(state, '/api/user/google-login')).toHaveLength(0);
  await solve(page);
  await google.click();
  await expect(page).toHaveURL(shop + '/');
  expect(calls(state, '/api/user/google-login')[0].body).toMatchObject({ credential: 'test-google-credential', turnstileToken: expect.stringMatching(/^test-token-/) });
  expect(state.errors).toEqual([]);
});

test('expired tokens and widget errors disable submission until verification is retried', async ({ page }) => {
  const state = await mockAuth(page);
  await credentials(page);
  await solve(page);
  await expect(submit(page)).toBeEnabled();
  await page.evaluate(() => window.testWidgets.at(-1).options['expired-callback']());
  await expect(submit(page)).toBeDisabled();
  await page.getByRole('button', { name: 'Retry verification' }).click();
  await solve(page);
  await page.evaluate(() => window.testWidgets.at(-1).options['error-callback']());
  await expect(submit(page)).toBeDisabled();
  await page.getByRole('button', { name: 'Retry verification' }).click();
  await solve(page);
  await submit(page).click();
  await expect(page).toHaveURL(shop + '/');
  expect(calls(state, '/api/user/login')).toHaveLength(1);
  expect(state.errors).toEqual([]);
});

test('configuration and script failures show a working retry without allowing authentication', async ({ page }) => {
  const state = await mockAuth(page, { configFails: true, scriptFails: true });
  await expect(page.getByText('Sign-in verification is unavailable. Please try again.')).toBeVisible();
  await expect(submit(page)).toBeDisabled();
  state.configFails = false;
  await page.getByRole('button', { name: 'Retry security check' }).click();
  await expect(page.getByText('Security verification could not load. Check your connection and retry.')).toBeVisible();
  await expect(submit(page)).toBeDisabled();
  state.scriptFails = false;
  await page.getByRole('button', { name: 'Retry verification' }).click();
  await solve(page);
  await expect(submit(page)).toBeEnabled();
  expect(state.errors).toEqual([]);
});

test('mobile resizing and form changes discard old widgets and tokens without duplicating the script', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mockAuth(page);
  await solve(page);
  await page.setViewportSize({ width: 320, height: 750 });
  await expect(submit(page)).toBeDisabled();
  await solve(page);
  expect(await page.evaluate(() => window.testWidgets.at(-1).options.size)).toBe('compact');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(submit(page)).toBeDisabled();
  await page.evaluate(() => window.testWidgets.find(widget => widget.removed).options.callback('stale-token'));
  await expect(submit(page)).toBeDisabled();
  await page.getByRole('button', { name: 'Login Now' }).click();
  await solve(page);
  expect(await page.evaluate(() => window.testWidgets.filter(widget => !widget.removed).length)).toBe(1);
  expect(state.scriptRequests).toBe(1);
  const dimensions = await page.getByRole('group', { name: 'Security verification' }).evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  await expect.poll(() => page.locator('form').evaluate(form => form.getBoundingClientRect().left)).toBeGreaterThanOrEqual(0);
  await page.screenshot({ path: 'test-results/auth-turnstile/mobile.png', fullPage: true });
  expect(state.errors).toEqual([]);
});

test('an inactive rollout keeps existing password login available without loading the widget', async ({ page }) => {
  const state = await mockAuth(page, { enabled: false });
  await credentials(page);
  await expect(submit(page)).toBeEnabled();
  await submit(page).click();
  await expect(page).toHaveURL(shop + '/');
  expect(calls(state, '/api/user/login')[0].body).not.toHaveProperty('turnstileToken');
  expect(state.scriptRequests || 0).toBe(0);
  expect(state.errors).toEqual([]);
});

test('OTP resend consumes a fresh token and returning to password login clears verification', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.setInterval;
    window.setInterval = (callback, delay, ...args) => original(callback, delay === 1000 ? 10 : delay, ...args);
  });
  const state = await mockAuth(page);
  await page.getByPlaceholder('Email Address').fill(user.email);
  await solve(page);
  await page.getByRole('button', { name: 'Login with OTP' }).click();
  const resend = page.getByRole('button', { name: 'Resend OTP', exact: true });
  await expect(resend).toBeVisible();
  await expect(resend).toBeDisabled();
  await solve(page);
  await resend.click();
  await expect.poll(() => calls(state, '/api/otp/send-email-otp').length).toBe(2);
  await expect(submit(page)).toBeDisabled();
  const [first, second] = calls(state, '/api/otp/send-email-otp');
  expect(second.body.turnstileToken).toMatch(/^test-token-/);
  expect(second.body.turnstileToken).not.toBe(first.body.turnstileToken);
  await solve(page);
  await page.getByRole('button', { name: 'Back to Password Login' }).click();
  await expect(submit(page)).toBeDisabled();
  await expect(page.getByPlaceholder('Email Address')).toHaveValue(user.email);
  expect(state.errors).toEqual([]);
});
