import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ChatProvider } from '@/components/assistant/ChatContext'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import AuthCheck from '@/components/AuthCheck';


// Define a type for pages that may have an 'auth' property.
type ComponentWithAuth = AppProps['Component'] & { auth?: boolean };

const App = ({
  Component,
  pageProps,
}: AppProps) => {
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

  // Service Worker registration (optional)
  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        } catch (err) {
          // Silent fail
        }
      }
    };
    registerSW();
  }, []);

  // Cast Component to our new type to access the 'auth' property.
  const AuthedComponent = Component as ComponentWithAuth;

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </Head>
      <ChatProvider>
        {/* Pass the 'auth' property to AuthCheck, defaulting to true for protection. */}
        <AuthCheck auth={AuthedComponent.auth ?? true}>
          <Component {...pageProps} />
        </AuthCheck>
      </ChatProvider>
    </>
  );
};

export default App
