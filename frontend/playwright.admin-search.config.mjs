import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', testMatch: 'admin-search.spec.mjs', workers: 1,
  timeout: 45000, outputDir: './test-results/admin-search',
  use: { headless: true, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm --prefix ../admin run dev -- --host 127.0.0.1 --port 5179 --strictPort',
    url: 'http://127.0.0.1:5179', reuseExistingServer: false,
    env: { VITE_BACKEND_URL: 'http://127.0.0.1:4198' },
  },
});
