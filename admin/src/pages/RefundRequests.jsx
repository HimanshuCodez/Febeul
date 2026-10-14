import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App';
import RefundRequestList from '../components/returns/RefundRequestList';
import { categoryOf, isCancellation } from '../utils/requestCategory';

const RefundRequests = ({ token }) => {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/refund/list`, {}, { headers: { token } });
      if (data.success) {
        setAllOrders(data.orders || []);
      } else {
        toast.error(data.message || 'Failed to fetch requests.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch requests.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Include paid and unpaid cancellations so every cancellation has a visible history.
  const requests = useMemo(() => allOrders.filter((order) =>
    isCancellation(order) || (categoryOf(order) === null && (
      (order.refundDetails?.status && order.refundDetails.status !== 'none') ||
      ['Refund Initiated', 'Refunded'].includes(order.orderStatus)
    ))
  ).sort((a, b) => new Date(b.refundDetails?.requestedAt || b.date) - new Date(a.refundDetails?.requestedAt || a.date)), [allOrders]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <RefundRequestList token={token} requests={requests} allOrders={allOrders} loading={loading} onRefresh={fetchRequests} showPendingAge description="Cancellation history, automatic refunds, and refund requests" />
    </div>
  );
};

export default RefundRequests;
