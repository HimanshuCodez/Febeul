import React from "react";

export default function LingerieRobeSection() {
  return (
    <section className="w-full bg-white py-10 px-6">
      
      {/* Heading */}
      <h2 className="text-3xl sm:text-4xl font-semibold tracking-wider text-center mb-8">
        LINGERIE ROBE
      </h2>

      {/* Image Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-6xl mx-auto">
        
        {/* Image 1 */}
        <div className="rounded-lg overflow-hidden shadow">
          <img
            src="/robe1.jpg"    // replace with your actual image
            alt="Lingerie Robe"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Image 2 with button */}
        <div className="relative rounded-lg overflow-hidden shadow">
          <img
            src="/robe2.jpg"    // replace with your actual image
            alt="Lingerie Robe"
            className="w-full h-full object-cover"
          />

          {/* Shop Now Button */}
          <button className="absolute bottom-4 left-4 bg-red-600 text-white text-sm px-4 py-2 rounded-full shadow-md">
            SHOP NOW
          </button>
        </div>

        {/* Image 3 */}
        <div className="rounded-lg overflow-hidden shadow">
          <img
            src="/robe3.jpg"    // replace with your actual image
            alt="Lingerie Robe"
            className="w-full h-full object-cover"
          />
        </div>

      </div>
    </section>
  );
}
