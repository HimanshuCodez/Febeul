import React from "react";
import { Truck, Tag, RefreshCw } from "lucide-react";

const OfferBar = () => {
  return (
    <div className="w-full bg-gradient-to-r from-[#f87a7c] to-[#f9aeaf] text-white py-3 px-4 flex flex-col sm:flex-row items-center justify-center text-center gap-6 sm:gap-12 font-medium text-sm sm:text-base shadow-lg">
      
      {/* Free Shipping */}
      <div className="flex items-center gap-3 hover:scale-105 transition">
        <Truck className="w-6 h-6 text-white" />
        <p className="text-lg sm:text-base font-semibold">
          Free Shipping on orders over ₹499
        </p>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-10 w-px bg-white/40"></div>

      {/* QR + Amazon */}
      <div className="flex items-center gap-3 hover:scale-105 transition">
        <Tag className="w-6 h-6 text-yellow-300" />
        <div className="flex flex-col items-center sm:items-start">
          <div className="flex items-center gap-2">
            <p className="uppercase font-semibold text-yellow-300">
              Scan & Shop
            </p>
            {/* Fake QR Code Box */}
            <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center shadow-md border border-gray-300">
              <div className="w-7 h-7 bg-gray-300 rounded-sm"></div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-100 mt-1">
            Available on Amazon
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-10 w-px bg-white/40"></div>

      {/* Easy Returns */}
      <div className="flex items-center gap-3 hover:scale-105 transition">
        <RefreshCw className="w-6 h-6 text-white" />
        <div>
          <p className="uppercase font-semibold">Easy Returns</p>
          <p className="text-xs sm:text-sm text-gray-100">
            3 days hassle-free returns
          </p>
        </div>
      </div>

    </div>
  );
};

export default OfferBar;
