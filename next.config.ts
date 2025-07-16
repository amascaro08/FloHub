import type { NextConfig } from 'next';
import type { Configuration as WebpackConfig } from 'webpack';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/dynamic-css-manifest\.json$/],
  // Log NODE_ENV for debugging PWA
  // console.log('PWA disabled in development:', process.env.NODE_ENV === 'development');
  // Configure caching for workbox files
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'https-calls',
        networkTimeoutSeconds: 15,
      },
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
      },
    },
    {
      urlPattern: /^https:\/\/flohub\.vercel\.app\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'vercel-resources',
        networkTimeoutSeconds: 10,
      },
    }
  ],
  // Ensure workbox files are served from the correct location
  swDest: 'public/sw.js',
  fallbacks: {
    document: '/offline.html'
  },
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  // Add additional security headers
  additionalManifestEntries: [
    { url: '/offline.html', revision: '1' }
  ],
});

const nextConfig = {
  // Add transpilePackages to ensure @stackframe/stack is correctly processed
  transpilePackages: ['@stackframe/stack', '@stackframe/stack-sc', '@stackframe/stack-ui', 'react', 'react-dom'],
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
          'pg-native': false, // Ignore pg-native module
        },
        alias: {
          ...(config.resolve?.alias || {}),
          '@stackframe/stack-sc/dist/next-static-analysis-workaround': require.resolve('next/headers'),
          'react': require.resolve('react'),
          'react-dom': require.resolve('react-dom'),
          'react/jsx-runtime': require.resolve('react/jsx-runtime'),
        }
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
