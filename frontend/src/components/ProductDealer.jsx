import React from 'react';

export default function ProductDealBanner() {
  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-4">
        {/* Product Image */}
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
          <img 
            src="/api/placeholder/64/64" 
            alt="Lace Babydoll Lingerie" 
            className="w-full h-full object-cover" 
          />
        </div>
        
        {/* Product Info */}
        <div className="flex-1">
          <h2 className="text-sm font-medium text-gray-800 mb-1">
            Lace Babydoll Lingerie for Women-Transparent Nighty
          </h2>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-lg font-bold text-gray-800">62% ₹379</span>
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
              Limited time deal
            </span>
          </div>
          <div className="text-sm text-gray-600">
            M.R.P: <span className="line-through">₹999.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}