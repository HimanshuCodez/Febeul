import React from "react";

export default function InfoBar() {
  return (
    <div className="w-full bg-[#F4B8BE] py-3 px-4 flex items-center justify-center gap-32 text-black text-sm sm:text-base">
      
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
          <div className="font-semibold">Free shipping</div>
          <div className="text-sm">on orders over ₹499</div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-black"></div>

      {/* Scan & Shop */}
      <div className="flex items-center gap-2">
        {/* QR Icon */}
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
          <path d="M3 3h4v4H3V3zM17 3h4v4h-4V3zM3 17h4v4H3v-4zM17 17h4v4h-4v-4zM10 3h4v4h-4V3zM10 17h4v4h-4v-4zM3 10h4v4H3v-4zM17 10h4v4h-4v-4z"></path>
        </svg>

        <div>
          <div className="font-semibold">Scan & Shop</div>
          <div className="text-sm">Available on Amazon</div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-black"></div>

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
          <div className="font-semibold">FREE RETURN</div>
          <div className="text-sm">3-Days free return</div>
        </div>
      </div>

    </div>
  );
}
