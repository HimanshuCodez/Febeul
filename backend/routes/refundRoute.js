import express from 'express';
import { requestRefund, approveRefund, rejectRefund, cancelReturnRequest, getRazorpaySummary, getRazorpayTransactions } from '../controllers/refundController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';

const refundRouter = express.Router();

// The frontend sends files with the field name 'images'. We expect up to 4.
refundRouter.post('/request', auth, upload.array('images', 4), requestRefund);
refundRouter.post('/cancel-request', auth, cancelReturnRequest);

// Admin Approval/Rejection Routes
refundRouter.post('/approve', adminAuth, approveRefund);
refundRouter.post('/reject', adminAuth, rejectRefund);

// Razorpay account activity (read-only) — reuses the '/api/refund' →
// 'refund-requests' permission mapping in middleware/adminAuth.js, so no new
// permission string is needed on either side.
refundRouter.get('/razorpay-summary', adminAuth, getRazorpaySummary);
refundRouter.get('/razorpay-transactions', adminAuth, getRazorpayTransactions);

export default refundRouter;
