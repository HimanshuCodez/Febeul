// Pull-based counterpart to the Shiprocket webhook handler.
//
// Shipments created by createAndAssignShipment() sit in the Shiprocket panel
// with no AWB until an admin clicks "Ship Now". Shiprocket does not reliably
// push a webhook at that moment (many accounts only get pushes once the
// courier starts scanning, and some only on cancellation), so an order would
// otherwise stay on 'Processing' for the customer long after it was shipped.
// This module re-reads the shipment from Shiprocket on demand and folds the
// result onto the order document using exactly the same status mapping the
// webhook handler uses, so both paths can never disagree.

import {
    trackShipment,
    trackShipmentByOrderId,
    getShiprocketOrderDetails,
    extractTrackingData
} from './shiprocket.js';
import {
    mapShiprocketStatus,
    mergeTrackingHistory,
    isStatusProgression
} from './shiprocketStatusMap.js';

// How long persisted tracking data is trusted before we re-poll Shiprocket's
// live API. Short enough that a "Ship Now" click shows up on the customer's
// order page within a few minutes even with no webhook at all.
export const TRACKING_STALE_MS = 5 * 60 * 1000;

// Once a shipment reaches one of these there is nothing left to poll for —
// and polling a cancelled AWB just makes Shiprocket return
// "Ohh! This AWB has been cancelled." on every page load.
const SETTLED_STATUSES = new Set(['DELIVERED', 'CANCELLED', 'RTO_DELIVERED', 'LOST']);

export const isTrackingStale = (order, staleMs = TRACKING_STALE_MS) => {
    const lastTrackedAt = order?.shiprocket?.lastTrackedAt;
    return !lastTrackedAt || (Date.now() - new Date(lastTrackedAt).getTime()) > staleMs;
};

// True when polling Shiprocket for this order could still tell us something new.
export const isTrackable = (order) => {
    if (!order?.shiprocket) return false;
    if (!order.shiprocket.awb && !order.shiprocket.srOrderId) return false;
    if (order.isCancelled) return false;
    if (SETTLED_STATUSES.has(order.shiprocketStatus)) return false;
    if (['Delivered', 'Cancelled'].includes(order.orderStatus)) return false;
    return true;
};

const applyStatus = (order, mapped, timestamp = new Date()) => {
    if (!mapped || !isStatusProgression(order.shiprocketStatus, mapped.shiprocketStatus)) return false;

    order.shiprocketStatus = mapped.shiprocketStatus;
    order.orderStatus = mapped.orderStatus;
    if (mapped.orderStatus === 'Shipped' && !order.shippedAt) order.shippedAt = timestamp;
    if (mapped.orderStatus === 'Delivered' && !order.deliveredAt) order.deliveredAt = timestamp;
    return true;
};

const applyEdd = (order, rawEdd) => {
    if (!rawEdd) return;
    const parsed = new Date(rawEdd);
    if (!isNaN(parsed.getTime())) order.shiprocket.edd = parsed;
};

const applyActivities = (order, activities = []) => {
    if (!activities.length) return false;
    const newEntries = activities.map(act => ({
        status: mapShiprocketStatus(act.status || act.activity)?.shiprocketStatus || 'UNKNOWN',
        activity: act.activity || act.status || '',
        location: act.location || '',
        date: act.date
    }));
    order.shiprocket.trackingHistory = mergeTrackingHistory(order.shiprocket.trackingHistory, newEntries);
    return true;
};

// Refreshes `order` (a Mongoose document) from Shiprocket and saves it.
// Returns { changed, trackingData } — `changed` is true when the shipment
// status/AWB actually moved, so callers can decide whether to notify.
export const syncOrderTracking = async (order, { force = false, staleMs = TRACKING_STALE_MS } = {}) => {
    if (!isTrackable(order)) return { changed: false, trackingData: null };
    if (!force && !isTrackingStale(order, staleMs)) return { changed: false, trackingData: null };

    let changed = false;
    let trackingData = null;

    try {
        // Step 1 — no AWB on file yet. The Orders API reflects a "Ship Now"
        // click immediately, whereas the tracking API has nothing to return
        // until the courier records its first scan.
        if (!order.shiprocket.awb && order.shiprocket.srOrderId) {
            const details = await getShiprocketOrderDetails(order.shiprocket.srOrderId);

            if (details?.awb) {
                order.shiprocket.awb = details.awb;
                order.shiprocket.trackingUrl = `https://shiprocket.co/tracking/${details.awb}`;
                if (details.courier) order.shiprocket.courier = details.courier;
                if (details.shipmentId) order.shiprocket.shipmentId = String(details.shipmentId);
                applyEdd(order, details.etd);
                changed = true;
            }

            // An AWB exists ⇒ it has been dispatched, even if Shiprocket's
            // `status` string is one we don't recognise.
            const mapped = mapShiprocketStatus(details?.status)
                || (order.shiprocket.awb ? mapShiprocketStatus('AWB ASSIGNED') : null);
            if (applyStatus(order, mapped)) changed = true;

            // Older/manual shipments occasionally aren't visible on the Orders
            // API but do respond to a track-by-order-id lookup.
            if (!order.shiprocket.awb) {
                const byOrderId = extractTrackingData(await trackShipmentByOrderId(order.shiprocket.srOrderId));
                const shipmentTrack = byOrderId?.shipment_track?.[0];
                if (shipmentTrack?.awb_code) {
                    order.shiprocket.awb = shipmentTrack.awb_code;
                    order.shiprocket.trackingUrl = `https://shiprocket.co/tracking/${shipmentTrack.awb_code}`;
                    if (shipmentTrack.courier_name) order.shiprocket.courier = shipmentTrack.courier_name;
                    if (shipmentTrack.id) order.shiprocket.shipmentId = String(shipmentTrack.id);
                    applyEdd(order, shipmentTrack.edd);
                    applyActivities(order, byOrderId.shipment_track_activities || []);
                    applyStatus(order, mapShiprocketStatus(shipmentTrack.current_status) || mapShiprocketStatus('AWB ASSIGNED'));
                    changed = true;
                }
            }
        }

        // Step 2 — with an AWB (possibly captured a moment ago) pull the
        // courier scans so the timeline and live status stay current.
        if (order.shiprocket.awb) {
            const rawTracking = await trackShipment(order.shiprocket.awb);
            trackingData = extractTrackingData(rawTracking);

            const shipmentTrack = trackingData?.shipment_track?.[0];
            applyEdd(order, shipmentTrack?.edd);
            applyActivities(order, trackingData?.shipment_track_activities || []);

            const currentStatus = shipmentTrack?.current_status || trackingData?.shipment_status;
            if (applyStatus(order, mapShiprocketStatus(currentStatus))) changed = true;
        }

        order.shiprocket.lastTrackedAt = new Date();
        await order.save();
    } catch (error) {
        console.error(`Error syncing Shiprocket tracking for order ${order._id}:`, error.message);
    }

    return { changed, trackingData };
};

// Refreshes a list of orders concurrently, skipping the ones that aren't
// trackable or aren't stale yet. Capped so a long order history (or the admin
// panel's full order list) can't fan out into dozens of Shiprocket calls on
// one page load — newest orders first, since those are the ones being shipped
// right now. Whatever the cap leaves out gets picked up on the next load,
// because syncing is what refreshes lastTrackedAt.
export const syncOrdersTracking = async (orders, { limit = 8, staleMs = TRACKING_STALE_MS } = {}) => {
    const candidates = orders
        .filter(order => isTrackable(order) && isTrackingStale(order, staleMs))
        .sort((a, b) => (b.date || 0) - (a.date || 0))
        .slice(0, limit);

    if (candidates.length === 0) return;
    await Promise.all(candidates.map(order => syncOrderTracking(order, { staleMs })));
};

export default { syncOrderTracking, syncOrdersTracking, isTrackable, isTrackingStale, TRACKING_STALE_MS };
