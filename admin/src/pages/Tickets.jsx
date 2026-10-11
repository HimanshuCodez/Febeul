import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App';
import { Paperclip, X, Download, CalendarRange, ShieldAlert, LifeBuoy, PhoneCall, Unlock, Plus, Mail, Search, RefreshCw, Clock3, CheckCircle2, Inbox, ArrowUpRight, MessageSquare } from 'lucide-react';
import { CSVLink } from 'react-csv';


const buttonClass = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-[#eae5ed] bg-white px-3 py-2.5 text-xs font-medium text-[#776180] hover:border-[#d8cbdc] hover:bg-[#faf6fa]';
const darkButtonClass = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-[#302735] bg-[#302735] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#49374e]';
const summaryIconColors = { dark: 'bg-white/5 text-[#e4b0c4]', green: 'bg-[#edf5f0] text-[#5e8c74]', amber: 'bg-[#faf3e8] text-[#b09564]', rose: 'bg-[#f9eff4] text-[#b07a96]' };

const StatusBadge = ({ status, style }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-medium capitalize ${style.badge}`}>
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
  const ticketDialogRef = useRef(null);
  const isTicketOpen = selectedTicket !== null;

  useEffect(() => {
    if (!isTicketOpen) return;
    const dialog = ticketDialogRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.querySelector('[aria-label="Close ticket details"]')?.focus();
    const handleDialogKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedTicket(null);
      }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleDialogKey);
    return () => {
      document.removeEventListener('keydown', handleDialogKey);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isTicketOpen]);

  // New ticket creation (admin creates a ticket on behalf of a user, identified by email or phone)
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicketIdentifier, setNewTicketIdentifier] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketImages, setNewTicketImages] = useState([]);
  const [isSubmittingNewTicket, setIsSubmittingNewTicket] = useState(false);
  const newTicketFileInputRef = useRef(null);

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

  const handleNewTicketImageChange = (e) => {
    const files = Array.from(e.target.files);
    setNewTicketImages((prev) => [...prev, ...files].slice(0, 2));
    e.target.value = '';
  };

  const handleRemoveNewTicketImage = (indexToRemove) => {
    setNewTicketImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const resetNewTicketForm = () => {
    setNewTicketIdentifier('');
    setNewTicketSubject('');
    setNewTicketMessage('');
    setNewTicketImages([]);
    if (newTicketFileInputRef.current) {
      newTicketFileInputRef.current.value = '';
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!token || isSubmittingNewTicket) return;
    if (!newTicketIdentifier.trim() || !newTicketSubject.trim() || !newTicketMessage.trim()) {
      toast.error('Please provide the customer email/phone, subject, and a message.');
      return;
    }

    setIsSubmittingNewTicket(true);
    const submitFormData = new FormData();
    submitFormData.append('identifier', newTicketIdentifier.trim());
    submitFormData.append('subject', newTicketSubject);
    submitFormData.append('message', newTicketMessage);
    newTicketImages.forEach((image) => {
      submitFormData.append('images', image);
    });

    try {
      const response = await axios.post(`${backendUrl}/api/ticket/admin-create`, submitFormData, {
        headers: { token, 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        toast.success('Ticket created successfully!');
        resetNewTicketForm();
        setIsCreatingTicket(false);
        fetchTickets();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create ticket.');
      console.error(error);
    } finally {
      setIsSubmittingNewTicket(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const tabTickets = tickets.filter(ticket => activeTab === 'appeals' ? ticket.type === 'appeal' : ticket.type !== 'appeal');
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
    open: { badge: 'bg-[#edf6f1] text-[#56866f] border-[#deeee5]', dot: 'bg-emerald-500' },
    pending: { badge: 'bg-[#faf4e8] text-[#a48a53] border-[#f0e5d0]', dot: 'bg-amber-500' },
    closed: { badge: 'bg-[#f4eff7] text-[#8f759f] border-[#e9e0f0]', dot: 'bg-rose-500' },
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
    <div className="mx-auto w-full max-w-[1600px] font-[Outfit,sans-serif] text-[#342a3c] [&_*]:[font-family:inherit] [&_button]:transition-colors [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#ad708f] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none">
      <header className="mb-6 flex flex-col gap-5 pt-1 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-[10px] font-medium tracking-[0.18em] text-[#947c8c]"><span className="h-1.5 w-1.5 rotate-45 rounded-sm bg-[#c77893]" />FEBEUL / CUSTOMER CARE</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] lg:text-[36px]">Support tickets<span className="text-[#c77893]">.</span></h1>
          <p className="mt-2 text-xs leading-relaxed text-[#8b7b93] sm:text-[13px]">Customer conversations and account appeals, all in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={fetchTickets} disabled={loading} className={buttonClass + ' !px-3'} aria-label="Refresh tickets" title="Refresh tickets"><RefreshCw size={16} className={loading ? 'motion-safe:animate-spin' : ''} /></button>
          <CSVLink data={csvData} headers={csvHeaders} filename={'tickets_export_' + new Date().toISOString().split('T')[0] + '.csv'} className={buttonClass} title="Export tickets matching the current tab and filters"><Download size={15} aria-hidden="true" />Export CSV</CSVLink>
          <button type="button" onClick={() => setIsCreatingTicket((prev) => !prev)} aria-expanded={isCreatingTicket} aria-controls="create-ticket-panel" className={darkButtonClass}>
            {isCreatingTicket ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{isCreatingTicket ? 'Cancel' : 'New Ticket'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="Ticket status totals">
        {[
          { label: 'Total tickets', count: tabTickets.length, icon: Inbox, note: activeTab === 'appeals' ? 'All block appeals' : 'All support requests', color: 'dark' },
          { label: 'Open', count: tabTickets.filter(ticket => ticket.status === 'open').length, icon: LifeBuoy, note: 'Open conversations', color: 'green' },
          { label: 'Pending', count: tabTickets.filter(ticket => ticket.status === 'pending').length, icon: Clock3, note: 'Marked as pending', color: 'amber' },
          { label: 'Closed', count: tabTickets.filter(ticket => ticket.status === 'closed').length, icon: CheckCircle2, note: 'Closed conversations', color: 'rose' },
        ].map(({ label, count, icon: Icon, note, color }) => (
          <article key={label} aria-label={label + ' count'} className={'rounded-xl border p-4 shadow-sm sm:p-5 ' + (color === 'dark' ? 'border-[#302735] bg-[#302735] text-white' : 'border-[#eae5ed] bg-white')}>
            <div className={'flex items-center justify-between gap-2 text-[11px] font-medium sm:text-xs ' + (color === 'dark' ? 'text-[#e0d5e3]' : 'text-[#776d80]')}>
              <span>{label}</span><span className={'grid h-8 w-8 shrink-0 place-items-center rounded-lg ' + summaryIconColors[color]}><Icon size={17} aria-hidden="true" /></span>
            </div>
            <strong className="mb-2 mt-3 block text-3xl font-semibold leading-tight tracking-tight tabular-nums">{loading ? '\u2014' : count.toLocaleString('en-IN')}</strong>
            <p className={'text-[10px] leading-relaxed sm:text-[11px] ' + (color === 'dark' ? 'text-[#c5b8cb]' : 'text-[#84758e]')}>{note}</p>
          </article>
        ))}
      </div>
      <p className="mb-6 mt-2.5 text-[10px] leading-relaxed text-[#897b92] sm:text-[11px]">Status totals for {activeTab === 'appeals' ? 'block appeals' : 'support tickets'}, before search and date filters.</p>

      <section className="mb-5 min-w-0 rounded-2xl border border-[#eae5ed] bg-white shadow-sm" aria-label="Ticket filters">
        <nav className="flex flex-wrap gap-1 border-b border-[#eee7f1] px-3 pt-2 sm:px-5" aria-label="Ticket type">
          <button type="button" onClick={() => setActiveTab('tickets')} aria-pressed={activeTab === 'tickets'} className={'flex min-h-12 items-center gap-2 border-b-2 px-3 text-xs font-medium sm:px-4 ' + (activeTab === 'tickets' ? 'border-[#b97797] text-[#a26083]' : 'border-transparent text-[#95829f] hover:text-[#665270]')}><LifeBuoy size={16} aria-hidden="true" />Support Tickets</button>
          <button type="button" onClick={() => setActiveTab('appeals')} aria-pressed={activeTab === 'appeals'} className={'flex min-h-12 items-center gap-2 border-b-2 px-3 text-xs font-medium sm:px-4 ' + (activeTab === 'appeals' ? 'border-[#b97797] text-[#a26083]' : 'border-transparent text-[#95829f] hover:text-[#665270]')}><ShieldAlert size={16} aria-hidden="true" />Appeals{appealsCount > 0 && <span className="rounded-md bg-[#f7edf3] px-1.5 py-0.5 text-[10px] text-[#a9758f]">{appealsCount}</span>}</button>
        </nav>
        <div className="space-y-3 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-[#f6f2f8] p-1 sm:w-fit" role="group" aria-label="Filter by status">
              {['all', 'open', 'pending', 'closed'].map(status => (
                <button type="button" key={status} onClick={() => setFilterStatus(status)} aria-pressed={filterStatus === status} className={'min-h-8 rounded-md px-2 text-[11px] font-medium capitalize sm:px-4 ' + (filterStatus === status ? 'bg-white text-[#7e587d] shadow-sm' : 'text-[#9985a4] hover:text-[#70517d]')}>{status}</button>
              ))}
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[#e4dce9] px-3 text-[#a28bab] focus-within:border-[#b77997] focus-within:ring-2 focus-within:ring-[#f5e9f0] lg:w-[340px]">
              <Search size={16} className="shrink-0" aria-hidden="true" />
              <input type="search" aria-label="Search tickets" placeholder="Search name, email, or ticket ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-xs text-[#65526f] outline-none placeholder:text-[#a390ac]" />
              {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear ticket search" className="grid h-8 w-6 shrink-0 place-items-center"><X size={14} /></button>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#99849f] sm:gap-3">
            <span className="flex w-full items-center gap-1.5 sm:w-auto"><CalendarRange size={14} aria-hidden="true" />Created date</span>
            <div className="flex w-full min-w-0 items-end gap-1.5 sm:w-auto sm:items-center sm:gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2"><span>From</span><input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} aria-label="From date" className="w-full min-w-0 rounded-md border-[#e4dce9] bg-white px-1 py-2 text-[11px] text-[#7b6089] sm:w-auto sm:px-2" /></label>
              <span className="pb-2 text-[#b6a7be] sm:pb-0" aria-hidden="true">&ndash;</span>
              <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2"><span>To</span><input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} aria-label="To date" className="w-full min-w-0 rounded-md border-[#e4dce9] bg-white px-1 py-2 text-[11px] text-[#7b6089] sm:w-auto sm:px-2" /></label>
              {(startDate || endDate) && <button type="button" onClick={clearDateFilter} title="Clear date filter" aria-label="Clear date filter" className="grid min-h-8 min-w-6 place-items-center text-[#a96586]"><X size={14} /></button>}
            </div>
            <span className="mt-1 w-full text-[10px] text-[#998a9f] sm:ml-auto sm:mt-0 sm:w-auto">CSV export uses your current filters.</span>
          </div>
        </div>
      </section>

      {/* Create Ticket for User */}
      {isCreatingTicket && (
        <div id="create-ticket-panel" className="mb-5 min-w-0 rounded-2xl border border-[#eae5ed] bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-2 flex items-center gap-2 text-base font-semibold tracking-tight text-[#5b4264]">
            <LifeBuoy size={18} className='text-pink-500' /> Create Ticket for a Customer
          </h3>
          <p className="mb-5 text-xs leading-relaxed text-[#8c7697]">Look up an existing customer by their email or phone number to open a ticket on their behalf.</p>
          <form onSubmit={handleCreateTicket} className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label htmlFor="new-ticket-identifier" className="mb-2 block text-xs font-medium text-[#81688e]">Customer Email or Phone Number</label>
              <div className='relative'>
                <Mail size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
                <input id="new-ticket-identifier"
                  type="text"
                  value={newTicketIdentifier}
                  onChange={(e) => setNewTicketIdentifier(e.target.value)}
                  placeholder="customer@example.com or 9876543210"
                  required
                  className="w-full min-w-0 rounded-lg border-[#e4dce9] bg-white py-2.5 pl-9 pr-3 text-sm text-[#65526f] outline-none placeholder:text-[#af9db7] focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="new-ticket-subject" className="mb-2 block text-xs font-medium text-[#81688e]">Subject</label>
              <input id="new-ticket-subject"
                type="text"
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
                placeholder="e.g., Issue with order delivery"
                required
                className="w-full min-w-0 rounded-lg border-[#e4dce9] bg-white px-3 py-2.5 text-sm text-[#65526f] outline-none placeholder:text-[#af9db7] focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0]"
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="new-ticket-message" className="mb-2 block text-xs font-medium text-[#81688e]">Message</label>
              <textarea id="new-ticket-message"
                value={newTicketMessage}
                onChange={(e) => setNewTicketMessage(e.target.value)}
                placeholder="Describe the issue or the reason for opening this ticket..."
                rows={4}
                required
                className="min-h-28 w-full min-w-0 resize-y rounded-lg border-[#e4dce9] bg-white px-3 py-2.5 text-sm text-[#65526f] outline-none placeholder:text-[#af9db7] focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0]"
              />
            </div>
            <div className='space-y-2'>
              <p className="text-xs font-medium text-[#81688e]">Attach Photos (Max 2)</p>
              <div className='flex flex-wrap items-center gap-2'>
                {newTicketImages.map((image, index) => (
                  <div key={index} className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#e5dbe9]">
                    <img src={URL.createObjectURL(image)} alt={`Preview ${index}`} className='w-full h-full object-cover' />
                    <button
                      type="button"
                      aria-label={"Remove new ticket photo " + (index + 1)}
                      onClick={() => handleRemoveNewTicketImage(index)}
                      className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-bl-lg bg-white/95 text-xs text-[#ad7392] shadow-sm hover:bg-rose-50"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {newTicketImages.length < 2 && (
                  <label className="relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#cfb8d7] text-[#a77c97] transition-colors hover:border-[#b77997] hover:bg-[#faf0f6] focus-within:ring-2 focus-within:ring-[#b77997]">
                    <Paperclip size={18} aria-hidden="true" /><span className="text-[10px]">Add photo</span>
                    <input
                      type="file"
                      aria-label="New ticket photos"
                      ref={newTicketFileInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleNewTicketImageChange}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmittingNewTicket}
              className="flex min-h-11 items-center justify-center gap-2 self-end rounded-lg bg-[#302735] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#49374e] sm:justify-self-end"
            >
              {isSubmittingNewTicket ? (
                <span className="inline-flex items-center gap-2"><RefreshCw size={15} className="motion-safe:animate-spin" />Creating...</span>
              ) : (
                'Create Ticket'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Tickets List */}
      <div className="mb-5 min-w-0 rounded-2xl border border-[#eae5ed] bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold tracking-tight text-[#5b4264]">{activeTab === 'appeals' ? 'Block Appeals' : 'All Tickets'} ({filteredTickets.length})</h3>
          {totalPages > 1 && (
            <span className="text-[11px] font-medium text-[#9b86a5]">Page {currentPage} of {totalPages}</span>
          )}
        </div>
        {loading ? (
          <div role="status" aria-label="Loading tickets" className="space-y-4 py-3"><span className="sr-only">Loading tickets...</span>{[0, 1, 2, 3].map(index => <div key={index} className="flex items-center gap-4 border-t border-[#f1eaf5] py-4 motion-safe:animate-pulse"><span className="h-9 w-9 rounded-lg bg-[#f2ebf6]" /><div className="flex-1 space-y-2"><div className="h-2.5 w-1/2 rounded bg-[#f2ebf6]" /><div className="h-2 w-1/3 rounded bg-[#f2ebf6]" /></div></div>)}</div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e6dceb] bg-[#fcfafd] px-4 py-14 text-center">
            <LifeBuoy className='mx-auto text-gray-300 mb-3' size={32} />
            <p className='text-sm font-semibold text-gray-500'>No tickets found for the selected filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead className='bg-gray-50'>
                  <tr>
                    <th scope='col' className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[#9a80a8]">ID</th>
                    <th scope='col' className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[#9a80a8]">Subject</th>
                    <th scope='col' className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[#9a80a8]">Customer</th>
                    {activeTab === 'appeals' && (
                      <th scope='col' className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[#9a80a8]">Phone</th>
                    )}
                    <th scope='col' className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[#9a80a8]">Status</th>
                    <th scope='col' className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[#9a80a8]">Last Updated</th>
                    <th scope='col' className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[#9a80a8]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1eaf5] bg-white">
                  {paginatedTickets.map((ticket) => (
                    <tr key={ticket._id} className='hover:bg-gray-50'>
                      <td className="whitespace-nowrap px-4 py-4 text-xs font-medium tabular-nums text-[#84648f]">{ticket.ticketNumber || ticket._id.slice(-6)}</td>
                      <td className="max-w-[240px] px-4 py-4 text-xs leading-relaxed text-[#725e7f] [overflow-wrap:anywhere]">{ticket.subject}</td>
                      <td className="px-4 py-4 text-[11px] text-[#95809f]">
                        <div className="flex min-w-0 flex-col gap-1 [&>span]:max-w-[240px] [&>span]:[overflow-wrap:anywhere]">
                          <span className='font-medium text-gray-900'>{ticket.user?.name || 'N/A'}</span>
                          <span className='text-xs'>{ticket.user?.email}</span>
                          {ticket.user?.isLuxeMember && (
                            <span className="inline-flex w-fit items-center rounded-md border border-[#eee3d0] bg-[#faf3e6] px-2 py-0.5 text-[9px] font-medium text-[#a88b56]">
                              <span className="mr-1 h-1 w-1 rounded-full bg-[#baa36e]"></span>
                              Luxe Member
                            </span>
                          )}
                        </div>
                      </td>
                      {activeTab === 'appeals' && (
                        <td className="max-w-[180px] px-4 py-4 text-[11px] font-medium text-[#8d729a] [overflow-wrap:anywhere]">
                          {ticket.appealDetails?.phone || ticket.contactInfo || 'N/A'}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-4">
                        <StatusBadge status={ticket.status} style={getStatusStyle(ticket.status)} />
                      </td>
                      <td className="px-4 py-4 text-[11px] text-[#95809f]">
                        {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-[#e7ddec] px-2.5 text-[11px] font-medium text-[#a17cab] hover:border-[#c5a1d0] hover:bg-[#fbf6fd]"
                        >
                          View Details <ArrowUpRight size={13} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="space-y-3 xl:hidden">
              {paginatedTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="min-w-0 cursor-pointer space-y-3 rounded-xl border border-[#e9e0ed] p-4 transition-colors hover:border-[#d3b8d2] active:bg-[#fcf7fd]"
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className="text-[11px] font-medium tabular-nums text-[#a88eb3]">#{ticket.ticketNumber || ticket._id.slice(-6)}</span>
                    <StatusBadge status={ticket.status} style={getStatusStyle(ticket.status)} />
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-[#614b6c] [overflow-wrap:anywhere]">{ticket.subject}</p>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className="truncate text-xs font-medium text-[#7b6287]">{ticket.user?.name || 'N/A'}</p>
                      <p className="mt-1 truncate text-[11px] text-[#a18eab]">{ticket.user?.email}</p>
                    </div>
                    <p className="shrink-0 text-[10px] font-medium text-[#a18eab]">{new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                  {ticket.user?.isLuxeMember && (
                    <span className="inline-flex w-fit items-center rounded-md border border-[#eee3d0] bg-[#faf3e6] px-2 py-0.5 text-[9px] font-medium text-[#a88b56]">
                      <span className="mr-1 h-1 w-1 rounded-full bg-[#baa36e]"></span>
                      Luxe Member
                    </span>
                  )}
                  {activeTab === 'appeals' && (
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#9a7ba6] [overflow-wrap:anywhere]">
                      <PhoneCall size={12} className='text-gray-400' /> {ticket.appealDetails?.phone || ticket.contactInfo || 'N/A'}
                    </p>
                  )}
                  <button className="inline-flex min-h-8 items-center gap-1 text-[11px] font-medium text-[#aa7a9d]">View Details →</button>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-[#eee7f1] pt-5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="min-h-9 rounded-lg border border-[#e5dbe9] bg-white px-3 py-2 text-[11px] font-medium text-[#9679a1] hover:bg-[#faf6fc]"
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
                          aria-label={"Page " + pageNum}
                          aria-current={currentPage === pageNum ? "page" : undefined}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-9 h-9 rounded-lg text-[11px] font-medium transition-colors ${currentPage === pageNum ? 'bg-[#302735] text-white' : 'bg-white border border-[#e5dbe9] text-[#9679a1] hover:bg-[#faf6fc]'}`}
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
                <span className="px-2 text-[11px] font-medium text-[#9980a5] sm:hidden">{currentPage} / {totalPages}</span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="min-h-9 rounded-lg border border-[#e5dbe9] bg-white px-3 py-2 text-[11px] font-medium text-[#9679a1] hover:bg-[#faf6fc]"
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
        <div ref={ticketDialogRef} role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="ticket-dialog-title" aria-describedby="ticket-dialog-subject" className="fixed inset-0 z-50 flex items-center justify-center bg-[#201727]/50 p-3 text-[#584461] backdrop-blur-sm">
          <div className="flex max-h-[calc(100dvh-24px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#e2d7e8] bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#eae1ef] bg-[#fdfbfe] px-4 py-5 sm:px-6">
              <div className='min-w-0'>
                <h3 id="ticket-dialog-title" className="flex flex-wrap items-center gap-2 break-words text-lg font-semibold tracking-tight text-[#58415f] sm:text-xl">
                  <MessageSquare size={19} className="text-[#b17b9a]" aria-hidden="true" />Ticket #{selectedTicket.ticketNumber || selectedTicket._id.slice(-6)}
                </h3>
                <p id="ticket-dialog-subject" className="mt-1.5 text-xs leading-relaxed text-[#957b9f] [overflow-wrap:anywhere]">{selectedTicket.subject}</p>
              </div>
              <button type="button" aria-label="Close ticket details" onClick={() => setSelectedTicket(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl text-[#a389ae] hover:bg-[#f3ecf7] hover:text-[#7a5c88]">&times;</button>
            </div>
            <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <div className='flex flex-col sm:flex-row justify-between items-start gap-3'>
                <div>
                  <p className="text-[11px] font-medium text-[#a18aaa]">Customer:</p>
                  <p className="mt-1 text-sm font-semibold text-[#66506f] [overflow-wrap:anywhere]">{selectedTicket.user?.name || 'N/A'}</p>
                  <p className="mt-1 text-[11px] text-[#a38bac] [overflow-wrap:anywhere]">{selectedTicket.user?.email}</p>
                </div>
                {selectedTicket.user?.isLuxeMember && (
                  <div className='flex flex-col items-start sm:items-end'>
                    <span className="flex items-center gap-1.5 rounded-md border border-[#eadcbf] bg-[#faf2e2] px-2.5 py-1 text-[10px] font-medium text-[#ae9056]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#bda56e]"></span>
                      Luxe Priority
                    </span>
                    <span className="mt-1 text-[10px] text-[#baa274]">High Priority Support</span>
                  </div>
                )}
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <p className="text-[11px] font-medium text-[#a18aaa]">Status:</p>
                  <select aria-label="Ticket status"
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket._id, e.target.value)}
                    className="mt-2 w-full min-w-0 rounded-lg border-[#e4dce9] bg-white px-3 py-2.5 text-xs font-medium text-[#83648e] outline-none focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0]"
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#a18aaa]">Created At:</p>
                  <p className="mt-2.5 text-xs text-[#8e7499]">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {selectedTicket.type === 'appeal' && (
                <div className="space-y-4 rounded-xl border border-[#eee0c5] bg-[#fdf9f0] p-4">
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='text-sm font-bold text-amber-800 flex items-center gap-1.5'>
                      <ShieldAlert size={16} /> Block Appeal
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${selectedTicket.user?.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {selectedTicket.user?.isBlocked ? 'Currently Blocked' : 'Currently Active'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
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
                      className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#618b76] py-2.5 text-xs font-medium text-white hover:bg-[#4f765f]"
                    >
                      {isUnblocking ? (
                        <div className='motion-safe:animate-spin rounded-full h-4 w-4 border-b-2 border-white' />
                      ) : (
                        <Unlock size={16} />
                      )}
                      {isUnblocking ? 'Unblocking...' : 'Unblock User'}
                    </button>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-[11px] font-medium text-[#a18aaa]">Contact Info:</p>
                <div className="mb-4 rounded-lg border border-[#eee7f3] bg-[#fcfafd] p-3 text-xs text-[#82698f] [overflow-wrap:anywhere]">
                  {selectedTicket.contactInfo || 'Not provided'}
                </div>
                <p className="mb-2 text-[11px] font-medium text-[#a18aaa]">Description:</p>
                <div className="whitespace-pre-wrap rounded-xl border border-[#eee7f3] bg-[#fcfafd] p-4 text-xs leading-relaxed text-[#82698f] [overflow-wrap:anywhere]">
                  {selectedTicket.description}
                </div>
              </div>
              <div className='space-y-2'>
                <p className="text-[11px] font-medium text-[#a18aaa]">Messages:</p>
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((msg, index) => (
                    <div key={index} className={`flex max-w-[95%] flex-col gap-1 rounded-xl border p-3 sm:max-w-[85%] ${msg.sender === 'admin' ? 'ml-auto border-[#ead5e3] bg-[#fbf1f7] text-[#996789]' : 'border-[#eee7f3] bg-[#faf7fc] text-[#8a6e96]'}`}>
                      <span className='font-bold text-xs'>{msg.sender === 'admin' ? 'Admin' : selectedTicket.user?.name || 'Customer'}</span>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed [overflow-wrap:anywhere]">{msg.message}</p>
                      {msg.images && msg.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                              {msg.images.map((imgSrc, imgIndex) => (
                                  <a key={imgIndex} href={imgSrc} target="_blank" rel="noopener noreferrer">
                                      <img src={imgSrc} alt={`Attachment ${imgIndex + 1}`} className="w-16 h-16 object-cover rounded-md cursor-pointer" />
                                  </a>
                              ))}
                          </div>
                      )}
                      <span className="mt-1 self-end text-[10px] text-[#b19cbc]">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className='text-sm text-gray-500'>No messages yet.</p>
                )}
              </div>
              {selectedTicket.status === 'closed' ? (
                <div className="mt-4 rounded-xl border border-[#e9e0ef] bg-[#f9f5fc] p-4 text-center text-xs leading-relaxed text-[#9881a3]">
                  <p className='font-semibold'>Conversation is ended.</p>
                  <p>Please create a new ticket for further issues.</p>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3 border-t border-[#eae1ef] pt-5">
                    {/* Attachment previews for current message */}
                    {adminAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {adminAttachments.map((file, index) => (
                                <div key={index} className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#e5dbe9]">
                                    <img src={URL.createObjectURL(file)} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        aria-label={"Remove reply photo " + (index + 1)}
                                        onClick={() => handleRemoveAdminAttachment(index)}
                                        className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-bl-lg bg-white/95 text-xs text-[#ad7392] shadow-sm hover:bg-rose-50"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[40px_minmax(0,1fr)_auto]">
                        <input
                            type="file"
                            aria-label="Reply photos"
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
                            className="grid h-10 w-10 place-items-center rounded-lg border border-[#e4dce9] text-[#ab81a0] hover:bg-[#fcf4f9]"
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
                            aria-label="Reply message"
                            placeholder="Type your reply..."
                            className="min-h-10 min-w-0 rounded-lg border-[#e4dce9] bg-white px-3 py-2 text-xs text-[#775a85] outline-none focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0]"
                        />
                        <button
                            aria-label={isSending ? "Sending reply" : "Send reply"}
                            disabled={isSending}
                            onClick={() => sendAdminReply(selectedTicket._id)}
                            className="col-span-2 flex min-h-10 min-w-[70px] items-center justify-center rounded-lg bg-[#302735] px-4 py-2 text-xs font-medium text-white hover:bg-[#49374e] sm:col-span-1"
                        >
                            {isSending ? (
                                <div className="motion-safe:animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                'Send'
                            )}
                        </button>
                    </div>
                </div>
              )}

              {selectedTicket.images && selectedTicket.images.length > 0 && (
                <div className="space-y-3 border-t border-[#eae1ef] pt-4">
                  <p className="text-[11px] font-medium text-[#a18aaa]">Attached Images:</p>
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
