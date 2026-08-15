import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, Twitter, AtSign } from "lucide-react";
import axios from "axios";

const Footer = () => {
  const [customPolicies, setCustomPolicies] = useState([]);

  useEffect(() => {
    const fetchCustomPolicies = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/policy`);
        const allPolicies = response.data || [];
        const predefined = [
          'dataprivacy', 'faq', 'giftwrappolicy', 'grievanceredressals', 
          'luxepolicy', 'paymentpolicy', 'returnrefund', 'reviewrating', 
          'termsconditions'
        ];
        // Filter out predefined ones
        const filtered = allPolicies.filter(p => !predefined.includes(p.policyName.toLowerCase()));
        setCustomPolicies(filtered);
      } catch (error) {
        console.error("Error loading policies in footer:", error);
      }
    };
    fetchCustomPolicies();
  }, []);
  return (
    <footer className="bg-black text-gray-300 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-8 mb-10">
          
          {/* Brand + Contact Info */}
          <div className="lg:col-span-1 space-y-6 text-center lg:text-left">
            <img
              src="/removebgLogo.png"   /* <-- replace with: /logo.png or actual path */
              alt="Febeul Logo"
              className="w-44 mx-auto sm:mx-0"
            />

            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
              <span>📍</span> <p>Delhi, India</p>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
              <span>📞</span>
              <a href="tel:+919990310241" className="hover:text-white">
                +91 99903 10241
              </a>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
              <span>📧</span>
              <a href="mailto:Support@Febeul.com" className="hover:text-white">
                Support@Febeul.com
              </a>
            </div>

            <p className="text-xs text-gray-400">
              Timings: 10:00 AM to 6:30 PM  
              (Monday–Saturday)
            </p>
            {/* Payment Gateway Logos */}
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-3">
  {[
    { src: "/upi.png", alt: "UPI" },
    { src: "/visa.png", alt: "Visa" },
    { src: "/mastercard.png", alt: "Mastercard" },
    { src: "/bank.png", alt: "Net Banking" },
    { src: "/cod.png", alt: "Cash on Delivery" },
  ].map((icon) => (
    <div
      key={icon.alt}
      className="flex h-9 sm:h-10 w-auto items-center justify-center"
    >
      <img
        src={icon.src}
        alt={icon.alt}
        className="max-h-full max-w-[70px] sm:max-w-[80px] object-contain"
      />
    </div>
  ))}
</div>
          </div>

          {/* Links Sections */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Quick Links */}
            <div className="text-center sm:text-left">
              <h3 className="text-white font-semibold mb-4 uppercase text-sm">
                QUICK LINKS
              </h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-white">Home</Link></li>
                
                <li><Link to="/products/babydoll/type/above-knee-b-doll" className="hover:text-white">Babydoll</Link></li>
                <li><Link to="/products/lingerie/type/teddy-choker-lingz" className="hover:text-white">Lingerie</Link></li>
                <li><Link to="/products/pajamas" className="hover:text-white">Pajamas</Link></li>
                <li><Link to="/products/nighty/type/silk-satin" className="hover:text-white">Nighty</Link></li>
                <li><Link to="/bestsellers" className="hover:text-white">Bestseller</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div className="text-center sm:text-left">
              <h3 className="text-white font-semibold mb-4 uppercase text-sm">
                SUPPORT
              </h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/Profile" state={{ activeTab: "orders" }} className="hover:text-white">My Orders</Link></li>
                <li><Link to="/ReturnRefund" target="_blank" rel="noopener noreferrer" className="hover:text-white">Return & Refund</Link></li>
                <li><Link to="/GrievanceRedressals" target="_blank" rel="noopener noreferrer" className="hover:text-white">Grievance Redressals</Link></li>
                <li><Link to="/PaymentPolicy" target="_blank" rel="noopener noreferrer" className="hover:text-white">Payment Policy</Link></li>
                <li><Link to="/Faq" target="_blank" rel="noopener noreferrer" className="hover:text-white">FAQs</Link></li>
                <li><Link to="/support" target="_blank" rel="noopener noreferrer" className="hover:text-white">Contact Us</Link></li>
              </ul>
            </div>

            {/* Policies + Account */}
            <div className="text-center sm:text-left col-span-2 sm:col-span-1">
              <h3 className="text-white font-semibold mb-4 uppercase text-sm">
                Policies
              </h3>
              <ul className="space-y-2 text-sm mb-6">
                <li><Link to="/ReviewRating" target="_blank" rel="noopener noreferrer" className="hover:text-white">Review & Rating</Link></li>
                <li><Link to="/TermsConditions" target="_blank" rel="noopener noreferrer" className="hover:text-white">Terms & Conditions</Link></li>
                <li><Link to="/DataPrivacy" target="_blank" rel="noopener noreferrer" className="hover:text-white">Data Privacy</Link></li>
                <li><Link to="/LuxePolicy" target="_blank" rel="noopener noreferrer" className="hover:text-white">Luxe membership policy</Link></li>
                <li><Link to="/GiftWrapPolicy" target="_blank" rel="noopener noreferrer" className="hover:text-white">Gift Wrap Policy</Link></li>
                {customPolicies && customPolicies.map((p) => (
                  <li key={p.policyName}>
                    <Link to={`/policy/${p.policyName}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      {p.pageTitle}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-6"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} Febeul.com. All Rights Reserved</p>

          <div className="flex gap-5 text-gray-400">
            <a href="https://www.facebook.com/febeul" target="_blank" className="hover:text-white"><Facebook size={20} /></a>
            <a href="https://www.instagram.com/febeul.official" target="_blank" className="hover:text-white"><Instagram size={20} /></a>
            <a href="https://www.threads.com/@febeul.official" target="_blank" className="hover:text-white"><AtSign size={20} /></a>
            <a href="#" className="hover:text-white"><Youtube size={20} /></a>
            <a href="#" className="hover:text-white"><Twitter size={20} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;