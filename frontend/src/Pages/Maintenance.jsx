import React from 'react';
import { motion } from 'framer-motion';
import { IoSettingsSharp, IoSparklesSharp } from 'react-icons/io5';
import { FaHeart } from 'react-icons/fa';
import { RiSparklingFill } from "react-icons/ri";

export default function MaintenancePage() {
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
        duration: 0.5
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <div className="min-h-screen bg-[#1a0b0c] relative overflow-hidden flex items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Raleway:wght@700;900&display=swap');
        
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-rotate-slow {
          animation: rotate-slow 12s linear infinite;
        }
        
        .text-glow {
          text-shadow: 0 0 20px rgba(249, 174, 175, 0.4);
        }

        .bg-glow {
          background: radial-gradient(circle at center, rgba(224, 127, 130, 0.15) 0%, transparent 70%);
        }
      `}</style>

      {/* High-Impact Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#e07f82] opacity-10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#f9aeaf] opacity-10 blur-[150px] rounded-full" />
        
        {/* Floating Accents */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-[#f9aeaf] opacity-30"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, (Math.random() * -100) + "px"],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <IoSparklesSharp size={Math.random() * 20 + 10} />
          </motion.div>
        ))}
      </div>

      {/* Main Content Card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl w-full text-center px-4"
      >
        {/* Large Iconic Centerpiece */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center mb-12"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-30px] border-4 border-[#f9aeaf] border-double rounded-full opacity-20"
            />
            <div className="relative bg-gradient-to-br from-[#f9aeaf] to-[#e07f82] p-1 rounded-full shadow-[0_0_60px_rgba(224,127,130,0.3)]">
              <div className="bg-[#1a0b0c] rounded-full p-10 flex items-center justify-center">
                <IoSettingsSharp className="text-[#f9aeaf] text-7xl animate-rotate-slow" />
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute text-white"
                >
                  <FaHeart size={24} className="drop-shadow-[0_0_10px_#f9aeaf]" />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bold Brand Name */}
        <motion.div variants={itemVariants} className="mb-6">
          <span className="font-['Raleway'] tracking-[0.6em] text-[#f9aeaf] uppercase text-2xl font-black text-glow">
            FEBEUL
          </span>
        </motion.div>

        {/* Heavy High-Contrast Heading */}
        <motion.div variants={itemVariants}>
          <h1 className="font-['Cormorant_Garamond'] text-5xl md:text-8xl font-bold text-white mb-8 leading-tight tracking-tight">
            FEBEUL IS IN <br />
            <span className="text-[#f9aeaf] italic">MAINTENANCE</span>
          </h1>
        </motion.div>

        {/* Bold Subtitle (No fading) */}
        <motion.div 
          variants={itemVariants}
          className="max-w-2xl mx-auto"
        >
          <div className="h-1.5 w-32 bg-gradient-to-r from-transparent via-[#f9aeaf] to-transparent mx-auto mb-8" />
          <p className="font-['Raleway'] text-xl md:text-2xl text-white font-bold leading-relaxed">
            We're enhancing your shopping experience with new arrivals and refined features.
          </p>
          <p className="font-['Raleway'] text-[#f9aeaf] text-lg font-black mt-4 uppercase tracking-widest">
            STAY TUNED • RETURNING SOON
          </p>
        </motion.div>

        {/* Active Status Bar */}
        <motion.div 
          variants={itemVariants}
          className="mt-16 inline-flex items-center gap-4 px-10 py-4 bg-white/5 backdrop-blur-md rounded-2xl border-2 border-[#f9aeaf]/30 shadow-2xl"
        >
          <span className="flex h-4 w-4 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9aeaf] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#f9aeaf]"></span>
          </span>
          <span className="font-['Raleway'] text-sm md:text-base tracking-[0.2em] text-white uppercase font-black">
            Maintenance Mode Active
          </span>
        </motion.div>

        {/* Floating Sparkle Footer */}
        <motion.div 
          variants={itemVariants}
          className="mt-20 flex justify-center gap-16"
        >
          <RiSparklingFill className="text-[#f9aeaf] text-4xl animate-pulse" />
          <IoSparklesSharp className="text-white text-3xl animate-bounce" />
          <RiSparklingFill className="text-[#f9aeaf] text-4xl animate-pulse" />
        </motion.div>
      </motion.div>
    </div>
  );
}
