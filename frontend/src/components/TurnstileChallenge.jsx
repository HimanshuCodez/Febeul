import { useEffect, useRef, useState } from 'react';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise;

function loadTurnstile() {
  if (window.turnstile?.render) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    const timeout = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      scriptPromise = null;
      reject(new Error('Security verification could not load.'));
    };
    script.onerror = fail;
    script.onload = () => {
      if (!window.turnstile?.render) return fail();
      window.clearTimeout(timeout);
      resolve(window.turnstile);
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function TurnstileChallenge({ siteKey, onToken }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let widgetId;
    let api;
    let observer;
    onToken('');
    setStatus('loading');
    loadTurnstile().then(turnstile => {
      if (cancelled || !containerRef.current) return;
      api = turnstile;
      const compact = containerRef.current.clientWidth < 300;
      widgetId = api.render(containerRef.current, {
        sitekey: siteKey,
        action: 'auth',
        theme: 'light',
        size: compact ? 'compact' : 'flexible',
        'response-field': false,
        callback: token => {
          if (cancelled) return;
          onToken(token);
          setStatus('verified');
        },
        'expired-callback': () => {
          if (cancelled) return;
          onToken('');
          setStatus('expired');
        },
        'timeout-callback': () => {
          if (cancelled) return;
          onToken('');
          setStatus('expired');
        },
        'error-callback': () => {
          if (cancelled) return;
          onToken('');
          setStatus('error');
        },
      });
      observer = new ResizeObserver(entries => {
        if (!cancelled && (entries[0].contentRect.width < 300) !== compact) {
          onToken('');
          setRetry(value => value + 1);
        }
      });
      observer.observe(containerRef.current);
      setStatus(current => current === 'loading' ? 'ready' : current);
    }).catch(() => {
      if (!cancelled) { onToken(''); setStatus('error'); }
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      if (widgetId !== undefined) api?.remove(widgetId);
    };
  }, [siteKey, retry, onToken]);

  return (
    <div className="space-y-2" role="group" aria-label="Security verification">
      <div ref={containerRef} className="flex w-full justify-center" />
      {status === 'loading' && <p role="status" className="text-center text-xs text-gray-500">Loading security verification…</p>}
      {['error', 'expired'].includes(status) && (
        <div role="alert" className="rounded-lg border border-pink-100 bg-white/70 p-3 text-center text-xs text-gray-600">
          <p>{status === 'expired' ? 'Verification expired. Please verify again.' : 'Security verification could not load. Check your connection and retry.'}</p>
          <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 min-h-10 font-semibold text-[#d85d60] underline">Retry verification</button>
        </div>
      )}
    </div>
  );
}
