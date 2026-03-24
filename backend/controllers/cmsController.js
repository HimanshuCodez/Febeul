import cmsModel from '../models/cmsModel.js';

// @desc    Get CMS content by name
// @route   GET /api/cms/:name
// @access  Public
const getCmsContent = async (req, res) => {
    try {
        const content = await cmsModel.findOne({ name: req.params.name });
        if (content) {
            res.json(content);
        } else {
            res.status(404).json({ message: 'Content not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
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

        res.status(201).json(updatedContent);
    } catch (error) {
        res.status(400).json({ message: 'Error updating CMS content', error });
    }
};

export { getCmsContent, updateCmsContent };
