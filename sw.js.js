/**
 * MBTI 물류관리 v9.7 — Service Worker
 *
 * 역할:
 *   1. 오프라인 작동 (HTML/CSS/JS 캐싱)
 *   2. 백그라운드 동기화
 *   3. 푸시 알림 수신
 *
 * 배포: GitHub Pages 루트에 업로드
 *   위치: kimdh4790-cpu.github.io/mbti-logistics/sw.js
 *   HTML과 같은 폴더여야 함 (scope 제어)
 */

const CACHE_VERSION = 'mbti-v9.7';
const CACHE_NAME = `mbti-cache-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './엠비티아이_물류관리_v9.html',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js'
];

// ── 설치: 핵심 자원 캐싱 ──
self.addEventListener('install', event => {
  console.log('[SW] 설치:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(err => console.warn('[SW] 일부 자원 캐싱 실패:', err)))
      .then(() => self.skipWaiting())
  );
});

// ── 활성화: 구버전 캐시 정리 ──
self.addEventListener('activate', event => {
  console.log('[SW] 활성화:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('mbti-cache-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// ── fetch: 네트워크 우선, 실패 시 캐시 ──
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;
  // Firebase 실시간 데이터는 캐싱 안 함
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebaseio.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('firebasestorage.googleapis.com')) {
    return;
  }
  if (!url.startsWith('http')) return;

  event.respondWith(
    fetch(req)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, respClone).catch(() => {}));
        }
        return response;
      })
      .catch(() => {
        return caches.match(req).then(cachedResp => {
          if (cachedResp) {
            console.log('[SW] 오프라인 캐시 응답:', req.url);
            return cachedResp;
          }
          if (req.destination === 'document') {
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><title>오프라인</title>' +
              '<meta name="viewport" content="width=device-width,initial-scale=1">' +
              '<style>body{font-family:-apple-system,sans-serif;background:#0d0d1a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}h1{color:#185FA5}p{color:#aaa;line-height:1.6}button{margin-top:20px;padding:12px 28px;background:#185FA5;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}</style>' +
              '</head><body><h1>📡 오프라인</h1><p>인터넷 연결이 없습니다.<br>이미 열어본 페이지는 캐시에서 표시되며,<br>입차/운행 데이터는 자동 동기화됩니다.</p>' +
              '<button onclick="location.reload()">🔄 다시 시도</button></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          }
          return new Response('오프라인', { status: 503 });
        });
      })
  );
});

// ── 백그라운드 동기화 ──
self.addEventListener('sync', event => {
  if (event.tag === 'mbti-sync-pending') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'sync-pending', tag: event.tag }));
      })
    );
  }
});

// ── 푸시 알림 수신 ──
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'MBTI 물류', body: event.data ? event.data.text() : '새 알림' }; }

  const title = data.title || (data.notification && data.notification.title) || 'MBTI 물류 알림';
  const options = {
    body: data.body || (data.notification && data.notification.body) || '새 알림이 도착했습니다',
    icon: data.icon || './icon-192.png',
    badge: data.badge || './icon-192.png',
    tag: data.tag || 'mbti-notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || { url: './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── 알림 클릭 ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// ── 앱→SW 메시지 ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => {
      keys.forEach(k => { if (k.startsWith('mbti-cache-')) caches.delete(k); });
    });
  }
});

console.log('[SW] mbti-v9.7 Service Worker 로드됨');
