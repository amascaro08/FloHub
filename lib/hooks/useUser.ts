import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    console.error(`Authentication failed (${res.status}):`, errorData);
    throw new Error(`Not authorized: ${errorData.error || res.statusText}`);
  }
  return res.json();
});

export function useUser() {
  const { data, error } = useSWR('/api/auth/session', fetcher);

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
  };
}