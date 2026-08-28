/*
 * filo-pos.js — FILO POS 결제·카트·각자계산·분할결제
 * Copyright (c) 2024-2026 유한회사 엠비티아이
 *
 * 저장 컬렉션:
 *   filo_sales    — 매출 기록
 *   filo_orders   — 테이블 주문 (후불)
 *   filo_payments — 결제 기록 (각자계산)
 *
 * 의존: filo-common.js (_cartItems, _filoToast)
 *       filo-table.js (_filoTableLoad)
 *       filo-payment.js (_filoConfirmPay, QR결제)
 *
 * 주요 함수 (1개 — 나머지는 filo-pos-core.js / filo-pos-ui.js):
 *   _filoPay()                  — 결제 수단 선택 모달 (카드/현금/카카오/분할)
 *
 * ⚠️ 결제 흐름:
 *   _filoTablePay → filo_payments 저장 → filo_sales 저장
 *   원본 filo_orders는 절대 수정하지 않음
 */
// 관련 컬렉션: filo_sales, filo_payments, filo_orders, filo_menus
// ⚠️ 2026-07-12 리팩토링:
//   _filoSelfPay (구버전 각자계산) 제거
//   _splitCalc/_splitConfirm (중복) 제거
//   _filoTablePay: 모든 테이블 결제 통합 함수 (신규)
//   _filoTableSelfPay: 각자계산 (filo_payments 기반)
//   결제 흐름: _filoTablePay → filo_payments + filo_sales 저장

function _filoPay(){
 if(!_cartItems||!_cartItems.length){_filoToast('장바구니가 비어 있습니다');return;}
 var rawTotal=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var discount=window._posDiscount||0;
 var total=Math.max(0,rawTotal-discount);
 if(total<=0){_filoToast('결제 금액이 없습니다');return;}

 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:400px';

 box.innerHTML=
  '<div style="font-size:16px;font-weight:900;margin-bottom:6px;display:flex;align-items:center;gap:8px">'+
  _svgIcon('credit-card')+' 결제 수단 선택</div>'+
  '<div style="font-size:13px;color:var(--t3);margin-bottom:20px">합계: <span style="font-size:18px;font-weight:900;color:#22c55e">₩'+total.toLocaleString()+'</span></div>';

 var methods=[
  {key:'card',label:'카드',color:'#0891b2',icon:'credit-card'},
  {key:'cash',label:'현금',color:'#16a34a',icon:'wallet'},
  {key:'kakao',label:'카카오페이',color:'#f9d900',textColor:'#000',icon:'smartphone'},
  {key:'split',label:'분할결제',color:'#7c3aed',icon:'split'}
 ];

 methods.forEach(function(m){
  var btn=document.createElement('button');
  btn.style.cssText='width:100%;padding:15px 16px;margin-bottom:8px;background:var(--surface2);border:1.5px solid var(--bd2);border-radius:12px;color:var(--tx);font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:12px;text-align:left;transition:.15s';
  btn.innerHTML='<span style="width:36px;height:36px;border-radius:10px;background:'+m.color+'22;display:flex;align-items:center;justify-content:center;color:'+m.color+'">'+_svgIcon(m.icon)+'</span>'+
   '<span style="color:'+(m.textColor||'var(--tx)')+'">'+m.label+'</span>';
  btn.onmouseover=function(){btn.style.borderColor=m.color;btn.style.background=m.color+'11';};
  btn.onmouseout=function(){btn.style.borderColor='var(--bd2)';btn.style.background='var(--surface2)';};
  btn.onclick=function(){
   mo.remove();
   if(m.key==='split'){_filoSplitPay(total);}
   else{_filoConfirmPay(m.key,m.label);}
  };
  box.appendChild(btn);
 });

 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='width:100%;padding:12px;background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;margin-top:4px';
 cancelBtn.textContent='취소';
 cancelBtn.onclick=function(){mo.remove();};
 box.appendChild(cancelBtn);

 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}
