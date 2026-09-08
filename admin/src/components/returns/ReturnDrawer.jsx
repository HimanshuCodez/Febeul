import React, { useState, useMemo, useRef } from 'react';
import {
  X, User, MessageSquare, Truck, PackageCheck, ClipboardCheck, Banknote,
  Search, ShieldAlert, History, Camera, Upload, AlertTriangle, CheckCircle2,
  XCircle, Clock, CalendarDays, Info, PhoneCall, Landmark, Undo2, Lock
} from 'lucide-react';
import { currency } from '../../App';
import {
  toneOf, labelOf, MANUAL_STATUS_OPTIONS, STATUS_META, fmtDate, fmtDateTime, toDateInputValue
} from '../../utils/returnStatus';

// Small building blocks kept local — they exist to make the panels below read
// as a list of actions rather than a wall of Tailwind.
const Section = ({ icon: Icon, title, subtitle, children, accent = 'text-slate-400' }) => (
  <section className="space-y-4">
    <div>
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Icon size={12} className={accent} /> {title}
      </h4>
      {subtitle && <p className="text-[11px] text-slate-400 font-medium mt-1">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 placeholder:text-slate-400 placeholder:font-medium';

const Btn = ({ children, variant = 'dark', className = '', ...props }) => {
  const variants = {
    dark: 'bg-slate-900 text-white hover:bg-black disabled:bg-slate-300',
    emerald: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
    red: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    amber: 'bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-200',
    ghost: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50',
  };
  return (
    <button
      {...props}
      className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Stat = ({ label, value, sub, tone = 'text-white' }) => (
  <div>
    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">{label}</p>
    <p className={`text-2xl font-black leading-tight ${tone}`}>{value}</p>
    {sub && <p className="text-[10px] font-bold opacity-60 mt-0.5">{sub}</p>}
  </div>
);

const ReturnDrawer = ({ request, onClose, onAction, onApprove, onReject, busy }) => {
  const view = request.view || {};
  const refund = request.refundDetails || {};
  const rt = refund.returnTracking || {};
  const pickup = refund.pickup || {};
  const tone = toneOf(view.status);

  const [pickupDate, setPickupDate] = useState(toDateInputValue());
  const [receivedDate, setReceivedDate] = useState(toDateInputValue());
  const [receivedNote, setReceivedNote] = useState('');
  const [qcResult, setQcResult] = useState('PASS');
  const [qcNotes, setQcNotes] = useState('');
  const [qcPhotos, setQcPhotos] = useState([]);
  const [utr, setUtr] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleReason, setSettleReason] = useState('');
  const [ticket, setTicket] = useState(rt.investigationTicket || '');
  const [investigationNote, setInvestigationNote] = useState('');
  const [followup, setFollowup] = useState('');
  const [claimStatus, setClaimStatus] = useState(rt.claimStatus && rt.claimStatus !== 'none' ? rt.claimStatus : 'filed');
  const [claimAmount, setClaimAmount] = useState(rt.claimAmount || '');
  const [claimReference, setClaimReference] = useState(rt.claimReference || '');
  const [claimNotes, setClaimNotes] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [lateNote, setLateNote] = useState('');
  const [approvalMode, setApprovalMode] = useState('full');
  const [approvalAmount, setApprovalAmount] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const photoInputRef = useRef(null);

  const awaitingApproval = refund.status === 'pending';

  const settled = refund.status === 'completed';
  const received = !!rt.receivedDate;
  const qcDone = !!rt.qcResult;
  const isLostFamily = ['LOST_RETURN', 'COURIER_CLAIM_PENDING', 'CLAIM_APPROVED', 'CLAIM_REJECTED'].includes(view.status);

  // The append-only trail, newest first. Never mutated here — the drawer only
  // ever reads it.
  const history = useMemo(
    () => [...(rt.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [rt.history]
  );

  const submitQc = () => {
    if (qcResult === 'FAIL' && qcPhotos.length === 0) return; // guarded again server-side
    const form = new FormData();
    form.append('orderId', request._id);
    form.append('result', qcResult);
    form.append('notes', qcNotes);
    qcPhotos.forEach((file) => form.append('photos', file));
    onAction('quality-check', form, { multipart: true });
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-7 py-5 bg-white border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${tone.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                {labelOf(view.status)}
              </span>
              {view.isManual && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white">
                  <Lock size={9} /> Manual
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-2 truncate">
              #{request.orderItemId || request._id.slice(-8).toUpperCase()}
            </h3>
            <p className="text-[11px] text-slate-400 font-bold truncate">{request._id}</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-900 hover:text-white transition-all text-slate-400 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Clock hero — the three numbers that decide every action below */}
        <div className="px-7 py-5 bg-slate-900 text-white shrink-0">
          <div className="grid grid-cols-3 gap-4">
            <Stat
              label="Days since pickup"
              value={view.daysSincePickup ?? '—'}
              sub={rt.pickupDate ? `Day 0 · ${fmtDate(rt.pickupDate)}` : 'Not picked up yet'}
            />
            <Stat
              label={received ? 'Transit days' : 'Critical at'}
              value={received ? (view.transitDays ?? '—') : `${view.thresholds?.returnCriticalDays ?? 10}d`}
              sub={received ? `Received ${fmtDate(rt.receivedDate)}` : `Lost at ${view.thresholds?.returnLostDays ?? 50}d`}
            />
            <Stat
              label="Refund deadline"
              value={settled ? 'Paid' : view.daysToRefundDeadline === null || view.daysToRefundDeadline === undefined ? '—' : view.refundOverdue ? `+${Math.abs(view.daysToRefundDeadline)}d` : `${view.daysToRefundDeadline}d`}
              sub={settled ? fmtDate(rt.refundPaidAt || refund.processedAt) : view.refundDueDate ? `Due ${fmtDate(view.refundDueDate)}` : 'Starts at pickup'}
              tone={view.refundOverdue ? 'text-red-400' : settled ? 'text-emerald-400' : 'text-white'}
            />
          </div>
          {view.refundOverdue && (
            <div className="mt-4 flex items-start gap-2.5 bg-red-500/15 border border-red-400/30 rounded-xl px-3.5 py-2.5">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-[11px] font-bold text-red-100 leading-relaxed">
                Past the {view.thresholds?.returnMaxRefundDays ?? 15}-day settlement promise. Pay the customer now and recover from the courier
                separately — a chargeback costs more than the parcel.
              </p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8">
          {/* Approval gate — the decision that starts the journey. Approving
              schedules the reverse pickup and pushes the money for prepaid
              orders; everything below only becomes relevant afterwards. */}
          {awaitingApproval && (
            <Section icon={ClipboardCheck} title="Approval Decision" subtitle="Approving schedules the courier pickup and settles prepaid orders through the gateway.">
              <div className="bg-white rounded-2xl border-2 border-slate-900 p-5 space-y-4 shadow-lg shadow-slate-900/5">
                {!showReject ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {[['full', 'Full Refund'], ['partial', 'Partial Refund']].map(([mode, label]) => (
                        <button
                          key={mode}
                          onClick={() => setApprovalMode(mode)}
                          className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${
                            approvalMode === mode ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {approvalMode === 'partial' ? (
                      <Field label={`Refund amount (max ${currency}${(request.orderTotal || 0).toFixed(2)})`}>
                        <input type="number" placeholder="0.00" value={approvalAmount} onChange={(e) => setApprovalAmount(e.target.value)} className={inputClass} />
                      </Field>
                    ) : (
                      <Field label="Fault attribution">
                        <select value={approvalReason} onChange={(e) => setApprovalReason(e.target.value)} className={inputClass}>
                          <option value="">Auto-calculate</option>
                          <option value="buyer_fault">Buyer fault (convenience fee deducted)</option>
                          <option value="seller_fault">Seller fault (full + charges)</option>
                          <option value="courier_fault">Courier fault (full + charges)</option>
                        </select>
                      </Field>
                    )}

                    <Field label="Comment for the customer">
                      <textarea rows="2" placeholder="Shown to the buyer with their refund" value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} className={inputClass} />
                    </Field>

                    <div className="flex gap-2">
                      <Btn
                        variant="dark"
                        className="flex-1"
                        disabled={busy || (approvalMode === 'partial' && !approvalAmount)}
                        onClick={() => onApprove({
                          orderId: request._id,
                          returnReason: approvalMode === 'full' ? approvalReason || undefined : undefined,
                          manualRefundAmount: approvalMode === 'partial' ? parseFloat(approvalAmount) : undefined,
                          adminRefundComment: approvalComment,
                          isPartialRefund: approvalMode === 'partial',
                        })}
                      >
                        Approve &amp; Schedule Pickup
                      </Btn>
                      <Btn variant="ghost" disabled={busy} onClick={() => setShowReject(true)}>Reject</Btn>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <Field label="Rejection reason (the customer sees this)">
                      <textarea rows="2" placeholder="Explain why this return can't be accepted" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className={inputClass} />
                    </Field>
                    <div className="flex gap-2">
                      <Btn variant="red" className="flex-1" disabled={busy || !rejectionReason.trim()} onClick={() => onReject({ orderId: request._id, rejectionReason })}>
                        Confirm Rejection
                      </Btn>
                      <Btn variant="ghost" onClick={() => { setShowReject(false); setRejectionReason(''); }}>Cancel</Btn>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {refund.status === 'rejected' && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-wider">Request rejected</p>
              <p className="text-xs font-bold text-red-800 italic mt-1.5">"{refund.rejectionReason || 'No reason recorded.'}"</p>
            </div>
          )}

          {/* Customer */}
          <Section icon={User} title="Customer">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white text-lg font-black uppercase shrink-0">
                {request.userId?.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <p className="font-black text-slate-900 truncate">{request.userId?.name || 'N/A'}</p>
                <p className="text-xs text-slate-500 font-medium truncate">{request.userId?.email}</p>
              </div>
              <div className="ml-auto text-right shrink-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Order value</p>
                <p className="text-lg font-black text-slate-900">{currency}{(request.orderTotal || 0).toFixed(2)}</p>
              </div>
            </div>
          </Section>

          {/* Request context */}
          <Section icon={MessageSquare} title="Request Context">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase">Customer's reason</p>
              <p className="text-sm text-slate-700 font-medium italic">"{refund.reason || 'No reason provided.'}"</p>
              <p className="text-[10px] text-slate-400 font-bold">Requested {fmtDateTime(refund.requestedAt)}</p>
              {refund.images?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {refund.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-100 hover:border-slate-900 transition-all">
                      <img src={img} alt="Customer evidence" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Courier leg */}
          <Section icon={Truck} title="Courier Leg" subtitle="Live from Shiprocket — refreshed whenever this queue is opened.">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Return AWB</p>
                  <p className="text-sm font-black text-slate-800 select-all break-all">{pickup.awb || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Courier</p>
                  <p className="text-sm font-black text-slate-800">{pickup.courier || '—'}</p>
                </div>
              </div>

              {pickup.status === 'failed' && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] font-bold text-amber-800">
                    Auto-scheduling failed: {pickup.failureReason || 'unknown error'}. Arrange collection manually in Shiprocket.
                  </p>
                </div>
              )}

              {pickup.trackingHistory?.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2 max-h-40 overflow-y-auto">
                  {[...pickup.trackingHistory].sort((a, b) => new Date(b.date) - new Date(a.date)).map((act, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${i === 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-700">{act.activity || act.status}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {fmtDateTime(act.date)}{act.location ? ` · ${act.location}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Day 0 fallback — only while the courier hasn't reported it */}
              {!rt.pickupDate && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <Info size={13} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] font-bold text-blue-800">
                      No pickup scan yet. Record it manually only if the courier has physically collected the parcel — every deadline counts from this date.
                    </p>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Field label="Pickup date (Day 0)">
                        <input type="date" max={toDateInputValue()} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className={inputClass} />
                      </Field>
                    </div>
                    <Btn disabled={busy} onClick={() => onAction('mark-picked-up', { orderId: request._id, pickupDate })}>
                      Set Day 0
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Warehouse receipt */}
          <Section icon={PackageCheck} title="Warehouse Receipt" subtitle="Recording receipt stops the clock permanently.">
            {received ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-violet-500 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {rt.lateDeliveredAt ? 'Received late' : 'Received'} · {fmtDateTime(rt.receivedDate)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold">
                      {view.transitDays !== null && view.transitDays !== undefined ? `${view.transitDays} days in transit` : 'Transit time unknown'}
                      {rt.lateMarkedBy ? ` · marked by ${rt.lateMarkedBy}` : ''}
                    </p>
                  </div>
                </div>
                {rt.lateNote && <p className="text-[11px] text-slate-600 font-medium italic mt-3 pl-8">"{rt.lateNote}"</p>}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                {isLostFamily && (
                  <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl p-3">
                    <Undo2 size={13} className="text-violet-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] font-bold text-violet-800">
                      This parcel is written off as lost. Marking it received keeps the lost record intact and adds the late arrival on top of it.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Received on">
                    <input type="date" max={toDateInputValue()} value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Note (optional)">
                    <input
                      type="text"
                      placeholder={isLostFamily ? 'e.g. arrived at hub 45 days late' : 'e.g. box opened, item present'}
                      value={isLostFamily ? lateNote : receivedNote}
                      onChange={(e) => (isLostFamily ? setLateNote(e.target.value) : setReceivedNote(e.target.value))}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Btn
                  variant={isLostFamily ? 'amber' : 'dark'}
                  disabled={busy}
                  className="w-full"
                  onClick={() =>
                    onAction(isLostFamily ? 'mark-late-received' : 'mark-received', {
                      orderId: request._id,
                      receivedDate,
                      note: isLostFamily ? lateNote : receivedNote,
                    })
                  }
                >
                  {isLostFamily ? 'Mark as Received (Late)' : 'Mark as Received'}
                </Btn>
              </div>
            )}
          </Section>

          {/* Quality check */}
          <Section icon={ClipboardCheck} title="Quality Check" subtitle="A failure without photos is unusable in a dispute, so it is refused.">
            {qcDone ? (
              <div className={`rounded-2xl border p-5 ${rt.qcResult === 'PASS' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <div className="flex items-center gap-2.5">
                  {rt.qcResult === 'PASS' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}
                  <p className={`text-sm font-black ${rt.qcResult === 'PASS' ? 'text-emerald-800' : 'text-red-800'}`}>
                    QC {rt.qcResult} · {fmtDateTime(rt.qcDate)}
                  </p>
                </div>
                <p className="text-[11px] font-bold text-slate-500 mt-1.5 pl-7">By {rt.qcBy || 'admin'}</p>
                {rt.qcNotes && <p className="text-xs text-slate-700 font-medium italic mt-3 pl-7">"{rt.qcNotes}"</p>}
                {rt.qcPhotos?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pl-7">
                    {rt.qcPhotos.map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform">
                        <img src={img} alt="QC evidence" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : !received ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-5 text-center">
                <Clock size={18} className="text-slate-300 mx-auto mb-2" />
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mark the parcel received first</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {['PASS', 'FAIL'].map((result) => (
                    <button
                      key={result}
                      onClick={() => setQcResult(result)}
                      className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                        qcResult === result
                          ? result === 'PASS'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                            : 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      QC {result}
                    </button>
                  ))}
                </div>

                <Field label={`Photos ${qcResult === 'FAIL' ? '(required)' : '(optional)'}`}>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setQcPhotos(Array.from(e.target.files || []).slice(0, 6))}
                    className="hidden"
                  />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed transition-all text-[11px] font-black uppercase tracking-widest ${
                      qcResult === 'FAIL' && qcPhotos.length === 0
                        ? 'border-red-200 bg-red-50 text-red-500 hover:border-red-400'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400'
                    }`}
                  >
                    {qcPhotos.length > 0 ? <Camera size={14} /> : <Upload size={14} />}
                    {qcPhotos.length > 0 ? `${qcPhotos.length} photo${qcPhotos.length > 1 ? 's' : ''} selected` : 'Upload photos'}
                  </button>
                  {qcPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {qcPhotos.map((file, i) => (
                        <span key={i} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[140px]">
                          {file.name}
                        </span>
                      ))}
                    </div>
                  )}
                </Field>

                <Field label="Inspection notes">
                  <textarea rows="2" placeholder="What condition was the item in?" value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} className={inputClass} />
                </Field>

                {qcResult === 'FAIL' && qcPhotos.length === 0 && (
                  <p className="text-[11px] font-bold text-red-500 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Attach at least one photo to record a failure.
                  </p>
                )}

                <Btn
                  variant={qcResult === 'PASS' ? 'emerald' : 'red'}
                  className="w-full"
                  disabled={busy || (qcResult === 'FAIL' && qcPhotos.length === 0)}
                  onClick={submitQc}
                >
                  Record QC {qcResult}
                </Btn>
              </div>
            )}
          </Section>

          {/* Settlement */}
          <Section icon={Banknote} title="Settlement" subtitle="The UTR is the only proof the customer was actually paid.">
            {settled ? (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Refund completed</p>
                  <p className="text-xl font-black text-emerald-800">{currency}{(refund.amount || 0).toFixed(2)}</p>
                </div>
                {rt.refundUtr && <p className="text-xs font-bold text-slate-700">UTR: <span className="select-all font-mono">{rt.refundUtr}</span></p>}
                {refund.id && <p className="text-xs font-bold text-slate-700">Gateway ref: <span className="select-all font-mono">{refund.id}</span></p>}
                <p className="text-[11px] text-slate-500 font-bold">
                  {fmtDateTime(rt.refundPaidAt || refund.processedAt)}{rt.refundDecidedBy ? ` · by ${rt.refundDecidedBy}` : ''}
                </p>
                {refund.isPartialRefund && (
                  <span className="inline-block text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">Partial refund</span>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                {/* Payout destination the customer gave us */}
                {request.paymentMethod === 'Razorpay' ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Prepaid · Razorpay</p>
                    <p className="text-xs font-bold text-slate-800 mt-1 break-all">
                      Payment ID: {request.razorpayPaymentId || request.paymentDetails?.razorpay_payment_id || 'N/A'}
                    </p>
                    <p className="text-[11px] text-blue-600 font-medium mt-1">
                      Approve from the Refund Requests queue to push it back through the gateway, or record a manual settlement below.
                    </p>
                  </div>
                ) : refund.customerPayoutDetails?.type ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 space-y-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark size={11} /> COD payout · {refund.customerPayoutDetails.type === 'upi' ? 'UPI' : 'Bank transfer'}
                    </p>
                    {refund.customerPayoutDetails.type === 'upi' ? (
                      <p className="text-sm font-black font-mono text-slate-800 select-all">{refund.customerPayoutDetails.upiId}</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-[9px] font-black text-emerald-600 uppercase block">Holder</span><span className="font-bold">{refund.customerPayoutDetails.accountHolderName}</span></div>
                        <div><span className="text-[9px] font-black text-emerald-600 uppercase block">IFSC</span><span className="font-bold font-mono">{refund.customerPayoutDetails.ifsc}</span></div>
                        <div className="col-span-2"><span className="text-[9px] font-black text-emerald-600 uppercase block">Account</span><span className="font-black font-mono select-all">{refund.customerPayoutDetails.bankAccount}</span></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-3.5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    No payout details on file
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="UTR / Bank reference">
                    <input type="text" placeholder="e.g. 4429XXXXXXX" value={utr} onChange={(e) => setUtr(e.target.value)} className={`${inputClass} font-mono`} />
                  </Field>
                  <Field label={`Amount (max ${currency}${(request.orderTotal || 0).toFixed(2)})`}>
                    <input
                      type="number"
                      placeholder={(refund.amount || request.orderTotal || 0).toFixed(2)}
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="Reason / comment">
                  <input type="text" placeholder="Why this amount?" value={settleReason} onChange={(e) => setSettleReason(e.target.value)} className={inputClass} />
                </Field>

                <div className="flex gap-2">
                  <Btn
                    variant="ghost"
                    className="flex-1"
                    disabled={busy || refund.status === 'initiated'}
                    onClick={() => onAction('refund-initiated', { orderId: request._id, note: settleReason })}
                  >
                    {refund.status === 'initiated' ? 'Already Initiated' : 'Mark Initiated'}
                  </Btn>
                  <Btn variant="emerald" className="flex-[2]" disabled={busy || !utr.trim()} onClick={() => onAction('refund-settlement', { orderId: request._id, utr, amount: settleAmount, reason: settleReason })}>
                    Record Payment & Close
                  </Btn>
                </div>
              </div>
            )}
          </Section>

          {/* Investigation */}
          <Section icon={Search} title="Courier Investigation">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
              {rt.investigationTicket && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Ticket #{rt.investigationTicket}</p>
                  <p className="text-[11px] font-bold text-slate-600 mt-1">
                    Opened {fmtDate(rt.investigationOpenedAt)}{rt.investigationBy ? ` by ${rt.investigationBy}` : ''}
                  </p>
                </div>
              )}

              {!settled && !received && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Field label={rt.investigationTicket ? 'Update ticket number' : 'Courier ticket number'}>
                      <input type="text" placeholder="e.g. DL88231" value={ticket} onChange={(e) => setTicket(e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                  <Btn variant="amber" disabled={busy || !ticket.trim()} onClick={() => onAction('investigation', { orderId: request._id, ticket, note: investigationNote })}>
                    {rt.investigationTicket ? 'Update' : 'Open'}
                  </Btn>
                </div>
              )}

              {rt.followups?.length > 0 && (
                <div className="space-y-2 pt-1">
                  {[...rt.followups].sort((a, b) => new Date(b.date) - new Date(a.date)).map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5">
                      <PhoneCall size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-700">{f.note}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{fmtDate(f.date)} · {f.by}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 items-end pt-1">
                <div className="flex-1">
                  <Field label="Add follow-up">
                    <input
                      type="text"
                      placeholder="What did the courier say?"
                      value={followup}
                      onChange={(e) => setFollowup(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && followup.trim() && !busy) onAction('followup', { orderId: request._id, note: followup }); }}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Btn variant="ghost" disabled={busy || !followup.trim()} onClick={() => onAction('followup', { orderId: request._id, note: followup })}>
                  Log
                </Btn>
              </div>
            </div>
          </Section>

          {/* Claim */}
          <Section icon={ShieldAlert} title="Courier Claim" subtitle="Money recovery from the courier — entirely separate from the customer's refund.">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
              {rt.claimStatus && rt.claimStatus !== 'none' && (
                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-3">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current claim</p>
                    <p className="text-sm font-black text-slate-800 capitalize">{rt.claimStatus}{rt.claimReference ? ` · ${rt.claimReference}` : ''}</p>
                  </div>
                  {rt.claimAmount ? <p className="text-lg font-black text-slate-900">{currency}{rt.claimAmount}</p> : null}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Claim status">
                  <select value={claimStatus} onChange={(e) => setClaimStatus(e.target.value)} className={inputClass}>
                    <option value="pending">Pending</option>
                    <option value="filed">Filed</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </Field>
                <Field label="Claim amount">
                  <input type="number" placeholder="0.00" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Claim reference">
                  <input type="text" placeholder="Courier claim ID" value={claimReference} onChange={(e) => setClaimReference(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Notes">
                  <input type="text" placeholder="Optional" value={claimNotes} onChange={(e) => setClaimNotes(e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Btn variant="ghost" className="w-full" disabled={busy} onClick={() => onAction('claim', { orderId: request._id, claimStatus, claimAmount, claimReference, notes: claimNotes })}>
                Save Claim
              </Btn>
            </div>
          </Section>

          {/* Manual override */}
          <Section icon={Lock} title="Manual Override" subtitle="Forces the status regardless of the day count. Receipt, QC and settlement have their own actions above.">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              {view.isManual && (
                <div className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-3.5 py-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider opacity-50">Override active</p>
                    <p className="text-sm font-black">{labelOf(rt.manualStatus)}</p>
                  </div>
                  <Btn variant="ghost" disabled={busy} onClick={() => onAction('manual-status', { orderId: request._id, status: '' })}>
                    Clear
                  </Btn>
                </div>
              )}
              {received ? (
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center py-2">
                  Parcel received — status is settled and can no longer be overridden
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Set status to">
                      <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)} className={inputClass}>
                        <option value="">Select…</option>
                        {MANUAL_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>{STATUS_META[status].label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Reason">
                      <input type="text" placeholder="Why?" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                  <Btn variant="dark" className="w-full" disabled={busy || !overrideStatus} onClick={() => onAction('manual-status', { orderId: request._id, status: overrideStatus, note: overrideNote })}>
                    Apply Override
                  </Btn>
                </>
              )}
            </div>
          </Section>

          {/* History */}
          <Section icon={History} title="History" subtitle="Append-only. Entries are never edited or deleted — this is what backs every dispute and claim.">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              {history.length === 0 ? (
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center py-3">No entries yet</p>
              ) : (
                <div className="relative pl-5 border-l-2 border-slate-100 space-y-5">
                  {history.map((entry, i) => (
                    <div key={i} className="relative">
                      <span className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full ring-4 ring-white ${i === 0 ? toneOf(entry.status).dot : 'bg-slate-300'}`} />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${toneOf(entry.status).chip}`}>
                          {labelOf(entry.status)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{fmtDateTime(entry.date)}</span>
                      </div>
                      {entry.note && <p className="text-xs font-medium text-slate-700 mt-1.5">{entry.note}</p>}
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">— {entry.by || 'system'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <div className="flex items-start gap-2.5 bg-slate-100 rounded-2xl p-4">
            <CalendarDays size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              Thresholds in force: critical at <strong className="font-black">{view.thresholds?.returnCriticalDays ?? 10} days</strong>, lost at{' '}
              <strong className="font-black">{view.thresholds?.returnLostDays ?? 50} days</strong>, refund due within{' '}
              <strong className="font-black">{view.thresholds?.returnMaxRefundDays ?? 15} days</strong> of pickup. Change them under Settings → Config.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnDrawer;
