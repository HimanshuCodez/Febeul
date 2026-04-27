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

export default useAuthStore;
