import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi there 💖! I'm Febeul Assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);

    // Simple bot responses
    let botResponse = "I’m here to help with your Febeul experience! 💕";

    if (input.toLowerCase().includes("order")) {
      botResponse = "You can track your order in the 'My Orders' section 🌸";
    } else if (input.toLowerCase().includes("return")) {
      botResponse = "No worries! You can return within 7 days of delivery. 💌";
    } else if (input.toLowerCase().includes("size")) {
      botResponse = "Our Size Guide helps you find your perfect fit 👗 — you’ll find it on every product page.";
    } else if (input.toLowerCase().includes("hello") || input.toLowerCase().includes("hi")) {
      botResponse = "Hey beautiful 💕 How’s your day going?";
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: "bot", text: botResponse }]);
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
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${
                      msg.sender === "user"
                        ? "bg-[#f9aeaf] text-white rounded-br-none"
                        : "bg-pink-100 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

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
