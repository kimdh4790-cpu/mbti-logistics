/**
 * @module      filo-common.js
 * ══════════════════════════════════════════════════════
 * 역할: 공통 초기화 · Firebase · 네비게이션 · 유틸
 *
 * 전역: _CU, _db, _storage, _cachedCompanyDoc, _cartItems
 * 의존: filo-auth.js (먼저 로드)
 * ⚠️ 2026-07-15 리팩토링:
 *   _filoRmAddRow / _filoRmAddRowDOM → filo-menu.js 로 이동
 * ══════════════════════════════════════════════════════
 */
// 의존성: Firebase SDK
// 전역변수: _CU, _db, _storage, _cachedCompanyDoc, _cartItems
// 관련 컬렉션: filo_sales, filo_menus, members, attendance
// ⚠️ 2026-07-12 리팩토링:
//   테이블 관련 8개 함수 → filo-table.js로 이동/제거 (중복 제거)
//   _filoPageTableMgmt/_filoLoadTableMgmt/_filoRenderTableMgmt
//   _filoTableStatusChange/_filoTableSetup/_filoCreateTables
//   _toLoadTables/_toSelectTable
/* ══════════════════════════════════════════
   🍽 레시피 관리 페이지
   재료 + 사용량 + 단위 등록
   입고단가 자동 환산으로 원가 계산
   ══════════════════════════════════════════ */

/* 호환용 - 기존 _filoRmAddRow 호출 대응 */

/* ══════════════════════════════════════════
   🎨 업종별 커스텀 테마 (filo-test.md 명세)
   companies/{did} 의 theme / primaryColor / bgColor 로 결정된다.
   - theme        : 아래 _FILO_THEMES 의 키 (업종)
   - primaryColor : 있으면 업종 기본색을 덮어씀 (고객 직접 입력)
   - bgColor      : 있으면 업종 기본 배경을 덮어씀
   명세 변수(--primary/--bg/--card/--accent)와 기존 앱이 실제로 쓰는
   변수(--br/--surface 계열)를 함께 세팅해야 화면이 바뀐다.
   ══════════════════════════════════════════ */
var _FILO_THEMES = {
 cafe:     { label:'카페/베이커리',   emoji:'☕', primary:'#c8a96e', bg:'#1a1209' },
 korean:   { label:'한식당',          emoji:'🍚', primary:'#e05555', bg:'#0f0a0a' },
 japanese: { label:'일식/횟집',       emoji:'🍣', primary:'#3b82f6', bg:'#0a0f1e' },
 chinese:  { label:'중식당',          emoji:'🥢', primary:'#f59e0b', bg:'#1a0a0a' },
 fastfood: { label:'패스트푸드/분식', emoji:'🍢', primary:'#f97316', bg:'#f8f9fa' },
 izakaya:  { label:'이자카야/술집',   emoji:'🍶', primary:'#d4af37', bg:'#0a0a0a' },
 other:    { label:'기타',            emoji:'🏪', primary:'#7c3aed', bg:'#07071a' }
};

function _filoHexToRgb(hex){
 var h=String(hex||'').trim().replace('#','');
 if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
 var n=parseInt(h,16);
 if(!isFinite(n)||h.length!==6) return null;
 return {r:(n>>16)&255, g:(n>>8)&255, b:n&255};
}
function _filoRgbStr(hex,fallback){
 var c=_filoHexToRgb(hex);
 return c?(c.r+','+c.g+','+c.b):(fallback||'124,58,237');
}
/* amt>0 밝게, amt<0 어둡게 */
function _filoShade(hex,amt){
 var c=_filoHexToRgb(hex); if(!c) return hex;
 function f(v){ return Math.max(0,Math.min(255, Math.round(v + (amt>0?(255-v):v)*amt))); }
 function hx(v){ var s=v.toString(16); return s.length<2?'0'+s:s; }
 return '#'+hx(f(c.r))+hx(f(c.g))+hx(f(c.b));
}
/* 배경이 밝은 테마(패스트푸드 #f8f9fa)면 글자색을 어둡게 뒤집어야 읽힌다 */
function _filoIsLight(hex){
 var c=_filoHexToRgb(hex); if(!c) return false;
 return (0.299*c.r + 0.587*c.g + 0.114*c.b) > 160;
}

/**
 * 매장 테마 적용.
 * @param {object} co companies 문서 (또는 {theme,primaryColor,bgColor})
 */
function _filoApplyTheme(co){
 co = co || {};
 var key = String(co.theme||'').trim();
 var base = _FILO_THEMES[key] || _FILO_THEMES.other;
 var primary = (co.primaryColor && _filoHexToRgb(co.primaryColor)) ? co.primaryColor : base.primary;
 var bg      = (co.bgColor      && _filoHexToRgb(co.bgColor))      ? co.bgColor      : base.bg;
 var light   = _filoIsLight(bg);
 var card    = light ? _filoShade(bg,-0.04) : _filoShade(bg, 0.06);
 var accent  = _filoShade(primary, 0.25);

 var r = (typeof document!=='undefined') ? document.documentElement : null;
 if(!r || !r.style) return {primary:primary,bg:bg,card:card,accent:accent};
 var S = function(k,v){ r.style.setProperty(k,v); };

 /* 명세 변수 */
 S('--primary',primary); S('--bg',bg); S('--card',card); S('--accent',accent);
 /* 기존 앱 변수 매핑 */
 S('--br',primary);
 S('--br-l',  _filoShade(primary, 0.18));
 S('--br-ll', _filoShade(primary, 0.40));
 S('--br-d',  _filoShade(primary,-0.30));
 S('--br-glow','rgba('+_filoRgbStr(primary)+',.45)');
 S('--br-glow2','rgba('+_filoRgbStr(primary)+',.2)');
 S('--br2',accent);
 S('--br2-l',_filoShade(accent,0.2));
 S('--br2-glow','rgba('+_filoRgbStr(accent)+',.35)');
 S('--brand',primary); S('--brand2',accent);
 S('--bg2', light?_filoShade(bg,-0.02):_filoShade(bg,0.03));
 S('--bg3', light?_filoShade(bg,-0.06):_filoShade(bg,0.08));
 S('--surface',  card);
 S('--surface2', light?_filoShade(bg,-0.08):_filoShade(bg,0.11));
 S('--surface3', light?_filoShade(bg,-0.12):_filoShade(bg,0.16));
 S('--surface4', light?_filoShade(bg,-0.16):_filoShade(bg,0.22));
 /* 밝은 배경이면 글자색 반전 */
 if(light){
  S('--tx','#14141f'); S('--t2','#4b5563'); S('--t3','#6b7280'); S('--t4','#9ca3af');
  S('--bd','rgba(0,0,0,.12)'); S('--bd2','rgba(0,0,0,.18)');
 } else {
  S('--tx','#f0f0ff'); S('--t2','#9898c0'); S('--t3','#565678'); S('--t4','#323250');
  S('--bd','rgba(255,255,255,.08)'); S('--bd2','rgba(255,255,255,.14)');
 }
 var meta=document.querySelector('meta[name="theme-color"]');
 if(meta) meta.setAttribute('content', primary);
 r.setAttribute('data-theme-industry', key||'other');
 r.setAttribute('data-theme-light', light?'1':'0');
 window._filoTheme = {theme:key||'other', primary:primary, bg:bg, card:card, accent:accent, light:light};
 return window._filoTheme;
}

/** 고객 페이지(order/store/kitchen)에서 dealerId로 테마를 읽어 적용 */
function _filoLoadStoreTheme(db, dealerId){
 if(!db || !dealerId) return Promise.resolve(null);
 return db.collection('companies').doc(dealerId).get().then(function(d){
  var co = d.exists ? d.data() : {};
  return _filoApplyTheme(co);
 }).catch(function(){ return null; });
}

function _filoStartDynamicQR(did){
 if(_dynamicQRTimer)clearInterval(_dynamicQRTimer);
 _filoGenDynamicQR(did);
 var countdown=30;
 _dynamicQRTimer=setInterval(function(){
  countdown--;
  ['qr-checkin-timer','qr-checkout-timer','qr-break-timer'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=countdown+'초 후 자동 갱신';});
  if(countdown<=0){
   countdown=30;
   _filoGenDynamicQR(did);
  }
 },1000);
}

function _filoGenDynamicQR(did){
 var ts=Math.floor(Date.now()/30000);
 var inUrl='https://filo.ai.kr/qr?did='+did+'&action=in&t='+ts;
 var outUrl='https://filo.ai.kr/qr?did='+did+'&action=out&t='+ts;
 var bsUrl='https://filo.ai.kr/qr?did='+did+'&action=break_start&t='+ts;
 var beUrl='https://filo.ai.kr/qr?did='+did+'&action=break_end&t='+ts;
 function qrImg(url,size){return '<img src="https://api.qrserver.com/v1/create-qr-code/?size='+size+'x'+size+'&data='+encodeURIComponent(url)+'" style="width:'+size+'px;height:'+size+'px;border-radius:6px">';}
 var inEl=document.getElementById('qr-checkin');
 var outEl=document.getElementById('qr-checkout');
 var bsEl=document.getElementById('qr-break-start');
 var beEl=document.getElementById('qr-break-end');
 if(inEl)inEl.innerHTML=qrImg(inUrl,160);
 if(outEl)outEl.innerHTML=qrImg(outUrl,160);
 if(bsEl)bsEl.innerHTML=qrImg(bsUrl,130);
 if(beEl)beEl.innerHTML=qrImg(beUrl,130);
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
// ── 날짜 유틸 ─────────────────────────────────────────────────────────────────
// 사용법:
//   _today()         → '2026-07-16' (오늘 날짜 YYYY-MM-DD)
//   _nowISO()        → '2026-07-16T05:30:00.000Z' (현재 ISO 문자열)
//   _toDateStr(iso)  → '2026-07-16' (ISO 문자열 → YYYY-MM-DD)
//   _monthStr()      → '2026-07' (이번 달 YYYY-MM)
function _today(){return new Date().toISOString().slice(0,10);}
function _nowISO(){return new Date().toISOString();}
function _toDateStr(iso){return iso?iso.slice(0,10):'';}
function _monthStr(){return new Date().toISOString().slice(0,7);}
