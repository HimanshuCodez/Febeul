import { parseTrackingDate } from './trackingDates.js';

const normalizeStatus = value => String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
const milestoneStatuses = {
  confirmed: ['ORDER_PLACED', 'NEW', 'PICKUP_SCHEDULED'],
  shipped: ['AWB_ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'PICKED_UP'],
  out_for_delivery: ['OUT_FOR_DELIVERY'],
  delivered: ['DELIVERED'],
};

export function getDeliveryActivities(order, trackingData) {
  const scans = order.shiprocket?.trackingHistory?.length
    ? order.shiprocket.trackingHistory : trackingData?.tracking_data?.shipment_track_activities || [];
  return scans.flatMap(scan => {
    const date = parseTrackingDate(scan?.date);
    if (!date) return [];
    return [{ ...scan, status: normalizeStatus(scan.status), date: date.toISOString(),
      activity: /shiprocket/i.test(scan.activity || '') ? '' : scan.activity }];
  }).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export function getDeliveryMilestoneDate(order, key, activities = []) {
  const recorded = { confirmed: order.date, shipped: order.shippedAt, delivered: order.deliveredAt };
  const at = parseTrackingDate(recorded[key]);
  if (at) return at;
  // Milestones record when a stage began. Later courier scans are updates.
  return activities.filter(activity => milestoneStatuses[key]?.includes(normalizeStatus(activity.status)))
    .map(activity => parseTrackingDate(activity.date)).filter(Boolean)
    .sort((a, b) => a - b)[0] || null;
}
