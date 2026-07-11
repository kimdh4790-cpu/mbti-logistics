// filo-common.js - 공통 초기화, Firebase, 네비게이션, 유틸
// 의존성: Firebase SDK
// 전역변수: _CU, _db, _storage, _cachedCompanyDoc
// ⚠️ 리팩토링 완료 (2026-07-12): 2749줄→1038줄
//   직원/급여 → filo-staff.js
//   테이블/예약 → filo-table.js
//   마진분석 → filo-report.js
//   레시피/유통기한 → filo-menu.js
/* ══════════════════════════════════════════
   🍽 레시피 관리 페이지
   재료 + 사용량 + 단위 등록
   입고단가 자동 환산으로 원가 계산
   ══════════════════════════════════════════ */


/* 호환용 - 기존 _filoRmAddRow 호출 대응 */


function _filoStartDynamicQR(did){
 if(_dynamicQRTimer)clearInterval(_dynamicQRTimer);
 _filoGenDynamicQR(did);
 var countdown=30;
 _dynamicQRTimer=setInterval(function(){
  countdown--;
  var ct=document.getElementById('qr-checkin-timer');
  var ot=document.getElementById('qr-checkout-timer');
  if(ct)ct.textContent=countdown+'초 후 자동 갱신';
  if(ot)ot.textContent=countdown+'초 후 자동 갱신';
  if(countdown<=0){
   countdown=30;
   _filoGenDynamicQR(did);
  }
 },1000);
}

function _filoGenDynamicQR(did){
 var ts=Math.floor(Date.now()/30000); /* 30초 단위 타임스탬프 */
 var token=did+'_'+ts;
 var inUrl='https://filo.ai.kr/qr?did='+did+'&action=in&t='+ts;
 var outUrl='https://filo.ai.kr/qr?did='+did+'&action=out&t='+ts;
 var size='160x160';
 var inEl=document.getElementById('qr-checkin');
 var outEl=document.getElementById('qr-checkout');
 if(inEl)inEl.innerHTML='<img src="https://api.qrserver.com/v1/create-qr-code/?size='+size+'&data='+encodeURIComponent(inUrl)+'" style="width:160px;height:160px;border-radius:6px">';
 if(outEl)outEl.innerHTML='<img src="https://api.qrserver.com/v1/create-qr-code/?size='+size+'&data='+encodeURIComponent(outUrl)+'" style="width:160px;height:160px;border-radius:6px">';
}

function _filoPageMemberQR(el){
 var did=_CU.dealerId||_CU.uid;
 var joinUrl='https://filo.ai.kr/member-join?did='+did;
 var stampUrl='https://filo.ai.kr/stamp?did='+did;

 el.innerHTML='<div class="slide-up" style="max-width:700px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:4px">🎁 회원 QR</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:16px">회원 가입 · 스탬프 적립 · 할인 쿠폰</div>'+

 '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px">'+
 /* 회원 가입 QR */
 '<div class="card" style="text-align:center;overflow:hidden;min-width:0">'+
 '<div style="font-size:13px;font-weight:800;color:#a78bfa;margin-bottom:10px">👋 회원 가입 QR</div>'+
 '<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data='+encodeURIComponent(joinUrl)+'" style="width:100%;max-width:160px;height:auto;border-radius:10px;background:#fff;padding:6px">'+
 '<div style="font-size:10px;color:var(--t3);margin-top:8px">스캔 → 이름/전화번호 입력 → 회원 등록</div>'+
 '<button onclick="window.open(\''+joinUrl+'\',\'_blank\')" style="margin-top:8px;width:100%;padding:7px;background:var(--b3);border:none;border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer">🔗 링크 복사</button>'+
 '</div>'+
 /* 스탬프 적립 QR */
 '<div class="card" style="text-align:center">'+
 '<div style="font-size:13px;font-weight:800;color:#f59e0b;margin-bottom:10px">⭐ 스탬프 적립 QR</div>'+
 '<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data='+encodeURIComponent(stampUrl)+'" style="width:100%;max-width:160px;height:auto;border-radius:10px;background:#fff;padding:6px">'+
 '<div style="font-size:10px;color:var(--t3);margin-top:8px">결제 후 스캔 → 스탬프 자동 적립</div>'+
 '<button onclick="window.open(\''+stampUrl+'\',\'_blank\')" style="margin-top:8px;width:100%;padding:7px;background:var(--b3);border:none;border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer">🔗 링크 복사</button>'+
 '</div>'+
 '</div>'+

 /* 회원 목록 요약 */
 '<div class="card">'+
 '<div style="font-size:12px;font-weight:800;color:var(--t3);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">회원 현황</div>'+
 '<div id="member-qr-stats"><div style="text-align:center;padding:16px;color:var(--t3)">⏳</div></div>'+
 '</div></div>';

 /* 회원 통계 */
 _db.collection('filo_customers').where('dealerId','==',did).get().then(function(snap){
  var total=snap.size;
  var stats=document.getElementById('member-qr-stats');
  if(!stats)return;
  stats.innerHTML='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">'+
  [{label:'전체 회원',val:total+'명',c:'#a78bfa'},
   {label:'오늘 가입',val:'0명',c:'#22c55e'},
   {label:'스탬프 발급',val:'0개',c:'#f59e0b'}
  ].map(function(s){
   return '<div style="background:var(--b3);border-radius:10px;padding:12px 8px">'+
   '<div style="font-size:18px;font-weight:900;color:'+s.c+'">'+s.val+'</div>'+
   '<div style="font-size:10px;color:var(--t3);margin-top:3px">'+s.label+'</div></div>';
  }).join('')+'</div>';
 });
}

var _fbApp=null,_db=null,_auth=null,_CU=null,_cachedCompanyDoc=null;

/* ── FILO 매장명 자동 주입 (filo.ai.kr/매장명 접속 시) ── */
(function(){
 if(window.__FILO_STORE__){
  var s=window.__FILO_STORE__;
  var slug=window.__FILO_SLUG__||s;
  // 로고 아래 매장명 표시
  var sub=document.querySelector('#login-screen .login-card > div > div:nth-child(3)');
  if(sub)sub.textContent=s;
  setTimeout(function(){
   // 회사 등록 폼 - 회사명 자동 입력
   var fc=document.getElementById('fr-company');
   if(fc){fc.value=s;fc.readOnly=true;}
   // 직원 가입 폼 - 회사 코드 자동 입력
   var fj=document.getElementById('fj-code');
   if(fj){fj.value=slug;fj.readOnly=true;}
   // 안내 문구 변경
   var tip=document.querySelector('#form-join .fg label');
  },200);
 }
})();
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
 appId:'1:862900137263:web:a1b2c3d4e5f6a7b8'
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

function _loadCompany(uid){
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
 document.getElementById('login-screen').style.display='none';
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
 document.getElementById('nav-company').textContent=company;
 document.getElementById('nav-role').textContent=role;
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
   if(topClock)topClock.textContent=hh+':'+mm;
  },1000);
 }
 var prof=document.getElementById('sidebar-profile');
 if(prof){
  var now2=new Date();
  var hh=now2.getHours().toString().padStart(2,'0');
  var mi2=now2.getMinutes().toString().padStart(2,'0');
  prof.innerHTML='<div style="padding:14px 16px 12px">'+
  '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'+
  '<div class="sidebar-avatar" style="background:linear-gradient(135deg,var(--br),var(--br2))">'+esc(company.slice(0,1))+'</div>'+
  '<div style="min-width:0;flex:1">'+
  '<div style="font-size:13px;font-weight:800;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(company)+'</div>'+
  '<div style="font-size:10px;color:var(--t3);margin-top:1px">'+role+'</div>'+
  '</div>'+
  '<div style="font-size:11px;color:var(--t3);font-weight:700;letter-spacing:.5px">'+hh+':'+mi2+'</div>'+
  '</div>'+
  '<div style="height:1px;background:var(--bd)"></div>'+
  '</div>';
 }
 _buildFiloNav();
 _filoGoPage('home');
}

function _buildFiloNav(){
 var d=_cachedCompanyDoc||{};
 var subs=d.subscriptions||{};
 var today=new Date().toISOString().slice(0,10);
 function hasSub(k){
  /* combo = 전체 포함 */
  if(k!=='combo'){var cs=subs['combo']||{};if(cs.active&&(!cs.expiry||cs.expiry>=today))return true;}
  var s=subs[k]||{};return !!(s.active&&(!s.expiry||s.expiry>=today));
 }
 var isAdmin=(_CU.role!=='member');
 var isSA=SUPER_ADMIN_EMAILS.indexOf(_CU.email||'')>=0;

 var menus=[];
 var hasAll=isSA||hasSub('combo');

 menus.push({s:'🏠 홈',items:[
  {ic:'🏠',l:'대시보드',p:'home'},
 ]});
 if(hasAll||hasSub('kiosk')){
  menus.push({s:'🛒 판매',items:[
   {ic:'🖥️',l:'POS 결제',p:'kiosk'},
   {ic:'🍽',l:'메뉴 관리',p:'menu_mgmt'},
   {ic:'🔔',l:'주문 대기',p:'orders'},
   {ic:'🛵',l:'배달 주문',p:'delivery'},
  ]});
 }
 if(hasAll||hasSub('inventory')){
  menus.push({s:'📦 재고',items:[
   {ic:'📊',l:'재고 현황',p:'inventory'},
   {ic:'🍽',l:'레시피·원가',p:'recipe'},
   {ic:'🔔',l:'자동 발주',p:'auto_order'},
  ]});
 }
 if(hasAll||hasSub('qr')){
  menus.push({s:'👥 인사',items:[
   {ic:'🔐',l:'QR 출퇴근',p:'attendance'},
   {ic:'👤',l:'직원 QR',p:'qr_staff'},
  ]});
 }
 if(hasAll||hasSub('kiosk')){
  menus.push({s:'🎁 고객',items:[
   {ic:'📋',l:'테이블 QR',p:'table_qr'},
  ]});
 }
 menus.push({s:'⚙️ 설정',items:[
  {ic:'🗓',l:'예약·달력',p:'schedule'},
  {ic:'🧾',l:'세무사 연동',p:'tax_share'},
  {ic:'⚙️',l:'설정',p:'settings'},
  {ic:'💳',l:'구독 관리',p:'subscription'},
 ]});

 var html='';

 var _closedG=JSON.parse(localStorage.getItem('filo_nav_closed')||'[]');

 menus.forEach(function(g,gi){

  var isClosed=_closedG.indexOf(gi)>=0;

  var labelCls='ns-label ns-toggle'+(isClosed?' collapsed':'');

  var arrowTxt=isClosed?'▸':'▾';

  var groupStyle=isClosed?' style="max-height:0;overflow:hidden"':'';

  html+='<div class="'+labelCls+'" onclick="_toggleNavGroup('+gi+',this)" data-gi="'+gi+'">'+

   '<span>'+g.s+'</span><span class="ns-arrow">'+arrowTxt+'</span></div>';

  html+='<div class="ns-group" id="nav-g-'+gi+'"'+groupStyle+'>';

  g.items.forEach(function(m){

   html+='<div class="ni" id="nav-'+m.p+'" onclick="_filoGoPage(\''+m.p+'\')">'

   +'<span style="font-size:15px">'+m.ic+'</span>'

   +'<span>'+m.l+'</span></div>';

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

 var arrow=el.querySelector('.ns-arrow');

 if(arrow)arrow.textContent=closing?'▸':'▾';

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

 var saved=JSON.parse(localStorage.getItem('filo_nav_closed')||'[]');

 if(closing&&saved.indexOf(gi)<0)saved.push(gi);

 else saved=saved.filter(function(x){return x!==gi;});

 localStorage.setItem('filo_nav_closed',JSON.stringify(saved));

}

function _toggleSidebar(){
 var sb=document.getElementById('sidebar');
 var btn=document.getElementById('sidebar-toggle');
 var ov=document.getElementById('sidebar-overlay');
 var isMobile=window.innerWidth<=768;
 if(isMobile){
  /* 모바일: 열기/닫기 */
  var isOpen=sb.classList.toggle('open');
  if(btn)btn.textContent=isOpen?'✕':'☰';
  if(ov)ov.style.display=isOpen?'block':'none';
 } else {
  /* 데스크탑: 축소/확장 */
  var isCollapsed=sb.classList.toggle('collapsed');
  var wrap=document.getElementById('content-wrap');
  var content2=document.getElementById('content');
  if(isCollapsed){
   if(wrap){wrap.style.marginLeft='52px';wrap.style.width='calc(100% - 52px)';}
   if(content2){content2.style.marginLeft='52px';}
   if(btn)btn.textContent='☰';
  } else {
   if(wrap){wrap.style.marginLeft='var(--sidebar-w)';wrap.style.width='calc(100% - var(--sidebar-w))';}
   if(content2){content2.style.marginLeft='var(--sidebar-w)';}
   if(btn)btn.textContent='☰';
  }
  localStorage.setItem('filo_sidebar_collapsed', isCollapsed?'1':'0');
 }
}

function _filoGoPage(p){
 var sb=document.getElementById('sidebar');
 if(sb&&sb.classList.contains('open')&&window.innerWidth<=768){
  sb.classList.remove('open');
  var btn=document.getElementById('sidebar-toggle');
  if(btn)btn.textContent='☰';
  var ov=document.getElementById('sidebar-overlay');
  if(ov)ov.style.display='none';
 }
 document.querySelectorAll('.ni').forEach(function(el){el.classList.remove('on');});
 var nav=document.getElementById('nav-'+p);
 if(nav)nav.classList.add('on');
 document.getElementById('sidebar').classList.remove('open');

 var el=document.getElementById('content');
 var titles={home:'대시보드',members:'직원 관리',schedule:'달력',
 inventory:'재고 대시보드',stock_in:'입고 등록',stock_out:'출고 등록',
 auto_order:'자동 발주',sales_report:'매출·마진',recipe:'레시피 관리',qr_staff:'직원 QR (동적)',table_qr:'테이블 QR',table_mgmt:'테이블 관리',delivery:'배달 주문',schedule:'예약·달력',tax_share:'세무사 연동',member_qr:'회원 QR',cost_mgmt:'원가 관리',
 attendance:'QR 출퇴근',attend_dash:'출퇴근 현황',payroll:'급여 현황',roster:'근무표',
 kiosk:'POS 키오스크',orders:'주문 대기',table_qr:'테이블 QR',points:'포인트 관리',membership:'회원권',pos_report:'매출 집계',
 tax_share:'세무사 연동',notices:'공지사항',settings:'설정',subscription:'구독 관리'};
 document.getElementById('topbar-title').textContent=titles[p]||p;

 if(p==='home') _filoPageHome(el);
 else if(p==='kiosk') _filoPageKiosk(el);
 else if(p==='menu_mgmt') _filoPageMenuMgmt(el);
 else if(p==='orders') _filoPageOrders(el);
 else if(p==='delivery') _filoPageDelivery(el);
 else if(p==='sales_report') _filoPageSales(el);
 else if(p==='pos_report') _filoPagePosReport(el);
 else if(p==='inventory') _filoPageInventory(el);
 else if(p==='stock_in') _filoPageStockIn(el);
 else if(p==='stock_out') _filoPageStockOut(el);
 else if(p==='auto_order') _filoPageAutoOrder(el);
 else if(p==='recipe') _filoPageRecipe(el);
 else if(p==='expiry') _filoPageExpiry(el);
 else if(p==='members') _filoPageMembers(el);
 else if(p==='attendance') _filoPageAttendance(el);
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
 else if(p==='tax_share') _filoPageTaxShare(el);
 else if(p==='notices') _filoPageNotices(el);
 else if(p==='settings') _filoPageSettings(el);
 else if(p==='subscription') _filoPageSubscription(el);
 else if(p==='cost_mgmt') _filoPageCostMgmt(el);
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

 else el.innerHTML='<div class="card" style="text-align:center;padding:60px;color:var(--t3)"><div style="font-size:40px;margin-bottom:12px">🚧</div><div style="font-weight:700;margin-bottom:6px">'+(titles[p]||p)+'</div><div style="font-size:12px">준비 중입니다</div></div>';
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
 var today=new Date().toISOString().slice(0,10);
 var did=d.dealerId||d.uid||'';
 function hasSub(k){
  /* combo = 전체 포함 */
  if(k!=='combo'){var cs=subs['combo']||{};if(cs.active&&(!cs.expiry||cs.expiry>=today))return true;}
  var s=subs[k]||{};return !!(s.active&&(!s.expiry||s.expiry>=today));
 }

 el.innerHTML='<div style="max-width:900px;margin:0 auto">'+
 '<div class="fade-up hero-card" style="margin-bottom:16px">'+
 '<div style="position:relative;z-index:1"><div style="font-size:10px;font-weight:700;color:rgba(167,139,250,.7);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">FILO · 실시간 운영</div>'+
 '<div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-.8px">'+(d.companyName||d.name||'')+'</div>'+
 '<div style="display:flex;align-items:center;gap:10px;margin-top:8px">'+
 '<span style="font-size:11px;color:rgba(255,255,255,.4)">'+today+'</span>'+
 '<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:#22c55e"><span style="width:6px;height:6px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite"></span>실시간 연동</span>'+
 '</div></div></div>'+

 '<div class="kpi-grid" id="home-stats">'+
 [{t:'오늘 매출',c:'kpi-revenue',vc:'#a78bfa',ic:'💰',id:'hs-0'},
  {t:'미완료 주문',c:'kpi-cost',vc:'#ef4444',ic:'🔔',id:'hs-1'},
  {t:'재고 부족',c:'kpi-margin',vc:'#f59e0b',ic:'⚠️',id:'hs-2'},
  {t:'출근 인원',c:'kpi-profit',vc:'#22c55e',ic:'👥',id:'hs-3'}
 ].map(function(s){
 return '<div class="kpi-card '+s.c+' card-hover">'+ 
 '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
 '<div class="kpi-label">'+s.t+'</div>'+
 '<div style="font-size:18px;opacity:.8">'+s.ic+'</div>'+
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
 [{k:'inventory',l:'재고',ic:'📦',c:'#7c3aed'},{k:'qr',l:'QR급여',ic:'🔐',c:'#0891b2'},
  {k:'kiosk',l:'POS',ic:'🖥️',c:'#059669'},{k:'combo',l:'통합',ic:'🚀',c:'#f59e0b'}].map(function(p){
  var on=hasSub(p.k);
  return '<div style="padding:10px 8px;border-radius:10px;border:1px solid '+(on?p.c+'60':'var(--bd)')+';background:'+(on?p.c+'12':'var(--surface2)')+';text-align:center">'+
  '<div style="font-size:20px;margin-bottom:4px">'+p.ic+'</div>'+
  '<div style="font-size:10px;font-weight:700;color:'+(on?p.c:'var(--t3)')+'">'+p.l+'</div>'+
  '<div style="font-size:9px;margin-top:2px;color:'+(on?p.c:'var(--t4)')+'">'+(on?'✅ ON':'OFF')+'</div>'+
  '</div>';
 }).join('')+'</div></div>'+

 '<div class="card fade-up-3">'+
 '<div style="font-size:12px;font-weight:700;color:var(--t3);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">빠른 실행</div>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px">'+
 [{ic:'🖥️',l:'POS',p:'kiosk'},{ic:'🔔',l:'주문대기',p:'orders'},{ic:'🛵',l:'배달',p:'delivery'},
 {ic:'📊',l:'재고',p:'inventory'},{ic:'🍽',l:'레시피',p:'recipe'},{ic:'📈',l:'매출',p:'sales_report'},
 {ic:'🔐',l:'QR출퇴근',p:'attendance'},{ic:'💼',l:'급여',p:'payroll'},{ic:'🗓',l:'예약',p:'schedule'}].map(function(m){
 return '<button onclick="_filoGoPage(\''+m.p+'\')" style="padding:14px 6px;background:var(--surface2);border:1px solid var(--bd);border-radius:10px;color:var(--tx);cursor:pointer;text-align:center;transition:.2s;font-family:inherit" onmouseover="this.style.borderColor=\'rgba(124,58,237,.5)\';this.style.background=\'rgba(124,58,237,.08)\'" onmouseout="this.style.borderColor=\'var(--bd)\';this.style.background=\'var(--bg3)\'">'+
 '<div style="font-size:20px;margin-bottom:4px">'+m.ic+'</div>'+
 '<div style="font-size:11px;font-weight:600">'+m.l+'</div></button>';
 }).join('')+'</div></div></div>';

 if(did){
 var ym=today.slice(0,7);
 /* POS 실시간 onSnapshot → 홈 KPI 즉시 갱신 */
 _db.collection('filo_sales').where('dealerId','==',did).where('date','==',today)
 .onSnapshot(function(posSnap){
  Promise.all([
   firebase.firestore().collection('mbetco_sales').where('dealerId','==',did).where('date','==',today).get(),
   firebase.firestore().collection('mbetco_sales').where('dealerId','==',did).where('date','>=',ym+'-01').where('date','<=',ym+'-31').get(),
   firebase.firestore().collection('filo_sales').where('dealerId','==',did).where('date','>=',ym+'-01').where('date','<=',ym+'-31').get(),
   firebase.firestore().collection('inventory').where('dealerId','==',did).get(),
   firebase.firestore().collection('menu_costs').where('dealerId','==',did).get()
  ]).then(function(res){
   var costMap={};
   res[4].forEach(function(doc){var d=doc.data();costMap[d.name]=d;});
   var todayRev=0,monthRev=0,low=0,todayCost=0;
   /* 오늘 POS */
   posSnap.forEach(function(doc){
    var d=doc.data();todayRev+=(d.total||0);
    (d.items||[]).forEach(function(it){todayCost+=((costMap[it.name]||{}).cost||0)*(it.qty||1);});
   });
   /* 오늘 수동 매출 */
   res[0].forEach(function(doc){todayRev+=(doc.data().revenue||doc.data().totalAmount||0);});
   /* 월 수동 매출 */
   res[1].forEach(function(doc){monthRev+=(doc.data().revenue||doc.data().totalAmount||0);});
   /* 월 POS 매출 */
   res[2].forEach(function(doc){monthRev+=(doc.data().total||0);});
   /* 재고 부족 */
   res[3].forEach(function(doc){var d=doc.data();if(d.stock!=null&&d.minStock!=null&&d.stock<=d.minStock)low++;});
   var todayMargin=todayRev>0?Math.round((todayRev-todayCost)/todayRev*100):0;
   var e0=document.getElementById('hs-0'),e1=document.getElementById('hs-1'),e2=document.getElementById('hs-2'),e3=document.getElementById('hs-3');
  /* 미완료 주문 실시간 */
  _db.collection('filo_sales').where('dealerId','==',did).where('date','==',today).where('status','==','pending')
   .onSnapshot(function(snap){if(e1){e1.textContent=snap.size+'건';if(snap.size>0){e1.classList.add('bounce-in');setTimeout(function(){e1.classList.remove('bounce-in');},500);}}});
  /* 재고 부족 */
  _db.collection('inventory').where('dealerId','==',did).get().then(function(snap){
   var low=0;snap.forEach(function(doc){var d=doc.data();if((d.stock||0)<=(d.minStock||5))low++;});
   if(e2)e2.textContent=low+'개';
  });
  /* 출근 인원 (오늘) */
  _db.collection('attendance').where('dealerId','==',did).where('date','==',today).where('status','==','in')
   .get().then(function(snap){if(e3)e3.textContent=snap.size+'명';});
   if(e0)_countUp(e0,todayRev,400,'₩','');
   if(e1)_countUp(e1,monthRev,600,'₩','');
   if(e2){e2.textContent=low+'개';e2.style.color=low>0?'#ef4444':'#22c55e';}
   if(e3){e3.textContent=todayMargin+'%';e3.style.color=todayMargin>=60?'#22c55e':todayMargin>=40?'#f59e0b':'#ef4444';}
  }).catch(function(){});
 });
 }
}

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
 btn.textContent=el.type==='password'?'👁':'🙈';
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
 if(snap.empty){msg.textContent='✅ 사용 가능';msg.style.color='var(--gn)';}
 else{msg.textContent='❌ 이미 등록된 사업자번호';msg.style.color='var(--red)';}
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
 if(!company||!biznum||!name||!email||!pw){errEl.textContent='필수 항목을 모두 입력해 주세요';errEl.style.display='block';return;}
 if(pw.length<6){errEl.textContent='비밀번호는 6자 이상';errEl.style.display='block';return;}
 errEl.style.display='none';
 _auth.createUserWithEmailAndPassword(email,pw).then(function(cred){
 var uid=cred.user.uid;
 var subs={};
 var trial={active:true,plan:'trial',start:new Date().toISOString(),expiry:new Date(Date.now()+7*86400000).toISOString()};
 svc.split(',').forEach(function(s){subs[s]=trial;});
 return _db.collection('companies').doc(uid).set({
 uid:uid,companyName:company,name:name,email:email,phone:phone,
 bizNum:biznum,role:'dealer',dealerId:uid,
 platform:'filo',serviceType:svc,
 subscriptions:subs,
 createdAt:firebase.firestore.FieldValue.serverTimestamp()
 });
 }).then(function(){
 _filoToast('✅ 등록 완료! 1개월 무료 체험을 시작합니다');
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
 if(snap.empty){errEl.textContent='❌ 존재하지 않는 회사 코드';errEl.style.display='block';return;}
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
 _filoToast('✅ 가입 완료! 관리자 직원 목록에 자동 등록됩니다.');
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
 _filoToast('✅ 비밀번호 재설정 이메일을 발송했습니다');
 }).catch(function(e){_filoToast('❌ '+e.message);});
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

function _filoToast(msg){
 var el=document.getElementById('toast');
 el.textContent=msg;el.classList.add('show');
 setTimeout(function(){el.classList.remove('show');},2800);
}

var SUPER_ADMIN_EMAILS=['kimdh4790@gmail.com','soungkyekim@naver.com'];

window.addEventListener('DOMContentLoaded',function(){_initFirebase();});
function _filoCountUp(id,prefix,target,dur,fmt){
 var el=document.getElementById(id);if(!el)return;
 var start=0,step=dur/60,inc=target/60;
 var t=setInterval(function(){
  start+=inc;
  if(start>=target){start=target;clearInterval(t);}
  var v=Math.round(start);
  el.textContent=fmt?fmt(v):(prefix+''+v.toLocaleString());
 },step);
}


window._filoExpSave=function(did){
 var itemId=document.getElementById('exp-item').value;
 var date=document.getElementById('exp-date').value;
 if(!itemId||!date){_filoToast('품목과 유통기한을 선택해주세요');return;}
 firebase.firestore().collection('inventory').doc(itemId).update({expiryDate:date,updatedAt:new Date().toISOString()})
 .then(function(){_filoToast('✅ 저장됨');_filoPageExpiry(document.getElementById('content'));})
 .catch(function(e){_filoToast('❌ '+e.message);});
};




function _filoShowAddMember(){
 var did=_CU.dealerId||_CU.uid;
 var html='<div style="padding:20px;max-width:400px;margin:0 auto">'+
 '<div style="font-size:16px;font-weight:900;margin-bottom:16px">직원 추가</div>'+
 '<div class="fg"><label>이름</label><input id="nm-name" type="text" placeholder="이름" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>전화번호</label><input id="nm-phone" type="tel" placeholder="010-0000-0000" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>역할</label>'+
 '<select id="nm-role" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px">'+
 '<option value="staff">직원</option><option value="admin">관리자</option><option value="part">알바</option></select></div>'+
 '<div class="fg"><label>시급/일급 (원)</label><input id="nm-wage" type="number" placeholder="10030" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>부서 (선택)</label><input id="nm-dept" type="text" placeholder="부서명" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div style="display:flex;gap:8px;margin-top:4px">'+
 '<button onclick="this.closest(".mo").remove()" class="btn" style="flex:1;background:var(--b3)">취소</button>'+
 '<button onclick="_filoAddMember()" class="btn btn-brand" style="flex:1">추가</button></div></div>';
 _filoShowModal(html);
}




var _attendUnsub=null;



/* ── 고용유형 탭 필터 ── */
var _pwTabIdx=0;

/* ── 주휴수당 계산 ── */

/* ── 세금/공제 계산 ── */

/* ── 전체 급여 로드 ── */
var _payrollData=[];


/* ── 명세서 발송 ── */


var _cartItems=[];

// ── 분할 결제 (현금+카드) ──




function _filoShowModal(html){
 var mo=document.createElement('div');
 mo.className='mo';
 mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
 mo.innerHTML='<div style="background:var(--b2);border:1px solid var(--bd);border-radius:20px;max-width:440px;width:100%;max-height:90dvh;overflow-y:auto">'+html+'</div>';
 mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
 document.body.appendChild(mo);
}

function _filoPagePoints(el){
 el.innerHTML='<div class="slide-up card" style="text-align:center;padding:40px">'+
 '<div style="font-size:40px;margin-bottom:12px">⭐</div>'+
 '<div style="font-size:16px;font-weight:800;margin-bottom:6px">포인트 관리</div>'+
 '<div style="font-size:12px;color:var(--t3)">회원 포인트 관리 기능 곧 추가됩니다</div></div>';
}






function _filoPageSettings(el){
 var did=_CU.dealerId||_CU.uid;
 var d=_cachedCompanyDoc||{};
 el.innerHTML='<div class="slide-up" style="max-width:600px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">⚙️ 설정</div>'+
 '<div class="card">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:12px">회사 정보</div>'+
 '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">회사명</span>'+
 '<span style="font-size:13px;font-weight:700">'+(d.companyName||d.name||'')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">이메일</span>'+
 '<span style="font-size:13px;font-weight:700">'+(_CU.email||'')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:8px 0">'+
 '<span style="font-size:12px;color:var(--t3)">역할</span>'+
 '<span style="font-size:13px;font-weight:700">'+(_CU.role||'관리자')+'</span></div>'+
 '</div></div>';
}
function _filoPageSubscription(el){
 el.innerHTML='<div class="slide-up" style="max-width:600px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">🚀 구독 관리</div>'+
 '<div class="card">'+
 '<div style="text-align:center;padding:20px">'+
 '<div style="font-size:40px;margin-bottom:12px">💎</div>'+
 '<div style="font-size:16px;font-weight:800;margin-bottom:6px">FILO 플랜</div>'+
 '<div style="font-size:12px;color:var(--t3);margin-bottom:16px">재고관리 · QR출퇴근 · 키오스크POS 통합 솔루션</div>'+
 '<a href="https://filo.ai.kr" target="_blank" class="btn btn-brand" style="display:inline-block;text-decoration:none">요금제 보기</a>'+
 '</div></div></div>';
}
function _filoPageTaxShare(el){
 var did=_CU.dealerId||_CU.uid;
 var d=_cachedCompanyDoc||{};
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:700px;margin:0 auto';

 /* 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='margin-bottom:20px';
 hdr.innerHTML='<div class="page-title">🧾 세무사 연동</div>'+
  '<div class="page-sub">매출 데이터를 세무사에게 자동 공유합니다</div>';
 wrap.appendChild(hdr);

 /* 현황 카드 */
 var statusCard=document.createElement('div');
 statusCard.className='hero-card';
 statusCard.style.marginBottom='16px';
 statusCard.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1">'+
  '<div><div style="font-size:11px;color:rgba(167,139,250,.7);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">연동 현황</div>'+
  '<div style="font-size:20px;font-weight:900" id="tax-status-txt">설정 안됨</div>'+
  '<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px" id="tax-status-sub">세무사 이메일을 등록하면 매월 매출 리포트를 자동 발송합니다</div>'+
  '</div>'+
  '<div style="font-size:36px;opacity:.6">📊</div></div>';
 wrap.appendChild(statusCard);

 /* 세무사 이메일 등록 */
 var card1=document.createElement('div');
 card1.className='card';
 card1.innerHTML='<div class="sec-title" style="margin-bottom:12px">세무사 이메일 등록</div>'+
  '<div style="display:flex;gap:8px;margin-bottom:8px">'+
  '<input id="tax-email-inp" type="email" placeholder="세무사 이메일 주소" style="flex:1;padding:11px 14px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none">'+
  '<button onclick="_filoTaxSaveEmail()" style="padding:11px 16px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-size:13px;font-weight:700;cursor:pointer">저장</button>'+
  '</div>'+
  '<div style="font-size:11px;color:var(--t3)">💡 매월 1일 전월 매출 리포트가 자동 발송됩니다</div>';
 wrap.appendChild(card1);

 /* 매출 데이터 공유 설정 */
 var card2=document.createElement('div');
 card2.className='card';
 card2.innerHTML='<div class="sec-title" style="margin-bottom:12px">공유 항목 설정</div>'+
  [
   {id:'tax-share-sales',l:'일별 매출 합계',d:'매일 총 매출액'},
   {id:'tax-share-items',l:'메뉴별 판매량',d:'품목별 판매 내역'},
   {id:'tax-share-pay',l:'결제수단별 내역',d:'카드/현금/간편결제 구분'},
   {id:'tax-share-refund',l:'취소/환불 내역',d:'환불 처리 내역 포함'},
  ].map(function(item){
   return '<div class="stat-row"><div>'+
    '<div style="font-size:13px;font-weight:700">'+item.l+'</div>'+
    '<div style="font-size:11px;color:var(--t3)">'+item.d+'</div>'+
    '</div>'+
    '<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer">'+
    '<input type="checkbox" id="'+item.id+'" checked style="opacity:0;width:0;height:0">'+
    '<span style="position:absolute;inset:0;background:#7c3aed;border-radius:24px;transition:.3s" onclick="this.style.background=this.previousElementSibling.checked?\'#7c3aed\':\'var(--surface3)\'"></span>'+
    '<span style="position:absolute;top:2px;left:2px;width:20px;height:20px;background:#fff;border-radius:50%;transition:.3s"></span>'+
    '</label></div>';
  }).join('');
 wrap.appendChild(card2);

 /* 즉시 리포트 발송 */
 var card3=document.createElement('div');
 card3.className='card';
 card3.innerHTML='<div class="sec-title" style="margin-bottom:12px">즉시 리포트 발송</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
  ['이번달 리포트','지난달 리포트','분기 리포트','연간 리포트'].map(function(t,i){
   return '<button onclick="_filoTaxSendReport(\''+['thisMonth','lastMonth','quarter','year'][i]+'\')" style="padding:12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:12px;font-weight:700;cursor:pointer;transition:.2s" onmouseover="this.style.borderColor=\'rgba(124,58,237,.4)\'" onmouseout="this.style.borderColor=\'var(--bd2)\'">'+t+'</button>';
  }).join('')+'</div>';
 wrap.appendChild(card3);

 /* 세금계산서 안내 */
 var card4=document.createElement('div');
 card4.className='card-brand';
 card4.innerHTML='<div style="font-size:13px;font-weight:800;margin-bottom:8px">💡 세금계산서 발행 안내</div>'+
  '<div style="font-size:12px;color:var(--t2);line-height:1.7">'+
  '• POS 결제 내역이 자동으로 세무사에게 공유됩니다<br>'+
  '• 카드 매출은 카드사 자동 집계와 대조 가능합니다<br>'+
  '• DONWAY와 연동 시 부가세 신고 자료를 자동 생성합니다<br>'+
  '• 문의: <a href="tel:051-711-3103" style="color:#a78bfa">051-711-3103</a>'+
  '</div>';
 wrap.appendChild(card4);

 el.appendChild(wrap);

 /* 기존 설정 로드 */
 _db.collection('settings').doc(did+'_tax').get().then(function(snap){
  if(snap.exists){
   var data=snap.data();
   if(data.taxEmail){
    document.getElementById('tax-email-inp').value=data.taxEmail;
    document.getElementById('tax-status-txt').textContent='✅ 연동 중';
    document.getElementById('tax-status-sub').textContent=data.taxEmail+' · 매월 자동 발송';
   }
  }
 });
}

function _filoTaxSaveEmail(){
 var email=(document.getElementById('tax-email-inp').value||'').trim();
 if(!email||!email.includes('@')){_filoToast('올바른 이메일을 입력하세요');return;}
 var did=_CU.dealerId||_CU.uid;
 _db.collection('settings').doc(did+'_tax').set({
  dealerId:did,taxEmail:email,updatedAt:new Date().toISOString()
 },{merge:true}).then(function(){
  _filoToast('✅ 세무사 이메일이 등록됐습니다');
  document.getElementById('tax-status-txt').textContent='✅ 연동 중';
  document.getElementById('tax-status-sub').textContent=email+' · 매월 자동 발송';
 });
}

function _filoPageNotices(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="slide-up" style="max-width:700px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">📢 공지사항</div>'+
 '<div id="notices-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳</div></div></div>';
 _db.collection('notices').where('dealerId','==',did).orderBy('createdAt','desc').limit(20).get()
 .then(function(snap){
 var el2=document.getElementById('notices-list');if(!el2)return;
 if(snap.empty){el2.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--t3)">공지사항이 없습니다</div>';return;}
 el2.innerHTML=snap.docs.map(function(doc){
 var d=doc.data();
 return '<div class="card" style="margin-bottom:10px">'+
 '<div style="font-size:14px;font-weight:800;margin-bottom:6px">'+esc(d.title||'')+'</div>'+
 '<div style="font-size:12px;color:var(--t3);margin-bottom:8px">'+(d.createdAt||'').slice(0,10)+'</div>'+
 '<div style="font-size:13px;line-height:1.6;white-space:pre-wrap">'+esc(d.content||'')+'</div></div>';
 }).join('');
 }).catch(function(){});
}


var _tableMgmtUnsub=null;





/* ══════════════════════════════════════
   🛵 배달 주문 관리 페이지
   배민/쿠팡이츠/요기요 주문 수동 접수
   ══════════════════════════════════════ */




