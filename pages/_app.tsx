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
          console.log('Force clearing all caches before registering SW...');
          
          // Force clear all caches first
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              console.log('Deleting cache:', cacheName);
              await caches.delete(cacheName);
            }
          }
          
          // Unregister all existing service workers
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            console.log('Unregistering existing service worker');
            await registration.unregister();
          }
          
          console.log('Registering new disabled service worker...');
          const registration = await navigator.serviceWorker.register('/sw.js', { 
            scope: '/',
            updateViaCache: 'none'
          });
          
          console.log('SW registered successfully:', registration);
          
          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Received message from SW:', event.data);
            if (event.data.type === 'SW_DISABLED') {
              console.log('Service worker disabled successfully');
              // Force reload to ensure clean state
              setTimeout(() => {
                console.log('Reloading page to clear any cached issues...');
                window.location.reload();
              }, 1000);
            }
          });
          
          // Force immediate activation if there's a waiting service worker
          if (registration.waiting) {
            console.log('Service worker waiting, activating immediately');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              console.log('New service worker found');
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  console.log('New service worker installed, activating');
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
          
        } catch (err) {
          console.error('SW registration failed:', err);
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
