export const luxeEmailTemplate = (userName, expiryDate) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Febeul Luxe</title>
    <style>
        body {
            font-family: 'Raleway', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #fdf5f5;
            color: #333333;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(184, 122, 123, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #b87a7b 0%, #e07f82 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .header img {
            max-height: 60px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            letter-spacing: 2px;
            text-transform: uppercase;
            font-weight: 300;
        }
        .content {
            padding: 40px 30px;
            line-height: 1.6;
        }
        .welcome-text {
            font-size: 20px;
            color: #b87a7b;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .benefit-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }
        .benefit-item {
            background-color: #fff9f9;
            padding: 15px;
            border-radius: 12px;
            border: 1px solid #f9aeaf;
            text-align: center;
        }
        .benefit-icon {
            font-size: 24px;
            margin-bottom: 10px;
        }
        .benefit-title {
            font-weight: bold;
            font-size: 12px;
            color: #b87a7b;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .cta-button {
            display: inline-block;
            background-color: #b87a7b;
            color: #ffffff;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            letter-spacing: 1px;
            margin-top: 20px;
            transition: background-color 0.3s;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999999;
        }
        .membership-badge {
            background-color: #fdf5f5;
            color: #b87a7b;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            display: inline-block;
            margin-bottom: 20px;
            border: 1px solid #b87a7b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://febeul.onrender.com/removebgLogo.png" alt="Febeul Logo">
            <h1>Welcome to the Elite</h1>
        </div>
        <div class="content" style="text-align: center;">
            <div class="membership-badge">LUXE MEMBER</div>
            <p class="welcome-text">Hello, ${userName}!</p>
            <p>We are delighted to welcome you to <strong>Febeul Luxe</strong>. Your membership is now active, unlocking a world of exclusive benefits and premium experiences curated just for you.</p>
            
            <div style="margin: 30px 0; border-top: 1px solid #eeeeee; border-bottom: 1px solid #eeeeee; padding: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #666;">Membership valid until:</p>
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #b87a7b;">${new Date(expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            <div class="benefit-grid">
                <div class="benefit-item">
                    <div class="benefit-icon">🎁</div>
                    <div class="benefit-title">15 Free Gift Wraps</div>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">🚚</div>
                    <div class="benefit-title">Priority Shipping</div>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">✨</div>
                    <div class="benefit-title">Luxe Prive Sales</div>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">📞</div>
                    <div class="benefit-title">VIP Support</div>
                </div>
            </div>

            <p>Ready to experience the elite? Explore your exclusive collections and enjoy your premium perks today.</p>
            
            <a href="https://febeul.onrender.com/luxe" class="cta-button">EXPLORE LUXE PRIVE</a>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Febeul. All rights reserved.</p>
            <p>You received this email because you joined Febeul Luxe.</p>
        </div>
    </div>
</body>
</html>
    `;
};
