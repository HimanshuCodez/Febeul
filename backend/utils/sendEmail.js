import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, htmlContent) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'noreply@febeul.com', // Using a consistent 'from' address
            to: to,
            subject: subject,
            html: htmlContent,
        });

        if (error) {
            console.error('Error sending email to', to, ':', error);
            return { success: false, message: 'Error sending email' };
        }

        console.log('Email sent successfully to', to, ':', data);
        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error('Caught an exception sending email to', to, ':', error);
        return { success: false, message: 'Error sending email' };
    }
};

export { sendEmail };
