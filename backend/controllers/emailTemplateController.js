import cmsModel from '../models/cmsModel.js';
import orderModel from '../models/orderModel.js';
import { sendEmail } from '../utils/sendEmail.js';
import {
    getEmailTemplateDefinition,
    getDefaultEmailContent,
    getEmailTemplateMeta,
    normalizeEmailContent,
    renderEmailTemplate,
    buildSampleEmailData,
} from '../utils/emailTemplates.js';
import {
    renderTemplateHtml,
    buildSampleOrder,
} from '../utils/orderEmailTemplate.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateContent = (content) => {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return 'Template content is required.';
    if (!['builder', 'html'].includes(content.mode)) return 'Choose visual builder or HTML mode.';
    if (content.mode === 'html' && (typeof content.html !== 'string' || !content.html.trim())) return 'HTML template cannot be empty.';
    if (typeof content.html === 'string' && content.html.length > 90000) return 'HTML template is too large (max ~90 KB).';
    if (Array.isArray(content.blocks) && content.blocks.length > 80) return 'Too many blocks (max 80).';
    return null;
};

const resolvePreviewData = async (type, source) => {
    if (type !== 'order-confirmation') return { data: buildSampleEmailData(), source: 'sample' };
    if (source === 'latest') {
        const order = await orderModel
            .findOne({ 'items.0': { $exists: true }, 'address.name': { $exists: true } })
            .sort({ date: -1 })
            .populate('userId');
        if (order) return { data: order, source: 'latest' };
    }
    return { data: buildSampleOrder(), source: 'sample' };
};

const requireEmailTemplate = (req, res, next) => {
    const definition = getEmailTemplateDefinition(req.params.type);
    if (!definition) return res.status(404).json({ success: false, message: 'Unknown email template' });
    req.emailTemplate = definition;
    next();
};

// GET /api/email-template/:type
const getEmailTemplate = async (req, res) => {
    try {
        const doc = await cmsModel.findOne({ name: req.emailTemplate.cmsName }).lean();
        res.json({
            success: true,
            content: normalizeEmailContent(req.params.type, doc?.content),
            isDefault: !doc,
            creator: doc?.creator || null,
            updatedAt: doc?.updatedAt || null,
            defaultContent: getDefaultEmailContent(req.params.type),
            meta: getEmailTemplateMeta(req.params.type),
        });
    } catch (error) {
        console.error('Error loading email template:', error);
        res.status(500).json({ success: false, message: 'Failed to load email template' });
    }
};

// POST /api/email-template/:type
const saveEmailTemplate = async (req, res) => {
    try {
        const { content } = req.body;
        const error = validateContent(content);
        if (error) return res.status(400).json({ success: false, message: error });

        const doc = await cmsModel.findOneAndUpdate(
            { name: req.emailTemplate.cmsName },
            {
                content: normalizeEmailContent(req.params.type, content),
                creator: { name: req.userName || 'Admin', email: req.userEmail || '', role: req.role || 'admin' },
            },
            { new: true, upsert: true, runValidators: true },
        );
        res.json({ success: true, message: 'Email template saved', content: doc.content, creator: doc.creator, updatedAt: doc.updatedAt });
    } catch (error) {
        console.error('Error saving email template:', error);
        res.status(500).json({ success: false, message: 'Failed to save email template' });
    }
};

// DELETE /api/email-template/:type
const resetEmailTemplate = async (req, res) => {
    try {
        await cmsModel.deleteOne({ name: req.emailTemplate.cmsName });
        res.json({ success: true, message: 'Template reset to default', content: getDefaultEmailContent(req.params.type) });
    } catch (error) {
        console.error('Error resetting email template:', error);
        res.status(500).json({ success: false, message: 'Failed to reset email template' });
    }
};

// POST /api/email-template/:type/preview
const previewEmailTemplate = async (req, res) => {
    try {
        const { content, source } = req.body;
        const error = validateContent(content);
        if (error) return res.status(400).json({ success: false, message: error });

        const resolved = await resolvePreviewData(req.params.type, source);
        const normalized = normalizeEmailContent(req.params.type, content);
        const { subject, html } = renderEmailTemplate(req.params.type, normalized, resolved.data);
        // Unfilled builder output, so the admin can switch to HTML mode starting from the current design.
        const template = renderTemplateHtml(normalized);
        res.json({ success: true, subject, html, template, source: resolved.source });
    } catch (error) {
        console.error('Error rendering email preview:', error);
        res.status(500).json({ success: false, message: 'Failed to render preview' });
    }
};

// POST /api/email-template/:type/test
const sendTestEmail = async (req, res) => {
    try {
        const { content, to, source } = req.body;
        if (!to || !EMAIL_RE.test(String(to).trim())) {
            return res.status(400).json({ success: false, message: 'Enter a valid email address' });
        }
        const error = validateContent(content);
        if (error) return res.status(400).json({ success: false, message: error });

        const resolved = await resolvePreviewData(req.params.type, source);
        const { subject, html } = renderEmailTemplate(req.params.type, content, resolved.data);
        const result = await sendEmail(String(to).trim(), `[TEST] ${subject}`, html);
        if (!result.success) return res.status(502).json({ success: false, message: 'Email provider rejected the test email' });
        res.json({ success: true, message: `Test email sent to ${String(to).trim()}` });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ success: false, message: 'Failed to send test email' });
    }
};

export {
    requireEmailTemplate,
    getEmailTemplate,
    saveEmailTemplate,
    resetEmailTemplate,
    previewEmailTemplate,
    sendTestEmail,
};
