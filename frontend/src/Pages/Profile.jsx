import { useState, useEffect } from "react";
import {
  User, Mail, Phone, MapPin, Heart, ShoppingBag, LogOut, Edit, Gift, Save, X, Loader
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";

const orders = [
  { id: "#ORD1023", item: "Lace Babydoll", date: "Oct 28, 2025", status: "Delivered", amount: "₹1,299.00" },
  { id: "#ORD1024", item: "Cotton Panty Pack", date: "Oct 30, 2025", status: "Shipped", amount: "₹999.00" },
  { id: "#ORD1025", item: "Silk Nightwear", date: "Nov 01, 2025", status: "Processing", amount: "₹1,899.00" },
];

const addresses = [
  { id: 1, type: "Home", details: "Flat 32, Orchid Residency, Mumbai, 400001", isDefault: true },
  { id: 2, type: "Work", details: "Tech Park One, 5th Floor, Pune, 411057", isDefault: false },
];

export default function Profile() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    } else if (user) {
      setEditedUser(user);
    }
  }, [isAuthenticated, user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Here you would call an update user API
    // For now, we just update the local state as a placeholder
    console.log("Updated user data:", editedUser);
    useAuthStore.setState({ user: editedUser });
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50/50">
        <Loader className="animate-spin text-pink-500" size={48} />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileInfo user={user} editedUser={editedUser} isEditing={isEditing} setIsEditing={setIsEditing} handleInputChange={handleInputChange} handleSave={handleSave} />;
      case "orders":
        return <OrderHistory orders={orders} />;
      case "addresses":
        return <ManageAddresses addresses={addresses} />;
      case "wishlist":
        return <WishlistPreview />;
      default:
        return <ProfileInfo user={user} editedUser={editedUser} isEditing={isEditing} setIsEditing={setIsEditing} handleInputChange={handleInputChange} handleSave={handleSave} />;
    }
  };

  return (
    <div className="min-h-screen bg-pink-50/50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
          <main className="lg:col-span-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

const Sidebar = ({ activeTab, setActiveTab, user, onLogout }) => {
  const navItems = [
    { id: "profile", icon: User, label: "My Profile" },
    { id: "orders", icon: ShoppingBag, label: "My Orders" },
    { id: "addresses", icon: MapPin, label: "Manage Addresses" },
    { id: "wishlist", icon: Heart, label: "My Wishlist" },
  ];

  return (
    <aside className="lg:col-span-3 mb-8 lg:mb-0">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center space-x-4 p-2 mb-4">
          <img
            src={`https://api.dicebear.com/6.x/initials/svg?seed=${user.name}`}
            alt="User Avatar"
            className="w-16 h-16 rounded-full border-2 border-pink-200 bg-gray-200"
          />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{user.name}</h2>
            <p className="text-sm text-gray-500 break-all">{user.email}</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-pink-100 text-pink-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
          <button onClick={onLogout} className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};

const ProfileInfo = ({ user, editedUser, isEditing, setIsEditing, handleInputChange, handleSave }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex justify-between items-center border-b pb-4 mb-6">
      <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
      <button 
        onClick={() => setIsEditing(!isEditing)}
        className="flex items-center space-x-2 text-sm font-medium text-pink-500 hover:text-pink-700 transition-colors"
      >
        {isEditing ? <><X size={16}/><span>Cancel</span></> : <><Edit size={16} /><span>Edit</span></>}
      </button>
    </div>
    {isEditing ? (
      <ProfileForm user={editedUser} onInputChange={handleInputChange} onSave={handleSave} />
    ) : (
      <ProfileDetails user={user} />
    )}
  </div>
);

const ProfileDetails = ({ user }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <InfoItem icon={User} label="Full Name" value={user.name} />
    <InfoItem icon={Mail} label="Email Address" value={user.email} />
    <InfoItem icon={Phone} label="Phone Number" value={user.phone || 'Not provided'} />
    <InfoItem icon={User} label="Gender" value={user.gender || 'Not provided'} />
    <InfoItem icon={Gift} label="Date of Birth" value={user.dob ? new Date(user.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not provided'} />
    <InfoItem icon={MapPin} label="Address" value={user.address || 'Not provided'} wide />
  </div>
);

const ProfileForm = ({ user, onInputChange, onSave }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormInput name="name" label="Full Name" value={user.name || ''} onChange={onInputChange} />
      <FormInput name="email" label="Email Address" value={user.email || ''} onChange={onInputChange} type="email" />
      <FormInput name="phone" label="Phone Number" value={user.phone || ''} onChange={onInputChange} />
      <FormInput name="dob" label="Date of Birth" value={user.dob ? user.dob.split('T')[0] : ''} onChange={onInputChange} type="date" />
    </div>
    <FormInput name="address" label="Address" value={user.address || ''} onChange={onInputChange} />
    <div className="flex justify-end pt-4">
      <button onClick={onSave} className="flex items-center space-x-2 bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 transition-colors">
        <Save size={16} />
        <span>Save Changes</span>
      </button>
    </div>
  </div>
);

const OrderHistory = ({ orders }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">Order History</h2>
    <div className="space-y-4">
      {orders.map(order => (
        <div key={order.id} className="p-4 rounded-lg border hover:border-pink-200 hover:bg-pink-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="mb-2 sm:mb-0">
            <p className="font-semibold text-gray-800">{order.item}</p>
            <p className="text-sm text-gray-500">{order.id} &bull; {order.date}</p>
          </div>
          <div className="flex items-center space-x-4">
            <p className="font-semibold text-gray-700">{order.amount}</p>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              order.status === "Delivered" ? "bg-green-100 text-green-700" :
              order.status === "Shipped" ? "bg-blue-100 text-blue-700" :
              "bg-yellow-100 text-yellow-700"
            }`}>
              {order.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ManageAddresses = ({ addresses }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex justify-between items-center border-b pb-4 mb-6">
      <h2 className="text-xl font-semibold text-gray-800">Manage Addresses</h2>
      <button className="text-sm font-medium text-pink-500 hover:text-pink-700 transition-colors">+ Add New Address</button>
    </div>
    <div className="space-y-4">
      {addresses.map(addr => (
        <div key={addr.id} className="p-4 rounded-lg border flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-gray-700">{addr.type}</h3>
              {addr.isDefault && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Default</span>}
            </div>
            <p className="text-sm text-gray-600">{addr.details}</p>
          </div>
          <button className="text-sm text-gray-500 hover:text-gray-700">Edit</button>
        </div>
      ))}
    </div>
  </div>
);

const WishlistPreview = () => (
  <div className="bg-white rounded-lg shadow-md p-6 text-center">
    <Heart className="mx-auto w-12 h-12 text-pink-300 mb-4" />
    <h2 className="text-xl font-semibold text-gray-800">Your Wishlist is Waiting</h2>
    <p className="text-gray-500 mt-2 mb-4">You haven’t added anything yet. Start exploring our collection ❤️</p>
    <button className="bg-pink-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-pink-600 transition-colors">
      Explore Products
    </button>
  </div>
);

const InfoItem = ({ icon: Icon, label, value, wide = false }) => (
  <div className={`flex items-start space-x-3 ${wide ? 'md:col-span-2' : ''}`}>
    <Icon className="w-5 h-5 text-pink-400 mt-1 flex-shrink-0" />
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-base text-gray-800 font-semibold">{value}</p>
    </div>
  </div>
);

const FormInput = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input {...props} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
  </div>
);
