import { useState, useEffect, useCallback } from 'react';

interface PWAUpdateState {
  updateAvailable: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
  currentVersion: string | null;
  newVersion: string | null;
}

export function usePWAUpdate() {
  const [state, setState] = useState<PWAUpdateState>({
    updateAvailable: false,
    isUpdating: false,
    registration: null,
    currentVersion: null,
    newVersion: null,
  });

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator && state.registration) {
      try {
        await state.registration.update();
        console.log('PWA: Checking for updates...');
      } catch (error) {
        console.error('PWA: Failed to check for updates:', error);
      }
    }
  }, [state.registration]);

  // Force update
  const forceUpdate = useCallback(async () => {
    if (!state.registration) return false;

    setState(prev => ({ ...prev, isUpdating: true }));

    try {
      // Send message to service worker to skip waiting
      if (state.registration.waiting) {
        state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Wait for the service worker to activate
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Reload the page to apply updates
      window.location.reload();
      return true;
    } catch (error) {
      console.error('PWA: Failed to force update:', error);
      setState(prev => ({ ...prev, isUpdating: false }));
      return false;
    }
  }, [state.registration]);

  // Dismiss update notification
  const dismissUpdate = useCallback(() => {
    setState(prev => ({ ...prev, updateAvailable: false }));
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setState(prev => ({ ...prev, registration }));

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                console.log('PWA: New version available');
                setState(prev => ({ 
                  ...prev, 
                  updateAvailable: true,
                  newVersion: new Date().toISOString() // Use timestamp as version indicator
                }));
              }
            });
          }
        });

        // Handle controller change (when new service worker takes over)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('PWA: Service worker controller changed - new version active');
          setState(prev => ({ 
            ...prev, 
            updateAvailable: false,
            currentVersion: new Date().toISOString()
          }));
        });

        // Check for updates on mount
        registration.update();
      });
    }
  }, []);

  // Auto-check for updates every 30 minutes
  useEffect(() => {
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    ...state,
    checkForUpdates,
    forceUpdate,
    dismissUpdate,
  };
}