import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/router';

interface AuthState {
  isAuthenticated: boolean;
  lastRefresh: number;
  rememberMe: boolean;
  deviceId?: string;
  pwaInstallTime?: number;
}

const AUTH_STATE_KEY = 'flohub_auth_state';
const DEVICE_ID_KEY = 'flohub_device_id';
const PWA_INSTALL_TIME_KEY = 'flohub_pwa_install_time';

// Extended intervals for better persistence
const PWA_TOKEN_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours for PWA
const BROWSER_TOKEN_REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days for browser

// Generate a unique device ID for PWA persistence
function generateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Get PWA installation time
function getPWAInstallTime(): number {
  if (typeof window === 'undefined') return 0;
  
  let installTime = localStorage.getItem(PWA_INSTALL_TIME_KEY);
  if (!installTime) {
    installTime = Date.now().toString();
    localStorage.setItem(PWA_INSTALL_TIME_KEY, installTime);
  }
  return parseInt(installTime);
}

// Detect if app is running as PWA
function isPWAMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://') ||
    window.location.search.includes('pwa=true')
  );
}

// Check if this is a PWA reinstallation
function isPWAReinstallation(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isPWA = isPWAMode();
  if (!isPWA) return false;
  
  const storedInstallTime = localStorage.getItem(PWA_INSTALL_TIME_KEY);
  const currentInstallTime = getPWAInstallTime();
  
  // If we have a stored install time that's different from current, it's a reinstallation
  return storedInstallTime && parseInt(storedInstallTime) !== currentInstallTime;
}

// Get stored auth state
function getStoredAuthState(): AuthState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(AUTH_STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Store auth state
function storeAuthState(state: AuthState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to store auth state:', error);
  }
}

// Clear auth state
function clearAuthState(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(AUTH_STATE_KEY);
  } catch (error) {
    console.warn('Failed to clear auth state:', error);
  }
}

export function useAuthPersistence(enabled: boolean = true) {
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [authState, setAuthState] = useState<AuthState | null>(null);

  const refreshToken = useCallback(async (force: boolean = false) => {
    try {
      const storedState = getStoredAuthState();
      const now = Date.now();
      
      // Skip if recently refreshed and not forced
      if (!force && storedState && (now - storedState.lastRefresh) < 60000) {
        return true;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        console.warn('Token refresh failed, clearing auth state');
        clearAuthState();
        setAuthState(null);
        
        // Only redirect if we're not on a public page
        const isPublicPage = ['/', '/login', '/register', '/privacy', '/terms', '/feedback']
          .some(path => router.pathname === path || router.pathname.startsWith(path + '/'));
        
        if (!isPublicPage) {
          router.push('/login');
        }
        return false;
      }

      // Update auth state on successful refresh
      const newAuthState: AuthState = {
        isAuthenticated: true,
        lastRefresh: now,
        rememberMe: storedState?.rememberMe ?? true,
        deviceId: generateDeviceId(),
        pwaInstallTime: getPWAInstallTime(),
      };
      
      storeAuthState(newAuthState);
      setAuthState(newAuthState);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Handle offline scenarios for PWA
      if (isPWAMode() && navigator.onLine === false) {
        console.info('Offline in PWA mode, keeping auth state');
        return true; // Don't clear auth state when offline in PWA
      }
      
      clearAuthState();
      setAuthState(null);
      return false;
    }
  }, [router]);

  // Initialize auth state on mount
  useEffect(() => {
    if (!enabled || isInitialized) return;

    const storedState = getStoredAuthState();
    const isPWA = isPWAMode();
    const isReinstallation = isPWAReinstallation();
    
    if (storedState) {
      // Check if this is a PWA reinstallation
      if (isReinstallation) {
        console.log('PWA reinstallation detected, clearing old auth state');
        clearAuthState();
        setAuthState(null);
        setIsInitialized(true);
        return;
      }
      
      setAuthState(storedState);
      
      // Check if token needs refresh
      const now = Date.now();
      const timeSinceRefresh = now - storedState.lastRefresh;
      const refreshInterval = isPWA ? PWA_TOKEN_REFRESH_INTERVAL : BROWSER_TOKEN_REFRESH_INTERVAL;
      
      if (timeSinceRefresh > refreshInterval) {
        refreshToken(true);
      }
    }
    
    setIsInitialized(true);
  }, [enabled, isInitialized, refreshToken]);

  useEffect(() => {
    if (!enabled || !isInitialized) return;

    const isPWA = isPWAMode();
    const refreshInterval = isPWA ? PWA_TOKEN_REFRESH_INTERVAL : BROWSER_TOKEN_REFRESH_INTERVAL;

    // Regular token refresh interval
    const refreshIntervalId = setInterval(() => {
      refreshToken();
    }, refreshInterval);

    // Activity-based refresh for better user experience
    let activityTimeout: NodeJS.Timeout;
    let lastActivityTime = Date.now();
    
    const handleUserActivity = () => {
      const now = Date.now();
      lastActivityTime = now;
      
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        const storedState = getStoredAuthState();
        if (storedState && (now - storedState.lastRefresh) > (60 * 60 * 1000)) { // 1 hour of inactivity
          refreshToken();
        }
      }, 60 * 60 * 1000); // Wait 1 hour of inactivity
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'focus', 'visibilitychange'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Handle online/offline events for PWA
    const handleOnline = () => {
      if (isPWA) {
        console.info('PWA back online, refreshing token');
        refreshToken(true);
      }
    };

    const handleOffline = () => {
      if (isPWA) {
        console.info('PWA went offline, maintaining auth state');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // PWA-specific: handle app focus/blur
    const handleVisibilityChange = () => {
      if (isPWA && !document.hidden) {
        const storedState = getStoredAuthState();
        if (storedState && (Date.now() - storedState.lastRefresh) > (12 * 60 * 60 * 1000)) { // 12 hours
          refreshToken();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshIntervalId);
      clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshToken, enabled, isInitialized]);

  // Mark user as authenticated when they successfully login
  const markAuthenticated = useCallback((rememberMe: boolean = true) => {
    const newAuthState: AuthState = {
      isAuthenticated: true,
      lastRefresh: Date.now(),
      rememberMe,
      deviceId: generateDeviceId(),
      pwaInstallTime: getPWAInstallTime(),
    };
    
    storeAuthState(newAuthState);
    setAuthState(newAuthState);
  }, []);

  // Clear authentication state
  const clearAuthentication = useCallback(() => {
    clearAuthState();
    setAuthState(null);
  }, []);

  return { 
    refreshToken, 
    markAuthenticated, 
    clearAuthentication, 
    isAuthenticated: authState?.isAuthenticated ?? false,
    isPWA: isPWAMode(),
    isPWAReinstallation: isPWAReinstallation()
  };
}