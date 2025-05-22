import '@/styles/globals.css'                   // ← must come first
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import Layout from '@/components/ui/Layout'
import { ChatProvider } from '@/components/assistant/ChatContext'
import { AuthProvider } from '@/components/ui/AuthContext'; // Import AuthProvider at the top
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { usePageViewTracking } from '@/lib/analyticsTracker';
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('../pages/index'), { ssr: false });

// Create a performance monitoring component
// Analytics and Performance Monitoring Component
const AnalyticsMonitor = () => {
  // Track page views
  usePageViewTracking();
  
  
  return null;
};

const ClientSideCheck = dynamic(
  () => import('../components/ClientSideCheck'),
  { ssr: false }
);

// Create a no-SSR version of the app for authenticated routes
const App = ({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session?: any }>) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Determine if we should show the layout based on the current route
  const showLayout = !router.pathname.includes('/login') && !router.pathname.includes('/register') && router.pathname !== '/';
  console.log("showLayout:", showLayout);
  // Handle route change loading states
  useEffect(() => {
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  // Register service worker for PWA
  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Check if running on iOS or Android
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
          const isAndroid = /Android/.test(navigator.userAgent);

          console.log('Registering service worker for platform:', {
            isIOS,
            isAndroid,
            userAgent: navigator.userAgent,
            production: process.env.NODE_ENV === 'production'
          });

          // Always register in development for testing, only in production otherwise
          if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
            // Use different registration options for iOS
            const registration = await navigator.serviceWorker.register('/sw.js', {
              // iOS Safari has issues with service worker scope, so we explicitly set it
              scope: '/',
              // Use update on reload for development to ensure latest service worker
              updateViaCache: process.env.NODE_ENV === 'development' ? 'none' : 'imports'
            });

            console.log('Service Worker registration successful with scope: ', registration.scope);

            // Force update for existing service workers
            if (registration.installing) {
              console.log('Service worker installing');
            } else if (registration.waiting) {
              console.log('Service worker installed and waiting');
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else if (registration.active) {
              console.log('Service worker active');
            }

            // Set up service worker update handling
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              console.log('Service worker controller changed');
            });

            // Listen for service worker messages
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data && event.data.type === 'CACHE_UPDATED') {
                console.log('New content is available; please refresh.');
                // You could show a notification to the user here
              }
            });
          }
        } catch (err) {
          console.error('Service Worker registration failed: ', err);
        }
      } else {
        console.warn('Service workers are not supported in this browser');
      }
    };

    // Register immediately instead of waiting for load event
    registerSW();

  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.unregister();
        console.log('Service worker unregistered');
      }).catch(error => {
        console.error('Service worker unregistration failed:', error);
      });
    }
  }, []);

  console.log("App component rendering");
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </Head>


      <SessionProvider session={session || null}>
        {/* Wrap Layout with AuthProvider and ChatProvider */}
        <AuthProvider>
          <ChatProvider>
            <ClientSideCheck 
              Component={Component}
              pageProps={pageProps}
              isLoading={isLoading}
              showLayout={showLayout}
            />
          </ChatProvider>
        </AuthProvider>
      </SessionProvider>
    </>
  );
};

console.log("App component loaded");

export default App;
