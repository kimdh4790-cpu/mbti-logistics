/*
 * firebase-messaging-sw.js — FCM 백그라운드 푸시 Service Worker
 * Copyright (c) 2024-2025 유한회사 엠비티아이
 *
 * ── 역할 ─────────────────────────────────────────────────────
 *   백그라운드(화면 꺼짐/다른 앱) 상태에서 FCM 푸시 수신
 *   알림 표시 (title, body, icon, badge, 진동)
 *   알림 탭 시 해당 페이지로 이동
 *
 * ── 알림 타입 (type) ──────────────────────────────────────────
 *   pickup    → 🔔 픽업 알림 (음식 준비완료, filo.ai.kr/order로 이동)
 *   receipt   → 🧾 결제 완료 (영수증, filo.ai.kr/order로 이동)
 *   settle    → 📊 정산 알림
 *   payslip   → 💰 급여명세서
 *   attendance → 📱 출퇴근 알림
 *   notice    → 📢 공지 알림
 *
 * ── FCM 발송 주체 ────────────────────────────────────────────
 *   Worker (_worker.js) → POST /fcm/notify-drivers
 *   → fcm.googleapis.com/v1/projects/mbti-logistics/messages:send
 *   payload: { tokens:[], title, body, type, url }
 *
 * ── 토큰 발급 ────────────────────────────────────────────────
 *   order.js _initFCM() → getToken(vapidKey, SW등록)
 *   → filo_orders.fcmToken에 저장
 *   → 직원이 준비완료/결제 시 이 토큰으로 발송
 *
 * ── notificationclick ────────────────────────────────────────
 *   이미 열린 탭 있으면 포커스 → url로 이동
 *   없으면 새 탭으로 열기
 *
 * ── Firebase 설정 ─────────────────────────────────────────────
 *   messagingSenderId: 40761160761
 *   appId: 1:40761160761:web:20545b610f03f534e949e8
 *   ⚠️ order.js Firebase 설정과 반드시 동일해야 함
 *
 * ── 마지막 수정: 2026-07-14 ──────────────────────────────────
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

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
  pickup:         { icon:'/filo-icon-192.png', badge:'/filo-icon-192.png', url:'/',              title:'🔔 픽업 알림' },
  receipt:        { icon:'/filo-icon-192.png', badge:'/filo-icon-192.png', url:'/',              title:'🧾 결제 완료' },
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
    tag:     'donway-' + type + '-' + Date.now(),
    renotify: true,
    silent:  false,
    vibrate: type === 'pickup'
      ? [500,100,500,100,500,100,500,100,1000]  // 픽업: 강하고 긴 진동 패턴
      : type === 'receipt'
      ? [400,100,400,100,400]                   // 영수증: 결제 완료 진동
      : [300, 100, 300, 100, 300],
    requireInteraction: (type === 'pickup' || type === 'leave' || type === 'payslip' || type === 'receipt'),
    data:    { url: url, type: type },
    actions: type === 'pickup'
      ? [{ action: 'open', title: '✅ 픽업하러 가기' }]
      : [
          { action: 'open',  title: '확인하기' },
          { action: 'close', title: '닫기' }
        ]
  });
});

// 알림 클릭 → 해당 페이지로 이동
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'close') return;

  const rawUrl = (e.notification.data && e.notification.data.url) || '/settle';
  const type   = (e.notification.data && e.notification.data.type) || '';
  // 상대경로면 절대경로로 보정
  const url = rawUrl.startsWith('http') ? rawUrl : (self.location.origin + rawUrl);

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(wins) {
      for (var i = 0; i < wins.length; i++) {
        var w = wins[i];
        // pickup/receipt: 이미 열린 order 탭이면 포커스만 (navigate 금지 — 주문완료 화면 유지)
        if ((type === 'pickup' || type === 'receipt') && w.url.includes('/order')) {
          w.focus();
          // onSnapshot이 끊겼을 수 있으니 postMessage로 픽업 팝업 강제 실행
          w.postMessage({ type: type });
          return;
        }
        // 그 외: 도메인 일치하면 포커스 + 이동
        if (w.url.includes('donway.ai.kr') || w.url.includes('filo.ai.kr') || w.url.includes('dine.ne.kr') || w.url.includes('localhost')) {
          w.focus();
          w.navigate(url);
          return;
        }
      }
      // 열린 탭 없으면 새 탭 — pickup/receipt는 #done 해시 붙여서 주문완료 화면 바로 복원
      var openUrl = ((type === 'pickup' || type === 'receipt') && !url.includes('#'))
        ? url + '#done'
        : url;
      return clients.openWindow(openUrl);
    })
  );
});

self.addEventListener('install',  function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(clients.claim()); });
