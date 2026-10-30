/* eslint-disable react/prop-types -- Theme state is owned by App. */
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark';
  return <button type="button" onClick={onToggle} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={`Switch to ${dark ? 'light' : 'dark'} mode`} aria-pressed={dark} className="admin-theme-toggle">
    {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    <span className="hidden sm:inline">{dark ? 'Light mode' : 'Dark mode'}</span>
  </button>;
}
