import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function DiscountBanner() {
  const [promoContent, setPromoContent] = useState({
    topLine: "JOIN NOW & SAVE 15% ON MEMBERSHIP!",
    discountCode: "luxe15",
    buttonText: "JOIN NOW"
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchPromoContent = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/promo_banner`);
        if (response.data && response.data.content) {
          setPromoContent(response.data.content);
        }
      } catch (error) {
        console.error("Error fetching promo banner content:", error);
      }
    };

    fetchPromoContent();
  }, [backendUrl]);

  return (
    <section className="w-full bg-[#e2a5a2] py-12 text-center">
      {/* Top Line */}
      <p className="text-white text-lg tracking-wide">
        {promoContent.topLine}
      </p>

      {/* Discount Code */}
      <p className="text-white text-3xl font-semibold tracking-widest mt-2">
        USE DISCOUNT CODE: <span className="font-bold">{promoContent.discountCode}</span>
      </p>

      {/* Button */}
      <Link to="/luxe">
        <button className="mt-6 bg-[#c8240b] text-white text-lg font-bold px-8 py-3 rounded-full shadow">
          {promoContent.buttonText}
        </button>
      </Link>
    </section>
  );
}

