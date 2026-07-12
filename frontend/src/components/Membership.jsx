import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gem, 
  X, 
  Crown, 
  Zap, 
  Gift, 
  Sparkles, 
  Tag, 
  Headphones, 
  Truck 
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const benefits = [
  { name: "Priority Delivery", desc: "Shipped on the fast track", icon: Zap, color: "from-amber-400 to-orange-500" },
  { name: "15 Gift Wraps", desc: "Complimentary wrap option", icon: Gift, color: "from-pink-400 to-rose-500" },
  { name: "Luxe Prive", desc: "Access to prive sales", icon: Sparkles, color: "from-yellow-400 to-amber-500" },
  { name: "Order Rewards", desc: "Exclusive coupon deals", icon: Tag, color: "from-emerald-400 to-teal-500" },
  { name: "VIP Support", desc: "Dedicated fast assistance", icon: Headphones, color: "from-purple-400 to-indigo-500" },
  { name: "Free Shipping", desc: "Zero delivery fees always", icon: Truck, color: "from-cyan-400 to-blue-500" },
];

const FebeulMembershipWidget = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);

  const isLuxeMember = user?.isLuxeMember || false;

  return (
    <>
      {/* Floating Diamond Button */}
      <motion.div
        className="fixed bottom-[96px] right-6 z-[99]"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={() => setOpen(!open)}
          className="relative bg-gradient-to-r from-pink-400 to-pink-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center border border-white/20"
        >
          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-full bg-pink-400 blur-sm opacity-40 animate-ping pointer-events-none"></span>
          {isLuxeMember ? (
            <Crown className="w-5 h-5 text-white" />
          ) : (
            <Gem className="w-5 h-5 text-white" />
          )}
        </button>
      </motion.div>

      {/* Popup Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Background Blur */}
            <motion.div
              className="fixed inset-0 bg-black/35 backdrop-blur-sm z-[98]"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Popup Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="fixed bottom-24 right-6 w-[340px] sm:w-[380px] max-h-[75vh] bg-white rounded-3xl shadow-2xl z-[99] overflow-y-auto border border-pink-100/50 flex flex-col scrollbar-none"
            >
              {/* Header block */}
              <div className="relative h-36 bg-gradient-to-br from-pink-400 to-pink-600 shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop"
                  alt="Febeul Luxe Banner"
                  className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pink-600/50 to-transparent"></div>
                <div className="absolute bottom-4 left-5 text-white drop-shadow-md text-left">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-100">Febeul Club</span>
                  <h1 className="text-xl font-black mt-0.5 flex items-center gap-1.5">
                    {isLuxeMember ? "Luxe VIP Lounge 👑" : "Luxe Membership 💎"}
                  </h1>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white w-7 h-7 rounded-full flex items-center justify-center transition border border-white/10"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Conditional body based on VIP status */}
              {isLuxeMember ? (
                <div className="p-5 space-y-5 flex-1">
                  {/* Gold VIP Member Card */}
                  <motion.div 
                    whileHover={{ y: -3 }}
                    className="relative h-44 rounded-2xl bg-gradient-to-tr from-amber-300 via-amber-400 to-yellow-500 p-5 text-white text-left shadow-lg overflow-hidden border border-amber-300"
                  >
                    <div className="absolute right-[-10px] top-[-10px] w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-950/70">Luxe Member</span>
                        <h2 className="text-lg font-black tracking-tight mt-0.5">FEBEUL LUXE VIP</h2>
                      </div>
                      <Crown className="w-7 h-7 text-amber-950/80 drop-shadow" />
                    </div>

                    <div className="mt-8">
                      <p className="text-[8px] uppercase font-black tracking-wider text-amber-900/60">Account Holder</p>
                      <p className="text-sm font-extrabold tracking-wide mt-0.5">{user?.name || "VIP Shopper"}</p>
                    </div>

                    <div className="absolute bottom-4 right-4 text-right">
                      <span className="inline-flex items-center gap-1 bg-amber-950/15 backdrop-blur-sm px-2.5 py-1 rounded-full text-[9px] font-black uppercase text-amber-950">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Active VIP
                      </span>
                    </div>
                  </motion.div>

                  <div className="text-left space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Member Benefits</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-3 p-2.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                        <span className="p-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-lg shrink-0"><Zap className="w-3.5 h-3.5" /></span>
                        <div>
                          <p className="text-[11px] font-black text-amber-900 leading-none">Priority Delivery Enabled</p>
                          <p className="text-[9px] text-amber-800/80 mt-0.5">Your parcels are fast-tracked first</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                        <span className="p-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-lg shrink-0"><Gift className="w-3.5 h-3.5" /></span>
                        <div>
                          <p className="text-[11px] font-black text-amber-900 leading-none">15 Gift Wraps Enabled</p>
                          <p className="text-[9px] text-amber-800/80 mt-0.5">Apply free wrap designs during checkout</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigate('/luxe');
                      setOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all mt-2"
                  >
                    View Luxe Products
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Non-member offer */}
                  <div className="p-5 text-center shrink-0">
                    <h3 className="text-base font-black text-slate-800">
                      Unlock Luxe VIP Privileges
                    </h3>
                    <p className="text-slate-500 text-xs mt-1 mb-4 leading-relaxed font-semibold">
                      Unlock elite shopping perks, free priority shipping, and premium gift packaging rewards 💖
                    </p>
                    <button
                      onClick={() => {
                        navigate('/luxe');
                        setOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all"
                    >
                      Join Luxe for ₹129/mo
                    </button>
                    {!isAuthenticated && (
                      <p className="text-slate-400 text-xs mt-3 font-semibold">
                        Already a member?{" "}
                        <Link 
                          to="/auth" 
                          className="text-[#e8767a] hover:text-rose-600 font-bold hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          Sign In
                        </Link>
                      </p>
                    )}
                  </div>

                  {/* Benefits Grid */}
                  <div className="bg-slate-50 p-5 flex-1 border-t border-slate-100">
                    <h4 className="text-left text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                      Exclusive Perks
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-left">
                      {benefits.map((benefit, i) => {
                        const Icon = benefit.icon;
                        return (
                          <motion.div
                            key={benefit.name}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col justify-between"
                          >
                            <span className={`w-8 h-8 rounded-lg bg-gradient-to-r ${benefit.color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <div className="mt-3">
                              <p className="text-xs font-black text-slate-800 leading-tight">
                                {benefit.name}
                              </p>
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-tight">
                                {benefit.desc}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom tag */}
              <div className="text-center py-3.5 border-t border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider bg-slate-50 shrink-0">
                💎 Febeul VIP Rewards Club
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default FebeulMembershipWidget;
