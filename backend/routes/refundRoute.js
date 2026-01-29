import express from 'express';
import { requestRefund } from '../controllers/refundController.js';
import auth from '../middleware/auth.js';
import upload from '../middleware/multer.js';

const refundRouter = express.Router();

// The frontend sends files with the field name 'images'. We expect up to 4.
refundRouter.post('/request', auth, upload.array('images', 4), requestRefund);

export default refundRouter;
