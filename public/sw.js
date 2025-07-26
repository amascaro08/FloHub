// Service Worker for FlowHub - Minimal Offline Detection Only
const CACHE_NAME = 'flohub-v4-minimal';

console.log('Service Worker: Starting minimal version...');

// Install event - minimal caching
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event - minimal version');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Cache opened');
      // Only cache the offline page
      return cache.add('/offline.html');
    }).catch((error) => {
      console.error('Service Worker: Cache installation failed', error);
    })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event - minimal version');
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

// Fetch event - VERY minimal intervention
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ONLY handle navigation requests (page loads) and ONLY for our domain
  if (request.mode !== 'navigate' || !url.hostname.includes('flohub')) {
    // Let all other requests pass through normally
    return;
  }
  
  console.log('Service Worker: Handling navigation request for', request.url);
  
  event.respondWith(
    fetch(request)
      .then(response => {
        console.log('Service Worker: Navigation request successful', response.status);
        return response;
      })
      .catch(error => {
        console.log('Service Worker: Navigation request failed', error);
        
        // Only show offline page if navigator says we're offline
        if (!navigator.onLine) {
          console.log('Service Worker: User is offline, serving offline page');
          return caches.match('/offline.html');
        }
        
        // If online but request failed, let the browser handle it normally
        console.log('Service Worker: User is online, letting browser handle error');
        throw error;
      })
  );
});

// Push notification handling (keep existing functionality)
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
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
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
    }).catch((error) => {
      console.error('Service Worker: Failed to show notification', error);
      return self.registration.showNotification('FloCat', {
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png'
      });
    })
  );
});

// Notification click handling (keep existing functionality)
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('dashboard') && 'focus' in client) {
            return client.focus().then(() => {
              if ('navigate' in client) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }).catch((error) => {
        console.error('Service Worker: Error handling notification click', error);
      })
    );
  }
});

// Message handling
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skip waiting requested');
    self.skipWaiting();
  }
});

console.log('Service Worker: Minimal setup complete');