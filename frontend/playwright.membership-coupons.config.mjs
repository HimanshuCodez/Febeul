import { defineConfig } from '@playwright/test';
import config from './playwright.analytics.config.mjs';

export default defineConfig({
  ...config,
  testMatch: ['membership-coupons.spec.mjs', 'product-coupons.spec.mjs'],
  outputDir: './test-results/membership-coupons',
  webServer: config.webServer[0],
});
