// This is the "Service Worker" that tells Android this is a real app.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Chrome requires a fetch handler to trigger the Native App install
self.addEventListener('fetch', (event) => {
  // We just let all network requests pass through normally
  return;
});