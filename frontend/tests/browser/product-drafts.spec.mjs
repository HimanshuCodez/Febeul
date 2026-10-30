import { test, expect } from '@playwright/test';

const admin = 'http://127.0.0.1:5179';
const backend = 'http://127.0.0.1:4198';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
const upload = name => ({ name, mimeType: 'image/png', buffer: png });
const product = id => ({
  _id: id, name: `Published ${id}`, description: '<p>Published description</p>', category: 'BABYDOLL',
  variations: [{ color: 'Rose', sku: `SKU-${id}`, images: ['https://res.cloudinary.com/local/cover.png'], sizes: [{ size: 'M', price: 399, mrp: 499, stock: 10 }] }]
});

async function fixture(context) {
  const state = { writes: [], reads: [], errors: [], failure: 0, unavailable: false };
  await context.addInitScript(() => {
    if (location.origin !== 'http://127.0.0.1:5179' || localStorage.getItem('draft-test-initialized')) return;
    localStorage.setItem('draft-test-initialized', 'yes');
    localStorage.setItem('token', 'draft-test-token');
    localStorage.setItem('role', 'admin');
    localStorage.setItem('userEmail', 'alice@example.test');
    localStorage.setItem('permissions', '[]');
  });
  context.on('page', page => page.on('pageerror', error => state.errors.push(error.message)));
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === admin) return route.continue();
    if (url.origin === 'https://res.cloudinary.com') return route.fulfill({ contentType: 'image/png', body: png });
    if (url.origin !== backend) return route.abort();
    if (url.pathname === '/api/user/admin') {
      return route.fulfill({ json: { success: true, token: `renewed-${request.postDataJSON().email}`, email: request.postDataJSON().email, role: 'admin', permissions: [] } });
    }
    if (['/api/product/add', '/api/product/update'].includes(url.pathname)) {
      const data = await new Response(request.postDataBuffer(), { headers: { 'content-type': request.headers()['content-type'] } }).formData();
      state.writes.push({ path: url.pathname, name: data.get('name'), variations: JSON.parse(data.get('variations')), uploads: [...data.values()].filter(value => typeof value !== 'string').map(file => ({ name: file.name, size: file.size, type: file.type })) });
      return route.fulfill({ status: state.failure || 200, json: { success: !state.failure, message: state.failure ? 'Save failed' : 'Product saved' } });
    }
    if (url.pathname === '/api/product/single') {
      state.reads.push(request.postDataJSON().productId);
      if (state.unavailable) return route.abort();
      return route.fulfill({ json: { success: true, product: product(request.postDataJSON().productId) } });
    }
    if (url.pathname === '/api/product/list') return route.fulfill({ json: { success: true, products: [] } });
    return route.fulfill({ json: { success: true, data: {}, content: null } });
  });
  return state;
}

const draftPanel = page => page.getByRole('region', { name: 'Product draft' });
const draftKeys = page => page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('febeul:product-draft:')));
async function open(page, path = '/add') {
  await page.goto(admin + path);
  await expect(page.getByLabel('Product name', { exact: true })).toBeEnabled();
}
async function saved(page) {
  await expect(draftPanel(page).getByRole('status')).toContainText(/Draft (saved|restored)/);
}
async function login(page, email) {
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.locator('input[type="password"]').fill('password');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByLabel('Product name', { exact: true })).toBeEnabled();
}
async function completeNewProduct(page) {
  await page.getByLabel('Product name', { exact: true }).fill('Draft product');
  await page.locator('.ql-editor').fill('Draft description');
  const variation = page.getByRole('group', { name: 'Variation 1', exact: true });
  await variation.getByLabel('Color', { exact: true }).fill('Blue');
  await variation.locator('input[name="sku"]').fill('DRAFT-SKU');
  await variation.getByRole('button', { name: '+ M', exact: true }).click();
  await variation.getByLabel('Price', { exact: true }).fill('399');
  await variation.getByLabel('MRP', { exact: true }).fill('499');
  await variation.getByLabel('Stock', { exact: true }).fill('12');
  await page.getByLabel('Upload images for variation 1').setInputFiles(upload('draft.png'));
  await saved(page);
}

test('Add blocks price above MRP, keeps invalid drafts, and allows an equal price after correction', async ({ context }) => {
  const state = await fixture(context);
  const page = await context.newPage();
  await open(page);
  await completeNewProduct(page);
  const price = page.getByLabel('Price', { exact: true });
  const mrp = page.getByLabel('MRP', { exact: true });
  const submit = page.getByRole('button', { name: /^Add Product$/i });
  await price.fill('500');
  await expect(price).toHaveAttribute('aria-invalid', 'true');
  await expect(price).toHaveAccessibleDescription('Price cannot be greater than MRP.');
  await submit.click();
  expect(state.writes).toHaveLength(0);
  await draftPanel(page).getByRole('button', { name: 'Save as draft' }).click();
  await saved(page);
  await page.reload();
  await expect(price).toHaveValue('500');
  await expect(price).toHaveAttribute('aria-invalid', 'true');
  await price.fill('399');
  await expect(price).toHaveAttribute('aria-invalid', 'false');
  await mrp.fill('398');
  await expect(price).toHaveAttribute('aria-invalid', 'true');
  await submit.click();
  expect(state.writes).toHaveLength(0);
  // The submit handler must also protect restored values if native validation is bypassed.
  await page.locator('form').evaluate(form => form.noValidate = true);
  await submit.click();
  await expect(page.getByRole('alert')).toContainText("Price cannot be greater than MRP for size 'M'");
  expect(state.writes).toHaveLength(0);
  await mrp.fill('399');
  await expect(price).toHaveAttribute('aria-invalid', 'false');
  await page.locator('form').evaluate(form => form.noValidate = false);
  await submit.click();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('');
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].variations[0].sizes[0]).toMatchObject({ price: '399', mrp: '399' });
  expect(state.errors).toEqual([]);
});

test('Add checks pricing on later variations and sizes and allows prices below MRP', async ({ context }) => {
  const state = await fixture(context);
  const page = await context.newPage();
  await open(page);
  await completeNewProduct(page);
  await page.getByRole('button', { name: '+ Add Variation', exact: true }).click();
  const variation = page.getByRole('group', { name: 'Variation 2', exact: true });
  await variation.getByLabel('Color', { exact: true }).fill('Red');
  for (const size of ['M', 'L']) await variation.getByRole('button', { name: `+ ${size}`, exact: true }).click();
  for (let index = 0; index < 2; index++) {
    await variation.getByLabel('MRP', { exact: true }).nth(index).fill('499');
    await variation.getByLabel('Price', { exact: true }).nth(index).fill(index ? '500' : '399');
    await variation.getByLabel('Stock', { exact: true }).nth(index).fill('10');
  }
  const submit = page.getByRole('button', { name: /^Add Product$/i });
  await submit.click();
  await expect(variation.getByLabel('Price', { exact: true }).nth(1)).toHaveAttribute('aria-invalid', 'true');
  expect(state.writes).toHaveLength(0);
  await variation.getByLabel('Price', { exact: true }).nth(1).fill('398');
  await submit.click();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('');
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].variations[1].sizes[1]).toMatchObject({ price: '398', mrp: '499' });
  expect(state.errors).toEqual([]);
});

test('incomplete drafts save offline and restore every field, variations and image order after closing the tab', async ({ context }) => {
  const state = await fixture(context);
  let page = await context.newPage();
  await open(page);
  await page.getByLabel('Product name', { exact: true }).fill('Unfinished listing');
  await page.locator('.ql-editor').fill('Keep this description');
  const detailIds = ['keywords', 'pattern', 'sleeve-style', 'sleeve-length', 'neck', 'material-composition', 'closure-type', 'material-type', 'care-instructions', 'generic-name', 'country-of-origin', 'manufacturer', 'packer', 'included-components', 'hsn', 'item-weight', 'item-dimensions-lxwxh', 'net-quantity'];
  for (const id of detailIds) await page.locator(`#product-${id}`).fill(`Draft ${id}`);
  await page.getByLabel('Visible on Website').uncheck();
  await page.getByLabel('Add to Bestseller').check();
  await page.getByLabel('Add to Luxe Prive Sale').check();
  await page.getByLabel('Upload images for variation 1').setInputFiles([upload('first.png'), upload('second.png')]);
  await page.getByRole('button', { name: 'Move image 2 earlier in variation 1', exact: true }).click();
  await page.getByRole('button', { name: '+ Add Variation', exact: true }).click();
  const second = page.getByRole('group', { name: 'Variation 2', exact: true });
  await second.getByLabel('Color', { exact: true }).fill('Red');
  await second.getByRole('button', { name: '+ M', exact: true }).click();
  await second.getByLabel('Stock', { exact: true }).fill('9');
  await context.setOffline(true);
  await page.getByLabel('Product name', { exact: true }).fill('Offline unfinished listing');
  await draftPanel(page).getByRole('button', { name: 'Save as draft' }).click();
  await expect(draftPanel(page)).toContainText('You are offline');
  await saved(page);
  expect(state.writes).toHaveLength(0);
  await context.setOffline(false);
  await page.close();
  page = await context.newPage();
  await open(page);
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Offline unfinished listing');
  await expect(page.locator('.ql-editor')).toHaveText('Keep this description');
  for (const id of detailIds) await expect(page.locator(`#product-${id}`)).toHaveValue(`Draft ${id}`);
  await expect(page.getByLabel('Visible on Website')).not.toBeChecked();
  await expect(page.getByLabel('Add to Bestseller')).toBeChecked();
  await expect(page.getByLabel('Add to Luxe Prive Sale')).toBeChecked();
  await expect(page.getByRole('group', { name: 'Variation 2', exact: true }).getByLabel('Stock', { exact: true })).toHaveValue('9');
  const gallery = page.getByRole('list', { name: 'Images for variation 1' });
  await expect(gallery.getByRole('img')).toHaveCount(2);
  await expect.poll(() => gallery.getByRole('img').evaluateAll(images => images.every(image => image.naturalWidth > 0))).toBe(true);
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith('febeul:product-draft:')))));
  expect(record.values.variations[0].images.map(image => image.name)).toEqual(['second.png', 'first.png']);
  // No debounce window: the final keystroke is durable even on immediate navigation.
  await page.getByLabel('Product name', { exact: true }).fill('Last edit before refresh');
  await page.reload();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Last edit before refresh');
  expect(state.errors).toEqual([]);
});

test('logout preserves drafts and another account cannot restore or overwrite them', async ({ context }) => {
  const state = await fixture(context);
  const page = await context.newPage();
  await open(page);
  await page.getByLabel('Product name', { exact: true }).fill('Alice draft');
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await login(page, 'bob@example.test');
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('');
  await page.getByLabel('Product name', { exact: true }).fill('Bob draft');
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await login(page, 'alice@example.test');
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Alice draft');
  expect(await draftKeys(page)).toHaveLength(2);
  expect(state.writes).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test('editing drafts recover with the server unavailable, preserve mixed images and remain separate for each product', async ({ context }) => {
  const state = await fixture(context);
  const page = await context.newPage();
  await open(page, '/update/one');
  await page.getByLabel('Product name', { exact: true }).fill('Edited one');
  await page.getByLabel('Upload images for variation 1').setInputFiles(upload('new-cover.png'));
  await page.getByRole('button', { name: 'Move image 2 earlier in variation 1', exact: true }).click();
  await saved(page);
  await open(page, '/update/two');
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Published two');
  await page.getByLabel('Product name', { exact: true }).fill('Edited two');
  state.unavailable = true;
  await open(page, '/update/one');
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Edited one');
  expect(state.reads).toEqual(['one', 'two']);
  const gallery = page.getByRole('list', { name: 'Images for variation 1' });
  await expect(gallery.getByRole('img').first()).toHaveAttribute('src', /^blob:/);
  await expect(gallery.getByRole('img').nth(1)).toHaveAttribute('src', product('one').variations[0].images[0]);
  state.failure = 503;
  await page.getByRole('button', { name: /^Update Product$/i }).click();
  await expect(page.getByText('Save failed', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Edited one');
  state.failure = 0;
  await page.getByRole('button', { name: /^Update Product$/i }).click();
  await expect(page).toHaveURL(`${admin}/list`);
  expect(state.writes[1].uploads).toEqual([{ name: 'new-cover.png', size: png.length, type: 'image/png' }]);
  expect(state.writes[1].variations[0].imageOrder).toEqual([1, 0]);
  expect(await draftKeys(page)).toHaveLength(1);
  await open(page, '/update/two');
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Edited two');
  expect(state.errors).toEqual([]);
});

test('expired authentication keeps all work and successful publishing clears the draft', async ({ context }) => {
  const state = await fixture(context);
  const page = await context.newPage();
  await open(page);
  await completeNewProduct(page);
  state.failure = 401;
  await page.getByRole('button', { name: /^Add Product$/i }).click();
  await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  await login(page, 'alice@example.test');
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Draft product');
  await expect(page.getByRole('list', { name: 'Images for variation 1' }).getByRole('img')).toHaveCount(1);
  state.failure = 0;
  await page.getByRole('button', { name: /^Add Product$/i }).click();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('');
  expect(state.writes[1].uploads).toEqual([{ name: 'draft.png', size: png.length, type: 'image/png' }]);
  expect(await draftKeys(page)).toEqual([]);
  await page.reload();
  await expect(page.getByLabel('Product name', { exact: true })).toBeEnabled();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('');
  expect(await draftKeys(page)).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('discard resets changes and images without recreating the draft or publishing', async ({ context }) => {
  const state = await fixture(context);
  const page = await context.newPage();
  await open(page, '/update/one');
  await page.getByLabel('Product name', { exact: true }).fill('Discard me');
  await page.getByLabel('Stock', { exact: true }).fill('42');
  await page.getByLabel('Upload images for variation 1').setInputFiles(upload('discard.png'));
  await saved(page);
  page.once('dialog', dialog => dialog.accept());
  await draftPanel(page).getByRole('button', { name: 'Discard draft' }).click();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Published one');
  await expect(page.getByLabel('Stock', { exact: true })).toHaveValue('10');
  await expect(page.getByRole('list', { name: 'Images for variation 1' }).getByRole('img')).toHaveCount(1);
  expect(await draftKeys(page)).toEqual([]);
  await open(page);
  await page.getByLabel('Product name', { exact: true }).fill('Discard new listing');
  page.once('dialog', dialog => dialog.accept());
  await draftPanel(page).getByRole('button', { name: 'Discard draft' }).click();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('');
  await page.reload();
  await expect(page.getByLabel('Product name', { exact: true })).toBeEnabled();
  expect(await draftKeys(page)).toEqual([]);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('storage failures are visible, keep entered work and allow retry', async ({ context }) => {
  const state = await fixture(context);
  const page = await context.newPage();
  await open(page);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    window.failDraftWrites = true;
    Storage.prototype.setItem = function (key, value) {
      if (window.failDraftWrites && key.startsWith('febeul:product-draft:')) throw new DOMException('Storage full', 'QuotaExceededError');
      return write.call(this, key, value);
    };
  });
  await page.getByLabel('Product name', { exact: true }).fill('Still in the form');
  await expect(draftPanel(page).getByRole('alert')).toContainText('could not be fully saved');
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Still in the form');
  await page.evaluate(() => { window.failDraftWrites = false; });
  await draftPanel(page).getByRole('button', { name: 'Save as draft' }).click();
  await saved(page);
  await page.reload();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Still in the form');
  expect(state.errors).toEqual([]);
});

test('failed image persistence does not report success and recovery explains which image is missing', async ({ context }) => {
  const state = await fixture(context);
  const page = await context.newPage();
  await open(page);
  await page.getByLabel('Product name', { exact: true }).fill('Keep text despite image failure');
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () { throw new DOMException('Storage full', 'QuotaExceededError'); };
  });
  await page.getByLabel('Upload images for variation 1').setInputFiles(upload('missing.png'));
  await expect(draftPanel(page).getByRole('status')).toHaveText('Draft needs attention');
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Keep text despite image failure');
  await expect(draftPanel(page).getByRole('alert')).toContainText('Please re-upload these draft images: missing.png');
  expect(state.errors).toEqual([]);
});

test('a failed initial product fetch keeps the editor disabled until retry succeeds', async ({ context }) => {
  const state = await fixture(context);
  state.unavailable = true;
  const page = await context.newPage();
  await page.goto(`${admin}/update/one`);
  await expect(draftPanel(page)).toContainText('Product could not be loaded');
  await expect(page.getByLabel('Product name', { exact: true })).toBeDisabled();
  expect(await draftKeys(page)).toEqual([]);
  state.unavailable = false;
  await draftPanel(page).getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Published one');
  await expect(page.getByLabel('Product name', { exact: true })).toBeEnabled();
  expect(state.errors).toEqual([]);
});
