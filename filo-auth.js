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
 // FILO ↔ DINE 실시간 연동 시작
 setTimeout(function(){
  if(typeof _filoWatchDineReservations==='function')_filoWatchDineReservations();
  if(typeof _filoWatchDineSales==='function')_filoWatchDineSales();
 },1500);
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

 // ── 관제센터 services 배열 기반 기능 on/off ──────────────────
 var _services = d.services || [];
 function hasFeature(key) {
  if(hasAll) return true;           // 슈퍼어드민·콤보 구독은 전부 허용
  if(_services.includes(key)) return true;  // 관제센터에서 켠 기능
  return false;
 }

 var menus=[];

 /* ── 홈 ── */
 menus.push({s:'홈',items:[
  {ic:'🏠',l:'대시보드',p:'home'},
 ]});

 /* ── 판매 (키오스크 구독) ── */
 if(hasAll||hasSub('kiosk')||hasFeature('kiosk')){
  menus.push({s:'🛒 판매',items:[
   {ic:'🖥️',l:'POS 결제',p:'kiosk'},
   {ic:'🍽',l:'메뉴 관리',p:'menu_mgmt'},
   {ic:'🔔',l:'주문 대기',p:'orders'},
   {ic:'🛵',l:'배달 주문',p:'delivery'},
  ]});
 }

 /* ── 테이블오더 (table_order 기능) ── */
 if(hasAll||hasSub('kiosk')||hasFeature('table_order')){
  menus.push({s:'🍽 테이블',items:[
   {ic:'📱',l:'테이블 현황',p:'table_qr'},
   {ic:'🛒',l:'주문 접수',p:'orders'},
   {ic:'🍽',l:'메뉴 관리',p:'menu_mgmt'},
  ]});
 }

 /* ── 재고 (인벤토리 구독) ── */
 if(hasAll||hasSub('inventory')||hasFeature('inventory')){
  menus.push({s:'📦 재고',items:[
   {ic:'📊',l:'재고 현황',p:'inventory'},
   {ic:'🍽',l:'레시피·원가',p:'recipe'},
   {ic:'🔔',l:'자동 발주',p:'auto_order'},
  ]});
 }

 /* ── 운영 (QR·테이블) ── */
 if(hasAll||hasSub('qr')||hasSub('kiosk')||hasFeature('qr_attend')||hasFeature('table_order')){
  menus.push({s:'🏪 운영',items:[
   {ic:'👤',l:'직원 QR',p:'qr_staff'},
   {ic:'📋',l:'테이블 QR',p:'table_qr'},
   {ic:'🗓',l:'예약·달력',p:'schedule'},
  ]});
 }

 /* ── 예약 (reservation 기능) ── */
 if(hasAll||hasFeature('reservation')){
  menus.push({s:'📅 예약',items:[
   {ic:'📅',l:'예약 관리',p:'schedule'},
   {ic:'👥',l:'회원 관리',p:'members'},
  ]});
 }

 /* ── 회원CRM (member_crm 기능) ── */
 if(hasAll||hasFeature('member_crm')){
  menus.push({s:'👤 회원',items:[
   {ic:'👤',l:'회원 목록',p:'members'},
   {ic:'🎁',l:'포인트·멤버십',p:'membership'},
  ]});
 }

 /* ── 매출분석 (sales_analytics 기능) ── */
 if(hasAll||hasFeature('sales_analytics')){
  menus.push({s:'📈 분석',items:[
   {ic:'📈',l:'매출 리포트',p:'sales'},
   {ic:'💰',l:'마진 분석',p:'margin'},
  ]});
 }

 /* ── 설정·관리 (항상 표시) ── */
 menus.push({s:'⚙️ 설정',items:[
  {ic:'🧾',l:'세무사 연동',p:'tax_share'},
  {ic:'⚙️',l:'설정',p:'settings'},
  {ic:'💳',l:'구독 관리',p:'subscription'},
 ]});

 var html='';
 var _closedG=[];
 try{_closedG=JSON.parse(localStorage.getItem('filo_nav_closed')||'[]');}catch(e){}

 menus.forEach(function(g,gi){
  var isClosed=_closedG.indexOf(gi)>=0;
  var labelCls='ns-label ns-toggle'+(isClosed?' collapsed':'');
  var arrowTxt=isClosed?'▸':'▾';
  var groupStyle=isClosed?' style="max-height:0;overflow:hidden"':'';

  if(g.s==='홈'){
   /* 홈은 그룹 헤더 없이 바로 아이템 */
   html+='<div class="ns-group" id="nav-g-'+gi+'">';
  } else {
   html+='<div class="'+labelCls+'" onclick="_toggleNavGroup('+gi+',this)" data-gi="'+gi+'">'+
    '<span>'+g.s+'</span><span class="ns-arrow">'+arrowTxt+'</span></div>';
   html+='<div class="ns-group" id="nav-g-'+gi+'"'+groupStyle+'>';
  }

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
 var today=_today();
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

 '<div class="kpi-grid" id="home-stats" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">'+
 [{t:'오늘 매출',c:'kpi-revenue',vc:'#a78bfa',ic:'💰',id:'hs-0'},
  {t:'오늘 순이익',c:'kpi-profit',vc:'#22c55e',ic:'📈',id:'hs-profit'},
  {t:'마진율',c:'kpi-margin',vc:'#f59e0b',ic:'📊',id:'hs-margin'},
  {t:'미완료 주문',c:'kpi-cost',vc:'#ef4444',ic:'🔔',id:'hs-1'},
  {t:'재고 부족',c:'kpi-warn',vc:'#f59e0b',ic:'⚠️',id:'hs-2'},
  {t:'출근 인원',c:'kpi-staff',vc:'#38bdf8',ic:'👥',id:'hs-3'}
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
 {ic:'💼',l:'급여',p:'payroll'},{ic:'🗓',l:'예약',p:'schedule'}].map(function(m){
 return '<button onclick="_filoGoPage(\''+m.p+'\')" style="padding:14px 6px;background:var(--surface2);border:1px solid var(--bd);border-radius:10px;color:var(--tx);cursor:pointer;text-align:center;transition:.2s;font-family:inherit" onmouseover="this.style.borderColor=\'rgba(124,58,237,.5)\';this.style.background=\'rgba(124,58,237,.08)\'" onmouseout="this.style.borderColor=\'var(--bd)\';this.style.background=\'var(--bg3)\'">'+
 '<div style="font-size:20px;margin-bottom:4px">'+m.ic+'</div>'+
 '<div style="font-size:11px;font-weight:600">'+m.l+'</div></button>';
 }).join('')+'</div></div>'+

 '<div class="card fade-up-4" style="margin-top:12px">'+
 '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
 '<div style="font-size:11px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.8px">🔗 DINE 실시간</div>'+
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
  /* 출근 인원 실시간 (DINE 출퇴근 연동) */
  if(window._filoAttendUnsub)window._filoAttendUnsub();
  window._filoAttendUnsub=_db.collection('attendance')
   .where('dealerId','==',did).where('date','==',today)
   .onSnapshot(function(attSnap){
    var ins={},outs={};
    attSnap.forEach(function(doc){
     var d=doc.data();
     if(d.type==='in')ins[d.memberId]=d;
     else if(d.type==='out')outs[d.memberId]=d;
    });
    var working=Object.keys(ins).filter(function(id){return !outs[id];}).length;
    if(e3)e3.textContent=working+'명';
    // DINE 연동 카드에도 표시
    var dineAtt=document.getElementById('filo-dine-att');
    if(dineAtt)dineAtt.textContent='출근 '+working+'명';
   },function(){});
   var todayProfit=todayRev-todayCost;
   var ePr=document.getElementById('hs-profit'),eMg=document.getElementById('hs-margin');
   if(e0)_countUp(e0,todayRev,400,'₩','');
   if(ePr){_countUp(ePr,Math.max(0,todayProfit),500,'₩','');ePr.style.color=todayProfit>=0?'#22c55e':'#ef4444';}
   if(eMg){eMg.textContent=todayMargin+'%';eMg.style.color=todayMargin>=60?'#22c55e':todayMargin>=40?'#f59e0b':'#ef4444';}
   if(e1)_countUp(e1,monthRev,600,'₩','');
   if(e2){e2.textContent=low+'개';e2.style.color=low>0?'#ef4444':'#22c55e';}
   if(e3)e3.textContent=document.getElementById('hs-3')?document.getElementById('hs-3').textContent:'';
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
 var trial={active:true,plan:'trial',start:_nowISO(),expiry:new Date(Date.now()+7*86400000).toISOString()};
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

// FILO ↔ DINE 실시간 예약 뱃지 (FILO 홈에서 DINE 예약 현황 표시)
function _filoWatchDineReservations(){
 if(window._filoDineResUnsub)window._filoDineResUnsub();
 var d=_cachedCompanyDoc||{};
 var did=d.dealerId||d.uid||'';
 if(!did||!_db)return;
 var today=_today();
 window._filoDineResUnsub=_db.collection('filo_bookings')
  .where('dealerId','==',did).where('date','==',today).where('status','==','pending')
  .onSnapshot(function(snap){
   // 홈 대시보드 DINE 예약 카드 갱신
   var badge=document.getElementById('filo-dine-res-badge');
   if(badge){badge.textContent=snap.size>0?'📅 예약 '+snap.size+'건':'예약 없음';badge.style.color=snap.size>0?'#f59e0b':'var(--t3)';}
   // 새 예약 토스트
   if(snap.docChanges){
    snap.docChanges().forEach(function(change){
     if(change.type==='added'){
      var r=change.doc.data();
      _filoToast('📅 DINE 새 예약: '+r.customerName+'님 '+r.seats+'인');
     }
    });
   }
  },function(){});
}

// FILO ↔ DINE 실시간 통합 매출 감시
function _filoWatchDineSales(){
 if(window._filoDineSalesUnsub)window._filoDineSalesUnsub();
 var d=_cachedCompanyDoc||{};
 var did=d.dealerId||d.uid||'';
 if(!did||!_db)return;
 var today=_today();
 window._filoDineSalesUnsub=_db.collection('filo_sales')
  .where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(snap){
   var total=0,cnt=0;
   snap.forEach(function(doc){var d=doc.data();if(d.status!=='cancelled'){total+=d.total||0;cnt++;}});
   var el=document.getElementById('filo-dine-sales');
   if(el)el.textContent='DINE ₩'+total.toLocaleString()+'('+cnt+'건)';
  },function(){});
}
