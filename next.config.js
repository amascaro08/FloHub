const withPWA = require('next-pwa')({
  dest: 'public',
  register: false, // Disable service worker registration
  skipWaiting: false,
  disable: true, // Disable PWA completely to fix loading issues
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      urlPattern: /\/api\/auth\/refresh/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'auth-refresh',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/api\/auth\/(?!refresh).*/i,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'auth-api',
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              // Don't cache failed auth responses
              return response.status === 200 ? response : null;
            },
            fetchDidFail: async ({ originalRequest, error }) => {
              console.error('Auth API fetch failed:', error);
              // For PWA, try to handle auth failures gracefully
              if (originalRequest.url.includes('/login')) {
                throw error; // Re-throw login errors to show proper error message
              }
            }
          }
        ]
      }
    },
    {
      urlPattern: /\/api\/(?!auth).*/i,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'api-calls',
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              // Don't cache any API responses except 200s
              return response.status === 200 ? response : null;
            }
          }
        ]
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@stackframe/stack', '@stackframe/stack-sc', '@stackframe/stack-ui', '@stackframe/js'],
  // Add transpilePackages to ensure @stackframe/stack is correctly processed
  eslint: {
    // 🚫 Don't block the build on lint errors
    ignoreDuringBuilds: true,
  },
  // Enable better error reporting in development
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  // Better error boundary handling
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,DELETE,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie" },
        ],
      },
      // SECURITY FIX: Add security headers for all routes
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { 
            key: "Content-Security-Policy", 
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.openai.com https://*.googleapis.com https://*.vercel.app;"
          },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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