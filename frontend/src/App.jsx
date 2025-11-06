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
import Collection from "./Pages/Collection";
import Login from "./Pages/Login";
import SignUp from "./Pages/Signup";


const App = () => {
  return (
    <Router>
      <Routes>
        {/* Default route - Home */}
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile  />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/whislist" element={<Wishlist  />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/support" element={<Support />} />

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
