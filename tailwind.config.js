/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pastel-teal': '#A7DBD8',
        'pastel-orange': '#F0C6A3',
      },
    },
  },
  plugins: [],
};
