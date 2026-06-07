import React from "react";
import { Link } from "react-router-dom";

const PurpleBanner = () => {
  return (
    <section className="relative w-full h-[90vh] sm:h-[100vh] overflow-hidden">
      {/* Background Image */}
      <img
        src="./purple.jpg"
        alt="Banner"
        className="absolute inset-0 mt w-full h-full object-top"
      />

    

    
    </section>
  );
};

export default PurpleBanner;
