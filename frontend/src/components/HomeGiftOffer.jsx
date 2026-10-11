import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, Gift, Sparkles, X } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { analytics } from '../analytics/runtime';
import { isPublicGiftCoupon, validateHomeGiftOffer } from '../../../shared/homeGiftOffer.js';
import giftArtwork from '../../../shared/gift-offer.svg';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function HomeGiftOffer({ open, onOpenChange }) {
  const [settings, setSettings] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const dialog = useRef(null);
  const request = useRef(null);
  const titleId = useId();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { token, isAuthenticated } = useAuthStore();
  const signedIn = Boolean(token && isAuthenticated);
  const consent = useSyncExternalStore(analytics.subscribe, analytics.getSnapshot);
  const waitingForConsent = !consent.ready || (consent.enabled && !consent.consent) || consent.managing;

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${backendUrl}/api/cms/homeGiftOffer`, { signal: controller.signal, timeout: 8000 })
      .then(({ data }) => { if (data.success) setSettings(validateHomeGiftOffer(data.content)); })
      .catch(() => { /* A promotional outage must not interrupt shopping. */ })
      .finally(() => { if (!controller.signal.aborted) setLoaded(true); });
    return () => { controller.abort(); request.current?.abort(); };
  }, []);

  // Return here after the existing sign-in flow; no coupon or customer data is put in the URL.
  useEffect(() => {
    if (!loaded || waitingForConsent || new URLSearchParams(location.search).get('gift') !== '1') return;
    if (signedIn && settings?.enabled) onOpenChange(true);
    const params = new URLSearchParams(location.search);
    params.delete('gift');
    navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true });
  }, [loaded, waitingForConsent, signedIn, settings, location.pathname, location.search, location.hash, navigate, onOpenChange]);

  useEffect(() => {
    if (!open || waitingForConsent || !settings?.enabled) return;
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, waitingForConsent, settings?.enabled]);

  const revealGift = async () => {
    if (!signedIn) {
      onOpenChange(false);
      navigate('/auth', { state: { from: '/?gift=1' } });
      return;
    }
    if (busy) return;
    setBusy(true);
    setMessage('');
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const [offer, coupons] = await Promise.all([
        axios.get(`${backendUrl}/api/cms/homeGiftOffer`, { signal: controller.signal, timeout: 8000 }),
        axios.get(`${backendUrl}/api/coupon/all`, { headers: { token }, signal: controller.signal, timeout: 8000 }),
      ]);
      if (!offer.data.success || !coupons.data.success) throw new Error('Your gift could not be loaded. Please try again.');
      const current = validateHomeGiftOffer(offer.data.content);
      const coupon = coupons.data.coupons?.find(item => item.code === current.couponCode);
      if (!current.enabled || !isPublicGiftCoupon(coupon)) throw new Error('This gift is no longer available for your account. Please check other offers while shopping.');
      setSettings(current);
      setRevealed(true);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error.response?.data?.message || error.message || 'Please try again in a moment.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(settings.couponCode);
      setCopied(true);
      setMessage('');
    } catch {
      setCopied(false);
      setMessage('Copy is unavailable in this browser. Select the code above and copy it manually.');
    }
  };

  if (!settings?.enabled || waitingForConsent) return null;
  const colors = { '--gift-bg': settings.backgroundColor, '--gift-ink': settings.textColor, '--gift-button': settings.buttonColor, '--gift-button-ink': settings.buttonTextColor, '--gift-paper': settings.ticketColor };

  return <>
    {!dismissed && <div style={colors} className="fixed bottom-5 left-3 z-[60] font-sans sm:bottom-7 sm:left-6">
      <button type="button" aria-label="Dismiss gift offer" onClick={() => setDismissed(true)} className="absolute -right-2 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-700 shadow-md transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><X size={16} /></button>
      <Motion.button type="button" aria-label="Open your gift offer" aria-haspopup="dialog" onClick={() => { setMessage(''); onOpenChange(true); }}
        initial={reduceMotion ? false : { y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        whileHover={reduceMotion ? undefined : { y: -4, rotate: -3 }} whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        className="relative flex w-24 flex-col items-center rounded-2xl border-[3px] border-white bg-[var(--gift-bg)] px-2 pb-3 pt-6 text-[var(--gift-ink)] shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:w-28">
        <span aria-hidden="true" className="absolute -top-4 flex h-9 w-12 items-center justify-center rounded-xl border-[3px] border-white bg-[var(--gift-bg)]"><Gift size={29} strokeWidth={2} /></span>
        <span className="w-full break-words border-b border-black/10 pb-1 text-[10px] font-extrabold uppercase leading-tight tracking-wide">{settings.badgeLabel}</span>
        <span className="mt-1.5 w-full break-words text-xl font-black uppercase leading-none sm:text-2xl">{settings.badgeOffer}</span>
        <span className="mt-1 w-full break-words text-xs font-extrabold uppercase leading-tight">{settings.badgeCaption}</span>
      </Motion.button>
    </div>}

    <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onOpenChange(false); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onOpenChange(false);
      }}
      style={colors} className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[420px] overflow-y-auto overscroll-contain rounded-[26px] border-0 bg-[var(--gift-bg)] p-0 font-sans text-[var(--gift-ink)] shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-sm">
      {open && <Motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="relative isolate overflow-hidden px-5 pb-6 pt-12 text-center sm:px-8 sm:pb-8">
        <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-40 -z-10 h-96 w-96 rounded-full bg-white/15" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-52 -right-28 -z-10 h-96 w-96 rounded-full bg-black/5" />
        <button type="button" autoFocus aria-label="Close gift offer" onClick={() => onOpenChange(false)} className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-800 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><X size={20} /></button>
        <h2 id={titleId} className="break-words font-sans text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px]">{revealed ? settings.revealTitle : settings.title}</h2>
        {settings.description && <p className="mx-auto mt-2 max-w-xs break-words text-xs leading-relaxed opacity-80 sm:text-sm">{settings.description}</p>}

        <div className="relative mx-auto mt-6 max-w-[300px]">
          <div aria-hidden="true" className="absolute -left-2 -right-2 -top-1 h-4 rounded-full border border-black/20 bg-black/10 shadow-inner" />
          <div className="relative bg-[var(--gift-paper)] pt-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
            <p className="break-words px-4 text-sm font-semibold uppercase tracking-[0.25em] sm:text-base sm:tracking-[0.35em]">{settings.ticketLabel}</p>
            <div aria-hidden="true" className="relative mt-5 flex justify-between border-t-2 border-dashed border-[var(--gift-bg)]">
              {Array.from({ length: 11 }, (_, index) => <span key={index} className="-mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--gift-bg)] first:-ml-1.5 last:-mr-1.5" />)}
            </div>
            {revealed ? <Motion.div key="revealed" initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex min-h-48 flex-col items-center justify-center px-5 py-6" aria-live="polite">
              <Sparkles size={30} className="mb-4 opacity-60" aria-hidden="true" />
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Your coupon code</p>
              <p className="mt-2 w-full select-all break-all text-2xl font-black tracking-wide sm:text-3xl">{settings.couponCode}</p>
              <button type="button" onClick={copyCode} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-current px-5 py-2 text-xs font-semibold transition hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied!' : 'Copy code'}</button>
            </Motion.div> : <img src={giftArtwork} alt="A golden gift box with a surprise inside" width="300" height="250" className="mx-auto aspect-[6/5] w-full max-w-[270px] p-2" />}
          </div>
        </div>

        {message && <p role="status" className="mt-4 rounded-xl bg-white/80 p-3 text-xs leading-relaxed text-slate-800">{message}</p>}
        {revealed ? <button type="button" onClick={() => { onOpenChange(false); navigate('/products'); }} className="mt-6 min-h-12 w-full break-words rounded-full bg-[var(--gift-button)] px-5 py-3 text-sm font-bold text-[var(--gift-button-ink)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Continue shopping</button>
          : <button type="button" disabled={busy} onClick={revealGift} className="mt-6 min-h-12 w-full break-words rounded-full bg-[var(--gift-button)] px-5 py-3 text-sm font-bold uppercase tracking-wide text-[var(--gift-button-ink)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60">{busy ? 'Opening your gift...' : settings.buttonText}</button>}
        {!signedIn && <p className="mt-3 text-[11px] leading-relaxed opacity-80">Sign in to reveal and use your gift.</p>}
        {settings.terms && <p className="mx-auto mt-3 max-w-xs break-words text-[11px] leading-relaxed opacity-75">{settings.terms}</p>}
      </Motion.div>}
    </dialog>
  </>;
}
