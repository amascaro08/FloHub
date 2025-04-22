import '@/styles/globals.css'                   // ← must come first
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import Layout from '@/components/ui/Layout'

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session?: any }>) {
  return (
    <SessionProvider session={session}>
      <Layout>
        <Component {...pageProps}/>
      </Layout>
    </SessionProvider>
  )
}
