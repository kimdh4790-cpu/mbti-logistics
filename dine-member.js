// dine-member.js — 회원관리, 예약
// dine.js에서 분리됨 (리팩토링 2026-07-13)

function _dineMember(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">🎁 회원 관리</div><div class="page-sub">포인트·스탬프·등급</div></div>'+
  '<button class="btn btn-primary btn-sm" onclick="_dineAddMember(\''+did+'\')" style="font-size:12px">+ 회원 등록</button>'+
  '</div>'+
  '<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px" id="member-kpi"></div>'+
  '<div class="card" id="member-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩중</div></div>';
 el.appendChild(wrap);

 _db.collection('filo_customers').where('dealerId','==',did).orderBy('createdAt','desc').limit(50).get()
  .then(function(snap){
   var kpi=document.getElementById('member-kpi');
   if(kpi)kpi.innerHTML=
    '<div class="kpi-card" style="border-top:2px solid #38bdf8"><div class="kpi-label">👥 총 회원</div><div class="kpi-val" style="color:#38bdf8">'+snap.size+'명</div></div>'+
    '<div class="kpi-card" style="border-top:2px solid #22c55e"><div class="kpi-label">⭐ 포인트 보유</div><div class="kpi-val" style="color:#22c55e">'+snap.docs.filter(function(d){return (d.data().point||0)>0;}).length+'명</div></div>'+
    '<div class="kpi-card" style="border-top:2px solid #f59e0b"><div class="kpi-label">📅 이번달 신규</div><div class="kpi-val" style="color:#f59e0b">'+snap.docs.filter(function(d){return (d.data().createdAt||'').startsWith(new Date().toISOString().slice(0,7));}).length+'명</div></div>';

   var list=document.getElementById('member-list');if(!list)return;
   if(snap.empty){list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3);font-size:12px">FILO QR 회원가입으로 자동 등록됩니다</div>';return;}
   list.innerHTML='<div class="sec-title" style="margin-bottom:10px">회원 목록</div>'+
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
    '<thead><tr style="border-bottom:1px solid var(--bd)">'+
    ['이름','연락처','포인트','스탬프','가입일',''].map(function(h){return '<th style="padding:8px;text-align:left;color:var(--t3)">'+h+'</th>';}).join('')+
    '</tr></thead><tbody>'+
    snap.docs.map(function(doc){
     var d=doc.data();
     return '<tr style="border-bottom:1px solid var(--bd)">'+
      '<td style="padding:8px;font-weight:700">'+(d.name||'-')+'</td>'+
      '<td style="padding:8px;color:var(--t2)">'+(d.phone||'-')+'</td>'+
      '<td style="padding:8px;color:var(--yl);font-weight:700">'+(d.point||0)+'P</td>'+
      '<td style="padding:8px">'+(d.stamp||0)+'개</td>'+
      '<td style="padding:8px;color:var(--t3)">'+(d.createdAt||'').slice(0,10)+'</td>'+
      '<td style="padding:8px"><button onclick="_dineAddMember(\''+did+'\'  ,\''+doc.id+'\','+JSON.stringify(d)+')" style="padding:3px 8px;border:1px solid var(--bd);border-radius:6px;background:transparent;color:var(--t2);font-size:10px;cursor:pointer">수정</button></td>'+
      '</tr>';
    }).join('')+'</tbody></table></div>';
  });
}

function _dineAddMember(did,memberId,existing){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
 var title=memberId?'✏️ 회원 수정':'👤 회원 등록';
 box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">'+title+'</div>'+
  '<div class="input-group"><label>이름 *</label><input id="mb-name" class="inp" placeholder="홍길동" value="'+(existing&&existing.name||'')+'"></div>'+
  '<div class="input-group"><label>연락처 *</label><input id="mb-phone" class="inp" type="tel" placeholder="010-0000-0000" value="'+(existing&&existing.phone||'')+'"></div>'+
  '<div class="input-group"><label>생년월일</label><input id="mb-birth" class="inp" type="date" value="'+(existing&&existing.birth||'')+'"></div>'+
  '<div style="display:flex;gap:8px">'+
  '<div class="input-group" style="flex:1"><label>포인트</label><input id="mb-point" class="inp" type="number" min="0" value="'+(existing&&existing.point||0)+'"></div>'+
  '<div class="input-group" style="flex:1"><label>스탬프</label><input id="mb-stamp" class="inp" type="number" min="0" value="'+(existing&&existing.stamp||0)+'"></div>'+
  '</div>'+
  '<div class="input-group"><label>등급</label><select id="mb-grade" class="inp">'+
  ['일반','실버','골드','VIP'].map(function(g){return '<option value="'+g+'"'+((existing&&existing.grade===g)?' selected':'')+'>'+g+'</option>';}).join('')+
  '</select></div>'+
  '<div class="input-group"><label>메모</label><input id="mb-memo" class="inp" placeholder="특이사항" value="'+(existing&&existing.memo||'')+'"></div>'+
  '<div style="display:flex;gap:8px;margin-top:16px">'+
  '<button class="btn btn-primary" style="flex:1" id="mb-save-btn">저장</button>'+
  '<button class="btn btn-ghost" onclick="this.closest(\'.mo\').remove()">취소</button>'+
  '</div>';
 box.querySelector('#mb-save-btn').onclick=function(){
  var name=document.getElementById('mb-name').value.trim();
  var phone=document.getElementById('mb-phone').value.trim();
  if(!name||!phone){alert('이름과 연락처를 입력하세요');return;}
  var data={dealerId:did,name:name,phone:phone,
   birth:document.getElementById('mb-birth').value,
   point:parseInt(document.getElementById('mb-point').value)||0,
   stamp:parseInt(document.getElementById('mb-stamp').value)||0,
   grade:document.getElementById('mb-grade').value,
   memo:document.getElementById('mb-memo').value.trim(),
   updatedAt:new Date().toISOString()};
  var pr=memberId?_db.collection('filo_customers').doc(memberId).set(data,{merge:true}):_db.collection('filo_customers').add(Object.assign(data,{createdAt:new Date().toISOString()}));
  pr.then(function(){_dineToast('✅ 저장됐습니다');mo.remove();_dinePage('member',null);}).catch(function(e){alert(e.message);});
 };
 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

function _dineReservation(el){
 var did=_CU.dealerId;
 var today=new Date().toISOString().slice(0,10);
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">📆 예약 관리</div><div class="page-sub">테이블 예약 현황</div></div>'+
  '<div style="display:flex;gap:8px">'+
  '<input type="date" id="res-date" value="'+today+'" class="inp" style="width:auto;padding:6px 10px;font-size:12px" onchange="_dineLoadReservation(\''+did+'\')">'+
  '<button class="btn btn-primary btn-sm" onclick="_dineAddReservation(\''+did+'\')">+ 예약 추가</button>'+
  '</div></div>'+
  '<div id="reservation-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩중</div></div>';
 el.appendChild(wrap);
 _dineLoadReservation(did);
}

function _dineLoadReservation(did){
 var date=document.getElementById('res-date')?.value||new Date().toISOString().slice(0,10);
 _db.collection('filo_bookings').where('dealerId','==',did).where('date','==',date)
  .orderBy('time').get().then(function(snap){
   var list=document.getElementById('reservation-list');if(!list)return;
   if(snap.empty){list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3);font-size:12px">'+date+' 예약 없음</div>';return;}
   var sc={pending:{c:'#f59e0b',l:'대기'},confirmed:{c:'#22c55e',l:'확정'},cancelled:{c:'#ef4444',l:'취소'}};
   list.innerHTML=snap.docs.map(function(doc){
    var b=doc.data();var s=sc[b.status||'pending'];
    return '<div class="card" style="margin-bottom:8px;padding:12px;display:flex;align-items:center;gap:12px">'+
     '<div style="text-align:center;min-width:50px"><div style="font-size:16px;font-weight:900;color:var(--br)">'+(b.time||'')+'</div></div>'+
     '<div style="flex:1">'+
     '<div style="display:flex;justify-content:space-between;align-items:center">'+
     '<span style="font-size:14px;font-weight:800">'+(b.customerName||'고객')+'</span>'+
     '<span style="font-size:10px;font-weight:700;color:'+s.c+'">'+s.l+'</span>'+
     '</div>'+
     '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+
     (b.seats?b.seats+'인 · ':'')+
     (b.memo||'')+
     '</div></div>'+
     (b.status!=='confirmed'?'<button onclick="_dineConfirmRes(\''+doc.id+'\',\''+did+'\')" style="padding:5px 10px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:8px;color:#22c55e;font-size:10px;font-weight:700;cursor:pointer">확정</button>':'')+
     (b.status!=='cancelled'?'<button onclick="_dineCancelRes(\''+doc.id+'\',\''+did+'\')" style="padding:5px 10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:8px;color:#ef4444;font-size:10px;font-weight:700;cursor:pointer;margin-left:4px">취소</button>':'')+
     '</div>';
   }).join('');
  });
}

function _dineConfirmRes(id,did){
 _db.collection('filo_bookings').doc(id).update({status:'confirmed'})
  .then(function(){_dineToast('✅ 확정됐습니다');_dineLoadReservation(did);});
}

function _dineCancelRes(id,did){
 if(!confirm('취소하시겠습니까?'))return;
 _db.collection('filo_bookings').doc(id).update({status:'cancelled'})
  .then(function(){_dineToast('🗑 취소됐습니다');_dineLoadReservation(did);});
}

function _dineAddReservation(did){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
 var today=new Date().toISOString().slice(0,10);
 box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">📆 예약 추가</div>'+
  '<div class="input-group"><label>고객명</label><input id="r-name" class="inp" placeholder="홍길동"></div>'+
  '<div class="input-group"><label>연락처</label><input id="r-phone" class="inp" type="tel" placeholder="010-0000-0000"></div>'+
  '<div style="display:flex;gap:8px">'+
  '<div class="input-group" style="flex:1"><label>날짜</label><input id="r-date" class="inp" type="date" value="'+today+'"></div>'+
  '<div class="input-group" style="flex:1"><label>시간</label><input id="r-time" class="inp" type="time" value="12:00"></div>'+
  '</div>'+
  '<div class="input-group"><label>인원</label><input id="r-seats" class="inp" type="number" value="2" min="1"></div>'+
  '<div class="input-group"><label>메모</label><input id="r-memo" class="inp" placeholder="요청사항"></div>'+
  '<div style="display:flex;gap:8px;margin-top:12px">'+
  '<button class="btn btn-primary" style="flex:1" onclick="_dineSaveReservation(\''+did+'\')">저장</button>'+
  '<button class="btn btn-ghost" onclick="this.closest(\'.mo\').remove()">취소</button></div>';
 mo.appendChild(box);mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

function _dineSaveReservation(did){
 var data={dealerId:did,
  customerName:document.getElementById('r-name').value.trim(),
  phone:document.getElementById('r-phone').value,
  date:document.getElementById('r-date').value,
  time:document.getElementById('r-time').value,
  seats:parseInt(document.getElementById('r-seats').value)||2,
  memo:document.getElementById('r-memo').value,
  status:'pending',createdAt:new Date().toISOString()};
 if(!data.customerName){alert('고객명 입력');return;}
 _db.collection('filo_bookings').add(data).then(function(){
  _dineToast('✅ 예약 등록됐습니다');document.querySelector('.mo')?.remove();
  _dineLoadReservation(did);
 });
}

function _mtGo(page, btn){
 // 더보기 메뉴 닫기
 _mtMoreClose();
 // 탭 활성화
 document.querySelectorAll('.mt-item').forEach(function(b){b.classList.remove('on');});
 if(btn) btn.classList.add('on');
 // 페이지 이동
 _dinePage(page, null);
}

function _mtMoreToggle(){
 var menu=document.getElementById('mt-more-menu');
 if(menu) menu.classList.toggle('open');
}

function _mtMoreClose(){
 var menu=document.getElementById('mt-more-menu');
 if(menu) menu.classList.remove('open');
}

// 더보기 메뉴 외부 터치 시 닫기
document.addEventListener('touchstart',function(e){
 var menu=document.getElementById('mt-more-menu');
 if(menu&&menu.classList.contains('open')){
  var moreBtn=document.querySelector('.mt-more');
  if(!menu.contains(e.target)&&moreBtn&&!moreBtn.contains(e.target)){
   menu.classList.remove('open');
  }
 }
});
