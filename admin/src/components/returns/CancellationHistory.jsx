import { refundAmount, refundStatus } from '../../utils/requestCategory';

export default function CancellationHistory({ order, busy, onRetry }) {
  const refund = order.refundDetails || {};
  const cancellation = order.cancellation || {};
  const status = refundStatus(order);
  const events = [...(refund.returnTracking?.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const prepaid = order.payment && ['Razorpay', 'Stripe'].includes(order.paymentMethod);
  return (
    <section aria-label="Cancellation and refund history" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h4 className="font-bold text-slate-900">Cancellation & refund history</h4>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-slate-500">Cancelled by</dt><dd className="font-medium capitalize">{cancellation.requestedByName || cancellation.requestedBy || 'Not recorded (older order)'}</dd></div>
        <div><dt className="text-slate-500">Refund status</dt><dd className="font-medium capitalize">{status === 'none' ? 'No refund due' : status}</dd></div>
        <div><dt className="text-slate-500">Refund amount</dt><dd className="font-medium">₹{Number(refundAmount(order)).toFixed(2)}</dd></div>
        <div><dt className="text-slate-500">Attempts</dt><dd>{refund.attempts || 0}</dd></div>
      </dl>
      {refund.id && <p className="break-all text-xs text-slate-600">Gateway reference: {refund.id}{refund.gatewayStatus ? ` (${refund.gatewayStatus})` : ''}</p>}
      {refund.lastError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{refund.lastError}</p>}
      {cancellation.stockError && <p className="text-sm text-amber-800">{cancellation.stockError}</p>}
      {cancellation.shipmentError && <p className="text-sm text-amber-800">{cancellation.shipmentError}</p>}
      {refund.autoProcess && refund.nextRetryAt && <p className="text-xs text-slate-500">Next automatic check: {new Date(refund.nextRetryAt).toLocaleString()}</p>}
      {prepaid && status !== 'rejected' && (status !== 'completed' || refund.id) && <button type="button" disabled={busy} onClick={onRetry} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Checking refund…' : refund.id ? 'Check refund status' : 'Retry full refund'}</button>}
      {!order.payment && <p className="text-sm text-slate-600">No payment was collected. This cancellation has no refund due.</p>}
      <ol className="space-y-3 border-t border-slate-100 pt-4">
        {events.length ? events.map((event, index) => <li key={event._id || index} className="border-l-2 border-rose-200 pl-3"><p className="text-sm font-semibold text-slate-800">{event.status.replaceAll('_', ' ')}</p><p className="mt-1 break-words text-sm text-slate-600">{event.note}</p><p className="mt-1 text-xs text-slate-400">{new Date(event.date).toLocaleString()} · {event.by || 'system'}</p></li>) : <li className="text-sm text-slate-500">Cancellation recorded{refund.requestedAt ? ` on ${new Date(refund.requestedAt).toLocaleString()}` : ''}. Detailed history was not recorded for this older order.</li>}
      </ol>
    </section>
  );
}
