import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const Hero = () => {
  const [slides, setSlides] = useState([
    { desktop: "./purple.jpg", mobile: "./purple.jpg", link: "" },
  ]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const fetchCarouselData = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/cms/hero_carousel`);
      if (response.data.success && response.data.content && response.data.content.length > 0) {
        setSlides(response.data.content);
      }
    } catch (error) {
      console.error("Error fetching carousel data:", error);
    }
  };

  useEffect(() => {
    fetchCarouselData();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef(null);

  const goToSlide = (index) => {
    if (sliderRef.current && sliderRef.current.parentElement) {
      const slideWidth = sliderRef.current.parentElement.clientWidth;
      sliderRef.current.style.transform = `translateX(-${
        index * slideWidth
      }px)`;
    }
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (slides.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [slides.length]);

  useEffect(() => {
    goToSlide(currentSlide);
  }, [currentSlide, slides.length]);

  return (
    <div className="w-full">
      <div className="w-full h-[60vh] sm:h-[70vh] lg:h-[85vh] overflow-hidden relative">
        <div
          className="flex transition-transform duration-500 ease-in-out h-full"
          ref={sliderRef}
        >
          {slides.map((slide, i) => (
            <div key={i} className="w-full h-full flex-shrink-0 relative">
              {slide.link ? (
                <Link to={slide.link} className="block w-full h-full">
                  <img
                    src={isMobile ? (slide.mobile || slide.desktop) : (slide.desktop || slide.mobile)}
                    alt={`Slide ${i + 1}`}
                    className="w-full h-full object-cover object-top"
                  />
                </Link>
              ) : (
                <img
                  src={isMobile ? (slide.mobile || slide.desktop) : (slide.desktop || slide.mobile)}
                  alt={`Slide ${i + 1}`}
                  className="w-full h-full object-cover object-top"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
