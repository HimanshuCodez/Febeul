import { useState, useEffect } from "react";
import {
  User, Mail, Phone, MapPin, Heart, ShoppingBag, LogOut, Edit, Gift, Save, X, Loader, Trash2, ArrowRight, Package, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../store/authStore";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from 'axios';
import { toast } from "react-hot-toast";
import ProductCard from "../components/ProductCard";
import MembershipStatus from "../components/MembershipStatus";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function Profile() {
  const { user, logout, isAuthenticated, token, fetchWishlistCount } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/order/userorders`, {}, { headers: { token } });
      if (response.data.success) {
        setOrders(response.data.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (error) {
      toast.error("Failed to fetch orders.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    setLoading(true);
    try {
        // This function implicitly updates the user object in useAuthStore
        await useAuthStore.getState().getProfile(); 
        // Now, get the updated user object from the store
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

  const fetchWishlist = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/user/wishlist`, {
        headers: { token },
        params: { userId: user._id }
      });
      if (response.data.success) {
        setWishlistItems(response.data.wishlist);
      }
    } catch (error) {
      toast.error("Error fetching wishlist");
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
        if (activeTab === 'orders') fetchOrders();
        else if (activeTab === 'addresses') fetchAddresses();
        else if (activeTab === 'wishlist') fetchWishlist();
        else setLoading(false);
    }
  }, [activeTab, user]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    // This assumes a backend endpoint exists for updating user profile
    console.log("Updated user data:", editedUser);
    useAuthStore.setState({ user: editedUser });
    setIsEditing(false);
    toast.success("Profile updated locally (no API call).");
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };



  const handleRemoveFromWishlist = async (productId) => {
    try {
      await axios.post(`${backendUrl}/api/user/wishlist/remove`, 
        { userId: user._id, productId },
        { headers: { token } }
      );
      setWishlistItems((items) => items.filter((item) => item._id !== productId));
      toast.success("Removed from wishlist");
      fetchWishlistCount();
    } catch (error) {
      toast.error("Failed to remove from wishlist");
    }
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
        return <OrderHistory orders={orders} onOrderSelect={setSelectedOrder} />;
      case "addresses":
        return <ManageAddresses addresses={addresses} />;
      case "wishlist":
        return <WishlistItems wishlist={wishlistItems} onRemove={handleRemoveFromWishlist} />;
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
      <AnimatePresence>
        {selectedOrder && (
            <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}
      </AnimatePresence>
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

const OrderHistory = ({ orders, onOrderSelect }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">Order History</h2>
      {orders.length > 0 ? (
          <div className="space-y-4">
          {orders.map(order => (
              <div key={order._id} className="p-4 rounded-lg border hover:border-pink-200 hover:bg-pink-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="mb-2 sm:mb-0">
                  <p className="font-semibold text-gray-800">Order #{order._id.slice(-6)}</p>
                  <p className="text-sm text-gray-500">{new Date(order.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} &bull; {order.items.length} items</p>
                </div>
                <div className="flex items-center space-x-4">
                  <p className="font-semibold text-gray-700">₹{order.amount.toFixed(2)}</p>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${
                    order.status === "Food Processing" ? "bg-yellow-100 text-yellow-700" :
                    order.status === "Out for delivery" ? "bg-blue-100 text-blue-700" :
                    order.status === "Delivered" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {order.status}
                  </span>
                  <button onClick={() => onOrderSelect(order)} className="text-pink-500 hover:text-pink-700">
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
            <ShoppingBag className="mx-auto w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No Orders Yet</h3>
            <p className="text-gray-500 mt-1">Your past orders will appear here.</p>
            <Link to="/" className="mt-4 inline-block bg-pink-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-pink-600 transition-colors">
                Start Shopping
            </Link>
        </div>
      )}
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
                          <MapPin className="w-5 h-5 text-gray-500"/> {/* Use generic MapPin icon */}
                          <h3 className="font-semibold text-gray-700">{addr.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600 ml-8">{addr.address}, {addr.city}</p>
                        <p className="text-sm text-gray-600 ml-8">{addr.country} - {addr.zip}</p>
                        <p className="text-sm text-gray-600 ml-8 mt-1">Phone: {addr.phone}</p>
                    </div>
                    {/* Removed Edit and Delete buttons as per backend limitation */}
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

const WishlistItems = ({ wishlist, onRemove }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">My Wishlist</h2>
      {wishlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map((item) => (
              <div key={item._id} className="relative">
                  <ProductCard product={item} />
                  <button
                      onClick={() => onRemove(item._id)}
                      className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-md hover:bg-red-100 transition-colors z-10"
                      aria-label="Remove from wishlist"
                  >
                      <Trash2 className="text-red-500 w-5 h-5" />
                  </button>
              </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
            <Heart className="mx-auto w-12 h-12 text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700">Your Wishlist is Empty</h2>
            <p className="text-gray-500 mt-2 mb-4">You haven’t added anything yet. Start exploring!</p>
            <Link to="/" className="bg-pink-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-pink-600 transition-colors">
                Explore Products
            </Link>
        </div>
      )}
    </div>
);

const OrderDetailModal = ({ order, onClose }) => {
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Note: Shipping and Tax might not be stored per order, so we're estimating/omitting
    const total = order.amount;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-gray-50 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-sm">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Order Details</h2>
                        <p className="text-sm text-gray-500">Order #{order._id.slice(-8).toUpperCase()} &bull; Placed on {new Date(order.date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-6">
                    {/* Items */}
                    <div className="space-y-3">
                        {order.items.map(item => (
                            <div key={item._id} className="flex items-center">
                                <img src={item.variations?.[0]?.images?.[0] || item.image} alt={item.name} className="w-16 h-16 rounded-md object-cover mr-4"/>
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-800">{item.name}</p>
                                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                </div>
                                <p className="font-semibold text-gray-700">₹{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                    {/* Summary */}
                    <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{order.amount > subtotal ? `₹${(order.amount - subtotal).toFixed(2)}` : 'Free'}</span></div>
                        <div className="flex justify-between font-bold text-lg text-gray-800 mt-2 pt-2 border-t"><span>Total</span><span className="text-pink-600">₹{total.toFixed(2)}</span></div>
                    </div>
                    {/* Address and Status */}
                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2 flex items-center"><MapPin size={16} className="mr-2 text-pink-500"/> Shipping Address</h3>
                            <div className="text-sm text-gray-600">
                                <p className="font-bold">{order.address.name}</p>
                                <p>{order.address.street}, {order.address.city}</p>
                                <p>{order.address.state}, {order.address.country} - {order.address.zip}</p>
                                <p>Phone: {order.address.phone}</p>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2 flex items-center"><Package size={16} className="mr-2 text-pink-500"/> Order Status</h3>
                            <p className={`text-sm font-semibold capitalize p-2 rounded-md inline-block
                                ${order.status === "Delivered" ? "bg-green-100 text-green-700" :
                                order.status === "Out for delivery" ? "bg-blue-100 text-blue-700" :
                                "bg-yellow-100 text-yellow-700"}
                            `}>{order.status}</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

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
