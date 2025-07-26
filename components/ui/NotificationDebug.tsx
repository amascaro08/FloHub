// components/ui/NotificationDebug.tsx
import React, { useState, useEffect } from 'react';

interface DebugInfo {
  browserSupport: {
    serviceWorker: boolean;
    pushManager: boolean;
    notification: boolean;
  };
  permissions: {
    notification: NotificationPermission;
  };
  serviceWorker: {
    registered: boolean;
    controller: boolean;
    registrationScope?: string;
    scriptURL?: string;
  };
  pushSubscription: {
    subscribed: boolean;
    endpoint?: string;
    keys?: string[];
  };
  vapidKey: {
    configured: boolean;
    length?: number;
  };
  userAgent: string;
  platform: {
    isAndroid: boolean;
    isIOS: boolean;
    isChrome: boolean;
    isSafari: boolean;
    isFirefox: boolean;
  };
}

const NotificationDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    gatherDebugInfo();
  }, []);

  const gatherDebugInfo = async () => {
    try {
      const userAgent = navigator.userAgent;
      
      // Browser support check
      const browserSupport = {
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notification: 'Notification' in window,
      };

      // Permissions
      const permissions = {
        notification: Notification.permission,
      };

      // Service Worker info
      let serviceWorker = {
        registered: false,
        controller: false,
        registrationScope: undefined as string | undefined,
        scriptURL: undefined as string | undefined,
      };

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          serviceWorker = {
            registered: true,
            controller: !!navigator.serviceWorker.controller,
            registrationScope: registration.scope,
            scriptURL: registration.active?.scriptURL,
          };
        }
      }

      // Push subscription info
      let pushSubscription = {
        subscribed: false,
        endpoint: undefined as string | undefined,
        keys: undefined as string[] | undefined,
      };

      if (serviceWorker.registered && browserSupport.pushManager) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            const subscriptionJson = subscription.toJSON();
            pushSubscription = {
              subscribed: true,
              endpoint: subscription.endpoint,
              keys: subscriptionJson.keys ? Object.keys(subscriptionJson.keys) : [],
            };
          }
        } catch (error) {
          console.error('Error getting push subscription:', error);
        }
      }

      // VAPID key info
      const vapidKey = {
        configured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        length: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.length,
      };

      // Platform detection
      const platform = {
        isAndroid: /Android/.test(userAgent),
        isIOS: /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream,
        isChrome: /Chrome/.test(userAgent) && !/Edg/.test(userAgent),
        isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
        isFirefox: /Firefox/.test(userAgent),
      };

      setDebugInfo({
        browserSupport,
        permissions,
        serviceWorker,
        pushSubscription,
        vapidKey,
        userAgent,
        platform,
      });
    } catch (error) {
      console.error('Error gathering debug info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyDebugInfo = () => {
    if (debugInfo) {
      const text = JSON.stringify(debugInfo, null, 2);
      navigator.clipboard.writeText(text).then(() => {
        alert('Debug info copied to clipboard!');
      });
    }
  };

  const testNotificationAPI = async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      });
      
      if (response.ok) {
        alert('Test notification sent successfully!');
      } else {
        const error = await response.text();
        alert(`Test notification failed: ${error}`);
      }
    } catch (error) {
      alert(`Test notification error: ${error}`);
    }
  };

  if (isLoading) {
    return <div>Loading debug info...</div>;
  }

  if (!debugInfo) {
    return <div>Failed to load debug info</div>;
  }

  const getStatusIcon = (status: boolean) => status ? '✅' : '❌';

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">Notification Debug Info</h3>
        <div className="space-x-2">
          <button 
            onClick={copyDebugInfo}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Copy Info
          </button>
          <button 
            onClick={testNotificationAPI}
            className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
          >
            Test API
          </button>
          <button 
            onClick={gatherDebugInfo}
            className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Browser Support */}
        <div className="bg-white dark:bg-gray-900 p-3 rounded">
          <h4 className="font-semibold mb-2">Browser Support</h4>
          <div className="space-y-1">
            <div>{getStatusIcon(debugInfo.browserSupport.serviceWorker)} Service Worker</div>
            <div>{getStatusIcon(debugInfo.browserSupport.pushManager)} Push Manager</div>
            <div>{getStatusIcon(debugInfo.browserSupport.notification)} Notification API</div>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white dark:bg-gray-900 p-3 rounded">
          <h4 className="font-semibold mb-2">Permissions</h4>
          <div>
            Notification: <span className={`font-mono ${
              debugInfo.permissions.notification === 'granted' ? 'text-green-600' :
              debugInfo.permissions.notification === 'denied' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {debugInfo.permissions.notification}
            </span>
          </div>
        </div>

        {/* Service Worker */}
        <div className="bg-white dark:bg-gray-900 p-3 rounded">
          <h4 className="font-semibold mb-2">Service Worker</h4>
          <div className="space-y-1">
            <div>{getStatusIcon(debugInfo.serviceWorker.registered)} Registered</div>
            <div>{getStatusIcon(debugInfo.serviceWorker.controller)} Controller Active</div>
            {debugInfo.serviceWorker.registrationScope && (
              <div className="text-xs text-gray-600">
                Scope: {debugInfo.serviceWorker.registrationScope}
              </div>
            )}
            {debugInfo.serviceWorker.scriptURL && (
              <div className="text-xs text-gray-600">
                Script: {debugInfo.serviceWorker.scriptURL}
              </div>
            )}
          </div>
        </div>

        {/* Push Subscription */}
        <div className="bg-white dark:bg-gray-900 p-3 rounded">
          <h4 className="font-semibold mb-2">Push Subscription</h4>
          <div className="space-y-1">
            <div>{getStatusIcon(debugInfo.pushSubscription.subscribed)} Subscribed</div>
            {debugInfo.pushSubscription.endpoint && (
              <div className="text-xs text-gray-600 break-all">
                Endpoint: {debugInfo.pushSubscription.endpoint.substring(0, 50)}...
              </div>
            )}
            {debugInfo.pushSubscription.keys && (
              <div className="text-xs text-gray-600">
                Keys: {debugInfo.pushSubscription.keys.join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* VAPID Key */}
        <div className="bg-white dark:bg-gray-900 p-3 rounded">
          <h4 className="font-semibold mb-2">VAPID Configuration</h4>
          <div className="space-y-1">
            <div>{getStatusIcon(debugInfo.vapidKey.configured)} VAPID Key Configured</div>
            {debugInfo.vapidKey.length && (
              <div className="text-xs text-gray-600">
                Key Length: {debugInfo.vapidKey.length} chars
              </div>
            )}
          </div>
        </div>

        {/* Platform */}
        <div className="bg-white dark:bg-gray-900 p-3 rounded">
          <h4 className="font-semibold mb-2">Platform Detection</h4>
          <div className="space-y-1">
            <div>{getStatusIcon(debugInfo.platform.isAndroid)} Android</div>
            <div>{getStatusIcon(debugInfo.platform.isIOS)} iOS</div>
            <div>{getStatusIcon(debugInfo.platform.isChrome)} Chrome</div>
            <div>{getStatusIcon(debugInfo.platform.isSafari)} Safari</div>
            <div>{getStatusIcon(debugInfo.platform.isFirefox)} Firefox</div>
          </div>
        </div>
      </div>

      {/* User Agent */}
      <div className="bg-white dark:bg-gray-900 p-3 rounded">
        <h4 className="font-semibold mb-2">User Agent</h4>
        <div className="text-xs text-gray-600 break-all">
          {debugInfo.userAgent}
        </div>
      </div>

      {/* Common Issues */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
        <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">Common Issues & Solutions</h4>
        <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
          {!debugInfo.browserSupport.serviceWorker && (
            <div>• Service Worker not supported - Use a modern browser (Chrome, Firefox, Safari)</div>
          )}
          {debugInfo.permissions.notification === 'denied' && (
            <div>• Notifications blocked - Enable in browser settings: chrome://settings/content/notifications</div>
          )}
          {!debugInfo.serviceWorker.registered && (
            <div>• Service Worker not registered - Check console for registration errors</div>
          )}
          {!debugInfo.vapidKey.configured && (
            <div>• VAPID key missing - Run: npm run notifications:generate-keys</div>
          )}
          {debugInfo.platform.isAndroid && !debugInfo.platform.isChrome && (
            <div>• Android requires Chrome or Chrome-based browser for best notification support</div>
          )}
          {debugInfo.platform.isIOS && (
            <div>• iOS has limited notification support - Add to home screen for better experience</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDebug;