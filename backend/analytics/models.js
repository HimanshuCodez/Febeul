import mongoose from 'mongoose';

const options = { versionKey: false, bufferCommands: false, strict: 'throw' };
const eventSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  name: { type: String, required: true },
  timestamp: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  visitorId: { type: String, required: true },
  sessionId: { type: String, required: true },
  userId: mongoose.Schema.Types.ObjectId,
  consentVersion: { type: String, required: true },
  path: String,
  productId: mongoose.Schema.Types.ObjectId,
  quantity: Number,
  amount: Number,
  currency: String,
  searchTerm: String,
  referral: String,
  utm_source: String,
  utm_medium: String,
  utm_campaign: String,
  orderId: mongoose.Schema.Types.ObjectId,
}, options);
eventSchema.index({ eventId: 1 }, { unique: true });
eventSchema.index({ orderId: 1 }, { unique: true, partialFilterExpression: { name: 'purchase' } });
eventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
eventSchema.index({ timestamp: -1, name: 1 });
eventSchema.index({ visitorId: 1, timestamp: 1 });
eventSchema.index({ sessionId: 1, timestamp: 1 });
eventSchema.index({ productId: 1, timestamp: -1 });

// No visitor, session, user, address or payment credentials in payment facts.
// This isolated ledger supplies verified amounts/currencies for operational reporting.
const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  timestamp: { type: Date, required: true },
}, options);
paymentSchema.index({ orderId: 1 }, { unique: true });
paymentSchema.index({ timestamp: -1 });

// A revocation tombstone prevents delayed batches and callbacks using the old ID.
const revocationSchema = new mongoose.Schema({
  visitorId: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
}, options);
revocationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AnalyticsEvent = mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', eventSchema);
export const AnalyticsPayment = mongoose.models.AnalyticsPayment || mongoose.model('AnalyticsPayment', paymentSchema);
export const AnalyticsRevocation = mongoose.models.AnalyticsRevocation || mongoose.model('AnalyticsRevocation', revocationSchema);
