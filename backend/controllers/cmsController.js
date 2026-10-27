import cmsModel from '../models/cmsModel.js';
import { v2 as cloudinary } from 'cloudinary';
import { invalidateReturnSettingsCache } from '../utils/returnStatus.js';
import { DEFAULT_SOCIAL_SETTINGS, validateSocialSettings } from '../utils/socialSettings.js';
import { DEFAULT_LUXE_PAGE_CONTENT, validateLuxePageContent } from '../utils/luxePageContent.js';
import { getPublicGiftOffer, validateGiftOfferForSave } from '../utils/homeGiftOffer.js';

// @desc    Get CMS content by name
// @route   GET /api/cms/:name
// @access  Public
const getCmsContent = async (req, res) => {
    try {
        if (['orderConfirmationEmail', 'welcomeEmail', 'returnRequestEmail', 'refundProcessedEmail', 'luxeExpiredEmail'].includes(req.params.name)) return res.status(404).json({ success: false, message: 'Content not found' });
        const content = await cmsModel.findOne({ name: req.params.name });
        if (req.params.name === 'homeGiftOffer') {
            res.set('Cache-Control', 'no-store');
            return res.json({ success: true, content: await getPublicGiftOffer(content?.content) });
        }
        if (content) {
            res.json({ success: true, content: content.content });
        } else if (req.params.name === 'socialSettings') {
            res.json({ success: true, content: DEFAULT_SOCIAL_SETTINGS });
        } else if (req.params.name === 'luxePage') {
            res.json({ success: true, content: DEFAULT_LUXE_PAGE_CONTENT });
        } else {
            res.json({ success: false, message: 'Content not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update CMS content
// @route   POST /api/cms
// @access  Private/Admin
const updateCmsContent = async (req, res) => {
    try {
        const { name, content } = req.body;
        if (typeof name !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(name)) return res.status(400).json({ success: false, message: 'Invalid content name.' });
        if (['orderConfirmationEmail', 'welcomeEmail', 'returnRequestEmail', 'refundProcessedEmail', 'luxeExpiredEmail'].includes(name)) return res.status(403).json({ success: false, message: 'Use the email template endpoint.' });
        let savedContent = content;
        if (name === 'homeGiftOffer') {
            try {
                savedContent = await validateGiftOfferForSave(content);
            } catch (error) {
                return res.status(400).json({ success: false, message: "Unable to complete request." });
            }
        }
        if (name === 'socialSettings') {
            try {
                savedContent = validateSocialSettings(content);
            } catch (error) {
                return res.status(400).json({ success: false, message: "Unable to complete request." });
            }
        }
        if (name === 'luxePage') {
            try {
                savedContent = validateLuxePageContent(content);
            } catch (error) {
                return res.status(400).json({ success: false, message: "Unable to complete request." });
            }
        }

        const updatedContent = await cmsModel.findOneAndUpdate(
            { name },
            { 
                content: savedContent,
                creator: {
                    name: req.userName || 'Admin',
                    email: req.userEmail || '',
                    role: req.role || 'admin'
                }
            },
            { new: true, upsert: true, runValidators: true }
        );

        // The return thresholds are read from siteSettings behind a short cache;
        // drop it so a changed threshold re-classifies every return on the very
        // next request rather than up to 30s later.
        if (name === 'siteSettings') invalidateReturnSettingsCache();

        res.status(201).json({ success: true, content: updatedContent.content });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Error updating CMS content' });
    }
};

// @desc    Upload image for CMS
// @route   POST /api/cms/upload
// @access  Private/Admin
const uploadCmsImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Keep the original GIF and all frames; do not flatten it into a still image.
        const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto', timeout: 120000 });
        res.json({ success: true, imageUrl: result.secure_url });
    } catch (error) {
        const providerMessage = String(error?.message || error?.error?.message || '');
        console.error('CMS media upload failed', { code: error?.http_code });
        if (error?.http_code === 413 || /file size too large|file too large|exceeds.*(?:size|limit)|maximum file size/i.test(providerMessage)) {
            return res.status(413).json({ success: false, code: 'MEDIA_PROVIDER_SIZE_LIMIT', message: 'Cloudinary rejected this file because it exceeds your account’s upload limit. Reduce the file size or increase the upload limit in your Cloudinary account.' });
        }
        if (error?.http_code === 499 || error?.code === 'ETIMEDOUT') return res.status(504).json({ success: false, message: 'The media upload timed out. Please retry with a smaller file or a stable connection.' });
        res.status(500).json({ success: false, message: 'Error uploading media. Please try again.' });
    }
};

export { getCmsContent, updateCmsContent, uploadCmsImage };
