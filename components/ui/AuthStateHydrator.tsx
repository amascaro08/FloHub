import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthPersistence } from '@/lib/hooks/useAuthPersistence';

interface AuthStateHydratorProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
}

export default function AuthStateHydrator({ children, requiresAuth = true }: AuthStateHydratorProps) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const { isAuthenticated, isPWA, refreshToken } = useAuthPersistence(requiresAuth);

  useEffect(() => {
    const hydrateAuthState = async () => {
      if (!requiresAuth) {
        setIsHydrated(true);
        return;
      }

      try {
        // Check if we have client-side auth state
        if (isAuthenticated) {
          console.log(`Auth hydration: User authenticated in ${isPWA ? 'PWA' : 'browser'} mode`);
          
          // Verify server-side session
          const sessionResponse = await fetch('/api/auth/session', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
            },
          });

          if (sessionResponse.ok) {
            console.log('Auth hydration: Server session valid');
            setIsHydrated(true);
          } else {
            console.log('Auth hydration: Server session invalid, attempting refresh');
            
            // Try to refresh token
            const refreshSuccess = await refreshToken(true);
            if (refreshSuccess) {
              console.log('Auth hydration: Token refresh successful');
              setIsHydrated(true);
            } else {
              console.log('Auth hydration: Token refresh failed, redirecting to login');
              router.push('/login');
            }
          }
        } else {
          // No client-side auth state, check if we have server cookies
          const sessionResponse = await fetch('/api/auth/session', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
            },
          });

          if (sessionResponse.ok) {
            console.log('Auth hydration: Found valid server session without client state');
            // Server has valid session, update client state
            await refreshToken(true);
            setIsHydrated(true);
          } else {
            console.log('Auth hydration: No valid authentication found');
            // No authentication found, redirect to login for protected pages
            const isPublicPage = ['/', '/login', '/register', '/privacy', '/terms', '/feedback']
              .some(path => router.pathname === path || router.pathname.startsWith(path + '/'));
            
            if (!isPublicPage) {
              router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
            } else {
              setIsHydrated(true);
            }
          }
        }
      } catch (error) {
        console.error('Auth hydration error:', error);
        
        // Handle offline PWA scenarios
        if (isPWA && !navigator.onLine && isAuthenticated) {
          console.log('Auth hydration: Offline PWA with stored auth state, allowing access');
          setIsHydrated(true);
        } else {
          // For other errors, redirect to login for protected pages
          const isPublicPage = ['/', '/login', '/register', '/privacy', '/terms', '/feedback']
            .some(path => router.pathname === path || router.pathname.startsWith(path + '/'));
          
          if (!isPublicPage) {
            router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
          } else {
            setIsHydrated(true);
          }
        }
      }
    };

    // Only hydrate once
    if (!isHydrated) {
      hydrateAuthState();
    }
  }, [isAuthenticated, isPWA, requiresAuth, isHydrated, router, refreshToken]);

  // Show loading screen while hydrating authentication state
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {isPWA ? 'Starting PWA...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}