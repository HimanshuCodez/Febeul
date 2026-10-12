import express from 'express';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';
import { uploadCmsImage } from '../controllers/cmsController.js';
import {
    requireEmailTemplate,
    getEmailTemplate,
    saveEmailTemplate,
    resetEmailTemplate,
    previewEmailTemplate,
    sendTestEmail,
} from '../controllers/emailTemplateController.js';

const emailTemplateRouter = express.Router();

emailTemplateRouter.post('/upload', adminAuth, upload.single('image'), uploadCmsImage);
emailTemplateRouter.get('/:type', adminAuth, requireEmailTemplate, getEmailTemplate);
emailTemplateRouter.post('/:type', adminAuth, requireEmailTemplate, saveEmailTemplate);
emailTemplateRouter.delete('/:type', adminAuth, requireEmailTemplate, resetEmailTemplate);
emailTemplateRouter.post('/:type/preview', adminAuth, requireEmailTemplate, previewEmailTemplate);
emailTemplateRouter.post('/:type/test', adminAuth, requireEmailTemplate, sendTestEmail);

export default emailTemplateRouter;
