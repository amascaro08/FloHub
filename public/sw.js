// Service Worker for FlowHub Push Notifications
// Version-based cache busting for better update handling
const CACHE_VERSION = 'v2025.07.31.2255'; // This will be updated automatically
const CACHE_NAME = `flohub-${CACHE_VERSION}`;
const AUTH_CACHE_NAME = `flohub-auth-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/offline.html',
  '/dashboard',
];

console.log('Service Worker: Starting up...', CACHE_NAME);

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('Service Worker: Caching files');
          return cache.addAll(urlsToCache);
        }),
      caches.open(AUTH_CACHE_NAME)
        .then((cache) => {
          console.log('Service Worker: Auth cache created');
          return cache;
        })
    ]).catch((error) => {
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
          if (cacheName !== CACHE_NAME && cacheName !== AUTH_CACHE_NAME) {
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

// Fetch event with enhanced auth handling
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip login requests - let them go through normally
  if (url.pathname === '/api/auth/login') {
    return;
  }
  
  // Enhanced auth route handling for other auth endpoints
  if (url.pathname.startsWith('/api/auth/')) {
    event.respondWith(handleAuthRequest(event.request));
    return;
  }
  
  // Skip service worker handling for other API routes
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Only handle GET requests for non-auth routes
  if (event.request.method !== 'GET') {
    return;
  }

  // Add version parameter to force cache updates for HTML pages
  if (event.request.mode === 'navigate') {
    const versionedUrl = new URL(event.request.url);
    versionedUrl.searchParams.set('v', CACHE_VERSION);
    
    event.respondWith(
      fetch(versionedUrl.toString())
        .then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cached version
          return caches.match(event.request)
            .then((response) => {
              if (response) {
                return response;
              }
              // If no cached version, return offline page
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }
  
  // Cache-first strategy for other resources
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          // If network fails, return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Enhanced auth request handling
async function handleAuthRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Network-first strategy for auth requests
    const networkResponse = await fetch(request, {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    // Cache successful auth responses for offline access
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const authCache = await caches.open(AUTH_CACHE_NAME);
      
      // Cache session and refresh responses for offline access
      if (url.pathname === '/api/auth/session' || url.pathname === '/api/auth/refresh') {
        await authCache.put(request, responseToCache);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Auth request failed:', error);
    
    // For offline scenarios, try to return cached auth data
    if (url.pathname === '/api/auth/session') {
      const authCache = await caches.open(AUTH_CACHE_NAME);
      const cachedResponse = await authCache.match(request);
      
      if (cachedResponse) {
        console.log('Returning cached session data for offline access');
        return cachedResponse;
      }
    }
    
    // Re-throw the error for other auth endpoints
    throw error;
  }
}

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
  
  if (event.data && event.data.type === 'CLEAR_AUTH_CACHE') {
    console.log('Service Worker: Clearing auth cache');
    caches.delete(AUTH_CACHE_NAME);
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