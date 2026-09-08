// Admin-side operations for the return journey: warehouse receipt, quality
// check, settlement, courier investigation and claims.
//
// Every handler here does two things without exception — mutate the evidence
// fields, and append to returnTracking.history. Nothing writes a status: the
// status is derived from the dates on read (utils/returnStatus.js), so these
// handlers only ever record what happened, never what it should now be called.

import orderModel from '../models/orderModel.js';
import { v2 as cloudinary } from 'cloudinary';
import {
    getReturnSettings,
    buildAdminReturnView,
    computeInternalReturnStatus,
    appendReturnHistory,
    INTERNAL_STATUS,
    INTERNAL_STATUS_LABELS,
    RETURN_TABS
} from '../utils/returnStatus.js';
import { syncReturnsTracking, syncReturnTracking } from '../utils/returnTrackingSync.js';
import { sendEmail } from '../utils/sendEmail.js';
import { refundProcessedEmailTemplate } from '../templates/returnEmail.js';

const RETURN_FILTER = { 'refundDetails.requestType': 'return' };

const actorOf = (req) => req.userName || req.userEmail || 'admin';

// Loads a return order and guards against the two things that can silently
// corrupt an audit trail: acting on the wrong kind of request, and acting on
// an order that no longer exists.
const loadReturnOrder = async (orderId) => {
    const order = await orderModel.findById(orderId).populate('userId', 'name email');
    if (!order) return { error: 'Order not found.' };
    if (order.refundDetails?.requestType !== 'return') {
        return { error: 'This order is not a return request.' };
    }
    if (!order.refundDetails.returnTracking) order.refundDetails.returnTracking = {};
    return { order };
};

const respondWithOrder = async (res, order, message) => {
    const settings = await getReturnSettings();
    await order.save();
    return res.json({
        success: true,
        message,
        order,
        view: buildAdminReturnView(order, settings)
    });
};

// --- 1. Queue listing -------------------------------------------------------
// One collection, six filters. The tabs are selections over the same rows, so
// no two views of a return can ever disagree.
const listReturns = async (req, res) => {
    try {
        const settings = await getReturnSettings();
        const orders = await orderModel.find(RETURN_FILTER)
            .populate('userId', 'name email')
            .sort({ 'refundDetails.requestedAt': -1 });

        // Keep the queue in step with the courier without waiting on a webhook.
        await syncReturnsTracking(orders);

        const rows = orders.map(order => ({
            ...order.toObject(),
            view: buildAdminReturnView(order, settings)
        }));

        const counts = Object.entries(RETURN_TABS).reduce((acc, [tab, statuses]) => {
            acc[tab] = rows.filter(row => statuses.includes(row.view.status)).length;
            return acc;
        }, { all: rows.length });

        // Surfaced separately because it cuts across tabs: a refund can fall due
        // while the parcel is still in transit, which is the entire point of the
        // deadline — the customer is paid on time whether or not the parcel is.
        counts.refund_due = rows.filter(row => row.view.refundOverdue).length;

        res.json({ success: true, returns: rows, counts, settings });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- 2. Single return, force-refreshed from the courier ----------------------
const getReturn = async (req, res) => {
    try {
        const { order, error } = await loadReturnOrder(req.params.id);
        if (error) return res.json({ success: false, message: error });

        await syncReturnTracking(order, { force: true });
        const settings = await getReturnSettings();

        res.json({ success: true, order, view: buildAdminReturnView(order, settings) });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- 3. Day 0 ---------------------------------------------------------------
// Normally set by the courier scan. This is the manual fallback for when the
// courier collected the parcel but Shiprocket never reported it.
const markPickedUp = async (req, res) => {
    try {
        const { orderId, pickupDate, note } = req.body;
        const { order, error } = await loadReturnOrder(orderId);
        if (error) return res.json({ success: false, message: error });

        const rt = order.refundDetails.returnTracking;
        if (rt.pickupDate) {
            return res.json({ success: false, message: 'Pickup date is already recorded for this return.' });
        }

        const date = pickupDate ? new Date(pickupDate) : new Date();
        if (isNaN(date.getTime())) return res.json({ success: false, message: 'Invalid pickup date.' });
        if (date.getTime() > Date.now()) return res.json({ success: false, message: 'Pickup date cannot be in the future.' });

        rt.pickupDate = date;
        if ((order.refundDetails.pickup?.status || 'none') === 'none' || order.refundDetails.pickup.status === 'scheduled') {
            order.refundDetails.pickup.status = 'picked_up';
        }
        appendReturnHistory(order, {
            status: INTERNAL_STATUS.PICKED_UP,
            note: note || 'Pickup recorded manually',
            by: actorOf(req)
        });

        await respondWithOrder(res, order, 'Pickup date recorded. The return clock starts from this date.');
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- 4. Warehouse receipt ---------------------------------------------------
// Stops the clock permanently. A parcel already written off as lost goes
// through markLateReceived instead, which keeps the lost record intact.
const markReceived = async (req, res) => {
    try {
        const { orderId, receivedDate, note } = req.body;
        const { order, error } = await loadReturnOrder(orderId);
        if (error) return res.json({ success: false, message: error });

        const rt = order.refundDetails.returnTracking;
        if (rt.receivedDate) return res.json({ success: false, message: 'This return is already marked as received.' });

        const date = receivedDate ? new Date(receivedDate) : new Date();
        if (isNaN(date.getTime())) return res.json({ success: false, message: 'Invalid received date.' });
        if (date.getTime() > Date.now()) return res.json({ success: false, message: 'Received date cannot be in the future.' });

        // A return can arrive without us ever having seen a pickup scan; without
        // a Day 0 the transit duration is unknowable, so record the receipt and
        // leave the gap visible in the trail rather than inventing a date.
        rt.receivedDate = date;
        order.refundDetails.pickup.status = 'delivered_to_warehouse';

        // Whatever the admin was chasing is now moot — a stale override would
        // hold the order short of QC.
        const clearedOverride = rt.manualStatus;
        rt.manualStatus = undefined;

        appendReturnHistory(order, {
            status: INTERNAL_STATUS.RECEIVED,
            note: note || (clearedOverride ? `Received at warehouse (cleared ${INTERNAL_STATUS_LABELS[clearedOverride] || clearedOverride})` : 'Received at warehouse'),
            by: actorOf(req)
        });

        await respondWithOrder(res, order, 'Marked as received. Quality check is now pending.');
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- 5. A written-off parcel that turned up ---------------------------------
// The lost record is never erased. This is recorded on top of it, so the
// history still shows the parcel was lost and then found.
const markLateReceived = async (req, res) => {
    try {
        const { orderId, receivedDate, note } = req.body;
        const { order, error } = await loadReturnOrder(orderId);
        if (error) return res.json({ success: false, message: error });

        const rt = order.refundDetails.returnTracking;
        if (rt.receivedDate) return res.json({ success: false, message: 'This return is already marked as received.' });

        const date = receivedDate ? new Date(receivedDate) : new Date();
        if (isNaN(date.getTime())) return res.json({ success: false, message: 'Invalid delivery date.' });
        if (date.getTime() > Date.now()) return res.json({ success: false, message: 'Delivery date cannot be in the future.' });

        const priorStatus = computeInternalReturnStatus(order, await getReturnSettings());

        rt.receivedDate = date;
        rt.lateDeliveredAt = date;
        rt.lateMarkedBy = actorOf(req);
        rt.lateNote = note || '';
        rt.manualStatus = undefined;
        order.refundDetails.pickup.status = 'delivered_to_warehouse';

        appendReturnHistory(order, {
            status: INTERNAL_STATUS.LATE_RECEIVED,
            note: `Parcel arrived late after being marked ${INTERNAL_STATUS_LABELS[priorStatus] || priorStatus}${note ? ` — ${note}` : ''}`,
            by: actorOf(req)
        });

        await respondWithOrder(res, order, 'Recorded as late received. The earlier record is preserved in history.');
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- 6. Quality check -------------------------------------------------------
// A FAIL without photographic evidence is unusable in a dispute, so it is
// rejected outright rather than saved half-documented.
const submitQualityCheck = async (req, res) => {
    try {
        const { orderId, result, notes } = req.body;
        const { order, error } = await loadReturnOrder(orderId);
        if (error) return res.json({ success: false, message: error });

        if (!['PASS', 'FAIL'].includes(result)) {
            return res.json({ success: false, message: 'Quality check result must be PASS or FAIL.' });
        }

        const rt = order.refundDetails.returnTracking;
        if (!rt.receivedDate) {
            return res.json({ success: false, message: 'Mark the parcel as received before running a quality check.' });
        }

        const files = req.files || [];
        if (result === 'FAIL' && files.length === 0) {
            return res.json({ success: false, message: 'At least one photo is required to record a QC failure.' });
        }

        const photoUrls = [];
        for (const file of files) {
            const uploaded = await cloudinary.uploader.upload(file.path, { resource_type: 'image' });
            photoUrls.push(uploaded.secure_url);
        }

        rt.qcResult = result;
        rt.qcBy = actorOf(req);
        rt.qcDate = new Date();
        rt.qcNotes = notes || '';
        if (photoUrls.length) rt.qcPhotos = [...(rt.qcPhotos || []), ...photoUrls];

        appendReturnHistory(order, {
            status: result === 'PASS' ? INTERNAL_STATUS.QC_PASS : INTERNAL_STATUS.QC_FAIL,
            note: `Quality check ${result}${notes ? ` — ${notes}` : ''}${photoUrls.length ? ` (${photoUrls.length} photo${photoUrls.length > 1 ? 's' : ''})` : ''}`,
            by: actorOf(req)
        });

        await respondWithOrder(res, order, `Quality check recorded as ${result}.`);
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- 7. Settlement ----------------------------------------------------------
// Marks the money as on its way. Gateway refunds (Razorpay) go through
// refundController.approveRefund, which moves the money itself; this is the
// manual leg — COD payouts and bank transfers — where the UTR is the only proof
// the customer was paid.
const markRefundInitiated = async (req, res) => {
    try {
        const { orderId, note } = req.body;
        const { order, error } = await loadReturnOrder(orderId);
        if (error) return res.json({ success: false, message: error });

        if (order.refundDetails.status === 'completed') {
            return res.json({ success: false, message: 'This refund is already completed.' });
        }

        order.refundDetails.returnTracking.refundInitiatedAt = order.refundDetails.returnTracking.refundInitiatedAt || new Date();
        order.refundDetails.status = 'initiated';
        if (order.orderStatus !== 'Refunded') order.orderStatus = 'Refund Initiated';

        appendReturnHistory(order, {
            status: 'REFUND_INITIATED',
            note: note || 'Refund initiated',
            by: actorOf(req)
        });

        await respondWithOrder(res, order, 'Refund marked as initiated.');
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const recordRefundSettlement = async (req, res) => {
    try {
        const { orderId, utr, amount, reason } = req.body;
        const { order, error } = await loadReturnOrder(orderId);
        if (error) return res.json({ success: false, message: error });

        if (!utr || !utr.toString().trim()) {
            return res.json({ success: false, message: 'A UTR / bank reference number is required.' });
        }

        const settledAmount = amount !== undefined && amount !== '' ? Number(amount) : (order.refundDetails.amount || order.orderTotal || 0);
        if (isNaN(settledAmount) || settledAmount <= 0) {
            return res.json({ success: false, message: 'Enter a valid refund amount.' });
        }
        if (settledAmount > (order.orderTotal || 0)) {
            return res.json({ success: false, message: `Refund cannot exceed the order total of ₹${order.orderTotal}.` });
        }

        const rt = order.refundDetails.returnTracking;
        rt.refundUtr = utr.toString().trim();
        rt.refundInitiatedAt = rt.refundInitiatedAt || new Date();
        rt.refundPaidAt = new Date();
        rt.refundDecidedBy = actorOf(req);
        rt.refundDecisionReason = reason || '';

        order.refundDetails.status = 'completed';
        order.refundDetails.amount = settledAmount;
        order.refundDetails.processedAt = new Date();
        order.refundDetails.isPartialRefund = settledAmount < (order.orderTotal || 0);
        order.orderStatus = 'Refunded';
        order.isRefundable = false;

        appendReturnHistory(order, {
            status: INTERNAL_STATUS.REFUND_COMPLETED,
            note: `Refund of ₹${settledAmount} paid (UTR ${rt.refundUtr})${reason ? ` — ${reason}` : ''}`,
            by: actorOf(req)
        });

        await order.save();

        if (order.userId?.email) {
            sendEmail(
                order.userId.email,
                'Your Febeul Refund Has Been Processed',
                refundProcessedEmailTemplate(order.userId.name || 'Customer', order._id, settledAmount, order.paymentMethod)
            );
        }

        const settings = await getReturnSettings();
        res.json({
            success: true,
            message: `Refund of ₹${settledAmount} recorded against UTR ${rt.refundUtr}.`,
            order,
            view: buildAdminReturnView(order, settings)
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- 8. Courier investigation ----------------------------------------------
const openInvestigation = async (req, res) => {
    try {
        const { orderId, ticket, note } = req.body;
        const { order, error } = await loadReturnOrder(orderId);
        if (error) return res.json({ success: false, message: error });

        if (!ticket || !ticket.toString().trim()) {
            return res.json({ success: false, message: 'A courier complaint/ticket number is required.' });
        }

        const rt = order.refundDetails.returnTracking;
        rt.investigationTicket = ticket.toString().trim();
        rt.investigationOpenedAt = rt.investigationOpenedAt || new Date();
        rt.investigationBy = actorOf(req);
        rt.manualStatus = INTERNAL_STATUS.INVESTIGATION_OPEN;

        appendReturnHistory(order, {
            status: INTERNAL_STATUS.INVESTIGATION_OPEN,
            note: `Investigation opened with courier (ticket ${rt.investigationTicket})${note ? ` — ${note}` : ''}`,
            by: actorOf(req)
        });

        await respondWithOrder(res, order, 'Investigation opened.');
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const addFollowup = async (req, res) => {
    try {
        const { orderId, note } = req.body;
        const { order, error } = await loadReturnOrder(orderId);
        if (error) return res.json({ success: false, message: error });

        if (!note || !note.toString().trim()) {
            return res.json({ success: false, message: 'Write what the follow-up said.' });
        }

        const rt = order.refundDetails.returnTracking;
        if (!Array.isArray(rt.followups)) rt.followups = [];
        rt.followups.push({ note: note.toString().trim(), by: actorOf(req), date: new Date() });

        appendReturnHistory(order, {
            status: 'FOLLOW_UP',
            note: note.toString().trim(),
            by: actorOf(req)
        });

        await respondWithOrder(res, order, 'Follow-up recorded.');
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- 9. Courier claim -------------------------------------------------------
const updateClaim = async (req, res) => {
    try {
        const { orderId, claimStatus, claimAmount, claimReference, notes } = req.body;
        const { order, error } = await loadReturnOrder(orderId);
        if (error) return res.json({ success: false, message: error });

        const allowed = ['pending', 'filed', 'approved', 'rejected'];
        if (!allowed.includes(claimStatus)) {
            return res.json({ success: false, message: 'Invalid claim status.' });
        }

        const rt = order.refundDetails.returnTracking;
        rt.claimStatus = claimStatus;
        if (claimAmount !== undefined && claimAmount !== '') {
            const parsed = Number(claimAmount);
            if (isNaN(parsed) || parsed < 0) return res.json({ success: false, message: 'Enter a valid claim amount.' });
            rt.claimAmount = parsed;
        }
        if (claimReference) rt.claimReference = claimReference.toString().trim();
        if (notes) rt.claimNotes = notes;
        if (!rt.claimFiledAt && ['filed', 'approved', 'rejected'].includes(claimStatus)) rt.claimFiledAt = new Date();

        // The claim state is what the return is now about, so it becomes the
        // override — but only while the parcel is genuinely still missing.
        if (!rt.receivedDate) {
            rt.manualStatus = claimStatus === 'approved' ? INTERNAL_STATUS.CLAIM_APPROVED
                : claimStatus === 'rejected' ? INTERNAL_STATUS.CLAIM_REJECTED
                : INTERNAL_STATUS.COURIER_CLAIM_PENDING;
        }

        appendReturnHistory(order, {
            status: `CLAIM_${claimStatus.toUpperCase()}`,
            note: `Courier claim ${claimStatus}${rt.claimReference ? ` (ref ${rt.claimReference})` : ''}${rt.claimAmount ? ` — ₹${rt.claimAmount}` : ''}${notes ? ` — ${notes}` : ''}`,
            by: actorOf(req)
        });

        await respondWithOrder(res, order, `Claim marked as ${claimStatus}.`);
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- 10. Manual override ----------------------------------------------------
// The escape hatch. Passing an empty status clears the override and hands the
// return back to the date-derived rules.
const setManualStatus = async (req, res) => {
    try {
        const { orderId, status, note } = req.body;
        const { order, error } = await loadReturnOrder(orderId);
        if (error) return res.json({ success: false, message: error });

        const rt = order.refundDetails.returnTracking;

        if (!status) {
            const cleared = rt.manualStatus;
            rt.manualStatus = undefined;
            appendReturnHistory(order, {
                status: 'OVERRIDE_CLEARED',
                note: `Manual override${cleared ? ` (${INTERNAL_STATUS_LABELS[cleared] || cleared})` : ''} removed — status is derived from dates again${note ? ` — ${note}` : ''}`,
                by: actorOf(req)
            });
            return respondWithOrder(res, order, 'Override cleared. Status now follows the automatic rules.');
        }

        const overridable = [
            INTERNAL_STATUS.CRITICAL_RETURN,
            INTERNAL_STATUS.INVESTIGATION_OPEN,
            INTERNAL_STATUS.LOST_RETURN,
            INTERNAL_STATUS.COURIER_CLAIM_PENDING,
            INTERNAL_STATUS.CLAIM_APPROVED,
            INTERNAL_STATUS.CLAIM_REJECTED
        ];
        if (!overridable.includes(status)) {
            return res.json({ success: false, message: 'That status cannot be set manually.' });
        }
        if (rt.receivedDate) {
            return res.json({ success: false, message: 'This parcel has already been received — its status can no longer be overridden.' });
        }

        rt.manualStatus = status;
        appendReturnHistory(order, {
            status,
            note: note || `Status set manually to ${INTERNAL_STATUS_LABELS[status] || status}`,
            by: actorOf(req)
        });

        await respondWithOrder(res, order, `Status set to ${INTERNAL_STATUS_LABELS[status] || status}.`);
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
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
};
