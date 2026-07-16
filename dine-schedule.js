/**
 * @module      dine-schedule.js
 * ══════════════════════════════════════════════════════
 * 역할: DINE 스케줄·자동급여·명세서·알림톡
 *
 * 분리 출처: dine.js (2026-07-16 리팩토링)
 *
 * 포함 함수:
 *   _dineScheduleAdd/AddDay/Save/SaveDirect/SaveDo
 *   _dineScheduleEdit/Update/Delete/Week
 *   _dineAutoPayroll
 *   _dinePayslip / _dinePayslipList / _dinePayslipBulkSend
 *   _dinePayrollLock
 *   _dineAlimtalk
 *
 * 의존: dine.js (_dineToast, _db, _CU)
 * ══════════════════════════════════════════════════════
 */

function _dineScheduleAdd(did){
 _db.collection('staff').where('dealerId','==',did).get().then(function(snap){
  if(snap.empty){_dineToast('⚠️ 등록된 직원이 없습니다');return;}
  var opts=snap.docs.map(function(d){return '<option value="'+d.id+'">'+d.data().name+'</option>';}).join('');
  var mo=document.createElement('div');mo.className='mo';
  var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
  box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">📅 근무 스케줄 등록</div>'+
   '<div class="input-group"><label>직원 *</label><select id="sch-staff" class="inp">'+opts+'</select></div>'+
   '<div class="input-group"><label>날짜 *</label><input id="sch-date" class="inp" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div>'+
   '<div style="display:flex;gap:8px">'+
   '<div class="input-group" style="flex:1"><label>출근</label><input id="sch-start" class="inp" type="time" value="09:00"></div>'+
   '<div class="input-group" style="flex:1"><label>퇴근</label><input id="sch-end" class="inp" type="time" value="18:00"></div>'+
   '</div>'+
   '<div class="input-group"><label>메모</label><input id="sch-note" class="inp" placeholder="오픈, 마감 등"></div>'+
   '<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:12px">'+
   '<input type="checkbox" id="sch-push" checked> 직원에게 푸시 알림</div>'+
   '<div style="display:flex;gap:8px;margin-top:16px">'+
   '<button class="btn btn-primary" style="flex:1" onclick="_dineScheduleSave(did_val)">저장</button>'+
   '<button class="btn btn-ghost" onclick="this.closest(cls).remove()">취소</button></div>';
  // did/cls 치환
  box.querySelector('[onclick="_dineScheduleSave(did_val)"]').onclick=function(){_dineScheduleSave(did);};
  box.querySelector('[onclick="this.closest(cls).remove()"]').onclick=function(){this.closest('.mo').remove();};
  mo.appendChild(box);mo.onclick=function(e){if(e.target===mo)mo.remove();};
  document.body.appendChild(mo);
 });
}

function _dineScheduleAddDay(staffId,staffName,date,did){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
 box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">📅 '+staffName+' ('+date+')</div>'+
  '<div style="display:flex;gap:8px">'+
  '<div class="input-group" style="flex:1"><label>출근</label><input id="sch-start2" class="inp" type="time" value="09:00"></div>'+
  '<div class="input-group" style="flex:1"><label>퇴근</label><input id="sch-end2" class="inp" type="time" value="18:00"></div>'+
  '</div>'+
  '<div class="input-group"><label>메모</label><input id="sch-note2" class="inp" placeholder="오픈, 마감, 오후 등"></div>'+
  '<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:12px">'+
  '<input type="checkbox" id="sch-push2" checked> 직원에게 푸시</div>'+
  '<div style="display:flex;gap:8px">'+
  '<button class="btn btn-primary" style="flex:1" id="sch-save-btn">저장</button>'+
  '<button class="btn btn-ghost" id="sch-cancel-btn">취소</button></div>';
 mo.appendChild(box);
 box.querySelector('#sch-save-btn').onclick=function(){_dineScheduleSaveDirect(staffId,staffName,date,did);};
 box.querySelector('#sch-cancel-btn').onclick=function(){mo.remove();};
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

function _dineScheduleSave(did){
 var staffSel=document.getElementById('sch-staff');
 var staffId=staffSel.value;
 var staffName=staffSel.options[staffSel.selectedIndex].text;
 var date=document.getElementById('sch-date').value;
 var startTime=document.getElementById('sch-start').value;
 var endTime=document.getElementById('sch-end').value;
 var note=document.getElementById('sch-note').value.trim();
 var pushOn=document.getElementById('sch-push').checked;
 if(!date){_dineToast('⚠️ 날짜를 선택해주세요');return;}
 _dineScheduleSaveDo(staffId,staffName,date,startTime,endTime,note,did,pushOn);
}

function _dineScheduleSaveDirect(staffId,staffName,date,did){
 var startTime=document.getElementById('sch-start2').value;
 var endTime=document.getElementById('sch-end2').value;
 var note=document.getElementById('sch-note2').value.trim();
 var pushOn=document.getElementById('sch-push2').checked;
 _dineScheduleSaveDo(staffId,staffName,date,startTime,endTime,note,did,pushOn);
}

function _dineScheduleSaveDo(staffId,staffName,date,startTime,endTime,note,did,pushOn){
 _db.collection('dine_schedules').add({
  dealerId:did,staffId:staffId,staffName:staffName,
  date:date,startTime:startTime,endTime:endTime,
  note:note,createdAt:new Date().toISOString()
 }).then(function(){
  _dineToast('✅ 스케줄 등록됐습니다');
  document.querySelector('.mo')?.remove();
  if(pushOn){
   _db.collection('staff').doc(staffId).get().then(function(snap){
    var d=snap.data()||{};
    var tokens=((d.fcmTokens||[]).map(function(t){return t.token||t;})).filter(Boolean);
    if(d.fcmToken&&d.fcmToken.length>20) tokens.push(d.fcmToken);
    tokens=[...new Set(tokens)].filter(function(t){return t&&t.length>20;});
    if(tokens.length){
     fetch('https://donway.ai.kr/fcm/notify-drivers',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tokens:tokens,title:'📅 근무 스케줄',body:date+' '+startTime+'~'+endTime+(note?' ('+note+')':'')})
     }).catch(function(){});
     _dineToast('📱 '+staffName+'님 푸시 발송');
    }
   });
  }
  _dineSchedule(document.getElementById('content'));
 });
}

function _dineScheduleEdit(staffId,date,did){
 _db.collection('dine_schedules').where('dealerId','==',did).where('staffId','==',staffId).where('date','==',date).limit(1).get()
 .then(function(snap){
  if(snap.empty)return;
  var doc=snap.docs[0];var d=doc.data();
  var mo=document.createElement('div');mo.className='mo';
  var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
  box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">📅 스케줄 수정 ('+d.staffName+' '+date+')</div>'+
   '<div style="display:flex;gap:8px">'+
   '<div class="input-group" style="flex:1"><label>출근</label><input id="sch-edit-start" class="inp" type="time" value="'+d.startTime+'"></div>'+
   '<div class="input-group" style="flex:1"><label>퇴근</label><input id="sch-edit-end" class="inp" type="time" value="'+d.endTime+'"></div>'+
   '</div>'+
   '<div class="input-group"><label>메모</label><input id="sch-edit-note" class="inp" value="'+(d.note||'')+'"></div>'+
   '<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:12px">'+
   '<input type="checkbox" id="sch-edit-push" checked> 수정 내용 직원에게 푸시</div>'+
   '<div style="display:flex;gap:8px;margin-top:16px">'+
   '<button class="btn btn-primary" style="flex:1" id="sch-edit-save">저장</button>'+
   '<button class="btn" style="background:#ef4444;color:#fff;flex:1" id="sch-edit-del">삭제</button>'+
   '<button class="btn btn-ghost" id="sch-edit-cancel">취소</button></div>';
  mo.appendChild(box);
  box.querySelector('#sch-edit-save').onclick=function(){_dineScheduleUpdate(doc.id,staffId,d.staffName,date,did);};
  box.querySelector('#sch-edit-del').onclick=function(){_dineScheduleDelete(doc.id,did);};
  box.querySelector('#sch-edit-cancel').onclick=function(){mo.remove();};
  mo.onclick=function(e){if(e.target===mo)mo.remove();};
  document.body.appendChild(mo);
 });
}

function _dineScheduleUpdate(docId,staffId,staffName,date,did){
 var startTime=document.getElementById('sch-edit-start').value;
 var endTime=document.getElementById('sch-edit-end').value;
 var note=document.getElementById('sch-edit-note').value.trim();
 var pushOn=document.getElementById('sch-edit-push').checked;
 _db.collection('dine_schedules').doc(docId).update({startTime:startTime,endTime:endTime,note:note,updatedAt:new Date().toISOString()})
 .then(function(){
  _dineToast('✅ 수정됐습니다');document.querySelector('.mo')?.remove();
  if(pushOn){
   _db.collection('staff').doc(staffId).get().then(function(snap){
    var d=snap.data()||{};
    var tokens=((d.fcmTokens||[]).map(function(t){return t.token||t;})).filter(Boolean);
    if(d.fcmToken) tokens.push(d.fcmToken);
    tokens=[...new Set(tokens)].filter(function(t){return t&&t.length>20;});
    if(tokens.length) fetch('https://donway.ai.kr/fcm/notify-drivers',{method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({tokens:tokens,title:'📅 스케줄 변경',body:date+' '+startTime+'~'+endTime+(note?' ('+note+')':'')})
    }).catch(function(){});
   });
  }
  _dineSchedule(document.getElementById('content'));
 });
}

function _dineScheduleDelete(docId,did){
 if(!confirm('스케줄을 삭제하시겠습니까?'))return;
 _db.collection('dine_schedules').doc(docId).delete().then(function(){
  _dineToast('🗑 삭제됐습니다');document.querySelector('.mo')?.remove();
  _dineSchedule(document.getElementById('content'));
 });
}

function _dineScheduleWeek(offset){ window._schedWeekOffset=(window._schedWeekOffset||0)+offset; _dineSchedule(document.getElementById('content')); }

function _dineAutoPayroll(did){
 var ym=document.getElementById('pay-ym')?.value||new Date().toISOString().slice(0,7);
 var cycleFilter=document.getElementById('pay-cycle-filter')?.value||'month';
 var filterPart=document.getElementById('pay-part')?.value||'';
 var filterEmp=document.getElementById('pay-emptype')?.value||'';
 var dateFrom,dateTo;
 if(cycleFilter==='week'){
  var dw=new Date();dw.setDate(dw.getDate()-dw.getDay()+1);dateFrom=dw.toISOString().slice(0,10);
  var dw2=new Date();dw2.setDate(dw2.getDate()-dw2.getDay()+7);dateTo=dw2.toISOString().slice(0,10);
 } else if(cycleFilter==='day'){
  dateFrom=dateTo=new Date().toISOString().slice(0,10);
 } else { dateFrom=ym+'-01';dateTo=ym+'-31'; }
 if(window._payrollUnsub) window._payrollUnsub();
 _dineToast('🔄 실시간 급여 계산 중...');
 _db.collection('staff').where('dealerId','==',did).get().then(function(staffSnap){
  var staffMap={};
  staffSnap.forEach(function(doc){
   var d=doc.data();
   if(filterPart&&d.part!==filterPart) return;
   if(filterEmp&&(d.payType||'hourly')!==filterEmp) return;
   staffMap[doc.id]=d;
  });
  window._payrollUnsub=_db.collection('attendance')
   .where('dealerId','==',did).where('date','>=',dateFrom).where('date','<=',dateTo)
   .onSnapshot(function(attSnap){
    var workMap={};
    attSnap.forEach(function(doc){
     var d=doc.data();if(!staffMap[d.staffId])return;
     if(!workMap[d.staffId])workMap[d.staffId]={dateIns:{},dateOuts:{},breaks:[]};
     if(d.type==='in') workMap[d.staffId].dateIns[d.date]=d;
     else if(d.type==='out') workMap[d.staffId].dateOuts[d.date]=d;
     else if(d.type==='break_start') workMap[d.staffId].breaks.push({date:d.date,start:d.time,end:null});
     else if(d.type==='break_end'){var br=workMap[d.staffId].breaks.find(function(b){return b.date===d.date&&!b.end;});if(br)br.end=d.time;}
    });
    var list=document.getElementById('payroll-list');if(!list)return;
    var rows='';var grandNet=0;
    Object.keys(staffMap).forEach(function(sid){
     var st=staffMap[sid];var wk=workMap[sid]||{dateIns:{},dateOuts:{},breaks:[]};
     var empType=st.payType||'hourly';var hourlyWage=st.hourlyWage||MIN_WAGE;
     var monthlySalary=st.monthlySalary||2500000;var weeklyContractH=st.weeklyHours||40;
     var totalMin=0;var nightMin=0;
     Object.keys(wk.dateIns).forEach(function(date){
      var inT=new Date(wk.dateIns[date].time);
      var outT=wk.dateOuts[date]?new Date(wk.dateOuts[date].time):new Date();
      var diffMin=(outT-inT)/60000;
      var realBr=wk.breaks.filter(function(b){return b.date===date&&b.end;}).reduce(function(a,b){return a+(new Date(b.end)-new Date(b.start))/60000;},0);
      var brMin=realBr||(diffMin>=480?60:diffMin>=240?30:0);
      totalMin+=Math.max(0,diffMin-brMin);
      var ns=new Date(inT);ns.setHours(22,0,0,0);if(outT>ns)nightMin+=(outT-Math.max(inT,ns))/60000;
     });
     var workH=totalMin/60;var nightH=nightMin/60;
     var basePay=0;var nightPay=0;var weeklyPay=0;var empLabel='';
     if(empType==='monthly'){
      var calcH=monthlySalary/(weeklyContractH*4.3);
      basePay=cycleFilter==='week'?Math.round(monthlySalary/4.3):cycleFilter==='day'?Math.round(monthlySalary/22):monthlySalary;
      nightPay=Math.round(nightH*calcH*0.5);empLabel='정직원';
     } else {
      basePay=Math.round(workH*hourlyWage);nightPay=Math.round(nightH*hourlyWage*0.5);
      var wkH=cycleFilter==='week'?workH:workH/4.3;
      weeklyPay=(wkH>=weeklyContractH*0.9&&weeklyContractH>=15)?(hourlyWage*weeklyContractH/5):0;
      empLabel={'daily':'일급알바','weekly':'주급알바','biweekly':'격주알바','monthly':'월급알바'}[st.payCycle||'monthly']||'알바';
     }
     var totalPay=basePay+nightPay+Math.round(weeklyPay);
     var ins4=Math.round(totalPay*(0.0475+0.03595+0.009));var netPay=totalPay-ins4;
     grandNet+=netPay;
     var partLabel={'kitchen':'주방','hall':'홀','management':'관리'}[st.part]||'';
     rows+='<div class="card" style="padding:14px;margin-bottom:8px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
      '<div style="display:flex;align-items:center;gap:6px">'+
      '<div style="font-weight:800;font-size:14px">'+st.name+'</div>'+
      '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(0,0,0,.2);color:'+(empType==='monthly'?'#38bdf8':'#a78bfa')+'">'+empLabel+'</span>'+
      (partLabel?'<span style="font-size:10px;color:var(--t3)">'+partLabel+'</span>':'')+
      '</div>'+
      '<div style="font-size:11px;color:var(--t3)">'+(empType==='monthly'?'₩'+monthlySalary.toLocaleString()+'/월':'₩'+hourlyWage.toLocaleString()+'/시')+'</div>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px;margin-bottom:10px">'+
      '<div style="background:var(--s2);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3);font-size:9px">근무시간</div><div style="font-weight:700;color:#38bdf8">'+Math.floor(workH)+'h '+Math.round((workH%1)*60)+'m</div></div>'+
      '<div style="background:var(--s2);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3);font-size:9px">야간수당</div><div style="font-weight:700;color:#f59e0b">₩'+nightPay.toLocaleString()+'</div></div>'+
      '<div style="background:var(--s2);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3);font-size:9px">주휴수당</div><div style="font-weight:700;color:#a78bfa">₩'+Math.round(weeklyPay).toLocaleString()+'</div></div>'+
      '<div style="background:var(--s2);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3);font-size:9px">4대보험</div><div style="font-weight:700;color:#ef4444">-₩'+ins4.toLocaleString()+'</div></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--bd);padding-top:8px">'+
      '<div style="font-size:11px;color:var(--t3)">세전 ₩'+totalPay.toLocaleString()+'</div>'+
      '<div style="font-size:16px;font-weight:900;color:#22c55e">실수령 ₩'+netPay.toLocaleString()+'</div>'+
      '</div></div>';
    });
    list.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--s2);border-radius:10px;margin-bottom:12px">'+
     '<div style="font-size:12px;color:var(--t3)">실시간 계산 <span class="live-dot"></span></div>'+
     '<div style="font-size:16px;font-weight:900;color:#f59e0b">총 실수령 ₩'+grandNet.toLocaleString()+'</div>'+
     '</div>'+(rows||'<div style="text-align:center;padding:30px;color:var(--t3)">출퇴근 기록이 없습니다</div>');
   });
 });
}

function _dinePayslip(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 var ym=new Date().toISOString().slice(0,7);
 wrap.innerHTML=
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">📋 급여명세서</div><div class="page-sub">직원별 월별 명세서</div></div>'+
  '<div style="display:flex;gap:6px;align-items:center">'+
  '<input type="month" id="ps-ym" value="'+ym+'" class="inp" style="width:auto;padding:5px 10px;font-size:12px">'+
  '<button class="btn btn-primary btn-sm" data-did="'+did+'" onclick="_dinePayslipList(this.dataset.did)">조회</button>'+
  '</div></div>'+
  '<div id="ps-list"><div style="text-align:center;padding:30px;color:var(--t3)">월을 선택 후 조회하세요</div></div>';
 el.appendChild(wrap);
}

function _dinePayslipList(did){
 var ym=document.getElementById('ps-ym')?.value||new Date().toISOString().slice(0,7);
 var from=ym+'-01',to=ym+'-31';
 var list=document.getElementById('ps-list');
 if(!list)return;
 list.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3)">⏳ 로딩중...</div>';
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(results){
  var attSnap=results[0],memSnap=results[1];
  var attMap={};
  attSnap.forEach(function(doc){var d=doc.data();if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[]};if(d.type==='in')attMap[d.memberId].ins.push(d);else attMap[d.memberId].outs.push(d);});
  var html='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
   '<thead><tr style="border-bottom:2px solid var(--bd);background:var(--bg3)">'+
   '<th style="padding:10px 8px;text-align:left">직원</th>'+
   '<th style="padding:10px 8px;text-align:center">파트</th>'+
   '<th style="padding:10px 8px;text-align:center">출근일</th>'+
   '<th style="padding:10px 8px;text-align:center">총근무</th>'+
   '<th style="padding:10px 8px;text-align:right">기본급</th>'+
   '<th style="padding:10px 8px;text-align:right">주휴</th>'+
   '<th style="padding:10px 8px;text-align:right">공제</th>'+
   '<th style="padding:10px 8px;text-align:right;color:#22c55e">실수령</th>'+
   '<th style="padding:10px 8px;text-align:center">명세서</th>'+
   '</tr></thead><tbody>';
  var totalNet=0;
  memSnap.forEach(function(doc){
   var m=doc.data();
   if((m.status||'active')==='resigned')return;
   var att=attMap[doc.id]||{ins:[],outs:[]};
   var r=_calcPayFull(m,att,memSnap.size,ym);
   var days=att.ins.length;
   var partColor={'kitchen':'#ef4444','hall':'#38bdf8'}[m.part]||'#a78bfa';
   totalNet+=r.netSalary;
   html+='<tr style="border-bottom:1px solid var(--bd)">'+
    '<td style="padding:10px 8px;font-weight:700">'+m.name+'</td>'+
    '<td style="padding:10px 8px;text-align:center"><span style="font-size:10px;font-weight:700;color:'+partColor+'">'+({'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||'-')+'</span></td>'+
    '<td style="padding:10px 8px;text-align:center">'+days+'일</td>'+
    '<td style="padding:10px 8px;text-align:center;font-weight:700;color:var(--br)">'+r.monthlyHours+'h</td>'+
    '<td style="padding:10px 8px;text-align:right">₩'+r.basePay.toLocaleString()+'</td>'+
    '<td style="padding:10px 8px;text-align:right;color:#22c55e">'+(r.weeklyHoliday?'₩'+r.weeklyHoliday.toLocaleString():'-')+'</td>'+
    '<td style="padding:10px 8px;text-align:right;color:#ef4444">-₩'+(r.insTotal+r.taxTotal).toLocaleString()+'</td>'+
    '<td style="padding:10px 8px;text-align:right;font-weight:900;color:#22c55e">₩'+r.netSalary.toLocaleString()+'</td>'+
    '<td style="padding:10px 8px;text-align:center">'+
    '<div style="display:flex;gap:4px;justify-content:center">'+
    '<button data-mid="'+doc.id+'" data-ym="'+ym+'" onclick="_dinePayslipModal(this.dataset.mid,this.dataset.ym)" style="font-size:9px;padding:3px 7px;border:1px solid var(--bd);border-radius:5px;background:transparent;color:var(--t2);cursor:pointer">보기</button>'+
    '<button data-mid="'+doc.id+'" data-ym="'+ym+'" onclick="_dineSendPayslip(this.dataset.mid,this.dataset.ym)" style="font-size:9px;padding:3px 7px;border:1px solid rgba(8,145,178,.3);border-radius:5px;background:rgba(8,145,178,.08);color:#38bdf8;cursor:pointer">발송</button>'+
    '</div></td>'+
    '</tr>';
  });
  html+='</tbody><tfoot><tr style="border-top:2px solid var(--bd);background:var(--bg3);font-weight:800">'+
   '<td colspan="7" style="padding:10px 8px">합계</td>'+
   '<td style="padding:10px 8px;text-align:right;font-size:14px;color:#22c55e">₩'+totalNet.toLocaleString()+'</td>'+
   '<td style="padding:10px 8px;text-align:center">'+
   '<button data-did="'+did+'" data-ym="'+ym+'" onclick="_dinePayslipBulkSend(this.dataset.did,this.dataset.ym)" style="font-size:10px;padding:4px 10px;background:var(--br);border:none;border-radius:6px;color:#fff;cursor:pointer;font-weight:700">일괄발송</button>'+
   '</td></tr></tfoot></table></div>';
  list.innerHTML=html;
 });
}

function _dinePayrollLock(ym){
 _dineToast('📌 '+ym+' 급여 확정됨 (준비중)');
}

function _dinePayslipBulkSend(did,ym){
 _dineToast('📤 일괄 알림톡 발송 (준비중)');
}

function _dineAlimtalk(el){el.innerHTML='<div class="slide-up"><div class="page-title">💬 알림톡 설정</div><div class="card" style="margin-top:16px"><div style="font-size:13px;color:var(--t2)">카카오 알림톡 발송을 위해 솔라피 API 키를 등록하세요.<br><br>솔라피 API Key: <input class="inp" placeholder="API Key 입력" style="margin-top:8px"><br><button class="btn btn-primary" style="margin-top:8px">저장</button></div></div></div>';}

