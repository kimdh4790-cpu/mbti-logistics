importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
  authDomain:'mbti-logistics.firebaseapp.com',
  projectId:'mbti-logistics',
  storageBucket:'mbti-logistics.firebasestorage.app',
  messagingSenderId:'40761160761',
  appId:'1:40761160761:web:20545b610f03f534e949e8'
});

const messaging = firebase.messaging();

// 알림 타입별 아이콘·링크 매핑
const NOTIF_CONFIG = {
  settle:         { icon:'/icon-192.png', badge:'/icon-192.png', url:'/settle?page=settle',      title:'📊 정산 알림' },
  payslip:        { icon:'/icon-192.png', badge:'/icon-192.png', url:'/settle?page=hourly_settle',title:'💰 급여명세서' },
  attendance:     { icon:'/icon-192.png', badge:'/icon-192.png', url:'/settle?page=attendance',   title:'📱 출퇴근 알림' },
  attendance_missing:{ icon:'/icon-192.png', badge:'/icon-192.png', url:'/settle?page=attendance',title:'⏰ 미출근 알림' },
  leave:          { icon:'/icon-192.png', badge:'/icon-192.png', url:'/settle?page=leave',        title:'🌴 휴가 알림' },
  leave_approved: { icon:'/icon-192.png', badge:'/icon-192.png', url:'/settle?page=leave',        title:'✅ 휴가 승인' },
  notice:         { icon:'/icon-192.png', badge:'/icon-192.png', url:'/settle?page=notices',      title:'📢 공지 알림' },
  membership_expire:{ icon:'/icon-192.png', badge:'/icon-192.png', url:'/settle?page=customer',   title:'⏰ 회원권 만료' },
  pos:            { icon:'/icon-192.png', badge:'/icon-192.png', url:'/settle?page=kiosk',        title:'🖥️ POS 알림' },
  alert:          { icon:'/icon-192.png', badge:'/icon-192.png', url:'/settle',                   title:'🔔 DONWAY 알림' },
};

messaging.onBackgroundMessage(function(payload) {
  const data = payload.data || {};
  const type = data.type || 'alert';
  const cfg  = NOTIF_CONFIG[type] || NOTIF_CONFIG.alert;

  const title = (payload.notification && payload.notification.title) || cfg.title;
  const body  = (payload.notification && payload.notification.body)  || data.body || '';
  const url   = data.url || cfg.url;

  return self.registration.showNotification(title, {
    body:    body,
    icon:    cfg.icon,
    badge:   cfg.badge,
    tag:     'donway-' + type,
    renotify: true,
    silent:  false,
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: (type === 'leave' || type === 'payslip'),
    data:    { url: url, type: type },
    actions: [
      { action: 'open',  title: '확인하기' },
      { action: 'close', title: '닫기' }
    ]
  });
});

// 알림 클릭 → 해당 페이지로 이동
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'close') return;

  const url = (e.notification.data && e.notification.data.url) || '/settle';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(wins) {
      // 이미 열린 탭이 있으면 포커스 + 페이지 이동
      for (var i = 0; i < wins.length; i++) {
        if (wins[i].url.includes('donway.ai.kr') || wins[i].url.includes('localhost')) {
          wins[i].focus();
          wins[i].navigate(url);
          return;
        }
      }
      // 없으면 새 탭
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install',  function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(clients.claim()); });
