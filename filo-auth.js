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

// ── 로그인 로고 (base64 인라인) ─────────────────────────────────────────────
(function(){var el=document.getElementById('filo-login-logo');if(el)el.src='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAF8ARgDASIAAhEBAxEB/8QAHQABAAEEAwEAAAAAAAAAAAAAAAgBAgYHAwQJBf/EAFQQAAEDAwIEAwUEBgUHBwwDAAECAwQABREGBwgSITETQVEUImFxgQkVMpEjQlJicqFDgpKxwRYkM1NjstIYJURzg6LCFyY0NUZUZISFk7PUw9Hh/8QAGwEBAAIDAQEAAAAAAAAAAAAAAAIEAwUGAQf/xAA7EQABAwIEAwYEBQIFBQAAAAABAAIDBBEFEiExQVFxE2GBkbHwIqHB0QYUMuHxI1IVQ2KCkkJTorLS/9oADAMBAAIRAxEAPwDyqpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpTFMURKUpjrREpVcUxRFSlV5elMdaL2ypSqgVXFEsraVdimKJZW460wauAp3ollTlpg1dg1XlovbKzGKY61ypbJ7V3I1pflkeE2pZzjCRmmpWVkLn6NC+bildudb37dKdjyWXI77SihbTqClSCO4IPUGuqR1osTmlpsVSlKUUUpSlESlKURKUpREpSlESlKrjNEVMVXHSqgVUDNFIC6tCetXYrmQwpXYV2EW10jPIrHrimqzthe7YLo8tMVlVk221PqdQFm09dLso9vYYTj2f7KTWSr4cNwoxSJ2nl2cqGQm6yWYiiPXlcWFfyr3K5ZhSTO0a0nwWr8VXlNbjs3DDqS7qAN2ssU5wQp197H1aaUP51k44NrsykGRqiB17+BAlr/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';}());


// ── 로즈/크림 테마 강제 적용 (_filoApplyTheme 덮어쓰기용) ──────────────────
function _filoOverrideTheme(){
 var r=document.documentElement;
 var S=function(k,v){r.style.setProperty(k,v);};
 S('--bg','#F5F1EB');S('--bg2','#EDE9E2');S('--bg3','#FFFFFF');
 S('--surface','#FFFFFF');S('--surface2','#F4F0E8');S('--surface3','#EAE6DD');S('--surface4','#E0DBD1');
 S('--b2','#FFFFFF');S('--b3','#F4F0E8');S('--b4','#EAE6DD');
 S('--tx','#0F172A');S('--t2','#475569');S('--t3','#94A3B8');S('--t4','#CBD5E1');
 S('--br','#f43f5e');S('--br-l','#f87171');S('--br-ll','#fca5a5');S('--br-d','#e11d48');
 S('--br-glow','rgba(244,63,94,.45)');S('--br-glow2','rgba(244,63,94,.2)');
 S('--primary','#f43f5e');S('--accent','#f87171');
 S('--card','#FFFFFF');S('--bd','rgba(0,0,0,.07)');S('--bd2','rgba(0,0,0,.10)');S('--bd3','rgba(0,0,0,.16)');
}

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
 try{ _filoOverrideTheme(); }catch(e){}
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
    '<div style="width:38px;height:38px;border-radius:11px;background:rgba(244,63,94,.12);border:1px solid rgba(244,63,94,.3);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#e11d48;flex-shrink:0">'+esc(company.slice(0,1))+'</div>'+
    '<div style="min-width:0;flex:1">'+
     '<div style="font-size:13px;font-weight:800;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.2px">'+esc(company)+'</div>'+
     '<span style="display:inline-flex;align-items:center;margin-top:4px;padding:1px 7px;border-radius:99px;background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.25);font-size:9px;font-weight:800;color:#e11d48;letter-spacing:.6px">'+role+'</span>'+
    '</div>'+
    '<div style="font-size:11px;font-weight:700;color:var(--t3);letter-spacing:.5px;font-variant-numeric:tabular-nums;flex-shrink:0">'+hh+':'+mi2+'</div>'+
   '</div>'+
   '<div style="margin-top:14px;height:1px;background:linear-gradient(90deg,rgba(244,63,94,.2),rgba(244,63,94,.08),transparent)"></div>'+
  '</div>';
 }
 _buildFiloNav();
 // PWA 뒤로가기 앱 종료 방지 — _base 센티넬을 바닥에 두고 home부터 시작
 history.replaceState({page:'_base'}, '');
 history.pushState({page:'home'}, '');
 window.addEventListener('popstate', function(e){
  var p=(e.state&&e.state.page)||'home';
  if(p==='_base'){history.pushState({page:'home'},'');return;}
  _filoGoPage(p, true);
 });
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
  try{_filoOverrideTheme();}catch(e){}
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
   _saBar.style.cssText='display:flex;align-items:center;gap:5px;border:1px solid rgba(244,63,94,.3);border-radius:8px;padding:3px 8px;background:rgba(244,63,94,.07)';
   _saBar.innerHTML=
    '<span style="color:#f43f5e;font-size:10px;font-weight:800;flex-shrink:0;letter-spacing:.5px">SA</span>'+
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
     'style="width:90px;background:transparent;border:none;border-bottom:1px solid rgba(244,63,94,.35);color:#0f172a;font-size:11px;padding:1px 4px;outline:none">'+
    '<button onclick="_switchDemoDealer(document.getElementById(\'sa-did-input\').value.trim())" '+
     'style="background:rgba(244,63,94,.15);border:none;border-radius:4px;color:#f43f5e;font-size:10px;font-weight:700;padding:2px 7px;cursor:pointer;flex-shrink:0">이동</button>'+
    '<button onclick="_filoDemoInit()" '+
     'style="background:transparent;border:1px solid rgba(244,63,94,.25);border-radius:4px;color:#f43f5e;font-size:10px;padding:2px 7px;cursor:pointer;flex-shrink:0">초기화</button>';
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
  {ic:'link',l:'전용 링크 관리',p:'slug_link'},
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

function _filoGoPage(p, _fromPopstate){
 if(!_fromPopstate){
  history.pushState({page:p}, '');
 }
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
 else if(p==='slug_link') _filoPageSlugLink(el);
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
 var _qaHtml='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">'+
  _qa.map(function(q){
   return '<button onclick="_filoGoPage(\''+q.p+'\')" title="'+esc(q.hint)+'" '+
    'style="padding:16px 8px 14px;background:var(--surface,#fff);border:1.5px solid var(--bd);border-radius:14px;cursor:pointer;text-align:center;transition:all .18s;active:scale(.97)" '+
    'onmouseover="this.style.borderColor=\'rgba(244,63,94,.5)\';this.style.boxShadow=\'0 4px 16px rgba(244,63,94,.1)\';this.style.transform=\'translateY(-1px)\'" '+
    'onmouseout="this.style.borderColor=\'var(--bd)\';this.style.boxShadow=\'\';this.style.transform=\'\'">'+
    '<div style="width:36px;height:36px;border-radius:10px;background:rgba(244,63,94,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;color:var(--br,#f43f5e)">'+_svgIcon(q.ic)+'</div>'+
    '<div style="font-size:12px;font-weight:800;color:var(--tx);letter-spacing:-.1px;line-height:1.3">'+esc(q.l)+'</div>'+
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

  /* 벤토 그리드: 히어로(2/3) + 사이드 타일(1/3) */
  '<div style="display:grid;grid-template-columns:1fr 82px;gap:10px;margin-bottom:10px;align-items:start">'+
  '<div class="hero-card" style="margin-bottom:0">'+
  '<div style="position:relative;z-index:1">'+
  '<div style="font-size:9px;font-weight:800;color:rgba(255,255,255,.55);letter-spacing:1.8px;text-transform:uppercase;margin-bottom:8px">오늘 매출</div>'+
  '<div id="hm-sales" style="font-size:32px;font-weight:900;letter-spacing:-1.5px;font-variant-numeric:tabular-nums;color:#fff;line-height:1;margin-bottom:14px">₩ —</div>'+
  '<div style="display:flex;gap:0;border-top:1px solid rgba(255,255,255,.08);padding-top:12px">'+
  '<div style="flex:1;padding-right:10px;border-right:1px solid rgba(255,255,255,.07)"><div style="font-size:8px;color:rgba(255,255,255,.35);letter-spacing:.5px;margin-bottom:3px">주문</div>'+
  '<div id="hm-cnt" style="font-size:18px;font-weight:900;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.9)">—</div></div>'+
  '<div style="flex:1;padding:0 10px;border-right:1px solid rgba(255,255,255,.07)"><div style="font-size:8px;color:rgba(255,255,255,.35);letter-spacing:.5px;margin-bottom:3px">평균</div>'+
  '<div id="hm-avg" style="font-size:18px;font-weight:900;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.9)">—</div></div>'+
  '<div style="flex:1;padding-left:10px"><div style="font-size:8px;color:rgba(255,255,255,.35);letter-spacing:.5px;margin-bottom:3px">미처리</div>'+
  '<div id="hm-pending" style="font-size:18px;font-weight:900;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.3)">—</div></div>'+
  '</div></div></div>'+
  /* 사이드: 직원 + 웨이팅 타일 */
  '<div style="display:flex;flex-direction:column;gap:10px">'+
  _hmTileHtml('hm-t-staff','직원','명')+
  _hmTileHtml('hm-t-wait','대기','팀')+
  '</div>'+
  '</div>'+

  /* 재고 배너 (full-width) */
  '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;background:var(--surface,#fff);border:1px solid var(--bd);border-radius:12px;margin-bottom:12px;transition:border-color .3s" id="hm-inv-banner">'+
  '<div style="display:flex;align-items:center;gap:8px;color:var(--t3)">'+
  _svgIcon('package','13')+
  '<span style="font-size:12px;font-weight:700">재고 부족 <span id="hm-t-inv" style="font-weight:900;color:var(--t3)">0</span>개</span>'+
  '</div>'+
  '<button onclick="_filoGoPage(\'inventory\')" style="font-size:11px;color:var(--br,#c9a84c);background:none;border:none;cursor:pointer;font-weight:800;padding:4px 8px">확인 ›</button>'+
  '</div>'+

  /* 업종별 퀵액션 */
  _qaHtml+

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
    var sc=b.status==='confirmed'?'#22c55e':b.status==='cancelled'?'#ef4444':'#f43f5e';
    var sl=b.status==='confirmed'?'확정':b.status==='cancelled'?'취소':'대기';
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd)">'+
     '<div style="font-size:13px;font-weight:900;color:#f43f5e;min-width:44px;font-variant-numeric:tabular-nums">'+(b.time||'—')+'</div>'+
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
 return '<div class="card" style="text-align:center;padding:16px 8px;border-top:2px solid rgba(244,63,94,.15);position:relative;overflow:hidden">'+
  '<div style="font-size:9px;font-weight:800;color:var(--t3);margin-bottom:8px;letter-spacing:.8px;text-transform:uppercase">'+label+'</div>'+
  '<div id="'+id+'" style="font-size:28px;font-weight:900;font-variant-numeric:tabular-nums;color:var(--t3);letter-spacing:-1px;line-height:1">—</div>'+
  '<div style="font-size:9px;color:var(--t3);margin-top:5px;font-weight:600">'+unit+'</div>'+
  '</div>';
}

function _hmTileSet(el,val,flag){
 if(!el)return;
 el.textContent=val;
 var isWarn=flag==='warn'&&val>0;
 el.style.color=isWarn?'#ef4444':val===0?'var(--t3)':'var(--tx)';
 // inv 배너 테두리 색도 경고 시 변경
 if(el.id==='hm-t-inv'){
  var banner=document.getElementById('hm-inv-banner');
  if(banner)banner.style.borderColor=isWarn?'rgba(239,68,68,.4)':'var(--bd)';
 }
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
  var sc=o.status==='completed'?'#22c55e':o.status==='cancelled'?'#ef4444':'#f43f5e';
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
 var idEl=document.getElementById('fl-id')||document.querySelector('#form-login input[type=text],#form-login input[type=email]');
 var pwEl=document.getElementById('fl-pw')||document.querySelector('#form-login input[type=password]');
 var errEl=document.getElementById('fl-err');
 if(!idEl||!pwEl){if(errEl){errEl.textContent='페이지를 새로고침(F5) 후 다시 시도해주세요';errEl.style.display='block';}return;}
 var id=(idEl.value||'').trim();
 var pw=(pwEl.value||'').trim();
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
 var termsEl=document.getElementById('fr-terms');
 if(!termsEl||!termsEl.checked){errEl.textContent='이용약관 및 개인정보처리방침에 동의해 주세요';errEl.style.display='block';return;}
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
 try{_filoOverrideTheme();}catch(e){}
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
  try{_filoOverrideTheme();}catch(e){}
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
 var now=(typeof _nowISO==='function')?_nowISO():new Date().toISOString();
 Promise.all(DEMOS.map(function(d){
  return _db.collection('companies').doc(d.id).set({
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
   if(!items.length) return 0;
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
   return b2.commit().then(function(){
    if(typeof _filoFillTemplateImages==='function') _filoFillTemplateImages(refs);
    return items.length;
   });
  }).catch(function(e){console.error(d.id,e);return 0;});
 })).then(function(counts){
  var total=counts.reduce(function(s,n){return s+(n||0);},0);
  _filoToast('데모 초기화 완료 — 총 '+total+'개 메뉴');
 });
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
    if(bEl)bEl.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:30px">등록된 가맹점이 없습니다.<br><button onclick="_filoGoPage(\'branch_mgmt\')" style="margin-top:10px;padding:7px 16px;background:#f43f5e;border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:800;cursor:pointer">가맹점 추가하기</button></div>';
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
     var barColor=i===0?'#f43f5e':i===1?'#94a3b8':i===2?'#f97316':'var(--t3)';
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
  '<input type="checkbox" id="hq-deploy-add" checked style="accent-color:#f43f5e">'+
  '<span style="font-size:13px">신규 메뉴 추가</span></label>'+
  '<label style="display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer">'+
  '<input type="checkbox" id="hq-deploy-price" checked style="accent-color:#f43f5e">'+
  '<span style="font-size:13px">가격 동기화</span></label>'+
  '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">'+
  '<input type="checkbox" id="hq-deploy-del" style="accent-color:#f43f5e">'+
  '<span style="font-size:13px">삭제된 메뉴 가맹점에서도 제거 <span style="font-size:11px;color:#ef4444">(주의)</span></span></label>'+
  '</div>'+
  '<div class="card" style="margin-bottom:16px">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:12px">대상 가맹점</div>'+
  '<div id="hq-dep-branches"><div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">불러오는 중...</div></div>'+
  '</div>'+
  '<button onclick="_filoHqDeploy()" style="width:100%;padding:14px;background:#f43f5e;border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:900;cursor:pointer">'+
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
     '<input type="checkbox" class="hq-dep-chk" value="'+esc(d.id)+'" checked style="accent-color:#f43f5e">'+
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
  '<button onclick="_filoHqAddBranch()" style="padding:10px 16px;background:#f43f5e;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:800;cursor:pointer">추가</button>'+
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
  '<button onclick="_filoHqSendNotice()" style="flex:1;padding:10px 16px;background:#f43f5e;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:800;cursor:pointer">전체 발송</button>'+
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
    var typeC=n.type==='urgent'?'#ef4444':n.type==='event'?'#f97316':'var(--t3)';
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
    return '<button onclick="var g=document.getElementById(\'qsc-g-'+id+'\');g.dataset.sel=\''+n+'\';g.querySelectorAll(\'button\').forEach(function(b){b.style.background=\'var(--b3)\';b.style.color=\'var(--t1)\'});this.style.background=\'#f43f5e\';this.style.color=\'#fff\'" '+
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
  '<button onclick="_filoQscSubmit()" style="width:100%;padding:14px;background:#f43f5e;border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:900;cursor:pointer">점검 결과 제출</button>'+
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
