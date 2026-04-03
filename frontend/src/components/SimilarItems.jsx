import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { toast } from 'react-hot-toast';
import Loader from './Loader';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const SimilarItems = ({ productId, token }) => {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLuxeMember = user?.isLuxeMember;

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${backendUrl}/api/product/similar/${productId}`);
        if (response.data.success) {
          setSimilarProducts(response.data.products);
        } else {
          setError(response.data.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      }
    };

    if (productId) {
      fetchSimilarProducts();
    }
  }, [productId, token]);

  const handleProductClick = (product) => {
    if (product.isLuxePrive && !isLuxeMember) {
      navigate('/luxe');
      toast.error("This is a Luxe Prive product. Please become a Luxe Member to view.");
      return;
    }
    navigate(`/product/${product._id}`);
    window.scrollTo(0, 0); // Scroll to top
  };

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="max-w-screen-2xl mx-auto p-4 mt-8 relative min-h-[200px]">
      {loading && <Loader />}
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Similar Items</h2>
      
      {similarProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {similarProducts.map((product) => (
            <div
              key={product._id}
              onClick={() => handleProductClick(product)}
              className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer"
            >
              <img
                src={product.variations?.[0]?.images?.[0]}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-800 truncate">
                  {product.name}
                </h3>
                <p className="text-gray-600 text-xs mt-1">
                  {product.category}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-md font-bold text-gray-900">
                    ₹{product.variations?.[0]?.sizes?.[0]?.price || 'N/A'}
                  </span>
                  {product.variations?.[0]?.sizes?.[0]?.mrp > product.variations?.[0]?.sizes?.[0]?.price && (
                    <span className="text-xs text-gray-500 line-through ml-2">
                      ₹{product.variations?.[0]?.sizes?.[0]?.mrp}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && (
        <p className="text-center py-8 text-gray-500">No similar products found.</p>
      )}
    </div>
  );
};

export default SimilarItems;
