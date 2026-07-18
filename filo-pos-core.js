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
  btn.style.borderColor='rgba(124,58,237,.6)';
  /* Ripple */
  var ripple=document.createElement('div');
  ripple.style.cssText='position:absolute;border-radius:50%;background:rgba(124,58,237,.3);width:10px;height:10px;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);animation:ripple .5s ease both;pointer-events:none;z-index:10';
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
 return;
 }
 var rawTotal=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var discount=window._posDiscount||0;
 var total=Math.max(0,rawTotal-discount);
 window._posDiscount=0; /* 결제 후 초기화 */
 list.innerHTML=_cartItems.map(function(c,i){
 return '<div class="cart-item">'+
 '<div style="flex:1">'+
 '<div style="font-size:13px;font-weight:700">'+esc(c.name)+'</div>'+
 '<div style="font-size:12px;color:var(--t3)">₩'+c.price.toLocaleString()+'</div></div>'+
 '<div style="display:flex;align-items:center;gap:6px">'+
 '<button class="qty-btn" onclick="_cartQty('+i+',-1)">−</button>'+
 '<span style="font-size:14px;font-weight:900;min-width:20px;text-align:center">'+c.qty+'</span>'+
 '<button class="qty-btn" onclick="_cartQty('+i+',1)">+</button></div></div>';
 }).join('');
 if(totalEl){
 totalEl.textContent='₩'+total.toLocaleString();
 totalEl.style.transform='scale(1.1)';
 setTimeout(function(){totalEl.style.transform='';},200);
 }
}


function _cartQty(idx,delta){
 _cartItems[idx].qty+=delta;
 if(_cartItems[idx].qty<=0)_cartItems.splice(idx,1);
 _cartRender();
}


function _cartClear(){_cartItems=[];_cartRender();}


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
   '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>💵 현금</span><span style="font-weight:700;color:#22c55e">₩'+cash.toLocaleString()+'</span></div>'+
   '<div style="display:flex;justify-content:space-between"><span>💳 카드</span><span style="font-weight:700;color:#0891b2">₩'+card.toLocaleString()+'</span></div>';
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
 confirmBtn.textContent='✅ 결제 완료';
 confirmBtn.onclick=function(){
  var cash=parseInt(cashInp.value)||0;
  var card=Math.max(0,total-cash);
  if(cash<=0||cash>=total){_filoToast('금액을 확인해주세요');return;}
  mo.remove();
  _filoConfirmPay('split','💵현금₩'+cash.toLocaleString()+'+💳카드₩'+card.toLocaleString());
 };

 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='flex:1;padding:12px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);font-size:13px;cursor:pointer';
 cancelBtn.textContent='취소';
 cancelBtn.onclick=function(){mo.remove();_filoPay();};

 var actRow=document.createElement('div');
 actRow.style.cssText='display:flex;gap:8px';
 actRow.appendChild(confirmBtn);actRow.appendChild(cancelBtn);

 var hdr=document.createElement('div');
 hdr.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:14px">✂️ 분할 결제</div>'+
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



   function getSelTotal(){
    return allItems.reduce(function(s,it,i){return s+(checkedMap[i]?(it.price||0)*(it.qty||1):0);},0);
   }


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

var _origFilterKiosk = _filoFilterKiosk;

document.addEventListener('click',function(e){
 var mc=e.target.closest('.member-card[data-id]');
 if(mc)_filoShowMemberDetail(mc.dataset.id);
 var db=e.target.closest('.del-btn[data-id]');
 if(db)_filoDeleteMember(db.dataset.id, db.dataset.name||'');
});


/* ══════════════════════════════════
   🪑 테이블 관리 페이지
   테이블 수 설정, 상태 관리, 실시간
   ══════════════════════════════════ */