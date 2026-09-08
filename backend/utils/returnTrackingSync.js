// Real-time tracking for the RETURN leg (courier carrying the parcel from the
// customer back to our warehouse), and the single place where a courier scan
// turns into one of the two dates the whole return status engine runs on:
//
//   PICKED UP  → returnTracking.pickupDate  (Day 0 — every threshold counts from here)
//   DELIVERED  → returnTracking.receivedDate (clock stops permanently)
//
// Both the push path (Shiprocket webhook) and the pull path (on-demand poll)
// call applyReturnPickupStatus, so the two can never disagree about when Day 0
// was. That matters more here than on the forward leg: get pickupDate wrong and
// every critical/lost/refund-deadline calculation downstream is wrong with it.

import { trackShipment, extractTrackingData } from './shiprocket.js';
import { mapShiprocketStatus, mergeTrackingHistory } from './shiprocketStatusMap.js';
import { appendReturnHistory } from './returnStatus.js';

// Shiprocket's shipment vocabulary → our reverse-pickup vocabulary.
const PICKUP_STATUS_MAP = {
    'NEW': 'scheduled',
    'AWB_ASSIGNED': 'scheduled',
    'PICKUP SCHEDULED': 'scheduled',
    'PICKED UP': 'picked_up',
    'SHIPPED': 'picked_up',
    'IN_TRANSIT': 'in_transit',
    'OUT_FOR_DELIVERY': 'in_transit',
    'DELIVERED': 'delivered_to_warehouse'
};

// How far along the return leg each state sits, so an out-of-order webhook or a
// briefly-stale poll can't walk a collected parcel back to "scheduled".
const PICKUP_RANK = { none: 0, failed: 0, scheduled: 1, picked_up: 2, in_transit: 3, delivered_to_warehouse: 4 };

const TRACKING_STALE_MS = 5 * 60 * 1000;

// Nothing left to poll for once the parcel is back with us.
export const isReturnTrackable = (order) => {
    const pickup = order?.refundDetails?.pickup;
    if (!pickup?.awb) return false;
    if (pickup.status === 'delivered_to_warehouse') return false;
    if (order.refundDetails?.returnTracking?.receivedDate) return false;
    return true;
};

const isReturnTrackingStale = (order, staleMs = TRACKING_STALE_MS) => {
    const last = order?.refundDetails?.pickup?.lastTrackedAt;
    return !last || (Date.now() - new Date(last).getTime()) > staleMs;
};

// Applies one courier status to the return leg and records its date-side
// effects. `order` is mutated but not saved — the caller owns persistence.
// Returns true when something actually moved.
export const applyReturnPickupStatus = (order, shiprocketStatus, timestamp = new Date()) => {
    const nextStatus = PICKUP_STATUS_MAP[shiprocketStatus];
    if (!nextStatus) return false;

    const pickup = order.refundDetails.pickup;
    if (!order.refundDetails.returnTracking) order.refundDetails.returnTracking = {};
    const rt = order.refundDetails.returnTracking;

    let changed = false;

    if ((PICKUP_RANK[nextStatus] ?? 0) > (PICKUP_RANK[pickup.status] ?? 0)) {
        pickup.status = nextStatus;
        changed = true;
    }

    // Day 0. Written once and never revised — a later scan reporting an earlier
    // time would otherwise quietly shift every downstream deadline.
    if (!rt.pickupDate && (nextStatus === 'picked_up' || nextStatus === 'in_transit' || nextStatus === 'delivered_to_warehouse')) {
        rt.pickupDate = timestamp;
        appendReturnHistory(order, {
            status: 'PICKED_UP',
            note: `Courier collected the return parcel${pickup.awb ? ` (AWB ${pickup.awb})` : ''}`,
            by: 'system (courier scan)'
        });
        changed = true;
    }

    // The parcel is back. This stops the clock, so a return that took 45 days
    // can never be reclassified as lost afterwards.
    if (!rt.receivedDate && nextStatus === 'delivered_to_warehouse') {
        rt.receivedDate = timestamp;
        // A receipt supersedes whatever the admin was chasing — leaving a stale
        // override in place would freeze the order short of QC.
        if (rt.manualStatus) rt.manualStatus = undefined;
        appendReturnHistory(order, {
            status: 'RECEIVED',
            note: 'Return parcel delivered to warehouse (courier scan)',
            by: 'system (courier scan)'
        });
        changed = true;
    }

    return changed;
};

// Pull-based refresh, for accounts where Shiprocket pushes return-leg webhooks
// unreliably (common) or not at all. Same mapping as the webhook path.
export const syncReturnTracking = async (order, { force = false, staleMs = TRACKING_STALE_MS } = {}) => {
    if (!isReturnTrackable(order)) return false;
    if (!force && !isReturnTrackingStale(order, staleMs)) return false;

    try {
        const trackingData = extractTrackingData(await trackShipment(order.refundDetails.pickup.awb));
        const pickup = order.refundDetails.pickup;
        pickup.lastTrackedAt = new Date();

        const shipmentTrack = trackingData?.shipment_track?.[0];
        const activities = trackingData?.shipment_track_activities || [];

        if (activities.length) {
            pickup.trackingHistory = mergeTrackingHistory(pickup.trackingHistory, activities.map(act => ({
                status: mapShiprocketStatus(act.status || act.activity)?.shiprocketStatus || 'UNKNOWN',
                activity: act.activity || act.status || '',
                location: act.location || '',
                date: act.date
            })));
        }

        if (shipmentTrack?.courier_name && !pickup.courier) pickup.courier = shipmentTrack.courier_name;

        const mapped = mapShiprocketStatus(shipmentTrack?.current_status || trackingData?.shipment_status);
        if (mapped) {
            // Prefer the courier's own scan time for the status we're applying,
            // so pickupDate lands on when the parcel was actually collected
            // rather than whenever this poll happened to run.
            const scan = activities.find(act => mapShiprocketStatus(act.status || act.activity)?.shiprocketStatus === mapped.shiprocketStatus);
            const scanDate = scan?.date ? new Date(scan.date) : new Date();
            applyReturnPickupStatus(order, mapped.shiprocketStatus, isNaN(scanDate.getTime()) ? new Date() : scanDate);
        }

        await order.save();
        return true;
    } catch (error) {
        console.error(`Error syncing return tracking for order ${order._id}:`, error.message);
        return false;
    }
};

// Capped fan-out for list views, matching the forward leg's behaviour: newest
// first, whatever doesn't fit gets refreshed on the next load.
export const syncReturnsTracking = async (orders, { limit = 8, staleMs = TRACKING_STALE_MS } = {}) => {
    const candidates = orders
        .filter(order => isReturnTrackable(order) && isReturnTrackingStale(order, staleMs))
        .sort((a, b) => (b.date || 0) - (a.date || 0))
        .slice(0, limit);

    if (!candidates.length) return;
    await Promise.all(candidates.map(order => syncReturnTracking(order, { staleMs })));
};

export default { applyReturnPickupStatus, syncReturnTracking, syncReturnsTracking, isReturnTrackable };
