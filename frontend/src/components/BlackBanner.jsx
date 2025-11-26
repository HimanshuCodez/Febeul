import React from "react";
import { Link } from "react-router-dom";

const BlackBanner = () => {
  return (
    <section className="relative w-full h-[90vh] sm:h-[100vh] overflow-hidden">
      
      {/* Background Video */}
      <video
        src="./pcvid.mp4"   // ⚠️ Put your video file here
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Optional: Dark Overlay (remove if not needed) */}
      {/* <div className="absolute inset-0 bg-black/40"></div> */}

      {/* Content on top of video */}
      {/* <div className="relative z-10 flex items-center justify-center h-full">
        <h1 className="text-white text-4xl sm:text-6xl font-bold">
          Your Text Here
        </h1>
      </div> */}

    </section>
  );
};

export default BlackBanner;
