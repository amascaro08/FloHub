import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ChatProvider } from '@/components/assistant/ChatContext'
import { useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/ui/MainLayout';
import PageTransition from '@/components/ui/PageTransition';
import ProgressBar from '@/components/ui/ProgressBar';
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt';
import PWAUpdateManager from '@/components/ui/PWAUpdateManager';
import AuthStateHydrator from '@/components/ui/AuthStateHydrator';
import PWAReinstallationHandler from '@/components/ui/PWAReinstallationHandler';
import { useAuthPersistence } from '@/lib/hooks/useAuthPersistence';

const App = ({ Component, pageProps }: AppProps) => {
  // Check if the component requires authentication
  const requiresAuth = (Component as any).auth !== false;

  useEffect(() => {
    // Register service worker for push notifications and PWA functionality
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          console.log('Registering service worker...');
          const registration = await navigator.serviceWorker.register('/sw.js', { 
            scope: '/',
            updateViaCache: 'none' // Ensure fresh service worker loading
          });
          console.log('SW registered successfully: ', registration);
          
          // Check for updates on page load
          registration.update();
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available - the PWAUpdateManager will handle the UI
                  console.log('New service worker installed and ready');
                }
              });
            }
          });

          // Handle controller change (when new service worker takes over)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service worker controller changed - new version active');
          });
        } catch (err) {
          console.error('SW registration failed: ', err);
        }
      } else {
        console.warn('Service workers not supported in this browser');
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
        <PWAReinstallationHandler>
          <AuthStateHydrator requiresAuth={requiresAuth}>
            <PageTransition>
              <MainLayout requiresAuth={requiresAuth}>
                <Component {...pageProps} />
              </MainLayout>
            </PageTransition>
          </AuthStateHydrator>
        </PWAReinstallationHandler>
        <PWAInstallPrompt />
        <PWAUpdateManager />
      </ChatProvider>
    </>
  );
};

export default App
