import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomerReturnStatus, sanitizeOrderForCustomer } from '../utils/returnStatus.js';

const requested = () => ({ refundDetails: { requestType: 'return', status: 'pending', requestedAt: new Date(), pickup: { status: 'none' }, returnTracking: {} } });
const reached = view => view.milestones.filter(step => step.reached).map(step => step.key);

test('a submitted return starts its timeline before pickup approval', () => {
  const view = buildCustomerReturnStatus(requested());
  assert.equal(view.stage, 'requested');
  assert.deepEqual(reached(view), ['requested']);
});

test('an early refund does not mark unreported pickup, receipt or QC as complete', () => {
  const order = requested();
  order.refundDetails.status = 'processing';
  let view = buildCustomerReturnStatus(order);
  assert.equal(view.stage, 'refund_initiated');
  assert.deepEqual(reached(view), ['requested', 'refund_initiated']);
  order.refundDetails.status = 'completed';
  view = buildCustomerReturnStatus(order);
  assert.deepEqual(reached(view), ['requested', 'refund_initiated', 'refund_completed']);
});

test('courier and warehouse events advance the parcel while refund remains pending', () => {
  const order = requested();
  order.refundDetails.pickup = { status: 'scheduled', scheduledDate: new Date() };
  assert.equal(buildCustomerReturnStatus(order).stage, 'pickup_scheduled');
  order.refundDetails.pickup.status = 'picked_up';
  order.refundDetails.returnTracking.pickupDate = new Date();
  assert.equal(buildCustomerReturnStatus(order).stage, 'picked_up');
  order.refundDetails.returnTracking.receivedDate = new Date();
  assert.equal(buildCustomerReturnStatus(order).stage, 'received');
  order.refundDetails.returnTracking.qcResult = 'PASS';
  order.refundDetails.returnTracking.qcDate = new Date();
  const view = buildCustomerReturnStatus(order);
  assert.equal(view.stage, 'qc_done');
  assert.equal(view.milestones.find(step => step.key === 'refund_initiated').reached, false);
});

test('refund-only and declined requests do not expose a parcel journey or internal audit fields', () => {
  const order = requested();
  order.refundDetails.requestType = 'refund';
  assert.equal(buildCustomerReturnStatus(order), null);
  order.refundDetails.requestType = 'return';
  order.refundDetails.status = 'rejected';
  assert.equal(buildCustomerReturnStatus(order), null);
  assert.equal(sanitizeOrderForCustomer(order).refundDetails.returnTracking, undefined);
});
