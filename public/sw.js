// This is a simple service worker that handles basic caching
// It's intentionally minimal to avoid conflicts with Workbox (used by next-pwa)

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