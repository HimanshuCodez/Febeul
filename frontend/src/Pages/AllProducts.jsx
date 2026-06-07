import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  SlidersHorizontal, 
  X, 
  ChevronDown, 
  ChevronRight, 
  RotateCcw,
  ShoppingBag,
  Plus,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../components/ProductCard';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const SkeletonCard = () => (
  <div className="space-y-4 animate-pulse">
    <div className="aspect-[3/4] bg-gray-100 rounded-2xl w-full"></div>
    <div className="h-4 bg-gray-100 rounded w-3/4"></div>
    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
  </div>
);

const AllProducts = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { category, filterKey, filterValue } = useParams();
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get("search");
  
  // Filter states
  const [showFilters, setShowFilters] = useState(true); 
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [maxPriceLimit, setMaxPriceLimit] = useState(20000);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Available filter options
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {};
        if (category) {
          params.category = category.replace(/-/g, ' ');
        }
        if (filterKey && filterValue) {
          params[filterKey] = filterValue.replace(/-/g, ' ');
        }
        if (searchQuery) {
          params.search = searchQuery;
        }

        const response = await axios.get(`${backendUrl}/api/product/list`, { params });
        if (response.data.success) {
          let fetchedProducts = response.data.products;
          setProducts(fetchedProducts);
          
          const colors = [...new Set(fetchedProducts.flatMap(p => p.variations.map(v => v.color)).filter(Boolean))].sort();
          const sizes = [...new Set(fetchedProducts.flatMap(p => p.sizes || []))];
          const categories = [...new Set(fetchedProducts.map(p => p.category).filter(Boolean))].sort();
          
          setAvailableColors(colors);
          setAvailableSizes(sizes);
          setAvailableCategories(categories);
          
          if (fetchedProducts.length > 0) {
            const allPrices = fetchedProducts.flatMap(p => 
              p.variations.flatMap(v => v.sizes.map(s => s.price))
            ).filter(Boolean);
            
            if (allPrices.length > 0) {
              const maxP = Math.ceil(Math.max(...allPrices));
              setMaxPriceLimit(maxP);
              setPriceRange([0, maxP]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setTimeout(() => setLoading(false), 600);
      }
    };
    fetchProducts();
  }, [category, filterKey, filterValue, searchQuery]);

  useEffect(() => {
    let result = [...products];

    result = result.filter(p => {
      const prices = p.variations.flatMap(v => v.sizes.map(s => s.price)).filter(Boolean);
      if (prices.length === 0) return true;
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      return minP <= priceRange[1] && maxP >= priceRange[0];
    });

    if (selectedColors.length > 0) {
      result = result.filter(p => p.variations.some(v => selectedColors.includes(v.color)));
    }

    if (selectedSizes.length > 0) {
      result = result.filter(p => p.sizes?.some(s => selectedSizes.includes(s)));
    }

    if (selectedCategories.length > 0) {
      result = result.filter(p => selectedCategories.some(cat => cat.toLowerCase() === p.category?.toLowerCase()));
    }

    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => (a.variations?.[0]?.sizes?.[0]?.price || 0) - (b.variations?.[0]?.sizes?.[0]?.price || 0));
        break;
      case 'price-high':
        result.sort((a, b) => (b.variations?.[0]?.sizes?.[0]?.price || 0) - (a.variations?.[0]?.sizes?.[0]?.price || 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        break;
      default:
        result.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
        break;
    }

    setFilteredProducts(result);
  }, [products, priceRange, selectedColors, selectedSizes, selectedCategories, sortBy]);

  const toggleFilter = (value, selected, setSelected) => {
    setSelected(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  };

  const clearFilters = () => {
    setPriceRange([0, maxPriceLimit]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedCategories([]);
  };

  const activeFilterCount = selectedColors.length + selectedSizes.length + selectedCategories.length + (priceRange[1] < maxPriceLimit ? 1 : 0);
  const effectiveGridCols = showFilters ? 3 : 4;

  const FilterContent = () => (
    <div className="divide-y divide-gray-100">
      <FilterAccordion title="Categories" defaultOpen={true}>
        <div className="space-y-3 pb-6">
          {availableCategories.map(cat => (
            <FilterItem 
              key={cat} 
              label={cat} 
              checked={selectedCategories.includes(cat)} 
              onClick={() => toggleFilter(cat, selectedCategories, setSelectedCategories)} 
            />
          ))}
        </div>
      </FilterAccordion>

      <FilterAccordion title="Price Range">
        <div className="py-6 space-y-4">
          <input
            type="range"
            min="0"
            max={maxPriceLimit}
            step={100}
            value={priceRange[1]}
            onChange={(e) => setPriceRange([0, Number(e.target.value)])}
            className="w-full h-[2px] bg-gray-100 appearance-none cursor-pointer accent-black"
          />
          <div className="flex justify-between text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            <span>₹0</span>
            <span className="text-black">Under ₹{priceRange[1]}</span>
          </div>
        </div>
      </FilterAccordion>

      <FilterAccordion title="Colors">
        <div className="grid grid-cols-6 gap-3 py-6">
          {availableColors.map(color => (
            <button
              key={color}
              onClick={() => toggleFilter(color, selectedColors, setSelectedColors)}
              className={`w-6 h-6 rounded-full border transition-all ${selectedColors.includes(color) ? 'ring-2 ring-black ring-offset-2' : 'border-gray-100'}`}
              style={{ backgroundColor: color.toLowerCase() }}
              title={color}
            />
          ))}
        </div>
      </FilterAccordion>

      <FilterAccordion title="Size">
        <div className="flex flex-wrap gap-2 py-6">
          {availableSizes.map(size => (
            <button
              key={size}
              onClick={() => toggleFilter(size, selectedSizes, setSelectedSizes)}
              className={`min-w-[40px] h-10 px-3 flex items-center justify-center text-[11px] font-bold border transition-all ${
                selectedSizes.includes(size) ? 'bg-black text-white border-black' : 'border-gray-100 text-gray-500 hover:border-gray-300'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </FilterAccordion>
      
      {activeFilterCount > 0 && (
        <button 
          onClick={clearFilters}
          className="w-full py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600 hover:text-pink-700 flex items-center gap-2"
        >
          <RotateCcw size={14} /> Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumbs */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
        <nav className="flex items-center text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-4 overflow-hidden">
          <Link to="/" className="hover:text-black transition-colors shrink-0">Home</Link>
          <ChevronRight size={12} className="mx-2 text-gray-300 shrink-0" />
          <span className="text-black truncate min-w-0">{category ? category.replace(/-/g, ' ') : 'All Products'}</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-light text-gray-900 capitalize tracking-tight mb-2">
               {category ? category.replace(/-/g, ' ') : 'Our Collections'}
            </h1>
            <p className="text-sm text-gray-500 font-light">{filteredProducts.length} items found</p>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setShowMobileFilters(true);
                } else {
                  setShowFilters(!showFilters);
                }
              }}
              className="group flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-900 hover:text-pink-600 transition-colors"
            >
              <SlidersHorizontal size={16} className={(showFilters || activeFilterCount > 0) ? 'text-pink-600' : ''} />
              <span className="hidden lg:inline">{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
              <span className="lg:hidden">Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
            </button>
            
            <div className="relative group">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-transparent pr-8 py-1 text-xs font-semibold uppercase tracking-widest border-b border-transparent hover:border-black focus:outline-none cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price Low-High</option>
                <option value="price-high">Price High-Low</option>
              </select>
              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pb-20">
        <div className="flex gap-12">
          {/* Elegant Sidebar Accordion - Desktop */}
          <aside className={`
            hidden lg:block transition-all duration-500 ease-in-out
            ${showFilters ? 'w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none'}
          `}>
            <div className="sticky top-24">
              <FilterContent />
            </div>
          </aside>

          {/* Main Grid Content */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className={`grid grid-cols-2 lg:grid-cols-${effectiveGridCols} gap-x-6 gap-y-12`}>
                {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 text-center">
                <ShoppingBag size={48} className="text-gray-200 mb-6" />
                <h3 className="text-xl font-light text-gray-900 mb-2">No items found</h3>
                <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">Try adjusting your filters to find what you're looking for.</p>
                <button onClick={clearFilters} className="text-xs font-bold uppercase tracking-widest underline">Reset Filters</button>
              </div>
            ) : (
              <motion.div 
                layout
                className={`grid grid-cols-2 lg:grid-cols-${effectiveGridCols} gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-16`}
              >
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </motion.div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-xs bg-white z-[101] lg:hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-sm font-bold uppercase tracking-widest">Filters</h2>
                <button 
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 hover:bg-gray-50 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                <FilterContent />
              </div>
              
              <div className="p-6 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowMobileFilters(false);
                  }}
                  className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest bg-black text-white hover:bg-gray-900 transition-colors"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterAccordion = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="py-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900"
      >
        {title}
        {isOpen ? <Minus size={14} /> : <Plus size={14} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterItem = ({ label, checked, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-3 w-full text-left group"
  >
    <div className={`w-4 h-4 border flex items-center justify-center transition-all ${checked ? 'bg-black border-black text-white' : 'border-gray-200 group-hover:border-gray-400'}`}>
      {checked && <X size={10} />}
    </div>
    <span className={`text-[12px] font-light tracking-wide transition-colors ${checked ? 'text-black font-medium' : 'text-gray-500 group-hover:text-black'}`}>
      {label}
    </span>
  </button>
);

export default AllProducts;
