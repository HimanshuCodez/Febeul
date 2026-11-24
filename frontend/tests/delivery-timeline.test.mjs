import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { getDeliveryActivities, getDeliveryMilestoneDate } from '../src/utils/deliveryTimeline.js';
import { parseTrackingDate, formatMilestoneDate, formatMilestoneTime } from '../src/utils/trackingDates.js';
import { buildAdminOrderTracking } from '../../backend/utils/adminOrderTracking.js';

const shippedAt = '2026-11-04T08:45:00.000Z';
const scans = [
  { status: 'SHIPPED', activity: 'Courier collected the parcel.', date: shippedAt },
  { status: 'IN_TRANSIT', activity: 'Parcel reached the next hub.', date: '2026-11-05T10:00:00.000Z' },
];

test('customer shipped milestone uses the same recorded timestamp as admin, independently of later courier scans', () => {
  const order = { date: '2026-11-03T02:00:00Z', shippedAt, orderStatus: 'Shipped', shiprocket: { trackingHistory: scans } };
  const activities = getDeliveryActivities(order);
  const admin = buildAdminOrderTracking(order).journeys[0].milestones.find(step => step.key === 'shipped');
  assert.equal(getDeliveryMilestoneDate(order, 'shipped', activities).toISOString(), admin.at);
  assert.equal(activities.at(-1).date, '2026-11-05T10:00:00.000Z');
  assert.equal(getDeliveryMilestoneDate(order, 'shipped', [...activities, { status: 'IN_TRANSIT', date: '2026-11-06T12:00:00Z' }]).toISOString(), shippedAt);
});

test('the recorded shipped date remains available without courier history', () => {
  assert.equal(getDeliveryMilestoneDate({ shippedAt }, 'shipped').toISOString(), shippedAt);
  assert.equal(getDeliveryMilestoneDate({}, 'shipped'), null);
});

test('missing milestone dates fall back to the earliest appropriate scan and ignore invalid dates', () => {
  const order = { shiprocket: { trackingHistory: [scans[1], { status: 'SHIPPED', date: 'invalid' }, { status: 'PICKED UP', date: shippedAt }] } };
  const activities = getDeliveryActivities(order);
  assert.equal(activities.length, 2);
  assert.equal(activities[0].status, 'PICKED_UP');
  assert.equal(getDeliveryMilestoneDate(order, 'shipped', activities).toISOString(), shippedAt);
  assert.equal(getDeliveryMilestoneDate(order, 'out_for_delivery', activities), null);
});

test('persisted history takes priority and raw courier activity times are normalized without inventing dates', () => {
  const tracking = { tracking_data: { shipment_track_activities: [{ status: 'SHIPPED', date: '04 11 2026 14:15:00', activity: 'Picked up' }] } };
  assert.equal(getDeliveryActivities({}, tracking)[0].date, shippedAt);
  assert.equal(getDeliveryActivities({ shiprocket: { trackingHistory: scans } }, tracking).length, 2);
  for (const value of [null, undefined, '', 'invalid', {}]) {
    assert.equal(parseTrackingDate(value), null);
    assert.equal(formatMilestoneDate(value), null);
    assert.equal(formatMilestoneTime(value), null);
  }
});

test('raw India courier times and persisted UTC timestamps format identically in different browser/server timezones', () => {
  const module = new URL('../src/utils/trackingDates.js', import.meta.url).href;
  const script = `import { parseTrackingDate, formatMilestoneDate, formatMilestoneTime } from ${JSON.stringify(module)};
    const values = ['2026-11-04T08:45:00.000Z', '2026-11-04T14:15:00+05:30', '2026-11-04 14:15:00', '04 11 2026 14:15:00'];
    console.log(JSON.stringify(values.map(value => [parseTrackingDate(value).toISOString(), formatMilestoneDate(value), formatMilestoneTime(value)])));`;
  for (const timezone of ['UTC', 'Asia/Kolkata', 'America/Los_Angeles']) {
    const rows = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' }));
    for (const row of rows) assert.deepEqual(row, rows[0], timezone);
    assert.equal(rows[0][0], shippedAt);
  }
});
