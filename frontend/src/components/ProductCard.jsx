import React, { useState } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ProductCard = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const discount = product.mrp
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/product/${product._id}`} className="block">
        {/* Image Container */}
        <div className="relative overflow-hidden bg-gray-50 rounded-xl mb-4 aspect-[3/4]">
          <motion.img
            src={isHovered && product.image?.[1] ? product.image[1] : product.image?.[0]}
            alt={product.name}
            className="w-full h-full object-cover"
            initial={false}
            animate={{ scale: isHovered ? 1.08 : 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />

          {/* Quick Actions - Appear on Hover */}
          <div
            className={`absolute top-4 right-4 flex flex-col gap-3 transition-all duration-500 ${
              isHovered ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'
            }`}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsWishlisted(!isWishlisted);
              }}
              className="bg-white p-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:bg-pink-50"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isWishlisted ? 'fill-pink-500 text-pink-500' : 'text-gray-700'
                }`}
              />
            </button>

            <button className="bg-white p-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:bg-pink-50">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-1.5 text-sm font-bold rounded-full shadow-lg">
              {discount}% OFF
            </div>
          )}

          {/* Subtle Overlay on Hover */}
          <div
            className={`absolute inset-0 bg-black/10 pointer-events-none transition-opacity duration-500 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>

        {/* Product Details */}
        <div className="space-y-2">
          <h3 className="text-base font-medium text-gray-800 line-clamp-2 group-hover:text-pink-600 transition-colors duration-300">
            {product.name}
          </h3>

          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">₹{product.price.toLocaleString('en-IN')}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-sm text-gray-500 line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
            )}
          </div>

          {/* Optional: Rating or Sold Indicator (uncomment if needed) */}
          {/* <div className="flex items-center gap-1 text-sm text-gray-600">
            <span>★★★★☆</span>
            <span>(128)</span>
          </div> */}
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;