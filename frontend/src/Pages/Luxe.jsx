import React, { useState, useEffect } from "react";
import useAuthStore from "../store/authStore";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaCrown, FaBusAlt, FaCheckCircle, FaStar, FaShieldAlt } from "react-icons/fa";
import ProductCard from "../components/ProductCard";
import Loader from "../components/Loader";

export default function FebeulLuxe() {
  const { user, token, isAuthenticated, getProfile } = useAuthStore();
  const [razorpayKey, setRazorpayKey] = useState("");
  const navigate = useNavigate();
  const [showPromo, setShowPromo] = useState(true);
  const [siteSettings, setSiteSettings] = useState({ 
    membershipPrice: 129, 
    membershipPriceOriginal: 152 
  });

  const [luxeProducts, setLuxeProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cms/siteSettings`);
        if (response.data.success) {
          setSiteSettings(response.data.content);
        }
      } catch (error) {
        console.error("Error fetching site settings:", error);
      }
    };
    fetchSiteSettings();
  }, []);

  const fetchLuxePriveProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/product/list?isLuxePrive=true`,
        { headers: { token } }
      );
      if (response.data.success) {
        setLuxeProducts(response.data.products);
      }
    } catch (error) {
      console.error("Failed to fetch Luxe Prive products", error);
    } finally {
      setTimeout(() => {
        setLoadingProducts(false);
      }, 2000);
    }
  };

  useEffect(() => {
    const fetchRazorpayKey = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/order/get-key`);
        if (response.data.success) {
          setRazorpayKey(response.data.key);
        }
      } catch (error) {
        console.error("Failed to fetch razorpay key", error);
      }
    };
    fetchRazorpayKey();

    if (isAuthenticated && user?.isLuxeMember) {
      fetchLuxePriveProducts();
    } else {
        setLoadingProducts(false);
    }
  }, [isAuthenticated, user?.isLuxeMember, token]);

  const handlePayment = async () => {
    if (!isAuthenticated) {
      alert("Please login to purchase the membership.");
      return;
    }

    const amount = siteSettings.membershipPrice || 129;
    const items = [
      {
        productId: "60d5ecb8b3b1c8e1e8e8e8e8",
        name: "Febeul Luxe Membership",
        price: amount,
        quantity: 1,
        description: "1 Month Febeul Luxe Membership",
      },
    ];
    const address = {
      street: "123 Luxe Lane",
      city: "Febeul",
      state: "Online",
      zip: "00000",
      country: "India",
    };

    try {
      const orderResponse = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/order/razorpay`,
        {
          userId: user._id,
          items,
          amount,
          address,
          currency: "INR",
        },
        { headers: { token } }
      );

      if (!orderResponse.data.success) {
        throw new Error("Order creation failed");
      }

      const { order } = orderResponse.data;

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "Febeul",
        description: "Febeul Luxe Membership",
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyResponse = await axios.post(
              `${import.meta.env.VITE_BACKEND_URL}/api/order/verifyRazorpay`,
              {
                userId: user._id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: { token } }
            );

            if (verifyResponse.data.success) {
              alert("Payment successful! Welcome to Febeul Luxe.");
              await getProfile();
              navigate('/PrimeMember');
            } else {
              alert("Payment verification failed. Please contact support.");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.mobile,
        },
        notes: {
          address: "Febeul Luxe Digital Membership",
        },
        theme: {
          color: "#b87a7b",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment failed", error);
      alert("Payment failed. Please try again.");
    }
  };

  if (isAuthenticated && user?.isLuxeMember) {
    return (
      <section className="w-full bg-[#fdf5f5] py-12 px-6 min-h-screen">
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;0,700;1,400&family=Raleway:wght@200;300;400;700&display=swap');
        `}</style>
        {loadingProducts && <Loader />}
        <div className="text-center mb-10 flex flex-col items-center gap-4">
          <p className="font-['Raleway'] tracking-[0.5em] text-[#c98a8b] uppercase text-xs">Member Exclusive</p>
          <h1 className="text-5xl font-['Cormorant_Garamond'] font-bold text-[#b87a7b] italic">LUXE PRIVE SALE</h1>
        </div>

        {luxeProducts.length > 0 ? (
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {luxeProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : !loadingProducts && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-['Cormorant_Garamond'] font-bold text-[#b87a7b] mb-2 italic">New Arrivals Coming Soon</h2>
            <p className="text-[#c98a8b] font-['Raleway'] text-sm">Check back later for your exclusive Luxe Prive collection.</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="w-full bg-[#fdf5f5] py-12 px-6 min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;0,700;1,400&family=Raleway:wght@200;300;400;700&display=swap');
      `}</style>
      
      <div className="text-center mb-12 flex flex-col items-center gap-4">
        <Link to="/">
          <img src="/removebgLogo.png" alt="Febeul Logo" className="h-16 w-auto" />
        </Link>
        <div className="space-y-1">
          <p className="font-['Raleway'] tracking-[0.5em] text-[#c98a8b] uppercase text-xs font-light">Experience The Elite</p>
          <h1 className="text-5xl md:text-6xl font-['Cormorant_Garamond'] font-bold text-[#b87a7b] italic">Luxe Membership</h1>
        </div>
      </div>

      {/* Promo Banner */}
      <AnimatePresence>
        {showPromo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto rounded-2xl overflow-hidden mb-12 shadow-sm"
          >
            <div className="bg-[#b87a7b] text-white py-4 px-8 relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FaCrown className="text-2xl text-yellow-300" />
                <div>
                  <p className="font-['Raleway'] font-bold text-sm tracking-widest uppercase">Join Febeul Luxe Today</p>
                  <p className="text-xs font-light opacity-90 font-['Raleway']">Unlock exclusive sales and premium benefits instantly.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPromo(false)}
                className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8 text-center mb-16">
        {[
          { img: "/2.png", title: "PRIORITY DELIVERY", desc: "Fast-track shipping on every order" },
          { img: "/1.png", title: "15 GIFT WRAPS", desc: "Premium packaging for your loved ones" },
          { img: "/3.png", title: "LUXE PRIVE SALES", desc: "Exclusive access to boutique collections" },
          { img: "/4.png", title: "EXCLUSIVE COUPONS", desc: "Vouchers included with every purchase" },
          { img: "/5.png", title: "VIP SUPPORT", desc: "Dedicated concierge for all your needs" },
          { img: "/6.png", title: "FREE SHIPPING", desc: "Zero delivery charges, nationwide" }
        ].map((feature, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="h-24 flex items-center justify-center mb-4">
              <img src={feature.img} alt={feature.title} className="max-h-full w-auto hover:scale-110 transition-transform duration-500" />
            </div>
            <h3 className="font-['Raleway'] font-bold text-xs tracking-[0.2em] text-[#b87a7b] uppercase mb-2">{feature.title}</h3>
            <p className="text-[10px] text-[#c98a8b] font-['Raleway'] uppercase tracking-wider">{feature.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Bottom Card */}
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-[0_20px_50px_rgba(249,174,175,0.2)] border border-[#f9aeaf]/20 px-8 py-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#f9aeaf] via-[#e07f82] to-[#f9aeaf]" />
        
        <div className="mb-6">
            <span className="font-['Raleway'] tracking-widest text-[#c98a8b] uppercase text-[10px] font-bold">Limited Time Offer</span>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="text-[#c98a8b] line-through text-xl font-light">₹{siteSettings.membershipPriceOriginal}</span>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[#b87a7b] font-['Cormorant_Garamond'] font-bold text-5xl">₹{siteSettings.membershipPrice}</span>
            <span className="text-[10px] text-[#c98a8b] font-['Raleway'] font-bold uppercase tracking-tighter mt-1">Per Month</span>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={!isAuthenticated}
          className="w-full bg-[#b87a7b] hover:bg-[#a66b6c] transition-all text-white font-['Raleway'] font-bold tracking-widest py-4 rounded-2xl shadow-lg disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed uppercase text-sm"
        >
          {isAuthenticated ? "Become a Member" : "Login to Join"}
        </button>

        <div className="mt-8 pt-8 border-t border-gray-50 flex flex-col gap-4">
            <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-1.5 text-[9px] text-[#c98a8b] font-bold uppercase">
                    <FaCheckCircle className="text-[#e07f82]" /> Secure SSL
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-[#c98a8b] font-bold uppercase">
                    <FaShieldAlt className="text-[#e07f82]" /> Safe Payment
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-[#c98a8b] font-bold uppercase">
                    <FaStar className="text-[#e07f82]" /> VIP Perks
                </div>
            </div>
            <p className="text-[9px] text-[#c98a8b] opacity-60 leading-relaxed italic">
                Membership benefits active for 30 days from purchase. Auto-renewal not active.
            </p>
        </div>
      </div>

    </section>
  );
}
