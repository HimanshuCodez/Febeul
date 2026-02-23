import React, { useState, useEffect } from "react";
import { ShoppingBag, ArrowRight, Package } from "lucide-react"; // X and MapPin removed
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import axios from "axios";
import { toast } from "react-hot-toast";
import Loader from "../components/Loader";
import { motion } from "framer-motion"; // AnimatePresence removed

const backendUrl = import.meta.env.VITE_BACKEND_URL; // Assume backendUrl is accessible

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
            let orderTotal = order.orderTotal || 0;

            if (order.paymentMethod === 'COD' && codCharge === 0) {
                const unaccountedAmount = orderTotal - (productAmount + shippingCharge + giftWrapPrice);
                if (unaccountedAmount > 49 && unaccountedAmount < 51) {
                    codCharge = unaccountedAmount;
                    if (shippingCharge === unaccountedAmount) {
                        shippingCharge = 0;
                    }
                }
            }

            const finalTotal = productAmount + shippingCharge + codCharge + giftWrapPrice;
            
            return {
                ...order,
                displayTotal: Math.max(orderTotal, finalTotal)
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">My Orders</h2>
      {orders.length > 0 ? (
          <div className="space-y-4">
          {orders.map(order => (
              <div key={order._id} className="p-4 rounded-lg border hover:border-pink-200 hover:bg-pink-50/50 transition-colors">
                {/* Mobile: Grid for Order ID/Date vs Amount */}
                <div className="grid grid-cols-2 gap-x-4 items-center justify-between mb-2 sm:flex sm:flex-row sm:mb-0">
                    <div> {/* Left side: Order ID and Date */}
                        <p className="font-semibold text-gray-800">Order #{order._id.slice(-6)}</p>
                        <p className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="text-right sm:text-left"> {/* Right side: Amount */}
                        <p className="font-bold text-gray-800 text-lg">₹{(order.displayTotal || 0).toFixed(2)}</p>
                    </div>
                </div>

                {/* Mobile: Items Count, Status, and Details Button */}
                <div className="flex justify-between items-center mt-2 sm:mt-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">{order.items.length} items</p>
                        {order.couponDiscount > 0 && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                DISCOUNT APPLIED
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${
                            order.orderStatus === "Processing" ? "bg-yellow-100 text-yellow-700" :
                            order.orderStatus === "Shipped" || order.orderStatus === "Out for delivery" ? "bg-blue-100 text-blue-700" :
                            order.orderStatus === "Delivered" ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-700"
                        }`}>
                            {order.orderStatus}
                        </span>
                        <button onClick={() => handleViewOrderDetails(order._id)} className="text-pink-500 hover:text-pink-700">
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
              </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
            <ShoppingBag className="mx-auto w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No Orders Yet</h3>
            <p className="text-gray-500 mt-1">Your past orders will appear here.</p>
            <Link to="/" className="mt-4 inline-block bg-pink-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-pink-600 transition-colors">
                Start Shopping
            </Link>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
