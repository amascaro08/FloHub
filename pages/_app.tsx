import '@/styles/globals.css'                   // ← must come first
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import Layout from '@/components/ui/Layout'
import { ChatProvider } from '@/components/assistant/ChatContext'
import { AuthProvider } from '@/components/ui/AuthContext'; // Import AuthProvider at the top
import { useEffect } from 'react'

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session?: any }>) {
  
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
  
  return (
    <SessionProvider session={session}>
      {/* Wrap Layout with AuthProvider and ChatProvider */}
      <AuthProvider>
        <ChatProvider>
          <Layout>
            <Component {...pageProps}/>
          </Layout>
        </ChatProvider>
      </AuthProvider>
    </SessionProvider>
  )
}
