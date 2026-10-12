import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', testMatch: 'search.spec.mjs', workers: 1,
  timeout: 45000, outputDir: './test-results/search',
  use: { headless: true, viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5183 --strictPort',
    url: 'http://127.0.0.1:5183', reuseExistingServer: false,
    env: { VITE_BACKEND_URL: 'http://127.0.0.1:4198' },
  },
});
