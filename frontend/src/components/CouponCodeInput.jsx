import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { Tag, Ticket, X, CheckCircle2, Sparkles, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CouponCodeInput = ({ items, onCouponApply, selectedPayment }) => {
    const [couponCode, setCouponCode] = useState('');
    const [appliedCode, setAppliedCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [offers, setOffers] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const { token, user } = useAuthStore();
    const url = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                const response = await axios.get(`${url}/api/coupon/all`);
                if (response.data.success) {
                    const filteredOffers = response.data.coupons.filter(c => 
                        c.isActive && new Date(c.expiryDate) > new Date()
                    );
                    setOffers(filteredOffers);
                }
            } catch (err) {
                console.error("Error fetching offers:", err);
            }
        };
        fetchOffers();
    }, [url]);

    const handleApplyCoupon = async (codeToApply = couponCode) => {
        const code = codeToApply.trim().toUpperCase();
        if (!code) {
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
                { code, items, userId: user?._id, paymentMethod: selectedPayment },
                { headers: { token } }
            );

            if (response.data.success) {
                toast.success(response.data.message, {
                    icon: '🎉',
                    style: { borderRadius: '10px', background: '#333', color: '#fff' }
                });
                setAppliedCode(code);
                onCouponApply(response.data);
                if (codeToApply !== couponCode) setCouponCode(code);
            } else {
                toast.error(response.data.message);
                onCouponApply(null);
            }
        } catch (error) {
            console.error("Error applying coupon:", error);
            toast.error(error.response?.data?.message || 'Failed to apply coupon.');
            onCouponApply(null);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCode(null);
        setCouponCode('');
        onCouponApply(null);
        toast.success('Coupon removed');
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-pink-50 rounded-lg">
                    <Ticket className="w-5 h-5 text-pink-500" />
                </div>
                <h3 className="font-bold text-gray-800 tracking-tight">Coupons & Offers</h3>
            </div>

            <AnimatePresence mode='wait'>
                {!appliedCode ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="relative"
                    >
                        <div className="flex gap-2">
                            <div className="relative flex-1 group">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all text-sm font-medium uppercase placeholder:normal-case"
                                    placeholder="Enter coupon code..."
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    disabled={loading}
                                />
                            </div>
                            <button
                                onClick={() => handleApplyCoupon()}
                                disabled={loading || !couponCode}
                                className="px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-lg shadow-gray-900/10 active:scale-95"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : 'APPLY'}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                                <CheckCircle2 size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Coupon Applied</p>
                                <p className="text-sm font-bold text-gray-800">{appliedCode}</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleRemoveCoupon}
                            className="p-2 hover:bg-green-100 rounded-lg text-green-600 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {offers.length > 0 && (
                <div className="mt-6 pt-4 border-t border-dashed border-gray-100">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center justify-between w-full group"
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Available Offers</span>
                            <span className="bg-pink-100 text-pink-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{offers.length}</span>
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400 group-hover:text-pink-500 transition-colors" />}
                    </button>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="grid gap-3 mt-4">
                                    {offers.map((offer) => {
                                        const isEligible = (offer.offerType === 'prepaid' && (selectedPayment === 'card' || selectedPayment === 'Razorpay' || selectedPayment === 'Stripe')) || 
                                                         (offer.offerType === 'cod' && selectedPayment === 'COD') ||
                                                         (offer.offerType === 'none');
                                        
                                        return (
                                            <div 
                                                key={offer._id}
                                                className={`group relative overflow-hidden rounded-xl border p-3 transition-all ${
                                                    isEligible 
                                                    ? 'border-gray-200 hover:border-pink-200 bg-white' 
                                                    : 'border-gray-100 bg-gray-50/50 grayscale'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-sm tracking-tight text-gray-800">{offer.code}</span>
                                                        {offer.offerType !== 'none' && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                                                                offer.offerType === 'prepaid' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                                                            }`}>
                                                                {offer.offerType} Only
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isEligible && !appliedCode && (
                                                        <button 
                                                            onClick={() => handleApplyCoupon(offer.code)}
                                                            className="text-xs font-bold text-pink-500 hover:text-pink-600 transition-colors"
                                                        >
                                                            APPLY
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 leading-tight pr-8">{offer.description || 'Save more on your order with this exclusive coupon.'}</p>
                                                {!isEligible && (
                                                    <div className="mt-2 flex items-center gap-1 text-[9px] text-gray-400 font-medium">
                                                        <Info size={10} />
                                                        <span>Switch to {offer.offerType === 'prepaid' ? 'Online Payment' : 'COD'} to use this</span>
                                                    </div>
                                                )}
                                                
                                                {/* Fancy "Ticket" Cuts */}
                                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-gray-200 rounded-full" />
                                                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-gray-200 rounded-full" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default CouponCodeInput;
