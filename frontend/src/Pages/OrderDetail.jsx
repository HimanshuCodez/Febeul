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
  FaCreditCard,
  FaTruckLoading,
  FaClipboardList,
  FaUndo,
  FaCamera
} from 'react-icons/fa';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from "../store/authStore";
import Loader from '../components/Loader';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// --- Return/Exchange Modal Component ---
const ReturnExchangeModal = ({ orderId, token, onClose, onSubmitted }) => {
    const [reason, setReason] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleImageChange = (e) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            if (images.length + filesArray.length > 4) {
                toast.error("You can upload a maximum of 4 images.");
                return;
            }
            
            const newImages = [...images, ...filesArray];
            setImages(newImages);

            const newPreviews = filesArray.map(file => URL.createObjectURL(file));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index) => {
        const newImages = [...images];
        const newPreviews = [...imagePreviews];
        
        newImages.splice(index, 1);
        newPreviews.splice(index, 1);

        setImages(newImages);
        setImagePreviews(newPreviews);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.error("Please provide a reason for your request.");
            return;
        }
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('reason', reason);
        images.forEach(image => {
            formData.append('images', image);
        });

        try {
            const response = await axios.post(`${backendUrl}/api/refund/request`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    token: token
                }
            });

            if (response.data.success) {
                toast.success("Return/Exchange request submitted successfully.");
                onSubmitted();
            } else {
                toast.error(response.data.message || "Failed to submit request.");
            }
        } catch (error) {
            console.error("Error submitting refund request:", error);
            toast.error(error.response?.data?.message || "An error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.8, y: -50 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-lg shadow-xl w-full max-w-lg"
            >
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Request Return or Exchange</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason for return/exchange</label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows="4"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#e8767a] focus:border-[#e8767a]"
                            placeholder="Please describe the issue with the item(s)..."
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photos (Max 4)</label>
                        <div className="flex items-center gap-4">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative">
                                    <img src={preview} alt="preview" className="w-20 h-20 object-cover rounded-md" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {images.length < 4 && (
                                <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                                    <FaCamera className="text-gray-400 text-2xl" />
                                    <span className="text-xs text-gray-500 mt-1">Add</span>
                                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 text-white bg-[#e8767a] rounded-lg hover:bg-[#d5666a] disabled:bg-gray-400"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};


export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { token, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/order/${orderId}`, {
        headers: { token },
      });
      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        setError(response.data.message || 'Failed to fetch order details.');
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Error fetching order details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth'); // Redirect to login if not authenticated
      return;
    }
    fetchOrderDetails();
  }, [orderId, token, isAuthenticated, navigate]);

  const handleDownloadInvoice = async () => {
    try {
        const invoiceUrl = `${backendUrl}/api/order/invoice/${orderId}`;
        
        const response = await axios.get(invoiceUrl, {
            headers: {
                token: token
            },
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice_${orderId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

    } catch (err) {
        console.error('Error downloading invoice:', err);
        // Optionally show a toast error to the user
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f9aeaf]"><Loader className="animate-spin text-pink-500" size={48} /></div>;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#f9aeaf] flex items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="bg-white p-10 rounded-xl shadow-lg"
        >
          <h1 className="text-2xl font-bold text-red-500">Order Details Not Found</h1>
          <p className="text-gray-600 mt-2">{error || 'Could not retrieve order details.'}</p>
          <Link to="/" className="mt-4 inline-block bg-[#e8767a] text-white px-4 py-2 rounded-lg hover:bg-[#d5666a]">Go to Homepage</Link>
        </motion.div>
      </div>
    );
  }

  // Calculate if return is eligible
  const isReturnEligible = () => {
    if (order.orderStatus !== 'Delivered' || !order.deliveredAt) {
      return false;
    }
    const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000;
    const deliveredDate = new Date(order.deliveredAt);
    const currentDate = new Date();
    return (currentDate - deliveredDate) <= threeDaysInMillis;
  };

  const returnPossible = isReturnEligible();

  // Use pricing details from the order object
  const productAmount = order.productAmount || (order.items || []).reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseFloat(item.quantity || 0)), 0);
  let shippingCharge = order.shippingCharge || 0;
  let codCharge = order.codCharge || 0;
  const orderTotal = (productAmount - (order.couponDiscount || 0) + shippingCharge + codCharge + (order.giftWrap?.price || 0));

  // If payment method is COD and the total seems to include a 50rs charge that isn't accounted for, assume it's the COD charge.
  if (order.paymentMethod === 'COD' && codCharge === 0) {
      const unaccountedAmount = orderTotal - (productAmount + shippingCharge + (order.giftWrap?.price || 0));
      if (unaccountedAmount > 49 && unaccountedAmount < 51) {
          codCharge = unaccountedAmount;
          // If the unaccounted amount was hiding in shipping, remove it from there.
          if (shippingCharge === unaccountedAmount) {
              shippingCharge = 0;
          }
      }
  }

  const orderNumberToDisplay = order?._id;
  
  console.log("Debug: order.deliveredAt from backend:", order.deliveredAt);
  const parsedDeliveredDate = new Date(order.deliveredAt);
  console.log("Debug: new Date(order.deliveredAt):", parsedDeliveredDate);
  console.log("Debug: parsedDeliveredDate is valid:", !isNaN(parsedDeliveredDate.getTime()));

  const estimatedDelivery = order.deliveredAt 
    ? parsedDeliveredDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : (order.shippedAt ? `Est: ${new Date(new Date(order.shippedAt).setDate(new Date(order.shippedAt).getDate() + 5)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Not available');
  
  const statusLevels = {
    'Order Placed': 1,
    'Processing': 2,
    'Confirmed': 2.5, // Between processing and shipped
    'Shipped': 3,
    'Out for delivery': 3.5, // Between shipped and delivered
    'Delivered': 4,
    'Cancelled': 0, // Special case
    'Returned': 0, // Special case
    'Refund Initiated': 0, // Special case
    'Refunded': 0 // Special case
  };
  const currentStatusLevel = statusLevels[order.orderStatus] || 1;

  // Function to get status icon and color
  const getStatusDisplay = (status, level) => {
    let icon = <FaCheckCircle />;
    let color = 'bg-gray-200';
    let textColor = 'text-gray-400';

    if (level <= currentStatusLevel && statusLevels[status] <= currentStatusLevel) {
        color = 'bg-[#e8767a]'; // Active color
        textColor = 'text-gray-800'; // Active text color
        if (status === 'Order Placed' || status === 'Confirmed') icon = <FaCheckCircle />;
        else if (status === 'Processing') icon = <FaBox />;
        else if (status === 'Shipped') icon = <FaShippingFast />;
        else if (status === 'Out for delivery') icon = <FaTruckLoading />;
        else if (status === 'Delivered') icon = <FaMapMarkerAlt />;
    }
    
    if (order.orderStatus === 'Cancelled') {
        color = 'bg-red-500'; icon = <X />; textColor = 'text-red-500';
    } else if (order.orderStatus === 'Returned') {
        color = 'bg-orange-500'; icon = <FaUndo />; textColor = 'text-orange-500';
    } else if (order.orderStatus === 'Refund Initiated' || order.orderStatus === 'Refunded') {
        color = 'bg-purple-500'; icon = <FaMoneyBillWave />; textColor = 'text-purple-500';
    }


    return { icon, color, textColor };
  };


  return (
    <>
      {isReturnModalOpen && (
        <ReturnExchangeModal 
            orderId={order._id}
            token={token}
            onClose={() => setIsReturnModalOpen(false)}
            onSubmitted={() => {
                setIsReturnModalOpen(false);
                fetchOrderDetails(); // Re-fetch order details to show updated status
            }}
        />
      )}
      <div className="min-h-screen bg-[#f9aeaf] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Order Details Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-lg shadow-lg p-8 mb-6 text-center"
          >
            <motion.div
              variants={{
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
              }}
              initial="hidden"
              animate="visible"
              className="inline-block"
            >
              <FaClipboardList className="text-7xl text-[#e8767a] mx-auto" />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold text-gray-800 mt-4"
            >
              Order Details
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-gray-600 mt-2"
            >
              Here are the details for your order.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 p-4 bg-[#fff5f5] border-2 border-[#e8767a] rounded-lg inline-block"
            >
              <p className="text-sm text-gray-600">Order Number</p>
              <p className="text-2xl font-bold text-[#e8767a]">{orderNumberToDisplay}</p>
            </motion.div>

            {order.shiprocket?.trackingUrl && (
              <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-sm text-blue-500 mt-4 flex items-center justify-center hover:underline cursor-pointer"
                  onClick={() => window.open(order.shiprocket.trackingUrl, '_blank')}
              >
                  <FaShippingFast className="mr-2" />
                  Track Order
              </motion.p>
            )}

          </motion.div>

          {/* Order Timeline */}
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { 
                  staggerChildren: 0.1,
                  delayChildren: 0.3
                }
              }
            }}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-lg shadow-md p-6 mb-6"
          >
            <motion.h2 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }}}
              className="text-xl font-bold text-gray-800 mb-6"
            >
              Order Status: {order.orderStatus}
            </motion.h2>
            
            <div className="space-y-4">
              {[
                { status: 'Order Placed', label: 'Order Confirmed', description: 'Your order has been placed successfully', date: new Date(order.date).toLocaleString(), level: 1 },
                { status: 'Processing', label: 'Processing', description: 'We\'re preparing your items', date: order.date ? new Date(order.date).toLocaleString() : null, level: 2 },
                { status: 'Confirmed', label: 'Order Confirmed', description: 'Your order has been confirmed and is being processed', date: order.date ? new Date(order.date).toLocaleString() : null, level: 2.5 }, // Added for clarity
                { status: 'Shipped', label: 'Shipped', description: 'On the way to you', date: order.shippedAt ? new Date(order.shippedAt).toLocaleString() : null, level: 3 },
                { status: 'Out for delivery', label: 'Out for Delivery', description: 'Your package is out for delivery', date: order.shippedAt ? new Date(order.shippedAt).toLocaleString() : null, level: 3.5 }, // Added for clarity
                { status: 'Delivered', label: 'Delivered', description: 'Package delivered', date: order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : null, level: 4 }
              ].filter(s => s.statusLevels === 0 ? true : statusLevels[s.status] > 0).map((statusItem, index) => {
                  const { icon, color, textColor } = getStatusDisplay(statusItem.status, statusItem.level);
                  return (
                      <motion.div key={index} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="flex items-start">
                          <div className="flex flex-col items-center mr-4">
                              <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center`}>
                                  {icon}
                              </div>
                              {index < 5 && <div className={`w-1 h-16 ${statusItem.level < currentStatusLevel ? 'bg-[#f9aeaf]' : 'bg-gray-200'} mt-2`}></div>}
                          </div>
                          <div className="flex-1 pt-2">
                              <p className={`font-bold ${textColor}`}>{statusItem.label}</p>
                              <p className="text-sm text-gray-600">{statusItem.description}</p>
                              {statusItem.date && <p className="text-xs text-gray-400 mt-1">{statusItem.date}</p>}
                          </div>
                      </motion.div>
                  );
              })}
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
                <p className="font-semibold text-gray-800">{order.address.name}</p>
                <p className="text-sm">{order.address.address}</p>
                <p className="text-sm">{order.address.city}, {order.address.zip}, {order.address.country}</p>
                <p className="text-sm mt-2">Phone: {order.address.phone}</p>
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
                  <p className="text-sm text-gray-600">Total: ₹{orderTotal.toFixed(2)}</p>
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
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                          {itemDiscount > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              Discount Applied
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
                <span>₹{productAmount.toFixed(2)}</span>
              </div>
              {order.couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                      <span>Total Discount</span>
                      <span>- ₹{order.couponDiscount.toFixed(2)}</span>
                  </div>
              )}
              
              {shippingCharge > 0 && (
                  <div className="flex justify-between text-gray-600">
                      <span>Shipping Charge</span>
                      <span>₹{shippingCharge.toFixed(2)}</span>
                  </div>
              )}
              {codCharge > 0 && (
                  <div className="flex justify-between text-gray-600">
                      <span>COD Charge</span>
                      <span>₹{codCharge.toFixed(2)}</span>
                  </div>
              )}
              {order.giftWrap && order.giftWrap.price > 0 && (
                  <div className="flex justify-between text-gray-600">
                      <span>Gift Wrap ({order.giftWrap.name})</span>
                      <span>₹{order.giftWrap.price.toFixed(2)}</span>
                  </div>
              )}
              <div className="border-t pt-3 flex justify-between text-xl font-bold">
                <span className="text-gray-800">Total</span>
                <span className="text-[#e8767a]">₹{(productAmount - (order.couponDiscount || 0) + shippingCharge + codCharge + (order.giftWrap?.price || 0)).toFixed(2)}</span>
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
                  <FaHome className="mr-2" />
                  Go to Homepage
              </motion.button>
            </Link>
            
            <motion.button
                onClick={handleDownloadInvoice}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
                <FaFileInvoice className="mr-2" />
                Download Invoice
            </motion.button>
          </motion.div>

          {/* Return/Exchange Button */}
          {returnPossible && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mt-4"
            >
              <motion.button
                  onClick={() => setIsReturnModalOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                  <FaUndo className="mr-2" />
                  Return/Exchange
              </motion.button>
            </motion.div>
          )}

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
    </>
  );
}
