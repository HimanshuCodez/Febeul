import React, { useMemo, useRef, useState } from 'react';
import {
  X, User, Package, ShieldCheck, Truck, PackageCheck, ClipboardCheck, Send,
  History, Camera, Upload, AlertTriangle, CheckCircle2, XCircle, Info, RefreshCcw
} from 'lucide-react';
import { toneOf, labelOf, fmtDateTime, REASON_LABELS } from '../../utils/exchangeStatus';

// Small building blocks kept local — same convention as ReturnDrawer.jsx.
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

const ExchangeDrawer = ({ exchange, onClose, onAction, busy }) => {
  const view = exchange.view || {};
  const tone = toneOf(view.status);

  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [receivedNote, setReceivedNote] = useState('');
  const [qcResult, setQcResult] = useState('PASS');
  const [qcNotes, setQcNotes] = useState('');
  const [qcPhotos, setQcPhotos] = useState([]);
  const [substitute, setSubstitute] = useState(false);
  const [overrideSku, setOverrideSku] = useState('');
  const [overrideSize, setOverrideSize] = useState('');
  const [substitutionNote, setSubstitutionNote] = useState('');
  const photoInputRef = useRef(null);

  const status = exchange.status;
  const qc = exchange.qc || {};
  const reversePickup = exchange.reversePickup || {};
  const forwardShipment = exchange.forwardShipment || {};

  const history = useMemo(
    () => [...(exchange.timeline || [])].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [exchange.timeline]
  );

  const submitQc = () => {
    if (qcResult === 'FAIL' && qcPhotos.length === 0) return; // guarded again server-side
    const form = new FormData();
    form.append('exchangeId', exchange._id);
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
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${tone.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
              {labelOf(view.status)}
            </span>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-2 truncate">{exchange.ticketId}</h3>
            <p className="text-[11px] text-slate-400 font-bold truncate">{REASON_LABELS[exchange.reason] || exchange.reason}</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-900 hover:text-white transition-all text-slate-400 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8">
          {/* Customer & item */}
          <Section icon={User} title="Customer & Item">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
              <div>
                <p className="text-sm font-black text-slate-800">{exchange.userId?.name || 'N/A'}</p>
                <p className="text-[11px] text-slate-400 font-bold">{exchange.userId?.email}</p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                {exchange.originalItem?.image && (
                  <img src={exchange.originalItem.image} alt="" className="w-14 h-14 object-cover rounded-xl border border-slate-100" />
                )}
                <div>
                  <p className="text-xs font-black text-slate-800">{exchange.originalItem?.name}</p>
                  <p className="text-[11px] text-slate-400 font-bold">
                    Size {exchange.originalItem?.size} · Qty {exchange.originalItem?.quantity} · SKU {exchange.originalItem?.sku || '—'}
                  </p>
                </div>
              </div>
              {exchange.description && (
                <p className="text-xs text-slate-700 font-medium italic bg-slate-50 rounded-xl p-3">"{exchange.description}"</p>
              )}
              {exchange.images?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {exchange.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform">
                      <img src={img} alt="Customer evidence" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Verification */}
          <Section icon={ShieldCheck} title="Verification" subtitle="Reject with a reason if the photos don't support the claim.">
            {status === 'REQUESTED' ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                <Btn variant="emerald" className="w-full" disabled={busy} onClick={() => onAction('verify', { exchangeId: exchange._id, decision: 'approve' })}>
                  Approve Exchange
                </Btn>
                {!showReject ? (
                  <Btn variant="ghost" className="w-full" disabled={busy} onClick={() => setShowReject(true)}>Reject</Btn>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <Field label="Rejection reason (required)">
                      <textarea rows="2" placeholder="Why doesn't this qualify?" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className={inputClass} />
                    </Field>
                    <Btn
                      variant="red"
                      className="w-full"
                      disabled={busy || !rejectionReason.trim()}
                      onClick={() => onAction('verify', { exchangeId: exchange._id, decision: 'reject', rejectionReason })}
                    >
                      Confirm Rejection
                    </Btn>
                  </div>
                )}
              </div>
            ) : status === 'VERIFICATION_REJECTED' ? (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                <p className="text-sm font-black text-red-800 flex items-center gap-2"><XCircle size={16} /> Rejected</p>
                <p className="text-xs text-slate-700 font-medium mt-2">{exchange.rejectionReason}</p>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                <p className="text-sm font-black text-emerald-800 flex items-center gap-2"><CheckCircle2 size={16} /> Approved</p>
              </div>
            )}
          </Section>

          {/* Reverse pickup */}
          {!['REQUESTED', 'VERIFICATION_REJECTED'].includes(status) && (
            <Section icon={Truck} title="Reverse Pickup" subtitle="Manually triggered — never scheduled automatically on approval.">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                {reversePickup.status === 'none' || !reversePickup.status ? (
                  <Btn variant="dark" className="w-full" disabled={busy} onClick={() => onAction('schedule-pickup', { exchangeId: exchange._id })}>
                    Schedule Pickup
                  </Btn>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Courier</span>
                        <span className="text-sm font-extrabold text-slate-800">{reversePickup.courier || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">AWB</span>
                        <span className="text-sm font-extrabold text-slate-800 select-all break-all">{reversePickup.awb || '—'}</span>
                      </div>
                    </div>
                    {reversePickup.status === 'failed' && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-amber-800">Pickup scheduling failed</p>
                          <p className="text-[11px] text-amber-700 font-medium">{reversePickup.failureReason}</p>
                          <Btn variant="amber" className="mt-2" disabled={busy} onClick={() => onAction('schedule-pickup', { exchangeId: exchange._id })}>
                            Retry
                          </Btn>
                        </div>
                      </div>
                    )}
                    {reversePickup.trackingHistory?.length > 0 && (
                      <details className="pt-2 border-t border-slate-100">
                        <summary className="cursor-pointer text-[11px] font-black text-slate-500 uppercase tracking-wider">Tracking scans</summary>
                        <div className="mt-3 space-y-2">
                          {[...reversePickup.trackingHistory].sort((a, b) => new Date(b.date) - new Date(a.date)).map((act, i) => (
                            <div key={i} className="text-[11px]">
                              <span className="font-bold text-slate-700">{act.activity || act.status}</span>
                              <span className="text-slate-400 font-bold ml-2">{fmtDateTime(act.date)}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                )}
              </div>
            </Section>
          )}

          {/* Warehouse receipt */}
          {['PICKUP_SCHEDULED', 'PICKUP_FAILED', 'PICKED_UP'].includes(status) && (
            <Section icon={PackageCheck} title="Warehouse Receipt" subtitle="Timestamp is always server-generated on the click, never backfilled.">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                <Field label="Note (optional)">
                  <input type="text" placeholder="Any remark for the record" value={receivedNote} onChange={(e) => setReceivedNote(e.target.value)} className={inputClass} />
                </Field>
                <Btn variant="dark" className="w-full" disabled={busy} onClick={() => onAction('mark-received', { exchangeId: exchange._id, note: receivedNote })}>
                  Mark as Received
                </Btn>
              </div>
            </Section>
          )}

          {/* Quality check */}
          {!['REQUESTED', 'VERIFICATION_REJECTED', 'VERIFICATION_APPROVED', 'PICKUP_SCHEDULED', 'PICKUP_FAILED', 'PICKED_UP'].includes(status) && (
            <Section icon={ClipboardCheck} title="Quality Check" subtitle="A failure without photos is unusable in a dispute, so it is refused. This step is never shown to the customer.">
              {qc.result ? (
                <div className={`rounded-2xl border p-5 ${qc.result === 'PASS' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <div className="flex items-center gap-2.5">
                    {qc.result === 'PASS' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}
                    <p className={`text-sm font-black ${qc.result === 'PASS' ? 'text-emerald-800' : 'text-red-800'}`}>
                      QC {qc.result} · {fmtDateTime(qc.date)}
                    </p>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 mt-1.5 pl-7">By {qc.by || 'admin'}</p>
                  {qc.notes && <p className="text-xs text-slate-700 font-medium italic mt-3 pl-7">"{qc.notes}"</p>}
                  {qc.photos?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pl-7">
                      {qc.photos.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform">
                          <img src={img} alt="QC evidence" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
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
          )}

          {/* QC failed → refund */}
          {status === 'QC_FAILED' && (
            <Section icon={Send} title="Redirect to Refund" subtitle="This item can't be exchanged — send the order to the existing Refund Requests queue instead.">
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <Btn variant="dark" className="w-full" disabled={busy} onClick={() => onAction('redirect-refund', { exchangeId: exchange._id })}>
                  Move Order to Refund Requests
                </Btn>
              </div>
            </Section>
          )}

          {/* Dispatch replacement */}
          {status === 'RECEIVED_AT_WAREHOUSE' && qc.result === 'PASS' && (
            <Section icon={Package} title="Dispatch Replacement" subtitle="Ships the same size/color the customer originally ordered, unless substituted below.">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-wider cursor-pointer">
                  <input type="checkbox" checked={substitute} onChange={(e) => setSubstitute(e.target.checked)} />
                  Substitute a different variation (out of stock) — always a free swap
                </label>
                {substitute && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="SKU (color)">
                      <input type="text" placeholder={exchange.originalItem?.sku} value={overrideSku} onChange={(e) => setOverrideSku(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Size">
                      <input type="text" placeholder={exchange.originalItem?.size} value={overrideSize} onChange={(e) => setOverrideSize(e.target.value)} className={inputClass} />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Substitution note">
                        <input type="text" placeholder="Why the original variation couldn't be shipped" value={substitutionNote} onChange={(e) => setSubstitutionNote(e.target.value)} className={inputClass} />
                      </Field>
                    </div>
                  </div>
                )}
                <Btn
                  variant="emerald"
                  className="w-full"
                  disabled={busy}
                  onClick={() => onAction('dispatch', {
                    exchangeId: exchange._id,
                    overrideSku: substitute ? overrideSku : undefined,
                    overrideSize: substitute ? overrideSize : undefined,
                    substitutionNote: substitute ? substitutionNote : undefined,
                  })}
                >
                  Dispatch Replacement
                </Btn>
              </div>
            </Section>
          )}

          {/* Forward shipment */}
          {['NEW_PRODUCT_DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status) && (
            <Section icon={RefreshCcw} title="Replacement Shipment">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Courier</span>
                    <span className="text-sm font-extrabold text-slate-800">{forwardShipment.courier || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">AWB</span>
                    <span className="text-sm font-extrabold text-slate-800 select-all break-all">{forwardShipment.awb || '—'}</span>
                  </div>
                </div>
                {exchange.replacement?.substituted && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-700 font-medium">
                      Substituted: size {exchange.replacement.size}{exchange.replacement.substitutionNote ? ` — ${exchange.replacement.substitutionNote}` : ''}
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* History */}
          <Section icon={History} title="History" subtitle="Append-only. Entries are never edited or deleted.">
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
        </div>
      </div>
    </div>
  );
};

export default ExchangeDrawer;
