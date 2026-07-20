import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    Plus,
    Paperclip,
    X,
    Search,
    RefreshCw,
    ChevronRight,
    Clock,
    CheckCircle2,
    XCircle,
    Inbox,
    Headphones,
    User,
    ImagePlus,
    MessageCircle,
    LifeBuoy,
    CalendarRange
} from "lucide-react";
import toast from "react-hot-toast";
import axios from 'axios';
import useAuthStore from "../store/authStore";

const STATUS_CONFIG = {
    open: { label: 'Open', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', Icon: CheckCircle2 },
    pending: { label: 'Pending', dot: 'bg-amber-500 animate-pulse', badge: 'bg-amber-50 text-amber-700 border-amber-100', Icon: Clock },
    closed: { label: 'Closed', dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-100', Icon: XCircle },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || { label: status || 'Unknown', dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-600 border-slate-100', Icon: LifeBuoy };

const Support = () => {
    const token = useAuthStore((state) => state.token);
    const url = import.meta.env.VITE_BACKEND_URL;
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const isSendingRef = useRef(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [searchTerm, setSearchTerm] = useState(""); // New state for search
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [formData, setFormData] = useState({ subject: "", message: "", images: [] });
    const [currentMessage, setCurrentMessage] = useState(''); // New state for message input
    const [currentAttachments, setCurrentAttachments] = useState([]); // New state for chat attachments
    const fileInputRef = useRef(null); // Ref for file input

    const fetchUserTickets = async () => {
        if (!token) {
            setLoading(false);
            return;
        };
        setLoading(true);
        try {
            const response = await axios.get(`${url}/api/ticket/user`, { headers: { token } });
            if (response.data.success) {
                setTickets(response.data.tickets);
            }
        } catch (error) {
            toast.error("Failed to fetch tickets.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        fetchUserTickets();
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSendMessage = async (ticketId) => {
        if (!currentMessage.trim() && currentAttachments.length === 0) return;
        if (isSendingRef.current) return;
        if (!token) {
            toast.error("You must be logged in to send a message.");
            return;
        }

        isSendingRef.current = true;
        setIsSending(true);
        const messageFormData = new FormData();
        messageFormData.append("ticketId", ticketId);
        messageFormData.append("message", currentMessage);
        messageFormData.append("sender", 'user');
        currentAttachments.forEach((file) => {
            messageFormData.append("images", file);
        });

        try {
            const response = await axios.post(`${url}/api/ticket/reply`,
                messageFormData,
                {
                    headers: {
                        token: token,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.data.success) {
                toast.success("Message sent!");
                setSelectedTicket(prev => {
                    const newMsgImages = response.data.newImages || [];
                    const newMessage = {
                        message: currentMessage,
                        sender: 'user',
                        createdAt: new Date().toISOString(),
                        images: newMsgImages,
                    };
                    return {
                        ...prev,
                        messages: [...prev.messages, newMessage]
                    };
                });
                setCurrentMessage('');
                setCurrentAttachments([]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Failed to send message.");
            console.error(error);
        } finally {
            setIsSending(false);
            isSendingRef.current = false;
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData((prev) => {
            const currentImages = [...prev.images];
            const newImages = [...currentImages, ...files].slice(0, 2);
            return { ...prev, images: newImages };
        });
        e.target.value = '';
    };

    const handleRemoveImage = (indexToRemove) => {
        setFormData((prev) => ({
            ...prev,
            images: prev.images.filter((_, index) => index !== indexToRemove),
        }));
    };

    const handleCurrentAttachmentsChange = (e) => {
        const files = Array.from(e.target.files);
        setCurrentAttachments((prev) => {
            const newAttachments = [...prev, ...files].slice(0, 2);
            return newAttachments;
        });
        e.target.value = '';
    };

    const handleRemoveCurrentAttachment = (indexToRemove) => {
        setCurrentAttachments((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!token) {
            toast.error("login to create ticket");
            return;
        }

        setIsSubmitting(true);
        const submitFormData = new FormData();
        submitFormData.append("subject", formData.subject);
        submitFormData.append("message", formData.message);
        submitFormData.append("description", formData.message); // Using message as description
        formData.images.forEach((image) => {
            submitFormData.append("images", image);
        });

        try {
            const response = await axios.post(`${url}/api/ticket/create`, submitFormData, {
                headers: {
                    token: token,
                    "Content-Type": "multipart/form-data",
                },
            });
            if (response.data.success) {
                toast.success("Ticket created successfully!");
                setFormData({ subject: "", message: "", images: [] }); // Corrected reset
                setIsCreating(false);
                fetchUserTickets();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Failed to create ticket.");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredTickets = tickets.filter((ticket) => {
        const subject = ticket.subject?.toLowerCase() || '';
        const ticketId = String(ticket.ticketNumber || ticket._id?.slice(-6) || '');
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = subject.includes(search) || ticketId.toLowerCase().includes(search);

        const ticketTime = new Date(ticket.createdAt || ticket.updatedAt).getTime();
        const matchesStart = !startDate || ticketTime >= new Date(startDate).setHours(0, 0, 0, 0);
        const matchesEnd = !endDate || ticketTime <= new Date(endDate).setHours(23, 59, 59, 999);

        return matchesSearch && matchesStart && matchesEnd;
    });

    const clearDateFilter = () => {
        setStartDate("");
        setEndDate("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-pink-50/60 to-white font-sans py-12 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto max-w-5xl">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md shadow-pink-100 border border-pink-100 mb-4">
                        <Headphones className="text-pink-500" size={28} />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">Support Center</h1>
                    <p className="mt-2 text-slate-500 font-medium">We're here to help — track your tickets or start a new conversation.</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl shadow-xl shadow-slate-100/80 border border-slate-100 p-5 sm:p-8"
                >
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 border-b border-slate-100 pb-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <MessageCircle className="text-pink-500 w-5 h-5" /> My Tickets
                            </h2>
                            {tickets.length > 0 && (
                                <span className="bg-pink-50 text-pink-600 font-black text-xs px-3 py-1 rounded-2xl border border-pink-100">
                                    {tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by subject or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition-all"
                                />
                            </div>
                            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 shrink-0 border transition-colors ${(startDate || endDate) ? 'bg-pink-50 border-pink-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                <CalendarRange size={15} className={(startDate || endDate) ? 'text-pink-500' : 'text-slate-300'} />
                                <input
                                    type="date"
                                    value={startDate}
                                    max={endDate || undefined}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="text-xs font-bold text-slate-600 focus:outline-none bg-transparent w-[92px] cursor-pointer"
                                    aria-label="From date"
                                />
                                <span className="text-slate-300 text-xs font-bold">→</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate || undefined}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="text-xs font-bold text-slate-600 focus:outline-none bg-transparent w-[92px] cursor-pointer"
                                    aria-label="To date"
                                />
                                {(startDate || endDate) && (
                                    <button
                                        onClick={clearDateFilter}
                                        title="Clear date filter"
                                        className="text-pink-400 hover:text-rose-500 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={fetchUserTickets}
                                title="Refresh tickets"
                                className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors shrink-0"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={() => {
                                    if (!token) {
                                        toast.error("login to create ticket");
                                        return;
                                    }
                                    setIsCreating(!isCreating);
                                }}
                                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2.5 px-4 rounded-xl font-bold text-sm shadow-lg shadow-pink-100 hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 shrink-0"
                            >
                                {isCreating ? <X size={16} /> : <Plus size={16} />}
                                <span>{isCreating ? 'Cancel' : 'New Ticket'}</span>
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {isCreating && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-8 overflow-hidden"
                            >
                                <form onSubmit={handleSubmit} className="space-y-5 p-6 bg-slate-50/60 border border-slate-100 rounded-2xl">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Create a new ticket</h3>
                                        <p className="text-xs text-slate-400 font-medium mt-1">Our support team typically responds within 24 hours.</p>
                                    </div>
                                    <FormInput label="Subject" name="subject" value={formData.subject} onChange={handleChange} placeholder="e.g., Issue with my order" required />
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Message</label>
                                        <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Please provide all the details here..." rows="5" required className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-pink-100 focus:border-pink-400 text-sm transition-all"></textarea>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Attach Photos (Max 2)</label>
                                        {formData.images.length < 2 && (
                                            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-pink-300 hover:bg-pink-50/40 transition-colors text-center">
                                                <ImagePlus className="text-slate-400" size={22} />
                                                <span className="text-xs font-bold text-slate-500">Click to upload up to 2 photos</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleImageChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                        {formData.images.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {formData.images.map((image, index) => (
                                                    <div key={index} className="relative w-20 h-20 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                        <img src={URL.createObjectURL(image)} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveImage(index)}
                                                            className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-pink-100 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                                        {isSubmitting ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                            <Send size={16} />
                                        )}
                                        <span>{isSubmitting ? 'Creating Ticket...' : 'Create Ticket'}</span>
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div>
                            <p className="text-sm text-slate-400 font-bold">Loading your tickets...</p>
                        </div>
                    ) : !token ? (
                        <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                            <div className="bg-white p-5 rounded-full w-16 h-16 flex items-center justify-center mx-auto shadow-sm border border-slate-100 mb-4">
                                <LifeBuoy className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-semibold">Please log in to view or create support tickets.</p>
                        </div>
                    ) : filteredTickets.length > 0 ? (
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                            className="space-y-3"
                        >
                            {filteredTickets.map(ticket => {
                                const { label, dot, badge, Icon } = getStatusConfig(ticket.status);
                                return (
                                    <motion.div
                                        key={ticket._id}
                                        variants={{
                                            hidden: { opacity: 0, y: 12 },
                                            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 16 } }
                                        }}
                                        whileHover={{ y: -2 }}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="group bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 cursor-pointer hover:shadow-lg hover:border-pink-100 transition-all duration-300 flex items-center gap-4"
                                    >
                                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                                            <MessageCircle className="text-pink-500" size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 truncate">{ticket.subject}</p>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-slate-400 font-bold">
                                                <span>#{ticket.ticketNumber || ticket._id.slice(-6)}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} /> {new Date(ticket.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                            <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black capitalize border ${badge}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {label}
                                            </span>
                                            <Icon className={`sm:hidden ${badge.split(' ')[1]}`} size={18} />
                                            <ChevronRight className="text-slate-300 group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" size={18} />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    ) : (
                        <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                            <div className="bg-white p-5 rounded-full w-16 h-16 flex items-center justify-center mx-auto shadow-sm border border-slate-100 mb-4">
                                <Inbox className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-base font-black text-slate-700">
                                {searchTerm || startDate || endDate ? 'No matching tickets' : 'No Support Tickets Yet'}
                            </h3>
                            <p className="text-slate-400 text-sm font-medium mt-1 max-w-sm mx-auto">
                                {searchTerm || startDate || endDate ? 'Try a different subject, ticket ID, or date range.' : "Need help? Create a ticket and we'll get back to you soon."}
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>

            <AnimatePresence>
                {selectedTicket && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
                        >
                            <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-3xl">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Ticket #{selectedTicket.ticketNumber || selectedTicket._id.slice(-6)}</h3>
                                    {(() => {
                                        const { label, dot, badge } = getStatusConfig(selectedTicket.status);
                                        return (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1.5 rounded-full text-[10px] font-black capitalize border ${badge}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {label}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-5 sm:p-6 space-y-5">
                                <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedTicket.subject}</p>
                                </div>

                                <div className="bg-slate-50/60 rounded-2xl p-4 space-y-3 max-h-[45vh] overflow-y-auto">
                                    {selectedTicket.messages.map((msg, index) => {
                                        const isUser = msg.sender === 'user';
                                        return (
                                            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`flex items-end gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white ${isUser ? 'bg-pink-400' : 'bg-slate-400'}`}>
                                                        {isUser ? <User size={13} /> : <Headphones size={13} />}
                                                    </div>
                                                    <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${isUser ? 'bg-pink-500 text-white rounded-br-md' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-md'}`}>
                                                        {msg.message && <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>}
                                                        {msg.images && msg.images.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {msg.images.map((imgSrc, imgIndex) => (
                                                                    <a key={imgIndex} href={imgSrc} target="_blank" rel="noopener noreferrer">
                                                                        <img src={imgSrc} alt={`Attachment ${imgIndex + 1}`} className="w-16 h-16 object-cover rounded-lg cursor-pointer border border-black/5 hover:opacity-90 transition-opacity" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <span className={`block text-[10px] font-bold mt-1.5 ${isUser ? 'text-pink-100' : 'text-slate-400'}`}>
                                                            {new Date(msg.createdAt).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {selectedTicket.status === 'closed' ? (
                                    <div className="p-4 bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl text-center">
                                        <p className="font-bold text-sm">This conversation has ended.</p>
                                        <p className="text-xs text-slate-400 mt-1">Please create a new ticket for further issues.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 pt-2">
                                        {currentAttachments.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {currentAttachments.map((file, index) => (
                                                    <div key={index} className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden">
                                                        <img src={URL.createObjectURL(file)} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveCurrentAttachment(index)}
                                                            className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                                        >
                                                            <X size={11} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full p-1.5 pl-3 focus-within:ring-2 focus-within:ring-pink-100 focus-within:border-pink-300 transition-all">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                accept="image/*"
                                                multiple
                                                onChange={handleCurrentAttachmentsChange}
                                                className="hidden"
                                                disabled={currentAttachments.length >= 2}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current.click()}
                                                title="Attach files"
                                                disabled={currentAttachments.length >= 2}
                                                className="text-slate-400 hover:text-pink-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                            >
                                                <Paperclip size={18} />
                                            </button>
                                            <input
                                                type="text"
                                                value={currentMessage}
                                                onChange={(e) => setCurrentMessage(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSendMessage(selectedTicket._id);
                                                    }
                                                }}
                                                placeholder="Type your message..."
                                                className="flex-1 bg-transparent text-sm py-1.5 focus:outline-none"
                                            />
                                            <button
                                                disabled={isSending}
                                                onClick={() => handleSendMessage(selectedTicket._id)}
                                                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-md shadow-pink-100 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                            >
                                                {isSending ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                ) : (
                                                    <Send size={16} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {selectedTicket.images && selectedTicket.images.length > 0 && (
                                    <div className="space-y-2 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Attached Images</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTicket.images.map((image, index) => (
                                                <a key={index} href={image} target="_blank" rel="noopener noreferrer">
                                                    <img src={image} alt={`Ticket attachment ${index + 1}`} className="w-20 h-20 object-cover rounded-xl border border-slate-200 hover:opacity-90 transition-opacity" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const FormInput = ({ label, ...props }) => (
    <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{label}</label>
        <input {...props} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-pink-100 focus:border-pink-400 text-sm transition-all" />
    </div>
);

export default Support;
