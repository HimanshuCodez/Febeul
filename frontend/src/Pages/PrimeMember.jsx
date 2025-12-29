import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCrown, FaStar, FaHeart, FaShoppingBag, FaGem, FaRegClock } from 'react-icons/fa';

const products = [
  {
    id: 1,
    name: "Élégance Serum",
    category: "Skincare",
    price: "$289",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop",
    exclusive: true
  },
  {
    id: 2,
    name: "Velvet Rose Parfum",
    category: "Fragrance",
    price: "$425",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop",
    exclusive: true
  },
  {
    id: 3,
    name: "Lumière Face Cream",
    category: "Skincare",
    price: "$340",
    image: "https://images.unsplash.com/photo-1556229010-aa3e89c4f6b9?w=400&h=400&fit=crop",
    exclusive: false
  },
  {
    id: 4,
    name: "Golden Essence Oil",
    category: "Treatment",
    price: "$510",
    image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop",
    exclusive: true
  },
  {
    id: 5,
    name: "Silk Touch Moisturizer",
    category: "Skincare",
    price: "$295",
    image: "https://images.unsplash.com/photo-1570194065650-d99fb4f9f41b?w=400&h=400&fit=crop",
    exclusive: false
  },
  {
    id: 6,
    name: "Diamond Glow Mask",
    category: "Treatment",
    price: "$380",
    image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop",
    exclusive: true
  }
];

const benefits = [
  { icon: FaGem, text: "Exclusive Product Access" },
  { icon: FaCrown, text: "Priority Customer Service" },
  { icon: FaStar, text: "Early Launch Previews" },
  { icon: FaRegClock, text: "Lifetime Warranty" }
];

export default function PrimeMember() {
  const [filter, setFilter] = useState('all');

  const filteredProducts = filter === 'all' 
    ? products 
    : products.filter(p => p.exclusive);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative py-20 px-6 text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff5f5 100%)' }}
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <FaCrown className="text-6xl mx-auto mb-4" style={{ color: '#f47b7d' }} />
          <h1 className="text-5xl font-light mb-4 tracking-wide text-gray-800">
            FEBEUL <span className="font-semibold">LUXE</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Curated Excellence for Distinguished Members
          </p>
        </motion.div>
      </motion.section>

      {/* Benefits */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {benefits.map((benefit, idx) => (
            <motion.div
              key={idx}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 + 0.3 }}
              className="text-center"
            >
              <benefit.icon className="text-4xl mx-auto mb-3" style={{ color: '#f47b7d' }} />
              <p className="text-sm text-gray-700 font-light">{benefit.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto flex justify-center gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-full text-sm font-light transition-all ${
              filter === 'all' 
                ? 'text-white shadow-lg' 
                : 'text-gray-700 bg-white hover:bg-gray-100'
            }`}
            style={filter === 'all' ? { backgroundColor: '#f47b7d' } : {}}
          >
            All Products
          </button>
          <button
            onClick={() => setFilter('exclusive')}
            className={`px-6 py-2 rounded-full text-sm font-light transition-all ${
              filter === 'exclusive' 
                ? 'text-white shadow-lg' 
                : 'text-gray-700 bg-white hover:bg-gray-100'
            }`}
            style={filter === 'exclusive' ? { backgroundColor: '#f47b7d' } : {}}
          >
            <FaGem className="inline mr-2" />
            Exclusive Only
          </button>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
            >
              {product.exclusive && (
                <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs text-white font-light"
                     style={{ backgroundColor: '#f47b7d' }}>
                  <FaGem className="inline mr-1" /> Exclusive
                </div>
              )}
              
              <div className="relative overflow-hidden aspect-square">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              </div>
              
              <div className="p-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  {product.category}
                </p>
                <h3 className="text-xl font-light text-gray-800 mb-3">
                  {product.name}
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-light" style={{ color: '#f47b7d' }}>
                    {product.price}
                  </span>
                  <button className="p-3 rounded-full hover:bg-gray-100 transition-colors">
                    <FaHeart className="text-gray-400 hover:text-red-400 transition-colors" />
                  </button>
                </div>
                <button 
                  className="w-full mt-4 py-3 rounded-full text-white font-light text-sm hover:shadow-lg transition-all duration-300"
                  style={{ backgroundColor: '#f47b7d' }}
                >
                  <FaShoppingBag className="inline mr-2" />
                  Add to Collection
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  );
}