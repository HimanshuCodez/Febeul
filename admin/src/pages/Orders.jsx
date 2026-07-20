import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { 
  Package, User, Mail, Phone, MapPin, Truck, Calendar, DollarSign, 
  CreditCard, Tag, BadgeCheck, AlertCircle, ChevronDown, ChevronUp, 
  FileText, TrendingUp, Users, RefreshCcw, Search, ArrowUpDown, Percent, Map 
} from 'lucide-react';

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([])
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [activeTab, setActiveTab] = useState('orders');

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

  // Date-filtered Orders
  const filteredOrders = useMemo(() => {
    if (!orderStartDate && !orderEndDate) return orders;
    const start = orderStartDate ? new Date(orderStartDate).setHours(0, 0, 0, 0) : null;
    const end = orderEndDate ? new Date(orderEndDate).setHours(23, 59, 59, 999) : null;
    return orders.filter(order => {
      const orderTime = new Date(order.date).getTime();
      if (start !== null && orderTime < start) return false;
      if (end !== null && orderTime > end) return false;
      return true;
    });
  }, [orders, orderStartDate, orderEndDate]);

  const clearDateFilter = () => {
    setOrderStartDate('');
    setOrderEndDate('');
    setCurrentPage(1);
  };

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
        onClick={() => onSort(sortKey)}
        className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 transition-colors select-none"
      >
        <div className="flex items-center gap-1.5">
          {label}
          <ArrowUpDown size={12} className={isActive ? 'text-pink-500' : 'text-gray-300'} />
        </div>
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

  return (
    <div className='p-6 bg-gray-50 min-h-screen font-sans'>
      {/* Title Header */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4'>
        <div>
          <h3 className='text-3xl font-black text-gray-900 tracking-tighter uppercase'>Orders Dashboard & Analytics</h3>
          <p className="text-gray-500 font-medium">Real-time order statuses, state-wise data, return logs & customer tracking</p>
        </div>
      </div>

      {/* Modern Dashboard Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === 'orders'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Package size={16} />
          All Orders ({filteredOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('pincodes')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === 'pincodes'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <MapPin size={16} />
          Pincodes & States ({analytics.pincodes.length})
        </button>
        <button
          onClick={() => setActiveTab('buyers')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === 'buyers'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Users size={16} />
          Buyer Analytics ({analytics.customers.length})
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === 'returns'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <RefreshCcw size={16} />
          Returns Log ({analytics.returns.length})
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === 'refunds'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <DollarSign size={16} />
          Refund Requests ({analytics.refunds.length})
        </button>
      </div>
      
      {/* -------------------- TAB 1: ALL ORDERS -------------------- */}
      {activeTab === 'orders' && (
        <div>
          <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm'>
            <div className="flex items-center gap-2">
              <Package className="text-pink-500" size={20} />
              <span className="text-sm font-bold text-gray-700">Orders List Manager</span>
            </div>
            <div className='flex flex-wrap items-center gap-4'>
              <div className='flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200'>
                <Calendar size={14} className="text-gray-400" />
                <span className='text-xs font-bold text-gray-400 uppercase tracking-wider'>From</span>
                <input
                  type="date"
                  value={orderStartDate}
                  max={orderEndDate || undefined}
                  onChange={(e) => { setOrderStartDate(e.target.value); setCurrentPage(1); }}
                  className='text-sm font-bold text-gray-700 bg-transparent focus:outline-none cursor-pointer'
                />
                <span className='text-xs font-bold text-gray-400 uppercase tracking-wider'>To</span>
                <input
                  type="date"
                  value={orderEndDate}
                  min={orderStartDate || undefined}
                  onChange={(e) => { setOrderEndDate(e.target.value); setCurrentPage(1); }}
                  className='text-sm font-bold text-gray-700 bg-transparent focus:outline-none cursor-pointer'
                />
                {(orderStartDate || orderEndDate) && (
                  <button
                    onClick={clearDateFilter}
                    className='text-xs font-bold text-pink-500 hover:text-pink-700 uppercase tracking-wider ml-1'
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className='flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200'>
                <span className='text-xs font-bold text-gray-400 uppercase tracking-wider'>Show</span>
                <select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className='text-sm font-bold text-gray-700 bg-transparent focus:outline-none cursor-pointer'
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              {totalPages > 1 && (
                <span className='text-sm text-gray-500 font-medium'>Page {currentPage} of {totalPages}</span>
              )}
            </div>
          </div>

          <div className='space-y-6'>
            {filteredOrders.length === 0 ? (
              <p className="text-center text-gray-500 text-lg py-10">
                {orders.length === 0 ? 'No orders found.' : 'No orders match the selected date range.'}
              </p>
            ) : (
              <>
                {paginatedOrders.map((order) => (
                  <div className='bg-white rounded-2xl shadow-md hover:shadow-lg transition-all overflow-hidden border border-gray-100' key={order._id}>
                    {/* Order Summary Header */}
                    <div className='flex flex-col lg:flex-row justify-between items-start p-5 bg-gray-50/50 border-b border-gray-100 gap-4'>
                      <div className="flex items-start gap-4">
                        <Package size={22} className="text-pink-500 mt-1" />
                        <div>
                          <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Order ID</p>
                          <p className='text-sm font-black text-gray-900'>#{order._id}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <User size={22} className="text-pink-500 mt-1" />
                        <div>
                          <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Customer</p>
                          <div className='flex flex-col'>
                            <p className='text-sm font-bold text-gray-800'>{order.userId?.name || order.address?.name || 'N/A'}</p>
                            <p className='text-xs text-gray-500 font-medium'>{order.userId?.email || order.address?.email || 'N/A'}</p>
                            {order.userId?.isLuxeMember && (
                              <span className='inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider w-fit mt-1'>
                                <span className='w-1 h-1 bg-amber-500 rounded-full mr-1 animate-pulse'></span>
                                Luxe Member
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <Calendar size={22} className="text-pink-500 mt-1" />
                        <div>
                          <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Order Date</p>
                          <p className='text-sm font-bold text-gray-800'>{formatDate(order.date)}</p>
                          <p className='text-xs text-gray-500 font-medium'>{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <DollarSign size={22} className="text-pink-500 mt-1" />
                        <div>
                          <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Total Amount</p>
                          <p className='text-sm font-black text-gray-950'>{currency}{order.orderTotal.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <MapPin size={22} className="text-pink-500 mt-1" />
                        <div>
                          <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Destination</p>
                          <p className='text-sm font-bold text-gray-800'>{order.address.state}</p>
                          <p className='text-xs text-gray-500 font-medium'>{order.address.city} - {order.address.zip}</p>
                        </div>
                      </div>

                      <div className='flex items-center gap-3 lg:self-center mt-2 lg:mt-0'>
                        <button
                          onClick={() => downloadInvoice(order._id)}
                          className="p-2 rounded-xl bg-white hover:bg-pink-50 transition-colors text-pink-500 border border-gray-100 shadow-sm"
                          title="Download Invoice"
                        >
                          <FileText size={18} />
                        </button>
                        <StatusBadge status={order.orderStatus} />
                        <button
                          onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                          className="p-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-100 transition-colors shadow-sm"
                          title={expandedOrderId === order._id ? "Collapse details" : "Expand details"}
                        >
                          {expandedOrderId === order._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Order Details Body (Conditionally Rendered) */}
                    {expandedOrderId === order._id && (
                      <div className='p-5 border-t border-gray-100 bg-white'>
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                          {/* Products */}
                          <div>
                            <p className='font-bold text-gray-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5'><Tag size={14}/> Products</p>
                            <div className='space-y-3'>
                              {order.items.map((item, itemIndex) => (
                                <div key={itemIndex} className='flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100'>
                                  <img className='w-12 h-12 object-cover rounded-lg border shadow-sm' src={item.image} alt={item.name} />
                                  <div className="min-w-0 flex-1">
                                    <p className='text-xs font-bold text-gray-800 truncate'>{item.name}</p>
                                    <p className='text-[10px] text-gray-500 font-medium'>
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
                          <div>
                            <p className='font-bold text-gray-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5'><User size={14}/> Customer & Shipping</p>
                            <address className='text-xs text-gray-600 not-italic space-y-1.5'>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-800">{order.address.name}</p>
                                {order.address.addressType && (
                                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] rounded uppercase font-bold border">
                                    {order.address.addressType === 'Home' ? 'Home' : order.address.addressType}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-500 flex items-center gap-1"><Mail size={12}/> {order.userId?.email || order.address?.email || 'N/A'}</p>
                              <p className="text-gray-500 flex items-center gap-1"><Phone size={12}/> {order.address.phone}</p>
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="font-medium text-gray-800">{order.address.address}, {order.address.locality}</p>
                                {order.address.landmark && <p className="italic text-gray-400 text-[10px]">Landmark: {order.address.landmark}</p>}
                                <p className="font-bold text-gray-700">{order.address.city}, {order.address.state}, {order.address.country} - {order.address.zip}</p>
                              </div>
                            </address>
                          </div>

                          {/* Payment & Shiprocket */}
                          <div>
                            <p className='font-bold text-gray-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5'><CreditCard size={14}/> Payment Info</p>
                            <div className='space-y-1.5 text-xs text-gray-600'>
                              <p>Method: <span className="font-bold text-gray-800">{order.paymentMethod}</span></p>
                              <p>Status: <span className={`font-bold ${order.payment ? 'text-green-600' : order.orderStatus === 'Cancelled' ? 'text-gray-500' : 'text-red-600'}`}>{order.payment ? 'Paid' : order.orderStatus === 'Cancelled' ? 'Cancelled' : 'Pending'}</span></p>
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
                              <p className="text-sm font-black text-gray-900 mt-2">Total Paid: {currency}{order.orderTotal.toFixed(2)}</p>
                            </div>

                            {order.shiprocket && (
                              <div className='mt-4 pt-3 border-t border-gray-100'>
                                <p className='font-bold text-gray-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5'><Truck size={14}/> Logistics</p>
                                <div className='space-y-1 text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border'>
                                  {order.shiprocketStatus && (
                                    <p>Live Status: <span className="font-bold text-gray-900 uppercase">{order.shiprocketStatus.replace(/_/g, ' ')}</span></p>
                                  )}
                                  {order.shiprocket.awb && <p>AWB: <span className="font-bold">{order.shiprocket.awb}</span></p>}
                                  {order.shiprocket.courier && <p>Courier: <span className="font-semibold">{order.shiprocket.courier}</span></p>}
                                  {order.shiprocket.lastTrackedAt && (
                                    <p className="text-[10px] text-gray-400">Last synced: {formatDate(order.shiprocket.lastTrackedAt)}</p>
                                  )}
                                  {order.shiprocket.trackingUrl && (
                                    <a
                                      href={order.shiprocket.trackingUrl}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className='text-pink-600 hover:underline flex items-center gap-1 font-bold mt-1 text-[10px] uppercase'
                                    >
                                      <FileText size={12}/> Track Shipment
                                    </a>
                                  )}
                                  {order.shiprocket.trackingHistory?.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                                      {[...order.shiprocket.trackingHistory].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).map((act, i) => (
                                        <p key={i} className="text-[10px] text-gray-500">
                                          <span className="font-bold text-gray-700">{act.activity || act.status}</span>
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
                            <div>
                              <p className='font-bold text-red-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5'><AlertCircle size={14}/> Returns / Cancellation</p>
                              <div className='space-y-2 text-xs text-gray-600 bg-red-50/50 p-3.5 rounded-xl border border-red-100'>
                                <p className="font-black text-red-700 capitalize">Status: {order.orderStatus}</p>
                                {order.refundDetails?.reason && (
                                  <p><span className="font-bold text-gray-700">Reason:</span> <span className="italic text-gray-600">"{order.refundDetails.reason}"</span></p>
                                )}
                                {order.refundDetails?.status && order.refundDetails.status !== 'none' && (
                                  <p><span className="font-bold text-gray-700">Refund status:</span> <span className="font-bold text-gray-900 uppercase text-[10px] bg-white px-2 py-0.5 rounded shadow-sm border">{order.refundDetails.status}</span></p>
                                )}
                                {order.refundDetails?.amount > 0 && (
                                  <p><span className="font-bold text-gray-700">Refunded Amount:</span> <span className="font-black text-red-700">{currency}{order.refundDetails.amount.toFixed(2)}</span></p>
                                )}
                                {order.refundDetails?.requestedAt && (
                                  <p><span className="font-bold text-gray-700">Claimed Date:</span> <span className="font-medium text-gray-600">{formatDate(order.refundDetails.requestedAt)}</span></p>
                                )}
                                {order.refundDetails?.pickup && order.refundDetails.pickup.status !== 'none' && (
                                  <div className="mt-2 pt-2 border-t border-red-100">
                                    <p><span className="font-bold text-gray-700">Pickup status:</span> <span className="font-bold text-gray-900 uppercase text-[10px] bg-white px-2 py-0.5 rounded shadow-sm border">{order.refundDetails.pickup.status.replace(/_/g, ' ')}</span></p>
                                    {order.refundDetails.pickup.awb && <p className="text-[10px] text-gray-500 mt-1">Return AWB: <span className="font-bold">{order.refundDetails.pickup.awb}</span> {order.refundDetails.pickup.courier ? `(${order.refundDetails.pickup.courier})` : ''}</p>}
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
                    )}
                  </div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className='flex justify-center items-center gap-2 mt-8 mb-6'>
                    <button
                      onClick={() => {
                        setCurrentPage(prev => Math.max(prev - 1, 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className='px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm'
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
                              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${currentPage === pageNum ? 'bg-pink-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return <span key={pageNum} className='flex items-end px-1 text-gray-400 text-xs'>...</span>;
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
                      className='px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm'
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: PINCODES & STATES -------------------- */}
      {activeTab === 'pincodes' && (
        <div className="space-y-8">
          {/* Top Level Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-pink-50 text-pink-500 rounded-xl">
                <Map size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">States Covered</p>
                <h4 className="text-2xl font-black text-gray-900">{analytics.states.length}</h4>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-purple-50 text-purple-500 rounded-xl">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pincodes Reached</p>
                <h4 className="text-2xl font-black text-gray-900">{analytics.pincodes.length}</h4>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-green-50 text-green-500 rounded-xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Combined revenue</p>
                <h4 className="text-2xl font-black text-gray-900">{currency}{orders.reduce((sum, o) => sum + o.orderTotal, 0).toFixed(2)}</h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: States Table */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Map size={16} className="text-pink-500" /> States Order Share
                </h4>
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search state..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm max-h-[500px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50 sticky top-0 z-10">
                    <tr>
                      <SortHeader label="State Name" sortKey="state" currentSort={stateSort} onSort={(k) => handleSort(k, stateSort, setStateSort)} />
                      <SortHeader label="Pincodes" sortKey="pincodesCount" currentSort={stateSort} onSort={(k) => handleSort(k, stateSort, setStateSort)} />
                      <SortHeader label="Orders" sortKey="orderCount" currentSort={stateSort} onSort={(k) => handleSort(k, stateSort, setStateSort)} />
                      <SortHeader label="Revenue" sortKey="totalSales" currentSort={stateSort} onSort={(k) => handleSort(k, stateSort, setStateSort)} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {filteredStates.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-10 text-center text-xs text-gray-400 font-bold uppercase">No states match</td></tr>
                    ) : (
                      filteredStates.map((item, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => setSelectedStateFilter(selectedStateFilter === item.state ? '' : item.state)}
                          className={`hover:bg-pink-50/30 transition-colors cursor-pointer ${selectedStateFilter === item.state ? 'bg-pink-50/70 border-l-4 border-l-pink-500' : ''}`}
                        >
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-gray-800">{item.state}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 font-semibold">{item.pincodesCount}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 font-bold">{item.orderCount}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-gray-900">{currency}{item.totalSales.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Pincodes Table */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={16} className="text-pink-500" /> Pincode Breakdown
                  </h4>
                  {selectedStateFilter && (
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 animate-pulse">
                      State: {selectedStateFilter}
                      <button onClick={() => setSelectedStateFilter('')} className="hover:text-pink-900 ml-1">×</button>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial sm:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search pincode or city..."
                      value={pincodeSearch}
                      onChange={(e) => setPincodeSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all"
                    />
                  </div>
                  {selectedStateFilter && (
                    <button 
                      onClick={() => setSelectedStateFilter('')}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm max-h-[500px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50 sticky top-0 z-10">
                    <tr>
                      <SortHeader label="Pincode" sortKey="pincode" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                      <SortHeader label="City" sortKey="city" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                      <SortHeader label="State" sortKey="state" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                      <SortHeader label="Buyers" sortKey="customersCount" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                      <SortHeader label="Orders" sortKey="orderCount" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                      <SortHeader label="Revenue" sortKey="totalSales" currentSort={pincodeSort} onSort={(k) => handleSort(k, pincodeSort, setPincodeSort)} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {filteredPincodes.length === 0 ? (
                      <tr><td colSpan="6" className="px-6 py-10 text-center text-xs text-gray-400 font-bold uppercase">No pincodes match search or filter</td></tr>
                    ) : (
                      filteredPincodes.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-gray-800">{item.pincode}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 font-medium capitalize">{item.city}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500 font-semibold">{item.state}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 font-semibold">{item.customersCount}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 font-bold">{item.orderCount}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-gray-900">{currency}{item.totalSales.toFixed(2)}</td>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 text-blue-500 rounded-xl">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Unique Buyers</p>
                <h4 className="text-2xl font-black text-gray-900">{analytics.customers.length}</h4>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
                <BadgeCheck size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Luxe Members</p>
                <h4 className="text-2xl font-black text-gray-900">{analytics.customers.filter(c => c.isLuxe).length}</h4>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-pink-50 text-pink-500 rounded-xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Avg. Orders / Customer</p>
                <h4 className="text-2xl font-black text-gray-900">
                  {analytics.customers.length ? (orders.length / analytics.customers.length).toFixed(1) : 0}
                </h4>
              </div>
            </div>
          </div>

          {/* Table Header & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={16} className="text-pink-500" /> Buyer Order Frequency & Product Preferences
            </h4>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by name, email, or product..."
                value={buyerSearch}
                onChange={(e) => setBuyerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Buyers Detailed Table */}
          <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <SortHeader label="Buyer Identity" sortKey="name" currentSort={buyerSort} onSort={(k) => handleSort(k, buyerSort, setBuyerSort)} />
                  <SortHeader label="Order Count (Frequency)" sortKey="orderCount" currentSort={buyerSort} onSort={(k) => handleSort(k, buyerSort, setBuyerSort)} />
                  <SortHeader label="Total Spend" sortKey="totalSpent" currentSort={buyerSort} onSort={(k) => handleSort(k, buyerSort, setBuyerSort)} />
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Products Ordered & Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filteredBuyers.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-10 text-center text-xs text-gray-400 font-bold uppercase">No buyers found</td></tr>
                ) : (
                  filteredBuyers.map((customer, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-pink-50 rounded-xl flex items-center justify-center font-black text-pink-600 text-sm uppercase">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                              {customer.name}
                              {customer.isLuxe && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[8px] font-black rounded uppercase border border-amber-200">Luxe</span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-bold">
                        {customer.orderCount} order{customer.orderCount > 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-gray-950">
                        {currency}{customer.totalSpent.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-2">
                          {Object.values(customer.products).map((prod, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100 w-full max-w-md">
                              <img src={prod.image} className="w-8 h-8 object-cover rounded-lg border shadow-sm" alt="" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-gray-800 truncate">{prod.name}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">SKU: {prod.sku}</p>
                              </div>
                              <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg font-black whitespace-nowrap">
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
        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-red-50 text-red-500 rounded-xl">
                <RefreshCcw size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Returns Processed</p>
                <h4 className="text-2xl font-black text-gray-900">{analytics.returns.length}</h4>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-xl">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Refunded Capital</p>
                <h4 className="text-2xl font-black text-gray-900">
                  {currency}{analytics.returns.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                </h4>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-purple-50 text-purple-500 rounded-xl">
                <Map size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Affected Return States</p>
                <h4 className="text-2xl font-black text-gray-900">{analytics.returnStates.length}</h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Returns by State */}
            <div className="lg:col-span-4 space-y-4">
              <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Map size={16} className="text-pink-500" /> Returns by State
              </h4>
              <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">State</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Return Count</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {analytics.returnStates.length === 0 ? (
                      <tr><td colSpan="3" className="px-6 py-8 text-center text-xs text-gray-400 font-bold uppercase">No state returns</td></tr>
                    ) : (
                      analytics.returnStates.map((item, idx) => (
                        <tr 
                          key={idx}
                          onClick={() => setReturnStateFilter(returnStateFilter === item.state ? '' : item.state)}
                          className={`hover:bg-red-50/20 cursor-pointer transition-colors ${returnStateFilter === item.state ? 'bg-red-50/50 border-l-4 border-l-red-500' : ''}`}
                        >
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-gray-800">{item.state}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-red-600 font-bold">{item.count} returns</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-gray-900">{currency}{item.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Return Requests Log */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCcw size={16} className="text-pink-500" /> Returned Order details
                  </h4>
                  {returnStateFilter && (
                    <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                      State: {returnStateFilter}
                      <button onClick={() => setReturnStateFilter('')} className="hover:text-red-900 ml-1">×</button>
                    </span>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search log by ID, name, SKU, coupon..."
                      value={returnSearch}
                      onChange={(e) => setReturnSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm max-h-[500px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50 sticky top-0 z-10">
                    <tr>
                      <SortHeader label="Return Date" sortKey="date" currentSort={returnSort} onSort={(k) => handleSort(k, returnSort, setReturnSort)} />
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Details</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Buyer Info</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">State & Pin</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU & Item Details</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Coupon Used</th>
                      <SortHeader label="Refund Amount" sortKey="amount" currentSort={returnSort} onSort={(k) => handleSort(k, returnSort, setReturnSort)} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredReturns.length === 0 ? (
                      <tr><td colSpan="7" className="px-6 py-10 text-center text-xs text-gray-400 font-bold uppercase">No return records found</td></tr>
                    ) : (
                      filteredReturns.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 font-semibold">{formatDate(item.date)}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-gray-900">#{item.orderId.slice(-8).toUpperCase()}</td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <p className="text-xs font-bold text-gray-800">{item.userName}</p>
                            <p className="text-[10px] text-gray-400 font-semibold">{item.email}</p>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <p className="text-xs font-bold text-gray-800">{item.state}</p>
                            <p className="text-[10px] text-gray-400 font-semibold">{item.pincode}</p>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col gap-1">
                              {item.items.map((prod, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-1.5 text-[10px]">
                                  <span className="font-bold text-gray-800 bg-gray-100 px-1 py-0.5 rounded">SKU: {prod.sku}</span>
                                  <span className="text-gray-500 truncate max-w-40 font-medium">({prod.name})</span>
                                  <span className="text-gray-600 font-bold ml-auto">x{prod.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs">
                            {item.couponUsed !== 'None' ? (
                              <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black rounded border border-green-200">
                                {item.couponUsed}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-medium">None</span>
                            )}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-red-600">
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
        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-orange-50 text-orange-500 rounded-xl">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Active Refund Requests</p>
                <h4 className="text-2xl font-black text-gray-900">{analytics.refunds.length}</h4>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Requested Refund Capital</p>
                <h4 className="text-2xl font-black text-gray-900">
                  {currency}{analytics.refunds.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                </h4>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-indigo-50 text-indigo-500 rounded-xl">
                <Map size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Affected Request States</p>
                <h4 className="text-2xl font-black text-gray-900">{analytics.refundStates.length}</h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Requests by State */}
            <div className="lg:col-span-4 space-y-4">
              <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Map size={16} className="text-pink-500" /> Requests by State
              </h4>
              <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">State</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Request Count</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {analytics.refundStates.length === 0 ? (
                      <tr><td colSpan="3" className="px-6 py-8 text-center text-xs text-gray-400 font-bold uppercase">No active requests</td></tr>
                    ) : (
                      analytics.refundStates.map((item, idx) => (
                        <tr 
                          key={idx}
                          onClick={() => setRefundStateFilter(refundStateFilter === item.state ? '' : item.state)}
                          className={`hover:bg-orange-50/20 cursor-pointer transition-colors ${refundStateFilter === item.state ? 'bg-orange-50/50 border-l-4 border-l-orange-500' : ''}`}
                        >
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-gray-800">{item.state}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-orange-600 font-bold">{item.count} request{item.count > 1 ? 's' : ''}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-gray-900">{currency}{item.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Refund Requests Log */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={16} className="text-pink-500" /> Pending refund request details
                  </h4>
                  {refundStateFilter && (
                    <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                      State: {refundStateFilter}
                      <button onClick={() => setRefundStateFilter('')} className="hover:text-orange-900 ml-1">×</button>
                    </span>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search log by ID, name, SKU, coupon..."
                      value={refundSearch}
                      onChange={(e) => setRefundSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm max-h-[500px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50 sticky top-0 z-10">
                    <tr>
                      <SortHeader label="Request Date" sortKey="date" currentSort={refundSort} onSort={(k) => handleSort(k, refundSort, setRefundSort)} />
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Details</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Buyer Info</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">State & Pin</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU & Item Details</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Coupon Used</th>
                      <SortHeader label="Requested Refund" sortKey="amount" currentSort={refundSort} onSort={(k) => handleSort(k, refundSort, setRefundSort)} />
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredRefunds.length === 0 ? (
                      <tr><td colSpan="8" className="px-6 py-10 text-center text-xs text-gray-400 font-bold uppercase">No pending requests found</td></tr>
                    ) : (
                      filteredRefunds.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 font-semibold">{formatDate(item.date)}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-gray-900">#{item.orderId.slice(-8).toUpperCase()}</td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <p className="text-xs font-bold text-gray-800">{item.userName}</p>
                            <p className="text-[10px] text-gray-400 font-semibold">{item.email}</p>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <p className="text-xs font-bold text-gray-800">{item.state}</p>
                            <p className="text-[10px] text-gray-400 font-semibold">{item.pincode}</p>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col gap-1">
                              {item.items.map((prod, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-1.5 text-[10px]">
                                  <span className="font-bold text-gray-800 bg-gray-100 px-1 py-0.5 rounded">SKU: {prod.sku}</span>
                                  <span className="text-gray-500 truncate max-w-40 font-medium">({prod.name})</span>
                                  <span className="text-gray-600 font-bold ml-auto">x{prod.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs">
                            {item.couponUsed !== 'None' ? (
                              <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black rounded border border-green-200">
                                {item.couponUsed}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-medium">None</span>
                            )}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs font-black text-amber-600">
                            {currency}{item.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs capitalize font-bold text-gray-600">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-[10px] uppercase font-black">
                              {item.status}
                            </span>
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
    </div>
  )
}

export default Orders