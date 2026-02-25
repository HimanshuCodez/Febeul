import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { Package, User, Mail, Phone, MapPin, Truck, Calendar, DollarSign, CreditCard, Tag, BadgeCheck, AlertCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react'; // Added icons

const Orders = ({ token }) => {

  const [orders, setOrders] = useState([])
  const [expandedOrderId, setExpandedOrderId] = useState(null); // State to manage expanded order

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

  useEffect(() => {
    fetchAllOrders();
  }, [token])

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <h3 className='text-3xl font-semibold text-gray-800 mb-8'>All Customer Orders</h3>
      <div className='space-y-6'>
        {orders.length === 0 ? (
          <p className="text-center text-gray-500 text-lg py-10">No orders found.</p>
        ) : (
          orders.map((order) => (
            <div className='bg-white rounded-xl shadow-md overflow-hidden border border-gray-100' key={order._id}>
              {/* Order Summary Header */}
              <div className='flex flex-col lg:flex-row justify-between items-center p-5 bg-gray-50 border-b border-gray-100'>
                <div className="flex items-center gap-4 mb-3 lg:mb-0">
                  <Package size={24} className="text-pink-500" />
                  <div>
                    <p className='text-sm font-medium text-gray-500'>Order ID</p>
                    <p className='text-md font-semibold text-gray-800'>#{order._id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 lg:mb-0">
                  <User size={24} className="text-pink-500" />
                  <div>
                    <p className='text-sm font-medium text-gray-500'>Customer</p>
                    <p className='text-md font-semibold text-gray-800'>{order.userId?.name || order.userId?.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 lg:mb-0">
                  <Calendar size={24} className="text-pink-500" />
                  <div>
                    <p className='text-sm font-medium text-gray-500'>Order Date</p>
                    <p className='text-md font-semibold text-gray-800'>{new Date(order.date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <DollarSign size={24} className="text-pink-500" />
                  <div>
                    <p className='text-sm font-medium text-gray-500'>Total Amount</p>
                    <p className='text-md font-semibold text-gray-800'>{currency}{order.orderTotal.toFixed(2)}</p>
                  </div>
                </div>

                <div className='flex items-center gap-3'>
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
                              <p className='text-xs text-gray-500'>{item.quantity} x {currency}{item.price.toFixed(2)} {item.size && `(${item.size})`}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div>
                      <p className='font-semibold text-gray-700 mb-3 flex items-center gap-2'><User size={16}/> Customer Info</p>
                      <div className='space-y-1 text-sm text-gray-600'>
                        <p className='flex items-center gap-2'><User size={14}/> {order.userId?.name || 'N/A'}</p>
                        <p className='flex items-center gap-2'><Mail size={14}/> {order.userId?.email || 'N/A'}</p>
                        <p className='flex items-center gap-2'><Phone size={14}/> {order.address.phone}</p>
                      </div>
                      <p className='font-semibold text-gray-700 mt-4 mb-2 flex items-center gap-2'><MapPin size={16}/> Shipping Address</p>
                      <address className='text-xs text-gray-600 not-italic space-y-1'>
                        <p>{order.address.name}</p>
                        <p>{order.address.address},</p>
                        <p>{order.address.city}, {order.address.state}, {order.address.country} - {order.address.zip}</p>
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

                    {/* Order Status Update */}
                    <div className='flex flex-col justify-between items-start'>
                      <div>
                        <p className='font-semibold text-gray-700 mb-3 flex items-center gap-2'><BadgeCheck size={16}/> Update Status</p>
                        <select
                          onChange={(event)=>statusHandler(event,order._id)}
                          value={order.orderStatus}
                          className='p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500'
                        >
                          <option value="Order Placed">Order Placed</option>
                          <option value="Processing">Processing</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Out for delivery">Out for delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Returned">Returned</option>
                          <option value="Refund Initiated">Refund Initiated</option>
                          <option value="Refunded">Refunded</option>
                          <option value="Failed">Failed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Orders