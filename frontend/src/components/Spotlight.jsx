import { motion } from "framer-motion";

const categories = [
  { label: "BABYDOLL", img: "/first.jpg" },
  { label: "LINGERIE", img: "/second.jpg" },
  { label: "PAJAMAS", img: "/three.jpg" },
  { label: "NIGHTY", img: "/four.jpg" },
];

export default function Spotlight() {
  return (
    <div className="w-full flex flex-col items-center py-8">
      <h2 className="text-4xl font-semibold mb-2 text-center">
        Embrace your body
      </h2>
      <p className="text-lg mb-6 text-center max-w-xl">
        Sleek And Confident Bodysuits That Hug You Just Right
      </p>

      {/* Responsive Grid */}
      <div
        className="
          grid 
          grid-cols-2 
          sm:grid-cols-3 
          lg:grid-cols-4  
          gap-20
          sm:gap-36
       
        "
      >
        {categories.map((c, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.07 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="flex flex-col items-center"
          >
            <div className="w-28 h-28 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-pink-200 shadow-md">
              <img
                src={c.img}
                alt={c.label}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-3 text-sm font-medium tracking-wide text-center">
              {c.label}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
