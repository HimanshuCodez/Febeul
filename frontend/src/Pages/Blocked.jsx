import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBan } from 'react-icons/fa';
import { Send, ImagePlus, X, Clock, CalendarCheck2, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  : null;

export default function BlockedPage() {
  const { token, user, getProfile } = useAuthStore();
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const blockedAt = user?.blockedAt;
  const activeAt = user?.activeAt;
  const lastAppealAt = user?.lastAppealAt;

  const refTime = Math.max(
    lastAppealAt ? new Date(lastAppealAt).getTime() : 0,
    activeAt ? new Date(activeAt).getTime() : 0
  );
  const nextEligibleAt = refTime > 0 ? new Date(refTime + COOLDOWN_MS) : null;
  const canAppeal = !justSubmitted && (!nextEligibleAt || Date.now() >= nextEligibleAt.getTime());

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages((prev) => [...prev, ...files].slice(0, 2));
    e.target.value = '';
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please describe why your account should be unblocked.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please provide a phone number so we can reach you.');
      return;
    }

    setIsSubmitting(true);
    const submitFormData = new FormData();
    submitFormData.append('message', message);
    submitFormData.append('phone', phone);
    images.forEach((image) => submitFormData.append('images', image));

    try {
      const response = await axios.post(`${backendUrl}/api/ticket/appeal`, submitFormData, {
        headers: { token, 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        toast.success('Appeal submitted!');
        setJustSubmitted(true);
        getProfile();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit your appeal. Please try again.');
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
        className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl p-5 sm:p-7 my-8"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"
          >
            <FaBan className="text-red-600 text-3xl sm:text-4xl" />
          </motion.div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Your Account Has Been Blocked
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-2 leading-relaxed">
            You won't be able to use the site until an admin reviews and unblocks your account.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Blocked On</p>
            <p className="text-xs font-bold text-slate-700 mt-1">{formatDate(blockedAt) || '—'}</p>
          </div>
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Active</p>
            <p className="text-xs font-bold text-slate-700 mt-1">{formatDate(activeAt) || '—'}</p>
          </div>
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Appeal</p>
            <p className="text-xs font-bold text-slate-700 mt-1">{formatDate(lastAppealAt) || '—'}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {justSubmitted ? (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-5 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl overflow-hidden"
            >
              <p className="font-bold text-emerald-700 text-sm">Appeal submitted successfully.</p>
              <p className="text-xs text-emerald-600 mt-1">Our support team will get back to you soon. Please wait for your account to be reviewed.</p>
            </motion.div>
          ) : !canAppeal ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-5 p-4 bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden flex items-start gap-2.5"
            >
              <Clock className="text-amber-500 mt-0.5 shrink-0" size={16} />
              <div>
                <p className="text-sm font-bold text-amber-700">You've already appealed recently.</p>
                <p className="text-xs text-amber-600 mt-1">
                  Only one appeal is allowed every 30 days. You can appeal again on{' '}
                  <span className="font-black">{formatDate(nextEligibleAt)}</span>.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-5 space-y-3.5 p-4 sm:p-5 bg-slate-50/60 border border-slate-100 rounded-2xl overflow-hidden"
            >
              <div className="flex items-start gap-2 text-left bg-white border border-amber-100 rounded-xl p-2.5">
                <ShieldAlert className="text-amber-500 mt-0.5 shrink-0" size={14} />
                <p className="text-xs text-amber-700 font-semibold">
                  If you believe this is a mistake, submit an appeal below — our support team will review your case.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3.5">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Why should your account be unblocked?
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Explain your situation here..."
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-pink-100 focus:border-pink-400 text-sm transition-all resize-none"
                  />
                </div>

                <div className="sm:w-40">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-pink-100 focus:border-pink-400 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Attach Photos (Optional, Max 2)</label>
                <div className="flex flex-wrap items-center gap-2">
                  {images.map((image, index) => (
                    <div key={index} className="relative w-14 h-14 border border-slate-200 rounded-xl overflow-hidden shadow-sm shrink-0">
                      <img src={URL.createObjectURL(image)} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {images.length < 2 && (
                    <label className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-pink-300 hover:bg-pink-50/40 transition-colors shrink-0">
                      <ImagePlus className="text-slate-400" size={16} />
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                  <span className="text-xs text-slate-400 font-medium">Up to 2 photos</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-pink-100 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send size={16} />
                )}
                <span>{isSubmitting ? 'Submitting...' : 'Submit Appeal'}</span>
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {(canAppeal === false || justSubmitted) && nextEligibleAt && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-semibold">
            <CalendarCheck2 size={12} />
            <span>Next appeal available: {formatDate(nextEligibleAt)}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
