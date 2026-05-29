// DONWAY Firebase Messaging Service Worker
// 푸시 알림 수신 및 표시 처리

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
  authDomain: 'mbti-logistics.firebaseapp.com',
  projectId: 'mbti-logistics',
  storageBucket: 'mbti-logistics.firebasestorage.app',
  messagingSenderId: '40761160761',
  appId: '1:40761160761:web:20545b610f03f534e949e8'
});

const messaging = firebase.messaging();

// 백그라운드 푸시 알림 수신
messaging.onBackgroundMessage(function(payload) {
  console.log('[DONWAY SW] 백그라운드 알림 수신:', payload);

  const data = payload.data || {};
  const type = data.type || 'alert';

  const notifTitle = payload.notification?.title || 'DONWAY 알림';
  const notifBody  = payload.notification?.body  || '';
  const brandTitle = 'DONWAY · ' + notifTitle;

  const options = {
    body: notifBody,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'donway-' + type + '-1',   // 첫 번째 알림 태그
    renotify: true,
    requireInteraction: type === 'join' || type === 'pay',
    vibrate: [300, 100, 300],
    data: { url: '/settle', type: type, payload: data },
    actions: [
      { action: 'open', title: '🔍 확인하기' },
      { action: 'close', title: '✕ 닫기' }
    ]
  };

  // ★ 첫 번째 알림 표시 후 1.5초 뒤 두 번째 알림
  return self.registration.showNotification(brandTitle, options)
    .then(function() {
      return new Promise(function(resolve) {
        setTimeout(resolve, 1500);
      });
    })
    .then(function() {
      return self.registration.showNotification(brandTitle, Object.assign({}, options, {
        tag: 'donway-' + type + '-2',  // 다른 태그로 두 번째 알림
        body: '🔔 ' + notifBody,       // 두 번째는 벨 이모지 추가
        vibrate: [300, 100, 300],
      }));
    });
});

// 알림 클릭 처리
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/settle';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (const client of clientList) {
          if (client.url.includes('donway') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// 서비스워커 설치/활성화
self.addEventListener('install', function(event) {
  console.log('[DONWAY SW] 설치 완료');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[DONWAY SW] 활성화 완료');
  event.waitUntil(clients.claim());
});
