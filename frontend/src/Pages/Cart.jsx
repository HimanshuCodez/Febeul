import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, ShoppingBag, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import axios from "axios";
import { toast } from "react-hot-toast";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token, isAuthenticated, fetchCartCount } = useAuthStore();

  const fetchCart = async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(
        `${backendUrl}/api/cart/get`,
        { headers: { token } }
      );
      if (response.data.success) {
        setCartItems(response.data.cartItems || []);
      }
    } catch (error) {
      toast.error("Failed to fetch cart items.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [isAuthenticated, user]);

  const handleQuantityChange = async (itemId, size, color, delta) => {
    const item = cartItems.find(item => item._id === itemId && item.size === size && item.color === color);
    const newQuantity = (item.quantity || 0) + delta;

    if (newQuantity < 1) {
        handleRemove(itemId, size, color);
        return;
    }

    try {
        const response = await axios.post(`${backendUrl}/api/cart/update`, 
            { userId: user._id, itemId, size, color, quantity: newQuantity },
            { headers: { token } }
        );
        if (response.data.success) {
            fetchCart(); // Refetch cart to ensure data is in sync
            fetchCartCount(); // Update cart count in store
        } else {
            toast.error("Failed to update cart.");
        }
    } catch (error) {
        toast.error("Failed to update cart.");
    }
  };

  const handleRemove = async (itemId, size, color) => {
    try {
        const response = await axios.post(`${backendUrl}/api/cart/remove`, 
            { userId: user._id, itemId, size, color },
            { headers: { token } }
        );
        if (response.data.success) {
            toast.success("Item removed from cart.");
            fetchCart();
            fetchCartCount(); // Update cart count in store
        } else {
            toast.error("Failed to remove item.");
        }
    } catch (error) {
        toast.error("Failed to remove item.");
    }
  };

  const subtotal = (cartItems || []).reduce(
    (sum, item) => {
      const variation = item.variations.find(v => v.color === item.color);
      const price = variation ? variation.price : 0;
      return sum + (price * item.quantity);
    },
    0
  );
  const shipping = subtotal > 499 ? 0 : 50;
  const tax = 0;
  const total = subtotal + shipping + tax;

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-pink-50/50 font-sans">
      <div className="container mx-auto px-4 py-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-gray-800 mb-8"
        >
          Shopping Cart
        </motion.h1>

        {!isAuthenticated || cartItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-12 text-center"
          >
            <ShoppingBag className="w-20 h-20 text-pink-400 mb-6" />
            <h2 className="text-2xl font-semibold text-gray-700">
              Your cart is empty
            </h2>
            <p className="text-gray-500 mt-2">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Link to="/" className="mt-6 bg-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-pink-600 transition-colors">
              Continue Shopping
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {cartItems.map((item, index) => {
                const variation = item.variations.find(v => v.color === item.color);
                const price = variation ? variation.price : 0;
                const image = variation ? variation.images[0] : item.variations?.[0]?.images?.[0];

                return (
                <motion.div
                  key={`${item._id}-${item.size}-${item.color}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-md p-4 flex items-start space-x-4"
                >
                  <img
                    src={image}
                    alt={item.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-md object-cover object-top"
                  />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {item.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {item.size} / {item.color}
                    </p>
                    <p className="text-lg font-bold text-pink-500 mt-1">
                      ₹{price.toFixed(2)}
                    </p>
                    <div className="flex items-center mt-4">
                      <div className="flex items-center border rounded-md">
                        <button
                          onClick={() => handleQuantityChange(item._id, item.size, item.color, -1)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-l-md"
                        >
                          -
                        </button>
                        <span className="px-4 font-medium text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item._id, item.size, item.color, 1)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-r-md"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(item._id, item.size, item.color)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </motion.div>
              )})}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-1 bg-white rounded-lg shadow-md p-6 h-fit"
            >
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-4">
                Order Summary
              </h2>
              <div className="space-y-4 mt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "Free" : `₹${shipping.toFixed(2)}`}</span>
                </div>
              
                <div className="border-t pt-4 mt-4 flex justify-between font-bold text-gray-800 text-lg">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            <Link to="/checkout"><button className="w-full mt-6 bg-pink-500 text-white py-3 rounded-lg font-semibold text-lg hover:bg-pink-600 transition-colors flex items-center justify-center space-x-2">
                <CreditCard size={20} />
                
                <span>Proceed to Checkout</span>
              </button></Link>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;