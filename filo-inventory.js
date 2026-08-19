/**
 * @module filo-inventory.js
 * 재고 현황 · 발주 · 입고 처리
 * 컬렉션: inventory / inventory_orders / inventory_in / inventory_out
 */
// 의존성: filo-common.js

// _filoPageInventory → 신규 대시보드로 리다이렉트
function _filoPageInventory(el){ _filoPageInventoryDash(el); }

// ── 메인 재고 페이지 (탭: 재고현황 / 발주현황) ────────────────────────────────
function _filoPageInventoryDash(el){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">로그인 후 이용하세요</div>';return;}

 el.innerHTML=
  '<div style="max-width:700px;margin:0 auto" class="slide-up">'+
  /* 헤더 */
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
  '<div style="font-size:17px;font-weight:900;color:var(--tx)">재고 현황</div>'+
  '<div style="display:flex;gap:8px">'+
  '<button onclick="_filoInvAutoOrder(\''+did+'\')" id="inv-auto-btn" style="padding:7px 14px;background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">자동발주</button>'+
  '<button onclick="_filoInvAddModal(\''+did+'\')" style="padding:7px 14px;background:var(--br,#0891b2);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">+ 등록</button>'+
  '</div></div>'+
  /* 상태 요약 3칸 */
  '<div id="inv-kpi" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px"></div>'+
  /* 탭 */
  '<div style="display:flex;border-bottom:2px solid var(--bd);margin-bottom:14px">'+
  '<button class="inv-tab on" id="inv-tab-stock" onclick="_filoInvSwitchTab(\'stock\',\''+did+'\')" style="flex:1;padding:9px;font-size:13px;font-weight:700;background:none;border:none;cursor:pointer;color:var(--tx);border-bottom:2px solid var(--br,#0891b2);margin-bottom:-2px">재고현황</button>'+
  '<button class="inv-tab" id="inv-tab-order" onclick="_filoInvSwitchTab(\'order\',\''+did+'\')" style="flex:1;padding:9px;font-size:13px;font-weight:700;background:none;border:none;cursor:pointer;color:var(--t3)">발주현황 <span id="inv-order-badge" style="display:none;background:#f59e0b;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px"></span></button>'+
  '</div>'+
  /* 검색 */
  '<input id="inv-search" placeholder="재료명 검색..." oninput="_filoInvFilter()" style="width:100%;box-sizing:border-box;padding:9px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--b3);color:var(--tx);font-size:13px;margin-bottom:12px">'+
  /* 목록 컨테이너 */
  '<div id="inv-list"><div style="text-align:center;padding:40px;color:var(--t3)">로딩 중...</div></div>'+
  '</div>';

 _filoInvLoad(did);
}

// ── 탭 전환 ──────────────────────────────────────────────────────────────────
window._filoInvSwitchTab=function(tab,did){
 ['stock','order'].forEach(function(t){
  var btn=document.getElementById('inv-tab-'+t);
  if(!btn)return;
  if(t===tab){btn.style.color='var(--tx)';btn.style.borderBottom='2px solid var(--br,#0891b2)';}
  else{btn.style.color='var(--t3)';btn.style.borderBottom='none';}
 });
 var search=document.getElementById('inv-search');
 if(search) search.style.display=tab==='stock'?'':'none';
 if(tab==='stock') _filoInvLoad(did);
 else _filoInvLoadOrders(did);
};

// ── 재고 로드 & 렌더 ─────────────────────────────────────────────────────────
var _invAllItems=[];
function _filoInvLoad(did){
 var list=document.getElementById('inv-list');
 if(list) list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">로딩 중...</div>';
 firebase.firestore().collection('inventory').where('dealerId','==',did)
  .orderBy('name').get()
 .then(function(snap){
  _invAllItems=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
  // 부족 비율 낮은 순으로 정렬 (가장 긴급한 것부터)
  _invAllItems.sort(function(a,b){
   var ra=(a.minStock>0)?(a.stock||0)/(a.minStock):2;
   var rb=(b.minStock>0)?(b.stock||0)/(b.minStock):2;
   return ra-rb;
  });
  _filoInvRender(_invAllItems,did);
 }).catch(function(e){
  var list=document.getElementById('inv-list');
  if(list) list.innerHTML='<div style="text-align:center;padding:30px;color:#ef4444">'+e.message+'</div>';
 });
}

function _filoInvRender(items,did){
 // KPI
 var red=0,yellow=0,green=0;
 items.forEach(function(it){
  var s=it.stock||0,m=it.minStock||0;
  if(m>0&&s<=0)red++;
  else if(m>0&&s<=m)yellow++;
  else green++;
 });
 var kpi=document.getElementById('inv-kpi');
 if(kpi) kpi.innerHTML=
  '<div style="text-align:center;padding:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:12px">'+
  '<div style="font-size:22px;font-weight:900;color:#ef4444">'+red+'</div>'+
  '<div style="font-size:10px;color:var(--t3);margin-top:2px">재고 없음</div></div>'+
  '<div style="text-align:center;padding:12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:12px">'+
  '<div style="font-size:22px;font-weight:900;color:#f59e0b">'+yellow+'</div>'+
  '<div style="font-size:10px;color:var(--t3);margin-top:2px">부족 임박</div></div>'+
  '<div style="text-align:center;padding:12px;background:rgba(5,150,105,.08);border:1px solid rgba(5,150,105,.2);border-radius:12px">'+
  '<div style="font-size:22px;font-weight:900;color:#059669">'+green+'</div>'+
  '<div style="font-size:10px;color:var(--t3);margin-top:2px">정상</div></div>';

 // 자동발주 버튼 활성화 표시
 var autoBtn=document.getElementById('inv-auto-btn');
 if(autoBtn&&(red+yellow)>0){
  autoBtn.style.background='rgba(245,158,11,.2)';
  autoBtn.textContent='자동발주 ('+(red+yellow)+')';
 }

 var list=document.getElementById('inv-list');
 if(!list) return;
 if(!items.length){
  list.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)">'+
   '등록된 재료가 없습니다<br><span style="font-size:12px">+ 등록 버튼으로 추가하세요</span></div>';
  return;
 }
 list.innerHTML=items.map(function(it){
  var s=it.stock||0, m=it.minStock||0;
  var pct=m>0?Math.min(Math.round(s/m*100),100):100;
  var color=s<=0?'#ef4444':m>0&&s<=m?'#f59e0b':'#059669';
  var bgLight=s<=0?'rgba(239,68,68,.06)':m>0&&s<=m?'rgba(245,158,11,.06)':'';
  var barColor=s<=0?'#ef4444':m>0&&s<=m?'#f59e0b':'#22c55e';
  var statusText=s<=0?'없음':m>0&&s<=m?'부족':'정상';
  return '<div class="inv-row" data-name="'+(it.name||'')+'" style="'+
   'padding:12px 14px;border-radius:14px;margin-bottom:8px;'+
   'background:'+(bgLight||'var(--b2,rgba(255,255,255,.04))')+';'+
   'border:1px solid var(--bd)">'+
   /* 1행: 상태점 + 이름 + 단위·상태 + 발주 버튼 */
   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'+
   '<div style="width:9px;height:9px;border-radius:50%;background:'+color+';flex-shrink:0"></div>'+
   '<div style="font-size:14px;font-weight:800;flex:1;color:var(--tx)">'+esc(it.name||'—')+'</div>'+
   '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:'+color+'22;color:'+color+'">'+statusText+'</span>'+
   '<button onclick="_filoInvOrderInline(\''+it.id+'\',\''+did+'\')" style="padding:5px 12px;background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">발주</button>'+
   '</div>'+
   /* 2행: 진행바 + 수량 + +/- */
   '<div style="display:flex;align-items:center;gap:10px">'+
   '<div style="flex:1;background:var(--b3);border-radius:6px;height:6px;overflow:hidden">'+
   '<div style="background:'+barColor+';width:'+pct+'%;height:100%;border-radius:6px;transition:width .6s ease"></div></div>'+
   '<div style="font-size:12px;color:var(--t3);white-space:nowrap;min-width:60px;text-align:right">'+s+'<span style="color:var(--bd)">/</span>'+m+(it.unit||'개')+'</div>'+
   '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">'+
   '<button onclick="_filoInvAdjust(\''+it.id+'\',\''+did+'\',-1)" style="width:30px;height:30px;border-radius:8px;background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.2);font-size:16px;font-weight:900;cursor:pointer;line-height:1">−</button>'+
   '<button onclick="_filoInvAdjust(\''+it.id+'\',\''+did+'\',1)" style="width:30px;height:30px;border-radius:8px;background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.2);font-size:16px;font-weight:900;cursor:pointer;line-height:1">+</button>'+
   '</div></div>'+
   /* 공급처 */
   (it.supplier?'<div style="font-size:11px;color:var(--t3);margin-top:6px">공급처: '+esc(it.supplier)+'</div>':'')+
   '</div>';
 }).join('');
}

// ── 검색 필터 ────────────────────────────────────────────────────────────────
window._filoInvFilter=function(){
 var q=(document.getElementById('inv-search')||{}).value||'';
 document.querySelectorAll('.inv-row').forEach(function(row){
  var n=row.getAttribute('data-name')||'';
  row.style.display=n.includes(q)?'':'none';
 });
};

// ── +/- 빠른 조정 ─────────────────────────────────────────────────────────────
window._filoInvAdjust=function(itemId,did,delta){
 var ref=firebase.firestore().collection('inventory').doc(itemId);
 ref.get().then(function(doc){
  if(!doc.exists)return;
  var cur=doc.data().stock||0;
  var next=Math.max(0,cur+delta);
  var now=new Date().toISOString();
  var batch=firebase.firestore().batch();
  batch.update(ref,{stock:next,updatedAt:now});
  // 이력 기록
  var col=delta>0?'inventory_in':'inventory_out';
  batch.set(firebase.firestore().collection(col).doc(),{
   dealerId:did,itemId:itemId,qty:Math.abs(delta),
   type:delta>0?'adjust_in':'adjust_out',
   createdAt:now,date:now.slice(0,10),
   createdBy:(_CU&&(_CU.name||_CU.userId))||''
  });
  return batch.commit();
 }).then(function(){
  _filoInvLoad(did);
 }).catch(function(e){_filoToast(e.message);});
};

// ── 개별 발주 팝업 ───────────────────────────────────────────────────────────
window._filoInvOrderInline=function(itemId,did){
 var it=_invAllItems.find(function(x){return x.id===itemId;});
 if(!it){_filoToast('항목을 찾을 수 없습니다');return;}
 var needed=Math.max(1,(it.minStock||5)*2-(it.stock||0));
 var ex=document.getElementById('inv-order-pop'); if(ex) ex.remove();
 var m=document.createElement('div');
 m.id='inv-order-pop';
 m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end;padding:0';
 m.innerHTML='<div class="card" style="width:100%;border-radius:20px 20px 0 0;padding:24px;max-height:80vh;overflow-y:auto">'+
  '<div style="font-size:15px;font-weight:900;margin-bottom:4px">'+esc(it.name||'')+'</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-bottom:16px">현재 '+(it.stock||0)+''+esc(it.unit||'개')+' / 최소 '+(it.minStock||0)+esc(it.unit||'개')+'</div>'+
  '<div style="display:flex;flex-direction:column;gap:10px">'+
  '<div><label style="font-size:12px;color:var(--t3);display:block;margin-bottom:4px">발주 수량</label>'+
  '<input id="iop-qty" type="number" value="'+needed+'" min="1" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:15px;font-weight:700"></div>'+
  '<div><label style="font-size:12px;color:var(--t3);display:block;margin-bottom:4px">공급처</label>'+
  '<input id="iop-supplier" value="'+esc(it.supplier||'')+'" placeholder="공급처명" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px"></div>'+
  '<div><label style="font-size:12px;color:var(--t3);display:block;margin-bottom:4px">메모 (선택)</label>'+
  '<input id="iop-memo" placeholder="메모" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px"></div>'+
  '</div>'+
  '<div style="display:flex;gap:8px;margin-top:16px">'+
  '<button onclick="document.getElementById(\'inv-order-pop\').remove()" style="flex:1;padding:13px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">취소</button>'+
  '<button onclick="_filoInvDoOrder(\''+itemId+'\',\''+did+'\',\''+esc(it.name||'')+'\')" style="flex:2;padding:13px;background:#f59e0b;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer">발주 등록</button>'+
  '</div></div>';
 document.body.appendChild(m);
};

// ── 발주 저장 ────────────────────────────────────────────────────────────────
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
  _filoToast(esc(itemName)+' 발주 완료 ('+qty+'개)');
  var p=document.getElementById('inv-order-pop'); if(p) p.remove();
  var did2=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
  _filoInvLoad(did2);
 }).catch(function(e){_filoToast((e&&e.message)||'오류');});
};

// ── 부족 전체 자동발주 ────────────────────────────────────────────────────────
window._filoInvAutoOrder=function(did){
 var low=_invAllItems.filter(function(it){return (it.stock||0)<=(it.minStock||5)&&(it.minStock||5)>0;});
 if(!low.length){_filoToast('발주가 필요한 재고가 없습니다');return;}
 if(!confirm(low.length+'개 품목을 자동 발주하시겠습니까?'))return;
 var db=firebase.firestore(),batch=db.batch();
 var now=new Date();
 var due=new Date(now); due.setDate(due.getDate()+3);
 low.forEach(function(it){
  var qty=Math.max(1,(it.minStock||5)*2-(it.stock||0));
  batch.set(db.collection('inventory_orders').doc(),{
   dealerId:did,itemId:it.id,itemName:it.name||'',
   orderQty:qty,supplier:it.supplier||'',memo:'자동 발주',status:'pending',isAuto:true,
   createdAt:now.toISOString(),dueDate:due.toISOString().slice(0,10),
   createdBy:(_CU&&(_CU.name||_CU.userId))||''
  });
 });
 batch.commit().then(function(){
  _filoToast('자동 발주 완료 ('+low.length+'건)');
  _filoInvLoad(did);
 }).catch(function(e){_filoToast((e&&e.message)||'오류');});
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
  if(badge){badge.textContent=orders.length;badge.style.display=orders.length?'':'none';}
  if(!list) return;
  if(!orders.length){
   list.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)">대기 중인 발주 없음</div>';
   return;
  }
  list.innerHTML=orders.map(function(o){
   return '<div style="padding:14px;background:var(--b2,rgba(255,255,255,.04));border:1px solid var(--bd);border-radius:14px;margin-bottom:8px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'+
    '<div style="font-size:14px;font-weight:800;color:var(--tx)">'+esc(o.itemName||'—')+'</div>'+
    '<button onclick="_filoInvConfirmReceive(\''+o.id+'\',\''+o.itemId+'\','+o.orderQty+',\''+esc(o.itemName||'')+'\',\''+did+'\')" style="padding:6px 14px;background:rgba(34,197,94,.15);color:#22c55e;border:1px solid rgba(34,197,94,.3);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">입고 완료</button>'+
    '</div>'+
    '<div style="font-size:12px;color:var(--t3)">발주 '+o.orderQty+'개'+
    (o.supplier?' · 공급처: '+esc(o.supplier):'')+
    (o.dueDate?' · 예정: '+o.dueDate:'')+
    (o.isAuto?' · 자동발주':'')+
    '</div></div>';
  }).join('');
 }).catch(function(e){
  if(list) list.innerHTML='<div style="text-align:center;padding:30px;color:#ef4444">'+e.message+'</div>';
 });
}

// ── 입고 완료 처리 ───────────────────────────────────────────────────────────
window._filoInvConfirmReceive=function(orderId,itemId,qty,itemName,did){
 if(!confirm(esc(itemName)+' '+qty+'개 입고 완료 처리하시겠습니까?'))return;
 var db=firebase.firestore(), now=new Date().toISOString();
 var batch=db.batch();
 batch.update(db.collection('inventory_orders').doc(orderId),{status:'done',receivedAt:now});
 batch.update(db.collection('inventory').doc(itemId),{
  stock:firebase.firestore.FieldValue.increment(qty),updatedAt:now
 });
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

// ── 재료 등록 모달 ───────────────────────────────────────────────────────────
window._filoInvAddModal=function(did){
 var ex=document.getElementById('inv-add-modal'); if(ex) ex.remove();
 var m=document.createElement('div');
 m.id='inv-add-modal';
 m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end;padding:0';
 m.innerHTML='<div class="card" style="width:100%;border-radius:20px 20px 0 0;padding:24px">'+
  '<div style="font-size:15px;font-weight:900;margin-bottom:16px">재료 등록</div>'+
  '<div style="display:flex;flex-direction:column;gap:10px">'+
  '<input id="im-name" placeholder="재료명 *" style="padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px;box-sizing:border-box;width:100%">'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">현재 수량</label>'+
  '<input id="im-stock" type="number" placeholder="0" min="0" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px"></div>'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">최소 재고 (알림기준)</label>'+
  '<input id="im-min" type="number" placeholder="5" min="0" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px"></div>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">단위</label>'+
  '<input id="im-unit" placeholder="개/kg/L" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px"></div>'+
  '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">단가 (원)</label>'+
  '<input id="im-price" type="number" placeholder="0" min="0" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px"></div>'+
  '</div>'+
  '<input id="im-supplier" placeholder="공급처 (선택)" style="padding:11px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px;box-sizing:border-box;width:100%">'+
  '</div>'+
  '<div style="display:flex;gap:8px;margin-top:16px">'+
  '<button onclick="document.getElementById(\'inv-add-modal\').remove()" style="flex:1;padding:13px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">취소</button>'+
  '<button onclick="_filoInvDoAdd(\''+did+'\')" style="flex:2;padding:13px;background:var(--br,#0891b2);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer">등록</button>'+
  '</div></div>';
 document.body.appendChild(m);
 setTimeout(function(){var n=document.getElementById('im-name');if(n)n.focus();},50);
};

window._filoInvDoAdd=function(did){
 var name=(document.getElementById('im-name')||{}).value||'';
 var stock=parseInt((document.getElementById('im-stock')||{}).value||'0')||0;
 var min=parseInt((document.getElementById('im-min')||{}).value||'5')||5;
 var unit=(document.getElementById('im-unit')||{}).value||'개';
 var price=parseInt((document.getElementById('im-price')||{}).value||'0')||0;
 var supplier=(document.getElementById('im-supplier')||{}).value||'';
 if(!name.trim()){_filoToast('재료명을 입력하세요');return;}
 firebase.firestore().collection('inventory').add({
  dealerId:did,name:name.trim(),stock:stock,minStock:min,
  unit:unit,unitPrice:price,supplier:supplier,
  createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
 }).then(function(){
  _filoToast(name+' 등록 완료');
  var m=document.getElementById('inv-add-modal'); if(m) m.remove();
  _filoInvLoad(did);
 }).catch(function(e){_filoToast((e&&e.message)||'오류');});
};

// ── 구 함수 호환 (filo-auth.js에서 stock_in/stock_out 페이지로 라우팅될 경우) ─
function _filoPageStockIn(el){ _filoPageInventoryDash(el); }
function _filoPageStockOut(el){ _filoPageInventoryDash(el); }
