import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Eye, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// Global cache to avoid redundant API calls across multiple ProductCard instances
let couponsCache = null;
let couponsPromise = null;

const fetchActiveCoupons = async () => {
  if (couponsCache) return couponsCache;
  if (couponsPromise) return couponsPromise;

  couponsPromise = axios.get(`${backendUrl}/api/coupon/active`)
    .then(res => {
      if (res.data.success) {
        couponsCache = res.data.coupons;
        return couponsCache;
      }
      return [];
    })
    .catch(() => []);

  return couponsPromise;
};

const ProductCard = ({ product, onWishlistToggle }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeVariationIndex, setActiveVariationIndex] = useState(0);
  const [activeCoupons, setActiveCoupons] = useState([]);

  const { user, token, isAuthenticated, fetchWishlistCount } = useAuthStore();
  const navigate = useNavigate();

  const isLuxeMember = user?.isLuxeMember;

  const handleProductClick = (e) => {
    if (product.isLuxePrive && !isLuxeMember) {
      e.preventDefault(); 
      navigate('/luxe');
      toast.error("This is a Luxe Prive product. Please become a Luxe Member to view.");
    }
  };

  useEffect(() => {
    const loadCoupons = async () => {
      const coupons = await fetchActiveCoupons();
      setActiveCoupons(coupons);
    };
    loadCoupons();
  }, []);

  useEffect(() => {
    const checkWishlist = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await axios.get(`${backendUrl}/api/user/wishlist`, {
            headers: { token }
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
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please log in to manage your wishlist.");
      navigate("/auth");
      return;
    }

    const endpoint = isWishlisted ? 'remove' : 'add';
    try {
      const response = await axios.post(`${backendUrl}/api/user/wishlist/${endpoint}`, 
        { productId: product._id },
        { headers: { token } }
      );
      if (response.data.success) {
        const newWishlistState = !isWishlisted;
        setIsWishlisted(newWishlistState);
        toast.success(newWishlistState ? "Added to wishlist" : "Removed from wishlist");
        fetchWishlistCount();
        if (onWishlistToggle) {
          onWishlistToggle(newWishlistState);
        }
      }
    } catch (error) {
      toast.error("Failed to update wishlist.");
    }
  };

  const variations = product.variations || [];
  const activeVariation = variations[activeVariationIndex] || {};
  
  const firstSize = activeVariation.sizes?.[0];
  const displayPrice = firstSize?.price;
  const displayMrp = firstSize?.mrp;

  const discount = displayMrp && displayPrice
    ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
    : 0;

  const defaultImage = activeVariation.images?.[0] || product.variations?.[0]?.images?.[0];
  const hoverImage = activeVariation.images?.[1] || defaultImage;

  const getBestCouponPrice = () => {
    const sku = activeVariation.sku;
    if (!displayPrice || !sku || !activeCoupons.length) return null;

    let maxDiscount = 0;
    activeCoupons.forEach(coupon => {
      const isApplicableSKU = !coupon.applicableSKUs || coupon.applicableSKUs.length === 0 || coupon.applicableSKUs.includes(sku);
      const isMinAmountMet = displayPrice >= (coupon.minOrderAmount || 0);
      const isLuxeMatch = coupon.userType !== 'luxe' || isLuxeMember;

      if (isApplicableSKU && isMinAmountMet && isLuxeMatch) {
        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = (displayPrice * coupon.discountValue) / 100;
        } else {
          discount = coupon.discountValue;
        }
        if (discount > maxDiscount) maxDiscount = discount;
      }
    });

    return maxDiscount > 0 ? displayPrice - maxDiscount : null;
  };

  const bestCouponPrice = getBestCouponPrice();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-shadow duration-500 w-full max-w-[280px] sm:max-w-[300px] mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <Link
          to={product.isLuxePrive && !isLuxeMember ? '#' : `/product/${product._id}`}
          onClick={handleProductClick}
          className={`block ${product.isLuxePrive && !isLuxeMember ? 'cursor-not-allowed' : ''}`}
        >
          {/* Image Section */}
          <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
            <AnimatePresence mode="wait">
              <motion.img
                key={isHovered ? hoverImage : defaultImage}
                src={isHovered ? hoverImage : defaultImage}
                alt={product.name}
                className="w-full h-full object-cover"
                initial={{ opacity: 0.8, scale: 1.05 }}
                animate={{ opacity: 1, scale: isHovered ? 1.1 : 1 }}
                exit={{ opacity: 0.8 }}
                transition={{ duration: 0.5 }}
              />
            </AnimatePresence>

            {/* Shimmer Overlay */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"
              initial={{ x: '-100%' }}
              animate={isHovered ? { x: '100%' } : { x: '-100%' }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />

            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleWishlistToggle}
                className={`p-2.5 rounded-full shadow-lg backdrop-blur-md transition-colors duration-300 ${
                  isWishlisted ? 'bg-pink-500 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'
                }`}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: isHovered ? 0 : 20, opacity: isHovered ? 1 : 0 }}
                transition={{ delay: 0.1 }}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (product.isLuxePrive && !isLuxeMember) {
                    navigate('/luxe');
                    toast.error("This is a Luxe Prive product. Please become a Luxe Member to view.");
                  } else {
                    navigate(`/product/${product._id}`);
                  }
                }}
                className="p-2.5 bg-white/90 text-gray-700 rounded-full shadow-lg backdrop-blur-md hover:bg-white transition-colors duration-300"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: isHovered ? 0 : 20, opacity: isHovered ? 1 : 0 }}
                transition={{ delay: 0.2 }}
              >
                <Eye className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
              {discount > 0 && (
                <motion.span 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-red-500 text-white px-3 py-1 text-[10px] font-black rounded-full shadow-lg tracking-wider"
                >
                  {discount}% OFF
                </motion.span>
              )}
              {product.isNewProduct && (
                <motion.span 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-emerald-500 text-white px-3 py-1 text-[10px] font-black rounded-full shadow-lg tracking-wider flex items-center gap-1"
                >
                  <Sparkles size={10} /> NEW
                </motion.span>
              )}
            </div>

            {/* Luxe Indicator */}
            {product.isLuxePrive && (
              <motion.div 
                className="absolute bottom-4 left-4 w-12 h-12"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <img src="/luxeprive.png" alt="Luxe" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
              </motion.div>
            )}
          </div>
        </Link>

        {/* Content Section */}
        <div className="p-4 space-y-3">
          <Link
            to={product.isLuxePrive && !isLuxeMember ? '#' : `/product/${product._id}`}
            onClick={handleProductClick}
            className="block h-10"
          >
            <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight group-hover:text-pink-600 transition-colors duration-300">
              {product.name}
            </h3>
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {bestCouponPrice ? (
                  <>
                    <span className="text-base font-black text-green-600">₹{bestCouponPrice.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-gray-400 line-through font-medium">₹{displayPrice?.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 uppercase tracking-tighter">Coupon</span>
                  </>
                ) : (
                  <>
                    <span className="text-base font-black text-gray-900">₹{displayPrice?.toLocaleString('en-IN')}</span>
                    {displayMrp > displayPrice && (
                      <span className="text-xs text-gray-400 line-through font-medium">₹{displayMrp.toLocaleString('en-IN')}</span>
                    )}
                  </>
                )}
            </div>
          </div>
          
          {/* Swatches */}
          <div className="h-6 flex items-center">
            {variations.length > 1 && (
                <div className="flex items-center gap-1.5">
                    {variations.slice(0, 4).map((variation, index) => (
                        <motion.div
                            key={index}
                            whileHover={{ scale: 1.2 }}
                            onClick={() => setActiveVariationIndex(index)}
                            onMouseEnter={() => setActiveVariationIndex(index)}
                            className={`w-6 h-6 rounded-full overflow-hidden border transition-all cursor-pointer flex-shrink-0 ${
                                activeVariationIndex === index ? 'border-pink-500 ring-1 ring-pink-500' : 'border-gray-200 hover:border-gray-400'
                            }`}
                        >
                            <div className="w-full h-full bg-gray-100">
                                {variation.images?.[0] ? (
                                    <img 
                                      src={variation.images[0]} 
                                      alt="" 
                                      className="w-full h-full object-cover" 
                                    />
                                ) : (
                                  <div 
                                    className="w-full h-full" 
                                    style={{ backgroundColor: variation.colorCode || '#ddd' }}
                                  />
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {variations.length > 4 && (
                      <span className="text-[10px] font-bold text-gray-400 ml-1">+{variations.length - 4}</span>
                    )}
                </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;