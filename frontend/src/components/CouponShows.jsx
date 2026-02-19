import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Tag } from 'lucide-react';
import RedeemPopup from './RedeemApply';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const CouponShows = ({ productSKUs = [], onRedeem = () => {}, appliedCoupon = null }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/coupon/all`);
        if (response.data.success) {
          setCoupons(response.data.coupons);
        } else {
          setError(response.data.message || 'Failed to fetch coupons.');
        }
      } catch (err) {
        console.error('Error fetching coupons:', err);
        setError('Error fetching coupons. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, []);

  const handleRedeemClick = (coupon) => {
    setSelectedCoupon(coupon);
    setIsModalOpen(true);
    onRedeem(coupon.code);
  };

  if (loading) {
    return <div className="my-4 text-center text-gray-600">Loading coupons...</div>;
  }

  if (error) {
    return <div className="my-4 text-center text-red-600">{error}</div>;
  }

  if (coupons.length === 0) {
    return <div className="my-4 text-center text-gray-600">No coupons available at the moment.</div>;
  }

  return (
    <div className="my-4">
      <h2 className="text-lg font-bold text-gray-800 mb-3">Available Coupons</h2>
      <div className="grid grid-cols-1 gap-4">
        {coupons.map((coupon) => {
          const isSKUApplicable = coupon.applicableSKUs.length === 0 || 
                                 productSKUs.some(sku => coupon.applicableSKUs.includes(sku));
          
          if (!isSKUApplicable) return null; // Don't show coupon if not applicable to product SKUs

          const isApplied = appliedCoupon && appliedCoupon.code === coupon.code;

          return (
            <div key={coupon._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Tag size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{coupon.code}</h3>
                  <p className="text-sm text-gray-600">{coupon.description || 'No description available.'}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    {coupon.minOrderAmount > 0 && <p>Min. Order: ₹{coupon.minOrderAmount}</p>}
                    {coupon.discountType === 'percentage' ? (
                      <p>Discount: {coupon.discountValue}% off</p>
                    ) : (
                      <p>Discount: ₹{coupon.discountValue} off</p>
                    )}
                    {coupon.expiryDate && <p>Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</p>}
                    {coupon.userType === 'luxe' && <p className="font-semibold text-blue-700">For Luxe Members Only</p>}
                  </div>
                </div>
              </div>
              {!isApplied && (
                <button
                  onClick={() => handleRedeemClick(coupon)}
                  className="ml-auto sm:ml-0 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors"
                >
                  Redeem
                </button>
              )}
              {isApplied && (
                <span className="ml-auto sm:ml-0 bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm font-medium border border-green-200">
                  Applied
                </span>
              )}
            </div>
          );
        })}
      </div>

      <RedeemPopup 
        open={isModalOpen} 
        handleClose={() => setIsModalOpen(false)} 
        coupon={selectedCoupon} 
      />
    </div>
  );
};

export default CouponShows;