import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaMapMarkerAlt, 
  FaMoneyBillWave, 
  FaCreditCard, 
  FaShoppingBag,
  FaCheck,
  FaChevronRight,
  FaEdit
} from 'react-icons/fa';

export default function CheckoutPage() {
  const [selectedAddress, setSelectedAddress] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [step, setStep] = useState(1);

  const addresses = [
    {
      id: 1,
      name: "John Doe",
      address: "123 Main Street, Apartment 4B",
      city: "New York, NY 10001",
      phone: "+1 (555) 123-4567"
    },
    {
      id: 2,
      name: "John Doe",
      address: "456 Oak Avenue, Suite 200",
      city: "Brooklyn, NY 11201",
      phone: "+1 (555) 987-6543"
    }
  ];

  const cartItems = [
    { id: 1, name: "Wireless Bluetooth Headphones", price: 79.99, qty: 1, img: "🎧" },
    { id: 2, name: "Smart Watch Series 5", price: 299.99, qty: 1, img: "⌚" },
    { id: 3, name: "USB-C Charging Cable", price: 12.99, qty: 2, img: "🔌" }
  ];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const shipping = 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-[#f9aeaf] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <h1 className="text-3xl font-bold text-gray-800">Checkout</h1>
          <div className="flex items-center mt-4 text-sm">
            <span className={`flex items-center ${step >= 1 ? 'text-[#e8767a]' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 1 ? 'bg-[#e8767a] text-white' : 'bg-gray-200'}`}>
                {step > 1 ? <FaCheck /> : '1'}
              </span>
              Address
            </span>
            <FaChevronRight className="mx-4 text-gray-400" />
            <span className={`flex items-center ${step >= 2 ? 'text-[#e8767a]' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 2 ? 'bg-[#e8767a] text-white' : 'bg-gray-200'}`}>
                {step > 2 ? <FaCheck /> : '2'}
              </span>
              Payment
            </span>
            <FaChevronRight className="mx-4 text-gray-400" />
            <span className={`flex items-center ${step >= 3 ? 'text-[#e8767a]' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 3 ? 'bg-[#e8767a] text-white' : 'bg-gray-200'}`}>
                3
              </span>
              Review
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Delivery Address */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-[#e8767a]" />
                  Delivery Address
                </h2>
                {step > 1 && (
                  <button 
                    onClick={() => setStep(1)}
                    className="text-[#e8767a] hover:text-[#d5666a] flex items-center text-sm"
                  >
                    <FaEdit className="mr-1" /> Change
                  </button>
                )}
              </div>

              {step === 1 ? (
                <div className="space-y-3">
                  {addresses.map((addr, idx) => (
                    <motion.div
                      key={addr.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedAddress(idx)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedAddress === idx 
                          ? 'border-[#e8767a] bg-[#fff5f5]' 
                          : 'border-gray-200 hover:border-[#f9aeaf]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-gray-800">{addr.name}</p>
                          <p className="text-gray-600 text-sm mt-1">{addr.address}</p>
                          <p className="text-gray-600 text-sm">{addr.city}</p>
                          <p className="text-gray-600 text-sm mt-1">Phone: {addr.phone}</p>
                        </div>
                        {selectedAddress === idx && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-[#e8767a] rounded-full flex items-center justify-center"
                          >
                            <FaCheck className="text-white text-xs" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(2)}
                    className="w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 px-6 rounded-lg transition-colors mt-4"
                  >
                    Use this address
                  </motion.button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-2 border-[#e8767a] bg-[#fff5f5] rounded-lg p-4"
                >
                  <p className="font-bold text-gray-800">{addresses[selectedAddress].name}</p>
                  <p className="text-gray-600 text-sm mt-1">{addresses[selectedAddress].address}</p>
                  <p className="text-gray-600 text-sm">{addresses[selectedAddress].city}</p>
                  <p className="text-gray-600 text-sm mt-1">Phone: {addresses[selectedAddress].phone}</p>
                </motion.div>
              )}
            </motion.div>

            {/* Payment Method */}
            {step >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <FaCreditCard className="mr-2 text-[#e8767a]" />
                    Payment Method
                  </h2>
                  {step > 2 && (
                    <button 
                      onClick={() => setStep(2)}
                      className="text-[#e8767a] hover:text-[#d5666a] flex items-center text-sm"
                    >
                      <FaEdit className="mr-1" /> Change
                    </button>
                  )}
                </div>

                {step === 2 ? (
                  <div className="space-y-3">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedPayment('card')}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPayment === 'card' 
                          ? 'border-[#e8767a] bg-[#fff5f5]' 
                          : 'border-gray-200 hover:border-[#f9aeaf]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FaCreditCard className="text-2xl text-[#e8767a] mr-3" />
                          <div>
                            <p className="font-bold text-gray-800">Credit / Debit Card</p>
                            <p className="text-sm text-gray-600">Pay with your card via payment gateway</p>
                          </div>
                        </div>
                        {selectedPayment === 'card' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-[#e8767a] rounded-full flex items-center justify-center"
                          >
                            <FaCheck className="text-white text-xs" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedPayment('cod')}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPayment === 'cod' 
                          ? 'border-[#e8767a] bg-[#fff5f5]' 
                          : 'border-gray-200 hover:border-[#f9aeaf]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FaMoneyBillWave className="text-2xl text-[#e8767a] mr-3" />
                          <div>
                            <p className="font-bold text-gray-800">Cash on Delivery</p>
                            <p className="text-sm text-gray-600">Pay with cash when you receive</p>
                          </div>
                        </div>
                        {selectedPayment === 'cod' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-[#e8767a] rounded-full flex items-center justify-center"
                          >
                            <FaCheck className="text-white text-xs" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectedPayment && setStep(3)}
                      disabled={!selectedPayment}
                      className={`w-full font-bold py-3 px-6 rounded-lg transition-colors mt-4 ${
                        selectedPayment 
                          ? 'bg-[#e8767a] hover:bg-[#d5666a] text-white' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Continue
                    </motion.button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-2 border-[#e8767a] bg-[#fff5f5] rounded-lg p-4 flex items-center"
                  >
                    {selectedPayment === 'card' ? (
                      <>
                        <FaCreditCard className="text-2xl text-[#e8767a] mr-3" />
                        <div>
                          <p className="font-bold text-gray-800">Credit / Debit Card</p>
                          <p className="text-sm text-gray-600">Payment Gateway</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <FaMoneyBillWave className="text-2xl text-[#e8767a] mr-3" />
                        <div>
                          <p className="font-bold text-gray-800">Cash on Delivery</p>
                          <p className="text-sm text-gray-600">Pay on delivery</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-lg shadow-md p-6 sticky top-8"
            >
              <h2 className="text-xl font-bold text-gray-800 flex items-center mb-4">
                <FaShoppingBag className="mr-2 text-[#e8767a]" />
                Order Summary
              </h2>

              <div className="space-y-3 mb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-start justify-between text-sm">
                    <div className="flex items-start flex-1">
                      <span className="text-2xl mr-2">{item.img}</span>
                      <div>
                        <p className="text-gray-800 font-medium">{item.name}</p>
                        <p className="text-gray-500 text-xs">Qty: {item.qty}</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-800">${(item.price * item.qty).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
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
                <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-800">
                  <span>Total</span>
                  <span className="text-[#e8767a]">${total.toFixed(2)}</span>
                </div>
              </div>

              {step === 3 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 px-6 rounded-lg transition-colors mt-6"
                >
                  Place Order
                </motion.button>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}