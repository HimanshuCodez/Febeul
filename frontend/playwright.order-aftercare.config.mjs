import { defineConfig } from '@playwright/test';
import config from './playwright.analytics.config.mjs';

export default defineConfig({
  ...config,
  testMatch: 'order-aftercare.spec.mjs',
  outputDir: './test-results/order-aftercare',
  webServer: config.webServer[0],
});
