import { CLIENT_EVENTS, UUID, PRODUCT_ID, CAMPAIGN_KEYS, safePath, safeSearch, safeCampaign, safeReferral } from '../../shared/analyticsPrivacy.js';
import { analyticsConfig, expiresAt } from './config.js';

export function validateContext(input) {
  if (!input || typeof input.visitorId !== 'string' || typeof input.sessionId !== 'string' || !UUID.test(input.visitorId) || !UUID.test(input.sessionId) || input.consentVersion !== analyticsConfig().consentVersion) throw new Error('Invalid analytics consent context');
  const context = { visitorId: input.visitorId, sessionId: input.sessionId, consentVersion: input.consentVersion, path: safePath(input.path) };
  for (const key of CAMPAIGN_KEYS) {
    const value = safeCampaign(input[key]);
    if (value) context[key] = value;
  }
  const referral = safeReferral(`https://${typeof input.referral === 'string' ? input.referral : ''}`);
  if (referral) context.referral = referral;
  return context;
}

export function contextFromRequest(req) {
  try {
    const raw = req.get('x-analytics-context');
    return raw && raw.length <= 2048 ? validateContext(JSON.parse(raw)) : null;
  } catch { return null; }
}

export function validateBatch(body, userId) {
  if (!body || !Array.isArray(body.events) || body.events.length < 1 || body.events.length > 20) throw new Error('Provide 1 to 20 events');
  const context = validateContext(body.context);
  return body.events.map(input => {
    if (!input || typeof input.eventId !== 'string' || !UUID.test(input.eventId) || !CLIENT_EVENTS.includes(input.name)) throw new Error('Invalid event');
    const event = { ...context, eventId: input.eventId, name: input.name, timestamp: new Date(), expiresAt: expiresAt(), path: safePath(input.path) };
    if (PRODUCT_ID.test(String(userId || ''))) event.userId = userId;
    if (['product_view', 'add_to_cart', 'remove_from_cart'].includes(input.name)) {
      if (typeof input.productId !== 'string' || !PRODUCT_ID.test(input.productId)) throw new Error('Invalid product ID');
      event.productId = input.productId;
    }
    if (['add_to_cart', 'remove_from_cart'].includes(input.name)) {
      if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 999) throw new Error('Invalid quantity');
      event.quantity = input.quantity;
    }
    if (['add_to_cart', 'remove_from_cart', 'checkout_started'].includes(input.name) && input.amount !== undefined) {
      if (!Number.isFinite(input.amount) || input.amount < 0 || input.amount > 100000000 || !/^[A-Z]{3}$/.test(input.currency)) throw new Error('Invalid amount or currency');
      event.amount = Math.round(input.amount * 100) / 100;
      event.currency = input.currency;
    }
    if (input.name === 'search') {
      event.searchTerm = safeSearch(input.searchTerm);
      if (!event.searchTerm) throw new Error('Search term omitted for privacy');
    }
    return event;
  });
}

export function reportRange(query) {
  const startText = query.from || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const endText = query.to || new Date().toISOString().slice(0, 10);
  if (![startText, endText].every(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))) throw new Error('Use YYYY-MM-DD dates');
  const start = new Date(`${startText}T00:00:00.000Z`);
  const last = new Date(`${endText}T00:00:00.000Z`);
  if (!Number.isFinite(+start) || !Number.isFinite(+last) || start.toISOString().slice(0, 10) !== startText || last.toISOString().slice(0, 10) !== endText || start > last || last - start > 365 * 86400000) throw new Error('Select a valid range of at most 366 days');
  return { start, end: new Date(+last + 86400000), from: startText, to: endText };
}
