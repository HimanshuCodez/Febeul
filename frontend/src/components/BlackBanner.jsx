import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ChevronUp, ChevronDown, ShoppingBag } from "lucide-react";
import useAuthStore from "../store/authStore";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const BlackBanner = () => {
  const [shows, setShows] = useState([]);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [productRailTextColor, setProductRailTextColor] = useState('#1f2937');
  const [sideProducts, setSideProducts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const productRailRef = useRef(null);
  const railPausedRef = useRef(false);
  const railResumeTimeoutRef = useRef(null);
  const mobileRailRef = useRef(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const { user, token, isAuthenticated, fetchCartCount } = useAuthStore();

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/black_banner`);
        const content = response.data?.content;
        if (response.data.success && Array.isArray(content?.shows) && content.shows.length > 0) {
          setShows(content.shows.filter((s) => s.desktopVideo || s.mobileVideo));
          setBackgroundColor(content.backgroundColor || '#000000');
          setTextColor(content.textColor || '#ffffff');
          setProductRailTextColor(content.productRailTextColor || '#1f2937');
        } else {
          setShows([]);
        }
      } catch (error) {
        console.error("Error fetching black banner:", error);
        setShows([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchSideProducts = async () => {
      try {
        const [bestsellerRes, luxeRes] = await Promise.all([
          axios.get(`${backendUrl}/api/product/bestsellers`),
          axios.get(`${backendUrl}/api/product/list?isLuxePrive=true`),
        ]);
        const bestsellers = bestsellerRes.data?.success ? bestsellerRes.data.products : [];
        const luxe = luxeRes.data?.success ? luxeRes.data.products : [];
        const merged = [...bestsellers, ...luxe];
        const deduped = Array.from(new Map(merged.map((p) => [p._id, p])).values());
        setSideProducts(deduped.slice(0, 14));
      } catch (error) {
        console.error("Error fetching banner side products:", error);
      }
    };

    fetchBanner();
    fetchSideProducts();

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const railProducts = sideProducts.length > 0 ? [...sideProducts, ...sideProducts] : [];
  const isRailLooping = sideProducts.length > 1;

  // Auto-advance the vertical side rail, looping seamlessly once it scrolls
  // past the duplicated half of the list — same boundary-reset pattern as
  // BestSellerCarousel, just on the vertical axis.
  const scrollRailVertical = useCallback((direction) => {
    const el = productRailRef.current;
    if (!el || sideProducts.length === 0) return;

    const scrollAmount = Math.max(el.clientHeight * 0.4, 160);
    const loopBoundary = isRailLooping ? el.scrollHeight / 2 : el.scrollHeight - el.clientHeight;

    if (!isRailLooping) {
      el.scrollBy({ top: direction * scrollAmount, behavior: "smooth" });
      return;
    }

    if (direction > 0) {
      const nextScrollTop = el.scrollTop + scrollAmount;
      if (nextScrollTop >= loopBoundary) {
        el.scrollTo({ top: 0, behavior: "auto" });
      } else {
        el.scrollBy({ top: scrollAmount, behavior: "smooth" });
      }
      return;
    }

    if (el.scrollTop <= 0) {
      el.scrollTo({ top: loopBoundary - el.clientHeight, behavior: "auto" });
    } else {
      el.scrollBy({ top: -scrollAmount, behavior: "smooth" });
    }
  }, [sideProducts.length, isRailLooping]);

  useEffect(() => {
    if (sideProducts.length === 0) return undefined;
    const interval = window.setInterval(() => {
      if (!railPausedRef.current) scrollRailVertical(1);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [sideProducts.length, scrollRailVertical]);

  const pauseRailTemporarily = () => {
    railPausedRef.current = true;
    clearTimeout(railResumeTimeoutRef.current);
    railResumeTimeoutRef.current = setTimeout(() => {
      railPausedRef.current = false;
    }, 2000);
  };

  const scrollRail = (direction) => {
    pauseRailTemporarily();
    scrollRailVertical(direction === "up" ? -1 : 1);
  };

  // Mobile: same side products, sliding horizontally instead.
  const scrollMobileRailAuto = useCallback((direction) => {
    const el = mobileRailRef.current;
    if (!el || sideProducts.length === 0) return;

    const scrollAmount = Math.max(el.clientWidth * 0.4, 140);
    const loopBoundary = isRailLooping ? el.scrollWidth / 2 : el.scrollWidth - el.clientWidth;

    if (!isRailLooping) {
      el.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
      return;
    }

    if (direction > 0) {
      const nextScrollLeft = el.scrollLeft + scrollAmount;
      if (nextScrollLeft >= loopBoundary) {
        el.scrollTo({ left: 0, behavior: "auto" });
      } else {
        el.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  }, [sideProducts.length, isRailLooping]);

  useEffect(() => {
    if (sideProducts.length === 0) return undefined;
    const interval = window.setInterval(() => scrollMobileRailAuto(1), 2500);
    return () => window.clearInterval(interval);
  }, [sideProducts.length, scrollMobileRailAuto]);

  const handleQuickAddToCart = async (product) => {
    if (!isAuthenticated) {
      toast.error("Please log in to add items to your cart.");
      navigate("/auth");
      return;
    }
    const variation = product.variations?.[0];
    const size = variation?.sizes?.[0];
    if (!variation || !size) {
      navigate(`/product/${product._id}`);
      return;
    }
    try {
      const response = await axios.post(
        `${backendUrl}/api/cart/add`,
        { userId: user._id, itemId: product._id, size: size.size, color: variation.color },
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success("Added to cart!");
        fetchCartCount();
      } else {
        toast.error(response.data.message || "Failed to add to cart.");
      }
    } catch {
      toast.error("Failed to add to cart.");
    }
  };

  if (loading) {
    return (
      <section className="relative w-full h-[90vh] sm:h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
      </section>
    );
  }

  if (shows.length === 0) return null;

  const activeShow = shows[activeIndex] || shows[0];
  const mediaSrc = isMobile
    ? (activeShow.mobileVideo || activeShow.desktopVideo)
    : (activeShow.desktopVideo || activeShow.mobileVideo);
  const watchMoreShows = shows.map((s, i) => ({ ...s, i })).filter((s) => s.i !== activeIndex);

  const ProductRailCard = ({ product }) => {
    const variation = product.variations?.[0];
    const size = variation?.sizes?.[0];
    const image = variation?.images?.[0];
    return (
      <div className="w-[110px] sm:w-[130px] flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <Link to={`/product/${product._id}`} className="block">
          <div className="w-full aspect-square bg-gray-100">
            {image && <img src={image} alt={product.name} className="w-full h-full object-cover" />}
          </div>
        </Link>
        <div className="p-2 flex flex-col gap-1 flex-1">
          <Link to={`/product/${product._id}`} className="text-[11px] line-clamp-2 leading-tight h-7" style={{ color: productRailTextColor }}>
            {product.name}
          </Link>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold" style={{ color: productRailTextColor }}>₹{size?.price?.toLocaleString("en-IN") ?? "--"}</span>
            {size?.mrp > size?.price && (
              <span className="text-[10px] text-gray-400 line-through">₹{size.mrp.toLocaleString("en-IN")}</span>
            )}
          </div>
          <button
            onClick={() => handleQuickAddToCart(product)}
            className="mt-1 w-full bg-yellow-400 hover:bg-yellow-500 transition-colors text-gray-900 text-[11px] font-bold py-1.5 rounded-full"
          >
            Add to Cart
          </button>
        </div>
      </div>
    );
  };

  const MobileRailCard = ({ product }) => {
    const variation = product.variations?.[0];
    const size = variation?.sizes?.[0];
    const image = variation?.images?.[0];
    return (
      <Link
        to={`/product/${product._id}`}
        className="flex-shrink-0 w-[76px] flex flex-col items-center gap-1 text-center"
      >
        <div className="w-[76px] h-[76px] rounded-lg overflow-hidden bg-gray-800 border border-white/10">
          {image && <img src={image} alt={product.name} className="w-full h-full object-cover" />}
        </div>
        <p className="text-[10px] line-clamp-1 leading-tight w-full" style={{ color: productRailTextColor }}>{product.name}</p>
        <span className="text-[10px] font-bold" style={{ color: productRailTextColor }}>₹{size?.price?.toLocaleString("en-IN") ?? "--"}</span>
      </Link>
    );
  };

  return (
    <section className="relative w-full text-white" style={{ backgroundColor }}>
      <div className="w-full max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-[150px_1fr] lg:grid-cols-[170px_1fr_280px] gap-0 md:gap-3 lg:gap-4 px-0 md:px-4 py-0 md:py-4">
        {/* Left rail: scrollable product recommendations */}
        <div className="hidden md:flex flex-col items-center gap-2 py-2">
          <button
            onClick={() => scrollRail("up")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Scroll products up"
          >
            <ChevronUp size={18} />
          </button>
          <div
            ref={productRailRef}
            onMouseEnter={() => { railPausedRef.current = true; }}
            onMouseLeave={() => { clearTimeout(railResumeTimeoutRef.current); railPausedRef.current = false; }}
            className="flex flex-col gap-3 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ maxHeight: "70vh" }}
          >
            {railProducts.map((product, idx) => (
              <ProductRailCard key={`${product._id}-${idx}`} product={product} />
            ))}
          </div>
          <button
            onClick={() => scrollRail("down")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Scroll products down"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {/* Center: video player + product info */}
        <div className="flex flex-col min-w-0">
          <div className="relative w-full aspect-[9/16] sm:aspect-video bg-black overflow-hidden md:rounded-xl">
            <span className="absolute top-3 left-3 z-10 bg-black/60 text-white text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full">
              Live Now
            </span>
            <video
              ref={videoRef}
              key={mediaSrc}
              className="absolute inset-0 w-full h-full object-cover"
              src={mediaSrc}
              autoPlay
              muted
              loop
              playsInline
              controls
              onLoadedData={(e) => { e.currentTarget.play().catch(() => {}); }}
            />
          </div>

          {(activeShow.title || activeShow.productLink) && (
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                {activeShow.title && (
                  <h2 className="text-sm sm:text-base font-semibold truncate" style={{ color: textColor }}>{activeShow.title}</h2>
                )}
                {activeShow.subtitle && (
                  <p className="text-xs text-gray-400 mt-0.5">{activeShow.subtitle}</p>
                )}
              </div>
              {activeShow.productLink && (
                <Link
                  to={activeShow.productLink}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 transition-colors text-gray-900 text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 rounded-full"
                >
                  <ShoppingBag size={14} /> Buy Now
                </Link>
              )}
            </div>
          )}

          {/* Mobile-only watch more strip */}
          {watchMoreShows.length > 0 && (
            <div className="md:hidden flex gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {watchMoreShows.map((show) => (
                <button
                  key={show.i}
                  onClick={() => setActiveIndex(show.i)}
                  className="flex-shrink-0 w-28 text-left"
                >
                  <div className="w-28 aspect-video rounded-lg overflow-hidden bg-gray-800 border border-white/10">
                    {show.thumbnail && <img src={show.thumbnail} alt={show.title} className="w-full h-full object-cover" />}
                  </div>
                  <p className="text-[11px] mt-1 line-clamp-2 leading-tight" style={{ color: textColor }}>{show.title}</p>
                </button>
              ))}
            </div>
          )}

          {/* Mobile-only shoppable product rail, sliding horizontally */}
          {railProducts.length > 0 && (
            <div className="md:hidden px-4 pb-4">
              <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: textColor }}>Shop This Look</h3>
              <div
                ref={mobileRailRef}
                className="flex gap-2.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {railProducts.map((product, idx) => (
                  <MobileRailCard key={`${product._id}-mobile-${idx}`} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right rail: watch more list */}
        {watchMoreShows.length > 0 && (
          <div className="hidden lg:flex flex-col gap-3 py-2 px-2">
            <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: textColor }}>Watch More</h3>
            <div className="flex flex-col gap-3 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ maxHeight: "75vh" }}>
              {watchMoreShows.map((show) => (
                <button
                  key={show.i}
                  onClick={() => setActiveIndex(show.i)}
                  className="flex gap-2 text-left bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-2"
                >
                  <div className="w-20 aspect-video flex-shrink-0 rounded-md overflow-hidden bg-gray-800">
                    {show.thumbnail && <img src={show.thumbnail} alt={show.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium line-clamp-2 leading-tight" style={{ color: textColor }}>{show.title || "Watch now"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlackBanner;
