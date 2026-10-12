import { test, expect } from '@playwright/test';

const shop = 'http://127.0.0.1:5177';
const id = '507f1f77bcf86cd799439011';
const product = {
  _id: id, name: 'Satin Lounge Set', category: 'Sleepwear', sizes: ['S'],
  description: 'Local test product', averageRating: 4.8, numOfReviews: 128,
  variations: [
    { color: 'RosyBrown', sku: 'SATIN-ROSE', images: ['/media/tall.svg', '/media/wide.svg'], sizes: [{ size: 'S', price: 1399, mrp: 1999, stock: 10 }] },
    { color: 'Black', sku: 'SATIN-BLACK', images: ['/media/square.svg'], sizes: [{ size: 'S', price: 1799, mrp: 2399, stock: 10 }] },
  ],
};
const second = { ...product, _id: '507f1f77bcf86cd799439012', name: 'Classic Satin Robe', isNewProduct: true, variations: [product.variations[1]] };

async function fixture(page, { signedIn = true, member = false, luxe = false, wishlist = [] } = {}) {
  const products = [{ ...product, isLuxePrive: luxe }, second];
  const state = { errors: [], writes: [], wishlist: structuredClone(wishlist) };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (signedIn) await page.addInitScript(() => localStorage.setItem('token', 'local-card-test'));
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/media/')) {
      const [width, height] = url.pathname.includes('tall') ? [400, 1000] : url.pathname.includes('wide') ? [1200, 300] : [600, 600];
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#e8d4cd"/><rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="#874d51" stroke-width="8"/><text x="50%" y="50%" text-anchor="middle" font-size="28" fill="#542b32">Full image ${width} × ${height}</text></svg>` });
    }
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { success: true, enabled: true, consentVersion: 'local-card-test' } });
      if (url.pathname === '/api/user/profile') return route.fulfill({ json: { success: true, user: { _id: 'local-user', name: 'Local shopper', email: 'shopper@example.test', addresses: [], isLuxeMember: member } } });
      if (url.pathname === '/api/product/list') return route.fulfill({ json: { success: true, products } });
      if (url.pathname === '/api/product/single') return route.fulfill({ json: { success: true, product: products.find(p => p._id === req.postDataJSON().productId) } });
      if (url.pathname === '/api/user/wishlist') return route.fulfill({ json: { success: true, wishlist: state.wishlist } });
      if (url.pathname.startsWith('/api/user/wishlist/')) {
        const body = req.postDataJSON();
        state.writes.push({ path: url.pathname, body, token: req.headers().token });
        if (url.pathname.endsWith('/add')) state.wishlist.push({ ...product, wishlistSku: body.sku });
        else state.wishlist = state.wishlist.filter(item => item.wishlistSku !== body.sku);
        return route.fulfill({ json: { success: true } });
      }
      if (url.pathname === '/api/coupon/active') return route.fulfill({ json: { success: true, coupons: [{ applicableSKUs: ['SATIN-ROSE'], discountType: 'fixed', discountValue: 150 }] } });
      return route.fulfill({ json: { success: true, content: null, products: [], wishlist: [], reviews: [], coupons: [], messages: [], cartItems: [], giftWraps: [] } });
    }
    return url.origin === shop ? route.continue() : route.abort();
  });
  return state;
}

const card = page => page.getByRole('article', { name: product.name, exact: true });
const photo = page => card(page).getByRole('img', { name: product.name, exact: true });

async function expectCompleteImage(page, source) {
  await expect(photo(page)).toHaveAttribute('src', source);
  await expect.poll(() => photo(page).evaluate(el => el.naturalWidth > 0)).toBe(true);
  await expect(photo(page)).toHaveCSS('object-fit', 'contain');
  await expect(photo(page)).toHaveCSS('transform', 'none');
  const image = await photo(page).boundingBox();
  const frame = await photo(page).locator('..').boundingBox();
  expect(Math.abs(image.width - frame.width)).toBeLessThan(1);
  expect(Math.abs(image.height - frame.height)).toBeLessThan(1);
  expect(Math.abs(image.x - frame.x)).toBeLessThan(1);
  expect(Math.abs(image.y - frame.y)).toBeLessThan(1);
}

test('whole portrait, landscape and square images fit the desktop and two-column mobile cards', async ({ page }, testInfo) => {
  const state = await fixture(page);
  await page.goto(shop + '/products');
  await card(page).scrollIntoViewIfNeeded();
  await expectCompleteImage(page, '/media/tall.svg');
  await expect(card(page).getByText('Save ₹150 with coupon')).toBeVisible();
  await expect(card(page).getByRole('button', { name: 'Add to wishlist' })).toBeVisible();
  await photo(page).hover();
  await expectCompleteImage(page, '/media/wide.svg');
  await page.mouse.move(0, 0);
  await expectCompleteImage(page, '/media/tall.svg');
  await card(page).screenshot({ path: testInfo.outputPath('desktop-card.png'), style: '.cookie-consent-bar { visibility: hidden; }' });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expectCompleteImage(page, '/media/tall.svg');
    const firstBounds = await card(page).boundingBox();
    const secondBounds = await page.getByRole('article', { name: second.name, exact: true }).boundingBox();
    expect(Math.abs(firstBounds.y - secondBounds.y)).toBeLessThan(1);
    expect(firstBounds.x + firstBounds.width).toBeLessThan(secondBounds.x);
    expect(secondBounds.x + secondBounds.width).toBeLessThanOrEqual(width);
    expect(await card(page).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(card(page).getByRole('button', { name: 'Add to wishlist' })).toBeVisible();
    await expect(card(page).getByRole('link', { name: 'View product', exact: true })).toBeVisible();
  }
  await card(page).screenshot({ path: testInfo.outputPath('mobile-card.png'), style: '.cookie-consent-bar { visibility: hidden; }' });
  const swatch = card(page).getByRole('button', { name: 'Select Black' });
  await swatch.focus();
  await page.keyboard.press('Enter');
  await expect(swatch).toHaveAttribute('aria-pressed', 'true');
  await expectCompleteImage(page, '/media/square.svg');
  await expect(card(page).getByText('₹1,799', { exact: true })).toBeVisible();
  await expect(card(page).getByText(/with coupon/)).toHaveCount(0);
  await card(page).getByRole('link', { name: 'View product', exact: true }).click();
  await expect(page).toHaveURL(shop + '/product/' + id + '?color=Black');
  expect(state.errors).toEqual([]);
});

test('mobile wishlist button saves the selected SKU and wishlist cards keep their saved variation', async ({ page }) => {
  const state = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(shop + '/products');
  await card(page).getByRole('button', { name: 'Select Black' }).click();
  await card(page).getByRole('button', { name: 'Add to wishlist' }).click();
  await expect(card(page).getByRole('button', { name: 'Remove from wishlist' })).toHaveAttribute('aria-pressed', 'true');
  expect(state.writes[0]).toEqual({ path: '/api/user/wishlist/add', body: { productId: id, sku: 'SATIN-BLACK' }, token: 'local-card-test' });
  await page.goto(shop + '/wishlist');
  await expect(card(page).getByRole('button', { name: 'Select Black' })).toHaveAttribute('aria-pressed', 'true');
  await expectCompleteImage(page, '/media/square.svg');
  await card(page).getByRole('button', { name: 'Remove from wishlist' }).click();
  await expect(page.getByRole('heading', { name: 'Your wishlist is empty' })).toBeVisible();
  expect(state.writes[1].body).toEqual({ productId: id, sku: 'SATIN-BLACK' });
  expect(state.errors).toEqual([]);
});

test('guest wishlist sign-in and Luxe access still work through the new controls', async ({ page }) => {
  const state = await fixture(page, { signedIn: false, luxe: true });
  await page.goto(shop + '/products');
  await card(page).getByRole('button', { name: 'Add to wishlist' }).click();
  await expect(page).toHaveURL(shop + '/auth');
  expect(await page.evaluate(() => history.state.usr.from)).toBe('/products');
  expect(state.writes).toHaveLength(0);
  await page.goto(shop + '/products');
  await expect(card(page).getByRole('img', { name: 'Luxe Privé' })).toBeVisible();
  await card(page).getByRole('link', { name: 'View product', exact: true }).click();
  await expect(page).toHaveURL(shop + '/luxe');
  expect(state.errors).toEqual([]);
});

test('Luxe members can use the product button to open the selected colour', async ({ page }) => {
  const state = await fixture(page, { member: true, luxe: true });
  await page.goto(shop + '/products');
  await expect(card(page).getByRole('link', { name: 'View product', exact: true })).toHaveAttribute('href', '/product/' + id + '?color=RosyBrown');
  await card(page).getByRole('link', { name: 'View product', exact: true }).click();
  await expect(page).toHaveURL(shop + '/product/' + id + '?color=RosyBrown');
  expect(state.errors).toEqual([]);
});
