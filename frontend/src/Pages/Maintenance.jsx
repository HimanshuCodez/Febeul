import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { FaRocket, FaTools, FaBolt, FaStar, FaBell, FaEnvelope } from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';
import { BiTime } from 'react-icons/bi';
import { AiFillThunderbolt } from 'react-icons/ai';

export default function MaintenancePage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState({ days: 5, hours: 12, minutes: 34, seconds: 22 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        let { days, hours, minutes, seconds } = prev;
        
        if (seconds > 0) seconds--;
        else {
          seconds = 59;
          if (minutes > 0) minutes--;
          else {
            minutes = 59;
            if (hours > 0) hours--;
            else {
              hours = 23;
              if (days > 0) days--;
            }
          }
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleNotify = (e) => {
    if (e) e.preventDefault();
    if (email) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setEmail('');
      }, 3000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  const floatingAnimation = {
    y: [-10, 10, -10],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 0.5 + 0.5,
              opacity: Math.random() * 0.3
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
              rotate: [0, 360]
            }}
            transition={{
              duration: Math.random() * 20 + 15,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <div className="w-2 h-2 bg-white rounded-full blur-sm" />
          </motion.div>
        ))}
      </div>

      {/* Floating Icons Background */}
      <motion.div
        className="absolute top-20 left-10 text-white opacity-10"
        animate={floatingAnimation}
      >
        <FaRocket size={80} />
      </motion.div>
      
      <motion.div
        className="absolute bottom-20 right-10 text-white opacity-10"
        animate={{ ...floatingAnimation, transition: { ...floatingAnimation.transition, delay: 1 } }}
      >
        <FaBolt size={70} />
      </motion.div>

      <motion.div
        className="absolute top-1/2 left-20 text-white opacity-10"
        animate={{ ...floatingAnimation, transition: { ...floatingAnimation.transition, delay: 0.5 } }}
      >
        <IoSparkles size={60} />
      </motion.div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl w-full text-center"
      >
        {/* Rocket Icon with Glow */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center mb-8"
        >
          <motion.div
            animate={pulseAnimation}
            className="relative"
          >
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 rounded-full blur-3xl opacity-60 animate-pulse" />
                <div className="relative bg-white bg-opacity-20 backdrop-blur-xl rounded-full p-10 border-4 border-white border-opacity-30">
                  <FaRocket className="text-white text-7xl" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Main Heading */}
        <motion.div variants={itemVariants}>
          <motion.h1 
            className="text-7xl md:text-8xl font-black text-white mb-6 relative"
            style={{
              textShadow: '0 0 40px rgba(255,255,255,0.5)'
            }}
          >
            <motion.span
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                background: 'linear-gradient(90deg, #fff, #fbbf24, #ec4899, #a855f7, #3b82f6, #fff)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Coming Soon
            </motion.span>
          </motion.h1>
        </motion.div>

        {/* Subtitle */}
        <motion.div 
          variants={itemVariants}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <IoSparkles className="text-yellow-300 text-3xl" />
          </motion.div>
          <p className="text-2xl md:text-3xl text-purple-200 font-semibold">
            Something Incredible is Under Construction
          </p>
          <motion.div
            animate={{ rotate: [0, -360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <IoSparkles className="text-pink-300 text-3xl" />
          </motion.div>
        </motion.div>

        <motion.p 
          variants={itemVariants}
          className="text-lg md:text-xl text-blue-200 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          We're crafting an extraordinary experience just for you. Stay tuned for the grand launch!
        </motion.p>

        {/* Countdown Timer
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-4 gap-4 md:gap-8 mb-12 max-w-3xl mx-auto"
        >
          {[
            { label: 'Days', value: countdown.days },
            { label: 'Hours', value: countdown.hours },
            { label: 'Minutes', value: countdown.minutes },
            { label: 'Seconds', value: countdown.seconds }
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              whileHover={{ scale: 1.1 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative bg-white bg-opacity-10 backdrop-blur-xl rounded-2xl p-6 border-2 border-white border-opacity-20">
                <motion.div
                  key={item.value}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl md:text-5xl font-bold text-white mb-2"
                >
                  {String(item.value).padStart(2, '0')}
                </motion.div>
                <div className="text-sm md:text-base text-purple-200 font-medium uppercase tracking-wider">
                  {item.label}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div> */}

       

        {/* Bottom Icons */}
        <motion.div 
          variants={itemVariants}
          className="flex items-center justify-center gap-8 mt-16"
        >
          {[FaTools, AiFillThunderbolt, IoSparkles].map((Icon, idx) => (
            <motion.div
              key={idx}
              animate={{
                y: [-5, 5, -5],
                rotate: [0, 10, -10, 0]
              }}
              transition={{
                duration: 2,
                delay: idx * 0.3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Icon className="text-white text-4xl opacity-60" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}