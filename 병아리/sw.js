// ★ MBTI 물류관리 v9.14 — Service Worker
// 오프라인 캐싱 + 푸시 알림 수신

const CACHE_NAME = 'mbti-logistics-v9-14';
const CACHE_URLS = [
  './',
  './index.html'
];

self.addEventListener('install', function(e) {
  console.log('[SW] 설치 중...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.allSettled(
        CACHE_URLS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] 캐시 실패:', url, err);
          });
        })
      );
    }).then(function() {
      console.log('[SW] 설치 완료');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  console.log('[SW] 활성화');
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) {
              console.log('[SW] 이전 캐시 삭제:', key);
              return caches.delete(key);
            })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('cloudfunctions.net') ||
      url.includes('firebasestorage.googleapis.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (e.request.method === 'GET' && response.status === 200) {
          var resClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, resClone);
          });
        }
        return response;
      }).catch(function() {
        if (e.request.mode === 'navigate') {
          return caches.match('./') || caches.match('./index.html');
        }
      });
    })
  );
});

self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}

  var title = data.title  || 'MBTI 물류관리';
  var body  = data.body   || '새 알림이 있습니다';
  var icon  = data.icon   || './icon-192.png';
  var badge = data.badge  || './icon-72.png';
  var tag   = data.tag    || 'mbti-noti';
  var url   = data.url    || './';

  e.waitUntil(
    self.registration.showNotification(title, {
      body    : body,
      icon    : icon,
      badge   : badge,
      tag     : tag,
      data    : { url: url },
      vibrate : [200, 100, 200],
      requireInteraction: data.urgent || false
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) ? e.notification.data.url : './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTI_CLICK', url: target });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })
  );
});

self.addEventListener('message', function(e) {
  if (!e.data) return;

  if (e.data.type === 'SHOW_NOTI') {
    var d = e.data.data || {};
    self.registration.showNotification(d.title || 'MBTI 물류관리', {
      body    : d.body    || '',
      icon    : d.icon    || './icon-192.png',
      badge   : d.badge   || './icon-72.png',
      tag     : d.tag     || 'mbti-noti-' + Date.now(),
      vibrate : [150, 80, 150]
    });
  }

  if (e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
