// Service Worker for FlowHub Push Notifications
const CACHE_NAME = 'flohub-v1';
const urlsToCache = [
  '/',
  '/offline.html',
  '/dashboard',
];

console.log('Service Worker: Starting up...');

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Cache installation failed', error);
      })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).catch(() => {
          // If network fails, return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received', event);

  let notificationData = {
    title: 'FloCat Notification',
    body: 'You have a new notification from FloCat!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1',
      url: '/dashboard'
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/icon-view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-close.png'
      }
    ],
    tag: 'default',
    requireInteraction: false,
    silent: false
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Service Worker: Push payload received', payload);
      
      // Merge payload with defaults
      notificationData = {
        ...notificationData,
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        data: {
          ...notificationData.data,
          ...payload.data
        },
        actions: payload.actions || notificationData.actions,
        tag: payload.tag || notificationData.tag,
        requireInteraction: payload.requireInteraction || notificationData.requireInteraction,
        silent: payload.silent || notificationData.silent
      };
    } catch (error) {
      console.error('Service Worker: Error parsing push payload', error);
      // Use default notification data
    }
  }

  console.log('Service Worker: Showing notification', notificationData);

  const showNotification = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
      actions: notificationData.actions,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      timestamp: Date.now()
    }
  );

  event.waitUntil(
    showNotification.catch((error) => {
      console.error('Service Worker: Failed to show notification', error);
      // Fallback: try to show a simple notification
      return self.registration.showNotification('FloCat', {
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png'
      });
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  console.log('Service Worker: Opening URL', urlToOpen);

  if (event.action === 'view') {
    // Open the app to the specific URL
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        console.log('Service Worker: Found clients', clientList.length);
        
        // Check if a window is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('dashboard') && 'focus' in client) {
            console.log('Service Worker: Focusing existing window');
            return client.focus().then(() => {
              if ('navigate' in client) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          console.log('Service Worker: Opening new window');
          return clients.openWindow(urlToOpen);
        }
      }).catch((error) => {
        console.error('Service Worker: Error handling view action', error);
      })
    );
  } else if (event.action === 'close') {
    // Just close the notification (already done above)
    console.log('Service Worker: Notification closed by user');
  } else {
    // Default action (clicking the notification body)
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        console.log('Service Worker: Default action, found clients', clientList.length);
        
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('dashboard') && 'focus' in client) {
            console.log('Service Worker: Focusing existing dashboard window');
            return client.focus().then(() => {
              if ('navigate' in client) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        
        if (clients.openWindow) {
          console.log('Service Worker: Opening new dashboard window');
          return clients.openWindow(urlToOpen);
        }
      }).catch((error) => {
        console.error('Service Worker: Error handling default action', error);
      })
    );
  }
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Handling background sync');
  }
});

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skip waiting requested');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Error event
self.addEventListener('error', (event) => {
  console.error('Service Worker: Error event', event);
});

// Unhandled rejection
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Unhandled rejection', event);
});

console.log('Service Worker: Setup complete');