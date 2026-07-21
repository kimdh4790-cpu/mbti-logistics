/**
 * @module      filo-report.js
 * ══════════════════════════════════════════════════════
 * 역할: 매출 분석 · POS 리포트 · 차트 · 세무사 공유
 *
 * 저장 컬렉션:
 *   filo_sales — 매출 기록
 * 의존: filo-common.js, filo-margin.js (마진분석 함수)
 * ⚠️ 2026-07-15 리팩토링:
 *   마진 함수 8개 → filo-margin.js 로 이동
 *   (_filoCalcAndRender, _filoGenerateAIInsight, _filoMarginLoad,
 *    _filoStartMarginLive, setKpi, _filoRenderMarginAnalysis,
 *    _filoRenderInsights, _filoMgTab)
 * ══════════════════════════════════════════════════════
 */
// 의존성: filo-common.js, Chart.js
// 관련 컬렉션: filo_sales
// ⚠️ 2026-07-12 filo-common.js에서 분리됨
//   포함: _filoMgTab, _filoMarginLoad, _filoCalcAndRender,
//          _filoRenderMarginAnalysis, _filoGenerateAIInsight
function _filoPageSales(el){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">로그인 후 이용하세요</div>';return;}

 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:1100px;margin:0 auto';

 /* ── 헤더 ── */
 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px';
 hdr.innerHTML='<div><div class="page-title">📊 매출·분석</div><div class="page-sub" id="sales-hero-sub">실시간 연동 중...</div></div>';

 /* 날짜 필터 버튼 */
 var filterWrap=document.createElement('div');
 filterWrap.style.cssText='display:flex;flex-direction:column;align-items:flex-end;gap:8px';
 var btnRow=document.createElement('div');
 btnRow.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
 [['today','오늘'],['week','이번주'],['month','이번달'],['custom','📅 직접선택']].forEach(function(f,i){
  var btn=document.createElement('button');
  btn.id='sf-'+f[0];btn.textContent=f[1];
  btn.style.cssText='padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;transition:.2s;border:'+(i===0?'none;background:var(--br);color:#fff':'1px solid var(--bd2);background:transparent;color:var(--t2)');
  (function(k){btn.onclick=function(){_filoSalesFilter(k);};})(f[0]);
  btnRow.appendChild(btn);
 });
 var customRow=document.createElement('div');
 customRow.id='sf-custom-wrap';
 customRow.style.cssText='display:none;gap:6px;align-items:center;flex-wrap:wrap';
 customRow.innerHTML='<input type="date" id="sf-from" style="padding:6px 10px;background:var(--surface2);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);font-size:12px">'+
  '<span style="color:var(--t3)">~</span>'+
  '<input type="date" id="sf-to" style="padding:6px 10px;background:var(--surface2);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);font-size:12px">'+
  '<button onclick="_filoMarginLoadRange()" style="padding:6px 12px;background:var(--br);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">조회</button>';
 filterWrap.appendChild(btnRow);filterWrap.appendChild(customRow);
 hdr.appendChild(filterWrap);
 wrap.appendChild(hdr);

 /* ── KPI 카드 4개 ── */
 var kpiGrid=document.createElement('div');
 kpiGrid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px';
 [
  {id:'kpi-rev',label:'매출',icon:'💰',color:'#a78bfa',sub:'kpi-rev-sub'},
  {id:'kpi-cnt',label:'주문',icon:'🛒',color:'#38bdf8',sub:'kpi-cnt-sub'},
  {id:'kpi-avg',label:'객단가',icon:'📈',color:'#22c55e',sub:'kpi-avg-sub'},
  {id:'kpi-peak',label:'피크타임',icon:'⏰',color:'#f59e0b',sub:'kpi-peak-sub'},
 ].forEach(function(k){
  var card=document.createElement('div');
  card.className='kpi-card';
  card.style.cssText='background:var(--surface2);border:1px solid var(--bd2);border-radius:16px;padding:16px;position:relative;overflow:hidden';
  card.innerHTML='<div style="position:absolute;top:0;left:0;right:0;height:3px;background:'+k.color+';border-radius:16px 16px 0 0"></div>'+
   '<div style="font-size:11px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">'+k.icon+' '+k.label+'</div>'+
   '<div id="'+k.id+'" style="font-size:22px;font-weight:900;color:'+k.color+';letter-spacing:-1px;margin-bottom:4px">-</div>'+
   '<div id="'+k.sub+'" style="font-size:11px;color:var(--t3)">로딩 중...</div>';
  kpiGrid.appendChild(card);
 });
 wrap.appendChild(kpiGrid);

 /* ── 차트 2열 레이아웃 ── */
 var chartGrid=document.createElement('div');
 chartGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px';

 /* 시간대별 바차트 */
 var hourCard=document.createElement('div');
 hourCard.className='card';
 hourCard.innerHTML='<div class="sec-title" style="margin-bottom:12px">⏰ 시간대별 매출</div>'+
  '<div style="position:relative;height:180px"><canvas id="chart-hour"></canvas></div>';
 chartGrid.appendChild(hourCard);

 /* 결제수단 도넛 + 금액 */
 var payCard=document.createElement('div');
 payCard.className='card';
 payCard.innerHTML='<div class="sec-title" style="margin-bottom:12px">💳 결제수단</div>'+
  '<div id="pay-method-list"></div>';
 chartGrid.appendChild(payCard);
 wrap.appendChild(chartGrid);

 /* ── 3열 하단 ── */
 var bottomGrid=document.createElement('div');
 bottomGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px';

 /* 인기메뉴 TOP5 */
 var menuCard=document.createElement('div');
 menuCard.className='card';
 menuCard.innerHTML='<div class="sec-title" style="margin-bottom:12px">🏆 인기 메뉴 TOP5</div>'+
  '<div id="top-menu-list"></div>';
 bottomGrid.appendChild(menuCard);

 /* 요일별 매출 */
 var dayCard=document.createElement('div');
 dayCard.className='card';
 dayCard.innerHTML='<div class="sec-title" style="margin-bottom:12px">📅 요일별 매출</div>'+
  '<div style="position:relative;height:160px"><canvas id="chart-day"></canvas></div>';
 bottomGrid.appendChild(dayCard);

 /* 일별 매출 추이 */
 var trendCard=document.createElement('div');
 trendCard.className='card';
 trendCard.innerHTML='<div class="sec-title" style="margin-bottom:12px">📈 매출 추이</div>'+
  '<div style="position:relative;height:160px"><canvas id="chart-trend"></canvas></div>';
 bottomGrid.appendChild(trendCard);
 wrap.appendChild(bottomGrid);

 /* ── 원가·마진 분석 탭 ── */
 var tabRow=document.createElement('div');
 tabRow.style.cssText='display:flex;gap:8px;margin-bottom:14px';
 ['📊 마진 분석','🧾 원가 등록','💡 AI 인사이트'].forEach(function(t,i){
  var tb=document.createElement('button');
  tb.style.cssText='padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:.2s;border:none;'+(i===0?'background:var(--br);color:#fff':'background:var(--surface2);color:var(--t2)');
  tb.textContent=t;
  (function(idx2){
   tb.onclick=function(){
    document.querySelectorAll('#sales-tab-content > div').forEach(function(d,j){d.style.display=j===idx2?'block':'none';});
    tabRow.querySelectorAll('button').forEach(function(b,j){b.style.background=j===idx2?'var(--br)':'var(--surface2)';b.style.color=j===idx2?'#fff':'var(--t2)';});
   };
  })(i);
  tabRow.appendChild(tb);
 });
 wrap.appendChild(tabRow);

 var tabContent=document.createElement('div');
 tabContent.id='sales-tab-content';

 /* 탭1: 마진 분석 */
 var tab1=document.createElement('div');
 tab1.id='sales-live';
 tab1.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">⏳ 데이터 로딩 중...</div>';
 tabContent.appendChild(tab1);

 /* 탭2: 원가 등록 */
 var tab2=document.createElement('div');
 tab2.style.display='none';
 tab2.innerHTML='<div class="card"><div class="sec-title" style="margin-bottom:12px">🧾 원가 등록</div>'+
  '<div style="font-size:12px;color:var(--t2)">메뉴별 원가를 등록하면 마진율이 자동 계산됩니다.</div>'+
  '<button onclick="_filoGoPage(\'cost_mgmt\')" style="margin-top:12px;padding:10px 20px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-size:13px;font-weight:700;cursor:pointer">⚙️ 원가 설정하기</button></div>';
 tabContent.appendChild(tab2);

 /* 탭3: AI 인사이트 */
 var tab3=document.createElement('div');
 tab3.style.display='none';
 tab3.innerHTML='<div class="card"><div class="sec-title" style="margin-bottom:12px">💡 AI 인사이트</div>'+
  '<div id="ai-insight-content"><div style="text-align:center;padding:30px;color:var(--t3)">⏳ AI 분석 중...</div></div></div>';
 tabContent.appendChild(tab3);
 wrap.appendChild(tabContent);
 el.appendChild(wrap);

 /* Chart.js 로드 후 데이터 조회 */
 _filoEnsureChartJS(function(){
  _filoMarginLoad();
  _filoLoadSalesCharts(did);
 });
 setTimeout(function(){_filoGenerateAIInsight(did);},1500);
}

function _filoEnsureChartJS(cb){
 if(window.Chart)return cb();
 var s=document.createElement('script');
 s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
 s.onload=cb;document.head.appendChild(s);
}

function _filoLoadSalesCharts(did){
 var today=_today();
 var ym=today.slice(0,7);
 var from=ym+'-01',to=today;
 _filoRenderSalesCharts(did,from,to);
}

function _filoRenderSalesCharts(did,from,to){
 _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get()
 .then(function(snap){
  var total=0,cnt=0,items={},hours={},days={},dates={},methods={};
  snap.forEach(function(doc){
   var d=doc.data();
   if(d.status==='cancelled')return;
   var amt=d.total||0;
   total+=amt;cnt++;
   var dt=new Date(d.createdAt||d.date+'T12:00:00');
   var h=dt.getHours();
   hours[h]=(hours[h]||0)+amt;
   var day=['일','월','화','수','목','금','토'][dt.getDay()];
   days[day]=(days[day]||0)+amt;
   var dt2=d.date||'';
   dates[dt2]=(dates[dt2]||0)+amt;
   var pm=d.payMethod||'기타';
   methods[pm]=(methods[pm]||0)+amt;
   (d.items||[]).forEach(function(it){items[it.name]=(items[it.name]||0)+(it.qty||1);});
  });

  /* KPI 업데이트 (카운팅 애니메이션) */
  _filoCountUp('kpi-rev','₩',total,1200);
  _filoCountUp('kpi-cnt','',cnt,800,function(v){return v+'건';});
  _filoCountUp('kpi-avg','₩',cnt?Math.round(total/cnt):0,1000);
  var peakH=Object.entries(hours).sort(function(a,b){return b[1]-a[1];})[0];
  var peakEl=document.getElementById('kpi-peak');
  if(peakEl&&peakH)peakEl.textContent=peakH[0]+'시';
  var subMap={'kpi-rev-sub':from+(from!==to?' ~ '+to:''),'kpi-cnt-sub':'평균 '+((cnt/(new Date(to)-new Date(from)+86400000)*86400000)||0).toFixed(1)+'건/일','kpi-avg-sub':'가장 높은 단가','kpi-peak-sub':'가장 바쁜 시간'};
  Object.keys(subMap).forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=subMap[id];});

  /* 히어로 서브 */
  var hs=document.getElementById('sales-hero-sub');
  if(hs)hs.textContent=from+(from!==to?' ~ '+to:'')+'  ·  '+cnt+'건  ·  ₩'+total.toLocaleString();

  /* 시간대 바차트 */
  _filoDrawBarChart('chart-hour',
   Array.from({length:14},function(_,i){return (8+i)+'시';}),
   Array.from({length:14},function(_,i){return hours[8+i]||0;}),
   '#7c3aed','rgba(124,58,237,.15)'
  );

  /* 요일 바차트 */
  var dayOrder=['월','화','수','목','금','토','일'];
  _filoDrawBarChart('chart-day',dayOrder,dayOrder.map(function(d){return days[d]||0;}),
   '#0891b2','rgba(8,145,178,.15)'
  );

  /* 추이 라인차트 */
  var dateKeys=Object.keys(dates).sort();
  _filoDrawLineChart('chart-trend',dateKeys.map(function(d){return d.slice(5);}),dateKeys.map(function(d){return dates[d];}));

  /* 결제수단 카드 */
  var payEl=document.getElementById('pay-method-list');
  if(payEl){
   var payColors={'카드':'#60a5fa','현금':'#22c55e','카카오페이':'#f59e0b','네이버페이':'#10b981','카운터결제':'#a78bfa','기타':'#9898c0'};
   var payIcons={'카드':'💳','현금':'💵','카카오페이':'🟡','네이버페이':'🟢','카운터결제':'🏪','기타':'💰'};
   var sorted=Object.entries(methods).sort(function(a,b){return b[1]-a[1];});
   payEl.innerHTML='';
   sorted.forEach(function(m){
    var pct=total>0?Math.round(m[1]/total*100):0;
    var col=payColors[m[0]]||'#9898c0';
    var ic=payIcons[m[0]]||'💰';
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)';
    row.innerHTML='<span style="font-size:16px">'+ic+'</span>'+
     '<div style="flex:1">'+
     '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
     '<span style="font-size:12px;font-weight:700">'+m[0]+'</span>'+
     '<span style="font-size:13px;font-weight:900;color:'+col+'">₩'+m[1].toLocaleString()+'</span>'+
     '</div>'+
     '<div style="height:4px;background:var(--surface3);border-radius:2px;overflow:hidden">'+
     '<div class="anim-bar" data-w="'+pct+'" style="height:100%;width:0%;background:'+col+';border-radius:2px;transition:width .8s cubic-bezier(.34,1.56,.64,1)"></div>'+
     '</div>'+
     '<span style="font-size:10px;color:var(--t3)">'+pct+'% 비중</span>'+
     '</div>';
    payEl.appendChild(row);
   });
   setTimeout(function(){document.querySelectorAll('.anim-bar').forEach(function(b){b.style.width=b.dataset.w+'%';});},100);
  }

  /* 인기메뉴 */
  var menuEl=document.getElementById('top-menu-list');
  if(menuEl){
   var topMenus=Object.entries(items).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
   var ranks=['🥇','🥈','🥉','4️⃣','5️⃣'];
   menuEl.innerHTML=topMenus.length?topMenus.map(function(m,i){
    var pct=cnt>0?Math.round(m[1]/cnt*100):0;
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--bd)">'+
     '<span style="font-size:16px">'+ranks[i]+'</span>'+
     '<div style="flex:1">'+
     '<div style="display:flex;justify-content:space-between">'+
     '<span style="font-size:12px;font-weight:700">'+m[0]+'</span>'+
     '<span style="font-size:12px;font-weight:900;color:#22c55e">'+m[1]+'개</span>'+
     '</div>'+
     '<div style="height:3px;background:var(--surface3);border-radius:2px;margin-top:4px;overflow:hidden">'+
     '<div class="anim-bar2" data-w="'+pct+'" style="height:100%;width:0%;background:linear-gradient(90deg,var(--br),#22c55e);border-radius:2px;transition:width .8s ease '+(i*.15)+'s"></div>'+
     '</div></div></div>';
   }).join(''):'<div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">판매 데이터 없음</div>';
   setTimeout(function(){document.querySelectorAll('.anim-bar2').forEach(function(b){b.style.width=b.dataset.w+'%';});},200);
  }

 }).catch(function(e){
  var hs=document.getElementById('sales-hero-sub');
  if(hs)hs.textContent='오류: '+e.message;
 });
}

function _filoDrawBarChart(id,labels,data,color,bgColor){
 var canvas=document.getElementById(id);if(!canvas||!window.Chart)return;
 if(canvas._chart)canvas._chart.destroy();
 var max=Math.max.apply(null,data)||1;
 canvas._chart=new Chart(canvas,{
  type:'bar',
  data:{labels:labels,datasets:[{label:'매출',data:data,
   backgroundColor:data.map(function(v){return v===max?color:bgColor;}),
   borderColor:data.map(function(v){return v===max?color:'transparent';}),
   borderWidth:1,borderRadius:6,borderSkipped:false}]},
  options:{responsive:true,maintainAspectRatio:false,
   animation:{duration:900,easing:'easeOutQuart'},
   plugins:{legend:{display:false},
    tooltip:{callbacks:{label:function(ctx){return '₩'+ctx.raw.toLocaleString();}},
     backgroundColor:'rgba(14,14,30,.95)',titleColor:'#a78bfa',bodyColor:'#f0f0ff',
     borderColor:'rgba(124,58,237,.3)',borderWidth:1,padding:10,cornerRadius:10}},
   scales:{
    x:{grid:{display:false},ticks:{color:'#9898c0',font:{size:10},maxRotation:0}},
    y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#9898c0',font:{size:10},
     callback:function(v){return v>=10000?(v/10000).toFixed(0)+'만':(v>=1000?(v/1000).toFixed(0)+'k':v);}}}
   }}
 });
}

function _filoDrawLineChart(id,labels,data){
 var canvas=document.getElementById(id);if(!canvas||!window.Chart)return;
 if(canvas._chart)canvas._chart.destroy();
 canvas._chart=new Chart(canvas,{
  type:'line',
  data:{labels:labels,datasets:[{label:'매출',data:data,
   borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,.08)',
   borderWidth:2,pointRadius:3,pointBackgroundColor:'#22c55e',
   fill:true,tension:.4}]},
  options:{responsive:true,maintainAspectRatio:false,
   animation:{duration:1000,easing:'easeOutCubic'},
   plugins:{legend:{display:false},
    tooltip:{callbacks:{label:function(ctx){return '₩'+ctx.raw.toLocaleString();}},
     backgroundColor:'rgba(14,14,30,.95)',titleColor:'#22c55e',bodyColor:'#f0f0ff',
     borderColor:'rgba(34,197,94,.3)',borderWidth:1,padding:10,cornerRadius:10}},
   scales:{
    x:{grid:{display:false},ticks:{color:'#9898c0',font:{size:10},maxRotation:0,maxTicksLimit:10}},
    y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#9898c0',font:{size:10},
     callback:function(v){return v>=10000?(v/10000).toFixed(0)+'만':(v>=1000?(v/1000).toFixed(0)+'k':v);}}}
   }}
 });
}

function _filoRenderHeroChart(did){
 var days=[];
 for(var i=6;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);days.push(d.toISOString().slice(0,10));}
 Promise.all(days.map(function(dt){
  return _db.collection('mbetco_sales').where('dealerId','==',did).where('date','==',dt).get();
 })).then(function(snaps){
  var vals=snaps.map(function(s){var t=0;s.forEach(function(d){t+=d.data().revenue||0;});return t;});
  var maxV=Math.max.apply(null,vals)||1;
  var chart=document.getElementById('hero-chart');
  if(!chart)return;
  chart.innerHTML=vals.map(function(v,i){
   var pct=Math.round(v/maxV*100);
   var isToday=i===6;
   return '<div class="chart-bar" data-tip="'+days[i].slice(5)+' ₩'+(v/10000).toFixed(0)+'만" '+
   'style="height:'+Math.max(pct,4)+'%;background:'+(isToday?'linear-gradient(180deg,#a78bfa,#7c3aed)':'rgba(255,255,255,.12)')+';border-radius:4px 4px 0 0;flex:1;transition:height .8s cubic-bezier(.34,1.56,.64,1) '+(i*.05)+'s"></div>';
  }).join('');
 }).catch(function(){});
}

/* ── 마진 분석 탭 ── */
function _filoPagePosReport(el){_filoPageSales(el);}
function _filoTaxSendReport(type){
 var did=_CU.dealerId||_CU.uid;
 var email=(document.getElementById('tax-email-inp')&&document.getElementById('tax-email-inp').value)||'';
 if(!email){_filoToast('먼저 세무사 이메일을 등록하세요');return;}
 _filoToast('⏳ 리포트 준비 중...');
 /* 매출 데이터 수집 */
 var now=new Date();
 var startDate,endDate;
 if(type==='thisMonth'){startDate=now.getFullYear()+'-'+(now.getMonth()+1).toString().padStart(2,'0')+'-01';endDate=now.toISOString().slice(0,10);}
 else if(type==='lastMonth'){var lm=new Date(now.getFullYear(),now.getMonth()-1,1);startDate=lm.toISOString().slice(0,7)+'-01';endDate=new Date(now.getFullYear(),now.getMonth(),0).toISOString().slice(0,10);}
 else{startDate=now.getFullYear()+'-01-01';endDate=now.toISOString().slice(0,10);}

 _db.collection('filo_sales').where('dealerId','==',did)
  .where('date','>=',startDate).where('date','<=',endDate).get()
  .then(function(snap){
   var total=0,cnt=0,menuMap={};
   snap.forEach(function(doc){
    var d=doc.data();
    total+=d.total||0;cnt++;
    (d.items||[]).forEach(function(it){
     menuMap[it.name]=(menuMap[it.name]||0)+(it.qty||1);
    });
   });
   var topMenus=Object.entries(menuMap).sort(function(a,b){return b[1]-a[1];}).slice(0,5)
    .map(function(kv){return kv[0]+' '+kv[1]+'건';}).join(', ');

   _db.collection('alimtalk_queue').add({
    type:'tax_report',to:email,dealerId:did,
    reportData:{period:startDate+'~'+endDate,total:total,cnt:cnt,topMenus:topMenus},
    createdAt:_nowISO(),status:'pending'
   }).then(function(){_filoToast('✅ 리포트가 발송됐습니다!');});
  });
}
function _filoSalesFilter(type){
 ['today','week','month','custom'].forEach(function(t){
  var btn=document.getElementById('sf-'+t);
  if(!btn)return;
  if(t===type){btn.style.background='rgba(124,58,237,.4)';btn.style.color='#a78bfa';btn.style.border='1px solid rgba(124,58,237,.4)';}
  else{btn.style.background='transparent';btn.style.color='rgba(255,255,255,.6)';btn.style.border='1px solid rgba(255,255,255,.12)';}
 });
 var cw=document.getElementById('sf-custom-wrap');
 if(cw)cw.style.display=type==='custom'?'flex':'none';
 if(type==='custom')return;
 var today=new Date();
 var from,to=today.toISOString().slice(0,10);
 if(type==='today'){from=to;}
 else if(type==='week'){var day=today.getDay()||7;var mon=new Date(today);mon.setDate(today.getDate()-(day-1));from=mon.toISOString().slice(0,10);}
 else if(type==='month'){from=today.toISOString().slice(0,7)+'-01';}
 _filoMarginLoadRange(from,to);
}

/* ── 탭 전환 ── */
var _mgTabIdx=0;

/* ── 데이터 로드 ── */
/* ── 실시간 마진 리스너 ── */
var _marginUnsub=null,_marginCostMap={},_marginDid='';

/* ── 7일 바 차트 ── */

/* ── 원가 등록 탭 ── */

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


// ── 정산 리포트 UI (사진 2번 스타일) ────────────────────────────
function _filoPageSalesReport(el) {
  var did = (_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
  if(!did){ el.innerHTML='<div class="card" style="text-align:center;padding:40px">로그인 후 이용하세요</div>'; return; }

  var today = _today();
  var ym = today.slice(0,7);

  // 기간 계산 (이번주 기본)
  var now = new Date();
  var dayOfWeek = now.getDay();
  var monday = new Date(now); monday.setDate(now.getDate() - (dayOfWeek===0?6:dayOfWeek-1));
  var sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
  var dateFrom = monday.toISOString().slice(0,10);
  var dateTo   = sunday.toISOString().slice(0,10);

  el.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.className = 'slide-up';
  wrap.style.cssText = 'max-width:960px;margin:0 auto';

  // ── 헤더 ──
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px';
  hdr.innerHTML =
    '<div>' +
    '<div style="font-size:22px;font-weight:900;color:var(--tx)">정산 리포트</div>' +
    '<div style="font-size:12px;color:var(--t3);margin-top:4px" id="sr-period-label">일별 정산 · ' + dateFrom + ' ~ ' + dateTo + '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
    '<div style="display:flex;gap:4px;background:var(--bg2);border-radius:10px;padding:4px">' +
    ['이번주','이번달','지난달'].map(function(l,i){
      return '<button onclick="_filoSalesReportPeriod('+i+',''+did+'')" class="sr-period-btn'+(i===0?' sr-period-on':'')+'" style="padding:6px 12px;border-radius:8px;border:none;font-size:12px;font-weight:700;cursor:pointer;background:'+(i===0?'var(--br)':'transparent')+';color:'+(i===0?'#fff':'var(--t3)')+'">'+l+'</button>';
    }).join('') +
    '</div>' +
    '<button onclick="_filoSalesReportExport()" style="padding:8px 16px;background:var(--surface);border:1px solid var(--bd);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;color:var(--tx)">⬇ 내보내기</button>' +
    '</div>';
  wrap.appendChild(hdr);

  // ── KPI 4열 ──
  var kpi = document.createElement('div');
  kpi.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px';
  kpi.innerHTML = [
    {id:'sr-card',   ic:'💳', lbl:'카드 매출',  c:'#0891b2'},
    {id:'sr-cash',   ic:'💵', lbl:'현금 매출',  c:'#059669'},
    {id:'sr-fee',    ic:'🏷', lbl:'수수료',     c:'#ef4444'},
    {id:'sr-net',    ic:'💰', lbl:'순수익',     c:'#7c3aed'},
  ].map(function(k){
    return '<div class="card" style="padding:16px;border-radius:16px">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">' +
      '<span style="font-size:16px">'+k.ic+'</span>' +
      '<span style="font-size:11px;font-weight:700;color:var(--t3)">'+k.lbl+'</span>' +
      '</div>' +
      '<div style="font-size:18px;font-weight:900;color:'+k.c+'" id="'+k.id+'">—</div>' +
      '<div style="font-size:10px;color:var(--t3);margin-top:4px" id="'+k.id+'-diff">전주 대비 —</div>' +
      '</div>';
  }).join('');
  wrap.appendChild(kpi);

  // ── 차트 영역 ──
  var chartCard = document.createElement('div');
  chartCard.className = 'card';
  chartCard.style.cssText = 'padding:20px;border-radius:18px;margin-bottom:14px';
  chartCard.innerHTML =
    '<div style="font-size:13px;font-weight:800;color:var(--t3);margin-bottom:16px">일별 정산 추이</div>' +
    '<canvas id="sr-chart" height="160"></canvas>' +
    '<div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">' +
    ['카드 매출:#0891b2','현금 매출:#059669','순수익:#7c3aed'].map(function(item){
      var parts = item.split(':');
      return '<div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:10px;border-radius:50%;background:'+parts[1]+'"></div><span style="font-size:11px;color:var(--t3)">'+parts[0]+'</span></div>';
    }).join('') +
    '</div>';
  wrap.appendChild(chartCard);

  // ── 하단 2열 (일별 상세 + 정산 요약) ──
  var bottom = document.createElement('div');
  bottom.style.cssText = 'display:grid;grid-template-columns:3fr 2fr;gap:12px;margin-bottom:14px';

  // 일별 상세
  var detailCard = document.createElement('div');
  detailCard.className = 'card';
  detailCard.style.cssText = 'padding:20px;border-radius:18px';
  detailCard.innerHTML =
    '<div style="font-size:13px;font-weight:800;color:var(--t3);margin-bottom:12px">일별 상세 정산</div>' +
    '<div style="overflow-x:auto">' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
    '<thead><tr style="border-bottom:2px solid var(--bd)">' +
    ['날짜','카드','현금','수수료','순수익'].map(function(h){
      return '<th style="padding:8px 6px;text-align:left;font-weight:700;color:var(--t3)">'+h+'</th>';
    }).join('') +
    '</tr></thead>' +
    '<tbody id="sr-table-body"><tr><td colspan="5" style="padding:20px;text-align:center;color:var(--t3)">로딩 중...</td></tr></tbody>' +
    '</table></div>';
  bottom.appendChild(detailCard);

  // 정산 요약
  var summaryCard = document.createElement('div');
  summaryCard.className = 'card';
  summaryCard.style.cssText = 'padding:20px;border-radius:18px';
  summaryCard.innerHTML =
    '<div style="font-size:13px;font-weight:800;color:var(--t3);margin-bottom:16px">정산 요약</div>' +
    '<div id="sr-summary" style="display:flex;flex-direction:column;gap:12px">' +
    '<div style="text-align:center;color:var(--t3);font-size:12px">로딩 중...</div>' +
    '</div>' +
    '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--bd);font-size:10px;color:var(--t3)">* 수수료는 카드 매출의 3.5%로 자동 계산됩니다</div>';
  bottom.appendChild(summaryCard);

  wrap.appendChild(bottom);
  el.appendChild(wrap);

  // 데이터 로딩
  _filoSalesReportLoad(did, dateFrom, dateTo);
}

// 정산 리포트 데이터 로딩
function _filoSalesReportLoad(did, dateFrom, dateTo) {
  _db.collection('filo_sales')
    .where('dealerId','==',did)
    .where('date','>=',dateFrom)
    .where('date','<=',dateTo)
    .get()
    .then(function(snap){
      // 날짜별 집계
      var byDate = {};
      snap.forEach(function(doc){
        var d = doc.data();
        var dt = d.date||'';
        if(!byDate[dt]) byDate[dt]={card:0,cash:0,total:0};
        if(d.payType==='card'||d.payType==='카드'){
          byDate[dt].card += (d.total||0);
        } else {
          byDate[dt].cash += (d.total||0);
        }
        byDate[dt].total += (d.total||0);
      });

      // 날짜 정렬
      var dates = Object.keys(byDate).sort();
      var totalCard=0,totalCash=0,totalFee=0,totalNet=0;

      dates.forEach(function(dt){
        var d = byDate[dt];
        var fee = Math.round(d.card*0.035);
        d.fee = fee;
        d.net = d.total - fee;
        totalCard += d.card;
        totalCash += d.cash;
        totalFee  += fee;
        totalNet  += d.net;
      });

      // KPI 업데이트
      var fmt = function(n){ return '₩'+Math.round(n).toLocaleString(); };
      var el1=document.getElementById('sr-card');
      var el2=document.getElementById('sr-cash');
      var el3=document.getElementById('sr-fee');
      var el4=document.getElementById('sr-net');
      if(el1) el1.textContent=fmt(totalCard);
      if(el2) el2.textContent=fmt(totalCash);
      if(el3) el3.textContent=fmt(totalFee);
      if(el4) el4.textContent=fmt(totalNet);

      // 테이블
      var tbody = document.getElementById('sr-table-body');
      if(tbody){
        if(!dates.length){
          tbody.innerHTML='<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--t3)">데이터 없음</td></tr>';
        } else {
          tbody.innerHTML = dates.reverse().map(function(dt){
            var d=byDate[dt];
            var dayNames=['일','월','화','수','목','금','토'];
            var day=new Date(dt); var dayName=dayNames[day.getDay()];
            return '<tr style="border-bottom:1px solid var(--bd)">' +
              '<td style="padding:8px 6px;color:var(--t3)">'+dt.slice(5)+'('+dayName+')</td>' +
              '<td style="padding:8px 6px;font-weight:600">'+fmt(d.card)+'</td>' +
              '<td style="padding:8px 6px;font-weight:600">'+fmt(d.cash)+'</td>' +
              '<td style="padding:8px 6px;color:#ef4444">'+fmt(d.fee)+'</td>' +
              '<td style="padding:8px 6px;font-weight:800;color:#7c3aed">'+fmt(d.net)+'</td>' +
              '</tr>';
          }).join('');
        }
      }

      // 요약
      var summary = document.getElementById('sr-summary');
      if(summary){
        summary.innerHTML = [
          {l:'총 매출',   v:fmt(totalCard+totalCash), c:'var(--tx)'},
          {l:'카드 매출', v:fmt(totalCard),            c:'#0891b2'},
          {l:'현금 매출', v:fmt(totalCash),            c:'#059669'},
          {l:'총 수수료', v:fmt(totalFee),             c:'#ef4444'},
          {l:'총 순수익', v:fmt(totalNet),             c:'#7c3aed'},
        ].map(function(row){
          return '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span style="font-size:13px;color:var(--t3)">'+row.l+'</span>' +
            '<span style="font-size:15px;font-weight:800;color:'+row.c+'">'+row.v+'</span>' +
            '</div>';
        }).join('');
      }

      // 차트 (Chart.js)
      _filoEnsureChartJS(function(){
        var canvas = document.getElementById('sr-chart');
        if(!canvas) return;
        if(window._srChart) window._srChart.destroy();
        var sortedDates = Object.keys(byDate).sort();
        window._srChart = new Chart(canvas, {
          type: 'line',
          data: {
            labels: sortedDates.map(function(d){ return d.slice(5); }),
            datasets: [
              {label:'카드 매출', data:sortedDates.map(function(d){return byDate[d].card;}), borderColor:'#0891b2', backgroundColor:'rgba(8,145,178,.1)', tension:.4, fill:true, borderWidth:2, pointRadius:4},
              {label:'현금 매출', data:sortedDates.map(function(d){return byDate[d].cash;}), borderColor:'#059669', backgroundColor:'rgba(5,150,105,.08)', tension:.4, fill:true, borderWidth:2, pointRadius:4},
              {label:'순수익',   data:sortedDates.map(function(d){return byDate[d].net;}),  borderColor:'#7c3aed', backgroundColor:'rgba(124,58,237,.08)', tension:.4, fill:false, borderWidth:2, borderDash:[4,4], pointRadius:4},
            ]
          },
          options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{legend:{display:false}},
            scales:{
              x:{grid:{display:false},ticks:{font:{size:11}}},
              y:{grid:{color:'rgba(0,0,0,.05)'},ticks:{font:{size:11},callback:function(v){return '₩'+(v/10000).toFixed(0)+'만';}}}
            }
          }
        });
      });
    }).catch(function(e){ console.error(e); });
}

// 기간 버튼 전환
function _filoSalesReportPeriod(idx, did) {
  document.querySelectorAll('.sr-period-btn').forEach(function(b,i){
    b.style.background = i===idx ? 'var(--br)' : 'transparent';
    b.style.color = i===idx ? '#fff' : 'var(--t3)';
  });
  var now = new Date();
  var from, to;
  if(idx===0){ // 이번주
    var dow = now.getDay();
    var mon = new Date(now); mon.setDate(now.getDate()-(dow===0?6:dow-1));
    var sun = new Date(mon); sun.setDate(mon.getDate()+6);
    from = mon.toISOString().slice(0,10);
    to   = sun.toISOString().slice(0,10);
  } else if(idx===1){ // 이번달
    from = now.toISOString().slice(0,7)+'-01';
    to   = now.toISOString().slice(0,10);
  } else { // 지난달
    var last = new Date(now.getFullYear(), now.getMonth(), 0);
    var first = new Date(now.getFullYear(), now.getMonth()-1, 1);
    from = first.toISOString().slice(0,10);
    to   = last.toISOString().slice(0,10);
  }
  var lbl = document.getElementById('sr-period-label');
  if(lbl) lbl.textContent = '일별 정산 · '+from+' ~ '+to;
  _filoSalesReportLoad(did, from, to);
}

// 내보내기 (간단 CSV)
function _filoSalesReportExport() {
  _filoToast('준비 중입니다!');
}
