import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { Package, User, Mail, Phone, MapPin, Truck, Calendar, DollarSign, CreditCard, Tag, BadgeCheck, AlertCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react'; // Added icons

const Orders = ({ token }) => {

  const [orders, setOrders] = useState([])
  const [expandedOrderId, setExpandedOrderId] = useState(null); // State to manage expanded order
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const StatusBadge = ({ status }) => {
    let colorClass = '';
    let icon = null;

    switch (status) {
      case 'Order Placed':
        colorClass = 'bg-blue-100 text-blue-800';
        icon = <BadgeCheck size={14} />;
        break;
      case 'Processing':
        colorClass = 'bg-yellow-100 text-yellow-800';
        icon = <AlertCircle size={14} />;
        break;
      case 'Confirmed':
        colorClass = 'bg-green-100 text-green-800';
        icon = <BadgeCheck size={14} />;
        break;
      case 'Shipped':
        colorClass = 'bg-indigo-100 text-indigo-800';
        icon = <Truck size={14} />;
        break;
      case 'Out for delivery':
        colorClass = 'bg-purple-100 text-purple-800';
        icon = <Truck size={14} />;
        break;
      case 'Delivered':
        colorClass = 'bg-green-100 text-green-800';
        icon = <Package size={14} />;
        break;
      case 'Cancelled':
        colorClass = 'bg-red-100 text-red-800';
        icon = <AlertCircle size={14} />;
        break;
      case 'Returned':
        colorClass = 'bg-red-100 text-red-800';
        icon = <AlertCircle size={14} />;
        break;
      case 'Refund Initiated':
        colorClass = 'bg-orange-100 text-orange-800';
        icon = <DollarSign size={14} />;
        break;
      case 'Refunded':
        colorClass = 'bg-green-100 text-green-800';
        icon = <DollarSign size={14} />;
        break;
      case 'Failed':
        colorClass = 'bg-red-100 text-red-800';
        icon = <AlertCircle size={14} />;
        break;
      default:
        colorClass = 'bg-gray-100 text-gray-800';
        icon = <AlertCircle size={14} />;
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {icon} {status}
      </span>
    );
  };

  const fetchAllOrders = async () => {

    if (!token) {
      return null;
    }

    try {

      // Ensure this endpoint is correctly populating userId and items.productId
      const response = await axios.post(backendUrl + '/api/order/list', {}, { headers: { token } })
      if (response.data.success) {
        setOrders(response.data.orders.reverse())
      } else {
        toast.error(response.data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  const statusHandler = async ( event, orderId ) => {
    try {
      const response = await axios.post(backendUrl + '/api/order/status' , {orderId, status:event.target.value}, { headers: {token}})
      if (response.data.success) {
        await fetchAllOrders()
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error)
      toast.error("Failed to update status");
    }
  }

  const downloadInvoice = async (orderId) => {
    try {
      const response = await axios.get(`${backendUrl}/api/order/invoice/${orderId}`, {
        headers: { token },
        responseType: 'blob'
      });

      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloading...");
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error("Failed to download invoice");
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, [token])

  // Pagination Logic
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4'>
        <h3 className='text-3xl font-semibold text-gray-800'>All Customer Orders</h3>
        <div className='flex items-center gap-3'>
          <span className='bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 text-sm font-bold text-gray-600'>
            {orders.length} Total Orders
          </span>
          {totalPages > 1 && (
            <span className='text-sm text-gray-500'>Page {currentPage} of {totalPages}</span>
          )}
        </div>
      </div>
      
      <div className='space-y-6'>
        {orders.length === 0 ? (
          <p className="text-center text-gray-500 text-lg py-10">No orders found.</p>
        ) : (
          <>
            {paginatedOrders.map((order) => (
              <div className='bg-white rounded-xl shadow-md overflow-hidden border border-gray-100' key={order._id}>
                {/* Order Summary Header */}
                <div className='flex flex-col lg:flex-row justify-between items-start p-5 bg-gray-50 border-b border-gray-100'>
                  <div className="flex items-start gap-4 mb-3 lg:mb-0">
                    <Package size={24} className="text-pink-500 mt-1" />
                    <div>
                      <p className='text-sm font-medium text-gray-500'>Order ID</p>
                      <p className='text-md font-semibold text-gray-800'>#{order._id}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 mb-3 lg:mb-0">
                    <User size={24} className="text-pink-500 mt-1" />
                    <div>
                      <p className='text-sm font-medium text-gray-500'>Customer</p>
                      <div className='flex flex-col'>
                        <p className='text-md font-semibold text-gray-800'>{order.userId?.name || 'N/A'}</p>
                        <p className='text-xs text-gray-500'>{order.userId?.email || 'N/A'}</p>
                        {order.userId?.isLuxeMember && (
                          <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider w-fit mt-1'>
                            <span className='w-1 h-1 bg-amber-500 rounded-full mr-1 animate-pulse'></span>
                            Luxe Member
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 mb-3 lg:mb-0">
                    <Calendar size={24} className="text-pink-500 mt-1" />
                    <div>
                      <p className='text-sm font-medium text-gray-500'>Order Date</p>
                      <p className='text-md font-semibold text-gray-800'>{new Date(order.date).toLocaleDateString()}</p>
                      <p className='text-xs text-gray-500'>{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <DollarSign size={24} className="text-pink-500 mt-1" />
                    <div>
                      <p className='text-sm font-medium text-gray-500'>Total Amount</p>
                      <p className='text-md font-semibold text-gray-800'>{currency}{order.orderTotal.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className='flex items-center gap-3 mt-4 lg:mt-0'>
                    <button
                      onClick={() => downloadInvoice(order._id)}
                      className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors text-pink-500"
                      title="Download Invoice"
                    >
                      <FileText size={20} />
                    </button>
                    <StatusBadge status={order.orderStatus} />
                    <button
                      onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                      className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
                      title={expandedOrderId === order._id ? "Collapse details" : "Expand details"}
                    >
                      {expandedOrderId === order._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Order Details Body (Conditionally Rendered) */}
                {expandedOrderId === order._id && (
                  <div className='p-5 pt-0 border-t border-gray-100 bg-white'>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-5'>
                      {/* Products */}
                      <div>
                        <p className='font-semibold text-gray-700 mb-3 flex items-center gap-2'><Tag size={16}/> Products</p>
                        <div className='space-y-3'>
                          {order.items.map((item, itemIndex) => (
                            <div key={itemIndex} className='flex items-center gap-3 bg-gray-50 p-2 rounded-lg'>
                              <img className='w-12 h-12 object-cover rounded' src={item.image} alt={item.name} />
                              <div>
                                <p className='text-sm font-medium text-gray-700'>{item.name}</p>
                                <p className='text-xs text-gray-500'>
                                  {(() => {
                                    const sku = item.sku || (item.productId?.variations?.find(v => v.images.includes(item.image))?.sku);
                                    return sku ? `SKU: ${sku} | ` : '';
                                  })()}
                                  {item.quantity} x {currency}{item.price.toFixed(2)} {item.size && `(${item.size})`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customer Details */}
                      <div>
                        <p className='font-semibold text-gray-700 mb-3 flex items-center gap-2'><User size={16}/> Customer Info</p>
                        <div className='space-y-2 text-sm text-gray-600'>
                          <div className='flex flex-col'>
                            <p className='font-bold text-gray-800 text-base'>{order.userId?.name || 'N/A'}</p>
                            <p className='text-xs text-gray-500 flex items-center gap-1'><Mail size={12}/> {order.userId?.email || 'N/A'}</p>
                            {order.userId?.isLuxeMember && (
                              <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider w-fit mt-1.5 shadow-sm'>
                                <span className='w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5 animate-pulse'></span>
                                Luxe Member
                              </span>
                            )}
                          </div>
                          <p className='flex items-center gap-2 mt-2'><Phone size={14} className="text-gray-400"/> {order.address.phone}</p>
                        </div>                        <p className='font-semibold text-gray-700 mt-4 mb-2 flex items-center gap-2'><MapPin size={16}/> Shipping Address</p>
                        <address className='text-xs text-gray-600 not-italic space-y-1'>
                          <div className="flex items-center gap-2">
                            <p className="font-bold">{order.address.name}</p>
                            {order.address.addressType && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded uppercase font-bold border">
                                  {order.address.addressType === 'Home' ? 'House/Apartment' : order.address.addressType}
                              </span>
                            )}
                          </div>
                          <p>{order.address.address}, {order.address.locality}</p>
                          {order.address.landmark && <p className="italic text-gray-500">Landmark: {order.address.landmark}</p>}
                          <p>{order.address.city}, {order.address.state}, {order.address.country} - {order.address.zip}</p>
                          <p className="mt-1 font-medium">Phone: {order.address.phone}{order.address.alternatePhone ? `, ${order.address.alternatePhone}` : ''}</p>
                          {(order.address.saturdayDelivery !== undefined || order.address.sundayDelivery !== undefined) && (
                            <div className="mt-3 pt-2 border-t border-gray-100">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Weekend Deliveries</p>
                              <div className="flex gap-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                  <span className="text-gray-600">Sat: <span className={order.address.saturdayDelivery ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{order.address.saturdayDelivery ? 'YES' : 'NO'}</span></span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                  <span className="text-gray-600">Sun: <span className={order.address.sundayDelivery ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{order.address.sundayDelivery ? 'YES' : 'NO'}</span></span>
                                </div>
                              </div>
                            </div>
                          )}
                        </address>
                      </div>

                      {/* Payment & Shiprocket */}
                      <div>
                        <p className='font-semibold text-gray-700 mb-3 flex items-center gap-2'><CreditCard size={16}/> Payment Info</p>
                        <div className='space-y-1 text-sm text-gray-600'>
                          <p>Method: <span className="font-medium">{order.paymentMethod}</span></p>
                          <p>Status: <span className={`font-medium ${order.payment ? 'text-green-600' : 'text-red-600'}`}>{order.payment ? 'Paid' : 'Pending'}</span></p>
                          {order.couponDiscount > 0 && <p>Coupon Discount: <span className="font-medium text-green-600">-{currency}{order.couponDiscount.toFixed(2)}</span></p>}
                          {order.shippingCharge > 0 && <p>Shipping: <span className="font-medium">{currency}{order.shippingCharge.toFixed(2)}</span></p>}
                          {order.codCharge > 0 && <p>COD Charge: <span className="font-medium">{currency}{order.codCharge.toFixed(2)}</span></p>}
                          {order.giftWrap && order.giftWrap.price > 0 && <p>Gift Wrap: <span className="font-medium">{currency}{order.giftWrap.price.toFixed(2)}</span></p>}
                          <p className="text-base font-bold text-gray-800 mt-2">Total: {currency}{order.orderTotal.toFixed(2)}</p>
                        </div>

                        <button
                          onClick={() => downloadInvoice(order._id)}
                          className="mt-4 flex items-center gap-2 bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 transition-colors text-sm font-medium w-fit"
                        >
                          <FileText size={16} /> Download Invoice
                        </button>

                        {order.shiprocket && (
                          <div className='mt-5'>
                            <p className='font-semibold text-gray-700 mb-3 flex items-center gap-2'><Truck size={16}/> Shiprocket Details</p>
                            <div className='space-y-1 text-xs text-gray-600'>
                              {order.shiprocket.awb && <p>AWB: <span className="font-medium">{order.shiprocket.awb}</span></p>}
                              {order.shiprocket.courier && <p>Courier: <span className="font-medium">{order.shiprocket.courier}</span></p>}
                              {order.shiprocket.trackingUrl && <p className='text-blue-600 hover:underline flex items-center gap-1'><FileText size={14}/><a href={order.shiprocket.trackingUrl} target='_blank' rel='noopener noreferrer'>Track Shipment</a></p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className='flex justify-center items-center gap-2 mt-12 mb-6'>
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className='px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm'
                >
                  Previous
                </button>
                
                <div className='flex gap-1.5'>
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${currentPage === pageNum ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className='flex items-end px-1 text-gray-400'>...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className='px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm'
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Orders