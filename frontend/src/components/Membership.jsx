import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, X } from "lucide-react";

const levels = [
  { name: "Bronze", color: "text-amber-600", spend: "₹1,000" },
  { name: "Silver", color: "text-gray-400", spend: "₹3,000" },
  { name: "Gold", color: "text-yellow-400", spend: "₹7,000" },
  { name: "Diamond", color: "text-pink-500", spend: "₹15,000" },
  { name: "Platinum", color: "text-indigo-400", spend: "₹25,000" },
];

const FebeulMembershipWidget = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Diamond Button */}
      <motion.div
        className="fixed bottom-[100px] right-8 z-[100]"
        whileHover={{ scale: 1.1 }}
      >
        <motion.button
          onClick={() => setOpen(!open)}
          className="relative bg-pink-500 text-white p-4 rounded-[20%] shadow-lg"
          initial={{ rotate: 45 }}
          animate={{ rotate: 45 }}
          transition={{ duration: 0.3 }}
        >
          {/* Glow Effect */}
          <motion.div
            className="absolute inset-0 rounded-[20%] bg-pink-400 blur-md opacity-50"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <motion.div className="relative rotate-[-45deg]">
            <Gem className="w-5 h-5 text-white" />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Popup Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Background Blur */}
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Popup */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 100 }}
              transition={{ type: "spring", stiffness: 120 }}
              className="fixed bottom-24 right-8 w-[360px] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="relative h-40 bg-gradient-to-br from-pink-400 to-pink-600">
                <motion.img
                  src="https://images.unsplash.com/photo-1618354691373-46e92e5a0a89?w=800&q=80"
                  alt="Febeul Model"
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                />
                <div className="absolute inset-0 bg-pink-600/40"></div>
                <div className="absolute bottom-4 left-4 text-white drop-shadow-lg">
                  <h2 className="text-sm opacity-80">Welcome to</h2>
                  <h1 className="text-2xl font-bold">Febeul Membership</h1>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-3 right-3 bg-white/30 text-white p-1 rounded-full hover:bg-white/60"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 text-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  Become a member
                </h3>
                <p className="text-gray-500 text-sm mt-1 mb-4">
                  Unlock exclusive Febeul perks and earn rewards with every
                  purchase 💖
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="bg-pink-500 text-white w-full py-3 rounded-full font-semibold shadow-md hover:bg-pink-600"
                >
                  Join now
                </motion.button>
                <p className="text-gray-500 text-sm mt-3">
                  Already have an account?{" "}
                  <a href="#" className="text-pink-600 font-medium hover:underline">
                    Sign in
                  </a>
                </p>
              </div>

              {/* Membership Levels */}
              <div className="bg-gray-50 p-5">
                <h4 className="text-left text-gray-700 font-semibold mb-3">
                  VIP Levels
                </h4>
                <div className="space-y-2">
                  {levels.map((lvl, i) => (
                    <motion.div
                      key={lvl.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex justify-between items-center bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-2">
                        <Gem className={`${lvl.color} w-5 h-5`} />
                        <span className="font-medium text-gray-700">{lvl.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Spend {lvl.spend}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center py-3 border-t text-gray-400 text-sm">
                💎 Febeul Rewards
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default FebeulMembershipWidget;
