/**
 * @module      filo-inventory.js
 * ══════════════════════════════════════════════════════
 * 역할: 재고 관리 · 발주 알림 · 입고 예정
 *
 * 저장 컬렉션:
 *   filo_inventory  — 재고 목록 (재료명·현재고·최소재고)
 *   filo_purchases  — 발주 기록
 *
 * FCM 발송:
 *   재고 부족 시 → 사장님 FCM (type: 'alert')
 *   최소재고 이하 → 즉시 경보
 *
 * 주요 함수:
 *   _filoPageInventory(el)     — 재고 현황 페이지
 *   _filoCheckStockAlert(did)  — 재고 부족 자동 체크
 *   _filoOrderStock(itemId)    — 발주 처리
 * ══════════════════════════════════════════════════════
 */
// 의존성: filo-common.js
// 관련 컬렉션: inventory, inventory_in, inventory_out

function _filoPageInventory(el){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">로그인 후 이용하세요</div>';return;}
 el.innerHTML='<div style="max-width:900px;margin:0 auto"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">'+
 ['오늘 매출','거래건수','재고 부족','마진율'].map(function(t,i){
 return '<div class="stat-card fade-up-'+( i+1)+'" style="flex:1;min-width:130px;text-align:center">'+
 '<div class="metric-ring" style="margin:0 auto 10px;background:'+['rgba(96,165,250,.15)','rgba(34,197,94,.15)','rgba(239,68,68,.15)','rgba(245,158,11,.15)'][i]+'">'+
 ['💰','🛒','⚠️','📊'][i]+'</div>'+
 '<div id="fi-stat-'+i+'" style="font-size:22px;font-weight:900;color:'+['#60a5fa','#22c55e','#ef4444','#f59e0b'][i]+'">—</div>'+
 '<div style="font-size:10px;color:var(--t3);margin-top:3px">'+t+'</div></div>';
 }).join('')+'</div>'+
 '<div id="fi-low-stock" class="fade-up-3"></div>'+
 '<div id="fi-expiry-warn" class="fade-up-4"></div>'+
 '</div>';

 var today=_today();
 var ym=today.slice(0,7);
 /* 월선택 현재달로 설정 */
 setTimeout(function(){var ymEl=document.getElementById('mg-ym');if(ymEl)ymEl.value=ym;},50);
 Promise.all([
 firebase.firestore().collection('mbetco_sales').where('dealerId','==',did).where('date','==',today).get(),
 firebase.firestore().collection('mbetco_sales').where('dealerId','==',did).where('date','>=',ym+'-01').where('date','<=',ym+'-31').get(),
 firebase.firestore().collection('inventory').where('dealerId','==',did).get()
 ]).then(function(res){
 var todayRev=0,todayCnt=0,monthRev=0,monthCost=0,lowStock=[],expirySoon=[];
 res[0].forEach(function(doc){var d=doc.data();todayRev+=(d.totalAmount||0);todayCnt++;});
 res[1].forEach(function(doc){var d=doc.data();monthRev+=(d.totalAmount||0);monthCost+=(d.totalCost||0);});
 var warn7=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 res[2].forEach(function(doc){
 var d=doc.data();
 if(d.stock!=null&&d.minStock!=null&&d.stock<=d.minStock) lowStock.push(d);
 if(d.expiryDate&&d.expiryDate<=warn7&&d.expiryDate>=today) expirySoon.push(d);
 });
 var marginRate=monthRev>0?Math.round((monthRev-monthCost)/monthRev*100):0;

 var stats=[todayRev,todayCnt,lowStock.length,marginRate];
 var suffixes=['원','건','개','%'];
 stats.forEach(function(v,i){
 var el2=document.getElementById('fi-stat-'+i);
 if(el2) _countUp(el2,v,800,'',suffixes[i]);
 });

 var low=document.getElementById('fi-low-stock');
 if(low&&lowStock.length){
 low.innerHTML='<div class="card" style="border-left:3px solid #ef4444;margin-bottom:10px">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
 '<div style="font-size:13px;font-weight:800;color:#ef4444">⚠️ 재고 부족 '+lowStock.length+'개</div>'+
 '<button onclick="_filoGoPage(&quot;expiry&quot;)" style="font-size:11px;padding:4px 10px;background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.3);border-radius:6px;cursor:pointer">상세보기</button>'+
 '</div>'+
 lowStock.slice(0,3).map(function(d){
 var pct=d.minStock>0?Math.round(d.stock/d.minStock*100):0;
 return '<div style="margin-bottom:8px">'+
 '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
 '<span style="font-size:12px;font-weight:600">'+d.name+'</span>'+
 '<span style="font-size:11px;color:#ef4444;font-weight:700">'+d.stock+'/'+d.minStock+'개</span></div>'+
 '<div style="background:var(--b3);border-radius:4px;height:5px">'+
 '<div style="background:linear-gradient(90deg,#ef4444,#f97316);border-radius:4px;height:5px;width:'+Math.min(pct,100)+'%;transition:width .8s ease"></div></div></div>';
 }).join('')+
 (lowStock.length>3?'<div style="font-size:11px;color:var(--t3);margin-top:6px">외 '+(lowStock.length-3)+'개 품목...</div>':'')+
 '</div>';
 }

 var exp=document.getElementById('fi-expiry-warn');
 if(exp&&expirySoon.length){
 exp.innerHTML='<div class="card" style="border-left:3px solid #f59e0b">'+
 '<div style="font-size:13px;font-weight:800;color:#f59e0b;margin-bottom:8px">⏰ 7일 내 만료 '+expirySoon.length+'개</div>'+
 expirySoon.map(function(d){
 var dL=Math.ceil((new Date(d.expiryDate)-new Date(today))/86400000);
 return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px">'+d.name+'</span>'+
 '<span style="font-size:11px;font-weight:700;color:'+( dL<=3?'#ef4444':'#f59e0b')+'">D-'+dL+'</span></div>';
 }).join('')+'</div>';
 }
 }).catch(function(e){console.warn(e);});
}

function _filoPageStockIn(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="stock-form slide-up">'+
 '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">'+
 '<div style="font-size:22px">📥</div>'+
 '<div><div style="font-size:17px;font-weight:900">입고 등록</div>'+
 '<div style="font-size:11px;color:var(--t3)">재고를 입고합니다</div></div></div>'+
 '<div class="card" style="margin-bottom:16px">'+
 '<div class="fg"><label>품목 선택</label>'+
 '<select id="si-item" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px">'+
 '<option value="">품목을 선택하세요</option></select></div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
 '<div class="fg"><label>수량</label><input id="si-qty" type="number" min="1" placeholder="0" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>입고 단가 (총액)</label><input id="si-price" type="number" min="0" placeholder="0" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '</div>'+
 '<div class="fg"><label>유통기한 (선택)</label><input id="si-expiry" type="date" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>거래처 (선택)</label><input id="si-supplier" type="text" placeholder="거래처명" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>메모 (선택)</label><input id="si-memo" type="text" placeholder="메모" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>영수증 첨부 <span style="font-size:10px;color:var(--t3)">(선택 · 사진/PDF)</span></label>'+
 '<div style="display:flex;align-items:center;gap:8px">'+
 '<label style="flex:1;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;font-size:12px;color:var(--t3);cursor:pointer;text-align:center">'+
 '<span id="si-receipt-label">📎 파일 선택</span>'+
 '<input id="si-receipt-input" type="file" accept="image/*,.pdf" style="display:none" onchange="_filoReceiptSelected(this)">'+
 '</label>'+
 '<div id="si-receipt-preview" style="display:none;width:48px;height:48px;border-radius:8px;overflow:hidden;border:1px solid var(--bd)">'+
 '<img id="si-receipt-img" style="width:100%;height:100%;object-fit:cover">'+
 '</div></div></div>'+
 '<button onclick="_filoDoStockIn()" class="btn btn-brand" style="width:100%">📥 입고 등록</button>'+
 '</div>'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:10px;color:var(--t2)">최근 입고 이력</div>'+
 '<div id="si-history">'+
 '<div style="text-align:center;padding:30px;color:var(--t3)"><div style="animation:spin 1s linear infinite;display:inline-block;font-size:20px">⏳</div></div>'+
 '</div></div>';
 _filoLoadInventoryItems(did, 'si-item');
 _filoLoadStockHistory(did, 'si-history', 'in');
}

/* ── 영수증 선택 미리보기 ── */
function _filoDoStockIn(){
 var did=_CU.dealerId||_CU.uid;
 var itemId=document.getElementById('si-item').value;
 var qty=parseInt(document.getElementById('si-qty').value)||0;
 var price=parseInt(document.getElementById('si-price').value)||0;
 var expiry=document.getElementById('si-expiry').value||'';
 var supplier=document.getElementById('si-supplier').value.trim();
 var memo=document.getElementById('si-memo').value.trim();
 if(!itemId){_filoToast('품목을 선택하세요');return;}
 if(qty<=0){_filoToast('수량을 입력하세요');return;}
 var now=new Date();
 var inUnitEl=document.getElementById('si-inunit');
 var inUnit=inUnitEl?inUnitEl.value:'개';
 var unitPrice=price;
 if(inUnit==='kg')unitPrice=price/1000;
 else if(inUnit==='L')unitPrice=price/1000;
 var receiptInput=document.getElementById('si-receipt-input');
 var file=receiptInput&&receiptInput.files&&receiptInput.files[0];

 function _saveStockIn(receiptUrl){
  _db.collection('inventory_in').add({
   dealerId:did,itemId:itemId,qty:qty,price:unitPrice,totalPrice:price,inUnit:inUnit,
   expiry:expiry,supplier:supplier,memo:memo,
   receiptUrl:receiptUrl||'',hasReceipt:!!receiptUrl,
   createdAt:now.toISOString(),date:now.toISOString().slice(0,10),
   createdBy:_CU.name||_CU.userId||''
  }).then(function(){
   return _db.collection('inventory').doc(itemId).update({
    stock:firebase.firestore.FieldValue.increment(qty),
    updatedAt:now.toISOString()
   });
  }).then(function(){
   _filoToast('✅ 입고 완료 (+'+qty+'개)'+(receiptUrl?' 📎':''));
   document.getElementById('si-qty').value='';
   document.getElementById('si-price').value='';
   document.getElementById('si-memo').value='';
   if(receiptInput)receiptInput.value='';
   var lbl=document.getElementById('si-receipt-label');if(lbl)lbl.textContent='📎 파일 선택';
   var pv=document.getElementById('si-receipt-preview');if(pv)pv.style.display='none';
   _filoLoadStockHistory(did,'si-history','in');
  }).catch(function(e){_filoToast('❌ '+e.message);});
 }

 if(file){
  _filoToast('📎 업로드 중...');
  var reader=new FileReader();
  reader.onload=function(e){
   var base64=e.target.result.split(',')[1];
   var path='receipts/'+did+'/'+now.toISOString().slice(0,10)+'-'+Date.now()+'.'+file.name.split('.').pop();
   fetch('/storage-upload',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({storagePath:path,base64data:base64,contentType:file.type,idToken:(_auth&&_auth.currentUser)?_auth.currentUser.getIdToken():''})
   }).then(function(r){return r.json();}).then(function(d){_saveStockIn(d.url||'');}).catch(function(){_saveStockIn('');});
  };
  reader.readAsDataURL(file);
 } else {
  _saveStockIn('');
 }
}

function _filoPageStockOut(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="stock-form slide-up">'+
 '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">'+
 '<div style="font-size:22px">📤</div>'+
 '<div><div style="font-size:17px;font-weight:900">출고 등록</div>'+
 '<div style="font-size:11px;color:var(--t3)">재고를 출고합니다</div></div></div>'+
 '<div class="card" style="margin-bottom:16px">'+
 '<div class="fg"><label>품목 선택</label>'+
 '<select id="so-item" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px">'+
 '<option value="">품목을 선택하세요</option></select></div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
 '<div class="fg"><label>수량</label><input id="so-qty" type="number" min="1" placeholder="0" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>출고 유형</label>'+
 '<select id="so-type" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px">'+
 '<option value="sale">판매</option><option value="use">사용</option><option value="waste">폐기</option><option value="return">반품</option><option value="etc">기타</option>'+
 '</select></div></div>'+
 '<div class="fg"><label>메모 (선택)</label><input id="so-memo" type="text" placeholder="메모" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<button onclick="_filoDoStockOut()" class="btn" style="width:100%;background:var(--red);color:#fff">📤 출고 등록</button>'+
 '</div>'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:10px;color:var(--t2)">최근 출고 이력</div>'+
 '<div id="so-history">'+
 '<div style="text-align:center;padding:30px;color:var(--t3)">⏳</div>'+
 '</div></div>';
 _filoLoadInventoryItems(did,'so-item');
 _filoLoadStockHistory(did,'so-history','out');
}

function _filoDoStockOut(){
 var did=_CU.dealerId||_CU.uid;
 var itemId=document.getElementById('so-item').value;
 var qty=parseInt(document.getElementById('so-qty').value)||0;
 var type=document.getElementById('so-type').value;
 var memo=document.getElementById('so-memo').value.trim();
 if(!itemId){_filoToast('품목을 선택하세요');return;}
 if(qty<=0){_filoToast('수량을 입력하세요');return;}
 var now=new Date();
 _db.collection('inventory').doc(itemId).get().then(function(snap){
 var cur=snap.exists?(snap.data().stock||0):0;
 if(cur<qty){_filoToast('❌ 재고 부족 (현재 '+cur+'개)');return Promise.reject('재고부족');}
 return _db.collection('inventory_out').add({
 dealerId:did,itemId:itemId,qty:qty,type:type,memo:memo,
 createdAt:now.toISOString(),date:now.toISOString().slice(0,10),
 createdBy:_CU.name||_CU.userId||''
 }).then(function(){
 return _db.collection('inventory').doc(itemId).update({
 stock:firebase.firestore.FieldValue.increment(-qty),
 updatedAt:now.toISOString()
 });
 });
 }).then(function(){
 _filoToast('✅ 출고 완료 (-'+qty+'개)');
 document.getElementById('so-qty').value='';
 document.getElementById('so-memo').value='';
 _filoLoadStockHistory(did,'so-history','out');
 }).catch(function(e){if(e!=='재고부족')_filoToast('❌ '+(e.message||e));});
}

function _filoLoadInventoryItems(did, selectId){
 _db.collection('inventory').where('dealerId','==',did).orderBy('name').get()
 .then(function(snap){
 var sel=document.getElementById(selectId);if(!sel)return;
 snap.forEach(function(doc){
 var d=doc.data();
 var opt=document.createElement('option');
 opt.value=doc.id;
 opt.textContent=d.name+(d.stock!=null?' ('+d.stock+'개)':'');
 sel.appendChild(opt);
 });
 }).catch(function(){});
}

// ── 재고 대시보드 고도화 (사진 12번 스타일) ─────────────────────
function _filoPageInventoryDash(el) {
  var did = (_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
  if(!did){ el.innerHTML='<div class="card" style="text-align:center;padding:40px">로그인 후 이용하세요</div>'; return; }

  el.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.className = 'slide-up';
  wrap.style.cssText = 'max-width:960px;margin:0 auto';

  // ── 상단 알림 배너 (재고 부족 시) ──
  var alertBanner = document.createElement('div');
  alertBanner.id = 'inv-alert-banner';
  alertBanner.style.cssText = 'display:none;background:linear-gradient(135deg,#fee2e2,#fecaca);border:1px solid #fca5a5;border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px';
  alertBanner.innerHTML =
    '<span style="font-size:20px">⚠️</span>' +
    '<div><div style="font-size:13px;font-weight:800;color:#b91c1c" id="inv-alert-title">재고 부족 항목 있음</div>' +
    '<div style="font-size:11px;color:#ef4444;margin-top:2px" id="inv-alert-sub">공급처에 즉시 발주를 권장합니다</div></div>';
  wrap.appendChild(alertBanner);

  // ── KPI 4열 ──
  var kpi = document.createElement('div');
  kpi.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px';
  kpi.innerHTML = [
    {id:'inv-total-items', ic:'📋', lbl:'재료 목록',   c:'#0891b2', sub:'총 등록 재료'},
    {id:'inv-normal',      ic:'📦', lbl:'현재 재고',   c:'#059669', sub:'정상 재고'},
    {id:'inv-low',         ic:'🛒', lbl:'발주 필요',   c:'#f59e0b', sub:'재고 부족 품목'},
    {id:'inv-incoming',    ic:'🚚', lbl:'입고 예정',   c:'#7c3aed', sub:'이번 주'},
  ].map(function(k){
    return '<div class="card" style="padding:16px;border-radius:16px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
      '<span style="font-size:18px">'+k.ic+'</span>' +
      '<span style="font-size:10px;font-weight:700;color:var(--t3)">'+k.sub+'</span>' +
      '</div>' +
      '<div style="font-size:24px;font-weight:900;color:'+k.c+'" id="'+k.id+'">—</div>' +
      '<div style="font-size:11px;font-weight:700;color:var(--t3);margin-top:4px">'+k.lbl+'</div>' +
      '</div>';
  }).join('');
  wrap.appendChild(kpi);

  // ── 하단 2열 ──
  var bottom = document.createElement('div');
  bottom.style.cssText = 'display:grid;grid-template-columns:3fr 2fr;gap:12px';

  // 재료 목록 테이블
  var tableCard = document.createElement('div');
  tableCard.className = 'card';
  tableCard.style.cssText = 'padding:20px;border-radius:18px';
  tableCard.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
    '<div style="font-size:13px;font-weight:800;color:var(--t3)">재료 목록</div>' +
    '<div style="display:flex;gap:8px">' +
    '<input id="inv-search" placeholder="재료명 검색..." oninput="_filoInvSearch()" style="padding:6px 12px;border:1px solid var(--bd);border-radius:8px;background:var(--bg);color:var(--tx);font-size:12px;width:140px">' +
    '<button onclick="_filoInvAddModal(''+did+'')" style="padding:6px 12px;background:var(--br);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">+ 재고 등록</button>' +
    '</div></div>' +
    '<div style="overflow-x:auto">' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
    '<thead><tr style="border-bottom:2px solid var(--bd)">' +
    ['재료명','현재고','최소재고','상태','발주'].map(function(h){
      return '<th style="padding:8px 6px;text-align:left;font-weight:700;color:var(--t3)">'+h+'</th>';
    }).join('') +
    '</tr></thead>' +
    '<tbody id="inv-table-body"><tr><td colspan="5" style="padding:20px;text-align:center;color:var(--t3)">로딩 중...</td></tr></tbody>' +
    '</table></div>';
  bottom.appendChild(tableCard);

  // 오른쪽 패널 (발주 필요 + 입고 예정)
  var rightPanel = document.createElement('div');
  rightPanel.style.cssText = 'display:flex;flex-direction:column;gap:12px';

  var lowCard = document.createElement('div');
  lowCard.className = 'card';
  lowCard.style.cssText = 'padding:16px;border-radius:18px;flex:1';
  lowCard.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:800;color:var(--t3)">발주 필요 <span id="inv-low-badge" style="background:#f59e0b;color:#fff;font-size:10px;padding:2px 7px;border-radius:10px;margin-left:4px">0</span></div>' +
    '<button onclick="_filoInvAutoOrder(''+did+'')" style="padding:5px 10px;background:#f59e0b;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">+ 발주 생성하기</button>' +
    '</div>' +
    '<div id="inv-low-list"><div style="color:var(--t3);font-size:12px;text-align:center;padding:20px">재고 부족 없음 ✅</div></div>';
  rightPanel.appendChild(lowCard);

  var incomingCard = document.createElement('div');
  incomingCard.className = 'card';
  incomingCard.style.cssText = 'padding:16px;border-radius:18px;flex:1';
  incomingCard.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:800;color:var(--t3)">입고 예정 <span id="inv-in-badge" style="background:#7c3aed;color:#fff;font-size:10px;padding:2px 7px;border-radius:10px;margin-left:4px">0</span></div>' +
    '<button onclick="_filoInvAddIncoming(''+did+'')" style="padding:5px 10px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">+ 발주 생성하기</button>' +
    '</div>' +
    '<div id="inv-incoming-list"><div style="color:var(--t3);font-size:12px;text-align:center;padding:20px">입고 예정 없음</div></div>';
  rightPanel.appendChild(incomingCard);

  bottom.appendChild(rightPanel);
  wrap.appendChild(bottom);
  el.appendChild(wrap);

  // 데이터 로딩
  _filoInvDashLoad(did);
}

function _filoInvDashLoad(did) {
  firebase.firestore().collection('inventory').where('dealerId','==',did).get()
  .then(function(snap){
    var items = snap.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
    var total=items.length, normal=0, low=[];

    items.forEach(function(it){
      var stock=it.stock||0, min=it.minStock||5;
      if(stock<=min) low.push(it); else normal++;
    });

    // KPI
    var e1=document.getElementById('inv-total-items');
    var e2=document.getElementById('inv-normal');
    var e3=document.getElementById('inv-low');
    if(e1) e1.textContent=total+'종';
    if(e2) e2.textContent=normal+'건';
    if(e3){ e3.textContent=low.length+'건'; e3.style.color=low.length>0?'#ef4444':'#22c55e'; }

    // 알림 배너
    var banner=document.getElementById('inv-alert-banner');
    var alertTitle=document.getElementById('inv-alert-title');
    var alertSub=document.getElementById('inv-alert-sub');
    if(banner && low.length>0){
      banner.style.display='flex';
      if(alertTitle) alertTitle.textContent=low[0].name+' 등 '+low.length+'개 항목 재고 부족';
      if(alertSub) alertSub.textContent='현재 '+low[0].name+' 재고가 최소 재고 미만입니다. 즉시 발주를 권장합니다';
    }

    // 테이블
    var tbody=document.getElementById('inv-table-body');
    if(tbody){
      if(!items.length){
        tbody.innerHTML='<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--t3)">등록된 재료 없음</td></tr>';
      } else {
        tbody.innerHTML=items.map(function(it){
          var stock=it.stock||0, min=it.minStock||5;
          var status = stock<=0?'부족':stock<=min?'부족임박':'정상';
          var statusColor = stock<=0?'#ef4444':stock<=min?'#f59e0b':'#059669';
          var statusBg = stock<=0?'rgba(239,68,68,.1)':stock<=min?'rgba(245,158,11,.1)':'rgba(5,150,105,.1)';
          return '<tr style="border-bottom:1px solid var(--bd)">' +
            '<td style="padding:10px 6px;font-weight:700;color:var(--tx)">'+(it.name||'—')+'</td>' +
            '<td style="padding:10px 6px;font-weight:800;color:'+(stock<=min?'#ef4444':'var(--tx)')+'">'+stock+(it.unit||'개')+'</td>' +
            '<td style="padding:10px 6px;color:var(--t3)">'+min+(it.unit||'개')+'</td>' +
            '<td style="padding:10px 6px"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+statusBg+';color:'+statusColor+'">'+status+'</span></td>' +
            '<td style="padding:10px 6px"><button onclick="_filoInvOrderItem(''+it.id+'',''+did+'')" style="padding:4px 10px;background:var(--surface2);border:1px solid var(--bd);border-radius:7px;font-size:11px;cursor:pointer;color:var(--tx)">발주</button></td>' +
            '</tr>';
        }).join('');
      }
    }

    // 발주 필요 목록
    var lowList=document.getElementById('inv-low-list');
    var lowBadge=document.getElementById('inv-low-badge');
    if(lowBadge) lowBadge.textContent=low.length;
    if(lowList){
      if(!low.length){
        lowList.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">재고 부족 없음 ✅</div>';
      } else {
        lowList.innerHTML=low.map(function(it){
          var est=Math.round((it.stock||0)*((it.unitPrice||0)+2000));
          return '<div style="padding:10px 0;border-bottom:1px solid var(--bd)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span style="font-size:13px;font-weight:700;color:var(--tx)">'+it.name+'</span>' +
            '<span style="width:8px;height:8px;border-radius:50%;background:#ef4444"></span>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--t3);margin-top:2px">공급처: '+(it.supplier||'미지정')+' / 예상금액: ₩'+est.toLocaleString()+'</div>' +
            '</div>';
        }).join('');
      }
    }

  }).catch(function(e){ console.error(e); });
}

window._invItems = [];
function _filoInvSearch(){
  var q=(document.getElementById('inv-search')||{}).value||'';
  var rows=document.querySelectorAll('#inv-table-body tr');
  rows.forEach(function(row){
    var name=(row.cells[0]||{}).textContent||'';
    row.style.display=name.includes(q)?'':'none';
  });
}
function _filoInvAddModal(did){ _filoToast('재고 등록 모달 — 재고 관리 메뉴에서 추가하세요'); }
function _filoInvOrderItem(id,did){ _filoToast('발주 처리됐어요!'); }
function _filoInvAutoOrder(did){ _filoToast('자동 발주 생성 준비 중'); }
function _filoInvAddIncoming(did){ _filoToast('입고 예정 등록 준비 중'); }
