/* eslint-disable react/prop-types -- Renders the admin-only tracking view returned by the orders API. */
import { Check, Clock3, History, PackageCheck } from 'lucide-react';

const tones = {
  active: 'border-violet-100 bg-violet-50 text-violet-700',
  complete: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  attention: 'border-amber-200 bg-amber-50 text-amber-800',
};
const dateTime = value => value && Number.isFinite(new Date(value).getTime())
  ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const referenceLabels = {
  awb: 'Pickup / delivery AWB', courier: 'Courier', replacementAwb: 'Replacement AWB', replacementCourier: 'Replacement courier',
  lastTrackedAt: 'Courier last synced', refundDueDate: 'Refund due', qcResult: 'Quality check', investigationTicket: 'Investigation ticket',
  claimStatus: 'Courier claim', amount: 'Refund amount', refundId: 'Refund reference', utr: 'Bank UTR', gatewayStatus: 'Gateway status',
  attempts: 'Refund attempts', nextRetryAt: 'Next refund check',
};

export default function OrderTrackingTimeline({ tracking, orderId }) {
  if (!tracking) return <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800">Detailed tracking is not available yet. Refresh orders to load the latest status.</p>;
  return <section aria-label={`Order tracking ${orderId}`} className="mb-5 min-w-0 overflow-hidden rounded-2xl border border-theme-e7dfe9 bg-white text-left">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-theme-eee9f0 bg-theme-fcf9fc p-4 sm:p-5">
      <div><h3 className="flex items-center gap-2 text-sm font-semibold text-theme-3d3047"><PackageCheck size={18} /> Order tracking</h3>
        <p className="mt-1 text-xs leading-relaxed text-theme-8b7b93">Delivery, returns, refunds and exchanges in one place.</p></div>
      <span className={`inline-flex max-w-full items-center gap-1.5 break-words rounded-full border px-3 py-1.5 text-xs font-semibold ${tones[tracking.tone] || tones.active}`}><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />{tracking.label}</span>
    </header>
    <div className="space-y-3 p-3 sm:p-5">
      {tracking.journeys.map(journey => <details key={journey.key} open={journey.key !== 'delivery' || tracking.journeys.length === 1} className="group overflow-hidden rounded-xl border border-theme-eee9f0">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 bg-theme-fcfbfd px-4 py-3 focus-visible:outline-violet-400">
          <span className="min-w-0"><span className="text-xs font-bold text-theme-4f4059">{journey.title}</span>{journey.item && <span className="mt-1 block break-words text-xs text-theme-8b7b93">{journey.item}</span>}</span>
          <span className="flex min-w-0 items-center gap-2"><span className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${tones[journey.tone] || tones.active}`}>{journey.label}</span><span className="text-xs text-theme-9c839e group-open:rotate-180" aria-hidden="true">▾</span></span>
        </summary>
        <div className="space-y-4 border-t border-theme-eee9f0 p-4">
          {journey.customerLabel && journey.customerLabel !== journey.label && <p className="text-[11px] text-theme-8b7b93">Customer status: <span className="font-medium text-theme-65526f">{journey.customerLabel}</span></p>}
          {journey.milestones.length > 0 && <ol aria-label={`${journey.title} timeline`}>
            {journey.milestones.map((step, index) => <li key={step.key} aria-current={step.current ? 'step' : undefined} className="relative flex min-w-0 gap-3 pb-5 last:pb-0">
              {index < journey.milestones.length - 1 && <span aria-hidden="true" className={`absolute bottom-0 left-[11px] top-6 w-px ${step.reached ? 'bg-violet-200' : 'bg-slate-200'}`} />}
              <span aria-hidden="true" className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.current ? 'bg-theme-8e567a text-white ring-4 ring-theme-f5edf5' : step.reached ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {step.reached ? <Check size={12} strokeWidth={3} /> : <Clock3 size={11} />}
              </span>
              <div className="min-w-0 flex-1 pt-0.5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><p className={`break-words text-xs font-semibold ${step.reached ? 'text-theme-4f4059' : 'text-theme-9d8da5'}`}>{step.label}</p>
                {step.current && <span className="text-[9px] font-medium uppercase tracking-wider text-theme-a46f91">Current step</span>}</div>
                <p className="mt-1 text-[10px] text-theme-9d8da5">{step.at ? dateTime(step.at) : step.reached ? 'Timestamp not recorded' : 'Awaiting update'}</p>
              </div>
            </li>)}
          </ol>}
          {journey.notice && <p className="break-words rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">{journey.notice}</p>}
          {journey.references?.refundOverdue && <p className="text-xs font-semibold text-red-700">Refund settlement is overdue.</p>}
          <dl className="grid min-w-0 grid-cols-1 gap-3 border-t border-theme-f1edf3 pt-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(journey.references || {}).filter(([key, value]) => referenceLabels[key] && value !== null && value !== undefined && value !== '').map(([key, value]) => <div key={key} className="min-w-0">
              <dt className="text-[9px] font-medium uppercase tracking-wider text-theme-9d8da5">{referenceLabels[key]}</dt>
              <dd className="mt-1 break-all text-xs font-medium text-theme-65526f">{['lastTrackedAt', 'refundDueDate', 'nextRetryAt'].includes(key) ? dateTime(value) : key === 'amount' ? `₹${Number(value).toFixed(2)}` : String(value)}</dd>
            </div>)}
          </dl>
        </div>
      </details>)}
      <details className="rounded-xl border border-theme-eee9f0" open>
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-theme-65526f"><History size={14} className="mr-2 inline-block" />All order activity <span className="ml-1 font-normal text-theme-9d8da5">({tracking.events.length})</span></summary>
        <ol aria-label="Order activity history" className="max-h-[30rem] space-y-4 overflow-y-auto border-t border-theme-eee9f0 p-4">
          {tracking.events.map((event, index) => <li key={`${event.source}-${event.at}-${index}`} className="border-l-2 border-theme-e8d9e8 pl-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="break-words text-xs font-semibold text-theme-4f4059">{event.label}</p><span className="rounded-md bg-theme-f6f1f7 px-2 py-1 text-[9px] text-theme-937d9d">{event.source}{event.reference ? ` · ${event.reference}` : ''}</span></div>
            {event.note && <p className="mt-1 break-words text-xs leading-relaxed text-theme-756480">{event.note}</p>}
            <p className="mt-1 text-[10px] text-theme-9d8da5">{dateTime(event.at) || 'Timestamp not recorded'}{event.by ? ` · ${event.by}` : ''}</p>
          </li>)}
        </ol>
      </details>
    </div>
  </section>;
}
