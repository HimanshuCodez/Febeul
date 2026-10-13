import { isCouponExpired } from './couponValidity.js';

export const DEFAULT_HOME_GIFT_OFFER = Object.freeze({
  enabled: false,
  badgeLabel: 'COUPON',
  badgeOffer: 'YOUR',
  badgeCaption: 'GIFT',
  title: 'Exclusive welcome offer',
  ticketLabel: 'COUPON',
  description: 'A little surprise, just for you.',
  buttonText: 'Grab your gift',
  revealTitle: 'Your gift is ready!',
  terms: 'Use this code at checkout. Coupon conditions apply.',
  couponCode: '',
  backgroundColor: '#ffcc00',
  textColor: '#1c1917',
  buttonColor: '#171717',
  buttonTextColor: '#ffffff',
  ticketColor: '#fffdf7',
});

export const GIFT_TEXT_FIELDS = [
  ['badgeLabel', 'Badge label', 16],
  ['badgeOffer', 'Badge main text', 12],
  ['badgeCaption', 'Badge bottom text', 16],
  ['title', 'Popup heading', 80],
  ['ticketLabel', 'Ticket label', 24],
  ['description', 'Popup description', 160],
  ['buttonText', 'Reveal button text', 40],
  ['revealTitle', 'Revealed gift heading', 80],
  ['terms', 'Offer terms', 300],
];

export const GIFT_COLOR_FIELDS = [
  ['backgroundColor', 'Offer background'],
  ['textColor', 'Offer text'],
  ['buttonColor', 'Button background'],
  ['buttonTextColor', 'Button text'],
  ['ticketColor', 'Ticket background'],
];

export function validateHomeGiftOffer(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Enter valid gift offer settings.');
  if (typeof input.enabled !== 'boolean') throw new Error('Choose whether the gift offer is enabled.');
  const result = { enabled: input.enabled };
  for (const [key, label, max] of [...GIFT_TEXT_FIELDS, ['couponCode', 'Coupon code', 64]]) {
    if (typeof input[key] !== 'string' || input[key].trim().length > max || /[\u0000-\u001f\u007f]/.test(input[key])) {
      throw new Error(`${label} must be plain text, up to ${max} characters.`);
    }
    result[key] = input[key].trim();
    if (!result[key] && !['description', 'terms', 'couponCode'].includes(key)) throw new Error(`${label} is required.`);
  }
  result.couponCode = result.couponCode.toUpperCase();
  if (result.enabled && !result.couponCode) throw new Error('Choose an existing coupon before enabling this offer.');
  for (const [key, label] of GIFT_COLOR_FIELDS) {
    if (typeof input[key] !== 'string' || !/^#[\da-f]{6}$/i.test(input[key])) throw new Error(`${label} must be a six-digit hex color.`);
    result[key] = input[key].toLowerCase();
  }
  return result;
}

// A home-page promotion is public. Never advertise private or Luxe-only codes here.
export function isPublicGiftCoupon(coupon, now = Date.now()) {
  return Boolean(coupon && coupon.isActive && !isCouponExpired(coupon, now) &&
    (!coupon.userType || coupon.userType === 'normal') && !coupon.specificUsers?.length &&
    (!coupon.usageLimit || (coupon.usageCount || 0) < coupon.usageLimit));
}
