/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      filo-payment.js
 * @description 결제처리·분할결제·QR결제
 */
// filo-common.js에서 분리됨 (리팩토링 2026-07-13)

function _filoConfirmPay(method, methodLabel){
 document.querySelector('.mo') && document.querySelector('.mo').remove();
 var did=_CU.dealerId||_CU.uid;
 var rawTotal=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var discount=window._posDiscount||0;
 var total=Math.max(0,rawTotal-discount);
 window._posDiscount=0;
 // 금액 0이면 저장 안 함
 if(total<=0){_filoToast('❌ 결제 금액이 없습니다');_cartClear();return;}
 var now=new Date();
 var items=_cartItems.map(function(c){return {id:c.id,name:c.name,price:c.price,qty:c.qty};});
 var tableId=window._selectedTableId||null;
 var tableName=window._selectedTableName||(tableId?'테이블 '+tableId:'카운터');
 var payType=window._posPayType||'postpay';
 window._posPayType='postpay';
 var saveData={
  dealerId:did,items:items,total:total,
  tableId:tableId,tableName:tableName,
  tableNum:tableId?parseInt(tableId):null,
  createdAt:now.toISOString(),date:now.toISOString().slice(0,10),
  type:'pos',payMethod:method,payType:payType,
  status:payType==='prepay'?'paid':'pending',
  createdBy:_CU.name||_CU.userId||''
 };
 // filo_sales에 저장
 _db.collection('filo_sales').add(saveData).then(function(ref){
  // 테이블 선택 시 filo_orders에도 저장 (테이블 현황 연동)
  if(tableId){
   _db.collection('filo_orders').add(Object.assign({},saveData,{
    type:'table',source:'pos'
   })).catch(function(){});
  }
  window._selectedTableId=null;window._selectedTableName=null;
  var ct=document.querySelector('.cart-panel div:first-child');if(ct)ct.textContent='🛒 주문 내역';
  if(payType==='postpay'){
   // 후불: 주문 접수 토스트만
   var tMsg=tableName&&tableName!=='카운터'?tableName+' ':'';
   _filoToast('✅ '+tMsg+'주문 접수됐습니다!');
   _cartClear();
  } else {
   // 선불: 영수증 출력
   _filoShowReceipt(ref.id, items, total, method, methodLabel, now);
   _cartClear();
  }
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

function _filoQRSave(num,name){
 var el=document.getElementById('qr-'+num);
 if(!el)return;
 var img=el.querySelector('img');
 var canvas=el.querySelector('canvas');
 var src=img?img.src:(canvas?canvas.toDataURL('image/png'):'');
 if(!src){_filoToast('❌ QR 없음');return;}
 var a=document.createElement('a');
 a.download=name+'_QR.png';a.href=src;a.click();
 _filoToast('💾 '+name+' QR 저장됐습니다');
}

function _filoEnsureQR(cb){
 if(window.QRCode)return cb();
 /* 혹시 로드 안됐으면 동적 로드 */
 var s=document.createElement('script');
 s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
 s.onload=function(){setTimeout(cb,100);};
 document.head.appendChild(s);
}

function _filoQRDownload(num,name){
 var wrap=document.getElementById('qr-c-'+num);
 if(!wrap){_filoToast('❌ QR 없음');return;}
 var canvas=wrap.querySelector('canvas');
 var img=wrap.querySelector('img');
 var a=document.createElement('a');
 a.download=name+'_QR.png';
 if(canvas)a.href=canvas.toDataURL('image/png');
 else if(img)a.href=img.src;
 else{_filoToast('❌ QR 없음');return;}
 a.click();
 _filoToast('💾 '+name+' QR 저장됐습니다');
}

function _filoShowModal(html){
 var mo=document.createElement('div');
 mo.className='mo';
 mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
 mo.innerHTML='<div style="background:var(--b2);border:1px solid var(--bd);border-radius:20px;max-width:440px;width:100%;max-height:90dvh;overflow-y:auto">'+html+'</div>';
 mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
 document.body.appendChild(mo);
}
