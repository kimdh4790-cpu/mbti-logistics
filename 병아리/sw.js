// ★ MBTI 물류관리 v9.26 — Service Worker (FCM 백그라운드 완전 지원 + 진동최대화 + urgent지원)
// GitHub Pages: kimdh4790-cpu.github.io/mbti-logistics/sw.js

// ── Firebase 스크립트 임포트 (FCM 백그라운드 처리 필수)
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// ── Firebase 초기화
firebase.initializeApp({
  apiKey:            'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
  authDomain:        'mbti-logistics.firebaseapp.com',
  projectId:         'mbti-logistics',
  storageBucket:     'mbti-logistics.firebasestorage.app',
  messagingSenderId: '40761160761',
  appId:             '1:40761160761:web:20545b610f03f534e949e8'
});

const messaging = firebase.messaging();

// ── 아이콘 경로
// ★ v9.26: icon-192.png 서버에 없으면 빈 문자열 → 404 에러 방지
const ORIGIN = (self.location && self.location.origin) ? self.location.origin : 'https://mbti-logistics.kimdh4790.workers.dev';
const ICON  = '';   // icon-192.png 없으면 빈 문자열 유지 (404 방지). 아이콘 파일 배포 시 ORIGIN+'/icon-192.png' 로 변경
const BADGE = '';

// ── 캐시 버전
const CACHE = 'mbti-v9-26';

// ──────────────────────────────────────────
// 설치 / 활성화
// ──────────────────────────────────────────
self.addEventListener('install', e => {
  console.log('[SW] install v9.26');
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[SW] activate v9.26');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // ★ v9.26: SW 업데이트 감지 → 앱에 알려서 FCM 토큰 강제 재발급
        return self.clients.matchAll({type:'window', includeUncontrolled:true})
          .then(function(clients){
            clients.forEach(function(c){
              c.postMessage({type:'SW_UPDATED', version:'v9.26'});
            });
          });
      })
  );
});

// ──────────────────────────────────────────
// ★ FCM 백그라운드 메시지 처리
//    앱이 닫혀있거나 백그라운드일 때도 알림 표시
// ──────────────────────────────────────────
// ★ v9.22: 백그라운드 중복 알림 방지 (3분 TTL)
const _seenTags = new Map();
function _isDuplicate(tag) {
  const now = Date.now();
  if (_seenTags.has(tag) && (now - _seenTags.get(tag)) < 5 * 60 * 1000) return true;
  _seenTags.set(tag, now);
  return false;
}

messaging.onBackgroundMessage(function(payload) {
  console.log('[FCM SW] 백그라운드 수신:', payload);

  const n   = payload.notification || {};
  const d   = payload.data         || {};

  const title    = n.title || d.title || '📢 MBTI 물류';
  const body     = n.body  || d.body  || '';
  const isUrgent = d.urgent === 'true' || d.pinned === 'true';
  const tag      = d.tag   || 'mbti-' + Date.now();

  // 중복 수신 방지
  if (_isDuplicate(tag + title)) {
    console.log('[FCM SW] 중복 알림 무시:', tag);
    return;
  }

  // ★ v9.26: 삭제된 공지 차단 — noticeId 있으면 Firestore에서 존재 확인 후 표시
  if (d.type === 'notice' && d.noticeId) {
    return fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/notices/' + d.noticeId)
      .then(function(res) {
        if (!res.ok) {
          console.log('[FCM SW] 삭제된 공지 알림 차단:', d.noticeId);
          return; // 공지 없음 → 알림 표시 안 함
        }
        return _showBgNotification(title, body, isUrgent, tag, d, []);
      })
      .catch(function() {
        // 네트워크 오류 시 일단 표시
        return _showBgNotification(title, body, isUrgent, tag, d, []);
      });
  }

  return _showBgNotification(title, body, isUrgent, tag, d,
    isUrgent ? [{ action: 'open', title: '✅ 확인하기' }, { action: 'close', title: '닫기' }] : []
  );
});

function _showBgNotification(title, body, isUrgent, tag, d, actions) {
  return self.registration.showNotification(title, {
    body:              body,
    icon:              ICON,
    badge:             BADGE,
    tag:               tag,
    renotify:          true,
    vibrate:           isUrgent ? [700,120,700,120,700,500,700,120,700,120,700] : [500,150,500,400,500,150,500],
    requireInteraction:true,
    actions:           actions,
    data: {
      url:   d.url  || '/',
      type:  d.type || '',
      tag:   tag,
      ...d
    }
  });
}

// ──────────────────────────────────────────
// ★ 인앱 → SW 수동 알림 표시
//    포그라운드에서 sendLocalNoti()가 postMessage()로 호출
// ──────────────────────────────────────────
self.addEventListener('message', function(e) {
  if (!e.data) return;

  if (e.data.type === 'SHOW_NOTI') {
    const d        = e.data.data || {};
    const isUrgent = !!d.urgent;
    self.registration.showNotification(d.title || '📢 MBTI 물류', {
      body:              d.body  || '',
      icon:              ICON,
      badge:             BADGE,
      tag:               d.tag || 'mbti-' + Date.now(),
      renotify:          true,
      vibrate:           isUrgent ? [700,120,700,120,700,500,700,120,700,120,700] : [500,150,500,400,500,150,500],
      requireInteraction:isUrgent,
      data:              { url: '/', cat: d.cat || '', ...d }
    });
  }

  if (e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ──────────────────────────────────────────
// ★ 알림 클릭 → 앱 포커스 / 열기
// ──────────────────────────────────────────
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(list) {
        // 이미 열린 탭이 있으면 포커스
        for (let i = 0; i < list.length; i++) {
          if ('focus' in list[i]) {
            list[i].focus();
            // 탭에 클릭 이벤트 전달 (인앱 딥링크 처리용)
            list[i].postMessage({ type: 'NOTIFICATION_CLICK', data: e.notification.data });
            return list[i];
          }
        }
        // 탭 없으면 새로 열기
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

// ──────────────────────────────────────────
// 오프라인 캐시 (네트워크 우선)
// ──────────────────────────────────────────
self.addEventListener('fetch', function(e) {
  // chrome-extension / blob / 비GET 요청은 무시 (캐시 에러 방지)
  const url = e.request.url;
  if (url.startsWith('chrome-extension://') ||
      url.startsWith('chrome://') ||
      url.startsWith('blob:') ||
      url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('googleapis.com') ||
      url.includes('gstatic.com') ||
      e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        // HTML/JS/CSS만 캐시
        if (res && res.status === 200) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('html') || ct.includes('javascript') || ct.includes('css')) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone).catch(()=>{})); // ★ v9.26: put 에러 무시
          }
        }
        return res;
      })
      .catch(function() {
        return caches.match(e.request);
      })
  );
});
