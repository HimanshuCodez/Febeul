import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { Tag } from 'lucide-react';

const CouponCodeInput = ({ items, onCouponApply, selectedPayment }) => {
    const [couponCode, setCouponCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [offers, setOffers] = useState([]);
    const { token, user } = useAuthStore();
    const url = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                const response = await axios.get(`${url}/api/coupon/all`);
                if (response.data.success) {
                    const filteredOffers = response.data.coupons.filter(c => c.offerType === 'prepaid' || c.offerType === 'cod');
                    setOffers(filteredOffers);
                }
            } catch (err) {
                console.error("Error fetching offers:", err);
            }
        };
        fetchOffers();
    }, [url]);

    const handleApplyCoupon = async (codeToApply = couponCode) => {
        const code = codeToApply.trim();
        if (!code) {
            toast.error('Please enter a coupon code.');
            return;
        }
        if (!token) {
            toast.error('You must be logged in to apply a coupon.');
            return;
        }
        if (!items || items.length === 0) {
            toast.error('No items in cart to apply coupon.');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${url}/api/coupon/apply`, 
                { code, items, userId: user?._id, paymentMethod: selectedPayment },
                { headers: { token } }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                onCouponApply(response.data);
                if (codeToApply !== couponCode) setCouponCode(code);
            } else {
                toast.error(response.data.message);
                onCouponApply(null);
            }
        } catch (error) {
            console.error("Error applying coupon:", error);
            const errorMessage = error.response?.data?.message || 'Failed to apply coupon.';
            toast.error(errorMessage);
            onCouponApply(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-6">
            <label htmlFor="coupon-code" className="block text-sm font-medium text-gray-700 mb-2">
                Have a Coupon Code?
            </label>
            <div className="flex rounded-md shadow-sm">
                <div className="relative flex-grow focus-within:z-10">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Tag className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        id="coupon-code"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-l-md focus:ring-pink-500 focus:border-pink-500 text-sm"
                        placeholder="ENTER COUPON"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={loading}
                    />
                </div>
                <button
                    onClick={() => handleApplyCoupon()}
                    disabled={loading}
                    className="relative -ml-px px-4 py-2 border border-transparent text-sm font-semibold rounded-r-md text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400"
                >
                    {loading ? 'Applying...' : 'Apply'}
                </button>
            </div>

            {offers.length > 0 && (
                <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Special Offers</p>
                    <div className="flex flex-wrap gap-2">
                        {offers.map(offer => (
                            <button
                                key={offer._id}
                                onClick={() => handleApplyCoupon(offer.code)}
                                disabled={loading}
                                className={`text-xs px-2 py-1 rounded-md border transition-all flex flex-col items-start ${
                                    (offer.offerType === 'prepaid' && selectedPayment === 'card') || (offer.offerType === 'cod' && selectedPayment === 'cod')
                                    ? 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 opacity-70'
                                }`}
                            >
                                <span className="font-bold">{offer.code}</span>
                                <span className="text-[10px]">{offer.offerType === 'prepaid' ? 'Prepaid Only' : 'COD Only'}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponCodeInput;
