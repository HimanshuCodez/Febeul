import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { Eye, Gift, Palette, RefreshCcw, Save, Ticket } from 'lucide-react';
import { DEFAULT_HOME_GIFT_OFFER, GIFT_COLOR_FIELDS, GIFT_TEXT_FIELDS, isPublicGiftCoupon, validateHomeGiftOffer } from '../../../shared/homeGiftOffer.js';
import giftArtwork from '../../../shared/gift-offer.svg';

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
  const [previewRevealed, setPreviewRevealed] = useState(false);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await axios.get(`${backendUrl}/api/cms/admin/homeGiftOffer`, { headers: { token }, signal });
      if (!data.success) throw new Error(data.message || 'Could not load the home gift offer.');
      setContent(validateHomeGiftOffer(data.content));
      setDirty(false);
    } catch (error) {
      if (!axios.isCancel(error)) setLoadError(error.response?.data?.message || error.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    axios.get(`${backendUrl}/api/coupon/active`, { signal: controller.signal })
      .then(({ data }) => setCoupons((data.coupons || []).filter(coupon => isPublicGiftCoupon(coupon))))
      .catch(() => { /* The code can still be entered manually. Saving validates it on the server. */ });
    return () => controller.abort();
  }, [load]);

  const update = (key, value) => {
    setContent(current => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const save = async event => {
    event.preventDefault();
    let normalized;
    try { normalized = validateHomeGiftOffer(content); }
    catch (error) { toast.error(error.message); return; }
    setSaving(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/cms`, { name: 'homeGiftOffer', content: normalized }, { headers: { token } });
      if (!data.success) throw new Error(data.message || 'Could not save the gift offer.');
      setContent(validateHomeGiftOffer(data.content));
      setDirty(false);
      toast.success('Gift offer saved. Refresh the home page to see your changes.');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not save the gift offer.');
    } finally { setSaving(false); }
  };

  if (loading) return <p role="status" className="py-20 text-center text-sm text-slate-500">Loading gift offer...</p>;
  if (loadError) return <div className="rounded-2xl border border-rose-100 bg-white p-6"><p role="alert" className="text-sm text-rose-600">{loadError}</p><button type="button" onClick={() => load()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white"><RefreshCcw size={16} /> Retry</button></div>;

  const previewColors = { '--gift-bg': content.backgroundColor, '--gift-ink': content.textColor, '--gift-button': content.buttonColor, '--gift-button-ink': content.buttonTextColor, '--gift-paper': content.ticketColor };

  return <form onSubmit={save} className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-pink-600"><Gift size={22} /></span>
        <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-pink-600">Marketing &amp; content</p><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Home Gift Offer</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">A floating gift on your home page. Visitors tap to open the offer, then reveal and copy your coupon after signing in.</p></div>
      </div>
      <button type="submit" disabled={saving || !dirty} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"><Save size={17} />{saving ? 'Saving...' : 'Save gift offer'}</button>
    </header>

    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <fieldset disabled={saving} className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-900">Visibility &amp; coupon</h2><p className="mt-1 text-xs text-slate-500">Hidden until you select a valid coupon and enable it.</p></div><label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700"><input type="checkbox" checked={content.enabled} onChange={event => update('enabled', event.target.checked)} className="h-5 w-5 rounded accent-pink-600" />Show on home page</label></div>
          <label className="mt-5 block text-xs font-semibold text-slate-600">Coupon code<input list="home-gift-coupons" value={content.couponCode} onChange={event => update('couponCode', event.target.value.toUpperCase())} maxLength={64} placeholder="Select or enter an existing coupon" className={inputClass} /></label>
          <datalist id="home-gift-coupons">{coupons.map(coupon => <option key={coupon._id || coupon.code} value={coupon.code}>{coupon.description || coupon.code}</option>)}</datalist>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Use an active public coupon from <Link to="/coupons" className="font-semibold text-pink-600 underline underline-offset-2">Coupons</Link>. This does not create a new discount or apply it automatically. Expired, exhausted, private and Luxe-only coupons are hidden. Existing checkout conditions still apply.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Ticket size={17} className="text-pink-500" />Offer text</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Match any discount shown on the badge to the coupon you selected.</p>
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">{GIFT_TEXT_FIELDS.map(([key, label, max]) => <label key={key} className={'block min-w-0 text-xs font-semibold text-slate-600 ' + (['title', 'description', 'terms'].includes(key) ? 'sm:col-span-2' : '')}>{label}<input value={content[key]} maxLength={max} onChange={event => update(key, event.target.value)} className={inputClass} /></label>)}</div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Palette size={17} className="text-pink-500" />Colors</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">The badge and popup share these colors. Choose contrasting text and background colors for readability.</p>
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">{GIFT_COLOR_FIELDS.map(([key, label]) => <label key={key} className="block min-w-0 text-xs font-semibold text-slate-600">{label}<span className="mt-2 flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-2"><input type="color" aria-label={label} value={content[key]} onChange={event => update(key, event.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" /><span className="font-mono text-xs font-normal uppercase text-slate-500">{content[key]}</span></span></label>)}</div>
          <button type="button" onClick={() => { setContent(current => ({ ...current, ...Object.fromEntries(GIFT_COLOR_FIELDS.map(([key]) => [key, DEFAULT_HOME_GIFT_OFFER[key]])) })); setDirty(true); }} className="mt-5 text-xs font-semibold text-pink-600 underline underline-offset-4">Reset colors to gold</button>
        </section>
      </fieldset>

      <aside className="min-w-0 xl:sticky xl:top-5 xl:self-start" aria-label="Gift offer live preview">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Eye size={16} />Live preview</h2><span className={'rounded-full px-2.5 py-1 text-[10px] font-semibold ' + (content.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{content.enabled ? 'Enabled on save' : 'Hidden'}</span></div>
          <div style={previewColors} className="mx-auto max-w-[340px] rounded-3xl bg-[var(--gift-bg)] px-4 py-7 text-center text-[var(--gift-ink)] shadow-sm">
            <h3 className="break-words text-xl font-extrabold leading-tight">{previewRevealed ? content.revealTitle : content.title}</h3>
            <p className="mt-2 break-words text-xs leading-relaxed opacity-80">{content.description}</p>
            <div className="relative mx-2 mt-5 bg-[var(--gift-paper)] pt-5 shadow-md"><div className="absolute -left-2 -right-2 -top-1 h-2 rounded-full bg-black/15" /><p className="break-words px-2 text-sm font-semibold tracking-[0.25em]">{content.ticketLabel}</p><div className="mt-4 border-t-2 border-dashed border-[var(--gift-bg)]" />{previewRevealed ? <div className="flex min-h-44 flex-col items-center justify-center p-4"><p className="text-[10px] uppercase tracking-widest">Your coupon code</p><p className="mt-3 w-full break-all text-2xl font-black">{content.couponCode || 'YOURCODE'}</p><p className="mt-4 text-xs underline underline-offset-4">Copy code</p></div> : <img src={giftArtwork} alt="Golden surprise gift preview" width="300" height="250" className="mx-auto w-full max-w-[240px]" />}</div>
            <button type="button" onClick={() => setPreviewRevealed(value => !value)} className="mt-5 min-h-11 w-full break-words rounded-full bg-[var(--gift-button)] px-4 py-3 text-xs font-bold uppercase text-[var(--gift-button-ink)]">{previewRevealed ? 'Preview unopened gift' : content.buttonText}</button>
            <p className="mt-3 break-words text-[10px] leading-relaxed opacity-75">{content.terms}</p>
          </div>
          <div style={previewColors} className="mt-6 flex items-center gap-4 rounded-xl bg-slate-50 p-4"><div className="relative mt-2 w-24 shrink-0 rounded-xl border-[3px] border-white bg-[var(--gift-bg)] px-2 pb-3 pt-5 text-center text-[var(--gift-ink)] shadow-md"><Gift size={26} className="absolute -top-4 left-1/2 -translate-x-1/2 rounded bg-[var(--gift-bg)]" /><p className="break-words text-[9px] font-bold">{content.badgeLabel}</p><p className="mt-1 break-words text-xl font-black leading-tight">{content.badgeOffer}</p><p className="break-words text-[10px] font-bold">{content.badgeCaption}</p></div><p className="text-xs leading-relaxed text-slate-500">Floating badge on the bottom left of the home page.</p></div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">Preview only. Save to publish. The gift waits until cookie choices are made and opens when tapped.</p>
        </div>
      </aside>
    </div>
  </form>;
}
