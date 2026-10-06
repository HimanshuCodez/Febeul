import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { analytics } from './runtime.js';
import './AnalyticsConsent.css';

export default function AnalyticsConsent() {
  const location = useLocation();
  const state = useSyncExternalStore(analytics.subscribe, analytics.getSnapshot);
  const [optional, setOptional] = useState(false);
  const dialog = useRef(null);
  const reduceMotion = useReducedMotion();
  const showBanner = state.ready && state.enabled && !state.consent && !state.managing;
  useEffect(() => { void analytics.initialize(); }, []);
  useEffect(() => {
    if (!state.ready) return;
    const key = location.key;
    analytics.track('page_view', {}, `page:${key}`);
    if (location.pathname.toLowerCase() === '/products') {
      const search = new URLSearchParams(location.search).get('search');
      if (search) analytics.track('search', { searchTerm: search }, `search:${key}`);
    }
  }, [state.ready, location.key, location.pathname, location.search]);
  useEffect(() => {
    if (state.managing) { setOptional(state.consent?.analytics === true); dialog.current?.showModal(); }
    else dialog.current?.close();
  }, [state.managing, state.consent]);

  const button = 'rounded-lg border border-[#ce6d77] px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ce6d77]';
  return <>
      {showBanner && <Motion.section
        key="cookie-consent"
        aria-label="Cookie consent"
        aria-describedby="cookie-consent-description"
        className="cookie-consent-bar"
        initial={{ y: reduceMotion ? 0 : '100%', opacity: reduceMotion ? 1 : 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="cookie-consent-inner">
          <div className="cookie-consent-copy">
            <span className="cookie-consent-icon" aria-hidden="true"><Cookie size={24} strokeWidth={1.6} /></span>
            <div>
              <h2>Your cookie choices</h2>
              <p id="cookie-consent-description">
                Essential storage keeps sign-in, your bag and checkout working. Optional analytics helps us understand shopping activity using browser IDs and, when signed in, your account ID. It stays off until you accept.{' '}
                <a href="/DataPrivacy" target="_blank" rel="noopener noreferrer">Privacy policy</a>
              </p>
            </div>
          </div>
          <div className="cookie-consent-actions">
            <button type="button" className="cookie-consent-button cookie-consent-accept" onClick={() => analytics.setConsent(true)}>Accept all</button>
            <button type="button" className="cookie-consent-button cookie-consent-reject" onClick={() => analytics.setConsent(false)}>Reject optional</button>
            <button type="button" className="cookie-consent-button cookie-consent-manage" onClick={analytics.openSettings}>Manage preferences</button>
          </div>
        </div>
      </Motion.section>}
    <dialog ref={dialog} onCancel={analytics.closeSettings} onClick={event => { if (event.target === dialog.current) analytics.closeSettings(); }} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-gray-800 shadow-2xl backdrop:bg-black/40" aria-labelledby="cookie-settings-title">
      <div className="flex items-center justify-between gap-4"><h2 id="cookie-settings-title" className="text-xl font-bold">Cookie settings</h2><button onClick={analytics.closeSettings} aria-label="Close cookie settings" className="rounded-lg px-3 py-2">✕</button></div>
      <p className="mt-4 text-sm">You can shop with optional analytics switched off. Change your choice here at any time.</p>
      <div className="mt-5 rounded-xl bg-gray-50 p-4"><p className="font-semibold">Essential — always active</p><p className="mt-1 text-sm">Sign-in, cart, checkout and saving your privacy choice.</p></div>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 p-4"><input type="checkbox" className="mt-1 h-5 w-5 accent-[#ce6d77]" checked={optional} disabled={!state.enabled} onChange={event => setOptional(event.target.checked)} /><span><span className="font-semibold">Analytics</span><span className="mt-1 block text-sm">Helps us understand shopping journeys, popular searches and products, referrals and completed purchases. Uses random visitor/session IDs and your account ID when signed in. No advertising tracker is installed.</span></span></label>
      {!state.enabled && <p className="mt-3 text-sm">Analytics is currently unavailable or disabled. No optional activity is being collected.</p>}
      <p className="mt-4 text-xs leading-relaxed text-gray-600">Turning analytics off clears its browser identifiers and queued events. We also request deletion of stored events for the current browser ID; this request needs a connection. Order and payment records are kept separately to run the shop.</p>
      <div className="mt-5 flex flex-wrap gap-2"><button className={`${button} bg-[#ce6d77] text-white`} onClick={() => analytics.setConsent(optional)}>Save preferences</button><button className={button} onClick={() => analytics.setConsent(false)}>Reject optional</button></div>
    </dialog>
  </>;
}
