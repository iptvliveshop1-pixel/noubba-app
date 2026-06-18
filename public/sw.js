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

// ==========================================
// NEW: PUSH NOTIFICATION LOGIC
// ==========================================

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png', // Uses your existing app icon
      badge: '/icon-192.png',
      vibrate: [200, 100, 200], // Makes the phone buzz!
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 'noubba-notification'
      }
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  // If they click the notification, open the app and take them to their dashboard
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/client/dashboard');
    })
  );
});