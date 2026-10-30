import { defineConfig } from '@playwright/test';
import base from './playwright.admin-search.config.mjs';

export default defineConfig({ ...base, testMatch: 'admin-theme.spec.mjs', outputDir: './test-results/admin-theme' });
