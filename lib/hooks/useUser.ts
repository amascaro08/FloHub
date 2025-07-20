import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => {
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  return res.json();
});

export function useUser() {
  const { data, error, mutate } = useSWR('/api/auth/session', fetcher, {
    // Don't retry on 401 errors to prevent infinite loops
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      if (error.message === 'Not authorized' && retryCount < 1) {
        return;
      }
      // Retry other errors up to 3 times
      if (retryCount >= 3) return;
      setTimeout(() => revalidate({ retryCount }), 1000 * (retryCount + 1));
    },
    // Refresh every 5 minutes
    refreshInterval: 5 * 60 * 1000,
    // Don't refresh when tab is not visible
    refreshWhenHidden: false,
  });

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}