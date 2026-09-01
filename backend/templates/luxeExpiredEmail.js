export const luxeExpiredEmailTemplate = (userName) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Febeul Luxe Membership Has Expired</title>
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
            <h1>Membership Expired</h1>
        </div>
        <div class="content" style="text-align: center;">
            <div class="membership-badge">LUXE MEMBER</div>
            <p class="welcome-text">Hello, ${userName}!</p>
            <p>Your <strong>Febeul Luxe</strong> membership has expired, and you no longer have access to priority delivery, free gift wraps, Luxe Prive sales, and other exclusive member perks.</p>
            <p>Renew today to pick up right where you left off.</p>

            <a href="https://febeul.onrender.com/luxe" class="cta-button">RENEW MEMBERSHIP</a>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Febeul. All rights reserved.</p>
            <p>You received this email because your Febeul Luxe membership expired.</p>
        </div>
    </div>
</body>
</html>
    `;
};
