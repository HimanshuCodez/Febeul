import { useState, useEffect } from "react";

const SwipingMessages = () => {
  const messages = [
    "Free Shipping on Orders Over Rs 499",
    "Register To Get 10% Off: CODE: FNEW10",
    "2 Days Return And Exchange Policy",
  ];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 overflow-hidden relative max-w-full sm:max-w-xs md:w-80 text-center">
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