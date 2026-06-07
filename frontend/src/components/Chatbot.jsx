import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Chatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", type: "text", text: "Hi there 💖! I'm Febeul Assistant. How can I help you today? Here are some quick options:" },
  ]);
  const [input, setInput] = useState("");

  const quickActions = [
    { label: "My Orders", payload: "/myorders" },
    { label: "Support", payload: "/support" },
    { label: "Return Policy", payload: "/ReturnRefund" }, // Assuming a policy page
    { label: "Track Order", payload: "/myorders" }, // Can lead to orders page where tracking is visible
  ];

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = { sender: "user", type: "text", text: input };
    setMessages((prev) => [...prev, userMessage]);

    // Simple bot responses
    let botResponse = { sender: "bot", type: "text", text: "I’m here to help with your Febeul experience! 💕" };

    if (input.toLowerCase().includes("order")) {
      botResponse = {
        sender: "bot",
        type: "action",
        text: "Sure! You can view all your orders here:",
        action: { type: "navigate", payload: "/myorders", label: "View My Orders" }
      };
    } else if (input.toLowerCase().includes("return")) {
      botResponse = { sender: "bot", type: "text", text: "No worries! You can return within 7 days of delivery. 💌" };
    } else if (input.toLowerCase().includes("size")) {
      botResponse = { sender: "bot", type: "text", text: "Our Size Guide helps you find your perfect fit 👗 — you’ll find it on every product page." };
    } else if (input.toLowerCase().includes("hello") || input.toLowerCase().includes("hi")) {
      botResponse = { sender: "bot", type: "text", text: "Hey beautiful 💕 How’s your day going?" };
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, botResponse]);
    }, 700);

    setInput("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Chat Button */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="bg-[#f9aeaf] hover:bg-pink-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-80 sm:w-96 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl border border-pink-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white p-4 flex justify-between items-center">
              <h2 className="font-semibold text-lg">💬 Febeul Assistant</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-pink-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-pink-300 scrollbar-track-pink-100">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.type === "text" && (
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${
                        msg.sender === "user"
                          ? "bg-[#f9aeaf] text-white rounded-br-none"
                          : "bg-pink-100 text-gray-800 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}
                  {msg.type === "action" && (
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${
                        msg.sender === "user"
                          ? "bg-[#f9aeaf] text-white rounded-br-none"
                          : "bg-pink-100 text-gray-800 rounded-bl-none"
                      } flex flex-col items-start space-y-2`}
                    >
                      <span>{msg.text}</span>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          navigate(msg.action.payload);
                          setIsOpen(false);
                        }}
                        className="mt-2 px-3 py-1 bg-[#e8767a] text-white rounded-full text-xs hover:bg-[#d5666a]"
                      >
                        {msg.action.label}
                      </motion.button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            {isOpen && (
              <div className="p-3 border-t border-pink-200 bg-pink-50 grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      // Optional: Add user message to history indicating button click
                      setMessages((prev) => [
                        ...prev,
                        { sender: "user", type: "text", text: action.label },
                      ]);
                      navigate(action.payload);
                      setIsOpen(false);
                    }}
                    className="px-3 py-2 bg-pink-100 text-pink-700 rounded-full text-sm hover:bg-pink-200 transition-colors shadow-sm"
                  >
                    {action.label}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-pink-200 flex items-center bg-pink-50">
              <input
                type="text"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 px-3 py-2 bg-white border border-pink-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm"
              />
              <button
                onClick={handleSend}
                className="ml-2 bg-[#f9aeaf] hover:bg-pink-600 text-white p-2 rounded-full"
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
