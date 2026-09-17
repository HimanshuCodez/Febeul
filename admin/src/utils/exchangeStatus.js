// Presentation layer for exchange tickets. Mirrors the vocabulary in
// backend/utils/exchangeStatus.js — the backend decides status and which
// queue bucket a row belongs to (`row.view.bucket`), this file only decides
// how it looks. Nothing here re-derives a bucket or a status.

import { TONES } from './returnStatus';

export { TONES };

export const EXCHANGE_TABS = [
  { key: 'approval', label: 'Awaiting Approval', hint: 'New requests to verify', accent: 'slate' },
  { key: 'pickup', label: 'Pickup', hint: 'Approved — schedule or awaiting reverse pickup', accent: 'blue' },
  { key: 'in_transit', label: 'In Transit', hint: 'Picked up, on its way to the warehouse', accent: 'blue' },
  { key: 'qc_pending', label: 'QC Pending', hint: 'At the warehouse, awaiting inspection', accent: 'violet' },
  { key: 'ready_to_dispatch', label: 'Ready to Dispatch', hint: 'QC passed — dispatch the replacement', accent: 'emerald' },
  { key: 'needs_refund', label: 'QC Failed', hint: 'Could not be exchanged — redirect to refund', accent: 'red' },
  { key: 'shipped', label: 'Shipped', hint: 'Replacement on its way to the customer', accent: 'emerald' },
  { key: 'closed', label: 'Closed', hint: 'Delivered, rejected, or expired', accent: 'slate' },
];

export const STATUS_META = {
  REQUESTED: { label: 'Requested', tone: 'slate' },
  VERIFICATION_REJECTED: { label: 'Rejected', tone: 'red' },
  VERIFICATION_APPROVED: { label: 'Approved', tone: 'blue' },
  PICKUP_SCHEDULED: { label: 'Pickup Scheduled', tone: 'blue' },
  PICKUP_FAILED: { label: 'Pickup Failed', tone: 'amber' },
  PICKED_UP: { label: 'Picked Up', tone: 'blue' },
  RECEIVED_AT_WAREHOUSE: { label: 'Received at Warehouse', tone: 'violet' },
  QC_FAILED: { label: 'QC Failed', tone: 'red' },
  NEW_PRODUCT_DISPATCHED: { label: 'Replacement Dispatched', tone: 'emerald' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', tone: 'emerald' },
  DELIVERED: { label: 'Delivered', tone: 'emerald' },
  EXPIRED: { label: 'Window Expired', tone: 'slate' },
};

export const REASON_LABELS = {
  wrong_item: 'Wrong Item Delivered',
  damaged: 'Damaged / Defective',
};

export const toneOf = (status) => TONES[STATUS_META[status]?.tone || 'slate'];
export const labelOf = (status) => STATUS_META[status]?.label || status || '—';

export const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';
