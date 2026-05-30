import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { toast } from 'react-hot-toast';
import Loader from './Loader';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// Global cache to avoid redundant API calls
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

const SimilarItems = ({ productId, token }) => {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Similar Items</h2>
      
      {similarProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                const isApplicableSKU = !coupon.applicableSKUs || coupon.applicableSKUs.length === 0 || coupon.applicableSKUs.includes(sku);
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
                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer"
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
                  <div className="flex items-center mt-2 gap-1.5 flex-wrap">
                    {bestCouponPrice ? (
                      <>
                        <span className="text-md font-bold text-green-600">
                          ₹{bestCouponPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-gray-400 line-through">
                          ₹{price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded border border-green-100 uppercase tracking-tighter">Coupon</span>
                      </>
                    ) : (
                      <>
                        <span className="text-md font-bold text-gray-900">
                          ₹{price || 'N/A'}
                        </span>
                        {mrp > price && (
                          <span className="text-xs text-gray-500 line-through ml-2">
                            ₹{mrp}
                          </span>
                        )}
                      </>
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
