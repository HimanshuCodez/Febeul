import axios from 'axios';
import { createAnalyticsClient, CONSENT_KEY } from './client.js';
import { installShoppingAnalytics } from './shoppingBridge.js';

const storage = name => ({
  getItem: key => { try { return window[name].getItem(key); } catch { return null; } },
  setItem: (key, value) => { try { window[name].setItem(key, value); } catch { /* unavailable */ } },
  removeItem: key => { try { window[name].removeItem(key); } catch { /* unavailable */ } },
});
const local = storage('localStorage');
export const analytics = createAnalyticsClient({
  local, session: storage('sessionStorage'), fetcher: (...args) => fetch(...args), crypto: window.crypto,
  location: () => window.location, referrer: () => document.referrer,
  token: () => local.getItem('token') || '', baseUrl: import.meta.env.VITE_BACKEND_URL || '',
  disabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'false',
});
installShoppingAnalytics(axios, analytics, () => ({ pathname: window.location.pathname, key: window.history.state?.key || 'initial' }), import.meta.env.VITE_BACKEND_URL || window.location.origin);
window.addEventListener('storage', event => { if (event.key === CONSENT_KEY || event.key === null) analytics.syncConsent(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void analytics.flush(); });
