import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaShoppingBag, FaClipboardList } from 'react-icons/fa';
import { useLocation, Link, useNavigate } from 'react-router-dom';

const CONFETTI_COLORS = ['#e8767a', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
const REDIRECT_DELAY_MS = 4000;

// Bursts colorful confetti pieces outward from the center, then lets them
// fall and fade — a lightweight, dependency-free party-popper effect.
const ConfettiBurst = () => {
  const pieces = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 640,
    riseY: -(120 + Math.random() * 160),
    fallY: 260 + Math.random() * 220,
    rotate: Math.random() * 720 - 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.35,
    size: 6 + Math.random() * 9,
    isCircle: Math.random() > 0.5
  })), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: [1, 1, 0], x: p.x, y: [0, p.riseY, p.fallY], rotate: p.rotate }}
          transition={{ duration: 1.9, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '18%',
            left: '50%',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : '2px'
          }}
        />
      ))}
    </div>
  );
};

export default function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { order } = location.state || {};

  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/myorders');
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [navigate]);

  const orderNumber = order?._id;

  return (
    <div className="min-h-screen bg-[#f9aeaf] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="relative bg-white rounded-3xl shadow-2xl p-10 sm:p-14 text-center max-w-md w-full overflow-hidden"
      >
        <ConfettiBurst />

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
          className="inline-block relative z-10"
        >
          <FaCheckCircle className="text-8xl text-green-500 mx-auto" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-3xl font-black text-gray-900 mt-6 tracking-tight relative z-10"
        >
          🎉 Order Placed Successfully!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-gray-500 mt-3 font-medium relative z-10"
        >
          Thank you for shopping with us — your order is confirmed.
        </motion.p>

        {orderNumber && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.75 }}
            className="mt-6 p-4 bg-[#fff5f5] border-2 border-[#e8767a] rounded-2xl relative z-10"
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</p>
            <p className="text-sm font-bold text-[#e8767a] break-all select-all font-mono mt-1">{orderNumber}</p>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-xs text-gray-400 font-semibold mt-6 relative z-10"
        >
          Redirecting you to My Orders...
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row gap-3 mt-6 relative z-10"
        >
          {orderNumber && (
            <button
              onClick={() => navigate(`/order-detail/${orderNumber}`)}
              className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-3 px-5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <FaClipboardList /> View Order
            </button>
          )}
          <Link to="/" className="flex-1">
            <button className="w-full bg-[#e8767a] hover:bg-[#d5666a] text-white font-bold py-3 px-5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              <FaShoppingBag /> Continue Shopping
            </button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
