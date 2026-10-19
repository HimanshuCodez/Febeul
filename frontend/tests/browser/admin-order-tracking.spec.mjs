import { test, expect } from '@playwright/test';
import { buildAdminOrderTracking } from '../../../backend/utils/adminOrderTracking.js';
import { buildAdminExchangeView } from '../../../backend/utils/exchangeStatus.js';

const admin = 'http://127.0.0.1:5179';
const buyer = { _id: '650000000000000000000001', name: 'Test Buyer', email: 'buyer@example.test' };
const makeOrder = (extra = {}) => ({
  _id: '650000000000000000000002', orderItemId: '12345678', userId: buyer,
  items: [{ name: 'Rose Lace Set', image: '/test-product.svg', quantity: 1, price: 500, sku: 'ROSE-42', size: 'M' }],
  date: Date.now() - 86400000, deliveredAt: new Date(Date.now() - 3600000).toISOString(), orderStatus: 'Delivered', shiprocketStatus: 'DELIVERED',
  orderTotal: 500, productAmount: 500, paymentMethod: 'COD', payment: false,
  address: { name: buyer.name, phone: '9999999999', address: 'Test Street', city: 'Delhi', state: 'Delhi', country: 'India', zip: '110001' }, ...extra,
});
const makeExchange = order => ({ _id: '650000000000000000000003', orderId: order._id, userId: buyer, ticketId: 'EX-123456', orderItemIndex: 0, reason: 'damaged', originalItem: order.items[0], status: 'REQUESTED', createdAt: new Date().toISOString(), timeline: [] });
async function setup(context, order, exchanges = []) {
  const state = { errors: [], calls: [] };
  context.on('page', page => page.on('pageerror', error => state.errors.push(error.message)));
  await context.addInitScript(() => { if (location.origin !== 'http://127.0.0.1:5179') return; localStorage.setItem('token', 'local-tracking-test'); localStorage.setItem('role', 'admin'); localStorage.setItem('permissions', '[]'); });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/test-product.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="pink"/></svg>' });
    if (url.origin === admin) return route.continue();
    if (url.origin !== 'http://127.0.0.1:4198') return route.abort();
    state.calls.push(url.pathname);
    let result = { success: true };
    if (url.pathname === '/api/order/list') result.orders = [{ ...order, tracking: buildAdminOrderTracking(order, exchanges) }];
    if (url.pathname === '/api/exchange/list') result.exchanges = exchanges.map(exchange => ({ ...exchange, view: buildAdminExchangeView(exchange) }));
    if (url.pathname === '/api/exchange/verify') {
      const body = route.request().postDataJSON();
      expect(body).toEqual({ exchangeId: exchanges[0]._id, decision: 'approve' });
      exchanges[0].status = 'VERIFICATION_APPROVED';
      exchanges[0].timeline.push({ event: 'VERIFICATION_APPROVED', status: 'VERIFICATION_APPROVED', date: new Date().toISOString(), by: 'Test Admin', note: 'Photos verified by admin' });
    }
    if (url.pathname.startsWith('/api/cms')) result.data = {};
    return route.fulfill({ json: result });
  });
  return state;
}
const trackingRegion = page => page.getByRole('region', { name: 'Order tracking 12345678' });

test('ExchangeDrawer approval updates an open Orders tab; courier refresh keeps its expanded timeline', async ({ context, page }) => {
  const order = makeOrder(), exchange = makeExchange(order);
  const state = await setup(context, order, [exchange]);
  await page.clock.install();
  await page.goto(`${admin}/orders`);
  await expect(page.getByLabel('Current order status').filter({ visible: true })).toContainText('Awaiting Verification');
  await page.getByTitle('Expand details').click();
  const tracking = trackingRegion(page);
  await expect(tracking.getByRole('list', { name: 'Exchange EX-123456 timeline' }).locator('[aria-current="step"]')).toContainText('Exchange initiated');
  const queue = await context.newPage();
  await queue.goto(`${admin}/exchanges`);
  await queue.getByText('EX-123456', { exact: true }).click();
  await queue.getByRole('button', { name: 'Approve Exchange', exact: true }).click();
  await expect(queue.getByRole('button', { name: 'Schedule Pickup', exact: true })).toBeVisible();
  await page.bringToFront();
  await expect(page.getByLabel('Current order status').filter({ visible: true })).toContainText('Verified');
  await expect(tracking.getByRole('list', { name: 'Exchange EX-123456 timeline' }).locator('[aria-current="step"]')).toContainText('Exchange Approved');
  await expect(tracking.getByRole('list', { name: 'Order activity history' })).toContainText('Photos verified by admin');
  // Simulate the backend's next courier update, then advance the actual refresh interval.
  exchange.status = 'OUT_FOR_DELIVERY'; exchange.forwardShipment = { awb: 'REPLACEMENT-123', dispatchedDate: new Date().toISOString(), courier: 'Test Courier' };
  exchange.timeline.push({ event: 'OUT_FOR_DELIVERY', status: 'OUT_FOR_DELIVERY', date: new Date().toISOString(), note: 'Replacement out for delivery' });
  await page.clock.fastForward(31000);
  await expect(page.getByLabel('Current order status').filter({ visible: true })).toContainText('Out for Delivery');
  await expect(tracking.getByRole('list', { name: 'Exchange EX-123456 timeline' }).locator('[aria-current="step"]')).toContainText('Out for Delivery');
  await expect(tracking).toContainText('REPLACEMENT-123');
  const search = page.getByPlaceholder('Search by Order ID, Order Item ID, name, email, phone, AWB...');
  await search.fill('REPLACEMENT-123'); await expect(tracking).toBeVisible();
  await search.fill('EX-123456'); await expect(tracking).toBeVisible();
  await search.fill('unmatched-ticket'); await expect(tracking).toHaveCount(0);
  expect(state.calls.filter(path => path === '/api/exchange/verify')).toHaveLength(1);
  expect(state.errors).toEqual([]);
});

test('Orders shows complete return/refund history and keeps the tracking panel within desktop and mobile widths', async ({ context, page }) => {
  const order = makeOrder({ shiprocket: { awb: 'DELIVERY-123', courier: 'Test Courier', trackingHistory: [{ status: 'NEW', activity: 'Original order registered', date: new Date(Date.now() - 80000000).toISOString() }, { status: 'DELIVERED', activity: 'Delivered to buyer', date: new Date(Date.now() - 3600000).toISOString() }] }, refundDetails: { requestType: 'return', status: 'completed', amount: 500, requestedAt: new Date(Date.now() - 1800000).toISOString(), processedAt: new Date().toISOString(), pickup: { status: 'scheduled', awb: 'RETURN-123', courier: 'Test Courier' }, returnTracking: { refundUtr: 'TEST-UTR-123', history: [{ status: 'RETURN_REQUESTED', note: 'Damaged item return requested', by: 'Customer', date: new Date(Date.now() - 1800000).toISOString() }, { status: 'REFUND_COMPLETED', note: 'Early refund recorded while awaiting pickup', by: 'Test Admin', date: new Date().toISOString() }] } } });
  const state = await setup(context, order);
  await page.goto(`${admin}/orders`); await page.getByTitle('Expand details').click();
  const tracking = trackingRegion(page);
  await expect(tracking.getByRole('list', { name: 'Order activity history' })).toContainText('Original order registered');
  await expect(tracking).toContainText('TEST-UTR-123');
  const received = tracking.getByRole('list', { name: 'Return timeline' }).locator('li').filter({ has: page.getByText('Received', { exact: true }) });
  await expect(received).toContainText('Awaiting update');
  await expect(tracking).toContainText('₹500.00');
  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await tracking.scrollIntoViewIfNeeded();
    await expect(tracking).toBeVisible();
    const size = await tracking.evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth, right: element.getBoundingClientRect().right }));
    expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
    expect(size.right).toBeLessThanOrEqual(width + 1);
    await tracking.screenshot({ path: test.info().outputPath(`tracking-${width}.png`) });
  }
  const csv = page.getByRole('link', { name: 'Export', exact: true });
  const href = await csv.getAttribute('href');
  const data = await page.evaluate(async href => await (await fetch(href)).text(), href);
  expect(data).toContain('Current Tracking Status'); expect(data).toContain('Refund completed');
  expect(state.errors).toEqual([]);
});
