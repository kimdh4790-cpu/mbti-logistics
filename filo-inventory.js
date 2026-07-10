// filo-inventory.js - 재고 현황, 입출고, 자동발주
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

 var today=new Date().toISOString().slice(0,10);
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
