import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ChatProvider } from '@/components/assistant/ChatContext'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

const ClientStackProvider = dynamic(
  () => import('../components/ClientStackProvider'),
  { ssr: false }
)

const ClientSideCheck = dynamic(
  () => import('../components/ClientSideCheck'),
  { ssr: false }
)


const App = ({
  Component,
  pageProps: { user, ...pageProps },
}: AppProps<{ user?: any }>) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const handleStart = () => setIsLoading(true)
    const handleComplete = () => setIsLoading(false)

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleComplete)
    router.events.on('routeChangeError', handleComplete)

    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleComplete)
      router.events.off('routeChangeError', handleComplete)
    }
  }, [router])

  // Service Worker registration (optional)
  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        } catch (err) {
          // Silent fail
        }
      }
    }
    registerSW()
  }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </Head>
      <ClientStackProvider>
        <ChatProvider>
          <ClientSideCheck
            Component={Component}
            pageProps={pageProps}
            isLoading={isLoading}
          />
        </ChatProvider>
      </ClientStackProvider>
    </>
  )
}

export default App
