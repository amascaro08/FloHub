// Service Worker for FlowHub
const CACHE_NAME = 'flohub-cache-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/flohub_logo.png',
  '/flohub_bubble.png',
  '/flohub_flocat.png',
  '/FloHub_Logo_Transparent.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-192x192.png',
  '/icons/maskable-icon-512x512.png'
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/userSettings',
  '/api/tasks',
  '/api/notes',
  '/api/meetings',
  '/api/habits'
];

// Install event - precache static assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Pre-caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .catch(err => console.error('[ServiceWorker] Pre-cache error:', err))
  );
});

// Message event listener for handling messages from the client
self.addEventListener('message', event => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  // Handle skip waiting message
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Skipping waiting and activating new service worker');
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  
  // Claim clients to ensure the service worker controls all clients immediately
  event.waitUntil(self.clients.claim());
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[ServiceWorker] Removing old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event - handle different caching strategies
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle API requests with network-first strategy
  if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }
  
  // Handle static assets with cache-first strategy
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }
  
  // Handle HTML pages with network-first strategy
  if (url.pathname === '/' || url.pathname.endsWith('.html') || !url.pathname.includes('.')) {
    event.respondWith(networkFirstWithOfflineFallback(event.request));
    return;
  }
  
  // Default to network-first for everything else
  event.respondWith(networkFirstStrategy(event.request));
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Cache-first fetch failed:', error);
    return new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } });
  }
}

// Network-first strategy for API requests
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    console.error('[ServiceWorker] Network-first fetch failed:', error);
    return new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } });
  }
}

// Network-first with offline fallback for HTML pages
async function networkFirstWithOfflineFallback(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cached response, return offline page
    console.log('[ServiceWorker] Serving offline page');
    return caches.match('/offline.html');
  }
}

// Background sync for offline operations
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  } else if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

// Function to sync notes when back online
async function syncNotes() {
  try {
    const db = await openIndexedDB();
    const pendingNotes = await db.getAll('pendingNotes');
    
    for (const note of pendingNotes) {
      try {
        const response = await fetch('/api/notes/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note)
        });
        
        if (response.ok) {
          await db.delete('pendingNotes', note.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync note:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Error in syncNotes:', error);
  }
}

// Function to sync tasks when back online
async function syncTasks() {
  try {
    const db = await openIndexedDB();
    const pendingTasks = await db.getAll('pendingTasks');
    
    for (const task of pendingTasks) {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        });
        
        if (response.ok) {
          await db.delete('pendingTasks', task.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync task:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Error in syncTasks:', error);
  }
}

// Helper function to open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('flohub-offline', 1);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('pendingNotes')) {
        db.createObjectStore('pendingNotes', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pendingTasks')) {
        db.createObjectStore('pendingTasks', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = event => {
      const db = event.target.result;
      
      // Wrap IndexedDB with a simpler API
      const wrappedDB = {
        getAll: (storeName) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        },
        delete: (storeName, id) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      };
      
      resolve(wrappedDB);
    };
    
    request.onerror = event => {
      reject(event.target.error);
    };
  });
}

// Push event listener for handling push notifications
self.addEventListener('push', event => {
  console.log('[ServiceWorker] Push received');
  
  let notificationData = {};
  
  // Try to extract the notification data from the push event
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error('[ServiceWorker] Error parsing push data:', error);
      notificationData = {
        title: 'FlowHub Notification',
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png'
      };
    }
  } else {
    // Default notification if no data is provided
    notificationData = {
      title: 'FlowHub Notification',
      body: 'You have a new notification',
      icon: '/icons/icon-192x192.png'
    };
  }
  
  // Ensure we have the minimum required properties
  const title = notificationData.title || 'FlowHub Notification';
  const options = {
    body: notificationData.body || 'You have a new notification',
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: notificationData.badge || '/icons/icon-72x72.png',
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    // Add vibration pattern for mobile devices
    vibrate: [100, 50, 100],
    // Ensure notification is shown even if the app is in the foreground
    requireInteraction: true
  };
  
  // Show the notification
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event listener
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] Notification click received');
  
  // Close the notification
  event.notification.close();
  
  // Handle notification click - navigate to the URL if provided
  if (event.notification.data && event.notification.data.url) {
    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
    
    // Open the URL in a new window/tab or focus an existing one
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(windowClients => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // If so, focus it
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});