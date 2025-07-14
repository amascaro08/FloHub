import '@/styles/globals.css' // must come first
import type { AppProps } from 'next/app'
import Layout from '@/components/ui/Layout'
import { ChatProvider } from '@/components/assistant/ChatContext'
import { AuthProvider } from '@/components/ui/AuthContext'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { usePageViewTracking } from '@/lib/analyticsTracker'
import dynamic from 'next/dynamic'
import { StackClientApp, StackProvider } from '@stackframe/react'

const DynamicComponent = dynamic(() => import('../pages/index'), { ssr: false })

const AnalyticsMonitor = () => {
  usePageViewTracking()
  return null
}

const ClientSideCheck = dynamic(
  () => import('../components/ClientSideCheck'),
  { ssr: false }
)

// Create a StackClientApp instance
const stackClientApp = new StackClientApp({
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID as string,
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY as string,
  tokenStore: 'cookie',
})

const App = ({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session?: any }>) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Determine if we should show the layout based on the current route
  const showLayout =
    !router.pathname.includes('/login') &&
    !router.pathname.includes('/register') &&
    router.pathname !== '/'

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

  // Service Worker for PWA (optional—remove if not needed)
  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: process.env.NODE_ENV === 'development' ? 'none' : 'imports',
          })
          // Optional: handle registration state...
        } catch (err) {
          console.error('Service Worker registration failed: ', err)
        }
      }
    }
    registerSW()
  }, [])

  // Optional: Unregister service worker (if you want to remove all SWs for debugging)
  // useEffect(() => {
  //   if ('serviceWorker' in navigator) {
  //     navigator.serviceWorker.ready.then(registration => {
  //       registration.unregister()
  //       console.log('Service worker unregistered')
  //     }).catch(error => {
  //       console.error('Service worker unregistration failed:', error)
  //     })
  //   }
  // }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </Head>

      <StackProvider app={stackClientApp}>
        <AuthProvider>
          <ChatProvider>
            <ClientSideCheck
              Component={Component}
              pageProps={pageProps}
              isLoading={isLoading}
              showLayout={showLayout}
            />
          </ChatProvider>
        </AuthProvider>
      </StackProvider>
    </>
  )
}

export default App
