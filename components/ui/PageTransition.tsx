import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingSpinner from './LoadingSpinner';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState(0);

  useEffect(() => {
    const handleStart = () => {
      setIsLoading(true);
      setLoadingKey(prev => prev + 1);
    };

    const handleComplete = () => {
      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    };

    const handleError = () => {
      setIsLoading(false);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleError);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleError);
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[var(--bg)] z-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="text-sm text-neutral-600 dark:text-neutral-400 animate-pulse">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {children}
    </div>
  );
};

export default PageTransition;