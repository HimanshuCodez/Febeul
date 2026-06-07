import express from 'express';
import { getCmsContent, updateCmsContent, uploadCmsImage } from '../controllers/cmsController.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';

const cmsRouter = express.Router();

cmsRouter.get('/:name', getCmsContent);
cmsRouter.post('/', adminAuth, updateCmsContent);
cmsRouter.post('/upload', adminAuth, upload.single('image'), uploadCmsImage);

export default cmsRouter;
