import { themeColors, themePlugin } from './theme.js';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      ...themeColors,
      // Increase text independently of the rem-based layout and spacing scale.
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.25rem' }],
        sm: ['1rem', { lineHeight: '1.5rem' }],
        base: ['1.125rem', { lineHeight: '1.75rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.375rem', { lineHeight: '2rem' }],
        '2xl': ['1.625rem', { lineHeight: '2.125rem' }],
        '3xl': ['2rem', { lineHeight: '2.5rem' }],
        '4xl': ['2.375rem', { lineHeight: '2.75rem' }],
        '5xl': ['3.125rem', { lineHeight: '1' }],
        '6xl': ['3.875rem', { lineHeight: '1' }],
        '7xl': ['4.625rem', { lineHeight: '1' }],
        '8xl': ['6.125rem', { lineHeight: '1' }],
        '9xl': ['8.125rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [themePlugin],
}
