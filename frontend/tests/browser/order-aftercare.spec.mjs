import { test, expect } from '@playwright/test';
import { buildCustomerReturnStatus } from '../../../backend/utils/returnStatus.js';
import { sanitizeExchangeForCustomer } from '../../../backend/utils/exchangeStatus.js';

const shop = 'http://127.0.0.1:5177';
const buyer = { _id: '650000000000000000000001', name: 'Test Buyer', email: 'buyer@example.test', addresses: [],
  bankAccount: { accountHolderName: 'Test Buyer', bankName: 'Test Bank', accountNumber: '123456789012', ifsc: 'HDFC0001234' } };
const makeOrder = (extra = {}) => ({
  _id: '650000000000000000000011', orderItemId: 'TEST-1001',
  items: [{ productId: '650000000000000000000099', name: 'Rose Lace Set', image: '/test-product.svg', price: 999, quantity: 1, color: 'Rose', size: 'M', sku: 'TEST-ROSE' }],
  orderTotal: 999, productAmount: 999, date: Date.now() - 5 * 86400000,
  orderStatus: 'Delivered', shiprocketStatus: 'DELIVERED', deliveredAt: new Date(Date.now() - 3600000).toISOString(),
  paymentMethod: 'COD', payment: false, refundDetails: { status: 'none', pickup: { status: 'none' } }, exchanges: [],
  address: { name: buyer.name, address: 'Test street', state: 'Delhi', city: 'Delhi', zip: '110001', country: 'India', phone: '9999999999' }, ...extra,
});
const photos = Array.from({ length: 4 }, (_, index) => ({ name: `photo-${index + 1}.png`, mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gnkAAAAASUVORK5CYII=', 'base64') }));
const multipartField = (body, name) => body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]+)`))?.[1];

async function mockApp(context, order = makeOrder()) {
  const state = { order, calls: [], errors: [], reject: false, delay: 0 };
  context.on('page', page => page.on('pageerror', error => state.errors.push(error.message)));
  await context.addInitScript(() => localStorage.setItem('token', 'local-order-request-test'));
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      let result = { success: true, content: null, data: {}, products: [], wishlist: [], cartItems: [], tickets: [], coupons: [], giftWraps: [], reviews: [], policies: [], messages: [] };
      if (url.pathname === '/api/user/profile') result.user = buyer;
      if (url.pathname === '/api/analytics/config') result.enabled = false;
      if (url.pathname === `/api/order/${order._id}`) result.order = { ...state.order, returnStatus: buildCustomerReturnStatus(state.order) };
      if (url.pathname === '/api/order/userorders') result.orders = (state.orders || [state.order]).map(item => ({ ...item, returnStatus: buildCustomerReturnStatus(item) }));
      if (['/api/refund/request', '/api/exchange/request'].includes(url.pathname)) {
        const body = request.postDataBuffer().toString();
        state.calls.push({ path: url.pathname, body });
        if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
        if (state.reject) return route.fulfill({ status: 409, json: { success: false, message: 'Unable to submit right now. Please try again.' } });
        if (url.pathname === '/api/exchange/request') {
          state.order.exchanges = [sanitizeExchangeForCustomer({ _id: 'test-exchange', ticketId: 'EX-123456', orderItemIndex: Number(multipartField(body, 'orderItemIndex')),
            status: 'REQUESTED', createdAt: new Date(), reason: multipartField(body, 'reason') })];
        } else {
          state.order.orderStatus = 'Refund Initiated';
          state.order.refundDetails = { status: 'pending', requestType: multipartField(body, 'requestType'), requestedAt: new Date().toISOString(), pickup: { status: 'none' } };
        }
      }
      return route.fulfill({ json: result });
    }
    if (url.origin !== shop) return route.abort();
    if (url.pathname === '/test-product.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120"><rect width="100" height="120" fill="#e4b9c4"/><path d="M30 30L20 90H80L70 30L60 40H40Z" fill="#a45b73"/></svg>' });
    return route.continue();
  });
  return state;
}
async function visit(page, order) {
  await page.goto(`${shop}/order-detail/${order._id}`);
  await expect(page.getByRole('heading', { name: 'Need help with your purchase?' })).toBeVisible();
}
const action = (page, type) => page.getByRole('region', { name: 'Need help with your purchase?' }).getByRole('button', { name: new RegExp(`^${type}\\b`) });
async function evidence(modal) {
  await modal.getByRole('textbox', { name: /Reason for your request|Tell us more/ }).fill('The item arrived damaged. Please help resolve this.');
  await modal.locator('input[type=file]').setInputFiles(photos);
}
async function refresh(page, order) {
  const response = page.waitForResponse(response => response.url().includes(`/api/order/${order._id}?refresh=1`));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await response;
}

test('COD return requires four photos, sends saved payout and continues below Delivered through courier stages', async ({ context, page }) => {
  const order = makeOrder(), state = await mockApp(context, order);
  await visit(page, order);
  await action(page, 'Return').click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('radio', { name: /^Return/ })).toBeChecked();
  await expect(modal.getByRole('radio', { name: /^Exchange/ })).toBeEnabled();
  await expect(modal.getByText('Upload 4 Images', { exact: false })).toBeVisible();
  await expect(modal.locator('#request-photos-label .aftercare-required')).toHaveCSS('color', 'rgb(220, 38, 38)');
  await modal.getByRole('textbox', { name: /Reason for your request/ }).fill('The item is damaged.');
  await modal.locator('input[type=file]').setInputFiles(photos.slice(0, 3));
  await expect(modal.getByRole('button', { name: 'Submit return request' })).toBeDisabled();
  await modal.locator('input[type=file]').setInputFiles(photos.slice(3));
  await expect(modal.getByText('4/4 added')).toBeVisible();
  await modal.getByRole('button', { name: 'Remove photo 3' }).click();
  await expect(modal.getByRole('button', { name: 'Submit return request' })).toBeDisabled();
  await modal.locator('input[type=file]').setInputFiles(photos.slice(2, 3));
  await expect(modal.getByText('Test Bank · Ending in 9012')).toBeVisible();
  state.delay = 500;
  await modal.getByRole('button', { name: 'Submit return request' }).dblclick();
  await expect(modal).not.toBeVisible();
  expect(state.calls).toHaveLength(1);
  const body = state.calls[0].body;
  expect(multipartField(body, 'requestType')).toBe('return');
  expect(JSON.parse(multipartField(body, 'payoutDetails'))).toMatchObject({ type: 'bank', bankAccount: buyer.bankAccount.accountNumber });
  expect(body.match(/name="images"/g)).toHaveLength(4);
  const journey = page.getByRole('region', { name: 'Return tracking' });
  await expect(journey.locator('[aria-current=step]')).toContainText('Return initiated');
  await expect(journey.getByRole('heading', { name: 'Picked Up', exact: true }).locator('..').locator('..')).toContainText('Awaiting update');
  await page.locator('#aftercare-timeline').screenshot({ path: 'test-results/order-aftercare/return-timeline.png' });
  const delivery = page.getByText('Delivered', { exact: true }).first();
  expect(await delivery.evaluate((node) => Boolean(node.compareDocumentPosition(document.getElementById('aftercare-timeline')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  order.refundDetails.pickup = { status: 'scheduled', awb: 'RETURN-123', courier: 'Test Courier', scheduledDate: new Date().toISOString() };
  await refresh(page, order);
  await expect(journey.locator('[aria-current=step]')).toContainText('Pickup Scheduled');
  order.refundDetails.pickup.status = 'picked_up';
  order.refundDetails.returnTracking = { pickupDate: new Date(Date.now() - 1000).toISOString() };
  await refresh(page, order);
  await expect(journey.locator('[aria-current=step]')).toContainText('Picked Up');
  await expect(page.getByRole('button', { name: 'Cancel Return/Refund Request' })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('prepaid refund has no payout fields and shows review before payment processing', async ({ context, page }) => {
  const order = makeOrder({ paymentMethod: 'Razorpay', payment: true }), state = await mockApp(context, order);
  await visit(page, order);
  await action(page, 'Refund').click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('region', { name: 'Refund payout method' })).toHaveCount(0);
  await evidence(modal);
  await modal.getByRole('button', { name: 'Submit refund request' }).click();
  const journey = page.getByRole('region', { name: 'Refund tracking' });
  await expect(journey.locator('[aria-current=step]')).toContainText('Refund requested');
  await expect(journey).not.toContainText('Pickup');
  expect(state.calls[0].body).not.toContain('payoutDetails');
  expect(multipartField(state.calls[0].body, 'requestType')).toBe('refund');
  order.refundDetails.status = 'processing';
  await refresh(page, order);
  await expect(journey.locator('[aria-current=step]')).toContainText('Refund initiated');
  order.refundDetails.status = 'completed'; order.refundDetails.processedAt = new Date().toISOString();
  await refresh(page, order);
  await expect(journey.locator('[aria-current=step]')).toContainText('Refund completed');
  expect(state.errors).toEqual([]);
});

test('exchange chooses a line item, uses its own endpoint and follows replacement tracking', async ({ context, page }) => {
  const order = makeOrder(); order.items.push({ ...order.items[0], name: 'Second Item', size: 'L', sku: 'SECOND' });
  const state = await mockApp(context, order);
  await visit(page, order);
  await action(page, 'Exchange').click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Item to exchange').selectOption('1');
  await modal.getByLabel('Reason for exchange').selectOption('damaged');
  await expect(modal.getByRole('region', { name: 'Refund payout method' })).toHaveCount(0);
  await evidence(modal);
  await modal.getByRole('button', { name: 'Submit exchange request' }).click();
  const journey = page.getByRole('region', { name: 'Exchange tracking EX-123456' });
  await expect(journey.locator('[aria-current=step]')).toContainText('Exchange initiated');
  await expect(journey).toContainText('Second Item');
  expect(state.calls).toHaveLength(1);
  expect(state.calls[0].path).toBe('/api/exchange/request');
  expect(multipartField(state.calls[0].body, 'orderItemIndex')).toBe('1');
  expect(multipartField(state.calls[0].body, 'reason')).toBe('damaged');
  expect(state.calls[0].body).not.toContain('payoutDetails');
  await expect(action(page, 'Return')).toBeDisabled();
  order.exchanges = [sanitizeExchangeForCustomer({ _id: 'test-exchange', ticketId: 'EX-123456', orderItemIndex: 1, status: 'NEW_PRODUCT_DISPATCHED', createdAt: new Date(), forwardShipment: { dispatchedDate: new Date() } })];
  await refresh(page, order);
  await expect(journey.locator('[aria-current=step]')).toContainText('New Product Dispatched');
  expect(state.errors).toEqual([]);
});

test('mobile modal supports UPI, preserves evidence on failure, traps focus and restores it on Escape', async ({ context, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const order = makeOrder(), state = await mockApp(context, order);
  await visit(page, order);
  await action(page, 'Return').click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('radio', { name: /^Refund/ }).check();
  await modal.getByRole('radio', { name: 'UPI', exact: true }).check();
  await modal.getByLabel('UPI ID').fill('test@upi');
  await evidence(modal);
  state.reject = true;
  await modal.getByRole('button', { name: 'Submit refund request' }).click();
  await expect(modal.getByRole('alert')).toContainText('Unable to submit');
  await expect(modal.getByText('4/4 added')).toBeVisible();
  expect(JSON.parse(multipartField(state.calls[0].body, 'payoutDetails'))).toEqual({ type: 'upi', upiId: 'test@upi' });
  for (let index = 0; index < 20; index++) {
    await page.keyboard.press('Tab');
    const focus = await modal.evaluate(node => ({ inside: node.contains(document.activeElement), active: document.activeElement?.outerHTML.slice(0, 300) }));
    expect(focus.inside, `Tab ${index}: ${focus.active}`).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(action(page, 'Return')).toBeFocused();
  expect(state.errors).toEqual([]);
});

test('request windows remain separate and expired orders show disabled actions', async ({ context, page }) => {
  const order = makeOrder({ deliveredAt: new Date(Date.now() - 2.5 * 86400000).toISOString() });
  const state = await mockApp(context, order);
  await visit(page, order);
  await expect(action(page, 'Return')).toBeEnabled();
  await expect(action(page, 'Refund')).toBeEnabled();
  await expect(action(page, 'Exchange')).toBeDisabled();
  await action(page, 'Return').click();
  await expect(page.getByRole('dialog').getByRole('radio', { name: /^Exchange/ })).toBeDisabled();
  await page.keyboard.press('Escape');
  order.deliveredAt = new Date(Date.now() - 4 * 86400000).toISOString();
  await refresh(page, order);
  for (const type of ['Return', 'Refund', 'Exchange']) await expect(action(page, type)).toBeDisabled();
  expect(state.calls).toEqual([]);
});

test('request layout fits narrow phones, tablets and desktop with visible footer and scrollable fields', async ({ context, page }) => {
  const order = makeOrder(), state = await mockApp(context, order);
  await visit(page, order);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    await action(page, 'Return').click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Submit return request' })).toBeInViewport();
    expect(await modal.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    // Check the request UI independently of the existing wide desktop navbar.
    expect(await page.locator('.aftercare-dialog, .aftercare-actions').evaluateAll(nodes => nodes.every(node => {
      const box = node.getBoundingClientRect();
      return box.left >= -1 && box.right <= window.innerWidth + 1 && node.scrollWidth <= node.clientWidth + 1;
    }))).toBe(true);
    expect(await modal.locator('.aftercare-scroll').evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
    await modal.locator('.aftercare-scroll').evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: `test-results/order-aftercare/modal-${width}.png` });
    await page.keyboard.press('Escape');
  }
  expect(state.errors).toEqual([]);
});

test('My Orders shows one live request badge and keeps the full timeline on Details', async ({ context, page }) => {
  const order = makeOrder(), state = await mockApp(context, order);
  await page.goto(`${shop}/myorders`);
  const card = page.getByRole('article', { name: 'Order TEST-1001' });
  const badge = card.getByLabel('Order status', { exact: true });
  await expect(badge).toHaveText('Delivered');
  await expect(card.getByRole('list', { name: 'Delivery progress' })).toHaveCount(0);
  const refreshList = async () => {
    const response = page.waitForResponse(response => response.url().endsWith('/api/order/userorders'));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await response;
  };
  order.refundDetails = { requestType: 'return', status: 'pending', requestedAt: new Date().toISOString(), pickup: { status: 'none' } };
  await refreshList();
  await expect(badge).toHaveText('Return initiated');
  await expect(card.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
  order.refundDetails.pickup.status = 'scheduled';
  await refreshList();
  await expect(badge).toHaveText('Pickup Scheduled');
  order.refundDetails = { requestType: 'refund', status: 'pending', requestedAt: new Date().toISOString() };
  await refreshList();
  await expect(badge).toHaveText('Refund requested');
  order.refundDetails.status = 'processing';
  await refreshList();
  await expect(badge).toHaveText('Refund initiated');
  order.refundDetails.status = 'completed';
  await refreshList();
  await expect(badge).toHaveText('Refund completed');
  order.refundDetails.status = 'none';
  const exchange = { _id: 'test-exchange', ticketId: 'EX-123456', orderItemIndex: 0, createdAt: new Date() };
  order.exchanges = [sanitizeExchangeForCustomer({ ...exchange, status: 'VERIFICATION_APPROVED' })];
  await refreshList();
  await expect(badge).toHaveText('Exchange Approved');
  order.exchanges = [sanitizeExchangeForCustomer({ ...exchange, status: 'NEW_PRODUCT_DISPATCHED' })];
  await refreshList();
  await expect(badge).toHaveText('New Product Dispatched');
  await expect(card.getByLabel('Order status', { exact: true })).toHaveCount(1);
  await expect(card.locator('[aria-current=step]')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await badge.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await card.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByRole('region', { name: 'Exchange tracking EX-123456' }).locator('[aria-current=step]')).toContainText('New Product Dispatched');
  expect(state.errors).toEqual([]);
});

test('My Orders filters use request status and an open exchange takes precedence over a completed one', async ({ context, page }) => {
  const order = makeOrder(), state = await mockApp(context, order);
  state.orders = [order,
    makeOrder({ _id: '650000000000000000000012', orderItemId: 'RETURN-1002', refundDetails: { requestType: 'return', status: 'pending', requestedAt: new Date() } }),
    makeOrder({ _id: '650000000000000000000013', orderItemId: 'EXCHANGE-1003', exchanges: [
      sanitizeExchangeForCustomer({ ticketId: 'EX-111111', orderItemIndex: 0, status: 'VERIFICATION_APPROVED', createdAt: new Date(Date.now() - 86400000) }),
      sanitizeExchangeForCustomer({ ticketId: 'EX-222222', orderItemIndex: 1, status: 'DELIVERED', createdAt: new Date() }),
    ] }),
    makeOrder({ _id: '650000000000000000000014', orderItemId: 'CANCEL-1004', isCancelled: true, orderStatus: 'Cancelled', refundDetails: { requestType: 'cancellation', status: 'processing' } }),
  ];
  await page.goto(`${shop}/myorders`);
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(page.getByRole('article', { name: 'Order EXCHANGE-1003' }).getByLabel('Order status', { exact: true })).toHaveText('Exchange Approved');
  const filters = page.getByRole('group', { name: 'Order status filters' });
  for (const [label, reference] of [['Exchanges', 'EXCHANGE-1003'], ['Returns/Refunds', 'RETURN-1002'], ['Delivered', 'TEST-1001'], ['Cancelled', 'CANCEL-1004']]) {
    await filters.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article', { name: `Order ${reference}` })).toBeVisible();
  }
  expect(state.errors).toEqual([]);
});
