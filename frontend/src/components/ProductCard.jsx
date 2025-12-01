import React, { useState } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

// Product Card Component
const ProductCard = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link to={`/product/${product._id}`} className="group cursor-pointer">
      <div 
        className="group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className="relative overflow-hidden bg-gray-100 mb-3">
          <img
            src={isHovered && product.image[1] ? product.image[1] : product.image[0]}
            alt={product.name}
            className="w-full h-[400px] object-cover transition-all duration-300"
          />
          
          {/* Hover Actions */}
          <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-opacity duration-300 opacity-100 md:opacity-0 ${isHovered ? 'md:opacity-100' : ''}`}>
            <button className="bg-white p-2 rounded-full shadow-lg hover:bg-pink-50">
              <Heart className="w-5 h-5 text-gray-700" />
            </button>
            <button className="bg-white p-2 rounded-full shadow-lg hover:bg-pink-50">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Discount Badge */}
          {product.mrp && product.price && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 text-xs font-bold rounded">
              {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
            </div>
          )}
        </div>

        {/* Product Info */}
        <h3 className="text-sm text-gray-800 mb-2 line-clamp-2 hover:text-pink-600">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">₹{product.price}</span>
          {product.mrp && (
            <span className="text-sm text-gray-500 line-through">₹{product.mrp}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
