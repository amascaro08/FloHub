import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUser() {
  const { data, error } = useSWR('/api/auth/session', fetcher);

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
  };
}