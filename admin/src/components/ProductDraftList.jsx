/* eslint-disable react/prop-types -- Draft summaries belong to the signed-in admin. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePenLine, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { newProductDraftUrl } from '../utils/productDrafts';

export default function ProductDraftList({ drafts, error, onDiscard, canAdd, searching }) {
  const [removing, setRemoving] = useState(null);
  const discard = async draft => {
    if (!window.confirm(`Discard "${draft.values.name?.trim() || 'Untitled product'}" and its saved images?`)) return;
    setRemoving(draft.key);
    try {
      await onDiscard(draft);
      toast.success('Draft discarded.');
    } catch {
      toast.error('Could not discard the draft. Please try again.');
    } finally {
      setRemoving(null);
    }
  };

  return <section aria-label="Saved product drafts" className="min-w-0 space-y-3">
    <div className="flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 flex-1 text-sm text-gray-500">Drafts are saved in this browser for your account. Continue editing any listing before publishing.</p>
      {canAdd && <Link to={newProductDraftUrl()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16} aria-hidden="true" />New draft</Link>}
    </div>
    {error ? <p role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700">{error}</p>
      : drafts.length === 0 ? <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">{searching ? 'No drafts match your search.' : 'No saved drafts yet. Save a draft from Add Items to continue it here.'}</p>
        : <ul className="space-y-3">
          {drafts.map(draft => {
            const name = draft.values.name?.trim() || 'Untitled product';
            const skus = draft.values.variations.map(variation => variation.sku).filter(Boolean);
            return <li key={draft.key} className="flex min-w-0 flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start gap-2"><FilePenLine size={18} className="mt-1 shrink-0 text-blue-600" aria-hidden="true" /><h3 className="min-w-0 break-words text-base font-semibold text-gray-800">{name}</h3><span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Draft</span></div>
                <p className="break-words text-sm text-gray-500">{draft.values.category || 'No category'} · {draft.values.variations.length} variation{draft.values.variations.length === 1 ? '' : 's'}{skus.length ? ` · ${skus.join(', ')}` : ''}</p>
                <p className="mt-1 text-xs text-gray-500">Last saved {new Date(draft.savedAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {canAdd && <Link to={draft.href} aria-label={`Continue editing ${name}`} className="rounded-lg border border-blue-200 px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50">Continue editing</Link>}
                <button type="button" aria-label={`Discard draft ${name}`} disabled={removing !== null} onClick={() => discard(draft)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={16} aria-hidden="true" />{removing === draft.key ? 'Discarding...' : 'Discard'}</button>
              </div>
            </li>;
          })}
        </ul>}
  </section>;
}
