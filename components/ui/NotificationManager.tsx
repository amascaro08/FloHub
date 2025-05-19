// components/ui/NotificationManager.tsx
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  isPushNotificationSupported, 
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestNotification
} from '@/lib/notifications';

type NotificationState = {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
};

const NotificationManager: React.FC = () => {
  const { data: session } = useSession();
  const [state, setState] = useState<NotificationState>({

  if (!session) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  // Check if the browser supports push notifications
  useEffect(() => {
    if (!session) return;

    const isSupported = isPushNotificationSupported();
    const permission = getNotificationPermission();
    
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
  }, [session]);

  // Check if the user is already subscribed
  const checkSubscriptionStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check if service worker is registered
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        setState(prev => ({ 
          ...prev, 
          isSubscribed: !!subscription,
          isLoading: false 
        }));
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
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
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check if running on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      // Check if running on Android
      const isAndroid = /Android/.test(navigator.userAgent);
      
      // Request permission
      const permissionGranted = await requestNotificationPermission();
      
      if (!permissionGranted) {
        setState(prev => ({
          ...prev,
          permission: getNotificationPermission(),
          isLoading: false,
          error: 'Permission denied for notifications'
        }));
        return;
      }
      
      // Subscribe to push notifications
      // Use a hardcoded VAPID key for development if environment variable is not set
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      
      // Log platform information for debugging
      console.log('Platform info:', {
        isIOS,
        isAndroid,
        userAgent: navigator.userAgent,
        vapidKeyAvailable: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });
      
      const subscription = await subscribeToPushNotifications(vapidPublicKey);
      
      if (!subscription) {
        // Handle platform-specific error messages
        if (isIOS) {
          throw new Error('Push notifications may not be fully supported on iOS. Please ensure Safari settings allow notifications.');
        } else if (isAndroid) {
          throw new Error('Push notifications failed on Android. Please check if Chrome is up to date and notifications are allowed in system settings.');
        } else {
          throw new Error('Failed to subscribe to push notifications. Please check browser compatibility.');
        }
      }
      
      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false
      }));
      
      console.log('Successfully subscribed to push notifications');
    } catch (error) {
      console.error('Error enabling notifications:', error);
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
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const success = await unsubscribeFromPushNotifications();
      
      setState(prev => ({ 
        ...prev, 
        isSubscribed: !success,
        isLoading: false 
      }));
      
      if (success) {
        console.log('Successfully unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('Error disabling notifications:', error);
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
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await sendTestNotification();
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error sending test notification:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to send test notification',
        isLoading: false 
      }));
    }
  };

  if (!session) {
    return <p className="text-sm text-gray-500">Sign in to manage notifications</p>;
  }

  if (!state.isSupported) {
    return <p className="text-sm text-gray-500">Push notifications are not supported in this browser</p>;
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium">Notification Settings</h3>
      
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
        <p className="text-sm text-red-500 dark:text-red-400">
          Notifications are blocked. Please update your browser settings to allow notifications.
        </p>
      )}
      
      {!state.isSupported && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Your browser may have limited support for push notifications on mobile devices.
        </p>
      )}
      
      {state.isSubscribed && (
        <button
          onClick={sendTestNotificationHandler}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-sm transition-colors"
          disabled={state.isLoading}
        >
          Send Test Notification
        </button>
      )}
      
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        <p>
          Enable notifications to receive reminders about upcoming meetings and tasks.
          FloCat will notify you when a meeting is about to start or when a task is due.
        </p>
      </div>
    </div>
  );
};

export default NotificationManager;