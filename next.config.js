const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@stackframe/stack', '@stackframe/stack-sc', '@stackframe/stack-ui', '@stackframe/js'],
  // Add transpilePackages to ensure @stackframe/stack is correctly processed
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
  webpack: (config, { isServer }) => {
    // Ensure resolve and alias objects exist
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};

    const alias = config.resolve.alias;

    if (isServer) {
        // This alias is required for @stackframe/stack-sc on the server
        alias['@stackframe/stack-sc/dist/next-static-analysis-workaround'] = require.resolve('next/headers');
    }
    
    if (!isServer) {
      // Don't resolve 'fs', 'dns' etc. module on the client
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        dns: false,
        net: false,
        tls: false,
        'pg-native': false, // Ignore pg-native module
      };
      // Add react aliases for client
      alias['react/jsx-runtime'] = require.resolve('react/jsx-runtime');
      alias['react/jsx-dev-runtime'] = require.resolve('react/jsx-dev-runtime');
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);