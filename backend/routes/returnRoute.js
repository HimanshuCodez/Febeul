import express from 'express';
import {
    listReturns,
    getReturn,
    markPickedUp,
    markReceived,
    markLateReceived,
    submitQualityCheck,
    markRefundInitiated,
    recordRefundSettlement,
    openInvestigation,
    addFollowup,
    updateClaim,
    setManualStatus
} from '../controllers/returnController.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';

const returnRouter = express.Router();

// Every route here is admin/staff only — the return journey's internal
// vocabulary (critical, investigation, lost, claim) must never be reachable
// with a customer token.
returnRouter.get('/list', adminAuth, listReturns);
returnRouter.get('/:id', adminAuth, getReturn);

returnRouter.post('/mark-picked-up', adminAuth, markPickedUp);
returnRouter.post('/mark-received', adminAuth, markReceived);
returnRouter.post('/mark-late-received', adminAuth, markLateReceived);
returnRouter.post('/quality-check', adminAuth, upload.array('photos', 6), submitQualityCheck);
returnRouter.post('/refund-initiated', adminAuth, markRefundInitiated);
returnRouter.post('/refund-settlement', adminAuth, recordRefundSettlement);
returnRouter.post('/investigation', adminAuth, openInvestigation);
returnRouter.post('/followup', adminAuth, addFollowup);
returnRouter.post('/claim', adminAuth, updateClaim);
returnRouter.post('/manual-status', adminAuth, setManualStatus);

export default returnRouter;
