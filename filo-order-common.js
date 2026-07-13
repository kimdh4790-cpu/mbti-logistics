/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      filo-order-common.js
 * @description QR주문 공통·AI메뉴추천·다국어지원
 */
var _i18n_common = {
 ko:{cart:'🛒 장바구니',order:'주문하기',total:'합계',sold:'품절',add:'담기',
     call:'직원을 호출했습니다!',done:'주문 완료!',sub:'잠시 후 준비됩니다',back:'메뉴로 돌아가기',
     addr:'📍 주소를 입력해주세요',fab:'주문하기'},
 en:{cart:'🛒 Cart',order:'Order Now',total:'Total',sold:'Sold Out',add:'Add',
     call:'Staff notified!',done:'Order Complete!',sub:'Your order is being prepared',back:'Back to Menu',
     addr:'📍 Enter delivery address',fab:'Order Now'},
 zh:{cart:'🛒 购物车',order:'下单',total:'合计',sold:'售罄',add:'加入',
     call:'已呼叫服务员！',done:'订单完成！',sub:'正在为您准备',back:'返回菜单',
     addr:'📍 请输入配送地址',fab:'下单'},
 ja:{cart:'🛒 カート',order:'注文する',total:'合計',sold:'売り切れ',add:'追加',
     call:'スタッフを呼びました！',done:'注文完了！',sub:'ただいま準備中です',back:'メニューへ戻る',
     addr:'📍 配達住所を入力',fab:'注文する'}
};

function _t(k){
 return(_i18n_common[_lang]&&_i18n_common[_lang][k])||_i18n_common.ko[k]||k;
}

// ── URL 파라미터 ────────────────────────────────────────────────────────────
function _p(k){return new URLSearchParams(location.search).get(k)||'';}

// ── 카테고리 아이콘 ──────────────────────────────────────────────────────────
var _catIco={'전체':'🍽','버거':'🍔','치킨':'🍗','피자':'🍕','분식':'🌶️','음료':'☕',
 '사이드':'🍟','디저트':'🍰','세트':'🎉','카페':'☕','한식':'🍱','양식':'🍝',
 '중식':'🥢','일식':'🍣','기타':'🍽'};

// ── 번역 캐시 ────────────────────────────────────────────────────────────────
var _tlCache={};

// ── 메뉴 카드 렌더링 ──────────────────────────────────────────────────────────
function _renderMenuGrid(menus, gridId){
 var grid=document.getElementById(gridId||'menu-grid');
 if(!grid)return;
 grid.innerHTML='';
 menus.forEach(function(m){
  var item=document.createElement('div');
  item.className='mi';
  item.dataset.cat=m.category||'기타';
  var trId='tr-'+m.name.replace(/\W/g,'_');
  var badgeId='badge-'+m.name.replace(/\W/g,'_');
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
  if(m.stock!=null&&m.stock<=0){
   var sold=document.createElement('div');
   sold.className='mi-sold';
   sold.textContent=_t('sold');
   item.appendChild(sold);
  }
  (function(menu){item.onclick=function(){if(menu.stock!=null&&menu.stock<=0)return;_openMdlCommon(menu);};})(m);
  grid.appendChild(item);
 });
 // 언어 반영
 if(_lang!=='ko') _applyTranslationsToGrid(menus);
}

// ── 카테고리 바 렌더링 ────────────────────────────────────────────────────────
function _renderCatBar(menus, barId, gridId){
 var bar=document.getElementById(barId||'cat-bar');
 if(!bar)return;
 var cats=['전체'];
 menus.forEach(function(m){if(m.category&&cats.indexOf(m.category)<0)cats.push(m.category);});
 bar.innerHTML='';
 cats.forEach(function(cat,i){
  var btn=document.createElement('button');
  btn.className='cat-btn'+(i===0?' on':'');
  btn.dataset.cat=cat;
  btn.innerHTML=(_catIco[cat]||'')?' <span class="cat-ico">'+(_catIco[cat]||'')+'</span>'+cat:cat;
  btn.onclick=function(){
   document.querySelectorAll('.cat-btn').forEach(function(b){b.classList.remove('on');});
   btn.classList.add('on');
   document.querySelectorAll('.mi').forEach(function(item){
    item.style.display=(cat==='전체'||item.dataset.cat===cat)?'':'none';
   });
   var sa=document.getElementById('scroll-area');if(sa)sa.scrollTop=0;
  };
  bar.appendChild(btn);
 });
}

// ── 카드 번역 적용 ────────────────────────────────────────────────────────────
function _applyTranslationsToGrid(menus){
 if(_lang==='ko') return;
 menus.forEach(function(m){
  var trId='tr-'+m.name.replace(/\W/g,'_');
  var el=document.getElementById(trId);
  if(!el) return;
  var ck=m.name+'_'+_lang;
  if(_tlCache[ck]){el.textContent=_tlCache[ck];return;}
  if(m.nameTranslations&&m.nameTranslations[_lang]){
   _tlCache[ck]=m.nameTranslations[_lang];
   el.textContent=m.nameTranslations[_lang];
   return;
  }
  // API 번역
  fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({name:m.name,lang:_lang})})
  .then(function(r){return r.json();})
  .then(function(d){
   if(d.translated&&d.translated!==m.name){
    _tlCache[ck]=d.translated;
    var e2=document.getElementById(trId);
    if(e2)e2.textContent=d.translated;
   }
  }).catch(function(){});
 });
}

// ── 공통 모달 (_openMdlCommon) ────────────────────────────────────────────────
// order.js는 #mdl/#mdl-box, store.js는 #tl-mdl/#tl-box 사용
// 각 파일에서 _openMdl 오버라이드 가능
function _openMdlCommon(m){
 _curMdlMenu=m;
 _tlQtyVal=1;
 // 모달 박스 ID 감지
 var boxId=document.getElementById('mdl-box')?'mdl-box':'tl-box';
 var mdlId=document.getElementById('mdl')?'mdl':'tl-mdl';
 var nameId=document.getElementById('mdl-name')?'mdl-name':'tl-name';
 var priceId=document.getElementById('mdl-price')?'mdl-price':'tl-price';
 var trId=document.getElementById('mdl-tr')?'mdl-tr':'tl-tr';
 var descId=document.getElementById('mdl-desc')?'mdl-desc':'tl-desc';
 var qtyId=document.getElementById('tl-qty')?'tl-qty':'tl-qty';
 var addId=document.getElementById('mdl-add')?'mdl-add':'tl-add';

 var tlBox=document.getElementById(boxId);
 if(!tlBox)return;
 var oldHdr=tlBox.querySelector('.mdl-img-full,.mdl-emoji');
 if(oldHdr)oldHdr.remove();
 var mdlContent=tlBox.querySelector('.mdl-content');
 if(m.imageUrl){
  var img=document.createElement('img');
  img.className='mdl-img-full';img.src=m.imageUrl;img.alt=m.name;
  tlBox.insertBefore(img,mdlContent);
 } else {
  var emojiEl=document.createElement('div');
  emojiEl.className='mdl-emoji';emojiEl.textContent=m.emoji||'🍽';
  tlBox.insertBefore(emojiEl,mdlContent);
 }
 var nameEl=document.getElementById(nameId);if(nameEl)nameEl.textContent=m.name;
 var priceEl=document.getElementById(priceId);if(priceEl)priceEl.textContent='₩'+(m.price||0).toLocaleString();
 var qtyEl=document.getElementById(qtyId);if(qtyEl)qtyEl.textContent='1';
 var addEl=document.getElementById(addId);if(addEl)addEl.textContent='담기 — ₩'+(m.price||0).toLocaleString();
 var trEl=document.getElementById(trId);if(trEl)trEl.textContent='';
 var descEl=document.getElementById(descId);if(descEl)descEl.textContent=m.description||'';
 document.getElementById(mdlId).classList.add('open');

 // 번역
 if(_lang!=='ko'){
  var ck=m.name+'_'+_lang;
  if(_tlCache[ck]){if(trEl)trEl.textContent=_tlCache[ck];}
  else if(m.nameTranslations&&m.nameTranslations[_lang]){
   _tlCache[ck]=m.nameTranslations[_lang];
   if(trEl)trEl.textContent=m.nameTranslations[_lang];
  } else {
   if(trEl)trEl.innerHTML='<span class="tl-spin"></span>';
   fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:m.name,lang:_lang})})
   .then(function(r){return r.json();})
   .then(function(d){
    var t=d.translated||m.name;
    _tlCache[ck]=t;
    if(_curMdlMenu&&_curMdlMenu.name===m.name&&trEl)trEl.textContent=t;
   }).catch(function(){if(trEl)trEl.textContent='';});
  }
  // 설명 번역
  if(m.description&&descEl){
   var dk=m.name+'_desc_'+_lang;
   if(_tlCache[dk]){descEl.textContent=_tlCache[dk];}
   else if(m.descTranslations&&m.descTranslations[_lang]){
    _tlCache[dk]=m.descTranslations[_lang];
    descEl.textContent=m.descTranslations[_lang];
   } else {
    fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({name:m.description,lang:_lang})})
    .then(function(r){return r.json();})
    .then(function(d){
     var t=d.translated||m.description;_tlCache[dk]=t;
     if(_curMdlMenu&&_curMdlMenu.name===m.name&&descEl)descEl.textContent=t;
    }).catch(function(){});
   }
  }
 }
}

// ── 수량 조절 ────────────────────────────────────────────────────────────────
function _tlQty(d){
 _tlQtyVal=Math.max(1,(_tlQtyVal||1)+d);
 var qtyEl=document.getElementById('tl-qty');if(qtyEl)qtyEl.textContent=_tlQtyVal;
 var addEl=document.getElementById('mdl-add')||document.getElementById('tl-add');
 if(addEl&&_curMdlMenu)addEl.textContent='담기 — ₩'+((_curMdlMenu.price||0)*_tlQtyVal).toLocaleString();
}

// ── 장바구니 FAB 업데이트 ──────────────────────────────────────────────────────
function _updFab(){
 var total=0,cnt=0;
 Object.values(_cart).forEach(function(i){total+=i.price*i.qty;cnt+=i.qty;});
 var fab=document.getElementById('cart-fab');if(!fab)return;
 if(cnt>0){
  fab.classList.add('show');
  var fc=document.getElementById('fab-cnt');if(fc)fc.textContent=cnt;
  var fp=document.getElementById('fab-price');if(fp)fp.textContent='₩'+total.toLocaleString();
 } else {
  fab.classList.remove('show');
 }
 // 배지 업데이트
 Object.keys(_cart).forEach(function(name){
  var badgeEl=document.getElementById('badge-'+name.replace(/\W/g,'_'));
  if(badgeEl){
   var qty=_cart[name]?_cart[name].qty:0;
   badgeEl.textContent=qty||'';
   badgeEl.classList.toggle('on',qty>0);
  }
 });
}

// ── 장바구니 시트 열기/닫기 ──────────────────────────────────────────────────
function _openCart(){
 var list=document.getElementById('cart-list');
 if(!list)return;
 list.innerHTML='';
 var total=0;
 Object.values(_cart).forEach(function(item){
  if(!item.qty)return;
  total+=item.price*item.qty;
  var row=document.createElement('div');
  row.className='ci';
  // 이미지 또는 이모지
  var menuData=_menus.find(function(m){return m.name===item.name;});
  var mediaEl=document.createElement('div');
  if(menuData&&menuData.imageUrl){
   var img=document.createElement('img');
   img.className='ci-img';img.src=menuData.imageUrl;img.alt=item.name;
   mediaEl.appendChild(img);
  } else {
   mediaEl.className='ci-emoji';mediaEl.textContent=item.emoji||'🍽';
  }
  var nameEl=document.createElement('div');nameEl.className='ci-name';nameEl.textContent=item.name;
  var ctrl=document.createElement('div');ctrl.className='ci-ctrl';
  var bm=document.createElement('button');bm.textContent='−';
  var qs=document.createElement('span');qs.className='ci-qty';qs.textContent=item.qty;
  var bp=document.createElement('button');bp.textContent='+';
  (function(n){
   bm.onclick=function(){_cartChg(n,-1);};
   bp.onclick=function(){_cartChg(n,1);};
  })(item.name);
  ctrl.appendChild(bm);ctrl.appendChild(qs);ctrl.appendChild(bp);
  var priceEl=document.createElement('div');priceEl.className='ci-price';
  priceEl.textContent='₩'+(item.price*item.qty).toLocaleString();
  row.appendChild(mediaEl);row.appendChild(nameEl);row.appendChild(ctrl);row.appendChild(priceEl);
  list.appendChild(row);
 });
 var tp=document.getElementById('total-price');if(tp)tp.textContent='₩'+total.toLocaleString();
 var fp=document.getElementById('fab-price');if(fp)fp.textContent='₩'+total.toLocaleString();
 var ov=document.getElementById('overlay');if(ov)ov.style.display='block';
 var cs=document.getElementById('cart-sheet');if(cs)cs.classList.add('open');
}

function _closeCart(){
 var ov=document.getElementById('overlay');if(ov)ov.style.display='none';
 var cs=document.getElementById('cart-sheet');if(cs)cs.classList.remove('open');
}

// ── 장바구니 수량 변경 ────────────────────────────────────────────────────────
function _cartChg(name,d){
 if(!_cart[name])return;
 _cart[name].qty+=d;
 if(_cart[name].qty<=0)delete _cart[name];
 _openCart();
 _updFab();
 if(!Object.keys(_cart).filter(function(k){return _cart[k]&&_cart[k].qty>0;}).length)_closeCart();
}

// ── 언어 변경 ────────────────────────────────────────────────────────────────
function _setLang(l){
 _lang=l;
 _tlCache={};
 ['ko','en','zh','ja'].forEach(function(x){
  var b=document.getElementById('lb-'+x);if(b)b.classList.toggle('on',x===l);
 });
 // UI 텍스트 업데이트
 var els={
  'cart-title':_t('cart'),'order-btn':_t('order'),
  'total-label':_t('total'),'tl-total':_t('total'),
  'fab-label':_t('fab'),'done-title':_t('done'),
  'done-sub':_t('sub'),'done-back':_t('back'),
  'dn-back':_t('back'),'addr-btn':_t('addr')
 };
 Object.keys(els).forEach(function(id){
  var el=document.getElementById(id);if(el&&els[id])el.textContent=els[id];
 });
 // 메뉴 카드 번역 적용
 if(_menus&&_menus.length)_applyTranslationsToGrid(_menus);
 // 품절 텍스트
 document.querySelectorAll('.mi-sold').forEach(function(s){s.textContent=_t('sold');});
}

// ── 주소 입력 팝업 ────────────────────────────────────────────────────────────
function _openAddrPopup(){
 var pop=document.createElement('div');
 pop.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
 pop.innerHTML='<div style="background:#fff;border-radius:20px;padding:24px;width:100%;max-width:420px">'+
  '<div style="font-size:16px;font-weight:900;margin-bottom:16px">📍 배달 주소 입력</div>'+
  '<input id="_ai1" placeholder="도로명 주소 (예: 수영로 668)" style="width:100%;padding:13px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:14px;margin-bottom:8px;box-sizing:border-box;outline:none">'+
  '<input id="_ai2" placeholder="상세주소 (예: 607호)" style="width:100%;padding:13px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:14px;margin-bottom:16px;box-sizing:border-box;outline:none">'+
  '<div style="display:flex;gap:8px">'+
  '<button id="_aok" style="flex:1;padding:14px;background:#0891b2;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">확인</button>'+
  '<button id="_acl" style="flex:1;padding:14px;background:#f1f5f9;color:#64748b;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">취소</button>'+
  '</div></div>';
 document.body.appendChild(pop);
 setTimeout(function(){var el=document.getElementById('_ai1');if(el)el.focus();},100);
 document.getElementById('_aok').onclick=function(){
  var main=(document.getElementById('_ai1')||{}).value||'';
  var detail=(document.getElementById('_ai2')||{}).value||'';
  main=main.trim();detail=detail.trim();
  if(!main){alert('주소를 입력해주세요');return;}
  if(typeof _addrFull!=='undefined')_addrFull=main+(detail?' '+detail:'');
  if(typeof _addr!=='undefined')_addr=main+(detail?' '+detail:'');
  var btns=document.querySelectorAll('[id^="addr-btn"]');
  btns.forEach(function(b){b.textContent='📍 '+(main+(detail?' '+detail:''));});
  pop.remove();
 };
 document.getElementById('_acl').onclick=function(){pop.remove();};
 pop.onclick=function(e){if(e.target===pop)pop.remove();};
}
function _closeAddrPopup(){var p=document.querySelector('[style*="z-index:9999"]');if(p)p.remove();}
function _confirmAddr(){_openAddrPopup();}
function _searchAddr(){_openAddrPopup();}

// ── 시간대별 AI 메뉴 추천 배너 ──────────────────────────────────────────────
function _renderRecommendBanner(menus){
 var bannerId='recommend-banner';
 var existing=document.getElementById(bannerId);
 if(existing)existing.remove();

 var h=new Date().getHours();
 var timeLabel=h>=6&&h<11?'🌅 아침 추천':h>=11&&h<14?'☀️ 점심 추천':h>=14&&h<17?'☕ 오후 추천':h>=17&&h<21?'🌆 저녁 추천':'🌙 야식 추천';

 var timePrefs={
  morning:['커피','음료','디저트','샐러드','토스트'],
  lunch:['밥','면','정식','국','찌개','비빔밥','냉면','한식'],
  afternoon:['커피','음료','디저트','케이크','스낵'],
  dinner:['고기','치킨','피자','맥주','삼겹살','갈비','술'],
  night:['치킨','피자','족발','보쌈','야식']
 };
 var prefKey=h>=6&&h<11?'morning':h>=11&&h<14?'lunch':h>=14&&h<17?'afternoon':h>=17&&h<21?'dinner':'night';
 var prefs=timePrefs[prefKey];

 // 메뉴 점수 계산
 var scored=menus.filter(function(m){return m.stock==null||m.stock>0;}).map(function(m){
  var score=0;
  prefs.forEach(function(p,i){if(m.name.includes(p)||(m.category&&m.category.includes(p)))score+=10-i;});
  return {m:m,score:score};
 }).sort(function(a,b){return b.score-a.score;}).slice(0,5);

 if(!scored.length)return;

 var banner=document.createElement('div');
 banner.id=bannerId;
 banner.style.cssText='margin:0 0 12px;padding:12px 14px;background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(59,130,246,.08));border:1px solid rgba(124,58,237,.2);border-radius:14px;';

 var inner=document.createElement('div');
 inner.innerHTML='<div style="font-size:11px;font-weight:800;color:#a78bfa;margin-bottom:8px;letter-spacing:.5px">'+timeLabel+'</div>';
 var row=document.createElement('div');
 row.style.cssText='display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;-webkit-overflow-scrolling:touch';

 scored.forEach(function(s){
  var m=s.m;
  var card=document.createElement('div');
  card.style.cssText='min-width:64px;text-align:center;cursor:pointer;flex-shrink:0';
  // 이미지
  var imgWrap=document.createElement('div');
  imgWrap.style.cssText='width:64px;height:64px;border-radius:10px;overflow:hidden;background:rgba(124,58,237,.15);display:flex;align-items:center;justify-content:center;font-size:26px';
  if(m.imageUrl){
   var img=document.createElement('img');
   img.src=m.imageUrl;
   img.style.cssText='width:100%;height:100%;object-fit:cover';
   img.loading='lazy';
   img.onerror=function(){imgWrap.textContent=m.emoji||'🍽';};
   imgWrap.appendChild(img);
  } else {
   imgWrap.textContent=m.emoji||'🍽';
  }
  card.appendChild(imgWrap);
  // 이름
  var nameEl=document.createElement('div');
  nameEl.style.cssText='font-size:10px;font-weight:700;color:var(--t1);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:64px';
  nameEl.textContent=m.name;
  card.appendChild(nameEl);
  // 가격
  var priceEl=document.createElement('div');
  priceEl.style.cssText='font-size:10px;color:#22c55e;font-weight:700';
  priceEl.textContent='₩'+Number(m.price||0).toLocaleString();
  card.appendChild(priceEl);
  // 클릭 — closure로 안전하게
  (function(menu){card.onclick=function(){_openMdlCommon(menu);};;})(m);
  row.appendChild(card);
 });

 inner.appendChild(row);
 banner.appendChild(inner);

 var grid=document.getElementById('menu-grid');
 if(grid&&grid.parentNode)grid.parentNode.insertBefore(banner,grid);
}
