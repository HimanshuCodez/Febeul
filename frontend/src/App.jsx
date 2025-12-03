// App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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


const App = () => {
  return (
    <Router>
      <Routes>
        {/* Default route - Home */}
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile  />} />
        <Route path="/auth" element={<AuthPage />} />
     
        <Route path="/whislist" element={<Wishlist  />} />
        <Route path="/cart" element={<Cart />} />
        
        <Route path="/support" element={<Support />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/product/:productId" element={<ProductPage />} />
        <Route path="/products" element={<AllProducts />} />

        {/* Other routes */}
        {/* <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} /> */}

        {/* Catch-all (404) */}
        <Route path="*" element={<h2>404 Page Not Found</h2>} />
      </Routes>
      <Chatbot/>
      <FebeulMembership/>
    </Router>
  );
};

export default App;
