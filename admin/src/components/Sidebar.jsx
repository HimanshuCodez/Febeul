import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Users, PackageSearch, PlusCircle, List, 
  ShoppingBag, RotateCcw, Gift, ShieldCheck, Ticket, 
  MessageSquare, Star, FileText, Image, Mail, Settings, 
  Wrench, Sliders, Zap, Type, ChevronDown, ChevronRight 
} from 'lucide-react'

const SidebarItem = ({ to, icon: Icon, label, active, onClick }) => {
  const baseClass = "mx-4 my-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium group";
  const activeClass = "bg-black text-white shadow-lg shadow-black/10 scale-[1.02]";
  const inactiveClass = "text-gray-500 hover:bg-gray-100 hover:text-black";

  if (onClick) {
    return (
      <div 
        onClick={onClick}
        className={`${baseClass} cursor-pointer ${active ? 'text-black' : inactiveClass}`}
      >
        <Icon size={20} className={active ? 'text-black' : 'group-hover:text-black'} />
        <p className='hidden md:block flex-1'>{label}</p>
        <div className='hidden md:block'>
          {active ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>
    );
  }

  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}
    >
      <Icon size={20} />
      <p className='hidden md:block'>{label}</p>
    </NavLink>
  );
};

const Sidebar = ({ role, permissions = [] }) => {
  const location = useLocation();
  
  const [isProductListingOpen, setIsProductListingOpen] = useState(
    location.pathname === '/add' || location.pathname === '/list' || location.pathname.includes('/update')
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(
    location.pathname === '/maintenance' || location.pathname === '/configurations' || location.pathname === '/image-optimize' || location.pathname === '/typography'
  );

  useEffect(() => {
    if (location.pathname === '/add' || location.pathname === '/list' || location.pathname.includes('/update')) {
      setIsProductListingOpen(true);
    }
    if (location.pathname === '/maintenance' || location.pathname === '/configurations' || location.pathname === '/image-optimize' || location.pathname === '/typography') {
      setIsSettingsOpen(true);
    }
  }, [location.pathname]);

  const isAllowed = (path) => {
    if (role === 'admin') return true;
    if (permissions.length === 0) return true;
    return permissions.includes(path);
  };

  const showProductListing = isAllowed('/add') || isAllowed('/list');
  const showSettings = isAllowed('/maintenance') || isAllowed('/configurations') || isAllowed('/image-optimize') || isAllowed('/typography');

  return (
    <div className='w-[20%] md:w-[18%] lg:w-64 min-h-screen bg-white border-r border-gray-100 py-6 overflow-y-auto no-scrollbar'>
        <div className='flex flex-col gap-1'>
            
            <div className="px-6 mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Menu</p>
            </div>

            {isAllowed('/') && (
              <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
            )}

            {isAllowed('/allusers') && (
              <SidebarItem to="/allusers" icon={Users} label="All Users" />
            )}

            {/* Product Listing Accordion */}
            {showProductListing && (
                <div className="flex flex-col">
                    <SidebarItem 
                        icon={PackageSearch} 
                        label="Inventory" 
                        active={isProductListingOpen}
                        onClick={() => setIsProductListingOpen(!isProductListingOpen)}
                    />
                    
                    {isProductListingOpen && (
                        <div className="flex flex-col mb-2">
                            {isAllowed('/add') && (
                                <SidebarItem to="/add" icon={PlusCircle} label="Add Items" />
                            )}
                            {isAllowed('/list') && (
                                <SidebarItem to="/list" icon={List} label="List Items" />
                            )}
                            {location.pathname.includes('/update') && isAllowed('/list') && (
                                <SidebarItem to={location.pathname} icon={PlusCircle} label="Update Item" />
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="px-6 mt-6 mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Store Operations</p>
            </div>

            {isAllowed('/orders') && (
              <SidebarItem to="/orders" icon={ShoppingBag} label="Orders" />
            )}

            {isAllowed('/refund-requests') && (
              <SidebarItem to="/refund-requests" icon={RotateCcw} label="Refunds" />
            )}

            {isAllowed('/gift-wraps') && (
              <SidebarItem to="/gift-wraps" icon={Gift} label="Gift Wraps" />
            )}

            <div className="px-6 mt-6 mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Marketing & Content</p>
            </div>

            {isAllowed('/coupons') && (
              <SidebarItem to="/coupons" icon={Ticket} label="Coupons" />
            )}

            {isAllowed('/send-mail') && (
              <SidebarItem to="/send-mail" icon={Mail} label="Email Marketing" />
            )}

            {isAllowed('/cms') && (
              <SidebarItem to="/cms" icon={FileText} label="Content (CMS)" />
            )}

            {isAllowed('/images') && (
              <SidebarItem to="/images" icon={Image} label="Hero Images" />
            )}

            {isAllowed('/policy-update') && (
              <SidebarItem to="/policy-update" icon={ShieldCheck} label="Policies" />
            )}

            <div className="px-6 mt-6 mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Support & Trust</p>
            </div>

            {isAllowed('/tickets') && (
              <SidebarItem to="/tickets" icon={MessageSquare} label="Tickets" />
            )}

            {isAllowed('/reviews') && (
              <SidebarItem to="/reviews" icon={Star} label="Reviews" />
            )}

            <div className="px-6 mt-6 mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System</p>
            </div>

            {/* Settings Accordion */}
            {showSettings && (
                <div className="flex flex-col">
                    <SidebarItem 
                        icon={Settings} 
                        label="Settings" 
                        active={isSettingsOpen}
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    />
                    
                    {isSettingsOpen && (
                        <div className="flex flex-col mb-2">
                            {isAllowed('/maintenance') && (
                                <SidebarItem to="/maintenance" icon={Wrench} label="Maintenance" />
                            )}
                            {isAllowed('/configurations') && (
                                <SidebarItem to="/configurations" icon={Sliders} label="Config" />
                            )}
                            {isAllowed('/image-optimize') && (
                                <SidebarItem to="/image-optimize" icon={Zap} label="Image Opt" />
                            )}
                            {isAllowed('/typography') && (
                                <SidebarItem to="/typography" icon={Type} label="Typography" />
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
