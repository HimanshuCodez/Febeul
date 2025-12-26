import React from "react";

export default function FebeulLuxe() {
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

        <button className="bg-yellow-400 hover:bg-yellow-500 transition text-black font-semibold px-6 py-3 rounded-full">
          Join Febeul Luxe
        </button>

        <p className="text-xs text-gray-500 mt-2">
          By signing up for Luxe Membership, you agree to the Febeul Luxe Terms and Conditions
        </p>
      </div>

    </section>
  );
}
