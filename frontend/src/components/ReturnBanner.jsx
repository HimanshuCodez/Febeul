import React from "react";
import useAuthStore from "../store/authStore";

export default function InfoBar() {
  const { siteSettings } = useAuthStore();

  return (
    <div className="w-full bg-[#F4B8BE] text-black">
      <div className="mx-auto flex max-w-[1440px] flex-nowrap items-center justify-between gap-4 overflow-x-auto px-4 py-3 sm:gap-6 sm:py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-3 whitespace-nowrap">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 md:h-[26px] md:w-[26px]"
          >
            <path d="M1 3h15v13H1z"></path>
            <path d="M16 8h5l2 3v5h-7"></path>
            <circle cx="5.5" cy="16.5" r="2.5"></circle>
            <circle cx="18.5" cy="16.5" r="2.5"></circle>
          </svg>

          <div>
            <div className="text-sm font-semibold sm:text-base md:text-lg">
              Free shipping
            </div>
            <div className="text-xs sm:text-sm md:text-base">
              on orders over Rs.{siteSettings.shippingThreshold || 499}
            </div>
          </div>
        </div>

        <div className="h-8 w-px shrink-0 bg-black" />

        <div className="flex min-w-max items-center gap-3 whitespace-nowrap">
          <img
            src="/qramazon.jpeg"
            alt="QR Code for Amazon"
            className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
          />

          <div>
            <div className="text-sm font-semibold sm:text-base md:text-lg">
              Scan & Shop
            </div>
            <div className="text-xs sm:text-sm md:text-base">
              Available on Amazon
            </div>
          </div>
        </div>

        <div className="h-8 w-px shrink-0 bg-black" />

        <div className="flex min-w-max items-center gap-3 whitespace-nowrap">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 md:h-[28px] md:w-[28px]"
          >
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 .49-9.73L1 10"></path>
          </svg>

          <div>
            <div className="text-sm font-semibold sm:text-base md:text-lg">
              FREE RETURN
            </div>
            <div className="text-xs sm:text-sm md:text-base">
              3-Days free return
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
