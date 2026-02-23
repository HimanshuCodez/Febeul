import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaMapMarkerAlt, 
  FaMoneyBillWave, 
  FaCreditCard, 
  FaShoppingBag,
  FaCheck,
  FaChevronRight,
  FaEdit,
  FaTimes
} from 'react-icons/fa';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import GiftWrapModal from '../components/GiftWrapModal';
import CouponCodeInput from '../components/CouponCodeInput'; // Import the new component

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function CheckoutPage() {
  const { user, token, isAuthenticated, getProfile } = useAuthStore();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [step, setStep] = useState(1);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState("");
  const [selectedGiftWrap, setSelectedGiftWrap] = useState(null);
  const [isGiftWrapModalOpen, setIsGiftWrapModalOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const STANDARD_SHIPPING_CHARGE = 0; // Changed to 0 as per user request
  const COD_SHIPPING_CHARGE = 50.00; // Assuming 50 rs is 50.00 in current currency

  // Address Form State
  const [addressName, setAddressName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [addressState, setAddressState] = useState('');

  // Fetch Razorpay Key
  useEffect(() => {
    const fetchRazorpayKey = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/order/get-key`);
        if (response.data.success) {
          setRazorpayKey(response.data.key);
        }
      } catch (error) {
        console.error("Failed to fetch razorpay key", error);
      }
    };
    fetchRazorpayKey();
  }, []);

  // Fetch Cart Items & Check Auth
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }

    const fetchCart = async () => {
      if (!user) return;
      try {
        const response = await axios.get(
          `${backendUrl}/api/cart/get`,
          { headers: { token } }
        );
        if (response.data.success) {
          setCartItems(response.data.cartItems);
          if (response.data.giftWrap) {
            setSelectedGiftWrap(response.data.giftWrap);
          }
        }
      } catch (error) {
        toast.error("Failed to fetch cart.");
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [isAuthenticated, user, navigate, token]);

  // Handle Address Form Visibility
  useEffect(() => {
    if (user && user.addresses && user.addresses.length === 0 && !showAddressForm) {
      setShowAddressForm(true);
    }
  }, [user, showAddressForm]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    const newAddress = { 
        name: addressName, 
        address: addressLine, 
        city: addressCity, 
        zip: addressZip, 
        state: addressState,
        country: addressCountry, 
        phone: addressPhone 
    };
    try {
        const response = await axios.post(`${backendUrl}/api/user/add-address`, 
            { userId: user._id, address: newAddress },
            { headers: { token } }
        );
        if(response.data.success) {
            toast.success("Address added!");
            await getProfile();
            setShowAddressForm(false);
        } else {
            toast.error(response.data.message);
        }
    } catch (error) {
        toast.error("Failed to add address.");
    }
    }
    const subtotal = cartItems.reduce((sum, item) => {
        const selectedVariation = item.variations?.find(
            (v) => v.color === item.color
        );
        const itemPrice = selectedVariation?.sizes?.find(
            (s) => s.size === item.size
        )?.price;
        const actualPrice = item.price || itemPrice || 0; // Prioritize item.price if backend provides it directly, else use derived, fallback to 0

        return sum + (actualPrice * item.quantity);
    }, 0);

    const totalProductDiscount = cartItems.reduce((sum, item) => {
        return sum + (item.discountAmount || 0);
    }, 0);

    const isLuxeMember = user?.isLuxeMember && (user?.giftWrapsLeft > 0);
    
    let shippingCharge = 0;
    if (selectedPayment !== 'cod' && !user?.isLuxeMember && (subtotal - totalProductDiscount) < 499) {
        shippingCharge = 50.00;
    }

    const codCharge = selectedPayment === 'cod' ? COD_SHIPPING_CHARGE : 0;
    
    const giftWrapPrice = selectedGiftWrap ? (isLuxeMember ? 0 : selectedGiftWrap.price) : 0;
    
    const discountedAmount = subtotal - totalProductDiscount - couponDiscount;
    const total = parseFloat((subtotal - totalProductDiscount + shippingCharge + codCharge + giftWrapPrice - couponDiscount).toFixed(2));
    
    const addresses = user?.addresses || [];

  const handleSelectGiftWrap = (wrap) => {
    setSelectedGiftWrap(wrap);
    toast.success(`${wrap.name} gift wrap added!`);
  }

  const handleCouponApply = (couponData) => {
    if (couponData && couponData.success) {
        setAppliedCoupon(couponData);
        setCouponDiscount(couponData.discountAmount);
    } else {
        setAppliedCoupon(null);
        setCouponDiscount(0);
    }
  }

  const placeCodOrder = async () => {
    const orderItems = cartItems.map((item) => {
        const selectedVariation = item.variations?.find(
            (v) => v.color === item.color
        );
        const itemPrice = selectedVariation?.sizes?.find(
            (s) => s.size === item.size
        )?.price;
        const actualPrice = item.price || itemPrice || 0;

        const itemImage = selectedVariation?.images?.[0]; // Get the first image of the selected variation
        const actualImage = item.image || itemImage;

        return {
            productId: item._id, // Use item._id as it's the product ID
            quantity: item.quantity,
            size: item.size,
            name: item.name,
            image: actualImage, // Use item.image directly
            price: actualPrice, // Use item.price directly
            color: item.color,
            sku: selectedVariation?.sku, // Add SKU here
            discountAmount: item.discountAmount || 0,
            appliedCoupon: item.appliedCoupon || null
        }
    });
    const orderData = {
        userId: user._id,
        items: orderItems,
        amount: total,
        address: addresses[selectedAddress],
        giftWrap: selectedGiftWrap,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponDiscount: couponDiscount,
    }
    try {
        const response = await axios.post(`${backendUrl}/api/order/place`, orderData, { headers: { token } });
        if (response.data.success) {
            toast.success("Order placed successfully!");
            const pricingDetails = { subtotal, shipping: shippingCharge, cod: codCharge, total, giftWrapPrice, couponDiscount };
            navigate("/Success", { state: { order: response.data.order, items: cartItems, address: addresses[selectedAddress], pricingDetails } });
        } else {
            toast.error(response.data.message || "Failed to place order.");
        }
    } catch (error) {
        toast.error(error.response?.data?.message || "Failed to place order.");
    }
  }

  const handlePlaceOrder = async () => {
    if (selectedPayment === 'cod') {
      await placeCodOrder();
    } else if (selectedPayment === 'card') {
      await handleRazorpayPayment();
    }
  }

  const handleRazorpayPayment = async () => {
    try {
      const orderItems = cartItems.map((item) => {
        const selectedVariation = item.variations?.find(
            (v) => v.color === item.color
        );
        const itemPrice = selectedVariation?.sizes?.find(
            (s) => s.size === item.size
        )?.price;
        const actualPrice = item.price || itemPrice || 0;

        const itemImage = selectedVariation?.images?.[0]; // Get the first image of the selected variation
        const actualImage = item.image || itemImage;

        return {
            productId: item._id, // Use item._id as it's the product ID
            quantity: item.quantity,
            size: item.size,
            name: item.name,
            image: actualImage, // Use item.image directly
            price: actualPrice, // Use item.price directly
            color: item.color,
            sku: selectedVariation?.sku, // Add SKU here
            discountAmount: item.discountAmount || 0,
            appliedCoupon: item.appliedCoupon || null
        }
      });      const orderPayload = {
        userId: user._id,
        items: orderItems,
        amount: total,
        address: addresses[selectedAddress],
        giftWrap: selectedGiftWrap,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponDiscount: couponDiscount,
        currency: 'INR',
      };
      
      const orderResponse = await axios.post(`${backendUrl}/api/order/razorpay`, orderPayload, { headers: { token } });

      if (!orderResponse.data.success) {
        toast.error(orderResponse.data.message || "Order creation failed");
        return;
      }

      const { order } = orderResponse.data;

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: "INR",
        name: "FEBEUL",
        description: "Order Payment",
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyResponse = await axios.post(
              `${backendUrl}/api/order/verifyRazorpay`,
              {
                userId: user._id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: { token } }
            );

            if (verifyResponse.data.success) {
              toast.success("Payment successful!");
              const localOrder = { _id: order.receipt, ...orderPayload };
              const pricingDetails = { subtotal, shipping: shippingCharge, cod: codCharge, total, giftWrapPrice, couponDiscount };
              navigate('/Success', { state: { order: localOrder, items: cartItems, address: addresses[selectedAddress], pricingDetails } });
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (error) {
            toast.error("Payment verification failed.");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.mobile,
        },
        theme: {
          color: "#f9aeaf",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment failed. Please try again.");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-[#f9aeaf] py-8 px-4">
      <GiftWrapModal 
        isOpen={isGiftWrapModalOpen}
        onClose={() => setIsGiftWrapModalOpen(false)}
        onSelect={handleSelectGiftWrap}
      />
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <h1 className="text-3xl font-bold text-gray-800">Checkout</h1>
          <div className="flex items-center mt-4 text-sm">
            <span className={`flex items-center ${step >= 1 ? 'text-[#e8767a]' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 1 ? 'bg-[#e8767a] text-white' : 'bg-gray-200'}`}>
                {step > 1 ? <FaCheck /> : '1'}
              </span>
              Address
            </span>
            <FaChevronRight className="mx-4 text-gray-400" />
            <span className={`flex items-center ${step >= 2 ? 'text-[#e8767a]' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 2 ? 'bg-[#e8767a] text-white' : 'bg-gray-200'}`}>
                {step > 2 ? <FaCheck /> : '2'}
              </span>
              Payment
            </span>
            <FaChevronRight className="mx-4 text-gray-400" />
            <span className={`flex items-center ${step >= 3 ? 'text-[#e8767a]' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 3 ? 'bg-[#e8767a] text-white' : 'bg-gray-200'}`}>
                3
              </span>
              Review
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
              }}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-[#e8767a]" />
                  Delivery Address
                </h2>
                {step > 1 && (
                  <button 
                    onClick={() => setStep(1)}
                    className="text-[#e8767a] hover:text-[#d5666a] flex items-center text-sm"
                  >
                    <FaEdit className="mr-1" /> Change
                  </button>
                )}
              </div>

              {step === 1 ? (
                showAddressForm ? (
                    <form onSubmit={handleAddAddress} className="space-y-4">
                        <h3 className='font-semibold text-lg'>Add a new address</h3>
                        <input type="text" placeholder="Full Name" value={addressName} onChange={e => setAddressName(e.target.value)} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Address Line" value={addressLine} onChange={e => setAddressLine(e.target.value)} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="City" value={addressCity} onChange={e => setAddressCity(e.target.value)} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="ZIP Code" value={addressZip} onChange={e => setAddressZip(e.target.value)} className="w-full p-2 border rounded" required pattern="[0-9]{6}" title="ZIP Code must be 6 digits." />
                        <input type="text" placeholder="State" value={addressState} onChange={e => setAddressState(e.target.value)} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Country" value={addressCountry} onChange={e => setAddressCountry(e.target.value)} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Phone Number" value={addressPhone} onChange={e => setAddressPhone(e.target.value)} className="w-full p-2 border rounded" required pattern="[0-9]{10}" title="Phone number must be 10 digits." />
                        <button type="submit" className="w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 px-6 rounded-lg transition-colors mt-4">Save Address</button>
                    </form>
                ) : (
                <div className="space-y-3">
                  {addresses.map((addr, idx) => (
                    <motion.div
                      key={addr._id}
                      variants={{hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 }}}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedAddress(idx)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedAddress === idx 
                          ? 'border-[#e8767a] bg-[#fff5f5]' 
                          : 'border-gray-200 hover:border-[#f9aeaf]'
                      }`}
                    >
                       <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-gray-800">{addr.name}</p>
                          <p className="text-gray-600 text-sm mt-1">{addr.address}</p>
                          <p className="text-gray-600 text-sm">{addr.city}, {addr.zip}, {addr.country}</p>
                          <p className="text-gray-600 text-sm mt-1">Phone: {addr.phone}</p>
                        </div>
                        {selectedAddress === idx && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-[#e8767a] rounded-full flex items-center justify-center"
                          >
                            <FaCheck className="text-white text-xs" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  <button onClick={() => setShowAddressForm(true)} className="text-blue-600 mt-2">Add a new address</button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(2)}
                    className="w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 px-6 rounded-lg transition-colors mt-4"
                  >
                    Use this address
                  </motion.button>
                </div>
                )
              ) : (
                addresses.length > 0 && 
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-2 border-[#e8767a] bg-[#fff5f5] rounded-lg p-4"
                >
                  <p className="font-bold text-gray-800">{addresses[selectedAddress].name}</p>
                  <p className="text-gray-600 text-sm mt-1">{addresses[selectedAddress].address}</p>
                  <p className="text-gray-600 text-sm">{addresses[selectedAddress].city}, {addresses[selectedAddress].zip}, {addresses[selectedAddress].country}</p>
                  <p className="text-gray-600 text-sm mt-1">Phone: {addresses[selectedAddress].phone}</p>
                </motion.div>
              )}
            </motion.div>

            {step >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <FaCreditCard className="mr-2 text-[#e8767a]" />
                    Payment Method
                  </h2>
                  {step > 2 && (
                    <button 
                      onClick={() => setStep(2)}
                      className="text-[#e8767a] hover:text-[#d5666a] flex items-center text-sm"
                    >
                      <FaEdit className="mr-1" /> Change
                    </button>
                  )}
                </div>

                {step === 2 ? (
                  <div className="space-y-3">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedPayment('card')}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPayment === 'card' 
                          ? 'border-[#e8767a] bg-[#fff5f5]' 
                          : 'border-gray-200 hover:border-[#f9aeaf]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FaCreditCard className="text-2xl text-[#e8767a] mr-3" />
                          <div>
                            <p className="font-bold text-gray-800">Upi / Net Banking / Card</p>
                            <p className="text-sm text-gray-600">Pay with your via payment gateway</p>
                          </div>
                        </div>
                        {selectedPayment === 'card' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-[#e8767a] rounded-full flex items-center justify-center"
                          >
                            <FaCheck className="text-white text-xs" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedPayment('cod')}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPayment === 'cod' 
                          ? 'border-[#e8767a] bg-[#fff5f5]' 
                          : 'border-gray-200 hover:border-[#f9aeaf]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FaMoneyBillWave className="text-2xl text-[#e8767a] mr-3" />
                          <div>
                            <p className="font-bold text-gray-800">Cash on Delivery</p>
                            <p className="text-sm text-gray-600">Pay with cash when you receive</p>
                          </div>
                        </div>
                        {selectedPayment === 'cod' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-[#e8767a] rounded-full flex items-center justify-center"
                          >
                            <FaCheck className="text-white text-xs" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectedPayment && setStep(3)}
                      disabled={!selectedPayment}
                      className={`w-full font-bold py-3 px-6 rounded-lg transition-colors mt-4 ${
                        selectedPayment 
                          ? 'bg-[#e8767a] hover:bg-[#d5666a] text-white' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Continue
                    </motion.button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-2 border-[#e8767a] bg-[#fff5f5] rounded-lg p-4 flex items-center"
                  >
                    {selectedPayment === 'card' ? (
                      <>
                        <FaCreditCard className="text-2xl text-[#e8767a] mr-3" />
                        <div>
                          <p className="font-bold text-gray-800">Upi / Net Banking / Card</p>
                          <p className="text-sm text-gray-600">Payment Gateway</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <FaMoneyBillWave className="text-2xl text-[#e8767a] mr-3" />
                        <div>
                          <p className="font-bold text-gray-800">Cash on Delivery</p>
                          <p className="text-sm text-gray-600">Pay on delivery</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-lg shadow-md p-6 sticky top-8"
            >
              <h2 className="text-xl font-bold text-gray-800 flex items-center mb-4">
                <FaShoppingBag className="mr-2 text-[#e8767a]" />
                Order Summary
              </h2>

              <div className="space-y-3 mb-4">
                {cartItems.map(item => {
                  const selectedVariation = item.variations?.find(v => v.color === item.color);
                  const selectedSizePrice = selectedVariation?.sizes?.find(s => s.size === item.size)?.price;

                  const actualPrice = item.price || selectedSizePrice || 0; // Use 0 as fallback if price is still not found
                  const actualImage = selectedVariation?.images?.[0] || item.variations?.[0]?.images?.[0]; // Fallback to first variation's first image

                  return (
                    <div key={item._id + item.size + item.color} className="flex items-start justify-between text-sm">
                        <div className="flex items-start flex-1">
                        <img src={actualImage} className="w-10 h-10 object-cover mr-2 rounded" />
                        <div>
                            <p className="text-gray-800 font-medium">{item.name}</p>
                            <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                        </div>
                        </div>
                        <p className="font-bold text-gray-800">₹{(actualPrice * item.quantity).toFixed(2)}</p>
                    </div>
                  )
                })}
              </div>
              
              <CouponCodeInput cartTotal={subtotal} onCouponApply={handleCouponApply} />


              <div className="border-t pt-4 mt-6 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {totalProductDiscount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                        <span>Coupon Discount</span>
                        <span>- ₹{totalProductDiscount.toFixed(2)}</span>
                    </div>
                )}
                {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                        <span>Coupon Discount</span>
                        <span>- ₹{couponDiscount.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  {shippingCharge > 0 ? (
                    <span>₹{shippingCharge.toFixed(2)}</span>
                  ) : (
                    <span>FREE</span> 
                  )}
                </div>
                {codCharge > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>COD Charges</span>
                    <span>₹{codCharge.toFixed(2)}</span>
                  </div>
                )}
                {selectedGiftWrap && (
                  <div className="flex justify-between items-center text-gray-600">
                    <div>
                      <span>Gift Wrap:</span>
                      <p className="text-xs">{selectedGiftWrap.name}</p>
                      {selectedGiftWrap.message && (
                        <p className="text-xs italic text-gray-500">"{selectedGiftWrap.message}"</p>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                    <span>₹{selectedGiftWrap.price.toFixed(2)}</span>
                    <button onClick={() => setSelectedGiftWrap(null)} className="text-red-500 hover:text-red-700 text-xs">
                        <FaTimes/>
                    </button>
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-800">
                  <span>Total(including taxes)</span>
                  <span className="text-[#e8767a]">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {!selectedGiftWrap && (
                 <motion.button
                 onClick={() => setIsGiftWrapModalOpen(true)}
                 whileHover={{ scale: 1.05 }}
                 className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors mt-4 text-sm"
               >
                 Add Gift Wrap?
               </motion.button>
              )}

              {step === 3 && (
                <motion.button
                  onClick={handlePlaceOrder}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 px-6 rounded-lg transition-colors mt-6"
                >
                  Place Order
                </motion.button>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}