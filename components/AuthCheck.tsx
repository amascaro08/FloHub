import { useUser } from '@/lib/hooks/useUser';

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // You can redirect to a login page here
    return <div>Please log in.</div>;
  }

  return <>{children}</>;
}