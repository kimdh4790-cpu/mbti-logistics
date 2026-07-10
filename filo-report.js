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
