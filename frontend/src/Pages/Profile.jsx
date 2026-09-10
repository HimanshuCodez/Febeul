import { useState, useEffect } from "react";
import {
  User, Mail, Phone, MapPin, ShoppingBag, LogOut, Edit, Gift, Save, X, Loader, Package, Calendar, HelpCircle, Landmark, Trash2, ShieldCheck, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../store/authStore";
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import { toast } from "react-hot-toast";
import MembershipStatus from "../components/MembershipStatus";
import MyOrders from "./MyOrders"; 
import CouponShows from "../components/CouponShows";
import ScrollToTop from "../components/ScrollToTop";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const LuxeBadge = () => (
  <motion.div
    animate={{ 
      boxShadow: ["0 0 0px #fbbf24", "0 0 15px #fbbf24", "0 0 0px #fbbf24"],
      scale: [1, 1.05, 1]
    }}
    transition={{ duration: 2, repeat: Infinity }}
    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 text-white border border-yellow-200 shadow-lg tracking-wider uppercase mb-1"
  >
    <Gift size={10} className="mr-1" />
    Luxe Member
  </motion.div>
);

const LuxeSparkles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-yellow-400 rounded-full"
        initial={{ 
          top: `${Math.random() * 100}%`, 
          left: `${Math.random() * 100}%`,
          opacity: 0,
          scale: 0
        }}
        animate={{ 
          opacity: [0, 0.8, 0],
          scale: [0, 1.5, 0],
          y: [0, -20, 0]
        }}
        transition={{ 
          duration: 3 + Math.random() * 4, 
          repeat: Infinity, 
          delay: Math.random() * 5 
        }}
      />
    ))}
  </div>
);

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

    const cardStyles = user.isLuxeMember 
      ? "bg-white/80 backdrop-blur-sm rounded-lg shadow-xl p-6 border-2 border-yellow-400/30 relative z-10" 
      : "bg-white rounded-lg shadow-md p-6 relative z-10";

    switch (activeTab) {
      case "profile":
        return <ProfileInfo user={user} editedUser={editedUser} isEditing={isEditing} setIsEditing={setIsEditing} handleInputChange={handleInputChange} handleSave={handleSave} cardStyles={cardStyles} />;
      case "orders":
        return <MyOrders />;
      case "luxeMembership":
        return (
          <div className={cardStyles}>
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">Febeul Luxe Membership</h2>
            <MembershipStatus user={user} />
          </div>
        );
      case "addresses":
        return <ManageAddresses addresses={addresses} cardStyles={cardStyles} />;
      case "bankAccount":
        return <ManageBankAccount user={user} cardStyles={cardStyles} />;
      case "offers": 
        return (
          <div className={cardStyles}>
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-4 mb-6">Coupons & Offers</h2>
            <CouponShows />
          </div>
        );
      default:
        return <ProfileInfo user={user} editedUser={editedUser} isEditing={isEditing} setIsEditing={setIsEditing} handleInputChange={handleInputChange} handleSave={handleSave} cardStyles={cardStyles} />;
    }
  };

  return (
    <div className={`min-h-screen ${user.isLuxeMember ? 'bg-gradient-to-br from-amber-50 via-white to-yellow-50' : 'bg-pink-50/50'} font-sans py-12 px-4 sm:px-6 lg:px-8 relative`}>
      <ScrollToTop />
      {user.isLuxeMember && <LuxeSparkles />}
      <div className="max-w-7xl mx-auto relative z-10">
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
  const unreadTicketsCount = useAuthStore((state) => state.unreadTicketsCount);
  const navItems = [
    { id: "profile", icon: User, label: "My Profile" },
    { id: "orders", icon: ShoppingBag, label: "My Orders" },
    { id: "luxeMembership", icon: Gift, label: "Luxe Membership" },
    { id: "offers", icon: Gift, label: "Coupons & Offers" },
    { id: "addresses", icon: MapPin, label: "Manage Addresses" },
    { id: "bankAccount", icon: Landmark, label: "Bank Account" },
    { id: "tickets", icon: HelpCircle, label: "My Tickets" },
  ];

  return (
    <aside className="lg:col-span-3 mb-8 lg:mb-0">
      <div className={`${user.isLuxeMember ? 'bg-white/90 border-2 border-yellow-400/50 shadow-[0_0_20px_rgba(251,191,36,0.2)]' : 'bg-white shadow-md'} rounded-lg p-4 transition-all duration-500`}>
        <div className="flex items-center space-x-4 p-2 mb-4">
          <div className="relative">
            <img
              src={`https://api.dicebear.com/6.x/initials/svg?seed=${user.name}`}
              alt="User Avatar"
              className={`w-16 h-16 rounded-full border-2 ${user.isLuxeMember ? 'border-yellow-400' : 'border-pink-200'} bg-gray-200 shadow-inner`}
            />
            {user.isLuxeMember && (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-1 border border-dashed border-yellow-500 rounded-full"
              />
            )}
          </div>
          <div className="flex flex-col">
            {user.isLuxeMember && <LuxeBadge />}
            <h2 className="text-lg font-bold text-gray-800">{user.name}</h2>
            <p className="text-[10px] text-gray-500 break-all leading-tight">{user.email}</p>
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
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-300 ${
                activeTab === item.id
                  ? (user.isLuxeMember ? "bg-amber-100 text-amber-700 shadow-sm" : "bg-pink-100 text-pink-600")
                  : "text-gray-600 hover:bg-gray-100"
              }`}>
              <span className="relative">
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? (user.isLuxeMember ? 'text-amber-600' : 'text-pink-500') : 'text-gray-400'}`} />
                {item.id === 'tickets' && unreadTicketsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" title={`${unreadTicketsCount} unread ticket ${unreadTicketsCount === 1 ? 'reply' : 'replies'}`} />
                )}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
          <button onClick={onLogout} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};

const ProfileInfo = ({ user, editedUser, isEditing, setIsEditing, handleInputChange, handleSave, cardStyles }) => (
  <div className={cardStyles}>
    <MembershipStatus user={user} />
    
    
  </div>
);

const ProfileDetails = ({ user }) => {
  const primaryAddress = user.addresses?.[0];
  const phoneNumber = user.phone || primaryAddress?.phone || 'Not provided';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <InfoItem icon={User} label="Full Name" value={user.name} isLuxe={user.isLuxeMember} />
      <InfoItem icon={Mail} label="Email Address" value={user.email} isLuxe={user.isLuxeMember} />
      <InfoItem icon={Phone} label="Phone Number" value={phoneNumber} isLuxe={user.isLuxeMember} />
    </div>
  );
};

const ProfileForm = ({ user, onInputChange, onSave, isLuxe }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormInput name="name" label="Full Name" value={user.name || ''} onChange={onInputChange} />
      <FormInput name="email" label="Email Address" value={user.email || ''} onChange={onInputChange} type="email" />
      <FormInput name="phone" label="Phone Number" value={user.phone || ''} onChange={onInputChange} />
      <FormInput name="dob" label="Date of Birth" value={user.dob ? user.dob.split('T')[0] : ''} onChange={onInputChange} type="date" />
    </div>
    <div className="flex justify-end pt-4">
      <button onClick={onSave} className={`flex items-center space-x-2 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all transform hover:scale-105 ${isLuxe ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700' : 'bg-pink-500 hover:bg-pink-600'}`}>
        <Save size={16} />
        <span>Save Changes</span>
      </button>
    </div>
  </div>
);

const ManageAddresses = ({ addresses, cardStyles }) => {
    const navigate = useNavigate();
    return (
        <div className={cardStyles}>
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
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-700">{addr.name}</h3>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full uppercase font-bold border">
                                {addr.addressType === 'Home' ? 'House/Apartment' : addr.addressType}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 ml-8">{addr.address}, {addr.locality}</p>
                        {addr.landmark && <p className="text-sm text-gray-400 italic ml-8">Landmark: {addr.landmark}</p>}
                        <p className="text-sm text-gray-600 ml-8">{addr.city}, {addr.state}</p>
                        <p className="text-sm text-gray-600 ml-8">{addr.country} - {addr.zip}</p>
                        <p className="text-sm text-gray-600 ml-8 mt-1">Phone: {addr.phone}{addr.alternatePhone ? `, ${addr.alternatePhone}` : ''}</p>
                    </div>
                    <button 
                        onClick={() => navigate('/address', { state: { address: addr } })}
                        className="text-pink-500 hover:text-pink-700 p-2"
                        title="Edit Address"
                    >
                        <Edit size={18} />
                    </button>
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

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const emptyBankForm = { accountHolderName: "", accountNumber: "", confirmAccountNumber: "", ifsc: "", bankName: "" };

const ManageBankAccount = ({ user, cardStyles }) => {
  const token = useAuthStore((state) => state.token);
  const savedAccount = user?.bankAccount?.accountNumber ? user.bankAccount : null;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyBankForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === "accountNumber" || name === "confirmAccountNumber") {
      nextValue = value.replace(/\D/g, "").slice(0, 18);
    } else if (name === "ifsc") {
      nextValue = value.toUpperCase().replace(/\s/g, "").slice(0, 11);
    }
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.accountHolderName.trim()) nextErrors.accountHolderName = "Enter the account holder's name";
    if (!form.bankName.trim()) nextErrors.bankName = "Enter the bank name";
    if (!/^\d{9,18}$/.test(form.accountNumber)) nextErrors.accountNumber = "Enter a valid account number";
    if (form.accountNumber !== form.confirmAccountNumber) nextErrors.confirmAccountNumber = "Account numbers do not match";
    if (!IFSC_REGEX.test(form.ifsc)) nextErrors.ifsc = "Enter a valid IFSC code (e.g. HDFC0001234)";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/user/bank-account/add`,
        form,
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success("Bank account added successfully");
        await useAuthStore.getState().getProfile();
        setForm(emptyBankForm);
        setShowForm(false);
      } else {
        toast.error(response.data.message || "Failed to add bank account");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add bank account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/user/bank-account/remove`,
        {},
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success("Bank account removed");
        await useAuthStore.getState().getProfile();
        setConfirmRemove(false);
      } else {
        toast.error(response.data.message || "Failed to remove bank account");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove bank account");
    } finally {
      setRemoving(false);
    }
  };

  const maskAccountNumber = (num) => {
    if (!num) return "";
    const last4 = num.slice(-4);
    return `${"•".repeat(Math.max(num.length - 4, 4))} ${last4}`;
  };

  return (
    <div className={cardStyles}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Bank Account</h2>
        {!savedAccount && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-pink-500 hover:text-pink-700 transition-colors"
          >
            + Add Bank Account
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-6 -mt-2">
        Add a bank account to receive refunds and payouts. Only one bank account can be saved at a time — remove the existing one to add a different account.
      </p>

      {savedAccount ? (
        <div className="rounded-lg border p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-pink-500" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 break-words">{savedAccount.accountHolderName}</p>
                <p className="text-sm text-gray-500 break-words">{savedAccount.bankName}</p>
                <p className="text-sm text-gray-600 font-mono tracking-wide mt-1 break-all">
                  {maskAccountNumber(savedAccount.accountNumber)}
                </p>
                <p className="text-xs text-gray-400 mt-1">IFSC: {savedAccount.ifsc}</p>
              </div>
            </div>
            <div className="flex-shrink-0 self-start">
              {!confirmRemove ? (
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition-colors px-3 py-2 rounded-md hover:bg-red-50"
                >
                  <Trash2 size={15} />
                  <span>Remove</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-red-50 border border-red-100 rounded-md p-3">
                  <div className="flex items-start gap-2 sm:max-w-[180px]">
                    <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 leading-snug">Remove this account? You can add a new one after.</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={handleRemove}
                      disabled={removing}
                      className="flex items-center justify-center gap-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-3 py-1.5 rounded-md transition-colors"
                    >
                      {removing ? <Loader size={12} className="animate-spin" /> : null}
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmRemove(false)}
                      className="text-xs font-bold text-gray-600 bg-white border hover:bg-gray-50 px-3 py-1.5 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-4 pt-3 border-t">
            <ShieldCheck size={13} />
            <span>Used only for refunds and payouts to your account.</span>
          </div>
        </div>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <BankFormInput
                name="accountHolderName"
                label="Account Holder Name"
                value={form.accountHolderName}
                onChange={handleChange}
                error={errors.accountHolderName}
                placeholder="As per bank records"
              />
            </div>
            <div className="sm:col-span-2">
              <BankFormInput
                name="bankName"
                label="Bank Name"
                value={form.bankName}
                onChange={handleChange}
                error={errors.bankName}
                placeholder="e.g. HDFC Bank"
              />
            </div>
            <BankFormInput
              name="accountNumber"
              label="Account Number"
              value={form.accountNumber}
              onChange={handleChange}
              error={errors.accountNumber}
              inputMode="numeric"
              placeholder="Enter account number"
            />
            <BankFormInput
              name="confirmAccountNumber"
              label="Confirm Account Number"
              value={form.confirmAccountNumber}
              onChange={handleChange}
              onPaste={(e) => e.preventDefault()}
              error={errors.confirmAccountNumber}
              inputMode="numeric"
              placeholder="Re-enter account number"
            />
            <div className="sm:col-span-2">
              <BankFormInput
                name="ifsc"
                label="IFSC Code"
                value={form.ifsc}
                onChange={handleChange}
                error={errors.ifsc}
                placeholder="e.g. HDFC0001234"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(emptyBankForm); setErrors({}); }}
              className="w-full sm:w-auto px-6 py-2 rounded-full font-bold text-gray-600 border hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all disabled:opacity-60 bg-pink-500 hover:bg-pink-600"
            >
              {submitting ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{submitting ? "Saving..." : "Save Bank Account"}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-12">
          <Landmark className="mx-auto w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No Bank Account Added</h3>
          <p className="text-gray-500 mt-1">Add a bank account to get refunds faster.</p>
        </div>
      )}
    </div>
  );
};

const BankFormInput = ({ label, error, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      {...props}
      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm ${error ? "border-red-400" : "border-gray-300"}`}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const InfoItem = ({ icon: Icon, label, value, isLuxe, wide = false }) => (
  <div className={`flex items-start space-x-3 ${wide ? 'md:col-span-2' : ''}`}>
    <Icon className={`w-5 h-5 mt-1 flex-shrink-0 ${isLuxe ? 'text-amber-500' : 'text-pink-400'}`} />
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-base font-semibold ${isLuxe ? 'text-amber-900' : 'text-gray-800'}`}>{value}</p>
    </div>
  </div>
);

const FormInput = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input {...props} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
  </div>
);
