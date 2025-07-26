// components/ui/NotificationManager.tsx
import React, { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { 
  isPushNotificationSupported, 
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestNotification
} from '@/lib/notifications';
import NotificationDebug from './NotificationDebug';

type NotificationState = {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
};

const NotificationManager: React.FC = () => {
  const { user, isLoading } = useUser();
  const [showDebug, setShowDebug] = useState(false);

  if (!user) {
    return <div>Loading...</div>;
  }
  
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  // Check if the browser supports push notifications
  useEffect(() => {
    if (!user) return;

    console.log('NotificationManager: Initializing...');
    const isSupported = isPushNotificationSupported();
    const permission = getNotificationPermission();
    
    console.log('NotificationManager: Support check', { isSupported, permission });
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission,
      isLoading: permission === 'granted', // If granted, we'll check subscription status
    }));

    // If permission is granted, check if already subscribed
    if (permission === 'granted' && isSupported) {
      checkSubscriptionStatus();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  // Check if the user is already subscribed
  const checkSubscriptionStatus = async () => {
    try {
      console.log('NotificationManager: Checking subscription status...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check if service worker is registered
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        console.log('NotificationManager: Subscription status', !!subscription);
        setState(prev => ({ 
          ...prev, 
          isSubscribed: !!subscription,
          isLoading: false 
        }));
      }
    } catch (error) {
      console.error('NotificationManager: Error checking subscription status:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to check notification subscription status',
        isLoading: false 
      }));
    }
  };

  // Request permission and subscribe to push notifications
  const enableNotifications = async () => {
    try {
      console.log('NotificationManager: Enabling notifications...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check platform
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      const isAndroid = /Android/.test(userAgent);
      const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
      
      console.log('NotificationManager: Platform detection', { isIOS, isAndroid, isChrome });
      
      // Platform-specific warnings
      if (isAndroid && !isChrome) {
        setState(prev => ({
          ...prev,
          error: 'For best notification support on Android, please use Chrome browser.',
          isLoading: false
        }));
        return;
      }
      
      if (isIOS) {
        setState(prev => ({
          ...prev,
          error: 'iOS has limited notification support. For best experience, add this app to your home screen.',
          isLoading: false
        }));
        // Continue anyway for iOS
      }
      
      // Request permission
      console.log('NotificationManager: Requesting permission...');
      const permissionGranted = await requestNotificationPermission();
      
      if (!permissionGranted) {
        const currentPermission = getNotificationPermission();
        let errorMessage = 'Permission denied for notifications';
        
        if (currentPermission === 'denied') {
          errorMessage = 'Notifications are blocked. Please enable them in your browser settings and refresh the page.';
        }
        
        setState(prev => ({
          ...prev,
          permission: currentPermission,
          isLoading: false,
          error: errorMessage
        }));
        return;
      }
      
      // Subscribe to push notifications
      console.log('NotificationManager: Subscribing to push notifications...');
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        console.warn('NotificationManager: Using fallback VAPID key - this should not happen in production');
      }
      
      const subscription = await subscribeToPushNotifications(vapidPublicKey);
      
      if (!subscription) {
        let errorMessage = 'Failed to subscribe to push notifications.';
        
        if (isIOS) {
          errorMessage = 'Push notifications may not be fully supported on iOS. Please ensure Safari settings allow notifications and try adding this app to your home screen.';
        } else if (isAndroid) {
          errorMessage = 'Push notifications failed on Android. Please ensure Chrome is up to date, notifications are allowed in system settings, and try clearing browser data.';
        } else {
          errorMessage = 'Failed to subscribe to push notifications. Please check browser compatibility and try again.';
        }
        
        throw new Error(errorMessage);
      }
      
      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false,
        error: null
      }));
      
      console.log('NotificationManager: Successfully subscribed to push notifications');
    } catch (error) {
      console.error('NotificationManager: Error enabling notifications:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to enable notifications',
        isLoading: false
      }));
    }
  };

  // Unsubscribe from push notifications
  const disableNotifications = async () => {
    try {
      console.log('NotificationManager: Disabling notifications...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const success = await unsubscribeFromPushNotifications();
      
      setState(prev => ({ 
        ...prev, 
        isSubscribed: !success,
        isLoading: false 
      }));
      
      if (success) {
        console.log('NotificationManager: Successfully unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('NotificationManager: Error disabling notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to disable notifications',
        isLoading: false 
      }));
    }
  };

  // Send a test notification
  const sendTestNotificationHandler = async () => {
    try {
      console.log('NotificationManager: Sending test notification...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await sendTestNotification();
      
      setState(prev => ({ ...prev, isLoading: false }));
      console.log('NotificationManager: Test notification sent successfully');
    } catch (error) {
      console.error('NotificationManager: Error sending test notification:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to send test notification',
        isLoading: false 
      }));
    }
  };

  if (!user) {
    return <p className="text-sm text-gray-500">Sign in to manage notifications</p>;
  }

  if (!state.isSupported) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Push notifications are not supported in this browser</p>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-blue-500 hover:text-blue-700"
        >
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </button>
        {showDebug && <NotificationDebug />}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Notification Settings</h3>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-blue-500 hover:text-blue-700"
        >
          {showDebug ? 'Hide' : 'Show'} Debug
        </button>
      </div>
      
      {state.error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
          {state.error}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <span>Push Notifications</span>
        <div>
          {state.isLoading ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
          ) : state.isSubscribed ? (
            <button
              onClick={disableNotifications}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm transition-colors"
              disabled={state.isLoading}
            >
              Disable
            </button>
          ) : (
            <button
              onClick={enableNotifications}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
              disabled={state.isLoading || state.permission === 'denied'}
            >
              Enable
            </button>
          )}
        </div>
      </div>
      
      {state.permission === 'denied' && (
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-md text-sm">
          <p className="font-medium">Notifications are blocked</p>
          <p className="mt-1">To enable notifications:</p>
          <ol className="mt-2 ml-4 list-decimal space-y-1">
            <li>Click the lock icon in your address bar</li>
            <li>Set notifications to "Allow"</li>
            <li>Refresh the page and try again</li>
          </ol>
        </div>
      )}
      
      {!state.isSupported && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Your browser may have limited support for push notifications on mobile devices.
        </p>
      )}
      
      {state.isSubscribed && (
        <div className="space-y-2">
          <button
            onClick={sendTestNotificationHandler}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-sm transition-colors"
            disabled={state.isLoading}
          >
            Send Test Notification
          </button>
          
          <div className="text-xs text-green-600 dark:text-green-400">
            ✅ You'll receive notifications for:
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>Meeting reminders (15 & 5 minutes before)</li>
              <li>Task due date reminders (24 hours & 1 hour before)</li>
              <li>FloChat reminders (when you ask FloCat to remind you)</li>
            </ul>
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        <p>
          Enable notifications to receive reminders about upcoming meetings and tasks.
          FloCat will notify you when a meeting is about to start or when a task is due.
        </p>
      </div>

      {showDebug && (
        <div className="mt-4 border-t pt-4">
          <NotificationDebug />
        </div>
      )}
    </div>
  );
};

export default NotificationManager;