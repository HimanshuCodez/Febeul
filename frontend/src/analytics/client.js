import { CLIENT_EVENTS, UUID, PRODUCT_ID, safePath, safeSearch, attributionFromUrl } from '../../../shared/analyticsPrivacy.js';

export const CONSENT_KEY = 'febeul.cookie-consent';
export const VISITOR_KEY = 'febeul.analytics-visitor';
export const SESSION_KEY = 'febeul.analytics-session';

// Injectable browser services let tests run without React or live shopping APIs.
export function createAnalyticsClient({ local, session, fetcher, crypto, location, referrer = () => '', token = () => '', now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, baseUrl = '', disabled = false }) {
  const read = (storage, key) => { try { return JSON.parse(storage.getItem(key)); } catch { return null; } };
  const write = (storage, key, value) => { try { storage.setItem(key, JSON.stringify(value)); } catch { /* memory only */ } };
  const remove = (storage, key) => { try { storage.removeItem(key); } catch { /* unavailable */ } };
  let consent = read(local, CONSENT_KEY);
  let config = { enabled: false, consentVersion: '2026-10-v1', retentionDays: 90, sessionMinutes: 30 };
  let state = { ready: false, enabled: false, consent: null, managing: false };
  let visitor, sessionData, queue = [], timer, activeRequest, generation = 0, initializing;
  const listeners = new Set(), seen = new Map();
  const emit = (patch) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
  const validConsent = () => consent?.version === config.consentVersion && typeof consent.analytics === 'boolean' && Number.isFinite(Date.parse(consent.timestamp));
  const allowed = () => config.enabled && validConsent() && consent.analytics === true;
  const clear = () => {
    generation += 1; queue = []; clearTimer(timer); timer = undefined;
    for (const key of seen.keys()) seen.set(key, null);
    activeRequest?.abort(); activeRequest = undefined;
    visitor = undefined; sessionData = undefined;
    remove(local, VISITOR_KEY); remove(session, SESSION_KEY);
  };
  if (!consent?.analytics || disabled) clear();

  async function request(path, body, signal, headers = {}) {
    return fetcher(`${baseUrl}/api/analytics${path}`, {
      method: body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal,
      headers: body ? { 'Content-Type': 'application/json', ...headers } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  function initialize() {
    if (initializing) return initializing;
    initializing = (async () => {
      const controller = new AbortController();
      const timeout = setTimer(() => controller.abort(), 3000);
      try {
        if (!disabled) {
          const response = await request('/config', null, controller.signal);
          if (!response.ok) throw new Error('Unavailable');
          const data = await response.json();
          if (typeof data.consentVersion !== 'string' || data.consentVersion.length > 80) throw new Error('Invalid config');
          config = { ...config, enabled: data.enabled === true, consentVersion: data.consentVersion, retentionDays: Math.max(1, Math.min(730, Number(data.retentionDays) || 90)) };
        }
      } catch { config.enabled = false; }
      finally {
        clearTimer(timeout);
        if (!allowed()) clear();
        emit({ ready: true, enabled: config.enabled, consent: validConsent() ? consent : null });
      }
    })();
    return initializing;
  }
  function context() {
    try {
      if (!allowed()) return null;
      visitor ||= read(local, VISITOR_KEY);
      if (!UUID.test(visitor?.id) || visitor.expiresAt <= now()) {
        visitor = { id: crypto.randomUUID(), expiresAt: now() + config.retentionDays * 86400000 };
        write(local, VISITOR_KEY, visitor);
        sessionData = undefined; remove(session, SESSION_KEY);
      }
      sessionData ||= read(session, SESSION_KEY);
      if (!UUID.test(sessionData?.id) || now() - sessionData.lastAt >= config.sessionMinutes * 60000 || sessionData.visitorId !== visitor.id) {
        // Attribution starts after consent; no pre-consent landing URL is retained.
        sessionData = { id: crypto.randomUUID(), visitorId: visitor.id, lastAt: now(), attribution: attributionFromUrl(location().href, referrer()) };
      }
      sessionData.lastAt = now(); write(session, SESSION_KEY, sessionData);
      return { visitorId: visitor.id, sessionId: sessionData.id, consentVersion: config.consentVersion, path: safePath(location().pathname), ...sessionData.attribution };
    } catch { return null; }
  }
  function prepare(name, data = {}, onceKey) {
    try {
      if (onceKey) {
        if (seen.has(onceKey)) return seen.get(onceKey);
        seen.set(onceKey, null);
        if (seen.size > 500) seen.delete(seen.keys().next().value);
      }
      if (!CLIENT_EVENTS.includes(name) || !allowed()) return null;
      const event = { eventId: crypto.randomUUID(), name, path: safePath(location().pathname) };
      if (['product_view', 'add_to_cart', 'remove_from_cart'].includes(name)) {
        if (!PRODUCT_ID.test(data.productId)) return null;
        event.productId = data.productId;
      }
      if (['add_to_cart', 'remove_from_cart'].includes(name)) {
        if (!Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 999) return null;
        event.quantity = data.quantity;
      }
      if (['add_to_cart', 'remove_from_cart', 'checkout_started'].includes(name) && Number.isFinite(data.amount) && data.amount >= 0 && data.amount <= 100000000 && /^[A-Z]{3}$/.test(data.currency)) {
        event.amount = Math.round(data.amount * 100) / 100; event.currency = data.currency;
      }
      if (name === 'search') {
        event.searchTerm = safeSearch(data.searchTerm);
        if (!event.searchTerm) return null;
      }
      const ctx = context();
      if (!ctx) return null;
      const prepared = { event, context: ctx, generation, authToken: token(), attempts: 0, onceKey };
      if (onceKey) seen.set(onceKey, prepared);
      return prepared;
    } catch { return null; }
  }
  function schedule(delay = 5000) {
    if (timer || activeRequest || !queue.length || !allowed()) return;
    timer = setTimer(() => { timer = undefined; void flush(); }, delay);
  }
  function commit(prepared) {
    try {
      if (!prepared || prepared.generation !== generation || !allowed() || prepared.committed) return;
      prepared.committed = true;
      if (prepared.onceKey) seen.set(prepared.onceKey, null);
      if (queue.length >= 100) queue.shift();
      queue.push(prepared); schedule();
    } catch { /* best effort */ }
  }
  function track(name, data, key) { commit(prepare(name, data, key)); }
  async function flush() {
    if (!allowed() || activeRequest || !queue.length) return;
    clearTimer(timer); timer = undefined;
    const first = queue[0], batch = [];
    while (queue.length && batch.length < 20 && queue[0].context.sessionId === first.context.sessionId && queue[0].authToken === first.authToken) batch.push(queue.shift());
    const controller = new AbortController(); activeRequest = controller;
    const timeout = setTimer(() => controller.abort(), 3000);
    let retry = false;
    try {
      const response = await request('/events', { context: first.context, events: batch.map(item => item.event) }, controller.signal, first.authToken ? { token: first.authToken } : {});
      if (response.status === 204) { config.enabled = false; clear(); emit({ enabled: false }); }
      else retry = response.status === 429 || response.status >= 500;
    } catch { retry = true; }
    finally {
      clearTimer(timeout);
      if (activeRequest === controller) activeRequest = undefined;
      if (retry && allowed() && first.generation === generation) {
        const retryable = batch.filter(item => ++item.attempts < 3);
        queue = [...retryable, ...queue].slice(0, 100);
      }
      schedule(retry ? Math.min(30000, 5000 * 2 ** batch[0].attempts) : 5000);
    }
  }
  function revoke(oldVisitor) {
    if (!UUID.test(oldVisitor)) return;
    // Control request only; never retain or recreate this identifier.
    const controller = new AbortController();
    const timeout = setTimer(() => controller.abort(), 3000);
    request('/withdraw', { visitorId: oldVisitor }, controller.signal).catch(() => {}).finally(() => clearTimer(timeout));
  }
  function setConsent(analytics) {
    const oldVisitor = visitor?.id || read(local, VISITOR_KEY)?.id;
    consent = { version: config.consentVersion, timestamp: new Date(now()).toISOString(), analytics: analytics === true && config.enabled, advertising: false };
    write(local, CONSENT_KEY, consent);
    if (!consent.analytics) { clear(); revoke(oldVisitor); }
    emit({ consent, managing: false });
  }
  function syncConsent() {
    consent = read(local, CONSENT_KEY);
    if (!allowed()) clear();
    emit({ consent: validConsent() ? consent : null });
  }
  return { initialize, prepare, commit, track, flush, context, setConsent, syncConsent, openSettings: () => emit({ managing: true }), closeSettings: () => emit({ managing: false }), getSnapshot: () => state, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); } };
}
