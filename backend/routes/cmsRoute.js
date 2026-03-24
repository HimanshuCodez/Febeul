import express from 'express';
import { getCmsContent, updateCmsContent } from '../controllers/cmsController.js';
import adminAuth from '../middleware/adminAuth.js';

const cmsRouter = express.Router();

cmsRouter.get('/:name', getCmsContent);
cmsRouter.post('/', adminAuth, updateCmsContent);

export default cmsRouter;
