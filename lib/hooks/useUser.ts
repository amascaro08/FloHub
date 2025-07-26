import useSWR from 'swr';
import { useRef, useCallback } from 'react';

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

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    mutate: revalidate, // Use our wrapped revalidation function
  };
}