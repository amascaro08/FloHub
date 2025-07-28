import useSWR from 'swr';
import { useRef, useCallback } from 'react';
import { clearUserData } from '@/lib/auth';

const fetcher = async (url: string) => {
  const response = await fetch(url, { 
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-cache',
    }
  });
  
  if (!response.ok) {
    // Only throw authentication error for 401, not for other network issues
    if (response.status === 401) {
      throw new Error('Not authorized');
    }
    // For other errors, log but don't throw to prevent loops
    console.warn('Session fetch error:', response.status, response.statusText);
    return null;
  }
  
  const data = await response.json();
  return data;
};

export function useUser() {
  const retryCountRef = useRef(0);
  const maxRetries = 2;
  
  const { data, error, mutate } = useSWR('/api/auth/session', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    revalidateOnMount: true,
    errorRetryCount: maxRetries,
    errorRetryInterval: 2000, // 2 second intervals
    dedupingInterval: 5000, // Dedupe requests for 5 seconds
    shouldRetryOnError: (error) => {
      // Only retry on network errors, not authentication errors
      if (error?.message?.includes('Not authorized')) {
        return false;
      }
      
      // Increment retry count and stop after max retries
      retryCountRef.current += 1;
      if (retryCountRef.current >= maxRetries) {
        retryCountRef.current = 0; // Reset for next time
        return false;
      }
      
      return true;
    },
    onError: (error) => {
      // Reset retry count on error
      retryCountRef.current = 0;
      
      // Log errors for debugging
      if (error?.message?.includes('Not authorized')) {
        console.info('User not authenticated');
      } else {
        console.warn('User session error:', error?.message || error);
      }
    },
    onSuccess: (data) => {
      // Reset retry count on success
      retryCountRef.current = 0;
      
      if (data) {
        console.info('User session loaded successfully');
      }
    }
  });

  // Manual revalidation with error handling
  const revalidate = useCallback(async () => {
    try {
      await mutate();
    } catch (error) {
      console.warn('Manual revalidation failed:', error);
    }
  }, [mutate]);

  // Comprehensive logout function with cache cleanup
  const logout = useCallback(async () => {
    try {
      console.log('🚪 Starting logout process...');
      
      // Get current user email before logout
      const currentUserEmail = data?.primaryEmail || data?.email;
      
      // Call logout API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        const userEmailFromLogout = result.userEmail || currentUserEmail;
        
        // Clear user-specific data if we have the email
        if (userEmailFromLogout && result.clearCache) {
          console.log('🧹 Clearing user data for:', userEmailFromLogout);
          await clearUserData(userEmailFromLogout);
        }
        
        // Clear SWR cache
        await mutate(null, false);
        
        console.log('✅ Logout completed successfully');
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Even if logout API fails, clear local data and redirect
      const userEmail = data?.primaryEmail || data?.email;
      if (userEmail) {
        await clearUserData(userEmail);
      }
      
      // Clear SWR cache
      await mutate(null, false);
      
      // Force redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [data, mutate]);

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    mutate: revalidate, // Use our wrapped revalidation function
    logout, // Add logout function
  };
}