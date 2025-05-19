import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '@/components/ui/Layout';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import Head from 'next/head';

export default function AdminPage() {
  const { data: session, status } = useSession({ required: false });
  const router = useRouter();

  if (!session) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  const isClient = typeof window !== 'undefined';

  // Check if user is authorized to access admin page
  useEffect(() => {
    if (isClient && (!session || !session.user?.email || session.user.email !== 'amascaro08@gmail.com')) {
      router.push('/dashboard');
    }
  }, [session, router, isClient]);

  // Only check authorization on the client side
  // For SSR, we'll show a loading state and let the client-side effect handle redirection
  const isAuthorized = !isClient || (session?.user?.email === 'amascaro08@gmail.com');

  // Show loading state while checking authentication
  if (!session && !isClient) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  // If not authorized, show a message (will redirect via useEffect)
  if (!isAuthorized) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">Unauthorized Access</h1>
            <p>You don't have permission to view this page.</p>
            <p>Redirecting to dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Admin Dashboard | FlowHub</title>
      </Head>
      <AdminAnalytics />
    </Layout>
  );
}