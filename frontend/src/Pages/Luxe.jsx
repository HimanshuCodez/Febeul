import React, { useState, useEffect } from "react";
import useAuthStore from "../store/authStore";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaCrown, FaBusAlt } from "react-icons/fa"; // Add FaCrown

export default function FebeulLuxe() {
  const { user, token, isAuthenticated, getProfile } = useAuthStore();
  const [razorpayKey, setRazorpayKey] = useState("");
  const navigate = useNavigate();
  const [showPromo, setShowPromo] = useState(true); // Add this

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
  }, []);

  const handlePayment = async () => {
    if (!isAuthenticated) {
      alert("Please login to purchase the membership.");
      return;
    }

    const amount = 129;
    const items = [
      {
        name: "Febeul Luxe Membership",
        price: amount,
        quantity: 1,
        description: "1 Month Febeul Luxe Membership",
      },
    ];
    // Using a dummy address as it is required by the backend order schema
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
              await getProfile(); // Refresh user profile to get new membership status
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
          color: "#E11D48",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment failed", error);
      alert("Payment failed. Please try again.");
    }
  };

  return (
    <section className="w-full bg-[#f8b7b7] py-12 px-6">
      
      <div className="text-center mb-10 flex items-center justify-center gap-2">
        <Link to="/">
          <img src="/removebgLogo.png" alt="Febeul Logo" className="h-12 w-auto" />
        </Link>
        <h1 className="text-4xl font-serif text-black">LUXE</h1>
      </div>

      {/* Promo Banner */}
      <AnimatePresence>
        {showPromo && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="text-white py-4 px-6 relative mb-8"
            style={{ background: 'linear-gradient(135deg, #f47b7d 0%, #ff9a9c 100%)' }}
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaCrown className="text-2xl" />
                <div>
                  <p className="font-bold text-lg">Join Febeul Luxe Today!</p>
                  <p className="text-sm font-mediuopacity-90">Unlock exclusive sales and premium benefits!</p>
                  <p className="text-xs font-bold text-black mt-1 animate-pulse">Sale products only available after purchasing Luxe membership.</p>
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

      {/* Features Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-2 gap-y-7 gap-x-10 text-center">

        {/* Item 1 */}
        <div>
         <img src="/2.png" className="mx-auto h-16 mb-4" />
          <p className="font-bold text-black">FAST PRIORITY DELIVERY</p>
        </div>

        {/* Item 2 */}
        <div>
          {/* ICON HERE */}
          <img src="/6.png" className="mx-auto h-16 mb-4" />
          <p className="font-bold text-black">15 GIFT WRAPS</p>
        </div>

        {/* Item 3 */}
        <div>
          {/* ICON HERE */}
          <img src="/3.png" className="mx-auto h-16 mb-4" />
          <p className="font-bold text-black">LUXE PRIVE SALES</p>
          <motion.p
            className="text-sm text-gray-700 mt-1 px-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Join to reveal exclusive sale products!
          </motion.p>
        </div>

        {/* Item 4 */}
        <div>
          {/* ICON HERE */}
          <img src="/4.png" className="mx-auto h-16 mb-4" />
          <p className="font-bold text-black">COUPONS EVERY PURCHASE</p>
        </div>

        {/* Item 5 */}
        <div>
          {/* ICON HERE */}
          <img src="/5.png" className="mx-auto h-16 mb-4" />
          <p className="font-bold text-black">DEDICATED SUPPORT</p>
        </div>

        {/* Item 6 */}
        <div>
          {/* ICON HERE */}
          <img src="/6.png" className="mx-auto h-16 mb-4" />
          <p className="font-bold text-black">FREE DELIVERY</p>
        </div>

      </div>

      {/* Bottom Card */}
      <div className="max-w-md mx-auto mt-14 bg-white rounded-2xl shadow-lg px-6 py-5 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-gray-400 line-through">₹152</span>
          <span className="text-black font-bold text-lg">₹129</span>
          <span className="text-sm text-gray-500">per month</span>
        </div>

        <button
          onClick={handlePayment}
          disabled={!isAuthenticated}
          className="bg-yellow-400 hover:bg-yellow-500 transition text-black font-semibold px-6 py-3 rounded-full disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isAuthenticated ? "Join Febeul Luxe" : "Login to Join"}
        </button>

        <p className="text-xs text-gray-500 mt-2">
          By signing up for Luxe Membership, you agree to the Febeul Luxe Terms and Conditions
        </p>
      </div>

    </section>
  );
}
