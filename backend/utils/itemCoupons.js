import couponModel from '../models/couponModel.js';
import { couponDiscountFor } from './checkoutSecurity.js';

// discountAmount always represents the discount for the entire product line.
// A fixed coupon is deducted once across the lines sharing that code.
export async function applyItemCoupons(items, user, paymentMethod, { strict = true } = {}) {
    const groups = new Map();
    for (const item of items) {
        item.discountAmount = 0;
        delete item.couponMessage;
        const code = typeof item.appliedCoupon === 'string' ? item.appliedCoupon.trim().toUpperCase() : '';
        item.appliedCoupon = code || null;
        if (!code) continue;
        if (code.length > 100) {
            if (strict) throw new Error('Invalid coupon code.');
            item.appliedCoupon = null;
            item.couponMessage = 'This coupon is no longer available.';
            continue;
        }
        if (!groups.has(code)) groups.set(code, []);
        groups.get(code).push(item);
    }
    if (!groups.size) return { totalDiscount: 0, codes: [] };
    const coupons = await couponModel.find({ code: { $in: [...groups.keys()] } });
    const byCode = new Map(coupons.map(coupon => [coupon.code, coupon]));
    let totalDiscountCents = 0;
    const codes = [];
    for (const [code, group] of groups) {
        const coupon = byCode.get(code);
        try {
            if (group.some(item => item.isActive === false || !Number.isFinite(item.price) || item.price < 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
                throw new Error('This product is unavailable.');
            }
            if (coupon?.applicableSKUs?.length && group.some(item => !coupon.applicableSKUs.includes(item.sku))) {
                throw new Error('Product coupon does not match its SKU.');
            }
            // Before checkout, payment-specific offers are estimates for their permitted method.
            const method = paymentMethod || (coupon?.offerType === 'cod' ? 'COD' : 'Razorpay');
            const discount = couponDiscountFor(coupon, group, user, method);
            const lineCents = group.map(item => Math.round(item.price * item.quantity * 100));
            let remainingSubtotal = lineCents.reduce((sum, amount) => sum + amount, 0);
            let remainingDiscount = Math.min(Math.round(discount * 100), remainingSubtotal);
            totalDiscountCents += remainingDiscount;
            // Allocate in paise so rounding never loses money or makes a line negative.
            group.forEach((item, index) => {
                const share = remainingSubtotal > 0
                    ? Math.min(lineCents[index], Math.round(remainingDiscount * lineCents[index] / remainingSubtotal)) : 0;
                item.discountAmount = share / 100;
                remainingDiscount -= share;
                remainingSubtotal -= lineCents[index];
            });
            codes.push(code);
        } catch (error) {
            if (strict) throw error;
            // Keep the saved code in the cart database so it can become eligible again
            // after another quantity change. Never send an invalid code to checkout.
            for (const item of group) {
                item.appliedCoupon = null;
                item.couponMessage = `Coupon ${code} not applied: ${error.message}`;
            }
        }
    }
    return { totalDiscount: totalDiscountCents / 100, codes };
}
