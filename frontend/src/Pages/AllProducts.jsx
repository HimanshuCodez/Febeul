import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { SlidersHorizontal, X, ChevronDown, Grid3x3, LayoutGrid } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const AllProducts = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { category } = useParams();
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [gridCols, setGridCols] = useState(4);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Available filter options
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

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
                product.subCategory?.toLowerCase().replace(/ /g, "-") === category.toLowerCase()
            );
          }
          setProducts(fetchedProducts);
          setFilteredProducts(fetchedProducts);
          
          // Extract unique values for filters
          const colors = [...new Set(fetchedProducts.map(p => p.color).filter(Boolean))];
          const sizes = [...new Set(fetchedProducts.flatMap(p => p.sizes || []))];
          const categories = [...new Set(fetchedProducts.map(p => p.category).filter(Boolean))];
          
          setAvailableColors(colors);
          setAvailableSizes(sizes);
          setAvailableCategories(categories);
          
          // Set price range based on products
          const prices = fetchedProducts.map(p => p.price);
          setPriceRange([0, Math.max(...prices)]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category]);

  // Apply filters
  useEffect(() => {
    let result = [...products];

    // Price filter
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Color filter
    if (selectedColors.length > 0) {
      result = result.filter(p => selectedColors.includes(p.color));
    }

    // Size filter
    if (selectedSizes.length > 0) {
      result = result.filter(p => p.sizes?.some(s => selectedSizes.includes(s)));
    }

    // Category filter
    if (selectedCategories.length > 0) {
      result = result.filter(p => selectedCategories.includes(p.category));
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }

    setFilteredProducts(result);
  }, [products, priceRange, selectedColors, selectedSizes, selectedCategories, sortBy]);

  const clearFilters = () => {
    setPriceRange([0, Math.max(...products.map(p => p.price))]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedCategories([]);
  };

  const toggleFilter = (value, selected, setSelected) => {
    if (selected.includes(value)) {
      setSelected(selected.filter(item => item !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {category ? category.replace(/-/g, ' ').toUpperCase() : 'All Products'}
          </h1>
          <p className="text-gray-600">{filteredProducts.length} products found</p>
        </div>

        {/* Filters & Sort Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <SlidersHorizontal size={18} />
            <span className="font-medium">Filters</span>
          </button>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Grid Toggle */}
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setGridCols(3)}
                className={`p-2 rounded ${gridCols === 3 ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => setGridCols(4)}
                className={`p-2 rounded ${gridCols === 4 ? 'bg-white shadow-sm' : ''}`}
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-gray-100 rounded-lg border-none outline-none cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className={`
            fixed md:sticky top-0 left-0 z-50 h-screen md:h-auto
            w-72 md:w-64 bg-white md:bg-transparent
            transform transition-transform duration-300 ease-in-out
            ${showFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${showFilters ? 'block' : 'hidden md:block'}
            overflow-y-auto
          `}>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="md:hidden">
                  <X size={20} />
                </button>
              </div>

              {/* Clear Filters */}
              <button
                onClick={clearFilters}
                className="w-full mb-4 text-sm text-blue-600 hover:underline"
              >
                Clear all filters
              </button>

              {/* Price Range */}
              <FilterSection title="Price Range">
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max={Math.max(...products.map(p => p.price))}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, Number(e.target.value)])}
                    className="w-full accent-pink-500"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>₹{priceRange[0]}</span>
                    <span>₹{priceRange[1]}</span>
                  </div>
                </div>
              </FilterSection>

              {/* Categories */}
              {!category && availableCategories.length > 0 && (
                <FilterSection title="Categories">
                  {availableCategories.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleFilter(cat, selectedCategories, setSelectedCategories)}
                        className="w-4 h-4 accent-pink-500"
                      />
                      <span className="text-sm">{cat}</span>
                    </label>
                  ))}
                </FilterSection>
              )}

              {/* Colors */}
              {availableColors.length > 0 && (
                <FilterSection title="Colors">
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => toggleFilter(color, selectedColors, setSelectedColors)}
                        className={`px-3 py-1.5 text-sm rounded-full border-2 transition-all ${
                          selectedColors.includes(color)
                            ? 'border-pink-500 bg-pink-50 text-pink-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Sizes */}
              {availableSizes.length > 0 && (
                <FilterSection title="Sizes">
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => toggleFilter(size, selectedSizes, setSelectedSizes)}
                        className={`w-12 h-12 text-sm font-medium rounded-lg border-2 transition-all ${
                          selectedSizes.includes(size)
                            ? 'border-pink-500 bg-pink-50 text-pink-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </FilterSection>
              )}
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">No products found matching your filters</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={`grid grid-cols-2 lg:grid-cols-${gridCols} gap-4 md:gap-6`}>
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {showFilters && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowFilters(false)}
        />
      )}
    </div>
  );
};

const FilterSection = ({ title, children }) => (
  <div className="mb-6 pb-6 border-b border-gray-200 last:border-b-0">
    <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
      {title}
    </h3>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

export default AllProducts;