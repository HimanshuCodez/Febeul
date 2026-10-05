import React, { useState, useEffect, useRef, useId } from "react";
import { motion as Motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
import MembershipWelcome from "./MembershipWelcome";

const benefits = [
  { name: "Priority Delivery", desc: "Shipped on the fast track", icon: Zap, color: "from-amber-400 to-orange-500" },
  { name: "15 Gift Wraps", desc: "Complimentary wrap option", icon: Gift, color: "from-pink-400 to-rose-500" },
  { name: "Luxe Prive", desc: "Access to prive sales", icon: Sparkles, color: "from-yellow-400 to-amber-500" },
  { name: "Order Rewards", desc: "Exclusive coupon deals", icon: Tag, color: "from-emerald-400 to-teal-500" },
  { name: "VIP Support", desc: "Dedicated fast assistance", icon: Headphones, color: "from-purple-400 to-indigo-500" },
  { name: "Free Shipping", desc: "Zero delivery fees always", icon: Truck, color: "from-cyan-400 to-blue-500" },
];

const FebeulMembershipWidget = ({ autoOpenDelay = null, centered = false }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, siteSettings } = useAuthStore();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const timerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion();

  const isLuxeMember = user?.isLuxeMember || false;
  const membershipPrice = siteSettings?.membershipPrice ?? 129;

  useEffect(() => {
    if (autoOpenDelay === null) return;

    timerRef.current = window.setTimeout(() => setOpen(true), autoOpenDelay);
    return () => window.clearTimeout(timerRef.current);
  }, [autoOpenDelay]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialogRef.current?.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      {/* Floating Diamond Button */}
      <Motion.div
        className="fixed bottom-[96px] right-6 z-[99]"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          type="button"
          aria-label="Open Luxe membership"
          aria-haspopup="dialog"
          onClick={() => {
            window.clearTimeout(timerRef.current);
            setOpen(true);
          }}
          className="relative bg-gradient-to-r from-pink-400 to-pink-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center border border-white/20"
        >
          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-full bg-pink-400 blur-sm opacity-40 motion-safe:animate-ping pointer-events-none"></span>
          {isLuxeMember ? (
            <Crown className="w-5 h-5 text-white" />
          ) : (
            <Gem className="w-5 h-5 text-white" />
          )}
        </button>
      </Motion.div>

      {/* Popup Modal */}
      <AnimatePresence onExitComplete={() => {
        dialogRef.current?.close();
        previousFocusRef.current?.focus({ preventScroll: true });
      }}>
        {open && (
            <Motion.dialog
              ref={dialogRef}
              aria-labelledby={titleId}
              onCancel={(event) => {
                event.preventDefault();
                setOpen(false);
              }}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                if (event.clientX < bounds.left || event.clientX > bounds.right ||
                    event.clientY < bounds.top || event.clientY > bounds.bottom) {
                  setOpen(false);
                }
              }}
              initial={{ scale: reduceMotion ? 1 : 0.95, opacity: 0, y: reduceMotion ? 0 : 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: reduceMotion ? 1 : 0.95, opacity: 0, y: reduceMotion ? 0 : 24 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
              className={`fixed p-0 text-slate-800 border backdrop:bg-[#240815]/60 backdrop:backdrop-blur-md ${centered
                ? "luxe-dialog inset-0 m-auto w-[calc(100%-1.5rem)] max-w-[420px] md:max-w-[880px] max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-[28px] border-white/90 bg-[#fff9fc]"
                : "left-auto top-auto bottom-24 right-4 sm:right-6 m-0 w-[calc(100%-2rem)] max-w-[380px] max-h-[75dvh] flex flex-col overflow-y-auto overscroll-contain rounded-3xl border-pink-100/50 bg-white shadow-2xl no-scrollbar"}`}
            >
              {centered ? (
                <MembershipWelcome
                  titleId={titleId}
                  benefits={benefits}
                  user={user}
                  isLuxeMember={isLuxeMember}
                  isAuthenticated={isAuthenticated}
                  membershipPrice={membershipPrice}
                  reduceMotion={reduceMotion}
                  onClose={() => setOpen(false)}
                  onJoin={() => {
                    navigate('/luxe');
                    setOpen(false);
                  }}
                />
              ) : (
              <>
              {/* Header block */}
              <div className={`relative overflow-hidden bg-gradient-to-br from-pink-400 to-pink-600 shrink-0 ${centered ? "min-h-44 md:row-span-2 md:min-h-full" : "h-36"}`}>
                <img
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop"
                  alt="Febeul Luxe Banner"
                  className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pink-950/60 via-pink-700/10 to-transparent"></div>
                {centered && (
                  <div aria-hidden="true" className="absolute inset-x-0 top-14 hidden flex-col items-center text-white md:flex">
                    <div className="flex h-24 w-24 rotate-12 items-center justify-center rounded-3xl border border-white/40 bg-white/15 shadow-xl backdrop-blur-md">
                      <Gem className="h-12 w-12 -rotate-12" strokeWidth={1.2} />
                    </div>
                    <span className="mt-7 text-xs font-semibold uppercase tracking-[0.4em] text-pink-100">A little more luxe</span>
                  </div>
                )}
                <div className={`text-white drop-shadow-md text-left ${centered ? "relative px-6 pb-6 pt-12 md:absolute md:bottom-10 md:left-8 md:right-8 md:p-0" : "absolute bottom-4 left-5"}`}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-100">Febeul Club</span>
                  <h2 id={titleId} className={`mt-1 ${centered ? "text-3xl font-medium leading-tight md:text-4xl" : "text-xl font-black"}`}>
                    {isLuxeMember ? "Luxe VIP Lounge" : "Luxe Membership"}
                    {!centered && (isLuxeMember ? " 👑" : " 💎")}
                  </h2>
                  {centered && (
                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-pink-50">
                      {isLuxeMember ? "Welcome back. Your favourite privileges are waiting for you." : "Because every shopping moment deserves something special."}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close membership popup"
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white text-pink-900 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
              >
                <X size={18} />
              </button>

              {/* Conditional body based on VIP status */}
              {isLuxeMember ? (
                <div className={`p-5 space-y-5 flex-1 ${centered ? "md:px-7 md:pt-14" : ""}`}>
                  {/* Gold VIP Member Card */}
                  <Motion.div
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
                  </Motion.div>

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
                  <div className={`p-5 text-center shrink-0 ${centered ? "md:px-7 md:pt-12" : ""}`}>
                    {centered && (
                      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-pink-100 bg-pink-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-pink-600">
                        <Sparkles size={12} /> Your VIP invitation
                      </span>
                    )}
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
                      Join Luxe for ₹{membershipPrice}/mo
                    </button>
                    {centered && (
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="mt-3 text-xs font-semibold text-slate-500 underline-offset-4 transition hover:text-pink-600 hover:underline"
                      >
                        Maybe later, keep exploring
                      </button>
                    )}
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
                          <Motion.div
                            key={benefit.name}
                            initial={{ opacity: 0, y: reduceMotion ? 0 : 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: reduceMotion ? 0 : i * 0.05 }}
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
                          </Motion.div>
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
              </>
              )}
            </Motion.dialog>
        )}
      </AnimatePresence>
    </>
  );
};

export default FebeulMembershipWidget;
