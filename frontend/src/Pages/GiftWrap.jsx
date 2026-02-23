import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGift, FaCrown, FaCheck, FaPlus, FaMinus, FaShoppingCart, FaStar } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function GiftWrapPage() {

  const [giftWraps, setGiftWraps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWrap, setSelectedWrap] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showPromo, setShowPromo] = useState(true);
  const { user, fetchCartCount, getProfile } = useAuthStore();

  useEffect(() => {
    const fetchGiftWraps = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/giftwrap/list`);
        if (response.data.success) {
          setGiftWraps(response.data.data);
        } else {
          toast.error("Could not load gift wraps.");
        }
      } catch (error) {
        console.error("Failed to fetch gift wraps", error);
        toast.error("Could not load gift wraps.");
      } finally {
        setLoading(false);
      }
    };
    fetchGiftWraps();
  }, []);

  const isLuxeMember = user?.isLuxeMember || false;
  const giftWrapsLeft = user?.giftWrapsLeft || 0;

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

  const totalPrice = selectedWrap 
    ? getCalculatedPrice(selectedWrap) * quantity 
    : 0;
  
  const handleAddToCart = async () => {
    if (!selectedWrap) {
      toast.error("Please select a gift wrap first.");
      return;
    }
    
    if (!user) {
      toast.error("Please log in to add to cart.");
      return;
    }

    try {
      const response = await axios.post(`${backendUrl}/api/cart/add-giftwrap`, 
        { giftWrapId: selectedWrap._id },
        { headers: { token: localStorage.getItem('token') } }
      );

      if (response.data.success) {
        toast.success(`${selectedWrap.name} added to cart!`);
        fetchCartCount(); // Update cart count in store
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error adding gift wrap to cart", error);
      toast.error("Failed to add gift wrap to cart.");
    }
  }
  
    if (loading) {
      return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }
  
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Promo Banner */}
        <AnimatePresence>
          {showPromo && (
            <motion.div
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="text-white py-4 px-6 relative"
              style={{ background: 'linear-gradient(135deg, #f47b7d 0%, #ff9a9c 100%)' }}
            >
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaCrown className="text-2xl" />
                  <div>
                    {isLuxeMember ? (
                      <>
                        <p className="font-semibold text-sm">Welcome Luxe Member!</p>
                        <p className="text-xs opacity-90">You have {giftWrapsLeft} out of 15 free gift wraps left this month.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-sm">Join Febeul Luxe Today!</p>
                        <p className="text-xs opacity-90">Get 15 FREE Gift Wraps with Premium Membership</p>
                      </>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setShowPromo(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
  
        {/* Header */}
        <section className="bg-white py-12 px-6 text-center border-b">
          <FaGift className="text-5xl mx-auto mb-4" style={{ color: '#f47b7d' }} />
          <h1 className="text-4xl font-light mb-3 text-gray-800">
            Gift Wrap Selection
          </h1>
          <p className="text-gray-600">Make your gift extra special with our premium wrapping options</p>
        </section>
  
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Product & Wrap Selection */}
            <div className="lg:col-span-2 space-y-8">
  
  
              {/* Select Gift Wrap */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-light mb-6 text-gray-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#f47b7d' }}>1</span>
                  Choose Gift Wrap Style
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {giftWraps.map((wrap) => (
                    <motion.div
                      key={wrap._id}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => setSelectedWrap(wrap)}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedWrap?._id === wrap._id 
                          ? 'shadow-lg' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={selectedWrap?._id === wrap._id ? { borderColor: '#f47b7d' } : {}}
                    >
                      <div className="relative">
                        <img src={wrap.image} alt={wrap.name} className="w-full aspect-square object-cover" />
                        {selectedWrap?._id === wrap._id && (
                          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#f47b7d' }}>
                              <FaCheck />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-xs font-light text-gray-700 mb-1">{wrap.name}</p>
                        <p className="text-sm font-semibold" style={{ color: '#f47b7d' }}>{getDisplayedPrice(wrap)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
  
              {/* Quantity Selector */}
              {selectedWrap && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm p-6"
                >
                  <h2 className="text-2xl font-light mb-6 text-gray-800 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#f47b7d' }}>2</span>
                    Gift Wrap Quantity
                  </h2>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#f47b7d', color: '#f47b7d' }}
                    >
                      <FaMinus className="text-sm" />
                    </button>
                    <span className="text-2xl font-light text-gray-800 w-12 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#f47b7d', color: '#f47b7d' }}
                    >
                      <FaPlus className="text-sm" />
                    </button>
                    <span className="text-sm text-gray-600 ml-4">
                      {getDisplayedPrice(selectedWrap)} × {quantity} = {isLuxeMember && giftWrapsLeft > 0 ? 'FREE' : `₹${selectedWrap.price * quantity}`}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
  
            {/* Right Column - Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                <h3 className="text-xl font-light mb-4 text-gray-800">Order Summary</h3>
                
                {!selectedWrap && (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Select a gift wrap to continue
                  </p>
                )}
  
  
  
                {selectedWrap && (
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-xs text-gray-500 mb-1">Gift Wrap</p>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm text-gray-800">{selectedWrap.name}</p>
                      <p className="text-sm">{getDisplayedPrice(selectedWrap)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">Quantity: {quantity}</p>
                      <p className="text-sm font-semibold">{isLuxeMember && giftWrapsLeft > 0 ? 'FREE' : `₹${selectedWrap.price * quantity}`}</p>
                    </div>
                  </div>
                )}
  
                {selectedWrap && (
                  <>
                    <div className="mb-6">
                      <div className="flex justify-between items-center">
                        <p className="text-lg font-light text-gray-800">Total</p>
                        <p className="text-2xl font-semibold" style={{ color: '#f47b7d' }}>{isLuxeMember && giftWrapsLeft > 0 ? 'FREE' : `₹${totalPrice}`}</p>
                      </div>
                    </div>
  
                    <motion.button
                      onClick={handleAddToCart}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-full text-white font-light flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: '#f47b7d' }}
                    >
                      <FaShoppingCart />
                      Add to Cart
                    </motion.button>
                  </>
                )}
  
                {/* Luxe Promotion */}
                <div className="mt-6 p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <FaCrown style={{ color: '#f47b7d' }} />
                    <p className="text-sm font-semibold text-gray-800">
                      {isLuxeMember ? `You have ${giftWrapsLeft} free gift wraps left!` : 'Febeul Luxe Members'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    {isLuxeMember ? 'Enjoy your exclusive benefits.' : 'Get 15 FREE gift wraps + exclusive benefits'}
                  </p>
                  {!isLuxeMember && (
                    <button className="text-xs font-semibold hover:underline" style={{ color: '#f47b7d' }}>
                      Join Now →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );}