import { create } from 'zustand';
import axios from 'axios';

const useSocialsStore = create((set, get) => ({
  links: [],
  loaded: false,
  loading: false,
  fetchSocials: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cms/socialSettings`);
      if (!data.success || !Array.isArray(data.content?.links)) {
        throw new Error('Social links could not be loaded.');
      }
      // Ignore malformed or unsafe links even if content was edited outside the admin page.
      const links = data.content.links.filter(link => {
        if (!link || typeof link.label !== 'string' || !link.label.trim() || typeof link.url !== 'string') return false;
        try {
          return ['https:', 'http:'].includes(new URL(link.url).protocol);
        } catch {
          return false;
        }
      });
      set({ links, loaded: true });
    } catch (error) {
      console.error('Error loading social links:', error);
    } finally {
      set({ loading: false });
    }
  },
}));

export default useSocialsStore;
