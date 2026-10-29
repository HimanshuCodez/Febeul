import { defineConfig } from '@playwright/test';
import base from './playwright.admin-search.config.mjs';

export default defineConfig({ ...base, testMatch: ['product-drafts.spec.mjs', 'product-uploads.spec.mjs'], outputDir: './test-results/product-drafts' });
