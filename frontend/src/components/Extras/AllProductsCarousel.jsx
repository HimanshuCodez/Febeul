import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import ProductCard from '../ProductCard';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const AllProductsCarousel = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${backendUrl}/api/product/list`);

      if (response.data.success) {
        setProducts(response.data.products || []);
      } else {
        setError(response.data.message || 'Failed to load products.');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const isLooping = products.length > 1;
  const loopedProducts = isLooping ? [...products, ...products] : products;

  const scrollCarousel = useCallback((direction) => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAmount = Math.max(container.clientWidth * 0.85, 280);
    const loopBoundary = isLooping ? container.scrollWidth / 2 : container.scrollWidth - container.clientWidth;

    if (!isLooping) {
      container.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth',
      });
      return;
    }

    if (direction > 0) {
      const nextScrollLeft = container.scrollLeft + scrollAmount;
      if (nextScrollLeft >= loopBoundary) {
        container.scrollTo({ left: 0, behavior: 'auto' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
      return;
    }

    if (container.scrollLeft <= 0) {
      container.scrollTo({ left: loopBoundary - container.clientWidth, behavior: 'auto' });
    } else {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }, [isLooping]);

  useEffect(() => {
    if (!isLooping) return undefined;

    const interval = window.setInterval(() => {
      scrollCarousel(1);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isLooping, scrollCarousel]);

  if (loading) {
    return (
      <div className="w-full rounded-3xl bg-white/80 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-40 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-10 w-24 rounded-full bg-gray-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="space-y-3 animate-pulse">
              <div className="aspect-[3/4] rounded-2xl bg-gray-100" />
              <div className="h-4 w-3/4 rounded bg-gray-100" />
              <div className="h-4 w-1/2 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
        <div>
          <XCircle className="mx-auto mb-4 text-red-600" size={56} />
          <h3 className="text-xl font-semibold text-red-900">Unable to load products</h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-gray-100 bg-white p-6 text-center">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">No products found</h3>
          <p className="mt-2 text-sm text-gray-500">There are no products to display right now.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="relative w-full">
      <div className="relative">
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-3 pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {loopedProducts.map((product, index) => (
            <div
              key={`${product._id}-${index}`}
              className="flex-none w-[78vw] sm:w-[320px] lg:w-[340px] snap-start"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollCarousel(-1)}
          aria-label="Scroll products left"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-900 shadow-lg backdrop-blur-sm transition-all hover:bg-white sm:left-3"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          type="button"
          onClick={() => scrollCarousel(1)}
          aria-label="Scroll products right"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-900 shadow-lg backdrop-blur-sm transition-all hover:bg-white sm:right-3"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
};

export default AllProductsCarousel;
