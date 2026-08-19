/**
 * @module      filo-payroll2.js
 * ══════════════════════════════════════════════════════
 * 역할: 급여 자동계산 · 명세서 발송 (2026 근로기준법)
 *
 * 저장 컬렉션:
 *   filo_attendances — QR 출퇴근 기록 (급여 계산 소스)
 *   filo_staffs      — 직원 시급·4대보험 정보
 *   filo_payrolls    — 월 급여 확정 내역
 *
 * 급여 계산 항목:
 *   기본급: 시급 × 근무시간
 *   주휴수당: 주 15시간 이상 시 자동 산정
 *   야간수당: 22:00~06:00 × 1.5배
 *   연장수당: 8시간 초과 × 1.5배 (5인 미만 제외)
 *   4대보험: 국민연금4.5%, 건강보험3.545%, 고용보험0.9%, 산재보험(사측)
 *   휴식공제: QR 휴식 시작~종료 자동 차감
 *
 * 알림톡 발송:
 *   카카오 알림톡으로 직원 개인 명세서 발송
 *   현재: 솔라피 API (13원/건)
 *   교체 예정: 알리고 API (6.5원/건) — 절반 비용
 *   엔드포인트: /api/kakao-alimtalk (_worker.js)
 *
 * 주요 함수:
 *   _filoCalcPayroll(did, month)  — 급여 자동계산
 *   _filoSendPayslip(staffId)     — 개인 명세서 카카오 발송
 *   _filoSendAllPayslips(did)     — 전 직원 일괄 발송
 *   _filoConfirmPayroll(did)      — 급여 확정 처리
 * ══════════════════════════════════════════════════════
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
  {label:'총 지급예정',val:'₩'+totalGross.toLocaleString(),color:'#22c55e',icon:'₩'},
  {label:'총 실수령액',val:'₩'+totalNet.toLocaleString(),color:'#a78bfa',icon:'₩'},
  {label:'주휴수당 합계',val:'₩'+totalWeekly.toLocaleString(),color:'#f59e0b',icon:'₩'},
  {label:'총 근무시간',val:Math.round(totalHour)+'h',color:'#38bdf8',icon:'h'},
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
  var hasOvertime=m.overtimePay>0;
  var hasNight=m.nightPay>0;
  var hasBreak=m.breakMin>0;
  return '<div class="pay-card slide-up stagger-'+Math.min(i+1,4)+'" style="flex-direction:column;gap:8px">'+
  '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
  '<div style="flex:1;min-width:0">'+
  '<div style="font-size:14px;font-weight:900">'+esc(m.name)+
  ' <span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--b3);color:var(--t2)">'+empLabel+'</span></div>'+
  '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+
  typeLabel+' '+m.wage.toLocaleString()+'원 · '+m.dayCount+'일 · '+Math.floor(m.workHour)+'h '+m.workMin%60+'m'+
  (hasBreak?' · 휴식차감 '+m.breakMin+'분':'')+
  '</div>'+
  '</div>'+
  '<div style="text-align:right;flex-shrink:0">'+
  '<div class="pay-amount">₩'+m.gross.toLocaleString()+'</div>'+
  '<div style="font-size:10px;color:#EF4444">공제 -₩'+m.deduction.toLocaleString()+'</div>'+
  '<div style="font-size:12px;font-weight:800;color:#10B981">실수령 ₩'+m.netPay.toLocaleString()+'</div>'+
  '</div></div>'+
  /* 급여 상세 내역 */
  '<div style="display:flex;flex-wrap:wrap;gap:6px">'+
  '<div style="font-size:10px;background:rgba(99,102,241,.08);color:#6366F1;border-radius:6px;padding:3px 8px">기본급 ₩'+m.basePay.toLocaleString()+'</div>'+
  (hasWeekly?'<div style="font-size:10px;background:rgba(245,158,11,.08);color:#F59E0B;border-radius:6px;padding:3px 8px">주휴수당 +₩'+m.weeklyAllowance.toLocaleString()+'</div>':'')+
  (hasOvertime?'<div style="font-size:10px;background:rgba(239,68,68,.08);color:#EF4444;border-radius:6px;padding:3px 8px">연장수당 +₩'+m.overtimePay.toLocaleString()+'</div>':'')+
  (hasNight?'<div style="font-size:10px;background:rgba(59,130,246,.08);color:#3B82F6;border-radius:6px;padding:3px 8px">야간수당 +₩'+m.nightPay.toLocaleString()+'</div>':'')+
  '</div>'+
  (m.insurance?'<div style="font-size:10px;color:var(--t3)">4대보험 ₩'+m.insurance.toLocaleString()+' · 소득세 ₩'+m.tax.toLocaleString()+'</div>':'')+
  '</div>';
 }).join('');
}

/* ── 명세서 발송 ── */
function _filoDoSendPayslip(ym){
 document.querySelector('.mo')&&document.querySelector('.mo').remove();
 if(!_payrollData||!_payrollData.length){_filoToast('급여 데이터 없음');return;}
 var did=_CU&&(_CU.dealerId||_CU.uid)||'';
 var employees=_payrollData.map(function(p){
  return {uid:p.uid||p.memberId||'',name:p.name||'',netPay:p.netPay||0,gross:p.gross||0};
 }).filter(function(e){return e.uid;});
 fetch('/api/payslip-fcm',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({did:did,ym:ym,employees:employees})
 }).then(function(r){return r.json();}).then(function(d){
  _filoToast('급여명세서 FCM 알림 발송 완료 ('+(d.sent||0)+'명)');
 }).catch(function(e){
  _filoToast('발송 실패: '+e.message);
 });
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
 hdrDiv.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:10px">결제하기</div>'+
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
 [{k:'postpay',l:'후불 (나중에 결제)'},{k:'prepay',l:'선불 (지금 결제)'}].forEach(function(pt){
  var ptBtn=document.createElement('button');
  ptBtn.style.cssText='flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;border:2px solid '+(window._posPayType===pt.k?'#0891b2':'var(--bd2)')+';background:'+(window._posPayType===pt.k?'rgba(8,145,178,.15)':'var(--surface2)')+';color:'+(window._posPayType===pt.k?'#0891b2':'var(--t2)');
  ptBtn.textContent=pt.l;
  (function(k){ptBtn.onclick=function(){
   window._posPayType=k;
   if(k==='postpay'){
    // 후불: 바로 주문 등록 (결제수단 = 후불)
    document.querySelectorAll('.mo').forEach(function(e){e.remove();});
    _filoConfirmPay('postpay','후불');
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
  {k:'card',l:'카드',ic:'카드'},{k:'cash',l:'현금',ic:'현금'},
  {k:'kakao',l:'카카오페이',ic:'카카오'},{k:'samsung',l:'삼성페이',ic:'삼성'},
  {k:'naver',l:'네이버페이',ic:'네이버'},{k:'zero',l:'서비스/무료',ic:'무료'},
 ];
 var grid=document.createElement('div');
 grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px';
 methods.forEach(function(m){
  var btn=document.createElement('button');
  btn.style.cssText='padding:14px 6px;border:1.5px solid var(--bd2);border-radius:var(--r);background:var(--surface2);color:var(--tx);cursor:pointer;transition:.15s;text-align:center';
  btn.innerHTML='<div style="font-size:22px;margin-bottom:4px">'+m.ic+'</div><div style="font-size:11px;font-weight:700">'+m.l+'</div>';
  btn.onmouseover=function(){this.style.borderColor='#c9a84c';this.style.background='var(--surface3)';};
  btn.onmouseout=function(){this.style.borderColor='var(--bd2)';this.style.background='var(--surface2)';};
  (function(mk,ml){btn.onclick=function(){
   document.querySelectorAll('.mo').forEach(function(e){e.remove();});
   _filoConfirmPay(mk,ml);
  };})(m.k,m.l+' '+m.ic);
  grid.appendChild(btn);
 });
 box.appendChild(grid);

 /* 토스페이먼츠 온라인 결제 */
 var tossBtn=document.createElement('button');
 tossBtn.style.cssText='width:100%;padding:13px;border:1.5px solid rgba(75,180,255,.4);border-radius:var(--r);background:rgba(75,180,255,.08);color:#4bb4ff;cursor:pointer;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;transition:.15s';
 tossBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>토스페이먼츠 온라인 결제';
 tossBtn.onclick=function(){_filoTossPosPay(total,mo);};
 box.appendChild(tossBtn);

 /* 분할 결제 버튼 */
 var splitBtn=document.createElement('button');
 splitBtn.style.cssText='width:100%;padding:11px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:var(--r);color:#f59e0b;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px';
 splitBtn.textContent='분할 결제 (현금+카드)';
 splitBtn.onclick=function(){mo.remove();_filoSplitPay(total);};
 box.appendChild(splitBtn);

 /* 각자 계산 버튼 */
 var selfBtn=document.createElement('button');
 selfBtn.style.cssText='width:100%;padding:11px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:var(--r);color:#818cf8;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px';
 selfBtn.textContent='각자 계산';
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
// ── 급여 명세서 관리 UI (사진 3번 스타일) ───────────────────────
function _filoPagePayslip(el) {
  var did = (_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
  if(!did){ el.innerHTML='<div class="card" style="text-align:center;padding:40px">로그인 후 이용하세요</div>'; return; }

  var now = new Date();
  var ym = now.toISOString().slice(0,7);

  el.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.className = 'slide-up';
  wrap.style.cssText = 'max-width:960px;margin:0 auto';

  // ── 헤더 ──
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px';
  hdr.innerHTML =
    '<div>' +
    '<div style="font-size:22px;font-weight:900;color:var(--tx)">급여 명세서 관리</div>' +
    '<div style="font-size:12px;color:var(--t3);margin-top:4px">직원들의 월 급여 명세서를 관리하고 지급 처리를 진행합니다</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px">' +
    '<button onclick="_filoPayslipExcel()" style="padding:8px 14px;background:var(--surface);border:1px solid var(--bd);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;color:var(--tx)">⬇ 엑셀 다운로드</button>' +
    '<button onclick="_filoPayslipGenerate('+did+')" style="padding:8px 14px;background:var(--br);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">+ 명세서 생성</button>' +
    '</div>';
  wrap.appendChild(hdr);

  // ── KPI 4열 ──
  var kpi = document.createElement('div');
  kpi.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px';
  kpi.innerHTML = [
    {id:'ps-total-staff',   ic:'', lbl:'총 직원수',       c:'#0891b2'},
    {id:'ps-total-pay',     ic:'₩', lbl:'이번달 총 지급액', c:'#c9a84c'},
    {id:'ps-avg-hours',     ic:'h',  lbl:'평균 근무시간',    c:'#f59e0b'},
    {id:'ps-pending',       ic:'!',  lbl:'미지급 건수',     c:'#ef4444'},
  ].map(function(k){
    return '<div class="card" style="padding:16px;border-radius:16px">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">' +
      '<span style="font-size:16px">'+k.ic+'</span>' +
      '<span style="font-size:11px;font-weight:700;color:var(--t3)">'+k.lbl+'</span>' +
      '</div>' +
      '<div style="font-size:20px;font-weight:900;color:'+k.c+'" id="'+k.id+'">—</div>' +
      (k.id==='ps-pending'?'<div style="font-size:10px;color:#ef4444;margin-top:2px">확인 필요</div>':'') +
      '</div>';
  }).join('');
  wrap.appendChild(kpi);

  // ── 월 선택 + 필터 ──
  var filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap';
  filterBar.innerHTML =
    '<div style="font-size:15px;font-weight:900;color:var(--tx)" id="ps-month-title">'+ym.replace('-','년 ')+'월 급여 명세서</div>' +
    '<div style="flex:1"></div>' +
    '<select id="ps-filter-status" onchange="_filoPayslipFilter('+did+')" style="padding:7px 12px;border:1px solid var(--bd);border-radius:8px;background:var(--surface);color:var(--tx);font-size:12px;cursor:pointer">' +
    '<option value="all">지급상태: 전체</option>' +
    '<option value="paid">지급완료</option>' +
    '<option value="pending">지급대기</option>' +
    '</select>';
  wrap.appendChild(filterBar);

  // ── 직원 급여 테이블 ──
  var tableCard = document.createElement('div');
  tableCard.className = 'card';
  tableCard.style.cssText = 'padding:20px;border-radius:18px;margin-bottom:14px';
  tableCard.innerHTML =
    '<div style="overflow-x:auto">' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px" id="ps-table">' +
    '<thead><tr style="border-bottom:2px solid var(--bd)">' +
    ['직원명','부서/직급','근무시간','기본급','연장수당','공제액','실지급액','지급일','상태','관리'].map(function(h){
      return '<th style="padding:10px 8px;text-align:left;font-weight:700;color:var(--t3);white-space:nowrap">'+h+'</th>';
    }).join('') +
    '</tr></thead>' +
    '<tbody id="ps-table-body"><tr><td colspan="10" style="padding:30px;text-align:center;color:var(--t3)">로딩 중...</td></tr></tbody>' +
    '</table></div>';
  wrap.appendChild(tableCard);
  el.appendChild(wrap);

  // 데이터 로딩
  _filoPayslipLoad(did, ym);
}

// 급여 데이터 로딩
function _filoPayslipLoad(did, ym) {
  var db = firebase.firestore();

  Promise.all([
    db.collection('members').where('dealerId','==',did).where('status','==','active').get(),
    db.collection('attendance').where('dealerId','==',did).where('date','>=',ym+'-01').where('date','<=',ym+'-31').get(),
    db.collection('payroll_records').where('dealerId','==',did).where('ym','==',ym).get()
  ]).then(function(res){
    var members = res[0].docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
    var attDocs = res[1].docs.map(function(d){ return d.data(); });
    var payDocs = {};
    res[2].docs.forEach(function(d){ payDocs[d.data().memberId]=d.data(); });

    // 직원별 근무시간 계산
    // FIX: attendance는 근무 '이벤트'(in/out/break_*)라 레코드 수로 세면 안 된다.
    // (기존: 레코드마다 8시간 가산 -> 출근+퇴근 1일이 16시간으로 계산됨)
    var attMap = {};
    attDocs.forEach(function(a){
      if(!a || !a.memberId || !a.time) return;
      if(!attMap[a.memberId]) attMap[a.memberId]=[];
      attMap[a.memberId].push(a);
    });
    var hoursMap = {};
    Object.keys(attMap).forEach(function(mid){
      var evs = attMap[mid].slice().sort(function(x,y){ return x.time<y.time?-1:(x.time>y.time?1:0); });
      var totalMin=0, openIn=null, breakStart=null, breakMin=0;
      evs.forEach(function(e){
        if(e.type==='in'){ if(!openIn) openIn=e; }
        else if(e.type==='out'){
          if(!openIn) return;
          var diff=(new Date(e.time)-new Date(openIn.time))/60000;
          if(diff>0 && diff<=720){
            var br = breakMin>0 ? breakMin : (diff>=480?60:(diff>=240?30:0));
            totalMin += Math.max(0, diff-br);
          }
          openIn=null; breakStart=null; breakMin=0;
        }
        else if(e.type==='break_start'){ breakStart=e; }
        else if(e.type==='break_end'){
          if(breakStart){
            var b=(new Date(e.time)-new Date(breakStart.time))/60000;
            if(b>0 && b<240) breakMin+=b;
          }
          breakStart=null;
        }
      });
      hoursMap[mid]=totalMin/60;
    });

    var totalPay=0, pending=0, totalHours=0;
    var tbody = document.getElementById('ps-table-body');
    if(!tbody) return;

    if(!members.length){
      tbody.innerHTML='<tr><td colspan="10" style="padding:30px;text-align:center;color:var(--t3)">등록된 직원이 없어요</td></tr>';
      return;
    }

    tbody.innerHTML = members.map(function(m){
      var hours = hoursMap[m.id]||0;
      var wage  = m.hourlyWage||m.wage||10000;
      var base  = Math.round(hours * wage);
      var overtime = hours>160 ? Math.round((hours-160)*wage*1.5) : 0;
      var deduct = Math.round((base+overtime)*0.033);
      var net   = base + overtime - deduct;
      var pay   = payDocs[m.id];
      var isPaid = pay && pay.status==='paid';
      var payDate = pay ? (pay.paidAt||'').slice(0,10) : '';
      totalPay += net;
      totalHours += hours;
      if(!isPaid) pending++;

      var avatar = (m.name||'?').slice(0,1);
      var colors = ['#c9a84c','#0891b2','#059669','#f59e0b','#ef4444'];
      var color  = colors[Math.abs(m.id.charCodeAt(0))%5];

      return '<tr style="border-bottom:1px solid var(--bd)">' +
        '<td style="padding:12px 8px;white-space:nowrap">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
        '<div style="width:30px;height:30px;border-radius:50%;background:'+color+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">'+avatar+'</div>' +
        '<span style="font-weight:700">'+m.name+'</span></div></td>' +
        '<td style="padding:12px 8px;color:var(--t3)"><div>'+(m.department||'—')+'</div><div style="font-size:10px">'+(m.position||'—')+'</div></td>' +
        '<td style="padding:12px 8px;font-weight:600">'+hours+'h</td>' +
        '<td style="padding:12px 8px">₩'+base.toLocaleString()+'</td>' +
        '<td style="padding:12px 8px">₩'+overtime.toLocaleString()+'</td>' +
        '<td style="padding:12px 8px;color:#ef4444">₩'+deduct.toLocaleString()+'</td>' +
        '<td style="padding:12px 8px;font-weight:800;color:#c9a84c">₩'+net.toLocaleString()+'</td>' +
        '<td style="padding:12px 8px;color:var(--t3);font-size:11px">'+(payDate||'—')+'</td>' +
        '<td style="padding:12px 8px">' +
        '<span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+(isPaid?'rgba(34,197,94,.12)':'rgba(245,158,11,.12)')+';color:'+(isPaid?'#059669':'#f59e0b')+'">'+
        (isPaid?'지급완료':'지급대기')+'</span></td>' +
        '<td style="padding:12px 8px">' +
        '<button onclick="_filoPayslipModal(\"'+m.id+'\",\"'+ym+'\")" style="padding:5px 10px;border:1px solid var(--bd);border-radius:7px;background:transparent;color:var(--t2);font-size:11px;cursor:pointer;margin-right:4px">보기</button>'+
        (!isPaid?'<button onclick="_filoPayslipProcess(\"'+m.id+'\",'+did+','+ym+')" style="padding:5px 10px;background:var(--br);color:#fff;border:none;border-radius:7px;font-size:11px;cursor:pointer">지급처리</button>':'')+
        '</td>' +
        '</tr>';
    }).join('');

    // KPI 업데이트
    var e1=document.getElementById('ps-total-staff');
    var e2=document.getElementById('ps-total-pay');
    var e3=document.getElementById('ps-avg-hours');
    var e4=document.getElementById('ps-pending');
    if(e1) e1.textContent=members.length+'명';
    if(e2) e2.textContent='₩'+totalPay.toLocaleString();
    if(e3) e3.textContent=members.length?Math.round(totalHours/members.length)+'h':'—';
    if(e4){ e4.textContent=pending+'건'; e4.style.color=pending>0?'#ef4444':'#22c55e'; }

  }).catch(function(e){ console.error('급여 로딩 오류:', e); });
}

// 지급 처리
function _filoPayslipProcess(memberId, did, ym) {
  if(!confirm('지급 처리하시겠어요?')) return;
  firebase.firestore().collection('payroll_records').add({
    dealerId:did, memberId:memberId, ym:ym,
    status:'paid', paidAt:new Date().toISOString(),
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){
    _filoToast('지급 처리됐어요!');
    _filoPayslipLoad(did, ym);
  }).catch(function(e){ _filoToast('오류: '+e.message); });
}

function _filoPayslipFilter(did){ _filoToast('필터 기능 준비 중'); }
function _filoPayslipExcel(){ _filoToast('엑셀 다운로드 준비 중'); }
function _filoPayslipGenerate(did){ _filoToast('명세서 자동 생성 준비 중'); }

/* 급여명세서 상세 보기 모달 (FILO 관리자용) */
function _filoPayslipModal(memberId, ym){
 var db=firebase.firestore();
 var did=_CU.dealerId;
 var from=ym+'-01',to=ym+'-31';
 Promise.all([
  db.collection('members').doc(memberId).get(),
  db.collection('members').where('dealerId','==',did).get(),
  db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get()
 ]).then(function(res){
  var doc=res[0],allMem=res[1],attSnap=res[2];
  if(!doc.exists)return _filoToast('직원 정보를 찾을 수 없습니다');
  var m=doc.data();m._id=doc.id;
  var empCnt=allMem.size;

  /* 출퇴근 파싱 (memberId로 JS 필터) */
  var ins=[],outs=[],breaks=[];
  attSnap.forEach(function(d){
   var dd=d.data();
   if(dd.memberId!==memberId)return;
   if(dd.type==='in')ins.push(dd);
   else if(dd.type==='out')outs.push(dd);
   else breaks.push(dd);
  });
  ins.sort(function(a,b){return a.time>b.time?1:-1;});
  outs.sort(function(a,b){return a.time>b.time?1:-1;});
  var days=ins.length;

  /* 근무시간 계산 (FILO 자체 로직) */
  var totalMin=0,nightMin=0,overMin=0;
  var breakEnds=breaks.filter(function(b){return b.type==='break_end';});
  var breakStarts=breaks.filter(function(b){return b.type==='break_start';});
  for(var i=0;i<Math.min(ins.length,outs.length);i++){
   var inT=new Date(ins[i].time),outT=new Date(outs[i].time);
   var diff=(outT-inT)/60000;
   if(diff<=0||diff>720)continue;
   var shiftBreak=0;
   for(var bj=0;bj<Math.min(breakStarts.length,breakEnds.length);bj++){
    var bs=new Date(breakStarts[bj].time),be=new Date(breakEnds[bj].time);
    if(bs>=inT&&be<=outT){var bd=(be-bs)/60000;if(bd>0&&bd<240)shiftBreak+=bd;}
   }
   var br=shiftBreak>0?shiftBreak:(diff>=480?60:diff>=240?30:0);
   var net=Math.max(0,diff-br);totalMin+=net;
   var ns=new Date(inT);ns.setHours(22,0,0,0);
   if(outT>ns)nightMin+=(outT-Math.max(inT,ns))/60000;
   if(net>480)overMin+=net-480;
  }
  var totalHour=totalMin/60;
  var nightHour=Math.round(nightMin/60*10)/10;
  var overHour=Math.round(overMin/60*10)/10;
  var monthlyHours=Math.round(totalHour);

  /* 급여 계산 */
  var MIN_WAGE=10320;
  var basePay=0,weeklyHoliday=0,nightPay=0,overPay=0;
  if(m.payType==='monthly'){
   basePay=(m.monthlySalary||0)+(m.mealAllowance||0)+(m.transportAllowance||0);
   if(empCnt>=5){var hw=Math.round((m.monthlySalary||0)/209);nightPay=Math.round(nightHour*hw*0.5);overPay=Math.round(overHour*hw*0.5);}
  }else{
   var wage=m.hourlyWage||MIN_WAGE;
   basePay=Math.round(totalHour*wage);
   var weekH=totalHour/4;
   if(weekH>=15)weeklyHoliday=Math.round((weekH/40)*8*wage);
   nightPay=Math.round(nightHour*wage*0.5);
   if(empCnt>=5)overPay=Math.round(overHour*wage*0.5);
  }
  var grossSalary=basePay+weeklyHoliday+nightPay+overPay;

  /* 공제 계산 */
  var INS={pension:0.045,health:0.03545,longcare:0.03545*0.1281,employ:0.009};
  var insTotal=0,insItems={};
  var insured=m.payType==='monthly'||monthlyHours>=60;
  if(insured&&m.insuranceType==='4대보험'){
   insItems.pension=Math.floor(grossSalary*INS.pension);
   insItems.health=Math.floor(grossSalary*INS.health);
   insItems.longcare=Math.floor(insItems.health*INS.longcare);
   insItems.employ=Math.floor(grossSalary*INS.employ);
   insTotal=Object.values(insItems).reduce(function(s,v){return s+v;},0);
  }else if(m.insuranceType==='3.3%'){
   insTotal=Math.floor(grossSalary*0.033);
  }
  var taxBase=grossSalary-insTotal;
  var incomeTax=taxBase<1060000?0:taxBase<2000000?Math.floor(taxBase*0.01):taxBase<3000000?Math.floor(taxBase*0.015):Math.floor(taxBase*0.02);
  var localTax=Math.floor(incomeTax*0.1);
  var taxTotal=incomeTax+localTax;
  var netSalary=grossSalary-insTotal-taxTotal;
  var totalDeduct=insTotal+taxTotal;

  var partLabel={'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||(m.part||'');
  var payTypeLabel=m.payType==='monthly'?'월급':m.payType==='daily'?'일급':'시급';
  var insureLabel={'4대보험':'4대보험','3.3%':'3.3% 사업소득세','none':'미가입'}[m.insuranceType]||(m.insuranceType||'');
  var today=new Date().toISOString().slice(0,10);
  var ymLabel=ym.replace('-','년 ')+'월';

  function _row(label,val,type,sub){
   if(!val&&val!==0)return '';
   var color=type==='add'?'#22c55e':type==='deduct'?'#ef4444':'var(--tx)';
   var sign=type==='add'?'+ ':type==='deduct'?'- ':'';
   return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px">'+
    '<span style="color:var(--t2)">'+(sub?'&nbsp;&nbsp;&nbsp;':'')+label+'</span>'+
    '<span style="font-weight:700;color:'+color+'">'+sign+'₩'+val.toLocaleString()+'</span></div>';
  }
  function _sec(label){
   return '<div style="font-size:10px;font-weight:800;letter-spacing:1px;color:var(--t3);margin:14px 0 6px;padding-bottom:4px;border-bottom:2px solid var(--bd)">'+label+'</div>';
  }

  var insBlock='';
  if(m.insuranceType==='4대보험'&&insItems.pension){
   insBlock+=_row('국민연금',insItems.pension,'deduct',true);
   insBlock+=_row('건강보험',insItems.health,'deduct',true);
   insBlock+=_row('장기요양',insItems.longcare,'deduct',true);
   insBlock+=_row('고용보험',insItems.employ,'deduct',true);
  }else if(insTotal){
   insBlock+=_row(insureLabel,insTotal,'deduct',true);
  }
  if(incomeTax)insBlock+=_row('소득세',incomeTax,'deduct',true);
  if(localTax) insBlock+=_row('지방소득세',localTax,'deduct',true);

  var html=
   '<div style="text-align:center;padding-bottom:14px;border-bottom:1px solid var(--bd);margin-bottom:4px">'+
   '<div style="font-size:10px;color:var(--t3);letter-spacing:2px;margin-bottom:4px">MBTICO · 급여명세서</div>'+
   '<div style="font-size:22px;font-weight:900">'+m.name+'</div>'+
   '<div style="font-size:12px;color:var(--t2);margin-top:3px">'+partLabel+(payTypeLabel?' · '+payTypeLabel:'')+'</div>'+
   '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+ymLabel+' | 발행일 '+today+'</div>'+
   '</div>'+
   _sec('근무 현황')+
   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:4px">'+
   '<div style="background:var(--s3);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:10px;color:var(--t3)">출근일</div><div style="font-size:16px;font-weight:900">'+days+'일</div></div>'+
   '<div style="background:var(--s3);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:10px;color:var(--t3)">총근무</div><div style="font-size:16px;font-weight:900;color:var(--br)">'+monthlyHours+'h</div></div>'+
   (nightHour>0?'<div style="background:var(--s3);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:10px;color:var(--t3)">야간</div><div style="font-size:16px;font-weight:900;color:#a78bfa">'+nightHour+'h</div></div>':'')+
   (overHour>0?'<div style="background:var(--s3);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:10px;color:var(--t3)">연장</div><div style="font-size:16px;font-weight:900;color:#f59e0b">'+overHour+'h</div></div>':'')+
   '</div>'+
   _sec('지급 내역')+
   _row('기본급',basePay,'add')+
   (weeklyHoliday?_row('주휴수당',weeklyHoliday,'add'):'')+
   (nightPay?_row('야간수당 ('+nightHour+'h)',nightPay,'add'):'')+
   (overPay?_row('연장수당 ('+overHour+'h)',overPay,'add'):'')+
   '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:800;border-top:2px solid var(--bd);margin-top:4px">'+
   '<span>총 지급액</span><span>₩'+grossSalary.toLocaleString()+'</span></div>'+
   (totalDeduct>0?
    _sec('공제 내역')+insBlock+
    '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:800;border-top:2px solid var(--bd);margin-top:4px;color:#ef4444">'+
    '<span>총 공제액</span><span>- ₩'+totalDeduct.toLocaleString()+'</span></div>'
   :'')+
   '<div style="background:linear-gradient(135deg,rgba(201,168,76,.15),rgba(201,168,76,.05));border:1px solid rgba(201,168,76,.3);border-radius:12px;padding:14px 16px;margin:14px 0;text-align:center">'+
   '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">실수령액</div>'+
   '<div style="font-size:28px;font-weight:900;color:#c9a84c">₩'+netSalary.toLocaleString()+'</div>'+
   '</div>'+
   '<div style="font-size:10px;color:var(--t3);text-align:center">2026 근로기준법 기준 자동 계산 | '+insureLabel+'</div>';

  var mo=document.createElement('div');mo.className='mo';
  var box=document.createElement('div');box.className='mo-box';
  box.style.cssText='padding:20px 20px 16px;max-height:90vh;overflow-y:auto';
  box.innerHTML=html+'<button class="btn btn-ghost" style="width:100%;margin-top:14px" onclick="this.closest(\'.mo\').remove()">닫기</button>';
  mo.appendChild(box);mo.onclick=function(e){if(e.target===mo)mo.remove();};
  document.body.appendChild(mo);
 }).catch(function(e){_filoToast('오류: '+e.message);});
}

// ── 토스페이먼츠 POS 결제 ──────────────────────────────────────────
function _filoTossPosPay(total, parentMo){
 if(!total||total<=0){_filoToast('결제 금액 없음');return;}
 // 토스 SDK 로드
 function _doToss(clientKey){
  if(!clientKey){_filoToast('토스페이먼츠 키 미설정');return;}
  var orderId='FILO-'+(_CU&&(_CU.dealerId||_CU.uid)||'').slice(0,6)+'-'+Date.now();
  var storeName=(_cachedCompanyDoc&&(_cachedCompanyDoc.companyName||_cachedCompanyDoc.name))||'FILO 매장';
  if(typeof TossPayments==='undefined'){
   var s=document.createElement('script');
   s.src='https://js.tosspayments.com/v1/payment';
   s.onload=function(){_launchToss(clientKey,orderId,storeName,total,parentMo);};
   document.head.appendChild(s);
  } else {
   _launchToss(clientKey,orderId,storeName,total,parentMo);
  }
 }
 // 키 로딩
 if(window._filoTossClientKey){
  _doToss(window._filoTossClientKey);
 } else {
  fetch('/api/toss-client-key').then(function(r){return r.json();}).then(function(d){
   window._filoTossClientKey=d.clientKey||'';
   _doToss(window._filoTossClientKey);
  }).catch(function(){_filoToast('토스 설정 로딩 실패');});
 }
}

function _launchToss(clientKey,orderId,storeName,total,parentMo){
 var tossPayments=TossPayments(clientKey);
 // 결제 성공/실패 메시지 수신
 var handler=function(e){
  if(!e.data||!e.data.type)return;
  if(e.data.type==='toss_success'){
   window.removeEventListener('message',handler);
   if(parentMo)parentMo.remove();
   document.querySelectorAll('.mo').forEach(function(el){el.remove();});
   var methodLabel='토스페이먼츠 '+(e.data.method||'카드');
   _filoConfirmPay('toss',methodLabel);
   _filoToast('토스 결제 완료!');
  } else if(e.data.type==='toss_fail'){
   window.removeEventListener('message',handler);
   _filoToast('결제 취소: '+(e.data.reason||''));
  }
 };
 window.addEventListener('message',handler);
 tossPayments.requestPayment('카드',{
  amount:total,
  orderId:orderId,
  orderName:'FILO POS 결제',
  customerName:storeName,
  successUrl:location.origin+'/toss/pos-success',
  failUrl:location.origin+'/toss/pos-fail'
 }).catch(function(e){
  window.removeEventListener('message',handler);
  if(e.code!=='USER_CANCEL')_filoToast('결제 오류: '+e.message);
 });
}
