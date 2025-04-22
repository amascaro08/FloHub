// pages/_app.tsx

import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Layout from '@/components/ui/Layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}
