'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGift } from 'react-icons/fa'; // A nice gift box icon from react-icons (Game Icons)

export default function GiftWrapSelector() {
  const [selectedWrap, setSelectedWrap] = useState<string | null>(null);

  const wraps = [
    { id: 'luxury', name: 'Holiday Gift', price: '$5.00', description: 'Free Gift Wrap\nT&C Apply' },
    { id: 'standard', name: 'Holiday Gift', price: '$0.00', description: 'Free Gift Wrap\nT&C Apply' },
    { id: 'similar1', name: 'etc name', price: '', description: '' },
    { id: 'similar2', name: 'etc name', price: '', description: '' },
    { id: 'similar3', name: 'etc name', price: '', description: '' },
  ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-indigo-900 mb-12">
            Choose your gift wrap
          </h1>

          {/* Main Options */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-center text-indigo-800 mb-8 uppercase tracking-wider">
              Holiday Gift Wrapping
            </h2>

            <div className="grid md:grid-cols-2 gap-12">
              {wraps.slice(0, 2).map((wrap) => (
                <motion.div
                  key={wrap.id}
                  layout
                  className={`relative cursor-pointer rounded-2xl overflow-hidden shadow-xl ${
                    selectedWrap === wrap.id ? 'ring-4 ring-indigo-500' : ''
                  }`}
                  onClick={() => setSelectedWrap(wrap.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {/* Gift Box Image Placeholder with Icon */}
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 aspect-square flex items-center justify-center">
                    <FaGift className="w-64 h-64 text-white opacity-80" />
                  </div>

                  {/* Details Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-95 p-6">
                    <div className="flex justify-between items-center mb-2">
                      <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                        <option>Select Product</option>
                        <option>{wrap.name}</option>
                      </select>
                      <span className="font-bold text-lg">{wrap.price}</span>
                    </div>
                    <div className="text-sm text-gray-600 whitespace-pre-line">
                      {wrap.description}
                    </div>
                    <button className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition">
                      Add to Bag
                    </button>
                    {wrap.id === 'luxury' && (
                      <button className="mt-2 w-full border border-indigo-600 text-indigo-600 py-3 rounded-lg font-medium hover:bg-indigo-50 transition">
                        Join LUXE
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Similar Gift Wraps */}
          <section>
            <h3 className="text-xl font-medium text-center text-gray-700 mb-8">
              Similar gift wrap
            </h3>

            <div className="grid grid-cols-3 gap-8">
              {wraps.slice(2).map((wrap) => (
                <motion.div
                  key={wrap.id}
                  layout
                  className={`relative cursor-pointer rounded-xl overflow-hidden shadow-lg ${
                    selectedWrap === wrap.id ? 'ring-4 ring-indigo-500' : ''
                  }`}
                  onClick={() => setSelectedWrap(wrap.id)}
                  whileHover={{ scale: 1.1, y: -10 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  {/* Smaller Gift Box Placeholder */}
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 aspect-square flex items-center justify-center">
                    <FaGift className="w-32 h-32 text-white opacity-70" />
                  </div>

                  <div className="bg-white p-4 text-center">
                    <p className="font-medium">{wrap.name}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}