import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, Calendar, Gift, Zap, Truck, ShieldCheck, RefreshCw, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const MembershipStatus = ({ user }) => {
  const isActive = user && user.isLuxeMember;
  const hasExpiry = user && user.luxeMembershipExpires;
  const isExpired = !isActive && hasExpiry && new Date() >= new Date(user.luxeMembershipExpires);
  const hasMembershipHistory = isActive || hasExpiry;

  let purchaseDate = 'N/A';
  let expiryDate = 'N/A';

  if (hasMembershipHistory && user.luxeMembershipExpires) {
    const expiryDateObj = new Date(user.luxeMembershipExpires);
    const purchaseDateObj = new Date(expiryDateObj);
    purchaseDateObj.setMonth(purchaseDateObj.getMonth() - 1);

    purchaseDate = !isNaN(purchaseDateObj.getTime())
      ? purchaseDateObj.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'N/A';

    expiryDate = !isNaN(expiryDateObj.getTime())
      ? expiryDateObj.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'N/A';
  }

  if (isActive) {
    const giftWrapsLeft = user.giftWrapsLeft !== undefined ? user.giftWrapsLeft : 15;
    const totalWraps = 15;
    const usagePercentage = (giftWrapsLeft / totalWraps) * 100;

    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1b1112] via-[#2a1719] to-[#120a0b] rounded-3xl shadow-2xl mb-8 border border-amber-500/20 text-left">
        {/* Shimmer / Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/10 to-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-rose-500/10 to-transparent rounded-full -ml-20 -mb-20 blur-3xl pointer-events-none" />
        
        {/* Diagonal Light Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ rotate: 15, scale: 1.05 }}
                className="bg-gradient-to-br from-amber-400 via-rose-500 to-pink-600 p-3.5 rounded-2xl shadow-xl shadow-pink-950/30"
              >
                <Crown className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-300 to-amber-100 flex items-center gap-2">
                  Febeul Luxe Member
                  <Star size={18} className="text-amber-300 fill-amber-300 animate-pulse" />
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-400 mt-1">
                  <span className="flex items-center">
                    <Calendar size={13} className="mr-1 text-rose-400" />
                    <span>Purchased: <span className="font-semibold text-gray-200">{purchaseDate}</span></span>
                  </span>
                  <span className="hidden sm:inline text-gray-700">|</span>
                  <span className="flex items-center">
                    <Calendar size={13} className="mr-1 text-rose-400" />
                    <span>Expires: <span className="font-semibold text-gray-200">{expiryDate}</span></span>
                  </span>
                </div>
              </div>
            </div>
            <span className="px-4 py-1.5 bg-gradient-to-r from-amber-400/20 to-rose-500/20 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-400/30 shadow-inner">
              Luxe Status Active
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Gift Wraps Stat */}
            <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Free Gift Wraps</span>
                <Gift size={18} className="text-rose-400" />
              </div>
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-4xl font-black text-white">{giftWrapsLeft}</span>
                <span className="text-gray-400 font-bold text-sm">/ {totalWraps} left</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercentage}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="bg-gradient-to-r from-amber-400 to-rose-500 h-2 rounded-full shadow-lg shadow-pink-500/20"
                />
              </div>
            </div>

            {/* Benefit 1 */}
            <div className="flex items-center gap-4 bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300">
              <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 p-3 rounded-xl border border-pink-500/10">
                <Truck className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Priority Delivery</p>
                <p className="text-xs text-gray-400 mt-1 font-medium">Free express shipping active</p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex items-center gap-4 bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300">
              <div className="bg-gradient-to-br from-amber-500/20 to-rose-500/20 p-3 rounded-xl border border-amber-500/10">
                <Zap className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Luxe Prive Access</p>
                <p className="text-xs text-gray-400 mt-1 font-medium">Early releases & boutique items</p>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="flex items-center justify-center gap-2 pt-5 border-t border-white/[0.05] opacity-80">
            <ShieldCheck size={16} className="text-amber-400" />
            <span className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest">Premium Luxe Verified Member</span>
          </div>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl mb-8 border border-gray-100 text-left">
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-50/50 rounded-full blur-2xl pointer-events-none" />
        <div className="relative p-6 sm:p-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-gray-150 p-3.5 rounded-2xl border border-gray-200 bg-gray-50">
                <Crown className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Febeul Luxe</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-500 mt-1">
                  <span className="flex items-center">
                    <Calendar size={13} className="mr-1 text-gray-450 text-gray-500" />
                    <span>Purchased: <span className="font-semibold text-gray-700">{purchaseDate}</span></span>
                  </span>
                  <span className="hidden sm:inline text-gray-300">|</span>
                  <span className="flex items-center">
                    <Calendar size={13} className="mr-1 text-gray-450 text-gray-500" />
                    <span>Expired: <span className="font-semibold text-gray-700">{expiryDate}</span></span>
                  </span>
                </div>
              </div>
            </div>
            <div className="px-4 py-1.5 bg-red-50 text-red-650 text-red-600 rounded-full text-xs font-bold uppercase tracking-wider border border-red-100">
              Expired
            </div>
          </div>

          {/* Renew Action Section */}
          <div className="bg-red-50/30 rounded-2xl p-5 border border-red-100/50 flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 leading-tight">Your Luxe Membership has expired</p>
              <p className="text-xs text-gray-500 mt-1.5 font-medium">Renew now to continue enjoying free gift wraps, priority delivery, and exclusive early access.</p>
            </div>
            <Link
              to="/luxe"
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-md transition-all active:scale-[0.98] text-center flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-pink-100"
            >
              <RefreshCw size={14} className="animate-spin-hover" />
              <span>Renew Membership</span>
            </Link>
          </div>

          {/* Verification Badge */}
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-150 opacity-60">
            <ShieldCheck size={16} className="text-gray-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Premium Membership Status</span>
          </div>
        </div>
      </div>
    );
  }

  // Never subscribed UI (Elegant promo invitation)
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white via-pink-50/20 to-rose-50/30 rounded-3xl shadow-xl p-8 mb-8 border border-pink-100/50 text-center">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-pink-200/40 to-amber-200/40 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-rose-200/30 rounded-full blur-2xl pointer-events-none" />
      
      <motion.div 
        whileHover={{ scale: 1.05, rotate: 5 }}
        className="inline-block bg-gradient-to-br from-pink-50 to-rose-100 p-4 rounded-3xl mb-6 shadow-sm border border-white"
      >
        <Crown className="w-10 h-10 text-pink-500" />
      </motion.div>
      
      <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Elevate Your Experience</h3>
      <p className="text-gray-600 max-w-md mx-auto mb-8 font-medium leading-relaxed text-sm">
        Join <span className="text-pink-500 font-extrabold">Febeul Luxe</span> and unlock premium benefits including 15 monthly gift wraps, priority shipping, and member-only early access.
      </p>
      
      <Link
        to="/luxe"
        className="inline-flex items-center justify-center bg-gray-900 hover:bg-pink-600 text-white font-bold py-4 px-10 rounded-full shadow-lg hover:shadow-pink-300/40 transform hover:-translate-y-1 transition-all duration-300 gap-2 group tracking-widest text-xs uppercase"
      >
        <span>Join Febeul Luxe</span>
        <Zap className="w-4 h-4 text-yellow-400 group-hover:scale-125 transition-transform" />
      </Link>
    </div>
  );
};

export default MembershipStatus;
