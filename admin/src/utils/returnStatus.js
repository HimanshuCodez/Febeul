// Presentation layer for the return journey. Mirrors the vocabulary in
// backend/utils/returnStatus.js — the backend computes the status, this file
// only decides how it looks. Nothing here re-derives a status: if a rule lives
// in two places it eventually disagrees with itself.

export const RETURN_TABS = [
  {
    key: 'in_transit',
    label: 'In Transit',
    hint: 'Picked up, under the critical threshold',
    accent: 'blue',
    statuses: ['RETURN_REQUESTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'],
  },
  {
    key: 'critical',
    label: 'Critical Return',
    hint: 'Past the threshold — chase the courier',
    accent: 'amber',
    statuses: ['CRITICAL_RETURN', 'INVESTIGATION_OPEN'],
  },
  {
    key: 'qc_pending',
    label: 'QC Pending',
    hint: 'Back at the warehouse, awaiting inspection',
    accent: 'violet',
    statuses: ['RECEIVED', 'LATE_RECEIVED'],
  },
  {
    key: 'refund_pending',
    label: 'Refund Pending',
    hint: 'Inspected — money still to go out',
    accent: 'emerald',
    statuses: ['QC_PASS', 'QC_FAIL'],
  },
  {
    key: 'lost',
    label: 'Lost Return',
    hint: 'Written off — recover from the courier',
    accent: 'red',
    statuses: ['LOST_RETURN', 'COURIER_CLAIM_PENDING', 'CLAIM_APPROVED', 'CLAIM_REJECTED'],
  },
  {
    key: 'completed',
    label: 'Completed',
    hint: 'Settled and closed',
    accent: 'slate',
    statuses: ['REFUND_COMPLETED'],
  },
];

export const STATUS_META = {
  RETURN_REQUESTED: { label: 'Return Requested', tone: 'slate' },
  PICKUP_SCHEDULED: { label: 'Pickup Scheduled', tone: 'blue' },
  PICKED_UP: { label: 'Picked Up', tone: 'blue' },
  IN_TRANSIT: { label: 'In Transit', tone: 'blue' },
  CRITICAL_RETURN: { label: 'Critical Return', tone: 'amber' },
  INVESTIGATION_OPEN: { label: 'Investigation Open', tone: 'amber' },
  LOST_RETURN: { label: 'Lost Return', tone: 'red' },
  COURIER_CLAIM_PENDING: { label: 'Courier Claim Pending', tone: 'red' },
  CLAIM_APPROVED: { label: 'Claim Approved', tone: 'emerald' },
  CLAIM_REJECTED: { label: 'Claim Rejected', tone: 'red' },
  RECEIVED: { label: 'Received at Warehouse', tone: 'violet' },
  LATE_RECEIVED: { label: 'Late Received', tone: 'violet' },
  QC_PASS: { label: 'QC Pass', tone: 'emerald' },
  QC_FAIL: { label: 'QC Fail', tone: 'red' },
  REFUND_COMPLETED: { label: 'Refund Completed', tone: 'slate' },
};

// Tailwind can't see class names built at runtime, so every variant is written
// out in full here rather than interpolated.
export const TONES = {
  slate: { chip: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400', solid: 'bg-slate-900', text: 'text-slate-600', soft: 'bg-slate-50 border-slate-100', ring: 'ring-slate-200' },
  blue: { chip: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', solid: 'bg-blue-600', text: 'text-blue-600', soft: 'bg-blue-50 border-blue-100', ring: 'ring-blue-200' },
  amber: { chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', solid: 'bg-amber-500', text: 'text-amber-600', soft: 'bg-amber-50 border-amber-100', ring: 'ring-amber-200' },
  violet: { chip: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500', solid: 'bg-violet-600', text: 'text-violet-600', soft: 'bg-violet-50 border-violet-100', ring: 'ring-violet-200' },
  emerald: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', solid: 'bg-emerald-600', text: 'text-emerald-600', soft: 'bg-emerald-50 border-emerald-100', ring: 'ring-emerald-200' },
  red: { chip: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', solid: 'bg-red-600', text: 'text-red-600', soft: 'bg-red-50 border-red-100', ring: 'ring-red-200' },
};

// History entries also record actions that aren't statuses (a follow-up call, a
// cleared override). They share the same timeline, so they need labels too.
const ACTION_META = {
  REFUND_INITIATED: { label: 'Refund Initiated', tone: 'emerald' },
  FOLLOW_UP: { label: 'Follow-up', tone: 'amber' },
  OVERRIDE_CLEARED: { label: 'Override Cleared', tone: 'slate' },
  REQUEST_REJECTED: { label: 'Request Rejected', tone: 'red' },
  REQUEST_CANCELLED: { label: 'Request Withdrawn', tone: 'slate' },
  PICKUP_SCHEDULING_FAILED: { label: 'Pickup Scheduling Failed', tone: 'amber' },
  CLAIM_PENDING: { label: 'Claim Pending', tone: 'red' },
  CLAIM_FILED: { label: 'Claim Filed', tone: 'red' },
  CLAIM_APPROVED: { label: 'Claim Approved', tone: 'emerald' },
  CLAIM_REJECTED: { label: 'Claim Rejected', tone: 'red' },
};

const metaOf = (status) => STATUS_META[status] || ACTION_META[status];

export const toneOf = (status) => TONES[metaOf(status)?.tone || 'slate'];
export const labelOf = (status) => metaOf(status)?.label || status || '—';

// Statuses an admin is allowed to force. Receipt, QC and settlement are
// recorded through their own actions — they carry evidence with them, so they
// are never a dropdown choice.
export const MANUAL_STATUS_OPTIONS = [
  'CRITICAL_RETURN',
  'INVESTIGATION_OPEN',
  'LOST_RETURN',
  'COURIER_CLAIM_PENDING',
  'CLAIM_APPROVED',
  'CLAIM_REJECTED',
];

export const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';

// Date input needs yyyy-MM-dd in local time; toISOString would shift it a day
// backwards for anyone east of UTC, which is everyone using this panel.
export const toDateInputValue = (date = new Date()) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};
