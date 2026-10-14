import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import OrderCancellationDialog from '../components/OrderCancellationDialog';
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { CSVLink } from 'react-csv'
import useSearchPrefill from '../search/useSearchPrefill'
import { buildOrderAnalyticsExports, prepareOrderCsvRows } from '../utils/orderAnalyticsExports'
import {
  Package, User, Mail, Phone, MapPin, Truck, Calendar, DollarSign,
  CreditCard, Tag, BadgeCheck, AlertCircle, ChevronDown, ChevronUp,
  FileText, TrendingUp, Users, RefreshCcw, Search, ArrowUpDown, Map, Download, X
} from 'lucide-react';

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([])
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [activeTab, setActiveTab] = useState('orders');
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState('');
  const cancellationInFlight = useRef(false);
  const closeCancellation = useCallback(() => {
    if (cancellationInFlight.current) return;
    setCancellingOrder(null);
    setCancellationError('');
  }, []);
  const canCancel = order => !order.isCancelled && ['Order Placed', 'Processing', 'Confirmed'].includes(order.orderStatus)
    && !order.shippedAt && !order.deliveredAt && !order.shiprocket?.awb
    && ['NEW', 'UNKNOWN'].includes(order.shiprocketStatus || 'NEW')
    && (!order.refundDetails?.status || order.refundDetails.status === 'none');
  const cancelSelectedOrder = async reason => {
    if (cancellationInFlight.current || !cancellingOrder) return;
    cancellationInFlight.current = true;
    setIsCancelling(true);
    setCancellationError('');
    try {
      const { data } = await axios.post(`${backendUrl}/api/order/admin-cancel`, { orderId: cancellingOrder._id, reason }, { headers: { token } });
      if (!data.success) throw new Error(data.message || 'Cancellation failed.');
      if (['pending', 'failed'].includes(data.refundStatus)) toast.warning(data.message);
      else toast.success(data.message);
      setOrders(previous => previous.map(order => order._id === cancellingOrder._id ? { ...order, isCancelled: true, orderStatus: 'Cancelled', refundDetails: { ...order.refundDetails, status: data.refundStatus, requestType: 'cancellation' } } : order));
      setCancellingOrder(null);
      await fetchAllOrders();
    } catch (error) {
      setCancellationError(error.response?.data?.message || error.message || 'Unable to cancel. Refresh the order before retrying.');
    } finally {
      cancellationInFlight.current = false;
      setIsCancelling(false);
    }
  };

  // Search & Filter States
  const [pincodeSearch, setPincodeSearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('');
  
  const [buyerSearch, setBuyerSearch] = useState('');
  
  const [returnSearch, setReturnSearch] = useState('');
  const [returnStateFilter, setReturnStateFilter] = useState('');
  
  const [refundSearch, setRefundSearch] = useState('');
  const [refundStateFilter, setRefundStateFilter] = useState('');

  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  const [orderSearch, setOrderSearch] = useSearchPrefill();

  // Sorting Configs
  const [pincodeSort, setPincodeSort] = useState({ key: 'orderCount', direction: 'desc' });
  const [stateSort, setStateSort] = useState({ key: 'orderCount', direction: 'desc' });
  const [buyerSort, setBuyerSort] = useState({ key: 'orderCount', direction: 'desc' });
  const [returnSort, setReturnSort] = useState({ key: 'date', direction: 'desc' });
  const [refundSort, setRefundSort] = useState({ key: 'date', direction: 'desc' });

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const StatusBadge = ({ status }) => {
    let colorClass = '';
    let icon = null;

    switch (status) {
      case 'Order Placed':
        colorClass = 'bg-blue-50 text-blue-700 border-blue-100';
        icon = <BadgeCheck size={12} />;
        break;
      case 'Processing':
        colorClass = 'bg-amber-50 text-amber-700 border-amber-100';
        icon = <AlertCircle size={12} />;
        break;
      case 'Confirmed':
        colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
        icon = <BadgeCheck size={12} />;
        break;
      case 'Shipped':
        colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-100';
        icon = <Truck size={12} />;
        break;
      case 'Out for delivery':
        colorClass = 'bg-purple-50 text-purple-700 border-purple-100';
        icon = <Truck size={12} />;
        break;
      case 'Delivered':
        colorClass = 'bg-green-50 text-green-700 border-green-100';
        icon = <Package size={12} />;
        break;
      case 'Cancelled':
        colorClass = 'bg-red-50 text-red-700 border-red-100';
        icon = <AlertCircle size={12} />;
        break;
      case 'Returned':
        colorClass = 'bg-rose-50 text-rose-700 border-rose-100';
        icon = <AlertCircle size={12} />;
        break;
      case 'Refund Initiated':
        colorClass = 'bg-orange-50 text-orange-700 border-orange-100';
        icon = <DollarSign size={12} />;
        break;
      case 'Refunded':
        colorClass = 'bg-teal-50 text-teal-700 border-teal-100';
        icon = <DollarSign size={12} />;
        break;
      case 'Failed':
        colorClass = 'bg-red-50 text-red-700 border-red-100';
        icon = <AlertCircle size={12} />;
        break;
      default:
        colorClass = 'bg-[#faf8fb] text-[#65526f] border-[#eae5ed]';
        icon = <AlertCircle size={12} />;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${colorClass}`}>
        {icon} {status}
      </span>
    );
  };

  const refundStatusBadge = (status) => {
    const colorMap = {
      pending: 'bg-amber-50 text-amber-700 border-amber-100',
      initiated: 'bg-blue-50 text-blue-700 border-blue-100',
      processing: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      completed: 'bg-green-50 text-green-700 border-green-100',
      failed: 'bg-red-50 text-red-700 border-red-100',
      rejected: 'bg-red-50 text-red-700 border-red-100',
    };
    const colorClass = colorMap[status] || 'bg-[#faf8fb] text-[#65526f] border-[#eae5ed]';
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize whitespace-nowrap ${colorClass}`}>
        {status}
      </span>
    );
  };

  const orderDetailsPanel = (order) => (
    <div className='p-5 border-t border-[#eee9f0] bg-[#faf8fb]'>
      <div className='grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3'>
        {/* Products */}
        <div className='min-w-0 break-words bg-white rounded-xl border border-[#eee9f0] p-4 [&_svg]:shrink-0'>
          <p className='font-bold text-[#4f4059] text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5'><Tag size={14}/> Products</p>
          <div className='space-y-3'>
            {order.items.map((item, itemIndex) => (
              <div key={itemIndex} className='flex items-center gap-3 bg-[#faf8fb] p-2.5 rounded-xl border border-[#eee9f0]'>
                <img className='w-12 h-12 object-cover rounded-lg border shadow-sm' src={item.image} alt={item.name} />
                <div className="min-w-0 flex-1">
                  <p className='text-xs font-bold text-[#4f4059] truncate'>{item.name}</p>
                  <p className='text-[10px] text-[#8b7b93] font-medium'>
                    {item.sku ? `SKU: ${item.sku} | ` : ''}
                    {item.quantity} x {currency}{item.price.toFixed(2)} {item.size && `(${item.size})`}
                  </p>
                  {item.appliedCoupon && (
                    <span className="inline-flex mt-1 text-[8px] bg-green-50 text-green-700 px-1 py-0.5 rounded border font-semibold">
                      Coupon: {item.appliedCoupon}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Details */}
        <div className='min-w-0 break-words bg-white rounded-xl border border-[#eee9f0] p-4 [&_svg]:shrink-0'>
          <p className='font-bold text-[#4f4059] text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5'><User size={14}/> Customer & Shipping</p>
          <address className='text-xs text-[#756480] not-italic space-y-1.5'>
            <div className="flex items-center gap-2">
              <p className="font-bold text-[#4f4059]">{order.address.name}</p>
              {order.address.addressType && (
                <span className="px-1.5 py-0.5 bg-gray-100 text-[#8b7b93] text-[9px] rounded uppercase font-bold border">
                  {order.address.addressType === 'Home' ? 'Home' : order.address.addressType}
                </span>
              )}
            </div>
            <p className="text-[#8b7b93] flex items-center gap-1"><Mail size={12}/> {order.userId?.email || order.address?.email || 'N/A'}</p>
            <p className="text-[#8b7b93] flex items-center gap-1"><Phone size={12}/> {order.address.phone}</p>
            <div className="mt-2 pt-2 border-t border-[#eee9f0]">
              <p className="font-medium text-[#4f4059]">{order.address.address}, {order.address.locality}</p>
              {order.address.landmark && <p className="italic text-[#9d8da5] text-[10px]">Landmark: {order.address.landmark}</p>}
              <p className="font-bold text-[#65526f]">{order.address.city}, {order.address.state}, {order.address.country} - {order.address.zip}</p>
            </div>
          </address>
        </div>

        {/* Payment & Shiprocket */}
        <div className='min-w-0 break-words bg-white rounded-xl border border-[#eee9f0] p-4 [&_svg]:shrink-0'>
          <p className='font-bold text-[#4f4059] text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5'><CreditCard size={14}/> Payment Info</p>
          <div className='space-y-1.5 text-xs text-[#756480]'>
            <p>Method: <span className="font-bold text-[#4f4059]">{order.paymentMethod}</span></p>
            <p>Status: <span className={`font-bold ${order.payment ? 'text-green-600' : order.orderStatus === 'Cancelled' ? 'text-[#8b7b93]' : 'text-red-600'}`}>{order.payment ? 'Paid' : order.orderStatus === 'Cancelled' ? 'Cancelled' : 'Pending'}</span></p>
            {order.paymentMethod === 'Razorpay' && order.razorpayPaymentId && (
              <p className="break-all">Razorpay Ref: <span className="font-bold text-[#4f4059]">{order.razorpayPaymentId}</span></p>
            )}
            {order.couponCode && (
              <div className='flex flex-col bg-green-50 p-1.5 rounded-lg border border-green-100 w-fit mt-1'>
                <span className="text-[10px] font-bold text-green-700 flex items-center gap-1">
                  <Tag size={10} /> Coupon: {order.couponCode}
                </span>
                {order.couponDiscount > 0 && (
                  <span className="text-[9px] text-green-600 font-medium">Saved: {currency}{order.couponDiscount.toFixed(2)}</span>
                )}
              </div>
            )}
            {order.shippingCharge > 0 && <p>Shipping: <span className="font-medium">{currency}{order.shippingCharge.toFixed(2)}</span></p>}
            {order.codCharge > 0 && <p>COD Charge: <span className="font-medium">{currency}{order.codCharge.toFixed(2)}</span></p>}
            <p className="text-sm font-semibold text-[#342a3c] mt-2">Total Paid: {currency}{order.orderTotal.toFixed(2)}</p>
          </div>

          {order.shiprocket && (
            <div className='mt-4 pt-3 border-t border-[#eee9f0]'>
              <p className='font-bold text-[#4f4059] text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5'><Truck size={14}/> Logistics</p>
              <div className='space-y-1 text-[11px] text-[#756480] bg-[#faf8fb] p-2 rounded-lg border'>
                {order.shiprocketStatus && (
                  <p>Live Status: <span className="font-bold text-[#342a3c] uppercase">{order.shiprocketStatus.replace(/_/g, ' ')}</span></p>
                )}
                {order.shiprocket.awb && <p>AWB: <span className="font-bold">{order.shiprocket.awb}</span></p>}
                {order.shiprocket.courier && <p>Courier: <span className="font-semibold">{order.shiprocket.courier}</span></p>}
                {order.shiprocket.lastTrackedAt && (
                  <p className="text-[10px] text-[#9d8da5]">Last synced: {formatDate(order.shiprocket.lastTrackedAt)}</p>
                )}
                {order.shiprocket.trackingUrl && (
                  <a
                    href={order.shiprocket.trackingUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-[#a85070] hover:underline flex items-center gap-1 font-bold mt-1 text-[10px] uppercase'
                  >
                    <FileText size={12}/> Track Shipment
                  </a>
                )}
                {order.shiprocket.trackingHistory?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#eae5ed] space-y-1">
                    {[...order.shiprocket.trackingHistory].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).map((act, i) => (
                      <p key={i} className="text-[10px] text-[#8b7b93]">
                        <span className="font-bold text-[#65526f]">{act.activity || act.status}</span>
                        {act.location ? ` · ${act.location}` : ''} · {formatDate(act.date)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cancellation / Refund Info */}
        {(order.orderStatus === 'Cancelled' || order.orderStatus === 'Returned' || order.orderStatus === 'Refunded' || order.orderStatus === 'Refund Initiated') && (
          <div className='min-w-0 break-words bg-white rounded-xl border border-[#eee9f0] p-4 [&_svg]:shrink-0'>
            <p className='font-bold text-red-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5'><AlertCircle size={14}/> Returns / Cancellation</p>
            <div className='space-y-2 text-xs text-[#756480] bg-red-50/50 p-3.5 rounded-xl border border-red-100'>
              <p className="font-semibold text-red-700 capitalize">Status: {order.orderStatus}</p>
              {order.refundDetails?.reason && (
                <p><span className="font-bold text-[#65526f]">Reason:</span> <span className="italic text-[#756480]">&quot;{order.refundDetails.reason}&quot;</span></p>
              )}
              {order.refundDetails?.status && order.refundDetails.status !== 'none' && (
                <p><span className="font-bold text-[#65526f]">Refund status:</span> <span className="font-bold text-[#342a3c] uppercase text-[10px] bg-white px-2 py-0.5 rounded shadow-sm border">{order.refundDetails.status}</span></p>
              )}
              {order.refundDetails?.amount > 0 && (
                <p><span className="font-bold text-[#65526f]">Refund Amount:</span> <span className="font-semibold text-red-700">{currency}{order.refundDetails.amount.toFixed(2)}</span></p>
              )}
              {order.refundDetails?.requestedAt && (
                <p><span className="font-bold text-[#65526f]">Claimed Date:</span> <span className="font-medium text-[#756480]">{formatDate(order.refundDetails.requestedAt)}</span></p>
              )}
              {order.refundDetails?.pickup && order.refundDetails.pickup.status !== 'none' && (
                <div className="mt-2 pt-2 border-t border-red-100">
                  <p><span className="font-bold text-[#65526f]">Pickup status:</span> <span className="font-bold text-[#342a3c] uppercase text-[10px] bg-white px-2 py-0.5 rounded shadow-sm border">{order.refundDetails.pickup.status.replace(/_/g, ' ')}</span></p>
                  {order.refundDetails.pickup.awb && <p className="text-[10px] text-[#8b7b93] mt-1">Return AWB: <span className="font-bold">{order.refundDetails.pickup.awb}</span> {order.refundDetails.pickup.courier ? `(${order.refundDetails.pickup.courier})` : ''}</p>}
                  {order.refundDetails.pickup.status === 'failed' && order.refundDetails.pickup.failureReason && (
                    <p className="text-[10px] text-red-600 italic mt-1">Auto-schedule failed: {order.refundDetails.pickup.failureReason} — arrange pickup manually.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const fetchAllOrders = useCallback(async () => {
    if (!token) {
      return null;
    }

    try {
      const response = await axios.post(backendUrl + '/api/order/list', {}, { headers: { token } })
      if (response.data.success) {
        setOrders(response.data.orders.reverse())
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }, [token])

  const downloadInvoice = async (orderId) => {
    try {
      const response = await axios.get(`${backendUrl}/api/order/invoice/${orderId}`, {
        headers: { token },
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
      toast.success("Invoice downloading...");
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error("Failed to download invoice");
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders])

  // Shipping happens in the Shiprocket panel, in another tab. Re-pull the list
  // when this tab is focused again so an order that was just shipped there
  // shows its new status/AWB here without a manual page reload.
  useEffect(() => {
    if (!token) return;

    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') fetchAllOrders();
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [token, fetchAllOrders])

  // Process & Group Analytics Data Dynamically
  const analytics = useMemo(() => {
    const pincodeMap = {};
    const stateMap = {};
    const customerMap = {};
    
    const returnsList = [];
    const returnStateMap = {};
    
    const refundsList = [];
    const refundStateMap = {};

    orders.forEach(order => {
      const rawState = order.address?.state || 'Unknown';
      const state = rawState.trim();
      const pincode = order.address?.zip || 'Unknown';
      const city = order.address?.city || 'Unknown';
      const coupon = order.couponCode || 'None';
      
      const customerId = order.userId?._id || order.address?.email || `${order.address?.name}-${order.address?.phone}`;
      const customerName = order.userId?.name || order.address?.name || 'Guest';
      const customerEmail = order.userId?.email || order.address?.email || 'N/A';
      const isLuxe = order.userId?.isLuxeMember || false;

      // 1. Pincode grouping
      if (!pincodeMap[pincode]) {
        pincodeMap[pincode] = {
          pincode,
          state,
          city,
          orderCount: 0,
          totalSales: 0,
          customers: new Set()
        };
      }
      pincodeMap[pincode].orderCount += 1;
      pincodeMap[pincode].totalSales += order.orderTotal;
      pincodeMap[pincode].customers.add(customerName);

      // 2. State grouping
      if (!stateMap[state]) {
        stateMap[state] = {
          state,
          orderCount: 0,
          totalSales: 0,
          pincodes: new Set()
        };
      }
      stateMap[state].orderCount += 1;
      stateMap[state].totalSales += order.orderTotal;
      stateMap[state].pincodes.add(pincode);

      // 3. Customer grouping
      if (!customerMap[customerId]) {
        customerMap[customerId] = {
          name: customerName,
          email: customerEmail,
          isLuxe,
          orderCount: 0,
          totalSpent: 0,
          products: {} // productName -> { quantity, image, sku }
        };
      }
      customerMap[customerId].orderCount += 1;
      customerMap[customerId].totalSpent += order.orderTotal;
      order.items?.forEach(item => {
        const productName = item.name;
        // Search sku in item or look in variations
        const itemSku = item.sku || 'N/A';
        if (!customerMap[customerId].products[productName]) {
          customerMap[customerId].products[productName] = {
            name: productName,
            quantity: 0,
            image: item.image,
            sku: itemSku
          };
        }
        customerMap[customerId].products[productName].quantity += item.quantity;
      });

      // 4. Returns & Refunds classification
      const isReturned = order.orderStatus === 'Returned' || order.orderStatus === 'Refunded' || order.refundDetails?.status === 'completed';
      const isRefundRequested = order.orderStatus === 'Refund Initiated' || order.refundDetails?.status === 'pending' || order.refundDetails?.status === 'initiated' || order.refundDetails?.status === 'processing';

      if (isReturned) {
        returnsList.push({
          orderId: order._id,
          userName: customerName,
          email: customerEmail,
          state,
          pincode,
          amount: order.refundDetails?.amount || order.orderTotal,
          items: order.items?.map(item => ({
            name: item.name,
            sku: item.sku || 'N/A',
            quantity: item.quantity,
            price: item.price,
            image: item.image
          })) || [],
          date: order.refundDetails?.processedAt || order.refundDetails?.requestedAt || order.date,
          couponUsed: coupon,
          reason: order.refundDetails?.reason || 'N/A'
        });

        if (!returnStateMap[state]) {
          returnStateMap[state] = {
            state,
            count: 0,
            totalAmount: 0
          };
        }
        returnStateMap[state].count += 1;
        returnStateMap[state].totalAmount += (order.refundDetails?.amount || order.orderTotal);
      }

      if (isRefundRequested) {
        refundsList.push({
          orderId: order._id,
          userName: customerName,
          email: customerEmail,
          state,
          pincode,
          amount: order.refundDetails?.amount || order.orderTotal,
          items: order.items?.map(item => ({
            name: item.name,
            sku: item.sku || 'N/A',
            quantity: item.quantity,
            price: item.price,
            image: item.image
          })) || [],
          date: order.refundDetails?.requestedAt || order.date,
          couponUsed: coupon,
          reason: order.refundDetails?.reason || 'N/A',
          status: order.refundDetails?.status || 'pending'
        });

        if (!refundStateMap[state]) {
          refundStateMap[state] = {
            state,
            count: 0,
            totalAmount: 0
          };
        }
        refundStateMap[state].count += 1;
        refundStateMap[state].totalAmount += (order.refundDetails?.amount || order.orderTotal);
      }
    });

    return {
      pincodes: Object.values(pincodeMap).map(p => ({ ...p, customersCount: p.customers.size })),
      states: Object.values(stateMap).map(s => ({ ...s, pincodesCount: s.pincodes.size })),
      customers: Object.values(customerMap),
      returns: returnsList,
      returnStates: Object.values(returnStateMap),
      refunds: refundsList,
      refundStates: Object.values(refundStateMap)
    };
  }, [orders]);

  // Date & Search filtered Orders
  const filteredOrders = useMemo(() => {
    const start = orderStartDate ? new Date(orderStartDate).setHours(0, 0, 0, 0) : null;
    const end = orderEndDate ? new Date(orderEndDate).setHours(23, 59, 59, 999) : null;
    const query = orderSearch.trim().toLowerCase();

    return orders.filter(order => {
      if (start !== null || end !== null) {
        const orderTime = new Date(order.date).getTime();
        if (start !== null && orderTime < start) return false;
        if (end !== null && orderTime > end) return false;
      }

      if (query) {
        const haystack = [
          order._id,
          order.orderItemId,
          order.userId?.name,
          order.address?.name,
          order.userId?.email,
          order.address?.email,
          order.address?.phone,
          order.couponCode,
          order.paymentMethod,
          order.orderStatus,
          order.shiprocket?.awb,
          order.address?.city,
          order.address?.state,
          order.address?.zip,
          ...(order.items?.map(item => item.name) || []),
          ...(order.items?.map(item => item.sku) || []),
        ].filter(Boolean).join(' ').toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [orders, orderStartDate, orderEndDate, orderSearch]);

  const clearDateFilter = () => {
    setOrderStartDate('');
    setOrderEndDate('');
    setCurrentPage(1);
  };

  const clearOrderSearch = () => {
    setOrderSearch('');
    setCurrentPage(1);
  };

  // Excel/CSV Export Data
  const orderCsvHeaders = [
    { label: 'Order Item ID', key: 'orderItemId' },
    { label: 'Order ID', key: 'orderId' },
    { label: 'Date', key: 'date' },
    { label: 'Customer Name', key: 'customerName' },
    { label: 'Customer Email', key: 'customerEmail' },
    { label: 'Phone', key: 'phone' },
    { label: 'Luxe Member', key: 'isLuxeMember' },
    { label: 'Items', key: 'items' },
    { label: 'Payment Method', key: 'paymentMethod' },
    { label: 'Payment Status', key: 'paymentStatus' },
    { label: 'Order Status', key: 'orderStatus' },
    { label: 'Coupon Code', key: 'couponCode' },
    { label: 'Coupon Discount', key: 'couponDiscount' },
    { label: 'Shipping Charge', key: 'shippingCharge' },
    { label: 'COD Charge', key: 'codCharge' },
    { label: 'Order Total', key: 'orderTotal' },
    { label: 'Address', key: 'address' },
    { label: 'City', key: 'city' },
    { label: 'State', key: 'state' },
    { label: 'Pincode', key: 'pincode' },
    { label: 'AWB', key: 'awb' },
    { label: 'Courier', key: 'courier' },
  ];

  const orderCsvData = useMemo(() => prepareOrderCsvRows(filteredOrders.map(order => ({
    orderItemId: order.orderItemId || '',
    orderId: order._id,
    date: order.date ? new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
    customerName: order.userId?.name || order.address?.name || 'N/A',
    customerEmail: order.userId?.email || order.address?.email || 'N/A',
    phone: order.address?.phone || 'N/A',
    isLuxeMember: order.userId?.isLuxeMember ? 'Yes' : 'No',
    items: order.items?.map(item => `${item.name} (${item.quantity}${item.size ? `, ${item.size}` : ''})`).join(' | ') || '',
    paymentMethod: order.paymentMethod,
    paymentStatus: order.payment ? 'Paid' : order.orderStatus === 'Cancelled' ? 'Cancelled' : 'Pending',
    orderStatus: order.orderStatus,
    couponCode: order.couponCode || '',
    couponDiscount: order.couponDiscount || 0,
    shippingCharge: order.shippingCharge || 0,
    codCharge: order.codCharge || 0,
    orderTotal: order.orderTotal,
    address: `${order.address?.address || ''}${order.address?.locality ? `, ${order.address.locality}` : ''}`,
    city: order.address?.city || '',
    state: order.address?.state || '',
    pincode: order.address?.zip || '',
    awb: order.shiprocket?.awb || '',
    courier: order.shiprocket?.courier || '',
  }))), [filteredOrders]);

  // Pagination Logic for main Orders
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Sorting Helper
  const sortData = (data, sortConfig) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key, currentSort, setSort) => {
    let direction = 'desc';
    if (currentSort.key === key && currentSort.direction === 'desc') {
      direction = 'asc';
    }
    setSort({ key, direction });
  };

  // Formatting helpers
  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Reusable Sortable Table Header
  const SortHeader = ({ label, sortKey, currentSort, onSort }) => {
    const isActive = currentSort.key === sortKey;
    return (
      <th
        scope="col"
        className="px-4 py-4 text-left text-[11px] font-medium text-[#8b7b93]"
      >
        <button type="button" aria-label={'Sort by ' + label} onClick={() => onSort(sortKey)} className="flex items-center gap-1.5 rounded uppercase tracking-wider transition-colors hover:text-[#a85070]">
          {label}
          <ArrowUpDown size={12} className={isActive ? 'shrink-0 text-[#a85070]' : 'shrink-0 text-[#cbbfd1]'} aria-hidden="true" />
        </button>
      </th>
    );
  };

  // Filtering Logic for Analytics
  const filteredStates = useMemo(() => {
    const matches = analytics.states.filter(s => 
      s.state.toLowerCase().includes(stateSearch.toLowerCase())
    );
    return sortData(matches, stateSort);
  }, [analytics.states, stateSearch, stateSort]);

  const filteredPincodes = useMemo(() => {
    const matches = analytics.pincodes.filter(p => {
      const matchSearch = p.pincode.toLowerCase().includes(pincodeSearch.toLowerCase()) ||
                          p.city.toLowerCase().includes(pincodeSearch.toLowerCase()) ||
                          p.state.toLowerCase().includes(pincodeSearch.toLowerCase());
      const matchState = !selectedStateFilter || p.state === selectedStateFilter;
      return matchSearch && matchState;
    });
    return sortData(matches, pincodeSort);
  }, [analytics.pincodes, pincodeSearch, selectedStateFilter, pincodeSort]);

  const filteredBuyers = useMemo(() => {
    const matches = analytics.customers.filter(c => {
      const nameEmailMatch = c.name.toLowerCase().includes(buyerSearch.toLowerCase()) || 
                             c.email.toLowerCase().includes(buyerSearch.toLowerCase());
      const productMatch = Object.keys(c.products).some(pName => 
        pName.toLowerCase().includes(buyerSearch.toLowerCase())
      );
      return nameEmailMatch || productMatch;
    });
    return sortData(matches, buyerSort);
  }, [analytics.customers, buyerSearch, buyerSort]);

  const filteredReturns = useMemo(() => {
    const matches = analytics.returns.filter(r => {
      const searchLower = returnSearch.toLowerCase();
      const matchText = r.userName.toLowerCase().includes(searchLower) || 
                        r.email.toLowerCase().includes(searchLower) ||
                        r.orderId.toLowerCase().includes(searchLower) ||
                        r.couponUsed.toLowerCase().includes(searchLower) ||
                        r.items.some(i => i.sku.toLowerCase().includes(searchLower) || i.name.toLowerCase().includes(searchLower));
      const matchState = !returnStateFilter || r.state === returnStateFilter;
      return matchText && matchState;
    });
    return sortData(matches, returnSort);
  }, [analytics.returns, returnSearch, returnStateFilter, returnSort]);

  const filteredRefunds = useMemo(() => {
    const matches = analytics.refunds.filter(r => {
      const searchLower = refundSearch.toLowerCase();
      const matchText = r.userName.toLowerCase().includes(searchLower) || 
                        r.email.toLowerCase().includes(searchLower) ||
                        r.orderId.toLowerCase().includes(searchLower) ||
                        r.couponUsed.toLowerCase().includes(searchLower) ||
                        r.items.some(i => i.sku.toLowerCase().includes(searchLower) || i.name.toLowerCase().includes(searchLower));
      const matchState = !refundStateFilter || r.state === refundStateFilter;
      return matchText && matchState;
    });
    return sortData(matches, refundSort);
  }, [analytics.refunds, refundSearch, refundStateFilter, refundSort]);

  const analyticsExports = useMemo(() => buildOrderAnalyticsExports(activeTab, {
    states: filteredStates,
    pincodes: filteredPincodes,
    buyers: filteredBuyers,
    returns: filteredReturns,
    refunds: filteredRefunds,
  }), [activeTab, filteredStates, filteredPincodes, filteredBuyers, filteredReturns, filteredRefunds]);

  const navTabs = [
    { key: 'orders', label: 'All Orders', icon: Package, count: filteredOrders.length },
    { key: 'pincodes', label: 'Pincodes & States', icon: MapPin, count: analytics.pincodes.length },
    { key: 'buyers', label: 'Buyer Analytics', icon: Users, count: analytics.customers.length },
    { key: 'returns', label: 'Returns Log', icon: RefreshCcw, count: analytics.returns.length },
    { key: 'refunds', label: 'Refund Requests', icon: DollarSign, count: analytics.refunds.length },
  ];

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] font-[Outfit,sans-serif] text-[#342a3c] [&_*]:[font-family:inherit] [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-[#b77997] [&_button]:focus-visible:ring-offset-2 motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9c839e]">
            <span className="h-1.5 w-1.5 rotate-45 bg-[#b77997]" aria-hidden="true" /> Febeul / Order management
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Orders<span className="text-[#b77997]">.</span></h1>
          <p className="mt-2 text-sm leading-relaxed text-[#8b7b93]">Manage orders, explore buyer activity, and keep track of returns.</p>
        </div>
        <button type="button" onClick={fetchAllOrders} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#eae5ed] bg-white px-4 py-2.5 text-xs font-medium shadow-sm transition-colors hover:bg-[#faf7fb]">
          <RefreshCcw size={14} aria-hidden="true" /> Refresh orders
        </button>
      </header>

      {/* Dashboard Navigation Tabs */}
      <div aria-label="Order sections" className="mb-6 grid min-w-0 grid-cols-2 gap-1.5 rounded-2xl border border-[#eae5ed] bg-white p-2 shadow-[0_3px_16px_-12px_rgba(48,39,53,0.2)] md:grid-cols-3 xl:grid-cols-5">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs ${
                isActive ? 'bg-[#302735] text-white shadow-sm' : 'text-[#8b7b93] hover:bg-[#f8f4f9] hover:text-[#5b4264]'
              }`}
            >
              <Icon size={15} className={isActive ? 'shrink-0 text-[#e6bfd2]' : 'shrink-0 text-[#b19db9]'} />
              <span>{tab.label}</span>
              <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors ${
                isActive ? 'bg-white/15 text-white' : 'bg-[#f3eef5] text-[#9a83a3]'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Exports for the analytics tabs */}
      {analyticsExports.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#8b7b93]">CSV exports use each table&apos;s current filters and sort order.</p>
          <div className="flex flex-wrap items-center gap-2">
            {analyticsExports.map(exportData => (
              <CSVLink
                key={exportData.name}
                data={exportData.data}
                headers={exportData.headers}
                filename={`${exportData.name}_Export_${new Date().toISOString().split('T')[0]}.csv`}
                aria-label={`Export ${exportData.name.replace(/_/g, ' ')}`}
                className="flex items-center gap-1.5 bg-[#302735] text-white px-4 py-2.5 rounded-lg text-xs font-medium hover:bg-[#4b3d54] transition-colors shadow-sm"
              >
                <Download size={14} /> {exportData.label}
              </CSVLink>
            ))}
          </div>
        </div>
      )}
      {/* -------------------- TAB 1: ALL ORDERS -------------------- */}
      {activeTab === 'orders' && (
        <div className="min-w-0">
          <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Total orders', value: orders.length, icon: Package, color: 'bg-white/10 text-[#e9c7d7]' },
              { label: 'Delivered', value: orders.filter(order => order.orderStatus === 'Delivered').length, icon: BadgeCheck, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Returns logged', value: analytics.returns.length, icon: RefreshCcw, color: 'bg-rose-50 text-rose-600' },
              { label: 'Refund requests', value: analytics.refunds.length, icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
            ].map(({ label, value, icon: Icon, color }, index) => (
              <div key={label} className={'min-w-0 rounded-2xl border p-4 shadow-[0_3px_16px_-12px_rgba(48,39,53,0.2)] sm:p-5 ' + (index === 0 ? 'border-[#302735] bg-[#302735] text-white' : 'border-[#eae5ed] bg-white')}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className={'text-xs font-medium ' + (index === 0 ? 'text-[#d4c5d8]' : 'text-[#8b7b93]')}>{label}</p>
                  <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + color}><Icon size={16} aria-hidden="true" /></span>
                </div>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
                <p className={'mt-1 text-[11px] ' + (index === 0 ? 'text-[#b9a7c0]' : 'text-[#a292a9]')}>All dates</p>
              </div>
            ))}
          </div>
          {/* Toolbar: search, date range, page size, export */}
          <div className='flex min-w-0 flex-col gap-3 mb-5 bg-white p-4 rounded-2xl border border-[#eae5ed] 2xl:flex-row 2xl:items-center'>
            <div className='relative min-w-0 flex-1'>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9d8da5]" size={15} />
              <input
                type="text"
                aria-label="Search orders"
                placeholder="Search by Order ID, Order Item ID, name, email, phone, AWB..."
                value={orderSearch}
                onChange={(e) => { setOrderSearch(e.target.value); setCurrentPage(1); }}
                className='w-full pl-9 pr-8 py-2 bg-[#faf8fb] border border-[#eae5ed] rounded-lg text-sm focus:ring-2 focus:ring-[#f5e9f0] focus:border-[#b77997] outline-none transition-all'
              />
              {orderSearch && (
                <button
                  onClick={clearOrderSearch}
                  className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9d8da5] hover:text-[#b77997] transition-colors'
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <div className='flex w-full min-w-0 items-center gap-2 bg-[#faf8fb] px-2 py-2.5 rounded-lg border border-[#eae5ed] sm:w-auto'>
                <Calendar size={14} className="text-[#9d8da5] shrink-0" />
                <input
                  type="date"
                  aria-label="Order start date"
                  value={orderStartDate}
                  max={orderEndDate || undefined}
                  onChange={(e) => { setOrderStartDate(e.target.value); setCurrentPage(1); }}
                  className='text-xs font-medium text-[#65526f] bg-transparent focus:outline-none cursor-pointer w-[104px] min-w-0 flex-1'
                />
                <span className='text-gray-300'>–</span>
                <input
                  type="date"
                  aria-label="Order end date"
                  value={orderEndDate}
                  min={orderStartDate || undefined}
                  onChange={(e) => { setOrderEndDate(e.target.value); setCurrentPage(1); }}
                  className='text-xs font-medium text-[#65526f] bg-transparent focus:outline-none cursor-pointer w-[104px] min-w-0 flex-1'
                />
                {(orderStartDate || orderEndDate) && (
                  <button
                    onClick={clearDateFilter}
                    className='text-[#9d8da5] hover:text-[#b77997] transition-colors shrink-0'
                    title="Clear date range"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className='flex items-center gap-1.5 bg-[#faf8fb] px-3 py-2 rounded-lg border border-[#eae5ed]'>
                <span className='text-xs font-medium text-[#9d8da5]'>Show</span>
                <select
                  aria-label="Orders per page"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className='text-xs font-semibold text-[#65526f] bg-transparent focus:outline-none cursor-pointer'
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <CSVLink
                data={orderCsvData}
                headers={orderCsvHeaders}
                filename={`Orders_Export_${new Date().toISOString().split('T')[0]}.csv`}
                className='flex items-center gap-1.5 bg-[#302735] text-white px-4 py-2.5 rounded-lg text-xs font-medium hover:bg-[#4b3d54] transition-colors shadow-sm'
              >
                <Download size={14} /> Export
              </CSVLink>
            </div>
          </div>

          <p className='text-xs text-[#8b7b93] mb-3'>
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
          </p>

          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 bg-white rounded-xl border border-dashed border-[#eae5ed]">
              <div className="p-3 bg-[#faf8fb] rounded-full">
                <Package className="text-gray-300" size={28} />
              </div>
              <p className="text-sm font-medium text-[#756480]">
                {orders.length === 0 ? 'No orders found.' : 'No orders match your search or the selected date range.'}
              </p>
              {orders.length > 0 && (
                <button
                  onClick={() => { clearOrderSearch(); clearDateFilter(); }}
                  className="text-xs font-semibold text-[#a85070] hover:text-pink-700"
                >
                  Clear search & filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop / tablet table */}
              <div className='hidden md:block bg-white rounded-xl border border-[#eae5ed] overflow-hidden'>
                <div className='min-w-0 overflow-x-auto'>
                  <table className='w-full min-w-full divide-y divide-[#eee9f0]'>
                    <thead className='bg-[#faf8fb]'>
                      <tr>
                        <th className='px-4 py-3 text-left text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide'>Order</th>
                        <th className='px-4 py-3 text-left text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide'>Customer</th>
                        <th className='px-4 py-3 text-left text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide'>Contact</th>
                        <th className='px-4 py-3 text-left text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide'>Date</th>
                        <th className='px-4 py-3 text-left text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide'>Total</th>
                        <th className='px-4 py-3 text-left text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide'>Destination</th>
                        <th className='px-4 py-3 text-left text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide'>Status</th>
                        <th className='px-4 py-3 text-right text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide'>Actions</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-[#eee9f0]'>
                      {paginatedOrders.map((order) => (
                        <React.Fragment key={order._id}>
                          <tr className='hover:bg-[#faf8fb]/70 transition-colors'>
                            <td className='px-4 py-3 align-top max-w-[160px]'>
                              {order.orderItemId && (
                                <p className='text-xs font-bold text-[#a85070] truncate' title={order.orderItemId}>#{order.orderItemId}</p>
                              )}
                              <p className='text-[11px] text-[#9d8da5] truncate' title={order._id}>#{order._id}</p>
                            </td>
                            <td className='px-4 py-3 align-top max-w-[160px]'>
                              <p className='text-xs font-semibold text-[#4f4059] truncate' title={order.userId?.name || order.address?.name || 'N/A'}>{order.userId?.name || order.address?.name || 'N/A'}</p>
                              {order.userId?.isLuxeMember && (
                                <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide w-fit mt-1'>
                                  Luxe
                                </span>
                              )}
                            </td>
                            <td className='px-4 py-3 align-top max-w-[180px]'>
                              <p className='text-xs text-[#756480] truncate flex items-center gap-1' title={order.userId?.email || order.address?.email || 'N/A'}><Mail size={11} className='text-[#9d8da5] shrink-0' />{order.userId?.email || order.address?.email || 'N/A'}</p>
                              <p className='text-xs text-[#8b7b93] truncate flex items-center gap-1 mt-0.5'><Phone size={11} className='text-[#9d8da5] shrink-0' />{order.address?.phone || 'N/A'}</p>
                            </td>
                            <td className='px-4 py-3 align-top whitespace-nowrap'>
                              <p className='text-xs text-[#65526f] font-medium'>{formatDate(order.date)}</p>
                              <p className='text-[11px] text-[#9d8da5]'>{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td className='px-4 py-3 align-top whitespace-nowrap'>
                              <p className='text-xs font-semibold text-[#342a3c]'>{currency}{order.orderTotal.toFixed(2)}</p>
                            </td>
                            <td className='px-4 py-3 align-top max-w-[150px]'>
                              <p className='text-xs text-[#65526f] font-medium truncate' title={`${order.address.city}, ${order.address.state}`}>{order.address.city}, {order.address.state}</p>
                              <p className='text-[11px] text-[#9d8da5]'>{order.address.zip}</p>
                            </td>
                            <td className='px-4 py-3 align-top whitespace-nowrap'>
                              <StatusBadge status={order.orderStatus} />
                            </td>
                            <td className='px-4 py-3 align-top'>
                              <div className='flex items-center justify-end gap-1.5'>
                                {canCancel(order) && <button type="button" onClick={() => { setCancellationError(''); setCancellingOrder(order); }} aria-label={`Cancel order ${order.orderItemId || order._id}`} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Cancel</button>}
                                <button
                                  onClick={() => downloadInvoice(order._id)}
                                  className='p-1.5 rounded-lg bg-white hover:bg-pink-50 text-[#8b7b93] hover:text-[#a85070] border border-[#eae5ed] transition-colors'
                                  title="Download Invoice"
                                >
                                  <FileText size={15} />
                                </button>
                                <button
                                  onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                                  className='p-1.5 rounded-lg bg-white hover:bg-gray-100 text-[#8b7b93] border border-[#eae5ed] transition-colors'
                                  title={expandedOrderId === order._id ? "Collapse details" : "Expand details"}
                                >
                                  {expandedOrderId === order._id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedOrderId === order._id && (
                            <tr>
                              <td colSpan={8} className='p-0 bg-[#faf8fb]/40'>
                                {orderDetailsPanel(order)}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile card list */}
              <div className='md:hidden space-y-3'>
                {paginatedOrders.map((order) => (
                  <div key={order._id} className='bg-white rounded-xl border border-[#eae5ed] overflow-hidden'>
                    <div className='p-4'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          {order.orderItemId && (
                            <p className='text-[11px] font-bold text-[#a85070] truncate' title={order.orderItemId}>#{order.orderItemId}</p>
                          )}
                          <p className='text-[11px] font-semibold text-[#9d8da5] truncate' title={order._id}>#{order._id}</p>
                          <p className='text-sm font-semibold text-[#342a3c] truncate mt-0.5'>{order.userId?.name || order.address?.name || 'N/A'}</p>
                          <p className='text-xs text-[#8b7b93] truncate'>{order.userId?.email || order.address?.email || 'N/A'}</p>
                          {order.userId?.isLuxeMember && (
                            <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide w-fit mt-1'>
                              Luxe
                            </span>
                          )}
                        </div>
                        <StatusBadge status={order.orderStatus} />
                      </div>

                      <div className='grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#eee9f0] text-xs'>
                        <div>
                          <p className='text-[#9d8da5]'>Date</p>
                          <p className='font-medium text-[#65526f]'>{formatDate(order.date)}</p>
                        </div>
                        <div>
                          <p className='text-[#9d8da5]'>Total</p>
                          <p className='font-semibold text-[#342a3c]'>{currency}{order.orderTotal.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className='text-[#9d8da5]'>Phone</p>
                          <p className='font-medium text-[#65526f]'>{order.address?.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className='text-[#9d8da5]'>Destination</p>
                          <p className='font-medium text-[#65526f]'>{order.address.city}, {order.address.zip}</p>
                        </div>
                      </div>

                      <div className='flex items-center gap-2 mt-3 pt-3 border-t border-[#eee9f0]'>
                        {canCancel(order) && <button type="button" onClick={() => { setCancellationError(''); setCancellingOrder(order); }} aria-label={`Cancel order ${order.orderItemId || order._id}`} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">Cancel</button>}
                        <button
                          onClick={() => downloadInvoice(order._id)}
                          className='flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#faf8fb] hover:bg-pink-50 text-[#756480] hover:text-[#a85070] border border-[#eae5ed] text-xs font-semibold transition-colors'
                        >
                          <FileText size={14} /> Invoice
                        </button>
                        <button
                          onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                          className='flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#faf8fb] hover:bg-gray-100 text-[#756480] border border-[#eae5ed] text-xs font-semibold transition-colors'
                        >
                          {expandedOrderId === order._id ? <>Hide details <ChevronUp size={14} /></> : <>View details <ChevronDown size={14} /></>}
                        </button>
                      </div>
                    </div>
                    {expandedOrderId === order._id && orderDetailsPanel(order)}
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className='flex flex-col sm:flex-row items-center justify-between gap-3 mt-5'>
                  <p className='text-xs text-[#8b7b93]'>
                    Page <span className='font-semibold text-[#65526f]'>{currentPage}</span> of <span className='font-semibold text-[#65526f]'>{totalPages}</span>
                  </p>
                  <div className='flex items-center gap-1.5'>
                    <button
                      onClick={() => {
                        setCurrentPage(prev => Math.max(prev - 1, 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className='px-3 py-1.5 bg-white border border-[#eae5ed] rounded-lg text-xs font-semibold text-[#65526f] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#faf8fb] transition-colors'
                    >
                      Previous
                    </button>

                    <div className='flex gap-1'>
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
                              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${currentPage === pageNum ? 'bg-[#302735] text-white' : 'bg-white border border-[#eae5ed] text-[#756480] hover:bg-[#faf8fb]'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return <span key={pageNum} className='flex items-end px-1 text-[#9d8da5] text-xs'>...</span>;
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
                      className='px-3 py-1.5 bg-white border border-[#eae5ed] rounded-lg text-xs font-semibold text-[#65526f] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#faf8fb] transition-colors'
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* -------------------- TAB 2: PINCODES & STATES -------------------- */}
      {activeTab === 'pincodes' && (
        <div className="space-y-6">
          {/* Top Level Metrics */}
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eee9f0] shadow-sm flex items-center gap-4">
              <div className="shrink-0 p-3 bg-pink-50 text-[#b77997] rounded-xl">
                <Map size={24} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">States Covered</p>
                <h4 className="text-2xl font-semibold tracking-tight tabular-nums break-words text-[#342a3c]">{analytics.states.length}</h4>
              </div>
            </div>
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eee9f0] shadow-sm flex items-center gap-4">
              <div className="shrink-0 p-3 bg-purple-50 text-purple-500 rounded-xl">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Pincodes Reached</p>
                <h4 className="text-2xl font-semibold tracking-tight tabular-nums break-words text-[#342a3c]">{analytics.pincodes.length}</h4>
              </div>
            </div>
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eee9f0] shadow-sm flex items-center gap-4">
              <div className="shrink-0 p-3 bg-green-50 text-green-500 rounded-xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Total Combined revenue</p>
                <h4 className="text-2xl font-semibold tracking-tight tabular-nums break-words text-[#342a3c]">{currency}{orders.reduce((sum, o) => sum + o.orderTotal, 0).toFixed(2)}</h4>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 2xl:grid-cols-12 gap-6">
            {/* Left: States Table */}
            <div className="min-w-0 2xl:col-span-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className="text-sm font-semibold text-[#4f4059] tracking-tight flex items-center gap-1.5">
                  <Map size={16} className="text-[#b77997]" /> States Order Share
                </h4>
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9d8da5]" size={14} />
                  <input
                    type="text"
                    placeholder="Search state..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#eae5ed] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#f5e9f0] focus:border-[#b77997] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="min-w-0 overflow-x-auto bg-white rounded-2xl border border-[#eee9f0] shadow-sm max-h-[500px] overflow-y-auto">
                <table className="w-full min-w-full divide-y divide-[#eee9f0]">
                  <thead className="bg-[#faf8fb] sticky top-0 z-10">
                    <tr>
                      <SortHeader label="State Name" sortKey="state" currentSort={stateSort} onSort={(k) => handleSort(k, stateSort, setStateSort)} />
                      <SortHeader label="Pincodes" sortKey="pincodesCount" currentSort={stateSort} onSort={(k) => handleSort(k, stateSort, setStateSort)} />
                      <SortHeader label="Orders" sortKey="orderCount" currentSort={stateSort} onSort={(k) => handleSort(k, stateSort, setStateSort)} />
                      <SortHeader label="Revenue" sortKey="totalSales" currentSort={stateSort} onSort={(k) => handleSort(k, stateSort, setStateSort)} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3eef5] bg-white">
                    {filteredStates.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-10 text-center text-xs text-[#9d8da5] font-bold uppercase">No states match</td></tr>
                    ) : (
                      filteredStates.map((item, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => setSelectedStateFilter(selectedStateFilter === item.state ? '' : item.state)}
                          className={`hover:bg-pink-50/30 transition-colors cursor-pointer ${selectedStateFilter === item.state ? 'bg-pink-50/70 border-l-4 border-l-[#b77997]' : ''}`}
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-[#4f4059]">{item.state}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#756480] font-semibold">{item.pincodesCount}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#756480] font-bold">{item.orderCount}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-[#342a3c]">{currency}{item.totalSales.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Pincodes Table */}
            <div className="min-w-0 2xl:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-[#4f4059] tracking-tight flex items-center gap-1.5">
                    <MapPin size={16} className="text-[#b77997]" /> Pincode Breakdown
                  </h4>
                  {selectedStateFilter && (
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-semibold rounded-lg uppercase tracking-wider flex items-center gap-1">
                      State: {selectedStateFilter}
                      <button onClick={() => setSelectedStateFilter('')} className="hover:text-pink-900 ml-1">×</button>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial sm:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9d8da5]" size={14} />
                    <input
                      type="text"
                      placeholder="Search pincode or city..."
                      value={pincodeSearch}
                      onChange={(e) => setPincodeSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#eae5ed] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#f5e9f0] focus:border-[#b77997] outline-none transition-all"
                    />
                  </div>
                  {selectedStateFilter && (
                    <button 
                      onClick={() => setSelectedStateFilter('')}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#756480] rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>

              <div className="min-w-0 overflow-x-auto bg-white rounded-2xl border border-[#eee9f0] shadow-sm max-h-[500px] overflow-y-auto">
                <table className="w-full min-w-full divide-y divide-[#eee9f0]">
                  <thead className="bg-[#faf8fb] sticky top-0 z-10">
                    <tr>
                      <SortHeader label="Pincode" sortKey="pincode" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                      <SortHeader label="City" sortKey="city" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                      <SortHeader label="State" sortKey="state" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                      <SortHeader label="Buyers" sortKey="customersCount" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                      <SortHeader label="Orders" sortKey="orderCount" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                      <SortHeader label="Revenue" sortKey="totalSales" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3eef5] bg-white">
                    {filteredPincodes.length === 0 ? (
                      <tr><td colSpan="6" className="px-6 py-10 text-center text-xs text-[#9d8da5] font-bold uppercase">No pincodes match search or filter</td></tr>
                    ) : (
                      filteredPincodes.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#faf8fb] transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-[#4f4059]">{item.pincode}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#756480] font-medium capitalize">{item.city}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#8b7b93] font-semibold">{item.state}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#756480] font-semibold">{item.customersCount}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#756480] font-bold">{item.orderCount}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-[#342a3c]">{currency}{item.totalSales.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 3: BUYER ANALYTICS -------------------- */}
      {activeTab === 'buyers' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eee9f0] shadow-sm flex items-center gap-4">
              <div className="shrink-0 p-3 bg-blue-50 text-blue-500 rounded-xl">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Total Unique Buyers</p>
                <h4 className="text-2xl font-semibold tracking-tight tabular-nums break-words text-[#342a3c]">{analytics.customers.length}</h4>
              </div>
            </div>
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eee9f0] shadow-sm flex items-center gap-4">
              <div className="shrink-0 p-3 bg-amber-50 text-amber-600 rounded-xl">
                <BadgeCheck size={24} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Luxe Members</p>
                <h4 className="text-2xl font-semibold tracking-tight tabular-nums break-words text-[#342a3c]">{analytics.customers.filter(c => c.isLuxe).length}</h4>
              </div>
            </div>
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eee9f0] shadow-sm flex items-center gap-4">
              <div className="shrink-0 p-3 bg-pink-50 text-[#b77997] rounded-xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Avg. Orders / Customer</p>
                <h4 className="text-2xl font-semibold tracking-tight tabular-nums break-words text-[#342a3c]">
                  {analytics.customers.length ? (orders.length / analytics.customers.length).toFixed(1) : 0}
                </h4>
              </div>
            </div>
          </div>

          {/* Table Header & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h4 className="text-sm font-semibold text-[#4f4059] tracking-tight flex items-center gap-1.5">
              <Users size={16} className="text-[#b77997]" /> Buyer Order Frequency & Product Preferences
            </h4>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9d8da5]" size={16} />
              <input
                type="text"
                placeholder="Search by name, email, or product..."
                value={buyerSearch}
                onChange={(e) => setBuyerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#eae5ed] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#f5e9f0] focus:border-[#b77997] outline-none transition-all"
              />
            </div>
          </div>

          {/* Buyers Detailed Table */}
          <div className="min-w-0 overflow-x-auto bg-white rounded-2xl border border-[#eee9f0] shadow-sm">
            <table className="w-full min-w-full divide-y divide-[#eee9f0]">
              <thead className="bg-[#faf8fb]">
                <tr>
                  <SortHeader label="Buyer Identity" sortKey="name" currentSort={buyerSort} onSort={(k) => handleSort(k, buyerSort, setBuyerSort)} />
                  <SortHeader label="Order Count (Frequency)" sortKey="orderCount" currentSort={buyerSort} onSort={(k) => handleSort(k, buyerSort, setBuyerSort)} />
                  <SortHeader label="Total Spend" sortKey="totalSpent" currentSort={buyerSort} onSort={(k) => handleSort(k, buyerSort, setBuyerSort)} />
                  <th className="px-4 py-4 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Products Ordered & Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3eef5] bg-white">
                {filteredBuyers.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-10 text-center text-xs text-[#9d8da5] font-bold uppercase">No buyers found</td></tr>
                ) : (
                  filteredBuyers.map((customer, idx) => (
                    <tr key={idx} className="hover:bg-[#faf8fb] transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-pink-50 rounded-xl flex items-center justify-center font-semibold text-[#a85070] text-sm uppercase">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#342a3c] flex items-center gap-1.5">
                              {customer.name}
                              {customer.isLuxe && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-semibold rounded uppercase border border-amber-200">Luxe</span>
                              )}
                            </p>
                            <p className="text-[10px] text-[#9d8da5] font-bold">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-[#756480] font-bold">
                        {customer.orderCount} order{customer.orderCount > 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs font-semibold text-[#342a3c]">
                        {currency}{customer.totalSpent.toFixed(2)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-2">
                          {Object.values(customer.products).map((prod, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-2 bg-[#faf8fb] p-1.5 rounded-xl border border-[#eee9f0] w-full max-w-md">
                              <img src={prod.image} className="w-8 h-8 object-cover rounded-lg border shadow-sm" alt="" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-[#4f4059] truncate">{prod.name}</p>
                                <p className="text-[9px] text-[#9d8da5] font-bold uppercase">SKU: {prod.sku}</p>
                              </div>
                              <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg font-semibold whitespace-nowrap">
                                Qty: {prod.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB 4: RETURNS LOG -------------------- */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eee9f0] shadow-sm flex items-center gap-4">
              <div className="shrink-0 p-3 bg-red-50 text-red-500 rounded-xl">
                <RefreshCcw size={24} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Total Returns Processed</p>
                <h4 className="text-2xl font-semibold tracking-tight tabular-nums break-words text-[#342a3c]">{analytics.returns.length}</h4>
              </div>
            </div>
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eee9f0] shadow-sm flex items-center gap-4">
              <div className="shrink-0 p-3 bg-emerald-50 text-emerald-500 rounded-xl">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Total Refunded Capital</p>
                <h4 className="text-2xl font-semibold tracking-tight tabular-nums break-words text-[#342a3c]">
                  {currency}{analytics.returns.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                </h4>
              </div>
            </div>
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eee9f0] shadow-sm flex items-center gap-4">
              <div className="shrink-0 p-3 bg-purple-50 text-purple-500 rounded-xl">
                <Map size={24} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Affected Return States</p>
                <h4 className="text-2xl font-semibold tracking-tight tabular-nums break-words text-[#342a3c]">{analytics.returnStates.length}</h4>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 2xl:grid-cols-12 gap-6">
            {/* Left Column: Returns by State */}
            <div className="min-w-0 2xl:col-span-4 space-y-4">
              <h4 className="text-sm font-semibold text-[#4f4059] tracking-tight flex items-center gap-1.5">
                <Map size={16} className="text-[#b77997]" /> Returns by State
              </h4>
              <div className="min-w-0 overflow-x-auto bg-white rounded-2xl border border-[#eee9f0] shadow-sm">
                <table className="w-full min-w-full divide-y divide-[#eee9f0]">
                  <thead className="bg-[#faf8fb]">
                    <tr>
                      <th className="px-4 py-4 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">State</th>
                      <th className="px-4 py-4 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Return Count</th>
                      <th className="px-4 py-4 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Total Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3eef5] bg-white">
                    {analytics.returnStates.length === 0 ? (
                      <tr><td colSpan="3" className="px-6 py-8 text-center text-xs text-[#9d8da5] font-bold uppercase">No state returns</td></tr>
                    ) : (
                      analytics.returnStates.map((item, idx) => (
                        <tr 
                          key={idx}
                          onClick={() => setReturnStateFilter(returnStateFilter === item.state ? '' : item.state)}
                          className={`hover:bg-red-50/20 cursor-pointer transition-colors ${returnStateFilter === item.state ? 'bg-red-50/50 border-l-4 border-l-red-500' : ''}`}
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-[#4f4059]">{item.state}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-red-600 font-bold">{item.count} returns</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-[#342a3c]">{currency}{item.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Return Requests Log */}
            <div className="min-w-0 2xl:col-span-8 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-[#4f4059] tracking-tight flex items-center gap-1.5">
                    <RefreshCcw size={16} className="text-[#b77997]" /> Returned Order details
                  </h4>
                  {returnStateFilter && (
                    <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded-lg uppercase tracking-wider flex items-center gap-1">
                      State: {returnStateFilter}
                      <button onClick={() => setReturnStateFilter('')} className="hover:text-red-900 ml-1">×</button>
                    </span>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9d8da5]" size={14} />
                    <input
                      type="text"
                      placeholder="Search log by ID, name, SKU, coupon..."
                      value={returnSearch}
                      onChange={(e) => setReturnSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#eae5ed] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#f5e9f0] focus:border-[#b77997] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="min-w-0 overflow-x-auto bg-white rounded-2xl border border-[#eee9f0] shadow-sm max-h-[500px] overflow-y-auto">
                <table className="w-full min-w-full divide-y divide-[#eee9f0] [&_th]:whitespace-nowrap [&_th]:align-middle [&_td]:align-top">
                  <thead className="bg-[#faf8fb] sticky top-0 z-10">
                    <tr>
                      <SortHeader label="Return Date" sortKey="date" currentSort={returnSort} onSort={(k) => handleSort(k, returnSort, setReturnSort)} />
                      <th className="px-4 py-4 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Order Details</th>
                      <th className="px-4 py-4 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Buyer Info</th>
                      <th className="px-4 py-4 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">State & Pin</th>
                      <th className="px-4 py-4 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">SKU & Item Details</th>
                      <th className="px-4 py-4 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Coupon Used</th>
                      <SortHeader label="Refund Amount" sortKey="amount" currentSort={returnSort} onSort={(k) => handleSort(k, returnSort, setReturnSort)} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee9f0] bg-white">
                    {filteredReturns.length === 0 ? (
                      <tr><td colSpan="7" className="px-6 py-10 text-center text-xs text-[#9d8da5] font-bold uppercase">No return records found</td></tr>
                    ) : (
                      filteredReturns.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#faf8fb] transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#756480] font-semibold">{formatDate(item.date)}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-[#342a3c]">#{item.orderId.slice(-8).toUpperCase()}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="text-xs font-bold text-[#4f4059]">{item.userName}</p>
                            <p className="text-[10px] text-[#9d8da5] font-semibold">{item.email}</p>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="text-xs font-bold text-[#4f4059]">{item.state}</p>
                            <p className="text-[10px] text-[#9d8da5] font-semibold">{item.pincode}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-1">
                              {item.items.map((prod, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-1.5 text-[10px]">
                                  <span className="font-bold text-[#4f4059] bg-gray-100 px-1 py-0.5 rounded">SKU: {prod.sku}</span>
                                  <span className="text-[#8b7b93] truncate max-w-40 font-medium">({prod.name})</span>
                                  <span className="text-[#756480] font-bold ml-auto">x{prod.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                            {item.couponUsed !== 'None' ? (
                              <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-semibold rounded border border-green-200">
                                {item.couponUsed}
                              </span>
                            ) : (
                              <span className="text-[#9d8da5] font-medium">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-red-600">
                            {currency}{item.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 5: REFUND REQUESTS -------------------- */}
      {activeTab === 'refunds' && (
        <div className="space-y-5">
          {/* Summary Stats */}
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eae5ed] flex items-center gap-3.5">
              <div className="p-2.5 bg-orange-50 text-orange-500 rounded-lg">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Active Refund Requests</p>
                <h4 className="text-xl font-bold text-[#342a3c]">{analytics.refunds.length}</h4>
              </div>
            </div>
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eae5ed] flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Requested Refund Capital</p>
                <h4 className="text-xl font-bold text-[#342a3c]">
                  {currency}{analytics.refunds.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                </h4>
              </div>
            </div>
            <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-[#eae5ed] flex items-center gap-3.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-lg">
                <Map size={20} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#8b7b93]">Affected Request States</p>
                <h4 className="text-xl font-bold text-[#342a3c]">{analytics.refundStates.length}</h4>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 2xl:grid-cols-12 gap-6">
            {/* Left Column: Requests by State */}
            <div className="min-w-0 2xl:col-span-4 space-y-3">
              <h4 className="text-sm font-semibold text-[#4f4059] tracking-tight flex items-center gap-1.5">
                <Map size={14} className="text-[#b77997]" /> Requests by State
              </h4>
              <div className="bg-white rounded-xl border border-[#eae5ed] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-[#eee9f0]">
                    <thead className="bg-[#faf8fb]">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide">State</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide">Requests</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#8b7b93] uppercase tracking-wide">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee9f0]">
                      {analytics.refundStates.length === 0 ? (
                        <tr><td colSpan="3" className="px-4 py-8 text-center text-xs text-[#9d8da5]">No active requests</td></tr>
                      ) : (
                        analytics.refundStates.map((item, idx) => (
                          <tr
                            key={idx}
                            onClick={() => setRefundStateFilter(refundStateFilter === item.state ? '' : item.state)}
                            className={`cursor-pointer transition-colors ${refundStateFilter === item.state ? 'bg-orange-50' : 'hover:bg-[#faf8fb]'}`}
                          >
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-semibold text-[#4f4059]">{item.state}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-orange-600 font-semibold">{item.count}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-semibold text-[#342a3c]">{currency}{item.totalAmount.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Refund Requests Log */}
            <div className="min-w-0 2xl:col-span-8 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-[#4f4059] tracking-tight flex items-center gap-1.5">
                    <DollarSign size={14} className="text-[#b77997]" /> Pending Refund Requests
                  </h4>
                  {refundStateFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 border border-orange-100 text-[11px] font-semibold rounded-full">
                      {refundStateFilter}
                      <button onClick={() => setRefundStateFilter('')} className="hover:text-orange-900" title="Clear state filter">
                        <X size={11} />
                      </button>
                    </span>
                  )}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9d8da5]" size={14} />
                  <input
                    type="text"
                    placeholder="Search by ID, name, SKU, coupon..."
                    value={refundSearch}
                    onChange={(e) => setRefundSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#faf8fb] border border-[#eae5ed] rounded-lg text-xs focus:ring-2 focus:ring-[#f5e9f0] focus:border-[#b77997] outline-none transition-all"
                  />
                </div>
              </div>

              {filteredRefunds.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 bg-white rounded-xl border border-dashed border-[#eae5ed]">
                  <DollarSign className="text-gray-300" size={26} />
                  <p className="text-sm text-[#8b7b93]">No pending requests found</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block bg-white rounded-xl border border-[#eae5ed] overflow-hidden">
                    <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                      <table className="w-full min-w-full divide-y divide-[#eee9f0]">
                        <thead className="bg-[#faf8fb] sticky top-0 z-10">
                          <tr>
                            <SortHeader label="Date" sortKey="date" currentSort={refundSort} onSort={(k) => handleSort(k, refundSort, setRefundSort)} />
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Order</th>
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Buyer</th>
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Destination</th>
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Items</th>
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Coupon</th>
                            <SortHeader label="Amount" sortKey="amount" currentSort={refundSort} onSort={(k) => handleSort(k, refundSort, setRefundSort)} />
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#8b7b93] uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee9f0]">
                          {filteredRefunds.map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#faf8fb]/70 transition-colors">
                              <td className="px-4 py-3 align-top whitespace-nowrap text-xs text-[#756480] font-medium">{formatDate(item.date)}</td>
                              <td className="px-4 py-3 align-top max-w-[130px]">
                                <p className="text-xs font-semibold text-[#342a3c] truncate" title={item.orderId}>#{item.orderId}</p>
                              </td>
                              <td className="px-4 py-3 align-top max-w-[160px]">
                                <p className="text-xs font-semibold text-[#4f4059] truncate">{item.userName}</p>
                                <p className="text-[11px] text-[#8b7b93] truncate">{item.email}</p>
                              </td>
                              <td className="px-4 py-3 align-top whitespace-nowrap">
                                <p className="text-xs text-[#65526f] font-medium">{item.state}</p>
                                <p className="text-[11px] text-[#9d8da5]">{item.pincode}</p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-col gap-1 max-w-[220px]">
                                  {item.items.map((prod, pIdx) => (
                                    <div key={pIdx} className="flex items-center gap-1.5 text-[11px]">
                                      <span className="font-semibold text-[#65526f] bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{prod.sku}</span>
                                      <span className="text-[#8b7b93] truncate">{prod.name}</span>
                                      <span className="text-[#756480] font-semibold ml-auto shrink-0">x{prod.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top whitespace-nowrap text-xs">
                                {item.couponUsed !== 'None' ? (
                                  <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-semibold rounded border border-green-100">
                                    {item.couponUsed}
                                  </span>
                                ) : (
                                  <span className="text-[#9d8da5]">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top whitespace-nowrap text-xs font-semibold text-[#342a3c]">
                                {currency}{item.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 align-top whitespace-nowrap">
                                {refundStatusBadge(item.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {filteredRefunds.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-xl border border-[#eae5ed] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-[#9d8da5] truncate" title={item.orderId}>#{item.orderId}</p>
                            <p className="text-sm font-semibold text-[#342a3c] truncate mt-0.5">{item.userName}</p>
                            <p className="text-xs text-[#8b7b93] truncate">{item.email}</p>
                          </div>
                          {refundStatusBadge(item.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#eee9f0] text-xs">
                          <div>
                            <p className="text-[#9d8da5]">Requested</p>
                            <p className="font-medium text-[#65526f]">{formatDate(item.date)}</p>
                          </div>
                          <div>
                            <p className="text-[#9d8da5]">Amount</p>
                            <p className="font-semibold text-[#342a3c]">{currency}{item.amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[#9d8da5]">Destination</p>
                            <p className="font-medium text-[#65526f]">{item.state}, {item.pincode}</p>
                          </div>
                          <div>
                            <p className="text-[#9d8da5]">Coupon</p>
                            <p className="font-medium text-[#65526f]">{item.couponUsed !== 'None' ? item.couponUsed : '—'}</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#eee9f0] space-y-1">
                          {item.items.map((prod, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-semibold text-[#65526f] bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{prod.sku}</span>
                              <span className="text-[#8b7b93] truncate">{prod.name}</span>
                              <span className="text-[#756480] font-semibold ml-auto shrink-0">x{prod.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {cancellingOrder && <OrderCancellationDialog order={cancellingOrder} busy={isCancelling} error={cancellationError} onClose={closeCancellation} onConfirm={cancelSelectedOrder} />}
    </div>
  )
}

export default Orders
