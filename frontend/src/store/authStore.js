import {create} from 'zustand';
import axios from 'axios';

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: null,
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('token'),

  getProfile: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const response = await axios.get('https://febeul.onrender.com/api/user/profile', {
        headers: { token }
      });
      if (response.data.success) {
        set({ user: response.data.user });
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
      // Clears token if profile fetch fails (e.g. invalid token)
      get().logout();
    }
  },

  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('https://febeul.onrender.com/api/user/login', data);
      if (response.data.success) {
        const { token } = response.data;
        localStorage.setItem('token', token);
        set({ token, loading: false, isAuthenticated: true });
        await get().getProfile(); // Fetch profile after login
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
      const response = await axios.post('https://febeul.onrender.com/api/user/register', data);
      if (response.data.success) {
        const { token } = response.data;
        localStorage.setItem('token', token);
        set({ token, loading: false, isAuthenticated: true });
        await get().getProfile(); // Fetch profile after registration
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
      const response = await axios.post('https://febeul.onrender.com/api/user/forgot-password', { email });
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
      const response = await axios.post('https://febeul.onrender.com/api/user/verify-password-otp', data);
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
      const response = await axios.post('https://febeul.onrender.com/api/user/reset-password', data);
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

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));

// Fetch profile on initial load if token exists
if (localStorage.getItem('token')) {
  useAuthStore.getState().getProfile();
}

export default useAuthStore;
