import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const BlackBanner = () => {
  const [bannerData, setBannerData] = useState({ 
    video: "", 
    link: "",
    showDeal: false,
    deal: null
  });
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/black_banner`);
        if (response.data.success && response.data.content) {
          setBannerData(response.data.content);
        }
      } catch (error) {
        console.error("Error fetching black banner:", error);
      }
    };
    fetchBanner();
  }, [backendUrl]);

  const BannerContent = () => {
    if (bannerData.video) {
      return (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={bannerData.video}
          autoPlay
          muted
          loop
          playsInline
        />
      );
    }

    return (
      <iframe
        className="absolute inset-0 w-full h-full"
        src="https://www.youtube.com/embed/UZS8qSxNkvw?autoplay=1&mute=1&loop=1&playlist=UZS8qSxNkvw&controls=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1"
        title="Background Video"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  };

  const DealOverlay = ({ deal }) => {
    if (!deal) return null;
    return (
      <Link to={deal.link || "#"} className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-2xl pointer-events-auto hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-pink-200 flex-shrink-0">
            <img 
              src={deal.image || "/bluevid.png"} 
              alt={deal.title} 
              className="w-full h-full object-cover" 
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-medium text-gray-800 mb-1 truncate">
              {deal.title || "Limited Time Deal"}
            </h2>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-lg sm:text-xl font-bold text-pink-600">
                {deal.discount && <span className="mr-2">{deal.discount}</span>}
                {deal.price}
              </span>
              <span className="bg-red-600 text-white text-[10px] sm:text-xs px-2 py-1 rounded uppercase font-bold tracking-wider">
                Limited time deal
              </span>
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              M.R.P: <span className="line-through">{deal.mrp}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section className="relative w-full h-[90vh] sm:h-screen overflow-hidden">
      {/* Background Section */}
      {bannerData.link ? (
        <Link to={bannerData.link} className="block w-full h-full">
          <BannerContent />
        </Link>
      ) : (
        <div className="w-full h-full">
          <BannerContent />
        </div>
      )}

      {/* Deal Overlay */}
      {bannerData.showDeal && <DealOverlay deal={bannerData.deal} />}
    </section>
  );
};

export default BlackBanner;
