import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Truck,
  RotateCcw,
  ShieldCheck,
  Star,
  MapPin,
  Lock,
  Heart,
  XCircle,
  X,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import Loader from "../components/Loader";
import useAuthStore from "../store/authStore";
import { toast } from "react-hot-toast";
import ProductCard from "../components/ProductCard";
import SimilarItems from "../components/SimilarItems";
import Reviews from "../components/Reviews";
import AddressModal from "../components/AddressModal";
import CouponShows from "../components/CouponShows";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ImageZoom = ({ src, alt, isOutOfStock, onMobileClick, settings, onSwipeLeft, onSwipeRight, currentIndex, totalImages }) => {
  return (
    <div
      className="relative mx-auto overflow-hidden bg-white shadow-sm w-full h-[75vh] lg:h-[calc(100vh-100px)] flex items-center justify-center cursor-default"
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.img
          key={src}
          src={src}
          alt={alt}
          className={`w-full h-full transition-opacity duration-300 ${isOutOfStock ? 'opacity-50 grayscale' : 'opacity-100'} touch-pan-y`}
          style={{
            objectFit: 'cover',
            transform: 'scale(1.02)'
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, info) => {
            if (info.offset.x > 50) onSwipeRight?.();
            else if (info.offset.x < -50) onSwipeLeft?.();
          }}
          onTap={() => onMobileClick()}
        />
      </AnimatePresence>
      {isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-red-600/90 text-white px-6 py-2 rounded-sm font-bold text-xl uppercase tracking-widest flex items-center gap-2 transform -rotate-12 border-2 border-white shadow-2xl">
             <XCircle size={28} />
             Out Of Stock
          </div>
        </div>
      )}

      {/* Pagination Dots (Mobile) */}
      {totalImages > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 lg:hidden z-20">
          {Array.from({ length: totalImages }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx ? "bg-pink-500 w-4" : "bg-gray-300 w-1.5"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FullScreenGallery = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleDragEnd = (event, info) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    } else if (info.offset.x < -swipeThreshold) {
      setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-white flex flex-col lg:hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-800">Product Images</h3>
        <button onClick={onClose} className="p-2 text-gray-600 hover:text-black">
          <X size={24} />
        </button>
      </div>
      <div className="flex-1 relative flex items-center justify-center p-4 bg-white overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Product ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain touch-none"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
          />
        </AnimatePresence>
      </div>
      <div className="p-4 border-t flex gap-2 overflow-x-auto bg-gray-50 no-scrollbar">
        {images.map((img, idx) => (
          <div
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`flex-shrink-0 w-16 h-16 rounded-md border-2 transition-all ${
              currentIndex === idx ? "border-pink-500 scale-105" : "border-gray-200"
            }`}
          >
            <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductDetailPage = () => {
  const { productId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const colorParam = searchParams.get('color');
  const couponParam = searchParams.get('coupon');
  const navigate = useNavigate();
  const { user, token, isAuthenticated, fetchWishlistCount, fetchCartCount } = useAuthStore();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageSettings, setImageSettings] = useState(null);
  const [siteSettings, setSiteSettings] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [selectedSizeValue, setSelectedSizeValue] = useState(null);
  const [isProdDetailsExpanded, setIsProdDetailsExpanded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [numOfReviews, setNumOfReviews] = useState(0);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [autoApplied, setAutoApplied] = useState(false);

  const [luxeProducts, setLuxeProducts] = useState([]);
  const [loadingLuxeProducts, setLoadingLuxeProducts] = useState(true);

  // Derived variables
  const variations = product?.variations || [];
  const selectedVariation = variations[selectedVariationIndex] || {};
  const images = selectedVariation.images || [];

  const currentSizeData = selectedVariation.sizes?.find(s => s.size === selectedSizeValue);
  const displayPrice = currentSizeData?.price;
  const displayMrp = currentSizeData?.mrp;
  const isOutOfStock = !currentSizeData || Number(currentSizeData.stock) <= 0;

  const finalDisplayPrice = appliedCoupon
    ? Math.max(0, displayPrice - appliedCoupon.discountAmount)
    : displayPrice;

  const discount =
    displayMrp > displayPrice
      ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
      : 0;

  const productSKUs = product ? [...new Set(product.variations.map(v => v.sku).filter(Boolean))] : [];

  useEffect(() => {
    const fetchLuxePriveProducts = async () => {
      setLoadingLuxeProducts(true);
      try {
        const response = await axios.get(
          `${backendUrl}/api/product/list?isLuxePrive=true`,
          { headers: { token } }
        );
        if (response.data.success) {
          setLuxeProducts(response.data.products);
        }
      } catch (error) {
        console.error("Failed to fetch Luxe Prive products", error);
      } finally {
        setLoadingLuxeProducts(false);
      }
    };
    fetchLuxePriveProducts();
  }, [token]);

  useEffect(() => {
    const fetchAllSettings = async () => {
      try {
        const [imgRes, siteRes] = await Promise.all([
          axios.get(`${backendUrl}/api/cms/imageSettings`),
          axios.get(`${backendUrl}/api/cms/siteSettings`)
        ]);
        if (imgRes.data.success) {
          setImageSettings(imgRes.data.content);
        }
        if (siteRes.data.success) {
          setSiteSettings(siteRes.data.content);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchAllSettings();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user && user.addresses && user.addresses.length > 0) {
      setSelectedAddress(user.addresses[0]);
    }
  }, [user, isAuthenticated]);

  const handleSelectAddress = (address) => {
    setSelectedAddress(address);
    setIsAddressModalOpen(false);
  };

  const onRedeemCoupon = async (couponCode) => {
    if (!isAuthenticated) {
      toast.error("Please log in to apply coupons.");
      navigate("/auth");
      return;
    }
    if (!selectedSizeValue) {
      toast.error("Please select a size first.");
      return;
    }
    if (!selectedVariation || !selectedVariation.sku) {
      toast.error("Product SKU not found for selected variation.");
      return;
    }

    try {
      const response = await axios.post(`${backendUrl}/api/coupon/apply-product-coupon`, {
        code: couponCode,
        productItem: {
          sku: selectedVariation.sku,
          price: displayPrice,
          quantity: 1,
        },
        userId: user._id,
      }, { headers: { token } });

      if (response.data.success) {
        toast.success(`Coupon '${couponCode}' applied! You save ₹${response.data.discountAmount.toFixed(2)}.`); 
        setAppliedCoupon({
          code: couponCode,
          discountAmount: response.data.discountAmount,
          discountType: response.data.discountType,
          discountValue: response.data.discountValue,
        });

        // Update URL
        const newParams = new URLSearchParams(searchParams);
        newParams.set('coupon', couponCode);
        setSearchParams(newParams, { replace: true });

      } else {
        toast.error(response.data.message);
        setAppliedCoupon(null);

        // Remove from URL if invalid
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('coupon');
        setSearchParams(newParams, { replace: true });
      }
    } catch (error) {
      console.error('Error applying product coupon:', error);
      toast.error(error.response?.data?.message || 'Failed to apply coupon.');
      setAppliedCoupon(null);
    }
  };

  const onRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.success("Coupon removed.");

    // Update URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('coupon');
    setSearchParams(newParams, { replace: true });
  };

  // Auto-apply coupon from URL
  useEffect(() => {
    if (couponParam && product && isAuthenticated && !appliedCoupon && !autoApplied && selectedSizeValue) {     
      onRedeemCoupon(couponParam);
      setAutoApplied(true);
    }
  }, [couponParam, product, isAuthenticated, selectedSizeValue, autoApplied]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data } = await axios.post(`${backendUrl}/api/product/single`, {
          productId,
        });
        if (data.success) {
          setProduct(data.product);

          let initialVariationIndex = 0;
          if (colorParam) {
            const index = data.product.variations.findIndex(v => v.color?.toLowerCase() === colorParam.toLowerCase());
            if (index !== -1) {
              initialVariationIndex = index;
            }
          }

          setSelectedVariationIndex(initialVariationIndex);

          const selectedVar = data.product.variations[initialVariationIndex];
          if (selectedVar && selectedVar.sizes && selectedVar.sizes.length > 0) {
            setSelectedSizeValue(selectedVar.sizes[0].size);
          }

          setAverageRating(data.product.averageRating || 0);
          setNumOfReviews(data.product.numOfReviews || 0);
        } else {
          console.error(data.message);
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      }
    };
    fetchProduct();
  }, [productId, colorParam]);

  useEffect(() => {
    const checkWishlist = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await axios.get(`${backendUrl}/api/user/wishlist`,
          {
            headers: { token },
          });
          if (response.data.success) {
            const isProductInWishlist = response.data.wishlist.some(item => item._id === productId);
            setIsWishlisted(isProductInWishlist);
          }
        } catch (error) {
          console.error("Error checking wishlist", error);
        }
      }
    };
    checkWishlist();
  }, [isAuthenticated, user, productId, token]);

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to manage your wishlist.");
      navigate("/auth");
      return;
    }

    const endpoint = isWishlisted ? 'remove' : 'add';
    try {
      const response = await axios.post(`${backendUrl}/api/user/wishlist/${endpoint}`,
        { userId: user._id, productId: product._id },
        { headers: { token } }
      );
      if (response.data.success) {
        setIsWishlisted(!isWishlisted);
        toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
        fetchWishlistCount();
      }
    } catch (error) {
      toast.error("Failed to update wishlist.");
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to add items to your cart.");
      navigate("/auth");
      return;
    }
    if (!selectedSizeValue) {
      toast.error("Please select a size.");
      return;
    }
    if (!selectedVariation || !selectedVariation.color) {
      toast.error("Please select a color.");
      return;
    }
    try {
      const response = await axios.post(`${backendUrl}/api/cart/add`,
        {
          userId: user._id,
          itemId: product._id,
          size: selectedSizeValue,
          color: selectedVariation.color,
          appliedCoupon: appliedCoupon?.code,
          discountAmount: appliedCoupon?.discountAmount
        },
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success("Added to cart!");
        fetchCartCount();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Failed to add to cart.");
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to add items to your cart.");
      navigate("/auth");
      return;
    }
    if (!selectedSizeValue) {
      toast.error("Please select a size.");
      return;
    }
    try {
      await axios.post(`${backendUrl}/api/cart/add`,
        {
          userId: user._id,
          itemId: product._id,
          size: selectedSizeValue,
          color: selectedVariation.color,
          appliedCoupon: appliedCoupon?.code,
          discountAmount: appliedCoupon?.discountAmount
        },
        { headers: { token } }
      );
      fetchCartCount();
      navigate("/cart");
    } catch (error) {
      toast.error("Failed to add to cart.");
    }
  };

  const allSpecifications = product ? [
    { label: "Product Category", value: product.category },
    { label: "Type", value: product.type },
    { label: "Material Type", value: product.materialType },
    { label: "Material Composition", value: product.materialComposition },
    { label: "Fabric", value: product.fabric },
    { label: "Pattern", value: product.pattern },
    { label: "Neck", value: product.neck },
    { label: "Sleeve Style", value: product.sleeveStyle },
    { label: "Sleeve Length", value: product.sleeveLength },
    { label: "Closure Type", value: product.closureType },
    { label: "Care Instructions", value: product.careInstructions },
    { label: "Included Components", value: product.includedComponents },
    { label: "Net Quantity", value: product.netQuantity },
    { label: "Generic Name", value: product.genericName },
    { label: "Item Weight", value: product.itemWeight },
    { label: "Item Dimensions LxWxH", value: product.itemDimensionsLxWxH },
    { label: "Country of Origin", value: product.countryOfOrigin },
    { label: "Manufacturer", value: product.manufacturer },
    { label: "Packer", value: product.packer },
    { label: "HSN", value: product.hsn },
  ].filter((row) => row.value) : [];

  const specsToShow = isProdDetailsExpanded
    ? allSpecifications
    : allSpecifications.slice(0, 6);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-pink-100 selection:text-pink-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,600;0,700;1,400&family=Raleway:wght@200;300;400;700&display=swap');

        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-playfair { font-family: 'Playfair Display', serif; }
      `}</style>

      {loading && <Loader />}
      {product ? (
        <div className="w-full mx-auto px-0 lg:px-4 py-0 lg:py-6 font-jakarta">
          <nav className="flex items-center text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-4 lg:mb-6 px-6 py-4 lg:py-0 font-bold overflow-hidden">
            <Link to="/" className="hover:text-black transition-colors shrink-0">Home</Link>
            <ChevronRight size={12} className="mx-2 shrink-0" />
            <Link
              to={`/products/${product.category.toLowerCase().replace(/\s+/g, '-')}`}
              className="hover:text-black transition-colors shrink-0"
            >
              {product.category}
            </Link>
            <ChevronRight size={12} className="mx-2 shrink-0" />
            <span className="text-gray-900 truncate min-w-0">{product.name}</span>
          </nav>

          <div className="bg-white pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-16 items-start">
              {/* --- Image Gallery (Left) --- */}
              <div className="lg:col-span-7 lg:sticky lg:top-12">
                <div className="flex flex-col-reverse xl:flex-row gap-0 xl:gap-6">
                  <div className="flex xl:flex-col gap-3 justify-start overflow-x-auto xl:overflow-y-auto xl:max-h-[calc(100vh-120px)] no-scrollbar py-4 xl:py-0 px-6 xl:px-4">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`flex-shrink-0 rounded-xl border-2 cursor-pointer overflow-hidden transition-all duration-500 ${
                          selectedImage === idx
                            ? "border-pink-500 shadow-xl scale-105"
                            : "border-gray-50 hover:border-pink-200"
                        }`}
                        style={{
                          width: `${imageSettings?.thumbnailSize || 75}px`,
                          height: `${imageSettings?.thumbnailSize || 100}px`
                        }}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 w-full">
                    <ImageZoom
                      src={images[selectedImage]}
                      alt={product.name}
                      isOutOfStock={isOutOfStock}
                      onMobileClick={() => setIsGalleryOpen(true)}
                      settings={imageSettings}
                      onSwipeLeft={() => setSelectedImage((prev) => (prev < images.length - 1 ? prev + 1 : 0))} 
                      onSwipeRight={() => setSelectedImage((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    />
                  </div>
                </div>
              </div>

              {/* --- Product Info & Buy Box (Right) --- */}
              <div className="lg:col-span-5 px-6 lg:px-2 py-8 lg:py-0">
                <div className="space-y-0">
                  <div className="pb-6 border-b border-gray-400">
                    <h1 className="text-3xl lg:text-4xl font-playfair font-medium text-gray-900 leading-[1.1] tracking-tight">
                      {product.name}
                    </h1>
                  </div>

                  <div className="py-4 border-b border-gray-400 flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full">
                      <span className="text-xs font-black">{averageRating.toFixed(1)}</span>
                      <Star size={10} className="text-yellow-500 fill-current" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest border-l border-gray-400 pl-3">
                      {numOfReviews} reviews
                    </span>
                  </div>

                  {/* Price Section */}
                  <div className="py-6 border-b border-gray-400">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-4xl font-black text-gray-900 tracking-tighter">
                        ₹{finalDisplayPrice?.toLocaleString('en-IN')}
                      </span>
                      {displayMrp > displayPrice && (
                        <span className="text-xl text-gray-300 line-through font-light decoration-pink-500/30"> 
                          ₹{displayMrp?.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    {discount > 0 && (
                      <span className="inline-block bg-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider shadow-sm shadow-pink-100">
                        {discount}% OFF
                      </span>
                    )}
                  </div>

                  <div className="space-y-0">
                    {/* Variations */}
                    <div className="py-6 border-b border-gray-400">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">    
                        Color: <span className="text-black">{selectedVariation.color}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {variations.map((variation, index) => {
                          const isFullyOutOfStock = variation.sizes?.every(s => Number(s.stock) <= 0);
                          return (
                            <div
                              key={index}
                              onClick={() => {
                                setSelectedVariationIndex(index);
                                if (variation.sizes && variation.sizes.length > 0) {
                                  setSelectedSizeValue(variation.sizes[0].size);
                                } else {
                                  setSelectedSizeValue(null);
                                }
                                if (variation.color) {
                                  navigate(`/product/${productId}?color=${encodeURIComponent(variation.color)}`, { replace: true });
                                }
                              }}
                              className={`p-0.5 border-2 rounded-xl cursor-pointer transition-all relative ${   
                                index === selectedVariationIndex
                                  ? "border-pink-500 shadow-md scale-105"
                                  : "border-transparent hover:border-gray-300"
                              } ${isFullyOutOfStock ? 'opacity-50' : ''}`}
                            >
                              <img
                                src={variation.images[0]}
                                alt={`Color ${variation.color}`}
                                className="object-cover rounded-[10px]"
                                style={{
                                  width: `${imageSettings?.variationSize || 45}px`,
                                  height: `${imageSettings?.variationSize || 58}px`
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sizes */}
                    <div className="py-6 border-b border-gray-400">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">    
                         Size: <span className="text-black">{selectedSizeValue || 'Select'}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {selectedVariation.sizes?.map((sizeData) => {
                          const isSizeOutOfStock = Number(sizeData.stock) <= 0;
                          return (
                            <button
                              key={sizeData.size}
                              onClick={() => setSelectedSizeValue(sizeData.size)}
                              className={`min-w-[50px] h-10 border rounded-xl transition-all relative overflow-hidden text-[11px] font-black tracking-widest ${
                                selectedSizeValue === sizeData.size
                                  ? "border-black bg-black text-white shadow-lg"
                                  : "border-gray-400 bg-white hover:border-black text-gray-900"
                              } ${isSizeOutOfStock ? 'text-gray-300 border-gray-100 cursor-not-allowed' : ''}`}  
                            >
                              {sizeData.size}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 py-6 border-b border-gray-400 text-sm font-medium text-gray-500">    
                    <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-pink-50 transition-colors">
                        <Truck size={18} className="text-gray-400 group-hover:text-pink-500 transition-colors" />
                      </div>
                      <div>
                         <p className="font-black text-black uppercase tracking-widest text-xs">Express Shipping</p>
                         <p className="text-sm">Estimated arrival: {siteSettings?.expectedDeliveryDays || "5 to 7 Days"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-pink-50 transition-colors">
                        <MapPin size={18} className="text-gray-400 group-hover:text-pink-500 transition-colors" />
                      </div>
                      <button onClick={() => setIsAddressModalOpen(true)} className="text-sm font-black uppercase tracking-widest hover:text-pink-600 transition-colors text-left">
                        {selectedAddress ? `Shipping to ${selectedAddress.city}, ${selectedAddress.zip}` : "Select destination"}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 py-6 border-b border-gray-400">
                    <div className="flex gap-3">
                      <button
                        disabled={isOutOfStock}
                        onClick={handleAddToCart}
                        className={`flex-[3] h-14 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-black border-2 border-black hover:bg-black hover:text-white active:scale-95'}`}
                      >
                        {isOutOfStock ? 'Sold Out' : 'Add to Bag'}
                      </button>
                      <button
                        onClick={handleWishlistToggle}
                        className={`flex-1 h-14 flex items-center justify-center border-2 border-gray-200 rounded-2xl hover:border-pink-500 transition-all active:scale-95 ${isWishlisted ? 'text-pink-500 border-pink-100 bg-pink-50' : 'text-gray-300'}`}
                      >
                        <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <button
                      disabled={isOutOfStock}
                      onClick={handleBuyNow}
                      className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all ${isOutOfStock ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-pink-500 text-white hover:bg-pink-600 shadow-xl shadow-pink-100 active:scale-[0.98]'}`}
                    >
                      Buy It Now
                    </button>
                  </div>

                  <div className="pt-6">
                    <CouponShows
                      productSKUs={productSKUs}
                      onRedeem={onRedeemCoupon}
                      onRemove={onRemoveCoupon}
                      appliedCoupon={appliedCoupon}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Luxe Prive Section */}
          {luxeProducts.length > 0 && (
            <div className="mt-0 pt-16 border-t border-gray-400 bg-white pb-16">
              <div className="text-center mb-10 flex flex-col items-center gap-2">
                <p className="font-['Raleway'] tracking-[0.5em] text-[#c98a8b] uppercase text-[10px] font-bold">Member Exclusive</p>
                <h2 className="text-4xl font-['Cormorant_Garamond'] font-bold text-[#b87a7b] italic">LUXE PRIVE COLLECTION</h2>
              </div>
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {luxeProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Specifications & Description Section */}
          <div className="max-w-full mx-auto px-0 border-t border-gray-400 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-gray-400">
                <h2 className="text-xl font-playfair font-bold text-gray-900 mb-8 uppercase tracking-[0.3em]">  
                  Specifications
                </h2>
                <div className="space-y-1">
                  {specsToShow.map((detail, index) => (
                    <DetailRow
                      key={index}
                      label={detail.label}
                      value={detail.value}
                      isLast={
                        !isProdDetailsExpanded &&
                        index === specsToShow.length - 1
                      }
                    />
                  ))}
                </div>
                {allSpecifications.length > 6 && (
                  <button
                    onClick={() =>
                      setIsProdDetailsExpanded(!isProdDetailsExpanded)
                    }
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mt-10 hover:underline flex items-center gap-2"
                  >
                    {isProdDetailsExpanded ? "Collapse" : "View All Specifications"}
                    <ChevronDown size={14} className={isProdDetailsExpanded ? 'rotate-180 transition-transform' : ''} />
                  </button>
                )}
              </div>
              <div className="p-8 lg:p-16">
                <h2 className="text-xl font-playfair font-bold text-gray-900 mb-8 uppercase tracking-[0.3em]">  
                  Product Description
                </h2>
                <div
                  className="product-description text-sm text-black leading-relaxed font-medium"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white py-16 border-t border-gray-400 mt-0">
             <div className="max-w-full mx-auto px-8">
                
                <Reviews productId={productId} />
             </div>
          </div>
        </div>
      ) : !loading && (
        <div className="flex items-center justify-center h-screen text-xl text-gray-700 font-playfair italic">  
          Collection item not found.
        </div>
      )}
      <div className="mt-0 pt-12 border-t border-gray-400 bg-white p-8">
        
        <SimilarItems productId={productId} token={token} />
      </div>
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        addresses={user?.addresses || []}
        selectedAddress={selectedAddress}
        onSelectAddress={handleSelectAddress}
      />

      {isGalleryOpen && (
        <FullScreenGallery
          images={images}
          initialIndex={selectedImage}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}
    </div>
  );
};

const DetailRow = ({ label, value, isLast = false }) => (
  <div
    className={`grid grid-cols-3 gap-6 items-center py-5 ${
      !isLast ? "border-b border-gray-400" : ""
    }`}
  >
    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] col-span-1">{label}</span> 
    <span className="text-sm text-gray-900 col-span-2 font-medium tracking-tight">{value}</span>
  </div>
);

export default ProductDetailPage;
