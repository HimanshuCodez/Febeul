// Lifetime must be explicit: missing or invalid dates never enable an offer.
export const isLifetimeCoupon = coupon => coupon?.isLifetime === true;

export function isCouponExpired(coupon, now = Date.now()) {
  if (isLifetimeCoupon(coupon)) return false;
  const expiry = coupon?.expiryDate ? new Date(coupon.expiryDate).getTime() : NaN;
  return !Number.isFinite(expiry) || expiry <= Number(now);
}
