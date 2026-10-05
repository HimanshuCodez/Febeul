import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ArrowDown, ArrowUp, Crown, ImagePlus, Plus, RefreshCcw, Save, Trash2, Upload } from 'lucide-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const storefrontUrl = import.meta.env.VITE_FRONTEND_URL || (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:5173` : 'https://febeul.com');
const inputClass = 'mt-1 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100';
const groups = {
  hero: { title: 'Page heading', fields: [['title', 'Page title', 'required'], ['subtitle', 'Subtitle']] },
  promo: { title: 'Promo banner', fields: [['title', 'Banner title'], ['description', 'Banner description', 'multiline']] },
  offer: { title: 'Membership signup card', fields: [
    ['label', 'Offer label'], ['period', 'Price period label'],
    ['joinLabel', 'Join button text', 'required'], ['loginLabel', 'Login button text', 'required'],
    ['processingLabel', 'Processing button text'], ['securityLabel', 'Security badge text'],
    ['paymentLabel', 'Payment badge text'], ['perksLabel', 'VIP badge text'],
    ['terms', 'Membership note', 'multiline'],
  ] },
  coupon: { title: 'Coupon labels', fields: [
    ['placeholder', 'Coupon input placeholder'], ['applyLabel', 'Apply button text'],
    ['loadingLabel', 'Applying button text'], ['removeLabel', 'Remove button text'],
    ['label', 'Coupon summary label'], ['appliedLabel', 'Applied status text'],
  ] },
  member: { title: 'Active member page', fields: [
    ['eyebrow', 'Member subtitle'], ['title', 'Member page title', 'required'],
    ['emptyTitle', 'Empty collection title'], ['emptyDescription', 'Empty collection description', 'multiline'],
  ] },
};

const isImageSource = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  const source = value.trim();
  if (source.startsWith('/') && !source.startsWith('//') && !source.includes('\\')) return true;
  try { return ['https:', 'http:'].includes(new URL(source).protocol); }
  catch { return false; }
};
const previewSource = value => isImageSource(value) ? new URL(value.trim(), storefrontUrl).href : '';

// eslint-disable-next-line react/prop-types
const LuxePage = ({ token }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [dirty, setDirty] = useState(false);

  const loadContent = useCallback(async (signal) => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await axios.get(`${backendUrl}/api/cms/luxePage`, { signal });
      if (!data.success || !Array.isArray(data.content?.features)) throw new Error('Could not load Luxe page content.');
      setContent(data.content);
      setDirty(false);
    } catch (error) {
      if (!axios.isCancel(error)) setLoadError(error.response?.data?.message || error.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadContent(controller.signal);
    return () => controller.abort();
  }, [loadContent]);

  const updateText = (section, key, value) => {
    setContent(current => ({ ...current, [section]: { ...current[section], [key]: value } }));
    setDirty(true);
  };
  const updateFeature = (id, changes) => {
    setContent(current => ({ ...current, features: current.features.map(feature => feature.id === id ? { ...feature, ...changes } : feature) }));
    setDirty(true);
  };
  const moveFeature = (index, direction) => {
    setContent(current => {
      const features = [...current.features];
      [features[index], features[index + direction]] = [features[index + direction], features[index]];
      return { ...current, features };
    });
    setDirty(true);
  };

  const uploadImage = async (id, event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPG, PNG or WebP image.');
      input.value = '';
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    setUploadingId(id);
    try {
      const { data } = await axios.post(`${backendUrl}/api/cms/upload`, formData, { headers: { token } });
      if (!data.success || !isImageSource(data.imageUrl)) throw new Error(data.message || 'Image upload failed.');
      updateFeature(id, { img: data.imageUrl });
      toast.success('Image uploaded. Save the page to publish this change.');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Image upload failed.');
    } finally {
      setUploadingId(null);
      input.value = '';
    }
  };

  const saveContent = async (event) => {
    event.preventDefault();
    if (content.features.some(feature => !feature.title.trim() || !isImageSource(feature.img))) {
      toast.error('Each benefit needs a title and a valid image URL or storefront image path.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/cms`, { name: 'luxePage', content }, { headers: { token } });
      if (!data.success) throw new Error(data.message || 'Could not save the Luxe page.');
      setContent(data.content);
      setDirty(false);
      toast.success('Luxe page saved. Refresh the storefront to see your changes.');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not save the Luxe page.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p role="status" className="py-20 text-center text-gray-500">Loading Luxe page...</p>;
  if (loadError) return (
    <div className="rounded-2xl border border-red-100 bg-white p-6">
      <p role="alert" className="text-sm text-red-600">{loadError}</p>
      <button type="button" onClick={() => loadContent()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white"><RefreshCcw size={16} /> Retry</button>
    </div>
  );

  const textSection = section => (
    <details key={section} open={section === 'hero' || section === 'promo'} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer text-base font-semibold text-gray-900">{groups[section].title}</summary>
      {section === 'promo' && <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={content.promo?.enabled !== false} onChange={event => updateText('promo', 'enabled', event.target.checked)} className="accent-pink-600" />Show promo banner</label>}
      {section === 'offer' && <p className="mt-3 text-xs text-gray-500">Membership prices are managed in Settings → Config.</p>}
      {section === 'member' && <p className="mt-3 text-xs text-gray-500">These messages appear for customers with an active Luxe membership.</p>}
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
        {groups[section].fields.map(([key, label, type]) => (
          <label key={key} className={`min-w-0 text-xs font-semibold text-gray-600 ${type === 'multiline' ? 'lg:col-span-2' : ''}`}>
            {label}
            {type === 'multiline'
              ? <textarea aria-label={label} rows={3} value={content[section]?.[key] ?? ''} onChange={event => updateText(section, key, event.target.value)} className={inputClass} />
              : <input aria-label={label} required={type === 'required'} value={content[section]?.[key] ?? ''} onChange={event => updateText(section, key, event.target.value)} className={inputClass} />}
          </label>
        ))}
      </div>
    </details>
  );

  return (
    <form onSubmit={saveContent} className="mx-auto max-w-5xl pb-8">
      <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center justify-between gap-4 bg-gray-50/95 py-4 backdrop-blur">
        <div>
          <div className="mb-2 flex items-center gap-2 text-pink-600"><Crown size={20} /><span className="text-xs font-bold uppercase tracking-widest">Luxe membership</span></div>
          <h1 className="text-2xl font-bold text-gray-900">Luxe Page</h1>
          <p className="mt-1 text-sm text-gray-500">Edit the images and text customers see on the Luxe page.</p>
        </div>
        <button type="submit" disabled={saving || !!uploadingId || !dirty} className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"><Save size={17} />{saving ? 'Saving...' : 'Save Luxe page'}</button>
      </div>

      <fieldset disabled={saving || !!uploadingId} className="min-w-0 space-y-5">
        {textSection('hero')}
        {textSection('promo')}
        <details open className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-base font-semibold text-gray-900">Benefit images & text</summary>
          <p className="mt-2 text-xs text-gray-500">Upload a JPG, PNG or WebP, or paste an image URL. Benefits appear in this order.</p>
          <div className="mt-5 space-y-4">
            {content.features.map((feature, index) => (
              <section key={feature.id} aria-label={`Benefit ${index + 1}`} className="min-w-0 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">Benefit {index + 1}</p>
                  <div className="flex gap-1">
                    <button type="button" aria-label={`Move benefit ${index + 1} up`} disabled={index === 0} onClick={() => moveFeature(index, -1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-25"><ArrowUp size={16} /></button>
                    <button type="button" aria-label={`Move benefit ${index + 1} down`} disabled={index === content.features.length - 1} onClick={() => moveFeature(index, 1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-25"><ArrowDown size={16} /></button>
                    <button type="button" aria-label={`Remove benefit ${index + 1}`} onClick={() => { setContent(current => ({ ...current, features: current.features.filter(item => item.id !== feature.id) })); setDirty(true); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="grid min-w-0 gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                  <div>
                    <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                      <ImagePlus size={28} className="text-gray-200" aria-hidden="true" />
                      {previewSource(feature.img) && <img key={feature.img} src={previewSource(feature.img)} alt={`${feature.title || 'Benefit'} preview`} onError={event => { event.currentTarget.style.visibility = 'hidden'; }} className="absolute inset-0 h-full w-full bg-white object-contain p-3" />}
                    </div>
                    <label className="relative mt-2 flex min-h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium hover:border-pink-300">
                      <Upload size={14} />{uploadingId === feature.id ? 'Uploading...' : 'Upload image'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Upload image for benefit ${index + 1}`} onChange={event => uploadImage(feature.id, event)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    </label>
                  </div>
                  <div className="min-w-0 space-y-3">
                    <label className="block text-xs font-semibold text-gray-600">Benefit title<input required value={feature.title} onChange={event => updateFeature(feature.id, { title: event.target.value })} className={inputClass} /></label>
                    <label className="block text-xs font-semibold text-gray-600">Description<textarea aria-label="Description" rows={2} value={feature.desc} onChange={event => updateFeature(feature.id, { desc: event.target.value })} className={inputClass} /></label>
                    <label className="block text-xs font-semibold text-gray-600">Image URL or path<input required value={feature.img} onChange={event => updateFeature(feature.id, { img: event.target.value })} placeholder="https://... or /bus.png" className={inputClass} /></label>
                  </div>
                </div>
              </section>
            ))}
            {!content.features.length && <p className="py-4 text-sm text-gray-500">No benefits. Save to hide the benefit grid, or add a benefit below.</p>}
            <button type="button" onClick={() => { setContent(current => ({ ...current, features: [...current.features, { id: crypto.randomUUID(), img: '', title: '', desc: '' }] })); setDirty(true); }} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold hover:border-pink-300 hover:text-pink-600"><Plus size={16} />Add benefit</button>
          </div>
        </details>
        {textSection('offer')}
        {textSection('coupon')}
        {textSection('member')}
      </fieldset>
      <p role="status" className="mt-5 text-xs text-gray-500">{uploadingId ? 'Uploading image...' : dirty ? 'You have unsaved changes.' : 'All changes are saved.'}</p>
    </form>
  );
};

export default LuxePage;
