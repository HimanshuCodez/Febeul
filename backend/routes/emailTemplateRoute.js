import express from 'express';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';
import { uploadCmsImage } from '../controllers/cmsController.js';
import {
    getOrderEmailTemplate,
    saveOrderEmailTemplate,
    resetOrderEmailTemplate,
    previewOrderEmailTemplate,
    sendTestOrderEmail,
} from '../controllers/emailTemplateController.js';

const emailTemplateRouter = express.Router();

emailTemplateRouter.get('/order-confirmation', adminAuth, getOrderEmailTemplate);
emailTemplateRouter.post('/order-confirmation', adminAuth, saveOrderEmailTemplate);
emailTemplateRouter.delete('/order-confirmation', adminAuth, resetOrderEmailTemplate);
emailTemplateRouter.post('/order-confirmation/preview', adminAuth, previewOrderEmailTemplate);
emailTemplateRouter.post('/order-confirmation/test', adminAuth, sendTestOrderEmail);
emailTemplateRouter.post('/upload', adminAuth, upload.single('image'), uploadCmsImage);

export default emailTemplateRouter;
