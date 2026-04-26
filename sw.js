// ══════════════════════════════════════════════════════
// MBTI 물류관리 Service Worker
// FCM 백그라운드 푸시 + 오프라인 캐시 + 앱 업데이트 감지
// ══════════════════════════════════════════════════════

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

// ── 알림 표시 공통 함수 ──
function showMbtiNoti(title, body, tag, isUrgent) {
  var options = {
    body:               body,
    icon:               '/og_banner.jpg',
    badge:              '/og_banner.jpg',
    tag:                tag || ('mbti-' + Date.now()),
    renotify:           true,
    requireInteraction: !!isUrgent,
    vibrate:            [300, 100, 300, 100, 500],
    data:               { url: 'https://mbti-logistics.kimdh4790.workers.dev/엠비티아이_물류관리_v9.html' }
  };
  // 열린 창에 소리 재생 요청
  self.clients.matchAll({type:'window'}).then(function(list){
    list.forEach(function(c){ c.postMessage({type:'PLAY_NOTI_SOUND'}); });
  });
  return self.registration.showNotification(title, options);
}

// ── 백그라운드 FCM 수신 ──
messaging.onBackgroundMessage(function(payload) {
  var n = payload.notification || {};
  var d = payload.data || {};
  var title = n.title || d.title || '📬 엠비티아이';
  var body  = n.body  || d.body  || '새 공지가 도착했습니다';
  return showMbtiNoti(title, body, d.tag, d.urgent === 'true');
});

// ── 알림 클릭 → 앱 포커스 ──
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url)
    || 'https://mbti-logistics.kimdh4790.workers.dev/엠비티아이_물류관리_v9.html';
  event.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
      for (var i=0; i<list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── 메시지 처리 (포그라운드 알림 + 소리) ──
self.addEventListener('message', function(event) {
  if (!event.data) return;
  if (event.data.type === 'SHOW_NOTI') {
    var d = event.data.data || {};
    showMbtiNoti(d.title||'알림', d.body||'', d.tag, d.urgent);
  }
  if (event.data.type === 'FLUSH_PENDING_WRITES') {
    clients.matchAll({type:'window'}).then(function(list){
      list.forEach(function(c){ c.postMessage({type:'FLUSH_PENDING_WRITES'}); });
    });
  }
});

// ── SW 설치 / 활성화 ──
self.addEventListener('install',  function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
