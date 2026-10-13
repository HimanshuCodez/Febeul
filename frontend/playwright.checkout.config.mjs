import { defineConfig } from '@playwright/test';
import config from './playwright.analytics.config.mjs';

export default defineConfig({
  ...config,
  testMatch: ['checkout.spec.mjs', 'cart-coupons.spec.mjs', 'analytics.spec.mjs'],
  outputDir: './test-results/checkout',
  webServer: config.webServer[0],
});
