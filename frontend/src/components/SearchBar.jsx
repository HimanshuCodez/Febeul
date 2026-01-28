import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Clock, Flame, Search } from "lucide-react";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const debounceTimeout = useRef(null);
  const searchBarRef = useRef(null); // Add this line
  const [history, setHistory] = useState([]); // Initialize as empty array
  const navigate = useNavigate();

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
  }, []); // Run once on mount

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('searchHistory', JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save search history to localStorage", error);
    }
  }, [history]); // Run whenever history state changes

  // Effect for click outside to close search results
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
  }, [searchBarRef]); // Add searchBarRef to dependency array

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
  }, [query]); // Depend on query

  // Update filtered to use searchResults directly
  const filtered = searchResults; // No client-side filtering needed here anymore

  const handleProductSelect = (product) => {
    const newHistory = [
      product.name,
      ...history.filter((item) => item !== product.name).slice(0, 4),
    ];
    setHistory(newHistory);
    setQuery(product.name);
    setShowResults(false);
    setTimeout(() => { // Add setTimeout
      navigate(`/product/${product._id}`);
    }, 50); // Small delay to allow UI update
  };

  const handleTextSelect = (item) => {
    const newHistory = [
      item,
      ...history.filter((hItem) => hItem !== item).slice(0, 4),
    ];
    setHistory(newHistory);
    setQuery(item);
    setShowResults(false);
    setTimeout(() => { // Add setTimeout
      navigate(`/products?search=${encodeURIComponent(item)}`);
    }, 50); // Small delay to allow UI update
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      const newHistory = [
        query.trim(),
        ...history.filter((item) => item !== query.trim()).slice(0, 4),
      ];
      setHistory(newHistory);
      setShowResults(false);
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="relative w-full" ref={searchBarRef}>
      <form onSubmit={handleSearchSubmit}>
        <div className="flex items-center border pl-4 gap-2 border-black h-[40px] rounded-full overflow-hidden w-full md:max-w-4xl bg-gray-50 hover:bg-white transition">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 30 30"
            fill="#000000"
          >
            <path d="M13 3C7.489 3 3 7.489 3 13s4.489 10 10 10a9.95 9.95 0 0 0 6.322-2.264l5.971 5.971a1 1 0 1 0 1.414-1.414l-5.97-5.97A9.95 9.95 0 0 0 23 13c0-5.511-4.489-10-10-10m0 2c4.43 0 8 3.57 8 8s-3.57 8-8 8-8-3.57-8-8 3.57-8 8-8" />
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            className="w-full h-full outline-none text-black bg-transparent placeholder-black text-sm"
          />
        </div>
      </form>

      {/* Dropdown */}
      {showResults && (
        <div className="absolute top-[45px] left-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-10">
          {/* When user has typed something */}
          {query ? (
            <>
              {loadingSearch ? (
                <div className="px-4 py-3 text-gray-500 text-sm">Searching...</div>
              ) : filtered.length > 0 ? (
                filtered.map((product) => (
                  <div
                    key={product._id}
                    onClick={() => handleProductSelect(product)}
                    className="px-4 py-2 hover:bg-yellow-50 cursor-pointer text-sm text-gray-700 flex items-center gap-4"
                  >
                    <img 
                      src={product.variations?.[0]?.images?.[0]}
                      alt={product.name}
                      className="w-12 h-16 object-cover rounded"
                    />
                    <div>
                      <span>{product.name}</span>
                      {product.type && <span className="text-xs text-gray-500 ml-2">({product.type})</span>}
                      {product.fabric && <span className="text-xs text-gray-500 ml-2">({product.fabric})</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-500 text-sm">
                  No results found
                </div>
              )}
            </>
          ) : (
            <>
              {/* Recent Searches */}
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm mb-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  Recent Searches
                </div>
                {history.length > 0 ? (
                  history.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => handleTextSelect(item)}
                      className="px-2 py-1 hover:bg-yellow-50 rounded-md cursor-pointer text-sm text-gray-700"
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm px-2">No history yet</p>
                )}
              </div>


            </>
          )}
        </div>
      )}
    </div>
  );
}
