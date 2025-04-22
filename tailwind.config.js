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
        primary: {
          50:  '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4',
          300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6',
          600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a',
        },
        accent: {
          50:  '#fff7ed', 100: '#ffedd5', 200: '#fed7aa',
          300: '#fdba74', 400: '#fb923c', 500: '#f97316',
          600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12',
        },
        neutral: {
          100: '#fafafa', 200: '#f5f5f5', 300: '#e5e5e5',
          400: '#d4d4d4', 500: '#a3a3a3', 600: '#737373',
          700: '#525252', 800: '#404040', 900: '#262626',
        },
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
