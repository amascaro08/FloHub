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
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registration successful with scope: ', registration.scope);
        } catch (err) {
          console.log('Service Worker registration failed: ', err);
        }
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
