import { defineConfig } from '@playwright/test';
import base from './playwright.analytics.config.mjs';

export default defineConfig({
  ...base,
  testMatch: 'auth-turnstile.spec.mjs',
  outputDir: './test-results/auth-turnstile',
  webServer: [base.webServer[0]],
});
