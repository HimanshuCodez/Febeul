import React, { useEffect, useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import useAuthStore from "../store/authStore";
import axios from "axios";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Loader from "../components/Loader";
import { toast } from "react-hot-toast";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token, fetchWishlistCount } = useAuthStore();

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

  const handleRemove = async (productId) => {
    try {
      await axios.post(
        `${backendUrl}/api/user/wishlist/remove`,
        { userId: user._id, productId },
        { headers: { token } }
      );
      setWishlistItems((items) =>
        items.filter((item) => item._id !== productId)
      );
      toast.success("Removed from wishlist");
      fetchWishlistCount(); // Update wishlist count in store
    } catch (error) {
      toast.error("Failed to remove from wishlist");
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <div key={item._id} className="relative">
                <ProductCard product={item} />
                <button
                  onClick={() => handleRemove(item._id)}
                  className="absolute top-10 right-10 bg-white rounded-full p-2 shadow-md hover:bg-red-100 transition-colors z-10"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="text-red-500 w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;

