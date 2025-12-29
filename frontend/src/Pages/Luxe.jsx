import React, { useState, useEffect } from "react";
import useAuthStore from "../store/authStore";
import axios from "axios";

export default function FebeulLuxe() {
  const { user, token, isAuthenticated } = useAuthStore();
  const [razorpayKey, setRazorpayKey] = useState("");

  useEffect(() => {
    const fetchRazorpayKey = async () => {
      try {
        const response = await axios.get("https://febeul.onrender.com/api/order/get-key");
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
        "https://febeul.onrender.com/api/order/razorpay",
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
              "https://febeul.onrender.com/api/order/verifyRazorpay",
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
              // Optionally redirect or update UI
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
      
      {/* Logo / Title */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-script text-white">
          Febeul <span className="text-black font-serif">LUXE</span>
        </h1>
      </div>

      {/* Features Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-2 gap-y-14 gap-x-20 text-center">

        {/* Item 1 */}
        <div>
         <img src="/bus.png" className="mx-auto h-32" />
          <p className="mt-4 font-bold text-black">FAST PRIORITY DELIVERY</p>
        </div>

        {/* Item 2 */}
        <div>
          {/* ICON HERE */}
          <p className="mt-4 font-bold text-black">15 GIFT WRAPS</p>
        </div>

        {/* Item 3 */}
        <div>
          {/* ICON HERE */}
          <p className="mt-4 font-bold text-black">LUXE PRIVÉ SALES</p>
        </div>

        {/* Item 4 */}
        <div>
          {/* ICON HERE */}
          <p className="mt-4 font-bold text-black">COUPONS EVERY PURCHASE</p>
        </div>

        {/* Item 5 */}
        <div>
          {/* ICON HERE */}
          <p className="mt-4 font-bold text-black">DEDICATED SUPPORT</p>
        </div>

        {/* Item 6 */}
        <div>
          {/* ICON HERE */}
          <p className="mt-4 font-bold text-black">FREE DELIVERY</p>
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
