/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      dine-tax.js
 * @description 세금관리·비용관리·월별집계
 */
// dine.js에서 분리됨 (리팩토링 2026-07-13)

function _dineTax(el){
 var did=_CU.dealerId;
 var ym=new Date().toISOString().slice(0,7);
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';

 var ITEMS=[
  {key:'rent',   label:'임대료',     icon:'🏠', placeholder:'월세/전세 관련 비용'},
  {key:'elec',   label:'전기료',     icon:'⚡', placeholder:'전기 요금'},
  {key:'gas',    label:'가스비',     icon:'🔥', placeholder:'가스 요금'},
  {key:'water',  label:'수도료',     icon:'💧', placeholder:'수도 요금'},
  {key:'cardFee',label:'카드수수료', icon:'💳', placeholder:'POS 카드 수수료'},
  {key:'other',  label:'기타비용',   icon:'📦', placeholder:'소모품, 유니폼, 수리비 등'},
 ];

 var itemRows=ITEMS.map(function(it){
  var k=it.key;
  return '<div style="border:1px solid var(--bd);border-radius:10px;margin-bottom:8px;overflow:hidden">'+
   '<div class="tax-hd" data-k="'+k+'" style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;background:var(--s2)">'+
   '<span>'+it.icon+'</span><span style="flex:1;font-size:13px;font-weight:700">'+it.label+'</span>'+
   '<span id="tax-amt-preview-'+k+'" style="font-size:12px;color:var(--br);margin-right:8px"></span>'+
   '<span id="tax-arrow-'+k+'" style="font-size:11px;color:var(--t3)">▼</span></div>'+
   '<div id="tax-body-'+k+'" style="display:none;padding:12px 14px;background:var(--s1)">'+
   '<input id="tax-'+k+'" type="number" class="inp tax-inp" data-k="'+k+'" data-did="'+did+'" placeholder="'+it.placeholder+'" style="width:100%;margin-bottom:8px">'+
   '<div style="display:flex;gap:8px;align-items:center">'+
   '<label class="btn btn-sm" style="background:var(--s3);border:1px solid var(--bd);cursor:pointer;font-size:11px">'+
   '📎 영수증<input type="file" accept="image/*" class="tax-file" data-k="'+k+'" data-did="'+did+'" style="display:none"></label>'+
   '<span id="tax-receipt-badge-'+k+'" style="font-size:10px;color:var(--br)"></span>'+
   '</div></div></div>';
}).join('');
setTimeout(function(){
 document.querySelectorAll('.tax-hd').forEach(function(h){h.onclick=function(){_dineTaxToggle(this.dataset.k);};});
 document.querySelectorAll('.tax-inp').forEach(function(i){i.oninput=function(){_dineTaxPreview(this.dataset.k);_dineTaxSaveFixed(this.dataset.did);};});
 document.querySelectorAll('.tax-file').forEach(function(f){f.onchange=function(){_dineTaxUploadReceipt(this,this.dataset.did,this.dataset.k);};});
},100);

 wrap.innerHTML=
  '<div style="margin-bottom:16px"><div class="page-title">📂 세무사 공유</div><div class="page-sub">월별 정산 리포트 자동 생성</div></div>'+
  '<div style="display:flex;gap:8px;margin-bottom:14px;align-items:center;flex-wrap:wrap">'+
  '<input type="month" id="tax-ym" value="'+ym+'" class="inp" style="width:auto;padding:6px 10px;font-size:12px">'+
  '<button class="btn btn-primary btn-sm" data-did="'+did+'" onclick="_dineTaxGenerate(this.dataset.did)">리포트 생성</button>'+
  '</div>'+
  '<div class="card" style="margin-bottom:14px">'+
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'+
  '<div class="sec-title" style="margin:0">📋 월별 고정비용 <span style="font-size:10px;font-weight:400;color:var(--t3)">(금액 + 영수증 첨부)</span></div>'+
  '<div style="font-size:10px;color:var(--t3)">💾 자동저장</div>'+
  '</div>'+
  itemRows+
  '<div class="input-group" style="margin-top:8px;margin-bottom:0"><label>메모</label><input id="tax-memo" class="inp" placeholder="예) 인테리어 수리비 50만원" oninput="_dineTaxSaveFixed(\''+did+'\')"></div>'+
  '</div>'+
  '<div id="tax-result"><div style="text-align:center;padding:30px;color:var(--t3);font-size:12px">월을 선택 후 리포트 생성 버튼을 누르세요</div></div>';

 el.appendChild(wrap);
 _dineTaxLoadFixed(did);
}

var _taxReceiptUrls={};

function _dineTaxToggle(key){
 var body=document.getElementById('tax-body-'+key);
 var arrow=document.getElementById('tax-arrow-'+key);
 if(!body)return;
 var open=body.style.display==='block';
 body.style.display=open?'none':'block';
 if(arrow)arrow.textContent=open?'▼':'▲';
}

function _dineTaxPreview(key){
 var inp=document.getElementById('tax-'+key);
 var preview=document.getElementById('tax-amt-preview-'+key);
 if(!preview||!inp)return;
 var v=parseInt(inp.value)||0;
 preview.textContent=v?'₩'+v.toLocaleString():'';
}

function _dineTaxUploadReceipt(input,did,key){
 var file=input.files[0];if(!file)return;
 _dineToast('📤 업로드중...');
 var ts=Date.now();
 var path='receipts/'+did+'/tax/'+key+'_'+ts+'_'+file.name;
 var token=_dineToken||'';
 /* Firebase Storage REST API */
 var storageUrl='https://firebasestorage.googleapis.com/v0/b/mbti-logistics.appspot.com/o/'+encodeURIComponent(path)+'?uploadType=media';
 fetch(storageUrl,{method:'POST',headers:{'Content-Type':file.type,'Authorization':'Bearer '+token},body:file})
 .then(function(r){return r.json();})
 .then(function(d){
  if(!d.downloadTokens){_dineToast('❌ 업로드 실패');return;}
  var url='https://firebasestorage.googleapis.com/v0/b/mbti-logistics.appspot.com/o/'+encodeURIComponent(path)+'?alt=media&token='+d.downloadTokens;
  _taxReceiptUrls[key]=url;
  /* 배지 표시 */
  var badge=document.getElementById('tax-receipt-badge-'+key);
  var viewBtn=document.getElementById('tax-receipt-view-'+key);
  if(badge)badge.style.display='inline';
  if(viewBtn)viewBtn.style.display='inline';
  /* URL 저장 */
  _dineTaxSaveFixed(did);
  _dineToast('✅ 영수증 첨부됐습니다');
 }).catch(function(e){_dineToast('❌ '+e.message);});
}

function _dineTaxViewReceipt(key){
 var url=_taxReceiptUrls[key];
 if(url)window.open(url,'_blank');
}

function _dineTaxLoadFixed(did){
 fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/filo_settings/'+did+'_tax_fixed',{
  headers:{'Authorization':'Bearer '+(_dineToken||'')}
 }).then(function(r){return r.ok?r.json():null;}).then(function(doc){
  if(!doc||!doc.fields)return;
  var f=doc.fields;
  var map={rent:'tax-rent',elec:'tax-elec',gas:'tax-gas',water:'tax-water',cardFee:'tax-card-fee',other:'tax-other',memo:'tax-memo'};
  Object.keys(map).forEach(function(k){
   var el=document.getElementById(map[k]);
   if(!el||!f[k])return;
   el.value=f[k].integerValue||f[k].stringValue||'';
  });
  /* 영수증 URL 복원 */
  Object.keys(f).forEach(function(k){
   if(k.indexOf('receipt_')===0){
    var itemKey=k.replace('receipt_','');
    _taxReceiptUrls[itemKey]=f[k].stringValue;
    var badge=document.getElementById('tax-receipt-badge-'+itemKey);
    var viewBtn=document.getElementById('tax-receipt-view-'+itemKey);
    if(badge)badge.style.display='inline';
    if(viewBtn)viewBtn.style.display='inline';
   }
  });
 }).catch(function(){});
}

var _taxSaveTimer=null;
function _dineTaxSaveFixed(did){
 clearTimeout(_taxSaveTimer);
 _taxSaveTimer=setTimeout(function(){
  var fields={
   rent:{integerValue:parseInt(document.getElementById('tax-rent')?.value)||0},
   elec:{integerValue:parseInt(document.getElementById('tax-elec')?.value)||0},
   gas:{integerValue:parseInt(document.getElementById('tax-gas')?.value)||0},
   water:{integerValue:parseInt(document.getElementById('tax-water')?.value)||0},
   cardFee:{integerValue:parseInt(document.getElementById('tax-card-fee')?.value)||0},
   other:{integerValue:parseInt(document.getElementById('tax-other')?.value)||0},
   memo:{stringValue:document.getElementById('tax-memo')?.value||''},
   updatedAt:{stringValue:new Date().toISOString()}
  };
  /* 영수증 URL 추가 */
  Object.keys(_taxReceiptUrls).forEach(function(k){
   fields['receipt_'+k]={stringValue:_taxReceiptUrls[k]};
  });
  fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/filo_settings/'+did+'_tax_fixed',{
   method:'PATCH',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+(_dineToken||'')},
   body:JSON.stringify({fields:fields})
  }).then(function(r){if(r.ok)_dineToast('💾 저장됐습니다');})
  .catch(function(){});
 },800);
}

function _dineTaxGenerate(did){
 var ym=document.getElementById('tax-ym')?.value||new Date().toISOString().slice(0,7);
 var from=ym+'-01',to=ym+'-31';
 var res=document.getElementById('tax-result');
 if(!res)return;
 res.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3)">⏳ 생성중...</div>';

 Promise.all([
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('members').where('dealerId','==',did).get(),
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('inventory_in').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/filo_settings/'+did+'_tax_fixed',{headers:{'Authorization':'Bearer '+(_dineToken||'')}}).then(function(r){return r.json();})
 ]).then(function(results){
  var salesSnap=results[0],memSnap=results[1],attSnap=results[2],stockSnap=results[3],fixedDoc=results[4];
  var fixed={};if(fixedDoc&&fixedDoc.fields){var ff=fixedDoc.fields;Object.keys(ff).forEach(function(k){fixed[k]=ff[k].integerValue||ff[k].stringValue||0;});}
  var fixedRent=fixed.rent||0,fixedElec=fixed.elec||0,fixedGas=fixed.gas||0;
  var fixedWater=fixed.water||0,fixedCardFee=fixed['card-fee']||0,fixedOther=fixed.other||0;
  var fixedMemo=fixed.memo||'';
  var totalFixed=fixedRent+fixedElec+fixedGas+fixedWater+fixedCardFee+fixedOther;
  var totalSales=0,cnt=0,methods={};
  salesSnap.forEach(function(doc){var d=doc.data();if(d.status==='cancelled')return;totalSales+=d.total||0;cnt++;var pm=d.payMethod||'기타';methods[pm]=(methods[pm]||0)+(d.total||0);});

  var attMap={};
  attSnap.forEach(function(doc){var d=doc.data();if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[]};if(d.type==='in')attMap[d.memberId].ins.push(d);else attMap[d.memberId].outs.push(d);});

  var totalLabor=0;
  memSnap.forEach(function(doc){var m=doc.data();var r=_calcPayFull(m,attMap[doc.id]||{ins:[],outs:[]},memSnap.size,ym);totalLabor+=r.grossSalary;});

  /* 재료 구입비 집계 */
  var totalStock=0,stockBySupplier={},stockReceipts=[];
  stockSnap.forEach(function(doc){
   var d=doc.data();
   var amt=d.totalPrice||0;
   totalStock+=amt;
   var sup=d.supplier||'기타';
   stockBySupplier[sup]=(stockBySupplier[sup]||0)+amt;
   if(d.receiptUrl)stockReceipts.push({date:d.date,supplier:sup,amt:amt,url:d.receiptUrl,item:d.itemId||''});
  });

  var totalCost=totalLabor+totalStock+totalFixed;
  var profit=totalSales-totalCost;

  res.innerHTML='<div style="font-size:14px;font-weight:900;margin-bottom:14px;color:var(--t2)">📄 '+ym+' 세무사 리포트</div>'+
   '<div style="font-size:12px;line-height:2">'+
   '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)"><span>📅 정산 기간</span><span>'+from+' ~ '+to+'</span></div>'+
   '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:2px solid var(--bd)"><span style="font-weight:800">💰 총 매출</span><span style="font-weight:700;color:var(--gr)">₩'+totalSales.toLocaleString()+'</span></div>'+
   '<div style="padding:4px 0 2px;font-size:11px;color:var(--t3)">결제수단별</div>'+
   Object.entries(methods).map(function(m){return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);padding-left:12px"><span style="color:var(--t3)">└ '+m[0]+'</span><span>₩'+m[1].toLocaleString()+'</span></div>';}).join('')+
   '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd);margin-top:6px"><span>👥 인건비</span><span style="font-weight:700;color:var(--rd)">₩'+totalLabor.toLocaleString()+'</span></div>'+
   '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:2px solid var(--bd)"><span>🧂 재료 구입비</span><span style="font-weight:700;color:var(--rd)">₩'+totalStock.toLocaleString()+'</span></div>'+
   /* 고정비용 */
   (totalFixed>0?
   '<div style="padding:4px 0 2px;font-size:11px;color:var(--t3)">고정비용</div>'+
   (fixedRent?'<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);padding-left:12px"><span style="color:var(--t3)">└ 임대료</span><span style="color:var(--rd)">₩'+fixedRent.toLocaleString()+'</span></div>':'')+
   (fixedElec?'<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);padding-left:12px"><span style="color:var(--t3)">└ 전기료</span><span style="color:var(--rd)">₩'+fixedElec.toLocaleString()+'</span></div>':'')+
   (fixedGas?'<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);padding-left:12px"><span style="color:var(--t3)">└ 가스비</span><span style="color:var(--rd)">₩'+fixedGas.toLocaleString()+'</span></div>':'')+
   (fixedWater?'<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);padding-left:12px"><span style="color:var(--t3)">└ 수도료</span><span style="color:var(--rd)">₩'+fixedWater.toLocaleString()+'</span></div>':'')+
   (fixedCardFee?'<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);padding-left:12px"><span style="color:var(--t3)">└ 카드수수료</span><span style="color:var(--rd)">₩'+fixedCardFee.toLocaleString()+'</span></div>':'')+
   (fixedOther?'<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);padding-left:12px"><span style="color:var(--t3)">└ 기타비용</span><span style="color:var(--rd)">₩'+fixedOther.toLocaleString()+'</span></div>':'')+
   '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:2px solid var(--bd);font-weight:700"><span>💡 고정비용 합계</span><span style="color:var(--rd)">₩'+totalFixed.toLocaleString()+'</span></div>'
   :'')+
   (Object.entries(stockBySupplier).map(function(s){return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);padding-left:12px"><span style="color:var(--t3)">└ '+s[0]+'</span><span>₩'+s[1].toLocaleString()+'</span></div>';}).join(''))+
   (stockReceipts.length?'<div style="padding:6px 0;font-size:11px;color:var(--t3)">📎 영수증 '+stockReceipts.length+'건 첨부'+
    stockReceipts.map(function(r){return '<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0 3px 12px"><span style="color:var(--t3)">'+r.date+' '+r.supplier+'</span><a href="'+r.url+'" target="_blank" style="color:var(--br);font-size:10px">보기↗</a></div>';}).join('')+
    '</div>':'')+
   '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)"><span>📊 인건비율</span><span>'+(totalSales>0?Math.round(totalLabor/totalSales*100):0)+'%</span></div>'+
   '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;font-weight:900;border-top:2px solid var(--bd)"><span>💵 매출-비용 합계</span><span style="color:'+(profit>=0?'var(--gr)':'var(--rd)')+'">₩'+profit.toLocaleString()+'</span></div>'+
   '</div>'+
   '<button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="_dineToast(\'💬 세무사 알림톡 발송 기능 준비중\')">📤 세무사 발송</button>';
 });
}
