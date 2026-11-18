import { test, expect } from '@playwright/test';

const admin = 'http://127.0.0.1:5179';
const backend = 'http://127.0.0.1:4198';
const variation = (sku, stocks) => ({ color: sku, sku, images: [], sizes: stocks.map((stock, index) => ({ size: ['S', 'M', 'L'][index], price: 399, mrp: 499, stock })) });
const product = (id, variations, isActive = true) => ({ _id: id, name: `Product ${id}`, category: 'BABYDOLL', date: Date.now(), isActive, variations });
const catalog = [
  product('mixed-sizes', [variation('MIXED', [0, 25])]),
  product('mixed-colours', [variation('BLUE', [20]), variation('SOLDOUT-RED', ['0'])]),
  product('fully-out', [variation('EMPTY', [0, '0'])]),
  product('hidden-out', [variation('HIDDEN', [0])], false),
  product('no-sizes', [variation('NO-SIZES', [])]),
  product('low-one', [variation('LOW-ONE', [1])]),
  product('low-ten', [variation('LOW-TEN', [4, 6])]),
  product('healthy', [variation('HEALTHY', [11, 20])]),
];

async function mockInventory(page, products = catalog) {
  const state = { errors: [], requests: [] };
  await page.addInitScript(() => {
    localStorage.setItem('token', 'stock-test-token');
    localStorage.setItem('role', 'admin');
    localStorage.setItem('userEmail', 'stock@example.test');
    localStorage.setItem('permissions', '[]');
  });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === admin) return route.continue();
    if (url.origin !== backend) return route.abort();
    state.requests.push({ path: url.pathname, method: request.method(), query: url.search });
    await route.fulfill({ json: url.pathname === '/api/product/list' ? { success: true, products } : { success: true, data: {}, content: null } });
  });
  return state;
}

const tabs = page => page.getByRole('group', { name: 'Filter products' });
const productLink = (page, id) => page.getByRole('link', { name: `View Product ${id} on website (opens in a new tab)`, exact: true });

test('out-of-stock includes unavailable sizes and colours alongside remaining stock, with searchable counts', async ({ page }) => {
  const state = await mockInventory(page);
  await page.goto(`${admin}/list`);
  await expect(tabs(page).getByRole('button', { name: 'All products 8', exact: true })).toBeVisible();
  await tabs(page).getByRole('button', { name: /^Out of stock/ }).click();
  await expect(tabs(page).getByRole('button', { name: 'Out of stock 5', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const id of ['mixed-sizes', 'mixed-colours', 'fully-out', 'hidden-out', 'no-sizes']) await expect(productLink(page, id)).toBeVisible();
  for (const id of ['low-one', 'low-ten', 'healthy']) await expect(productLink(page, id)).toHaveCount(0);
  await expect(page.getByText('1 size out of stock', { exact: true })).toHaveCount(2);

  const search = page.getByRole('textbox', { name: 'Search products' });
  await search.fill('SOLDOUT-RED');
  await expect(tabs(page).getByRole('button', { name: 'Out of stock 1', exact: true })).toBeVisible();
  await expect(productLink(page, 'mixed-colours')).toBeVisible();
  await expect(productLink(page, 'mixed-sizes')).toHaveCount(0);
  await search.fill('HEALTHY');
  await expect(tabs(page).getByRole('button', { name: 'Out of stock 0', exact: true })).toBeVisible();
  await expect(page.getByText('No products match the selected filter and search.')).toBeVisible();

  await search.fill('');
  await tabs(page).getByRole('button', { name: 'Low stock 2', exact: true }).click();
  for (const id of ['low-one', 'low-ten']) await expect(productLink(page, id)).toBeVisible();
  await expect(productLink(page, 'mixed-sizes')).toHaveCount(0);
  await tabs(page).getByRole('button', { name: 'Not visible on website 1', exact: true }).click();
  await expect(productLink(page, 'hidden-out')).toBeVisible();
  expect(state.requests.find(request => request.path === '/api/product/list').query).toContain('includeInactive=true');
  expect(state.requests.every(request => request.method === 'GET')).toBe(true);
  expect(state.errors).toEqual([]);
});

test('out-of-stock pagination and mobile direct links retain mixed-stock products', async ({ page }) => {
  const products = Array.from({ length: 12 }, (_, index) => product(`mixed-${index}`, [variation(`SKU-${index}`, [0, 20])]));
  const state = await mockInventory(page, products);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${admin}/list?tab=out-of-stock`);
  await expect(tabs(page).getByRole('button', { name: 'Out of stock 12', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(productLink(page, 'mixed-11')).toBeVisible();
  await expect(productLink(page, 'mixed-0')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(productLink(page, 'mixed-0')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search products' }).fill('SKU-11');
  await expect(page.getByText('Page 1 of 1')).toBeVisible();
  await expect(productLink(page, 'mixed-11')).toBeVisible();
  await page.reload();
  await expect(tabs(page).getByRole('button', { name: /^Out of stock/ })).toHaveAttribute('aria-pressed', 'true');
  expect(state.errors).toEqual([]);
});
