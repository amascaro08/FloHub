/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 🚫 Don’t block the build on lint errors
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
