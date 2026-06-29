import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const BlackBanner = () => {
  const [bannerData, setBannerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/black_banner`);
        if (response.data.success && response.data.content) {
          const content = response.data.content;
          setBannerData({
            ...content,
            desktopVideo: content.desktopVideo || content.video || "",
            mobileVideo: content.mobileVideo || content.video || "",
            desktopDealImage: content.desktopDealImage || content.deal?.image || "",
            mobileDealImage: content.mobileDealImage || content.deal?.image || "",
            deal: {
              image: content.deal?.image || "",
              title: content.deal?.title || "",
              price: content.deal?.price || "",
              mrp: content.deal?.mrp || "",
              discount: content.deal?.discount || "",
              link: content.deal?.link || "",
            },
          });
        } else {
          setBannerData({ 
            desktopVideo: "", 
            mobileVideo: "",
            desktopDealImage: "",
            mobileDealImage: "",
            link: "",
            showDeal: false,
            deal: null
          });
        }
      } catch (error) {
        console.error("Error fetching black banner:", error);
        setBannerData({ 
          desktopVideo: "", 
          mobileVideo: "",
          desktopDealImage: "",
          mobileDealImage: "",
          link: "",
          showDeal: false,
          deal: null
        });
      } finally {
        setLoading(false);
      }
    };
    fetchBanner();

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [backendUrl]);

  if (loading) {
    return (
      <section className="relative w-full h-[90vh] sm:h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
      </section>
    );
  }

  const BannerContent = () => {
    const mediaSrc = isMobile
      ? (bannerData.mobileVideo || bannerData.desktopVideo)
      : (bannerData.desktopVideo || bannerData.mobileVideo);

    if (mediaSrc) {
      return (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={mediaSrc}
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
    const dealImage = isMobile
      ? (bannerData.mobileDealImage || deal.image)
      : (bannerData.desktopDealImage || deal.image);

    return (
      <Link
        to={deal.link || "#"}
        className="absolute inset-x-3 bottom-3 sm:bottom-8 sm:left-1/2 sm:inset-x-auto sm:-translate-x-1/2 w-auto sm:w-[90%] sm:max-w-2xl bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-2xl pointer-events-auto hover:scale-[1.01] transition-transform duration-300"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-pink-200 flex-shrink-0 bg-gray-100">
            <img 
              src={dealImage || "/bluevid.png"} 
              alt={deal.title} 
              className="w-full h-full object-cover" 
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-medium text-gray-800 mb-1 truncate">
              {deal.title || "Limited Time Deal"}
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <span className="text-base sm:text-xl font-bold text-pink-600">
                {deal.discount && <span className="mr-2">{deal.discount}</span>}
                {deal.price}
              </span>
              <span className="bg-red-600 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full uppercase font-bold tracking-wider">
                Limited time deal
              </span>
            </div>
            <div className="text-[11px] sm:text-sm text-gray-500">
              M.R.P: <span className="line-through">{deal.mrp}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section className="relative w-full h-[72vh] sm:h-[90vh] lg:h-screen overflow-hidden bg-black">
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
