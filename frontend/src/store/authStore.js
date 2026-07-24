import {create} from 'zustand';
import axios from 'axios';

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: null,
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('token'),
  wishlistCount: 0,
  cartCount: 0,
  cartItems: [],
  siteSettings: {
    membershipPrice: 129,
    membershipPriceOriginal: 152,
    shippingThreshold: 499,
    defaultShippingCharge: 50,
    codCharge: 50,
    expectedDeliveryDays: "5 to 7 Days"
  },

  // Seeded with the initial zone/state map so EDD + serviceability checks
  // work even before an admin has saved anything from Delivery Control.
  deliveryZones: {
    zones: [
      { key: 'local', name: 'Local Zone', priority: 'Local', minDays: 1, maxDays: 2 },
      { key: 'north', name: 'North Zone', priority: 'Zonal', minDays: 2, maxDays: 4 },
      { key: 'west', name: 'West Zone', priority: 'Zonal', minDays: 3, maxDays: 5 },
      { key: 'central', name: 'Central Zone', priority: 'Zonal', minDays: 3, maxDays: 5 },
      { key: 'south', name: 'South Zone', priority: 'National', minDays: 4, maxDays: 6 },
      { key: 'east', name: 'East Zone', priority: 'National', minDays: 3, maxDays: 6 },
      { key: 'northeast', name: 'North East Zone', priority: 'Remote', minDays: 5, maxDays: 9 },
      { key: 'special', name: 'Special / Remote Zone', priority: 'Remote', minDays: 5, maxDays: 10 },
    ],
    states: [
      { state: 'Delhi (NCT)', isUT: true, zoneKey: 'local', minDays: 1, maxDays: 2, priority: 'Local', active: true },
      { state: 'Haryana', isUT: false, zoneKey: 'north', minDays: 2, maxDays: 3, priority: 'Zonal', active: true },
      { state: 'Punjab', isUT: false, zoneKey: 'north', minDays: 2, maxDays: 4, priority: 'Zonal', active: true },
      { state: 'Chandigarh', isUT: true, zoneKey: 'north', minDays: 2, maxDays: 3, priority: 'Zonal', active: true },
      { state: 'Uttar Pradesh', isUT: false, zoneKey: 'north', minDays: 2, maxDays: 4, priority: 'Zonal', active: true },
      { state: 'Uttarakhand', isUT: false, zoneKey: 'north', minDays: 2, maxDays: 4, priority: 'Zonal', active: true },
      { state: 'Rajasthan', isUT: false, zoneKey: 'north', minDays: 2, maxDays: 4, priority: 'Zonal', active: true },
      { state: 'Himachal Pradesh', isUT: false, zoneKey: 'north', minDays: 3, maxDays: 5, priority: 'Zonal', active: true },
      { state: 'Gujarat', isUT: false, zoneKey: 'west', minDays: 3, maxDays: 5, priority: 'Zonal', active: true },
      { state: 'Maharashtra', isUT: false, zoneKey: 'west', minDays: 3, maxDays: 5, priority: 'Zonal', active: true },
      { state: 'Goa', isUT: false, zoneKey: 'west', minDays: 4, maxDays: 6, priority: 'Zonal', active: true },
      { state: 'Dadra & Nagar Haveli and Daman & Diu', isUT: true, zoneKey: 'west', minDays: 4, maxDays: 6, priority: 'Zonal', active: true },
      { state: 'Madhya Pradesh', isUT: false, zoneKey: 'central', minDays: 3, maxDays: 5, priority: 'Zonal', active: true },
      { state: 'Chhattisgarh', isUT: false, zoneKey: 'central', minDays: 3, maxDays: 5, priority: 'Zonal', active: true },
      { state: 'Karnataka', isUT: false, zoneKey: 'south', minDays: 4, maxDays: 6, priority: 'National', active: true },
      { state: 'Telangana', isUT: false, zoneKey: 'south', minDays: 4, maxDays: 6, priority: 'National', active: true },
      { state: 'Andhra Pradesh', isUT: false, zoneKey: 'south', minDays: 4, maxDays: 6, priority: 'National', active: true },
      { state: 'Tamil Nadu', isUT: false, zoneKey: 'south', minDays: 4, maxDays: 6, priority: 'National', active: true },
      { state: 'Kerala', isUT: false, zoneKey: 'south', minDays: 5, maxDays: 7, priority: 'National', active: true },
      { state: 'Puducherry', isUT: true, zoneKey: 'south', minDays: 5, maxDays: 7, priority: 'National', active: true },
      { state: 'West Bengal', isUT: false, zoneKey: 'east', minDays: 4, maxDays: 6, priority: 'National', active: true },
      { state: 'Odisha', isUT: false, zoneKey: 'east', minDays: 4, maxDays: 6, priority: 'National', active: true },
      { state: 'Bihar', isUT: false, zoneKey: 'east', minDays: 3, maxDays: 5, priority: 'National', active: true },
      { state: 'Jharkhand', isUT: false, zoneKey: 'east', minDays: 3, maxDays: 5, priority: 'National', active: true },
      { state: 'Assam', isUT: false, zoneKey: 'northeast', minDays: 5, maxDays: 7, priority: 'Remote', active: true },
      { state: 'Sikkim', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 8, priority: 'Remote', active: true },
      { state: 'Tripura', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 9, priority: 'Remote', active: true },
      { state: 'Meghalaya', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 9, priority: 'Remote', active: true },
      { state: 'Manipur', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 9, priority: 'Remote', active: true },
      { state: 'Mizoram', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 9, priority: 'Remote', active: true },
      { state: 'Nagaland', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 9, priority: 'Remote', active: true },
      { state: 'Arunachal Pradesh', isUT: false, zoneKey: 'northeast', minDays: 7, maxDays: 10, priority: 'Remote', active: true },
      { state: 'Jammu & Kashmir', isUT: true, zoneKey: 'special', minDays: 5, maxDays: 8, priority: 'Remote', active: true },
      { state: 'Ladakh', isUT: true, zoneKey: 'special', minDays: 7, maxDays: 10, priority: 'Remote', active: true },
      { state: 'Andaman & Nicobar Islands', isUT: true, zoneKey: 'special', minDays: 8, maxDays: 10, priority: 'Remote', active: true },
      { state: 'Lakshadweep', isUT: true, zoneKey: 'special', minDays: 8, maxDays: 10, priority: 'Remote', active: true },
    ],
  },

  fetchSiteSettings: async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cms/siteSettings`);
      if (response.data.success && response.data.content) {
        set({ siteSettings: response.data.content });
      }
    } catch (error) {
      console.error("Failed to fetch site settings", error);
    }
  },

  fetchDeliveryZones: async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cms/deliveryZones`);
      if (response.data.success && response.data.content && response.data.content.states?.length) {
        set({ deliveryZones: response.data.content });
      }
    } catch (error) {
      console.error("Failed to fetch delivery zones", error);
    }
  },

  // Looks up serviceability + delivery day range for a saved address's state.
  // Returns null if the state isn't found in the zone map at all.
  getStateServiceability: (stateName) => {
    if (!stateName) return null;
    const normalize = (s) => s.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase();
    const target = normalize(stateName);
    if (!target) return null;
    const { states } = get().deliveryZones;
    return (states || []).find((s) => {
      const candidate = normalize(s.state);
      return candidate === target || candidate.includes(target) || target.includes(candidate);
    }) || null;
  },

  fetchWishlistCount: async () => {
    const { user, token, isAuthenticated } = get();
    if (!isAuthenticated || !user) {
      set({ wishlistCount: 0 });
      return;
    }
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/wishlist`, {
        headers: { token }
      });
      if (response.data.success) {
        set({ wishlistCount: response.data.wishlist.length });
      }
    } catch (error) {
      console.error("Failed to fetch wishlist count", error);
      set({ wishlistCount: 0 });
    }
  },

  fetchCartCount: async () => {
    const { user, token, isAuthenticated } = get();
    if (!isAuthenticated || !user) {
      set({ cartCount: 0, cartItems: [] });
      return;
    }
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cart/get`, {
        headers: { token }
      });
      if (response.data.success) {
        const items = response.data.cartItems || [];
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        set({ cartCount: totalQuantity, cartItems: items });
      }
    } catch (error) {
      console.error("Failed to fetch cart count", error);
      set({ cartCount: 0, cartItems: [] });
    }
  },

  setCartItems: (items) => {
    const totalQuantity = (items || []).reduce((sum, item) => sum + item.quantity, 0);
    set({ cartItems: items, cartCount: totalQuantity });
  },

  setCartCount: (count) => set({ cartCount: count }),

  getProfile: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/profile`, {
        headers: { token }
      });
      if (response.data.success) {
        set({ user: response.data.user });
        get().fetchWishlistCount();
        get().fetchCartCount();
      } else {
        get().logout();
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
      get().logout();
    }
  },

  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/login`, data);
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        set({ token, user, loading: false, isAuthenticated: true });
        get().fetchCartCount();
        get().fetchWishlistCount();
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Login failed', loading: false });
    }
  },

  googleLogin: async (credential) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/google-login`, { credential });
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        set({ token, user, loading: false, isAuthenticated: true });
        get().fetchCartCount();
        get().fetchWishlistCount();
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Google login failed', loading: false });
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/register`, data);
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        set({ token, user, loading: false, isAuthenticated: true });
        get().fetchCartCount();
        get().fetchWishlistCount();
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Registration failed', loading: false });
    }
  },

  forgotPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/forgot-password`, { email });
      set({ loading: false });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  verifyPasswordResetOtp: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/verify-password-otp`, data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to verify OTP';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  resetPassword: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/reset-password`, data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: true });
    get().getProfile();
  },

  setWishlistCount: (count) => set({ wishlistCount: count }),

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false, wishlistCount: 0, cartCount: 0, cartItems: [] });
  },

  clearError: () => set({ error: null }),
}));

if (localStorage.getItem('token')) {
  useAuthStore.getState().getProfile();
}
useAuthStore.getState().fetchSiteSettings();
useAuthStore.getState().fetchDeliveryZones();

export default useAuthStore;
