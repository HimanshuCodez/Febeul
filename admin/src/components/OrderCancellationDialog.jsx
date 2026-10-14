import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';

export default function OrderCancellationDialog({ order, busy, error, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const dialog = useRef(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const prepaid = order.payment && ['Razorpay', 'Stripe'].includes(order.paymentMethod);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('textarea')?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape' && !busyRef.current) onClose();
      if (event.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled), textarea:not(:disabled)')];
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="cancel-order-title" aria-describedby="cancel-order-description" aria-busy={busy} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><AlertCircle className="mb-3 text-red-500" size={28} /><h2 id="cancel-order-title" className="text-xl font-bold text-slate-900">Cancel this order?</h2><p className="mt-1 break-all text-sm text-slate-500">#{order.orderItemId || order._id}</p></div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Close cancellation dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={20} /></button>
        </div>
        <p id="cancel-order-description" className="mt-4 text-sm leading-relaxed text-slate-600">The customer will see this order as cancelled. {prepaid ? `A full refund of ₹${Number(order.orderTotal).toFixed(2)} will be requested through ${order.paymentMethod} to the original payment source.` : order.payment ? 'This collected COD payment needs a manual payout, which will be recorded for review.' : 'This order is unpaid. No refund is due.'}</p>
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800">{prepaid ? 'The refund status and any payment provider error will appear in Refund Requests.' : 'The cancellation will remain in order and refund history.'}</div>
        <label htmlFor="admin-cancellation-reason" className="mb-2 mt-5 block text-sm font-medium text-slate-700">Reason <span className="font-normal text-slate-400">(optional, visible to customer)</span></label>
        <textarea id="admin-cancellation-reason" value={reason} onChange={event => setReason(event.target.value)} disabled={busy} maxLength={500} rows={3} placeholder="For example, item unavailable" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 disabled:opacity-40">No, keep order</button>
          <button type="button" onClick={() => onConfirm(reason)} disabled={busy} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{busy ? 'Cancelling…' : prepaid ? 'Yes, cancel & refund' : 'Yes, cancel order'}</button>
        </div>
      </div>
    </div>, document.body,
  );
}
