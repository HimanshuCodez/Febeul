import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';

const backendUrl = import.meta.env.VITE_BACKEND_URL; // Declare backendUrl here

const NewAndNow = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${backendUrl}/api/product/list`);
        if (response.data.success) {
          // No need for frontend filtering, backend already handled it
          setProducts(response.data.products);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      }
    };

    fetchProducts();
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'newest':
        return new Date(b.date) - new Date(a.date);
      default:
        return 0;
    }
  });

  return (
    <div className="py-12 bg-[#fafafa] min-h-screen">
      {loading && <Loader />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-center items-center gap-4 mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800">New Arrivals</h1>
          <img src="/new.gif" alt="NEW" className="h-10 sm:h-12 object-contain" />
        </div>
        <p className="text-center text-gray-600 mb-8">{products.length} products found</p>
        <div className="flex justify-end mb-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg outline-none cursor-pointer text-sm font-medium"
          >
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-12">
          {sortedProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
        
        {products.length === 0 && !loading && (
          <p className="text-center text-gray-500">No new products found.</p>
        )}
      </div>
    </div>
  );
};

export default NewAndNow;
