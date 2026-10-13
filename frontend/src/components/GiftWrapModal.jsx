import useAuthStore from '../store/authStore';
import { useEffect, useRef, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import axios from 'axios';
import { FaTimes, FaCheck } from 'react-icons/fa';
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const GiftWrapModal = ({ isOpen, onClose, onSelect }) => {
  const dialogRef = useRef(null);
  const [selectedWrap, setSelectedWrap] = useState(null);
  const [giftMessage, setGiftMessage] = useState('');
  const [giftWraps, setGiftWraps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { user } = useAuthStore();
  const isLuxeMember = user?.isLuxeMember || false;
  const giftWrapsLeft = user?.giftWrapsLeft || 0;

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
    let cancelled = false;
    if (isOpen) {
      const fetchGiftWraps = async () => {
        setLoading(true);
        setLoadError(false);
        setSelectedWrap(null);
        try {
          const response = await axios.get(`${backendUrl}/api/giftwrap/list`);
          if (response.data.success) {
            if (!cancelled) setGiftWraps(response.data.data || []);
          } else {
            if (!cancelled) setLoadError(true);
          }
        } catch (error) {
          console.error("Error fetching gift wraps:", error);
          if (!cancelled) setLoadError(true);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      fetchGiftWraps();
    }
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const getDisplayedPrice = (wrap) => {
    if (isLuxeMember && giftWrapsLeft > 0) {
      return "FREE";
    }
    return `₹${wrap.price}`;
  };

  const getCalculatedPrice = (wrap) => {
    if (isLuxeMember && giftWrapsLeft > 0) {
      return 0;
    }
    return wrap.price;
  };

  const handleSelect = async () => {
    if (selectedWrap) {
      const finalPrice = getCalculatedPrice(selectedWrap);
      onSelect({ ...selectedWrap, price: finalPrice, message: giftMessage });
      onClose();
    }
  };

  return (
    <dialog ref={dialogRef} aria-labelledby="gift-wrap-title" onCancel={event => { event.preventDefault(); onClose(); }} className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/50 open:flex open:items-center open:justify-center">
      <Motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 id="gift-wrap-title" className="text-2xl font-bold text-gray-800">Choose Gift Wrap</h2>
            {isLuxeMember && (
              <p className="text-sm text-pink-500 font-medium">
                {giftWrapsLeft > 0
                  ? `Luxe Member: ${giftWrapsLeft} free wraps remaining`
                  : "Luxe Member: Free wraps exhausted for this month"}
              </p>
            )}
          </div>
          <button aria-label="Close gift wrap" onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes size={24} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
          {loading ? (
            <div className="col-span-full text-center p-8">
              <p>Loading wraps...</p>
            </div>
          ) : loadError ? (
            <p role="alert" className="col-span-full p-4 text-sm text-red-600">Gift wraps couldn’t be loaded. Close this window and try again.</p>
          ) : giftWraps.length === 0 ? (
            <p className="col-span-full p-4 text-sm text-gray-500">No gift wraps are available right now.</p>
          ) : (
            giftWraps.map((wrap) => (
              <div
                key={wrap._id}
                role="radio"
                aria-label={`${wrap.name} ${getDisplayedPrice(wrap)}`}
                aria-checked={selectedWrap?._id === wrap._id}
                tabIndex={0}
                onKeyDown={event => {
                  if (['Enter', ' '].includes(event.key)) { event.preventDefault(); setSelectedWrap(wrap); }
                }}
                onClick={() => setSelectedWrap(wrap)}
                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedWrap?._id === wrap._id ? 'border-pink-500' : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                  <div className="relative">
                    <img src={wrap.image} alt={wrap.name} className="w-full h-40 object-cover" />
                    {selectedWrap?._id === wrap._id && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white">
                          <FaCheck />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-center">
                    <p className="font-semibold text-gray-700">{wrap.name}</p>
                    <p className="text-pink-500 font-bold">{getDisplayedPrice(wrap)}</p>
                  </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4">
          <label htmlFor="gift-message" className="block text-sm font-medium text-gray-700 mb-1">
            Gift Message (Optional)
          </label>
          <textarea
            id="gift-message"
            rows="3"
            className="w-full p-2 border rounded-md focus:ring-pink-500 focus:border-pink-500"
            placeholder="Enter your personalized gift message here..."
            value={giftMessage}
            onChange={(e) => setGiftMessage(e.target.value)}
            maxLength={200}
          ></textarea>
          <p className="text-right text-xs text-gray-500">{giftMessage.length}/200</p>
        </div>
        <div className="mt-6 flex justify-end gap-4">
            <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300"
            >
                No, thanks
            </button>
            <button
                onClick={handleSelect}
                disabled={!selectedWrap || loading || loadError}
                className="px-6 py-2 rounded-lg text-white bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300"
            >
                Select Wrap
            </button>
        </div>
      </Motion.div>
    </dialog>
  );
};


export default GiftWrapModal;
