import { defineConfig } from '@playwright/test';
import config from './playwright.analytics.config.mjs';

export default defineConfig({
  ...config,
  testMatch: 'product-coupons.spec.mjs',
  outputDir: './test-results/product-coupons',
  webServer: config.webServer[0],
});
