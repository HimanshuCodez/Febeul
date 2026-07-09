import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  FaCamera,
  FaCrown
} from 'react-icons/fa';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from "../store/authStore";
import Loader from '../components/Loader';
import { X, XCircle, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

import SimilarItems from '../components/SimilarItems';
import Reviews from '../components/Reviews';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// --- Return/Exchange Modal Component ---
const ReturnExchangeModal = ({ order, token, onClose, onSubmitted }) => {
    const [reason, setReason] = useState('');
    const [type, setType] = useState('return'); // 'return' or 'refund'
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bankDetails, setBankDetails] = useState({
        accountHolderName: '',
        accountNumber: '',
        ifsc: '',
        bankName: ''
    });

    const isCod = order.paymentMethod === 'COD';

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBankDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            if (images.length + filesArray.length > 4) {
                toast.error("You must upload exactly 4 images.");
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
            toast.error("Please provide a reason.");
            return;
        }
        if (images.length !== 4) {
            toast.error("Please upload exactly 4 images for verification.");
            return;
        }
        if (isCod && (!bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifsc)) {
            toast.error("Please provide bank details for the refund.");
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('orderId', order._id);
        formData.append('reason', `${type.toUpperCase()}: ${reason}`);
        if (isCod) {
            formData.append('payoutDetails', JSON.stringify(bankDetails));
        }
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
                toast.success("Request submitted successfully.");
                onSubmitted();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
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
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
            <motion.div
                initial={{ scale: 0.8, y: -50 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-lg shadow-xl w-full max-w-lg my-8"
            >
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Return or Refund Request</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                        <select 
                            value={type} 
                            onChange={e => setType(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        >
                            <option value="return">Return Product</option>
                            <option value="refund">Full Refund Request</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows="3"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#e8767a] focus:border-[#e8767a]"
                            placeholder="Describe the issue..."
                        ></textarea>
                    </div>

                    {isCod && (
                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                                <FaCreditCard className="text-[#e8767a]" />
                                Bank Details for Refund
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <input type="text" name="accountHolderName" placeholder="Account Holder Name" value={bankDetails.accountHolderName} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm" required />
                                <input type="text" name="accountNumber" placeholder="Account Number" value={bankDetails.accountNumber} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm" required />
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" name="ifsc" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm uppercase" required />
                                    <input type="text" name="bankName" placeholder="Bank Name" value={bankDetails.bankName} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload 4 Images (Required)</label>
                        <div className="flex flex-wrap gap-2">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative">
                                    <img src={preview} alt="preview" className="w-16 h-16 object-cover rounded-md" />
                                    <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"><X size={12} /></button>
                                </div>
                            ))}
                            {images.length < 4 && (
                                <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                                    <FaCamera className="text-gray-400 text-xl" />
                                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">{images.length}/4 images uploaded</p>
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSubmitting || images.length !== 4} className="px-4 py-2 text-white bg-[#e8767a] rounded-lg disabled:bg-gray-300">
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

// --- Cancellation Modal Component ---
const CancellationModal = ({ order, token, onClose, onCancelled }) => {
    const [reason, setReason] = useState('');
    const [bankDetails, setBankDetails] = useState({
        accountHolderName: '',
        accountNumber: '',
        ifsc: '',
        bankName: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isCod = order.paymentMethod === 'COD';

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBankDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isCod && (!bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifsc)) {
            toast.error("Please provide bank details for refund (Industry standard).");
            return;
        }
        setIsSubmitting(true);

        try {
            const response = await axios.post(`${backendUrl}/api/order/cancel`, {
                orderId: order._id,
                reason,
                bankDetails: isCod ? bankDetails : null
            }, {
                headers: { token }
            });

            if (response.data.success) {
                toast.success(response.data.message);
                onCancelled();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
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
                className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-2xl font-bold text-gray-800">Cancel Order</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason for cancellation</label>
                        <select
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#e8767a] focus:border-[#e8767a]"
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
                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <FaCreditCard className="text-[#e8767a]" />
                                Bank Details for Refund
                            </h3>
                            <p className="text-xs text-gray-500 italic">Industry standard: Provide details to receive your refund for this COD order.</p>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <input type="text" name="accountHolderName" placeholder="Account Holder Name" value={bankDetails.accountHolderName} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm" required />
                                <input type="text" name="accountNumber" placeholder="Account Number" value={bankDetails.accountNumber} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm" required />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" name="ifsc" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm uppercase" required />
                                    <input type="text" name="bankName" placeholder="Bank Name" value={bankDetails.bankName} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg font-bold uppercase text-xs tracking-widest">Keep Order</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 text-white bg-red-600 rounded-lg disabled:bg-gray-400 font-bold uppercase text-xs tracking-widest">
                            {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};


export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { token, isAuthenticated, siteSettings, fetchSiteSettings } = useAuthStore();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [showCancelledAnimation, setShowCancelledAnimation] = useState(false);

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/order/${orderId}`, {
        headers: { token },
      });
      if (response.data.success) {
        setOrder(response.data.order);
        setTrackingData(response.data.trackingData || null);
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

  const onOrderCancelled = () => {
    setIsCancellationModalOpen(false);
    setShowCancelledAnimation(true);
    setTimeout(() => {
        setShowCancelledAnimation(false);
        fetchOrderDetails();
    }, 3000);
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

  const isLuxeOrder = order.items.some(item => item.name === "Febeul Luxe Membership" || item.sku === "LUXE-MEMBERSHIP");

  const getDisplayStatus = () => {
    const shiprocketStatus = (order.shiprocketStatus || '').toUpperCase();
    if (isLuxeOrder && order.payment) return 'Delivered';
    if (order.deliveredAt || shiprocketStatus === 'DELIVERED') return 'Delivered';
    if (shiprocketStatus === 'RTO') return 'Returned';
    if (shiprocketStatus === 'CANCELLED') return 'Cancelled';
    if (shiprocketStatus === 'IN_TRANSIT') return order.orderStatus === 'Out for delivery' ? 'Out for delivery' : 'Shipped';
    if (shiprocketStatus === 'SHIPPED') return 'Shipped';
    if (shiprocketStatus === 'PICKUP SCHEDULED') return 'Processing';
    return order.orderStatus;
  };

  const displayStatus = getDisplayStatus();

  // Calculate if return is eligible
  const isReturnEligible = () => {
    if (displayStatus !== 'Delivered' || !order.deliveredAt) {
      return false;
    }
    if (order.refundDetails?.status !== 'none' && order.refundDetails?.status !== 'rejected') {
        return false; // Already requested or processed
    }
    const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000;
    const deliveredDate = new Date(order.deliveredAt);
    const currentDate = new Date();
    return (currentDate - deliveredDate) <= threeDaysInMillis;
  };

  const isCancellationPossible = () => {
    const nonCancellable = ['Shipped', 'Out for delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'];
    return !nonCancellable.includes(displayStatus);
  };

  const returnPossible = isReturnEligible();
  const cancellationPossible = isCancellationPossible();
  const cancellationEligible = !['Delivered', 'Cancelled', 'Returned', 'Refunded'].includes(displayStatus);

  // Use pricing details from the order object
  const productAmount = order.productAmount || (order.items || []).reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseFloat(item.quantity || 0)), 0);
  const shippingCharge = order.shippingCharge || 0;
  const codCharge = order.codCharge || 0;
  const orderTotal = order.orderTotal || (productAmount - (order.couponDiscount || 0) + shippingCharge + codCharge + (order.giftWrap?.price || 0));

  const orderNumberToDisplay = order?._id;
  
  const parsedDeliveredDate = new Date(order.deliveredAt);

  const getExpectedDelivery = () => {
    if (displayStatus === 'Delivered') {
      return 'Delivered';
    }
    
    // Check if we have EDD from Shiprocket
    const srEdd = trackingData?.tracking_data?.shipment_track?.[0]?.edd;
    if (srEdd) {
      return new Date(srEdd).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    
    // Fallback to older estimation logic
    if (order.deliveredAt) {
      return new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (order.shippedAt) {
      const estDate = new Date(order.shippedAt);
      estDate.setDate(estDate.getDate() + 5);
      return `Est: ${estDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return siteSettings.expectedDeliveryDays || '5 to 7 days';
  };

  const estimatedDelivery = getExpectedDelivery();

  const getStatusDate = (status) => {
    if (status === 'Order Placed') {
      return new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (status === 'Processing' || status === 'Confirmed') {
      return new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (status === 'Shipped') {
      if (order.shippedAt) return new Date(order.shippedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const shipActivity = trackingData?.tracking_data?.shipment_track_activities?.find(
        act => act.status?.toLowerCase().includes('shipped') || act.activity?.toLowerCase().includes('shipped')
      );
      return shipActivity ? new Date(shipActivity.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
    }
    if (status === 'Out for delivery') {
      const ofdActivity = trackingData?.tracking_data?.shipment_track_activities?.find(
        act => act.status?.toLowerCase().includes('out for delivery') || act.activity?.toLowerCase().includes('out for delivery')
      );
      return ofdActivity ? new Date(ofdActivity.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
    }
    if (status === 'Delivered') {
      if (order.deliveredAt) return new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const delActivity = trackingData?.tracking_data?.shipment_track_activities?.find(
        act => act.status?.toLowerCase().includes('delivered') || act.activity?.toLowerCase().includes('delivered')
      );
      return delActivity ? new Date(delActivity.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
    }
    return null;
  };
  
  const statusLevels = {
    'Order Placed': 1,
    'Processing': 2,
    'Confirmed': 2,
    'Shipped': 3,
    'Out for delivery': 3.5, // Between shipped and delivered
    'Delivered': 4,
    'Cancelled': 0, // Special case
    'Returned': 0, // Special case
    'Refund Initiated': 0, // Special case
    'Refunded': 0 // Special case
  };
  const currentStatusLevel = statusLevels[displayStatus] || 1;

  // Function to get status icon and color
  const getStatusDisplay = (status, level) => {
    let icon = <Check size={16} />;
    let color = 'bg-gray-200';
    let textColor = 'text-gray-400';

    if (isLuxeOrder && order.payment && status === 'Delivered') {
      color = 'bg-green-500 text-white';
      textColor = 'text-gray-800';
      icon = <Check size={16} />;
      return { icon, color, textColor };
    }

    if (level <= currentStatusLevel && statusLevels[status] <= currentStatusLevel) {
        color = 'bg-[#e8767a] text-white'; // Active color
        textColor = 'text-gray-800'; // Active text color
        if (status === 'Order Placed' || status === 'Confirmed') icon = <Check size={16} />;
        else if (status === 'Processing') icon = <FaBox />;
        else if (status === 'Shipped') icon = <FaShippingFast />;
        else if (status === 'Out for delivery') icon = <FaTruckLoading />;
        else if (status === 'Delivered') icon = <FaMapMarkerAlt />;
    }
    
    if (displayStatus === 'Cancelled') {
        color = 'bg-red-500 text-white'; icon = <X size={16} />; textColor = 'text-red-500';
    } else if (displayStatus === 'Returned') {
        color = 'bg-orange-500 text-white'; icon = <FaUndo />; textColor = 'text-orange-500';
    } else if (displayStatus === 'Refund Initiated' || displayStatus === 'Refunded') {
        color = 'bg-purple-500 text-white'; icon = <FaMoneyBillWave />; textColor = 'text-purple-500';
    }

    return { icon, color, textColor };
  };


  return (
    <>
      <AnimatePresence>
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
        {isCancellationModalOpen && (
            <CancellationModal
                order={order}
                token={token}
                onClose={() => setIsCancellationModalOpen(false)}
                onCancelled={onOrderCancelled}
            />
        )}
        {showCancelledAnimation && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[100] text-center"
            >
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center mb-6"
                >
                    <X size={64} className="text-red-600" />
                </motion.div>
                <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl font-black text-gray-900 uppercase tracking-tighter"
                >
                    Order Cancelled
                </motion.h2>
                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-gray-500 mt-2 font-medium"
                >
                    Your request has been processed successfully.
                </motion.p>
            </motion.div>
        )}
      </AnimatePresence>
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
              {isLuxeOrder ? <FaCrown className="text-7xl text-yellow-500 mx-auto" /> : <FaClipboardList className="text-7xl text-[#e8767a] mx-auto" />}
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold text-gray-800 mt-4"
            >
              {isLuxeOrder ? 'Luxe Membership Active' : 'Order Details'}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-gray-600 mt-2"
            >
              {isLuxeOrder ? 'Thank you for joining the elite.' : 'Here are the details for your order.'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 p-4 bg-[#fff5f5] border-2 border-[#e8767a] rounded-2xl w-full max-w-sm sm:max-w-md mx-auto"
            >
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</p>
              <p className="text-sm sm:text-lg font-bold text-[#e8767a] break-all select-all font-mono mt-1">{orderNumberToDisplay}</p>
            </motion.div>

            {order.shiprocket?.trackingUrl && !isLuxeOrder && displayStatus !== 'Cancelled' && (
              <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-sm text-[#e8767a] hover:text-rose-600 font-bold mt-4 flex items-center justify-center hover:underline cursor-pointer"
                  onClick={() => window.open(order.shiprocket.trackingUrl, '_blank')}
              >
                  <FaShippingFast className="mr-2" />
                  Track on Shiprocket
              </motion.p>
            )}

          </motion.div>

          {/* Redesigned Live Order Tracking Timeline (Meesho / Flipkart style) */}
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
            className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-6 sm:p-8 mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 mb-6 gap-3 text-left">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                  Shipment Tracking
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-0.5">Real-time status updates of your package</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black capitalize w-fit ${
                displayStatus === "Processing" || displayStatus === "Confirmed" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                displayStatus === "Shipped" || displayStatus === "Out for delivery" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                displayStatus === "Delivered" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                displayStatus === "Cancelled" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                "bg-slate-50 text-slate-700 border border-slate-100"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  displayStatus === "Processing" || displayStatus === "Confirmed" ? "bg-amber-500 animate-pulse" :
                  displayStatus === "Shipped" || displayStatus === "Out for delivery" ? "bg-blue-500" :
                  displayStatus === "Delivered" ? "bg-emerald-500" :
                  displayStatus === "Cancelled" ? "bg-rose-500" :
                  "bg-slate-500"
                }`} />
                Status: {displayStatus}
              </span>
            </div>

            {/* Shiprocket Courier Details */}
            {order.shiprocket && order.shiprocket.awb && !isLuxeOrder && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Courier Partner</span>
                  <span className="text-sm font-extrabold text-slate-800">{order.shiprocket.courier || 'Shiprocket'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">AWB Number</span>
                  <span className="text-sm font-extrabold text-[#e8767a] select-all">#{order.shiprocket.awb}</span>
                </div>
                {order.shiprocket.trackingUrl && (
                  <div className="flex items-center">
                    <a 
                      href={order.shiprocket.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center bg-slate-900 text-white font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-black transition-all"
                    >
                      Track Courier Portal
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Timeline Steps (Vertical path) */}
            <div className="space-y-6 relative pl-4 text-left">
              {[
                { status: 'Order Placed', label: 'Order Placed', description: 'Your order has been placed successfully', level: 1 },
                { status: 'Processing', label: 'Processing', description: displayStatus === 'Confirmed' ? 'Your order has been confirmed and is being processed' : 'We\'re preparing your items', level: 2 },
                { status: 'Shipped', label: 'Shipped', description: 'On the way to you', level: 3 },
                { status: 'Out for delivery', label: 'Out for Delivery', description: 'Your package is out for delivery', level: 3.5 },
                { status: 'Delivered', label: 'Delivered', description: isLuxeOrder ? 'Your Luxe Membership is now active' : 'Package delivered', level: 4 }
              ].filter(s => {
                  if (displayStatus === 'Cancelled') return s.status === 'Order Placed';
                  if (isLuxeOrder) return s.status === 'Order Placed' || s.status === 'Delivered';
                  return statusLevels[s.status] > 0;
              }).map((statusItem, index, array) => {
                  const { icon, color, textColor } = getStatusDisplay(statusItem.status, statusItem.level);
                  
                  // Check if this step represents the current status
                  const isCurrent = displayStatus === statusItem.status || 
                    (statusItem.status === 'Processing' && displayStatus === 'Confirmed') ||
                    (statusItem.status === 'Shipped' && displayStatus === 'Shipped') ||
                    (statusItem.status === 'Out for delivery' && displayStatus === 'Out for delivery') ||
                    (statusItem.status === 'Delivered' && displayStatus === 'Delivered');
                  
                  const isCompleted = statusItem.level <= currentStatusLevel;
                  const stepDate = getStatusDate(statusItem.status);

                  return (
                      <motion.div 
                        key={index} 
                        variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4 } } }} 
                        className="flex gap-4 relative"
                      >
                          {/* Connector Line */}
                          {index < array.length - 1 && (
                            <div className={`absolute left-5 top-10 w-0.5 h-12 ${
                              statusItem.level < currentStatusLevel ? 'bg-[#e8767a]' : 'bg-slate-200'
                            }`} />
                          )}

                          {/* Icon Circle */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-500 shadow-sm ${
                            isCompleted ? 'bg-[#e8767a] text-white shadow-rose-100' : 'bg-slate-100 text-slate-400'
                          } ${isCurrent ? 'ring-4 ring-rose-100 animate-pulse' : ''}`}>
                              {icon}
                          </div>

                          {/* Details */}
                          <div className="flex-1 pt-1.5 pb-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <p className={`font-bold text-sm sm:text-base ${isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                                  {statusItem.label}
                                </p>
                                {stepDate && (
                                  <span className="text-[10px] sm:text-xs font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 w-fit">
                                    {stepDate}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-slate-500 mt-1">{statusItem.description}</p>
                          </div>
                      </motion.div>
                  );
              })}

              {/* Cancelled State */}
              {displayStatus === 'Cancelled' && (
                <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }} className="flex gap-4 relative">
                    <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-red-100 animate-pulse">
                        <X size={18} />
                    </div>
                    <div className="flex-1 pt-1.5">
                        <p className="font-bold text-red-500 text-sm sm:text-base uppercase tracking-wider">Cancelled</p>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">The order has been cancelled.</p>
                        {order.refundDetails?.status !== 'none' && (
                            <div className="mt-3 bg-red-50/50 p-3 rounded-2xl border border-red-100">
                                <p className="text-xs font-bold text-red-800">Refund Status: {order.refundDetails.status.toUpperCase()}</p>
                                {order.refundDetails.reason && <p className="text-[11px] text-red-600 mt-1 italic">Reason: {order.refundDetails.reason}</p>}
                                {order.refundDetails.status === 'rejected' && order.refundDetails.rejectionReason && (
                                    <p className="text-[11px] text-red-800 mt-1 font-bold">Rejection Reason: {order.refundDetails.rejectionReason}</p>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
              )}

              {/* Rejected State */}
              {order.refundDetails?.status === 'rejected' && displayStatus !== 'Cancelled' && (
                <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }} className="flex gap-4 relative">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0 z-10">
                        <X size={18} />
                    </div>
                    <div className="flex-1 pt-1.5">
                        <p className="font-bold text-red-600 text-sm sm:text-base uppercase tracking-wider">Refund Request Rejected</p>
                        <div className="mt-2 bg-red-50/50 p-3 rounded-2xl border border-red-100">
                            <p className="text-xs text-red-800 font-bold italic">"{order.refundDetails.rejectionReason}"</p>
                        </div>
                    </div>
                </motion.div>
              )}
            </div>

            {/* Live Journey Log (Meesho / Flipkart style) */}
            {trackingData?.tracking_data?.shipment_track_activities && trackingData.tracking_data.shipment_track_activities.length > 0 && (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FaTruckLoading className="text-[#e8767a]" /> Live Shipment Journey
                </h3>
                <div className="relative pl-6 border-l border-slate-100 space-y-6">
                  {trackingData.tracking_data.shipment_track_activities.map((act, index) => {
                    const isLatest = index === 0;
                    return (
                      <div key={index} className="relative text-left">
                        {/* Bullet point */}
                        <span className="absolute -left-[30px] top-1 flex h-4.5 w-4.5 items-center justify-center">
                          {isLatest ? (
                            <span className="relative flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e8767a] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 h-3 bg-[#e8767a]"></span>
                            </span>
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                          )}
                        </span>
                        
                        <div>
                          <p className={`text-xs sm:text-sm font-bold ${isLatest ? 'text-[#e8767a]' : 'text-slate-700'}`}>
                            {act.activity || act.status}
                          </p>
                          {act.location && (
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                              Location: {act.location}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 font-bold mt-1">
                            {new Date(act.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expected Delivery Banner */}
            {!isLuxeOrder && displayStatus !== 'Cancelled' && (
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                className="mt-6 p-4 bg-[#fff5f5] rounded-2xl border border-[#f9aeaf] flex items-center justify-center text-center"
              >
                <div className="flex items-center gap-2.5 text-[#e8767a]">
                  <FaCalendarAlt />
                  <p className="font-black text-sm uppercase tracking-wider">
                    {displayStatus === 'Delivered' ? 'Delivery Status' : (order.deliveredAt ? 'Delivered On' : 'Expected Delivery')}: {estimatedDelivery}
                  </p>
                </div>
              </motion.div>
            )}
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
                {isLuxeOrder ? 'Membership Type' : 'Delivery Address'}
              </h3>
              <div className="text-gray-600 space-y-1">
                {isLuxeOrder ? (
                  <>
                    <p className="font-semibold text-gray-800">Febeul Luxe Digital Membership</p>
                    <p className="text-sm">Valid for 30 days from purchase</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-gray-800">{order.address.name}</p>
                    <p className="text-sm">{order.address.address}</p>
                    {order.address.nearby && <p className="text-xs text-gray-500 italic">Nearby: {order.address.nearby}</p>}
                    <p className="text-sm">{order.address.city}, {order.address.zip}, {order.address.country}</p>
                    <p className="text-sm mt-2">Phone: {order.address.phone}</p>
                  </>
                )}
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
                  <p className="font-semibold text-gray-800">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : (order.paymentMethod === 'Razorpay' ? 'Razorpay Prepaid' : 'Stripe Payment')}</p>
                  <p className="text-sm text-gray-600">Total: ₹{orderTotal.toFixed(2)}</p>
                  <p className={`text-[10px] font-bold uppercase ${order.payment ? 'text-green-600' : 'text-red-500'}`}>{order.payment ? 'Paid' : 'Pending'}</p>
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
                  <React.Fragment key={item.productId + item.size + item.color}>
                  <motion.div
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
                  {displayStatus === 'Delivered' && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 mt-2">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Rate & Review this product:</p>
                      <Reviews productId={item.productId} />
                    </div>
                  )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{productAmount.toFixed(2)}</span>
              </div>
              {order.couponDiscount > 0 && (
                  <div className="flex flex-col border-b border-gray-100 pb-2">
                    <div className="flex justify-between text-green-600 font-semibold">
                        <span>Total Discount</span>
                        <span>- ₹{order.couponDiscount.toFixed(2)}</span>
                    </div>
                    {order.couponOfferType && order.couponOfferType !== 'none' && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-wider w-fit mt-1 self-end">
                        {order.couponOfferType === 'prepaid' ? 'Prepaid Offer' : 'COD Offer'} Applied
                      </span>
                    )}
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
              {order.giftWrap && order.giftWrap.name && (
                  <div className="p-3 bg-pink-50 rounded-lg border border-pink-100 mt-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {order.giftWrap.image && <img src={order.giftWrap.image} className="w-10 h-10 object-cover rounded shadow-sm" alt="" />}
                        <div>
                          <p className="text-sm font-bold text-gray-800">Gift Wrap: {order.giftWrap.name}</p>
                          {order.giftWrap.message && <p className="text-xs text-gray-600 italic mt-1">"{order.giftWrap.message}"</p>}
                        </div>
                      </div>
                      <span className="text-gray-600 font-medium">₹{order.giftWrap.price.toFixed(2)}</span>
                    </div>
                  </div>
              )}
              <div className="border-t pt-3 flex justify-between text-xl font-bold">
                <span className="text-gray-800">Total</span>
                <span className="text-[#e8767a]">₹{orderTotal.toFixed(2)}</span>
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
            <Link to={isLuxeOrder ? "/luxe" : "/"} className="flex-1">
              <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center uppercase tracking-widest text-sm"
              >
                  {isLuxeOrder ? <FaCrown className="mr-2" /> : <FaHome className="mr-2" />}
                  {isLuxeOrder ? 'View Luxe Products' : 'Go to Homepage'}
              </motion.button>
            </Link>
            
            {!isLuxeOrder && displayStatus !== 'Cancelled' ? (
              <motion.button
                  onClick={handleDownloadInvoice}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center uppercase tracking-widest text-sm"
              >
                  <FaFileInvoice className="mr-2" />
                  Download Invoice
              </motion.button>
            ) : isLuxeOrder && (
              <motion.button
                  onClick={() => navigate('/support')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center uppercase tracking-widest text-sm"
              >
                  <FaEnvelope className="mr-2" />
                  VIP Support
              </motion.button>
            )}
          </motion.div>

          {/* Cancel Order Button */}
          {cancellationEligible && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 }}
                className="mt-4"
            >
                <motion.button
                    onClick={() => setIsCancellationModalOpen(true)}
                    disabled={!cancellationPossible}
                    whileHover={cancellationPossible ? { scale: 1.02 } : {}}
                    whileTap={cancellationPossible ? { scale: 0.98 } : {}}
                    className={`w-full border-2 py-3 px-6 rounded-lg transition-all flex items-center justify-center uppercase tracking-widest text-sm font-bold ${
                        cancellationPossible 
                        ? 'border-red-500 text-red-600 hover:bg-red-50' 
                        : 'border-gray-300 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    <X className="mr-2" size={18} />
                    {cancellationPossible ? 'Cancel Order' : 'Order Cannot Be Cancelled'}
                </motion.button>
            </motion.div>
          )}

          {/* Return/Exchange Button */}
          {displayStatus === 'Delivered' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mt-4"
            >
              <motion.button
                  onClick={() => setIsReturnModalOpen(true)}
                  disabled={!returnPossible}
                  whileHover={returnPossible ? { scale: 1.05 } : {}}
                  whileTap={returnPossible ? { scale: 0.95 } : {}}
                  className={`w-full py-3 px-6 rounded-lg transition-colors flex items-center justify-center uppercase tracking-widest text-sm font-bold ${
                      returnPossible 
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                  <FaUndo className="mr-2" />
                  {returnPossible ? 'Return or Refund' : 'Return Window Closed'}
              </motion.button>
              {returnPossible && <p className="text-[10px] text-gray-500 mt-2 text-center italic">Industry Standard: Return window closes 3 days after delivery. Exactly 4 images required.</p>}
            </motion.div>
          )}

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
    </>
  );
}
