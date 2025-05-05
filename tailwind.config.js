/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        primary: { // FloHub Teal
          50:  '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4',
          300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6',
          600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a',
        },
        accent: '#FB7185', // FloHub Coral
        charcoal: '#1F2937', // Dark Charcoal
        'cool-grey': '#9CA3AF', // Cool Grey
        'off-white': '#F9FAFB', // Off-White
        'soft-yellow': '#FACC15', // Soft Yellow
        'sky-blue': '#38BDF8', // Sky Blue
      },
      borderRadius: { xl: '1.5rem' },
      boxShadow: {
        'elevate-sm': '0 1px 2px rgba(0,0,0,0.05)',
        'elevate-md': '0 4px 6px rgba(0,0,0,0.1)',
        'elevate-lg': '0 10px 15px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
