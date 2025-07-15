// sw.js (place this in your /public directory)
const CACHE_NAME = 'flohub-pwa-cache-v1';
const urlsToCache = [
  '/',
  '/offline.html',
  '/FloHub_Logo_Transparent.png',
  '/flohub_flocat.png',
  '/flocat-sidepeek.png',
  // add any other critical static assets or pages you want to precache
];

// Install event: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch event: try cache first, then network, then offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // Only cache GET requests

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        return fetch(event.request)
          .catch(() => caches.match('/offline.html'));
      })
  );
});
