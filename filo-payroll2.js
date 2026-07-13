/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      filo-payroll2.js
 * @description 급여관리·명세서·카카오알림톡
 */
// filo-common.js에서 분리됨 (리팩토링 2026-07-13)

function _filoPwTab(idx){
 _pwTabIdx=idx;
 [0,1,2,3].forEach(function(i){
  var b=document.getElementById('pwt-'+i);
  if(b){b.style.background=i===idx?'var(--br)':'var(--b3)';b.style.color=i===idx?'#fff':'var(--t2)';}
 });
 _filoRenderPayList();
}

/* ── 주휴수당 계산 ── */
function _calcWeeklyAllowance(ins,outs,wage,wageType){
 if(wageType!=='hourly'||!wage)return 0;
 /* 주별 근무시간 집계 */
 var weekMap={};
 ins.forEach(function(inR,i){
  var outR=outs[i];
  if(!outR)return;
  var diff=(new Date(outR.time)-new Date(inR.time))/3600000;
  if(diff<=0||diff>12)return;
  var d=new Date(inR.time);
  /* ISO week key */
  var dayOfWeek=d.getDay()||7;
  var monday=new Date(d);monday.setDate(d.getDate()-(dayOfWeek-1));
  var wk=monday.toISOString().slice(0,10);
  weekMap[wk]=(weekMap[wk]||0)+diff;
 });
 var total=0;
 Object.values(weekMap).forEach(function(hrs){
  if(hrs>=15){
   /* 주휴수당 = (주근무시간/40)*8*시급 (단 8h 한도) */
   var dailyHour=Math.min(hrs/5,8);
   total+=Math.round(dailyHour*wage);
  }
 });
 return total;
}

/* ── 세금/공제 계산 ── */
function _calcDeduction(gross,empType){
 /* empType: 'part'=단기알바(3.3%), 'full'=정직원(4대보험), 'monthly'=월급 */
 if(!gross)return{tax:0,insurance:0,total:0};
 if(empType==='part'){
  var tax=Math.round(gross*0.033);
  return{tax:tax,insurance:0,total:tax};
 }
 if(empType==='full'||empType==='monthly'){
  var pension=Math.round(gross*0.045);
  var health=Math.round(gross*0.03545);
  var employ=Math.round(gross*0.009);
  var ins=pension+health+employ;
  var tax2=Math.round((gross-ins)*0.033);
  return{tax:tax2,insurance:ins,total:tax2+ins};
 }
 return{tax:0,insurance:0,total:0};
}

/* ── 전체 급여 로드 ── */
var _payrollData=[];
function _filoRenderPaySummary(){
 var members=_payrollData;
 var totalGross=members.reduce(function(s,m){return s+m.gross;},0);
 var totalNet=members.reduce(function(s,m){return s+m.netPay;},0);
 var totalHour=members.reduce(function(s,m){return s+m.workHour;},0);
 var totalWeekly=members.reduce(function(s,m){return s+(m.weeklyAllowance||0);},0);
 var sum=document.getElementById('pay-summary');
 if(!sum)return;
 sum.innerHTML=[
  {label:'총 지급예정',val:'₩'+totalGross.toLocaleString(),color:'#22c55e',icon:'💰'},
  {label:'총 실수령액',val:'₩'+totalNet.toLocaleString(),color:'#a78bfa',icon:'💳'},
  {label:'주휴수당 합계',val:'₩'+totalWeekly.toLocaleString(),color:'#f59e0b',icon:'📅'},
  {label:'총 근무시간',val:Math.round(totalHour)+'h',color:'#38bdf8',icon:'⏱'},
 ].map(function(s,i){
  return '<div class="stat-card pop-in stagger-'+(i+1)+'">'+
  '<div style="font-size:18px;margin-bottom:4px">'+s.icon+'</div>'+
  '<div style="font-size:17px;font-weight:900;color:'+s.color+'">'+s.val+'</div>'+
  '<div style="font-size:10px;color:var(--t3)">'+s.label+'</div></div>';
 }).join('');
}

function _filoRenderPayList(){
 var list=document.getElementById('pay-list');
 if(!list)return;
 var typeFilter=['all','hourly','daily','monthly'][_pwTabIdx];
 var members=_payrollData.filter(function(m){
  return typeFilter==='all'||m.wageType===typeFilter;
 });
 if(!members.length){
  list.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--t3)">해당 조건의 급여 기록 없음</div>';
  return;
 }
 list.innerHTML=members.sort(function(a,b){return b.gross-a.gross;}).map(function(m,i){
  var typeLabel=m.wageType==='daily'?'일급':m.wageType==='monthly'?'월급':'시급';
  var empLabel=m.empType==='full'?'정직원':m.empType==='monthly'?'월급직':'단기알바';
  var hasWeekly=m.weeklyAllowance>0;
  return '<div class="pay-card slide-up stagger-'+Math.min(i+1,4)+'" style="flex-direction:column;gap:8px">'+
  '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
  '<div>'+
  '<div style="font-size:14px;font-weight:900">'+esc(m.name)+
  ' <span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--b3);color:var(--t2)">'+empLabel+'</span></div>'+
  '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+
  typeLabel+' '+m.wage.toLocaleString()+'원 · '+m.dayCount+'일 · '+Math.floor(m.workHour)+'h '+m.workMin%60+'m</div>'+
  '</div>'+
  '<div style="text-align:right">'+
  '<div class="pay-amount">₩'+m.gross.toLocaleString()+'</div>'+
  '<div style="font-size:10px;color:#ef4444">공제 -₩'+m.deduction.toLocaleString()+'</div>'+
  '<div style="font-size:12px;font-weight:800;color:#22c55e">실수령 ₩'+m.netPay.toLocaleString()+'</div>'+
  '</div></div>'+
  (hasWeekly?'<div style="font-size:11px;color:#f59e0b;background:rgba(245,158,11,.08);border-radius:6px;padding:4px 8px">'+
  '📅 주휴수당 +₩'+m.weeklyAllowance.toLocaleString()+' 자동 포함</div>':'')+
  (m.insurance?'<div style="font-size:10px;color:var(--t3)">4대보험 ₩'+m.insurance.toLocaleString()+' · 소득세 ₩'+m.tax.toLocaleString()+'</div>':'')+
  '</div>';
 }).join('');
}

/* ── 명세서 발송 ── */
function _filoDoSendPayslip(ym){
 document.querySelector('.mo')&&document.querySelector('.mo').remove();
 _filoToast('📨 급여명세서 발송 기능은 준비 중입니다 (카카오 알림톡 연동 예정)');
}


var _cartItems=[];
function _filoPay(){
 if(!_cartItems.length){_filoToast('주문 내역이 없습니다');return;}
 var rawTotal=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var discount=window._posDiscount||0;
 var total=Math.max(0,rawTotal-discount);

 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:440px';

 /* 헤더 */
 var hdrDiv=document.createElement('div');
 hdrDiv.style.cssText='margin-bottom:14px';
 hdrDiv.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:10px">💳 결제하기</div>'+
  '<div style="background:var(--surface2);border-radius:var(--r);padding:12px 14px">'+
  '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t3);margin-bottom:4px">'+
  '<span>소계 ('+_cartItems.length+'종)</span><span>₩'+rawTotal.toLocaleString()+'</span></div>'+
  (discount>0?'<div style="display:flex;justify-content:space-between;font-size:12px;color:#ef4444;margin-bottom:4px"><span>할인</span><span>−₩'+discount.toLocaleString()+'</span></div>':'')+
  '<div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;border-top:1px solid var(--bd);padding-top:8px;margin-top:4px">'+
  '<span>결제금액</span><span style="color:#22c55e">₩'+total.toLocaleString()+'</span></div></div>';
 box.appendChild(hdrDiv);

 /* 할인 */
 var discDiv=document.createElement('div');
 discDiv.style.cssText='background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);padding:11px 12px;margin-bottom:14px';
 discDiv.innerHTML='<div style="font-size:10px;color:var(--t3);font-weight:700;letter-spacing:.6px;margin-bottom:8px">할인 적용</div>'+
  '<div style="display:flex;gap:6px">'+
  '<input id="pay-disc-inp" type="number" placeholder="할인금액 입력" style="flex:1;padding:9px 10px;background:var(--bg3);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);font-size:13px;outline:none">'+
  '<button onclick="(function(){window._posDiscount=parseInt(document.getElementById(\'pay-disc-inp\').value)||0;document.querySelectorAll(\'.mo\').forEach(function(e){e.remove();});_filoPay();})()" style="padding:9px 14px;background:var(--br);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">적용</button>'+
  '<button onclick="(function(){var r='+rawTotal+';window._posDiscount=Math.round(r*0.1);document.querySelectorAll(\'.mo\').forEach(function(e){e.remove();});_filoPay();})()" style="padding:9px 10px;background:var(--surface3);border:1px solid var(--bd2);border-radius:8px;color:var(--t2);font-size:11px;font-weight:700;cursor:pointer">10%</button>'+
  '<button onclick="(function(){var r='+rawTotal+';window._posDiscount=Math.round(r*0.2);document.querySelectorAll(\'.mo\').forEach(function(e){e.remove();});_filoPay();})()" style="padding:9px 10px;background:var(--surface3);border:1px solid var(--bd2);border-radius:8px;color:var(--t2);font-size:11px;font-weight:700;cursor:pointer">20%</button>'+
  '</div>';
 box.appendChild(discDiv);

 /* 선불/후불 선택 탭 */
 var payTypeDiv=document.createElement('div');
 payTypeDiv.style.cssText='display:flex;gap:6px;margin-bottom:12px';
 window._posPayType=window._posPayType||'postpay';
 [{k:'postpay',l:'🧾 후불 (나중에 결제)'},{k:'prepay',l:'💳 선불 (지금 결제)'}].forEach(function(pt){
  var ptBtn=document.createElement('button');
  ptBtn.style.cssText='flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;border:2px solid '+(window._posPayType===pt.k?'#0891b2':'var(--bd2)')+';background:'+(window._posPayType===pt.k?'rgba(8,145,178,.15)':'var(--surface2)')+';color:'+(window._posPayType===pt.k?'#0891b2':'var(--t2)');
  ptBtn.textContent=pt.l;
  (function(k){ptBtn.onclick=function(){
   window._posPayType=k;
   if(k==='postpay'){
    // 후불: 바로 주문 등록 (결제수단 = 후불)
    document.querySelectorAll('.mo').forEach(function(e){e.remove();});
    _filoConfirmPay('postpay','🧾 후불');
   } else {
    // 선불: 결제 수단 선택 화면으로
    document.querySelectorAll('.mo').forEach(function(e){e.remove();});
    _filoPay();
   }
  };})(pt.k);
  payTypeDiv.appendChild(ptBtn);
 });
 box.appendChild(payTypeDiv);

 /* 결제 수단 버튼 */
 var methods=[
  {k:'card',l:'카드',ic:'💳'},{k:'cash',l:'현금',ic:'💵'},
  {k:'kakao',l:'카카오페이',ic:'🟡'},{k:'samsung',l:'삼성페이',ic:'📱'},
  {k:'naver',l:'네이버페이',ic:'🟢'},{k:'zero',l:'서비스/무료',ic:'🎁'},
 ];
 var grid=document.createElement('div');
 grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px';
 methods.forEach(function(m){
  var btn=document.createElement('button');
  btn.style.cssText='padding:14px 6px;border:1.5px solid var(--bd2);border-radius:var(--r);background:var(--surface2);color:var(--tx);cursor:pointer;transition:.15s;text-align:center';
  btn.innerHTML='<div style="font-size:22px;margin-bottom:4px">'+m.ic+'</div><div style="font-size:11px;font-weight:700">'+m.l+'</div>';
  btn.onmouseover=function(){this.style.borderColor='#7c3aed';this.style.background='var(--surface3)';};
  btn.onmouseout=function(){this.style.borderColor='var(--bd2)';this.style.background='var(--surface2)';};
  (function(mk,ml){btn.onclick=function(){
   document.querySelectorAll('.mo').forEach(function(e){e.remove();});
   _filoConfirmPay(mk,ml);
  };})(m.k,m.l+' '+m.ic);
  grid.appendChild(btn);
 });
 box.appendChild(grid);

 /* 분할 결제 버튼 */
 var splitBtn=document.createElement('button');
 splitBtn.style.cssText='width:100%;padding:11px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:var(--r);color:#f59e0b;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px';
 splitBtn.textContent='✂️ 분할 결제 (현금+카드)';
 splitBtn.onclick=function(){mo.remove();_filoSplitPay(total);};
 box.appendChild(splitBtn);

 /* 각자 계산 버튼 */
 var selfBtn=document.createElement('button');
 selfBtn.style.cssText='width:100%;padding:11px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:var(--r);color:#818cf8;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px';
 selfBtn.textContent='👥 각자 계산';
 selfBtn.onclick=function(){mo.remove();_filoSelfPay();};
 box.appendChild(selfBtn);

 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='width:100%;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);font-size:13px;cursor:pointer';
 cancelBtn.textContent='취소';
 cancelBtn.onclick=function(){mo.remove();window._posDiscount=0;};
 box.appendChild(cancelBtn);

 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo){mo.remove();window._posDiscount=0;}};
 document.body.appendChild(mo);
}

// ── 분할 결제 (현금+카드) ──