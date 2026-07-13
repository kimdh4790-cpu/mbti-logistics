/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      filo-settings.js
 * @description 매장설정·구독관리·세금공유·카테고리
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
 '</div></div>';
}
function _filoPageSubscription(el){
 el.innerHTML='<div class="slide-up" style="max-width:600px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">🚀 구독 관리</div>'+
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
  dealerId:did,taxEmail:email,updatedAt:new Date().toISOString()
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
function _filoAddCategory(did){
 var inp=document.getElementById('new-cat-inp');
 var cat=(inp.value||'').trim();
 if(!cat){_filoToast('카테고리명을 입력하세요');return;}
 inp.value='';
 _filoToast('✅ 카테고리 추가됐습니다');
 _filoLoadMenuMgmt(did);
}

function _filoDeleteCategory(did,cat){
 if(!confirm('['+cat+'] 카테고리의 메뉴를 모두 삭제하시겠습니까?'))return;
 _db.collection('filo_menus').where('dealerId','==',did).where('category','==',cat).get().then(function(snap){
  var batch=_db.batch();
  snap.forEach(function(doc){batch.delete(doc.ref);});
  return batch.commit();
 }).then(function(){
  _filoToast('🗑 ['+cat+'] 카테고리 삭제됐습니다');
  _filoPageMenuMgmt(document.getElementById('content'));
 });
}

function _filoMarginLoadRange(from,to){
 if(!from){var f=document.getElementById('sf-from');var t2=document.getElementById('sf-to');if(f)from=f.value;if(t2)to=t2.value;}
 if(!from||!to){_filoToast('날짜를 선택하세요');return;}
 var did=_CU.dealerId||_CU.uid||(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did)return;
 var heroSub=document.getElementById('hero-sub');
 if(heroSub)heroSub.textContent=from+' ~ '+to+' 조회 중...';
 _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get().then(function(snap){
  var total=0,cnt=0,items={},methods={};
  snap.forEach(function(doc){
   var d=doc.data();
   if(d.status==='cancelled')return;
   total+=d.total||0;cnt++;
   var method=d.payMethod||d.method||'기타';
   methods[method]=(methods[method]||0)+(d.total||0);
   (d.items||[]).forEach(function(it){items[it.name]=(items[it.name]||0)+(it.qty||1);});
  });
  var paySorted=Object.entries(methods).sort(function(a,b){return b[1]-a[1];});
  if(heroSub)heroSub.textContent=from+(from!==to?' ~ '+to:'')+'·'+cnt+'건·₩'+total.toLocaleString();
  ['today-sales','month-sales'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent='₩'+total.toLocaleString();});
  ['today-cnt','month-cnt'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=cnt+'건';});

  /* 결제수단별 집계 표시 */
  var payEl=document.getElementById('pay-method-breakdown');
  if(payEl){
   var methodIcons={'카드':'💳','현금':'💵','카카오페이':'🟡','네이버페이':'🟢','카운터결제':'🏪','삼성페이':'📱','기타':'💰'};
   var sorted=Object.entries(methods).sort(function(a,b){return b[1]-a[1];});
   payEl.innerHTML=sorted.length?sorted.map(function(m){
    var pct=total>0?Math.round(m[1]/total*100):0;
    var ic=methodIcons[m[0]]||'💰';
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)">'+
     '<span style="font-size:16px">'+ic+'</span>'+
     '<div style="flex:1">'+
     '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
     '<span style="font-size:13px;font-weight:700">'+m[0]+'</span>'+
     '<span style="font-size:13px;font-weight:900;color:#22c55e">₩'+m[1].toLocaleString()+'</span>'+
     '</div>'+
     '<div style="height:4px;background:var(--surface3);border-radius:2px;overflow:hidden">'+
     '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--br),#22c55e);border-radius:2px;transition:width .5s"></div>'+
     '</div>'+
     '<div style="font-size:10px;color:var(--t3);margin-top:2px">'+pct+'% · 비중</div>'+
     '</div></div>';
   }).join(''):'<div style="text-align:center;padding:20px;color:var(--t3)">데이터 없음</div>';
  }

  /* 인기메뉴 */
  var topEl=document.getElementById('top-menus');
  if(topEl){
   var sorted2=Object.entries(items).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
   topEl.innerHTML=sorted2.length?sorted2.map(function(e,i){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd)">'+
     '<span style="font-size:13px"><span style="color:var(--br);font-weight:800;margin-right:6px">'+(i+1)+'위</span>'+e[0]+'</span>'+
     '<span style="font-size:13px;font-weight:700">'+e[1]+'개</span></div>';
   }).join(''):'<div style="text-align:center;padding:20px;color:var(--t3)">판매 데이터 없음</div>';
  }
 /* 차트 렌더링 */
  var liveEl=document.getElementById('sales-chart-extra');if(!liveEl){liveEl=document.createElement('div');liveEl.id='sales-chart-extra';var mainEl2=document.getElementById('content');if(mainEl2)mainEl2.appendChild(liveEl);}liveEl.innerHTML='';
  if(liveEl){
   /* 시간대별 집계 */
   var hourStats2={};
   snap.forEach(function(doc){
    var d2=doc.data();
    if(d2.status==='cancelled')return;
    var h=d2.createdAt?(new Date(d2.createdAt).getHours()):(new Date().getHours());
    hourStats2[h]=(hourStats2[h]||0)+(d2.total||0);
   });
   var hourEntries2=Object.keys(hourStats2).sort(function(a,b){return a-b;}).map(function(h){return [h,hourStats2[h]];});

   var chartHtml='';
   if(hourEntries2.length){
    chartHtml+='<div style="margin-top:14px"><div class="sec-title" style="margin-bottom:10px">⏰ 시간대별 매출</div>'+
     '<div style="position:relative;height:160px"><canvas id="hour-chart-canvas"></canvas></div></div>';
   }
   if(paySorted&&paySorted.length){
    chartHtml+='<div style="margin-top:14px"><div class="sec-title" style="margin-bottom:10px">💳 결제수단 비중</div>'+
     '<div style="position:relative;height:160px"><canvas id="pay-donut-canvas"></canvas></div></div>';
   }
   if(Object.keys(items).length){
    var menuEntries2=Object.entries(items).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    chartHtml+='<div style="margin-top:14px"><div class="sec-title" style="margin-bottom:10px">🏆 인기 메뉴 TOP5</div>'+
     menuEntries2.map(function(kv,i){
      var rank=['🥇','🥈','🥉','4️⃣','5️⃣'][i];
      var pct=total>0?Math.round(kv[1]/total*100):0;
      return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)">'+
       '<span style="font-size:15px">'+rank+'</span>'+
       '<div style="flex:1"><div style="display:flex;justify-content:space-between">'+
       '<span style="font-size:12px;font-weight:700">'+kv[0]+'</span>'+
       '<span style="font-size:12px;font-weight:900;color:#22c55e">'+kv[1]+'개</span>'+
       '</div>'+
       '<div style="height:3px;background:var(--surface3);border-radius:2px;margin-top:4px">'+
       '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#7c3aed,#22c55e);border-radius:2px"></div>'+
       '</div></div></div>';
     }).join('')+'</div>';
   }

   if(chartHtml) liveEl.innerHTML=(liveEl.innerHTML||'')+chartHtml;

   setTimeout(function(){
    /* 시간대 바차트 */
    var hc=document.getElementById('hour-chart-canvas');
    if(hc&&window.Chart&&hourEntries2.length){
     if(hc._chart)hc._chart.destroy();
     var maxVal=Math.max.apply(null,hourEntries2.map(function(h){return h[1];}));
     hc._chart=new Chart(hc,{type:'bar',
      data:{labels:hourEntries2.map(function(h){return h[0]+'시';}),
       datasets:[{label:'매출',data:hourEntries2.map(function(h){return h[1];}),
        backgroundColor:hourEntries2.map(function(h){return h[1]===maxVal?'rgba(167,139,250,.9)':'rgba(124,58,237,.5)';}),
        borderColor:'rgba(124,58,237,.8)',borderWidth:1,borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,
       animation:{duration:800,easing:'easeOutQuart'},
       plugins:{legend:{display:false},
        tooltip:{callbacks:{label:function(ctx){return String.fromCharCode(8361)+ctx.raw.toLocaleString();}}}},
       scales:{x:{grid:{display:false},ticks:{color:'#9898c0',font:{size:11}}},
        y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#9898c0',font:{size:10},
         callback:function(v){return v>=1000?(v/1000).toFixed(0)+'k':v;}}}}}});
    }
    /* 결제수단 금액 카드 */
    var payCanvas=document.getElementById('pay-donut-canvas');
    if(payCanvas&&paySorted&&paySorted.length){
     var payColors={'카드':'#60a5fa','현금':'#22c55e','카카오페이':'#f59e0b','네이버페이':'#10b981','카운터결제':'#a78bfa','기타':'#9898c0'};
     var payParent=payCanvas.parentElement;
     if(payParent){
      payParent.style.height='auto';
      var payHtmlStr='<div style="display:flex;flex-direction:column;gap:8px">';
      paySorted.forEach(function(p){
       var ic={'카드':'💳','현금':'💵','카카오페이':'🟡','네이버페이':'🟢','카운터결제':'🏪'}[p[0]]||'💰';
       var col=payColors[p[0]]||'#9898c0';
       var pct=total>0?Math.round(p[1]/total*100):0;
       payHtmlStr+='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface2);border-radius:12px;border:1px solid var(--bd2)">'+
        '<span style="font-size:18px">'+ic+'</span>'+
        '<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:5px">'+
        '<span style="font-size:13px;font-weight:700">'+p[0]+'</span>'+
        '<span style="font-size:16px;font-weight:900;color:'+col+'">'+String.fromCharCode(8361)+p[1].toLocaleString()+'</span>'+
        '</div><div style="height:4px;background:var(--surface3);border-radius:2px;overflow:hidden">'+
        '<div class="pay-bar" data-pct="'+pct+'" style="height:100%;width:0%;background:'+col+';border-radius:2px;transition:width .8s ease"></div>'+
        '</div><span style="font-size:10px;color:var(--t3)">'+pct+'% 비중</span></div></div>';
      });
      payHtmlStr+='</div>';
      payParent.innerHTML=payHtmlStr;
      setTimeout(function(){
       payParent.querySelectorAll('.pay-bar').forEach(function(b){b.style.width=b.dataset.pct+'%';});
      },50);
     }
    }
   },150);
  }
 }).catch(function(e){if(heroSub)heroSub.textContent='오류: '+e.message;});
}

var _toTable=null,_toCart={};





function _toAddItem(id,name,price){
 if(!_toCart[id])_toCart[id]={name:name,price:price,qty:0};
 _toCart[id].qty++;_toUpdateCart();_toShowMenuGrid(window._toAllMenus||[]);
}
function _toDecItem(id){
 if(!_toCart[id])return;
 _toCart[id].qty--;if(_toCart[id].qty<=0)delete _toCart[id];
 _toUpdateCart();_toShowMenuGrid(window._toAllMenus||[]);
}

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
