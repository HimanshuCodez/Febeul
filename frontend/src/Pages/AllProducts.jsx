import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const AllProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { category } = useParams();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/product/list`);
        if (response.data.success) {
          let fetchedProducts = response.data.products;
          if (category) {
            fetchedProducts = fetchedProducts.filter(
              (product) =>
                product.category.toLowerCase().replace(/ /g, "-") === category.toLowerCase() ||
                product.subCategory.toLowerCase().replace(/ /g, "-") === category.toLowerCase()
            );
          }
          setProducts(fetchedProducts);
        } else {
          console.error(response.data.message);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default AllProducts;