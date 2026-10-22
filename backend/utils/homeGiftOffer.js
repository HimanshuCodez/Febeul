import cmsModel from '../models/cmsModel.js';
import couponModel from '../models/couponModel.js';
import { DEFAULT_HOME_GIFT_OFFER, getCouponDiscountLabel, isActiveGiftCoupon, isPublicGiftCoupon, validateHomeGiftOffer } from '../../shared/homeGiftOffer.js';

export async function validateGiftOfferForSave(input) {
  const content = validateHomeGiftOffer(input);
  const coupon = content.couponCode ? await couponModel.findOne({ code: content.couponCode }).lean() : null;
  if (content.enabled && !isPublicGiftCoupon(coupon)) {
    throw new Error('Use an active, unexpired public coupon with remaining uses. Luxe, membership-only and customer-specific coupons cannot be promoted on the home page.');
  }
  return { ...content, badgeOffer: getCouponDiscountLabel(coupon) };
}

export async function getPublicGiftOffer(input) {
  const content = validateHomeGiftOffer({ ...DEFAULT_HOME_GIFT_OFFER, ...input });
  const coupon = content.enabled ? await couponModel.findOne({ code: content.couponCode }).lean() : null;
  const available = content.enabled && isPublicGiftCoupon(coupon);
  // Re-check every read: a coupon can be disabled, expire or become private after publishing.
  return available ? { ...content, badgeOffer: getCouponDiscountLabel(coupon) } : { ...content, enabled: false, couponCode: '', badgeOffer: '' };
}

export async function getAdminGiftOffer(req, res) {
  try {
    const [document, activeCoupons] = await Promise.all([
      cmsModel.findOne({ name: 'homeGiftOffer' }).lean(),
      couponModel.find({ isActive: true }).select('code description discountType discountValue isActive isLifetime expiryDate usageLimit usageCount userType specificUsers').sort({ code: 1 }).lean(),
    ]);
    const coupons = activeCoupons.filter(coupon => isActiveGiftCoupon(coupon)).map(coupon => ({
      _id: coupon._id, code: coupon.code, description: coupon.description,
      discountType: coupon.discountType, discountValue: coupon.discountValue,
      eligibleForGift: isPublicGiftCoupon(coupon),
      restriction: coupon.specificUsers?.length ? 'Customer-specific' : coupon.userType === 'membership' ? 'Membership purchase only' : coupon.userType === 'luxe' ? 'Luxe members only' : !getCouponDiscountLabel(coupon) ? 'Invalid discount' : '',
    }));
    const content = { ...DEFAULT_HOME_GIFT_OFFER, ...document?.content };
    const selected = coupons.find(coupon => coupon.code === content.couponCode);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, content: { ...content, badgeOffer: getCouponDiscountLabel(selected) }, coupons });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load the home gift offer.' });
  }
}
