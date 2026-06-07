import express from 'express';
import { requestRefund, approveRefund } from '../controllers/refundController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';

const refundRouter = express.Router();

// The frontend sends files with the field name 'images'. We expect up to 4.
refundRouter.post('/request', auth, upload.array('images', 4), requestRefund);

// Admin Approval Route
refundRouter.post('/approve', adminAuth, approveRefund);

export default refundRouter;
