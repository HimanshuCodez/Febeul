import { defineConfig } from '@playwright/test';
import config from './playwright.analytics.config.mjs';

export default defineConfig({
  ...config,
  testMatch: ['luxe-appearance.spec.mjs', 'membership-coupons.spec.mjs'],
  outputDir: './test-results/luxe-appearance',
});
