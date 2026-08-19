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
 ['₩','건','!','개'][i]+'</div>'+
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
 '<div style="font-size:13px;font-weight:800;color:#ef4444">재고 부족 '+lowStock.length+'개</div>'+
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
 '<div style="font-size:13px;font-weight:800;color:#f59e0b;margin-bottom:8px">7일 내 만료 '+expirySoon.length+'개</div>'+
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
 ''+
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
 '<span id="si-receipt-label">파일 선택</span>'+
 '<input id="si-receipt-input" type="file" accept="image/*,.pdf" style="display:none" onchange="_filoReceiptSelected(this)">'+
 '</label>'+
 '<div id="si-receipt-preview" style="display:none;width:48px;height:48px;border-radius:8px;overflow:hidden;border:1px solid var(--bd)">'+
 '<img id="si-receipt-img" style="width:100%;height:100%;object-fit:cover">'+
 '</div></div></div>'+
 '<button onclick="_filoDoStockIn()" class="btn btn-brand" style="width:100%">입고 등록</button>'+
 '</div>'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:10px;color:var(--t2)">최근 입고 이력</div>'+
 '<div id="si-history">'+
 '<div style="text-align:center;padding:30px;color:var(--t3)"><div style="animation:spin 1s linear infinite;display:inline-block"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></div></div>'+
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
   _filoToast('입고 완료 (+'+qty+'개)');
   document.getElementById('si-qty').value='';
   document.getElementById('si-price').value='';
   document.getElementById('si-memo').value='';
   if(receiptInput)receiptInput.value='';
   var lbl=document.getElementById('si-receipt-label');if(lbl)lbl.textContent='파일 선택';
   var pv=document.getElementById('si-receipt-preview');if(pv)pv.style.display='none';
   _filoLoadStockHistory(did,'si-history','in');
  }).catch(function(e){_filoToast(e.message);});
 }

 if(file){
  _filoToast('업로드 중...');
  var reader=new FileReader();
  reader.onload=function(e){
   var base64=e.target.result.split(',')[1];
   var path='receipts/'+did+'/'+now.toISOString().slice(0,10)+'-'+Date.now()+'.'+file.name.split('.').pop();
   /* getIdToken()은 Promise를 반환한다. 예전엔 이걸 그대로 JSON.stringify 해서
      idToken:{} 이 전송됐고 서버 인증이 항상 실패했다 → 토큰을 먼저 resolve 한다 */
   var _tokenP=(_auth&&_auth.currentUser)?_auth.currentUser.getIdToken():Promise.resolve('');
   _tokenP.catch(function(){return '';}).then(function(idToken){
    return fetch('/storage-upload',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({storagePath:path,base64data:base64,contentType:file.type,idToken:idToken||''})
    });
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
 ''+
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
 '<button onclick="_filoDoStockOut()" class="btn" style="width:100%;background:var(--red);color:#fff">출고 등록</button>'+
 '</div>'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:10px;color:var(--t2)">최근 출고 이력</div>'+
 '<div id="so-history">'+
 '<div style="text-align:center;padding:30px;color:var(--t3)">로딩 중...</div>'+
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
 /* 재고 확인과 차감을 트랜잭션으로 묶는다.
    기존엔 get()으로 확인한 뒤 별도로 increment(-qty)를 했기 때문에
    두 명이 동시에 출고하면 둘 다 확인을 통과해 재고가 음수가 될 수 있었다.
    출고 이력도 같은 트랜잭션에 넣어 '차감됐는데 이력이 없는' 상태를 막는다. */
 var _outRef=_db.collection('inventory_out').doc();
 _db.runTransaction(function(tx){
 var ref=_db.collection('inventory').doc(itemId);
 return tx.get(ref).then(function(snap){
 var cur=snap.exists?(snap.data().stock||0):0;
 if(cur<qty){var err=new Error('재고부족');err._stock=cur;throw err;}
 tx.update(ref,{stock:cur-qty,updatedAt:now.toISOString()});
 tx.set(_outRef,{
 dealerId:did,itemId:itemId,qty:qty,type:type,memo:memo,
 createdAt:now.toISOString(),date:now.toISOString().slice(0,10),
 createdBy:_CU.name||_CU.userId||''
 });
 });
 }).then(function(){
 _filoToast('출고 완료 (-'+qty+'개)');
 document.getElementById('so-qty').value='';
 document.getElementById('so-memo').value='';
 _filoLoadStockHistory(did,'so-history','out');
 }).catch(function(e){
 if(e&&typeof e._stock==='number')_filoToast('재고 부족 (현재 '+e._stock+'개)');
 else _filoToast((e&&e.message)||e);
 });
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
  alertBanner.style.cssText = 'background:linear-gradient(135deg,#fee2e2,#fecaca);border:1px solid #fca5a5;border-radius:14px;padding:14px 16px;margin-bottom:14px;align-items:center;gap:10px;display:none';
  alertBanner.innerHTML =
    '' +
    '<div><div style="font-size:13px;font-weight:800;color:#b91c1c" id="inv-alert-title">재고 부족 항목 있음</div>' +
    '<div style="font-size:11px;color:#ef4444;margin-top:2px" id="inv-alert-sub">공급처에 즉시 발주를 권장합니다</div></div>';
  wrap.appendChild(alertBanner);

  // ── KPI 4열 ──
  var kpi = document.createElement('div');
  kpi.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px';
  kpi.innerHTML = [
    {id:'inv-total-items', ic:'', lbl:'재료 목록',   c:'#0891b2', sub:'총 등록 재료'},
    {id:'inv-normal',      ic:'', lbl:'현재 재고',   c:'#059669', sub:'정상 재고'},
    {id:'inv-low',         ic:'', lbl:'발주 필요',   c:'#f59e0b', sub:'재고 부족 품목'},
    {id:'inv-incoming',    ic:'', lbl:'입고 예정',   c:'#c9a84c', sub:'이번 주'},
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
    '<button onclick="_filoInvAddModal(\''+did+'\')" style="padding:6px 12px;background:var(--br);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">+ 재고 등록</button>' +
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
    '<button onclick="_filoInvAutoOrder(\''+did+'\')" style="padding:5px 10px;background:#f59e0b;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">+ 발주 생성하기</button>' +
    '</div>' +
    '<div id="inv-low-list"><div style="color:var(--t3);font-size:12px;text-align:center;padding:20px">재고 부족 없음</div></div>';
  rightPanel.appendChild(lowCard);

  var incomingCard = document.createElement('div');
  incomingCard.className = 'card';
  incomingCard.style.cssText = 'padding:16px;border-radius:18px;flex:1';
  incomingCard.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:800;color:var(--t3)">입고 예정 <span id="inv-in-badge" style="background:#c9a84c;color:#fff;font-size:10px;padding:2px 7px;border-radius:10px;margin-left:4px">0</span></div>' +
    '<button onclick="_filoInvAddIncoming(\''+did+'\')" style="padding:5px 10px;background:#c9a84c;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">+ 발주 생성하기</button>' +
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
    if(banner){
      if(low.length>0){
        banner.style.display='flex';
        if(alertTitle) alertTitle.textContent=low[0].name+' 등 '+low.length+'개 항목 재고 부족';
        if(alertSub) alertSub.textContent='현재 '+low[0].name+' 재고가 최소 재고 미만입니다. 즉시 발주를 권장합니다';
      } else {
        banner.style.display='none';
      }
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
            '<td style="padding:10px 6px;font-weight:700;color:var(--tx)">'+esc(it.name||'—')+'</td>' +
            '<td style="padding:10px 6px;font-weight:800;color:'+(stock<=min?'#ef4444':'var(--tx)')+'">'+stock+(it.unit||'개')+'</td>' +
            '<td style="padding:10px 6px;color:var(--t3)">'+min+(it.unit||'개')+'</td>' +
            '<td style="padding:10px 6px"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+statusBg+';color:'+statusColor+'">'+status+'</span></td>' +
            '<td style="padding:10px 6px"><button onclick="_filoInvOrderItem(\''+it.id+'\',\''+did+'\')" style="padding:4px 10px;background:var(--surface2);border:1px solid var(--bd);border-radius:7px;font-size:11px;cursor:pointer;color:var(--tx)">발주</button></td>' +
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
        lowList.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">재고 부족 없음</div>';
      } else {
        lowList.innerHTML=low.map(function(it){
          var est=Math.round((it.stock||0)*((it.unitPrice||0)+2000));
          return '<div style="padding:10px 0;border-bottom:1px solid var(--bd)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span style="font-size:13px;font-weight:700;color:var(--tx)">'+esc(it.name)+'</span>' +
            '<span style="width:8px;height:8px;border-radius:50%;background:#ef4444"></span>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--t3);margin-top:2px">공급처: '+esc(it.supplier||'미지정')+' / 예상금액: ₩'+est.toLocaleString()+'</div>' +
            '</div>';
        }).join('');
      }
    }

    _filoInvLoadOrders(did);
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
// ── 입고 예정 발주 목록 로드 ─────────────────────────────────────
function _filoInvLoadOrders(did){
  firebase.firestore().collection('inventory_orders')
    .where('dealerId','==',did).where('status','==','pending')
    .orderBy('createdAt','desc').limit(30).get()
  .then(function(snap){
    var orders=snap.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
    var kpiEl=document.getElementById('inv-incoming');
    if(kpiEl) kpiEl.textContent=orders.length+'건';
    var badge=document.getElementById('inv-in-badge');
    if(badge) badge.textContent=orders.length;
    var list=document.getElementById('inv-incoming-list');
    if(!list) return;
    list.innerHTML=!orders.length
      ?'<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">입고 예정 없음</div>'
      :orders.map(function(o){
        return '<div style="padding:10px 0;border-bottom:1px solid var(--bd)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<span style="font-size:13px;font-weight:700;color:var(--tx)">'+esc(o.itemName||'')+'</span>' +
          '<span style="font-size:11px;font-weight:700;color:#c9a84c">'+o.orderQty+'개</span>' +
          '</div>' +
          '<div style="font-size:11px;color:var(--t3);margin-top:2px">공급처: '+esc(o.supplier||'미지정')+(o.dueDate?' / 예정: '+o.dueDate:'')+'</div>' +
          '</div>';
      }).join('');
  }).catch(function(e){ console.error(e); });
}

// ── 재고 항목 등록 모달 ────────────────────────────────────────────
function _filoInvAddModal(did){
  var ex=document.getElementById('inv-add-modal'); if(ex) ex.remove();
  var m=document.createElement('div');
  m.id='inv-add-modal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML='<div class="card" style="border-radius:20px;padding:24px;max-width:400px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,.4)">' +
    '<div style="font-size:15px;font-weight:800;color:var(--tx);margin-bottom:16px">재고 항목 등록</div>' +
    '<div style="display:flex;flex-direction:column;gap:10px">' +
    '<input id="im-name" placeholder="재료명 *" style="padding:10px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    '<input id="im-stock" type="number" placeholder="현재 수량" min="0" style="padding:10px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px">' +
    '<input id="im-min" type="number" placeholder="최소 재고" min="0" style="padding:10px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px">' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    '<input id="im-unit" placeholder="단위(개/kg/L)" style="padding:10px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px">' +
    '<input id="im-price" type="number" placeholder="단가(원)" min="0" style="padding:10px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px">' +
    '</div>' +
    '<input id="im-supplier" placeholder="공급처" style="padding:10px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px">' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
    '<button onclick="document.getElementById(\'inv-add-modal\').remove()" style="flex:1;padding:11px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">취소</button>' +
    '<button onclick="_filoInvDoAdd(\''+did+'\')" style="flex:2;padding:11px;background:var(--br,#0891b2);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">등록</button>' +
    '</div></div>';
  document.body.appendChild(m);
  setTimeout(function(){ var n=document.getElementById('im-name'); if(n) n.focus(); },50);
}

function _filoInvDoAdd(did){
  var name=(document.getElementById('im-name')||{}).value||'';
  var stock=parseInt((document.getElementById('im-stock')||{}).value||'0')||0;
  var min=parseInt((document.getElementById('im-min')||{}).value||'5')||5;
  var unit=(document.getElementById('im-unit')||{}).value||'개';
  var price=parseInt((document.getElementById('im-price')||{}).value||'0')||0;
  var supplier=(document.getElementById('im-supplier')||{}).value||'';
  if(!name.trim()){ _filoToast('재료명을 입력하세요'); return; }
  firebase.firestore().collection('inventory').add({
    dealerId:did, name:name.trim(), stock:stock, minStock:min,
    unit:unit, unitPrice:price, supplier:supplier,
    createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()
  }).then(function(){
    _filoToast(name+' 등록 완료');
    var m=document.getElementById('inv-add-modal'); if(m) m.remove();
    _filoInvDashLoad(did);
  }).catch(function(e){ _filoToast((e&&e.message)||'오류 발생'); });
}

// ── 개별 발주 등록 모달 ────────────────────────────────────────────
function _filoInvOrderItem(itemId,did){
  firebase.firestore().collection('inventory').doc(itemId).get().then(function(doc){
    if(!doc.exists){ _filoToast('항목을 찾을 수 없습니다'); return; }
    var it=doc.data();
    var needed=Math.max(1,(it.minStock||5)*2-(it.stock||0));
    var ex=document.getElementById('inv-order-modal'); if(ex) ex.remove();
    var m=document.createElement('div');
    m.id='inv-order-modal';
    m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    m.innerHTML='<div class="card" style="border-radius:20px;padding:24px;max-width:380px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,.4)">' +
      '<div style="font-size:15px;font-weight:800;color:var(--tx);margin-bottom:4px">발주 등록</div>' +
      '<div style="font-size:12px;color:var(--t3);margin-bottom:16px">현재 재고: '+(it.stock||0)+(it.unit||'개')+' / 최소재고: '+(it.minStock||5)+(it.unit||'개')+'</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<div style="padding:10px 14px;background:rgba(255,255,255,.05);border-radius:10px;font-size:13px;font-weight:700;color:var(--tx)">'+esc(it.name||'')+'</div>' +
      '<input id="io-qty" type="number" value="'+needed+'" min="1" placeholder="발주 수량 *" style="padding:10px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px">' +
      '<input id="io-supplier" value="'+esc(it.supplier||'')+'" placeholder="공급처" style="padding:10px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px">' +
      '<input id="io-memo" placeholder="메모" style="padding:10px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx);font-size:13px">' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:16px">' +
      '<button onclick="document.getElementById(\'inv-order-modal\').remove()" style="flex:1;padding:11px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">취소</button>' +
      '<button onclick="_filoInvDoOrder(\''+itemId+'\',\''+did+'\',\''+esc(it.name||'')+'\')" style="flex:2;padding:11px;background:#f59e0b;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">발주 등록</button>' +
      '</div></div>';
    document.body.appendChild(m);
  }).catch(function(e){ _filoToast((e&&e.message)||'오류'); });
}

function _filoInvDoOrder(itemId,did,itemName){
  var qty=parseInt((document.getElementById('io-qty')||{}).value||'0')||0;
  var supplier=(document.getElementById('io-supplier')||{}).value||'';
  var memo=(document.getElementById('io-memo')||{}).value||'';
  if(qty<1){ _filoToast('수량을 입력하세요'); return; }
  var now=new Date();
  var due=new Date(now); due.setDate(due.getDate()+3);
  firebase.firestore().collection('inventory_orders').add({
    dealerId:did, itemId:itemId, itemName:itemName,
    orderQty:qty, supplier:supplier, memo:memo, status:'pending',
    createdAt:now.toISOString(), dueDate:due.toISOString().slice(0,10),
    createdBy:(_CU&&(_CU.name||_CU.userId))||''
  }).then(function(){
    _filoToast(itemName+' 발주 등록 완료 ('+qty+'개)');
    var m=document.getElementById('inv-order-modal'); if(m) m.remove();
    _filoInvDashLoad(did);
  }).catch(function(e){ _filoToast((e&&e.message)||'오류'); });
}

// ── 부족 재고 전체 자동 발주 ──────────────────────────────────────
function _filoInvAutoOrder(did){
  firebase.firestore().collection('inventory').where('dealerId','==',did).get()
  .then(function(snap){
    var low=[];
    snap.docs.forEach(function(doc){
      var d=Object.assign({id:doc.id},doc.data());
      if((d.stock||0)<=(d.minStock||5)) low.push(d);
    });
    if(!low.length){ _filoToast('발주가 필요한 재고가 없습니다'); return; }
    var db=firebase.firestore();
    var batch=db.batch();
    var now=new Date();
    var due=new Date(now); due.setDate(due.getDate()+3);
    low.forEach(function(it){
      var qty=Math.max(1,(it.minStock||5)*2-(it.stock||0));
      var ref=db.collection('inventory_orders').doc();
      batch.set(ref,{
        dealerId:did, itemId:it.id, itemName:it.name||'',
        orderQty:qty, supplier:it.supplier||'', memo:'자동 발주', status:'pending', isAuto:true,
        createdAt:now.toISOString(), dueDate:due.toISOString().slice(0,10),
        createdBy:(_CU&&(_CU.name||_CU.userId))||''
      });
    });
    batch.commit().then(function(){
      _filoToast('자동 발주 완료 ('+low.length+'건)');
      _filoInvDashLoad(did);
    }).catch(function(e){ _filoToast((e&&e.message)||'오류'); });
  }).catch(function(e){ _filoToast((e&&e.message)||'오류'); });
}

// ── 입고 처리 모달 (발주 확인 후 재고 반영) ──────────────────────
function _filoInvAddIncoming(did){
  firebase.firestore().collection('inventory_orders')
    .where('dealerId','==',did).where('status','==','pending')
    .orderBy('createdAt','desc').limit(20).get()
  .then(function(snap){
    var orders=snap.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
    var ex=document.getElementById('inv-incoming-modal'); if(ex) ex.remove();
    var m=document.createElement('div');
    m.id='inv-incoming-modal';
    m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    var listHtml=!orders.length
      ?'<div style="color:var(--t3);font-size:13px;text-align:center;padding:20px">대기중인 발주가 없습니다</div>'
      :orders.map(function(o){
        return '<label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd);cursor:pointer">' +
          '<input type="checkbox" name="ii-order" value="'+o.id+'" data-qty="'+o.orderQty+'" data-item="'+o.itemId+'" data-name="'+esc(o.itemName||'')+'" style="width:16px;height:16px;flex-shrink:0">' +
          '<div><div style="font-size:13px;font-weight:700;color:var(--tx)">'+esc(o.itemName||'')+'</div>' +
          '<div style="font-size:11px;color:var(--t3)">발주 '+o.orderQty+'개 / 공급처: '+esc(o.supplier||'미지정')+'</div></div>' +
          '</label>';
      }).join('');
    m.innerHTML='<div class="card" style="border-radius:20px;padding:24px;max-width:420px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.4)">' +
      '<div style="font-size:15px;font-weight:800;color:var(--tx);margin-bottom:16px">입고 처리</div>' +
      '<div id="ii-order-list">'+listHtml+'</div>' +
      (orders.length
        ?'<div style="display:flex;gap:8px;margin-top:16px">' +
          '<button onclick="document.getElementById(\'inv-incoming-modal\').remove()" style="flex:1;padding:11px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">취소</button>' +
          '<button onclick="_filoInvDoIncoming(\''+did+'\')" style="flex:2;padding:11px;background:#c9a84c;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">입고 확인</button>' +
          '</div>'
        :'<button onclick="document.getElementById(\'inv-incoming-modal\').remove()" style="width:100%;margin-top:16px;padding:11px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">닫기</button>') +
      '</div>';
    document.body.appendChild(m);
  }).catch(function(e){ _filoToast((e&&e.message)||'오류'); });
}

function _filoInvDoIncoming(did){
  var checked=document.querySelectorAll('input[name="ii-order"]:checked');
  if(!checked.length){ _filoToast('입고할 항목을 선택하세요'); return; }
  var db=firebase.firestore();
  var batch=db.batch();
  var now=new Date();
  var count=0;
  checked.forEach(function(cb){
    var orderId=cb.value;
    var qty=parseInt(cb.getAttribute('data-qty'))||0;
    var itemId=cb.getAttribute('data-item');
    var itemName=cb.getAttribute('data-name');
    if(!qty||!itemId) return;
    count++;
    batch.update(db.collection('inventory_orders').doc(orderId),{status:'done',receivedAt:now.toISOString()});
    batch.update(db.collection('inventory').doc(itemId),{
      stock:firebase.firestore.FieldValue.increment(qty),
      updatedAt:now.toISOString()
    });
    var inRef=db.collection('inventory_in').doc();
    batch.set(inRef,{
      dealerId:did, itemId:itemId, itemName:itemName, qty:qty, type:'incoming',
      createdAt:now.toISOString(), date:now.toISOString().slice(0,10),
      createdBy:(_CU&&(_CU.name||_CU.userId))||''
    });
  });
  batch.commit().then(function(){
    _filoToast('입고 처리 완료 ('+count+'건)');
    var m=document.getElementById('inv-incoming-modal'); if(m) m.remove();
    _filoInvDashLoad(did);
  }).catch(function(e){ _filoToast((e&&e.message)||'오류'); });
}
