import { useState, useEffect, useCallback, useRef } from "react";
import {
  User, Mail, Phone, MapPin, ShoppingBag, LogOut, Edit, Save, Loader, HelpCircle, Landmark, Trash2, ShieldCheck, AlertTriangle, ChevronRight, ArrowUpRight, Plus, Crown, Ticket
} from "lucide-react";
import { motion as Motion, AnimatePresence, useReducedMotion } from "framer-motion";
import useAuthStore from "../store/authStore";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import { toast } from "react-hot-toast";
import MembershipStatus from "../components/MembershipStatus";
import MyOrders from "./MyOrders"; 
import CouponShows from "../components/CouponShows";
import ScrollToTop from "../components/ScrollToTop";
import BankAccountFields from "../components/BankAccountFields";
import useBankAccountForm from "../hooks/useBankAccountForm";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const LuxeBadge = () => (
  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
    <Crown size={12} aria-hidden="true" /> Luxe Member
  </span>
);

const accountItems = [
  { id: 'profile', icon: User, label: 'My Profile', description: 'Your personal information' },
  { id: 'orders', icon: ShoppingBag, label: 'My Orders', description: 'Track deliveries and view order details' },
  { id: 'luxeMembership', icon: Crown, label: 'Luxe Membership', description: 'View your membership and benefits' },
  { id: 'offers', icon: Ticket, label: 'Coupons & Offers', description: 'Explore offers available to you' },
  { id: 'addresses', icon: MapPin, label: 'Manage Addresses', description: 'Add or update your delivery addresses' },
  { id: 'bankAccount', icon: Landmark, label: 'Bank Account', description: 'Manage your account for refunds' },
  { id: 'tickets', icon: HelpCircle, label: 'My Tickets', description: 'Get help and check support replies' },
];

export default function Profile() {
  const { user, logout, isAuthenticated, token } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const loggingOut = useRef(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      await useAuthStore.getState().getProfile();
      const updatedUser = useAuthStore.getState().user;
      setAddresses(updatedUser?.addresses || []);
    } catch (error) {
      toast.error('Failed to fetch addresses.');
      console.error(error);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !loggingOut.current) navigate('/auth');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    // A profile refresh replaces user in the store. Depending on that object here
    // would start another refresh on every response while Addresses is selected.
    if (isAuthenticated && token && activeTab === 'addresses') fetchAddresses();
  }, [activeTab, isAuthenticated, token, fetchAddresses]);

  const handleLogout = () => {
    // Keep the sign-in guard from overriding this deliberate navigation home.
    loggingOut.current = true;
    logout();
    navigate('/');
  };

  if (!user) return <div role="status" className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-pink-50/40 text-sm text-slate-500"><Loader className="animate-spin text-pink-500 motion-reduce:animate-none" size={28} aria-hidden="true" /><span>Loading your account...</span></div>;

  const cardStyles = 'min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6';
  const renderContent = () => {
    if (loading && activeTab === 'addresses') return <div role="status" className={cardStyles + ' flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500'}><Loader className="animate-spin text-pink-500 motion-reduce:animate-none" size={22} aria-hidden="true" />Loading addresses...</div>;
    switch (activeTab) {
      case 'orders': return <MyOrders />;
      case 'luxeMembership': return <section className={cardStyles}><SectionHeading title="Febeul Luxe Membership" description="Your membership status, benefits and renewal options." /><div className="min-w-0 [&>div]:mb-0"><MembershipStatus user={user} /></div></section>;
      case 'addresses': return <ManageAddresses addresses={addresses} cardStyles={cardStyles} />;
      case 'bankAccount': return <ManageBankAccount user={user} cardStyles={cardStyles} />;
      case 'offers': return <section className={cardStyles}><SectionHeading title="Coupons & Offers" description="Find an offer for your next purchase. Eligibility and coupon conditions apply." /><CouponShows /></section>;
      default: return <ProfileInfo user={user} cardStyles={cardStyles} setActiveTab={setActiveTab} />;
    }
  };

  return <div className="min-h-screen bg-pink-50/40 px-3 py-5 font-sans text-slate-700 sm:px-6 sm:py-8 lg:px-8 [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-pink-400 [&_button]:focus-visible:ring-offset-2 motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none">
    <ScrollToTop />
    <div className="mx-auto max-w-7xl">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[11px] text-slate-500"><Link to="/" className="rounded hover:text-pink-600 focus-visible:outline-pink-400">Home</Link><ChevronRight size={12} aria-hidden="true" /><span aria-current="page">My Account</span></nav>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-7"><div><h1 className="font-sans text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Your account</h1><p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">Orders, personal details and everything you need for your next visit.</p></div><Link to="/products" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-pink-200 bg-white px-3.5 py-2 text-xs font-semibold text-pink-700 transition-colors hover:bg-pink-50 focus-visible:outline-pink-400">Continue shopping <ArrowUpRight size={14} aria-hidden="true" /></Link></header>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[270px_minmax(0,1fr)]">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
        <main aria-label="Account details" className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <Motion.div key={activeTab} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reduceMotion ? 1 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.16 }} className="min-w-0">
              {renderContent()}
            </Motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  </div>;
}

const Sidebar = ({ activeTab, setActiveTab, user, onLogout }) => {
  const navigate = useNavigate();
  const unreadTicketsCount = useAuthStore(state => state.unreadTicketsCount);
  const initials = String(user.name || 'Customer').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <aside className="min-w-0 space-y-3 lg:sticky lg:top-6" aria-label="Your account menu">
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <span aria-hidden="true" className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-lg font-semibold ' + (user.isLuxeMember ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-pink-200 bg-pink-50 text-pink-600')}>{initials}</span>
      <div className="min-w-0 flex-1"><p className="text-[11px] text-slate-500">Hello,</p><p className="mt-0.5 break-words text-sm font-semibold leading-snug text-slate-900">{user.name || 'Customer'}</p><p className="mt-1 break-all text-[11px] leading-relaxed text-slate-500">{user.email}</p>{user.isLuxeMember && <div className="mt-2"><LuxeBadge /></div>}</div>
    </div>
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <p className="hidden px-4 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 lg:block">Account menu</p>
      <nav aria-label="Account navigation" className="flex min-w-0 gap-1.5 overflow-x-auto p-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-2.5">
        {accountItems.map(item => <button type="button" key={item.id} aria-current={activeTab === item.id ? 'page' : undefined}
          onClick={() => item.id === 'tickets' ? navigate('/support') : setActiveTab(item.id)}
          className={'relative flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors lg:w-full lg:gap-3 lg:text-sm ' + (activeTab === item.id ? 'border-pink-200 bg-pink-50 text-pink-700 shadow-sm' : 'border-transparent text-slate-600 hover:border-slate-100 hover:bg-slate-50 hover:text-slate-900')}>
          <item.icon size={18} className={'shrink-0 ' + (activeTab === item.id ? 'text-pink-500' : 'text-slate-400')} aria-hidden="true" /><span className="whitespace-nowrap">{item.label}</span>
          {item.id === 'tickets' && unreadTicketsCount > 0 && <span className="ml-auto rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600" aria-label={unreadTicketsCount + ' unread ticket replies'}>{unreadTicketsCount}</span>}
          {activeTab === item.id && <ChevronRight size={15} className="ml-auto hidden shrink-0 lg:block" aria-hidden="true" />}
        </button>)}
      </nav>
      <div className="border-t border-slate-100 px-3 py-2.5"><button type="button" onClick={onLogout} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 lg:w-full lg:text-sm"><LogOut size={17} aria-hidden="true" />Logout</button></div>
    </div>
  </aside>;
};

const SectionHeading = ({ title, description, children }) => <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5"><div className="min-w-0"><h2 className="font-sans text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</h2>{description && <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</p>}</div>{children}</div>;

const ProfileInfo = ({ user, cardStyles, setActiveTab }) => {
  const navigate = useNavigate();
  return <div className="space-y-5">
    <section className={cardStyles} aria-labelledby="personal-information-title">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5"><div><h2 id="personal-information-title" className="font-sans text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Personal information</h2><p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">Your saved account and contact details.</p></div>{user.isLuxeMember && <LuxeBadge />}</div>
      <ProfileDetails user={user} />
      <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">Need help with your account? <Link to="/support" className="rounded font-semibold text-pink-600 underline underline-offset-4 focus-visible:outline-pink-400">Contact support</Link></p>
    </section>
    <section aria-labelledby="account-shortcuts-title">
      <h2 id="account-shortcuts-title" className="mb-3 font-sans text-sm font-semibold text-slate-800">Manage your account</h2>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">{accountItems.filter(item => item.id !== 'profile').map(item => <button type="button" key={item.id} onClick={() => item.id === 'tickets' ? navigate('/support') : setActiveTab(item.id)} className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-colors hover:border-pink-200 hover:bg-pink-50/40 sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-pink-500"><item.icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800 group-hover:text-pink-700">{item.label}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.description}</span></span><ChevronRight size={15} className="mt-1 shrink-0 text-slate-400 group-hover:text-pink-500" aria-hidden="true" />
      </button>)}</div>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-pink-50/70 p-4 sm:p-5"><div className="flex items-start gap-3"><HelpCircle size={20} className="mt-0.5 shrink-0 text-pink-500" aria-hidden="true" /><div><p className="text-sm font-semibold text-slate-800">We're here to help</p><p className="mt-1 text-xs text-slate-500">Questions about an order, delivery or return?</p></div></div><Link to="/support" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-pink-200 bg-white px-4 py-2 text-xs font-semibold text-pink-700 hover:bg-pink-50 focus-visible:outline-pink-400">Visit support <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
  </div>;
};

const ProfileDetails = ({ user }) => {
  const primaryAddress = user.addresses?.[0];
  const phoneNumber = user.mobile || user.phone || primaryAddress?.phone || 'Not provided';
  return <dl className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <InfoItem icon={User} label="Full name" value={user.name || 'Not provided'} />
    <InfoItem icon={Mail} label="Email address" value={user.email || 'Not provided'} />
    <InfoItem icon={Phone} label="Phone number" value={phoneNumber} />
  </dl>;
};

const ManageAddresses = ({ addresses, cardStyles }) => {
  const navigate = useNavigate();
  return <section className={cardStyles}>
    <SectionHeading title="Manage Addresses" description={addresses.length ? addresses.length + (addresses.length === 1 ? ' saved delivery address.' : ' saved delivery addresses.') : 'Save a delivery address for your next order.'}>
      <button type="button" onClick={() => navigate('/address')} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50 px-4 py-2.5 text-xs font-semibold text-pink-700 transition-colors hover:bg-pink-100"><Plus size={15} aria-hidden="true" />Add New Address</button>
    </SectionHeading>
    {addresses.length > 0 ? <div className="grid min-w-0 gap-4 xl:grid-cols-2">{addresses.map(addr => <article key={addr._id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label={'Address for ' + addr.name}>
      <div className="mb-4 flex flex-wrap items-center gap-2"><MapPin size={17} className="shrink-0 text-pink-500" aria-hidden="true" /><h3 className="min-w-0 break-words font-sans text-sm font-semibold text-slate-800">{addr.name}</h3>{addr.addressType && <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{addr.addressType === 'Home' ? 'House/Apartment' : addr.addressType}</span>}</div>
      <address className="flex-1 space-y-1 break-words text-sm not-italic leading-relaxed text-slate-600"><p>{[addr.address, addr.locality].filter(Boolean).join(', ')}</p>{addr.landmark && <p className="text-xs text-slate-400">Landmark: {addr.landmark}</p>}<p>{[addr.city, addr.state].filter(Boolean).join(', ')}</p><p>{addr.country} - {addr.zip}</p><p className="pt-2 text-xs text-slate-500">Phone: <span className="font-medium text-slate-700">{addr.phone}{addr.alternatePhone ? ', ' + addr.alternatePhone : ''}</span></p></address>
      <div className="mt-4 border-t border-slate-100 pt-3"><button type="button" onClick={() => navigate('/address', { state: { address: addr } })} aria-label={'Edit address for ' + addr.name} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-pink-600 transition-colors hover:bg-pink-50"><Edit size={14} aria-hidden="true" />Edit address</button></div>
    </article>)}</div> : <div className="rounded-xl border border-dashed border-pink-200 bg-pink-50/30 px-4 py-12 text-center"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-pink-100 bg-white text-pink-400"><MapPin size={26} aria-hidden="true" /></span><h3 className="font-sans text-base font-semibold text-slate-800">No Saved Addresses</h3><p className="mt-2 text-sm text-slate-500">Add an address for faster checkout.</p></div>}
  </section>;
};

const ManageBankAccount = ({ user, cardStyles }) => {
  const token = useAuthStore((state) => state.token);
  const savedAccount = user?.bankAccount?.accountNumber ? user.bankAccount : null;

  const [showForm, setShowForm] = useState(false);
  const { form, errors, handleChange, validate, reset } = useBankAccountForm();
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

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
        reset();
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
      <SectionHeading title="Bank Account" description="Manage the bank account saved for refunds and payouts.">
        {!savedAccount && !showForm && <button type="button" onClick={() => setShowForm(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50 px-4 py-2.5 text-xs font-semibold text-pink-700 transition-colors hover:bg-pink-100"><Plus size={15} aria-hidden="true" />Add Bank Account</button>}
      </SectionHeading>
      <p className="mb-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">You can save one bank account at a time. To use a different account, remove the existing one first.</p>

      {savedAccount ? (
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-pink-100 bg-pink-50">
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
            <div className="min-w-0 self-start xl:max-w-xs">
              {!confirmRemove ? (
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-100 px-4 py-2.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <Trash2 size={15} />
                  <span>Remove</span>
                </button>
              ) : (
                <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 leading-snug">Remove this account? You can add a new one after.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleRemove}
                      disabled={removing}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                    >
                      {removing ? <Loader size={12} className="animate-spin" /> : null}
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmRemove(false)}
                      className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-500">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-pink-400" aria-hidden="true" />
            <span>Used only for refunds and payouts to your account.</span>
          </div>
        </div>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="space-y-5 [&_input]:min-h-11 [&_input]:rounded-xl [&_input]:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-pink-100">
          <BankAccountFields form={form} errors={errors} onChange={handleChange} />
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); reset(); }}
              className="min-h-11 w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600 disabled:opacity-60 sm:w-auto"
            >
              {submitting ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{submitting ? "Saving..." : "Save Bank Account"}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-dashed border-pink-200 bg-pink-50/30 px-4 py-12 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-pink-100 bg-white text-pink-400"><Landmark size={26} aria-hidden="true" /></span>
          <h3 className="font-sans text-base font-semibold text-slate-800">No Bank Account Added</h3>
          <p className="mt-2 text-sm text-slate-500">Add an account for refunds and payouts.</p>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ icon, label, value }) => {
  const Icon = icon;
  return (
  <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
    <dt className="mb-2 flex items-center gap-2 text-[11px] font-medium text-slate-500"><Icon size={14} className="shrink-0 text-slate-400" aria-hidden="true" />{label}</dt>
    <dd className="break-words text-sm font-semibold leading-relaxed text-slate-800 [overflow-wrap:anywhere]">{value}</dd>
  </div>
);
};
