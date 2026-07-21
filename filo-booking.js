/**
 * @module      filo-booking.js
 * ══════════════════════════════════════════════════════
 * 역할: 예약·달력·스케줄·예약확정/거절·알림
 *
 * 저장 컬렉션:
 *   filo_bookings — 예약 정보 (status: pending/confirmed/rejected)
 *   members       — 회원 FCM 토큰 조회 (알림용)
 *
 * 의존: filo-common.js (_CU, _db, _filoToast)
 *       filo-table.js (_filoTableLoad — 예약 확정/거절 후 테이블 갱신)
 *
 * 전역:
 *   window._calYear, window._calMonth  — 캘린더 현재 연/월
 *   window._calUnsub                   — onSnapshot 리스너 해제용
 *   window._filoBookingConfirm(bid,did) — 테이블카드 인라인 호출
 *   window._filoBookingReject(bid,did)  — 테이블카드 인라인 호출
 *
 * 노출 함수:
 *   _filoPageSchedule(el)              — 예약·달력 페이지 진입
 *   _filoRenderCalendar(did)           — 달력 렌더링 (onSnapshot 실시간)
 *   _filoReservationAdd/Delete/Edit()  — 예약 CRUD
 *   _filoNotifyReservation()           — 예약 알림 발송
 *
 * ⚠️ 2026-07-15 분리:
 *   filo-table.js에서 예약/스케줄 블록 이동
 *   filo-schedule.js → DEPRECATED (이 파일로 통합)
 *
 * ⚠️ Worker 등록 필수:
 *   _worker.js JS 서빙 배열에 '/filo-booking.js' 포함 확인
 * ══════════════════════════════════════════════════════
 */

window._filoBookingConfirm=function(bid,did){
 _db.collection('filo_bookings').doc(bid).get().then(function(snap){
  var d=snap.data()||{};
  _db.collection('filo_bookings').doc(bid).update({status:'confirmed',confirmedAt:_nowISO()})
  .then(function(){_filoToast('✅ 예약 확정');_filoTableLoad(did);_filoNotifyReservation(did,d,'confirmed');});
 });
};

window._filoBookingReject=function(bid,did){
 if(!confirm('예약을 거절하시겠습니까?')) return;
 _db.collection('filo_bookings').doc(bid).get().then(function(snap){
  var d=snap.data()||{};
  _db.collection('filo_bookings').doc(bid).update({status:'rejected',rejectedAt:_nowISO()})
  .then(function(){_filoToast('❌ 예약 거절');_filoTableLoad(did);_filoNotifyReservation(did,d,'rejected');});
 });
};

// 예약 알림: 회원+FCM허용→푸시, 회원+FCM없음→알림톡, 비회원→차단(예약단계에서 막힘)
async function _filoNotifyReservation(did,booking,status){
 var name=booking.customerName||'고객';
 var phone=booking.phone||'';
 var tableName=booking.tableName||'테이블';
 var date=booking.date||'';
 var time=booking.time||'';
 var title=status==='confirmed'?'예약 확정 ✅':'예약 불가 ❌';
 var body=status==='confirmed'
  ?(tableName+' '+date+' '+time+' 예약이 확정됐습니다!')
  :'죄송합니다. 해당 시간 예약이 어렵습니다. 다른 시간을 선택해주세요.';
 if(!phone) return;
 // 회원 조회
 var mSnap=await _db.collection('members').where('dealerId','==',did).where('phone','==',phone).limit(1).get();
 if(mSnap.empty) return; // 비회원 (예약단계에서 이미 차단됨)
 var member=mSnap.docs[0].data();
 // 1순위: FCM 푸시 (앱 설치+허용한 회원)
 var tokens=((member.fcmTokens||[]).map(function(t){return t.token||t;})).filter(Boolean);
 if(member.fcmToken&&member.fcmToken.length>20) tokens.push(member.fcmToken);
 tokens=[...new Set(tokens)].filter(function(t){return t&&t.length>20;});
 if(tokens.length){
  fetch('https://donway.ai.kr/fcm/notify-drivers',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({tokens:tokens,title:title,body:body})
  }).catch(function(){});
  _filoToast('📱 '+name+'님 푸시 발송');
  return;
 }
 // 2순위: 알림톡 (회원이지만 앱 미설치/FCM 미허용)
 fetch('/api/send-alimtalk',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({to:phone,name:name,
   templateCode:status==='confirmed'?'reserve_confirm':'reserve_reject',
   variables:{name:name,tableName:tableName,date:date,time:time}
  })
 }).catch(function(){});
 _filoToast('💬 '+name+'님 알림톡 발송 (앱 미설치)');
}

function _filoPageSchedule(el){
 var did=_CU.dealerId||_CU.uid;
 var now=new Date();
 window._calYear=now.getFullYear();
 window._calMonth=now.getMonth();
 /* 이전 리스너 해제 */
 if(window._calUnsub){window._calUnsub();window._calUnsub=null;}
 el.innerHTML='';

 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:900px;margin:0 auto';

 /* 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
 hdr.innerHTML='<div><div class="page-title">🗓 예약 · 달력</div><div class="page-sub">고객 예약 및 일정 관리</div></div>';
 var addBtn=document.createElement('button');
 addBtn.className='btn btn-primary btn-sm';
 addBtn.textContent='+ 예약 추가';
 addBtn.onclick=function(){_filoReservationAdd(did);};
 hdr.appendChild(addBtn);
 wrap.appendChild(hdr);

 /* 달력 컨테이너 */
 var calWrap=document.createElement('div');
 calWrap.id='cal-wrap';
 calWrap.className='card';
 wrap.appendChild(calWrap);

 /* 예약 목록 */
 var listWrap=document.createElement('div');
 listWrap.id='reservation-list';
 wrap.appendChild(listWrap);

 el.appendChild(wrap);
 _filoRenderCalendar(did);
}
function _filoRenderCalendar(did){
 var wrap=document.getElementById('cal-wrap');
 if(!wrap)return;
 var year=window._calYear;
 var month=window._calMonth;
 var today=new Date();
 var firstDay=new Date(year,month,1).getDay();
 var daysInMonth=new Date(year,month+1,0).getDate();
 var monthNames=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

 /* 이 달 예약 로드 */
 var startStr=year+'-'+(month+1).toString().padStart(2,'0')+'-01';
 var endStr=year+'-'+(month+1).toString().padStart(2,'0')+'-'+daysInMonth.toString().padStart(2,'0');

 /* 기존 달력 리스너 해제 */
 if(window._calUnsub) window._calUnsub();

 window._calUnsub=_db.collection('filo_bookings').where('dealerId','==',did)
  .where('date','>=',startStr).where('date','<=',endStr)
  .onSnapshot(function(snap){
   var bookingMap={};
   snap.forEach(function(doc){
    var d=doc.data();
    if(!bookingMap[d.date])bookingMap[d.date]=[];
    bookingMap[d.date].push(Object.assign({_id:doc.id},d));
   });

   /* 달력 렌더 */
   var html='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
    '<button onclick="window._calMonth--;if(window._calMonth<0){window._calMonth=11;window._calYear--;}_filoRenderCalendar(\''+did+'\')" style="padding:6px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);cursor:pointer">◀</button>'+
    '<div style="font-size:17px;font-weight:900">'+year+'년 '+monthNames[month]+'</div>'+
    '<button onclick="window._calMonth++;if(window._calMonth>11){window._calMonth=0;window._calYear++;}_filoRenderCalendar(\''+did+'\')" style="padding:6px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);cursor:pointer">▶</button>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px">'+
    ['일','월','화','수','목','금','토'].map(function(d,i){
     return '<div style="text-align:center;font-size:11px;font-weight:700;color:'+(i===0?'#ef4444':i===6?'#60a5fa':'var(--t3)')+';padding:4px">'+d+'</div>';
    }).join('')+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';

   /* 빈칸 */
   for(var i=0;i<firstDay;i++) html+='<div></div>';

   /* 날짜 */
   for(var day=1;day<=daysInMonth;day++){
    var dateStr=year+'-'+(month+1).toString().padStart(2,'0')+'-'+day.toString().padStart(2,'0');
    var isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day;
    var bookings=bookingMap[dateStr]||[];
    var dow=new Date(year,month,day).getDay();
    html+='<div onclick="_filoCalDayClick(\''+did+'\',\''+dateStr+'\')" style="'+
     'min-height:60px;padding:4px;border-radius:8px;cursor:pointer;border:1px solid '+(isToday?'var(--br)':'var(--bd)')+';'+
     'background:'+(isToday?'rgba(124,58,237,.1)':'var(--surface2)')+';transition:.15s" '+
     'onmouseover="this.style.borderColor=\'rgba(124,58,237,.4)\'" onmouseout="this.style.borderColor=\''+(isToday?'var(--br)':'var(--bd)')+'\'">'+
     '<div style="font-size:12px;font-weight:700;color:'+(isToday?'#a78bfa':dow===0?'#ef4444':dow===6?'#60a5fa':'var(--tx)')+'">'+day+'</div>'+
     bookings.slice(0,2).map(function(b){
      return '<div style="font-size:9px;background:rgba(124,58,237,.15);border-radius:4px;padding:1px 4px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#a78bfa">'+
       (b.time?b.time+' ':'')+esc(b.customerName||b.title||'예약')+'</div>';
     }).join('')+
     (bookings.length>2?'<div style="font-size:9px;color:var(--t3);margin-top:1px">+'+( bookings.length-2)+'개</div>':'')+
     '</div>';
   }
   html+='</div>';
   wrap.innerHTML=html;

   /* 오늘 예약 목록 */
   _filoRenderTodayReservations(did, today.toISOString().slice(0,10), bookingMap[today.toISOString().slice(0,10)]||[]);
  });
}
function _filoCalDayClick(did,dateStr){
 var d=new Date(dateStr);
 var label=(d.getMonth()+1)+'월 '+d.getDate()+'일';
 _filoReservationAdd(did,dateStr,label);
}
function _filoRenderTodayReservations(did,todayStr,bookings){
 var wrap=document.getElementById('reservation-list');
 if(!wrap)return;
 wrap.innerHTML='';

 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;margin-top:16px';
 hdr.innerHTML='<div style="font-size:13px;font-weight:800">오늘 예약 ('+bookings.length+'건)</div>';
 wrap.appendChild(hdr);

 if(!bookings.length){
  var empty=document.createElement('div');
  empty.className='card';
  empty.style.cssText='text-align:center;padding:24px;color:var(--t3)';
  empty.innerHTML='<div style="font-size:24px;margin-bottom:8px">📅</div><div>오늘 예약이 없습니다</div>';
  wrap.appendChild(empty);
  return;
 }

 bookings.sort(function(a,b){return (a.time||'').localeCompare(b.time||'');}).forEach(function(b){
  var card=document.createElement('div');
  card.className='list-item';
  var statusColor={confirmed:'#22c55e',pending:'#f59e0b',cancelled:'#ef4444'}[b.status||'confirmed']||'#22c55e';
  card.innerHTML='<div class="list-item-icon" style="background:rgba(124,58,237,.1)">'+
   (b.type==='beauty'?'💇':b.type==='fitness'?'💪':'📋')+'</div>'+
   '<div style="flex:1;min-width:0">'+
   '<div style="font-size:13px;font-weight:700">'+esc(b.customerName||'고객')+'</div>'+
   '<div style="font-size:11px;color:var(--t3)">'+(b.time||'')+' · '+(b.service||'예약')+' · '+(b.phone||'')+'</div>'+
   '</div>'+
   '<div style="text-align:right">'+
   '<span class="chip" style="background:'+statusColor+'18;color:'+statusColor+';border-color:'+statusColor+'40">'+(b.status==='confirmed'?'확정':b.status==='pending'?'대기':'취소')+'</span>'+
   '<div style="margin-top:4px;display:flex;gap:4px">'+
   '<button onclick="_filoReservationEdit(\''+b._id+'\',\''+did+'\')" style="padding:4px 8px;background:var(--surface2);border:1px solid var(--bd2);border-radius:6px;color:var(--t2);font-size:10px;cursor:pointer">수정</button>'+
   '<button onclick="_filoReservationDelete(\''+b._id+'\')" style="padding:4px 8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:6px;color:#ef4444;font-size:10px;cursor:pointer">삭제</button>'+
   '</div></div>';
  wrap.appendChild(card);
 });
}
function _filoReservationAdd(did,dateStr,dateLabel){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:440px;max-height:85vh;overflow-y:auto';

 var title=document.createElement('div');
 title.style.cssText='font-size:15px;font-weight:900;margin-bottom:16px';
 title.textContent='📋 예약 추가'+(dateLabel?' — '+dateLabel:'');
 box.appendChild(title);

 var fields=[
  {id:'rsv-name',l:'고객명 *',type:'text',ph:'홍길동'},
  {id:'rsv-phone',l:'연락처',type:'tel',ph:'010-0000-0000'},
  {id:'rsv-date',l:'날짜 *',type:'date',ph:'',val:dateStr||_today()},
  {id:'rsv-time',l:'시간',type:'time',ph:'',val:'10:00'},
  {id:'rsv-service',l:'서비스/내용',type:'text',ph:'예: 커트, 컬러, 마사지...'},
  {id:'rsv-memo',l:'메모',type:'text',ph:'특이사항'},
 ];
 fields.forEach(function(f){
  var g=document.createElement('div');g.style.marginBottom='12px';
  var l=document.createElement('label');
  l.style.cssText='font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.6px';
  l.textContent=f.l;
  var inp=document.createElement('input');
  inp.id=f.id;inp.type=f.type;inp.placeholder=f.ph||'';
  if(f.val)inp.value=f.val;
  inp.style.cssText='width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none';
  g.appendChild(l);g.appendChild(inp);box.appendChild(g);
 });

 var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:8px;margin-top:4px';
 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);cursor:pointer';
 cancelBtn.textContent='취소';cancelBtn.onclick=function(){mo.remove();};
 var saveBtn=document.createElement('button');
 saveBtn.style.cssText='flex:2;padding:11px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-weight:700;cursor:pointer';
 saveBtn.textContent='✅ 예약 등록';
 saveBtn.onclick=function(){
  var name=(document.getElementById('rsv-name').value||'').trim();
  var date=(document.getElementById('rsv-date').value||'').trim();
  if(!name||!date){_filoToast('고객명과 날짜는 필수입니다');return;}
  _db.collection('filo_bookings').add({
   dealerId:did,customerName:name,
   phone:document.getElementById('rsv-phone').value||'',
   date:date,time:document.getElementById('rsv-time').value||'',
   service:document.getElementById('rsv-service').value||'',
   memo:document.getElementById('rsv-memo').value||'',
   status:'confirmed',type:window._filoIndustry||'cafe',
   createdAt:_nowISO()
  }).then(function(){
   _filoToast('✅ 예약이 등록됐습니다!');
   mo.remove();
   _filoRenderCalendar(did);
  }).catch(function(e){_filoToast('❌ '+e.message);});
 };
 btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
 box.appendChild(btnRow);

 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
 setTimeout(function(){document.getElementById('rsv-name').focus();},100);
}
function _filoReservationDelete(id){
 if(!confirm('예약을 삭제하시겠습니까?'))return;
 var did=_CU.dealerId||_CU.uid;
 _db.collection('filo_bookings').doc(id).delete().then(function(){
  _filoToast('🗑 예약이 삭제됐습니다');
  _filoRenderCalendar(did);
 });
}
function _filoReservationEdit(id,did){
 _db.collection('filo_bookings').doc(id).get().then(function(snap){
  if(!snap.exists)return;
  var d=snap.data();
  _filoReservationAdd(did,d.date);
  // 기존 데이터 폼에 자동 채우기
  setTimeout(function(){
   var fName=document.getElementById('rsv-name');
   var fPhone=document.getElementById('rsv-phone');
   var fPeople=document.getElementById('rsv-people');
   var fNote=document.getElementById('rsv-note');
   var fTime=document.getElementById('rsv-time');
   if(fName)fName.value=d.name||'';
   if(fPhone)fPhone.value=d.phone||'';
   if(fPeople)fPeople.value=d.people||2;
   if(fNote)fNote.value=d.note||'';
   if(fTime)fTime.value=d.time||'';
   // 수정 모드 표시 — 저장 시 기존 doc 업데이트
   var saveBtn=document.getElementById('rsv-save');
   if(saveBtn){
    saveBtn.textContent='✏️ 예약 수정';
    saveBtn.dataset.editId=id;
   }
  },150);
 });
}

// ── 웨이팅 관리 페이지 ──────────────────────────────────────────
function _filoPageWaiting(el) {
  var did = _CU.dealerId||_CU.uid;
  if(window._waitUnsub){ window._waitUnsub(); window._waitUnsub=null; }

  var today = _today();
  el.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.className = 'slide-up';
  wrap.style.cssText = 'max-width:700px;margin:0 auto';

  // 헤더
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
  hdr.innerHTML = '<div><div style="font-size:20px;font-weight:900;color:var(--tx)">웨이팅 관리</div>' +
    '<div style="font-size:12px;color:var(--t3);margin-top:2px">실시간 대기 현황 및 호출 관리</div></div>';
  var addBtn = document.createElement('button');
  addBtn.style.cssText = 'padding:10px 16px;background:var(--br);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer';
  addBtn.textContent = '+ 대기 등록';
  addBtn.onclick = function(){ _filoWaitingAdd(did); };
  hdr.appendChild(addBtn);
  wrap.appendChild(hdr);

  // 통계
  var stats = document.createElement('div');
  stats.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px';
  stats.innerHTML =
    '<div class="card" style="padding:16px;border-radius:16px;text-align:center">' +
    '<div style="font-size:28px;font-weight:900;color:var(--br)" id="wait-cnt">0팀</div>' +
    '<div style="font-size:12px;color:var(--t3);margin-top:2px">현재 대기중</div></div>' +
    '<div class="card" style="padding:16px;border-radius:16px;text-align:center">' +
    '<div style="font-size:28px;font-weight:900;color:#f59e0b" id="wait-time">없음</div>' +
    '<div style="font-size:12px;color:var(--t3);margin-top:2px">예상 대기시간</div></div>';
  wrap.appendChild(stats);

  // 빠른 작업
  var quick = document.createElement('div');
  quick.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px';
  var callBtn = document.createElement('button');
  callBtn.style.cssText = 'padding:14px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer';
  callBtn.textContent = 'CALL 다음 팀 호출';
  callBtn.onclick = function(){ _filoWaitingCallNext(did); };
  quick.appendChild(callBtn);
  wrap.appendChild(quick);

  // 목록
  var listTitle = document.createElement('div');
  listTitle.innerHTML = '<div style="font-size:12px;font-weight:800;color:var(--t3);margin-bottom:10px">현재 대기 목록</div>';
  wrap.appendChild(listTitle);

  var list = document.createElement('div');
  list.id = 'wait-list';
  list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--t3);font-size:13px">대기자 없음</div>';
  wrap.appendChild(list);
  el.appendChild(wrap);

  // 실시간
  window._waitUnsub = _db.collection('dine_waiting')
    .where('dealerId','==',did).where('date','==',today).where('status','==','waiting')
    .orderBy('createdAt')
    .onSnapshot(function(snap){
      var cntEl=document.getElementById('wait-cnt');
      var timeEl=document.getElementById('wait-time');
      var listEl=document.getElementById('wait-list');
      if(!listEl) return;
      var cnt=snap.size;
      if(cntEl) cntEl.textContent=cnt+'팀';
      if(timeEl) timeEl.textContent=cnt>0?(cnt*5)+'분':'없음';
      if(!cnt){ listEl.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3);font-size:13px">대기자 없음</div>'; return; }
      listEl.innerHTML='';
      var num=1;
      snap.forEach(function(doc){
        var w=Object.assign({id:doc.id},doc.data());
        var waitMin=w.createdAt?Math.floor((Date.now()-(w.createdAt.seconds||0)*1000)/60000):0;
        var card=document.createElement('div');
        card.className='card';
        card.style.cssText='padding:14px 16px;margin-bottom:8px;border-radius:14px;display:flex;align-items:center;gap:12px';
        var numBadge=document.createElement('div');
        numBadge.style.cssText='width:32px;height:32px;border-radius:50%;background:var(--br);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0';
        numBadge.textContent=num;
        var info=document.createElement('div');
        info.style.cssText='flex:1;min-width:0';
        info.innerHTML='<div style="font-size:14px;font-weight:700;color:var(--tx)">'+(w.name||'손님')+'</div>'+
          '<div style="font-size:12px;color:var(--t3);margin-top:2px">'+(w.seats||1)+'명 · 대기 '+waitMin+'분</div>';
        var btns=document.createElement('div');
        btns.style.cssText='display:flex;gap:6px;flex-shrink:0';
        var did2=did;
        var wid=doc.id;
        var wname=w.name||'손님';
        var callBtn2=document.createElement('button');
        callBtn2.style.cssText='padding:6px 12px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer';
        callBtn2.textContent='호출';
        callBtn2.onclick=function(){_filoWaitingCall(wid,did2,wname);};
        var doneBtn=document.createElement('button');
        doneBtn.style.cssText='padding:6px 12px;background:var(--surface2);color:var(--tx);border:1px solid var(--bd);border-radius:8px;font-size:12px;cursor:pointer';
        doneBtn.textContent='착석';
        doneBtn.onclick=function(){_filoWaitingDone(wid,did2);};
        var cancelBtn=document.createElement('button');
        cancelBtn.style.cssText='padding:6px 10px;background:#fee2e2;color:#ef4444;border:none;border-radius:8px;font-size:12px;cursor:pointer';
        cancelBtn.textContent='취소';
        cancelBtn.onclick=function(){_filoWaitingCancel(wid,did2);};
        btns.appendChild(callBtn2);
        btns.appendChild(doneBtn);
        btns.appendChild(cancelBtn);
        card.appendChild(numBadge);
        card.appendChild(info);
        card.appendChild(btns);
        listEl.appendChild(card);
        num++;
      });
    },function(){});
}

function _filoWaitingAdd(did){
  var name=prompt('손님 성함')||'손님';
  var seats=parseInt(prompt('인원수')||'2')||2;
  var phone=prompt('연락처 (선택)')||'';
  _db.collection('dine_waiting').add({
    dealerId:did,name:name,seats:seats,phone:phone,
    date:_today(),status:'waiting',
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){_filoToast('대기 등록됐어요!');}).catch(function(e){_filoToast('오류: '+e.message);});
}
function _filoWaitingCall(wid,did,name){
  _db.collection('dine_waiting').doc(wid).update({status:'called',calledAt:firebase.firestore.FieldValue.serverTimestamp()})
    .then(function(){_filoToast('📢 '+name+'님 호출!');});
}
function _filoWaitingDone(wid,did){
  _db.collection('dine_waiting').doc(wid).update({status:'seated',seatedAt:firebase.firestore.FieldValue.serverTimestamp()})
    .then(function(){_filoToast('착석 처리됐어요!');});
}
function _filoWaitingCancel(wid,did){
  if(!confirm('대기를 취소하시겠어요?')) return;
  _db.collection('dine_waiting').doc(wid).update({status:'cancelled'})
    .then(function(){_filoToast('취소됐어요');});
}
function _filoWaitingCallNext(did){
  _db.collection('dine_waiting').where('dealerId','==',did).where('date','==',_today())
    .where('status','==','waiting').orderBy('createdAt').limit(1).get()
    .then(function(snap){
      if(snap.empty){_filoToast('대기자 없음');return;}
      var doc=snap.docs[0];
      var name=doc.data().name||'손님';
      doc.ref.update({status:'called',calledAt:firebase.firestore.FieldValue.serverTimestamp()});
      _filoToast('📢 '+name+'님 호출!');
    });
}
