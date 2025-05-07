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
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key is not configured');
      }
      
      const subscription = await subscribeToPushNotifications(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      );
      
      setState(prev => ({ 
        ...prev, 
        isSubscribed: !!subscription,
        permission: 'granted',
        isLoading: false 
      }));
      
      // Show success message
      if (subscription) {
        console.log('Successfully subscribed to push notifications');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to enable notifications',
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
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Notification Settings</h3>
      
      {state.error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {state.error}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <span>Push Notifications</span>
        <div>
          {state.isLoading ? (
            <span className="text-sm text-gray-500">Loading...</span>
          ) : state.isSubscribed ? (
            <button
              onClick={disableNotifications}
              className="px-3 py-1 bg-red-500 text-white rounded-md text-sm"
              disabled={state.isLoading}
            >
              Disable
            </button>
          ) : (
            <button
              onClick={enableNotifications}
              className="px-3 py-1 bg-primary-500 text-white rounded-md text-sm"
              disabled={state.isLoading || state.permission === 'denied'}
            >
              Enable
            </button>
          )}
        </div>
      </div>
      
      {state.permission === 'denied' && (
        <p className="text-sm text-red-500">
          Notifications are blocked. Please update your browser settings to allow notifications.
        </p>
      )}
      
      {state.isSubscribed && (
        <button
          onClick={sendTestNotificationHandler}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          disabled={state.isLoading}
        >
          Send Test Notification
        </button>
      )}
      
      <div className="text-xs text-gray-500 mt-2">
        <p>
          Enable notifications to receive reminders about upcoming meetings and tasks.
          FloCat will notify you when a meeting is about to start or when a task is due.
        </p>
      </div>
    </div>
  );
};

export default NotificationManager;