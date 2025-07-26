// Service Worker for FlowHub Push Notifications
const CACHE_NAME = 'flohub-v1';
const urlsToCache = [
  '/',
  '/offline.html',
  '/dashboard',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let options = {
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
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Push payload:', payload);
      
      options = {
        ...options,
        body: payload.body || options.body,
        icon: payload.icon || options.icon,
        badge: payload.badge || options.badge,
        data: {
          ...options.data,
          ...payload.data
        },
        actions: payload.actions || options.actions,
        tag: payload.tag || 'default',
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false
      };

      if (payload.title) {
        event.waitUntil(
          self.registration.showNotification(payload.title, options)
        );
      } else {
        event.waitUntil(
          self.registration.showNotification('FloCat Notification', options)
        );
      }
    } catch (error) {
      console.error('Error parsing push payload:', error);
      event.waitUntil(
        self.registration.showNotification('FloCat Notification', options)
      );
    }
  } else {
    event.waitUntil(
      self.registration.showNotification('FloCat Notification', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  if (event.action === 'view') {
    // Open the app to the specific URL
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if a window is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'close') {
    // Just close the notification (already done above)
    console.log('Notification closed by user');
  } else {
    // Default action (clicking the notification body)
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('dashboard') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
  }
});

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});