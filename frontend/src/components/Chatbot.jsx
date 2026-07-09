import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  X, 
  Send, 
  Gem, 
  Package, 
  HelpCircle, 
  ArrowRight,
  Sparkles,
  Info,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Chatbot = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { 
      sender: "bot", 
      type: "text", 
      text: `Hello beautiful! 💖 Welcome to Febeul. I'm your digital style assistant. How can I help you today?` 
    },
    {
      sender: "bot",
      type: "options",
      options: [
        { label: "📦 Track My Orders", id: "track_orders" },
        { label: "💎 Luxe VIP Membership", id: "luxe_membership" },
        { label: "🔄 Returns & Refund Policy", id: "returns_policy" },
        { label: "📞 Speak to Customer Care", id: "customer_support" }
      ]
    }
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isOpen]);

  const addBotResponse = (response) => {
    // Show typing state
    setMessages((prev) => [...prev, { sender: "bot", type: "typing" }]);
    
    setTimeout(() => {
      setMessages((prev) => {
        const cleanList = prev.filter(m => m.type !== "typing");
        return [...cleanList, response];
      });
    }, 1000);
  };

  const fetchUserOrders = async () => {
    if (!isAuthenticated || !token) {
      return {
        sender: "bot",
        type: "text_with_action",
        text: "Please sign in to track your orders. 🔐",
        action: { label: "Login / Sign Up", path: "/auth" }
      };
    }

    try {
      const response = await axios.post(`${backendUrl}/api/order/userorders`, {}, { headers: { token } });
      if (response.data.success && response.data.orders.length > 0) {
        const sortedOrders = response.data.orders.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
        return {
          sender: "bot",
          type: "orders_list",
          orders: sortedOrders,
          text: "Here are your recent orders. Tap on any order to see full shipment details:"
        };
      } else {
        return {
          sender: "bot",
          type: "text",
          text: "You haven't placed any orders yet. 🛍️ Let's explore our trending collection!"
        };
      }
    } catch (e) {
      console.error(e);
      return {
        sender: "bot",
        type: "text",
        text: "Apologies, I couldn't fetch your orders right now. You can check them directly on the Orders page."
      };
    }
  };

  const handleOptionClick = async (optionId) => {
    // Show user choice
    let userText = "";
    if (optionId === "track_orders") userText = "Track My Orders";
    else if (optionId === "luxe_membership") userText = "Luxe VIP Membership";
    else if (optionId === "returns_policy") userText = "Returns & Refund Policy";
    else if (optionId === "customer_support") userText = "Speak to Customer Care";
    else if (optionId === "main_menu") userText = "Go back to main menu";

    if (userText) {
      setMessages((prev) => [...prev, { sender: "user", type: "text", text: userText }]);
    }

    if (optionId === "track_orders") {
      setMessages((prev) => [...prev, { sender: "bot", type: "typing" }]);
      const res = await fetchUserOrders();
      setMessages((prev) => {
        const cleanList = prev.filter(m => m.type !== "typing");
        return [...cleanList, res];
      });
    } else if (optionId === "luxe_membership") {
      addBotResponse({
        sender: "bot",
        type: "text_with_action",
        text: "Febeul Luxe members get Priority Delivery, Free Shipping, 15 Complimentary Gift Wraps, exclusive Luxe Prive collection access, and special members-only coupons! 💎 Joining costs only ₹129/month.",
        action: { label: "Explore Luxe VIP Perks", path: "/luxe" }
      });
    } else if (optionId === "returns_policy") {
      addBotResponse({
        sender: "bot",
        type: "text_with_action",
        text: "We offer a hassle-free 3-day return window starting from the date of delivery. For return requests, uploading exactly 4 clear product images is mandatory. 🔄",
        action: { label: "Read Refund Guidelines", path: "/ReturnRefund" }
      });
    } else if (optionId === "customer_support") {
      addBotResponse({
        sender: "bot",
        type: "text_with_action",
        text: "Have specialized questions? Feel free to contact our dedicated customer care team or submit a support ticket. 📞",
        action: { label: "Open Help Support Page", path: "/support" }
      });
    } else if (optionId === "main_menu") {
      addBotResponse({
        sender: "bot",
        type: "options",
        options: [
          { label: "📦 Track My Orders", id: "track_orders" },
          { label: "💎 Luxe VIP Membership", id: "luxe_membership" },
          { label: "🔄 Returns & Refund Policy", id: "returns_policy" },
          { label: "📞 Speak to Customer Care", id: "customer_support" }
        ]
      });
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", type: "text", text: input };
    setMessages((prev) => [...prev, userMessage]);

    const query = input.toLowerCase();
    setInput("");

    // Bot Response Logic
    if (query.includes("order") || query.includes("track")) {
      setMessages((prev) => [...prev, { sender: "bot", type: "typing" }]);
      fetchUserOrders().then(res => {
        setMessages((prev) => {
          const cleanList = prev.filter(m => m.type !== "typing");
          return [...cleanList, res];
        });
      });
    } else if (query.includes("luxe") || query.includes("member")) {
      addBotResponse({
        sender: "bot",
        type: "text_with_action",
        text: "Luxe VIP offers free priority shipping, 15 gift wraps, dedicated VIP support and access to Luxe Prive sales! 👑 Unlock elite shopping now.",
        action: { label: "Unlock Luxe Membership", path: "/luxe" }
      });
    } else if (query.includes("return") || query.includes("refund")) {
      addBotResponse({
        sender: "bot",
        type: "text_with_action",
        text: "Return requests are accepted within 3 days of delivery. Make sure to capture exactly 4 clear images of the product. 🔄",
        action: { label: "View Policy Details", path: "/ReturnRefund" }
      });
    } else if (query.includes("support") || query.includes("help") || query.includes("contact")) {
      addBotResponse({
        sender: "bot",
        type: "text_with_action",
        text: "Need personal assistance? You can submit your queries directly to our VIP customer support team. 📞",
        action: { label: "Go to Help Center", path: "/support" }
      });
    } else if (query.includes("hi") || query.includes("hello") || query.includes("hey")) {
      addBotResponse({
        sender: "bot",
        type: "text",
        text: `Hey gorgeous! 💖 So good to chat with you today! How can I help you styling up or tracking your parcel?`
      });
      setTimeout(() => {
        addBotResponse({
          sender: "bot",
          type: "options",
          options: [
            { label: "📦 Track My Orders", id: "track_orders" },
            { label: "💎 Luxe VIP Membership", id: "luxe_membership" },
            { label: "🔄 Returns & Refund Policy", id: "returns_policy" },
            { label: "📞 Speak to Customer Care", id: "customer_support" }
          ]
        });
      }, 1000);
    } else {
      addBotResponse({
        sender: "bot",
        type: "options",
        text: "I want to make sure I help you correctly! Please choose one of the options below or describe your concern:",
        options: [
          { label: "📦 Track My Orders", id: "track_orders" },
          { label: "💎 Luxe VIP Membership", id: "luxe_membership" },
          { label: "🔄 Returns & Refund Policy", id: "returns_policy" },
          { label: "📞 Speak to Customer Care", id: "customer_support" }
        ]
      });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {/* Floating Chat Button */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/20"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-300"></span>
          </span>
          <MessageCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-black tracking-widest uppercase">Chat With Us</span>
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-[330px] sm:w-[380px] h-[520px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-pink-100/80"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-5 py-4 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3 text-left">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-black text-sm">
                    FB
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <h2 className="font-extrabold text-sm tracking-wide">Febeul Support 💖</h2>
                  <p className="text-[10px] font-bold text-pink-100 uppercase tracking-widest">Style AI Assistant • Online</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-50/50">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[85%] text-left">
                    {msg.type === "text" && (
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                          msg.sender === "user"
                            ? "bg-[#e8767a] text-white rounded-br-none font-medium"
                            : "bg-white text-slate-700 border border-slate-100 rounded-bl-none font-medium leading-relaxed"
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}

                    {msg.type === "text_with_action" && (
                      <div className="bg-white text-slate-700 border border-slate-100 px-4 py-3.5 rounded-2xl rounded-bl-none shadow-sm space-y-3 font-medium text-sm leading-relaxed">
                        <p>{msg.text}</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            navigate(msg.action.path);
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-[#e8767a] hover:bg-[#d5666a] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                        >
                          {msg.action.label} <ArrowRight className="w-3 h-3" />
                        </motion.button>
                      </div>
                    )}

                    {msg.type === "options" && (
                      <div className="space-y-2">
                        {msg.text && (
                          <div className="bg-white text-slate-700 border border-slate-100 px-4 py-2.5 rounded-2xl rounded-bl-none shadow-sm text-sm font-medium leading-relaxed mb-1">
                            {msg.text}
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          {msg.options.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => handleOptionClick(opt.id)}
                              className="w-full text-left py-2.5 px-4 bg-white hover:bg-pink-50/50 text-slate-700 hover:text-[#e8767a] rounded-xl border border-slate-100 hover:border-pink-200 transition-all font-bold text-xs shadow-sm flex items-center justify-between"
                            >
                              <span>{opt.label}</span>
                              <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.type === "orders_list" && (
                      <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-bl-none shadow-sm space-y-3">
                        <p className="text-sm font-bold text-slate-700">{msg.text}</p>
                        <div className="space-y-2">
                          {msg.orders.map((ord) => (
                            <div 
                              key={ord._id}
                              onClick={() => {
                                navigate(`/order-detail/${ord._id}`);
                                setIsOpen(false);
                              }}
                              className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-pink-50/20 hover:border-pink-100 transition-all cursor-pointer text-left space-y-1"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-[#e8767a]">#{ord._id.slice(-8).toUpperCase()}</span>
                                <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                                  {ord.orderStatus}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                                <span>₹{(ord.orderTotal || 0).toFixed(2)}</span>
                                <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {new Date(ord.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.type === "typing" && (
                      <div className="bg-white border border-slate-100 px-4 py-2.5 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1 w-fit">
                        <span className="w-1.5 h-1.5 bg-[#e8767a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-[#e8767a] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-[#e8767a] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-100 bg-white flex items-center">
              <input
                type="text"
                placeholder="Ask about orders, membership, size..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-200 text-xs font-semibold placeholder-slate-400"
              />
              <button
                onClick={handleSend}
                className="ml-2 w-9 h-9 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chatbot;
