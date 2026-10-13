import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { CSVLink } from 'react-csv';
import {
  ArrowDownToLine, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight,
  CircleCheck, Clock3, Infinity as InfinityIcon, Loader2, Pencil, Plus,
  Search, SlidersHorizontal, Sparkles, Ticket, Trash2, Users, X,
} from 'lucide-react';
import { backendUrl } from '../App';
import useSearchPrefill from '../search/useSearchPrefill';
import { isCouponExpired, isLifetimeCoupon } from '../../../shared/couponValidity.js';

const inputClass = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 disabled:bg-slate-50';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50';
const audienceLabels = { normal: 'All customers', luxe: 'Luxe members', membership: 'Membership purchase' };
const paymentLabels = { none: 'Any payment method', prepaid: 'Online payments', cod: 'Cash on delivery' };
const freshCoupon = () => ({
  code: '', description: '', discountType: 'percentage', discountValue: '',
  minOrderAmount: '', minQuantity: '', usageLimit: '', usageLimitPerUser: '1',
  expiryDate: '', isLifetime: false, isActive: true, userType: 'normal',
  offerType: 'none', applicableSKUs: '', specificUsers: '',
});
const dateLabel = value => value && Number.isFinite(new Date(value).getTime())
  ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'No date';
const discountLabel = coupon => coupon.discountType === 'percentage' ? `${coupon.discountValue || 0}%` : `₹${Number(coupon.discountValue || 0).toLocaleString('en-IN')}`;
const statusOf = coupon => isCouponExpired(coupon) ? 'Expired' : !coupon.isActive ? 'Paused'
  : coupon.usageLimit && coupon.usageCount >= coupon.usageLimit ? 'Exhausted' : 'Active';
const splitList = value => value.split(',').map(item => item.trim()).filter(Boolean);
// Spreadsheet exports must not turn customer-provided text into formulas.
const safeCell = value => typeof value === 'string' && (/^\s*[=+@-]/.test(value) || /^[\t\r\n]/.test(value)) ? `'${value}` : value;
const safeRows = rows => rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeCell(value)])));
const usageHeaders = [
  { label: 'Customer', key: 'name' }, { label: 'Email', key: 'email' },
  { label: 'Mobile', key: 'mobile' }, { label: 'Redemptions', key: 'count' },
];
const couponHeaders = [
  { label: 'Code', key: 'code' }, { label: 'Description', key: 'description' },
  { label: 'Discount type', key: 'discountType' }, { label: 'Discount value', key: 'discountValue' },
  { label: 'Audience', key: 'audience' }, { label: 'Status', key: 'status' },
  { label: 'Validity', key: 'validity' }, { label: 'Expiry date (UTC)', key: 'expiryDate' },
  { label: 'Created', key: 'createdAt' }, { label: 'Redemptions', key: 'usageCount' },
  { label: 'Total limit', key: 'usageLimit' }, { label: 'Per customer limit', key: 'usageLimitPerUser' },
  { label: 'Minimum order', key: 'minOrderAmount' }, { label: 'Minimum quantity', key: 'minQuantity' },
  { label: 'Payment method', key: 'offerType' }, { label: 'SKUs', key: 'applicableSKUs' },
];

function StatusBadge({ coupon }) {
  const status = statusOf(coupon);
  const color = status === 'Active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
    : status === 'Expired' ? 'bg-rose-50 text-rose-700 ring-rose-600/15' : 'bg-slate-100 text-slate-600 ring-slate-400/20';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${color}`}><span className='h-1.5 w-1.5 rounded-full bg-current' />{status}</span>;
}

function Field({ label, name, hint, children }) {
  return <div className='min-w-0 space-y-1.5'><label htmlFor={name} className='block text-sm font-medium text-slate-700'>{label}</label>{children}{hint && <p className='text-xs leading-relaxed text-slate-500'>{hint}</p>}</div>;
}

function Modal({ title, subtitle, onClose, busy, children, footer, wide = false }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={dialog} aria-labelledby='coupon-dialog-title' onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}
    className={`m-auto max-h-[92dvh] w-[calc(100%-2rem)] overflow-hidden rounded-2xl bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
    <div className='flex max-h-[92dvh] flex-col' onClick={event => event.stopPropagation()}>
      <div className='flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7'>
        <div><h2 id='coupon-dialog-title' className='text-xl font-semibold tracking-tight'>{title}</h2><p className='mt-1 text-sm text-slate-500'>{subtitle}</p></div>
        <button type='button' aria-label='Close dialog' onClick={onClose} disabled={busy} className={`${buttonClass} shrink-0 border-transparent p-2`}><X size={20} /></button>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto'>{children}</div>
      {footer && <div className='flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7'>{footer}</div>}
    </div>
  </dialog>;
}

const Coupons = ({ token }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useSearchPrefill();
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(freshCoupon);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const role = localStorage.getItem('role');

  const fetchCoupons = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true); setLoadError('');
    try {
      const { data } = await axios.get(`${backendUrl}/api/coupon/list`, { headers: { token } });
      if (!data.success) throw new Error(data.message);
      setCoupons(data.coupons || []);
    } catch { setLoadError('We could not load your coupons. Please try again.'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);
  useEffect(() => { setPage(1); }, [searchTerm, statusFilter, startDate, endDate]);

  const openEditor = coupon => {
    setEditingCouponId(coupon?._id || null);
    setForm(coupon ? {
      ...freshCoupon(), ...coupon, isLifetime: isLifetimeCoupon(coupon),
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().slice(0, 10) : '',
      description: coupon.description || '',
      usageLimit: coupon.usageLimit || '', usageLimitPerUser: coupon.usageLimitPerUser ?? '',
      applicableSKUs: (coupon.applicableSKUs || []).join(', '), specificUsers: (coupon.specificUsers || []).join(', '),
    } : freshCoupon());
    setShowForm(true);
  };
  const change = event => {
    const { name, value, type, checked } = event.target;
    setForm(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
  };
  const generateCode = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    setForm(previous => ({ ...previous, code: `FEB${Array.from(bytes, byte => byte.toString(36)).join('').slice(0, 7).toUpperCase()}` }));
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (isSubmitting) return;
    const value = Number(form.discountValue);
    if (!form.code.trim() || !Number.isFinite(value) || value <= 0 || (form.discountType === 'percentage' && value > 100)) {
      toast.error('Enter a coupon code and a valid discount. Percentages cannot exceed 100%.'); return;
    }
    if (!form.isLifetime && !form.expiryDate) { toast.error('Choose an expiry date or lifetime validity.'); return; }
    setIsSubmitting(true);
    try {
      const payload = {
        id: editingCouponId || undefined, code: form.code.trim().toUpperCase(), description: form.description.trim(),
        discountType: form.discountType, discountValue: value,
        minOrderAmount: Number(form.minOrderAmount || 0), minQuantity: Number(form.minQuantity || 0),
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
        usageLimitPerUser: form.usageLimitPerUser === '' ? null : Number(form.usageLimitPerUser),
        isLifetime: form.isLifetime, expiryDate: form.isLifetime ? null : form.expiryDate,
        isActive: form.isActive, userType: form.userType, offerType: form.offerType,
        applicableSKUs: splitList(form.applicableSKUs), specificUsers: splitList(form.specificUsers),
      };
      const { data } = await axios.post(`${backendUrl}/api/coupon/${editingCouponId ? 'update' : 'add'}`, payload, { headers: { token } });
      if (!data.success) throw new Error(data.message || 'Could not save coupon.');
      toast.success(editingCouponId ? 'Coupon updated.' : 'Coupon created.');
      setShowForm(false); await fetchCoupons();
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not save coupon.'); }
    finally { setIsSubmitting(false); }
  };
  const deleteCoupon = async coupon => {
    if (!window.confirm(`Delete ${coupon.code}? This cannot be undone. Pause the coupon instead if you want to keep its history.`)) return;
    setDeletingId(coupon._id);
    try {
      const { data } = await axios.post(`${backendUrl}/api/coupon/remove`, { id: coupon._id }, { headers: { token } });
      if (!data.success) throw new Error(data.message);
      toast.success('Coupon deleted.'); await fetchCoupons();
    } catch { toast.error('Could not delete this coupon.'); }
    finally { setDeletingId(''); }
  };
  const showUsage = async coupon => {
    setUsageLoading(coupon._id);
    try {
      const { data } = await axios.get(`${backendUrl}/api/coupon/usage/${coupon._id}`, { headers: { token } });
      if (!data.success) throw new Error(data.message);
      const grouped = new Map();
      for (const entry of data.users || []) {
        const user = entry.userId;
        if (!user?._id) continue;
        const row = grouped.get(user._id) || { name: user.name || 'Customer', email: user.email || '—', mobile: user.mobile || '—', count: 0 };
        row.count += 1; grouped.set(user._id, row);
      }
      setUsage({ code: coupon.code, rows: [...grouped.values()] });
    } catch { toast.error('Could not load redemption history.'); }
    finally { setUsageLoading(''); }
  };
  const exportAllUsage = async () => {
    setIsExporting(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/coupon/usage-all`, { headers: { token } });
      if (!data.success) throw new Error(data.message);
      if (!data.allUsage?.length) { toast.info('No redemptions to export yet.'); return; }
      const headers = [...usageHeaders, { label: 'Coupon code', key: 'couponCode' }];
      const quote = value => `"${String(safeCell(value) ?? '').replaceAll('"', '""')}"`;
      const csv = [headers.map(header => quote(header.label)).join(','), ...data.allUsage.map(row => headers.map(header => quote(row[header.key])).join(','))].join('\r\n');
      const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a'); link.href = url; link.download = 'coupon-redemptions.csv'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error('Could not export redemptions.'); }
    finally { setIsExporting(false); }
  };

  const filtered = coupons.filter(coupon => {
    const query = searchTerm.trim().toLowerCase();
    const matchesText = `${coupon.code} ${coupon.description || ''}`.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Lifetime' ? isLifetimeCoupon(coupon) : statusOf(coupon) === statusFilter);
    const created = coupon.createdAt ? new Date(coupon.createdAt).getTime() : NaN;
    return matchesText && matchesStatus && (!startDate || created >= new Date(`${startDate}T00:00:00`).getTime())
      && (!endDate || created <= new Date(`${endDate}T23:59:59.999`).getTime());
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const stats = [
    { label: 'Total coupons', value: coupons.length, caption: 'Across all campaigns', icon: Ticket },
    { label: 'Active coupons', value: coupons.filter(coupon => statusOf(coupon) === 'Active').length, caption: 'Available to redeem', icon: CircleCheck },
    { label: 'Lifetime coupons', value: coupons.filter(isLifetimeCoupon).length, caption: 'No expiry date', icon: InfinityIcon },
    { label: 'Total redemptions', value: coupons.reduce((sum, coupon) => sum + (coupon.usageCount || 0), 0), caption: 'All-time coupon usage', icon: ArrowUpRight },
  ];
  const exportRows = safeRows(filtered.map(coupon => ({
    ...coupon, audience: audienceLabels[coupon.userType], status: statusOf(coupon),
    validity: isLifetimeCoupon(coupon) ? 'Lifetime' : 'Fixed date', expiryDate: isLifetimeCoupon(coupon) ? 'Never expires' : dateLabel(coupon.expiryDate),
    createdAt: dateLabel(coupon.createdAt), usageLimit: coupon.usageLimit || 'Unlimited', usageLimitPerUser: coupon.usageLimitPerUser || 'Unlimited',
    applicableSKUs: (coupon.applicableSKUs || []).join(', '),
  })));
  const clearFilters = () => { setSearchTerm(''); setStatusFilter('All'); setStartDate(''); setEndDate(''); };
  const hasFilters = Boolean(searchTerm || statusFilter !== 'All' || startDate || endDate);
  const actions = coupon => <div className='flex items-center gap-1'>
    <button type='button' aria-label={`Edit ${coupon.code}`} title='Edit coupon' onClick={() => openEditor(coupon)} className={`${buttonClass} border-transparent p-2`}><Pencil size={16} /></button>
    <button type='button' aria-label={`View usage for ${coupon.code}`} title='Redemption history' disabled={Boolean(usageLoading)} onClick={() => showUsage(coupon)} className={`${buttonClass} border-transparent p-2`}>{usageLoading === coupon._id ? <Loader2 size={16} className='animate-spin' /> : <Users size={16} />}</button>
    {role !== 'staff' && <button type='button' aria-label={`Delete ${coupon.code}`} title='Delete coupon' disabled={Boolean(deletingId)} onClick={() => deleteCoupon(coupon)} className={`${buttonClass} border-transparent p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600`}>{deletingId === coupon._id ? <Loader2 size={16} className='animate-spin' /> : <Trash2 size={16} />}</button>}
  </div>;
  const validity = coupon => <div className='text-sm'>{isLifetimeCoupon(coupon)
    ? <><span className='inline-flex items-center gap-1.5 font-medium text-emerald-700'><InfinityIcon size={16} />Lifetime</span><p className='mt-1 text-xs text-slate-500'>Never expires</p></>
    : <><span className='font-medium text-slate-700'>{dateLabel(coupon.expiryDate)}</span><p className='mt-1 text-xs text-slate-500'>Expiry date · UTC</p></>}</div>;
  const usageSummary = coupon => <div className='min-w-[110px] text-sm'><span className='font-medium text-slate-800'>{coupon.usageCount || 0}</span><span className='text-slate-400'> / {coupon.usageLimit || 'unlimited'}</span>
    {coupon.usageLimit > 0 && <div className='mt-2 h-1 w-24 overflow-hidden rounded-full bg-slate-100'><div className='h-full rounded-full bg-emerald-600' style={{ width: `${Math.min(100, (coupon.usageCount || 0) / coupon.usageLimit * 100)}%` }} /></div>}
    <p className='mt-1 text-xs text-slate-500'>{coupon.usageLimitPerUser || 'Unlimited'} per customer</p></div>;

  return <div className='mx-auto max-w-[1500px] space-y-6 text-slate-800'>
    <header className='flex flex-col justify-between gap-5 xl:flex-row xl:items-end'>
      <div><p className='mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700'>Sales / Promotions</p><h1 className='text-3xl font-semibold tracking-tight'>Coupons</h1><p className='mt-2 text-sm text-slate-500'>Create and manage offers that keep customers coming back.</p></div>
      <div className='flex flex-wrap gap-2'>
        <button type='button' onClick={exportAllUsage} disabled={isExporting || loading} className={buttonClass}>{isExporting ? <Loader2 size={16} className='animate-spin' /> : <ArrowDownToLine size={16} />}Export usage</button>
        <button type='button' onClick={() => openEditor()} className={primaryClass}><Plus size={17} />Create coupon</button>
      </div>
    </header>

    <section aria-label='Coupon overview' className='grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4'>
      {stats.map(({ label, value, caption, icon: Icon }) => <div key={label} className='rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5'>
        <div className='flex items-center justify-between gap-2'><span className='text-xs font-medium text-slate-500 sm:text-sm'>{label}</span><Icon size={17} className='shrink-0 text-emerald-700' /></div>
        <p className='mt-4 text-3xl font-semibold tabular-nums tracking-tight'>{loading || loadError ? '—' : value.toLocaleString('en-IN')}</p><p className='mt-1 text-xs text-slate-400'>{caption}</p>
      </div>)}
    </section>

    <section aria-label='Coupon directory' className='overflow-hidden rounded-xl border border-slate-200/80 bg-white'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 pt-4 sm:px-5'>
        <div aria-label='Filter coupons by status' className='flex max-w-full gap-1 overflow-x-auto pb-3'>
          {['All', 'Active', 'Lifetime', 'Expired', 'Paused', 'Exhausted'].map(status => <button type='button' key={status} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-emerald-600 ${statusFilter === status ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'}`}>{status === 'All' ? 'All coupons' : status}</button>)}
        </div>
        <CSVLink data={exportRows} headers={couponHeaders} filename='coupons.csv' className='mb-3 inline-flex items-center gap-2 px-2 py-2 text-xs font-medium text-slate-500 hover:text-emerald-700'><ArrowDownToLine size={15} />Export coupons</CSVLink>
      </div>
      <div className='flex flex-wrap items-center gap-3 p-4 sm:px-5'>
        <div className='relative min-w-0 flex-1 basis-48'><Search size={17} className='pointer-events-none absolute left-3 top-3 text-slate-400' /><input aria-label='Search coupons' value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder='Search code or description…' className={`${inputClass} pl-10`} /></div>
        <button type='button' aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)} className={buttonClass}><SlidersHorizontal size={16} />Filters{(startDate || endDate) && <span className='h-1.5 w-1.5 rounded-full bg-emerald-600' />}</button>
        {hasFilters && <button type='button' onClick={clearFilters} className='px-2 py-2 text-xs font-medium text-slate-500 hover:text-slate-900'>Clear all</button>}
      </div>
      {showFilters && <div className='flex flex-wrap items-end gap-3 border-t border-slate-100 bg-slate-50/60 p-4 sm:px-5'>
        <Field label='Created from' name='created-from'><input id='created-from' type='date' value={startDate} max={endDate || undefined} onChange={event => setStartDate(event.target.value)} className={inputClass} /></Field>
        <Field label='Created until' name='created-until'><input id='created-until' type='date' value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} className={inputClass} /></Field>
      </div>}

      {loading ? <div role='status' className='flex items-center justify-center gap-3 py-24 text-sm text-slate-500'><Loader2 size={20} className='animate-spin text-emerald-600' />Loading coupons…</div>
        : loadError ? <div role='alert' className='space-y-4 px-6 py-16 text-center'><p className='text-sm text-slate-500'>{loadError}</p><button type='button' onClick={fetchCoupons} className={buttonClass}>Try again</button></div>
          : !filtered.length ? <div className='flex flex-col items-center px-6 py-16 text-center'><div className='mb-4 rounded-2xl bg-emerald-50 p-4 text-emerald-700'><Ticket size={28} /></div><h2 className='font-semibold'>{hasFilters ? 'No matching coupons' : 'Your next offer starts here'}</h2><p className='mb-5 mt-2 max-w-sm text-sm text-slate-500'>{hasFilters ? 'Try a different search or clear your filters.' : 'Create a limited-time promotion or a lifetime reward for your customers.'}</p><button type='button' onClick={hasFilters ? clearFilters : () => openEditor()} className={buttonClass}>{hasFilters ? 'Clear filters' : 'Create your first coupon'}</button></div>
            : <>
              <div className='hidden overflow-x-auto lg:block'><table className='w-full text-left text-sm'>
                <thead className='border-y border-slate-100 bg-slate-50/80 text-[11px] font-medium uppercase tracking-wider text-slate-500'><tr>{['Coupon', 'Offer', 'Validity', 'Redemptions', 'Status', 'Actions'].map(label => <th key={label} scope='col' className='whitespace-nowrap px-5 py-3 font-medium'>{label}</th>)}</tr></thead>
                <tbody className='divide-y divide-slate-100'>{visible.map(coupon => <tr key={coupon._id} className='transition hover:bg-slate-50/60'>
                  <td className='px-5 py-5'><div className='flex items-start gap-3'><span className='rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-slate-500'><Ticket size={18} /></span><div className='min-w-0'><p className='max-w-[240px] break-all font-semibold tracking-wide'>{coupon.code}</p><p title={coupon.description} className='mt-1 max-w-[220px] truncate text-xs text-slate-500'>{coupon.description || 'No description'}</p><p className='mt-1.5 text-[11px] text-slate-400'>Created {dateLabel(coupon.createdAt)}</p></div></div></td>
                  <td className='px-5 py-5'><p className='whitespace-nowrap font-semibold'>{discountLabel(coupon)} off</p><p className='mt-1 text-xs text-slate-500'>{audienceLabels[coupon.userType] || 'All customers'}</p></td>
                  <td className='whitespace-nowrap px-5 py-5'>{validity(coupon)}</td><td className='px-5 py-5'>{usageSummary(coupon)}</td><td className='px-5 py-5'><StatusBadge coupon={coupon} /></td><td className='px-4 py-5'>{actions(coupon)}</td>
                </tr>)}</tbody>
              </table></div>
              <div className='divide-y divide-slate-100 border-t border-slate-100 lg:hidden'>{visible.map(coupon => <article key={coupon._id} aria-label={`Coupon ${coupon.code}`} className='p-4 sm:p-5'>
                <div className='flex items-start justify-between gap-3'><div className='min-w-0'><h2 className='break-all font-semibold tracking-wide'>{coupon.code}</h2><p className='mt-1 text-sm font-medium text-emerald-700'>{discountLabel(coupon)} off <span className='text-xs font-normal text-slate-400'>· {audienceLabels[coupon.userType]}</span></p></div><StatusBadge coupon={coupon} /></div>
                <p className='mt-2 break-words text-xs leading-relaxed text-slate-500'>{coupon.description || 'No description'}</p><div className='my-4 grid grid-cols-2 gap-4'>{validity(coupon)}{usageSummary(coupon)}</div><div className='flex items-center justify-between gap-2 border-t border-slate-100 pt-3'><span className='text-[11px] text-slate-400'>Created {dateLabel(coupon.createdAt)}</span>{actions(coupon)}</div>
              </article>)}</div>
            </>}
      {!loading && !loadError && filtered.length > 0 && <footer className='flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:px-5'><p className='text-xs text-slate-500'><span className='font-medium text-slate-700'>{(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, filtered.length)}</span> of {filtered.length} coupons</p><div className='flex items-center gap-2'><button type='button' aria-label='Previous page' disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className={`${buttonClass} p-2`}><ChevronLeft size={16} /></button><span className='text-xs text-slate-500'>{currentPage} / {pages}</span><button type='button' aria-label='Next page' disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className={`${buttonClass} p-2`}><ChevronRight size={16} /></button></div></footer>}
    </section>

    {showForm && <Modal wide title={editingCouponId ? 'Edit coupon' : 'Create a coupon'} subtitle='Choose the reward, its audience, and how long it lasts.' onClose={() => setShowForm(false)} busy={isSubmitting}
      footer={<><button type='button' onClick={() => setShowForm(false)} disabled={isSubmitting} className={buttonClass}>Cancel</button><button type='submit' form='coupon-form' disabled={isSubmitting} className={primaryClass}>{isSubmitting ? <Loader2 size={16} className='animate-spin' /> : <Check size={16} />}{isSubmitting ? 'Saving…' : editingCouponId ? 'Save changes' : 'Create coupon'}</button></>}>
      <form id='coupon-form' onSubmit={handleSubmit} className='grid lg:grid-cols-[1fr_280px]'>
        <fieldset disabled={isSubmitting} className='min-w-0 space-y-7 p-5 sm:p-7'>
          <section className='space-y-4'><h3 className='flex items-center gap-2 text-sm font-semibold'><Ticket size={17} className='text-emerald-700' />Coupon details</h3>
            <Field label='Coupon code' name='code'><div className='flex gap-2'><input autoFocus id='code' name='code' required maxLength={100} value={form.code} onChange={change} placeholder='e.g. WELCOME20' className={`${inputClass} uppercase`} /><button type='button' onClick={generateCode} title='Generate a code' aria-label='Generate coupon code' className={`${buttonClass} shrink-0`}><Sparkles size={16} /></button></div></Field>
            <div className='grid grid-cols-2 gap-4'><Field label='Discount type' name='discountType'><select id='discountType' name='discountType' value={form.discountType} onChange={change} className={inputClass}><option value='percentage'>Percentage (%)</option><option value='fixed'>Fixed amount (₹)</option></select></Field><Field label={`Discount value ${form.discountType === 'percentage' ? '(%)' : '(₹)'}`} name='discountValue'><input id='discountValue' name='discountValue' type='number' required min='0.01' max={form.discountType === 'percentage' ? 100 : undefined} step='0.01' value={form.discountValue} onChange={change} placeholder='20' className={inputClass} /></Field></div>
            <Field label='Description' name='description' hint='A short explanation customers will see with this offer.'><textarea id='description' name='description' rows={2} maxLength={500} value={form.description} onChange={change} placeholder='A little welcome gift for your next order.' className={`${inputClass} resize-y`} /></Field>
          </section>

          <section className='space-y-4 border-t border-slate-100 pt-6'><h3 className='flex items-center gap-2 text-sm font-semibold'><CalendarDays size={17} className='text-emerald-700' />Validity</h3>
            <div className='grid grid-cols-2 gap-3'>
              {[{ lifetime: false, title: 'Fixed date', detail: 'Set an expiry date', icon: Clock3 }, { lifetime: true, title: 'Lifetime', detail: 'No expiry date', icon: InfinityIcon }].map(({ lifetime, title, detail, icon: Icon }) => <label key={title} className={`relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 transition sm:p-4 ${form.isLifetime === lifetime ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600/10' : 'border-slate-200 hover:border-slate-300'}`}><input type='radio' name='validity' value={title} checked={form.isLifetime === lifetime} onChange={() => setForm(previous => ({ ...previous, isLifetime: lifetime }))} className='absolute right-3 top-4 accent-emerald-700' /><Icon size={21} className={form.isLifetime === lifetime ? 'text-emerald-700' : 'text-slate-400'} /><span className='text-sm font-medium'>{title}</span><span className='text-xs text-slate-500'>{detail}</span></label>)}
            </div>
            {form.isLifetime ? <p className='rounded-lg bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-500'>This coupon has no expiry date. Redemption limits and customer restrictions still apply. You can pause it at any time.</p>
              : <Field label='Expiry date' name='expiryDate' hint='Valid through 23:59 UTC on the selected date.'><input id='expiryDate' name='expiryDate' type='date' required value={form.expiryDate} onChange={change} className={inputClass} /></Field>}
          </section>

          <section className='space-y-4 border-t border-slate-100 pt-6'><h3 className='flex items-center gap-2 text-sm font-semibold'><Users size={17} className='text-emerald-700' />Audience & conditions</h3>
            <div className='grid gap-4 sm:grid-cols-2'><Field label='Customer audience' name='userType'><select id='userType' name='userType' value={form.userType} onChange={change} className={inputClass}>{Object.entries(audienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label='Payment method' name='offerType'><select id='offerType' name='offerType' value={form.offerType} onChange={change} className={inputClass}>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
            {form.userType === 'membership' && <p className='text-xs leading-relaxed text-slate-500'>Shown on the Luxe page and redeemable on membership purchases only, including by non-members.</p>}
            <div className='grid grid-cols-2 gap-4'><Field label='Minimum order (₹)' name='minOrderAmount'><input id='minOrderAmount' name='minOrderAmount' type='number' min='0' step='0.01' value={form.minOrderAmount} onChange={change} placeholder='No minimum' className={inputClass} /></Field><Field label='Minimum quantity' name='minQuantity'><input id='minQuantity' name='minQuantity' type='number' min='0' step='1' value={form.minQuantity} onChange={change} placeholder='No minimum' className={inputClass} /></Field></div>
            <div className='grid grid-cols-2 gap-4'><Field label='Total redemption limit' name='usageLimit' hint='Leave blank for unlimited.'><input id='usageLimit' name='usageLimit' type='number' min='1' step='1' value={form.usageLimit} onChange={change} placeholder='Unlimited' className={inputClass} /></Field><Field label='Limit per customer' name='usageLimitPerUser' hint='Use 0 or leave blank for unlimited.'><input id='usageLimitPerUser' name='usageLimitPerUser' type='number' min='0' step='1' value={form.usageLimitPerUser} onChange={change} placeholder='Unlimited' className={inputClass} /></Field></div>
            <Field label='Product SKUs' name='applicableSKUs' hint='Separate SKUs with commas. Leave blank for all products.'><input id='applicableSKUs' name='applicableSKUs' value={form.applicableSKUs} onChange={change} placeholder='FB-TSHIRT-01, FB-JEANS-02' className={inputClass} /></Field>
            <Field label='Specific customers' name='specificUsers' hint='Separate emails or customer IDs with commas. Leave blank for everyone in the selected audience.'><input id='specificUsers' name='specificUsers' value={form.specificUsers} onChange={change} placeholder='customer@example.com' className={inputClass} /></Field>
          </section>
        </fieldset>
        <aside className='min-w-0 border-t border-slate-100 bg-slate-50/70 p-5 sm:p-7 lg:border-l lg:border-t-0'><div className='space-y-5 lg:sticky lg:top-7'>
          <div><p className='mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400'>Offer preview</p><div className='overflow-hidden rounded-xl border border-slate-200 bg-white'><div className='p-5'><Ticket size={24} className='mb-5 text-emerald-700' /><p className='break-words text-3xl font-semibold tracking-tight'>{discountLabel(form)} <span className='text-base font-normal text-slate-400'>off</span></p><p className='mt-3 break-all text-sm font-semibold uppercase tracking-wider'>{form.code || 'YOURCODE'}</p><p className='mt-2 break-words text-xs leading-relaxed text-slate-500'>{form.description || 'Your offer description appears here.'}</p></div><div className='space-y-2 border-t border-dashed border-slate-200 px-5 py-4 text-xs text-slate-500'><p className='flex items-center gap-2'>{form.isLifetime ? <InfinityIcon size={15} /> : <CalendarDays size={15} />}{form.isLifetime ? 'Lifetime · never expires' : form.expiryDate ? `Until ${dateLabel(form.expiryDate)}` : 'Choose an expiry date'}</p><p>{audienceLabels[form.userType]}</p>{Number(form.minOrderAmount) > 0 && <p>Minimum order ₹{form.minOrderAmount}</p>}</div></div></div>
          <label className='flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4'><input name='isActive' type='checkbox' checked={form.isActive} onChange={change} disabled={isSubmitting} className='mt-1 h-4 w-4 shrink-0 accent-emerald-700' /><span><span className='block text-sm font-medium'>Coupon active</span><span className='mt-1 block text-xs leading-relaxed text-slate-500'>Uncheck to pause redemptions while keeping the coupon and its history.</span></span></label>
        </div></aside>
      </form>
    </Modal>}

    {usage && <Modal title='Redemption history' subtitle={`Customers who used ${usage.code}`} onClose={() => setUsage(null)} footer={<>{usage.rows.length > 0 && <CSVLink data={safeRows(usage.rows)} headers={usageHeaders} filename='coupon-usage.csv' className={buttonClass}><ArrowDownToLine size={16} />Export CSV</CSVLink>}<button type='button' onClick={() => setUsage(null)} className={primaryClass}>Done</button></>}>
      {!usage.rows.length ? <div className='px-6 py-16 text-center'><Users size={32} className='mx-auto mb-3 text-slate-300' /><p className='font-medium'>No redemptions yet</p><p className='mt-2 text-sm text-slate-500'>Customer usage will appear here after an order uses this coupon.</p></div>
        : <div className='overflow-x-auto p-5'><table className='w-full text-left text-sm'><thead className='text-xs text-slate-500'><tr><th className='p-3 font-medium'>Customer</th><th className='p-3 font-medium'>Contact</th><th className='p-3 text-right font-medium'>Uses</th></tr></thead><tbody className='divide-y divide-slate-100'>{usage.rows.map((row, index) => <tr key={index}><td className='p-3 font-medium'>{row.name}</td><td className='p-3'><p>{row.email}</p><p className='mt-1 text-xs text-slate-400'>{row.mobile}</p></td><td className='p-3 text-right font-medium'>{row.count}</td></tr>)}</tbody></table></div>}
    </Modal>}
  </div>;
};

export default Coupons;
