import '@/styles/globals.css'                   // ← must come first
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import Layout from '@/components/ui/Layout'
import { ChatProvider } from '@/components/assistant/ChatContext'

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session?: any }>) {
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

import { AuthProvider } from '@/components/ui/AuthContext'; // Import AuthProvider
