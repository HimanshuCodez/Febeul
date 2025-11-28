import React from "react";

export default function DiscountBanner() {
  return (
    <section className="w-full bg-[#e2a5a2] py-8 text-center">

      {/* Top Line */}
      <p className="text-white text-sm tracking-wide">
        JOIN NOW & SAVE 15% ON MEMBERSHIP!
      </p>

      {/* Discount Code */}
      <p className="text-white text-xl font-semibold tracking-widest mt-1">
        USE DISCOUNT CODE: <span className="font-bold">luxe15</span>
      </p>

      {/* Button */}
      <button className="mt-4 bg-[#c8240b] text-white text-sm font-bold px-6 py-2 rounded-full shadow">
        JOIN NOW
      </button>

    </section>
  );
}
