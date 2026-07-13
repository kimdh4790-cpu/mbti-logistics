/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      dine-staff.js
 * @description 직원관리·출퇴근·스케줄
 */
// dine.js에서 분리됨 (리팩토링 2026-07-13)

function _dineStaff(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';

 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px';
 hdr.innerHTML='<div><div class="page-title">👥 직원 현황</div><div class="page-sub">파트별 직원 관리</div></div>';
 var addBtn=document.createElement('button');
 addBtn.className='btn btn-primary';addBtn.textContent='+ 직원 등록';
 addBtn.onclick=function(){_dineAddStaff(did);};
 hdr.appendChild(addBtn);
 wrap.appendChild(hdr);

 var grid=document.createElement('div');
 grid.className='staff-grid';
 grid.id='staff-grid';
 grid.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3);grid-column:1/-1">⏳ 로딩중</div>';
 wrap.appendChild(grid);
 el.appendChild(wrap);

 if(window._staffUnsub) window._staffUnsub();
 window._staffUnsub=_db.collection('members').where('dealerId','==',did).orderBy('name').onSnapshot(function(snap){
   if(snap.empty){
    grid.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3);grid-column:1/-1">직원이 없습니다. + 직원 등록을 눌러주세요</div>';
    return;
   }
   grid.innerHTML='';
   var today=new Date();
   snap.forEach(function(doc){
    var m=doc.data();
    if((m.status||'active')==='resigned')return; // 퇴직자 기본 제외
    var card=document.createElement('div');
    card.className='staff-card';
    var partLabel={'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||m.part||'';
    var roleMap={'chef':'주방장','soushef':'수셰프','cooker':'조리사','assist':'주방보조','dishwasher':'설거지','manager':'매니저','captain':'캡틴','server':'서버','cashier':'캐셔','busser':'홀보조'};
    var roleLabel=roleMap[m.role]||m.role||'';
    var partBadge=m.part==='kitchen'?'badge-kitchen':'badge-hall';
    var typeBadge=m.payType==='monthly'?'badge-full':'badge-part';
    var typeLabel=m.payType==='monthly'?'정직원':'알바';
    var cycleLabel={'daily':'일급','weekly':'주급','biweekly':'격주','monthly':'월급'}[m.payCycle]||'월급';
    var pay=m.payType==='monthly'?(m.monthlySalary||0).toLocaleString()+'원/월':(m.hourlyWage||MIN_WAGE).toLocaleString()+'원/시';
    /* 근속 & 연차 */
    var months=0,years=0,leavedays=0;
    if(m.hireDate){
     var hire=new Date(m.hireDate);
     months=Math.floor((today-hire)/(30*24*3600*1000));
     years=Math.floor(months/12);
     leavedays=months>=12?Math.min(15+Math.floor((years-1)/2),25):Math.min(months,11);
    }
    var tenure=years>0?years+'년 '+(months%12)+'개월':months>0?months+'개월':'신규';
    /* 재직상태 */
    var status=m.status||'active';
    var statusColor={'active':'#22c55e','leave':'#f59e0b','resigned':'#ef4444'}[status]||'#22c55e';
    var statusLabel={'active':'재직','leave':'휴직','resigned':'퇴직'}[status]||'재직';
    /* 보건증 만료 경고 */
    var healthWarn='';
    if(m.healthExpiry){
     var hExp=new Date(m.healthExpiry);
     var dLeft=Math.floor((hExp-today)/(24*3600*1000));
     if(dLeft<0)healthWarn='<span style="font-size:9px;background:rgba(239,68,68,.15);color:#ef4444;border-radius:4px;padding:1px 5px;margin-left:4px">⚠️보건증만료</span>';
     else if(dLeft<30)healthWarn='<span style="font-size:9px;background:rgba(245,158,11,.15);color:#f59e0b;border-radius:4px;padding:1px 5px;margin-left:4px">보건증 D-'+dLeft+'</span>';
    }
    /* 주휴수당 위험 알림 (계약시간 14h대) */
    var weeklyWarn='';
    if(m.payType==='hourly'&&m.weeklyHours>=14&&m.weeklyHours<15){
     weeklyWarn='<span style="font-size:9px;background:rgba(245,158,11,.15);color:#f59e0b;border-radius:4px;padding:1px 5px;margin-left:4px">주휴 경계</span>';
    }
    var mstr=JSON.stringify(m).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"');
    card.innerHTML=
     '<div class="staff-top">'+
     '<div class="staff-avatar" style="background:'+(m.part==='kitchen'?'rgba(239,68,68,.15)':'rgba(8,145,178,.15)')+'">'+
     (m.part==='kitchen'?'👨‍🍳':'🧑‍💼')+'</div>'+
     '<div style="flex:1;min-width:0">'+
     '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">'+
     '<span class="staff-name">'+m.name+'</span>'+
     '<span style="font-size:9px;font-weight:700;color:'+statusColor+';background:'+statusColor+'22;border-radius:20px;padding:1px 6px">'+statusLabel+'</span>'+
     healthWarn+weeklyWarn+
     '</div>'+
     '<div class="staff-role">'+partLabel+(roleLabel?' · '+roleLabel:'')+'</div>'+
     '<div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">'+
     '<span class="staff-badge '+partBadge+'">'+partLabel+'</span>'+
     '<span class="staff-badge '+typeBadge+'">'+typeLabel+'</span>'+
     '<span class="staff-badge" style="background:rgba(124,58,237,.1);color:#a78bfa;border:1px solid rgba(124,58,237,.2)">'+cycleLabel+'</span>'+
     (months>0?'<span class="staff-badge" style="background:rgba(34,197,94,.08);color:#22c55e;border:1px solid rgba(34,197,94,.2)">'+tenure+'</span>':'')+
     '</div>'+
     '</div>'+
     '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">'+
     +(_CU.role!=='staff'?'<button class="btn btn-sm btn-ghost" data-id="'+doc.id+'" onclick="_dineEditStaff(this.dataset.id)">수정</button>':'')+
     '<button style="font-size:10px;padding:3px 8px;border:1px solid rgba(99,102,241,.3);border-radius:6px;background:rgba(99,102,241,.08);color:#818cf8;cursor:pointer" data-id="'+doc.id+'" onclick="_dineStaffDetail(this.dataset.id)">'+(_CU.role==='staff'?'내 정보':'상세보기')+'</button>'+
     '</div>'+
     '</div>'+
     '<div class="staff-row"><span style="color:var(--t3)">급여</span><span class="staff-pay">'+pay+'</span></div>'+
     '<div class="staff-row"><span style="color:var(--t3)">입사일</span><span>'+(m.hireDate||'-')+'</span></div>'+
     '<div class="staff-row"><span style="color:var(--t3)">4대보험</span><span>'+(m.insuranceType==='4대보험'?'✅ 4대보험':m.insuranceType==='3.3%'?'📄 3.3%':'❌ 미가입')+'</span></div>'+
     (leavedays>0?'<div class="staff-row"><span style="color:var(--t3)">잔여연차</span><span style="color:var(--br);font-weight:700">'+leavedays+'일</span></div>':'')+
     (m.weeklyHours?'<div class="staff-row"><span style="color:var(--t3)">계약 주시간</span><span style="'+(m.weeklyHours>=15?'color:#22c55e;font-weight:700':'')+'">'+m.weeklyHours+'h'+(m.weeklyHours>=15?' ✅':' ⚠️')+'</span></div>':'')+
     '';
    grid.appendChild(card);
   });
  });
}

/* 직원 등록 모달 */
function _dineAddStaff(did,staffId,existing){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');box.className='mo-box';
 box.style.cssText='padding:24px;max-height:85vh;overflow-y:auto';
 var e=existing||{};

 box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">'+(staffId?'✏️ 직원 수정':'👤 직원 등록')+'</div>'+
  /* 기본정보 */
  '<div style="font-size:11px;font-weight:800;color:var(--t3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">기본 정보</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
  '<div class="input-group" style="margin:0"><label>이름 *</label><input id="sf-name" class="inp" placeholder="홍길동" value="'+(e.name||'')+'"></div>'+
  '<div class="input-group" style="margin:0"><label>연락처</label><input id="sf-phone" class="inp" type="tel" placeholder="010-0000-0000" value="'+(e.phone||'')+'"></div>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'+
  '<div class="input-group" style="margin:0"><label>입사일</label><input id="sf-hire" class="inp" type="date" value="'+(e.hireDate||new Date().toISOString().slice(0,10))+'"></div>'+
  '<div class="input-group" style="margin:0"><label>상태</label><select id="sf-status" class="inp">'+
  ['active|재직','leave|휴직','resigned|퇴직'].map(function(s){var p=s.split('|');return '<option value="'+p[0]+'"'+((e.status||'active')===p[0]?' selected':'')+'>'+p[1]+'</option>';}).join('')+
  '</select></div>'+
  '</div>'+
  /* 파트/직책 */
  '<div style="font-size:11px;font-weight:800;color:var(--t3);margin:12px 0 8px;text-transform:uppercase;letter-spacing:.5px">파트 · 직책</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'+
  '<div class="input-group" style="margin:0"><label>파트</label><select id="sf-part" class="inp">'+
  [['kitchen','주방'],['hall','홀'],['management','관리']].map(function(o){return '<option value="'+o[0]+'"'+((e.part||'hall')===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+
  '</select></div>'+
  '<div class="input-group" style="margin:0"><label>직책</label><select id="sf-role" class="inp">'+
  [['chef','주방장'],['soushef','수셰프'],['cooker','조리사'],['assist','주방보조'],['dishwasher','설거지'],['manager','매니저'],['captain','캡틴'],['server','서버'],['cashier','캐셔'],['busser','홀보조']].map(function(o){return '<option value="'+o[0]+'"'+((e.role||'server')===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+
  '</select></div>'+
  '<div class="input-group" style="margin:0"><label>경력</label><select id="sf-level" class="inp">'+
  [['new','신입'],['junior','6개월↑'],['mid','1년↑'],['senior','3년↑'],['expert','5년↑']].map(function(o){return '<option value="'+o[0]+'"'+((e.level||'new')===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+
  '</select></div>'+
  '</div>'+
  /* 급여 */
  '<div style="font-size:11px;font-weight:800;color:var(--t3);margin:12px 0 8px;text-transform:uppercase;letter-spacing:.5px">급여 설정</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
  '<div class="input-group" style="margin:0"><label>고용형태</label><select id="sf-paytype" class="inp">'+
  [['hourly','시급(알바)'],['monthly','월급(정직원)']].map(function(o){return '<option value="'+o[0]+'"'+((e.payType||'hourly')===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+
  '</select></div>'+
  '<div class="input-group" style="margin:0"><label>급여주기</label><select id="sf-paycycle" class="inp">'+
  [['daily','일급'],['weekly','주급'],['biweekly','격주급'],['monthly','월급']].map(function(o){return '<option value="'+o[0]+'"'+((e.payCycle||'monthly')===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+
  '</select></div>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'+
  '<div class="input-group" style="margin:0" id="sf-pay-wrap"><label id="sf-pay-label">'+(e.payType==='monthly'?'월급 (원)':'시급 (원)')+'</label><input id="sf-wage" class="inp" type="number" value="'+(e.payType==='monthly'?(e.monthlySalary||2500000):(e.hourlyWage||MIN_WAGE))+'"></div>'+
  '<div class="input-group" style="margin:0"><label>계약 주근무시간 <span style="font-size:10px;color:var(--t3)">(주휴판단)</span></label><input id="sf-weekly-hours" class="inp" type="number" min="0" max="40" placeholder="예) 15" value="'+(e.weeklyHours||'')+'"></div>'+
  '</div>'+
  /* 수습 */
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'+
  '<div class="input-group" style="margin:0"><label>수습기간 <span style="font-size:10px;color:var(--t3)">(개월)</span></label><input id="sf-probation" class="inp" type="number" min="0" max="3" placeholder="0~3" value="'+(e.probationMonths||0)+'"></div>'+
  '<div class="input-group" style="margin:0"><label>수습 시급</label><input id="sf-prob-wage" class="inp" type="number" placeholder="미입력시 90%" value="'+(e.probationWage||'')+'"></div>'+
  '</div>'+
  /* 보험/복지 */
  '<div style="font-size:11px;font-weight:800;color:var(--t3);margin:12px 0 8px;text-transform:uppercase;letter-spacing:.5px">보험 · 복지</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
  '<div class="input-group" style="margin:0"><label>4대보험</label><select id="sf-insurance" class="inp">'+
  [['4대보험','4대보험'],['3.3%','3.3% 프리랜서'],['none','미가입']].map(function(o){return '<option value="'+o[0]+'"'+((e.insuranceType||'4대보험')===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+
  '</select></div>'+
  '<div class="input-group" style="margin:0"><label>식대 (원/월)</label><input id="sf-meal" class="inp" type="number" placeholder="200000" value="'+(e.mealAllowance||0)+'"></div>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'+
  '<div class="input-group" style="margin:0"><label>교통비 (원/월)</label><input id="sf-transport" class="inp" type="number" placeholder="0" value="'+(e.transportAllowance||0)+'"></div>'+
  '<div class="input-group" style="margin:0"><label>보건증 만료일</label><input id="sf-health" class="inp" type="date" value="'+(e.healthExpiry||'')+'"></div>'+
  '</div>'+
  /* 메모 */
  '<div class="input-group" style="margin-top:8px"><label>메모</label><input id="sf-memo" class="inp" placeholder="특이사항" value="'+(e.memo||'')+'"></div>'+
  '<div style="display:flex;gap:8px;margin-top:16px">'+
  '<button class="btn btn-primary" style="flex:1" id="sf-save-btn">저장</button>'+
  '<button class="btn btn-ghost" onclick="this.closest(&apos;.mo&apos;).remove()">취소</button>'+
  '</div>';

 /* 고용형태 변경 시 급여 레이블 변경 */
 box.querySelector('#sf-paytype').addEventListener('change',function(){
  var lbl=document.getElementById('sf-pay-label');
  var inp=document.getElementById('sf-wage');
  if(this.value==='monthly'){lbl.textContent='월급 (원)';inp.value=e.monthlySalary||2500000;}
  else{lbl.textContent='시급 (원)';inp.value=e.hourlyWage||MIN_WAGE;}
 });

 box.querySelector('#sf-save-btn').onclick=function(){
  var name=document.getElementById('sf-name').value.trim();
  if(!name){_dineToast('이름을 입력하세요');return;}
  var payType=document.getElementById('sf-paytype').value;
  var wage=parseInt(document.getElementById('sf-wage').value)||0;
  var data={
   dealerId:did,name:name,
   phone:document.getElementById('sf-phone').value.trim(),
   hireDate:document.getElementById('sf-hire').value,
   status:document.getElementById('sf-status').value,
   part:document.getElementById('sf-part').value,
   role:document.getElementById('sf-role').value,
   level:document.getElementById('sf-level').value,
   payType:payType,
   payCycle:document.getElementById('sf-paycycle').value,
   weeklyHours:parseFloat(document.getElementById('sf-weekly-hours').value)||0,
   probationMonths:parseInt(document.getElementById('sf-probation').value)||0,
   probationWage:parseInt(document.getElementById('sf-prob-wage').value)||0,
   insuranceType:document.getElementById('sf-insurance').value,
   mealAllowance:parseInt(document.getElementById('sf-meal').value)||0,
   transportAllowance:parseInt(document.getElementById('sf-transport').value)||0,
   healthExpiry:document.getElementById('sf-health').value||'',
   memo:document.getElementById('sf-memo').value.trim(),
   updatedAt:new Date().toISOString()
  };
  if(payType==='hourly')data.hourlyWage=wage;
  else data.monthlySalary=wage;
  var pr=staffId?_db.collection('members').doc(staffId).set(data,{merge:true}):_db.collection('members').add(Object.assign(data,{createdAt:new Date().toISOString()}));
  pr.then(function(){_dineToast('✅ 저장됐습니다');mo.remove();_dinePage('staff',document.getElementById('content'));}).catch(function(err){_dineToast('❌ '+err.message);});
 };
 mo.appendChild(box);
 mo.onclick=function(ev){if(ev.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

function _dineEditStaff(id){
 _db.collection('members').doc(id).get().then(function(doc){
  if(doc.exists)_dineAddStaff(_CU.dealerId,id,doc.data());
 });
}

/* 직원 상세 모달 */
function _dineStaffDetail(id){
 _db.collection('members').doc(id).get().then(function(doc){
  if(!doc.exists)return;
  var m=doc.data();var did=_CU.dealerId;
  var mo=document.createElement('div');mo.className='mo';
  var box=document.createElement('div');box.className='mo-box';
  box.style.cssText='padding:24px;max-height:85vh;overflow-y:auto';
  var today=new Date();
  var months=m.hireDate?Math.floor((today-new Date(m.hireDate))/(30*24*3600*1000)):0;
  var years=Math.floor(months/12);
  var leavedays=months>=12?Math.min(15+Math.floor((years-1)/2),25):Math.min(months,11);
  var roleMap={'chef':'주방장','soushef':'수셰프','cooker':'조리사','assist':'주방보조','dishwasher':'설거지','manager':'매니저','captain':'캡틴','server':'서버','cashier':'캐셔','busser':'홀보조'};
  var ym=today.toISOString().slice(0,7);
  var from=ym+'-01',to=ym+'-31';
  box.innerHTML=
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
   '<div style="font-size:16px;font-weight:900">👤 '+m.name+' 상세</div>'+
   '<button onclick="this.closest(&apos;.mo&apos;).remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--t3)">✕</button>'+
   '</div>'+
   /* 프로필 */
   '<div style="background:var(--bg3);border-radius:12px;padding:14px;margin-bottom:12px">'+
   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">'+
   '<div><span style="color:var(--t3)">파트</span> <b>'+({'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||'-')+'</b></div>'+
   '<div><span style="color:var(--t3)">직책</span> <b>'+(roleMap[m.role]||m.role||'-')+'</b></div>'+
   '<div><span style="color:var(--t3)">고용형태</span> <b>'+(m.payType==='monthly'?'정직원':'알바')+'</b></div>'+
   '<div><span style="color:var(--t3)">급여</span> <b>'+(m.payType==='monthly'?(m.monthlySalary||0).toLocaleString()+'원/월':(m.hourlyWage||MIN_WAGE).toLocaleString()+'원/시')+'</b></div>'+
   '<div><span style="color:var(--t3)">입사일</span> <b>'+(m.hireDate||'-')+'</b></div>'+
   '<div><span style="color:var(--t3)">근속</span> <b>'+(years>0?years+'년 '+(months%12)+'개월':months+'개월')+'</b></div>'+
   '<div><span style="color:var(--t3)">연차</span> <b style="color:var(--br)">'+leavedays+'일</b></div>'+
   '<div><span style="color:var(--t3)">4대보험</span> <b>'+(m.insuranceType==='4대보험'?'✅ 4대보험':m.insuranceType==='3.3%'?'📄 3.3%':'❌ 미가입')+'</b></div>'+
   (m.weeklyHours?'<div><span style="color:var(--t3)">계약시간</span> <b>주 '+m.weeklyHours+'h'+(m.weeklyHours>=15?' ✅주휴O':' ⚠️주휴X')+'</b></div>':'')+''+
   (m.healthExpiry?'<div><span style="color:var(--t3)">보건증</span> <b>'+m.healthExpiry+'</b></div>':'')+''+
   '</div>'+
   '</div>'+
   /* 이번달 근무 */
   '<div style="font-size:12px;font-weight:800;margin-bottom:8px">📅 이번달 근무 현황</div>'+
   '<div id="sd-att-wrap" style="background:var(--bg3);border-radius:10px;padding:12px;font-size:12px;color:var(--t3);text-align:center">⏳ 로딩중...</div>'+
   /* 버튼 */
   '<div style="display:flex;gap:8px;margin-top:14px">'+
   '<button class="btn btn-primary btn-sm" data-id="'+id+'" onclick="_dineEditStaff(this.dataset.id);this.closest(\'[class=mo]\').remove()">✏️ 수정</button>'+
   '<button class="btn btn-ghost btn-sm" data-mid="'+id+'" data-ym="'+ym+'" onclick="_dinePayslipModal(this.dataset.mid,this.dataset.ym)">📋 명세서</button>'+
   '</div>';

  /* 이번달 출퇴근 비동기 로드 */
  mo.appendChild(box);
  mo.onclick=function(ev){if(ev.target===mo)mo.remove();};
  document.body.appendChild(mo);

  _db.collection('attendance').where('dealerId','==',did).where('memberId','==',id).where('date','>=',from).where('date','<=',to).get().then(function(attSnap){
   var ins={},outs={};
   attSnap.forEach(function(d){var a=d.data();if(a.type==='in')ins[a.date]=a;else outs[a.date]=a;});
   var dates=Object.keys(Object.assign({},ins,outs)).sort();
   var totalMin=0,days=0;
   var rows=dates.map(function(dt){
    var inT=ins[dt]?new Date(ins[dt].time):null;
    var outT=outs[dt]?new Date(outs[dt].time):null;
    var h=0;
    if(inT&&outT){var diff=(outT-inT)/60000;var br=diff>=480?60:diff>=240?30:0;h=Math.round((diff-br)/60*10)/10;totalMin+=(diff-br);days++;}
    return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);font-size:11px">'+
     '<span style="color:var(--t3)">'+dt.slice(5)+'</span>'+
     '<span>'+(inT?inT.toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):'-')+'</span>'+
     '<span>'+(outT?outT.toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):(inT?'<span style="color:#22c55e">근무중</span>':'-'))+'</span>'+
     '<span style="font-weight:700;color:var(--br)">'+(h?h+'h':'')+'</span>'+
     '</div>';
   }).join('');
   var totalH=Math.round(totalMin/60*10)/10;
   var wage=m.hourlyWage||MIN_WAGE;
   var estPay=m.payType==='hourly'?Math.round(totalH*wage):(m.monthlySalary||0);
   var wrap=box.querySelector('#sd-att-wrap');
   if(wrap)wrap.innerHTML=
    (dates.length?
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:11px">'+
    '<span style="color:var(--t3)">출근일 <b style="color:var(--tx)">'+days+'일</b></span>'+
    '<span style="color:var(--t3)">총 근무 <b style="color:var(--tx)">'+totalH+'h</b></span>'+
    '<span style="color:var(--t3)">예상급여 <b style="color:var(--gr)">₩'+estPay.toLocaleString()+'</b></span>'+
    '</div>'+rows:
    '<div style="color:var(--t3)">이번달 출퇴근 기록 없음</div>');
  });
 });
}

function _dineAttend(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 var today=new Date().toISOString().slice(0,10);
 var ym=today.slice(0,7);

 wrap.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">⏱ 출퇴근 현황</div><div class="page-sub attend-live"><span class="live-dot"></span>FILO QR출퇴근 실시간 연동</div></div>'+
  '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'+
  '<div style="display:flex;background:var(--bg3);border-radius:8px;overflow:hidden;border:1px solid var(--bd)">'+
  '<button id="att-tab-day" onclick="_dineAttendTab(this.id.slice(-3))" style="padding:5px 12px;font-size:11px;font-weight:700;border:none;cursor:pointer;background:var(--br);color:#fff">일별</button>'+
  '<button id="att-tab-month" onclick="_dineAttendTab(this.id.slice(-5))" style="padding:5px 12px;font-size:11px;font-weight:700;border:none;cursor:pointer;background:transparent;color:var(--t3)">월별</button>'+
  '</div>'+
  '<input type="date" id="att-date" value="'+today+'" class="inp" style="width:auto;padding:5px 10px;font-size:12px" data-did="'+did+'" onchange="_dineLoadAttend(this.dataset.did)">'+
  '</div></div>'+
  /* 요약 KPI */
  '<div id="att-kpi" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px"></div>'+
  '<div class="card" id="att-table"><div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩중</div></div>';
 el.appendChild(wrap);
 _dineLoadAttend(did);
}

function _dineAttendTab(tab){
 var dayBtn=document.getElementById('att-tab-day');
 var monBtn=document.getElementById('att-tab-month');
 if(!dayBtn||!monBtn)return;
 var did=_CU.dealerId;
 if(tab==='day'){
  dayBtn.style.background='var(--br)';dayBtn.style.color='#fff';
  monBtn.style.background='transparent';monBtn.style.color='var(--t3)';
  document.getElementById('att-date').type='date';
  _dineLoadAttend(did);
 } else {
  dayBtn.style.background='transparent';dayBtn.style.color='var(--t3)';
  monBtn.style.background='var(--br)';monBtn.style.color='#fff';
  document.getElementById('att-date').type='month';
  _dineLoadAttendMonth(did);
 }
}

function _dineLoadAttend(did){
 var date=document.getElementById('att-date')?.value||new Date().toISOString().slice(0,10);
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','==',date).get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(results){
  var attSnap=results[0],memSnap=results[1];
  var memMap={};memSnap.forEach(function(doc){memMap[doc.id]=doc.data();});
  var allMem=[];memSnap.forEach(function(doc){allMem.push({id:doc.id,data:doc.data()});});
  var ins={},outs={};
  attSnap.forEach(function(doc){var d=doc.data();if(d.type==='in')ins[d.memberId]=d;else outs[d.memberId]=d;});

  /* KPI */
  var working=Object.keys(ins).filter(function(id){return !outs[id];}).length;
  var done=Object.keys(ins).filter(function(id){return !!outs[id];}).length;
  var absent=allMem.filter(function(m){return !ins[m.id]&&(m.data.status||'active')==='active';}).length;
  var totalPay=0;
  Object.keys(ins).forEach(function(id){
   var m=memMap[id]||{};
   var inT=new Date(ins[id].time);
   var outT=outs[id]?new Date(outs[id].time):new Date();
   var diff=(outT-inT)/60000;var br=diff>=480?60:diff>=240?30:0;
   var h=(diff-br)/60;
   var nightH=0;var ns=new Date(inT);ns.setHours(22,0,0,0);
   if(outT>ns)nightH=(outT-Math.max(inT,ns))/3600000;
   totalPay+=Math.round(h*(m.hourlyWage||MIN_WAGE)+nightH*(m.hourlyWage||MIN_WAGE)*0.5);
  });
  var kpi=document.getElementById('att-kpi');
  if(kpi)kpi.innerHTML=
   '<div class="kpi-card" style="border-top:2px solid #22c55e"><div class="kpi-label">🟢 근무중</div><div class="kpi-val" style="color:#22c55e">'+working+'명</div></div>'+
   '<div class="kpi-card" style="border-top:2px solid #38bdf8"><div class="kpi-label">✅ 완료</div><div class="kpi-val" style="color:#38bdf8">'+done+'명</div></div>'+
   '<div class="kpi-card" style="border-top:2px solid #ef4444"><div class="kpi-label">❌ 미출근</div><div class="kpi-val" style="color:#ef4444">'+absent+'명</div></div>'+
   '<div class="kpi-card" style="border-top:2px solid #f59e0b"><div class="kpi-label">💰 예상급여</div><div class="kpi-val" style="color:#f59e0b;font-size:13px">₩'+totalPay.toLocaleString()+'</div></div>';

  var table=document.getElementById('att-table');if(!table)return;
  var allIds=[...new Set([...allMem.map(function(m){return m.id;}),...Object.keys(ins)])];
  if(!allIds.length){table.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3);font-size:12px">'+date+' 직원 없음</div>';return;}

  var html='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
   '<thead><tr style="border-bottom:2px solid var(--bd);background:var(--bg3)">'+
   '<th style="padding:8px;text-align:left">이름</th>'+
   '<th style="padding:8px;text-align:left">파트</th>'+
   '<th style="padding:8px;text-align:center">출근</th>'+
   '<th style="padding:8px;text-align:center">퇴근</th>'+
   '<th style="padding:8px;text-align:center">근무시간</th>'+
   '<th style="padding:8px;text-align:center">야간</th>'+
   '<th style="padding:8px;text-align:right">예상급여</th>'+
   '<th style="padding:8px;text-align:center">상태</th>'+
   '<th style="padding:8px;text-align:center">수정</th>'+
   '</tr></thead><tbody>';

  allIds.forEach(function(id){
   var m=memMap[id]||{};
   if((m.status||'active')==='resigned')return;
   var inT=ins[id]?new Date(ins[id].time):null;
   var outT=outs[id]?new Date(outs[id].time):null;
   var diffH=0,nightH=0,estPay=0,isLate=false;
   if(inT&&outT){
    var diffMin=(outT-inT)/60000;var br=diffMin>=480?60:diffMin>=240?30:0;
    diffH=Math.round((diffMin-br)/60*10)/10;
    var ns=new Date(inT);ns.setHours(22,0,0,0);
    if(outT>ns)nightH=Math.round((outT-Math.max(inT,ns))/3600000*10)/10;
    estPay=Math.round(diffH*(m.hourlyWage||MIN_WAGE)+nightH*(m.hourlyWage||MIN_WAGE)*0.5);
   } else if(inT&&!outT){
    var now2=new Date();
    var diffMin2=(now2-inT)/60000;var br2=diffMin2>=480?60:diffMin2>=240?30:0;
    diffH=Math.round((diffMin2-br2)/60*10)/10;
    var ns2=new Date(inT);ns2.setHours(22,0,0,0);
    if(now2>ns2)nightH=Math.round((now2-Math.max(inT,ns2))/3600000*10)/10;
    estPay=Math.round(diffH*(m.hourlyWage||MIN_WAGE)+nightH*(m.hourlyWage||MIN_WAGE)*0.5);
   }
   var isWorking=inT&&!outT;
   var isAbsent=!inT;
   var partColor={'kitchen':'#ef4444','hall':'#38bdf8'}[m.part]||'#a78bfa';
   var statusBg=isWorking?'rgba(34,197,94,.12)':isAbsent?'rgba(239,68,68,.06)':'';
   html+='<tr style="border-bottom:1px solid var(--bd);'+(statusBg?'background:'+statusBg:'')+'">'+
    '<td style="padding:8px;font-weight:700">'+(m.name||id)+'</td>'+
    '<td style="padding:8px"><span style="font-size:10px;font-weight:700;color:'+partColor+'">'+({'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||'-')+'</span></td>'+
    '<td style="padding:8px;text-align:center">'+(inT?'<span style="'+(isLate?'color:#ef4444;font-weight:700':'')+'">'+inT.toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'})+'</span>':'<span style="color:#ef4444">-</span>')+'</td>'+
    '<td style="padding:8px;text-align:center">'+(outT?outT.toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):isWorking?'<span style="color:#22c55e;font-weight:700">근무중</span>':'-')+'</td>'+
    '<td style="padding:8px;text-align:center;font-weight:700;color:var(--br)">'+(diffH?diffH+'h':'-')+'</td>'+
    '<td style="padding:8px;text-align:center;color:#f59e0b">'+(nightH?nightH+'h':'-')+'</td>'+
    '<td style="padding:8px;text-align:right;font-weight:700;color:#22c55e">'+(estPay?'₩'+estPay.toLocaleString():'-')+'</td>'+
    '<td style="padding:8px;text-align:center">'+
    (isWorking?'<span style="font-size:10px;font-weight:700;background:rgba(34,197,94,.15);color:#22c55e;border-radius:20px;padding:2px 8px">● 근무중</span>':
     isAbsent?'<span style="font-size:10px;font-weight:700;background:rgba(239,68,68,.1);color:#ef4444;border-radius:20px;padding:2px 8px">미출근</span>':
     '<span style="font-size:10px;color:var(--t3)">완료</span>')+
    '</td>'+
    '<td style="padding:8px;text-align:center">'+
    '<button data-mid="'+id+'" data-dt="'+date+'" onclick="_dineAttendEdit(this.dataset.mid,this.dataset.dt)" style="font-size:9px;padding:2px 7px;border:1px solid var(--bd);border-radius:5px;background:transparent;color:var(--t3);cursor:pointer">수정</button>'+
    '</td>'+
    '</tr>';
  });
  html+='</tbody></table></div>';
  table.innerHTML=html;
 });
}

/* 월별 누적 근무 현황 */
function _dineLoadAttendMonth(did){
 var ym=document.getElementById('att-date')?.value||new Date().toISOString().slice(0,7);
 var from=ym+'-01',to=ym+'-31';
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(results){
  var attSnap=results[0],memSnap=results[1];
  var memMap={};memSnap.forEach(function(doc){memMap[doc.id]=doc.data();});
  var attMap={};
  attSnap.forEach(function(doc){
   var d=doc.data();
   if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[]};
   if(d.type==='in')attMap[d.memberId].ins.push(d);
   else attMap[d.memberId].outs.push(d);
  });
  var table=document.getElementById('att-table');if(!table)return;
  var rows='';var totalPay=0;
  memSnap.forEach(function(doc){
   var m=doc.data();
   if((m.status||'active')==='resigned')return;
   var r=_calcPayFull(m,attMap[doc.id]||{ins:[],outs:[]},memSnap.size,ym);
   totalPay+=r.grossSalary;
   var partColor={'kitchen':'#ef4444','hall':'#38bdf8'}[m.part]||'#a78bfa';
   var weekH=r.monthlyHours/4;
   rows+='<tr style="border-bottom:1px solid var(--bd)">'+
    '<td style="padding:8px;font-weight:700">'+m.name+'</td>'+
    '<td style="padding:8px"><span style="font-size:10px;font-weight:700;color:'+partColor+'">'+({'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||'-')+'</span></td>'+
    '<td style="padding:8px;text-align:center;font-weight:700;color:var(--br)">'+r.monthlyHours+'h</td>'+
    '<td style="padding:8px;text-align:center;color:#f59e0b">'+(r.nightHour?r.nightHour+'h':'-')+'</td>'+
    '<td style="padding:8px;text-align:center">'+(weekH>=15?'<span style="color:#22c55e;font-weight:700">✅ '+Math.round(weekH*10)/10+'h</span>':'<span style="color:var(--t3)">'+Math.round(weekH*10)/10+'h</span>')+'</td>'+
    '<td style="padding:8px;text-align:right;font-weight:700;color:#22c55e">₩'+r.grossSalary.toLocaleString()+'</td>'+
    '<td style="padding:8px;text-align:right;color:#ef4444;font-size:11px">-₩'+r.insTotal.toLocaleString()+'</td>'+
    '<td style="padding:8px;text-align:right;font-weight:700;color:#818cf8">₩'+r.netSalary.toLocaleString()+'</td>'+
    '</tr>';
  });
  table.innerHTML='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
   '<thead><tr style="border-bottom:2px solid var(--bd);background:var(--bg3)">'+
   '<th style="padding:8px;text-align:left">이름</th><th style="padding:8px;text-align:left">파트</th>'+
   '<th style="padding:8px;text-align:center">총근무</th><th style="padding:8px;text-align:center">야간</th>'+
   '<th style="padding:8px;text-align:center">주평균</th><th style="padding:8px;text-align:right">총지급</th>'+
   '<th style="padding:8px;text-align:right">공제</th><th style="padding:8px;text-align:right">실수령</th>'+
   '</tr></thead><tbody>'+rows+'</tbody>'+
   '<tfoot><tr style="border-top:2px solid var(--bd);background:var(--bg3);font-weight:800">'+
   '<td colspan="5" style="padding:8px">합계</td>'+
   '<td colspan="3" style="padding:8px;text-align:right;color:#22c55e">₩'+totalPay.toLocaleString()+'</td>'+
   '</tr></tfoot></table></div>';
 });
}

/* 출퇴근 수동 수정 모달 */
function _dineAttendEdit(memberId,date){
 var did=_CU.dealerId;
 _db.collection('attendance').where('dealerId','==',did).where('memberId','==',memberId).where('date','==',date).get().then(function(snap){
  var ins=null,outs=null,inDoc=null,outDoc=null;
  snap.forEach(function(doc){var d=doc.data();if(d.type==='in'){ins=d;inDoc=doc.id;}else{outs=d;outDoc=doc.id;}});
  var memName=ins&&ins.memberName||memberId;
  var mo=document.createElement('div');mo.className='mo';
  var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
  var inTime=ins?new Date(ins.time).toTimeString().slice(0,5):'';
  var outTime=outs?new Date(outs.time).toTimeString().slice(0,5):'';
  box.innerHTML=
   '<div style="font-size:15px;font-weight:900;margin-bottom:14px">⏱ 출퇴근 수정<span style="font-size:11px;color:var(--t3);font-weight:400;margin-left:8px">'+date+'</span></div>'+
   '<div class="input-group"><label>출근 시간</label><input id="ae-in" class="inp" type="time" value="'+inTime+'"></div>'+
   '<div class="input-group"><label>퇴근 시간</label><input id="ae-out" class="inp" type="time" value="'+outTime+'"></div>'+
   '<div style="font-size:10px;color:var(--t3);margin-bottom:12px">⚠️ 수동 수정은 기록에 남습니다</div>'+
   '<div style="display:flex;gap:8px">'+
   '<button class="btn btn-primary" style="flex:1" data-mid="'+memberId+'" data-dt="'+date+'" data-in="'+(inDocId||'')+'" data-out="'+(outDocId||'')+'" onclick="_dineAttendSave(this.dataset.mid,this.dataset.dt,this.dataset.in,this.dataset.out)">저장</button>'+
   '<button class="btn btn-ghost" onclick="this.closest(&apos;.mo&apos;).remove()">취소</button>'+
   '</div>';
  mo.appendChild(box);mo.onclick=function(e){if(e.target===mo)mo.remove();};document.body.appendChild(mo);
 });
}

function _dineAttendSave(memberId,date,inDocId,outDocId){
 var did=_CU.dealerId;
 var inTime=document.getElementById('ae-in').value;
 var outTime=document.getElementById('ae-out').value;
 var now=new Date().toISOString();
 var promises=[];
 if(inTime){
  var inISO=date+'T'+inTime+':00';
  if(inDocId){promises.push(_db.collection('attendance').doc(inDocId).update({time:inISO,manual:true,updatedAt:now}));}
  else{promises.push(_db.collection('attendance').add({dealerId:did,memberId:memberId,type:'in',time:inISO,date:date,manual:true,createdAt:now}));}
 }
 if(outTime){
  var outISO=date+'T'+outTime+':00';
  if(outDocId){promises.push(_db.collection('attendance').doc(outDocId).update({time:outISO,manual:true,updatedAt:now}));}
  else{promises.push(_db.collection('attendance').add({dealerId:did,memberId:memberId,type:'out',time:outISO,date:date,manual:true,createdAt:now}));}
 }
 Promise.all(promises).then(function(){
  _dineToast('✅ 수정됐습니다');
  document.querySelector('.mo').remove();
  _dineLoadAttend(did);
 }).catch(function(e){_dineToast('❌ '+e.message);});
}


