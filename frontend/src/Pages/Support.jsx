import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, HelpCircle, Send, Plus, Paperclip, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from 'axios';
import useAuthStore from "../store/authStore";

const Support = () => {
    const token = useAuthStore((state) => state.token);
    const url = import.meta.env.VITE_BACKEND_URL;
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [searchTerm, setSearchTerm] = useState(""); // New state for search
    const [formData, setFormData] = useState({ subject: "", description: "", message: "", images: [] });
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
        fetchUserTickets();
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSendMessage = async (ticketId) => {
        if (!currentMessage.trim() && currentAttachments.length === 0) return; // Allow sending only attachments
        if (!token) {
            toast.error("You must be logged in to send a message.");
            return;
        }

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
                // Update the messages in the selected ticket locally
                setSelectedTicket(prev => {
                    const newMsgImages = response.data.newImages || []; // Assuming backend returns URLs of uploaded images
                    const newMessage = {
                        message: currentMessage,
                        sender: 'user',
                        createdAt: new Date().toISOString(),
                        images: newMsgImages, // Store image URLs
                    };
                    return {
                        ...prev,
                        messages: [...prev.messages, newMessage]
                    };
                });
                setCurrentMessage(''); // Clear the input field
                setCurrentAttachments([]); // Clear attachments
                if (fileInputRef.current) {
                    fileInputRef.current.value = ""; // Clear file input
                }
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Failed to send message.");
            console.error(error);
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData((prev) => {
            const currentImages = [...prev.images];
            const newImages = [...currentImages, ...files].slice(0, 2); // Limit to max 2 images
            return { ...prev, images: newImages };
        });
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
            const newAttachments = [...prev, ...files].slice(0, 2); // Limit to max 2 attachments for chat replies
            return newAttachments;
        });
        e.target.value = ''; // Clear file input after selection
    };

    const handleRemoveCurrentAttachment = (indexToRemove) => {
        setCurrentAttachments((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            toast.error("You must be logged in to create a ticket.");
            return;
        }

        const submitFormData = new FormData();
        submitFormData.append("subject", formData.subject);
        submitFormData.append("description", formData.description);
        submitFormData.append("message", formData.message);
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
                setFormData({ subject: "", description: "", message: "", images: [] });
                setIsCreating(false);
                fetchUserTickets();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Failed to create ticket.");
            console.error(error);
        }
    };
    

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'text-green-500';
            case 'pending': return 'text-yellow-500';
            case 'closed': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const filteredTickets = tickets.filter((ticket) => {
        const subject = ticket.subject?.toLowerCase() || '';
        const ticketId = ticket._id?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return subject.includes(search) || ticketId.includes(search);
    });

    return (
        <div className="min-h-screen bg-pink-50/50 font-sans py-12 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-800">Support Center</h1>
                    <p className="mt-2 text-lg text-gray-600">Your tickets and our support resources.</p>
                </motion.div>

                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-semibold text-gray-800">My Tickets</h2>
                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Search by subject or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 flex-1 md:w-64"
                            />
                            <button
                                onClick={fetchUserTickets}
                                className="bg-blue-500 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-600 transition-colors"
                            >
                                Refresh
                            </button>
                            <button onClick={() => setIsCreating(!isCreating)} className="bg-pink-500 text-white py-2 px-4 rounded-md font-semibold hover:bg-pink-600 transition-colors flex items-center space-x-2">
                                <Plus size={20} />
                                <span>{isCreating ? 'Cancel' : 'New Ticket'}</span>
                            </button>
                        </div>
                    </div>

                    {isCreating && (
                         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8">
                            <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-gray-50 rounded-lg">
                                <FormInput label="Subject" name="subject" value={formData.subject} onChange={handleChange} placeholder="e.g., Issue with my order" required />
                                <FormInput label="Description" name="description" value={formData.description} onChange={handleChange} placeholder="A brief summary of your issue" required />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Please provide all the details here..." rows="5" required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"></textarea>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Attach Photos (Max 2)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageChange}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                                        disabled={formData.images.length >= 2}
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.images.map((image, index) => (
                                            <div key={index} className="relative w-24 h-24 border rounded-md overflow-hidden">
                                                <img src={URL.createObjectURL(image)} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(index)}
                                                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-pink-500 text-white py-3 rounded-md font-semibold text-lg hover:bg-pink-600 transition-colors flex items-center justify-center space-x-2">
                                    <Send size={20} />
                                    <span>Create Ticket</span>
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {loading ? <p>Loading your tickets...</p> : !token ? (
                        <p className="text-center text-gray-500 py-8">Please log in to view or create support tickets.</p>
                    ) : filteredTickets.length > 0 ? (
                        <div className="space-y-4">
                            {filteredTickets.map(ticket => (
                                <div key={ticket._id} onClick={() => setSelectedTicket(ticket)} className="bg-white border border-gray-200 p-4 rounded-lg cursor-pointer hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-gray-800">{ticket.subject}</p>
                                            <p className="text-sm text-gray-500">Last updated: {new Date(ticket.updatedAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-semibold capitalize ${getStatusColor(ticket.status)}`}>{ticket.status}</p>
                                            <p className="text-sm text-gray-500">ID: #{ticket._id.slice(-6)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">You have no support tickets.</p>
                    )}
                </div>
            </div>

            {selectedTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Ticket #{selectedTicket._id.slice(-6)}</h3>
                            <button onClick={() => setSelectedTicket(null)} className="text-gray-500 hover:text-gray-800 text-xl font-bold">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><p><strong>Subject:</strong> {selectedTicket.subject}</p></div>
                            <div><p><strong>Description:</strong> {selectedTicket.description}</p></div>
                            <div className='space-y-2'>
                                {selectedTicket.messages.map((msg, index) => (
                                    <div key={index} className={`p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'} max-w-[80%] flex flex-col`}>
                                        <span className='font-bold text-xs capitalize'>{msg.sender}</span>
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
                                ))}
                            </div>
                            {selectedTicket.status === 'closed' ? (
                                <div className='mt-4 p-4 bg-gray-100 text-gray-700 rounded-md text-center'>
                                    <p className='font-semibold'>Conversation is ended.</p>
                                    <p>Please create a new ticket for further issues.</p>
                                </div>
                            ) : (
                                <div className='flex flex-col gap-2 mt-4 pt-4 border-t border-gray-200'>
                                    {/* Attachment previews for current message */}
                                    {currentAttachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {currentAttachments.map((file, index) => (
                                                <div key={index} className="relative w-20 h-20 border rounded-md overflow-hidden">
                                                    <img src={URL.createObjectURL(file)} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveCurrentAttachment(index)}
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
                                            ref={fileInputRef}
                                            accept="image/*"
                                            multiple
                                            onChange={handleCurrentAttachmentsChange}
                                            className="hidden" // Hide the actual file input
                                            disabled={currentAttachments.length >= 2}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            className="bg-gray-200 text-gray-700 p-2 rounded-md hover:bg-gray-300 transition-colors"
                                            title="Attach files"
                                            disabled={currentAttachments.length >= 2}
                                        >
                                            <Paperclip size={20} />
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
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        />
                                        <button
                                            onClick={() => handleSendMessage(selectedTicket._id)}
                                            className="bg-pink-500 text-white p-2 rounded-md hover:bg-pink-600 transition-colors"
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
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
                </div>
            )}
        </div>
    );
};

const FormInput = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input {...props} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
    </div>
);

export default Support;
