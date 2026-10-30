import { getSavedEmail } from './emailTemplates.js';
import { sendEmail } from './sendEmail.js';

export const sendTemplateEmail = async (type, to, data) => {
    try {
        const { subject, html } = await getSavedEmail(type, { ...data, customerEmail: data?.customerEmail || to });
        return await sendEmail(to, subject, html);
    } catch (error) {
        console.error(`Error sending ${type} email:`, error);
        return { success: false, message: 'Error sending email' };
    }
};
