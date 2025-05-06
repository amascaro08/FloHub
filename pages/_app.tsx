import '@/styles/globals.css'                   // ← must come first
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import Layout from '@/components/ui/Layout'

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session?: any }>) {
  return (
    <SessionProvider session={session}>
      {/* Wrap Layout with AuthProvider */}
      <AuthProvider>
        <Layout>
          <Component {...pageProps}/>
        </Layout>
      </AuthProvider>
    </SessionProvider>
  )
}

import { AuthProvider } from '@/components/ui/AuthContext'; // Import AuthProvider

// Register service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service worker registered: ', registration);
      })
      .catch((error) => {
        console.log('Service worker registration failed: ', error);
      });
  });
}
