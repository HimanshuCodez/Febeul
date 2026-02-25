import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { backendUrl } from '../App'; // Assuming backendUrl is exported from App.jsx or similar config
import ProductCard from '../components/ProductCard'; // Assuming ProductCard is available
import { motion } from 'framer-motion';
import { Loader as LoaderIcon, XCircle } from 'lucide-react';

const Bestseller = () => {
  const [bestsellerProducts, setBestsellerProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBestsellerProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${backendUrl}/api/product/bestsellers`); // Use the new endpoint
      if (response.data.success) {
        setBestsellerProducts(response.data.products);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error("Error fetching bestseller products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBestsellerProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] bg-gray-50">
        <LoaderIcon className="animate-spin text-pink-500" size={48} />
        <p className="ml-3 text-lg text-gray-700">Loading bestsellers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-red-50 p-4 rounded-lg shadow-md m-6">
        <XCircle className="text-red-600 mb-4" size={64} />
        <p className="text-2xl text-red-800 font-bold mb-4">Error Loading Bestsellers</p>
        <p className="text-lg text-red-700 mb-6">{error}</p>
        <button
          onClick={fetchBestsellerProducts}
          className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-lg font-semibold"
        >
          <RefreshCcw size={20} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='text-4xl font-extrabold text-gray-800 mb-10 text-center'
      >
        🌟 Our Bestsellers 🌟
      </motion.h2>
      
      {bestsellerProducts.length > 0 ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6'>
          {bestsellerProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-lg shadow-md mx-auto max-w-xl">
          <XCircle className="mx-auto w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-2xl font-semibold text-gray-800 mb-2">No Bestsellers Found Yet</h3>
          <p className="text-gray-600 text-lg">Check back soon for our top picks!</p>
        </div>
      )}
    </div>
  );
};

export default Bestseller;
