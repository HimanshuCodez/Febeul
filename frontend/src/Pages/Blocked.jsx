import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaBan, FaExclamationTriangle } from 'react-icons/fa';
import { Send } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function BlockedPage() {
  const { token } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketRaised, setTicketRaised] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please describe why your account should be unblocked.');
      return;
    }

    setIsSubmitting(true);
    const submitFormData = new FormData();
    submitFormData.append('subject', 'Account Blocked - Appeal');
    submitFormData.append('message', message);
    submitFormData.append('description', message);

    try {
      const response = await axios.post(`${backendUrl}/api/ticket/create`, submitFormData, {
        headers: {
          token,
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data.success) {
        toast.success('Appeal submitted!');
        setTicketRaised(true);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit your appeal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#1a0b0c] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10 text-center my-8"
      >
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
          className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <FaBan className="text-red-600 text-4xl" />
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Your Account Has Been Blocked
        </h1>
        <p className="text-gray-500 font-medium mt-3 leading-relaxed">
          Your account was blocked for repeatedly breaking our return policy.
          You will not be able to use the site until an admin reviews and unblocks your account.
        </p>

        <div className="mt-5 flex items-start gap-2 text-left bg-amber-50 border border-amber-100 rounded-xl p-3.5">
          <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" size={16} />
          <p className="text-xs text-amber-700 font-semibold">
            If you believe this is a mistake, raise a ticket below to appeal — our support team will review your case.
          </p>
        </div>

        {ticketRaised ? (
          <div className="mt-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
            <p className="font-bold text-emerald-700">Appeal submitted successfully.</p>
            <p className="text-xs text-emerald-600 mt-1">Our support team will get back to you soon. Please wait for your account to be reviewed.</p>
          </div>
        ) : showForm ? (
          <form onSubmit={handleSubmit} className="mt-6 text-left space-y-3">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
              Why should your account be unblocked?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Explain your situation here..."
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-pink-100 focus:border-pink-400 text-sm transition-all"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send size={16} />
              )}
              {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-black py-3.5 rounded-xl transition-colors uppercase tracking-widest text-sm"
          >
            Raise a Ticket
          </button>
        )}
      </motion.div>
    </div>
  );
}
