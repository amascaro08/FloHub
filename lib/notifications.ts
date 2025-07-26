// lib/notifications.ts
// Service for managing push notifications

/**
 * Check if the browser supports push notifications
 */
export const isPushNotificationSupported = (): boolean => {
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const hasNotification = 'Notification' in window;
  
  console.log('Push notification support check:', {
    hasServiceWorker,
    hasPushManager,
    hasNotification,
    userAgent: navigator.userAgent
  });
  
  return hasServiceWorker && hasPushManager && hasNotification;
};

/**
 * Request permission for push notifications
 * @returns Promise<boolean> - Whether permission was granted
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported in this browser');
    return false;
  }

  try {
    console.log('Requesting notification permission...');
    
    // For older browsers, use the callback-based API
    if (Notification.requestPermission.length === 0) {
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      return permission === 'granted';
    } else {
      // For older browsers with callback
      return new Promise((resolve) => {
        Notification.requestPermission((permission) => {
          console.log('Permission result (callback):', permission);
          resolve(permission === 'granted');
        });
      });
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Get the current notification permission status
 * @returns 'granted' | 'denied' | 'default'
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Wait for service worker to be ready with timeout
 */
const waitForServiceWorker = async (timeoutMs: number = 10000): Promise<ServiceWorkerRegistration> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Service worker registration timeout'));
    }, timeoutMs);

    if (navigator.serviceWorker.controller) {
      clearTimeout(timeout);
      navigator.serviceWorker.ready.then(resolve).catch(reject);
    } else {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        clearTimeout(timeout);
        navigator.serviceWorker.ready.then(resolve).catch(reject);
      });
      
      // Also try ready immediately in case it's already available
      navigator.serviceWorker.ready.then(resolve).catch(reject);
    }
  });
};

/**
 * Subscribe to push notifications
 * @param applicationServerKey - VAPID public key
 * @returns Promise<PushSubscription | null>
 */
export const subscribeToPushNotifications = async (
  applicationServerKey: string
): Promise<PushSubscription | null> => {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported in this browser');
    return null;
  }

  try {
    console.log('Starting push notification subscription...');
    console.log('VAPID key length:', applicationServerKey.length);
    
    // Wait for service worker to be ready
    console.log('Waiting for service worker...');
    const registration = await waitForServiceWorker();
    console.log('Service worker ready:', registration);
    
    // Check if already subscribed
    console.log('Checking existing subscription...');
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('Existing subscription found:', subscription.endpoint);
      // Verify the subscription is still valid
      try {
        await saveSubscription(subscription);
        return subscription;
      } catch (error) {
        console.log('Existing subscription invalid, creating new one...');
        await subscription.unsubscribe();
        subscription = null;
      }
    }
    
    // Create new subscription
    console.log('Creating new subscription...');
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
    };
    
    console.log('Subscribe options:', {
      userVisibleOnly: subscribeOptions.userVisibleOnly,
      applicationServerKeyLength: subscribeOptions.applicationServerKey.length
    });
    
    subscription = await registration.pushManager.subscribe(subscribeOptions);
    console.log('New subscription created:', {
      endpoint: subscription.endpoint,
      keys: Object.keys(subscription.toJSON().keys || {})
    });
    
    // Send the subscription to the server
    console.log('Saving subscription to server...');
    await saveSubscription(subscription);
    console.log('Subscription saved successfully');
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Registration failed')) {
        throw new Error('Service worker registration failed. Please refresh the page and try again.');
      } else if (error.message.includes('timeout')) {
        throw new Error('Service worker took too long to load. Please check your internet connection.');
      } else if (error.message.includes('InvalidStateError')) {
        throw new Error('Push subscription failed. Please clear your browser data and try again.');
      } else if (error.message.includes('NotSupportedError')) {
        throw new Error('Push notifications are not supported on this device/browser.');
      } else if (error.message.includes('NotAllowedError')) {
        throw new Error('Notification permission denied. Please enable notifications in your browser settings.');
      }
    }
    
    return null;
  }
};

/**
 * Unsubscribe from push notifications
 * @returns Promise<boolean>
 */
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported in this browser');
    return false;
  }

  try {
    console.log('Unsubscribing from push notifications...');
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('No active subscription found');
      return true; // Already unsubscribed
    }
    
    // Unsubscribe
    const success = await subscription.unsubscribe();
    console.log('Unsubscribe result:', success);
    
    if (success) {
      // Remove subscription from server
      await deleteSubscription(subscription);
      console.log('Subscription removed from server');
    }
    
    return success;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
};

/**
 * Save subscription to server
 * @param subscription - PushSubscription object
 */
export const saveSubscription = async (subscription: PushSubscription): Promise<void> => {
  try {
    console.log('Sending subscription to server...');
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription.toJSON()),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', response.status, errorText);
      throw new Error(`Failed to save subscription: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Subscription saved:', result);
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
};

/**
 * Delete subscription from server
 * @param subscription - PushSubscription object
 */
export const deleteSubscription = async (subscription: PushSubscription): Promise<void> => {
  try {
    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription.toJSON()),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete subscription: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error deleting subscription:', error);
    throw error;
  }
};

/**
 * Send a test notification
 */
export const sendTestNotification = async (): Promise<void> => {
  try {
    console.log('Sending test notification...');
    const response = await fetch('/api/notifications/test', {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send test notification: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Test notification sent:', result);
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
};

/**
 * Convert a base64 string to Uint8Array
 * This is needed for the applicationServerKey
 * @param base64String - Base64 encoded string
 * @returns Uint8Array
 */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    console.log('VAPID key converted to Uint8Array, length:', outputArray.length);
    return outputArray;
  } catch (error) {
    console.error('Error converting VAPID key:', error);
    throw new Error('Invalid VAPID key format');
  }
};