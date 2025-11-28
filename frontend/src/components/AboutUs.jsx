import React from "react";

export default function AboutUs() {
  return (
    <section className="w-full bg-[#F4B8BE] py-16 px-6 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-20">

      {/* Left — Circular Image */}
      <div className="w-60 h-60 sm:w-72 sm:h-72 rounded-full overflow-hidden border-4 border-transparent">
        <img
          src="/about-img.jpg"  // replace with your image path
          alt="About Us"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right — Text */}
      <div className="max-w-xl text-center sm:text-left">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-widest text-black mb-4">
          ABOUT US
        </h2>

        <p className="text-black text-sm sm:text-base leading-relaxed">
          At Febeul, we believe every woman deserves to feel beautiful in her own quiet, natural way. 
          Our lingerie is designed to celebrate her – her softness, her strength, and the confidence she carries within.
          <br /><br />
          We create pieces that feel gentle on the skin, effortlessly fit, and remind her that she is enough, just as she is.
          <br /><br />
          Whether she’s dressing for a special moment or simply for herself, Lunia is here to make her feel 
          comfortable, confident, and truly seen.
          <br /><br />
          Febeul isn’t just lingerie.<br />
          It’s a woman choosing herself – with love.
        </p>
      </div>

    </section>
  );
}
