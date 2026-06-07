import express from 'express';
<<<<<<< HEAD
import { requestRefund, approveRefund } from '../controllers/refundController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
=======
import { requestRefund } from '../controllers/refundController.js';
import auth from '../middleware/auth.js';
>>>>>>> 848107dd672c163c17866cd57dff9afa36823bef
import upload from '../middleware/multer.js';

const refundRouter = express.Router();

// The frontend sends files with the field name 'images'. We expect up to 4.
refundRouter.post('/request', auth, upload.array('images', 4), requestRefund);

<<<<<<< HEAD
// Admin Approval Route
refundRouter.post('/approve', adminAuth, approveRefund);

=======
>>>>>>> 848107dd672c163c17866cd57dff9afa36823bef
export default refundRouter;
