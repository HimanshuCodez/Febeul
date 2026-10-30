import { useEffect, useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'febeul-admin-theme';
const isTheme = value => value === 'light' || value === 'dark';
const systemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
const savedTheme = () => {
  try { const value = localStorage.getItem(STORAGE_KEY); return isTheme(value) ? value : null; }
  catch { return null; }
};

export default function useAdminTheme() {
  const [preference, setPreference] = useState(savedTheme);
  const [system, setSystem] = useState(systemTheme);
  const theme = preference || system;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = event => setSystem(event.matches ? 'dark' : 'light');
    const onStorage = event => {
      if (event.key === STORAGE_KEY || event.key === null) setPreference(savedTheme());
    };
    media.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setPreference(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Theme still works for this visit. */ }
  };

  return { theme, toggleTheme };
}
