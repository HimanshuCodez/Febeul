import { test, expect } from '@playwright/test';
import { EMAIL_TEMPLATE_OPTIONS } from '../../../shared/emailTemplates.js';
import { getDefaultEmailContent, getEmailTemplateMeta, normalizeEmailContent, renderEmailTemplate, buildSampleEmailData } from '../../../backend/utils/emailTemplates.js';
import { buildSampleOrder, renderTemplateHtml } from '../../../backend/utils/orderEmailTemplate.js';

const admin = 'http://127.0.0.1:5181';

async function openEditor(page) {
  const state = { saved: new Map(), tests: [], errors: [], delaySave: false, failLoad: '' };
  await page.addInitScript(() => {
    localStorage.setItem('token', 'local-email-test');
    localStorage.setItem('role', 'admin');
    localStorage.setItem('permissions', '[]');
  });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === admin) return route.continue();
    if (url.origin !== 'http://127.0.0.1:4198') return route.abort();
    const match = url.pathname.match(/^\/api\/email-template\/([^/]+)(?:\/(preview|test))?$/);
    if (!match) return route.fulfill({ json: { success: true, data: {} } });
    const [, type, action] = match;
    const method = route.request().method();
    let content = state.saved.get(type) || getDefaultEmailContent(type);
    if (method === 'GET' && state.failLoad === type) return route.fulfill({ status: 500, json: { success: false } });
    if (method === 'POST') {
      const body = route.request().postDataJSON();
      if (action === 'preview') {
        const data = type === 'order-confirmation' ? buildSampleOrder() : buildSampleEmailData();
        return route.fulfill({ json: { success: true, ...renderEmailTemplate(type, body.content, data), template: renderTemplateHtml(normalizeEmailContent(type, body.content)), source: 'sample' } });
      }
      if (action === 'test') {
        state.tests.push({ type, ...body });
        return route.fulfill({ json: { success: true, message: 'Test email sent' } });
      }
      if (state.delaySave) await new Promise(resolve => setTimeout(resolve, 800));
      content = normalizeEmailContent(type, body.content);
      state.saved.set(type, content);
    }
    if (method === 'DELETE') {
      state.saved.delete(type);
      content = getDefaultEmailContent(type);
    }
    return route.fulfill({ json: { success: true, content, meta: getEmailTemplateMeta(type), isDefault: !state.saved.has(type), creator: { name: 'Editor' }, updatedAt: '2026-10-12T10:00:00Z' } });
  });
  await page.goto(`${admin}/email-templates`);
  await expect(page.getByRole('heading', { name: 'Order Confirmation Email', exact: true })).toBeVisible();
  return state;
}

test('dropdown edits, previews, saves, reloads and resets each template independently', async ({ page }) => {
  const state = await openEditor(page);
  const select = page.getByLabel('Email template', { exact: true });
  await expect(select.locator('option')).toHaveCount(EMAIL_TEMPLATE_OPTIONS.length);
  for (const { id, label } of EMAIL_TEMPLATE_OPTIONS) {
    await select.selectOption(id);
    await expect(page.getByRole('heading', { name: `${label} Email`, exact: true })).toBeVisible();
    const subject = page.getByPlaceholder(`${label} email subject`);
    await subject.fill(`Updated ${id}`);
    await page.getByRole('button', { name: 'HTML code', exact: true }).click();
    await page.locator('textarea').fill(`<p>Custom ${id}: {{${id === 'order-confirmation' ? 'billingAddressName' : 'userName'}}}</p>`);
    await expect(page.frameLocator('iframe[title="Email preview"]').getByText(`Custom ${id}: Priya Sharma`)).toBeVisible();
    await page.getByRole('button', { name: 'Save template', exact: true }).click();
    await expect(page.getByText('Unsaved changes', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save template', exact: true })).toBeDisabled();
    if (id !== 'order-confirmation') await expect(page.getByRole('option', { name: 'Latest real order' })).toHaveCount(0);
  }
  expect(state.saved.size).toBe(EMAIL_TEMPLATE_OPTIONS.length);
  for (const { id, label } of EMAIL_TEMPLATE_OPTIONS) {
    await select.selectOption(id);
    await expect(page.getByPlaceholder(`${label} email subject`)).toHaveValue(`Updated ${id}`);
  }
  await page.getByPlaceholder('you@example.com').fill('test@example.test');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => state.tests.length).toBe(1);
  expect(state.tests[0].type).toBe('luxe-expired');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset to default', exact: true }).click();
  await expect(page.getByPlaceholder('Luxe Membership Expired email subject')).toHaveValue(getDefaultEmailContent('luxe-expired').subject);
  expect(state.saved.size).toBe(EMAIL_TEMPLATE_OPTIONS.length - 1);
  expect(state.errors).toEqual([]);
});

test('welcome email opens the original HTML and supports the visual builder', async ({ page }) => {
  const state = await openEditor(page);
  await page.getByLabel('Email template', { exact: true }).selectOption('welcome');
  await expect(page.getByRole('heading', { name: 'Welcome Email', exact: true })).toBeVisible();
  await expect(page.locator('textarea')).toHaveValue(getDefaultEmailContent('welcome').html);
  const preview = page.frameLocator('iframe[title="Email preview"]');
  await expect(preview.getByText('Hello Priya Sharma! 👋', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Visual builder', exact: true }).click();
  await expect(preview.getByRole('link', { name: 'Start Shopping Now', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add block', exact: true }).click();
  await expect(page.getByRole('button', { name: /Ordered Items|Price Summary|Order & Shipping Info/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save template', exact: true })).toBeDisabled();
  expect(state.saved.get('welcome').mode).toBe('builder');
  await page.reload();
  await page.getByLabel('Email template', { exact: true }).selectOption('welcome');
  await expect(preview.getByRole('link', { name: 'Start Shopping Now', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset to default', exact: true }).click();
  await expect(page.locator('textarea')).toHaveValue(getDefaultEmailContent('welcome').html);
  expect(state.saved.has('welcome')).toBe(false);
  expect(state.errors).toEqual([]);
});

test('switching protects unsaved edits, disables during saves and recovers from failed loads', async ({ page }) => {
  const state = await openEditor(page);
  const select = page.getByLabel('Email template', { exact: true });
  const subject = page.getByPlaceholder('Order Confirmation email subject');
  await subject.fill('Unsaved order subject');
  page.once('dialog', dialog => dialog.dismiss());
  await select.selectOption('return-request');
  await expect(select).toHaveValue('order-confirmation');
  await expect(subject).toHaveValue('Unsaved order subject');
  page.once('dialog', dialog => dialog.accept());
  await select.selectOption('return-request');
  await expect(page.getByPlaceholder('Return / Refund Request Received email subject')).toHaveValue('We Received Your Request');
  await page.getByRole('button', { name: 'Visual builder', exact: true }).click();
  await page.getByRole('button', { name: 'Add block', exact: true }).click();
  await expect(page.getByRole('button', { name: /Ordered Items|Price Summary|Order & Shipping Info/ })).toHaveCount(0);
  state.delaySave = true;
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await expect(select).toBeDisabled();
  await expect(select).toBeEnabled();
  state.failLoad = 'luxe-expired';
  await select.selectOption('luxe-expired');
  await expect(page.getByText('Could not load the email template. Please refresh the page.')).toBeVisible();
  await select.selectOption('refund-processed');
  await expect(page.getByRole('heading', { name: 'Refund Processed Email', exact: true })).toBeVisible();
  expect(state.errors).toEqual([]);
});
