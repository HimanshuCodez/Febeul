import React, { useEffect, useId, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { toast } from 'react-hot-toast';
import Loader from './Loader';
import { Tag, ChevronLeft, ChevronRight } from 'lucide-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// Global cache to avoid redundant API calls. Short TTL so coupons
// created/edited in admin show up without a full page reload.
const COUPONS_CACHE_TTL_MS = 60000;
let couponsCache = null;
let couponsCacheTime = 0;
let couponsPromise = null;

const fetchActiveCoupons = async () => {
  if (couponsCache && Date.now() - couponsCacheTime < COUPONS_CACHE_TTL_MS) return couponsCache;
  if (couponsPromise) return couponsPromise;

  couponsPromise = axios.get(`${backendUrl}/api/coupon/active`)
    .then(res => {
      couponsPromise = null;
      if (res.data.success) {
        couponsCache = res.data.coupons;
        couponsCacheTime = Date.now();
        return couponsCache;
      }
      return [];
    })
    .catch(() => {
      couponsPromise = null;
      return [];
    });

  return couponsPromise;
};

const SimilarItems = ({ productId, token, showDesktopNavigation = false }) => {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const carouselRef = useRef(null);
  const carouselId = useId();
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLuxeMember = user?.isLuxeMember;

  useEffect(() => {
    const loadCoupons = async () => {
      const coupons = await fetchActiveCoupons();
      setActiveCoupons(coupons);
    };
    loadCoupons();
  }, []);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${backendUrl}/api/product/similar/${productId}`);
        if (response.data.success) {
          setSimilarProducts(response.data.products);
        } else {
          setError(response.data.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      }
    };

    if (productId) {
      fetchSimilarProducts();
    }
  }, [productId, token]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!showDesktopNavigation || !carousel) return;

    carousel.scrollTo({ left: 0, behavior: 'instant' });
    const updateScrollState = () => {
      const left = carousel.scrollLeft > 1;
      const right = carousel.scrollWidth - carousel.clientWidth - carousel.scrollLeft > 1;
      setScrollState(previous => previous.left === left && previous.right === right ? previous : { left, right });
    };

    updateScrollState();
    carousel.addEventListener('scroll', updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(carousel);

    return () => {
      carousel.removeEventListener('scroll', updateScrollState);
      observer.disconnect();
    };
  }, [showDesktopNavigation, similarProducts.length, error, productId]);

  const scrollProducts = (direction) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const cardWidth = carousel.firstElementChild?.getBoundingClientRect().width || carousel.clientWidth;
    const gap = parseFloat(window.getComputedStyle(carousel).columnGap) || 0;
    carousel.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  const handleProductClick = (product) => {
    if (product.isLuxePrive && !isLuxeMember) {
      navigate('/luxe');
      toast.error("This is a Luxe Prive product. Please become a Luxe Member to view.");
      return;
    }
    navigate(`/product/${product._id}`);
    window.scrollTo(0, 0); // Scroll to top
  };

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="max-w-screen-2xl mx-auto p-4 mt-8 relative min-h-[200px]">
      {loading && <Loader />}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Similar Items</h2>
        {showDesktopNavigation && similarProducts.length > 0 && (scrollState.left || scrollState.right) && (
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollProducts(-1)}
              disabled={!scrollState.left}
              aria-label="Previous similar products"
              aria-controls={carouselId}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:border-pink-500 hover:text-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-700"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollProducts(1)}
              disabled={!scrollState.right}
              aria-label="Next similar products"
              aria-controls={carouselId}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:border-pink-500 hover:text-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-700"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      
      {similarProducts.length > 0 ? (
        <div
          ref={carouselRef}
          id={carouselId}
          className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ${showDesktopNavigation
            ? 'lg:grid-cols-none lg:grid-flow-col lg:auto-cols-[calc((100%-4rem)/5)] xl:auto-cols-[calc((100%-5rem)/6)] lg:overflow-x-auto lg:snap-x lg:snap-mandatory no-scrollbar pb-3'
            : 'lg:grid-cols-5 xl:grid-cols-6'}`}
        >
          {similarProducts.map((product) => {
            const firstVar = product.variations?.[0] || {};
            const firstSize = firstVar.sizes?.[0] || {};
            const price = firstSize.price;
            const mrp = firstSize.mrp;
            const sku = firstVar.sku;

            let bestCouponPrice = null;
            if (price && sku && activeCoupons.length) {
              let maxDiscount = 0;
              activeCoupons.forEach(coupon => {
                const isApplicableSKU = !coupon.applicableSKUs || coupon.applicableSKUs.length === 0 || 
                  coupon.applicableSKUs.some(item => item.trim().toLowerCase() === sku.trim().toLowerCase());
                const isMinAmountMet = price >= (coupon.minOrderAmount || 0);
                const isLuxeMatch = coupon.userType !== 'luxe' || isLuxeMember;

                if (isApplicableSKU && isMinAmountMet && isLuxeMatch) {
                  let discount = 0;
                  if (coupon.discountType === 'percentage') {
                    discount = (price * coupon.discountValue) / 100;
                  } else {
                    discount = coupon.discountValue;
                  }
                  if (discount > maxDiscount) maxDiscount = discount;
                }
              });
              if (maxDiscount > 0) bestCouponPrice = price - maxDiscount;
            }

            return (
              <div
                key={product._id}
                onClick={() => handleProductClick(product)}
                className={`block min-w-0 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer ${showDesktopNavigation ? 'lg:snap-start' : ''}`}
              >
                <div className="relative">
                  <img
                    src={firstVar.images?.[0]}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  {product.isLuxePrive && (
                    <div className="absolute bottom-2 left-2 z-10 w-12 h-12 pointer-events-none">
                      <img
                        src="/luxeprive.png"
                        alt="Luxe"
                        className="w-full h-full object-contain drop-shadow-lg"
                      />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-xs mt-1">
                    {product.category}
                  </p>
                  <div className="flex flex-col mt-2 gap-1 text-left w-full">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-md font-bold text-gray-900">
                        ₹{price || 'N/A'}
                      </span>
                      {mrp > price && (
                        <span className="text-xs text-gray-500 line-through">
                          ₹{mrp}
                        </span>
                      )}
                    </div>
                    {bestCouponPrice && (
                      <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 w-fit text-[9px] font-bold uppercase tracking-wider mt-0.5">
                        <Tag size={9} className="fill-current text-emerald-600 shrink-0" />
                        <span>Save ₹{(price - bestCouponPrice).toLocaleString('en-IN')} with coupon</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading && (
        <p className="text-center py-8 text-gray-500">No similar products found.</p>
      )}
    </div>
  );
};

export default SimilarItems;
