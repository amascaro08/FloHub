import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ChatProvider } from '@/components/assistant/ChatContext'
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '@/components/ui/MainLayout';
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt';
import PWAStatus from '@/components/ui/PWAStatus';

const App = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          console.log('SW registered: ', registration);
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, show update prompt
                  if (confirm('New version available! Reload to update?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
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
        <MainLayout>
          <Component {...pageProps} />
        </MainLayout>
        <PWAInstallPrompt />
        <PWAStatus />
      </ChatProvider>
    </>
  );
};

export default App
