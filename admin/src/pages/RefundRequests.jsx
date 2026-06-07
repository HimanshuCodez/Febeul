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
  const [selectedReason, setSelectedReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/order/list`, {}, { headers: { token } });
      if (response.data.success) {
        const allOrders = response.data.orders;
        const refundOrders = allOrders.filter(order => 
          (order.refundDetails && order.refundDetails.status !== 'none') || 
          ['Refund Initiated', 'Returned', 'Refunded'].includes(order.orderStatus)
        );
        setRequests(refundOrders.sort((a, b) => new Date(b.refundDetails.requestedAt || b.date) - new Date(a.refundDetails.requestedAt || a.date)));
      }
    } catch (error) {
      toast.error("Failed to fetch requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const handleApproveRefund = async (orderId) => {
    if (!window.confirm("Are you sure you want to approve and process this refund? This will trigger the payment gateway (Razorpay) for prepaid orders.")) return;
    
    setIsUpdating(true);
    try {
      const response = await axios.post(`${backendUrl}/api/refund/approve`, {
        orderId,
        returnReason: selectedReason || undefined
      }, { headers: { token } });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchRequests();
        setSelectedTicket(null);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve refund.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectRefund = async (orderId) => {
    if (!rejectionReason.trim()) {
        toast.error("Please provide a rejection reason.");
        return;
    }
    
    setIsUpdating(true);
    try {
      const response = await axios.post(`${backendUrl}/api/refund/reject`, {
        orderId,
        rejectionReason
      }, { headers: { token } });

      if (response.data.success) {
        toast.success("Request rejected successfully.");
        fetchRequests();
        setSelectedTicket(null);
        setRejectionReason('');
        setShowRejectForm(false);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Failed to reject.");
    } finally {
      setIsUpdating(false);
    }
  };

  const updateRefundSubStatus = async (orderId, refundStatus) => {
    setIsUpdating(true);
    try {
        await axios.post(`${backendUrl}/api/order/status`, {
            orderId,
            orderStatus: refundStatus === 'completed' ? 'Refunded' : 'Refund Initiated'
        }, { headers: { token } });
        toast.success(`Status marked as ${refundStatus}`);
        fetchRequests();
    } catch (error) {
        toast.error("Failed to update status.");
    } finally {
        setIsUpdating(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
        req._id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        req.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || req.refundDetails.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-green-500" size={18} />;
      case 'failed': return <XCircle className="text-red-500" size={18} />;
      case 'pending': return <Clock className="text-amber-500" size={18} />;
      case 'rejected': return <XCircle className="text-orange-500" size={18} />;
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
              placeholder="Search by Order ID, Name..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            {['all', 'pending', 'completed', 'rejected'].map((status) => (
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
                <tr><td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-medium">No requests found.</td></tr>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {req.userId?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">
                      {currency}{req.orderTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        req.orderStatus === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {req.orderStatus === 'Cancelled' ? 'Cancellation' : 'Return/Refund'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                        {getStatusIcon(req.refundDetails.status)}
                        <span className="text-xs font-bold text-gray-700 capitalize">{req.refundDetails.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => setSelectedTicket(req)} className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-900 hover:text-white transition-all shadow-sm">
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

      {selectedRequest && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Request Details</h3>
                <p className="text-xs text-gray-500 font-bold">#{selectedRequest._id}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all text-gray-400 hover:text-gray-900">
                <ArrowRight size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <section>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={12} /> Customer Identity</h4>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center text-white text-xl font-black uppercase">{selectedRequest.userId?.name?.charAt(0)}</div>
                    <div>
                        <p className="text-lg font-black text-gray-900">{selectedRequest.userId?.name}</p>
                        <p className="text-sm text-gray-500 font-medium">{selectedRequest.userId?.email}</p>
                    </div>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MessageSquare size={12} /> Request Context</h4>
                <div className="p-5 bg-white border-2 border-gray-100 rounded-3xl mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">User's Reason</p>
                    <p className="text-gray-800 font-medium italic">"{selectedRequest.refundDetails.reason || 'No reason provided.'}"</p>
                </div>
                {selectedRequest.refundDetails.images?.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                        {selectedRequest.refundDetails.images.map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noreferrer" className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-100 hover:border-pink-500 transition-all">
                                <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                            </a>
                        ))}
                    </div>
                )}
              </section>

              <section>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CreditCard size={12} /> Payment & Settlement</h4>
                {selectedRequest.paymentMethod === 'Razorpay' ? (
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase">Prepaid (Razorpay)</p>
                    <p className="text-sm font-bold text-gray-900">Payment ID: {selectedRequest.razorpayPaymentId || selectedRequest.paymentDetails?.razorpay_payment_id || 'N/A'}</p>
                    <p className="text-xs text-blue-500 italic">Refund will be processed back to original source via gateway.</p>
                  </div>
                ) : selectedRequest.refundDetails.customerPayoutDetails ? (
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-4">
                        <p className="text-[10px] font-black text-emerald-600 uppercase">COD Settlement Details</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-[10px] font-black text-emerald-600 uppercase">Holder</p><p className="text-sm font-bold">{selectedRequest.refundDetails.customerPayoutDetails.accountHolderName}</p></div>
                            <div><p className="text-[10px] font-black text-emerald-600 uppercase">IFSC</p><p className="text-sm font-bold">{selectedRequest.refundDetails.customerPayoutDetails.ifsc}</p></div>
                            <div className="col-span-2"><p className="text-[10px] font-black text-emerald-600 uppercase">Account</p><p className="text-lg font-black tracking-widest font-mono">{selectedRequest.refundDetails.customerPayoutDetails.bankAccount}</p></div>
                        </div>
                    </div>
                ) : <div className="p-6 border-2 border-dashed border-gray-200 rounded-3xl text-center text-xs text-gray-400 font-bold uppercase">No payout details provided.</div>}
              </section>

              <section>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={12} /> Settlement Amount</h4>
                <div className="bg-gray-900 text-white p-6 rounded-3xl">
                    <div className="flex justify-between items-end">
                        <div><p className="text-[10px] font-black uppercase opacity-50">Refundable Amount</p><p className="text-3xl font-black">{currency}{selectedRequest.orderTotal.toFixed(2)}</p></div>
                        <span className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-lg font-black uppercase">{selectedRequest.paymentMethod}</span>
                    </div>
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50 flex flex-col gap-4">
                {selectedRequest.refundDetails.status === 'pending' && (
                    <div className="flex flex-col gap-3 p-4 bg-white rounded-3xl border border-gray-200 shadow-sm">
                        {!showRejectForm ? (
                          <div className="flex gap-2">
                            <select value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none">
                                <option value="">Auto-calculate</option>
                                <option value="buyer_fault">Buyer Fault (-150)</option>
                                <option value="seller_fault">Seller Fault (Full)</option>
                                <option value="courier_fault">Courier Fault (Full)</option>
                            </select>
                            <button onClick={() => handleApproveRefund(selectedRequest._id)} disabled={isUpdating} className="bg-pink-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-pink-700 disabled:opacity-50">
                                {selectedRequest.paymentMethod === 'Razorpay' ? 'Pay & Refund' : 'Approve'}
                            </button>
                            <button onClick={() => setShowRejectForm(true)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600">Reject</button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <textarea placeholder="Reason for rejection (Customer will see this)..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-red-500" rows="2" />
                            <div className="flex gap-2">
                              <button onClick={() => handleRejectRefund(selectedRequest._id)} disabled={isUpdating} className="flex-1 bg-red-600 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest">Confirm Rejection</button>
                              <button onClick={() => { setShowRejectForm(false); setRejectionReason(''); }} className="px-4 bg-gray-100 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest">Cancel</button>
                            </div>
                          </div>
                        )}
                    </div>
                )}
                <div className="flex gap-2">
                    <button disabled={isUpdating || selectedRequest.refundDetails.status === 'completed'} onClick={() => updateRefundSubStatus(selectedRequest._id, 'completed')} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 disabled:opacity-50">Mark Completed (Manual)</button>
                    <button onClick={() => updateRefundSubStatus(selectedRequest._id, 'failed')} className="px-6 bg-gray-900 text-white rounded-2xl hover:bg-black"><XCircle size={20} /></button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundRequests;
