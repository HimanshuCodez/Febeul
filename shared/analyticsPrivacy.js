// Shared allowlist: nothing from an arbitrary URL or request body is copied wholesale.
export const CLIENT_EVENTS = ['page_view', 'product_view', 'search', 'add_to_cart', 'remove_from_cart', 'checkout_started'];
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PRODUCT_ID = /^[0-9a-f]{24}$/i;
export const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];

export function safePath(value) {
  if (typeof value !== 'string') return '/other';
  const path = value.split(/[?#]/)[0].toLowerCase().replace(/\/+$/, '') || '/';
  if (/^\/product\/[0-9a-f]{24}$/.test(path)) return path;
  if (/^\/products(?:\/[a-z][a-z0-9-]{0,47}){0,3}$/.test(path) && !/\d{5}/.test(path)) return path;
  if (path.startsWith('/order-detail/')) return '/order-detail';
  if (path.startsWith('/policy/')) return '/policy';
  return ['/', '/profile', '/auth', '/address', '/wishlist', '/cart', '/support', '/forgot-password', '/giftwrap', '/luxe', '/new-and-now', '/bestsellers', '/checkout', '/myorders', '/reviewrating', '/faq', '/luxepolicy', '/dataprivacy', '/grievanceredressals', '/paymentpolicy', '/returnrefund', '/termsconditions', '/giftwrappolicy', '/verify', '/order-detail', '/policy'].includes(path) ? path : '/other';
}

export function safeSearch(value) {
  if (typeof value !== 'string' || value.length > 120 || /@|https?:|www\.|\d{5,}|\b(?:password|token|bearer|secret)\b/i.test(value)) return '';
  return value.normalize('NFKC').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 60);
}

export function safeCampaign(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9 _-]{0,59}$/i.test(value) || /\d{5,}|[a-f0-9]{20}/i.test(value)) return '';
  return value.trim().toLowerCase();
}

export function safeReferral(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    // Strip path, query, credentials, port and subdomains (which can contain IDs).
    const parts = url.hostname.toLowerCase().split('.');
    if (parts.length < 2 || parts.every(part => /^\d+$/.test(part))) return '';
    const count = /^(co|com|org|net|gov|ac)$/.test(parts.at(-2)) && parts.at(-1).length === 2 ? 3 : 2;
    const host = parts.slice(-count).join('.');
    return /^[a-z0-9.-]{1,100}$/.test(host) ? host : '';
  } catch { return ''; }
}

export function attributionFromUrl(url, referrer = '') {
  const result = {};
  try {
    const parsed = new URL(url);
    for (const key of CAMPAIGN_KEYS) {
      const value = safeCampaign(parsed.searchParams.get(key));
      if (value) result[key] = value;
    }
    const referral = safeReferral(referrer);
    if (referral && referral !== safeReferral(parsed.origin)) result.referral = referral;
  } catch { /* malformed URLs carry no attribution */ }
  return result;
}
