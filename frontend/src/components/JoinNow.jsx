import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const SYSTEM_FONTS = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 'system-ui'];

export default function DiscountBanner() {
  const [promoContent, setPromoContent] = useState({
    topLine: "JOIN NOW & SAVE 15% ON MEMBERSHIP!",
    discountCode: "luxe15",
    buttonText: "JOIN NOW",
    desktopBackground: "",
    mobileBackground: "",
    fontFamily: "",
    fontColor: "#ffffff",
    backgroundColor: "#e2a5a2"
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchPromoContent = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/promo_banner`);
        if (response.data && response.data.content) {
          setPromoContent(prev => ({ ...prev, ...response.data.content }));
        }
      } catch (error) {
        console.error("Error fetching promo banner content:", error);
      }
    };

    fetchPromoContent();

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [backendUrl]);

  useEffect(() => {
    const font = promoContent.fontFamily;
    if (!font || SYSTEM_FONTS.includes(font)) return;

    const linkId = 'google-font-join-now';
    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@400;600;700&display=swap`;
  }, [promoContent.fontFamily]);

  const backgroundImage = isMobile
    ? (promoContent.mobileBackground || promoContent.desktopBackground)
    : (promoContent.desktopBackground || promoContent.mobileBackground);

  return (
    <section
      className="relative w-full py-12 text-center overflow-hidden"
      style={{
        backgroundColor: promoContent.backgroundColor || '#e2a5a2',
        fontFamily: promoContent.fontFamily || undefined
      }}
    >
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <div className="relative z-10">
        {/* Top Line */}
        <p className="text-lg tracking-wide" style={{ color: promoContent.fontColor || '#ffffff' }}>
          {promoContent.topLine}
        </p>

        {/* Discount Code */}
        <p className="text-3xl font-semibold tracking-widest mt-2" style={{ color: promoContent.fontColor || '#ffffff' }}>
          USE DISCOUNT CODE: <span className="font-bold">{promoContent.discountCode}</span>
        </p>

        {/* Button */}
        <Link to="/luxe">
          <button className="mt-6 bg-[#c8240b] text-white text-lg font-bold px-8 py-3 rounded-full shadow">
            {promoContent.buttonText}
          </button>
        </Link>
      </div>
    </section>
  );
}

