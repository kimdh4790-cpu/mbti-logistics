/**
 * @module filo-inventory.js
 * 재고 현황 · 발주 · 입고 처리
 * 컬렉션: inventory / inventory_orders / inventory_in / inventory_out
 */
// 의존성: filo-common.js

function _filoPageInventory(el){ _filoPageInventoryDash(el); }

// ── 메인 재고 페이지 ──────────────────────────────────────────────────────────
function _filoPageInventoryDash(el){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">로그인 후 이용하세요</div>';return;}

 el.innerHTML=
  '<div style="max-width:700px;margin:0 auto" class="slide-up">'+
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
  '<div style="font-size:17px;font-weight:900;color:var(--tx)">재고 현황</div>'+
  '<div style="display:flex;gap:8px">'+
  '<button onclick="_filoInvAutoOrder(\''+did+'\')" id="inv-auto-btn" style="padding:7px 14px;background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">자동발주</button>'+
  '<button onclick="_filoInvAddModal(\''+did+'\')" style="padding:7px 14px;background:var(--br,#0891b2);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">+ 등록</button>'+
  '</div></div>'+
  /* KPI 3칸 */
  '<div id="inv-kpi" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px"></div>'+
  /* 탭 */
  '<div style="display:flex;border-bottom:2px solid var(--bd);margin-bottom:14px">'+
  '<button id="inv-tab-stock" onclick="_filoInvSwitchTab(\'stock\',\''+did+'\')" style="flex:1;padding:9px;font-size:13px;font-weight:700;background:none;border:none;cursor:pointer;color:var(--tx);border-bottom:2px solid var(--br,#0891b2);margin-bottom:-2px">재고현황</button>'+
  '<button id="inv-tab-order" onclick="_filoInvSwitchTab(\'order\',\''+did+'\')" style="flex:1;padding:9px;font-size:13px;font-weight:700;background:none;border:none;cursor:pointer;color:var(--t3)">발주현황 <span id="inv-order-badge" style="display:none;background:#f59e0b;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;vertical-align:middle"></span></button>'+
  '</div>'+
  '<div id="inv-list"><div style="text-align:center;padding:40px;color:var(--t3)">로딩 중...</div></div>'+
  '</div>';

 _filoInvLoad(did);
}

// ── 탭 전환 ──────────────────────────────────────────────────────────────────
window._filoInvSwitchTab=function(tab,did){
 var ts=document.getElementById('inv-tab-stock');
 var to=document.getElementById('inv-tab-order');
 if(ts){ts.style.color=tab==='stock'?'var(--tx)':'var(--t3)';ts.style.borderBottom=tab==='stock'?'2px solid var(--br,#0891b2)':'none';}
 if(to){to.style.color=tab==='order'?'var(--tx)':'var(--t3)';to.style.borderBottom=tab==='order'?'2px solid var(--br,#0891b2)':'none';}
 if(tab==='stock') _filoInvLoad(did);
 else _filoInvLoadOrders(did);
};

// ── 재고 로드 ─────────────────────────────────────────────────────────────────
var _invAllItems=[];
function _filoInvLoad(did){
 var list=document.getElementById('inv-list');
 if(list) list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">로딩 중...</div>';
 firebase.firestore().collection('inventory').where('dealerId','==',did)
  .orderBy('name').get()
 .then(function(snap){
  _invAllItems=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
  _invAllItems.sort(function(a,b){
   var ra=(a.minStock>0)?(a.stock||0)/a.minStock:2;
   var rb=(b.minStock>0)?(b.stock||0)/b.minStock:2;
   return ra-rb;
  });
  _filoInvRender(_invAllItems,did);
 }).catch(function(e){
  var l=document.getElementById('inv-list');
  if(l) l.innerHTML='<div style="text-align:center;padding:30px;color:#ef4444">'+e.message+'</div>';
 });
}

// ── 부족 / 양호 두 섹션으로 렌더 ─────────────────────────────────────────────
function _filoInvRender(items,did){
 var low=[],ok=[];
 items.forEach(function(it){
  var s=it.stock||0,m=it.minStock||0;
  if(m>0&&s<=m) low.push(it);
  else ok.push(it);
 });

 /* KPI */
 var kpi=document.getElementById('inv-kpi');
 if(kpi) kpi.innerHTML=
  '<div style="text-align:center;padding:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:12px">'+
  '<div style="font-size:22px;font-weight:900;color:#ef4444">'+low.filter(function(i){return (i.stock||0)<=0;}).length+'</div>'+
  '<div style="font-size:10px;color:var(--t3);margin-top:2px">재고 없음</div></div>'+
  '<div style="text-align:center;padding:12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:12px">'+
  '<div style="font-size:22px;font-weight:900;color:#f59e0b">'+low.filter(function(i){return (i.stock||0)>0;}).length+'</div>'+
  '<div style="font-size:10px;color:var(--t3);margin-top:2px">부족 임박</div></div>'+
  '<div style="text-align:center;padding:12px;background:rgba(5,150,105,.08);border:1px solid rgba(5,150,105,.2);border-radius:12px">'+
  '<div style="font-size:22px;font-weight:900;color:#059669">'+ok.length+'</div>'+
  '<div style="font-size:10px;color:var(--t3);margin-top:2px">정상</div></div>';

 /* 자동발주 버튼 뱃지 */
 var autoBtn=document.getElementById('inv-auto-btn');
 if(autoBtn) autoBtn.textContent=low.length?'자동발주 ('+low.length+')':'자동발주';

 var list=document.getElementById('inv-list');
 if(!list) return;
 if(!items.length){
  list.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)">등록된 재료가 없습니다<br><span style="font-size:12px;margin-top:6px;display:block">+ 등록 버튼으로 추가하세요</span></div>';
  return;
 }

 function itemCard(it,isLow){
  var s=it.stock||0,m=it.minStock||0;
  var pct=m>0?Math.min(Math.round(s/m*100),100):100;
  var dotColor=s<=0?'#ef4444':isLow?'#f59e0b':'#059669';
  var barColor=s<=0?'#ef4444':isLow?'#f59e0b':'#22c55e';
  var phone=it.supplierPhone||'';
  var cardBg=isLow?'#fff8f8':'#fff';
  var cardBorder=isLow?'#fecaca':'#e5e7eb';
  return '<div style="padding:12px 14px;background:'+cardBg+';border:1px solid '+cardBorder+';border-radius:14px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,.06)">'+
   /* 1행: 상태점 이름 수정버튼 */
   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'+
   '<div style="width:9px;height:9px;border-radius:50%;background:'+dotColor+';flex-shrink:0"></div>'+
   '<div style="font-size:14px;font-weight:800;flex:1;color:#111">'+esc(it.name||'—')+'</div>'+
   '<button onclick="_filoInvEditModal(\''+it.id+'\',\''+did+'\')" style="font-size:10px;padding:3px 8px;border:1px solid #d1d5db;border-radius:6px;background:#f9fafb;color:#6b7280;cursor:pointer">수정</button>'+
   '</div>'+
   /* 2행: 진행바 + 수량 + +/- */
   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:'+(isLow?'10':'0')+'px">'+
   '<div style="flex:1;background:#f3f4f6;border-radius:6px;height:7px;overflow:hidden">'+
   '<div style="background:'+barColor+';width:'+pct+'%;height:100%;border-radius:6px;transition:width .6s"></div></div>'+
   '<div style="font-size:12px;color:#6b7280;white-space:nowrap">'+s+'<span style="color:#d1d5db">/</span>'+m+(it.unit||'개')+'</div>'+
   '<button onclick="_filoInvAdjust(\''+it.id+'\',\''+did+'\',-1)" style="width:30px;height:30px;border-radius:8px;background:#fee2e2;color:#ef4444;border:1px solid #fecaca;font-size:16px;cursor:pointer;line-height:1;font-weight:700">−</button>'+
   '<button onclick="_filoInvAdjust(\''+it.id+'\',\''+did+'\',1)" style="width:30px;height:30px;border-radius:8px;background:#dcfce7;color:#16a34a;border:1px solid #bbf7d0;font-size:16px;cursor:pointer;line-height:1;font-weight:700">+</button>'+
   '</div>'+
   (isLow?
    '<div style="border-top:1px solid #f3f4f6;padding-top:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">'+
    '<div style="flex:1;min-width:0">'+
    (it.supplier?'<div style="font-size:11px;color:#6b7280">거래처: <b style="color:#111">'+esc(it.supplier)+'</b></div>':'<div style="font-size:11px;color:#f59e0b">거래처 미등록 — 수정에서 추가</div>')+
    (phone?'<div style="font-size:11px;color:#9ca3af">'+phone+'</div>':'')+
    '</div>'+
    '<button onclick="_filoInvOrderInline(\''+it.id+'\',\''+did+'\')" style="padding:6px 12px;background:#fef3c7;color:#d97706;border:1px solid #fde68a;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">발주</button>'+
    '<button onclick="_filoInvSendPush(\''+it.id+'\',\''+did+'\')" style="padding:6px 12px;background:#ede9fe;color:#7c3aed;border:1px solid #ddd6fe;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">앱푸시</button>'+
    '</div>':'')+
   '</div>';
 }

 function navBtn(fn,pg,label,disabled){
  return '<button onclick="'+fn+'('+pg+')" '+(disabled?'disabled':'')+
   ' style="padding:6px 14px;border:1px solid #e5e7eb;border-radius:8px;background:'+(disabled?'#f9fafb':'#fff')+';color:'+(disabled?'#d1d5db':'#374151')+';font-size:12px;cursor:'+(disabled?'default':'pointer')+'">'+label+'</button>';
 }

 function renderSection(arr,isLow,pgGlobal,label,dotColor,pgFn){
  if(!arr.length) return '';
  var PAGE=5, pages=Math.ceil(arr.length/PAGE);
  var pg=Math.min(pgGlobal,pages-1);
  var slice=arr.slice(pg*PAGE,(pg+1)*PAGE);
  var cards=slice.map(function(it){return itemCard(it,isLow);}).join('');
  var nav=pages>1?
   '<div style="display:flex;align-items:center;justify-content:space-between;margin:8px 0 4px">'+
   navBtn(pgFn,pg-1,'이전',pg===0)+
   '<span style="font-size:12px;color:#6b7280">'+(pg+1)+' / '+pages+'</span>'+
   navBtn(pgFn,pg+1,'다음',pg===pages-1)+
   '</div>':'';
  return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'+
   '<div style="width:10px;height:10px;border-radius:50%;background:'+dotColor+'"></div>'+
   '<div style="font-size:13px;font-weight:800;color:'+dotColor+'">'+label+' · '+arr.length+'건</div>'+
   '</div>'+cards+nav;
 }

 var lowPg=0, okPg=0;
 function doRender(){
  var html='';
  if(low.length) html+=renderSection(low,true,lowPg,'부족','#ef4444','_invLowPage');
  if(ok.length) html+='<div style="margin-top:'+(low.length?'18':'0')+'px">'+renderSection(ok,false,okPg,'양호','#059669','_invOkPage')+'</div>';
  list.innerHTML=html||'<div style="text-align:center;padding:40px;color:#9ca3af">등록된 재료가 없습니다</div>';
 }
 window._invLowPage=function(pg){
  var pages=Math.ceil(low.length/5);
  if(pg<0||pg>=pages)return;
  lowPg=pg; doRender();
 };
 window._invOkPage=function(pg){
  var pages=Math.ceil(ok.length/5);
  if(pg<0||pg>=pages)return;
  okPg=pg; doRender();
 };
 doRender();
}

// ── +/- 수량 입력 팝업 ────────────────────────────────────────────────────────
window._filoInvAdjust=function(itemId,did,delta){
 var ex=document.getElementById('inv-adj-pop'); if(ex) ex.remove();
 var it=_invAllItems.find(function(x){return x.id===itemId;})||{};
 var m=document.createElement('div');
 m.id='inv-adj-pop';
 m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end';
 m.innerHTML='<div class="card" style="width:100%;border-radius:20px 20px 0 0;padding:24px">'+
  '<div style="font-size:15px;font-weight:900;margin-bottom:4px">'+(delta>0?'입고 등록':'출고 등록')+'</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-bottom:16px">'+esc(it.name||'')+'  현재 '+(it.stock||0)+(it.unit||'개')+'</div>'+
  '<input id="inv-adj-qty" type="number" value="1" min="1" placeholder="수량 입력" '+
   'style="width:100%;box-sizing:border-box;padding:14px;border:1px solid var(--bd);border-radius:12px;background:var(--bg);color:var(--tx);font-size:22px;font-weight:900;text-align:center;margin-bottom:14px">'+
  '<div style="display:flex;gap:8px">'+
  '<button onclick="document.getElementById(\'inv-adj-pop\').remove()" '+
   'style="flex:1;padding:13px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">취소</button>'+
  '<button onclick="_filoInvDoAdj(\''+itemId+'\',\''+did+'\','+delta+')" '+
   'style="flex:2;padding:13px;background:'+(delta>0?'#22c55e':'#ef4444')+';color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer">'+(delta>0?'입고 확인':'출고 확인')+'</button>'+
  '</div></div>';
 document.body.appendChild(m);
 setTimeout(function(){var inp=document.getElementById('inv-adj-qty');if(inp){inp.focus();inp.select();}},80);
};

window._filoInvDoAdj=function(itemId,did,delta){
 var qty=parseInt((document.getElementById('inv-adj-qty')||{}).value||'1')||1;
 var ref=firebase.firestore().collection('inventory').doc(itemId);
 ref.get().then(function(doc){
  if(!doc.exists)return;
  var next=Math.max(0,(doc.data().stock||0)+(delta>0?qty:-qty));
  var now=new Date().toISOString();
  var batch=firebase.firestore().batch();
  batch.update(ref,{stock:next,updatedAt:now});
  batch.set(firebase.firestore().collection(delta>0?'inventory_in':'inventory_out').doc(),{
   dealerId:did,itemId:itemId,qty:qty,
   type:delta>0?'adjust_in':'adjust_out',
   createdAt:now,date:now.slice(0,10),
   createdBy:(_CU&&(_CU.name||_CU.userId))||''
  });
  return batch.commit();
 }).then(function(){
  var p=document.getElementById('inv-adj-pop'); if(p) p.remove();
  _filoInvLoad(did);
 }).catch(function(e){_filoToast(e.message);});
};

// ── 앱푸시 알림 발송 ─────────────────────────────────────────────────────────
window._filoInvSendPush=function(itemId,did){
 var it=_invAllItems.find(function(x){return x.id===itemId;});
 if(!it){_filoToast('항목을 찾을 수 없습니다');return;}
 var storeName=(_cachedCompanyDoc||{}).name||'매장';
 var needed=Math.max(1,(it.minStock||5)*2-(it.stock||0));
 var title='[재고부족] '+it.name;
 var body=storeName+' '+it.name+' 재고 '+(it.stock||0)+(it.unit||'개') +' — 발주 '+needed+(it.unit||'개')+' 필요';
 (_auth&&_auth.currentUser?_auth.currentUser.getIdToken():Promise.resolve(''))
 .then(function(token){
  return fetch('/api/inv-notify',{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
   body:JSON.stringify({did:did,title:title,body:body,itemId:itemId})
  });
 }).then(function(r){return r.json();})
 .then(function(d){
  if(d.ok) _filoToast('앱 푸시 알림 발송 완료 ('+d.sent+'건)');
  else _filoToast('발송 실패: '+(d.error||'FCM 토큰 없음'));
 }).catch(function(e){_filoToast('오류: '+e.message);});
};

// ── 발주 팝업 ────────────────────────────────────────────────────────────────
window._filoInvOrderInline=function(itemId,did){
 var it=_invAllItems.find(function(x){return x.id===itemId;});
 if(!it){_filoToast('항목을 찾을 수 없습니다');return;}
 var needed=Math.max(1,(it.minStock||5)*2-(it.stock||0));
 var ex=document.getElementById('inv-order-pop'); if(ex) ex.remove();
 var m=document.createElement('div');
 m.id='inv-order-pop';
 m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end';
 m.innerHTML='<div class="card" style="width:100%;border-radius:20px 20px 0 0;padding:24px">'+
  '<div style="font-size:15px;font-weight:900;margin-bottom:4px">'+esc(it.name||'')+'</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-bottom:16px">현재 '+(it.stock||0)+(it.unit||'개')+' / 최소 '+(it.minStock||0)+(it.unit||'개')+'</div>'+
  '<div style="display:flex;flex-direction:column;gap:10px">'+
  '<div><label style="font-size:12px;color:var(--t3);display:block;margin-bottom:4px">발주 수량</label>'+
  '<input id="iop-qty" type="number" value="'+needed+'" min="1" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:15px;font-weight:700"></div>'+
  '<div><label style="font-size:12px;color:var(--t3);display:block;margin-bottom:4px">공급처</label>'+
  '<input id="iop-supplier" value="'+esc(it.supplier||'')+'" placeholder="공급처명" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px"></div>'+
  '<div><label style="font-size:12px;color:var(--t3);display:block;margin-bottom:4px">메모</label>'+
  '<input id="iop-memo" placeholder="메모" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px"></div>'+
  '</div>'+
  '<div style="display:flex;gap:8px;margin-top:16px">'+
  '<button onclick="document.getElementById(\'inv-order-pop\').remove()" style="flex:1;padding:13px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">취소</button>'+
  '<button onclick="_filoInvDoOrder(\''+itemId+'\',\''+did+'\',\''+esc(it.name||'')+'\')" style="flex:2;padding:13px;background:#f59e0b;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer">발주 등록</button>'+
  '</div></div>';
 document.body.appendChild(m);
};

window._filoInvDoOrder=function(itemId,did,itemName){
 var qty=parseInt((document.getElementById('iop-qty')||{}).value||'0')||0;
 var supplier=(document.getElementById('iop-supplier')||{}).value||'';
 var memo=(document.getElementById('iop-memo')||{}).value||'';
 if(qty<1){_filoToast('수량을 입력하세요');return;}
 var now=new Date();
 var due=new Date(now); due.setDate(due.getDate()+3);
 firebase.firestore().collection('inventory_orders').add({
  dealerId:did,itemId:itemId,itemName:itemName,
  orderQty:qty,supplier:supplier,memo:memo,status:'pending',
  createdAt:now.toISOString(),dueDate:due.toISOString().slice(0,10),
  createdBy:(_CU&&(_CU.name||_CU.userId))||''
 }).then(function(){
  _filoToast(esc(itemName)+' 발주 등록 완료 ('+qty+'개)');
  var p=document.getElementById('inv-order-pop'); if(p) p.remove();
  _filoInvLoad(did);
 }).catch(function(e){_filoToast((e&&e.message)||'오류');});
};

// ── 자동 발주 ────────────────────────────────────────────────────────────────
window._filoInvAutoOrder=function(did){
 var low=_invAllItems.filter(function(it){return (it.stock||0)<=(it.minStock||0)&&(it.minStock||0)>0;});
 if(!low.length){_filoToast('발주가 필요한 재고가 없습니다');return;}
 var storeName=(_cachedCompanyDoc||{}).name||'매장';

 /* ── 확인 모달 ── */
 var ex=document.getElementById('inv-auto-pop'); if(ex) ex.remove();
 var pop=document.createElement('div');
 pop.id='inv-auto-pop';
 pop.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-end';

 var rows=low.map(function(it){
  var qty=Math.max(1,(it.minStock||5)*2-(it.stock||0));
  var hasPhone=!!(it.supplierPhone);
  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd)">'+
   '<div>'+
    '<div style="font-size:13px;font-weight:700;color:var(--tx)">'+esc(it.name||'—')+'</div>'+
    '<div style="font-size:11px;color:var(--t3)">'+
     (it.supplier?esc(it.supplier)+' ':'')+(hasPhone?'<span style="color:#22c55e">알림톡 발송</span>':'<span style="color:#f59e0b">번호 없음 — 저장만</span>')+
    '</div>'+
   '</div>'+
   '<div style="text-align:right">'+
    '<div style="font-size:13px;font-weight:900;color:#f59e0b">+'+qty+(it.unit||'개')+'</div>'+
    '<div style="font-size:10px;color:var(--t3)">현재 '+(it.stock||0)+(it.unit||'개')+'</div>'+
   '</div>'+
  '</div>';
 }).join('');

 var hasAlimtalk=low.some(function(it){return !!(it.supplierPhone);});
 pop.innerHTML='<div class="card" style="width:100%;border-radius:20px 20px 0 0;padding:24px;max-height:80vh;display:flex;flex-direction:column">'+
  '<div style="font-size:15px;font-weight:900;margin-bottom:4px">자동 발주 확인</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-bottom:14px">'+low.length+'개 품목'+(hasAlimtalk?' · 거래처 알림톡 발송':'')+'</div>'+
  '<div style="overflow-y:auto;flex:1;margin-bottom:14px">'+rows+'</div>'+
  '<div style="display:flex;gap:8px">'+
  '<button onclick="document.getElementById(\'inv-auto-pop\').remove()" '+
   'style="flex:1;padding:13px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">취소</button>'+
  '<button id="inv-auto-confirm-btn" onclick="_filoInvDoAutoOrder(\''+did+'\',\''+storeName+'\')" '+
   'style="flex:2;padding:13px;background:#f59e0b;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer">'+
   (hasAlimtalk?'발주 + 알림톡 발송':'발주 등록')+'</button>'+
  '</div></div>';
 document.body.appendChild(pop);
};

window._filoInvDoAutoOrder=function(did,storeName){
 var btn=document.getElementById('inv-auto-confirm-btn');
 if(btn){btn.disabled=true;btn.textContent='처리 중...';}
 var low=_invAllItems.filter(function(it){return (it.stock||0)<=(it.minStock||0)&&(it.minStock||0)>0;});
 var db=firebase.firestore(),batch=db.batch();
 var now=new Date(); var due=new Date(now); due.setDate(due.getDate()+3);
 var alimItems=[];
 low.forEach(function(it){
  var qty=Math.max(1,(it.minStock||5)*2-(it.stock||0));
  batch.set(db.collection('inventory_orders').doc(),{
   dealerId:did,itemId:it.id,itemName:it.name||'',
   orderQty:qty,supplier:it.supplier||'',memo:'자동 발주',status:'pending',isAuto:true,
   createdAt:now.toISOString(),dueDate:due.toISOString().slice(0,10),
   createdBy:(_CU&&(_CU.name||_CU.userId))||''
  });
  if(it.supplierPhone) alimItems.push({it:it,qty:qty});
 });
 batch.commit().then(function(){
  /* 알림톡 일괄 발송 */
  if(!alimItems.length){
   _filoToast('자동 발주 완료 ('+low.length+'건)');
   var p=document.getElementById('inv-auto-pop'); if(p) p.remove();
   _filoInvLoad(did);
   return;
  }
  return (_auth&&_auth.currentUser?_auth.currentUser.getIdToken():Promise.resolve(''))
  .then(function(token){
   return Promise.all(alimItems.map(function(obj){
    var it=obj.it,qty=obj.qty;
    var msg=storeName+'입니다. '+esc(it.name)+' '+qty+(it.unit||'개') +' 발주 부탁드립니다. 감사합니다.';
    return fetch('/api/send-alimtalk',{
     method:'POST',
     headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
     body:JSON.stringify({
      to:it.supplierPhone,
      templateCode:'KA01TP260623201607025LtxVxj2AoHI',
      fallbackText:msg,
      variables:{}
     })
    }).then(function(r){return r.json();}).catch(function(){return {ok:false};});
   }));
  }).then(function(results){
   var sent=results.filter(function(r){return r&&r.ok;}).length;
   _filoToast('자동 발주 완료 ('+low.length+'건) · 알림톡 '+sent+'/'+alimItems.length+'건 발송');
   var p=document.getElementById('inv-auto-pop'); if(p) p.remove();
   _filoInvLoad(did);
  });
 }).catch(function(e){
  _filoToast('오류: '+(e&&e.message)||'');
  if(btn){btn.disabled=false;btn.textContent='발주 + 알림톡 발송';}
 });
};

// ── 발주현황 탭 ──────────────────────────────────────────────────────────────
function _filoInvLoadOrders(did){
 var list=document.getElementById('inv-list');
 if(list) list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">로딩 중...</div>';
 firebase.firestore().collection('inventory_orders')
  .where('dealerId','==',did).where('status','==','pending')
  .orderBy('createdAt','desc').limit(50).get()
 .then(function(snap){
  var orders=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
  var badge=document.getElementById('inv-order-badge');
  if(badge){badge.textContent=orders.length;badge.style.display=orders.length?'inline':'none';}
  if(!list) return;
  if(!orders.length){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)">대기 중인 발주 없음</div>';return;}
  list.innerHTML=orders.map(function(o){
   return '<div style="padding:14px;background:var(--b2,rgba(255,255,255,.04));border:1px solid var(--bd);border-radius:14px;margin-bottom:8px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'+
    '<div style="font-size:14px;font-weight:800;color:var(--tx)">'+esc(o.itemName||'—')+'</div>'+
    '<button onclick="_filoInvConfirmReceive(\''+o.id+'\',\''+o.itemId+'\','+o.orderQty+',\''+esc(o.itemName||'')+'\',\''+did+'\')" style="padding:6px 14px;background:rgba(34,197,94,.15);color:#22c55e;border:1px solid rgba(34,197,94,.3);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">입고 완료</button>'+
    '</div>'+
    '<div style="font-size:12px;color:var(--t3)">발주 '+o.orderQty+'개'+(o.supplier?' · '+esc(o.supplier):'')+(o.dueDate?' · 예정: '+o.dueDate:'')+(o.isAuto?' · 자동':'')+
    '</div></div>';
  }).join('');
 }).catch(function(e){if(list) list.innerHTML='<div style="text-align:center;padding:30px;color:#ef4444">'+e.message+'</div>';});
}

// ── 입고 완료 ────────────────────────────────────────────────────────────────
window._filoInvConfirmReceive=function(orderId,itemId,qty,itemName,did){
 if(!confirm(esc(itemName)+' '+qty+'개 입고 완료 처리하시겠습니까?'))return;
 var db=firebase.firestore(),now=new Date().toISOString();
 var batch=db.batch();
 batch.update(db.collection('inventory_orders').doc(orderId),{status:'done',receivedAt:now});
 batch.update(db.collection('inventory').doc(itemId),{stock:firebase.firestore.FieldValue.increment(qty),updatedAt:now});
 batch.set(db.collection('inventory_in').doc(),{
  dealerId:did,itemId:itemId,itemName:itemName,qty:qty,type:'incoming',
  createdAt:now,date:now.slice(0,10),
  createdBy:(_CU&&(_CU.name||_CU.userId))||''
 });
 batch.commit().then(function(){
  _filoToast(esc(itemName)+' 입고 완료 (+'+qty+'개)');
  _filoInvLoadOrders(did);
 }).catch(function(e){_filoToast((e&&e.message)||'오류');});
};

// ── 재료 등록 모달 (거래처 전화번호 포함) ────────────────────────────────────
window._filoInvAddModal=function(did){
 _filoInvFormModal(did,null);
};

window._filoInvEditModal=function(itemId,did){
 var it=_invAllItems.find(function(x){return x.id===itemId;});
 _filoInvFormModal(did,it);
};

function _filoInvFormModal(did,it){
 var isEdit=!!it;
 var ex=document.getElementById('inv-form-modal'); if(ex) ex.remove();
 var m=document.createElement('div');
 m.id='inv-form-modal';
 m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end';
 var inp=function(id,ph,val,type){
  return '<input id="'+id+'" type="'+(type||'text')+'" placeholder="'+ph+'" value="'+(val||'')+'" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px">';
 };
 m.innerHTML='<div class="card" style="width:100%;border-radius:20px 20px 0 0;padding:24px;max-height:90vh;overflow-y:auto">'+
  '<div style="font-size:15px;font-weight:900;margin-bottom:16px">'+(isEdit?'재료 수정':'재료 등록')+'</div>'+
  '<div style="display:flex;flex-direction:column;gap:12px">'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">재료명 *</label>'+inp('ifm-name','재료명',it&&it.name)+'</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">현재 수량</label>'+inp('ifm-stock','0',it&&it.stock,'number')+'</div>'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">최소 재고 (알림 기준)</label>'+inp('ifm-min','5',it&&it.minStock,'number')+'</div>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">단위</label>'+inp('ifm-unit','개/kg/L',it&&it.unit)+'</div>'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">단가 (원)</label>'+inp('ifm-price','0',it&&it.unitPrice,'number')+'</div>'+
  '</div>'+
  /* 거래처 정보 - 구분선 */
  '<div style="border-top:1px solid var(--bd);padding-top:12px;margin-top:2px">'+
  '<div style="font-size:11px;font-weight:700;color:var(--t3);margin-bottom:8px">거래처 정보 <span style="font-weight:400">(자동발주 알림톡 발송 번호)</span></div>'+
  '<div style="display:flex;flex-direction:column;gap:10px">'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">거래처명</label>'+inp('ifm-supplier','예: 한국식품',it&&it.supplier)+'</div>'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">거래처 전화번호 <span style="color:#38bdf8">(알림톡 발송 번호)</span></label>'+inp('ifm-phone','010-0000-0000',it&&it.supplierPhone)+'</div>'+
  '</div></div>'+
  '</div>'+
  '<div style="display:flex;gap:8px;margin-top:16px">'+
  '<button onclick="document.getElementById(\'inv-form-modal\').remove()" style="flex:1;padding:13px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">취소</button>'+
  '<button onclick="_filoInvDoSave(\''+did+'\','+(isEdit?'\''+it.id+'\'':'null')+')" style="flex:2;padding:13px;background:var(--br,#0891b2);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer">'+(isEdit?'저장':'등록')+'</button>'+
  '</div></div>';
 document.body.appendChild(m);
 setTimeout(function(){var n=document.getElementById('ifm-name');if(n)n.focus();},50);
}

window._filoInvDoSave=function(did,itemId){
 var name=(document.getElementById('ifm-name')||{}).value||'';
 var stock=parseInt((document.getElementById('ifm-stock')||{}).value||'0')||0;
 var min=parseInt((document.getElementById('ifm-min')||{}).value||'5')||5;
 var unit=(document.getElementById('ifm-unit')||{}).value||'개';
 var price=parseInt((document.getElementById('ifm-price')||{}).value||'0')||0;
 var supplier=(document.getElementById('ifm-supplier')||{}).value||'';
 var phone=(document.getElementById('ifm-phone')||{}).value||'';
 if(!name.trim()){_filoToast('재료명을 입력하세요');return;}
 var data={name:name.trim(),stock:stock,minStock:min,unit:unit,unitPrice:price,supplier:supplier,supplierPhone:phone,updatedAt:new Date().toISOString()};
 var db=firebase.firestore();
 var p=itemId
  ?db.collection('inventory').doc(itemId).update(data)
  :db.collection('inventory').add(Object.assign({dealerId:did,createdAt:new Date().toISOString()},data));
 p.then(function(){
  _filoToast(itemId?'수정 완료':'등록 완료');
  var mo=document.getElementById('inv-form-modal'); if(mo) mo.remove();
  _filoInvLoad(did);
 }).catch(function(e){_filoToast((e&&e.message)||'오류');});
};

/* 구 호환 */
function _filoPageStockIn(el){ _filoPageInventoryDash(el); }
function _filoPageStockOut(el){ _filoPageInventoryDash(el); }
