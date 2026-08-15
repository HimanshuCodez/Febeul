import React, { useState, useEffect } from "react";
import axios from "axios";
import useAuthStore from "../store/authStore";

export default function InfoBar() {
  const { siteSettings } = useAuthStore();
  const [infoBar, setInfoBar] = useState({
    backgroundColor: "#F4B8BE",
    shippingTitle: "Free shipping",
    qrImage: "/qramazon.jpeg",
    qrTitle: "Scan & Shop",
    qrSubtitle: "Available on Amazon",
    returnTitle: "FREE RETURN",
    returnSubtitle: "3-Days free return"
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchInfoBar = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/info_bar`);
        if (response.data && response.data.content) {
          setInfoBar(prev => ({ ...prev, ...response.data.content }));
        }
      } catch (error) {
        console.error("Error fetching info bar content:", error);
      }
    };

    fetchInfoBar();
  }, [backendUrl]);

  return (
    <div className="w-full text-black" style={{ backgroundColor: infoBar.backgroundColor }}>
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
              {infoBar.shippingTitle}
            </div>
            <div className="text-xs sm:text-sm md:text-base">
              on orders over Rs.{siteSettings.shippingThreshold || 499}
            </div>
          </div>
        </div>

        <div className="h-8 w-px shrink-0 bg-black" />

        <div className="flex min-w-max items-center gap-3 whitespace-nowrap">
          <img
            src={infoBar.qrImage || "/qramazon.jpeg"}
            alt="QR Code"
            className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
          />

          <div>
            <div className="text-sm font-semibold sm:text-base md:text-lg">
              {infoBar.qrTitle}
            </div>
            <div className="text-xs sm:text-sm md:text-base">
              {infoBar.qrSubtitle}
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
              {infoBar.returnTitle}
            </div>
            <div className="text-xs sm:text-sm md:text-base">
              {infoBar.returnSubtitle}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
