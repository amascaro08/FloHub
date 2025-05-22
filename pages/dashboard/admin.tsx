import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '@/components/ui/Layout';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import Head from 'next/head';

export default function AdminPage() {
  const { data: session, status } = useSession({ required: false });
  const router = useRouter();

  const isClient = typeof window !== 'undefined';

  // Handle loading state
  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  // Check if user is authorized to access admin page
  // This check runs after loading is complete
  const isAuthorized = status === 'authenticated' && session?.user?.email === 'amascaro08@gmail.com';

  useEffect(() => {
    // Redirect if not authorized after session is loaded
    if (!isAuthorized) {
      router.push('/dashboard');
    }
  }, [status, isAuthorized, router]);

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

  // If authorized, render the admin content
  return (
    <Layout>
      <Head>
        <title>Admin Dashboard | FlowHub</title>
      </Head>
      <AdminAnalytics />
    </Layout>
  );
}