/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @module      filo-pos-pay.js
 * @description 테이블 결제·각자계산·영수증·고객 화면
 */
// 의존성: filo-common.js, filo-pos-core.js, filo-pos-ui.js
// 관련 컬렉션: filo_payments, filo_sales, filo_orders
var _lastPosSaleRef=null; // 결제 후 취소용 마지막 sale 참조
function _filoTablePay(did, items, total, tableNum, tableName, method, orderIds){
 if(!items||!items.length||total<=0)return;
 var now=new Date();
 var today=now.toISOString().slice(0,10);
 var methodLabel=method==='card'?'카드':method==='cash'?'현금':method==='kakao'?'카카오페이':method;

 // 1. filo_payments 저장 (결제 기록)
 _db.collection('filo_payments').add({
  dealerId:did,
  tableNum:tableNum,
  tableName:tableName,
  items:items.map(function(it){return {name:it.name||'',price:it.price||0,qty:it.qty||1,emoji:it.emoji||'🍽'};}),
  amount:total,
  method:method,
  methodLabel:methodLabel,
  payType:'table',
  orderIds:orderIds||[],
  date:today,
  paidAt:now.toISOString()
 }).then(function(){
  // 2. filo_sales 저장 (DINE 매출 연동)
  _db.collection('filo_sales').add({
   dealerId:did, type:'table', source:'pos',
   items:items, total:total,
   tableNum:tableNum, tableName:tableName,
   payMethod:method, payType:'table', status:'done',
   date:today, createdAt:now.toISOString(), paidAt:now.toISOString()
  }).then(function(ref){ _lastPosSaleRef=ref; }).catch(function(e){console.warn('[filo_sales]',e.message);});

  // 3. 전체 결제 완료 확인 → filo_orders cleared
  if(orderIds&&orderIds.length){
   _db.collection('filo_payments')
    .where('dealerId','==',did).where('tableNum','==',tableNum).where('date','==',today)
    .get().then(function(snap){
     var paidTotal=0;
     snap.forEach(function(doc){paidTotal+=doc.data().amount||0;});
     // 해당 테이블 filo_orders 합계
     _db.collection('filo_orders').where('dealerId','==',did).where('type','==','table')
      .get().then(function(oSnap){
       var orderTotal=0;
       var pendingIds=[];
       oSnap.forEach(function(doc){
        var d=doc.data();
        if((String(d.tableNum)===String(tableNum)||d.tableName===tableName)&&d.status!=='cleared'){
         orderTotal+=(d.total||0);
         pendingIds.push(doc.id);
        }
       });
       if(orderTotal>0&&paidTotal>=orderTotal&&pendingIds.length){
        var batch=_db.batch();
        pendingIds.forEach(function(id){
         batch.update(_db.collection('filo_orders').doc(id),{status:'cleared',paidAt:now.toISOString()});
        });
        batch.commit().then(function(){
          // batch 완료 후 filo_orders에서 fcmToken 수집 → FCM 영수증 자동 발송
          Promise.all([
            _db.collection('filo_orders').where('dealerId','==',did).where('tableNum','==',String(tableNum)).get(),
            _db.collection('filo_orders').where('dealerId','==',did).where('tableNum','==',parseInt(tableNum)||0).get()
          ]).then(function(results){
            var tokens=[]; var seen={};
            results.forEach(function(snap){
              snap.forEach(function(doc){
                if(seen[doc.id])return; seen[doc.id]=true;
                var tk=doc.data().fcmToken;
                if(tk&&tk.length>20&&tokens.indexOf(tk)<0)tokens.push(tk);
              });
            });
            if(!tokens.length)return;
            var iNames=items.slice(0,3).map(function(it){return it.name+(it.qty>1?' ×'+it.qty:'');}).join(' · ');
            if(items.length>3)iNames+=' 외 '+(items.length-3)+'건';
            fetch('/fcm/notify-drivers',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                tokens:tokens,
                title:methodLabel+' 완료 · ₩'+total.toLocaleString(),
                body:iNames,
                type:'receipt',
                url:'https://filo.ai.kr/order?d='+did+'&t='+tableNum+'#done'
              })
            }).then(function(r){return r.json();}).then(function(d){
              if(d.sent>0)_filoToast('손님 영수증 발송 완료');
            }).catch(function(){});
          }).catch(function(){});
        }).catch(function(){});
       }
      }).catch(function(){});
    }).catch(function(){});
  }
  // 결제완료 알림 + 영수증 발송 버튼
  _filoReceiptNotify(did, tableNum, items, total, methodLabel);

 }).catch(function(e){_filoToast('결제 실패: '+e.message);});
}

// ── 테이블 각자 계산 ─────────────────────────────────────────────────────────

function _filoTableSelfPay(did,order,tableNum,tableName){
 var today=_today();

 // filo_payments에서 이미 결제된 항목 조회
 _db.collection('filo_payments')
  .where('dealerId','==',did)
  .where('tableNum','==',tableNum)
  .where('date','==',today)
  .get().then(function(paySnap){
   var paidNames=[];
   paySnap.forEach(function(doc){
    (doc.data().items||[]).forEach(function(it){paidNames.push(it.name);});
   });

   // orders에서 미결제 항목 펼치기
   var allItems=[];
   var allOrderIds=[];
   if(order.orders&&order.orders.length){
    order.orders.forEach(function(ord){
     var oid=ord.id||ord._id;
     if(oid&&allOrderIds.indexOf(oid)<0)allOrderIds.push(oid);
     (ord.items||[]).forEach(function(it){
      var pidx=paidNames.indexOf(it.name);
      if(pidx>=0){paidNames.splice(pidx,1);return;}
      allItems.push(Object.assign({},it,{_ordId:oid,qty:it.qty||1}));
     });
    });
   } else {
    (order.items||[]).forEach(function(it){
     var pidx=paidNames.indexOf(it.name);
     if(pidx>=0){paidNames.splice(pidx,1);return;}
     allItems.push(Object.assign({},it,{qty:it.qty||1}));
    });
   }

   if(!allItems.length){_filoToast('모든 항목이 이미 결제됐어요!');return;}

   // 각자계산 모달 UI
   var mo=document.createElement('div');mo.className='mo';
   mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
   var box=document.createElement('div');
   box.style.cssText='background:var(--b2);border:1px solid var(--bd);border-radius:20px;padding:20px;width:100%;max-width:440px;max-height:80vh;overflow-y:auto';
   mo.appendChild(box);
   mo.onclick=function(e){if(e.target===mo)mo.remove();};
   document.body.appendChild(mo);

   var checkedMap={};
   allItems.forEach(function(_,i){checkedMap[i]=false;});


function _filoShowReceipt(orderId, items, total, method, methodLabel, now){
 _lastReceiptData={orderId:orderId,items:items,total:total,method:method,methodLabel:methodLabel,now:now};
 var companyName=(_cachedCompanyDoc&&(_cachedCompanyDoc.companyName||_cachedCompanyDoc.name))||'';
 /* KST 시간 */
 var kst=new Date(now.getTime()+9*3600000);
 var timeStr=kst.getUTCFullYear()+'.'
  +(kst.getUTCMonth()+1).toString().padStart(2,'0')+'.'
  +kst.getUTCDate().toString().padStart(2,'0')+' '
  +kst.getUTCHours().toString().padStart(2,'0')+':'
  +kst.getUTCMinutes().toString().padStart(2,'0');

 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:0;width:100%;max-width:380px;overflow:hidden';

 /* 영수증 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='background:linear-gradient(135deg,#1a0e3a,#0a1628);padding:20px 24px 16px;text-align:center;position:relative';
 hdr.innerHTML='<div style="font-size:11px;color:rgba(167,139,250,.7);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">RECEIPT</div>'+
  '<div style="font-size:20px;font-weight:900;color:#fff">영수증</div>'+
  '<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px">'+companyName+'</div>'+
  '<div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px">'+timeStr+'</div>';
 box.appendChild(hdr);

 /* 바디 */
 var body=document.createElement('div');
 body.style.cssText='padding:16px 24px;background:var(--surface)';

 /* 테이블 번호 */
 var tName=window._selectedTableId?'테이블 '+window._selectedTableId:'카운터';
 var tRow=document.createElement('div');
 tRow.style.cssText='display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--bd);margin-bottom:8px';
 tRow.innerHTML='<span style="font-size:11px;color:var(--t3)">주문 위치</span><span style="font-size:12px;font-weight:700;color:#f59e0b">'+tName+'</span>';
 body.appendChild(tRow);

 /* 메뉴 목록 */
 items.forEach(function(it){
  var row=document.createElement('div');
  row.style.cssText='display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;align-items:center';
  row.innerHTML='<span style="color:var(--t2)">'+esc(it.name)+' <span style="color:var(--t3)">x'+it.qty+'</span></span>'+
   '<span style="font-weight:700">₩'+(it.price*it.qty).toLocaleString()+'</span>';
  body.appendChild(row);
 });

 /* 구분선 */
 var div=document.createElement('div');
 div.style.cssText='border-top:1px dashed var(--bd);margin:10px 0 12px';
 body.appendChild(div);

 /* 합계 */
 var total_row=document.createElement('div');
 total_row.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px';
 total_row.innerHTML='<span style="font-size:13px;font-weight:700">합계</span>'+
  '<span style="font-size:22px;font-weight:900;color:#22c55e;letter-spacing:-.5px">₩'+total.toLocaleString()+'</span>';
 body.appendChild(total_row);

 var method_row=document.createElement('div');
 method_row.style.cssText='font-size:11px;color:var(--t3);margin-bottom:16px';
 method_row.textContent='결제 수단: '+methodLabel;
 body.appendChild(method_row);

 /* 버튼 3개 */
 /* 카카오 알림톡 */
 var talkBtn=document.createElement('button');
 talkBtn.style.cssText='width:100%;padding:12px;background:linear-gradient(135deg,#ffe812,#f9d900);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;margin-bottom:8px';
 talkBtn.textContent='카카오로 영수증 받기';
 talkBtn.onclick=function(){mo.remove();_filoReceiptTalk();};
 body.appendChild(talkBtn);

 /* 인쇄 + 닫기 */
 var btnRow=document.createElement('div');
 btnRow.style.cssText='display:flex;gap:8px';
 var printBtn=document.createElement('button');
 printBtn.style.cssText='flex:1;padding:11px;background:var(--br);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer';
 printBtn.textContent='인쇄';
 printBtn.onclick=function(){window.print();};
 var closeBtn=document.createElement('button');
 closeBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:10px;color:var(--t2);font-size:13px;cursor:pointer';
 closeBtn.textContent='닫기';
 closeBtn.onclick=function(){mo.remove();};
 btnRow.appendChild(printBtn);btnRow.appendChild(closeBtn);
 body.appendChild(btnRow);

 box.appendChild(body);
 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}



// ── 영수증 알림 ──────────────────────────────────────────────────────

function _filoReceiptNotify(did, tableNum, items, total, methodLabel) {
  // 기존 토스트 제거
  var old = document.getElementById('filo-receipt-popup');
  if(old) old.remove();

  // 팝업 생성
  var popup = document.createElement('div');
  popup.id = 'filo-receipt-popup';
  popup.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
    'background:#1e293b;border:1.5px solid rgba(8,145,178,.4);border-radius:16px;' +
    'padding:16px 18px;z-index:9999;min-width:290px;text-align:center;' +
    'box-shadow:0 8px 32px rgba(0,0,0,.5)';

  // 타이틀
  var ttl = document.createElement('div');
  ttl.style.cssText = 'font-size:14px;font-weight:800;color:#f0f0ff;margin-bottom:12px';
  ttl.textContent = '\u2705 ' + methodLabel + ' \u20a9' + total.toLocaleString() + ' \uacb0\uc81c \uc644\ub8cc!';
  popup.appendChild(ttl);

  // 버튼 행
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px';

  // 영수증 발송 버튼
  var sendBtn = document.createElement('button');
  sendBtn.style.cssText = 'flex:1;padding:9px;background:#0891b2;border:none;' +
    'border-radius:10px;color:#fff;font-size:13px;font-weight:800;cursor:pointer';
  sendBtn.textContent = '\ud83e\uddfe \uc601\uc218\uc99d \ubc1c\uc1a1';
  row.appendChild(sendBtn);

  // 주문 취소 버튼
  var cancelPayBtn = document.createElement('button');
  cancelPayBtn.style.cssText = 'flex:1;padding:9px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);' +
    'border-radius:10px;color:#ef4444;font-size:12px;font-weight:800;cursor:pointer';
  cancelPayBtn.textContent = '\uC8FC\uBB38 \uCDE8\uC18C';
  cancelPayBtn.onclick = function(){
    if(!confirm('\uACB0\uC81C\uB97C \uCDE8\uC18C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\uACB0\uC81C \uAE30\uB85D\uC774 \uCDE8\uC18C \uCC98\uB9AC\uB429\uB2C8\uB2E4.'))return;
    var tasks=[];
    if(_lastPosSaleRef) tasks.push(_lastPosSaleRef.update({status:'cancel',cancelledAt:new Date().toISOString()}));
    tasks.push(
      _db.collection('filo_payments').where('dealerId','==',did).where('tableNum','==',tableNum)
        .where('date','==',new Date().toISOString().slice(0,10)).orderBy('paidAt','desc').limit(1).get()
        .then(function(snap){
          if(!snap.empty) return snap.docs[0].ref.update({status:'cancel',cancelledAt:new Date().toISOString()});
        })
    );
    Promise.all(tasks).then(function(){
      popup.remove(); _lastPosSaleRef=null;
      _filoToast('\uC8FC\uBB38\uC774 \uCDE8\uC18C\uB418\uC5C8\uC2B5\uB2C8\uB2E4');
    }).catch(function(e){_filoToast('\uCDE8\uC18C \uC2E4\uD328: '+e.message);});
  };
  row.appendChild(cancelPayBtn);

  // 닫기 버튼
  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'padding:9px 14px;background:rgba(255,255,255,.08);border:none;' +
    'border-radius:10px;color:#94a3b8;font-size:13px;cursor:pointer';
  closeBtn.textContent = '\u2715';
  closeBtn.onclick = function(){ popup.remove(); };
  row.appendChild(closeBtn);
  popup.appendChild(row);

  // 상태 메시지
  var status = document.createElement('div');
  status.style.cssText = 'font-size:11px;color:#94a3b8;margin-top:8px;display:none;line-height:1.4';
  popup.appendChild(status);

  document.body.appendChild(popup);

  // 8초 후 자동 제거
  var timer = setTimeout(function(){ popup.remove(); }, 8000);

  // 영수증 발송 클릭
  sendBtn.onclick = function() {
    sendBtn.disabled = true;
    sendBtn.textContent = '\u23f3 \ubc1c\uc1a1 \uc911...';
    status.style.display = 'block';
    status.textContent = '\uc190\ub2d8 \ud3f0\uc73c\ub85c \uc601\uc218\uc99d \ubc1c\uc1a1 \uc911...';
    clearTimeout(timer);

    _db.collection('filo_orders')
      .where('dealerId','==',did)
      .where('tableNum','==',parseInt(tableNum))
      .where('date','==',_today())
      .get().then(function(snap){
        var tok = null, ordId = null;
        snap.forEach(function(doc){
          var t = doc.data().fcmToken;
          if(t && t.length > 20){ tok = t; ordId = doc.id; }
        });
        if(!tok){
          sendBtn.textContent = '\u274c \ud1a0\ud070 \uc5c6\uc74c';
          status.textContent = '\uc190\ub2d8\uc774 \uc54c\ub9bc\uc744 \ud5c8\uc6a9\ud558\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4';
          setTimeout(function(){ popup.remove(); }, 3000);
          return;
        }
        var rUrl = 'https://filo.ai.kr/order-done?oid='+(ordId||'')+'&did='+did+'&t='+tableNum;
        var iNames = items.slice(0,3).map(function(it){
          return it.name + (it.qty>1 ? ' x'+it.qty : '');
        }).join(', ');
        if(items.length > 3) iNames += ' \uc678 '+(items.length-3)+'\uac74';
        fetch('/fcm/notify-drivers',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            tokens:[tok],
            title:'\ud83e\uddfe \uc601\uc218\uc99d \u00b7 \u20a9'+total.toLocaleString(),
            body:iNames,
            type:'receipt',
            url:rUrl
          })
        }).then(function(r){return r.json();}).then(function(d){
          if(d.sent > 0){
            sendBtn.textContent = '\u2705 \ubc1c\uc1a1\uc644\ub8cc';
            sendBtn.style.background = '#16a34a';
            status.textContent = '\uc190\ub2d8 \ud3f0\uc73c\ub85c \uc601\uc218\uc99d\uc774 \ubc1c\uc1a1\ub418\uc5c8\uc2b5\ub2c8\ub2e4!';
            setTimeout(function(){ popup.remove(); }, 3000);
          } else {
            sendBtn.textContent = '\u274c \ubc1c\uc1a1\uc2e4\ud328';
            sendBtn.disabled = false;
          }
        }).catch(function(){
          sendBtn.textContent = '\u274c \uc624\ub958';
          sendBtn.disabled = false;
        });
      }).catch(function(){
        sendBtn.textContent = '\u274c \uc870\ud68c\uc2e4\ud328';
        sendBtn.disabled = false;
      });
  };
}


   function render(){
    var selTotal=getSelTotal();
    box.innerHTML=
     '<div style="font-size:15px;font-weight:900;margin-bottom:6px">각자 계산 - '+tableName+'</div>'+
     '<div style="font-size:11px;color:var(--t2);margin-bottom:10px">계산할 메뉴 선택</div>'+
     allItems.map(function(it,i){
      var on=checkedMap[i];
      return '<div data-idx="'+i+'" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:'+(on?'rgba(8,145,178,.15)':'var(--surface2)')+';border:1.5px solid '+(on?'#0891b2':'var(--bd2)')+'">'+
       '<div style="width:20px;height:20px;border-radius:50%;border:2px solid '+(on?'#0891b2':'var(--bd2)')+';background:'+(on?'#0891b2':'transparent')+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;flex-shrink:0">'+(on?'✓':'')+'</div>'+
       '<span style="flex:1;font-size:13px">'+(it.name||'')+' ×'+(it.qty||1)+'</span>'+
       '<span style="font-size:13px;font-weight:700">₩'+((it.price||0)*(it.qty||1)).toLocaleString()+'</span></div>';
     }).join('')+
     '<div style="background:var(--surface2);border-radius:var(--r);padding:10px 12px;margin:10px 0;display:flex;justify-content:space-between">'+
     '<span style="font-size:13px;font-weight:700">선택 합계</span>'+
     '<span style="font-size:14px;font-weight:900;color:#0891b2">₩'+selTotal.toLocaleString()+'</span></div>'+
     '<div style="display:flex;gap:8px">'+
     '<button id="tself-card" style="flex:1;padding:12px;background:rgba(8,145,178,.15);border:1.5px solid #0891b2;border-radius:12px;color:#0891b2;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px'+(selTotal<=0?';opacity:.4;pointer-events:none':'')+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>카드</button>'+
     '<button id="tself-cash" style="flex:1;padding:12px;background:rgba(34,197,94,.15);border:1.5px solid #22c55e;border-radius:12px;color:#22c55e;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px'+(selTotal<=0?';opacity:.4;pointer-events:none':'')+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>현금</button>'+
     '<button id="tself-cancel" style="padding:12px 14px;background:var(--surface2);border:none;border-radius:12px;color:var(--t2);font-size:13px;cursor:pointer">취소</button>'+
     '</div>';

    box.querySelectorAll('[data-idx]').forEach(function(el){
     el.onclick=function(){
      var idx=parseInt(el.dataset.idx);
      checkedMap[idx]=!checkedMap[idx];
      render();
     };
    });
    var cb=box.querySelector('#tself-card');
    var hb=box.querySelector('#tself-cash');
    var xb=box.querySelector('#tself-cancel');
    if(cb)cb.onclick=function(){
     var sel=allItems.filter(function(_,i){return checkedMap[i];});
     var total=getSelTotal();
     if(!sel.length||total<=0){_filoToast('메뉴를 선택하세요');return;}
     mo.remove();
     _filoTablePay(did,sel,total,tableNum,tableName,'card',allOrderIds);
    };
    if(hb)hb.onclick=function(){
     var sel=allItems.filter(function(_,i){return checkedMap[i];});
     var total=getSelTotal();
     if(!sel.length||total<=0){_filoToast('메뉴를 선택하세요');return;}
     mo.remove();
     _filoTablePay(did,sel,total,tableNum,tableName,'cash',allOrderIds);
    };
    if(xb)xb.onclick=function(){mo.remove();};
   }
   render();
  }).catch(function(e){_filoToast(e.message);});
}



// ── 고객 확인 화면 (양면 POS — 고객이 볼 수 있는 주문 현황) ─────────────────────
function _posCustomerDisplay(){
 var el=document.getElementById('pos-cust-disp');if(el){el.remove();_posCustMode=false;_posCustSyncStop();return;}
 _posCustMode=true;
 var overlay=document.createElement('div');
 overlay.id='pos-cust-disp';
 overlay.style.cssText='position:fixed;inset:0;z-index:850;background:#050e1a;display:flex;flex-direction:column;font-family:Pretendard,-apple-system,sans-serif;color:#e2e8f0;overflow:hidden';

 var tbl=window._selectedTableName||'';
 var tblLabel=tbl?tbl+' 주문':'주문 내역';

 // 헤더
 var hdr=document.createElement('div');
 hdr.style.cssText='flex-shrink:0;padding:20px 24px 0;display:flex;align-items:center;justify-content:space-between';
 hdr.innerHTML='<div>'+
  '<div style="font-size:11px;font-weight:900;letter-spacing:2px;color:#475569;text-transform:uppercase;margin-bottom:4px">CUSTOMER DISPLAY</div>'+
  '<div style="font-size:18px;font-weight:900;color:#e2e8f0">'+tblLabel+'</div>'+
  '</div>'+
  '<button id="cust-close" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#64748b;font-size:12px;font-weight:700;cursor:pointer;padding:8px 16px;display:flex;align-items:center;gap:6px">'+
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>닫기</button>';

 // 주문 목록 영역
 var listWrap=document.createElement('div');
 listWrap.style.cssText='flex:1;overflow-y:auto;padding:20px 24px';
 listWrap.id='cust-item-list';

 // 합계 바
 var foot=document.createElement('div');
 foot.style.cssText='flex-shrink:0;padding:20px 24px 32px;border-top:1px solid rgba(255,255,255,.08);background:#0a1628';
 foot.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-end">'+
  '<div>'+
  '<div id="cust-item-count" style="font-size:13px;color:#64748b;font-weight:700;margin-bottom:6px">0개 항목</div>'+
  '<div style="font-size:13px;color:#64748b">합계</div>'+
  '</div>'+
  '<div id="cust-total" style="font-size:38px;font-weight:900;color:#c9a84c;font-variant-numeric:tabular-nums;letter-spacing:-1px">₩0</div>'+
  '</div>'+
  '<div style="margin-top:16px;padding:14px 18px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:12px;text-align:center">'+
  '<div style="font-size:12px;color:#94a3b8">메뉴를 선택하시면 직원이 바로 처리해 드립니다</div>'+
  '</div>';

 overlay.appendChild(hdr);
 overlay.appendChild(listWrap);
 overlay.appendChild(foot);
 document.body.appendChild(overlay);

 overlay.querySelector('#cust-close').onclick=function(){overlay.remove();_posCustMode=false;_posCustSyncStop();};

 _posCustRender();
 _posCustSyncStart();
}

var _posCustMode=false;
var _posCustTimer=null;

function _posCustSyncStart(){
 _posCustTimer=setInterval(_posCustRender,300);
}
function _posCustSyncStop(){
 if(_posCustTimer){clearInterval(_posCustTimer);_posCustTimer=null;}
}

function _posCustRender(){
 var listEl=document.getElementById('cust-item-list');
 var totalEl=document.getElementById('cust-total');
 var countEl=document.getElementById('cust-item-count');
 if(!listEl)return;
 var items=window._cartItems||[];
 if(!items.length){
  listEl.innerHTML='<div style="text-align:center;padding:60px 20px;color:#334155">'+
   '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'+
   '<div style="font-size:16px;color:#475569;font-weight:700">선택된 메뉴가 없습니다</div></div>';
  if(totalEl)totalEl.textContent='₩0';
  if(countEl)countEl.textContent='0개 항목';
  return;
 }
 var total=items.reduce(function(s,c){return s+c.price*c.qty;},0);
 var disc=window._posDiscount||0;
 var finalTotal=Math.max(0,total-disc);
 var totalQty=items.reduce(function(s,c){return s+c.qty;},0);
 listEl.innerHTML=items.map(function(c){
  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.05)">'+
   '<div style="flex:1">'+
   '<div style="font-size:16px;font-weight:800;color:#e2e8f0;margin-bottom:4px">'+esc(c.name)+'</div>'+
   '<div style="font-size:13px;color:#64748b">₩'+c.price.toLocaleString()+' × '+c.qty+'</div>'+
   '</div>'+
   '<div style="font-size:18px;font-weight:900;color:#c9a84c;font-variant-numeric:tabular-nums">₩'+(c.price*c.qty).toLocaleString()+'</div>'+
   '</div>';
 }).join('')+
 (disc>0?'<div style="display:flex;justify-content:space-between;padding:12px 0;color:#f87171">'+
  '<span style="font-size:14px;font-weight:700">할인</span>'+
  '<span style="font-size:16px;font-weight:900">-₩'+disc.toLocaleString()+'</span></div>':'');
 if(totalEl)totalEl.textContent='₩'+finalTotal.toLocaleString();
 if(countEl)countEl.textContent=totalQty+'개 항목 선택됨';
}

// 결제 완료 처리