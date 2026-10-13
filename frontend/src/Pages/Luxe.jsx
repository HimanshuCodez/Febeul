import React, { useState, useEffect, useCallback, useRef } from "react";
import { isCouponExpired } from '../../../shared/couponValidity.js';
import useAuthStore from "../store/authStore";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { FaCrown, FaCheckCircle, FaStar, FaShieldAlt } from "react-icons/fa";
import ProductCard from "../components/ProductCard";
import Loader from "../components/Loader";
import { toast } from "react-hot-toast";
import { resolveLuxeAppearance, luxeAppearanceStyle, luxeFontUrl } from '../../../shared/luxeAppearance.js';

const defaultFeatures = [
  { img: "/bus.png", title: "PRIORITY DELIVERY", desc: "Fast-track shipping on every order" },
  { img: "/gifs.png", title: "15 GIFT WRAPS", desc: "Premium packaging for your loved ones" },
  { img: "/bags.png", title: "LUXE PRIVE SALES", desc: "Exclusive access to boutique collections" },
  { img: "/discount.png", title: "EXCLUSIVE COUPONS", desc: "Vouchers included with every purchase" },
  { img: "/customer.png", title: "VIP SUPPORT", desc: "Dedicated concierge for all your needs" },
  { img: "/free_delivery.png", title: "FREE SHIPPING", desc: "Zero delivery charges, nationwide" },
];

export default function FebeulLuxe() {
  const { user, token, isAuthenticated, getProfile } = useAuthStore();
  const [razorpayKey, setRazorpayKey] = useState("");
  const navigate = useNavigate();
  const [showPromo, setShowPromo] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [siteSettings, setSiteSettings] = useState({ 
    membershipPrice: 129, 
    membershipPriceOriginal: 152 
  });

  const [luxeProducts, setLuxeProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [membershipCoupons, setMembershipCoupons] = useState([]);
  const couponInput = useRef(null);
  const [pageContent, setPageContent] = useState({});
  const pageText = (section, key, fallback) => typeof pageContent[section]?.[key] === 'string' ? pageContent[section][key] : fallback;
  const features = Array.isArray(pageContent.features) ? pageContent.features : defaultFeatures;
  const appearance = resolveLuxeAppearance(pageContent.appearance);
  const appearanceStyle = luxeAppearanceStyle(appearance);
  const fontUrl = luxeFontUrl(appearance);

  useEffect(() => {
    if (!fontUrl) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
    return () => link.remove();
  }, [fontUrl]);

  useEffect(() => {
    const controller = new AbortController();
    setMembershipCoupons([]);
    if (isAuthenticated && user?.isLuxeMember) return;

    const signedIn = Boolean(isAuthenticated && token);
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/coupon/${signedIn ? 'all' : 'active'}`, {
      params: { purpose: 'membership' },
      ...(signedIn ? { headers: { token } } : {}),
      signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted || !data.success) return;
      setMembershipCoupons((data.coupons || []).filter(coupon =>
        coupon.userType === 'membership' && coupon.isActive && !isCouponExpired(coupon)
      ));
    }).catch(error => {
      if (!axios.isCancel(error)) console.error('Error fetching membership coupons:', error);
    });

    return () => controller.abort();
  }, [isAuthenticated, token, user?.isLuxeMember]);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cms/luxePage`, { signal: controller.signal })
      .then(({ data }) => {
        if (data.success && data.content && typeof data.content === 'object' && !Array.isArray(data.content)) {
          setPageContent(data.content);
        }
      })
      .catch(error => {
        if (!axios.isCancel(error)) console.error('Error fetching Luxe page content:', error);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cms/siteSettings`);
        if (response.data.success && response.data.content) {
          setSiteSettings(current => ({ ...current, ...response.data.content }));
        }
      } catch (error) {
        console.error("Error fetching site settings:", error);
      }
    };
    fetchSiteSettings();
  }, []);

  const fetchLuxePriveProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/product/list?isLuxePrive=true`,
        { headers: { token } }
      );
      if (response.data.success) {
        setLuxeProducts(response.data.products);
      }
    } catch (error) {
      console.error("Failed to fetch Luxe Prive products", error);
    } finally {
      setTimeout(() => {
        setLoadingProducts(false);
      }, 2000);
    }
  }, [token]);

  useEffect(() => {
    const fetchRazorpayKey = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/order/get-key`);
        if (response.data.success) {
          setRazorpayKey(response.data.key);
        }
      } catch (error) {
        console.error("Failed to fetch razorpay key", error);
      }
    };
    fetchRazorpayKey();

    if (isAuthenticated && user?.isLuxeMember) {
      fetchLuxePriveProducts();
    } else {
        setLoadingProducts(false);
    }
  }, [isAuthenticated, user?.isLuxeMember, token, fetchLuxePriveProducts]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    setCouponLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/coupon/apply-product-coupon`,
        {
          code: couponCode.trim(),
          productItem: {
            sku: "LUXE-MEMBERSHIP",
            price: siteSettings.membershipPrice || 129,
            quantity: 1,
          },
          userId: user._id,
        },
        { headers: { token } }
      );

      if (response.data.success) {
        setAppliedCoupon({
          code: response.data.code,
          discountAmount: response.data.discountAmount,
        });
        toast.success(response.data.message || "Coupon applied!");
      } else {
        setAppliedCoupon(null);
        toast.error(response.data.message || "Invalid coupon code.");
      }
    } catch (error) {
      setAppliedCoupon(null);
      toast.error(error.response?.data?.message || "Failed to apply coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handlePayment = async () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    setIsProcessing(true);
    const amount = siteSettings.membershipPrice || 129;
    const items = [
      {
        productId: "60d5ecb8b3b1c8e1e8e8e8e8",
        name: "Febeul Luxe Membership",
        price: amount,
        quantity: 1,
        description: "1 Month Febeul Luxe Membership",
      },
    ];
    const address = {
      street: "123 Luxe Lane",
      city: "Febeul",
      state: "Online",
      zip: "00000",
      country: "India",
    };

    try {
      const orderResponse = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/order/razorpay`,
        {
          userId: user._id,
          items,
          amount,
          address,
          currency: "INR",
          couponCode: appliedCoupon?.code,
        },
        { headers: { token } }
      );

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.message || "Order creation failed");
      }

      const { order } = orderResponse.data;

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "FEBEUL",
        description: "Febeul Luxe Membership",
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyResponse = await axios.post(
              `${import.meta.env.VITE_BACKEND_URL}/api/order/verifyRazorpay`,
              {
                userId: user._id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: { token } }
            );

            if (verifyResponse.data.success) {
              toast.success("Payment successful! Welcome to Febeul Luxe.");
              await getProfile();
              navigate('/PrimeMember');
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification error.");
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.mobile,
        },
        notes: {
          address: "Febeul Luxe Digital Membership",
        },
        theme: {
          color: appearance.buttonBackgroundColor,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment failed", error);
      toast.error(error.message || "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  if (isAuthenticated && user?.isLuxeMember) {
    return (
      <section aria-label="Luxe page" style={appearanceStyle} className="w-full bg-[var(--luxe-background-color)] text-[var(--luxe-text-color)] [font-family:var(--luxe-body-font)] py-12 px-6 min-h-screen">
        {loadingProducts && <Loader />}
        <div className="text-center mb-10 flex flex-col items-center gap-4">
          <p className="[font-family:var(--luxe-body-font)] tracking-[0.5em] text-[var(--luxe-text-color)] uppercase text-xs">{pageText('member', 'eyebrow', 'Member Exclusive')}</p>
          <h1 className="max-w-full break-words text-5xl [font-family:var(--luxe-heading-font)] font-bold text-[var(--luxe-heading-color)] italic">{pageText('member', 'title', 'LUXE PRIVE SALE')}</h1>
        </div>

        {luxeProducts.length > 0 ? (
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {luxeProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : !loadingProducts && (
          <div className="text-center py-20">
            <h2 className="text-2xl [font-family:var(--luxe-heading-font)] font-bold text-[var(--luxe-heading-color)] mb-2 italic">{pageText('member', 'emptyTitle', 'New Arrivals Coming Soon')}</h2>
            <p className="whitespace-pre-line text-[var(--luxe-text-color)] [font-family:var(--luxe-body-font)] text-sm">{pageText('member', 'emptyDescription', 'Check back later for your exclusive Luxe Prive collection.')}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Luxe page" style={appearanceStyle} className="w-full bg-[var(--luxe-background-color)] text-[var(--luxe-text-color)] [font-family:var(--luxe-body-font)] py-12 px-6 min-h-screen">
      
      <div className="text-center mb-12 flex flex-col items-center gap-4">
        
        <div className="max-w-full space-y-1 break-words">
          <h1 className="text-5xl md:text-6xl [font-family:var(--luxe-heading-font)] font-bold text-[var(--luxe-heading-color)] italic">{pageText('hero', 'title', 'Luxe Membership')}</h1>
          <p className="[font-family:var(--luxe-body-font)] tracking-[0.5em] text-[var(--luxe-text-color)] uppercase text-xs font-light">{pageText('hero', 'subtitle', 'Experience The Elite')}</p>
        </div>
      </div>

      {/* Promo Banner */}
      <AnimatePresence>
        {showPromo && pageContent.promo?.enabled !== false && (
          <Motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto rounded-2xl overflow-hidden mb-12 shadow-sm"
          >
            <div className="bg-[var(--luxe-banner-background-color)] text-[var(--luxe-banner-text-color)] py-4 px-8 relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FaCrown className="text-2xl text-yellow-300" />
                <div>
                  <p className="[font-family:var(--luxe-body-font)] font-bold text-sm tracking-widest uppercase">{pageText('promo', 'title', 'Join Febeul Luxe Today')}</p>
                  <p className="whitespace-pre-line text-xs font-light opacity-90 [font-family:var(--luxe-body-font)]">{pageText('promo', 'description', 'Unlock exclusive sales and premium benefits instantly.')}</p>
                </div>
              </div>
              <button 
                type="button"
                aria-label="Dismiss Luxe promotion"
                onClick={() => setShowPromo(false)}
                className="text-[var(--luxe-banner-text-color)] hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Features Grid */}
      {features.length > 0 && (
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8 text-center mb-16">
        {features.map((feature, i) => (
          <Motion.div
            key={feature.id || i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex min-w-0 flex-col items-center break-words"
          >
            <div className="h-40 flex items-center justify-center mb-4">
              <img src={feature.img} alt={feature.title} className="h-28 w-28 sm:h-36 sm:w-36 object-contain hover:scale-110 transition-transform duration-500" />
            </div>
            <h3 className="max-w-full [font-family:var(--luxe-body-font)] font-bold text-xs tracking-[0.2em] text-[var(--luxe-heading-color)] uppercase mb-2">{feature.title}</h3>
            <p className="max-w-full whitespace-pre-line text-[10px] text-[var(--luxe-text-color)] [font-family:var(--luxe-body-font)] uppercase tracking-wider">{feature.desc}</p>
          </Motion.div>
        ))}
      </div>
      )}

      {/* Bottom Card */}
      <div className="max-w-md mx-auto bg-[var(--luxe-card-background-color)] rounded-3xl shadow-[0_20px_50px_var(--luxe-border-faint)] border border-[var(--luxe-border-faint)] px-8 py-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--luxe-border-color)] via-[var(--luxe-accent-color)] to-[var(--luxe-border-color)]" />
        
        <div className="mb-6">
            <span className="[font-family:var(--luxe-body-font)] tracking-widest text-[var(--luxe-text-color)] uppercase text-[10px] font-bold">{pageText('offer', 'label', 'Limited Time Offer')}</span>
        </div>

        <div className="flex items-center justify-center gap-4 mb-2">
          <span className="text-[var(--luxe-text-color)] line-through text-xl font-light">₹{siteSettings.membershipPriceOriginal}</span>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[var(--luxe-heading-color)] [font-family:var(--luxe-heading-font)] font-bold text-5xl">
              ₹{Math.max(0, (siteSettings.membershipPrice || 129) - (appliedCoupon?.discountAmount || 0)).toFixed(0)}
            </span>
            <span className="text-[10px] text-[var(--luxe-text-color)] [font-family:var(--luxe-body-font)] font-bold uppercase tracking-tighter mt-1">{pageText('offer', 'period', 'Per Month')}</span>
          </div>
        </div>

        {appliedCoupon && (
          <p className="text-[10px] text-[var(--luxe-accent-color)] [font-family:var(--luxe-body-font)] font-bold uppercase tracking-wider mb-4">
            {pageText('coupon', 'label', 'Coupon')} "{appliedCoupon.code}" {pageText('coupon', 'appliedLabel', 'applied')} · -₹{appliedCoupon.discountAmount.toFixed(0)}
          </p>
        )}

        {!appliedCoupon && membershipCoupons.length > 0 && (
          <section aria-label="Luxe membership coupons" className="mb-4 mt-6 text-left">
            <h2 className="mb-3 [font-family:var(--luxe-body-font)] text-xs font-bold text-[var(--luxe-heading-color)]">Membership offers</h2>
            <div className="space-y-2">
              {membershipCoupons.map(coupon => (
                <div key={coupon._id || coupon.code} className="rounded-xl border border-dashed border-[var(--luxe-heading-border)] bg-[var(--luxe-background-color)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-all [font-family:var(--luxe-body-font)] text-xs font-bold tracking-wide text-[var(--luxe-heading-color)]">{coupon.code}</span>
                    <button
                      type="button"
                      aria-label={`Use coupon ${coupon.code}`}
                      disabled={couponLoading || isProcessing}
                      onClick={() => { setCouponCode(coupon.code); couponInput.current?.focus({ preventScroll: true }); }}
                      className="shrink-0 rounded-lg border border-[var(--luxe-button-border)] bg-[var(--luxe-card-background-color)] px-3 py-2 [font-family:var(--luxe-body-font)] text-[10px] font-bold text-[var(--luxe-heading-color)] transition-colors hover:bg-[var(--luxe-button-background-color)] hover:text-[var(--luxe-button-text-color)] disabled:opacity-50 focus-visible:outline-[var(--luxe-heading-color)]"
                    >
                      Use code
                    </button>
                  </div>
                  <p className="mt-1 [font-family:var(--luxe-body-font)] text-xs font-semibold text-[var(--luxe-heading-color)]">
                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}% off membership` : `₹${Number(coupon.discountValue).toLocaleString('en-IN')} off membership`}
                  </p>
                  {coupon.description && <p className="mt-1 break-words [font-family:var(--luxe-body-font)] text-[11px] leading-relaxed text-[var(--luxe-description-color)]">{coupon.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mb-8">
          {!appliedCoupon ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                ref={couponInput}
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                placeholder={pageText('coupon', 'placeholder', 'Have a coupon?')}
                aria-label={pageText('coupon', 'placeholder', 'Have a coupon?') || 'Coupon code'}
                className="min-w-0 flex-1 bg-[var(--luxe-card-background-color)] px-4 py-2.5 border border-[var(--luxe-border-soft)] rounded-xl text-xs [font-family:var(--luxe-body-font)] font-bold uppercase tracking-wider text-[var(--luxe-heading-color)] placeholder:text-[var(--luxe-placeholder)] placeholder:normal-case placeholder:font-medium focus:outline-none focus:border-[var(--luxe-heading-color)] transition-all"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-5 py-2.5 bg-[var(--luxe-button-background-color)] hover:bg-[var(--luxe-button-hover-color)] text-[var(--luxe-button-text-color)] rounded-xl text-xs [font-family:var(--luxe-body-font)] font-bold uppercase tracking-wider transition-all disabled:bg-gray-200 disabled:text-gray-400 shrink-0"
              >
                {couponLoading ? pageText('coupon', 'loadingLabel', '...') : pageText('coupon', 'applyLabel', 'Apply')}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[var(--luxe-background-color)] border border-[var(--luxe-border-soft)] rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-[var(--luxe-accent-color)] text-xs shrink-0" />
                <span className="text-xs [font-family:var(--luxe-body-font)] font-bold text-[var(--luxe-heading-color)] uppercase tracking-wider">{appliedCoupon.code} {pageText('coupon', 'appliedLabel', 'applied')}</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-[var(--luxe-text-color)] hover:text-[var(--luxe-heading-color)] text-[10px] [font-family:var(--luxe-body-font)] font-bold uppercase tracking-wider"
              >
                {pageText('coupon', 'removeLabel', 'Remove')}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full bg-[var(--luxe-button-background-color)] hover:bg-[var(--luxe-button-hover-color)] transition-all text-[var(--luxe-button-text-color)] [font-family:var(--luxe-body-font)] font-bold tracking-widest py-4 rounded-2xl shadow-lg disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed uppercase text-sm"
        >
          {isProcessing ? pageText('offer', 'processingLabel', 'Processing...') : (isAuthenticated ? pageText('offer', 'joinLabel', 'Become a Member') : pageText('offer', 'loginLabel', 'Login to Join'))}
        </button>

        <div className="mt-8 pt-8 border-t border-gray-50 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 text-[9px] text-[var(--luxe-text-color)] font-bold uppercase">
                    <FaCheckCircle className="text-[var(--luxe-accent-color)]" /> {pageText('offer', 'securityLabel', 'Secure SSL')}
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-[var(--luxe-text-color)] font-bold uppercase">
                    <FaShieldAlt className="text-[var(--luxe-accent-color)]" /> {pageText('offer', 'paymentLabel', 'Safe Payment')}
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-[var(--luxe-text-color)] font-bold uppercase">
                    <FaStar className="text-[var(--luxe-accent-color)]" /> {pageText('offer', 'perksLabel', 'VIP Perks')}
                </div>
            </div>
            <p className="whitespace-pre-line text-[9px] text-[var(--luxe-text-color)] opacity-60 leading-relaxed italic">
                {pageText('offer', 'terms', 'Membership benefits active for 30 days from purchase. Auto-renewal not active.')}
            </p>
        </div>
      </div>

    </section>
  );
}
