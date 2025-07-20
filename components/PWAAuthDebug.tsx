import { useEffect, useState } from 'react';

interface AuthState {
  isPWA: boolean;
  hasServiceWorker: boolean;
  cookiesEnabled: boolean;
  userAgent: string;
  fetchCredentials: string;
}

export default function PWAAuthDebug() {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    const checkAuthState = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true ||
                   document.referrer.includes('android-app://');
      
      const hasServiceWorker = 'serviceWorker' in navigator;
      const cookiesEnabled = navigator.cookieEnabled;
      const userAgent = navigator.userAgent;
      
      // Test fetch credentials
      let fetchCredentials = 'unknown';
      try {
        const testUrl = '/api/auth/test';
        fetch(testUrl, { credentials: 'include' })
          .then(() => fetchCredentials = 'include works')
          .catch(() => fetchCredentials = 'include fails');
      } catch {
        fetchCredentials = 'fetch error';
      }

      setAuthState({
        isPWA,
        hasServiceWorker,
        cookiesEnabled,
        userAgent,
        fetchCredentials
      });
    };

    checkAuthState();
  }, []);

  // Only render in development
  if (process.env.NODE_ENV !== 'development' || !authState) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
      >
        PWA Debug
      </button>
      
      {isVisible && (
        <div className="absolute bottom-8 right-0 bg-black text-white p-4 rounded shadow-lg text-xs max-w-sm">
          <h3 className="font-bold mb-2">PWA Auth Debug</h3>
          <div className="space-y-1">
            <div>PWA Mode: <span className={authState.isPWA ? 'text-green-400' : 'text-red-400'}>
              {authState.isPWA ? 'Yes' : 'No'}
            </span></div>
            <div>Service Worker: <span className={authState.hasServiceWorker ? 'text-green-400' : 'text-red-400'}>
              {authState.hasServiceWorker ? 'Available' : 'Not Available'}
            </span></div>
            <div>Cookies: <span className={authState.cookiesEnabled ? 'text-green-400' : 'text-red-400'}>
              {authState.cookiesEnabled ? 'Enabled' : 'Disabled'}
            </span></div>
            <div>Fetch Test: <span className="text-yellow-400">{authState.fetchCredentials}</span></div>
            <div className="text-gray-400 text-xs mt-2">
              UA: {authState.userAgent.substring(0, 50)}...
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="mt-2 bg-red-500 text-white px-2 py-1 rounded text-xs"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}