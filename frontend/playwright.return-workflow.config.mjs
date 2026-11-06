import { defineConfig } from '@playwright/test';
import config from './playwright.admin-search.config.mjs';

export default defineConfig({ ...config, testMatch: 'return-workflow.spec.mjs', outputDir: './test-results/return-workflow' });
