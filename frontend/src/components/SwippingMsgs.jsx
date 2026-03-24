import { useState, useEffect } from "react";
import axios from "axios";

const SwipingMessages = ({ className }) => {
  const [messages, setMessages] = useState([
    "Free Shipping on Orders Over Rs 499",
    "Register To Get 10% Off: CODE: FNEW10",
    "2 Days Return And Exchange Policy",
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/swiping_messages`);
        if (response.data && response.data.content) {
          setMessages(response.data.content);
        }
      } catch (error) {
        console.error("Error fetching swiping messages:", error);
      }
    };

    fetchMessages();
  }, [backendUrl]);

  useEffect(() => {
    if (messages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className={`h-6 overflow-hidden relative max-w-full sm:max-w-xs md:w-80 text-center ${className || ''}`}>
      {messages.map((message, index) => (
        <div
          key={index}
          className="absolute bg-black text-white border-none w-full transition-transform duration-1000 ease-in-out"
          style={{ transform: `translateY(${(index - currentIndex) * 100}%)` }}
        >
          {message}
        </div>
      ))}
    </div>
  );
};

export default SwipingMessages;
