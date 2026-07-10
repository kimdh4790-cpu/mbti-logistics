/*
 * order.js - FILO 테이블 QR 주문 페이지 스크립트
 * URL: filo.ai.kr/order?d=dealerId&t=tableNum&name=tableName
 * 
 * ⚠️ 수정 시 주의사항:
 * - GitHub에 push하면 자동 배포됨 (GitHub Actions)
 * - KV key: order.js
 * - 관련 파일: order.html (HTML 뼈대), _worker.js (API)
 * 
 * 주요 기능:
 * - 테이블 QR 메뉴 주문 (비로그인 고객용)
 * - 다국어 번역 (/api/translate - Google 무료)
 * - 장바구니 + 주문 접수 (filo_orders type:'table')
 * - 선결제/후불 선택
 * - 직원 호출 (staff_calls 컬렉션)
 * 
 * Firebase: filo_orders, staff_calls 컬렉션 write
 * 비로그인 접근 가능 (고객용)
 * 
 * URL 파라미터:
 * - d: dealerId (매장ID)
 * - t: tableNum (테이블번호)
 * - name: tableName (테이블명, optional)
 */

'use strict';
var _did='', _tNum='', _tName='', _menus=[], _cart={}, _lang='ko';
var _curMdlMenu=null, _tlQtyVal=1, _tlCache={}, _isDelivery=false, _addrFull='';

var _i18n={
 ko:{all:'전체',cart:'🛒 장바구니',order:'주문하기',total:'합계',done:'주문 완료!',
     sub:'잠시 후 준비됩니다',back:'메뉴로 돌아가기',add:'담기',sold:'품절',
     ds:'배달 정보',addr:'📍 주소를 입력해주세요',fab:'주문하기'},
 en:{all:'All',cart:'🛒 Cart',order:'Order Now',total:'Total',done:'Order Placed!',
     sub:'Your order will be ready soon',back:'Back to Menu',add:'Add',sold:'Sold Out',
     ds:'Delivery Info',addr:'📍 Enter address',fab:'Order'},
 zh:{all:'全部',cart:'🛒 购物车',order:'下单',total:'合计',done:'订单已提交！',
     sub:'请稍等',back:'返回菜单',add:'加入',sold:'售罄',
     ds:'配送信息',addr:'📍 输入地址',fab:'下单'},
 ja:{all:'全て',cart:'🛒 カート',order:'注文する',total:'合計',done:'注文完了！',
     sub:'少々お待ちください',back:'メニューに戻る',add:'追加',sold:'売切',
     ds:'配達情報',addr:'📍 住所を入力',fab:'注文'}
};
function _t(k){return(_i18n[_lang]&&_i18n[_lang][k])||_i18n.ko[k]||k;}

var _catIco={
 '전체':'🍽','버거':'🍔','치킨':'🍗','피자':'🍕','분식':'🌶️',
 '음료':'☕','사이드':'🍟','디저트':'🍰','세트':'🎁','한식':'🍱',
 '중식':'🥢','일식':'🍱','양식':'🍝','카페':'☕','기타':'🍽'
};

firebase.initializeApp({
 apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
 authDomain:'mbti-logistics.firebaseapp.com',
 projectId:'mbti-logistics'
});
var _db=firebase.firestore();

function _p(k){return new URLSearchParams(location.search).get(k)||'';}

window.onload=function(){
 _did=_p('d'); _tNum=_p('t');
 _tName=decodeURIComponent(_p('name')||('테이블 '+_tNum));
 _isDelivery=_p('type')==='delivery';

 if(!_did||!_tNum){
  document.getElementById('ld').innerHTML='<div style="text-align:center"><div style="font-size:48px">❌</div><div style="margin-top:12px;color:var(--red);font-weight:700">잘못된 QR 코드입니다</div></div>';
  return;
 }

 document.getElementById('table-name').textContent=_tName;

 // 언어 버튼
 ['ko','en','zh','ja'].forEach(function(l){
  document.getElementById('lb-'+l).onclick=function(){_setLang(l);};
 });

 // 배달 타입이면 배달정보 섹션 표시
 if(_isDelivery){
  document.getElementById('delivery-section').style.display='block';
 }

 fetch('/api/menus?did='+encodeURIComponent(_did))
 .then(function(r){return r.json();})
 .then(function(d){
  _menus=d.menus||[];
  document.getElementById('ld').style.display='none';
  document.getElementById('app').style.display='flex';
  _renderCats();
  _renderMenus('전체');
 })
 .catch(function(){
  document.getElementById('ld').innerHTML='<div style="text-align:center"><div style="font-size:48px">😅</div><div style="margin-top:12px;color:var(--red);font-weight:700">메뉴를 불러올 수 없습니다</div></div>';
 });
};

function _renderCats(){
 var cats=['전체'];
 _menus.forEach(function(m){if(m.category&&cats.indexOf(m.category)<0)cats.push(m.category);});
 var bar=document.getElementById('cat-bar');
 bar.innerHTML='';
 cats.forEach(function(cat,i){
  var btn=document.createElement('button');
  btn.className='cat-btn'+(i===0?' on':'');
  btn.dataset.cat=cat;
  btn.innerHTML='<span class="cat-ico">'+(_catIco[cat]||'🍽')+'</span>'+cat;
  btn.onclick=function(){
   document.querySelectorAll('.cat-btn').forEach(function(b){b.classList.remove('on');});
   btn.classList.add('on');
   _renderMenus(cat);
   document.getElementById('scroll-area').scrollTop=0;
  };
  bar.appendChild(btn);
 });
}

function _renderMenus(cat){
 var grid=document.getElementById('menu-grid');
 grid.innerHTML='';
 var list=cat==='전체'?_menus:_menus.filter(function(m){return m.category===cat;});
 if(!list.length){
  grid.innerHTML='<div class="empty" style="grid-column:1/-1"><div class="empty-ico">🍽</div><div class="empty-msg">메뉴가 없습니다</div></div>';
  return;
 }
 list.forEach(function(m){
  var sold=m.stock!=null&&m.stock<=0;
  var inCart=_cart[m.name]&&_cart[m.name].qty>0;
  var card=document.createElement('div');
  card.className='mi';
  var trId='tr-'+m.name.replace(/\W/g,'_');
  var badgeId='badge-'+m.name.replace(/\W/g,'_');
  if(m.imageUrl){
   // 풀스크린 이미지 카드
   card.innerHTML='<div class="mi-img-wrap">'+
    '<img class="mi-img" src="'+m.imageUrl+'" loading="lazy" alt="'+m.name+'">'+
    '<div class="mi-overlay">'+
    '<div class="mi-name-img">'+m.name+'</div>'+
    '<div class="mi-tr-img" id="'+trId+'"></div>'+
    '<div class="mi-price-img">₩'+(m.price||0).toLocaleString()+'</div>'+
    '</div></div>'+
    '<div class="mi-badge'+(inCart?' on':'')+'" id="'+badgeId+'">'+(inCart?_cart[m.name].qty:'')+'</div>';
  } else {
   // 이모지 카드
   card.innerHTML='<div class="mi-emoji-wrap"><div class="mi-emoji">'+(m.emoji||'🍽')+'</div></div>'+
    '<div class="mi-body">'+
    '<div class="mi-name">'+m.name+'</div>'+
    '<div class="mi-tr" id="'+trId+'"></div>'+
    '<div class="mi-price">₩'+(m.price||0).toLocaleString()+'</div>'+
    '</div>'+
    '<div class="mi-badge'+(inCart?' on':'')+'" id="'+badgeId+'">'+(inCart?_cart[m.name].qty:'')+'</div>';
  }
  if(sold){
   card.innerHTML+='<div class="mi-sold">'+_t('sold')+'</div>';
  } else {
   (function(menu){card.onclick=function(){_openMdl(menu);};})(m);
  }
  grid.appendChild(card);
 });
}

function _openMdl(m){
 _curMdlMenu=m;
 _tlQtyVal=1;
 var mdlBox=document.getElementById('mdl-box');
 // 이미지/이모지 헤더 교체
 var oldHdr=mdlBox.querySelector('.mdl-img-full,.mdl-emoji');
 if(oldHdr)oldHdr.remove();
 var mdlContent=mdlBox.querySelector('.mdl-content');
 if(m.imageUrl){
  var img=document.createElement('img');
  img.className='mdl-img-full';
  img.src=m.imageUrl;
  img.alt=m.name;
  mdlBox.insertBefore(img,mdlContent);
 } else {
  var emojiEl=document.createElement('div');
  emojiEl.className='mdl-emoji';
  emojiEl.textContent=m.emoji||'🍽';
  mdlBox.insertBefore(emojiEl,mdlContent);
 }
 document.getElementById('mdl-name').textContent=m.name;
 document.getElementById('mdl-price').textContent='₩'+(m.price||0).toLocaleString();
 document.getElementById('tl-qty').textContent='1';
 document.getElementById('mdl-add').textContent='담기 — ₩'+(m.price||0).toLocaleString();
 document.getElementById('mdl-tr').textContent='';
 document.getElementById('mdl-desc').textContent=m.description||'';
 document.getElementById('mdl').classList.add('open');

 // 번역 (한국어 아닐 때)
 if(_lang!=='ko'){
  var ck=m.name+'_'+_lang;
  if(_tlCache[ck]){
   document.getElementById('mdl-tr').textContent=_tlCache[ck];
  } else {
   document.getElementById('mdl-tr').innerHTML='<span class="tl-spin"></span>';
   fetch('/api/translate',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:m.name,lang:_lang})
   }).then(function(r){return r.json();})
   .then(function(d){
    var t=d.translated||m.name;
    _tlCache[ck]=t;
    if(_curMdlMenu&&_curMdlMenu.name===m.name){
     document.getElementById('mdl-tr').textContent=t;
    }
   }).catch(function(){document.getElementById('mdl-tr').textContent='';});
  }
 }
 // 설명 번역
 if(m.description){
  var dk=m.name+'_desc_'+_lang;
  var descEl=document.getElementById('mdl-desc');
  if(_tlCache[dk]){descEl.textContent=_tlCache[dk];}
  else{
   fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:m.description,lang:_lang})})
   .then(function(r){return r.json();})
   .then(function(d){var t=d.translated||m.description;_tlCache[dk]=t;descEl.textContent=t;})
   .catch(function(){});
  }
 }
}

function _closeMdl(){
 document.getElementById('mdl').style.display='none';
 _curMdlMenu=null;
}

function _tlQty(d){
 _tlQtyVal=Math.max(1,(_tlQtyVal||1)+d);
 document.getElementById('tl-qty').textContent=_tlQtyVal;
 if(_curMdlMenu) document.getElementById('mdl-add').textContent='담기 — ₩'+((_curMdlMenu.price||0)*_tlQtyVal).toLocaleString();
}

function _addFromMdl(){
 if(_curMdlMenu) _addToCart(_curMdlMenu);
 _closeMdl();
}

function _addToCart(m){
 if(!_cart[m.name]) _cart[m.name]={name:m.name,price:m.price,qty:0,emoji:m.emoji||'🍽'};
 _cart[m.name].qty++;
 _updBadge(m.name);
 _updFab();
}

function _updBadge(name){
 var key=name.replace(/\W/g,'_');
 var badge=document.getElementById('badge-'+key);
 if(badge){
  var q=(_cart[name]&&_cart[name].qty)||0;
  badge.textContent=q;
  badge.className='mi-badge'+(q>0?' on':'');
 }
}

function _updFab(){
 var total=0,cnt=0;
 Object.values(_cart).forEach(function(i){total+=i.price*i.qty;cnt+=i.qty;});
 var fab=document.getElementById('cart-fab');
 if(cnt>0){
  fab.classList.add('show');
  document.getElementById('fab-cnt').textContent=cnt;
  document.getElementById('fab-price').textContent='₩'+total.toLocaleString();
  document.getElementById('fab-label').textContent=_t('fab');
 } else {
  fab.classList.remove('show');
 }
}

function _openCart(){
 var list=document.getElementById('cart-list');
 list.innerHTML='';
 var total=0;
 var items=Object.values(_cart).filter(function(i){return i.qty>0;});
 if(!items.length){
  list.innerHTML='<div class="empty"><div class="empty-ico">🛒</div><div class="empty-msg">장바구니가 비어있습니다</div></div>';
 } else {
  items.forEach(function(item){
   total+=item.price*item.qty;
   var row=document.createElement('div');
   row.className='ci';
   var emoji=document.createElement('div');emoji.className='ci-emoji';emoji.textContent=item.emoji;
   var name=document.createElement('div');name.className='ci-name';name.textContent=item.name;
   var ctrl=document.createElement('div');ctrl.className='ci-ctrl';
   var bm=document.createElement('button');bm.textContent='−';
   var qs=document.createElement('div');qs.className='ci-qty';qs.textContent=item.qty;
   var bp=document.createElement('button');bp.textContent='+';
   (function(n){
    bm.onclick=function(){_chgQty(n,-1);};
    bp.onclick=function(){_chgQty(n,1);};
   })(item.name);
   ctrl.appendChild(bm);ctrl.appendChild(qs);ctrl.appendChild(bp);
   var price=document.createElement('div');price.className='ci-price';
   price.textContent='₩'+(item.price*item.qty).toLocaleString();
   row.appendChild(emoji);row.appendChild(name);row.appendChild(ctrl);row.appendChild(price);
   list.appendChild(row);
  });
 }
 document.getElementById('total-price').textContent='₩'+total.toLocaleString();
 document.getElementById('cart-sheet').classList.add('open');
 document.getElementById('overlay').style.display='block';
}

function _closeCart(){
 document.getElementById('cart-sheet').classList.remove('open');
 document.getElementById('overlay').style.display='none';
}

function _chgQty(name,d){
 if(!_cart[name])return;
 _cart[name].qty+=d;
 if(_cart[name].qty<=0)delete _cart[name];
 _updBadge(name);
 _updFab();
 _openCart();
 if(!Object.keys(_cart).filter(function(k){return _cart[k].qty>0;}).length)_closeCart();
}

function _openAddrPopup(){
 document.getElementById('addr-popup').classList.add('open');
 setTimeout(function(){document.getElementById('ap-addr').focus();},100);
}
function _closeAddrPopup(){document.getElementById('addr-popup').classList.remove('open');}
function _confirmAddr(){
 var addr=document.getElementById('ap-addr').value.trim();
 var detail=document.getElementById('ap-detail').value.trim();
 if(!addr){alert('주소를 입력해주세요');return;}
 _addrFull=addr+(detail?' '+detail:'');
 document.getElementById('addr-btn').textContent='📍 '+_addrFull;
 document.getElementById('addr-btn').style.color='var(--text1)';
 _closeAddrPopup();
}

function _submitOrder(){
 var items=Object.values(_cart).filter(function(i){return i.qty>0;});
 if(!items.length){alert('메뉴를 선택해주세요');return;}

 // 배달 타입이면 주소/이름/전화 체크
 if(_isDelivery){
  if(!_addrFull){alert('배달 주소를 입력해주세요');return;}
  var name=document.getElementById('cust-name').value.trim();
  var phone=document.getElementById('cust-phone').value.trim();
  if(!name){alert('이름을 입력해주세요');return;}
  if(!phone){alert('연락처를 입력해주세요');return;}
 }

 // 결제 모달 오픈
 var total=items.reduce(function(s,i){return s+i.price*i.qty;},0);
 document.getElementById('pay-total-amt').textContent='₩'+total.toLocaleString();
 document.getElementById('pay-mdl').classList.add('open');
}

function _closePayMdl(){
 document.getElementById('pay-mdl').classList.remove('open');
}

function _doOrder(payType){
 _closePayMdl();
 var items=Object.values(_cart).filter(function(i){return i.qty>0;});
 if(!items.length){return;}

 var total=items.reduce(function(s,i){return s+i.price*i.qty;},0);
 var btn=document.getElementById('order-btn');
 btn.disabled=true;btn.textContent='주문 중...';

 var data={
  dealerId:_did,
  tableNum:parseInt(_tNum)||_tNum,
  tableName:_tName,
  type:_isDelivery?'delivery':'table',
  status:'pending',
  payType:payType||'postpay',
  items:items,
  total:total,
  createdAt:new Date().toISOString()
 };
 if(_isDelivery){
  data.address=_addrFull;
  data.customer=document.getElementById('cust-name').value.trim();
  data.phone=document.getElementById('cust-phone').value.trim();
  data.memo=document.getElementById('cust-memo').value.trim();
 }

 _db.collection('filo_orders').add(data)
 .then(function(ref){
  _closeCart();
  var doneItems=items.map(function(i){return i.emoji+' '+i.name+' ×'+i.qty;}).join('\n');
  document.getElementById('done-num').textContent='주문번호 #'+ref.id.slice(-6).toUpperCase();
  document.getElementById('done-items').textContent=doneItems;
  document.getElementById('done').style.display='flex';
 })
 .catch(function(e){
  alert('주문 실패: '+e.message);
  btn.disabled=false;btn.textContent=_t('order');
 });
}

function _setLang(l){
 _lang=l;
 ['ko','en','zh','ja'].forEach(function(x){
  document.getElementById('lb-'+x).classList.toggle('on',x===l);
 });
 document.getElementById('cart-title').textContent=_t('cart');
 document.getElementById('total-label').textContent=_t('total');
 document.getElementById('order-btn').textContent=_t('order');
 document.getElementById('done-title').textContent=_t('done');
 document.getElementById('done-sub').textContent=_t('sub');
 document.getElementById('done-back').textContent=_t('back');
 document.getElementById('fab-label').textContent=_t('fab');
 if(document.getElementById('ds-title'))document.getElementById('ds-title').textContent=_t('ds');
 document.getElementById('addr-btn').textContent=_addrFull?'📍 '+_addrFull:_t('addr');
 // 메뉴 품절 텍스트 갱신
 document.querySelectorAll('.mi-sold').forEach(function(s){s.textContent=_t('sold');});
}
function _callStaff(){
 var toast=document.getElementById('call-toast');
 toast.style.display='block';
 setTimeout(function(){toast.style.display='none';},3000);
 if(_did){
  var db=firebase.firestore();
  db.collection('staff_calls').add({
   dealerId:_did,
   tableNum:_tNum||'',
   tableName:_tName||'',
   type:'table',
   status:'pending',
   createdAt:new Date().toISOString()
  }).catch(function(){});
 }
 var btn=document.getElementById('call-btn');
 btn.style.opacity='.4';btn.style.pointerEvents='none';
 setTimeout(function(){btn.style.opacity='1';btn.style.pointerEvents='';},30000);
}
