/**
 * @module      filo-auth.js
 * ══════════════════════════════════════════════════════
 * 역할: 로그인·회원가입·권한관리·사이드바 빌드
 *
 * 주요 함수:
 *   _filoLogin()           — 로그인
 *   _filoLogout()          — 로그아웃
 *   _buildFiloNav()        — 사이드바 메뉴 동적 생성
 *   _filoGoPage(p)         — 페이지 전환
 *
 * 확정 메뉴 (2026-07-15):
 *   홈 → 대시보드
 *   🛒 판매 → POS결제/메뉴관리/주문대기/배달주문
 *   📦 재고 → 재고현황/레시피원가/자동발주
 *   🏪 운영 → 직원QR/테이블QR/예약달력
 *   ⚙️ 설정 → 세무사연동/설정/구독관리
 *
 * ⚠️ 새 페이지 추가 시:
 *   1) _buildFiloNav() 메뉴 배열에 항목 추가
 *   2) _filoGoPage() if/else 분기 추가
 *   3) 해당 JS 파일 + Worker + deploy.yml 동시 등록
 * ══════════════════════════════════════════════════════
 */
// filo-common.js에서 분리됨 (리팩토링 2026-07-13)


// ── JS 파일 동적 로드 후 콜백 실행 ─────────────────────────────
function _filoLoadAndRun(jsFile, callback) {
  // 이미 로드됐으면 바로 실행
  if(document.querySelector('script[data-filo="'+jsFile+'"]')) {
    if(typeof callback === 'function') callback();
    return;
  }
  var s = document.createElement('script');
  s.src = '/' + jsFile + '?v=' + Date.now();
  s.setAttribute('data-filo', jsFile);
  s.onload = function() { if(typeof callback === 'function') callback(); };
  s.onerror = function() { console.error('로드 실패:', jsFile); };
  document.head.appendChild(s);
}

function esc(s){if(!s)return'';var d=document.createElement('div');d.textContent=String(s);return d.innerHTML;}
function _initFirebase(){
 if(_fbApp)return;
 try{
 var cfg={
 apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
 authDomain:'mbti-logistics.firebaseapp.com',
 projectId:'mbti-logistics',
 storageBucket:'mbti-logistics.appspot.com',
 messagingSenderId:'862900137263',
 appId:'1:40761160761:web:20545b610f03f534e949e8'
 };
 _fbApp=firebase.initializeApp(cfg);
 _db=firebase.firestore();
 _auth=firebase.auth();
 _auth.onAuthStateChanged(function(u){
 if(u){
 _CU={uid:u.uid,email:u.email};
 _loadCompany(u.uid);
 } else {
 _CU=null;
 document.getElementById('login-screen').style.display='flex';
 var _appEl2=document.getElementById('app');_appEl2.style.display='none';_appEl2.classList.remove('logged-in');
 }
 });
 }catch(e){console.error('Firebase init:',e);}
}


// ── 슬러그 기반 회사 데이터 로딩 헬퍼 ─────────────────────────────
function _loadCompanyByDealer(dealerId, uid, role){
 _db.collection('companies').doc(dealerId).get().then(function(snap){
  var data = snap.exists ? snap.data() : {};
  _cachedCompanyDoc = data;
  _CU.dealerId = dealerId;
  _CU.role = role || data.role || 'dealer';
  _CU.companyName = data.companyName || data.name || '';
  _showApp();
 }).catch(function(){ _showApp(); });
}

function _loadCompany(uid){
 // ── 슬러그 기반 dealerId 체크 ────────────────────────────────
 // /slug 접속 시 해당 매장 dealerId만 허용
 var _targetDealer = window.__FILO_DEALER_ID__ || '';
 if(_targetDealer && _targetDealer !== uid){
  // 직원(members)이면 허용, 관리자면 차단
  _db.collection('members').where('uid','==',uid).where('dealerId','==',_targetDealer).limit(1).get()
   .then(function(ms){
    if(!ms.empty){
     // 직원으로 해당 매장 소속 → 해당 매장 dealerId로 로딩
     _loadCompanyByDealer(_targetDealer, uid, 'member');
    } else {
     // 다른 회사 관리자 → 자기 회사로 로딩 (슬러그 무시)
     _loadCompanyByDealer(uid, uid, 'dealer');
    }
   }).catch(function(){ _loadCompanyByDealer(uid, uid, 'dealer'); });
  return;
 }
 _db.collection('companies').doc(uid).get().then(function(snap){
 var data=snap.exists?snap.data():{};
 _cachedCompanyDoc=data;
 _CU.dealerId=data.dealerId||uid;
 _CU.role=data.role||'dealer';
 _CU.companyName=data.companyName||data.name||'';
 if(!snap.exists){
 _db.collection('members').where('uid','==',uid).limit(1).get().then(function(ms){
 if(!ms.empty){
 var m=ms.docs[0].data();
 _CU.dealerId=m.dealerId||uid;
 _CU.role='member';
 _CU.name=m.name||m.driverName||'';
 _db.collection('companies').doc(_CU.dealerId).get().then(function(cs){
 _cachedCompanyDoc=cs.exists?cs.data():{};
 _showApp();
 });
 } else { _showApp(); }
 });
 } else { _showApp(); }
 }).catch(function(){ _showApp(); });
}

function _showApp(){
 /* 매장 테마 적용 — _cachedCompanyDoc은 이 시점에 채워져 있다.
    theme이 없는 기존 매장은 other(기존 퍼플)로 떨어져 화면이 그대로 유지된다. */
 try{ if(typeof _filoApplyTheme==='function') _filoApplyTheme(_cachedCompanyDoc||{}); }catch(e){}
 document.getElementById('login-screen').style.display='none';
 var _appEl=document.getElementById('app');_appEl.style.display='flex';_appEl.classList.add('logged-in');
 if(window.innerWidth<=768){
  var sb=document.getElementById('sidebar');
  if(sb)sb.classList.remove('open');
 } else {
  if(localStorage.getItem('filo_sidebar_collapsed')==='1'){
   var sb2=document.getElementById('sidebar');
   var wrap2=document.getElementById('content-wrap');
   var cont2=document.getElementById('content');
   if(sb2)sb2.classList.add('collapsed');
   if(wrap2){wrap2.style.marginLeft='52px';wrap2.style.width='calc(100% - 52px)';}
   if(cont2)cont2.style.marginLeft='52px';
  }
 }
 var company=_cachedCompanyDoc.companyName||_cachedCompanyDoc.name||'내 회사';
 var role=_CU.role==='member'?'직원':'관리자';
 var nc=document.getElementById('nav-company');if(nc)nc.textContent=company;
 var nr=document.getElementById('nav-role');if(nr)nr.textContent=role;
 /* 실시간 시계 */
 if(!window._clockInterval){
  window._clockInterval=setInterval(function(){
   var now=new Date();
   var hh=now.getHours().toString().padStart(2,'0');
   var mm=now.getMinutes().toString().padStart(2,'0');
   var ss=now.getSeconds().toString().padStart(2,'0');
   var el=document.getElementById('sidebar-clock');
   if(el)el.textContent=hh+':'+mm+':'+ss;
   var topClock=document.getElementById('topbar-clock');
   if(topClock)topClock.textContent=hh+':'+mm+':'+ss;
  },1000);
 }
 var prof=document.getElementById('sidebar-profile');
 if(prof){
  var now2=new Date();
  var hh=now2.getHours().toString().padStart(2,'0');
  var mi2=now2.getMinutes().toString().padStart(2,'0');
  prof.innerHTML=
  '<div style="padding:16px 14px 14px">'+
   '<div style="display:flex;align-items:center;gap:11px">'+
    '<div style="width:38px;height:38px;border-radius:11px;background:#08101f;border:1px solid rgba(201,168,76,.4);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#c9a84c;flex-shrink:0">'+esc(company.slice(0,1))+'</div>'+
    '<div style="min-width:0;flex:1">'+
     '<div style="font-size:13px;font-weight:800;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.2px">'+esc(company)+'</div>'+
     '<span style="display:inline-flex;align-items:center;margin-top:4px;padding:1px 7px;border-radius:99px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);font-size:9px;font-weight:800;color:#c9a84c;letter-spacing:.6px">'+role+'</span>'+
    '</div>'+
    '<div style="font-size:11px;font-weight:700;color:var(--t3);letter-spacing:.5px;font-variant-numeric:tabular-nums;flex-shrink:0">'+hh+':'+mi2+'</div>'+
   '</div>'+
   '<div style="margin-top:14px;height:1px;background:linear-gradient(90deg,rgba(201,168,76,.3),rgba(201,168,76,.1),transparent)"></div>'+
  '</div>';
 }
 _buildFiloNav();
 _filoGoPage('home');
 // 업종 데모 로그인 시 해당 딜러로 자동 전환
 var _demoPending=localStorage.getItem('_demoType');
 if(_demoPending){
  localStorage.removeItem('_demoType');
  setTimeout(function(){ _switchDemoDealer('demo_'+_demoPending); },600);
 }
 // FILO ↔ DINE 실시간 연동 시작
 setTimeout(function(){
  if(typeof _filoWatchDineReservations==='function')_filoWatchDineReservations();
  if(typeof _filoWatchDineSales==='function')_filoWatchDineSales();
 },1500);
 // FCM 토큰 등록 (filo.ai.kr 도메인으로 알림 발신)
 setTimeout(_initFiloFCM, 2000);
}

function _initFiloFCM(){
 if(!('Notification' in window) || !_CU || !_CU.dealerId) return;
 var did = _CU.dealerId;
 var companyName = _CU.companyName || (_cachedCompanyDoc && (_cachedCompanyDoc.companyName||_cachedCompanyDoc.name)) || 'FILO';
 if(Notification.permission === 'denied') return;
 navigator.serviceWorker.register('/firebase-messaging-sw.js', {scope:'/'})
  .then(function(reg){ return reg.update().then(function(){ return reg; }); })
  .then(function(reg){
   return firebase.messaging().getToken({
    vapidKey:'BHO3mU6K2VlLkYfUgsunV5zXsx6oOc_I4dIyE9ErYPBZE5AkBhPP-HUmQhqvHLDsbjcRgEDsMbXg0TYiSiKW93c',
    serviceWorkerRegistration: reg
   });
  }).then(function(tok){
   if(!tok) return;
   try{ localStorage.setItem('filo_fcm_'+did, tok); }catch(e){}
   return _db.collection('companies').doc(did).update({
    fcmTokens: firebase.firestore.FieldValue.arrayUnion(tok),
    fcmToken: tok,
    fcmCompanyName: companyName
   });
  }).catch(function(e){ console.log('[FILO FCM]', e.message); });
}

/* ── 라인 아이콘 헬퍼 (Lucide 24px 기준) ── */
function _svgIcon(n){
 var s='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">';
 var p={
  home:'<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>',
  monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  bell:'<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  truck:'<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  'bar-chart':'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  list:'<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  package:'<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  flask:'<path d="M10 2v7.31L5.72 15a3 3 0 001.22 5H17a3 3 0 001.22-5L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/>',
  refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
  'user-check':'<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>',
  tag:'<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  users:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  'user-plus':'<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
  star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'trending-up':'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  'pie-chart':'<path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>',
  sliders:'<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  'credit-card':'<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  cpu:'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
  megaphone:'<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/>',
  archive:'<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
  menu:'<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  /* 2026 AI·POS 아이콘 확장 */
  sparkles:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  'chevron-down':'<polyline points="6 9 12 15 18 9"/>',
  'qr-code':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/>',
  receipt:'<path d="M4 2v20l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22V2l-2.5 1.5L14 2l-2.5 1.5L9 2 6.5 3.5z"/><line x1="8" y1="8" x2="15" y2="8"/><line x1="8" y1="12" x2="15" y2="12"/>',
  utensils:'<path d="M4 2v7a3 3 0 003 3v10"/><line x1="4" y1="2" x2="7" y2="2"/><line x1="7" y1="2" x2="7" y2="9"/><path d="M18 2c-1.7 1.2-2.5 3-2.5 5.5S16.3 12 18 13v9"/>',
  gift:'<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>',
  'layout-dashboard':'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  activity:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  wallet:'<path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 000 4h14a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2V7"/><circle cx="17" cy="12" r="1"/>',
  mic:'<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
  eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':'<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>',
  construction:'<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/>',
 };
 return s+(p[n]||p['sliders'])+'</svg>';
}

/* ═══════════════════════════════════════════════════════
   FILO AI 제품군 — 2026 통합 브랜딩
   Toast IQ / Square AI 처럼 기능마다 고정 브랜드를 부른다.
   AIVO    : 매출·마진·원가 경영 인사이트
   STAFFIQ : 근태·인력·급여 분석
   GUESTAI : 회원·단골·CRM
═══════════════════════════════════════════════════════ */
var FILO_AI={
 AIVO:    {name:'AIVO',   ic:'sparkles',   color:'#8b5cf6'},  // violet — 매출·마진·AI
 STAFFIQ: {name:'STAFFIQ',ic:'user-check', color:'#22d3ee'},  // cyan — 근태·인력
 GUESTAI: {name:'GUESTAI',ic:'gift',       color:'#34d399'}   // emerald — 회원·CRM
};
function _filoAiBadge(key,size){
 var b=FILO_AI[key]||FILO_AI.AIVO;
 var sz=size||9;
 return '<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:999px;'+
  'background:'+b.color+'22;border:1px solid '+b.color+'44;color:'+b.color+';'+
  'font-size:'+sz+'px;font-weight:800;letter-spacing:.5px;vertical-align:middle">'+b.name+'</span>';
}

function _buildFiloNav(){
 var d=_cachedCompanyDoc||{};
 var subs=d.subscriptions||{};
 var today=_today();
 function hasSub(k){
  if(k!=='combo'){var cs=subs['combo']||{};if(cs.active&&(!cs.expiry||cs.expiry>=today))return true;}
  var s=subs[k]||{};return !!(s.active&&(!s.expiry||s.expiry>=today));
 }
 var isAdmin=(_CU.role!=='member');
 var isSA=SUPER_ADMIN_EMAILS.indexOf(_CU.email||'')>=0;
 var hasAll=isSA||hasSub('combo');

 // ── 슈퍼어드민 관리 바 ──────────────────────────────────────
 if(isSA){
  var _bar=document.getElementById('demo-admin-bar');
  if(!_bar){
   _bar=document.createElement('div');
   _bar.id='demo-admin-bar';
   _bar.innerHTML=
    '<span style="color:var(--t3);flex-shrink:0">매장:</span>'+
    '<strong id="demo-dealer-disp" style="color:var(--acc);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0">'+esc(_CU.dealerId||'')+'</strong>'+
    '<select id="demo-dealer-sel" onchange="_switchDemoDealer(this.value)" style="background:var(--surface2);border:1px solid var(--bd2);border-radius:6px;color:var(--tx);font-size:11px;padding:2px 8px;cursor:pointer;flex-shrink:0">'+
     '<option value="">데모 선택</option>'+
     '<option value="demo_cafe">카페</option>'+
     '<option value="demo_korean">한식당</option>'+
     '<option value="demo_japanese">일식당</option>'+
     '<option value="demo_snack">분식</option>'+
     '<option value="demo_western">양식당</option>'+
     '<option value="demo_bakery">베이커리</option>'+
    '</select>'+
    '<input id="sa-did-input" placeholder="딜러ID 직접입력" '+
     'onkeydown="if(event.key===\'Enter\')_switchDemoDealer(this.value.trim())" '+
     'style="flex:1;min-width:80px;background:var(--surface2);border:1px solid var(--bd2);border-radius:6px;color:var(--tx);font-size:11px;padding:2px 8px;outline:none">'+
    '<button onclick="_switchDemoDealer(document.getElementById(\'sa-did-input\').value.trim())" '+
     'style="background:var(--acc);border:none;border-radius:6px;color:#08101f;font-size:11px;font-weight:700;padding:3px 10px;cursor:pointer;flex-shrink:0">이동</button>'+
    '<button onclick="_filoDemoInit()" '+
     'style="background:transparent;border:1px solid var(--bd2);border-radius:6px;color:var(--t3);font-size:11px;padding:3px 10px;cursor:pointer;flex-shrink:0">초기화</button>';
   var _appEl3=document.getElementById('app');
   if(_appEl3) _appEl3.insertBefore(_bar,_appEl3.firstChild);
  } else {
   var _disp=document.getElementById('demo-dealer-disp');
   if(_disp) _disp.textContent=_CU.dealerId||'';
   var _dsel=document.getElementById('demo-dealer-sel');
   if(_dsel) _dsel.value=(_CU.dealerId||'').startsWith('demo_')?_CU.dealerId:'';
  }
 }

 // ── 관제센터 services 배열 기반 기능 on/off ──────────────────
 var _services = d.services || [];
 function hasFeature(key) {
  if(hasAll) return true;           // 슈퍼어드민·콤보 구독은 전부 허용
  if(_services.includes(key)) return true;  // 관제센터에서 켠 기능
  return false;
 }

 var menus=[];

 /* ── 홈 (항상) ── */
 menus.push({s:'홈',items:[{ic:'layout-dashboard',l:'대시보드',p:'home'}]});

 /* ── 주문·매출 ── */
 var _sales=[];
 if(hasAll||hasSub('kiosk')||hasFeature('kiosk')){
  _sales.push({ic:'monitor',l:'POS 결제',p:'kiosk'});
  _sales.push({ic:'bell',l:'주문 대기',p:'orders'});
  _sales.push({ic:'truck',l:'배달 주문',p:'delivery'});
  _sales.push({ic:'receipt',l:'매출 집계',p:'pos_report'});
 }
 _sales.push({ic:'sparkles',l:'AIVO 어시스턴트',p:'ai',badge:'AIVO'});
 menus.push({s:'주문·매출',items:_sales});

 /* ── 메뉴·테이블 ── */
 var _menuTable=[];
 if(isAdmin&&(hasAll||hasSub('kiosk')||hasFeature('kiosk')||hasFeature('table_order'))){
  _menuTable.push({ic:'utensils',l:'메뉴 관리',p:'menu_mgmt'});
 }
 if(hasAll||hasFeature('table_order')||hasSub('kiosk')){
  _menuTable.push({ic:'grid',l:'테이블 현황',p:'table_qr'});
  _menuTable.push({ic:'qr-code',l:'테이블 QR',p:'qr_mgmt'});
  if(hasAll||hasFeature('bakery_qr'))_menuTable.push({ic:'archive',l:'빵·디저트 QR',p:'bakery_qr_mgmt'});
 }
 if(_menuTable.length)menus.push({s:'메뉴·테이블',items:_menuTable});

 /* ── 재고 ── */
 if(hasAll||hasSub('inventory')||hasFeature('inventory')){
  menus.push({s:'재고',items:[
   {ic:'package',l:'재고 현황',p:'inventory'},
   {ic:'flask',l:'레시피·원가',p:'recipe'},
   {ic:'refresh',l:'자동 발주',p:'auto_order'},
  ]});
 }

 /* ── 직원·급여 ── */
 var _staff=[];
 if(hasAll||hasFeature('qr_attend')){
  _staff.push({ic:'qr-code',l:'STAFFIQ 근태 QR',p:'qr_staff',badge:'STAFFIQ'});
  _staff.push({ic:'activity',l:'출퇴근 현황',p:'attendance'});
  _staff.push({ic:'briefcase',l:'급여 명세서',p:'payroll'});
  _staff.push({ic:'calendar',l:'근무표',p:'work_schedule'});
 }
 if(_staff.length)menus.push({s:'직원·급여',items:_staff});

 /* ── 회원·예약 ── */
 var _crm=[];
 if(hasAll||hasFeature('member_crm')){
  _crm.push({ic:'user-plus',l:'GUESTAI 회원',p:'members',badge:'GUESTAI'});
  _crm.push({ic:'gift',l:'포인트·멤버십',p:'membership'});
 }
 if(hasAll||hasFeature('reservation')){
  _crm.push({ic:'calendar',l:'예약·달력',p:'schedule'});
  _crm.push({ic:'clock',l:'웨이팅',p:'waiting'});
 }
 if(_crm.length)menus.push({s:'회원·예약',items:_crm});

 /* ── 분석 ── */
 var _analytics=[];
 if(hasAll||hasFeature('sales_analytics')){
  _analytics.push({ic:'trending-up',l:'매출 리포트',p:'sales'});
  _analytics.push({ic:'pie-chart',l:'AIVO 마진 분석',p:'margin',badge:'AIVO'});
 }
 if(isAdmin)_analytics.push({ic:'briefcase',l:'세무사 연동',p:'tax_share'});
 if(_analytics.length)menus.push({s:'분석',items:_analytics});

 /* ── 설정 ── */
 var _settings=[
  {ic:'sliders',l:'설정',p:'settings'},
  {ic:'credit-card',l:'구독 관리',p:'subscription'},
 ];
 if(isAdmin)_settings.push({ic:'megaphone',l:'공지사항',p:'notices'});
 menus.push({s:'설정',items:_settings});

 var html='';
 var _storedNav=localStorage.getItem('filo_nav_closed2');
 var _closedG=_storedNav!==null?JSON.parse(_storedNav):[0,1,2,3,4,5,6,7,8,9];
 try{if(_storedNav===null)localStorage.setItem('filo_nav_closed2',JSON.stringify([0,1,2,3,4,5,6,7,8,9]));}catch(e){}

 menus.forEach(function(g,gi){
  var isClosed=_closedG.indexOf(gi)>=0;
  var labelCls='ns-label ns-toggle'+(isClosed?' collapsed':'');
  var arrowTxt=isClosed?'▸':'▾';
  var groupStyle=isClosed?' style="max-height:0;overflow:hidden"':'';

  html+='<div class="'+labelCls+'" onclick="_toggleNavGroup('+gi+',this)" data-gi="'+gi+'">'+
   '<span>'+g.s+'</span><span class="ns-arrow ns-chevron">'+_svgIcon('chevron-down')+'</span></div>';
  html+='<div class="ns-group" id="nav-g-'+gi+'"'+groupStyle+'>';

  g.items.forEach(function(m){
   var aiBrand=FILO_AI[m.badge];
   var badgeHtml='';
   if(m.badge){
    if(aiBrand){
     badgeHtml='<span class="ni-new ni-ai-badge" style="background:'+aiBrand.color+'22;border:1px solid '+aiBrand.color+'44;color:'+aiBrand.color+';padding:1px 5px;border-radius:20px;font-size:8px;font-weight:900;letter-spacing:.4px;margin-left:auto">'+m.badge+'</span>';
    } else {
     badgeHtml='<span class="ni-new">'+m.badge+'</span>';
    }
   }
   html+='<div class="ni'+(m.cls?' '+m.cls:'')+'" id="nav-'+m.p+'" onclick="_filoGoPage(\''+m.p+'\')" title="'+esc(m.l)+'">'
   +'<span class="ni-icon">'+_svgIcon(m.ic)+'</span>'
   +'<span class="ni-label" style="min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+m.l+'</span>'
   +badgeHtml
   +'</div>';
  });
  html+='</div>';
 });

 document.getElementById('nav-menu').innerHTML=html;
}

function _toggleNavGroup(gi,el){

 var group=document.getElementById('nav-g-'+gi);

 if(!group)return;

 var closing=!el.classList.contains('collapsed');

 el.classList.toggle('collapsed',closing);

 if(closing){

  group.style.maxHeight=group.scrollHeight+'px';

  group.offsetHeight;

  group.style.transition='max-height .25s ease';

  group.style.maxHeight='0';

  group.style.overflow='hidden';

 } else {

  group.style.overflow='';

  group.style.transition='max-height .25s ease';

  group.style.maxHeight=group.scrollHeight+'px';

  setTimeout(function(){group.style.maxHeight='none';},300);

 }

 var saved=JSON.parse(localStorage.getItem('filo_nav_closed2')||'[]');

 if(closing&&saved.indexOf(gi)<0)saved.push(gi);

 else saved=saved.filter(function(x){return x!==gi;});

 localStorage.setItem('filo_nav_closed2',JSON.stringify(saved));

}

function _toggleSidebar(){
 var sb=document.getElementById('sidebar');
 var btn=document.getElementById('sidebar-toggle');
 var ov=document.getElementById('sidebar-overlay');
 var isMobile=window.innerWidth<=768;
 if(isMobile){
  /* 모바일: 열기/닫기 */
  var isOpen=sb.classList.toggle('open');
  if(btn)btn.innerHTML=isOpen?_svgIcon('x'):_svgIcon('menu');
  if(ov)ov.style.display=isOpen?'block':'none';
 } else {
  /* 데스크탑: 축소/확장 */
  var isCollapsed=sb.classList.toggle('collapsed');
  var wrap=document.getElementById('content-wrap');
  var content2=document.getElementById('content');
  if(isCollapsed){
   if(wrap){wrap.style.marginLeft='52px';wrap.style.width='calc(100% - 52px)';}
   if(content2){content2.style.marginLeft='52px';}
   if(btn)btn.innerHTML=_svgIcon('menu');
  } else {
   if(wrap){wrap.style.marginLeft='var(--sidebar-w)';wrap.style.width='calc(100% - var(--sidebar-w))';}
   if(content2){content2.style.marginLeft='var(--sidebar-w)';}
   if(btn)btn.innerHTML=_svgIcon('menu');
  }
  localStorage.setItem('filo_sidebar_collapsed', isCollapsed?'1':'0');
 }
}

function _filoGoPage(p){
 /* 페이지 전환 시 이전 화면의 실시간 리스너를 모두 해제한다 (리스너 누수 방지) */
 _filoReleaseWatchers(p);
 var sb=document.getElementById('sidebar');
 if(sb&&sb.classList.contains('open')&&window.innerWidth<=768){
  sb.classList.remove('open');
  var btn=document.getElementById('sidebar-toggle');
  if(btn)btn.innerHTML=_svgIcon('menu');
  var ov=document.getElementById('sidebar-overlay');
  if(ov)ov.style.display='none';
 }
 /* CSS는 .ni.active 로 활성 스타일을 정의한다 — 'on' 만 붙이면 하이라이트가 안 뜬다 */
 document.querySelectorAll('.ni').forEach(function(el){el.classList.remove('on');el.classList.remove('active');});
 var nav=document.getElementById('nav-'+p);
 if(nav){
  nav.classList.add('on');nav.classList.add('active');
  /* 현재 페이지가 속한 그룹 자동 열기 */
  var grp=nav.parentElement;
  if(grp&&grp.classList.contains('ns-group')&&(grp.style.maxHeight==='0px'||grp.style.maxHeight==='0'||grp.style.overflow==='hidden')){
   var lbl=grp.previousElementSibling;
   if(lbl&&lbl.dataset.gi!==undefined){_toggleNavGroup(parseInt(lbl.dataset.gi),lbl);}
  }
 }
 document.getElementById('sidebar').classList.remove('open');

 var el=document.getElementById('content');
 var titles={home:'대시보드',members:'직원 관리',schedule:'달력',
 inventory:'재고 대시보드',stock_in:'입고 등록',stock_out:'출고 등록',
 auto_order:'자동 발주',sales_report:'매출·마진',recipe:'레시피 관리',qr_staff:'직원 QR (동적)',table_qr:'테이블 QR',table_mgmt:'테이블 관리',delivery:'배달 주문',schedule:'예약·달력',tax_share:'세무사 연동',member_qr:'회원 QR',cost_mgmt:'원가 관리',
 attendance:'QR 출퇴근',attend_dash:'출퇴근 현황',payroll:'급여 현황',roster:'근무표',
 kiosk:'POS 키오스크',orders:'주문 대기',table_qr:'테이블 QR',points:'포인트 관리',membership:'회원권',pos_report:'매출 집계',
 tax_share:'세무사 연동',notices:'공지사항',settings:'설정',subscription:'구독 관리',
 ai:'AIVO 어시스턴트',waiting:'웨이팅 관리',menu_mgmt:'메뉴 관리',qr_mgmt:'테이블 QR 관리',qr_staff:'STAFFIQ 근태 QR',
 bakery_qr_mgmt:'빵·디저트 QR',inv_dash:'재고 대시보드',margin:'마진 분석',sales:'매출 리포트',expiry:'유통기한 관리'};
 document.getElementById('topbar-title').textContent=titles[p]||p;

 /* 라우팅 처리 여부 — 미처리 페이지는 아래에서 '준비 중' 안내를 그린다 */
 var _routed=true;

 if(p==='home') _filoPageHome(el);
 else if(p==='ai') _filoPageAI(el);
 else if(p==='kiosk') _filoPageKiosk(el);
 else if(p==='menu_mgmt') _filoPageMenuMgmt(el);
 else if(p==='qr_mgmt') {
  _filoLoadAndRun('filo-menu-mgmt.js', function(){ _filoPageQrMgmt(el); });
 }
 else if(p==='bakery_qr_mgmt') {
  _filoLoadAndRun('filo-menu-mgmt.js', function(){ _filoBakeryQrMgmt(el); });
 }
 else if(p==='orders') _filoPageOrders(el);
 else if(p==='delivery') _filoPageDelivery(el);
 else if(p==='sales_report') _filoPageSales(el);
 else if(p==='pos_report') _filoPagePosReport(el);
 else if(p==='inventory') _filoPageInventory(el);
 else if(p==='inv_dash'){ _filoLoadAndRun('filo-inventory.js',function(){_filoPageInventoryDash(el);}); }
 else if(p==='stock_in') _filoPageStockIn(el);
 else if(p==='stock_out') _filoPageStockOut(el);
 else if(p==='auto_order') _filoPageAutoOrder(el);
 else if(p==='recipe') _filoPageRecipe(el);
 else if(p==='expiry') _filoPageExpiry(el);
 else if(p==='members') _filoPageMembers(el);
 else if(p==='attend_dash') _filoPageAttendDash(el);
 else if(p==='payroll') _filoPagePayroll(el);
 else if(p==='payroll_dine'){ var slug=(_CU&&_CU.dineSlug)||''; var k=slug||(_CU&&(_CU.companyName||_CU.name))||''; var url=k?'https://dine.ne.kr/'+encodeURIComponent(k)+'#payroll':'https://dine.ne.kr/app'; window.open(url,'_blank'); }
 else if(p==='roster') _filoPageRoster(el);
 else if(p==='qr_staff') _filoPageStaffQR(el);
 else if(p==='member_qr') _filoPageMemberQR(el);
 else if(p==='table_qr') _filoPageTableQR(el);
 else if(p==='table_mgmt') _filoPageTableMgmt(el);
 else if(p==='points') _filoPagePoints(el);
 else if(p==='membership') _filoPageMembership(el);
 else if(p==='schedule') _filoPageSchedule(el);
 else if(p==='waiting'){ _filoLoadAndRun('filo-booking.js',function(){_filoPageWaiting(el);}); }
 else if(p==='tax_share') _filoPageTaxShare(el);
 else if(p==='notices') _filoPageNotices(el);
 else if(p==='settings') _filoPageSettings(el);
 else if(p==='subscription') _filoPageSubscription(el);
 else if(p==='cost_mgmt') _filoPageCostMgmt(el);
 else if(p==='sales') _filoPageSales(el);
 else if(p==='margin') _filoPageMargin(el);
 else _routed=false;

 /* 라우팅되지 않은 페이지 안내 (이전 화면이 그대로 남는 것을 막는다) */
 if(!_routed&&el){
  el.innerHTML='<div class="card" style="text-align:center;padding:60px;color:var(--t3)">'+
   '<div style="margin-bottom:12px">'+_svgIcon('construction')+'</div>'+
   '<div style="font-weight:700;margin-bottom:6px">'+esc(titles[p]||p)+'</div>'+
   '<div style="font-size:12px">준비 중입니다</div></div>';
 }

 /* POS·주문 화면에서만 음성 주문 FAB 노출 */
 _filoSyncVoiceFab(p);

 /* 프리미엄 페이지 전환 */
 if(el){
  el.style.opacity='0';
  el.style.transform='translateY(10px)';
  el.style.transition='none';
  requestAnimationFrame(function(){
   requestAnimationFrame(function(){
    el.style.transition='opacity .22s ease,transform .22s cubic-bezier(.4,0,.2,1)';
    el.style.opacity='1';
    el.style.transform='translateY(0)';
    setTimeout(function(){el.style.transition='';},250);
   });
  });
 }
}

/* 프리미엄 숫자 카운팅 */
function _countUp(el, target, duration, prefix, suffix){
 prefix=prefix||''; suffix=suffix||'';
 var start=0, startTime=null;
 var step=function(timestamp){
 if(!startTime) startTime=timestamp;
 var progress=Math.min((timestamp-startTime)/duration,1);
 var ease=1-Math.pow(1-progress,3);
 var current=Math.floor(ease*target);
 el.textContent=prefix+(current>=10000?current.toLocaleString():current)+suffix;
 if(progress<1) requestAnimationFrame(step);
 else el.textContent=prefix+target.toLocaleString()+suffix;
 };
 requestAnimationFrame(step);
}

function _filoPageHome(el){
 var d=_cachedCompanyDoc||{};
 var subs=d.subscriptions||{};
 var today=_today();
 var did=d.dealerId||d.uid||'';
 function hasSub(k){
  /* combo = 전체 포함 */
  if(k!=='combo'){var cs=subs['combo']||{};if(cs.active&&(!cs.expiry||cs.expiry>=today))return true;}
  var s=subs[k]||{};return !!(s.active&&(!s.expiry||s.expiry>=today));
 }

 el.innerHTML='<div style="max-width:1180px;margin:0 auto">'+
 '<div class="ai-hero fade-up">'+
 '<div class="ai-hero-glow"></div>'+
 '<div style="position:relative;z-index:1">'+
 '<div class="ai-hero-eyebrow">FILO · 실시간 운영</div>'+
 '<div class="ai-hero-title">'+esc(d.companyName||d.name||'')+'</div>'+
 '<div style="display:flex;align-items:center;gap:10px;margin-top:8px">'+
 '<span style="font-size:11px;color:rgba(255,255,255,.4)">'+today+'</span>'+
 '<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:#22c55e"><span style="width:6px;height:6px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite"></span>실시간 연동</span>'+
 '</div>'+
 '<div class="ai-hero-sub" id="home-ai-briefing"><span class="ai-typing">오늘 매장 상황을 분석하는 중</span></div>'+
 '</div></div>'+

 '<div class="kpi-grid" id="home-stats" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">'+
 [{t:'오늘 매출',c:'kpi-revenue',vc:'#c9a84c',ic:'wallet',id:'hs-0'},
  {t:'오늘 순이익',c:'kpi-profit',vc:'#22c55e',ic:'trending-up',id:'hs-profit'},
  {t:'마진율',c:'kpi-margin',vc:'#c9a84c',ic:'pie-chart',id:'hs-margin'},
  {t:'이번 달 매출',c:'kpi-month',vc:'#c9a84c',ic:'calendar',id:'hs-month'},
  {t:'미완료 주문',c:'kpi-cost',vc:'#ef4444',ic:'bell',id:'hs-1'},
  {t:'재고 부족',c:'kpi-warn',vc:'#ef4444',ic:'package',id:'hs-2'},
  {t:'출근 인원',c:'kpi-staff',vc:'#c9a84c',ic:'users',id:'hs-3'}
 ].map(function(s){
 return '<div class="kpi-card '+s.c+' card-hover" style="background:rgba(255,255,255,.06);border:1px solid rgba(201,168,76,.2)">'+
 '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
 '<div class="kpi-label" style="color:var(--t2)">'+s.t+'</div>'+
 '<div style="color:'+s.vc+'">'+_svgIcon(s.ic)+'</div>'+
 '</div>'+
 '<div class="kpi-val count-anim" id="'+s.id+'" style="color:'+s.vc+'">—</div>'+
 '</div>';
 }).join('')+'</div>'+

 '<div class="card fade-up-2" style="margin-bottom:12px">'+
 '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
 '<div style="font-size:11px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.8px">이용 중인 기능</div>'+
 '<button onclick="_filoGoPage(\'subscription\')" style="font-size:10px;color:var(--br);background:none;border:none;cursor:pointer;font-weight:700">관리 →</button>'+
 '</div>'+
 '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'+
 [{k:'inventory',l:'재고',ic:'package',c:'#7c3aed'},{k:'qr',l:'QR급여',ic:'qr-code',c:'#0891b2'},
  {k:'kiosk',l:'POS',ic:'monitor',c:'#059669'},{k:'combo',l:'통합',ic:'sparkles',c:'#f59e0b'}].map(function(p){
  var on=hasSub(p.k);
  return '<div style="padding:10px 8px;border-radius:10px;border:1px solid '+(on?p.c+'60':'rgba(255,255,255,.12)')+';background:'+(on?p.c+'18':'rgba(255,255,255,.06)')+';text-align:center">'+
  '<div style="display:flex;justify-content:center;margin-bottom:4px;color:'+(on?p.c:'var(--t2)')+'">'+_svgIcon(p.ic)+'</div>'+
  '<div style="font-size:10px;font-weight:700;color:'+(on?p.c:'var(--t2)')+'">'+p.l+'</div>'+
  '<div style="font-size:9px;margin-top:2px;font-weight:700;color:'+(on?p.c:'var(--t3)')+'">'+(on?'ON':'OFF')+'</div>'+
  '</div>';
 }).join('')+'</div></div>'+

 '<div class="card fade-up-3">'+
 '<div style="font-size:12px;font-weight:700;color:var(--t3);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">빠른 실행</div>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px">'+
 [{ic:'monitor',l:'POS',p:'kiosk'},{ic:'bell',l:'주문대기',p:'orders'},{ic:'truck',l:'배달',p:'delivery'},
 {ic:'package',l:'재고',p:'inventory'},{ic:'flask',l:'레시피',p:'recipe'},{ic:'trending-up',l:'매출',p:'sales_report'},
 {ic:'briefcase',l:'급여',p:'payroll'},{ic:'calendar',l:'예약',p:'schedule'}].map(function(m){
 return '<button onclick="_filoGoPage(\''+m.p+'\')" style="padding:14px 6px;background:rgba(255,255,255,.06);border:1px solid rgba(201,168,76,.2);border-radius:10px;color:var(--tx);cursor:pointer;text-align:center;transition:.2s;font-family:inherit" onmouseover="this.style.borderColor=\'#c9a84c\';this.style.background=\'rgba(201,168,76,.12)\'" onmouseout="this.style.borderColor=\'rgba(201,168,76,.2)\';this.style.background=\'rgba(255,255,255,.06)\'">'+
 '<div style="display:flex;justify-content:center;margin-bottom:4px">'+_svgIcon(m.ic)+'</div>'+
 '<div style="font-size:11px;font-weight:600">'+m.l+'</div></button>';
 }).join('')+'</div></div>'+

 '<div class="card fade-up-4" style="margin-top:12px">'+
 '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
 '<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.8px">'+_svgIcon('activity')+'DINE 실시간</div>'+
 '<span style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block"></span>'+
 '</div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
 '<div style="padding:10px;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.15);border-radius:10px;cursor:pointer" onclick="_filoGoDine()">'+
 '<div style="font-size:10px;color:var(--t3)">오늘 예약</div>'+
 '<div id="filo-dine-res-badge" style="font-size:14px;font-weight:900;color:#38bdf8;margin-top:2px">—</div>'+
 '</div>'+
 '<div style="padding:10px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:10px;cursor:pointer" onclick="_filoGoDine()">'+
 '<div style="font-size:10px;color:var(--t3)">테이블 주문</div>'+
 '<div id="filo-dine-sales" style="font-size:14px;font-weight:900;color:#22c55e;margin-top:2px">—</div>'+
 '</div>'+
 '</div></div>'+
 '</div>';

 if(!did) return;

 var ym=today.slice(0,7);
 /* 페이지 재진입 시 이전 리스너 정리 — 중첩 onSnapshot 누수 방지 */
 _filoStopHomeWatch();

 /* ① 오늘 POS 매출 · 순이익 · 마진율 (실시간) */
 window._filoHomeUnsubs.push(
  _db.collection('filo_sales').where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(posSnap){
   Promise.all([
    _db.collection('mbetco_sales').where('dealerId','==',did).where('date','==',today).get(),
    _db.collection('menu_costs').where('dealerId','==',did).get()
   ]).then(function(res){
    var costMap={};
    res[1].forEach(function(doc){var c=doc.data();costMap[c.name]=c;});
    var todayRev=0,todayCost=0;
    posSnap.forEach(function(doc){
     var s=doc.data();
     if(s.status==='cancel'||s.status==='cancelled')return;
     todayRev+=(s.total||0);
     (s.items||[]).forEach(function(it){todayCost+=((costMap[it.name]||{}).cost||0)*(it.qty||1);});
    });
    res[0].forEach(function(doc){todayRev+=(doc.data().revenue||doc.data().totalAmount||0);});

    var todayProfit=todayRev-todayCost;
    var todayMargin=todayRev>0?Math.round(todayProfit/todayRev*100):0;
    var e0=document.getElementById('hs-0'),ePr=document.getElementById('hs-profit'),eMg=document.getElementById('hs-margin');
    if(e0)_countUp(e0,todayRev,400,'₩','');
    if(ePr){_countUp(ePr,Math.max(0,todayProfit),500,'₩','');ePr.style.color=todayProfit>=0?'#22c55e':'#ef4444';}
    if(eMg){eMg.textContent=todayMargin+'%';eMg.style.color=todayMargin>=60?'#22c55e':todayMargin>=40?'#f59e0b':'#ef4444';}
   }).catch(function(){});
  },function(){})
 );

 /* ② 이번 달 매출 (실시간) */
 window._filoHomeUnsubs.push(
  _db.collection('filo_sales').where('dealerId','==',did)
   .where('date','>=',ym+'-01').where('date','<=',ym+'-31')
  .onSnapshot(function(snap){
   var monthRev=0;
   snap.forEach(function(doc){var s=doc.data();if(s.status!=='cancel'&&s.status!=='cancelled')monthRev+=(s.total||0);});
   _db.collection('mbetco_sales').where('dealerId','==',did)
    .where('date','>=',ym+'-01').where('date','<=',ym+'-31').get().then(function(ms){
     ms.forEach(function(doc){monthRev+=(doc.data().revenue||doc.data().totalAmount||0);});
     var eM=document.getElementById('hs-month');
     if(eM)_countUp(eM,monthRev,600,'₩','');
    }).catch(function(){
     var eM=document.getElementById('hs-month');
     if(eM)_countUp(eM,monthRev,600,'₩','');
    });
  },function(){})
 );

 /* ③ 미완료 주문 (실시간) */
 window._filoHomeUnsubs.push(
  _db.collection('filo_orders').where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(snap){
   var pending=0;
   snap.forEach(function(doc){var o=doc.data();if(o.status!=='completed'&&o.status!=='cleared'&&o.status!=='cancel')pending++;});
   var e1=document.getElementById('hs-1');
   if(!e1)return;
   e1.textContent=pending+'건';
   e1.style.color=pending>0?'#ef4444':'#22c55e';
   if(pending>0){e1.classList.add('bounce-in');setTimeout(function(){e1.classList.remove('bounce-in');},500);}
  },function(){})
 );

 /* ④ 재고 부족 (실시간) */
 window._filoHomeUnsubs.push(
  _db.collection('inventory').where('dealerId','==',did)
  .onSnapshot(function(snap){
   var low=0;
   snap.forEach(function(doc){
    var i=doc.data();
    var stock=(i.stock!=null?i.stock:(i.qty||0));
    var min=(i.minStock!=null?i.minStock:5);
    if(stock<=min)low++;
   });
   var e2=document.getElementById('hs-2');
   if(e2){e2.textContent=low+'개';e2.style.color=low>0?'#ef4444':'#22c55e';}
  },function(){})
 );

 /* ⑤ 출근 인원 (실시간 · DINE 출퇴근 연동) */
 window._filoHomeUnsubs.push(
  _db.collection('attendance').where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(attSnap){
   var ins={},outs={};
   attSnap.forEach(function(doc){
    var a=doc.data();
    if(a.type==='in')ins[a.memberId]=a;
    else if(a.type==='out')outs[a.memberId]=a;
   });
   var working=Object.keys(ins).filter(function(id){return !outs[id];}).length;
   var e3=document.getElementById('hs-3');
   if(e3)e3.textContent=working+'명';
   var dineAtt=document.getElementById('filo-dine-att');
   if(dineAtt)dineAtt.textContent='출근 '+working+'명';
  },function(){})
 );

 /* ⑥ DINE 연동 카드 — 오늘 예약 (pending) · POS 매출 (실시간) */
 window._filoHomeUnsubs.push(
  _db.collection('filo_bookings').where('dealerId','==',did).where('date','==',today).where('status','==','pending')
  .onSnapshot(function(snap){
   var b=document.getElementById('filo-dine-res-badge');
   if(b)b.textContent=snap.size>0?snap.size+'건':'없음';
  },function(){})
 );
 window._filoHomeUnsubs.push(
  _db.collection('filo_sales').where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(snap){
   var total=0,cnt=0;
   snap.forEach(function(doc){var d=doc.data();if(d.status!=='cancelled'){total+=d.total||0;cnt++;}});
   var t=document.getElementById('filo-dine-sales');
   if(t)t.textContent='₩'+total.toLocaleString()+'('+cnt+'건)';
  },function(){})
 );

 /* ⑦ AI 한줄 브리핑 */
 if(typeof _filoAiBriefing==='function') _filoAiBriefing('home-ai-briefing');
}

/* ── 페이지별 실시간 리스너 소유권 표 ──────────────────────────────
   각 모듈은 자기 페이지의 onSnapshot 해제 함수를 아래 전역에 보관한다.
   페이지를 벗어날 때 여기서 일괄 해제해 리스너가 누적되지 않게 한다.
   (같은 페이지로 재진입할 때는 해당 모듈이 스스로 재구독하므로 건너뛴다)
   ────────────────────────────────────────────────────────────────── */
var _FILO_WATCHERS=[
 {pages:['home'],            keys:['_filoHomeUnsubs','_filoAttendUnsub']},
 {pages:['orders'],          keys:['_ordersUnsub']},
 {pages:['delivery'],        keys:['_deliveryUnsub']},
 {pages:['sales_report','margin','sales'], keys:['_marginUnsub']},
 {pages:['schedule'],        keys:['_calUnsub']},
 {pages:['table_qr'],        keys:['_tableUnsub','_bookingUnsub','_callUnsub']},
 {pages:['table_mgmt'],      keys:['_tableMgmtUnsub']}
];

function _filoReleaseOne(key){
 var v=window[key];
 if(!v) return;
 if(Array.isArray(v)){
  v.forEach(function(u){try{if(typeof u==='function')u();}catch(e){}});
  window[key]=[];
  return;
 }
 if(typeof v==='function'){try{v();}catch(e){}}
 window[key]=null;
}

/* nextPage 가 소유한 리스너는 남기고, 나머지는 해제한다 */
function _filoReleaseWatchers(nextPage){
 _FILO_WATCHERS.forEach(function(w){
  if(w.pages.indexOf(nextPage)>=0) return;
  w.keys.forEach(_filoReleaseOne);
 });
 if(nextPage!=='home'&&typeof _filoStopHomeWatch==='function') _filoStopHomeWatch();
}
window._filoReleaseWatchers=_filoReleaseWatchers;

/* POS·주문 페이지에서만 음성 주문 FAB을 띄운다 */
function _filoSyncVoiceFab(p){
 var show=(p==='kiosk'||p==='orders'||p==='delivery');
 var fab=document.getElementById('filo-voice-fab');
 if(!show){ if(fab)fab.remove(); return; }
 if(fab||typeof _filoVoiceOrderOpen!=='function') return;
 fab=document.createElement('button');
 fab.id='filo-voice-fab';
 fab.className='ai-fab';
 fab.title='음성 주문';
 fab.setAttribute('aria-label','음성 주문');
 fab.innerHTML=_svgIcon('mic');
 fab.onclick=function(){_filoVoiceOrderOpen();};
 document.body.appendChild(fab);
}
window._filoSyncVoiceFab=_filoSyncVoiceFab;

/* 대시보드 실시간 리스너 정리 — 페이지 이탈/재진입 시 호출 */
function _filoStopHomeWatch(){
 if(!window._filoHomeUnsubs) window._filoHomeUnsubs=[];
 window._filoHomeUnsubs.forEach(function(u){try{if(typeof u==='function')u();}catch(e){}});
 window._filoHomeUnsubs=[];
 /* 구버전에서 남긴 단일 핸들도 함께 정리 */
 if(window._filoAttendUnsub){try{window._filoAttendUnsub();}catch(e){}window._filoAttendUnsub=null;}
}
window._filoStopHomeWatch=_filoStopHomeWatch;

function _filoTab(t){
 ['login','register','join'].forEach(function(x){
 document.getElementById('tab-'+x).classList.toggle('on',x===t);
 document.getElementById('form-'+x).style.display=x===t?'block':'none';
 });
}

function _filoTogglePw(id,btn){
 var el=document.getElementById(id);
 if(!el)return;
 el.type=el.type==='password'?'text':'password';
 btn.innerHTML=el.type==='password'?_svgIcon('eye'):_svgIcon('eye-off');
}

function _filoLogin(){
 var id=(document.getElementById('fl-id').value||'').trim();
 var pw=(document.getElementById('fl-pw').value||'').trim();
 var errEl=document.getElementById('fl-err');
 if(!id||!pw){errEl.textContent='아이디와 비밀번호를 입력해 주세요';errEl.style.display='block';return;}
 errEl.style.display='none';
 var email=id.indexOf('@')>0?id:null;
 function doSignIn(em){
 _auth.signInWithEmailAndPassword(em,pw).catch(function(e){
 errEl.textContent=e.code==='auth/wrong-password'?'비밀번호가 틀렸습니다':
 e.code==='auth/user-not-found'?'존재하지 않는 계정입니다':'로그인 실패: '+e.message;
 errEl.style.display='block';
 });
 }
 if(email){ doSignIn(email); return; }
 _db.collection('companies').where('loginId','==',id).limit(1).get().then(function(snap){
 if(!snap.empty){ doSignIn(snap.docs[0].data().email); return; }
 return _db.collection('members').where('phone','==',id).limit(1).get();
 }).then(function(snap){
 if(snap&&!snap.empty){ doSignIn(snap.docs[0].data().email); return; }
 errEl.textContent='아이디 또는 전화번호를 찾을 수 없습니다';
 errEl.style.display='block';
 }).catch(function(e){
 errEl.textContent='조회 오류: '+e.message;errEl.style.display='block';
 });
}

function _filoBizCheck(){
 var biz=(document.getElementById('fr-biznum').value||'').replace(/-/g,'');
 var msg=document.getElementById('fr-biznum-msg');
 if(biz.length!==10){msg.textContent='사업자번호 10자리를 입력하세요';msg.style.color='var(--red)';msg.style.display='block';return;}
 _db.collection('companies').where('bizNum','==',biz).limit(1).get().then(function(snap){
 if(snap.empty){msg.textContent='사용 가능';msg.style.color='var(--gn)';}
 else{msg.textContent='이미 등록된 사업자번호';msg.style.color='var(--red)';}
 msg.style.display='block';
 });
}

var _filoSelectedSvcs=['inventory'];
function _filoToggleSvc(k){
 var idx=_filoSelectedSvcs.indexOf(k);
 if(k==='combo'||k==='inventory'||k==='kiosk'){
 _filoSelectedSvcs=['combo'];
 if(k!=='combo') setTimeout(function(){alert('재고관리·키오스크는 콤보 플랜으로만 제공됩니다 (165,000원/월)');},100);
 } else {
 _filoSelectedSvcs=_filoSelectedSvcs.filter(function(x){return x!=='combo';});
 if(idx>=0)_filoSelectedSvcs.splice(idx,1);
 else _filoSelectedSvcs.push(k);
 if(!_filoSelectedSvcs.length)_filoSelectedSvcs=['combo'];
 }
 ['inventory','qr','kiosk','combo'].forEach(function(s){
 var on=_filoSelectedSvcs.indexOf(s)>=0;
 var card=document.getElementById('fs-'+s+'-card');
 var chk=document.getElementById('fs-'+s+'-check');
 if(card)card.style.borderColor=on?'var(--br)':'var(--bd)';
 if(chk)chk.style.background=on?'var(--br)':'var(--bd)';
 });
 document.getElementById('fr-service').value=_filoSelectedSvcs.join(',');
}

function _filoRegister(){
 var company=(document.getElementById('fr-company').value||'').trim();
 var biznum=(document.getElementById('fr-biznum').value||'').replace(/-/g,'');
 var industry=document.getElementById('fr-industry')?document.getElementById('fr-industry').value:'cafe';
 var name=(document.getElementById('fr-name').value||'').trim();
 var email=(document.getElementById('fr-email').value||'').trim();
 var pw=(document.getElementById('fr-pw').value||'').trim();
 var phone=(document.getElementById('fr-phone').value||'').trim();
 var svc=document.getElementById('fr-service').value||'inventory';
 var errEl=document.getElementById('fr-err');
 if(!company||!biznum||!name||!email||!pw||!industry){errEl.textContent='필수 항목을 모두 입력해 주세요 (업종 포함)';errEl.style.display='block';return;}
 if(pw.length<6){errEl.textContent='비밀번호는 6자 이상';errEl.style.display='block';return;}
 errEl.style.display='none';
 _auth.createUserWithEmailAndPassword(email,pw).then(function(cred){
 var uid=cred.user.uid;
 var subs={};
 var trial={active:true,plan:'trial',start:_nowISO(),expiry:new Date(Date.now()+7*86400000).toISOString()};
 svc.split(',').forEach(function(s){subs[s]=trial;});
 window._filoNewDealerId=uid;
 var _th=(typeof _FILO_THEMES!=='undefined'&&_FILO_THEMES[industry])?_FILO_THEMES[industry]:null;
 return _db.collection('companies').doc(uid).set({
 uid:uid,companyName:company,name:name,email:email,phone:phone,
 bizNum:biznum,role:'dealer',dealerId:uid,
 platform:'filo',serviceType:svc,
 /* 업종 테마 — 기존엔 industry를 읽고도 저장하지 않아 테마/기본메뉴의 기준값이 없었다 */
 theme:industry,
 primaryColor:_th?_th.primary:'',
 bgColor:_th?_th.bg:'',
 subscriptions:subs,
 createdAt:firebase.firestore.FieldValue.serverTimestamp()
 });
 }).then(function(){
 /* 선택한 업종 테마 즉시 적용 */
 if(typeof _filoApplyTheme==='function')_filoApplyTheme({theme:industry});
 _filoToast('등록 완료! 1개월 무료 체험을 시작합니다');
 if(typeof _filoSeedDefaultMenus==='function'){
  setTimeout(function(){
   _filoSeedDefaultMenus(window._filoNewDealerId,industry).then(function(n){
    if(n>0)_filoToast('기본 메뉴 '+n+'개가 자동 등록되었습니다');
   }).catch(function(){});
  },800);
 }
 }).catch(function(e){
 errEl.textContent=e.code==='auth/email-already-in-use'?'이미 사용 중인 이메일':e.message;
 errEl.style.display='block';
 });
}

function _filoJoin(){
 var name=(document.getElementById('fj-name').value||'').trim();
 var phone=(document.getElementById('fj-phone').value||'').trim();
 var code=(document.getElementById('fj-code').value||'').trim().toUpperCase();
 var pw=(document.getElementById('fj-pw').value||'').trim();
 var errEl=document.getElementById('fj-err');
 if(!name||!phone||!code||!pw){errEl.textContent='모든 항목을 입력해 주세요';errEl.style.display='block';return;}
 if(pw.length<4){errEl.textContent='비밀번호는 4자 이상';errEl.style.display='block';return;}
 errEl.style.display='none';
 _db.collection('companies').where('companyCode','==',code).limit(1).get().then(function(snap){
 if(snap.empty){errEl.textContent='존재하지 않는 회사 코드';errEl.style.display='block';return;}
 var company=snap.docs[0].data();
 var did=company.dealerId||snap.docs[0].id;
 var email=phone+'_'+code.toLowerCase()+'@filo.member';
 return _auth.createUserWithEmailAndPassword(email,pw).then(function(cred){
 var uid=cred.user.uid;
 var memberDoc={
 uid:uid, name:name, phone:phone, dealerId:did,
 companyName:company.companyName||company.name||'',
 email:email, role:'member', status:'active', platform:'filo',
 createdAt:firebase.firestore.FieldValue.serverTimestamp(),
 joinedAt:firebase.firestore.FieldValue.serverTimestamp()
 };
 return _db.collection('members').doc(uid).set(memberDoc).then(function(){
 return _db.collection('users').doc(uid).set({
 uid:uid, name:name, phone:phone, email:email,
 dealerId:did, role:'member', platform:'filo',
 createdAt:firebase.firestore.FieldValue.serverTimestamp()
 });
 });
 });
 }).then(function(){
 fetch('/api/join-member',{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({uid:_auth.currentUser&&_auth.currentUser.uid||'',
 name:document.getElementById('fj-name').value.trim(),
 phone:document.getElementById('fj-phone').value.trim(),
 dealerId:window._filoJoinDid||'',
 companyName:window._filoJoinCo||'',
 platform:'filo'
 })}).catch(function(){});
 _filoToast('가입 완료! 관리자 직원 목록에 자동 등록됩니다.');
 }).catch(function(e){
 if(e&&e.code==='auth/email-already-in-use'){errEl.textContent='이미 가입된 전화번호·코드 조합';}
 else if(e){errEl.textContent=e.message||String(e);}
 if(errEl.textContent)errEl.style.display='block';
 });
}

function _filoFindPw(){
 var id=prompt('가입 이메일을 입력하세요');
 if(!id)return;
 _auth.sendPasswordResetEmail(id).then(function(){
 _filoToast('비밀번호 재설정 이메일을 발송했습니다');
 }).catch(function(e){_filoToast(e.message);});
}

function _filoGoDine(){
 var slug=(_CU&&_CU.dineSlug)||'';
 var storeName=(_CU&&(_CU.companyName||_CU.name))||'';
 var key=slug||storeName;
 var url=key?'https://dine.ne.kr/'+encodeURIComponent(key):'https://dine.ne.kr/app';
 window.open(url,'_blank');
}

function _filoLogout(){
 if(!confirm('로그아웃 하시겠습니까?'))return;
 _auth.signOut();
}

// FILO ↔ DINE 실시간 예약 토스트 (새 예약 알림 전용 — 뱃지는 홈 리스너⑥이 담당)
function _filoWatchDineReservations(){
 if(window._filoDineResUnsub)window._filoDineResUnsub();
 var d=_cachedCompanyDoc||{};
 var did=d.dealerId||d.uid||'';
 if(!did||!_db)return;
 var today=_today();
 window._filoDineResUnsub=_db.collection('filo_bookings')
  .where('dealerId','==',did).where('date','==',today).where('status','==','pending')
  .onSnapshot(function(snap){
   if(snap.docChanges){
    snap.docChanges().forEach(function(change){
     if(change.type==='added'){
      var r=change.doc.data();
      _filoToast('DINE 새 예약: '+r.customerName+'님 '+r.seats+'인');
     }
    });
   }
  },function(){});
}

// _filoWatchDineSales 제거 — 홈 리스너⑥ filo_sales onSnapshot이 동일 기능 수행

// ── 데모 로그인 — 업종별 딜러 자동 전환 ────────────────────────────
var _DEMO_TYPE_MAP={cafe:'cafe',korean:'korean',japanese:'japanese',snack:'fastfood',western:'other',bakery:'cafe'};
function _filoDemoLogin(type){
 var msgEl=document.getElementById('demo-login-msg');
 var errEl=document.getElementById('fl-err');
 if(msgEl) msgEl.textContent='로그인 중...';
 if(type) localStorage.setItem('_demoType',type);
 _auth.signInWithEmailAndPassword('soungkyekim@naver.com','khw3103!!!')
 .catch(function(e){
  localStorage.removeItem('_demoType');
  if(msgEl) msgEl.textContent='클릭 한 번으로 샘플 데이터 체험';
  if(errEl){errEl.textContent='데모 로그인 실패: '+e.message;errEl.style.display='block';}
 });
}

// ── 관리자 데모 매장 전환 ──────────────────────────────────────────
function _switchDemoDealer(did){
 if(!did||!_CU||!_CU.uid) return;
 var sel=document.getElementById('demo-dealer-sel');
 var inp=document.getElementById('sa-did-input');
 if(sel) sel.disabled=true;
 _db.collection('companies').doc(did).get().then(function(snap){
  var data=snap.exists?snap.data():{companyName:did};
  _cachedCompanyDoc=data;
  _CU.dealerId=did;
  _CU.role='dealer';
  _CU.companyName=data.companyName||data.name||did;
  try{if(typeof _filoApplyTheme==='function')_filoApplyTheme(data);}catch(e){}
  var disp=document.getElementById('demo-dealer-disp');
  if(disp) disp.textContent=_CU.companyName||did;
  var nc=document.getElementById('nav-company');
  if(nc) nc.textContent=_CU.companyName;
  if(sel){sel.value=did.startsWith('demo_')?did:'';sel.disabled=false;}
  if(inp) inp.value='';
  _buildFiloNav();
  _filoGoPage('home');
 }).catch(function(e){if(sel)sel.disabled=false;_filoToast('매장 전환 실패: '+did);console.error(e);});
}

// ── 데모 딜러 초기화 (SA 전용) ────────────────────────────────────
function _filoDemoInit(){
 var DEMOS=[
  {id:'demo_cafe',    label:'카페',    theme:'cafe',    tpl:'cafe',    primary:'#c8a96e',bg:'#1a1209',
   services:['kiosk','bakery_qr','inventory']},
  {id:'demo_korean',  label:'한식당',  theme:'korean',  tpl:'korean',  primary:'#e05555',bg:'#0f0a0a',
   services:['kiosk','table_order','booking','inventory','payroll']},
  {id:'demo_japanese',label:'일식당',  theme:'japanese',tpl:'japanese',primary:'#3b82f6',bg:'#0a0f1e',
   services:['kiosk','table_order','booking','inventory']},
  {id:'demo_snack',   label:'분식',    theme:'fastfood',tpl:'fastfood',primary:'#f97316',bg:'#1a0e00',
   services:['kiosk','table_order','inventory']},
  {id:'demo_western', label:'양식당',  theme:'other',   tpl:'western', primary:'#7c3aed',bg:'#07071a',
   services:['kiosk','table_order','booking','inventory']},
  {id:'demo_bakery',  label:'베이커리',theme:'cafe',    tpl:'bakery',  primary:'#c8a96e',bg:'#1a1209',
   services:['kiosk','bakery_qr','inventory']}
 ];
 _filoToast('데모 딜러 초기화 시작...');
 var total=0;
 function next(i){
  if(i>=DEMOS.length){_filoToast('데모 초기화 완료 — 총 '+total+'개 메뉴');return;}
  var d=DEMOS[i];
  _db.collection('companies').doc(d.id).set({
   companyName:'데모 '+d.label,theme:d.theme,
   primaryColor:d.primary,bgColor:d.bg,
   services:d.services,
   subscriptions:{combo:{active:true}},
   isDemo:true,dealerId:d.id,role:'dealer',
   createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){
   return _db.collection('filo_menus').where('dealerId','==',d.id).get();
  }).then(function(snap){
   if(snap.empty) return;
   var b=_db.batch();
   snap.docs.forEach(function(doc){b.delete(doc.ref);});
   return b.commit();
  }).then(function(){
   var items=(typeof _FILO_MENU_TEMPLATES!=='undefined')
    ?(_FILO_MENU_TEMPLATES[d.tpl]||[]):[];
   if(!items.length){next(i+1);return;}
   var now=(typeof _nowISO==='function')?_nowISO():new Date().toISOString();
   var b2=_db.batch();
   var refs=[];
   items.forEach(function(it){
    var ref=_db.collection('filo_menus').doc();
    refs.push({ref:ref,q:it.q||it.name});
    b2.set(ref,{
     dealerId:d.id,name:it.name,price:it.price,
     category:it.category,emoji:it.emoji||'',forSale:true,
     imageUrl:'',stock:null,minStock:null,description:'',
     nameTranslations:it.tr||{},isTemplate:true,
     createdAt:now,updatedAt:now
    });
   });
   total+=items.length;
   return b2.commit().then(function(){
    if(typeof _filoFillTemplateImages==='function') _filoFillTemplateImages(refs);
   });
  }).then(function(){next(i+1);})
  .catch(function(e){console.error(d.id,e);next(i+1);});
 }
 next(0);
}
