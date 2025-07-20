import { useUser } from '@/lib/hooks/useUser';
import Layout from './Layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

const PUBLIC_PATHS = ['/', '/login', '/register', '/terms', '/privacy'];

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const isPublicPath = PUBLIC_PATHS.includes(router.pathname);

  useEffect(() => {
    if (!isLoading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [isLoading, user, router, isPublicPath]);

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