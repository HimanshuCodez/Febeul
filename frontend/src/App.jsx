// App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Home from "./Pages/Home";
import "./index.css"
import Profile from "./Pages/Profile";
import Wishlist from "./Pages/Wishlist";
import Cart from "./Pages/Cart";
import Support from "./Pages/Support";
import Chatbot from "./components/Chatbot";
import FebeulMembership from "./components/Membership";
import AuthPage from "./Pages/AuthPage";
import ProductPage from "./Pages/ProductPage";
import AllProducts from "./Pages/AllProducts";
import ForgotPassword from "./Pages/ForgetPass";
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

const AppContent = () => {
  const location = useLocation();
  const showHeaderFooter = !['/auth', '/forgot-password'].includes(location.pathname);

  return (
    <div>
      {showHeaderFooter && <Header />}
      <Routes>
        {/* Default route - Home */}
        <Route path="/" element={<AuthPage />} />
        <Route path="/profile" element={<Profile  />} />
        <Route path="/auth" element={<AuthPage />} />
     
        <Route path="/whislist" element={<Wishlist  />} />
        <Route path="/cart" element={<Cart />} />
        
        <Route path="/support" element={<Support />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/product/:productId" element={<ProductPage />} />
        <Route path="/products" element={<AllProducts />} />
        <Route path="/products/:category" element={<AllProducts />} />
        <Route path="/GiftWrap" element={<GiftWrapSelector />} />
        <Route path="/luxe" element={<LuxePage />} />

     
        {/* Footer items */}
          <Route path="/ReviewRating" element={<ReviewRating />} />
         <Route path="/Faq" element={<Faq />} />
        <Route path="/LuxePolicy" element={<LuxePolicy/>} />
         <Route path="/DataPrivacy" element={<DataPrivacy />} />
         <Route path="/GrievanceRedressals" element={<GrievanceRedressals/>} />
         <Route path="/PaymentPolicy" element={<PaymentPolicy/>} />
         <Route path="/ReturnRefund" element={<ReturnRefund/>} />
         <Route path="/TermsConditions" element={<TermsConditions/>} />
{/*      
        <Route path="/contact" element={<Contact />} />  */}
   {/* Other routes */}
        {/* Catch-all (404) */}
        <Route path="*" element={<h2>404 Page Not Found</h2>} />
      </Routes>
      <Chatbot/>
      <FebeulMembership/>
      {showHeaderFooter && <Footer/>}
    </div>
  );
}


const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
