/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      dine-analytics.js
 * @description 분석·통계·FILO재고감시·로그인 후 실시간 시작
 */
// dine.js에서 분리됨 (리팩토링 2026-07-13)

function _dineAnalytics(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';

 if(!document.getElementById('anav2-styles')){
  var st=document.createElement('style');st.id='anav2-styles';
  st.textContent=
   /* ── keyframes ── */
   '@keyframes av2-blink{0%,100%{opacity:1;box-shadow:0 0 6px #22c55e}50%{opacity:.3;box-shadow:none}}'+
   '@keyframes av2-cin{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}'+
   '@keyframes av2-shim{0%{background-position:200% 0}100%{background-position:-200% 0}}'+
   '@keyframes av2-barIn{from{width:0}to{width:var(--w)}}'+
   '@keyframes av2-numUp{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}'+
   '@keyframes av2-glint{0%{transform:translateX(-100%) skewX(-20deg)}100%{transform:translateX(300%) skewX(-20deg)}}'+
   /* ── live bar ── */
   '.av2-live{display:flex;align-items:center;gap:10px;background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.18);border-radius:12px;padding:10px 16px;margin-bottom:20px}'+
   '.av2-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0;animation:av2-blink 1.5s ease-in-out infinite}'+
   /* ── header ── */
   '.av2-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px}'+
   '.av2-tabs{display:flex;gap:3px;background:var(--s1);border-radius:10px;padding:3px}'+
   '.ana-tab2{height:30px;padding:0 14px;border-radius:8px;border:none;font-size:12px;font-weight:700;color:var(--t2);background:transparent;cursor:pointer;transition:.15s}'+
   '.ana-tab2.on{background:var(--s3);color:var(--tx);box-shadow:0 2px 8px rgba(0,0,0,.35)}'+
   /* ── KPI grid ── */
   '.av2-kg{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}'+
   '@media(max-width:640px){.av2-kg{grid-template-columns:repeat(2,1fr)}}'+
   '.av2-kc{position:relative;overflow:hidden;border-radius:16px;padding:18px 16px;background:var(--s2);border:1px solid var(--bd2);cursor:default;transition:transform .2s,box-shadow .2s;animation:av2-cin .45s ease both}'+
   '.av2-kc::before{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent);animation:av2-glint 3s ease-in-out 1.2s 1}'+
   '.av2-kc:hover{transform:translateY(-3px);box-shadow:0 10px 30px rgba(0,0,0,.35)}'+
   '.av2-kc .glw{position:absolute;width:100px;height:100px;border-radius:50%;opacity:.09;bottom:-30px;right:-30px;filter:blur(35px)}'+
   '.av2-kc .kico{position:absolute;bottom:10px;right:12px;opacity:.07}'+
   '.av2-kc .kico svg{width:40px;height:40px;stroke:currentColor;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}'+
   '.av2-kc .klbl{font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--t3);margin-bottom:8px}'+
   '.av2-kc .knum{font-size:22px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums;animation:av2-numUp .4s ease both}'+
   '.av2-kc .ksub{font-size:11px;color:var(--t2);margin-top:5px}'+
   '.av2-kc .kdelta{display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:800;margin-top:8px;padding:2px 8px;border-radius:20px}'+
   /* ── trend card ── */
   '.av2-trend{background:var(--s2);border:1px solid var(--bd2);border-radius:16px;padding:20px;margin-bottom:16px}'+
   '.av2-trnd-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}'+
   '.av2-tt{font-size:13px;font-weight:800;color:var(--tx)}'+
   '.av2-ts{font-size:11px;color:var(--t3);margin-top:3px}'+
   '.av2-cw{position:relative;height:165px}'+
   /* ── 2-col & 3-col rows ── */
   '.av2-r2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}'+
   '.av2-r3{display:grid;grid-template-columns:2fr 1fr 1fr;gap:14px;margin-bottom:16px}'+
   '@media(max-width:700px){.av2-r2,.av2-r3{grid-template-columns:1fr}}'+
   '.av2-cc{background:var(--s2);border:1px solid var(--bd2);border-radius:16px;padding:18px}'+
   '.av2-chd{margin-bottom:12px}'+
   /* ── heatmap ── */
   '.av2-hm{display:grid;grid-template-columns:repeat(9,1fr);gap:3px;margin-top:10px}'+
   '.av2-hmc{aspect-ratio:1;border-radius:4px;background:var(--s3);transition:background .6s ease,transform .1s;cursor:default;position:relative}'+
   '.av2-hmc:hover{transform:scale(1.12);z-index:2}'+
   '.av2-hmlbl{display:grid;grid-template-columns:repeat(9,1fr);gap:3px;margin-top:3px}'+
   '.av2-hmlbl span{font-size:7.5px;text-align:center;color:var(--t3)}'+
   /* ── daypart rings ── */
   '.av2-dpg{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:8px}'+
   '.av2-dpi{display:flex;flex-direction:column;align-items:center;gap:4px}'+
   '.av2-dpr{transform:rotate(-90deg);overflow:visible}'+
   '.av2-dpv{font-size:13px;font-weight:900;margin-top:2px}'+
   '.av2-dpl{font-size:11px;font-weight:700;color:var(--t2)}'+
   '.av2-dps{font-size:10px;color:var(--t3)}'+
   /* ── menu ranks ── */
   '.av2-mr{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd)}'+
   '.av2-mr:last-child{border:none}'+
   '.av2-mrk{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0}'+
   '.av2-mn{flex:1;font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
   '.av2-mc{font-size:11px;font-weight:900;flex-shrink:0}'+
   '.av2-mbg{height:4px;background:var(--s3);border-radius:2px;overflow:hidden;margin-top:5px}'+
   '.av2-mfg{height:100%;border-radius:2px;width:0;transition:width 1.2s cubic-bezier(.34,1.56,.64,1)}'+
   /* ── skeleton ── */
   '.av2-skel{background:linear-gradient(90deg,var(--s2) 25%,var(--s3) 50%,var(--s2) 75%);background-size:200% 100%;animation:av2-shim 1.3s ease-in-out infinite;border-radius:8px}';
  document.head.appendChild(st);
 }

 /* skeleton KPI placeholder */
 var skelKpi='';
 for(var i=0;i<4;i++){
  skelKpi+='<div class="av2-kc" style="animation-delay:'+(i*.08)+'s">'+
   '<div class="av2-skel" style="height:10px;width:60%;margin-bottom:14px"></div>'+
   '<div class="av2-skel" style="height:22px;width:80%;margin-bottom:8px"></div>'+
   '<div class="av2-skel" style="height:10px;width:50%"></div>'+
  '</div>';
 }

 wrap.innerHTML=
  /* ── live bar ── */
  '<div class="av2-live">'+
  '<span class="av2-dot"></span>'+
  '<span style="color:var(--t2);font-size:12px;font-weight:700">실시간</span>'+
  '<strong id="av2-live-amt" style="color:#22c55e;font-size:14px;font-weight:900;font-variant-numeric:tabular-nums">₩-</strong>'+
  '<span style="color:var(--t3);font-size:12px">·</span>'+
  '<span id="av2-live-cnt" style="color:var(--t2);font-size:12px">- 건</span>'+
  '<span style="flex:1"></span>'+
  '<span style="font-size:10px;color:var(--t3)">오늘 POS 매출</span>'+
  '</div>'+
  /* ── header ── */
  '<div class="av2-hd">'+
  '<div><div class="page-title">매출 분석</div><div class="page-sub">실시간 경영 인사이트</div></div>'+
  '<div class="av2-tabs" id="ana-tabs">'+
  '<button class="ana-tab2 on" data-t="today" onclick="_dineAnaTab2(this)">오늘</button>'+
  '<button class="ana-tab2" data-t="week" onclick="_dineAnaTab2(this)">이번주</button>'+
  '<button class="ana-tab2" data-t="month" onclick="_dineAnaTab2(this)">이번달</button>'+
  '</div></div>'+
  /* ── KPI 4 cards ── */
  '<div class="av2-kg" id="ana-kpi">'+skelKpi+'</div>'+
  /* ── trend chart ── */
  '<div class="av2-trend">'+
  '<div class="av2-trnd-hd">'+
  '<div><div class="av2-tt">일별 매출 추이</div><div class="av2-ts" id="ana-trend-sub">불러오는 중...</div></div>'+
  '<div id="av2-trend-peak" style="font-size:11px;color:var(--t3)"></div>'+
  '</div>'+
  '<div class="av2-cw"><canvas id="ch-trend" aria-label="일별 매출 추이"></canvas></div>'+
  '</div>'+
  /* ── heatmap + daypart ── */
  '<div class="av2-r2">'+
  '<div class="av2-cc">'+
  '<div class="av2-chd"><div class="av2-tt">시간대 히트맵</div><div class="av2-ts" id="ana-peak-txt">피크타임 분석</div></div>'+
  '<div id="av2-heatmap"></div>'+
  '<div class="av2-hmlbl" id="av2-hmlbl"></div>'+
  '</div>'+
  '<div class="av2-cc">'+
  '<div class="av2-chd"><div class="av2-tt">영업 타임별</div><div class="av2-ts">시간대 매출 비중</div></div>'+
  '<div class="av2-dpg" id="av2-daypart"></div>'+
  '</div>'+
  '</div>'+
  /* ── menu + payment + labor ── */
  '<div class="av2-r3">'+
  '<div class="av2-cc"><div class="av2-tt" style="margin-bottom:12px">인기 메뉴 TOP 5</div><div id="av2-menu"></div></div>'+
  '<div class="av2-cc">'+
  '<div class="av2-tt" style="margin-bottom:6px">결제수단</div>'+
  '<div class="av2-ts" id="ana-pay-sub" style="margin-bottom:10px">비중 분석</div>'+
  '<div style="position:relative;height:140px"><canvas id="ch-pay" aria-label="결제수단"></canvas></div>'+
  '<div id="av2-pay-leg" style="margin-top:10px;display:flex;flex-direction:column;gap:5px"></div>'+
  '</div>'+
  '<div class="av2-cc"><div class="av2-tt" style="margin-bottom:6px">인건비 분석</div><div id="av2-labor"></div></div>'+
  '</div>';

 el.appendChild(wrap);
 _dineAnaFilter2('today');
 /* wire live bar to realtime watcher */
 _av2SyncLive();
}

function _av2SyncLive(){
 // _dineWatchFiloSales(dine.js)가 av2-live-amt·av2-live-cnt를 이미 업데이트함
 // 중복 리스너 생성 방지 — no-op
}

function _dineAnaTab2(btn){
 document.querySelectorAll('.ana-tab2').forEach(function(b){b.classList.remove('on');});
 btn.classList.add('on');
 _dineAnaFilter2(btn.dataset.t);
}

function _dineAnaFilter2(type){
 var now=new Date(),to=now.toISOString().slice(0,10),from;
 if(type==='today')from=to;
 else if(type==='week'){var d=new Date(now);d.setDate(d.getDate()-6);from=d.toISOString().slice(0,10);}
 else from=to.slice(0,7)+'-01';
 _dineLoadAnalytics(_CU.dealerId,from,to);
}

function _dineLoadAnalytics(did,from,to){
 var ym=from.slice(0,7);
 var d1=new Date(from),d2=new Date(to);
 var diffDays=Math.round((d2-d1)/86400000)+1;
 var prevTo=new Date(d1);prevTo.setDate(prevTo.getDate()-1);
 var prevFrom=new Date(prevTo);prevFrom.setDate(prevFrom.getDate()-diffDays+1);
 var from2=prevFrom.toISOString().slice(0,10);
 var to2=prevTo.toISOString().slice(0,10);

 Promise.all([
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from2).where('date','<=',to2).get(),
  _db.collection('members').where('dealerId','==',did).get(),
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get()
 ]).then(function(results){
  var snap=results[0],prevSnap=results[1],memSnap=results[2],attSnap=results[3];
  var total=0,cnt=0,hours={},menus={},methods={},daily={};
  var pmKr={'cash':'현금','Cash':'현금','card':'카드','Card':'카드','kakao':'카카오페이','naver':'네이버페이','toss':'토스페이'};
  snap.forEach(function(doc){
   var d=doc.data();if(d.status==='cancelled')return;
   var amt=d.total||0;total+=amt;cnt++;
   var dt=new Date(d.createdAt||d.date+'T12:00:00');
   var h=dt.getHours();hours[h]=(hours[h]||0)+amt;
   var pm=pmKr[d.payMethod||'']||d.payMethod||'기타';
   methods[pm]=(methods[pm]||0)+amt;
   var ds=d.date||dt.toISOString().slice(0,10);daily[ds]=(daily[ds]||0)+amt;
   (d.items||[]).forEach(function(it){menus[it.name]=(menus[it.name]||0)+(it.qty||1);});
  });
  var prevTotal=0,prevCnt=0;
  prevSnap.forEach(function(doc){var d=doc.data();if(d.status!=='cancelled'){prevTotal+=d.total||0;prevCnt++;}});

  var avg=cnt?Math.round(total/cnt):0;
  var days2=Math.max(1,Object.keys(daily).length||diffDays);
  var dayAvg=Math.round(total/days2);
  var hPeak=Object.entries(hours).sort(function(a,b){return b[1]-a[1];})[0];
  var hMax=Math.max.apply(null,Object.values(hours).concat([1]));

  /* 인건비 */
  var attMap={};
  attSnap.forEach(function(doc){var d=doc.data();if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[]};if(d.type==='in')attMap[d.memberId].ins.push(d);else attMap[d.memberId].outs.push(d);});
  var totalLabor=0;
  memSnap.forEach(function(doc){var r=_calcPayFull(doc.data(),attMap[doc.id]||{ins:[],outs:[]},memSnap.size,ym);totalLabor+=r.grossSalary;});
  var laborRate=total>0?Math.round(totalLabor/total*100):0;

  /* 증감 */
  function delta(cur,prev){if(!prev)return null;var v=Math.round((cur-prev)/prev*100);return {v:v,up:v>=0};}
  var dTotal=delta(total,prevTotal);var dCnt=delta(cnt,prevCnt);

  /* ── 카운터 애니메이션 ── */
  function countUp(id,target,fmt){
   var el=document.getElementById(id);if(!el)return;
   var st=null;
   (function tick(ts){
    if(!st)st=ts;
    var p=Math.min((ts-st)/1000,1);
    var e=1-Math.pow(1-p,4);
    el.textContent=fmt(Math.round(e*target));
    if(p<1)requestAnimationFrame(tick);
   })(0);
  }

  /* ── KPI 카드 ── */
  var kpis=[
   {lbl:'총 매출',id:'kv0',val:total,fmt:function(v){return '₩'+v.toLocaleString();},sub:cnt+'건 주문',color:'#38bdf8',d:dTotal,
    svg:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'},
   {lbl:'일평균 매출',id:'kv1',val:dayAvg,fmt:function(v){return '₩'+v.toLocaleString();},sub:days2+'일 기준',color:'#22c55e',d:null,
    svg:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'},
   {lbl:'피크타임',id:'kv2',val:hPeak?parseInt(hPeak[0]):null,fmt:function(v){return v+'시대';},sub:hPeak?'₩'+Math.round(hPeak[1]).toLocaleString():'데이터없음',color:'#f59e0b',d:null,
    svg:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'},
   {lbl:'객단가',id:'kv3',val:avg,fmt:function(v){return '₩'+v.toLocaleString();},sub:'주문당 평균',color:'#a78bfa',d:dCnt,
    svg:'<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>'},
  ];

  var kpiEl=document.getElementById('ana-kpi');
  if(kpiEl){
   kpiEl.innerHTML=kpis.map(function(k,i){
    var dc='';
    if(k.d){var bg=k.d.up?'rgba(34,197,94,.15)':'rgba(239,68,68,.15)';var fc=k.d.up?'#22c55e':'#ef4444';dc='<span class="kdelta" style="background:'+bg+';color:'+fc+'">'+(k.d.up?'▲':'▼')+Math.abs(k.d.v)+'%</span>';}
    return '<div class="av2-kc" style="animation-delay:'+(i*.08)+'s">'+
     '<div class="glw" style="background:'+k.color+'"></div>'+
     '<div class="kico" style="color:'+k.color+'"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><'+k.svg+'></svg></div>'+
     '<div class="klbl">'+k.lbl+'</div>'+
     '<div class="knum" id="'+k.id+'" style="color:'+k.color+'">-</div>'+
     '<div class="ksub">'+k.sub+'</div>'+
     dc+
    '</div>';
   }).join('');
   setTimeout(function(){
    kpis.forEach(function(k){
     if(k.val===null)return;
     countUp(k.id,k.val,k.fmt);
    });
   },80);
  }

  /* ── 추이 차트 ── */
  _dineEnsureChart(function(){
   var CS=['#C8A356','#38bdf8','#22c55e','#a78bfa','#f97316'];
   var tc=document.getElementById('ch-trend');
   if(tc&&window.Chart){
    if(tc._ch)tc._ch.destroy();
    var allDates=[];var d=new Date(from);
    while(d<=new Date(to)){allDates.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}
    var tData=allDates.map(function(dt){return daily[dt]||0;});
    var tLabels=allDates.map(function(dt){return dt.slice(5);});
    var tMax=Math.max.apply(null,tData)||1;
    var ctx=tc.getContext('2d');
    var grad=ctx.createLinearGradient(0,0,0,165);
    grad.addColorStop(0,'rgba(200,163,86,.35)');grad.addColorStop(.6,'rgba(200,163,86,.06)');grad.addColorStop(1,'rgba(200,163,86,0)');
    tc._ch=new Chart(tc,{type:'line',data:{labels:tLabels,datasets:[{
     data:tData,borderColor:'#C8A356',borderWidth:2.5,backgroundColor:grad,fill:true,
     tension:.42,pointRadius:tData.length<=7?5:2,
     pointBackgroundColor:'#C8A356',pointBorderColor:'#0C0E18',pointBorderWidth:2,
     hoverPointRadius:7,hoverPointBorderWidth:3
    }]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:1100,easing:'easeOutQuart'},
     plugins:{legend:{display:false},tooltip:{
      backgroundColor:'rgba(12,14,24,.92)',titleColor:'#C8A356',bodyColor:'#EDE6D6',
      borderColor:'rgba(200,163,86,.3)',borderWidth:1,padding:10,cornerRadius:10,
      callbacks:{label:function(c){return '₩'+c.raw.toLocaleString();}}}},
     scales:{
      x:{grid:{display:false},border:{display:false},ticks:{color:'#3A4156',font:{size:9},maxTicksLimit:10}},
      y:{grid:{color:'rgba(255,255,255,.035)',lineWidth:.5},border:{display:false},ticks:{color:'#3A4156',font:{size:9},callback:function(v){return v>=10000?(v/10000).toFixed(0)+'만':v>=1000?(v/1000).toFixed(0)+'천':v;}}}
     }}});
    var ts=document.getElementById('ana-trend-sub');if(ts)ts.textContent=allDates.length+'일 · 최고 ₩'+tMax.toLocaleString();
    var tp=document.getElementById('av2-trend-peak');if(tp&&hPeak)tp.textContent='피크 '+hPeak[0]+'시';
   }

   /* ── 결제수단 도넛 ── */
   var pc=document.getElementById('ch-pay');
   var meth=Object.entries(methods).sort(function(a,b){return b[1]-a[1];});
   if(pc&&window.Chart&&meth.length){
    if(pc._ch)pc._ch.destroy();
    var pC=['#C8A356','#38bdf8','#22c55e','#a78bfa','#f97316'];
    var pColors=meth.map(function(_,i){return pC[i%pC.length];});
    pc._ch=new Chart(pc,{type:'doughnut',data:{
     labels:meth.map(function(e){return e[0];}),
     datasets:[{data:meth.map(function(e){return e[1];}),backgroundColor:pColors,
     borderWidth:3,borderColor:'#0C0E18',hoverOffset:8}]
    },options:{responsive:true,maintainAspectRatio:false,
     animation:{animateRotate:true,animateScale:true,duration:1200},cutout:'70%',
     plugins:{legend:{display:false},tooltip:{
      backgroundColor:'rgba(12,14,24,.92)',titleColor:'#C8A356',bodyColor:'#EDE6D6',
      borderColor:'rgba(200,163,86,.3)',borderWidth:1,cornerRadius:10,
      callbacks:{label:function(c){return c.label+' '+Math.round(c.raw/(total||1)*100)+'%';}}}}}});
    var pleg=document.getElementById('av2-pay-leg');
    if(pleg)pleg.innerHTML=meth.map(function(e,i){
     var pct=total?Math.round(e[1]/total*100):0;
     return '<div style="display:flex;align-items:center;gap:7px;font-size:11px">'+
      '<div style="width:9px;height:9px;border-radius:3px;background:'+pColors[i]+';flex-shrink:0"></div>'+
      '<span style="flex:1;color:var(--t2)">'+e[0]+'</span>'+
      '<span style="font-weight:900;color:'+pColors[i]+'">'+pct+'%</span>'+
     '</div>';
    }).join('');
    var ps=document.getElementById('ana-pay-sub');if(ps&&meth[0])ps.textContent='최다: '+meth[0][0];
   } else if(pc&&window.Chart){
    var pleg2=document.getElementById('av2-pay-leg');
    if(pleg2)pleg2.innerHTML='<div style="text-align:center;padding:16px;color:var(--t3);font-size:12px">결제 데이터 없음</div>';
   }
  });

  /* ── 시간대 히트맵 ── */
  var hmEl=document.getElementById('av2-heatmap');
  var hmLbl=document.getElementById('av2-hmlbl');
  if(hmEl){
   var hmHours=Array.from({length:18},function(_,i){return 6+i;});
   hmEl.innerHTML=hmHours.map(function(h){
    var v=hours[h]||0;
    var intensity=hMax>0?v/hMax:0;
    var alpha=Math.round(intensity*100);
    var isPeak=hPeak&&parseInt(hPeak[0])===h;
    var border=isPeak?'box-shadow:0 0 0 2px #C8A356;':'';
    return '<div class="av2-hmc" title="'+h+'시 ₩'+(hours[h]||0).toLocaleString()+'" '+
     'style="background:rgba(200,163,86,'+intensity.toFixed(2)+');'+border+'"></div>';
   }).join('');
   if(hmLbl)hmLbl.innerHTML=hmHours.map(function(h){return '<span>'+(h<10?'0':'')+h+'</span>';}).join('');
   var pt2=document.getElementById('ana-peak-txt');
   if(pt2&&hPeak)pt2.textContent=hPeak[0]+'시 피크 · ₩'+Math.round(hPeak[1]).toLocaleString();
  }

  /* ── 영업 타임별 SVG 링 ── */
  var dpEl=document.getElementById('av2-daypart');
  if(dpEl){
   var dayparts=[
    {lbl:'브런치',range:[6,11],color:'#f59e0b'},
    {lbl:'점심',range:[11,15],color:'#22c55e'},
    {lbl:'저녁',range:[17,21],color:'#38bdf8'},
    {lbl:'야간',range:[21,24],color:'#a78bfa'},
   ];
   var dpMax=1;
   var dpAmts=dayparts.map(function(dp){
    var s=0;for(var h=dp.range[0];h<dp.range[1];h++)s+=(hours[h]||0);
    if(s>dpMax)dpMax=s;return s;
   });
   var circ=2*Math.PI*28;
   dpEl.innerHTML=dayparts.map(function(dp,i){
    var share=total>0?Math.round(dpAmts[i]/total*100):0;
    var pct=dpAmts[i]/dpMax;
    var offset=circ*(1-pct);
    return '<div class="av2-dpi">'+
     '<svg class="av2-dpr" width="70" height="70" viewBox="0 0 70 70">'+
     '<circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="9"/>'+
     '<circle cx="35" cy="35" r="28" fill="none" stroke="'+dp.color+'" stroke-width="9" stroke-linecap="round"'+
     ' stroke-dasharray="'+circ.toFixed(1)+'"'+
     ' stroke-dashoffset="'+circ.toFixed(1)+'"'+
     ' id="dpr'+i+'"'+
     ' style="filter:drop-shadow(0 0 4px '+dp.color+');transition:stroke-dashoffset 1.3s cubic-bezier(.34,1.4,.64,1) '+(i*.15+.3)+'s"/>'+
     '</svg>'+
     '<div class="av2-dpv" style="color:'+dp.color+'">'+share+'%</div>'+
     '<div class="av2-dpl">'+dp.lbl+'</div>'+
     '<div class="av2-dps">₩'+(dpAmts[i]>=10000?Math.round(dpAmts[i]/10000)+'만':dpAmts[i].toLocaleString())+'</div>'+
    '</div>';
   }).join('');
   setTimeout(function(){
    dayparts.forEach(function(dp,i){
     var arc=document.getElementById('dpr'+i);
     if(arc)arc.style.strokeDashoffset=(circ*(1-dpAmts[i]/dpMax)).toFixed(1);
    });
   },200);
  }

  /* ── 인기 메뉴 TOP 5 ── */
  var mEl=document.getElementById('av2-menu');
  if(mEl){
   var top5=Object.entries(menus).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
   var mmax2=top5[0]?top5[0][1]:1;
   var rankColors=['#C8A356','#94a3b8','#b87333','#38bdf8','#a78bfa'];
   var rankBg=['rgba(200,163,86,.15)','rgba(148,163,184,.1)','rgba(184,115,51,.1)','rgba(56,189,248,.1)','rgba(167,139,250,.1)'];
   if(!top5.length){mEl.innerHTML='<div style="text-align:center;padding:24px;color:var(--t3);font-size:12px">주문 데이터가 없습니다</div>';return;}
   mEl.innerHTML=top5.map(function(m,i){
    return '<div class="av2-mr">'+
     '<div class="av2-mrk" style="background:'+rankBg[i]+';color:'+rankColors[i]+'">'+( i+1)+'</div>'+
     '<div style="flex:1;min-width:0">'+
     '<div style="display:flex;align-items:center;gap:6px">'+
     '<span class="av2-mn">'+m[0]+'</span>'+
     '<span class="av2-mc" id="mm'+i+'" style="color:'+rankColors[i]+'">0개</span>'+
     '</div>'+
     '<div class="av2-mbg"><div class="av2-mfg" id="mbar'+i+'" style="background:'+rankColors[i]+';transition-delay:'+(i*.12)+'s"></div></div>'+
     '</div>'+
    '</div>';
   }).join('');
   setTimeout(function(){
    top5.forEach(function(m,i){
     var bar=document.getElementById('mbar'+i);if(bar)bar.style.width=Math.round(m[1]/mmax2*100)+'%';
     var cntEl=document.getElementById('mm'+i);if(!cntEl)return;
     var target=m[1],st2=null;
     (function tick(ts){if(!st2)st2=ts;var p=Math.min((ts-st2)/800,1);cntEl.textContent=Math.round(p*target)+'개';if(p<1)requestAnimationFrame(tick);})(0);
    });
   },200);
  }

  /* ── 인건비 게이지 ── */
  var lEl=document.getElementById('av2-labor');
  if(lEl){
   var lColor=laborRate<25?'#22c55e':laborRate<35?'#f59e0b':'#ef4444';
   var lMsg=laborRate<25?'양호':'과다';
   var lDesc=laborRate<25?'인건비 비율 적정':'인건비 비율 주의';
   var semiCirc=Math.PI*50;
   var semiOffset=semiCirc*(1-Math.min(laborRate,100)/100);
   lEl.innerHTML=
    '<div class="av2-gauge" style="padding-top:8px">'+
    '<svg width="130" height="75" viewBox="0 0 130 75" overflow="visible">'+
    '<path d="M10 70 A55 55 0 0 1 120 70" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="14" stroke-linecap="round"/>'+
    '<path id="labor-arc" d="M10 70 A55 55 0 0 1 120 70" fill="none" stroke="'+lColor+'" stroke-width="14" stroke-linecap="round"'+
    ' stroke-dasharray="'+semiCirc.toFixed(1)+'" stroke-dashoffset="'+semiCirc.toFixed(1)+'"'+
    ' style="filter:drop-shadow(0 0 6px '+lColor+');transition:stroke-dashoffset 1.4s cubic-bezier(.34,1.2,.64,1) .3s"/>'+
    '</svg>'+
    '<div class="av2-gauge-num" style="color:'+lColor+'">'+laborRate+'%</div>'+
    '</div>'+
    '<div style="text-align:center;margin-top:6px">'+
    '<div style="font-size:13px;font-weight:900;color:'+lColor+'">'+lMsg+'</div>'+
    '<div style="font-size:10px;color:var(--t3);margin-top:2px">'+lDesc+'</div>'+
    '<div style="font-size:10px;color:var(--t3);margin-top:4px">적정 25~30% · 현재 '+laborRate+'%</div>'+
    '</div>'+
    '<div style="border-top:1px solid var(--bd);margin-top:12px;padding-top:10px;display:flex;justify-content:space-between;font-size:10px;color:var(--t3)">'+
    '<span>인건비 ₩'+totalLabor.toLocaleString()+'</span>'+
    '<span>매출 ₩'+total.toLocaleString()+'</span>'+
    '</div>';
   setTimeout(function(){var arc=document.getElementById('labor-arc');if(arc)arc.style.strokeDashoffset=semiOffset.toFixed(1);},250);
  }
 });
}

function _dineAfterLogin(){
 document.getElementById('login-wrap').style.display='none';
 var aw=document.getElementById('app-wrap');aw.style.display='flex';
 document.getElementById('tb-user-name').textContent=_CU.name;
 // 직원이면 사이드바 제한
 if(_CU.role==='staff'){
  _dineUpdateSidebarStaff();
  _dinePage('schedule',document.querySelector('.nav-item'));
 } else {
  _dinePage('dashboard',document.querySelector('.nav-item'));
  _dineUpdateSidebar();
 }
 _dineRequestNotifPermission(_CU.dealerId);
 _dineWatchAttend();
 _dineWatchFiloSales();  // FILO POS 실시간 연동
 _dineWatchReservations(); // 예약 실시간 연동
 _dineWatchStock(); // FILO 재고 부족 실시간
}

// FILO 재고 부족 → DINE 알림
function _dineWatchStock(){
 if(window._dineStockUnsub)window._dineStockUnsub();
 var did=_CU&&_CU.dealerId;
 if(!did||!_db)return;
 window._dineStockUnsub=_db.collection('filo_menus')
  .where('dealerId','==',did)
  .onSnapshot(function(snap){
   var low=[];
   snap.forEach(function(doc){
    var d=doc.data();
    if(d.stock!=null&&d.minStock!=null&&d.stock<=d.minStock)
     low.push(d.name+'('+d.stock+'개)');
   });
   var el=document.getElementById('dine-stock-badge');
   if(el){el.textContent=low.length>0?'경고:  재고부족 '+low.length+'개':'';el.style.display=low.length>0?'block':'none';}
   if(low.length>0&&window._dineStockPrev!==low.join()){
    window._dineStockPrev=low.join();
    _dineToast('경고:  재고 부족: '+low.slice(0,3).join(', '));
    if('Notification' in window&&Notification.permission==='granted'){
     new Notification('재고 부족',{body:low.join(', '),icon:'/dine-icon-192.png'});
    }
   }
  },function(){});
}

// FILO POS 매출 실시간 감시 (FILO→DINE 연동)
function _dineWatchFiloSales(){
 if(window._dineFiloSalesUnsub)window._dineFiloSalesUnsub();
 var did=_CU&&_CU.dealerId;
 if(!did||!_db)return;
 var today=_today();
 window._dineFiloSalesUnsub=_db.collection('filo_sales')
  .where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(snap){
   var total=0,cnt=0;
   snap.forEach(function(doc){var d=doc.data();if(d.status!=='cancelled'){total+=d.total||0;cnt++;}});
   var liveEl=document.getElementById('dine-live-sales');
   if(liveEl){liveEl.textContent='POS ₩'+total.toLocaleString();liveEl.style.color='#22c55e';liveEl.style.display='inline-block';}
   var kSales=document.getElementById('kpi-sales');
   if(kSales){kSales.textContent='₩'+total.toLocaleString();kSales.classList.remove('skeleton-val');}
   var la=document.getElementById('av2-live-amt');var lc=document.getElementById('av2-live-cnt');
   if(la)la.textContent='₩'+total.toLocaleString();if(lc)lc.textContent=cnt+'건';
  },function(e){console.warn('filo-sales:',e);});
}

// 예약 실시간 감시
function _dineWatchReservations(){
 if(window._dineResUnsub)window._dineResUnsub();
 var did=_CU&&_CU.dealerId;
 if(!did||!_db)return;
 var today=_today();
 window._dineResUnsub=_db.collection('filo_bookings')
  .where('dealerId','==',did).where('date','==',today).where('status','==','pending')
  .onSnapshot(function(snap){
   var badge=document.getElementById('dine-res-badge');
   if(badge){
    badge.textContent=snap.size>0?snap.size:'';
    badge.style.display=snap.size>0?'flex':'none';
   }
   // 새 예약 푸시 알림
   if(snap.docChanges){
    snap.docChanges().forEach(function(change){
     if(change.type==='added'){
      var d=change.doc.data();
      _dineToast('새 예약: '+d.customerName+'님 '+d.seats+'인 ('+d.time+')');
      if('Notification' in window&&Notification.permission==='granted'){
       new Notification('새 예약 알림',{body:d.customerName+'님 '+d.seats+'인 '+d.time,icon:'/dine-icon-192.png'});
      }
     }
    });
   }
  },function(e){console.warn('reservations:',e);});
}

function _dineUpdateSidebarStaff(){
 // 사장 전용 그룹·항목 숨기기
 document.querySelectorAll('[data-role="owner"]').forEach(function(el){ el.style.display='none'; });
 // 직원 전용 그룹·항목 표시
 document.querySelectorAll('[data-role="staff"]').forEach(function(el){ el.style.display=''; });
 // 모바일 탭바: 사장 탭 숨기고 직원 탭 표시
 var ownerBar = document.getElementById('mt-bar-owner');
 var staffBar = document.getElementById('mt-bar-staff');
 if(ownerBar) ownerBar.style.display='none';
 if(staffBar) staffBar.style.display='flex';
 // FILO 바로가기 버튼 숨기기 (직원은 불필요)
 var filoBtn = document.querySelector('#sidebar button[onclick="_dineGoFilo()"]');
 if(filoBtn && filoBtn.parentElement) filoBtn.parentElement.style.display='none';
}
function _dineMyPayroll(el){
 if(!_CU.staffId){el.innerHTML='<div class="empty">직원 정보 없음</div>';return;}
 el.innerHTML='<div class="slide-up">';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="margin-bottom:16px"><div class="page-title"> 내 급여</div><div class="page-sub">'+_CU.name+'님의 급여 현황</div></div>'+
  '<div style="display:flex;gap:8px;margin-bottom:14px">'+
  '<input type="month" id="my-pay-ym" class="inp" style="width:auto" value="'+_monthStr()+'">'+
  '<button class="btn btn-primary btn-sm" onclick="_dineLoadMyPayroll()">조회</button>'+
  '</div>'+
  '<div id="my-payroll-result"><div style="text-align:center;padding:30px;color:var(--t3)">월을 선택 후 조회하세요</div></div>';
 el.innerHTML='';el.appendChild(wrap);
}

function _dineLoadMyPayroll(){
 var ym=document.getElementById('my-pay-ym')?.value;
 if(!ym) return;
 var did=_CU.dealerId;var sid=_CU.staffId||_CU.uid;
 // 직원 정보 + 출퇴근 기록 조회
 _db.collection('staff').doc(sid).get().then(function(snap){
  var st=snap.data()||{name:_CU.name,hourlyWage:10320,payType:'hourly'};
  _db.collection('attendance').where('dealerId','==',did)
   .where('staffId','==',sid)
   .where('date','>=',ym+'-01').where('date','<=',ym+'-31').get()
  .then(function(attSnap){
   var dateIns={};var dateOuts={};
   attSnap.forEach(function(doc){
    var d=doc.data();
    if(d.type==='in') dateIns[d.date]=d;
    else if(d.type==='out') dateOuts[d.date]=d;
   });
   var totalMin=0;var nightMin=0;var workDays=0;
   Object.keys(dateIns).forEach(function(date){
    workDays++;
    var inT=new Date(dateIns[date].time);
    var outT=dateOuts[date]?new Date(dateOuts[date].time):new Date();
    var diffMin=(outT-inT)/60000;
    var brMin=diffMin>=480?60:diffMin>=240?30:0;
    totalMin+=Math.max(0,diffMin-brMin);
    var ns=new Date(inT);ns.setHours(22,0,0,0);
    if(outT>ns) nightMin+=(outT-Math.max(inT,ns))/60000;
   });
   var workH=totalMin/60;var nightH=nightMin/60;
   var hourlyWage=st.hourlyWage||10320;
   var basePay=st.payType==='monthly'?st.monthlySalary||2500000:Math.round(workH*hourlyWage);
   var nightPay=Math.round(nightH*hourlyWage*0.5);
   var weeklyH=st.weeklyHours||0;
   var weeklyPay=(weeklyH>=15&&workH/4.3>=weeklyH*0.9)?(hourlyWage*weeklyH/5):0;
   var totalPay=basePay+nightPay+Math.round(weeklyPay);
   var ins4=Math.round(totalPay*(0.0475+0.03595+0.009));
   var netPay=totalPay-ins4;
   var res=document.getElementById('my-payroll-result');if(!res)return;
   res.innerHTML='<div class="card" style="padding:18px">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:14px">'+ym+' 급여 내역</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'+
    '<div class="kpi-card"><div class="kpi-label">근무일수</div><div class="kpi-val">'+workDays+'일</div></div>'+
    '<div class="kpi-card"><div class="kpi-label">총 근무시간</div><div class="kpi-val">'+Math.floor(workH)+'h '+Math.round((workH%1)*60)+'m</div></div>'+
    '<div class="kpi-card"><div class="kpi-label">야간수당</div><div class="kpi-val" style="color:#f59e0b">₩'+nightPay.toLocaleString()+'</div></div>'+
    '<div class="kpi-card"><div class="kpi-label">주휴수당</div><div class="kpi-val" style="color:#a78bfa">₩'+Math.round(weeklyPay).toLocaleString()+'</div></div>'+
    '</div>'+
    '<div style="border-top:1px solid var(--bd);padding-top:12px">'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px">'+
    '<span style="color:var(--t3)">세전 합계</span><span>₩'+totalPay.toLocaleString()+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:12px">'+
    '<span style="color:var(--t3)">4대보험 공제</span><span style="color:#ef4444">-₩'+ins4.toLocaleString()+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;font-size:20px;font-weight:900">'+
    '<span>실수령액</span><span style="color:#22c55e">₩'+netPay.toLocaleString()+'</span></div>'+
    '</div></div>';
  });
 });
}

// 직원 본인 명세서 조회
function _dineMyPayslip(el){
 var did=_CU.dealerId;var sid=_CU.staffId||_CU.uid;
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="margin-bottom:16px"><div class="page-title">내 명세서</div><div class="page-sub">'+_CU.name+'님의 급여명세서</div></div>'+
  '<div id="my-payslip-list"><div style="text-align:center;padding:30px;color:var(--t3)"> 로딩중</div></div>';
 el.innerHTML='';el.appendChild(wrap);
 _db.collection('payslips').where('dealerId','==',did).where('staffId','==',sid)
  .orderBy('ym','desc').limit(12).get()
  .then(function(snap){
   var list=document.getElementById('my-payslip-list');if(!list)return;
   if(snap.empty){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)">발송된 명세서가 없습니다</div>';return;}
   list.innerHTML=snap.docs.map(function(doc){
    var d=doc.data();
    return '<div class="card" style="padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">'+
     '<div><div style="font-weight:800">'+d.ym+' 급여명세서</div>'+
     '<div style="font-size:11px;color:var(--t3)">'+new Date(d.createdAt).toLocaleDateString('ko')+'</div></div>'+
     '<div style="font-size:18px;font-weight:900;color:#22c55e">₩'+(d.netPay||0).toLocaleString()+'</div></div>';
   }).join('');
  });
}

function _dineUpdateSidebar(){
 var n=document.getElementById('sb-store-name');
 var s=document.getElementById('sb-store-sub');
 if(n)n.textContent=_CU.company?.storeName||_CU.company?.name||_CU.name||'내 매장';
 if(s)s.textContent=(_CU.company?.address||'외식업 관리 플랫폼');
 // 직원 전용 그룹 숨기기 (사장은 직원 전용 메뉴 불필요)
 document.querySelectorAll('[data-role="staff"]').forEach(function(el){ el.style.display='none'; });
 // 사장 전용 그룹 표시
 document.querySelectorAll('[data-role="owner"]').forEach(function(el){ el.style.display=''; });
 // 모바일 탭바: 사장 탭 표시, 직원 탭 숨기기
 var ownerBar = document.getElementById('mt-bar-owner');
 var staffBar = document.getElementById('mt-bar-staff');
 if(ownerBar) ownerBar.style.display='flex';
 if(staffBar) staffBar.style.display='none';
}

function _dineSchedule(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 var now=new Date();
 var days=['일','월','화','수','목','금','토'];
 /* 이번주 월~일 */
 var weekStart=new Date(now);
 weekStart.setDate(now.getDate()-now.getDay()+1);

 wrap.innerHTML='<div style="margin-bottom:16px"><div class="page-title">근무 스케줄</div><div class="page-sub">주간 근무 현황</div></div>'+
  '<div class="card"><div style="display:grid;grid-template-columns:80px repeat(7,1fr);gap:4px;font-size:11px" id="schedule-grid">'+
  '<div style="padding:6px;color:var(--t3);font-weight:700">직원</div>'+
  Array.from({length:7},function(_,i){
   var d=new Date(weekStart);d.setDate(weekStart.getDate()+i);
   var isToday=d.toISOString().slice(0,10)===now.toISOString().slice(0,10);
   return '<div style="padding:6px;text-align:center;font-weight:700;'+(isToday?'color:var(--br)':'color:var(--t3)')+'">'+
    days[d.getDay()]+'<br><span style="font-size:9px">'+(d.getMonth()+1)+'/'+d.getDate()+'</span></div>';
  }).join('')+
  '</div></div>';
 el.appendChild(wrap);

 Promise.all([
  _db.collection('members').where('dealerId','==',did).get(),
  _db.collection('attendance').where('dealerId','==',did)
   .where('date','>=',weekStart.toISOString().slice(0,10)).get()
 ]).then(function(results){
  var memSnap=results[0],attSnap=results[1];
  var attMap={};
  attSnap.forEach(function(doc){
   var d=doc.data();
   var key=d.memberId+'_'+d.date;
   if(!attMap[key])attMap[key]={in:null,out:null};
   if(d.type==='in')attMap[key].in=d.time;
   else attMap[key].out=d.time;
  });
  var grid=document.getElementById('schedule-grid');if(!grid)return;
  memSnap.forEach(function(doc){
   var m=doc.data();
   var partColor={'kitchen':'#ef4444','hall':'#38bdf8'}[m.part]||'#a78bfa';
   var row='<div style="padding:6px;font-weight:700;font-size:11px;color:'+partColor+'">'+m.name+'</div>';
   for(var i=0;i<7;i++){
    var d=new Date(weekStart);d.setDate(weekStart.getDate()+i);
    var dateStr=d.toISOString().slice(0,10);
    var key=doc.id+'_'+dateStr;
    var att=attMap[key];
    if(att&&att.in){
     var inT=new Date(att.in).toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'});
     var outT=att.out?new Date(att.out).toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):'근무중';
     row+='<div style="padding:4px;background:rgba(34,197,94,.1);border-radius:6px;text-align:center;font-size:9px;color:#22c55e">'+inT+'<br>'+outT+'</div>';
    } else {
     row+='<div style="padding:4px;text-align:center;font-size:9px;color:var(--t3)">-</div>';
    }
   }
   grid.insertAdjacentHTML('beforeend',row);
  });
 });
}

function _dineCost(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
  '<div><div class="page-title">원가 관리</div><div class="page-sub">메뉴별 원가율 · 마진 분석</div></div>'+
  '<button class="btn btn-primary" onclick="_dineCostAdd(\''+did+'\')">+ 원가 등록</button></div>'+
  '<div id="cost-list"><div style="text-align:center;padding:30px;color:var(--t3)"> 로딩중</div></div>';
 el.appendChild(wrap);

 _db.collection('menu_costs').where('dealerId','==',did).get().then(function(snap){
  var list=document.getElementById('cost-list');if(!list)return;
  if(snap.empty){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3);font-size:12px">원가를 등록하면 마진율이 자동 계산됩니다</div>';return;}
  var html='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">';
  snap.forEach(function(doc){
   var d=doc.data();
   var rate=d.price>0?Math.round((1-d.cost/d.price)*100):0;
   var rateColor=rate>=70?'#22c55e':rate>=50?'#f59e0b':'#ef4444';
   html+='<div class="card" style="padding:14px">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:8px">'+(d.emoji?d.emoji+' ':'')+d.name+'</div>'+
    '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">'+
    '<span style="color:var(--t3)">판매가</span><span>₩'+d.price.toLocaleString()+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px">'+
    '<span style="color:var(--t3)">원가</span><span style="color:var(--rd)">₩'+d.cost.toLocaleString()+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center">'+
    '<span style="font-size:11px;color:var(--t3)">마진율</span>'+
    '<span style="font-size:16px;font-weight:900;color:'+rateColor+'">'+rate+'%</span></div>'+
    '<div style="height:4px;background:var(--s3);border-radius:2px;margin-top:6px;overflow:hidden">'+
    '<div style="height:100%;width:'+rate+'%;background:'+rateColor+';border-radius:2px"></div></div>'+
    '</div>';
  });
  html+='</div>';
  list.innerHTML=html;
 });
}

function _dineCostAdd(did){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
 box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">원가 등록</div>'+
  '<div class="input-group"><label>메뉴명</label><input id="c-name" class="inp" placeholder="아메리카노"></div>'+
  '<div class="input-group"><label>이모지</label><input id="c-emoji" class="inp" value="☕" style="width:80px"></div>'+
  '<div class="input-group"><label>판매가 (원)</label><input id="c-price" class="inp" type="number" placeholder="4000"></div>'+
  '<div class="input-group"><label>원가 (원)</label><input id="c-cost" class="inp" type="number" placeholder="800"></div>'+
  '<div style="display:flex;gap:8px;margin-top:12px">'+
  '<button class="btn btn-primary" style="flex:1" onclick="_dineCostSave(\''+did+'\')">저장</button>'+
  '<button class="btn btn-ghost" onclick="this.closest(\'.mo\').remove()">취소</button></div>';
 mo.appendChild(box);mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

function _dineCostSave(did){
 var data={dealerId:did,name:document.getElementById('c-name').value.trim(),
  emoji:document.getElementById('c-emoji').value||'🍽',
  price:parseInt(document.getElementById('c-price').value)||0,
  cost:parseInt(document.getElementById('c-cost').value)||0,
  createdAt:_nowISO()};
 if(!data.name){_dineToast('경고:  메뉴명을 입력해주세요');return;}
 _db.collection('menu_costs').add(data).then(function(){
  _dineToast(' 등록됐습니다');document.querySelector('.mo')?.remove();_dineCost(document.getElementById('content'));
 });
}

/* ── AIVO 매출 인사이트 (Claude API) ── */
function _dineAivoInsight(){
 var btn=document.querySelector('[onclick="_dineAivoInsight()"]');
 var res=document.getElementById('aivo-result');
 if(!res)return;
 // 페이지의 KPI 수치 수집
 var kpiText=[];
 document.querySelectorAll('.kpi-card,.stat-card').forEach(function(el){
  var t=el.innerText.replace(/\s+/g,' ').trim();
  if(t)kpiText.push(t);
 });
 if(!kpiText.length){res.textContent='분석할 데이터가 없습니다.';return;}
 if(btn){btn.disabled=true;btn.textContent='분석 중...';}
 res.innerHTML='<span style="color:var(--t3)">AIVO 분석 중...</span>';
 var prompt='다음은 외식업 매출 데이터입니다:\n'+kpiText.join('\n')+
  '\n\n경영자 관점에서 3-4줄로 핵심 인사이트를 한국어로 분석해주세요. '+
  '개선점, 강점, 다음주 추천 전략을 포함해주세요.';
 fetch('/api/ai-coach',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({message:prompt,type:'aivo'})
 }).then(function(r){return r.json();})
 .then(function(d){
  if(d.reply){res.textContent='';d.reply.split('\n').forEach(function(line,i){if(i)res.appendChild(document.createElement('br'));res.appendChild(document.createTextNode(line));});}
  else res.textContent='응답을 받지 못했습니다.';
 }).catch(function(e){
  res.textContent='분석 오류: '+e.message;
 }).finally(function(){
  if(btn){btn.disabled=false;btn.textContent='AIVO 분석';}
 });
}
