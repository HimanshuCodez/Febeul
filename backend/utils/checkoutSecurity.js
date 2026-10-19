import { isCouponExpired } from '../../shared/couponValidity.js';

export function validateItems(items, paymentMethod) {
    if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error('Invalid order items.');
    const variants = new Set();
    for (const item of items) {
        if (!item || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error('Invalid item quantity.');
        if (item.name === 'Febeul Luxe Membership') {
            if (paymentMethod === 'COD' || items.length !== 1 || item.quantity !== 1) throw new Error('Membership requires a separate prepaid purchase.');
        } else if (typeof item.productId !== 'string' || !/^[a-f\d]{24}$/i.test(item.productId) || typeof item.size !== 'string' || typeof item.color !== 'string') throw new Error('Invalid product variant.');
        const key = JSON.stringify([item.productId, item.color, item.size]);
        if (variants.has(key)) throw new Error('Duplicate product variant.');
        variants.add(key);
        if (item.appliedCoupon != null && (typeof item.appliedCoupon !== 'string' || item.appliedCoupon.length > 100)) throw new Error('Invalid coupon.');
    }
}

export function couponDiscountFor(coupon, items, user, paymentMethod) {
    if (!coupon || !coupon.isActive || isCouponExpired(coupon)) throw new Error('Invalid or expired coupon.');
    if (coupon.userType === 'membership' && !items.every(i => i.sku === 'LUXE-MEMBERSHIP')) throw new Error('This coupon is valid for Luxe membership only.');
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw new Error('Coupon usage limit reached.');
    const uses = (coupon.usersWhoUsed || []).filter(u => String(u.userId) === String(user._id)).length;
    if (coupon.usageLimitPerUser && uses >= coupon.usageLimitPerUser) throw new Error('Coupon usage limit reached.');
    if ((coupon.offerType === 'prepaid' && paymentMethod === 'COD') || (coupon.offerType === 'cod' && paymentMethod !== 'COD')) throw new Error('Coupon is not valid for this payment method.');
    const luxe = user.isLuxeMember && new Date(user.luxeMembershipExpires) > new Date();
    if (coupon.userType === 'luxe' && !luxe) throw new Error('Coupon requires an active membership.');
    if (coupon.specificUsers?.length && !coupon.specificUsers.some(id => id === user.email || id === String(user._id))) throw new Error('Coupon unavailable for this account.');
    const eligible = items.filter(i => !coupon.applicableSKUs?.length || coupon.applicableSKUs.includes(i.sku));
    const amount = eligible.reduce((total, i) => total + i.price * i.quantity - (i.discountAmount || 0), 0);
    const quantity = eligible.reduce((total, i) => total + i.quantity, 0);
    if (!eligible.length || amount < (coupon.minOrderAmount || 0) || quantity < (coupon.minQuantity || 0)) throw new Error('Coupon minimum or product restrictions are not met.');
    const discount = coupon.discountType === 'percentage' ? amount * coupon.discountValue / 100 : coupon.discountValue;
    if (!Number.isFinite(discount) || discount < 0) throw new Error('Invalid coupon configuration.');
    return Math.round(Math.min(discount, amount) * 100) / 100;
}

export function ownsOrder(order, userId) {
    return !!order && String(order.userId?._id || order.userId) === String(userId);
}

export function stripePaymentMatches(order, session) {
    return session?.id === order.paymentDetails?.stripeSessionId && session.payment_status === 'paid' &&
        session.currency?.toUpperCase() === 'INR' && session.amount_total === Math.round(order.orderTotal * 100) &&
        session.client_reference_id === String(order._id);
}
export function razorpayPaymentMatches(order, remote, payment) {
    return remote?.id === order.paymentDetails?.razorpay_order_id && remote.receipt === String(order._id) &&
        remote.status === 'paid' && remote.currency === 'INR' && remote.amount_paid === Math.round(order.orderTotal * 100) &&
        payment?.order_id === remote.id && payment.status === 'captured' && payment.currency === 'INR' && payment.amount === Math.round(order.orderTotal * 100);
}
