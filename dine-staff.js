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
 hdr.innerHTML='<div><div class="page-title">직원 현황</div><div class="page-sub">파트별 직원 관리</div></div>';
 var addBtn=document.createElement('button');
 addBtn.className='btn btn-primary';addBtn.textContent='+ 직원 등록';
 addBtn.onclick=function(){_dineAddStaff(did);};
 hdr.appendChild(addBtn);
 wrap.appendChild(hdr);

 var grid=document.createElement('div');
 grid.className='';
 grid.id='staff-grid';
 grid.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3);grid-column:1/-1">로딩중...</div>';
 var staffPager=document.createElement('div');
 staffPager.id='staff-pager';
 staffPager.style.cssText='margin-top:12px';
 wrap.appendChild(grid);
 wrap.appendChild(staffPager);
 el.appendChild(wrap);

 var STAFF_PAGE_SIZE=15;
 if(window._staffPage===undefined)window._staffPage=0;

 var _cu=firebase.auth().currentUser;
 (_cu?_cu.getIdToken():Promise.resolve('')).then(function(tok){
  return fetch('/api/get-members?dealerId='+encodeURIComponent(did),tok?{headers:{'Authorization':'Bearer '+tok}}:{});
 }).then(function(r){return r.json();}).then(function(res){
  var snap={docs:(res.members||[]),empty:!(res.members&&res.members.length)};
  var _seenKey={};
  snap.docs=snap.docs.filter(function(m){
   var k=(m.phone||'')+'|'+(m.name||'');
   if(_seenKey[k])return false;
   _seenKey[k]=true;return true;
  });
  snap.docs=snap.docs.filter(function(m){return (m.status||'active')!=='resigned';});
  snap.empty=!snap.docs.length;
  if(snap.empty){
    grid.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3);grid-column:1/-1">직원이 없습니다. + 직원 등록을 눌러주세요</div>';
    return;
   }
   var today=new Date();
   var allStaffDocs=[];
   snap.docs.forEach(function(m){allStaffDocs.push({id:m.id,_m:m});});
   var totalStaff=allStaffDocs.length;
   var totalStaffPages=Math.ceil(totalStaff/STAFF_PAGE_SIZE)||1;
   if(window._staffPage>=totalStaffPages)window._staffPage=0;

   function renderStaffPage(page){
    window._staffPage=page;
    /* 요약 통계 바 */
    var active=allStaffDocs.filter(function(d){return (d._m.status||'active')==='active';}).length;
    var part=allStaffDocs.filter(function(d){return d._m.payType==='hourly';}).length;
    var full=allStaffDocs.filter(function(d){return d._m.payType==='monthly';}).length;
    var weekly=allStaffDocs.filter(function(d){return (d._m.weeklyHours||0)>=15;}).length;
    var summary='<div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;padding-bottom:2px">'+
     [['총직원',totalStaff,'#64748b'],['재직중',active,'#22c55e'],['알바',part,'#38bdf8'],['정직원',full,'#a78bfa'],['주휴대상',weekly,'#f59e0b']].map(function(s){
      return '<div style="display:flex;align-items:center;gap:7px;background:var(--s1);border:1px solid var(--bd);border-radius:10px;padding:7px 13px;white-space:nowrap;flex-shrink:0">'+
       '<div style="width:7px;height:7px;border-radius:50%;background:'+s[2]+'"></div>'+
       '<span style="font-size:11px;color:var(--t3);font-weight:600">'+s[0]+'</span>'+
       '<span style="font-size:14px;font-weight:900;color:'+s[2]+';font-variant-numeric:tabular-nums">'+s[1]+'</span></div>';
     }).join('')+'</div>';
    /* 테이블 행 생성 */
    var pageDocs=allStaffDocs.slice(page*STAFF_PAGE_SIZE,(page+1)*STAFF_PAGE_SIZE);
    var rows=pageDocs.map(function(docObj){
     var m=docObj._m;
     var partLabel={'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||m.part||'';
     var roleMap={'chef':'주방장','soushef':'수셰프','cooker':'조리사','assist':'주방보조','dishwasher':'설거지','manager':'매니저','captain':'캡틴','server':'서버','cashier':'캐셔','busser':'홀보조'};
     var roleLabel=roleMap[m.role]||m.role||'';
     var typeLabel=m.payType==='monthly'?'정직원':'알바';
     var cycleLabel={'daily':'일급','weekly':'주급','biweekly':'격주','monthly':'월급'}[m.payCycle]||'월급';
     var pay=m.payType==='monthly'?(m.monthlySalary||0).toLocaleString()+'원/월':(m.hourlyWage||MIN_WAGE).toLocaleString()+'원/시';
     var months=0,years=0,leavedays=0;
     if(m.hireDate){
      var hire=new Date(m.hireDate);
      months=Math.floor((today-hire)/(30*24*3600*1000));
      years=Math.floor(months/12);
      leavedays=months>=12?Math.min(15+Math.floor((years-1)/2),25):Math.min(months,11);
     }
     var tenure=years>0?years+'년 '+(months%12)+'개월':months>0?months+'개월':'신규';
     var status=m.status||'active';
     var statusColor={'active':'#22c55e','leave':'#f59e0b','resigned':'#ef4444'}[status]||'#22c55e';
     var statusLabel={'active':'재직','leave':'휴직','resigned':'퇴직'}[status]||'재직';
     var healthWarn='';
     if(m.healthExpiry){
      var hExp=new Date(m.healthExpiry);
      var dLeft=Math.floor((hExp-today)/(24*3600*1000));
      if(dLeft<0)healthWarn='<span style="font-size:9px;background:rgba(239,68,68,.15);color:#ef4444;border-radius:4px;padding:1px 5px;margin-left:4px">만료</span>';
      else if(dLeft<30)healthWarn='<span style="font-size:9px;background:rgba(245,158,11,.15);color:#f59e0b;border-radius:4px;padding:1px 5px;margin-left:4px">D-'+dLeft+'</span>';
     }
     var weeklyWarn='';
     if(m.payType==='hourly'&&m.weeklyHours>=14&&m.weeklyHours<15)weeklyWarn='<span style="font-size:9px;background:rgba(245,158,11,.15);color:#f59e0b;border-radius:4px;padding:1px 5px;margin-left:3px">경계</span>';
     var initials=(m.name||'?')[0].toUpperCase();
     var avatarBg=m.part==='kitchen'?'rgba(239,68,68,.15)':'rgba(8,145,178,.15)';
     var avatarC=m.part==='kitchen'?'#ef4444':'#0891b2';
     var partBg=m.part==='kitchen'?'rgba(239,68,68,.12)':'rgba(8,145,178,.12)';
     var partC=m.part==='kitchen'?'#ef4444':'#0891b2';
     var typeBg=m.payType==='monthly'?'rgba(167,139,250,.15)':'rgba(56,189,248,.15)';
     var typeC=m.payType==='monthly'?'#a78bfa':'#38bdf8';
     var insLabel=m.insuranceType==='4대보험'?'4대보험':m.insuranceType==='3.3%'?'3.3%':'미가입';
     var insC=m.insuranceType==='4대보험'?'#22c55e':m.insuranceType==='3.3%'?'#f59e0b':'#94a3b8';
     return '<tr style="border-bottom:1px solid var(--bd);transition:background .12s" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'+
      '<td style="padding:10px 12px;white-space:nowrap">'+
       '<div style="display:flex;align-items:center;gap:9px">'+
       '<div style="width:34px;height:34px;border-radius:50%;background:'+avatarBg+';color:'+avatarC+';display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0">'+initials+'</div>'+
       '<div><div style="font-weight:700;font-size:13px;color:var(--tx)">'+(m.name||'-')+'</div>'+
       '<div style="font-size:10px;font-weight:700;color:'+statusColor+';margin-top:1px">'+statusLabel+healthWarn+'</div></div>'+
       '</div>'+
      '</td>'+
      '<td style="padding:10px 12px;white-space:nowrap">'+
       '<span style="font-size:10px;font-weight:700;background:'+partBg+';color:'+partC+';border-radius:6px;padding:3px 8px">'+partLabel+'</span>'+
       (roleLabel?'<div style="font-size:10px;color:var(--t3);margin-top:3px">'+roleLabel+'</div>':'')+
      '</td>'+
      '<td style="padding:10px 12px;white-space:nowrap">'+
       '<span style="font-size:10px;font-weight:700;background:'+typeBg+';color:'+typeC+';border-radius:6px;padding:3px 8px">'+typeLabel+'</span>'+
       '<div style="font-size:10px;color:var(--t3);margin-top:3px">'+cycleLabel+'</div>'+
      '</td>'+
      '<td style="padding:10px 12px;white-space:nowrap;font-variant-numeric:tabular-nums">'+
       '<div style="font-size:12px;font-weight:800;color:var(--br)">'+pay+'</div>'+
       (m.weeklyHours?'<div style="font-size:10px;color:'+(m.weeklyHours>=15?'#22c55e':'var(--t3)')+';margin-top:2px">'+m.weeklyHours+'h'+weeklyWarn+'</div>':'')+
      '</td>'+
      '<td style="padding:10px 12px;white-space:nowrap">'+
       '<span style="font-size:11px;font-weight:700;color:'+insC+'">'+insLabel+'</span>'+
       (leavedays>0?'<div style="font-size:10px;color:#a78bfa;margin-top:2px">연차 '+leavedays+'일</div>':'')+
      '</td>'+
      '<td style="padding:10px 12px;white-space:nowrap;font-size:11px;color:var(--t3)">'+tenure+'</td>'+
      '<td style="padding:10px 12px;white-space:nowrap">'+
       '<div style="display:flex;gap:5px">'+
       (_CU.role!=='staff'?'<button class="btn btn-sm btn-ghost" data-id="'+docObj.id+'" onclick="_dineEditStaff(this.dataset.id)" style="font-size:10px;padding:4px 10px">수정</button>':'')+
       '<button data-id="'+docObj.id+'" onclick="_dineStaffDetail(this.dataset.id)" style="font-size:10px;padding:4px 10px;border:1px solid rgba(99,102,241,.3);border-radius:6px;background:rgba(99,102,241,.08);color:#818cf8;cursor:pointer">'+(_CU.role==='staff'?'내 정보':'상세')+'</button>'+
       '</div>'+
      '</td>'+
      '</tr>';
    }).join('');
    var tableHtml='<div style="overflow-x:auto;border-radius:14px;border:1px solid var(--bd)">'+
     '<table style="width:100%;border-collapse:collapse;min-width:600px">'+
     '<thead><tr style="background:var(--s2);border-bottom:2px solid var(--bd)">'+
     ['이름','파트 / 역할','유형','급여 / 주시간','보험 / 연차','근속',''].map(function(h){
      return '<th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;white-space:nowrap">'+h+'</th>';
     }).join('')+
     '</tr></thead><tbody>'+rows+'</tbody></table></div>';
    grid.innerHTML=summary+tableHtml;
    /* 페이지네이션 */
    var pager=document.getElementById('staff-pager');
    if(pager&&totalStaffPages>1){
     pager.innerHTML=
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 4px">'+
      '<button onclick="if(window._staffPage>0){window._staffPage--;window._staffRenderPage(window._staffPage);}" style="padding:7px 16px;border:1px solid var(--bd);border-radius:8px;background:transparent;color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;'+(page===0?'opacity:.35;pointer-events:none':'')+'">← 이전</button>'+
      '<span style="font-size:12px;color:var(--t3);font-weight:700">'+(page+1)+' / '+totalStaffPages+' (총 '+totalStaff+'명)</span>'+
      '<button onclick="if(window._staffPage<'+(totalStaffPages-1)+'){window._staffPage++;window._staffRenderPage(window._staffPage);}" style="padding:7px 16px;border:1px solid var(--bd);border-radius:8px;background:transparent;color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;'+(page>=totalStaffPages-1?'opacity:.35;pointer-events:none':'')+'">다음 →</button>'+
      '</div>';
    }else if(pager){pager.innerHTML='<div style="text-align:right;padding:8px 4px;font-size:11px;color:var(--t3)">총 '+totalStaff+'명</div>';}
   }  // end renderStaffPage
   window._staffRenderPage=renderStaffPage;
   renderStaffPage(window._staffPage);

   /* 스와이프 */
   var swX=0;
   grid.addEventListener('touchstart',function(e){swX=e.touches[0].clientX;},{passive:true});
   grid.addEventListener('touchend',function(e){
    var dx=e.changedTouches[0].clientX-swX;
    if(Math.abs(dx)>50){
     if(dx<0&&window._staffPage<totalStaffPages-1){window._staffPage++;window._staffRenderPage(window._staffPage);}
     else if(dx>0&&window._staffPage>0){window._staffPage--;window._staffRenderPage(window._staffPage);}
    }
   },{passive:true});
  });
}

/* 직원 등록 모달 */
function _dineAddStaff(did,staffId,existing){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');box.className='mo-box';
 box.style.cssText='padding:24px;max-height:85vh;overflow-y:auto';
 var e=existing||{};

 box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">'+(staffId?'직원 수정':'직원 등록')+'</div>'+
  /* 기본정보 */
  '<div style="font-size:11px;font-weight:800;color:var(--t3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">기본 정보</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
  '<div class="input-group" style="margin:0"><label>이름 *</label><input id="sf-name" class="inp" placeholder="홍길동" value="'+(e.name||'')+'"></div>'+
  '<div class="input-group" style="margin:0"><label>연락처</label><input id="sf-phone" class="inp" type="tel" placeholder="010-0000-0000" value="'+(e.phone||'')+'"></div>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'+
  '<div class="input-group" style="margin:0"><label>입사일</label><input id="sf-hire" class="inp" type="date" value="'+(e.hireDate||_today())+'"></div>'+
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
  var btn=this;
  if(btn.disabled)return;
  var name=document.getElementById('sf-name').value.trim();
  if(!name){_dineToast('이름을 입력하세요');return;}
  btn.disabled=true;btn.textContent='저장 중...';
  var payType=document.getElementById('sf-paytype').value;
  var wage=parseInt(document.getElementById('sf-wage').value)||0;
  var phone=document.getElementById('sf-phone').value.trim();
  var data={
   dealerId:did,name:name,
   phone:phone,
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
   updatedAt:_nowISO()
  };
  if(payType==='hourly')data.hourlyWage=wage;
  else data.monthlySalary=wage;
  if(!staffId) data.createdAt=_nowISO();
  if(staffId) data.staffId=staffId;
  var cu=firebase.auth().currentUser;
  (cu?cu.getIdToken():Promise.reject(new Error('로그인 필요'))).then(function(tok){
   return fetch('/api/save-member',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify(data)});
  }).then(function(r){return r.json();}).then(function(res){
   if(res.ok){_dineToast('저장됐습니다');mo.remove();_dinePage('staff',document.getElementById('content'));}
   else{btn.disabled=false;btn.textContent='저장';_dineToast('' + (res.error||'저장 실패'));}
  }).catch(function(err){btn.disabled=false;btn.textContent='저장';_dineToast(err.message);});
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
   '<div style="font-size:16px;font-weight:900">'+m.name+' 상세</div>'+
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
   '<div><span style="color:var(--t3)">4대보험</span> <b>'+(m.insuranceType==='4대보험'?'4대보험':m.insuranceType==='3.3%'?'3.3%':'미가입')+'</b></div>'+
   (m.weeklyHours?'<div><span style="color:var(--t3)">계약시간</span> <b>주 '+m.weeklyHours+'h'+(m.weeklyHours>=15?' 주휴O':' 주휴X')+'</b></div>':'')+''+
   (m.healthExpiry?'<div><span style="color:var(--t3)">보건증</span> <b>'+m.healthExpiry+'</b></div>':'')+''+
   '</div>'+
   '</div>'+
   /* 이번달 근무 */
   '<div style="font-size:12px;font-weight:800;margin-bottom:8px">이번달 근무 현황</div>'+
   '<div id="sd-att-wrap" style="background:var(--bg3);border-radius:10px;padding:12px;font-size:12px;color:var(--t3);text-align:center">로딩중...</div>'+
   /* 버튼 */
   '<div style="display:flex;gap:8px;margin-top:14px">'+
   '<button class="btn btn-primary btn-sm" data-id="'+id+'" onclick="_dineEditStaff(this.dataset.id);this.closest(\'[class=mo]\').remove()">수정</button>'+
   '<button class="btn btn-ghost btn-sm" data-mid="'+id+'" data-ym="'+ym+'" onclick="_dinePayslipModal(this.dataset.mid,this.dataset.ym)">명세서</button>'+
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

var _dineAttUnsub=null;

function _dineAttend(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 var today=_today();
 var ym=today.slice(0,7);

 wrap.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">출퇴근 현황</div><div class="page-sub attend-live"><span class="live-dot"></span>FILO QR출퇴근 실시간 연동</div></div>'+
  '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'+
  '<div style="display:flex;background:var(--bg3);border-radius:8px;overflow:hidden;border:1px solid var(--bd)">'+
  '<button id="att-tab-day" onclick="_dineAttendTab(this.id.slice(-3))" style="padding:5px 12px;font-size:11px;font-weight:700;border:none;cursor:pointer;background:var(--br);color:#fff">일별</button>'+
  '<button id="att-tab-month" onclick="_dineAttendTab(this.id.slice(-5))" style="padding:5px 12px;font-size:11px;font-weight:700;border:none;cursor:pointer;background:transparent;color:var(--t3)">월별</button>'+
  '</div>'+
  '<input type="date" id="att-date" value="'+today+'" class="inp" style="width:auto;padding:5px 10px;font-size:12px" data-did="'+did+'" onchange="_dineLoadAttend(this.dataset.did)">'+
  '</div></div>'+
  /* 요약 KPI */
  '<div id="att-kpi" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px"></div>'+
  '<div class="card" id="att-table"><div style="text-align:center;padding:30px;color:var(--t3)">로딩중...</div></div>';
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
 var date=document.getElementById('att-date')?.value||_today();
 if(_dineAttUnsub){_dineAttUnsub();_dineAttUnsub=null;}
 var kpi=document.getElementById('att-kpi');
 var table=document.getElementById('att-table');
 if(table)table.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">로딩중...</div>';
 _db.collection('members').where('dealerId','==',did).get().then(function(memSnap){
  var memMap={};memSnap.forEach(function(doc){memMap[doc.id]=doc.data();});
  var allMem=[];memSnap.forEach(function(doc){allMem.push({id:doc.id,data:doc.data()});});
  // 이름+전화번호 기준 중복 직원 제거
  var _seenK={};
  allMem=allMem.filter(function(m){var k=(m.data.phone||'')+'|'+(m.data.name||'');if(_seenK[k])return false;_seenK[k]=true;return true;});
  allMem=allMem.filter(function(m){return (m.data.status||'active')!=='resigned';});
  _dineAttUnsub=_db.collection('attendance').where('dealerId','==',did).where('date','==',date)
   .onSnapshot(function(attSnap){
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
    var _svgUsers='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
    var _svgOut='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
    var _svgAlert='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    var _svgCard='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
    if(kpi)kpi.innerHTML=
     '<div class="kpi-card"><div class="kpi-icon" style="background:rgba(34,197,94,.12);color:#22c55e">'+_svgUsers+'</div><div class="kpi-body"><div class="kpi-label">근무중</div><div class="kpi-val" style="color:#22c55e;font-variant-numeric:tabular-nums">'+working+'<span style="font-size:13px;font-weight:600;margin-left:3px">명</span></div></div></div>'+
     '<div class="kpi-card"><div class="kpi-icon" style="background:rgba(56,189,248,.12);color:#38bdf8">'+_svgOut+'</div><div class="kpi-body"><div class="kpi-label">퇴근</div><div class="kpi-val" style="color:#38bdf8;font-variant-numeric:tabular-nums">'+done+'<span style="font-size:13px;font-weight:600;margin-left:3px">명</span></div></div></div>'+
     '<div class="kpi-card"><div class="kpi-icon" style="background:rgba(239,68,68,.10);color:#ef4444">'+_svgAlert+'</div><div class="kpi-body"><div class="kpi-label">미출근</div><div class="kpi-val" style="color:#ef4444;font-variant-numeric:tabular-nums">'+absent+'<span style="font-size:13px;font-weight:600;margin-left:3px">명</span></div></div></div>'+
     '<div class="kpi-card"><div class="kpi-icon" style="background:rgba(201,168,76,.12);color:#c9a84c">'+_svgCard+'</div><div class="kpi-body"><div class="kpi-label">예상급여</div><div class="kpi-val" style="color:#c9a84c;font-size:20px;font-variant-numeric:tabular-nums">₩'+totalPay.toLocaleString()+'</div></div></div>';
    var tbl=document.getElementById('att-table');if(!tbl)return;
    var allIds=[...new Set([...allMem.map(function(m){return m.id;}),...Object.keys(ins)])];
    if(!allIds.length){tbl.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3);font-size:12px">'+date+' 직원 없음</div>';return;}
    var ATT_PAGE_SIZE=25;
    if(window._attPage===undefined)window._attPage=0;

    /* 퇴직자 제외된 id 목록 */
    var activeIds=allIds.filter(function(id){return (memMap[id]||{status:'active'}).status!=='resigned';});
    var totalPages=Math.ceil(activeIds.length/ATT_PAGE_SIZE)||1;
    if(window._attPage>=totalPages)window._attPage=0;

    function renderAttPage(page){
     window._attPage=page;
     var pageIds=activeIds.slice(page*ATT_PAGE_SIZE,(page+1)*ATT_PAGE_SIZE);
     var _thStyle='padding:11px 10px;font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--t3);white-space:nowrap';
     var html='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
      '<thead><tr style="border-bottom:1px solid var(--bd2);background:var(--s2)">'+
      '<th style="'+_thStyle+';text-align:left">이름</th>'+
      '<th style="'+_thStyle+';text-align:left">파트</th>'+
      '<th style="'+_thStyle+';text-align:center">출근</th>'+
      '<th style="'+_thStyle+';text-align:center">퇴근</th>'+
      '<th style="'+_thStyle+';text-align:center">근무</th>'+
      '<th style="'+_thStyle+';text-align:center">야간</th>'+
      '<th style="'+_thStyle+';text-align:right">예상급여</th>'+
      '<th style="'+_thStyle+';text-align:center">상태</th>'+
      '<th style="'+_thStyle+';text-align:center;padding-right:4px"></th>'+
      '</tr></thead><tbody>';
     pageIds.forEach(function(id){
      var m=memMap[id]||{};
      var inT=ins[id]?new Date(ins[id].time):null;
      var outT=outs[id]?new Date(outs[id].time):null;
      var diffH=0,nightH=0,estPay=0;
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
      var statusBg=isWorking?'rgba(34,197,94,.06)':isAbsent?'rgba(239,68,68,.04)':'';
      var statusAccent=isWorking?'#22c55e':isAbsent?'#ef4444':'#38bdf8';
      var nameStr=m.name||id;var initials=(nameStr||'?').slice(0,1);
      html+='<tr style="border-bottom:1px solid var(--bd);border-left:3px solid '+(statusBg?statusAccent:'transparent')+';'+(statusBg?'background:'+statusBg:'')+'">'+
       '<td style="padding:10px 10px"><div style="display:flex;align-items:center;gap:9px"><div style="width:32px;height:32px;border-radius:50%;background:'+partColor.replace(')',', .15)').replace('rgb','rgba')+';color:'+partColor+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0;background:rgba('+({'#ef4444':'239,68,68','#38bdf8':'56,189,248','#a78bfa':'167,139,250'}[partColor]||'148,163,184')+', .15)">'+initials+'</div><span style="font-weight:700">'+nameStr+'</span></div></td>'+
       '<td style="padding:8px"><span style="font-size:10px;font-weight:700;color:'+partColor+'">'+({'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||'-')+'</span></td>'+
       '<td style="padding:8px;text-align:center">'+(inT?'<span>'+inT.toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'})+'</span>':'<span style="color:#ef4444">-</span>')+'</td>'+
       '<td style="padding:8px;text-align:center">'+(outT?outT.toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):isWorking?'<span style="color:#22c55e;font-weight:700">근무중</span>':'-')+'</td>'+
       '<td style="padding:8px;text-align:center;font-weight:700;color:var(--br);font-variant-numeric:tabular-nums">'+(diffH?diffH+'h':'-')+'</td>'+
       '<td style="padding:8px;text-align:center;color:#f59e0b;font-variant-numeric:tabular-nums">'+(nightH?nightH+'h':'-')+'</td>'+
       '<td style="padding:8px;text-align:right;font-weight:800;color:#22c55e;font-variant-numeric:tabular-nums">'+(estPay?'₩'+estPay.toLocaleString():'-')+'</td>'+
       '<td style="padding:8px;text-align:center">'+
       (isWorking?'<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;background:rgba(34,197,94,.1);color:#22c55e;border-radius:20px;padding:3px 9px;border:1px solid rgba(34,197,94,.2)"><span style="width:5px;height:5px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 1.5s infinite"></span>근무중</span>':
        isAbsent?'<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;background:rgba(239,68,68,.07);color:#ef4444;border-radius:20px;padding:3px 9px;border:1px solid rgba(239,68,68,.15)"><span style="width:5px;height:5px;border-radius:50%;background:#ef4444;display:inline-block"></span>미출근</span>':
        '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;background:rgba(56,189,248,.07);color:#38bdf8;border-radius:20px;padding:3px 9px;border:1px solid rgba(56,189,248,.15)"><span style="width:5px;height:5px;border-radius:50%;background:#38bdf8;display:inline-block"></span>퇴근</span>')+
       '</td>'+
       '<td style="padding:8px;text-align:center">'+
       '<button data-mid="'+id+'" data-dt="'+date+'" onclick="_dineAttendEdit(this.dataset.mid,this.dataset.dt)" title="출퇴근 수정" style="width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--bd2);border-radius:8px;background:transparent;cursor:pointer;color:var(--t3)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'+
       '</td></tr>';
     });
     html+='</tbody></table></div>';
     /* 페이지네이션: 2페이지 이상일 때만 표시 */
     if(totalPages>1){
      html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 6px 4px;border-top:1px solid var(--bd);margin-top:4px">'+
       '<button onclick="if(window._attPage>0){window._attPage--;window._attRenderPage(window._attPage);}" style="padding:7px 16px;border:1px solid var(--bd);border-radius:8px;background:transparent;color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;'+(page===0?'opacity:.35;pointer-events:none':'')+'">← 이전</button>'+
       '<span style="font-size:12px;color:var(--t3);font-weight:700">'+(page+1)+' / '+totalPages+' (총 '+activeIds.length+'명)</span>'+
       '<button onclick="if(window._attPage<'+(totalPages-1)+'){window._attPage++;window._attRenderPage(window._attPage);}" style="padding:7px 16px;border:1px solid var(--bd);border-radius:8px;background:transparent;color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;'+(page>=totalPages-1?'opacity:.35;pointer-events:none':'')+'">다음 →</button>'+
       '</div>';
     }
     tbl.innerHTML=html;

     /* 스와이프 지원 */
     var swX=0;
     tbl.addEventListener('touchstart',function(e){swX=e.touches[0].clientX;},{passive:true,once:true});
     tbl.addEventListener('touchend',function(e){
      var dx=e.changedTouches[0].clientX-swX;
      if(Math.abs(dx)>50){
       if(dx<0&&window._attPage<totalPages-1){window._attPage++;window._attRenderPage(window._attPage);}
       else if(dx>0&&window._attPage>0){window._attPage--;window._attRenderPage(window._attPage);}
      }
     },{passive:true,once:true});
    }
    window._attRenderPage=renderAttPage;
    renderAttPage(window._attPage);
   });
 });
}

/* 월별 날짜별 그리드 — 시프티 스타일 */
function _dineLoadAttendMonth(did){
 var ym=document.getElementById('att-date')?.value||_monthStr();
 var from=ym+'-01',to=ym+'-31';
 var table=document.getElementById('att-table');
 if(table)table.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">로딩중...</div>';
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(results){
  var attSnap=results[0],memSnap=results[1];
  // 직원 목록 (퇴직자 제외, 중복 제거, 파트별 정렬)
  var memList=[];
  memSnap.forEach(function(doc){
   var d=doc.data();
   if((d.status||'active')==='resigned')return;
   memList.push({id:doc.id,data:d});
  });
  var _seenK={};
  memList=memList.filter(function(m){var k=(m.data.phone||'')+'|'+(m.data.name||'');if(_seenK[k])return false;_seenK[k]=true;return true;});
  var pOrd={kitchen:0,hall:1,management:2};
  memList.sort(function(a,b){return (pOrd[a.data.part]||9)-(pOrd[b.data.part]||9)||(a.data.name||'').localeCompare(b.data.name||'');});

  // 날짜별 출퇴근 맵: memberId → date → {in:'HH:MM', out:'HH:MM'}
  var attMap={};
  attSnap.forEach(function(doc){
   var d=doc.data();
   if(!attMap[d.memberId])attMap[d.memberId]={};
   if(!attMap[d.memberId][d.date])attMap[d.memberId][d.date]={};
   if(d.time){
    var t=new Date(d.time);
    var hhmm=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
    if(d.type==='in')attMap[d.memberId][d.date].in=hhmm;
    else attMap[d.memberId][d.date].out=hhmm;
   }
  });

  // 날짜 배열
  var yr=parseInt(ym.split('-')[0]),mo=parseInt(ym.split('-')[1])-1;
  var daysInMonth=new Date(yr,mo+1,0).getDate();
  var today=_today();
  var days=[];
  for(var di=1;di<=daysInMonth;di++){
   var ds=ym+'-'+String(di).padStart(2,'0');
   days.push({d:di,ds:ds,dow:new Date(yr,mo,di).getDay()});
  }
  var DN=['일','월','화','수','목','금','토'];
  var pColors={kitchen:'#ef4444',hall:'#38bdf8',management:'#a78bfa'};
  var pLabels={kitchen:'주방',hall:'홀',management:'관리'};

  // 헤더 행
  var thd='<th style="position:sticky;left:0;z-index:10;background:var(--bg3);min-width:72px;max-width:72px;padding:6px 6px;font-size:11px;font-weight:700;border-right:2px solid var(--bd)">이름</th>';
  days.forEach(function(day){
   var isToday=day.ds===today;
   var isSun=day.dow===0,isSat=day.dow===6;
   thd+='<th style="min-width:48px;width:48px;padding:4px 2px;text-align:center;font-size:10px;font-weight:700;'+
    (isToday?'background:rgba(201,168,76,.18);color:#c9a84c;':isSun?'color:#ef4444;':isSat?'color:#38bdf8;':'color:var(--t2);')+'">'+
    '<div>'+day.d+'</div><div style="font-size:9px;font-weight:400">'+DN[day.dow]+'</div></th>';
  });
  thd+='<th style="min-width:44px;padding:4px 4px;text-align:center;font-size:10px;font-weight:700;color:#c9a84c;border-left:2px solid var(--bd)">합계</th>';

  // 직원 행
  var tbody='';
  var lastPart=null;
  memList.forEach(function(mem){
   var m=mem.data,mid=mem.id;
   if(m.part!==lastPart){
    lastPart=m.part;
    tbody+='<tr><td colspan="'+(daysInMonth+2)+'" style="padding:3px 10px;font-size:9px;font-weight:800;letter-spacing:.8px;color:var(--t3);background:var(--bg3);border-bottom:1px solid var(--bd)">'+(pLabels[m.part]||m.part||'기타').toUpperCase()+'</td></tr>';
   }
   var pc=pColors[m.part]||'#a78bfa';
   var nameTd='<td style="position:sticky;left:0;z-index:5;background:var(--bg);padding:6px 6px;border-right:2px solid var(--bd);min-width:72px;max-width:72px;overflow:hidden">'+
    '<div style="font-size:11px;font-weight:700;color:var(--tx);word-break:keep-all;line-height:1.3">'+m.name+'</div>'+
    '<div style="font-size:9px;font-weight:700;color:'+pc+';margin-top:1px">'+(pLabels[m.part]||'-')+'</div></td>';
   var cells='';var totalH=0;
   days.forEach(function(day){
    var rec=(attMap[mid]||{})[day.ds]||{};
    var isToday=day.ds===today;
    var isSun=day.dow===0,isSat=day.dow===6;
    var isLate=false,isEarlyOut=false;
    if(rec.in){var p=rec.in.split(':');if(parseInt(p[0])>9||(parseInt(p[0])===9&&parseInt(p[1])>5))isLate=true;}
    if(rec.out&&!rec.working){var p=rec.out.split(':');if(parseInt(p[0])<17||(parseInt(p[0])===17&&parseInt(p[1])<55))isEarlyOut=true;}
    if(rec.in&&rec.out){
     var ms=new Date(day.ds+'T'+rec.in).getTime(),me=new Date(day.ds+'T'+rec.out).getTime();
     var dh=(me-ms)/3600000;totalH+=Math.max(0,dh-(dh>=8?1:dh>=4?0.5:0));
    }
    var bg=isToday?'rgba(201,168,76,.08)':(isSun||isSat)?'var(--bg3)':'';
    cells+='<td style="padding:3px 2px;text-align:center;width:48px;'+(bg?'background:'+bg:'')+'">';
    if(rec.in||rec.out){
     cells+='<div style="font-size:10px;font-weight:700;line-height:1.5;color:'+(isLate?'#ef4444':'var(--t2)')+'">'+
      (rec.in||'<span style="color:var(--bd)">-</span>')+'</div>'+
      '<div style="font-size:10px;line-height:1.5;color:'+(isEarlyOut?'#f59e0b':'var(--t3)')+'">'+
      (rec.out||'<span style="color:#22c55e;font-size:9px">●</span>')+'</div>';
    } else {
     cells+='<div style="color:var(--bd);font-size:11px">'+(isSun||isSat?'':'-')+'</div>';
    }
    cells+='</td>';
   });
   var th=Math.round(totalH*10)/10;
   tbody+='<tr style="border-bottom:1px solid var(--bd)">'+nameTd+cells+
    '<td style="padding:6px 4px;text-align:center;font-size:11px;font-weight:700;color:#c9a84c;border-left:2px solid var(--bd)">'+th+'h</td></tr>';
  });

  if(!table)return;
  table.innerHTML=
   '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">'+
   '<table style="border-collapse:collapse;font-size:11px">'+
   '<thead><tr style="background:var(--bg3);border-bottom:2px solid var(--bd)">'+thd+'</tr></thead>'+
   '<tbody>'+tbody+'</tbody></table></div>'+
   '<div style="font-size:10px;color:var(--t3);padding:8px 4px 0;display:flex;gap:14px;flex-wrap:wrap">'+
   '<span><b style="color:#ef4444">빨강</b> 지각(9:05↑)</span>'+
   '<span><b style="color:#f59e0b">주황</b> 조기퇴근(18:00↓)</span>'+
   '<span><b style="color:#22c55e">●근무</b> 아직 근무중</span></div>';
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
   '<div style="font-size:15px;font-weight:900;margin-bottom:14px">출퇴근 수정<span style="font-size:11px;color:var(--t3);font-weight:400;margin-left:8px">'+date+'</span></div>'+
   '<div class="input-group"><label>출근 시간</label><input id="ae-in" class="inp" type="time" value="'+inTime+'"></div>'+
   '<div class="input-group"><label>퇴근 시간</label><input id="ae-out" class="inp" type="time" value="'+outTime+'"></div>'+
   '<div style="font-size:10px;color:var(--t3);margin-bottom:12px">수동 수정은 기록에 남습니다</div>'+
   '<div style="display:flex;gap:8px">'+
   '<button class="btn btn-primary" style="flex:1" data-mid="'+memberId+'" data-dt="'+date+'" data-in="'+(inDoc||'')+'" data-out="'+(outDoc||'')+'" onclick="_dineAttendSave(this.dataset.mid,this.dataset.dt,this.dataset.in,this.dataset.out)">저장</button>'+
   '<button class="btn btn-ghost" onclick="this.closest(&apos;.mo&apos;).remove()">취소</button>'+
   '</div>';
  mo.appendChild(box);mo.onclick=function(e){if(e.target===mo)mo.remove();};document.body.appendChild(mo);
 });
}

function _dineAttendSave(memberId,date,inDocId,outDocId){
 var did=_CU.dealerId;
 var inTime=document.getElementById('ae-in').value;
 var outTime=document.getElementById('ae-out').value;
 var now=_nowISO();
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
  _dineToast('수정됐습니다');
  document.querySelector('.mo').remove();
  _dineLoadAttend(did);
 }).catch(function(e){_dineToast('오류: '+e.message);});
}

/* ── 직원 대시보드 ── */
/* ── 상황별 응원 메시지 ── */
/* 스케줄 인식 응원 메시지 — sch가 있으면 시프트 상대 위치로, 없으면 절대 시각 폴백 */
function _dineCheerMsg(sch){
 var now=new Date();
 var h=now.getHours(),m=now.getMinutes(),d=now.getDate(),dow=now.getDay();
 var hm=h*100+m;
 var payday=(_CU.company&&_CU.company.payday)||25;
 var name=(_CU.name||'').split(' ')[0]||'';
 /* 월급날 최우선 */
 if(d===payday) return {bg:'linear-gradient(135deg,#c9a84c,#a67c2e)',emoji:'🎉',msg:'오늘 월급날이야'+(name?' '+name+'!':'!'),sub:'이번 달도 진짜 고생했어. 오늘은 하고 싶은 거 다 해~'};
 /* 스케줄 있으면 시프트 내 상대 위치로 판단 */
 if(sch&&sch.startTime&&sch.endTime){
  var sp=sch.startTime.split(':'),ep=sch.endTime.split(':');
  var startM=parseInt(sp[0])*60+(parseInt(sp[1])||0);
  var endM=parseInt(ep[0])*60+(parseInt(ep[1])||0);
  var nowM=h*60+m;
  if(endM<=startM)endM+=1440; /* 야간 자정 넘김 */
  if(nowM<startM&&endM>1440)nowM+=1440;
  var dur=endM-startM;
  var elapsed=nowM-startM;
  var ratio=dur>0?elapsed/dur:0.5;
  var startH=parseInt(sp[0]);
  var isMorn=(startH>=5&&startH<12);
  var isEve=(startH>=12&&startH<20);
  var isNight=(startH>=20||startH<5);
  /* 출근 직후 (비율 12% 미만 또는 아직 시프트 전) */
  if(ratio<0.12){
   var greets=[
    {emoji:'☕',msg:'왔어? 오늘도 잘 부탁해'+(name?' '+name+'~':'~'),sub:'천천히 시작해도 돼. 커피 한 잔하고 가자'},
    {emoji:'🌅',msg:'나와줬네'+(name?' '+name+'!':'!'),sub:'시작이 반이야. 그냥 흘러가다 보면 다 돼'},
    {emoji:'👋',msg:'안녕'+(name?' '+name+'!':'!'),sub:'오늘도 같이 잘 해보자. 잘 부탁해'}
   ];
   var g=greets[d%3];
   return Object.assign({bg:'linear-gradient(135deg,#06b6d4,#0891b2)'},g);
  }
  /* 퇴근 직전 (비율 85% 이상) */
  if(ratio>=0.85){
   var ends=[
    {emoji:'🏁',msg:'거의 다 왔어! 조금만 더',sub:'퇴근까지 얼마 안 남았어. 마무리 잘 하고 가'},
    {emoji:'🎯',msg:'끝이 보인다, 힘내!',sub:'이 구간이 제일 길게 느껴지는데 — 진짜 얼마 없어'}
   ];
   var e=ends[d%2];
   return Object.assign({bg:'linear-gradient(135deg,#16a34a,#15803d)'},e);
  }
  /* 후반전 (65~84%) */
  if(ratio>=0.65){
   return {bg:'linear-gradient(135deg,#8b5cf6,#6d28d9)',emoji:'💪',msg:'후반전이야, 마무리 잘 하자!',sub:'지금이 제일 힘든 구간인데 — 거의 다 왔거든'};
  }
  /* 피크 시간 — 본인 시프트 타입에 맞는 것만 */
  if(isMorn&&h>=11&&h<14) return {bg:'linear-gradient(135deg,#f97316,#ea580c)',emoji:'🔥',msg:'점심 피크야, 힘내!',sub:'조금만 버텨봐. 이 시간 지나면 좀 한숨 돌려'};
  if((isEve||isNight)&&h>=18&&h<21) return {bg:'linear-gradient(135deg,#f97316,#ea580c)',emoji:'🔥',msg:'저녁 러시야, 힘내!',sub:'이 시간만 넘기면 돼. 거의 다 왔어'};
  if(isNight&&(h>=23||h<3)) return {bg:'linear-gradient(135deg,#475569,#334155)',emoji:'🌙',msg:'야간이지만 수고 많아',sub:'이 시간대 진짜 쉽지 않은데 대단해. 조금만 더'};
  /* 중반 — 시프트 내 별 이슈 없는 구간 */
  return {bg:'linear-gradient(135deg,#16a34a,#15803d)',emoji:'👍',msg:'잘 하고 있어'+(name?' '+name+'~':'~'),sub:'이 페이스로 그냥 가면 돼. 어렵지 않아'};
 }
 /* 스케줄 없을 때 — 절대 시각 기반 폴백 */
 if(hm>=1130&&hm<1330) return {bg:'linear-gradient(135deg,#f97316,#ea580c)',emoji:'🔥',msg:'지금 점심 피크야, 힘내!',sub:'조금만 버텨봐. 이 시간 지나면 좀 한숨 돌려'};
 if(hm>=1730&&hm<2100) return {bg:'linear-gradient(135deg,#8b5cf6,#6d28d9)',emoji:'💪',msg:'저녁 러시, 거의 다 왔어!',sub:'조금만 더 — 끝나면 맛있는 거 먹자'};
 if(dow===1&&hm<1000) return {bg:'linear-gradient(135deg,#0ea5e9,#0284c7)',emoji:'😤',msg:'월요일... 그래도 왔잖아',sub:'오늘 하루만 잘 버티면 나머지는 금방이야'};
 if(dow===5&&hm>=1700) return {bg:'linear-gradient(135deg,#16a34a,#15803d)',emoji:'🙌',msg:'금요일 마무리야!',sub:'오늘 다 끝내고 주말 마음 편히 즐겨'};
 if(h>=22||h<5) return {bg:'linear-gradient(135deg,#475569,#334155)',emoji:'🌙',msg:'이 시간에도 수고가 많다',sub:'오늘 하루 진짜 고생했어. 빨리 쉬어'};
 return {bg:'linear-gradient(135deg,#16a34a,#15803d)',emoji:'👋',msg:'오늘도 잘 부탁해'+(name?' '+name+'~':'~'),sub:'천천히 해도 돼. 같이 하면 다 잘 되거든'};
}

function _dineStaffDashboard(el){
 var did=_CU.dealerId;
 var sid=_CU.staffId||_CU.uid;
 var today=new Date();
 var todayStr=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');

 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='padding:0 0 32px';

 /* ── 응원 메시지 카드 ── */
 var cm=_dineCheerMsg();
 var cheerCard=document.createElement('div');
 cheerCard.style.cssText='margin:16px 16px 0;border-radius:18px;padding:20px;background:'+cm.bg+';color:#fff;';
 cheerCard.id='staff-cheer-card';
 cheerCard.innerHTML=
  '<div id="staff-cheer-emoji" style="font-size:28px;margin-bottom:8px">'+cm.emoji+'</div>'+
  '<div id="staff-cheer-msg" style="font-size:16px;font-weight:800;letter-spacing:-.3px;line-height:1.4;margin-bottom:4px">'+cm.msg+'</div>'+
  '<div id="staff-cheer-sub" style="font-size:12px;opacity:.85">'+cm.sub+'</div>'+
  '<div style="font-size:11px;opacity:.6;margin-top:12px">'+(_CU.name||'직원')+'님 · '+_fmtDateKo(today)+'</div>';
 wrap.appendChild(cheerCard);

 /* ── 이번 달 예상 급여 카드 ── */
 var payCard=document.createElement('div');
 payCard.style.cssText='margin:12px 16px 0;background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:18px;display:flex;justify-content:space-between;align-items:center;';
 payCard.innerHTML=
  '<div>'+
  '<div style="font-size:11px;font-weight:700;color:var(--t2);letter-spacing:1px;margin-bottom:6px">이번 달 예상 급여</div>'+
  '<div id="staff-month-pay" style="font-size:26px;font-weight:900;color:var(--br);letter-spacing:-.5px">계산 중...</div>'+
  '<div id="staff-month-pay-sub" style="font-size:11px;color:var(--t3);margin-top:3px"></div>'+
  '</div>'+
  '<div style="text-align:right">'+
  '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">근무시간</div>'+
  '<div id="staff-month-hours" style="font-size:16px;font-weight:800;color:var(--tx)">—</div>'+
  '<div style="font-size:10px;color:var(--t3);margin-top:2px">실수령 기준</div>'+
  '</div>';
 wrap.appendChild(payCard);

 /* ── 현재 근무 카드 ── */
 var clockCard=document.createElement('div');
 clockCard.id='staff-clock-card';
 clockCard.style.cssText='margin:12px 16px 0;background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:18px 18px 14px;';
 clockCard.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--t2);letter-spacing:1px;margin-bottom:10px">오늘 출퇴근</div>'+
  '<div id="staff-clock-inner" style="display:flex;align-items:center;gap:10px"><div style="color:var(--t3);font-size:13px">로딩 중...</div></div>';
 wrap.appendChild(clockCard);

 /* ── 이번 주 근무 카드 ── */
 var weekCard=document.createElement('div');
 weekCard.style.cssText='margin:12px 16px 0;background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:18px;';
 weekCard.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--t2);letter-spacing:1px;margin-bottom:14px">이번주 근무</div>'+
  '<div id="staff-week-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center"></div>'+
  '<div id="staff-week-hours" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--bd)"></div>';
 wrap.appendChild(weekCard);

 /* ── 1주 평균 근로시간 카드 ── */
 var avgCard=document.createElement('div');
 avgCard.style.cssText='margin:12px 16px 0;background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:18px;';
 avgCard.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--t2);letter-spacing:1px;margin-bottom:12px">1주 평균 근로시간</div>'+
  '<div id="staff-avg-inner"><div style="color:var(--t3);font-size:13px">계산 중...</div></div>';
 wrap.appendChild(avgCard);

 el.appendChild(wrap);

 /* 데이터 로드 */
 _staffLoadClock(did,sid,todayStr);
 _staffLoadWeek(did,sid,today);
 _staffLoadAvg(did,sid,today);
 _staffLoadMonthPay(did,sid,today);
}

/* ── 이번 달 예상 급여 계산 ── */
function _staffLoadMonthPay(did,sid,today){
 var FS='https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents';
 var tok=_dineToken||'';
 var ym=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
 Promise.all([
  fetch(FS+'/members/'+sid,{headers:{'Authorization':'Bearer '+tok}}).then(function(r){return r.json();}).catch(function(){return null;}),
  fetch(FS+':runQuery',{method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
   body:JSON.stringify({structuredQuery:{from:[{collectionId:'attendance'}],where:{compositeFilter:{op:'AND',filters:[
    {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
    {fieldFilter:{field:{fieldPath:'memberId'},op:'EQUAL',value:{stringValue:sid}}},
    {fieldFilter:{field:{fieldPath:'date'},op:'GREATER_THAN_OR_EQUAL',value:{stringValue:ym+'-01'}}},
    {fieldFilter:{field:{fieldPath:'date'},op:'LESS_THAN_OR_EQUAL',value:{stringValue:ym+'-31'}}}
   ]}}}})
  }).then(function(r){return r.json();}).catch(function(){return [];})
 ]).then(function(res){
  var memF=res[0]&&res[0].fields?res[0].fields:null;
  var attDocs=Array.isArray(res[1])?res[1].filter(function(d){return d.document;}).map(function(d){return d.document.fields;}):[];
  var wage=memF&&memF.wage?Number(memF.wage.integerValue||memF.wage.doubleValue||0):(memF&&memF.hourlyWage?Number(memF.hourlyWage.integerValue||0):10320);
  var wageType=memF&&memF.wageType?memF.wageType.stringValue:'hourly';
  var monthlySalary=memF&&memF.monthlySalary?Number(memF.monthlySalary.integerValue||memF.monthlySalary.doubleValue||0):0;
  var dateIns={},dateOuts={};
  attDocs.forEach(function(f){
   if(!f.date||!f.type)return;
   var ds=f.date.stringValue,tp=f.type.stringValue,tm=f.time?f.time.stringValue:'';
   if(tp==='in')dateIns[ds]=tm;
   else if(tp==='out')dateOuts[ds]=tm;
  });
  var totalMin=0;var workDays=Object.keys(dateIns).length;
  var todayStr=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  Object.keys(dateIns).forEach(function(date){
   var inT=new Date(dateIns[date]);
   var outT=dateOuts[date]?new Date(dateOuts[date]):(date===todayStr?today:null);
   if(!outT)return;
   var diffMin=(outT-inT)/60000;
   var brMin=diffMin>=480?60:diffMin>=240?30:0;
   totalMin+=Math.max(0,diffMin-brMin);
  });
  var workH=totalMin/60;
  var basePay=wageType==='monthly'?Math.round((monthlySalary||2500000)*workDays/22):Math.round(workH*wage);
  var ins4=Math.round(basePay*0.0925);
  var netPay=basePay-ins4;
  var payEl=document.getElementById('staff-month-pay');
  var subEl=document.getElementById('staff-month-pay-sub');
  var hoursEl=document.getElementById('staff-month-hours');
  if(payEl)payEl.textContent='₩'+netPay.toLocaleString();
  if(subEl)subEl.textContent='세전 ₩'+basePay.toLocaleString()+' · 4대보험 -₩'+ins4.toLocaleString();
  if(hoursEl)hoursEl.textContent=Math.floor(workH)+'h '+Math.round((workH%1)*60)+'m';
 }).catch(function(){
  var payEl=document.getElementById('staff-month-pay');
  if(payEl)payEl.textContent='조회 실패';
 });
}

function _fmtDateKo(d){
 var days=['일','월','화','수','목','금','토'];
 return d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일 ('+days[d.getDay()]+'요일)';
}

function _staffLoadClock(did,sid,todayStr){
 var FS='https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents';
 var tok=_dineToken||'';
 function runQ1(sq){
  return fetch(FS+':runQuery',{
   method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
   body:JSON.stringify({structuredQuery:sq})
  }).then(function(r){return r.json();}).then(function(docs){
   return Array.isArray(docs)&&docs[0]&&docs[0].document?docs[0].document:null;
  });
 }
 function attFilter(type){return {from:[{collectionId:'attendance'}],where:{compositeFilter:{op:'AND',filters:[
  {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
  {fieldFilter:{field:{fieldPath:'memberId'},op:'EQUAL',value:{stringValue:sid}}},
  {fieldFilter:{field:{fieldPath:'date'},op:'EQUAL',value:{stringValue:todayStr}}},
  {fieldFilter:{field:{fieldPath:'type'},op:'EQUAL',value:{stringValue:type}}}
 ]}},limit:1};}
 var schFilter={from:[{collectionId:'dine_schedules'}],where:{compositeFilter:{op:'AND',filters:[
  {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
  {fieldFilter:{field:{fieldPath:'staffId'},op:'EQUAL',value:{stringValue:sid}}},
  {fieldFilter:{field:{fieldPath:'date'},op:'EQUAL',value:{stringValue:todayStr}}}
 ]}},limit:1};
 Promise.all([
  runQ1(attFilter('in')),
  runQ1(attFilter('out')),
  runQ1(schFilter),
  fetch(FS+'/members/'+sid,{headers:{'Authorization':'Bearer '+tok}}).then(function(r){return r.json();}).catch(function(){return null;})
 ]).then(function(results){
  var inDoc=results[0]?results[0].fields:null;
  var outDoc=results[1]?results[1].fields:null;
  var inDocId=results[0]?results[0].name.split('/').pop():'';
  var schFields=results[2]?results[2].fields:null;
  var memFields=results[3]&&results[3].fields?results[3].fields:null;
  var isIn=!!inDoc&&!outDoc;
  var inTimeStr=inDoc&&inDoc.time?inDoc.time.stringValue.substring(11,16):'';
  var sch=schFields?{startTime:(schFields.startTime&&schFields.startTime.stringValue)||'',endTime:(schFields.endTime&&schFields.endTime.stringValue)||''}:null;
  var schStr=sch?(sch.startTime+'~'+sch.endTime):'일정없음';
  var wage=memFields&&memFields.wage?Number(memFields.wage.integerValue||memFields.wage.doubleValue||0):0;
  var wageType=memFields&&memFields.wageType?memFields.wageType.stringValue:'hourly';
  var inner=document.getElementById('staff-clock-inner');
  if(!inner)return;
  /* 응원 카드 업데이트 — 스케줄 데이터 확보 후 개인화 */
  var cc2=document.getElementById('staff-cheer-card');
  if(cc2){
   if(!sch&&!inDoc){
    /* 휴무일 */
    var offMsgs=[
     {emoji:'🌿',msg:'오늘은 쉬는 날이야',sub:'폰 내려놓고 그냥 편하게 있어. 아무것도 안 해도 돼'},
     {emoji:'☀️',msg:'오늘은 그냥 나만의 날',sub:'먹고 싶은 거 먹고, 보고 싶은 거 봐. 그게 다야'},
     {emoji:'💤',msg:'오늘은 빠짝 쉬어',sub:'잘 쉬어야 다음에도 잘 할 수 있거든. 진심으로 완전 OFF해'},
     {emoji:'🎧',msg:'오늘은 아무 생각 하지 마',sub:'일 걱정은 내일부터. 지금은 그냥 너 시간이야'}
    ];
    var om=offMsgs[today.getDate()%offMsgs.length];
    cc2.style.background='linear-gradient(135deg,#334155,#1e293b)';
    var em2=document.getElementById('staff-cheer-emoji');if(em2)em2.textContent=om.emoji;
    var mmsg2=document.getElementById('staff-cheer-msg');if(mmsg2)mmsg2.textContent=om.msg;
    var msub2=document.getElementById('staff-cheer-sub');if(msub2)msub2.textContent=om.sub;
   } else {
    /* 근무일 — 스케줄 기반 개인화 멘트로 교체 */
    var pcm=_dineCheerMsg(sch);
    cc2.style.background=pcm.bg;
    var em3=document.getElementById('staff-cheer-emoji');if(em3)em3.textContent=pcm.emoji;
    var mmsg3=document.getElementById('staff-cheer-msg');if(mmsg3)mmsg3.textContent=pcm.msg;
    var msub3=document.getElementById('staff-cheer-sub');if(msub3)msub3.textContent=pcm.sub;
   }
  }
  var badge=isIn?'<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(22,163,74,.12);color:#16a34a;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700"><span style="width:6px;height:6px;background:#16a34a;border-radius:50%;display:inline-block"></span>근무중</span>':
   (inDoc&&outDoc?'<span style="background:rgba(71,85,105,.1);color:var(--t2);border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700">퇴근완료</span>':
   '<span style="background:rgba(71,85,105,.1);color:var(--t2);border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700">미출근</span>');
  var html='<div style="flex:1">';
  html+='<div style="font-size:14px;font-weight:700;color:var(--tx);margin-bottom:6px">'+badge+'</div>';
  if(sch)html+='<div style="font-size:13px;color:var(--t2)">스케줄 <b style="color:var(--tx)">'+schStr+'</b></div>';
  if(inTimeStr)html+='<div style="font-size:12px;color:var(--t2);margin-top:4px">출근 '+inTimeStr+'</div>';
  if(wage>0&&inDoc){
   var nowMs=new Date();
   var inTime=inDoc.time?new Date(inDoc.time.stringValue):null;
   if(inTime){
    var outTime=outDoc&&outDoc.time?new Date(outDoc.time.stringValue):nowMs;
    var workMin=Math.round((outTime.getTime()-inTime.getTime())/60000);
    var workH=Math.floor(workMin/60);var workM=workMin%60;
    var todayPay=wageType==='hourly'?Math.round(wage*workMin/60):Math.round(wage/30);
    html+='<div style="font-size:11px;color:var(--t2);margin-top:6px">'+
     (outDoc?'오늘 근무 ':'현재 ')+workH+'시간 '+workM+'분'+
     ' → <b style="color:#c9a84c">'+todayPay.toLocaleString()+'원</b></div>';
   }
  } else if(memFields&&wage===0){
   html+='<div style="font-size:11px;color:var(--t3);margin-top:6px">급여 미등록 (관리자 설정 필요)</div>';
  }
  html+='</div>';
  if(!inDoc){
   html+='<button onclick="_dineStaffClockIn()" style="padding:10px 18px;background:linear-gradient(135deg,#16a34a,#15803d);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:800;cursor:pointer">출근하기</button>';
  } else if(!outDoc){
   html+='<button onclick="_dineStaffClockOut(\''+inDocId+'\')" style="padding:10px 18px;background:linear-gradient(135deg,#dc2626,#b91c1c);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:800;cursor:pointer">퇴근하기</button>';
  }
  inner.innerHTML=html;
 }).catch(function(e){console.error('clock load err:',e);});
}

window._dineStaffClockIn=function(){
 var did=_CU.dealerId;
 var sid=_CU.staffId||_CU.uid;
 var now=new Date();
 var todayStr=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/attendance',{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':'Bearer '+(_dineToken||'')},
  body:JSON.stringify({fields:{
   dealerId:{stringValue:did},memberId:{stringValue:sid},type:{stringValue:'in'},
   time:{stringValue:now.toISOString()},date:{stringValue:todayStr},createdAt:{stringValue:now.toISOString()}
  }})
 }).then(function(r){return r.json();}).then(function(doc){
  if(doc.name){_dineToast('출근 처리됐습니다');_staffLoadClock(did,sid,todayStr);}
  else{_dineToast('오류: '+(doc.error&&doc.error.message||'저장 실패'));}
 }).catch(function(e){_dineToast('오류: '+e.message);});
};

window._dineStaffClockOut=function(inDocId){
 var did=_CU.dealerId;
 var sid=_CU.staffId||_CU.uid;
 var now=new Date();
 var todayStr=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/attendance',{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':'Bearer '+(_dineToken||'')},
  body:JSON.stringify({fields:{
   dealerId:{stringValue:did},memberId:{stringValue:sid},type:{stringValue:'out'},
   time:{stringValue:now.toISOString()},date:{stringValue:todayStr},createdAt:{stringValue:now.toISOString()}
  }})
 }).then(function(r){return r.json();}).then(function(doc){
  if(doc.name){_dineToast('퇴근 처리됐습니다');_staffLoadClock(did,sid,todayStr);}
  else{_dineToast('오류: '+(doc.error&&doc.error.message||'저장 실패'));}
 }).catch(function(e){_dineToast('오류: '+e.message);});
};

function _staffLoadWeek(did,sid,today){
 var dow=today.getDay();
 var sunday=new Date(today);sunday.setDate(today.getDate()-dow);
 var dates=[];
 for(var i=0;i<7;i++){var d=new Date(sunday);d.setDate(sunday.getDate()+i);dates.push(d);}
 var dayNames=['일','월','화','수','목','금','토'];
 var todayStr=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
 var startStr=_dateStr(dates[0]);
 var endStr=_dateStr(dates[6]);

 var FS2='https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents';
 var tok2=_dineToken||'';
 function runQAll(sq){
  return fetch(FS2+':runQuery',{
   method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok2},
   body:JSON.stringify({structuredQuery:sq})
  }).then(function(r){return r.json();}).then(function(docs){
   return Array.isArray(docs)?docs.filter(function(d){return d.document;}).map(function(d){return d.document.fields;}):[];
  });
 }
 Promise.all([
  runQAll({from:[{collectionId:'dine_schedules'}],where:{compositeFilter:{op:'AND',filters:[
   {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
   {fieldFilter:{field:{fieldPath:'staffId'},op:'EQUAL',value:{stringValue:sid}}},
   {fieldFilter:{field:{fieldPath:'date'},op:'GREATER_THAN_OR_EQUAL',value:{stringValue:startStr}}},
   {fieldFilter:{field:{fieldPath:'date'},op:'LESS_THAN_OR_EQUAL',value:{stringValue:endStr}}}
  ]}}}),
  runQAll({from:[{collectionId:'attendance'}],where:{compositeFilter:{op:'AND',filters:[
   {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
   {fieldFilter:{field:{fieldPath:'memberId'},op:'EQUAL',value:{stringValue:sid}}},
   {fieldFilter:{field:{fieldPath:'date'},op:'GREATER_THAN_OR_EQUAL',value:{stringValue:startStr}}},
   {fieldFilter:{field:{fieldPath:'date'},op:'LESS_THAN_OR_EQUAL',value:{stringValue:endStr}}}
  ]}}}),
 ]).then(function(results){
  var schDocs=results[0],attDocs=results[1];
  var schMap={};
  schDocs.forEach(function(f){if(f.date)schMap[f.date.stringValue]=f;});
  var attMap={};
  attDocs.forEach(function(f){
   if(!f.date||!f.type)return;
   var ds=f.date.stringValue;var tp=f.type.stringValue;var tm=f.time?f.time.stringValue:'';
   if(!attMap[ds])attMap[ds]={};attMap[ds][tp]=tm;
  });
  var grid=document.getElementById('staff-week-grid');
  if(!grid)return;
  grid.innerHTML=dates.map(function(d,i){
   var ds=_dateStr(d);
   var isToday=ds===todayStr;
   var sch=schMap[ds];
   var att=attMap[ds]||{};
   var bgColor=isToday?'rgba(8,145,178,.1)':'transparent';
   var txColor=isToday?'#0891b2':'var(--t2)';
   var borderColor=isToday?'rgba(8,145,178,.3)':'var(--bd)';
   var stTime=sch&&sch.startTime?sch.startTime.stringValue:'';
   var enTime=sch&&sch.endTime?sch.endTime.stringValue:'';
   var timeHtml=sch?('<div style="font-size:9px;color:var(--tx);font-weight:700;margin-top:4px">'+stTime+'</div><div style="font-size:9px;color:var(--t2)">'+enTime+'</div>'):
    (att.in?'<div style="font-size:9px;color:#16a34a;margin-top:4px">출근</div>':'<div style="font-size:9px;color:var(--t3);margin-top:4px">-</div>');
   return '<div style="background:'+bgColor+';border:1px solid '+borderColor+';border-radius:8px;padding:8px 4px">'+
    '<div style="font-size:10px;font-weight:700;color:'+txColor+'">'+dayNames[i]+'</div>'+
    '<div style="font-size:9px;color:'+txColor+'">'+d.getDate()+'</div>'+timeHtml+'</div>';
  }).join('');
  var totalMin=0;
  dates.forEach(function(d){
   var ds=_dateStr(d);var att=attMap[ds]||{};
   if(att.in&&att.out){
    var inMs=new Date(att.in).getTime();var outMs=new Date(att.out).getTime();
    if(outMs>inMs)totalMin+=(outMs-inMs)/60000;
   }
  });
  var totalH=Math.floor(totalMin/60);
  var totalM=Math.round(totalMin%60);
  var pct=Math.min(100,Math.round(totalMin/2400*100));
  var hoursEl=document.getElementById('staff-week-hours');
  if(hoursEl){
   hoursEl.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
    '<span style="font-size:12px;color:var(--t2)">이번 주 근무시간</span>'+
    '<span style="font-size:14px;font-weight:800;color:var(--tx)">'+totalH+'시간 '+totalM+'분</span></div>'+
    '<div style="height:6px;background:var(--bd);border-radius:3px"><div style="height:6px;width:'+pct+'%;background:linear-gradient(90deg,#0891b2,#38bdf8);border-radius:3px;transition:.4s"></div></div>'+
    '<div style="font-size:10px;color:var(--t3);margin-top:4px;text-align:right">법정 40시간 기준</div>';
  }
 }).catch(function(e){console.error('week load err:',e);});
}

function _staffLoadAvg(did,sid,today){
 var fourWeeksAgo=new Date(today);fourWeeksAgo.setDate(today.getDate()-28);
 var startStr=_dateStr(fourWeeksAgo);
 var todayStr=_dateStr(today);
 var FS3='https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents';
 var tok3=_dineToken||'';
 fetch(FS3+':runQuery',{
  method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok3},
  body:JSON.stringify({structuredQuery:{from:[{collectionId:'attendance'}],where:{compositeFilter:{op:'AND',filters:[
   {fieldFilter:{field:{fieldPath:'dealerId'},op:'EQUAL',value:{stringValue:did}}},
   {fieldFilter:{field:{fieldPath:'memberId'},op:'EQUAL',value:{stringValue:sid}}},
   {fieldFilter:{field:{fieldPath:'date'},op:'GREATER_THAN_OR_EQUAL',value:{stringValue:startStr}}},
   {fieldFilter:{field:{fieldPath:'date'},op:'LESS_THAN_OR_EQUAL',value:{stringValue:todayStr}}}
  ]}}}})})
 .then(function(r){return r.json();}).then(function(docs){
  var attDocs=Array.isArray(docs)?docs.filter(function(d){return d.document;}).map(function(d){return d.document.fields;}):[];
  var attMap={};
  attDocs.forEach(function(f){
   if(!f.date||!f.type)return;
   var ds=f.date.stringValue;var tp=f.type.stringValue;var tm=f.time?f.time.stringValue:'';
   if(!attMap[ds])attMap[ds]={};attMap[ds][tp]=tm;
  });
  var weekMins=[0,0,0,0];
  Object.keys(attMap).forEach(function(ds){
   var att=attMap[ds];
   if(att.in&&att.out){
    var dayDate=new Date(ds);var diffDays=Math.floor((today-dayDate)/86400000);
    var wk=Math.min(3,Math.floor(diffDays/7));
    var ms=new Date(att.out).getTime()-new Date(att.in).getTime();
    if(ms>0)weekMins[wk]+=ms/60000;
   }
  });
  var nonZero=weekMins.filter(function(m){return m>0;});
  var avgMin=nonZero.length?nonZero.reduce(function(a,b){return a+b;},0)/nonZero.length:0;
  var avgH=Math.floor(avgMin/60);var avgM=Math.round(avgMin%60);
  var pct=Math.min(100,Math.round(avgMin/2400*100));
  var mo=fourWeeksAgo.getMonth()+1;var mo2=today.getMonth()+1;
  var rangeStr=mo===mo2?mo+'월':mo+'월~'+mo2+'월';
  var el=document.getElementById('staff-avg-inner');
  if(!el)return;
  el.innerHTML='<div style="font-size:11px;color:var(--t2);margin-bottom:8px">'+rangeStr+' 기준</div>'+
   '<div style="font-size:32px;font-weight:900;color:var(--tx);line-height:1">'+avgH+'<span style="font-size:14px;font-weight:400;color:var(--t2)">시간 '+avgM+'분</span></div>'+
   '<div style="height:6px;background:var(--bd);border-radius:3px;margin-top:12px"><div style="height:6px;width:'+pct+'%;background:linear-gradient(90deg,#C8A356,#f0c56a);border-radius:3px;transition:.4s"></div></div>'+
   '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t3);margin-top:4px"><span>0h</span><span>법정 40h</span></div>';
 }).catch(function(e){console.error('avg load err:',e);});
}

function _dateStr(d){
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}


