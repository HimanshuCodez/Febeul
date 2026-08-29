import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Shirt, Star, Gem, Scissors, Shield, Grid, Network, Layers } from "lucide-react";

const iconMap = { Shirt, Star, Gem, Scissors, Shield, Grid, Network, Layers };

const defaultStyles = [
  { icon: "Shirt", label: "TeddyS & Bodysuits", link: "" },
  { icon: "Star", label: "Satin Babydoll", link: "" },
  { icon: "Gem", label: "Net Nighty", link: "" },
  { icon: "Scissors", label: "Garter Lingerie", link: "" },
  { icon: "Shield", label: "Satin Pj", link: "" },
  { icon: "Grid", label: "Skirt Babydoll", link: "" },
  { icon: "Network", label: "Sheer Mesh", link: "" },
  { icon: "Network", label: "Eye Mask Dress", link: "" },
  { icon: "Layers", label: "Silk Nighty", link: "" },
];

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const SYSTEM_FONTS = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 'system-ui'];

const StylesSection = () => {
  const [styles, setStyles] = useState(defaultStyles);
  const [pillBackgroundColor, setPillBackgroundColor] = useState('#fbcfe8');
  const [pillTextColor, setPillTextColor] = useState('#111827');
  const [pillFontFamily, setPillFontFamily] = useState('');
  const [desktopBackground, setDesktopBackground] = useState('');
  const [mobileBackground, setMobileBackground] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/style_categories`);
        if (!response.data?.success) return;
        const content = response.data.content;
        if (Array.isArray(content) && content.length > 0) {
          // Legacy shape: content was just the pills array, no custom colors saved yet
          setStyles(content);
        } else if (content && Array.isArray(content.items) && content.items.length > 0) {
          setStyles(content.items);
          setPillBackgroundColor(content.pillBackgroundColor || '#fbcfe8');
          setPillTextColor(content.pillTextColor || '#111827');
          setPillFontFamily(content.pillFontFamily || '');
          setDesktopBackground(content.desktopBackground || '');
          setMobileBackground(content.mobileBackground || '');
        }
      } catch (error) {
        console.error("Error fetching style categories:", error);
      }
    };

    fetchStyles();

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!pillFontFamily || SYSTEM_FONTS.includes(pillFontFamily)) return;
    const linkId = 'google-font-style-pills';
    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${pillFontFamily.replace(/\s+/g, '+')}:wght@400;600;700&display=swap`;
  }, [pillFontFamily]);

  const backgroundImage = isMobile
    ? (mobileBackground || desktopBackground)
    : (desktopBackground || mobileBackground);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-black via-pink-300 to-black text-white text-center">
      {backgroundImage && (
        <img src={backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}

      <div className="relative z-10 py-16 px-4">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-wide mb-10">
          SUITABLE FOR DIFFERENT STYLES
        </h2>

        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {styles.map((item, index) => {
            const Icon = iconMap[item.icon] || Star;
            return (
              <Link
                key={index}
                to={item.link || "#"}
                className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium cursor-pointer transition-transform transform hover:scale-105"
                style={{ backgroundColor: pillBackgroundColor, color: pillTextColor, fontFamily: pillFontFamily || undefined }}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StylesSection;
