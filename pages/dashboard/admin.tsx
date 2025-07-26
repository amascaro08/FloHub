import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import UserManagement from '@/components/admin/UserManagement';
import Head from 'next/head';
import { Users, BarChart3 } from 'lucide-react';

export default function AdminPage() {
const { user, isLoading } = useUser();
const status = user ? "authenticated" : "unauthenticated";
const [activeTab, setActiveTab] = useState<'users' | 'analytics'>('users');

  const router = useRouter();

  const isClient = typeof window !== 'undefined';

  // Handle loading state
  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Check if user is authorized to access admin page
  // This check runs after loading is complete
  const isAuthorized = status === 'authenticated' && user?.primaryEmail === 'amascaro08@gmail.com';

  useEffect(() => {
    // Redirect if not authorized after user is loaded
    if (!isAuthorized) {
      router.push('/dashboard');
    }
  }, [status, isAuthorized, router]);

  // If not authorized, show a message (will redirect via useEffect)
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Unauthorized Access</h1>
          <p>You don't have permission to view this page.</p>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // If authorized, render the admin content
  return (
    <>
      <Head>
        <title>Admin Dashboard | FlowHub</title>
      </Head>
      
      {/* Tab Navigation */}
      <div className="mb-6 p-4">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Admin Dashboard
        </h1>
        <div className="border-b border-gray-200 dark:border-gray-600">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === 'users' ? <UserManagement /> : <AdminAnalytics />}
      </div>
    </>
  );
}