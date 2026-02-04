import { useState, useEffect, useRef } from "react";
import {
  Search,
  Heart,
  User,
  ShoppingBag,
  Facebook,
  Instagram,
  Music2,
  BellDot,
  HeadphonesIcon,
  Menu,
  X,
  TwitchIcon,
  XCircle,
  AtSign,
} from "lucide-react";
import SearchBar from "./SearchBar";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";

const SwipingMessages = () => {
  const messages = [
    "Free Shipping on Orders Over Rs 499",
    "Register To Get 10% Off: CODE: FNEW10",
    "2 Days Return And Exchange Policy",
  ];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 overflow-hidden relative w-80 text-center">
      {messages.map((message, index) => (
        <div
          key={index}
          className="absolute w-full transition-transform duration-1000 ease-in-out"
          style={{ transform: `translateY(${(index - currentIndex) * 100}%)` }}
        >
          {message}
        </div>
      ))}
    </div>
  );
};

const UserMenu = ({ isAuthenticated }) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
    <Link to={isAuthenticated ? "/profile" : "/auth"}>
        <User className="w-6 h-6 text-gray-700 cursor-pointer hover:text-white" />
 </Link>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
          <div className="py-1">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  JOIN NOW 
                </Link>
               
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isAuthenticated, wishlistCount, cartCount } = useAuthStore();
  const location = useLocation(); // Get location object

  useEffect(() => {
    setIsSearchOpen(false); // Close search overlay on route change
    setIsMenuOpen(false); // Close menu overlay on route change (good practice)
  }, [location.pathname]);

  const navigation = [
    {
      title: "BABYDOLL",
      megaMenu: {
        Type: ["Above knee B'doll", "Knee Length B'doll","One piece B'doll","Two Piece B'doll"],
            Fabric: ["Satin", "Lace", "Net", "Silk Satin"],
      },
    },
    {
      title: "LINGERIE",
      megaMenu: {
        Type: [
          "Teddy Choker Lingz",
          "Bra Panty Lingz",
         
        ],
        // Waist: ["High waist", "Low waist", "Mid waist"],
        // Fabric: ["Cotton", "Lace", "Polyamide", "Modal"],
        // Offers: [
        //   "4 Panties @599",
        //   "3 Panties @599",
        //   "3 Panties @999",
        //   "Panties Combo Packs New",
        // ],
      },
    },
    {
      title: "NIGHTY",
      megaMenu: {
        Type: [
          "Slik Satin",
          "Sheer Mesh",
         
        ],
        // Waist: ["High waist", "Low waist", "Mid waist"],
        // Fabric: ["Cotton", "Lace", "Polyamide", "Modal"],
        // Offers: [
        //   "4 Panties @599",
        //   "3 Panties @599",
        //   "3 Panties @999",
        //   "Panties Combo Packs New",
        // ],
      },
    },
    {
      title: "PAJAMAS",
      // megaMenu: {
      //   Type: ["Satin"],
      // },
    },
    {
      title: "NEW & NOW",
      // megaMenu: {
      //   Type: ["Satin"],
      // },
    },
    {
      title: "GIFT WRAP 🎁",
      // megaMenu: {
      //   Offers: ["FLAT 20% OFF", "BABYDOLL BUY 3 GET 1 FREE"],
      // },
    },
   {
      title: "LUXE PRIVE SALE",
      // megaMenu: {
      //   Type: ["Satin"],
      // },
    },
  
  ];

  return (
    <header className="w-full relative">
      {/* Top Banner */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row items-center justify-center md:justify-between text-sm space-y-2 md:space-y-0">
          <div className="flex items-center gap-4"> {/* Social Icons */}
            <a href="https://www.facebook.com/febeul" target="_blank">
              <Facebook className="w-4 h-4 cursor-pointer hover:opacity-80" />
            </a>
            <a href="https://www.instagram.com/febeul.official" target="_blank">
              <Instagram className="w-4 h-4 cursor-pointer hover:opacity-80" />
            </a>
            <a href="https://www.threads.com/@febeul.official" target="_blank">
              <AtSign className="w-4 h-4 cursor-pointer hover:opacity-80" />
            </a>
          </div>

          <div className="w-full md:w-auto flex justify-center"> {/* Swiping Messages */}
            <SwipingMessages />
          </div>

          <div className="flex items-center gap-1 cursor-pointer hover:opacity-80"> {/* Help Link */}
            <Link to={"/support"} className="flex items-center gap-1"> 
              <HeadphonesIcon />
              <span>Help</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky Navbar Wrapper */}
      <div className="sticky top-0 z-40 bg-white shadow-md">
        {/* Main Header */}
        <div className="bg-[#f9aeaf] border-b">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            {/* Mobile Menu Button & Search (hidden on mobile) */}
            <div className="flex-1 flex justify-start">
              <div className="hidden md:block"> {/* SearchBar desktop only */}
                <SearchBar />
              </div>
            </div>
            
            <div className="flex-shrink-0 flex-1 flex justify-center"> {/* Centered Logo */}
              <Link to="/">
                <img src="/removebgLogo.png" alt="Febeul" className="h-12 w-auto" />
              </Link>
            </div>
            
            <div className="flex-1 flex items-center justify-end gap-3 md:gap-5">
                        <button onClick={() => setIsSearchOpen(true)} className="md:hidden p-2 text-gray-700"> {/* Mobile search icon */}
                          <Search className="h-6 w-6" />
                        </button>
                        {isAuthenticated && (
                          <Link to={"/wishlist"} className="relative">
                            <Heart className="w-6 h-6 text-gray-700 cursor-pointer hover:text-white" />
                            {wishlistCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-pink-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
                                {wishlistCount}
                              </span>
                            )}
                          </Link>
                        )}
                        <UserMenu isAuthenticated={isAuthenticated} />
                        <Link to={"/cart"} className="relative">
                          <ShoppingBag className="w-6 h-6 text-gray-700 cursor-pointer hover:text-white" />
                          {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-pink-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
                              {cartCount}
                            </span>
                          )}
                        </Link>
                      </div>        </div>
        </div>
        {/* Navigation */}
        <nav className="bg-black border-b">
          {/* Desktop Menu */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-5 hidden md:block"> {/* Only show on desktop */}
            <div className="flex items-center justify-center md:justify-between h-14">
              <div className="pl-2 gap-10 flex items-center space-x-12">
                {navigation.map((item, index) => (
                  <div key={index} className="relative group">
                    <Link
                      to={item.megaMenu ? "#" : (
                        item.title === "GIFT WRAP 🎁"
                          ? "/GiftWrap"
                          : item.title === "LUXE PRIVE SALE"
                          ? "/luxe"
                          : item.title === "NEW & NOW"
                          ? "/new-and-now"
                          : `/products/${item.title.replace(/ /g, "-").replace("🎁", "").toLowerCase()}`
                      )}
                      onClick={(e) => item.megaMenu && e.preventDefault()}
                      className="py-4 text-sm font-medium text-white hover:bg-[#f9aeaf] rounded-md hover:text-black flex items-center transition-colors"
                    >
                      {item.title}
                      {(item.dropdown || item.megaMenu) && (
                        <svg
                          className="ml-1 h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </Link>

                    {/* Mega Menu */}
                    {item.megaMenu && (
                      <div
                        className={`absolute z-10 mt-0 w-[750px] bg-white border border-[#f9aeaf] rounded-md shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 p-6 ${
                          index <= 1
                            ? "left-0"
                            : "left-1/2 transform -translate-x-1/2"
                        }`}
                      >
                        <div className="grid grid-cols-4 gap-6">
                          {Object.entries(item.megaMenu).map(
                            ([category, links], catIndex) => (
                              <div key={catIndex}>
                                <h3 className="border border-[#f9aeaf] text-center text-sm font-semibold text-gray-800 px-2 py-1 mb-2 rounded relative">
                                  {category}
                                </h3>
                                <ul className="space-y-1">
                                  {links.map((link, linkIndex) => (
                                    <li key={linkIndex}>
                                      <Link
                                        to={`/products/${item.title.replace(/ /g, "-").replace("🎁", "").toLowerCase()}/${category.toLowerCase()}/${link.toLowerCase().replace(/ /g, "-")}`}
                                        className="text-sm text-gray-700 hover:text-[#f9aeaf] hover:underline"
                                      >
                                        {link.includes("New") ? (
                                          <>
                                            {link.replace("New", "")}
                                            <span className="ml-2 text-xs bg-[#f9aeaf] text-white px-1 rounded">
                                              New
                                            </span>
                                          </>
                                        ) : (
                                          link
                                        )}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Normal Dropdown */}
                    {item.dropdown && !item.megaMenu && (
                      <div className="absolute z-10 left-1/2 transform -translate-x-1/2 mt-0 w-48 bg-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 border">
                        <ul>
                          {item.dropdown.map((subItem, subIndex) => (
                            <li key={subIndex}>
                              <a
                                href="#"
                                className="block px-4 py-2 text-sm text-black hover:bg-[#f9aeaf] hover:text-black"
                              >
                                {subItem}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Menu Overlay and Content */}
      <div
        className={`fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 block' : 'opacity-0 hidden'}`}
        onClick={() => setIsMenuOpen(false)} // Close when clicking overlay
      >
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking menu content
        >
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Menu</h2>
            <button onClick={() => setIsMenuOpen(false)} className="text-gray-500 hover:text-gray-800">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item, index) => (
              <div key={index}>
                <Link
                  to={item.megaMenu ? "#" : (
                    item.title === "GIFT WRAP 🎁"
                      ? "/GiftWrap"
                      : item.title === "LUXE PRIVE SALE"
                      ? "/luxe"
                      : item.title === "NEW & NOW"
                      ? "/new-and-now"
                      : `/products/${item.title.replace(/ /g, "-").replace("🎁", "").toLowerCase()}`
                  )}
                  onClick={(e) => item.megaMenu && e.preventDefault()}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  {item.title}
                </Link>
                {item.megaMenu && (
                  <div className="pl-4">
                    {Object.entries(item.megaMenu).map(
                      ([category, links], catIndex) => (
                        <div key={catIndex}>
                          <h3 className="px-3 py-2 text-sm font-semibold text-gray-600">
                            {category}
                          </h3>
                          <div className="pl-4">
                            {links.map((link, linkIndex) => (
                            <Link
                                key={linkIndex}
                                to={`/products/${item.title.replace(/ /g, "-").replace("🎁", "").toLowerCase()}/${category.toLowerCase()}/${link.toLowerCase().replace(/ /g, "-")}`}
                                className="block px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                              >
                                {link.includes("New") ? (
                                  <>
                                    {link.replace("New", "")}
                                    <span className="ml-2 text-xs bg-[#f9aeaf] text-white px-1 rounded">
                                      New
                                    </span>
                                  </>
                                ) : (
                                  link
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      </nav>
      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-50 p-4">
          <div className="flex items-center gap-2">
            <div className="flex-grow">
              <SearchBar />
            </div>
            <button onClick={() => setIsSearchOpen(false)}>
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}