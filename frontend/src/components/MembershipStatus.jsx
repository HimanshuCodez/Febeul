import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, Calendar, Gift, Zap, Truck, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const MembershipStatus = ({ user }) => {
  if (user && user.isLuxeMember) {
    const expiryDate = user.luxeMembershipExpires && !isNaN(new Date(user.luxeMembershipExpires))
      ? new Date(user.luxeMembershipExpires).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'N/A';

    const giftWrapsLeft = user.giftWrapsLeft !== undefined ? user.giftWrapsLeft : 15;
    const totalWraps = 15;
    const wrapsUsed = totalWraps - giftWrapsLeft;
    const usagePercentage = (giftWrapsLeft / totalWraps) * 100;

    return (
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl mb-8 border border-pink-100">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-50 rounded-full -mr-32 -mt-32 opacity-50" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-50 rounded-full -ml-16 -mb-16 opacity-50" />

        <div className="relative p-6 sm:p-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-3 rounded-xl shadow-lg shadow-pink-200">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Febeul Luxe</h3>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <Calendar size={14} className="mr-1.5 text-pink-500" />
                  <span>Valid until <span className="font-semibold text-gray-700">{expiryDate}</span></span>
                </div>
              </div>
            </div>
            <div className="px-4 py-1.5 bg-pink-50 text-pink-600 rounded-full text-xs font-bold uppercase tracking-wider border border-pink-100">
              Active Member
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Gift Wraps Stat */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-gray-600 uppercase tracking-tight">Free Gift Wraps</span>
                <Gift size={18} className="text-pink-500" />
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-black text-gray-900">{giftWrapsLeft}</span>
                <span className="text-gray-400 font-medium text-sm">/ {totalWraps} left</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full"
                />
              </div>
            </div>

            {/* Benefit 1 */}
            <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <div className="bg-white p-2.5 rounded-lg shadow-sm">
                <Truck className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Priority Delivery</p>
                <p className="text-xs text-gray-500 mt-0.5 font-medium italic">Active on all orders</p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <div className="bg-white p-2.5 rounded-lg shadow-sm">
                <Zap className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Exclusive Early Access</p>
                <p className="text-xs text-gray-500 mt-0.5 font-medium italic">New collections unlocked</p>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100 opacity-60">
            <ShieldCheck size={16} className="text-green-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Premium Verified Membership</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white to-pink-50/30 rounded-2xl shadow-lg p-8 mb-8 border border-pink-100 text-center">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-100/50 rounded-full blur-3xl" />
      
      <div className="inline-block bg-pink-100 p-4 rounded-2xl mb-6">
        <Crown className="w-10 h-10 text-pink-500" />
      </div>
      
      <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Elevate Your Experience</h3>
      <p className="text-gray-600 max-w-md mx-auto mb-8 font-medium leading-relaxed">
        Join <span className="text-pink-500 font-bold">Febeul Luxe</span> and unlock premium benefits including 15 monthly gift wraps, priority shipping, and member-only early access.
      </p>
      
      <Link
        to="/luxe"
        className="inline-flex items-center justify-center bg-gray-900 text-white font-bold py-4 px-10 rounded-full shadow-xl hover:bg-pink-600 transform hover:-translate-y-1 transition-all duration-300 gap-2 group"
      >
        <span>Join Febeul Luxe</span>
        <Zap className="w-4 h-4 text-yellow-400 group-hover:scale-125 transition-transform" />
      </Link>
    </div>
  );
};

export default MembershipStatus;
