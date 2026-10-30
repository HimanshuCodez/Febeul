import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMAIL_TEMPLATE_OPTIONS, EMAIL_PRODUCT_LOOP } from '../../shared/emailTemplates.js';
import { buildOrderTextTokens, buildProductEmailTokens, fillEmailTokens } from '../utils/emailTokens.js';
import { buildOrderEmailTokens, buildSampleOrder, renderOrderEmail } from '../utils/orderEmailTemplate.js';
import { getEmailTemplateMeta, getDefaultEmailContent, renderEmailTemplate, buildSampleEmailData } from '../utils/emailTemplates.js';

const guideTags = 'billingAddressName orderId orderDate invoiceNumber paymentMethod totalAmount subtotal shipping shippingAddressCity shippingAddressState shippingAddressPhone currentYear customerEmail shippingAddress shippingAddressLine1 shippingAddressLandmark shippingAddressPincode paymentStatus productName productImage productSku productSize productColor productQuantity productPrice productUrl discount couponCode taxAmount estimatedDeliveryDate courierName trackingNumber trackingUrl orderStatus cancellationReason refundAmount refundStatus refundTransactionId'.split(' ');
const orderTypes = ['order-confirmation', 'order-shipped', 'order-delivered', 'order-cancelled', 'return-request', 'refund-processed'];
const htmlContent = html => ({ mode: 'html', html, subject: 'Order {{orderId}} for {{customerEmail}}' });

test('all guide tags are available on order templates without exposing order-only tags to other templates', () => {
    for (const type of EMAIL_TEMPLATE_OPTIONS.map(option => option.id)) {
        const tags = getEmailTemplateMeta(type).tokens.map(token => token.key);
        assert.equal(tags.length, new Set(tags).size, type);
        for (const key of ['customerEmail', 'supportEmail', 'supportUrl', 'instagramUrl', 'facebookUrl', 'brandTagline']) assert.ok(tags.includes(key), `${type}: ${key}`);
        if (orderTypes.includes(type)) for (const key of guideTags) assert.ok(tags.includes(key), `${type}: ${key}`);
        else assert.ok(!tags.includes('productPrice'), type);
    }
});

test('address, payment, totals, delivery and refund tags use recorded order values', () => {
    const order = {
        ...buildSampleOrder(), orderItemId: '87654321', date: Date.UTC(2026, 9, 30, 12),
        orderStatus: 'Shipped', cgstAmount: 12.34, sgstAmount: 12.34, igstAmount: 0,
        cancellation: { reason: 'Changed plans' },
        refundDetails: { status: 'processing', amount: 125.5, id: 'rfnd_123' },
    };
    const tokens = buildOrderTextTokens(order);
    assert.equal(tokens.orderId, '87654321');
    assert.equal(tokens.orderDate, '30 Oct 2026');
    assert.equal(tokens.customerEmail, 'priya@example.test');
    assert.equal(tokens.shippingAddressLine1, '221B, Rose Apartments, Bandra West');
    assert.equal(tokens.shippingAddressLandmark, 'Near Carter Road');
    assert.equal(tokens.shippingAddressPincode, '400050');
    for (const text of ['Priya Sharma', 'Rose Apartments', 'Near Carter Road', 'Mumbai', 'Maharashtra', '400050', 'India']) assert.ok(tokens.shippingAddress.includes(text));
    assert.equal(tokens.paymentStatus, 'Paid');
    assert.equal(tokens.subtotal, '3097.00');
    assert.equal(tokens.discount, '200.00');
    assert.equal(tokens.couponCode, 'WELCOME200');
    assert.equal(tokens.totalAmount, '2946.00');
    assert.equal(tokens.taxAmount, '24.68');
    assert.equal(tokens.estimatedDeliveryDate, '31 Dec 2030');
    assert.equal(tokens.courierName, 'Sample Courier');
    assert.equal(tokens.trackingNumber, 'SAMPLE123456');
    assert.equal(tokens.orderStatus, 'Shipped');
    assert.equal(tokens.cancellationReason, 'Changed plans');
    assert.equal(tokens.refundAmount, '125.50');
    assert.equal(tokens.refundStatus, 'processing');
    assert.equal(tokens.refundTransactionId, 'rfnd_123');
    assert.match(buildOrderEmailTokens(order).gstRows, /₹12\.34/);
    order.refundDetails.returnTracking = { refundUtr: 'BANK-UTR-123' };
    assert.equal(buildOrderTextTokens(order).refundTransactionId, 'BANK-UTR-123');
});

test('product loops repeat all item snapshots, escape their content and resolve safe links', () => {
    const order = buildSampleOrder();
    order.items[0].name = '<Silk> & "Satin"';
    order.items[0].image = 'https://images.example.test/a.png?one=1&two=2';
    const html = '{{productName}}<main>{{#items}}<article><img src="{{productImage}}" alt="{{productName}}"><b>{{productName}}</b><p>{{productSku}} / {{productSize}} / {{productColor}} / {{productQuantity}} / {{productPrice}}</p><a href="{{productUrl}}">Product</a></article>{{/items}}</main>';
    for (const type of orderTypes) {
        const data = type === 'order-confirmation' ? order : { ...buildSampleEmailData(), order };
        const email = renderEmailTemplate(type, htmlContent(html), data);
        assert.equal((email.html.match(/<article>/g) || []).length, 2, type);
        assert.match(email.html, /&lt;Silk&gt; &amp; &quot;Satin&quot;/);
        assert.match(email.html, /one=1&amp;two=2/);
        assert.match(email.html, /FB-SND-BL-M \/ M \/ Blush \/ 1 \/ 1299.00/);
        assert.match(email.html, /FB-LBS-IV-S \/ S \/ Ivory \/ 2 \/ 899.00/);
        assert.match(email.html, /\/product\/000000000000000000000002/);
        assert.ok(email.html.startsWith('<main>'));
        assert.doesNotMatch(email.html, /\{\{/);
    }
});

test('optional data stays empty and conditional rows/images disappear, including invalid dates and URLs', () => {
    const order = { ...buildSampleOrder(), shiprocket: { edd: 'invalid', trackingUrl: 'javascript:alert(1)' }, refundDetails: { status: 'none' } };
    delete order.address.landmark;
    order.items[0].image = 'javascript:alert(1)';
    const tokens = buildOrderTextTokens(order);
    for (const key of ['estimatedDeliveryDate', 'courierName', 'trackingNumber', 'trackingUrl', 'refundAmount', 'refundStatus', 'refundTransactionId', 'shippingAddressLandmark']) assert.equal(tokens[key], '', key);
    const email = renderOrderEmail(htmlContent('{{#if trackingNumber}}<p>Tracking: {{trackingNumber}}</p>{{/if}}{{#if refundTransactionId}}<p>Refund: {{refundTransactionId}}</p>{{/if}}' + EMAIL_PRODUCT_LOOP.insertText + '{{unknownTag}}'), order);
    assert.doesNotMatch(email.html, /Tracking:|Refund:|javascript:|\{\{/);
    assert.equal((email.html.match(/<img /g) || []).length, 1);
    assert.equal(buildOrderTextTokens({ date: null }).orderDate, '');
    assert.equal(buildProductEmailTokens({}).productUrl, '');
});

test('COD, prepaid pending and failed payment labels reflect payment state', () => {
    for (const [changes, expected] of [
        [{ paymentMethod: 'COD', payment: false }, 'Cash on delivery'],
        [{ paymentMethod: 'Razorpay', payment: false }, 'Pending'],
        [{ paymentMethod: 'Stripe', payment: false, orderStatus: 'Failed' }, 'Failed'],
        [{ paymentMethod: 'COD', payment: true }, 'Paid'],
    ]) assert.equal(buildOrderTextTokens({ ...buildSampleOrder(), ...changes }).paymentStatus, expected);
});

test('visual items include every product and combined discounts are deducted only once', () => {
    const order = buildSampleOrder();
    order.items = [{ ...order.items[0], price: 500, quantity: 1, discountAmount: 100 }];
    order.couponDiscount = 150;
    order.orderTotal = 350;
    const tokens = buildOrderEmailTokens(order);
    assert.match(tokens.itemRows, /₹350\.00/);
    assert.doesNotMatch(tokens.itemRows, /₹250\.00/);
    const email = renderOrderEmail(null, order);
    for (const value of ['Size: M', 'Colour: Blush', 'FB-SND-BL-M', 'View product']) assert.ok(email.html.includes(value));
    assert.doesNotMatch(email.html, /\{\{/);
});

test('conditional parsing nests safely and never evaluates tokens introduced by customer values', () => {
    const rendered = fillEmailTokens('{{#if a}}A{{#if b}}B{{/if}}{{#if c}}C{{/if}}{{/if}} {{#if\tb}}D{{/if}} {{userName}} {{constructor}}', { a: 'yes', b: 'yes', userName: '{{#items}}CUSTOMER{{/items}}' }, [{ productName: 'Item' }]);
    assert.equal(rendered, 'AB D {{#items}}CUSTOMER{{/items}} ');
    assert.equal(fillEmailTokens('{{#items}}{{productName}}{{#items}}nested{{/items}}{{/items}}', {}, [{ productName: 'A' }, { productName: 'B' }]), 'AB');
});

test('brand tags and customer email render in every template, including subjects and builder links', () => {
    for (const type of EMAIL_TEMPLATE_OPTIONS.map(option => option.id)) {
        const data = type === 'order-confirmation' ? buildSampleOrder() : buildSampleEmailData();
        const email = renderEmailTemplate(type, htmlContent('<p>{{customerEmail}} {{brandTagline}} {{supportEmail}}</p><a href="{{supportUrl}}">Support</a>'), data);
        assert.match(email.html, /priya@example.test Elegance - Douceur - Amour support@febeul.com/);
        assert.match(email.html, /href="https:\/\/www.febeul.com\/support"/);
        assert.doesNotMatch(email.subject, /\{\{/);
        const content = { ...getDefaultEmailContent(type), mode: 'builder', blocks: [{ id: 'support', type: 'button', text: 'Support', url: '{{supportUrl}}' }] };
        assert.match(renderEmailTemplate(type, content, data).html, /href="https:\/\/www.febeul.com\/support"/);
    }
});
