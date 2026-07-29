const REQUEST_TYPE_LABEL = {
    return: 'Return Request',
    refund: 'Refund Request',
    cancellation: 'Cancellation',
    courier_return: 'Courier Return'
};

export const returnRequestCreatedEmailTemplate = (userName, orderId, requestType) => {
    const label = REQUEST_TYPE_LABEL[requestType] || 'Return/Refund Request';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${label} Received</title>
    <style>
        body { font-family: 'Raleway', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #fdf5f5; color: #333333; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(184, 122, 123, 0.1); }
        .header { background: linear-gradient(135deg, #b87a7b 0%, #e07f82 100%); padding: 40px 20px; text-align: center; }
        .header img { max-height: 60px; margin-bottom: 20px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; text-transform: uppercase; font-weight: 300; }
        .content { padding: 40px 30px; line-height: 1.6; }
        .order-badge { background-color: #fff9f9; border: 1px solid #f9aeaf; border-radius: 12px; padding: 15px 20px; margin: 20px 0; font-size: 14px; color: #b87a7b; font-weight: bold; }
        .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://febeul.onrender.com/removebgLogo.png" alt="Febeul Logo">
            <h1>${label} Received</h1>
        </div>
        <div class="content">
            <p>Hello ${userName},</p>
            <p>We've received your ${label.toLowerCase()} and it's now under review.</p>
            <div class="order-badge">Order #${orderId.toString().slice(-8).toUpperCase()}</div>
            <p>We'll email you again as soon as this is processed. You can also track its progress anytime from your Order History.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Febeul. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
};

export const refundProcessedEmailTemplate = (userName, orderId, amount, method) => {
    const methodLabel = method === 'Razorpay' ? 'your original payment source' : 'your provided payout details';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Processed</title>
    <style>
        body { font-family: 'Raleway', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #fdf5f5; color: #333333; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(184, 122, 123, 0.1); }
        .header { background: linear-gradient(135deg, #b87a7b 0%, #e07f82 100%); padding: 40px 20px; text-align: center; }
        .header img { max-height: 60px; margin-bottom: 20px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; text-transform: uppercase; font-weight: 300; }
        .content { padding: 40px 30px; line-height: 1.6; text-align: center; }
        .amount { font-size: 32px; font-weight: bold; color: #b87a7b; margin: 10px 0; }
        .order-badge { background-color: #fff9f9; border: 1px solid #f9aeaf; border-radius: 12px; padding: 15px 20px; margin: 20px 0; font-size: 14px; color: #b87a7b; font-weight: bold; display: inline-block; }
        .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://febeul.onrender.com/removebgLogo.png" alt="Febeul Logo">
            <h1>Refund Processed</h1>
        </div>
        <div class="content">
            <p>Hello ${userName},</p>
            <p>Your refund has been processed to ${methodLabel}.</p>
            <div class="amount">₹${Number(amount).toFixed(2)}</div>
            <div class="order-badge">Order #${orderId.toString().slice(-8).toUpperCase()}</div>
            <p style="margin-top: 20px;">Refunds to a bank/UPI account may take a few business days to reflect. Prepaid gateway refunds are usually visible within 5-7 business days depending on your bank.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Febeul. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
};
