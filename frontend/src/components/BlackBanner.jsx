import React from "react";

const BlackBanner = () => {
  return (
    <section className="relative w-full h-[90vh] sm:h-screen overflow-hidden pointer-events-none">
      
      <iframe
        className="absolute inset-0 w-full h-full"
        src="https://www.youtube.com/embed/UZS8qSxNkvw?autoplay=1&mute=1&loop=1&playlist=UZS8qSxNkvw&controls=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1"
        title="Background Video"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />

    </section>
  );
};

export default BlackBanner;
