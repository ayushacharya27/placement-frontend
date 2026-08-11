/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#0B0D10',       /* Deepest background */
          panel: '#121419',    /* Slightly lighter cards */
          surface: '#1A1D24',  /* Inner status boxes */
          border: '#22252A',   /* Crisp borders */
          textPrimary: '#F3F4F6',
          textSecondary: '#9CA3AF',
          textMuted: '#6B7280',
          emerald: '#34D399',
          amber: '#FBBF24',
          rose: '#FB7185'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}