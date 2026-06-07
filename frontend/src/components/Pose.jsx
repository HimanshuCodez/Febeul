import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function LingerieRobeSection() {
  const [poseData, setPoseData] = useState({ desktop: "/redHome.png", mobile: "/redHome.png", link: "" });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchPose = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/cms/pose_section`);
        if (response.data.success && response.data.content) {
          setPoseData(response.data.content);
        }
      } catch (error) {
        console.error("Error fetching pose section:", error);
      }
    };
    fetchPose();
    
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [backendUrl]);

  return (
    <section className="w-full bg-white">
      {/* Full Screen Image */}
      <div className="w-full h-[85vh] overflow-hidden">
        {poseData.link ? (
          <Link to={poseData.link} className="block w-full h-full">
            <img
              src={isMobile ? (poseData.mobile || poseData.desktop) : (poseData.desktop || poseData.mobile)}
              alt="Lingerie Robe"
              className="w-full h-full object-cover"
            />
          </Link>
        ) : (
          <img
            src={isMobile ? (poseData.mobile || poseData.desktop) : (poseData.desktop || poseData.mobile)}
            alt="Lingerie Robe"
            className="w-full h-full object-cover"
          />
        )}
      </div>
    </section>
  );
}
