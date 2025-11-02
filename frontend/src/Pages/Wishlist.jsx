import React, { useState } from "react";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const initialWishlistItems = [
  {
    id: 1,
    name: "Lace Bralette Set",
    price: 1299,
    image:
      "https://avidlove.com/cdn/shop/files/81UAeytBWlL._AC_SL1500.jpg?v=1760173707&width=5000",
    size: "M",
    color: "Black",
  },
  {
    id: 2,
    name: "Silk Nightwear",
    price: 1899,
    image:
      "https://avidlove.com/cdn/shop/files/AML010669_B-3.jpg?v=1757922017&width=5000",
    size: "L",
    color: "Red",
  },
  {
    id: 3,
    name: "Everyday Comfort Bra",
    price: 999,
    image:
      "https://avidlove.com/cdn/shop/files/SYV008284_RR-1.jpg?v=1755829947&width=5000",
    size: "S",
    color: "Beige",
  },
  {
    id: 4,
    name: "Luxury Lace Panty Set",
    price: 1499,
    image:
      "https://avidlove.com/cdn/shop/files/AML010669_WR-3.jpg?v=1757922017&width=5000",
    size: "M",
    color: "White",
  },
];

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState(initialWishlistItems);

  const handleRemove = (id) => {
    setWishlistItems((items) => items.filter((item) => item.id !== id));
  };

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

        {wishlistItems.length === 0 ? (
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
            <button className="mt-6 bg-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-pink-600 transition-colors">
              Continue Shopping
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}
                className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"
              >
                <div className="relative w-full h-60">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover object-top"
                  />
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md hover:bg-red-100 transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="text-red-500 w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {item.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.size} / {item.color}
                    </p>
                    <p className="text-xl font-bold text-pink-500 mt-2">
                      ₹{item.price.toFixed(2)}
                    </p>
                  </div>
                  <button className="mt-4 w-full bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md font-semibold transition-colors flex items-center justify-center space-x-2">
                    <ShoppingBag className="w-5 h-5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
