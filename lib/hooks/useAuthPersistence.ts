import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

export function useAuthPersistence(enabled: boolean = true) {
  const router = useRouter();

  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        // If refresh fails, redirect to login
        console.warn('Token refresh failed, redirecting to login');
        router.push('/login');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Temporarily comment out redirect to test
      // router.push('/login');
      return false;
    }
  }, [router]);

  useEffect(() => {
    if (!enabled) {
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

    // Temporarily disable immediate refresh to test
    // Initial refresh check
    // refreshToken().then(success => {
    //   if (success) lastRefreshTime = Date.now();
    // });

    return () => {
      clearInterval(refreshInterval);
      clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [refreshToken, enabled]);

  return { refreshToken };
}