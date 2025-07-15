import { useUser } from '@stackframe/react'

export default function ClientSideCheck({ Component, pageProps, isLoading }: any) {
  const user = useUser()

  // Redirect or render based on user auth state, e.g.:
  if (isLoading) return <div>Loading...</div>
  // You can adjust this to fit your actual logic
  return <Component {...pageProps} />
}
