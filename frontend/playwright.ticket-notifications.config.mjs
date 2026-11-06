import { defineConfig } from '@playwright/test';
import config from './playwright.analytics.config.mjs';

export default defineConfig({
  ...config,
  testMatch: 'ticket-notifications.spec.mjs',
  outputDir: './test-results/ticket-notifications',
  use: { ...config.use, viewport: { width: 1440, height: 1000 } },
});
