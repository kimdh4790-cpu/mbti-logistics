/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      dine-sales.js
 * @description 매출관리·배달정산·기간통계
 */
// dine.js에서 분리됨 (리팩토링 2026-07-13)

function _dineSales(el){
 var did=_CU.dealerId;
 var today=new Date().toISOString().slice(0,10);
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">🛒 POS 매출</div><div class="page-sub attend-live"><span class="live-dot"></span>FILO POS 실시간 연동</div></div>'+
  '<input type="date" id="sales-date" value="'+today+'" class="inp" style="width:auto;padding:6px 10px;font-size:12px" onchange="_dineLoadSales(\''+did+'\')">'+
  '</div>'+
  '<div id="sales-kpi" class="kpi-grid" style="grid-template-columns:repeat(3,1fr)"></div>'+
  '<div class="card" id="sales-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩중</div></div>';
 el.appendChild(wrap);
 _dineLoadSales(did);
}

function _dineLoadSales(did){
 var date=document.getElementById('sales-date')?.value||new Date().toISOString().slice(0,10);
 _db.collection('filo_sales').where('dealerId','==',did).where('date','==',date).get()
  .then(function(snap){
   var total=0,cnt=0,methods={};
   snap.forEach(function(doc){
    var d=doc.data();if(d.status==='cancelled')return;
    total+=d.total||0;cnt++;
    var pm=d.payMethod||'기타';methods[pm]=(methods[pm]||0)+(d.total||0);
   });
   var kpi=document.getElementById('sales-kpi');
   if(kpi)kpi.innerHTML=
    '<div class="kpi-card" style="border-top:2px solid #38bdf8"><div class="kpi-label">💰 총 매출</div><div class="kpi-val" style="color:#38bdf8">₩'+total.toLocaleString()+'</div><div class="kpi-sub">'+cnt+'건</div></div>'+
    '<div class="kpi-card" style="border-top:2px solid #22c55e"><div class="kpi-label">🛒 주문 건수</div><div class="kpi-val" style="color:#22c55e">'+cnt+'건</div><div class="kpi-sub">평균 ₩'+(cnt?Math.round(total/cnt).toLocaleString():0)+'</div></div>'+
    '<div class="kpi-card" style="border-top:2px solid #a78bfa"><div class="kpi-label">💳 주요 결제</div><div class="kpi-val" style="color:#a78bfa;font-size:14px">'+(Object.entries(methods).sort(function(a,b){return b[1]-a[1];})[0]?.[0]||'-')+'</div><div class="kpi-sub">최다 결제수단</div></div>';

   var list=document.getElementById('sales-list');
   if(!list)return;
   if(!cnt){list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3);font-size:12px">'+date+' 매출 없음</div>';return;}
   var orders=[];
   snap.forEach(function(doc){var d=doc.data();if(d.status!=='cancelled')orders.push(d);});
   orders.sort(function(a,b){return (b.createdAt||'')>(a.createdAt||'')?1:-1;});
   list.innerHTML='<div class="sec-title" style="margin-bottom:10px">주문 내역</div>'+
    orders.map(function(o){
     var t=new Date(o.createdAt||o.date+'T12:00:00');
     return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);font-size:12px">'+
      '<span style="color:var(--t3)">'+t.toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'})+'</span>'+
      '<span style="flex:1">'+(o.tableName||o.payMethod||'')+'</span>'+
      '<span style="font-weight:700;color:var(--gr)">₩'+(o.total||0).toLocaleString()+'</span>'+
      '</div>';
    }).join('');
  });
}


function _dineDelivery(el){
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="margin-bottom:16px"><div class="page-title">🛵 배달앱 정산</div><div class="page-sub">배민·쿠팡이츠·요기요 엑셀 업로드</div></div>'+
  '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">'+
  '<label style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:var(--s2);border:1px solid var(--bd2);border-radius:10px;cursor:pointer;font-size:13px;font-weight:700">'+
  '<span>🟢 배민 엑셀</span><input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="_dineParseDelivery(this,\'baemin\')">'+
  '</label>'+
  '<label style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:var(--s2);border:1px solid var(--bd2);border-radius:10px;cursor:pointer;font-size:13px;font-weight:700">'+
  '<span>🔴 쿠팡이츠 엑셀</span><input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="_dineParseDelivery(this,\'coupang\')">'+
  '</label>'+
  '<label style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:var(--s2);border:1px solid var(--bd2);border-radius:10px;cursor:pointer;font-size:13px;font-weight:700">'+
  '<span>🟡 요기요 엑셀</span><input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="_dineParseDelivery(this,\'yogiyo\')">'+
  '</label>'+
  '</div>'+
  '<div id="delivery-result" class="card"><div style="text-align:center;padding:30px;color:var(--t3);font-size:12px">배달앱 정산서 엑셀을 업로드하면 자동 파싱됩니다</div></div>';
 el.appendChild(wrap);
}

function _dineParseDelivery(input,platform){
 var file=input.files[0];if(!file)return;
 _dineToast('⏳ 파싱중...');
 var reader=new FileReader();
 reader.onload=function(e){
  try{
   var data=new Uint8Array(e.target.result);
   var wb=XLSX.read(data,{type:'array'});
   var ws=wb.Sheets[wb.SheetNames[0]];
   var rows=XLSX.utils.sheet_to_json(ws,{defval:''});
   if(!rows.length){_dineToast('❌ 데이터 없음');return;}
   var result={platform:platform,orders:[],total:0,fee:0,cancel:0,net:0};
   function norm(s){return String(s||'').replace(/[\s\(\)]/g,'').toLowerCase();}
   function toNum(v){return parseInt(String(v||'0').replace(/[^0-9\-]/g,''))||0;}
   rows.forEach(function(row){
    var keys=Object.keys(row);
    var kmap={};keys.forEach(function(k){kmap[norm(k)]=k;});
    if(platform==='baemin'){
     var dateKey=kmap['주문일시']||kmap['주문일자']||kmap['날짜'];
     var typeKey=kmap['매출구분']||kmap['구분']||kmap['주문구분'];
     var amtKey=kmap['합계']||kmap['매출금액']||kmap['결제금액']||kmap['주문금액'];
     var feeKey=kmap['수수료']||kmap['배달수수료']||kmap['중개수수료'];
     if(!amtKey)return;
     var amt=toNum(row[amtKey]);
     var fee=feeKey?toNum(row[feeKey]):0;
     var type=typeKey?String(row[typeKey]||''):'';
     if(type.includes('취소')||amt<0||amt===0)return;
     result.total+=amt;result.fee+=Math.abs(fee);
     result.orders.push({date:dateKey?String(row[dateKey]||'').slice(0,10):'',amt:amt,fee:Math.abs(fee),type:type});
    } else if(platform==='coupang'){
     var dateKey=kmap['주문일자']||kmap['주문일시']||kmap['날짜'];
     var amtKey=kmap['주문금액']||kmap['결제금액']||kmap['총주문금액']||kmap['총결제금액'];
     var feeKey=kmap['수수료']||kmap['중개수수료']||kmap['서비스수수료'];
     var cancelKey=kmap['취소금액']||kmap['취소'];
     var netKey=kmap['정산금액']||kmap['정산예정금액'];
     var amt=toNum(row[amtKey])||toNum(row[netKey]);
     var fee=feeKey?Math.abs(toNum(row[feeKey])):0;
     var cancel=cancelKey?toNum(row[cancelKey]):0;
     if(cancel>0||amt<=0)return;
     result.total+=amt;result.fee+=fee;result.cancel+=cancel;
     result.orders.push({date:dateKey?String(row[dateKey]||'').slice(0,10):'',amt:amt,fee:fee});
    } else if(platform==='yogiyo'){
     var dateKey=kmap['주문일']||kmap['주문일시']||kmap['날짜'];
     var amtKey=kmap['주문금액']||kmap['결제금액']||kmap['총결제금액']||kmap['총주문금액'];
     var feeKey=kmap['수수료']||kmap['서비스수수료']||kmap['중개수수료'];
     var discountKey=kmap['할인']||kmap['쿠폰할인']||kmap['할인금액'];
     var netKey=kmap['정산금액']||kmap['정산예정금액'];
     var amt=toNum(row[amtKey])||toNum(row[netKey]);
     var fee=feeKey?Math.abs(toNum(row[feeKey])):0;
     var discount=discountKey?toNum(row[discountKey]):0;
     if(amt<=0)return;
     result.total+=amt;result.fee+=fee;
     result.orders.push({date:dateKey?String(row[dateKey]||'').slice(0,10):'',amt:amt,fee:fee,discount:discount});
    }
   });
   result.net=result.total-result.fee-result.cancel;
   _dineShowDeliveryResult(result);
   _dineToast('✅ '+result.orders.length+'건 파싱 완료');
  }catch(e){_dineToast('❌ 파싱 오류: '+e.message);console.error(e);}
 };
 reader.readAsArrayBuffer(file);
}

function _dineShowDeliveryResult(r){
 var el=document.getElementById('delivery-result');
 if(!el)return;
 var name={'baemin':'🟢 배달의민족','coupang':'🔴 쿠팡이츠','yogiyo':'🟡 요기요'}[r.platform]||r.platform;
 var color={'baemin':'#22c55e','coupang':'#ef4444','yogiyo':'#f59e0b'}[r.platform]||'#38bdf8';
 var byDate={};
 r.orders.forEach(function(o){var d=o.date||'미상';byDate[d]=(byDate[d]||0)+o.amt;});
 var dateRows=Object.entries(byDate).sort(function(a,b){return a[0]<b[0]?-1:1;});
 var box=document.createElement('div');
 box.style.cssText='border:2px solid '+color+';border-radius:12px;padding:16px;margin-bottom:12px';
 box.innerHTML=
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'+
  '<div style="font-size:14px;font-weight:800;color:'+color+'">'+name+'</div>'+
  '<div style="font-size:11px;color:var(--t3)">'+r.orders.length+'건</div></div>'+
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">'+
  '<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">'+
  '<div style="font-size:10px;color:var(--t3);margin-bottom:3px">총 주문금액</div>'+
  '<div style="font-size:15px;font-weight:800;color:'+color+'">₩'+r.total.toLocaleString()+'</div></div>'+
  '<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">'+
  '<div style="font-size:10px;color:var(--t3);margin-bottom:3px">수수료</div>'+
  '<div style="font-size:15px;font-weight:800;color:#ef4444">-₩'+r.fee.toLocaleString()+'</div></div>'+
  '<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">'+
  '<div style="font-size:10px;color:var(--t3);margin-bottom:3px">순정산액</div>'+
  '<div style="font-size:15px;font-weight:800;color:#22c55e">₩'+r.net.toLocaleString()+'</div></div></div>'+
  '<div style="font-size:11px;color:var(--t3);margin-bottom:6px">날짜별 내역</div>'+
  '<div style="max-height:160px;overflow-y:auto">'+
  dateRows.map(function(e){
   return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);font-size:12px">'+
    '<span>'+e[0]+'</span><span style="font-weight:700">₩'+e[1].toLocaleString()+'</span></div>';
  }).join('')+'</div>'+
  '<button style="margin-top:10px;width:100%;padding:8px;background:'+color+'22;border:1px solid '+color+'44;border-radius:8px;color:'+color+';font-size:12px;font-weight:700;cursor:pointer" '+
  'data-r="'+btoa(unescape(encodeURIComponent(JSON.stringify(r))))+'" onclick="_dineSaveDeliveryData(JSON.parse(decodeURIComponent(escape(atob(this.dataset.r)))))">💾 매출분석에 저장</button>';
 el.innerHTML='';
 el.appendChild(box);
}

function _dineSaveDeliveryData(r){
 var did=_CU.dealerId;
 var promises=r.orders.slice(0,200).map(function(o){
  return fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/filo_sales',{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+(_dineToken||'')},
   body:JSON.stringify({fields:{
    dealerId:{stringValue:did},platform:{stringValue:r.platform},
    date:{stringValue:o.date||new Date().toISOString().slice(0,10)},
    total:{integerValue:o.amt},fee:{integerValue:o.fee||0},
    status:{stringValue:'completed'},payMethod:{stringValue:r.platform},
    source:{stringValue:'excel_import'},
    createdAt:{stringValue:(o.date?o.date+'T12:00:00.000Z':new Date().toISOString())}
   }})
  });
 });
 Promise.all(promises).then(function(){
  _dineToast('✅ '+r.orders.length+'건 저장! 매출분석에 반영됩니다.');
 }).catch(function(e){_dineToast('❌ 저장 실패: '+e.message);});
}


function _dineSettle(el){
 var did=_CU.dealerId;
 var now=new Date();
 var ym=now.toISOString().slice(0,7);
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">📑 월 정산</div><div class="page-sub">POS 매출 + 배달 매출 + 인건비 통합</div></div>'+
  '<div style="display:flex;gap:8px">'+
  '<input type="month" id="settle-ym" value="'+ym+'" class="inp" style="width:auto;padding:6px 10px;font-size:12px">'+
  '<button class="btn btn-primary btn-sm" onclick="_dineCalcSettle(\''+did+'\')">정산</button>'+
  '</div></div>'+
  '<div id="settle-result"><div style="text-align:center;padding:40px;color:var(--t3)">월을 선택 후 정산 버튼을 누르세요</div></div>';
 el.appendChild(wrap);
}

function _dineCalcSettle(did){
 var ym=document.getElementById('settle-ym')?.value||new Date().toISOString().slice(0,7);
 var from=ym+'-01',to=ym+'-31';
 var res=document.getElementById('settle-result');
 if(!res)return;
 res.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">⏳ 정산 계산중...</div>';

 Promise.all([
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(results){
  var salesSnap=results[0],attSnap=results[1],memSnap=results[2];

  var totalSales=0;salesSnap.forEach(function(doc){var d=doc.data();if(d.status!=='cancelled')totalSales+=d.total||0;});

  var attMap={};
  attSnap.forEach(function(doc){var d=doc.data();if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[]};if(d.type==='in')attMap[d.memberId].ins.push(d);else attMap[d.memberId].outs.push(d);});

  var totalLabor=0;
  memSnap.forEach(function(doc){var m=doc.data();var r=_calcPayFull(m,attMap[doc.id]||{ins:[],outs:[]},memSnap.size,ym);totalLabor+=r.grossSalary;});

  var laborRate=totalSales>0?Math.round(totalLabor/totalSales*100):0;
  var profit=totalSales-totalLabor;

  res.innerHTML='<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">'+
   '<div class="kpi-card" style="border-top:2px solid #38bdf8"><div class="kpi-label">💰 총 매출</div><div class="kpi-val" style="color:#38bdf8">₩'+totalSales.toLocaleString()+'</div><div class="kpi-sub">POS 매출</div></div>'+
   '<div class="kpi-card" style="border-top:2px solid #ef4444"><div class="kpi-label">👥 인건비</div><div class="kpi-val" style="color:#ef4444">₩'+totalLabor.toLocaleString()+'</div><div class="kpi-sub">'+memSnap.size+'명 기준</div></div>'+
   '<div class="kpi-card" style="border-top:2px solid #f59e0b"><div class="kpi-label">📈 인건비율</div><div class="kpi-val" style="color:#f59e0b">'+laborRate+'%</div><div class="kpi-sub">'+(laborRate<30?'✅ 양호':laborRate<35?'⚠️ 주의':'❌ 과다')+'</div></div>'+
   '<div class="kpi-card" style="border-top:2px solid #22c55e"><div class="kpi-label">💵 인건비 차감</div><div class="kpi-val" style="color:#22c55e">₩'+profit.toLocaleString()+'</div><div class="kpi-sub">매출-인건비</div></div>'+
   '</div>'+
   '<div class="card"><div style="font-size:12px;color:var(--t2)">'+
   '💡 배달앱 매출은 배달앱 정산 탭에서 엑셀 업로드 후 자동 합산됩니다.<br>'+
   '외식업 적정 인건비율: <b style="color:var(--gr)">25~30%</b> (매출 대비)</div></div>';
 });
}


function _dineStore(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="margin-bottom:16px"><div class="page-title">🏪 매장 설정</div><div class="page-sub">매장 정보 및 근로 기준 설정</div></div>'+
  '<div class="card" id="store-form"><div style="text-align:center;padding:20px;color:var(--t3)">⏳ 로딩중...</div></div>';
 el.appendChild(wrap);

 /* REST API로 companies 조회 */
 fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery',{
  method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(_dineToken||'')},
  body:JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{fieldFilter:{field:{fieldPath:'uid'},op:'EQUAL',value:{stringValue:did}}},limit:1}})
 }).then(function(r){return r.json();}).then(function(rows){
  var co={};
  if(rows&&rows[0]&&rows[0].document){
   var f=rows[0].document.fields||{};
   Object.keys(f).forEach(function(k){co[k]=(f[k].stringValue||f[k].integerValue||f[k].doubleValue||'');});
  }
  var box=document.getElementById('store-form');if(!box)return;
  box.innerHTML='<div class="sec-title" style="margin-bottom:12px">매장 기본 정보</div>'+
   '<div class="input-group"><label>매장명</label><input id="st-storeName" class="inp" value="'+(co.storeName||co.name||'')+'"></div>'+
   '<div class="input-group"><label>URL 슬러그 <span style="font-size:10px;color:var(--t3)">(예: mbti)</span></label>'+
   '<input id="st-dineSlug" class="inp" value="'+(co.dineSlug||'')+'" placeholder="예) mbti">'+
   '<div style="margin-top:4px;font-size:10px;color:var(--br)">접속 URL: dine.ne.kr/'+(co.dineSlug||'슬러그')+'</div></div>'+
   '<div class="input-group"><label>사업자번호</label><input id="st-bizNo" class="inp" value="'+(co.bizNo||'')+'"></div>'+
   '<div class="input-group"><label>주소</label><input id="st-address" class="inp" value="'+(co.address||'')+'"></div>'+
   '<div class="input-group"><label>전화번호</label><input id="store-phone" class="inp" type="tel" value="'+(co.phone||'')+'"></div>'+
   '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'+
   '<div class="input-group" style="margin:0"><label>직원수(5인기준)</label><input id="st-empCount" class="inp" type="number" value="'+(co.empCount||5)+'"></div>'+
   '<div class="input-group" style="margin:0"><label>기본 시급</label><input id="st-defaultWage" class="inp" type="number" value="'+(co.defaultWage||10320)+'"></div>'+
   '<div class="input-group" style="margin:0"><label>급여일</label><input id="st-payDate" class="inp" type="number" value="'+(co.payDate||25)+'"></div>'+
   '</div>'+
   '<button class="btn btn-primary" style="margin-top:12px" data-did="'+did+'" onclick="_dineSaveStore(this.dataset.did)">저장</button>';
 }).catch(function(){
  var box=document.getElementById('store-form');
  if(box)box.innerHTML='<div style="color:var(--t3);font-size:12px">⚠️ 정보를 불러올 수 없습니다. 직접 입력해주세요.</div>'+
   '<div class="input-group" style="margin-top:12px"><label>매장명</label><input id="store-storeName" class="inp"></div>'+
   '<div class="input-group"><label>URL 슬러그</label><input id="store-dineSlug" class="inp" placeholder="예) mbti"></div>'+
   '<div class="input-group"><label>사업자번호</label><input id="store-bizNo" class="inp"></div>'+
   '<div class="input-group"><label>주소</label><input id="store-address" class="inp"></div>'+
   '<div class="input-group"><label>전화번호</label><input id="reg-phone" class="inp" type="tel"></div>'+
   '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'+
   '<div class="input-group" style="margin:0"><label>직원수</label><input id="store-empCount" class="inp" type="number" value="5"></div>'+
   '<div class="input-group" style="margin:0"><label>기본 시급</label><input id="store-defaultWage" class="inp" type="number" value="10320"></div>'+
   '<div class="input-group" style="margin:0"><label>급여일</label><input id="store-payDate" class="inp" type="number" value="25"></div>'+
   '</div>'+
   '<button class="btn btn-primary" style="margin-top:12px" data-did="'+did+'" onclick="_dineSaveStore(this.dataset.did)">저장</button>';
 });
}

function _dineSaveStore(did){
 var data={
  uid:did,dealerId:did,
  storeName:document.getElementById('st-storeName')?.value||'',
  dineSlug:document.getElementById('st-dineSlug')?.value.trim()||'',
  bizNo:document.getElementById('st-bizNo')?.value||'',
  address:document.getElementById('st-address')?.value||'',
  phone:document.getElementById('st-phone')?.value||'',
  empCount:parseInt(document.getElementById('st-empCount')?.value)||5,
  defaultWage:parseInt(document.getElementById('st-defaultWage')?.value)||MIN_WAGE,
  payDate:parseInt(document.getElementById('st-payDate')?.value)||25,
  updatedAt:new Date().toISOString()
 };
 /* REST API PATCH */
 var fields={};
 Object.keys(data).forEach(function(k){
  var v=data[k];
  if(typeof v==='number')fields[k]={integerValue:v};
  else fields[k]={stringValue:v};
 });
 fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/companies/'+did+'?updateMask.fieldPaths='+Object.keys(data).join('&updateMask.fieldPaths='),{
  method:'PATCH',
  headers:{'Content-Type':'application/json','Authorization':'Bearer '+(_dineToken||'')},
  body:JSON.stringify({fields:fields})
 }).then(function(r){
  if(r.ok){_dineToast('✅ 저장됐습니다');}
  else{return r.json().then(function(e){_dineToast('❌ '+(e.error&&e.error.message||'저장 실패'));});}
 }).catch(function(e){_dineToast('❌ '+e.message);});
}


