/*
 * order.js — FILO 테이블 QR 고객 주문 모듈
   *
   * 2026-07-21 추가:
   *   _loadBakeryCart()     — 빵 진열대 QR 스캔 카트 자동 로드
   *   _toggleDark()         — 다크모드 토글 (localStorage 저장)
   *   _setView(mode)        — 카드형/목록형 뷰 전환
   *   _checkOpenStatus()    — 영업 중 배지 표시
   *
   * 빵 진열대 QR 흐름:
   *   손님 명판 QR 스캔 → add.html → localStorage 저장
   *   → 테이블 QR 스캔 → order.js 로딩 시 자동 카트 추가
 * Copyright (c) 2024-2026 유한회사 엠비티아이
 *
 * ── 주요 함수 ─────────────────────────────────────────────────
 *   _showFCMGate()    — 알림 허용 팝업 (localStorage 토큰 있으면 스킵)
 *   _initFCM()        — FCM 토큰 발급 → localStorage + filo_orders 저장
 *   _doOrder(payType) — 주문 Firestore 저장 (fcmToken 포함)
 *   _listenPickup(id) — 픽업 알림 실시간 감지 (onSnapshot)
 *   _changeTable()    — 테이블 번호 변경 (filo_orders 업데이트)
 *   reqReceiptFCM()   — 영수증 알림 받기 버튼 (토큰 발급 + FCM 발송)
 *
 * ── Firestore 저장 ────────────────────────────────────────────
 *   filo_orders ← 주문 저장
 *     { dealerId, type:'table', status:'pending', payType,
 *       tableNum, tableName, items, total, fcmToken,
 *       createdAt, date }
 *   filo_orders ← fcmToken 업데이트 (_initFCM 토큰 발급 후)
 *   filo_orders ← tableNum/tableName 업데이트 (_changeTable)
 *
 * ── 읽는 컬렉션 ──────────────────────────────────────────────
 *   filo_orders ← status 감지 (onSnapshot) → 픽업/결제 완료 감지
 *   filo_tables ← (filo-order-common.js에서 메뉴 로드)
 *   filo_menus  ← 메뉴 목록
 *
 * ── localStorage ──────────────────────────────────────────────
 *   filo_fcm_{dealerId}   ← FCM 토큰 캐시
 *   filo_order_{dealerId} ← 현재 주문 ID (QR 재스캔 이동용)
 *   filo_lang             ← 선택 언어 (ko/en/zh/ja)
 *
 * ── FCM 토큰 흐름 ─────────────────────────────────────────────
 *   _initFCM() → getToken(vapidKey:_VAPID_KEY, SW등록)
 *   → 성공: localStorage 저장 + filo_orders.fcmToken 업데이트
 *   → 이 토큰을 직원이 준비완료/결제 시 꺼내서 FCM 발송
 *   ⚠️ 비동기 타이밍: 주문보다 늦게 발급될 수 있음
 *      → _initFCM 성공 시 _lastOrderId 있으면 즉시 업데이트로 해결
 *
 * ── 상수 ──────────────────────────────────────────────────────
 *   _VAPID_KEY : FCM 웹 푸시 인증서 (Firebase Console → 클라우드 메시징)
 *   _did       : dealerId (URL ?d= 파라미터)
 *   _tNum      : 테이블 번호 (URL ?t= 파라미터)
 *   _fcmToken  : 발급된 FCM 토큰
 *   _lastOrderId: 현재 주문 Firestore 문서 ID
 *
 * ── 의존 ─────────────────────────────────────────────────────
 *   filo-order-common.js — _renderMenuGrid, _openMdl, _closeMdl,
 *                          _tlQty, _updFab, _openCart, _loadMenus
 *   firebase-messaging-sw.js — 백그라운드 FCM 수신
 *
 * ── 마지막 수정: 2026-07-14 ──────────────────────────────────
 */
var _did='', _tNum='', _tName='', _storeName='매장', _takeout=false;
var _cart={}; // _menus/_lang/_tlCache/_curMdlMenu/_tlQtyVal 는 filo-order-common.js 공유
var _db=null, _orderListener=null;
var _fcmToken=null, _messaging=null;
var _lastOrderItems=[], _lastOrderTotal=0, _lastPayType='';

/* ── 매장 업종 테마 적용 ──────────────────────────────────────────────────── */
function _applyStoreTheme(co){
 var THEMES={
  cafe:{primary:'#c8a96e',bg:'#1a1209'},korean:{primary:'#e05555',bg:'#0f0a0a'},
  japanese:{primary:'#3b82f6',bg:'#0a0f1e'},chinese:{primary:'#f59e0b',bg:'#1a0a0a'},
  fastfood:{primary:'#f97316',bg:'#f8f9fa'},izakaya:{primary:'#d4af37',bg:'#0a0a0a'},
  other:{primary:'#c9a84c',bg:'#07071a'}
 };
 var base=THEMES[co.theme||'']||THEMES.other;
 var primary=co.primaryColor||base.primary;
 var bg=co.bgColor||base.bg;
 if(!co.theme&&!co.primaryColor&&!co.bgColor)return;
 function _hx(hex){var h=String(hex||'').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var n=parseInt(h,16);return isFinite(n)&&h.length===6?{r:(n>>16)&255,g:(n>>8)&255,b:n&255}:null;}
 function _sh(hex,a){var c=_hx(hex);if(!c)return hex;function f(v){return Math.max(0,Math.min(255,Math.round(v+(a>0?(255-v):v)*a)));}function hh(v){var s=v.toString(16);return s.length<2?'0'+s:s;}return '#'+hh(f(c.r))+hh(f(c.g))+hh(f(c.b));}
 function _il(hex){var c=_hx(hex);return c?(0.299*c.r+0.587*c.g+0.114*c.b)>160:false;}
 function _rgb(hex){var c=_hx(hex);return c?c.r+','+c.g+','+c.b:'124,58,237';}
 var light=_il(bg);
 var S=function(k,v){document.documentElement.style.setProperty(k,v);};
 S('--brand',primary);
 S('--brand2',_sh(primary,-0.15));
 S('--brand3',_sh(primary,-0.30));
 S('--brand-light','rgba('+_rgb(primary)+',.12)');
 S('--brand-glow','rgba('+_rgb(primary)+',.30)');
 S('--bg',bg);
 S('--surface',light?_sh(bg,-0.04):_sh(bg,0.06));
 S('--surface2',light?_sh(bg,-0.08):_sh(bg,0.11));
 S('--surface3',light?_sh(bg,-0.12):_sh(bg,0.16));
 S('--border',light?'rgba(0,0,0,.08)':'rgba(255,255,255,.08)');
 S('--border2',light?'rgba(0,0,0,.13)':'rgba(255,255,255,.13)');
 S('--text1',light?'#14141f':'#f0f0ff');
 S('--text2',light?'#4b5563':'#9898c0');
 S('--text3',light?'#6b7280':'#565678');
 S('--shadow','0 1px 8px rgba('+_rgb(primary)+',.18)');
 S('--shadow-md','0 4px 20px rgba('+_rgb(primary)+',.22)');
 S('--shadow-lg','0 8px 40px rgba('+_rgb(primary)+',.30)');
 var ld=document.getElementById('ld');
 if(ld)ld.style.background='linear-gradient(135deg,'+primary+' 0%,'+_sh(primary,-0.2)+' 100%)';
 if(!light)document.body.classList.add('dark');
 else document.body.classList.remove('dark');
}

// ── 완료 화면 단계 전환 ───────────────────────────────────────────────────────
var _doneStepTimer=null;
function _doneStep(n){
 if(_doneStepTimer){clearTimeout(_doneStepTimer);_doneStepTimer=null;}
 [1,2,3].forEach(function(i){
  var el=document.getElementById('done-s'+i);
  if(el){el.classList.remove('ds-in');el.style.display='none';}
 });
 var step=document.getElementById('done-s'+n);
 if(!step)return;
 step.style.display='flex';
 void step.offsetWidth;
 step.classList.add('ds-in');
 if(n===2){
  var rc=document.getElementById('receipt-choice');
  var rb=document.getElementById('order-receipt-box');
  var ns=document.getElementById('done-s2-next');
  if(rc)rc.style.display='block';
  if(rb)rb.style.display='none';
  if(ns)ns.style.display='none';
 }
 if(n===1){
  var _skip=function(){
   step.removeEventListener('click',_skip);
   if(_doneStepTimer){clearTimeout(_doneStepTimer);_doneStepTimer=null;}
   _doneStep(2);
  };
  step.addEventListener('click',_skip);
  _doneStepTimer=setTimeout(function(){
   step.removeEventListener('click',_skip);
   _doneStep(2);
  },1500);
 }
}

// ── 주문 영수증 표시 ──────────────────────────────────────────────────────────
function _showOrderReceipt(items, total, payType, method){
 var rc=items||_lastOrderItems, rt=total||_lastOrderTotal, rp=payType||_lastPayType;
 var box=document.getElementById('order-receipt-box');
 var riEl=document.getElementById('order-receipt-items');
 var rtEl=document.getElementById('order-receipt-total');
 var rpEl=document.getElementById('order-receipt-pay');
 var cashNotice=document.getElementById('cash-receipt-notice');
 var choice=document.getElementById('receipt-choice');
 if(!box||!rc||!rc.length)return;
 // 시간 포맷 (HH:MM)
 var now=new Date();
 var timeStr=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
 // 헤더에 테이블 번호 + 시간 삽입
 var hdrEl=document.getElementById('order-receipt-header');
 if(hdrEl){
  hdrEl.innerHTML='주문 영수증'+
   '<div style="font-size:11px;font-weight:600;color:#94a3b8;margin-top:4px">'+
   '테이블 '+_tNum+'번 &nbsp;|&nbsp; '+timeStr+'</div>';
 }
 if(riEl)riEl.innerHTML=rc.map(function(i){
  return '<div style="display:flex;justify-content:space-between">'+
   '<span>'+(i.emoji||'🍽')+' '+(i.name||'')+(i.qty>1?' ×'+i.qty:'')+'</span>'+
   '<span style="font-weight:700">₩'+((i.price||0)*(i.qty||1)).toLocaleString()+'</span></div>';
 }).join('');
 if(rtEl)rtEl.textContent='₩'+rt.toLocaleString();
 if(rpEl){
  var mLabel=method==='card'?'카드':method==='cash'?'현금':rp==='postpay'?'후불결제':'';
  rpEl.textContent=mLabel?'결제방법: '+mLabel:'';
 }
 if(cashNotice)cashNotice.style.display=(method==='cash')?'block':'none';
 if(choice)choice.style.display='none';
 box.style.display='block';
 var ns=document.getElementById('done-s2-next');
 if(ns)ns.style.display='block';
}
// FILO FCM VAPID 키
var _VAPID_KEY='BHO3mU6K2VlLkYfUgsunV5zXsx6oOc_I4dIyE9ErYPBZE5AkBhPP-HUmQhqvHLDsbjcRgEDsMbXg0TYiSiKW93c';

// SW → order.js postMessage 수신 (알림 탭 시 onSnapshot 끊겼을 경우 대비)
navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', function(e) {
  if (!e.data) return;
  if (e.data.type === 'pickup') _showPickupAlert && _showPickupAlert();
  if (e.data.type === 'receipt') {
    // 후불 결제 영수증 FCM 탭 → 영수증 화면 표시
    var box=document.getElementById('order-receipt-box');
    if(box&&box.style.display==='block')return; // 이미 표시 중
    _showOrderReceipt(_lastOrderItems,_lastOrderTotal,_lastPayType,'card');
  }
});

// ── 초기화 ────────────────────────────────────────────────────────────────────
window.onload=function(){
 firebase.initializeApp({
  apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
  authDomain:'mbti-logistics.firebaseapp.com',
  projectId:'mbti-logistics',
  storageBucket:'mbti-logistics.firebasestorage.app',
  messagingSenderId:'40761160761',
  appId:'1:40761160761:web:20545b610f03f534e949e8'
 });
 _db=firebase.firestore();
 try{_db.settings({experimentalAutoDetectLongPolling:true});}catch(e){}
 _did=_p('d')||'';
 _tNum=_p('t')||'';
 _takeout=_p('takeout')==='1';
 if(_takeout){_tNum='0';_tName='포장';}
 else{_tName=_p('name')||('테이블 '+_tNum);}
 if(!_did){
  document.getElementById('ld').innerHTML='<div style="text-align:center;padding:40px;color:#fff"><div style="font-size:24px">✕</div><div style="margin-top:12px">잘못된 주소입니다</div></div>';
  return;
 }
 // 매장명 + 테마 로드
 _db.collection('companies').doc(_did).get().then(function(doc){
  if(doc.exists){
   var d=doc.data();
   _storeName=d.name||'매장';
   var nm=document.getElementById('store-name');
   if(nm)nm.textContent=_storeName;
   document.title=_storeName+' - 주문하기';
   _applyStoreTheme(d);
  }
 }).catch(function(){});
 var tn=document.getElementById('table-name');if(tn)tn.textContent=_tName;
 document.getElementById('ld').style.display='none';
 document.getElementById('app').style.display='flex';
 _loadMenus(function(){
  // NFC 메뉴 태그: ?item= 파라미터로 특정 메뉴 자동 장바구니 추가
  var itemName=decodeURIComponent(_p('item')||'');
  if(!itemName) return;
  var m=(_menus||[]).filter(function(x){return x.name===itemName;})[0];
  if(m){_addToCart(m);_filoToast((m.emoji||'🍽')+' '+m.name+' 담겼습니다!');}
 });
 // 저장된 언어 복원 (번역 상태 포함)
 var _savedLang=localStorage.getItem('filo_lang')||'ko';
 if(_savedLang!=='ko'){_setLang(_savedLang);}else{_setLang('ko');}
 _listenOrders(); // 픽업 알림
 _checkExistingOrder();
 _loadBakeryCart(); // 빵 진열대 QR 스캔 카트 자동 로드 // 기존 주문 테이블 이동 감지
 // FCM 알림 탭으로 새 탭 열렸을 때 (#done 해시) → done 화면 바로 복원
 if(location.hash==='#done'){
  var lastId=localStorage.getItem('filo_order_'+_did);
  if(lastId){
   _db.collection('filo_orders').doc(lastId).get().then(function(doc){
    if(!doc.exists)return;
    var d=doc.data();
    if(d.status!=='pending'&&d.status!=='ready'&&d.status!=='served')return;
    _lastOrderId=lastId;
    var dn=document.getElementById('done');
    var dnum=document.getElementById('done-num');
    var ditems=document.getElementById('done-items');
    if(dnum)dnum.textContent=_t('tableNum')+' '+d.tableNum+' · '+_t('orderNum')+' #'+lastId.slice(-6).toUpperCase();
    if(ditems){var il=(d.items||[]).map(function(i){return (i.emoji||'🍽')+' '+i.name+' x'+i.qty;});ditems.textContent=il.join(', ');}
    if(dn)dn.style.display='flex';
    _listenPickup(lastId);
    if(d.status==='ready')_showPickupAlert();
   }).catch(function(){});
  }
 } else {
  // FCM 알림 허용 팝업 표시
  _showFCMGate();
 }
};

// ── 기존 주문 감지 (QR 재스캔 시 테이블 이동) ────────────────────────────────
function _checkExistingOrder(){
 if(!_did||!_tNum)return;
 // localStorage에 이전 주문 ID 있는지 확인
 var lastId=localStorage.getItem('filo_order_'+_did);
 if(!lastId)return;
 // 기존 주문이 아직 활성 상태인지 확인 (테이블 상태와 무관하게)
 _db.collection('filo_orders').doc(lastId).get().then(function(doc){
  if(!doc.exists){try{localStorage.removeItem('filo_order_'+_did);}catch(e){}return;}
  var d=doc.data();
  if(d.status!=='pending'&&d.status!=='ready'){try{localStorage.removeItem('filo_order_'+_did);}catch(e){}return;}
  if(String(d.tableNum)===String(_tNum))return; // 같은 테이블이면 무시
  // 다른 테이블 QR 스캔 → 즉시 이동 확인 팝업 (직원 승인 없이 바로 처리)
  var pop=document.createElement('div');
  pop.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  var fromNum=String(d.tableNum);
  var fromName=d.tableName||('테이블 '+d.tableNum);
  pop.innerHTML='<div style="background:#fff;border-radius:20px;padding:28px;text-align:center;max-width:320px;width:100%">'+
   '<div style="font-size:40px;margin-bottom:12px">&#128682;</div>'+
   '<div style="font-size:17px;font-weight:900;margin-bottom:8px">테이블 이동</div>'+
   '<div style="font-size:14px;color:#475569;margin-bottom:20px">'+
   fromName+'에서 <b style="color:#0891b2">'+_tName+'</b>으로<br>이동하시겠어요?</div>'+
   '<div style="display:flex;gap:10px">'+
   '<button id="_mv_ok" style="flex:1;padding:14px;background:#0891b2;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer">이동</button>'+
   '<button id="_mv_no" style="flex:1;padding:14px;background:#f1f5f9;color:#64748b;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">새 주문</button>'+
   '</div></div>';
  pop.className='xfer-pop';
  document.body.appendChild(pop);
  document.getElementById('_mv_ok').onclick=function(){
   var okBtn=document.getElementById('_mv_ok');
   okBtn.disabled=true;okBtn.textContent='이동 중...';
   fetch('/order/move-table',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({did:_did,orderId:lastId,fromTable:fromNum,toTable:String(_tNum),toTableName:_tName})
   }).then(function(r){return r.json();}).then(function(res){
    if(!res.ok){_filoToast('이동 실패: '+(res.error||''));okBtn.disabled=false;okBtn.textContent='이동';return;}
    pop.remove();
    _lastOrderId=lastId;
    _listenPickup(lastId);
    // 손님 화면 갱신
    var dnum=document.getElementById('done-num');
    if(dnum)dnum.textContent=_tName+' · '+_t('orderNum')+' #'+lastId.slice(-6).toUpperCase();
    var dn=document.getElementById('done');if(dn)dn.style.display='flex';
    _filoToast(_tName+'으로 이동됐습니다!');
   }).catch(function(e){_filoToast('이동 실패: '+e.message);okBtn.disabled=false;okBtn.textContent='이동';});
  };
  document.getElementById('_mv_no').onclick=function(){pop.remove();};
 }).catch(function(){});
}

// ── 메뉴 로드 ─────────────────────────────────────────────────────────────────

// ── 모달 열기/닫기 ────────────────────────────────────────────────────────────

// ── 장바구니에 담기 ───────────────────────────────────────────────────────────
function _addFromMdl(){
 if(!_curMdlMenu)return;
 for(var i=0;i<_tlQtyVal;i++)_addToCart(_curMdlMenu);
 _closeMdl();
}

function _addToCart(m){
 if(!_cart[m.name])_cart[m.name]={name:m.name,price:m.price,qty:0,emoji:m.emoji||'🍽',imageUrl:m.imageUrl||''};
 _cart[m.name].qty++;
 _updFab();
}

// ── 빵 진열대 QR 스캔 카트 자동 로드 ─────────────────────────
function _loadBakeryCart(){
  var key = 'filo_bakery_cart_' + _did;
  try {
    var saved = JSON.parse(localStorage.getItem(key) || '[]');
    if(!saved.length) return;
    var added = [];
    saved.forEach(function(item){
      if(!item.name || !item.price) return;
      if(!_cart[item.name]){
        _cart[item.name] = {name:item.name, price:item.price, qty:0, emoji:item.emoji||'🥐', imageUrl:''};
      }
      _cart[item.name].qty += (item.qty || 1);
      added.push((item.emoji||'🥐')+' '+item.name+' '+item.qty+'개');
    });
    _updFab();
    if(added.length){
      _filoToast('진열대에서 담은 빵이 추가됐어요! ' + added.join(', '));
    }
    // 로드 후 초기화 (중복 방지)
    localStorage.removeItem(key);
  } catch(e){}
}

function _chgQty(name,d){_cartChg(name,d);}

// ── 주문 접수 ─────────────────────────────────────────────────────────────────
// ── 테이블 QR 주문 제출 (order.html 전용) ──────────────
function _submitOrder(){
 var items=Object.values(_cart).filter(function(i){return i.qty>0;});
 if(!items.length){_filoToast('메뉴를 선택해주세요');return;}
 _openPayMdl();
}

function _openPayMdl(){
 var total=Object.values(_cart).reduce(function(s,i){return s+i.price*i.qty;},0);
 var pt=document.getElementById('pay-total-amt');if(pt)pt.textContent='₩'+total.toLocaleString();
 var pm=document.getElementById('pay-mdl');if(pm)pm.classList.add('open');
}

function _closePayMdl(){
 var pm=document.getElementById('pay-mdl');if(pm)pm.classList.remove('open');
}

function _doOrder(payType){
 _closePayMdl();
 var items=Object.values(_cart).filter(function(i){return i.qty>0;});
 var total=items.reduce(function(s,i){return s+i.price*i.qty;},0);
 var btn=document.getElementById('order-btn');if(btn){btn.disabled=true;btn.textContent='주문 중...';}
 var orderData={
  dealerId:_did,type:_takeout?'takeout':'table',status:'pending',
  payType:payType,tableNum:_tNum,tableName:_tName,
  items:items,total:total,
  createdAt:_nowISO(),
  date:_today()
 };
 if(_fcmToken)orderData.fcmToken=_fcmToken;
 // Worker API 경유 — 비로그인 고객도 안전하게 Firestore 쓰기 (12s 타임아웃)
 var _ctrl=new AbortController();
 var _tim=setTimeout(function(){_ctrl.abort();},12000);
 fetch('/api/filo-order',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify(orderData),
  signal:_ctrl.signal
 }).then(function(r){return r.json();}).then(function(data){
  clearTimeout(_tim);
  if(!data.ok||!data.id){throw new Error(data.error||'주문 실패');}
  var orderId=data.id;
  _closeCart();_cart={};_updFab();
  var orderInfo=items.map(function(i){var tname=(_lang&&_lang!=='ko'&&_tlCache&&_tlCache[i.name+'_'+_lang])||i.name;return (i.emoji||'🍽')+' '+tname+' ×'+i.qty;}).join('\n');
  var dn=document.getElementById('done');
  var dnum=document.getElementById('done-num');if(dnum)dnum.textContent=(_takeout?(_t('addr')||'포장'):_t('tableNum')+' '+_tNum)+' · '+_t('orderNum')+' #'+orderId.slice(-6).toUpperCase();
  var ditems=document.getElementById('done-items');if(ditems)ditems.textContent=orderInfo;
  if(btn){btn.disabled=false;btn.textContent=_t('order');}
  _lastOrderItems=items;_lastOrderTotal=total;_lastPayType=payType;
  var postNotice=document.getElementById('postpay-notice');
  if(postNotice)postNotice.style.display=(payType==='postpay')?'block':'none';
  if(dn){dn.style.display='flex';_doneStep(1);}
  _lastOrderId=orderId;
  _listenPickup(orderId);
  try{localStorage.setItem('filo_order_'+_did,orderId);}catch(e){}
  if(_did){
   fetch('/api/filo-push',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({did:_did,title:_storeName+' 신규 주문',body:'테이블 '+_tNum+' · ₩'+total.toLocaleString()+' 주문 접수'})
   }).catch(function(){});
  }
  /* 포인트 적립 — FCM 토큰 기반, 가입 불필요 */
  if(_fcmToken&&_did){
   fetch('/api/point-earn',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({did:_did,fcmToken:_fcmToken,orderId:orderId,total:total,tableNum:_tNum,storeName:_storeName})
   }).catch(function(){});
  }
  _autoReceiptFCM(orderId, total, items);
 }).catch(function(e){
  clearTimeout(_tim);
  if(btn){btn.disabled=false;btn.textContent=_t('order');}
  _filoToast(e.name==='AbortError'?'주문 시간 초과 — 다시 시도해주세요':'주문 실패 — 다시 시도해주세요');
 });
}

// ── 픽업 알림 (Firestore onSnapshot) ─────────────────────────────────────────
var _pickupOrderId = null; // 주문 완료 후 해당 주문 감지용

function _listenOrders(){
 if(!_did||!_tNum)return;
 _db.collection('filo_orders')
  .where('dealerId','==',_did)
  .where('tableNum','==',_tNum)
  .where('status','==','ready')
  .onSnapshot(function(snap){
   if(snap.empty)return;
   // 이미 완료 화면이 떠있을 때만 알림
   var done=document.getElementById('done');
   if(done&&done.style.display==='flex'){
    _showPickupAlert();
   }
  });
}

function _listenPickup(orderId){
 // 특정 주문 ID 감지 (주문 완료 후 호출)
 _pickupOrderId=orderId;
 var status=document.getElementById('pickup-status');
 if(status)status.textContent='주방에서 준비 중...';
 _db.collection('filo_orders').doc(orderId).onSnapshot(function(doc){
  if(!doc.exists)return;
  var data=doc.data();
  if(data.status==='ready'){
   var status=document.getElementById('pickup-status');
   if(status){status.textContent='준비 완료! 카운터에서 수령해주세요';status.style.color='#22c55e';status.style.fontWeight='800';}
   _showPickupAlert();
  } else if(data.status==='served'){
   var status=document.getElementById('pickup-status');
   if(status){status.textContent='서빙 완료!';status.style.color='#0891b2';}
  }
 });
}

function _showPickupAlert(){
 var existing=document.getElementById('pickup-alert');
 if(existing)return;
 var alert=document.createElement('div');
 alert.id='pickup-alert';
 alert.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
 alert.innerHTML='<div style="background:#fff;border-radius:24px;padding:32px;text-align:center;max-width:320px;width:100%">'+
  '<div style="font-size:24px;margin-bottom:16px"></div>'+
  '<div style="font-size:22px;font-weight:900;margin-bottom:8px;color:#0f172a">준비 완료!</div>'+
  '<div style="font-size:15px;color:#475569;margin-bottom:24px">주문하신 음식이 준비됐습니다.<br>카운터에서 수령해주세요</div>'+
  '<button onclick="document.getElementById(\'pickup-alert\').remove()" style="width:100%;padding:16px;background:#0891b2;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:800;cursor:pointer">확인</button>'+
  '</div>';
 document.body.appendChild(alert);
 // TTS 음성 안내 3회
 _speakPickup(0);
}

function _speakPickup(count){
 if(count>=3)return;
 // 진동 (패턴: 길-짧-길)
 try{if(navigator.vibrate)navigator.vibrate([500,200,500,200,1000]);}catch(e){}
 // TTS 음성
 try{
  window.speechSynthesis.cancel();
  var msg=new SpeechSynthesisUtterance('픽업 픽업');
  msg.lang='ko-KR';
  msg.rate=0.85;
  msg.pitch=1.1;
  msg.volume=1;
  msg.onend=function(){setTimeout(function(){_speakPickup(count+1);},1500);};
  window.speechSynthesis.speak(msg);
 } catch(e){
  // TTS 실패 시 벨소리 폴백
  try{var ctx=new AudioContext();var o=ctx.createOscillator();var g=ctx.createGain();
   o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.value=0.3;
   o.start();g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.8);
   setTimeout(function(){o.stop();},800);}catch(e2){}
 }
}

// ── 테이블 번호 변경 (고객이 직접) ─────────────────────────────────────────
var _lastOrderId = null;

function _changeTable(){
 if(!_lastOrderId){_filoToast('주문 정보를 찾을 수 없습니다');return;}
 // 커스텀 모달 — prompt() 대신 사용
 var mo=document.createElement('div');
 mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
 mo.innerHTML='<div style="background:#fff;border-radius:20px;padding:28px;width:100%;max-width:320px;text-align:center">'+
  '<div style="font-size:36px;margin-bottom:10px">&#128682;</div>'+
  '<div style="font-size:17px;font-weight:900;margin-bottom:8px">테이블 번호 변경</div>'+
  '<div style="font-size:13px;color:#64748b;margin-bottom:16px">이동할 테이블 번호를 입력하면<br>직원이 확인 후 이동 처리합니다</div>'+
  '<input id="_ct_input" type="number" min="1" placeholder="테이블 번호 입력" style="width:100%;padding:13px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:18px;margin-bottom:14px;box-sizing:border-box;text-align:center;font-weight:700">'+
  '<div style="display:flex;gap:8px">'+
  '<button id="_ct_cancel" style="flex:1;padding:13px;background:#f1f5f9;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;color:#475569">취소</button>'+
  '<button id="_ct_ok" style="flex:1;padding:13px;background:#0891b2;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer">이동 요청</button>'+
  '</div></div>';
 document.body.appendChild(mo);
 document.getElementById('_ct_cancel').onclick=function(){mo.remove();};
 document.getElementById('_ct_input').focus();
 document.getElementById('_ct_ok').onclick=function(){
  var newNum=(document.getElementById('_ct_input').value||'').trim();
  if(!newNum){_filoToast('테이블 번호를 입력해주세요');return;}
  if(String(newNum)===String(_tNum)){_filoToast('현재 테이블과 같습니다');return;}
  var btn=document.getElementById('_ct_ok');btn.disabled=true;btn.textContent='요청 중...';
  // staff_calls를 통해 직원 승인 요청 (직접 Firestore 쓰기 권한 없음)
  _db.collection('staff_calls').add({
   dealerId:_did,
   type:'table_transfer',
   orderId:_lastOrderId,
   fromTable:String(_tNum),
   fromTableName:_tName||('테이블 '+_tNum),
   toTable:newNum,
   toTableName:'테이블 '+newNum,
   tableNum:newNum,
   tableName:'테이블 '+newNum,
   status:'pending',
   createdAt:_nowISO()
  }).then(function(ref){
   mo.remove();
   _filoToast('직원에게 이동 요청을 전송했습니다');
   // 승인/거절 onSnapshot 대기
   var unsub=_db.collection('staff_calls').doc(ref.id).onSnapshot(function(snap){
    if(!snap.exists)return;
    var xd=snap.data();
    if(xd.status==='approved'){
     unsub();
     _tNum=newNum;
     var tn=document.getElementById('table-name');if(tn)tn.textContent='테이블 '+newNum;
     var dnum=document.getElementById('done-num');if(dnum)dnum.textContent='테이블 '+newNum+'번으로 이동됐습니다';
     _filoToast('테이블 '+newNum+'번으로 이동됐습니다!');
    } else if(xd.status==='rejected'){
     unsub();
     _filoToast('직원이 이동 요청을 거절했습니다');
    }
   });
  }).catch(function(e){_filoToast('요청 실패: '+e.message);});
 };
}

// ── FCM 알림 허용 게이트 ──────────────────────────────────────────────────────
function _showFCMGate(){
 var gate=document.getElementById('fcm-gate');
 if(gate)gate.style.display='none'; // 커스텀 모달 제거
 // iOS 크롬 → FCM 미지원
 if(/CriOS/.test(navigator.userAgent)) return;
 if(!('Notification' in window)||!('serviceWorker' in navigator)) return;
 // 이미 토큰 있으면 조용히 등록
 try{
  var saved=localStorage.getItem('filo_fcm_'+_did);
  if(saved){_fcmToken=saved;_initFCM();return;}
 }catch(e){}
 // 이미 허용 → 즉시 등록
 if(Notification.permission==='granted'){_initFCM();return;}
 // 거부됨 → 스킵
 if(Notification.permission==='denied') return;
 // 미결정 → 첫 터치/클릭 시 브라우저 네이티브 권한 요청
 var _fcmAsked=false;
 function _askPerm(){
  if(_fcmAsked)return; _fcmAsked=true;
  document.removeEventListener('touchstart',_askPerm,true);
  document.removeEventListener('click',_askPerm,true);
  Notification.requestPermission().then(function(perm){
   if(perm==='granted') _initFCM();
  });
 }
 document.addEventListener('touchstart',_askPerm,{capture:true,passive:true,once:true});
 document.addEventListener('click',_askPerm,{capture:true,once:true});
}

function _requestFCM(){
 Notification.requestPermission().then(function(perm){
  if(perm==='granted') _initFCM();
 });
}

function _initFCM(){
 var gate=document.getElementById('fcm-gate');
 navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/'}).then(function(reg){
  return reg.update().then(function(){return reg;});
 }).then(function(reg){
  try{
   if(!firebase.messaging){throw new Error('no messaging');}
   _messaging=firebase.messaging();
   _messaging.getToken({
    vapidKey:_VAPID_KEY,
    serviceWorkerRegistration:reg
   }).then(function(token){
    if(token){
     _fcmToken=token;
     try{localStorage.setItem('filo_fcm_'+_did,token);}catch(e){}
     // Firestore 주문 문서에 고객 FCM 토큰 저장
     if(_db&&_did&&_tNum){
      var orderId=localStorage.getItem('filo_order_'+_did)||'';
      if(orderId){
       _db.collection('filo_orders').doc(orderId).update({guestFcmToken:token}).catch(function(){});
      }
     }
    }
    if(gate)gate.style.display='none';
   }).catch(function(e){
    if(gate)gate.style.display='none';
   });
  }catch(e){
   // [FCM] messaging 초기화 실패 (무시)
   if(gate)gate.style.display='none';
  }
 }).catch(function(e){
  // [FCM] SW 등록 실패 (무시)
  if(gate)gate.style.display='none';
 });
}

// ── 직원 호출 ─────────────────────────────────────────────────────────────────
function _callStaff(){
 if(!_db||!_did)return;
 _db.collection('staff_calls').add({
  dealerId:_did,tableNum:_tNum,tableName:_tName,
  createdAt:_nowISO(),status:'pending'
 }).then(function(){
  var toast=document.getElementById('call-toast');
  if(toast){toast.style.display='block';setTimeout(function(){toast.style.display='none';},2000);}
 }).catch(function(){});
}


// ── AI CS봇 ─────────────────────────────────────────────────────────────────
function _openCsBot(){
 var p=document.getElementById('cs-panel');
 if(p){p.style.display='flex';var inp=document.getElementById('cs-input');if(inp)inp.focus();}
}
function _closeCsBot(){
 var p=document.getElementById('cs-panel');
 if(p)p.style.display='none';
}
function _escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _sendCsQuestion(){
 var inp=document.getElementById('cs-input');
 var msgs=document.getElementById('cs-msgs');
 if(!inp||!msgs)return;
 var q=inp.value.trim();
 if(!q)return;
 inp.value='';
 msgs.innerHTML+='<div class="cs-msg cs-user">'+_escHtml(q)+'</div>';
 var typingId='cs-typing-'+Date.now();
 msgs.innerHTML+='<div class="cs-msg cs-bot" id="'+typingId+'">답변 생성 중...</div>';
 msgs.scrollTop=msgs.scrollHeight;
 fetch('/api/cs-bot',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({did:_did,question:q,fcmToken:_fcmToken||undefined,lang:window._lang||'ko'})
 }).then(function(r){return r.json();}).then(function(d){
  var typing=document.getElementById(typingId);
  var answerText=d.answer||'죄송합니다. 잠시 후 다시 문의해 주세요.';
  if(typing)typing.outerHTML='<div class="cs-msg cs-bot">'+_escHtml(answerText)+'</div>';
  msgs.scrollTop=msgs.scrollHeight;
 }).catch(function(){
  var typing=document.getElementById(typingId);
  if(typing)typing.outerHTML='<div class="cs-msg cs-bot">연결에 실패했습니다. 잠시 후 다시 시도해 주세요.</div>';
 });
}

// ── CS봇 마이크 음성 입력 (STT) ──────────────────────────────────
var _csRecognition = null;
var _csMicOn = false;

function _csMicToggle(){
  var btn = document.getElementById('cs-mic-btn');
  var inp = document.getElementById('cs-input');
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    inp.placeholder = '이 브라우저는 음성 입력을 지원하지 않아요';
    setTimeout(function(){ inp.placeholder = '궁금한 점을 입력하세요...'; }, 2500);
    return;
  }
  if(_csMicOn){
    _csMicOn = false;
    if(_csRecognition) _csRecognition.stop();
    if(btn) btn.classList.remove('listening');
    return;
  }
  _csMicOn = true;
  if(btn) btn.classList.add('listening');
  inp.placeholder = '말씀해 주세요...';
  inp.value = '';

  _csRecognition = new SR();
  _csRecognition.lang = (window._lang === 'en') ? 'en-US' : (window._lang === 'zh') ? 'zh-CN' : (window._lang === 'ja') ? 'ja-JP' : 'ko-KR';
  _csRecognition.interimResults = true;
  _csRecognition.maxAlternatives = 1;
  _csRecognition.continuous = false;

  _csRecognition.onresult = function(e){
    var transcript = '';
    for(var i = e.resultIndex; i < e.results.length; i++){
      transcript += e.results[i][0].transcript;
    }
    inp.value = transcript;
  };
  _csRecognition.onend = function(){
    _csMicOn = false;
    if(btn) btn.classList.remove('listening');
    inp.placeholder = '궁금한 점을 입력하세요...';
    if(inp.value.trim()) _sendCsQuestion();
  };
  _csRecognition.onerror = function(e){
    _csMicOn = false;
    if(btn) btn.classList.remove('listening');
    inp.placeholder = e.error === 'not-allowed' ? '마이크 권한을 허용해 주세요' : '음성 인식 오류: '+e.error;
    setTimeout(function(){ inp.placeholder = '궁금한 점을 입력하세요...'; }, 2500);
  };
  _csRecognition.start();
}

// ── 음성 주문 (Voice Order) ───────────────────────────────────────
var _voiceRecognition = null;
var _voiceOn = false;

function _voiceOrderToggle(){
  var btn = document.getElementById('voice-order-btn');
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    _showVoiceToast('이 브라우저는 음성 주문을 지원하지 않아요', 2500);
    return;
  }
  if(_voiceOn){
    _voiceOn = false;
    if(_voiceRecognition) _voiceRecognition.stop();
    if(btn) btn.classList.remove('listening');
    return;
  }
  _voiceOn = true;
  if(btn) btn.classList.add('listening');
  _showVoiceToast('말씀해 주세요... (예: 아메리카노 두 개)', 0);

  _voiceRecognition = new SR();
  _voiceRecognition.lang = (window._lang === 'en') ? 'en-US' : (window._lang === 'zh') ? 'zh-CN' : (window._lang === 'ja') ? 'ja-JP' : 'ko-KR';
  _voiceRecognition.interimResults = false;
  _voiceRecognition.maxAlternatives = 3;
  _voiceRecognition.continuous = false;

  _voiceRecognition.onresult = function(e){
    var transcript = e.results[0][0].transcript;
    _parseVoiceOrder(transcript);
  };
  _voiceRecognition.onend = function(){
    _voiceOn = false;
    if(btn) btn.classList.remove('listening');
  };
  _voiceRecognition.onerror = function(ev){
    _voiceOn = false;
    if(btn) btn.classList.remove('listening');
    var msg = ev.error === 'not-allowed' ? '마이크 권한을 허용해 주세요' : ev.error === 'no-speech' ? '음성이 감지되지 않았어요' : '음성 인식 오류: '+ev.error;
    _showVoiceToast(msg, 2500);
  };
  _voiceRecognition.start();
}

function _parseVoiceOrder(text){
  var numWords = {
    '하나':1,'한':1,'한개':1,'일개':1,'일':1,
    '둘':2,'두':2,'두개':2,'이개':2,'이':2,
    '셋':3,'세':3,'세개':3,'삼개':3,'삼':3,
    '넷':4,'네':4,'네개':4,'사개':4,'사':4,
    '다섯':5,'오개':5,'오':5,
    '여섯':6,'육개':6,'육':6,
    '일곱':7,'칠개':7,'칠':7,
    '여덟':8,'팔개':8,'팔':8,
    '아홉':9,'구개':9,'구':9,
    '열':10,'십':10
  };
  var src = text.replace(/\s+/g,' ').trim();
  var menus = (typeof _menus !== 'undefined') ? _menus : [];
  if(!menus.length){ _showVoiceToast('메뉴를 불러오는 중이에요', 2000); return; }

  // 수량 추출: 숫자 또는 한글 수사
  function extractQty(str){
    var m = str.match(/(\d+)\s*(개|인분|잔|병|판|세트)?/);
    if(m) return parseInt(m[1], 10);
    for(var k in numWords){
      if(str.indexOf(k) >= 0) return numWords[k];
    }
    return 1;
  }

  var added = [];
  var remaining = src;

  // 메뉴 길이 내림차순 정렬 (긴 이름 우선 매칭)
  var sorted = menus.slice().sort(function(a,b){ return b.name.length - a.name.length; });

  sorted.forEach(function(m){
    if(remaining.indexOf(m.name) < 0) return;
    var idx = remaining.indexOf(m.name);
    var after = remaining.slice(idx + m.name.length, idx + m.name.length + 8);
    var qty = extractQty(after);
    for(var i = 0; i < qty; i++) _addToCart(m);
    added.push(m.name + ' ' + qty + '개');
    remaining = remaining.replace(m.name, '');
  });

  if(added.length){
    _showVoiceToast(added.join(', ') + ' 담겼어요!', 2500);
    _updFab();
  } else {
    _showVoiceToast('"' + text + '" — 일치하는 메뉴가 없어요', 2500);
  }
}

var _voiceToastTimer = null;
function _showVoiceToast(msg, duration){
  var el = document.getElementById('voice-toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  if(_voiceToastTimer) clearTimeout(_voiceToastTimer);
  if(duration > 0){
    _voiceToastTimer = setTimeout(function(){ el.classList.remove('show'); }, duration);
  }
}

// ── 영수증 알림 받기 ─────────────────────────────────────────────
function _autoReceiptFCM(orderId, total, items){
 if(!('Notification' in window)||!('serviceWorker' in navigator)) return;
 if(Notification.permission==='denied') return;
 var orderLabel='테이블 '+_tNum+' · ₩'+total.toLocaleString()+' 주문 완료';
 function _doSend(tok){
  if(!tok) return;
  try{localStorage.setItem('filo_fcm_'+_did,tok);}catch(e){}
  // Firestore 주문에 토큰 저장
  if(_db&&orderId) _db.collection('filo_orders').doc(orderId).update({guestFcmToken:tok}).catch(function(){});
  fetch('/fcm/notify-drivers',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({
    tokens:[tok],
    title:_storeName+' 영수증',
    body:orderLabel,
    type:'receipt',
    url:location.href
   })
  }).catch(function(){});
 }
 // 이미 토큰 있으면 바로 발송
 if(_fcmToken){_doSend(_fcmToken);return;}
 // 토큰 없으면 권한 요청 후 발급
 Notification.requestPermission().then(function(perm){
  if(perm!=='granted') return;
  navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/'})
   .then(function(reg){return reg.update().then(function(){return reg;});})
   .then(function(reg){return firebase.messaging().getToken({vapidKey:_VAPID_KEY,serviceWorkerRegistration:reg});})
   .then(function(tok){_fcmToken=tok;_doSend(tok);})
   .catch(function(){});
 });
}

function reqReceiptFCM(){
  var btn=document.getElementById('receipt-fcm-btn');
  var st=document.getElementById('receipt-fcm-status');
  if(!btn||btn.dataset.done==='1')return;
  btn.textContent='처리 중...';btn.disabled=true;
  st.style.display='block';st.textContent='알림 권한 확인 중...';
  if(!('Notification' in window)){
    st.textContent='이 브라우저는 알림을 지원하지 않아요';
    btn.textContent='영수증 알림 받기';btn.disabled=false;return;
  }
  Notification.requestPermission().then(function(perm){
    if(perm!=='granted'){
      st.textContent='알림을 허용해야 영수증을 받을 수 있어요';
      btn.textContent='영수증 알림 받기';btn.disabled=false;return;
    }
    st.textContent='영수증 준비 중...';
    navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/'})
      .then(function(reg){ return reg.update().then(function(){return reg;}); })
      .then(function(reg){
        return firebase.messaging().getToken({vapidKey:_VAPID_KEY,serviceWorkerRegistration:reg});
      }).then(function(tok){
        if(!tok)throw new Error('토큰 발급 실패');
        try{localStorage.setItem('filo_fcm_'+_did,tok);}catch(e){}
        return fetch('/fcm/notify-drivers',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            tokens:[tok],
            title:_storeName+' 영수증',
            body:document.getElementById('done-num')
              ?document.getElementById('done-num').textContent+' 주문 완료'
              :'주문 완료',
            type:'receipt',
            url:location.href
          })
        });
      }).then(function(r){return r.json();})
      .then(function(d){
        if(d.sent>0){
          btn.textContent='영수증 발송됨';
          btn.style.background='rgba(34,197,94,.08)';
          btn.style.borderColor='rgba(34,197,94,.3)';
          btn.style.color='#16a34a';
          btn.dataset.done='1';
          st.textContent='잠시 후 알림으로 영수증이 전송됩니다';
        }else{throw new Error('발송 실패');}
      }).catch(function(e){
        st.textContent='오류: '+(e.message||'다시 시도해주세요');
        btn.textContent='영수증 알림 받기';btn.disabled=false;
      });
  });
}

// ── 다크모드 ──────────────────────────────────────────────────
function _toggleDark(){
  var isDark = document.body.classList.toggle('dark');
  localStorage.setItem('filo_dark', isDark?'1':'0');
  var btn = document.getElementById('dark-btn');
  if(btn) btn.textContent = isDark ? '라이트' : '다크';
}
(function(){
  if(localStorage.getItem('filo_dark')==='1'){
    document.body.classList.add('dark');
    var btn = document.getElementById('dark-btn');
    if(btn) btn.textContent = '라이트';
  }
})();

// ── 뷰 전환 (카드/리스트) ─────────────────────────────────────
var _viewMode = localStorage.getItem('filo_view') || 'grid';
function _setView(mode){
  _viewMode = mode;
  localStorage.setItem('filo_view', mode);
  document.getElementById('vt-grid').classList.toggle('on', mode==='grid');
  document.getElementById('vt-list').classList.toggle('on', mode==='list');
  var grid = document.getElementById('menu-grid');
  if(grid){
    grid.style.display = mode==='list' ? 'block' : 'grid';
  }
  // 현재 메뉴 다시 렌더
  if(window._cachedMenus) _renderMenus(window._cachedMenus, window._activeCat||'전체');
}
(function(){
  if(_viewMode==='list'){
    setTimeout(function(){
      var g=document.getElementById('vt-grid'),l=document.getElementById('vt-list');
      if(g)g.classList.remove('on');
      if(l)l.classList.add('on');
    },500);
  }
})();

// ── 영업 중 배지 표시 ─────────────────────────────────────────
function _checkOpenStatus(){
  var now = new Date();
  var h = now.getHours();
  var isOpen = h >= 10 && h < 22; // 10시~22시
  var badge = document.getElementById('open-badge');
  if(badge) badge.style.display = isOpen ? 'flex' : 'none';
}
setTimeout(_checkOpenStatus, 500);
