import { readFileSync } from 'node:fs';
import cmsModel from '../models/cmsModel.js';
import { EMAIL_TEMPLATE_OPTIONS, EMAIL_BRAND_TOKENS, EMAIL_PRODUCT_TOKENS, EMAIL_PRODUCT_LOOP } from '../../shared/emailTemplates.js';
import { EMAIL_BRAND_VALUES, buildOrderTextTokens, buildProductEmailTokens, escapeEmailHtml, fillEmailTokens, safeEmailUrl } from './emailTokens.js';
import { REQUEST_TYPE_LABEL, RETURN_REQUEST_CREATED_HTML, REFUND_PROCESSED_HTML } from '../templates/returnEmail.js';
import { LUXE_EXPIRED_HTML } from '../templates/luxeExpiredEmail.js';
import { LUXE_ACTIVATED_HTML } from '../templates/luxemail.js';
import {
    ORDER_EMAIL_CMS_NAME, ORDER_BLOCK_TYPES, BLOCK_DEFAULTS,
    getDefaultOrderEmailContent, getTemplateMeta, normalizeContent,
    renderOrderEmail, renderTemplateHtml, TEMPLATE_TOKENS, buildSampleOrder,
} from './orderEmailTemplate.js';

const textToken = (key, label) => ({ key, label, group: 'text' });
const customerTokens = [textToken('userName', 'Customer name'), textToken('customerEmail', 'Customer email'), textToken('currentYear', 'Current year'), ...EMAIL_BRAND_TOKENS];
const orderTokens = [...TEMPLATE_TOKENS.filter(token => token.group === 'text'), EMAIL_PRODUCT_LOOP, ...EMAIL_PRODUCT_TOKENS];
const otpDefinition = (cmsName, subject, purpose) => ({
    cmsName, subject, title: subject,
    body: `<p>Hello {{userName}},</p><p>Your ${purpose} code is:</p><h2>{{otp}}</h2><p>This code expires in {{expiryMinutes}} minutes. Do not share it with anyone.</p>`,
    tokens: [...customerTokens, textToken('otp', 'One-time code'), textToken('expiryMinutes', 'Code validity in minutes')],
    requiredHtmlTokens: ['otp', 'expiryMinutes'],
    requiredTokens: ['otp'],
});

const DEFINITIONS = {
    'order-confirmation': {
        cmsName: ORDER_EMAIL_CMS_NAME,
        requiredHtmlTokens: ['itemRows', 'totalAmount', 'orderId'],
    },
    'welcome': {
        cmsName: 'welcomeEmail',
        subject: 'Welcome to Febeul!',
        html: readFileSync(new URL('../templates/welcomeEmail.html', import.meta.url), 'utf8'),
        title: 'Welcome to Febeul!',
        body: '<p>Hello {{userName}}! 👋</p><p>We\'re absolutely thrilled to have you join the Febeul family! Thank you for choosing us as your shopping destination.</p><p>You\'ve just unlocked a world of incredible products, exclusive deals, and a seamless shopping experience tailored just for you.</p><h3>🎉 What\'s Waiting for You:</h3><ul><li><strong>Exclusive Offers</strong> – Get access to member-only deals</li><li><strong>Fast &amp; Secure Checkout</strong> – Shop with confidence</li><li><strong>24/7 Support</strong> – We\'re always here to help</li><li><strong>Latest Collections</strong> – Be the first to discover new arrivals</li></ul><p>Ready to explore? Browse our collections and find your perfect match.</p>',
        button: { text: 'Start Shopping Now', url: 'https://febeul.onrender.com' },
        tokens: customerTokens,
        requiredHtmlTokens: ['userName'],
    },
    'email-otp': otpDefinition('emailOtpEmail', 'Your Febeul verification code', 'verification / login'),
    'password-reset-otp': otpDefinition('passwordResetOtpEmail', 'Your Password Reset OTP', 'password reset'),
    'admin-login-otp': otpDefinition('adminLoginOtpEmail', 'Your Admin Login OTP', 'admin login'),
    'order-shipped': {
        cmsName: 'orderShippedEmail', subject: 'Your Febeul Order #{{orderId}} Has Shipped', title: 'Your Order Has Shipped',
        body: '<p>Hello {{userName}},</p><p>Your order <strong>#{{orderId}}</strong> is on its way.</p>{{#if courierName}}<p>Courier: {{courierName}}</p>{{/if}}{{#if trackingNumber}}<p>Tracking number: {{trackingNumber}}</p>{{/if}}{{#if estimatedDeliveryDate}}<p>Estimated delivery: {{estimatedDeliveryDate}}</p>{{/if}}<p><a href="{{trackingUrl}}">Track your order</a></p>',
        button: { text: 'View Order', url: '{{orderUrl}}' },
        tokens: orderTokens,
        requiredHtmlTokens: ['orderId', 'trackingUrl'],
    },
    'order-delivered': {
        cmsName: 'orderDeliveredEmail', subject: 'Your Febeul Order #{{orderId}} Has Been Delivered', title: 'Your Order Has Been Delivered',
        body: '<p>Hello {{userName}},</p><p>Your order <strong>#{{orderId}}</strong> has been delivered.</p><p>Thank you for shopping with Febeul. If you need help with your order, please contact our support team.</p>',
        button: { text: 'View Order', url: '{{orderUrl}}' }, tokens: orderTokens, requiredHtmlTokens: ['orderId'],
    },
    'order-cancelled': {
        cmsName: 'orderCancelledEmail', subject: 'Your Febeul Order #{{orderId}} Has Been Cancelled', title: 'Order Cancelled',
        body: '<p>Hello {{userName}},</p><p>Your order <strong>#{{orderId}}</strong> has been cancelled.</p><p>{{cancellationReason}}</p><p>Check your order details for the latest payment and refund status.</p>',
        button: { text: 'View Order', url: '{{orderUrl}}' },
        tokens: orderTokens, requiredHtmlTokens: ['orderId'],
    },
    'return-request': {
        cmsName: 'returnRequestEmail',
        subject: 'We Received Your Request',
        html: RETURN_REQUEST_CREATED_HTML,
        title: '{{requestLabel}} Received',
        body: '<p>Hello {{userName}},</p><p>We\'ve received your {{requestLabelLower}} and it\'s now under review.</p><p><strong>Order #{{orderId}}</strong></p><p>We\'ll email you again as soon as this is processed. You can also track its progress anytime from your Order History.</p>',
        tokens: [...orderTokens, textToken('requestLabel', 'Request type'), textToken('requestLabelLower', 'Request type (lowercase)')],
        requiredHtmlTokens: ['orderId', 'requestLabelLower'],
    },
    'refund-processed': {
        cmsName: 'refundProcessedEmail',
        subject: 'Your Febeul Refund Has Been Processed',
        html: REFUND_PROCESSED_HTML,
        title: 'Refund Processed',
        body: '<p>Hello {{userName}},</p><p>Your refund has been processed to {{methodLabel}}.</p><h2>₹{{refundAmount}}</h2><p><strong>Order #{{orderId}}</strong></p><p>Refunds to a bank/UPI account may take a few business days to reflect. Prepaid gateway refunds are usually visible within 5-7 business days depending on your bank.</p>',
        tokens: [...orderTokens, textToken('methodLabel', 'Refund destination')],
        requiredHtmlTokens: ['orderId', 'refundAmount', 'methodLabel'],
    },
    'support-ticket-received': {
        cmsName: 'supportTicketReceivedEmail', subject: 'We Received Your Support Ticket #{{ticketNumber}}', title: 'Support Ticket Received',
        body: '<p>Hello {{userName}},</p><p>Your support ticket <strong>#{{ticketNumber}}</strong> has been created.</p><p><strong>{{ticketSubject}}</strong></p><p>Our support team will review it and reply. You can view updates in your support account.</p>',
        button: { text: 'View Support Tickets', url: 'https://febeul.onrender.com/support' },
        tokens: [...customerTokens, textToken('ticketNumber', 'Ticket number'), textToken('ticketSubject', 'Ticket subject')], requiredHtmlTokens: ['ticketNumber'],
    },
    'luxe-activated': {
        cmsName: 'luxeActivatedEmail', subject: 'Welcome to Febeul Luxe - Your Elite Membership is Active', html: LUXE_ACTIVATED_HTML,
        title: 'Welcome to the Elite',
        body: '<p>Hello {{userName}},</p><p>Your <strong>Febeul Luxe</strong> membership is now active.</p><p>Membership valid until: <strong>{{expiryDate}}</strong></p><p>Enjoy 15 free gift wraps, priority shipping, Luxe Prive sales, and VIP support.</p>',
        button: { text: 'EXPLORE LUXE PRIVE', url: 'https://febeul.onrender.com/luxe' },
        tokens: [...customerTokens, textToken('expiryDate', 'Membership expiry date')], requiredHtmlTokens: ['userName', 'expiryDate'],
    },
    'luxe-expired': {
        cmsName: 'luxeExpiredEmail',
        subject: 'Your Febeul Luxe Membership Has Expired',
        html: LUXE_EXPIRED_HTML,
        title: 'Membership Expired',
        body: '<p><strong>LUXE MEMBER</strong></p><p>Hello, {{userName}}!</p><p>Your <strong>Febeul Luxe</strong> membership has expired, and you no longer have access to priority delivery, free gift wraps, Luxe Prive sales, and other exclusive member perks.</p><p>Renew today to pick up right where you left off.</p>',
        button: { text: 'RENEW MEMBERSHIP', url: 'https://febeul.onrender.com/luxe' },
        tokens: [...customerTokens, textToken('renewalUrl', 'Membership renewal link')],
        requiredHtmlTokens: ['userName'],
    },
};

export const isEmailTemplateCmsName = name => Object.values(DEFINITIONS).some(definition => definition.cmsName === name);

export const getEmailTemplateDefinition = (type) => {
    if (!Object.hasOwn(DEFINITIONS, type)) return null;
    return { ...EMAIL_TEMPLATE_OPTIONS.find(option => option.id === type), ...DEFINITIONS[type] };
};

export const getDefaultEmailContent = (type) => {
    if (type === 'order-confirmation') return getDefaultOrderEmailContent();
    const definition = getEmailTemplateDefinition(type);
    if (!definition) throw new Error('Unknown email template');
    const block = (id, blockType, overrides = {}) => ({ id, type: blockType, ...structuredClone(BLOCK_DEFAULTS[blockType]), ...overrides });
    const content = {
        ...getDefaultOrderEmailContent(),
        // Preserve the existing emails exactly; the visual builder also has a matching starting design.
        mode: 'html',
        subject: definition.subject,
        preheader: definition.title,
        html: definition.html || '',
        theme: { ...getDefaultOrderEmailContent().theme, accent: '#b87a7b', accentText: '#b87a7b', bodyFont: 'Helvetica', headingFont: 'Helvetica', radius: 20 },
        blocks: [
            block('logo', 'logo', { imageUrl: 'https://febeul.onrender.com/removebgLogo.png', showDivider: false }),
            block('hero', 'hero', { title: definition.title, subtitle: '', titleSize: 28 }),
            block('message', 'text', { html: definition.body, align: 'center', paddingY: 30 }),
            ...(definition.button ? [block('renew', 'button', { ...definition.button, bgColor: '#b87a7b', radius: 30 })] : []),
            block('footer', 'footer', { html: '', links: [], legal: '© {{currentYear}} Febeul. All rights reserved.' }),
        ],
    };
    if (!definition.html) content.html = renderTemplateHtml(content);
    return content;
};

export const normalizeEmailContent = (type, raw) => {
    const content = normalizeContent(raw, getDefaultEmailContent(type));
    if (type !== 'order-confirmation') {
        content.blocks = content.blocks.filter(block => !ORDER_BLOCK_TYPES.includes(block.type));
    }
    return content;
};

export const getEmailTemplateMeta = (type) => {
    const definition = getEmailTemplateDefinition(type);
    const meta = getTemplateMeta();
    return {
        ...meta,
        ...(type !== 'order-confirmation' ? {
            tokens: definition.tokens,
            orderBlockTypes: [],
            blockDefaults: Object.fromEntries(Object.entries(meta.blockDefaults).filter(([key]) => !ORDER_BLOCK_TYPES.includes(key))),
        } : {}),
        requiredHtmlTokens: definition.requiredHtmlTokens,
    };
};

export const buildEmailTokens = (type, data = {}) => {
    const hasOrder = type.startsWith('order-') || type === 'return-request' || type === 'refund-processed';
    const tokens = {
        ...EMAIL_BRAND_VALUES,
        ...(hasOrder && data.order ? buildOrderTextTokens(data.order) : {}),
        userName: data.userName || data.order?.userId?.name || data.order?.address?.name || (type.startsWith('luxe-') ? 'Luxe Member' : 'Customer'),
        customerEmail: data.customerEmail || data.order?.userId?.email || data.order?.address?.email || '',
        currentYear: String(new Date().getFullYear()),
    };
    if (type.endsWith('-otp')) Object.assign(tokens, { otp: String(data.otp || ''), expiryMinutes: '5' });
    if (hasOrder) tokens.orderId = String(data.orderId || tokens.orderId || '').slice(-8).toUpperCase();
    if (hasOrder) tokens.orderUrl = safeEmailUrl(data.orderUrl || tokens.orderUrl, 'https://febeul.onrender.com/myorders');
    if (type === 'order-shipped') Object.assign(tokens, {
        courierName: data.courierName || tokens.courierName || '', trackingNumber: data.trackingNumber || tokens.trackingNumber || '',
        trackingUrl: safeEmailUrl(data.trackingUrl || tokens.trackingUrl, tokens.orderUrl),
    });
    if (type === 'order-cancelled') tokens.cancellationReason = data.cancellationReason || tokens.cancellationReason || 'Your order was cancelled.';
    if (type === 'support-ticket-received') Object.assign(tokens, { ticketNumber: String(data.ticketNumber || ''), ticketSubject: data.ticketSubject || 'Support request' });
    if (type === 'luxe-activated') {
        const expiry = new Date(data.expiryDate);
        tokens.expiryDate = Number.isNaN(expiry.getTime()) ? 'See your membership details' : expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    }
    if (type === 'return-request') {
        tokens.requestLabel = Object.hasOwn(REQUEST_TYPE_LABEL, data.requestType) ? REQUEST_TYPE_LABEL[data.requestType] : 'Return/Refund Request';
        tokens.requestLabelLower = tokens.requestLabel.toLowerCase();
    }
    if (type === 'refund-processed') {
        tokens.refundAmount = data.amount != null ? Number(data.amount).toFixed(2) : tokens.refundAmount || '0.00';
        tokens.paymentMethod = data.method || tokens.paymentMethod || '';
        tokens.refundStatus = data.refundStatus || tokens.refundStatus || '';
        tokens.refundTransactionId = data.refundTransactionId || tokens.refundTransactionId || '';
        tokens.methodLabel = ['Razorpay', 'Stripe'].includes(tokens.paymentMethod) ? 'your original payment source' : 'your provided payout details';
    }
    if (type === 'luxe-expired') tokens.renewalUrl = 'https://febeul.onrender.com/luxe';
    return tokens;
};

export const buildSampleEmailData = () => ({
    order: { ...buildSampleOrder(), cancellation: { reason: 'Customer requested cancellation' }, refundDetails: { status: 'completed', amount: 1299, id: 'rfnd_SAMPLE123' } },
    customerEmail: 'priya@example.test',
    userName: 'Priya Sharma', orderId: '000000000000000A1B2C3D4E', requestType: 'return', amount: 1299, method: 'Razorpay',
    otp: '123456', courierName: 'Sample Courier', trackingNumber: 'SAMPLE123456', trackingUrl: 'https://febeul.onrender.com/myorders',
    orderUrl: 'https://febeul.onrender.com/order-detail/000000000000000A1B2C3D4E', cancellationReason: 'Customer requested cancellation',
    ticketNumber: '123456', ticketSubject: 'Help with my order', expiryDate: '2030-12-31T12:00:00.000Z',
});

export const renderEmailTemplate = (type, rawContent, data) => {
    const content = normalizeEmailContent(type, rawContent);
    if (type === 'order-confirmation') return renderOrderEmail(content, data);
    const tokens = buildEmailTokens(type, data);
    const htmlTokens = Object.fromEntries(Object.entries(tokens).map(([key, value]) => [key, escapeEmailHtml(value)]));
    const items = (data?.order?.items || []).map(item => Object.fromEntries(Object.entries(buildProductEmailTokens(item)).map(([key, value]) => [key, escapeEmailHtml(value)])));
    const template = content.mode === 'html' && content.html.trim() ? content.html : renderTemplateHtml(content);
    const subject = fillEmailTokens(content.subject, tokens).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return { subject: subject || fillEmailTokens(getEmailTemplateDefinition(type).subject, tokens), html: fillEmailTokens(template, htmlTokens, items) };
};

export const loadEmailContent = async (type) => {
    const definition = getEmailTemplateDefinition(type);
    if (!definition) throw new Error('Unknown email template');
    try {
        const doc = await cmsModel.findOne({ name: definition.cmsName }).lean();
        return normalizeEmailContent(type, doc?.content);
    } catch (error) {
        console.error(`Failed to load ${type} email template, falling back to default:`, error);
        return getDefaultEmailContent(type);
    }
};

export const getSavedEmail = async (type, data) => renderEmailTemplate(type, await loadEmailContent(type), data);
