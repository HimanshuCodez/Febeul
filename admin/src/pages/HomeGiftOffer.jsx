import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { Eye, Gift, Palette, RefreshCcw, Save, Ticket } from 'lucide-react';
import { DEFAULT_HOME_GIFT_OFFER, GIFT_COLOR_FIELDS, GIFT_TEXT_FIELDS, getCouponDiscountLabel, validateHomeGiftOffer } from '../../../shared/homeGiftOffer.js';
import HomeGiftOfferPreview from '../components/HomeGiftOfferPreview';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const inputClass = 'mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100';

// eslint-disable-next-line react/prop-types
export default function HomeGiftOffer({ token }) {
  const [content, setContent] = useState({ ...DEFAULT_HOME_GIFT_OFFER });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const selectedCoupon = coupons.find(coupon => coupon.code === content.couponCode);
  const discountLabel = getCouponDiscountLabel(selectedCoupon);
  const previewContent = { ...content, badgeOffer: selectedCoupon?.eligibleForGift ? discountLabel : '' };

  const load = useCallback(async (signal, refreshOnly = false) => {
    if (refreshOnly) setRefreshing(true);
    else { setLoading(true); setLoadError(''); }
    try {
      const { data } = await axios.get(`${backendUrl}/api/cms/admin/homeGiftOffer`, { headers: { token }, signal });
      if (!data.success) throw new Error(data.message || 'Could not load the home gift offer.');
      setCoupons(data.coupons || []);
      if (!refreshOnly) {
        setContent(validateHomeGiftOffer(data.content));
        setDirty(false);
      }
    } catch (error) {
      if (!axios.isCancel(error)) {
        const message = error.response?.data?.message || error.message;
        if (refreshOnly) toast.error(message); else setLoadError(message);
      }
    } finally {
      if (!signal?.aborted) { if (refreshOnly) setRefreshing(false); else setLoading(false); }
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const update = (key, value) => {
    setContent(current => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const save = async event => {
    event.preventDefault();
    if (content.enabled && !selectedCoupon?.eligibleForGift) { toast.error('Select an available public coupon before enabling the gift offer.'); return; }
    let normalized;
    try { normalized = validateHomeGiftOffer(previewContent); }
    catch (error) { toast.error(error.message); return; }
    setSaving(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/cms`, { name: 'homeGiftOffer', content: normalized }, { headers: { token } });
      if (!data.success) throw new Error(data.message || 'Could not save the gift offer.');
      setContent(validateHomeGiftOffer(data.content));
      await load(undefined, true);
      setDirty(false);
      toast.success('Gift offer saved. Refresh the home page to see your changes.');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not save the gift offer.');
    } finally { setSaving(false); }
  };

  if (loading) return <p role="status" className="py-20 text-center text-sm text-slate-500">Loading gift offer...</p>;
  if (loadError) return <div className="rounded-2xl border border-rose-100 bg-white p-6"><p role="alert" className="text-sm text-rose-600">{loadError}</p><button type="button" onClick={() => load()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white"><RefreshCcw size={16} /> Retry</button></div>;

  return <form onSubmit={save} className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-pink-600"><Gift size={22} /></span>
        <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-pink-600">Marketing &amp; content</p><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Home Gift Offer</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">A floating gift on your home page. Visitors tap to open the offer, then reveal and copy your coupon after signing in.</p></div>
      </div>
      <button type="submit" disabled={saving || refreshing || !dirty || (content.enabled && !selectedCoupon?.eligibleForGift)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"><Save size={17} />{saving ? 'Saving...' : 'Save gift offer'}</button>
    </header>

    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <fieldset disabled={saving} className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-900">Visibility &amp; coupon</h2><p className="mt-1 text-xs text-slate-500">Hidden until you select a valid coupon and enable it.</p></div><label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700"><input type="checkbox" checked={content.enabled} onChange={event => update('enabled', event.target.checked)} className="h-5 w-5 rounded accent-pink-600" />Show on home page</label></div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="block min-w-0 flex-1 basis-64 text-xs font-semibold text-slate-600">Coupon code
              <select value={content.couponCode} onChange={event => update('couponCode', event.target.value)} disabled={refreshing} className={inputClass}>
                <option value="">Select an active coupon</option>
                {content.couponCode && !selectedCoupon && <option value={content.couponCode} disabled>{content.couponCode} — No longer active</option>}
                {coupons.map(coupon => <option key={coupon._id || coupon.code} value={coupon.code} disabled={!coupon.eligibleForGift}>{coupon.code} — {getCouponDiscountLabel(coupon) || 'No discount'}{coupon.restriction ? ` (${coupon.restriction})` : ''}</option>)}
              </select>
            </label>
            <button type="button" disabled={refreshing} onClick={() => load(undefined, true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing...' : 'Refresh coupons'}</button>
          </div>
          {!coupons.length && <p className="mt-3 text-xs text-amber-700">No active coupons available. Create or activate a coupon in Coupons, then refresh this list.</p>}
          {content.couponCode && !selectedCoupon?.eligibleForGift && <p role="alert" className="mt-3 text-xs text-amber-700">This coupon is unavailable for the public home-page offer. Choose another coupon or hide the gift.</p>}
          <p className="mt-3 text-xs leading-relaxed text-slate-500">All active coupons from <Link to="/coupons" className="font-semibold text-pink-600 underline underline-offset-2">Coupons</Link> are listed with their discount. Customer-specific, Luxe-only and membership-only coupons are marked and cannot be used for this public offer. Expired and exhausted coupons are excluded. Checkout conditions still apply.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Gift size={17} className="text-pink-500" />Floating gift</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">The discount beneath the gift box comes automatically from the selected coupon. Changes in Coupons appear on the next home-page load.</p>
          <div className="mt-4 rounded-xl border border-pink-100 bg-pink-50/60 p-4"><p className="text-xs font-semibold text-slate-500">Automatic discount</p><output aria-label="Automatic discount" className="mt-1 block text-xl font-semibold text-slate-900">{selectedCoupon?.eligibleForGift ? discountLabel : 'Select an available coupon'}</output></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Ticket size={17} className="text-pink-500" />Popup text</h2>
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">{GIFT_TEXT_FIELDS.filter(([key]) => !key.startsWith('badge')).map(([key, label, max]) => <label key={key} className={'block min-w-0 text-xs font-semibold text-slate-600 ' + (['title', 'description', 'terms'].includes(key) ? 'sm:col-span-2' : '')}>{label}<input value={content[key]} maxLength={max} onChange={event => update(key, event.target.value)} className={inputClass} /></label>)}</div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Palette size={17} className="text-pink-500" />Colors</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Customize the popup colors with the live preview. The animated gift box has a gold finish.</p>
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">{GIFT_COLOR_FIELDS.map(([key, label]) => <label key={key} className="block min-w-0 text-xs font-semibold text-slate-600">{label}<span className="mt-2 flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-2"><input type="color" aria-label={label} value={content[key]} onChange={event => update(key, event.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" /><span className="font-mono text-xs font-normal uppercase text-slate-500">{content[key]}</span></span></label>)}</div>
          <button type="button" onClick={() => { setContent(current => ({ ...current, ...Object.fromEntries(GIFT_COLOR_FIELDS.map(([key]) => [key, DEFAULT_HOME_GIFT_OFFER[key]])) })); setDirty(true); }} className="mt-5 text-xs font-semibold text-pink-600 underline underline-offset-4">Reset colors to gold</button>
        </section>
      </fieldset>

      <aside className="min-w-0 xl:self-start" aria-label="Gift offer live preview">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Eye size={16} />Live preview</h2><span className={'rounded-full px-2.5 py-1 text-[10px] font-semibold ' + (content.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{content.enabled ? 'Enabled on save' : 'Hidden'}</span></div>
          <HomeGiftOfferPreview content={previewContent} />
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">Preview only. Save to publish. The gift waits until cookie choices are made and opens when tapped.</p>
        </div>
      </aside>
    </div>
  </form>;
}
