import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { backendUrl, currency } from '../App';
import { toast } from 'react-toastify';
import { CSVLink } from 'react-csv';
import {
  Undo2, Eye, Search, CalendarRange, XCircle, Download, RefreshCw,
  AlertTriangle, Clock, PackageCheck, Banknote, ShieldAlert, CheckCircle2,
  Inbox, TrendingUp
} from 'lucide-react';
import ReturnDrawer from '../components/returns/ReturnDrawer';
import { RETURN_TABS, TONES, toneOf, labelOf, fmtDate } from '../utils/returnStatus';

// Return journey queue.
//
// One collection, one table, many filters. The tabs below are selections over
// the same rows — never separate datasets — so two views of the same return
// cannot disagree, and the counts always add up to the total.
//
// No status is computed here. The backend derives it from three dates and
// sends it down as `view.status`; duplicating that rule in the browser is how
// the two would eventually drift apart.

const TABS = [
  { key: 'approval', label: 'Awaiting Approval', hint: 'New requests to accept or decline', accent: 'slate', icon: Inbox },
  { key: 'in_transit', label: 'In Transit', hint: 'Picked up, within the normal window', accent: 'blue', icon: TrendingUp },
  { key: 'critical', label: 'Critical', hint: 'Overdue — chase the courier', accent: 'amber', icon: AlertTriangle },
  { key: 'qc_pending', label: 'QC Pending', hint: 'At the warehouse, awaiting inspection', accent: 'violet', icon: PackageCheck },
  { key: 'refund_pending', label: 'Refund Pending', hint: 'Inspected — money still to go out', accent: 'emerald', icon: Banknote },
  { key: 'lost', label: 'Lost', hint: 'Written off — recover from the courier', accent: 'red', icon: ShieldAlert },
  { key: 'closed', label: 'Closed', hint: 'Settled, rejected or withdrawn', accent: 'slate', icon: CheckCircle2 },
];

// Each return has exactly one home, so the tab counts sum to the total.
const bucketOf = (row) => {
  const refundStatus = row.refundDetails?.status;
  if (refundStatus === 'pending') return 'approval';
  if (refundStatus === 'rejected') return 'closed';
  const status = row.view?.status;
  if (status === 'REFUND_COMPLETED') return 'closed';
  return RETURN_TABS.find((tab) => tab.statuses.includes(status))?.key || 'in_transit';
};

const ReturnRequests = ({ token }) => {
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('approval');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const fetchReturns = useCallback(async ({ silent = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/return/list`, { headers: { token } });
      if (data.success) {
        setRows(data.returns || []);
        setSettings(data.settings || null);
      } else {
        toast.error(data.message || 'Failed to load returns.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load returns.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  // Selection is held by id, not by object, so the drawer re-renders with fresh
  // data after every action instead of showing a stale snapshot.
  const selected = useMemo(() => rows.find((row) => row._id === selectedId) || null, [rows, selectedId]);

  const counts = useMemo(() => {
    const base = TABS.reduce((acc, tab) => ({ ...acc, [tab.key]: 0 }), {});
    rows.forEach((row) => { base[bucketOf(row)] += 1; });
    return base;
  }, [rows]);

  const overdueCount = useMemo(() => rows.filter((row) => row.view?.refundOverdue).length, [rows]);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      if (bucketOf(row) !== activeTab) return false;
      if (overdueOnly && !row.view?.refundOverdue) return false;

      if (query) {
        const haystack = [
          row._id, row.orderItemId, row.userId?.name, row.userId?.email,
          row.refundDetails?.pickup?.awb, row.refundDetails?.returnTracking?.investigationTicket,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      const time = new Date(row.refundDetails?.requestedAt || row.date).getTime();
      if (startDate && time < new Date(startDate).setHours(0, 0, 0, 0)) return false;
      if (endDate && time > new Date(endDate).setHours(23, 59, 59, 999)) return false;
      return true;
    });
  }, [rows, activeTab, overdueOnly, searchTerm, startDate, endDate]);

  // Every drawer action posts, toasts, then re-reads the list — so the row, the
  // counts and the drawer can never show three different versions of a return.
  const runAction = async (endpoint, payload, { multipart = false } = {}) => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/return/${endpoint}`, payload, {
        headers: multipart ? { token } : { token, 'Content-Type': 'application/json' },
      });
      if (data.success) {
        toast.success(data.message || 'Updated.');
        await fetchReturns({ silent: true });
      } else {
        toast.error(data.message || 'Action failed.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const approveReturn = async (payload) => {
    if (!window.confirm('Approve this return? Prepaid orders are refunded through Razorpay immediately and a courier pickup is scheduled.')) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/refund/approve`, payload, { headers: { token } });
      data.success ? toast.success(data.message) : toast.error(data.message);
      if (data.success) await fetchReturns({ silent: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve.');
    } finally {
      setBusy(false);
    }
  };

  const rejectReturn = async (payload) => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/refund/reject`, payload, { headers: { token } });
      data.success ? toast.success('Request rejected.') : toast.error(data.message);
      if (data.success) await fetchReturns({ silent: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject.');
    } finally {
      setBusy(false);
    }
  };

  const csvHeaders = [
    { label: 'Order ID', key: 'orderId' }, { label: 'Order Item ID', key: 'orderItemId' },
    { label: 'Customer', key: 'customer' }, { label: 'Email', key: 'email' },
    { label: 'Requested', key: 'requested' }, { label: 'Status', key: 'status' },
    { label: 'Pickup Date', key: 'pickupDate' }, { label: 'Days Since Pickup', key: 'days' },
    { label: 'Received Date', key: 'receivedDate' }, { label: 'Refund Due', key: 'refundDue' },
    { label: 'Overdue', key: 'overdue' }, { label: 'QC Result', key: 'qc' },
    { label: 'Refund Amount', key: 'amount' }, { label: 'Refund UTR', key: 'utr' },
    { label: 'Return AWB', key: 'awb' }, { label: 'Courier', key: 'courier' },
    { label: 'Investigation Ticket', key: 'ticket' }, { label: 'Claim Status', key: 'claim' },
  ];

  const csvData = useMemo(() => filtered.map((row) => {
    const rt = row.refundDetails?.returnTracking || {};
    return {
      orderId: row._id,
      orderItemId: row.orderItemId || '',
      customer: row.userId?.name || '',
      email: row.userId?.email || '',
      requested: fmtDate(row.refundDetails?.requestedAt || row.date),
      status: labelOf(row.view?.status),
      pickupDate: fmtDate(rt.pickupDate),
      days: row.view?.daysSincePickup ?? '',
      receivedDate: fmtDate(rt.receivedDate),
      refundDue: fmtDate(row.view?.refundDueDate),
      overdue: row.view?.refundOverdue ? 'YES' : 'No',
      qc: rt.qcResult || '',
      amount: row.refundDetails?.amount || 0,
      utr: rt.refundUtr || '',
      awb: row.refundDetails?.pickup?.awb || '',
      courier: row.refundDetails?.pickup?.courier || '',
      ticket: rt.investigationTicket || '',
      claim: rt.claimStatus && rt.claimStatus !== 'none' ? rt.claimStatus : '',
    };
  }), [filtered]);

  const activeTabMeta = TABS.find((tab) => tab.key === activeTab);

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Return Journey</h2>
          <p className="text-slate-500 font-medium text-sm">
            Pickup to refund. Status is derived from three dates — no background jobs, nothing to get stuck.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchReturns({ silent: true })}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <CSVLink
            data={csvData}
            headers={csvHeaders}
            filename={`Returns_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
          >
            <Download size={13} /> Export
          </CSVLink>
        </div>
      </div>

      {/* Refund-deadline alert. Deliberately cuts across every tab: a refund can
          fall due while the parcel is still missing, and that is exactly the
          case where waiting costs the most. */}
      {overdueCount > 0 && (
        <button
          onClick={() => setOverdueOnly((prev) => !prev)}
          className={`w-full mb-6 flex items-center gap-3.5 rounded-2xl px-5 py-4 border-2 text-left transition-all ${
            overdueOnly ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-red-50 border-red-200 text-red-800 hover:border-red-400'
          }`}
        >
          <AlertTriangle size={20} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black uppercase tracking-wide">
              {overdueCount} refund{overdueCount > 1 ? 's' : ''} past the {settings?.returnMaxRefundDays ?? 15}-day promise
            </p>
            <p className={`text-[11px] font-bold ${overdueOnly ? 'text-red-100' : 'text-red-600'}`}>
              Pay these now and recover from the courier separately — a chargeback costs more than the parcel.
            </p>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shrink-0 ${overdueOnly ? 'bg-white/20' : 'bg-red-600 text-white'}`}>
            {overdueOnly ? 'Filtering' : 'Show only'}
          </span>
        </button>
      )}

      {/* Tabs double as the queue overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {TABS.map((tab) => {
          const tone = TONES[tab.accent];
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              title={tab.hint}
              className={`group relative text-left rounded-2xl p-4 border transition-all duration-200 ${
                isActive
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/15 scale-[1.02]'
                  : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={15} className={isActive ? 'text-white/70' : tone.text} />
                <span className={`text-2xl font-black leading-none ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {counts[tab.key]}
                </span>
              </div>
              <p className={`text-[10px] font-black uppercase tracking-wider leading-tight ${isActive ? 'text-white' : 'text-slate-600'}`}>
                {tab.label}
              </p>
              {!isActive && counts[tab.key] > 0 && <span className={`absolute top-0 left-4 right-4 h-[3px] rounded-b-full ${tone.solid}`} />}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-slate-50/50">
          <div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-wide">{activeTabMeta?.label}</p>
            <p className="text-[11px] text-slate-400 font-bold">{activeTabMeta?.hint}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Order ID, name, AWB, ticket…"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all text-xs font-semibold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border shrink-0 ${startDate || endDate ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'}`}>
              <CalendarRange size={14} className={startDate || endDate ? 'text-white' : 'text-slate-400'} />
              <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)}
                className={`text-[11px] font-bold bg-transparent focus:outline-none cursor-pointer ${startDate || endDate ? 'text-white' : 'text-slate-700'}`} aria-label="From date" />
              <span className={`text-[11px] font-bold ${startDate || endDate ? 'text-white/40' : 'text-slate-300'}`}>→</span>
              <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)}
                className={`text-[11px] font-bold bg-transparent focus:outline-none cursor-pointer ${startDate || endDate ? 'text-white' : 'text-slate-700'}`} aria-label="To date" />
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(''); setEndDate(''); }} title="Clear dates" className="text-white/60 hover:text-white transition-colors">
                  <XCircle size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                {['Return', 'Customer', 'Clock', 'Status', 'Refund', ''].map((heading, i) => (
                  <th key={i} className={`px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i === 5 ? 'text-right' : 'text-left'}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-16 text-center text-slate-400 font-bold text-sm">Loading returns…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-20 text-center">
                    <Undo2 size={28} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-bold text-sm">Nothing in {activeTabMeta?.label.toLowerCase()}.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const view = row.view || {};
                  const rt = row.refundDetails?.returnTracking || {};
                  const tone = toneOf(view.status);
                  const critical = settings?.returnCriticalDays ?? 10;
                  const lost = settings?.returnLostDays ?? 50;
                  // Fraction of the way to being written off, so the row shows
                  // urgency at a glance rather than making anyone do the maths.
                  const progress = view.daysSincePickup !== null && view.daysSincePickup !== undefined
                    ? Math.min(100, (view.daysSincePickup / lost) * 100)
                    : 0;

                  return (
                    <tr key={row._id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => setSelectedId(row._id)}>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${tone.chip}`}><Undo2 size={16} /></div>
                          <div>
                            <p className="text-sm font-black text-slate-900">#{row.orderItemId || row._id.slice(-8).toUpperCase()}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {fmtDate(row.refundDetails?.requestedAt || row.date)}
                              {row.refundDetails?.pickup?.awb ? ` · AWB ${row.refundDetails.pickup.awb}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-xs font-black text-slate-800">{row.userId?.name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{currency}{(row.orderTotal || 0).toFixed(2)} · {row.paymentMethod}</p>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap w-44">
                        {rt.pickupDate ? (
                          <>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-black text-slate-900 leading-none">{view.daysSincePickup}</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase">
                                {rt.receivedDate ? `days · ${view.transitDays}d transit` : 'days out'}
                              </span>
                            </div>
                            {!rt.receivedDate && (
                              <div className="mt-1.5 h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    view.daysSincePickup >= lost ? 'bg-red-500' : view.daysSincePickup >= critical ? 'bg-amber-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Not picked up</span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${tone.chip}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                          {row.refundDetails?.status === 'pending' ? 'Awaiting Approval'
                            : row.refundDetails?.status === 'rejected' ? 'Rejected'
                            : labelOf(view.status)}
                        </span>
                        {view.isManual && <span className="block mt-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">Manual override</span>}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {row.refundDetails?.status === 'completed' ? (
                          <div>
                            <p className="text-xs font-black text-emerald-600">{currency}{(row.refundDetails.amount || 0).toFixed(2)}</p>
                            <p className="text-[10px] font-bold text-slate-400">{rt.refundUtr ? `UTR ${rt.refundUtr}` : 'Paid'}</p>
                          </div>
                        ) : view.refundOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                            <AlertTriangle size={10} /> {Math.abs(view.daysToRefundDeadline)}d overdue
                          </span>
                        ) : view.daysToRefundDeadline !== null && view.daysToRefundDeadline !== undefined ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                            <Clock size={10} /> {view.daysToRefundDeadline}d left
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <span className="inline-flex p-2 bg-slate-100 text-slate-500 rounded-xl group-hover:bg-slate-900 transition-all">
                          <Eye size={16} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400">
              Showing {filtered.length} of {rows.length} returns
            </p>
            {settings && (
              <p className="text-[11px] font-bold text-slate-400">
                Critical {settings.returnCriticalDays}d · Lost {settings.returnLostDays}d · Refund by {settings.returnMaxRefundDays}d
              </p>
            )}
          </div>
        )}
      </div>

      {selected && (
        <ReturnDrawer
          request={selected}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onAction={runAction}
          onApprove={approveReturn}
          onReject={rejectReturn}
        />
      )}
    </div>
  );
};

export default ReturnRequests;
