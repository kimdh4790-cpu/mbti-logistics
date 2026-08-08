// DINE Service Worker — push notifications
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', function(e) {
  if (!e.data) return;
  var d = {};
  try { d = e.data.json(); } catch(_) { d = { title: 'DINE', body: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'DINE', {
    body: d.body || '',
    icon: '/favicon.ico',
    data: d.data || {}
  }));
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function(clients) {
    if (clients.length) return clients[0].focus();
    return self.clients.openWindow('/app');
  }));
});
