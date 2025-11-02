import React from "react";

const PromoBanner = () => {
  return (
    <div className="w-full bg-[url('https://i.postimg.cc/C5mmGGwQ/discount.jpg')] bg-cover bg-center text-white">
      {/* Overlay */}
      <div className="bg-black/70">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-5">
          <p className="uppercase text-sm tracking-widest text-gray-300">
            Join now & save 25% on membership!
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">
            Use Discount Code: <span className="">VIP25</span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <input
              type="email"
              placeholder="Email Address"
              className="px-4 py-3 rounded-l-lg text-gray-800 w-64 focus:outline-none"
            />
            <button className="bg-[#f9aeaf] hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-r-lg uppercase">
              Let me in!
            </button>
          </div>
        </div>

        {/* Logo Strip */}
        <div className="bg-[#f9aeaf] py-4 flex flex-wrap justify-center gap-8 text-white font-semibold text-lg">
          <span>Amazon</span>
          <span>FlipKart</span>
          <span>Ajio</span>
          <span>Messho</span>
      
        </div>
      </div>
    </div>
  );
};

export default PromoBanner;
