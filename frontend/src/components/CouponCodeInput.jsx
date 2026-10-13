import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { Tag, X, CheckCircle2, ChevronDown, Info } from 'lucide-react';
import { isCouponExpired } from '../../../shared/couponValidity.js';

const CouponCodeInput = ({ items, onCouponApply, selectedPayment, appliedCoupon }) => {
    const [couponCode, setCouponCode] = useState('');
    const [appliedCode, setAppliedCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [offers, setOffers] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const { token, user } = useAuthStore();
    const url = import.meta.env.VITE_BACKEND_URL;

    // Sync internal appliedCode with prop from parent
    useEffect(() => {
        if (appliedCoupon) {
            setAppliedCode(appliedCoupon.code);
            setCouponCode(appliedCoupon.code);
        } else {
            setAppliedCode(null);
            setCouponCode('');
        }
    }, [appliedCoupon]);

    useEffect(() => {
        const fetchOffers = async () => {
            if (!token) return;
            try {
                const response = await axios.get(`${url}/api/coupon/all`, { headers: { token } });
                if (response.data.success) {
                    const filteredOffers = response.data.coupons.filter(c =>
                        c.isActive &&
                        !isCouponExpired(c) &&
                        (c.offerType === 'prepaid' || c.offerType === 'cod') // Only show payment-specific coupons
                    );
                    setOffers(filteredOffers);
                }
            } catch (err) {
                console.error("Error fetching offers:", err);
            }
        };
        fetchOffers();
    }, [url, token]);

    const handleApplyCoupon = async (codeToApply = couponCode) => {
        const code = codeToApply.trim().toUpperCase();
        if (!code) {
            toast.error('Please enter a coupon code.');
            return;
        }

        // Check if this coupon is already applied to any item
        const alreadyApplied = items.some(item => item.appliedCoupon?.toUpperCase() === code);
        if (alreadyApplied) {
            toast.error('This coupon is already applied to an item in your cart.');
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
        <section aria-labelledby="checkout-coupons-heading" className="min-w-0 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6">
            <h2 id="checkout-coupons-heading" className="mb-5 flex items-center gap-3 font-sans text-base font-semibold text-stone-900"><Tag size={19} strokeWidth={1.6} className="shrink-0 text-rose-700" aria-hidden="true" />Coupons & Offers</h2>
            {!appliedCode ? (
                <form onSubmit={event => { event.preventDefault(); if (!loading) handleApplyCoupon(); }}>
                    <label htmlFor="checkout-coupon-code" className="sr-only">Coupon code</label>
                    <div className="flex flex-wrap gap-2">
                        <input id="checkout-coupon-code" autoComplete="off" type="text" placeholder="Enter coupon code..." value={couponCode} onChange={event => setCouponCode(event.target.value.toUpperCase())} disabled={loading} className="min-h-12 min-w-0 flex-1 basis-32 rounded-lg border border-stone-200 px-3 py-3 text-base uppercase outline-none placeholder:normal-case focus:border-rose-500 focus:ring-2 focus:ring-rose-100 sm:text-sm" />
                        <button type="submit" disabled={loading || !couponCode.trim()} className="min-h-12 rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Applying…' : 'Apply'}</button>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-stone-500">{items.some(item => item.appliedCoupon) ? 'Your product coupons are already included in the total.' : 'Have a code? Add it here before placing your order.'}</p>
                </form>
            ) : (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-700" aria-hidden="true" />
                    <div className="min-w-0 flex-1"><p className="text-xs text-emerald-700">Coupon applied</p><p className="break-words text-sm font-semibold text-stone-900">{appliedCode}</p></div>
                    <button type="button" aria-label="Remove coupon" onClick={handleRemoveCoupon} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100"><X size={18} aria-hidden="true" /></button>
                </div>
            )}
            {offers.length > 0 && (
                <div className="mt-4 border-t border-stone-100 pt-2">
                    <button type="button" aria-expanded={isExpanded} aria-controls="checkout-available-offers" onClick={() => setIsExpanded(!isExpanded)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded text-sm font-medium text-stone-600 hover:text-rose-700">
                        <span>Available offers <span className="ml-1 text-xs text-stone-400">({offers.length})</span></span>
                        <ChevronDown size={16} aria-hidden="true" className={'shrink-0 transition-transform ' + (isExpanded ? 'rotate-180' : '')} />
                    </button>
                    {isExpanded && <div id="checkout-available-offers" className="mt-3 space-y-3">
                        {offers.map(offer => {
                            const isAlreadyAppliedToItem = items.some(item => item.appliedCoupon?.toUpperCase() === offer.code.toUpperCase());
                            const paymentMethod = (selectedPayment || '').toLowerCase();
                            const isEligible = ((offer.offerType === 'prepaid' && ['card', 'razorpay', 'stripe'].includes(paymentMethod)) || (offer.offerType === 'cod' && paymentMethod === 'cod')) && !isAlreadyAppliedToItem;
                            return (
                                <div key={offer._id} className="rounded-xl border border-stone-200 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="min-w-0"><p className="break-words text-sm font-semibold text-stone-900">{offer.code}</p><p className="mt-1 text-[11px] text-stone-500">{offer.offerType === 'prepaid' ? 'Online payments' : 'Cash on delivery'}</p></div>
                                        {isEligible && !appliedCode && <button type="button" disabled={loading} aria-label={'Apply coupon ' + offer.code} onClick={() => handleApplyCoupon(offer.code)} className="min-h-11 rounded-lg px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40">Apply</button>}
                                    </div>
                                    <p className="mt-2 break-words text-xs leading-5 text-stone-600">{offer.description || 'Save on your order with this coupon.'}</p>
                                    {!isEligible && <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-stone-500"><Info size={13} className="mt-1 shrink-0" aria-hidden="true" /><span>{isAlreadyAppliedToItem ? 'Already applied to an item in your cart.' : 'Select ' + (offer.offerType === 'prepaid' ? 'online payment' : 'cash on delivery') + ' to use this offer.'}</span></p>}
                                </div>
                            );
                        })}
                    </div>}
                </div>
            )}
        </section>
    );
};

export default CouponCodeInput;
