import { useState, useEffect } from "react";
import {
  User, Mail, Phone, MapPin, ShoppingBag, LogOut, Edit, Gift, Save, X, Loader, Package, Calendar, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../store/authStore";
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import { toast } from "react-hot-toast";
import MembershipStatus from "../components/MembershipStatus";
import MyOrders from "./MyOrders"; 
import CouponShows from "../components/CouponShows";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function Profile() {
  const { user, logout, isAuthenticated, token } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchAddresses = async () => {
    setLoading(true);
    try {
        await useAuthStore.getState().getProfile(); 
        const updatedUser = useAuthStore.getState().user; 
        if(updatedUser && updatedUser.addresses) {
            setAddresses(updatedUser.addresses);
        } else {
            setAddresses([]);
        }
    } catch (error) {
        toast.error("Failed to fetch addresses.");
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    } else if (user) {
      setEditedUser(user);
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if(location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    if(user) {
        if (activeTab === 'addresses') fetchAddresses();
        else setLoading(false);
    }
  }, [activeTab, user]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    console.log("Updated user data:", editedUser);
    useAuthStore.setState({ user: editedUser });
    setIsEditing(false);
    toast.success("Profile updated locally.");
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
    if (loading && activeTab !== 'profile') {
        return <div className="bg-white rounded-lg shadow-md p-6 flex justify-center items-center h-96"><Loader className="animate-spin text-pink-500" size={36} /></div>;
    }

    switch (activeTab) {
      case "profile":
        return <ProfileInfo user={user} editedUser={editedUser} isEditing={isEditing} setIsEditing={setIsEditing} handleInputChange={handleInputChange} handleSave={handleSave} />;
      case "orders":
        return <MyOrders />;
      case "luxeMembership":
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">Febeul Luxe Membership</h2>
            <MembershipStatus user={user} />
          </div>
        );
      case "addresses":
        return <ManageAddresses addresses={addresses} />;
      case "offers": 
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">Coupons & Offers</h2>
            <CouponShows />
          </div>
        );
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
  const navigate = useNavigate();
  const navItems = [
    { id: "profile", icon: User, label: "My Profile" },
    { id: "orders", icon: ShoppingBag, label: "My Orders" },
    { id: "luxeMembership", icon: Gift, label: "Luxe Membership" },
    { id: "offers", icon: Gift, label: "Coupons & Offers" },
    { id: "addresses", icon: MapPin, label: "Manage Addresses" },
    { id: "tickets", icon: HelpCircle, label: "My Tickets" },
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
              onClick={() => {
                if (item.id === 'tickets') {
                  navigate('/support');
                } else {
                  setActiveTab(item.id);
                }
              }}
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
    <MembershipStatus user={user} />
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

const ProfileDetails = ({ user }) => {
  const primaryAddress = user.addresses?.[0];
  const formattedAddress = primaryAddress
    ? `${primaryAddress.address}, ${primaryAddress.city}, ${primaryAddress.country} - ${primaryAddress.zip}`
    : 'Not provided';
  const phoneNumber = primaryAddress?.phone || 'Not provided';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <InfoItem icon={User} label="Full Name" value={user.name} />
      <InfoItem icon={Mail} label="Email Address" value={user.email} />
      <InfoItem icon={Phone} label="Phone Number" value={phoneNumber} />
      <InfoItem icon={MapPin} label="Address" value={formattedAddress} wide />
    </div>
  );
};

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

const ManageAddresses = ({ addresses }) => {
    const navigate = useNavigate();
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Manage Addresses</h2>
            <button onClick={() => navigate('/address')} className="text-sm font-medium text-pink-500 hover:text-pink-700 transition-colors">+ Add New Address</button>
            </div>
            {addresses.length > 0 ? (
                <div className="space-y-4">
                {addresses.map(addr => (
                    <div key={addr._id} className="p-4 rounded-lg border flex justify-between items-start">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <MapPin className="w-5 h-5 text-gray-500"/> 
                          <h3 className="font-semibold text-gray-700">{addr.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600 ml-8">{addr.address}, {addr.city}</p>
                        <p className="text-sm text-gray-600 ml-8">{addr.country} - {addr.zip}</p>
                        <p className="text-sm text-gray-600 ml-8 mt-1">Phone: {addr.phone}</p>
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <MapPin className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No Saved Addresses</h3>
                    <p className="text-gray-500 mt-1">Add an address for faster checkout.</p>
                </div>
            )}
        </div>
    )
};

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
