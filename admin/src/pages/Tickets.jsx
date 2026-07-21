import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App';
import { assets } from '../assets/assets'; // Assuming icons like parcel_icon, order_icon are useful
import { Paperclip, X, Download, CalendarRange, ShieldAlert, LifeBuoy, PhoneCall, Unlock } from 'lucide-react'; // Import Paperclip, X, Download, and CalendarRange
import { CSVLink } from 'react-csv';

const StatusBadge = ({ status, style }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize border ${style.badge}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} /> {status}
  </span>
);

const Tickets = ({ token }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets', 'appeals'
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'open', 'closed', 'pending'
  const [searchTerm, setSearchTerm] = useState(''); // New state for search
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adminMessage, setAdminMessage] = useState(''); // New state for admin message
  const [adminAttachments, setAdminAttachments] = useState([]); // New state for admin chat attachments
  const [isSending, setIsSending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const adminFileInputRef = useRef(null); // Ref for admin file input

  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/ticket/list`, { headers: { token } });
      if (response.data.success) {
        setTickets(response.data.tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to fetch tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    if (!token) return;
    try {
      const response = await axios.post(`${backendUrl}/api/ticket/update-status`, { ticketId, status: newStatus }, { headers: { token } });
      if (response.data.success) {
        toast.success('Ticket status updated!');
        fetchTickets(); // Refresh tickets
        if (selectedTicket && selectedTicket._id === ticketId) {
          setSelectedTicket((prev) => ({ ...prev, status: newStatus }));
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update ticket status.');
    }
  };

  const handleUnblockUser = async (userId) => {
    if (!token || !userId || isUnblocking) return;
    setIsUnblocking(true);
    try {
      const response = await axios.post(`${backendUrl}/api/admin/toggle-block`, { userId }, { headers: { token } });
      if (response.data.success) {
        toast.success(response.data.message);
        setSelectedTicket((prev) => prev ? ({ ...prev, user: { ...prev.user, isBlocked: response.data.isBlocked } }) : prev);
        fetchTickets();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to update block status.');
    } finally {
      setIsUnblocking(false);
    }
  };

  const sendAdminReply = async (ticketId) => {
    if (!adminMessage.trim() && adminAttachments.length === 0) return; // Allow sending only attachments
    if (isSending) return;
    if (!token) {
      toast.error("Authentication token missing.");
      return;
    }

    setIsSending(true);
    const replyFormData = new FormData();
    replyFormData.append("ticketId", ticketId);
    replyFormData.append("message", adminMessage);
    replyFormData.append("sender", 'admin');
    adminAttachments.forEach((file) => {
        replyFormData.append("images", file);
    });

    try {
      const response = await axios.post(`${backendUrl}/api/ticket/admin-reply`,
        replyFormData,
        {
          headers: {
            token: token,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success("Reply sent!");
        // Update the messages in the selected ticket locally
        setSelectedTicket(prev => {
          const newMsgImages = response.data.newImages || []; // Assuming backend returns URLs of uploaded images
          const newMessage = {
            message: adminMessage,
            sender: 'admin',
            createdAt: new Date().toISOString(),
            images: newMsgImages, // Store image URLs
          };
          return {
            ...prev,
            messages: [...prev.messages, newMessage]
          };
        });
        setAdminMessage(''); // Clear the input field
        setAdminAttachments([]); // Clear attachments
        if (adminFileInputRef.current) {
            adminFileInputRef.current.value = ""; // Clear file input
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Failed to send reply.");
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleAdminAttachmentsChange = (e) => {
    const files = Array.from(e.target.files);
    setAdminAttachments((prev) => {
        const newAttachments = [...prev, ...files].slice(0, 2); // Limit to max 2 attachments for chat replies
        return newAttachments;
    });
    e.target.value = ''; // Clear file input after selection
  };

  const handleRemoveAdminAttachment = (indexToRemove) => {
      setAdminAttachments((prev) =>
          prev.filter((_, index) => index !== indexToRemove)
      );
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const appealsCount = tickets.filter((t) => t.type === 'appeal').length;

  const filteredTickets = tickets.filter((ticket) => {
    const matchesTab = activeTab === 'appeals' ? ticket.type === 'appeal' : ticket.type !== 'appeal';
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const userName = ticket.user?.name?.toLowerCase() || '';
    const userEmail = ticket.user?.email?.toLowerCase() || '';
    const ticketId = String(ticket.ticketNumber || ticket._id?.slice(-6) || ''); // Support new and old tickets
    const matchesSearch = userName.includes(searchTerm.toLowerCase()) || userEmail.includes(searchTerm.toLowerCase()) || ticketId.toLowerCase().includes(searchTerm.toLowerCase());

    const ticketTime = new Date(ticket.createdAt).getTime();
    const matchesStart = !startDate || ticketTime >= new Date(startDate).setHours(0, 0, 0, 0);
    const matchesEnd = !endDate || ticketTime <= new Date(endDate).setHours(23, 59, 59, 999);

    return matchesTab && matchesStatus && matchesSearch && matchesStart && matchesEnd;
  });

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, startDate, endDate, activeTab]);

  const STATUS_STYLES = {
    open: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    pending: { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    closed: { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  };
  const getStatusStyle = (status) => STATUS_STYLES[status] || { badge: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-400' };

  // CSV Export Data
  const csvHeaders = [
    { label: "Ticket ID", key: "ticketNumber" },
    { label: "Type", key: "type" },
    { label: "Subject", key: "subject" },
    { label: "Customer Name", key: "customerName" },
    { label: "Customer Email", key: "customerEmail" },
    { label: "Luxe Member", key: "isLuxeMember" },
    { label: "Status", key: "status" },
    { label: "Created At", key: "createdAt" },
    { label: "Updated At", key: "updatedAt" },
    { label: "Description", key: "description" },
    { label: "Contact Info", key: "contactInfo" },
    { label: "Messages", key: "messages" },
  ];

  const csvData = filteredTickets.map(ticket => ({
    ticketNumber: ticket.ticketNumber || ticket._id?.slice(-6),
    type: ticket.type === 'appeal' ? 'Block Appeal' : 'Support',
    subject: ticket.subject,
    customerName: ticket.user?.name || 'N/A',
    customerEmail: ticket.user?.email || 'N/A',
    isLuxeMember: ticket.user?.isLuxeMember ? 'Yes' : 'No',
    status: ticket.status,
    createdAt: new Date(ticket.createdAt).toLocaleString(),
    updatedAt: new Date(ticket.updatedAt || ticket.createdAt).toLocaleString(),
    description: ticket.description,
    contactInfo: ticket.contactInfo || 'Not provided',
    messages: ticket.messages?.map(m => `[${m.sender}] ${m.message}`).join(' | ') || '',
  }));

  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <h2 className='text-2xl sm:text-3xl font-semibold text-gray-800 mb-5 sm:mb-6'>Support Tickets</h2>

      {/* Section Tabs */}
      <div className='flex gap-1 sm:gap-2 mb-6 border-b border-gray-200 overflow-x-auto'>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'tickets' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <LifeBuoy size={16} /> Support Tickets
        </button>
        <button
          onClick={() => setActiveTab('appeals')}
          className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'appeals' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <ShieldAlert size={16} /> Appeals
          {appealsCount > 0 && (
            <span className='bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full'>{appealsCount}</span>
          )}
        </button>
      </div>

      {/* Filter and Search */}
      <div className='mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'>
        <div className='grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto'>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${filterStatus === 'all' ? 'bg-pink-500 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('open')}
            className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${filterStatus === 'open' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          >
            Open
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('closed')}
            className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${filterStatus === 'closed' ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          >
            Closed
          </button>
        </div>

        <div className='flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto'>
          <input
            type="text"
            placeholder="Search by customer name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 w-full sm:w-56"
          />
          <div className={`flex items-center justify-between sm:justify-start gap-2 rounded-md px-3 py-2 border transition-colors w-full sm:w-auto ${(startDate || endDate) ? 'bg-pink-50 border-pink-300' : 'bg-white border-gray-300'}`}>
            <CalendarRange size={16} className={`shrink-0 ${(startDate || endDate) ? 'text-pink-500' : 'text-gray-400'}`} />
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer min-w-0 flex-1 sm:flex-none"
              aria-label="From date"
            />
            <span className="text-gray-300 text-xs font-bold shrink-0">→</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer min-w-0 flex-1 sm:flex-none"
              aria-label="To date"
            />
            {(startDate || endDate) && (
              <button onClick={clearDateFilter} title="Clear date filter" className="text-pink-400 hover:text-red-500 transition-colors shrink-0">
                <X size={14} />
              </button>
            )}
          </div>
          <div className='flex gap-2'>
            <button
              onClick={fetchTickets}
              className="flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Refresh
            </button>
            <CSVLink
              data={csvData}
              headers={csvHeaders}
              filename={`tickets_export_${new Date().toISOString().split('T')[0]}.csv`}
              className="flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={16} />
              <span className='hidden sm:inline'>Export All</span>
              <span className='sm:hidden'>Export</span>
            </CSVLink>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 mb-8'>
        <div className='flex flex-wrap justify-between items-center gap-2 mb-5 sm:mb-6'>
          <h3 className='text-lg sm:text-xl font-bold text-gray-700'>{activeTab === 'appeals' ? 'Block Appeals' : 'All Tickets'} ({filteredTickets.length})</h3>
          {totalPages > 1 && (
            <span className='text-xs sm:text-sm text-gray-500 font-medium'>Page {currentPage} of {totalPages}</span>
          )}
        </div>
        {loading ? (
          <p className='text-gray-500 text-sm'>Loading tickets...</p>
        ) : filteredTickets.length === 0 ? (
          <div className='text-center py-14 bg-gray-50/60 rounded-xl border border-dashed border-gray-200'>
            <LifeBuoy className='mx-auto text-gray-300 mb-3' size={32} />
            <p className='text-sm font-semibold text-gray-500'>No tickets found for the selected filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className='hidden md:block overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>ID</th>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Subject</th>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Customer</th>
                    {activeTab === 'appeals' && (
                      <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Phone</th>
                    )}
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Status</th>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Last Updated</th>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Actions</th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {paginatedTickets.map((ticket) => (
                    <tr key={ticket._id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{ticket.ticketNumber || ticket._id.slice(-6)}</td>
                      <td className='px-6 py-4 max-w-[220px] truncate text-sm text-gray-500'>{ticket.subject}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        <div className='flex flex-col gap-1'>
                          <span className='font-medium text-gray-900'>{ticket.user?.name || 'N/A'}</span>
                          <span className='text-xs'>{ticket.user?.email}</span>
                          {ticket.user?.isLuxeMember && (
                            <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider w-fit'>
                              <span className='w-1 h-1 bg-amber-500 rounded-full mr-1 animate-pulse'></span>
                              Luxe Member
                            </span>
                          )}
                        </div>
                      </td>
                      {activeTab === 'appeals' && (
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium'>
                          {ticket.appealDetails?.phone || ticket.contactInfo || 'N/A'}
                        </td>
                      )}
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <StatusBadge status={ticket.status} style={getStatusStyle(ticket.status)} />
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className='text-indigo-600 hover:text-indigo-900 font-semibold'
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className='md:hidden space-y-3'>
              {paginatedTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  onClick={() => setSelectedTicket(ticket)}
                  className='border border-gray-200 rounded-xl p-4 space-y-2.5 active:bg-gray-50 cursor-pointer'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-xs font-bold text-gray-400'>#{ticket.ticketNumber || ticket._id.slice(-6)}</span>
                    <StatusBadge status={ticket.status} style={getStatusStyle(ticket.status)} />
                  </div>
                  <p className='text-sm font-bold text-gray-800 line-clamp-2'>{ticket.subject}</p>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-gray-700 truncate'>{ticket.user?.name || 'N/A'}</p>
                      <p className='text-xs text-gray-400 truncate'>{ticket.user?.email}</p>
                    </div>
                    <p className='text-xs text-gray-400 font-medium shrink-0'>{new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                  {ticket.user?.isLuxeMember && (
                    <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider w-fit'>
                      <span className='w-1 h-1 bg-amber-500 rounded-full mr-1 animate-pulse'></span>
                      Luxe Member
                    </span>
                  )}
                  {activeTab === 'appeals' && (
                    <p className='text-xs text-gray-600 font-semibold flex items-center gap-1.5'>
                      <PhoneCall size={12} className='text-gray-400' /> {ticket.appealDetails?.phone || ticket.contactInfo || 'N/A'}
                    </p>
                  )}
                  <button className='text-indigo-600 text-xs font-bold pt-1'>View Details →</button>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className='flex justify-center items-center gap-1.5 sm:gap-2 mt-8 flex-wrap'>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className='px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-md text-xs sm:text-sm font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors'
                >
                  Previous
                </button>

                <div className='hidden sm:flex gap-1'>
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-md text-sm font-bold transition-all ${currentPage === pageNum ? 'bg-pink-500 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className='flex items-end px-1 text-gray-400 font-bold'>...</span>;
                    }
                    return null;
                  })}
                </div>
                <span className='sm:hidden text-xs font-bold text-gray-500 px-2'>{currentPage} / {totalPages}</span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className='px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-md text-xs sm:text-sm font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors'
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ticket Details Modal/Panel */}
      {selectedTicket && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4'>
          <div className='bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto'>
            <div className='p-4 sm:p-6 border-b flex justify-between items-start sm:items-center gap-3 sticky top-0 bg-white z-10 rounded-t-2xl'>
              <div className='min-w-0'>
                <h3 className='text-base sm:text-2xl font-bold text-gray-800 break-words'>
                  Ticket #{selectedTicket.ticketNumber || selectedTicket._id.slice(-6)}
                </h3>
                <p className='text-xs sm:text-sm text-gray-500 font-medium mt-0.5 line-clamp-2'>{selectedTicket.subject}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className='shrink-0 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold transition-colors'>&times;</button>
            </div>
            <div className='p-4 sm:p-6 space-y-4'>
              <div className='flex flex-col sm:flex-row justify-between items-start gap-3'>
                <div>
                  <p className='text-sm font-medium text-gray-700'>Customer:</p>
                  <p className='text-base text-gray-900 font-bold'>{selectedTicket.user?.name || 'N/A'}</p>
                  <p className='text-xs text-gray-500 break-all'>{selectedTicket.user?.email}</p>
                </div>
                {selectedTicket.user?.isLuxeMember && (
                  <div className='flex flex-col items-start sm:items-end'>
                    <span className='px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm flex items-center gap-1.5 uppercase tracking-widest'>
                      <span className='w-2 h-2 bg-amber-500 rounded-full animate-ping'></span>
                      Luxe Priority
                    </span>
                    <span className='text-[10px] text-amber-600 font-semibold mt-1'>High Priority Support</span>
                  </div>
                )}
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <p className='text-sm font-medium text-gray-700'>Status:</p>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket._id, e.target.value)}
                    className='mt-1 p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500 w-full'
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-700'>Created At:</p>
                  <p className='mt-2.5 text-sm text-gray-600 font-medium'>{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {selectedTicket.type === 'appeal' && (
                <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='text-sm font-bold text-amber-800 flex items-center gap-1.5'>
                      <ShieldAlert size={16} /> Block Appeal
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${selectedTicket.user?.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {selectedTicket.user?.isBlocked ? 'Currently Blocked' : 'Currently Active'}
                    </span>
                  </div>
                  <div className='grid grid-cols-3 gap-2 sm:gap-3 text-center'>
                    <div>
                      <p className='text-[9px] sm:text-[10px] font-black text-amber-600 uppercase tracking-widest'>Blocked At</p>
                      <p className='text-[11px] sm:text-xs font-bold text-amber-900 mt-1'>
                        {selectedTicket.appealDetails?.blockedAt || selectedTicket.user?.blockedAt ? new Date(selectedTicket.appealDetails?.blockedAt || selectedTicket.user?.blockedAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div>
                      <p className='text-[9px] sm:text-[10px] font-black text-amber-600 uppercase tracking-widest'>Last Active</p>
                      <p className='text-[11px] sm:text-xs font-bold text-amber-900 mt-1'>
                        {selectedTicket.appealDetails?.activeAt || selectedTicket.user?.activeAt ? new Date(selectedTicket.appealDetails?.activeAt || selectedTicket.user?.activeAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div>
                      <p className='text-[9px] sm:text-[10px] font-black text-amber-600 uppercase tracking-widest'>Appealed On</p>
                      <p className='text-[11px] sm:text-xs font-bold text-amber-900 mt-1'>{new Date(selectedTicket.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-1.5 text-sm text-amber-900 font-semibold bg-white/70 rounded-md px-3 py-2 border border-amber-100'>
                    <PhoneCall size={14} className='shrink-0 text-amber-500' /> <span className='truncate'>{selectedTicket.appealDetails?.phone || selectedTicket.contactInfo || 'Not provided'}</span>
                  </div>
                  {selectedTicket.user?.isBlocked && (
                    <button
                      onClick={() => handleUnblockUser(selectedTicket.user._id)}
                      disabled={isUnblocking}
                      className='w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-md font-bold text-sm hover:bg-emerald-700 transition-colors disabled:bg-emerald-300 disabled:cursor-not-allowed'
                    >
                      {isUnblocking ? (
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white' />
                      ) : (
                        <Unlock size={16} />
                      )}
                      {isUnblocking ? 'Unblocking...' : 'Unblock User'}
                    </button>
                  )}
                </div>
              )}

              <div>
                <p className='text-sm font-medium text-gray-700 border-b pb-1 mb-2'>Contact Info:</p>
                <div className='bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-800 text-sm mb-4'>
                  {selectedTicket.contactInfo || 'Not provided'}
                </div>
                <p className='text-sm font-medium text-gray-700 border-b pb-1 mb-2'>Description:</p>
                <div className='bg-gray-50 p-3 rounded-lg border border-gray-100 italic text-gray-800 text-sm'>
                  {selectedTicket.description}
                </div>
              </div>
              <div className='space-y-2'>
                <p className='text-sm font-medium text-gray-700'>Messages:</p>
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((msg, index) => (
                    <div key={index} className={`p-3 rounded-lg ${msg.sender === 'admin' ? 'bg-gray-100' : 'bg-blue-100 ml-auto'} max-w-[90%] sm:max-w-[80%] flex flex-col`}>
                      <span className='font-bold text-xs'>{msg.sender === 'admin' ? 'Admin' : selectedTicket.user?.name || 'Customer'}</span>
                      <p className='text-sm break-words'>{msg.message}</p>
                      {msg.images && msg.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                              {msg.images.map((imgSrc, imgIndex) => (
                                  <a key={imgIndex} href={imgSrc} target="_blank" rel="noopener noreferrer">
                                      <img src={imgSrc} alt={`Attachment ${imgIndex + 1}`} className="w-16 h-16 object-cover rounded-md cursor-pointer" />
                                  </a>
                              ))}
                          </div>
                      )}
                      <span className='text-xs text-gray-500 self-end'>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className='text-sm text-gray-500'>No messages yet.</p>
                )}
              </div>
              {selectedTicket.status === 'closed' ? (
                <div className='mt-4 p-4 bg-gray-100 text-gray-700 rounded-md text-center'>
                  <p className='font-semibold'>Conversation is ended.</p>
                  <p>Please create a new ticket for further issues.</p>
                </div>
              ) : (
                <div className='flex flex-col gap-2 mt-4 pt-4 border-t border-gray-200'>
                    {/* Attachment previews for current message */}
                    {adminAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {adminAttachments.map((file, index) => (
                                <div key={index} className="relative w-20 h-20 border rounded-md overflow-hidden">
                                    <img src={URL.createObjectURL(file)} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAdminAttachment(index)}
                                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className='flex items-center gap-2'>
                        <input
                            type="file"
                            ref={adminFileInputRef}
                            accept="image/*"
                            multiple
                            onChange={handleAdminAttachmentsChange}
                            className="hidden" // Hide the actual file input
                            disabled={adminAttachments.length >= 2}
                        />
                        <button
                            type="button"
                            onClick={() => adminFileInputRef.current.click()}
                            className="bg-gray-200 text-gray-700 p-2 rounded-md hover:bg-gray-300 transition-colors"
                            title="Attach files"
                            disabled={adminAttachments.length >= 2}
                        >
                            <Paperclip size={20} />
                        </button>
                        <input
                            type="text"
                            value={adminMessage}
                            onChange={(e) => setAdminMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    sendAdminReply(selectedTicket._id);
                                }
                            }}
                            placeholder="Type your reply..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        />
                        <button
                            disabled={isSending}
                            onClick={() => sendAdminReply(selectedTicket._id)}
                            className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 transition-colors disabled:bg-pink-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[70px]"
                        >
                            {isSending ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                'Send'
                            )}
                        </button>
                    </div>
                </div>
              )}

              {selectedTicket.images && selectedTicket.images.length > 0 && (
                <div className='space-y-2 pt-4 border-t border-gray-200'>
                  <p className='text-sm font-medium text-gray-700'>Attached Images:</p>
                  <div className='flex flex-wrap gap-2'>
                    {selectedTicket.images.map((image, index) => (
                      <a key={index} href={image} target="_blank" rel="noopener noreferrer">
                        <img src={image} alt={`Ticket attachment ${index + 1}`} className='w-24 h-24 object-cover rounded-md border border-gray-200 cursor-pointer' />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
