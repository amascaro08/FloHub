import { useUser } from '@/lib/hooks/useUser';
import Layout from './Layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

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
    return <div>Loading...</div>;
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

  return <div>Loading...</div>;
};

export default MainLayout;