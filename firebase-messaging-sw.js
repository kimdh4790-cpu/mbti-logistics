// DONWAY Firebase Messaging Service Worker
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

messaging.onBackgroundMessage(function(payload) {
  const data = payload.data || {};
  const type = data.type || 'alert';
  const notifTitle = (payload.notification && payload.notification.title) || 'DONWAY 알림';
  const notifBody  = (payload.notification && payload.notification.body)  || '';
  const vibPat = [200,100,200,100,200,100,200,100,200,100,200];
  const options = {
    body: notifBody,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'donway-' + type,
    renotify: true,
    requireInteraction: type === 'join' || type === 'pay',
    vibrate: vibPat,
    data: { url: '/settle', type: type },
    actions: [
      { action: 'open', title: '확인하기' },
      { action: 'close', title: '닫기' }
    ]
  };
  return self.registration.showNotification('DONWAY · ' + notifTitle, options)
    .then(function(){
      return clients.matchAll({ type:'window', includeUncontrolled:true });
    })
    .then(function(clientList){
      clientList.forEach(function(client){
        client.postMessage({ type:'DONWAY_NOTIFY', notifType:type, title:notifTitle, body:notifBody });
      });
    });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'close') return;
  const url = (event.notification.data && event.notification.data.url) || '/settle';
  event.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true })
      .then(function(clientList){
        for (var i=0; i<clientList.length; i++){
          var client = clientList[i];
          if (client.url.indexOf('donway')>=0 && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(event){ event.waitUntil(clients.claim()); });
