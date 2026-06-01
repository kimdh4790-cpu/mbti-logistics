importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',authDomain:'mbti-logistics.firebaseapp.com',projectId:'mbti-logistics',storageBucket:'mbti-logistics.firebasestorage.app',messagingSenderId:'40761160761',appId:'1:40761160761:web:20545b610f03f534e949e8'});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(function(payload){
  const data=payload.data||{};const type=data.type||'alert';
  const title='DONWAY '+(payload.notification&&payload.notification.title||'알림');
  const body=(payload.notification&&payload.notification.body)||'';
  return self.registration.showNotification(title,{body:body,icon:'/icon-192.png',badge:'/icon-192.png',tag:'donway-'+type,renotify:true,vibrate:[200,100,200]});
});
self.addEventListener('notificationclick',function(e){e.notification.close();if(e.action==='close')return;e.waitUntil(clients.openWindow('/settle'));});
self.addEventListener('install',function(){self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(clients.claim());});
