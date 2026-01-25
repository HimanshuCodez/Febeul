import React from "react";

export default function InfoBar() {
  return (
    <div className="w-full bg-[#F4B8BE] py-6 px-4 flex flex-wrap items-center justify-around gap-y-4 md:gap-x-8 lg:gap-x-32 text-black text-sm sm:text-base">
      
      {/* Free Shipping */}
      <div className="flex items-center gap-2">
        {/* Truck Icon */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 3h15v13H1z"></path>
          <path d="M16 8h5l2 3v5h-7"></path>
          <circle cx="5.5" cy="16.5" r="2.5"></circle>
          <circle cx="18.5" cy="16.5" r="2.5"></circle>
        </svg>

        <div>
          <div className="text-lg font-semibold">Free shipping</div>
          <div className="text-base">on orders over ₹499</div>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden md:block w-px h-8 bg-black"></div>
      <div className="flex items-center gap-2">
        {/* QR Icon */}
        <img src="/qramazon.jpeg" alt="QR Code for Amazon" className="w-12 h-12 object-contain" />

        <div>
          <div className="text-lg font-semibold">Scan & Shop</div>
          <div className="text-base">Available on Amazon</div>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden md:block w-px h-8 bg-black"></div>

      {/* Free Return */}
      <div className="flex items-center gap-2">
        {/* Return Icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 .49-9.73L1 10"></path>
        </svg>

        <div>
          <div className="text-lg font-semibold">FREE RETURN</div>
          <div className="text-base">3-Days free return</div>
        </div>
      </div>

    </div>
  );
}
