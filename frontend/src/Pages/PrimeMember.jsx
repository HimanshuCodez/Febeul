import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Zap, Gift, Truck, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';

export default function PrimeMember() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is not authenticated or not a Luxe member, redirect to profile or home
    if (user && !user.isLuxeMember) {
      const timer = setTimeout(() => {
        navigate('/profile');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-pink-50/20 to-rose-50/30 flex flex-col justify-center items-center px-6 py-12 font-sans relative overflow-hidden">
      {/* Sparkles / Background Accents */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-pink-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-rose-100/30 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-pink-100 text-center relative z-10"
      >
        {/* Crown Icon with glowing animation */}
        <div className="relative inline-block mb-6">
          <motion.div
            animate={{ 
              boxShadow: ["0 0 0px #ec4899", "0 0 25px #ec4899", "0 0 0px #ec4899"],
              scale: [1, 1.08, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="bg-gradient-to-br from-pink-500 to-rose-600 p-5 rounded-2xl shadow-xl shadow-pink-200"
          >
            <Crown className="w-12 h-12 text-white" />
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full border-2 border-white"
          >
            <CheckCircle2 size={16} />
          </motion.div>
        </div>

        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome to Luxe!</h1>
        <p className="text-pink-600 font-bold text-sm tracking-widest uppercase mb-6">Febeul Luxe Member Active</p>
        
        <p className="text-slate-600 font-medium leading-relaxed mb-8">
          Thank you for joining our elite club. Your premium benefits are now active on your account!
        </p>

        {/* Benefits Quick list */}
        <div className="space-y-4 mb-10 text-left bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-pink-100 p-1.5 rounded-lg text-pink-600">
              <Gift size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">15 Free Gift Wraps</p>
              <p className="text-[11px] text-slate-500 font-semibold">Available automatically at checkout</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-pink-100 p-1.5 rounded-lg text-pink-600">
              <Truck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Priority Delivery</p>
              <p className="text-[11px] text-slate-500 font-semibold">Your orders are fast-tracked and processed first</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-pink-100 p-1.5 rounded-lg text-pink-600">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Early Collection Access</p>
              <p className="text-[11px] text-slate-500 font-semibold">Unlock Luxe Prive collections instantly</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            to="/profile"
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl text-sm shadow-lg hover:bg-pink-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            <span>Go to My Profile</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/"
            className="w-full py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all active:scale-[0.98]"
          >
            Continue Shopping
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
