/**
 * @module      filo-qr.js
 * ══════════════════════════════════════════════════════
 * 역할: 테이블 QR 코드 생성·인쇄·리뷰QR
 *
 * 분리 출처: filo-table.js (2026-07-16 리팩토링)
 *
 * 포함 함수:
 *   _filoPageTableQR   — 테이블현황+QR 페이지
 *   _filoGenQRs        — QR 그리드 생성
 *   _filoQRPrint       — 개별 QR 인쇄 (qr-grid용)
 *   _filoShowTableQRModal — QR 모달
 *   _filoQRPrint1      — 개별 QR 인쇄 (모달용)
 *   _filoQRPrintAll    — 전체 QR 인쇄
 *   _filoLoadReviewQR  — 리뷰 QR 로드
 *   _filoReviewQRPrint — 리뷰 QR 인쇄
 *
 * 의존: filo-common.js (_filoToast, _filoEnsureQR)
 *       filo-payment.js (_filoEnsureQR, _filoQRDownload)
 * ══════════════════════════════════════════════════════
 */

function _filoPageTableQR(el){
 if(!el)el=document.getElementById('content');
 if(!el)return;
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML=
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">테이블 현황 · QR</div><div class="page-sub">실시간 착석 관리 · QR 코드 생성</div></div>'+
  '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'+
  '<input id="table-count-inp" type="number" value="10" min="1" max="30" style="width:70px;padding:6px 8px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px">'+
  '<button class="btn btn-brand btn-sm" onclick="_filoTableInit()">테이블 설정</button>'+
  '<button class="btn btn-sm" style="background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);color:#22c55e" onclick="_filoTableRefresh()">새로고침</button>'+
  '</div></div>'+
  '<div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">'+
  '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:10px;height:10px;border-radius:50%;background:#22c55e"></div>빈 테이블</div>'+
  '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:10px;height:10px;border-radius:50%;background:#ef4444"></div>사용 중</div>'+
  '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t2)"><div style="width:10px;height:10px;border-radius:50%;background:#f59e0b"></div>예약 완료</div>'+
  '</div>'+
  '<div id="staff-call-banner" style="display:none;background:rgba(239,68,68,.12);border:1.5px solid rgba(239,68,68,.3);border-radius:12px;padding:12px 16px;margin-bottom:12px;display:none"></div>'+
  '<div id="filo-table-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:16px">'+
  '<div style="text-align:center;padding:30px;color:var(--t3);grid-column:1/-1">로딩중...</div></div>'+
  '<div class="card"><div style="font-size:13px;font-weight:800;margin-bottom:10px;color:var(--t2)">예약 대기</div>'+
  '<div id="filo-booking-list"><div style="text-align:center;padding:16px;color:var(--t3);font-size:12px">로딩중...</div></div></div>'+
  /* 리뷰 QR 섹션 */
  '<div class="card" style="margin-top:12px" id="review-qr-section">'+
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
  '<div style="font-size:13px;font-weight:800">⭐ 리뷰 QR</div>'+
  '<button onclick="_filoReviewQRPrint()" style="padding:5px 12px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:8px;color:#f59e0b;font-size:11px;font-weight:700;cursor:pointer">인쇄</button>'+
  '</div>'+
  '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">테이블에 부착하면 고객이 식사 후 바로 리뷰 작성 가능합니다</div>'+
  '<div id="review-qr-wrap" style="display:flex;gap:12px;flex-wrap:wrap"></div>'+
  '<div style="margin-top:10px;font-size:10px;color:var(--t3)">리뷰 링크는 설정 → 리뷰 링크 설정에서 등록하세요</div>'+
  '</div>';

 el.appendChild(wrap);
 _filoTableLoad(did);
 _filoLoadReviewQR();
}

function _filoGenQRs(did){
 did=did||_CU.dealerId||_CU.uid;
 var sec=document.getElementById('qr-section');
 var grid=document.getElementById('qr-grid');
 if(!sec||!grid)return;
 sec.style.display='block';
 grid.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3)">QR 생성중...</div>';

 /* Firestore에서 테이블 목록 가져오기 */
 _db.collection('filo_tables').where('dealerId','==',did).get().then(function(snap){
  var seen={};
  if(snap.empty){
   for(var i=1;i<=10;i++)seen[i]={num:i,name:'테이블 '+i};
  } else {
   snap.forEach(function(doc){
    var d=doc.data();
    var num=d.tableNum||d.tableId||1;
    var name=d.tableName||('테이블 '+num);
    if(!seen[num]||name!=='테이블 '+num)seen[num]={num:num,name:name};
   });
  }
  var tables=Object.values(seen).sort(function(a,b){return a.num-b.num;});

  grid.innerHTML='';
  var baseUrl='https://filo.ai.kr/order?d='+did+'&t=';

  tables.forEach(function(t){
   var url=baseUrl+t.num+'&name='+encodeURIComponent(t.name);
   var div=document.createElement('div');
   div.className='card';
   div.style.cssText='text-align:center;padding:14px';
   div.innerHTML=
    '<div style="font-size:13px;font-weight:800;margin-bottom:10px">'+t.name+'</div>'+
    '<div id="qr-'+t.num+'" style="background:#fff;padding:6px;border-radius:8px;display:inline-block;margin-bottom:10px"></div>'+
    '<div style="display:flex;gap:4px;justify-content:center">'+
    '<button data-dl="'+t.num+'" data-name="'+t.name+'" style="padding:4px 8px;background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);border-radius:6px;color:#38bdf8;font-size:10px;font-weight:700;cursor:pointer">저장</button>'+
    '<button data-pr="'+t.num+'" data-name="'+t.name+'" style="padding:4px 8px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);border-radius:6px;color:#a78bfa;font-size:10px;font-weight:700;cursor:pointer">인쇄</button>'+
    '<button onclick="window.open(\''+url+'\',\'_blank\')" style="padding:4px 8px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:6px;color:#22c55e;font-size:10px;font-weight:700;cursor:pointer">미리보기</button>'+
    '</div>';
   grid.appendChild(div);
  });

  /* QR 라이브러리 로드 후 생성 */
  function genQRs(){
   tables.forEach(function(t){
    var el=document.getElementById('qr-'+t.num);
    if(!el||el.children.length>0)return;
    var url=baseUrl+t.num+'&name='+encodeURIComponent(t.name);
    try{
     new QRCode(el,{text:url,width:120,height:120,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
    }catch(e){console.error('QR err:',e);}
   });
  }

  if(window.QRCode){
   genQRs();
  } else {
   var s=document.createElement('script');
   s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
   s.onload=function(){setTimeout(genQRs,100);};
   document.head.appendChild(s);
  }

  /* 버튼 이벤트 위임 */
  grid.addEventListener('click',function(e){
   var dlBtn=e.target.closest('[data-dl]');
   var prBtn=e.target.closest('[data-pr]');
   if(dlBtn)_filoQRSave(dlBtn.dataset.dl,dlBtn.dataset.name);
   if(prBtn)_filoQRPrint(prBtn.dataset.pr,prBtn.dataset.name);
  });
 }).catch(function(e){_filoToast('오류: '+e.message);});
}

function _filoQRPrint(num,name){
 var el=document.getElementById('qr-'+num);
 if(!el)return;
 var img=el.querySelector('img');
 var canvas=el.querySelector('canvas');
 var src=img?img.src:(canvas?canvas.toDataURL('image/png'):'');
 if(!src)return;
 var storeName=(_CU&&(_CU.storeName||_CU.displayName||_CU.businessName))||'';
 var w=window.open('','_blank','width=440,height=560');
 if(!w||!w.document){_filoToast('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');return;}
 w.document.write('<html><head><meta charset="UTF-8"><title>'+name+'</title>'+
  '<style>'+
  '*{margin:0;padding:0;box-sizing:border-box}'+
  'html,body{width:400px;height:500px;overflow:hidden}'+
  'body{font-family:"Apple SD Gothic Neo","맑은 고딕","Noto Sans KR",sans-serif;background:#fff}'+
  '.card{width:400px;height:500px;position:relative;overflow:hidden;background:#0A0E2A}'+
  '.gold-top{height:4px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)}'+
  '.gold-bot{position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)}'+
  '.header{padding:22px 28px 14px;text-align:center;position:relative;z-index:1}'+
  '.rest-label{font-size:11px;color:rgba(201,168,76,.65);letter-spacing:4px;font-weight:500;margin-bottom:6px}'+
  '.store-name{font-size:32px;font-weight:900;color:#fff;letter-spacing:6px;line-height:1;margin-bottom:10px}'+
  '.divider{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px}'+
  '.divider-line{height:1px;width:36px;background:rgba(201,168,76,.5)}'+
  '.brand{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:3px}'+
  '.brand-filo{font-size:14px;font-weight:800;color:#00CFFF;letter-spacing:3px}'+
  '.brand-dine{font-size:14px;font-weight:800;color:#00E890;letter-spacing:3px}'+
  '.brand-dot{color:rgba(201,168,76,.7);font-size:10px}'+
  '.sub{font-size:9px;color:rgba(255,255,255,.3);letter-spacing:2px}'+
  '.sep{margin:0 28px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.3),transparent)}'+
  '.qr-wrap{padding:14px 0 10px;text-align:center;position:relative;z-index:1}'+
  '.qr-box{background:#fff;border-radius:14px;padding:10px;display:inline-block}'+
  '.table-badge{text-align:center;padding:2px 0 10px;position:relative;z-index:1}'+
  '.badge-inner{display:inline-flex;align-items:center;gap:8px;border:1.5px solid rgba(201,168,76,.55);border-radius:50px;padding:7px 24px;background:rgba(201,168,76,.07)}'+
  '.badge-label{font-size:11px;font-weight:700;color:rgba(201,168,76,.8);letter-spacing:2px}'+
  '.badge-num{font-size:22px;font-weight:900;color:#C9A84C;line-height:1}'+
  '.footer{text-align:center;padding:4px 0 8px;position:relative;z-index:1}'+
  '.footer p{font-size:8px;color:rgba(255,255,255,.22);letter-spacing:1.5px}'+
  '.deco1{position:absolute;top:-50px;right:-50px;width:180px;height:180px;border-radius:50%;border:1px solid rgba(201,168,76,.12);z-index:0}'+
  '.deco2{position:absolute;bottom:-30px;left:-30px;width:130px;height:130px;border-radius:50%;border:1px solid rgba(201,168,76,.08);z-index:0}'+
  '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'+
  '</style></head>'+
  '<body onload="window.print()">'+
  '<div class="card">'+
  '<div class="gold-top"></div>'+
  '<div class="deco1"></div>'+
  '<div class="deco2"></div>'+
  '<div class="header">'+
  (storeName?'<div class="rest-label">RESTAURANT</div><div class="store-name">'+storeName+'</div>':'')+
  '<div class="divider"><div class="divider-line"></div><span style="color:#C9A84C;font-size:9px">✦</span><div class="divider-line"></div></div>'+
  '<div class="brand"><span class="brand-filo">FILO</span><span class="brand-dot">✦</span><span class="brand-dine">DINE</span></div>'+
  '<div class="sub">Scan to Order · Menu &amp; Pay</div>'+
  '</div>'+
  '<div class="sep"></div>'+
  '<div class="qr-wrap"><div class="qr-box"><img src="'+src+'" style="width:170px;height:170px;display:block"></div></div>'+
  '<div class="table-badge"><div class="badge-inner"><span class="badge-label">TABLE</span><span class="badge-num">'+num+'</span></div></div>'+
  '<div class="footer"><p>powered by FILO · dine.ne.kr</p></div>'+
  '<div class="gold-bot"></div>'+
  '</div>'+
  '</body></html>');
 w.document.close();
}

function _filoShowTableQRModal(did){
 _db.collection('filo_tables').where('dealerId','==',did).get()
  .then(function(snap){
   var tables=[];
   if(snap.empty){
    for(var i=1;i<=10;i++)tables.push({num:i,name:'테이블 '+i});
   } else {
    /* tableNum 또는 tableId 둘 다 지원, 중복 제거 */
    var seen={};
    snap.forEach(function(doc){
     var d=doc.data();
     var num=d.tableNum||d.tableId||1;
     var name=d.tableName||('테이블 '+num);
     /* 같은 번호 중 tableName 있는 것 우선 */
     if(!seen[num]||(!seen[num].hasName&&name!=='테이블 '+num)){
      seen[num]={num:num,name:name,hasName:name!=='테이블 '+num};
     }
    });
    tables=Object.values(seen);
   }
   tables.sort(function(a,b){return a.num-b.num;});

   var mo=document.createElement('div');
   mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:300;padding:16px';
   var box=document.createElement('div');
   box.style.cssText='background:var(--b2);border:1px solid var(--bd);border-radius:20px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;padding:24px';

   var hdr=document.createElement('div');
   hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:16px';
   hdr.innerHTML='<div style="font-size:16px;font-weight:900">테이블 QR 코드</div>';
   var closeBtn=document.createElement('button');
   closeBtn.textContent='×';
   closeBtn.style.cssText='background:transparent;border:none;color:var(--t3);font-size:22px;cursor:pointer;line-height:1';
   closeBtn.onclick=function(){mo.remove();};
   hdr.appendChild(closeBtn);
   box.appendChild(hdr);

   var desc=document.createElement('div');
   desc.style.cssText='font-size:12px;color:var(--t3);margin-bottom:14px';
   desc.textContent='QR 코드를 스캔하면 해당 테이블 주문 페이지가 열립니다';
   box.appendChild(desc);

   var toolBar=document.createElement('div');
   toolBar.style.cssText='display:flex;gap:8px;margin-bottom:16px';
   var printAllBtn=document.createElement('button');
   printAllBtn.textContent='전체 인쇄';
   printAllBtn.style.cssText='padding:6px 14px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:8px;color:#22c55e;font-size:11px;font-weight:700;cursor:pointer';
   printAllBtn.onclick=function(){_filoQRPrintAll();};
   toolBar.appendChild(printAllBtn);
   box.appendChild(toolBar);

   var list=document.createElement('div');
   list.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px';
   box.appendChild(list);

   mo.appendChild(box);
   mo.onclick=function(e){if(e.target===mo)mo.remove();};
   document.body.appendChild(mo);

   var baseUrl='https://filo.ai.kr/order?d='+did+'&t=';

   /* 카드 먼저 생성 */
   tables.forEach(function(t){
    var card=document.createElement('div');
    card.style.cssText='background:var(--b3);border:1px solid var(--bd);border-radius:12px;padding:14px;text-align:center';

    var title=document.createElement('div');
    title.style.cssText='font-size:13px;font-weight:800;margin-bottom:8px';
    title.textContent=t.name;
    card.appendChild(title);

    var qrWrap=document.createElement('div');
    qrWrap.id='qr-c-'+t.num;
    qrWrap.style.cssText='width:120px;height:120px;margin:0 auto;border-radius:8px;overflow:hidden;background:#fff';
    card.appendChild(qrWrap);

    var btnWrap=document.createElement('div');
    btnWrap.style.cssText='margin-top:10px;display:flex;gap:4px;justify-content:center';

    var dlBtn=document.createElement('button');
    dlBtn.textContent='저장';
    dlBtn.style.cssText='padding:4px 10px;background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);border-radius:6px;color:#38bdf8;font-size:10px;font-weight:700;cursor:pointer';
    (function(tNum,tName){dlBtn.onclick=function(){_filoQRDownload(tNum,tName);};})(t.num,t.name);

    var prBtn=document.createElement('button');
    prBtn.textContent='인쇄';
    prBtn.style.cssText='padding:4px 10px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);border-radius:6px;color:#a78bfa;font-size:10px;font-weight:700;cursor:pointer';
    (function(tNum,tName){prBtn.onclick=function(){_filoQRPrint1(tNum,tName);};})(t.num,t.name);

    btnWrap.appendChild(dlBtn);btnWrap.appendChild(prBtn);
    card.appendChild(btnWrap);
    list.appendChild(card);
   });

   /* QR 라이브러리 로드 후 일괄 생성 - DOM 렌더링 후 실행 */
   _filoEnsureQR(function(){
    setTimeout(function(){
     tables.forEach(function(t){
      var cv=document.getElementById('qr-c-'+t.num);
      if(!cv)return;
      var url=baseUrl+t.num+'&name='+encodeURIComponent(t.name);
      try{
       new QRCode(cv,{text:url,width:120,height:120,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
      }catch(e){console.error('QR:',e);}
     });
    },300);
   });
  }).catch(function(e){_filoToast('오류: '+e.message);});
}

function _filoQRPrint1(num,name){
 var wrap=document.getElementById('qr-c-'+num);
 if(!wrap)return;
 var canvas=wrap.querySelector('canvas');
 var imgEl=wrap.querySelector('img');
 var img=canvas?canvas.toDataURL('image/png'):(imgEl?imgEl.src:'');
 if(!img)return;
 var storeName=(_CU&&(_CU.storeName||_CU.displayName||_CU.businessName))||'';
 var w=window.open('','_blank','width=440,height=560');
 if(!w||!w.document){_filoToast('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');return;}
 w.document.write('<html><head><meta charset="UTF-8"><title>'+name+'</title>'+
  '<style>'+
  '*{margin:0;padding:0;box-sizing:border-box}'+
  'html,body{width:400px;height:500px;overflow:hidden}'+
  'body{font-family:"Apple SD Gothic Neo","맑은 고딕","Noto Sans KR",sans-serif;background:#fff}'+
  '.card{width:400px;height:500px;position:relative;overflow:hidden;background:#0A0E2A}'+
  '.gold-top{height:4px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)}'+
  '.gold-bot{position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)}'+
  '.header{padding:22px 28px 14px;text-align:center;position:relative;z-index:1}'+
  '.rest-label{font-size:11px;color:rgba(201,168,76,.65);letter-spacing:4px;font-weight:500;margin-bottom:6px}'+
  '.store-name{font-size:32px;font-weight:900;color:#fff;letter-spacing:6px;line-height:1;margin-bottom:10px}'+
  '.divider{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px}'+
  '.divider-line{height:1px;width:36px;background:rgba(201,168,76,.5)}'+
  '.brand{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:3px}'+
  '.brand-filo{font-size:14px;font-weight:800;color:#00CFFF;letter-spacing:3px}'+
  '.brand-dine{font-size:14px;font-weight:800;color:#00E890;letter-spacing:3px}'+
  '.brand-dot{color:rgba(201,168,76,.7);font-size:10px}'+
  '.sub{font-size:9px;color:rgba(255,255,255,.3);letter-spacing:2px}'+
  '.sep{margin:0 28px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.3),transparent)}'+
  '.qr-wrap{padding:14px 0 10px;text-align:center;position:relative;z-index:1}'+
  '.qr-box{background:#fff;border-radius:14px;padding:10px;display:inline-block}'+
  '.table-badge{text-align:center;padding:2px 0 10px;position:relative;z-index:1}'+
  '.badge-inner{display:inline-flex;align-items:center;gap:8px;border:1.5px solid rgba(201,168,76,.55);border-radius:50px;padding:7px 24px;background:rgba(201,168,76,.07)}'+
  '.badge-label{font-size:11px;font-weight:700;color:rgba(201,168,76,.8);letter-spacing:2px}'+
  '.badge-num{font-size:22px;font-weight:900;color:#C9A84C;line-height:1}'+
  '.footer{text-align:center;padding:4px 0 8px;position:relative;z-index:1}'+
  '.footer p{font-size:8px;color:rgba(255,255,255,.2);letter-spacing:1.5px}'+
  '.deco1{position:absolute;top:-50px;right:-50px;width:180px;height:180px;border-radius:50%;border:1px solid rgba(201,168,76,.12);z-index:0}'+
  '.deco2{position:absolute;bottom:-30px;left:-30px;width:130px;height:130px;border-radius:50%;border:1px solid rgba(201,168,76,.08);z-index:0}'+
  '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'+
  '</style></head>'+
  '<body onload="window.print()">'+
  '<div class="card">'+
  '<div class="gold-top"></div>'+
  '<div class="deco1"></div>'+
  '<div class="deco2"></div>'+
  '<div class="header">'+
  (storeName?'<div class="rest-label">RESTAURANT</div><div class="store-name">'+storeName+'</div>':'')+
  '<div class="divider"><div class="divider-line"></div><span style="color:#C9A84C;font-size:9px">✦</span><div class="divider-line"></div></div>'+
  '<div class="brand"><span class="brand-filo">FILO</span><span class="brand-dot">✦</span><span class="brand-dine">DINE</span></div>'+
  '<div class="sub">Scan to Order · Menu &amp; Pay</div>'+
  '</div>'+
  '<div class="sep"></div>'+
  '<div class="qr-wrap"><div class="qr-box"><img src="'+img+'" style="width:170px;height:170px;display:block"></div></div>'+
  '<div class="table-badge"><div class="badge-inner"><span class="badge-label">TABLE</span><span class="badge-num">'+num+'</span></div></div>'+
  '<div class="footer"><p>powered by FILO · dine.ne.kr</p></div>'+
  '<div class="gold-bot"></div>'+
  '</div>'+
  '</body></html>');
 w.document.close();
}

/* ── A4 4장 인쇄 — Firestore 직접 로드 (DOM 독립) ── */
function _filoQRPrintA4(did){
 did=did||(_CU&&(_CU.dealerId||_CU.uid))||'';
 if(!did){_filoToast('매장 정보 없음');return;}
 var storeName=(_CU&&(_CU.storeName||_CU.displayName||_CU.businessName))||
  (window._cachedCompanyDoc&&(window._cachedCompanyDoc.companyName||window._cachedCompanyDoc.name))||'';

 _db.collection('filo_tables').where('dealerId','==',did).get().then(function(snap){
  var tables=[];
  if(snap.empty){
   for(var i=1;i<=10;i++)tables.push({num:i,name:'테이블 '+i});
  } else {
   var seen={};
   snap.forEach(function(doc){
    var d=doc.data();
    var num=d.tableNum||d.tableId||1;
    var name=d.tableName||('테이블 '+num);
    if(!seen[num])seen[num]={num:num,name:name};
   });
   tables=Object.values(seen);
  }
  tables.sort(function(a,b){return a.num-b.num;});

  _filoEnsureQR(function(){
   /* 숨김 컨테이너에서 QR canvas 생성 후 data URL 추출 */
   var hidden=document.createElement('div');
   hidden.style.cssText='position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden';
   document.body.appendChild(hidden);
   var baseUrl='https://filo.ai.kr/order?d='+did+'&t=';
   var pending=tables.map(function(t){
    var url=baseUrl+t.num+'&name='+encodeURIComponent(t.name);
    var wrap=document.createElement('div');
    wrap.id='_qrp_'+t.num;
    hidden.appendChild(wrap);
    try{new QRCode(wrap,{text:url,width:240,height:240,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M});}catch(e){}
    return {num:t.num,name:t.name,wrap:wrap};
   });

   setTimeout(function(){
    var cards=pending.map(function(p){
     var cv=p.wrap.querySelector('canvas');
     var ig=p.wrap.querySelector('img');
     var src=cv?cv.toDataURL('image/png'):(ig?ig.src:'');
     return src?{num:p.num,name:p.name,src:src}:null;
    }).filter(Boolean);
    document.body.removeChild(hidden);
    if(!cards.length){_filoToast('QR 생성 실패');return;}
    _filoQRPrintBuild(cards,storeName);
   },600);
  });
 }).catch(function(e){_filoToast('테이블 로드 오류: '+e.message);});
}
window._filoQRPrintA4=_filoQRPrintA4;

/* ── 인쇄 HTML 빌드 (A4 4장/페이지) ── */
function _filoQRPrintBuild(allCards,storeName){
 function makeCard(c){
  var numOnly=c.num;
  return '<div class="sticker">'+
   '<div class="gold-top"></div>'+
   '<div class="tbl-big">'+numOnly+'</div>'+
   '<div class="header">'+
   (storeName?'<div class="store-name">'+storeName+'</div>':'')+
   '<div class="brand"><span class="bf">FILO</span><span class="bdot">✦</span><span class="bd">DINE</span></div>'+
   '</div>'+
   '<div class="qr-wrap"><div class="qr-box"><img src="'+c.src+'" class="qr-img"></div></div>'+
   '<div class="footer"><p>Scan to Order · powered by FILO</p></div>'+
   '<div class="gold-bot"></div>'+
   '</div>';
 }
 var pages='';
 for(var i=0;i<allCards.length;i+=4){
  var group=allCards.slice(i,i+4);
  while(group.length<4)group.push(null);
  pages+='<div class="a4-page">'+
   group.map(function(c){return c?makeCard(c):'<div class="sticker empty"></div>';}).join('')+
   '</div>';
 }
 var w=window.open('','_blank');
 if(!w||!w.document){_filoToast('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');return;}
 w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>테이블 QR 인쇄 (A4·4장)</title>'+
  '<style>'+
  '*{margin:0;padding:0;box-sizing:border-box}'+
  '@page{size:A4 portrait;margin:8mm}'+
  'body{font-family:"Apple SD Gothic Neo","맑은 고딕","Noto Sans KR",sans-serif;background:#e5e7eb}'+
  '.no-print{padding:14px 20px;background:#fff;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e5e7eb}'+
  '.a4-page{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:5mm;'+
  'width:194mm;height:281mm;page-break-after:always;background:#fff;padding:0;margin:0 auto 10px}'+
  '.a4-page:last-child{page-break-after:auto}'+
  '.sticker{position:relative;overflow:hidden;background:#0A0E2A;border-radius:10px;'+
  'display:flex;flex-direction:column;align-items:stretch;-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
  '.sticker.empty{background:transparent;border:1.5px dashed #d1d5db}'+
  '.gold-top{height:3px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent);flex-shrink:0}'+
  '.gold-bot{position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)}'+
  '.tbl-big{position:absolute;top:8px;left:12px;font-size:52px;font-weight:900;color:#C9A84C;line-height:1;z-index:10;'+
  'text-shadow:0 0 18px rgba(201,168,76,.35);letter-spacing:-2px;font-family:"Apple SD Gothic Neo","맑은 고딕","Noto Sans KR",sans-serif}'+
  '.header{padding:6px 14px 4px;text-align:center;position:relative;z-index:1;flex-shrink:0}'+
  '.store-name{font-size:12px;font-weight:900;color:#fff;letter-spacing:2px;line-height:1.1;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
  '.brand{display:flex;align-items:center;justify-content:center;gap:4px}'+
  '.bf{font-size:8px;font-weight:800;color:#00CFFF;letter-spacing:2px}'+
  '.bd{font-size:8px;font-weight:800;color:#00E890;letter-spacing:2px}'+
  '.bdot{color:rgba(201,168,76,.7);font-size:6px}'+
  '.qr-wrap{flex:1;display:flex;align-items:stretch;justify-content:center;padding:5px 8px 3px;position:relative;z-index:1}'+
  '.qr-box{background:#fff;border-radius:8px;padding:6px;width:100%;display:flex;align-items:center;justify-content:center}'+
  '.qr-img{width:100%;height:auto;display:block;aspect-ratio:1/1;object-fit:contain}'+
  '.footer{text-align:center;padding:3px 0 6px;position:relative;z-index:1;flex-shrink:0}'+
  '.footer p{font-size:6px;color:rgba(255,255,255,.2);letter-spacing:1px}'+
  '@media print{.no-print{display:none!important}body{background:#fff}.a4-page{margin:0;box-shadow:none}}'+
  '</style></head>'+
  '<body>'+
  '<div class="no-print">'+
  '<span style="font-size:15px;font-weight:800">테이블 QR 인쇄 — A4 · 4장/페이지</span>'+
  '<span style="font-size:12px;color:#6b7280">총 '+allCards.length+'개 · '+Math.ceil(allCards.length/4)+'페이지</span>'+
  '<button onclick="window.print()" style="margin-left:auto;padding:8px 22px;background:#0A0E2A;color:#C9A84C;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">인쇄</button>'+
  '</div>'+
  pages+
  '</body></html>');
 w.document.close();
}

/* 기존 _filoQRPrintAll — 모달 DOM 요소 기반 (하위 호환) */
function _filoQRPrintAll(){
 /* 모달이 열려 있으면 DOM에서 읽고, 아니면 Firestore 직접 로드 */
 var wraps=document.querySelectorAll('[id^="qr-c-"]');
 var storeName=(_CU&&(_CU.storeName||_CU.displayName||_CU.businessName))||
  (window._cachedCompanyDoc&&(window._cachedCompanyDoc.companyName||window._cachedCompanyDoc.name))||'';
 if(!wraps.length){
  /* 모달 없음 → Firestore 직접 */
  _filoQRPrintA4((_CU&&(_CU.dealerId||_CU.uid))||'');
  return;
 }

 /* 카드 데이터 수집 */
 var allCards=[];
 wraps.forEach(function(wrap){
  var num=wrap.id.replace('qr-c-','');
  var canvas=wrap.querySelector('canvas');
  var imgEl=wrap.querySelector('img');
  var src=canvas?canvas.toDataURL('image/png'):(imgEl?imgEl.src:'');
  if(src)allCards.push({num:num,src:src});
 });
 if(!allCards.length){_filoToast('QR 이미지를 불러오지 못했습니다');return;}
 _filoQRPrintBuild(allCards,storeName);
}

function _filoLoadReviewQR(){
 var d=_cachedCompanyDoc||{};
 var wrap=document.getElementById('review-qr-wrap');
 if(!wrap)return;
 var naver=d.reviewUrlNaver||'';
 var kakao=d.reviewUrlKakao||'';
 if(!naver&&!kakao){
  wrap.innerHTML='<div style="font-size:12px;color:var(--t3);padding:20px 0">리뷰 링크가 없습니다. 설정에서 등록해주세요.</div>';
  return;
 }
 var html='';
 if(naver){
  html+='<div style="text-align:center;padding:12px;background:var(--b2);border:1px solid var(--bd);border-radius:12px">'+
   '<div style="font-size:11px;font-weight:800;color:#03C75A;margin-bottom:8px">네이버 리뷰</div>'+
   '<div style="background:#fff;border-radius:8px;padding:6px;display:inline-block" id="review-qr-naver"></div>'+
   '<div style="font-size:10px;color:var(--t3);margin-top:6px">스캔 후 리뷰 작성</div>'+
   '</div>';
 }
 if(kakao){
  html+='<div style="text-align:center;padding:12px;background:var(--b2);border:1px solid var(--bd);border-radius:12px">'+
   '<div style="font-size:11px;font-weight:800;color:#FEE500;margin-bottom:8px">카카오맵 리뷰</div>'+
   '<div style="background:#fff;border-radius:8px;padding:6px;display:inline-block" id="review-qr-kakao"></div>'+
   '<div style="font-size:10px;color:var(--t3);margin-top:6px">스캔 후 리뷰 작성</div>'+
   '</div>';
 }
 wrap.innerHTML=html;
 // QR 생성
 _filoEnsureQR(function(){
  if(naver&&document.getElementById('review-qr-naver')){
   new QRCode(document.getElementById('review-qr-naver'),{text:naver,width:120,height:120,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
  }
  if(kakao&&document.getElementById('review-qr-kakao')){
   new QRCode(document.getElementById('review-qr-kakao'),{text:kakao,width:120,height:120,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
  }
 });
}

function _filoReviewQRPrint(){
 var d=_cachedCompanyDoc||{};
 var naver=d.reviewUrlNaver||'';
 var kakao=d.reviewUrlKakao||'';
 var companyName=d.companyName||d.name||'매장';
 if(!naver&&!kakao){_filoToast('설정에서 리뷰 링크를 먼저 등록하세요');return;}

 var win=window.open('','_blank');
 var items='';
 if(naver) items+='<div class="qr-item"><div class="platform naver">네이버 리뷰</div><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+encodeURIComponent(naver)+'" width="200" height="200"><div class="label">QR 스캔 → 리뷰 작성</div></div>';
 if(kakao) items+='<div class="qr-item"><div class="platform kakao">카카오맵 리뷰</div><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+encodeURIComponent(kakao)+'" width="200" height="200"><div class="label">QR 스캔 → 리뷰 작성</div></div>';

 win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>리뷰 QR - '+companyName+'</title>'+
  '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Apple SD Gothic Neo","Noto Sans KR",sans-serif;background:#fff;padding:20px}'+
  'h1{text-align:center;font-size:18px;font-weight:900;margin-bottom:6px}'+
  '.subtitle{text-align:center;font-size:12px;color:#888;margin-bottom:20px}'+
  '.qr-wrap{display:flex;gap:20px;justify-content:center;flex-wrap:wrap}'+
  '.qr-item{text-align:center;padding:20px;border:2px solid #eee;border-radius:16px;width:260px}'+
  '.platform{font-size:14px;font-weight:800;margin-bottom:12px}'+
  '.platform.naver{color:#03C75A}.platform.kakao{color:#B8860B}'+
  '.label{font-size:12px;color:#666;margin-top:10px;font-weight:600}'+
  '.msg{text-align:center;margin-top:20px;font-size:13px;color:#444;font-weight:600;padding:12px;background:#f9f9f9;border-radius:8px}'+
  '@media print{body{padding:10px}}</style></head><body>'+
  '<h1>⭐ 리뷰를 남겨주세요!</h1>'+
  '<div class="subtitle">'+companyName+' · 소중한 리뷰가 큰 힘이 됩니다</div>'+
  '<div class="qr-wrap">'+items+'</div>'+
  '<div class="msg">QR코드를 스캔하시면 리뷰 페이지로 바로 이동합니다</div>'+
  '</body></html>');
 win.document.close();
 setTimeout(function(){win.print();},800);
}

