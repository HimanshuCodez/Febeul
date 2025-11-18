import React from "react";
import { Truck, Tag, RefreshCw } from "lucide-react";

const OfferBar = () => {
  return (
    <div className="w-full bg-[#f9aeaf] text-white py-3 px-4 flex flex-col sm:flex-row items-center justify-center text-center gap-4 sm:gap-10 font-medium text-sm sm:text-base">
      {/* Left - Free Returns */}
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5" />
        <div>
          
          <p className="text-lg sm:text-base text-gray-100">
            Free Shipping on orders over Rs 499
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-8 w-px bg-white/50"></div>

      {/* Middle - Offer */}
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-yellow-300" />
        <div>
          <p className="uppercase font-semibold text-yellow-300">
            Qr code will be here
          </p>
          <p className="text-xs sm:text-sm text-gray-100">
          Avaliable on Amazon 
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-8 w-px bg-white/50"></div>

      {/* Right - Easy Returns */}
      <div className="flex items-center gap-2">
        <RefreshCw className="w-5 h-5" />
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
