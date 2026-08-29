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
   'style="padding:4px 12px;border-radius:20px;border:1px solid #ddd;font-size:11px;cursor:pointer;background:'+(mode==='simple'?'#0066ff':'#f1f5f9')+';color:'+(mode==='simple'?'#fff':'#333')+'">'+
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
 '<div style="padding:10px 12px;border-bottom:1px solid var(--bd);display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0" id="kiosk-cats"></div>'+
 '<div class="menu-grid" id="kiosk-menu">'+
 '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--t3);display:flex;align-items:center;justify-content:center;gap:10px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>메뉴 로딩 중...</div>'+
 '</div></div>'+
 '<div class="cart-panel">'+
 '<div style="padding:14px 16px;border-bottom:1px solid var(--bd);font-size:14px;font-weight:900">주문 내역</div>'+
 '<div id="cart-list" style="flex:1;overflow-y:auto"></div>'+
 '<div style="padding:14px 16px;border-top:1px solid var(--bd)">'+
 '<div style="display:flex;justify-content:space-between;margin-bottom:10px">'+
 '<span style="font-size:13px;font-weight:700">합계</span>'+
 '<span id="cart-total" style="font-size:18px;font-weight:900;color:#22c55e">₩0</span></div>'+
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
  if(_filoPosMode()==='simple') _filoRenderKioskSimple(menus);
  else _filoRenderKiosk(menus);
 }).catch(function(e){
  var menuEl=document.getElementById('kiosk-menu');
  if(menuEl) menuEl.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--red);display:flex;flex-direction:column;align-items:center;gap:8px"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>메뉴 로드 실패: '+e.message+'</div>';
 });
}


function _filoRenderKiosk(menus){
 var cats=[...new Set(menus.map(function(m){return m.category||'기타';}))];
 var catEl=document.getElementById('kiosk-cats');
 if(catEl){
 catEl.innerHTML='<button onclick="_filoFilterKiosk(&quot;전체&quot;,this)" class="btn btn-sm" style="border-radius:100px;background:#c9a84c;color:#0f172a;font-weight:800;border:none">전체</button>'+
 cats.map(function(c){return '<button onclick="_filoFilterKiosk(this.dataset.cat,this)" data-cat="'+c+'" class="btn btn-sm" style="border-radius:100px;background:#F1F5F9;color:#475569;font-weight:700;border:1.5px solid rgba(0,0,0,.08)">'+c+'</button>';}).join('');
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
 '<div style="font-size:12px;font-weight:800;margin-bottom:4px;letter-spacing:-.2px;line-height:1.35;word-break:keep-all;overflow-wrap:break-word;color:#1a1a2e">'+esc(m.name)+'</div>'+
 '<div style="font-size:13px;font-weight:900;color:#059669;letter-spacing:-.3px;margin-top:auto">₩'+m.price.toLocaleString()+'</div>'+
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
  catEl.innerHTML='<button onclick="_filoFilterKiosk(&quot;전체&quot;,this)" class="btn btn-sm" style="border-radius:100px;background:#c9a84c;color:#0f172a;font-weight:800;border:none">전체</button>'+
  cats.map(function(c){return '<button onclick="_filoFilterKiosk(this.dataset.cat,this)" data-cat="'+c+'" class="btn btn-sm" style="border-radius:100px;background:#F1F5F9;color:#475569;font-weight:700;border:1.5px solid rgba(0,0,0,.08)">'+c+'</button>';}).join('');
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
   return '<div class="menu-item pop-in stagger-'+Math.min(i+1,4)+'" data-cat="'+(m.category||'기타')+'" data-id="'+m._id+'" data-name="'+esc(m.name)+'" data-price="'+m.price+'" onclick="_cartAddFromEl(this)" style="background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;cursor:pointer;display:block">'+
   imgHtml+
   '<div style="padding:10px 12px 12px">'+
   '<div style="font-size:14px;font-weight:800;color:#1a1a2e;line-height:1.35;margin-bottom:4px;word-break:keep-all">'+esc(m.name)+'</div>'+
   '<div style="font-size:16px;font-weight:900;color:#059669">₩'+m.price.toLocaleString()+'</div>'+
   (m.stock!=null?'<div style="font-size:10px;color:#94a3b8;margin-top:3px;font-weight:700">재고 '+m.stock+'</div>':'')+
   '</div></div>';
  }).join('');
 }
 window._kioskMenus=menus;
}


function _filoFilterKiosk(cat,btn){
 document.querySelectorAll('#kiosk-cats .btn').forEach(function(b){
  b.style.background=b===btn?'#c9a84c':'#F1F5F9';
  b.style.color=b===btn?'#0f172a':'#475569';
  b.style.border=b===btn?'none':'1.5px solid rgba(0,0,0,.08)';
  b.style.fontWeight=b===btn?'800':'700';
 });
 /* pos-hidden 클래스로 토글 — display:flex!important CSS를 클래스로 우선 순위 확보 */
 document.querySelectorAll('#kiosk-menu .menu-item').forEach(function(el){
  el.classList.toggle('pos-hidden',cat!=='전체'&&el.dataset.cat!==cat);
 });
}

