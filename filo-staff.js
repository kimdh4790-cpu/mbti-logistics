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
 '<div style="font-size:17px;font-weight:900;margin-bottom:4px">직원 동적 QR</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:16px">30초마다 자동 변경 · 복사 불가 · 출근/퇴근 구분</div>'+

 /* 관리자 뷰: 직원별 QR */
 '<div class="card" style="margin-bottom:12px">'+
 '<div style="font-size:12px;font-weight:800;color:var(--t3);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">출퇴근 통합 QR (전체 직원 공용)</div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
 /* 출근 QR */
 '<div style="text-align:center;padding:16px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:14px">'+
 '<div style="font-size:12px;font-weight:800;color:#22c55e;margin-bottom:10px">● 출근 QR</div>'+
 '<div id="qr-checkin" style="background:#fff;border-radius:10px;padding:8px;display:inline-block;margin-bottom:8px"></div>'+
 '<div id="qr-checkin-timer" style="font-size:10px;color:var(--t3)">갱신 대기중...</div>'+
 '</div>'+
 /* 퇴근 QR */
 '<div style="text-align:center;padding:16px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:14px">'+
 '<div style="font-size:12px;font-weight:800;color:#ef4444;margin-bottom:10px">● 퇴근 QR</div>'+
 '<div id="qr-checkout" style="background:#fff;border-radius:10px;padding:8px;display:inline-block;margin-bottom:8px"></div>'+
 '<div id="qr-checkout-timer" style="font-size:10px;color:var(--t3)">갱신 대기중...</div>'+
 '</div>'+
 '</div>'+
 /* 휴식 QR */
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">'+
 '<div style="text-align:center;padding:12px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:12px">'+
 '<div style="font-size:11px;font-weight:800;color:#f59e0b;margin-bottom:6px">휴식 시작</div>'+
 '<div id="qr-break-start" style="background:#fff;border-radius:8px;padding:5px;display:inline-block;margin-bottom:4px"></div>'+
 '<div id="qr-break-timer" style="font-size:9px;color:var(--t3)">갱신 대기중...</div>'+
 '</div>'+
 '<div style="text-align:center;padding:12px;background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.2);border-radius:12px">'+
 '<div style="font-size:11px;font-weight:800;color:#6366f1;margin-bottom:6px">휴식 종료</div>'+
 '<div id="qr-break-end" style="background:#fff;border-radius:8px;padding:5px;display:inline-block;margin-bottom:4px"></div>'+
 '<div style="font-size:9px;color:var(--t3)">위와 동일 갱신</div>'+
 '</div>'+
 '</div>'+
 '<div style="margin-top:10px;padding:8px 12px;background:rgba(201,168,76,.06);border-radius:8px;font-size:10px;color:var(--t3)">'+
 '직원이 본인 스마트폰으로 스캔 → 이름 확인 후 출퇴근 자동 기록<br>30초마다 코드 변경으로 대리 출퇴근 방지</div>'+
 '</div>'+

 /* 직원별 개인 QR */
 '<div class="card">'+
 '<div style="font-size:12px;font-weight:800;color:var(--t3);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">직원별 개인 QR</div>'+
 '<div id="staff-qr-list"><div style="text-align:center;padding:20px;color:var(--t3)">로딩 중...</div></div>'+
 '</div></div>';

 _filoRenderStaffQRs(did);
 _filoStartDynamicQR(did);
}

var _dynamicQRTimer=null;
function _filoRenderStaffQRs(did){
 var _go=function(snap){
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
 };
 var now=Date.now();
 if(_membersCache&&(now-_membersCacheAt)<300000){_go({empty:false,docs:Object.entries(_membersCache).filter(function(e){return e[1]&&e[1].name;}).map(function(e){return {id:e[0],data:function(){return e[1];}};})});}
 else{_db.collection('members').where('dealerId','==',did).orderBy('name').get().then(function(snap){var wm={};snap.forEach(function(d){var m=d.data();wm[d.id]=m;if(m.name)wm[m.name]=m;});_membersCache=wm;_membersCacheAt=Date.now();_go(snap);}).catch(function(){});}
}

/* ══════════════════════════════════════════
   회원 QR 페이지
   회원 가입/적립/할인 QR
   ══════════════════════════════════════════ */
function _filoPageAttendance(el){
 var did=_CU.dealerId||_CU.uid;
 var today=_today();
 var qrUrl='https://filo.ai.kr/qr?did='+did+'&action=in';
 var qrImg='https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+encodeURIComponent(qrUrl);
 el.innerHTML='<div class="slide-up" style="max-width:700px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">QR 출퇴근</div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'+
 '<div class="qr-card">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:4px">출근 QR</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">직원이 스캔하면 출근 체크</div>'+
 '<div class="qr-wrap"><img src="'+qrImg+'" style="width:180px;height:180px"></div>'+
 '<div style="font-size:10px;color:var(--t3);margin-top:8px">'+today+'</div>'+
 '<div style="display:flex;gap:6px;margin-top:10px">'+
 '<button onclick="_filoManualCheckin()" class="btn btn-brand btn-sm" style="flex:1">수동 출근 체크</button>'+
 '<button onclick="_filoShowStaffReg()" class="btn btn-sm" style="flex:1;background:rgba(201,168,76,.2);border:1px solid rgba(201,168,76,.4);color:#a78bfa">+ 신규 직원 등록</button>'+
 '</div>'+
 '</div>'+
 '<div class="qr-card" style="text-align:left">'+
 '<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">'+
 '<div class="live-dot"></div>'+
 '<div style="font-size:13px;font-weight:800">오늘 출퇴근 현황</div></div>'+
 '<div id="attend-today" style="max-height:280px;overflow-y:auto">'+
 '<div style="text-align:center;padding:20px;color:var(--t3)">...</div></div>'+
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
 '<button onclick="_filoDoManualCheckin()" class="btn btn-brand" style="width:100%">체크인 저장</button></div>'+
 '<div id="staff-reg" style="display:none;margin-top:10px" class="card">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:12px">직원 등록</div>'+
 '<div class="fg"><label>이름 <span style="color:#ef4444">*</span></label>'+
 '<input id="nr-name" type="text" placeholder="직원 이름" autocomplete="name" '+
 'style="width:100%;padding:9px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>연락처 <span style="color:#ef4444">*</span></label>'+
 '<input id="nr-phone" type="tel" placeholder="01012345678" autocomplete="tel" '+
 'style="width:100%;padding:9px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
 '<div class="fg"><label>시급/임금 (원) <span style="color:#ef4444">*</span></label>'+
 '<input id="nr-wage" type="number" placeholder="예: 10030" min="0" step="10" '+
 'style="width:100%;padding:9px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>임금 유형</label>'+
 '<select id="nr-wagetype" '+
 'style="width:100%;padding:9px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px">'+
 '<option value="hourly">시급</option><option value="daily">일급</option><option value="monthly">월급</option></select></div></div>'+
 '<div class="fg"><label>고용 형태</label>'+
 '<select id="nr-emptype" '+
 'style="width:100%;padding:9px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px">'+
 '<option value="part">단기알바 (3.3% 원천징수)</option>'+
 '<option value="full">정직원 (4대보험)</option>'+
 '<option value="monthly">월급직 (4대보험)</option></select></div>'+
 '<div style="font-size:10px;color:var(--t3);margin-bottom:10px">'+
 '2026년 최저시급 10,030원 · 등록 후 급여가 자동 계산됩니다</div>'+
 '<div style="display:flex;gap:8px">'+
 '<button onclick="_filoShowStaffReg()" class="btn" style="flex:1;background:var(--b3)">취소</button>'+
 '<button onclick="_filoRegisterStaff()" class="btn btn-brand" style="flex:1">등록</button></div></div>';

 var now=new Date();
 var localISO=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
 var mcTime=document.getElementById('mc-time');
 if(mcTime)mcTime.value=localISO;

 var _fillMcSel=function(snap){
  var sel=document.getElementById('mc-member');if(!sel)return;
  while(sel.options.length>1)sel.remove(1);
  snap.forEach(function(doc){
   var opt=document.createElement('option');
   opt.value=doc.id;opt.textContent=doc.data().name||doc.id;
   sel.appendChild(opt);
  });
 };
 var _nowMs=Date.now();
 if(_membersCache&&(_nowMs-_membersCacheAt)<300000){
  var _fakeDocs=Object.entries(_membersCache).filter(function(e){return e[1]&&e[1].name;}).map(function(e){return {id:e[0],data:function(){return e[1];}};});
  _fillMcSel({forEach:function(fn){_fakeDocs.forEach(fn);}});
 } else {
  _db.collection('members').where('dealerId','==',did).orderBy('name').get()
  .then(function(snap){var wm={};snap.forEach(function(d){var m=d.data();wm[d.id]=m;if(m.name)wm[m.name]=m;});_membersCache=wm;_membersCacheAt=Date.now();_fillMcSel(snap);})
  .catch(function(){});
 }

 if(_staffAttendUnsub)_staffAttendUnsub();
 _staffAttendUnsub=_db.collection('attendance')
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
 var today=_today();
 el.innerHTML='<div class="slide-up" style="max-width:800px;margin:0 auto">'+
 '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">'+
 '<div class="live-dot"></div>'+
 '<div style="font-size:17px;font-weight:900">출퇴근 현황</div>'+
 '<div style="font-size:12px;color:var(--t3);margin-left:4px">실시간</div></div>'+
 '<div style="margin-bottom:14px">'+
 '<input type="date" id="ad-date" value="'+today+'" onchange="_filoLoadAttendDash()" '+
 'style="padding:8px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px">'+
 '</div>'+
 '<div id="ad-summary" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px"></div>'+
 '<div id="ad-list"></div>'+
 '<div id="staffiq-ai" style="margin-top:14px;background:linear-gradient(135deg,rgba(34,211,238,.06),rgba(99,102,241,.04));border:1px solid rgba(34,211,238,.2);border-radius:16px;padding:18px">'+
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
   '<div style="display:flex;align-items:center;gap:8px">'+
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>'+
    '<span style="font-size:13px;font-weight:800;color:#22d3ee">STAFFIQ 근태분석</span>'+
   '</div>'+
   '<button onclick="_staffiqAnalyze()" style="padding:6px 14px;background:rgba(34,211,238,.15);border:1px solid rgba(34,211,238,.3);border-radius:8px;color:#22d3ee;font-size:11px;font-weight:700;cursor:pointer">AI 분석 실행</button>'+
  '</div>'+
  '<div id="staffiq-result" style="font-size:12px;color:var(--t2);line-height:1.8;min-height:32px">근태 데이터를 분석하려면 위 버튼을 클릭하세요.</div>'+
 '</div>'+
 '</div>';
 _filoLoadAttendDash();
}

function _filoLoadAttendDash(){
 var did=_CU.dealerId||_CU.uid;
 var dateEl=document.getElementById('ad-date');
 var date=dateEl?dateEl.value:_today();
 if(_staffAttendUnsub)_staffAttendUnsub();
 /* 직원 시급 정보 — 캐시 5분 유효 시 재사용 */
 var wageMap=(_membersCache&&(Date.now()-_membersCacheAt)<300000)?_membersCache:{};
 if(!Object.keys(wageMap).length){
  _db.collection('members').where('dealerId','==',did).get().then(function(ms){
   ms.forEach(function(doc){var d=doc.data();wageMap[doc.id]=d;wageMap[d.name]=d;});
   _membersCache=wageMap;_membersCacheAt=Date.now();
  }).catch(function(){});
 }
 _staffAttendUnsub=_db.collection('attendance')
 .where('dealerId','==',did).where('date','==',date)
 .orderBy('time','asc')
 .onSnapshot(function(snap){
 var records=[];
 snap.forEach(function(doc){records.push(Object.assign({_id:doc.id},doc.data()));});
 var memberMap={};
 records.forEach(function(r){
 if(!memberMap[r.memberId])memberMap[r.memberId]={name:r.memberName||r.memberId,memberId:r.memberId,ins:[],outs:[],brkStarts:[],brkEnds:[],workMin:0};
 if(r.type==='in')memberMap[r.memberId].ins.push(r.time);
 else if(r.type==='out')memberMap[r.memberId].outs.push(r.time);
 else if(r.type==='break_start')memberMap[r.memberId].brkStarts.push(r.time);
 else if(r.type==='break_end')memberMap[r.memberId].brkEnds.push(r.time);
 });
 Object.values(memberMap).forEach(function(m){
 m.ins.sort();m.outs.sort();m.brkStarts.sort();m.brkEnds.sort();
 var brk=0;
 for(var j=0;j<Math.min(m.brkStarts.length,m.brkEnds.length);j++){
  var bd=(new Date(m.brkEnds[j])-new Date(m.brkStarts[j]))/60000;
  if(bd>0&&bd<120)brk+=bd;
 }
 var total=0;
 for(var i=0;i<Math.min(m.ins.length,m.outs.length);i++){
  total+=(new Date(m.outs[i])-new Date(m.ins[i]))/60000;
 }
 /* 현재 출근중이면 지금까지 근무 추가 */
 if(m.ins.length>m.outs.length){
  total+=(Date.now()-new Date(m.ins.slice(-1)[0]))/60000;
 }
 m.workMin=Math.max(0,Math.round(total-brk));
 m.breakMin=Math.round(brk);
 m.status=m.ins.length>m.outs.length?'in':'out';
 m.lastTime=(m.status==='in'?m.ins:m.outs).slice(-1)[0]||'';
 /* 실시간 급여 = 근무시간 × 시급 */
 var info=wageMap[m.memberId]||wageMap[m.name]||{};
 m.wage=info.wage||0;
 m.wageType=info.wageType||'hourly';
 m.livePay=m.wageType==='hourly'?Math.round((m.workMin/60)*m.wage):0;
 });
 var members=Object.values(memberMap);
 var inCount=members.filter(function(m){return m.status==='in';}).length;
 var outCount=members.filter(function(m){return m.status==='out'&&m.ins.length;}).length;
 var totalMin=members.reduce(function(s,m){return s+m.workMin;},0);
 var totalPay=members.reduce(function(s,m){return s+m.livePay;},0);
 var sum=document.getElementById('ad-summary');
 if(sum)sum.innerHTML=[
 {label:'현재 출근',val:inCount+'명',color:'#10B981'},
 {label:'퇴근 완료',val:outCount+'명',color:'#94a3b8'},
 {label:'총 근무',val:Math.floor(totalMin/60)+'h '+totalMin%60+'m',color:'#6366F1'},
 {label:'실시간 급여',val:'₩'+totalPay.toLocaleString(),color:'#F59E0B'},
 ].map(function(s,i){
 return '<div class="stat-card slide-up stagger-'+(i+1)+'" style="border-top:3px solid '+s.color+'">'+
 '<div style="font-size:22px;font-weight:900;color:'+s.color+'">'+s.val+'</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+s.label+'</div></div>';
 }).join('');
 var list=document.getElementById('ad-list');
 if(!list)return;
 if(!members.length){list.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--t3)">기록 없음</div>';return;}
 list.innerHTML=members.map(function(m,i){
 var inTime=m.ins[0]?(new Date(m.ins[0])).toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):'--:--';
 var outTime=m.outs.slice(-1)[0]?(new Date(m.outs.slice(-1)[0])).toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):'--:--';
 var wageLabel=m.wageType==='daily'?'일급':m.wageType==='monthly'?'월급':'시급';
 return '<div class="pay-card slide-up stagger-'+Math.min(i+1,4)+'">'+
 '<div style="display:flex;align-items:center;gap:10px">'+
 '<div class="attend-dot '+(m.status==='in'?'dot-in':'dot-out')+'"></div>'+
 '<div style="flex:1">'+
 '<div style="font-size:13px;font-weight:800">'+esc(m.name)+'</div>'+
 '<div style="font-size:11px;color:var(--t3)">출근 '+inTime+' · 퇴근 '+outTime+
 (m.breakMin>0?' · 휴식 '+Math.round(m.breakMin)+'분':'')+
 (m.wage?' · '+wageLabel+' '+m.wage.toLocaleString()+'원':'')+'</div></div></div>'+
 '<div style="text-align:right">'+
 '<div style="font-size:15px;font-weight:900;color:#6366F1">'+
 (m.workMin>0?Math.floor(m.workMin/60)+'h '+m.workMin%60+'m':m.status==='in'?'근무중':'--')+'</div>'+
 (m.livePay>0?'<div style="font-size:12px;font-weight:800;color:#10B981">₩'+m.livePay.toLocaleString()+'</div>':'')+
 '<div style="font-size:10px;color:var(--t3);margin-top:2px">'+(m.status==='in'?
 '<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:50%;background:#10B981;display:inline-block;animation:pulse 1.5s infinite"></span>출근중</span>':'퇴근')+'</div></div></div>';
 }).join('');
 },function(){});
}

function _filoPagePayroll(el){
 var did=_CU.dealerId||_CU.uid;
 var now=new Date();
 var ym=now.toISOString().slice(0,7);
 el.innerHTML='<div class="slide-up" style="max-width:860px;margin:0 auto">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
 '<div style="font-size:17px;font-weight:900;display:flex;align-items:center;gap:8px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>급여 현황</div>'+
 '<div style="display:flex;gap:8px;align-items:center">'+
 '<select id="pay-ym" onchange="_filoLoadPayroll()" style="padding:6px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px">'+
 (function(){var opts='';for(var i=0;i<6;i++){var d=new Date(now.getFullYear(),now.getMonth()-i,1);var v=d.toISOString().slice(0,7);opts+='<option value="'+v+'"'+(i===0?' selected':'')+'>'+v+'</option>';}return opts;})()+'</select>'+
 '<button onclick="_filoPayrollSettle()" style="padding:6px 12px;background:var(--br);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>명세서 발송</button>'+
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

function _filoLoadPayroll(){
 var did=_CU.dealerId||_CU.uid;
 var ymEl=document.getElementById('pay-ym');
 var ym=ymEl?ymEl.value:_monthStr();
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
   if(!payMap[mid])payMap[mid]={memberId:mid,name:d.memberName||mid,workMin:0,days:new Set(),ins:[],outs:[],brkStarts:[],brkEnds:[]};
   if(d.type==='in')payMap[mid].ins.push({time:d.time,date:d.date});
   else if(d.type==='out')payMap[mid].outs.push({time:d.time,date:d.date});
   else if(d.type==='break_start')payMap[mid].brkStarts.push({time:d.time,date:d.date});
   else if(d.type==='break_end')payMap[mid].brkEnds.push({time:d.time,date:d.date});
  });
  Object.values(payMap).forEach(function(p){
   p.ins.sort(function(a,b){return a.time>b.time?1:-1;});
   p.outs.sort(function(a,b){return a.time>b.time?1:-1;});
   p.brkStarts.sort(function(a,b){return a.time>b.time?1:-1;});
   p.brkEnds.sort(function(a,b){return a.time>b.time?1:-1;});
   /* 휴식 총 시간(분) */
   var breakMin=0;
   for(var j=0;j<Math.min(p.brkStarts.length,p.brkEnds.length);j++){
    var bd=(new Date(p.brkEnds[j].time)-new Date(p.brkStarts[j].time))/60000;
    if(bd>0&&bd<120)breakMin+=bd;
   }
   var total=0,overtimeMin=0,nightMin=0;
   for(var i=0;i<Math.min(p.ins.length,p.outs.length);i++){
    var inT=new Date(p.ins[i].time);
    var outT=new Date(p.outs[i].time);
    var diff=(outT-inT)/60000;
    if(diff<=0||diff>720)continue;
    total+=diff;
    p.days.add(p.ins[i].date);
    /* 연장근무: 8h(480분) 초과분 */
    if(diff>480)overtimeMin+=diff-480;
    /* 야간근무: 22:00~익일06:00 */
    nightMin+=_calcNightMin(inT,outT);
   }
   total=Math.max(0,total-breakMin);
   p.workMin=Math.round(total);
   p.workHour=p.workMin/60;
   p.dayCount=p.days.size;
   p.breakMin=Math.round(breakMin);
   p.overtimeMin=Math.round(overtimeMin);
   p.nightMin=Math.round(nightMin);
   var member=Object.values(memberMap).find(function(m){return m._id===p.memberId||m.name===p.name;})||{};
   p.wage=member.wage||0;
   p.wageType=member.wageType||'hourly';
   p.empType=member.empType||member.role||'part';
   p.uid=member._id||p.memberId;
   /* 기본급 */
   if(p.wageType==='monthly'){p.basePay=p.wage;}
   else if(p.wageType==='daily'){p.basePay=Math.round(p.dayCount*p.wage);}
   else{p.basePay=Math.round(p.workHour*p.wage);}
   /* 연장수당: 연장시간 × 시급 × 0.5 (시급제만, 5인 이상 사업장) */
   p.overtimePay=(p.wageType==='hourly'&&p.wage)?Math.round((p.overtimeMin/60)*p.wage*0.5):0;
   /* 야간수당: 야간시간 × 시급 × 0.5 (시급제만) */
   p.nightPay=(p.wageType==='hourly'&&p.wage)?Math.round((p.nightMin/60)*p.wage*0.5):0;
   /* 주휴수당 */
   p.weeklyAllowance=_calcWeeklyAllowance(p.ins,p.outs,p.wage,p.wageType);
   /* 총지급액 */
   p.gross=p.basePay+p.overtimePay+p.nightPay+p.weeklyAllowance;
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
 '<div style="font-size:16px;font-weight:900;margin-bottom:8px">급여명세서 발송</div>'+
 '<div style="font-size:13px;color:var(--t3);margin-bottom:16px">'+ym+'월 급여명세서를 카카오 알림톡으로 발송합니다.<br>총 '+_payrollData.length+'명에게 발송됩니다.</div>'+
 '<div style="display:flex;gap:8px">'+
 '<button onclick="document.querySelector(\'.mo\').remove()" style="flex:1;padding:10px;background:var(--b3);border:none;border-radius:8px;color:var(--t2);cursor:pointer">취소</button>'+
 '<button onclick="_filoDoSendPayslip(\''+ym+'\')" style="flex:1;padding:10px;background:var(--br);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer">발송</button>'+
 '</div></div>');
}

function _filoPageRoster(el){
 el.innerHTML='<div class="slide-up card" style="text-align:center;padding:40px">'+
 ''+
 '<div style="font-size:16px;font-weight:800;margin-bottom:6px">근무표</div>'+
 '<div style="font-size:12px;color:var(--t3)">주간 근무표 기능 곧 추가됩니다</div></div>';
}

/* ══════════════════════════════════════════
   신규 직원 이름+연락처 등록 (근태QR 페이지)
   ══════════════════════════════════════════ */
function _filoShowStaffReg(){
 var el=document.getElementById('staff-reg');
 if(!el)return;
 var visible=el.style.display!=='none';
 el.style.display=visible?'none':'block';
 if(!visible){
  var nm=document.getElementById('nr-name');
  if(nm){nm.value='';nm.focus();}
  var ph=document.getElementById('nr-phone');
  if(ph)ph.value='';
  var wg=document.getElementById('nr-wage');
  if(wg)wg.value='';
  var wt=document.getElementById('nr-wagetype');
  if(wt)wt.value='hourly';
  var et=document.getElementById('nr-emptype');
  if(et)et.value='part';
 }
}

function _filoRegisterStaff(){
 var did=_CU.dealerId||_CU.uid;
 var name=(document.getElementById('nr-name')&&document.getElementById('nr-name').value||'').trim();
 var phone=(document.getElementById('nr-phone')&&document.getElementById('nr-phone').value||'').trim();
 var wage=parseInt((document.getElementById('nr-wage')&&document.getElementById('nr-wage').value)||'0')||0;
 var wageType=(document.getElementById('nr-wagetype')&&document.getElementById('nr-wagetype').value)||'hourly';
 var empType=(document.getElementById('nr-emptype')&&document.getElementById('nr-emptype').value)||'part';
 if(!name){_filoToast('이름을 입력하세요');return;}
 if(!phone){_filoToast('연락처를 입력하세요');return;}
 if(!wage){_filoToast('시급/임금을 입력하세요');return;}
 _db.collection('members').add({
  dealerId:did,name:name,phone:phone,
  role:empType,wage:wage,wageType:wageType,empType:empType,
  createdAt:_nowISO(),is_active:true,status:'active'
 }).then(function(docRef){
  _filoToast(name+' 등록 완료');
  document.getElementById('staff-reg').style.display='none';
  /* 캐시 무효화 — 새 직원이 즉시 반영되도록 */
  _membersCache=null;_membersCacheAt=0;
  /* 드롭다운 갱신 */
  _db.collection('members').where('dealerId','==',did).orderBy('name').get()
  .then(function(snap){
   var wm={};
   snap.forEach(function(d){var m=d.data();wm[d.id]=m;if(m.name)wm[m.name]=m;});
   _membersCache=wm;_membersCacheAt=Date.now();
   var sel=document.getElementById('mc-member');if(!sel)return;
   while(sel.options.length>1)sel.remove(1);
   snap.forEach(function(doc){
    var opt=document.createElement('option');
    opt.value=doc.id;opt.textContent=doc.data().name||doc.id;
    sel.appendChild(opt);
   });
   sel.value=docRef.id;
   /* 수동 체크인 섹션 열기 */
   var mc=document.getElementById('manual-checkin');
   if(mc)mc.style.display='block';
  });
 }).catch(function(e){_filoToast('오류: '+e.message);});
}

/* ══════════════════════════════════════════
   실시간 급여 티커 — 출근중 직원 급여 1분마다 갱신
   ══════════════════════════════════════════ */
var _liveTickerTimer=null;
var _staffAttendUnsub=null;
/* members 캐시 — 5분 TTL, 반복 조회 방지 */
var _membersCache=null, _membersCacheAt=0;
/* attendance onSnapshot 캐시 — 60초 get() 폴링 대체 */
var _tickerAttendSnap=null;
function _filoStartLiveTicker(){
 if(_liveTickerTimer)clearInterval(_liveTickerTimer);
 // 기존 ticker attendance 구독 정리
 if(window._tickerAttendUnsub){try{window._tickerAttendUnsub();}catch(e){} window._tickerAttendUnsub=null;}
 var did=_CU&&(_CU.dealerId||_CU.uid);
 if(!did)return;
 var today=_today();
 // attendance onSnapshot으로 실시간 수신 → 캐시 저장 (60초 get() 폴링 제거)
 window._tickerAttendUnsub=_db.collection('attendance')
  .where('dealerId','==',did).where('date','==',today)
  .where('type','in',['in','out'])
  .onSnapshot(function(snap){_tickerAttendSnap=snap;_tickerRender();},function(){});
 // 1분마다 급여 금액만 재계산 (DB 조회 없이 캐시 사용)
 _liveTickerTimer=setInterval(_tickerRender,60000);
}
function _tickerRender(){
 var liveEl=document.getElementById('pay-live');
 if(!liveEl){clearInterval(_liveTickerTimer);return;}
 var attSnap=_tickerAttendSnap;
 if(!attSnap)return;
 var did=_CU&&(_CU.dealerId||_CU.uid);
 if(!did)return;
 var ins={},outIds=new Set();
 attSnap.forEach(function(d){var r=d.data();if(r.type==='in')ins[r.memberId]=r;else if(r.type==='out')outIds.add(r.memberId);});
 var working=Object.values(ins).filter(function(r){return !outIds.has(r.memberId);});
 if(!working.length){liveEl.innerHTML='';return;}
 var rows=working.map(function(r){
  var minWorked=(Date.now()-new Date(r.time))/60000;
  return {name:r.memberName||r.memberId,mid:r.memberId,minWorked:Math.round(minWorked)};
 });
 var now=Date.now();
 var _doRender=function(wm){
  var html='<div style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.18);border-radius:12px;padding:12px 14px;margin-bottom:12px">'+
  '<div style="font-size:11px;font-weight:800;color:#10B981;margin-bottom:8px;display:flex;align-items:center;gap:5px">'+
  '<span style="width:7px;height:7px;border-radius:50%;background:#10B981;display:inline-block;animation:pulse 1.5s infinite"></span>출근중 실시간 급여</div>'+
  '<div style="display:flex;flex-wrap:wrap;gap:8px">'+
  rows.map(function(r){
   var info=wm[r.mid]||wm[r.name]||{};
   var wage=info.wage||0;
   var wageType=info.wageType||'hourly';
   var livePay=wageType==='hourly'?Math.round((r.minWorked/60)*wage):0;
   return '<div style="background:#fff;border-radius:10px;padding:8px 12px;border:1px solid rgba(16,185,129,.2)">'+
   '<div style="font-size:11px;font-weight:800;color:var(--tx)">'+esc(r.name)+'</div>'+
   '<div style="font-size:13px;font-weight:900;color:#10B981">₩'+livePay.toLocaleString()+'</div>'+
   '<div style="font-size:9px;color:var(--t3)">'+Math.floor(r.minWorked/60)+'h '+r.minWorked%60+'m'+
   (wage?' · '+(wageType==='hourly'?wage.toLocaleString()+'원/h':''):'')+'</div></div>';
  }).join('')+
  '</div></div>';
  liveEl.innerHTML=html;
 };
 if(_membersCache&&(now-_membersCacheAt)<300000){
  _doRender(_membersCache);
 } else {
  _db.collection('members').where('dealerId','==',did).get().then(function(ms){
   var wm={};ms.forEach(function(d){var m=d.data();wm[d.id]=m;wm[m.name]=m;});
   _membersCache=wm;_membersCacheAt=Date.now();
   _doRender(wm);
  }).catch(function(){});
 }
}

/* ══════════════════════════════════════════
   야간시간(분) 계산 헬퍼 — 22:00~익일06:00 구간
   ══════════════════════════════════════════ */
function _calcNightMin(inD, outD){
 var nm=0;
 var cur=new Date(inD);
 var end=new Date(outD);
 if(end-cur<=0||end-cur>86400000)return 0;
 /* 시간 경계 단위로 순회 (최대 ~24회) */
 while(cur<end){
  var h=cur.getHours();
  var isNight=(h>=22||h<6);
  var next=new Date(cur);
  if(isNight){
   if(h>=22){next.setHours(24,0,0,0);}else{next.setHours(6,0,0,0);}
   if(next>end)next=new Date(end);
   nm+=(next-cur)/60000;
  } else {
   if(h<22){next.setHours(22,0,0,0);}else{next.setHours(30,0,0,0);}
   if(next>end)next=new Date(end);
  }
  cur=next;
 }
 return nm;
}


/* ── STAFFIQ AI 근태분석 ── */
function _staffiqAnalyze(){
 var btn=document.querySelector('[onclick="_staffiqAnalyze()"]');
 var res=document.getElementById('staffiq-result');
 if(!res)return;
 // 현재 화면의 출퇴근 데이터 수집
 var rows=[];
 document.querySelectorAll('#ad-list .pay-card').forEach(function(el){
  rows.push(el.innerText.replace(/\s+/g,' ').trim());
 });
 if(!rows.length){res.textContent='출퇴근 데이터가 없습니다.';return;}
 if(btn){btn.disabled=true;btn.textContent='분석 중...';}
 res.innerHTML='<span style="color:var(--t3)">Claude AI 분석 중</span>';
 var prompt='다음은 오늘의 직원 출퇴근 데이터입니다:\n'+rows.join('\n')+
  '\n\n다음을 간략히 분석해주세요 (한국어, 3-4줄):'+
  '\n1. 출퇴근 패턴 이상 여부 (지각·조기퇴근)\n2. 총 근무시간 효율성\n3. 급여 관련 주의사항';
 fetch('/api/ai-coach',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({message:prompt,type:'staffiq'})
 }).then(function(r){return r.json();})
 .then(function(d){
  if(d.reply){res.textContent='';d.reply.split('\n').forEach(function(line,i){if(i)res.appendChild(document.createElement('br'));res.appendChild(document.createTextNode(line));});}
  else res.textContent='분석 결과를 받지 못했습니다.';
 }).catch(function(e){
  res.textContent='분석 오류: '+e.message;
 }).finally(function(){
  if(btn){btn.disabled=false;btn.textContent='AI 분석 실행';}
 });
}
