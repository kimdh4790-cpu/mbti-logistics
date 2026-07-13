// filo-margin.js — 마진분석, AI인사이트, 대시보드
// filo-common.js에서 분리됨 (리팩토링 2026-07-13)

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
