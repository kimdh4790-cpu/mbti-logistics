/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      dine-member.js
 * @description 고객관리·예약·실시간onSnapshot
 */
// dine.js에서 분리됨 (리팩토링 2026-07-13)
function _de(s){var d=document.createElement('div');d.textContent=String(s==null?'':s);return d.innerHTML;}

function _dineMember(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">회원 관리</div><div class="page-sub">포인트·스탬프·등급</div></div>'+
  '<button class="btn btn-primary btn-sm" onclick="_dineAddMember(\''+did+'\')" style="font-size:12px">+ 회원 등록</button>'+
  '</div>'+
  '<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px" id="member-kpi"></div>'+
  '<div class="card" id="member-list"><div style="text-align:center;padding:30px;color:var(--t3)">로딩 중...</div></div>';
 el.appendChild(wrap);

 _db.collection('filo_customers').where('dealerId','==',did).orderBy('createdAt','desc').limit(50).get()
  .then(function(snap){
   var kpi=document.getElementById('member-kpi');
   if(kpi)kpi.innerHTML=
    '<div class="kpi-card" style="border-top:2px solid #38bdf8"><div class="kpi-label">총 회원</div><div class="kpi-val" style="color:#38bdf8">'+snap.size+'명</div></div>'+
    '<div class="kpi-card" style="border-top:2px solid #22c55e"><div class="kpi-label">포인트 보유</div><div class="kpi-val" style="color:#22c55e">'+snap.docs.filter(function(d){return (d.data().point||0)>0;}).length+'명</div></div>'+
    '<div class="kpi-card" style="border-top:2px solid #f59e0b"><div class="kpi-label">이번달 신규</div><div class="kpi-val" style="color:#f59e0b">'+snap.docs.filter(function(d){return (d.data().createdAt||'').startsWith(_monthStr());}).length+'명</div></div>';

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
      '<td style="padding:8px;font-weight:700">'+_de(d.name||'-')+'</td>'+
      '<td style="padding:8px;color:var(--t2)">'+_de(d.phone||'-')+'</td>'+
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
 var title=memberId?'회원 수정':'회원 등록';
 box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">'+title+'</div>'+
  '<div class="input-group"><label>이름 *</label><input id="mb-name" class="inp" placeholder="홍길동" value="'+_de(existing&&existing.name||'')+'"></div>'+
  '<div class="input-group"><label>연락처 *</label><input id="mb-phone" class="inp" type="tel" placeholder="010-0000-0000" value="'+_de(existing&&existing.phone||'')+'"></div>'+
  '<div class="input-group"><label>생년월일</label><input id="mb-birth" class="inp" type="date" value="'+_de(existing&&existing.birth||'')+'"></div>'+
  '<div style="display:flex;gap:8px">'+
  '<div class="input-group" style="flex:1"><label>포인트</label><input id="mb-point" class="inp" type="number" min="0" value="'+(existing&&existing.point||0)+'"></div>'+
  '<div class="input-group" style="flex:1"><label>스탬프</label><input id="mb-stamp" class="inp" type="number" min="0" value="'+(existing&&existing.stamp||0)+'"></div>'+
  '</div>'+
  '<div class="input-group"><label>등급</label><select id="mb-grade" class="inp">'+
  ['일반','실버','골드','VIP'].map(function(g){return '<option value="'+g+'"'+((existing&&existing.grade===g)?' selected':'')+'>'+g+'</option>';}).join('')+
  '</select></div>'+
  '<div class="input-group"><label>메모</label><input id="mb-memo" class="inp" placeholder="특이사항" value="'+_de(existing&&existing.memo||'')+'"></div>'+
  '<div style="display:flex;gap:8px;margin-top:16px">'+
  '<button class="btn btn-primary" style="flex:1" id="mb-save-btn">저장</button>'+
  '<button class="btn btn-ghost" onclick="this.closest(\'.mo\').remove()">취소</button>'+
  '</div>';
 box.querySelector('#mb-save-btn').onclick=function(){
  var name=document.getElementById('mb-name').value.trim();
  var phone=document.getElementById('mb-phone').value.trim();
  if(!name||!phone){_dineToast('이름과 연락처를 입력하세요');return;}
  var prevPoint=existing&&existing.point!=null?existing.point:null;
  var data={dealerId:did,name:name,phone:phone,
   birth:document.getElementById('mb-birth').value,
   point:parseInt(document.getElementById('mb-point').value)||0,
   stamp:parseInt(document.getElementById('mb-stamp').value)||0,
   grade:document.getElementById('mb-grade').value,
   memo:document.getElementById('mb-memo').value.trim(),
   updatedAt:_nowISO()};
  var pr=memberId?_db.collection('filo_customers').doc(memberId).set(data,{merge:true}):_db.collection('filo_customers').add(Object.assign(data,{createdAt:_nowISO()}));
  pr.then(function(docRef){
   _dineToast('저장됐습니다');mo.remove();_dinePage('member',null);
   var docId=memberId||(docRef&&docRef.id);
   var pointDiff=prevPoint!=null?data.point-prevPoint:0;
   if(pointDiff>0&&docId){
    _db.collection('filo_customers').doc(docId).get().then(function(snap){
     var d=snap.data()||{};
     var tok=d.fcmToken;
     if(!tok)return;
     var compName=_CU&&_CU.companyName||'매장';
     fetch('/fcm/notify-drivers',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tokens:[tok],title:compName+' 포인트 적립',body:pointDiff+'P 적립됐습니다 (보유 '+data.point+'P)',type:'point',url:location.href})
     }).catch(function(){});
    }).catch(function(){});
   }
  }).catch(function(e){_dineToast('저장 오류: '+e.message);});
 };
 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

function _dineReservation(el){
 var did=_CU.dealerId;
 var today=_today();
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">예약 관리</div><div class="page-sub">테이블 예약 현황</div></div>'+
  '<div style="display:flex;gap:8px">'+
  '<input type="date" id="res-date" value="'+today+'" class="inp" style="width:auto;padding:6px 10px;font-size:12px" onchange="_dineLoadReservation(\''+did+'\')">'+
  '<button class="btn btn-primary btn-sm" onclick="_dineAddReservation(\''+did+'\')">+ 예약 추가</button>'+
  '</div></div>'+
  '<div id="reservation-list"><div style="text-align:center;padding:30px;color:var(--t3)">로딩 중...</div></div>';
 el.appendChild(wrap);
 _dineLoadReservation(did);
}

function _dineLoadReservation(did){
 var date=document.getElementById('res-date')?.value||_today();
 if(window._dineResListUnsub)window._dineResListUnsub();
 window._dineResListUnsub=_db.collection('filo_bookings').where('dealerId','==',did).where('date','==',date)
  .orderBy('time').onSnapshot(function(snap){
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
  .then(function(){_dineToast('확정됐습니다');/* onSnapshot 자동 갱신 */});
}

function _dineCancelRes(id,did){
 if(!confirm('취소하시겠습니까?'))return;
 _db.collection('filo_bookings').doc(id).update({status:'cancelled'})
  .then(function(){_dineToast('취소됐습니다');/* onSnapshot 자동 갱신 */});
}

function _dineAddReservation(did){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
 var today=_today();
 box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">예약 추가</div>'+
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
  status:'pending',createdAt:_nowISO()};
 if(!data.customerName){_dineToast('고객명 입력');return;}
 _db.collection('filo_bookings').add(data).then(function(){
  _dineToast('예약 등록됐습니다');document.querySelector('.mo')?.remove();
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

/* ══════════════════════════════════════════════════════════
   리뷰 관리 — 네이버·카카오 리뷰 연동
   - 매장 Place URL 저장 (설정에서 1회)
   - 리뷰 요청 알림톡 발송 (최근 방문 고객 대상)
   - 직원이 직접 수집한 리뷰 수동 등록
   - 리뷰 통계 (평균 별점, 플랫폼별 건수)
   ══════════════════════════════════════════════════════════ */
function _dineReviews(el){
 var did=_CU&&_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';

 // ── 설정 카드 (Place URL) ──────────────────────────────
 var settCard=document.createElement('div');
 settCard.className='card';settCard.style.marginBottom='16px';
 settCard.innerHTML='<div class="page-title" style="margin-bottom:4px">리뷰 관리</div>'+
  '<div class="page-sub" style="margin-bottom:16px">네이버·카카오 리뷰 링크를 등록하고 고객에게 리뷰를 요청하세요</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'+
   '<div><label style="font-size:11px;font-weight:700;color:var(--t3);display:block;margin-bottom:4px">네이버 플레이스 URL</label>'+
   '<input id="rv-naver-url" type="url" placeholder="https://map.naver.com/v5/entry/place/..." class="inp" style="font-size:12px"></div>'+
   '<div><label style="font-size:11px;font-weight:700;color:var(--t3);display:block;margin-bottom:4px">카카오맵 URL</label>'+
   '<input id="rv-kakao-url" type="url" placeholder="https://place.map.kakao.com/..." class="inp" style="font-size:12px"></div>'+
  '</div>'+
  '<button onclick="_dineReviewSaveUrls(\''+did+'\')" class="btn btn-primary" style="font-size:12px">URL 저장</button>'+
  '&nbsp;<a id="rv-naver-link" href="#" target="_blank" style="display:none;font-size:12px;color:#03c75a;font-weight:700;text-decoration:none;padding:7px 14px;border:1px solid #03c75a;border-radius:8px">N 리뷰 페이지 열기</a>'+
  '&nbsp;<a id="rv-kakao-link" href="#" target="_blank" style="display:none;font-size:12px;color:#f9e000;font-weight:700;text-decoration:none;padding:7px 14px;border:1px solid #f9e000;border-radius:8px;background:#1b1400">K 리뷰 페이지 열기</a>';
 wrap.appendChild(settCard);

 // ── 통계 카드 ──────────────────────────────────────────
 var statsCard=document.createElement('div');
 statsCard.className='card';statsCard.style.marginBottom='16px';
 statsCard.innerHTML='<div style="font-size:14px;font-weight:800;margin-bottom:12px">리뷰 통계</div>'+
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px" id="rv-stats">'+
   '<div style="text-align:center;padding:12px;background:var(--surface2);border-radius:12px"><div style="font-size:20px;font-weight:900;color:#facc15" id="rv-avg">-</div><div style="font-size:10px;color:var(--t3);margin-top:2px">평균 별점</div></div>'+
   '<div style="text-align:center;padding:12px;background:var(--surface2);border-radius:12px"><div style="font-size:20px;font-weight:900;color:#03c75a" id="rv-naver-cnt">0</div><div style="font-size:10px;color:var(--t3);margin-top:2px">네이버</div></div>'+
   '<div style="text-align:center;padding:12px;background:var(--surface2);border-radius:12px"><div style="font-size:20px;font-weight:900;color:#f9e000" id="rv-kakao-cnt">0</div><div style="font-size:10px;color:var(--t3);margin-top:2px">카카오</div></div>'+
  '</div>';
 wrap.appendChild(statsCard);

 // ── 리뷰 요청 발송 카드 ────────────────────────────────
 var reqCard=document.createElement('div');
 reqCard.className='card';reqCard.style.marginBottom='16px';
 reqCard.innerHTML='<div style="font-size:14px;font-weight:800;margin-bottom:8px">리뷰 요청 알림톡</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-bottom:12px">오늘 방문한 고객에게 카카오 알림톡으로 리뷰 요청을 보냅니다</div>'+
  '<div style="display:flex;gap:8px;align-items:center">'+
  '<button onclick="_dineReviewRequest(\''+did+'\')" class="btn btn-primary" style="font-size:12px;background:#f9e000;color:#1b1400;border:none">카카오 리뷰 요청 발송</button>'+
  '<button onclick="_dineReviewRequest(\''+did+'\',\'naver\')" class="btn" style="font-size:12px;background:#03c75a;color:#fff;border:none">네이버 리뷰 요청 발송</button>'+
  '</div>'+
  '<div id="rv-req-result" style="margin-top:10px;font-size:12px;color:var(--t3)"></div>';
 wrap.appendChild(reqCard);

 // ── 수동 리뷰 등록 카드 ────────────────────────────────
 var addCard=document.createElement('div');
 addCard.className='card';addCard.style.marginBottom='16px';
 addCard.innerHTML='<div style="font-size:14px;font-weight:800;margin-bottom:12px">리뷰 직접 등록</div>'+
  '<div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:start;margin-bottom:8px">'+
  '<select id="rv-platform" class="inp" style="font-size:12px;width:100px"><option value="naver">네이버</option><option value="kakao">카카오</option><option value="google">구글</option><option value="etc">기타</option></select>'+
  '<input id="rv-content" class="inp" type="text" placeholder="리뷰 내용 (일부 발췌)" style="font-size:12px">'+
  '<div style="display:flex;gap:4px;align-items:center" id="rv-star-row">'+
   [5,4,3,2,1].map(function(s){return '<button onclick="_rvSetStar('+s+')" data-s="'+s+'" style="background:none;border:none;font-size:18px;cursor:pointer;padding:0;color:#d1d5db">★</button>';}).join('')+
  '</div></div>'+
  '<button onclick="_dineSaveReview(\''+did+'\')" class="btn btn-primary" style="font-size:12px">등록</button>';
 wrap.appendChild(addCard);

 // ── 리뷰 목록 ──────────────────────────────────────────
 var listCard=document.createElement('div');
 listCard.className='card';
 listCard.innerHTML='<div style="font-size:14px;font-weight:800;margin-bottom:12px">리뷰 목록</div>'+
  '<div id="rv-list"><div style="text-align:center;padding:24px;color:var(--t3);font-size:12px">로딩 중...</div></div>';
 wrap.appendChild(listCard);

 el.appendChild(wrap);
 _dineLoadReviewSettings(did);
 _dineLoadReviews(did);
}

var _rvStarVal=5;
function _rvSetStar(s){
 _rvStarVal=s;
 document.querySelectorAll('#rv-star-row button').forEach(function(b){
  b.style.color=parseInt(b.dataset.s)<=s?'#facc15':'#d1d5db';
 });
}

function _dineLoadReviewSettings(did){
 _db.collection('companies').doc(did).get().then(function(doc){
  var d=doc.exists?doc.data():{};
  var nu=d.naverPlaceUrl||'';var ku=d.kakaoPlaceUrl||'';
  if(nu){
   var inp=document.getElementById('rv-naver-url');if(inp)inp.value=nu;
   var lnk=document.getElementById('rv-naver-link');if(lnk){lnk.href=nu;lnk.style.display='inline-block';}
  }
  if(ku){
   var inp2=document.getElementById('rv-kakao-url');if(inp2)inp2.value=ku;
   var lnk2=document.getElementById('rv-kakao-link');if(lnk2){lnk2.href=ku;lnk2.style.display='inline-block';}
  }
 }).catch(function(){});
}

function _dineReviewSaveUrls(did){
 var nu=(document.getElementById('rv-naver-url')||{}).value||'';
 var ku=(document.getElementById('rv-kakao-url')||{}).value||'';
 _db.collection('companies').doc(did).update({naverPlaceUrl:nu,kakaoPlaceUrl:ku})
  .then(function(){
   _dineToast('리뷰 링크 저장됐습니다');
   var nl=document.getElementById('rv-naver-link');var kl=document.getElementById('rv-kakao-link');
   if(nl&&nu){nl.href=nu;nl.style.display='inline-block';}
   if(kl&&ku){kl.href=ku;kl.style.display='inline-block';}
  }).catch(function(e){_dineToast('저장 실패: '+e.message);});
}

function _dineLoadReviews(did){
 _db.collection('dine_reviews').where('dealerId','==',did)
  .orderBy('createdAt','desc').limit(30).get()
  .then(function(snap){
   var list=document.getElementById('rv-list');
   if(!list)return;
   if(snap.empty){list.innerHTML='<div style="text-align:center;padding:24px;color:var(--t3);font-size:12px">등록된 리뷰가 없습니다.<br>직접 등록하거나 고객에게 리뷰를 요청해 보세요.</div>';return;}
   var total=0,cnt=0,naverCnt=0,kakaoCnt=0;
   var rows=[];
   snap.forEach(function(doc){
    var d=doc.data();
    if(d.star){total+=d.star;cnt++;}
    if(d.platform==='naver')naverCnt++;
    else if(d.platform==='kakao')kakaoCnt++;
    var stars='★'.repeat(d.star||5)+'☆'.repeat(5-(d.star||5));
    var plColor={naver:'#03c75a',kakao:'#f9e000',google:'#4285f4',etc:'#94a3b8'}[d.platform]||'#94a3b8';
    rows.push('<div style="padding:10px 0;border-bottom:1px solid var(--bd)">'+
     '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'+
     '<span style="font-size:10px;padding:2px 7px;border-radius:10px;border:1px solid '+plColor+';color:'+plColor+';font-weight:700">'+
      {naver:'네이버',kakao:'카카오',google:'구글',etc:'기타'}[d.platform||'etc']+'</span>'+
     '<span style="color:#facc15;font-size:13px">'+stars+'</span>'+
     '<span style="font-size:10px;color:var(--t3);margin-left:auto">'+((d.createdAt||'').slice(0,10))+'</span>'+
     '</div>'+
     '<div style="font-size:13px;color:var(--tx)">'+_de(d.content||'')+'</div>'+
    '</div>');
   });
   list.innerHTML=rows.join('');
   // 통계 업데이트
   var avgEl=document.getElementById('rv-avg');var ncEl=document.getElementById('rv-naver-cnt');var kcEl=document.getElementById('rv-kakao-cnt');
   if(avgEl)avgEl.textContent=cnt?( total/cnt).toFixed(1)+' ★':'-';
   if(ncEl)ncEl.textContent=naverCnt;if(kcEl)kcEl.textContent=kakaoCnt;
  }).catch(function(e){var l=document.getElementById('rv-list');if(l)l.innerHTML='<div style="padding:16px;color:#ef4444;font-size:12px">오류: '+e.message+'</div>';});
}

function _dineSaveReview(did){
 var content=(document.getElementById('rv-content')||{}).value||'';
 var platform=(document.getElementById('rv-platform')||{}).value||'naver';
 if(!content){_dineToast('리뷰 내용을 입력하세요');return;}
 _db.collection('dine_reviews').add({
  dealerId:did,platform:platform,star:_rvStarVal,content:content,
  source:'manual',createdAt:new Date().toISOString(),createdBy:_CU.name||_CU.uid
 }).then(function(){
  _dineToast('리뷰 등록됐습니다');
  var inp=document.getElementById('rv-content');if(inp)inp.value='';
  _rvStarVal=5;
  document.querySelectorAll('#rv-star-row button').forEach(function(b){b.style.color='#d1d5db';});
  _dineLoadReviews(did);
 }).catch(function(e){_dineToast('등록 실패: '+e.message);});
}

function _dineReviewRequest(did,platform){
 platform=platform||'kakao';
 // 오늘 방문 고객 조회 (filo_orders 기준)
 var today=new Date().toISOString().slice(0,10);
 _db.collection('filo_orders').where('dealerId','==',did).where('date','==',today)
  .where('status','==','paid').limit(20).get()
  .then(function(snap){
   if(snap.empty){_dineToast('오늘 방문 고객 데이터가 없습니다');return;}
   var phones=[];var seen=new Set();
   snap.forEach(function(doc){
    var d=doc.data();
    var ph=(d.customerPhone||d.phone||'').replace(/[^0-9]/g,'');
    if(ph&&ph.length>=10&&!seen.has(ph)){seen.add(ph);phones.push(ph);}
   });
   if(!phones.length){_dineToast('발송 가능한 고객 연락처가 없습니다');return;}
   // companies에서 Place URL 가져오기
   _db.collection('companies').doc(did).get().then(function(cdoc){
    var co=cdoc.exists?cdoc.data():{};
    var placeUrl=platform==='naver'?(co.naverPlaceUrl||''):(co.kakaoPlaceUrl||'');
    if(!placeUrl){_dineToast((platform==='naver'?'네이버':'카카오')+' Place URL을 먼저 등록해 주세요');return;}
    var msg='안녕하세요! 오늘 방문해 주셔서 감사합니다 :)\n리뷰를 남겨 주시면 큰 힘이 됩니다.\n→ '+placeUrl;
    var resultEl=document.getElementById('rv-req-result');
    if(resultEl)resultEl.textContent='발송 중... ('+phones.length+'명)';
    // 알리고 SMS 발송 (알림톡 템플릿 없을 경우 SMS fallback)
    (_auth&&_auth.currentUser?_auth.currentUser.getIdToken():Promise.resolve(''))
    .then(function(token){
     return fetch('/api/send-sms-bulk',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({did:did,phones:phones,msg:msg})
     }).then(function(r){return r.json();});
    }).then(function(d){
     var sentCnt=d.sent||phones.length;
     if(resultEl)resultEl.textContent=sentCnt+'명 발송 완료 ('+new Date().toLocaleTimeString()+')';
     _dineToast('리뷰 요청 '+sentCnt+'명 발송 완료');
    }).catch(function(){
     // API 없는 경우 — 직접 링크 복사 안내
     if(resultEl)resultEl.innerHTML='자동 발송 API 미설정 — <a href="'+placeUrl+'" target="_blank" style="color:#facc15">링크 복사</a>해서 직접 공유하세요';
    });
   });
  }).catch(function(e){_dineToast('고객 조회 실패: '+e.message);});
}
