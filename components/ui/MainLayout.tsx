import { useUser } from '@/lib/hooks/useUser';
import Layout from './Layout';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const PUBLIC_PATHS = ['/', '/login', '/register', '/terms', '/privacy'];

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, isError } = useUser();
  const router = useRouter();
  const isPublicPath = PUBLIC_PATHS.includes(router.pathname);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect if we're not already on a public path and haven't redirected yet
    if (!isLoading && !user && !isPublicPath && !hasRedirected) {
      setHasRedirected(true);
      router.push('/login');
    }
  }, [isLoading, user, router, isPublicPath, hasRedirected]);

  // Reset redirect flag when path changes
  useEffect(() => {
    setHasRedirected(false);
  }, [router.pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="text-sm text-neutral-600 dark:text-neutral-400 animate-pulse-subtle">
            Loading your workspace...
          </div>
        </div>
      </div>
    );
  }

  if (isPublicPath) {
    return <>{children}</>;
  }

  // If there's an authentication error and we're not on a public path, show error
  if (isError && !isPublicPath) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-lg font-semibold text-red-600 dark:text-red-400">
            Authentication Error
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Please try logging in again.
          </div>
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <Layout>
        {children}
      </Layout>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-sm text-neutral-600 dark:text-neutral-400 animate-pulse-subtle">
          Authenticating...
        </div>
      </div>
    </div>
  );
};

export default MainLayout;