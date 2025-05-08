// Enhanced service worker that handles caching and push notifications
// It's designed to work alongside Workbox (used by next-pwa)

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle most requests normally
  // This is a fallback service worker that doesn't interfere with Workbox
  event.respondWith(fetch(event.request));
});

// Log any errors that occur during service worker operation
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

// Handle push events (when a notification is received)
self.addEventListener('push', (event) => {
  console.log('Push notification received', event);

  if (!event.data) {
    console.log('No payload in push notification');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push notification data:', data);

    // Detect platform from user agent
    const userAgent = self.navigator ? self.navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    
    console.log('Platform detection in service worker:', { isIOS, isAndroid, userAgent });

    const title = data.title || 'FlowHub';
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag || 'default',
      vibrate: [100, 50, 100],
      timestamp: data.timestamp || Date.now(),
      // Ensure silent option is set for iOS
      silent: isIOS ? false : undefined,
      // Ensure renotify is set for Android to make notifications more reliable
      renotify: isAndroid ? true : undefined,
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('Notification shown successfully');
        })
        .catch(err => {
          console.error('Error showing notification:', err);
        })
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Handle different actions
  if (action === 'view_meeting') {
    event.waitUntil(
      clients.openWindow(`/dashboard/meetings?id=${data.meetingId}`)
    );
  } else if (action === 'view_task') {
    event.waitUntil(
      clients.openWindow(`/dashboard/tasks?id=${data.taskId}`)
    );
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If a window is already open, focus it
          if (clientList.length > 0) {
            let client = clientList[0];
            for (let i = 0; i < clientList.length; i++) {
              if (clientList[i].focused) {
                client = clientList[i];
                break;
              }
            }
            
            // Navigate to the appropriate URL based on notification data
            if (data.url) {
              return client.navigate(data.url).then(client => client.focus());
            } else {
              return client.focus();
            }
          } else {
            // If no window is open, open a new one
            return clients.openWindow(data.url || '/dashboard');
          }
        })
    );
  }
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed', event);
});