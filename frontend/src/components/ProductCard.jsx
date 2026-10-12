import { useState, useEffect } from 'react';
import { ArrowRight, Heart, ImageOff, Tag, Star } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// Global cache to avoid redundant API calls across multiple ProductCard instances
// mounting at once. Short TTL so coupons created/edited in admin (e.g. made
// SKU-specific) show up without requiring a full page reload of an already-open tab.
const COUPONS_CACHE_TTL_MS = 60000;
let couponsCache = null;
let couponsCacheTime = 0;
let couponsPromise = null;

const fetchActiveCoupons = async () => {
  if (couponsCache && Date.now() - couponsCacheTime < COUPONS_CACHE_TTL_MS) return couponsCache;
  if (couponsPromise) return couponsPromise;

  couponsPromise = axios.get(`${backendUrl}/api/coupon/active`)
    .then(res => {
      couponsPromise = null;
      if (res.data.success) {
        couponsCache = res.data.coupons;
        couponsCacheTime = Date.now();
        return couponsCache;
      }
      return [];
    })
    .catch(() => {
      couponsPromise = null;
      return [];
    });

  return couponsPromise;
};

const ProductCard = ({ product, onWishlistToggle, initialSku }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [wishlistedSkus, setWishlistedSkus] = useState([]);
  const [activeVariationIndex, setActiveVariationIndex] = useState(() => {
    const idx = initialSku ? (product.variations || []).findIndex(v => v.sku === initialSku) : -1;
    return idx === -1 ? 0 : idx;
  });
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [failedImage, setFailedImage] = useState(null);

  const { user, token, isAuthenticated, fetchWishlistCount } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isLuxeMember = user?.isLuxeMember;

  const handleProductClick = (e) => {
    if (product.isLuxePrive && !isLuxeMember) {
      e.preventDefault(); 
      navigate('/luxe');
      toast.error("This is a Luxe Prive product. Please become a Luxe Member to view.");
    }
  };

  useEffect(() => {
    const loadCoupons = async () => {
      const coupons = await fetchActiveCoupons();
      setActiveCoupons(coupons);
    };
    loadCoupons();
  }, []);

  useEffect(() => {
    const checkWishlist = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await axios.get(`${backendUrl}/api/user/wishlist`, {
            headers: { token }
          });
          if (response.data.success) {
            setWishlistedSkus(
              response.data.wishlist
                .filter(item => item._id === product._id)
                .map(item => item.wishlistSku)
            );
          }
        } catch (error) {
          console.error("Error checking wishlist", error);
        }
      }
    };
    checkWishlist();
  }, [isAuthenticated, user, product._id, token]);
  

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please log in to manage your wishlist.");
      navigate("/auth", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    const sku = activeVariation.sku;
    if (!sku) {
      toast.error("This item can't be wishlisted right now.");
      return;
    }

    const endpoint = isWishlisted ? 'remove' : 'add';
    setIsUpdatingWishlist(true);
    try {
      const response = await axios.post(`${backendUrl}/api/user/wishlist/${endpoint}`,
        { productId: product._id, sku },
        { headers: { token } }
      );
      if (response.data.success) {
        const newWishlistState = !isWishlisted;
        setWishlistedSkus(prev => newWishlistState ? [...prev, sku] : prev.filter(s => s !== sku));
        toast.success(newWishlistState ? "Added to wishlist" : "Removed from wishlist");
        fetchWishlistCount();
        if (onWishlistToggle) {
          onWishlistToggle(newWishlistState, sku);
        }
      }
    } catch {
      toast.error("Failed to update wishlist.");
    } finally {
      setIsUpdatingWishlist(false);
    }
  };

  const variations = product.variations || [];
  const activeVariation = variations[activeVariationIndex] || {};
  const isWishlisted = !!activeVariation.sku && wishlistedSkus.includes(activeVariation.sku);

  const firstSize = activeVariation.sizes?.[0];
  const displayPrice = firstSize?.price;
  const displayMrp = firstSize?.mrp;

  const discount = displayMrp && displayPrice
    ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
    : 0;

  const defaultImage = activeVariation.images?.[0] || product.variations?.[0]?.images?.[0];
  const hoverImage = activeVariation.images?.[1] || defaultImage;

  const getBestCouponPrice = () => {
    const sku = activeVariation.sku;
    if (!displayPrice || !sku || !activeCoupons.length) return null;

    let maxDiscount = 0;
    activeCoupons.forEach(coupon => {
      const isApplicableSKU = !coupon.applicableSKUs || coupon.applicableSKUs.length === 0 || 
        coupon.applicableSKUs.some(item => item.trim().toLowerCase() === sku.trim().toLowerCase());
      const isMinAmountMet = displayPrice >= (coupon.minOrderAmount || 0);
      const isLuxeMatch = coupon.userType !== 'luxe' || isLuxeMember;

      if (isApplicableSKU && isMinAmountMet && isLuxeMatch) {
        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = (displayPrice * coupon.discountValue) / 100;
        } else {
          discount = coupon.discountValue;
        }
        if (discount > maxDiscount) maxDiscount = discount;
      }
    });

    return maxDiscount > 0 ? displayPrice - maxDiscount : null;
  };

  const bestCouponPrice = getBestCouponPrice();
  const image = isHovered ? hoverImage : defaultImage;
  const productLink = product.isLuxePrive && !isLuxeMember
    ? '/luxe'
    : `/product/${product._id}${activeVariation.color ? `?color=${encodeURIComponent(activeVariation.color)}` : ''}`;

  return (
    <article
      aria-label={product.name}
      className="group relative mx-auto flex h-full w-full min-w-0 max-w-[280px] flex-col rounded-xl border border-stone-200/80 bg-white p-1.5 text-left shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none sm:max-w-[300px] sm:p-2"
    >
      <div
        className="relative shrink-0"
        onPointerEnter={(event) => { if (event.pointerType === 'mouse') setIsHovered(true); }}
        onPointerLeave={() => setIsHovered(false)}
      >
        <Link
          to={productLink}
          onClick={handleProductClick}
          aria-label={`View ${product.name}`}
          className="block aspect-[3/4] overflow-hidden rounded-lg bg-[#f7f5f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500"
        >
          {image && image !== failedImage ? (
            <img
              src={image}
              alt={product.name}
              className="block h-full w-full object-contain"
              onError={() => setFailedImage(image)}
            />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-stone-500">
              <ImageOff size={24} aria-hidden="true" />
              Image unavailable
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={isUpdatingWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted}
          aria-busy={isUpdatingWishlist}
          className={`absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full border border-white/80 shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none sm:right-2 sm:top-2 ${
            isWishlisted ? 'bg-rose-50 text-rose-600' : 'bg-white/95 text-stone-800 hover:bg-rose-50 hover:text-rose-600'
          }`}
        >
          <Heart size={19} aria-hidden="true" className={isWishlisted ? 'fill-current' : ''} />
        </button>

        <div className="pointer-events-none absolute left-1.5 top-1.5 flex max-w-[calc(100%-3.5rem)] flex-col items-start gap-1.5 sm:left-2 sm:top-2">
          {discount > 0 && (
            <span className="rounded-md bg-rose-100 px-2 py-1 text-[9px] font-semibold tracking-wide text-rose-900 sm:text-[10px]">
              {discount}% OFF
            </span>
          )}
          {product.isNewProduct && (
            <span className="rounded-md bg-white/95 px-2 py-1 text-[9px] font-semibold tracking-wide text-stone-800 sm:text-[10px]">NEW</span>
          )}
        </div>
        {product.isLuxePrive && (
          <img src="/luxeprive.png" alt="Luxe Privé" className="pointer-events-none absolute bottom-2 left-2 h-9 w-9 object-contain sm:h-11 sm:w-11" />
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-3 sm:px-1.5 sm:pt-3.5">
        <Link to={productLink} onClick={handleProductClick} className="rounded-sm focus-visible:outline-pink-500">
          <h3 className="min-h-10 line-clamp-2 break-words text-[13px] font-semibold leading-5 text-stone-900 [font-family:var(--primary-font)] transition-colors group-hover:text-rose-700 sm:text-sm" title={product.name}>
            {product.name}
          </h3>
        </Link>

        <div className="mt-1 flex min-h-5 items-center gap-1 text-[11px] text-stone-600 sm:gap-1.5 sm:text-xs">
          {product.numOfReviews > 0 && (
            <>
              <Star size={13} className="shrink-0 fill-amber-500 text-amber-500" aria-hidden="true" />
              <span aria-label={`${Number(product.averageRating || 0).toFixed(1)} out of 5 stars`}>{Number(product.averageRating || 0).toFixed(1)}</span>
              <span className="text-stone-500">({product.numOfReviews})</span>
            </>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base font-semibold tracking-tight text-stone-950 sm:text-lg">
            {displayPrice != null ? `₹${displayPrice.toLocaleString('en-IN')}` : 'Price unavailable'}
          </span>
          {displayMrp > displayPrice && (
            <span className="text-[11px] text-stone-500 line-through sm:text-xs">₹{displayMrp.toLocaleString('en-IN')}</span>
          )}
        </div>

        <div className="mt-2 min-h-8">
          {bestCouponPrice !== null && (
            <div className="flex items-start gap-1.5 rounded-md bg-[#edf5ee] px-2 py-1.5 text-[10px] leading-4 text-[#315b3d] sm:text-[11px]">
              <Tag size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>Save ₹{(displayPrice - bestCouponPrice).toLocaleString('en-IN')} with coupon</span>
            </div>
          )}
        </div>

        <div className="mb-3 mt-2 flex min-h-8 flex-wrap items-center gap-1" role="group" aria-label="Choose colour">
          {variations.length > 1 && variations.slice(0, 4).map((variation, index) => {
            const colour = variation.colorCode || (variation.color && CSS.supports('color', variation.color) ? variation.color : null);
            return (
              <button
                key={variation.sku || index}
                type="button"
                aria-label={`Select ${variation.color || `colour ${index + 1}`}`}
                aria-pressed={activeVariationIndex === index}
                title={variation.color || `Colour ${index + 1}`}
                onClick={() => { setActiveVariationIndex(index); setIsHovered(false); }}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border p-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500 ${activeVariationIndex === index ? 'border-stone-900' : 'border-transparent hover:border-stone-300'}`}
              >
                <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-black/10 bg-stone-100" style={colour ? { backgroundColor: colour } : undefined}>
                  {!colour && variation.images?.[0] && <img src={variation.images[0]} alt="" className="h-full w-full object-contain" />}
                </span>
              </button>
            );
          })}
          {variations.length > 4 && <span className="ml-0.5 text-[10px] text-stone-500">+{variations.length - 4}</span>}
        </div>

        <Link
          to={productLink}
          onClick={handleProductClick}
          className="mt-auto flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-stone-900 px-2 py-2.5 text-[11px] font-medium text-white transition-colors hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500 motion-reduce:transition-none sm:gap-2 sm:text-xs"
        >
          View product <ArrowRight size={15} className="shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};

export default ProductCard;
