const validDate = value => value !== null && value !== undefined && value !== '' && Number.isFinite(new Date(value).getTime());
const ordinalSuffix = day => {
  if (day > 3 && day < 21) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' })[day % 10] || 'th';
};

export function formatMilestoneDate(value) {
  if (!validDate(value)) return null;
  const date = new Date(value);
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  return `${weekday}, ${day}${ordinalSuffix(day)} ${month} '${String(date.getFullYear()).slice(-2)}`;
}

export function formatMilestoneTime(value) {
  if (!validDate(value)) return null;
  return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase().replace(/\s/g, '');
}
