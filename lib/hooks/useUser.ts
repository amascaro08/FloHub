import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => {
  if (!res.ok) {
    throw new Error('Not authorized');
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