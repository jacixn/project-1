// Service Worker for Fivefold App
const CACHE_NAME = 'fivefold-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './static/css/main.css',
  './static/js/main.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install service worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache.filter(url => !url.startsWith('http')));
      })
  );
});

// Fetch event
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Background sync for prayer notifications (when available)
self.addEventListener('sync', function(event) {
  if (event.tag === 'prayer-reminder') {
    event.waitUntil(showPrayerNotification());
  }
});

function showPrayerNotification() {
  const options = {
    body: '🕊️ Time for prayer and reflection',
    icon: './logo192.png',
    badge: './logo192.png',
    vibrate: [200, 100, 200],
    tag: 'prayer-reminder',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: '🙏 Open App',
        icon: './logo192.png'
      }
    ]
  };

  return self.registration.showNotification('Fivefold Prayer Time', options);
}

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});
