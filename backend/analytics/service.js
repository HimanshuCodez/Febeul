import { AnalyticsEvent, AnalyticsPayment, AnalyticsRevocation } from './models.js';
import { analyticsConfig, expiresAt } from './config.js';
import { contextFromRequest } from './validation.js';

export async function ingestEvents(events, models = { AnalyticsEvent, AnalyticsRevocation }) {
  const visitorId = events[0].visitorId;
  if (await models.AnalyticsRevocation.exists({ visitorId })) return;
  await models.AnalyticsEvent.bulkWrite(events.map(event => ({
    updateOne: { filter: { eventId: event.eventId }, update: { $setOnInsert: event }, upsert: true },
  })), { ordered: false });
  // Close the revocation race with a batch that was already being written.
  if (await models.AnalyticsRevocation.exists({ visitorId })) await models.AnalyticsEvent.deleteMany({ visitorId });
}

export function verifiedPayment(order, proof) {
  if (!order?.payment || !proof || !order._id) return null;
  let minorAmount;
  if (proof.gateway === 'razorpay' && proof.status === 'paid' && String(proof.receipt) === String(order._id) && order.paymentMethod === 'Razorpay') minorAmount = proof.amount_paid;
  if (proof.gateway === 'stripe' && proof.payment_status === 'paid' && proof.id === order.paymentDetails?.stripeSessionId && order.paymentMethod === 'Stripe') minorAmount = proof.amount_total;
  const currency = String(proof.currency || '').toUpperCase();
  if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  return { orderId: order._id, amount: minorAmount / (10 ** digits), currency, timestamp: new Date() };
}

export async function recordVerifiedPurchase({ order, proof, context, userId }, models = { AnalyticsEvent, AnalyticsPayment, AnalyticsRevocation }) {
  if (!analyticsConfig().enabled) return;
  const payment = verifiedPayment(order, proof);
  if (!payment) return;
  // The first verified callback owns attribution, including the decision NOT to track.
  // A later callback after accepting consent cannot backfill an earlier payment.
  const inserted = await models.AnalyticsPayment.updateOne({ orderId: payment.orderId }, { $setOnInsert: payment }, { upsert: true });
  if (!inserted.upsertedCount || !context || String(order.userId?._id || order.userId) !== String(userId)) return;
  if (await models.AnalyticsRevocation.exists({ visitorId: context.visitorId })) return;
  const event = {
    ...context, ...payment, expiresAt: expiresAt(), name: 'purchase', eventId: `purchase:${payment.orderId}`, userId,
    quantity: order.items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
  };
  await models.AnalyticsEvent.updateOne({ eventId: event.eventId }, { $setOnInsert: event }, { upsert: true });
  if (await models.AnalyticsRevocation.exists({ visitorId: context.visitorId })) await models.AnalyticsEvent.deleteMany({ visitorId: context.visitorId });
}

let pending = 0;
// Never await optional analytics on a payment response. Bound pending jobs and drop on failure.
export function afterPaymentResponse(req, res, order, proof, firstPayment = true) {
  try {
    if (!analyticsConfig().enabled || pending >= 50) return;
    const context = firstPayment ? contextFromRequest(req) : null;
    const snapshot = { order: { _id: order._id, payment: order.payment, paymentMethod: order.paymentMethod, paymentDetails: { stripeSessionId: order.paymentDetails?.stripeSessionId }, userId: order.userId?._id || order.userId, items: order.items.map(item => ({ quantity: item.quantity })) }, proof, context, userId: req.userId };
    pending += 1;
    let dispatched = false;
    const dispatch = () => {
      if (dispatched) return;
      dispatched = true;
      setImmediate(() => { recordVerifiedPurchase(snapshot).catch(() => {}).finally(() => { pending -= 1; }); });
    };
    res.once('finish', dispatch);
    res.once('close', dispatch);
  } catch { /* Optional analytics must never affect order processing. */ }
}
