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
 *   _filoPageKiosk(el)         — POS 메인 진입 (뷰 분기: floor|classic)
 *   _filoPageKioskFloor(el,did,dual) — 플로어 뷰 (테이블 그리드)
 *   _filoPageKioskClassic(el,did,dual) — 클래식 뷰 (탭바)
 *   _loadKioskTableGrid(did)   — 테이블 그리드 실시간 로드 (floor)
 *   _loadKioskTableBar(did)    — 테이블 탭바 실시간 로드 (classic)
 *   _loadKioskMenusForEl(did)  — 메뉴 Firestore 로드 (공용)
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


// ── POS 뷰 모드 관리 ────────────────────────────────────────────────────────
function _filoPosView(){
  return localStorage.getItem('filo_pos_view')||'floor'; // 'floor'|'classic'
}
function _filoPosDual(){
  return localStorage.getItem('filo_pos_dual')==='1';
}
function _filoPosMode(){
  var cached=window._cachedCompanyDoc;
  return (cached&&cached.posMode)||localStorage.getItem('filo_pos_mode')||'simple';
}
function _filoPosSetMode(mode){
  localStorage.setItem('filo_pos_mode',mode);
  if(window._cachedCompanyDoc)window._cachedCompanyDoc.posMode=mode;
  var did=_CU&&(_CU.dealerId||_CU.uid);
  if(_db&&did)_db.collection('companies').doc(did).update({posMode:mode}).catch(function(){});
}
function _filoPosSetView(view,dual){
  if(view!==undefined)localStorage.setItem('filo_pos_view',view);
  if(dual!==undefined)localStorage.setItem('filo_pos_dual',dual);
  _filoPageKiosk(document.getElementById('content'));
}

// ── POS 메인 진입점 (뷰 분기) ───────────────────────────────────────────────
function _filoPageKiosk(el){
  var did=_CU&&(_CU.dealerId||_CU.uid);
  if(!did)return;
  window._cartItems=window._cartItems||[];
  window._selectedTableId=null;
  window._selectedTableName=null;
  _stopPosInlineCust();
  // 기존 리스너 정리
  if(window._kioskGridUnsub){_kioskGridUnsub();_kioskGridUnsub=null;}
  if(window._kioskTableUnsub){_kioskTableUnsub();_kioskTableUnsub=null;}
  var view=_filoPosView();
  var dual=_filoPosDual();
  if(view==='floor') _filoPageKioskFloor(el,did,dual);
  else _filoPageKioskClassic(el,did,dual);
}

// ── POS 상단 버튼 바 (공통) ─────────────────────────────────────────────────
function _filoPosTopBar(did){
  var view=_filoPosView();
  var dual=_filoPosDual();
  var viewLbl=view==='floor'?'클래식 뷰':'플로어 뷰';
  var dualActv=dual?'rgba(56,189,248,.15)':'#0d1528';
  var dualCol=dual?'#38bdf8':'#64748b';
  var dualBd=dual?'1px solid rgba(56,189,248,.4)':'1px solid #e2e8f0';
  return '<div class="pos-topbar" style="display:flex;gap:8px;align-items:center;flex-wrap:nowrap;padding:10px 12px;background:#ffffff;border-radius:10px 10px 0 0;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none">'+
    '<button onclick="_filoPosSetView(\''+(view==='floor'?'classic':'floor')+'\')" style="padding:7px 14px;border-radius:20px;border:1px solid #e2e8f0;font-size:11px;font-weight:700;cursor:pointer;background:#f8fafc;color:#475569;white-space:nowrap;flex-shrink:0">'+viewLbl+'</button>'+
    '<button onclick="_filoPosSetView(undefined,\''+(dual?'0':'1')+'\')" style="padding:7px 14px;border-radius:20px;border:'+dualBd+';font-size:11px;font-weight:700;cursor:pointer;background:'+dualActv+';color:'+dualCol+';display:inline-flex;align-items:center;gap:4px;white-space:nowrap;flex-shrink:0">'+
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'+
    (dual?'단일':'양면')+'</button>'+
    '<button onclick="_filoGoPage(\'menu_mgmt\')" class="btn" style="background:#c9a84c;color:#0a0a0a;border:none;font-size:12px;display:inline-flex;align-items:center;gap:5px;font-weight:800;white-space:nowrap;flex-shrink:0">'+
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 메뉴 등록</button>'+
    '<button onclick="typeof _filoRefundLookup===\'function\'?_filoRefundLookup():_filoGoPage(\'orders\')" class="btn pos-topbar-sec" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#ef4444;font-size:12px;display:inline-flex;align-items:center;gap:5px;font-weight:700;white-space:nowrap;flex-shrink:0">'+
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.49"/></svg> 환불</button>'+
    '<button onclick="document.getElementById(\'menu-excel-input\').click()" class="btn pos-topbar-sec" style="background:#f8fafc;border:1px solid #e2e8f0;color:#64748b;font-size:12px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0">'+
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 엑셀</button>'+
    '<input id="menu-excel-input" type="file" accept=".xlsx,.xls" style="display:none" onchange="_filoImportMenuExcel(this)">'+
    '</div>';
}

// ── 인라인 고객 디스플레이 패널 (양면 화면 — 테이블오더 스타일) ─────────────
var _posCustInlineTimer=null;
var _posCustSelCat=null;
function _posCustSetCat(cat){
  window._posCustSelCat=cat;
  _renderPosInlineCust();
}
function _startPosInlineCust(){
  _stopPosInlineCust();
  _renderPosInlineCust();
  _posCustInlineTimer=setInterval(_renderPosInlineCust,800);
}
function _stopPosInlineCust(){
  if(_posCustInlineTimer){clearInterval(_posCustInlineTimer);_posCustInlineTimer=null;}
}
function _renderPosInlineCust(){
  var panel=document.getElementById('pos-cust-panel');
  if(!panel){_stopPosInlineCust();return;}
  var items=window._cartItems||[];
  var total=items.reduce(function(s,c){return s+c.price*c.qty;},0);
  var disc=window._posDiscount||0;
  var finalTotal=Math.max(0,total-disc);
  var tblName=window._selectedTableName||'고객 화면';

  var itemsHtml=!items.length
    ?'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#94a3b8">'+
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'+
        '<span style="font-size:12px;font-weight:700">주문 대기 중</span>'+
      '</div>'
    :'<div style="flex:1;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:6px">'+
        items.map(function(i){
          var sub=i.price*i.qty;
          return '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0">'+
            '<div style="flex:1;min-width:0">'+
              '<div style="font-size:13px;font-weight:800;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(i.name)+'</div>'+
              '<div style="font-size:11px;color:#475569;margin-top:2px">₩'+Number(i.price||0).toLocaleString()+' × '+i.qty+'</div>'+
            '</div>'+
            '<div style="font-size:14px;font-weight:900;color:#e5196b;font-variant-numeric:tabular-nums;white-space:nowrap">₩'+sub.toLocaleString()+'</div>'+
          '</div>';
        }).join('')+
      '</div>';

  panel.innerHTML=
    '<div style="padding:12px 16px;border-bottom:1px solid #e2e8f0;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc">'+
      '<span style="font-size:15px;font-weight:900;color:#1e293b">'+esc(tblName)+'</span>'+
      '<span style="font-size:9px;font-weight:900;color:#94a3b8;letter-spacing:2px;text-transform:uppercase">CUSTOMER DISPLAY</span>'+
    '</div>'+
    '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0">'+itemsHtml+'</div>'+
    '<div style="flex-shrink:0;padding:14px 16px;border-top:1px solid #e2e8f0;background:#ffffff">'+
      (disc>0?'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
        '<span style="font-size:10px;color:#475569;font-weight:700">할인</span>'+
        '<span style="font-size:13px;font-weight:800;color:#f87171;font-variant-numeric:tabular-nums">-₩'+disc.toLocaleString()+'</span>'+
      '</div>':'<div style="font-size:10px;color:#64748b;font-weight:700;margin-bottom:6px">합계</div>')+
      '<div style="font-size:36px;font-weight:900;color:#e5196b;font-variant-numeric:tabular-nums;letter-spacing:-1px;text-align:right">₩'+finalTotal.toLocaleString()+'</div>'+
    '</div>';
}

// ── 플로어 뷰 레이아웃 ─────────────────────────────────────────────────────
function _filoPageKioskFloor(el,did,dual){
  var custPanelHtml=dual?'<div class="pos-cust-panel" id="pos-cust-panel"></div>':'';
  el.innerHTML=_filoPosTopBar(did)+
    '<div class="pos-floor-wrap">'+
      // 왼쪽: 테이블 그리드
      '<div class="pos-tables-panel">'+
        '<div style="padding:12px 12px 6px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bd);flex-shrink:0">'+
          '<span style="font-size:10px;font-weight:900;letter-spacing:1.5px;color:var(--t3);text-transform:uppercase">테이블 현황</span>'+
          '<div id="kiosk-table-legend" style="display:flex;gap:6px;align-items:center">'+
            '<span style="font-size:9px;color:#4ade80;font-weight:700">● 주문중</span>'+
            '<span style="font-size:9px;color:#818cf8;font-weight:700">● 결제완료</span>'+
          '</div>'+
        '</div>'+
        '<div id="kiosk-table-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px;align-content:start;overflow-y:auto;flex:1"></div>'+
      '</div>'+
      // 오른쪽: 주문 패널
      '<div class="pos-order-panel">'+
        '<div class="pos-order-hdr" id="pos-order-hdr">'+
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'+
          '<span style="color:var(--t3);font-size:13px;font-weight:700">테이블을 선택하세요</span>'+
        '</div>'+
        '<div class="pos-order-body">'+
          '<div id="kiosk-cats" style="width:72px;flex-shrink:0;overflow-y:auto;border-right:1px solid var(--bd);display:flex;flex-direction:column;gap:3px;padding:8px 5px;background:var(--surface,#fff)"></div>'+
          '<div class="menu-grid" id="kiosk-menu" style="flex:1;overflow-y:auto">'+
            '<div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;gap:12px;color:var(--t3);padding:40px">'+
              '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>'+
              '<div style="font-size:14px;font-weight:700;text-align:center;line-height:1.6">좌측에서 테이블을 선택하면<br>메뉴를 주문할 수 있습니다</div>'+
            '</div>'+
          '</div>'+
          '<div class="cart-panel" style="width:264px;border-radius:0;border-top:none;border-bottom:none;border-right:none">'+
            '<div style="padding:12px 14px;border-bottom:1px solid var(--bd);font-size:13px;font-weight:900;display:flex;align-items:center;gap:6px" id="floor-cart-title">'+
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'+
              '주문 내역'+
            '</div>'+
            '<div id="cart-list" style="flex:1;overflow-y:auto"></div>'+
            '<div style="padding:12px 14px;border-top:1px solid var(--bd)">'+
              '<div style="display:flex;justify-content:space-between;margin-bottom:10px;align-items:center">'+
                '<span style="font-size:12px;font-weight:700;color:var(--t2)">합계</span>'+
                '<span id="cart-total" style="font-size:20px;font-weight:900;color:var(--br,#c9a84c);font-variant-numeric:tabular-nums">₩0</span>'+
              '</div>'+
              '<button class="pay-btn" onclick="_filoPay()">결제하기</button>'+
              '<button onclick="_cartClear()" class="btn" style="width:100%;margin-top:6px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.22);color:#ef4444;font-size:11px;display:flex;align-items:center;justify-content:center;gap:5px">'+_svgIcon('x')+' 초기화</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      custPanelHtml+
    '</div>';

  _loadKioskTableGrid(did);
  _loadKioskMenusForEl(did);
  if(dual)_startPosInlineCust();
}

// ── 테이블 그리드 로드 (플로어 뷰) ─────────────────────────────────────────
var _kioskGridUnsub=null;
var _kioskTablesCache=null;
function _loadKioskTableGrid(did){
  var grid=document.getElementById('kiosk-table-grid');
  if(!grid)return;
  if(_kioskGridUnsub){_kioskGridUnsub();_kioskGridUnsub=null;}
  var today=_today();
  _kioskGridUnsub=_db.collection('filo_orders').where('dealerId','==',did).where('type','==','table')
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
      [k,k2].forEach(function(key){
       if(!key||(key===k2&&key===k))return;
       if(!oMap[key])oMap[key]={total:0,paidTotal:0,pendingTotal:0,hasPending:false,orders:[]};
       oMap[key].total+=(d.total||0);
       oMap[key].orders.push(Object.assign({_id:doc.id},d));
       if(isCleared||isPd)oMap[key].paidTotal+=(d.total||0);
       else{oMap[key].pendingTotal+=(d.total||0);oMap[key].hasPending=true;}
      });
      if(k){
       if(!oMap[k])oMap[k]={total:0,paidTotal:0,pendingTotal:0,hasPending:false,orders:[]};
       oMap[k].total+=(d.total||0);
       if(!oMap[k].orders.find(function(o){return o._id===doc.id;}))oMap[k].orders.push(Object.assign({_id:doc.id},d));
       if(isCleared||isPd)oMap[k].paidTotal+=(d.total||0);
       else{oMap[k].pendingTotal+=(d.total||0);oMap[k].hasPending=true;}
      }
     }
    });
    var tp=_kioskTablesCache
     ?Promise.resolve(_kioskTablesCache)
     :_db.collection('filo_tables').where('dealerId','==',did).get().then(function(s){_kioskTablesCache=s;return s;});
    tp.then(function(tSnap){
     var tables=tSnap.empty
      ?Array.from({length:9},function(_,i){return {num:i+1,name:'테이블 '+(i+1),status:'empty'};})
      :tSnap.docs.map(function(d){var f=d.data();return {num:f.tableNum||1,name:f.tableName||'테이블',status:f.status||'empty'};})
       .sort(function(a,b){return a.num-b.num;})
       .filter(function(t,i,arr){return arr.findIndex(function(x){return x.num===t.num;})===i;});

     var selectedNum=window._selectedTableId;
     grid.innerHTML='';
     tables.forEach(function(t){
      var ord=oMap[String(t.num)]||oMap[t.name];
      var hasOrder=ord&&ord.total>0;
      var dispPaid=ord?ord.paidTotal:0;
      var dispPending=ord?Math.max(0,ord.total-dispPaid):0;
      var isPaid=hasOrder&&dispPending<=0&&dispPaid>0;
      var card=document.createElement('div');
      var stateClass=isPaid?'t-paid':hasOrder?'t-occupied':'t-empty';
      var isSelected=String(t.num)===String(selectedNum)||t.name===window._selectedTableName;
      card.className='pos-table-card '+stateClass+(isSelected?' t-selected':'');
      var amtHtml='';
      if(hasOrder){
       if(dispPending>0)amtHtml='<div style="font-size:10px;color:#fbbf24;font-weight:800;font-variant-numeric:tabular-nums;margin-top:3px">₩'+dispPending.toLocaleString()+'</div>';
       if(isPaid)amtHtml='<div style="font-size:10px;color:#818cf8;font-weight:800;margin-top:3px">전액결제</div>';
      }
      card.innerHTML=
        '<div style="font-size:13px;font-weight:900;color:#1e293b;line-height:1.2">'+esc(t.name)+'</div>'+
        '<div style="font-size:9px;font-weight:700;color:'+(hasOrder?(isPaid?'#6366f1':'#d97706'):'#64748b')+';margin-top:4px;letter-spacing:.3px">'+(hasOrder?(isPaid?'결제완료':'주문중'):'비어있음')+'</div>'+
        amtHtml;
      card.addEventListener('click',function(){
       // 선택 표시
       document.querySelectorAll('#kiosk-table-grid .pos-table-card').forEach(function(c){c.classList.remove('t-selected');});
       card.classList.add('t-selected');
       window._selectedTableId=t.num;
       window._selectedTableName=t.name;
       // 헤더 업데이트
       var hdr=document.getElementById('pos-order-hdr');
       var cartTitle=document.getElementById('floor-cart-title');
       if(hdr){
        var stateLabel=hasOrder?(isPaid?'전액결제':'주문중'):'비어있음';
        var stateColor=hasOrder?(isPaid?'#818cf8':'#fbbf24'):'#4ade80';
        hdr.innerHTML=
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="'+stateColor+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><rect x="14" y="14" width="8" height="8" rx="1"/></svg>'+
          '<span style="font-size:15px;font-weight:900;color:#1e293b">'+esc(t.name)+'</span>'+
          '<span style="font-size:11px;font-weight:700;color:'+stateColor+';background:'+stateColor+'1a;padding:3px 8px;border-radius:20px">'+stateLabel+'</span>'+
          (hasOrder&&dispPending>0?'<span style="font-size:13px;font-weight:900;color:#fbbf24;margin-left:auto;font-variant-numeric:tabular-nums">미결 ₩'+dispPending.toLocaleString()+'</span>':'');
       }
       if(cartTitle){
        cartTitle.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'+esc(t.name)+' 주문';
       }
       // 기존 주문 있으면 모달 표시
       if(ord&&ord.orders&&ord.orders.length){
        _filoTableOrderModal(did,t,ord);
       }
      });
      grid.appendChild(card);
     });
    });
   });
}

// ── 클래식 뷰 레이아웃 (프로 POS 스타일) ───────────────────────────────────
function _filoPageKioskClassic(el,did,dual){
  var custPanelHtml=dual?'<div class="pos-cust-panel" id="pos-cust-panel"></div>':'';
  var oldBar=document.getElementById('pos-pay-bar');if(oldBar)oldBar.remove();
  // 모바일 하단 결제 바 (max-width:900px 에서만 표시)
  var payBar=document.createElement('div');
  payBar.id='pos-pay-bar';
  payBar.style.cssText='display:none;position:fixed;bottom:0;left:0;right:0;z-index:700;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));background:#ffffff;border-top:1px solid #e2e8f0;box-shadow:0 -4px 16px rgba(0,0,0,.12);flex-direction:row;align-items:center;gap:10px';
  payBar.innerHTML=
    '<div style="flex:1;min-width:0">'+
      '<div id="ppb-count" style="font-size:10px;color:#475569;font-weight:700;letter-spacing:.5px;text-transform:uppercase">장바구니 비어 있음</div>'+
      '<div id="ppb-total" style="font-size:20px;font-weight:900;color:#c9a84c;font-variant-numeric:tabular-nums;line-height:1.2">₩0</div>'+
    '</div>'+
    '<button onclick="_cartRemoveSheet()" style="width:40px;height:40px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);border-radius:10px;color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'+
    '<button onclick="_filoPay()" style="height:40px;padding:0 22px;background:#c9a84c;border:none;border-radius:10px;color:#0a0a0a;font-size:14px;font-weight:900;cursor:pointer;flex-shrink:0;letter-spacing:-.3px">결제하기</button>';
  document.body.appendChild(payBar);

  el.innerHTML=_filoPosTopBar(did)+
    // 테이블 탭바 — 수평 스크롤
    '<div id="kiosk-table-bar" class="pos-table-bar"></div>'+
    // 메인 패널 래퍼
    '<div class="pos-classic-wrap">'+
      // 왼쪽 62%: 카테고리 탭 + 메뉴 그리드
      '<div class="pos-classic-left">'+
        '<div id="kiosk-cats" class="pos-cat-row"><div class="pos-cat-loading">메뉴 로딩 중...</div></div>'+
        '<div class="menu-grid pos-menu-grid" id="kiosk-menu" style="flex:1;overflow-y:auto;padding:10px;align-content:start;min-height:0"></div>'+
      '</div>'+
      // 오른쪽 38%: 주문 내역
      '<div class="pos-classic-cart">'+
        '<div class="pos-cart-hdr">'+
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'+
          '<span id="cart-title-txt" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">주문 내역</span>'+
        '</div>'+
        '<div id="cart-list" style="flex:1;overflow-y:auto;min-height:0"></div>'+
        '<div class="pos-cart-footer">'+
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">'+
            '<span style="font-size:11px;font-weight:700;color:#475569;letter-spacing:.8px;text-transform:uppercase">합계</span>'+
            '<span id="cart-total" style="font-size:22px;font-weight:900;color:#c9a84c;font-variant-numeric:tabular-nums">₩0</span>'+
          '</div>'+
          '<button class="pay-btn pos-pay-full" onclick="_filoPay()">결제하기</button>'+
          '<button onclick="_cartClear()" class="pos-clear-btn">'+
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> 초기화'+
          '</button>'+
        '</div>'+
      '</div>'+
      custPanelHtml+
    '</div>';

  _loadKioskTableBar(did);
  _loadKioskMenusForEl(did);
  if(dual)_startPosInlineCust();
}

// ── 클래식 테이블 바 로드 ───────────────────────────────────────────────────
var _kioskTableUnsub=null;
var _kioskTablesCache2=null;
function _loadKioskTableBar(did){
  var bar=document.getElementById('kiosk-table-bar');
  if(!bar)return;
  if(_kioskTableUnsub){_kioskTableUnsub();_kioskTableUnsub=null;}
  var today=_today();
  _kioskTableUnsub=_db.collection('filo_orders').where('dealerId','==',did).where('type','==','table')
   .onSnapshot(function(oSnap){
    var oMap={};
    oSnap.forEach(function(doc){
     var d=doc.data();
     if(d.createdAt&&d.createdAt.slice(0,10)===today&&d.status!=='cancel'){
      var k=String(d.tableNum||'');var k2=d.tableName||'';
      if(!k&&k2)k=k2.replace(/[^0-9]/g,'')||k2;
      var isCleared=(d.status==='cleared');var isPd=(d.status==='paid'||d.payType==='prepay'||isCleared);
      if(k){if(!oMap[k])oMap[k]={total:0,paidTotal:0,pendingTotal:0,hasPending:false,orders:[]};
       oMap[k].total+=(d.total||0);oMap[k].orders.push(Object.assign({_id:doc.id},d));
       if(isCleared||isPd)oMap[k].paidTotal+=(d.total||0);else{oMap[k].pendingTotal+=(d.total||0);oMap[k].hasPending=true;}}
      if(k2&&k2!==k){if(!oMap[k2])oMap[k2]={total:0,paidTotal:0,pendingTotal:0,hasPending:false,orders:[]};
       oMap[k2].total+=(d.total||0);oMap[k2].orders.push(Object.assign({_id:doc.id},d));
       if(isCleared||isPd)oMap[k2].paidTotal+=(d.total||0);else{oMap[k2].pendingTotal+=(d.total||0);oMap[k2].hasPending=true;}}
     }
    });
    var tp=_kioskTablesCache2?Promise.resolve(_kioskTablesCache2)
     :_db.collection('filo_tables').where('dealerId','==',did).get().then(function(s){_kioskTablesCache2=s;return s;});
    tp.then(function(tSnap){
     var tables=tSnap.empty?Array.from({length:10},function(_,i){return {num:i+1,name:'테이블 '+(i+1),status:'empty'};})
      :tSnap.docs.map(function(d){var f=d.data();return {num:f.tableNum||1,name:f.tableName||'테이블',status:f.status||'empty'};})
       .sort(function(a,b){return a.num-b.num;}).filter(function(t,i,arr){return arr.findIndex(function(x){return x.num===t.num;})===i;});
     if(!window._kioskTablePage)window._kioskTablePage=0;
     var page=window._kioskTablePage;var chunk=tables.slice(page*5,(page+1)*5);
     bar.innerHTML='';
     if(tables.length>5){var pv=document.createElement('button');pv.textContent='◀';pv.style.cssText='padding:4px 8px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer';pv.onclick=function(){window._kioskTablePage=Math.max(0,page-1);_loadKioskTableBar(did);};bar.appendChild(pv);}
     chunk.forEach(function(t){
      var ord=oMap[String(t.num)]||oMap[t.name];
      var hasOrder=ord&&ord.total>0;var dispPaid=ord?ord.paidTotal:0;var dispPending=ord?Math.max(0,ord.total-dispPaid):0;var isPaid=hasOrder&&dispPending<=0&&dispPaid>0;
      var bg=isPaid?'rgba(99,102,241,.2)':hasOrder?'rgba(251,191,36,.18)':'var(--surface2)';
      var borderC=isPaid?'#6366f1':hasOrder?'#f59e0b':'var(--bd)';
      var btn=document.createElement('button');
      btn.style.cssText='padding:5px 10px;background:'+bg+';border:1.5px solid '+borderC+';border-radius:10px;font-size:11px;font-weight:800;cursor:pointer;line-height:1.5;text-align:center;min-width:70px;color:var(--tx)';
      var dH='<div style="font-size:12px;font-weight:800">'+esc(t.name)+'</div>';
      if(hasOrder){if(dispPending>0)dH+='<div style="font-size:10px;color:#fbbf24">₩'+dispPending.toLocaleString()+'</div>';if(isPaid)dH+='<div style="font-size:10px;color:#818cf8">전액결제</div>';}
      else dH+='<div style="font-size:10px;color:var(--t3);font-weight:600">비어있음</div>';
      btn.innerHTML=dH;
      (function(table,order){btn.onclick=function(){
       window._selectedTableId=table.num;window._selectedTableName=table.name;
       document.querySelectorAll('#kiosk-table-bar button[data-sel]').forEach(function(b){b.removeAttribute('data-sel');b.style.outline='';});
       btn.setAttribute('data-sel','1');btn.style.outline='2px solid #0891b2';
       var cartTitle=document.querySelector('.cart-panel div:first-child');if(cartTitle)cartTitle.textContent=table.name+' 주문';
       if(order&&order.orders&&order.orders.length)_filoTableOrderModal(did,table,order);
      };})(t,ord||null);
      bar.appendChild(btn);
     });
     if(tables.length>5){var nx=document.createElement('button');nx.textContent='▶';nx.style.cssText='padding:4px 8px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer';nx.onclick=function(){window._kioskTablePage=Math.min(Math.ceil(tables.length/5)-1,page+1);_loadKioskTableBar(did);};bar.appendChild(nx);}
    });
   });
}

// ── 메뉴 로드 공통 (플로어/클래식 공용) ────────────────────────────────────
function _loadKioskMenusForEl(did){
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
  catEl.innerHTML='<button onclick="_filoFilterKiosk(&quot;전체&quot;,this)" class="pos-cat-btn pos-cat-active">전체</button>'+
  cats.map(function(c){return '<button onclick="_filoFilterKiosk(this.dataset.cat,this)" data-cat="'+esc(c)+'" class="pos-cat-btn">'+esc(c)+'</button>';}).join('');
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
  catEl.innerHTML='<button onclick="_filoFilterKiosk(&quot;전체&quot;,this)" class="pos-cat-btn pos-cat-active">전체</button>'+
  cats.map(function(c){return '<button onclick="_filoFilterKiosk(this.dataset.cat,this)" data-cat="'+esc(c)+'" class="pos-cat-btn">'+esc(c)+'</button>';}).join('');
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
 document.querySelectorAll('#kiosk-cats .pos-cat-btn').forEach(function(b){
  b.classList.toggle('pos-cat-active',b===btn);
 });
 document.querySelectorAll('#kiosk-menu .menu-item').forEach(function(el){
  el.classList.toggle('pos-hidden',cat!=='전체'&&el.dataset.cat!==cat);
 });
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
 hdr.style.cssText='flex-shrink:0;padding:14px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e2e8f0;background:#f8fafc';

 var tabBar=document.createElement('div');tabBar.id='cust-tabbar';
 tabBar.style.cssText='flex-shrink:0;display:none;border-bottom:1px solid #e2e8f0;background:#f8fafc';

 var content=document.createElement('div');content.id='cust-content';
 content.style.cssText='flex:1;overflow-y:auto;padding:20px';

 var foot=document.createElement('div');foot.id='cust-foot';
 foot.style.cssText='flex-shrink:0;border-top:1px solid #e2e8f0;background:#ffffff';

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
  '<div style="font-size:15px;font-weight:900;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(tblLabel)+'</div>'+
  '</div>'+
  payBtn+
  '<button id="cust-touch-toggle" style="background:'+(_posCustTouchMode?'rgba(201,168,76,.2)':'#f8fafc')+';border:1px solid '+(_posCustTouchMode?'rgba(229,25,107,.5)':'#e2e8f0')+';border-radius:10px;color:'+(_posCustTouchMode?'#c9a84c':'#64748b')+';font-size:12px;font-weight:700;cursor:pointer;padding:8px 12px;white-space:nowrap">'+(_posCustTouchMode?'터치 ON':'터치 OFF')+'</button>'+
  '<button id="cust-close" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;color:#475569;font-size:12px;font-weight:700;cursor:pointer;padding:8px 12px;white-space:nowrap">닫기</button>';
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
 tb.style.cssText='flex-shrink:0;display:flex;border-bottom:1px solid #e2e8f0;background:#f8fafc';
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
  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f1f5f9">'+
   '<div style="flex:1;min-width:0">'+
   '<div style="font-size:16px;font-weight:800;color:#e2e8f0;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(c.name)+'</div>'+
   '<div style="font-size:13px;color:#64748b">₩'+c.price.toLocaleString()+' × '+c.qty+'</div></div>'+
   '<div style="display:flex;align-items:center;gap:10px">'+
   (_posCustTouchMode?
    '<div style="display:flex;align-items:center;gap:8px">'+
    '<button onclick="_posCustChangeQty(\''+esc(c.id)+'\',-1)" style="width:30px;height:30px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#1e293b;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">−</button>'+
    '<span style="font-size:16px;font-weight:800;min-width:18px;text-align:center">'+c.qty+'</span>'+
    '<button onclick="_posCustChangeQty(\''+esc(c.id)+'\',1)" style="width:30px;height:30px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#1e293b;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>'+
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
   html+='<div onclick="_posCustAddItem(\''+esc(m.id)+'\')" style="border-radius:12px;overflow:hidden;cursor:pointer;border:1px solid #e2e8f0">'+
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