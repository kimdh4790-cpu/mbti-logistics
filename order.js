/**
 * @module      order.js
 *
 * ══════════════════════════════════════════════════════
 * 📋 이 파일의 역할 & 연결 구조
 * ══════════════════════════════════════════════════════
 * 역할: 고객 QR 주문 (테이블오더)
 *   URL: filo.ai.kr/order?d={dealerId}&t={tableNum}
 *
 * 저장 컬렉션:
 *   filo_orders  — 고객 주문 저장
 *     필드: dealerId, tableNum, items, total, fcmToken,
 *           status(pending/done), createdAt, payType
 *   filo_menus   — 메뉴 목록 조회
 *   filo_members — 회원 포인트·쿠폰 조회
 *
 * FCM 흐름:
 *   1. QR 스캔 → _showFCMGate() 호출
 *   2. 알림 허용 → getToken() → localStorage('filo_fcm_'+did) 저장
 *   3. 주문 시 → filo_orders.fcmToken 필드에 저장
 *   4. 매장에서 준비완료 → filo-table.js _filoSendPickupPush()
 *      → 이 fcmToken으로 FCM 발송
 *   5. 결제 완료 → filo-payment.js _filoSendReceiptPush()
 *      → 동일 fcmToken으로 영수증 알림 (신규)
 *
 *   ⚠️ 주의: _did는 window.onload(32줄)에서 URL params로 세팅
 *            _showFCMGate() 호출 전 반드시 _did 세팅 완료되어야 함
 *
 * 전역변수:
 *   _did        — dealerId (URL params에서)
 *   _tableNum   — 테이블 번호
 *   _fcmToken   — FCM 토큰 (localStorage 또는 신규 발급)
 *   _cartItems  — 장바구니
 *   _lang       — 현재 언어 (ko/en/zh/ja)
 *
 * 주요 함수:
 *   _showFCMGate()     — FCM 알림 허용 팝업 (localStorage 우선 확인)
 *   _doOrder(payType)  — 주문 Firestore 저장 (fcmToken 포함)
 *   _renderMenu()      — 메뉴 화면 렌더링
 *   _applyAIBanner()   — AI 시간대별 추천 배너
 *
 * 연결 파일:
 *   filo-order-common.js — AI추천·다국어·공통 UI
 *   filo-table.js        — 준비완료 → 픽업알림
 *   filo-payment.js      — 결제완료 → 영수증알림
 *   firebase-messaging-sw.js — 백그라운드 수신
 *     type: pickup  → 픽업 알림
 *     type: receipt → 결제 영수증 (신규)
 * ══════════════════════════════════════════════════════
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
  messagingSenderId:'862900137263',
  appId:'1:862900137263:web:a1b2c3d4e5f6a7b8'
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
   }).catch(function(e){_filoToast('❌ 이동 실패: '+e.message);pop.remove();});
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

function _chgQty(name,d){_cartChg(name,d);}

// ── 주문 접수 ─────────────────────────────────────────────────────────────────
function _submitOrder(){
 var items=Object.values(_cart).filter(function(i){return i.qty>0;});
 if(!items.length){_filoToast('🛒 메뉴를 선택해주세요');return;}
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
  // 선불/후불 표기
  var payMsg=document.getElementById('done-pay-msg');
  if(payMsg){
   if(payType==='prepay'){
    payMsg.innerHTML='<span style="display:inline-block;padding:6px 14px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);border-radius:20px;color:#22c55e;font-size:13px;font-weight:700">💳 선결제 완료</span>';
   } else {
    payMsg.innerHTML='<span style="display:inline-block;padding:6px 14px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);border-radius:20px;color:#f59e0b;font-size:13px;font-weight:700">🧾 후불 결제 · 식사 후 카운터에서 결제</span>';
   }
  }
  // 영수증 버튼 문구 구분
  var rcptBtn=document.getElementById('receipt-fcm-btn');
  if(rcptBtn){
   rcptBtn.textContent=payType==='prepay'?'🧾 결제 영수증 받기':'🧾 영수증 알림 받기 (결제 후 발송)';
  }
  // 현재 주문 ID 전역 저장 (FCM 토큰 업데이트용)
  _lastOrderId=ref.id;
  if(dn)dn.style.display='flex';
  if(btn){btn.disabled=false;btn.textContent=_t('order');}
  // 픽업 감지 시작
  _listenPickup(ref.id);
  // localStorage에 주문 ID 저장 (QR 재스캔 이동용)
  try{localStorage.setItem('filo_order_'+_did,ref.id);}catch(e){}
 }).catch(function(e){
  _filoToast('❌ 주문 실패: '+e.message);
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
 if(!_lastOrderId){_filoToast('⚠️ 주문 정보를 찾을 수 없습니다');return;}
 _db.collection('filo_orders').doc(_lastOrderId).update({
  tableNum:newNum,
  tableName:'테이블 '+newNum,
  movedFrom:_tNum,
  movedAt:new Date().toISOString()
 }).then(function(){
  _tNum=newNum;
  var tn=document.getElementById('table-name');if(tn)tn.textContent='테이블 '+newNum;
  _filoToast('✅ 테이블 '+newNum+'번으로 변경됐습니다!');
 }).catch(function(e){_filoToast('❌ 변경 실패: '+e.message);});
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


// ── 영수증 알림 받기 ─────────────────────────────────────────────
function reqReceiptFCM(){
  var btn=document.getElementById('receipt-fcm-btn');
  var st=document.getElementById('receipt-fcm-status');
  if(!btn||btn.dataset.done==='1')return;
  btn.textContent='⏳ 처리 중...';btn.disabled=true;
  st.style.display='block';st.textContent='알림 권한 확인 중...';
  if(!('Notification' in window)){
    st.textContent='이 브라우저는 알림을 지원하지 않아요';
    btn.textContent='🧾 영수증 알림 받기';btn.disabled=false;return;
  }
  Notification.requestPermission().then(function(perm){
    if(perm!=='granted'){
      st.textContent='알림을 허용해야 영수증을 받을 수 있어요';
      btn.textContent='🧾 영수증 알림 받기';btn.disabled=false;return;
    }
    st.textContent='영수증 준비 중...';
    navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/'})
      .then(function(reg){
        return firebase.messaging().getToken({vapidKey:_VAPID_KEY,serviceWorkerRegistration:reg});
      }).then(function(tok){
        if(!tok)throw new Error('토큰 발급 실패');
        try{localStorage.setItem('filo_fcm_'+_did,tok);}catch(e){}
        // filo_orders에 fcmToken 저장 → 직원 후불 결제 시 이 토큰으로 영수증 발송
        if(_lastOrderId){
          _db.collection('filo_orders').doc(_lastOrderId).update({fcmToken:tok}).catch(function(){});
        }
        // 주문확인 푸시 즉시 발송 (영수증 알림 받기 탭 시)
        var dnum=document.getElementById('done-num');
        var numTxt=dnum?dnum.textContent:'';
        var ditems=document.getElementById('done-items');
        var itemsTxt=ditems?ditems.textContent.split('\n').slice(0,2).join(' · '):'';
        return fetch('/fcm/notify-drivers',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            tokens:[tok],
            title:'🧾 주문 확인 · '+numTxt,
            body:itemsTxt||'주문이 접수됐습니다',
            type:'receipt',
            url:location.href
          })
        });
      }).then(function(r){return r.json();})
      .then(function(d){
        if(d.sent>0){
          btn.textContent='✅ 영수증 발송됨';
          btn.style.background='rgba(34,197,94,.08)';
          btn.style.borderColor='rgba(34,197,94,.3)';
          btn.style.color='#16a34a';
          btn.dataset.done='1';
          st.textContent='잠시 후 알림으로 영수증이 전송됩니다 😊';
        }else{throw new Error('발송 실패');}
      }).catch(function(e){
        st.textContent='오류: '+(e.message||'다시 시도해주세요');
        btn.textContent='🧾 영수증 알림 받기';btn.disabled=false;
      });
  });
}
