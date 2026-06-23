import React, { useState, useEffect } from "react";
import { ShoppingBag, ArrowRight, Package, Crown, X, CreditCard } from "lucide-react";
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
  if (shiprocketStatus === "RTO") return "Returned";
  if (shiprocketStatus === "CANCELLED") return "Cancelled";
  if (shiprocketStatus === "IN_TRANSIT") return order.orderStatus === "Out for delivery" ? "Out for delivery" : "Shipped";
  if (shiprocketStatus === "SHIPPED") return "Shipped";
  if (shiprocketStatus === "PICKUP SCHEDULED") return "Processing";
  return order.orderStatus;
};

const CancellationModal = ({ order, token, onClose, onCancelled }) => {
  const [reason, setReason] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifsc: "",
    bankName: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCod = order.paymentMethod === "COD";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Please select a cancellation reason.");
      return;
    }

    if (isCod && (!bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifsc)) {
      toast.error("Please provide bank details for COD cancellation.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/order/cancel`,
        {
          orderId: order._id,
          reason,
          bankDetails: isCod ? bankDetails : null
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
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">Cancel Order</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">#{order._id.slice(-8).toUpperCase()}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label htmlFor="cancel-reason" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Reason</label>
            <select
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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

          {isCod && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <h4 className="font-black text-sm text-slate-800 flex items-center gap-2">
                <CreditCard size={16} className="text-rose-500" />
                Bank Details for Admin Refund Log
              </h4>
              <input type="text" name="accountHolderName" placeholder="Account Holder Name" value={bankDetails.accountHolderName} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-xl text-sm" required />
              <input type="text" name="accountNumber" placeholder="Account Number" value={bankDetails.accountNumber} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-xl text-sm" required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" name="ifsc" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-xl text-sm uppercase" required />
                <input type="text" name="bankName" placeholder="Bank Name" value={bankDetails.bankName} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-xl text-sm" />
              </div>
            </div>
          )}

          {order.paymentMethod === "Razorpay" && order.payment && (
            <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-4 text-xs font-bold">
              The full prepaid amount will be refunded to the original Razorpay payment source.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
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
    <div className="max-w-4xl mx-auto py-8 px-4 font-sans">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/80 border border-slate-100 p-6 md:p-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <ShoppingBag className="text-pink-500 w-6 h-6" /> My Orders
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Track and manage your recent purchases</p>
          </div>
          <span className="bg-pink-50 text-pink-600 font-black text-xs px-3.5 py-1.5 rounded-2xl border border-pink-100">
            {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
          </span>
        </div>

        {orders.length > 0 ? (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } }
            }}
            className="space-y-6"
          >
            {orders.map((order) => {
              const isLuxe = order.items.some(item => item.name === "Febeul Luxe Membership" || item.sku === "LUXE-MEMBERSHIP");
              const displayStatus = getOrderDisplayStatus(order);
              
              return (
                <motion.div
                  key={order._id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                  }}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  {/* Top bar of the card */}
                  <div className="bg-slate-50/60 px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Order ID</span>
                        <span className="text-sm font-extrabold text-slate-800">#{order._id.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="h-6 w-[1px] bg-slate-200" />
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Date Placed</span>
                        <span className="text-xs font-bold text-slate-600">
                          {new Date(order.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black capitalize ${
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
                        {displayStatus}
                      </span>
                    </div>
                  </div>

                  {/* Body of the card (Items thumbnail strip & pricing) */}
                  <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    {/* Item Thumbnails & Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex -space-x-2.5 overflow-hidden">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="relative group/thumb flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-14 h-14 object-cover rounded-xl border-2 border-white shadow-sm bg-slate-50"
                            />
                            {item.quantity > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                                {item.quantity}
                              </span>
                            )}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-14 h-14 bg-slate-100 border-2 border-white rounded-xl flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">
                          {order.items.map(item => item.name).join(', ')}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">
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
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto gap-4 pt-4 md:pt-0 border-t border-slate-100 md:border-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Amount</span>
                        <span className="text-lg font-black text-slate-900">₹{(order.displayTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {canCancel(displayStatus) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setOrderToCancel(order); }}
                            className="text-xs text-rose-600 hover:text-white font-bold border border-rose-100 hover:bg-rose-500 hover:border-rose-500 px-3.5 py-2 rounded-xl transition-all active:scale-95"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleViewOrderDetails(order._id)}
                          className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm hover:shadow active:scale-95 transition-all"
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
