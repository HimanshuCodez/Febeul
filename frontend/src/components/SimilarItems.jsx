import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const SimilarItems = ({ productId, token }) => {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
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
        setLoading(false);
      }
    };

    if (productId) {
      fetchSimilarProducts();
    }
  }, [productId, token]);

  if (loading) {
    return <div className="text-center py-8">Loading similar products...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  if (similarProducts.length === 0) {
    return null; // Or a message like "No similar products found"
  }

  return (
    <div className="max-w-screen-2xl mx-auto p-4 mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Similar Items</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {similarProducts.map((product) => (
          <Link to={`/product/${product._id}`} key={product._id} className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
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
                  ₹{product.price}
                </span>
                {product.mrp > product.price && (
                  <span className="text-xs text-gray-500 line-through ml-2">
                    ₹{product.mrp}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SimilarItems;
