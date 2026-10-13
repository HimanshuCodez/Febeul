import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { installSecurity } from '../middleware/security.js';
import adminAuth from '../middleware/adminAuth.js';

// Test HTTP preflights without connecting to a database or using live credentials.
const keys = ['NODE_ENV', 'JWT_SECRET', 'TRUST_PROXY_HOPS', 'CORS_ORIGINS'];
const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
beforeEach(() => {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'local-cors-test-secret-at-least-32-bytes';
  process.env.TRUST_PROXY_HOPS = '0';
  delete process.env.CORS_ORIGINS;
});
after(() => {
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

async function withApi(run) {
  const app = express();
  installSecurity(app);
  app.get('/api/admin/dashboard-stats', adminAuth, (_req, res) => res.json({ success: true }));
  app.post('/api/user/admin', (_req, res) => res.status(401).json({ success: false }));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const preflight = (origin, method = 'POST') => fetch(base + (method === 'GET' ? '/api/admin/dashboard-stats?range=30days' : '/api/user/admin'), {
      method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': 'content-type,token' },
    });
    await run({ base, preflight });
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('default production origins allow admin login and dashboard preflights', async () => {
  await withApi(async ({ preflight }) => {
    for (const origin of ['https://febeul.com', 'https://www.febeul.com', 'https://febeul.vercel.app']) {
      for (const method of ['GET', 'POST']) {
        const response = await preflight(origin, method);
        assert.equal(response.status, 204);
        assert.equal(response.headers.get('access-control-allow-origin'), origin);
        assert.match(response.headers.get('access-control-allow-methods'), new RegExp(method));
        assert.match(response.headers.get('access-control-allow-headers').toLowerCase(), /content-type/);
        assert.match(response.headers.get('access-control-allow-headers').toLowerCase(), /token/);
        assert.match(response.headers.get('vary'), /Origin/);
      }
    }
  });
});

test('allowing the admin origin does not bypass authentication', async () => {
  await withApi(async ({ base }) => {
    const response = await fetch(base + '/api/admin/dashboard-stats', { headers: { Origin: 'https://febeul.vercel.app' } });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://febeul.vercel.app');
    assert.equal((await response.json()).success, false);
  });
});

test('an explicit allowlist remains authoritative and accepts comma-separated values', async () => {
  process.env.CORS_ORIGINS = ' https://admin.example.test, https://shop.example.test ';
  await withApi(async ({ preflight }) => {
    for (const origin of ['https://admin.example.test', 'https://shop.example.test']) {
      const response = await preflight(origin);
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
    }
    const excluded = await preflight('https://febeul.vercel.app');
    assert.equal(excluded.headers.get('access-control-allow-origin'), null);
  });
});

test('unknown, lookalike, insecure and local origins remain blocked in production', async () => {
  await withApi(async ({ preflight }) => {
    for (const origin of ['https://attacker.test', 'https://another-project.vercel.app', 'https://febeul.vercel.app.attacker.test', 'http://febeul.vercel.app', 'http://localhost:5173', 'null']) {
      const response = await preflight(origin);
      assert.equal(response.headers.get('access-control-allow-origin'), null, origin);
    }
  });
});
