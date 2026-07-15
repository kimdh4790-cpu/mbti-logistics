/**
 * @module      filo-booking.js
 * ══════════════════════════════════════════════════════
 * 역할: 예약 · 달력 · 스케줄 · 예약확정/거절 · 알림
 *
 * 저장 컬렉션:
 *   filo_bookings — 예약 정보 (status: pending/confirmed/rejected)
 *   members       — 회원 FCM 토큰 조회 (알림용)
 *
 * 의존: filo-common.js (_CU, _db, _filoToast)
 *       filo-table.js (_filoTableLoad — 예약 확정/거절 후 테이블 갱신)
 *
 * 전역:
 *   window._calYear, window._calMonth — 캘린더 현재 연/월
 *   window._calUnsub                  — 달력 onSnapshot 리스너 해제용 (월 이동/페이지 이탈 시 자동 해제)
 *   window._bookingUnsub              — 테이블카드 예약 리스너 해제용
 *   window._filoBookingConfirm(bid,did) — 테이블카드에서 인라인 호출
 *   window._filoBookingReject(bid,did)  — 테이블카드에서 인라인 호출
 *   window._filoConfirmCall(callId,did) — 직원호출 확인 (filo-table.js에서 이동)
 *
 * 노출 함수:
 *   _filoPageSchedule(el)             — 예약·달력 페이지 진입
 *   _filoRenderCalendar(did)          — 달력 렌더링
 *   _filoCalDayClick(did,dateStr)     — 날짜 클릭
 *   _filoRenderTodayReservations(did,todayStr,bookings)
 *   _filoReservationAdd(did,dateStr,dateLabel)
 *   _filoReservationDelete(id)
 *   _filoReservationEdit(id,did)
 *   _filoNotifyReservation(did,booking,status) — 예약 알림 발송
 * ══════════════════════════════════════════════════════
 */

window._filoBookingConfirm=function(bid,did){
 _db.collection('filo_bookings').doc(bid).get().then(function(snap){
  var d=snap.data()||{};
  _db.collection('filo_bookings').doc(bid).update({status:'confirmed',confirmedAt:new Date().toISOString()})
  .then(function(){_filoToast('✅ 예약 확정');_filoTableLoad(did);_filoNotifyReservation(did,d,'confirmed');});
 });
};

window._filoBookingReject=function(bid,did){
 if(!confirm('예약을 거절하시겠습니까?')) return;
 _db.collection('filo_bookings').doc(bid).get().then(function(snap){
  var d=snap.data()||{};
  _db.collection('filo_bookings').doc(bid).update({status:'rejected',rejectedAt:new Date().toISOString()})
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
  {id:'rsv-date',l:'날짜 *',type:'date',ph:'',val:dateStr||new Date().toISOString().slice(0,10)},
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
   createdAt:new Date().toISOString()
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
