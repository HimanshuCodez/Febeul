import { themeColors, themePlugin } from './theme.js';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: themeColors,
  },
  plugins: [themePlugin],
}
