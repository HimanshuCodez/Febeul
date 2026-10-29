import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createProductDraftStorage, createProductValues } from '../utils/productDrafts';

export default function useProductDraft({ owner, namespace, productId = 'new', loadProduct }) {
  const key = `febeul:product-draft:v1:${JSON.stringify([namespace, owner?.trim().toLowerCase(), productId])}`;
  const storage = useMemo(() => createProductDraftStorage(key), [key]);
  const [values, setValues] = useState(createProductValues);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('loading');
  const [savedAt, setSavedAt] = useState(null);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState('');
  const [recoveryWarning, setRecoveryWarning] = useState('');
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const current = useRef(values);
  const baseline = useRef(values);
  const revision = useRef(0);
  const mounted = useRef(false);
  const unsaved = useRef(false);
  const editable = useRef(false);

  useEffect(() => {
    mounted.current = true;
    editable.current = false;
    ++revision.current;
    const controller = new AbortController();
    let cancelled = false;
    setReady(false);
    setLoadError('');
    const initialize = async () => {
      let draft;
      try {
        if (owner) draft = await storage.read();
      } catch {
        if (!cancelled) setRecoveryWarning('The previous draft could not be recovered. Browser storage may be unavailable.');
      }
      try {
        const initial = draft?.values || createProductValues(loadProduct ? await loadProduct(productId, controller.signal) : {});
        if (cancelled) return;
        baseline.current = structuredClone(draft?.baseline || initial);
        current.current = initial;
        setValues(initial);
        setSavedAt(draft?.savedAt || null);
        setRestored(Boolean(draft));
        if (draft?.missingImages.length) {
          setRecoveryWarning(`Please re-upload these draft images: ${draft.missingImages.join(', ')}.`);
        }
        setStatus(draft ? 'saved' : 'idle');
        editable.current = true;
        setReady(true);
      } catch (failure) {
        if (!cancelled) setLoadError(failure.response?.data?.message || failure.message || 'Unable to load product.');
      }
    };
    initialize();
    return () => { cancelled = true; mounted.current = false; controller.abort(); };
  }, [storage, owner, productId, loadProduct, attempt]);

  const persist = useCallback(async data => {
    const version = ++revision.current;
    unsaved.current = true;
    setStatus('saving');
    setError('');
    try {
      if (!owner) throw new Error('Sign in again to enable draft recovery.');
      const timestamp = await storage.write(data, baseline.current);
      if (version === revision.current) {
        unsaved.current = false;
        if (mounted.current) { setSavedAt(timestamp); setRestored(false); setStatus('saved'); }
      }
      return true;
    } catch (failure) {
      if (version === revision.current && mounted.current) {
        setStatus('error');
        setError(owner ? 'Draft could not be fully saved. Free up browser storage and try Save as draft again.' : failure.message);
      }
      return false;
    }
  }, [owner, storage]);

  const setField = useCallback((field, value) => {
    if (!editable.current) return;
    const next = { ...current.current, [field]: typeof value === 'function' ? value(current.current[field]) : value };
    if (next[field] === current.current[field]) return;
    current.current = next;
    setValues(next);
    // This executes during the input event, before navigation or logout can unmount the form.
    void persist(next);
  }, [persist]);

  const save = useCallback(() => persist(current.current), [persist]);

  const clear = useCallback(async (published = false) => {
    ++revision.current;
    editable.current = false;
    setStatus('clearing');
    try {
      await storage.clear();
      const next = !loadProduct || published ? createProductValues() : structuredClone(baseline.current);
      current.current = next;
      baseline.current = structuredClone(next);
      unsaved.current = false;
      if (mounted.current) {
        setValues(next); setSavedAt(null); setRestored(false);
        setError(''); setRecoveryWarning(''); setStatus('idle');
      }
      return true;
    } catch {
      if (mounted.current) { setStatus('error'); setError('Could not remove the local draft. Please try again.'); }
      return false;
    } finally {
      editable.current = true;
    }
  }, [storage, loadProduct]);

  useEffect(() => {
    const connectionChanged = () => setOnline(navigator.onLine);
    const beforeUnload = event => {
      if (unsaved.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('online', connectionChanged);
    window.addEventListener('offline', connectionChanged);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('online', connectionChanged);
      window.removeEventListener('offline', connectionChanged);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);

  return {
    values, setField,
    draft: { ready, status, savedAt, restored, error, recoveryWarning, loadError, online, save, clear, retry: () => setAttempt(previous => previous + 1) }
  };
}
