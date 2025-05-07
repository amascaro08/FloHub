/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

const nextConfig = {
  eslint: {
    // 🚫 Don't block the build on lint errors
    ignoreDuringBuilds: true,
  },
};

module.exports = withPWA(nextConfig);
