import { defineConfig } from '@playwright/test';
import config from './playwright.analytics.config.mjs';

export default defineConfig({
  ...config,
  testMatch: 'profile.spec.mjs',
  outputDir: './test-results/profile',
  webServer: config.webServer[0],
});
