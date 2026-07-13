/*
 * filo-common.js — FILO 공통 유틸/QR/재고입출
 *
 * ⚠️ 리팩토링 완료 (2026-07-13) — 모듈 분리:
 * - filo-auth.js       로그인, 회원가입, Firebase 초기화
 * - filo-margin.js     마진분석, AI인사이트, 대시보드
 * - filo-members.js    회원관리, 출퇴근, 재고이력
 * - filo-payroll2.js   급여, 명세서
 * - filo-payment.js    결제, 분할결제, QR
 * - filo-schedule.js   스케줄, 예약, 캘린더
 * - filo-settings.js   설정, 구독, 세금공유, 공지, 카테고리
 *
 * filo.html에서 위 파일들 모두 로드 필요
 */
// filo-common.js - 공통 초기화, Firebase, 네비게이션, 유틸, POS 카트 결제
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