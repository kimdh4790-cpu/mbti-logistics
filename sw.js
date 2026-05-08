// ★ MBTI 물류관리 — Service Worker (FCM 백그라운드 완전 지원)
// 자동 버전: 타임스탬프 기반 캐시 무효화

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
  authDomain:        'mbti-logistics.firebaseapp.com',
  projectId:         'mbti-logistics',
  storageBucket:     'mbti-logistics.firebasestorage.app',
  messagingSenderId: '40761160761',
  appId:             '1:40761160761:web:20545b610f03f534e949e8'
});
const messaging = firebase.messaging();

const ICON = '';
const BADGE = '';
// ★ 타임스탬프 기반 캐시 — GitHub 업로드마다 자동으로 SW 업데이트됨
const CACHE = 'mbti-v9-' + '202605080042';

self.addEventListener('install', e => {
  console.log('[SW] install v9.57');
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[SW] activate v9.57');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({type:'window', includeUncontrolled:true})
          .then(function(clients){
            clients.forEach(function(c){
              c.postMessage({type:'SW_UPDATED', version:'v9.82'});
            });
          });
      })
  );
});

const _seenTags = new Map();
function _isDuplicate(tag) {
  const now = Date.now();
  if (_seenTags.has(tag) && (now - _seenTags.get(tag)) < 5 * 60 * 1000) return true;
  _seenTags.set(tag, now);
  return false;
}

messaging.onBackgroundMessage(function(payload) {
  const n = payload.notification || {};
  const d = payload.data || {};
  const title = n.title || d.title || '📢 MBTI 물류';
  const body = n.body || d.body || '';
  const isUrgent = d.urgent === 'true' || d.pinned === 'true';
  const tag = d.tag || 'mbti-' + Date.now();
  if (_isDuplicate(tag + title)) return;
  if (d.type === 'notice' && d.noticeId) {
    return fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/notices/' + d.noticeId)
      .then(function(res) {
        if (!res.ok) return;
        return _showBgNotification(title, body, isUrgent, tag, d, []);
      }).catch(function() {
        return _showBgNotification(title, body, isUrgent, tag, d, []);
      });
  }
  return _showBgNotification(title, body, isUrgent, tag, d,
    isUrgent ? [{ action: 'open', title: '✅ 확인하기' }, { action: 'close', title: '닫기' }] : []
  );
});

function _showBgNotification(title, body, isUrgent, tag, d, actions) {
  return self.registration.showNotification(title, {
    body, icon: ICON, badge: BADGE, tag, renotify: true,
    vibrate: isUrgent ? [700,120,700,120,700,500,700,120,700,120,700] : [500,150,500,400,500,150,500],
    requireInteraction: true, actions,
    data: { url: d.url || '/', type: d.type || '', tag, ...d }
  });
}

self.addEventListener('message', function(e) {
  if (!e.data) return;
  if (e.data.type === 'SHOW_NOTI') {
    const d = e.data.data || {};
    const isUrgent = !!d.urgent;
    self.registration.showNotification(d.title || '📢 MBTI 물류', {
      body: d.body || '', icon: ICON, badge: BADGE,
      tag: d.tag || 'mbti-' + Date.now(), renotify: true,
      vibrate: isUrgent ? [700,120,700,120,700,500,700,120,700,120,700] : [500,150,500,400,500,150,500],
      requireInteraction: isUrgent, data: { url: '/', cat: d.cat || '', ...d }
    });
  }
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(list) {
        for (let i = 0; i < list.length; i++) {
          if ('focus' in list[i]) {
            list[i].focus();
            list[i].postMessage({ type: 'NOTIFICATION_CLICK', data: e.notification.data });
            return list[i];
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

self.addEventListener('fetch', function(e) {
  const url = e.request.url;
  if (!url || url.includes('/undefined') || url.endsWith('undefined')) {
    e.respondWith(new Response('', {status:204})); return;
  }
  if (url.startsWith('chrome-extension://') || url.startsWith('chrome://') ||
      url.startsWith('blob:') || url.includes('firestore.googleapis.com') ||
      url.includes('firebase') || url.includes('googleapis.com') ||
      url.includes('gstatic.com') || e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(res) {
      if (res && res.status === 200) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('html') || ct.includes('javascript') || ct.includes('css')) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone).catch(()=>{}));
        }
      }
      return res;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
