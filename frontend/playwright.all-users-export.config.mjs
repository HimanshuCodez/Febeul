import { defineConfig } from '@playwright/test';
import base from './playwright.admin-search.config.mjs';

export default defineConfig({ ...base, testMatch: 'all-users-export.spec.mjs', outputDir: './test-results/all-users-export', use: { ...base.use, timezoneId: 'Asia/Kolkata' } });
