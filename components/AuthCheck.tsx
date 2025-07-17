import { useUser } from '@/lib/hooks/useUser';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

// Define public paths that should not trigger an auth check.
const PUBLIC_PATHS = ['/', '/login', '/register', '/terms', '/privacy'];

// This component now receives an 'auth' prop to decide its behavior.
function AuthCheck({ children, auth }: { children: React.ReactNode; auth: boolean }) {
  // If the page does not require authentication, render it directly.
  if (!auth) {
    return <>{children}</>;
  }

  // If the page requires authentication, use the ProtectedRoute component.
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    // You can render a loading spinner or a blank page here.
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}

export default AuthCheck;