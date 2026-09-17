// Exchange ticket status/view engine.
//
// Unlike the return journey (utils/returnStatus.js), an exchange's status is
// NOT derived from dates — it moves through a small, discrete set of
// admin/webhook-triggered events (verify, schedule pickup, QC, dispatch), so
// it is stored directly on the document (same convention as ticketModel's
// `status`). This module still keeps the same separation the return system
// established: internal vocabulary vs. a fixed customer-safe ladder.

import cmsModel from '../models/cmsModel.js';

export const EXCHANGE_WINDOW_DAYS = 2;

const EXCHANGE_SETTINGS_DEFAULTS = { exchangeSupportEmail: '' };

const SETTINGS_TTL_MS = 30 * 1000;
let settingsCache = { value: null, at: 0 };

export const getExchangeSettings = async () => {
    if (settingsCache.value && (Date.now() - settingsCache.at) < SETTINGS_TTL_MS) {
        return settingsCache.value;
    }
    try {
        const doc = await cmsModel.findOne({ name: 'siteSettings' });
        const content = doc?.content || {};
        const value = {
            exchangeSupportEmail: content.returnSupportEmail || content.exchangeSupportEmail || EXCHANGE_SETTINGS_DEFAULTS.exchangeSupportEmail
        };
        settingsCache = { value, at: Date.now() };
        return value;
    } catch {
        return EXCHANGE_SETTINGS_DEFAULTS;
    }
};

// --- Internal statuses (admin panel only — never sent to a customer) ---
export const INTERNAL_STATUS_LABELS = {
    REQUESTED: 'Requested — Awaiting Verification',
    VERIFICATION_REJECTED: 'Verification Rejected',
    VERIFICATION_APPROVED: 'Verified — Pickup Pending',
    PICKUP_SCHEDULED: 'Pickup Scheduled',
    PICKUP_FAILED: 'Pickup Failed',
    PICKED_UP: 'Picked Up',
    RECEIVED_AT_WAREHOUSE: 'Received at Warehouse',
    QC_FAILED: 'QC Failed',
    NEW_PRODUCT_DISPATCHED: 'Replacement Dispatched',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    EXPIRED: 'Window Expired'
};

export const REASON_LABELS = {
    wrong_item: 'Wrong Item Delivered',
    damaged: 'Damaged / Defective Product'
};

// --- Customer-facing ladder ---
export const CUSTOMER_STAGES = [
    { key: 'requested', label: 'Exchange Request Received' },
    { key: 'verified', label: 'Exchange Approved' },
    { key: 'pickup_scheduled', label: 'Pickup Scheduled' },
    { key: 'picked_up', label: 'Old Product Picked Up' },
    { key: 'received', label: 'Old Product Received' },
    { key: 'dispatched', label: 'New Product Dispatched' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Exchange Delivered' }
];

const STAGE_INDEX = CUSTOMER_STAGES.reduce((acc, stage, i) => ({ ...acc, [stage.key]: i }), {});

// Statuses with no ladder of their own inherit the rung already reached
// (QC_FAILED and PICKUP_FAILED are handled outside the ladder — see below —
// but map here too as a safe fallback).
const INTERNAL_TO_STAGE = {
    REQUESTED: 'requested',
    VERIFICATION_APPROVED: 'verified',
    PICKUP_SCHEDULED: 'pickup_scheduled',
    PICKUP_FAILED: 'pickup_scheduled',
    PICKED_UP: 'picked_up',
    RECEIVED_AT_WAREHOUSE: 'received',
    QC_FAILED: 'received',
    NEW_PRODUCT_DISPATCHED: 'dispatched',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered'
};

// Statuses that stop the journey outright — the customer sees a plain
// message instead of a milestone ladder (nothing to show progressing).
const BLOCKED_MESSAGES = {
    VERIFICATION_REJECTED: 'Your exchange request could not be approved.',
    QC_FAILED: 'We could not process this exchange after inspecting the returned item. Our team will reach out about a refund instead.',
    EXPIRED: 'The exchange window for this item has closed.'
};

// Builds everything the storefront needs, and nothing else — an allowlist,
// so a field added to the model later cannot leak to a customer by default.
export const buildCustomerExchangeView = (exchange, settings = EXCHANGE_SETTINGS_DEFAULTS) => {
    if (!exchange) return null;

    if (BLOCKED_MESSAGES[exchange.status]) {
        return {
            ticketId: exchange.ticketId,
            stage: null,
            blocked: true,
            label: exchange.status === 'VERIFICATION_REJECTED' ? 'Exchange Request Declined' : 'Exchange Could Not Be Processed',
            message: BLOCKED_MESSAGES[exchange.status],
            rejectionReason: exchange.status === 'VERIFICATION_REJECTED' ? exchange.rejectionReason : undefined,
            requestedAt: exchange.createdAt,
            supportEmail: settings.exchangeSupportEmail || null
        };
    }

    const currentKey = INTERNAL_TO_STAGE[exchange.status] || 'requested';
    const currentIdx = STAGE_INDEX[currentKey];

    const stageDates = {
        requested: exchange.createdAt,
        verified: exchange.timeline?.find(e => e.status === 'VERIFICATION_APPROVED')?.date || null,
        pickup_scheduled: exchange.reversePickup?.scheduledDate || null,
        picked_up: exchange.timeline?.find(e => e.status === 'PICKED_UP')?.date || null,
        received: exchange.timeline?.find(e => e.status === 'RECEIVED_AT_WAREHOUSE')?.date || null,
        dispatched: exchange.forwardShipment?.dispatchedDate || null,
        out_for_delivery: exchange.timeline?.find(e => e.status === 'OUT_FOR_DELIVERY')?.date || null,
        delivered: exchange.closedAt || null
    };

    const milestones = CUSTOMER_STAGES.map((stage, index) => ({
        key: stage.key,
        label: stage.label,
        reached: index <= currentIdx,
        current: index === currentIdx,
        at: stageDates[stage.key] || null
    }));

    return {
        ticketId: exchange.ticketId,
        stage: currentKey,
        blocked: false,
        label: CUSTOMER_STAGES[currentIdx].label,
        milestones,
        requestedAt: exchange.createdAt,
        supportEmail: settings.exchangeSupportEmail || null
    };
};

// --- Customer serialisation ---
export const sanitizeExchangeForCustomer = (exchangeDoc, settings = EXCHANGE_SETTINGS_DEFAULTS) => {
    const exchange = typeof exchangeDoc?.toObject === 'function' ? exchangeDoc.toObject() : { ...exchangeDoc };
    return {
        _id: exchange._id,
        ticketId: exchange.ticketId,
        orderId: exchange.orderId,
        orderItemIndex: exchange.orderItemIndex,
        reason: exchange.reason,
        description: exchange.description,
        images: exchange.images,
        createdAt: exchange.createdAt,
        exchangeStatus: buildCustomerExchangeView(exchange, settings)
    };
};

export const sanitizeExchangesForCustomer = (exchanges, settings = EXCHANGE_SETTINGS_DEFAULTS) =>
    exchanges.map(exchange => sanitizeExchangeForCustomer(exchange, settings));

// Admin queue buckets. Just display metadata — which row goes in which
// bucket is decided once, server-side, in buildAdminExchangeView below. A
// plain status→bucket table isn't enough here because QC_PASS isn't its own
// stored status (see submitQC): a passed and a not-yet-inspected item both
// sit at RECEIVED_AT_WAREHOUSE, split only by `qc.result`. Recomputing that
// split in the browser is exactly the kind of drift the return journey's own
// comments warn about, so it's computed once here instead.
export const EXCHANGE_TAB_DEFS = [
    { key: 'approval', label: 'Awaiting Approval' },
    { key: 'pickup', label: 'Pickup' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'qc_pending', label: 'QC Pending' },
    { key: 'ready_to_dispatch', label: 'Ready to Dispatch' },
    { key: 'needs_refund', label: 'QC Failed — Refund' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'closed', label: 'Closed' }
];

const bucketOf = (exchange) => {
    const status = exchange.status;
    if (status === 'REQUESTED') return 'approval';
    if (['VERIFICATION_APPROVED', 'PICKUP_SCHEDULED', 'PICKUP_FAILED'].includes(status)) return 'pickup';
    if (status === 'PICKED_UP') return 'in_transit';
    if (status === 'RECEIVED_AT_WAREHOUSE') return exchange.qc?.result === 'PASS' ? 'ready_to_dispatch' : 'qc_pending';
    if (status === 'QC_FAILED') return 'needs_refund';
    if (['NEW_PRODUCT_DISPATCHED', 'OUT_FOR_DELIVERY'].includes(status)) return 'shipped';
    return 'closed'; // VERIFICATION_REJECTED, DELIVERED, EXPIRED
};

// --- Admin view model ---
export const buildAdminExchangeView = (exchange) => {
    const status = exchange.status;
    const requestedAt = exchange.createdAt;
    const daysSinceRequest = requestedAt ? Math.floor((Date.now() - new Date(requestedAt).getTime()) / (24 * 60 * 60 * 1000)) : null;

    return {
        status,
        label: INTERNAL_STATUS_LABELS[status] || status,
        daysSinceRequest,
        bucket: bucketOf(exchange),
        isOpen: !['VERIFICATION_REJECTED', 'QC_FAILED', 'DELIVERED', 'EXPIRED'].includes(status)
    };
};

// Appends to the immutable audit trail. Entries are only ever added.
export const appendExchangeHistory = (exchange, { event, status, note, by = 'system', source = 'system' }) => {
    if (!Array.isArray(exchange.timeline)) exchange.timeline = [];
    exchange.timeline.push({ event, status, note, by, source, date: new Date() });
};

// No cron exists in this codebase; the 2-day window is instead enforced
// lazily whenever an exchange is read. Mutates and returns true if it flipped
// the exchange to EXPIRED (caller is responsible for saving).
export const applyWindowExpiry = (exchange) => {
    if (exchange.status !== 'REQUESTED') return false;
    if (!exchange.windowExpiresAt) return false;
    if (new Date() <= new Date(exchange.windowExpiresAt)) return false;

    exchange.status = 'EXPIRED';
    exchange.closedAt = new Date();
    appendExchangeHistory(exchange, {
        event: 'WINDOW_EXPIRED',
        status: 'EXPIRED',
        note: 'Exchange window closed before verification.',
        by: 'system',
        source: 'system'
    });
    return true;
};

export default {
    EXCHANGE_WINDOW_DAYS,
    getExchangeSettings,
    INTERNAL_STATUS_LABELS,
    REASON_LABELS,
    CUSTOMER_STAGES,
    buildCustomerExchangeView,
    sanitizeExchangeForCustomer,
    sanitizeExchangesForCustomer,
    buildAdminExchangeView,
    EXCHANGE_TAB_DEFS,
    appendExchangeHistory,
    applyWindowExpiry
};
