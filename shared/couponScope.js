// Storefront filtering is advisory; the API checks the saved cart and catalogue.
export function couponMatchesProductItems(coupon, items = []) {
    return Boolean(coupon && coupon.userType !== 'membership' && items.length &&
        (!coupon.applicableSKUs?.length || items.some(item => coupon.applicableSKUs.includes(item.sku))));
}
