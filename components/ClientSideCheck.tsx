import { useSession } from 'next-auth/react';
import Layout from '@/components/ui/Layout';
import { NextPage } from 'next';

interface ClientSideCheckProps {
  Component: NextPage;
  pageProps: any;
  isLoading: boolean;
  showLayout: boolean;
}

const ClientSideCheck: React.FC<ClientSideCheckProps> = ({ Component, pageProps, isLoading, showLayout }) => {
  const { status } = useSession();
  console.log("ClientSideCheck status:", status);
  return (
    <>
      {status === "authenticated" ? (
        <Layout>
          {isLoading ? (
            console.log("Layout component rendered"),
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-pulse flex flex-col items-center">
                <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-16 w-16 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
            </div>
          ) : (
            <Component {...pageProps} />
          )}
        </Layout>
      ) : (
        <Component {...pageProps} />
      )}
    </>
  );
};

export default ClientSideCheck;