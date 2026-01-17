import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail', // Or your preferred SMTP service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, htmlContent) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to', to);
        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error('Error sending email to', to, ':', error);
        return { success: false, message: 'Error sending email' };
    }
};

export { sendEmail };
