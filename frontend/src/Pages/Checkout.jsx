import React, { useState, useEffect } from 'react';
import { isCouponExpired } from '../../../shared/couponValidity.js';
import { motion as Motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { FaShieldAlt } from 'react-icons/fa';
import { ArrowLeft, ArrowRight, Banknote, Check, ChevronDown, CreditCard, Gift, Loader2, LockKeyhole, MapPin, Pencil, Plus, ShoppingBag, Tag, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import GiftWrapModal from '../components/GiftWrapModal';
import CouponCodeInput from '../components/CouponCodeInput';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

const ORDER_SUCCESS_REDIRECT_DELAY_MS = 1600;

const CheckoutField = ({ label, optional = false, className = '', children }) => (
  <label className={'block min-w-0 ' + className}>
    <span className="mb-2 block text-xs font-medium text-stone-700">{label}{optional && <span className="font-normal text-stone-400"> (optional)</span>}</span>
    {children}
  </label>
);

const AddressDetails = ({ address }) => (
  <span className="block min-w-0 flex-1 text-sm leading-6 text-stone-600">
    <span className="mb-1 flex flex-wrap items-center gap-2"><span className="break-words font-semibold text-stone-900">{address.name}</span><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-stone-500 ring-1 ring-stone-200">{address.addressType || 'Home'}</span></span>
    <span className="block break-words">{[address.address, address.locality].filter(Boolean).join(', ')}</span>
    {address.landmark && <span className="block break-words text-xs text-stone-500">Near {address.landmark}</span>}
    <span className="block break-words">{address.city}, {address.state} {address.zip}</span>
    <span className="block break-words">{address.country}</span>
    <span className="mt-2 block break-words text-xs">Phone: {address.phone}{address.alternatePhone ? ', ' + address.alternatePhone : ''}</span>
  </span>
);

// Flipkart-style full-screen success tick — deliberately shows nothing
// beyond the checkmark itself before handing off to the order detail page.
const OrderPlacedOverlay = () => (
  <Motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center"
  >
    <Motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="w-28 h-28 rounded-full bg-green-500 flex items-center justify-center shadow-xl"
    >
      <Motion.svg viewBox="0 0 24 24" className="w-14 h-14" fill="none">
        <Motion.path
          d="M5 13l4 4L19 7"
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeInOut' }}
        />
      </Motion.svg>
    </Motion.div>
    <Motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="text-xl font-black text-gray-800 mt-6"
    >
      Order Placed!
    </Motion.p>
  </Motion.div>
);

// Shown the instant Razorpay hands control back to us, while we call
// verifyRazorpay server-side (~3-4s) — covers the gap so the user never
// sees a blank/frozen checkout page after paying.
const VerifyingPaymentOverlay = () => (
  <Motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[200] flex flex-col items-center justify-center px-6"
  >
    <div className="relative w-20 h-20 flex items-center justify-center">
      <Motion.div
        className="absolute inset-0 rounded-full border-4 border-[#f9d7d8]"
      />
      <Motion.div
        className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#e8767a]"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      />
      <FaShieldAlt className="text-[#e8767a] text-2xl" />
    </div>
    <Motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="text-lg font-bold text-gray-800 mt-6 text-center"
    >
      Verifying your payment...
    </Motion.p>
    <Motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="text-sm text-gray-500 mt-2 text-center max-w-xs"
    >
      Please wait, do not refresh or close this window.
    </Motion.p>
  </Motion.div>
);

export default function CheckoutPage() {
  const { user, token, isAuthenticated, getProfile, siteSettings, fetchSiteSettings, getStateServiceability, getPincodeServiceability } = useAuthStore();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartLoadError, setCartLoadError] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [step, setStep] = useState(1);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState("");
  const [selectedGiftWrap, setSelectedGiftWrap] = useState(null);
  const [isGiftWrapModalOpen, setIsGiftWrapModalOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [activeOffers, setActiveOffers] = useState([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  useEffect(() => {
    fetchSiteSettings();
  }, [fetchSiteSettings]);

  // Address Form State
  const [addressName, setAddressName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressLocality, setAddressLocality] = useState('');
  const [addressLandmark, setAddressLandmark] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [addressCountry, setAddressCountry] = useState('India');
  const [addressPhone, setAddressPhone] = useState('');
  const [addressAlternatePhone, setAddressAlternatePhone] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressType, setAddressType] = useState('Home');
  const [saturdayDelivery, setSaturdayDelivery] = useState(true);
  const [sundayDelivery, setSundayDelivery] = useState(true);
  const [isWeekendAccordionOpen, setIsWeekendAccordionOpen] = useState(false);
  const [isPincodeLoading, setPincodeLoading] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);

  // Fetch City/State from Pincode in Checkout
  useEffect(() => {
    const fetchPincodeDetails = async () => {
      if (addressZip.length === 6 && addressCountry === 'India') {
        setPincodeLoading(true);
        try {
          const response = await axios.get(`${backendUrl}/api/user/pincode-check/${addressZip}`);
          const data = response.data[0];

          if (data.Status === 'Success' && data.PostOffice && data.PostOffice.length > 0) {
            const { District, State } = data.PostOffice[0];
            setAddressCity(District);
            setAddressState(State);
            toast.success(`Detected: ${District}, ${State}`);

            const zoneInfo = getStateServiceability(State);
            const pinInfo = getPincodeServiceability(addressZip);
            if ((zoneInfo && zoneInfo.active === false) || (pinInfo && pinInfo.blockPincode)) {
              toast.error('This pincode is not currently serviceable.');
            } else if (pinInfo && pinInfo.blockCod) {
              toast('Cash on Delivery is not available in your area.', { icon: '⚠️' });
            }
          } else {
            toast.error("Invalid Pincode or no data found.");
          }
        } catch (error) {
          console.error("Pincode API error:", error);
          toast.error("Failed to fetch location.");
        } finally {
          setPincodeLoading(false);
        }
      }
    };

    fetchPincodeDetails();
  }, [addressZip, addressCountry, getPincodeServiceability, getStateServiceability]);

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
          setCartLoadError(false);
          setCartItems(response.data.cartItems);
          useAuthStore.getState().setCartItems(response.data.cartItems);
          if (response.data.giftWrap) {
            setSelectedGiftWrap(response.data.giftWrap);
          }
        } else {
          throw new Error('Unable to load checkout.');
        }
      } catch {
        setCartLoadError(true);
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

  // Handle Coupon Validation on Payment Method Change
  useEffect(() => {
    if (appliedCoupon && appliedCoupon.offerType && appliedCoupon.offerType !== 'none') {
      if (appliedCoupon.offerType === 'prepaid' && selectedPayment && selectedPayment !== 'card') {
        toast.error("Coupon removed: Only valid for prepaid orders.");
        handleCouponApply(null);
      } else if (appliedCoupon.offerType === 'cod' && selectedPayment && selectedPayment !== 'cod') {
        toast.error("Coupon removed: Only valid for Cash on Delivery (COD) orders.");
        handleCouponApply(null);
      }
    }
  }, [selectedPayment, appliedCoupon]);

  // Fetch active, user-eligible offers (respects Luxe / specific-user restrictions server-side)
  useEffect(() => {
    const fetchOffers = async () => {
      if (!token) return;
      try {
        const response = await axios.get(`${backendUrl}/api/coupon/all`, { headers: { token } });
        if (response.data.success) {
          setActiveOffers(response.data.coupons.filter(c => c.isActive && !isCouponExpired(c)));
        }
      } catch (error) {
        console.error("Failed to fetch active offers", error);
      }
    };
    fetchOffers();
  }, [token]);

  const getBestOffer = (offerType) => {
    const candidates = activeOffers.filter(o => o.offerType === offerType);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => (curr.discountValue > best.discountValue ? curr : best));
  };

  const bestPrepaidOffer = getBestOffer('prepaid');

  const formatDiscount = (offer) => offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`;

  // Auto-apply the best matching online/COD-only coupon the moment the user picks a payment method
  useEffect(() => {
    if (!selectedPayment || appliedCoupon || cartItems.length === 0) return;
    const offerType = selectedPayment === 'card' ? 'prepaid' : selectedPayment === 'cod' ? 'cod' : null;
    if (!offerType) return;

    const candidates = activeOffers
      .filter(o => o.offerType === offerType)
      .sort((a, b) => b.discountValue - a.discountValue);
    if (candidates.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const offer of candidates) {
        try {
          const response = await axios.post(`${backendUrl}/api/coupon/apply`,
            { code: offer.code, items: cartItemsForCoupon, userId: user._id, paymentMethod: selectedPayment },
            { headers: { token } }
          );
          if (response.data.success && !cancelled) {
            handleCouponApply(response.data);
            toast.success(`🎉 ${offer.code} auto-applied — you're saving ${formatDiscount(offer)}!`, { icon: '✨' });
            break;
          }
        } catch {
          // Silently skip ineligible candidates during auto-apply
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedPayment]);

  // Combines the state-level "Active" toggle with pincode-level overrides
  // from Delivery Control to decide if an address can be delivered to at all.
  const isAddressServiceable = (addr) => {
    if (!addr) return true;
    const zoneInfo = getStateServiceability(addr.state);
    if (zoneInfo && zoneInfo.active === false) return false;
    const pinInfo = getPincodeServiceability(addr.zip);
    if (pinInfo && pinInfo.blockPincode) return false;
    return true;
  };

  const isCodBlockedForAddress = (addr) => {
    if (!addr) return false;
    const pinInfo = getPincodeServiceability(addr.zip);
    return !!(pinInfo && pinInfo.blockCod);
  };

  const clearAddressForm = () => {
    setAddressName('');
    setAddressLine('');
    setAddressLocality('');
    setAddressLandmark('');
    setAddressCity('');
    setAddressZip('');
    setAddressState('');
    setAddressCountry('India');
    setAddressPhone('');
    setAddressAlternatePhone('');
    setAddressType('Home');
    setSaturdayDelivery(true);
    setSundayDelivery(true);
    setEditingAddressId(null);
  }

  const handleEditAddress = (addr) => {
    setAddressName(addr.name);
    setAddressLine(addr.address);
    setAddressLocality(addr.locality || '');
    setAddressLandmark(addr.landmark || '');
    setAddressCity(addr.city);
    setAddressZip(addr.zip);
    setAddressState(addr.state);
    setAddressCountry(addr.country);
    setAddressPhone(addr.phone);
    setAddressAlternatePhone(addr.alternatePhone || '');
    setAddressType(addr.addressType || 'Home');
    setSaturdayDelivery(addr.saturdayDelivery !== undefined ? addr.saturdayDelivery : true);
    setSundayDelivery(addr.sundayDelivery !== undefined ? addr.sundayDelivery : true);
    setEditingAddressId(addr._id);
    setShowAddressForm(true);
  }

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (isSavingAddress) return;

    if (!isAddressServiceable({ state: addressState, zip: addressZip })) {
      toast.error('This pincode is not currently serviceable.');
      return;
    }

    const addressData = {
        name: addressName, 
        address: addressLine, 
        locality: addressLocality,
        landmark: addressLandmark,
        city: addressCity, 
        zip: addressZip, 
        state: addressState,
        country: addressCountry, 
        phone: addressPhone,
        alternatePhone: addressAlternatePhone,
        addressType: addressType,
        saturdayDelivery,
        sundayDelivery
    };

    setIsSavingAddress(true);
    try {
        let response;
        if (editingAddressId) {
            response = await axios.post(`${backendUrl}/api/user/update-address`, 
                { userId: user._id, addressId: editingAddressId, address: addressData },
                { headers: { token } }
            );
        } else {
            response = await axios.post(`${backendUrl}/api/user/add-address`, 
                { userId: user._id, address: addressData },
                { headers: { token } }
            );
        }

        if(response.data.success) {
            toast.success(editingAddressId ? "Address updated!" : "Address added!");
            await getProfile();
            setShowAddressForm(false);
            clearAddressForm();
        } else {
            toast.error(response.data.message);
        }
    } catch {
        toast.error(editingAddressId ? "Failed to update address." : "Failed to add address.");
    } finally {
        setIsSavingAddress(false);
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

    const cartItemsForCoupon = cartItems.map((item) => {
        const selectedVariation = item.variations?.find(v => v.color === item.color);
        const itemPrice = selectedVariation?.sizes?.find(s => s.size === item.size)?.price;
        return {
            sku: selectedVariation?.sku,
            price: item.price || itemPrice || 0,
            quantity: item.quantity,
            appliedCoupon: item.appliedCoupon
        };
    });

    const isLuxeMember = user?.isLuxeMember && (user?.giftWrapsLeft > 0);
    
    let shippingCharge = 0;
    if (selectedPayment !== 'cod' && !user?.isLuxeMember && (subtotal - totalProductDiscount) < (siteSettings.shippingThreshold || 499)) {
        shippingCharge = siteSettings.defaultShippingCharge || 50.00;
    }

    const codCharge = selectedPayment === 'cod' ? (siteSettings.codCharge || 50.00) : 0;
    
    const giftWrapPrice = selectedGiftWrap ? (isLuxeMember ? 0 : selectedGiftWrap.price) : 0;
    
    const total = parseFloat((subtotal - totalProductDiscount + shippingCharge + codCharge + giftWrapPrice - couponDiscount).toFixed(2));
    
    const selectedAddr = user?.addresses?.[selectedAddress];

    const addresses = user?.addresses || [];
    const codBlockedForSelectedAddress = isCodBlockedForAddress(selectedAddr);

  useEffect(() => {
    if (selectedPayment === 'cod' && isCodBlockedForAddress(addresses[selectedAddress])) {
      toast.error('Cash on Delivery is not available in your area.');
      setSelectedPayment('');
    }
  }, [selectedAddress]);

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
            const newOrderId = response.data.order._id;
            setPlacedOrderId(newOrderId);
            setTimeout(() => {
                navigate(`/order-detail/${newOrderId}`);
            }, ORDER_SUCCESS_REDIRECT_DELAY_MS);
        } else {
            toast.error(response.data.message || "Failed to place order.");
        }
    } catch (error) {
        toast.error(error.response?.data?.message || "Failed to place order.");
    }
  }

  const handlePlaceOrder = async () => {
    if (isPlacingOrder) return;
    if (!selectedAddr || !selectedPayment || cartItems.length === 0) {
      toast.error('Please confirm your delivery address and payment method.');
      return;
    }

    if (total <= 0) {
      toast.error('Order amount must be greater than ₹0.');
      return;
    }

    if (!isAddressServiceable(addresses[selectedAddress])) {
      toast.error('This pincode is not currently serviceable.');
      return;
    }

    if (selectedPayment === 'cod' && isCodBlockedForAddress(addresses[selectedAddress])) {
      toast.error('Cash on Delivery is not available in your area.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      if (selectedPayment === 'cod') {
        await placeCodOrder();
      } else if (selectedPayment === 'card') {
        await handleRazorpayPayment();
      }
    } finally {
      setIsPlacingOrder(false);
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
          setIsVerifyingPayment(true);
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
              const newOrderId = order.receipt;
              setPlacedOrderId(newOrderId);
              setTimeout(() => {
                navigate(`/order-detail/${newOrderId}`);
              }, ORDER_SUCCESS_REDIRECT_DELAY_MS);
            } else {
              setIsVerifyingPayment(false);
              toast.error("Payment verification failed.");
            }
          } catch {
            setIsVerifyingPayment(false);
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
        modal: {
          ondismiss: function () {
            toast('Payment cancelled. Your order was not placed.', { icon: '⚠️' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment failed. Please try again.");
    }
  };

  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const canUseAddress = Boolean(selectedAddr) && isAddressServiceable(selectedAddr);
  const canReview = Boolean(selectedPayment) && !(selectedPayment === 'cod' && codBlockedForSelectedAddress);
  const panelStyle = 'min-w-0 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6';
  const primaryButton = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40';
  const inputStyle = 'min-h-12 w-full min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-base text-stone-900 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-100 sm:text-sm';
  const changeButton = 'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded px-1 text-xs font-semibold text-rose-700 hover:text-rose-900';

  if (loading) return (
    <main className="min-h-[65vh] bg-[#fcf9f7] px-4 py-12 sm:px-6" aria-busy="true">
      <div className="mx-auto max-w-6xl">
        <p role="status" className="mb-8 flex items-center gap-3 text-sm text-stone-600"><Loader2 size={18} aria-hidden="true" className="motion-safe:animate-spin" />Preparing your checkout…</p>
        <div aria-hidden="true" className="grid gap-6 motion-safe:animate-pulse lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-80 rounded-2xl border border-stone-200 bg-white" />
          <div className="h-96 rounded-2xl border border-stone-200 bg-white" />
        </div>
      </div>
    </main>
  );

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-[70vh] bg-[#fcf9f7] text-stone-900 [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-rose-500 [&_button:focus-visible]:ring-offset-2 [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-rose-500 [&_a:focus-visible]:ring-offset-2">
        <AnimatePresence>
          {placedOrderId ? <OrderPlacedOverlay key="order-placed" /> : isVerifyingPayment ? <VerifyingPaymentOverlay key="verifying-payment" /> : null}
        </AnimatePresence>
        <GiftWrapModal isOpen={isGiftWrapModalOpen} onClose={() => setIsGiftWrapModalOpen(false)} onSelect={handleSelectGiftWrap} />
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
          <Link to="/cart" className="mb-7 inline-flex min-h-11 items-center gap-2 rounded text-sm font-medium text-stone-600 transition-colors hover:text-rose-700">
            <ArrowLeft size={16} aria-hidden="true" /> Back to cart
          </Link>
          <header className="mb-7 sm:mb-9">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-700">Almost yours</p>
            <h1 className="text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">Checkout</h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">A few final details, then your favourites are on their way.</p>
          </header>

          {cartLoadError || cartItems.length === 0 ? (
            <div className={panelStyle + ' py-16 text-center sm:py-20'}>
              <ShoppingBag size={32} aria-hidden="true" className="mx-auto mb-5 text-rose-700" />
              <h2 className="text-2xl font-medium">{cartLoadError ? 'We couldn’t load your checkout' : 'Your cart is empty'}</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-stone-600">{cartLoadError ? 'Please refresh to try again. Your order has not been placed.' : 'Add something you love before continuing to checkout.'}</p>
              {cartLoadError
                ? <button type="button" className={primaryButton + ' mt-6'} onClick={() => window.location.reload()}>Retry checkout</button>
                : <Link to="/" className={primaryButton + ' mt-6'}>Continue Shopping <ArrowRight size={16} aria-hidden="true" /></Link>}
            </div>
          ) : (
            <>
              <nav aria-label="Checkout progress" className="mb-7 max-w-xl sm:mb-8">
                <ol className="flex items-center">
                  {['Address', 'Payment', 'Review'].map((label, index) => (
                    <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={'flex items-center ' + (index < 2 ? 'flex-1' : '')}>
                      {index + 1 < step ? (
                        <button type="button" onClick={() => setStep(index + 1)} className="flex min-h-11 items-center gap-2 rounded text-xs font-medium text-stone-800 sm:gap-3 sm:text-sm">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white sm:h-8 sm:w-8"><Check size={14} aria-hidden="true" /></span>
                          {label}<span className="sr-only">, completed; change {label.toLowerCase()}</span>
                        </button>
                      ) : (
                        <span className={'flex min-h-11 items-center gap-2 text-xs font-medium sm:gap-3 sm:text-sm ' + (step === index + 1 ? 'text-stone-900' : 'text-stone-500')}>
                          <span className={'flex h-7 w-7 items-center justify-center rounded-full border sm:h-8 sm:w-8 ' + (step === index + 1 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-stone-200 bg-white')}>{index + 1}</span>
                          {label}
                        </span>
                      )}
                      {index < 2 && <span aria-hidden="true" className={'mx-2 h-px flex-1 sm:mx-4 ' + (step > index + 1 ? 'bg-stone-400' : 'bg-stone-200')} />}
                    </li>
                  ))}
                </ol>
              </nav>

              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
                <div className="min-w-0 space-y-5">
                  <section aria-labelledby="delivery-heading" className={panelStyle}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <h2 id="delivery-heading" className="flex items-center gap-3 font-sans text-base font-semibold">
                        <MapPin size={19} strokeWidth={1.6} className="shrink-0 text-rose-700" aria-hidden="true" />Delivery Address
                      </h2>
                      {step > 1 && <button type="button" aria-label="Change delivery address" onClick={() => setStep(1)} className={changeButton}><Pencil size={13} aria-hidden="true" />Change</button>}
                    </div>
                    {step === 1 ? (showAddressForm ? (
                      <form onSubmit={handleAddAddress} className="space-y-5">
                        <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
                          <h3 className="font-sans text-sm font-semibold">{editingAddressId ? 'Update Address' : 'Add a new address'}</h3>
                          {addresses.length > 0 && <button type="button" onClick={() => { setShowAddressForm(false); clearAddressForm(); }} className={changeButton}>Cancel</button>}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <CheckoutField label="Full name"><input autoComplete="shipping name" placeholder="Full Name" value={addressName} onChange={e => setAddressName(e.target.value)} className={inputStyle} required /></CheckoutField>
                          <CheckoutField label="Phone number"><input type="tel" autoComplete="shipping tel" inputMode="tel" placeholder="Phone Number" value={addressPhone} onChange={e => setAddressPhone(e.target.value)} className={inputStyle} required pattern="[0-9]{10}" title="Phone number must be 10 digits." /></CheckoutField>
                          <CheckoutField label="House number & building" className="sm:col-span-2"><input autoComplete="shipping address-line1" placeholder="House No., Building Name" value={addressLine} onChange={e => setAddressLine(e.target.value)} className={inputStyle} required /></CheckoutField>
                          <CheckoutField label="Area & street" className="sm:col-span-2"><input autoComplete="shipping address-line2" placeholder="Road name, Area, Colony" value={addressLocality} onChange={e => setAddressLocality(e.target.value)} className={inputStyle} required /></CheckoutField>
                          <CheckoutField label="Landmark" optional><input placeholder="Nearby Landmark (Optional)" value={addressLandmark} onChange={e => setAddressLandmark(e.target.value)} className={inputStyle} /></CheckoutField>
                          <CheckoutField label="Alternate phone" optional><input type="tel" inputMode="tel" placeholder="Alt. Phone" value={addressAlternatePhone} onChange={e => setAddressAlternatePhone(e.target.value)} className={inputStyle} pattern="[0-9]{10}" title="Phone number must be 10 digits." /></CheckoutField>
                          <CheckoutField label="Pincode"><input inputMode="numeric" autoComplete="shipping postal-code" placeholder="ZIP Code" value={addressZip} onChange={e => setAddressZip(e.target.value)} className={inputStyle} required pattern="[0-9]{6}" title="Pincode must be 6 digits." /></CheckoutField>
                          <CheckoutField label="Country"><select autoComplete="shipping country-name" value={addressCountry} onChange={e => setAddressCountry(e.target.value)} className={inputStyle}>{countries.map(country => <option key={country}>{country}</option>)}</select></CheckoutField>
                          <CheckoutField label="State"><input autoComplete="shipping address-level1" placeholder="State" value={addressState} onChange={e => { setAddressState(e.target.value); setAddressCity(''); }} className={inputStyle} required /></CheckoutField>
                          <CheckoutField label="City"><input autoComplete="shipping address-level2" placeholder="City" value={addressCity} onChange={e => setAddressCity(e.target.value)} className={inputStyle} required /></CheckoutField>
                        </div>
                        {isPincodeLoading && <p role="status" className="flex items-center gap-2 text-xs text-stone-600"><Loader2 size={14} aria-hidden="true" className="motion-safe:animate-spin" />Looking up your city and state…</p>}
                        <fieldset>
                          <legend className="mb-3 text-sm font-medium">Address type</legend>
                          <div className="flex flex-wrap gap-3">
                            {['Home', 'Business', 'Other'].map(type => (
                              <label key={type} className={'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ' + (addressType === type ? 'border-rose-200 bg-rose-50/70' : 'border-stone-200')}>
                                <input type="radio" name="addressType" value={type} checked={addressType === type} onChange={e => setAddressType(e.target.value)} className="h-4 w-4 accent-rose-700" />{type}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        <div className="rounded-xl border border-stone-200">
                          <button type="button" aria-expanded={isWeekendAccordionOpen} aria-controls="weekend-options" onClick={() => setIsWeekendAccordionOpen(!isWeekendAccordionOpen)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium">
                            Weekend deliveries <ChevronDown size={16} aria-hidden="true" className={'shrink-0 transition-transform ' + (isWeekendAccordionOpen ? 'rotate-180' : '')} />
                          </button>
                          {isWeekendAccordionOpen && <div id="weekend-options" className="border-t border-stone-100 px-4 py-3">
                            <p className="mb-2 text-xs leading-5 text-stone-500">Choose the days you can receive deliveries.</p>
                            <div className="flex flex-wrap gap-x-6">
                              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={saturdayDelivery} onChange={e => setSaturdayDelivery(e.target.checked)} className="h-4 w-4 accent-rose-700" />Saturdays</label>
                              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={sundayDelivery} onChange={e => setSundayDelivery(e.target.checked)} className="h-4 w-4 accent-rose-700" />Sundays</label>
                            </div>
                          </div>}
                        </div>
                        <button type="submit" disabled={isSavingAddress || isPincodeLoading} className={primaryButton + ' w-full'}>{isSavingAddress ? 'Saving address…' : editingAddressId ? 'Update Address' : 'Save Address'}<ArrowRight size={16} aria-hidden="true" /></button>
                      </form>
                    ) : (
                      <div className="space-y-3">
                        <fieldset className="space-y-3">
                          <legend className="sr-only">Choose a delivery address</legend>
                          {addresses.map((addr, index) => {
                            const available = isAddressServiceable(addr);
                            return (
                              <div key={addr._id} className={'rounded-xl border p-4 transition-colors ' + (!available ? 'border-stone-200 bg-stone-50' : selectedAddress === index ? 'border-rose-300 bg-rose-50/50' : 'border-stone-200')}>
                                <label className={'flex items-start gap-3 ' + (available ? 'cursor-pointer' : 'cursor-not-allowed')}>
                                  <input type="radio" name="deliveryAddress" checked={selectedAddress === index} disabled={!available} onChange={() => setSelectedAddress(index)} aria-label={'Deliver to ' + addr.name + ', ' + addr.address} className="mt-1 h-4 w-4 shrink-0 accent-rose-700" />
                                  <AddressDetails address={addr} />
                                </label>
                                <div className="ml-7 mt-2 flex flex-wrap items-center justify-between gap-2">
                                  <p className={'text-xs ' + (available ? 'text-stone-500' : 'text-amber-800')}>{available ? (selectedAddress === index ? 'Selected for delivery' : '') : 'Delivery is not available at this address.'}</p>
                                  <button type="button" aria-label={'Edit address for ' + addr.name} onClick={() => handleEditAddress(addr)} className={changeButton}><Pencil size={13} aria-hidden="true" />Edit</button>
                                </div>
                              </div>
                            );
                          })}
                        </fieldset>
                        <button type="button" onClick={() => { clearAddressForm(); setShowAddressForm(true); }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm font-medium text-stone-600 hover:border-rose-400 hover:text-rose-700"><Plus size={16} aria-hidden="true" />Add a new address</button>
                        <button type="button" disabled={!canUseAddress} onClick={() => setStep(2)} className={primaryButton + ' w-full'}>Use this address<ArrowRight size={16} aria-hidden="true" /></button>
                      </div>
                    )) : selectedAddr && <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4"><AddressDetails address={selectedAddr} /></div>}
                  </section>

                  <section aria-labelledby="payment-heading" className={panelStyle}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 id="payment-heading" className="flex items-center gap-3 font-sans text-base font-semibold"><CreditCard size={19} strokeWidth={1.6} className="shrink-0 text-rose-700" aria-hidden="true" />Payment Method</h2>
                      {step > 2 && <button type="button" aria-label="Change payment method" onClick={() => setStep(2)} className={changeButton}><Pencil size={13} aria-hidden="true" />Change</button>}
                    </div>
                    {step === 1 ? <p className="mt-3 text-sm leading-6 text-stone-500">Confirm your delivery address to see payment options.</p> : step === 2 ? (
                      <div className="mt-5 space-y-4">
                        {bestPrepaidOffer && <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"><Tag size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><p>Save {formatDiscount(bestPrepaidOffer)} with <span className="font-semibold">{bestPrepaidOffer.code}</span> on eligible online orders. We’ll check the offer when you select online payment.</p></div>}
                        <fieldset className="space-y-3">
                          <legend className="sr-only">Choose a payment method</legend>
                          <label className={'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ' + (selectedPayment === 'card' ? 'border-rose-300 bg-rose-50/50' : 'border-stone-200 hover:border-rose-200')}>
                            <input type="radio" name="paymentMethod" value="card" checked={selectedPayment === 'card'} onChange={() => setSelectedPayment('card')} className="mt-1 h-4 w-4 shrink-0 accent-rose-700" />
                            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">UPI / Net Banking / Card</span><span className="mt-1 block text-xs leading-5 text-stone-500">Choose your preferred option with Razorpay.</span></span>
                            <CreditCard size={19} strokeWidth={1.5} className="mt-0.5 shrink-0 text-stone-500" aria-hidden="true" />
                          </label>
                          <label className={'flex items-start gap-3 rounded-xl border p-4 transition-colors ' + (codBlockedForSelectedAddress ? 'cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400' : selectedPayment === 'cod' ? 'cursor-pointer border-rose-300 bg-rose-50/50' : 'cursor-pointer border-stone-200 hover:border-rose-200')}>
                            <input type="radio" name="paymentMethod" value="cod" checked={selectedPayment === 'cod'} disabled={codBlockedForSelectedAddress} onChange={() => setSelectedPayment('cod')} className="mt-1 h-4 w-4 shrink-0 accent-rose-700" />
                            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Cash on Delivery</span><span className="mt-1 block text-xs leading-5 text-stone-500">{codBlockedForSelectedAddress ? 'Not available for this delivery address.' : 'Pay when your order arrives. COD charges are shown in your summary.'}</span></span>
                            <Banknote size={19} strokeWidth={1.5} className="mt-0.5 shrink-0 text-stone-500" aria-hidden="true" />
                          </label>
                        </fieldset>
                        <button type="button" disabled={!canReview} onClick={() => setStep(3)} className={primaryButton + ' w-full'}>Continue<ArrowRight size={16} aria-hidden="true" /></button>
                      </div>
                    ) : (
                      <div className="mt-5 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                        {selectedPayment === 'card' ? <CreditCard size={20} className="shrink-0 text-stone-500" aria-hidden="true" /> : <Banknote size={20} className="shrink-0 text-stone-500" aria-hidden="true" />}
                        <div><p className="text-sm font-semibold">{selectedPayment === 'card' ? 'UPI / Net Banking / Card' : selectedPayment === 'cod' ? 'Cash on Delivery' : 'Choose a payment method'}</p><p className="mt-1 text-xs text-stone-500">{selectedPayment === 'card' ? 'Continue to Razorpay after placing your order.' : selectedPayment === 'cod' ? 'Payment collected on delivery.' : 'Return to payment to continue.'}</p></div>
                      </div>
                    )}
                  </section>

                  <CouponCodeInput items={cartItemsForCoupon} onCouponApply={handleCouponApply} selectedPayment={selectedPayment} appliedCoupon={appliedCoupon} />

                  <section aria-labelledby="gift-heading" className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <Gift size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-rose-700" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <h2 id="gift-heading" className="font-sans text-sm font-semibold">{selectedGiftWrap ? 'The finishing touch' : 'Make it a gift'}</h2>
                        <p className="mt-1 break-words text-xs leading-5 text-stone-600">{selectedGiftWrap ? selectedGiftWrap.name : 'Add a gift wrap and a personal message to your order.'}</p>
                        {selectedGiftWrap?.message && <p className="mt-2 break-words text-xs italic leading-5 text-stone-600">“{selectedGiftWrap.message}”</p>}
                        {selectedGiftWrap && <p className="mt-2 text-xs font-semibold text-rose-800">{giftWrapPrice === 0 ? 'Complimentary' : '₹' + giftWrapPrice.toFixed(2)}</p>}
                      </div>
                      {selectedGiftWrap ? <button type="button" aria-label="Remove gift wrap" onClick={() => setSelectedGiftWrap(null)} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-white hover:text-rose-700"><X size={17} aria-hidden="true" /></button> : null}
                    </div>
                    <button type="button" onClick={() => setIsGiftWrapModalOpen(true)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50"><Plus size={14} aria-hidden="true" />{selectedGiftWrap ? 'Change gift wrap' : 'Add gift wrap'}</button>
                  </section>

                  {step === 3 && <section aria-labelledby="review-heading" className={panelStyle}>
                    <h2 id="review-heading" className="flex items-center gap-3 font-sans text-base font-semibold"><Check size={19} className="shrink-0 text-emerald-700" aria-hidden="true" />Ready to place your order</h2>
                    <p className="mt-3 text-sm leading-6 text-stone-600">Review your items, delivery address and total. {selectedPayment === 'card' ? 'You’ll choose your UPI, card or bank details in Razorpay.' : 'Your selected address will be used for delivery.'}</p>
                    <Link to="/cart" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded text-sm font-medium text-rose-700"><Pencil size={14} aria-hidden="true" />Edit items in cart</Link>
                  </section>}
                </div>

                <aside aria-labelledby="order-summary-heading" className="min-w-0 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_30px_-16px_rgba(62,37,29,0.15)] lg:sticky lg:top-40">
                  <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-5 sm:px-6">
                    <h2 id="order-summary-heading" className="font-sans text-base font-semibold">Order Summary</h2>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                  </div>
                  <div className="max-h-80 space-y-5 overflow-y-auto border-b border-stone-100 p-5 sm:p-6" tabIndex={0} role="region" aria-label="Items in your order">
                    {cartItems.map(item => {
                      const variation = item.variations?.find(v => v.color === item.color);
                      const price = item.price ?? variation?.sizes?.find(s => s.size === item.size)?.price ?? 0;
                      const image = item.image || variation?.images?.[0] || item.variations?.[0]?.images?.[0];
                      return (
                        <div key={item._id + item.size + item.color} className="flex items-start gap-3">
                          {image ? <img src={image} alt={item.name} className="h-20 w-16 shrink-0 rounded-lg bg-stone-50 object-cover object-top" /> : <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-50 text-stone-400"><ShoppingBag size={22} aria-hidden="true" /></div>}
                          <div className="min-w-0 flex-1">
                            <Link to={'/product/' + item._id} className="break-words rounded text-sm font-medium leading-5 hover:text-rose-700">{item.name}</Link>
                            <p className="mt-1 break-words text-xs leading-5 text-stone-500">{item.color} / {item.size} · Qty: {item.quantity}</p>
                            <p className="mt-1 text-sm font-semibold tabular-nums">₹{(price * item.quantity).toFixed(2)}</p>
                            {item.appliedCoupon && <p className="mt-1 break-words text-[11px] leading-4 text-emerald-700">{item.appliedCoupon} · Save ₹{(item.discountAmount || 0).toFixed(2)}</p>}
                            {item.couponMessage && <p className="mt-1 text-xs leading-5 text-amber-800">{item.couponMessage}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="space-y-4 text-sm tabular-nums">
                      <div className="flex flex-wrap justify-between gap-2 text-stone-600"><span>Subtotal</span><span className="font-medium text-stone-900">₹{subtotal.toFixed(2)}</span></div>
                      {(totalProductDiscount + couponDiscount) > 0 && <div className="flex flex-wrap justify-between gap-2 text-emerald-700"><span>Coupon Discount</span><span className="font-medium">− ₹{(totalProductDiscount + couponDiscount).toFixed(2)}</span></div>}
                      <div className="flex flex-wrap justify-between gap-2 text-stone-600"><span>Shipping</span><span className={shippingCharge > 0 ? 'font-medium text-stone-900' : 'font-medium text-emerald-700'}>{shippingCharge > 0 ? '₹' + shippingCharge.toFixed(2) : 'Free'}</span></div>
                      {codCharge > 0 && <div className="flex flex-wrap justify-between gap-2 text-stone-600"><span>COD Charges</span><span className="font-medium text-stone-900">₹{codCharge.toFixed(2)}</span></div>}
                      {selectedGiftWrap && <div className="flex flex-wrap justify-between gap-2 text-stone-600"><span>Gift Wrap</span><span className="font-medium text-stone-900">{giftWrapPrice === 0 ? 'Free' : '₹' + giftWrapPrice.toFixed(2)}</span></div>}
                      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-stone-200 pt-5"><span className="text-base font-semibold">Total</span><span aria-label="Order total" className="text-2xl font-semibold tracking-tight">₹{total.toFixed(2)}</span></div>
                    </div>
                    <p className="mt-1 text-right text-xs text-stone-500">Including taxes</p>
                    {(totalProductDiscount + couponDiscount) > 0 && <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-emerald-700"><Check size={15} className="mt-0.5 shrink-0" aria-hidden="true" />You’re saving ₹{(totalProductDiscount + couponDiscount).toFixed(2)} with coupons</p>}
                    {step === 3 ? <>
                      <button type="button" onClick={handlePlaceOrder} disabled={isPlacingOrder || !canUseAddress || !canReview || total <= 0} className={primaryButton + ' mt-6 min-h-14 w-full'}>
                        {isPlacingOrder ? <><Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />Placing Order...</> : <>Place Order<ArrowRight size={17} aria-hidden="true" /></>}
                      </button>
                      <p className="mt-3 text-center text-xs leading-5 text-stone-500">{selectedPayment === 'card' ? 'Your payment opens in Razorpay.' : 'Pay when your order arrives.'}</p>
                    </> : <p className="mt-5 rounded-lg bg-stone-50 px-3 py-3 text-xs leading-5 text-stone-600">{step === 1 ? 'Confirm your address, then choose a payment method to place your order.' : 'Continue to review your order. Delivery charges reflect your selected payment method.'}</p>}
                  </div>
                  <div className="flex items-start gap-3 border-t border-stone-100 bg-stone-50/80 px-5 py-4 sm:px-6">
                    <LockKeyhole size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-stone-500" aria-hidden="true" /><p className="text-xs leading-5 text-stone-600">Online payments are processed through Razorpay.</p>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </MotionConfig>
  );
}
