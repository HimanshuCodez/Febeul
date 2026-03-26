import cmsModel from '../models/cmsModel.js';
import { v2 as cloudinary } from 'cloudinary';

// @desc    Get CMS content by name
// @route   GET /api/cms/:name
// @access  Public
const getCmsContent = async (req, res) => {
    try {
        const content = await cmsModel.findOne({ name: req.params.name });
        if (content) {
            res.json({ success: true, content: content.content });
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

        const updatedContent = await cmsModel.findOneAndUpdate(
            { name },
            { content },
            { new: true, upsert: true, runValidators: true }
        );

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

        const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' });
        res.json({ success: true, imageUrl: result.secure_url });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error uploading image', error });
    }
};

export { getCmsContent, updateCmsContent, uploadCmsImage };
