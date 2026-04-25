// ══════════════════════════════════════════════════════
// MBTI 물류관리 Service Worker
// FCM 백그라운드 푸시 + 오프라인 캐시 + 앱 업데이트 감지
// ══════════════════════════════════════════════════════

// Firebase SDK (compat) — FCM 백그라운드 메시지 처리용
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase 설정 (앱과 동일)
firebase.initializeApp({
  apiKey:            'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
  authDomain:        'mbti-logistics.firebaseapp.com',
  projectId:         'mbti-logistics',
  storageBucket:     'mbti-logistics.firebasestorage.app',
  messagingSenderId: '40761160761',
  appId:             '1:40761160761:web:20545b610f03f534e949e8'
});

const messaging = firebase.messaging();

// ── 백그라운드 / 종료 상태에서 FCM 메시지 수신 ──
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] 백그라운드 FCM 수신:', payload);

  var n   = payload.notification || {};
  var d   = payload.data          || {};
  var title   = n.title || d.title || '📬 새 알림';
  var body    = n.body  || d.body  || '관리자 알림이 도착했습니다';
  var isUrgent = d.urgent === 'true';

  var options = {
    body:               body,
    icon:               '/og_banner.jpg',
    badge:              '/og_banner.jpg',
    tag:                d.tag || ('mbti-' + Date.now()),
    renotify:           true,
    requireInteraction: isUrgent,
    vibrate:            [200, 100, 200, 100, 200],
    data:               { url: 'https://mbti-logistics.kimdh4790.workers.dev/', type: d.type || '' }
  };

  return self.registration.showNotification(title, options);
});

// ── 알림 클릭 → 앱 포커스 or 새 탭 ──
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url)
    || 'https://mbti-logistics.kimdh4790.workers.dev/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── 인라인 SHOW_NOTI 메시지 (포그라운드 알림용) ──
self.addEventListener('message', function(event) {
  if (!event.data) return;
  if (event.data.type === 'SHOW_NOTI') {
    var d = event.data.data || {};
    self.registration.showNotification(d.title || '알림', {
      body:               d.body   || '',
      icon:               d.icon   || '/og_banner.jpg',
      badge:              d.badge  || '/og_banner.jpg',
      tag:                d.tag    || ('mbti_' + Date.now()),
      renotify:           true,
      vibrate:            [200, 100, 200, 100, 200],
      requireInteraction: !!d.urgent,
      data:               { url: d.url || '/', cat: d.cat || '' }
    });
  }
  if (event.data.type === 'FLUSH_PENDING_WRITES') {
    // 메인 페이지에 위임
    clients.matchAll({ type: 'window' }).then(function(list) {
      list.forEach(function(c) { c.postMessage({ type: 'FLUSH_PENDING_WRITES' }); });
    });
  }
});

// ── SW 설치 / 활성화 ──
self.addEventListener('install',  function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
