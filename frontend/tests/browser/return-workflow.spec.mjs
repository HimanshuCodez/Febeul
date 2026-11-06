import { test, expect } from '@playwright/test';
import { buildAdminReturnView } from '../../../backend/utils/returnStatus.js';

const admin = 'http://127.0.0.1:5179';
const makeOrder = (extra = {}) => ({
  _id: '650000000000000000000011', orderItemId: '12345678', userId: { _id: '650000000000000000000001', name: 'Test Buyer', email: 'buyer@example.test' },
  items: [{ name: 'Test garment', quantity: 1, price: 500, sku: 'TEST-BLACK' }], orderTotal: 500, productAmount: 500,
  date: Date.now() - 86400000, orderStatus: 'Delivered', shiprocketStatus: 'DELIVERED', deliveredAt: new Date().toISOString(),
  paymentMethod: 'Razorpay', payment: true, razorpayPaymentId: 'pay_local',
  refundDetails: { requestType: 'return', status: 'pending', reason: 'Damaged item', requestedAt: new Date().toISOString(), pickup: { status: 'none' }, returnTracking: {} }, ...extra,
});

async function fixture(context, order = makeOrder()) {
  const state = { order, calls: [], errors: [], pendingGateway: false, pickupFailure: false };
  context.on('page', page => page.on('pageerror', error => state.errors.push(error.message)));
  await context.addInitScript(() => {
    if (location.origin !== 'http://127.0.0.1:5179') return;
    localStorage.setItem('token', 'local-return-workflow-test'); localStorage.setItem('role', 'admin'); localStorage.setItem('permissions', '[]');
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === admin) return route.continue();
    if (url.origin !== 'http://127.0.0.1:4198') return route.abort();
    const refund = order.refundDetails, tracking = refund.returnTracking;
    let data = { success: true, content: null, counts: {}, orders: [] };
    if (url.pathname === '/api/order/list') data.orders = [order];
    if (url.pathname === '/api/return/list') data.returns = [{ ...order, view: buildAdminReturnView(order) }];
    if (request.method() === 'POST' && url.pathname.startsWith('/api/return/')) {
      let body; try { body = request.postDataJSON(); } catch { body = request.postDataBuffer().toString(); }
      state.calls.push({ path: url.pathname, body });
      if (url.pathname.endsWith('/approve')) {
        tracking.approvedAt = new Date().toISOString();
        refund.pickup.status = state.pickupFailure ? 'failed' : 'scheduled';
        if (!state.pickupFailure) refund.pickup.scheduledDate = new Date().toISOString();
        else refund.pickup.failureReason = 'Courier unavailable';
      }
      if (url.pathname.endsWith('/mark-received')) { tracking.receivedDate = new Date().toISOString(); refund.pickup.status = 'delivered_to_warehouse'; }
      if (url.pathname.endsWith('/quality-check')) { tracking.qcResult = 'PASS'; tracking.qcDate = new Date().toISOString(); }
      if (url.pathname.endsWith('/refund')) {
        refund.status = state.pendingGateway ? 'processing' : 'completed'; refund.id = 'rfnd_local';
        refund.amount = body.manualRefundAmount ?? refund.amount ?? 500;
        tracking.refundInitiatedAt = new Date().toISOString();
        if (!state.pendingGateway) tracking.refundPaidAt = new Date().toISOString();
      }
      if (url.pathname.endsWith('/refund-settlement')) {
        refund.status = 'completed'; refund.amount = Number(body.amount || 500); tracking.refundUtr = body.utr; tracking.refundPaidAt = new Date().toISOString();
      }
    }
    return route.fulfill({ json: data });
  });
  return state;
}
async function open(page, tab) {
  await page.goto(`${admin}/return-requests`);
  if (tab) await page.getByRole('button', { name: new RegExp(tab) }).click();
  await page.locator('tbody tr').filter({ hasText: '12345678' }).click();
  return page.getByRole('dialog', { name: 'Return details 12345678' });
}
async function approve(page, drawer) {
  page.once('dialog', dialog => dialog.accept());
  await drawer.getByRole('button', { name: 'Approve & Schedule Pickup' }).click();
  await expect(drawer.getByText('Approval Decision', { exact: true })).toHaveCount(0);
}
async function inspect(drawer) {
  await drawer.getByRole('button', { name: 'Mark as Received', exact: true }).click();
  await drawer.getByRole('button', { name: 'Record QC PASS', exact: true }).click();
}

test('return approval only schedules pickup, then receipt and QC unlock the final prepaid refund', async ({ context, page }) => {
  const state = await fixture(context), drawer = await open(page);
  await expect(drawer.getByText('Refund is the final step', { exact: false })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Full Refund', exact: true })).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: 'Issue Refund', exact: true })).toHaveCount(0);
  await approve(page, drawer);
  expect(state.calls[0]).toEqual({ path: '/api/return/approve', body: { orderId: state.order._id } });
  expect(state.order.refundDetails.status).toBe('pending');
  await expect(drawer.getByRole('button', { name: 'Issue Refund', exact: true })).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Mark as Received', exact: true }).click();
  await expect(drawer.getByRole('button', { name: 'Issue Refund', exact: true })).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Record QC PASS', exact: true }).click();
  await drawer.getByRole('button', { name: 'Partial Refund', exact: true }).click();
  await drawer.getByRole('spinbutton', { name: 'Refund amount' }).fill('350');
  state.pendingGateway = true;
  page.once('dialog', dialog => dialog.accept());
  await drawer.getByRole('button', { name: 'Issue Refund', exact: true }).click();
  await expect(drawer.getByRole('button', { name: 'Check Refund Status', exact: true })).toBeVisible();
  await expect(drawer.getByText('Refund completed', { exact: true })).toHaveCount(0);
  expect(state.calls.at(-1).body.manualRefundAmount).toBe(350);
  state.pendingGateway = false;
  page.once('dialog', dialog => dialog.accept());
  await drawer.getByRole('button', { name: 'Check Refund Status', exact: true }).click();
  await expect(drawer.getByText('Refund completed', { exact: true })).toBeVisible();
  expect(state.calls.map(call => call.path)).toEqual(['/api/return/approve', '/api/return/mark-received', '/api/return/quality-check', '/api/return/refund', '/api/return/refund']);
  await drawer.getByRole('button', { name: 'Close return details' }).click();
  await page.getByRole('button', { name: /Closed/ }).click();
  await expect(page.locator('tbody tr').filter({ hasText: '12345678' })).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('COD payment recording is available only after receipt and inspection', async ({ context, page }) => {
  const state = await fixture(context, makeOrder({ paymentMethod: 'COD', payment: false }));
  const drawer = await open(page);
  await expect(drawer.getByRole('button', { name: 'Record Payment & Close' })).toHaveCount(0);
  await approve(page, drawer); await inspect(drawer);
  await expect(drawer.getByRole('button', { name: 'Record Payment & Close' })).toBeDisabled();
  await drawer.getByPlaceholder('e.g. 4429XXXXXXX').fill('TEST-BANK-REF');
  await drawer.getByRole('button', { name: 'Record Payment & Close' }).click();
  await expect(drawer.getByText('Refund completed', { exact: true })).toBeVisible();
  expect(state.calls.at(-1).path).toBe('/api/return/refund-settlement');
  expect(state.errors).toEqual([]);
});

test('a failed QC blocks settlement and does not send the order back to Awaiting Approval', async ({ context, page }) => {
  const order = makeOrder(); order.refundDetails.returnTracking = { approvedAt: new Date().toISOString(), receivedDate: new Date().toISOString(), qcResult: 'FAIL' };
  const state = await fixture(context, order), drawer = await open(page, 'Refund Pending');
  await expect(drawer.getByText('A passed quality check is required before issuing a refund.')).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Issue Refund' })).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: 'Record Payment & Close' })).toHaveCount(0);
  await expect(drawer.getByText('Approval Decision', { exact: true })).toHaveCount(0);
  expect(state.calls).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('pickup failure shows collection follow-up and keeps refund locked', async ({ context, page }) => {
  const state = await fixture(context); state.pickupFailure = true;
  const drawer = await open(page); await approve(page, drawer);
  await expect(drawer.getByText('Auto-scheduling failed:', { exact: false })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Issue Refund' })).toHaveCount(0);
  expect(state.calls).toHaveLength(1);
  expect(state.order.refundDetails.status).toBe('pending');
  expect(state.errors).toEqual([]);
});
