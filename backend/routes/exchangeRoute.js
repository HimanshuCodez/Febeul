import express from 'express';
import {
    requestExchange,
    getMyExchange,
    cancelExchangeRequest,
    listExchanges,
    getExchange,
    verifyExchange,
    schedulePickup,
    markReceived,
    submitQC,
    redirectToRefund,
    dispatchReplacement
} from '../controllers/exchangeController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';

const exchangeRouter = express.Router();

// Customer
exchangeRouter.post('/request', auth, upload.array('images', 4), requestExchange);
exchangeRouter.get('/my/:orderId/:itemIndex', auth, getMyExchange);
exchangeRouter.post('/cancel', auth, cancelExchangeRequest);

// Admin/staff — internal vocabulary (QC, AWBs) must never be reachable with a customer token.
exchangeRouter.get('/list', adminAuth, listExchanges);
exchangeRouter.get('/:id', adminAuth, getExchange);
exchangeRouter.post('/verify', adminAuth, verifyExchange);
exchangeRouter.post('/schedule-pickup', adminAuth, schedulePickup);
exchangeRouter.post('/mark-received', adminAuth, markReceived);
exchangeRouter.post('/quality-check', adminAuth, upload.array('photos', 6), submitQC);
exchangeRouter.post('/redirect-refund', adminAuth, redirectToRefund);
exchangeRouter.post('/dispatch', adminAuth, dispatchReplacement);

export default exchangeRouter;
