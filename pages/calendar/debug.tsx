import React, { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";

interface DebugInfo {
  user: {
    authenticated: boolean;
    email?: string;
    hasGoogleAccount: boolean;
    googleTokenExists: boolean;
    googleTokenExpired?: boolean;
  };
  environment: {
    googleClientId: boolean;
    googleClientSecret: boolean;
    nextAuthUrl: boolean;
  };
  userSettings: {
    calendarSources: any[];
    powerAutomateUrl: string | null;
    selectedCals: string[];
  };
  apis: {
    userSettingsStatus: number;
    calendarListStatus?: number;
    calendarEventsStatus?: number;
  };
  errors: string[];
}

const CalendarDebugPage = () => {
  const { user } = useUser();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/calendar/debug');
      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data);
      } else {
        setError(`Failed to fetch debug info: ${response.status}`);
      }
    } catch (err) {
      setError(`Error fetching debug info: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDebugInfo();
    } else {
      setLoading(false);
    }
  }, [user]);

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-red-600';
    if (status >= 500) return 'text-red-800';
    return 'text-gray-600';
  };

  const getStatusIcon = (success: boolean | undefined): string => {
    if (success === undefined) return '⚠️';
    return success ? '✅' : '❌';
  };

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-5">Calendar Debug</h1>
        <div className="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-400 p-4 rounded">
          <p>Please log in to access calendar debug information.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-5">Calendar Debug</h1>
        <div className="bg-blue-100 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-700 dark:text-blue-400 p-4 rounded">
          <p>Loading debug information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-5">Calendar Debug</h1>
        <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded">
          <p>{error}</p>
          <button
            onClick={fetchDebugInfo}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Calendar Debug</h1>
        <button
          onClick={fetchDebugInfo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {debugInfo && (
        <>
          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">User Authenticated</p>
                <p className="font-medium">{getStatusIcon(debugInfo.user.authenticated)} {debugInfo.user.authenticated ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Google Calendar Connected</p>
                <p className="font-medium">{getStatusIcon(debugInfo.user.hasGoogleAccount && debugInfo.user.googleTokenExists)} {debugInfo.user.hasGoogleAccount && debugInfo.user.googleTokenExists ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Environment Setup</p>
                <p className="font-medium">{getStatusIcon(debugInfo.environment.googleClientId && debugInfo.environment.googleClientSecret)} {debugInfo.environment.googleClientId && debugInfo.environment.googleClientSecret ? 'Complete' : 'Incomplete'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Calendar Sources</p>
                <p className="font-medium">{debugInfo.userSettings.calendarSources.length} configured</p>
              </div>
            </div>
          </div>

          {/* Errors */}
          {debugInfo.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 p-6">
              <h2 className="text-lg font-medium mb-4 text-red-800 dark:text-red-400">Issues Found</h2>
              <ul className="space-y-2">
                {debugInfo.errors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span className="text-red-700 dark:text-red-300">{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* User Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium mb-4">User Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="font-mono">{debugInfo.user.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Google Account Connected:</span>
                <span>{getStatusIcon(debugInfo.user.hasGoogleAccount)} {debugInfo.user.hasGoogleAccount ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span>Google Token Available:</span>
                <span>{getStatusIcon(debugInfo.user.googleTokenExists)} {debugInfo.user.googleTokenExists ? 'Yes' : 'No'}</span>
              </div>
              {debugInfo.user.googleTokenExpired !== undefined && (
                <div className="flex justify-between">
                  <span>Google Token Expired:</span>
                  <span className={debugInfo.user.googleTokenExpired ? 'text-red-600' : 'text-green-600'}>
                    {debugInfo.user.googleTokenExpired ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Environment */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium mb-4">Environment Configuration</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Google Client ID:</span>
                <span>{getStatusIcon(debugInfo.environment.googleClientId)} {debugInfo.environment.googleClientId ? 'Set' : 'Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span>Google Client Secret:</span>
                <span>{getStatusIcon(debugInfo.environment.googleClientSecret)} {debugInfo.environment.googleClientSecret ? 'Set' : 'Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span>NextAuth URL:</span>
                <span>{getStatusIcon(debugInfo.environment.nextAuthUrl)} {debugInfo.environment.nextAuthUrl ? 'Set' : 'Missing'}</span>
              </div>
            </div>
          </div>

          {/* API Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium mb-4">API Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>User Settings API:</span>
                <span className={getStatusColor(debugInfo.apis.userSettingsStatus)}>
                  HTTP {debugInfo.apis.userSettingsStatus}
                </span>
              </div>
              {debugInfo.apis.calendarListStatus && (
                <div className="flex justify-between">
                  <span>Calendar List API:</span>
                  <span className={getStatusColor(debugInfo.apis.calendarListStatus)}>
                    HTTP {debugInfo.apis.calendarListStatus}
                  </span>
                </div>
              )}
              {debugInfo.apis.calendarEventsStatus && (
                <div className="flex justify-between">
                  <span>Calendar Events API:</span>
                  <span className={getStatusColor(debugInfo.apis.calendarEventsStatus)}>
                    HTTP {debugInfo.apis.calendarEventsStatus}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Calendar Sources */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium mb-4">Calendar Sources</h2>
            {debugInfo.userSettings.calendarSources.length > 0 ? (
              <div className="space-y-3">
                {debugInfo.userSettings.calendarSources.map((source, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{source.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Type: {source.type}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Status: {source.isEnabled ? 'Enabled' : 'Disabled'}</p>
                        {source.tags && source.tags.length > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">Tags: {source.tags.join(', ')}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${source.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {source.isEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No calendar sources configured</p>
            )}
            
            {debugInfo.userSettings.powerAutomateUrl && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
                <p className="font-medium">Legacy Power Automate URL:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-all">{debugInfo.userSettings.powerAutomateUrl}</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => window.location.href = '/dashboard/settings?tab=calendar'}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Open Calendar Settings
              </button>
              <button
                onClick={() => window.location.href = '/calendar'}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                View Calendar
              </button>
              {!debugInfo.user.hasGoogleAccount && (
                <button
                  onClick={() => window.location.href = '/api/calendar/connect?provider=google'}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Connect Google Calendar
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarDebugPage;