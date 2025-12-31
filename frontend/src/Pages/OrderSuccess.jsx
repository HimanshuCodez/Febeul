import React from 'react';
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
  FaShoppingBag
} from 'react-icons/fa';

export default function OrderSuccess() {
  const orderNumber = "ORD-2025-" + Math.floor(Math.random() * 100000);
  const estimatedDelivery = "Jan 5-7, 2026";
  
  const orderItems = [
    { id: 1, name: "Wireless Bluetooth Headphones", price: 79.99, qty: 1, img: "🎧" },
    { id: 2, name: "Smart Watch Series 5", price: 299.99, qty: 1, img: "⌚" },
    { id: 3, name: "USB-C Charging Cable", price: 12.99, qty: 2, img: "🔌" }
  ];

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const shipping = 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

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
            variants={itemVariants}
            className="text-xl font-bold text-gray-800 mb-6"
          >
            Delivery Status
          </motion.h2>
          
          <div className="space-y-4">
            <motion.div variants={itemVariants} className="flex items-start">
              <div className="flex flex-col items-center mr-4">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="text-white" />
                </div>
                <div className="w-1 h-16 bg-[#f9aeaf] mt-2"></div>
              </div>
              <div className="flex-1 pt-2">
                <p className="font-bold text-gray-800">Order Confirmed</p>
                <p className="text-sm text-gray-600">Your order has been placed successfully</p>
                <p className="text-xs text-gray-400 mt-1">Today, 2:30 PM</p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-start">
              <div className="flex flex-col items-center mr-4">
                <div className="w-10 h-10 bg-[#e8767a] rounded-full flex items-center justify-center">
                  <FaBox className="text-white" />
                </div>
                <div className="w-1 h-16 bg-gray-200 mt-2"></div>
              </div>
              <div className="flex-1 pt-2">
                <p className="font-bold text-gray-800">Processing</p>
                <p className="text-sm text-gray-600">We're preparing your items</p>
                <p className="text-xs text-gray-400 mt-1">Expected: Tomorrow</p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-start">
              <div className="flex flex-col items-center mr-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <FaShippingFast className="text-gray-400" />
                </div>
                <div className="w-1 h-16 bg-gray-200 mt-2"></div>
              </div>
              <div className="flex-1 pt-2">
                <p className="font-bold text-gray-400">Shipped</p>
                <p className="text-sm text-gray-500">On the way to you</p>
                <p className="text-xs text-gray-400 mt-1">Expected: Jan 3-4</p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-start">
              <div className="flex flex-col items-center mr-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <FaMapMarkerAlt className="text-gray-400" />
                </div>
              </div>
              <div className="flex-1 pt-2">
                <p className="font-bold text-gray-400">Delivered</p>
                <p className="text-sm text-gray-500">Package delivered</p>
                <p className="text-xs text-gray-400 mt-1">Expected: {estimatedDelivery}</p>
              </div>
            </motion.div>
          </div>

          <motion.div 
            variants={itemVariants}
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
              <p className="font-semibold text-gray-800">John Doe</p>
              <p className="text-sm">123 Main Street, Apartment 4B</p>
              <p className="text-sm">New York, NY 10001</p>
              <p className="text-sm mt-2">Phone: +1 (555) 123-4567</p>
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
                <FaMoneyBillWave className="text-2xl text-[#e8767a]" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Cash on Delivery</p>
                <p className="text-sm text-gray-600">Pay ${total.toFixed(2)} on delivery</p>
              </div>
            </div>
          </motion.div>
        </div>

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
            {orderItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + (index * 0.1) }}
                className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-0"
              >
                <div className="flex items-center flex-1">
                  <span className="text-3xl mr-3">{item.img}</span>
                  <div>
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-sm text-gray-500">Quantity: {item.qty}</p>
                  </div>
                </div>
                <p className="font-bold text-gray-800">${(item.price * item.qty).toFixed(2)}</p>
              </motion.div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-xl font-bold">
              <span className="text-gray-800">Total</span>
              <span className="text-[#e8767a]">${total.toFixed(2)}</span>
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
          >
            <FaShoppingBag className="mr-2" />
            Continue Shopping
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 bg-white hover:bg-gray-50 text-[#e8767a] font-bold py-3 px-6 rounded-lg border-2 border-[#e8767a] transition-colors flex items-center justify-center"
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
          <p>Need help with your order? <a href="#" className="text-[#e8767a] hover:underline font-semibold">Contact Support</a></p>
        </motion.div>
      </div>
    </div>
  );
}