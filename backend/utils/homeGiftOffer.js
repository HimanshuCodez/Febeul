import cmsModel from '../models/cmsModel.js';
import couponModel from '../models/couponModel.js';
import { DEFAULT_HOME_GIFT_OFFER, isPublicGiftCoupon, validateHomeGiftOffer } from '../../shared/homeGiftOffer.js';

export async function validateGiftOfferForSave(input) {
  const content = validateHomeGiftOffer(input);
  if (content.enabled && !isPublicGiftCoupon(await couponModel.findOne({ code: content.couponCode }).lean())) {
    throw new Error('Use an active, unexpired public coupon with remaining uses. Luxe, membership-only and customer-specific coupons cannot be promoted on the home page.');
  }
  return content;
}

export async function getPublicGiftOffer(input) {
  const content = validateHomeGiftOffer({ ...DEFAULT_HOME_GIFT_OFFER, ...input });
  const available = content.enabled && isPublicGiftCoupon(await couponModel.findOne({ code: content.couponCode }).lean());
  // Re-check every read: a coupon can be disabled, expire or become private after publishing.
  return available ? content : { ...content, enabled: false, couponCode: '' };
}

export async function getAdminGiftOffer(req, res) {
  try {
    const document = await cmsModel.findOne({ name: 'homeGiftOffer' }).lean();
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, content: { ...DEFAULT_HOME_GIFT_OFFER, ...document?.content } });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load the home gift offer.' });
  }
}
