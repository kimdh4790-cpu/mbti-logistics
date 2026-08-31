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

// ── 애니메이션 유틸리티 ───────────────────────────────────────────────────
window._filoTypewriter=function(el,text,speed){
 if(!el)return;
 speed=speed||28;
 el.textContent='';
 el.classList.add('typewriter-text');
 var i=0;
 function tick(){
  if(i<text.length){el.textContent+=text[i++];setTimeout(tick,speed);}
 }
 tick();
};
window._filoCountUp=function(el,target,prefix,suffix){
 if(!el)return;
 prefix=prefix||'';suffix=suffix||'';
 var start=0,dur=700,t0=performance.now();
 function frame(now){
  var p=Math.min((now-t0)/dur,1);
  var ease=1-Math.pow(1-p,3);
  el.textContent=prefix+Math.round(start+(target-start)*ease).toLocaleString()+suffix;
  if(p<1)requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
};
window._filoCascade=function(container){
 if(!container)return;
 Array.from(container.children).forEach(function(c,i){
  c.style.cssText+='opacity:0;animation:slideUp .36s cubic-bezier(.34,1.4,.64,1) '+(i*0.07)+'s both';
 });
};

// ── 전역 오류 탐지 (FILO 대시보드 전체 커버) ──────────────────────────────
(function(){
 function _sendErr(data){
  try{
   data.source='filo-frontend';
   data.ts=new Date().toISOString();
   data.did=(window._CU&&(window._CU.dealerId||window._CU.uid))||'unknown';
   data.user=(window._CU&&window._CU.email)||'unknown';
   data.url=location.href.slice(0,200);
   navigator.sendBeacon?navigator.sendBeacon('/api/log-error',JSON.stringify(data))
    :fetch('/api/log-error',{method:'POST',body:JSON.stringify(data),keepalive:true}).catch(function(){});
  }catch(e){}
 }
 window._filoLogError=function(e,ctx){
  _sendErr({type:'manual',msg:String(e&&(e.message||e)).slice(0,300),stack:e&&e.stack,ctx:String(ctx||'')});
 };
 window.onerror=function(msg,src,line,col,err){
  _sendErr({type:'js',msg:String(msg).slice(0,300),src:String(src||'').slice(0,150),line:line||0,col:col||0,stack:err&&err.stack});
  return false;
 };
 window.onunhandledrejection=function(e){
  var r=e.reason;
  _sendErr({type:'promise',msg:String(r&&(r.message||r)).slice(0,300),stack:r&&r.stack});
 };
})();

// ── JS 파일 동적 로드 후 콜백 실행 ─────────────────────────────
function _filoLoadAndRun(jsFile, callback) {
  // 이미 성공 로드됐으면 바로 실행
  var existing = document.querySelector('script[data-filo="'+jsFile+'"]');
  if(existing && existing.dataset.filoOk === '1') {
    if(typeof callback === 'function') callback();
    return;
  }
  // 실패했거나 없으면 재시도 (실패한 태그 제거)
  if(existing) existing.parentNode.removeChild(existing);
  var s = document.createElement('script');
  s.src = '/' + jsFile + '?v=' + Date.now();
  s.setAttribute('data-filo', jsFile);
  s.onload = function() { s.dataset.filoOk='1'; if(typeof callback === 'function') callback(); };
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
 var company=(_cachedCompanyDoc||{}).companyName||(_cachedCompanyDoc||{}).name||'내 회사';
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
 // 첫 로그인 딜러 — 메뉴 없으면 업종 선택 모달 표시
 setTimeout(function(){
  if(_CU&&_CU.role!=='member') _filoCheckAndShowIndustryModal(_CU.dealerId||_CU.uid);
 }, 3200);
}

function _initFiloFCM(){
 if(!('Notification' in window) || !_CU || !_CU.dealerId) return;
 var did = _CU.dealerId;
 if(did.startsWith('demo_')) return; // 데모 딜러는 FCM 불필요
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

/* ══════════════════════════════════════════════════════
   업종별 기본 메뉴 자동 세팅 — 첫 로그인 모달
   메뉴가 없는 딜러에게만 표시. filo-menu.js의
   _filoSeedDefaultMenus()를 동적 로드 후 호출한다.
══════════════════════════════════════════════════════ */

/**
 * 딜러의 filo_menus가 비어 있으면 업종 선택 모달을 띄운다.
 * 회원(member)·데모 계정은 스킵.
 */
function _filoCheckAndShowIndustryModal(did){
 if(!did||!_db) return;
 if(did.startsWith('demo_')) return;
 _db.collection('filo_menus').where('dealerId','==',did).limit(1).get()
 .then(function(snap){
  if(!snap.empty) return; // 이미 메뉴 있음 → 모달 생략
  _filoShowIndustryModal(did);
 }).catch(function(){});
}

/** 업종 선택 모달 렌더링 */
function _filoShowIndustryModal(did){
 var ex=document.getElementById('filo-industry-modal');
 if(ex) ex.remove();
 var d=_cachedCompanyDoc||{};
 var curTheme=d.theme||'';
 var order=['cafe','korean','japanese','chinese','fastfood','izakaya','other'];
 var opts='<option value="">업종을 선택하세요</option>';
 order.forEach(function(k){
  var t=(typeof _FILO_THEMES!=='undefined')&&_FILO_THEMES[k];
  if(!t) return;
  opts+='<option value="'+k+'"'+(curTheme===k?' selected':'')+'>'+t.emoji+' '+t.label+'</option>';
 });
 var overlay=document.createElement('div');
 overlay.id='filo-industry-modal';
 overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
 overlay.innerHTML=
  '<div style="background:var(--b2);border:1px solid var(--bd);border-radius:16px;padding:28px 24px;max-width:380px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.6)">'+
  '<div style="font-size:18px;font-weight:900;margin-bottom:6px;color:var(--tx)">환영합니다!</div>'+
  '<div style="font-size:13px;color:var(--t3);margin-bottom:20px;line-height:1.55">매장 업종을 선택하시면 기본 메뉴를 자동으로 등록해 드립니다.<br>나중에 설정 > 매장 테마에서 변경할 수 있습니다.</div>'+
  '<div style="font-size:11px;color:var(--t3);margin-bottom:5px">업종 선택</div>'+
  '<select id="industry-modal-sel" class="inp" style="width:100%;font-size:13px;margin-bottom:20px;padding:10px 12px">'+opts+'</select>'+
  '<div style="display:flex;gap:8px">'+
  '<button class="btn btn-brand" style="flex:1;padding:11px" onclick="_filoIndustryModalConfirm(\''+did+'\')">기본 메뉴 등록</button>'+
  '<button class="btn" style="background:var(--b3);color:var(--t2);flex:1;padding:11px;border:1px solid var(--bd)" onclick="document.getElementById(\'filo-industry-modal\').remove()">나중에</button>'+
  '</div>'+
  '</div>';
 document.body.appendChild(overlay);
}

/** "기본 메뉴 등록" 버튼 핸들러 */
function _filoIndustryModalConfirm(did){
 var sel=document.getElementById('industry-modal-sel');
 var industry=sel?sel.value:'';
 if(!industry){_filoToast('업종을 선택해 주세요');return;}
 var overlay=document.getElementById('filo-industry-modal');
 if(overlay) overlay.remove();
 /* companies/{did}에 theme(업종) 저장 */
 _db.collection('companies').doc(did).update({
  theme:industry,
  updatedAt:(typeof _nowISO==='function')?_nowISO():new Date().toISOString()
 }).then(function(){
  if(_cachedCompanyDoc) _cachedCompanyDoc.theme=industry;
  if(typeof _filoApplyTheme==='function')
   _filoApplyTheme(Object.assign({},_cachedCompanyDoc||{},{theme:industry}));
 }).catch(function(){});
 /* 메뉴 시딩 — filo-menu.js가 로드돼 있어야 함 */
 function doSeed(){
  if(typeof _filoSeedDefaultMenus!=='function') return;
  _filoToast('기본 메뉴 등록 중...');
  _filoSeedDefaultMenus(did,industry).then(function(n){
   if(n>0) _filoToast('기본 메뉴 '+n+'개가 등록됐습니다!');
   else _filoToast('이미 메뉴가 있어 건너뛰었습니다');
  }).catch(function(e){ _filoToast('메뉴 등록 오류: '+e.message); });
 }
 if(typeof _filoSeedDefaultMenus==='function'){
  doSeed();
 } else {
  _filoLoadAndRun('filo-menu.js', doSeed);
 }
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
 // demo_* 딜러 전환 시엔 해당 딜러의 services 배열만 사용 (SA 전체허용 미적용)
 var _isDemo=(_CU.dealerId||'').startsWith('demo_');
 var hasAll=(isSA&&!_isDemo)||hasSub('combo');

 // ── 슈퍼어드민 topbar 컨트롤 ──────────────────────────────────
 if(isSA){
  var _saBar=document.getElementById('sa-topbar');
  if(!_saBar){
   _saBar=document.createElement('div');
   _saBar.id='sa-topbar';
   _saBar.style.cssText='display:flex;align-items:center;gap:5px;border:1px solid rgba(201,168,76,.35);border-radius:8px;padding:3px 8px;background:rgba(201,168,76,.08)';
   _saBar.innerHTML=
    '<span style="color:#c9a84c;font-size:10px;font-weight:800;flex-shrink:0;letter-spacing:.5px">SA</span>'+
    '<select id="demo-dealer-sel" onchange="_switchDemoDealer(this.value)" '+
     'style="background:transparent;border:none;color:#0f172a;font-size:11px;cursor:pointer;outline:none;max-width:72px">'+
     '<option value="">데모</option>'+
     '<option value="demo_cafe">카페</option>'+
     '<option value="demo_korean">한식당</option>'+
     '<option value="demo_japanese">일식당</option>'+
     '<option value="demo_snack">분식</option>'+
     '<option value="demo_western">양식당</option>'+
     '<option value="demo_bakery">베이커리</option>'+
    '</select>'+
    '<input id="sa-did-input" placeholder="딜러ID" '+
     'onkeydown="if(event.key===\'Enter\')_switchDemoDealer(this.value.trim())" '+
     'style="width:90px;background:transparent;border:none;border-bottom:1px solid rgba(201,168,76,.4);color:#0f172a;font-size:11px;padding:1px 4px;outline:none">'+
    '<button onclick="_switchDemoDealer(document.getElementById(\'sa-did-input\').value.trim())" '+
     'style="background:rgba(201,168,76,.2);border:none;border-radius:4px;color:#c9a84c;font-size:10px;font-weight:700;padding:2px 7px;cursor:pointer;flex-shrink:0">이동</button>'+
    '<button onclick="_filoDemoInit()" '+
     'style="background:transparent;border:1px solid rgba(201,168,76,.3);border-radius:4px;color:#c9a84c;font-size:10px;padding:2px 7px;cursor:pointer;flex-shrink:0">초기화</button>';
   var _trEl=document.getElementById('topbar-right');
   if(_trEl) _trEl.appendChild(_saBar);
  } else {
   var _dsel=document.getElementById('demo-dealer-sel');
   if(_dsel) _dsel.value=_isDemo?_CU.dealerId:'';
  }
 }

 // ── 관제센터 services 배열 기반 기능 on/off ──────────────────
 var _services = d.services || [];
 // FILO 플랜별 허용 기능
 var FILO_PLAN_FEATURES = {
  trial:        ['kiosk','table_order','qr_order','qr_attend','member_crm','menu'],
  basic:        ['kiosk','table_order','qr_order','qr_attend','member_crm','menu'],
  pro:          ['kiosk','table_order','qr_order','qr_attend','member_crm','menu',
                 'inventory','payroll','ai_predict','translation','reservation','booking','margin'],
  premium:      ['kiosk','table_order','qr_order','qr_attend','member_crm','menu',
                 'inventory','payroll','ai_predict','translation','reservation','booking','margin',
                 'accounting','multi_store','report'],
  franchise_hq: ['kiosk','table_order','qr_order','qr_attend','member_crm','menu',
                 'inventory','payroll','ai_predict','translation','reservation','booking','margin',
                 'accounting','multi_store','report','franchise_hq','menu_deploy','branch_monitor']
 };
 var _filoPlan = (d && d.filoPlan) ? d.filoPlan : 'trial';
 var _filoPlanExpiry = (d && d.filoPlanExpiry) ? d.filoPlanExpiry : '';
 var _filoPlanActive = (_filoPlan === 'trial')
  ? !!(d && d.subscriptions && d.subscriptions.trial && d.subscriptions.trial.active)
  : (_filoPlanExpiry >= today);
 var _filoPlanFeats = _filoPlanActive
  ? (FILO_PLAN_FEATURES[_filoPlan] || FILO_PLAN_FEATURES['trial'])
  : FILO_PLAN_FEATURES['trial'];
 function hasFeature(key) {
  if(hasAll) return true;           // 슈퍼어드민(비데모)·콤보 구독은 전부 허용
  if(_services.includes(key)) return true;  // 관제센터에서 켠 기능
  if(_filoPlanFeats.includes(key)) return true;  // 플랜 기반 기능
  return false;
 }

 // ── 업종별 기본 탭 가시성 ──────────────────────────────────────
 var _industryType = (d.theme || 'other');
 // 업종별로 구독 없이도 기본 표시할 기능 목록
 var _INDUSTRY_DEFAULTS = {
  cafe:     ['table_order','reservation','member_crm','bakery_qr'],
  korean:   ['table_order','reservation','member_crm'],
  japanese: ['table_order','reservation','member_crm'],
  chinese:  ['table_order','reservation','member_crm'],
  fastfood: ['member_crm'],
  izakaya:  ['table_order','reservation','member_crm'],
  other:    ['table_order','reservation','member_crm'],
 };
 var _indDefaults = _INDUSTRY_DEFAULTS[_industryType] || _INDUSTRY_DEFAULTS.other;
 // 구독·관제센터 활성 OR 업종 기본값에 포함
 function hasFeatureOrIndustry(key) {
  if(hasFeature(key)) return true;
  return _indDefaults.indexOf(key) >= 0;
 }

 var menus=[];

 /* ── 홈 (항상) ── */
 menus.push({s:'홈',items:[{ic:'home',l:'대시보드',p:'home'}]});

 /* ── 지금 영업 (POS·주문·테이블) ── */
 var _now=[];
 if(hasAll||hasSub('kiosk')||hasFeature('kiosk')){
  _now.push({ic:'monitor',l:'POS 결제',p:'kiosk'});
  _now.push({ic:'bell',l:'주문 대기',p:'orders'});
 }
 if(hasAll||hasFeatureOrIndustry('table_order')||hasSub('kiosk')){
  _now.push({ic:'grid',l:'테이블 현황',p:'table_qr'});
  _now.push({ic:'qr-code',l:'테이블 QR',p:'qr_mgmt'});
 }
 if(_now.length)menus.push({s:'지금 영업',items:_now});

 /* ── 메뉴·재고 ── */
 var _menuInv=[];
 if(isAdmin&&(hasAll||hasSub('kiosk')||hasFeature('kiosk')||hasFeatureOrIndustry('table_order'))){
  _menuInv.push({ic:'utensils',l:'메뉴 관리',p:'menu_mgmt'});
  if(hasFeatureOrIndustry('bakery_qr'))_menuInv.push({ic:'archive',l:'빵·디저트 QR',p:'bakery_qr_mgmt'});
 }
 if(hasAll||hasSub('inventory')||hasFeature('inventory')){
  _menuInv.push({ic:'package',l:'재고 현황',p:'inventory'});
  _menuInv.push({ic:'refresh',l:'자동 발주',p:'auto_order'});
 }
 if(_menuInv.length)menus.push({s:'메뉴·재고',items:_menuInv});

 /* ── 팀·손님 (근태 QR · 예약+웨이팅) ── */
 var _team=[];
 if(hasAll||hasFeature('qr_attend')){
  _team.push({ic:'qr-code',l:'STAFFIQ 근태 QR',p:'qr_staff',badge:'STAFFIQ'});
 }
 if(hasAll||hasFeatureOrIndustry('reservation')){
  _team.push({ic:'calendar',l:'예약·웨이팅',p:'schedule'});
 }
 if(_team.length)menus.push({s:'팀·손님',items:_team});

 /* ── AI·분석 ── */
 var _aiNav=[];
 _aiNav.push({ic:'sparkles',l:'AIVO 어시스턴트',p:'ai',badge:'AIVO'});
 if(isAdmin)_aiNav.push({ic:'briefcase',l:'세무사 연동',p:'tax_share'});
 menus.push({s:'AI·분석',items:_aiNav});

 /* ── 본사 HQ (franchise_hq 플랜 전용) ── */
 if(hasAll||hasFeature('franchise_hq')){
  menus.push({s:'본사 HQ',items:[
   {ic:'building',l:'전가맹점 현황',p:'branch_monitor'},
   {ic:'user-plus',l:'가맹점 관리',p:'branch_mgmt'},
   {ic:'megaphone',l:'공지 일괄 발송',p:'hq_notice'},
   {ic:'clipboard-check',l:'QSC 체크리스트',p:'hq_qsc'},
   {ic:'send',l:'메뉴 일괄 배포',p:'menu_deploy'},
  ]});
 }

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

function _toggleOrientation(){
 var btn=document.getElementById('rotate-btn');
 var isLandscape=(screen.orientation&&screen.orientation.type||'').includes('landscape')||window.innerWidth>window.innerHeight;
 var target=isLandscape?'portrait-primary':'landscape-primary';
 if(screen.orientation&&screen.orientation.lock){
  screen.orientation.lock(target).then(function(){
   if(btn)btn.style.color='var(--primary)';
   setTimeout(function(){if(btn)btn.style.color='';},1000);
  }).catch(function(){
   _filoToast('기기 설정 → 화면 자동 회전을 켜주세요');
  });
 } else {
  _filoToast('이 브라우저는 화면 회전 API를 지원하지 않습니다');
 }
}

function _filoGoPage(p){
 /* 페이지 전환 시 이전 화면의 실시간 리스너를 모두 해제한다 (리스너 누수 방지) */
 _filoReleaseWatchers(p);
 /* POS 결제 하단 바 + 고객 화면 — kiosk 이외 페이지로 이동 시 제거 */
 if(p!=='kiosk'){
  var _ppb=document.getElementById('pos-pay-bar');if(_ppb)_ppb.remove();
  var _pcd=document.getElementById('pos-cust-disp');if(_pcd)_pcd.remove();
  if(typeof _posCustSyncStop==='function')_posCustSyncStop();
 }
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

 /* 모바일 하단 탭바 활성 동기화 */
 var _tabPages={home:'home',kiosk:'kiosk',orders:'kiosk',table_qr:'kiosk',waiting:'kiosk',qr_mgmt:'kiosk',menu_mgmt:'menu_mgmt',bakery_qr_mgmt:'menu_mgmt',inventory:'menu_mgmt',auto_order:'menu_mgmt',ai:'ai',margin:'ai',settings:'settings',subscription:'settings'};
 var _activeTab=_tabPages[p]||null;
 document.querySelectorAll('.tab-item').forEach(function(t){t.classList.remove('active');});
 if(_activeTab){var _tb=document.getElementById('tab-'+_activeTab);if(_tb)_tb.classList.add('active');}

 var el=document.getElementById('content');
 var titles={home:'대시보드',members:'직원 관리',schedule:'달력',
 inventory:'재고 대시보드',stock_in:'입고 등록',stock_out:'출고 등록',
 auto_order:'자동 발주',sales_report:'매출·마진',qr_staff:'직원 QR (동적)',table_qr:'테이블 QR',table_mgmt:'테이블 관리',delivery:'배달 주문',schedule:'예약·달력',tax_share:'세무사 연동',member_qr:'회원 QR',cost_mgmt:'원가 관리',
 attendance:'QR 출퇴근',attend_dash:'출퇴근 현황',payroll:'급여 현황',roster:'근무표',
 kiosk:'POS 키오스크',orders:'주문 대기',table_qr:'테이블 QR',points:'포인트 관리',membership:'회원권',pos_report:'매출 집계',
 tax_share:'세무사 연동',notices:'공지사항',settings:'설정',subscription:'구독 관리',
 ai:'AIVO 어시스턴트',waiting:'웨이팅 관리',menu_mgmt:'메뉴 관리',qr_mgmt:'테이블 QR 관리',qr_staff:'STAFFIQ 근태 QR',
 bakery_qr_mgmt:'빵·디저트 QR',inv_dash:'재고 대시보드',margin:'마진 분석',sales:'매출 리포트',expiry:'유통기한 관리',
 branch_monitor:'전가맹점 현황',menu_deploy:'메뉴 일괄 배포',branch_mgmt:'가맹점 관리',hq_notice:'공지 일괄 발송',hq_qsc:'QSC 체크리스트'};
 document.getElementById('topbar-title').textContent=titles[p]||p;

 /* 라우팅 처리 여부 — 미처리 페이지는 아래에서 '준비 중' 안내를 그린다 */
 var _routed=true;

 if(p==='home') _filoPageHome(el);
 else if(p==='ai') _filoPageAI(el);
 else if(p==='kiosk') _filoPageKiosk(el);
 else if(p==='menu_mgmt') _filoLoadAndRun('filo-menu-mgmt.js',function(){_filoPageMenuMgmt(el);});
 else if(p==='qr_mgmt') {
  _filoLoadAndRun('filo-menu-mgmt.js', function(){ _filoPageQrMgmt(el); });
 }
 else if(p==='bakery_qr_mgmt') {
  _filoLoadAndRun('filo-menu-mgmt.js', function(){ _filoBakeryQrMgmt(el); });
 }
 else if(p==='orders') _filoPageOrders(el);
 else if(p==='inventory') _filoPageInventory(el);
 else if(p==='inv_dash'){ _filoLoadAndRun('filo-inventory.js',function(){_filoPageInventoryDash(el);}); }
 else if(p==='stock_in') _filoPageStockIn(el);
 else if(p==='stock_out') _filoPageStockOut(el);
 else if(p==='auto_order') _filoPageAutoOrder(el);
 else if(p==='expiry') _filoPageExpiry(el);
 else if(p==='members') _filoPageMembers(el);
 else if(p==='attend_dash'||p==='attendance'||p==='payroll'||p==='roster'||p==='work_schedule'){
  /* 출퇴근현황·급여명세서·근무표는 DINE에서 통합 관리 */
  var _slug=(_CU&&_CU.dineSlug)||'';
  window.open(_slug?'https://dine.ne.kr/'+encodeURIComponent(_slug):'https://dine.ne.kr/app','_blank');
 }
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
 else if(p==='branch_monitor') _filoPageBranchMonitor(el);
 else if(p==='menu_deploy') _filoPageMenuDeploy(el);
 else if(p==='branch_mgmt') _filoPageBranchMgmt(el);
 else if(p==='hq_notice') _filoPageHqNotice(el);
 else if(p==='hq_qsc') _filoPageQSC(el);
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



/* ─────────────────────────────────────────────────────
   홈 대시보드 — 실시간 운영 현황판
   ───────────────────────────────────────────────────── */
var _homeUnsubs=[];
var _homeOrdersAll=[];
var _homeOrderPage=0;

function _filoPageHome(el){
 /* 이전 리스너 정리 */
 _homeUnsubs.forEach(function(u){try{u();}catch(e){}});
 _homeUnsubs=[];
 _homeOrdersAll=[];
 _homeOrderPage=0;
 ['home_orders','home_attend','home_book'].forEach(function(k){
  if(typeof _FILO_WATCHERS!=='undefined'&&_FILO_WATCHERS[k]){try{_FILO_WATCHERS[k]();}catch(e){} delete _FILO_WATCHERS[k];}
 });

 var did=_CU.dealerId||_CU.uid;
 var today=new Date().toISOString().slice(0,10);
 var todayKr=new Date().toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'});
 var _itype=(_cachedCompanyDoc&&_cachedCompanyDoc.theme)||'other';

 /* 업종별 퀵액션 버튼 */
 var _quickActions={
  cafe:[
   {l:'즉시 결제',ic:'credit-card',p:'kiosk',hint:'POS 결제 바로 시작'},
   {l:'포인트 적립',ic:'star',p:'points',hint:'회원 포인트 적립·사용'},
   {l:'예약 추가',ic:'calendar',p:'schedule',hint:'전화 예약 직접 등록'},
  ],
  izakaya:[
   {l:'테이블 열기',ic:'grid',p:'table_qr',hint:'탭·테이블 현황 보기'},
   {l:'POS 결제',ic:'monitor',p:'kiosk',hint:'결제 화면으로 이동'},
   {l:'주문 대기',ic:'bell',p:'orders',hint:'대기 주문 처리'},
  ],
  fastfood:[
   {l:'빠른 결제',ic:'zap',p:'kiosk',hint:'POS 결제 바로 시작'},
   {l:'주문 대기',ic:'bell',p:'orders',hint:'주문 현황 보기'},
   {l:'재고 확인',ic:'package',p:'inventory',hint:'재고 부족 확인'},
  ],
  other:[
   {l:'POS 결제',ic:'monitor',p:'kiosk',hint:'결제 화면으로 이동'},
   {l:'예약·달력',ic:'calendar',p:'schedule',hint:'예약 현황 확인'},
   {l:'주문 대기',ic:'bell',p:'orders',hint:'대기 주문 처리'},
  ]
 };
 var _qa=_quickActions[_itype]||_quickActions.other;
 var _qaHtml='<div class="card-cascade" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">'+
  _qa.map(function(q){
   return '<button onclick="_filoGoPage(\''+q.p+'\')" title="'+esc(q.hint)+'" '+
    'style="padding:14px 6px 12px;background:var(--surface);border:1px solid var(--bd2);border-radius:12px;cursor:pointer;text-align:center;transition:all .2s;position:relative;overflow:hidden" '+
    'onmouseover="this.style.borderColor=\'rgba(200,163,86,.55)\';this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 20px rgba(200,163,86,.12)\'" '+
    'onmouseout="this.style.borderColor=\'var(--bd2)\';this.style.transform=\'\';this.style.boxShadow=\'\'">'+
    '<div style="display:flex;justify-content:center;margin-bottom:7px;color:var(--br)">'+_svgIcon(q.ic)+'</div>'+
    '<div style="font-size:11px;font-weight:800;color:var(--tx);letter-spacing:-.1px">'+esc(q.l)+'</div>'+
    '<div style="font-size:9px;color:var(--t3);margin-top:2px">'+esc(q.hint)+'</div>'+
    '</button>';
  }).join('')+
 '</div>';

 el.innerHTML=
  '<style>@keyframes _hpulse{0%,100%{opacity:1}50%{opacity:.35}}</style>'+
  '<div class="slide-up" style="max-width:680px;margin:0 auto;padding-bottom:32px">'+

  /* 운영 상태 + 날짜 */
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
  '<div id="hm-status-wrap" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:99px;background:var(--b3);border:1px solid var(--bd)">'+
  '<span id="hm-dot" style="width:7px;height:7px;border-radius:50%;background:var(--t3);animation:_hpulse 2s infinite"></span>'+
  '<span id="hm-status" style="font-size:12px;font-weight:800;color:var(--t3)">연결 중...</span>'+
  '</div>'+
  '<div style="font-size:12px;color:var(--t3);font-weight:600">'+todayKr+'</div>'+
  '</div>'+

  /* 오늘 매출 히어로 */
  '<div class="hero-card" style="margin-bottom:16px">'+
  '<div style="position:relative;z-index:1">'+
  /* 헤더 행: 브랜드 레이블 + 매장 날짜 */
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
  '<div style="display:flex;align-items:center;gap:6px">'+
  '<div style="width:18px;height:18px;border-radius:5px;background:linear-gradient(135deg,#C8A356,#D4B46E);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'#0B1F3A\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><rect x=\'2\' y=\'3\' width=\'20\' height=\'14\' rx=\'2\'/><line x1=\'8\' y1=\'21\' x2=\'16\' y2=\'21\'/><line x1=\'12\' y1=\'17\' x2=\'12\' y2=\'21\'/></svg></div>'+
  '<span style="font-size:9px;font-weight:800;color:rgba(200,163,86,.7);letter-spacing:1.8px;text-transform:uppercase">오늘 영업 현황</span>'+
  '</div>'+
  '<span id="hm-dot-hero" style="width:6px;height:6px;border-radius:50%;background:#C8A356;animation:_hpulse 2s infinite;flex-shrink:0;box-shadow:0 0 6px rgba(200,163,86,.5)"></span>'+
  '</div>'+
  /* 매출 수치 */
  '<div id="hm-sales" style="font-size:36px;font-weight:900;letter-spacing:-1.5px;font-variant-numeric:tabular-nums;color:#fff;line-height:1">₩ —</div>'+
  /* 서브 스탯 3개 */
  '<div style="display:flex;gap:0;margin-top:16px;border-top:1px solid rgba(255,255,255,.07);padding-top:14px">'+
  '<div style="flex:1;padding-right:16px;border-right:1px solid rgba(255,255,255,.07)"><div style="font-size:9px;color:rgba(255,255,255,.35);letter-spacing:.5px;margin-bottom:3px;text-transform:uppercase">주문 건수</div>'+
  '<div id="hm-cnt" style="font-size:22px;font-weight:900;font-variant-numeric:tabular-nums;color:#E2CA96">—</div></div>'+
  '<div style="flex:1;padding:0 16px;border-right:1px solid rgba(255,255,255,.07)"><div style="font-size:9px;color:rgba(255,255,255,.35);letter-spacing:.5px;margin-bottom:3px;text-transform:uppercase">평균 단가</div>'+
  '<div id="hm-avg" style="font-size:22px;font-weight:900;font-variant-numeric:tabular-nums;color:#E2CA96">—</div></div>'+
  '<div style="flex:1;padding-left:16px"><div style="font-size:9px;color:rgba(255,255,255,.35);letter-spacing:.5px;margin-bottom:3px;text-transform:uppercase">미처리 주문</div>'+
  '<div id="hm-pending" style="font-size:22px;font-weight:900;font-variant-numeric:tabular-nums;color:#FB923C">—</div></div>'+
  '</div></div></div>'+

  /* 업종별 퀵액션 */
  _qaHtml+

  /* 타일 3개 */
  '<div class="card-cascade" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">'+
  _hmTileHtml('hm-t-staff','직원 출근','명')+
  _hmTileHtml('hm-t-wait','웨이팅 대기','팀')+
  _hmTileHtml('hm-t-inv','재고 부족','개')+
  '</div>'+

  /* 최근 주문 5개 */
  '<div class="card" style="margin-bottom:14px">'+
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
  '<div style="font-size:13px;font-weight:800">최근 주문</div>'+
  '<div style="display:flex;align-items:center;gap:6px">'+
  '<button onclick="_hmPrev()" style="width:30px;height:30px;border-radius:50%;background:var(--b3);border:1px solid var(--bd);color:var(--t2);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">‹</button>'+
  '<span id="hm-pg" style="font-size:11px;color:var(--t3);min-width:32px;text-align:center">0/0</span>'+
  '<button onclick="_hmNext()" style="width:30px;height:30px;border-radius:50%;background:var(--b3);border:1px solid var(--bd);color:var(--t2);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">›</button>'+
  '</div></div>'+
  '<div id="hm-orders"><div style="color:var(--t3);font-size:12px;text-align:center;padding:20px">불러오는 중...</div></div>'+
  '</div>'+

  /* 예약·웨이팅 실시간 */
  '<div class="card">'+
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
  '<div style="font-size:13px;font-weight:800">오늘 예약·웨이팅</div>'+
  '<span id="hm-bk-cnt" style="font-size:11px;color:var(--t3)"></span>'+
  '</div>'+
  '<div id="hm-bookings"><div style="color:var(--t3);font-size:12px;text-align:center;padding:20px">불러오는 중...</div></div>'+
  '</div>'+
  '</div>';

 /* Listener 1: 오늘 주문 */
 var u1=_db.collection('filo_orders')
  .where('dealerId','==',did).where('date','==',today).orderBy('createdAt','desc')
  .onSnapshot(function(snap){
   var all=[]; snap.forEach(function(d){all.push(Object.assign({id:d.id},d.data()));});
   var active=all.filter(function(o){return o.status!=='cancelled';});
   var tot=active.reduce(function(s,o){return s+(o.totalPrice||o.total||0);},0);
   var cnt=active.length;
   var avg=cnt?Math.round(tot/cnt):0;
   var pend=all.filter(function(o){return o.status==='pending'||o.status==='confirmed';}).length;

   var eS=document.getElementById('hm-sales');
   if(eS){ if(typeof _filoCountUp==='function')_filoCountUp(eS,tot,'₩ ',''); else eS.textContent='₩ '+tot.toLocaleString(); }
   var eC=document.getElementById('hm-cnt');
   if(eC){ if(typeof _filoCountUp==='function')_filoCountUp(eC,cnt,'','건'); else eC.textContent=cnt+'건'; }
   var eA=document.getElementById('hm-avg');
   if(eA){ if(avg&&typeof _filoCountUp==='function')_filoCountUp(eA,avg,'₩',''); else eA.textContent=avg?'₩'+avg.toLocaleString():'—'; }
   var eP=document.getElementById('hm-pending');
   if(eP){if(typeof _filoCountUp==='function')_filoCountUp(eP,pend,'','');else eP.textContent=pend;eP.style.color=pend>0?'#ef4444':'rgba(255,255,255,.45)';}

   var sw=document.getElementById('hm-status-wrap'),sd=document.getElementById('hm-dot'),st=document.getElementById('hm-status');
   if(cnt>0){
    if(sw){sw.style.background='rgba(34,197,94,.1)';sw.style.borderColor='rgba(34,197,94,.3)';}
    if(sd)sd.style.background='#22c55e';
    if(st){st.textContent='운영 중';st.style.color='#22c55e';}
   } else {
    if(sw){sw.style.background='var(--b3)';sw.style.borderColor='var(--bd)';}
    if(sd)sd.style.background='var(--t3)';
    if(st){st.textContent='주문 없음';st.style.color='var(--t3)';}
   }
   _homeOrdersAll=active; _homeOrderPage=0; _hmRenderPage();
  },function(){});
 _homeUnsubs.push(u1);
 if(typeof _FILO_WATCHERS!=='undefined')_FILO_WATCHERS.home_orders=u1;

 /* Listener 2: 직원 출근 */
 var u2=_db.collection('attendance')
  .where('dealerId','==',did).where('date','==',today).where('type','==','in')
  .onSnapshot(function(snap){
   var e=document.getElementById('hm-t-staff'); if(e)_hmTileSet(e,snap.size,'');
  },function(){});
 _homeUnsubs.push(u2);
 if(typeof _FILO_WATCHERS!=='undefined')_FILO_WATCHERS.home_attend=u2;

 /* Listener 3: 예약·웨이팅 */
 var u3=_db.collection('filo_bookings')
  .where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(snap){
   var items=[]; snap.forEach(function(d){items.push(Object.assign({id:d.id},d.data()));});
   items.sort(function(a,b){return(a.time||'').localeCompare(b.time||'');});
   var waiting=items.filter(function(i){return i.status==='waiting'||!i.status;}).length;
   var ew=document.getElementById('hm-t-wait'); if(ew)_hmTileSet(ew,waiting,waiting>3?'warn':'');
   var ec=document.getElementById('hm-bk-cnt'); if(ec)ec.textContent=items.length?'총 '+items.length+'건':'';
   var el2=document.getElementById('hm-bookings'); if(!el2)return;
   if(!items.length){el2.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">오늘 예약·웨이팅 없음</div>';return;}
   el2.innerHTML=items.map(function(b){
    var sc=b.status==='confirmed'?'#22c55e':b.status==='cancelled'?'#ef4444':'#c9a84c';
    var sl=b.status==='confirmed'?'확정':b.status==='cancelled'?'취소':'대기';
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd)">'+
     '<div style="font-size:13px;font-weight:900;color:#c9a84c;min-width:44px;font-variant-numeric:tabular-nums">'+(b.time||'—')+'</div>'+
     '<div style="flex:1;min-width:0">'+
     '<div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(b.guestName||b.name||'이름 없음')+'</div>'+
     '<div style="font-size:11px;color:var(--t3)">'+(b.partySize||1)+'명'+(b.phone?' · '+b.phone:'')+'</div>'+
     '</div>'+
     '<span style="font-size:11px;font-weight:700;color:'+sc+';padding:3px 9px;border-radius:99px;background:'+sc+'1a;border:1px solid '+sc+'33;white-space:nowrap">'+sl+'</span>'+
     '</div>';
   }).join('');
  },function(){});
 _homeUnsubs.push(u3);
 if(typeof _FILO_WATCHERS!=='undefined')_FILO_WATCHERS.home_book=u3;

 /* One-shot: 재고 부족 */
 _db.collection('filo_inventory').where('dealerId','==',did).get()
  .then(function(snap){
   var low=0;
   snap.forEach(function(d){var v=d.data();if(typeof v.stock==='number'&&typeof v.minStock==='number'&&v.stock<=v.minStock)low++;});
   var e=document.getElementById('hm-t-inv'); if(e)_hmTileSet(e,low,low>0?'warn':'');
  }).catch(function(){});
}

function _hmTileHtml(id,label,unit){
 return '<div class="card" style="text-align:center;padding:16px 8px;border-top:2px solid rgba(200,163,86,.15);position:relative;overflow:hidden">'+
  '<div style="font-size:9px;font-weight:800;color:var(--t3);margin-bottom:8px;letter-spacing:.8px;text-transform:uppercase">'+label+'</div>'+
  '<div id="'+id+'" style="font-size:28px;font-weight:900;font-variant-numeric:tabular-nums;color:var(--t3);letter-spacing:-1px;line-height:1">—</div>'+
  '<div style="font-size:9px;color:var(--t3);margin-top:5px;font-weight:600">'+unit+'</div>'+
  '</div>';
}

function _hmTileSet(el,val,flag){
 if(!el)return;
 el.textContent=val;
 el.style.color=flag==='warn'&&val>0?'#ef4444':val===0?'var(--t3)':'var(--tx)';
}

function _hmRenderPage(){
 var listEl=document.getElementById('hm-orders');
 var pgEl=document.getElementById('hm-pg');
 if(!listEl)return;
 var tot=_homeOrdersAll.length;
 if(!tot){
  listEl.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:24px">오늘 주문 없음</div>';
  if(pgEl)pgEl.textContent='0/0'; return;
 }
 var pages=Math.ceil(tot/5);
 _homeOrderPage=Math.max(0,Math.min(_homeOrderPage,pages-1));
 if(pgEl)pgEl.textContent=(_homeOrderPage+1)+'/'+pages;
 var slice=_homeOrdersAll.slice(_homeOrderPage*5,_homeOrderPage*5+5);
 listEl.innerHTML=slice.map(function(o){
  var sc=o.status==='completed'?'#22c55e':o.status==='cancelled'?'#ef4444':'#c9a84c';
  var sl=o.status==='completed'?'완료':o.status==='cancelled'?'취소':o.status==='confirmed'?'진행':'대기';
  var names=(o.items||[]).slice(0,2).map(function(i){return i.name||'';}).join(', ');
  if((o.items||[]).length>2)names+=' 외 '+((o.items||[]).length-2)+'개';
  var tbl=o.tableNum!=null?'테이블 '+o.tableNum:(o.tableName||'');
  var price=(o.totalPrice||o.total||0).toLocaleString();
  var time=''; try{if(o.createdAt&&o.createdAt.toDate)time=o.createdAt.toDate().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});}catch(e){}
  return '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--bd)">'+
   '<div style="flex:1;min-width:0">'+
   '<div style="font-size:13px;font-weight:700">'+tbl+(names?' · '+names:'')+'</div>'+
   '<div style="font-size:11px;color:var(--t3);margin-top:2px">₩'+price+(time?' · '+time:'')+'</div>'+
   '</div>'+
   '<span style="font-size:11px;font-weight:700;color:'+sc+';padding:3px 9px;border-radius:99px;background:'+sc+'1a;border:1px solid '+sc+'33;white-space:nowrap">'+sl+'</span>'+
   '</div>';
 }).join('');
}

function _hmNext(){_homeOrderPage++;_hmRenderPage();}
function _hmPrev(){_homeOrderPage--;_hmRenderPage();}

function _filoPageCostMgmt(el){
 var did=_CU&&(_CU.dealerId||_CU.uid);
 if(!did||!el)return;
 el.innerHTML='<div class="page-hdr"><h1 class="page-title">원가 관리</h1></div>'+
  '<div id="mg-content" style="min-height:200px"><div class="spinner"></div></div>';
 if(typeof _filoRenderCostMgmt==='function')_filoRenderCostMgmt(did);
}

/* ── 페이지별 실시간 리스너 소유권 표 ──────────────────────────────
   각 모듈은 자기 페이지의 onSnapshot 해제 함수를 아래 전역에 보관한다.
   페이지를 벗어날 때 여기서 일괄 해제해 리스너가 누적되지 않게 한다.
   (같은 페이지로 재진입할 때는 해당 모듈이 스스로 재구독하므로 건너뛴다)
   ────────────────────────────────────────────────────────────────── */
var _FILO_WATCHERS=[
 {pages:['orders'],          keys:['_ordersUnsub']},
 {pages:['margin'], keys:['_marginUnsub']},
 {pages:['schedule'],        keys:['_calUnsub']},
 {pages:['table_qr'],        keys:['_tableUnsub','_bookingUnsub','_callUnsub','_tableOrderUnsub']},
 {pages:['table_mgmt'],      keys:['_tableMgmtUnsub']},
 {pages:['waiting'],         keys:['_waitUnsub','_waitSeatedUnsub']},
 {pages:['kiosk'],           keys:['_kioskTableUnsub']},
 {pages:['delivery'],        keys:['_deliveryUnsub']}
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
}
window._filoReleaseWatchers=_filoReleaseWatchers;

/* POS·주문 페이지에서만 음성 주문 FAB을 띄운다 */
function _filoSyncVoiceFab(p){
 var show=(p==='kiosk'||p==='orders');
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
 if(k!=='combo') _filoToast('재고관리·키오스크는 콤보 플랜으로만 제공됩니다 (165,000원/월)');
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
 _filoToast('등록 완료! 7일 무료 체험을 시작합니다');
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
 if(window._filoDineResUnsub){try{window._filoDineResUnsub();}catch(e){} window._filoDineResUnsub=null;}
 if(window._tickerAttendUnsub){try{window._tickerAttendUnsub();}catch(e){} window._tickerAttendUnsub=null;}
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
  _filoGoPage('kiosk');
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

/* ──────────────────────────────────────────────────────────
   프랜차이즈 HQ — 전가맹점 현황 (랭킹 테이블)
   ────────────────────────────────────────────────────────── */
function _filoPageBranchMonitor(el){
 if(!el)el=document.getElementById('content');
 var did=_CU&&(_CU.dealerId||_CU.uid);
 var medals=['🥇','🥈','🥉'];
 el.innerHTML=
  '<div class="slide-up" style="max-width:860px;margin:0 auto;padding-bottom:32px">'+
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'+
  '<div>'+
  '<div style="font-size:12px;color:var(--t3);letter-spacing:.5px;margin-bottom:4px">본사 HQ</div>'+
  '<div style="font-size:22px;font-weight:900">전가맹점 현황</div>'+
  '</div>'+
  '<button onclick="_filoPageBranchMonitor()" style="padding:7px 14px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t2);font-size:12px;cursor:pointer">새로고침</button>'+
  '</div>'+
  '<div id="hq-summary" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">'+
  '<div class="card" style="text-align:center;padding:18px 6px"><div style="font-size:10px;color:var(--t3);margin-bottom:6px">가맹점 수</div><div id="hq-cnt" style="font-size:26px;font-weight:900">—</div></div>'+
  '<div class="card" style="text-align:center;padding:18px 6px"><div style="font-size:10px;color:var(--t3);margin-bottom:6px">오늘 총매출</div><div id="hq-sales" style="font-size:18px;font-weight:900;font-variant-numeric:tabular-nums">— </div></div>'+
  '<div class="card" style="text-align:center;padding:18px 6px"><div style="font-size:10px;color:var(--t3);margin-bottom:6px">총 주문</div><div id="hq-orders" style="font-size:26px;font-weight:900">—</div></div>'+
  '<div class="card" style="text-align:center;padding:18px 6px"><div style="font-size:10px;color:var(--t3);margin-bottom:6px">활성 매장</div><div id="hq-active" style="font-size:26px;font-weight:900;color:#22c55e">—</div></div>'+
  '</div>'+
  '<div class="card">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:14px">오늘 매출 랭킹</div>'+
  '<div id="hq-branches"><div style="color:var(--t3);font-size:12px;text-align:center;padding:30px">데이터 집계 중...</div></div>'+
  '</div></div>';
 if(!did)return;
 var today=new Date().toISOString().slice(0,10);
 _db.collection('companies').where('hqDealerId','==',did).get()
  .then(function(snap){
   var branches=[];
   snap.forEach(function(d){branches.push(Object.assign({id:d.id,sales:0,orderCnt:0},d.data()));});
   var cnt=document.getElementById('hq-cnt');if(cnt)cnt.textContent=branches.length;
   if(!branches.length){
    var bEl=document.getElementById('hq-branches');
    if(bEl)bEl.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:30px">등록된 가맹점이 없습니다.<br><button onclick="_filoGoPage(\'branch_mgmt\')" style="margin-top:10px;padding:7px 16px;background:#c9a84c;border:none;border-radius:8px;color:#0f172a;font-size:12px;font-weight:800;cursor:pointer">가맹점 추가하기</button></div>';
    return;
   }
   var proms=branches.map(function(b,i){
    return _db.collection('filo_orders')
     .where('dealerId','==',b.id).where('date','==',today).get()
     .then(function(os){
      os.forEach(function(d){
       var v=d.data();
       if((v.status||'')!=='cancelled'){b.sales+=(v.totalPrice||v.total||0)*1;b.orderCnt++;}
      });
     }).catch(function(){});
   });
   Promise.all(proms).then(function(){
    branches.sort(function(a,b2){return b2.sales-a.sales;});
    var totalSales=branches.reduce(function(a,b2){return a+b2.sales;},0);
    var totalOrders=branches.reduce(function(a,b2){return a+b2.orderCnt;},0);
    var activeCnt=branches.filter(function(b2){return b2.sales>0;}).length;
    var maxSales=branches[0]?branches[0].sales:0;
    var eS=document.getElementById('hq-sales');if(eS)eS.textContent='₩'+totalSales.toLocaleString();
    var eO=document.getElementById('hq-orders');if(eO)eO.textContent=totalOrders;
    var eA=document.getElementById('hq-active');if(eA)eA.textContent=activeCnt;
    var rows=branches.map(function(b2,i){
     var pct=maxSales>0?Math.max(4,Math.round(b2.sales/maxSales*100)):4;
     var rank=i<3?medals[i]:'<span style="font-size:13px;font-weight:900;color:var(--t3)">'+(i+1)+'</span>';
     var barColor=i===0?'#c9a84c':i===1?'#94a3b8':i===2?'#b45309':'var(--t3)';
     var statusColor=b2.sales>0?'#22c55e':'#64748b';
     return '<div style="display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bd)">'+
      '<div style="text-align:center;font-size:18px">'+rank+'</div>'+
      '<div style="min-width:0">'+
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'+
      '<span style="width:7px;height:7px;border-radius:50%;background:'+statusColor+';flex-shrink:0"></span>'+
      '<span style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(b2.name||b2.id)+'</span>'+
      '</div>'+
      '<div style="height:6px;background:var(--b3);border-radius:3px;overflow:hidden">'+
      '<div style="height:100%;width:'+pct+'%;background:'+barColor+';border-radius:3px;transition:width .4s ease"></div></div>'+
      '</div>'+
      '<div style="text-align:right;flex-shrink:0">'+
      '<div style="font-size:13px;font-weight:900;font-variant-numeric:tabular-nums">₩'+b2.sales.toLocaleString()+'</div>'+
      '<div style="font-size:10px;color:var(--t3)">'+b2.orderCnt+'건</div>'+
      '</div></div>';
    }).join('');
    var bEl2=document.getElementById('hq-branches');
    if(bEl2)bEl2.innerHTML=rows||'<div style="color:var(--t3);text-align:center;padding:20px;font-size:12px">오늘 매출 없음</div>';
   });
  }).catch(function(e){console.error('branch_monitor:',e);});
}

/* ──────────────────────────────────────────────────────────
   프랜차이즈 HQ — 메뉴 일괄 배포
   ────────────────────────────────────────────────────────── */
function _filoPageMenuDeploy(el){
 if(!el)el=document.getElementById('content');
 var did=_CU&&(_CU.dealerId||_CU.uid);
 el.innerHTML=
  '<div class="slide-up" style="max-width:680px;margin:0 auto;padding-bottom:32px">'+
  '<div style="margin-bottom:20px">'+
  '<div style="font-size:12px;color:var(--t3);letter-spacing:.5px;margin-bottom:4px">본사 HQ</div>'+
  '<div style="font-size:22px;font-weight:900">메뉴 일괄 배포</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-top:6px">본사 메뉴를 전 가맹점에 동기화합니다.</div>'+
  '</div>'+
  '<div class="card" style="margin-bottom:16px">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:12px">배포 옵션</div>'+
  '<label style="display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer">'+
  '<input type="checkbox" id="hq-deploy-add" checked style="accent-color:#c9a84c">'+
  '<span style="font-size:13px">신규 메뉴 추가</span></label>'+
  '<label style="display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer">'+
  '<input type="checkbox" id="hq-deploy-price" checked style="accent-color:#c9a84c">'+
  '<span style="font-size:13px">가격 동기화</span></label>'+
  '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">'+
  '<input type="checkbox" id="hq-deploy-del" style="accent-color:#c9a84c">'+
  '<span style="font-size:13px">삭제된 메뉴 가맹점에서도 제거 <span style="font-size:11px;color:#ef4444">(주의)</span></span></label>'+
  '</div>'+
  '<div class="card" style="margin-bottom:16px">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:12px">대상 가맹점</div>'+
  '<div id="hq-dep-branches"><div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">불러오는 중...</div></div>'+
  '</div>'+
  '<button onclick="_filoHqDeploy()" style="width:100%;padding:14px;background:#c9a84c;border:none;border-radius:10px;color:#0f172a;font-size:14px;font-weight:900;cursor:pointer">'+
  '전체 가맹점에 배포</button>'+
  '<div id="hq-dep-log" style="margin-top:16px;font-size:11px;color:var(--t3)"></div>'+
  '</div>';
 if(!did)return;
 _db.collection('companies').where('hqDealerId','==',did).get()
  .then(function(snap){
   var bEl=document.getElementById('hq-dep-branches');
   if(!snap.size){if(bEl)bEl.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">등록된 가맹점 없음</div>';return;}
   var html='';snap.forEach(function(d){
    var b=d.data();
    html+='<label style="display:flex;align-items:center;gap:10px;margin-bottom:8px;cursor:pointer">'+
     '<input type="checkbox" class="hq-dep-chk" value="'+esc(d.id)+'" checked style="accent-color:#c9a84c">'+
     '<span style="font-size:13px">'+(b.name||d.id)+'</span></label>';
   });
   if(bEl)bEl.innerHTML=html;
  }).catch(function(){});
}

window._filoHqDeploy=function(){
 var did=_CU&&(_CU.dealerId||_CU.uid);
 if(!did){_filoToast('로그인 정보가 없습니다.');return;}
 var targets=[];
 document.querySelectorAll('.hq-dep-chk:checked').forEach(function(c){targets.push(c.value);});
 if(!targets.length){_filoToast('대상 가맹점을 선택하세요.');return;}
 var doAdd=document.getElementById('hq-deploy-add')&&document.getElementById('hq-deploy-add').checked;
 var doPrice=document.getElementById('hq-deploy-price')&&document.getElementById('hq-deploy-price').checked;
 var doDel=document.getElementById('hq-deploy-del')&&document.getElementById('hq-deploy-del').checked;
 var logEl=document.getElementById('hq-dep-log');
 if(logEl)logEl.textContent='배포 시작...';
 _db.collection('filo_menus').where('dealerId','==',did).get()
  .then(function(snap){
   var menus=[];snap.forEach(function(d){menus.push(Object.assign({id:d.id},d.data()));});
   if(!menus.length){_filoToast('본사 메뉴가 없습니다.');return;}
   var done=0;
   function next(i){
    if(i>=targets.length){
     _filoToast('배포 완료: '+targets.length+'개 가맹점');
     if(logEl)logEl.textContent='✓ '+targets.length+'개 가맹점 배포 완료 ('+menus.length+'개 메뉴)';
     return;
    }
    var bDid=targets[i];
    var batch=_db.batch();
    var now=new Date().toISOString();
    if(doAdd){
     menus.forEach(function(m){
      var ref=_db.collection('filo_menus').doc(bDid+'_'+m.id);
      var data={dealerId:bDid,name:m.name,category:m.category,emoji:m.emoji||'',forSale:m.forSale!==false,imageUrl:m.imageUrl||'',description:m.description||'',nameTranslations:m.nameTranslations||{},hqDeployed:true,hqMenuId:m.id,updatedAt:now};
      if(doPrice)data.price=m.price;
      batch.set(ref,data,{merge:true});
     });
    }
    batch.commit()
     .then(function(){done++;if(logEl)logEl.textContent='배포 중... '+done+'/'+targets.length;next(i+1);})
     .catch(function(e){console.error(bDid,e);next(i+1);});
   }
   next(0);
  }).catch(function(e){_filoToast('메뉴 로드 실패');console.error(e);});
};

/* ──────────────────────────────────────────────────────────
   프랜차이즈 HQ — 가맹점 관리
   ────────────────────────────────────────────────────────── */
function _filoPageBranchMgmt(el){
 if(!el)el=document.getElementById('content');
 var did=_CU&&(_CU.dealerId||_CU.uid);
 var loadList=function(){
  var listEl=document.getElementById('branch-list');if(!listEl)return;
  listEl.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">불러오는 중...</div>';
  _db.collection('companies').where('hqDealerId','==',did).get()
   .then(function(snap){
    if(!snap.size){listEl.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">등록된 가맹점이 없습니다</div>';return;}
    var html='';
    snap.forEach(function(d){
     var b=d.data();
     html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bd)">'+
      '<div><div style="font-size:13px;font-weight:700">'+(b.name||d.id)+'</div>'+
      '<div style="font-size:11px;color:var(--t3)">'+(b.email||d.id)+'</div></div>'+
      '<button onclick="_filoHqRemoveBranch(\''+esc(d.id)+'\')" style="padding:4px 10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:6px;color:#ef4444;font-size:11px;cursor:pointer">해제</button></div>';
    });
    listEl.innerHTML=html;
   }).catch(function(){listEl.innerHTML='<div style="color:#ef4444;font-size:12px;text-align:center;padding:16px">로드 실패</div>';});
 };
 el.innerHTML=
  '<div class="slide-up" style="max-width:680px;margin:0 auto;padding-bottom:32px">'+
  '<div style="margin-bottom:20px">'+
  '<div style="font-size:12px;color:var(--t3);letter-spacing:.5px;margin-bottom:4px">본사 HQ</div>'+
  '<div style="font-size:22px;font-weight:900">가맹점 관리</div>'+
  '</div>'+
  '<div class="card" style="margin-bottom:16px">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:8px">가맹점 추가</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-bottom:8px">가맹점 딜러 ID를 입력하면 본사 HQ에 연결됩니다.</div>'+
  '<div style="display:flex;gap:8px">'+
  '<input id="branch-add-id" placeholder="가맹점 dealerId 입력" style="flex:1;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px;outline:none">'+
  '<button onclick="_filoHqAddBranch()" style="padding:10px 16px;background:#c9a84c;border:none;border-radius:8px;color:#0f172a;font-size:13px;font-weight:800;cursor:pointer">추가</button>'+
  '</div></div>'+
  '<div class="card">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:12px">등록된 가맹점</div>'+
  '<div id="branch-list"><div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">불러오는 중...</div></div>'+
  '</div></div>';
 loadList();
 window._filoHqAddBranch=function(){
  var inp=document.getElementById('branch-add-id');
  var bId=(inp&&inp.value.trim())||'';
  if(!bId){_filoToast('가맹점 ID를 입력하세요.');return;}
  _filoToast('연결 중...');
  _db.collection('companies').doc(bId).get()
   .then(function(doc){
    if(!doc.exists){_filoToast('존재하지 않는 가맹점 ID입니다.');return Promise.resolve();}
    return doc.ref.update({hqDealerId:did,hqLinkedAt:new Date().toISOString()})
     .then(function(){_filoToast('가맹점 연결 완료!');if(inp)inp.value='';loadList();});
   }).catch(function(e){_filoToast('연결 실패: '+e.message);});
 };
 window._filoHqRemoveBranch=function(bId){
  if(!confirm('가맹점 연결을 해제하시겠습니까?'))return;
  _db.collection('companies').doc(bId).update({hqDealerId:firebase.firestore.FieldValue.delete()})
   .then(function(){_filoToast('연결 해제 완료');loadList();})
   .catch(function(e){_filoToast('해제 실패: '+e.message);});
 };
}

/* ──────────────────────────────────────────────────────────
   프랜차이즈 HQ — 공지 일괄 발송
   ────────────────────────────────────────────────────────── */
function _filoPageHqNotice(el){
 if(!el)el=document.getElementById('content');
 var did=_CU&&(_CU.dealerId||_CU.uid);
 el.innerHTML=
  '<div class="slide-up" style="max-width:680px;margin:0 auto;padding-bottom:32px">'+
  '<div style="margin-bottom:20px">'+
  '<div style="font-size:12px;color:var(--t3);letter-spacing:.5px;margin-bottom:4px">본사 HQ</div>'+
  '<div style="font-size:22px;font-weight:900">공지 일괄 발송</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-top:6px">전 가맹점에 공지사항을 즉시 발송합니다.</div>'+
  '</div>'+
  '<div class="card" style="margin-bottom:16px">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:12px">공지 작성</div>'+
  '<input id="hq-ntc-title" placeholder="제목" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px;outline:none;margin-bottom:10px;box-sizing:border-box">'+
  '<textarea id="hq-ntc-body" placeholder="공지 내용을 입력하세요..." rows="5" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px;outline:none;resize:vertical;box-sizing:border-box;margin-bottom:10px"></textarea>'+
  '<div style="display:flex;gap:8px">'+
  '<select id="hq-ntc-type" style="padding:8px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:12px">'+
  '<option value="info">일반 공지</option><option value="urgent">긴급 공지</option><option value="event">이벤트</option></select>'+
  '<button onclick="_filoHqSendNotice()" style="flex:1;padding:10px 16px;background:#c9a84c;border:none;border-radius:8px;color:#0f172a;font-size:13px;font-weight:800;cursor:pointer">전체 발송</button>'+
  '</div></div>'+
  '<div class="card">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:12px">발송 이력</div>'+
  '<div id="hq-ntc-history"><div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">불러오는 중...</div></div>'+
  '</div></div>';
 _db.collection('hq_notices').where('hqDealerId','==',did).where('dealerId','==',null).orderBy('createdAt','desc').limit(10).get()
  .catch(function(){return _db.collection('hq_notices').where('hqDealerId','==',did).orderBy('createdAt','desc').limit(10).get();})
  .then(function(snap){
   var hEl=document.getElementById('hq-ntc-history');if(!hEl)return;
   if(!snap.size){hEl.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">발송 이력 없음</div>';return;}
   var html='';
   snap.forEach(function(d){
    var n=d.data();
    var dt=n.createdAt?(new Date(n.createdAt)).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
    var typeC=n.type==='urgent'?'#ef4444':n.type==='event'?'#c9a84c':'var(--t3)';
    html+='<div style="padding:10px 0;border-bottom:1px solid var(--bd)">'+
     '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">'+
     '<span style="font-size:10px;color:'+typeC+';font-weight:700">'+(n.type==='urgent'?'긴급':n.type==='event'?'이벤트':'공지')+'</span>'+
     '<span style="font-size:13px;font-weight:700">'+esc(n.title||'')+'</span>'+
     '<span style="font-size:11px;color:var(--t3);margin-left:auto">'+dt+'</span></div>'+
     '<div style="font-size:12px;color:var(--t2)">'+esc((n.body||'').slice(0,80))+(n.body&&n.body.length>80?'...':'')+'</div>'+
     (n.branchCount?'<div style="font-size:11px;color:var(--t3);margin-top:2px">'+n.branchCount+'개 가맹점 수신</div>':'')+'</div>';
   });
   hEl.innerHTML=html;
  }).catch(function(e){var hEl=document.getElementById('hq-ntc-history');if(hEl)hEl.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">이력 없음</div>';});
 window._filoHqSendNotice=function(){
  var t=(document.getElementById('hq-ntc-title')&&document.getElementById('hq-ntc-title').value.trim())||'';
  var b=(document.getElementById('hq-ntc-body')&&document.getElementById('hq-ntc-body').value.trim())||'';
  var tp=(document.getElementById('hq-ntc-type')&&document.getElementById('hq-ntc-type').value)||'info';
  if(!t||!b){_filoToast('제목과 내용을 입력하세요.');return;}
  _db.collection('companies').where('hqDealerId','==',did).get()
   .then(function(snap){
    if(!snap.size){_filoToast('등록된 가맹점이 없습니다.');return Promise.resolve();}
    var batch=_db.batch();var now=new Date().toISOString();
    var master=_db.collection('hq_notices').doc();
    batch.set(master,{hqDealerId:did,title:t,body:b,type:tp,createdAt:now,branchCount:snap.size});
    snap.forEach(function(d){
     batch.set(_db.collection('hq_notices').doc(),{hqDealerId:did,dealerId:d.id,title:t,body:b,type:tp,read:false,createdAt:now});
    });
    return batch.commit();
   })
   .then(function(){
    _filoToast('공지 발송 완료!');
    if(document.getElementById('hq-ntc-title'))document.getElementById('hq-ntc-title').value='';
    if(document.getElementById('hq-ntc-body'))document.getElementById('hq-ntc-body').value='';
    _filoGoPage('hq_notice');
   }).catch(function(e){_filoToast('발송 실패: '+e.message);});
 };
}

/* ──────────────────────────────────────────────────────────
   프랜차이즈 HQ — QSC 체크리스트
   ────────────────────────────────────────────────────────── */
function _filoPageQSC(el){
 if(!el)el=document.getElementById('content');
 var did=_CU&&(_CU.dealerId||_CU.uid);
 var _qscItems=[
  {id:'c_floor',cat:'C',label:'바닥·테이블 청결'},
  {id:'c_kitchen',cat:'C',label:'주방 위생 상태'},
  {id:'c_restroom',cat:'C',label:'화장실 청결'},
  {id:'s_greeting',cat:'S',label:'직원 인사 서비스'},
  {id:'s_time',cat:'S',label:'주문~제공 대기시간'},
  {id:'s_uniform',cat:'S',label:'유니폼·용모 단정'},
  {id:'q_taste',cat:'Q',label:'음식·음료 맛 품질'},
  {id:'q_portion',cat:'Q',label:'양 기준 준수'},
  {id:'q_temp',cat:'Q',label:'온도·신선도 유지'},
 ];
 var catC={Q:'#3b82f6',S:'#22c55e',C:'#f59e0b'};
 var scoreHtml=function(id){
  return '<div id="qsc-g-'+id+'" data-sel="0" style="display:flex;gap:4px">'+
   [1,2,3,4,5].map(function(n){
    return '<button onclick="var g=document.getElementById(\'qsc-g-'+id+'\');g.dataset.sel=\''+n+'\';g.querySelectorAll(\'button\').forEach(function(b){b.style.background=\'var(--b3)\';b.style.color=\'var(--t1)\'});this.style.background=\'#c9a84c\';this.style.color=\'#0f172a\'" '+
     'style="width:32px;height:32px;border:1px solid var(--bd);border-radius:6px;background:var(--b3);color:var(--t1);font-size:12px;font-weight:700;cursor:pointer">'+n+'</button>';
   }).join('')+'</div>';
 };
 var itemsHtml=_qscItems.map(function(it){
  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bd)">'+
   '<div style="display:flex;align-items:center;gap:8px">'+
   '<span style="width:20px;height:20px;border-radius:4px;background:'+catC[it.cat]+';color:#fff;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center">'+it.cat+'</span>'+
   '<span style="font-size:13px">'+esc(it.label)+'</span></div>'+
   scoreHtml(it.id)+'</div>';
 }).join('');
 el.innerHTML=
  '<div class="slide-up" style="max-width:680px;margin:0 auto;padding-bottom:32px">'+
  '<div style="margin-bottom:20px">'+
  '<div style="font-size:12px;color:var(--t3);letter-spacing:.5px;margin-bottom:4px">본사 HQ</div>'+
  '<div style="font-size:22px;font-weight:900">QSC 체크리스트</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-top:6px">Q(품질) · S(서비스) · C(청결) — 5점 만점</div>'+
  '</div>'+
  '<div class="card" style="margin-bottom:16px">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:8px">점검 가맹점</div>'+
  '<select id="qsc-branch" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:13px">'+
  '<option value="">-- 가맹점 선택 --</option></select>'+
  '</div>'+
  '<div class="card" style="margin-bottom:16px">'+
  itemsHtml+
  '<div style="margin-top:12px">'+
  '<div style="font-size:12px;font-weight:700;margin-bottom:6px">특이사항 메모</div>'+
  '<textarea id="qsc-memo" rows="3" placeholder="현장 메모..." style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-size:12px;resize:vertical;box-sizing:border-box"></textarea>'+
  '</div></div>'+
  '<button onclick="_filoQscSubmit()" style="width:100%;padding:14px;background:#c9a84c;border:none;border-radius:10px;color:#0f172a;font-size:14px;font-weight:900;cursor:pointer">점검 결과 제출</button>'+
  '<div id="qsc-history" style="margin-top:24px"></div>'+
  '</div>';
 _db.collection('companies').where('hqDealerId','==',did).get()
  .then(function(snap){
   var sel=document.getElementById('qsc-branch');if(!sel)return;
   snap.forEach(function(d){var b=d.data();var opt=document.createElement('option');opt.value=d.id;opt.textContent=b.name||d.id;sel.appendChild(opt);});
  }).catch(function(){});
 _db.collection('hq_qsc').where('hqDealerId','==',did).orderBy('createdAt','desc').limit(5).get()
  .then(function(snap){
   var hEl=document.getElementById('qsc-history');if(!hEl||!snap.size)return;
   var html='<div class="card"><div style="font-size:13px;font-weight:800;margin-bottom:12px">최근 점검 이력</div>';
   snap.forEach(function(d){
    var q=d.data();var sc=q.scores||{};
    var tot=Object.values(sc).reduce(function(a,b){return a+(b||0);},0);
    var max=Object.keys(sc).length*5||9*5;
    var pct=Math.round(tot/max*100);
    var dt=q.createdAt?(new Date(q.createdAt)).toLocaleDateString('ko-KR'):'';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--b3);border-radius:8px;margin-bottom:8px">'+
     '<div><div style="font-size:13px;font-weight:700">'+(q.branchName||q.branchId||'?')+'</div>'+
     '<div style="font-size:11px;color:var(--t3)">'+dt+'</div></div>'+
     '<div style="font-size:20px;font-weight:900;color:'+(pct>=80?'#22c55e':pct>=60?'#f59e0b':'#ef4444')+'">'+pct+'<span style="font-size:11px;font-weight:400">%</span></div></div>';
   });
   hEl.innerHTML=html+'</div>';
  }).catch(function(){});
 window._filoQscSubmit=function(){
  var bId=(document.getElementById('qsc-branch')&&document.getElementById('qsc-branch').value)||'';
  if(!bId){_filoToast('가맹점을 선택하세요.');return;}
  var scores={};
  _qscItems.forEach(function(it){
   var g=document.getElementById('qsc-g-'+it.id);
   scores[it.id]=g?parseInt(g.dataset.sel||'0',10):0;
  });
  var total=Object.values(scores).reduce(function(a,b){return a+b;},0);
  if(total===0){_filoToast('최소 한 항목 이상 점수를 입력하세요.');return;}
  var memo=(document.getElementById('qsc-memo')&&document.getElementById('qsc-memo').value.trim())||'';
  var selEl=document.getElementById('qsc-branch');
  var branchName=selEl&&selEl.selectedIndex>=0?selEl.options[selEl.selectedIndex].textContent:'';
  _db.collection('hq_qsc').add({hqDealerId:did,branchId:bId,branchName:branchName,scores:scores,memo:memo,inspector:(_CU&&_CU.email)||'',createdAt:new Date().toISOString()})
   .then(function(){_filoToast('점검 결과 제출 완료!');_filoGoPage('hq_qsc');})
   .catch(function(e){_filoToast('제출 실패: '+e.message);});
 };
}
