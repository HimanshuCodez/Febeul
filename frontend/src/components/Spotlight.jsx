import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

const defaultCategories = [
  { label: "BABYDOLL", image: "/first.jpg", link: "/products/babydoll" },
  { label: "LINGERIE", image: "/second.jpg", link: "/products/lingerie" },
  { label: "NIGHTY", image: "/three.jpg", link: "/products/nighty" },
  { label: "PAJAMAS", image: "/four.jpg", link: "/products/pajamas" },
];

export default function Spotlight() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchSpotlight = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/spotlight_categories`);
        if (response.data.success && response.data.content && response.data.content.length > 0) {
          setCategories(response.data.content);
        } else {
          setCategories(defaultCategories);
        }
      } catch (error) {
        console.error("Error fetching spotlight data:", error);
        setCategories(defaultCategories);
      } finally {
        setLoading(false);
      }
    };
    fetchSpotlight();
  }, [backendUrl]);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center py-8">
        <div className="h-9 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-5 w-96 bg-gray-200 rounded animate-pulse mb-6"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-10 sm:gap-20 lg:gap-36">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-28 h-28 sm:w-44 sm:h-44 rounded-full bg-gray-200 animate-pulse border-2 border-gray-100 shadow-sm"></div>
              <div className="mt-3 h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center py-8">
      <h2 className="text-4xl font-semibold mb-2 text-center text-gray-800">
        Embrace your body
      </h2>
      <p className="text-lg mb-6 text-center max-w-xl text-gray-600">
        Sleek And Confident Bodysuits That Hug You Just Right
      </p>

      {/* Responsive Grid */}
      <div
        className="
          grid 
          grid-cols-2 
          sm:grid-cols-3 
          lg:grid-cols-4  
          gap-10
          sm:gap-20
          lg:gap-36
        "
      >
        {categories.map((c, i) => (
          <Link key={i} to={c.link || `/products/${c.label.toLowerCase()}`}>
            <motion.div
              whileHover={{ scale: 1.07 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex flex-col items-center"
            >
              <div className="w-28 h-28 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-pink-200 shadow-md">
                <img
                  src={c.image || c.img}
                  alt={c.label}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="mt-3 text-sm font-medium tracking-wide text-center uppercase">
                {c.label}
              </p>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
