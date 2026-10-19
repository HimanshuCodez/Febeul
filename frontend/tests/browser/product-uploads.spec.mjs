import { test, expect } from '@playwright/test';

const admin = 'http://127.0.0.1:5179';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
const files = (count, prefix = 'image') => Array.from({ length: count }, (_, index) => ({ name: `${prefix}-${index}.png`, mimeType: 'image/png', buffer: png }));
const product = {
  _id: '650000000000000000000001', name: 'Multi-color babydoll', description: '<p>Product description</p>', category: 'BABYDOLL', date: Date.now(),
  variations: Array.from({ length: 5 }, (_, i) => ({ color: `Color ${i}`, sku: `SKU-${i}`, images: [`https://res.cloudinary.com/local/existing-${i}.png`], sizes: [{ size: 'M', price: 399, mrp: 499, stock: 10 }] })),
};

async function fixture(page, path = '/add', initialProduct = product) {
  const state = { errors: [], saved: [], reject: false };
  await page.addInitScript(() => {
    if (location.origin !== 'http://127.0.0.1:5179') return;
    localStorage.setItem('token', 'local-upload-test'); localStorage.setItem('role', 'admin'); localStorage.setItem('permissions', '[]');
  });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === admin) return route.continue();
    if (url.origin === 'https://res.cloudinary.com') return route.fulfill({ contentType: 'image/png', body: png });
    if (url.origin !== 'http://127.0.0.1:4198') return route.abort();
    if (['/api/product/add', '/api/product/update'].includes(url.pathname)) {
      const data = await new Response(request.postDataBuffer(), { headers: { 'content-type': request.headers()['content-type'] } }).formData();
      state.saved.push({ path: url.pathname, variations: JSON.parse(data.get('variations')), uploads: [...data.entries()].filter(([, value]) => typeof value !== 'string').map(([field, file]) => ({ field, name: file.name, size: file.size })) });
      return state.reject
        ? route.fulfill({ status: 413, json: { success: false, message: 'Each product image must be 5 MB or smaller.' } })
        : route.fulfill({ json: { success: true, message: url.pathname.endsWith('/add') ? 'Product Added' : 'Product Updated' } });
    }
    if (url.pathname === '/api/product/single') return route.fulfill({ json: { success: true, product: initialProduct } });
    if (url.pathname === '/api/product/list') return route.fulfill({ json: { success: true, products: path.startsWith('/update') ? [initialProduct] : [] } });
    return route.fulfill({ json: { success: true, data: {}, content: null } });
  });
  await page.goto(admin + path); await expect(page.getByLabel('Product name')).toBeVisible();
  return state;
}

test('Add lets images be dragged in both directions and submits the displayed order', async ({ page }) => {
  const state = await fixture(page);
  await page.getByLabel('Product name').fill('Reordered product');
  await page.locator('.ql-editor').fill('Product description');
  const variation = page.getByRole('group', { name: 'Variation 1', exact: true });
  await variation.getByLabel('Color', { exact: true }).fill('Rose');
  await variation.locator('input[name="sku"]').fill('ROSE-ORDER');
  await variation.getByRole('button', { name: '+ M', exact: true }).click();
  await variation.getByLabel('MRP', { exact: true }).fill('499');
  await variation.getByLabel('Price', { exact: true }).fill('399');
  await variation.getByLabel('Stock', { exact: true }).fill('10');
  await variation.getByLabel('Upload images for variation 1').setInputFiles(files(4));
  const gallery = variation.getByRole('list', { name: 'Images for variation 1' });
  const reorder = number => gallery.getByRole('button', { name: `Reorder image ${number} in variation 1`, exact: true });
  await expect(gallery.getByRole('img').nth(3)).toHaveAttribute('src', /^blob:/);
  const original = await gallery.getByRole('img').evaluateAll(images => images.map(image => image.src));
  await reorder(3).dragTo(reorder(1));
  await expect(gallery.getByRole('img').nth(0)).toHaveAttribute('src', original[2]);
  await expect(gallery.getByRole('listitem').first()).toContainText('Cover');
  await reorder(1).dragTo(reorder(4));
  await expect(gallery.getByRole('img').nth(3)).toHaveAttribute('src', original[2]);
  expect(await gallery.getByRole('img').evaluateAll(images => images.map(image => image.src))).toEqual([original[0], original[1], original[3], original[2]]);
  await page.getByRole('button', { name: /^Add Product$/i }).click();
  await expect(page.getByText('Product Added', { exact: true })).toBeVisible();
  expect(state.saved[0].uploads.map(file => file.name)).toEqual(['image-0.png', 'image-1.png', 'image-3.png', 'image-2.png']);
  expect(state.errors).toEqual([]);
});

test('Update reorders existing and new images together without affecting another variation', async ({ page }, testInfo) => {
  const existing = structuredClone(product);
  existing.variations[0].images = [1, 2, 3, 4].map(index => `https://res.cloudinary.com/local/existing-image-${index}.png`);
  const state = await fixture(page, `/update/${product._id}`, existing);
  const gallery = page.getByRole('list', { name: 'Images for variation 1' });
  const reorder = number => gallery.getByRole('button', { name: `Reorder image ${number} in variation 1`, exact: true });
  await page.getByLabel('Upload images for variation 1').setInputFiles(files(2, 'new'));
  await expect(gallery.getByRole('img').nth(5)).toHaveAttribute('src', /^blob:/);
  const original = await gallery.getByRole('img').evaluateAll(images => images.map(image => image.src));
  await reorder(3).dragTo(reorder(1));
  await expect(gallery.getByRole('img').first()).toHaveAttribute('src', original[2]);
  await reorder(6).dragTo(reorder(1));
  await expect(gallery.getByRole('img').first()).toHaveAttribute('src', original[5]);
  await page.getByRole('button', { name: 'Remove image 4 from variation 1', exact: true }).click();
  expect(await gallery.getByRole('img').evaluateAll(images => images.map(image => image.src))).toEqual([original[5], original[2], original[0], original[3], original[4]]);
  await expect(page.getByRole('list', { name: 'Images for variation 2' }).getByRole('img')).toHaveAttribute('src', product.variations[1].images[0]);
  await gallery.screenshot({ path: testInfo.outputPath('reordered-gallery.png') });
  await page.getByRole('button', { name: /^Update Product$/i }).click();
  await expect(page).toHaveURL(`${admin}/list`);
  expect(state.saved[0].variations[0].images).toEqual([original[2], original[0], original[3]]);
  expect(state.saved[0].variations[0].imageOrder).toEqual([3, 0, 1, 2, 4]);
  expect(state.saved[0].uploads.map(file => file.name)).toEqual(['new-1.png', 'new-0.png']);
  expect(state.saved[0].variations[1].images).toEqual(product.variations[1].images);
  expect(state.errors).toEqual([]);
});

test('image arrows and keyboard controls reorder on narrow screens', async ({ page }) => {
  const state = await fixture(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByLabel('Upload images for variation 1').setInputFiles(files(4));
  const gallery = page.getByRole('list', { name: 'Images for variation 1' });
  await expect(gallery.getByRole('img').nth(3)).toHaveAttribute('src', /^blob:/);
  const original = await gallery.getByRole('img').evaluateAll(images => images.map(image => image.src));
  await gallery.getByRole('button', { name: 'Move image 3 earlier in variation 1', exact: true }).click();
  await gallery.getByRole('button', { name: 'Move image 2 earlier in variation 1', exact: true }).click();
  await expect(gallery.getByRole('img').first()).toHaveAttribute('src', original[2]);
  await gallery.getByRole('button', { name: 'Reorder image 1 in variation 1', exact: true }).press('End');
  await expect(gallery.getByRole('img').nth(3)).toHaveAttribute('src', original[2]);
  await gallery.getByRole('button', { name: 'Reorder image 4 in variation 1', exact: true }).press('Home');
  await expect(gallery.getByRole('img').first()).toHaveAttribute('src', original[2]);
  expect(await gallery.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(state.saved).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test('five variations submit all 26 images and preserve entered details after a server error', async ({ page }) => {
  const state = await fixture(page); state.reject = true;
  await page.getByLabel('Product name').fill('Multi-color babydoll');
  await page.locator('.ql-editor').fill('Product description');
  const counts = [6, 5, 5, 5, 5];
  for (let i = 0; i < 5; i++) {
    if (i > 0) await page.getByRole('button', { name: '+ Add Variation', exact: true }).click();
    const variation = page.getByRole('group', { name: `Variation ${i + 1}`, exact: true });
    await variation.getByLabel('Color', { exact: true }).fill(`Color ${i}`);
    await variation.locator('input[name="sku"]').fill(`SKU-${i}`);
    await variation.getByRole('button', { name: '+ M', exact: true }).click();
    await variation.getByLabel('MRP', { exact: true }).fill('499');
    await variation.getByLabel('Price', { exact: true }).fill('399');
    await variation.getByLabel('Stock', { exact: true }).fill('10');
    await variation.getByLabel(`Upload images for variation ${i + 1}`).setInputFiles(files(counts[i], `color-${i}`));
    await expect(variation.getByRole('img')).toHaveCount(counts[i]);
  }
  await page.getByRole('button', { name: /^Add Product$/i }).click();
  await expect(page.getByRole('alert')).toContainText('Each product image must be 5 MB or smaller.');
  await expect(page.getByLabel('Product name')).toHaveValue('Multi-color babydoll');
  await expect(page.getByRole('group', { name: /^Variation [1-5]$/ }).getByRole('img')).toHaveCount(26);
  expect(state.saved).toHaveLength(1); expect(state.saved[0].variations).toHaveLength(5);
  counts.forEach((count, i) => expect(state.saved[0].uploads.filter(file => file.field === `variations[${i}][images]`)).toHaveLength(count));
  state.reject = false;
  await page.getByRole('button', { name: /^Add Product$/i }).click();
  await expect(page.getByText('Product Added', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Product name')).toHaveValue('');
  expect(state.saved).toHaveLength(2); expect(state.saved[1].uploads).toHaveLength(26); expect(state.errors).toEqual([]);
});

test('file type, size and combined image count are checked before submission', async ({ page }) => {
  const state = await fixture(page);
  const input = page.getByLabel('Upload images for variation 1');
  await expect(input).toHaveAttribute('accept', /image\/png/);
  await input.setInputFiles(files(1));
  await input.setInputFiles([{ name: 'too-big.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }]);
  await expect(page.getByText('Image "too-big.png" is too large. Each image must be 5 MB or smaller.', { exact: true })).toBeVisible();
  await input.setInputFiles([{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') }]);
  await expect(page.getByText('Use JPG, PNG, WebP or GIF images.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '+ Add Variation', exact: true }).click();
  await page.getByLabel('Upload images for variation 2').setInputFiles(files(60));
  await expect(page.getByText('Upload up to 60 new images across all variations at a time.', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Variation 1', exact: true }).getByRole('img')).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Variation 2', exact: true }).getByRole('img')).toHaveCount(0);
  expect(state.saved).toHaveLength(0); expect(state.errors).toEqual([]);
});

test('editing uploads 26 new images and retains existing URLs separately', async ({ page }) => {
  const state = await fixture(page, `/update/${product._id}`);
  const counts = [6, 5, 5, 5, 5];
  for (let i = 0; i < counts.length; i++) await page.getByLabel(`Upload images for variation ${i + 1}`).setInputFiles(files(counts[i], `new-${i}`));
  await page.getByRole('button', { name: /^Update Product$/i }).click();
  await expect(page).toHaveURL(`${admin}/list`);
  expect(state.saved).toHaveLength(1); expect(state.saved[0].uploads).toHaveLength(26);
  state.saved[0].variations.forEach((variation, i) => expect(variation.images).toEqual(product.variations[i].images));
  expect(state.errors).toEqual([]);
});
