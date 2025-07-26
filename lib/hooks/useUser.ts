import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { 
  credentials: 'include',
  headers: {
    'Cache-Control': 'no-cache',
  }
}).then((res) => {
  if (!res.ok) {
    // Only throw authentication error for 401, not for other network issues
    if (res.status === 401) {
      throw new Error('Not authorized');
    }
    // For other errors, log but don't throw
    console.warn('Session fetch error:', res.status);
    return null;
  }
  return res.json();
});

export function useUser() {
  const { data, error, mutate } = useSWR('/api/auth/session', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    errorRetryCount: 2,
    errorRetryInterval: 5000,
    shouldRetryOnError: (error) => {
      // Only retry on network errors, not authentication errors
      return !error?.message?.includes('Not authorized');
    }
  });

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    mutate, // Allow manual revalidation
  };
}