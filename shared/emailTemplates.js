export const EMAIL_TEMPLATE_OPTIONS = [
    { id: 'order-confirmation', label: 'Order Confirmation', description: 'Design the email customers receive right after placing an order.' },
    { id: 'welcome', label: 'Welcome', description: 'Design the welcome email customers receive after registering an account.' },
    { id: 'email-otp', label: 'Email Verification / Login OTP', description: 'Design the verification code email used for customer signup and email login.' },
    { id: 'password-reset-otp', label: 'Password Reset OTP', description: 'Design the password reset code email for customers and administrators.' },
    { id: 'admin-login-otp', label: 'Admin Login OTP', description: 'Design the login code email for administrators and staff.' },
    { id: 'order-shipped', label: 'Order Shipped', description: 'Design the dispatch notification with courier and tracking details.' },
    { id: 'order-delivered', label: 'Order Delivered', description: 'Design the confirmation sent when an order is delivered.' },
    { id: 'order-cancelled', label: 'Order Cancelled', description: 'Design the notification sent when an order is cancelled.' },
    { id: 'return-request', label: 'Return / Refund Request Received', description: 'Design the confirmation sent when a return, refund, cancellation or courier return request is received.' },
    { id: 'refund-processed', label: 'Refund Completed', description: 'Design the email customers receive when their refund has been processed.' },
    { id: 'support-ticket-received', label: 'Support Ticket Received', description: 'Design the receipt sent when a support ticket is created.' },
    { id: 'luxe-activated', label: 'Luxe Membership Activated', description: 'Design the confirmation sent when Luxe membership is purchased or granted.' },
    { id: 'luxe-expired', label: 'Luxe Membership Expired', description: 'Design the email customers receive when their Luxe membership expires.' },
];

export const EMAIL_BRAND_TOKENS = [
    ['supportEmail', 'Support email'], ['supportUrl', 'Raise a ticket link'],
    ['instagramUrl', 'Instagram link'], ['facebookUrl', 'Facebook link'], ['brandTagline', 'Brand tagline'],
].map(([key, label]) => ({ key, label, group: 'text' }));

export const EMAIL_PRODUCT_TOKENS = [
    ['productName', 'Product name'], ['productImage', 'Product image URL'],
    ['productSku', 'Product SKU'], ['productSize', 'Product size'], ['productColor', 'Product colour'],
    ['productQuantity', 'Product quantity'], ['productPrice', 'Product unit price'], ['productUrl', 'Product page URL'],
].map(([key, label]) => ({ key, label, group: 'product', hint: 'Use inside a repeating products block: {{#items}} … {{/items}}.' }));

export const EMAIL_PRODUCT_LOOP = {
    key: 'itemsLoop', label: 'Repeating products block', group: 'layout',
    hint: 'Repeats for every product in the order. Optional images, sizes and colours are hidden when unavailable.',
    insertText: '{{#items}}\n<div style="padding:16px 0;border-bottom:1px solid #eeeeee;">\n{{#if productImage}}<img src="{{productImage}}" alt="{{productName}}" width="80" style="max-width:100%;height:auto;">{{/if}}\n<p><strong>{{productName}}</strong></p>\n{{#if productSku}}<p>SKU: {{productSku}}</p>{{/if}}\n{{#if productSize}}<p>Size: {{productSize}}</p>{{/if}}\n{{#if productColor}}<p>Colour: {{productColor}}</p>{{/if}}\n<p>Quantity: {{productQuantity}} · Unit price: ₹{{productPrice}}</p>\n{{#if productUrl}}<a href="{{productUrl}}">View product</a>{{/if}}\n</div>\n{{/items}}',
};
