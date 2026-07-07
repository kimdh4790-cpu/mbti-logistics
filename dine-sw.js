const CACHE = 'dine-v1';
const STATIC = ['/mbti'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(STATIC); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  /* Firebase/Firestore/CDN 요청은 캐시 안 함 */
  var url = e.request.url;
  if(url.includes('firestore') || url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic') || url.includes('cloudflare')){
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request);
    })
  );
});
