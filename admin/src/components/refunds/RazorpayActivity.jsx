import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { backendUrl, currency } from '../../App';
import { toast } from 'react-toastify';
import { Banknote, ExternalLink, RefreshCw, X, Landmark, CreditCard, RotateCcw } from 'lucide-react';

// Recent Razorpay activity, surfaced right on the Refunds page so admin
// doesn't have to open razorpay.com just to check "did this settle / did
// that payment go through". Deliberately does NOT claim to show an account
// "balance" — the standard Razorpay Payment Gateway API (the RAZORPAY_KEY_ID
// / RAZORPAY_KEY_SECRET this app uses) has no endpoint for a live balance;
// that figure only exists on RazorpayX (a separate business-banking
// product). Settlements — money that has actually moved to the bank — are
// the closest honest substitute, so that's what's shown and labeled as such.

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const TABS = [
  { key: 'settlements', label: 'Settlements', icon: Landmark },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'refunds', label: 'Refunds', icon: RotateCcw },
];

const STATUS_TONE = {
  processed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  captured: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  authorized: 'bg-blue-50 text-blue-700 border-blue-100',
  created: 'bg-slate-50 text-slate-600 border-slate-200',
  processing: 'bg-amber-50 text-amber-700 border-amber-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  failed: 'bg-red-50 text-red-700 border-red-100',
  reversed: 'bg-red-50 text-red-700 border-red-100',
};

// --- Transactions modal: settlements / payments / refunds tabs, paginated
// straight off Razorpay's own `count`/`skip` params. ---
const RazorpayTransactionsModal = ({ token, onClose }) => {
  const [activeTab, setActiveTab] = useState('settlements');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const PAGE_SIZE = 20;

  const fetchPage = useCallback(async (tab, skip, { append = false } = {}) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`${backendUrl}/api/refund/razorpay-transactions`, {
        params: { type: tab, count: PAGE_SIZE, skip },
        headers: { token },
      });
      if (data.success) {
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total || 0);
      } else {
        setError(data.message || 'Failed to load from Razorpay.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reach Razorpay.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  useEffect(() => { fetchPage(activeTab, 0); }, [activeTab, fetchPage]);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setItems([]);
  };

  const amountLabel = (item) => (
    activeTab === 'settlements' ? `${currency}${item.amount.toFixed(2)}` : `${currency}${item.amount.toFixed(2)}`
  );

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-3xl">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Razorpay Transactions</h3>
            <p className="text-xs text-gray-500 font-bold">Live from Razorpay — same data as the dashboard, without leaving here.</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-400 hover:text-gray-900">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-4 flex items-center gap-2 border-b border-gray-100">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab.key ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={13} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-6 py-16 text-center text-gray-400 font-medium text-sm">Loading from Razorpay…</p>
          ) : error ? (
            <div className="px-6 py-16 text-center">
              <p className="text-red-500 font-bold text-sm mb-3">{error}</p>
              <button onClick={() => fetchPage(activeTab, 0)} className="text-xs font-black uppercase tracking-widest text-pink-600 hover:text-pink-700">Retry</button>
            </div>
          ) : items.length === 0 ? (
            <p className="px-6 py-16 text-center text-gray-400 font-medium text-sm">No {activeTab} found.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {activeTab === 'settlements' ? 'UTR' : activeTab === 'payments' ? 'Method' : 'Payment ID'}
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-3.5 text-xs font-bold text-gray-700 font-mono">{item.id}</td>
                    <td className="px-6 py-3.5 text-sm font-black text-gray-900">{amountLabel(item)}</td>
                    <td className="px-6 py-3.5 text-xs font-bold text-gray-600">
                      {activeTab === 'settlements' ? (item.utr || '—') : activeTab === 'payments' ? (item.method || '—') : (item.paymentId || '—')}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_TONE[item.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-bold text-gray-500">{fmtDate(item.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && !error && items.length > 0 && items.length < total && (
          <div className="p-4 border-t border-gray-100 text-center">
            <button
              onClick={() => fetchPage(activeTab, items.length, { append: true })}
              disabled={loadingMore}
              className="text-xs font-black uppercase tracking-widest text-pink-600 hover:text-pink-700 disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : `Load more (${items.length} of ${total})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Compact summary strip shown at the top of the Refunds page ---
const RazorpayActivity = ({ token }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await axios.get(`${backendUrl}/api/refund/razorpay-summary`, { headers: { token } });
      if (data.success) {
        setSummary(data.summary);
      } else {
        setError(true);
        toast.error(data.message || 'Could not reach Razorpay.');
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const last = summary?.lastSettlement;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-500 shrink-0">
            <Banknote size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Razorpay — Last Settlement</p>
            {loading ? (
              <p className="text-sm font-bold text-gray-400">Checking Razorpay…</p>
            ) : error ? (
              <p className="text-sm font-bold text-red-500">Couldn't reach Razorpay right now.</p>
            ) : last ? (
              <p className="text-sm font-black text-gray-900 truncate">
                {currency}{last.amount.toFixed(2)} <span className="text-gray-400 font-bold">· {fmtDate(last.date)} · UTR {last.utr || '—'}</span>
              </p>
            ) : (
              <p className="text-sm font-bold text-gray-400">No settlements yet.</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchSummary}
            disabled={loading}
            title="Refresh"
            className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowTransactions(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all"
          >
            <ExternalLink size={13} /> View Transactions
          </button>
        </div>
      </div>

      {showTransactions && <RazorpayTransactionsModal token={token} onClose={() => setShowTransactions(false)} />}
    </>
  );
};

export default RazorpayActivity;
