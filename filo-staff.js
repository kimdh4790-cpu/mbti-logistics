// filo-staff.js - 직원QR, 출퇴근, 급여, 회원권
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
function _filoPageMembers(el){
 var did=_CU.dealerId||_CU.uid;
 var isSA=_CU.role==='superadmin'||SUPER_ADMIN_EMAILS.indexOf(_CU.email||'')>=0;
 el.innerHTML='<div class="slide-up" style="max-width:700px;margin:0 auto">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
 '<div style="font-size:17px;font-weight:900">👤 직원 관리</div>'+
 '<button onclick="_filoShowAddMember()" class="btn btn-brand btn-sm">+ 직원 추가</button></div>'+
 '<div id="member-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳</div></div></div>';
 _filoLoadMembers(did);
}
function _filoLoadMembers(did){
 _db.collection('members').where('dealerId','==',did).orderBy('name').get()
 .then(function(snap){
 var el=document.getElementById('member-list');if(!el)return;
 if(snap.empty){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)"><div style="font-size:32px;margin-bottom:8px">👥</div><div>직원이 없습니다</div><button onclick="_filoShowAddMember()" class="btn btn-brand" style="margin-top:12px;padding:10px 24px;width:auto">첫 직원 추가</button></div>';return;}
 el.innerHTML=snap.docs.map(function(doc,idx){
 var d=doc.data();
 var roleLabel={'admin':'관리자','staff':'직원','part':'알바'}[d.role]||'직원';
 var roleColor={'admin':'#7c3aed','staff':'#0891b2','part':'#f59e0b'}[d.role]||'#94a3b8';
 var initials=(d.name||'?').slice(0,1);
 return '<div class="member-card slide-up stagger-'+Math.min(idx+1,4)+'" data-id="'+doc.id+'" style="cursor:pointer">'+
 '<div class="avatar">'+initials+'</div>'+
 '<div style="flex:1">'+
 '<div style="font-size:14px;font-weight:800">'+esc(d.name||'')+'</div>'+
 '<div style="font-size:11px;color:var(--t3)">'+(d.phone||'')+(d.dept?' · '+d.dept:'')+'</div>'+
 '</div>'+
 '<div style="text-align:right">'+
 '<div style="font-size:11px;font-weight:700;color:'+roleColor+';background:'+roleColor+'22;padding:2px 8px;border-radius:100px">'+roleLabel+'</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+(d.wage?d.wage.toLocaleString()+'원':'시급 미설정')+'</div>'+
 '</div></div>';
 }).join('');
 }).catch(function(e){var el=document.getElementById('member-list');if(el)el.innerHTML='<div style="color:var(--red);padding:20px">'+e.message+'</div>';});
}
function _filoAddMember(){
 var did=_CU.dealerId||_CU.uid;
 var name=document.getElementById('nm-name').value.trim();
 var phone=document.getElementById('nm-phone').value.trim();
 var role=document.getElementById('nm-role').value;
 var wage=parseInt(document.getElementById('nm-wage').value)||0;
 var dept=document.getElementById('nm-dept').value.trim();
 if(!name){_filoToast('이름을 입력하세요');return;}
 _db.collection('members').add({
 dealerId:did,name:name,phone:phone,role:role,wage:wage,dept:dept,
 createdAt:new Date().toISOString(),is_active:true
 }).then(function(){
 document.querySelector('.mo')&&document.querySelector('.mo').remove();
 _filoToast('✅ '+name+' 추가 완료');
 _filoLoadMembers(did);
 }).catch(function(e){_filoToast('❌ '+e.message);});
}
function _filoShowMemberDetail(docId){
 _db.collection('members').doc(docId).get().then(function(snap){
 if(!snap.exists)return;
 var d=snap.data();
 var did=_CU.dealerId||_CU.uid;
 var html='<div style="padding:20px;max-width:400px;margin:0 auto">'+
 '<div style="text-align:center;margin-bottom:16px">'+
 '<div class="avatar" style="width:60px;height:60px;font-size:24px;margin:0 auto 8px">'+d.name.slice(0,1)+'</div>'+
 '<div style="font-size:17px;font-weight:900">'+esc(d.name)+'</div>'+
 '<div style="font-size:12px;color:var(--t3)">'+(d.dept||'')+'</div></div>'+
 '<div style="background:var(--b3);border-radius:12px;padding:14px;margin-bottom:14px">'+
 '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">전화번호</span><span style="font-size:13px;font-weight:700">'+(d.phone||'-')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">역할</span><span style="font-size:13px;font-weight:700">'+({'admin':'관리자','staff':'직원','part':'알바'}[d.role]||'직원')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:6px 0">'+
 '<span style="font-size:12px;color:var(--t3)">시급</span><span style="font-size:13px;font-weight:700">'+(d.wage?(d.wage.toLocaleString()+'원'):'-')+'</span></div></div>'+
 '<div style="display:flex;gap:8px">'+
 '<button onclick="this.closest(".mo").remove()" class="btn" style="flex:1;background:var(--b3)">닫기</button>'+
 '<button class="btn del-btn" data-id="'+docId+'" data-name="'+esc(d.name)+'" style="flex:1;background:var(--red);color:#fff">삭제</button></div></div>';
 _filoShowModal(html);
 });
}
function _filoDeleteMember(docId,name){
 if(!confirm(name+' 직원을 삭제하시겠습니까?'))return;
 var did=_CU.dealerId||_CU.uid;
 _db.collection('members').doc(docId).delete().then(function(){
 document.querySelector('.mo')&&document.querySelector('.mo').remove();
 _filoToast('✅ 삭제 완료');
 _filoLoadMembers(did);
 }).catch(function(e){_filoToast('❌ '+e.message);});
}
function _filoManualCheckin(){
 var mc=document.getElementById('manual-checkin');
 if(mc)mc.style.display=mc.style.display==='none'?'block':'none';
}
function _filoDoManualCheckin(){
 var did=_CU.dealerId||_CU.uid;
 var memberId=document.getElementById('mc-member').value;
 var type=document.getElementById('mc-type').value;
 var timeVal=document.getElementById('mc-time').value;
 if(!memberId){_filoToast('직원을 선택하세요');return;}
 if(!timeVal){_filoToast('시각을 입력하세요');return;}
 var memberSel=document.getElementById('mc-member');
 var memberName=memberSel.options[memberSel.selectedIndex].text;
 var dt=new Date(timeVal);
 _db.collection('attendance').add({
 dealerId:did,memberId:memberId,memberName:memberName,
 type:type,time:dt.toISOString(),date:dt.toISOString().slice(0,10),
 createdBy:_CU.name||_CU.userId||'',manual:true
 }).then(function(){
 _filoToast('✅ '+(type==='in'?'출근':'퇴근')+' 체크 완료');
 document.getElementById('manual-checkin').style.display='none';
 }).catch(function(e){_filoToast('❌ '+e.message);});
}
function _filoStartLiveTicker(){
 if(_liveTickerTimer)clearInterval(_liveTickerTimer);
 _filoRenderLive();
 _liveTickerTimer=setInterval(_filoRenderLive,30000);
}
function _filoRenderLive(){
 var did=_CU.dealerId||_CU.uid;
 var today=new Date().toISOString().slice(0,10);
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','==',today).where('type','==','in').get(),
  _db.collection('attendance').where('dealerId','==',did).where('date','==',today).where('type','==','out').get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(res){
  var insSnap=res[0],outsSnap=res[1],memSnap=res[2];
  var memMap={};
  memSnap.forEach(function(doc){memMap[doc.id]=doc.data();});
  var outSet={};
  outsSnap.forEach(function(doc){outSet[doc.data().memberId]=true;});
  var active=[];
  insSnap.forEach(function(doc){
   var d=doc.data();
   if(!outSet[d.memberId]){
    var mem=Object.values(memMap).find(function(m){return m.name===d.memberName;})||{};
    var inTime=new Date(d.time);
    var elapsedMin=Math.floor((Date.now()-inTime)/60000);
    var wage=mem.wage||0;
    var earned=Math.round(elapsedMin/60*wage);
    active.push({name:d.memberName||d.memberId,wage:wage,wageType:mem.wageType||'hourly',elapsedMin:elapsedMin,earned:earned,inTime:d.time});
   }
  });
  var liveEl=document.getElementById('pay-live');
  if(!liveEl)return;
  if(!active.length){liveEl.innerHTML='';return;}
  liveEl.innerHTML='<div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:12px;padding:12px 14px;margin-bottom:4px">'+
  '<div style="font-size:12px;font-weight:800;color:#22c55e;margin-bottom:8px">🟢 현재 출근 중 ('+active.length+'명)</div>'+
  active.map(function(a){
   var h=Math.floor(a.elapsedMin/60),m=a.elapsedMin%60;
   var wLabel=a.wageType==='daily'?'일급':'시급';
   return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(34,197,94,.1)">'+
   '<div><span style="font-size:13px;font-weight:800">'+esc(a.name)+'</span>'+
   '<span style="font-size:11px;color:var(--t3);margin-left:8px">'+wLabel+' '+a.wage.toLocaleString()+'원 · '+h+'h '+m+'m 근무중</span></div>'+
   '<div style="font-size:14px;font-weight:900;color:#22c55e">+₩'+a.earned.toLocaleString()+'</div></div>';
  }).join('')+
  '</div>';
 }).catch(function(){});
}
function _filoPwTab(idx){
 _pwTabIdx=idx;
 [0,1,2,3].forEach(function(i){
  var b=document.getElementById('pwt-'+i);
  if(b){b.style.background=i===idx?'var(--br)':'var(--b3)';b.style.color=i===idx?'#fff':'var(--t2)';}
 });
 _filoRenderPayList();
}
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
function _filoDoSendPayslip(ym){
 document.querySelector('.mo')&&document.querySelector('.mo').remove();
 _filoToast('📨 급여명세서 발송 기능은 준비 중입니다 (카카오 알림톡 연동 예정)');
}
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
function _filoConfirmPay(method, methodLabel){
 document.querySelector('.mo') && document.querySelector('.mo').remove();
 var did=_CU.dealerId||_CU.uid;
 var rawTotal=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var discount=window._posDiscount||0;
 var total=Math.max(0,rawTotal-discount);
 window._posDiscount=0; /* 결제 후 초기화 */
 var now=new Date();
 var items=_cartItems.map(function(c){return {id:c.id,name:c.name,price:c.price,qty:c.qty};});
 var tableId=window._selectedTableId||null;
 var tableName=window._selectedTableName||(tableId?'테이블 '+tableId:'카운터');
 var payType=window._posPayType||'postpay';
 window._posPayType='postpay';
 var saveData={
  dealerId:did,items:items,total:total,
  tableId:tableId,tableName:tableName,
  tableNum:tableId?parseInt(tableId):null,
  createdAt:now.toISOString(),date:now.toISOString().slice(0,10),
  type:'pos',payMethod:method,payType:payType,
  status:payType==='prepay'?'paid':'pending',
  createdBy:_CU.name||_CU.userId||''
 };
 // filo_sales에 저장
 _db.collection('filo_sales').add(saveData).then(function(ref){
  // 테이블 선택 시 filo_orders에도 저장 (테이블 현황 연동)
  if(tableId){
   _db.collection('filo_orders').add(Object.assign({},saveData,{
    type:'table',source:'pos'
   })).catch(function(){});
  }
  window._selectedTableId=null;window._selectedTableName=null;
  var ct=document.querySelector('.cart-panel div:first-child');if(ct)ct.textContent='🛒 주문 내역';
  if(payType==='postpay'){
   // 후불: 주문 접수 토스트만
   var tMsg=tableName&&tableName!=='카운터'?tableName+' ':'';
   _filoToast('✅ '+tMsg+'주문 접수됐습니다!');
   _cartClear();
  } else {
   // 선불: 영수증 출력
   _filoShowReceipt(ref.id, items, total, method, methodLabel, now);
   _cartClear();
  }
 }).catch(function(e){_filoToast('❌ '+e.message);});
}
function _filoQRSave(num,name){
 var el=document.getElementById('qr-'+num);
 if(!el)return;
 var img=el.querySelector('img');
 var canvas=el.querySelector('canvas');
 var src=img?img.src:(canvas?canvas.toDataURL('image/png'):'');
 if(!src){_filoToast('❌ QR 없음');return;}
 var a=document.createElement('a');
 a.download=name+'_QR.png';a.href=src;a.click();
 _filoToast('💾 '+name+' QR 저장됐습니다');
}
function _filoEnsureQR(cb){
 if(window.QRCode)return cb();
 /* 혹시 로드 안됐으면 동적 로드 */
 var s=document.createElement('script');
 s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
 s.onload=function(){setTimeout(cb,100);};
 document.head.appendChild(s);
}
function _filoQRDownload(num,name){
 var wrap=document.getElementById('qr-c-'+num);
 if(!wrap){_filoToast('❌ QR 없음');return;}
 var canvas=wrap.querySelector('canvas');
 var img=wrap.querySelector('img');
 var a=document.createElement('a');
 a.download=name+'_QR.png';
 if(canvas)a.href=canvas.toDataURL('image/png');
 else if(img)a.href=img.src;
 else{_filoToast('❌ QR 없음');return;}
 a.click();
 _filoToast('💾 '+name+' QR 저장됐습니다');
}
function _filoPageMembership(el){
 el.innerHTML='<div class="slide-up card" style="text-align:center;padding:40px">'+
 '<div style="font-size:40px;margin-bottom:12px">🎫</div>'+
 '<div style="font-size:16px;font-weight:800;margin-bottom:6px">회원권</div>'+
 '<div style="font-size:12px;color:var(--t3)">회원권 관리 기능 곧 추가됩니다</div></div>';
}
