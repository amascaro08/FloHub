import { CheckCircle, RefreshCw, X, Download } from 'lucide-react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

interface PWAUpdateManagerProps {
  className?: string;
}

export default function PWAUpdateManager({ className = '' }: PWAUpdateManagerProps) {
  const { updateAvailable, isUpdating, forceUpdate, dismissUpdate } = usePWAUpdate();

  const handleUpdate = async () => {
    await forceUpdate();
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 animate-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Download className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Update Available
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              A new version of FloHub is available with the latest features and improvements.
            </p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Update Now
                  </>
                )}
              </button>
              <button
                onClick={dismissUpdate}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <X className="h-4 w-4 mr-1" />
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}