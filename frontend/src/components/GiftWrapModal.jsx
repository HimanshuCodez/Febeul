import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const GiftWrapModal = ({ isOpen, onClose, onSelect }) => {
  const [selectedWrap, setSelectedWrap] = useState(null);
  const [giftMessage, setGiftMessage] = useState('');
  const [giftWraps, setGiftWraps] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, getProfile } = useAuthStore();
  const isLuxeMember = user?.isLuxeMember || false;
  const giftWrapsLeft = user?.giftWrapsLeft || 0;

  useEffect(() => {
    if (isOpen) {
      const fetchGiftWraps = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`${backendUrl}/api/giftwrap/list`);
          if (response.data.success) {
            setGiftWraps(response.data.data);
          } else {
            console.error("Failed to load gift wraps");
          }
        } catch (error) {
          console.error("Error fetching gift wraps:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchGiftWraps();
    }
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

      if (isLuxeMember && giftWrapsLeft > 0) {
        try {
          const token = localStorage.getItem('token'); // Assuming token is stored in localStorage
          const response = await axios.post(
            `${backendUrl}/api/user/giftwrap/decrement`,
            {},
            { headers: { token } }
          );
          if (response.data.success) {
            getProfile(); // Refresh user profile to get updated giftWrapsLeft
          } else {
            toast.error(response.data.message);
          }
        } catch (error) {
          console.error("Error decrementing gift wraps:", error);
          toast.error("Failed to update gift wrap count.");
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Choose Gift Wrap</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes size={24} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
          {loading ? (
            <div className="col-span-full text-center p-8">
              <p>Loading wraps...</p>
            </div>
          ) : (
            giftWraps.map((wrap) => (
              <div
                key={wrap._id}
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
                disabled={!selectedWrap}
                className="px-6 py-2 rounded-lg text-white bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300"
            >
                Select Wrap
            </button>
        </div>
      </motion.div>
    </div>
  );
};


export default GiftWrapModal;
