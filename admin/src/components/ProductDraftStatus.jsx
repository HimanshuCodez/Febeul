/* eslint-disable react/prop-types -- Shared draft state from useProductDraft. */
import { Save } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ProductDraftStatus({ draft, disabled }) {
  const busy = disabled || !draft.ready || draft.status === 'clearing';
  const save = async () => {
    if (await draft.save()) toast.success('Draft saved on this browser.');
  };
  const discard = async () => {
    if (window.confirm('Discard this draft and its unsaved changes?')) await draft.clear();
  };

  return <section aria-label="Product draft" className="mb-5 rounded-2xl border border-[#e4dce9] bg-[#fcfafd] p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p role="status" className="text-sm font-medium text-[#59465f]">
          {draft.loadError ? 'Product could not be loaded' : !draft.ready ? 'Checking for saved progress…'
            : draft.status === 'saving' ? 'Saving draft…' : draft.status === 'clearing' ? 'Removing draft…'
              : draft.status === 'error' ? 'Draft needs attention'
                : draft.savedAt ? `${draft.restored ? 'Draft restored' : 'Draft saved'} · ${new Date(draft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Your progress saves automatically'}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#8b7b93]">Details and images stay in this browser for your account. Return here to continue after closing the site or signing in again. Drafts are not published.</p>
        {!draft.online && <p className="mt-2 text-xs font-medium text-amber-800">You are offline. You can keep editing and saving a draft; reconnect to publish.</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {(draft.savedAt || draft.status === 'error') && <button type="button" disabled={busy} onClick={discard} className="rounded-xl px-3 py-2.5 text-xs font-medium text-[#8b607c] hover:bg-[#f5e9f0] disabled:opacity-50">Discard draft</button>}
        <button type="button" disabled={busy} onClick={save} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#cfb8d7] bg-white px-4 py-2.5 text-xs font-medium text-[#725e7f] hover:bg-[#f5e9f0] disabled:opacity-50"><Save size={15} aria-hidden="true" />Save as draft</button>
      </div>
    </div>
    {(draft.error || draft.recoveryWarning || draft.loadError) && <div role="alert" className="mt-3 text-xs leading-relaxed text-red-700">
      {draft.error && <p>{draft.error}</p>}
      {draft.recoveryWarning && <p>{draft.recoveryWarning}</p>}
      {draft.loadError && <p>{draft.loadError} <button type="button" onClick={draft.retry} className="underline">Try again</button></p>}
    </div>}
  </section>;
}
