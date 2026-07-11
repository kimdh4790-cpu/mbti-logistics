// filo-table.js - 테이블 QR, 예약, 착석, 직원호출
// 의존성: filo-common.js
// 관련 컬렉션: filo_tables, filo_orders, staff_calls, filo_bookings

function _filoPageTableQR(el){
 if(!el)el=document.getElementById('content');
 if(!el)return;
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML=
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">🪑 테이블 현황 · QR</div><div class="page-sub">실시간 착석 관리 · QR 코드 생성</div></div>'+
  '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'+
  '<input id="table-count-inp" type="number" value="10" min="1" max="30" style="width:70px;padding:6px 8px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px">'+
  '<button class="btn btn-brand btn-sm" onclick="_filoTableInit()">테이블 설정</button>'+
  '<button id="table-qr-btn" class="btn btn-sm" style="background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);color:#38bdf8">📱 QR 생성</button>'+
  '<button class="btn btn-sm" style="background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);color:#22c55e" onclick="_filoTableRefresh()">🔄 새로고침</button>'+
  '</div></div>'+
  '<div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">'+
  '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:10px;height:10px;border-radius:50%;background:#22c55e"></div>빈 테이블</div>'+
  '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:10px;height:10px;border-radius:50%;background:#ef4444"></div>사용 중</div>'+
  '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:10px;height:10px;border-radius:50%;background:#f59e0b"></div>예약 완료</div>'+
  '</div>'+
  '<div id="staff-call-banner" style="display:none;background:rgba(239,68,68,.12);border:1.5px solid rgba(239,68,68,.3);border-radius:12px;padding:12px 16px;margin-bottom:12px;display:none"></div>'+
  '<div id="filo-table-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:16px">'+
  '<div style="text-align:center;padding:30px;color:var(--t3);grid-column:1/-1">⏳ 로딩중...</div></div>'+
  '<div class="card"><div style="font-size:13px;font-weight:800;margin-bottom:10px;color:var(--t2)">📋 예약 대기</div>'+
  '<div id="filo-booking-list"><div style="text-align:center;padding:16px;color:var(--t3);font-size:12px">로딩중...</div></div></div>'+
  /* QR 섹션 */
  '<div class="card" style="margin-top:12px;display:none" id="qr-section">'+
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'+
  '<div style="font-size:13px;font-weight:800">📱 테이블 QR 코드</div>'+
  '<button onclick="_filoQRPrintAll()" style="padding:5px 12px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:8px;color:#22c55e;font-size:11px;font-weight:700;cursor:pointer">🖨️ 전체 인쇄</button>'+
  '</div>'+
  '<div id="qr-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px"></div>'+
  '</div>';

 el.appendChild(wrap);
 _filoTableLoad(did);
 var qrBtn=document.getElementById('table-qr-btn');
 if(qrBtn)qrBtn.onclick=function(){_filoGenQRs(did);};
}

function _filoGenQRs(did){
 did=did||_CU.dealerId||_CU.uid;
 var sec=document.getElementById('qr-section');
 var grid=document.getElementById('qr-grid');
 if(!sec||!grid)return;
 sec.style.display='block';
 grid.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3)">⏳ QR 생성중...</div>';

 /* Firestore에서 테이블 목록 가져오기 */
 _db.collection('filo_tables').where('dealerId','==',did).get().then(function(snap){
  var seen={};
  if(snap.empty){
   for(var i=1;i<=10;i++)seen[i]={num:i,name:'테이블 '+i};
  } else {
   snap.forEach(function(doc){
    var d=doc.data();
    var num=d.tableNum||d.tableId||1;
    var name=d.tableName||('테이블 '+num);
    if(!seen[num]||name!=='테이블 '+num)seen[num]={num:num,name:name};
   });
  }
  var tables=Object.values(seen).sort(function(a,b){return a.num-b.num;});

  grid.innerHTML='';
  var baseUrl='https://filo.ai.kr/order?d='+did+'&t=';

  tables.forEach(function(t){
   var url=baseUrl+t.num+'&name='+encodeURIComponent(t.name);
   var div=document.createElement('div');
   div.className='card';
   div.style.cssText='text-align:center;padding:14px';
   div.innerHTML=
    '<div style="font-size:13px;font-weight:800;margin-bottom:10px">'+t.name+'</div>'+
    '<div id="qr-'+t.num+'" style="background:#fff;padding:6px;border-radius:8px;display:inline-block;margin-bottom:10px"></div>'+
    '<div style="display:flex;gap:4px;justify-content:center">'+
    '<button data-dl="'+t.num+'" data-name="'+t.name+'" style="padding:4px 8px;background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);border-radius:6px;color:#38bdf8;font-size:10px;font-weight:700;cursor:pointer">💾 저장</button>'+
    '<button data-pr="'+t.num+'" data-name="'+t.name+'" style="padding:4px 8px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:6px;color:#a78bfa;font-size:10px;font-weight:700;cursor:pointer">🖨️ 인쇄</button>'+
    '<button onclick="window.open(\''+url+'\',\'_blank\')" style="padding:4px 8px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:6px;color:#22c55e;font-size:10px;font-weight:700;cursor:pointer">👁 미리보기</button>'+
    '</div>';
   grid.appendChild(div);
  });

  /* QR 라이브러리 로드 후 생성 */
  function genQRs(){
   tables.forEach(function(t){
    var el=document.getElementById('qr-'+t.num);
    if(!el||el.children.length>0)return;
    var url=baseUrl+t.num+'&name='+encodeURIComponent(t.name);
    try{
     new QRCode(el,{text:url,width:120,height:120,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
    }catch(e){console.error('QR err:',e);}
   });
  }

  if(window.QRCode){
   genQRs();
  } else {
   var s=document.createElement('script');
   s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
   s.onload=function(){setTimeout(genQRs,100);};
   document.head.appendChild(s);
  }

  /* 버튼 이벤트 위임 */
  grid.addEventListener('click',function(e){
   var dlBtn=e.target.closest('[data-dl]');
   var prBtn=e.target.closest('[data-pr]');
   if(dlBtn)_filoQRSave(dlBtn.dataset.dl,dlBtn.dataset.name);
   if(prBtn)_filoQRPrint(prBtn.dataset.pr,prBtn.dataset.name);
  });
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

function _filoQRPrint(num,name){
 var el=document.getElementById('qr-'+num);
 if(!el)return;
 var img=el.querySelector('img');
 var canvas=el.querySelector('canvas');
 var src=img?img.src:(canvas?canvas.toDataURL('image/png'):'');
 if(!src)return;
 var w=window.open('','_blank','width=400,height=500');
 w.document.write('<html><head><title>'+name+'</title>'+
  '<style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif}h2{margin-bottom:16px}img{width:220px;height:220px}p{margin-top:10px;font-size:13px;color:#666}</style></head>'+
  '<body onload="window.print()"><h2>'+name+'</h2><img src="'+src+'"><p>QR 스캔 → 주문</p></body></html>');
 w.document.close();
}

function _filoQRPrintAll(){
 var items=document.querySelectorAll('[id^="qr-"]');
 if(!items.length){_filoToast('❌ QR 없음');return;}
 var imgs='';
 items.forEach(function(el){
  var num=el.id.replace('qr-','');
  var img=el.querySelector('img');
  var canvas=el.querySelector('canvas');
  var src=img?img.src:(canvas?canvas.toDataURL('image/png'):'');
  if(!src)return;
  imgs+='<div style="display:inline-block;margin:12px;text-align:center;page-break-inside:avoid">'+
   '<div style="font-weight:700;margin-bottom:6px">테이블 '+num+'</div>'+
   '<img src="'+src+'" style="width:150px;height:150px;display:block">'+
   '<div style="font-size:11px;color:#666;margin-top:4px">QR 스캔 → 주문</div></div>';
 });
 if(!imgs){_filoToast('❌ QR 없음');return;}
 var w=window.open('','_blank');
 w.document.write('<html><head><title>테이블 QR</title><style>body{font-family:sans-serif;padding:20px}@media print{.no-print{display:none}}</style></head>'+
  '<body><h2 style="margin-bottom:16px">📱 테이블 QR 코드</h2>'+imgs+
  '<br><button class="no-print" onclick="window.print()" style="padding:10px 24px;margin-top:16px;background:#0891b2;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">🖨️ 인쇄</button></body></html>');
 w.document.close();
}


function _filoShowTableQRModal(did){
 _db.collection('filo_tables').where('dealerId','==',did).get()
  .then(function(snap){
   var tables=[];
   if(snap.empty){
    for(var i=1;i<=10;i++)tables.push({num:i,name:'테이블 '+i});
   } else {
    /* tableNum 또는 tableId 둘 다 지원, 중복 제거 */
    var seen={};
    snap.forEach(function(doc){
     var d=doc.data();
     var num=d.tableNum||d.tableId||1;
     var name=d.tableName||('테이블 '+num);
     /* 같은 번호 중 tableName 있는 것 우선 */
     if(!seen[num]||(!seen[num].hasName&&name!=='테이블 '+num)){
      seen[num]={num:num,name:name,hasName:name!=='테이블 '+num};
     }
    });
    tables=Object.values(seen);
   }
   tables.sort(function(a,b){return a.num-b.num;});

   var mo=document.createElement('div');
   mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:300;padding:16px';
   var box=document.createElement('div');
   box.style.cssText='background:var(--b2);border:1px solid var(--bd);border-radius:20px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;padding:24px';

   var hdr=document.createElement('div');
   hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:16px';
   hdr.innerHTML='<div style="font-size:16px;font-weight:900">📱 테이블 QR 코드</div>';
   var closeBtn=document.createElement('button');
   closeBtn.textContent='✕';
   closeBtn.style.cssText='background:transparent;border:none;color:var(--t3);font-size:22px;cursor:pointer;line-height:1';
   closeBtn.onclick=function(){mo.remove();};
   hdr.appendChild(closeBtn);
   box.appendChild(hdr);

   var desc=document.createElement('div');
   desc.style.cssText='font-size:12px;color:var(--t3);margin-bottom:14px';
   desc.textContent='QR 코드를 스캔하면 해당 테이블 주문 페이지가 열립니다';
   box.appendChild(desc);

   var toolBar=document.createElement('div');
   toolBar.style.cssText='display:flex;gap:8px;margin-bottom:16px';
   var printAllBtn=document.createElement('button');
   printAllBtn.textContent='🖨️ 전체 인쇄';
   printAllBtn.style.cssText='padding:6px 14px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:8px;color:#22c55e;font-size:11px;font-weight:700;cursor:pointer';
   printAllBtn.onclick=function(){_filoQRPrintAll();};
   toolBar.appendChild(printAllBtn);
   box.appendChild(toolBar);

   var list=document.createElement('div');
   list.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px';
   box.appendChild(list);

   mo.appendChild(box);
   mo.onclick=function(e){if(e.target===mo)mo.remove();};
   document.body.appendChild(mo);

   var baseUrl='https://filo.ai.kr/order?d='+did+'&t=';

   /* 카드 먼저 생성 */
   tables.forEach(function(t){
    var card=document.createElement('div');
    card.style.cssText='background:var(--b3);border:1px solid var(--bd);border-radius:12px;padding:14px;text-align:center';

    var title=document.createElement('div');
    title.style.cssText='font-size:13px;font-weight:800;margin-bottom:8px';
    title.textContent=t.name;
    card.appendChild(title);

    var qrWrap=document.createElement('div');
    qrWrap.id='qr-c-'+t.num;
    qrWrap.style.cssText='width:120px;height:120px;margin:0 auto;border-radius:8px;overflow:hidden;background:#fff';
    card.appendChild(qrWrap);

    var btnWrap=document.createElement('div');
    btnWrap.style.cssText='margin-top:10px;display:flex;gap:4px;justify-content:center';

    var dlBtn=document.createElement('button');
    dlBtn.textContent='💾 저장';
    dlBtn.style.cssText='padding:4px 10px;background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);border-radius:6px;color:#38bdf8;font-size:10px;font-weight:700;cursor:pointer';
    (function(tNum,tName){dlBtn.onclick=function(){_filoQRDownload(tNum,tName);};})(t.num,t.name);

    var prBtn=document.createElement('button');
    prBtn.textContent='🖨️ 인쇄';
    prBtn.style.cssText='padding:4px 10px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:6px;color:#a78bfa;font-size:10px;font-weight:700;cursor:pointer';
    (function(tNum,tName){prBtn.onclick=function(){_filoQRPrint1(tNum,tName);};})(t.num,t.name);

    btnWrap.appendChild(dlBtn);btnWrap.appendChild(prBtn);
    card.appendChild(btnWrap);
    list.appendChild(card);
   });

   /* QR 라이브러리 로드 후 일괄 생성 - DOM 렌더링 후 실행 */
   _filoEnsureQR(function(){
    setTimeout(function(){
     tables.forEach(function(t){
      var cv=document.getElementById('qr-c-'+t.num);
      if(!cv)return;
      var url=baseUrl+t.num+'&name='+encodeURIComponent(t.name);
      try{
       new QRCode(cv,{text:url,width:120,height:120,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
      }catch(e){console.error('QR:',e);}
     });
    },300);
   });
  }).catch(function(e){_filoToast('❌ '+e.message);});
}

function _filoQRPrint1(num,name){
 var wrap=document.getElementById('qr-c-'+num);
 if(!wrap)return;
 var canvas=wrap.querySelector('canvas');
 var imgEl=wrap.querySelector('img');
 var img=canvas?canvas.toDataURL('image/png'):(imgEl?imgEl.src:'');
 if(!img)return;
 var w=window.open('','_blank','width=400,height=500');
 w.document.write('<html><head><title>'+name+'</title>'+
  '<style>*{margin:0;padding:0}body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif}h2{font-size:22px;font-weight:900;margin-bottom:16px}img{width:220px;height:220px}p{font-size:13px;color:#666;margin-top:10px}</style></head>'+
  '<body onload="window.print()"><h2>'+name+'</h2><img src="'+img+'"><p>QR 스캔 → 주문</p></body></html>');
 w.document.close();
}

function _filoQRPrintAll(){
 var wraps=document.querySelectorAll('[id^="qr-c-"]');
 if(!wraps.length){_filoToast('❌ QR 코드 없음');return;}
 var imgs='';
 wraps.forEach(function(wrap){
  var num=wrap.id.replace('qr-c-','');
  var canvas=wrap.querySelector('canvas');
  var imgEl=wrap.querySelector('img');
  var src=canvas?canvas.toDataURL('image/png'):(imgEl?imgEl.src:'');
  if(!src)return;
  imgs+='<div style="display:inline-block;margin:12px;text-align:center;page-break-inside:avoid">'+
   '<div style="font-size:16px;font-weight:700;margin-bottom:8px">테이블 '+num+'</div>'+
   '<img src="'+src+'" style="width:160px;height:160px;display:block">'+
   '<div style="font-size:11px;color:#666;margin-top:6px">QR 스캔 → 주문</div></div>';
 });
 var w=window.open('','_blank');
 w.document.write('<html><head><title>테이블 QR 전체</title>'+
  '<style>body{font-family:sans-serif;padding:20px}@media print{.no-print{display:none}}</style></head>'+
  '<body><h2 style="margin-bottom:20px">📱 테이블 QR 코드</h2>'+imgs+
  '<br><button class="no-print" onclick="window.print()" style="padding:10px 24px;margin-top:16px;background:#0891b2;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">🖨️ 인쇄</button></body></html>');
 w.document.close();
}


function _filoTableLoad(did){
 did=did||_CU.dealerId||_CU.uid;
 var today=new Date().toISOString().slice(0,10);
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
 var today=new Date().toISOString().slice(0,10);
 _db.collection('filo_orders').where('dealerId','==',did).where('type','==','table')
  .onSnapshot(function(snap){
   orderMap={};
   snap.forEach(function(doc){
    var d=doc.data();
    if(d.createdAt&&d.createdAt.slice(0,10)===today&&d.status!=='cleared'){
     // tableNum 우선, 없으면 tableName에서 숫자 추출
     var tNum=String(d.tableNum||'');
     if(!tNum&&d.tableName)tNum=d.tableName.replace(/[^0-9]/g,'')||d.tableName;
     if(!tNum)return;
     if(!orderMap[tNum])orderMap[tNum]={total:0,items:[],ids:[],paid:false,orders:[],paidTotal:0,pendingTotal:0,hasPending:false};
     var isOrdPaid=(d.payType==='prepay'||d.status==='paid');
     orderMap[tNum].total+=(d.total||0);
     orderMap[tNum].ids.push(doc.id);
     orderMap[tNum].orders.push({id:doc.id,items:d.items||[],total:d.total||0,paid:isOrdPaid,payType:d.payType||'postpay',createdAt:d.createdAt||''});
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
   // 결제 상태
   var isPaid=ord&&ord.paid;
   var color=s==='empty'?'#22c55e':isPaid?'#6366f1':s==='occupied'?'#ef4444':'#f59e0b';
   var bg=s==='empty'?'rgba(34,197,94,.06)':isPaid?'rgba(99,102,241,.08)':s==='occupied'?'rgba(239,68,68,.08)':'rgba(245,158,11,.08)';
   var border=s==='empty'?'rgba(34,197,94,.25)':isPaid?'rgba(99,102,241,.3)':s==='occupied'?'rgba(239,68,68,.25)':'rgba(245,158,11,.3)';
   var icon=s==='empty'?'🪑':isPaid?'💳':s==='occupied'?'🍽':'📋';
   var statusTxt=s==='empty'?'빈 테이블':isPaid?'결제완료':s==='occupied'?'사용 중':'예약됨';
   var sub=s==='occupied'&&t.occupiedSince?Math.floor((Date.now()-new Date(t.occupiedSince))/60000)+'분째':(t.reservedName?t.reservedName+'님':'');

   var card=document.createElement('div');
   card.dataset.tnum=t.num;
   card.style.cssText='background:'+bg+';border:1.5px solid '+border+';border-radius:14px;padding:12px;text-align:center;position:relative;cursor:pointer;transition:.15s';
   card.onmouseenter=function(){this.style.transform='scale(1.02)';};
   card.onmouseleave=function(){this.style.transform='';};

   var html='<div style="font-size:22px;margin-bottom:4px">'+icon+'</div>'+
    '<div style="font-size:12px;font-weight:800;color:var(--tx)">'+t.name+'</div>'+
    '<div style="font-size:10px;font-weight:700;color:'+color+';margin-top:2px">'+statusTxt+'</div>'+
    (sub?'<div style="font-size:9px;color:var(--t3);margin-top:1px">'+sub+'</div>':'')+
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
 var now=new Date().toISOString();
 var id=docId.startsWith('auto_')?(did+'_t'+num):docId;
 _db.collection('filo_tables').doc(id).set({
  dealerId:did,tableNum:parseInt(num),tableName:'테이블 '+num,
  status:'occupied',occupiedSince:now,reservedName:'',updatedAt:now
 },{merge:true}).then(function(){_filoToast('🍽 테이블 '+num+' 착석');_filoTableLoad(did);});
};

window._filoTableClear=function(docId,did,num){
 var now=new Date().toISOString();
 // auto_ 또는 dealerId_t{num} 패턴 모두 처리
 var id=(docId.startsWith('auto_')||docId===did+'_t'+num)?(did+'_t'+num):docId;
 // 테이블 상태 비움
 _db.collection('filo_tables').doc(id).set({
  status:'empty',occupiedSince:'',reservedName:'',updatedAt:now
 },{merge:true}).then(function(){
  // 해당 테이블의 오늘 주문 cleared 처리
  var today=new Date().toISOString().slice(0,10);
  // tableNum이 숫자로 저장된 경우와 문자열로 저장된 경우 모두 처리
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
     if(d.createdAt&&d.createdAt.slice(0,10)===today&&d.status!=='cleared'){
      batch.update(doc.ref,{status:'cleared',clearedAt:now});
     }
    });
   });
   return batch.commit();
  }).then(function(){
    _filoToast('🪑 테이블 '+num+' 비움');
    _filoTableLoad(did);
   });
 });
};

window._filoBookingConfirm=function(bid,did){
 _db.collection('filo_bookings').doc(bid).get().then(function(snap){
  var d=snap.data()||{};
  _db.collection('filo_bookings').doc(bid).update({status:'confirmed',confirmedAt:new Date().toISOString()})
  .then(function(){_filoToast('✅ 예약 확정');_filoTableLoad(did);_filoNotifyReservation(did,d,'confirmed');});
 });
};

window._filoBookingReject=function(bid,did){
 if(!confirm('예약을 거절하시겠습니까?')) return;
 _db.collection('filo_bookings').doc(bid).get().then(function(snap){
  var d=snap.data()||{};
  _db.collection('filo_bookings').doc(bid).update({status:'rejected',rejectedAt:new Date().toISOString()})
  .then(function(){_filoToast('❌ 예약 거절');_filoTableLoad(did);_filoNotifyReservation(did,d,'rejected');});
 });
};

// 예약 알림: 회원+FCM허용→푸시, 회원+FCM없음→알림톡, 비회원→차단(예약단계에서 막힘)
async function _filoNotifyReservation(did,booking,status){
 var name=booking.customerName||'고객';
 var phone=booking.phone||'';
 var tableName=booking.tableName||'테이블';
 var date=booking.date||'';
 var time=booking.time||'';
 var title=status==='confirmed'?'예약 확정 ✅':'예약 불가 ❌';
 var body=status==='confirmed'
  ?(tableName+' '+date+' '+time+' 예약이 확정됐습니다!')
  :'죄송합니다. 해당 시간 예약이 어렵습니다. 다른 시간을 선택해주세요.';
 if(!phone) return;
 // 회원 조회
 var mSnap=await _db.collection('members').where('dealerId','==',did).where('phone','==',phone).limit(1).get();
 if(mSnap.empty) return; // 비회원 (예약단계에서 이미 차단됨)
 var member=mSnap.docs[0].data();
 // 1순위: FCM 푸시 (앱 설치+허용한 회원)
 var tokens=((member.fcmTokens||[]).map(function(t){return t.token||t;})).filter(Boolean);
 if(member.fcmToken&&member.fcmToken.length>20) tokens.push(member.fcmToken);
 tokens=[...new Set(tokens)].filter(function(t){return t&&t.length>20;});
 if(tokens.length){
  fetch('https://donway.ai.kr/fcm/notify-drivers',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({tokens:tokens,title:title,body:body})
  }).catch(function(){});
  _filoToast('📱 '+name+'님 푸시 발송');
  return;
 }
 // 2순위: 알림톡 (회원이지만 앱 미설치/FCM 미허용)
 fetch('/api/send-alimtalk',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({to:phone,name:name,
   templateCode:status==='confirmed'?'reserve_confirm':'reserve_reject',
   variables:{name:name,tableName:tableName,date:date,time:time}
  })
 }).catch(function(){});
 _filoToast('💬 '+name+'님 알림톡 발송 (앱 미설치)');
}

window._filoTableRefresh=function(){_filoTableLoad(_CU.dealerId||_CU.uid);};

// 테이블 주문 상세 모달
function _filoTableOrderModal(did,table,order){
 var mo=document.createElement('div');
 mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
 var s=table.status;
 var hasOrder=order&&order.total>0;
 var itemsHtml='';
 if(hasOrder&&order.orders&&order.orders.length){
  order.orders.sort(function(a,b){return (a.createdAt||'').localeCompare(b.createdAt||'');});
  itemsHtml=order.orders.map(function(ord,i){
   var pc=ord.paid?'#818cf8':'#fbbf24';
   var methodIcon=ord.payMethod==='cash'?'💵':ord.payMethod==='card'?'💳':ord.payMethod==='split'?'✂️':'';
   var pm=ord.paid?(methodIcon+'선결제'):'⏳ 후불';
   var itemRows=(ord.items||[]).map(function(it){
    return '<div style="display:flex;justify-content:space-between;padding:6px 8px;font-size:13px">'+
     '<span>'+(it.emoji||'🍽')+' '+(it.name||'')+(it.qty?' ×'+it.qty:'')+'</span>'+
     '<span style="font-weight:700">₩'+((it.price||0)*(it.qty||1)).toLocaleString()+'</span></div>';
   }).join('');
   return '<div style="border:1.5px solid '+pc+';border-radius:10px;margin-bottom:8px;overflow:hidden">'+
    '<div style="background:'+pc+'22;padding:6px 10px;display:flex;justify-content:space-between;align-items:center">'+
    '<span style="font-size:11px;font-weight:800;color:'+pc+'">'+pm+'</span>'+
    '<span style="font-size:12px;font-weight:900;color:'+pc+'">₩'+ord.total.toLocaleString()+'</span>'+
    '</div>'+itemRows+'</div>';
  }).join('');
 } else if(hasOrder){
  itemsHtml=(order.items||[]).map(function(it){
   return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px">'+
    '<span>'+(it.emoji||'🍽')+' '+(it.name||'')+(it.qty?' ×'+it.qty:'')+'</span>'+
    '<span style="font-weight:700">₩'+((it.price||0)*(it.qty||1)).toLocaleString()+'</span></div>';
  }).join('');
 } else {
  itemsHtml='<div style="text-align:center;padding:20px;color:var(--t3);font-size:13px">주문 내역 없음</div>';
 }
 // 결제/후불 합계 표시
 var summaryHtml='';
 if(hasOrder){
  if(order.paidTotal>0)summaryHtml+='<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0"><span style="color:#818cf8">✅ 결제 완료</span><span style="font-weight:700;color:#818cf8">₩'+order.paidTotal.toLocaleString()+'</span></div>';
  if(order.pendingTotal>0)summaryHtml+='<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0"><span style="color:#fbbf24">⏳ 후불 대기</span><span style="font-weight:700;color:#fbbf24">₩'+order.pendingTotal.toLocaleString()+'</span></div>';
  summaryHtml+='<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;padding:8px 0;border-top:1px solid var(--bd);margin-top:4px"><span>합계</span><span style="color:#0891b2">₩'+order.total.toLocaleString()+'</span></div>';
 }

 var inner=document.createElement('div');
 inner.style.cssText='background:var(--surface);border-radius:24px 24px 0 0;width:100%;max-height:85vh;overflow-y:auto;padding:24px 20px 36px';
 inner.innerHTML=
  '<div style="width:40px;height:4px;background:var(--bd);border-radius:2px;margin:0 auto 20px"></div>'+
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
  '<div style="font-size:18px;font-weight:900">🪑 '+table.name+'</div>'+
  (s==='occupied'?'<span style="font-size:11px;font-weight:700;color:#ef4444;background:rgba(239,68,68,.1);padding:4px 10px;border-radius:20px">사용 중</span>':
   s==='empty'?'<span style="font-size:11px;font-weight:700;color:#22c55e;background:rgba(34,197,94,.1);padding:4px 10px;border-radius:20px">빈 테이블</span>':'')+
  '</div>'+
  '<div style="margin-bottom:16px">'+itemsHtml+'</div>'+
  (hasOrder?'<div style="padding:10px 0;margin-bottom:8px;border-top:2px solid var(--bd)">'+summaryHtml+'</div>':'')+
  '<div id="modal-btn-row" style="display:flex;gap:8px;flex-wrap:wrap"></div>';

 var btnRow=inner.querySelector('#modal-btn-row');

 if(hasOrder&&order.pendingTotal>0){
  // 결제 완료 처리
  var payBtn=document.createElement('button');
  payBtn.style.cssText='flex:2;padding:12px;background:#6366f1;border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer';
  payBtn.textContent='💳 후불 결제 (₩'+(order.pendingTotal||order.total).toLocaleString()+')';
  (function(d,n,dc){payBtn.onclick=function(){_filoMarkPaid(d,n,dc,payBtn,mo);};})(did,table.num,table.docId);
  btnRow.appendChild(payBtn);

  // 분할 결제
  var splitBtn2=document.createElement('button');
  splitBtn2.style.cssText='flex:1;padding:12px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:12px;color:#f59e0b;font-size:12px;font-weight:700;cursor:pointer';
  splitBtn2.textContent='✂️ 분할';
  (function(tot){splitBtn2.onclick=function(){mo.remove();
   // 임시 cart로 분할결제
   var prevCart=_cartItems;
   _cartItems=(order.items||[]).map(function(it){return {id:it.id||'',name:it.name,price:it.price,qty:it.qty,emoji:it.emoji||'🍽'};});
   window._selectedTableId=table.num;
   window._selectedTableName=table.name;
   _filoSplitPay(tot);
  };})(order.pendingTotal||order.total);
  btnRow.appendChild(splitBtn2);

  // 각자 계산
  var selfBtn2=document.createElement('button');
  selfBtn2.style.cssText='flex:1;padding:12px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:12px;color:#818cf8;font-size:12px;font-weight:700;cursor:pointer';
  selfBtn2.textContent='👥 각자';
  (function(ord,tNum,tName){selfBtn2.onclick=function(){mo.remove();
   // 테이블 주문 아이템으로 각자계산 모달
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
  seatBtn.textContent='제륙 처리';
  (function(dc,d,n){seatBtn.onclick=function(){_filoTableSeat(dc,d,n);mo.remove();};})(table.docId,did,table.num);
  btnRow.appendChild(seatBtn);
 }

 // 준비완료 버튼 (주문 있을 때)
 if(hasOrder&&order.pendingTotal>0){
  var readyBtn=document.createElement('button');
  readyBtn.style.cssText='flex:1;padding:12px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:12px;color:#22c55e;font-size:12px;font-weight:700;cursor:pointer';
  readyBtn.textContent='🔔 준비완료';
  (function(d,tNum,tName){readyBtn.onclick=function(){
   // filo_orders status → ready (고객 폰에 픽업 알림)
   var db=firebase.firestore();
   db.collection('filo_orders')
    .where('dealerId','==',d)
    .where('tableNum','==',String(tNum))
    .where('status','==','pending')
    .get().then(function(snap){
     var batch=db.batch();
     snap.forEach(function(doc){batch.update(doc.ref,{status:'ready',readyAt:new Date().toISOString()});});
     return batch.commit();
    }).then(function(){
     _filoToast('🔔 테이블 '+tNum+' 픽업 알림 전송!');
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

 mo.appendChild(inner);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

// 테이블 각자 계산 (filo_orders 직접 처리)
function _filoMarkPaid(did,tableNum,docId,btn,mo){
 if(!confirm('결제 완료 처리하시겠습니까?'))return;
 btn.disabled=true;btn.textContent='처리 중...';
 var today=new Date().toISOString().slice(0,10);
 _db.collection('filo_orders')
  .where('dealerId','==',did).where('type','==','table')
  .get().then(function(snap){
   var batch=_db.batch();
   snap.forEach(function(doc){
    var d=doc.data();
    if(d.createdAt&&d.createdAt.slice(0,10)===today){
     var tNum=String(d.tableNum||d.tableName||'');
     if(tNum===String(tableNum))batch.update(doc.ref,{status:'paid',payType:'postpay',paidAt:new Date().toISOString()});
    }
   });
   return batch.commit();
  }).then(function(){
   _filoToast('💳 결제 완료 처리됐습니다!');
   if(mo)mo.remove();
   // 테이블 자동 비움
   if(docId&&!docId.startsWith('auto_'))
    _db.collection('filo_tables').doc(docId).set({status:'empty',occupiedSince:'',updatedAt:new Date().toISOString()},{merge:true});
  }).catch(function(e){_filoToast('❌ '+e.message);btn.disabled=false;btn.textContent='💳 결제 완료 처리';});
}
window._filoConfirmCall=function(idsStr,tableNum){
 var ids=idsStr.split(',');
 var batch=_db.batch();
 ids.forEach(function(id){
  if(id)batch.update(_db.collection('staff_calls').doc(id),{status:'confirmed',confirmedAt:new Date().toISOString()});
 });
 batch.commit().then(function(){
  _filoToast('✅ 테이블 '+tableNum+' 호출 확인됨');
 });
};

window._filoTableInit=function(){
 var did=_CU.dealerId||_CU.uid;
 var count=parseInt(document.getElementById('table-count-inp').value)||10;
 var now=new Date().toISOString();
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
 // filo_orders에서 fromNum → toNum으로 변경
 db.collection('filo_orders')
  .where('dealerId','==',did)
  .where('tableNum','==',String(fromNum))
  .where('status','in',['pending','ready'])
  .get().then(function(snap){
   var batch=db.batch();
   snap.forEach(function(doc){
    batch.update(doc.ref,{
     tableNum:String(toNum),
     tableName:'테이블 '+toNum,
     movedFrom:String(fromNum),
     movedAt:new Date().toISOString()
    });
   });
   return batch.commit();
  }).then(function(){
   // filo_tables 상태도 업데이트
   return db.collection('filo_tables')
    .where('dealerId','==',did)
    .where('tableNum','==',parseInt(fromNum))
    .get();
  }).then(function(snap){
   var batch=db.batch();
   snap.forEach(function(doc){batch.update(doc.ref,{status:'empty',occupiedSince:'',updatedAt:new Date().toISOString()});});
   return batch.commit();
  }).then(function(){
   _filoToast('✅ 테이블 '+fromNum+' → '+toNum+' 이동 완료!');
   if(moEl)moEl.closest('[style*=fixed]').remove();
   // 테이블 현황 새로고침
   setTimeout(function(){
    var cont=document.getElementById('content');
    if(cont)_filoPageTableOrder(cont,did);
   },500);
  }).catch(function(e){_filoToast('❌ '+e.message);});
};
