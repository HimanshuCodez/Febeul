import React, { useState, useEffect, useMemo } from "react";
import { ShoppingBag, ArrowRight, Package, Crown, X, CreditCard, Search, Filter } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import axios from "axios";
import { toast } from "react-hot-toast";
import Loader from "../components/Loader";
import { motion, AnimatePresence } from "framer-motion";

const backendUrl = import.meta.env.VITE_BACKEND_URL; // Assume backendUrl is accessible

const getOrderDisplayStatus = (order) => {
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
    <div className="flex items-center w-full mt-1">
      {JOURNEY_STAGES.map((stage, index) => {
        const stageLevel = STAGE_LEVELS[stage];
        const isDone = stageLevel <= currentLevel;
        return (
          <React.Fragment key={stage}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${isDone ? "bg-pink-500" : "bg-slate-200"}`} />
            {index < JOURNEY_STAGES.length - 1 && (
              <div className={`flex-1 h-0.5 ${stageLevel < currentLevel ? "bg-pink-500" : "bg-slate-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const CancellationModal = ({ order, token, onClose, onCancelled }) => {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">Cancel Order</h3>
            <p className="text-xs font-bold text-slate-400 mt-1 break-all">#{order._id}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          <div>
            <label htmlFor="cancel-reason" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Reason</label>
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
              <label htmlFor="custom-reason" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Please specify the reason</label>
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
            <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-4 text-xs font-bold">
              The full prepaid amount will be refunded to the original Razorpay payment source.
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest">
              Keep Order
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-3 rounded-xl bg-rose-600 text-white text-xs font-black uppercase tracking-widest disabled:bg-slate-300">
              {isSubmitting ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { token, isAuthenticated } = useAuthStore();
  const navigate = useNavigate(); // Import useNavigate for navigation

  const fetchOrders = async () => {
    setLoading(true);
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
      toast.error("Failed to fetch orders.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchOrders();
    }
  }, [isAuthenticated, token]);

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
        const itemMatch = order.items.some((item) => (item.name || "").toLowerCase().includes(query));
        if (!idMatch && !itemMatch) return false;
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
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-4 font-sans">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-100/80 border border-slate-100 p-4 sm:p-6 md:p-8">

        {/* Header Section */}
        <div className="flex items-center flex-wrap justify-between gap-3 border-b border-slate-100 pb-4 sm:pb-6 mb-5 sm:mb-8">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <ShoppingBag className="text-pink-500 w-5 h-5 sm:w-6 sm:h-6" /> My Orders
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Track and manage your recent purchases</p>
          </div>
          <span className="bg-pink-50 text-pink-600 font-black text-[11px] sm:text-xs px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl border border-pink-100">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
          </span>
        </div>

        {orders.length > 0 && (
          <div className="mb-5 sm:mb-8 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order ID or product name"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400"
                />
              </div>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400"
              >
                <option value="All">All Time</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Last 6 Months">Last 6 Months</option>
                {availableYears.map((year) => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setStatusFilter(f.label)}
                  className={`shrink-0 px-3 sm:px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wide border transition-all ${
                    statusFilter === f.label
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredOrders.length > 0 ? (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } }
            }}
            className="space-y-4 sm:space-y-6"
          >
            {filteredOrders.map((order) => {
              const isLuxe = order.items.some(item => item.name === "Febeul Luxe Membership" || item.sku === "LUXE-MEMBERSHIP");
              const displayStatus = getOrderDisplayStatus(order);
              // "Returned" always means the courier sent it back (a customer
              // return uses refundDetails.pickup, not this field) — only the
              // label shown is renamed, all the logic above stays on 'Returned'.
              const displayStatusLabel = displayStatus === "Returned" ? "Courier Return" : displayStatus;
              const refundStatus = order.refundDetails?.status;
              const pickupStatus = order.refundDetails?.pickup?.status;
              const refundSubLabel = refundStatus === 'completed'
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
                <motion.div
                  key={order._id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                  }}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <div className="bg-slate-50/60 px-3.5 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest block">Order ID</span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-800 break-all select-all">#{order._id}</span>
                      </div>
                      <div className="h-6 w-[1px] bg-slate-200" />
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest block">Date Placed</span>
                        <span className="text-[11px] sm:text-xs font-bold text-slate-600">
                          {new Date(order.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-black capitalize ${
                        displayStatus === "Processing" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        displayStatus === "Shipped" || displayStatus === "Out for delivery" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                        displayStatus === "Delivered" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        displayStatus === "Cancelled" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                        "bg-slate-50 text-slate-700 border border-slate-100"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          displayStatus === "Processing" ? "bg-amber-500 animate-pulse" :
                          displayStatus === "Shipped" || displayStatus === "Out for delivery" ? "bg-blue-500" :
                          displayStatus === "Delivered" ? "bg-emerald-500" :
                          displayStatus === "Cancelled" ? "bg-rose-500" :
                          "bg-slate-500"
                        }`} />
                        {displayStatusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="px-3.5 sm:px-5 pt-3 sm:pt-4">
                    <OrderProgressStrip status={displayStatus} />
                    {refundSubLabel && (
                      <p className="text-[9px] sm:text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 sm:px-2.5 py-1 inline-block mt-1">
                        {refundSubLabel}
                      </p>
                    )}
                  </div>

                  {/* Body of the card (Items thumbnail strip & pricing) */}
                  <div className="p-3.5 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6">
                    {/* Item Thumbnails & Info */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="flex -space-x-2 sm:-space-x-2.5 overflow-hidden shrink-0">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="relative group/thumb flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg sm:rounded-xl border-2 border-white shadow-sm bg-slate-50"
                            />
                            {item.quantity > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                                {item.quantity}
                              </span>
                            )}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 border-2 border-white rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1">
                          {order.items.map(item => item.name).join(', ')}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                          </span>
                          {order.couponDiscount > 0 && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-black border border-emerald-100 uppercase tracking-wider">
                              Discount Applied
                            </span>
                          )}
                          {isLuxe && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-black border border-amber-100 uppercase tracking-wider flex items-center gap-1">
                              <Crown size={10} className="text-amber-600" /> Luxe Member
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price and Details/Cancel Button */}
                    <div className="flex items-center justify-between md:justify-end gap-3 md:gap-6 pt-3 md:pt-0 border-t border-slate-100 md:border-0">
                      <div className="text-left md:text-right">
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Amount</span>
                        <span className="text-base sm:text-lg font-black text-slate-900">₹{(order.displayTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {canCancel(displayStatus) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setOrderToCancel(order); }}
                            className="text-[11px] sm:text-xs text-rose-600 hover:text-white font-bold border border-rose-100 hover:bg-rose-500 hover:border-rose-500 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all active:scale-95"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleViewOrderDetails(order._id)}
                          className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-[11px] sm:text-xs shadow-sm hover:shadow active:scale-95 transition-all whitespace-nowrap"
                        >
                          Details <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </motion.div>
        ) : orders.length > 0 ? (
          <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 p-8">
            <div className="bg-white p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-sm border border-slate-100 mb-6">
              <Filter className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-700">No Matching Orders</h3>
            <p className="text-slate-400 text-sm font-medium mt-2 max-w-sm mx-auto">No orders match your current search or filters. Try adjusting them.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 p-8">
            <div className="bg-white p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-sm border border-slate-100 mb-6">
              <ShoppingBag className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-700">No Orders Yet</h3>
            <p className="text-slate-400 text-sm font-medium mt-2 max-w-sm mx-auto">You haven't made any purchases yet. Explore our premium collection and make your first order!</p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-pink-100 active:scale-95 transition-all"
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
    </div>
  );
};

export default MyOrders;
