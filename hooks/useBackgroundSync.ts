import { useEffect, useRef } from 'react';

interface UseBackgroundSyncOptions {
  enabled?: boolean;
  intervalMinutes?: number;
  onSyncStart?: () => void;
  onSyncComplete?: () => void;
  onSyncError?: (error: Error) => void;
}

export function useBackgroundSync(options: UseBackgroundSyncOptions = {}) {
  const {
    enabled = true,
    intervalMinutes = 30,
    onSyncStart,
    onSyncComplete,
    onSyncError
  } = options;

  const lastSyncRef = useRef<number>(0);
  const syncInProgressRef = useRef<boolean>(false);

  const triggerBackgroundSync = async () => {
    if (syncInProgressRef.current) {
      return; // Sync already in progress
    }

    const now = Date.now();
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Check if enough time has passed since last sync
    if (now - lastSyncRef.current < intervalMs) {
      return;
    }

    try {
      syncInProgressRef.current = true;
      onSyncStart?.();

      // Call the background sync trigger endpoint
      const response = await fetch('/api/trigger-background-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      lastSyncRef.current = now;
      onSyncComplete?.();

    } catch (error) {
      console.warn('Background sync failed:', error);
      onSyncError?.(error instanceof Error ? error : new Error('Unknown sync error'));
    } finally {
      syncInProgressRef.current = false;
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Trigger initial sync after a short delay
    const initialSyncTimer = setTimeout(() => {
      triggerBackgroundSync();
    }, 5000);

    // Set up periodic sync on user activity
    const handleUserActivity = () => {
      triggerBackgroundSync();
    };

    // Listen for user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const throttledHandler = throttle(handleUserActivity, 30000); // Throttle to once per 30 seconds

    events.forEach(event => {
      document.addEventListener(event, throttledHandler, { passive: true });
    });

    // Also trigger on page visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerBackgroundSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialSyncTimer);
      events.forEach(event => {
        document.removeEventListener(event, throttledHandler);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMinutes]);

  return {
    triggerSync: triggerBackgroundSync,
    isInProgress: syncInProgressRef.current
  };
}

// Simple throttle utility
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}