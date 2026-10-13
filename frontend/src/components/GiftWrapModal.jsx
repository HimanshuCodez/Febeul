import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Gift, Loader2, X } from 'lucide-react';
import useAuthStore from '../store/authStore';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const GiftWrapModal = ({ isOpen, onClose, onSelect }) => {
  const dialogRef = useRef(null);
  const [selectedWrap, setSelectedWrap] = useState(null);
  const [giftMessage, setGiftMessage] = useState('');
  const [giftWraps, setGiftWraps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { user } = useAuthStore();
  const isComplimentary = user?.isLuxeMember && user?.giftWrapsLeft > 0;

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setSelectedWrap(null);
    const fetchWraps = async () => {
      try {
        const response = await axios.get(backendUrl + '/api/giftwrap/list');
        if (!response.data.success) throw new Error('Could not load gift wraps');
        if (!cancelled) setGiftWraps(response.data.data || []);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchWraps();
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (!selectedWrap) return;
    onSelect({ ...selectedWrap, price: isComplimentary ? 0 : selectedWrap.price, message: giftMessage });
    onClose();
  };

  return (
    <dialog ref={dialogRef} aria-labelledby="gift-wrap-title" onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-950/40 backdrop:backdrop-blur-sm [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-rose-500 [&_button:focus-visible]:ring-offset-2">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-stone-100 bg-white px-5 py-5 sm:px-6">
        <div>
          <h2 id="gift-wrap-title" className="flex items-center gap-2 font-sans text-base font-semibold"><Gift size={19} strokeWidth={1.5} className="text-rose-700" aria-hidden="true" />Choose Gift Wrap</h2>
          <p className="mt-2 text-xs leading-5 text-stone-500">{isComplimentary ? 'Included with your Luxe membership. ' + user.giftWrapsLeft + ' free wraps remaining.' : 'A thoughtful finishing touch for your order.'}</p>
        </div>
        <button type="button" aria-label="Close gift wrap" onClick={onClose} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-50"><X size={19} aria-hidden="true" /></button>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        {loading ? <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-stone-500"><Loader2 size={17} aria-hidden="true" className="motion-safe:animate-spin" />Loading gift wraps…</p> : loadError ? <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Gift wraps couldn’t be loaded. Close this window and try again.</p> : giftWraps.length === 0 ? <p className="py-6 text-center text-sm text-stone-500">No gift wraps are available right now.</p> : (
          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <legend className="sr-only">Choose your gift wrap</legend>
            {giftWraps.map(wrap => (
              <label key={wrap._id} className={'cursor-pointer overflow-hidden rounded-xl border transition-colors ' + (selectedWrap?._id === wrap._id ? 'border-rose-400 bg-rose-50/50' : 'border-stone-200 hover:border-rose-200')}>
                {wrap.image && <img src={wrap.image} alt="" className="aspect-[4/3] w-full object-cover" />}
                <span className="flex items-start gap-2 p-3"><input type="radio" name="giftWrap" checked={selectedWrap?._id === wrap._id} onChange={() => setSelectedWrap(wrap)} className="mt-0.5 h-4 w-4 shrink-0 accent-rose-700" /><span className="min-w-0"><span className="block break-words text-xs font-semibold leading-5">{wrap.name}</span><span className="mt-1 block text-xs text-stone-600">{isComplimentary ? 'Free' : '₹' + Number(wrap.price).toFixed(2)}</span></span></span>
              </label>
            ))}
          </fieldset>
        )}
        <div>
          <label htmlFor="gift-message" className="mb-2 block text-xs font-medium text-stone-700">Gift message <span className="font-normal text-stone-400">(optional)</span></label>
          <textarea id="gift-message" rows={3} placeholder="A little note for someone special…" value={giftMessage} onChange={event => setGiftMessage(event.target.value)} maxLength={200} className="w-full resize-y rounded-lg border border-stone-200 px-3 py-3 text-base outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 sm:text-sm" />
          <p className="mt-1 text-right text-xs text-stone-500">{giftMessage.length}/200</p>
        </div>
      </div>
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-stone-100 bg-white px-5 py-4 sm:px-6">
        <button type="button" onClick={onClose} className="min-h-12 rounded-lg border border-stone-200 px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50">No, thanks</button>
        <button type="button" onClick={handleSelect} disabled={!selectedWrap || loading || loadError} className="min-h-12 rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40">Select Wrap</button>
      </div>
    </dialog>
  );
};

export default GiftWrapModal;
