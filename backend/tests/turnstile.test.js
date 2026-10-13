import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import nock from 'nock';
import { getAuthConfig, requireTurnstile } from '../middleware/turnstile.js';

const keys = ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'TURNSTILE_ALLOWED_HOSTNAMES', 'RESEND_API_KEY', 'JWT_SECRET'];
const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
let server, base, admitted = 0;
const valid = { success: true, hostname: 'febeul.com', action: 'auth' };
const verify = () => nock('https://challenges.cloudflare.com').post('/turnstile/v0/siteverify', body => body.secret === 'test-server-secret' && body.response === 'test-token');
const request = async (path = '/protected', body = { turnstileToken: 'test-token' }) => {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
};

before(async () => {
  nock.disableNetConnect(); nock.enableNetConnect('127.0.0.1');
  process.env.RESEND_API_KEY = 're_local_test';
  process.env.JWT_SECRET = 'turnstile-local-test-secret-only-32-bytes';
  const { default: users } = await import('../routes/userRoute.js');
  const { default: otps } = await import('../routes/otpRoute.js');
  const { registerUser } = await import('../controllers/userController.js');
  const app = express();
  app.use(express.json());
  app.get('/config', getAuthConfig);
  app.post('/protected', requireTurnstile, (_req, res) => { admitted++; res.json({ success: true }); });
  app.post('/registration-proof', registerUser);
  app.use('/api/user', users); app.use('/api/otp', otps);
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(() => {
  admitted = 0;
  process.env.TURNSTILE_SITE_KEY = 'test-public-key';
  process.env.TURNSTILE_SECRET_KEY = 'test-server-secret';
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = 'febeul.com,www.febeul.com';
});
afterEach(() => { assert.equal(nock.isDone(), true, nock.pendingMocks().join(', ')); nock.cleanAll(); });
after(async () => {
  await new Promise(resolve => server?.close(resolve));
  nock.enableNetConnect();
  for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
});

test('public configuration exposes only the site key and is never cached', async () => {
  const response = await fetch(base + '/api/user/auth-config');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { success: true, turnstile: { enabled: true, siteKey: 'test-public-key' } });
});
test('both keys absent leaves rollout inactive; a partial configuration fails closed', async () => {
  delete process.env.TURNSTILE_SITE_KEY; delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal((await (await fetch(base + '/config')).json()).turnstile.enabled, false);
  assert.equal((await request('/protected', {})).status, 200);
  for (const key of ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY']) {
    process.env[key] = 'partially-configured';
    assert.equal((await fetch(base + '/config')).status, 503);
    assert.equal((await request()).status, 503);
    delete process.env[key];
  }
  assert.equal(admitted, 1);
});
test('missing, malformed and oversized tokens never reach Cloudflare or authentication', async () => {
  for (const token of [undefined, null, '', '   ', 123, ['test-token'], { token: 'test-token' }, 'a'.repeat(2049)]) {
    assert.equal((await request('/protected', { turnstileToken: token })).status, 400);
  }
  assert.equal(admitted, 0);
});
test('valid server-verified action and hostname allow one request', async () => {
  verify().reply(200, valid);
  assert.equal((await request()).status, 200);
  assert.equal(admitted, 1);
});
test('forged success, wrong action and wrong hostname are denied', async () => {
  for (const data of [{ success: false }, { ...valid, success: 'true' }, { ...valid, action: 'other' }, { ...valid, hostname: 'febeul.com.attacker.test' }, { success: true }]) {
    verify().reply(200, data);
    assert.equal((await request('/protected', { turnstileToken: 'test-token', success: true, hostname: 'febeul.com', action: 'auth' })).status, 403);
  }
  assert.equal(admitted, 0);
});
test('expired and previously redeemed tokens cannot be reused', async () => {
  verify().reply(200, valid);
  verify().twice().reply(200, { success: false, 'error-codes': ['timeout-or-duplicate'] });
  assert.equal((await request()).status, 200);
  assert.equal((await request()).status, 403);
  assert.equal((await request()).status, 403);
  assert.equal(admitted, 1);
});
test('provider errors and timeouts fail closed without returning secrets', async () => {
  for (const code of ['invalid-input-secret', 'internal-error']) {
    verify().reply(200, { success: false, 'error-codes': [code] });
    const result = await request();
    assert.equal(result.status, 503);
    assert.equal(JSON.stringify(result).includes('test-server-secret'), false);
  }
  verify().replyWithError({ code: 'ETIMEDOUT', message: 'timed out' });
  assert.equal((await request()).status, 503);
  verify().reply(500, 'upstream unavailable');
  assert.equal((await request()).status, 503);
  assert.equal(admitted, 0);
});
test('all AuthPage entry points reject direct requests with no challenge token', async () => {
  for (const path of ['/api/user/login', '/api/user/google-login', '/api/otp/send-email-otp', '/api/otp/verify-email-otp', '/api/otp/verify-email-login-otp']) {
    const result = await request(path, { email: 'shopper@example.test', password: 'test-password', purpose: 'signup', otp: '123456', credential: 'test-google-credential' });
    assert.equal(result.status, 400, path);
    assert.match(result.data.message, /security verification/);
  }
});
test('final registration still rejects a request without the signed email verification proof', async () => {
  const result = await request('/registration-proof', { name: 'Test shopper', email: 'shopper@example.test', password: 'test-password', turnstileToken: 'test-token' });
  assert.equal(result.status, 400);
  assert.match(result.data.message, /Verify your email/);
});
