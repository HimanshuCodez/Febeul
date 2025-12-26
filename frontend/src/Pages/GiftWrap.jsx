'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function GiftWrapSelector() {
  const [selectedWrap, setSelectedWrap] = useState(null);

  const wraps = [
    {
      id: 'luxury',
      name: 'Luxury Holiday Box',
      price: '$5.00',
      description: 'A beautiful rigid box with a magnetic closure and a satin ribbon. Includes a personalized card.',
      image: 'https://placehold.co/600x600/fecdd3/b91c1c?text=Luxury+Box'
    },
    {
      id: 'standard',
      name: 'Standard Festive Wrap',
      price: '$2.50',
      description: 'Classic festive-themed paper wrap with a matching gift tag.',
      image: 'https://placehold.co/600x600/f9a8d4/831843?text=Festive+Wrap'
    },
  ];

  const similarWraps = [
    {
      id: 'elegant',
      name: 'Elegant Gold',
      image: 'https://placehold.co/400x400/fde047/a16207?text=Gold'
    },
    {
      id: 'playful',
      name: 'Playful Polka',
      image: 'https://placehold.co/400x400/d8b4fe/581c87?text=Polka'
    },
    {
      id: 'minimalist',
      name: 'Minimalist Kraft',
      image: 'https://placehold.co/400x400/d2b48c/5d4037?text=Kraft'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-red-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 tracking-tight">
            Make it a Gift
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-600">
            Select the perfect wrapping for your special someone.
          </p>
        </motion.div>

        {/* Main Options */}
        <section className="mb-20">
          <div className="grid md:grid-cols-2 gap-10">
            {wraps.map((wrap) => (
              <motion.div
                key={wrap.id}
                layout
                className={`cursor-pointer rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
                  selectedWrap === wrap.id ? 'ring-4 ring-pink-400 shadow-2xl' : 'ring-1 ring-gray-200'
                }`}
                onClick={() => setSelectedWrap(wrap.id)}
                whileHover={{ y: -5 }}
              >
                <img src={wrap.image} alt={wrap.name} className="w-full h-80 object-cover" />
                
                <div className="p-6 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-2xl font-semibold text-gray-800">{wrap.name}</h2>
                    <span className="text-2xl font-bold text-gray-900">{wrap.price}</span>
                  </div>
                  <p className="text-gray-600 mb-6 min-h-[40px]">{wrap.description}</p>
                  
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold text-lg hover:bg-pink-600 transition-colors"
                  >
                    Add to Bag
                  </motion.button>

                  {wrap.id === 'luxury' && (
                    <Link to="/luxe">
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        className="mt-3 w-full border-2 border-pink-500 text-pink-500 py-3 rounded-lg font-semibold hover:bg-pink-50 transition-colors"
                      >
                        Learn about LUXE Benefits
                      </motion.button>
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Similar Gift Wraps */}
        <section>
          <motion.h3 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-semibold text-center text-gray-800 mb-10"
          >
            More Wrapping Options
          </motion.h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {similarWraps.map((wrap) => (
              <motion.div
                key={wrap.id}
                layout
                className={`cursor-pointer rounded-xl overflow-hidden shadow-md transition-all duration-300 ${
                  selectedWrap === wrap.id ? 'ring-4 ring-pink-400' : 'ring-1 ring-gray-200'
                }`}
                onClick={() => setSelectedWrap(wrap.id)}
                whileHover={{ y: -5, scale: 1.05 }}
              >
                <img src={wrap.image} alt={wrap.name} className="w-full h-48 object-cover" />
                <div className="p-4 bg-white text-center">
                  <p className="font-semibold text-gray-700">{wrap.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}