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
        // Brand Guidelines Colors
        primary: { // FloHub Teal (#00C9A7)
          50:  '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4',
          300: '#5eead4', 400: '#2dd4bf', 500: '#00C9A7',
          600: '#00b396', 700: '#009d85', 800: '#008774', 900: '#007163',
        },
        accent: { // FloHub Coral (#FF6B6B)
          50: '#fff5f5', 100: '#fed7d7', 200: '#feb2b2',
          300: '#fc8181', 400: '#f56565', 500: '#FF6B6B',
          600: '#e53e3e', 700: '#c53030', 800: '#9b2c2c', 900: '#742a2a',
        },
        'dark-base': '#1E1E2F', // Brand Dark Base
        'soft-white': '#FDFDFD', // Brand Soft White
        'grey-tint': '#9CA3AF', // Brand Grey Tint
        // Legacy colors for compatibility
        charcoal: '#1E1E2F', // Updated to brand dark base
        'cool-grey': '#9CA3AF',
        'off-white': '#FDFDFD', // Updated to brand soft white
        'soft-yellow': '#FACC15',
        'sky-blue': '#38BDF8',
      },
      fontFamily: {
        // Brand Guidelines Typography
        'heading': ['Poppins', 'sans-serif'], // For headings
        'body': ['Inter', 'sans-serif'], // For body text
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'], // Default sans
      },
      fontSize: {
        // Brand Guidelines Type Sizes
        'xs': '0.75rem',     // 12px - Microcopy
        'sm': '0.875rem',    // 14px - Microcopy
        'base': '1rem',      // 16px - Body text
        'lg': '1.125rem',    // 18px
        'xl': '1.25rem',     // 20px
        '2xl': '1.5rem',     // 24px - H2
        '3xl': '1.875rem',   // 30px
        '4xl': '2rem',       // 32px - H1
        '5xl': '3rem',       // 48px
        '6xl': '4rem',       // 64px
      },
      lineHeight: {
        // Brand Guidelines Line Heights (1.4-1.6x)
        'tight': '1.4',
        'normal': '1.5',
        'relaxed': '1.6',
      },
      borderRadius: { xl: '1.5rem' },
      boxShadow: {
        'elevate-sm': '0 1px 2px rgba(0,0,0,0.05)',
        'elevate-md': '0 4px 6px rgba(0,0,0,0.1)',
        'elevate-lg': '0 10px 15px rgba(0,0,0,0.15)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite',
        'fade-in-out': 'fadeInOut 3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInOut: {
          '0%': { opacity: '0' },
          '15%': { opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
