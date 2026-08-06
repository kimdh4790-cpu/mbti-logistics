/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      store.js
 * @description 매장정보·메뉴표시·키오스크
 */
// 키 발급 후 여기에 입력 (live_ck_... 또는 test_ck_...)
var TOSS_CLIENT_KEY = '';

// ── 전역 변수 ─────────────────────────────────────────────────────────────────
var _did='', _slug='';
var _menus=[], _cart={}, _lang='ko';
var _tlCache={}, _curMdlMenu=null, _tlQtyVal=1;
var _addr='', _addrFull='';
var _db=null;

/* ── 매장 업종 테마 적용 ──────────────────────────────────────────────────── */
function _applyStoreTheme(co){
 var THEMES={
  cafe:{primary:'#c8a96e',bg:'#1a1209'},korean:{primary:'#e05555',bg:'#0f0a0a'},
  japanese:{primary:'#3b82f6',bg:'#0a0f1e'},chinese:{primary:'#f59e0b',bg:'#1a0a0a'},
  fastfood:{primary:'#f97316',bg:'#f8f9fa'},izakaya:{primary:'#d4af37',bg:'#0a0a0a'},
  other:{primary:'#7c3aed',bg:'#07071a'}
 };
 var base=THEMES[co.theme||'']||THEMES.other;
 var primary=co.primaryColor||base.primary;
 var bg=co.bgColor||base.bg;
 if(!co.theme&&!co.primaryColor&&!co.bgColor)return;
 function _hx(hex){var h=String(hex||'').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var n=parseInt(h,16);return isFinite(n)&&h.length===6?{r:(n>>16)&255,g:(n>>8)&255,b:n&255}:null;}
 function _sh(hex,a){var c=_hx(hex);if(!c)return hex;function f(v){return Math.max(0,Math.min(255,Math.round(v+(a>0?(255-v):v)*a)));}function hh(v){var s=v.toString(16);return s.length<2?'0'+s:s;}return '#'+hh(f(c.r))+hh(f(c.g))+hh(f(c.b));}
 function _il(hex){var c=_hx(hex);return c?(0.299*c.r+0.587*c.g+0.114*c.b)>160:false;}
 function _rgb(hex){var c=_hx(hex);return c?c.r+','+c.g+','+c.b:'8,145,178';}
 var light=_il(bg);
 var S=function(k,v){document.documentElement.style.setProperty(k,v);};
 S('--brand',primary);
 S('--brand-dark',_sh(primary,-0.15));
 S('--brand-light','rgba('+_rgb(primary)+',.12)');
 S('--bg',bg);
 S('--surface',light?_sh(bg,-0.04):_sh(bg,0.06));
 S('--border',light?'rgba(0,0,0,.08)':'rgba(255,255,255,.08)');
 S('--text1',light?'#14141f':'#f0f0ff');
 S('--text2',light?'#4b5563':'#9898c0');
 S('--text3',light?'#6b7280':'#565678');
 S('--shadow','0 2px 12px rgba('+_rgb(primary)+',.18)');
 S('--shadow-lg','0 8px 32px rgba('+_rgb(primary)+',.28)');
 var ld=document.getElementById('ld');
 if(ld)ld.style.background='linear-gradient(135deg,'+primary+' 0%,'+_sh(primary,-0.2)+' 100%)';
}

// ── i18n (배달 전용) ──────────────────────────────────────────────────────────
var _i18n_store={
 ko:{menu:'메뉴',delivery:'배달정보',order:'주문하기',total:'합계',
     done:'주문이 접수됐습니다!',sub:'곧 배달을 시작합니다.',back:'다시 주문하기'},
 en:{menu:'Menu',delivery:'Delivery Info',order:'Order Now',total:'Total',
     done:'Order Received!',sub:'Delivery will start soon.',back:'Order Again'},
 zh:{menu:'菜单',delivery:'配送信息',order:'下单',total:'合计',
     done:'订单已接收！',sub:'即将开始配送.',back:'再次订购'},
 ja:{menu:'メニュー',delivery:'配達情報',order:'注文する',total:'合計',
     done:'注文を受け付けました！',sub:'まもなく配達を開始します.',back:'もう一度注文'}
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
  document.getElementById('ld').innerHTML='<div style="text-align:center;padding:40px;color:#fff"><div style="font-size:14px;margin-bottom:8px">오류</div><div>잘못된 주소입니다</div></div>';
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
  // 매장 테마 로드
  _db.collection('companies').doc(_did).get().then(function(snap){
   if(snap.exists)_applyStoreTheme(snap.data());
  }).catch(function(){});
 }).catch(function(e){
  document.getElementById('ld').innerHTML='<div style="text-align:center;padding:40px;color:#fff"><div style="font-size:14px;margin-bottom:8px;color:#fbbf24">오류</div><div>'+e.message+'</div></div>';
 });
};

// ── 메뉴 로드 ─────────────────────────────────────────────────────────────────

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
// ── 배달/픽업 주문 제출 (store.html 전용) ──────────────
function _submitOrder(){
 var name=(document.getElementById('cust-name')||{}).value||'';
 var phone=(document.getElementById('cust-phone')||{}).value||'';
 var memo=(document.getElementById('cust-memo')||{}).value||'';
 name=name.trim();phone=phone.trim();memo=memo.trim();
 if(!_addrFull&&!_addr){_filoToast('배달 주소를 입력해주세요');return;}
 if(!name){_filoToast('이름을 입력해주세요');return;}
 if(!phone){_filoToast('연락처를 입력해주세요');return;}
 var items=Object.values(_cart).filter(function(i){return i.qty>0;});
 if(!items.length){_filoToast('메뉴를 선택해주세요');return;}
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
  }).catch(function(e){if(e.code!=='USER_CANCEL')_filoToast('결제 오류: '+e.message);});
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
  _filoToast('주문 실패: '+e.message);
  var btn=document.getElementById('order-btn');
  if(btn){btn.disabled=false;btn.textContent=_ts('order');}
 });
}

// ── 언어 변경 (배달 UI 텍스트 포함) ──────────────────────────────────────────
