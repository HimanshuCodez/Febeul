import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ArrowRight, Check, Copy, Gift, LoaderCircle, LockKeyhole, Pause, Play, Sparkle, Sparkles, Ticket, X } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { analytics } from '../analytics/runtime';
import { getGiftDiscountLabel, isPublicGiftCoupon, validateHomeGiftOffer } from '../../../shared/homeGiftOffer.js';
import './HomeGiftOffer.css';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
const subscribeToReducedMotion = listener => {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
const getReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
const sparklePositions = [[13, 26, 12], [82, 17, 18], [76, 72, 11], [18, 76, 17], [52, 9, 9], [91, 49, 8]];
const confettiPieces = Array.from({ length: 14 }, (_, index) => ({
  '--confetti-x': `${Math.cos(index * 2.4) * (85 + index * 5)}px`,
  '--confetti-y': `${Math.sin(index * 2.4) * 90 - 45}px`,
  '--confetti-rotation': `${index * 67}deg`,
  animationDelay: `${index % 4 * 0.05}s`,
}));

function GiftArtwork({ compact = false }) {
  return <div className="gift-offer-art" aria-hidden="true">
    {!compact && <><div className="gift-offer-orbit gift-offer-orbit--outer" />
      <div className="gift-offer-orbit gift-offer-orbit--inner" /></>}
    <div className="gift-offer-present-shadow" />
    <div className="gift-offer-present">
      <div className="gift-offer-box"><span className="gift-offer-ribbon" /><span className="gift-offer-box-mark">F</span></div>
      <div className="gift-offer-lid">
        <span className="gift-offer-bow gift-offer-bow--left" />
        <span className="gift-offer-bow gift-offer-bow--right" />
        <span className="gift-offer-bow-knot" />
        <span className="gift-offer-lid-ribbon" />
      </div>
      {!compact && <span className="gift-offer-tag"><Sparkles size={12} strokeWidth={1.3} />For you</span>}
    </div>
    {sparklePositions.map(([left, top, size], index) => <Sparkle key={index} className="gift-offer-sparkle" size={size} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${index * 0.55}s` }} />)}
  </div>;
}

export default function HomeGiftOffer({ open, onOpenChange }) {
  const [settings, setSettings] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [paused, setPaused] = useState(false);
  const dialog = useRef(null);
  const request = useRef(null);
  const titleId = useId();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => true);
  const motionStopped = reduceMotion || paused;
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
  const discountLabel = getGiftDiscountLabel(settings.badgeOffer);
  const colors = { '--gift-bg': settings.backgroundColor, '--gift-ink': settings.textColor, '--gift-button': settings.buttonColor, '--gift-button-ink': settings.buttonTextColor, '--gift-paper': settings.ticketColor };

  return <>
    <AnimatePresence>
      {!dismissed && <Motion.div style={colors} className="gift-offer-launcher" data-motion={motionStopped || open ? 'paused' : 'playing'}
        initial={motionStopped ? false : { y: 24, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: motionStopped ? 0 : 12, opacity: 0, scale: motionStopped ? 1 : 0.94 }} transition={{ duration: motionStopped ? 0 : 0.35 }}>
        <button type="button" aria-label="Dismiss gift offer" onClick={() => setDismissed(true)} className="gift-offer-dismiss"><X size={12} /></button>
        <Motion.button type="button" aria-label="Open your gift offer" aria-haspopup="dialog" onClick={() => { setMessage(''); onOpenChange(true); }}
          whileHover={motionStopped ? undefined : { y: -5, scale: 1.06 }} whileTap={motionStopped ? undefined : { scale: 0.95 }} className="gift-offer-launcher-button">
          <GiftArtwork compact />
          {discountLabel && <span className="gift-offer-discount">{discountLabel}</span>}
        </Motion.button>
      </Motion.div>}
    </AnimatePresence>

    <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onOpenChange(false); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onOpenChange(false);
      }}
      style={colors} className="gift-offer-dialog" data-motion={motionStopped ? 'paused' : 'playing'}>
      {open && <div className="gift-offer-content" data-revealed={revealed} data-busy={busy}>
        <div className="gift-offer-ambient" aria-hidden="true" />
        <button type="button" autoFocus aria-label="Close gift offer" onClick={() => onOpenChange(false)} className="gift-offer-close"><X size={18} strokeWidth={1.5} /></button>
        {!reduceMotion && <button type="button" aria-label={paused ? 'Play gift animations' : 'Pause gift animations'} aria-pressed={paused} onClick={() => setPaused(value => !value)} className="gift-offer-playback">
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>}

        <header className="gift-offer-header">
          <div className="gift-offer-eyebrow"><span /><Sparkle size={12} aria-hidden="true" />A gift from Febeul<span /></div>
          <h2 id={titleId} className="gift-offer-title">{revealed ? settings.revealTitle : settings.title}</h2>
          {settings.description && <p className="gift-offer-description">{settings.description}</p>}
        </header>

        <div className="gift-offer-stage" aria-live="polite" aria-busy={busy}>
          <AnimatePresence mode="wait" initial={false}>
            {revealed ? <Motion.div key="revealed" className="gift-offer-reveal" initial={motionStopped ? false : { opacity: 0, y: 18, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: motionStopped ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}>
              <div className="gift-offer-confetti" aria-hidden="true">{confettiPieces.map((style, index) => <i key={index} style={style} />)}</div>
              <div className="gift-offer-success" aria-hidden="true"><Check size={24} strokeWidth={1.5} /></div>
              <div className="gift-offer-ticket">
                <div className="gift-offer-ticket-heading"><Ticket size={15} aria-hidden="true" /><span>{settings.ticketLabel}</span><Sparkles size={14} aria-hidden="true" /></div>
                <div className="gift-offer-ticket-body">
                  <p className="gift-offer-code-label">Your coupon code</p>
                  <p className="gift-offer-code">{settings.couponCode}</p>
                  <button type="button" onClick={copyCode} className="gift-offer-copy" data-copied={copied}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied!' : 'Copy code'}
                  </button>
                </div>
                <div className="gift-offer-ticket-footer"><span /><span>Unwrapped. Just for you.</span><span /></div>
              </div>
            </Motion.div> : <Motion.div key="wrapped" className="gift-offer-wrapped" exit={motionStopped ? { opacity: 0 } : { opacity: 0, y: -15, scale: 1.08 }} transition={{ duration: motionStopped ? 0 : 0.25 }}>
              <GiftArtwork />
              <div className="gift-offer-seal"><Ticket size={14} aria-hidden="true" /><span>{settings.ticketLabel}</span><span className="gift-offer-seal-line" /><LockKeyhole size={11} aria-hidden="true" /><span className="gift-offer-seal-hint">Unwrap to reveal</span></div>
            </Motion.div>}
          </AnimatePresence>
        </div>

        <div className="gift-offer-actions">
          {message && <p role="status" className="gift-offer-message">{message}</p>}
          {revealed ? <button type="button" onClick={() => { onOpenChange(false); navigate('/products'); }} className="gift-offer-primary"><span>Continue shopping</span><ArrowRight size={17} aria-hidden="true" /></button>
            : <button type="button" disabled={busy} onClick={revealGift} className="gift-offer-primary">
              {busy ? <LoaderCircle size={17} className="gift-offer-spinner" aria-hidden="true" /> : <Gift size={17} strokeWidth={1.5} aria-hidden="true" />}<span>{busy ? 'Opening your gift...' : settings.buttonText}</span>{!busy && <ArrowRight size={17} aria-hidden="true" />}
            </button>}
          {!signedIn && <p className="gift-offer-signin"><LockKeyhole size={10} aria-hidden="true" />Sign in to reveal and use your gift.</p>}
          {settings.terms && <p className="gift-offer-terms">{settings.terms}</p>}
        </div>
        <div className="gift-offer-footer" aria-hidden="true"><span />Little luxuries. Lovely surprises.<span /></div>
      </div>}
    </dialog>
  </>;
}
