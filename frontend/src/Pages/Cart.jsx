import React, { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, ShoppingBag, CreditCard } from "lucide-react";

const initialItems = [
  {
    id: 1,
    name: "Lace Bralette Set",
    price: 1299,
    image:
      "https://avidlove.com/cdn/shop/files/81UAeytBWlL._AC_SL1500.jpg?v=1760173707&width=5000",
    quantity: 1,
    size: "M",
    color: "Black",
  },
  {
    id: 2,
    name: "Silk Nightwear",
    price: 1899,
    image:
      "https://avidlove.com/cdn/shop/files/SYV008284_RR-1.jpg?v=1755829947&width=5000",
    quantity: 2,
    size: "L",
    color: "Red",
  },
  {
    id: 3,
    name: "Everyday Comfort Bra",
    price: 999,
    image:
      "https://avidlove.com/cdn/shop/files/SYV008324_B-1.jpg?v=1756450957&width=5000",
    quantity: 1,
    size: "S",
    color: "Beige",
  },
];

const Cart = () => {
  const [cartItems, setCartItems] = useState(initialItems);

  const handleQuantityChange = (id, delta) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const handleRemove = (id) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 2000 ? 0 : 50;
  const tax = subtotal * 0.18;
  const total = subtotal + shipping + tax;

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

        {cartItems.length === 0 ? (
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
            <button className="mt-6 bg-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-pink-600 transition-colors">
              Continue Shopping
            </button>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {cartItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-md p-4 flex items-start space-x-4"
                >
                  <img
                    src={item.image}
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
                      ₹{item.price.toFixed(2)}
                    </p>
                    <div className="flex items-center mt-4">
                      <div className="flex items-center border rounded-md">
                        <button
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-l-md"
                        >
                          -
                        </button>
                        <span className="px-4 font-medium text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-r-md"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </motion.div>
              ))}
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
                <div className="flex justify-between text-gray-600">
                  <span>Tax (18%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-4 mt-4 flex justify-between font-bold text-gray-800 text-lg">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
              <button className="w-full mt-6 bg-pink-500 text-white py-3 rounded-lg font-semibold text-lg hover:bg-pink-600 transition-colors flex items-center justify-center space-x-2">
                <CreditCard size={20} />
                <span>Proceed to Checkout</span>
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
