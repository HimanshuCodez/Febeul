import { defineConfig } from '@playwright/test';
import config from './playwright.analytics.config.mjs';

export default defineConfig({
  ...config,
  testMatch: 'product-card.spec.mjs',
  outputDir: './test-results/product-card',
  webServer: config.webServer[0],
});
