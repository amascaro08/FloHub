import type { NextConfig } from 'next';
import type { Configuration as WebpackConfig } from 'webpack';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Exclude specific files from precaching to avoid 404 errors
  buildExcludes: [/dynamic-css-manifest\.json$/]
});

const nextConfig = {
  eslint: {
    // 🚫 Don't block the build on lint errors
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/api/auth/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,DELETE,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },
  // Define environment variables that will be available at build time
  env: {
    // Default VAPID public key for development (should be replaced in production)
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  },
  webpack: (config: WebpackConfig, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      // Don't resolve 'fs', 'dns' module on the client to prevent this error
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...(config.resolve?.fallback || {}),
          fs: false,
          dns: false,
          net: false,
          tls: false,
        }
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
