// Buckets a refund/return row into exactly one of three real-world scenarios.
// Mirrors the conditions the backend itself uses when it sets
// refundDetails.requestType (backend/controllers/orderController.js
// cancelOrder — cancellation is only reachable before shipping — and
// backend/controllers/refundController.js autoRefundOnCourierReturn) rather
// than re-deriving shipped/delivered from scratch here, so this can't drift
// from what actually happened.
export const REQUEST_CATEGORIES = [
  { key: 'cancellation', label: 'Cancellation', hint: 'Cancelled before dispatch by the customer or admin' },
  { key: 'courier_return', label: 'Courier Return', hint: 'Shipped, but the courier returned it undelivered (RTO)' },
  { key: 'return', label: 'Customer Return', hint: 'Delivered, then the customer requested a return' },
];

export const isCancellation = row => Boolean(row?.isCancelled || row?.orderStatus === 'Cancelled' || row?.refundDetails?.requestType === 'cancellation');
export const refundStatus = row => isCancellation(row) && row?.payment && (!row.refundDetails?.status || row.refundDetails.status === 'none') ? 'pending' : row?.refundDetails?.status || 'none';
export const refundAmount = row => isCancellation(row) ? (row.payment ? row.refundRequestAmount ?? (row.refundDetails?.amount || row.orderTotal || 0) : 0) : row?.refundDetails?.amount ?? row?.orderTotal ?? 0;

export const categoryOf = (row) => {
  const type = row?.refundDetails?.requestType;
  if (isCancellation(row)) return 'cancellation';
  if (type === 'return') return 'return';
  // COD RTOs never go through refundController (nothing was paid to refund),
  // so they never get tagged 'courier_return' — orderStatus is the only
  // signal left for that case.
  if (type === 'courier_return' || row?.orderStatus === 'Returned') return 'courier_return';
  return null;
};

export const categoryLabel = (row) => REQUEST_CATEGORIES.find((c) => c.key === categoryOf(row))?.label || 'Refund Only';

export const isPrepaid = (paymentMethod) => paymentMethod === 'Razorpay' || paymentMethod === 'Stripe';
