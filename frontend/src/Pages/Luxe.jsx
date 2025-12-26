import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Gift, Percent, Tag, Headphones, Package, Crown } from 'lucide-react';

const LuxePage = () => {
  const benefits = [
    { icon: Truck, title: 'Fast Priority Delivery', description: 'Get your orders delivered to you faster than anyone else.' },
    { icon: Gift, title: '15 Free Gift Wraps', description: 'Enjoy complimentary gift wraps for your presents.' },
    { icon: Percent, title: 'Luxe Privé Sales', description: 'Exclusive access to our private sales events.' },
    { icon: Tag, title: 'Coupons on Every Purchase', description: 'Receive special discount coupons with every order.' },
    { icon: Headphones, title: 'Dedicated Support', description: 'Get priority support from our dedicated customer service team.' },
    { icon: Crown, title: 'More Benifits', description: 'Unlock even more exclusive benefits and perks as a LUXE member.' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-16 md:mb-24"
        >
          <h1 className="text-5xl md:text-7xl font-extralight tracking-widest text-white">
            Febeu<span className="font-bold text-pink-400">LUXE</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-300">
            Unlock a world of exclusive benefits & elevate your shopping experience.
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5, boxShadow: '0px 20px 30px rgba(244, 114, 182, 0.2)' }}
              className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl flex flex-col items-center text-center transition-all duration-300 border border-gray-700 hover:border-pink-400"
            >
              <div className="text-pink-400 mb-5">
                <benefit.icon size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold mb-2 uppercase tracking-wider">
                {benefit.title}
              </h3>
              <p className="text-gray-400 text-sm">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.5 }}
          className="text-center mt-20 md:mt-28"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0px 10px 20px rgba(244, 114, 182, 0.3)' }}
            whileTap={{ scale: 0.95 }}
            className="bg-pink-500 text-white font-bold text-lg md:text-xl px-12 py-4 rounded-full shadow-lg transition-transform"
          >
            Become a LUXE Member
          </motion.button>
          <p className="text-gray-500 mt-4 text-xs">
            Join now for just $99/year. Terms and conditions apply.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LuxePage;