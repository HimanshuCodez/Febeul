import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App';
import { assets } from '../assets/assets'; // Assuming icons like parcel_icon, order_icon are useful

const Tickets = ({ token }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'open', 'closed', 'pending'
  const [adminMessage, setAdminMessage] = useState(''); // New state for admin message

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
    if (!adminMessage.trim()) return;
    if (!token) {
      toast.error("Authentication token missing.");
      return;
    }

    try {
      const response = await axios.post(`${backendUrl}/api/ticket/admin-reply`,
        { ticketId, message: adminMessage, sender: 'admin' },
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success("Reply sent!");
        // Update the messages in the selected ticket locally
        setSelectedTicket(prev => {
          const newMessage = {
            message: adminMessage,
            sender: 'admin',
            createdAt: new Date().toISOString(), // Ensure a valid date for immediate display
          };
          return {
            ...prev,
            messages: [...prev.messages, newMessage]
          };
        });
        setAdminMessage(''); // Clear the input field
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Failed to send reply.");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const filteredTickets = tickets.filter((ticket) => {
    if (filterStatus === 'all') return true;
    return ticket.status === filterStatus;
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

      {/* Filter and Search (Future enhancement) */}
      <div className='mb-6 flex justify-between items-center'>
        <div className='flex gap-4'>
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
        <button
          onClick={fetchTickets}
          className="px-4 py-2 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
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
                <div className='flex items-center gap-2 mt-4 pt-4 border-t border-gray-200'>
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
              )}

              {selectedTicket.images && selectedTicket.images.length > 0 && (
                <div className='space-y-2 pt-4 border-t border-gray-200'>
                  <p className='text-sm font-medium text-gray-700'>Attached Images:</p>
                  <div className='flex flex-wrap gap-2'>
                    {selectedTicket.images.map((image, index) => (
                      <img key={index} src={image} alt={`Ticket attachment ${index + 1}`} className='w-24 h-24 object-cover rounded-md border border-gray-200' />
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
