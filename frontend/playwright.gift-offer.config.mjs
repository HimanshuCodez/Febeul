import { defineConfig } from '@playwright/test';
import config from './playwright.analytics.config.mjs';

export default defineConfig({
  ...config,
  testMatch: 'home-gift-offer.spec.mjs',
  outputDir: './test-results/gift-offer',
});
