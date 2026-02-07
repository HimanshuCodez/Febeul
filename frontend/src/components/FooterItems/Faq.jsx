import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import PolicySection from '../PolicySection.jsx'; // Import the new reusable component

const backendUrl = "http://localhost:4000"; // Assuming backend is running on port 4000

const Faq = () => {
  const [policyContent, setPolicyContent] = useState([]);
  const [pageTitle, setPageTitle] = useState('Loading FAQs...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPolicy = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/policy/Faq`); // Assuming policyName "Faq"
        setPolicyContent(response.data.content);
        setPageTitle(response.data.pageTitle);
      } catch (err) {
        console.error('Error fetching FAQ policy:', err);
        setError('Failed to load FAQs. Please try again later.');
        setPageTitle('Error');
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fde2e4] to-[#f9d1d1]">
        <p className="text-xl text-[#f47b7d] font-semibold">Loading FAQs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fde2e4] to-[#f9d1d1]">
        <p className="text-xl text-red-500 font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fde2e4] to-[#f9d1d1] py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="max-w-4xl mx-auto"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: -40 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
          }}
          className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40 mb-10"
        >
            <h1 className="text-3xl md:text-5xl font-bold text-center mb-4 text-[#f47b7d]">
            {pageTitle}
            </h1>
        </motion.div>

        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3 } },
            }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40"
        >
          {policyContent.map((section, index) => (
            <PolicySection key={index} index={index} title={section.title} content={section.content} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Faq;
