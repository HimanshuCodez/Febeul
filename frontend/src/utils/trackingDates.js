export function parseTrackingDate(value) {
  if (value == null || value === '' || !['string', 'number'].includes(typeof value) && !(value instanceof Date)) return null;
  let timestamp = value;
  if (typeof timestamp === 'string') {
    timestamp = timestamp.trim();
    if (!timestamp) return null;
    const parts = timestamp.match(/^(\d{2}) (\d{2}) (\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (parts) timestamp = `${parts[3]}-${parts[2]}-${parts[1]}T${parts[4]}:${parts[5]}:${parts[6]}`;
    // Raw courier dates use India time; API timestamps with offsets keep theirs.
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(timestamp)) timestamp = `${timestamp.replace(' ', 'T')}+05:30`;
  }
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date : null;
}
const ordinalSuffix = day => {
  if (day > 3 && day < 21) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' })[day % 10] || 'th';
};

export function formatMilestoneDate(value) {
  const date = parseTrackingDate(value);
  if (!date) return null;
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  return `${weekday}, ${day}${ordinalSuffix(day)} ${month} '${String(date.getFullYear()).slice(-2)}`;
}

export function formatMilestoneTime(value) {
  const date = parseTrackingDate(value);
  if (!date) return null;
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase().replace(/\s/g, '');
}
