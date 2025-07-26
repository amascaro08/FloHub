import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ChatProvider } from '@/components/assistant/ChatContext'
import { useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/ui/MainLayout';
import PageTransition from '@/components/ui/PageTransition';
import ProgressBar from '@/components/ui/ProgressBar';
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt';
import PWAStatus from '@/components/ui/PWAStatus';
import { useAuthPersistence } from '@/lib/hooks/useAuthPersistence';

const App = ({ Component, pageProps }: AppProps) => {
  // Check if the component requires authentication
  const requiresAuth = (Component as any).auth !== false;

  // Initialize auth persistence only for authenticated pages
  useAuthPersistence(requiresAuth);

  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Unregister any existing service workers first
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            console.log('Unregistering old service worker');
            await registration.unregister();
          }
          
          // Force clear all caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              console.log('Deleting cache:', cacheName);
              await caches.delete(cacheName);
            }
          }
          
          // Register new service worker
          const registration = await navigator.serviceWorker.register('/sw.js', { 
            scope: '/',
            updateViaCache: 'none' // Force update without cache
          });
          
          console.log('SW registered: ', registration);
          
          // Force immediate update
          if (registration.waiting) {
            console.log('Service worker waiting, activating immediately');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
          
          // Handle updates aggressively
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              console.log('New service worker found, forcing update');
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  console.log('New service worker installed, reloading immediately');
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              });
            }
          });
          
          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Received message from SW:', event.data);
            if (event.data.type === 'SW_UPDATED') {
              console.log('Service worker updated, reloading page');
              window.location.reload();
            }
          });
          
          // Check for updates every 30 seconds
          setInterval(() => {
            console.log('Checking for service worker updates');
            registration.update();
          }, 30000);
          
        } catch (err) {
          console.error('SW registration failed: ', err);
        }
      }
    };
    registerSW();
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FloHub" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </Head>
      <ChatProvider>
        <ProgressBar />
        <PageTransition>
          <MainLayout requiresAuth={requiresAuth}>
            <Component {...pageProps} />
          </MainLayout>
        </PageTransition>
        <PWAInstallPrompt />
        <PWAStatus />
      </ChatProvider>
    </>
  );
};

export default App
