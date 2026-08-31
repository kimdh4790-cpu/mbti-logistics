/*
 * filo-pos.js — Enterprise POS 결제 터미널
 * Copyright (c) 2024-2026 유한회사 엠비티아이
 * 2026-08-28 전면 재설계: 풀스크린 결제 화면
 *
 * 진입점: _filoPay() — 기존 4버튼 모달 → 기업급 풀스크린 터미널
 *
 * 결제 수단: 카드·현금·카카오페이·네이버페이·토스페이·서비스
 * 현금: 소프트 넘패드 + 거스름돈 자동계산
 * 카드: 단말기 탭 애니메이션
 * 분할: _filoSplitPay(total) (filo-pos-core.js)
 *
 * 결제 확정 → _filoConfirmPay(method, label) (filo-payment.js)
 */

// ── 전역 상태 ────────────────────────────────────────────────────────────────
var _posPayMethod=null, _posCashIn='', _posTotal=0, _posDOld=0;

// ── 진입점 ───────────────────────────────────────────────────────────────────
function _filoPay(){
 if(!window._cartItems||!_cartItems.length){_filoToast('장바구니가 비어 있습니다');return;}
 var raw=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var disc=window._posDiscount||0;
 var total=Math.max(0,raw-disc);
 if(total<=0){_filoToast('결제 금액이 없습니다');return;}
 _posPayMethod=null; _posCashIn=''; _posDOld=disc; _posTotal=total;
 _posTerminalOpen(raw,disc,total);
}

// ── 터미널 렌더 ──────────────────────────────────────────────────────────────
function _posTerminalOpen(raw,disc,total){
 var el=document.getElementById('pos-pay-term');if(el)el.remove();
 var vat=Math.round(total/11), sub=total-vat;
 var tbl=window._selectedTableName||'카운터';
 var now=new Date();
 var ts=now.toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'})+
        ' '+now.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});

 var term=document.createElement('div');
 term.id='pos-pay-term';
 term.style.cssText='position:fixed;inset:0;z-index:900;background:#070d1b;display:flex;flex-direction:column;font-family:Pretendard,-apple-system,sans-serif;color:#e2e8f0;overflow:hidden';

 // ── 헤더 ─────────────────────────────────────────────────────────────────
 var hdr='<div style="height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:#0b1220;border-bottom:1px solid rgba(255,255,255,.06)">'+
  '<button id="pos-cancel-btn" style="background:none;border:none;color:#64748b;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;min-height:44px;padding:0 8px">'+
  _svgIcon('x')+'<span>취소</span></button>'+
  '<div style="text-align:center">'+
  '<div style="font-size:11px;font-weight:900;letter-spacing:1.5px;color:#475569;text-transform:uppercase">결제 터미널</div>'+
  '<div style="font-size:12px;font-weight:700;color:#cbd5e1;margin-top:1px">'+tbl+'</div>'+
  '</div>'+
  '<div style="font-size:10px;color:#334155;text-align:right;line-height:1.5">'+ts+'</div>'+
  '</div>';

 // ── 바디 (모바일: 세로 / 데스크탑: 가로) ──────────────────────────────────
 var mob=window.innerWidth<640;
 var body='<div style="flex:1;display:flex;min-height:0;overflow:hidden;flex-direction:'+(mob?'column':'row')+'">'+
  '<div id="pos-left" style="'+(mob?'width:100%;max-height:42%;':'width:320px;flex-shrink:0;')+'display:flex;flex-direction:column;background:#0b1220;border-'+(mob?'bottom':'right')+':1px solid rgba(255,255,255,.06);overflow-y:auto">'+
  _posLeftCol(raw,disc,sub,vat,total)+'</div>'+
  '<div id="pos-right" style="flex:1;display:flex;flex-direction:column;overflow-y:auto;padding:'+(mob?'12px 16px 16px':'18px 20px 20px')+'">'+
  '<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#334155;text-transform:uppercase;margin-bottom:12px">결제 수단</div>'+
  _posMethodGrid()+
  '<div style="margin-top:10px;display:flex;gap:8px">'+
  '<button id="pos-discount-btn" onclick="_posDiscountModal('+total+')" style="flex:1;height:44px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);border-radius:8px;color:#818cf8;font-size:12px;font-weight:700;cursor:pointer">'+
  _svgIcon('tag')+' 할인</button>'+
  '<button onclick="_filoSplitPay('+total+');document.getElementById(\'pos-pay-term\').remove();" style="flex:1;height:44px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);border-radius:8px;color:#f59e0b;font-size:12px;font-weight:700;cursor:pointer">'+
  _svgIcon('split-square-horizontal')+' 분할결제</button>'+
  '</div>'+
  '<div id="pos-dynamic" style="flex:1;overflow:hidden;margin-top:14px;display:flex;flex-direction:column"></div>'+
  '<div id="pos-confirm-wrap" style="margin-top:12px">'+_posConfirmBtn(null,total)+'</div>'+
  '</div>'+
  '</div>';

 term.innerHTML=hdr+body;
 document.body.appendChild(term);

 term.querySelector('#pos-cancel-btn').onclick=function(){
  term.remove(); window._posDiscount=_posDOld;
 };
 _posBindMethods(total,raw,disc);
}

// ── 좌측: 주문내역 + 합계 ────────────────────────────────────────────────────
function _posLeftCol(raw,disc,sub,vat,total){
 var items=window._cartItems||[];
 var itemsHtml=items.map(function(c){
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px;border-bottom:1px solid rgba(255,255,255,.04)">'+
   '<div>'+
   '<div style="font-size:13px;font-weight:700;color:#cbd5e1">'+c.name+'</div>'+
   '<div style="font-size:11px;color:#475569;margin-top:2px">×'+c.qty+' · ₩'+(c.price).toLocaleString()+'/개</div>'+
   '</div>'+
   '<div style="font-size:14px;font-weight:900;color:#e2e8f0">₩'+(c.price*c.qty).toLocaleString()+'</div>'+
   '</div>';
 }).join('');

 var discRow=disc>0?
  '<div style="display:flex;justify-content:space-between;padding:6px 20px">'+
  '<span style="font-size:12px;color:#f87171">할인</span>'+
  '<span style="font-size:12px;font-weight:700;color:#f87171">-₩'+disc.toLocaleString()+'</span></div>':'';

 return '<div style="padding:16px 20px 10px;border-bottom:1px solid rgba(255,255,255,.06)">'+
  '<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#334155;text-transform:uppercase;margin-bottom:8px">주문 내역</div>'+
  '</div>'+
  '<div style="flex:1;overflow-y:auto">'+itemsHtml+'</div>'+
  '<div style="border-top:1px solid rgba(255,255,255,.08);padding:12px 20px;background:#070d1b">'+
  '<div style="display:flex;justify-content:space-between;padding:4px 0">'+
  '<span style="font-size:12px;color:#475569">소계</span>'+
  '<span style="font-size:12px;color:#94a3b8">₩'+raw.toLocaleString()+'</span></div>'+
  discRow+
  '<div style="display:flex;justify-content:space-between;padding:4px 0">'+
  '<span style="font-size:11px;color:#334155">부가세(VAT 10%)</span>'+
  '<span style="font-size:11px;color:#334155">₩'+vat.toLocaleString()+'</span></div>'+
  '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 0;border-top:1px solid rgba(255,255,255,.08);margin-top:6px">'+
  '<span style="font-size:13px;font-weight:900;color:#94a3b8;letter-spacing:.5px">합계</span>'+
  '<span style="font-size:26px;font-weight:900;color:#c8a356;letter-spacing:-1px">₩'+total.toLocaleString()+'</span></div>'+
  '</div>';
}

// ── 우측: 결제수단 그리드 ────────────────────────────────────────────────────
var _POS_METHODS=[
 {key:'card',  label:'카드',     sub:'신용·체크',   icon:'credit-card',       bg:'#0284c7',  glow:'rgba(2,132,199,.3)'},
 {key:'cash',  label:'현금',     sub:'거스름돈 계산', icon:'banknote',          bg:'#16a34a',  glow:'rgba(22,163,74,.3)'},
 {key:'kakao', label:'카카오페이', sub:'QR·바코드',   icon:'smartphone',        bg:'#FEE500',  glow:'rgba(254,229,0,.3)',  tc:'#000000'},
 {key:'naver', label:'네이버페이', sub:'QR·바코드',   icon:'smartphone',        bg:'#03C75A',  glow:'rgba(3,199,90,.3)'},
 {key:'toss',  label:'토스페이', sub:'온라인 결제',  icon:'zap',               bg:'#0064FF',  glow:'rgba(0,100,255,.3)'},
 {key:'service',label:'서비스',  sub:'무료제공',    icon:'gift',              bg:'#64748b',  glow:'rgba(100,116,139,.3)'},
];

function _posMethodGrid(){
 var online=navigator.onLine;
 return (online?'':'<div style="margin-bottom:10px;padding:10px 12px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:8px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg><span style="font-size:11px;color:#ef4444;font-weight:700">오프라인 — 현금·카드(단말기) 결제 가능</span></div><button onclick="typeof _filoHotspotTip===\'function\'&&_filoHotspotTip()" style="width:100%;padding:7px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.4);border-radius:8px;color:#c9a84c;font-size:11px;font-weight:800;cursor:pointer;letter-spacing:.3px">카카오·QR 결제하려면? 핫스팟(공유기) 연결 안내 보기</button></div>')+
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+
  _POS_METHODS.map(function(m){
   var isCardOffline=!online&&m.key==='card';
   var disabled=!online&&m.key!=='cash'&&m.key!=='service'&&m.key!=='card';
   return '<button class="pos-method-btn" data-method="'+m.key+'" '+
    (disabled?'disabled ':'')+
    'style="background:'+(isCardOffline?'rgba(201,168,76,.12)':'rgba(255,255,255,.04)')+';border:1.5px solid '+(isCardOffline?'rgba(201,168,76,.5)':'rgba(255,255,255,.08)')+';border-radius:12px;'+
    'padding:14px 8px 12px;cursor:'+(disabled?'not-allowed':'pointer')+';display:flex;flex-direction:column;align-items:center;gap:6px;'+
    'min-height:80px;transition:all .18s;touch-action:manipulation;'+(disabled?'opacity:.35;':'')+'">'+
    '<div style="width:36px;height:36px;border-radius:10px;background:'+m.bg+'22;display:flex;align-items:center;justify-content:center;color:'+m.bg+'">'+
    _svgIcon(m.icon)+'</div>'+
    '<div style="font-size:12px;font-weight:900;color:'+(isCardOffline?'#c9a84c':'#cbd5e1')+'">'+m.label+'</div>'+
    '<div style="font-size:9px;color:'+(isCardOffline?'#a08030':'#334155')+';font-weight:600">'+(isCardOffline?'단말기 직접':(disabled?'인터넷 필요':m.sub))+'</div>'+
    '</button>';
  }).join('')+
  '</div>';
}

// ── 결제수단 이벤트 바인딩 ────────────────────────────────────────────────────
function _posBindMethods(total,raw,disc){
 document.querySelectorAll('.pos-method-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
   var m=btn.dataset.method;
   _posSelectMethod(m,total,raw,disc);
  });
 });
}

function _posSelectMethod(m,total,raw,disc){
 _posPayMethod=m;
 // 하이라이트
 document.querySelectorAll('.pos-method-btn').forEach(function(b){
  b.style.background='rgba(255,255,255,.04)';
  b.style.borderColor='rgba(255,255,255,.08)';
  b.style.boxShadow='none';
 });
 var sel=document.querySelector('[data-method="'+m+'"]');
 if(sel){
  var md=_POS_METHODS.find(function(x){return x.key===m;});
  if(md){
   sel.style.background=md.bg+'18';
   sel.style.borderColor=md.bg;
   sel.style.boxShadow='0 0 0 3px '+md.glow;
  }
 }
 // 다이나믹 영역 업데이트
 var dyn=document.getElementById('pos-dynamic');
 if(!dyn)return;
 // 오프라인 카드 → card_direct 모드
 if(m==='card'&&!navigator.onLine){_posPayMethod='card_direct';m='card_direct';}
 if(m==='cash') dyn.innerHTML=_posCashArea(total);
 else if(m==='card') dyn.innerHTML=_posCardArea();
 else if(m==='card_direct') dyn.innerHTML=_posCardDirectArea(total);
 else if(m==='kakao'||m==='naver') dyn.innerHTML=_posQrArea(m,total);
 else if(m==='toss') dyn.innerHTML=_posTossArea(total);
 else dyn.innerHTML='';
 // 컨펌 버튼 업데이트
 var cw=document.getElementById('pos-confirm-wrap');
 if(cw) cw.innerHTML=_posConfirmBtn(m,total);
 if(m==='cash') _posBindNumpad(total);
}

// ── 현금 영역 (넘패드 + 거스름돈) ────────────────────────────────────────────
function _posCashArea(total){
 var quickAmts=[10000,20000,50000,100000,500000];
 var quickBtns=quickAmts.filter(function(a){return a>=total;}).slice(0,4);
 if(!quickBtns.length) quickBtns=[total+1000,total+5000,total+10000,total+50000].map(function(a){
  return Math.ceil(a/1000)*1000;
 }).slice(0,4);

 return '<div style="display:flex;flex-direction:column;gap:10px;height:100%">'+
  '<div style="background:#0b1220;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 16px">'+
  '<div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#334155;margin-bottom:6px;text-transform:uppercase">받은 금액</div>'+
  '<div id="pos-cash-display" style="font-size:28px;font-weight:900;color:#22c55e;letter-spacing:-1px;min-height:38px">'+
  (_posCashIn?'₩'+parseInt(_posCashIn||'0').toLocaleString():'—')+
  '</div>'+
  '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center">'+
  '<span style="font-size:11px;color:#475569">거스름돈</span>'+
  '<span id="pos-change-display" style="font-size:16px;font-weight:900;color:#f9d900">'+
  (_posCashIn&&parseInt(_posCashIn)>=total?'₩'+(parseInt(_posCashIn)-total).toLocaleString():'—')+
  '</span></div>'+
  '</div>'+
  '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
  quickBtns.map(function(a){
   return '<button onclick="_posSetCash('+a+')" style="flex:1;min-width:60px;height:36px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);border-radius:8px;color:#22c55e;font-size:12px;font-weight:700;cursor:pointer">'+
    '₩'+(a/10000)+'만</button>';
  }).join('')+
  '<button onclick="_posSetCash('+total+')" style="flex:1;min-width:60px;height:36px;background:rgba(200,163,86,.12);border:1px solid rgba(200,163,86,.25);border-radius:8px;color:#c8a356;font-size:12px;font-weight:700;cursor:pointer">정확히</button>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;flex:1">'+
  ['7','8','9','4','5','6','1','2','3','00','0','⌫'].map(function(k){
   var isDel=k==='⌫';
   return '<button data-numkey="'+k+'" '+
    'style="height:54px;background:'+(isDel?'rgba(239,68,68,.1)':'rgba(255,255,255,.04)')+';;border:1px solid '+(isDel?'rgba(239,68,68,.2)':'rgba(255,255,255,.07)')+';border-radius:10px;'+
    'font-size:'+(isDel?'18':'22')+'px;font-weight:900;color:'+(isDel?'#f87171':'#e2e8f0')+';cursor:pointer;'+
    'transition:.1s;touch-action:manipulation">'+k+'</button>';
  }).join('')+
  '</div>'+
  '</div>';
}

function _posBindNumpad(total){
 document.querySelectorAll('[data-numkey]').forEach(function(btn){
  btn.addEventListener('click',function(){_posNumKey(btn.dataset.numkey,total);});
  btn.addEventListener('touchend',function(e){e.preventDefault();_posNumKey(btn.dataset.numkey,total);});
 });
}

function _posNumKey(k,total){
 if(k==='⌫'){_posCashIn=_posCashIn.slice(0,-1);}
 else if(k==='00'){if(_posCashIn)_posCashIn+=k;}
 else{if(_posCashIn.length<9)_posCashIn+=k;}
 _posUpdateCashDisplay(total);
}

function _posSetCash(amt){
 _posCashIn=String(amt);
 if(window._posTotal) _posUpdateCashDisplay(window._posTotal);
 else{var d=document.getElementById('pos-cash-display');if(d)d.textContent='₩'+amt.toLocaleString();}
}

function _posUpdateCashDisplay(total){
 var amt=parseInt(_posCashIn||'0')||0;
 var cd=document.getElementById('pos-cash-display');
 if(cd) cd.textContent=amt?'₩'+amt.toLocaleString():'—';
 var ch=document.getElementById('pos-change-display');
 if(ch){
  var change=amt-total;
  ch.textContent=amt>=total?'₩'+change.toLocaleString():'—';
  ch.style.color=amt>=total?'#f9d900':'#334155';
 }
 var conf=document.getElementById('pos-confirm-btn');
 if(conf){
  var ok=amt>=total;
  conf.disabled=!ok;
  conf.style.opacity=ok?'1':'0.45';
  conf.style.cursor=ok?'pointer':'not-allowed';
  conf.style.background=ok?'#22c55e':'rgba(34,197,94,.25)';
 }
}

// ── 카드 단말기 직접 결제 영역 (오프라인 전용) ────────────────────────────────
function _posCardDirectArea(total){
 return '<div style="background:rgba(201,168,76,.08);border:1.5px solid rgba(201,168,76,.35);border-radius:14px;padding:18px 16px">'+
  '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">'+
  '<div style="width:32px;height:32px;border-radius:8px;background:rgba(201,168,76,.2);display:flex;align-items:center;justify-content:center">'+
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'+
  '</div><div style="font-size:14px;font-weight:900;color:#c9a84c">카드 단말기 직접 결제</div></div>'+
  '<div style="font-size:12px;color:var(--t2);line-height:2;margin-bottom:12px">'+
  '<div><strong style="color:var(--tx)">① </strong>카드 단말기에 <strong style="color:#c9a84c">₩'+total.toLocaleString()+'</strong> 입력 후 카드를 긁어주세요</div>'+
  '<div><strong style="color:var(--tx)">② </strong>단말기에서 승인이 완료되면</div>'+
  '<div><strong style="color:var(--tx)">③ </strong>아래 <strong style="color:#c9a84c">확인 버튼</strong>을 눌러주세요</div>'+
  '</div>'+
  '<div style="background:rgba(255,255,255,.04);border-radius:8px;padding:8px 12px;font-size:11px;color:var(--t3)">'+
  '단말기 승인 금액과 POS 금액이 일치하는지 꼭 확인하세요</div></div>';
}

// ── 카드 영역 (단말기 애니메이션) ────────────────────────────────────────────
function _posCardArea(){
 return '<style>'+
  '@keyframes cardPulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}'+
  '@keyframes cardWave{0%{box-shadow:0 0 0 0 rgba(2,132,199,.7)}100%{box-shadow:0 0 0 24px rgba(2,132,199,0)}}'+
  '.card-reader-icon{animation:cardPulse 1.8s ease-in-out infinite}'+
  '.card-reader-ring{animation:cardWave 1.8s ease-in-out infinite}'+
  '</style>'+
  '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:20px">'+
  '<div class="card-reader-ring" style="width:96px;height:96px;border-radius:50%;background:rgba(2,132,199,.15);border:2px solid #0284c7;display:flex;align-items:center;justify-content:center">'+
  '<div class="card-reader-icon" style="color:#0284c7;display:flex">'+
  '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+
  '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>'+
  '</svg></div></div>'+
  '<div style="text-align:center">'+
  '<div style="font-size:15px;font-weight:900;color:#e2e8f0;margin-bottom:6px">카드를 단말기에 올려주세요</div>'+
  '<div style="font-size:12px;color:#475569">IC카드 삽입 · 마그네틱 · 비접촉(NFC) 지원</div>'+
  '</div>'+
  '<div style="display:flex;gap:24px">'+
  _posCardMethodIcon('NFC','wifi')+''+
  _posCardMethodIcon('IC카드','credit-card')+''+
  _posCardMethodIcon('마그네틱','minus-square')+
  '</div>'+
  '</div>';
}

function _posCardMethodIcon(label, icon){
 return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px">'+
  '<div style="color:#0284c7;opacity:.6">'+_svgIcon(icon)+'</div>'+
  '<div style="font-size:10px;color:#334155;font-weight:600">'+label+'</div></div>';
}

// ── 카카오/네이버 QR 영역 ────────────────────────────────────────────────────
function _posQrArea(m,total){
 var cfg=m==='kakao'
  ?{bg:'#FEE500',tc:'#000000',label:'카카오페이',sub:'카카오톡 → 결제 → 바코드'}
  :{bg:'#03C75A',tc:'#ffffff',label:'네이버페이',sub:'네이버페이 앱 → QR·바코드'};
 return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px">'+
  '<div style="background:'+cfg.bg+';border-radius:16px;padding:24px;text-align:center">'+
  '<div style="font-size:32px;font-weight:900;color:'+cfg.tc+'">₩'+total.toLocaleString()+'</div>'+
  '<div style="margin-top:12px;width:120px;height:120px;background:rgba(0,0,0,.12);border-radius:8px;display:flex;align-items:center;justify-content:center;margin:12px auto 0">'+
  '<div style="color:'+cfg.tc+';font-size:11px;font-weight:700">QR 스캔</div>'+
  '</div>'+
  '</div>'+
  '<div style="text-align:center">'+
  '<div style="font-size:14px;font-weight:900;color:#e2e8f0">'+cfg.label+'</div>'+
  '<div style="font-size:11px;color:#475569;margin-top:4px">'+cfg.sub+'</div>'+
  '</div>'+
  '</div>';
}

// ── 토스페이 영역 ─────────────────────────────────────────────────────────────
function _posTossArea(total){
 return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px">'+
  '<div style="background:rgba(0,100,255,.1);border:1px solid rgba(0,100,255,.25);border-radius:16px;padding:24px 32px;text-align:center">'+
  '<div style="font-size:22px;font-weight:900;color:#0064FF">토스페이먼츠</div>'+
  '<div style="font-size:28px;font-weight:900;color:#e2e8f0;margin:12px 0">₩'+total.toLocaleString()+'</div>'+
  '<button onclick="_filoTossPosPay&&_filoTossPosPay('+total+',null);document.getElementById(\'pos-pay-term\').remove();" '+
  'style="width:100%;height:48px;background:#0064FF;border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;margin-top:8px">'+
  '토스로 결제하기</button>'+
  '</div>'+
  '<div style="font-size:11px;color:#334155">안전한 SSL 암호화 결제</div>'+
  '</div>';
}

// ── 할인 모달 ────────────────────────────────────────────────────────────────
function _posDiscountModal(total){
 var mo=document.createElement('div');
 mo.className='mo';mo.style.zIndex='950';
 var discVal=window._posDiscount||0;
 var discPct=Math.round(discVal/total*100);
 mo.innerHTML='<div style="padding:24px;width:100%;max-width:380px;background:#0f1929;border-radius:22px;border:1px solid rgba(255,255,255,.08)">'+
  '<div style="font-size:15px;font-weight:900;color:#e2e8f0;margin-bottom:16px">할인 적용</div>'+
  '<div style="display:flex;gap:6px;margin-bottom:14px">'+
  '<button id="disc-tab-amt" onclick="_posDiscTab(\'amt\')" style="flex:1;height:36px;border-radius:8px;border:none;font-size:13px;font-weight:700;cursor:pointer;background:#c8a356;color:#000">정액 (₩)</button>'+
  '<button id="disc-tab-pct" onclick="_posDiscTab(\'pct\')" style="flex:1;height:36px;border-radius:8px;border:none;font-size:13px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.06);color:#64748b">정률 (%)</button>'+
  '</div>'+
  '<input id="disc-input" type="number" min="0" placeholder="할인 금액 입력" value="'+discVal+'" '+
  'style="width:100%;padding:13px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#e2e8f0;font-size:20px;font-weight:900;outline:none;box-sizing:border-box">'+
  '<div style="display:flex;gap:6px;margin-top:10px">'+
  [10,20,30,50].map(function(p){
   return '<button onclick="_posSetDiscPct('+p+','+total+')" '+
    'style="flex:1;height:34px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:8px;color:#94a3b8;font-size:12px;font-weight:700;cursor:pointer">'+p+'%</button>';
  }).join('')+
  '</div>'+
  '<div style="display:flex;gap:8px;margin-top:16px">'+
  '<button onclick="window._posDiscount=0;document.querySelector(\'.mo\').remove();_posTerminalOpen('+
  _cartItems.reduce(function(s,c){return s+c.price*c.qty;},0)+',0,'+
  _cartItems.reduce(function(s,c){return s+c.price*c.qty;},0)+');" '+
  'style="flex:1;height:44px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:10px;color:#f87171;font-size:13px;font-weight:700;cursor:pointer">할인 제거</button>'+
  '<button onclick="_posApplyDiscount('+total+')" '+
  'style="flex:2;height:44px;background:#c8a356;border:none;border-radius:10px;color:#000;font-size:14px;font-weight:900;cursor:pointer">적용</button>'+
  '</div>'+
  '</div>';
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}
function _posDiscTab(t){
 var amt=document.getElementById('disc-tab-amt');
 var pct=document.getElementById('disc-tab-pct');
 if(!amt||!pct)return;
 if(t==='amt'){
  amt.style.background='#c8a356';amt.style.color='#000';
  pct.style.background='rgba(255,255,255,.06)';pct.style.color='#64748b';
 } else {
  pct.style.background='#c8a356';pct.style.color='#000';
  amt.style.background='rgba(255,255,255,.06)';amt.style.color='#64748b';
 }
}
function _posSetDiscPct(p,total){
 var inp=document.getElementById('disc-input');
 if(inp) inp.value=Math.round(total*p/100);
}
function _posApplyDiscount(total){
 var inp=document.getElementById('disc-input');
 var val=inp?parseInt(inp.value)||0:0;
 window._posDiscount=Math.min(val,total);
 var mo=document.querySelector('.mo');if(mo)mo.remove();
 var raw=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var newTotal=Math.max(0,raw-window._posDiscount);
 _posTerminalOpen(raw,window._posDiscount,newTotal);
}

// ── 확인 버튼 ────────────────────────────────────────────────────────────────
function _posConfirmBtn(method,total){
 if(method==='card_direct'){
  return '<button id="pos-confirm-btn" onclick="_posDo()" '+
   'style="width:100%;height:56px;background:#c9a84c;border:none;border-radius:14px;'+
   'font-size:15px;font-weight:900;color:#0f172a;cursor:pointer;letter-spacing:.3px;'+
   'box-shadow:0 4px 20px rgba(201,168,76,.4);transition:.2s">'+
   '단말기 결제 완료 확인   ₩'+total.toLocaleString()+'</button>';
 }
 var mCfg=method?_POS_METHODS.find(function(x){return x.key===method;}):null;
 var bg=mCfg?mCfg.bg:'rgba(200,163,86,.3)';
 var tc=mCfg?(mCfg.tc||'#fff'):'rgba(200,163,86,.5)';
 var label=mCfg?mCfg.label:'결제 수단을 선택하세요';
 var disabled=!method;
 return '<button id="pos-confirm-btn" onclick="_posDo()" '+
  (disabled?'disabled':'')+' '+
  'style="width:100%;height:56px;background:'+bg+';border:none;border-radius:14px;'+
  'font-size:16px;font-weight:900;color:'+tc+';cursor:'+(disabled?'not-allowed':'pointer')+';'+
  'opacity:'+(disabled?'0.45':'1')+';letter-spacing:.5px;'+
  'box-shadow:'+(mCfg?'0 4px 20px '+mCfg.glow:'none')+';transition:.2s">'+
  (method?label+' 결제   ₩'+total.toLocaleString():label)+
  '</button>';
}

// ── 결제 실행 ────────────────────────────────────────────────────────────────
function _posDo(){
 var m=_posPayMethod;
 if(!m){_filoToast('결제 수단을 선택하세요');return;}
 if(m==='cash'){
  var cash=parseInt(_posCashIn||'0')||0;
  if(cash<_posTotal){_filoToast('받은 금액이 부족합니다');return;}
 }
 var mCfg=_POS_METHODS.find(function(x){return x.key===m;});
 var label=mCfg?mCfg.label:m;
 var term=document.getElementById('pos-pay-term');
 if(term)term.remove();
 // 현금 거스름돈 토스트
 if(m==='cash'){
  var change=parseInt(_posCashIn||'0')-_posTotal;
  if(change>0)_filoToast('거스름돈 ₩'+change.toLocaleString());
 }
 _filoConfirmPay(m,label);
}
