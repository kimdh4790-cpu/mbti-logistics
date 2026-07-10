// filo-common.js - 공통 초기화, Firebase, 네비게이션, 유틸
// 의존성: Firebase SDK
// 전역변수: _CU, _db, _storage, _cachedCompanyDoc



/* ══════════════════════════════════════════
   🍽 레시피 관리 페이지
   재료 + 사용량 + 단위 등록
   입고단가 자동 환산으로 원가 계산
   ══════════════════════════════════════════ */

function _filoRmAddRowDOM(wrap,invItems,selId,amount,unit){
 if(!wrap)wrap=document.getElementById('rm-ings');
 if(!wrap)return;
 var units=['g','ml','개','스푼','봉','컵','장'];

 var row=document.createElement('div');
 row.className='rm-row';
 row.style.cssText='display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:6px;margin-bottom:7px;align-items:center';

 /* 재료 선택 */
 var sel=document.createElement('select');
 sel.className='rm-item';
 sel.style.cssText='padding:8px 8px;background:var(--bg3);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:12px;outline:none';
 var defOpt=document.createElement('option');
 defOpt.value='';defOpt.textContent='재료 선택';
 sel.appendChild(defOpt);
 invItems.forEach(function(it){
  var opt=document.createElement('option');
  opt.value=it.id;opt.textContent=it.name;
  if(it.id===selId)opt.selected=true;
  sel.appendChild(opt);
 });

 /* 사용량 */
 var amtInp=document.createElement('input');
 amtInp.className='rm-amount';amtInp.type='number';amtInp.placeholder='사용량';
 amtInp.style.cssText=sel.style.cssText;
 if(amount)amtInp.value=amount;

 /* 단위 */
 var unitSel=document.createElement('select');
 unitSel.className='rm-unit';
 unitSel.style.cssText=sel.style.cssText;
 units.forEach(function(u){
  var opt=document.createElement('option');
  opt.value=u;opt.textContent=u;
  if(u===unit)opt.selected=true;
  unitSel.appendChild(opt);
 });

 /* 삭제 버튼 */
 var delBtn=document.createElement('button');
 delBtn.style.cssText='padding:8px 10px;background:var(--red-bg);border:1px solid var(--red-bd);border-radius:var(--r);color:var(--red);font-size:12px;cursor:pointer';
 delBtn.textContent='✕';
 delBtn.onclick=function(){row.remove();};

 row.appendChild(sel);row.appendChild(amtInp);row.appendChild(unitSel);row.appendChild(delBtn);
 wrap.appendChild(row);
}

/* 호환용 - 기존 _filoRmAddRow 호출 대응 */
function _filoRmAddRow(invOpts){
 var wrap=document.getElementById('rm-ings');
 _filoRmAddRowDOM(wrap,_rmInvItems,'','','g');
}


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

function _filoGenerateAIInsight(did){
 var el=document.getElementById('ai-insight-content');if(!el)return;
 var today=new Date().toISOString().slice(0,10);
 var from=today.slice(0,7)+'-01';
 Promise.all([
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from).where('date','<=',today).get(),
  _db.collection('filo_menus').where('dealerId','==',did).get()
 ]).then(function(results){
  var salesSnap=results[0],menuSnap=results[1];
  var total=0,cnt=0,items={},hours={};
  salesSnap.forEach(function(doc){
   var d=doc.data();if(d.status==='cancelled')return;
   total+=d.total||0;cnt++;
   var h=new Date(d.createdAt||d.date+'T12:00:00').getHours();
   hours[h]=(hours[h]||0)+(d.total||0);
   (d.items||[]).forEach(function(it){items[it.name]=(items[it.name]||0)+(it.qty||1);});
  });
  var peakH=Object.entries(hours).sort(function(a,b){return b[1]-a[1];})[0];
  var topItem=Object.entries(items).sort(function(a,b){return b[1]-a[1];})[0];
  var avgOrder=cnt?Math.round(total/cnt):0;
  var insights=[
   peakH?'⏰ <strong>'+peakH[0]+'시</strong>가 가장 바쁜 시간대입니다. 이 시간 직원 배치를 늘려보세요.':'',
   topItem?'🏆 이번달 최고 인기 메뉴는 <strong>'+topItem[0]+'</strong> ('+topItem[1]+'개)입니다.':'',
   avgOrder?'💰 평균 객단가는 <strong>₩'+avgOrder.toLocaleString()+'</strong>입니다. '+
    (avgOrder<5000?'사이드 메뉴 추천으로 객단가를 올려보세요.':'객단가가 양호합니다.'):'',
   cnt?'📊 이번달 총 <strong>'+cnt+'건</strong> 주문 · 총 매출 <strong>₩'+total.toLocaleString()+'</strong>':'',
  ].filter(Boolean);
  el.innerHTML='<div style="display:flex;flex-direction:column;gap:10px">'+
   insights.map(function(ins){
    return '<div style="padding:12px 14px;background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.15);border-radius:12px;font-size:13px;line-height:1.7;color:var(--t2)">'+ins+'</div>';
   }).join('')+
   '<div style="font-size:10px;color:var(--t3);margin-top:4px">* AI 분석은 이번달 데이터 기준입니다</div>'+
   '</div>';
 });
}

/* ── 탭 전환 ── */
var _mgTabIdx=0;
function _filoMgTab(idx){
 _mgTabIdx=idx;
 [0,1,2].forEach(function(i){
  var b=document.getElementById('mgt-'+i);
  if(b){b.style.background=i===idx?'var(--br)':'var(--b3)';b.style.color=i===idx?'#fff':'var(--t2)';}
 });
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 var ymEl=document.getElementById('mg-ym');
 var ym=ymEl?ymEl.value:new Date().toISOString().slice(0,7);
 if(idx===0)_filoRenderMarginAnalysis(did,ym);
 else if(idx===1)_filoRenderCostMgmt(did);
 else _filoRenderInsights(did,ym);
}

/* ── 데이터 로드 ── */
/* ── 실시간 마진 리스너 ── */
var _marginUnsub=null,_marginCostMap={},_marginDid='';

function _filoMarginLoad(){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did)return;
 _marginDid=did;
 var ymEl=document.getElementById('mg-ym');
 var ym=ymEl?ymEl.value:new Date().toISOString().slice(0,7);

 /* 원가 맵 먼저 로드 후 실시간 리스너 시작 */
 _db.collection('menu_costs').where('dealerId','==',did).get().then(function(snap){
  _marginCostMap={};
  snap.forEach(function(doc){var d=doc.data();_marginCostMap[d.name||doc.id]=d;});
  _filoStartMarginLive(did,ym);
 });
}

function _filoStartMarginLive(did,ym){
 /* 기존 리스너 해제 */
 if(_marginUnsub){_marginUnsub();_marginUnsub=null;}
 var start=ym+'-01',end=ym+'-31';
 var today=new Date().toISOString().slice(0,10);

 /* filo_sales(POS) 실시간 onSnapshot */
 _marginUnsub=_db.collection('filo_sales')
  .where('dealerId','==',did)
  .where('date','>=',start)
  .where('date','<=',end)
  .onSnapshot(function(posSnap){
   /* 수동 매출도 같이 조회 */
   _db.collection('mbetco_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get()
   .then(function(manSnap){
    _filoCalcAndRender(posSnap,manSnap,today,ym,did);
   });
  },function(e){console.error('margin listener:',e);});
}

function _filoCalcAndRender(posSnap,manSnap,today,ym,did){
 var todayRev=0,todayCost=0,todayCnt=0;
 var monthRev=0,monthCost=0;

 /* 수동 매출 */
 manSnap.forEach(function(doc){
  var d=doc.data();
  monthRev+=(d.revenue||0);
  monthCost+=(d.cost||0);
  if(d.date===today)todayRev+=(d.revenue||0);
 });

 /* POS 실시간 매출 + 원가 + 메뉴통계 + 시간대 */
 var menuStats={};  /* 메뉴별 {qty,rev} */
 var hourStats={};  /* 시간대별 매출 */
 var payStats={};  /* 결제수단별 매출 */
 posSnap.forEach(function(doc){
  var d=doc.data();
  var posTotal=d.total||0;
  var pm=d.payMethod||d.method||'기타';
  payStats[pm]=(payStats[pm]||0)+posTotal;
  var posCost=0;
  (d.items||[]).forEach(function(it){
   var c=_marginCostMap[it.name]||{};
   posCost+=((c.cost||0)*(it.qty||1));
   /* 메뉴별 통계 */
   if(!menuStats[it.name])menuStats[it.name]={qty:0,rev:0};
   menuStats[it.name].qty+=(it.qty||1);
   menuStats[it.name].rev+=(it.price||0)*(it.qty||1);
  });
  monthRev+=posTotal;
  monthCost+=posCost;
  if(d.date===today){
   todayRev+=posTotal;
   todayCost+=posCost;
   todayCnt++;
   /* 시간대별 집계 */
   if(d.createdAt){
    var kstH=new Date(new Date(d.createdAt).getTime()+9*3600000).getUTCHours();
    hourStats[kstH]=(hourStats[kstH]||0)+posTotal;
   }
  }
 });

 var todayProfit=todayRev-todayCost;
 var todayMargin=todayRev>0?Math.round(todayProfit/todayRev*100):0;
 var monthProfit=monthRev-monthCost;
 var monthMargin=monthRev>0?Math.round(monthProfit/monthRev*100):0;

 /* ── KPI 카드 실시간 업데이트 ── */
 function setKpi(id,val,color){
  var el=document.getElementById(id);
  if(!el)return;
  if(el.textContent!==val){
   el.textContent=val;
   el.classList.remove('count-anim');
   void el.offsetWidth;
   el.classList.add('count-anim');
   if(color)el.style.color=color;
  }
 }
 setKpi('kpi-revenue','₩'+monthRev.toLocaleString());
 setKpi('kpi-cost','₩'+monthCost.toLocaleString());
 setKpi('kpi-profit','₩'+monthProfit.toLocaleString(),monthProfit>=0?'#22c55e':'#ef4444');
 setKpi('kpi-margin',monthMargin+'%');

 /* ── 오늘 실시간 섹션 ── */
  var liveEl=document.getElementById('margin-live');
 if(liveEl){
  var pulse='<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;margin-right:5px;animation:pulse 2s infinite"></span>';
  var avgOrder=todayCnt>0?Math.round(todayRev/todayCnt):0;

  var kpiCards='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">'+
  [{label:'오늘 매출',val:'₩'+todayRev.toLocaleString(),color:'#a78bfa',sub:todayCnt+'건'},
   {label:'오늘 원가',val:'₩'+todayCost.toLocaleString(),color:'#f97316',sub:'식재료'},
   {label:'오늘 순이익',val:'₩'+todayProfit.toLocaleString(),color:todayProfit>=0?'#22c55e':'#ef4444',sub:todayMargin+'%'},
   {label:'평균 객단가',val:'₩'+avgOrder.toLocaleString(),color:'#f59e0b',sub:'건당 평균'}
  ].map(function(s){
   return '<div class="kpi-card card-hover" style="text-align:center;padding:14px 10px">'+
   '<div class="kpi-label">'+s.label+'</div>'+
   '<div class="kpi-val count-anim" style="color:'+s.color+';font-size:20px">'+s.val+'</div>'+
   '<div style="font-size:10px;color:var(--t3);margin-top:3px">'+s.sub+'</div></div>';
  }).join('')+'</div>';

  /* 인기 메뉴 TOP5 */
  var menuEntries=Object.entries(menuStats).sort(function(a,b){return b[1].qty-a[1].qty;}).slice(0,5);
  /* 결제수단별 카드 */
  var payIcons={'카드':'💳','현금':'💵','카카오페이':'🟡','네이버페이':'🟢','카운터결제':'🏪','삼성페이':'📱','기타':'💰'};
  var paySorted=Object.entries(payStats).sort(function(a,b){return b[1]-a[1];});
  var payHtml=paySorted.length?
  '<div style="margin-top:14px"><div class="sec-title">💳 결제수단별 매출</div>'+
  paySorted.map(function(m){
   var pct=totalRev>0?Math.round(m[1]/totalRev*100):0;
   var ic=payIcons[m[0]]||'💰';
   return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)">'+
    '<span style="font-size:16px">'+ic+'</span>'+
    '<div style="flex:1">'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:3px">'+
    '<span style="font-size:13px;font-weight:700">'+m[0]+'</span>'+
    '<span style="font-size:13px;font-weight:900;color:#22c55e">₩'+m[1].toLocaleString()+'</span>'+
    '</div>'+
    '<div style="height:4px;background:var(--surface3);border-radius:2px">'+
    '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#7c3aed,#22c55e);border-radius:2px"></div>'+
    '</div>'+
    '<span style="font-size:10px;color:var(--t3)">'+pct+'% 비중</span>'+
    '</div></div>';
  }).join('')+'</div>'
  :'<div style="padding:16px;text-align:center;color:var(--t3);font-size:12px">결제 데이터 없음</div>';

  var topMenu=menuEntries.length?
  '<div style="margin-top:14px">'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
  '<div><div class="sec-title" style="margin-bottom:10px">🏆 인기 메뉴 TOP5</div>'+
  menuEntries.map(function(kv,i){
   var rank=['🥇','🥈','🥉','4️⃣','5️⃣'][i];
   var pct=totalRev>0?Math.round(kv[1].rev/totalRev*100):0;
   return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)">'+
    '<span style="font-size:15px">'+rank+'</span>'+
    '<div style="flex:1">'+
    '<div style="display:flex;justify-content:space-between">'+
    '<span style="font-size:12px;font-weight:700">'+kv[0]+'</span>'+
    '<span style="font-size:12px;font-weight:900;color:#22c55e">'+kv[1].qty+'개</span>'+
    '</div>'+
    '<div style="height:3px;background:var(--surface3);border-radius:2px;margin-top:4px">'+
    '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#7c3aed,#22c55e);border-radius:2px"></div>'+
    '</div></div></div>';
  }).join('')+
  '</div>'+
  '<div><div class="sec-title" style="margin-bottom:10px">💳 결제수단 비중</div>'+
  '<div style="position:relative;height:130px"><canvas id="pay-donut-canvas"></canvas></div>'+
  '</div>'+
  '</div>'+
  '</div>'
  :'';

  /* 시간대별 차트 */
  var hourEntries=Object.keys(hourStats).map(Number).sort(function(a,b){return a-b;});
  var maxHour=hourEntries.length?Math.max.apply(null,hourEntries.map(function(h){return hourStats[h];})):1;
  var hourChart=hourEntries.length?
  '<div style="margin-top:14px"><div class="sec-title" style="margin-bottom:10px">⏰ 시간대별 매출</div>'+
  '<div style="position:relative;height:160px"><canvas id="hour-chart-canvas"></canvas></div>'+
  '</div>'
  :'';

  var isPeakHour=hourEntries.length?hourEntries.reduce(function(m,h){return hourStats[h]>hourStats[m]?h:m;},hourEntries[0]):null;

  /* 실시간 연동 상태 */
  var statusBar=todayCnt>0?
  '<div style="margin-top:12px;padding:9px 14px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:10px;display:flex;justify-content:space-between;align-items:center">'+
  '<span style="font-size:11px;font-weight:600;color:#22c55e">'+pulse+'실시간 연동 중</span>'+
  '<span style="font-size:10px;color:var(--t3)">오늘 '+todayCnt+'건 · 평균 ₩'+avgOrder.toLocaleString()+'</span>'+
  '</div>':'';

  liveEl.innerHTML=kpiCards+topMenu+hourChart+statusBar;

  /* Chart.js 차트 렌더링 */
  setTimeout(function(){
   /* 시간대별 막대차트 */
   var hCanvas=document.getElementById('hour-chart-canvas');
   if(hCanvas&&window.Chart){
    var hLabels=hourEntries.map(function(h){return h[0]+'시';});
    var hData=hourEntries.map(function(h){return h[1];});
    if(hCanvas._chart)hCanvas._chart.destroy();
    hCanvas._chart=new Chart(hCanvas,{
     type:'bar',
     data:{labels:hLabels,datasets:[{label:'매출',data:hData,
      backgroundColor:'rgba(124,58,237,.6)',borderColor:'rgba(124,58,237,1)',
      borderWidth:1,borderRadius:4}]},
     options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#9898c0',font:{size:10}}},
       y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#9898c0',font:{size:10},
        callback:function(v){return '₩'+(v/1000).toFixed(0)+'k';}}}}}
    });
   }
   /* 결제수단 도넛차트 */
   var pCanvas=document.getElementById('pay-donut-canvas');
   if(pCanvas&&window.Chart&&paySorted&&paySorted.length){
    var pColors=['#7c3aed','#22c55e','#f59e0b','#38bdf8','#ef4444','#a855f7'];
    if(pCanvas._chart)pCanvas._chart.destroy();
    pCanvas._chart=new Chart(pCanvas,{
     type:'doughnut',
     data:{labels:paySorted.map(function(p){return p[0];}),
      datasets:[{data:paySorted.map(function(p){return p[1];}),
       backgroundColor:pColors,borderWidth:0,hoverOffset:4}]},
     options:{responsive:true,maintainAspectRatio:false,cutout:'65%',
      plugins:{legend:{position:'bottom',labels:{color:'#9898c0',font:{size:10},boxWidth:10,padding:8}},
       tooltip:{callbacks:{label:function(ctx){return ctx.label+': ₩'+ctx.raw.toLocaleString();}}}}}
    });
   }
  },100);
 }


 /* 히어로 서브 */
 var heroSub=document.getElementById('hero-sub');
 if(heroSub)heroSub.textContent=ym+'월 기준 · 오늘 '+todayCnt+'건 · 마진율 '+todayMargin+'%';

 /* 7일 바 차트 */
 _filoRenderHeroChart(did);

 /* 분석 탭이면 리렌더 */
 if(_mgTabIdx===0)_filoRenderMarginAnalysis(did,ym);
}

/* ── 7일 바 차트 ── */
function _filoRenderMarginAnalysis(did,ym){
 var content=document.getElementById('mg-content');
 if(!content)return;
 content.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)"><div style="font-size:28px;margin-bottom:8px">⏳</div>분석 중...</div>';
 var start=ym+'-01',end=ym+'-31';
 Promise.all([
  _db.collection('mbetco_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get(),
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get(),
  _db.collection('menu_costs').where('dealerId','==',did).get()
 ]).then(function(res){
  var manSnap=res[0],posSnap=res[1],costSnap=res[2];
  var costMap={};
  costSnap.forEach(function(doc){var d=doc.data();costMap[d.name||doc.id]=d;});

  /* 날짜별 집계 */
  var dayMap={};
  manSnap.forEach(function(doc){
   var d=doc.data();
   if(!dayMap[d.date])dayMap[d.date]={rev:0,cost:0,items:{}};
   dayMap[d.date].rev+=(d.revenue||0);
   dayMap[d.date].cost+=(d.cost||0);
   (d.menuItems||[]).forEach(function(it){
    if(!dayMap[d.date].items[it.name])dayMap[d.date].items[it.name]=0;
    dayMap[d.date].items[it.name]+=it.qty;
   });
  });
  posSnap.forEach(function(doc){
   var d=doc.data();
   if(!dayMap[d.date])dayMap[d.date]={rev:0,cost:0,items:{}};
   dayMap[d.date].rev+=(d.total||0);
   (d.items||[]).forEach(function(it){
    var c=costMap[it.name]||{};
    dayMap[d.date].cost+=((c.cost||0)*it.qty);
    if(!dayMap[d.date].items[it.name])dayMap[d.date].items[it.name]=0;
    dayMap[d.date].items[it.name]+=it.qty;
   });
  });

  /* 메뉴별 마진 집계 */
  var menuMap={};
  Object.values(dayMap).forEach(function(day){
   Object.keys(day.items).forEach(function(name){
    var c=costMap[name]||{};
    var qty=day.items[name];
    var price=c.price||0,cost=c.cost||0;
    if(!menuMap[name])menuMap[name]={name:name,qty:0,rev:0,cost:0,price:price,costPer:cost};
    menuMap[name].qty+=qty;
    menuMap[name].rev+=price*qty;
    menuMap[name].cost+=cost*qty;
   });
  });

  var days=Object.keys(dayMap).sort();
  var totalRev=days.reduce(function(s,d){return s+dayMap[d].rev;},0);
  var totalCost=days.reduce(function(s,d){return s+dayMap[d].cost;},0);
  var totalProfit=totalRev-totalCost;
  var marginRate=totalRev>0?Math.round(totalProfit/totalRev*100):0;

  var html='';

  /* 월별 일별 차트 */
  html+='<div class="card" style="margin-bottom:12px">'+
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'+
  '<div style="font-size:13px;font-weight:800">📅 일별 매출 vs 순이익</div>'+
  '<div style="font-size:11px;color:var(--t3)">'+ym+'</div></div>'+
  '<div style="display:flex;align-items:flex-end;gap:3px;height:100px;overflow-x:auto">';
  if(days.length){
   var maxRev=Math.max.apply(null,days.map(function(d){return dayMap[d].rev;}))||1;
   html+=days.map(function(d){
    var rv=dayMap[d].rev,pr=Math.max(dayMap[d].rev-dayMap[d].cost,0);
    var rvH=Math.round(rv/maxRev*100),prH=Math.round(pr/maxRev*100);
    var dt=d.slice(8);
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:24px">'+
    '<div style="width:100%;position:relative;height:84px;display:flex;align-items:flex-end;gap:1px">'+
    '<div style="flex:1;height:'+rvH+'%;background:rgba(167,139,250,.3);border-radius:3px 3px 0 0;min-height:2px" title="매출 ₩'+rv.toLocaleString()+'"></div>'+
    '<div style="flex:1;height:'+prH+'%;background:linear-gradient(180deg,#22c55e,#10b981);border-radius:3px 3px 0 0;min-height:2px" title="순이익 ₩'+pr.toLocaleString()+'"></div>'+
    '</div>'+
    '<div style="font-size:9px;color:var(--t3)">'+dt+'</div></div>';
   }).join('');
  }else{html+='<div style="color:var(--t3);font-size:12px;padding:20px">매출 데이터 없음</div>';}
  html+='</div>'+
  '<div style="display:flex;gap:12px;margin-top:10px">'+
  '<div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:10px;border-radius:2px;background:rgba(167,139,250,.4)"></div><span style="font-size:10px;color:var(--t3)">매출</span></div>'+
  '<div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:10px;border-radius:2px;background:#22c55e"></div><span style="font-size:10px;color:var(--t3)">순이익</span></div>'+
  '</div></div>';

  /* 메뉴별 마진 테이블 */
  var menus=Object.values(menuMap).sort(function(a,b){
   var mA=a.rev>0?(a.rev-a.cost)/a.rev:0,mB=b.rev>0?(b.rev-b.cost)/b.rev:0;
   return mB-mA;
  });
  if(menus.length){
   html+='<div class="card" style="margin-bottom:12px">'+
   '<div style="font-size:13px;font-weight:800;margin-bottom:12px">🍽 메뉴별 마진 분석</div>'+
   '<div style="display:grid;grid-template-columns:1fr 60px 70px 60px;gap:6px;padding:0 4px 8px;border-bottom:1px solid var(--bd)">'+
   ['메뉴','판매수','순이익','마진율'].map(function(h){return '<div style="font-size:10px;color:var(--t3);font-weight:700">'+h+'</div>';}).join('')+'</div>'+
   menus.map(function(m){
    var profit=m.rev-m.cost;
    var rate=m.rev>0?Math.round(profit/m.rev*100):0;
    var badge=rate>=60?'high':rate>=40?'mid':'low';
    return '<div class="menu-cost-row">'+
    '<div style="font-size:12px;font-weight:700">'+esc(m.name)+'<div style="font-size:10px;color:var(--t3)">판매가 ₩'+m.price.toLocaleString()+' · 원가 ₩'+m.costPer.toLocaleString()+'</div></div>'+
    '<div style="font-size:12px;font-weight:800;text-align:right">'+m.qty+'개</div>'+
    '<div style="font-size:12px;font-weight:800;color:'+(profit>=0?'#22c55e':'#ef4444')+';text-align:right">₩'+profit.toLocaleString()+'</div>'+
    '<div style="text-align:right"><span class="margin-badge '+badge+'">'+rate+'%</span></div>'+
    '</div>';
   }).join('')+'</div>';
  }

  /* 인건비 vs 매출 비율 */
  html+='<div class="card">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:12px">📊 원가 구조 분석</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center">'+
  [
   {label:'식재료 원가',val:'₩'+totalCost.toLocaleString(),sub:totalRev>0?Math.round(totalCost/totalRev*100)+'%':'—',c:'#f97316'},
   {label:'순이익',val:'₩'+Math.max(totalProfit,0).toLocaleString(),sub:marginRate+'%',c:'#22c55e'},
   {label:'손익분기',val:totalRev>0&&totalProfit<0?'미달':'달성',sub:totalProfit>=0?'✅':'⚠️',c:totalProfit>=0?'#22c55e':'#ef4444'}
  ].map(function(s){
   return '<div style="background:var(--b3);border-radius:12px;padding:14px 10px">'+
   '<div style="font-size:10px;color:var(--t3);margin-bottom:6px">'+s.label+'</div>'+
   '<div style="font-size:16px;font-weight:900;color:'+s.c+'">'+s.val+'</div>'+
   '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+s.sub+'</div></div>';
  }).join('')+
  '</div></div>';

  content.innerHTML=html;
 }).catch(function(e){
  var c=document.getElementById('mg-content');
  if(c)c.innerHTML='<div style="color:var(--red);padding:20px">'+e.message+'</div>';
 });
}

/* ── 원가 등록 탭 ── */
function _filoRenderInsights(did,ym){
 var content=document.getElementById('mg-content');
 if(!content)return;
 var start=ym+'-01',end=ym+'-31';
 Promise.all([
  _db.collection('mbetco_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get(),
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get(),
  _db.collection('menu_costs').where('dealerId','==',did).get()
 ]).then(function(res){
  var rev=0,cost=0,posRev=0;
  res[0].forEach(function(d){rev+=d.data().revenue||0;cost+=d.data().cost||0;});
  res[1].forEach(function(d){posRev+=d.data().total||0;});
  var costMap={};res[2].forEach(function(doc){var d=doc.data();costMap[d.name]=d;});
  var margin=rev>0?Math.round((rev-cost)/rev*100):0;
  var insights=[];
  if(margin<40)insights.push({icon:'🚨',title:'마진율 위험',desc:'현재 마진율 '+margin+'%는 일반적인 카페 권장 마진율(60% 이상)보다 낮습니다. 원가가 높은 메뉴를 점검하세요.',color:'rgba(239,68,68,.1)',border:'rgba(239,68,68,.3)'});
  else if(margin>=60)insights.push({icon:'✅',title:'마진율 우수',desc:'마진율 '+margin+'%로 양호한 수준입니다. 이 수익 구조를 유지하면서 매출 확대에 집중하세요.',color:'rgba(34,197,94,.08)',border:'rgba(34,197,94,.25)'});
  if(posRev>0&&rev===0)insights.push({icon:'💡',title:'매출 수동 입력 필요',desc:'POS 매출(₩'+posRev.toLocaleString()+')은 있지만 수동 매출 입력이 없습니다. 매출 입력 탭에서 정확한 데이터를 입력하면 마진 분석이 더 정확해집니다.',color:'rgba(245,158,11,.08)',border:'rgba(245,158,11,.25)'});
  if(Object.keys(costMap).length===0)insights.push({icon:'⚙️',title:'원가 등록 필요',desc:'메뉴 원가가 등록되지 않아 정확한 마진 계산이 불가능합니다. 원가 등록 탭에서 메뉴별 원가를 입력해 주세요.',color:'rgba(124,58,237,.08)',border:'rgba(124,58,237,.25)'});
  if(!insights.length)insights.push({icon:'🎯',title:'데이터 분석 완료',desc:'모든 지표가 정상 범위입니다. 매일 매출을 입력하면 더 정확한 인사이트를 제공합니다.',color:'rgba(34,197,94,.08)',border:'rgba(34,197,94,.25)'});
  content.innerHTML='<div style="max-width:700px">'+
  insights.map(function(ins){
   return '<div class="insight-card" style="background:'+ins.color+';border-color:'+ins.border+'">'+
   '<div class="insight-icon">'+ins.icon+'</div>'+
   '<div><div style="font-size:13px;font-weight:800;margin-bottom:4px">'+ins.title+'</div>'+
   '<div style="font-size:12px;color:var(--t2);line-height:1.6">'+ins.desc+'</div></div></div>';
  }).join('')+'</div>';
 });
}

function _filoPageExpiry(el){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">로그인 후 이용하세요</div>';return;}
 el.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩 중...</div>';
 var today=new Date().toISOString().slice(0,10);
 firebase.firestore().collection('inventory').where('dealerId','==',did).get().then(function(snap){
 var expired=[],warn=[],ok=[];
 snap.forEach(function(doc){
 var d=Object.assign({id:doc.id},doc.data());
 if(!d.expiryDate){ok.push(d);return;}
 if(d.expiryDate<today) expired.push(d);
 else if(d.expiryDate<=new Date(Date.now()+7*86400000).toISOString().slice(0,10)) warn.push(d);
 else ok.push(d);
 });
 var html='<div style="max-width:860px;margin:0 auto">';
 html+='<div class="card" style="margin-bottom:10px">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:12px">📝 유통기한 등록</div>'+
 '<div style="display:grid;grid-template-columns:2fr 1fr auto;gap:8px;align-items:end">'+
 '<div class="fg"><label>품목</label><select id="exp-item" class="inp" style="font-size:12px"><option value="">-- 선택 --</option>';
 snap.forEach(function(doc){html+='<option value="'+doc.id+'">'+(doc.data().name||'')+'</option>';});
 html+='</select></div>'+
 '<div class="fg"><label>유통기한</label><input type="date" id="exp-date" class="inp"></div>'+
 '<button onclick="_filoExpSave(\''+did+'\')" style="padding:10px 12px;background:var(--br);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">저장</button>'+
 '</div></div>';
 if(expired.length){
 html+='<div class="card" style="border:2px solid #ef4444;margin-bottom:10px">'+
 '<div style="font-size:13px;font-weight:800;color:#ef4444;margin-bottom:8px">🚨 만료 ('+expired.length+'개) — 즉시 폐기</div>';
 expired.forEach(function(d){
 html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(239,68,68,.2)">'+
 '<span style="font-size:12px;font-weight:700">'+d.name+'</span>'+
 '<span style="font-size:11px;color:#ef4444;font-weight:700">'+d.expiryDate+' 만료</span></div>';
 });
 html+='</div>';
 }
 if(warn.length){
 html+='<div class="card" style="border:1px solid #f59e0b;margin-bottom:10px">'+
 '<div style="font-size:13px;font-weight:800;color:#f59e0b;margin-bottom:8px">⚠️ 7일 이내 만료 ('+warn.length+'개)</div>';
 warn.forEach(function(d){
 var dL=Math.ceil((new Date(d.expiryDate)-new Date(today))/86400000);
 html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(245,158,11,.2)">'+
 '<span style="font-size:12px;font-weight:700">'+d.name+'</span>'+
 '<span style="font-size:11px;color:#f59e0b;font-weight:700">D-'+dL+'</span></div>';
 });
 html+='</div>';
 }
 html+='<div class="card"><div style="font-size:13px;font-weight:800;margin-bottom:10px">📦 전체 목록</div>';
 snap.forEach(function(doc){
 var d=doc.data();
 var dL=d.expiryDate?Math.ceil((new Date(d.expiryDate)-new Date(today))/86400000):null;
 var color=dL===null?'var(--t3)':dL<0?'#ef4444':dL<=7?'#f59e0b':'#22c55e';
 html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px">'+d.name+'</span>'+
 '<span style="font-size:11px;font-weight:700;color:'+color+'">'+
 (d.expiryDate?d.expiryDate+' (D-'+dL+')':'미등록')+'</span></div>';
 });
 html+='</div></div>';
 el.innerHTML=html;
 }).catch(function(e){el.innerHTML='<div class="card" style="color:#ef4444">'+e.message+'</div>';});
}

window._filoExpSave=function(did){
 var itemId=document.getElementById('exp-item').value;
 var date=document.getElementById('exp-date').value;
 if(!itemId||!date){_filoToast('품목과 유통기한을 선택해주세요');return;}
 firebase.firestore().collection('inventory').doc(itemId).update({expiryDate:date,updatedAt:new Date().toISOString()})
 .then(function(){_filoToast('✅ 저장됨');_filoPageExpiry(document.getElementById('content'));})
 .catch(function(e){_filoToast('❌ '+e.message);});
};

function _filoLoadStockHistory(did, elId, type){
 var col=type==='in'?'inventory_in':'inventory_out';
 _db.collection(col).where('dealerId','==',did).orderBy('createdAt','desc').limit(20).get()
 .then(function(snap){
 var el=document.getElementById(elId);if(!el)return;
 if(snap.empty){el.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">이력 없음</div>';return;}
 el.innerHTML=snap.docs.map(function(doc){
 var d=doc.data();
 var itemName=d.itemName||d.itemId||'';
 var icon=type==='in'?'📥':'📤';
 var color=type==='in'?'#22c55e':'#ef4444';
 var typeLabel={'sale':'판매','use':'사용','waste':'폐기','return':'반품','etc':'기타'}[d.type]||'';
 return '<div class="stock-item" style="display:flex;align-items:center;gap:10px;padding:12px 14px">'+
 '<div style="font-size:18px">'+icon+'</div>'+
 '<div style="flex:1">'+
 '<div style="font-size:13px;font-weight:700">'+esc(d.itemId||'')+(typeLabel?' · '+typeLabel:'')+'</div>'+
 '<div style="font-size:11px;color:var(--t3)">'+(d.supplier||d.memo||'')+(d.expiry?' · 유통기한:'+d.expiry:'')+'</div>'+
 '</div>'+
 '<div style="text-align:right">'+
 '<div style="font-size:15px;font-weight:900;color:'+color+'">'+(type==='in'?'+':'-')+d.qty+'개</div>'+
 '<div style="font-size:10px;color:var(--t3)">'+(d.date||'')+'</div>'+
 '</div></div>';
 }).join('');
 }).catch(function(){});
 _db.collection('inventory').where('dealerId','==',did).get().then(function(snap){
 var map={};
 snap.forEach(function(doc){map[doc.id]=doc.data().name||doc.id;});
 var el=document.getElementById(elId);if(!el)return;
 el.querySelectorAll('.stock-item').forEach(function(row,i){
 });
 }).catch(function(){});
}

function _filoPageMembers(el){
 var did=_CU.dealerId||_CU.uid;
 var isSA=_CU.role==='superadmin'||SUPER_ADMIN_EMAILS.indexOf(_CU.email||'')>=0;
 el.innerHTML='<div class="slide-up" style="max-width:700px;margin:0 auto">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
 '<div style="font-size:17px;font-weight:900">👤 직원 관리</div>'+
 '<button onclick="_filoShowAddMember()" class="btn btn-brand btn-sm">+ 직원 추가</button></div>'+
 '<div id="member-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳</div></div></div>';
 _filoLoadMembers(did);
}

function _filoLoadMembers(did){
 _db.collection('members').where('dealerId','==',did).orderBy('name').get()
 .then(function(snap){
 var el=document.getElementById('member-list');if(!el)return;
 if(snap.empty){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)"><div style="font-size:32px;margin-bottom:8px">👥</div><div>직원이 없습니다</div><button onclick="_filoShowAddMember()" class="btn btn-brand" style="margin-top:12px;padding:10px 24px;width:auto">첫 직원 추가</button></div>';return;}
 el.innerHTML=snap.docs.map(function(doc,idx){
 var d=doc.data();
 var roleLabel={'admin':'관리자','staff':'직원','part':'알바'}[d.role]||'직원';
 var roleColor={'admin':'#7c3aed','staff':'#0891b2','part':'#f59e0b'}[d.role]||'#94a3b8';
 var initials=(d.name||'?').slice(0,1);
 return '<div class="member-card slide-up stagger-'+Math.min(idx+1,4)+'" data-id="'+doc.id+'" style="cursor:pointer">'+
 '<div class="avatar">'+initials+'</div>'+
 '<div style="flex:1">'+
 '<div style="font-size:14px;font-weight:800">'+esc(d.name||'')+'</div>'+
 '<div style="font-size:11px;color:var(--t3)">'+(d.phone||'')+(d.dept?' · '+d.dept:'')+'</div>'+
 '</div>'+
 '<div style="text-align:right">'+
 '<div style="font-size:11px;font-weight:700;color:'+roleColor+';background:'+roleColor+'22;padding:2px 8px;border-radius:100px">'+roleLabel+'</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+(d.wage?d.wage.toLocaleString()+'원':'시급 미설정')+'</div>'+
 '</div></div>';
 }).join('');
 }).catch(function(e){var el=document.getElementById('member-list');if(el)el.innerHTML='<div style="color:var(--red);padding:20px">'+e.message+'</div>';});
}

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

function _filoAddMember(){
 var did=_CU.dealerId||_CU.uid;
 var name=document.getElementById('nm-name').value.trim();
 var phone=document.getElementById('nm-phone').value.trim();
 var role=document.getElementById('nm-role').value;
 var wage=parseInt(document.getElementById('nm-wage').value)||0;
 var dept=document.getElementById('nm-dept').value.trim();
 if(!name){_filoToast('이름을 입력하세요');return;}
 _db.collection('members').add({
 dealerId:did,name:name,phone:phone,role:role,wage:wage,dept:dept,
 createdAt:new Date().toISOString(),is_active:true
 }).then(function(){
 document.querySelector('.mo')&&document.querySelector('.mo').remove();
 _filoToast('✅ '+name+' 추가 완료');
 _filoLoadMembers(did);
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

function _filoShowMemberDetail(docId){
 _db.collection('members').doc(docId).get().then(function(snap){
 if(!snap.exists)return;
 var d=snap.data();
 var did=_CU.dealerId||_CU.uid;
 var html='<div style="padding:20px;max-width:400px;margin:0 auto">'+
 '<div style="text-align:center;margin-bottom:16px">'+
 '<div class="avatar" style="width:60px;height:60px;font-size:24px;margin:0 auto 8px">'+d.name.slice(0,1)+'</div>'+
 '<div style="font-size:17px;font-weight:900">'+esc(d.name)+'</div>'+
 '<div style="font-size:12px;color:var(--t3)">'+(d.dept||'')+'</div></div>'+
 '<div style="background:var(--b3);border-radius:12px;padding:14px;margin-bottom:14px">'+
 '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">전화번호</span><span style="font-size:13px;font-weight:700">'+(d.phone||'-')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">역할</span><span style="font-size:13px;font-weight:700">'+({'admin':'관리자','staff':'직원','part':'알바'}[d.role]||'직원')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:6px 0">'+
 '<span style="font-size:12px;color:var(--t3)">시급</span><span style="font-size:13px;font-weight:700">'+(d.wage?(d.wage.toLocaleString()+'원'):'-')+'</span></div></div>'+
 '<div style="display:flex;gap:8px">'+
 '<button onclick="this.closest(".mo").remove()" class="btn" style="flex:1;background:var(--b3)">닫기</button>'+
 '<button class="btn del-btn" data-id="'+docId+'" data-name="'+esc(d.name)+'" style="flex:1;background:var(--red);color:#fff">삭제</button></div></div>';
 _filoShowModal(html);
 });
}

function _filoDeleteMember(docId,name){
 if(!confirm(name+' 직원을 삭제하시겠습니까?'))return;
 var did=_CU.dealerId||_CU.uid;
 _db.collection('members').doc(docId).delete().then(function(){
 document.querySelector('.mo')&&document.querySelector('.mo').remove();
 _filoToast('✅ 삭제 완료');
 _filoLoadMembers(did);
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

var _attendUnsub=null;
function _filoManualCheckin(){
 var mc=document.getElementById('manual-checkin');
 if(mc)mc.style.display=mc.style.display==='none'?'block':'none';
}

function _filoDoManualCheckin(){
 var did=_CU.dealerId||_CU.uid;
 var memberId=document.getElementById('mc-member').value;
 var type=document.getElementById('mc-type').value;
 var timeVal=document.getElementById('mc-time').value;
 if(!memberId){_filoToast('직원을 선택하세요');return;}
 if(!timeVal){_filoToast('시각을 입력하세요');return;}
 var memberSel=document.getElementById('mc-member');
 var memberName=memberSel.options[memberSel.selectedIndex].text;
 var dt=new Date(timeVal);
 _db.collection('attendance').add({
 dealerId:did,memberId:memberId,memberName:memberName,
 type:type,time:dt.toISOString(),date:dt.toISOString().slice(0,10),
 createdBy:_CU.name||_CU.userId||'',manual:true
 }).then(function(){
 _filoToast('✅ '+(type==='in'?'출근':'퇴근')+' 체크 완료');
 document.getElementById('manual-checkin').style.display='none';
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

function _filoStartLiveTicker(){
 if(_liveTickerTimer)clearInterval(_liveTickerTimer);
 _filoRenderLive();
 _liveTickerTimer=setInterval(_filoRenderLive,30000);
}
function _filoRenderLive(){
 var did=_CU.dealerId||_CU.uid;
 var today=new Date().toISOString().slice(0,10);
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','==',today).where('type','==','in').get(),
  _db.collection('attendance').where('dealerId','==',did).where('date','==',today).where('type','==','out').get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(res){
  var insSnap=res[0],outsSnap=res[1],memSnap=res[2];
  var memMap={};
  memSnap.forEach(function(doc){memMap[doc.id]=doc.data();});
  var outSet={};
  outsSnap.forEach(function(doc){outSet[doc.data().memberId]=true;});
  var active=[];
  insSnap.forEach(function(doc){
   var d=doc.data();
   if(!outSet[d.memberId]){
    var mem=Object.values(memMap).find(function(m){return m.name===d.memberName;})||{};
    var inTime=new Date(d.time);
    var elapsedMin=Math.floor((Date.now()-inTime)/60000);
    var wage=mem.wage||0;
    var earned=Math.round(elapsedMin/60*wage);
    active.push({name:d.memberName||d.memberId,wage:wage,wageType:mem.wageType||'hourly',elapsedMin:elapsedMin,earned:earned,inTime:d.time});
   }
  });
  var liveEl=document.getElementById('pay-live');
  if(!liveEl)return;
  if(!active.length){liveEl.innerHTML='';return;}
  liveEl.innerHTML='<div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:12px;padding:12px 14px;margin-bottom:4px">'+
  '<div style="font-size:12px;font-weight:800;color:#22c55e;margin-bottom:8px">🟢 현재 출근 중 ('+active.length+'명)</div>'+
  active.map(function(a){
   var h=Math.floor(a.elapsedMin/60),m=a.elapsedMin%60;
   var wLabel=a.wageType==='daily'?'일급':'시급';
   return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(34,197,94,.1)">'+
   '<div><span style="font-size:13px;font-weight:800">'+esc(a.name)+'</span>'+
   '<span style="font-size:11px;color:var(--t3);margin-left:8px">'+wLabel+' '+a.wage.toLocaleString()+'원 · '+h+'h '+m+'m 근무중</span></div>'+
   '<div style="font-size:14px;font-weight:900;color:#22c55e">+₩'+a.earned.toLocaleString()+'</div></div>';
  }).join('')+
  '</div>';
 }).catch(function(){});
}

/* ── 고용유형 탭 필터 ── */
var _pwTabIdx=0;
function _filoPwTab(idx){
 _pwTabIdx=idx;
 [0,1,2,3].forEach(function(i){
  var b=document.getElementById('pwt-'+i);
  if(b){b.style.background=i===idx?'var(--br)':'var(--b3)';b.style.color=i===idx?'#fff':'var(--t2)';}
 });
 _filoRenderPayList();
}

/* ── 주휴수당 계산 ── */
function _calcWeeklyAllowance(ins,outs,wage,wageType){
 if(wageType!=='hourly'||!wage)return 0;
 /* 주별 근무시간 집계 */
 var weekMap={};
 ins.forEach(function(inR,i){
  var outR=outs[i];
  if(!outR)return;
  var diff=(new Date(outR.time)-new Date(inR.time))/3600000;
  if(diff<=0||diff>12)return;
  var d=new Date(inR.time);
  /* ISO week key */
  var dayOfWeek=d.getDay()||7;
  var monday=new Date(d);monday.setDate(d.getDate()-(dayOfWeek-1));
  var wk=monday.toISOString().slice(0,10);
  weekMap[wk]=(weekMap[wk]||0)+diff;
 });
 var total=0;
 Object.values(weekMap).forEach(function(hrs){
  if(hrs>=15){
   /* 주휴수당 = (주근무시간/40)*8*시급 (단 8h 한도) */
   var dailyHour=Math.min(hrs/5,8);
   total+=Math.round(dailyHour*wage);
  }
 });
 return total;
}

/* ── 세금/공제 계산 ── */
function _calcDeduction(gross,empType){
 /* empType: 'part'=단기알바(3.3%), 'full'=정직원(4대보험), 'monthly'=월급 */
 if(!gross)return{tax:0,insurance:0,total:0};
 if(empType==='part'){
  var tax=Math.round(gross*0.033);
  return{tax:tax,insurance:0,total:tax};
 }
 if(empType==='full'||empType==='monthly'){
  var pension=Math.round(gross*0.045);
  var health=Math.round(gross*0.03545);
  var employ=Math.round(gross*0.009);
  var ins=pension+health+employ;
  var tax2=Math.round((gross-ins)*0.033);
  return{tax:tax2,insurance:ins,total:tax2+ins};
 }
 return{tax:0,insurance:0,total:0};
}

/* ── 전체 급여 로드 ── */
var _payrollData=[];
function _filoRenderPaySummary(){
 var members=_payrollData;
 var totalGross=members.reduce(function(s,m){return s+m.gross;},0);
 var totalNet=members.reduce(function(s,m){return s+m.netPay;},0);
 var totalHour=members.reduce(function(s,m){return s+m.workHour;},0);
 var totalWeekly=members.reduce(function(s,m){return s+(m.weeklyAllowance||0);},0);
 var sum=document.getElementById('pay-summary');
 if(!sum)return;
 sum.innerHTML=[
  {label:'총 지급예정',val:'₩'+totalGross.toLocaleString(),color:'#22c55e',icon:'💰'},
  {label:'총 실수령액',val:'₩'+totalNet.toLocaleString(),color:'#a78bfa',icon:'💳'},
  {label:'주휴수당 합계',val:'₩'+totalWeekly.toLocaleString(),color:'#f59e0b',icon:'📅'},
  {label:'총 근무시간',val:Math.round(totalHour)+'h',color:'#38bdf8',icon:'⏱'},
 ].map(function(s,i){
  return '<div class="stat-card pop-in stagger-'+(i+1)+'">'+
  '<div style="font-size:18px;margin-bottom:4px">'+s.icon+'</div>'+
  '<div style="font-size:17px;font-weight:900;color:'+s.color+'">'+s.val+'</div>'+
  '<div style="font-size:10px;color:var(--t3)">'+s.label+'</div></div>';
 }).join('');
}

function _filoRenderPayList(){
 var list=document.getElementById('pay-list');
 if(!list)return;
 var typeFilter=['all','hourly','daily','monthly'][_pwTabIdx];
 var members=_payrollData.filter(function(m){
  return typeFilter==='all'||m.wageType===typeFilter;
 });
 if(!members.length){
  list.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--t3)">해당 조건의 급여 기록 없음</div>';
  return;
 }
 list.innerHTML=members.sort(function(a,b){return b.gross-a.gross;}).map(function(m,i){
  var typeLabel=m.wageType==='daily'?'일급':m.wageType==='monthly'?'월급':'시급';
  var empLabel=m.empType==='full'?'정직원':m.empType==='monthly'?'월급직':'단기알바';
  var hasWeekly=m.weeklyAllowance>0;
  return '<div class="pay-card slide-up stagger-'+Math.min(i+1,4)+'" style="flex-direction:column;gap:8px">'+
  '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
  '<div>'+
  '<div style="font-size:14px;font-weight:900">'+esc(m.name)+
  ' <span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--b3);color:var(--t2)">'+empLabel+'</span></div>'+
  '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+
  typeLabel+' '+m.wage.toLocaleString()+'원 · '+m.dayCount+'일 · '+Math.floor(m.workHour)+'h '+m.workMin%60+'m</div>'+
  '</div>'+
  '<div style="text-align:right">'+
  '<div class="pay-amount">₩'+m.gross.toLocaleString()+'</div>'+
  '<div style="font-size:10px;color:#ef4444">공제 -₩'+m.deduction.toLocaleString()+'</div>'+
  '<div style="font-size:12px;font-weight:800;color:#22c55e">실수령 ₩'+m.netPay.toLocaleString()+'</div>'+
  '</div></div>'+
  (hasWeekly?'<div style="font-size:11px;color:#f59e0b;background:rgba(245,158,11,.08);border-radius:6px;padding:4px 8px">'+
  '📅 주휴수당 +₩'+m.weeklyAllowance.toLocaleString()+' 자동 포함</div>':'')+
  (m.insurance?'<div style="font-size:10px;color:var(--t3)">4대보험 ₩'+m.insurance.toLocaleString()+' · 소득세 ₩'+m.tax.toLocaleString()+'</div>':'')+
  '</div>';
 }).join('');
}

/* ── 명세서 발송 ── */
function _filoDoSendPayslip(ym){
 document.querySelector('.mo')&&document.querySelector('.mo').remove();
 _filoToast('📨 급여명세서 발송 기능은 준비 중입니다 (카카오 알림톡 연동 예정)');
}


var _cartItems=[];
function _filoPay(){
 if(!_cartItems.length){_filoToast('주문 내역이 없습니다');return;}
 var rawTotal=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var discount=window._posDiscount||0;
 var total=Math.max(0,rawTotal-discount);

 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:440px';

 /* 헤더 */
 var hdrDiv=document.createElement('div');
 hdrDiv.style.cssText='margin-bottom:14px';
 hdrDiv.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:10px">💳 결제하기</div>'+
  '<div style="background:var(--surface2);border-radius:var(--r);padding:12px 14px">'+
  '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t3);margin-bottom:4px">'+
  '<span>소계 ('+_cartItems.length+'종)</span><span>₩'+rawTotal.toLocaleString()+'</span></div>'+
  (discount>0?'<div style="display:flex;justify-content:space-between;font-size:12px;color:#ef4444;margin-bottom:4px"><span>할인</span><span>−₩'+discount.toLocaleString()+'</span></div>':'')+
  '<div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;border-top:1px solid var(--bd);padding-top:8px;margin-top:4px">'+
  '<span>결제금액</span><span style="color:#22c55e">₩'+total.toLocaleString()+'</span></div></div>';
 box.appendChild(hdrDiv);

 /* 할인 */
 var discDiv=document.createElement('div');
 discDiv.style.cssText='background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);padding:11px 12px;margin-bottom:14px';
 discDiv.innerHTML='<div style="font-size:10px;color:var(--t3);font-weight:700;letter-spacing:.6px;margin-bottom:8px">할인 적용</div>'+
  '<div style="display:flex;gap:6px">'+
  '<input id="pay-disc-inp" type="number" placeholder="할인금액 입력" style="flex:1;padding:9px 10px;background:var(--bg3);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);font-size:13px;outline:none">'+
  '<button onclick="(function(){window._posDiscount=parseInt(document.getElementById(\'pay-disc-inp\').value)||0;document.querySelectorAll(\'.mo\').forEach(function(e){e.remove();});_filoPay();})()" style="padding:9px 14px;background:var(--br);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">적용</button>'+
  '<button onclick="(function(){var r='+rawTotal+';window._posDiscount=Math.round(r*0.1);document.querySelectorAll(\'.mo\').forEach(function(e){e.remove();});_filoPay();})()" style="padding:9px 10px;background:var(--surface3);border:1px solid var(--bd2);border-radius:8px;color:var(--t2);font-size:11px;font-weight:700;cursor:pointer">10%</button>'+
  '<button onclick="(function(){var r='+rawTotal+';window._posDiscount=Math.round(r*0.2);document.querySelectorAll(\'.mo\').forEach(function(e){e.remove();});_filoPay();})()" style="padding:9px 10px;background:var(--surface3);border:1px solid var(--bd2);border-radius:8px;color:var(--t2);font-size:11px;font-weight:700;cursor:pointer">20%</button>'+
  '</div>';
 box.appendChild(discDiv);

 /* 선불/후불 선택 탭 */
 var payTypeDiv=document.createElement('div');
 payTypeDiv.style.cssText='display:flex;gap:6px;margin-bottom:12px';
 window._posPayType=window._posPayType||'postpay';
 [{k:'postpay',l:'🧾 후불 (나중에 결제)'},{k:'prepay',l:'💳 선불 (지금 결제)'}].forEach(function(pt){
  var ptBtn=document.createElement('button');
  ptBtn.style.cssText='flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;border:2px solid '+(window._posPayType===pt.k?'#0891b2':'var(--bd2)')+';background:'+(window._posPayType===pt.k?'rgba(8,145,178,.15)':'var(--surface2)')+';color:'+(window._posPayType===pt.k?'#0891b2':'var(--t2)');
  ptBtn.textContent=pt.l;
  (function(k){ptBtn.onclick=function(){
   window._posPayType=k;
   if(k==='postpay'){
    // 후불: 바로 주문 등록 (결제수단 = 후불)
    document.querySelectorAll('.mo').forEach(function(e){e.remove();});
    _filoConfirmPay('postpay','🧾 후불');
   } else {
    // 선불: 결제 수단 선택 화면으로
    document.querySelectorAll('.mo').forEach(function(e){e.remove();});
    _filoPay();
   }
  };})(pt.k);
  payTypeDiv.appendChild(ptBtn);
 });
 box.appendChild(payTypeDiv);

 /* 결제 수단 버튼 */
 var methods=[
  {k:'card',l:'카드',ic:'💳'},{k:'cash',l:'현금',ic:'💵'},
  {k:'kakao',l:'카카오페이',ic:'🟡'},{k:'samsung',l:'삼성페이',ic:'📱'},
  {k:'naver',l:'네이버페이',ic:'🟢'},{k:'zero',l:'서비스/무료',ic:'🎁'},
 ];
 var grid=document.createElement('div');
 grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px';
 methods.forEach(function(m){
  var btn=document.createElement('button');
  btn.style.cssText='padding:14px 6px;border:1.5px solid var(--bd2);border-radius:var(--r);background:var(--surface2);color:var(--tx);cursor:pointer;transition:.15s;text-align:center';
  btn.innerHTML='<div style="font-size:22px;margin-bottom:4px">'+m.ic+'</div><div style="font-size:11px;font-weight:700">'+m.l+'</div>';
  btn.onmouseover=function(){this.style.borderColor='#7c3aed';this.style.background='var(--surface3)';};
  btn.onmouseout=function(){this.style.borderColor='var(--bd2)';this.style.background='var(--surface2)';};
  (function(mk,ml){btn.onclick=function(){
   document.querySelectorAll('.mo').forEach(function(e){e.remove();});
   _filoConfirmPay(mk,ml);
  };})(m.k,m.l+' '+m.ic);
  grid.appendChild(btn);
 });
 box.appendChild(grid);

 /* 분할 결제 버튼 */
 var splitBtn=document.createElement('button');
 splitBtn.style.cssText='width:100%;padding:11px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:var(--r);color:#f59e0b;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px';
 splitBtn.textContent='✂️ 분할 결제 (현금+카드)';
 splitBtn.onclick=function(){mo.remove();_filoSplitPay(total);};
 box.appendChild(splitBtn);

 /* 각자 계산 버튼 */
 var selfBtn=document.createElement('button');
 selfBtn.style.cssText='width:100%;padding:11px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:var(--r);color:#818cf8;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px';
 selfBtn.textContent='👥 각자 계산';
 selfBtn.onclick=function(){mo.remove();_filoSelfPay();};
 box.appendChild(selfBtn);

 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='width:100%;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);font-size:13px;cursor:pointer';
 cancelBtn.textContent='취소';
 cancelBtn.onclick=function(){mo.remove();window._posDiscount=0;};
 box.appendChild(cancelBtn);

 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo){mo.remove();window._posDiscount=0;}};
 document.body.appendChild(mo);
}

// ── 분할 결제 (현금+카드) ──
function _filoConfirmPay(method, methodLabel){
 document.querySelector('.mo') && document.querySelector('.mo').remove();
 var did=_CU.dealerId||_CU.uid;
 var rawTotal=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var discount=window._posDiscount||0;
 var total=Math.max(0,rawTotal-discount);
 window._posDiscount=0; /* 결제 후 초기화 */
 var now=new Date();
 var items=_cartItems.map(function(c){return {id:c.id,name:c.name,price:c.price,qty:c.qty};});
 var tableId=window._selectedTableId||null;
 var tableName=window._selectedTableName||(tableId?'테이블 '+tableId:'카운터');
 var payType=window._posPayType||'postpay';
 window._posPayType='postpay';
 var saveData={
  dealerId:did,items:items,total:total,
  tableId:tableId,tableName:tableName,
  tableNum:tableId?parseInt(tableId):null,
  createdAt:now.toISOString(),date:now.toISOString().slice(0,10),
  type:'pos',payMethod:method,payType:payType,
  status:payType==='prepay'?'paid':'pending',
  createdBy:_CU.name||_CU.userId||''
 };
 // filo_sales에 저장
 _db.collection('filo_sales').add(saveData).then(function(ref){
  // 테이블 선택 시 filo_orders에도 저장 (테이블 현황 연동)
  if(tableId){
   _db.collection('filo_orders').add(Object.assign({},saveData,{
    type:'table',source:'pos'
   })).catch(function(){});
  }
  window._selectedTableId=null;window._selectedTableName=null;
  var ct=document.querySelector('.cart-panel div:first-child');if(ct)ct.textContent='🛒 주문 내역';
  if(payType==='postpay'){
   // 후불: 주문 접수 토스트만
   var tMsg=tableName&&tableName!=='카운터'?tableName+' ':'';
   _filoToast('✅ '+tMsg+'주문 접수됐습니다!');
   _cartClear();
  } else {
   // 선불: 영수증 출력
   _filoShowReceipt(ref.id, items, total, method, methodLabel, now);
   _cartClear();
  }
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

function _filoQRSave(num,name){
 var el=document.getElementById('qr-'+num);
 if(!el)return;
 var img=el.querySelector('img');
 var canvas=el.querySelector('canvas');
 var src=img?img.src:(canvas?canvas.toDataURL('image/png'):'');
 if(!src){_filoToast('❌ QR 없음');return;}
 var a=document.createElement('a');
 a.download=name+'_QR.png';a.href=src;a.click();
 _filoToast('💾 '+name+' QR 저장됐습니다');
}

function _filoEnsureQR(cb){
 if(window.QRCode)return cb();
 /* 혹시 로드 안됐으면 동적 로드 */
 var s=document.createElement('script');
 s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
 s.onload=function(){setTimeout(cb,100);};
 document.head.appendChild(s);
}

function _filoQRDownload(num,name){
 var wrap=document.getElementById('qr-c-'+num);
 if(!wrap){_filoToast('❌ QR 없음');return;}
 var canvas=wrap.querySelector('canvas');
 var img=wrap.querySelector('img');
 var a=document.createElement('a');
 a.download=name+'_QR.png';
 if(canvas)a.href=canvas.toDataURL('image/png');
 else if(img)a.href=img.src;
 else{_filoToast('❌ QR 없음');return;}
 a.click();
 _filoToast('💾 '+name+' QR 저장됐습니다');
}

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
function _filoPageMembership(el){
 el.innerHTML='<div class="slide-up card" style="text-align:center;padding:40px">'+
 '<div style="font-size:40px;margin-bottom:12px">🎫</div>'+
 '<div style="font-size:16px;font-weight:800;margin-bottom:6px">회원권</div>'+
 '<div style="font-size:12px;color:var(--t3)">회원권 관리 기능 곧 추가됩니다</div></div>';
}
function _filoPageSchedule(el){
 var did=_CU.dealerId||_CU.uid;
 var now=new Date();
 window._calYear=now.getFullYear();
 window._calMonth=now.getMonth();
 el.innerHTML='';

 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:900px;margin:0 auto';

 /* 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
 hdr.innerHTML='<div><div class="page-title">🗓 예약 · 달력</div><div class="page-sub">고객 예약 및 일정 관리</div></div>';
 var addBtn=document.createElement('button');
 addBtn.className='btn btn-primary btn-sm';
 addBtn.textContent='+ 예약 추가';
 addBtn.onclick=function(){_filoReservationAdd(did);};
 hdr.appendChild(addBtn);
 wrap.appendChild(hdr);

 /* 달력 컨테이너 */
 var calWrap=document.createElement('div');
 calWrap.id='cal-wrap';
 calWrap.className='card';
 wrap.appendChild(calWrap);

 /* 예약 목록 */
 var listWrap=document.createElement('div');
 listWrap.id='reservation-list';
 wrap.appendChild(listWrap);

 el.appendChild(wrap);
 _filoRenderCalendar(did);
}

function _filoRenderCalendar(did){
 var wrap=document.getElementById('cal-wrap');
 if(!wrap)return;
 var year=window._calYear;
 var month=window._calMonth;
 var today=new Date();
 var firstDay=new Date(year,month,1).getDay();
 var daysInMonth=new Date(year,month+1,0).getDate();
 var monthNames=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

 /* 이 달 예약 로드 */
 var startStr=year+'-'+(month+1).toString().padStart(2,'0')+'-01';
 var endStr=year+'-'+(month+1).toString().padStart(2,'0')+'-'+daysInMonth.toString().padStart(2,'0');

 _db.collection('filo_bookings').where('dealerId','==',did)
  .where('date','>=',startStr).where('date','<=',endStr)
  .get().then(function(snap){
   var bookingMap={};
   snap.forEach(function(doc){
    var d=doc.data();
    if(!bookingMap[d.date])bookingMap[d.date]=[];
    bookingMap[d.date].push(Object.assign({_id:doc.id},d));
   });

   /* 달력 렌더 */
   var html='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
    '<button onclick="window._calMonth--;if(window._calMonth<0){window._calMonth=11;window._calYear--;}_filoRenderCalendar(\''+did+'\')" style="padding:6px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);cursor:pointer">◀</button>'+
    '<div style="font-size:17px;font-weight:900">'+year+'년 '+monthNames[month]+'</div>'+
    '<button onclick="window._calMonth++;if(window._calMonth>11){window._calMonth=0;window._calYear++;}_filoRenderCalendar(\''+did+'\')" style="padding:6px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);cursor:pointer">▶</button>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px">'+
    ['일','월','화','수','목','금','토'].map(function(d,i){
     return '<div style="text-align:center;font-size:11px;font-weight:700;color:'+(i===0?'#ef4444':i===6?'#60a5fa':'var(--t3)')+';padding:4px">'+d+'</div>';
    }).join('')+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';

   /* 빈칸 */
   for(var i=0;i<firstDay;i++) html+='<div></div>';

   /* 날짜 */
   for(var day=1;day<=daysInMonth;day++){
    var dateStr=year+'-'+(month+1).toString().padStart(2,'0')+'-'+day.toString().padStart(2,'0');
    var isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day;
    var bookings=bookingMap[dateStr]||[];
    var dow=new Date(year,month,day).getDay();
    html+='<div onclick="_filoCalDayClick(\''+did+'\',\''+dateStr+'\')" style="'+
     'min-height:60px;padding:4px;border-radius:8px;cursor:pointer;border:1px solid '+(isToday?'var(--br)':'var(--bd)')+';'+
     'background:'+(isToday?'rgba(124,58,237,.1)':'var(--surface2)')+';transition:.15s" '+
     'onmouseover="this.style.borderColor=\'rgba(124,58,237,.4)\'" onmouseout="this.style.borderColor=\''+(isToday?'var(--br)':'var(--bd)')+'\'">'+
     '<div style="font-size:12px;font-weight:700;color:'+(isToday?'#a78bfa':dow===0?'#ef4444':dow===6?'#60a5fa':'var(--tx)')+'">'+day+'</div>'+
     bookings.slice(0,2).map(function(b){
      return '<div style="font-size:9px;background:rgba(124,58,237,.15);border-radius:4px;padding:1px 4px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#a78bfa">'+
       (b.time?b.time+' ':'')+esc(b.customerName||b.title||'예약')+'</div>';
     }).join('')+
     (bookings.length>2?'<div style="font-size:9px;color:var(--t3);margin-top:1px">+'+( bookings.length-2)+'개</div>':'')+
     '</div>';
   }
   html+='</div>';
   wrap.innerHTML=html;

   /* 오늘 예약 목록 */
   _filoRenderTodayReservations(did, today.toISOString().slice(0,10), bookingMap[today.toISOString().slice(0,10)]||[]);
  });
}

function _filoCalDayClick(did,dateStr){
 var d=new Date(dateStr);
 var label=(d.getMonth()+1)+'월 '+d.getDate()+'일';
 _filoReservationAdd(did,dateStr,label);
}

function _filoRenderTodayReservations(did,todayStr,bookings){
 var wrap=document.getElementById('reservation-list');
 if(!wrap)return;
 wrap.innerHTML='';

 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;margin-top:16px';
 hdr.innerHTML='<div style="font-size:13px;font-weight:800">오늘 예약 ('+bookings.length+'건)</div>';
 wrap.appendChild(hdr);

 if(!bookings.length){
  var empty=document.createElement('div');
  empty.className='card';
  empty.style.cssText='text-align:center;padding:24px;color:var(--t3)';
  empty.innerHTML='<div style="font-size:24px;margin-bottom:8px">📅</div><div>오늘 예약이 없습니다</div>';
  wrap.appendChild(empty);
  return;
 }

 bookings.sort(function(a,b){return (a.time||'').localeCompare(b.time||'');}).forEach(function(b){
  var card=document.createElement('div');
  card.className='list-item';
  var statusColor={confirmed:'#22c55e',pending:'#f59e0b',cancelled:'#ef4444'}[b.status||'confirmed']||'#22c55e';
  card.innerHTML='<div class="list-item-icon" style="background:rgba(124,58,237,.1)">'+
   (b.type==='beauty'?'💇':b.type==='fitness'?'💪':'📋')+'</div>'+
   '<div style="flex:1;min-width:0">'+
   '<div style="font-size:13px;font-weight:700">'+esc(b.customerName||'고객')+'</div>'+
   '<div style="font-size:11px;color:var(--t3)">'+(b.time||'')+' · '+(b.service||'예약')+' · '+(b.phone||'')+'</div>'+
   '</div>'+
   '<div style="text-align:right">'+
   '<span class="chip" style="background:'+statusColor+'18;color:'+statusColor+';border-color:'+statusColor+'40">'+(b.status==='confirmed'?'확정':b.status==='pending'?'대기':'취소')+'</span>'+
   '<div style="margin-top:4px;display:flex;gap:4px">'+
   '<button onclick="_filoReservationEdit(\''+b._id+'\',\''+did+'\')" style="padding:4px 8px;background:var(--surface2);border:1px solid var(--bd2);border-radius:6px;color:var(--t2);font-size:10px;cursor:pointer">수정</button>'+
   '<button onclick="_filoReservationDelete(\''+b._id+'\')" style="padding:4px 8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:6px;color:#ef4444;font-size:10px;cursor:pointer">삭제</button>'+
   '</div></div>';
  wrap.appendChild(card);
 });
}

function _filoReservationAdd(did,dateStr,dateLabel){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:440px;max-height:85vh;overflow-y:auto';

 var title=document.createElement('div');
 title.style.cssText='font-size:15px;font-weight:900;margin-bottom:16px';
 title.textContent='📋 예약 추가'+(dateLabel?' — '+dateLabel:'');
 box.appendChild(title);

 var fields=[
  {id:'rsv-name',l:'고객명 *',type:'text',ph:'홍길동'},
  {id:'rsv-phone',l:'연락처',type:'tel',ph:'010-0000-0000'},
  {id:'rsv-date',l:'날짜 *',type:'date',ph:'',val:dateStr||new Date().toISOString().slice(0,10)},
  {id:'rsv-time',l:'시간',type:'time',ph:'',val:'10:00'},
  {id:'rsv-service',l:'서비스/내용',type:'text',ph:'예: 커트, 컬러, 마사지...'},
  {id:'rsv-memo',l:'메모',type:'text',ph:'특이사항'},
 ];
 fields.forEach(function(f){
  var g=document.createElement('div');g.style.marginBottom='12px';
  var l=document.createElement('label');
  l.style.cssText='font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.6px';
  l.textContent=f.l;
  var inp=document.createElement('input');
  inp.id=f.id;inp.type=f.type;inp.placeholder=f.ph||'';
  if(f.val)inp.value=f.val;
  inp.style.cssText='width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none';
  g.appendChild(l);g.appendChild(inp);box.appendChild(g);
 });

 var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:8px;margin-top:4px';
 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);cursor:pointer';
 cancelBtn.textContent='취소';cancelBtn.onclick=function(){mo.remove();};
 var saveBtn=document.createElement('button');
 saveBtn.style.cssText='flex:2;padding:11px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-weight:700;cursor:pointer';
 saveBtn.textContent='✅ 예약 등록';
 saveBtn.onclick=function(){
  var name=(document.getElementById('rsv-name').value||'').trim();
  var date=(document.getElementById('rsv-date').value||'').trim();
  if(!name||!date){_filoToast('고객명과 날짜는 필수입니다');return;}
  _db.collection('filo_bookings').add({
   dealerId:did,customerName:name,
   phone:document.getElementById('rsv-phone').value||'',
   date:date,time:document.getElementById('rsv-time').value||'',
   service:document.getElementById('rsv-service').value||'',
   memo:document.getElementById('rsv-memo').value||'',
   status:'confirmed',type:window._filoIndustry||'cafe',
   createdAt:new Date().toISOString()
  }).then(function(){
   _filoToast('✅ 예약이 등록됐습니다!');
   mo.remove();
   _filoRenderCalendar(did);
  }).catch(function(e){_filoToast('❌ '+e.message);});
 };
 btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
 box.appendChild(btnRow);

 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
 setTimeout(function(){document.getElementById('rsv-name').focus();},100);
}

function _filoReservationDelete(id){
 if(!confirm('예약을 삭제하시겠습니까?'))return;
 var did=_CU.dealerId||_CU.uid;
 _db.collection('filo_bookings').doc(id).delete().then(function(){
  _filoToast('🗑 예약이 삭제됐습니다');
  _filoRenderCalendar(did);
 });
}

function _filoReservationEdit(id,did){
 _db.collection('filo_bookings').doc(id).get().then(function(snap){
  if(!snap.exists)return;
  var d=snap.data();
  _filoReservationAdd(did,d.date);
  /* TODO: 기존 데이터 채우기 */
 });
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

function _filoPageTableMgmt(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="slide-up" style="max-width:800px;margin:0 auto">';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:800px;margin:0 auto';

 /* 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
 hdr.innerHTML='<div><div class="page-title">🪑 테이블 관리</div><div class="page-sub">실시간 테이블 현황 및 설정</div></div>';
 var setupBtn=document.createElement('button');
 setupBtn.className='btn btn-primary btn-sm';
 setupBtn.textContent='+ 테이블 설정';
 setupBtn.onclick=function(){_filoTableSetup(did);};
 hdr.appendChild(setupBtn);
 wrap.appendChild(hdr);

 /* 실시간 현황 */
 var liveWrap=document.createElement('div');
 liveWrap.id='table-live';
 liveWrap.innerHTML='<div class="card"><div style="text-align:center;padding:20px;color:var(--t3)">⏳ 로딩 중...</div></div>';
 wrap.appendChild(liveWrap);

 el.innerHTML='';
 el.appendChild(wrap);
 _filoLoadTableMgmt(did);
}

var _tableMgmtUnsub=null;
function _filoLoadTableMgmt(did){
 if(_tableMgmtUnsub){_tableMgmtUnsub();_tableMgmtUnsub=null;}
 _tableMgmtUnsub=_db.collection('filo_tables')
  .where('dealerId','==',did)
  .onSnapshot(function(snap){
   var tables=[];
   snap.forEach(function(doc){tables.push(Object.assign({_id:doc.id},doc.data()));});
   tables.sort(function(a,b){return (a.tableId||0)-(b.tableId||0);});
   _filoRenderTableMgmt(did,tables);
  });
}

function _filoRenderTableMgmt(did,tables){
 var wrap=document.getElementById('table-live');
 if(!wrap)return;

 if(!tables.length){
  wrap.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">'+
  '<div style="font-size:32px;margin-bottom:8px">🪑</div>'+
  '<div style="font-size:14px;font-weight:700;color:var(--t2);margin-bottom:6px">테이블이 없습니다</div>'+
  '<div style="font-size:12px;margin-bottom:16px">테이블 설정 버튼을 눌러 테이블을 추가하세요</div>'+
  '</div>';
  return;
 }

 var empty=tables.filter(function(t){return t.status==='empty';}).length;
 var occupied=tables.filter(function(t){return t.status==='occupied';}).length;
 var reserved=tables.filter(function(t){return t.status==='reserved';}).length;

 var html='<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">'+
 [{label:'전체',val:tables.length+'개',c:'#a78bfa',cls:'kpi-revenue'},
  {label:'빈 테이블',val:empty+'개',c:'#22c55e',cls:'kpi-profit'},
  {label:'사용중',val:occupied+'개',c:'#ef4444',cls:'kpi-cost'},
  {label:'예약',val:reserved+'개',c:'#f59e0b',cls:'kpi-margin'}
 ].map(function(s){
  return '<div class="kpi-card '+s.cls+'">'+
  '<div class="kpi-label">'+s.label+'</div>'+
  '<div class="kpi-val" style="color:'+s.c+'">'+s.val+'</div></div>';
 }).join('')+'</div>';

 /* 테이블 맵 */
 html+='<div class="card"><div class="section-header"><h3>테이블 맵</h3>'+
 '<span style="font-size:10px;color:var(--t3)">클릭으로 상태 변경</span></div>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px">';

 var statusMap={
  empty:{label:'빈자리',color:'#22c55e',bg:'rgba(34,197,94,.1)',bd:'rgba(34,197,94,.25)',icon:'🟢'},
  occupied:{label:'사용중',color:'#ef4444',bg:'rgba(239,68,68,.1)',bd:'rgba(239,68,68,.25)',icon:'🔴'},
  reserved:{label:'예약',color:'#f59e0b',bg:'rgba(245,158,11,.1)',bd:'rgba(245,158,11,.25)',icon:'🟡'},
  cleaning:{label:'청소중',color:'#60a5fa',bg:'rgba(96,165,250,.1)',bd:'rgba(96,165,250,.25)',icon:'🔵'}
 };

 tables.forEach(function(t){
  var s=statusMap[t.status||'empty'];
  var since=t.since&&t.status==='occupied'?Math.floor((Date.now()-new Date(t.since))/60000)+'분':'';
  html+='<div onclick="_filoTableStatusChange(\''+did+'\',\''+t._id+'\',\''+t.status+'\')" '+
  'style="padding:14px 8px;text-align:center;border-radius:var(--r);cursor:pointer;transition:.2s;'+
  'background:'+s.bg+';border:2px solid '+s.bd+'">'+
  '<div style="font-size:20px">'+s.icon+'</div>'+
  '<div style="font-size:13px;font-weight:800;margin-top:4px">'+t.tableId+'번</div>'+
  '<div style="font-size:10px;color:'+s.color+';font-weight:700">'+s.label+'</div>'+
  (since?'<div style="font-size:9px;color:var(--t3)">'+since+'</div>':'')+
  '</div>';
 });
 html+='</div></div>';

 wrap.innerHTML=html;
 /* 오늘 예약 현황 실시간 */
 var today=new Date().toISOString().slice(0,10);
 _db.collection('filo_bookings').where('dealerId','==',did).where('date','==',today)
  .orderBy('time').get().then(function(snap){
   if(snap.empty)return;
   var rWrap=document.createElement('div');
   rWrap.className='card';rWrap.style.marginTop='14px';
   rWrap.innerHTML='<div class="sec-title" style="margin-bottom:12px">📅 오늘 예약 ('+snap.size+'건)</div>';
   snap.forEach(function(doc){
    var b=doc.data();
    var stMap={pending:'⏳ 대기',confirmed:'✅ 확정',cancelled:'❌ 취소'};
    var stColor={pending:'#f59e0b',confirmed:'#22c55e',cancelled:'#ef4444'};
    var st=stMap[b.status||'pending'];
    var sc=stColor[b.status||'pending'];
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface2);border-radius:var(--r);margin-bottom:8px;border:1px solid var(--bd2)';
    row.innerHTML='<div style="font-size:22px">🗓</div>'+
     '<div style="flex:1">'+
     '<div style="display:flex;justify-content:space-between;align-items:center">'+
     '<span style="font-size:13px;font-weight:700">'+(b.customerName||'고객')+'</span>'+
     '<span style="font-size:11px;font-weight:700;color:'+sc+'">'+st+'</span>'+
     '</div>'+
     '<div style="font-size:12px;color:var(--t2);margin-top:2px">'+
     (b.time||'')+
     (b.service?' · '+b.service:'')+
     (b.seats?' · '+b.seats+'인':'')+
     (b.memo?' · '+b.memo:'')+
     '</div></div>';
    var btnWrap=document.createElement('div');btnWrap.style.cssText='display:flex;gap:4px;flex-shrink:0';
    (function(bid,bdata){
     if(bdata.status!=='confirmed'){
      var cf=document.createElement('button');
      cf.style.cssText='padding:4px 8px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:6px;color:#22c55e;font-size:10px;cursor:pointer';
      cf.textContent='확정';
      cf.onclick=function(){
       _db.collection('filo_bookings').doc(bid).update({status:'confirmed'})
        .then(function(){_filoToast('✅ 확정됐습니다');_filoLoadTableMgmt(did);});
      };
      btnWrap.appendChild(cf);
     }
     if(bdata.status!=='cancelled'){
      var cx=document.createElement('button');
      cx.style.cssText='padding:4px 8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:6px;color:#ef4444;font-size:10px;cursor:pointer';
      cx.textContent='취소';
      cx.onclick=function(){
       if(!confirm('취소하시겠습니까?'))return;
       _db.collection('filo_bookings').doc(bid).update({status:'cancelled'})
        .then(function(){_filoToast('🗑 취소됐습니다');_filoLoadTableMgmt(did);});
      };
      btnWrap.appendChild(cx);
     }
    })(doc.id,b);
    row.appendChild(btnWrap);
    rWrap.appendChild(row);
   });
   var liveEl=document.getElementById('table-live');
   if(liveEl)liveEl.appendChild(rWrap);
  }).catch(function(){});
}

function _filoTableStatusChange(did,docId,currentStatus){
 var next={empty:'occupied',occupied:'cleaning',cleaning:'empty',reserved:'empty'};
 var nextStatus=next[currentStatus]||'empty';
 var update={status:nextStatus,updatedAt:new Date().toISOString()};
 if(nextStatus==='occupied')update.since=new Date().toISOString();
 else if(nextStatus==='empty')update.since=null;
 _db.collection('filo_tables').doc(docId).update(update).then(function(){
  _filoToast('✅ 상태 변경: '+nextStatus);
 });
}

function _filoTableSetup(did){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:24px;width:100%;max-width:420px';

 var title=document.createElement('div');
 title.style.cssText='font-size:16px;font-weight:900;margin-bottom:16px';
 title.textContent='🪑 테이블 설정';
 box.appendChild(title);

 var g1=document.createElement('div');g1.className='input-group';
 var l1=document.createElement('label');l1.textContent='테이블 수 (최대 50개)';
 var inp1=document.createElement('input');inp1.id='ts-count';inp1.type='number';
 inp1.value='10';inp1.min='1';inp1.max='50';
 inp1.style.cssText='width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none';
 g1.appendChild(l1);g1.appendChild(inp1);box.appendChild(g1);

 var g2=document.createElement('div');g2.className='input-group';
 var l2=document.createElement('label');l2.textContent='테이블당 좌석 수';
 var inp2=document.createElement('input');inp2.id='ts-seats';inp2.type='number';
 inp2.value='4';inp2.min='1';inp2.max='20';
 inp2.style.cssText=inp1.style.cssText;
 g2.appendChild(l2);g2.appendChild(inp2);box.appendChild(g2);

 var note=document.createElement('div');
 note.style.cssText='font-size:11px;color:var(--t3);margin-bottom:16px;padding:8px 12px;background:rgba(245,158,11,.08);border-radius:8px;border:1px solid rgba(245,158,11,.15)';
 note.textContent='⚠️ 기존 테이블 데이터를 초기화하고 새로 생성합니다';
 box.appendChild(note);

 var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:8px';
 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);cursor:pointer';
 cancelBtn.textContent='취소';cancelBtn.onclick=function(){mo.remove();};
 var saveBtn=document.createElement('button');
 saveBtn.style.cssText='flex:2;padding:11px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-weight:700;cursor:pointer';
 saveBtn.textContent='✅ 생성';
 saveBtn.onclick=function(){
  var cnt=parseInt(document.getElementById('ts-count').value)||10;
  var seats=parseInt(document.getElementById('ts-seats').value)||4;
  _filoCreateTables(did,cnt,seats);
  mo.remove();
 };
 btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
 box.appendChild(btnRow);

 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

function _filoCreateTables(did,count,seats){
 /* 기존 삭제 후 재생성 */
 _filoToast('⏳ 테이블 생성 중...');
 _db.collection('filo_tables').where('dealerId','==',did).get().then(function(snap){
  var deletes=snap.docs.map(function(doc){return doc.ref.delete();});
  return Promise.all(deletes);
 }).then(function(){
  var creates=[];
  for(var i=1;i<=count;i++){
   creates.push(_db.collection('filo_tables').add({
    dealerId:did,tableId:i,seats:seats,
    status:'empty',since:null,
    createdAt:new Date().toISOString()
   }));
  }
  return Promise.all(creates);
 }).then(function(){
  _filoToast('✅ 테이블 '+count+'개 생성 완료!');
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

/* ══════════════════════════════════════
   🛵 배달 주문 관리 페이지
   배민/쿠팡이츠/요기요 주문 수동 접수
   ══════════════════════════════════════ */
function _filoAddCategory(did){
 var inp=document.getElementById('new-cat-inp');
 var cat=(inp.value||'').trim();
 if(!cat){_filoToast('카테고리명을 입력하세요');return;}
 inp.value='';
 _filoToast('✅ 카테고리 추가됐습니다');
 _filoLoadMenuMgmt(did);
}

function _filoDeleteCategory(did,cat){
 if(!confirm('['+cat+'] 카테고리의 메뉴를 모두 삭제하시겠습니까?'))return;
 _db.collection('filo_menus').where('dealerId','==',did).where('category','==',cat).get().then(function(snap){
  var batch=_db.batch();
  snap.forEach(function(doc){batch.delete(doc.ref);});
  return batch.commit();
 }).then(function(){
  _filoToast('🗑 ['+cat+'] 카테고리 삭제됐습니다');
  _filoPageMenuMgmt(document.getElementById('content'));
 });
}

function _filoMarginLoadRange(from,to){
 if(!from){var f=document.getElementById('sf-from');var t2=document.getElementById('sf-to');if(f)from=f.value;if(t2)to=t2.value;}
 if(!from||!to){_filoToast('날짜를 선택하세요');return;}
 var did=_CU.dealerId||_CU.uid||(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did)return;
 var heroSub=document.getElementById('hero-sub');
 if(heroSub)heroSub.textContent=from+' ~ '+to+' 조회 중...';
 _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get().then(function(snap){
  var total=0,cnt=0,items={},methods={};
  snap.forEach(function(doc){
   var d=doc.data();
   if(d.status==='cancelled')return;
   total+=d.total||0;cnt++;
   var method=d.payMethod||d.method||'기타';
   methods[method]=(methods[method]||0)+(d.total||0);
   (d.items||[]).forEach(function(it){items[it.name]=(items[it.name]||0)+(it.qty||1);});
  });
  var paySorted=Object.entries(methods).sort(function(a,b){return b[1]-a[1];});
  if(heroSub)heroSub.textContent=from+(from!==to?' ~ '+to:'')+'·'+cnt+'건·₩'+total.toLocaleString();
  ['today-sales','month-sales'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent='₩'+total.toLocaleString();});
  ['today-cnt','month-cnt'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=cnt+'건';});

  /* 결제수단별 집계 표시 */
  var payEl=document.getElementById('pay-method-breakdown');
  if(payEl){
   var methodIcons={'카드':'💳','현금':'💵','카카오페이':'🟡','네이버페이':'🟢','카운터결제':'🏪','삼성페이':'📱','기타':'💰'};
   var sorted=Object.entries(methods).sort(function(a,b){return b[1]-a[1];});
   payEl.innerHTML=sorted.length?sorted.map(function(m){
    var pct=total>0?Math.round(m[1]/total*100):0;
    var ic=methodIcons[m[0]]||'💰';
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)">'+
     '<span style="font-size:16px">'+ic+'</span>'+
     '<div style="flex:1">'+
     '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
     '<span style="font-size:13px;font-weight:700">'+m[0]+'</span>'+
     '<span style="font-size:13px;font-weight:900;color:#22c55e">₩'+m[1].toLocaleString()+'</span>'+
     '</div>'+
     '<div style="height:4px;background:var(--surface3);border-radius:2px;overflow:hidden">'+
     '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--br),#22c55e);border-radius:2px;transition:width .5s"></div>'+
     '</div>'+
     '<div style="font-size:10px;color:var(--t3);margin-top:2px">'+pct+'% · 비중</div>'+
     '</div></div>';
   }).join(''):'<div style="text-align:center;padding:20px;color:var(--t3)">데이터 없음</div>';
  }

  /* 인기메뉴 */
  var topEl=document.getElementById('top-menus');
  if(topEl){
   var sorted2=Object.entries(items).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
   topEl.innerHTML=sorted2.length?sorted2.map(function(e,i){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd)">'+
     '<span style="font-size:13px"><span style="color:var(--br);font-weight:800;margin-right:6px">'+(i+1)+'위</span>'+e[0]+'</span>'+
     '<span style="font-size:13px;font-weight:700">'+e[1]+'개</span></div>';
   }).join(''):'<div style="text-align:center;padding:20px;color:var(--t3)">판매 데이터 없음</div>';
  }
 /* 차트 렌더링 */
  var liveEl=document.getElementById('sales-chart-extra');if(!liveEl){liveEl=document.createElement('div');liveEl.id='sales-chart-extra';var mainEl2=document.getElementById('content');if(mainEl2)mainEl2.appendChild(liveEl);}liveEl.innerHTML='';
  if(liveEl){
   /* 시간대별 집계 */
   var hourStats2={};
   snap.forEach(function(doc){
    var d2=doc.data();
    if(d2.status==='cancelled')return;
    var h=d2.createdAt?(new Date(d2.createdAt).getHours()):(new Date().getHours());
    hourStats2[h]=(hourStats2[h]||0)+(d2.total||0);
   });
   var hourEntries2=Object.keys(hourStats2).sort(function(a,b){return a-b;}).map(function(h){return [h,hourStats2[h]];});

   var chartHtml='';
   if(hourEntries2.length){
    chartHtml+='<div style="margin-top:14px"><div class="sec-title" style="margin-bottom:10px">⏰ 시간대별 매출</div>'+
     '<div style="position:relative;height:160px"><canvas id="hour-chart-canvas"></canvas></div></div>';
   }
   if(paySorted&&paySorted.length){
    chartHtml+='<div style="margin-top:14px"><div class="sec-title" style="margin-bottom:10px">💳 결제수단 비중</div>'+
     '<div style="position:relative;height:160px"><canvas id="pay-donut-canvas"></canvas></div></div>';
   }
   if(Object.keys(items).length){
    var menuEntries2=Object.entries(items).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    chartHtml+='<div style="margin-top:14px"><div class="sec-title" style="margin-bottom:10px">🏆 인기 메뉴 TOP5</div>'+
     menuEntries2.map(function(kv,i){
      var rank=['🥇','🥈','🥉','4️⃣','5️⃣'][i];
      var pct=total>0?Math.round(kv[1]/total*100):0;
      return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)">'+
       '<span style="font-size:15px">'+rank+'</span>'+
       '<div style="flex:1"><div style="display:flex;justify-content:space-between">'+
       '<span style="font-size:12px;font-weight:700">'+kv[0]+'</span>'+
       '<span style="font-size:12px;font-weight:900;color:#22c55e">'+kv[1]+'개</span>'+
       '</div>'+
       '<div style="height:3px;background:var(--surface3);border-radius:2px;margin-top:4px">'+
       '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#7c3aed,#22c55e);border-radius:2px"></div>'+
       '</div></div></div>';
     }).join('')+'</div>';
   }

   if(chartHtml) liveEl.innerHTML=(liveEl.innerHTML||'')+chartHtml;

   setTimeout(function(){
    /* 시간대 바차트 */
    var hc=document.getElementById('hour-chart-canvas');
    if(hc&&window.Chart&&hourEntries2.length){
     if(hc._chart)hc._chart.destroy();
     var maxVal=Math.max.apply(null,hourEntries2.map(function(h){return h[1];}));
     hc._chart=new Chart(hc,{type:'bar',
      data:{labels:hourEntries2.map(function(h){return h[0]+'시';}),
       datasets:[{label:'매출',data:hourEntries2.map(function(h){return h[1];}),
        backgroundColor:hourEntries2.map(function(h){return h[1]===maxVal?'rgba(167,139,250,.9)':'rgba(124,58,237,.5)';}),
        borderColor:'rgba(124,58,237,.8)',borderWidth:1,borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,
       animation:{duration:800,easing:'easeOutQuart'},
       plugins:{legend:{display:false},
        tooltip:{callbacks:{label:function(ctx){return String.fromCharCode(8361)+ctx.raw.toLocaleString();}}}},
       scales:{x:{grid:{display:false},ticks:{color:'#9898c0',font:{size:11}}},
        y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#9898c0',font:{size:10},
         callback:function(v){return v>=1000?(v/1000).toFixed(0)+'k':v;}}}}}});
    }
    /* 결제수단 금액 카드 */
    var payCanvas=document.getElementById('pay-donut-canvas');
    if(payCanvas&&paySorted&&paySorted.length){
     var payColors={'카드':'#60a5fa','현금':'#22c55e','카카오페이':'#f59e0b','네이버페이':'#10b981','카운터결제':'#a78bfa','기타':'#9898c0'};
     var payParent=payCanvas.parentElement;
     if(payParent){
      payParent.style.height='auto';
      var payHtmlStr='<div style="display:flex;flex-direction:column;gap:8px">';
      paySorted.forEach(function(p){
       var ic={'카드':'💳','현금':'💵','카카오페이':'🟡','네이버페이':'🟢','카운터결제':'🏪'}[p[0]]||'💰';
       var col=payColors[p[0]]||'#9898c0';
       var pct=total>0?Math.round(p[1]/total*100):0;
       payHtmlStr+='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface2);border-radius:12px;border:1px solid var(--bd2)">'+
        '<span style="font-size:18px">'+ic+'</span>'+
        '<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:5px">'+
        '<span style="font-size:13px;font-weight:700">'+p[0]+'</span>'+
        '<span style="font-size:16px;font-weight:900;color:'+col+'">'+String.fromCharCode(8361)+p[1].toLocaleString()+'</span>'+
        '</div><div style="height:4px;background:var(--surface3);border-radius:2px;overflow:hidden">'+
        '<div class="pay-bar" data-pct="'+pct+'" style="height:100%;width:0%;background:'+col+';border-radius:2px;transition:width .8s ease"></div>'+
        '</div><span style="font-size:10px;color:var(--t3)">'+pct+'% 비중</span></div></div>';
      });
      payHtmlStr+='</div>';
      payParent.innerHTML=payHtmlStr;
      setTimeout(function(){
       payParent.querySelectorAll('.pay-bar').forEach(function(b){b.style.width=b.dataset.pct+'%';});
      },50);
     }
    }
   },150);
  }
 }).catch(function(e){if(heroSub)heroSub.textContent='오류: '+e.message;});
}

var _toTable=null,_toCart={};

function _toLoadTables(did){
 _db.collection('filo_tables').where('dealerId','==',did).orderBy('tableId').get().then(function(snap){
  var grid=document.getElementById('to-table-grid');if(!grid)return;
  if(snap.empty){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:12px;color:var(--t3);font-size:11px">테이블 없음<br>테이블 관리에서 추가</div>';return;}
  grid.innerHTML='';
  snap.forEach(function(doc){
   var t=doc.data();
   var sc={empty:'#22c55e',occupied:'#ef4444',reserved:'#f59e0b',cleaning:'#60a5fa'}[t.status||'empty']||'#22c55e';
   var btn=document.createElement('button');
   btn.id='to-tbtn-'+t.tableId;
   btn.style.cssText='padding:10px 4px;border-radius:10px;border:2px solid var(--bd2);background:var(--surface2);color:var(--tx);cursor:pointer;text-align:center;transition:.2s;font-size:11px;width:100%';
   btn.innerHTML='<div style="font-size:16px">🪑</div><div style="font-weight:800">'+t.tableId+'번</div>'+
    (t.seats?'<div style="font-size:9px;color:var(--t3)">'+t.seats+'인</div>':'')+
    '<div style="font-size:9px;font-weight:700;color:'+sc+'">●</div>';
   (function(tb){btn.onclick=function(){_toSelectTable(tb);};})(t);
   grid.appendChild(btn);
  });
 });
}

function _toSelectTable(t){
 _toTable=t;
 document.querySelectorAll('[id^="to-tbtn-"]').forEach(function(b){
  b.style.background='var(--surface2)';b.style.borderColor='var(--bd2)';
 });
 var sel=document.getElementById('to-tbtn-'+t.tableId);
 if(sel){sel.style.background='rgba(124,58,237,.2)';sel.style.borderColor='var(--br)';}
 _filoToast('🪑 '+t.tableId+'번 테이블 선택됨'+(t.seats?' ('+t.seats+'인석)':''));
}

function _toAddItem(id,name,price){
 if(!_toCart[id])_toCart[id]={name:name,price:price,qty:0};
 _toCart[id].qty++;_toUpdateCart();_toShowMenuGrid(window._toAllMenus||[]);
}
function _toDecItem(id){
 if(!_toCart[id])return;
 _toCart[id].qty--;if(_toCart[id].qty<=0)delete _toCart[id];
 _toUpdateCart();_toShowMenuGrid(window._toAllMenus||[]);
}
