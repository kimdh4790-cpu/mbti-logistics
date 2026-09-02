/*
 * filo-pos-core.js — FILO POS 카트·결제 핵심 로직
 * Copyright (c) 2024-2026 유한회사 엠비티아이
 *
 * 역할: 카트 관리, 분할결제 계산, 영수증 알림
 * 의존: filo-order-common.js (_filoToast)
 *       _cartItems (전역 배열)
 *
 * 주요 함수:
 *   _cartAdd(menu)         — 카트에 메뉴 추가
 *   _cartRender()          — 카트 화면 렌더링
 *   _cartQty(i, delta)     — 수량 변경
 *   _cartClear()           — 카트 초기화
 *   _filoSplitPay(total)   — 분할결제 UI
 *   calcSplit()            — 분할금액 계산
 *   getSelTotal()          — 선택 항목 합계
 *   _toUpdateCart(oid,did) — 주문 카트 업데이트
 *   _cartAddFromEl(el)     — DOM 요소에서 카트 추가
 *
 * 최종수정: 2026-07-17 | 리팩토링 분리
 */

function _cartAdd(id,name,price){
 var existing=_cartItems.find(function(c){return c.id===id;});
 if(existing){existing.qty++;}
 else{_cartItems.push({id:id,name:name,price:price,qty:1});}
 _cartRender();
 /* Ripple + 바운스 효과 */
 var btn=event&&event.target?event.target.closest('.menu-item'):null;
 if(btn){
  btn.style.transform='scale(.94)';
  btn.style.borderColor='rgba(201,168,76,.6)';
  /* Ripple */
  var ripple=document.createElement('div');
  ripple.style.cssText='position:absolute;border-radius:50%;background:rgba(201,168,76,.3);width:10px;height:10px;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);animation:ripple .5s ease both;pointer-events:none;z-index:10';
  btn.appendChild(ripple);
  setTimeout(function(){
   btn.style.transform='';
   btn.style.borderColor='';
   if(ripple.parentNode)ripple.parentNode.removeChild(ripple);
  },500);
  /* 카트 총액 바운스 */
  var tot=document.getElementById('cart-total');
  if(tot){tot.style.animation='none';tot.offsetHeight;tot.style.animation='successPop .3s cubic-bezier(.34,1.56,.64,1)';}
 }
}


function _cartRender(){
 var list=document.getElementById('cart-list');
 var totalEl=document.getElementById('cart-total');
 if(!list)return;
 if(!_cartItems.length){
  list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3);font-size:12px">메뉴를 선택하세요</div>';
  if(totalEl)totalEl.textContent='₩0';
  var ppb=document.getElementById('pos-pay-bar');if(ppb)ppb.style.display='none';
  return;
 }
 var rawTotal=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var discount=window._posDiscount||0;
 var total=Math.max(0,rawTotal-discount);
 list.innerHTML=_cartItems.map(function(c,i){
  return '<div class="pos-cart-row">'+
  '<span class="pos-cart-name">'+esc(c.name)+'</span>'+
  '<span class="pos-cart-qty">'+
    '<button onclick="_cartQty('+i+',-1)">−</button>'+
    '<span style="font-size:13px;font-weight:900;min-width:18px;text-align:center;color:#1e293b">'+c.qty+'</span>'+
    '<button onclick="_cartQty('+i+',1)">+</button>'+
  '</span>'+
  '<span class="pos-cart-price">₩'+( c.price*c.qty).toLocaleString()+'</span>'+
  '</div>';
 }).join('');
 if(totalEl){
  totalEl.textContent='₩'+total.toLocaleString();
  totalEl.style.transform='scale(1.1)';
  setTimeout(function(){totalEl.style.transform='';},200);
 }
 // 모바일 하단 고정 결제 바 동기화
 var ppb=document.getElementById('pos-pay-bar');
 var ppbCount=document.getElementById('ppb-count');
 var ppbTotal=document.getElementById('ppb-total');
 if(ppb){
  var totalQty=_cartItems.reduce(function(s,c){return s+c.qty;},0);
  ppb.style.display='flex';
  if(ppbCount){
   var _names=_cartItems.map(function(c){return c.name+(c.qty>1?' ×'+c.qty:'');});
   var _nameStr=_names.length===1?_names[0]:_names.length===2?_names.join(', '):(_names[0]+', '+_names[1]+' 외 '+(_names.length-2)+'개');
   ppbCount.innerHTML='<span style="font-size:12px;color:#1e293b;font-weight:800;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_nameStr+'</span>'+
    '<span style="font-size:10px;color:#64748b">총 '+totalQty+'개 선택 · 결제 대기</span>';
  }
  if(ppbTotal)ppbTotal.textContent='₩'+total.toLocaleString();
 }
}


function _cartQty(idx,delta){
 _cartItems[idx].qty+=delta;
 if(_cartItems[idx].qty<=0)_cartItems.splice(idx,1);
 _cartRender();
}


function _cartClear(){_cartItems=[];_cartRender();}


function _cartRemoveSheet(){
 if(!_cartItems.length)return;
 // 1개면 바로 전체 삭제
 if(_cartItems.length===1){
  if(confirm(_cartItems[0].name+' 1개를 삭제할까요?')){_cartItems=[];_cartRender();}
  return;
 }
 var mo=document.createElement('div');
 mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
 function render(){
  var rows=_cartItems.map(function(c,i){
   return '<div style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--bd,#2d3748)">'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-size:14px;font-weight:700;color:var(--tx,#f1f5f9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(c.name)+'</div>'
    +'<div style="font-size:12px;color:#94a3b8">₩'+c.price.toLocaleString()+'</div>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'
    +'<button onclick="window._csQty('+i+',-1)" style="width:32px;height:32px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);border-radius:8px;color:#ef4444;font-size:16px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center">−</button>'
    +'<span style="font-size:14px;font-weight:900;min-width:20px;text-align:center;color:var(--tx,#f1f5f9)">'+c.qty+'</span>'
    +'<button onclick="window._csQty('+i+',1)" style="width:32px;height:32px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);border-radius:8px;color:#818cf8;font-size:16px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>'
    +'</div></div>';
  }).join('');
  mo.innerHTML='<div style="background:var(--b2,#1e293b);border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:20px 16px 32px">'
   +'<div style="width:36px;height:4px;background:#475569;border-radius:2px;margin:0 auto 16px"></div>'
   +'<div style="font-size:15px;font-weight:900;color:var(--tx,#f1f5f9);margin-bottom:4px">장바구니 수정</div>'
   +'<div style="font-size:12px;color:#64748b;margin-bottom:12px">항목을 수정하거나 − 로 0이 되면 자동 삭제됩니다</div>'
   +rows
   +'<div style="display:flex;gap:8px;margin-top:16px">'
   +'<button onclick="window._csClose()" style="flex:1;height:46px;background:#1e293b;border:1px solid #334155;border-radius:12px;color:#94a3b8;font-size:14px;font-weight:700;cursor:pointer">닫기</button>'
   +'<button onclick="window._csAll()" style="flex:1;height:46px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:12px;color:#ef4444;font-size:14px;font-weight:700;cursor:pointer">전체 삭제</button>'
   +'</div></div>';
 }
 window._csQty=function(idx,delta){
  _cartItems[idx].qty+=delta;
  if(_cartItems[idx].qty<=0)_cartItems.splice(idx,1);
  _cartRender();
  if(!_cartItems.length){mo.remove();delete window._csQty;delete window._csClose;delete window._csAll;return;}
  render();
 };
 window._csClose=function(){mo.remove();delete window._csQty;delete window._csClose;delete window._csAll;};
 window._csAll=function(){_cartItems=[];_cartRender();window._csClose();};
 mo.addEventListener('click',function(e){if(e.target===mo)window._csClose();});
 render();
 document.body.appendChild(mo);
}


function _filoSplitPay(total){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:440px';

 var cashInp=document.createElement('input');
 cashInp.type='number';cashInp.placeholder='현금 금액 입력';
 cashInp.style.cssText='width:100%;padding:11px 12px;background:var(--b3);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);font-size:14px;outline:none;margin-bottom:8px;box-sizing:border-box';

 var resultDiv=document.createElement('div');
 resultDiv.style.cssText='background:var(--surface2);border-radius:var(--r);padding:12px 14px;margin-bottom:14px;font-size:12px;color:var(--t3)';
 resultDiv.textContent='현금 금액을 입력하세요';


 function calcSplit(){
  var cash=parseInt(cashInp.value)||0;
  var card=Math.max(0,total-cash);
  if(cash<=0){resultDiv.innerHTML='<span style="color:var(--t3)">현금 금액을 입력하세요</span>';return;}
  if(cash>=total){resultDiv.innerHTML='<span style="color:#ef4444">현금 금액이 총액보다 큽니다</span>';return;}
  resultDiv.innerHTML=
   '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>현금</span><span style="font-weight:700;color:#22c55e">₩'+cash.toLocaleString()+'</span></div>'+
   '<div style="display:flex;justify-content:space-between"><span>카드</span><span style="font-weight:700;color:#0891b2">₩'+card.toLocaleString()+'</span></div>';
 }
 cashInp.oninput=calcSplit;

 var btnRow=document.createElement('div');
 btnRow.style.cssText='display:flex;gap:6px;margin-bottom:12px';
 [10000,20000,30000,50000].forEach(function(v){
  var b=document.createElement('button');
  b.textContent=(v/10000)+'만';
  b.style.cssText='flex:1;padding:8px;background:var(--surface3);border:1px solid var(--bd2);border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer';
  b.onclick=function(){cashInp.value=v;calcSplit();};
  btnRow.appendChild(b);
 });

 var confirmBtn=document.createElement('button');
 confirmBtn.style.cssText='flex:2;padding:12px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-size:14px;font-weight:700;cursor:pointer';
 confirmBtn.textContent='결제 완료';
 confirmBtn.onclick=function(){
  var cash=parseInt(cashInp.value)||0;
  var card=Math.max(0,total-cash);
  if(cash<=0||cash>=total){_filoToast('금액을 확인해주세요');return;}
  mo.remove();
  _filoConfirmPay('split','현금₩'+cash.toLocaleString()+'+카드₩'+card.toLocaleString());
 };

 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='flex:1;padding:12px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);font-size:13px;cursor:pointer';
 cancelBtn.textContent='취소';
 cancelBtn.onclick=function(){mo.remove();_filoPay();};

 var actRow=document.createElement('div');
 actRow.style.cssText='display:flex;gap:8px';
 actRow.appendChild(confirmBtn);actRow.appendChild(cancelBtn);

 var hdr=document.createElement('div');
 hdr.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:14px">분할 결제</div>'+
  '<div style="background:var(--surface2);border-radius:var(--r);padding:12px 14px;margin-bottom:14px">'+
  '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700"><span>총액</span><span style="color:#22c55e">₩'+total.toLocaleString()+'</span></div></div>'+
  '<div style="margin-bottom:8px;font-size:12px;color:var(--t2)">현금 금액 입력</div>';

 box.appendChild(hdr);box.appendChild(cashInp);box.appendChild(btnRow);
 box.appendChild(resultDiv);box.appendChild(actRow);
 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
 setTimeout(function(){cashInp.focus();},100);
}





// ── 각자 계산 ──

function _toUpdateCart(){
 var items=Object.values(_toCart).filter(function(it){return it.qty>0;});
 var total=items.reduce(function(s,it){return s+it.price*it.qty;},0);
 var listEl=document.getElementById('to-cart-list');
 var tw=document.getElementById('to-total-wrap');
 var te=document.getElementById('to-total');
 if(listEl){
  listEl.innerHTML=!items.length?'<div style="text-align:center;padding:16px;color:var(--t3);font-size:12px">메뉴를 선택하세요</div>':
   items.map(function(it){return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd)">'+
    '<span style="font-size:13px">'+it.name+' <span style="color:var(--br)">x'+it.qty+'</span></span>'+
    '<span style="font-size:13px;font-weight:800">₩'+(it.price*it.qty).toLocaleString()+'</span></div>';}).join('');
 }
 if(tw)tw.style.display=items.length?'block':'none';
 if(te)te.textContent='₩'+total.toLocaleString();
}


// ── 영수증 수동 발송 ─────────────────────────────────────────────────────────
// 결제완료 시 팝업 → 직원이 영수증 버튼 탭 → 손님 폰 FCM 발송

function _cartAddFromEl(el){
 var id=el.dataset.id||'';
 var name=el.dataset.name||'';
 var price=parseInt(el.dataset.price)||0;
 if(!id||!price)return;
 var existing=_cartItems.find(function(c){return c.id===id;});
 if(existing){existing.qty++;}
 else{_cartItems.push({id:id,name:name,price:price,qty:1});}
 _cartRender();
 el.style.transform='scale(.92)';
 setTimeout(function(){el.style.transform='';},150);
}

document.addEventListener('click',function(e){
 var mc=e.target.closest('.member-card[data-id]');
 if(mc)_filoShowMemberDetail(mc.dataset.id);
 var db=e.target.closest('.del-btn[data-id]');
 if(db)_filoDeleteMember(db.dataset.id, db.dataset.name||'');
});

// ── 오프라인 모드 — IndexedDB 큐 + 메뉴 캐시 ──────────────────────────────
var _offlineDB=null;

function _offlineInit(){
 if(_offlineDB)return;
 try{
  var req=indexedDB.open('filo_offline',2);
  req.onupgradeneeded=function(e){
   var db=e.target.result;
   if(!db.objectStoreNames.contains('pending_sales'))
    db.createObjectStore('pending_sales',{autoIncrement:true});
   if(e.oldVersion<2&&!db.objectStoreNames.contains('menu_cache'))
    db.createObjectStore('menu_cache',{keyPath:'did'});
  };
  req.onsuccess=function(e){
   _offlineDB=e.target.result;
   _offlineSync();
  };
  req.onerror=function(){console.warn('[offline] IndexedDB 열기 실패');};
 }catch(err){console.warn('[offline] IndexedDB 미지원',err);}
}

function _offlineQueueSale(data){
 if(!_offlineDB)return;
 try{
  _offlineDB.transaction('pending_sales','readwrite').objectStore('pending_sales').add(data);
 }catch(e){console.warn('[offline queue]',e);}
}

function _offlineCacheMenus(menus,did){
 if(!_offlineDB||!did)return;
 try{
  _offlineDB.transaction('menu_cache','readwrite').objectStore('menu_cache').put({did:did,menus:menus,ts:Date.now()});
 }catch(e){console.warn('[offline menu cache]',e);}
}

function _offlineGetMenus(did){
 return new Promise(function(resolve){
  if(!_offlineDB||!did){resolve(null);return;}
  try{
   var req=_offlineDB.transaction('menu_cache','readonly').objectStore('menu_cache').get(did);
   req.onsuccess=function(e){resolve(e.target.result?e.target.result.menus:null);};
   req.onerror=function(){resolve(null);};
  }catch(e){resolve(null);}
 });
}

function _offlinePendingCount(){
 return new Promise(function(resolve){
  if(!_offlineDB){resolve(0);return;}
  try{
   var req=_offlineDB.transaction('pending_sales','readonly').objectStore('pending_sales').count();
   req.onsuccess=function(e){resolve(e.target.result||0);};
   req.onerror=function(){resolve(0);};
  }catch(e){resolve(0);}
 });
}

function _offlineSync(){
 if(!navigator.onLine||!_offlineDB||typeof _db==='undefined')return;
 try{
  var tx=_offlineDB.transaction('pending_sales','readwrite');
  var store=tx.objectStore('pending_sales');
  store.openCursor().onsuccess=function(e){
   var cursor=e.target.result;
   if(!cursor)return;
   var key=cursor.key, data=cursor.value;
   var coll=data._collection||'filo_sales';
   var saveObj=Object.assign({},data);
   delete saveObj._collection;
   _db.collection(coll).add(saveObj).then(function(){
    try{_offlineDB.transaction('pending_sales','readwrite').objectStore('pending_sales').delete(key);}catch(err){}
    _offlinePendingCount().then(function(n){
     if(n===0)_filoToast('오프라인 주문 동기화 완료');
    });
   }).catch(function(err){console.warn('[offline sync]',err.message);});
   cursor.continue();
  };
 }catch(e){console.warn('[offline sync error]',e);}
}

window.addEventListener('online',function(){
 _offlineSync();
 if(typeof _offlineBanner==='function')_offlineBanner();
});
window.addEventListener('offline',function(){
 if(typeof _offlineBanner==='function')_offlineBanner();
});

// 앱 로드 시 초기화
setTimeout(_offlineInit,1000);


/* ══════════════════════════════════
   테이블 관리 페이지
   테이블 수 설정, 상태 관리, 실시간
   ══════════════════════════════════ */