import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'analytics.spec.mjs',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  outputDir: './test-results/analytics',
  use: { headless: true, viewport: { width: 1280, height: 900 }, trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run dev -- --host 127.0.0.1 --port 5177 --strictPort', url: 'http://127.0.0.1:5177', reuseExistingServer: false, env: { VITE_BACKEND_URL: 'http://127.0.0.1:4199' } },
    { command: 'npm --prefix ../admin run dev -- --host 127.0.0.1 --port 5178 --strictPort', url: 'http://127.0.0.1:5178', reuseExistingServer: false, env: { VITE_BACKEND_URL: 'http://127.0.0.1:4199' } },
  ],
});
