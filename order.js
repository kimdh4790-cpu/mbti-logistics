/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      order.js
 * @description QR테이블오더·주문·결제·AI추천
 */
var _did='', _tNum='', _tName='';
var _menus=[], _cart={}, _lang='ko';
var _tlCache={}, _curMdlMenu=null, _tlQtyVal=1;
var _db=null, _orderListener=null;
var _fcmToken=null, _messaging=null;
// FILO FCM VAPID 키
var _VAPID_KEY='BHO3mU6K2VlLkYfUgsunV5zXsx6oOc_I4dIyE9ErYPBZE5AkBhPP-HUmQhqvHLDsbjcRgEDsMbXg0TYiSiKW93c';

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
 _did=_p('d')||'';
 _tNum=_p('t')||'';
 _tName=_p('name')||('테이블 '+_tNum);
 if(!_did){
  document.getElementById('ld').innerHTML='<div style="text-align:center;padding:40px;color:#fff"><div style="font-size:48px">❌</div><div style="margin-top:12px">잘못된 주소입니다</div></div>';
  return;
 }
 // 매장명 로드
 _db.collection('companies').doc(_did).get().then(function(doc){
  if(doc.exists){
   var d=doc.data();
   var nm=document.getElementById('store-name');
   if(nm)nm.textContent=d.name||'매장';
   document.title=(d.name||'매장')+' - 주문하기';
  }
 }).catch(function(){});
 var tn=document.getElementById('table-name');if(tn)tn.textContent=_tName;
 document.getElementById('ld').style.display='none';
 document.getElementById('app').style.display='flex';
 _loadMenus();
 _listenOrders(); // 픽업 알림
 _checkExistingOrder(); // 기존 주문 테이블 이동 감지
 // FCM 알림 허용 팝업 표시
 _showFCMGate();
};

// ── 기존 주문 감지 (QR 재스캔 시 테이블 이동) ────────────────────────────────
function _checkExistingOrder(){
 if(!_did||!_tNum)return;
 // localStorage에 이전 주문 ID 있는지 확인
 var lastId=localStorage.getItem('filo_order_'+_did);
 if(!lastId)return;
 // 해당 주문이 아직 pending/ready 상태인지 확인
 _db.collection('filo_orders').doc(lastId).get().then(function(doc){
  if(!doc.exists)return;
  var d=doc.data();
  if(d.status!=='pending'&&d.status!=='ready')return;
  if(String(d.tableNum)===String(_tNum))return; // 같은 테이블이면 무시
  // 다른 테이블 QR 스캔 → 이동 확인 팝업
  var pop=document.createElement('div');
  pop.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  pop.innerHTML='<div style="background:#fff;border-radius:20px;padding:28px;text-align:center;max-width:320px;width:100%">'+
   '<div style="font-size:40px;margin-bottom:12px">🪑</div>'+
   '<div style="font-size:17px;font-weight:900;margin-bottom:8px">테이블 이동</div>'+
   '<div style="font-size:14px;color:#475569;margin-bottom:20px">'+
   '기존 주문을 <b style="color:#0891b2">테이블 '+_tNum+'</b>번으로<br>이동할까요?</div>'+
   '<div style="display:flex;gap:10px">'+
   '<button id="_mv_ok" style="flex:1;padding:14px;background:#0891b2;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer">이동</button>'+
   '<button id="_mv_no" style="flex:1;padding:14px;background:#f1f5f9;color:#64748b;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">새 주문</button>'+
   '</div></div>';
  document.body.appendChild(pop);
  document.getElementById('_mv_ok').onclick=function(){
   _db.collection('filo_orders').doc(lastId).update({
    tableNum:_tNum,tableName:'테이블 '+_tNum,
    movedFrom:d.tableNum,movedAt:new Date().toISOString()
   }).then(function(){
    _lastOrderId=lastId;
    _listenPickup(lastId);
    pop.remove();
    // 완료 화면 표시
    var dn=document.getElementById('done');
    var dnum=document.getElementById('done-num');if(dnum)dnum.textContent='테이블 '+_tNum+'번으로 이동됐습니다';
    var ditems=document.getElementById('done-items');
    if(ditems){var il=(d.items||[]).map(function(i){return (i.emoji||'🍽')+' '+i.name+' x'+i.qty;});ditems.textContent=il.join(', ');}
    if(dn)dn.style.display='flex';
   }).catch(function(e){alert('이동 실패: '+e.message);pop.remove();});
  };
  document.getElementById('_mv_no').onclick=function(){pop.remove();};
 }).catch(function(){});
}

// ── 메뉴 로드 ─────────────────────────────────────────────────────────────────
function _loadMenus(){
 fetch('/api/menus?did='+encodeURIComponent(_did))
 .then(function(r){return r.json();})
 .then(function(d){
  _menus=d.menus||[];
  _renderCatBar(_menus,'cat-bar');
  _renderMenuGrid(_menus,'menu-grid');
  _renderRecommendBanner(_menus);
 }).catch(function(){
  var g=document.getElementById('menu-grid');
  if(g)g.innerHTML='<div class="empty"><div class="empty-ico">😅</div><div class="empty-msg">메뉴를 불러올 수 없습니다</div></div>';
 });
}

// ── 모달 열기/닫기 ────────────────────────────────────────────────────────────
function _openMdl(m){_openMdlCommon(m);}
function _closeMdl(){
 document.getElementById('mdl').classList.remove('open');
 _curMdlMenu=null;
}

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

function _chgQty(name,d){_cartChg(name,d);}

// ── 주문 접수 ─────────────────────────────────────────────────────────────────
function _submitOrder(){
 var items=Object.values(_cart).filter(function(i){return i.qty>0;});
 if(!items.length){alert('메뉴를 선택해주세요');return;}
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
  dealerId:_did,type:'table',status:'pending',
  payType:payType,tableNum:_tNum,tableName:_tName,
  items:items,total:total,
  createdAt:new Date().toISOString(),
  date:new Date().toISOString().slice(0,10)
 };
 if(_fcmToken)orderData.fcmToken=_fcmToken;
 _db.collection('filo_orders').add(orderData).then(function(ref){
  _closeCart();_cart={};_updFab();
  // 완료 화면
  var orderInfo=items.map(function(i){return (i.emoji||'🍽')+' '+i.name+' ×'+i.qty;}).join('\n');
  var dn=document.getElementById('done');
  var dnum=document.getElementById('done-num');if(dnum)dnum.textContent='주문번호 #'+ref.id.slice(-6).toUpperCase();
  var ditems=document.getElementById('done-items');if(ditems)ditems.textContent=orderInfo;
  if(dn)dn.style.display='flex';
  if(btn){btn.disabled=false;btn.textContent=_t('order');}
  // 픽업 감지 시작
  _lastOrderId=ref.id;
  _listenPickup(ref.id);
  // localStorage에 주문 ID 저장 (QR 재스캔 이동용)
  try{localStorage.setItem('filo_order_'+_did,ref.id);}catch(e){}
 }).catch(function(e){
  alert('주문 실패: '+e.message);
  if(btn){btn.disabled=false;btn.textContent=_t('order');}
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
 if(status)status.textContent='⏳ 주방에서 준비 중...';
 _db.collection('filo_orders').doc(orderId).onSnapshot(function(doc){
  if(!doc.exists)return;
  var data=doc.data();
  if(data.status==='ready'){
   var status=document.getElementById('pickup-status');
   if(status){status.textContent='✅ 준비 완료! 카운터에서 수령해주세요';status.style.color='#22c55e';status.style.fontWeight='800';}
   _showPickupAlert();
  } else if(data.status==='served'){
   var status=document.getElementById('pickup-status');
   if(status){status.textContent='🍽 서빙 완료!';status.style.color='#0891b2';}
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
  '<div style="font-size:64px;margin-bottom:16px">🔔</div>'+
  '<div style="font-size:22px;font-weight:900;margin-bottom:8px;color:#0f172a">준비 완료!</div>'+
  '<div style="font-size:15px;color:#475569;margin-bottom:24px">주문하신 음식이 준비됐습니다.<br>카운터에서 수령해주세요 😊</div>'+
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
 var newNum=prompt('이동한 테이블 번호를 입력해주세요:');
 if(!newNum||!newNum.trim())return;
 newNum=newNum.trim();
 if(!_lastOrderId){alert('주문 정보를 찾을 수 없습니다');return;}
 _db.collection('filo_orders').doc(_lastOrderId).update({
  tableNum:newNum,
  tableName:'테이블 '+newNum,
  movedFrom:_tNum,
  movedAt:new Date().toISOString()
 }).then(function(){
  _tNum=newNum;
  var tn=document.getElementById('table-name');if(tn)tn.textContent='테이블 '+newNum;
  alert('✅ 테이블 '+newNum+'번으로 변경됐습니다!');
 }).catch(function(e){alert('변경 실패: '+e.message);});
}

// ── FCM 알림 허용 게이트 ──────────────────────────────────────────────────────
function _showFCMGate(){
 // 아이폰 크롬 감지
 var isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
 var isChrome=/CriOS/.test(navigator.userAgent);
 if(isIOS&&isChrome){
  // 아이폰 크롬 → FCM 불가, 안내만 표시
  var notice=document.getElementById('ios-chrome-notice');
  if(notice)notice.style.display='block';
  return;
 }
 var gate=document.getElementById('fcm-gate');
 if(!gate)return;
 // 이미 토큰 있으면 스킵
 try{
  var saved=localStorage.getItem('filo_fcm_'+_did);
  if(saved){_fcmToken=saved;return;}
 }catch(e){}
 // 브라우저 지원 여부
 if(!('Notification' in window)||!('serviceWorker' in navigator)){return;}
 // 이미 허용된 경우 바로 토큰 발급
 if(Notification.permission==='granted'){
  _initFCM();return;
 }
 gate.style.display='flex';
}

function _requestFCM(){
 var btn=document.getElementById('fcm-allow-btn');
 var deniedMsg=document.getElementById('fcm-denied-msg');
 if(btn)btn.textContent='⏳ 처리 중...';
 Notification.requestPermission().then(function(perm){
  if(perm==='granted'){
   _initFCM();
  } else {
   if(btn)btn.textContent='🔔 알림 허용하기';
   if(deniedMsg)deniedMsg.style.display='block';
  }
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
     // [FCM] 토큰 발급 성공
    }
    if(gate)gate.style.display='none';
   }).catch(function(e){
    // [FCM] 토큰 발급 실패 (무시)
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
  createdAt:new Date().toISOString(),status:'pending'
 }).then(function(){
  var toast=document.getElementById('call-toast');
  if(toast){toast.style.display='block';setTimeout(function(){toast.style.display='none';},2000);}
 }).catch(function(){});
}
