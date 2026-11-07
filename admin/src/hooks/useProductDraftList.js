import { useCallback, useEffect, useState } from 'react';
import { createProductDraftStorage, listNewProductDrafts, PRODUCT_DRAFTS_CHANGED } from '../utils/productDrafts';

export default function useProductDraftList({ owner, namespace }) {
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState('');
  const refresh = useCallback(() => {
    try {
      setDrafts(listNewProductDrafts({ owner, namespace }));
      setError('');
    } catch {
      setDrafts([]);
      setError('Saved drafts could not be loaded. Browser storage may be unavailable.');
    }
  }, [owner, namespace]);

  useEffect(() => {
    refresh();
    window.addEventListener(PRODUCT_DRAFTS_CHANGED, refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(PRODUCT_DRAFTS_CHANGED, refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  const discard = async draft => {
    await createProductDraftStorage(draft.key).clear();
    refresh();
  };

  return { drafts, error, discard };
}
