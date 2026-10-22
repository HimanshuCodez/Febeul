import { defineConfig } from '@playwright/test';
import base from './playwright.email-templates.config.mjs';

export default defineConfig({
  ...base,
  use: { ...base.use, timezoneId: 'Asia/Kolkata' },
  testMatch: 'marketing-html.spec.mjs',
  outputDir: './test-results/marketing-html',
});
