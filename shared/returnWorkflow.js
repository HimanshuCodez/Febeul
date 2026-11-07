export const RETURN_CANCELLATION_NOTICE = 'Return/refund cancellation closes once pickup is scheduled.';

export function hasReturnPickupBeenScheduled(order) {
  const pickup = order?.refundDetails?.pickup || {};
  const tracking = order?.refundDetails?.returnTracking || {};
  return ['scheduled', 'picked_up', 'in_transit', 'delivered_to_warehouse'].includes(pickup.status)
    || Boolean(pickup.scheduledDate || tracking.pickupDate || tracking.receivedDate);
}

export function isReturnAwaitingApproval(order) {
  const refund = order?.refundDetails || {};
  const tracking = refund.returnTracking || {};
  return refund.requestType === 'return' && refund.status === 'pending'
    && !tracking.approvedAt && !tracking.pickupDate && !tracking.receivedDate
    && !['scheduled', 'picked_up', 'in_transit', 'delivered_to_warehouse'].includes(refund.pickup?.status);
}

export function getReturnRefundBlockReason(order) {
  if (order?.refundDetails?.requestType !== 'return') return '';
  if (order.isCancelled || ['none', 'rejected'].includes(order.refundDetails.status)) {
    return 'This return request is not active.';
  }
  const tracking = order.refundDetails.returnTracking || {};
  if (!tracking.receivedDate) return 'Receive the returned item at the warehouse before issuing a refund.';
  if (tracking.qcResult !== 'PASS') return 'A passed quality check is required before issuing a refund.';
  return '';
}
