// App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import useAuthStore from "./store/authStore";
import Home from "./Pages/Home";
import "./index.css";
import Profile from "./Pages/Profile";
import Wishlist from "./Pages/Wishlist";
import Cart from "./Pages/Cart";
import Address from "./Pages/Address"; // Added import
import Support from "./Pages/Support";
import Chatbot from "./components/Chatbot";
import FebeulMembership from "./components/Membership";
import AuthPage from "./Pages/AuthPage";
import ProductPage from "./Pages/ProductPage";
import AllProducts from "./Pages/AllProducts";
import ForgotPassword from "./Pages/ForgetPass";
import NewAndNow from "./Pages/NewAndNow";
import ReviewRating from "./components/FooterItems/ReviewRating";
import Faq from "./components/FooterItems/Faq";
import LuxePolicy from "./components/FooterItems/LuxePolicy";
import DataPrivacy from "./components/FooterItems/DataPrivacy";
import GrievanceRedressals from "./components/FooterItems/GrievanceRedressals";
import PaymentPolicy from "./components/FooterItems/PaymentPolicy";
import ReturnRefund from "./components/FooterItems/ReturnRefund";
import TermsConditions from "./components/FooterItems/TermsConditions";
import GiftWrapSelector from "./Pages/GiftWrap";
import Footer from "./components/Footer";
import Header from "./components/Navbar";
import LuxePage from "./Pages/Luxe";
import Bestseller from "./Pages/BestSeller";
import PrimeMember from "./Pages/PrimeMember";
import CheckoutPage from "./Pages/Checkout";
import OrderSuccess from "./Pages/OrderSuccess";
import MyOrders from "./Pages/MyOrders"; // Import MyOrders component
import OrderDetailPage from "./Pages/OrderDetail"; // Import OrderDetailPage
import { Toaster } from "react-hot-toast";
import GiftWrapPolicy from "./components/FooterItems/GiftWrapPolicy";
import MaintenancePage from "./Pages/Maintenance";
import SwipingMessages from "./components/SwippingMsgs";
import FebeulLoader from "./components/Loader";
import ScrollToTop from "./components/ScrollToTop";

const AppContent = () => {
  const location = useLocation();
  const { user, token } = useAuthStore();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [typographySettings, setTypographySettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let handleResize;
    const fetchSettings = async () => {
      try {
        const [settingsRes, typographyRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cms/settings`),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cms/typographySettings`)
        ]);

        if (settingsRes.data.success && settingsRes.data.content) {
          setIsMaintenanceMode(settingsRes.data.content.maintenanceMode || false);
        }

        if (typographyRes.data.success && typographyRes.data.content) {
          const settings = typographyRes.data.content;
          setTypographySettings(settings);
          applyTypography(settings);
          
          // Add resize listener for responsive font sizing
          handleResize = () => applyTypography(settings);
          window.addEventListener('resize', handleResize);
        }
      } catch (error) {
        console.error("Error fetching CMS settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
    
    return () => {
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const applyTypography = (settings) => {
    if (!settings) return;

    // Load Google Fonts
    const fontsToLoad = [settings.primaryFont, settings.secondaryFont, settings.accentFont];
    const uniqueFonts = [...new Set(fontsToLoad)].filter(font => 
      !['Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New'].includes(font)
    );

    if (uniqueFonts.length > 0) {
      const fontString = uniqueFonts.map(font => `family=${font.replace(/\s+/g, '+')}:wght@400;500;600;700`).join('&');
      const linkId = 'google-fonts-typography';
      let link = document.getElementById(linkId);

      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?${fontString}&display=swap`;
    }

    // Apply CSS Variables
    const root = document.documentElement;
    root.style.setProperty('--primary-font', `"${settings.primaryFont}", sans-serif`);
    root.style.setProperty('--secondary-font', `"${settings.secondaryFont}", sans-serif`);
    root.style.setProperty('--accent-font', `"${settings.accentFont}", serif`);
    
    // Desktop sizes
    root.style.setProperty('--base-font-size', `${settings.baseFontSize}px`);
    root.style.setProperty('--h1-size', `${settings.h1Size}px`);
    root.style.setProperty('--h2-size', `${settings.h2Size}px`);
    root.style.setProperty('--h3-size', `${settings.h3Size}px`);

    // Mobile sizes
    if (window.innerWidth < 768) {
      root.style.setProperty('--base-font-size', `${settings.mobileBaseFontSize}px`);
    }
  };

  const showHeaderFooter = !["/auth", "/forgot-password"].includes(
    location.pathname
  );

  // Check if we are waiting for user profile to load (if token exists)
  const isAuthLoading = !!token && !user;

  // Show loader while fetching maintenance settings OR waiting for auth profile
  if (isLoading || isAuthLoading) {
    return <FebeulLoader />;
  }

  // If maintenance mode is on and user is NOT an admin/staff, show maintenance page
  const showMaintenance = isMaintenanceMode && user?.role !== 'admin' && user?.role !== 'staff';

  if (showMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <div>
      <ScrollToTop />
      <Toaster />
      <SwipingMessages className="mobile-only"/>
      {showHeaderFooter && <Header />}
      <Routes>
        {/* Default route - Home */}
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/address" element={<Address />} /> {/* Added route for Address */}

        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/cart" element={<Cart />} />

        <Route path="/support" element={<Support />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/product/:productId" element={<ProductPage />} />
        <Route path="/products" element={<AllProducts />} />
        <Route
          path="/products/:category/:filterKey/:filterValue"
          element={<AllProducts />}
        />
        <Route path="/products/:category" element={<AllProducts />} />
        <Route path="/GiftWrap" element={<GiftWrapSelector />} />
        <Route path="/luxe" element={<LuxePage />} />
        <Route path="/new-and-now" element={<NewAndNow />} />
        <Route path="/bestsellers" element={<Bestseller />} />
        <Route path="/PrimeMember" element={<PrimeMember />} />
        <Route path="/Checkout" element={<CheckoutPage />} />
        <Route path="/myorders" element={<MyOrders />} /> {/* Route for MyOrders component */}
        <Route path="/Success" element={<OrderSuccess />} />
        <Route path="/order-detail/:orderId" element={<OrderDetailPage />} /> {/* New Order Detail Page */}

        {/* Footer items */}
        <Route path="/ReviewRating" element={<ReviewRating />} />
        <Route path="/Faq" element={<Faq />} />
        <Route path="/log" element={<FebeulLoader />} />
        <Route path="/LuxePolicy" element={<LuxePolicy />} />
        <Route path="/DataPrivacy" element={<DataPrivacy />} />
        <Route path="/GrievanceRedressals" element={<GrievanceRedressals />} />
        <Route path="/PaymentPolicy" element={<PaymentPolicy />} />
        <Route path="/ReturnRefund" element={<ReturnRefund />} />
        <Route path="/TermsConditions" element={<TermsConditions />} />
        <Route path="/GiftWrapPolicy" element={<GiftWrapPolicy />} />
        {/*      
        <Route path="/contact" element={<Contact />} />  */}
        {/* Other routes */}
        {/* Catch-all (404) */}
        <Route path="*" element={<h2>404 Page Not Found</h2>} />
      </Routes>
      <Chatbot />
      <FebeulMembership />
      {showHeaderFooter && <Footer />}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
