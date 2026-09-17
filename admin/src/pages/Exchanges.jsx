import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';
import { CSVLink } from 'react-csv';
import { Repeat, Eye, Search, CalendarRange, XCircle, Download, RefreshCw, Inbox } from 'lucide-react';
import ExchangeDrawer from '../components/exchanges/ExchangeDrawer';
import { EXCHANGE_TABS, TONES, toneOf, labelOf, fmtDate, REASON_LABELS } from '../utils/exchangeStatus';

// Exchange queue — wrong item / damaged item replacements. One collection,
// one table, several filters (same "no status computed here" rule as the
// Return Journey queue: the backend sends `view.bucket` / `view.status` down
// already decided, so this file only ever selects rows, never re-derives them).

const Exchanges = ({ token }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('approval');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const fetchExchanges = useCallback(async ({ silent = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/exchange/list`, { headers: { token } });
      if (data.success) {
        setRows(data.exchanges || []);
      } else {
        toast.error(data.message || 'Failed to load exchanges.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load exchanges.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchExchanges(); }, [fetchExchanges]);

  const selected = useMemo(() => rows.find((row) => row._id === selectedId) || null, [rows, selectedId]);

  const counts = useMemo(() => {
    const base = EXCHANGE_TABS.reduce((acc, tab) => ({ ...acc, [tab.key]: 0 }), {});
    rows.forEach((row) => { base[row.view?.bucket] = (base[row.view?.bucket] || 0) + 1; });
    return base;
  }, [rows]);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.view?.bucket !== activeTab) return false;

      if (query) {
        const haystack = [
          row.ticketId, row.userId?.name, row.userId?.email,
          row.originalItem?.name, row.reversePickup?.awb, row.forwardShipment?.awb,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      const time = new Date(row.createdAt).getTime();
      if (startDate && time < new Date(startDate).setHours(0, 0, 0, 0)) return false;
      if (endDate && time > new Date(endDate).setHours(23, 59, 59, 999)) return false;
      return true;
    });
  }, [rows, activeTab, searchTerm, startDate, endDate]);

  // Every drawer action posts, toasts, then re-reads the list — so the row and
  // the drawer can never show two different versions of the same exchange.
  const runAction = async (endpoint, payload, { multipart = false } = {}) => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/exchange/${endpoint}`, payload, {
        headers: multipart ? { token } : { token, 'Content-Type': 'application/json' },
      });
      if (data.success) {
        toast.success(data.message || 'Updated.');
        await fetchExchanges({ silent: true });
      } else {
        toast.error(data.message || 'Action failed.');
      }
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed.');
      return { success: false };
    } finally {
      setBusy(false);
    }
  };

  const csvHeaders = [
    { label: 'Ticket', key: 'ticketId' }, { label: 'Order Item', key: 'orderItemId' },
    { label: 'Customer', key: 'customer' }, { label: 'Email', key: 'email' },
    { label: 'Product', key: 'product' }, { label: 'Reason', key: 'reason' },
    { label: 'Requested', key: 'requested' }, { label: 'Status', key: 'status' },
    { label: 'Reverse AWB', key: 'reverseAwb' }, { label: 'Forward AWB', key: 'forwardAwb' },
  ];

  const csvData = useMemo(() => filtered.map((row) => ({
    ticketId: row.ticketId,
    orderItemId: row.orderId,
    customer: row.userId?.name || '',
    email: row.userId?.email || '',
    product: `${row.originalItem?.name || ''} (${row.originalItem?.size || ''})`,
    reason: REASON_LABELS[row.reason] || row.reason,
    requested: fmtDate(row.createdAt),
    status: labelOf(row.view?.status),
    reverseAwb: row.reversePickup?.awb || '',
    forwardAwb: row.forwardShipment?.awb || '',
  })), [filtered]);

  const activeTabMeta = EXCHANGE_TABS.find((tab) => tab.key === activeTab);

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Exchanges</h2>
          <p className="text-slate-500 font-medium text-sm">
            Wrong item or damaged product replacements — pickup, QC and replacement dispatch, one ticket at a time.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchExchanges({ silent: true })}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <CSVLink
            data={csvData}
            headers={csvHeaders}
            filename={`Exchanges_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
          >
            <Download size={13} /> Export
          </CSVLink>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        {EXCHANGE_TABS.map((tab) => {
          const tone = TONES[tab.accent];
          const isActive = activeTab === tab.key;
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
                <Repeat size={15} className={isActive ? 'text-white/70' : tone.text} />
                <span className={`text-2xl font-black leading-none ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {counts[tab.key] || 0}
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
                placeholder="Ticket, name, AWB…"
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
                {['Ticket', 'Customer', 'Item', 'Reason', 'Status', ''].map((heading, i) => (
                  <th key={i} className={`px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i === 5 ? 'text-right' : 'text-left'}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-16 text-center text-slate-400 font-bold text-sm">Loading exchanges…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-20 text-center">
                    <Inbox size={28} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-bold text-sm">Nothing in {activeTabMeta?.label.toLowerCase()}.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const tone = toneOf(row.view?.status);
                  return (
                    <tr key={row._id} className="hover:bg-slate-50/70 transition-colors cursor-pointer group" onClick={() => setSelectedId(row._id)}>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${tone.chip}`}><Repeat size={16} /></div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{row.ticketId}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{fmtDate(row.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-xs font-black text-slate-800">{row.userId?.name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{row.userId?.email}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {row.originalItem?.image && (
                            <img src={row.originalItem.image} alt="" className="w-9 h-9 object-cover rounded-lg border border-slate-100" />
                          )}
                          <div>
                            <p className="text-xs font-bold text-slate-700 max-w-[160px] truncate">{row.originalItem?.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold">Size {row.originalItem?.size}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-slate-600">{REASON_LABELS[row.reason] || row.reason}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${tone.chip}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                          {labelOf(row.view?.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <span className="inline-flex p-2 bg-slate-100 text-slate-500 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">
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
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400">Showing {filtered.length} of {rows.length} exchanges</p>
          </div>
        )}
      </div>

      {selected && (
        <ExchangeDrawer
          exchange={selected}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onAction={runAction}
        />
      )}
    </div>
  );
};

export default Exchanges;
