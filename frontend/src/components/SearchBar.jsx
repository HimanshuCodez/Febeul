import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Clock, Flame, Search, X, Loader2 } from "lucide-react";
import useAuthStore from "../store/authStore";
import { toast } from "react-hot-toast";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const MAX_HISTORY = 5;

export default function SearchBar({ onNavigate }) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [trending, setTrending] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceTimeout = useRef(null);
  const searchBarRef = useRef(null);
  const inputRef = useRef(null);
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLuxeMember = user?.isLuxeMember;

  // Load history from localStorage on component mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('searchHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load search history from localStorage", error);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('searchHistory', JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save search history to localStorage", error);
    }
  }, [history]);

  // Fetch trending (bestseller) products once, shown when the query is empty
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/product/bestsellers`);
        if (response.data.success) {
          setTrending(response.data.products.slice(0, 5));
        }
      } catch (error) {
        console.error("Failed to fetch trending products:", error);
      }
    };
    fetchTrending();
  }, []);

  // Click outside just dismisses the dropdown, keeping the typed query intact
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Block page scroll while the dropdown is open (desktop + mobile)
  useEffect(() => {
    if (showResults) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showResults]);

  useEffect(() => {
    if (query.trim() === "") {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    setLoadingSearch(true);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/product/list`, {
          params: { search: query.trim() },
        });
        if (response.data.success) {
          setSearchResults(response.data.products);
        }
      } catch (error) {
        console.error("Failed to fetch search results:", error);
      } finally {
        setLoadingSearch(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]);

  // Reset keyboard-nav highlight whenever the active list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [query, searchResults, showResults]);

  const filtered = searchResults;

  // Unified list (recent searches + trending products) used for keyboard nav
  // when nothing has been typed yet.
  const suggestionItems = useMemo(
    () => [
      ...history.map((h) => ({ type: "history", value: h })),
      ...trending.map((p) => ({ type: "product", value: p })),
    ],
    [history, trending]
  );

  const dismissResults = () => {
    setShowResults(false);
  };

  const closeSearch = () => {
    setShowResults(false);
    setSearchResults([]);
    setLoadingSearch(false);
    setQuery("");
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleProductSelect = (product) => {
    const newHistory = [
      product.name,
      ...history.filter((item) => item !== product.name).slice(0, MAX_HISTORY - 1),
    ];
    setHistory(newHistory);
    closeSearch();

    if (product.isLuxePrive && !isLuxeMember) {
      navigate('/luxe');
      toast.error("This is a Luxe Prive product. Please become a Luxe Member to view.");
      onNavigate?.();
      return;
    }

    setTimeout(() => {
      navigate(`/product/${product._id}`);
      onNavigate?.();
    }, 50);
  };

  const handleTextSelect = (item) => {
    const newHistory = [
      item,
      ...history.filter((hItem) => hItem !== item).slice(0, MAX_HISTORY - 1),
    ];
    setHistory(newHistory);
    closeSearch();
    setTimeout(() => {
      navigate(`/products?search=${encodeURIComponent(item)}`);
      onNavigate?.();
    }, 50);
  };

  const removeHistoryItem = (item) => {
    setHistory((prev) => prev.filter((h) => h !== item));
  };

  const submitSearch = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const newHistory = [
      trimmed,
      ...history.filter((item) => item !== trimmed).slice(0, MAX_HISTORY - 1),
    ];
    setHistory(newHistory);
    closeSearch();
    navigate(`/products?search=${encodeURIComponent(trimmed)}`);
    onNavigate?.();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    submitSearch(query);
  };

  const handleKeyDown = (e) => {
    const list = query.trim() ? filtered : suggestionItems;

    if (e.key === "ArrowDown") {
      if (!list.length) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % list.length);
    } else if (e.key === "ArrowUp") {
      if (!list.length) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + list.length) % list.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && list[activeIndex]) {
        e.preventDefault();
        const item = list[activeIndex];
        if (query.trim()) {
          handleProductSelect(item);
        } else if (item.type === "history") {
          handleTextSelect(item.value);
        } else {
          handleProductSelect(item.value);
        }
      }
    } else if (e.key === "Escape") {
      dismissResults();
      inputRef.current?.blur();
    }
  };

  const getPriceInfo = (product) => {
    const allSizes = (product.variations || []).flatMap((v) => v.sizes || []);
    if (!allSizes.length) return null;
    const cheapest = allSizes.reduce((min, s) => (s.price < min.price ? s : min), allSizes[0]);
    return { price: cheapest.price, mrp: cheapest.mrp };
  };

  const highlightMatch = (text, q) => {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.trim().toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-inherit rounded-sm">
          {text.slice(idx, idx + q.trim().length)}
        </mark>
        {text.slice(idx + q.trim().length)}
      </>
    );
  };

  return (
    <div className="relative w-full" ref={searchBarRef}>
      {/* Backdrop — blocks/dims the rest of the page while the dropdown is open */}
      {showResults && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity"
          onClick={dismissResults}
          aria-hidden="true"
        />
      )}

      <form onSubmit={handleSearchSubmit} className="relative z-50">
        <div
          className={`flex items-center border pl-4 pr-2 gap-2 h-[42px] rounded-full w-full bg-gray-50 transition-all duration-200 ${
            showResults ? "border-black bg-white shadow-md" : "border-black hover:bg-white"
          }`}
        >
          <Search className="w-[22px] h-[22px] text-black shrink-0" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for products, categories..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className="w-full h-full outline-none text-black bg-transparent placeholder-gray-500 text-sm"
          />
          {loadingSearch && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
          {!loadingSearch && query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {showResults && (
        <div className="absolute top-[48px] left-0 w-full bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto overscroll-contain">
            {/* When user has typed something */}
            {query ? (
              <>
                {loadingSearch ? (
                  <div className="px-4 py-6 text-gray-500 text-sm text-center">Searching...</div>
                ) : filtered.length > 0 ? (
                  <>
                    <div className="sticky top-0 bg-white/95 backdrop-blur px-4 py-2 text-xs text-gray-400 border-b border-gray-100">
                      {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                    </div>
                    {filtered.map((product, i) => {
                      const priceInfo = getPriceInfo(product);
                      return (
                        <div
                          key={product._id}
                          onClick={() => handleProductSelect(product)}
                          onMouseEnter={() => setActiveIndex(i)}
                          className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 transition-colors ${
                            i === activeIndex ? "bg-yellow-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <img
                            src={product.variations?.[0]?.images?.[0]}
                            alt={product.name}
                            className="w-12 h-16 object-cover rounded-md border border-gray-100 shrink-0 bg-gray-100"
                            onError={(e) => {
                              e.currentTarget.style.visibility = "hidden";
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 font-medium truncate">
                              {highlightMatch(product.name, query)}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {product.type && (
                                <span className="text-xs text-gray-500">{product.type}</span>
                              )}
                              {product.fabric && (
                                <span className="text-xs text-gray-400">• {product.fabric}</span>
                              )}
                            </div>
                          </div>
                          {priceInfo && (
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-gray-900">
                                ₹{priceInfo.price}
                              </p>
                              {priceInfo.mrp > priceInfo.price && (
                                <p className="text-xs text-gray-400 line-through">
                                  ₹{priceInfo.mrp}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => submitSearch(query)}
                      className="w-full text-center py-2.5 text-sm font-medium text-black bg-gray-50 hover:bg-gray-100 border-t border-gray-100 sticky bottom-0"
                    >
                      View all results for &ldquo;{query}&rdquo;
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-6 text-gray-500 text-sm text-center">
                    No results found for &ldquo;{query}&rdquo;
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Recent Searches */}
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      Recent Searches
                    </div>
                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHistory([])}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  {history.length > 0 ? (
                    history.map((item, i) => (
                      <div
                        key={item}
                        onClick={() => handleTextSelect(item)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm text-gray-700 ${
                          i === activeIndex ? "bg-yellow-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          {item}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHistoryItem(item);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 shrink-0 p-1"
                          aria-label={`Remove ${item} from history`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm px-2">No recent searches</p>
                  )}
                </div>

                {/* Trending Now */}
                {trending.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm mb-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      Trending Now
                    </div>
                    <div className="space-y-1">
                      {trending.map((product, i) => {
                        const idx = history.length + i;
                        return (
                          <div
                            key={product._id}
                            onClick={() => handleProductSelect(product)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                              idx === activeIndex ? "bg-yellow-50" : "hover:bg-gray-50"
                            }`}
                          >
                            <img
                              src={product.variations?.[0]?.images?.[0]}
                              alt={product.name}
                              className="w-10 h-12 object-cover rounded border border-gray-100 shrink-0 bg-gray-100"
                              onError={(e) => {
                                e.currentTarget.style.visibility = "hidden";
                              }}
                            />
                            <span className="text-sm text-gray-700 truncate">{product.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
