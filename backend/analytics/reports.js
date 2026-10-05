import { AnalyticsEvent, AnalyticsPayment } from './models.js';
import orderModel from '../models/orderModel.js';
import { analyticsConfig } from './config.js';

const run = (model, pipeline) => model.aggregate(pipeline).option({ maxTimeMS: 10000, allowDiskUse: true });
const retained = () => ({ expiresAt: { $gt: new Date() } });
const eventMatch = (range) => ({ ...retained(), timestamp: { $gte: range.start, $lt: range.end } });
const first = (rows, fallback = {}) => rows[0] || fallback;
const eventGroup = { $group: { _id: '$sessionId', visitorId: { $first: '$visitorId' }, names: { $addToSet: '$name' }, firstAt: { $min: '$timestamp' }, lastAt: { $max: '$timestamp' }, events: { $sum: 1 } } };
const has = name => ({ $in: [name, '$names'] });
const countIf = expression => ({ $sum: { $cond: [expression, 1, 0] } });

export async function summaryReport(range) {
  const match = eventMatch(range);
  const config = analyticsConfig();
  const cutoff = new Date(Date.now() - config.abandonmentMinutes * 60000);
  const [visitors, sessions, activity, products, searches, sources, operational, payments, trackedPayments, abandonment] = await Promise.all([
    run(AnalyticsEvent, [
      { $match: match }, { $group: { _id: '$visitorId' } },
      { $lookup: { from: AnalyticsEvent.collection.name, let: { visitor: '$_id' }, pipeline: [{ $match: { ...retained(), timestamp: { $lt: range.start }, $expr: { $eq: ['$visitorId', '$$visitor'] } } }, { $limit: 1 }, { $project: { _id: 1 } }], as: 'earlier' } },
      { $group: { _id: null, total: { $sum: 1 }, new: countIf({ $eq: [{ $size: '$earlier' }, 0] }), returning: countIf({ $gt: [{ $size: '$earlier' }, 0] }) } },
    ]),
    run(AnalyticsEvent, [{ $match: match }, eventGroup, { $group: {
      _id: null, total: { $sum: 1 }, purchasing: countIf(has('purchase')),
      product: countIf(has('product_view')),
      cart: countIf({ $and: [has('product_view'), has('add_to_cart')] }),
      checkout: countIf({ $and: [has('product_view'), has('add_to_cart'), has('checkout_started')] }),
      purchase: countIf({ $and: [has('product_view'), has('add_to_cart'), has('checkout_started'), has('purchase')] }),
    } }]),
    run(AnalyticsEvent, [{ $match: match }, { $group: { _id: '$name', events: { $sum: 1 }, quantity: { $sum: '$quantity' } } }]),
    run(AnalyticsEvent, [{ $match: { ...match, productId: { $exists: true } } }, { $group: { _id: '$productId', views: countIf({ $eq: ['$name', 'product_view'] }), adds: countIf({ $eq: ['$name', 'add_to_cart'] }), removes: countIf({ $eq: ['$name', 'remove_from_cart'] }) } }, { $sort: { views: -1, adds: -1, _id: 1 } }, { $limit: 20 }, { $lookup: { from: 'products', localField: '_id', foreignField: '_id', pipeline: [{ $project: { name: 1 } }], as: 'product' } }, { $set: { name: { $ifNull: [{ $arrayElemAt: ['$product.name', 0] }, 'Unavailable product'] } } }, { $unset: 'product' }]),
    run(AnalyticsEvent, [{ $match: { ...match, name: 'search' } }, { $group: { _id: '$searchTerm', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 20 }]),
    run(AnalyticsEvent, [{ $match: match }, { $sort: { timestamp: 1, _id: 1 } }, { $group: { _id: '$sessionId', referral: { $first: '$referral' }, source: { $first: '$utm_source' }, medium: { $first: '$utm_medium' }, campaign: { $first: '$utm_campaign' } } }, { $group: { _id: { referral: { $ifNull: ['$referral', 'Direct / unavailable'] }, source: { $ifNull: ['$source', ''] }, medium: { $ifNull: ['$medium', ''] }, campaign: { $ifNull: ['$campaign', ''] } }, sessions: { $sum: 1 } } }, { $sort: { sessions: -1 } }, { $limit: 30 }]),
    run(orderModel, [{ $match: { date: { $gte: +range.start, $lt: +range.end }, $or: [{ paymentMethod: 'COD' }, { payment: true }] } }, { $lookup: { from: AnalyticsPayment.collection.name, localField: '_id', foreignField: 'orderId', as: 'verified' } }, { $set: { currency: { $ifNull: [{ $arrayElemAt: ['$verified.currency', 0] }, { $cond: [{ $eq: ['$paymentMethod', 'COD'] }, 'INR', 'UNKNOWN'] }] } } }, { $group: { _id: '$currency', orders: { $sum: 1 }, orderValue: { $sum: '$orderTotal' }, codOrders: countIf({ $eq: ['$paymentMethod', 'COD'] }), cancelledOrders: countIf({ $in: ['$orderStatus', ['Cancelled', 'Failed']] }) } }, { $sort: { _id: 1 } }]),
    revenueReport(AnalyticsPayment, { timestamp: { $gte: range.start, $lt: range.end } }),
    revenueReport(AnalyticsEvent, { ...match, name: 'purchase' }),
    run(AnalyticsEvent, [{ $match: { ...match, name: 'checkout_started' } }, { $group: { _id: '$sessionId', checkoutAt: { $max: '$timestamp' } } }, { $lookup: { from: AnalyticsEvent.collection.name, let: { session: '$_id' }, pipeline: [{ $match: { ...retained(), $expr: { $eq: ['$sessionId', '$$session'] } } }, { $group: { _id: null, lastActivity: { $max: '$timestamp' }, purchaseAt: { $max: { $cond: [{ $eq: ['$name', 'purchase'] }, '$timestamp', null] } } } }], as: 'activity' } }, { $unwind: '$activity' }, { $group: { _id: null, checkouts: { $sum: 1 }, abandoned: countIf({ $and: [{ $lte: ['$activity.lastActivity', cutoff] }, { $lt: ['$activity.purchaseAt', '$checkoutAt'] }] }), purchased: countIf({ $gte: ['$activity.purchaseAt', '$checkoutAt'] }) } }]),
  ]);
  const sessionStats = first(sessions, { total: 0, purchasing: 0, product: 0, cart: 0, checkout: 0, purchase: 0 });
  return { config, from: range.from, to: range.to, visitors: first(visitors, { total: 0, new: 0, returning: 0 }), sessions: sessionStats, conversionRate: sessionStats.total ? sessionStats.purchasing / sessionStats.total * 100 : 0, activity, products, searches, sources, operational, payments, trackedPayments, abandonment: first(abandonment, { checkouts: 0, abandoned: 0, purchased: 0 }) };
}

function revenueReport(model, match) {
  return run(model, [
    { $match: match },
    { $lookup: { from: orderModel.collection.name, localField: 'orderId', foreignField: '_id', pipeline: [{ $project: { 'refundDetails.status': 1, 'refundDetails.amount': 1 } }], as: 'order' } },
    { $set: { refund: { $arrayElemAt: ['$order.refundDetails', 0] } } },
    { $set: { completedRefund: { $cond: [{ $eq: ['$refund.status', 'completed'] }, { $min: ['$amount', { $max: [0, { $ifNull: ['$refund.amount', 0] }] }] }, 0] }, pendingRefund: { $cond: [{ $in: ['$refund.status', ['pending', 'initiated', 'processing']] }, { $min: ['$amount', { $max: [0, { $ifNull: ['$refund.amount', 0] }] }] }, 0] } } },
    { $group: { _id: '$currency', orders: { $sum: 1 }, gross: { $sum: '$amount' }, refunds: { $sum: '$completedRefund' }, pendingRefunds: { $sum: '$pendingRefund' }, net: { $sum: { $subtract: ['$amount', '$completedRefund'] } } } },
    { $sort: { _id: 1 } },
  ]);
}

export async function journeyReport(range, page = 1) {
  const rows = await run(AnalyticsEvent, [
    { $match: eventMatch(range) }, eventGroup, { $sort: { lastAt: -1, _id: 1 } },
    { $facet: { total: [{ $count: 'count' }], rows: [{ $skip: (page - 1) * 10 }, { $limit: 10 }, { $lookup: { from: AnalyticsEvent.collection.name, let: { session: '$_id' }, pipeline: [{ $match: { ...eventMatch(range), $expr: { $eq: ['$sessionId', '$$session'] } } }, { $sort: { timestamp: 1, _id: 1 } }, { $limit: 100 }, { $project: { _id: 0, name: 1, timestamp: 1, path: 1, productId: 1, quantity: 1, searchTerm: 1, currency: 1, amount: 1 } }], as: 'timeline' } }] } },
  ]);
  return { page, pageSize: 10, total: rows[0]?.total[0]?.count || 0, rows: rows[0]?.rows || [] };
}
