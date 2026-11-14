/* eslint-disable react/prop-types -- ReturnDrawer supplies the authenticated return. */
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Landmark } from 'lucide-react';
import { getReturnRefundBlockReason } from '../../../../shared/returnWorkflow';
import { fmtDateTime } from '../../utils/returnStatus';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500';
const buttonClass = 'rounded-xl px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50';
const failedStates = ['failed', 'reversed', 'cancelled', 'rejected'];

export default function CodRefundSettlement({ request, onAction, busy }) {
  const refund = request.refundDetails || {}, payout = refund.payout || {}, tracking = refund.returnTracking || {};
  const destination = refund.customerPayoutDetails || {};
  const completed = refund.status === 'completed';
  const failed = failedStates.includes(payout.status);
  const checking = Boolean(payout.key) && !failed && !completed;
  const blocked = getReturnRefundBlockReason(request);
  const [mode, setMode] = useState('full');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState(refund.payoutNote || '');
  useEffect(() => setNote(refund.payoutNote || ''), [refund.payoutNote]);
  const value = mode === 'partial' ? Number(amount) : Number(request.orderTotal);
  const validAmount = Number.isFinite(value) && value >= 1 && value <= request.orderTotal
    && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
  const pay = () => {
    if (checking) return onAction('cod-payout', { orderId: request._id, note });
    if (!window.confirm(`${failed ? 'Retry paying' : 'Pay'} ₹${value.toFixed(2)} to the customer’s selected ${destination.type === 'upi' ? 'UPI ID' : 'bank account'} through RazorpayX?`)) return;
    return onAction('cod-payout', { orderId: request._id, amount: value, note, retry: failed });
  };
  return <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5">
    {completed ? <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
      <p className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={17} />Refund completed</p>
      <p className="text-2xl font-black text-slate-900">₹{Number(refund.amount || 0).toFixed(2)}</p>
      {tracking.refundUtr && <p className="break-all text-sm text-emerald-800">UTR: {tracking.refundUtr}</p>}
      {refund.id && <p className="break-all text-xs text-slate-600">Payment reference: {refund.id}</p>}
      <p className="text-xs text-slate-500">{fmtDateTime(tracking.refundPaidAt || refund.processedAt)}{tracking.refundDecidedBy ? ` · by ${tracking.refundDecidedBy}` : ''}</p>
      {refund.isPartialRefund && <p className="text-xs font-bold text-amber-700">Partial refund</p>}
    </div> : <>
      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-700"><Landmark size={16} />COD payout · {destination.type === 'upi' ? 'UPI' : 'Bank transfer'}</p>
        {destination.type === 'upi' ? <p className="break-all font-mono text-sm">{destination.upiId}</p>
          : destination.type === 'bank' ? <div className="space-y-1 break-all text-sm"><p>{destination.accountHolderName} · {destination.bankName}</p><p>Account: {destination.bankAccount}</p><p>IFSC: {destination.ifsc}</p></div>
            : <p className="text-sm text-red-700">No payout details on file. Ask the customer to provide their UPI ID or bank details.</p>}
      </div>
      {payout.id && <p className="break-all text-xs text-slate-500">Payout reference: {payout.id}</p>}
      {checking && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{payout.status === 'unknown' || payout.status === 'creating' ? 'The payment outcome is being checked. The original amount is locked to prevent duplicate payments.' : `Refund processing (${payout.status}). ₹${Number(refund.amount || 0).toFixed(2)} is awaiting payment confirmation.`}</p>}
      {payout.adminError && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800"><p className="flex items-center gap-2 font-bold"><AlertTriangle size={16} />Payout needs attention</p><p className="mt-1 break-words">{payout.adminError}</p></div>}
      {blocked && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{blocked}</p>}
      {!checking && !blocked && <>
        <div className="flex flex-wrap gap-2" aria-label="COD refund amount">
          {[['full', 'Full refund'], ['partial', 'Partial refund']].map(([choice, label]) => <button key={choice} type="button" aria-pressed={mode === choice} disabled={busy} onClick={() => setMode(choice)} className={`${buttonClass} border ${mode === choice ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>{label}</button>)}
        </div>
        {mode === 'partial' && <label className="block space-y-1 text-sm font-semibold">Refund amount<input aria-label="COD refund amount" type="number" min="1" max={request.orderTotal} step="0.01" value={amount} onChange={event => setAmount(event.target.value)} disabled={busy} className={inputClass} /></label>}
        <p className="text-sm text-slate-500">{mode === 'partial' ? 'Partial' : 'Full'} refund: ₹{Number.isFinite(value) ? value.toFixed(2) : '0.00'} · Maximum ₹{Number(request.orderTotal).toFixed(2)}</p>
      </>}
    </>}
    <label className="block space-y-1 text-sm font-semibold">Note to customer<textarea aria-label="Note to customer" rows={3} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="Explain any delay, invalid payout details or partial refund. This note appears on the customer’s order page." className={inputClass} /></label>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy || note.trim() === (refund.payoutNote || '')} onClick={() => onAction('payout-note', { orderId: request._id, note })} className={`${buttonClass} border border-slate-200 text-slate-700`}>Save customer note</button>
      {!completed && <button type="button" disabled={busy || (!checking && (Boolean(blocked) || !destination.type || !validAmount))} onClick={pay} className={`${buttonClass} bg-emerald-600 text-white`}>{checking ? 'Check payout status' : failed && payout.key ? 'Retry payout' : mode === 'partial' ? 'Pay partial refund' : 'Pay refund'}</button>}
    </div>
  </div>;
}
