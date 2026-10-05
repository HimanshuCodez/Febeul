import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ArrowDown, ArrowUp, ExternalLink, Plus, RefreshCcw, Save, Share2, Trash2 } from 'lucide-react';

const platforms = [
  ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['threads', 'Threads'],
  ['youtube', 'YouTube'], ['twitter', 'X (Twitter)'], ['whatsapp', 'WhatsApp'],
  ['linkedin', 'LinkedIn'], ['pinterest', 'Pinterest'], ['telegram', 'Telegram'],
  ['tiktok', 'TikTok'], ['snapchat', 'Snapchat'], ['custom', 'Other / Website'],
];
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const inputClass = 'mt-1 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100';

const isWebUrl = (value) => {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); }
  catch { return false; }
};

// eslint-disable-next-line react/prop-types
const SocialsSettings = ({ token }) => {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [dirty, setDirty] = useState(false);

  const loadSettings = useCallback(async (signal) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const { data } = await axios.get(`${backendUrl}/api/cms/socialSettings`, { signal });
      if (!data.success || !Array.isArray(data.content?.links)) {
        throw new Error('Could not load social links. Please try again.');
      }
      setLinks(data.content.links);
      setDirty(false);
    } catch (error) {
      if (!axios.isCancel(error)) {
        setLoadError(error.response?.data?.message || error.message || 'Could not load social links.');
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSettings(controller.signal);
    return () => controller.abort();
  }, [loadSettings]);

  const updateLink = (id, changes) => {
    setLinks(current => current.map(link => link.id === id ? { ...link, ...changes } : link));
    setDirty(true);
  };

  const moveLink = (index, direction) => {
    setLinks(current => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
    setDirty(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const normalized = links.map(link => ({ ...link, label: link.label.trim(), url: link.url.trim() }));
    const invalid = normalized.find(link => !link.label || !isWebUrl(link.url));
    if (invalid) {
      toast.error(`Enter a display name and a valid http:// or https:// URL for ${invalid.label || 'each social link'}.`);
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/cms`, {
        name: 'socialSettings', content: { links: normalized },
      }, { headers: { token } });
      if (!data.success) throw new Error(data.message || 'Could not save social links.');
      setLinks(data.content.links);
      setDirty(false);
      toast.success('Social links saved. Refresh the storefront to see your changes.');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not save social links.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <p role="status" className="py-20 text-center text-gray-500">Loading social links...</p>;
  if (loadError) return (
    <div className="rounded-2xl border border-red-100 bg-white p-6">
      <p role="alert" className="text-sm text-red-600">{loadError}</p>
      <button type="button" onClick={() => loadSettings()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white">
        <RefreshCcw size={16} /> Retry
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-pink-600"><Share2 size={20} /><span className="text-xs font-bold uppercase tracking-widest">Stay connected</span></div>
          <h1 className="text-2xl font-bold text-gray-900">Social Links</h1>
          <p className="mt-2 max-w-xl text-sm text-gray-500">Manage the social icons in the top announcement bar and footer. Choose a platform, add its profile link, and pick where it appears.</p>
        </div>
        <button type="submit" disabled={isSaving || !dirty} className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40">
          <Save size={17} /> {isSaving ? 'Saving...' : 'Save social links'}
        </button>
      </div>

      <fieldset disabled={isSaving} className="min-w-0 space-y-4">
        {links.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <Share2 className="mx-auto mb-3 text-gray-300" size={32} />
            <p className="font-semibold text-gray-800">No social links</p>
            <p className="mt-1 text-sm text-gray-500">Add your first profile below. Saving an empty list hides all social icons.</p>
          </div>
        )}
        {links.map((link, index) => (
          <section key={link.id} aria-label={`Social link ${index + 1}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800"><span className="mr-2 text-gray-400">{String(index + 1).padStart(2, '0')}</span>{link.label || 'New social link'}</p>
              <div className="flex items-center gap-1">
                <button type="button" aria-label={`Move ${link.label || 'link'} up`} disabled={index === 0} onClick={() => moveLink(index, -1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-25"><ArrowUp size={16} /></button>
                <button type="button" aria-label={`Move ${link.label || 'link'} down`} disabled={index === links.length - 1} onClick={() => moveLink(index, 1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-25"><ArrowDown size={16} /></button>
                <button type="button" aria-label={`Remove ${link.label || 'social link'}`} onClick={() => { setLinks(current => current.filter(item => item.id !== link.id)); setDirty(true); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <label className="min-w-0 text-xs font-semibold text-gray-600">
                Platform
                <select value={link.platform} onChange={event => updateLink(link.id, { platform: event.target.value, label: event.target.value === 'custom' ? '' : platforms.find(([value]) => value === event.target.value)[1] })} className={inputClass}>
                  {platforms.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="min-w-0 text-xs font-semibold text-gray-600">
                Display name
                <input required value={link.label} onChange={event => updateLink(link.id, { label: event.target.value })} placeholder="e.g. Febeul on Instagram" className={inputClass} />
              </label>
              <label className="min-w-0 text-xs font-semibold text-gray-600 lg:col-span-2">
                Profile URL
                <input required type="url" value={link.url} onChange={event => updateLink(link.id, { url: event.target.value })} placeholder="https://www.instagram.com/your-profile" className={inputClass} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs">
              <span className="font-medium text-gray-500">Show in:</span>
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={link.showInTopBar !== false} onChange={event => updateLink(link.id, { showInTopBar: event.target.checked })} className="accent-pink-600" />Top bar</label>
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={link.showInFooter !== false} onChange={event => updateLink(link.id, { showInFooter: event.target.checked })} className="accent-pink-600" />Footer</label>
              {isWebUrl(link.url) && <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-pink-600 hover:underline"><ExternalLink size={13} />Test link</a>}
            </div>
          </section>
        ))}
        <button type="button" onClick={() => { setLinks(current => [...current, { id: crypto.randomUUID(), platform: 'instagram', label: 'Instagram', url: '', showInTopBar: true, showInFooter: true }]); setDirty(true); }} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:border-pink-300 hover:text-pink-600">
          <Plus size={17} /> Add social link
        </button>
      </fieldset>
      <p role="status" className="mt-5 text-xs text-gray-500">{dirty ? 'You have unsaved changes.' : 'All changes are saved.'} The same order is used in the top bar and footer.</p>
    </form>
  );
};

export default SocialsSettings;
