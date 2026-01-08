import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ProductCard = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeVariationIndex, setActiveVariationIndex] = useState(0);

  const { user, token, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const checkWishlist = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await axios.get(`${backendUrl}/api/user/wishlist`, {
            headers: { token },
            params: { userId: user._id }
          });
          if (response.data.success) {
            const isProductInWishlist = response.data.wishlist.some(item => item._id === product._id);
            setIsWishlisted(isProductInWishlist);
          }
        } catch (error) {
          console.error("Error checking wishlist", error);
        }
      }
    };
    checkWishlist();
  }, [isAuthenticated, user, product._id, token]);
  

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please log in to manage your wishlist.");
      navigate("/auth");
      return;
    }

    const endpoint = isWishlisted ? 'remove' : 'add';
    try {
      const response = await axios.post(`${backendUrl}/api/user/wishlist/${endpoint}`, 
        { userId: user._id, productId: product._id },
        { headers: { token } }
      );
      if (response.data.success) {
        setIsWishlisted(!isWishlisted);
        toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
      }
    } catch (error) {
      toast.error("Failed to update wishlist.");
    }
  };

  const discount = product.mrp
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const variations = product.variations || [];
  const activeVariation = variations[activeVariationIndex] || {};
  const defaultImage = activeVariation.images?.[0] || product.variations?.[0]?.images?.[0];
  const hoverImage = activeVariation.images?.[1] || defaultImage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveVariationIndex(0); // Reset to first variation when not hovering
      }}
    >
      <Link to={`/product/${product._id}`} className="block">
        {/* Image Container */}
        <div className="relative overflow-hidden bg-gray-50 rounded-xl mb-4 aspect-[3/4]">
          <motion.img
            key={defaultImage} // Re-trigger animation when image src changes
            src={isHovered ? hoverImage : defaultImage}
            alt={product.name}
            className="w-full h-full object-cover"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1, scale: isHovered ? 1.08 : 1 }}
            transition={{ opacity: { duration: 0.4 }, scale: { duration: 0.6, ease: "easeOut" } }}
          />

          {/* Quick Actions - Appear on Hover */}
          <div
            className={`absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 ${
              isHovered ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
            }`}
          >
            <button
              onClick={handleWishlistToggle}
              title="Add to Wishlist"
              className="bg-white p-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:bg-pink-50"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isWishlisted ? 'fill-pink-500 text-pink-500' : 'text-gray-700'
                }`}
              />
            </button>

            <button title="Add to Cart" className="bg-white p-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:bg-pink-50">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 text-xs font-bold rounded-full shadow-md">
              {discount}% OFF
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-2">
          <h3 className="text-base font-medium text-gray-800 line-clamp-2 group-hover:text-pink-600 transition-colors duration-300 h-12">
            {product.name}
          </h3>

          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">₹{product.price.toLocaleString('en-IN')}</span>
                {product.mrp && product.mrp > product.price && (
                  <span className="text-sm text-gray-500 line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
                )}
            </div>
          </div>
          
          {/* Color Swatches */}
          <div className="h-8 flex items-center">
            {variations && variations.length > 1 && (
                <div className="flex items-center gap-2">
                    {variations.slice(0, 5).map((variation, index) => (
                        <div
                            key={index}
                            onMouseEnter={() => setActiveVariationIndex(index)}
                            className={`w-6 h-6 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                                activeVariationIndex === index ? 'border-pink-600 scale-110' : 'border-gray-200'
                            }`}
                        >
                            <img
                                src={variation.images?.[0]}
                                alt={variation.color}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                    {variations.length > 5 && <div className="text-xs font-semibold text-gray-500">+{variations.length - 5}</div>}
                </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;