/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      dine-payroll.js
 * @description 급여계산·휴식QR반영·명세서·급여대장
 */
// dine.js에서 분리됨 (리팩토링 2026-07-13)

function _dinePayroll(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 var now=new Date();
 var ym=now.toISOString().slice(0,7);

 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px';
 hdr.innerHTML='<div><div class="page-title"> 급여 계산</div><div class="page-sub">2026 근로기준법 자동 적용</div></div>'+
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
  '<button class="btn btn-sm" style="background:var(--br);color:#fff" onclick="_dineAutoPayroll(\''+did+'\')">실시간</button>'+
  '</div>';

 wrap.appendChild(hdr);

 /* 법정 안내 */
 var lawInfo=document.createElement('div');
 lawInfo.style.cssText='background:rgba(8,145,178,.06);border:1px solid rgba(8,145,178,.15);border-radius:10px;padding:10px 12px;font-size:11px;color:var(--t2);margin-bottom:14px;display:flex;flex-wrap:wrap;gap:10px';
 lawInfo.innerHTML='<span> 2026 최저시급 <b style="color:#38bdf8">10,320원</b></span>'+
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
 var ym=document.getElementById('pay-ym')?.value||_monthStr();
 var from=ym+'-01',to=ym+'-31';
 var list=document.getElementById('payroll-list');
 if(!list)return;
 list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)"> 계산중...</div>';

 /* companies는 이미 _CU에 캐시됨 — 별도 쿼리 불필요 */
 var co=(_CU&&_CU._company)||{};
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(results){
  var attSnap=results[0],memSnap=results[1];
  var empCnt=memSnap.size;

  /* 직원별 출퇴근 + 휴식 집계 */
  var attMap={};
  attSnap.forEach(function(doc){
   var d=doc.data();
   if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[],breaks:[]};
   if(d.type==='in')attMap[d.memberId].ins.push(d);
   else if(d.type==='out')attMap[d.memberId].outs.push(d);
   else if(d.type==='break_start'||d.type==='break_end')attMap[d.memberId].breaks.push(d);
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

  /* ── KPI 요약 (compact 1줄) ── */
  var html=
   '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">'+
   '<div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:12px;padding:12px 10px">'+
    '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:6px">직원 실수령</div>'+
    '<div style="font-size:18px;font-weight:900;color:#22c55e;font-variant-numeric:tabular-nums;letter-spacing:-.5px">₩'+totalNet.toLocaleString()+'</div></div>'+
   '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:12px;padding:12px 10px">'+
    '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:6px">공제 합계</div>'+
    '<div style="font-size:18px;font-weight:900;color:#ef4444;font-variant-numeric:tabular-nums;letter-spacing:-.5px">₩'+(totalGross-totalNet).toLocaleString()+'</div></div>'+
   '<div style="background:rgba(132,204,22,.06);border:1px solid rgba(132,204,22,.15);border-radius:12px;padding:12px 10px">'+
    '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:6px">사업주 부담</div>'+
    '<div style="font-size:18px;font-weight:900;color:#4d7c0f;font-variant-numeric:tabular-nums;letter-spacing:-.5px">₩'+totalEmployerCost.toLocaleString()+'</div></div>'+
   '</div>'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
   '<div style="font-size:12px;font-weight:700;color:var(--t2)">'+ym+' 계산 결과 <span style="color:var(--t3);font-weight:400">총 '+cards.length+'명</span></div>'+
   '<button class="btn btn-primary btn-sm" data-ym="'+ym+'" onclick="_dinePayrollLock(this.dataset.ym)" style="font-size:11px;padding:5px 12px">급여 확정</button>'+
   '</div>';

  /* ── 직원 카드 — 5명씩 페이지네이션 ── */
  var PAGE=5;
  var pages=Math.ceil(cards.length/PAGE);
  var curPage=0;

  function renderPage(pg){
   var slice=cards.slice(pg*PAGE,(pg+1)*PAGE);
   var rows=slice.map(function(c){
    var m=c.m,r=c.r;
    var partLabel={'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||(m.part||'');
    var partColor={'kitchen':'#ef4444','hall':'#38bdf8','management':'#a78bfa'}[m.part]||'#a78bfa';
    var g=r.grossSalary;
    var empIns=Math.floor(g*(0.0475+0.03595+0.03595*0.1314+0.0115+0.0147));
    var retire=Math.floor(g*0.0833);
    var empTotal=g+empIns+retire;
    return '<div style="padding:13px 0;border-bottom:1px solid var(--bd)">'+
     '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'+
      '<span style="font-size:14px;font-weight:800;flex:1;color:var(--tx)">'+m.name+'</span>'+
      '<span style="font-size:10px;padding:2px 9px;border-radius:20px;border:1px solid '+partColor+'30;background:'+partColor+'15;color:'+partColor+'">'+partLabel+'</span>'+
      (r.weeklyHoliday?'<span style="font-size:9px;padding:2px 7px;border-radius:20px;background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.2)">주휴</span>':'')+
     '</div>'+
     '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:9px;font-size:11px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(8,16,31,.04);border-radius:6px;padding:5px 8px"><span style="color:var(--t3)">기본급</span><b style="color:var(--tx);font-variant-numeric:tabular-nums">₩'+r.basePay.toLocaleString()+'</b></div>'+
      (r.weeklyHoliday?'<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(34,197,94,.05);border-radius:6px;padding:5px 8px"><span style="color:var(--t3)">주휴</span><b style="color:#22c55e;font-variant-numeric:tabular-nums">+₩'+r.weeklyHoliday.toLocaleString()+'</b></div>':'<div style="background:rgba(8,16,31,.04);border-radius:6px;padding:5px 8px"></div>')+
      (r.insTotal||r.taxTotal?'<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(239,68,68,.04);border-radius:6px;padding:5px 8px"><span style="color:var(--t3)">공제</span><b style="color:#ef4444;font-variant-numeric:tabular-nums">-₩'+(r.insTotal+r.taxTotal).toLocaleString()+'</b></div>':'<div style="background:rgba(8,16,31,.04);border-radius:6px;padding:5px 8px"></div>')+
      '<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(132,204,22,.05);border-radius:6px;padding:5px 8px"><span style="color:var(--t3)">사업주</span><b style="color:#4d7c0f;font-variant-numeric:tabular-nums">₩'+empTotal.toLocaleString()+'</b></div>'+
     '</div>'+
     '<div style="display:flex;align-items:center;gap:6px">'+
      '<div style="flex:1">'+
       (r.lawAlerts&&r.lawAlerts.length?r.lawAlerts.slice(0,2).map(function(a){return '<span style="font-size:9px;padding:2px 7px;border-radius:20px;background:'+a.bg+';color:'+a.color+';border:1px solid '+(a.border||a.bg)+';margin-right:3px">'+a.text+'</span>';}).join(''):'<span style="font-size:11px;color:var(--t3)">세전 ₩'+r.grossSalary.toLocaleString()+'</span>')+
      '</div>'+
      '<div style="font-size:18px;font-weight:900;color:#22c55e;font-variant-numeric:tabular-nums">₩'+r.netSalary.toLocaleString()+'</div>'+
      '<button data-mid="'+m._id+'" data-ym="'+ym+'" onclick="_dinePayslipModal(this.dataset.mid,this.dataset.ym)" style="min-width:44px;padding:6px 10px;border:1px solid var(--bd2);border-radius:8px;background:transparent;color:var(--t2);cursor:pointer;font-size:11px;font-weight:600">명세서</button>'+
      '<button data-mid="'+m._id+'" data-ym="'+ym+'" onclick="_dineSendPayslip(this.dataset.mid,this.dataset.ym)" style="min-width:44px;padding:6px 10px;background:var(--br);border:none;border-radius:8px;color:#0F172A;cursor:pointer;font-size:11px;font-weight:700"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:2px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>알림</button>'+
     '</div>'+
    '</div>';
   }).join('');

   var nav=
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0 4px">'+
    '<button onclick="_dinePayPage('+(pg-1)+')" '+( pg===0?'disabled style="opacity:.3;cursor:default"':'')+
     ' style="padding:6px 14px;border:1px solid var(--bd);border-radius:8px;background:transparent;color:var(--tx);font-size:12px;cursor:pointer">이전</button>'+
    '<span style="font-size:12px;color:var(--t3)"><b style="color:var(--tx)">'+(pg+1)+'</b> / '+pages+'페이지 ('+cards.length+'명)</span>'+
    '<button onclick="_dinePayPage('+(pg+1)+')" '+( pg===pages-1?'disabled style="opacity:.3;cursor:default"':'')+
     ' style="padding:6px 14px;border:1px solid var(--bd);border-radius:8px;background:transparent;color:var(--tx);font-size:12px;cursor:pointer">다음</button>'+
    '</div>';

   return rows+(pages>1?nav:'');
  }

  window._dinePayPage=function(pg){
   if(pg<0||pg>=pages)return;
   curPage=pg;
   var el2=document.getElementById('payroll-cards');
   if(el2) el2.innerHTML=renderPage(pg);
  };

  html+='<div id="payroll-cards">'+renderPage(0)+'</div>';
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
 var ins=att.ins||[],outs=att.outs||[],breaks=att.breaks||[];
 ins.sort(function(a,b){return a.time>b.time?1:-1;});
 outs.sort(function(a,b){return a.time>b.time?1:-1;});

 /* 실제 휴식시간 계산 (QR break_start/break_end) */
 var breakStarts=breaks.filter(function(b){return b.type==='break_start';}).sort(function(a,b){return a.time>b.time?1:-1;});
 var breakEnds=breaks.filter(function(b){return b.type==='break_end';}).sort(function(a,b){return a.time>b.time?1:-1;});
 /* FIX: att는 '한 달치'라 월 합계를 매 근무마다 빼면 근무시간이 음수가 된다 */
 var breakSpans=[];
 for(var bi=0;bi<Math.min(breakStarts.length,breakEnds.length);bi++){
  var bS=new Date(breakStarts[bi].time), bE=new Date(breakEnds[bi].time);
  var bDiff=(bE-bS)/60000;
  if(bDiff>0&&bDiff<240)breakSpans.push({s:bS,e:bE,min:bDiff});
 }

 var totalMin=0,nightMin=0,overMin=0;
 for(var i=0;i<Math.min(ins.length,outs.length);i++){
  var inT=new Date(ins[i].time),outT=new Date(outs[i].time);
  var diff=(outT-inT)/60000;
  if(diff<=0||diff>720)continue;
  /* 실제 QR 휴식 있으면 적용, 없으면 자동 추정 */
  /* 이 근무구간 안에서 발생한 휴식만 차감 */
  var shiftBreak=0;
  for(var bj=0;bj<breakSpans.length;bj++){
   if(breakSpans[bj].s>=inT && breakSpans[bj].e<=outT) shiftBreak+=breakSpans[bj].min;
  }
  var br=shiftBreak>0?shiftBreak:(diff>=480?60:diff>=240?30:0);
  var net=Math.max(0,diff-br);totalMin+=net;
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
 if(nightPay>0)lawAlerts.push({text:'야간수당 포함',bg:'rgba(201,168,76,.1)',color:'#a78bfa',border:'rgba(201,168,76,.2)'});
 if(empCnt<5)lawAlerts.push({text:'5인미만(가산제외)',bg:'rgba(150,150,150,.1)',color:'var(--t3)',border:'rgba(150,150,150,.2)'});

 return{basePay,weeklyHoliday,nightPay,nightHour,overPay,overHour,grossSalary,insTotal,insItems,taxTotal,netSalary,monthlyHours,lawAlerts};
}

/* 급여명세서 모달 — 상세 */
function _dinePayslipModal(memberId,ym){
 var from=ym+'-01',to=ym+'-31';
 Promise.all([
  _db.collection('members').doc(memberId).get(),
  _db.collection('members').where('dealerId','==',_CU.dealerId).get(),
  _db.collection('attendance').where('dealerId','==',_CU.dealerId).where('date','>=',from).where('date','<=',to).get()
 ]).then(function(results){
  var doc=results[0],allMem=results[1],attSnap=results[2];
  if(!doc.exists)return;
  var m=doc.data();m._id=doc.id;
  var empCnt=allMem.size;
  var att={ins:[],outs:[],breaks:[]};
  attSnap.forEach(function(d){
   var dd=d.data();
   if(dd.memberId!==memberId)return;
   if(dd.type==='in')att.ins.push(dd);
   else if(dd.type==='out')att.outs.push(dd);
   else att.breaks.push(dd);
  });
  var r=_calcPayFull(m,att,empCnt,ym);
  var days=att.ins.length;
  var partLabel={'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||(m.part||'');
  var payTypeLabel=m.payType==='monthly'?'월급':m.payType==='daily'?'일급':'시급';
  var insureLabel={'4대보험':'4대보험','3.3%':'3.3% 사업소득세','none':'미가입'}[m.insuranceType]||(m.insuranceType||'');
  var today=new Date().toISOString().slice(0,10);
  var ymLabel=ym.replace('-','년 ')+'월';

  var incomeTax=r.taxTotal?Math.floor(r.taxTotal/1.1):0;
  var localTax=r.taxTotal-incomeTax;

  function _row(label,val,type,sub){
   if(!val&&val!==0)return '';
   var color=type==='add'?'#22c55e':type==='deduct'?'#ef4444':'var(--tx)';
   var sign=type==='add'?'+ ':type==='deduct'?'- ':'';
   return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px">'+
    '<span style="color:var(--t2)">'+(sub?'&nbsp;&nbsp;&nbsp;':'')+label+'</span>'+
    '<span style="font-weight:700;color:'+color+'">'+sign+'₩'+val.toLocaleString()+'</span></div>';
  }
  function _secHead(label){
   return '<div style="font-size:10px;font-weight:800;letter-spacing:1px;color:var(--t3);text-transform:uppercase;margin:14px 0 6px;padding-bottom:4px;border-bottom:2px solid var(--bd)">'+label+'</div>';
  }

  var insBlock='';
  if(m.insuranceType==='4대보험'&&r.insItems){
   if(r.insItems.pension) insBlock+=_row('국민연금',r.insItems.pension,'deduct',true);
   if(r.insItems.health)  insBlock+=_row('건강보험',r.insItems.health,'deduct',true);
   if(r.insItems.longcare)insBlock+=_row('장기요양',r.insItems.longcare,'deduct',true);
   if(r.insItems.employ)  insBlock+=_row('고용보험',r.insItems.employ,'deduct',true);
  } else if(r.insTotal){
   insBlock+=_row(insureLabel,r.insTotal,'deduct',true);
  }
  if(incomeTax) insBlock+=_row('소득세',incomeTax,'deduct',true);
  if(localTax)  insBlock+=_row('지방소득세',localTax,'deduct',true);

  var totalDeduct=r.insTotal+r.taxTotal;

  var html=
   '<div style="text-align:center;padding:0 0 16px;margin-bottom:8px;border-bottom:1px solid var(--bd)">'+
   '<div style="display:inline-block;padding:2px 12px;border-radius:20px;background:rgba(132,204,22,.1);border:1px solid rgba(132,204,22,.2);font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#4d7c0f;margin-bottom:10px">MBTICO · 급여명세서</div>'+
   '<div style="font-size:28px;font-weight:900;letter-spacing:-.5px;color:var(--tx);line-height:1.1">'+m.name+'</div>'+
   '<div style="font-size:13px;color:var(--t2);margin-top:5px">'+partLabel+(m.level?' · '+({'new':'신입','junior':'6개월↑','mid':'1년↑','senior':'3년↑','expert':'5년↑'}[m.level]||m.level):'')+(payTypeLabel?' · '+payTypeLabel:'')+'</div>'+
   '<div style="display:inline-flex;gap:8px;margin-top:6px;font-size:11px;color:var(--t3)"><span>'+ymLabel+'</span><span>·</span><span>발행일 '+today+'</span></div>'+
   '</div>'+
   _secHead('근무 현황')+
   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:4px">'+
   '<div style="background:var(--s3);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:10px;color:var(--t3)">출근일</div><div style="font-size:16px;font-weight:900">'+days+'일</div></div>'+
   '<div style="background:var(--s3);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:10px;color:var(--t3)">총근무</div><div style="font-size:16px;font-weight:900;color:var(--br)">'+r.monthlyHours+'h</div></div>'+
   (r.nightHour>0?'<div style="background:var(--s3);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:10px;color:var(--t3)">야간</div><div style="font-size:16px;font-weight:900;color:#a78bfa">'+r.nightHour+'h</div></div>':'')+
   (r.overHour>0?'<div style="background:var(--s3);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:10px;color:var(--t3)">연장</div><div style="font-size:16px;font-weight:900;color:#f59e0b">'+r.overHour+'h</div></div>':'')+
   '</div>'+
   _secHead('지급 내역')+
   _row('기본급',r.basePay,'add')+
   (r.weeklyHoliday?_row('주휴수당',r.weeklyHoliday,'add'):'')+
   (r.nightPay?_row('야간수당 ('+r.nightHour+'h)',r.nightPay,'add'):'')+
   (r.overPay?_row('연장수당 ('+r.overHour+'h)',r.overPay,'add'):'')+
   '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:800;border-top:2px solid var(--bd);margin-top:4px">'+
   '<span>총 지급액</span><span>₩'+r.grossSalary.toLocaleString()+'</span></div>'+
   (totalDeduct>0?
    _secHead('공제 내역')+
    insBlock+
    '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:800;border-top:2px solid var(--bd);margin-top:4px;color:#ef4444">'+
    '<span>총 공제액</span><span>- ₩'+totalDeduct.toLocaleString()+'</span></div>'
   :'')+
   '<div style="border:2px solid rgba(132,204,22,.35);border-radius:14px;padding:16px;margin:14px 0;text-align:center">'+
   '<div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#4d7c0f;margin-bottom:6px">실수령액</div>'+
   '<div style="font-size:32px;font-weight:900;color:#4d7c0f;font-variant-numeric:tabular-nums;letter-spacing:-1px">₩'+r.netSalary.toLocaleString()+'</div>'+
   '<div style="font-size:11px;color:var(--t3);margin-top:6px">세전 ₩'+r.grossSalary.toLocaleString()+' → 공제 -₩'+(r.insTotal+r.taxTotal).toLocaleString()+'</div>'+
   '</div>'+
   (r.lawAlerts&&r.lawAlerts.length?
    '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">'+
    r.lawAlerts.map(function(a){return '<span style="font-size:10px;padding:3px 8px;border-radius:20px;background:'+a.bg+';color:'+a.color+';border:1px solid '+a.border+'">'+a.text+'</span>';}).join('')+
    '</div>':'')+
   '<div style="font-size:10px;color:var(--t3);text-align:center">2026 근로기준법 기준 자동 계산 | '+insureLabel+'</div>';

  var mo=document.createElement('div');mo.className='mo';
  var box=document.createElement('div');box.className='mo-box';
  box.style.cssText='padding:20px 20px 16px;max-height:90vh;overflow-y:auto';
  box.innerHTML=html+'<button class="btn btn-ghost" style="width:100%;margin-top:14px" onclick="this.closest(\'.mo\').remove()">닫기</button>';
  mo.appendChild(box);mo.onclick=function(e){if(e.target===mo)mo.remove();};
  document.body.appendChild(mo);
 });
}

function _dineSendPayslip(memberId,ym){
 var did=_CU.dealerId;
 if(!memberId||!ym){_dineToast('발송 정보 없음');return;}
 _dineToast('명세서 발송 중...');
 // payroll 컬렉션에서 확정된 급여 조회 (locked 상태 우선)
 _db.collection('payroll').where('dealerId','==',did).where('memberId','==',memberId).where('ym','==',ym)
  .orderBy('lockedAt','desc').limit(1).get()
  .then(function(snap){
   var pData=snap.empty?null:snap.docs[0].data();
   // 직원 정보 조회 (이름·전화)
   return _db.collection('members').doc(memberId).get().then(function(mDoc){
    var m=mDoc.exists?mDoc.data():{};
    var name=m.name||'직원';
    var phone=m.phone||'';
    // payroll 없으면 attendance에서 즉석 계산
    if(!pData){
     return Promise.all([
      _db.collection('attendance').where('dealerId','==',did).where('memberId','==',memberId)
       .where('date','>=',ym+'-01').where('date','<=',ym+'-31').get(),
      _db.collection('members').where('dealerId','==',did).get()
     ]).then(function(results){
      var attSnap=results[0],empCnt=results[1].size;
      var att={ins:[],outs:[],breaks:[]};
      attSnap.forEach(function(doc){var d=doc.data();if(d.type==='in')att.ins.push(d);else if(d.type==='out')att.outs.push(d);else att.breaks.push(d);});
      var r=_calcPayFull(m,att,empCnt,ym);
      return {name:name,phone:phone,netSalary:r.netSalary,basePay:r.basePay};
     });
    }
    return {name:name,phone:phone,netSalary:pData.netSalary||0,basePay:pData.basePay||0};
   });
  })
  .then(function(info){
   return (_auth&&_auth.currentUser?_auth.currentUser.getIdToken():Promise.resolve(''))
    .then(function(token){
     return fetch('/api/payslip-push',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({did:did,ym:ym,members:[{memberId:memberId,name:info.name,netSalary:info.netSalary}]})
     }).then(function(r){return r.json();}).then(function(d){
      if(d.sent>0){
       _dineToast(info.name+' 급여명세서 앱 발송 완료 (₩'+info.netSalary.toLocaleString()+')');
      } else {
       _dineToast(info.name+' — 앱 미설치 또는 알림 미허용 상태');
      }
     });
    });
  })
  .catch(function(e){_dineToast('발송 실패: '+e.message);});
}

/* 실시간 급여 자동 계산 (onSnapshot) */
var _payrollUnsub=null;
function _dineAutoPayroll(did){
 var ym=document.getElementById('pay-ym')?.value||_monthStr();
 var from=ym+'-01',to=ym+'-31';
 var list=document.getElementById('payroll-list');
 if(!list)return;
 if(_payrollUnsub){_payrollUnsub();_payrollUnsub=null;_dineToast('실시간 계산 중지됨');return;}
 list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)"> 실시간 연결 중...</div>';
 _db.collection('members').where('dealerId','==',did).get().then(function(memSnap){
  var empCnt=memSnap.size;
  _payrollUnsub=_db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to)
   .onSnapshot(function(attSnap){
    var attMap={};
    attSnap.forEach(function(doc){
     var d=doc.data();
     if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[],breaks:[]};
     if(d.type==='in')attMap[d.memberId].ins.push(d);
     else if(d.type==='out')attMap[d.memberId].outs.push(d);
     else if(d.type==='break_start'||d.type==='break_end')attMap[d.memberId].breaks.push(d);
    });
    var cards=[];
    memSnap.forEach(function(doc){var m=doc.data();m._id=doc.id;var att=attMap[doc.id]||{ins:[],outs:[]};cards.push({m:m,r:_calcPayFull(m,att,empCnt,ym)});});
    var totalNet=cards.reduce(function(s,c){return s+c.r.netSalary;},0);
    var statusHtml='<div style="font-size:12px;color:#0891b2;padding:8px;margin-bottom:8px;background:rgba(8,145,178,.06);border-radius:8px">'+
     '● 실시간 연결됨 · 총 실수령 합계: <b>₩'+totalNet.toLocaleString()+'</b> ('+cards.length+'명)</div>';

    var PAGE=5, curPage=0, pages=Math.ceil(cards.length/PAGE);
    function renderAutoPage(pg){
     var slice=cards.slice(pg*PAGE,(pg+1)*PAGE);
     var rows=slice.map(function(c){
      var m=c.m,r=c.r;
      var typeLabel={'hourly':'시급','monthly':'월급'}[m.payType]||'시급';
      var partLabel={'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||(m.part||'');
      var partColor={'kitchen':'#ef4444','hall':'#38bdf8','management':'#a78bfa'}[m.part]||'#a78bfa';
      return '<div style="border-bottom:1px solid var(--bd);padding:10px 0">'+
       '<div style="display:flex;align-items:center;justify-content:space-between">'+
        '<div style="display:flex;align-items:center;gap:8px">'+
         '<span style="font-size:13px;font-weight:800">'+m.name+'</span>'+
         (partLabel?'<span style="font-size:10px;padding:2px 6px;border-radius:10px;background:rgba(255,255,255,.06);color:'+partColor+'">'+partLabel+'</span>':'')+
        '</div>'+
        '<span style="font-size:15px;font-weight:900;color:#22c55e">₩'+r.netSalary.toLocaleString()+'</span>'+
       '</div>'+
       '<div style="display:flex;gap:10px;margin-top:4px;font-size:11px;color:var(--t3)">'+
        '<span>'+r.monthlyHours+'h · '+typeLabel+'</span>'+
        '<span>기본 <b style="color:var(--tx)">₩'+r.basePay.toLocaleString()+'</b></span>'+
        (r.insTotal+r.taxTotal?'<span>공제 <b style="color:#ef4444">-₩'+(r.insTotal+r.taxTotal).toLocaleString()+'</b></span>':'')+
       '</div>'+
      '</div>';
     }).join('');
     var nav=pages>1?
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0 4px">'+
      '<button onclick="_dineAutoPayPage('+(pg-1)+')" '+(pg===0?'disabled style="opacity:.3;cursor:default"':'')+
       ' style="padding:6px 14px;border:1px solid var(--bd);border-radius:8px;background:transparent;color:var(--tx);font-size:12px;cursor:pointer">이전</button>'+
      '<span style="font-size:12px;color:var(--t3)"><b style="color:var(--tx)">'+(pg+1)+'</b> / '+pages+'페이지 ('+cards.length+'명)</span>'+
      '<button onclick="_dineAutoPayPage('+(pg+1)+')" '+(pg===pages-1?'disabled style="opacity:.3;cursor:default"':'')+
       ' style="padding:6px 14px;border:1px solid var(--bd);border-radius:8px;background:transparent;color:var(--tx);font-size:12px;cursor:pointer">다음</button>'+
      '</div>':'';
     return rows+nav;
    }
    window._dineAutoPayPage=function(pg){
     if(pg<0||pg>=pages)return;
     curPage=pg;
     var el2=document.getElementById('auto-pay-cards');
     if(el2) el2.innerHTML=renderAutoPage(pg);
    };
    list.innerHTML=statusHtml+'<div id="auto-pay-cards">'+renderAutoPage(0)+'</div>';
   });
  _dineToast('실시간 급여 계산 시작됨');
 });
}

/* 급여 확정 저장 + 직원 앱푸시 */
function _dinePayrollLock(ym){
 var ex=document.getElementById('pay-lock-pop'); if(ex) ex.remove();
 var pop=document.createElement('div');
 pop.id='pay-lock-pop';
 pop.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
 pop.innerHTML='<div class="card" style="width:100%;max-width:400px;border-radius:20px;padding:28px;text-align:center">'+
  '<div style="font-size:16px;font-weight:900;margin-bottom:8px">급여 확정</div>'+
  '<div style="font-size:13px;color:var(--t3);margin-bottom:20px">'+ym+' 급여를 확정하고<br>직원에게 앱 푸시 알림을 발송합니다</div>'+
  '<div style="display:flex;gap:10px">'+
  '<button onclick="document.getElementById(\'pay-lock-pop\').remove()" '+
   'style="flex:1;padding:13px;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)">취소</button>'+
  '<button id="pay-lock-btn" onclick="_dinePayrollDoLock(\''+ym+'\')" '+
   'style="flex:2;padding:13px;background:#22c55e;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer">확정 + 발송</button>'+
  '</div></div>';
 document.body.appendChild(pop);
}

function _dinePayrollDoLock(ym){
 var btn=document.getElementById('pay-lock-btn');
 if(btn){btn.disabled=true;btn.textContent='처리 중...';}
 var did=_CU.dealerId;
 var from=ym+'-01',to=ym+'-31';
 var memberPayList=[];
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(results){
  var attSnap=results[0],memSnap=results[1];
  var empCnt=memSnap.size;
  var attMap={};
  attSnap.forEach(function(doc){
   var d=doc.data();
   if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[],breaks:[]};
   if(d.type==='in')attMap[d.memberId].ins.push(d);
   else if(d.type==='out')attMap[d.memberId].outs.push(d);
   else if(d.type==='break_start'||d.type==='break_end')attMap[d.memberId].breaks.push(d);
  });
  var saves=[];
  memSnap.forEach(function(doc){
   var m=doc.data();m._id=doc.id;
   var att=attMap[doc.id]||{ins:[],outs:[]};
   var r=_calcPayFull(m,att,empCnt,ym);
   memberPayList.push({memberId:doc.id,name:m.name,netSalary:r.netSalary});
   saves.push(_db.collection('payroll').add({
    dealerId:did,memberId:doc.id,memberName:m.name,ym:ym,
    basePay:r.basePay,weeklyHoliday:r.weeklyHoliday,nightPay:r.nightPay,
    overPay:r.overPay,grossSalary:r.grossSalary,insTotal:r.insTotal,
    taxTotal:r.taxTotal,netSalary:r.netSalary,monthlyHours:r.monthlyHours,
    lockedAt:new Date().toISOString(),status:'locked'
   }));
  });
  return Promise.all(saves);
 }).then(function(){
  /* Firestore 저장 완료 → 앱 푸시 발송 */
  return (_auth&&_auth.currentUser?_auth.currentUser.getIdToken():Promise.resolve(''))
  .then(function(token){
   return fetch('/api/payslip-push',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body:JSON.stringify({did:did,ym:ym,members:memberPayList})
   });
  }).then(function(r){return r.json();})
  .then(function(d){
   var p=document.getElementById('pay-lock-pop'); if(p) p.remove();
   _dineToast(ym+' 급여 확정 완료 · 앱 푸시 '+( d.sent||0)+'명 발송');
  });
 }).catch(function(e){
  _dineToast('오류: '+e.message);
  if(btn){btn.disabled=false;btn.textContent='확정 + 발송';}
 });
}

