import cmsModel from '../models/cmsModel.js';
import { EMAIL_BRAND_TOKENS, EMAIL_PRODUCT_TOKENS, EMAIL_PRODUCT_LOOP } from '../../shared/emailTemplates.js';
import { buildOrderTextTokens, buildProductEmailTokens, fillEmailTokens } from './emailTokens.js';

export const ORDER_EMAIL_CMS_NAME = 'orderConfirmationEmail';

const DEFAULT_SUBJECT = 'Febeul Order Confirmed - #{{orderId}}';

// ---------- Fonts ----------

const FONTS = {
    Montserrat: { stack: "'Montserrat', Helvetica, Arial, sans-serif", google: 'Montserrat:wght@400;600;700' },
    'Playfair Display': { stack: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:wght@700' },
    Poppins: { stack: "'Poppins', Helvetica, Arial, sans-serif", google: 'Poppins:wght@400;600;700' },
    Inter: { stack: "'Inter', Helvetica, Arial, sans-serif", google: 'Inter:wght@400;600;700' },
    Lora: { stack: "'Lora', Georgia, serif", google: 'Lora:wght@400;700' },
    'Cormorant Garamond': { stack: "'Cormorant Garamond', Georgia, serif", google: 'Cormorant+Garamond:wght@600;700' },
    Helvetica: { stack: 'Helvetica, Arial, sans-serif' },
    Georgia: { stack: "Georgia, 'Times New Roman', serif" },
};

// ---------- Tokens ----------

// group 'text' = safe to drop into any text block; 'layout' = HTML fragments meant for raw-HTML mode.
export const TEMPLATE_TOKENS = [
    { key: 'billingAddressName', label: 'Customer name', group: 'text' },
    { key: 'orderId', label: 'Order ID', group: 'text' },
    { key: 'orderDate', label: 'Order date', group: 'text' },
    { key: 'invoiceNumber', label: 'Invoice number', group: 'text' },
    { key: 'paymentMethod', label: 'Payment method', group: 'text' },
    { key: 'totalAmount', label: 'Grand total', group: 'text' },
    { key: 'subtotal', label: 'Subtotal', group: 'text' },
    { key: 'shipping', label: 'Shipping charge', group: 'text' },
    { key: 'shippingAddressCity', label: 'Shipping city', group: 'text' },
    { key: 'shippingAddressState', label: 'Shipping state', group: 'text' },
    { key: 'shippingAddressPhone', label: 'Customer phone', group: 'text' },
    { key: 'currentYear', label: 'Current year', group: 'text' },
    { key: 'itemRows', label: 'Item rows (<tr>s)', group: 'layout' },
    { key: 'couponDiscountRow', label: 'Coupon row (<tr>)', group: 'layout' },
    { key: 'codChargeRow', label: 'COD charge row (<tr>)', group: 'layout' },
    { key: 'giftWrapRow', label: 'Gift wrap row (<tr>)', group: 'layout' },
    { key: 'gstRows', label: 'GST rows (<tr>s)', group: 'layout' },
    { key: 'luxeMemberBadge', label: 'Luxe member badge', group: 'layout' },
    { key: 'razorpayReferenceRow', label: 'Razorpay ref line', group: 'layout' },
    { key: 'bankRrnRow', label: 'Bank RRN line', group: 'layout' },
    { key: 'shippingAddressName', label: 'Shipping name', group: 'layout' },
    { key: 'shippingAddressAddress', label: 'Shipping address line', group: 'layout' },
    { key: 'shippingAddressLandmarkRow', label: 'Landmark line', group: 'layout' },
    { key: 'shippingAddressZip', label: 'Shipping PIN code', group: 'layout' },
    { key: 'shippingAddressCountry', label: 'Shipping country', group: 'layout' },
    ...[
        ['userName', 'Customer name'], ['customerEmail', 'Customer email'],
        ['shippingAddress', 'Complete shipping address'], ['shippingAddressLine1', 'Address line 1'],
        ['shippingAddressLandmark', 'Landmark'], ['shippingAddressPincode', 'PIN / postal code'],
        ['paymentStatus', 'Payment status'], ['discount', 'Discount amount'], ['couponCode', 'Coupon code'],
        ['taxAmount', 'Tax / GST amount'], ['estimatedDeliveryDate', 'Estimated delivery date'],
        ['courierName', 'Courier name'], ['trackingNumber', 'Tracking / AWB number'],
        ['trackingUrl', 'Tracking URL'], ['orderStatus', 'Order status'], ['orderUrl', 'Order details link'],
        ['cancellationReason', 'Cancellation reason'], ['refundAmount', 'Refund amount'],
        ['refundStatus', 'Refund status'], ['refundTransactionId', 'Refund transaction ID'],
    ].map(([key, label]) => ({ key, label, group: 'text' })),
    ...EMAIL_BRAND_TOKENS,
    EMAIL_PRODUCT_LOOP,
    ...EMAIL_PRODUCT_TOKENS,
];

// ---------- Defaults ----------

const DEFAULT_THEME = {
    pageBg: '#fdf5f5',
    cardBg: '#ffffff',
    accent: '#f9aeaf',
    accentSoft: '#fff0f0',
    accentText: '#d17a7b',
    textColor: '#333333',
    mutedColor: '#666666',
    bodyFont: 'Montserrat',
    headingFont: 'Playfair Display',
    radius: 24,
};

const DEFAULT_SOCIAL = [
    { label: 'Instagram', url: 'https://instagram.com/febeul.official', iconUrl: 'https://cdn-icons-png.flaticon.com/512/174/174855.png' },
    { label: 'Facebook', url: 'https://facebook.com/febeul', iconUrl: 'https://cdn-icons-png.flaticon.com/512/174/174848.png' },
];

export const BLOCK_DEFAULTS = {
    logo: { imageUrl: 'https://febeul.com/invoice.jpeg', alt: 'FEBEUL', width: 100, link: 'https://febeul.com', align: 'center', paddingY: 25, showDivider: true, bgColor: '' },
    hero: { title: 'Order Confirmed!', subtitle: 'Get ready! Something beautiful is coming your way.', bgColor: '', bgImage: '', textColor: '#ffffff', align: 'center', titleSize: 36, paddingY: 50 },
    orderBadge: { label: 'Order ID:', showLuxeBadge: true, paddingY: 40 },
    text: { html: '<p>Write something lovely here…</p>', align: 'left', fontSize: 15, color: '', bgColor: '', paddingY: 16 },
    orderDetails: { orderTitle: 'Order Info', shippingTitle: 'Shipping To', cardBg: '#fafafa', paddingY: 10 },
    items: { title: 'Your Selection', colItem: 'Item Details', colQty: 'Qty', colAmount: 'Amount', paddingY: 10 },
    totals: { subtotalLabel: 'Subtotal', shippingLabel: 'Shipping', totalLabel: 'Grand Total', bgColor: '#fafafa', paddingY: 20 },
    button: { text: 'Shop Now', url: 'https://febeul.com', bgColor: '#000000', textColor: '#ffffff', align: 'center', radius: 12, fullWidth: false, paddingY: 20 },
    image: { url: '', alt: '', link: '', width: 100, align: 'center', radius: 12, paddingY: 16 },
    imageText: { imageUrl: '', imageLink: '', html: '<h3>New arrivals</h3><p>Discover pieces picked just for you.</p>', imagePosition: 'left', buttonText: 'Explore', buttonUrl: 'https://febeul.com', bgColor: '', paddingY: 16 },
    divider: { color: '#eeeeee', thickness: 1, paddingY: 16 },
    spacer: { height: 24 },
    social: { links: DEFAULT_SOCIAL, align: 'center', iconSize: 22, bgColor: '', paddingY: 16 },
    footer: {
        html: '<p><strong>Elegant. Soft. Loved.</strong></p><p>Need help with your order? We\'re here for you.</p><p>Contact us at <a href="mailto:support@febeul.com"><strong>support@febeul.com</strong></a></p>',
        links: DEFAULT_SOCIAL,
        legal: '© {{currentYear}} Febeul Luxury. All rights reserved.\nThis is a computer generated confirmation and does not require a signature.\nCustomer Self Declaration: The goods sold are intended for end user consumption. Not for resale.',
        bgColor: '#fafafa',
        textColor: '#999999',
    },
    html: { html: '<p style="margin:0;">Custom HTML</p>', paddingY: 16 },
};

// Blocks that carry live order data: exactly one of each, never deletable.
export const ORDER_BLOCK_TYPES = ['orderBadge', 'orderDetails', 'items', 'totals'];

export const getDefaultOrderEmailContent = () => ({
    mode: 'builder',
    subject: DEFAULT_SUBJECT,
    preheader: 'Thank you for your order! Here are your order details.',
    theme: { ...DEFAULT_THEME },
    blocks: [
        { id: 'logo', type: 'logo', ...BLOCK_DEFAULTS.logo },
        { id: 'hero', type: 'hero', ...BLOCK_DEFAULTS.hero },
        { id: 'orderBadge', type: 'orderBadge', ...BLOCK_DEFAULTS.orderBadge },
        {
            id: 'greeting', type: 'text', ...BLOCK_DEFAULTS.text,
            html: '<p>Hi <strong>{{billingAddressName}}</strong>,</p><p>Thank you for choosing Febeul. We\'ve received your order and are currently preparing it with love and care.</p>',
            align: 'center', fontSize: 16, paddingY: 10,
        },
        { id: 'orderDetails', type: 'orderDetails', ...BLOCK_DEFAULTS.orderDetails, paddingY: 20 },
        { id: 'items', type: 'items', ...BLOCK_DEFAULTS.items },
        { id: 'totals', type: 'totals', ...BLOCK_DEFAULTS.totals },
        { id: 'cta', type: 'button', ...BLOCK_DEFAULTS.button, text: 'Track Your Order', url: 'https://febeul.com/profile', paddingY: 20 },
        { id: 'spacer', type: 'spacer', height: 20 },
        { id: 'footer', type: 'footer', ...BLOCK_DEFAULTS.footer },
    ],
    html: '',
});

export const getTemplateMeta = () => ({
    fonts: Object.keys(FONTS),
    tokens: TEMPLATE_TOKENS,
    blockDefaults: BLOCK_DEFAULTS,
    orderBlockTypes: ORDER_BLOCK_TYPES,
});

export const normalizeContent = (raw, d = getDefaultOrderEmailContent()) => {
    if (!raw || typeof raw !== 'object') return d;
    return {
        mode: ['html', 'builder'].includes(raw.mode) ? raw.mode : d.mode,
        subject: typeof raw.subject === 'string' && raw.subject.trim() ? raw.subject.slice(0, 200) : d.subject,
        preheader: typeof raw.preheader === 'string' ? raw.preheader.slice(0, 250) : d.preheader,
        theme: { ...d.theme, ...(raw.theme && typeof raw.theme === 'object' ? raw.theme : {}) },
        blocks: Array.isArray(raw.blocks)
            ? raw.blocks.filter((b) => b && typeof b === 'object' && BLOCK_DEFAULTS[b.type]).slice(0, 80)
            : d.blocks,
        html: typeof raw.html === 'string' ? raw.html : d.html,
    };
};

// ---------- Sanitising helpers ----------

const esc = (v = '') => String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeUrl = (url, fallback = '') => {
    const u = String(url || '').trim();
    if (/^\{\{\s*(orderUrl|trackingUrl|renewalUrl|productUrl|productImage|supportUrl|instagramUrl|facebookUrl)\s*\}\}$/.test(u)) return u;
    if (/^mailto:\{\{\s*supportEmail\s*\}\}$/.test(u)) return u;
    if (/^(https?:|mailto:|tel:)/i.test(u)) return esc(u);
    return fallback;
};

const cssUrl = (url) => (/^https?:/i.test(String(url || '').trim()) ? String(url).trim().replace(/['"()\s\\]/g, '') : '');

const color = (c, fallback) => {
    const v = String(c || '').trim();
    return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,20})$/i.test(v) ? v : fallback;
};

const num = (v, fallback, min, max) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

const align = (a, fallback = 'center') => (['left', 'center', 'right'].includes(a) ? a : fallback);

const fontStack = (name, fallback) => (FONTS[name] || FONTS[fallback]).stack;

// ---------- Block renderers ----------
// Each returns one or more <tr>s for the 600px-ish content table. Inline styles are used
// throughout because many mail clients strip or ignore <style>.

const CONTENT_WIDTH = 570;

const sectionTitle = (text, t) => `<div style="font-size:14px;font-weight:700;color:${t.textColor};text-transform:uppercase;letter-spacing:1.5px;margin:0 0 20px;border-left:3px solid ${t.accent};padding-left:12px;">${esc(text)}</div>`;

const socialLinks = (links, size, t) => (Array.isArray(links) ? links : [])
    .filter((l) => l && safeUrl(l.url))
    .map((l) => {
        const icon = safeUrl(l.iconUrl);
        const inner = icon
            ? `<img src="${icon}" width="${size}" height="${size}" alt="${esc(l.label || '')}" style="display:block;border:0;width:${size}px;height:${size}px;">`
            : esc(l.label || l.url);
        return `<a href="${safeUrl(l.url)}" target="_blank" style="display:inline-block;margin:0 8px;vertical-align:middle;text-decoration:none;color:${t.accentText};font-size:13px;font-weight:600;">${inner}</a>`;
    })
    .join('');

const bgStyle = (c) => {
    const v = color(c, '');
    return v ? `background-color:${v};` : '';
};

const RENDERERS = {
    logo: (b, t) => {
        const w = num(b.width, 100, 20, CONTENT_WIDTH);
        const src = safeUrl(b.imageUrl);
        if (!src) return '';
        let img = `<img src="${src}" alt="${esc(b.alt)}" width="${w}" style="display:inline-block;width:${w}px;max-width:100%;height:auto;border:0;">`;
        const link = safeUrl(b.link);
        if (link) img = `<a href="${link}" target="_blank" style="text-decoration:none;">${img}</a>`;
        const py = num(b.paddingY, 25, 0, 120);
        const divider = b.showDivider
            ? `<tr><td class="eb-px" style="padding:0 40px;${bgStyle(b.bgColor)}"><div style="border-top:1px solid #e0e0e0;font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>`
            : '';
        return `<tr><td class="eb-px" align="${align(b.align)}" style="padding:${py}px 40px;${bgStyle(b.bgColor)}">${img}</td></tr>${divider}`;
    },

    hero: (b, t) => {
        const al = align(b.align);
        const bg = color(b.bgColor, t.accent);
        const tc = color(b.textColor, '#ffffff');
        const img = cssUrl(b.bgImage);
        const py = num(b.paddingY, 50, 0, 200);
        const size = num(b.titleSize, 36, 14, 72);
        const bgImg = img ? `background-image:url('${img}');background-size:cover;background-position:center;` : '';
        return `<tr><td class="eb-px" align="${al}" ${img ? `background="${esc(img)}"` : ''} style="background-color:${bg};${bgImg}padding:${py}px 40px;text-align:${al};color:${tc};">`
            + (b.title ? `<h1 style="margin:0 0 10px;font-family:${fontStack(t.headingFont, 'Playfair Display')};font-size:${size}px;line-height:1.2;letter-spacing:-0.5px;color:${tc};">${esc(b.title)}</h1>` : '')
            + (b.subtitle ? `<p style="margin:0;font-size:16px;line-height:1.5;color:${tc};opacity:0.95;">${esc(b.subtitle)}</p>` : '')
            + '</td></tr>';
    },

    orderBadge: (b, t) => {
        const py = num(b.paddingY, 40, 0, 120);
        return `<tr><td class="eb-px" align="center" style="padding:${py}px 40px 0;text-align:center;">`
            + `<span style="display:inline-block;background-color:${t.accentSoft};color:${t.accentText};padding:8px 16px;border-radius:100px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${esc(b.label)} #{{orderId}}</span>`
            + (b.showLuxeBadge !== false ? '<div style="margin-top:14px;">{{luxeMemberBadge}}</div>' : '')
            + '</td></tr>';
    },

    text: (b, t) => {
        const al = align(b.align, 'left');
        const py = num(b.paddingY, 16, 0, 120);
        const fs = num(b.fontSize, 15, 10, 40);
        return `<tr><td class="eb-px eb-text" align="${al}" style="padding:${py}px 40px;${bgStyle(b.bgColor)}font-size:${fs}px;line-height:1.6;color:${color(b.color, t.textColor)};text-align:${al};">${b.html || ''}</td></tr>`;
    },

    orderDetails: (b, t) => {
        const py = num(b.paddingY, 10, 0, 120);
        const card = (title, body) => `<div style="background-color:${color(b.cardBg, '#fafafa')};border-radius:16px;padding:24px;">${sectionTitle(title, t)}<p style="margin:0;font-size:13px;line-height:1.6;color:#555555;">${body}</p></div>`;
        const orderInfo = '<strong>Date:</strong> {{orderDate}}<br><strong>Payment:</strong> {{paymentMethod}}<br>{{razorpayReferenceRow}}{{bankRrnRow}}<strong>Invoice:</strong> {{invoiceNumber}}';
        const shipping = '<strong>{{shippingAddressName}}</strong><br>{{shippingAddressAddress}}<br>{{shippingAddressLandmarkRow}}{{shippingAddressCity}}, {{shippingAddressState}} - {{shippingAddressZip}}<br>{{shippingAddressCountry}}<br>Phone: {{shippingAddressPhone}}';
        return `<tr><td class="eb-px" style="padding:${py}px 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;"><tr>`
            + `<td class="eb-col" width="48%" valign="top" style="width:48%;">${card(b.orderTitle, orderInfo)}</td>`
            + '<td class="eb-col eb-gap" width="4%" style="width:4%;font-size:0;line-height:0;">&nbsp;</td>'
            + `<td class="eb-col" width="48%" valign="top" style="width:48%;">${card(b.shippingTitle, shipping)}</td>`
            + '</tr></table></td></tr>';
    },

    items: (b, t) => {
        const py = num(b.paddingY, 10, 0, 120);
        const th = 'font-size:11px;font-weight:700;color:#999999;text-transform:uppercase;letter-spacing:1px;padding-bottom:15px;border-bottom:1px solid #eeeeee;';
        return `<tr><td class="eb-px" style="padding:${py}px 40px;">${sectionTitle(b.title, t)}`
            + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">'
            + `<thead><tr><th align="left" style="${th}text-align:left;">${esc(b.colItem)}</th><th align="center" style="${th}text-align:center;">${esc(b.colQty)}</th><th align="right" style="${th}text-align:right;">${esc(b.colAmount)}</th></tr></thead>`
            + '<tbody>{{itemRows}}</tbody></table></td></tr>';
    },

    totals: (b, t) => {
        const py = num(b.paddingY, 20, 0, 120);
        const cell = 'padding:6px 0;font-size:14px;color:#666666;';
        const grand = 'padding:15px 0 0;border-top:1px solid #eeeeee;font-size:18px;font-weight:700;color:#000000;';
        return `<tr><td class="eb-px" style="padding:${py}px 40px;">`
            + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background-color:${color(b.bgColor, '#fafafa')};border-radius:16px;"><tr><td style="padding:24px;">`
            + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">'
            + `<tr class="totals-row"><td style="${cell}">${esc(b.subtotalLabel)}</td><td align="right" style="${cell}">₹{{subtotal}}</td></tr>`
            + '{{couponDiscountRow}}'
            + `<tr class="totals-row"><td style="${cell}">${esc(b.shippingLabel)}</td><td align="right" style="${cell}">{{shipping}}</td></tr>`
            + '{{codChargeRow}}{{giftWrapRow}}{{gstRows}}'
            + `<tr><td style="${grand}">${esc(b.totalLabel)}</td><td align="right" style="${grand}">₹{{totalAmount}}</td></tr>`
            + '</table></td></tr></table></td></tr>';
    },

    button: (b) => {
        const al = align(b.align);
        const py = num(b.paddingY, 20, 0, 120);
        const url = safeUrl(b.url, '#');
        return `<tr><td class="eb-px" align="${al}" style="padding:${py}px 40px;text-align:${al};">`
            + `<a href="${url}" target="_blank" style="display:${b.fullWidth ? 'block' : 'inline-block'};background-color:${color(b.bgColor, '#000000')};color:${color(b.textColor, '#ffffff')};text-decoration:none;padding:16px 32px;border-radius:${num(b.radius, 12, 0, 50)}px;font-weight:700;font-size:14px;text-align:center;">${esc(b.text)}</a>`
            + '</td></tr>';
    },

    image: (b) => {
        const src = safeUrl(b.url);
        if (!src) return '';
        const pct = num(b.width, 100, 10, 100);
        const px = Math.round((CONTENT_WIDTH * pct) / 100);
        const py = num(b.paddingY, 16, 0, 120);
        let img = `<img src="${src}" alt="${esc(b.alt)}" width="${px}" style="display:inline-block;width:${pct}%;max-width:100%;height:auto;border:0;border-radius:${num(b.radius, 0, 0, 60)}px;">`;
        const link = safeUrl(b.link);
        if (link) img = `<a href="${link}" target="_blank" style="text-decoration:none;">${img}</a>`;
        return `<tr><td class="eb-px" align="${align(b.align)}" style="padding:${py}px 40px;text-align:${align(b.align)};">${img}</td></tr>`;
    },

    imageText: (b, t) => {
        const py = num(b.paddingY, 16, 0, 120);
        const src = safeUrl(b.imageUrl);
        let img = src ? `<img src="${src}" alt="" width="220" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:12px;">` : '';
        const imgLink = safeUrl(b.imageLink);
        if (img && imgLink) img = `<a href="${imgLink}" target="_blank" style="text-decoration:none;">${img}</a>`;
        const btnUrl = safeUrl(b.buttonUrl);
        const btn = b.buttonText && btnUrl
            ? `<a href="${btnUrl}" target="_blank" style="display:inline-block;margin-top:12px;background-color:${t.textColor};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:10px;font-weight:700;font-size:13px;">${esc(b.buttonText)}</a>`
            : '';
        const imageLeft = b.imagePosition !== 'right';
        const imgCell = `<td class="eb-col" width="40%" valign="middle" style="width:40%;">${img}</td>`;
        const textCell = `<td class="eb-col eb-text eb-colpad" width="60%" valign="middle" style="width:60%;${imageLeft ? 'padding-left:24px;' : 'padding-right:24px;'}font-size:14px;line-height:1.6;color:${t.textColor};">${b.html || ''}${btn}</td>`;
        return `<tr><td class="eb-px" style="padding:${py}px 40px;${bgStyle(b.bgColor)}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;"><tr>`
            + (imageLeft ? imgCell + textCell : textCell + imgCell)
            + '</tr></table></td></tr>';
    },

    divider: (b) => {
        const py = num(b.paddingY, 16, 0, 120);
        return `<tr><td class="eb-px" style="padding:${py}px 40px;"><div style="border-top:${num(b.thickness, 1, 1, 10)}px solid ${color(b.color, '#eeeeee')};font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>`;
    },

    spacer: (b) => {
        const h = num(b.height, 24, 4, 200);
        return `<tr><td style="height:${h}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
    },

    social: (b, t) => {
        const al = align(b.align);
        const py = num(b.paddingY, 16, 0, 120);
        const links = socialLinks(b.links, num(b.iconSize, 22, 12, 64), t);
        if (!links) return '';
        return `<tr><td align="${al}" style="padding:${py}px 40px;text-align:${al};${bgStyle(b.bgColor)}">${links}</td></tr>`;
    },

    footer: (b, t) => {
        const tc = color(b.textColor, '#999999');
        const links = socialLinks(b.links, 20, t);
        return `<tr><td class="eb-px eb-text" align="center" style="padding:40px;background-color:${color(b.bgColor, '#fafafa')};color:${tc};font-size:12px;line-height:1.8;text-align:center;">`
            + (b.html || '')
            + (links ? `<div style="margin-top:20px;">${links}</div>` : '')
            + (b.legal ? `<div style="margin-top:28px;font-size:10px;line-height:1.6;opacity:0.7;">${esc(b.legal).replace(/\n/g, '<br>')}</div>` : '')
            + '</td></tr>';
    },

    html: (b) => {
        const py = num(b.paddingY, 16, 0, 120);
        return `<tr><td class="eb-px" style="padding:${py}px 40px;">${b.html || ''}</td></tr>`;
    },
};

export const renderTemplateHtml = (rawContent) => {
    const content = normalizeContent(rawContent);
    const t = { ...DEFAULT_THEME };
    for (const key of ['pageBg', 'cardBg', 'accent', 'accentSoft', 'accentText', 'textColor', 'mutedColor']) {
        t[key] = color(content.theme[key], DEFAULT_THEME[key]);
    }
    t.bodyFont = FONTS[content.theme.bodyFont] ? content.theme.bodyFont : DEFAULT_THEME.bodyFont;
    t.headingFont = FONTS[content.theme.headingFont] ? content.theme.headingFont : DEFAULT_THEME.headingFont;
    t.radius = num(content.theme.radius, DEFAULT_THEME.radius, 0, 40);

    const googleFamilies = [...new Set([t.bodyFont, t.headingFont])]
        .map((f) => FONTS[f].google)
        .filter(Boolean)
        .map((g) => `family=${g}`)
        .join('&');
    const fontImport = googleFamilies ? `@import url('https://fonts.googleapis.com/css2?${googleFamilies}&display=swap');` : '';

    const rows = content.blocks
        .filter((b) => !b.hidden)
        .map((b) => RENDERERS[b.type]({ ...BLOCK_DEFAULTS[b.type], ...b }, t))
        .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(content.subject)}</title>
<style>
${fontImport}
body { margin:0; padding:0; -webkit-font-smoothing:antialiased; }
table { border-collapse:collapse; }
img { border:0; outline:none; text-decoration:none; }
.eb-text p { margin:0 0 12px; }
.eb-text p:last-child { margin-bottom:0; }
.eb-text h1, .eb-text h2, .eb-text h3 { font-family:${fontStack(t.headingFont, 'Playfair Display')}; color:${t.textColor}; margin:0 0 12px; line-height:1.3; }
.eb-text ul, .eb-text ol { margin:0 0 12px; padding-left:20px; }
.eb-text a { color:${t.accentText}; }
.eb-text img { max-width:100%; height:auto; }
.luxe-member-badge { background:linear-gradient(135deg, #FFD700, #FFA500); color:#ffffff; padding:5px 14px; border-radius:100px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; display:inline-block; }
@media only screen and (max-width: 620px) {
  .eb-px { padding-left:20px !important; padding-right:20px !important; }
  .eb-col { display:block !important; width:100% !important; }
  .eb-gap { height:16px !important; }
  .eb-colpad { padding:16px 0 0 0 !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${t.pageBg};font-family:${fontStack(t.bodyFont, 'Montserrat')};color:${t.textColor};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background-color:${t.pageBg};">
<tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="650" cellpadding="0" cellspacing="0" style="width:100%;max-width:650px;background-color:${t.cardBg};border-radius:${t.radius}px;overflow:hidden;box-shadow:0 10px 30px rgba(249,174,175,0.1);">
${rows}
</table>
</td></tr>
</table>
</body>
</html>`;
};

// ---------- Order data → token values ----------

export const buildOrderEmailTokens = (order) => {
    const address = order.address || {};
    const textTokens = buildOrderTextTokens(order);
    const subtotalBeforeCoupon = order.items.reduce((sum, i) => sum + (parseFloat(i.price) * parseFloat(i.quantity)), 0);
    const couponDiscount = parseFloat(order.couponDiscount || 0);

    let itemRowsHtml = '';
    order.items.forEach((item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = parseFloat(item.quantity || 0);
        const itemGross = itemPrice * itemQuantity;

        // Pro-rate the coupon discount for consistent net reporting per item
        const itemProportion = subtotalBeforeCoupon > 0 ? (itemGross / subtotalBeforeCoupon) : 0;
        const itemCouponDiscount = itemProportion * couponDiscount;
        const netTotal = itemGross - itemCouponDiscount;
        const productTokens = buildProductEmailTokens(item);

        itemRowsHtml += `
            <tr>
                <td style="padding: 20px 0; border-bottom: 1px solid #f5f5f5;">
                    ${productTokens.productImage ? `<img src="${esc(productTokens.productImage)}" alt="${esc(item.name)}" width="64" style="display:block;max-width:100%;height:auto;margin-bottom:8px;">` : ''}
                    <div style="font-size: 14px; font-weight: 600; color: #333333;">${esc(item.name)}</div>
                    ${item.size ? `<div style="font-size:11px;color:#666666;margin-top:4px;">Size: ${esc(item.size)}</div>` : ''}
                    ${item.color ? `<div style="font-size:11px;color:#666666;margin-top:4px;">Colour: ${esc(item.color)}</div>` : ''}
                    ${item.sku ? `<div style="font-size: 11px; color: #999999; margin-top: 4px;">SKU: ${esc(item.sku)}</div>` : ''}
                    ${item.hsn ? `<div style="font-size: 11px; color: #999999; margin-top: 2px;">HSN: ${esc(item.hsn)}</div>` : ''}
                    ${productTokens.productUrl ? `<a href="${esc(productTokens.productUrl)}" style="font-size:11px;color:#666666;">View product</a>` : ''}
                </td>
                <td align="center" style="padding: 20px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; color: #666666;">${itemQuantity} pcs</td>
                <td align="right" style="padding: 20px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; font-weight: 700; color: #333333;">₹${netTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    const emailCodCharge = parseFloat(order.codCharge || 0);
    const emailGiftWrapPrice = parseFloat((order.giftWrap && order.giftWrap.price) || 0);

    // Recorded tax is shared with the scalar {{taxAmount}} tag.
    const totalTaxAmount = Number(textTokens.taxAmount);

    const isDelhi = address.state && address.state.trim().toLowerCase() === 'delhi';
    const taxRow = (label, amount) => `
            <tr class="totals-row">
                <td style="padding: 6px 0; font-size: 14px; color: #666666;">${label}</td>
                <td align="right" style="padding: 6px 0; font-size: 14px; color: #666666;">₹${amount.toFixed(2)}</td>
            </tr>`;
    const hasRecordedTax = ['cgstAmount', 'sgstAmount', 'igstAmount'].some(key => order[key] != null);
    const gstRowsHtml = hasRecordedTax
        ? [['CGST', order.cgstAmount], ['SGST', order.sgstAmount], ['IGST', order.igstAmount]]
            .filter(([, amount]) => Number(amount) > 0).map(([label, amount]) => taxRow(label, Number(amount))).join('')
        : isDelhi
        ? taxRow('CGST (2.5%)', totalTaxAmount / 2) + taxRow('SGST (2.5%)', totalTaxAmount / 2)
        : taxRow('IGST (5%)', totalTaxAmount);

    let couponDiscountRow = '';
    if (couponDiscount > 0) {
        let offerLabel = '';
        if (order.couponOfferType && order.couponOfferType !== 'none') {
            offerLabel = `<br><span style="font-size: 10px; font-weight: 700;">(${order.couponOfferType === 'prepaid' ? 'Prepaid Offer' : 'COD Offer'})</span>`;
        }
        couponDiscountRow = `
            <tr class="totals-row">
                <td style="padding: 6px 0; font-size: 14px; color: #666666;">Coupon Discount${offerLabel}</td>
                <td align="right" style="padding: 6px 0; color: #155724; font-size: 14px;">- ₹${couponDiscount.toFixed(2)}</td>
            </tr>
        `;
    }

    const codChargeRow = emailCodCharge > 0 ? taxRow('COD Charges', emailCodCharge) : '';
    const giftWrapRow = emailGiftWrapPrice > 0 ? taxRow(`Gift Wrap (${esc(order.giftWrap.name)})`, emailGiftWrapPrice) : '';

    const luxeMemberBadge = (order.isLuxeMemberAtTimeOfOrder || order.userId?.isLuxeMember)
        ? '<span class="luxe-member-badge">✨ Luxe Member</span>'
        : '';

    const razorpayReferenceId = order.razorpayPaymentId || order.paymentDetails?.razorpay_payment_id;
    const razorpayReferenceRow = (order.paymentMethod === 'Razorpay' && razorpayReferenceId)
        ? `<strong>Razorpay Ref ID:</strong> ${esc(razorpayReferenceId)}<br>`
        : '';
    const bankRrnRow = (order.paymentMethod === 'Razorpay' && order.bankRRN)
        ? `<strong>Bank RRN:</strong> ${esc(order.bankRRN)}<br>`
        : '';
    const shippingAddressLandmarkRow = address.landmark ? `Landmark: ${esc(address.landmark)}<br>` : '';
    return {
        ...Object.fromEntries(Object.entries(textTokens).map(([key, value]) => [key, esc(value)])),
        invoiceDate: textTokens.orderDate,
        razorpayReferenceRow,
        bankRrnRow,
        luxeMemberBadge,
        billingAddressAddress: esc(address.address),
        billingAddressCity: esc(address.city),
        billingAddressZip: esc(address.zip),
        billingAddressCountry: 'India',
        shippingAddressLandmarkRow,
        itemRows: itemRowsHtml,
        couponDiscountRow,
        codChargeRow,
        giftWrapRow,
        gstRows: gstRowsHtml,
    };
};

const decodeEntities = (s) => s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

export const renderOrderEmail = (rawContent, order) => {
    const content = normalizeContent(rawContent);
    const tokens = buildOrderEmailTokens(order);
    const items = (order.items || []).map(item => Object.fromEntries(Object.entries(buildProductEmailTokens(item)).map(([key, value]) => [key, esc(value)])));
    const template = content.mode === 'html' && content.html.trim() ? content.html : renderTemplateHtml(content);
    const subject = decodeEntities(fillEmailTokens(content.subject, tokens).replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    return { subject: subject || fillEmailTokens(DEFAULT_SUBJECT, tokens), html: fillEmailTokens(template, tokens, items) };
};

export const loadOrderEmailContent = async () => {
    try {
        const doc = await cmsModel.findOne({ name: ORDER_EMAIL_CMS_NAME }).lean();
        return normalizeContent(doc?.content);
    } catch (error) {
        console.error('Failed to load order email template, falling back to default:', error);
        return getDefaultOrderEmailContent();
    }
};

export const getOrderConfirmationEmail = async (order) => renderOrderEmail(await loadOrderEmailContent(), order);

// ---------- Sample order for previews / test sends ----------

export const buildSampleOrder = () => {
    const items = [
        { productId: '000000000000000000000001', name: 'Silk Satin Night Dress - Blush', image: 'https://www.febeul.com/removebgLogo.png', sku: 'FB-SND-BL-M', size: 'M', color: 'Blush', hsn: '6208', price: 1299, quantity: 1, discountAmount: 0 },
        { productId: '000000000000000000000002', name: 'Lace Trim Bralette Set - Ivory', image: 'https://www.febeul.com/removebgLogo.png', sku: 'FB-LBS-IV-S', size: 'S', color: 'Ivory', hsn: '6212', price: 899, quantity: 2, discountAmount: 0 },
    ];
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const couponDiscount = 200;
    const giftWrap = { name: 'Classic Pink', price: 49 };
    return {
        _id: '000000000000000A1B2C3D4E',
        items,
        couponDiscount,
        couponCode: 'WELCOME200',
        couponOfferType: 'prepaid',
        shippingCharge: 0,
        codCharge: 0,
        giftWrap,
        productAmount: subtotal,
        orderTotal: subtotal - couponDiscount + giftWrap.price,
        date: Date.now(),
        invoiceNumber: 1024,
        paymentMethod: 'Razorpay',
        payment: true,
        orderStatus: 'Confirmed',
        userId: { name: 'Priya Sharma', email: 'priya@example.test' },
        shiprocket: { courier: 'Sample Courier', awb: 'SAMPLE123456', trackingUrl: 'https://www.febeul.com/myorders', edd: '2030-12-31T12:00:00.000Z' },
        razorpayPaymentId: 'pay_SAMPLE12345678',
        bankRRN: '412345678901',
        isLuxeMemberAtTimeOfOrder: true,
        address: {
            name: 'Priya Sharma',
            address: '221B, Rose Apartments',
            locality: 'Bandra West',
            landmark: 'Near Carter Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            zip: '400050',
            country: 'India',
            phone: '9876543210',
        },
    };
};
