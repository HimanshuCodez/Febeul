import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const BlackBanner = () => {
  const [bannerData, setBannerData] = useState({ video: "", link: "" });
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

    // Fallback to original YouTube video if no uploaded video exists
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

  return (
    <section className="relative w-full h-[90vh] sm:h-screen overflow-hidden">
      {bannerData.link ? (
        <Link to={bannerData.link} className="block w-full h-full">
          <BannerContent />
        </Link>
      ) : (
        <div className="w-full h-full pointer-events-none">
          <BannerContent />
        </div>
      )}
    </section>
  );
};

export default BlackBanner;
