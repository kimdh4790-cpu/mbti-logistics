// dine-payroll.js — 급여, 명세서, 급여대장
// dine.js에서 분리됨 (리팩토링 2026-07-13)

function _dinePayroll(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 var now=new Date();
 var ym=now.toISOString().slice(0,7);

 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px';
 hdr.innerHTML='<div><div class="page-title">💰 급여 계산</div><div class="page-sub">2026 근로기준법 자동 적용</div></div>'+
  '<div style="display:flex;gap:8px;align-items:center">'+
  '<input type="month" id="pay-ym" value="'+ym+'" class="inp" style="width:auto;padding:6px 10px;font-size:12px">'+
  '<select id="pay-part" class="inp" style="width:auto;padding:5px 8px;font-size:11px">'+
  '<option value="">전체파트</option><option value="kitchen">주방</option>'+
  '<option value="hall">홀</option><option value="management">관리</option>'+
  '</select>'+
  '<select id="pay-emptype" class="inp" style="width:auto;padding:5px 8px;font-size:11px">'+
  '<option value="">전체</option><option value="hourly">알바</option><option value="monthly">정직원</option>'+
  '</select>'+
  '<select id="pay-cycle-filter" class="inp" style="width:auto;padding:5px 8px;font-size:11px">'+
  '<option value="month">월급기준</option><option value="week">주급기준</option><option value="day">일급기준</option>'+
  '</select>'+
  '<button class="btn btn-primary btn-sm" onclick="_dineCalcPayroll(\''+did+'\')">계산</button>'+
  '<button class="btn btn-sm" style="background:#7c3aed;color:#fff" onclick="_dineAutoPayroll(\''+did+'\')">🔄 실시간</button>'+
  '</div>';

 wrap.appendChild(hdr);

 /* 법정 안내 */
 var lawInfo=document.createElement('div');
 lawInfo.style.cssText='background:rgba(8,145,178,.06);border:1px solid rgba(8,145,178,.15);border-radius:10px;padding:10px 12px;font-size:11px;color:var(--t2);margin-bottom:14px;display:flex;flex-wrap:wrap;gap:10px';
 lawInfo.innerHTML='<span>💡 2026 최저시급 <b style="color:#38bdf8">10,320원</b></span>'+
  '<span>국민연금 <b>4.75%</b></span>'+
  '<span>건강보험 <b>3.595%</b></span>'+
  '<span>장기요양 <b>+13.14%</b></span>'+
  '<span>고용보험 <b>0.9%</b></span>'+
  '<span>야간수당 <b>×1.5배</b> (22시↑)</span>'+
  '<span>주휴수당 <b>주15h↑</b> 개근 시</span>';
 wrap.appendChild(lawInfo);

 var list=document.createElement('div');list.id='payroll-list';
 list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">월을 선택 후 계산 버튼을 누르세요</div>';
 wrap.appendChild(list);
 el.appendChild(wrap);
}

function _dineCalcPayroll(did){
 var ym=document.getElementById('pay-ym')?.value||new Date().toISOString().slice(0,7);
 var from=ym+'-01',to=ym+'-31';
 var list=document.getElementById('payroll-list');
 if(!list)return;
 list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">⏳ 계산중...</div>';

 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('members').where('dealerId','==',did).get(),
  _db.collection('companies').where('uid','==',did).limit(1).get()
 ]).then(function(results){
  var attSnap=results[0],memSnap=results[1],coSnap=results[2];
  var empCnt=memSnap.size;
  var co=coSnap.empty?{}:coSnap.docs[0].data();

  /* 직원별 출퇴근 집계 */
  var attMap={};
  attSnap.forEach(function(doc){
   var d=doc.data();
   if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[]};
   if(d.type==='in')attMap[d.memberId].ins.push(d);
   else attMap[d.memberId].outs.push(d);
  });

  var cards=[];
  memSnap.forEach(function(doc){
   var m=doc.data();m._id=doc.id;
   var att=attMap[doc.id]||{ins:[],outs:[]};
   var r=_calcPayFull(m,att,empCnt,ym);
   cards.push({m,r});
  });

  /* 합계 */
  var totalGross=cards.reduce(function(s,c){return s+c.r.grossSalary;},0);
  var totalNet=cards.reduce(function(s,c){return s+c.r.netSalary;},0);
  var totalIns=cards.reduce(function(s,c){return s+c.r.insTotal;},0);

  /* 사업주 부담 총인건비 계산 (2026 기준) */
  var INS_EMPLOYER={pension:0.0475,health:0.03595,longcare:0.03595*0.1314,employ:0.0115,accident:0.0147,retire:0.0833};
  var totalEmployerCost=cards.reduce(function(s,c){
   var g=c.r.grossSalary;
   var empIns=Math.floor(g*(INS_EMPLOYER.pension+INS_EMPLOYER.health+INS_EMPLOYER.longcare+INS_EMPLOYER.employ+INS_EMPLOYER.accident));
   var retire=Math.floor(g*INS_EMPLOYER.retire);
   return s+g+empIns+retire;
  },0);

  var html='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">'+
   '<div class="kpi-card" style="border-top:2px solid #22c55e"><div class="kpi-label">💰 직원 실수령 합계</div><div class="kpi-val" style="color:#22c55e;font-size:14px">₩'+totalNet.toLocaleString()+'</div></div>'+
   '<div class="kpi-card" style="border-top:2px solid #ef4444"><div class="kpi-label">📋 공제 합계</div><div class="kpi-val" style="color:#ef4444;font-size:14px">₩'+(totalGross-totalNet).toLocaleString()+'</div></div>'+
   '<div class="kpi-card" style="border-top:2px solid #f59e0b"><div class="kpi-label">🏢 사업주 실부담 총액 <span style="font-size:9px">(4대보험+퇴직금)</span></div><div class="kpi-val" style="color:#f59e0b;font-size:13px">₩'+totalEmployerCost.toLocaleString()+'</div></div>'+
   '</div>'+
   '<div style="display:flex;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">'+
   '<div style="font-size:13px;font-weight:700;color:var(--t2)">'+ym+' 급여 계산 결과 <span style="font-size:11px;font-weight:400;color:var(--t3)">총 '+cards.length+'명</span></div>'+
   '<button class="btn btn-primary btn-sm" data-ym="'+ym+'" onclick="_dinePayrollLock(this.dataset.ym)">📌 급여 확정</button>'+
   '</div>';

  cards.forEach(function(c){
   var m=c.m,r=c.r;
   var partColor={'kitchen':'#ef4444','hall':'#38bdf8'}[m.part]||'#a78bfa';
   html+='<div class="card" style="margin-bottom:10px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">'+
    '<div style="display:flex;align-items:center;gap:10px">'+
    '<div style="font-size:20px">'+('kitchen'===m.part?'👨‍🍳':'🧑‍💼')+'</div>'+
    '<div>'+
    '<div style="font-size:14px;font-weight:800">'+m.name+'</div>'+
    '<div style="font-size:11px;color:var(--t3)">'+({'kitchen':'주방','hall':'홀'}[m.part]||m.part)+' · '+
    ({'new':'신입','junior':'6개월↑','mid':'1년↑','senior':'3년↑','expert':'5년↑'}[m.level]||'') +' · '+
    (m.payCycle==='weekly'?'주급':m.payCycle==='daily'?'일급':'월급')+'</div>'+
    '</div></div>'+
    '<div style="text-align:right">'+
    '<div style="font-size:18px;font-weight:900;color:var(--gr)">₩'+r.netSalary.toLocaleString()+'</div>'+
    '<div style="font-size:10px;color:var(--t3)">실수령액</div>'+
    '</div></div>'+
    /* 상세 내역 */
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">'+
    _payRow('기본급',r.basePay,'add')+
    _payRow('주휴수당',r.weeklyHoliday,'add')+
    (r.nightPay?_payRow('야간수당('+r.nightHour+'h)',r.nightPay,'add'):'')+
    (r.overPay?_payRow('연장수당('+r.overHour+'h)',r.overPay,'add'):'')+
    _payRow('4대보험',r.insTotal,'deduct')+
    _payRow('소득세+지방세',r.taxTotal,'deduct')+
    '</div>'+
    /* 근로법 상태 */
    '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">'+
    r.lawAlerts.map(function(a){return '<span style="font-size:9px;padding:2px 6px;border-radius:20px;background:'+a.bg+';color:'+a.color+';border:1px solid '+a.border+'">'+a.text+'</span>';}).join('')+
    '</div>'+
    /* 사업주 실부담 */
    (function(){
     var g=r.grossSalary;
     var empIns=Math.floor(g*(0.0475+0.03595+0.03595*0.1314+0.0115+0.0147));
     var retire=Math.floor(g*0.0833);
     var total=g+empIns+retire;
     return '<div style="background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.15);border-radius:8px;padding:8px 10px;margin-top:8px;font-size:11px">'+
      '<div style="font-weight:700;color:#f59e0b;margin-bottom:4px">🏢 사업주 실부담 (직원 1인)</div>'+
      '<div style="display:flex;gap:12px;flex-wrap:wrap">'+
      '<span>지급액 <b>₩'+g.toLocaleString()+'</b></span>'+
      '<span>+ 사업주 4대보험 <b>₩'+empIns.toLocaleString()+'</b></span>'+
      '<span>+ 퇴직금 충당 <b>₩'+retire.toLocaleString()+'</b></span>'+
      '<span style="font-weight:900;color:#f59e0b">= 총 ₩'+total.toLocaleString()+'</span>'+
      '</div></div>';
    })()+
    '<div style="display:flex;gap:6px;margin-top:10px;justify-content:flex-end">'+
   '<button class="btn btn-ghost btn-sm" data-mid="'+id+'" data-ym="'+ym+'" onclick="_dinePayslipModal(this.dataset.mid,this.dataset.ym)">📋 명세서</button>'+
    '<button class="btn btn-sm btn-primary" data-mid="'+m._id+'" data-ym="'+ym+'" onclick="_dineSendPayslip(this.dataset.mid,this.dataset.ym)">📤 알림톡</button>'+
    '</div>'+
    '</div>';
  });
  list.innerHTML=html;
 });
}

function _payRow(label,val,type){
 if(!val)return '';
 var color=type==='add'?'var(--gr)':'var(--rd)';
 var sign=type==='add'?'+':'-';
 return '<div style="background:var(--s3);border-radius:6px;padding:5px 8px;display:flex;justify-content:space-between">'+
  '<span style="color:var(--t3)">'+label+'</span>'+
  '<span style="font-weight:700;color:'+color+'">'+sign+'₩'+val.toLocaleString()+'</span></div>';
}


function _calcPayFull(m,att,empCnt,ym){
 var ins=att.ins||[],outs=att.outs||[];
 ins.sort(function(a,b){return a.time>b.time?1:-1;});
 outs.sort(function(a,b){return a.time>b.time?1:-1;});

 var totalMin=0,nightMin=0,overMin=0;
 for(var i=0;i<Math.min(ins.length,outs.length);i++){
  var inT=new Date(ins[i].time),outT=new Date(outs[i].time);
  var diff=(outT-inT)/60000;
  if(diff<=0||diff>720)continue;
  var br=diff>=480?60:diff>=240?30:0;
  var net=diff-br;totalMin+=net;
  /* 야간 */
  var ns=new Date(inT);ns.setHours(22,0,0,0);
  if(outT>ns)nightMin+=(outT-Math.max(inT,ns))/60000;
  /* 연장 */
  if(net>480)overMin+=net-480;
 }

 var totalHour=totalMin/60;
 var nightHour=Math.round(nightMin/60*10)/10;
 var overHour=Math.round(overMin/60*10)/10;
 var monthlyHours=Math.round(totalHour);

 var basePay=0,weeklyHoliday=0,nightPay=0,overPay=0;

 if(m.payType==='monthly'){
  basePay=m.monthlySalary||0;
  basePay+=(m.mealAllowance||0)+(m.transportAllowance||0);
  if(empCnt>=5){
   var hw=Math.round((m.monthlySalary||0)/209);
   nightPay=Math.round(nightHour*hw*0.5);
   overPay=Math.round(overHour*hw*0.5);
  }
 } else {
  var wage=m.hourlyWage||MIN_WAGE;
  basePay=Math.round(totalHour*wage);
  /* 주휴수당 */
  var weekH=totalHour/4;
  if(weekH>=15)weeklyHoliday=Math.round((weekH/40)*8*wage);
  /* 야간/연장 (5인↑) */
  nightPay=Math.round(nightHour*wage*0.5);
  if(empCnt>=5)overPay=Math.round(overHour*wage*0.5);
 }

 var grossSalary=basePay+weeklyHoliday+nightPay+overPay;

 /* 4대보험 */
 var insTotal=0,insItems={};
 var insured=m.payType==='monthly'||monthlyHours>=60;
 if(insured&&m.insuranceType==='4대보험'){
  insItems.pension=Math.floor(grossSalary*INS.pension);
  insItems.health=Math.floor(grossSalary*INS.health);
  insItems.longcare=Math.floor(insItems.health*INS.longcare);
  insItems.employ=Math.floor(grossSalary*INS.employ);
  insTotal=Object.values(insItems).reduce(function(s,v){return s+v;},0);
 } else if(m.insuranceType==='3.3%'){
  insTotal=Math.floor(grossSalary*0.033);
 }

 /* 소득세 */
 var taxBase=grossSalary-insTotal;
 var incomeTax=taxBase<1060000?0:taxBase<2000000?Math.floor(taxBase*0.01):taxBase<3000000?Math.floor(taxBase*0.015):Math.floor(taxBase*0.02);
 var localTax=Math.floor(incomeTax*0.1);
 var taxTotal=incomeTax+localTax;

 var netSalary=grossSalary-insTotal-taxTotal;

 /* 근로법 알림 */
 var lawAlerts=[];
 if(m.hireDate){
  var hire=new Date(m.hireDate);
  var months=Math.floor((new Date()-hire)/(30*24*3600*1000));
  if(months>=1&&months<=11&&empCnt>=5&&m.payType==='hourly'){
   lawAlerts.push({text:'연차 '+Math.min(months,11)+'일',bg:'rgba(8,145,178,.1)',color:'#38bdf8',border:'rgba(8,145,178,.2)'});
  }
  if(months>=12){
   lawAlerts.push({text:'퇴직금 충당',bg:'rgba(34,197,94,.1)',color:'#22c55e',border:'rgba(34,197,94,.2)'});
  }
 }
 if(weeklyHoliday>0)lawAlerts.push({text:'주휴수당 포함',bg:'rgba(245,158,11,.1)',color:'#f59e0b',border:'rgba(245,158,11,.2)'});
 if(nightPay>0)lawAlerts.push({text:'야간수당 포함',bg:'rgba(124,58,237,.1)',color:'#a78bfa',border:'rgba(124,58,237,.2)'});
 if(empCnt<5)lawAlerts.push({text:'5인미만(가산제외)',bg:'rgba(150,150,150,.1)',color:'var(--t3)',border:'rgba(150,150,150,.2)'});

 return{basePay,weeklyHoliday,nightPay,nightHour,overPay,overHour,grossSalary,insTotal,insItems,taxTotal,netSalary,monthlyHours,lawAlerts};
}

/* 급여명세서 모달 */
function _dinePayslipModal(memberId,ym){
 _db.collection('members').doc(memberId).get().then(function(doc){
  if(!doc.exists)return;
  var m=doc.data();m._id=doc.id;
  var from=ym+'-01',to=ym+'-31';
  _db.collection('attendance').where('dealerId','==',_CU.dealerId)
   .where('memberId','==',memberId).where('date','>=',from).where('date','<=',to).get()
   .then(function(attSnap){
    var att={ins:[],outs:[]};
    attSnap.forEach(function(d){var dd=d.data();if(dd.type==='in')att.ins.push(dd);else att.outs.push(dd);});
    var r=_calcPayFull(m,att,10,ym);
    var mo=document.createElement('div');mo.className='mo';
    var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
    box.innerHTML='<div class="payslip">'+
     '<div class="payslip-header">'+
     '<div class="payslip-title">급여명세서</div>'+
     '<div style="font-size:12px;color:var(--t3);margin-top:4px">'+ym+' | '+m.name+'</div>'+
     '<div style="font-size:11px;color:var(--t3)">'+({'kitchen':'주방','hall':'홀'}[m.part]||m.part)+' · '+(m.role||'')+'</div>'+
     '</div>'+
     '<div class="payslip-row"><span>기본급</span><span>₩'+r.basePay.toLocaleString()+'</span></div>'+
     (r.weeklyHoliday?'<div class="payslip-row add"><span>주휴수당</span><span>+₩'+r.weeklyHoliday.toLocaleString()+'</span></div>':'')+
     (r.nightPay?'<div class="payslip-row add"><span>야간수당('+r.nightHour+'h)</span><span>+₩'+r.nightPay.toLocaleString()+'</span></div>':'')+
     (r.overPay?'<div class="payslip-row add"><span>연장수당('+r.overHour+'h)</span><span>+₩'+r.overPay.toLocaleString()+'</span></div>':'')+
     '<div class="payslip-row" style="font-weight:700;border-top:1px solid var(--bd);padding-top:8px;margin-top:4px"><span>총 지급액</span><span>₩'+r.grossSalary.toLocaleString()+'</span></div>'+
     (r.insTotal?'<div class="payslip-row deduct"><span>4대보험 공제</span><span>-₩'+r.insTotal.toLocaleString()+'</span></div>':'')+
     (r.taxTotal?'<div class="payslip-row deduct"><span>소득세+지방세</span><span>-₩'+r.taxTotal.toLocaleString()+'</span></div>':'')+
     '<div class="payslip-row total"><span>💰 실수령액</span><span>₩'+r.netSalary.toLocaleString()+'</span></div>'+
     '<div style="font-size:10px;color:var(--t3);margin-top:8px">근무시간 '+r.monthlyHours+'h | 2026 근로기준법 적용</div>'+
     '</div>'+
     '<button class="btn btn-ghost" style="width:100%;margin-top:12px" onclick="this.closest(\'.mo\').remove()">닫기</button>';
    mo.appendChild(box);mo.onclick=function(e){if(e.target===mo)mo.remove();};
    document.body.appendChild(mo);
   });
 });
}

function _dineSendPayslip(memberId,ym){
 _dineToast('💬 알림톡 발송 기능은 알림톡 설정에서 활성화 후 사용 가능합니다');
}

