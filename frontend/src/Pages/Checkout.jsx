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
  FaTimes,
  FaSearch,
  FaChevronDown
} from 'react-icons/fa';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import GiftWrapModal from '../components/GiftWrapModal';
import CouponCodeInput from '../components/CouponCodeInput';
import CouponShows from '../components/CouponShows';

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

export default function CheckoutPage() {
  const { user, token, isAuthenticated, getProfile, siteSettings, fetchSiteSettings } = useAuthStore();
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

  useEffect(() => {
    fetchSiteSettings();
  }, []);

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

  // Searchable Country States
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = React.useRef(null);

  const filteredCountries = countries.filter(c => 
      c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
      const handleClickOutside = (event) => {
          if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
              setIsCountryDropdownOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  }, [addressZip, addressCountry]);

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

  const handleCountrySelect = (c) => {
    setAddressCountry(c);
    setCountrySearch("");
    setIsCountryDropdownOpen(false);
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
    } catch (error) {
        toast.error(editingAddressId ? "Failed to update address." : "Failed to add address.");
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
    if (selectedPayment !== 'cod' && !user?.isLuxeMember && (subtotal - totalProductDiscount) < (siteSettings.shippingThreshold || 499)) {
        shippingCharge = siteSettings.defaultShippingCharge || 50.00;
    }

    const codCharge = selectedPayment === 'cod' ? (siteSettings.codCharge || 50.00) : 0;
    
    const giftWrapPrice = selectedGiftWrap ? (isLuxeMember ? 0 : selectedGiftWrap.price) : 0;
    
    const discountedAmount = subtotal - totalProductDiscount - couponDiscount;
    const total = parseFloat((subtotal - totalProductDiscount + shippingCharge + codCharge + giftWrapPrice - couponDiscount).toFixed(2));
    
    // GST Breakdown Calculation (Inclusive 5%) - Now excludes shipping/cod
    const selectedAddr = user?.addresses?.[selectedAddress];
    const isDelhi = selectedAddr?.state?.trim().toLowerCase() === 'delhi';
    const taxableValue = discountedAmount / 1.05;
    const totalGst = discountedAmount - taxableValue;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const igst = totalGst;

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
                        <div className="flex items-center justify-between">
                            <h3 className='font-semibold text-lg'>{editingAddressId ? 'Update Address' : 'Add a new address'}</h3>
                            <button 
                                type="button" 
                                onClick={() => { setShowAddressForm(false); clearAddressForm(); }}
                                className="text-gray-500 hover:text-gray-700 flex items-center text-sm"
                            >
                                <FaTimes className="mr-1" /> Back
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="text" placeholder="Full Name" value={addressName} onChange={e => setAddressName(e.target.value)} className="w-full p-2 border rounded" required />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="tel" placeholder="Phone Number" value={addressPhone} onChange={e => setAddressPhone(e.target.value)} className="w-full p-2 border rounded" required pattern="[0-9]{10}" title="Phone number must be 10 digits." />
                            <input type="tel" placeholder="Alt. Phone" value={addressAlternatePhone} onChange={e => setAddressAlternatePhone(e.target.value)} className="w-full p-2 border rounded" pattern="[0-9]{10}" title="Phone number must be 10 digits." />
                          </div>
                        </div>
                        <input type="text" placeholder="House No., Building Name" value={addressLine} onChange={e => setAddressLine(e.target.value)} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Road name, Area, Colony" value={addressLocality} onChange={e => setAddressLocality(e.target.value)} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Nearby Landmark (Optional)" value={addressLandmark} onChange={e => setAddressLandmark(e.target.value)} className="w-full p-2 border rounded" />
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <input type="text" placeholder="ZIP Code" value={addressZip} onChange={e => setAddressZip(e.target.value)} className="w-full p-2 border rounded" required pattern="[0-9]{6}" title="ZIP Code must be 6 digits." />
                            
                            {/* Searchable Country Dropdown */}
                            <div className="relative" ref={countryDropdownRef}>
                                <div 
                                    className="w-full p-2 border rounded flex items-center justify-between cursor-pointer bg-white"
                                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                >
                                    <span className="truncate">{addressCountry || "Select Country"}</span>
                                    <FaChevronDown size={14} className={`transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''} text-gray-400`} />
                                </div>

                                {isCountryDropdownOpen && (
                                    <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-gray-300 rounded-lg shadow-xl z-[60] overflow-hidden flex flex-col max-h-60">
                                        <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
                                            <FaSearch size={12} className="text-gray-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search country..." 
                                                className="bg-transparent border-none outline-none text-sm w-full"
                                                value={countrySearch}
                                                onChange={(e) => setCountrySearch(e.target.value)}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="overflow-y-auto flex-1">
                                            {filteredCountries.length > 0 ? (
                                                filteredCountries.map((c) => (
                                                    <div 
                                                        key={c} 
                                                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-pink-50 transition-colors ${addressCountry === c ? 'bg-pink-100 text-pink-700 font-medium' : ''}`}
                                                        onClick={() => handleCountrySelect(c)}
                                                    >
                                                        {c}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-sm text-gray-500">No country found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                            {/* State Input */}
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="State" 
                                    value={addressState} 
                                    onChange={e => { setAddressState(e.target.value); setAddressCity(''); }} 
                                    required 
                                    className="w-full p-2 border rounded" 
                                />
                            </div>

                            {/* City Input */}
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="City" 
                                    value={addressCity} 
                                    onChange={e => setAddressCity(e.target.value)} 
                                    required 
                                    className="w-full p-2 border rounded" 
                                />
                            </div>
                        </div>

                        <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address Type</label>
                            <div className="flex gap-4">
                                {['Home', 'Business', 'Other'].map((type) => (
                                    <label key={type} className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="addressType"
                                            value={type}
                                            checked={addressType === type}
                                            onChange={e => setAddressType(e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                                            addressType === type 
                                                ? 'bg-[#e8767a] border-[#e8767a] text-white' 
                                                : 'bg-white border-gray-300 text-gray-700 hover:border-[#e8767a]'
                                        }`}>
                                            {type === 'Home' ? 'House/Apartment' : type}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 border rounded-lg overflow-hidden">
                            <button 
                                type="button"
                                onClick={() => setIsWeekendAccordionOpen(!isWeekendAccordionOpen)}
                                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="text-left">
                                    <label className="block text-sm font-bold text-gray-700">Weekend Deliveries</label>
                                    <p className="text-[10px] text-gray-500">Can you receive deliveries at this address on weekends?</p>
                                </div>
                                <FaChevronDown size={14} className={`text-gray-400 transition-transform ${isWeekendAccordionOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isWeekendAccordionOpen && (
                                <div className="p-3 bg-white border-t space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between p-2.5 border rounded-lg bg-gray-50/50">
                                            <span className="text-xs font-medium text-gray-700">Saturdays</span>
                                            <div className="flex bg-white rounded-md border p-1 shadow-sm">
                                                <button 
                                                    type="button"
                                                    onClick={() => setSaturdayDelivery(true)}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${saturdayDelivery ? 'bg-[#e8767a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    YES
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setSaturdayDelivery(false)}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${!saturdayDelivery ? 'bg-[#e8767a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    NO
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-2.5 border rounded-lg bg-gray-50/50">
                                            <span className="text-xs font-medium text-gray-700">Sundays</span>
                                            <div className="flex bg-white rounded-md border p-1 shadow-sm">
                                                <button 
                                                    type="button"
                                                    onClick={() => setSundayDelivery(true)}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${sundayDelivery ? 'bg-[#e8767a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    YES
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setSundayDelivery(false)}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${!sundayDelivery ? 'bg-[#e8767a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    NO
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button type="submit" className="w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 px-6 rounded-lg transition-colors mt-4">{editingAddressId ? 'Update Address' : 'Save Address'}</button>
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
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-800">{addr.name}</p>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full uppercase font-bold border">
                                {addr.addressType === 'Home' ? 'House/Apartment' : addr.addressType}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{addr.address}, {addr.locality}</p>
                          {addr.landmark && <p className="text-gray-500 text-xs italic">Landmark: {addr.landmark}</p>}
                          <p className="text-gray-600 text-sm">{addr.zip}, {addr.city}</p>
                          <p className="text-gray-600 text-sm">{addr.state}, {addr.country}</p>
                          <p className="text-gray-600 text-sm mt-1">Phone: {addr.phone}{addr.alternatePhone ? `, ${addr.alternatePhone}` : ''}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {selectedAddress === idx && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-6 h-6 bg-[#e8767a] rounded-full flex items-center justify-center"
                            >
                                <FaCheck className="text-white text-xs" />
                            </motion.div>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleEditAddress(addr); }}
                                className="text-[#e8767a] hover:text-[#d5666a] text-xs font-semibold underline"
                            >
                                Edit
                            </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <button onClick={() => { clearAddressForm(); setShowAddressForm(true); }} className="text-blue-600 mt-2">Add a new address</button>
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
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-800">{addresses[selectedAddress].name}</p>
                    <span className="px-2 py-0.5 bg-white text-[#e8767a] text-[10px] rounded-full uppercase font-bold border border-[#e8767a]">
                        {addresses[selectedAddress].addressType === 'Home' ? 'House/Apartment' : addresses[selectedAddress].addressType}
                    </span>                  </div>
                  <p className="text-gray-600 text-sm">{addresses[selectedAddress].address}, {addresses[selectedAddress].locality}</p>
                  {addresses[selectedAddress].landmark && <p className="text-gray-500 text-xs italic">Landmark: {addresses[selectedAddress].landmark}</p>}
                  <p className="text-gray-600 text-sm">{addresses[selectedAddress].zip}, {addresses[selectedAddress].city}</p>
                  <p className="text-gray-600 text-sm">{addresses[selectedAddress].state}, {addresses[selectedAddress].country}</p>
                  <p className="text-gray-600 text-sm mt-1">Phone: {addresses[selectedAddress].phone}{addresses[selectedAddress].alternatePhone ? `, ${addresses[selectedAddress].alternatePhone}` : ''}</p>
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

              {/* Coupon Application Logic */}
              {(() => {
                const cartItemsForCoupon = cartItems.map((item) => {
                    const selectedVariation = item.variations?.find(v => v.color === item.color);
                    const itemPrice = selectedVariation?.sizes?.find(s => s.size === item.size)?.price;
                    return {
                        sku: selectedVariation?.sku,
                        price: item.price || itemPrice || 0,
                        quantity: item.quantity
                    };
                });
                const productSKUs = [...new Set(cartItemsForCoupon.map(i => i.sku).filter(Boolean))];

                const handleRedeem = async (code) => {
                  try {
                      const response = await axios.post(`${backendUrl}/api/coupon/apply`, 
                          { code, items: cartItemsForCoupon, userId: user?._id },
                          { headers: { token } }
                      );
                      if (response.data.success) {
                          toast.success(response.data.message);
                          handleCouponApply(response.data);
                      } else {
                          toast.error(response.data.message);
                      }
                  } catch (error) {
                      toast.error(error.response?.data?.message || 'Failed to apply coupon.');
                  }
                };

                return (
                  <>
                    <CouponCodeInput items={cartItemsForCoupon} onCouponApply={handleCouponApply} selectedPayment={selectedPayment} />
                    <div className="mt-4 border-t pt-4">
                      <CouponShows productSKUs={productSKUs} onRedeem={handleRedeem} appliedCoupon={appliedCoupon} />
                    </div>
                  </>
                );
              })()}


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
                
                {/* <div className="flex justify-between text-gray-600">
                  <span>Taxable Value</span>
                  <span>₹{taxableValue.toFixed(2)}</span>
                </div> */}
                {/* {isDelhi ? (
                  <>
                    <div className="flex justify-between text-gray-500 text-xs">
                      <span>CGST (2.5%)</span>
                      <span>₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-xs">
                      <span>SGST (2.5%)</span>
                      <span>₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>IGST (5%)</span>
                    <span>₹{igst.toFixed(2)}</span>
                  </div>
                )} */}
                
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