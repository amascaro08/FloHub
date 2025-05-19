import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '@/components/ui/Layout';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import Head from 'next/head';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === 'loading';

  // Check if user is authorized to access admin page
  useEffect(() => {
    if (!loading && (!session || session.user?.email !== 'amascaro08@gmail.com')) {
      router.push('/dashboard');
    }
  }, [session, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  // If not authorized, don't render anything (will redirect)
  if (!session || session.user?.email !== 'amascaro08@gmail.com') {
    return null;
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