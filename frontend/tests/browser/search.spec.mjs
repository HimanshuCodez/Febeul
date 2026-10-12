import { test, expect } from '@playwright/test';

const shop = 'http://127.0.0.1:5183';
const product = {
  _id: '650000000000000000000001', name: 'Rose Satin Nightwear', category: 'NIGHTY', sizes: ['M'],
  variations: [{ color: 'Rose', sku: 'ROSE-M', images: ['/removebgLogo.png'], sizes: [{ size: 'M', price: 799, mrp: 999, stock: 5 }] }],
};

async function fixture(page) {
  const state = { searches: [], errors: [] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { success: true, enabled: false } });
      if (url.pathname.startsWith('/api/policy/')) return route.fulfill({ json: {
        pageTitle: 'Search check page',
        content: Array.from({ length: 20 }, (_, index) => ({ title: `Question ${index}`, content: [{ type: 'paragraph', text: 'An answer to make this page scrollable.' }] })),
      } });
      if (url.pathname === '/api/product/bestsellers') return route.fulfill({ json: { success: true, products: [product] } });
      if (url.pathname === '/api/product/list') {
        state.searches.push(url.searchParams.get('search'));
        return route.fulfill({ json: { success: true, products: [product] } });
      }
      return route.fulfill({ json: { success: true, content: null, products: [], wishlist: [], coupons: [], messages: [] } });
    }
    return url.origin === shop ? route.continue() : route.abort();
  });
  return state;
}

async function openScrolledPage(page, path = '/Faq') {
  await page.goto(shop + path);
  await expect(page.getByRole('heading', { name: 'Search check page' })).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1500);
}

const searchInput = page => page.getByRole('textbox', { name: 'Search products' });
async function expectUnlocked(page, scrollY = 1500) {
  await expect.poll(() => page.evaluate(() => ({
    rootOverflow: document.documentElement.style.overflow,
    bodyPosition: document.body.style.position,
    bodyOverflow: document.body.style.overflow,
    scrollY: window.scrollY,
  }))).toEqual({ rootOverflow: '', bodyPosition: '', bodyOverflow: '', scrollY });
}

test('desktop search stays visible on scrolled pages and dismissal restores scrolling', async ({ page }) => {
  const state = await fixture(page);
  for (const path of ['/Faq', '/policy/Delivery']) {
    await openScrolledPage(page, path);
    const input = searchInput(page);
    const before = await input.boundingBox();
    await input.click();
    await expect(page.getByText('Recent Searches', { exact: true })).toBeVisible();
    const after = await input.boundingBox();
    expect(after.y).toBe(before.y);
    expect(after.x).toBe(before.x);
    expect(await page.evaluate(() => window.scrollY)).toBe(1500);
    await input.fill('rose');
    await expect(page.getByText('Rose Satin Nightwear', { exact: true }).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expectUnlocked(page);
    await page.mouse.move(800, 500);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1500);
    await input.click();
    await expect(page.getByText('Rose Satin Nightwear', { exact: true }).first()).toBeVisible();
    const currentScroll = await page.evaluate(() => window.scrollY);
    await page.mouse.click(800, 500);
    await expectUnlocked(page, currentScroll);
  }
  expect(state.errors).toEqual([]);
});

test('search navigation clears the scroll lock without restoring the old page position', async ({ page }) => {
  const state = await fixture(page);
  await openScrolledPage(page);
  await searchInput(page).fill('rose');
  await expect(page.getByText('Rose Satin Nightwear', { exact: true }).first()).toBeVisible();
  await searchInput(page).press('Enter');
  await expect(page).toHaveURL(shop + '/products?search=rose');
  await expectUnlocked(page, 0);
  await expect(page.getByText('Recent Searches', { exact: true })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('mobile close, Escape, backdrop and responsive layout changes release the scroll lock', async ({ page }) => {
  const state = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openScrolledPage(page);
  for (const close of ['button', 'escape', 'backdrop', 'resize']) {
    await page.getByRole('button', { name: 'Open search', exact: true }).click();
    await searchInput(page).click();
    await expect(page.getByText('Recent Searches', { exact: true })).toBeVisible();
    const inputBounds = await searchInput(page).boundingBox();
    expect(inputBounds.y).toBeGreaterThanOrEqual(0);
    expect(inputBounds.x + inputBounds.width).toBeLessThanOrEqual(390);
    if (close === 'button') await page.getByRole('button', { name: 'Close search', exact: true }).click();
    if (close === 'escape') await page.keyboard.press('Escape');
    if (close === 'backdrop') await page.mouse.click(100, 500);
    if (close === 'resize') await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('button', { name: 'Close search', exact: true })).toHaveCount(0);
    await expectUnlocked(page);
  }
  await searchInput(page).click();
  await expect(page.getByText('Recent Searches', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('Recent Searches', { exact: true })).toHaveCount(0);
  await expectUnlocked(page);
  expect(state.errors).toEqual([]);
});

test('idle placeholder types suggestions without searching, pauses on focus and respects reduced motion', async ({ page }) => {
  const state = await fixture(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openScrolledPage(page);
  const input = searchInput(page);
  const initial = await input.getAttribute('placeholder');
  await expect.poll(() => input.getAttribute('placeholder')).not.toBe(initial);
  expect(state.searches).toEqual([]);
  await input.click();
  await expect(input).toHaveAttribute('placeholder', 'Search for products, categories...');
  await input.fill('my own query');
  await expect(input).toHaveValue('my own query');
  await expect.poll(() => state.searches.includes('my own query')).toBe(true);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(input).toHaveAttribute('placeholder', 'Search for products, categories...');
  await page.clock.install();
  await page.clock.fastForward(4000);
  await expect(input).toHaveAttribute('placeholder', 'Search for products, categories...');
  expect(state.errors).toEqual([]);
});
