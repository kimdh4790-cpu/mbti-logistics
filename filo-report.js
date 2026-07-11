// filo-report.js - 매출분석, 차트, 리포트
// 의존성: filo-common.js, Chart.js
// 관련 컬렉션: filo_sales

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
 var today=new Date().toISOString().slice(0,10);
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
    createdAt:new Date().toISOString(),status:'pending'
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

function _filoGenerateAIInsight(did){
 var el=document.getElementById('ai-insight-content');if(!el)return;
 var today=new Date().toISOString().slice(0,10);
 var from=today.slice(0,7)+'-01';
 Promise.all([
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',from).where('date','<=',today).get(),
  _db.collection('filo_menus').where('dealerId','==',did).get()
 ]).then(function(results){
  var salesSnap=results[0],menuSnap=results[1];
  var total=0,cnt=0,items={},hours={};
  salesSnap.forEach(function(doc){
   var d=doc.data();if(d.status==='cancelled')return;
   total+=d.total||0;cnt++;
   var h=new Date(d.createdAt||d.date+'T12:00:00').getHours();
   hours[h]=(hours[h]||0)+(d.total||0);
   (d.items||[]).forEach(function(it){items[it.name]=(items[it.name]||0)+(it.qty||1);});
  });
  var peakH=Object.entries(hours).sort(function(a,b){return b[1]-a[1];})[0];
  var topItem=Object.entries(items).sort(function(a,b){return b[1]-a[1];})[0];
  var avgOrder=cnt?Math.round(total/cnt):0;
  var insights=[
   peakH?'⏰ <strong>'+peakH[0]+'시</strong>가 가장 바쁜 시간대입니다. 이 시간 직원 배치를 늘려보세요.':'',
   topItem?'🏆 이번달 최고 인기 메뉴는 <strong>'+topItem[0]+'</strong> ('+topItem[1]+'개)입니다.':'',
   avgOrder?'💰 평균 객단가는 <strong>₩'+avgOrder.toLocaleString()+'</strong>입니다. '+
    (avgOrder<5000?'사이드 메뉴 추천으로 객단가를 올려보세요.':'객단가가 양호합니다.'):'',
   cnt?'📊 이번달 총 <strong>'+cnt+'건</strong> 주문 · 총 매출 <strong>₩'+total.toLocaleString()+'</strong>':'',
  ].filter(Boolean);
  el.innerHTML='<div style="display:flex;flex-direction:column;gap:10px">'+
   insights.map(function(ins){
    return '<div style="padding:12px 14px;background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.15);border-radius:12px;font-size:13px;line-height:1.7;color:var(--t2)">'+ins+'</div>';
   }).join('')+
   '<div style="font-size:10px;color:var(--t3);margin-top:4px">* AI 분석은 이번달 데이터 기준입니다</div>'+
   '</div>';
 });
}

/* ── 탭 전환 ── */
var _mgTabIdx=0;
function _filoMgTab(idx){
 _mgTabIdx=idx;
 [0,1,2].forEach(function(i){
  var b=document.getElementById('mgt-'+i);
  if(b){b.style.background=i===idx?'var(--br)':'var(--b3)';b.style.color=i===idx?'#fff':'var(--t2)';}
 });
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 var ymEl=document.getElementById('mg-ym');
 var ym=ymEl?ymEl.value:new Date().toISOString().slice(0,7);
 if(idx===0)_filoRenderMarginAnalysis(did,ym);
 else if(idx===1)_filoRenderCostMgmt(did);
 else _filoRenderInsights(did,ym);
}

/* ── 데이터 로드 ── */
/* ── 실시간 마진 리스너 ── */
var _marginUnsub=null,_marginCostMap={},_marginDid='';

function _filoMarginLoad(){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did)return;
 _marginDid=did;
 var ymEl=document.getElementById('mg-ym');
 var ym=ymEl?ymEl.value:new Date().toISOString().slice(0,7);

 /* 원가 맵 먼저 로드 후 실시간 리스너 시작 */
 _db.collection('menu_costs').where('dealerId','==',did).get().then(function(snap){
  _marginCostMap={};
  snap.forEach(function(doc){var d=doc.data();_marginCostMap[d.name||doc.id]=d;});
  _filoStartMarginLive(did,ym);
 });
}

function _filoStartMarginLive(did,ym){
 /* 기존 리스너 해제 */
 if(_marginUnsub){_marginUnsub();_marginUnsub=null;}
 var start=ym+'-01',end=ym+'-31';
 var today=new Date().toISOString().slice(0,10);

 /* filo_sales(POS) 실시간 onSnapshot */
 _marginUnsub=_db.collection('filo_sales')
  .where('dealerId','==',did)
  .where('date','>=',start)
  .where('date','<=',end)
  .onSnapshot(function(posSnap){
   /* 수동 매출도 같이 조회 */
   _db.collection('mbetco_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get()
   .then(function(manSnap){
    _filoCalcAndRender(posSnap,manSnap,today,ym,did);
   });
  },function(e){console.error('margin listener:',e);});
}

function _filoCalcAndRender(posSnap,manSnap,today,ym,did){
 var todayRev=0,todayCost=0,todayCnt=0;
 var monthRev=0,monthCost=0;

 /* 수동 매출 */
 manSnap.forEach(function(doc){
  var d=doc.data();
  monthRev+=(d.revenue||0);
  monthCost+=(d.cost||0);
  if(d.date===today)todayRev+=(d.revenue||0);
 });

 /* POS 실시간 매출 + 원가 + 메뉴통계 + 시간대 */
 var menuStats={};  /* 메뉴별 {qty,rev} */
 var hourStats={};  /* 시간대별 매출 */
 var payStats={};  /* 결제수단별 매출 */
 posSnap.forEach(function(doc){
  var d=doc.data();
  var posTotal=d.total||0;
  var pm=d.payMethod||d.method||'기타';
  payStats[pm]=(payStats[pm]||0)+posTotal;
  var posCost=0;
  (d.items||[]).forEach(function(it){
   var c=_marginCostMap[it.name]||{};
   posCost+=((c.cost||0)*(it.qty||1));
   /* 메뉴별 통계 */
   if(!menuStats[it.name])menuStats[it.name]={qty:0,rev:0};
   menuStats[it.name].qty+=(it.qty||1);
   menuStats[it.name].rev+=(it.price||0)*(it.qty||1);
  });
  monthRev+=posTotal;
  monthCost+=posCost;
  if(d.date===today){
   todayRev+=posTotal;
   todayCost+=posCost;
   todayCnt++;
   /* 시간대별 집계 */
   if(d.createdAt){
    var kstH=new Date(new Date(d.createdAt).getTime()+9*3600000).getUTCHours();
    hourStats[kstH]=(hourStats[kstH]||0)+posTotal;
   }
  }
 });

 var todayProfit=todayRev-todayCost;
 var todayMargin=todayRev>0?Math.round(todayProfit/todayRev*100):0;
 var monthProfit=monthRev-monthCost;
 var monthMargin=monthRev>0?Math.round(monthProfit/monthRev*100):0;

 /* ── KPI 카드 실시간 업데이트 ── */
 function setKpi(id,val,color){
  var el=document.getElementById(id);
  if(!el)return;
  if(el.textContent!==val){
   el.textContent=val;
   el.classList.remove('count-anim');
   void el.offsetWidth;
   el.classList.add('count-anim');
   if(color)el.style.color=color;
  }
 }
 setKpi('kpi-revenue','₩'+monthRev.toLocaleString());
 setKpi('kpi-cost','₩'+monthCost.toLocaleString());
 setKpi('kpi-profit','₩'+monthProfit.toLocaleString(),monthProfit>=0?'#22c55e':'#ef4444');
 setKpi('kpi-margin',monthMargin+'%');

 /* ── 오늘 실시간 섹션 ── */
  var liveEl=document.getElementById('margin-live');
 if(liveEl){
  var pulse='<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;margin-right:5px;animation:pulse 2s infinite"></span>';
  var avgOrder=todayCnt>0?Math.round(todayRev/todayCnt):0;

  var kpiCards='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">'+
  [{label:'오늘 매출',val:'₩'+todayRev.toLocaleString(),color:'#a78bfa',sub:todayCnt+'건'},
   {label:'오늘 원가',val:'₩'+todayCost.toLocaleString(),color:'#f97316',sub:'식재료'},
   {label:'오늘 순이익',val:'₩'+todayProfit.toLocaleString(),color:todayProfit>=0?'#22c55e':'#ef4444',sub:todayMargin+'%'},
   {label:'평균 객단가',val:'₩'+avgOrder.toLocaleString(),color:'#f59e0b',sub:'건당 평균'}
  ].map(function(s){
   return '<div class="kpi-card card-hover" style="text-align:center;padding:14px 10px">'+
   '<div class="kpi-label">'+s.label+'</div>'+
   '<div class="kpi-val count-anim" style="color:'+s.color+';font-size:20px">'+s.val+'</div>'+
   '<div style="font-size:10px;color:var(--t3);margin-top:3px">'+s.sub+'</div></div>';
  }).join('')+'</div>';

  /* 인기 메뉴 TOP5 */
  var menuEntries=Object.entries(menuStats).sort(function(a,b){return b[1].qty-a[1].qty;}).slice(0,5);
  /* 결제수단별 카드 */
  var payIcons={'카드':'💳','현금':'💵','카카오페이':'🟡','네이버페이':'🟢','카운터결제':'🏪','삼성페이':'📱','기타':'💰'};
  var paySorted=Object.entries(payStats).sort(function(a,b){return b[1]-a[1];});
  var payHtml=paySorted.length?
  '<div style="margin-top:14px"><div class="sec-title">💳 결제수단별 매출</div>'+
  paySorted.map(function(m){
   var pct=totalRev>0?Math.round(m[1]/totalRev*100):0;
   var ic=payIcons[m[0]]||'💰';
   return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)">'+
    '<span style="font-size:16px">'+ic+'</span>'+
    '<div style="flex:1">'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:3px">'+
    '<span style="font-size:13px;font-weight:700">'+m[0]+'</span>'+
    '<span style="font-size:13px;font-weight:900;color:#22c55e">₩'+m[1].toLocaleString()+'</span>'+
    '</div>'+
    '<div style="height:4px;background:var(--surface3);border-radius:2px">'+
    '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#7c3aed,#22c55e);border-radius:2px"></div>'+
    '</div>'+
    '<span style="font-size:10px;color:var(--t3)">'+pct+'% 비중</span>'+
    '</div></div>';
  }).join('')+'</div>'
  :'<div style="padding:16px;text-align:center;color:var(--t3);font-size:12px">결제 데이터 없음</div>';

  var topMenu=menuEntries.length?
  '<div style="margin-top:14px">'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
  '<div><div class="sec-title" style="margin-bottom:10px">🏆 인기 메뉴 TOP5</div>'+
  menuEntries.map(function(kv,i){
   var rank=['🥇','🥈','🥉','4️⃣','5️⃣'][i];
   var pct=totalRev>0?Math.round(kv[1].rev/totalRev*100):0;
   return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)">'+
    '<span style="font-size:15px">'+rank+'</span>'+
    '<div style="flex:1">'+
    '<div style="display:flex;justify-content:space-between">'+
    '<span style="font-size:12px;font-weight:700">'+kv[0]+'</span>'+
    '<span style="font-size:12px;font-weight:900;color:#22c55e">'+kv[1].qty+'개</span>'+
    '</div>'+
    '<div style="height:3px;background:var(--surface3);border-radius:2px;margin-top:4px">'+
    '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#7c3aed,#22c55e);border-radius:2px"></div>'+
    '</div></div></div>';
  }).join('')+
  '</div>'+
  '<div><div class="sec-title" style="margin-bottom:10px">💳 결제수단 비중</div>'+
  '<div style="position:relative;height:130px"><canvas id="pay-donut-canvas"></canvas></div>'+
  '</div>'+
  '</div>'+
  '</div>'
  :'';

  /* 시간대별 차트 */
  var hourEntries=Object.keys(hourStats).map(Number).sort(function(a,b){return a-b;});
  var maxHour=hourEntries.length?Math.max.apply(null,hourEntries.map(function(h){return hourStats[h];})):1;
  var hourChart=hourEntries.length?
  '<div style="margin-top:14px"><div class="sec-title" style="margin-bottom:10px">⏰ 시간대별 매출</div>'+
  '<div style="position:relative;height:160px"><canvas id="hour-chart-canvas"></canvas></div>'+
  '</div>'
  :'';

  var isPeakHour=hourEntries.length?hourEntries.reduce(function(m,h){return hourStats[h]>hourStats[m]?h:m;},hourEntries[0]):null;

  /* 실시간 연동 상태 */
  var statusBar=todayCnt>0?
  '<div style="margin-top:12px;padding:9px 14px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:10px;display:flex;justify-content:space-between;align-items:center">'+
  '<span style="font-size:11px;font-weight:600;color:#22c55e">'+pulse+'실시간 연동 중</span>'+
  '<span style="font-size:10px;color:var(--t3)">오늘 '+todayCnt+'건 · 평균 ₩'+avgOrder.toLocaleString()+'</span>'+
  '</div>':'';

  liveEl.innerHTML=kpiCards+topMenu+hourChart+statusBar;

  /* Chart.js 차트 렌더링 */
  setTimeout(function(){
   /* 시간대별 막대차트 */
   var hCanvas=document.getElementById('hour-chart-canvas');
   if(hCanvas&&window.Chart){
    var hLabels=hourEntries.map(function(h){return h[0]+'시';});
    var hData=hourEntries.map(function(h){return h[1];});
    if(hCanvas._chart)hCanvas._chart.destroy();
    hCanvas._chart=new Chart(hCanvas,{
     type:'bar',
     data:{labels:hLabels,datasets:[{label:'매출',data:hData,
      backgroundColor:'rgba(124,58,237,.6)',borderColor:'rgba(124,58,237,1)',
      borderWidth:1,borderRadius:4}]},
     options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#9898c0',font:{size:10}}},
       y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#9898c0',font:{size:10},
        callback:function(v){return '₩'+(v/1000).toFixed(0)+'k';}}}}}
    });
   }
   /* 결제수단 도넛차트 */
   var pCanvas=document.getElementById('pay-donut-canvas');
   if(pCanvas&&window.Chart&&paySorted&&paySorted.length){
    var pColors=['#7c3aed','#22c55e','#f59e0b','#38bdf8','#ef4444','#a855f7'];
    if(pCanvas._chart)pCanvas._chart.destroy();
    pCanvas._chart=new Chart(pCanvas,{
     type:'doughnut',
     data:{labels:paySorted.map(function(p){return p[0];}),
      datasets:[{data:paySorted.map(function(p){return p[1];}),
       backgroundColor:pColors,borderWidth:0,hoverOffset:4}]},
     options:{responsive:true,maintainAspectRatio:false,cutout:'65%',
      plugins:{legend:{position:'bottom',labels:{color:'#9898c0',font:{size:10},boxWidth:10,padding:8}},
       tooltip:{callbacks:{label:function(ctx){return ctx.label+': ₩'+ctx.raw.toLocaleString();}}}}}
    });
   }
  },100);
 }


 /* 히어로 서브 */
 var heroSub=document.getElementById('hero-sub');
 if(heroSub)heroSub.textContent=ym+'월 기준 · 오늘 '+todayCnt+'건 · 마진율 '+todayMargin+'%';

 /* 7일 바 차트 */
 _filoRenderHeroChart(did);

 /* 분석 탭이면 리렌더 */
 if(_mgTabIdx===0)_filoRenderMarginAnalysis(did,ym);
}

/* ── 7일 바 차트 ── */
function _filoRenderMarginAnalysis(did,ym){
 var content=document.getElementById('mg-content');
 if(!content)return;
 content.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)"><div style="font-size:28px;margin-bottom:8px">⏳</div>분석 중...</div>';
 var start=ym+'-01',end=ym+'-31';
 Promise.all([
  _db.collection('mbetco_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get(),
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get(),
  _db.collection('menu_costs').where('dealerId','==',did).get()
 ]).then(function(res){
  var manSnap=res[0],posSnap=res[1],costSnap=res[2];
  var costMap={};
  costSnap.forEach(function(doc){var d=doc.data();costMap[d.name||doc.id]=d;});

  /* 날짜별 집계 */
  var dayMap={};
  manSnap.forEach(function(doc){
   var d=doc.data();
   if(!dayMap[d.date])dayMap[d.date]={rev:0,cost:0,items:{}};
   dayMap[d.date].rev+=(d.revenue||0);
   dayMap[d.date].cost+=(d.cost||0);
   (d.menuItems||[]).forEach(function(it){
    if(!dayMap[d.date].items[it.name])dayMap[d.date].items[it.name]=0;
    dayMap[d.date].items[it.name]+=it.qty;
   });
  });
  posSnap.forEach(function(doc){
   var d=doc.data();
   if(!dayMap[d.date])dayMap[d.date]={rev:0,cost:0,items:{}};
   dayMap[d.date].rev+=(d.total||0);
   (d.items||[]).forEach(function(it){
    var c=costMap[it.name]||{};
    dayMap[d.date].cost+=((c.cost||0)*it.qty);
    if(!dayMap[d.date].items[it.name])dayMap[d.date].items[it.name]=0;
    dayMap[d.date].items[it.name]+=it.qty;
   });
  });

  /* 메뉴별 마진 집계 */
  var menuMap={};
  Object.values(dayMap).forEach(function(day){
   Object.keys(day.items).forEach(function(name){
    var c=costMap[name]||{};
    var qty=day.items[name];
    var price=c.price||0,cost=c.cost||0;
    if(!menuMap[name])menuMap[name]={name:name,qty:0,rev:0,cost:0,price:price,costPer:cost};
    menuMap[name].qty+=qty;
    menuMap[name].rev+=price*qty;
    menuMap[name].cost+=cost*qty;
   });
  });

  var days=Object.keys(dayMap).sort();
  var totalRev=days.reduce(function(s,d){return s+dayMap[d].rev;},0);
  var totalCost=days.reduce(function(s,d){return s+dayMap[d].cost;},0);
  var totalProfit=totalRev-totalCost;
  var marginRate=totalRev>0?Math.round(totalProfit/totalRev*100):0;

  var html='';

  /* 월별 일별 차트 */
  html+='<div class="card" style="margin-bottom:12px">'+
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'+
  '<div style="font-size:13px;font-weight:800">📅 일별 매출 vs 순이익</div>'+
  '<div style="font-size:11px;color:var(--t3)">'+ym+'</div></div>'+
  '<div style="display:flex;align-items:flex-end;gap:3px;height:100px;overflow-x:auto">';
  if(days.length){
   var maxRev=Math.max.apply(null,days.map(function(d){return dayMap[d].rev;}))||1;
   html+=days.map(function(d){
    var rv=dayMap[d].rev,pr=Math.max(dayMap[d].rev-dayMap[d].cost,0);
    var rvH=Math.round(rv/maxRev*100),prH=Math.round(pr/maxRev*100);
    var dt=d.slice(8);
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:24px">'+
    '<div style="width:100%;position:relative;height:84px;display:flex;align-items:flex-end;gap:1px">'+
    '<div style="flex:1;height:'+rvH+'%;background:rgba(167,139,250,.3);border-radius:3px 3px 0 0;min-height:2px" title="매출 ₩'+rv.toLocaleString()+'"></div>'+
    '<div style="flex:1;height:'+prH+'%;background:linear-gradient(180deg,#22c55e,#10b981);border-radius:3px 3px 0 0;min-height:2px" title="순이익 ₩'+pr.toLocaleString()+'"></div>'+
    '</div>'+
    '<div style="font-size:9px;color:var(--t3)">'+dt+'</div></div>';
   }).join('');
  }else{html+='<div style="color:var(--t3);font-size:12px;padding:20px">매출 데이터 없음</div>';}
  html+='</div>'+
  '<div style="display:flex;gap:12px;margin-top:10px">'+
  '<div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:10px;border-radius:2px;background:rgba(167,139,250,.4)"></div><span style="font-size:10px;color:var(--t3)">매출</span></div>'+
  '<div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:10px;border-radius:2px;background:#22c55e"></div><span style="font-size:10px;color:var(--t3)">순이익</span></div>'+
  '</div></div>';

  /* 메뉴별 마진 테이블 */
  var menus=Object.values(menuMap).sort(function(a,b){
   var mA=a.rev>0?(a.rev-a.cost)/a.rev:0,mB=b.rev>0?(b.rev-b.cost)/b.rev:0;
   return mB-mA;
  });
  if(menus.length){
   html+='<div class="card" style="margin-bottom:12px">'+
   '<div style="font-size:13px;font-weight:800;margin-bottom:12px">🍽 메뉴별 마진 분석</div>'+
   '<div style="display:grid;grid-template-columns:1fr 60px 70px 60px;gap:6px;padding:0 4px 8px;border-bottom:1px solid var(--bd)">'+
   ['메뉴','판매수','순이익','마진율'].map(function(h){return '<div style="font-size:10px;color:var(--t3);font-weight:700">'+h+'</div>';}).join('')+'</div>'+
   menus.map(function(m){
    var profit=m.rev-m.cost;
    var rate=m.rev>0?Math.round(profit/m.rev*100):0;
    var badge=rate>=60?'high':rate>=40?'mid':'low';
    return '<div class="menu-cost-row">'+
    '<div style="font-size:12px;font-weight:700">'+esc(m.name)+'<div style="font-size:10px;color:var(--t3)">판매가 ₩'+m.price.toLocaleString()+' · 원가 ₩'+m.costPer.toLocaleString()+'</div></div>'+
    '<div style="font-size:12px;font-weight:800;text-align:right">'+m.qty+'개</div>'+
    '<div style="font-size:12px;font-weight:800;color:'+(profit>=0?'#22c55e':'#ef4444')+';text-align:right">₩'+profit.toLocaleString()+'</div>'+
    '<div style="text-align:right"><span class="margin-badge '+badge+'">'+rate+'%</span></div>'+
    '</div>';
   }).join('')+'</div>';
  }

  /* 인건비 vs 매출 비율 */
  html+='<div class="card">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:12px">📊 원가 구조 분석</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center">'+
  [
   {label:'식재료 원가',val:'₩'+totalCost.toLocaleString(),sub:totalRev>0?Math.round(totalCost/totalRev*100)+'%':'—',c:'#f97316'},
   {label:'순이익',val:'₩'+Math.max(totalProfit,0).toLocaleString(),sub:marginRate+'%',c:'#22c55e'},
   {label:'손익분기',val:totalRev>0&&totalProfit<0?'미달':'달성',sub:totalProfit>=0?'✅':'⚠️',c:totalProfit>=0?'#22c55e':'#ef4444'}
  ].map(function(s){
   return '<div style="background:var(--b3);border-radius:12px;padding:14px 10px">'+
   '<div style="font-size:10px;color:var(--t3);margin-bottom:6px">'+s.label+'</div>'+
   '<div style="font-size:16px;font-weight:900;color:'+s.c+'">'+s.val+'</div>'+
   '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+s.sub+'</div></div>';
  }).join('')+
  '</div></div>';

  content.innerHTML=html;
 }).catch(function(e){
  var c=document.getElementById('mg-content');
  if(c)c.innerHTML='<div style="color:var(--red);padding:20px">'+e.message+'</div>';
 });
}

/* ── 원가 등록 탭 ── */
function _filoRenderInsights(did,ym){
 var content=document.getElementById('mg-content');
 if(!content)return;
 var start=ym+'-01',end=ym+'-31';
 Promise.all([
  _db.collection('mbetco_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get(),
  _db.collection('filo_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get(),
  _db.collection('menu_costs').where('dealerId','==',did).get()
 ]).then(function(res){
  var rev=0,cost=0,posRev=0;
  res[0].forEach(function(d){rev+=d.data().revenue||0;cost+=d.data().cost||0;});
  res[1].forEach(function(d){posRev+=d.data().total||0;});
  var costMap={};res[2].forEach(function(doc){var d=doc.data();costMap[d.name]=d;});
  var margin=rev>0?Math.round((rev-cost)/rev*100):0;
  var insights=[];
  if(margin<40)insights.push({icon:'🚨',title:'마진율 위험',desc:'현재 마진율 '+margin+'%는 일반적인 카페 권장 마진율(60% 이상)보다 낮습니다. 원가가 높은 메뉴를 점검하세요.',color:'rgba(239,68,68,.1)',border:'rgba(239,68,68,.3)'});
  else if(margin>=60)insights.push({icon:'✅',title:'마진율 우수',desc:'마진율 '+margin+'%로 양호한 수준입니다. 이 수익 구조를 유지하면서 매출 확대에 집중하세요.',color:'rgba(34,197,94,.08)',border:'rgba(34,197,94,.25)'});
  if(posRev>0&&rev===0)insights.push({icon:'💡',title:'매출 수동 입력 필요',desc:'POS 매출(₩'+posRev.toLocaleString()+')은 있지만 수동 매출 입력이 없습니다. 매출 입력 탭에서 정확한 데이터를 입력하면 마진 분석이 더 정확해집니다.',color:'rgba(245,158,11,.08)',border:'rgba(245,158,11,.25)'});
  if(Object.keys(costMap).length===0)insights.push({icon:'⚙️',title:'원가 등록 필요',desc:'메뉴 원가가 등록되지 않아 정확한 마진 계산이 불가능합니다. 원가 등록 탭에서 메뉴별 원가를 입력해 주세요.',color:'rgba(124,58,237,.08)',border:'rgba(124,58,237,.25)'});
  if(!insights.length)insights.push({icon:'🎯',title:'데이터 분석 완료',desc:'모든 지표가 정상 범위입니다. 매일 매출을 입력하면 더 정확한 인사이트를 제공합니다.',color:'rgba(34,197,94,.08)',border:'rgba(34,197,94,.25)'});
  content.innerHTML='<div style="max-width:700px">'+
  insights.map(function(ins){
   return '<div class="insight-card" style="background:'+ins.color+';border-color:'+ins.border+'">'+
   '<div class="insight-icon">'+ins.icon+'</div>'+
   '<div><div style="font-size:13px;font-weight:800;margin-bottom:4px">'+ins.title+'</div>'+
   '<div style="font-size:12px;color:var(--t2);line-height:1.6">'+ins.desc+'</div></div></div>';
  }).join('')+'</div>';
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

