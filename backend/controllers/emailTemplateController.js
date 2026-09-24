import cmsModel from '../models/cmsModel.js';
import orderModel from '../models/orderModel.js';
import { sendEmail } from '../utils/sendEmail.js';
import {
    ORDER_EMAIL_CMS_NAME,
    getDefaultOrderEmailContent,
    getTemplateMeta,
    normalizeContent,
    renderOrderEmail,
    renderTemplateHtml,
    buildSampleOrder,
} from '../utils/orderEmailTemplate.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateContent = (content) => {
    if (!content || typeof content !== 'object') return 'Template content is required.';
    if (content.mode === 'html' && (typeof content.html !== 'string' || !content.html.trim())) return 'HTML template cannot be empty.';
    if (typeof content.html === 'string' && content.html.length > 90000) return 'HTML template is too large (max ~90 KB).';
    if (Array.isArray(content.blocks) && content.blocks.length > 80) return 'Too many blocks (max 80).';
    return null;
};

const resolvePreviewOrder = async (source) => {
    if (source === 'latest') {
        const order = await orderModel
            .findOne({ 'items.0': { $exists: true }, 'address.name': { $exists: true } })
            .sort({ date: -1 })
            .populate('userId');
        if (order) return { order, source: 'latest' };
    }
    return { order: buildSampleOrder(), source: 'sample' };
};

// GET /api/email-template/order-confirmation
const getOrderEmailTemplate = async (req, res) => {
    try {
        const doc = await cmsModel.findOne({ name: ORDER_EMAIL_CMS_NAME }).lean();
        res.json({
            success: true,
            content: normalizeContent(doc?.content),
            isDefault: !doc,
            creator: doc?.creator || null,
            updatedAt: doc?.updatedAt || null,
            defaultContent: getDefaultOrderEmailContent(),
            meta: getTemplateMeta(),
        });
    } catch (error) {
        console.error('Error loading order email template:', error);
        res.status(500).json({ success: false, message: 'Failed to load email template' });
    }
};

// POST /api/email-template/order-confirmation
const saveOrderEmailTemplate = async (req, res) => {
    try {
        const { content } = req.body;
        const error = validateContent(content);
        if (error) return res.status(400).json({ success: false, message: error });

        const doc = await cmsModel.findOneAndUpdate(
            { name: ORDER_EMAIL_CMS_NAME },
            {
                content: normalizeContent(content),
                creator: { name: req.userName || 'Admin', email: req.userEmail || '', role: req.role || 'admin' },
            },
            { new: true, upsert: true, runValidators: true },
        );
        res.json({ success: true, message: 'Email template saved', content: doc.content, creator: doc.creator, updatedAt: doc.updatedAt });
    } catch (error) {
        console.error('Error saving order email template:', error);
        res.status(500).json({ success: false, message: 'Failed to save email template' });
    }
};

// DELETE /api/email-template/order-confirmation
const resetOrderEmailTemplate = async (req, res) => {
    try {
        await cmsModel.deleteOne({ name: ORDER_EMAIL_CMS_NAME });
        res.json({ success: true, message: 'Template reset to default', content: getDefaultOrderEmailContent() });
    } catch (error) {
        console.error('Error resetting order email template:', error);
        res.status(500).json({ success: false, message: 'Failed to reset email template' });
    }
};

// POST /api/email-template/order-confirmation/preview
const previewOrderEmailTemplate = async (req, res) => {
    try {
        const { content, source } = req.body;
        const error = validateContent(content);
        if (error) return res.status(400).json({ success: false, message: error });

        const resolved = await resolvePreviewOrder(source);
        const { subject, html } = renderOrderEmail(content, resolved.order);
        // Unfilled builder output, so the admin can switch to HTML mode starting from the current design.
        const template = renderTemplateHtml(content);
        res.json({ success: true, subject, html, template, source: resolved.source });
    } catch (error) {
        console.error('Error rendering order email preview:', error);
        res.status(500).json({ success: false, message: 'Failed to render preview' });
    }
};

// POST /api/email-template/order-confirmation/test
const sendTestOrderEmail = async (req, res) => {
    try {
        const { content, to, source } = req.body;
        if (!to || !EMAIL_RE.test(String(to).trim())) {
            return res.status(400).json({ success: false, message: 'Enter a valid email address' });
        }
        const error = validateContent(content);
        if (error) return res.status(400).json({ success: false, message: error });

        const resolved = await resolvePreviewOrder(source);
        const { subject, html } = renderOrderEmail(content, resolved.order);
        const result = await sendEmail(String(to).trim(), `[TEST] ${subject}`, html);
        if (!result.success) return res.status(502).json({ success: false, message: 'Email provider rejected the test email' });
        res.json({ success: true, message: `Test email sent to ${String(to).trim()}` });
    } catch (error) {
        console.error('Error sending test order email:', error);
        res.status(500).json({ success: false, message: 'Failed to send test email' });
    }
};

export {
    getOrderEmailTemplate,
    saveOrderEmailTemplate,
    resetOrderEmailTemplate,
    previewOrderEmailTemplate,
    sendTestOrderEmail,
};
