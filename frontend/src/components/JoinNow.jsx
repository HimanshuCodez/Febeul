import React from "react";

export default function DiscountBanner() {
  return (
    <section className="w-full bg-[#e2a5a2] py-12 text-center">

      {/* Top Line */}
      <p className="text-white text-lg tracking-wide">
        JOIN NOW & SAVE 15% ON MEMBERSHIP!
      </p>

      {/* Discount Code */}
      <p className="text-white text-3xl font-semibold tracking-widest mt-2">
        USE DISCOUNT CODE: <span className="font-bold">luxe15</span>
      </p>

      {/* Button */}
      <button className="mt-6 bg-[#c8240b] text-white text-lg font-bold px-8 py-3 rounded-full shadow">
        JOIN NOW
      </button>

    </section>
  );
}
