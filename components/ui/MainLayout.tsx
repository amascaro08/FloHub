import { useUser } from '@/lib/hooks/useUser';
import Layout from './Layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

const PUBLIC_PATHS = ['/', '/login', '/register', '/terms', '/privacy', '/feedback'];

interface MainLayoutProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
}

const MainLayout = ({ children, requiresAuth = true }: MainLayoutProps) => {
  const router = useRouter();
  const isPublicPath = PUBLIC_PATHS.includes(router.pathname);
  
  // Only call useUser hook if authentication is required
  const { user, isLoading } = requiresAuth ? useUser() : { user: null, isLoading: false };

  useEffect(() => {
    if (requiresAuth && !isLoading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [requiresAuth, isLoading, user, router, isPublicPath]);

  if (isLoading && requiresAuth) {
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

  if (isPublicPath || !requiresAuth) {
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