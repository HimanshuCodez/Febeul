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
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const SwipingMessages = () => {
  const messages = [
    "Free Shipping on Orders Over Rs 499",
    "Register To Get 10% Off: CODE: FNEW10",
    "30 Days Return-Policy",
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
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center">
        <User className="w-6 h-6 text-gray-700 cursor-pointer hover:text-white" />
      </button>
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
                  Login
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Signup
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
  const { isAuthenticated } = useAuthStore();

  const navigation = [
    {
      title: "BABYDOLL",
      megaMenu: {
        Type: ["Satin", "One-Piece"],
      },
    },
    {
      title: "LINGERIE",
      megaMenu: {
        Type: [
          "Hipsters",
          "Bikini",
          "Thongs",
          "Boy shorts",
          "Boyleg",
          "Beginners Panties",
          "Maternity Panties",
          "Bridal Panties",
          "Sexy Panties",
        ],
        Waist: ["High waist", "Low waist", "Mid waist"],
        Fabric: ["Cotton", "Lace", "Polyamide", "Modal"],
        Offers: [
          "4 Panties @599",
          "3 Panties @599",
          "3 Panties @999",
          "Panties Combo Packs New",
        ],
      },
    },
    {
      title: "PAJAMAS",
      megaMenu: {
        Type: ["Satin"],
      },
    },
    {
      title: "NEW ARRIVALS",
      megaMenu: {
        Type: ["Satin"],
      },
    },
    {
      title: "SALE",
      megaMenu: {
        Offers: ["FLAT 20% OFF", "BABYDOLL BUY 3 GET 1 FREE"],
      },
    },
    {
      title: "BUY ON AMAZON",
      megaMenu: {
        Type: ["Satin"],
      },
    },
    { title: "FEBEUL LUXE", megaMenu: {} },
  ];

  return (
    <header className="w-full">
      {/* Top Banner */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-sm">
          <div className="flex-1 flex justify-start">
            <div className="flex items-center gap-4">
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
          </div>

          <div className="flex justify-center">
            <SwipingMessages />
          </div>

          <div className="flex-1 flex justify-end">
            <Link to={"/support"}> 
            <div className="flex items-center gap-1 cursor-pointer hover:opacity-80">
              <HeadphonesIcon />
              <span>Help</span>
            </div>
            </Link>
          </div>
          
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-[#f9aeaf] border-b">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex-1 flex justify-start">
            <SearchBar />
          </div>

          <div className="flex-shrink-0">
            <img src="./removebgLogo.png" alt="AdiLove" className="h-12 w-auto" />
          </div>

          <div className="flex-1 flex items-center justify-end gap-5">
            {isAuthenticated && (
              <Link to={"/wishlist"}>
                <Heart className="w-6 h-6 text-gray-700 cursor-pointer hover:text-white" />
              </Link>
            )}
            <UserMenu isAuthenticated={isAuthenticated} />
            <Link to={"/cart"}>
              <ShoppingBag className="w-6 h-6 text-gray-700 cursor-pointer hover:text-white" />
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-black border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-5">
          <div className="flex items-center justify-center md:justify-between h-14">
            {/* Mobile Menu Button */}
            <div className="absolute left-0 inset-y-0 flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                {isMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Desktop Menu */}
            <div className="hidden pl-2 gap-10 md:flex md:items-center md:space-x-12">
              {navigation.map((item, index) => (
                <div key={index} className="relative group">
                  <a
                    href="#"
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
                  </a>

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
                                    <a
                                      href="#"
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
                                    </a>
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item, index) => (
                <div key={index}>
                  <a
                    href="#"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  >
                    {item.title}
                  </a>
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
                                <a
                                  key={linkIndex}
                                  href="#"
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
                                </a>
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
        )}
      </nav>
    </header>
  );
}
