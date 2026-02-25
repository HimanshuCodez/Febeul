import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App';
import { assets } from '../assets/assets'; // Assuming icons like parcel_icon, order_icon are useful
import { Paperclip, X } from 'lucide-react'; // Import Paperclip and X

const Tickets = ({ token }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'open', 'closed', 'pending'
  const [searchTerm, setSearchTerm] = useState(''); // New state for search
  const [adminMessage, setAdminMessage] = useState(''); // New state for admin message
  const [adminAttachments, setAdminAttachments] = useState([]); // New state for admin chat attachments
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

  const sendAdminReply = async (ticketId) => {
    if (!adminMessage.trim() && adminAttachments.length === 0) return; // Allow sending only attachments
    if (!token) {
      toast.error("Authentication token missing.");
      return;
    }

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

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const userName = ticket.user?.name?.toLowerCase() || '';
    const userEmail = ticket.user?.email?.toLowerCase() || '';
    const ticketId = ticket._id?.toLowerCase() || '';
    const matchesSearch = userName.includes(searchTerm.toLowerCase()) || userEmail.includes(searchTerm.toLowerCase()) || ticketId.includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <h2 className='text-3xl font-semibold text-gray-800 mb-8'>Support Tickets</h2>

      {/* Filter and Search */}
      <div className='mb-6 flex flex-col md:flex-row justify-between items-center gap-4'>
        <div className='flex flex-wrap gap-4'>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${filterStatus === 'all' ? 'bg-pink-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('open')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${filterStatus === 'open' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
          >
            Open
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${filterStatus === 'pending' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('closed')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${filterStatus === 'closed' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
          >
            Closed
          </button>
        </div>
        
        <div className='flex gap-4 w-full md:w-auto'>
          <input
            type="text"
            placeholder="Search by customer name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 flex-1 md:w-64"
          />
          <button
            onClick={fetchTickets}
            className="px-4 py-2 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className='bg-white rounded-lg shadow-md p-8 mb-8'>
        <h3 className='text-xl font-bold text-gray-700 mb-6'>All Tickets</h3>
        {loading ? (
          <p>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p>No tickets found.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>ID</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Subject</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Customer</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Status</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Last Updated</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Actions</th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket._id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{ticket._id.slice(-6)}</td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>{ticket.subject}</td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>{ticket.user?.name || ticket.user?.email || 'N/A'}</td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)} capitalize`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className='text-indigo-600 hover:text-indigo-900'
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Details Modal/Panel */}
      {selectedTicket && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
            <div className='p-6 border-b flex justify-between items-center'>
              <h3 className='text-2xl font-bold text-gray-800'>Ticket #{selectedTicket._id.slice(-6)} - {selectedTicket.subject}</h3>
              <button onClick={() => setSelectedTicket(null)} className='text-gray-500 hover:text-gray-800 text-xl font-bold'>&times;</button>
            </div>
            <div className='p-6 space-y-4'>
              <div>
                <p className='text-sm font-medium text-gray-700'>Customer:</p>
                <p className='text-base text-gray-900'>{selectedTicket.user?.name || selectedTicket.user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-700'>Status:</p>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(selectedTicket._id, e.target.value)}
                  className='p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500'
                >
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-700'>Description:</p>
                <p className='text-base text-gray-900'>{selectedTicket.description}</p>
              </div>
              </div>
              <div className='space-y-2'>
                <p className='text-sm font-medium text-gray-700'>Messages:</p>
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((msg, index) => (
                    <div key={index} className={`p-3 rounded-lg ${msg.sender === 'admin' ? 'bg-gray-100' : 'bg-blue-100 ml-auto'} max-w-[80%] flex flex-col`}>
                      <span className='font-bold text-xs'>{msg.sender === 'admin' ? 'Admin' : selectedTicket.user?.name || 'Customer'}</span>
                      <p className='text-sm'>{msg.message}</p>
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
                            onClick={() => sendAdminReply(selectedTicket._id)}
                            className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 transition-colors"
                        >
                            Send
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
      
      )}
    </div>
  );
};

export default Tickets;
