import { useEffect, useState } from 'react';
import { useAuthPersistence } from '@/lib/hooks/useAuthPersistence';

interface PWAReinstallationHandlerProps {
  children: React.ReactNode;
}

export default function PWAReinstallationHandler({ children }: PWAReinstallationHandlerProps) {
  const { isPWA, isPWAReinstallation } = useAuthPersistence();
  const [showReinstallMessage, setShowReinstallMessage] = useState(false);

  useEffect(() => {
    if (isPWA && isPWAReinstallation) {
      console.log('PWA reinstallation detected');
      setShowReinstallMessage(true);
      
      // Auto-hide the message after 5 seconds
      const timer = setTimeout(() => {
        setShowReinstallMessage(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isPWA, isPWAReinstallation]);

  if (showReinstallMessage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                App Reinstalled
              </h3>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            <p>Welcome back! Your app has been reinstalled. For security reasons, you'll need to log in again.</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setShowReinstallMessage(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}