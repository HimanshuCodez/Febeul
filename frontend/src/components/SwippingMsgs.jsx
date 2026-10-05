import { useState, useEffect } from "react";
import axios from "axios";
import SocialLinks from "./SocialLinks";

const SwipingMessages = ({ className, showSocials = true, messagesClassName = '' }) => {
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
        if (response.data && Array.isArray(response.data.content)) {
          setMessages(response.data.content.filter(message => typeof message === 'string'));
          setCurrentIndex(0);
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

  if (messages.length === 0 && !showSocials) return null;

  return (
    <div className={`flex w-full min-w-0 items-center justify-center gap-3 bg-black text-center text-xs text-white md:text-sm ${className || ''}`}>
      {showSocials && <SocialLinks placement="topBar" className="max-w-full shrink-0 gap-1 overflow-x-auto md:max-w-[35%]" />}
      {messages.length > 0 && (
      <div className={`relative h-6 min-w-0 flex-1 overflow-hidden ${messagesClassName}`}>
      {messages.map((message, index) => (
        <div
          key={index}
          aria-hidden={index !== currentIndex}
          className="absolute inset-0 flex h-full w-full items-center justify-center bg-black text-white transition-transform duration-1000 ease-in-out motion-reduce:transition-none"
          style={{ transform: `translateY(${(index - currentIndex) * 100}%)` }}
        >
          {message}
        </div>
      ))}
      </div>
      )}
    </div>
  );
};

export default SwipingMessages;
