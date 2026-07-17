/**
 * @module      filo-settings.js
 * ══════════════════════════════════════════════════════
 * 역할: 설정 · 구독관리 · 알림톡 · 리뷰답글 · 세금공유 · 공지
 *
 * 의존: filo-common.js
 * ⚠️ 2026-07-15 리팩토링:
 *   _filoAddCategory / _filoDeleteCategory → filo-table.js 로 이동
 *   _toAddItem / _toDecItem → filo-table.js 로 이동
 *   _filoMarginLoadRange → filo-report.js 로 이동
 * ══════════════════════════════════════════════════════
 */
// filo-common.js에서 분리됨 (리팩토링 2026-07-13)

function _filoPageSettings(el){
 var did=_CU.dealerId||_CU.uid;
 var d=_cachedCompanyDoc||{};
 el.innerHTML='<div class="slide-up" style="max-width:600px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">⚙️ 설정</div>'+
 '<div class="card">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:12px">회사 정보</div>'+
 '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">회사명</span>'+
 '<span style="font-size:13px;font-weight:700">'+(d.companyName||d.name||'')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">이메일</span>'+
 '<span style="font-size:13px;font-weight:700">'+(_CU.email||'')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:8px 0">'+
 '<span style="font-size:12px;color:var(--t3)">역할</span>'+
 '<span style="font-size:13px;font-weight:700">'+(_CU.role||'관리자')+'</span></div>'+
 '<div class="card" style="margin-top:12px">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:12px">⭐ 리뷰 링크 설정</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:10px">고객이 결제 후 리뷰를 남길 수 있는 링크를 등록하세요</div>'+
 '<div style="margin-bottom:8px">'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">네이버 플레이스 리뷰 URL</div>'+
 '<input id="review-naver" class="inp" placeholder="https://naver.me/..." value="'+(d.reviewUrlNaver||'')+'" style="width:100%;font-size:12px">'+
 '</div>'+
 '<div style="margin-bottom:12px">'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">카카오맵 리뷰 URL</div>'+
 '<input id="review-kakao" class="inp" placeholder="https://place.map.kakao.com/..." value="'+(d.reviewUrlKakao||'')+'" style="width:100%;font-size:12px">'+
 '</div>'+
 '<button class="btn btn-brand btn-sm" onclick="_filoSaveReviewUrls()">저장</button>'+
 '</div>'+
 '</div></div>';
}
function _filoSaveReviewUrls(){
 var did=_CU.dealerId||_CU.uid;
 var naver=document.getElementById('review-naver')?.value.trim()||'';
 var kakao=document.getElementById('review-kakao')?.value.trim()||'';
 _db.collection('companies').doc(did).update({reviewUrlNaver:naver,reviewUrlKakao:kakao,updatedAt:_nowISO()})
 .then(function(){
  if(_cachedCompanyDoc){_cachedCompanyDoc.reviewUrlNaver=naver;_cachedCompanyDoc.reviewUrlKakao=kakao;}
  _filoToast('✅ 리뷰 링크 저장됨');
 }).catch(function(e){_filoToast('❌ '+e.message);});
}
function _filoPageSubscription(el){
 el.innerHTML='<div class="slide-up" style="max-width:600px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">🚀 구독 관리</div>'+
 '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;margin-bottom:20px">'+
 '<div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:8px">💳 계좌이체 결제 안내</div>'+
 '<div style="font-size:18px;font-weight:900;color:#111;letter-spacing:1px">270-910019-24204</div>'+
 '<div style="font-size:13px;color:#555;margin-top:4px">하나은행 · (유)엠비티아이</div>'+
 '<div style="font-size:11px;color:#e67e00;margin-top:8px">⚠️ 입금자명에 업체명 기재 필수 · 입금 후 051-711-3103 확인 요청</div>'+
 '</div>'+
 '<div class="card">'+
 '<div style="text-align:center;padding:20px">'+
 '<div style="font-size:40px;margin-bottom:12px">💎</div>'+
 '<div style="font-size:16px;font-weight:800;margin-bottom:6px">FILO 플랜</div>'+
 '<div style="font-size:12px;color:var(--t3);margin-bottom:16px">재고관리 · QR출퇴근 · 키오스크POS 통합 솔루션</div>'+
 '<a href="https://filo.ai.kr" target="_blank" class="btn btn-brand" style="display:inline-block;text-decoration:none">요금제 보기</a>'+
 '</div></div></div>';
}
function _filoPageTaxShare(el){
 var did=_CU.dealerId||_CU.uid;
 var d=_cachedCompanyDoc||{};
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:700px;margin:0 auto';

 /* 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='margin-bottom:20px';
 hdr.innerHTML='<div class="page-title">🧾 세무사 연동</div>'+
  '<div class="page-sub">매출 데이터를 세무사에게 자동 공유합니다</div>';
 wrap.appendChild(hdr);

 /* 현황 카드 */
 var statusCard=document.createElement('div');
 statusCard.className='hero-card';
 statusCard.style.marginBottom='16px';
 statusCard.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1">'+
  '<div><div style="font-size:11px;color:rgba(167,139,250,.7);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">연동 현황</div>'+
  '<div style="font-size:20px;font-weight:900" id="tax-status-txt">설정 안됨</div>'+
  '<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px" id="tax-status-sub">세무사 이메일을 등록하면 매월 매출 리포트를 자동 발송합니다</div>'+
  '</div>'+
  '<div style="font-size:36px;opacity:.6">📊</div></div>';
 wrap.appendChild(statusCard);

 /* 세무사 이메일 등록 */
 var card1=document.createElement('div');
 card1.className='card';
 card1.innerHTML='<div class="sec-title" style="margin-bottom:12px">세무사 이메일 등록</div>'+
  '<div style="display:flex;gap:8px;margin-bottom:8px">'+
  '<input id="tax-email-inp" type="email" placeholder="세무사 이메일 주소" style="flex:1;padding:11px 14px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none">'+
  '<button onclick="_filoTaxSaveEmail()" style="padding:11px 16px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-size:13px;font-weight:700;cursor:pointer">저장</button>'+
  '</div>'+
  '<div style="font-size:11px;color:var(--t3)">💡 매월 1일 전월 매출 리포트가 자동 발송됩니다</div>';
 wrap.appendChild(card1);

 /* 매출 데이터 공유 설정 */
 var card2=document.createElement('div');
 card2.className='card';
 card2.innerHTML='<div class="sec-title" style="margin-bottom:12px">공유 항목 설정</div>'+
  [
   {id:'tax-share-sales',l:'일별 매출 합계',d:'매일 총 매출액'},
   {id:'tax-share-items',l:'메뉴별 판매량',d:'품목별 판매 내역'},
   {id:'tax-share-pay',l:'결제수단별 내역',d:'카드/현금/간편결제 구분'},
   {id:'tax-share-refund',l:'취소/환불 내역',d:'환불 처리 내역 포함'},
  ].map(function(item){
   return '<div class="stat-row"><div>'+
    '<div style="font-size:13px;font-weight:700">'+item.l+'</div>'+
    '<div style="font-size:11px;color:var(--t3)">'+item.d+'</div>'+
    '</div>'+
    '<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer">'+
    '<input type="checkbox" id="'+item.id+'" checked style="opacity:0;width:0;height:0">'+
    '<span style="position:absolute;inset:0;background:#7c3aed;border-radius:24px;transition:.3s" onclick="this.style.background=this.previousElementSibling.checked?\'#7c3aed\':\'var(--surface3)\'"></span>'+
    '<span style="position:absolute;top:2px;left:2px;width:20px;height:20px;background:#fff;border-radius:50%;transition:.3s"></span>'+
    '</label></div>';
  }).join('');
 wrap.appendChild(card2);

 /* 즉시 리포트 발송 */
 var card3=document.createElement('div');
 card3.className='card';
 card3.innerHTML='<div class="sec-title" style="margin-bottom:12px">즉시 리포트 발송</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
  ['이번달 리포트','지난달 리포트','분기 리포트','연간 리포트'].map(function(t,i){
   return '<button onclick="_filoTaxSendReport(\''+['thisMonth','lastMonth','quarter','year'][i]+'\')" style="padding:12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:12px;font-weight:700;cursor:pointer;transition:.2s" onmouseover="this.style.borderColor=\'rgba(124,58,237,.4)\'" onmouseout="this.style.borderColor=\'var(--bd2)\'">'+t+'</button>';
  }).join('')+'</div>';
 wrap.appendChild(card3);

 /* 세금계산서 안내 */
 var card4=document.createElement('div');
 card4.className='card-brand';
 card4.innerHTML='<div style="font-size:13px;font-weight:800;margin-bottom:8px">💡 세금계산서 발행 안내</div>'+
  '<div style="font-size:12px;color:var(--t2);line-height:1.7">'+
  '• POS 결제 내역이 자동으로 세무사에게 공유됩니다<br>'+
  '• 카드 매출은 카드사 자동 집계와 대조 가능합니다<br>'+
  '• DONWAY와 연동 시 부가세 신고 자료를 자동 생성합니다<br>'+
  '• 문의: <a href="tel:051-711-3103" style="color:#a78bfa">051-711-3103</a>'+
  '</div>';
 wrap.appendChild(card4);

 el.appendChild(wrap);

 /* 기존 설정 로드 */
 _db.collection('settings').doc(did+'_tax').get().then(function(snap){
  if(snap.exists){
   var data=snap.data();
   if(data.taxEmail){
    document.getElementById('tax-email-inp').value=data.taxEmail;
    document.getElementById('tax-status-txt').textContent='✅ 연동 중';
    document.getElementById('tax-status-sub').textContent=data.taxEmail+' · 매월 자동 발송';
   }
  }
 });
}

function _filoTaxSaveEmail(){
 var email=(document.getElementById('tax-email-inp').value||'').trim();
 if(!email||!email.includes('@')){_filoToast('올바른 이메일을 입력하세요');return;}
 var did=_CU.dealerId||_CU.uid;
 _db.collection('settings').doc(did+'_tax').set({
  dealerId:did,taxEmail:email,updatedAt:_nowISO()
 },{merge:true}).then(function(){
  _filoToast('✅ 세무사 이메일이 등록됐습니다');
  document.getElementById('tax-status-txt').textContent='✅ 연동 중';
  document.getElementById('tax-status-sub').textContent=email+' · 매월 자동 발송';
 });
}

function _filoPageNotices(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="slide-up" style="max-width:700px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">📢 공지사항</div>'+
 '<div id="notices-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳</div></div></div>';
 _db.collection('notices').where('dealerId','==',did).orderBy('createdAt','desc').limit(20).get()
 .then(function(snap){
 var el2=document.getElementById('notices-list');if(!el2)return;
 if(snap.empty){el2.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--t3)">공지사항이 없습니다</div>';return;}
 el2.innerHTML=snap.docs.map(function(doc){
 var d=doc.data();
 return '<div class="card" style="margin-bottom:10px">'+
 '<div style="font-size:14px;font-weight:800;margin-bottom:6px">'+esc(d.title||'')+'</div>'+
 '<div style="font-size:12px;color:var(--t3);margin-bottom:8px">'+(d.createdAt||'').slice(0,10)+'</div>'+
 '<div style="font-size:13px;line-height:1.6;white-space:pre-wrap">'+esc(d.content||'')+'</div></div>';
 }).join('');
 }).catch(function(){});
}



var _tableMgmtUnsub=null;










/* ══════════════════════════════════════
   🛵 배달 주문 관리 페이지
   배민/쿠팡이츠/요기요 주문 수동 접수
   ══════════════════════════════════════ */

var _toTable=null,_toCart={};

// ── AI 리뷰 답글 생성기 ─────────────────────────────────────────────────────
function _filoPageReviewReply(el){
 var did=_CU&&(_CU.dealerId||_CU.uid)||'';
 el.innerHTML='<div style="max-width:600px;margin:0 auto">'+
  '<div style="font-size:20px;font-weight:900;margin-bottom:4px">💬 AI 리뷰 답글</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-bottom:20px">고객 리뷰를 붙여넣으면 AI가 답글을 자동 생성합니다</div>'+
  '<div style="background:var(--surface2);border:1px solid var(--bd2);border-radius:14px;padding:16px;margin-bottom:12px">'+
  '<div style="font-size:11px;font-weight:700;color:var(--t3);margin-bottom:8px">📋 고객 리뷰</div>'+
  '<textarea id="review-input" placeholder="리뷰 내용을 붙여넣으세요..." style="width:100%;min-height:100px;background:var(--surface3);border:1px solid var(--bd);border-radius:10px;padding:12px;color:var(--tx);font-size:13px;resize:vertical;box-sizing:border-box"></textarea>'+
  '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'+
  '<button onclick="_filoGenReviewReply(1)" style="flex:1;padding:10px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:10px;color:#a78bfa;font-weight:700;font-size:12px;cursor:pointer">⭐ 긍정 답글</button>'+
  '<button onclick="_filoGenReviewReply(0)" style="flex:1;padding:10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:10px;color:#f87171;font-weight:700;font-size:12px;cursor:pointer">😔 부정/개선 답글</button>'+
  '<button onclick="_filoGenReviewReply(2)" style="flex:1;padding:10px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);border-radius:10px;color:#22c55e;font-weight:700;font-size:12px;cursor:pointer">🎯 일반 답글</button>'+
  '</div></div>'+
  '<div id="review-result" style="display:none;background:var(--surface2);border:1px solid var(--bd2);border-radius:14px;padding:16px">'+
  '<div style="font-size:11px;font-weight:700;color:var(--t3);margin-bottom:8px">✍️ AI 생성 답글</div>'+
  '<textarea id="review-output" style="width:100%;min-height:120px;background:var(--surface3);border:1px solid var(--bd);border-radius:10px;padding:12px;color:var(--tx);font-size:13px;resize:vertical;box-sizing:border-box"></textarea>'+
  '<button onclick="navigator.clipboard.writeText(document.getElementById(\'review-output\').value).then(function(){_filoToast(\'📋 복사됐습니다!\')})" style="width:100%;margin-top:8px;padding:10px;background:var(--br);border:none;border-radius:10px;color:#fff;font-weight:700;font-size:13px;cursor:pointer">📋 복사하기</button>'+
  '</div>'+
  '</div>';
}

async function _filoGenReviewReply(type){
 var review=(document.getElementById('review-input')||{}).value||'';
 if(!review.trim()){_filoToast('리뷰 내용을 입력하세요');return;}
 var typeLabel=type===1?'긍정적이고 감사한':type===0?'사과하고 개선 의지를 보이는':'친절하고 전문적인';
 var compName=(_CU&&_CU.companyName)||'저희 매장';
 var resultEl=document.getElementById('review-result');
 var outputEl=document.getElementById('review-output');
 if(resultEl)resultEl.style.display='block';
 if(outputEl)outputEl.value='AI가 답글을 작성 중입니다...';

 try{
  var res=await fetch('https://api.anthropic.com/v1/messages',{
   method:'POST',
   headers:{'Content-Type':'application/json','x-api-key':window._anthropicKey||'','anthropic-version':'2023-06-01'},
   body:JSON.stringify({
    model:'claude-haiku-4-5-20251001',
    max_tokens:300,
    messages:[{role:'user',content:'다음 고객 리뷰에 대한 '+typeLabel+' 답글을 작성해줘. 매장명: '+compName+'. 답글만 출력해. 2~4문장으로 간결하게.\n\n리뷰: '+review}]
   })
  });
  var d=await res.json();
  var reply=(d.content&&d.content[0]&&d.content[0].text)||'답글 생성에 실패했습니다.';
  if(outputEl)outputEl.value=reply;
 } catch(e){
  // API 키 없으면 Worker 프록시 사용
  try{
   var res2=await fetch('/api/review-reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({review:review,type:type,compName:compName})});
   var d2=await res2.json();
   if(outputEl)outputEl.value=d2.reply||'답글 생성에 실패했습니다.';
  } catch(e2){
   if(outputEl)outputEl.value='답글 생성에 실패했습니다. 잠시 후 다시 시도하세요.';
  }
 }
}
