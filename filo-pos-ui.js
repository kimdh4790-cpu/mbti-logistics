/*
 * filo-pos-ui.js — FILO POS 화면 렌더링 + 심플/프로 모드
 * Copyright (c) 2024-2026 유한회사 엠비티아이
 *
 * 역할: POS 페이지 UI 렌더링, 테이블 결제, 영수증
 * 의존: filo-pos-core.js, filo-order-common.js
 *
 * POS UI 모드:
 *   심플 모드 — 카드형 UI (토스/페이히어 스타일, 초보 사장님)
 *   프로 모드  — 격자형 UI (기존 POS 스타일, 숙련 사장님)
 *   설정: companies/{dealerId}.posMode = 'simple' | 'pro'
 *         filo-settings → POS 화면 스타일에서 변경 가능
 *
 * 주요 함수:
 *   _filoPageKiosk(el)         — POS 메인 페이지 (모드 분기)
 *   _loadKioskTableBar(el,did) — 테이블바 + 메뉴 로딩
 *   _filoRenderKiosk(menus)    — 메뉴 격자 렌더 (프로)
 *   _filoRenderKioskSimple(ms) — 메뉴 카드 렌더 (심플) ★NEW
 *   _filoFilterKiosk(cat)      — 카테고리 필터
 *   _filoTablePay(did,...)     — 테이블 후불결제
 *   _filoTableSelfPay(...)     — 각자계산
 *   _filoShowReceipt(...)      — 영수증 출력
 *   _filoReceiptNotify(...)    — 영수증 알림
 *   render(el)                 — 테이블 렌더
 *
 * 최종수정: 2026-07-17 | 리팩토링 분리 + 심플모드 추가
 */

// ── 오프라인 핫스팟 안내 ──────────────────────────────────────────────────────
function _filoHotspotTip(){
 if(typeof _filoShowModal==='function'){
  _filoShowModal('<div style="padding:24px 20px"><div style="font-size:16px;font-weight:900;margin-bottom:16px">핫스팟으로 카드결제 연결하기</div>'+
   '<div style="font-size:13px;color:var(--t2);line-height:1.8">'+
   '<div style="margin-bottom:10px"><strong style="color:var(--tx)">① iPhone</strong><br>설정 → 개인용 핫스팟 → 허용</div>'+
   '<div style="margin-bottom:10px"><strong style="color:var(--tx)">② 안드로이드</strong><br>설정 → 연결 → 모바일 핫스팟 → 켜기</div>'+
   '<div style="margin-bottom:16px"><strong style="color:var(--tx)">③ POS에서</strong><br>Wi-Fi 설정 → 핫스팟 이름 선택 → 연결</div>'+
   '<div style="background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);border-radius:12px;padding:10px 14px;font-size:12px;color:#b8860b">'+
   '핫스팟 연결 시 카드·카카오페이 결제가 즉시 가능합니다. 오프라인 임시 저장된 현금 주문도 자동 동기화됩니다.</div></div>'+
   '<button onclick="this.closest(\'.mo\').remove()" style="width:100%;margin-top:16px;padding:12px;background:#c9a84c;border:none;border-radius:12px;color:#0f172a;font-weight:800;font-size:14px;cursor:pointer">확인</button></div>');
 }
}

// ── 오프라인 상태 배너 ────────────────────────────────────────────────────────
function _offlineBannerShow(banner){
 banner.style.display='flex';
 if(typeof _offlinePendingCount==='function'){
  _offlinePendingCount().then(function(n){
   var badge=document.getElementById('filo-pending-badge');
   var cnt=document.getElementById('filo-pending-count');
   if(badge&&cnt){badge.hidden=n===0;cnt.textContent=n;}
  });
 }
}
function _offlineBanner(){
 var banner=document.getElementById('filo-offline-banner');
 if(!banner)return;
 if(navigator.onLine){banner.style.display='none';}else{_offlineBannerShow(banner);}
}
// 배너는 display:none으로 시작 (hidden 속성 제거 — display:flex 인라인에 의해 무시됐던 버그 수정)
// 실제 offline 이벤트에서만 표시, online 이벤트에서 즉시 숨김
window.addEventListener('online',function(){var b=document.getElementById('filo-offline-banner');if(b)b.style.display='none';});
window.addEventListener('offline',_offlineBanner);

function _filoReceiptSelected(input){
 var file=input.files&&input.files[0];
 if(!file)return;
 var label=document.getElementById('si-receipt-label');
 if(label)label.textContent=file.name.slice(0,20)+(file.name.length>20?'...':'');
 var preview=document.getElementById('si-receipt-preview');
 var img=document.getElementById('si-receipt-img');
 if(file.type.startsWith('image/')&&preview&&img){
  var reader=new FileReader();
  reader.onload=function(e){img.src=e.target.result;preview.style.display='block';};
  reader.readAsDataURL(file);
 }
}


// ── POS 심플/프로 모드 전환 ─────────────────────────
function _filoPosMode(){
  // companies.posMode 또는 로컬 설정
  var cached = window._cachedCompanyDoc;
  var mode = (cached && cached.posMode) || localStorage.getItem('filo_pos_mode') || 'simple';
  return mode; // 'simple' | 'pro'
}
function _filoPosSetMode(mode){
  localStorage.setItem('filo_pos_mode', mode);
  if(window._cachedCompanyDoc) window._cachedCompanyDoc.posMode = mode;
  // Firestore에도 저장
  var did = _CU && (_CU.dealerId||_CU.uid);
  if(_db && did){
    _db.collection('companies').doc(did).update({ posMode: mode }).catch(function(){});
  }
}

function _filoPageKiosk(el){
 var did=_CU.dealerId||_CU.uid;
 _cartItems=[];
 var mode = _filoPosMode();
 // 모드 전환 버튼
 var modeBtn = '<button onclick="_filoPosSetMode(\''+( mode==='simple'?'pro':'simple' )+'\');_filoPageKiosk(document.getElementById(\'content\'))" '+
   'style="padding:6px 14px;border-radius:20px;border:1px solid var(--bd);font-size:11px;font-weight:700;cursor:pointer;background:var(--surface,#fff);color:var(--t2)">'+
   (mode==='simple'?'심플 모드':'프로 모드')+'</button>';

 // 모바일 하단 고정 결제 바 (기존 것 제거 후 재생성)
 var oldBar=document.getElementById('pos-pay-bar');if(oldBar)oldBar.remove();
 var payBar=document.createElement('div');
 payBar.id='pos-pay-bar';
 payBar.style.cssText='display:none;position:fixed;bottom:0;left:0;right:0;z-index:700;padding:12px 16px 20px;background:#0f172a;border-top:2px solid #c9a84c;box-shadow:0 -8px 32px rgba(0,0,0,.6);flex-direction:row;align-items:center;gap:12px';
 payBar.innerHTML='<div style="flex:1;min-width:0">'+
  '<div id="ppb-count" style="font-size:11px;color:#64748b;font-weight:700;letter-spacing:.5px">장바구니 비어 있음</div>'+
  '<div id="ppb-total" style="font-size:22px;font-weight:900;color:#c9a84c;font-variant-numeric:tabular-nums;line-height:1.2">₩0</div>'+
  '</div>'+
  '<button onclick="_cartRemoveSheet()" style="width:44px;height:44px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:12px;color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'+
  '<button onclick="_filoPay()" style="height:44px;padding:0 24px;background:#c9a84c;border:none;border-radius:12px;color:#0a0a0a;font-size:15px;font-weight:900;cursor:pointer;flex-shrink:0;letter-spacing:-.3px">결제하기</button>';
 document.body.appendChild(payBar);

 el.innerHTML='<div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
   modeBtn +
 '<button onclick="_filoGoPage(\'menu_mgmt\')" class="btn" style="background:var(--br);color:#fff;font-size:12px;display:inline-flex;align-items:center;gap:5px;font-weight:700">'+
 '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 메뉴 등록</button>'+
 '<button onclick="_posCustomerDisplay()" class="btn" style="background:#1e293b;border:1px solid #334155;color:#94a3b8;font-size:12px;display:inline-flex;align-items:center;gap:5px;font-weight:700" id="pos-cust-btn">'+
 '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> 고객 화면</button>'+

 '<button onclick="typeof _filoRefundLookup===\'function\'?_filoRefundLookup():_filoGoPage(\'orders\')" class="btn" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#ef4444;font-size:12px;display:inline-flex;align-items:center;gap:5px;font-weight:700">'+
 '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.49"/></svg> 환불 조회</button>'+
 '<button onclick="document.getElementById(\'menu-excel-input\').click()" class="btn" style="background:var(--b3);font-size:12px;display:inline-flex;align-items:center;gap:5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 메뉴 엑셀 업로드</button>'+
 '<input id="menu-excel-input" type="file" accept=".xlsx,.xls" style="display:none" onchange="_filoImportMenuExcel(this)">'+
 '<div id="kiosk-table-bar" style="display:flex;gap:6px;flex-wrap:wrap"></div>'+
 '</div>'+
 '<div class="pos-wrap">'+
 '<div style="display:flex;flex-direction:column;overflow:hidden;min-height:0">'+
 '<div style="display:flex;height:100%;overflow:hidden;min-height:0">'+
 '<div id="kiosk-cats" style="width:76px;flex-shrink:0;overflow-y:auto;border-right:1px solid var(--bd);display:flex;flex-direction:column;gap:3px;padding:8px 5px;background:var(--surface,#fff)"></div>'+
 '<div class="menu-grid" id="kiosk-menu" style="flex:1;overflow-y:auto">'+
 '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--t3);display:flex;align-items:center;justify-content:center;gap:10px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>메뉴 로딩 중...</div>'+
 '</div></div></div>'+
 '<div class="cart-panel">'+
 '<div style="padding:14px 16px;border-bottom:1px solid var(--bd);font-size:14px;font-weight:900">주문 내역</div>'+
 '<div id="cart-list" style="flex:1;overflow-y:auto"></div>'+
 '<div style="padding:14px 16px;border-top:1px solid var(--bd)">'+
 '<div style="display:flex;justify-content:space-between;margin-bottom:10px">'+
 '<span style="font-size:13px;font-weight:700">합계</span>'+
 '<span id="cart-total" style="font-size:18px;font-weight:900;color:var(--br,#c9a84c)">₩0</span></div>'+
 '<button class="pay-btn" onclick="_filoPay()">결제하기</button>'+
 '<button onclick="_cartClear()" class="btn" style="width:100%;margin-top:6px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#ef4444;font-size:12px;display:flex;align-items:center;justify-content:center;gap:5px">'+_svgIcon('x')+' 초기화</button>'+
 '</div></div></div>';

 // 테이블 현황 바 실시간 로드 (5개씩)
 var _kioskTableUnsub=null;
 var _kioskTablesCache=null; // filo_tables 캐시 (onSnapshot 재조회 방지)

 function _loadKioskTableBar(){
  var bar=document.getElementById('kiosk-table-bar');
  if(!bar)return;
  if(_kioskTableUnsub){_kioskTableUnsub();_kioskTableUnsub=null;}
  var today=_today();
  // 주문 맵 로드
  _kioskTableUnsub=_db.collection('filo_orders').where('dealerId','==',did).where('type','==','table')
   .onSnapshot(function(oSnap){
    var oMap={};
    oSnap.forEach(function(doc){
     var d=doc.data();
     if(d.createdAt&&d.createdAt.slice(0,10)===today&&d.status!=='cancel'){
      var k=String(d.tableNum||'');
      var k2=d.tableName||'';
      if(!k&&k2)k=k2.replace(/[^0-9]/g,'')||k2;
      var isCleared=(d.status==='cleared');
      var isPd=(d.status==='paid'||d.payType==='prepay'||isCleared);
      if(k){
       if(!oMap[k])oMap[k]={total:0,paidTotal:0,pendingTotal:0,paid:false,hasPending:false,orders:[],hasCleared:false};
       oMap[k].total+=(d.total||0);
       oMap[k].orders.push(Object.assign({_id:doc.id},d));
       if(isCleared){oMap[k].paidTotal+=(d.total||0);oMap[k].hasCleared=true;}
       else if(isPd){oMap[k].paidTotal+=(d.total||0);}
       else{oMap[k].pendingTotal+=(d.total||0);oMap[k].hasPending=true;}
       if(!oMap[k].hasPending&&oMap[k].paidTotal>0)oMap[k].paid=true;
      }
      if(k2&&k2!==k){
       if(!oMap[k2])oMap[k2]={total:0,paidTotal:0,pendingTotal:0,paid:false,hasPending:false,orders:[],hasCleared:false};
       oMap[k2].total+=(d.total||0);
       oMap[k2].orders.push(Object.assign({_id:doc.id},d));
       if(isCleared){oMap[k2].paidTotal+=(d.total||0);oMap[k2].hasCleared=true;}
       else if(isPd){oMap[k2].paidTotal+=(d.total||0);}
       else{oMap[k2].pendingTotal+=(d.total||0);oMap[k2].hasPending=true;}
       if(!oMap[k2].hasPending&&oMap[k2].paidTotal>0)oMap[k2].paid=true;
      }
     }
    });
    // 테이블 목록 로드 (캐시 우선)
    var tablePromise=_kioskTablesCache
     ?Promise.resolve(_kioskTablesCache)
     :_db.collection('filo_tables').where('dealerId','==',did).get().then(function(s){_kioskTablesCache=s;return s;});
    tablePromise.then(function(tSnap){
     var tables=tSnap.empty?
      Array.from({length:10},function(_,i){return {num:i+1,name:'테이블 '+(i+1),status:'empty'};})
      :tSnap.docs.map(function(d){var f=d.data();return {num:f.tableNum||1,name:f.tableName||'테이블',status:f.status||'empty'};})
       .sort(function(a,b){return a.num-b.num;})
       .filter(function(t,i,arr){return arr.findIndex(function(x){return x.num===t.num;})=== i;});

     // 5개씩 페이지
     if(!window._kioskTablePage)window._kioskTablePage=0;
     var page=window._kioskTablePage;
     var chunk=tables.slice(page*5,(page+1)*5);
     bar.innerHTML='';

     // 이전/다음 버튼
     if(tables.length>5){
      var prevBtn=document.createElement('button');
      prevBtn.textContent='◀';
      prevBtn.style.cssText='padding:4px 8px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer';
      prevBtn.onclick=function(){window._kioskTablePage=Math.max(0,page-1);_loadKioskTableBar();};
      bar.appendChild(prevBtn);
     }

     chunk.forEach(function(t){
      var ord=oMap[String(t.num)]||oMap[t.name]||oMap[String(t.num).replace(/[^0-9]/g,'')];
      var hasOrder=ord&&ord.total>0;
      // filo_payments 기반으로 pendingTotal 재계산
      var dispPaid=ord?(ord.paidTotal||0):0;
      var dispPending=ord?Math.max(0,ord.total-dispPaid):0;
      var isPaid=hasOrder&&dispPending<=0&&dispPaid>0;
      var color=t.status==='empty'?'#334155':isPaid?'#818cf8':hasOrder?'#fbbf24':'#4ade80';
      var bg=t.status==='empty'?'#f1f5f9':isPaid?'rgba(99,102,241,.25)':hasOrder?'rgba(251,191,36,.2)':'rgba(74,222,128,.15)';
      var borderC=t.status==='empty'?'#94a3b8':isPaid?'#6366f1':hasOrder?'#f59e0b':'#22c55e';
      var btn=document.createElement('button');
      btn.style.cssText='padding:6px 12px;background:'+bg+';border:1.5px solid '+borderC+';border-radius:10px;color:'+color+';font-size:11px;font-weight:800;cursor:pointer;line-height:1.5;text-align:center;min-width:72px';
      var dispHtml='<div style="color:#0f172a;font-size:12px;font-weight:800">'+t.name+'</div>';
      if(hasOrder){
       if(ord.orders&&ord.orders.some(function(o){return o.movedFrom;})){
        var from=ord.orders.find(function(o){return o.movedFrom;});
        dispHtml+='<div style="font-size:9px;color:#f59e0b">↔ '+from.movedFrom+'번에서 이동</div>';
       }
       if(dispPaid>0)dispHtml+='<div style="font-size:10px;color:#818cf8">₩'+dispPaid.toLocaleString()+'</div>';
       if(dispPending>0)dispHtml+='<div style="font-size:10px;color:#fbbf24">₩'+dispPending.toLocaleString()+'</div>';
       if(isPaid)dispHtml+='<div style="font-size:10px;color:#818cf8">전액결제</div>';
      } else {
       dispHtml+='<div style="font-size:10px;color:#475569;font-weight:600">비어있음</div>';
      }
      btn.innerHTML=dispHtml;
      (function(table,order){btn.onclick=function(){
       // POS 테이블 선택
       window._selectedTableId=table.num;
       window._selectedTableName=table.name;
       // 기존 선택 표시 초기화
       document.querySelectorAll('#kiosk-table-bar button[data-selected]').forEach(function(b){
        b.removeAttribute('data-selected');
        b.style.outline='';
       });
       btn.setAttribute('data-selected','1');
       btn.style.outline='2px solid #0891b2';
       // 주문 내역 헤더 업데이트
       var cartTitle=document.querySelector('.cart-panel div:first-child');
       if(cartTitle)cartTitle.textContent=table.name+' 주문';
       _filoToast(table.name+' 선택됨');
       // 주문 있으면 주문 내역 모달 표시
       if(order&&order.orders&&order.orders.length){
        _filoTableOrderModal(did,table,order);
       }
      };})(t,ord||null);
      bar.appendChild(btn);
     });

     if(tables.length>5){
      var nextBtn=document.createElement('button');
      nextBtn.textContent='▶';
      nextBtn.style.cssText='padding:4px 8px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer';
      nextBtn.onclick=function(){window._kioskTablePage=Math.min(Math.ceil(tables.length/5)-1,page+1);_loadKioskTableBar();};
      bar.appendChild(nextBtn);
     }
    });
   });
 }
 _loadKioskTableBar();

 // filo_menus 컬렉션에서 로드
 _db.collection('filo_menus').where('dealerId','==',did).get()
 .then(function(snap){
  if(snap.empty){
   // 메뉴 없으면 안내
   var menuEl=document.getElementById('kiosk-menu');
   if(menuEl) menuEl.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--t3);display:flex;flex-direction:column;align-items:center;gap:8px"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'+
    ''+
    '<div style="font-size:14px;font-weight:700;margin-bottom:8px">등록된 메뉴가 없습니다</div>'+
    '<div style="font-size:12px">메뉴 관리에서 메뉴를 추가하거나<br>엑셀 업로드로 일괄 등록하세요</div></div>';
   var catEl=document.getElementById('kiosk-cats');
   if(catEl) catEl.innerHTML='<button class="btn btn-brand btn-sm" style="border-radius:100px">전체</button>';
   return;
  }
  var menus=[];
  snap.forEach(function(doc){
   menus.push(Object.assign({_id:doc.id},doc.data()));
  });
  menus.sort(function(a,b){return (a.category||'').localeCompare(b.category||'');});
  window._kioskMenus=menus;
  // 빈 배열로 캐시 덮어쓰기 방지 (오프라인 시 Firestore가 빈 배열 반환 가능)
  if(menus.length>0&&typeof _offlineCacheMenus==='function')_offlineCacheMenus(menus,did);
  // 오프라인 + Firestore가 빈 배열 반환 시 우리 캐시 시도
  if(menus.length===0&&typeof _offlineGetMenus==='function'&&!navigator.onLine){
   _offlineGetMenus(did).then(function(cached){
    if(cached&&cached.length){
     _filoToast('오프라인 — 캐시 메뉴로 표시합니다');
     window._kioskMenus=cached;
     if(_filoPosMode()==='simple')_filoRenderKioskSimple(cached);
     else _filoRenderKiosk(cached);
    } else {
     if(_filoPosMode()==='simple')_filoRenderKioskSimple([]);
     else _filoRenderKiosk([]);
    }
   });
   return;
  }
  if(_filoPosMode()==='simple') _filoRenderKioskSimple(menus);
  else _filoRenderKiosk(menus);
 }).catch(function(e){
  if(typeof _offlineGetMenus==='function'&&!navigator.onLine){
   _offlineGetMenus(did).then(function(cached){
    if(cached&&cached.length){
     _filoToast('오프라인 — 캐시 메뉴로 표시합니다');
     window._kioskMenus=cached;
     if(_filoPosMode()==='simple') _filoRenderKioskSimple(cached);
     else _filoRenderKiosk(cached);
    } else {
     var menuEl=document.getElementById('kiosk-menu');
     if(menuEl) menuEl.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--red)">오프라인 상태입니다. 캐시된 메뉴가 없습니다.</div>';
    }
   });
   return;
  }
  var menuEl=document.getElementById('kiosk-menu');
  if(menuEl) menuEl.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--red);display:flex;flex-direction:column;align-items:center;gap:8px"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>메뉴 로드 실패: '+e.message+'</div>';
 });
}


function _filoRenderKiosk(menus){
 var cats=[...new Set(menus.map(function(m){return m.category||'기타';}))];
 var catEl=document.getElementById('kiosk-cats');
 if(catEl){
 catEl.innerHTML='<button onclick="_filoFilterKiosk(&quot;전체&quot;,this)" style="padding:11px 4px;border-radius:10px;background:var(--br,#c9a84c);color:#fff;font-size:10px;font-weight:900;border:none;cursor:pointer;text-align:center;line-height:1.3;word-break:keep-all;width:100%;transition:all .15s">전체</button>'+
 cats.map(function(c){return '<button onclick="_filoFilterKiosk(this.dataset.cat,this)" data-cat="'+c+'" style="padding:11px 4px;border-radius:10px;background:transparent;color:var(--t2);font-size:10px;font-weight:700;border:none;cursor:pointer;text-align:center;line-height:1.3;word-break:keep-all;width:100%;transition:all .15s">'+c+'</button>';}).join('');
 }
 var menuEl=document.getElementById('kiosk-menu');
 if(menuEl){
 menuEl.innerHTML=menus.map(function(m,i){
 var _colors=['#6366f1','#10b981','#f59e0b','#ef4444','#0891b2','#8b5cf6','#ec4899'];
 var _ci=m.name?m.name.charCodeAt(0)%_colors.length:0;
 var _c=_colors[_ci];
 var _init=esc((m.name||'?').slice(0,1));
 var _emIcon=m.imageUrl
  ?'<div style="width:100%;height:65px;border-radius:10px;overflow:hidden;margin-bottom:6px;background:'+_c+'1a;flex-shrink:0"><img src="'+esc(m.imageUrl)+'" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" onerror="this.style.opacity=0"></div>'
  :'<div style="width:40px;height:40px;border-radius:12px;background:'+_c+'1a;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:18px;font-weight:900;color:'+_c+';flex-shrink:0">'+_init+'</div>';
 return '<div class="menu-item pop-in stagger-'+Math.min(i+1,4)+'" data-cat="'+(m.category||'기타')+'" data-id="'+m._id+'" data-name="'+esc(m.name)+'" data-price="'+m.price+'" onclick="_cartAddFromEl(this)" style="display:flex;flex-direction:column;align-items:stretch">'+
 _emIcon+
 '<div style="font-size:12px;font-weight:800;margin-bottom:4px;letter-spacing:-.2px;line-height:1.35;word-break:keep-all;overflow-wrap:break-word;color:var(--tx)">'+esc(m.name)+'</div>'+
 '<div style="font-size:13px;font-weight:900;color:var(--br,#c9a84c);letter-spacing:-.3px;margin-top:auto">₩'+m.price.toLocaleString()+'</div>'+
 (m.stock!=null?'<div style="font-size:9px;color:var(--t3);margin-top:3px;font-weight:700">재고 '+m.stock+'</div>':'')+'</div>';
 }).join('');
 }
 window._kioskMenus=menus;
}

// 심플 모드: 카드형 UI (토스/페이히어 스타일)
function _filoRenderKioskSimple(menus){
 var cats=[...new Set(menus.map(function(m){return m.category||'기타';}))];
 var catEl=document.getElementById('kiosk-cats');
 if(catEl){
  catEl.innerHTML='<button onclick="_filoFilterKiosk(&quot;전체&quot;,this)" style="padding:11px 4px;border-radius:10px;background:var(--br,#c9a84c);color:#fff;font-size:10px;font-weight:900;border:none;cursor:pointer;text-align:center;line-height:1.3;word-break:keep-all;width:100%;transition:all .15s">전체</button>'+
  cats.map(function(c){return '<button onclick="_filoFilterKiosk(this.dataset.cat,this)" data-cat="'+c+'" style="padding:11px 4px;border-radius:10px;background:transparent;color:var(--t2);font-size:10px;font-weight:700;border:none;cursor:pointer;text-align:center;line-height:1.3;word-break:keep-all;width:100%;transition:all .15s">'+c+'</button>';}).join('');
 }
 var menuEl=document.getElementById('kiosk-menu');
 if(menuEl){
  menuEl.innerHTML=menus.map(function(m,i){
   var _colors=['#6366f1','#10b981','#f59e0b','#ef4444','#0891b2','#8b5cf6','#ec4899'];
   var _ci=m.name?m.name.charCodeAt(0)%_colors.length:0;
   var _c=_colors[_ci];
   var _init=esc((m.name||'?').slice(0,1));
   var imgHtml=m.imageUrl
    ?'<img src="'+esc(m.imageUrl)+'" style="width:100%;height:88px;object-fit:cover;display:block;border-radius:14px 14px 0 0" loading="lazy" onerror="this.style.display=\'none\'">'
    :'<div style="width:100%;height:88px;border-radius:14px 14px 0 0;background:'+_c+'1a;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:'+_c+'">'+_init+'</div>';
   return '<div class="menu-item pop-in stagger-'+Math.min(i+1,4)+'" data-cat="'+(m.category||'기타')+'" data-id="'+m._id+'" data-name="'+esc(m.name)+'" data-price="'+m.price+'" onclick="_cartAddFromEl(this)" style="background:var(--surface,#fff);border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;cursor:pointer;display:block">'+
   imgHtml+
   '<div style="padding:10px 12px 12px">'+
   '<div style="font-size:14px;font-weight:800;color:var(--tx);line-height:1.35;margin-bottom:4px;word-break:keep-all">'+esc(m.name)+'</div>'+
   '<div style="font-size:16px;font-weight:900;color:var(--br,#c9a84c)">₩'+m.price.toLocaleString()+'</div>'+
   (m.stock!=null?'<div style="font-size:10px;color:var(--t3);margin-top:3px;font-weight:700">재고 '+m.stock+'</div>':'')+
   '</div></div>';
  }).join('');
 }
 window._kioskMenus=menus;
}


function _filoFilterKiosk(cat,btn){
 document.querySelectorAll('#kiosk-cats button').forEach(function(b){
  b.style.background=b===btn?'rgba(201,168,76,.18)':'transparent';
  b.style.color=b===btn?'var(--br,#c9a84c)':'var(--t2)';
  b.style.fontWeight=b===btn?'900':'700';
 });
 /* pos-hidden 클래스로 토글 — display:flex!important CSS를 클래스로 우선 순위 확보 */
 document.querySelectorAll('#kiosk-menu .menu-item').forEach(function(el){
  el.classList.toggle('pos-hidden',cat!=='전체'&&el.dataset.cat!==cat);
 });
}



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
            var iNames=items.slice(0,3).map(function(it){return (it.name||'메뉴')+(it.qty>1?' ×'+it.qty:'');}).join(' · ');
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

  // 레시피 기반 재고 자동 차감 (non-critical)
  _db.collection('menu_recipes').where('dealerId','==',did).get().then(function(recSnap){
   var recipes=[];
   recSnap.forEach(function(doc){var d=doc.data();recipes.push({menuName:d.menuName||'',ingredients:d.ingredients||[]});});
   if(!recipes.length)return;
   var deductions={};
   items.forEach(function(it){
    var rec=recipes.find(function(r){return r.menuName===it.name;});
    if(!rec)return;
    rec.ingredients.forEach(function(ing){
     if(!ing.invId||!ing.qty)return;
     deductions[ing.invId]=(deductions[ing.invId]||0)+ing.qty*(it.qty||1);
    });
   });
   var ids=Object.keys(deductions);
   if(!ids.length)return;
   Promise.all(ids.map(function(id){
    return _db.collection('inventory').doc(id).get().then(function(snap){
     if(!snap.exists)return;
     var cur=Number(snap.data().stock||snap.data().qty||0);
     var next=Math.max(0,cur-deductions[id]);
     return _db.collection('inventory').doc(id).update({stock:Math.round(next),updatedAt:new Date().toISOString()});
    }).catch(function(){});
   })).catch(function(){});
  }).catch(function(){});

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



// ── 고객 확인 화면 (양면 POS — 터치/비터치·결제 방식 선택) ───────────────────────
var _posCustMode=false;
var _posCustTouchMode=false;
var _posCustTab='order';      // 'order'|'menu'
var _posCustPayState=null;    // null|'card'|'cash'|'qr'
var _posCustTimer=null;

function _posCustomerDisplay(){
 var el=document.getElementById('pos-cust-disp');
 if(el){el.remove();_posCustMode=false;_posCustTouchMode=false;_posCustTab='order';_posCustPayState=null;_posCustSyncStop();return;}
 _posCustMode=true;
 var overlay=document.createElement('div');
 overlay.id='pos-cust-disp';
 overlay.style.cssText='position:fixed;inset:0;z-index:850;background:#050e1a;display:flex;flex-direction:column;font-family:Pretendard,-apple-system,sans-serif;color:#e2e8f0;overflow:hidden';

 var hdr=document.createElement('div');hdr.id='cust-hdr';
 hdr.style.cssText='flex-shrink:0;padding:14px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.06);background:#060f1f';

 var tabBar=document.createElement('div');tabBar.id='cust-tabbar';
 tabBar.style.cssText='flex-shrink:0;display:none;border-bottom:1px solid rgba(255,255,255,.06);background:#060f1f';

 var content=document.createElement('div');content.id='cust-content';
 content.style.cssText='flex:1;overflow-y:auto;padding:20px';

 var foot=document.createElement('div');foot.id='cust-foot';
 foot.style.cssText='flex-shrink:0;border-top:1px solid rgba(255,255,255,.08);background:#0a1628';

 overlay.appendChild(hdr);overlay.appendChild(tabBar);overlay.appendChild(content);overlay.appendChild(foot);
 document.body.appendChild(overlay);

 _posCustBuildHeader();
 _posCustBuildFoot();
 _posCustRender();
 _posCustSyncStart();
}

function _posCustBuildHeader(){
 var hdr=document.getElementById('cust-hdr');if(!hdr)return;
 var tbl=window._selectedTableName||'';
 var tblLabel=tbl?tbl+' 주문':'주문 내역';
 var payBtn=_posCustPayState?'<button id="cust-pay-confirm" style="background:#22c55e;border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:800;cursor:pointer;padding:9px 16px;white-space:nowrap">결제완료</button>':'';
 hdr.innerHTML=
  '<div style="flex:1;min-width:0">'+
  '<div style="font-size:10px;font-weight:900;letter-spacing:2px;color:#334155;text-transform:uppercase;margin-bottom:2px">CUSTOMER DISPLAY</div>'+
  '<div style="font-size:15px;font-weight:900;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(tblLabel)+'</div>'+
  '</div>'+
  payBtn+
  '<button id="cust-touch-toggle" style="background:'+(_posCustTouchMode?'rgba(201,168,76,.2)':'rgba(255,255,255,.07)')+';border:1px solid '+(_posCustTouchMode?'rgba(201,168,76,.5)':'rgba(255,255,255,.1)')+';border-radius:10px;color:'+(_posCustTouchMode?'#c9a84c':'#64748b')+';font-size:12px;font-weight:700;cursor:pointer;padding:8px 12px;white-space:nowrap">'+(_posCustTouchMode?'터치 ON':'터치 OFF')+'</button>'+
  '<button id="cust-close" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#64748b;font-size:12px;font-weight:700;cursor:pointer;padding:8px 12px;white-space:nowrap">닫기</button>';
 var overlay=document.getElementById('pos-cust-disp');
 var tog=document.getElementById('cust-touch-toggle');
 if(tog)tog.onclick=function(){
  _posCustTouchMode=!_posCustTouchMode;_posCustTab='order';
  _posCustBuildHeader();
  var tb=document.getElementById('cust-tabbar');
  if(tb){tb.style.display=_posCustTouchMode?'flex':'none';if(_posCustTouchMode)_posCustBuildTabBar();}
  _posCustRender();_posCustBuildFoot();
 };
 var cl=document.getElementById('cust-close');
 if(cl)cl.onclick=function(){if(overlay)overlay.remove();_posCustMode=false;_posCustTouchMode=false;_posCustTab='order';_posCustPayState=null;_posCustSyncStop();};
 var pc=document.getElementById('cust-pay-confirm');
 if(pc)pc.onclick=function(){_posCustConfirmPay();};
}

function _posCustBuildTabBar(){
 var tb=document.getElementById('cust-tabbar');if(!tb)return;
 tb.style.cssText='flex-shrink:0;display:flex;border-bottom:1px solid rgba(255,255,255,.06);background:#060f1f';
 var oAct=_posCustTab==='order';
 tb.innerHTML=
  '<button id="ctab-order" style="flex:1;padding:14px;background:none;border:none;border-bottom:2px solid '+(oAct?'#c9a84c':'transparent')+';color:'+(oAct?'#c9a84c':'#64748b')+';font-size:14px;font-weight:800;cursor:pointer;font-family:Pretendard,-apple-system,sans-serif">주문내역</button>'+
  '<button id="ctab-menu" style="flex:1;padding:14px;background:none;border:none;border-bottom:2px solid '+(!oAct?'#c9a84c':'transparent')+';color:'+(!oAct?'#c9a84c':'#64748b')+';font-size:14px;font-weight:800;cursor:pointer;font-family:Pretendard,-apple-system,sans-serif">메뉴선택</button>';
 var to=document.getElementById('ctab-order');
 var tm=document.getElementById('ctab-menu');
 if(to)to.onclick=function(){_posCustTab='order';_posCustBuildTabBar();_posCustRender();};
 if(tm)tm.onclick=function(){_posCustTab='menu';_posCustBuildTabBar();_posCustRender();};
}

function _posCustBuildFoot(){
 var foot=document.getElementById('cust-foot');if(!foot)return;
 var items=window._cartItems||[];
 var total=items.reduce(function(s,c){return s+c.price*c.qty;},0);
 var disc=window._posDiscount||0;
 var finalTotal=Math.max(0,total-disc);
 var totalQty=items.reduce(function(s,c){return s+c.qty;},0);
 var payArea='';
 if(_posCustPayState==='card'){
  payArea='<div style="text-align:center;padding:13px;background:rgba(59,130,246,.12);border-radius:12px;border:1px solid rgba(59,130,246,.3);margin-top:12px">'+
   '<div style="font-size:15px;font-weight:800;color:#60a5fa;margin-bottom:3px">카드 단말기에 카드를 올려주세요</div>'+
   '<div style="font-size:12px;color:#94a3b8">결제 승인 대기 중 — 직원이 확인 후 완료 처리합니다</div></div>';
 }else if(_posCustPayState==='cash'){
  payArea='<div style="text-align:center;padding:13px;background:rgba(34,197,94,.1);border-radius:12px;border:1px solid rgba(34,197,94,.3);margin-top:12px">'+
   '<div style="font-size:15px;font-weight:800;color:#4ade80;margin-bottom:3px">현금 결제 대기 중</div>'+
   '<div style="font-size:12px;color:#94a3b8">현금 ₩'+finalTotal.toLocaleString()+' 준비 후 직원에게 전달해 주세요</div></div>';
 }else if(_posCustPayState==='qr'){
  payArea='<div style="text-align:center;padding:13px;background:rgba(168,85,247,.1);border-radius:12px;border:1px solid rgba(168,85,247,.3);margin-top:12px">'+
   '<div style="font-size:15px;font-weight:800;color:#c084fc;margin-bottom:8px">QR 코드 결제</div>'+
   '<canvas id="cust-qr-canvas" width="130" height="130" style="display:block;margin:0 auto 8px;border-radius:8px;background:#fff"></canvas>'+
   '<div style="font-size:12px;color:#94a3b8">카카오페이·네이버페이 QR 스캔 또는 직원에게 문의</div></div>';
 }else{
  payArea='<div style="display:flex;gap:8px;margin-top:12px">'+
   '<button id="cust-pay-card" style="flex:1;padding:11px 8px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);border-radius:12px;color:#60a5fa;font-size:12px;font-weight:800;cursor:pointer;font-family:Pretendard,-apple-system,sans-serif;line-height:1.4">카드 단말기<br><span style="font-size:10px;font-weight:600;opacity:.7">단말기 결제</span></button>'+
   '<button id="cust-pay-cash" style="flex:1;padding:11px 8px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:12px;color:#4ade80;font-size:12px;font-weight:800;cursor:pointer;font-family:Pretendard,-apple-system,sans-serif;line-height:1.4">현금<br><span style="font-size:10px;font-weight:600;opacity:.7">현금 결제</span></button>'+
   '<button id="cust-pay-qr" style="flex:1;padding:11px 8px;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.3);border-radius:12px;color:#c084fc;font-size:12px;font-weight:800;cursor:pointer;font-family:Pretendard,-apple-system,sans-serif;line-height:1.4">QR 결제<br><span style="font-size:10px;font-weight:600;opacity:.7">카카오페이 등</span></button>'+
   '</div>';
 }
 var cancelBtn=_posCustPayState?'<button id="cust-pay-cancel" style="margin-top:8px;width:100%;padding:9px;background:none;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#475569;font-size:13px;font-weight:700;cursor:pointer;font-family:Pretendard,-apple-system,sans-serif">결제 취소</button>':'';
 foot.innerHTML='<div style="padding:14px 18px 26px">'+
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">'+
  '<span style="font-size:13px;color:#64748b;font-weight:700">'+totalQty+'개 항목 선택됨</span>'+
  '<div style="text-align:right">'+
  (disc>0?'<div style="font-size:12px;color:#f87171;margin-bottom:1px">할인 -₩'+disc.toLocaleString()+'</div>':'')+
  '<span style="font-size:32px;font-weight:900;color:#c9a84c;font-variant-numeric:tabular-nums;letter-spacing:-1px">₩'+finalTotal.toLocaleString()+'</span>'+
  '</div></div>'+
  payArea+cancelBtn+'</div>';
 if(_posCustPayState==='qr'){
  setTimeout(function(){
   var cv=document.getElementById('cust-qr-canvas');if(!cv)return;
   var ctx=cv.getContext('2d');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,130,130);
   ctx.fillStyle='#111';
   for(var r=0;r<13;r++)for(var c=0;c<13;c++){
    var skip=(r<7&&c<7)||(r<7&&c>5)||(r>5&&c<7);
    if(!skip&&((r*11+c*7+r+c)%2===0))ctx.fillRect(c*10,r*10,9,9);
   }
   function fp(x,y){ctx.fillStyle='#111';ctx.fillRect(x,y,60,60);ctx.fillStyle='#fff';ctx.fillRect(x+8,y+8,44,44);ctx.fillStyle='#111';ctx.fillRect(x+16,y+16,28,28);}
   fp(0,0);fp(70,0);fp(0,70);
  },40);
 }
 var pb=document.getElementById('cust-pay-card');if(pb)pb.onclick=function(){_posCustRequestPay('card');};
 var pbc=document.getElementById('cust-pay-cash');if(pbc)pbc.onclick=function(){_posCustRequestPay('cash');};
 var pbq=document.getElementById('cust-pay-qr');if(pbq)pbq.onclick=function(){_posCustRequestPay('qr');};
 var pcn=document.getElementById('cust-pay-cancel');if(pcn)pcn.onclick=function(){_posCustCancelPay();};
}

function _posCustRequestPay(method){
 if(!(window._cartItems||[]).length){_filoToast('주문 내역이 없습니다');return;}
 _posCustPayState=method;_posCustBuildFoot();_posCustBuildHeader();
}
function _posCustCancelPay(){
 _posCustPayState=null;_posCustBuildFoot();_posCustBuildHeader();
}
function _posCustConfirmPay(){
 var items=window._cartItems||[];if(!items.length){_filoToast('주문 내역이 없습니다');return;}
 var total=items.reduce(function(s,c){return s+c.price*c.qty;},0);
 var disc=window._posDiscount||0;var finalTotal=Math.max(0,total-disc);
 var did=window._curDealerId||'';
 var tableNum=window._selectedTableNum||0;
 var tableName=window._selectedTableName||'';
 var method=_posCustPayState==='card'?'card':_posCustPayState==='qr'?'kakao':'cash';
 var overlay=document.getElementById('pos-cust-disp');
 if(overlay)overlay.remove();
 _posCustMode=false;_posCustTouchMode=false;_posCustTab='order';_posCustPayState=null;_posCustSyncStop();
 _filoTablePay(did,items,finalTotal,tableNum,tableName,method,[]);
}

function _posCustSyncStart(){
 _posCustTimer=setInterval(function(){
  if(!document.getElementById('pos-cust-disp')){_posCustSyncStop();return;}
  _posCustRender();_posCustBuildFoot();
 },400);
}
function _posCustSyncStop(){if(_posCustTimer){clearInterval(_posCustTimer);_posCustTimer=null;}}

function _posCustRender(){
 var content=document.getElementById('cust-content');if(!content)return;
 if(_posCustTouchMode&&_posCustTab==='menu'){_posCustRenderMenu(content);}
 else{_posCustRenderOrder(content);}
}

function _posCustRenderOrder(content){
 var items=window._cartItems||[];
 if(!items.length){
  content.innerHTML='<div style="text-align:center;padding:60px 20px;color:#334155">'+
   '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'+
   '<div style="font-size:16px;color:#475569;font-weight:700">선택된 메뉴가 없습니다</div>'+
   (_posCustTouchMode?'<div style="font-size:13px;color:#334155;margin-top:8px">위 메뉴선택 탭을 눌러 주문하세요</div>':'')+
   '</div>';return;
 }
 content.innerHTML=items.map(function(c){
  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.05)">'+
   '<div style="flex:1;min-width:0">'+
   '<div style="font-size:16px;font-weight:800;color:#e2e8f0;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(c.name)+'</div>'+
   '<div style="font-size:13px;color:#64748b">₩'+c.price.toLocaleString()+' × '+c.qty+'</div></div>'+
   '<div style="display:flex;align-items:center;gap:10px">'+
   (_posCustTouchMode?
    '<div style="display:flex;align-items:center;gap:8px">'+
    '<button onclick="_posCustChangeQty(\''+esc(c.id)+'\',-1)" style="width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#e2e8f0;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">−</button>'+
    '<span style="font-size:16px;font-weight:800;min-width:18px;text-align:center">'+c.qty+'</span>'+
    '<button onclick="_posCustChangeQty(\''+esc(c.id)+'\',1)" style="width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#e2e8f0;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>'+
    '</div>':'')+
   '<div style="font-size:18px;font-weight:900;color:#c9a84c;font-variant-numeric:tabular-nums;white-space:nowrap">₩'+(c.price*c.qty).toLocaleString()+'</div></div>'+
   '</div>';
 }).join('');
}

function _posCustRenderMenu(content){
 var menus=window._kioskMenus||[];
 if(!menus.length){
  content.innerHTML='<div style="text-align:center;padding:60px 20px"><div style="font-size:15px;color:#475569;font-weight:700">메뉴를 불러오는 중...</div></div>';return;
 }
 var groups={};var order=[];
 menus.forEach(function(m){var cat=m.category||'기타';if(!groups[cat]){groups[cat]=[];order.push(cat);}groups[cat].push(m);});
 var html='';
 order.forEach(function(cat){
  html+='<div style="margin-bottom:20px"><div style="font-size:11px;font-weight:900;letter-spacing:1px;color:#475569;text-transform:uppercase;margin-bottom:10px">'+esc(cat)+'</div>'+
   '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">';
  groups[cat].forEach(function(m){
   var imgBg=m.imageUrl?'background-image:url('+esc(m.imageUrl)+');background-size:cover;background-position:center':'background:#1e293b';
   html+='<div onclick="_posCustAddItem(\''+esc(m.id)+'\')" style="border-radius:12px;overflow:hidden;cursor:pointer;border:1px solid rgba(255,255,255,.08)">'+
    '<div style="height:80px;'+imgBg+'"></div>'+
    '<div style="padding:8px 10px 10px">'+
    '<div style="font-size:12px;font-weight:800;color:#e2e8f0;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(m.name)+'</div>'+
    '<div style="font-size:13px;font-weight:900;color:#c9a84c">₩'+Number(m.price||0).toLocaleString()+'</div></div></div>';
  });
  html+='</div></div>';
 });
 content.innerHTML=html;
}

function _posCustAddItem(menuId){
 var menus=window._kioskMenus||[];
 var m=menus.find(function(x){return x.id===menuId;});if(!m)return;
 var items=window._cartItems||[];
 var ex=items.find(function(x){return x.id===menuId;});
 if(ex){ex.qty++;}else{items.push({id:m.id,name:m.name,price:Number(m.price||0),qty:1});}
 window._cartItems=items;
 _posCustTab='order';_posCustBuildTabBar();_posCustRender();_posCustBuildFoot();
 if(typeof _filoRenderCart==='function')_filoRenderCart();
}

function _posCustChangeQty(itemId,delta){
 var items=window._cartItems||[];
 var idx=items.findIndex(function(x){return x.id===itemId;});if(idx<0)return;
 items[idx].qty+=delta;
 if(items[idx].qty<=0)items.splice(idx,1);
 window._cartItems=items;
 _posCustRender();_posCustBuildFoot();
 if(typeof _filoRenderCart==='function')_filoRenderCart();
}

// 결제 완료 처리