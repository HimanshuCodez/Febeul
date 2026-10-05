import cmsModel from '../models/cmsModel.js';
import { v2 as cloudinary } from 'cloudinary';
import { invalidateReturnSettingsCache } from '../utils/returnStatus.js';
import { DEFAULT_SOCIAL_SETTINGS, validateSocialSettings } from '../utils/socialSettings.js';
import { DEFAULT_LUXE_PAGE_CONTENT, validateLuxePageContent } from '../utils/luxePageContent.js';

// @desc    Get CMS content by name
// @route   GET /api/cms/:name
// @access  Public
const getCmsContent = async (req, res) => {
    try {
        const content = await cmsModel.findOne({ name: req.params.name });
        if (content) {
            res.json({ success: true, content: content.content, creator: content.creator });
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
        let savedContent = content;
        if (name === 'socialSettings') {
            try {
                savedContent = validateSocialSettings(content);
            } catch (error) {
                return res.status(400).json({ success: false, message: error.message });
            }
        }
        if (name === 'luxePage') {
            try {
                savedContent = validateLuxePageContent(content);
            } catch (error) {
                return res.status(400).json({ success: false, message: error.message });
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
        res.status(400).json({ success: false, message: 'Error updating CMS content', error });
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

        const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto' });
        res.json({ success: true, imageUrl: result.secure_url });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error uploading image', error });
    }
};

export { getCmsContent, updateCmsContent, uploadCmsImage };
