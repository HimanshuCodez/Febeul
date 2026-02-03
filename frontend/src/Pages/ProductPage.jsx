import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Share2,
  Truck,
  RotateCcw,
  ShieldCheck,
  Star,
  MapPin,
  Lock,
  Heart
} from "lucide-react";
import Loader from "../components/Loader";
import useAuthStore from "../store/authStore";
import { toast } from "react-hot-toast";
import SimilarItems from "../components/SimilarItems";
import Reviews from "../components/Reviews"; // Import the Reviews component
import AddressModal from "../components/AddressModal";
import CouponShows from "../components/CouponShows";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, fetchWishlistCount, fetchCartCount } = useAuthStore();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [selectedSizeValue, setSelectedSizeValue] = useState(null); // Renamed selectedSize
  const [isProdDetailsExpanded, setIsProdDetailsExpanded] = useState(false);
  const [isAddInfoExpanded, setIsAddInfoExpanded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [averageRating, setAverageRating] = useState(0); // New state for average rating
  const [numOfReviews, setNumOfReviews] = useState(0); // New state for number of reviews
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user && user.addresses && user.addresses.length > 0) {
      setSelectedAddress(user.addresses[0]);
    }
  }, [user, isAuthenticated]);

  const handleSelectAddress = (address) => {
    setSelectedAddress(address);
    setIsAddressModalOpen(false);
  };


  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await axios.post(`${backendUrl}/api/product/single`, {
          productId,
        });
        if (data.success) {
          setProduct(data.product);
          // Initialize selected size from the first variation's first size
          if (data.product.variations && data.product.variations.length > 0 && 
              data.product.variations[0].sizes && data.product.variations[0].sizes.length > 0) {
            setSelectedSizeValue(data.product.variations[0].sizes[0].size);
          }
          // Set average rating and number of reviews
          setAverageRating(data.product.averageRating || 0);
          setNumOfReviews(data.product.numOfReviews || 0);
        } else {
          console.error(data.message);
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

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
        fetchWishlistCount(); // Update wishlist count in store
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
    if (!selectedSizeValue) { // Use selectedSizeValue
      toast.error("Please select a size.");
      return;
    }
    if (!selectedVariation || !selectedVariation.color) {
      toast.error("Please select a color.");
      return;
    }
    try {
      const response = await axios.post(`${backendUrl}/api/cart/add`, 
        { userId: user._id, itemId: product._id, size: selectedSizeValue, color: selectedVariation.color }, // Use selectedSizeValue
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success("Added to cart!");
        fetchCartCount(); // Update cart count in store
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Failed to add to cart.");
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate("/cart");
  };


  if (loading) return <Loader />;
  if (!product)
    return (
      <div className="flex items-center justify-center h-screen text-xl text-gray-700">
        Product not found.
      </div>
    );

  const variations = product.variations || [];
  const selectedVariation = variations[selectedVariationIndex] || {};
  const images = selectedVariation.images || [];

  // Find the price and mrp for the currently selected size and variation
  const currentSizeData = selectedVariation.sizes?.find(s => s.size === selectedSizeValue);
  const displayPrice = currentSizeData?.price;
  const displayMrp = currentSizeData?.mrp;

  const discount =
    displayMrp > displayPrice
      ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
      : 0;

  const productDetailRows = [
    { label: "Style Code", value: product.styleCode },
    { label: "Material Type", value: product.materialType },
    { label: "Care Instructions", value: product.careInstructions },
    { label: "Country of Origin", value: product.countryOfOrigin },
    { label: "Fabric", value: product.fabric },
    { label: "Pattern", value: product.pattern },
    { label: "Sleeve Style", value: product.sleeveStyle },
    { label: "Sleeve Length", value: product.sleeveLength },
    { label: "Neck", value: product.neck },
    { label: "HSN", value: product.hsn },
    { label: "Material Composition", value: product.materialComposition },
    { label: "Closure Type", value: product.closureType },
    { label: "Net Quantity", value: product.netQuantity },
  ].filter((row) => row.value);

  const additionalInfoRows = [
    { label: "Manufacturer", value: product.manufacturer },
    { label: "Packer", value: product.packer },
    { label: "Included Components", value: product.includedComponents },
    { label: "Item Weight", value: product.itemWeight },
    { label: "Item Dimensions LxWxH", value: product.itemDimensionsLxWxH },
    { label: "Generic Name", value: product.genericName },
  ].filter((row) => row.value);

  const prodDetailsToShow = isProdDetailsExpanded
    ? productDetailRows
    : productDetailRows.slice(0, 4);
  const addInfoToShow = isAddInfoExpanded
    ? additionalInfoRows
    : additionalInfoRows.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-screen-2xl mx-auto p-4">
        <div className="text-sm text-gray-600 mb-4">
          Home / {product.category} /{" "}
          <span className="font-semibold text-gray-800">{product.name}</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8">
            {/* --- Image Gallery (Left) --- */}
            <div className="lg:col-span-5">
              <div className="flex flex-col-reverse sm:flex-row gap-4">
                <div className="flex sm:flex-col gap-2 justify-center">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`w-16 h-16 rounded-md border-2 cursor-pointer overflow-hidden transition-all ${
                        selectedImage === idx
                          ? "border-orange-500"
                          : "border-gray-300 hover:border-orange-400"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                  <motion.img
                    key={images[selectedImage]}
                    src={images[selectedImage]}
                    alt="Product main view"
                    className="w-full h-full object-contain"
                    style={{ maxHeight: "450px" }}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            </div>

            {/* --- Product Info (Center) --- */}
            <div className="lg:col-span-4 mt-6 lg:mt-0">
              <h1 className="text-2xl font-semibold text-gray-800 leading-tight">
                {product.name}
              </h1>
          

              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center">
                  <span className="mr-1 font-medium">{averageRating.toFixed(1)}</span>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={`${
                        i < Math.round(averageRating)
                          ? "text-yellow-500 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-blue-600 font-semibold hover:text-orange-600 cursor-pointer">
                  {numOfReviews} ratings
                </span>
              </div>

              <hr className="my-4" />

              <div>
                <div className="text-base font-semibold text-gray-800 mb-3">
                  Colour:{" "}
                  <span className="font-bold">{selectedVariation.color}</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {variations.map((variation, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSelectedVariationIndex(index);
                        // Update selected size when color variation changes
                        if (variation.sizes && variation.sizes.length > 0) {
                          setSelectedSizeValue(variation.sizes[0].size);
                        } else {
                          setSelectedSizeValue(null);
                        }
                      }}
                      className={`p-1 border-2 rounded-md cursor-pointer transition-all ${
                        index === selectedVariationIndex
                          ? "border-orange-500"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={variation.images[0]}
                        alt={`Color ${variation.color}`}
                        className="w-12 h-12 object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-base font-semibold text-gray-800 mb-3">
                  Size: <span className="font-bold">{selectedSizeValue || 'N/A'}</span> {/* Use selectedSizeValue */}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selectedVariation.sizes?.map((sizeData) => ( // Iterate through sizes of selected variation
                    <button
                      key={sizeData.size}
                      onClick={() => setSelectedSizeValue(sizeData.size)} // Update selectedSizeValue
                      className={`px-4 py-1 border rounded-md transition-colors ${
                        selectedSizeValue === sizeData.size
                          ? "border-orange-500 bg-orange-50 text-orange-700 font-semibold"
                          : "border-gray-300 bg-white hover:bg-gray-50"
                      }`}
                    >
                      {sizeData.size}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="my-4" />

              <CouponShows />

              <div>
                <h2 className="text-base font-bold text-gray-800 mb-2">
                  About this item
                </h2>
                <div
                  className="product-description text-sm text-gray-700"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            </div>

            {/* --- Buy Box (Right) --- */}
            <div className="lg:col-span-3 mt-6 lg:mt-0">
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    ₹{displayPrice?.toLocaleString('en-IN')} {/* Use displayPrice */}
                  </span>
                  {displayMrp > displayPrice && ( // Use displayMrp and displayPrice
                    <span className="text-base text-gray-500 line-through">
                      ₹{displayMrp?.toLocaleString('en-IN')} {/* Use displayMrp */}
                    </span>
                  )}
                </div>
                {discount > 0 && (
                  <div className="text-base font-semibold text-green-600">
                    {discount}% off
                  </div>
                )}

                <div className="text-sm text-gray-600 mt-4">
                  <p>
                    <span className="font-semibold">FREE delivery</span>{" "}
                    Thursday, 2 January.
                  </p>
                  <p className="flex items-center gap-1 mt-2">
                    <MapPin size={14} />
                    {isAuthenticated && user && user.addresses && user.addresses.length > 0 ? (
                      <button onClick={() => setIsAddressModalOpen(true)} className="text-blue-600 hover:text-orange-600 text-left">
                        {selectedAddress ? `Deliver to ${selectedAddress.name} - ${selectedAddress.city} ${selectedAddress.zip}` : "Select delivery location"}
                      </button>
                    ) : (
                      <a href="/auth" className="text-blue-600 hover:text-orange-600">
                        Select delivery location
                      </a>
                    )}
                  </p>
                </div>

                <div className="my-4">
                  <p className="text-lg font-semibold text-green-700">
                    In stock
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={handleWishlistToggle} className={`w-full bg-white flex items-center justify-center gap-2 text-gray-700 border border-gray-300 hover:bg-gray-100 py-2 rounded-full font-semibold text-sm transition-colors shadow-sm ${isWishlisted ? 'text-pink-500' : ''}`}>
                    <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-pink-500' : ''}`} />
                    {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                  </button>
                  <button onClick={handleAddToCart} className="w-full bg-white text-[#f9aeaf] border border-[#f9aeaf] hover:bg-[#f9aeaf] hover:text-black py-2 rounded-full font-semibold text-sm transition-colors shadow-sm">
                    Add to Cart
                  </button>
                  <button onClick={handleBuyNow} className="w-full bg-[#f9aeaf] text-black hover:bg-[#f79294] py-2 rounded-full font-semibold text-sm transition-colors shadow-sm">
                    Buy Now
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                  <Lock size={14} />
                  <span>Secure transaction</span>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* --- Lower Sections --- */}
        <div className="bg-white p-6 rounded-lg shadow-sm mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {" "}
            {/* New Grid Container */}
            {/* Product Details Section (will be first column) */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Product Details
              </h2>
              <div className="space-y-3 text-sm max-w-2xl">
                {prodDetailsToShow.map((detail, index) => (
                  <DetailRow
                    key={index}
                    label={detail.label}
                    value={detail.value}
                    isLast={
                      !isProdDetailsExpanded &&
                      index === prodDetailsToShow.length - 1
                    }
                  />
                ))}
              </div>
              {productDetailRows.length > 4 && (
                <button
                  onClick={() =>
                    setIsProdDetailsExpanded(!isProdDetailsExpanded)
                  }
                  className="text-blue-600 hover:text-orange-600 font-semibold mt-4 text-sm"
                >
                  {isProdDetailsExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
            {/* Additional Information Section (will be second column) */}
            {additionalInfoRows.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Additional Information
                </h2>
                <div className="space-y-3 text-sm max-w-2xl">
                  {addInfoToShow.map((detail, index) => (
                    <DetailRow
                      key={index}
                      label={detail.label}
                      value={detail.value}
                      isLast={
                        !isAddInfoExpanded && index === addInfoToShow.length - 1
                      }
                    />
                  ))}
                </div>
                {additionalInfoRows.length > 4 && (
                  <button
                    onClick={() => setIsAddInfoExpanded(!isAddInfoExpanded)}
                    className="text-blue-600 hover:text-orange-600 font-semibold mt-4 text-sm"
                  >
                    {isAddInfoExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            )}
          </div>{" "}
          {/* End of New Grid Container */}
        </div>
      </div>
      <SimilarItems productId={productId} token={token} />
      <Reviews productId={productId} /> {/* Integrate the Reviews component */}
      <AddressModal 
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        addresses={user?.addresses || []}
        selectedAddress={selectedAddress}
        onSelectAddress={handleSelectAddress}
      />
    </div>
  );
};

const DetailRow = ({ label, value, isLast = false }) => (
  <div
    className={`grid grid-cols-3 gap-4 items-center py-3 ${
      !isLast ? "border-b border-gray-200" : ""
    }`}
  >
    <span className="text-gray-600 font-semibold col-span-1">{label}</span>
    <span className="text-gray-800 col-span-2">{value}</span>
  </div>
);

export default ProductDetailPage;