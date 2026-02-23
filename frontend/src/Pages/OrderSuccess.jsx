import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaCheckCircle, 
  FaShippingFast,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaBox,
  FaEnvelope,
  FaFileInvoice,
  FaHome,
  FaShoppingBag,
  FaCreditCard // Added for payment method icon
} from 'react-icons/fa';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from "../store/authStore";

export default function OrderSuccess() {
  const location = useLocation();
  // Ensure state exists before destructuring
  const { order: initialOrder, items, address, pricingDetails } = location.state || {};
  const { token } = useAuthStore(); // Get token here
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/order/${order._id}`, {
          headers: { token },
        });
        if (response.data.success) {
          setOrder(response.data.order);
        }
      } catch (error) {
        console.error('Error fetching order status:', error);
      }
    };

    if (order && order._id && order.orderStatus !== 'Delivered' && token) { // Check token presence
      const interval = setInterval(fetchOrder, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [order, token]);


  const handleDownloadInvoice = async () => { // Make async
    try {
        const invoiceUrl = `${import.meta.env.VITE_BACKEND_URL}/api/order/invoice/${order._id}`;
        
        const response = await axios.get(invoiceUrl, {
            headers: {
                token: token // Send the token in headers
            },
            responseType: 'blob' // Important for handling file download
        });

        // Create a URL for the blob and trigger download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice_${order._id}.pdf`); // Set filename
        document.body.appendChild(link);
        link.click();
        link.remove(); // Clean up
        window.URL.revokeObjectURL(url); // Clean up the URL object

    } catch (error) {
        console.error('Error downloading invoice:', error);
        // Optionally show a toast error to the user
    }
  };

  // Handle case where state might be missing (e.g., direct navigation)
  if (!order || !items || !address) {
    return (
      <div className="min-h-screen bg-[#f9aeaf] flex items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="bg-white p-10 rounded-xl shadow-lg"
        >
          <h1 className="text-2xl font-bold text-red-500">Order Details Not Found</h1>
          <p className="text-gray-600 mt-2">Could not retrieve order details. Please ensure you completed the checkout process.</p>
          <Link to="/" className="mt-4 inline-block bg-[#e8767a] text-white px-4 py-2 rounded-lg hover:bg-[#d5666a]">Go to Homepage</Link>
        </motion.div>
      </div>
    );
  }

  // --- Replace mock data with real data ---
    const orderNumber = order?._id;
  
    const estimatedDelivery = order && order.date 
    ? "Jan " + new Date(order.date).getDate() + "-" + new Date(new Date(order.date).setDate(new Date(order.date).getDate() + 5)).getDate() + ", " + new Date(order.date).getFullYear()
    : 'Not available'; // Simple estimation
  
  // Use pricing details if available, otherwise calculate
  const subtotal = pricingDetails?.subtotal ?? order.productAmount ?? 0;
  const shipping = pricingDetails?.shipping ?? order.shippingCharge ?? 0;
  const cod = pricingDetails?.cod ?? order.codCharge ?? 0;
  const totalDiscount = order.couponDiscount || (pricingDetails?.couponDiscount || 0);
  const total = subtotal - totalDiscount + shipping + cod;
  
  const discountedAmount = subtotal - totalDiscount;
  const taxableValue = discountedAmount / 1.18;
  const cgst = (discountedAmount - taxableValue) / 2;
  const sgst = (discountedAmount - taxableValue) / 2;
  // --- End of mock data replacement ---

  const checkIconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: { 
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.2
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const statusLevels = {
    'Order Placed': 1,
    'Processing': 2,
    'Shipped': 3,
    'Delivered': 4
  };
  const currentStatusLevel = statusLevels[order.orderStatus] || 1;

  return (
    <div className="min-h-screen bg-[#f9aeaf] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-lg shadow-lg p-8 mb-6 text-center"
        >
          <motion.div
            variants={checkIconVariants}
            initial="hidden"
            animate="visible"
            className="inline-block"
          >
            <FaCheckCircle className="text-7xl text-green-500 mx-auto" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-bold text-gray-800 mt-4"
          >
            Order Placed Successfully!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-600 mt-2"
          >
            Thank you for your purchase. Your order has been confirmed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 p-4 bg-[#fff5f5] border-2 border-[#e8767a] rounded-lg inline-block"
          >
            <p className="text-sm text-gray-600">Order Number</p>
            <p className="text-2xl font-bold text-[#e8767a]">{orderNumber}</p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-sm text-gray-500 mt-4 flex items-center justify-center"
          >
            <FaEnvelope className="mr-2" />
            Order confirmation has been sent to your email
          </motion.p>
        </motion.div>

        {/* Order Timeline */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <motion.h2 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }}}
            className="text-xl font-bold text-gray-800 mb-6"
          >
            Delivery Status
          </motion.h2>
          
          <div className="space-y-4">
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="flex items-start">
              <div className="flex flex-col items-center mr-4">
                <div className={`w-10 h-10 ${currentStatusLevel >= 1 ? 'bg-green-500' : 'bg-gray-200'} rounded-full flex items-center justify-center`}>
                  <FaCheckCircle className="text-white" />
                </div>
                <div className="w-1 h-16 bg-[#f9aeaf] mt-2"></div>
              </div>
              <div className="flex-1 pt-2">
                <p className="font-bold text-gray-800">Order Confirmed</p>
                <p className="text-sm text-gray-600">Your order has been placed successfully</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(order.date).toLocaleString()}</p>
              </div>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="flex items-start">
              <div className="flex flex-col items-center mr-4">
                <div className={`w-10 h-10 ${currentStatusLevel >= 2 ? 'bg-[#e8767a]' : 'bg-gray-200'} rounded-full flex items-center justify-center`}>
                  <FaBox className="text-white" />
                </div>
                <div className="w-1 h-16 bg-gray-200 mt-2"></div>
              </div>
              <div className="flex-1 pt-2">
                <p className={`font-bold ${currentStatusLevel >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>Processing</p>
                <p className="text-sm text-gray-600">We're preparing your items</p>
                <p className="text-xs text-gray-400 mt-1">Expected: Tomorrow</p>
              </div>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="flex items-start">
              <div className="flex flex-col items-center mr-4">
                <div className={`w-10 h-10 ${currentStatusLevel >= 3 ? 'bg-[#e8767a]' : 'bg-gray-200'} rounded-full flex items-center justify-center`}>
                  <FaShippingFast className="text-white" />
                </div>
                <div className="w-1 h-16 bg-gray-200 mt-2"></div>
              </div>
              <div className="flex-1 pt-2">
                <p className={`font-bold ${currentStatusLevel >= 3 ? 'text-gray-800' : 'text-gray-400'}`}>Shipped</p>
                <p className="text-sm text-gray-500">On the way to you</p>
                <p className="text-xs text-gray-400 mt-1">Expected: {new Date(new Date().setDate(new Date().getDate() + 2)).toLocaleDateString()}</p>
              </div>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="flex items-start">
              <div className="flex flex-col items-center mr-4">
                <div className={`w-10 h-10 ${currentStatusLevel >= 4 ? 'bg-[#e8767a]' : 'bg-gray-200'} rounded-full flex items-center justify-center`}>
                  <FaMapMarkerAlt className="text-white" />
                </div>
              </div>
              <div className="flex-1 pt-2">
                <p className={`font-bold ${currentStatusLevel >= 4 ? 'text-gray-800' : 'text-gray-400'}`}>Delivered</p>
                <p className="text-sm text-gray-500">Package delivered</p>
                <p className="text-xs text-gray-400 mt-1">Expected: {estimatedDelivery}</p>
              </div>
            </motion.div>
          </div>

          <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            className="mt-6 p-4 bg-[#fff5f5] rounded-lg border border-[#f9aeaf]"
          >
            <div className="flex items-center text-[#e8767a]">
              <FaCalendarAlt className="mr-2" />
              <p className="font-semibold">Estimated Delivery: {estimatedDelivery}</p>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Delivery Address */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <h3 className="text-lg font-bold text-gray-800 flex items-center mb-4">
              <FaMapMarkerAlt className="mr-2 text-[#e8767a]" />
              Delivery Address
            </h3>
            <div className="text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">{address.name}</p>
              <p className="text-sm">{address.address}</p>
              <p className="text-sm">{address.city}, {address.zip}, {address.country}</p>
              <p className="text-sm mt-2">Phone: {address.phone}</p>
            </div>
          </motion.div>

          {/* Payment Method */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <h3 className="text-lg font-bold text-gray-800 flex items-center mb-4">
              <FaMoneyBillWave className="mr-2 text-[#e8767a]" />
              Payment Method
            </h3>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-[#fff5f5] rounded-lg flex items-center justify-center mr-3">
                {order.paymentMethod === 'COD' ? <FaMoneyBillWave className="text-2xl text-[#e8767a]" /> : <FaCreditCard className="text-2xl text-[#e8767a]" />}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Card Payment'}</p>
                <p className="text-sm text-gray-600">Total: ₹{total}</p>
              </div>
            </div>
          </motion.div>
        </div >

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <h3 className="text-lg font-bold text-gray-800 flex items-center mb-4">
            <FaFileInvoice className="mr-2 text-[#e8767a]" />
            Order Summary
          </h3>

          <div className="space-y-4 mb-4">
            {order.items.map((item, index) => {
              const itemPrice = parseFloat(item.price || 0);
              const itemQuantity = parseFloat(item.quantity || 0);
              const itemDiscount = parseFloat(item.discountAmount || 0);
              const itemTotal = (itemPrice * itemQuantity) - itemDiscount;

              return (
                <motion.div
                  key={item.productId + item.size + item.color}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + (index * 0.1) }}
                  className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-0"
                >
                  <div className="flex items-center flex-1">
                    <img src={item.image} className="w-12 h-12 object-cover mr-3 rounded" />
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        {itemDiscount > 0 && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">
                            DISCOUNT APPLIED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-gray-800 ${itemDiscount > 0 ? 'line-through text-xs text-gray-400' : ''}`}>
                      ₹{(itemPrice * itemQuantity).toFixed(2)}
                    </p>
                    {itemDiscount > 0 && (
                      <p className="font-bold text-green-600">
                        ₹{itemTotal.toFixed(2)}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Total Discount</span>
                <span>- ₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>₹{shipping.toFixed(2)}</span>
            </div>
            {cod > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>COD Charges</span>
                <span>₹{cod.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between text-xl font-bold">
              <span className="text-gray-800">Total</span>
              <span className="text-[#e8767a]">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link to="/" className="flex-1">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
                <FaShoppingBag className="mr-2" />
                Continue Shopping
            </motion.button>
          </Link>
          <motion.button
              onClick={handleDownloadInvoice}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
          >
              <FaFileInvoice className="mr-2" />
              Download Invoice
          </motion.button>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-center text-gray-600 text-sm"
        >
          <p>Need help with your order? <Link to="/support" className="text-[#e8767a] hover:underline font-semibold">Contact Support</Link></p>
        </motion.div>
      </div>
    </div>
  );
}
