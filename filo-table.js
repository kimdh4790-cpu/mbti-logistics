/**
 * @module      filo-table.js
 * ══════════════════════════════════════════════════════
 * 역할: 테이블 현황·착석·비움·이동·직원호출·테이블설정
 *        (QR 생성·인쇄 → filo-qr.js)
 *
 * 저장 컬렉션:
 *   filo_tables   — 테이블 상태 (empty/occupied/reserved)
 *   filo_orders   — 테이블 주문
 *   filo_payments — 결제 기록
 *   filo_bookings — 예약 (확정/거절 → filo-booking.js)
 *   staff_calls   — 직원 호출
 *
 * 의존: filo-common.js, filo-booking.js (예약 함수)
 *
 * 테이블 모달 버튼 (사용중):
 *   💳 후불결제 / 👥 각자 / ✂️ 분할 / 🟢 비움 / 🔔준비완료 / ↔️이동 / 닫기
 *
 * ⚠️ 2026-07-15 분리:
 *   예약/달력/스케줄 → filo-booking.js
 *   (_filoPageSchedule, _filoRenderCalendar 등 9개 함수)
 *
 * PENDING: 테이블 모달 버튼 4개로 정리 (박람회 전)
 * ══════════════════════════════════════════════════════
 */
// 관련 컬렉션: filo_tables, filo_orders, filo_payments, filo_bookings
// ⚠️ 2026-07-12 리팩토링:
//   filo-common.js 중복 함수 통합 (단일화)
//   _filoTableClear: 비움 시 filo_orders 삭제 + filo_payments 삭제
//   _filoTableOrderModal: filo_payments 기반 결제내역 표시
//   _filoMarkPaid: _filoTablePay 호출로 통일
//   status 보정: filo_tables.empty + 오늘 주문 있으면 occupied 표시


function _filoTableLoad(did){
 did=did||_CU.dealerId||_CU.uid;
 var today=_today();
 /* 기존 리스너 해제 */
 if(window._tableUnsub)window._tableUnsub();
 if(window._bookingUnsub)window._bookingUnsub();
 if(window._callUnsub)window._callUnsub();

 /* 직원 호출 실시간 감지 */
 window._callUnsub=_db.collection('staff_calls')
  .where('dealerId','==',did).where('status','==','pending')
  .onSnapshot(function(snap){
   var banner=document.getElementById('staff-call-banner');
   var grid=document.getElementById('filo-table-grid');
   if(!banner)return;
   // 호출 중인 테이블 번호 수집
   var callMap={};
   snap.forEach(function(doc){
    var d=doc.data();
    var tNum=d.tableNum||d.tableInfo||'?';
    if(!callMap[tNum])callMap[tNum]={count:0,ids:[]};
    callMap[tNum].count++;
    callMap[tNum].ids.push(doc.id);
   });
   // 배너 업데이트
   if(snap.size>0){
    banner.innerHTML='';
    var title=document.createElement('div');
    title.style.cssText='font-size:12px;font-weight:800;color:#ef4444;margin-bottom:6px';
    title.textContent='🔔 직원 호출 ('+snap.size+'건)';
    banner.appendChild(title);
    Object.keys(callMap).forEach(function(k){
     var span=document.createElement('span');
     span.style.cssText='display:inline-flex;align-items:center;gap:4px;background:rgba(239,68,68,.2);padding:4px 10px;border-radius:20px;margin:2px';
     span.textContent='🔔 테이블 '+k+' ';
     var btn=document.createElement('button');
     btn.textContent='OK';
     btn.style.cssText='background:#ef4444;color:#fff;border:none;border-radius:10px;padding:2px 8px;font-size:10px;font-weight:700;cursor:pointer;margin-left:4px';
     (function(ids,num){btn.onclick=function(){_filoConfirmCall(ids.join(','),num);};})(callMap[k].ids,k);
     span.appendChild(btn);
     banner.appendChild(span);
    });
    banner.style.display='block';
   } else {
    banner.style.display='none';
   }
   // 테이블 카드 호출 뱃지 업데이트
   if(grid){
    grid.querySelectorAll('[data-tnum]').forEach(function(card){
     var num=card.dataset.tnum;
     var badge=card.querySelector('.call-badge');
     if(callMap[num]){
      card.style.boxShadow='0 0 0 2px #ef4444';
      if(!badge){
       var b=document.createElement('div');
       b.className='call-badge';
       b.style.cssText='position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;font-size:10px;font-weight:900;padding:2px 6px;border-radius:10px';
       b.textContent='🔔';
       card.style.position='relative';
       card.appendChild(b);
      }
     } else {
      card.style.boxShadow='';
      if(badge)badge.remove();
     }
    });
   }
  });
 var tableSnap=null,bookingSnap=null,orderMap={};
 // 실시간 주문 감지 (테이블별 주문금액)
 var today=_today();
 _db.collection('filo_orders').where('dealerId','==',did).where('type','==','table')
  .onSnapshot(function(snap){
   orderMap={};
   snap.forEach(function(doc){
    var d=doc.data();
    if(d.createdAt&&d.createdAt.slice(0,10)===today&&d.status!=='cancel'){
     // tableNum 우선, 없으면 tableName에서 숫자 추출
     var tNum=String(d.tableNum||'');
     if(!tNum&&d.tableName)tNum=d.tableName.replace(/[^0-9]/g,'')||d.tableName;
     if(!tNum)return;
     if(!orderMap[tNum])orderMap[tNum]={total:0,items:[],ids:[],paid:false,orders:[],paidTotal:0,pendingTotal:0,hasPending:false};
     var isOrdPaid=(d.payType==='prepay'||d.status==='paid'||d.status==='cleared');
     orderMap[tNum].total+=(d.total||0);
     orderMap[tNum].ids.push(doc.id);
     orderMap[tNum].orders.push({id:doc.id,items:d.items||[],total:d.total||0,paid:isOrdPaid,payType:d.payType||'postpay',createdAt:d.createdAt||'',movedFrom:d.movedFrom||null});
     if(isOrdPaid){orderMap[tNum].paidTotal+=(d.total||0);}
     else{orderMap[tNum].pendingTotal+=(d.total||0);orderMap[tNum].hasPending=true;}
     if(isOrdPaid&&!orderMap[tNum].hasPending)orderMap[tNum].paid=true;
     (d.items||[]).forEach(function(it){orderMap[tNum].items.push(it);});
    }
   });
   tryRender();
  });

 function tryRender(){
  if(!tableSnap||!bookingSnap)return;

  var tables=tableSnap.empty?
   Array.from({length:10},function(_,i){return {docId:'auto_'+(i+1),num:i+1,name:'테이블 '+(i+1),status:'empty',reservedName:'',occupiedSince:''};})
   :tableSnap.docs.map(function(d){
    var f=d.data();
    return {docId:d.id,num:f.tableNum||1,name:f.tableName||'테이블',status:f.status||'empty',reservedName:f.reservedName||'',occupiedSince:f.occupiedSince||''};
   }).sort(function(a,b){return a.num-b.num;})
   .filter(function(t,i,arr){return arr.findIndex(function(x){return x.num===t.num;})=== i;});

  /* 테이블 그리드 */
  var grid=document.getElementById('filo-table-grid');
  if(!grid)return;
  grid.innerHTML='';
  tables.forEach(function(t){
   var s=t.status;
   var ord=orderMap[String(t.num)]||orderMap[t.name]||null;
   var hasOrder=ord&&ord.total>0;
   // 주문/결제 있으면 occupied로 보정 (비움 전까지)
   if(s==='empty'&&hasOrder)s='occupied';
   // 결제 상태
   var isPaid=ord&&(ord.paid||ord.hasCleared)&&!ord.hasPending;
   var color=s==='empty'?'#22c55e':isPaid?'#6366f1':s==='occupied'?'#ef4444':'#f59e0b';
   var bg=s==='empty'?'rgba(34,197,94,.06)':isPaid?'rgba(99,102,241,.08)':s==='occupied'?'rgba(239,68,68,.08)':'rgba(245,158,11,.08)';
   var border=s==='empty'?'rgba(34,197,94,.25)':isPaid?'rgba(99,102,241,.3)':s==='occupied'?'rgba(239,68,68,.25)':'rgba(245,158,11,.3)';
   var icon=s==='empty'?'🪑':isPaid?'💳':s==='occupied'?'🍽':'📋';
   var statusTxt=s==='empty'?'빈 테이블':isPaid?'결제완료':s==='occupied'?'사용 중':'예약됨';
   var sub=s==='occupied'&&t.occupiedSince?Math.floor((Date.now()-new Date(t.occupiedSince))/60000)+'분째':(t.reservedName?t.reservedName+'님':'');

   var card=document.createElement('div');
   card.dataset.tnum=t.num;
   var elapsedMin=s==='occupied'&&t.occupiedSince?Math.floor((Date.now()-new Date(t.occupiedSince))/60000):0;
   var urgentBg=elapsedMin>=60?'rgba(239,68,68,.15)':elapsedMin>=30?'rgba(245,158,11,.1)':bg;
   var urgentBorder=elapsedMin>=60?'rgba(239,68,68,.5)':elapsedMin>=30?'rgba(245,158,11,.4)':border;
   card.style.cssText='background:'+(s==='occupied'?urgentBg:bg)+';border:1.5px solid '+(s==='occupied'?urgentBorder:border)+';border-radius:14px;padding:12px;text-align:center;position:relative;cursor:pointer;transition:.15s';
   card.onmouseenter=function(){this.style.transform='scale(1.02)';};
   card.onmouseleave=function(){this.style.transform='';};

   var elapsedTxt=elapsedMin>=60?'⚠️ '+elapsedMin+'분':elapsedMin>=30?'⏱ '+elapsedMin+'분':'';
   var pendAmt=ord&&ord.pendingTotal>0?ord.pendingTotal:0;
   var html='<div style="font-size:22px;margin-bottom:4px">'+icon+'</div>'+
    '<div style="font-size:12px;font-weight:800;color:var(--tx)">'+t.name+'</div>'+
    '<div style="font-size:10px;font-weight:700;color:'+color+';margin-top:2px">'+statusTxt+'</div>'+
    (elapsedTxt?'<div style="font-size:9px;font-weight:700;color:'+(elapsedMin>=60?'#ef4444':'#f59e0b')+';margin-top:1px">'+elapsedTxt+'</div>':'')+
    (pendAmt>0?'<div style="font-size:11px;font-weight:900;color:#fbbf24;margin-top:2px">₩'+pendAmt.toLocaleString()+'</div>':'')+
    (!elapsedTxt&&sub?'<div style="font-size:9px;color:var(--t3);margin-top:1px">'+sub+'</div>':'')+
    (ord&&ord.orders&&ord.orders.some(function(o){return o.movedFrom;})?
     '<div style="font-size:9px;color:#f59e0b;margin-top:2px">↔️ '+(ord.orders.find(function(o){return o.movedFrom;})||{}).movedFrom+'번에서 이동</div>':'')+
    (ord&&ord.paidTotal>0?'<div style="margin-top:4px;font-size:12px;font-weight:900;color:#818cf8">✅ ₩'+ord.paidTotal.toLocaleString()+'</div>':'')+
    (ord&&ord.pendingTotal>0?'<div style="margin-top:2px;font-size:12px;font-weight:900;color:#fbbf24">⏳ ₩'+ord.pendingTotal.toLocaleString()+'</div>':'');

   if(s==='empty'){
    html+='<button data-id="'+t.docId+'" data-did="'+did+'" data-num="'+t.num+'" onclick="event.stopPropagation();_filoTableSeat(this.dataset.id,this.dataset.did,this.dataset.num)" style="margin-top:6px;width:100%;padding:5px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:6px;color:#ef4444;font-size:10px;font-weight:700;cursor:pointer">착석 처리</button>';
   } else {
    html+='<button data-id="'+t.docId+'" data-did="'+did+'" data-num="'+t.num+'" onclick="event.stopPropagation();_filoTableClear(this.dataset.id,this.dataset.did,this.dataset.num)" style="margin-top:4px;width:100%;padding:5px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:6px;color:#22c55e;font-size:10px;font-weight:700;cursor:pointer">비움</button>';
   }
   card.innerHTML=html;
   // 테이블 클릭 → 주문 상세 모달
   (function(table,order){
    card.onclick=function(){_filoTableOrderModal(did,table,order);};
   })(t,ord);
   grid.appendChild(card);
  });

  /* 예약 대기 목록 */
  var blist=document.getElementById('filo-booking-list');
  if(!blist)return;
  var bookingRows=bookingSnap.docs.filter(function(d){var s=d.data().status;return s==='pending'||s==='confirmed';}).sort(function(a,b){return (b.data().createdAt||'')>(a.data().createdAt||'')?1:-1;}).slice(0,20);
  if(!bookingRows.length){blist.innerHTML='<div style="text-align:center;padding:12px;color:var(--t3);font-size:12px">오늘 예약 없음</div>';return;}
  blist.innerHTML=bookingRows.map(function(d){
   var f=d.data();
   var bid=d.id;
   var name=f.customerName||'-';
   var table=f.tableName||'테이블';
   var seats=f.seats||0;
   var time=f.time||'';
   var status=f.status||'pending';
   var memo=f.memo||'';
   var sc={pending:{c:'#f59e0b',l:'대기'},confirmed:{c:'#22c55e',l:'확정'},cancelled:{c:'#ef4444',l:'취소'}}[status]||{c:'var(--t3)',l:status};
   return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);font-size:12px">'+
    '<div style="flex:1">'+
    '<div style="font-weight:700">'+name+'님 <span style="color:var(--t3);font-weight:400">'+seats+'인</span></div>'+
    '<div style="font-size:11px;color:var(--t3)">'+table+(memo?' · '+memo:'')+'</div>'+
    '</div>'+
    '<div style="font-size:10px;color:var(--t3)">'+time+'</div>'+
    '<span style="font-size:10px;font-weight:700;color:'+sc.c+';background:'+sc.c+'22;border-radius:20px;padding:2px 7px">'+sc.l+'</span>'+
    (status==='pending'?
    '<div style="display:flex;gap:4px">'+
    '<button data-bid="'+bid+'" data-did="'+did+'" onclick="_filoBookingConfirm(this.dataset.bid,this.dataset.did)" style="padding:3px 8px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:6px;color:#22c55e;font-size:10px;cursor:pointer">✅ 확정</button>'+
    '<button data-bid="'+bid+'" data-did="'+did+'" onclick="_filoBookingReject(this.dataset.bid,this.dataset.did)" style="padding:3px 8px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:6px;color:#ef4444;font-size:10px;cursor:pointer">❌ 거절</button>'+
    '</div>':'')+
    '</div>';
  }).join('');
 }
 window._tableUnsub=_db.collection('filo_tables').where('dealerId','==',did).onSnapshot(function(snap){
  tableSnap=snap;tryRender();
 },function(e){console.warn('table:',e);});
 window._bookingUnsub=_db.collection('filo_bookings').where('dealerId','==',did).where('date','==',today).onSnapshot(function(snap){
  bookingSnap=snap;tryRender();
 },function(e){console.warn('booking:',e);});
}

window._filoTableSeat=function(docId,did,num){
 var now=_nowISO();
 var id=docId.startsWith('auto_')?(did+'_t'+num):docId;
 _db.collection('filo_tables').doc(id).set({
  dealerId:did,tableNum:parseInt(num),tableName:'테이블 '+num,
  status:'occupied',occupiedSince:now,reservedName:'',updatedAt:now
 },{merge:true}).then(function(){_filoToast('🍽 테이블 '+num+' 착석');_filoTableLoad(did);});
};

window._filoTableClear=function(docId,did,num){
 var now=_nowISO();
 var today=now.slice(0,10);
 // docId 없으면 기본값 생성
 var id=docId&&!docId.startsWith('auto_')&&docId!==did+'_t'+num?docId:(did+'_t'+num);
 _db.collection('filo_tables').doc(id).set({
  status:'empty',occupiedSince:'',reservedName:'',updatedAt:now
 },{merge:true}).then(function(){
  var queries=[
   _db.collection('filo_orders').where('dealerId','==',did).where('type','==','table').where('tableNum','==',parseInt(num)).get(),
   _db.collection('filo_orders').where('dealerId','==',did).where('type','==','table').where('tableNum','==',String(num)).get()
  ];
  Promise.all(queries).then(function(results){
   var batch=_db.batch();var seen={};
   results.forEach(function(snap){
    snap.forEach(function(doc){
     if(seen[doc.id])return;seen[doc.id]=true;
     var d=doc.data();
     if(d.createdAt&&d.createdAt.slice(0,10)===today&&d.status!=='cancel'){
      batch.delete(doc.ref); // cleared 대신 삭제
     }
    });
   });
   return batch.commit();
  }).then(function(){
   // filo_payments 삭제 (결제 내역 초기화)
   return _db.collection('filo_payments')
    .where('dealerId','==',did)
    .where('date','==',today)
    .get().then(function(snap){
     var b=_db.batch();
     snap.forEach(function(doc){
      if(doc.data().tableNum===parseInt(num)||doc.data().tableNum===String(num))
       b.delete(doc.ref);
     });
     return b.commit();
    });
  }).then(function(){
   _filoToast('🪑 테이블 '+num+' 비움');
   _filoTableLoad(did);
  });
 });
};


window._filoTableRefresh=function(){_filoTableLoad(_CU.dealerId||_CU.uid);};

// 테이블 주문 상세 모달
function _filoTableOrderModal(did,table,order){
 var mo=document.createElement('div');
 mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
 var s=table.status;
 var hasOrder=order&&order.total>0;
 // 주문/결제 있으면 occupied로 보정
 if(s==='empty'&&hasOrder)s='occupied';
 var today=_today();

 // 로딩 화면 먼저 표시
 var inner=document.createElement('div');
 inner.style.cssText='background:var(--surface);border-radius:24px 24px 0 0;width:100%;padding:40px 20px;text-align:center;color:var(--t3)';
 inner.innerHTML='<div style="width:40px;height:4px;background:var(--bd);border-radius:2px;margin:0 auto 20px"></div>⏳ 로딩 중...';
 mo.appendChild(inner);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);

 // filo_payments에서 이 테이블 오늘 결제 내역 조회
 _db.collection('filo_payments')
  .where('dealerId','==',did)
  .where('tableNum','==',table.num)
  .where('date','==',today)
  .get().then(function(paySnap){
   var payments=[];
   paySnap.forEach(function(doc){payments.push(Object.assign({_id:doc.id},doc.data()));});
   var paidTotal=payments.reduce(function(s,p){return s+(p.amount||0);},0);

   // 결제된 아이템 이름 목록
   var paidNames=[];
   payments.forEach(function(p){(p.items||[]).forEach(function(it){paidNames.push(it.name);});});

   // 전체 아이템 펼치기
   var allItemsList=[];
   if(hasOrder&&order.orders&&order.orders.length){
    order.orders.forEach(function(ord){
     (ord.items||[]).forEach(function(it){allItemsList.push(it);});
    });
   } else if(hasOrder){
    allItemsList=(order.items||[]);
   }

   var itemsHtml='';
   if(hasOrder&&order.orders&&order.orders.length){
    // 주문 단위로 렌더 → 각 주문의 paid 여부로 정확히 표시
    var rowsHtml='';
    order.orders.forEach(function(ord){
     var isOrdPaid=ord.paid;
     (ord.items||[]).forEach(function(it){
      rowsHtml+='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px">'+
       '<span style="'+(isOrdPaid?'color:#818cf8':'')+'">'+
       (isOrdPaid?'✅ ':'⏳ ')+(it.emoji||'🍽')+' '+(it.name||'')+(it.qty?' ×'+it.qty:'')+'</span>'+
       '<span style="font-weight:700;'+(isOrdPaid?'color:#818cf8':'')+'">₩'+((it.price||0)*(it.qty||1)).toLocaleString()+'</span></div>';
     });
    });
    itemsHtml=rowsHtml||'<div style="text-align:center;padding:20px;color:var(--t3);font-size:13px">주문 내역 없음</div>';
   } else if(allItemsList.length){
    itemsHtml=allItemsList.map(function(it){
     return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px">'+
      '<span>⏳ '+(it.emoji||'🍽')+' '+(it.name||'')+(it.qty?' ×'+it.qty:'')+'</span>'+
      '<span style="font-weight:700">₩'+((it.price||0)*(it.qty||1)).toLocaleString()+'</span></div>';
    }).join('');
   } else {
    itemsHtml='<div style="text-align:center;padding:20px;color:var(--t3);font-size:13px">주문 내역 없음</div>';
   }

   // orderMap에서 이미 계산된 pendingTotal/paidTotal 우선 사용
   var pendingTotal=order.pendingTotal!=null?order.pendingTotal:Math.max(0,(order.total||0)-paidTotal);
   var resolvedPaidTotal=order.paidTotal!=null?order.paidTotal:paidTotal;
   var isAllPaid=pendingTotal<=0&&resolvedPaidTotal>0;

   var summaryHtml='';
   if(hasOrder){
    summaryHtml=
     '<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;padding:10px 0">'+
     '<span>합계</span>'+
     '<span style="color:'+(isAllPaid?'#818cf8':pendingTotal>0?'#fbbf24':'#0891b2')+'">'+
     '₩'+(order.total||0).toLocaleString()+
     (isAllPaid?' ✅':pendingTotal>0?' (미결제 ₩'+pendingTotal.toLocaleString()+')'||'':'')+
     '</span></div>';
   }

   var paymentsHtml='';
   if(payments.length){
    paymentsHtml='<div style="padding:8px 0;border-top:1px dashed var(--bd);margin-top:4px">'+
     payments.map(function(p){
      var icon=p.method==='cash'?'💵':'💳';
      return '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);padding:2px 0">'+
       '<span>'+icon+' '+(p.items||[]).map(function(i){return i.name;}).join(', ')+'</span>'+
       '<span>₩'+(p.amount||0).toLocaleString()+'</span></div>';
     }).join('')+
     '</div>';
   }

   var inner=mo.querySelector('div');
   inner.style.cssText='background:var(--surface);border-radius:24px 24px 0 0;width:100%;max-height:85vh;overflow-y:auto;padding:24px 20px 36px';
   var orderNumHtml='';
   try{
    var numIds=(order&&order.orders&&order.orders.length)
     ? order.orders.map(function(o){return o.id||'';}).filter(Boolean)
     : (order&&order.ids&&order.ids.length) ? order.ids.filter(Boolean) : [];
    if(hasOrder&&numIds.length){
     orderNumHtml='<div style="margin-bottom:10px">'+numIds.map(function(id){
      return '<span style="font-size:11px;color:var(--t3);background:var(--bd);padding:2px 8px;border-radius:10px;margin-right:4px;display:inline-block">#'+id.slice(-6).toUpperCase()+'</span>';
     }).join('')+'</div>';
    }
   }catch(e){}
   inner.innerHTML=
    '<div style="width:40px;height:4px;background:var(--bd);border-radius:2px;margin:0 auto 20px"></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'+
    '<div style="font-size:18px;font-weight:900">🪑 '+table.name+'</div>'+
    (s==='occupied'?'<span style="font-size:11px;font-weight:700;color:#ef4444;background:rgba(239,68,68,.1);padding:4px 10px;border-radius:20px">사용 중</span>':
     s==='empty'?'<span style="font-size:11px;font-weight:700;color:#22c55e;background:rgba(34,197,94,.1);padding:4px 10px;border-radius:20px">빈 테이블</span>':'')+
    '</div>'+
    orderNumHtml+
    '<div style="margin-bottom:4px">'+itemsHtml+'</div>'+
    (hasOrder?'<div style="border-top:2px solid var(--bd);margin-top:4px">'+summaryHtml+paymentsHtml+'</div>':'')+
    '<div id="modal-btn-row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"></div>';

   var btnRow=inner.querySelector('#modal-btn-row');

   if(hasOrder&&pendingTotal>0){
    var payBtn=document.createElement('button');
    payBtn.style.cssText='flex:2;padding:12px;background:#6366f1;border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer';
    payBtn.textContent='💳 후불 결제 (₩'+pendingTotal.toLocaleString()+')';
    (function(d,n,dc){payBtn.onclick=function(){_filoMarkPaid(d,n,dc,payBtn,mo);};})(did,table.num,table.docId);
    btnRow.appendChild(payBtn);

    var splitBtn2=document.createElement('button');
    splitBtn2.style.cssText='flex:1;padding:12px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:12px;color:#f59e0b;font-size:12px;font-weight:700;cursor:pointer';
    splitBtn2.textContent='✂️ 분할';
    (function(tot,ord){splitBtn2.onclick=function(){mo.remove();
     // orders 배열에서 items 펼치기
     var flatItems=[];
     if(ord.orders&&ord.orders.length){
      ord.orders.forEach(function(o){
       (o.items||[]).forEach(function(it){
        var ex=flatItems.find(function(f){return f.name===it.name;});
        if(ex){ex.qty+=(it.qty||1);}
        else{flatItems.push(Object.assign({},it,{qty:it.qty||1}));}
       });
      });
     } else {
      flatItems=(ord.items||[]).slice();
     }
     _cartItems=flatItems.map(function(it){return {id:it.id||'',name:it.name,price:it.price,qty:it.qty||1,emoji:it.emoji||'🍽'};});
     window._selectedTableId=table.num;window._selectedTableName=table.name;
     _filoSplitPay(tot);
    };})(pendingTotal,order);
    btnRow.appendChild(splitBtn2);

    var selfBtn2=document.createElement('button');
    selfBtn2.style.cssText='flex:1;padding:12px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:12px;color:#818cf8;font-size:12px;font-weight:700;cursor:pointer';
    selfBtn2.textContent='👥 각자';
    (function(ord,tNum,tName){selfBtn2.onclick=function(){mo.remove();
     _filoTableSelfPay(did,ord,tNum,tName);
    };})(order,table.num,table.name);
    btnRow.appendChild(selfBtn2);
   }

 if(s!=='empty'){
  var clearBtn=document.createElement('button');
  clearBtn.style.cssText='flex:1;padding:12px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:12px;color:#22c55e;font-size:13px;font-weight:700;cursor:pointer';
  clearBtn.textContent='테이블 비움';
  (function(dc,d,n){clearBtn.onclick=function(){_filoTableClear(dc,d,n);mo.remove();};})(table.docId,did,table.num);
  btnRow.appendChild(clearBtn);
 } else {
  var seatBtn=document.createElement('button');
  seatBtn.style.cssText='flex:1;padding:12px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:12px;color:#ef4444;font-size:13px;font-weight:700;cursor:pointer';
  seatBtn.textContent='🪑 착석 처리';
  (function(dc,d,n){seatBtn.onclick=function(){_filoTableSeat(dc,d,n);mo.remove();};})(table.docId,did,table.num);
  btnRow.appendChild(seatBtn);
 }

 // 준비완료 버튼 (주문 있을 때)
 if(hasOrder&&order.pendingTotal>0){
  var readyBtn=document.createElement('button');
  readyBtn.style.cssText='flex:1;padding:12px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:12px;color:#22c55e;font-size:12px;font-weight:700;cursor:pointer';
  readyBtn.textContent='🔔 준비완료';
  (function(d,tNum,tName){readyBtn.onclick=function(){
   var db=firebase.firestore();
   // 숫자/문자 모두 조회
   Promise.all([
    db.collection('filo_orders').where('dealerId','==',d).where('tableNum','==',String(tNum)).where('status','==','pending').get(),
    db.collection('filo_orders').where('dealerId','==',d).where('tableNum','==',parseInt(tNum)).where('status','==','pending').get()
   ]).then(function(results){
    var batch=db.batch();var tokens=[];var seen={};
    results.forEach(function(snap){
     snap.forEach(function(doc){
      if(seen[doc.id])return;seen[doc.id]=true;
      batch.update(doc.ref,{status:'ready',readyAt:_nowISO()});
      var tk=doc.data().fcmToken;
      if(tk&&tokens.indexOf(tk)<0)tokens.push(tk);
     });
    });
    return batch.commit().then(function(){return tokens;});
   }).then(function(tokens){
    if(tokens.length>0){
     fetch('/fcm/notify-drivers',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
       tokens:tokens,
       title:'🔔 픽업 알림',
       body:'주문하신 음식이 준비됐습니다! 카운터에서 수령해주세요 😊',
       data:{type:'pickup',tableNum:String(tNum),url:'https://filo.ai.kr/order?d='+d+'&t='+tNum}
      })
     }).catch(function(){});
     _filoToast('🔔 테이블 '+tNum+' 픽업 알림 전송!');
    } else {
     _filoToast('⚠️ FCM 토큰 없음 — 알림 미전송 (Firestore 상태는 ready로 변경)');
    }
    mo.remove();
   }).catch(function(e){_filoToast('❌ '+e.message);});
  };})(did,table.num,table.name);
  btnRow.appendChild(readyBtn);
 }

 // 테이블 이동 버튼
 if(hasOrder){
  var moveBtn=document.createElement('button');
  moveBtn.style.cssText='flex:1;padding:12px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:12px;color:#818cf8;font-size:12px;font-weight:700;cursor:pointer';
  moveBtn.textContent='↔️ 이동';
  (function(d,fromNum,fromName,ord){moveBtn.onclick=function(){
   mo.remove();
   _filoTableMoveModal(d,fromNum,fromName,ord);
  };})(did,table.num,table.name,order);
  btnRow.appendChild(moveBtn);
 }

   var closeBtn=document.createElement('button');
   closeBtn.style.cssText='padding:12px 16px;background:var(--b3);border:1px solid var(--bd);border-radius:12px;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer';
   closeBtn.textContent='닫기';
   closeBtn.onclick=function(){mo.remove();};
   btnRow.appendChild(closeBtn);
  }).catch(function(e){
   console.error('[TableModal]',e);
   if(typeof _filoToast==='function')_filoToast('❌ '+(e&&e.message||'오류'));
   mo.remove();
  });
}

// 테이블 각자 계산 (filo_orders 직접 처리)
function _filoMarkPaid(did,tableNum,docId,btn,mo){
 if(!confirm('결제 완료 처리하시겠습니까?'))return;
 btn.disabled=true;btn.textContent='처리 중...';
 var today=_today();

 // 해당 테이블 미결제 주문 전체 조회
 _db.collection('filo_orders')
  .where('dealerId','==',did).where('type','==','table')
  .get().then(function(snap){
   var items=[];var orderIds=[];var total=0;var tableName='';
   snap.forEach(function(doc){
    var d=doc.data();
    if(d.status!=='cleared'&&d.status!=='paid'&&d.status!=='cancel'){
     var tNum=String(d.tableNum||'');
     var tName=d.tableName||'';
     if(tNum===String(tableNum)||tName===('테이블 '+tableNum)){
      (d.items||[]).forEach(function(it){items.push(it);});
      total+=(d.total||0);
      tableName=tName||'테이블 '+tableNum;
      orderIds.push(doc.id);
     }
    }
   });

   // filo_payments에서 이미 결제된 금액 차감
   _db.collection('filo_payments')
    .where('dealerId','==',did).where('tableNum','==',tableNum).where('date','==',today)
    .get().then(function(paySnap){
     var paidTotal=0;
     paySnap.forEach(function(doc){paidTotal+=doc.data().amount||0;});
     var pendingTotal=Math.max(0,total-paidTotal);

     if(pendingTotal<=0){
      _filoToast('이미 모두 결제됐어요! ✅');
      if(mo)mo.remove();
      return;
     }

     // 결제 수단 선택 모달
     var pm=document.createElement('div');pm.className='mo';
     pm.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
     var pb=document.createElement('div');
     pb.style.cssText='background:var(--b2);border:1px solid var(--bd);border-radius:20px;padding:20px;width:100%;max-width:380px';
     pb.innerHTML=
      '<div style="font-size:15px;font-weight:900;margin-bottom:6px">💳 후불 결제</div>'+
      '<div style="background:var(--surface2);border-radius:var(--r);padding:12px;margin-bottom:14px;display:flex;justify-content:space-between">'+
      '<span style="font-size:13px">결제 금액</span>'+
      '<span style="font-size:16px;font-weight:900;color:#22c55e">₩'+pendingTotal.toLocaleString()+'</span></div>'+
      '<div style="display:flex;gap:8px;margin-bottom:8px">'+
      '<button id="mp-card" style="flex:1;padding:14px;background:rgba(8,145,178,.15);border:1.5px solid #0891b2;border-radius:12px;color:#0891b2;font-size:14px;font-weight:700;cursor:pointer">💳 카드</button>'+
      '<button id="mp-cash" style="flex:1;padding:14px;background:rgba(34,197,94,.15);border:1.5px solid #22c55e;border-radius:12px;color:#22c55e;font-size:14px;font-weight:700;cursor:pointer">💵 현금</button>'+
      '</div>'+
      '<button id="mp-cancel" style="width:100%;padding:11px;background:var(--surface2);border:none;border-radius:12px;color:var(--t2);font-size:13px;cursor:pointer">취소</button>';

     pm.appendChild(pb);
     pm.onclick=function(e){if(e.target===pm)pm.remove();};
     document.body.appendChild(pm);

     function doPay(method){
      pm.remove();
      if(mo)mo.remove();
      _filoTablePay(did,items,pendingTotal,tableNum,tableName,method,orderIds);
      // 테이블 비움
      if(docId&&!docId.startsWith('auto_'))
       _db.collection('filo_tables').doc(docId).set({status:'empty',occupiedSince:'',updatedAt:_nowISO()},{merge:true});
     }

     pb.querySelector('#mp-card').onclick=function(){doPay('card');};
     pb.querySelector('#mp-cash').onclick=function(){doPay('cash');};
     pb.querySelector('#mp-cancel').onclick=function(){pm.remove();btn.disabled=false;btn.textContent='💳 후불 결제';};
    }).catch(function(e){_filoToast('❌ '+e.message);btn.disabled=false;});
  }).catch(function(e){_filoToast('❌ '+e.message);btn.disabled=false;});
}
window._filoConfirmCall=function(idsStr,tableNum){
 var ids=idsStr.split(',');
 var batch=_db.batch();
 ids.forEach(function(id){
  if(id)batch.update(_db.collection('staff_calls').doc(id),{status:'confirmed',confirmedAt:_nowISO()});
 });
 batch.commit().then(function(){
  _filoToast('✅ 테이블 '+tableNum+' 호출 확인됨');
 });
};

window._filoTableInit=function(){
 var did=_CU.dealerId||_CU.uid;
 var count=parseInt(document.getElementById('table-count-inp').value)||10;
 var now=_nowISO();
 var batch=_db.batch();
 Array.from({length:count},function(_,i){
  var n=i+1;
  var ref=_db.collection('filo_tables').doc(did+'_t'+n);
  batch.set(ref,{dealerId:did,tableNum:n,tableName:'테이블 '+n,status:'empty',occupiedSince:'',reservedName:'',updatedAt:now},{merge:true});
 });
 batch.commit().then(function(){_filoToast('✅ 테이블 '+count+'개 설정 완료');_filoTableLoad(did);});
};


function _filoPageTableOrder(el){
 var did=_CU.dealerId||_CU.uid;
 _toTable=null;_toCart={};
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';wrap.style.maxWidth='900px';wrap.style.margin='0 auto';

 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px';
 hdr.innerHTML='<div><div class="page-title">🪑 테이블 오더</div>'+
  '<div class="page-sub">직원 태블릿으로 테이블 주문 접수</div></div>';
 var kitBtn=document.createElement('button');
 kitBtn.style.cssText='padding:6px 12px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:8px;color:#a78bfa;font-size:11px;font-weight:700;cursor:pointer';
 kitBtn.textContent='🍳 주방화면';
 kitBtn.onclick=function(){window.open('https://filo.ai.kr/kitchen?did='+did,'_blank');};
 hdr.appendChild(kitBtn);
 wrap.appendChild(hdr);

 var layout=document.createElement('div');
 layout.style.cssText='display:grid;grid-template-columns:220px 1fr;gap:14px';

 /* 왼쪽: 테이블 */
 var leftCard=document.createElement('div');leftCard.className='card';
 leftCard.style.cssText='height:fit-content;position:sticky;top:calc(var(--topbar-h) + 16px)';
 leftCard.innerHTML='<div class="sec-title" style="margin-bottom:10px">🪑 테이블 선택</div>'+
  '<div id="to-table-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">'+
  '<div style="text-align:center;padding:20px;color:var(--t3);grid-column:1/-1;font-size:12px">⏳</div></div>';
 layout.appendChild(leftCard);

 /* 오른쪽 */
 var rw=document.createElement('div');
 var menuCard=document.createElement('div');menuCard.className='card';menuCard.style.marginBottom='14px';
 menuCard.innerHTML='<div id="to-cat-wrap" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px"></div>'+
  '<div id="to-menu-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">'+
  '<div style="text-align:center;padding:30px;color:var(--t3);grid-column:1/-1;font-size:12px">테이블을 먼저 선택하세요</div></div>';
 rw.appendChild(menuCard);

 var cartCard=document.createElement('div');cartCard.className='card';cartCard.id='to-cart-card';
 var submitBtn=document.createElement('button');
 submitBtn.style.cssText='width:100%;padding:14px;background:linear-gradient(135deg,#7c3aed,#9f5ef8);border:none;border-radius:var(--r);color:#fff;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 4px 16px rgba(124,58,237,.35);margin-top:10px';
 submitBtn.textContent='📤 주문 전송';
 submitBtn.onclick=function(){_toSubmitOrder(did);};
 cartCard.innerHTML='<div class="sec-title" style="margin-bottom:10px">🛒 주문 내역</div>'+
  '<div id="to-cart-list"><div style="text-align:center;padding:16px;color:var(--t3);font-size:12px">메뉴를 선택하세요</div></div>'+
  '<div id="to-total-wrap" style="display:none;border-top:1px solid var(--bd);padding-top:10px;margin-top:10px">'+
  '<div style="display:flex;justify-content:space-between;align-items:center">'+
  '<span style="font-size:14px;font-weight:800">합계</span>'+
  '<span id="to-total" style="font-size:20px;font-weight:900;color:#22c55e">₩0</span></div></div>';
 cartCard.appendChild(submitBtn);
 rw.appendChild(cartCard);
 layout.appendChild(rw);
 wrap.appendChild(layout);
 el.appendChild(wrap);
 _toLoadTables(did);_toLoadMenus(did);
}

// ── 테이블 이동 모달 ──────────────────────────────────────────────────────────
function _filoTableMoveModal(did,fromNum,fromName,order){
 var mo=document.createElement('div');
 mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
 
 // 현재 테이블 목록 가져오기
 firebase.firestore().collection('filo_tables').where('dealerId','==',did).get().then(function(snap){
  var tables=[];
  snap.forEach(function(doc){
   var d=doc.data();
   var num=d.tableNum||doc.id;
   if(String(num)!==String(fromNum))tables.push({num:num,name:d.tableName||'테이블 '+num,status:d.status||'empty'});
  });
  tables.sort(function(a,b){return parseInt(a.num)-parseInt(b.num);});
  
  
  // 테이블 버튼 생성
  var btnWrap=document.createElement('div');
  btnWrap.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px';
  tables.forEach(function(t){
   var clr=t.status==='occupied'?'#ef4444':'#22c55e';
   var bg=t.status==='occupied'?'rgba(239,68,68,.1)':'rgba(34,197,94,.1)';
   var btn=document.createElement('button');
   btn.style.cssText='padding:14px 18px;background:'+bg+';border:1.5px solid '+clr+';border-radius:12px;color:'+clr+';font-size:14px;font-weight:800;cursor:pointer';
   btn.textContent=t.name+(t.status==='occupied'?' 🔴':' 🟢');
   (function(toN){btn.onclick=function(){window._filoDoTableMove(did,fromNum,toN,mo);};})(t.num);
   btnWrap.appendChild(btn);
  });

  var inner=document.createElement('div');
  inner.style.cssText='background:var(--surface);border-radius:20px;padding:24px;width:100%;max-width:400px;max-height:80vh;overflow-y:auto';
  var hdr=document.createElement('div');
  hdr.innerHTML='<div style="font-size:17px;font-weight:900;margin-bottom:6px">↔️ 테이블 이동</div>'+
   '<div style="font-size:13px;color:var(--t2);margin-bottom:16px">'+fromName+' → 이동할 테이블 선택</div>';
  var cancelBtn=document.createElement('button');
  cancelBtn.style.cssText='width:100%;padding:13px;background:var(--b3);border:1px solid var(--bd);border-radius:12px;color:var(--t2);font-size:14px;font-weight:700;cursor:pointer;margin-top:8px';
  cancelBtn.textContent='취소';
  cancelBtn.onclick=function(){mo.remove();};
  inner.appendChild(hdr);
  inner.appendChild(btnWrap);
  inner.appendChild(cancelBtn);
  mo.appendChild(inner);
  
  setTimeout(function(){
   mo.onclick=function(e){if(e.target===mo)mo.remove();};
  },100);
  document.body.appendChild(mo);
 });
}

window._filoDoTableMove=function(did,fromNum,toNum,moEl){
 var db=firebase.firestore();
 var now=_nowISO();
 var toName='테이블 '+toNum;

 // filo_orders: fromNum → toNum (숫자/문자 모두)
 Promise.all([
  db.collection('filo_orders').where('dealerId','==',did).where('tableNum','==',String(fromNum)).get(),
  db.collection('filo_orders').where('dealerId','==',did).where('tableNum','==',parseInt(fromNum)).get()
 ]).then(function(results){
  var batch=db.batch();var seen={};
  results.forEach(function(snap){
   snap.forEach(function(doc){
    if(seen[doc.id])return;seen[doc.id]=true;
    if(doc.data().status==='cancel'||doc.data().status==='cleared')return;
    batch.update(doc.ref,{
     tableNum:parseInt(toNum),
     tableName:toName,
     movedFrom:parseInt(fromNum),
     movedAt:now
    });
   });
  });
  return batch.commit();
 }).then(function(){
  // filo_payments도 이동
  var today=now.slice(0,10);
  return Promise.all([
   db.collection('filo_payments').where('dealerId','==',did).where('tableNum','==',parseInt(fromNum)).where('date','==',today).get(),
   db.collection('filo_payments').where('dealerId','==',did).where('tableNum','==',String(fromNum)).where('date','==',today).get()
  ]).then(function(results){
   var batch=db.batch();var seen={};
   results.forEach(function(snap){
    snap.forEach(function(doc){
     if(seen[doc.id])return;seen[doc.id]=true;
     batch.update(doc.ref,{tableNum:parseInt(toNum),tableName:toName});
    });
   });
   return batch.commit();
  });
 }).then(function(){
  // filo_tables: fromNum → empty
  return db.collection('filo_tables').where('dealerId','==',did).where('tableNum','==',parseInt(fromNum)).get()
   .then(function(snap){
    var batch=db.batch();
    snap.forEach(function(doc){batch.update(doc.ref,{status:'empty',occupiedSince:'',updatedAt:now});});
    return batch.commit();
   });
 }).then(function(){
  _filoToast('↔️ 테이블 '+fromNum+' → '+toNum+' 이동 완료!');
  if(moEl)moEl.remove();
  // POS 테이블바 알림
  if(window._loadKioskTableBar)_loadKioskTableBar();
  // 테이블 현황 새로고침
  setTimeout(function(){
   var cont=document.getElementById('content');
   if(cont&&typeof _filoPageTableOrder==='function')_filoPageTableOrder(cont,did);
  },500);
 }).catch(function(e){_filoToast('❌ '+e.message);});
};

function _filoPageTableMgmt(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="slide-up" style="max-width:800px;margin:0 auto">';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:800px;margin:0 auto';

 /* 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
 hdr.innerHTML='<div><div class="page-title">🪑 테이블 관리</div><div class="page-sub">실시간 테이블 현황 및 설정</div></div>';
 var setupBtn=document.createElement('button');
 setupBtn.className='btn btn-primary btn-sm';
 setupBtn.textContent='+ 테이블 설정';
 setupBtn.onclick=function(){_filoTableSetup(did);};
 hdr.appendChild(setupBtn);
 wrap.appendChild(hdr);

 /* 실시간 현황 */
 var liveWrap=document.createElement('div');
 liveWrap.id='table-live';
 liveWrap.innerHTML='<div class="card"><div style="text-align:center;padding:20px;color:var(--t3)">⏳ 로딩 중...</div></div>';
 wrap.appendChild(liveWrap);

 el.innerHTML='';
 el.appendChild(wrap);
 _filoLoadTableMgmt(did);
}
function _filoLoadTableMgmt(did){
 if(_tableMgmtUnsub){_tableMgmtUnsub();_tableMgmtUnsub=null;}
 _tableMgmtUnsub=_db.collection('filo_tables')
  .where('dealerId','==',did)
  .onSnapshot(function(snap){
   var tables=[];
   snap.forEach(function(doc){tables.push(Object.assign({_id:doc.id},doc.data()));});
   tables.sort(function(a,b){return (a.tableId||0)-(b.tableId||0);});
   _filoRenderTableMgmt(did,tables);
  });
}
function _filoRenderTableMgmt(did,tables){
 var wrap=document.getElementById('table-live');
 if(!wrap)return;

 if(!tables.length){
  wrap.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">'+
  '<div style="font-size:32px;margin-bottom:8px">🪑</div>'+
  '<div style="font-size:14px;font-weight:700;color:var(--t2);margin-bottom:6px">테이블이 없습니다</div>'+
  '<div style="font-size:12px;margin-bottom:16px">테이블 설정 버튼을 눌러 테이블을 추가하세요</div>'+
  '</div>';
  return;
 }

 var empty=tables.filter(function(t){return t.status==='empty';}).length;
 var occupied=tables.filter(function(t){return t.status==='occupied';}).length;
 var reserved=tables.filter(function(t){return t.status==='reserved';}).length;

 var html='<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">'+
 [{label:'전체',val:tables.length+'개',c:'#a78bfa',cls:'kpi-revenue'},
  {label:'빈 테이블',val:empty+'개',c:'#22c55e',cls:'kpi-profit'},
  {label:'사용중',val:occupied+'개',c:'#ef4444',cls:'kpi-cost'},
  {label:'예약',val:reserved+'개',c:'#f59e0b',cls:'kpi-margin'}
 ].map(function(s){
  return '<div class="kpi-card '+s.cls+'">'+
  '<div class="kpi-label">'+s.label+'</div>'+
  '<div class="kpi-val" style="color:'+s.c+'">'+s.val+'</div></div>';
 }).join('')+'</div>';

 /* 테이블 맵 */
 html+='<div class="card"><div class="section-header"><h3>테이블 맵</h3>'+
 '<span style="font-size:10px;color:var(--t3)">클릭으로 상태 변경</span></div>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px">';

 var statusMap={
  empty:{label:'빈자리',color:'#22c55e',bg:'rgba(34,197,94,.1)',bd:'rgba(34,197,94,.25)',icon:'🟢'},
  occupied:{label:'사용중',color:'#ef4444',bg:'rgba(239,68,68,.1)',bd:'rgba(239,68,68,.25)',icon:'🔴'},
  reserved:{label:'예약',color:'#f59e0b',bg:'rgba(245,158,11,.1)',bd:'rgba(245,158,11,.25)',icon:'🟡'},
  cleaning:{label:'청소중',color:'#60a5fa',bg:'rgba(96,165,250,.1)',bd:'rgba(96,165,250,.25)',icon:'🔵'}
 };

 tables.forEach(function(t){
  var s=statusMap[t.status||'empty'];
  var since=t.since&&t.status==='occupied'?Math.floor((Date.now()-new Date(t.since))/60000)+'분':'';
  html+='<div onclick="_filoTableStatusChange(\''+did+'\',\''+t._id+'\',\''+t.status+'\')" '+
  'style="padding:14px 8px;text-align:center;border-radius:var(--r);cursor:pointer;transition:.2s;'+
  'background:'+s.bg+';border:2px solid '+s.bd+'">'+
  '<div style="font-size:20px">'+s.icon+'</div>'+
  '<div style="font-size:13px;font-weight:800;margin-top:4px">'+t.tableId+'번</div>'+
  '<div style="font-size:10px;color:'+s.color+';font-weight:700">'+s.label+'</div>'+
  (since?'<div style="font-size:9px;color:var(--t3)">'+since+'</div>':'')+
  '</div>';
 });
 html+='</div></div>';

 wrap.innerHTML=html;
 /* 오늘 예약 현황 실시간 */
 var today=_today();
 _db.collection('filo_bookings').where('dealerId','==',did).where('date','==',today)
  .orderBy('time').get().then(function(snap){
   if(snap.empty)return;
   var rWrap=document.createElement('div');
   rWrap.className='card';rWrap.style.marginTop='14px';
   rWrap.innerHTML='<div class="sec-title" style="margin-bottom:12px">📅 오늘 예약 ('+snap.size+'건)</div>';
   snap.forEach(function(doc){
    var b=doc.data();
    var stMap={pending:'⏳ 대기',confirmed:'✅ 확정',cancelled:'❌ 취소'};
    var stColor={pending:'#f59e0b',confirmed:'#22c55e',cancelled:'#ef4444'};
    var st=stMap[b.status||'pending'];
    var sc=stColor[b.status||'pending'];
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface2);border-radius:var(--r);margin-bottom:8px;border:1px solid var(--bd2)';
    row.innerHTML='<div style="font-size:22px">🗓</div>'+
     '<div style="flex:1">'+
     '<div style="display:flex;justify-content:space-between;align-items:center">'+
     '<span style="font-size:13px;font-weight:700">'+(b.customerName||'고객')+'</span>'+
     '<span style="font-size:11px;font-weight:700;color:'+sc+'">'+st+'</span>'+
     '</div>'+
     '<div style="font-size:12px;color:var(--t2);margin-top:2px">'+
     (b.time||'')+
     (b.service?' · '+b.service:'')+
     (b.seats?' · '+b.seats+'인':'')+
     (b.memo?' · '+b.memo:'')+
     '</div></div>';
    var btnWrap=document.createElement('div');btnWrap.style.cssText='display:flex;gap:4px;flex-shrink:0';
    (function(bid,bdata){
     if(bdata.status!=='confirmed'){
      var cf=document.createElement('button');
      cf.style.cssText='padding:4px 8px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:6px;color:#22c55e;font-size:10px;cursor:pointer';
      cf.textContent='확정';
      cf.onclick=function(){
       _db.collection('filo_bookings').doc(bid).update({status:'confirmed'})
        .then(function(){_filoToast('✅ 확정됐습니다');_filoLoadTableMgmt(did);});
      };
      btnWrap.appendChild(cf);
     }
     if(bdata.status!=='cancelled'){
      var cx=document.createElement('button');
      cx.style.cssText='padding:4px 8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:6px;color:#ef4444;font-size:10px;cursor:pointer';
      cx.textContent='취소';
      cx.onclick=function(){
       if(!confirm('취소하시겠습니까?'))return;
       _db.collection('filo_bookings').doc(bid).update({status:'cancelled'})
        .then(function(){_filoToast('🗑 취소됐습니다');_filoLoadTableMgmt(did);});
      };
      btnWrap.appendChild(cx);
     }
    })(doc.id,b);
    row.appendChild(btnWrap);
    rWrap.appendChild(row);
   });
   var liveEl=document.getElementById('table-live');
   if(liveEl)liveEl.appendChild(rWrap);
  }).catch(function(){});
}
function _filoTableStatusChange(did,docId,currentStatus){
 var next={empty:'occupied',occupied:'cleaning',cleaning:'empty',reserved:'empty'};
 var nextStatus=next[currentStatus]||'empty';
 var update={status:nextStatus,updatedAt:_nowISO()};
 if(nextStatus==='occupied')update.since=_nowISO();
 else if(nextStatus==='empty')update.since=null;
 _db.collection('filo_tables').doc(docId).update(update).then(function(){
  _filoToast('✅ 상태 변경: '+nextStatus);
 });
}
function _filoTableSetup(did){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:24px;width:100%;max-width:420px';

 var title=document.createElement('div');
 title.style.cssText='font-size:16px;font-weight:900;margin-bottom:16px';
 title.textContent='🪑 테이블 설정';
 box.appendChild(title);

 var g1=document.createElement('div');g1.className='input-group';
 var l1=document.createElement('label');l1.textContent='테이블 수 (최대 50개)';
 var inp1=document.createElement('input');inp1.id='ts-count';inp1.type='number';
 inp1.value='10';inp1.min='1';inp1.max='50';
 inp1.style.cssText='width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none';
 g1.appendChild(l1);g1.appendChild(inp1);box.appendChild(g1);

 var g2=document.createElement('div');g2.className='input-group';
 var l2=document.createElement('label');l2.textContent='테이블당 좌석 수';
 var inp2=document.createElement('input');inp2.id='ts-seats';inp2.type='number';
 inp2.value='4';inp2.min='1';inp2.max='20';
 inp2.style.cssText=inp1.style.cssText;
 g2.appendChild(l2);g2.appendChild(inp2);box.appendChild(g2);

 var note=document.createElement('div');
 note.style.cssText='font-size:11px;color:var(--t3);margin-bottom:16px;padding:8px 12px;background:rgba(245,158,11,.08);border-radius:8px;border:1px solid rgba(245,158,11,.15)';
 note.textContent='⚠️ 기존 테이블 데이터를 초기화하고 새로 생성합니다';
 box.appendChild(note);

 var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:8px';
 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);cursor:pointer';
 cancelBtn.textContent='취소';cancelBtn.onclick=function(){mo.remove();};
 var saveBtn=document.createElement('button');
 saveBtn.style.cssText='flex:2;padding:11px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-weight:700;cursor:pointer';
 saveBtn.textContent='✅ 생성';
 saveBtn.onclick=function(){
  var cnt=parseInt(document.getElementById('ts-count').value)||10;
  var seats=parseInt(document.getElementById('ts-seats').value)||4;
  _filoCreateTables(did,cnt,seats);
  mo.remove();
 };
 btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
 box.appendChild(btnRow);

 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}
function _filoCreateTables(did,count,seats){
 /* 기존 삭제 후 재생성 */
 _filoToast('⏳ 테이블 생성 중...');
 _db.collection('filo_tables').where('dealerId','==',did).get().then(function(snap){
  var deletes=snap.docs.map(function(doc){return doc.ref.delete();});
  return Promise.all(deletes);
 }).then(function(){
  var creates=[];
  for(var i=1;i<=count;i++){
   creates.push(_db.collection('filo_tables').add({
    dealerId:did,tableId:i,seats:seats,
    status:'empty',since:null,
    createdAt:_nowISO()
   }));
  }
  return Promise.all(creates);
 }).then(function(){
  _filoToast('✅ 테이블 '+count+'개 생성 완료!');
 }).catch(function(e){_filoToast('❌ '+e.message);});
}
function _filoAddCategory(did){
 var inp=document.getElementById('new-cat-inp');
 var cat=(inp.value||'').trim();
 if(!cat){_filoToast('카테고리명을 입력하세요');return;}
 inp.value='';
 _filoToast('✅ 카테고리 추가됐습니다');
 _filoLoadMenuMgmt(did);
}
function _filoDeleteCategory(did,cat){
 if(!confirm('['+cat+'] 카테고리의 메뉴를 모두 삭제하시겠습니까?'))return;
 _db.collection('filo_menus').where('dealerId','==',did).where('category','==',cat).get().then(function(snap){
  var batch=_db.batch();
  snap.forEach(function(doc){batch.delete(doc.ref);});
  return batch.commit();
 }).then(function(){
  _filoToast('🗑 ['+cat+'] 카테고리 삭제됐습니다');
  _filoPageMenuMgmt(document.getElementById('content'));
 });
}
function _toLoadTables(did){
 _db.collection('filo_tables').where('dealerId','==',did).orderBy('tableId').get().then(function(snap){
  var grid=document.getElementById('to-table-grid');if(!grid)return;
  if(snap.empty){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:12px;color:var(--t3);font-size:11px">테이블 없음<br>테이블 관리에서 추가</div>';return;}
  grid.innerHTML='';
  snap.forEach(function(doc){
   var t=doc.data();
   var sc={empty:'#22c55e',occupied:'#ef4444',reserved:'#f59e0b',cleaning:'#60a5fa'}[t.status||'empty']||'#22c55e';
   var btn=document.createElement('button');
   btn.id='to-tbtn-'+t.tableId;
   btn.style.cssText='padding:10px 4px;border-radius:10px;border:2px solid var(--bd2);background:var(--surface2);color:var(--tx);cursor:pointer;text-align:center;transition:.2s;font-size:11px;width:100%';
   btn.innerHTML='<div style="font-size:16px">🪑</div><div style="font-weight:800">'+t.tableId+'번</div>'+
    (t.seats?'<div style="font-size:9px;color:var(--t3)">'+t.seats+'인</div>':'')+
    '<div style="font-size:9px;font-weight:700;color:'+sc+'">●</div>';
   (function(tb){btn.onclick=function(){_toSelectTable(tb);};})(t);
   grid.appendChild(btn);
  });
 });
}
function _toSelectTable(t){
 _toTable=t;
 document.querySelectorAll('[id^="to-tbtn-"]').forEach(function(b){
  b.style.background='var(--surface2)';b.style.borderColor='var(--bd2)';
 });
 var sel=document.getElementById('to-tbtn-'+t.tableId);
 if(sel){sel.style.background='rgba(124,58,237,.2)';sel.style.borderColor='var(--br)';}
 _filoToast('🪑 '+t.tableId+'번 테이블 선택됨'+(t.seats?' ('+t.seats+'인석)':''));
}
function _toAddItem(id,name,price){
 if(!_toCart[id])_toCart[id]={name:name,price:price,qty:0};
 _toCart[id].qty++;_toUpdateCart();_toShowMenuGrid(window._toAllMenus||[]);
}
function _toDecItem(id){
 if(!_toCart[id])return;
 _toCart[id].qty--;if(_toCart[id].qty<=0)delete _toCart[id];
 _toUpdateCart();_toShowMenuGrid(window._toAllMenus||[]);
}

// ── 리뷰 QR 생성 및 인쇄 ──────────────────────────────────────────────────


