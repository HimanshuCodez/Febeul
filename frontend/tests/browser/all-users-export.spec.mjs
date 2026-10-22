import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const admin = 'http://127.0.0.1:5179';
const buyers = Array.from({ length: 13 }, (_, index) => ({
  _id: `buyer-id-${String(index).padStart(2, '0')}`, name: `Buyer ${index}`, email: `buyer${index}@export.test`, mobile: `999999${String(index).padStart(4, '0')}`,
  role: 'user', createdAt: '2026-10-15T12:00:00+05:30', giftWrapsLeft: 0, isBlocked: false,
}));
buyers[0] = { ...buyers[0], name: 'Buyer "खरीदार",\nRose', mobile: '+919999990000', createdAt: '2026-10-10T00:00:00+05:30', isLuxeMember: true, luxeMembershipExpires: '2099-12-31', giftWrapsLeft: 15 };
buyers[1] = { ...buyers[1], name: '=1+1', isBlocked: true, isLuxeMember: true, luxeMembershipExpires: '2000-01-01' };
buyers[12].createdAt = '2026-10-20T23:59:59+05:30';
const users = [...buyers,
  { ...buyers[2], _id: 'outside-before', email: 'before@export.test', createdAt: '2026-10-09T23:59:59+05:30' },
  { ...buyers[2], _id: 'outside-after', email: 'after@export.test', createdAt: '2026-10-21T00:00:00+05:30' },
  { ...buyers[2], _id: 'staff-account', name: 'Staff Person', email: 'staff@export.test', role: 'staff' },
  { ...buyers[2], _id: 'admin-account', name: 'Admin Person', email: 'admin@export.test', role: 'admin' },
];

async function setup(page) {
  const state = { fail: false, delay: false, errors: [], writes: [] };
  await page.addInitScript(() => { localStorage.setItem('token', 'local-export-test'); localStorage.setItem('role', 'admin'); localStorage.setItem('permissions', '[]'); });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === admin) return route.continue();
    if (url.origin !== 'http://127.0.0.1:4198') return route.abort();
    if (request.method() !== 'GET') state.writes.push(url.pathname);
    if (url.pathname === '/api/user/allusers') {
      if (state.delay) await new Promise(resolve => setTimeout(resolve, 700));
      if (state.fail) return route.fulfill({ status: 503, json: { success: false } });
      return route.fulfill({ json: { success: true, users } });
    }
    return route.fulfill({ json: { success: true, data: {}, content: {} } });
  });
  await page.goto(admin + '/allusers');
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeEnabled();
  return state;
}

async function downloadUsers(page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await pending;
  return { filename: download.suggestedFilename(), csv: await readFile(await download.path(), 'utf8') };
}

test('CSV uses combined filters and all matching pages, with literal spreadsheet values', async ({ page }) => {
  const state = await setup(page);
  const all = await downloadUsers(page);
  expect(all.filename).toMatch(/^users-all-\d{4}-\d{2}-\d{2}\.csv$/);
  for (const user of users) expect(all.csv).toContain(`"${user._id}"`);
  expect(all.csv.startsWith('\uFEFF"User ID","Name","Email","Phone"')).toBe(true);
  expect(all.csv).toContain('"Buyer ""खरीदार"",\nRose"');
  expect(all.csv).toContain('"\'=1+1"');
  expect(all.csv).toContain('"\'+919999990000"');
  expect(all.csv).toContain('"Luxe","31 Dec 2099","15"');
  expect(all.csv).toContain('"Standard","01 Jan 2000","0","15 Oct 2026","Blocked"');

  await page.getByRole('combobox', { name: 'Filter by role' }).selectOption('user');
  await page.getByLabel('Joined from').fill('2026-10-10');
  await page.getByLabel('Joined to').fill('2026-10-20');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page');
  const filtered = await downloadUsers(page);
  expect(filtered.filename).toMatch(/^users-filtered-/);
  for (const user of buyers) expect(filtered.csv).toContain(`"${user._id}"`);
  for (const user of users.slice(buyers.length)) expect(filtered.csv).not.toContain(`"${user._id}"`);
  await page.getByLabel('Search users', { exact: true }).fill('buyer12@export.test');
  const searched = await downloadUsers(page);
  expect(searched.csv).toContain('"buyer-id-12"');
  expect(searched.csv).not.toContain('"buyer-id-00"');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('combobox', { name: 'Filter by role' }).selectOption('staff');
  const staff = await downloadUsers(page);
  expect(staff.csv).toContain('"staff-account"'); expect(staff.csv).toContain('"admin-account"');
  expect(staff.csv).not.toContain('"buyer-id-');
  expect(state.writes).toEqual([]); expect(state.errors).toEqual([]);
});

test('export works on mobile and is disabled for empty results, loading and errors', async ({ page }) => {
  const state = await setup(page);
  await page.setViewportSize({ width: 320, height: 900 });
  const button = page.getByRole('button', { name: 'Export CSV', exact: true });
  await button.scrollIntoViewIfNeeded();
  const bounds = await button.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  const mobile = await downloadUsers(page);
  expect(mobile.csv).toContain('"buyer-id-12"');
  await page.getByLabel('Search users', { exact: true }).fill('no-matching-account');
  await expect(button).toBeDisabled();
  await page.getByRole('button', { name: 'Clear user search' }).click();
  state.delay = true;
  await page.getByRole('button', { name: 'Refresh users' }).click();
  await expect(button).toBeDisabled();
  await expect(button).toBeEnabled();
  state.fail = true;
  await page.getByRole('button', { name: 'Refresh users' }).click();
  await expect(page.getByRole('alert')).toContainText("Couldn't load users");
  await expect(button).toBeDisabled();
  expect(state.writes).toEqual([]); expect(state.errors).toEqual([]);
});
