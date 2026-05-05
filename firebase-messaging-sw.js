// ★ MBTI 물류관리 v9.29 — Firebase Cloud Messaging Service Worker
// 백그라운드/앱 종료 상태에서 FCM 푸시 알림 수신 처리
// ★ 반드시 서버 루트(/)에 이 파일 배포 필요 — FCM SDK가 /firebase-messaging-sw.js 자동 탐색
// Cloudflare Workers: workers.dev 루트에 이 파일 업로드

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

var messaging = firebase.messaging();

// ★ 백그라운드 메시지 수신 처리
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw] 백그라운드 메시지 수신:', payload);

  var title = (payload.notification && payload.notification.title)
    || (payload.data && payload.data.title)
    || '📢 MBTI 물류';
  var body = (payload.notification && payload.notification.body)
    || (payload.data && payload.data.body)
    || '';
  var urgent = payload.data && (payload.data.urgent === 'true' || payload.data.urgent === true);

  // ★ 중복 방지: title 기반 고정 tag
  var tag = 'mbti-' + title.replace(/\s/g, '-').substring(0, 30);

  self.registration.showNotification(title, {
    body: body,
    icon: '',   // ★ v9.29: icon-192.png 없으면 빈 문자열 (404 방지)
    badge: '',
    tag: tag,
    renotify: true,
    requireInteraction: !!urgent,
    vibrate: urgent
      ? [700, 120, 700, 120, 700, 500, 700, 120, 700, 120, 700]
      : [500, 150, 500, 400, 500, 150, 500],
    data: {
      url: payload.data && payload.data.url ? payload.data.url : '/',
      cat: payload.data && payload.data.cat ? payload.data.cat : ''
    }
  });
});

// ★ 알림 클릭 시 앱으로 포커스 이동
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var targetUrl = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
