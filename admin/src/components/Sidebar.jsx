import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'
import { ChevronDown, ChevronRight, PackageSearch, Settings } from 'lucide-react'

const Sidebar = ({ role, permissions = [] }) => {
  const location = useLocation();
  
  const [isProductListingOpen, setIsProductListingOpen] = useState(
    location.pathname === '/add' || location.pathname === '/list' || location.pathname.includes('/update')
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(
    location.pathname === '/maintenance' || location.pathname === '/configurations' || location.pathname === '/image-optimize'
  );

  useEffect(() => {
    if (location.pathname === '/add' || location.pathname === '/list' || location.pathname.includes('/update')) {
      setIsProductListingOpen(true);
    }
    if (location.pathname === '/maintenance' || location.pathname === '/configurations' || location.pathname === '/image-optimize') {
      setIsSettingsOpen(true);
    }
  }, [location.pathname]);

  const isAllowed = (path) => {
    if (role === 'admin') return true;
    if (permissions.length === 0) return true; // Default behavior if no specific permissions set
    return permissions.includes(path);
  };

  const showProductListing = isAllowed('/add') || isAllowed('/list');
  const showSettings = isAllowed('/maintenance') || isAllowed('/configurations') || isAllowed('/image-optimize');

  return (
    <div className='w-[18%] min-h-screen border-r-2'>
        <div className='flex flex-col gap-4 pt-6 pl-[20%] text-[15px]'>

            {isAllowed('/') && (
                <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/">
                    <img className='w-5 h-5' src={assets.parcel_icon} alt="" />
                    <p className='hidden md:block'>Dashboard</p>
                </NavLink>
            )}

            {isAllowed('/allusers') && (
                <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/allusers">
                    <img className='w-5 h-5' src={assets.order_icon} alt="" />
                    <p className='hidden md:block'>All Users</p>
                </NavLink>
            )}

            {/* Product Listing Accordion */}
            {showProductListing && (
                <div className="flex flex-col">
                    <div 
                        onClick={() => setIsProductListingOpen(!isProductListingOpen)}
                        className='flex items-center justify-between gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l cursor-pointer hover:bg-gray-50'
                    >
                        <div className="flex items-center gap-3">
                            <PackageSearch size={20} className="text-gray-600" />
                            <p className='hidden md:block font-medium'>Product Listing</p>
                        </div>
                        <div className='hidden md:block'>
                            {isProductListingOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    </div>
                    
                    {isProductListingOpen && (
                        <div className="flex flex-col gap-2 mt-2 ml-4">
                            {isAllowed('/add') && (
                                <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/add">
                                    <img className='w-5 h-5' src={assets.add_icon} alt="" />
                                    <p className='hidden md:block'>Add Items</p>
                                </NavLink>
                            )}

                            {isAllowed('/list') && (
                                <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/list">
                                    <img className='w-5 h-5' src={assets.order_icon} alt="" />
                                    <p className='hidden md:block'>List Items</p>
                                </NavLink>
                            )}

                            {location.pathname.includes('/update') && isAllowed('/list') && (
                                <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to={location.pathname}>
                                    <img className='w-5 h-5' src={assets.add_icon} alt="" />
                                    <p className='hidden md:block'>Update Item</p>
                                </NavLink>
                            )}
                        </div>
                    )}
                </div>
            )}

            {isAllowed('/orders') && (
              <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/orders">
                  <img className='w-5 h-5' src={assets.order_icon} alt="" />
                  <p className='hidden md:block'>Orders</p>
              </NavLink>
            )}

            {isAllowed('/gift-wraps') && (
              <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/gift-wraps">
                  <img className='w-5 h-5' src={assets.add_icon} alt="" />
                  <p className='hidden md:block'>Gift Wraps</p>
              </NavLink>
            )}

            {isAllowed('/policy-update') && (
              <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/policy-update">
                  <img className='w-5 h-5' src={assets.order_icon} alt="" />
                  <p className='hidden md:block'>Policy Update</p>
              </NavLink>
            )}

            {isAllowed('/coupons') && (
              <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/coupons">
                  <img className='w-5 h-5' src={assets.add_icon} alt="" />
                  <p className='hidden md:block'>Generate Coupon</p>
              </NavLink>
            )}

            {isAllowed('/tickets') && (
              <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/tickets">
                  <img className='w-5 h-5' src={assets.order_icon} alt="" />
                  <p className='hidden md:block'>Tickets</p>
              </NavLink>
            )}

            {isAllowed('/reviews') && (
              <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/reviews">
                  <img className='w-5 h-5' src={assets.order_icon} alt="" />
                  <p className='hidden md:block'>Reviews</p>
              </NavLink>
            )}

            {isAllowed('/cms') && (
              <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/cms">
                  <img className='w-5 h-5' src={assets.add_icon} alt="" />
                  <p className='hidden md:block'>CMS</p>
              </NavLink>
            )}

            {isAllowed('/images') && (
              <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/images">
                  <img className='w-5 h-5' src={assets.add_icon} alt="" />
                  <p className='hidden md:block'>Hero Images</p>
              </NavLink>
            )}

            {isAllowed('/send-mail') && (
              <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/send-mail">
                  <img className='w-5 h-5' src={assets.order_icon} alt="" />
                  <p className='hidden md:block'>Email Marketing</p>
              </NavLink>
            )}

            {/* Settings Accordion */}
            {showSettings && (
                <div className="flex flex-col">
                    <div 
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className='flex items-center justify-between gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l cursor-pointer hover:bg-gray-50'
                    >
                        <div className="flex items-center gap-3">
                            <Settings size={20} className="text-gray-600" />
                            <p className='hidden md:block font-medium'>Settings</p>
                        </div>
                        <div className='hidden md:block'>
                            {isSettingsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    </div>
                    
                    {isSettingsOpen && (
                        <div className="flex flex-col gap-2 mt-2 ml-4">
                            {isAllowed('/maintenance') && (
                                <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/maintenance">
                                    <img className='w-5 h-5' src={assets.order_icon} alt="" />
                                    <p className='hidden md:block'>Maintenance Mode</p>
                                </NavLink>
                            )}

                            {isAllowed('/configurations') && (
                                <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/configurations">
                                    <img className='w-5 h-5' src={assets.order_icon} alt="" />
                                    <p className='hidden md:block'>Configurations</p>
                                </NavLink>
                            )}

                            {isAllowed('/image-optimize') && (
                                <NavLink className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l' to="/image-optimize">
                                    <img className='w-5 h-5' src={assets.order_icon} alt="" />
                                    <p className='hidden md:block'>Image Optimization</p>
                                </NavLink>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  )
}

export default Sidebar
