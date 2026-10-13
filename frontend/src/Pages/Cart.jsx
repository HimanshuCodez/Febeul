import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Gift, Loader2, Minus, Plus, ShoppingBag, Tag, Trash2, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import axios from "axios";
import { toast } from "react-hot-toast";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Cart = () => {
  const [giftWrap, setGiftWrap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingCart, setUpdatingCart] = useState(false);
  const [cartError, setCartError] = useState('');
  const mutationInFlight = useRef(false);
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, cartItems, setCartItems, siteSettings, fetchSiteSettings } = useAuthStore();
  const userId = user?._id;

  const fetchCart = useCallback(async (showLoading = true) => {
    if (!isAuthenticated || !userId) {
      setLoading(false);
      return false;
    }
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get(
        `${backendUrl}/api/cart/get`,
        { headers: { token } }
      );
      if (response.data.success) {
        setCartItems(response.data.cartItems || []);
        setGiftWrap(response.data.giftWrap || null);
        setCartError('');
        return true;
      }
      throw new Error('Unable to load cart.');
    } catch {
      setCartError('We could not refresh your cart totals. Please retry before continuing.');
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [isAuthenticated, userId, token, setCartItems]);

  useEffect(() => {
    fetchCart();
    fetchSiteSettings();
  }, [fetchCart, fetchSiteSettings]);

  const mutateCart = async (path, body, errorMessage, analyticsEvent) => {
    if (mutationInFlight.current || cartError) return false;
    mutationInFlight.current = true;
    setUpdatingCart(true);
    let success = false;
    try {
      const response = await axios.post(`${backendUrl}/api/cart/${path}`, body, { headers: { token }, analyticsEvent });
      success = response.data.success;
      if (!success) toast.error(response.data.message || errorMessage);
    } catch {
      toast.error(errorMessage);
    } finally {
      // Refresh even after a network error: the server may have saved the change.
      // Keep checkout locked until the current quantity and discounts are known.
      await fetchCart(false);
      mutationInFlight.current = false;
      setUpdatingCart(false);
    }
    return success;
  };

  const handleQuantityChange = async (itemId, size, color, delta) => {
    const item = cartItems.find(item => item._id === itemId && item.size === size && item.color === color);
    if (!item) return;
    
    const newQuantity = (item.quantity || 0) + delta;

    if (newQuantity < 1) {
        handleRemove(itemId, size, color);
        return;
    }

    if (newQuantity > 99) return;
    await mutateCart('update', { itemId, size, color, quantity: newQuantity }, 'Failed to update cart.', {
      name: delta > 0 ? 'add_to_cart' : 'remove_from_cart', quantity: Math.abs(delta), amount: Math.abs(delta) * item.price, currency: 'INR',
    });
  };

  const handleRemove = async (itemId, size, color) => {
    const removedItem = cartItems.find(item => item._id === itemId && item.size === size && item.color === color);
    const success = await mutateCart('remove', { itemId, size, color }, 'Failed to remove item.', {
      name: 'remove_from_cart', quantity: removedItem?.quantity, amount: removedItem?.quantity * removedItem?.price, currency: 'INR',
    });
    if (success) toast.success('Item removed from cart.');
  };

  const handleRemoveGiftWrap = async () => {
    if (await mutateCart('remove-giftwrap', {}, 'Failed to remove gift wrap.')) toast.success('Gift wrap removed.');
  };

  const subtotal = (cartItems || []).reduce(
    (sum, item) => {
      // item.price is now directly available from the backend response in getUserCart
      return sum + (item.price * item.quantity);
    },
    0
  );

  const totalDiscount = (cartItems || []).reduce(
    (sum, item) => {
      return sum + (item.discountAmount || 0);
    },
    0
  );

  const isLuxeMember = user?.isLuxeMember && (user?.giftWrapsLeft > 0);
  const giftWrapPrice = giftWrap ? (isLuxeMember ? 0 : giftWrap.price) : 0;

  const shipping = (isAuthenticated && user?.isLuxeMember)
    ? 0 // Luxe members get free shipping here (COD is handled in Checkout)
    : (subtotal - totalDiscount > (siteSettings.shippingThreshold || 499) ? 0 : (siteSettings.defaultShippingCharge || 50)); // Shipping calculated on discounted total
  
  const total = (subtotal - totalDiscount) + shipping + giftWrapPrice;
  const itemCount = (cartItems || []).reduce((count, item) => count + item.quantity, 0);
  const controlsDisabled = updatingCart || Boolean(cartError);
  const focusStyle = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2';

  if (loading) {
    return (
      <main className="min-h-[65vh] bg-[#fcf9f7] px-4 py-12 sm:px-6" aria-busy="true">
        <div className="mx-auto max-w-6xl">
          <p role="status" className="mb-8 flex items-center gap-3 text-sm text-stone-600">
            <Loader2 aria-hidden="true" size={18} className="motion-safe:animate-spin" /> Preparing your cart…
          </p>
          <div aria-hidden="true" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] motion-safe:animate-pulse">
            <div className="h-72 rounded-2xl border border-stone-200 bg-white" />
            <div className="h-80 rounded-2xl border border-stone-200 bg-white" />
          </div>
        </div>
      </main>
    );
  }

  const handleCheckout = () => {
    if (mutationInFlight.current || cartError) return;
    if (cartItems.length === 0) {
      toast.error("Your cart is empty. Add a product to redeem the gift wrap.");
      return;
    }
    navigate('/checkout');
  };

  return (
    <main className="min-h-[70vh] bg-[#fcf9f7] text-stone-900">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
        <Link to="/" className={`mb-7 inline-flex min-h-11 items-center gap-2 rounded text-sm font-medium text-stone-600 transition-colors hover:text-rose-700 ${focusStyle}`}>
          <ArrowLeft size={16} aria-hidden="true" /> Continue shopping
        </Link>
        <header className="mb-7 sm:mb-9">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-700">A few lovely things</p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">Shopping Cart</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            {isAuthenticated && itemCount > 0
              ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'} in your bag. Review your favourites before checkout.`
              : 'Make room for your next favourite.'}
          </p>
        </header>

        {cartError && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <p className="max-w-xl">{cartError}</p>
            <button type="button" onClick={() => fetchCart(false)} className={`min-h-11 rounded px-2 font-semibold underline underline-offset-4 ${focusStyle}`}>Retry cart</button>
          </div>
        )}

        {!isAuthenticated || cartItems.length === 0 ? (
          <Motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center rounded-2xl border border-stone-200/80 bg-white px-5 py-16 text-center sm:py-24"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-700">
              <ShoppingBag size={32} strokeWidth={1.25} aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-medium sm:text-3xl">
              Your cart is empty
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">
              Find something you love. Your picks will be waiting here when you’re ready.
            </p>
            <Link to="/" className={`mt-7 inline-flex min-h-12 items-center gap-3 rounded-lg bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-700 ${focusStyle}`}>
              Continue Shopping <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </Motion.div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
            <section aria-labelledby="cart-items-heading" className="min-w-0 space-y-5">
              <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-5 sm:px-6">
                  <h2 id="cart-items-heading" className="font-sans text-base font-semibold">Your selection</h2>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                </div>
                <div className="divide-y divide-stone-100">
              {cartItems.map((item, index) => {
                const selectedVariation = item.variations?.find(
                  (v) => v.color === item.color
                );

                const itemImage = selectedVariation?.images?.[0];
                const itemPrice = selectedVariation?.sizes?.find(
                  (s) => s.size === item.size
                )?.price;

                const price = item.price ?? itemPrice ?? 0;
                const lineSubtotal = price * item.quantity;
                const lineDiscount = Math.min(lineSubtotal, Math.max(0, item.discountAmount || 0));
                const lineTotal = lineSubtotal - lineDiscount;
                const image = item.image || itemImage;

                return (
                <Motion.div
                  key={`${item._id}-${item.size}-${item.color}`}
                  role='group'
                  aria-label={`${item.name}, ${item.color}, ${item.size}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
                  className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-5 p-4 min-[375px]:grid-cols-[6rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-6 sm:p-6"
                >
                  <Link to={`/product/${item._id}`} aria-label={`View ${item.name}`} className={`block self-start overflow-hidden rounded-lg bg-[#f6f2f0] sm:row-span-2 ${focusStyle}`}>
                    {image ? (
                      <img src={image} alt={item.name} className="aspect-[4/5] w-full object-cover object-top transition-transform duration-300 motion-safe:hover:scale-105" />
                    ) : (
                      <div className="flex aspect-[4/5] items-center justify-center text-stone-400"><ShoppingBag size={28} aria-hidden="true" /></div>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="min-w-0 break-words pt-1 font-sans text-base font-semibold leading-snug sm:text-lg">
                        <Link to={`/product/${item._id}`} className={`rounded hover:text-rose-700 ${focusStyle}`}>{item.name}</Link>
                      </h3>
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        disabled={controlsDisabled}
                        onClick={() => handleRemove(item._id, item.size, item.color)}
                        className={`-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 ${focusStyle}`}
                      >
                        <Trash2 size={17} strokeWidth={1.6} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-stone-600 sm:text-sm">
                      <span className="break-words">Colour: <span className="text-stone-800">{item.color}</span></span>
                      <span className="break-words">Size: <span className="text-stone-800">{item.size}</span></span>
                    </div>
                    <p className="mt-3 text-xs text-stone-500 sm:text-sm">₹{price.toFixed(2)} each × {item.quantity}</p>
                  </div>
                  <div className="col-span-2 flex flex-wrap items-end justify-between gap-4 sm:col-span-1 sm:col-start-2">
                    <div>
                      <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-stone-500">Quantity</span>
                      <div className="inline-flex items-center rounded-lg border border-stone-200 bg-white">
                        <button
                          type='button'
                          aria-label={`Decrease quantity of ${item.name}`}
                          disabled={controlsDisabled}
                          onClick={() => handleQuantityChange(item._id, item.size, item.color, -1)}
                          className={`flex h-11 w-11 items-center justify-center rounded-l-lg text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 ${focusStyle}`}
                        >
                          <Minus size={15} aria-hidden="true" />
                        </button>
                        <span aria-label={`Quantity of ${item.name}`} className="min-w-8 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type='button'
                          aria-label={`Increase quantity of ${item.name}`}
                          disabled={controlsDisabled || item.quantity >= 99}
                          onClick={() => handleQuantityChange(item._id, item.size, item.color, 1)}
                          className={`flex h-11 w-11 items-center justify-center rounded-r-lg text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 ${focusStyle}`}
                        >
                          <Plus size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-stone-500">Line total</span>
                      <div className="flex flex-wrap items-baseline justify-end gap-x-2">
                        {lineDiscount > 0 && <p aria-label="Subtotal before coupon" className="text-sm text-stone-500 line-through">₹{lineSubtotal.toFixed(2)}</p>}
                        <p aria-label="Product line total" className="text-xl font-semibold tracking-tight">₹{lineTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  {item.appliedCoupon && (
                    <div className="col-span-2 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-800">
                      <Tag size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="min-w-0 break-words"><span className="font-semibold">{item.appliedCoupon}</span> applied <span aria-hidden="true">·</span> You save ₹{lineDiscount.toFixed(2)} on this line</p>
                    </div>
                  )}
                  {item.couponMessage && <p className="col-span-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">{item.couponMessage}</p>}
                </Motion.div>
              )})}
                </div>
              </div>

              {giftWrap && (
                <div className="flex items-start gap-4 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 sm:p-5">
                  {giftWrap.image ? (
                    <img src={giftWrap.image} alt={giftWrap.name} className="h-16 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white text-rose-700"><Gift size={24} aria-hidden="true" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-rose-700">The finishing touch</p>
                    <h3 className="break-words font-sans text-sm font-semibold leading-5">{giftWrap.name} (Gift Wrap)</h3>
                    <p className="mt-2 text-sm font-medium">{giftWrapPrice === 0 ? 'Complimentary' : `₹${giftWrapPrice.toFixed(2)}`}</p>
                  </div>
                  <button
                    onClick={handleRemoveGiftWrap}
                    type='button'
                    aria-label='Remove gift wrap'
                    disabled={controlsDisabled}
                    className={`-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 ${focusStyle}`}
                  >
                    <Trash2 size={17} strokeWidth={1.6} aria-hidden="true" />
                  </button>
                </div>
              )}
              <p className="px-1 text-xs leading-5 text-stone-500">Changed your mind? Adjust quantities or remove items above. Your totals update automatically.</p>
            </section>

            <Motion.aside
              aria-labelledby="cart-summary-heading"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="min-w-0 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_30px_-16px_rgba(62,37,29,0.15)] lg:sticky lg:top-40"
            >
              <div className="border-b border-stone-100 px-5 py-5 sm:px-6">
              <h2 id="cart-summary-heading" className="font-sans text-base font-semibold">
                Order Summary
              </h2>
              </div>
              <div className="p-5 sm:p-6">
              {updatingCart && <p role="status" className="mb-5 flex items-center gap-2 text-xs leading-5 text-stone-600"><Loader2 size={15} className="shrink-0 motion-safe:animate-spin" aria-hidden="true" />Updating quantity and discounts…</p>}
              <div className="space-y-4 text-sm tabular-nums">
                <div className="flex flex-wrap justify-between gap-2 text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-stone-900">₹{subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex flex-wrap justify-between gap-2 text-emerald-700">
                    <span>Coupon Discount</span>
                    <span className="font-medium">− ₹{totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex flex-wrap justify-between gap-2 text-stone-600">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'font-medium text-emerald-700' : 'font-medium text-stone-900'}>{shipping === 0 ? "Free" : `₹${shipping.toFixed(2)}`}</span>
                </div>
                {giftWrap && (
                  <div className="flex flex-wrap justify-between gap-2 text-stone-600">
                    <span>Gift Wrap</span>
                    <span className="font-medium text-stone-900">{giftWrapPrice === 0 ? "Free" : `₹${giftWrapPrice.toFixed(2)}`}</span>
                  </div>
                )}
              
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-stone-200 pt-5">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-2xl font-semibold tracking-tight">₹{total.toFixed(2)}</span>
                </div>
              </div>
              {totalDiscount > 0 && <p className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-700"><Check size={15} className="shrink-0" aria-hidden="true" />You’re saving ₹{totalDiscount.toFixed(2)} with coupons</p>}
              <button type="button" onClick={handleCheckout} disabled={controlsDisabled} className={`mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-stone-900 px-3 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50 ${focusStyle}`}>
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} aria-hidden="true" className="shrink-0" />
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-stone-500">Final delivery and payment charges are confirmed at checkout.</p>
              </div>
              <div className="flex items-start gap-3 border-t border-stone-100 bg-stone-50/80 px-5 py-4 sm:px-6">
                <Truck size={19} strokeWidth={1.5} className="mt-0.5 shrink-0 text-stone-500" aria-hidden="true" />
                <p className="text-xs leading-5 text-stone-600">{shipping === 0 ? (user?.isLuxeMember ? 'Your Luxe membership includes free standard delivery.' : 'Your bag qualifies for free standard delivery.') : 'Choose your delivery address and payment method in the next step.'}</p>
              </div>
            </Motion.aside>
          </div>
        )}
      </div>
    </main>
  );
};

export default Cart;
