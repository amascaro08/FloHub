import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

export function useAuthPersistence() {
  const router = useRouter();

  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        // If refresh fails, only redirect to login if we're not already on a public page
        const publicPaths = ['/', '/login', '/register', '/terms', '/privacy'];
        if (!publicPaths.includes(router.pathname)) {
          router.push('/login');
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Only redirect if not on a public page
      const publicPaths = ['/', '/login', '/register', '/terms', '/privacy'];
      if (!publicPaths.includes(router.pathname)) {
        router.push('/login');
      }
      return false;
    }
  }, [router]);

  useEffect(() => {
    // Only set up auth persistence if we're not on a public page
    const publicPaths = ['/', '/login', '/register', '/terms', '/privacy'];
    if (publicPaths.includes(router.pathname)) {
      return;
    }

    // Refresh token every 12 hours for better persistence
    const refreshInterval = setInterval(refreshToken, 12 * 60 * 60 * 1000);

    // Also refresh token when user becomes active after being idle
    let activityTimeout: NodeJS.Timeout;
    let lastRefreshTime = 0;
    
    const handleUserActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        // Only refresh if it's been more than 1 hour since last refresh
        const now = Date.now();
        if (now - lastRefreshTime > 60 * 60 * 1000) {
          refreshToken().then(success => {
            if (success) lastRefreshTime = now;
          });
        }
      }, 10 * 60 * 1000); // Wait 10 minutes of inactivity
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'focus'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Initial refresh check
    refreshToken().then(success => {
      if (success) lastRefreshTime = Date.now();
    });

    return () => {
      clearInterval(refreshInterval);
      clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [refreshToken, router.pathname]);

  return { refreshToken };
}