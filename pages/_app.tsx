import '@/styles/globals.css'                   // ← must come first
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import Layout from '@/components/ui/Layout'
import { ChatProvider } from '@/components/assistant/ChatContext'
import { AuthProvider } from '@/components/ui/AuthContext'; // Import AuthProvider at the top
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

// Create a performance monitoring component
const PerformanceMonitor = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window && 'PerformanceObserver' in window) {
      // Monitor First Input Delay (FID)
      const fidObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          // Need to cast to any because TypeScript doesn't know about these properties
          const fidEntry = entry as any;
          const delay = fidEntry.processingStart - fidEntry.startTime;
          console.log(`[Performance] First Input Delay: ${Math.round(delay)}ms`);
        }
      });
      
      fidObserver.observe({ type: 'first-input', buffered: true });
      
      // Monitor Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`[Performance] Largest Contentful Paint: ${Math.round(lastEntry.startTime)}ms`);
      });
      
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      
      // Monitor Cumulative Layout Shift (CLS)
      let clsValue = 0;
      let clsEntries: any[] = [];
      
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          // Need to cast to any because TypeScript doesn't know about these properties
          const layoutShiftEntry = entry as any;
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
            clsEntries.push(layoutShiftEntry);
          }
        }
        console.log(`[Performance] Cumulative Layout Shift: ${clsValue.toFixed(3)}`);
      });
      
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      
      return () => {
        fidObserver.disconnect();
        lcpObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, []);
  
  return null;
};

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session?: any }>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
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
    
    // Set up performance monitoring
    if (typeof window !== 'undefined') {
      // Mark navigation start
      performance.mark('app-init');
      
      // Measure time to first render
      window.addEventListener('load', () => {
        performance.mark('app-loaded');
        performance.measure('app-startup', 'app-init', 'app-loaded');
        
        const startupTime = performance.getEntriesByName('app-startup')[0].duration;
        console.log(`[Performance] App startup time: ${Math.round(startupTime)}ms`);
      });
    }
  }, []);
  
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </Head>
      
      {/* Performance monitoring component */}
      <PerformanceMonitor />
      
      <SessionProvider session={session}>
        {/* Wrap Layout with AuthProvider and ChatProvider */}
        <AuthProvider>
          <ChatProvider>
            <Layout>
              {isLoading ? (
                <div className="flex items-center justify-center min-h-screen">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-16 w-16 mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              ) : (
                <Component {...pageProps}/>
              )}
            </Layout>
          </ChatProvider>
        </AuthProvider>
      </SessionProvider>
    </>
  )
}
