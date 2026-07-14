/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @module      filo-payment.js
 * @description 결제처리·분할결제·QR결제
 *
 * ══════════════════════════════════════════════════════
 * 📋 이 파일의 역할 & 연결 구조
 * ══════════════════════════════════════════════════════
 * 역할: POS 결제 처리 (선불/후불/현금/카드/분할/카카오페이)
 *
 * 저장 컬렉션:
 *   filo_sales    — 모든 결제 내역 (POS + 테이블)
 *   filo_orders   — 테이블 주문 (테이블 선택 시만 추가 저장)
 *   filo_payments — 테이블 분할결제 내역
 *
 * FCM 푸시 발송:
 *   결제 완료 시 → _filoSendReceiptPush() 호출
 *   → /fcm/notify-drivers 엔드포인트 (donway.ai.kr/_worker.js)
 *   → 고객 폰에 영수증 알림 (type: 'receipt')
 *   ※ FCM 토큰: filo_orders.fcmToken (QR 스캔 시 저장됨)
 *
 * 연결 파일:
 *   filo-pos.js       — POS UI, 장바구니, _filoTablePay() 호출
 *   filo-table.js     — 테이블 현황, 픽업알림(_filoSendPickupPush)
 *   filo-common.js    — 공통 함수 (_filoToast, _filoShowReceipt 등)
 *   firebase-messaging-sw.js — 백그라운드 푸시 수신 (type: receipt 추가 필요)
 *
 * 주요 함수:
 *   _filoConfirmPay(method, methodLabel) — POS 결제 확정 (filo_sales 저장)
 *   _filoTablePay(did,items,total,...)   — 테이블 결제 (filo-pos.js에 있음)
 *   _filoSendReceiptPush(token, data)    — 결제 완료 FCM 영수증 발송 ★신규
 *   _filoQRSave(num, name)               — QR 이미지 저장
 *   _filoEnsureQR(cb)                    — QR 라이브러리 동적 로드
 *
 * TODO:
 *   - 알림톡 연동: 카카오 비즈메시지 영수증 발송 (현재 FCM으로 대체)
 *   - 솔라피 → 알리고 교체 예정 (6.5원/건, 현재 13원/건)
 * ══════════════════════════════════════════════════════
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
   // FCM 주문 접수 알림 (fcmToken 있을 때)
   if(saveData.fcmToken) {
     _filoSendReceiptPush(saveData.fcmToken, {
       items: items, total: total,
       methodLabel: '주문 접수', tableName: tableName
     });
   }
   _cartClear();
  } else {
   // 선불: 영수증 출력 + FCM 영수증 발송
   _filoShowReceipt(ref.id, items, total, method, methodLabel, now);
   // FCM 영수증 발송 (테이블 주문이고 fcmToken 있을 때)
   if(tableId && saveData.fcmToken) {
     _filoSendReceiptPush(saveData.fcmToken, {
       items: items, total: total,
       methodLabel: methodLabel, tableName: tableName
     });
   }
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
