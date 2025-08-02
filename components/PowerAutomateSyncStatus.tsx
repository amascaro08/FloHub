import React from 'react';
import { usePowerAutomateSync } from '@/hooks/usePowerAutomateSync';

interface PowerAutomateSyncStatusProps {
  userEmail?: string;
  showControls?: boolean;
  className?: string;
}

export const PowerAutomateSyncStatus: React.FC<PowerAutomateSyncStatusProps> = ({
  userEmail,
  showControls = true,
  className = ''
}) => {
  const {
    status,
    isLoading,
    error,
    triggerManualSync,
    getSyncStatus
  } = usePowerAutomateSync({
    enabled: true,
    intervalMinutes: 120, // 2 hours
    maxSyncsPerDay: 5,
    syncOnPageLoad: true,
    syncOnUserActivity: true
  });

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const getStatusColor = () => {
    if (error) return 'text-red-500';
    if (status.lastSync) {
      const hoursSinceLastSync = status.lastSync 
        ? (new Date().getTime() - status.lastSync.getTime()) / (1000 * 60 * 60)
        : 0;
      
      if (hoursSinceLastSync < 2) return 'text-green-500';
      if (hoursSinceLastSync < 6) return 'text-yellow-500';
      return 'text-orange-500';
    }
    return 'text-gray-500';
  };

  const handleManualSync = async () => {
    await triggerManualSync(userEmail);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Power Automate Sync Status
        </h3>
        <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
          <div className={`w-2 h-2 rounded-full ${
            status.isPolling ? 'bg-green-500' : 'bg-gray-400'
          }`} />
          <span className="text-sm">
            {status.isPolling ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Last Sync */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Last Sync:
          </span>
          <span className="text-sm font-medium">
            {formatLastSync(status.lastSync)}
          </span>
        </div>

        {/* Sync Count Today */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Syncs Today:
          </span>
          <span className="text-sm font-medium">
            {status.syncCountToday} / 5
          </span>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        {showControls && (
          <div className="flex space-x-2 pt-2">
            <button
              onClick={handleManualSync}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isLoading
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </div>
              ) : (
                'Sync Now'
              )}
            </button>

            <button
              onClick={getSyncStatus}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Events sync automatically every 2 hours when you're active, with a daily limit of 5 syncs. 
              Daily cron job runs at 6 AM for background syncs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};