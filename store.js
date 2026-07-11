/*
 * store.js - FILO 배달 주문 페이지 스크립트
 * URL: filo.ai.kr/store/:slug
 * 
 * ⚠️ 수정 시 주의사항:
 * - GitHub에 push하면 자동 배포됨 (GitHub Actions)
 * - KV key: store.js
 * - 관련 파일: store.html (HTML 뼈대), _worker.js (API)
 * 
 * 주요 기능:
 * - 메뉴 로드 및 렌더링 (/api/menus)
 * - 다국어 번역 (/api/translate - Google 무료)
 * - 장바구니 + 주문 접수 (filo_orders)
 * - 배달 주소 입력
 * - 메뉴 상세 모달 (수량 선택)
 * 
 * Firebase: filo_orders 컬렉션 write
 * 비로그인 접근 가능 (고객용)
 */

var _did='', _slug='', _menus=[], _cart={}, _lang='ko', _addr='', _addrFull='';
var _tlCache={}, _curMdlMenu=null, _tlQtyVal=1;

var _i18n={
 ko:{menu:'🍽 메뉴',delivery:'📍 배달정보',order:'주문하기',total:'합계',done:'주문이 접수됐습니다!',sub:'매장에서 확인 후 배달을 시작합니다',back:'다시 주문하기'},
 en:{menu:'🍽 Menu',delivery:'📍 Delivery Info',order:'Order Now',total:'Total',done:'Order Received!',sub:'Store will confirm and start delivery',back:'Order Again'},
 zh:{menu:'🍽 菜单',delivery:'📍 配送信息',order:'下单',total:'合计',done:'订单已接收！',sub:'商家确认后开始配送',back:'再次订购'},
 ja:{menu:'🍽 メニュー',delivery:'📍 配達情報',order:'注文する',total:'合計',done:'注文を受け付けました！',sub:'店舗確認後に配達を開始します',back:'もう一度注文'}
};
function _t(k){return(_i18n[_lang]&&_i18n[_lang][k])||_i18n.ko[k]||k;}

var _db=null;

function _p(k){return new URLSearchParams(location.search).get(k)||'';}

window.onload=function(){
 firebase.initializeApp({
  apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
  authDomain:'mbti-logistics.firebaseapp.com',
  projectId:'mbti-logistics'
 });
 _db=firebase.firestore();
 _slug=location.pathname.replace('/store/','').replace('/store','').replace('/','').trim();
 if(!_slug) _slug=_p('id')||_p('slug');
 if(!_slug){
  document.getElementById('ld').innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px">❌</div><div style="margin-top:12px;color:#ef4444;font-size:14px">잘못된 주소입니다</div></div>';
  return;
 }
 fetch('/api/store?slug='+encodeURIComponent(_slug))
 .then(function(r){return r.json();})
 .then(function(data){
  if(data.error) throw new Error(data.error);
  var d=data.store;
  _did=d.id;
  document.getElementById('store-name').textContent=d.name||'매장';
  document.getElementById('store-sub').textContent=d.address||'배달 · 픽업';
  document.title=(d.name||'매장')+' - 주문하기';
  document.getElementById('ld').style.display='none';
  document.getElementById('app').style.display='flex';
  document.getElementById('cat-wrap').style.display='';
  ['ko','en','zh','ja'].forEach(function(l){
   document.getElementById('lb-'+l).onclick=function(){_setLang(l);};
  });
  _loadMenus();
 })
 .catch(function(e){
  document.getElementById('ld').innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px">😅</div><div style="margin-top:12px;color:#ef4444;font-size:14px">'+e.message+'</div></div>';
 });
};

function _loadMenus(){
 fetch('/api/menus?did='+encodeURIComponent(_did))
 .then(function(r){return r.json();})
 .then(function(d){_menus=d.menus||[];_renderMenus();})
 .catch(function(){document.getElementById('menu-grid').innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:#94a3b8">메뉴를 불러올 수 없습니다</div>';});
}

var _catIco={'전체':'🍽','버거':'🍔','치킨':'🍗','피자':'🍕','분식':'🌶️','음료':'☕','사이드':'🍟','디저트':'🍰','세트':'🎉','카페':'☕','한식':'🍱','기타':'🍽'};

function _renderMenus(){
 var cats=['전체'];
 _menus.forEach(function(m){if(m.category&&cats.indexOf(m.category)<0)cats.push(m.category);});
 var bar=document.getElementById('cat-bar');
 bar.innerHTML='';
 cats.forEach(function(cat,i){
  var btn=document.createElement('button');
  btn.className='cat-btn'+(i===0?' on':'');
  btn.dataset.cat=cat;
  btn.innerHTML='<span class="ci">'+(_catIco[cat]||'🍽')+'</span><span>'+cat+'</span>';
  btn.onclick=function(){
   document.querySelectorAll('.cat-btn').forEach(function(b){b.classList.remove('on');});
   btn.classList.add('on');
   document.querySelectorAll('.mi').forEach(function(item){
    item.style.display=(cat==='전체'||item.dataset.cat===cat)?'':'none';
   });
   document.getElementById('scroll-area').scrollTop=0;
  };
  bar.appendChild(btn);
 });
 var grid=document.getElementById('menu-grid');
 grid.innerHTML='';
 _menus.forEach(function(m){
  var item=document.createElement('div');
  item.className='mi';
  item.dataset.cat=m.category||'기타';
  var trId='tr-'+m.name.replace(/\W/g,'_');
  var badgeId='sc-'+m.name.replace(/\W/g,'');
  var inCart=_cart[m.name]&&_cart[m.name].qty>0;
  if(m.imageUrl){
   item.innerHTML='<div class="mi-img-wrap">'+
    '<img class="mi-img" src="'+m.imageUrl+'" loading="lazy" alt="'+m.name+'">'+
    '<div class="mi-overlay">'+
    '<div class="mi-name-img">'+m.name+'</div>'+
    '<div class="mi-tr-img" id="'+trId+'"></div>'+
    '<div class="mi-price-img">₩'+(m.price||0).toLocaleString()+'</div>'+
    '</div></div>'+
    '<div class="mi-badge'+(inCart?' on':'')+'" id="'+badgeId+'">'+(inCart?_cart[m.name].qty:'')+'</div>';
  } else {
   item.innerHTML='<div class="mi-emoji-wrap"><div class="mi-emoji">'+(m.emoji||'🍽')+'</div></div>'+
    '<div class="mi-body">'+
    '<div class="mi-name">'+m.name+'</div>'+
    '<div class="mi-tr" id="'+trId+'"></div>'+
    '<div class="mi-price">₩'+(m.price||0).toLocaleString()+'</div>'+
    '</div>'+
    '<div class="mi-badge'+(inCart?' on':'')+'" id="'+badgeId+'">'+(inCart?_cart[m.name].qty:'')+'</div>';
  }
  (function(menu){item.onclick=function(){_openMdl(menu);};})(m);
  grid.appendChild(item);
 });
}

function _openMdl(m){
 _curMdlMenu=m;
 _tlQtyVal=1;
 // 이미지/이모지 헤더 교체
 var tlBox=document.getElementById('tl-box');
 var oldHdr=tlBox.querySelector('.mdl-img-full,.mdl-emoji');
 if(oldHdr)oldHdr.remove();
 var mdlContent=tlBox.querySelector('.mdl-content');
 if(m.imageUrl){
  var img=document.createElement('img');
  img.className='mdl-img-full';
  img.src=m.imageUrl;
  img.alt=m.name;
  tlBox.insertBefore(img,mdlContent);
 } else {
  var emojiEl=document.createElement('div');
  emojiEl.className='mdl-emoji';
  emojiEl.textContent=m.emoji||'🍽';
  tlBox.insertBefore(emojiEl,mdlContent);
 }
 document.getElementById('tl-name').textContent=m.name;
 document.getElementById('tl-price').textContent='₩'+(m.price||0).toLocaleString();
 document.getElementById('tl-qty').textContent='1';
 document.getElementById('tl-add').textContent='담기 — ₩'+(m.price||0).toLocaleString();
 document.getElementById('tl-mdl').classList.add('open');
 document.getElementById('tl-tr').textContent='';
 // 설명 표시
 var descEl=document.getElementById('tl-desc');
 descEl.textContent=m.description||'';
 if(_lang==='ko') return;
 var ck=m.name+'_'+_lang;
 if(_tlCache[ck]){document.getElementById('tl-tr').textContent=_tlCache[ck];return;}
 document.getElementById('tl-tr').innerHTML='<span class="tl-spin"></span>';
 fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:m.name,lang:_lang})})
 .then(function(r){return r.json();})
 .then(function(d){
  var t=d.translated||m.name;
  _tlCache[ck]=t;
  if(_curMdlMenu&&_curMdlMenu.name===m.name) document.getElementById('tl-tr').textContent=t;
 }).catch(function(e){document.getElementById('tl-tr').textContent='ERR:'+e.message;});
 // 설명 번역
 if(m.description){
  var dk=m.name+'_desc_'+_lang;
  if(_tlCache[dk]){descEl.textContent=_tlCache[dk];}
  else{
   fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:m.description,lang:_lang})})
   .then(function(r){return r.json();})
   .then(function(d){
    var t=d.translated||m.description;
    _tlCache[dk]=t;
    if(_curMdlMenu&&_curMdlMenu.name===m.name) descEl.textContent=t;
   }).catch(function(){});
  }
 }
}

function _tlQty(d){
 _tlQtyVal=Math.max(1,_tlQtyVal+d);
 document.getElementById('tl-qty').textContent=_tlQtyVal;
 if(_curMdlMenu) document.getElementById('tl-add').textContent='담기 — ₩'+((_curMdlMenu.price||0)*_tlQtyVal).toLocaleString();
}

function _closeTlMdl(){
 document.getElementById('tl-mdl').classList.remove('open');
 _curMdlMenu=null;
}

function _addFromTlMdl(){
 if(_curMdlMenu){
  for(var i=0;i<_tlQtyVal;i++) _add(_curMdlMenu);
 }
 _closeTlMdl();
}

function _add(m){
 if(!_cart[m.name]) _cart[m.name]={name:m.name,price:m.price,qty:0,emoji:m.emoji||'🍽'};
 _cart[m.name].qty++;
 var el=document.getElementById('sc-'+m.name.replace(/\W/g,''));
 if(el){el.textContent=_cart[m.name].qty;el.className='mc on';}
 _updBtn();
}

function _updBtn(){
 var total=0,cnt=0;
 Object.values(_cart).forEach(function(i){total+=i.price*i.qty;cnt+=i.qty;});
 var btn=document.getElementById('cart-btn');
 if(cnt>0){
  btn.style.display='block';
  document.getElementById('fab-cnt').textContent=cnt;
  document.getElementById('cart-fab').textContent='₩'+total.toLocaleString();
 } else {
  btn.style.display='none';
 }
}

function _openCart(){
 var list=document.getElementById('cart-list');
 list.innerHTML='';
 var total=0;
 Object.values(_cart).forEach(function(item){
  if(!item.qty) return;
  total+=item.price*item.qty;
  var row=document.createElement('div');
  row.className='ri';
  var nd=document.createElement('div');nd.className='rn';
  nd.innerHTML='<span style="margin-right:6px">'+item.emoji+'</span>'+item.name;
  var ctrl=document.createElement('div');ctrl.className='rc';
  var bm=document.createElement('button');bm.textContent='−';
  var qs=document.createElement('span');qs.className='rq';qs.textContent=item.qty;
  var bp=document.createElement('button');bp.textContent='+';
  (function(n){bm.onclick=function(){_chg(n,-1);};bp.onclick=function(){_chg(n,1);};})(item.name);
  ctrl.appendChild(bm);ctrl.appendChild(qs);ctrl.appendChild(bp);
  var pd=document.createElement('div');pd.className='rp';
  pd.textContent='₩'+(item.price*item.qty).toLocaleString();
  row.appendChild(nd);row.appendChild(ctrl);row.appendChild(pd);
  list.appendChild(row);
 });
 document.getElementById('fab-price').textContent='₩'+total.toLocaleString();
 document.getElementById('cart-list').classList.add('open');
 document.getElementById('overlay').style.display='block';document.getElementById('cart-sheet').classList.add('open');
}

function _closeCart(){
 document.getElementById('cart-list').classList.remove('open');
 document.getElementById('overlay').style.display='none';document.getElementById('cart-sheet').classList.remove('open');
}

function _chg(name,d){
 if(!_cart[name]) return;
 _cart[name].qty+=d;
 if(_cart[name].qty<=0) delete _cart[name];
 var el=document.getElementById('sc-'+name.replace(/\W/g,''));
 if(el){var q=(_cart[name]&&_cart[name].qty)||0;el.textContent=q;el.className='mc'+(q>0?' on':'');}
 _openCart();_updBtn();
 if(!Object.keys(_cart).length) _closeCart();
}

function _searchAddr(){
 // 간단한 주소 입력 팝업
 var pop=document.createElement('div');
 pop.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
 var mainInput='';var detailInput='';
 pop.innerHTML=
  '<div style="background:#fff;border-radius:20px;padding:24px;width:100%;max-width:420px">'+
  '<div style="font-size:16px;font-weight:900;margin-bottom:16px">📍 배달 주소 입력</div>'+
  '<input id="_ai1" placeholder="도로명 주소 (예: 수영로 668)" style="width:100%;padding:13px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:14px;margin-bottom:8px;box-sizing:border-box;outline:none">'+
  '<input id="_ai2" placeholder="상세주소 (예: 607호)" style="width:100%;padding:13px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:14px;margin-bottom:16px;box-sizing:border-box;outline:none">'+
  '<div style="display:flex;gap:8px">'+
  '<button id="_aok" style="flex:1;padding:14px;background:#0891b2;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">확인</button>'+
  '<button id="_acl" style="flex:1;padding:14px;background:#f1f5f9;color:#64748b;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">취소</button>'+
  '</div></div>';
 document.body.appendChild(pop);
 document.getElementById('_ai1').focus();
 document.getElementById('_aok').onclick=function(){
  var main=document.getElementById('_ai1').value.trim();
  var detail=document.getElementById('_ai2').value.trim();
  if(!main){alert('주소를 입력해주세요');return;}
  _addrFull=main+(detail?' '+detail:'');
  _addr=_addrFull;
  var btns=document.querySelectorAll('[id^="addr-btn"]');
  btns.forEach(function(b){b.textContent='📍 '+_addrFull;b.style.color='#0f172a';});
  pop.remove();
 };
 document.getElementById('_acl').onclick=function(){pop.remove();};
 pop.onclick=function(e){if(e.target===pop)pop.remove();};
}
function _confirmAddr(){_searchAddr();}
function _openAddrPopup(){_searchAddr();}
function _closeAddrPopup(){var p=document.querySelector('[id^="_a"]');if(p&&p.parentNode===document.body)p.parentNode.removeChild(p);}

function _submitOrder(){
 var name=document.getElementById('cust-name').value.trim()||document.getElementById('cust-name').value.trim();
 var phone=document.getElementById('cust-phone').value.trim()||document.getElementById('cust-phone').value.trim();
 var memo=document.getElementById('cust-memo').value.trim()||document.getElementById('cust-memo').value.trim();
 var fullAddr=_addr;
 if(!_addr){alert('배달 주소를 입력해주세요');return;}
 if(!name){alert('이름을 입력해주세요');return;}
 if(!phone){alert('연락처를 입력해주세요');return;}
 var items=Object.values(_cart).filter(function(i){return i.qty>0;});
 if(!items.length){alert('메뉴를 선택해주세요');return;}
 var total=items.reduce(function(s,i){return s+i.price*i.qty;},0);
 var btn=document.getElementById('order-btn');
 btn.disabled=true;btn.textContent='주문 중...';
 _db.collection('filo_orders').add({
  dealerId:_did,type:'delivery',status:'pending',
  items:items,total:total,customer:name,phone:phone,
  address:fullAddr,memo:memo,createdAt:new Date().toISOString()
 }).then(function(ref){
  _closeCart();_cart={};_updBtn();
  document.querySelectorAll('.mc').forEach(function(c){c.textContent='';c.className='mc';});
  var orderInfo=items.map(function(i){return i.emoji+' '+i.name+' ×'+i.qty+'  ₩'+(i.price*i.qty).toLocaleString();}).join('\n');
  document.getElementById('dn-sub').textContent='주문번호: #'+ref.id.slice(-6).toUpperCase()+'\n\n'+orderInfo+'\n\n📍 '+fullAddr;
  document.getElementById('dn').style.display='flex';
 }).catch(function(e){
  alert('주문 실패: '+e.message);
  btn.disabled=false;btn.textContent=_t('order');
 });
}

function _switchTab(tab){
 document.getElementById('tab-menu').classList.toggle('on',tab==='menu');
 document.getElementById('tab-delivery').classList.toggle('on',tab==='delivery');
 document.getElementById('cat-wrap').style.display=tab==='menu'?'':'none';
 document.getElementById('scroll-area').style.display=tab==='menu'?'':'none';
 var dt=document.getElementById('delivery-tab');
 if(dt)dt.style.display=tab==='delivery'?'flex':'none';
}

function _setLang(l){
 _lang=l;
 ['ko','en','zh','ja'].forEach(function(x){var b=document.getElementById('lb-'+x);if(b)b.classList.toggle('on',x===l);});
 var tm=document.getElementById('tab-menu');if(tm)tm.textContent=_t('menu');
 var td=document.getElementById('tab-delivery');if(td)td.textContent=_t('delivery');
 var ob=document.getElementById('order-btn');if(ob)ob.textContent=_t('order');
 var tt=document.getElementById('tl-total');if(tt)tt.textContent=_t('total');
 var dm=document.getElementById('dn-msg');if(dm)dm.textContent=_t('done');
 var ds=document.getElementById('dn-sub');if(ds)ds.textContent=_t('sub');
 var db=document.getElementById('dn-back');if(db)db.textContent=_t('back');
 _tlCache={};
}
