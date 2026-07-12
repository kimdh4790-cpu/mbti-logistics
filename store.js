/*
 * store.js - FILO 배달 주문 페이지 v3
 * URL: filo.ai.kr/store/:slug
 *
 * ⚠️ 수정 시 주의사항:
 * - GitHub push → 자동배포 (GitHub Actions → KV)
 * - 공통 로직: filo-order-common.js 참조
 * - 관련: store.html, _worker.js
 * - GitHub Token: ghp_***참조:secrets*** (기한없음)
 *
 * 배달 전용 기능:
 * - 배달/픽업 탭 (_switchTab)
 * - 주소 입력 (_openAddrPopup - common)
 * - 토스페이먼츠 결제 (TOSS_CLIENT_KEY 입력 시 활성화)
 * - 주문 저장 (_saveOrder)
 *
 * 번역: filo_menus.nameTranslations 우선 → Anthropic 재시도3회 → Google 폴백
 * Firebase: filo_orders write (비로그인)
 */

// ── 토스페이먼츠 설정 ──────────────────────────────────────────────────────────
// 키 발급 후 여기에 입력 (live_ck_... 또는 test_ck_...)
var TOSS_CLIENT_KEY = '';

// ── 전역 변수 ─────────────────────────────────────────────────────────────────
var _did='', _slug='';
var _menus=[], _cart={}, _lang='ko';
var _tlCache={}, _curMdlMenu=null, _tlQtyVal=1;
var _addr='', _addrFull='';
var _db=null;

// ── i18n (배달 전용) ──────────────────────────────────────────────────────────
var _i18n_store={
 ko:{menu:'🍽 메뉴',delivery:'📍 배달정보',order:'주문하기',total:'합계',
     done:'주문이 접수됐습니다!',sub:'곧 배달을 시작합니다 🛵',back:'다시 주문하기'},
 en:{menu:'🍽 Menu',delivery:'📍 Delivery Info',order:'Order Now',total:'Total',
     done:'Order Received!',sub:'Delivery will start soon 🛵',back:'Order Again'},
 zh:{menu:'🍽 菜单',delivery:'📍 配送信息',order:'下单',total:'合计',
     done:'订单已接收！',sub:'即将开始配送 🛵',back:'再次订购'},
 ja:{menu:'🍽 メニュー',delivery:'📍 配達情報',order:'注文する',total:'合計',
     done:'注文を受け付けました！',sub:'まもなく配達を開始します 🛵',back:'もう一度注文'}
};
function _ts(k){return(_i18n_store[_lang]&&_i18n_store[_lang][k])||_i18n_store.ko[k]||k;}

// ── 초기화 ────────────────────────────────────────────────────────────────────
window.onload=function(){
 firebase.initializeApp({
  apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
  authDomain:'mbti-logistics.firebaseapp.com',
  projectId:'mbti-logistics'
 });
 _db=firebase.firestore();
 _slug=location.pathname.replace(/^\/store\/?/,'').replace(/\/$/,'').trim()||_p('id')||_p('slug');
 if(!_slug){
  document.getElementById('ld').innerHTML='<div style="text-align:center;padding:40px;color:#fff"><div style="font-size:48px">❌</div><div>잘못된 주소입니다</div></div>';
  return;
 }
 fetch('/api/store?slug='+encodeURIComponent(_slug))
 .then(function(r){return r.json();})
 .then(function(data){
  if(data.error)throw new Error(data.error);
  var d=data.store;
  _did=d.id;
  var nm=document.getElementById('store-name');if(nm)nm.textContent=d.name||'매장';
  var sb=document.getElementById('store-sub');if(sb)sb.textContent=d.address||'배달 · 픽업';
  document.title=(d.name||'매장')+' - 주문하기';
  document.getElementById('ld').style.display='none';
  document.getElementById('app').style.display='flex';
  document.getElementById('cat-wrap').style.display='';
  _loadMenus();
 }).catch(function(e){
  document.getElementById('ld').innerHTML='<div style="text-align:center;padding:40px;color:#fff"><div style="font-size:48px">😅</div><div>'+e.message+'</div></div>';
 });
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

// ── 탭 전환 ───────────────────────────────────────────────────────────────────
function _switchTab(tab){
 var isMenu=tab==='menu';
 document.getElementById('tab-menu').classList.toggle('on',isMenu);
 document.getElementById('tab-delivery').classList.toggle('on',!isMenu);
 var cw=document.getElementById('cat-wrap');if(cw)cw.style.display=isMenu?'':'none';
 var sa=document.getElementById('scroll-area');if(sa)sa.style.display=isMenu?'':'none';
 var dt=document.getElementById('delivery-tab');if(dt)dt.style.display=isMenu?'none':'flex';
}

// ── 모달 열기/닫기 ────────────────────────────────────────────────────────────
function _openMdl(m){_openMdlCommon(m);}
function _closeTlMdl(){
 document.getElementById('tl-mdl').classList.remove('open');
 _curMdlMenu=null;
}

// ── 장바구니에 담기 ───────────────────────────────────────────────────────────
function _addFromTlMdl(){
 if(!_curMdlMenu)return;
 for(var i=0;i<_tlQtyVal;i++)_add(_curMdlMenu);
 _closeTlMdl();
}

function _add(m){
 if(!_cart[m.name])_cart[m.name]={name:m.name,price:m.price,qty:0,emoji:m.emoji||'🍽',imageUrl:m.imageUrl||''};
 _cart[m.name].qty++;
 _updFab();
}

function _chg(name,d){_cartChg(name,d);}

// ── 주문 접수 ─────────────────────────────────────────────────────────────────
function _submitOrder(){
 var name=(document.getElementById('cust-name')||{}).value||'';
 var phone=(document.getElementById('cust-phone')||{}).value||'';
 var memo=(document.getElementById('cust-memo')||{}).value||'';
 name=name.trim();phone=phone.trim();memo=memo.trim();
 if(!_addrFull&&!_addr){alert('배달 주소를 입력해주세요');return;}
 if(!name){alert('이름을 입력해주세요');return;}
 if(!phone){alert('연락처를 입력해주세요');return;}
 var items=Object.values(_cart).filter(function(i){return i.qty>0;});
 if(!items.length){alert('메뉴를 선택해주세요');return;}
 var total=items.reduce(function(s,i){return s+i.price*i.qty;},0);
 var fullAddr=_addrFull||_addr;

 // 토스페이먼츠 결제
 if(TOSS_CLIENT_KEY&&window.TossPayments){
  var toss=window.TossPayments(TOSS_CLIENT_KEY);
  var orderId='filo-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
  var orderName=items[0].name+(items.length>1?' 외 '+(items.length-1)+'건':'');
  toss.requestPayment('카드',{
   amount:total,orderId:orderId,orderName:orderName,
   customerName:name,customerMobilePhone:phone,
   successUrl:location.origin+'/payment/success?did='+_did+'&addr='+encodeURIComponent(fullAddr)+'&memo='+encodeURIComponent(memo)+'&name='+encodeURIComponent(name)+'&phone='+encodeURIComponent(phone),
   failUrl:location.origin+'/payment/fail'
  }).catch(function(e){if(e.code!=='USER_CANCEL')alert('결제 오류: '+e.message);});
  return;
 }

 // 키 없을 때 바로 접수 (테스트)
 var btn=document.getElementById('order-btn');if(btn){btn.disabled=true;btn.textContent='주문 중...';}
 _saveOrder(name,phone,memo,fullAddr,items,total,'pending','none');
}

function _saveOrder(name,phone,memo,addr,items,total,status,payMethod){
 var now=new Date();
 var orderData={
  dealerId:_did,type:'delivery',status:status,
  payMethod:payMethod,payType:'prepay',
  items:items,total:total,
  customer:name,phone:phone,
  address:addr,memo:memo,
  createdAt:now.toISOString(),
  date:now.toISOString().slice(0,10)
 };
 _db.collection('filo_orders').add(orderData).then(function(ref){
  _closeCart();_cart={};_updFab();
  var dn=document.getElementById('dn');
  var dnSub=document.getElementById('dn-sub');
  if(dnSub)dnSub.textContent='주문번호 #'+ref.id.slice(-6).toUpperCase();
  if(dn)dn.style.display='flex';
  // filo_sales에도 저장 (DINE 매출 연동)
  _db.collection('filo_sales').add(Object.assign({},orderData,{
   source:'store',
   orderId:ref.id,
   status:status==='paid'?'done':'pending'
  })).catch(function(e){console.warn('[filo_sales] 저장 실패:',e.message);});
 }).catch(function(e){
  alert('주문 실패: '+e.message);
  var btn=document.getElementById('order-btn');
  if(btn){btn.disabled=false;btn.textContent=_ts('order');}
 });
}

// ── 언어 변경 (배달 UI 텍스트 포함) ──────────────────────────────────────────
