/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      filo-order.js
 * @description QR주문대기·배달주문·픽업관리
 */
// 의존성: filo-common.js
// 관련 컬렉션: filo_sales, filo_orders

function _filoPageAutoOrder(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="stock-form slide-up">'+
 '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">'+
 '<div style="font-size:22px">🔔</div>'+
 '<div><div style="font-size:17px;font-weight:900">자동 발주</div>'+
 '<div style="font-size:11px;color:var(--t3)">최소 재고 이하 품목 알림</div></div></div>'+
 '<div id="ao-list"><div style="text-align:center;padding:40px;color:var(--t3)">⏳ 로딩 중...</div></div></div>';
 _db.collection('inventory').where('dealerId','==',did).orderBy('name').get()
 .then(function(snap){
 var el2=document.getElementById('ao-list');if(!el2)return;
 var items=[],warns=[];
 snap.forEach(function(doc){
 var d=doc.data();d._id=doc.id;
 items.push(d);
 if(d.minStock!=null&&d.stock<=d.minStock)warns.push(d);
 });
 if(!items.length){el2.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--t3)">등록된 품목이 없습니다</div>';return;}
 var html='';
 if(warns.length){
 html+='<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:14px;padding:14px 16px;margin-bottom:14px">'+
 '<div style="font-size:13px;font-weight:800;color:#ef4444;margin-bottom:10px">⚠️ 발주 필요 '+warns.length+'개</div>'+
 warns.map(function(d){
 return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(239,68,68,.1)">'+
 '<div><div style="font-size:13px;font-weight:700">'+esc(d.name||d._id)+'</div>'+
 '<div style="font-size:11px;color:var(--t3)">'+(d.supplier||'거래처 미설정')+'</div></div>'+
 '<div style="text-align:right">'+
 '<div style="font-size:14px;font-weight:900;color:#ef4444">'+d.stock+'개 남음</div>'+
 '<div style="font-size:10px;color:var(--t3)">최소 '+d.minStock+'개</div></div></div>';
 }).join('')+
 '<button onclick="_filoSendOrderAlert(\''+did+'\')" class="btn" style="width:100%;background:#ef4444;color:#fff;margin-top:10px">📲 거래처 알림 발송</button>'+
 '</div>';
 }
 html+='<div style="font-size:12px;font-weight:700;color:var(--t3);margin-bottom:8px">전체 품목 ('+items.length+'개)</div>'+
 items.map(function(d){
 var pct=d.minStock>0?Math.round(d.stock/d.minStock*100):100;
 var isLow=d.minStock!=null&&d.stock<=d.minStock;
 var barColor=isLow?'#ef4444':pct<70?'#f59e0b':'#22c55e';
 return '<div class="stock-item">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'+
 '<div style="font-size:13px;font-weight:700">'+esc(d.name||d._id)+'</div>'+
 '<div style="font-size:14px;font-weight:900;color:'+barColor+'">'+d.stock+'개</div></div>'+
 '<div style="background:var(--b3);border-radius:4px;height:4px">'+
 '<div style="background:'+barColor+';border-radius:4px;height:4px;width:'+Math.min(pct,100)+'%;transition:width .8s ease"></div></div>'+
 '<div style="display:flex;justify-content:space-between;margin-top:4px">'+
 '<div style="font-size:10px;color:var(--t3)">'+(d.supplier||'')+'</div>'+
 '<div style="font-size:10px;color:var(--t3)">최소 '+(d.minStock||0)+'개</div></div></div>';
 }).join('');
 el2.innerHTML=html;
 }).catch(function(e){document.getElementById('ao-list').innerHTML='<div style="color:var(--red)">'+e.message+'</div>';});
}

function _filoSendOrderAlert(did){
 _filoToast('📲 알림 발송 기능은 거래처 전화번호 등록 후 이용 가능합니다');
}

function _filoPageOrders(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="slide-up">'+
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
  '<div style="font-size:17px;font-weight:900">🔔 주문 대기</div>'+
  '<button onclick="window.open(\'https://filo.ai.kr/kitchen?did=\'+(_CU.dealerId||_CU.uid),\'_blank\')" style="padding:6px 12px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:8px;color:#a78bfa;font-size:11px;font-weight:700;cursor:pointer">🍳 주방화면 열기</button>'+
  '<div class="live-dot"></div></div>'+
  '<div id="orders-list"><div style="text-align:center;padding:40px;color:var(--t3)">⏳ 로딩 중...</div></div>'+
  '</div>';
 if(_ordersUnsub) _ordersUnsub();
 var today=new Date().toISOString().slice(0,10);
 var _oSales=[], _oQR=[];
 function _renderOrders(){
  var orders=_oSales.concat(_oQR);
  orders.sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
  var listEl=document.getElementById('orders-list');
  if(!listEl)return;
   if(!orders.length){listEl.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)">📭 대기 중인 주문 없음</div>';return;}
    listEl.innerHTML=orders.map(function(o){
     var statusColor=o.status==='done'?'#22c55e':o.status==='cancel'?'#ef4444':'#f59e0b';
     var statusLabel=o.status==='done'?'완료':o.status==='cancel'?'취소':'대기중';
     var timeStr=o.createdAt?(function(){
      var d=new Date(o.createdAt);
      var kst=new Date(d.getTime()+9*3600000);
      var mm=(kst.getUTCMonth()+1).toString().padStart(2,'0');
      var dd=kst.getUTCDate().toString().padStart(2,'0');
      var hh=kst.getUTCHours().toString().padStart(2,'0');
      var mi=kst.getUTCMinutes().toString().padStart(2,'0');
      return mm+'/'+dd+' '+hh+':'+mi;
     })():'';
     var tName=o.tableName||(o.tableId?'🪑 테이블 '+o.tableId:'🏪 카운터');
     return '<div class="card" style="margin-bottom:10px;border-left:3px solid '+statusColor+'">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
      '<div style="display:flex;align-items:center;gap:8px">'+
      '<div style="font-size:13px;font-weight:900">'+tName+'</div>'+
      (timeStr?'<div style="font-size:10px;color:var(--t3)">'+timeStr+'</div>':'')+
      '</div>'+
      '<span class="badge" style="background:'+statusColor+'20;color:'+statusColor+'">'+statusLabel+'</span></div>'+
      '<div style="font-size:12px;color:var(--t2);margin-bottom:8px">'+
      (o.items||[]).map(function(it){return it.name+' x'+it.qty;}).join(' / ')+'</div>'+
      '<div style="display:flex;justify-content:space-between;align-items:center">'+
      '<div style="font-size:15px;font-weight:900;color:#22c55e">₩'+(o.total||0).toLocaleString()+'</div>'+
      (o.status!=='done'?
       '<div style="display:flex;gap:6px">'+
       '<button data-oid="'+o._id+'" data-st="done" data-src="'+(o._src||'sales')+'" onclick="_filoOrderStatus(this.dataset.oid,this.dataset.st,this.dataset.src)" style="padding:6px 12px;background:#22c55e;border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">✅ 완료</button>'+
       '<button data-oid="'+o._id+'" data-st="cancel" data-src="'+(o._src||'sales')+'" onclick="_filoOrderStatus(this.dataset.oid,this.dataset.st,this.dataset.src)" style="padding:6px 12px;background:#ef4444;border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">❌ 취소</button>'+
       '</div>':'')+
      '</div></div>';
    }).join('');
   // 새 QR 주문 알림음
   if(window._filoLastOrderCount!==undefined&&_oQR.length>window._filoLastOrderCount){
    try{var a=new AudioContext();var o2=a.createOscillator();o2.connect(a.destination);o2.frequency.value=880;o2.start();o2.stop(a.currentTime+0.15);}catch(e){}
   }
   window._filoLastOrderCount=_oQR.length;
  }
 var _u1=_db.collection('filo_sales')
  .where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(snap){
   _oSales=[];
   snap.forEach(function(doc){_oSales.push(Object.assign({_id:doc.id,_src:'sales'},doc.data()));});
   _renderOrders();
  });
 var _u2=_db.collection('filo_orders')
  .where('dealerId','==',did).where('type','==','table')
  .onSnapshot(function(snap){
   _oQR=[];
   snap.forEach(function(doc){
    var d=doc.data();
    if(d.createdAt&&d.createdAt.slice(0,10)===today)
     _oQR.push(Object.assign({_id:doc.id,_src:'qr'},d));
   });
   _renderOrders();
  });
 _ordersUnsub=function(){_u1();_u2();};
}

function _filoOrderStatus(orderId, status, src){
 var col = (src==='qr') ? 'filo_orders' : 'filo_sales';
 _db.collection(col).doc(orderId).update({status:status}).then(function(){
  // QR 주문 완료 시 filo_sales에도 상태 동기화
  if(src==='qr' && status==='done'){
   _db.collection('filo_sales').where('orderId','==',orderId).get().then(function(snap){
    snap.forEach(function(doc){doc.ref.update({status:'done'});});
   }).catch(function(){});
  }
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

// ── 테이블 QR 생성 ──
function _filoPageDelivery(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:900px;margin:0 auto';

 /* 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
 hdr.innerHTML='<div><div class="page-title">🛵 배달 주문 관리</div>'+
  '<div class="page-sub">배달앱 주문을 한곳에서 접수·관리합니다</div></div>';
 var addBtn=document.createElement('button');
 addBtn.className='btn btn-primary btn-sm';
 addBtn.textContent='+ 주문 접수';
 addBtn.onclick=function(){_filoDeliveryAdd(did);};
 hdr.appendChild(addBtn);
 wrap.appendChild(hdr);

 /* 오늘 배달 현황 KPI */
 var kpiWrap=document.createElement('div');
 kpiWrap.id='delivery-kpi';
 kpiWrap.className='kpi-grid';
 kpiWrap.style.cssText='grid-template-columns:repeat(4,1fr);margin-bottom:14px';
 kpiWrap.innerHTML='<div class="kpi-card kpi-revenue"><div class="kpi-label">오늘 배달 건수</div><div class="kpi-val" id="dkpi-cnt" style="color:#a78bfa">-</div></div>'+
  '<div class="kpi-card kpi-profit"><div class="kpi-label">배달 매출</div><div class="kpi-val" id="dkpi-rev" style="color:#22c55e">-</div></div>'+
  '<div class="kpi-card kpi-cost"><div class="kpi-label">배달비 합계</div><div class="kpi-val" id="dkpi-fee" style="color:#ef4444">-</div></div>'+
  '<div class="kpi-card kpi-margin"><div class="kpi-label">앱별 비중</div><div class="kpi-val" id="dkpi-top" style="color:#f59e0b;font-size:14px">-</div></div>';
 wrap.appendChild(kpiWrap);

 /* 주문 목록 */
 var listWrap=document.createElement('div');
 listWrap.id='delivery-list';
 listWrap.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩 중...</div>';
 wrap.appendChild(listWrap);

 el.appendChild(wrap);
 _filoLoadDelivery(did);
}

var _deliveryUnsub=null;
function _filoLoadDelivery(did){
 if(window._deliveryUnsub){window._deliveryUnsub();window._deliveryUnsub=null;}
 var today=new Date().toISOString().slice(0,10);
 // 직원 호출 실시간 감지
 var callUnsub=_db.collection('staff_calls').where('dealerId','==',did).where('status','==','pending')
  .onSnapshot(function(snap){
   var callCount=snap.size;
   var callBadge=document.getElementById('staff-call-badge');
   if(callBadge) callBadge.textContent=callCount>0?callCount:'';
   if(callCount>0){
    // 새 호출 알림
    snap.docChanges().forEach(function(change){
     if(change.type==='added'){
      var d=change.doc.data();
      _filoToast('🔔 직원 호출! '+(d.tableName||d.tableInfo||'배달고객'));
     }
    });
   }
  });

 // filo_orders(테이블QR 배달) + filo_sales(수동접수) 통합
 var salesOrders=[], qrOrders=[];
 function renderAll(){
  var all=salesOrders.concat(qrOrders);
  all.sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
  _filoRenderDelivery(did,all);
 }
 var u1=_db.collection('filo_sales')
  .where('dealerId','==',did).where('date','==',today).where('type','==','delivery')
  .onSnapshot(function(snap){
   salesOrders=[];
   snap.forEach(function(doc){salesOrders.push(Object.assign({_id:doc.id,_src:'sales'},doc.data()));});
   renderAll();
  },function(e){console.error('delivery sales err:',e);renderAll();});
 var u2=_db.collection('filo_orders')
  .where('dealerId','==',did)
  .onSnapshot(function(snap){
   qrOrders=[];
   // 테이블QR 주문은 배달 탭에 표시하지 않음 (테이블 현황 탭에서 관리)
   renderAll();
  },function(e){console.error('delivery orders err:',e);renderAll();});
 window._deliveryUnsub=function(){u1();u2();};
}

function _filoRenderDelivery(did,orders){
 /* KPI */
 var cnt=orders.length;
 var rev=orders.reduce(function(s,o){return s+(o.total||0);},0);
 var fee=orders.reduce(function(s,o){return s+(o.deliveryFee||0);},0);
 var appMap={};
 orders.forEach(function(o){var a=o.deliveryApp||'기타';appMap[a]=(appMap[a]||0)+1;});
 var topApp=Object.entries(appMap).sort(function(a,b){return b[1]-a[1];})[0];

 var e=function(id){return document.getElementById(id);};
 if(e('dkpi-cnt'))e('dkpi-cnt').textContent=cnt+'건';
 if(e('dkpi-rev'))e('dkpi-rev').textContent='₩'+rev.toLocaleString();
 if(e('dkpi-fee'))e('dkpi-fee').textContent='₩'+fee.toLocaleString();
 if(e('dkpi-top'))e('dkpi-top').textContent=topApp?topApp[0]+' '+topApp[1]+'건':'-';

 var wrap=document.getElementById('delivery-list');
 if(!wrap)return;
 wrap.innerHTML='';

 /* 앱별 필터 */
 var apps=['전체','배민','쿠팡이츠','요기요','기타'];
 var filterWrap=document.createElement('div');
 filterWrap.style.cssText='display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap';
 apps.forEach(function(app){
  var btn=document.createElement('button');
  btn.style.cssText='padding:6px 14px;border-radius:20px;border:1px solid var(--bd2);background:var(--surface2);color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;transition:.15s';
  btn.textContent=app==='전체'?app+'('+cnt+')':app;
  btn.onclick=function(){
   document.querySelectorAll('.delivery-filter-btn').forEach(function(b){
    b.style.background='var(--surface2)';b.style.color='var(--t2)';b.style.borderColor='var(--bd2)';
   });
   this.style.background='var(--br)';this.style.color='#fff';this.style.borderColor='var(--br)';
   var filtered=app==='전체'?orders:orders.filter(function(o){return (o.deliveryApp||'기타')===app;});
   _filoRenderDeliveryCards(did,filtered,wrap.querySelector('#delivery-cards'));
  };
  btn.className='delivery-filter-btn';
  filterWrap.appendChild(btn);
 });
 wrap.appendChild(filterWrap);

 var cardsWrap=document.createElement('div');
 cardsWrap.id='delivery-cards';
 wrap.appendChild(cardsWrap);
 _filoRenderDeliveryCards(did,orders,cardsWrap);
}

function _filoRenderDeliveryCards(did,orders,wrap){
 if(!wrap)return;
 if(!orders.length){
  wrap.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">'+
   '<div style="font-size:32px;margin-bottom:8px">🛵</div>'+
   '<div>오늘 배달 주문이 없습니다</div>'+
   '<div style="font-size:11px;margin-top:6px">+ 주문 접수 버튼으로 배달 주문을 등록하세요</div></div>';
  return;
 }
 var appIcon={'배민':'🟢','쿠팡이츠':'🔴','요기요':'🟣','테이블QR':'🛵','기타':'🛵'};
 var statusColor={pending:'#f59e0b',accepted:'#0891b2',cooking:'#60a5fa',ready:'#a78bfa',delivered:'#22c55e',rejected:'#ef4444',cancelled:'#ef4444'};
 var statusLabel={pending:'승인대기',accepted:'접수됨',cooking:'조리중',ready:'픽업대기',delivered:'배달완료',rejected:'거절됨',cancelled:'취소됨'};

 wrap.innerHTML='';
 orders.forEach(function(o){
  var st=o.deliveryStatus||o.status||'pending';
  var sc=statusColor[st]||'#f59e0b';
  var sl=statusLabel[st]||'대기';
  var kst=o.createdAt?new Date(new Date(o.createdAt).getTime()+9*3600000):new Date();
  var timeStr=kst.getUTCHours().toString().padStart(2,'0')+':'+kst.getUTCMinutes().toString().padStart(2,'0');
  var src=o._src||'sales';
  var appName=o.deliveryApp||(src==='qr'?'테이블QR':'배달');

  var card=document.createElement('div');
  card.className='card';
  card.style.cssText='margin-bottom:10px;border-left:3px solid '+sc;

  // 상단 - 앱/시간/상태
  card.innerHTML=
   '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'+
   '<div>'+
   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">'+
   '<span style="font-size:16px">'+(appIcon[appName]||'🛵')+'</span>'+
   '<span style="font-size:14px;font-weight:900">'+appName+'</span>'+
   '<span style="font-size:11px;color:var(--t3)">'+timeStr+'</span>'+
   '</div>'+
   '<div style="font-size:12px;color:var(--t2)">'+(o.customer||o.customerName||'고객')+(o.phone?' · '+o.phone:'')+'</div>'+
   (o.address?'<div style="font-size:11px;color:var(--t3);margin-top:2px">📍 '+o.address+'</div>':'')+
   '</div>'+
   '<div style="text-align:right">'+
   '<span class="chip" style="background:'+sc+'18;color:'+sc+';border-color:'+sc+'40">'+sl+'</span>'+
   '<div style="font-size:16px;font-weight:900;color:#22c55e;margin-top:4px">₩'+(o.total||0).toLocaleString()+'</div>'+
   (o.deliveryFee?'<div style="font-size:10px;color:var(--t3)">배달비 ₩'+o.deliveryFee.toLocaleString()+'</div>':'')+
   '</div>'+
   '</div>'+
   // 메뉴 목록
   '<div style="font-size:12px;color:var(--t2);margin-bottom:10px;line-height:1.6">'+
   (o.items||[]).map(function(it){return (it.emoji||'🍽')+' '+(it.name||it)+(it.qty?' <b>×'+it.qty+'</b>':'');}).join(' &nbsp;·&nbsp; ')+
   (o.memo?'<div style="margin-top:4px;color:#f59e0b;font-size:11px">💬 '+o.memo+'</div>':'')+
   '</div>'+
   // 버튼 영역
   '<div id="dvbtn-'+o._id+'" style="display:flex;gap:6px;flex-wrap:wrap"></div>';

  wrap.appendChild(card);

  // 버튼 동적 생성
  var btnArea=document.getElementById('dvbtn-'+o._id);
  var col=src==='qr'?'filo_orders':'filo_sales';

  // 승인대기 (store.html에서 온 주문)
  if(st==='pending'){
   var acceptBtn=document.createElement('button');
   acceptBtn.style.cssText='padding:7px 14px;background:#0891b2;border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer';
   acceptBtn.innerHTML='✅ 승인';
   (function(id,c,phone,name,items,total){
    acceptBtn.onclick=function(){
     _db.collection(c).doc(id).update({
      deliveryStatus:'accepted',status:'accepted',
      updatedAt:new Date().toISOString()
     }).then(function(){
      _filoToast('✅ 주문 승인됨');
      // 알림톡 발송 (전화번호 있을 때)
      if(phone) _filoSendOrderAlimtalk(phone,name,items,total,'accepted');
     });
    };
   })(o._id,col,o.phone,o.customer||o.customerName,o.items,o.total);
   btnArea.appendChild(acceptBtn);

   var rejectBtn=document.createElement('button');
   rejectBtn.style.cssText='padding:7px 14px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer';
   rejectBtn.innerHTML='❌ 거절';
   (function(id,c,phone,name){
    rejectBtn.onclick=function(){
     if(!confirm('주문을 거절하시겠습니까?'))return;
     _db.collection(c).doc(id).update({
      deliveryStatus:'rejected',status:'rejected',
      updatedAt:new Date().toISOString()
     }).then(function(){
      _filoToast('🗑 주문 거절됨');
      if(phone) _filoSendOrderAlimtalk(phone,name,[],'','rejected');
     });
    };
   })(o._id,col,o.phone,o.customer||o.customerName);
   btnArea.appendChild(rejectBtn);
  }

  // 접수됨 → 조리중
  if(st==='accepted'){
   var cookBtn=document.createElement('button');
   cookBtn.style.cssText='padding:7px 14px;background:#0891b2;border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer';
   cookBtn.innerHTML='🍳 조리 시작';
   (function(id,c){cookBtn.onclick=function(){_db.collection(c).doc(id).update({deliveryStatus:'cooking',status:'cooking',updatedAt:new Date().toISOString()}).then(function(){_filoToast('🍳 조리 시작');});};})(o._id,col);
   btnArea.appendChild(cookBtn);
  }

  // 조리중 → 픽업대기
  if(st==='cooking'){
   var readyBtn=document.createElement('button');
   readyBtn.style.cssText='padding:7px 14px;background:#a78bfa;border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer';
   readyBtn.innerHTML='📦 픽업 대기';
   (function(id,c){readyBtn.onclick=function(){_db.collection(c).doc(id).update({deliveryStatus:'ready',status:'ready',updatedAt:new Date().toISOString()}).then(function(){_filoToast('📦 픽업 대기');});};})(o._id,col);
   btnArea.appendChild(readyBtn);
  }

  // 픽업대기 → 배달완료
  if(st==='ready'){
   var doneBtn=document.createElement('button');
   doneBtn.style.cssText='padding:7px 14px;background:#22c55e;border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer';
   doneBtn.innerHTML='✅ 배달 완료';
   (function(id,c,phone,name){
    doneBtn.onclick=function(){
     _db.collection(c).doc(id).update({deliveryStatus:'delivered',status:'done',updatedAt:new Date().toISOString()}).then(function(){
      _filoToast('✅ 배달 완료');
      if(phone) _filoSendOrderAlimtalk(phone,name,[],'','delivered');
     });
    };
   })(o._id,col,o.phone,o.customer||o.customerName);
   btnArea.appendChild(doneBtn);
  }

  // 취소 버튼 (완료/거절/취소 제외)
  if(st!=='delivered'&&st!=='rejected'&&st!=='cancelled'){
   var cancelBtn=document.createElement('button');
   cancelBtn.style.cssText='padding:7px 12px;background:transparent;border:1px solid rgba(239,68,68,.3);border-radius:8px;color:#ef4444;font-size:11px;font-weight:700;cursor:pointer';
   cancelBtn.innerHTML='취소';
   (function(id,c){
    cancelBtn.onclick=function(){
     if(!confirm('주문을 취소하시겠습니까?'))return;
     _db.collection(c).doc(id).update({deliveryStatus:'cancelled',status:'cancel',updatedAt:new Date().toISOString()}).then(function(){_filoToast('🗑 취소됨');});
    };
   })(o._id,col);
   btnArea.appendChild(cancelBtn);
  }
 });
}

function _filoSendOrderAlimtalk(phone,name,items,total,status){
 // 알림톡 발송 (향후 구현)
 // status: accepted / rejected / delivered
 var msgs={
  accepted:'주문이 접수됐습니다! 곧 배달을 시작합니다.',
  rejected:'죄송합니다. 매장 사정으로 주문이 거절됐습니다.',
  delivered:'배달이 완료됐습니다. 맛있게 드세요!'
 };
 // console.log('[알림톡]', phone, msgs[status]);
 // TODO: 알림톡 API 연동
}

function _filoDeliveryStatus(id,status){
 _db.collection('filo_sales').doc(id).update({deliveryStatus:status,updatedAt:new Date().toISOString()})
  .then(function(){_filoToast('✅ 상태 변경: '+{cooking:'조리중',ready:'픽업대기',delivered:'배달완료'}[status]);});
}

function _filoDeliveryCancel(id){
 if(!confirm('주문을 취소하시겠습니까?'))return;
 _db.collection('filo_sales').doc(id).update({deliveryStatus:'cancelled',status:'cancel'})
  .then(function(){_filoToast('🗑 주문이 취소됐습니다');});
}

function _filoDeliveryAdd(did){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto';

 var title=document.createElement('div');
 title.style.cssText='font-size:15px;font-weight:900;margin-bottom:16px';
 title.textContent='🛵 배달 주문 접수';
 box.appendChild(title);

 /* 배달앱 선택 */
 var appRow=document.createElement('div');
 appRow.style.marginBottom='14px';
 var appLabel=document.createElement('label');
 appLabel.style.cssText='font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.6px';
 appLabel.textContent='배달앱';
 var appGrid=document.createElement('div');
 appGrid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:6px';
 ['배민','쿠팡이츠','요기요','기타'].forEach(function(app){
  var btn=document.createElement('button');
  btn.className='delivery-app-btn';
  btn.dataset.app=app;
  btn.style.cssText='padding:10px 4px;border:2px solid var(--bd2);border-radius:var(--r);background:var(--surface2);color:var(--t2);font-size:11px;font-weight:700;cursor:pointer;transition:.15s;text-align:center';
  var icons={'배민':'🟢','쿠팡이츠':'🔴','요기요':'🟣','기타':'🛵'};
  btn.innerHTML='<div style="font-size:18px;margin-bottom:3px">'+icons[app]+'</div>'+app;
  btn.onclick=function(){
   document.querySelectorAll('.delivery-app-btn').forEach(function(b){
    b.style.borderColor='var(--bd2)';b.style.background='var(--surface2)';b.style.color='var(--t2)';
   });
   this.style.borderColor='#7c3aed';this.style.background='rgba(124,58,237,.1)';this.style.color='#a78bfa';
   window._selectedDeliveryApp=this.dataset.app;
  };
  appGrid.appendChild(btn);
 });
 appRow.appendChild(appLabel);appRow.appendChild(appGrid);
 box.appendChild(appRow);

 /* 필드들 */
 [
  {id:'dv-customer',l:'고객명',type:'text',ph:'홍길동'},
  {id:'dv-phone',l:'연락처',type:'tel',ph:'010-0000-0000'},
  {id:'dv-address',l:'배달 주소',type:'text',ph:'부산시 수영구...'},
  {id:'dv-total',l:'주문 금액 *',type:'number',ph:'15000'},
  {id:'dv-fee',l:'배달비',type:'number',ph:'3000'},
  {id:'dv-memo',l:'메모 (요청사항)',type:'text',ph:'문 앞에 놔주세요'},
 ].forEach(function(f){
  var g=document.createElement('div');g.style.marginBottom='10px';
  var l=document.createElement('label');
  l.style.cssText='font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.6px';
  l.textContent=f.l;
  var inp=document.createElement('input');
  inp.id=f.id;inp.type=f.type;inp.placeholder=f.ph;
  inp.style.cssText='width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none';
  g.appendChild(l);g.appendChild(inp);box.appendChild(g);
 });

 /* 메뉴 빠른 추가 */
 var menuNote=document.createElement('div');
 menuNote.style.cssText='font-size:11px;color:var(--t3);margin-bottom:14px;padding:8px 12px;background:rgba(124,58,237,.06);border-radius:8px';
 menuNote.textContent='💡 주문금액만 입력해도 매출 집계됩니다. 상세 메뉴는 생략 가능합니다.';
 box.appendChild(menuNote);

 var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:8px;margin-top:4px';
 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);cursor:pointer';
 cancelBtn.textContent='취소';cancelBtn.onclick=function(){mo.remove();window._selectedDeliveryApp=null;};
 var saveBtn=document.createElement('button');
 saveBtn.style.cssText='flex:2;padding:11px;background:linear-gradient(135deg,#7c3aed,#9f5ef8);border:none;border-radius:var(--r);color:#fff;font-weight:800;cursor:pointer';
 saveBtn.textContent='🛵 접수';
 saveBtn.onclick=function(){
  var total=parseInt(document.getElementById('dv-total').value)||0;
  if(!total){_filoToast('주문 금액을 입력하세요');return;}
  var now=new Date();
  _db.collection('filo_sales').add({
   dealerId:did,
   type:'delivery',
   deliveryApp:window._selectedDeliveryApp||'기타',
   deliveryStatus:'pending',
   customerName:document.getElementById('dv-customer').value||'',
   phone:document.getElementById('dv-phone').value||'',
   address:document.getElementById('dv-address').value||'',
   total:total,
   deliveryFee:parseInt(document.getElementById('dv-fee').value)||0,
   memo:document.getElementById('dv-memo').value||'',
   items:[{name:'배달주문',price:total,qty:1}],
   status:'pending',
   createdAt:now.toISOString(),
   date:now.toISOString().slice(0,10),
   payMethod:'delivery'
  }).then(function(){
   _filoToast('✅ 배달 주문이 접수됐습니다!');
   mo.remove();
   window._selectedDeliveryApp=null;
  }).catch(function(e){_filoToast('❌ '+e.message);});
 };
 btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
 box.appendChild(btnRow);

 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

/* ══════════════════════════════════════
   🍽 메뉴 관리 페이지
   카테고리 + 메뉴 CRUD + 이미지 업로드
   ══════════════════════════════════════ */
function _toSubmitOrder(did){
 if(!_toTable){_filoToast('⚠️ 테이블을 먼저 선택하세요');return;}
 var items=Object.values(_toCart).filter(function(it){return it.qty>0;});
 if(!items.length){_filoToast('⚠️ 메뉴를 선택하세요');return;}
 var total=items.reduce(function(s,it){return s+it.price*it.qty;},0);
 var now=new Date();
 _db.collection('filo_sales').add({
  dealerId:did,tableId:_toTable.tableId,
  tableName:_toTable.tableId+'번 테이블',
  items:items.map(function(it){return {name:it.name,price:it.price,qty:it.qty};}),
  total:total,status:'pending',type:'table',source:'staff',
  payMethod:'카운터결제',createdBy:_CU.name||_CU.userId||'직원',
  createdAt:now.toISOString(),date:now.toISOString().slice(0,10)
 }).then(function(){
  _db.collection('filo_tables').where('dealerId','==',did).where('tableId','==',_toTable.tableId)
   .get().then(function(snap){if(!snap.empty)snap.docs[0].ref.update({status:'occupied',since:now.toISOString()});});
  _filoToast('✅ '+_toTable.tableId+'번 주문 전송! 주방/주문대기 자동 등록됩니다.');
  _toCart={};_toUpdateCart();_toShowMenuGrid(window._toAllMenus||[]);_toLoadTables(did);
 }).catch(function(e){_filoToast('❌ '+e.message);});
}
