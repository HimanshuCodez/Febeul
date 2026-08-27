import React, { useState, useEffect, useMemo, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, PackageSearch, PlusCircle, List,
  ShoppingBag, RotateCcw, Gift, ShieldCheck, Ticket,
  MessageSquare, Star, FileText, Image, Mail, Settings,
  Wrench, Sliders, Zap, Type, ChevronDown, ChevronRight,
  Menu, X, Truck, Undo2, Tags, Trash2, Search,
  ChevronsLeft, ChevronsRight, SearchX
} from 'lucide-react'

// Grouped nav config — single source of truth for search, accordions, and rendering.
const NAV_SECTIONS = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', permission: '/' },
      { to: '/allusers', icon: Users, label: 'All Users', permission: '/allusers' },
    ],
  },
  {
    key: 'catalog',
    label: 'Catalog',
    accordion: { icon: PackageSearch, label: 'Inventory' },
    items: [
      { to: '/add', icon: PlusCircle, label: 'Add Items', permission: '/add' },
      { to: '/list', icon: List, label: 'List Items', permission: '/list' },
      { to: '/luxelist', icon: List, label: 'Luxe Items', permission: '/luxelist' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    items: [
      { to: '/orders', icon: ShoppingBag, label: 'Orders', permission: '/orders' },
      { to: '/refund-requests', icon: RotateCcw, label: 'Refunds', permission: '/refund-requests' },
      { to: '/return-requests', icon: Undo2, label: 'Returns', permission: '/return-requests' },
      { to: '/gift-wraps', icon: Gift, label: 'Gift Wraps', permission: '/gift-wraps' },
      { to: '/coupons', icon: Ticket, label: 'Coupons', permission: '/coupons' },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing & Content',
    items: [
      { to: '/send-mail', icon: Mail, label: 'Email Marketing', permission: '/send-mail' },
      { to: '/cms', icon: FileText, label: 'Content (CMS)', permission: '/cms' },
      { to: '/images', icon: Image, label: 'Hero Images', permission: '/images' },
      { to: '/policy-update', icon: ShieldCheck, label: 'Policies', permission: '/policy-update' },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    items: [
      { to: '/tickets', icon: MessageSquare, label: 'Tickets', permission: '/tickets' },
      { to: '/reviews', icon: Star, label: 'Reviews', permission: '/reviews' },
    ],
  },
  {
    key: 'system',
    label: 'System',
    accordion: { icon: Settings, label: 'Settings' },
    items: [
      { to: '/maintenance', icon: Wrench, label: 'Maintenance', permission: '/maintenance' },
      { to: '/configurations', icon: Sliders, label: 'Config', permission: '/configurations' },
      { to: '/delivery-control', icon: Truck, label: 'Delivery Zones', permission: '/delivery-control' },
      { to: '/image-optimize', icon: Zap, label: 'Image Opt', permission: '/image-optimize' },
      { to: '/typography', icon: Type, label: 'Typography', permission: '/typography' },
      { to: '/product-taxonomy', icon: Tags, label: 'Product Taxonomy', permission: '/product-taxonomy' },
      { to: '/reset-data', icon: Trash2, label: 'Reset Data', permission: '/reset-data' },
    ],
  },
]

const highlight = (label, query) => {
  if (!query) return label;
  const idx = label.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return label;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-yellow-200 text-black rounded-sm">{label.slice(idx, idx + query.length)}</mark>
      {label.slice(idx + query.length)}
    </>
  );
};

const SidebarItem = ({ to, icon: Icon, label, active, onClick, collapsed, query }) => {
  const baseClass = "mx-4 my-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium group";
  const activeClass = "bg-black text-white shadow-lg shadow-black/10 scale-[1.02]";
  const inactiveClass = "text-gray-500 hover:bg-gray-100 hover:text-black";
  const collapsedClass = collapsed ? "!mx-2 !px-0 justify-center" : "";

  if (onClick) {
    return (
      <div
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`${baseClass} ${collapsedClass} cursor-pointer ${active ? 'text-black' : inactiveClass}`}
      >
        <Icon size={20} className={active ? 'text-black' : 'group-hover:text-black'} />
        {!collapsed && <p className='flex-1'>{label}</p>}
        {!collapsed && (
          <div>
            {active ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) => `${baseClass} ${collapsedClass} ${isActive ? activeClass : inactiveClass}`}
    >
      <Icon size={20} />
      {!collapsed && <p>{highlight(label, query)}</p>}
    </NavLink>
  );
};

const Sidebar = ({ role, permissions = [] }) => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openSections, setOpenSections] = useState(() => ({
    catalog: location.pathname === '/add' || location.pathname === '/list' || location.pathname === '/luxelist' || location.pathname.includes('/update'),
    system: location.pathname === '/maintenance' || location.pathname === '/configurations' || location.pathname === '/image-optimize' || location.pathname === '/typography' || location.pathname === '/delivery-control' || location.pathname === '/product-taxonomy',
  }));
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (location.pathname === '/add' || location.pathname === '/list' || location.pathname === '/luxelist' || location.pathname.includes('/update')) {
      setOpenSections((prev) => ({ ...prev, catalog: true }));
    }
    if (location.pathname === '/maintenance' || location.pathname === '/configurations' || location.pathname === '/image-optimize' || location.pathname === '/typography' || location.pathname === '/delivery-control' || location.pathname === '/product-taxonomy') {
      setOpenSections((prev) => ({ ...prev, system: true }));
    }
  }, [location.pathname]);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem('admin_sidebar_collapsed', String(collapsed));
    } catch {
      // ignore storage errors (private browsing, quota, etc.)
    }
  }, [collapsed]);

  // Press "/" anywhere outside an input to jump straight to search.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== '/' || collapsed) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapsed]);

  const isAllowed = (path) => {
    if (role === 'admin') return true;
    return permissions.includes(path);
  };

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  // Build the visible section list once: apply permission checks + search filter together.
  const visibleSections = useMemo(() => {
    return NAV_SECTIONS.map((section) => {
      const items = section.items.filter((item) => {
        if (!isAllowed(item.permission)) return false;
        if (isSearching) return item.label.toLowerCase().includes(normalizedQuery);
        return true;
      });
      return { ...section, items };
    }).filter((section) => section.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, permissions, normalizedQuery, isSearching]);

  const totalMatches = useMemo(
    () => visibleSections.reduce((sum, section) => sum + section.items.length, 0),
    [visibleSections]
  );

  const navContent = (
    <div className='flex flex-col gap-1'>

      {!collapsed && (
        <div className="px-4 mb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu..."
              className="w-full bg-gray-100 border border-transparent focus:border-black focus:bg-white rounded-xl pl-9 pr-8 py-2.5 text-sm outline-none transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {isSearching && totalMatches === 0 && (
        <div className="px-6 py-8 flex flex-col items-center gap-2 text-gray-400 text-center">
          <SearchX size={28} />
          <p className="text-sm">No menu items match {'"'}{query.trim()}{'"'}</p>
        </div>
      )}

      {visibleSections.map((section) => {
        const showAsAccordion = section.accordion && !isSearching;
        const isOpen = isSearching || openSections[section.key];

        return (
          <div key={section.key} className="flex flex-col mb-1">
            {!collapsed && (
              <p className="px-6 mt-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
            )}

            {showAsAccordion && (
              <SidebarItem
                icon={section.accordion.icon}
                label={section.accordion.label}
                active={openSections[section.key]}
                onClick={() => toggleSection(section.key)}
                collapsed={collapsed}
              />
            )}

            {(!showAsAccordion || isOpen) && (
              <div className="flex flex-col">
                {section.items.map((item) => (
                  <SidebarItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    collapsed={collapsed}
                    query={isSearching ? query.trim() : ''}
                  />
                ))}
                {section.key === 'catalog' && location.pathname.includes('/update') && isAllowed('/list') && (isOpen) && (
                  <SidebarItem to={location.pathname} icon={PlusCircle} label="Update Item" collapsed={collapsed} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile: slim persistent rail with a hamburger trigger */}
      <div className='md:hidden w-14 shrink-0 min-h-screen bg-white border-r border-gray-100 flex flex-col items-center py-4'>
        <button
          onClick={() => setIsMobileOpen(true)}
          className='p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-black hover:text-white transition-colors active:scale-95'
          aria-label='Open menu'
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile: backdrop */}
      {isMobileOpen && (
        <div
          className='md:hidden fixed inset-0 bg-black/50 z-40'
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile: slide-out drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-[80%] max-w-xs bg-white z-50 shadow-2xl overflow-y-auto no-scrollbar transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10'>

          <button
            onClick={() => setIsMobileOpen(false)}
            className='p-2 rounded-lg hover:bg-gray-100 text-gray-400 active:scale-95'
            aria-label='Close menu'
          >
            <X size={18} />
          </button>
        </div>
        <div className='py-4'>
          {navContent}
        </div>
      </div>

      {/* Desktop: static sidebar */}
      <div className={`hidden md:flex md:flex-col min-h-screen bg-white border-r border-gray-100 py-6 overflow-y-auto no-scrollbar transition-all duration-200 ${collapsed ? 'md:w-20' : 'md:w-[18%] lg:w-64'}`}>
        <div className={`flex items-center mb-2 ${collapsed ? 'justify-center px-2' : 'justify-end px-4'}`}>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className='p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-black transition-colors'
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>
        {navContent}
      </div>
    </>
  )
}

export default Sidebar
