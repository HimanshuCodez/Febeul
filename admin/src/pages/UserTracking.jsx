/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, RefreshCw, ShieldCheck } from 'lucide-react';
import { backendUrl } from '../App';

const dateText = date => date.toISOString().slice(0, 10);
const number = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value || 0);
const money = (value, currency) => `${currency} ${number(value)}`;
const utc = value => new Date(value).toLocaleString('en-GB', { timeZone: 'UTC' });
const card = 'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm';

function DataTable({ headers, rows, empty = 'No data in this range.' }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{headers.map(header => <th key={header} className="whitespace-nowrap border-b px-3 py-3 font-semibold text-gray-500">{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index} className="border-b border-gray-50 last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-xs break-words px-3 py-3 align-top">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-3 py-8 text-center text-gray-400">{empty}</td></tr>}</tbody></table></div>;
}

function RevenueTable({ title, rows, description }) {
  return <section className={card}><h2 className="text-lg font-bold text-gray-900">{title}</h2><p className="mb-3 mt-1 text-sm text-gray-500">{description}</p><DataTable headers={['Currency', 'Orders', 'Gross paid', 'Completed refunds', 'Net paid', 'Pending refunds']} rows={rows.map(row => [row._id, number(row.orders), money(row.gross, row._id), money(row.refunds, row._id), money(row.net, row._id), money(row.pendingRefunds, row._id)])} /></section>;
}

export default function UserTracking({ token }) {
  const [dates, setDates] = useState(() => ({ from: dateText(new Date(Date.now() - 29 * 86400000)), to: dateText(new Date()) }));
  const [range, setRange] = useState(dates);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [summary, setSummary] = useState(null);
  const [journeys, setJourneys] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [journeyError, setJourneyError] = useState('');
  const [journeyLoading, setJourneyLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    axios.get(`${backendUrl}/api/analytics/reports/summary`, { params: range, headers: { token }, signal: controller.signal, timeout: 15000 })
      .then(({ data }) => { if (!data.success) throw new Error(data.message); setSummary(data); })
      .catch(err => { if (!controller.signal.aborted) { setSummary(null); setError(err.response?.data?.message || err.message || 'Could not load analytics.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [range, refresh, token]);
  useEffect(() => {
    const controller = new AbortController();
    setJourneyLoading(true); setJourneyError('');
    axios.get(`${backendUrl}/api/analytics/reports/journeys`, { params: { ...range, page }, headers: { token }, signal: controller.signal, timeout: 15000 })
      .then(({ data }) => { if (!data.success) throw new Error(data.message); setJourneys(data); })
      .catch(err => { if (!controller.signal.aborted) { setJourneys(null); setJourneyError(err.response?.data?.message || 'Could not load journeys.'); } })
      .finally(() => { if (!controller.signal.aborted) setJourneyLoading(false); });
    return () => controller.abort();
  }, [range, page, refresh, token]);

  const applyRange = event => {
    event.preventDefault();
    if (dates.from > dates.to || new Date(dates.to) - new Date(dates.from) > 365 * 86400000) { setError('Choose a valid date range of at most 366 days.'); return; }
    setPage(1); setRange({ ...dates });
  };
  const counts = Object.fromEntries((summary?.activity || []).map(row => [row._id, row.events]));
  const funnel = summary ? [['Product viewed', summary.sessions.product], ['Also added to cart', summary.sessions.cart], ['Also started checkout', summary.sessions.checkout], ['Also purchased', summary.sessions.purchase]] : [];

  return <div className="space-y-6 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-500"><Activity size={18} /> USER TRACKING</div><h1 className="text-3xl font-bold text-gray-900">Ecommerce analytics</h1><p className="mt-2 text-sm text-gray-500">Shopping activity from visitors who chose analytics.</p></div><button onClick={() => setRefresh(value => value + 1)} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"><RefreshCw size={16} /> Refresh</button></div>
    <div className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-gray-700"><ShieldCheck size={22} className="shrink-0 text-rose-500" /><p><strong>Partial coverage:</strong> these visitor metrics include consented activity only. Browser IDs represent browsers, not identified people. Rejection, withdrawal, blocked requests and expired data reduce coverage. Operational orders below include all consent choices.</p></div>
    <form onSubmit={applyRange} className={`${card} flex flex-wrap items-end gap-4`}><label className="text-sm font-medium">From (UTC)<input required type="date" value={dates.from} max={dates.to} onChange={event => setDates(value => ({ ...value, from: event.target.value }))} className="mt-1 block rounded-lg border p-2" /></label><label className="text-sm font-medium">To (UTC, inclusive)<input required type="date" value={dates.to} min={dates.from} onChange={event => setDates(value => ({ ...value, to: event.target.value }))} className="mt-1 block rounded-lg border p-2" /></label><button className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white">Apply dates</button></form>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error} <button className="ml-2 underline" onClick={() => setRefresh(value => value + 1)}>Retry</button></div>}
    {loading ? <p role="status" className="py-12 text-center">Loading analytics…</p> : summary && <>
      {!summary.config.enabled && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Collection is disabled. Historical retained analytics and operational orders can still be reviewed. Enable ANALYTICS_ENABLED on the backend to start collection.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Consented browser IDs', summary.visitors.total], ['Consented sessions', summary.sessions.total], ['New in retained history', summary.visitors.new], ['Returning browser IDs', summary.visitors.returning]].map(([label, value]) => <div key={label} className={card}><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-bold text-gray-900">{number(value)}</p></div>)}</div>
      <div className="grid gap-4 sm:grid-cols-3">{[['Add-to-cart events', counts.add_to_cart], ['Remove-from-cart events', counts.remove_from_cart], ['Checkout starts', counts.checkout_started]].map(([label, value]) => <div key={label} className={card}><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-900">{number(value)}</p></div>)}</div>
      <div className="grid gap-6 xl:grid-cols-2"><section className={card}><h2 className="text-lg font-bold text-gray-900">Product → cart → checkout → purchase</h2><p className="mt-1 text-sm text-gray-500">Same-session stage coverage. Each stage requires all earlier stages in this date range; their time order is not enforced.</p><div className="mt-5 space-y-4">{funnel.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{label}</span><strong>{number(value)}</strong></div><div className="h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-rose-400" style={{ width: `${summary.sessions.product ? value / summary.sessions.product * 100 : 0}%` }} /></div></div>)}</div><p className="mt-5 text-sm"><strong>Conversion: {number(summary.conversionRate)}%</strong><br />{number(summary.sessions.purchasing)} sessions with a verified purchase ÷ {number(summary.sessions.total)} consented sessions with any event in this range. Independent of the stage coverage above.</p></section>
      <section className={card}><h2 className="text-lg font-bold text-gray-900">Checkout abandonment</h2><p className="mt-4 text-3xl font-bold text-gray-900">{number(summary.abandonment.abandoned)} <span className="text-base font-normal text-gray-500">of {number(summary.abandonment.checkouts)} checkout sessions</span></p><p className="mt-3 text-sm leading-relaxed">A session with a checkout start in this range is considered abandoned after {summary.config.abandonmentMinutes} minutes without any recorded activity and no subsequent verified purchase in that session. Uses all retained activity through now, including after the selected end date.</p><p className="mt-3 text-sm text-gray-500">This is an estimate. COD placements are not verified purchases; payment failures, missing callbacks, withdrawal and purchases in a later session can appear abandoned.</p><p className="mt-4 text-sm">{number(summary.abandonment.purchased)} checkout sessions have a subsequent verified purchase.</p></section></div>
      <div className="grid gap-6 xl:grid-cols-2"><section className={card}><h2 className="mb-3 text-lg font-bold text-gray-900">Popular products</h2><DataTable headers={['Product', 'Views', 'Adds', 'Removes']} rows={summary.products.map(row => [<span key={row._id}>{row.name}<small className="mt-1 block text-gray-400">{row._id}</small></span>, number(row.views), number(row.adds), number(row.removes)])} /></section><section className={card}><h2 className="mb-3 text-lg font-bold text-gray-900">Popular searches</h2><p className="text-sm text-gray-500">Submitted searches only. Privacy filters exclude sensitive-looking terms.</p><DataTable headers={['Sanitized search', 'Searches']} rows={summary.searches.map(row => [row._id, number(row.count)])} /></section></div>
      <section className={card}><h2 className="text-lg font-bold text-gray-900">Referral & campaign sessions</h2><p className="mt-1 text-sm text-gray-500">Attribution observed after consent. First recorded attribution per session within the date range.</p><DataTable headers={['Referral domain', 'Source', 'Medium', 'Campaign', 'Sessions']} rows={summary.sources.map(row => [row._id.referral, row._id.source || '—', row._id.medium || '—', row._id.campaign || '—', number(row.sessions)])} /></section>
      <RevenueTable title="Verified payments — all consent choices" rows={summary.payments} description="Gateway-confirmed payments captured since this feature was enabled, grouped by verification date. No visitor identifiers are needed for these totals. COD and older unverified payments are excluded." />
      <RevenueTable title="Verified purchases — consented journeys only" rows={summary.trackedPayments} description="Subset attributed to consented sessions at payment verification. Revenue comes from the payment gateway, never from client event amounts." />
      <section className={card}><h2 className="text-lg font-bold text-gray-900">Operational orders — all consent choices</h2><p className="mt-1 text-sm text-gray-500">Existing COD and marked-paid orders by order creation date, including later cancellations. Order value is not collected revenue. COD pricing is INR. Older prepaid orders without a verified currency are shown as UNKNOWN and must not be combined with currency totals.</p><DataTable headers={['Currency', 'Orders', 'Order value', 'COD orders', 'Cancelled / failed']} rows={summary.operational.map(row => [row._id, number(row.orders), money(row.orderValue, row._id), number(row.codOrders), number(row.cancelledOrders)])} /></section>
      <p className="text-xs leading-relaxed text-gray-500">Refund handling: completed refunds currently recorded on each order reduce that order’s gross verified payment (capped at the amount paid). Pending refunds are shown separately and do not reduce net. Refunds are attributed to the original payment cohort, not the refund date; later refunds can revise past reports. Taxes and shipping are included, gateway fees are not deducted. No currencies are combined.</p>
    </>}
    <section className={card}><h2 className="text-lg font-bold text-gray-900">Consented visitor journeys</h2><p className="mb-4 mt-1 text-sm text-gray-500">One row per browser session. Times in UTC. At most the first 100 events per session in the selected range.</p>
      {journeyError && <p role="alert" className="text-sm text-red-600">{journeyError} <button className="underline" onClick={() => setRefresh(value => value + 1)}>Retry</button></p>}
      {journeyLoading ? <p role="status">Loading journeys…</p> : journeys && <><div className="space-y-3">{journeys.rows.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No consented journeys in this range.</p>}{journeys.rows.map(row => <details key={row._id} className="rounded-xl border border-gray-100 p-4"><summary className="cursor-pointer break-all text-sm"><strong title={row.visitorId}>Browser {row.visitorId.slice(0, 8)}</strong> · Session {row._id.slice(0, 8)} · {row.events} events · {utc(row.lastAt)} UTC</summary><p className="mt-3 break-all text-xs text-gray-400">Browser ID: {row.visitorId}<br />Session ID: {row._id}</p><ol className="mt-4 space-y-3 border-l-2 border-rose-100 pl-4">{row.timeline.map((event, index) => <li key={index} className="text-sm"><span className="text-xs text-gray-400">{utc(event.timestamp)} UTC</span><p className="break-words"><strong>{event.name}</strong> · {event.path}{event.productId && ` · Product ${event.productId}`}{event.quantity && ` · Qty ${event.quantity}`}{event.searchTerm && ` · “${event.searchTerm}”`}{event.currency && ` · ${money(event.amount, event.currency)}`}</p></li>)}</ol>{row.events > 100 && <p className="mt-3 text-xs text-gray-500">Showing the first 100 of {row.events} events.</p>}</details>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><span>Page {page} of {Math.max(1, Math.ceil(journeys.total / 10))} · {number(journeys.total)} sessions</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button><button disabled={page * 10 >= journeys.total} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button></div></div></>}
    </section>
    {summary && <details className={`${card} text-sm`}><summary className="cursor-pointer font-semibold">Metric definitions & coverage</summary><div className="mt-3 space-y-2 leading-relaxed"><p>A visitor is a random browser ID. A session is a tab session, renewed after 30 minutes without tracked activity. IDs are never created before consent.</p><p>New means no earlier event for that browser ID in retained history before the selected range. Returning means an earlier retained event exists. Clearing browser storage, withdrawing consent or retention expiry can make a returning browser look new.</p><p>Events use server receipt time. Client activity and amounts are untrusted; only verified backend payments supply revenue. Retries share event IDs, and purchases use unique order IDs.</p><p>Retention: {summary.config.retentionDays} days for newly written visitor events. Operational payment facts retain order-level deduplication without browser identifiers. Expired rows are excluded from reports before MongoDB TTL deletion finishes. No historical activity is backfilled.</p></div></details>}
  </div>;
}
