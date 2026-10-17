import { defineConfig } from '@playwright/test';
import base from './playwright.admin-search.config.mjs';

export default defineConfig({ ...base, testMatch: 'product-uploads.spec.mjs', outputDir: './test-results/product-uploads' });
