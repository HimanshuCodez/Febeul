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

  fetchWishlistCount: async () => {
    const { user, token, isAuthenticated } = get();
    if (!isAuthenticated || !user) {
      set({ wishlistCount: 0 });
      return;
    }
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/wishlist`, {
        headers: { token },
        params: { userId: user._id }
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
      set({ cartCount: 0 });
      return;
    }
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/cart/get`, { userId: user._id }, {
        headers: { token }
      });
      if (response.data.success) {
        set({ cartCount: response.data.cartItems.length });
      }
    } catch (error) {
      console.error("Failed to fetch cart count", error);
      set({ cartCount: 0 });
    }
  },

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
        const { token } = response.data;
        localStorage.setItem('token', token);
        set({ token, loading: false, isAuthenticated: true });
        await get().getProfile();
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Login failed', loading: false });
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/register`, data);
      if (response.data.success) {
        const { token } = response.data;
        localStorage.setItem('token', token);
        set({ token, loading: false, isAuthenticated: true });
        await get().getProfile();
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
    set({ token: null, user: null, isAuthenticated: false, wishlistCount: 0, cartCount: 0 });
  },

  clearError: () => set({ error: null }),
}));

// Fetch profile on initial load if token exists
if (localStorage.getItem('token')) {
  useAuthStore.getState().getProfile();
}

export default useAuthStore;
