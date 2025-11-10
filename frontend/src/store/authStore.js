import {create} from 'zustand';
import axios from 'axios';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,
  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('http://localhost:4000/api/user/login', data);
      if (response.data.success) {
        const { token } = response.data;
        localStorage.setItem('token', token);
        set({ token, loading: false });
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
      const response = await axios.post('http://localhost:4000/api/user/register', data);
      if (response.data.success) {
        const { token } = response.data;
        localStorage.setItem('token', token);
        set({ token, loading: false });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Registration failed', loading: false });
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null });
  },
}));

export default useAuthStore;
