import React, { useEffect, useState } from "react";
import { Heart, ShoppingCart, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import useAuthStore from "../store/authStore";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Loader from "../components/Loader";
import { toast } from "react-hot-toast";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCartId, setAddingToCartId] = useState(null);
  const [addedToCartIds, setAddedToCartIds] = useState(new Set());
  const { user, token, isAuthenticated, fetchWishlistCount, fetchCartCount } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(
          `${backendUrl}/api/user/wishlist`,
          {
            headers: { token },
          }
        );
        if (response.data.success) {
          setWishlistItems(response.data.wishlist);
        }
      } catch (error) {
        console.error("Error fetching wishlist", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user, token]);

  const handleWishlistUpdate = (productId, isAdded) => {
    if (!isAdded) {
      setWishlistItems((items) =>
        items.filter((item) => item._id !== productId)
      );
    }
  };

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      toast.error("Please log in to add items to your cart.");
      navigate("/auth", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    // Wishlist items don't carry a selected size/color, so fall back to the
    // first in-stock size across variations, same default ProductCard shows.
    let color = null;
    let size = null;
    for (const variation of product.variations || []) {
      const inStockSize = variation.sizes?.find((s) => s.stock > 0);
      if (inStockSize) {
        color = variation.color;
        size = inStockSize.size;
        break;
      }
    }

    if (!size) {
      toast.error("This item is currently out of stock.");
      return;
    }

    setAddingToCartId(product._id);
    try {
      const response = await axios.post(
        `${backendUrl}/api/cart/add`,
        { userId: user._id, itemId: product._id, size, color },
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success("Added to cart!");
        fetchCartCount();
        setAddedToCartIds((prev) => new Set(prev).add(product._id));
      } else {
        toast.error(response.data.message || "Failed to add to cart.");
      }
    } catch (error) {
      toast.error("Failed to add to cart.");
    } finally {
      setAddingToCartId(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-pink-50/50 font-sans py-12 px-4">
      <div className="container mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-gray-800 mb-8 text-center"
        >
          Your Wishlist
        </motion.h1>

        {!user ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-12 text-center"
          >
            <Heart className="w-20 h-20 text-pink-400 mb-6" />
            <h2 className="text-2xl font-semibold text-gray-700">
              Please log in to manage your wishlist
            </h2>
            <p className="text-gray-500 mt-2">
              Log in to see your saved items and add new ones.
            </p>
            <Link
              to="/auth"
              className="mt-6 bg-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-pink-600 transition-colors"
            >
              Log In
            </Link>
          </motion.div>
        ) : wishlistItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-12 text-center"
          >
            <Heart className="w-20 h-20 text-pink-400 mb-6" />
            <h2 className="text-2xl font-semibold text-gray-700">
              Your wishlist is empty
            </h2>
            <p className="text-gray-500 mt-2">
              Save your favorite items here to easily find them later.
            </p>
            <Link
              to="/"
              className="mt-6 bg-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-pink-600 transition-colors"
            >
              Continue Shopping
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <div key={item._id} className="relative flex flex-col">
                <ProductCard
                  product={item}
                  onWishlistToggle={(isAdded) => handleWishlistUpdate(item._id, isAdded)}
                />
                {addedToCartIds.has(item._id) ? (
                  <Link
                    to="/cart"
                    className="mt-3 w-full max-w-[280px] sm:max-w-[300px] mx-auto flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-600 px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle2 size={16} />
                    Added to Cart
                  </Link>
                ) : (
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={addingToCartId === item._id}
                    className="mt-3 w-full max-w-[280px] sm:max-w-[300px] mx-auto flex items-center justify-center gap-2 bg-pink-500 text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-pink-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart size={16} />
                    {addingToCartId === item._id ? "Adding..." : "Add to Cart"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;

