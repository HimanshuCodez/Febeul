import { test, expect } from '@playwright/test';

const admin = 'http://127.0.0.1:5178', shop = 'http://127.0.0.1:5177';
const buyer = { _id: '650000000000000000000001', name: 'Test Buyer', email: 'buyer@example.test', addresses: [] };
const makeOrder = (suffix, extra = {}) => ({
  _id: `6500000000000000000000${suffix}`, orderItemId: `123456${suffix}`, userId: buyer,
  items: [{ productId: '650000000000000000000099', name: 'Rose Lace Set', image: '/test-product.svg', price: 100, quantity: 2, color: 'Rose', size: 'M', sku: 'TEST-ROSE' }],
  orderTotal: 250, productAmount: 200, shippingCharge: 50, date: Date.now(),
  orderStatus: 'Confirmed', shiprocketStatus: 'NEW', paymentMethod: 'Razorpay', payment: true,
  razorpayPaymentId: 'pay_local', refundDetails: { status: 'none' },
  address: { name: buyer.name, email: buyer.email, address: 'Test street', state: 'Delhi', city: 'Delhi', zip: '110001', country: 'India', phone: '9999999999' }, ...extra,
});
const event = (status, note) => ({ status, note, by: 'Admin', date: new Date().toISOString() });
const cancelled = (order, status = 'processing') => Object.assign(order, {
  isCancelled: true, orderStatus: 'Cancelled', shiprocketStatus: 'CANCELLED',
  cancellation: { requestedBy: 'admin', requestedByName: 'Admin', reason: 'Item unavailable', requestedAt: new Date().toISOString() },
  refundDetails: { requestType: 'cancellation', status: order.payment ? status : 'none', amount: order.payment ? order.orderTotal : 0, reason: 'Item unavailable', requestedAt: new Date().toISOString(), attempts: 1,
    ...(order.payment && status !== 'pending' ? { id: 'rfnd_local', gatewayStatus: status === 'completed' ? 'processed' : 'pending' } : {}),
    returnTracking: { history: [event('ORDER_CANCELLED', 'Item unavailable')] } },
});

async function mockApp(context, orders) {
  const state = { orders, calls: [], errors: [], delay: 0, reject: false };
  context.on('page', page => page.on('pageerror', error => state.errors.push(error.message)));
  await context.addInitScript(() => {
    if (!['http://127.0.0.1:5177', 'http://127.0.0.1:5178'].includes(window.location.origin)) return;
    localStorage.setItem('token', 'local-cancellation-test');
    localStorage.setItem('role', 'admin'); localStorage.setItem('permissions', '[]');
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      let body; try { body = request.postDataJSON(); } catch { /* GET */ }
      state.calls.push({ path: url.pathname, body });
      let result = { success: true, content: null, data: {}, products: [], wishlist: [], cartItems: [], tickets: [], coupons: [], giftWraps: [], reviews: [], policies: [], messages: [] };
      if (url.pathname === '/api/user/profile') result.user = buyer;
      if (url.pathname === '/api/analytics/config') result.enabled = false;
      if (['/api/order/list', '/api/refund/list', '/api/order/userorders'].includes(url.pathname)) result.orders = orders;
      if (/^\/api\/order\/[a-f0-9]{24}$/.test(url.pathname)) result.order = orders.find(order => url.pathname.endsWith(order._id));
      if (url.pathname === '/api/order/admin-cancel') {
        if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
        if (state.reject) return route.fulfill({ status: 409, json: { success: false, message: 'Order already dispatched. Refresh the order.' } });
        const order = orders.find(order => order._id === body.orderId);
        cancelled(order); order.cancellation.reason = body.reason; order.refundDetails.reason = body.reason;
        result = { success: true, refundStatus: order.refundDetails.status, message: 'Order cancelled.' };
      }
      if (url.pathname === '/api/refund/cancellation/retry') {
        const order = orders.find(order => order._id === body.orderId);
        cancelled(order, 'completed'); order.refundDetails.returnTracking.history.push(event('REFUND_COMPLETED', 'Refund processed by payment provider.'));
        result = { success: true, refundStatus: 'completed', message: 'Refund processed.' };
      }
      return route.fulfill({ json: result });
    }
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/test-product.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="pink"/></svg>' });
    return route.continue();
  });
  return state;
}

test('prepaid confirmation is dismissible, prevents duplicate clicks, and updates the customer and refund history', async ({ context, page }) => {
  const order = makeOrder('11'); const state = await mockApp(context, [order]);
  const customer = await context.newPage(); await customer.goto(`${shop}/myorders`);
  await expect(customer.getByText('Rose Lace Set', { exact: true })).toBeVisible();
  await page.goto(`${admin}/orders`);
  const cancel = page.getByRole('button', { name: `Cancel order ${order.orderItemId}` });
  await cancel.click(); const modal = page.getByRole('dialog', { name: 'Cancel this order?' });
  await expect(modal).toContainText('₹250.00');
  await modal.getByRole('button', { name: 'No, keep order' }).click();
  expect(state.calls.filter(call => call.path.endsWith('/admin-cancel'))).toHaveLength(0);
  await cancel.click(); await page.keyboard.press('Escape'); await expect(modal).toHaveCount(0);
  await cancel.click(); await modal.getByLabel('Reason', { exact: false }).fill('Item unavailable');
  await page.screenshot({ path: test.info().outputPath('prepaid-confirmation.png') });
  state.delay = 700;
  await modal.getByRole('button', { name: 'Yes, cancel & refund' }).dblclick();
  await expect(modal.getByRole('button', { name: 'Cancelling…' })).toBeDisabled();
  await expect(modal).toHaveCount(0);
  const sent = state.calls.filter(call => call.path.endsWith('/admin-cancel'));
  expect(sent).toHaveLength(1); expect(sent[0].body).toEqual({ orderId: order._id, reason: 'Item unavailable' });
  await expect(cancel).toHaveCount(0);
  await customer.bringToFront(); await customer.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(customer.getByText('Refund processing with the payment provider.', { exact: true })).toBeVisible();
  await customer.goto(`${shop}/order-detail/${order._id}`);
  await expect(customer.getByText(/rfnd_local/)).toBeVisible();
  await expect(customer.getByText(/Reason: Item unavailable/)).toBeVisible();
  await page.goto(`${admin}/refund-requests`);
  await page.getByRole('button', { name: `View request ${order._id}` }).click();
  const history = page.getByRole('region', { name: 'Cancellation and refund history' });
  await expect(history).toContainText('₹250.00'); await expect(history).toContainText('ORDER CANCELLED');
  await expect(history.getByRole('button', { name: 'Check refund status' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Mark Completed/ })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('mobile COD cancellation retains a zero-refund history and a usable confirmation modal', async ({ context, page }) => {
  const order = makeOrder('12', { paymentMethod: 'COD', payment: false }); const state = await mockApp(context, [order]);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${admin}/orders`);
  await page.getByRole('button', { name: `Cancel order ${order.orderItemId}` }).click();
  const modal = page.getByRole('dialog'); await expect(modal).toContainText('No refund is due.');
  const box = await modal.boundingBox(); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: test.info().outputPath('cod-confirmation-mobile.png') });
  await modal.getByRole('button', { name: 'Yes, cancel order' }).click(); await expect(modal).toHaveCount(0);
  await page.goto(`${admin}/refund-requests`);
  await page.getByRole('button', { name: `View request ${order._id}` }).click();
  const history = page.getByRole('region', { name: 'Cancellation and refund history' });
  await expect(history).toContainText('₹0.00'); await expect(history).toContainText('No payment was collected.');
  await expect(history.getByRole('button')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('cod-history-mobile.png') });
  expect(state.calls.some(call => call.path.includes('/approve') || call.path.includes('/cancellation/retry'))).toBe(false);
  expect(state.errors).toEqual([]);
});

test('failed and legacy cancellation records can retry the full refund without entering return approval', async ({ context, page }) => {
  const order = cancelled(makeOrder('13'), 'pending'); order.refundDetails.lastError = 'Insufficient gateway balance.';
  const legacy = makeOrder('14', { orderStatus: 'Cancelled', isCancelled: true, refundDetails: { status: 'none' } });
  const state = await mockApp(context, [order, legacy]); await page.goto(`${admin}/refund-requests`);
  await expect(page.getByRole('button', { name: `View request ${legacy._id}` })).toBeVisible();
  await page.getByRole('button', { name: `View request ${order._id}` }).click();
  const history = page.getByRole('region', { name: 'Cancellation and refund history' });
  await expect(history.getByRole('alert')).toHaveText('Insufficient gateway balance.');
  await expect(page.getByRole('button', { name: /Approve|Reject|Mark Completed/ })).toHaveCount(0);
  await history.getByRole('button', { name: 'Retry full refund' }).click();
  await expect(history).toHaveCount(0);
  await page.getByRole('button', { name: `View request ${order._id}` }).click();
  await expect(history).toContainText('REFUND COMPLETED');
  await expect(history.getByRole('button', { name: 'Check refund status' })).toBeVisible();
  expect(state.calls.filter(call => call.path === '/api/refund/cancellation/retry').map(call => call.body)).toEqual([{ orderId: order._id }]);
  expect(state.calls.some(call => call.path === '/api/refund/approve')).toBe(false); expect(state.errors).toEqual([]);
});

test('dispatched orders have no cancel button and API conflicts keep the modal open with an error', async ({ context, page }) => {
  const order = makeOrder('15'), shipped = makeOrder('16', { orderStatus: 'Shipped', shiprocketStatus: 'IN_TRANSIT', shiprocket: { awb: 'AWB123' } });
  const state = await mockApp(context, [order, shipped]); state.reject = true;
  await page.goto(`${admin}/orders`);
  await expect(page.getByRole('button', { name: `Cancel order ${shipped.orderItemId}` })).toHaveCount(0);
  await page.getByRole('button', { name: `Cancel order ${order.orderItemId}` }).click();
  const modal = page.getByRole('dialog'); await modal.getByRole('button', { name: 'Yes, cancel & refund' }).click();
  await expect(modal.getByRole('alert')).toHaveText('Order already dispatched. Refresh the order.');
  await modal.getByRole('button', { name: 'No, keep order' }).click(); await expect(modal).toHaveCount(0);
  expect(order.isCancelled).not.toBe(true); expect(state.errors).toEqual([]);
});

test('cancellation takes precedence over stale delivery and membership display states', async ({ context, page }) => {
  const order = cancelled(makeOrder('17'), 'completed');
  order.orderStatus = 'Delivered'; order.shiprocketStatus = 'DELIVERED';
  order.items[0].name = 'Febeul Luxe Membership'; order.items[0].sku = 'LUXE-MEMBERSHIP';
  const state = await mockApp(context, [order]); await page.goto(`${shop}/myorders`);
  await expect(page.getByText('Cancelled', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Refund: ₹250.00 processed', { exact: true })).toBeVisible();
  await page.goto(`${shop}/order-detail/${order._id}`);
  await expect(page.getByRole('heading', { name: 'Luxe Membership Cancelled' })).toBeVisible();
  await expect(page.getByText('The order has been cancelled.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cancel.*Request|Withdraw/ })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});
