import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Tag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RedeemPopup from './RedeemApply';
import useAuthStore from '../store/authStore';
import { toast } from 'react-hot-toast';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const CouponShows = ({ productSKUs = [], onRedeem = () => {}, onRemove = () => {}, appliedCoupon = null, selectedPayment = "" }) => {
  const { user, cartItems, token } = useAuthStore();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  useEffect(() => {
    const fetchCoupons = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${backendUrl}/api/coupon/all`, { headers: { token } });
        if (response.data.success) {
          // Show all active coupons
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
  }, [token]);

  const handleRedeemClick = (coupon) => {
    if (coupon.userType === 'luxe' && !user?.isLuxeMember) {
      toast.error("This coupon is reserved for Luxe Members only.");
      navigate('/luxe');
      return;
    }

    if (selectedPayment && coupon.offerType !== 'none' && (
      (coupon.offerType === 'prepaid' && selectedPayment !== 'card') ||
      (coupon.offerType === 'cod' && selectedPayment !== 'cod')
    )) {
      toast.error(`This coupon is only valid for ${coupon.offerType === 'prepaid' ? 'Online Payment' : 'Cash on Delivery'} orders.`);
      return;
    }

    if (appliedCoupon) {
      if (appliedCoupon.code === coupon.code) {
        toast.error("This coupon is already applied.");
        return;
      }
      // If another coupon is already applied, we inform the user it will be replaced
      toast.success(`Replacing coupon ${appliedCoupon.code} with ${coupon.code}`);
    }

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

  const applicableCoupons = coupons.filter(coupon => 
    (coupon.offerType === 'none' || !coupon.offerType) && // Filter out cod and prepaid
    (coupon.applicableSKUs.length === 0 || 
    productSKUs.some(sku => coupon.applicableSKUs.includes(sku)))
  );

  if (applicableCoupons.length === 0) {
    return (
      <div className="my-8 text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <Tag size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No coupons available for you at the moment.</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-bold">Check back later for exclusive deals!</p>
      </div>
    );
  }

  return (
    <div className="my-4">
      <h2 className="text-lg font-bold text-gray-800 mb-3">Available Coupons</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
        {applicableCoupons.map((coupon) => {
          const isApplied = appliedCoupon && appliedCoupon.code === coupon.code;
          const isLuxeRestricted = coupon.userType === 'luxe' && !user?.isLuxeMember;

          // Check if quantity condition is met
          let currentQuantity = 0;
          if (coupon.applicableSKUs && coupon.applicableSKUs.length > 0) {
            currentQuantity = cartItems
              .filter(item => coupon.applicableSKUs.includes(item.sku))
              .reduce((sum, item) => sum + item.quantity, 0);
          } else {
            currentQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
          }

          const isQuantityRestricted = coupon.minQuantity > 0 && currentQuantity < coupon.minQuantity;
          const itemsNeeded = coupon.minQuantity - currentQuantity;

          // Check if min order amount is met
          let currentAmount = 0;
          if (coupon.applicableSKUs && coupon.applicableSKUs.length > 0) {
            currentAmount = cartItems
              .filter(item => coupon.applicableSKUs.includes(item.sku))
              .reduce((sum, item) => sum + (item.price * item.quantity), 0);
          } else {
            currentAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          }

          const isAmountRestricted = coupon.minOrderAmount > 0 && currentAmount < coupon.minOrderAmount;
          
          const isPaymentRestricted = false;

          const isDisabled = isLuxeRestricted || isQuantityRestricted || isAmountRestricted;

          return (
            <div key={coupon._id} className={`flex-shrink-0 snap-start w-[280px] flex flex-col justify-between gap-3 p-4 border rounded-xl transition-all ${
              isDisabled ? 'bg-gray-50 border-gray-100 opacity-80' : 'bg-white border-blue-100 hover:shadow-lg'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
                  <Tag size={20} className={isDisabled ? 'text-gray-400' : 'text-blue-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-black uppercase tracking-wider text-sm ${isDisabled ? 'text-gray-500' : 'text-gray-800'}`}>{coupon.code}</h3>
                  {coupon.description && <p className="text-xs text-gray-600 line-clamp-2 mt-1">{coupon.description}</p>}
                </div>
              </div>

              <div className="space-y-1 mt-auto">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                  {coupon.minOrderAmount > 0 && (
                    <p className={isAmountRestricted ? 'text-red-500' : 'text-green-600'}>
                      Min. Order: ₹{coupon.minOrderAmount}
                    </p>
                  )}
                  {coupon.minQuantity > 0 && (
                    <p className={isQuantityRestricted ? 'text-red-500' : 'text-green-600'}>
                      Min. Quantity: {coupon.minQuantity}
                    </p>
                  )}
                  {coupon.discountType === 'percentage' ? (
                    <p className="text-blue-600">{coupon.discountValue}% OFF</p>
                  ) : (
                    <p className="text-blue-600">₹{coupon.discountValue} OFF</p>
                  )}
                  {coupon.userType === 'luxe' && (
                    <p className={`font-black mt-1 ${user?.isLuxeMember ? 'text-amber-600' : 'text-amber-500'}`}>
                      {user?.isLuxeMember ? '✨ LUXE EXCLUSIVE' : '🔒 LUXE ONLY'}
                    </p>
                  )}
                </div>

                {!isApplied ? (
                  <button
                    onClick={() => handleRedeemClick(coupon)}
                    disabled={(isQuantityRestricted || isAmountRestricted) && !isLuxeRestricted}
                    className={`w-full mt-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                      isLuxeRestricted 
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                      : isDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : appliedCoupon 
                      ? 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                    }`}
                  >
                    {isLuxeRestricted ? 'Join Luxe' : (isQuantityRestricted || isAmountRestricted) ? 'Locked' : appliedCoupon ? 'Apply' : 'Redeem'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="flex-1 bg-green-500 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] text-center">
                      Applied
                    </span>
                    <button 
                      onClick={() => onRemove()}
                      className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      title="Remove Coupon"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
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