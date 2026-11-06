const UnreadTicketBadge = ({ count, className = '' }) => count > 0 ? (
  <span
    aria-label={`${count} unread customer messages`}
    className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-pink-500 px-1.5 text-[10px] font-semibold leading-none text-white ${className}`}
  >
    {count}
  </span>
) : null;

export default UnreadTicketBadge;
