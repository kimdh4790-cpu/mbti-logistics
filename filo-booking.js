/**
 * @module      filo-booking.js
 * ══════════════════════════════════════════════════════
 * 역할: 예약·달력·스케줄·예약확정/거절·알림·웨이팅
 *
 * 저장 컬렉션:
 *   filo_bookings — 예약 정보 (status: pending/confirmed/rejected)
 *   dine_waiting  — 웨이팅 (status: waiting/called/seated/noshow/cancelled)
 *   members       — 회원 FCM 토큰 조회 (알림용)
 *
 * 의존: filo-common.js (_CU, _db, _filoToast, _today, _nowISO, esc)
 *       filo-table.js (_filoTableLoad)
 *
 * 전역:
 *   window._calYear, window._calMonth  — 캘린더 현재 연/월
 *   window._calBookingMap              — 캘린더 날짜별 예약 맵 (day click용)
 *   window._calUnsub, _waitUnsub, _waitSeatedUnsub
 *   window._filoBookingConfirm(bid,did)
 *   window._filoBookingReject(bid,did)
 *
 * 2026-08-05 고도화:
 *   - WaitingAdd/tbBook: prompt() → 모달
 *   - ReservationEdit: 필드ID 불일치 수정 + 업데이트 로직 정상화
 *   - WaitingCall/Done/Cancel: 손님 FCM 푸시 추가
 *   - WaitingNoshow: 신규
 *   - PageWaiting: 3열 통계 + called 그룹 분리 + 착석 리스너
 *   - CalDayClick: add form 직접 오픈 → 해당 날 예약 목록 표시
 *   - _filoWaitCard: 공통 카드 추출
 * ══════════════════════════════════════════════════════
 */

// ── 예약 확정/거절 (테이블카드 인라인) ──────────────────────────
window._filoBookingConfirm=function(bid,did,bookingData){
 /* bookingData가 있으면 get() 생략 — 없으면 폴백 */
 var _doConfirm=function(d){
  _db.collection('filo_bookings').doc(bid).update({status:'confirmed',confirmedAt:_nowISO()})
  .then(function(){_filoToast('예약 확정');_filoTableLoad(did);_filoNotifyReservation(did,d,'confirmed');});
 };
 if(bookingData){_doConfirm(bookingData);}
 else{_db.collection('filo_bookings').doc(bid).get().then(function(snap){_doConfirm(snap.data()||{});});}
};
window._filoBookingReject=function(bid,did,bookingData){
 if(!confirm('예약을 거절하시겠습니까?'))return;
 var _doReject=function(d){
  _db.collection('filo_bookings').doc(bid).update({status:'rejected',rejectedAt:_nowISO()})
  .then(function(){_filoToast('예약 거절');_filoTableLoad(did);_filoNotifyReservation(did,d,'rejected');});
 };
 if(bookingData){_doReject(bookingData);}
 else{_db.collection('filo_bookings').doc(bid).get().then(function(snap){_doReject(snap.data()||{});});}
};

// ── 예약 알림: FCM 우선, 없으면 알림톡 ─────────────────────────
async function _filoNotifyReservation(did,booking,status){
 var name=booking.customerName||'고객';
 var phone=booking.phone||'';
 var tableName=booking.tableName||'테이블';
 var date=booking.date||'';
 var time=booking.time||'';
 var title=status==='confirmed'?'예약 확정':'예약 불가';
 var body=status==='confirmed'
  ?(tableName+' '+date+' '+time+' 예약이 확정됐습니다!')
  :'죄송합니다. 해당 시간 예약이 어렵습니다. 다른 시간을 선택해주세요.';
 if(!phone)return;
 var mSnap=await _db.collection('members').where('dealerId','==',did).where('phone','==',phone).limit(1).get();
 if(mSnap.empty)return;
 var member=mSnap.docs[0].data();
 var tokens=((member.fcmTokens||[]).map(function(t){return t.token||t;})).filter(Boolean);
 if(member.fcmToken&&member.fcmToken.length>20)tokens.push(member.fcmToken);
 tokens=[...new Set(tokens)].filter(function(t){return t&&t.length>20;});
 if(tokens.length){
  fetch('https://donway.ai.kr/fcm/notify-drivers',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({tokens:tokens,title:title,body:body})
  }).catch(function(){});
  _filoToast(name+'님 푸시 발송');
  return;
 }
 fetch('/api/send-alimtalk',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({to:phone,name:name,
   templateCode:status==='confirmed'?'reserve_confirm':'reserve_reject',
   variables:{name:name,tableName:tableName,date:date,time:time}
  })
 }).catch(function(){});
 _filoToast(name+'님 알림톡 발송');
}

// ── 예약·달력 페이지 ─────────────────────────────────────────────
function _filoPageSchedule(el){
 var did=_CU.dealerId||_CU.uid;
 var now=new Date();
 window._calYear=now.getFullYear();
 window._calMonth=now.getMonth();
 if(window._calUnsub){window._calUnsub();window._calUnsub=null;}
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:900px;margin:0 auto';

 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
 hdr.innerHTML='<div><div class="page-title">예약 · 달력</div><div class="page-sub">고객 예약 및 일정 관리</div></div>';
 var addBtn=document.createElement('button');
 addBtn.className='btn btn-primary btn-sm';
 addBtn.textContent='+ 예약 추가';
 addBtn.onclick=function(){_filoReservationAdd(did);};
 hdr.appendChild(addBtn);
 wrap.appendChild(hdr);

 var calWrap=document.createElement('div');
 calWrap.id='cal-wrap';
 calWrap.className='card';
 wrap.appendChild(calWrap);

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
 var startStr=year+'-'+(month+1).toString().padStart(2,'0')+'-01';
 var endStr=year+'-'+(month+1).toString().padStart(2,'0')+'-'+daysInMonth.toString().padStart(2,'0');
 if(window._calUnsub)window._calUnsub();

 window._calUnsub=_db.collection('filo_bookings').where('dealerId','==',did)
  .where('date','>=',startStr).where('date','<=',endStr)
  .onSnapshot(function(snap){
   var bookingMap={};
   snap.forEach(function(doc){
    var d=doc.data();
    if(!bookingMap[d.date])bookingMap[d.date]=[];
    bookingMap[d.date].push(Object.assign({_id:doc.id},d));
   });
   window._calBookingMap=bookingMap;

   var html='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
    '<button onclick="window._calMonth--;if(window._calMonth<0){window._calMonth=11;window._calYear--;}_filoRenderCalendar(\''+did+'\')" style="padding:6px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);cursor:pointer">‹</button>'+
    '<div style="font-size:17px;font-weight:900">'+year+'년 '+monthNames[month]+'</div>'+
    '<button onclick="window._calMonth++;if(window._calMonth>11){window._calMonth=0;window._calYear++;}_filoRenderCalendar(\''+did+'\')" style="padding:6px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);cursor:pointer">›</button>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px">'+
    ['일','월','화','수','목','금','토'].map(function(d,i){
     return '<div style="text-align:center;font-size:11px;font-weight:700;color:'+(i===0?'#ef4444':i===6?'#60a5fa':'var(--t3)')+';padding:4px">'+d+'</div>';
    }).join('')+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';
   for(var i=0;i<firstDay;i++)html+='<div></div>';
   for(var day=1;day<=daysInMonth;day++){
    var dateStr=year+'-'+(month+1).toString().padStart(2,'0')+'-'+day.toString().padStart(2,'0');
    var isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day;
    var bookings=bookingMap[dateStr]||[];
    var dow=new Date(year,month,day).getDay();
    html+='<div onclick="_filoCalDayClick(\''+did+'\',\''+dateStr+'\')" style="'+
     'min-height:60px;padding:4px;border-radius:8px;cursor:pointer;border:1px solid '+(isToday?'var(--br)':'var(--bd)')+';'+
     'background:'+(isToday?'rgba(201,168,76,.1)':'var(--surface2)')+';transition:.15s" '+
     'onmouseover="this.style.borderColor=\'rgba(201,168,76,.4)\'" onmouseout="this.style.borderColor=\''+(isToday?'var(--br)':'var(--bd)')+'\'">'+
     '<div style="font-size:12px;font-weight:700;color:'+(isToday?'#a78bfa':dow===0?'#ef4444':dow===6?'#60a5fa':'var(--tx)')+'">'+day+'</div>'+
     bookings.slice(0,2).map(function(b){
      return '<div style="font-size:9px;background:rgba(201,168,76,.15);border-radius:4px;padding:1px 4px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#a78bfa">'+
       (b.time?b.time+' ':'')+esc(b.customerName||b.title||'예약')+'</div>';
     }).join('')+
     (bookings.length>2?'<div style="font-size:9px;color:var(--t3);margin-top:1px">+'+(bookings.length-2)+'건</div>':'')+
     '</div>';
   }
   html+='</div>';
   wrap.innerHTML=html;

   var todayStr=today.toISOString().slice(0,10);
   _filoRenderTodayReservations(did,todayStr,bookingMap[todayStr]||[],'오늘');
  });
}

// 날짜 클릭 → add form 대신 해당 날 예약 목록 표시
function _filoCalDayClick(did,dateStr){
 var d=new Date(dateStr+'T00:00:00');
 var label=(d.getMonth()+1)+'월 '+d.getDate()+'일';
 _filoRenderTodayReservations(did,dateStr,(window._calBookingMap||{})[dateStr]||[],label);
}

function _filoRenderTodayReservations(did,dateStr,bookings,label){
 var wrap=document.getElementById('reservation-list');
 if(!wrap)return;
 wrap.innerHTML='';

 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;margin-top:16px';
 hdr.innerHTML='<div style="font-size:13px;font-weight:800">'+(label||dateStr)+' 예약 ('+bookings.length+'건)</div>';
 var addDayBtn=document.createElement('button');
 addDayBtn.style.cssText='padding:5px 10px;background:var(--br);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer';
 addDayBtn.textContent='+ 이날 추가';
 addDayBtn.onclick=function(){_filoReservationAdd(did,dateStr,label);};
 hdr.appendChild(addDayBtn);
 wrap.appendChild(hdr);

 if(!bookings.length){
  var empty=document.createElement('div');
  empty.className='card';
  empty.style.cssText='text-align:center;padding:24px;color:var(--t3)';
  empty.innerHTML='<div style="font-size:13px">예약이 없습니다</div>';
  wrap.appendChild(empty);
  return;
 }

 var statusColor={confirmed:'#22c55e',pending:'#f59e0b',rejected:'#ef4444',cancelled:'#6b7280'};
 var statusLabel={confirmed:'확정',pending:'대기',rejected:'거절',cancelled:'취소'};
 bookings.sort(function(a,b){return (a.time||'').localeCompare(b.time||'');}).forEach(function(b){
  var card=document.createElement('div');
  card.className='list-item';
  var sc=statusColor[b.status||'confirmed']||'#22c55e';
  var sl=statusLabel[b.status||'confirmed']||'확정';
  card.innerHTML='<div class="list-item-icon" style="background:rgba(201,168,76,.1)">'+
   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>'+
   '</div>'+
   '<div style="flex:1;min-width:0">'+
   '<div style="font-size:13px;font-weight:700">'+esc(b.customerName||'고객')+'</div>'+
   '<div style="font-size:11px;color:var(--t3)">'+(b.time||'')+' · '+(b.service||'예약')+' · '+(b.phone||'')+'</div>'+
   '</div>'+
   '<div style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end">'+
   '<span class="chip" style="background:'+sc+'18;color:'+sc+';border-color:'+sc+'40">'+sl+'</span>'+
   '<div style="display:flex;gap:4px">'+
   (b.status==='pending'?
    '<button onclick="_filoBookingConfirm(\''+b._id+'\',\''+did+'\')" style="padding:4px 8px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:6px;color:#22c55e;font-size:10px;cursor:pointer">확정</button>'+
    '<button onclick="_filoBookingReject(\''+b._id+'\',\''+did+'\')" style="padding:4px 8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:6px;color:#ef4444;font-size:10px;cursor:pointer">거절</button>':'')+
   '<button onclick="_filoReservationEdit(\''+b._id+'\',\''+did+'\')" style="padding:4px 8px;background:var(--surface2);border:1px solid var(--bd2);border-radius:6px;color:var(--t2);font-size:10px;cursor:pointer">수정</button>'+
   '<button onclick="_filoReservationDelete(\''+b._id+'\')" style="padding:4px 8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:6px;color:#ef4444;font-size:10px;cursor:pointer">삭제</button>'+
   '</div></div>';
  wrap.appendChild(card);
 });
}

// ── 예약 CRUD ─────────────────────────────────────────────────────
function _filoReservationAdd(did,dateStr,dateLabel){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:440px;max-height:85vh;overflow-y:auto';
 var title=document.createElement('div');
 title.style.cssText='font-size:15px;font-weight:900;margin-bottom:16px';
 title.textContent='예약 추가'+(dateLabel?' — '+dateLabel:'');
 box.appendChild(title);
 var fields=[
  {id:'rsv-name',l:'고객명 *',type:'text',ph:'홍길동'},
  {id:'rsv-phone',l:'연락처',type:'tel',ph:'010-0000-0000'},
  {id:'rsv-date',l:'날짜 *',type:'date',val:dateStr||_today()},
  {id:'rsv-time',l:'시간',type:'time',val:'10:00'},
  {id:'rsv-service',l:'서비스/내용',type:'text',ph:'커트, 컬러, 마사지...'},
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
 saveBtn.id='rsv-save';
 saveBtn.style.cssText='flex:2;padding:11px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-weight:700;cursor:pointer';
 saveBtn.textContent='예약 등록';
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
   _filoToast('예약이 등록됐습니다');
   mo.remove();
   _filoRenderCalendar(did);
  }).catch(function(e){_filoToast('오류: '+e.message);});
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
  _filoToast('예약이 삭제됐습니다');
  _filoRenderCalendar(did);
 });
}

function _filoReservationEdit(id,did){
 _db.collection('filo_bookings').doc(id).get().then(function(snap){
  if(!snap.exists)return;
  var d=snap.data();
  var mo=document.createElement('div');mo.className='mo';
  var box=document.createElement('div');
  box.style.cssText='padding:22px;width:100%;max-width:440px;max-height:85vh;overflow-y:auto';
  var ttl=document.createElement('div');
  ttl.style.cssText='font-size:15px;font-weight:900;margin-bottom:16px';
  ttl.textContent='예약 수정';
  box.appendChild(ttl);
  var fields=[
   {id:'re-name',l:'고객명 *',type:'text',val:d.customerName||''},
   {id:'re-phone',l:'연락처',type:'tel',val:d.phone||''},
   {id:'re-date',l:'날짜 *',type:'date',val:d.date||_today()},
   {id:'re-time',l:'시간',type:'time',val:d.time||''},
   {id:'re-service',l:'서비스/내용',type:'text',val:d.service||'',ph:'커트, 컬러, 마사지...'},
   {id:'re-memo',l:'메모',type:'text',val:d.memo||'',ph:'특이사항'},
  ];
  fields.forEach(function(f){
   var g=document.createElement('div');g.style.marginBottom='12px';
   var l=document.createElement('label');
   l.style.cssText='font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.6px';
   l.textContent=f.l;
   var inp=document.createElement('input');
   inp.id=f.id;inp.type=f.type||'text';inp.placeholder=f.ph||'';inp.value=f.val||'';
   inp.style.cssText='width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none';
   g.appendChild(l);g.appendChild(inp);box.appendChild(g);
  });
  var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:8px;margin-top:4px';
  var cancelBtn=document.createElement('button');
  cancelBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);cursor:pointer';
  cancelBtn.textContent='취소';cancelBtn.onclick=function(){mo.remove();};
  var saveBtn=document.createElement('button');
  saveBtn.style.cssText='flex:2;padding:11px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-weight:700;cursor:pointer';
  saveBtn.textContent='수정 완료';
  saveBtn.onclick=function(){
   var name=(document.getElementById('re-name').value||'').trim();
   var date=(document.getElementById('re-date').value||'').trim();
   if(!name||!date){_filoToast('고객명과 날짜는 필수입니다');return;}
   _db.collection('filo_bookings').doc(id).update({
    customerName:name,
    phone:document.getElementById('re-phone').value||'',
    date:date,time:document.getElementById('re-time').value||'',
    service:document.getElementById('re-service').value||'',
    memo:document.getElementById('re-memo').value||'',
    updatedAt:_nowISO()
   }).then(function(){
    _filoToast('예약이 수정됐습니다');
    mo.remove();
    _filoRenderCalendar(did);
   }).catch(function(e){_filoToast('오류: '+e.message);});
  };
  btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
  box.appendChild(btnRow);
  mo.appendChild(box);
  mo.onclick=function(e){if(e.target===mo)mo.remove();};
  document.body.appendChild(mo);
  setTimeout(function(){document.getElementById('re-name').focus();},100);
 });
}

// ── 웨이팅 관리 페이지 ──────────────────────────────────────────
function _filoPageWaiting(el){
 var did=_CU.dealerId||_CU.uid;
 if(window._waitUnsub){window._waitUnsub();window._waitUnsub=null;}
 if(window._waitSeatedUnsub){window._waitSeatedUnsub();window._waitSeatedUnsub=null;}
 var today=_today();
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:700px;margin:0 auto';

 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
 hdr.innerHTML='<div><div style="font-size:20px;font-weight:900;color:var(--tx)">웨이팅 관리</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-top:2px">실시간 대기 현황</div></div>';
 var btnRow2=document.createElement('div');
 btnRow2.style.cssText='display:flex;gap:8px';
 var qrBtn=document.createElement('button');
 qrBtn.style.cssText='padding:10px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;color:var(--tx);display:flex;align-items:center;gap:6px';
 qrBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>입구 QR';
 qrBtn.onclick=function(){_filoShowEntranceQR(did);};
 var addBtn=document.createElement('button');
 addBtn.style.cssText='padding:10px 16px;background:var(--br);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer';
 addBtn.textContent='+ 대기 등록';
 addBtn.onclick=function(){_filoWaitingAdd(did);};
 btnRow2.appendChild(qrBtn);
 btnRow2.appendChild(addBtn);
 hdr.appendChild(btnRow2);
 wrap.appendChild(hdr);

 // 통계 3열: 대기중 / 예상대기 / 오늘착석
 var stats=document.createElement('div');
 stats.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px';
 stats.innerHTML=
  '<div class="card" style="padding:16px;border-radius:16px;text-align:center">'+
  '<div style="font-size:26px;font-weight:900;color:var(--br)" id="wait-cnt">0팀</div>'+
  '<div style="font-size:11px;color:var(--t3);margin-top:2px">대기중</div></div>'+
  '<div class="card" style="padding:16px;border-radius:16px;text-align:center">'+
  '<div style="font-size:26px;font-weight:900;color:#f59e0b" id="wait-time">없음</div>'+
  '<div style="font-size:11px;color:var(--t3);margin-top:2px">예상 대기</div></div>'+
  '<div class="card" style="padding:16px;border-radius:16px;text-align:center">'+
  '<div style="font-size:26px;font-weight:900;color:#22c55e" id="wait-seated">0팀</div>'+
  '<div style="font-size:11px;color:var(--t3);margin-top:2px">오늘 착석</div></div>';
 wrap.appendChild(stats);

 // 다음 팀 호출
 var callNextBtn=document.createElement('button');
 callNextBtn.style.cssText='width:100%;padding:14px;background:#c9a84c;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:16px';
 callNextBtn.textContent='다음 팀 호출';
 callNextBtn.onclick=function(){_filoWaitingCallNext(did);};
 wrap.appendChild(callNextBtn);

 // 호출됨 섹션
 var calledTitle=document.createElement('div');
 calledTitle.style.cssText='font-size:12px;font-weight:800;color:#f59e0b;margin-bottom:8px';
 calledTitle.textContent='호출됨 (입장 대기)';
 wrap.appendChild(calledTitle);
 var calledList=document.createElement('div');
 calledList.id='called-list';
 calledList.innerHTML='<div style="text-align:center;padding:16px;color:var(--t3);font-size:12px">없음</div>';
 wrap.appendChild(calledList);

 // 대기중 섹션
 var waitTitle=document.createElement('div');
 waitTitle.style.cssText='font-size:12px;font-weight:800;color:var(--t3);margin:16px 0 8px';
 waitTitle.textContent='대기 목록';
 wrap.appendChild(waitTitle);
 var waitList=document.createElement('div');
 waitList.id='wait-list';
 waitList.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3);font-size:13px">대기자 없음</div>';
 wrap.appendChild(waitList);
 el.appendChild(wrap);

 // 실시간: waiting + called
 // ponytail: status in [] 쿼리 — 기존 인덱스(dealerId,date,status,createdAt) 재사용 가능
 window._waitUnsub=_db.collection('dine_waiting')
  .where('dealerId','==',did).where('date','==',today)
  .where('status','in',['waiting','called'])
  .orderBy('createdAt')
  .onSnapshot(function(snap){
   var waiting=[];var called=[];
   snap.forEach(function(doc){
    var w=Object.assign({id:doc.id},doc.data());
    if(w.status==='called')called.push(w);else waiting.push(w);
   });
   var cnt=waiting.length;
   var cntEl=document.getElementById('wait-cnt');
   var timeEl=document.getElementById('wait-time');
   var waitEl=document.getElementById('wait-list');
   var callEl=document.getElementById('called-list');
   if(cntEl)cntEl.textContent=cnt+'팀';
   // ponytail: 팀당 5분 고정 — 팀별 평균 시간 설정 필요 시 dealer settings에 추가
   if(timeEl)timeEl.textContent=cnt>0?(cnt*5)+'분':'없음';
   if(callEl){
    if(!called.length){callEl.innerHTML='<div style="text-align:center;padding:16px;color:var(--t3);font-size:12px">없음</div>';}
    else{callEl.innerHTML='';called.forEach(function(w){callEl.appendChild(_filoWaitCard(w,did,true));});}
   }
   if(waitEl){
    if(!cnt){waitEl.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3);font-size:13px">대기자 없음</div>';return;}
    waitEl.innerHTML='';
    var num=1;
    waiting.forEach(function(w){waitEl.appendChild(_filoWaitCard(w,did,false,num++));});
   }
  },function(){});

 // 착석 카운트 리스너
 window._waitSeatedUnsub=_db.collection('dine_waiting')
  .where('dealerId','==',did).where('date','==',today).where('status','==','seated')
  .onSnapshot(function(snap){var e=document.getElementById('wait-seated');if(e)e.textContent=snap.size+'팀';},function(){});
}

// 웨이팅 카드 공통 빌더
function _filoWaitCard(w,did,isCalled,num){
 var waitMin=w.createdAt?Math.floor((Date.now()-(w.createdAt.seconds||0)*1000)/60000):0;
 var card=document.createElement('div');
 card.className='card';
 card.style.cssText='padding:14px 16px;margin-bottom:8px;border-radius:14px;display:flex;align-items:center;gap:12px;border-left:3px solid '+(isCalled?'#f59e0b':'#c9a84c');
 var badge=document.createElement('div');
 badge.style.cssText='width:32px;height:32px;border-radius:50%;background:'+(isCalled?'#f59e0b':'var(--br)')+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:'+(isCalled?'10':'14')+'px;font-weight:900;flex-shrink:0';
 badge.textContent=isCalled?'호출':num;
 card.appendChild(badge);
 var info=document.createElement('div');
 info.style.cssText='flex:1;min-width:0';
 info.innerHTML='<div style="font-size:14px;font-weight:700;color:var(--tx)">'+(w.name||'손님')+'</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-top:2px">'+(w.seats||1)+'명 · '+waitMin+'분 전'+(w.phone?' · '+w.phone:'')+'</div>';
 var btns=document.createElement('div');
 btns.style.cssText='display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end';
 var wid=w.id;var wname=w.name||'손님';
 if(!isCalled){
  var callB=document.createElement('button');
  callB.style.cssText='padding:6px 12px;background:#c9a84c;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer';
  callB.textContent='호출';callB.onclick=function(){_filoWaitingCall(wid,did,wname);};
  btns.appendChild(callB);
 }
 var doneB=document.createElement('button');
 doneB.style.cssText='padding:6px 12px;background:var(--surface2);color:var(--tx);border:1px solid var(--bd);border-radius:8px;font-size:12px;cursor:pointer';
 doneB.textContent='착석';doneB.onclick=function(){_filoWaitingDone(wid,did,wname);};
 var noshowB=document.createElement('button');
 noshowB.style.cssText='padding:6px 10px;background:#fff7ed;color:#f97316;border:1px solid #fed7aa;border-radius:8px;font-size:12px;cursor:pointer';
 noshowB.textContent='노쇼';noshowB.onclick=function(){_filoWaitingNoshow(wid);};
 var cancelB=document.createElement('button');
 cancelB.style.cssText='padding:6px 10px;background:#fee2e2;color:#ef4444;border:none;border-radius:8px;font-size:12px;cursor:pointer';
 cancelB.textContent='취소';cancelB.onclick=function(){_filoWaitingCancel(wid,did,wname);};
 btns.appendChild(doneB);btns.appendChild(noshowB);btns.appendChild(cancelB);
 card.appendChild(info);card.appendChild(btns);
 return card;
}

function _filoWaitingAdd(did){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:400px';
 var ttl=document.createElement('div');
 ttl.style.cssText='font-size:15px;font-weight:900;margin-bottom:16px';
 ttl.textContent='대기 등록';
 box.appendChild(ttl);
 var fields=[
  {id:'wt-name',l:'손님 성함 *',type:'text',ph:'홍길동'},
  {id:'wt-seats',l:'인원수',type:'number',ph:'2',val:'2'},
  {id:'wt-phone',l:'연락처 (선택)',type:'tel',ph:'010-0000-0000'},
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
 saveBtn.textContent='등록';
 saveBtn.onclick=function(){
  var name=(document.getElementById('wt-name').value||'').trim();
  if(!name){_filoToast('성함을 입력해주세요');return;}
  var seats=parseInt(document.getElementById('wt-seats').value||'2')||2;
  var phone=document.getElementById('wt-phone').value||'';
  _db.collection('dine_waiting').add({
   dealerId:did,name:name,seats:seats,phone:phone,
   date:_today(),status:'waiting',
   createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(ref){
   mo.remove();
   var waitUrl='https://filo.ai.kr/wait?d='+did+'&w='+ref.id;
   _filoToast('등록 완료');
   _filoWaitingNotify(did,'새 웨이팅 등록',name+'님 '+seats+'명 대기','waiting');
   _filoShowWaitQR(waitUrl,name,ref.id);
  }).catch(function(e){_filoToast('오류: '+e.message);});
 };
 btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
 box.appendChild(btnRow);
 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
 setTimeout(function(){document.getElementById('wt-name').focus();},100);
}

function _filoWaitingCall(wid,did,name){
 _db.collection('dine_waiting').doc(wid).update({
  status:'called',calledAt:firebase.firestore.FieldValue.serverTimestamp()
 }).then(function(){
  _filoToast(name+'님 호출');
  _filoWaitingNotify(did,'손님 호출',name+'님을 호출했어요!','called');
  _filoWaitingNotifyGuest(wid,'입장 차례입니다','지금 입구로 와주세요!');
 });
}
function _filoWaitingDone(wid,did,name){
 _db.collection('dine_waiting').doc(wid).update({
  status:'seated',seatedAt:firebase.firestore.FieldValue.serverTimestamp()
 }).then(function(){
  _filoToast((name||'손님')+'님 착석 처리');
  _filoWaitingNotifyGuest(wid,'착석 완료','즐거운 식사 되세요!');
 });
}
function _filoWaitingCancel(wid,did,name){
 if(!confirm('대기를 취소하시겠어요?'))return;
 _db.collection('dine_waiting').doc(wid).update({status:'cancelled'})
  .then(function(){
   _filoToast('취소됐습니다');
   _filoWaitingNotifyGuest(wid,'대기 취소','대기가 취소됐어요.');
  });
}
function _filoWaitingNoshow(wid){
 if(!confirm('노쇼 처리하시겠어요?'))return;
 _db.collection('dine_waiting').doc(wid).update({
  status:'noshow',noshowAt:firebase.firestore.FieldValue.serverTimestamp()
 }).then(function(){_filoToast('노쇼 처리됐습니다');});
}
function _filoWaitingCallNext(did){
 _db.collection('dine_waiting').where('dealerId','==',did).where('date','==',_today())
  .where('status','==','waiting').orderBy('createdAt').limit(1).get()
  .then(function(snap){
   if(snap.empty){_filoToast('대기자 없음');return;}
   var doc=snap.docs[0];
   var name=doc.data().name||'손님';
   doc.ref.update({status:'called',calledAt:firebase.firestore.FieldValue.serverTimestamp()});
   _filoToast(name+'님 호출');
   _filoWaitingNotify(did,'다음 팀 호출',name+'님 안내해 주세요','called');
   _filoWaitingNotifyGuest(doc.id,'입장 차례입니다','지금 입구로 와주세요!');
  });
}

// ── 고객 테이블 예약 ──────────────────────────────────────────────
function _filoPageTableBooking(el){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 var now=new Date();var selYear=now.getFullYear();var selMonth=now.getMonth();var selDate=null;var selTime=null;var seats=2;
 el.innerHTML='';var wrap=document.createElement('div');wrap.className='slide-up';wrap.style.cssText='max-width:680px;margin:0 auto';
 var hdr=document.createElement('div');hdr.innerHTML='<div style="font-size:22px;font-weight:900;color:var(--tx);margin-bottom:4px">테이블 예약</div><div style="font-size:12px;color:var(--t3);margin-bottom:20px">원하시는 날짜와 시간을 선택해 주세요</div>';wrap.appendChild(hdr);
 var calCard=document.createElement('div');calCard.className='card';calCard.style.cssText='padding:20px;border-radius:20px;margin-bottom:14px';
 function renderCal(){
  calCard.innerHTML='';
  var calHdr=document.createElement('div');calHdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
  var prev=document.createElement('button');prev.style.cssText='width:32px;height:32px;border-radius:50%;border:1.5px solid var(--bd);background:var(--surface);cursor:pointer;font-size:16px;color:var(--tx)';prev.textContent='‹';prev.onclick=function(){selMonth--;if(selMonth<0){selMonth=11;selYear--;}renderCal();};
  var next=document.createElement('button');next.style.cssText=prev.style.cssText;next.textContent='›';next.onclick=function(){selMonth++;if(selMonth>11){selMonth=0;selYear++;}renderCal();};
  var title=document.createElement('div');title.style.cssText='font-size:16px;font-weight:800;color:var(--tx)';title.textContent=selYear+'년 '+(selMonth+1)+'월';
  calHdr.appendChild(prev);calHdr.appendChild(title);calHdr.appendChild(next);calCard.appendChild(calHdr);
  var dowRow=document.createElement('div');dowRow.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:8px';
  ['일','월','화','수','목','금','토'].forEach(function(d){var c=document.createElement('div');c.style.cssText='text-align:center;font-size:12px;font-weight:700;color:var(--t3);padding:4px 0';c.textContent=d;dowRow.appendChild(c);});calCard.appendChild(dowRow);
  var grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:4px';
  var todayStr=now.toISOString().slice(0,10);var firstDay=new Date(selYear,selMonth,1).getDay();var lastDate=new Date(selYear,selMonth+1,0).getDate();
  for(var i=0;i<firstDay;i++){var e=document.createElement('div');grid.appendChild(e);}
  for(var d=1;d<=lastDate;d++){
   var dt=selYear+'-'+String(selMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
   var isPast=dt<todayStr;var isToday=dt===todayStr;var isSel=dt===selDate;
   var cell=document.createElement('div');
   cell.style.cssText='text-align:center;padding:8px 4px;border-radius:10px;cursor:'+(isPast?'not-allowed':'pointer')+';font-size:13px;font-weight:'+(isSel||isToday?'800':'500')+';background:'+(isSel?'#c9a84c':isToday?'rgba(201,168,76,.12)':'transparent')+';color:'+(isSel?'#fff':isPast?'var(--t3)':isToday?'#c9a84c':'var(--tx)')+';opacity:'+(isPast?.4:1);
   cell.textContent=d;
   if(!isPast){(function(ds){cell.onclick=function(){selDate=ds;renderCal();renderTime();};})(dt);}
   grid.appendChild(cell);
  }
  calCard.appendChild(grid);
 }
 wrap.appendChild(calCard);
 var timeCard=document.createElement('div');timeCard.className='card';timeCard.style.cssText='padding:20px;border-radius:20px;margin-bottom:14px';wrap.appendChild(timeCard);
 function renderTime(){
  timeCard.innerHTML='<div style="font-size:12px;font-weight:800;color:var(--t3);margin-bottom:12px">시간 선택</div>';
  var slots=['12:00','12:30','13:00','13:30','18:00','18:30','19:00','19:30','20:00'];
  var g=document.createElement('div');g.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:8px';
  slots.forEach(function(t){
   var b=document.createElement('button');b.style.cssText='padding:12px;border:2px solid var(--bd);border-radius:12px;background:var(--surface);font-size:13px;font-weight:600;cursor:pointer;color:var(--tx);transition:.2s';b.textContent=t;
   b.onclick=function(){g.querySelectorAll('button').forEach(function(x){x.style.background='var(--surface)';x.style.borderColor='var(--bd)';x.style.color='var(--tx)';});b.style.background='rgba(201,168,76,.15)';b.style.borderColor='#c9a84c';b.style.color='#c9a84c';selTime=t;updateBtn();};
   g.appendChild(b);
  });
  timeCard.appendChild(g);
 }
 var seatsCard=document.createElement('div');seatsCard.className='card';seatsCard.style.cssText='padding:20px;border-radius:20px;margin-bottom:14px';
 seatsCard.innerHTML='<div style="font-size:12px;font-weight:800;color:var(--t3);margin-bottom:12px">인원수</div>'+
  '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">'+
  '<button onclick="window._tbS(-1)" style="width:36px;height:36px;border-radius:50%;border:1.5px solid var(--bd);background:var(--surface);font-size:20px;cursor:pointer;color:var(--tx)">−</button>'+
  '<span id="tb-seats" style="font-size:22px;font-weight:900;min-width:40px;text-align:center;color:var(--tx)">2명</span>'+
  '<button onclick="window._tbS(1)" style="width:36px;height:36px;border-radius:50%;border:1.5px solid var(--bd);background:var(--surface);font-size:20px;cursor:pointer;color:var(--tx)">+</button>'+
  '<span style="font-size:11px;color:var(--t3)">최대 8명</span></div>'+
  '<button id="tb-btn" disabled style="width:100%;height:52px;background:#ccc;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:800;cursor:not-allowed">예약하기</button>';
 wrap.appendChild(seatsCard);
 el.appendChild(wrap);
 window._tbS=function(d){seats=Math.max(1,Math.min(8,seats+d));var e=document.getElementById('tb-seats');if(e)e.textContent=seats+'명';};
 function updateBtn(){var b=document.getElementById('tb-btn');if(!b)return;var ok=!!selDate&&!!selTime;b.disabled=!ok;b.style.background=ok?'linear-gradient(135deg,#c9a84c,#6d28d9)':'#ccc';b.style.cursor=ok?'pointer':'not-allowed';b.onclick=ok?function(){_tbBook(did,selDate,selTime,seats);}:null;}
 renderCal();renderTime();
}

function _tbBook(did,date,time,seats){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:380px';
 var ttl=document.createElement('div');
 ttl.style.cssText='font-size:15px;font-weight:900;margin-bottom:4px';
 ttl.textContent='예약 정보 입력';
 var sub=document.createElement('div');
 sub.style.cssText='font-size:12px;color:var(--t3);margin-bottom:16px';
 sub.textContent=date+' '+time+' · '+seats+'명';
 box.appendChild(ttl);box.appendChild(sub);
 var fields=[
  {id:'tb-name',l:'예약자 성함 *',type:'text',ph:'홍길동'},
  {id:'tb-phone',l:'연락처 *',type:'tel',ph:'010-0000-0000'},
 ];
 fields.forEach(function(f){
  var g=document.createElement('div');g.style.marginBottom='12px';
  var l=document.createElement('label');
  l.style.cssText='font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.6px';
  l.textContent=f.l;
  var inp=document.createElement('input');
  inp.id=f.id;inp.type=f.type;inp.placeholder=f.ph||'';
  inp.style.cssText='width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none';
  g.appendChild(l);g.appendChild(inp);box.appendChild(g);
 });
 var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:8px;margin-top:4px';
 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);cursor:pointer';
 cancelBtn.textContent='취소';cancelBtn.onclick=function(){mo.remove();};
 var saveBtn=document.createElement('button');
 saveBtn.style.cssText='flex:2;padding:11px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-weight:700;cursor:pointer';
 saveBtn.textContent='예약 확인';
 saveBtn.onclick=function(){
  var name=(document.getElementById('tb-name').value||'').trim();
  var phone=(document.getElementById('tb-phone').value||'').trim();
  if(!name||!phone){_filoToast('성함과 연락처를 입력해주세요');return;}
  _db.collection('filo_bookings').add({
   dealerId:did,customerName:name,phone:phone,
   date:date,time:time||'',seats:seats,
   status:'pending',createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){
   _filoToast(date+' '+time+' '+seats+'명 예약됐습니다');
   mo.remove();
  }).catch(function(e){_filoToast('오류: '+e.message);});
 };
 btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
 box.appendChild(btnRow);
 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
 setTimeout(function(){document.getElementById('tb-name').focus();},100);
}

// ── 웨이팅 FCM 알림 ──────────────────────────────────────────────
function _filoWaitingNotify(did,title,body,type){
 fetch('/api/ctrl-notify',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({type:'dealer',dealerId:did,title:title,body:body,data:{page:'waiting',action:type}})
 }).then(function(res){if(!res.ok)console.warn('웨이팅 알림 실패:',res.status);}).catch(function(e){console.warn('웨이팅 알림 오류:',e.message);});
}

function _filoShowWaitQR(url,name,wid){
 var overlay=document.createElement('div');
 overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
 var modal=document.createElement('div');
 modal.style.cssText='background:var(--surface);border-radius:24px;padding:28px 24px;max-width:300px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)';
 var qrId='wqr'+wid;
 modal.innerHTML=
  '<div style="font-size:13px;font-weight:800;color:var(--t3);margin-bottom:4px">웨이팅 등록 완료</div>'+
  '<div style="font-size:16px;font-weight:900;color:var(--tx);margin-bottom:16px">'+esc(name)+'님 QR 안내</div>'+
  '<div id="'+qrId+'" style="width:160px;height:160px;margin:0 auto 12px"></div>'+
  '<div style="font-size:12px;color:var(--t3);margin-bottom:16px;line-height:1.6">손님 폰으로 스캔하면<br>실시간 대기 현황 + 호출 알림</div>'+
  '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="width:100%;padding:14px;background:var(--br);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">확인</button>';
 overlay.appendChild(modal);
 document.body.appendChild(overlay);
 overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
 function makeQR(){
  if(typeof QRCode!=='undefined'){
   new QRCode(document.getElementById(qrId),{text:url,width:160,height:160,correctLevel:QRCode.CorrectLevel.M});
  } else {
   var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';s.onload=makeQR;document.head.appendChild(s);
  }
 }
 setTimeout(makeQR,100);
}

function _filoShowEntranceQR(did){
 var url='https://filo.ai.kr/wait-join?d='+did;
 var overlay=document.createElement('div');
 overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)';
 var modal=document.createElement('div');
 modal.style.cssText='background:var(--surface);border-radius:24px;padding:28px 24px;max-width:320px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)';
 var qrId='eqr'+Date.now();
 modal.innerHTML=
  '<div style="font-size:11px;font-weight:800;color:var(--t3);letter-spacing:1px;margin-bottom:4px">입구 QR</div>'+
  '<div style="font-size:16px;font-weight:900;color:var(--tx);margin-bottom:16px">손님 자가 등록</div>'+
  '<div id="'+qrId+'" style="width:180px;height:180px;margin:0 auto 12px"></div>'+
  '<div style="font-size:12px;color:var(--t3);line-height:1.7;margin-bottom:16px">손님이 QR을 스캔하면<br>직접 대기 등록을 할 수 있어요</div>'+
  '<div style="font-size:10px;color:var(--t3);word-break:break-all;margin-bottom:16px;background:var(--surface2);border-radius:8px;padding:8px">'+esc(url)+'</div>'+
  '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="width:100%;padding:14px;background:var(--br);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">닫기</button>';
 overlay.appendChild(modal);
 document.body.appendChild(overlay);
 overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
 function makeQR(){
  if(typeof QRCode!=='undefined'){
   new QRCode(document.getElementById(qrId),{text:url,width:180,height:180,correctLevel:QRCode.CorrectLevel.M});
  } else {
   var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';s.onload=makeQR;document.head.appendChild(s);
  }
 }
 setTimeout(makeQR,100);
}

function _filoWaitingNotifyGuest(wid,title,body){
 _db.collection('dine_waiting').doc(wid).get().then(function(snap){
  if(!snap.exists)return;
  var token=snap.data().guestFcmToken;
  if(!token)return;
  fetch('/api/ctrl-notify',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({type:'token',token:token,title:title,body:body,data:{page:'wait',wid:wid,action:'called'}})
  }).catch(function(){});
 }).catch(function(){});
}
