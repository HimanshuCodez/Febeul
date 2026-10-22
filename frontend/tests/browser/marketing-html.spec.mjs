import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const admin = 'http://127.0.0.1:5181';
const campaignHtml = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; background: rgb(245, 240, 230); }
  h1 { color: rgb(136, 77, 29); font-size: 36px; }
  .offer { padding: 32px; }
  @media (max-width: 400px) { h1 { font-size: 24px; } .offer { padding: 16px; } }
</style></head><body>
<table role="presentation" width="100%"><tr><td class="offer">
  <img src="https://example.test/banner.png" alt="Campaign banner" width="120" height="40" onerror="window.badPreview = true">
  <h1>Luxe collection</h1><p>Discover your next favourite.</p>
  <a href="https://example.test/collection" style="color: #884d1d">Shop the collection</a>
</td></tr></table><script>window.badPreview = true</script>
</body></html>`;

async function openMarketing(page, { staff = false } = {}) {
  const state = { sends: [], history: [], errors: [], failSend: false, failHistory: false, historyQueries: [], apiPaths: [] };
  await page.addInitScript(({ staff }) => {
    localStorage.setItem('token', 'mock-marketing-token');
    localStorage.setItem('role', staff ? 'staff' : 'admin');
    localStorage.setItem('permissions', JSON.stringify(staff ? ['/send-mail'] : []));
  }, { staff });
  page.on('pageerror', error => state.errors.push(error.message));
  // All non-admin traffic is mocked or blocked, including every email send.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === admin) return route.continue();
    if (url.origin !== 'http://127.0.0.1:4198') return route.abort();
    state.apiPaths.push(url.pathname);
    if (url.pathname === '/api/admin/send-marketing-mail') {
      const payload = route.request().postDataJSON();
      state.sends.push(payload);
      if (state.failSend) return route.fulfill({ status: 500, json: { success: false, message: 'Mock send failed' } });
      state.history.push({ ...payload, _id: `campaign-${state.sends.length}`, sentAt: '2026-10-21T10:00:00Z', sentBy: 'Admin', recipients: ['member@example.test'], successCount: 1, failCount: 0 });
      return route.fulfill({ json: { success: true, message: 'Mock campaign sent' } });
    }
    if (url.pathname === '/api/admin/mail-history') {
      const filters = Object.fromEntries(url.searchParams);
      state.historyQueries.push(filters);
      if (state.failHistory) return route.fulfill({ status: 500, json: { success: false, message: 'History unavailable' } });
      let history = state.history.filter(record => (!filters.sentFrom || new Date(record.sentAt) >= new Date(filters.sentFrom)) && (!filters.sentBefore || new Date(record.sentAt) < new Date(filters.sentBefore)));
      if (!filters.sentFrom && !filters.sentBefore) history = history.slice(0, 100);
      return route.fulfill({ json: { success: true, history } });
    }
    if (url.pathname.startsWith('/api/admin/mail-history/')) return route.fulfill({ json: { success: true, record: state.history.find(record => url.pathname.endsWith(record._id)) } });
    return route.fulfill({ json: { success: true, data: {}, content: {} } });
  });
  await page.goto(`${admin}/send-mail`);
  await expect(page.getByRole('heading', { name: 'Email Marketing Campaign' })).toBeVisible();
  return state;
}

test('full HTML previews in isolation, sends the selected audience and renders in history', async ({ page }, testInfo) => {
  const state = await openMarketing(page, { staff: true });
  const heading = page.getByRole('heading', { name: 'Email Marketing Campaign' });
  const adminColor = await heading.evaluate(element => getComputedStyle(element).color);
  await page.getByLabel('Email Subject Line').fill('October luxe collection');
  await page.getByLabel('Target Audience').selectOption('specific');
  await page.getByLabel('Specific Email IDs (Comma separated)').fill('member@example.test');
  await page.getByRole('button', { name: 'HTML code', exact: true }).click();
  await page.getByLabel('Email HTML code', { exact: true }).fill(campaignHtml);
  const preview = page.frameLocator('iframe[title="Marketing email preview"]');
  await expect(preview.getByRole('heading', { name: 'Luxe collection' })).toHaveCSS('color', 'rgb(136, 77, 29)');
  await expect(preview.getByRole('heading')).toHaveCSS('font-size', '36px');
  await expect(preview.getByRole('link', { name: 'Shop the collection' })).toHaveAttribute('href', 'https://example.test/collection');
  await expect(preview.getByAltText('Campaign banner')).toHaveAttribute('src', 'https://example.test/banner.png');
  await expect(preview.locator('script')).toHaveCount(0);
  await expect(preview.locator('[onerror]')).toHaveCount(0);
  await expect(heading).toHaveCSS('color', adminColor);
  await page.getByRole('button', { name: 'Mobile preview' }).click();
  await expect(preview.getByRole('heading')).toHaveCSS('font-size', '24px');
  await page.getByRole('button', { name: 'Desktop preview' }).click();
  await expect(preview.getByRole('heading')).toHaveCSS('font-size', '36px');
  await page.screenshot({ path: testInfo.outputPath('html-editor-desktop.png'), fullPage: true });
  const expectedHtml = await page.locator('iframe[title="Marketing email preview"]').getAttribute('srcdoc');
  await page.getByRole('button', { name: 'Send campaign' }).click();
  await expect(page.getByLabel('Email Subject Line')).toHaveValue('');
  expect(state.sends).toHaveLength(1);
  expect(state.sends[0]).toMatchObject({ subject: 'October luxe collection', target: 'specific', specificEmails: 'member@example.test', htmlContent: expectedHtml });
  expect(state.sends[0].htmlContent).toContain('<style>');
  expect(state.sends[0]).not.toHaveProperty('title');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  const historyPreview = page.frameLocator('iframe[title="Sent campaign preview"]');
  await expect(historyPreview.getByRole('heading', { name: 'Luxe collection' })).toHaveCSS('color', 'rgb(136, 77, 29)');
  expect(state.apiPaths.some(path => path.startsWith('/api/email-template'))).toBe(false);
  expect(state.errors).toEqual([]);
});

test('keeps both drafts, validates HTML, recovers from failure and still sends visual campaigns', async ({ page }, testInfo) => {
  const state = await openMarketing(page);
  const htmlMode = page.getByRole('button', { name: 'HTML code', exact: true });
  const visualMode = page.getByRole('button', { name: 'Visual editor', exact: true });
  const code = page.getByLabel('Email HTML code', { exact: true });
  await page.getByLabel('Email Subject Line').fill('Visual campaign');
  await page.getByLabel('Main Heading (Inside Email)').fill('Visual heading');
  await page.locator('.ql-editor').fill('Visual message');
  await htmlMode.click();
  await expect(code).toHaveValue(/Visual heading/);
  await expect(code).toHaveValue(/Visual(?:&nbsp;|\s)message/);
  await code.fill('<p>Independent HTML draft</p>');
  await visualMode.click();
  await page.getByLabel('Main Heading (Inside Email)').fill('Updated visual heading');
  await expect(page.locator('.ql-editor')).toHaveText('Visual message');
  await htmlMode.click();
  await expect(code).toHaveValue('<p>Independent HTML draft</p>');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Copy from visual editor' }).click();
  await expect(code).toHaveValue('<p>Independent HTML draft</p>');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Copy from visual editor' }).click();
  await expect(code).toHaveValue(/Updated visual heading/);
  await code.fill('');
  await visualMode.click();
  await htmlMode.click();
  await expect(code).toHaveValue('');
  await page.getByRole('button', { name: 'Send campaign' }).click();
  await expect(page.getByText('Subject and HTML code are required.', { exact: true })).toBeVisible();
  expect(state.sends).toHaveLength(0);
  await code.fill(campaignHtml);
  state.failSend = true;
  await page.getByRole('button', { name: 'Send campaign' }).click();
  await expect(page.getByText('Mock send failed', { exact: true })).toBeVisible();
  await expect(code).toHaveValue(campaignHtml);
  await expect(page.getByLabel('Email Subject Line')).toHaveValue('Visual campaign');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await code.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await code.boundingBox();
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  }
  await page.screenshot({ path: testInfo.outputPath('html-editor-mobile.png'), fullPage: true });
  state.failSend = false;
  await visualMode.click();
  await page.getByLabel('Target Audience').selectOption('luxe');
  await page.getByRole('button', { name: 'Send campaign' }).click();
  await expect(page.getByLabel('Email Subject Line')).toHaveValue('');
  expect(state.sends).toHaveLength(2);
  expect(state.sends[1]).toMatchObject({ target: 'luxe', title: 'Updated visual heading' });
  expect(state.sends[1].htmlContent).toMatch(/Visual(?:&nbsp;|\s)message/);
  expect(state.sends[1].htmlContent).not.toContain('Shop the collection');
  expect(state.errors).toEqual([]);
});

test('filters history by complete local dates and exports only matching campaigns', async ({ page }, testInfo) => {
  const state = await openMarketing(page);
  state.history = [
    ['Before range', '2026-10-09T23:59:59.999+05:30'],
    ['First boundary', '2026-10-10T00:00:00+05:30'],
    ['Middle campaign', '2026-10-15T12:00:00+05:30'],
    ['Last boundary', '2026-10-20T23:59:59.999+05:30'],
    ['After range', '2026-10-21T00:00:00+05:30'],
  ].map(([subject, sentAt], index) => ({ _id: String(index), subject, sentAt, target: 'all', recipients: ['member@example.test'], successCount: 1, failCount: 0, sentBy: 'Admin' }));
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  const from = page.getByLabel('Sent from', { exact: true });
  const to = page.getByLabel('Sent to', { exact: true });
  const clear = page.getByRole('button', { name: 'Clear dates', exact: true });
  await from.fill('2026-10-10');
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await to.fill('2026-10-20');
  await expect(page.locator('tbody tr')).toHaveCount(3);
  expect(state.historyQueries.at(-1)).toEqual({ sentFrom: '2026-10-09T18:30:00.000Z', sentBefore: '2026-10-20T18:30:00.000Z' });
  await expect(page.getByText('First boundary', { exact: true })).toBeVisible();
  await expect(page.getByText('Last boundary', { exact: true })).toBeVisible();
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export to Excel', exact: true }).click();
  const download = await pendingDownload;
  const csv = await readFile(await download.path(), 'utf8');
  expect(download.suggestedFilename()).toContain('2026-10-10_to_2026-10-20');
  for (const subject of ['First boundary', 'Middle campaign', 'Last boundary']) expect(csv).toContain(subject);
  for (const subject of ['Before range', 'After range']) expect(csv).not.toContain(subject);
  await to.fill('2026-10-10');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByText('First boundary', { exact: true })).toBeVisible();
  await from.fill('2026-10-21');
  await expect(page.getByRole('alert')).toContainText('Sent from must be on or before Sent to.');
  await expect(page.getByRole('button', { name: 'Export to Excel' })).toBeDisabled();
  await clear.click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await to.fill('2026-10-20');
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('campaign-dates-mobile.png'), fullPage: true });
  await clear.click();
  await from.fill('2026-11-01');
  await expect(page.getByText('No campaigns found for the selected dates.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export to Excel' })).toBeDisabled();
  state.failHistory = true;
  await clear.click();
  await expect(page.getByRole('alert')).toHaveText('History unavailable');
  await expect(page.getByRole('button', { name: 'Export to Excel' })).toBeDisabled();
  state.failHistory = false;
  await from.fill('2026-10-10');
  await expect(page.locator('tbody tr')).toHaveCount(4);
  expect(state.sends).toHaveLength(0);
  expect(state.errors).toEqual([]);
});
