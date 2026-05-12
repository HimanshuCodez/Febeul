import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  SlidersHorizontal, 
  X, 
  ChevronDown, 
  Grid3x3, 
  LayoutGrid, 
  ChevronRight, 
  Search, 
  RotateCcw,
  ArrowUpDown,
  Filter,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../components/ProductCard';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const SkeletonCard = () => (
  <div className="space-y-4 animate-pulse">
    <div className="aspect-[3/4] bg-gray-200 rounded-2xl w-full"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="h-8 bg-gray-200 rounded-full w-1/4"></div>
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
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [gridCols, setGridCols] = useState(4);
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
          
          // Extract unique values for filters
          const colors = [...new Set(fetchedProducts.flatMap(p => p.variations.map(v => v.color)).filter(Boolean))].sort();
          const sizes = [...new Set(fetchedProducts.flatMap(p => p.sizes || []))];
          const categories = [...new Set(fetchedProducts.map(p => p.category).filter(Boolean))].sort();
          
          setAvailableColors(colors);
          setAvailableSizes(sizes);
          setAvailableCategories(categories);
          
          // Set price range based on products
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
        // Add a slight delay for smoother transition
        setTimeout(() => setLoading(false), 600);
      }
    };

    fetchProducts();
  }, [category, filterKey, filterValue, searchQuery]);

  // Apply filters locally
  useEffect(() => {
    let result = [...products];

    // Price filter
    result = result.filter(p => {
      const prices = p.variations.flatMap(v => v.sizes.map(s => s.price)).filter(Boolean);
      if (prices.length === 0) return true;
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      return minP <= priceRange[1] && maxP >= priceRange[0];
    });

    // Color filter
    if (selectedColors.length > 0) {
      result = result.filter(p => p.variations.some(v => selectedColors.includes(v.color)));
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
        result.sort((a, b) => {
          const priceA = a.variations?.[0]?.sizes?.[0]?.price || 0;
          const priceB = b.variations?.[0]?.sizes?.[0]?.price || 0;
          return priceA - priceB;
        });
        break;
      case 'price-high':
        result.sort((a, b) => {
          const priceA = a.variations?.[0]?.sizes?.[0]?.price || 0;
          const priceB = b.variations?.[0]?.sizes?.[0]?.price || 0;
          return priceB - priceA;
        });
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      default:
        result.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
        break;
    }

    setFilteredProducts(result);
  }, [products, priceRange, selectedColors, selectedSizes, selectedCategories, sortBy]);

  const clearFilters = () => {
    setPriceRange([0, maxPriceLimit]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedCategories([]);
  };

  const removeFilter = (type, value) => {
    switch (type) {
      case 'color':
        setSelectedColors(selectedColors.filter(c => c !== value));
        break;
      case 'size':
        setSelectedSizes(selectedSizes.filter(s => s !== value));
        break;
      case 'category':
        setSelectedCategories(selectedCategories.filter(c => c !== value));
        break;
      case 'price':
        setPriceRange([0, maxPriceLimit]);
        break;
      default:
        break;
    }
  };

  const activeFilterCount = selectedColors.length + selectedSizes.length + selectedCategories.length + (priceRange[1] < maxPriceLimit ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top Banner / Breadcrumbs Area */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <nav className="flex items-center mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Link to="/" className="hover:text-pink-600 transition-colors">Home</Link>
                <ChevronRight size={10} className="mx-2 text-gray-300" />
                <span className="text-gray-900 truncate max-w-[200px]">
                    {searchQuery 
                        ? `Search: ${searchQuery}` 
                        : category 
                            ? category.replace(/-/g, ' ') 
                            : 'All Collections'}
                </span>
              </nav>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 capitalize tracking-tight">
                {searchQuery 
                  ? `"${searchQuery}"` 
                  : filterValue 
                    ? filterValue.replace(/-/g, ' ') 
                    : (category ? category.replace(/-/g, ' ') : 'Our Collections')}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <span>{filteredProducts.length} Products</span>
              {filteredProducts.length > 0 && (
                <>
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="text-xs italic text-gray-400">Handcrafted elegance</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Toolbar - Sticky with precise positioning to avoid overlap */}
        <div className="sticky top-[100px] md:top-[156px] z-20 mb-6 -mx-4 sm:mx-0">
            <div className="flex items-center justify-between gap-2 bg-white p-2 md:p-3 shadow-sm border-y md:border md:rounded-2xl border-gray-100">
            <div className="flex flex-1 items-center gap-2">
                <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${
                    showFilters 
                    ? 'bg-gray-900 text-white shadow-md' 
                    : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
                }`}
                >
                <SlidersHorizontal size={16} />
                <span>Filter {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
                </button>
                
                <div className="hidden md:flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                <button
                    onClick={() => setGridCols(3)}
                    className={`p-1.5 rounded-lg transition-all ${gridCols === 3 ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Grid3x3 size={18} />
                </button>
                <button
                    onClick={() => setGridCols(4)}
                    className={`p-1.5 rounded-lg transition-all ${gridCols === 4 ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <LayoutGrid size={18} />
                </button>
                </div>
            </div>

            <div className="flex flex-1 md:flex-none items-center gap-4">
                <div className="relative flex-1">
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 md:border-transparent md:bg-gray-50 rounded-xl text-xs font-bold text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-pink-500/10 cursor-pointer w-full md:w-auto"
                >
                    <option value="featured">Sort By</option>
                    <option value="newest">New Arrivals</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Top Rated</option>
                </select>
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <ArrowUpDown size={14} className="text-pink-500" />
                </div>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                    <ChevronDown size={14} />
                </div>
                </div>
            </div>
            </div>
        </div>

        {/* Active Filter Pills */}
        <AnimatePresence>
          {activeFilterCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap items-center gap-2 mb-6"
            >
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Filters:</span>
              {selectedCategories.map(cat => (
                <FilterPill key={cat} label={cat} onRemove={() => removeFilter('category', cat)} />
              ))}
              {selectedColors.map(color => (
                <FilterPill key={color} label={color} onRemove={() => removeFilter('color', color)} />
              ))}
              {selectedSizes.map(size => (
                <FilterPill key={size} label={size} onRemove={() => removeFilter('size', size)} />
              ))}
              {priceRange[1] < maxPriceLimit && (
                <FilterPill label={`Under ₹${priceRange[1]}`} onRemove={() => removeFilter('price')} />
              )}
              <button 
                onClick={clearFilters}
                className="text-[10px] font-bold text-pink-600 hover:underline px-2"
              >
                Clear All
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className={`
            hidden lg:block w-64 flex-shrink-0 transition-all duration-500
            ${showFilters ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none w-0 overflow-hidden'}
          `}>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-[160px] md:top-[140px] max-h-[calc(100vh-160px)] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600">
                    <Filter size={20} />
                  </div>
                  Filters
                </h2>
              </div>

              <div className="space-y-4">
                {/* Price Range */}
                <FilterSection title="Price range" defaultOpen={true}>
                  <div className="px-1 pt-4">
                    <input
                      type="range"
                      min="0"
                      max={maxPriceLimit}
                      step={100}
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([0, Number(e.target.value)])}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-pink-600"
                    />
                    <div className="flex justify-between mt-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Min</span>
                        <div className="text-sm font-black text-gray-900">₹0</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Max</span>
                        <div className="text-sm font-black text-gray-900">₹{priceRange[1]}</div>
                      </div>
                    </div>
                  </div>
                </FilterSection>

                {/* Categories */}
                {!category && availableCategories.length > 0 && (
                  <FilterSection title="Collections">
                    {availableCategories.map((cat) => (
                      <FilterCheckbox 
                        key={cat}
                        label={cat}
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleFilter(cat, selectedCategories, setSelectedCategories)}
                      />
                    ))}
                  </FilterSection>
                )}

                {/* Colors */}
                {availableColors.length > 0 && (
                  <FilterSection title="Color Palette">
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {availableColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => toggleFilter(color, selectedColors, setSelectedColors)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border-2 transition-all text-left group ${
                            selectedColors.includes(color)
                              ? 'border-pink-600 bg-pink-50 shadow-md shadow-pink-100/50'
                              : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <div 
                            className="w-5 h-5 rounded-full border border-white shadow-sm ring-1 ring-gray-100 flex-shrink-0"
                            style={{ backgroundColor: color.toLowerCase() }}
                          />
                          <span className={`text-[11px] font-bold truncate ${selectedColors.includes(color) ? 'text-pink-700' : 'text-gray-600'}`}>
                            {color}
                          </span>
                        </button>
                      ))}
                    </div>
                  </FilterSection>
                )}

                {/* Sizes */}
                {availableSizes.length > 0 && (
                  <FilterSection title="Sizes">
                    <div className="flex flex-wrap gap-2.5 pt-2">
                      {availableSizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => toggleFilter(size, selectedSizes, setSelectedSizes)}
                          className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 font-black text-sm transition-all ${
                            selectedSizes.includes(size)
                              ? 'border-gray-900 bg-gray-900 text-white shadow-xl shadow-gray-200'
                              : 'border-gray-50 bg-gray-50 text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </FilterSection>
                )}
              </div>
            </div>
          </aside>

          {/* Mobile Filter Drawer */}
          <AnimatePresence>
            {showFilters && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowFilters(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] lg:hidden"
                />
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="fixed inset-y-0 right-0 w-[90%] max-w-md bg-white z-[101] lg:hidden overflow-y-auto rounded-l-[3rem] shadow-2xl"
                >
                  <div className="p-8 sm:p-12">
                    <div className="flex items-center justify-between mb-12">
                      <h2 className="text-3xl font-serif font-bold">Filters</h2>
                      <button 
                        onClick={() => setShowFilters(false)}
                        className="w-12 h-12 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="space-y-8">
                      {/* Price Range */}
                      <FilterSection title="Price Range" defaultOpen={true}>
                        <div className="px-1">
                          <input
                            type="range"
                            min="0"
                            max={maxPriceLimit}
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([0, Number(e.target.value)])}
                            className="w-full accent-pink-600"
                          />
                          <div className="flex justify-between mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">
                            <span>₹0</span>
                            <span className="text-gray-900">₹{priceRange[1]}</span>
                          </div>
                        </div>
                      </FilterSection>

                      {!category && availableCategories.length > 0 && (
                        <FilterSection title="Collections">
                          {availableCategories.map((cat) => (
                            <FilterCheckbox 
                              key={cat}
                              label={cat}
                              checked={selectedCategories.includes(cat)}
                              onChange={() => toggleFilter(cat, selectedCategories, setSelectedCategories)}
                            />
                          ))}
                        </FilterSection>
                      )}

                      {availableColors.length > 0 && (
                        <FilterSection title="Colors">
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {availableColors.map((color) => (
                              <button
                                key={color}
                                onClick={() => toggleFilter(color, selectedColors, setSelectedColors)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                                  selectedColors.includes(color)
                                    ? 'border-pink-600 bg-pink-50'
                                    : 'border-gray-50 bg-gray-50'
                                }`}
                              >
                                <div 
                                  className="w-5 h-5 rounded-full border border-gray-200 shadow-inner"
                                  style={{ backgroundColor: color.toLowerCase() }}
                                />
                                <span className="text-xs font-bold truncate uppercase tracking-wider">{color}</span>
                              </button>
                            ))}
                          </div>
                        </FilterSection>
                      )}

                      {availableSizes.length > 0 && (
                        <FilterSection title="Sizes">
                          <div className="flex flex-wrap gap-3 pt-2">
                            {availableSizes.map((size) => (
                              <button
                                key={size}
                                onClick={() => toggleFilter(size, selectedSizes, setSelectedSizes)}
                                className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 font-black transition-all ${
                                  selectedSizes.includes(size)
                                    ? 'border-pink-600 bg-pink-600 text-white shadow-lg shadow-pink-200'
                                    : 'border-gray-50 bg-gray-50 text-gray-600'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </FilterSection>
                      )}
                    </div>

                    <div className="mt-16 pt-8 border-t border-gray-100 flex gap-4">
                      <button
                        onClick={clearFilters}
                        className="flex-1 py-5 font-black text-gray-400 bg-gray-50 rounded-[2rem] hover:bg-gray-100 transition-colors uppercase tracking-widest text-xs"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="flex-1 py-5 font-black text-white bg-pink-600 rounded-[2rem] shadow-xl shadow-pink-200 uppercase tracking-widest text-xs"
                      >
                        Show Results
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Products Grid */}
          <main className="flex-1 min-w-0">
            {loading ? (
                <div className={`grid grid-cols-2 lg:grid-cols-${gridCols} gap-x-6 gap-y-12`}>
                    {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : filteredProducts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-32 px-4 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100"
              >
                <div className="w-28 h-28 bg-pink-50 rounded-full flex items-center justify-center mb-8">
                  <ShoppingBag size={48} className="text-pink-200" />
                </div>
                <h3 className="text-3xl font-serif font-bold text-gray-900 mb-4">Awaiting New Treasures</h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-10 font-medium leading-relaxed">
                  We couldn't find any masterpieces matching your current selection. 
                  Try adjusting your filters or exploring our latest arrivals.
                </p>
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-3 px-10 py-5 bg-gray-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-2xl shadow-gray-200 active:scale-95"
                >
                  <RotateCcw size={18} />
                  Clear All Selection
                </button>
              </motion.div>
            ) : (
              <div className={`grid grid-cols-2 lg:grid-cols-${gridCols} gap-x-6 gap-y-12 md:gap-x-10 md:gap-y-16`}>
                {filteredProducts.map((product, index) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const FilterSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-50 py-8 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">{title}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
            <ChevronDown 
            size={16} 
            className={`transition-transform duration-500 ease-out ${isOpen ? 'rotate-180' : ''}`} 
            />
        </div>
      </button>
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1200px] opacity-100 mt-8' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const FilterCheckbox = ({ label, checked, onChange }) => (
  <label className="flex items-center group cursor-pointer py-1">
    <div className="relative flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <div className={`w-6 h-6 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${
        checked ? 'bg-pink-600 border-pink-600 shadow-lg shadow-pink-100' : 'bg-white border-gray-200 group-hover:border-pink-300'
      }`}>
        <X size={14} className={`text-white transition-all duration-300 ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
      </div>
    </div>
    <span className={`ml-4 text-xs font-bold transition-all duration-300 ${checked ? 'text-gray-900 translate-x-1' : 'text-gray-500 group-hover:text-gray-700'}`}>
      {label}
    </span>
  </label>
);

const FilterPill = ({ label, onRemove }) => (
  <button
    onClick={onRemove}
    className="flex items-center gap-3 pl-5 pr-4 py-2.5 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-700 hover:border-pink-500 hover:text-pink-600 transition-all group shadow-sm hover:shadow-md"
  >
    {label}
    <div className="p-1 rounded-full bg-gray-50 group-hover:bg-pink-100 transition-colors">
      <X size={10} className="text-gray-400 group-hover:text-pink-600" />
    </div>
  </button>
);

const toggleFilter = (value, selected, setSelected) => {
  if (selected.includes(value)) {
    setSelected(selected.filter(item => item !== value));
  } else {
    setSelected([...selected, value]);
  }
};

export default AllProducts;