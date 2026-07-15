/**
 * @module      filo-staff.js
 * ══════════════════════════════════════════════════════
 * 역할: 직원 QR 출퇴근 · 출퇴근 대시보드 · 급여 · 명세서 · 근무표
 *
 * 저장 컬렉션:
 *   filo_staffs      — 직원 정보 (시급, 4대보험)
 *   filo_attendances — QR 출퇴근 기록
 *   payslips         — 급여명세서
 *
 * 의존: filo-common.js, filo-payment.js (QR 공통 함수)
 * ⚠️ 2026-07-15 리팩토링:
 *   _filoEnsureQR / _filoQRSave / _filoQRDownload → filo-payment.js 로 이동
 *   _filoConfirmPay → filo-payment.js (0원체크 + FCM 버전)
 *   _filoPageMembership → filo-common.js 로 이동
 * ══════════════════════════════════════════════════════
 */
// 의존성: filo-common.js
// 관련 컬렉션: members, attendance, payslips, roster_week, filo_memberships
// ⚠️ 2026-07-12 filo-common.js에서 분리됨
//   포함: _filoPageMembers, _filoLoadMembers, _filoPay, _filoConfirmPay,
//          _calcWeeklyAllowance, _calcDeduction, _filoQRSave, _filoEnsureQR
function _filoPageStaffQR(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="slide-up" style="max-width:700px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:4px">👤 직원 동적 QR</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:16px">30초마다 자동 변경 · 복사 불가 · 출근/퇴근 구분</div>'+

 /* 관리자 뷰: 직원별 QR */
 '<div class="card" style="margin-bottom:12px">'+
 '<div style="font-size:12px;font-weight:800;color:var(--t3);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">출퇴근 통합 QR (전체 직원 공용)</div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
 /* 출근 QR */
 '<div style="text-align:center;padding:16px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:14px">'+
 '<div style="font-size:12px;font-weight:800;color:#22c55e;margin-bottom:10px">🟢 출근 QR</div>'+
 '<div id="qr-checkin" style="background:#fff;border-radius:10px;padding:8px;display:inline-block;margin-bottom:8px"></div>'+
 '<div id="qr-checkin-timer" style="font-size:10px;color:var(--t3)">갱신 대기중...</div>'+
 '</div>'+
 /* 퇴근 QR */
 '<div style="text-align:center;padding:16px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:14px">'+
 '<div style="font-size:12px;font-weight:800;color:#ef4444;margin-bottom:10px">🔴 퇴근 QR</div>'+
 '<div id="qr-checkout" style="background:#fff;border-radius:10px;padding:8px;display:inline-block;margin-bottom:8px"></div>'+
 '<div id="qr-checkout-timer" style="font-size:10px;color:var(--t3)">갱신 대기중...</div>'+
 '</div>'+
 '</div>'+
 /* 휴식 QR */
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">'+
 '<div style="text-align:center;padding:12px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:12px">'+
 '<div style="font-size:11px;font-weight:800;color:#f59e0b;margin-bottom:6px">☕ 휴식 시작</div>'+
 '<div id="qr-break-start" style="background:#fff;border-radius:8px;padding:5px;display:inline-block;margin-bottom:4px"></div>'+
 '<div id="qr-break-timer" style="font-size:9px;color:var(--t3)">갱신 대기중...</div>'+
 '</div>'+
 '<div style="text-align:center;padding:12px;background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.2);border-radius:12px">'+
 '<div style="font-size:11px;font-weight:800;color:#6366f1;margin-bottom:6px">🏃 휴식 종료</div>'+
 '<div id="qr-break-end" style="background:#fff;border-radius:8px;padding:5px;display:inline-block;margin-bottom:4px"></div>'+
 '<div style="font-size:9px;color:var(--t3)">위와 동일 갱신</div>'+
 '</div>'+
 '</div>'+
 '<div style="margin-top:10px;padding:8px 12px;background:rgba(124,58,237,.06);border-radius:8px;font-size:10px;color:var(--t3)">'+
 '💡 직원이 본인 스마트폰으로 스캔 → 이름 확인 후 출퇴근 자동 기록<br>30초마다 코드 변경으로 대리 출퇴근 방지</div>'+
 '</div>'+

 /* 직원별 개인 QR */
 '<div class="card">'+
 '<div style="font-size:12px;font-weight:800;color:var(--t3);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">직원별 개인 QR</div>'+
 '<div id="staff-qr-list"><div style="text-align:center;padding:20px;color:var(--t3)">⏳ 로딩 중...</div></div>'+
 '</div></div>';

 _filoRenderStaffQRs(did);
 _filoStartDynamicQR(did);
}

var _dynamicQRTimer=null;
function _filoRenderStaffQRs(did){
 _db.collection('filo_customers').where('dealerId','==',did).get().then(function(snap){
  var list=document.getElementById('staff-qr-list');
  if(!list)return;
  if(snap.empty){list.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">직원 목록이 없습니다</div>';return;}
  var ts=Math.floor(Date.now()/30000);
  list.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">'+
  snap.docs.map(function(doc){
   var d=doc.data();
   var uid=doc.id;
   /* 직원 개인 QR: did + uid + 타임스탬프 */
   var url='https://filo.ai.kr/qr?did='+did+'&uid='+uid+'&t='+ts;
   return '<div style="text-align:center;padding:12px;background:var(--b3);border-radius:12px;border:1px solid var(--bd)">'+
   '<div style="width:32px;height:32px;border-radius:50%;background:var(--br);display:inline-flex;align-items:center;justify-content:center;font-size:14px;margin-bottom:6px">'+
   esc((d.name||'?').slice(0,1))+'</div>'+
   '<div style="font-size:11px;font-weight:800;margin-bottom:6px">'+esc(d.name||uid)+'</div>'+
   '<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data='+encodeURIComponent(url)+'" style="width:100px;height:100px;border-radius:6px;background:#fff;padding:4px">'+
   '<div style="font-size:9px;color:var(--t3);margin-top:4px">개인 출퇴근 QR</div>'+
   '</div>';
  }).join('')+'</div>';
 });
}

/* ══════════════════════════════════════════
   🎁 회원 QR 페이지
   회원 가입/적립/할인 QR
   ══════════════════════════════════════════ */
function _filoPageAttendance(el){
 var did=_CU.dealerId||_CU.uid;
 var today=new Date().toISOString().slice(0,10);
 var qrUrl='https://donway.ai.kr/qr?did='+did+'&action=checkin';
 var qrImg='https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+encodeURIComponent(qrUrl);
 el.innerHTML='<div class="slide-up" style="max-width:700px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">🔐 QR 출퇴근</div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'+
 '<div class="qr-card">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:4px">출근 QR</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">직원이 스캔하면 출근 체크</div>'+
 '<div class="qr-wrap"><img src="'+qrImg+'" style="width:180px;height:180px"></div>'+
 '<div style="font-size:10px;color:var(--t3);margin-top:8px">'+today+'</div>'+
 '<button onclick="_filoManualCheckin()" class="btn btn-brand btn-sm" style="margin-top:10px;width:100%">수동 출근 체크</button>'+
 '</div>'+
 '<div class="qr-card" style="text-align:left">'+
 '<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">'+
 '<div class="live-dot"></div>'+
 '<div style="font-size:13px;font-weight:800">오늘 출퇴근 현황</div></div>'+
 '<div id="attend-today" style="max-height:280px;overflow-y:auto">'+
 '<div style="text-align:center;padding:20px;color:var(--t3)">⏳</div></div>'+
 '</div></div>'+
 '<div id="manual-checkin" style="display:none" class="card">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:10px">수동 출퇴근 체크</div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
 '<div class="fg"><label>직원 선택</label>'+
 '<select id="mc-member" style="width:100%;padding:8px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px">'+
 '<option value="">선택</option></select></div>'+
 '<div class="fg"><label>유형</label>'+
 '<select id="mc-type" style="width:100%;padding:8px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px">'+
 '<option value="in">출근</option><option value="out">퇴근</option></select></div></div>'+
 '<div class="fg"><label>시각</label><input id="mc-time" type="datetime-local" style="width:100%;padding:8px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px"></div>'+
 '<button onclick="_filoDoManualCheckin()" class="btn btn-brand" style="width:100%">체크인 저장</button></div>';

 var now=new Date();
 var localISO=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
 var mcTime=document.getElementById('mc-time');
 if(mcTime)mcTime.value=localISO;

 _db.collection('members').where('dealerId','==',did).orderBy('name').get()
 .then(function(snap){
 var sel=document.getElementById('mc-member');if(!sel)return;
 snap.forEach(function(doc){
 var opt=document.createElement('option');
 opt.value=doc.id;opt.textContent=doc.data().name||doc.id;
 sel.appendChild(opt);
 });
 }).catch(function(){});

 if(_attendUnsub)_attendUnsub();
 _attendUnsub=_db.collection('attendance')
 .where('dealerId','==',did)
 .where('date','==',today)
 .orderBy('time','desc')
 .onSnapshot(function(snap){
 var el2=document.getElementById('attend-today');if(!el2)return;
 if(snap.empty){el2.innerHTML='<div style="text-align:center;padding:16px;color:var(--t3);font-size:12px">오늘 기록 없음</div>';return;}
 el2.innerHTML=snap.docs.map(function(doc){
 var d=doc.data();
 var isIn=d.type==='in';
 var time=(d.time||'').slice(11,16);
 return '<div class="attend-row">'+
 '<div class="attend-dot '+(isIn?'dot-in':'dot-out')+'"></div>'+
 '<div style="flex:1">'+
 '<div style="font-size:13px;font-weight:700">'+esc(d.memberName||d.memberId||'')+'</div>'+
 '<div style="font-size:10px;color:var(--t3)">'+(isIn?'출근':'퇴근')+'</div></div>'+
 '<div style="font-size:13px;font-weight:800;color:'+(isIn?'#22c55e':'#94a3b8')+'">'+time+'</div></div>';
 }).join('');
 },function(){});
}

function _filoPageAttendDash(el){
 var did=_CU.dealerId||_CU.uid;
 var today=new Date().toISOString().slice(0,10);
 el.innerHTML='<div class="slide-up" style="max-width:800px;margin:0 auto">'+
 '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">'+
 '<div class="live-dot"></div>'+
 '<div style="font-size:17px;font-weight:900">출퇴근 현황</div>'+
 '<div style="font-size:12px;color:var(--t3);margin-left:4px">실시간</div></div>'+
 '<div style="margin-bottom:14px">'+
 '<input type="date" id="ad-date" value="'+today+'" onchange="_filoLoadAttendDash()" '+
 'style="padding:8px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px">'+
 '</div>'+
 '<div id="ad-summary" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px"></div>'+
 '<div id="ad-list"></div></div>';
 _filoLoadAttendDash();
}

function _filoLoadAttendDash(){
 var did=_CU.dealerId||_CU.uid;
 var dateEl=document.getElementById('ad-date');
 var date=dateEl?dateEl.value:new Date().toISOString().slice(0,10);
 if(_attendUnsub)_attendUnsub();
 _attendUnsub=_db.collection('attendance')
 .where('dealerId','==',did).where('date','==',date)
 .orderBy('time','asc')
 .onSnapshot(function(snap){
 var records=[];
 snap.forEach(function(doc){records.push(Object.assign({_id:doc.id},doc.data()));});
 var memberMap={};
 records.forEach(function(r){
 if(!memberMap[r.memberId])memberMap[r.memberId]={name:r.memberName||r.memberId,ins:[],outs:[],workMin:0};
 if(r.type==='in')memberMap[r.memberId].ins.push(r.time);
 else memberMap[r.memberId].outs.push(r.time);
 });
 Object.values(memberMap).forEach(function(m){
 m.ins.sort();m.outs.sort();
 var total=0;
 for(var i=0;i<Math.min(m.ins.length,m.outs.length);i++){
 total+=(new Date(m.outs[i])-new Date(m.ins[i]))/60000;
 }
 m.workMin=Math.max(0,Math.round(total));
 m.status=m.ins.length>m.outs.length?'in':'out';
 m.lastTime=(m.status==='in'?m.ins:m.outs).slice(-1)[0]||'';
 });
 var members=Object.values(memberMap);
 var inCount=members.filter(function(m){return m.status==='in';}).length;
 var outCount=members.filter(function(m){return m.status==='out'&&m.ins.length;}).length;
 var totalMin=members.reduce(function(s,m){return s+m.workMin;},0);
 var sum=document.getElementById('ad-summary');
 if(sum)sum.innerHTML=[
 {label:'현재 출근',val:inCount+'명',color:'#22c55e',icon:'🟢'},
 {label:'퇴근 완료',val:outCount+'명',color:'#94a3b8',icon:'⚪'},
 {label:'총 근무',val:Math.floor(totalMin/60)+'h '+totalMin%60+'m',color:'#a78bfa',icon:'⏱'},
 ].map(function(s,i){
 return '<div class="stat-card slide-up stagger-'+(i+1)+'">'+
 '<div style="font-size:20px;margin-bottom:6px">'+s.icon+'</div>'+
 '<div style="font-size:22px;font-weight:900;color:'+s.color+'">'+s.val+'</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+s.label+'</div></div>';
 }).join('');
 var list=document.getElementById('ad-list');
 if(!list)return;
 if(!members.length){list.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--t3)">기록 없음</div>';return;}
 list.innerHTML=members.map(function(m,i){
 var inTime=m.ins[0]?(new Date(m.ins[0])).toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):'--:--';
 var outTime=m.outs.slice(-1)[0]?(new Date(m.outs.slice(-1)[0])).toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):'--:--';
 return '<div class="pay-card slide-up stagger-'+Math.min(i+1,4)+'">'+
 '<div style="display:flex;align-items:center;gap:10px">'+
 '<div class="attend-dot '+(m.status==='in'?'dot-in':'dot-out')+'"></div>'+
 '<div><div style="font-size:13px;font-weight:800">'+esc(m.name)+'</div>'+
 '<div style="font-size:11px;color:var(--t3)">출근 '+inTime+' · 퇴근 '+outTime+'</div></div></div>'+
 '<div style="text-align:right">'+
 '<div style="font-size:14px;font-weight:900;color:#a78bfa">'+
 (m.workMin>0?Math.floor(m.workMin/60)+'h '+m.workMin%60+'m':m.status==='in'?'근무중':'--')+'</div>'+
 '<div style="font-size:10px;color:var(--t3)">'+(m.status==='in'?'🟢 출근중':'⚪ 퇴근')+'</div></div></div>';
 }).join('');
 },function(){});
}

function _filoPagePayroll(el){
 var did=_CU.dealerId||_CU.uid;
 var now=new Date();
 var ym=now.toISOString().slice(0,7);
 el.innerHTML='<div class="slide-up" style="max-width:860px;margin:0 auto">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
 '<div style="font-size:17px;font-weight:900">💼 급여 현황</div>'+
 '<div style="display:flex;gap:8px;align-items:center">'+
 '<select id="pay-ym" onchange="_filoLoadPayroll()" style="padding:6px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px">'+
 (function(){var opts='';for(var i=0;i<6;i++){var d=new Date(now.getFullYear(),now.getMonth()-i,1);var v=d.toISOString().slice(0,7);opts+='<option value="'+v+'"'+(i===0?' selected':'')+'>'+v+'</option>';}return opts;})()+'</select>'+
 '<button onclick="_filoPayrollSettle()" style="padding:6px 12px;background:var(--br);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">📨 명세서 발송</button>'+
 '</div></div>'+
 '<!-- 출근중 실시간 섹션 -->'+
 '<div id="pay-live" style="margin-bottom:14px"></div>'+
 '<!-- 요약 -->'+
 '<div id="pay-summary" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px"></div>'+
 '<!-- 고용유형 탭 -->'+
 '<div style="display:flex;gap:6px;margin-bottom:12px">'+
 ['전체','시급','일급','월급'].map(function(t,i){
  return '<button id="pwt-'+i+'" onclick="_filoPwTab('+i+')" style="padding:5px 14px;border:none;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;background:'+(i===0?'var(--br)':'var(--b3)')+';color:'+(i===0?'#fff':'var(--t2)')+'">'+t+'</button>';
 }).join('')+
 '</div>'+
 '<div id="pay-list"></div></div>';
 _filoLoadPayroll();
 _filoStartLiveTicker();
}

/* ── 실시간 출근중 티커 ── */
var _liveTickerTimer=null;
function _filoLoadPayroll(){
 var did=_CU.dealerId||_CU.uid;
 var ymEl=document.getElementById('pay-ym');
 var ym=ymEl?ymEl.value:new Date().toISOString().slice(0,7);
 var startDate=ym+'-01';
 var endDate=ym+'-31';
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',startDate).where('date','<=',endDate).get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(results){
  var attendSnap=results[0],memberSnap=results[1];
  var memberMap={};
  memberSnap.forEach(function(doc){memberMap[doc.id]=Object.assign({_id:doc.id},doc.data());});
  var payMap={};
  attendSnap.forEach(function(doc){
   var d=doc.data();
   var mid=d.memberId;
   if(!payMap[mid])payMap[mid]={memberId:mid,name:d.memberName||mid,workMin:0,days:new Set(),ins:[],outs:[]};
   if(d.type==='in')payMap[mid].ins.push({time:d.time,date:d.date});
   else payMap[mid].outs.push({time:d.time,date:d.date});
  });
  Object.values(payMap).forEach(function(p){
   p.ins.sort(function(a,b){return a.time>b.time?1:-1;});
   p.outs.sort(function(a,b){return a.time>b.time?1:-1;});
   var total=0;
   for(var i=0;i<Math.min(p.ins.length,p.outs.length);i++){
    var diff=(new Date(p.outs[i].time)-new Date(p.ins[i].time))/60000;
    if(diff>0&&diff<720){total+=diff;p.days.add(p.ins[i].date);}
   }
   p.workMin=Math.round(total);
   p.workHour=p.workMin/60;
   p.dayCount=p.days.size;
   var member=Object.values(memberMap).find(function(m){return m._id===p.memberId||m.name===p.name;})||{};
   p.wage=member.wage||0;
   p.wageType=member.wageType||'hourly';   /* hourly/daily/monthly */
   p.empType=member.empType||'part';        /* part/full/monthly */
   /* 기본급 계산 */
   if(p.wageType==='monthly'){p.basePay=p.wage;}
   else if(p.wageType==='daily'){p.basePay=Math.round(p.dayCount*p.wage);}
   else{p.basePay=Math.round(p.workHour*p.wage);}
   /* 주휴수당 */
   p.weeklyAllowance=_calcWeeklyAllowance(p.ins,p.outs,p.wage,p.wageType);
   /* 총지급액 */
   p.gross=p.basePay+p.weeklyAllowance;
   /* 공제 */
   var ded=_calcDeduction(p.gross,p.empType);
   p.deduction=ded.total;p.tax=ded.tax;p.insurance=ded.insurance;
   /* 실수령액 */
   p.netPay=p.gross-p.deduction;
  });
  _payrollData=Object.values(payMap);
  _filoRenderPaySummary();
  _filoRenderPayList();
 }).catch(function(e){
  var list=document.getElementById('pay-list');
  if(list)list.innerHTML='<div style="color:var(--red);padding:20px">'+e.message+'</div>';
 });
}

function _filoPayrollSettle(){
 if(!_payrollData.length){_filoToast('급여 데이터가 없습니다');return;}
 var ymEl=document.getElementById('pay-ym');
 var ym=ymEl?ymEl.value:'';
 _filoShowModal('<div style="padding:24px">'+
 '<div style="font-size:16px;font-weight:900;margin-bottom:8px">📨 급여명세서 발송</div>'+
 '<div style="font-size:13px;color:var(--t3);margin-bottom:16px">'+ym+'월 급여명세서를 카카오 알림톡으로 발송합니다.<br>총 '+_payrollData.length+'명에게 발송됩니다.</div>'+
 '<div style="display:flex;gap:8px">'+
 '<button onclick="document.querySelector(\'.mo\').remove()" style="flex:1;padding:10px;background:var(--b3);border:none;border-radius:8px;color:var(--t2);cursor:pointer">취소</button>'+
 '<button onclick="_filoDoSendPayslip(\''+ym+'\')" style="flex:1;padding:10px;background:var(--br);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer">발송</button>'+
 '</div></div>');
}

function _filoPageRoster(el){
 el.innerHTML='<div class="slide-up card" style="text-align:center;padding:40px">'+
 '<div style="font-size:40px;margin-bottom:12px">🗓</div>'+
 '<div style="font-size:16px;font-weight:800;margin-bottom:6px">근무표</div>'+
 '<div style="font-size:12px;color:var(--t3)">주간 근무표 기능 곧 추가됩니다</div></div>';
}

