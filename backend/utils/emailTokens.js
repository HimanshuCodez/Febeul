// Values are escaped by the caller. Parse only the template, never customer data,
// so text containing {{...}} cannot turn into another variable or control block.
export const escapeEmailHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const EMAIL_BRAND_VALUES = {
    supportEmail: 'support@febeul.com',
    supportUrl: 'https://www.febeul.com/support',
    instagramUrl: 'https://instagram.com/febeul.official',
    facebookUrl: 'https://facebook.com/febeul',
    brandTagline: 'Elegance - Douceur - Amour',
};

export const safeEmailUrl = (value, fallback = '') => {
    try {
        const url = new URL(String(value || ''));
        return ['https:', 'http:'].includes(url.protocol) ? url.href : fallback;
    } catch { return fallback; }
};

const storefront = () => safeEmailUrl(process.env.FRONTEND_URL, 'https://www.febeul.com').replace(/\/+$/, '');
const money = value => (Number.isFinite(Number(value)) ? Number(value) : 0).toFixed(2);
const dateText = value => {
    if (value == null || value === '') return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

export const buildProductEmailTokens = (item = {}) => {
    const id = item.productId?._id || item.productId;
    return {
        productName: item.name || '', productImage: safeEmailUrl(item.image),
        productSku: item.sku || '', productSize: item.size || '', productColor: item.color || '',
        productQuantity: String(item.quantity ?? ''), productPrice: money(item.price),
        productUrl: id ? `${storefront()}/product/${encodeURIComponent(String(id))}` : '',
    };
};

export const buildOrderTextTokens = (order = {}) => {
    const address = order.address || {};
    const refund = order.refundDetails || {};
    const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const discount = Number(order.couponDiscount || 0);
    const inclusiveTotal = subtotal - discount + Number(order.shippingCharge || 0) + Number(order.codCharge || 0) + Number(order.giftWrap?.price || 0);
    // Prefer the order's recorded GST. Legacy orders without tax fields retain
    // the existing email calculation; no current tax rate is inferred here.
    const recordedTax = ['cgstAmount', 'sgstAmount', 'igstAmount'];
    const taxAmount = recordedTax.some(key => order[key] != null)
        ? recordedTax.reduce((sum, key) => sum + Number(order[key] || 0), 0)
        : inclusiveTotal - inclusiveTotal / 1.05;
    const orderId = String(order.orderItemId || order._id || '').slice(-8).toUpperCase();
    const line1 = [address.address, address.locality].filter(Boolean).join(', ');
    const hasRefund = refund.status && refund.status !== 'none';
    return {
        ...EMAIL_BRAND_VALUES,
        userName: order.userId?.name || address.name || 'Customer',
        billingAddressName: address.name || order.userId?.name || 'Customer',
        customerEmail: order.userId?.email || address.email || '',
        orderId, orderDate: dateText(order.date),
        invoiceNumber: `INV-${order.invoiceNumber ? String(order.invoiceNumber).padStart(4, '0') : orderId}`,
        orderUrl: order._id ? `${storefront()}/order-detail/${encodeURIComponent(String(order._id))}` : `${storefront()}/myorders`,
        paymentMethod: order.paymentMethod || '',
        paymentStatus: order.payment ? 'Paid' : order.orderStatus === 'Failed' ? 'Failed' : order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Pending',
        orderStatus: order.orderStatus || '',
        totalAmount: money(order.orderTotal), subtotal: money(subtotal), discount: money(discount),
        couponCode: order.couponCode || '', taxAmount: money(taxAmount),
        shipping: Number(order.shippingCharge || 0) > 0 ? `₹${money(order.shippingCharge)}` : 'FREE',
        shippingAddress: [address.name, line1, address.landmark, address.city, address.state, address.zip, address.country || 'India'].filter(Boolean).join(', '),
        shippingAddressName: address.name || '', shippingAddressLine1: line1,
        shippingAddressAddress: line1, shippingAddressLandmark: address.landmark || '',
        shippingAddressPincode: String(address.zip ?? ''), shippingAddressZip: String(address.zip ?? ''),
        shippingAddressCity: address.city || '', shippingAddressState: address.state || '',
        shippingAddressCountry: address.country || 'India',
        shippingAddressPhone: [address.phone, address.alternatePhone].filter(Boolean).join(', '),
        estimatedDeliveryDate: dateText(order.shiprocket?.edd),
        courierName: order.shiprocket?.courier || '', trackingNumber: order.shiprocket?.awb || '',
        trackingUrl: safeEmailUrl(order.shiprocket?.trackingUrl),
        cancellationReason: order.cancellation?.reason || '',
        refundAmount: hasRefund ? money(refund.amount) : '',
        refundStatus: hasRefund ? String(refund.status) : '',
        refundTransactionId: hasRefund ? (refund.returnTracking?.refundUtr || refund.id || '') : '',
        currentYear: String(new Date().getFullYear()),
    };
};

export const fillEmailTokens = (template, values, items = []) => {
    const root = [];
    const stack = [{ children: root }];
    const pattern = /\{\{\s*(#items|\/items|#if\s+[a-zA-Z0-9_]+|\/if|[a-zA-Z0-9_]+)\s*\}\}/g;
    let offset = 0;
    for (const match of String(template || '').matchAll(pattern)) {
        const current = stack.at(-1);
        current.children.push(String(template).slice(offset, match.index));
        const tag = match[1].trim();
        if (tag === '#items' || /^#if\s/.test(tag)) {
            const node = { type: tag === '#items' ? 'items' : 'if', key: tag.slice(4).trim(), children: [] };
            current.children.push(node);
            stack.push(node);
        } else if (tag.startsWith('/')) {
            if (stack.length > 1 && stack.at(-1).type === tag.slice(1)) stack.pop();
        } else current.children.push({ type: 'value', key: tag });
        offset = match.index + match[0].length;
    }
    stack.at(-1).children.push(String(template || '').slice(offset));
    const lookup = (tokens, key) => Object.hasOwn(tokens, key) ? String(tokens[key] ?? '') : '';
    const render = (nodes, tokens, inItem = false) => nodes.map(node => {
        if (typeof node === 'string') return node;
        if (node.type === 'value') return lookup(tokens, node.key);
        if (node.type === 'if') return lookup(tokens, node.key) ? render(node.children, tokens, inItem) : '';
        // A product block repeats once per item; nesting it never multiplies items.
        return inItem ? '' : items.map(item => render(node.children, { ...tokens, ...item }, true)).join('');
    }).join('');
    return render(root, values);
};
