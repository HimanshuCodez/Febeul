import { defineConfig } from '@playwright/test';
import config from './playwright.analytics.config.mjs';

export default defineConfig({
  ...config,
  testMatch: 'hero.spec.mjs',
  outputDir: './test-results/hero',
});
