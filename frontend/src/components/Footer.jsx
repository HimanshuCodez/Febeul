import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black text-gray-300 pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          
          {/* Brand + Contact Info */}
          <div className="space-y-4">
            <img
              src="./removebgLogo.png"   /* <-- replace with: /logo.png or actual path */
              alt="Febeul Logo"
              className="w-44"
            />

            <div className="flex items-center gap-2 text-sm">
              <span>📍</span> <p>Delhi, India</p>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span>📧</span>
              <a href="mailto:Support@Febeul.com" className="hover:text-white">
                Support@Febeul.com
              </a>
            </div>

            <p className="text-xs text-gray-400">
              Timings: 10:00 AM to 6:30 PM  
              (Monday–Saturday)
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 uppercase text-sm">
              QUICK LINKS
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/explore" className="hover:text-white">Explore</Link></li>
              <li><Link to="/babydoll" className="hover:text-white">Babydoll</Link></li>
              <li><Link to="/lingerie" className="hover:text-white">Lingerie</Link></li>
              <li><Link to="/pajamas" className="hover:text-white">Pajamas</Link></li>
              <li><Link to="/nighty" className="hover:text-white">Nighty</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4 uppercase text-sm">
              SUPPORT
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/order-tracking" className="hover:text-white">Order Tracking</Link></li>
              <li><Link to="/ReturnRefund" className="hover:text-white">Return & Refund</Link></li>
              <li><Link to="/GrievanceRedressals" className="hover:text-white">Grievance Redressals</Link></li>
              <li><Link to="/PaymentPolicy" className="hover:text-white">Payment Policy</Link></li>
              <li><Link to="/Faq" className="hover:text-white">FAQs</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
            </ul>
          </div>

          {/* Policies + Account */}
          <div>
            <h3 className="text-white font-semibold mb-4 uppercase text-sm">
              Policies
            </h3>
            <ul className="space-y-2 text-sm mb-6">
              <li><Link to="/ReviewRating" className="hover:text-white">Review & Rating</Link></li>
              <li><Link to="/TermsConditions" className="hover:text-white">Terms & Conditions</Link></li>
              <li><Link to="/DataPrivacy" className="hover:text-white">Data Privacy</Link></li>
              <li><Link to="/LuxePolicy" className="hover:text-white">Luxe membership policy</Link></li>
            </ul>

            <h3 className="text-white font-semibold mb-4 uppercase text-sm mt-6">
              Account
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/auth" className="hover:text-white">Create Account</Link></li>
              <li><Link to="/auth" className="hover:text-white">Sign In</Link></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-6"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} Febeul.com. All Rights Reserved</p>

          <div className="flex gap-5 text-gray-400">
            <a href="#" className="hover:text-white"><Facebook size={20} /></a>
            <a href="#" className="hover:text-white"><Instagram size={20} /></a>
            <a href="#" className="hover:text-white"><Youtube size={20} /></a>
            <a href="#" className="hover:text-white"><Twitter size={20} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
