/*
 * order.js - FILO 테이블 QR 주문 페이지 v3
 * URL: filo.ai.kr/order?d=dealerId&t=tableNum&name=tableName
 *
 * ⚠️ 수정 시 주의사항:
 * - GitHub push → 자동배포 (GitHub Actions → KV)
 * - 공통 로직: filo-order-common.js 참조
 * - 관련: order.html, _worker.js
 * - GitHub Token: ghp_***참조:secrets*** (기한없음)
 *
 * 테이블QR 전용 기능:
 * - 선결제/후불 선택 (_openPayMdl, _doOrder)
 * - 직원 호출 (_callStaff)
 * - 픽업 알림 (Firestore onSnapshot - status:'ready')
 * - 테이블 번호 표시
 *
 * 번역: filo_menus.nameTranslations 우선 → Anthropic 재시도3회 → Google 폴백
 * Firebase: filo_orders, staff_calls write (비로그인)
 */

// ── 전역 변수 ─────────────────────────────────────────────────────────────────
var _did='', _tNum='', _tName='';
var _menus=[], _cart={}, _lang='ko';
var _tlCache={}, _curMdlMenu=null, _tlQtyVal=1;
var _db=null, _orderListener=null;

// ── 초기화 ────────────────────────────────────────────────────────────────────
window.onload=function(){
 firebase.initializeApp({
  apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
  authDomain:'mbti-logistics.firebaseapp.com',
  projectId:'mbti-logistics'
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
};

// ── 메뉴 로드 ─────────────────────────────────────────────────────────────────
function _loadMenus(){
 fetch('/api/menus?did='+encodeURIComponent(_did))
 .then(function(r){return r.json();})
 .then(function(d){
  _menus=d.menus||[];
  _renderCatBar(_menus,'cat-bar');
  _renderMenuGrid(_menus,'menu-grid');
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
 _db.collection('filo_orders').add({
  dealerId:_did,type:'table',status:'pending',
  payType:payType,tableNum:_tNum,tableName:_tName,
  items:items,total:total,
  createdAt:new Date().toISOString(),
  date:new Date().toISOString().slice(0,10)
 }).then(function(ref){
  _closeCart();_cart={};_updFab();
  // 완료 화면
  var orderInfo=items.map(function(i){return (i.emoji||'🍽')+' '+i.name+' ×'+i.qty;}).join('\n');
  var dn=document.getElementById('done');
  var dnum=document.getElementById('done-num');if(dnum)dnum.textContent='주문번호 #'+ref.id.slice(-6).toUpperCase();
  var ditems=document.getElementById('done-items');if(ditems)ditems.textContent=orderInfo;
  if(dn)dn.style.display='flex';
  if(btn){btn.disabled=false;btn.textContent=_t('order');}
  // 픽업 감지 시작
  _listenPickup(ref.id);
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
 try{
  window.speechSynthesis.cancel();
  var msg=new SpeechSynthesisUtterance('고객님 주문하신 음식이 준비되었습니다');
  msg.lang='ko-KR';
  msg.rate=0.9;
  msg.pitch=1.1;
  msg.volume=1;
  msg.onend=function(){setTimeout(function(){_speakPickup(count+1);},2000);};
  window.speechSynthesis.speak(msg);
 } catch(e){
  // TTS 실패 시 벨소리 폴백
  try{var ctx=new AudioContext();var o=ctx.createOscillator();var g=ctx.createGain();
   o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.value=0.3;
   o.start();g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.8);
   setTimeout(function(){o.stop();},800);}catch(e2){}
 }
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
