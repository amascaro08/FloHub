// lib/notifications.ts
// Service for managing push notifications

/**
 * Check if the browser supports push notifications
 */
export const isPushNotificationSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
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
    const permission = await Notification.requestPermission();
    return permission === 'granted';
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
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    // If already subscribed, return the subscription
    if (subscription) {
      return subscription;
    }
    
    // Otherwise, create a new subscription
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
    });
    
    // Send the subscription to the server
    await saveSubscription(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
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
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return true; // Already unsubscribed
    }
    
    // Unsubscribe
    const success = await subscription.unsubscribe();
    
    if (success) {
      // Remove subscription from server
      await deleteSubscription(subscription);
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
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }
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
      body: JSON.stringify(subscription),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete subscription');
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
    const response = await fetch('/api/notifications/test', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }
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
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
};