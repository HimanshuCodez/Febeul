import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ShoppingBag, ArrowRight, Package, Crown, X, CreditCard, Search, Filter } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import axios from "axios";
import { toast } from "react-hot-toast";
import Loader from "../components/Loader";
import { motion as Motion, AnimatePresence, useReducedMotion } from "framer-motion";

const backendUrl = import.meta.env.VITE_BACKEND_URL; // Assume backendUrl is accessible

const getOrderDisplayStatus = (order) => {
  if (order.isCancelled || order.orderStatus === 'Cancelled' || order.refundDetails?.requestType === 'cancellation') return 'Cancelled';
  const shiprocketStatus = (order.shiprocketStatus || "").toUpperCase();
  const isLuxe = order.items.some(item => item.name === "Febeul Luxe Membership" || item.sku === "LUXE-MEMBERSHIP");

  if (isLuxe && order.payment) return "Delivered";
  if (order.deliveredAt || shiprocketStatus === "DELIVERED") return "Delivered";
  if (shiprocketStatus === "RTO" || shiprocketStatus === "RTO_INITIATED" || shiprocketStatus === "RTO_DELIVERED") return "Returned";
  if (shiprocketStatus === "CANCELLED") return "Cancelled";
  if (shiprocketStatus === "OUT_FOR_DELIVERY") return "Out for delivery";
  if (shiprocketStatus === "IN_TRANSIT") return order.orderStatus === "Out for delivery" ? "Out for delivery" : "Shipped";
  // An AWB has been generated (admin hit "Ship Now" in Shiprocket) — from the
  // customer's side the parcel is on its way, so don't sit on "Processing"
  // until the courier records its first scan.
  if (shiprocketStatus === "SHIPPED" || shiprocketStatus === "PICKED UP") return "Shipped";
  if (shiprocketStatus === "AWB_ASSIGNED" || shiprocketStatus === "PICKUP SCHEDULED") return "Shipped";
  if (shiprocketStatus === "UNDELIVERED" || shiprocketStatus === "LOST") return "Failed";
  return order.orderStatus;
};

const JOURNEY_STAGES = ["Order Placed", "Processing", "Shipped", "Out for delivery", "Delivered"];
const STAGE_LEVELS = { "Order Placed": 0, "Processing": 1, "Confirmed": 1, "Shipped": 2, "Out for delivery": 3, "Delivered": 4 };

const STATUS_FILTERS = [
  { label: "All", match: () => true },
  { label: "Processing", match: (s) => ["Order Placed", "Processing", "Confirmed"].includes(s) },
  { label: "Shipped", match: (s) => ["Shipped", "Out for delivery"].includes(s) },
  { label: "Delivered", match: (s) => s === "Delivered" },
  { label: "Cancelled", match: (s) => ["Cancelled", "Failed"].includes(s) },
  { label: "Returns/Refunds", match: (s) => ["Returned", "Refund Initiated", "Refunded"].includes(s) },
];

const OrderProgressStrip = ({ status }) => {
  if (["Cancelled", "Returned", "Refund Initiated", "Refunded", "Failed"].includes(status)) return null;
  const currentLevel = STAGE_LEVELS[status] ?? 0;

  return (
    <ol aria-label="Delivery progress" className="grid w-full grid-cols-5">
      {JOURNEY_STAGES.map((stage, index) => {
        const stageLevel = STAGE_LEVELS[stage];
        const isDone = stageLevel <= currentLevel;
        return (
          <li key={stage} aria-current={stageLevel === currentLevel ? "step" : undefined} className="relative flex min-w-0 flex-col items-center">
            {index < JOURNEY_STAGES.length - 1 && (
              <span aria-hidden="true" className={`absolute left-1/2 top-1 h-0.5 w-full ${stageLevel < currentLevel ? "bg-pink-500" : "bg-slate-200"}`} />
            )}
            <span aria-hidden="true" className={`relative z-10 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${isDone ? "bg-pink-500" : "bg-slate-200"}`} />
            <span className={`mt-2.5 hidden px-1 text-center text-[10px] leading-snug sm:block ${stageLevel === currentLevel ? "font-semibold text-pink-600" : "text-slate-500"}`}>{stage}</span>
            <span className="sr-only sm:hidden">{stage}{isDone ? " reached" : " pending"}</span>
          </li>
        );
      })}
    </ol>
  );
};

const CancellationModal = ({ order, token, onClose, onCancelled }) => {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("select")?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), select, input, [tabindex="0"]')].filter(element => element.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const dialog = dialogRef.current;
    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      dialog.removeEventListener("keydown", handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason = reason === "Other" ? customReason : reason;

    if (!finalReason.trim()) {
      toast.error("Please select or specify a cancellation reason.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/order/cancel`,
        {
          orderId: order._id,
          reason: finalReason,
          bankDetails: null
        },
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Order cancelled successfully");
        onCancelled();
      } else {
        toast.error(response.data.message || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error(error.response?.data?.message || "An error occurred while cancelling the order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <Motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 font-sans backdrop-blur-sm sm:p-6"
    >
      <Motion.div
        initial={reduceMotion ? false : { scale: 0.98, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { scale: 0.98, y: 12, opacity: 0 }}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-pink-100 bg-white shadow-2xl [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-pink-400 [&_button]:focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between gap-4 border-b border-pink-100 bg-pink-50/40 p-5 sm:p-6">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-pink-600">Order management</p>
            <h3 id="cancel-order-title" className="text-xl font-semibold text-slate-900">Cancel Order</h3>
            <p className="mt-2 break-all text-xs text-slate-500">{order.orderItemId ? `#${order.orderItemId}` : `#${order._id}`}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close cancellation dialog" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pink-100 bg-white text-slate-500 transition-colors hover:bg-pink-50">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          <div>
            <label htmlFor="cancel-reason" className="mb-2 block text-sm font-medium text-slate-700">Reason</label>
            <select
              id="cancel-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value !== "Other") {
                  setCustomReason("");
                }
              }}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
            >
              <option value="">Select a reason</option>
              <option value="Changed my mind">Changed my mind</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Found a better price elsewhere">Found a better price elsewhere</option>
              <option value="Delivery time is too long">Delivery time is too long</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {reason === "Other" && (
            <div>
              <label htmlFor="custom-reason" className="mb-2 block text-sm font-medium text-slate-700">Please specify the reason</label>
              <input
                type="text"
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                placeholder="Type your reason here..."
                required
              />
            </div>
          )}

          {order.paymentMethod === "Razorpay" && order.payment && (
            <div className="rounded-xl border border-pink-100 bg-pink-50/60 p-4 text-xs leading-relaxed text-slate-600">
              The full prepaid amount will be refunded to the original Razorpay payment source.
            </div>
          )}

          <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              Keep Order
            </button>
            <button type="submit" disabled={isSubmitting} className="min-h-11 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-wait disabled:bg-slate-300">
              {isSubmitting ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </form>
      </Motion.div>
    </Motion.div>,
    document.body
  );
};

const MyOrders = () => {
  const reduceMotion = useReducedMotion();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { token, isAuthenticated } = useAuthStore();
  const navigate = useNavigate(); // Import useNavigate for navigation

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/order/userorders`, {}, { headers: { token } });
      if (response.data.success) {
        const processedOrders = response.data.orders.map(order => {
            const productAmount = order.productAmount || (order.items || []).reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
            let shippingCharge = order.shippingCharge || 0;
            let codCharge = order.codCharge || 0;
            const giftWrapPrice = order.giftWrap?.price || 0;
            const couponDiscount = order.couponDiscount || 0;
            let orderTotal = order.orderTotal || 0;

            if (order.paymentMethod === 'COD' && codCharge === 0) {
                const unaccountedAmount = orderTotal - (productAmount - couponDiscount + shippingCharge + giftWrapPrice);
                if (unaccountedAmount > 49 && unaccountedAmount < 51) {
                    codCharge = unaccountedAmount;
                    if (shippingCharge === unaccountedAmount) {
                        shippingCharge = 0;
                    }
                }
            }

            const finalTotal = productAmount - couponDiscount + shippingCharge + codCharge + giftWrapPrice;
            
            return {
                ...order,
                displayTotal: orderTotal || finalTotal
            };
        });

        setOrders(processedOrders.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (error) {
      if (!silent) toast.error("Failed to fetch orders.");
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchOrders();
    }
  }, [isAuthenticated, token, fetchOrders]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const refresh = () => { if (document.visibilityState === 'visible') fetchOrders({ silent: true }); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.clearInterval(interval); };
  }, [isAuthenticated, token, fetchOrders]);

  const availableYears = useMemo(() => {
    const years = new Set(orders.map((o) => new Date(o.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();

    return orders.filter((order) => {
      const displayStatus = getOrderDisplayStatus(order);
      const statusMatcher = STATUS_FILTERS.find((f) => f.label === statusFilter);
      if (statusMatcher && !statusMatcher.match(displayStatus)) return false;

      const orderDate = new Date(order.date);
      if (timeFilter === "Last 30 Days") {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        if (orderDate < cutoff) return false;
      } else if (timeFilter === "Last 6 Months") {
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - 6);
        if (orderDate < cutoff) return false;
      } else if (timeFilter !== "All") {
        if (orderDate.getFullYear() !== Number(timeFilter)) return false;
      }

      if (query) {
        const idMatch = order._id.toLowerCase().includes(query);
        const orderItemIdMatch = (order.orderItemId || "").toLowerCase().includes(query);
        const itemMatch = order.items.some((item) => (item.name || "").toLowerCase().includes(query));
        if (!idMatch && !orderItemIdMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [orders, statusFilter, timeFilter, searchQuery]);

  const clearFilters = () => {
    setStatusFilter("All");
    setTimeFilter("All");
    setSearchQuery("");
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader className="animate-spin text-pink-500" size={36} /></div>;
  }

  const handleViewOrderDetails = (orderId) => {
    navigate(`/order-detail/${orderId}`);
  };

  const canCancel = (status) => {
    const nonCancellable = ['Shipped', 'Out for delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'];
    return !nonCancellable.includes(status);
  };

  return (
    <section aria-labelledby="my-orders-title" className="mx-auto w-full min-w-0 max-w-5xl px-3 py-5 font-sans sm:px-4 sm:py-8 [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-pink-400 [&_button]:focus-visible:ring-offset-2 motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none">
      <div className="min-w-0">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-7">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-pink-500 sm:h-12 sm:w-12"><ShoppingBag size={22} strokeWidth={1.7} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-pink-600">Your account</p>
              <h2 id="my-orders-title" className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">My Orders</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">Track your purchases and find every order detail in one place.</p>
            </div>
          </div>
          <span aria-live="polite" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-pink-100 bg-white px-3 py-1.5 text-xs text-slate-500">
            <span className="font-semibold text-pink-600">{filteredOrders.length}</span> {filteredOrders.length === 1 ? 'Order' : 'Orders'}
          </span>
        </header>

        {orders.length > 0 && (
          <div className="mb-5 min-w-0 space-y-4 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm sm:mb-6 sm:p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  aria-label="Search your orders"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order ID, Order Item ID, or product name"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-10 pr-3 text-xs text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-100 sm:text-sm"
                />
              </div>
              <select
                aria-label="Order date range"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 sm:w-44"
              >
                <option value="All">All Time</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Last 6 Months">Last 6 Months</option>
                {availableYears.map((year) => <option key={year} value={String(year)}>{year}</option>)}
              </select>
            </div>
            <div role="group" aria-label="Order status filters" className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  aria-pressed={statusFilter === f.label}
                  onClick={() => setStatusFilter(f.label)}
                  className={'min-h-9 rounded-full border px-3 py-2 text-xs font-medium transition-colors sm:px-3.5 ' + (statusFilter === f.label ? 'border-pink-200 bg-pink-50 text-pink-700' : 'border-transparent bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredOrders.length > 0 ? (
          <Motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.04 } }
            }}
            className="space-y-4 sm:space-y-6"
          >
            {filteredOrders.map((order) => {
              const isLuxe = order.items.some(item => item.name === "Febeul Luxe Membership" || item.sku === "LUXE-MEMBERSHIP");
              const totalQuantity = order.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
              const displayStatus = getOrderDisplayStatus(order);
              // "Returned" always means the courier sent it back (a customer
              // return uses refundDetails.pickup, not this field) — only the
              // label shown is renamed, all the logic above stays on 'Returned'.
              const displayStatusLabel = displayStatus === "Returned" ? "Courier Return" : displayStatus;
              const refundStatus = order.refundDetails?.status;
              const pickupStatus = order.refundDetails?.pickup?.status;
              // For an approved return the server sends a single customer-safe
              // label (order.returnStatus) covering both the parcel and the
              // money — using it here keeps this card and the detail page's
              // timeline from ever disagreeing.
              const refundSubLabel = displayStatus === 'Cancelled'
                ? (!order.payment ? 'No payment collected. No refund due.'
                  : refundStatus === 'completed' ? `Refund: ₹${(order.refundDetails.amount || 0).toFixed(2)} processed`
                  : refundStatus === 'processing' ? 'Refund processing with the payment provider.'
                  : 'Refund pending. We are following up on your payment.')
                : order.returnStatus
                ? (order.returnStatus.stage === 'refund_completed'
                    ? `Refund: ₹${(order.refundDetails.amount || 0).toFixed(2)} processed`
                    : `Return: ${order.returnStatus.label}`)
                : refundStatus === 'completed'
                ? `Refund: ₹${(order.refundDetails.amount || 0).toFixed(2)} processed`
                : refundStatus === 'rejected'
                ? 'Refund request rejected'
                : refundStatus && ['pending', 'initiated', 'processing'].includes(refundStatus)
                ? (pickupStatus === 'picked_up' || pickupStatus === 'in_transit' ? 'Return: Picked up by courier'
                  : pickupStatus === 'delivered_to_warehouse' ? 'Return: Received at warehouse'
                  : pickupStatus === 'scheduled' ? 'Return: Pickup scheduled'
                  : 'Return/Refund: Under review')
                : null;

              return (
                <Motion.article
                  key={order._id}
                  aria-label={'Order ' + (order.orderItemId || order._id)}
                  variants={{
                    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
                    visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.25 } }
                  }}
                  className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
                    <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 sm:gap-5">
                      {order.orderItemId && (
                        <div className="min-w-0">
                          <dt className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Order Item ID</dt>
                          <dd className="break-all text-xs font-semibold text-slate-800 select-all sm:text-sm">#{order.orderItemId}</dd>
                        </div>
                      )}
                      <div className="min-w-0">
                        <dt className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Date Placed</dt>
                        <dd className="text-xs font-medium text-slate-700 sm:text-sm">{new Date(order.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
                      </div>
                      <div className={order.orderItemId ? 'col-span-2 min-w-0 sm:col-span-1' : 'min-w-0'}>
                        <dt className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Order ID</dt>
                        <dd className="break-all text-xs font-medium text-slate-600 select-all">#{order._id}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <span className={'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold capitalize ' + (
                        displayStatus === 'Processing' ? 'border-amber-100 bg-amber-50 text-amber-700' :
                        displayStatus === 'Shipped' || displayStatus === 'Out for delivery' ? 'border-blue-100 bg-blue-50 text-blue-700' :
                        displayStatus === 'Delivered' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' :
                        displayStatus === 'Cancelled' ? 'border-rose-100 bg-rose-50 text-rose-700' :
                        'border-slate-200 bg-slate-50 text-slate-700'
                      )}>
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                        {displayStatusLabel}
                      </span>
                      <span className="text-xs text-slate-500">{totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} in this order</span>
                    </div>
                    <OrderProgressStrip status={displayStatus} />
                    {refundSubLabel && <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-800">{refundSubLabel}</p>}
                  </div>

                  <ul className="mx-4 min-w-0 divide-y divide-slate-100 border-t border-slate-100 sm:mx-5">
                    {order.items.map((item, index) => (
                      <li key={index} className="flex min-w-0 items-center gap-3 py-4 sm:gap-4">
                        {item.image ? <img src={item.image} alt={item.name} className="h-20 w-16 shrink-0 rounded-xl border border-slate-100 bg-slate-50 object-cover sm:h-24 sm:w-20" /> : <span className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-pink-400 sm:h-24 sm:w-20"><Package size={24} aria-hidden="true" /></span>}
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold leading-relaxed text-slate-800">
                            {item.productId && item.name !== "Febeul Luxe Membership" && item.sku !== "LUXE-MEMBERSHIP" ? <Link to={'/product/' + item.productId} className="rounded transition-colors hover:text-pink-600 hover:underline focus-visible:outline-pink-400">{item.name}</Link> : item.name}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {item.size && <span className="rounded-md bg-slate-50 px-2 py-1 text-slate-500">Size: <span className="font-medium text-slate-700">{item.size}</span></span>}
                            <span className="inline-flex items-center whitespace-nowrap rounded-md border border-pink-100 bg-pink-50 px-2 py-1 font-semibold text-pink-700">Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {(order.couponDiscount > 0 || isLuxe) && <div className="flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-5">
                    {order.couponDiscount > 0 && <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">Discount Applied</span>}
                    {isLuxe && <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700"><Crown size={12} aria-hidden="true" /> Luxe Member</span>}
                  </div>}

                  <div className="flex min-w-0 flex-col gap-4 border-t border-slate-100 bg-slate-50/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Total Amount</p>
                      <p className="mt-1 break-words text-xl font-semibold tracking-tight text-slate-900 tabular-nums">&#8377;{(order.displayTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      {order.paymentMethod && <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><CreditCard size={12} aria-hidden="true" />{order.paymentMethod}</p>}
                    </div>
                    <div className="flex min-w-0 items-center gap-2 sm:shrink-0">
                      {canCancel(displayStatus) && <button type="button" onClick={(e) => { e.stopPropagation(); setOrderToCancel(order); }} className="min-h-11 flex-1 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 sm:flex-none">Cancel</button>}
                      <button type="button" onClick={() => handleViewOrderDetails(order._id)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-black sm:flex-none">Details <ArrowRight size={15} aria-hidden="true" /></button>
                    </div>
                  </div>
                </Motion.article>
              );
            })}
          </Motion.div>
        ) : orders.length > 0 ? (
          <div className="rounded-2xl border border-dashed border-pink-200 bg-white px-4 py-14 text-center sm:px-8 sm:py-16">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-pink-400">
              <Filter className="h-7 w-7 text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">No Matching Orders</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">No orders match your current search or filters. Try adjusting them.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-pink-200 bg-white px-4 py-14 text-center sm:px-8 sm:py-16">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-pink-400">
              <ShoppingBag className="h-7 w-7 text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">No Orders Yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">You haven't made any purchases yet. Explore our premium collection and make your first order!</p>
            <Link
              to="/"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
            >
              Start Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

      </div>

      <AnimatePresence>
        {orderToCancel && (
          <CancellationModal
            order={orderToCancel}
            token={token}
            onClose={() => setOrderToCancel(null)}
            onCancelled={() => {
              setOrderToCancel(null);
              fetchOrders();
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

export default MyOrders;
