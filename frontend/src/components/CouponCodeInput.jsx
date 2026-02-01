import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { Tag } from 'lucide-react';

const CouponCodeInput = ({ cartTotal, onCouponApply }) => {
    const [couponCode, setCouponCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useAuthStore();
    const url = import.meta.env.VITE_BACKEND_URL;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            toast.error('Please enter a coupon code.');
            return;
        }
        if (!token) {
            toast.error('You must be logged in to apply a coupon.');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${url}/api/coupon/apply`, 
                { code: couponCode, cartTotal },
                { headers: { token } }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                onCouponApply(response.data);
            } else {
                toast.error(response.data.message);
                onCouponApply(null); // Signal that coupon is invalid or not applicable
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
                    onClick={handleApplyCoupon}
                    disabled={loading}
                    className="relative -ml-px px-4 py-2 border border-transparent text-sm font-semibold rounded-r-md text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400"
                >
                    {loading ? 'Applying...' : 'Apply'}
                </button>
            </div>
        </div>
    );
};

export default CouponCodeInput;
