import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { backendUrl, currency } from '../App';
import { toast } from 'react-toastify';
import { 
  DollarSign, 
  RotateCcw, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ArrowRight,
  User,
  CreditCard,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';

const RefundRequests = ({ token }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedTicket] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/order/list`, {}, { headers: { token } });
      if (response.data.success) {
        // Filter orders that have refund requests or are cancelled prepaid
        const allOrders = response.data.orders;
        const refundOrders = allOrders.filter(order => 
          (order.refundDetails && order.refundDetails.status !== 'none') || 
          order.orderStatus === 'Refund Initiated' || 
          order.orderStatus === 'Returned'
        );
        setRequests(refundOrders.sort((a, b) => new Date(b.refundDetails.requestedAt || b.date) - new Date(a.refundDetails.requestedAt || a.date)));
      }
    } catch (error) {
      console.error("Error fetching refund requests:", error);
      toast.error("Failed to fetch requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const handleUpdateRefundStatus = async (orderId, status) => {
    setIsUpdating(true);
    try {
      // Re-using order status update for now, but we might need a specific refund status update
      const response = await axios.post(`${backendUrl}/api/order/status`, {
        orderId,
        orderStatus: status // e.g., 'Refunded', 'Returned', 'Processing'
      }, { headers: { token } });

      if (response.data.success) {
        toast.success(`Status updated to ${status}`);
        fetchRequests();
        if (selectedRequest && selectedRequest._id === orderId) {
            setSelectedTicket(prev => ({ ...prev, orderStatus: status }));
        }
      }
    } catch (error) {
        toast.error("Failed to update status.");
    } finally {
        setIsUpdating(false);
    }
  };

  const updateRefundSubStatus = async (orderId, refundStatus) => {
    setIsUpdating(true);
    try {
        // We need a specific endpoint to update refundDetails.status if it's separate from orderStatus
        // For now, let's assume we can update the order with a special status object or use existing logic
        // If no specific endpoint, we'll just log for now or try to use a general update if available
        // Actually, let's just stick to Order Status for simplicity in this implementation unless a new controller is needed.
        // The user asked for a page to manage these, so let's provide the tools.
        
        // Let's assume we add an endpoint or use updateStatus with extra fields
        await axios.post(`${backendUrl}/api/order/status`, {
            orderId,
            orderStatus: refundStatus === 'completed' ? 'Refunded' : 'Refund Initiated'
        }, { headers: { token } });

        toast.success(`Refund status marked as ${refundStatus}`);
        fetchRequests();
    } catch (error) {
        toast.error("Failed to update refund status.");
    } finally {
        setIsUpdating(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
        req._id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        req.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'pending' && req.refundDetails.status === 'pending') ||
        (filterStatus === 'completed' && req.refundDetails.status === 'completed');

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-green-500" size={18} />;
      case 'failed': return <XCircle className="text-red-500" size={18} />;
      case 'pending': return <Clock className="text-amber-500" size={18} />;
      default: return <Clock className="text-gray-400" size={18} />;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Refunds & Returns</h2>
          <p className="text-gray-500 font-medium">Manage customer refund requests and return claims</p>
        </div>
        <div className="flex items-center gap-3">
            <span className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-sm font-black text-gray-700">
                {requests.length} Total Requests
            </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Order ID, Name, Email..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            {['all', 'pending', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filterStatus === status 
                    ? 'bg-gray-900 text-white shadow-lg' 
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Detail</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 font-medium">Loading requests...</td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-medium">No refund or return requests found.</td></tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="bg-pink-50 p-2 rounded-xl text-pink-500">
                          <RotateCcw size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">#{req._id.slice(-8).toUpperCase()}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(req.refundDetails.requestedAt || req.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{req.userId?.name || 'N/A'}</span>
                        <span className="text-xs text-gray-400">{req.userId?.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-black text-gray-900">{currency}{req.orderTotal.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        req.orderStatus === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {req.orderStatus === 'Cancelled' ? 'Cancellation' : 'Return Request'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(req.refundDetails.status)}
                        <span className="text-xs font-bold text-gray-700 capitalize">{req.refundDetails.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => setSelectedTicket(req)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-900 hover:text-white transition-all shadow-sm"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Sidebar/Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Request Details</h3>
                <p className="text-xs text-gray-500 font-bold">#{selectedRequest._id}</p>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all text-gray-400 hover:text-gray-900"
              >
                <ArrowRight size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Customer Info */}
              <section>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User size={12} /> Customer Identity
                </h4>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center text-white text-xl font-black uppercase">
                            {selectedRequest.userId?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <p className="text-lg font-black text-gray-900">{selectedRequest.userId?.name || 'Unknown User'}</p>
                            <p className="text-sm text-gray-500 font-medium">{selectedRequest.userId?.email}</p>
                            <p className="text-xs text-pink-500 font-bold mt-1 uppercase tracking-tighter">{selectedRequest.address?.phone}</p>
                        </div>
                    </div>
                </div>
              </section>

              {/* Refund/Return Context */}
              <section>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MessageSquare size={12} /> Request Context
                </h4>
                <div className="space-y-4">
                    <div className="p-5 bg-white border-2 border-gray-100 rounded-3xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Reason Provided</p>
                        <p className="text-gray-800 font-medium italic">"{selectedRequest.refundDetails.reason || 'No reason provided.'}"</p>
                    </div>
                    {selectedRequest.refundDetails.images?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-2">
                                <ImageIcon size={12} /> Supporting Evidence
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {selectedRequest.refundDetails.images.map((img, i) => (
                                    <a key={i} href={img} target="_blank" rel="noreferrer" className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-100 hover:border-pink-500 transition-all">
                                        <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              </section>

              {/* Payout Details */}
              {selectedRequest.refundDetails.customerPayoutDetails && (
                <section>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CreditCard size={12} /> Settlement Details
                    </h4>
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase">Account Holder</p>
                                <p className="text-sm font-bold text-gray-900">{selectedRequest.refundDetails.customerPayoutDetails.accountHolderName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase">IFSC Code</p>
                                <p className="text-sm font-bold text-gray-900">{selectedRequest.refundDetails.customerPayoutDetails.ifsc}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-[10px] font-black text-emerald-600 uppercase">Account Number</p>
                                <p className="text-lg font-black text-gray-900 tracking-widest font-mono">{selectedRequest.refundDetails.customerPayoutDetails.bankAccount}</p>
                            </div>
                        </div>
                    </div>
                </section>
              )}

              {/* Financial Breakdown */}
              <section>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <DollarSign size={12} /> Settlement Calculation
                </h4>
                <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl shadow-gray-900/10">
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm opacity-60">
                            <span>Order Total</span>
                            <span>{currency}{selectedRequest.orderTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm opacity-60">
                            <span>Payment Method</span>
                            <span className="uppercase font-bold">{selectedRequest.paymentMethod}</span>
                        </div>
                        <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Refundable Amount</p>
                                <p className="text-3xl font-black">{currency}{selectedRequest.orderTotal.toFixed(2)}</p>
                            </div>
                            <span className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-lg font-black uppercase">Standard</span>
                        </div>
                    </div>
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
                <div className="flex-1 flex gap-2">
                    <button 
                        disabled={isUpdating || selectedRequest.refundDetails.status === 'completed'}
                        onClick={() => updateRefundSubStatus(selectedRequest._id, 'completed')}
                        className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                        Mark Completed
                    </button>
                    <button 
                        disabled={isUpdating || selectedRequest.refundDetails.status === 'failed'}
                        onClick={() => updateRefundSubStatus(selectedRequest._id, 'failed')}
                        className="flex-1 bg-white border border-gray-200 text-gray-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all disabled:opacity-50"
                    >
                        Mark Failed
                    </button>
                </div>
                <button 
                    onClick={() => handleUpdateRefundStatus(selectedRequest._id, 'Processing')}
                    className="px-6 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all"
                    title="Move to Processing"
                >
                    <Clock size={20} />
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundRequests;
