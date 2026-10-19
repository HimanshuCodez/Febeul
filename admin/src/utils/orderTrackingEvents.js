export const ORDER_TRACKING_CHANGED = 'febeul:order-tracking-changed';
export const ORDER_TRACKING_STORAGE_KEY = 'febeul:order-tracking-version';

// Keep another open Orders tab in step with successful queue/drawer actions.
// No customer or order data is stored in the cross-tab notification.
export function notifyOrderTrackingChanged() {
  window.dispatchEvent(new Event(ORDER_TRACKING_CHANGED));
  try { localStorage.setItem(ORDER_TRACKING_STORAGE_KEY, `${Date.now()}-${Math.random()}`); } catch { /* Polling/focus refresh still works without storage. */ }
}

export function isOrderTrackingMutation(response) {
  if (!response.data?.success || !['post', 'put', 'patch', 'delete'].includes(response.config?.method?.toLowerCase())) return false;
  const path = new URL(response.config.url, window.location.origin).pathname;
  return /^\/api\/(order|refund|return|exchange)\//.test(path) && !/\/(list|userorders)$/.test(path);
}
