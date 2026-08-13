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

const StylesSection = () => {
  const [styles, setStyles] = useState(defaultStyles);
  const [pillBackgroundColor, setPillBackgroundColor] = useState('#fbcfe8');
  const [pillTextColor, setPillTextColor] = useState('#111827');

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
        }
      } catch (error) {
        console.error("Error fetching style categories:", error);
      }
    };

    fetchStyles();
  }, []);

  return (
    <section className="bg-gradient-to-b from-black via-pink-300 to-black text-white py-16 px-4 text-center">
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
              style={{ backgroundColor: pillBackgroundColor, color: pillTextColor }}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default StylesSection;
