import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, X, ArrowUpRight, LoaderCircle, Users, ShoppingBag, Ticket, Package, Settings } from 'lucide-react';
import { findSearchPages } from '../search/pages';

const icons = { Users, Orders: ShoppingBag, Coupons: Ticket, Products: Package, 'Pages & settings': Settings };

// Kept independent of dashboard loading, chart filters and exports.
// eslint-disable-next-line react/prop-types
export default function UniversalSearch({ token, backendUrl, role, permissions }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [response, setResponse] = useState({ query: '', groups: [], error: '' });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const listId = useId();
  const navigate = useNavigate();
  const term = query.trim();
  const pages = useMemo(() => findSearchPages(term, role, permissions), [term, role, permissions]);
  const current = response.query === term ? response : { groups: [], error: '' };
  const groups = [...current.groups.filter(group => group.items.length), ...(pages.length ? [{ type: 'Pages & settings', items: pages }] : [])];
  const items = groups.flatMap(group => group.items);

  useEffect(() => {
    if (!open || term.length < 2 || !token) { setLoading(false); return; }
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/admin/search`, {
          params: { q: term }, headers: { token }, signal: controller.signal, timeout: 4000,
        });
        if (!data.success) throw new Error('Search unavailable');
        if (!cancelled) {
          setActive(-1);
          setResponse({ query: term, groups: data.groups || [], error: data.unavailable?.length ? `${data.unavailable.join(', ')} search is temporarily unavailable. Other matches are shown below.` : '' });
        }
      } catch (error) {
        if (!cancelled) setResponse({ query: term, groups: [], error: error.response?.status === 429 ? 'Please wait a moment, then try again.' : 'Record search is unavailable. You can still open matching pages and settings.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [term, open, token, backendUrl]);

  useEffect(() => {
    const handleKey = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); inputRef.current?.focus(); setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const handleOutside = event => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, []);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, listId]);

  const select = item => { setOpen(false); navigate(item.href); };
  let index = -1;
  return (
    <div ref={containerRef} className="relative z-30 mb-8 min-w-0" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <label htmlFor={`${listId}-input`} className="mb-2 block text-sm font-semibold text-gray-700">Search the admin</label>
      <div className="flex items-center gap-3 rounded-2xl border border-pink-200 bg-white px-3 py-2 shadow-sm focus-within:border-[#d66a6c] focus-within:ring-4 focus-within:ring-pink-100 sm:px-4">
        <Search size={20} className="shrink-0 text-[#c44a4d]" aria-hidden="true" />
        <input ref={inputRef} id={`${listId}-input`} role="combobox" aria-autocomplete="list"
          aria-expanded={open} aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active >= 0 && items[active] ? `${listId}-${active}` : undefined}
          autoComplete="off" spellCheck={false} maxLength={80} value={query}
          placeholder="Users, orders, coupons, products, settings…"
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          onFocus={() => setOpen(true)}
          onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true); }}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActive(-1); }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault(); setOpen(true);
              if (items.length) setActive(previous => event.key === 'ArrowDown' ? (previous + 1) % items.length : (previous <= 0 ? items.length - 1 : previous - 1));
            }
            if (event.key === 'Enter' && open && items.length) { event.preventDefault(); select(items[active] || items[0]); }
          }} />
        {loading && <LoaderCircle size={18} className="shrink-0 animate-spin text-[#c44a4d]" aria-label="Searching records" />}
        {query ? <button type="button" aria-label="Clear universal search" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" onClick={() => { setQuery(''); setActive(-1); inputRef.current?.focus(); }}><X size={18} /></button>
          : <kbd className="hidden shrink-0 rounded border border-gray-200 px-2 py-1 text-xs text-gray-400 sm:inline">Ctrl K</kbd>}
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-black/10">
          <div className="border-b border-gray-100 px-4 py-3 text-xs text-gray-500" role="status">
            {current.error || (term.length < 2 ? 'Type at least 2 characters to find records, or open a page below.' : loading ? 'Searching records…' : `${items.length} matches · Only pages you can access are shown`)}
          </div>
          <div id={listId} role="listbox" aria-label="Admin search results" className="max-h-[min(55vh,440px)] overflow-y-auto overscroll-contain p-2">
            {groups.map(group => (
              <div key={group.type} role="group" aria-label={group.type}>
                <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">{group.type}{group.hasMore ? ' · Top 6 matches — narrow your search for more' : ''}</p>
                {group.items.map(item => {
                  const itemIndex = ++index;
                  const Icon = icons[group.type] || Settings;
                  return <button key={item.id} type="button" id={`${listId}-${itemIndex}`} role="option" aria-selected={active === itemIndex}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${active === itemIndex ? 'bg-pink-50' : 'hover:bg-gray-50'}`}
                    onMouseDown={event => event.preventDefault()} onClick={() => select(item)}>
                    <span className="rounded-lg bg-pink-50 p-2 text-[#b33a3d]"><Icon size={17} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-800">{item.title}</span><span className="block truncate text-xs text-gray-500">{item.subtitle}</span></span>
                    <ArrowUpRight size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
                  </button>;
                })}
              </div>
            ))}
            {!items.length && !loading && <p className="px-4 py-8 text-center text-sm text-gray-500">No matches. Try a name, coupon code, order reference, SKU or setting.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
