// Service Worker Disabled - Emergency Fix
console.log('Service Worker: Disabled version loading...');

// Install event - immediately skip waiting
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install - skipping waiting immediately');
  self.skipWaiting();
});

// Activate event - claim clients and clear all caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate - clearing all caches');
  event.waitUntil(
    Promise.all([
      // Delete ALL caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Service Worker: Deleting cache', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: All caches cleared, clients claimed');
      // Notify clients that service worker is now disabled
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_DISABLED',
            message: 'Service Worker disabled - all requests will go through browser normally'
          });
        });
      });
    })
  );
});

// DO NOT HANDLE ANY FETCH EVENTS - Let browser handle everything normally
// self.addEventListener('fetch', ...) <- INTENTIONALLY REMOVED

// Keep basic message handling
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skip waiting requested');
    self.skipWaiting();
  }
});

console.log('Service Worker: Disabled version loaded - NO fetch event handling');