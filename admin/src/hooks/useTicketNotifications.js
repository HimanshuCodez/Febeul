import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function useTicketNotifications(token, enabled) {
  const [snapshot, setSnapshot] = useState({ token: null, counts: {} });
  const requestVersion = useRef(0);
  const refresh = useCallback(async () => {
    if (!token || !enabled) return;
    const version = ++requestVersion.current;
    try {
      const { data } = await axios.get(`${backendUrl}/api/ticket/admin-unread`, { headers: { token } });
      if (version === requestVersion.current && data.success) {
        setSnapshot({ token, counts: data.counts || {} });
      }
    } catch (error) {
      console.error('Failed to refresh unread customer replies:', error);
    }
  }, [token, enabled]);

  useEffect(() => {
    if (!token || !enabled) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') refresh();
    };
    refresh();
    const interval = setInterval(refreshWhenVisible, 15000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      requestVersion.current += 1;
      clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [token, enabled, refresh]);

  const counts = enabled && snapshot.token === token ? snapshot.counts : {};
  return { counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0), refresh };
}
