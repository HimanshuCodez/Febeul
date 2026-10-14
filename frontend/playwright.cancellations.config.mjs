import { defineConfig } from '@playwright/test';
import base from './playwright.analytics.config.mjs';

export default defineConfig({ ...base, testMatch: 'cancellations.spec.mjs', outputDir: './test-results/cancellations' });
