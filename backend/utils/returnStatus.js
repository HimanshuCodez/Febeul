// Return journey status engine.
//
// THE ONE RULE: a return's status is never stored. It is computed on every
// read from three date fields on the order (refundDetails.returnTracking):
//
//   pickupDate    — Day 0, courier collected the parcel
//   receivedDate  — warehouse receipt; setting it stops the clock forever
//   manualStatus  — an explicit admin override
//
// Consequences worth keeping: there is no background job that can fail, no
// order can sit stranded in a status nothing updates any more, thresholds
// (10 → 12 days) re-classify every existing order the moment they change, and
// a parcel that turns up on day 45 can never be mislabelled as lost, because
// receivedDate short-circuits the day count entirely.

import cmsModel from '../models/cmsModel.js';

// Business thresholds. Admin-editable under Settings → Configurations; these
// are only the fallbacks used before anything has been configured.
export const RETURN_SETTINGS_DEFAULTS = {
    returnCriticalDays: 10,  // Parcel not received by now → flagged for investigation
    returnLostDays: 50,      // Parcel not received by now → written off as lost
    returnMaxRefundDays: 15, // Refund must be settled by now, received or not
    returnSupportEmail: ''
};

// siteSettings is read on nearly every return-related request; a short TTL
// keeps that from turning into a Mongo round-trip per order in a list view,
// while still picking up an admin's change within a few seconds.
const SETTINGS_TTL_MS = 30 * 1000;
let settingsCache = { value: null, at: 0 };

export const getReturnSettings = async () => {
    if (settingsCache.value && (Date.now() - settingsCache.at) < SETTINGS_TTL_MS) {
        return settingsCache.value;
    }
    try {
        const doc = await cmsModel.findOne({ name: 'siteSettings' });
        const content = doc?.content || {};
        const value = {
            returnCriticalDays: Number(content.returnCriticalDays) || RETURN_SETTINGS_DEFAULTS.returnCriticalDays,
            returnLostDays: Number(content.returnLostDays) || RETURN_SETTINGS_DEFAULTS.returnLostDays,
            returnMaxRefundDays: Number(content.returnMaxRefundDays) || RETURN_SETTINGS_DEFAULTS.returnMaxRefundDays,
            returnSupportEmail: content.returnSupportEmail || RETURN_SETTINGS_DEFAULTS.returnSupportEmail
        };
        settingsCache = { value, at: Date.now() };
        return value;
    } catch {
        return RETURN_SETTINGS_DEFAULTS;
    }
};

// Lets a settings save take effect immediately rather than after the TTL.
export const invalidateReturnSettingsCache = () => {
    settingsCache = { value: null, at: 0 };
};

// --- Internal statuses (admin panel only — never sent to a customer) ---
export const INTERNAL_STATUS = {
    RETURN_REQUESTED: 'RETURN_REQUESTED',
    PICKUP_SCHEDULED: 'PICKUP_SCHEDULED',
    PICKED_UP: 'PICKED_UP',
    IN_TRANSIT: 'IN_TRANSIT',
    CRITICAL_RETURN: 'CRITICAL_RETURN',
    INVESTIGATION_OPEN: 'INVESTIGATION_OPEN',
    LOST_RETURN: 'LOST_RETURN',
    COURIER_CLAIM_PENDING: 'COURIER_CLAIM_PENDING',
    CLAIM_APPROVED: 'CLAIM_APPROVED',
    CLAIM_REJECTED: 'CLAIM_REJECTED',
    RECEIVED: 'RECEIVED',
    LATE_RECEIVED: 'LATE_RECEIVED',
    QC_PASS: 'QC_PASS',
    QC_FAIL: 'QC_FAIL',
    REFUND_COMPLETED: 'REFUND_COMPLETED'
};

export const INTERNAL_STATUS_LABELS = {
    RETURN_REQUESTED: 'Return Requested',
    PICKUP_SCHEDULED: 'Pickup Scheduled',
    PICKED_UP: 'Picked Up',
    IN_TRANSIT: 'In Transit',
    CRITICAL_RETURN: 'Critical Return',
    INVESTIGATION_OPEN: 'Investigation Open',
    LOST_RETURN: 'Lost Return',
    COURIER_CLAIM_PENDING: 'Courier Claim Pending',
    CLAIM_APPROVED: 'Claim Approved',
    CLAIM_REJECTED: 'Claim Rejected',
    RECEIVED: 'Received at Warehouse',
    LATE_RECEIVED: 'Late Received',
    QC_PASS: 'QC Pass',
    QC_FAIL: 'QC Fail',
    REFUND_COMPLETED: 'Refund Completed'
};

// A manual override normally wins outright. These two are the exception: they
// are "we are chasing this" markers, not conclusions, so the day-count is still
// allowed to escalate them to LOST_RETURN. Without this, opening an
// investigation on day 11 would freeze the order short of the lost threshold
// forever — precisely the stranded-status failure the derived model exists to
// prevent.
const SOFT_MANUAL_STATUSES = new Set([INTERNAL_STATUS.CRITICAL_RETURN, INTERNAL_STATUS.INVESTIGATION_OPEN]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysBetween = (from, to = new Date()) => {
    if (!from) return null;
    return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY);
};

// The internal status, derived. `order` may be a Mongoose document or a plain
// object; nothing here writes.
export const computeInternalReturnStatus = (order, settings = RETURN_SETTINGS_DEFAULTS) => {
    const refund = order?.refundDetails || {};
    const rt = refund.returnTracking || {};
    const pickup = refund.pickup || {};

    const days = daysBetween(rt.pickupDate);
    const pastLostThreshold = days !== null && days >= settings.returnLostDays;

    // 1. Admin's explicit call is final — except for the soft markers above,
    //    which still escalate once the parcel is past the lost threshold.
    if (rt.manualStatus) {
        if (SOFT_MANUAL_STATUSES.has(rt.manualStatus) && !rt.receivedDate && pastLostThreshold) {
            return INTERNAL_STATUS.LOST_RETURN;
        }
        return rt.manualStatus;
    }

    // 2. Money settled and the item inspected — the return is closed.
    if (rt.qcResult && (refund.status === 'completed' || rt.refundPaidAt)) {
        return INTERNAL_STATUS.REFUND_COMPLETED;
    }

    // 3. Inspected but not yet settled.
    if (rt.qcResult === 'FAIL') return INTERNAL_STATUS.QC_FAIL;
    if (rt.qcResult === 'PASS') return INTERNAL_STATUS.QC_PASS;

    // 4. Parcel is here — clock stopped. A parcel that arrived past the lost
    //    threshold is still a receipt, just a late one.
    if (rt.receivedDate) {
        if (rt.lateDeliveredAt) return INTERNAL_STATUS.LATE_RECEIVED;
        const transitDays = daysBetween(rt.pickupDate, rt.receivedDate);
        if (transitDays !== null && transitDays >= settings.returnLostDays) return INTERNAL_STATUS.LATE_RECEIVED;
        return INTERNAL_STATUS.RECEIVED;
    }

    // 5. Not picked up yet — the clock hasn't started.
    if (days === null) {
        return pickup.status === 'scheduled' || pickup.status === 'failed'
            ? INTERNAL_STATUS.PICKUP_SCHEDULED
            : INTERNAL_STATUS.RETURN_REQUESTED;
    }

    // 6. In flight — count the days.
    if (days >= settings.returnLostDays) return INTERNAL_STATUS.LOST_RETURN;
    if (days >= settings.returnCriticalDays) return INTERNAL_STATUS.CRITICAL_RETURN;
    if (days >= 1) return INTERNAL_STATUS.IN_TRANSIT;
    return INTERNAL_STATUS.PICKED_UP;
};

// --- Customer-facing ladder ---
//
// The ONLY labels a customer may ever see. Every internal status maps onto one
// of these rungs; anything with no rung of its own (Critical, Investigation,
// Lost, Claim…) inherits the rung already reached, so the customer's timeline
// simply stops moving rather than exposing that something went wrong.
export const CUSTOMER_STAGES = [
    { key: 'requested', label: 'Return Requested' },
    { key: 'pickup_scheduled', label: 'Pickup Scheduled' },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'received', label: 'Received' },
    { key: 'qc_done', label: 'Quality Check Done' },
    { key: 'refund_initiated', label: 'Refund Initiated' },
    { key: 'refund_completed', label: 'Refund Completed' }
];

const STAGE_INDEX = CUSTOMER_STAGES.reduce((acc, stage, i) => ({ ...acc, [stage.key]: i }), {});

// Where each internal status sits on the customer ladder. Statuses that must
// stay invisible deliberately map to the rung the customer had already
// reached ('in_transit'), which is where they were when things went quiet.
const INTERNAL_TO_STAGE = {
    RETURN_REQUESTED: 'requested',
    PICKUP_SCHEDULED: 'pickup_scheduled',
    PICKED_UP: 'picked_up',
    IN_TRANSIT: 'in_transit',
    CRITICAL_RETURN: 'in_transit',
    INVESTIGATION_OPEN: 'in_transit',
    LOST_RETURN: 'in_transit',
    COURIER_CLAIM_PENDING: 'in_transit',
    CLAIM_APPROVED: 'in_transit',
    CLAIM_REJECTED: 'in_transit',
    RECEIVED: 'received',
    LATE_RECEIVED: 'received',
    QC_PASS: 'qc_done',
    QC_FAIL: 'qc_done',
    REFUND_COMPLETED: 'refund_completed'
};

// Builds everything a storefront needs to render the return, and nothing else.
// This is the only shape that may be serialised to a customer.
export const buildCustomerReturnStatus = (order, settings = RETURN_SETTINGS_DEFAULTS) => {
    const refund = order?.refundDetails || {};
    if (refund.requestType !== 'return') return null;
    if (!refund.status || refund.status === 'none') return null;
    // A rejected request has no journey to show — the storefront renders the
    // rejection reason instead.
    if (refund.status === 'rejected') return null;

    const rt = refund.returnTracking || {};
    const pickup = refund.pickup || {};
    const internal = computeInternalReturnStatus(order, settings);

    // The parcel's own progress, and the money's progress, advance
    // independently — a refund can be settled on day 15 with the parcel still
    // in transit. The headline is whichever is further along, so the customer's
    // status only ever moves forward.
    const parcelStageIdx = STAGE_INDEX[INTERNAL_TO_STAGE[internal] ?? 'in_transit'];
    let refundStageIdx = -1;
    if (refund.status === 'completed' || rt.refundPaidAt) refundStageIdx = STAGE_INDEX.refund_completed;
    else if (['initiated', 'processing'].includes(refund.status) || rt.refundInitiatedAt) refundStageIdx = STAGE_INDEX.refund_initiated;

    const currentIdx = Math.max(parcelStageIdx, refundStageIdx);
    const current = CUSTOMER_STAGES[currentIdx];

    const firstTransitScan = (pickup.trackingHistory || [])
        .filter(entry => ['IN_TRANSIT', 'SHIPPED'].includes(entry.status))
        .map(entry => entry.date)
        .sort((a, b) => new Date(a) - new Date(b))[0];

    const stageDates = {
        requested: refund.requestedAt || null,
        pickup_scheduled: pickup.scheduledDate || null,
        picked_up: rt.pickupDate || null,
        in_transit: firstTransitScan || null,
        received: rt.receivedDate || null,
        qc_done: rt.qcDate || null,
        refund_initiated: rt.refundInitiatedAt || null,
        refund_completed: rt.refundPaidAt || refund.processedAt || null
    };

    const milestones = CUSTOMER_STAGES.map((stage, index) => ({
        key: stage.key,
        label: stage.label,
        reached: index <= currentIdx,
        current: index === currentIdx,
        at: stageDates[stage.key] || null
    }));

    // The promised settlement date. Shown so the customer has a date to hold on
    // to instead of chasing the courier — which is the entire point of owning
    // transit risk after pickup.
    const refundBy = rt.pickupDate
        ? new Date(new Date(rt.pickupDate).getTime() + settings.returnMaxRefundDays * MS_PER_DAY)
        : null;

    return {
        stage: current.key,
        label: current.label,
        milestones,
        refundByDate: refundStageIdx === STAGE_INDEX.refund_completed ? null : refundBy,
        maxRefundDays: settings.returnMaxRefundDays,
        courier: pickup.courier || null,
        awb: pickup.awb || null,
        pickedUpAt: rt.pickupDate || null,
        supportEmail: settings.returnSupportEmail || null
    };
};

// --- Customer serialisation ---
//
// The leak this guards against is not a visible one: internal statuses sit in
// the JSON long after the UI has stopped rendering them, and turn up in
// view-source. So the whole returnTracking sub-document is dropped and
// replaced by the customer-safe object above — an allowlist, so a field added
// to the model later cannot leak by default.
export const sanitizeOrderForCustomer = (orderDoc, settings = RETURN_SETTINGS_DEFAULTS) => {
    const order = typeof orderDoc?.toObject === 'function' ? orderDoc.toObject() : { ...orderDoc };
    if (!order?.refundDetails) return order;

    const returnStatus = buildCustomerReturnStatus(order, settings);
    const { returnTracking, pickup, ...safeRefundDetails } = order.refundDetails;

    // The reverse-pickup sub-document is mostly customer-safe, but not all of
    // it: failureReason carries a raw courier API error, and the rest are our
    // logistics provider's internal identifiers. The customer is told we handle
    // the courier — so they are never shown its plumbing.
    if (pickup) {
        safeRefundDetails.pickup = {
            status: pickup.status,
            awb: pickup.awb,
            courier: pickup.courier,
            trackingUrl: pickup.trackingUrl,
            scheduledDate: pickup.scheduledDate,
            trackingHistory: pickup.trackingHistory
        };
    }

    order.refundDetails = safeRefundDetails;
    if (returnStatus) order.returnStatus = returnStatus;
    return order;
};

export const sanitizeOrdersForCustomer = (orders, settings = RETURN_SETTINGS_DEFAULTS) =>
    orders.map(order => sanitizeOrderForCustomer(order, settings));

// --- Admin view model ---
//
// Everything the admin panel needs that would otherwise have to be re-derived
// (and drift) in the browser: the computed status, the day counts, and the
// refund deadline.
export const buildAdminReturnView = (order, settings = RETURN_SETTINGS_DEFAULTS) => {
    const refund = order?.refundDetails || {};
    const rt = refund.returnTracking || {};
    const status = computeInternalReturnStatus(order, settings);
    const daysSincePickup = daysBetween(rt.pickupDate);

    const refundDueDate = rt.pickupDate
        ? new Date(new Date(rt.pickupDate).getTime() + settings.returnMaxRefundDays * MS_PER_DAY)
        : null;
    const refundSettled = refund.status === 'completed' || !!rt.refundPaidAt;
    // Overdue is decided by the actual deadline instant, not the rounded day
    // count — rounding would raise the red alert up to a day early (or, ceiling
    // the other way, a day late) at the boundary.
    const msToDeadline = refundDueDate ? refundDueDate.getTime() - Date.now() : null;
    const daysToRefundDeadline = msToDeadline === null
        ? null
        : (msToDeadline >= 0 ? Math.floor(msToDeadline / MS_PER_DAY) : -Math.ceil(-msToDeadline / MS_PER_DAY));

    return {
        status,
        label: INTERNAL_STATUS_LABELS[status] || status,
        daysSincePickup,
        daysInWarehouse: rt.receivedDate ? daysBetween(rt.receivedDate) : null,
        transitDays: rt.receivedDate ? daysBetween(rt.pickupDate, rt.receivedDate) : null,
        refundDueDate,
        daysToRefundDeadline: refundSettled ? null : daysToRefundDeadline,
        refundOverdue: !refundSettled && msToDeadline !== null && msToDeadline < 0,
        isManual: !!rt.manualStatus,
        thresholds: settings
    };
};

// Admin queue buckets. One table, six filters — the returns live in a single
// collection and these only select from it, so no two views can disagree.
export const RETURN_TABS = {
    in_transit: [INTERNAL_STATUS.RETURN_REQUESTED, INTERNAL_STATUS.PICKUP_SCHEDULED, INTERNAL_STATUS.PICKED_UP, INTERNAL_STATUS.IN_TRANSIT],
    critical: [INTERNAL_STATUS.CRITICAL_RETURN, INTERNAL_STATUS.INVESTIGATION_OPEN],
    qc_pending: [INTERNAL_STATUS.RECEIVED, INTERNAL_STATUS.LATE_RECEIVED],
    refund_pending: [INTERNAL_STATUS.QC_PASS, INTERNAL_STATUS.QC_FAIL],
    lost: [INTERNAL_STATUS.LOST_RETURN, INTERNAL_STATUS.COURIER_CLAIM_PENDING, INTERNAL_STATUS.CLAIM_APPROVED, INTERNAL_STATUS.CLAIM_REJECTED],
    completed: [INTERNAL_STATUS.REFUND_COMPLETED]
};

// Appends to the immutable audit trail. Entries are only ever added — every
// dispute, chargeback and courier claim is argued from this list.
export const appendReturnHistory = (order, { status, note, by = 'system' }) => {
    if (!order.refundDetails.returnTracking) order.refundDetails.returnTracking = {};
    if (!Array.isArray(order.refundDetails.returnTracking.history)) order.refundDetails.returnTracking.history = [];
    order.refundDetails.returnTracking.history.push({ status, note, by, date: new Date() });
};

export default {
    getReturnSettings,
    invalidateReturnSettingsCache,
    computeInternalReturnStatus,
    buildCustomerReturnStatus,
    buildAdminReturnView,
    sanitizeOrderForCustomer,
    sanitizeOrdersForCustomer,
    appendReturnHistory,
    INTERNAL_STATUS,
    INTERNAL_STATUS_LABELS,
    CUSTOMER_STAGES,
    RETURN_TABS
};
