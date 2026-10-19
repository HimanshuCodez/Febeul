const DAY = 24 * 60 * 60 * 1000;

export function getAftercareEligibility(order, displayStatus, now = Date.now()) {
  const delivered = new Date(order.deliveredAt).getTime();
  const age = now - delivered;
  const physicalItems = (order.items || []).flatMap((item, index) =>
    item.sku === 'LUXE-MEMBERSHIP' || item.name === 'Febeul Luxe Membership' ? [] : [index]);
  const activeRequest = Boolean(order.refundDetails?.status && !['none', 'rejected'].includes(order.refundDetails.status));
  const activeExchange = (order.exchanges || []).some(exchange =>
    !exchange.exchangeStatus?.blocked && exchange.exchangeStatus?.stage !== 'delivered');
  const deliveredOrder = displayStatus === 'Delivered' && Number.isFinite(delivered) && age >= 0;
  const returnOpen = deliveredOrder && age <= 3 * DAY;
  const exchangeOpen = deliveredOrder && age <= 2 * DAY;
  const exchangeItems = physicalItems.filter(index =>
    !(order.exchanges || []).some(exchange => exchange.orderItemIndex === index));
  const returnAllowed = physicalItems.length > 0 && returnOpen && !activeRequest && !activeExchange;
  const exchangeAllowed = exchangeOpen && !activeRequest && exchangeItems.length > 0;
  const returnReason = activeRequest ? 'This order already has a return or refund request.'
    : activeExchange ? 'An exchange is already in progress.'
      : !returnOpen ? 'The 3-day request window has closed.' : '';
  return {
    return: { allowed: returnAllowed, reason: returnReason },
    refund: { allowed: returnAllowed, reason: returnReason },
    exchange: { allowed: exchangeAllowed, reason: activeRequest ? 'This order already has a return or refund request.'
      : !exchangeOpen ? 'The 2-day exchange window has closed.'
        : !exchangeItems.length ? 'An exchange has already been requested for each item.' : '' },
    exchangeItems,
    physicalItems,
    activeRequest,
  };
}

export const hasAftercareJourney = order =>
  (['return', 'refund'].includes(order.refundDetails?.requestType)
    && Boolean(order.refundDetails?.status && order.refundDetails.status !== 'none'))
  || (order.exchanges || []).some(exchange => exchange.exchangeStatus);

// Refund-only requests do not have a reverse shipment. Never invent pickup
// milestones from the order's "Refund Initiated" label: pending means review.
export function getRefundMilestones(refund) {
  const completed = refund.status === 'completed';
  const initiated = completed || ['initiated', 'processing'].includes(refund.status);
  return [
    { key: 'requested', label: 'Refund requested', reached: true, current: !initiated, at: refund.requestedAt },
    { key: 'refund_initiated', label: 'Refund initiated', reached: initiated, current: initiated && !completed },
    { key: 'refund_completed', label: 'Refund completed', reached: completed, current: completed, at: completed ? refund.processedAt : null },
  ];
}

// The order list needs one current badge, while Order Details owns the full
// journey. Prefer an open request over a completed one on another line item.
export function getOrderRequestStatus(order) {
  const refund = order.refundDetails || {};
  if (order.isCancelled || order.orderStatus === 'Cancelled' || refund.requestType === 'cancellation') return null;
  const requests = [];
  if (['return', 'refund'].includes(refund.requestType) && refund.status && refund.status !== 'none') {
    const type = refund.requestType;
    const title = type === 'return' ? 'Return' : 'Refund';
    const complete = refund.status === 'completed';
    const issue = ['rejected', 'failed'].includes(refund.status);
    const label = refund.status === 'rejected' ? `${title} request declined`
      : refund.status === 'failed' ? 'Refund needs attention'
        : complete ? 'Refund completed'
          : type === 'return' && order.returnStatus ? (order.returnStatus.stage === 'requested' ? 'Return initiated' : order.returnStatus.label)
            : ['initiated', 'processing'].includes(refund.status) ? 'Refund initiated'
              : type === 'return' ? 'Return initiated' : 'Refund requested';
    requests.push({ type, label, tone: issue ? 'issue' : complete ? 'complete' : 'active', active: !complete && refund.status !== 'rejected', at: refund.requestedAt });
  }
  for (const exchange of order.exchanges || []) {
    const status = exchange.exchangeStatus;
    if (!status) continue;
    const complete = status.stage === 'delivered';
    requests.push({
      type: 'exchange',
      label: status.stage === 'requested' ? 'Exchange initiated' : status.label,
      tone: status.blocked ? 'issue' : complete ? 'complete' : 'active',
      active: !status.blocked && !complete,
      at: status.requestedAt || exchange.createdAt,
    });
  }
  const timestamp = request => new Date(request.at).getTime() || 0;
  return requests.sort((a, b) => Number(b.active) - Number(a.active) || timestamp(b) - timestamp(a))[0] || null;
}
