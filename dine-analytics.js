// dine-analytics.js — 분석, 통계, 대시보드
// dine.js에서 분리됨 (리팩토링 2026-07-13)

function _dineAnalytics(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';

 if(!document.getElementById('ana-styles')){
  var st=document.createElement('style');st.id='ana-styles';
  st.textContent=
   '.ana-kpi{position:relative;overflow:hidden;border-radius:16px;padding:20px;background:var(--s2);border:1px solid var(--bd2)}'+
   '.ana-kpi .glow{position:absolute;width:90px;height:90px;border-radius:50%;opacity:.1;bottom:-20px;right:-20px;filter:blur(25px)}'+
   '.ana-kpi .ico{position:absolute;top:14px;right:14px;font-size:30px;opacity:.12}'+
   '.ana-kpi .lbl{font-size:10px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--t3);margin-bottom:6px}'+
   '.ana-kpi .num{font-size:24px;font-weight:900;line-height:1;margin-bottom:4px;font-variant-numeric:tabular-nums}'+
   '.ana-kpi .sub{font-size:11px;opacity:.65}'+
   '.ana-kpi .delta{font-size:10px;font-weight:700;margin-top:5px;padding:2px 7px;border-radius:20px;display:inline-block}'+
   '.ana-cc{background:var(--s2);border:1px solid var(--bd2);border-radius:16px;padding:20px}'+
   '.ana-ct{font-size:12px;font-weight:800;color:var(--t2);margin-bottom:3px}'+
   '.ana-cs{font-size:10px;color:var(--t3);margin-bottom:14px}'+
   '.ana-tab2{padding:7px 16px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:transparent;color:var(--t3);transition:.15s}'+
   '.ana-tab2.on{background:var(--bg3);color:var(--tx)}'+
   '.dp-bar{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)}'+
   '.dp-bar:last-child{border:none}';
  document.head.appendChild(st);
 }

 wrap.innerHTML=
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;flex-wrap:wrap;gap:10px">'+
  '<div><div class="page-title">📈 매출 분석</div><div class="page-sub">실시간 경영 인사이트</div></div>'+
  '<div style="display:flex;gap:4px;background:var(--bg3);border-radius:10px;padding:4px" id="ana-tabs">'+
  '<button class="ana-tab2 on" data-t="today" onclick="_dineAnaTab2(this)">오늘</button>'+
  '<button class="ana-tab2" data-t="week" onclick="_dineAnaTab2(this)">이번주</button>'+
  '<button class="ana-tab2" data-t="month" onclick="_dineAnaTab2(this)">이번달</button>'+
  '</div></div>'+
  /* KPI 4개 */
  '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px" id="ana-kpi"></div>'+
  /* 일별 추이 + daypart */
  '<div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:14px">'+
  '<div class="ana-cc"><div class="ana-ct">📅 일별 매출 추이</div><div class="ana-cs" id="ana-trend-sub">기간 트렌드</div>'+
  '<div style="position:relative;height:160px"><canvas id="ch-trend" aria-label="일별 매출 추이"></canvas></div></div>'+
  '<div class="ana-cc"><div class="ana-ct">⏱ 영업 타임별</div><div class="ana-cs">브런치/점심/저녁/야간</div>'+
  '<div id="ana-daypart" style="margin-top:4px"></div></div>'+
  '</div>'+
  /* 시간대 + 요일 */
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'+
  '<div class="ana-cc"><div class="ana-ct">⏰ 시간대별 매출</div><div class="ana-cs" id="ana-peak-txt">피크타임 분석</div>'+
  '<div style="position:relative;height:170px"><canvas id="ch-hour" aria-label="시간대별 매출"></canvas></div></div>'+
  '<div class="ana-cc"><div class="ana-ct">📅 요일별 매출</div><div class="ana-cs" id="ana-day-sub">요일 패턴</div>'+
  '<div style="position:relative;height:170px"><canvas id="ch-day" aria-label="요일별 매출"></canvas></div></div>'+
  '</div>'+
  /* 메뉴 + 결제 + 인건비 */
  '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:14px">'+
  '<div class="ana-cc"><div class="ana-ct">🏆 인기 메뉴 TOP 5</div><div class="ana-cs">주문 수량 기준</div>'+
  '<div id="ana-menu"></div></div>'+
  '<div class="ana-cc"><div class="ana-ct">💳 결제수단</div><div class="ana-cs" id="ana-pay-sub">비중 분석</div>'+
  '<div style="position:relative;height:130px"><canvas id="ch-pay" aria-label="결제수단 도넛"></canvas></div>'+
  '<div id="ana-pay-leg" style="margin-top:8px;display:flex;flex-direction:column;gap:4px"></div></div>'+
  '<div class="ana-cc"><div class="ana-ct">👥 인건비 분석</div><div class="ana-cs">매출 대비 비율</div>'+
  '<div id="ana-labor"></div></div>'+
  '</div>';

 el.appendChild(wrap);
 _dineAnaFilter2('today');
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
 var kpi=document.getElementById('ana-kpi');
 if(kpi)kpi.innerHTML='<div class="ana-kpi" style="grid-column:1/-1"><div class="lbl">로딩중...</div></div>';

 var ym=from.slice(0,7);
 var from2,to2; /* 비교기간 */
 var d1=new Date(from),d2=new Date(to);
 var diffDays=Math.round((d2-d1)/86400000)+1;
 var prevTo=new Date(d1);prevTo.setDate(prevTo.getDate()-1);
 var prevFrom=new Date(prevTo);prevFrom.setDate(prevFrom.getDate()-diffDays+1);
 from2=prevFrom.toISOString().slice(0,10);
 to2=prevTo.toISOString().slice(0,10);

 Promise.all([
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from2).where('date','<=',to2).get(),
  _db.collection('members').where('dealerId','==',did).get(),
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get()
 ]).then(function(results){
  var snap=results[0],prevSnap=results[1],memSnap=results[2],attSnap=results[3];

  var total=0,cnt=0,hours={},days={},menus={},methods={},daily={};
  var DN=['일','월','화','수','목','금','토'];
  snap.forEach(function(doc){
   var d=doc.data();if(d.status==='cancelled')return;
   var amt=d.total||0;total+=amt;cnt++;
   var dt=new Date(d.createdAt||d.date+'T12:00:00');
   var h=dt.getHours();
   hours[h]=(hours[h]||0)+amt;
   days[DN[dt.getDay()]]=(days[DN[dt.getDay()]]||0)+amt;
   var pmKr={'cash':'현금','Cash':'현금','card':'카드','Card':'카드','kakao':'카카오페이','naver':'네이버페이','toss':'토스페이'};
   var pm=pmKr[d.payMethod||'']||d.payMethod||'기타';
   methods[pm]=(methods[pm]||0)+amt;
   var dt2=d.date||dt.toISOString().slice(0,10);
   daily[dt2]=(daily[dt2]||0)+amt;
   (d.items||[]).forEach(function(it){menus[it.name]=(menus[it.name]||0)+(it.qty||1);});
  });

  var prevTotal=0,prevCnt=0;
  prevSnap.forEach(function(doc){
   var d=doc.data();if(d.status==='cancelled')return;
   prevTotal+=d.total||0;prevCnt++;
  });

  var avg=cnt?Math.round(total/cnt):0;
  var days2=Math.max(1,Object.keys(daily).length||diffDays);
  var dayAvg=Math.round(total/days2);
  var peakH=Object.entries(hours).sort(function(a,b){return b[1]-a[1];})[0];
  var maxDay=Object.entries(days).sort(function(a,b){return b[1]-a[1];})[0];

  /* 인건비 계산 */
  var attMap={};
  attSnap.forEach(function(doc){
   var d=doc.data();
   if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[]};
   if(d.type==='in')attMap[d.memberId].ins.push(d);
   else attMap[d.memberId].outs.push(d);
  });
  var totalLabor=0;
  memSnap.forEach(function(doc){
   var r=_calcPayFull(doc.data(),attMap[doc.id]||{ins:[],outs:[]},memSnap.size,ym);
   totalLabor+=r.grossSalary;
  });
  var laborRate=total>0?Math.round(totalLabor/total*100):0;

  /* 증감률 */
  function delta(cur,prev){
   if(!prev)return null;
   var d=Math.round((cur-prev)/prev*100);
   return {v:d,up:d>=0};
  }
  var dTotal=delta(total,prevTotal);
  var dCnt=delta(cnt,prevCnt);

  /* KPI 렌더 */
  function cu(id,target,pre,suf){
   var el=document.getElementById(id);if(!el||!target)return;
   var st=null;
   function step(ts){
    if(!st)st=ts;
    var p=Math.min((ts-st)/900,1);
    var e=1-Math.pow(1-p,4);
    el.textContent=pre+Math.round(e*target).toLocaleString()+suf;
    if(p<1)requestAnimationFrame(step);
   }
   requestAnimationFrame(step);
  }

  var kpis=[
   {lbl:'총 매출',id:'kn0',val:total,pre:'₩',suf:'',sub:cnt+'건',color:'#38bdf8',d:dTotal,icon:'💰'},
   {lbl:'일평균 매출',id:'kn1',val:dayAvg,pre:'₩',suf:'',sub:days2+'일 기준',color:'#22c55e',d:null,icon:'📊'},
   {lbl:'피크타임',id:'kn2',val:null,pre:'',suf:'',sub:peakH?'₩'+Math.round(peakH[1]).toLocaleString():'없음',color:'#f59e0b',d:null,icon:'⏰'},
   {lbl:'객단가',id:'kn3',val:avg,pre:'₩',suf:'',sub:'주문당 평균',color:'#a78bfa',d:dCnt,icon:'🎯'},
  ];
  if(kpi)kpi.innerHTML=kpis.map(function(k){
   var deltaHtml='';
   if(k.d!==null&&k.d){
    var bg=k.d.up?'rgba(34,197,94,.15)':'rgba(239,68,68,.15)';
    var fc=k.d.up?'#22c55e':'#ef4444';
    deltaHtml='<div class="delta" style="background:'+bg+';color:'+fc+'">'+(k.d.up?'▲':'▼')+Math.abs(k.d.v)+'% 전기간</div>';
   }
   return '<div class="ana-kpi">'+
    '<div class="glow" style="background:'+k.color+'"></div>'+
    '<div class="ico">'+k.icon+'</div>'+
    '<div class="lbl">'+k.lbl+'</div>'+
    '<div class="num" id="'+k.id+'" style="color:'+k.color+'">'+(k.val===null?(peakH?peakH[0]+'시대':'-'):'₩0')+'</div>'+
    '<div class="sub" style="color:'+k.color+'">'+k.sub+'</div>'+
    deltaHtml+'</div>';
  }).join('');

  setTimeout(function(){
   cu('kn0',total,'₩','');
   cu('kn1',dayAvg,'₩','');
   cu('kn3',avg,'₩','');
   if(peakH){var pk=document.getElementById('kn2');if(pk)pk.textContent=peakH[0]+'시대';}
   var pt=document.getElementById('ana-peak-txt');
   if(pt&&peakH)pt.textContent='🔥 '+peakH[0]+'시대 피크';
   var ds=document.getElementById('ana-day-sub');
   if(ds&&maxDay)ds.textContent='최다: '+maxDay[0]+'요일';
  },50);

  /* Daypart */
  var daypart=[
   {lbl:'브런치',range:[6,11],icon:'☀️',color:'#f59e0b'},
   {lbl:'점심',range:[11,15],icon:'🍱',color:'#22c55e'},
   {lbl:'저녁',range:[17,21],icon:'🌆',color:'#38bdf8'},
   {lbl:'야간',range:[21,24],icon:'🌙',color:'#a78bfa'},
  ];
  var dpEl=document.getElementById('ana-daypart');
  if(dpEl){
   var dpData=daypart.map(function(dp){
    var s=0;
    for(var h=dp.range[0];h<dp.range[1];h++)s+=(hours[h]||0);
    return Object.assign({},dp,{amt:s});
   });
   var dpMax=Math.max.apply(null,dpData.map(function(d){return d.amt;}))||1;
   dpEl.innerHTML=dpData.map(function(dp){
    var pct=Math.round(dp.amt/dpMax*100);
    var share=total>0?Math.round(dp.amt/total*100):0;
    return '<div class="dp-bar">'+
     '<span style="font-size:16px;flex-shrink:0">'+dp.icon+'</span>'+
     '<div style="flex:1;min-width:0">'+
     '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">'+
     '<span style="font-weight:700">'+dp.lbl+'</span>'+
     '<span style="color:'+dp.color+';font-weight:800">'+share+'%</span>'+
     '</div>'+
     '<div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">'+
     '<div style="height:100%;width:0%;background:'+dp.color+';border-radius:3px;transition:width 1s ease" data-w="'+pct+'"></div>'+
     '</div>'+
     '<div style="font-size:10px;color:var(--t3);margin-top:2px">₩'+dp.amt.toLocaleString()+'</div>'+
     '</div></div>';
   }).join('');
   setTimeout(function(){
    dpEl.querySelectorAll('[data-w]').forEach(function(b){b.style.width=b.dataset.w+'%';});
   },200);
  }

  /* 인건비 분석 */
  var lEl=document.getElementById('ana-labor');
  if(lEl){
   var lRate=laborRate;
   var lColor=lRate<25?'#22c55e':lRate<35?'#f59e0b':'#ef4444';
   var lMsg=lRate<25?'✅ 양호':lRate<35?'⚠️ 주의':'❌ 과다';
   lEl.innerHTML=
    '<div style="text-align:center;padding:10px 0">'+
    '<div style="font-size:36px;font-weight:900;color:'+lColor+'">'+lRate+'%</div>'+
    '<div style="font-size:11px;color:var(--t3);margin-bottom:6px">매출 대비 인건비율</div>'+
    '<div style="font-size:12px;font-weight:700;color:'+lColor+'">'+lMsg+'</div>'+
    '<div style="font-size:10px;color:var(--t3);margin-top:4px">적정 25~30%</div>'+
    '</div>'+
    '<div style="margin-top:8px">'+
    '<div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden">'+
    '<div style="height:100%;width:0%;background:'+lColor+';border-radius:4px;transition:width 1.2s ease" id="labor-bar"></div>'+
    '</div>'+
    '<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--t3);margin-top:3px">'+
    '<span>₩'+totalLabor.toLocaleString()+' 인건비</span>'+
    '<span>₩'+total.toLocaleString()+' 매출</span>'+
    '</div></div>';
   setTimeout(function(){var b=document.getElementById('labor-bar');if(b)b.style.width=Math.min(lRate,100)+'%';},200);
  }

  /* 차트 */
  _dineEnsureChart(function(){
   var CS=['#2a78d6','#1baf7a','#eda100','#4a3aa7','#e34948','#e87ba4','#eb6834','#008300'];

   /* 일별 추이 선차트 */
   var tc=document.getElementById('ch-trend');
   if(tc&&window.Chart){
    if(tc._ch)tc._ch.destroy();
    var allDates=[];
    var d=new Date(from);
    while(d<=new Date(to)){allDates.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}
    var tData=allDates.map(function(dt){return daily[dt]||0;});
    var tLabels=allDates.map(function(dt){return dt.slice(5);});
    var tMax=Math.max.apply(null,tData)||1;
    var ctx=tc.getContext('2d');
    var grad=ctx.createLinearGradient(0,0,0,160);
    grad.addColorStop(0,'rgba(56,189,248,.3)');
    grad.addColorStop(1,'rgba(56,189,248,.0)');
    tc._ch=new Chart(tc,{type:'line',data:{labels:tLabels,datasets:[{
     data:tData,
     borderColor:'#38bdf8',borderWidth:2.5,
     backgroundColor:grad,fill:true,
     tension:.4,pointRadius:tData.length<=7?4:2,
     pointBackgroundColor:'#38bdf8',pointBorderColor:'#111420',pointBorderWidth:2,
     hoverPointRadius:6
    }]},options:{responsive:true,maintainAspectRatio:false,
     animation:{duration:900},
     plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return '₩'+c.raw.toLocaleString();}}}},
     scales:{
      x:{grid:{display:false},border:{display:false},ticks:{color:'#6b7280',font:{size:9},maxTicksLimit:10}},
      y:{grid:{color:'rgba(255,255,255,.04)',lineWidth:.5},border:{display:false},ticks:{color:'#6b7280',font:{size:9},callback:function(v){return v>=10000?(v/10000).toFixed(0)+'만':v;}}}
     }}});
    var ts=document.getElementById('ana-trend-sub');
    if(ts)ts.textContent=allDates.length+'일 · 최고 ₩'+tMax.toLocaleString();
   }

   /* 시간대 */
   var hc=document.getElementById('ch-hour');
   if(hc&&window.Chart){
    if(hc._ch)hc._ch.destroy();
    var hl=Array.from({length:18},function(_,i){return (6+i)+'시';});
    var hd=Array.from({length:18},function(_,i){return hours[6+i]||0;});
    var hmax=Math.max.apply(null,hd)||1;
    hc._ch=new Chart(hc,{type:'bar',data:{labels:hl,datasets:[{
     data:hd,
     backgroundColor:hd.map(function(v){return v===hmax?'#38bdf8':'rgba(56,189,248,.2)';}),
     borderRadius:5,borderSkipped:false
    }]},options:{responsive:true,maintainAspectRatio:false,
     animation:{duration:900,easing:'easeOutQuart'},
     plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return '₩'+c.raw.toLocaleString();}}}},
     scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#6b7280',font:{size:9},maxRotation:0}},
      y:{grid:{color:'rgba(255,255,255,.04)',lineWidth:.5},border:{display:false},ticks:{color:'#6b7280',font:{size:9},callback:function(v){return v>=10000?(v/10000).toFixed(0)+'만':v;}}}
     }}});
   }

   /* 요일 */
   var dc=document.getElementById('ch-day');
   if(dc&&window.Chart){
    if(dc._ch)dc._ch.destroy();
    var dord=['월','화','수','목','금','토','일'];
    var dd=dord.map(function(d){return days[d]||0;});
    var dmax=Math.max.apply(null,dd)||1;
    dc._ch=new Chart(dc,{type:'bar',data:{labels:dord,datasets:[{
     data:dd,
     backgroundColor:dd.map(function(v){return v===dmax?'#a78bfa':'rgba(167,139,250,.2)';}),
     borderRadius:5,borderSkipped:false
    }]},options:{responsive:true,maintainAspectRatio:false,
     animation:{duration:900,easing:'easeOutBounce'},
     plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return '₩'+c.raw.toLocaleString();}}}},
     scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#6b7280',font:{size:11}}},
      y:{grid:{color:'rgba(255,255,255,.04)',lineWidth:.5},border:{display:false},ticks:{color:'#6b7280',font:{size:9},callback:function(v){return v>=10000?(v/10000).toFixed(0)+'만':v;}}}
     }}});
   }

   /* 결제수단 도넛 */
   var pc=document.getElementById('ch-pay');
   var meth=Object.entries(methods).sort(function(a,b){return b[1]-a[1];});
   if(pc&&window.Chart&&meth.length){
    if(pc._ch)pc._ch.destroy();
    var pColors=meth.map(function(_,i){return CS[i%CS.length];});
    pc._ch=new Chart(pc,{type:'doughnut',data:{
     labels:meth.map(function(e){return e[0];}),
     datasets:[{data:meth.map(function(e){return e[1];}),backgroundColor:pColors,borderWidth:3,borderColor:'#111420',hoverOffset:6}]
    },options:{responsive:true,maintainAspectRatio:false,
     animation:{animateRotate:true,duration:1000},cutout:'68%',
     plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.label+' '+Math.round(c.raw/(total||1)*100)+'%';}}}}
    }});
    var leg=document.getElementById('ana-pay-leg');
    if(leg)leg.innerHTML=meth.map(function(e,i){
     var pct=total?Math.round(e[1]/total*100):0;
     return '<div style="display:flex;align-items:center;gap:6px;font-size:10px">'+
      '<div style="width:8px;height:8px;border-radius:2px;background:'+pColors[i]+';flex-shrink:0"></div>'+
      '<span style="flex:1">'+e[0]+'</span>'+
      '<span style="font-weight:800;color:'+pColors[i]+'">'+pct+'%</span>'+
      '</div>';
    }).join('');
    var ps=document.getElementById('ana-pay-sub');
    if(ps&&meth[0])ps.textContent='최다: '+meth[0][0]+' '+Math.round(meth[0][1]/total*100)+'%';
   }
  });

  /* 인기메뉴 */
  var mEl=document.getElementById('ana-menu');
  if(mEl){
   var top5=Object.entries(menus).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
   var mmax=top5[0]?top5[0][1]:1;
   var mColors=['#f59e0b','#94a3b8','#cd7f32','#38bdf8','#a78bfa'];
   var ranks=['🥇','🥈','🥉','4️⃣','5️⃣'];
   if(!top5.length){mEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">데이터 없음</div>';return;}
   mEl.innerHTML=top5.map(function(m,i){
    var share=cnt?Math.round((m[1]||0)/cnt*100):0;
    return '<div style="padding:8px 0;border-bottom:1px solid var(--bd)">'+
     '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">'+
     '<span style="font-size:16px;flex-shrink:0">'+ranks[i]+'</span>'+
     '<span style="flex:1;font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+m[0]+'</span>'+
     '<span style="font-size:11px;font-weight:800;color:'+mColors[i]+'" id="mc'+i+'">0개</span>'+
     '<span style="font-size:9px;color:var(--t3);margin-left:2px">'+share+'%</span>'+
     '</div>'+
     '<div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">'+
     '<div style="height:100%;width:0%;background:'+mColors[i]+';border-radius:3px;transition:width 1.2s cubic-bezier(.34,1.56,.64,1) '+(i*.1)+'s" id="mb'+i+'"></div>'+
     '</div></div>';
   }).join('');
   setTimeout(function(){
    top5.forEach(function(m,i){
     var bar=document.getElementById('mb'+i);if(bar)bar.style.width=Math.round(m[1]/mmax*100)+'%';
     var cnt2=document.getElementById('mc'+i);if(!cnt2)return;
     var t2=m[1],st2=null;
     (function step2(ts){if(!st2)st2=ts;var p=Math.min((ts-st2)/700,1);cnt2.textContent=Math.round(p*t2)+'개';if(p<1)requestAnimationFrame(step2);})(0);
    });
   },150);
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
}

function _dineUpdateSidebarStaff(){
 // 직원용 사이드바: 스케줄/출퇴근만
 var groups = document.querySelectorAll('.nav-group');
 groups.forEach(function(g){
  var title = g.querySelector('.nav-group-title');
  if(!title) return;
  var t = title.textContent.trim();
  if(t==='직원 관리'){
   // 직원 관리 내 스케줄/출퇴근만 보이고 나머지 숨김
   g.querySelectorAll('.nav-item').forEach(function(item){
    var txt = item.textContent.trim();
    if(txt.includes('근무 스케줄')||txt.includes('출퇴근 현황')){
     item.style.display='flex';
    } else {
     item.style.display='none';
    }
   });
  } else if(t==='정산'||t==='고객'||t==='설정'){
   g.style.display='none';
  } else if(t==='홈'||t===''){
   // 홈(오늘 현황)은 숨김
   g.querySelectorAll('.nav-item').forEach(function(item){
    item.style.display='none';
   });
  }
 });
 // 급여/명세서는 본인것만 추가
 var staffMenuGroup = document.querySelector('.nav-group-items');
 // 내 급여 메뉴 추가
 var myPayNav = document.createElement('div');
 myPayNav.className='nav-item';
 myPayNav.innerHTML='<span class="ic">💰</span>내 급여';
 myPayNav.onclick=function(){_dineMyPayroll(document.getElementById('content'));};
 // 내 명세서 메뉴
 var mySlipNav = document.createElement('div');
 mySlipNav.className='nav-item';
 mySlipNav.innerHTML='<span class="ic">📋</span>내 명세서';
 mySlipNav.onclick=function(){_dineMyPayslip(document.getElementById('content'));};
 // 첫번째 nav-group-items에 추가
 if(staffMenuGroup){
  staffMenuGroup.appendChild(myPayNav);
  staffMenuGroup.appendChild(mySlipNav);
 }
}

// 직원 본인 급여 조회
function _dineMyPayroll(el){
 if(!_CU.staffId){el.innerHTML='<div class="empty">직원 정보 없음</div>';return;}
 el.innerHTML='<div class="slide-up">';
 var wrap=document.createElement('div');wrap.className='slide-up';
 wrap.innerHTML='<div style="margin-bottom:16px"><div class="page-title">💰 내 급여</div><div class="page-sub">'+_CU.name+'님의 급여 현황</div></div>'+
  '<div style="display:flex;gap:8px;margin-bottom:14px">'+
  '<input type="month" id="my-pay-ym" class="inp" style="width:auto" value="'+new Date().toISOString().slice(0,7)+'">'+
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
 wrap.innerHTML='<div style="margin-bottom:16px"><div class="page-title">📋 내 명세서</div><div class="page-sub">'+_CU.name+'님의 급여명세서</div></div>'+
  '<div id="my-payslip-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩중</div></div>';
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

 wrap.innerHTML='<div style="margin-bottom:16px"><div class="page-title">📅 근무 스케줄</div><div class="page-sub">주간 근무 현황</div></div>'+
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
  '<div><div class="page-title">🧾 원가 관리</div><div class="page-sub">메뉴별 원가율 · 마진 분석</div></div>'+
  '<button class="btn btn-primary" onclick="_dineCostAdd(\''+did+'\')">+ 원가 등록</button></div>'+
  '<div id="cost-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩중</div></div>';
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
    '<div style="font-size:14px;font-weight:800;margin-bottom:8px">'+(d.emoji||'🍽')+' '+d.name+'</div>'+
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
 box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">🧾 원가 등록</div>'+
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
  createdAt:new Date().toISOString()};
 if(!data.name){alert('메뉴명 입력');return;}
 _db.collection('menu_costs').add(data).then(function(){
  _dineToast('✅ 등록됐습니다');document.querySelector('.mo')?.remove();_dineCost(document.getElementById('content'));
 });
}
