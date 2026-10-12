import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const FALLBACK_IMAGE = "/purple.jpg";
const FALLBACK_SLIDES = [{ desktop: FALLBACK_IMAGE, mobile: FALLBACK_IMAGE, link: "" }];
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Hero = () => {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [aspectRatios, setAspectRatios] = useState({});
  const [failedSources, setFailedSources] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const fetchCarouselData = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/hero_carousel`, { signal: controller.signal });
        const content = response.data.success && response.data.content;
        const validSlides = Array.isArray(content) ? content.filter(slide =>
          slide && [slide.desktop, slide.mobile].some(source => typeof source === "string" && source.trim())
        ) : [];
        setSlides(validSlides.length ? validSlides : FALLBACK_SLIDES);
      } catch (error) {
        if (!axios.isCancel(error)) console.error("Error fetching carousel data:", error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchCarouselData();
    const viewport = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobile(viewport.matches);
    viewport.addEventListener("change", updateViewport);
    return () => {
      controller.abort();
      viewport.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const interval = window.setInterval(() => {
      setCurrentSlide(previous => (previous + 1) % slides.length);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [slides.length]);

  const getSource = (slide) => {
    const sources = isMobile ? [slide.mobile, slide.desktop] : [slide.desktop, slide.mobile];
    return sources.find(source => typeof source === "string" && source.trim() && !failedSources[source]) || FALLBACK_IMAGE;
  };

  const rememberAspectRatio = (source, image) => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    const ratio = image.naturalWidth / image.naturalHeight;
    setAspectRatios(previous => previous[source] === ratio ? previous : { ...previous, [source]: ratio });
  };

  if (loading) {
    return <div className="w-full aspect-[3/4] md:aspect-video bg-gray-100 animate-pulse" aria-label="Loading featured collections" />;
  }

  const activeSource = getSource(slides[currentSlide]);

  return (
    <section
      aria-label="Featured collections"
      aria-roledescription="carousel"
      className="relative w-full overflow-hidden bg-gray-100"
      style={{ aspectRatio: aspectRatios[activeSource] || (isMobile ? "3 / 4" : "16 / 9") }}
    >
      <div
        className="absolute inset-0 flex w-full items-start transition-transform duration-500 ease-in-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => {
          const source = getSource(slide);
          const media = (
            <img
              src={source}
              alt={`Slide ${index + 1}`}
              className="block w-full h-auto"
              onLoad={event => rememberAspectRatio(source, event.currentTarget)}
              onError={() => {
                if (source !== FALLBACK_IMAGE) setFailedSources(previous => ({ ...previous, [source]: true }));
              }}
            />
          );
          return (
            <div key={index} className="w-full flex-shrink-0" aria-hidden={index !== currentSlide}>
              {slide.link ? <Link to={slide.link} className="block w-full" tabIndex={index === currentSlide ? 0 : -1}>{media}</Link> : media}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Hero;
