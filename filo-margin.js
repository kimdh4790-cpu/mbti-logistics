/**
 * @module      filo-margin.js
 * ══════════════════════════════════════════════════════
 * 역할: 마진 분석 · AI 인사이트 · 실시간 대시보드
 *
 * 저장 컬렉션:
 *   filo_sales     — 매출 집계 소스
 *   filo_inventory — 원가 데이터
 * 의존: filo-common.js
 * [경고] 2026-07-15: filo-report.js와 중복 정리 완료 (이 파일이 원본)
 * ══════════════════════════════════════════════════════
 */
// filo-common.js에서 분리됨 (리팩토링 2026-07-13)

function _filoGenerateAIInsight(did){
 var el=document.getElementById('ai-insight-content');if(!el)return;
 var today=_today();
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
   peakH?'<strong>'+peakH[0]+'시</strong>가 가장 바쁜 시간대입니다. 이 시간 직원 배치를 늘려보세요.':'',
   topItem?'이번달 최고 인기 메뉴는 <strong>'+topItem[0]+'</strong> ('+topItem[1]+'개)입니다.':'',
   avgOrder?' 평균 객단가는 <strong>₩'+avgOrder.toLocaleString()+'</strong>입니다. '+
    (avgOrder<5000?'사이드 메뉴 추천으로 객단가를 올려보세요.':'객단가가 양호합니다.'):'',
   cnt?'이번달 총 <strong>'+cnt+'건</strong> 주문 · 총 매출 <strong>₩'+total.toLocaleString()+'</strong>':'',
  ].filter(Boolean);
  el.innerHTML='<div style="display:flex;flex-direction:column;gap:10px">'+
   insights.map(function(ins){
    return '<div style="padding:12px 14px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:12px;font-size:13px;line-height:1.7;color:var(--t2)">'+ins+'</div>';
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
 var ym=ymEl?ymEl.value:_monthStr();
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
 var ym=ymEl?ymEl.value:_monthStr();

 /* 원가 맵 + 레시피 기반 원가 병렬 로드 후 리스너 시작 */
 Promise.all([
  _db.collection('menu_costs').where('dealerId','==',did).get(),
  _db.collection('menu_recipes').where('dealerId','==',did).get(),
  _db.collection('inventory').where('dealerId','==',did).get()
 ]).then(function(results){
  var costSnap=results[0],recipeSnap=results[1],invSnap=results[2];
  _marginCostMap={};
  costSnap.forEach(function(doc){var d=doc.data();_marginCostMap[d.name||doc.id]=d;});
  /* 재고 단가 맵 */
  var invPriceMap={};
  invSnap.forEach(function(doc){var d=doc.data();if(d.unitPrice)invPriceMap[doc.id]=d.unitPrice;});
  /* 레시피에서 원가 자동 계산 (menu_costs 없는 메뉴 한정) */
  recipeSnap.forEach(function(doc){
   var d=doc.data();
   var mname=d.menuName||'';
   if(!mname||_marginCostMap[mname])return; // 수동 원가 있으면 스킵
   var autoCost=0;
   (d.ingredients||[]).forEach(function(ing){
    autoCost+=(Number(ing.qty||0))*(invPriceMap[ing.invId]||0);
   });
   if(autoCost>0)_marginCostMap[mname]={name:mname,cost:autoCost,price:0,_auto:true};
  });
  _filoStartMarginLive(did,ym);
 }).catch(function(){
  _db.collection('menu_costs').where('dealerId','==',did).get().then(function(snap){
   _marginCostMap={};
   snap.forEach(function(doc){var d=doc.data();_marginCostMap[d.name||doc.id]=d;});
   _filoStartMarginLive(did,ym);
  });
 });
}

function _filoStartMarginLive(did,ym){
 if(_marginUnsub){_marginUnsub();_marginUnsub=null;}
 var start=ym+'-01',end=ym+'-31';
 var today=_today();

 /* mbetco_sales 1회 로드 — filo_sales 변경마다 재조회 방지 */
 _db.collection('mbetco_sales').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get()
 .then(function(manSnap){
  _marginUnsub=_db.collection('filo_sales')
   .where('dealerId','==',did).where('date','>=',start).where('date','<=',end)
   .onSnapshot(function(posSnap){
    _filoCalcAndRender(posSnap,manSnap,today,ym,did);
   },function(e){console.error('margin listener:',e);});
 }).catch(function(){
  _marginUnsub=_db.collection('filo_sales')
   .where('dealerId','==',did).where('date','>=',start).where('date','<=',end)
   .onSnapshot(function(posSnap){
    _filoCalcAndRender(posSnap,{forEach:function(){}},today,ym,did);
   },function(e){console.error('margin listener:',e);});
 });
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

  var kpiCards='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px">'+
  [{label:'오늘 매출',val:'₩'+todayRev.toLocaleString(),color:'#a78bfa',sub:todayCnt+'건',border:'#a78bfa'},
   {label:'오늘 순이익',val:'₩'+todayProfit.toLocaleString(),color:todayProfit>=0?'#22c55e':'#ef4444',sub:'마진 '+todayMargin+'%',border:todayProfit>=0?'#22c55e':'#ef4444'},
   {label:'식재료 원가',val:'₩'+todayCost.toLocaleString(),color:'#f97316',sub:todayRev>0?Math.round(todayCost/todayRev*100)+'% 원가율':'—',border:'#f97316'},
   {label:'평균 객단가',val:'₩'+avgOrder.toLocaleString(),color:'#f59e0b',sub:'건당 평균',border:'#f59e0b'}
  ].map(function(s){
   return '<div class="kpi-card card-hover" style="padding:14px 16px;border-left:3px solid '+s.border+'">'+
   '<div style="font-size:10px;color:var(--t3);font-weight:600;letter-spacing:.4px;text-transform:uppercase;margin-bottom:6px">'+s.label+'</div>'+
   '<div class="kpi-val count-anim" style="color:'+s.color+';font-size:19px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums">'+s.val+'</div>'+
   '<div style="font-size:11px;color:var(--t3);margin-top:5px;font-weight:600">'+s.sub+'</div></div>';
  }).join('')+'</div>';

  /* 인기 메뉴 TOP5 */
  var menuEntries=Object.entries(menuStats).sort(function(a,b){return b[1].qty-a[1].qty;}).slice(0,5);
  /* 결제수단별 카드 */
  var payIcons={'카드':'CARD','현금':'CASH','카카오페이':'KAKAO','네이버페이':'NAVER','카운터결제':'POS','삼성페이':'PAY','기타':'ETC'};
  var paySorted=Object.entries(payStats).sort(function(a,b){return b[1]-a[1];});
  var payHtml=paySorted.length?
  '<div style="margin-top:14px"><div class="sec-title">결제수단별 매출</div>'+
  paySorted.map(function(m){
   var pct=monthRev>0?Math.round(m[1]/monthRev*100):0;
   var ic=payIcons[m[0]]||'';
   return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)">'+
    '<span style="font-size:16px">'+ic+'</span>'+
    '<div style="flex:1">'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:3px">'+
    '<span style="font-size:13px;font-weight:700">'+m[0]+'</span>'+
    '<span style="font-size:13px;font-weight:900;color:#22c55e">₩'+m[1].toLocaleString()+'</span>'+
    '</div>'+
    '<div style="height:4px;background:var(--surface3);border-radius:2px">'+
    '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#c9a84c,#22c55e);border-radius:2px"></div>'+
    '</div>'+
    '<span style="font-size:10px;color:var(--t3)">'+pct+'% 비중</span>'+
    '</div></div>';
  }).join('')+'</div>'
  :'<div style="padding:16px;text-align:center;color:var(--t3);font-size:12px">결제 데이터 없음</div>';

  var topMenu=menuEntries.length?
  '<div style="margin-top:14px">'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
  '<div><div class="sec-title" style="margin-bottom:10px">인기 메뉴 TOP5</div>'+
  menuEntries.map(function(kv,i){
   var rank=['1위','2위','3위','4위','5위'][i];
   var pct=monthRev>0?Math.round(kv[1].rev/monthRev*100):0;
   return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)">'+
    '<span style="font-size:15px">'+rank+'</span>'+
    '<div style="flex:1">'+
    '<div style="display:flex;justify-content:space-between">'+
    '<span style="font-size:12px;font-weight:700">'+kv[0]+'</span>'+
    '<span style="font-size:12px;font-weight:900;color:#22c55e">'+kv[1].qty+'개</span>'+
    '</div>'+
    '<div style="height:3px;background:var(--surface3);border-radius:2px;margin-top:4px">'+
    '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#c9a84c,#22c55e);border-radius:2px"></div>'+
    '</div></div></div>';
  }).join('')+
  '</div>'+
  '<div><div class="sec-title" style="margin-bottom:10px">결제수단 비중</div>'+
  '<div style="position:relative;height:130px"><canvas id="pay-donut-canvas"></canvas></div>'+
  '</div>'+
  '</div>'+
  '</div>'
  :'';

  /* 시간대별 차트 */
  var hourEntries=Object.keys(hourStats).map(Number).sort(function(a,b){return a-b;});
  var maxHour=hourEntries.length?Math.max.apply(null,hourEntries.map(function(h){return hourStats[h];})):1;
  var hourChart=hourEntries.length?
  '<div style="margin-top:14px"><div class="sec-title" style="margin-bottom:10px">시간대별 매출</div>'+
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
      backgroundColor:'rgba(201,168,76,.6)',borderColor:'rgba(201,168,76,1)',
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
    var pColors=['#c9a84c','#22c55e','#f59e0b','#38bdf8','#ef4444','#a855f7'];
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
 content.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)"><div style="font-size:28px;margin-bottom:8px"></div>분석 중...</div>';
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
  '<div style="font-size:13px;font-weight:800">일별 매출 vs 순이익</div>'+
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
   var maxQty=Math.max.apply(null,menus.map(function(m){return m.qty;}));
   html+='<div class="card" style="margin-bottom:12px">'+
   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
   '<div style="font-size:13px;font-weight:800">메뉴별 마진 분석</div>'+
   '<div style="font-size:10px;color:var(--t3)">매출 대비 마진율 · 판매량 순</div></div>'+
   menus.map(function(m){
    var profit=m.rev-m.cost;
    var rate=m.rev>0?Math.round(profit/m.rev*100):0;
    var rateC=rate>=60?'#22c55e':rate>=40?'#f59e0b':'#ef4444';
    var qPct=maxQty>0?Math.round(m.qty/maxQty*100):0;
    var autoTag=m._auto?'<span style="font-size:9px;background:rgba(99,102,241,.15);color:#6366f1;padding:1px 5px;border-radius:4px;margin-left:4px">레시피 자동</span>':'';
    return '<div class="menu-cost-row" style="padding:10px 0;border-bottom:1px solid var(--bd)">'+
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px">'+
    '<div>'+
    '<div style="font-size:13px;font-weight:800;color:var(--tx)">'+esc(m.name)+autoTag+'</div>'+
    '<div style="font-size:10px;color:var(--t3);margin-top:2px">'+
    (m.price?'판매가 ₩'+m.price.toLocaleString()+' ':'')+(m.costPer?'· 원가 ₩'+m.costPer.toLocaleString():'')+'</div>'+
    '</div>'+
    '<div style="text-align:right;flex-shrink:0">'+
    '<div style="font-size:14px;font-weight:900;color:'+rateC+'">'+rate+'%</div>'+
    '<div style="font-size:10px;color:var(--t3)">'+m.qty+'개 · ₩'+(profit>=0?'+':'')+profit.toLocaleString()+'</div>'+
    '</div></div>'+
    /* 판매량 바 */
    '<div style="display:flex;align-items:center;gap:6px">'+
    '<div style="flex:1;background:rgba(255,255,255,.07);border-radius:99px;height:5px;overflow:hidden">'+
    '<div style="background:'+rateC+';width:'+qPct+'%;height:100%;border-radius:99px"></div></div>'+
    '<div style="font-size:10px;color:var(--t3);min-width:30px;text-align:right">'+m.qty+'개</div></div>'+
    '</div>';
   }).join('')+'</div>';
  }

  /* 인건비 vs 매출 비율 */
  var noCostWarn=Object.keys(costMap).length===0&&totalRev>0?
  '<div style="margin-bottom:12px;padding:10px 14px;background:rgba(245,158,11,.08);border-left:3px solid #f59e0b;border-radius:0 10px 10px 0;font-size:12px;color:#b45309;font-weight:600">'+
  '원가 미등록 — <span onclick="_filoMgTab(1)" style="text-decoration:underline;cursor:pointer">원가 등록 탭</span>에서 메뉴별 원가를 입력해야 마진율이 정확히 계산됩니다</div>':'';
  html+=noCostWarn;

  /* 인건비 실데이터 로드 → 원가 구조 카드에 반영 */
  var laborPromise=_db.collection('attendance').where('dealerId','==',did).where('date','>=',start).where('date','<=',end).get().catch(function(){return {forEach:function(){}};});
  Promise.resolve(laborPromise).then(function(attSnap){
   var laborHours=0;
   var memberHours={};
   attSnap.forEach&&attSnap.forEach(function(doc){
    var d=doc.data();
    if(d.type==='in'&&d.inTime&&d.outTime){
     var h=(new Date(d.outTime)-new Date(d.inTime))/3600000;
     if(h>0&&h<24){laborHours+=h;memberHours[d.uid||d.memberId||doc.id]=(memberHours[d.uid||d.memberId||doc.id]||0)+h;}
    }
   });
   /* 멤버 시급으로 인건비 산출 */
   var memberIds=Object.keys(memberHours);
   var laborCostPromise=memberIds.length
    ?_db.collection('members').where('dealerId','==',did).get().then(function(mSnap){
     var laborCost=0;
     mSnap.forEach(function(doc){
      var d=doc.data();var uid=d.uid||doc.id;
      if(memberHours[uid])laborCost+=(d.hourlyWage||0)*(memberHours[uid]);
     });
     return laborCost;
    }).catch(function(){return 0;})
    :Promise.resolve(0);

   Promise.resolve(laborCostPromise).then(function(laborCost){
    var laborRate=totalRev>0?Math.round(laborCost/totalRev*100):0;
    var primeCost=Math.round(totalCost/Math.max(totalRev,1)*100)+laborRate;
    var foodRate=totalRev>0?Math.round(totalCost/totalRev*100):0;
    var netProfit=totalRev-totalCost-laborCost;

    var costCard='<div class="card" style="margin-top:12px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
    '<div style="font-size:13px;font-weight:800">원가 구조 분석</div>'+
    '<div style="font-size:10px;color:var(--t3)">'+ym+'</div></div>'+
    /* 원가율 게이지 바 */
    '<div style="margin-bottom:12px">'
    +[
     {label:'식재료 원가율',rate:foodRate,max:50,color:'#f97316',val:'₩'+totalCost.toLocaleString()},
     {label:'인건비율',rate:laborRate,max:40,color:'#a78bfa',val:laborCost>0?'₩'+Math.round(laborCost).toLocaleString():'수동 입력 필요'},
     {label:'프라임코스트',rate:primeCost,max:70,color:primeCost>70?'#ef4444':'#22c55e',val:primeCost+'% (목표 70% 이하)'}
    ].map(function(r){
     var barW=Math.min(Math.round(r.rate/r.max*100),100);
     var barColor=r.rate>r.max?'#ef4444':r.color;
     return '<div style="margin-bottom:10px">'+
     '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
     '<span style="font-size:11px;color:var(--t3);font-weight:600">'+r.label+'</span>'+
     '<span style="font-size:11px;font-weight:800;color:'+barColor+'">'+r.rate+'% · '+r.val+'</span></div>'+
     '<div style="height:7px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden">'+
     '<div style="height:100%;width:'+barW+'%;background:'+barColor+';border-radius:99px;transition:width .6s"></div></div>'+
     '</div>';
    }).join('')+'</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
    [{label:'총 매출',val:'₩'+totalRev.toLocaleString(),c:'#a78bfa'},
     {label:'실제 순이익',val:'₩'+netProfit.toLocaleString(),c:netProfit>=0?'#22c55e':'#ef4444'},
     {label:'근무 시간',val:Math.round(laborHours)+'h',c:'#f59e0b'},
     {label:'손익분기',val:netProfit>=0?'달성':'미달',c:netProfit>=0?'#22c55e':'#ef4444'}
    ].map(function(s){
     return '<div style="background:var(--b3);border-radius:10px;padding:10px 12px">'+
     '<div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">'+s.label+'</div>'+
     '<div style="font-size:15px;font-weight:900;color:'+s.c+';margin-top:3px;font-variant-numeric:tabular-nums">'+s.val+'</div></div>';
    }).join('')+
    '</div>'+
    (laborCost===0?'<div style="margin-top:10px;font-size:10px;color:var(--t3)">※ 인건비: 출퇴근 기록 없음 → 급여 설정에서 시급 등록 시 자동 계산</div>':'')+
    '</div>';

    var c=document.getElementById('mg-content');
    if(c){
     /* 기존 원가구조 카드가 없으면 추가 */
     if(!c.querySelector('.cost-struct-card')){
      c.innerHTML+=costCard.replace('class="card"','class="card cost-struct-card"');
     }
    }
   });
  });

  content.innerHTML=html;
 }).catch(function(e){
  var c=document.getElementById('mg-content');
  if(c)c.innerHTML='<div style="color:var(--red);padding:20px">'+e.message+'</div>';
 });
}

/* ── 원가 등록 탭 ── */
var _costEditId=null;
function _filoRenderCostMgmt(did){
 var content=document.getElementById('mg-content');
 if(!content)return;
 content.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">로딩 중...</div>';
 Promise.all([
  _db.collection('filo_menus').where('dealerId','==',did).get(),
  _db.collection('menu_costs').where('dealerId','==',did).get(),
  _db.collection('menu_recipes').where('dealerId','==',did).get()
 ]).then(function(results){
  var menuSnap=results[0],costSnap=results[1],recipeSnap=results[2];
  var costMap={};
  costSnap.forEach(function(doc){var d=doc.data();costMap[d.name||doc.id]={id:doc.id,name:d.name||doc.id,cost:d.cost||0,price:d.price||0};});
  var recipeNames=new Set();
  recipeSnap.forEach(function(doc){var d=doc.data();if(d.menuName)recipeNames.add(d.menuName);});
  var allMenus=[];
  menuSnap.forEach(function(doc){var d=doc.data();if(d.name)allMenus.push({name:d.name,price:d.price||0,id:doc.id});});

  var registered=allMenus.filter(function(m){return costMap[m.name];});
  var unregistered=allMenus.filter(function(m){return !costMap[m.name];});
  /* 메뉴에 없는데 원가만 있는 항목도 포함 */
  var menuNames=new Set(allMenus.map(function(m){return m.name;}));
  Object.values(costMap).forEach(function(c){if(!menuNames.has(c.name))registered.push({name:c.name,price:c.price,_extra:true});});

  var html='';
  /* 헤더 */
  html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
   +'<div><div style="font-size:14px;font-weight:800">원가 등록 <span style="color:#6366f1">'+Object.keys(costMap).length+'</span> / '+allMenus.length+'</div>'
   +'<div style="font-size:11px;color:var(--t3);margin-top:2px">레시피 연동 시 자동 계산 · 직접 입력도 가능</div></div>'
   +'<button onclick="_filoCostOpenModal(\''+did+'\',null,null,null)" style="display:flex;align-items:center;gap:5px;padding:7px 14px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">'
   +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>수동 추가</button>'
   +'</div>';

  /* 원가 미등록 경고 */
  if(unregistered.length){
   html+='<div style="margin-bottom:14px;padding:12px 14px;background:rgba(245,158,11,.07);border-left:3px solid #f59e0b;border-radius:0 10px 10px 0">'
    +'<div style="font-size:12px;font-weight:700;color:#b45309;margin-bottom:8px">미등록 메뉴 '+unregistered.length+'개 — 클릭해서 빠르게 등록</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:6px">'
    +unregistered.map(function(m){
     var price=m.price||0;
     var autoFromRecipe=recipeNames.has(m.name);
     return '<button onclick="_filoCostOpenModal(\''+did+'\',null,\''+esc(m.name)+'\','+price+')" '
      +'style="padding:4px 10px;border-radius:20px;border:1.5px solid rgba(245,158,11,.4);background:transparent;font-size:11px;font-weight:700;color:#b45309;cursor:pointer;position:relative">'
      +esc(m.name)+(autoFromRecipe?'<span style="position:absolute;top:-4px;right:-4px;width:8px;height:8px;border-radius:50%;background:#6366f1"></span>':'')
      +'</button>';
    }).join('')
    +'</div>'
    +'<div style="font-size:9px;color:var(--t3);margin-top:8px">● 보라 점 = 레시피 연동 메뉴 (자동 계산 가능)</div>'
    +'</div>';
  }

  /* 등록된 원가 목록 */
  if(registered.length){
   html+='<div style="margin-bottom:8px;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.5px">등록된 원가</div>';
   html+=registered.map(function(m){
    var c=costMap[m.name]||{};
    var margin=c.price>0?Math.round((c.price-c.cost)/c.price*100):0;
    var mc=margin>=60?'#22c55e':margin>=40?'#f59e0b':'#ef4444';
    var autoTag=recipeNames.has(m.name)?'<span style="font-size:9px;background:rgba(99,102,241,.12);color:#6366f1;padding:1px 5px;border-radius:4px;margin-left:4px">레시피</span>':'';
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--b2,rgba(255,255,255,.03));border-radius:10px;margin-bottom:6px">'
     +'<div style="flex:1;min-width:0">'
     +'<div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(m.name)+autoTag+'</div>'
     +'<div style="display:flex;gap:10px;margin-top:3px">'
     +'<span style="font-size:11px;color:var(--t3)">판매가 <b style="color:var(--tx)">₩'+c.price.toLocaleString()+'</b></span>'
     +'<span style="font-size:11px;color:var(--t3)">원가 <b style="color:#f97316">₩'+c.cost.toLocaleString()+'</b></span>'
     +'<span style="font-size:11px;font-weight:800;color:'+mc+'">마진 '+margin+'%</span>'
     +'</div></div>'
     +'<div style="display:flex;gap:6px;flex-shrink:0">'
     +'<button onclick="_filoCostOpenModal(\''+did+'\',\''+c.id+'\',\''+esc(m.name)+'\','+c.price+','+c.cost+')" '
      +'style="padding:5px 10px;background:rgba(99,102,241,.1);color:#6366f1;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer">수정</button>'
     +'<button onclick="_filoCostDelete(\''+did+'\',\''+c.id+'\')" '
      +'style="padding:5px 10px;background:rgba(239,68,68,.08);color:#ef4444;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer">삭제</button>'
     +'</div></div>';
   }).join('');
  }else{
   html+='<div style="text-align:center;padding:30px;color:var(--t3);font-size:13px">등록된 원가 없음 — 위 버튼으로 추가하세요</div>';
  }

  content.innerHTML=html;
 }).catch(function(e){
  var c=document.getElementById('mg-content');
  if(c)c.innerHTML='<div style="color:var(--red);padding:20px">'+e.message+'</div>';
 });
}

function _filoCostOpenModal(did,docId,menuName,menuPrice,menuCost){
 var existing=document.getElementById('cost-modal-wrap');
 if(existing)existing.remove();
 var wrap=document.createElement('div');
 wrap.id='cost-modal-wrap';
 wrap.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
 wrap.innerHTML='<div style="background:var(--bg,#0b1222);border-radius:20px 20px 0 0;padding:24px 20px 32px;width:100%;max-width:480px;box-shadow:0 -8px 32px rgba(0,0,0,.4)">'
  +'<div style="width:36px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 20px"></div>'
  +'<div style="font-size:16px;font-weight:800;margin-bottom:16px">'+(docId?'원가 수정':'원가 등록')+'</div>'
  +'<div style="display:flex;flex-direction:column;gap:12px">'
  +'<div><label style="font-size:11px;color:var(--t3);font-weight:600;display:block;margin-bottom:4px">메뉴명</label>'
  +'<input id="cost-m-name" type="text" value="'+(menuName?esc(menuName):'')+'" placeholder="메뉴명" '
  +(docId?'readonly style="padding:10px 12px;border:1.5px solid rgba(0,0,0,.1);border-radius:10px;font-size:13px;width:100%;box-sizing:border-box;background:rgba(0,0,0,.06);color:var(--t3)"':'style="padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;font-size:13px;width:100%;box-sizing:border-box;background:var(--b2);color:var(--tx)"')+'></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
  +'<div><label style="font-size:11px;color:var(--t3);font-weight:600;display:block;margin-bottom:4px">판매가 (원)</label>'
  +'<input id="cost-m-price" type="number" value="'+(menuPrice||'')+'" placeholder="0" oninput="_filoCostCalcPreview()" style="padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;font-size:13px;width:100%;box-sizing:border-box;background:var(--b2);color:var(--tx)"></div>'
  +'<div><label style="font-size:11px;color:var(--t3);font-weight:600;display:block;margin-bottom:4px">원가 (원)</label>'
  +'<input id="cost-m-cost" type="number" value="'+(menuCost||'')+'" placeholder="0" style="padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;font-size:13px;width:100%;box-sizing:border-box;background:var(--b2);color:var(--tx)" oninput="_filoCostCalcPreview()"></div>'
  +'</div>'
  +'<div id="cost-preview" style="padding:10px 14px;background:rgba(99,102,241,.07);border-radius:10px;font-size:12px;color:var(--t3)">판매가와 원가를 입력하면 마진율이 계산됩니다</div>'
  +'</div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px">'
  +'<button onclick="document.getElementById(\'cost-modal-wrap\').remove()" style="padding:12px;border:1.5px solid rgba(0,0,0,.12);border-radius:12px;font-size:13px;font-weight:700;background:transparent;color:var(--t2);cursor:pointer">취소</button>'
  +'<button onclick="_filoCostSave(\''+did+'\','+(docId?'\''+docId+'\'':'null')+')" style="padding:12px;background:#6366f1;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer">저장</button>'
  +'</div>'
  +'</div>';
 document.body.appendChild(wrap);
 wrap.addEventListener('click',function(e){if(e.target===wrap)wrap.remove();});
 setTimeout(function(){_filoCostCalcPreview();},50);
}

function _filoCostCalcPreview(){
 var price=Number(document.getElementById('cost-m-price')?.value||0);
 var cost=Number(document.getElementById('cost-m-cost')?.value||0);
 var el=document.getElementById('cost-preview');if(!el)return;
 if(!price&&!cost){el.textContent='판매가와 원가를 입력하면 마진율이 계산됩니다';return;}
 var margin=price>0?Math.round((price-cost)/price*100):0;
 var mc=margin>=60?'#22c55e':margin>=40?'#f59e0b':'#ef4444';
 el.innerHTML='마진율 <b style="color:'+mc+';font-size:15px">'+margin+'%</b> · 공헌이익 <b style="color:'+mc+'">₩'+(price-cost).toLocaleString()+'</b>';
}

function _filoCostSave(did,docId){
 var nameEl=document.getElementById('cost-m-name');
 var name=(nameEl?.value||'').trim();
 var price=Number(document.getElementById('cost-m-price')?.value||0);
 var cost=Number(document.getElementById('cost-m-cost')?.value||0);
 if(!name){_filoToast('메뉴명을 입력하세요');return;}
 var data={dealerId:did,name:name,price:price,cost:cost,updatedAt:new Date().toISOString()};
 var p=docId?_db.collection('menu_costs').doc(docId).update(data):_db.collection('menu_costs').add(data);
 p.then(function(){
  document.getElementById('cost-modal-wrap')?.remove();
  _filoToast('원가 저장 완료');
  _filoRenderCostMgmt(did);
  /* _marginCostMap도 즉시 갱신 */
  _marginCostMap[name]={name:name,cost:cost,price:price};
 }).catch(function(e){_filoToast('저장 실패: '+e.message);});
}

function _filoCostDelete(did,docId){
 if(!docId)return;
 if(!confirm('이 원가 항목을 삭제할까요?'))return;
 _db.collection('menu_costs').doc(docId).delete().then(function(){
  _filoToast('삭제 완료');
  _filoRenderCostMgmt(did);
 }).catch(function(e){_filoToast('삭제 실패: '+e.message);});
}

/* ── AI 인사이트 탭 (메뉴 엔지니어링 + 원가율 벤치마크 + AI 분석) ── */
window._filoMarginBizType = window._filoMarginBizType || 'general';

var _MARGIN_BENCH = {
  cafe:     {name:'카페/베이커리',    low:25,high:35,prime:60},
  korean:   {name:'한식당',           low:35,high:45,prime:65},
  japanese: {name:'일식/횟집',        low:40,high:55,prime:65},
  chinese:  {name:'중식당',           low:32,high:42,prime:65},
  fastfood: {name:'패스트푸드/분식',  low:30,high:40,prime:62},
  izakaya:  {name:'이자카야/술집',    low:25,high:35,prime:60},
  general:  {name:'일반 외식업',      low:30,high:45,prime:65}
};

function _filoRenderInsights(did,ym){
 var content=document.getElementById('mg-content');
 if(!content)return;
 var biz=window._filoMarginBizType||'general';
 var bench=_MARGIN_BENCH[biz]||_MARGIN_BENCH.general;

 /* 스켈레톤 */
 content.innerHTML=
  '<div style="padding:8px 0 16px">'
  +'<div style="font-size:11px;color:var(--t3);margin-bottom:10px">업종 선택 (벤치마크 기준)</div>'
  +'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">'
  +Object.keys(_MARGIN_BENCH).map(function(k){
   var act=k===biz;
   return '<button onclick="window._filoMarginBizType=\''+k+'\';_filoRenderInsights(\''+did+'\',\''+ym+'\')" '
    +'style="padding:5px 12px;border-radius:20px;border:1.5px solid '+(act?'#6366f1':'rgba(0,0,0,.12)')+';background:'+(act?'#6366f1':'transparent')+';color:'+(act?'#fff':'var(--t2)')+';font-size:11px;font-weight:700;cursor:pointer">'+esc(_MARGIN_BENCH[k].name)+'</button>';
  }).join('')
  +'</div>'
  +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:20px;padding:10px 14px;background:rgba(99,102,241,.05);border:1px solid rgba(99,102,241,.15);border-radius:12px">'
  +'<div style="width:8px;height:8px;border-radius:50%;background:#6366f1;animation:pulse 2s infinite"></div>'
  +'<span style="font-size:12px;color:#6366f1;font-weight:600">AI 마진 분석 중...</span>'
  +'</div>'
  +'</div>';

 _aiPost('/api/ai-margin-analysis',{did:did,ym:ym,businessType:biz}).then(function(r){
  if(!content.isConnected)return;
  var b=r.ok?r.bench:bench;
  var foodCostPct=r.ok?r.foodCostPct:0;
  var primeCost=r.ok?r.primeCost:0;
  var laborCostPct=r.ok?r.laborCostPct:0;
  var menuEngineering=r.ok?(r.menuEngineering||[]):[];
  var unregistered=r.ok?(r.unregistered||[]):[];
  var hasCostData=r.ok?r.hasCostData:false;
  var totalRev=r.ok?r.totalRev:0;
  var aiNarrative=r.ok?r.aiNarrative:'';
  var aiPowered=r.ok?r.aiPowered:false;

  var html='<div style="padding:4px 0">';

  /* 업종 선택 버튼 */
  html+='<div style="font-size:11px;color:var(--t3);margin-bottom:8px">업종 선택 (벤치마크 기준)</div>'
   +'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px">'
   +Object.keys(_MARGIN_BENCH).map(function(k){
    var act=k===biz;
    return '<button onclick="window._filoMarginBizType=\''+k+'\';_filoRenderInsights(\''+esc(did)+'\',\''+esc(ym)+'\')" '
     +'style="padding:5px 12px;border-radius:20px;border:1.5px solid '+(act?'#6366f1':'rgba(0,0,0,.12)')+';background:'+(act?'#6366f1':'transparent')+';color:'+(act?'#fff':'var(--t2)')+';font-size:11px;font-weight:700;cursor:pointer">'+esc(_MARGIN_BENCH[k].name)+'</button>';
   }).join('')
   +'</div>';

  /* ① 식재료 원가율 게이지 */
  var gaugeColor=foodCostPct>b.high?'#ef4444':foodCostPct<b.low?'#3b82f6':'#22c55e';
  var gaugeStatus=foodCostPct>b.high?'위험':foodCostPct<b.low?'양호':'정상';
  var gaugePct=Math.min(foodCostPct,100);
  html+='<div class="card" style="margin-bottom:12px">'
   +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
   +'<div style="font-size:13px;font-weight:800">식재료 원가율</div>'
   +'<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:'+gaugeColor+'22;color:'+gaugeColor+'">'+gaugeStatus+'</span>'
   +'</div>'
   +'<div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:12px">'
   +'<div style="font-size:40px;font-weight:900;color:'+gaugeColor+';letter-spacing:-2px">'+(hasCostData?foodCostPct:'—')+'<span style="font-size:18px">%</span></div>'
   +'<div style="flex:1">'
   +'<div style="font-size:10px;color:var(--t3);margin-bottom:4px">업종 기준: '+b.low+'~'+b.high+'% ('+esc(b.name)+')</div>'
   +'<div style="height:10px;background:var(--b3);border-radius:5px;position:relative;overflow:visible">'
   +'<div style="position:absolute;left:0;top:0;height:100%;width:'+gaugePct+'%;background:'+gaugeColor+';border-radius:5px;transition:.6s"></div>'
   +'<div style="position:absolute;top:-4px;height:18px;width:2px;background:#3b82f6;border-radius:1px;left:'+b.low+'%"></div>'
   +'<div style="position:absolute;top:-4px;height:18px;width:2px;background:#ef4444;border-radius:1px;left:'+Math.min(b.high,100)+'%"></div>'
   +'</div>'
   +'<div style="display:flex;justify-content:space-between;margin-top:5px">'
   +'<span style="font-size:9px;color:#3b82f6">하한 '+b.low+'%</span>'
   +'<span style="font-size:9px;color:#ef4444">상한 '+b.high+'%</span>'
   +'</div>'
   +'</div>'
   +'</div>';

  /* Prime Cost 섹션 */
  var primeColor=primeCost>b.prime?'#ef4444':'#22c55e';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px">'
   +'<div style="background:var(--b3);border-radius:12px;padding:12px;text-align:center">'
   +'<div style="font-size:10px;color:var(--t3);margin-bottom:4px">인건비율</div>'
   +'<div style="font-size:20px;font-weight:900;color:#a78bfa">'+(laborCostPct||'—')+'<span style="font-size:12px">%</span></div>'
   +'</div>'
   +'<div style="background:var(--b3);border-radius:12px;padding:12px;text-align:center">'
   +'<div style="font-size:10px;color:var(--t3);margin-bottom:4px">프라임코스트 (목표 '+b.prime+'% 이하)</div>'
   +'<div style="font-size:20px;font-weight:900;color:'+primeColor+'">'+(hasCostData?primeCost:'—')+'<span style="font-size:12px">%</span></div>'
   +'</div>'
   +'</div>'
   +'<div style="font-size:10px;color:var(--t3);margin-top:6px">※ 프라임코스트 = 식재료원가율 + 인건비율. '+b.prime+'% 초과 시 수익성 악화 위험</div>'
   +'</div>';

  /* ② 원가 미등록 메뉴 경고 */
  if(unregistered.length){
   html+='<div class="card" style="margin-bottom:12px;border-left:3px solid #f59e0b">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
    +'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    +'<div style="font-size:13px;font-weight:800;color:#b45309">원가 미등록 메뉴 ('+unregistered.length+'개)</div>'
    +'</div>'
    +'<div style="font-size:11px;color:var(--t3);margin-bottom:10px">아래 메뉴는 판매 중이나 원가가 없어 마진율이 과다 계상됩니다</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:6px">'
    +unregistered.slice(0,10).map(function(nm){
     return '<span style="padding:4px 10px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:20px;font-size:11px;font-weight:700;color:#b45309">'+esc(nm)+'</span>';
    }).join('')
    +(unregistered.length>10?'<span style="font-size:10px;color:var(--t3);align-self:center">외 '+(unregistered.length-10)+'개</span>':'')
    +'</div>'
    +'<button onclick="_filoMgTab(1)" style="margin-top:12px;padding:7px 16px;background:#f59e0b;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">원가 등록 탭으로 이동</button>'
    +'</div>';
  }

  /* ③ 메뉴 엔지니어링 매트릭스 */
  if(menuEngineering.length){
   var cats={star:[],plowhorse:[],puzzle:[],dog:[]};
   menuEngineering.forEach(function(m){cats[m.category]&&cats[m.category].push(m);});
   var CAT_DEF=[
    {key:'star',      label:'Star',       sub:'고공헌·고인기',  color:'#22c55e', bg:'rgba(34,197,94,.08)',  desc:'판매 확대·홍보 집중'},
    {key:'plowhorse', label:'Plow Horse', sub:'저공헌·고인기',  color:'#3b82f6', bg:'rgba(59,130,246,.08)', desc:'원가 절감 또는 가격 인상'},
    {key:'puzzle',    label:'Puzzle',     sub:'고공헌·저인기',  color:'#a78bfa', bg:'rgba(167,139,250,.08)',desc:'홍보·배치로 판매 자극'},
    {key:'dog',       label:'Dog',        sub:'저공헌·저인기',  color:'#ef4444', bg:'rgba(239,68,68,.08)',  desc:'가격 조정 또는 메뉴 정리'},
   ];
   html+='<div class="card" style="margin-bottom:12px">'
    +'<div style="font-size:13px;font-weight:800;margin-bottom:4px">메뉴 엔지니어링 매트릭스</div>'
    +'<div style="font-size:10px;color:var(--t3);margin-bottom:12px">Kasavana &amp; Smith 기준 — 공헌이익(단가-원가) × 판매량으로 분류</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +CAT_DEF.map(function(cat){
     var items=cats[cat.key]||[];
     return '<div style="background:'+cat.bg+';border:1.5px solid '+cat.color+'33;border-radius:14px;padding:12px">'
      +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'
      +'<div style="width:8px;height:8px;border-radius:50%;background:'+cat.color+'"></div>'
      +'<span style="font-size:12px;font-weight:900;color:'+cat.color+'">'+cat.label+'</span>'
      +'<span style="font-size:10px;color:var(--t3)">'+cat.sub+'</span>'
      +'</div>'
      +'<div style="font-size:10px;color:var(--t3);margin-bottom:8px">'+cat.desc+'</div>'
      +(items.length
       ?items.slice(0,4).map(function(m){
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-top:1px solid '+cat.color+'22">'
         +'<span style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%">'+esc(m.name)+'</span>'
         +'<span style="font-size:10px;color:'+cat.color+';font-weight:800;white-space:nowrap">+₩'+m.cmPer.toLocaleString()+'</span>'
         +'</div>';
       }).join('')+(items.length>4?'<div style="font-size:10px;color:var(--t3);margin-top:4px">외 '+(items.length-4)+'개</div>':'')
       :'<div style="font-size:11px;color:var(--t3);padding:8px 0">해당 메뉴 없음</div>'
      )
      +'</div>';
    }).join('')
    +'</div></div>';
  }

  /* ④ 메뉴별 원가율 테이블 */
  if(menuEngineering.length){
   var topMenus=menuEngineering.slice(0,10);
   html+='<div class="card" style="margin-bottom:12px">'
    +'<div style="font-size:13px;font-weight:800;margin-bottom:12px">메뉴별 원가율 상세</div>'
    +'<div style="display:grid;grid-template-columns:1fr 50px 60px 54px;gap:4px;padding-bottom:8px;border-bottom:1px solid var(--bd)">'
    +['메뉴','판매','공헌이익','원가율'].map(function(h){return '<div style="font-size:10px;color:var(--t3);font-weight:700">'+h+'</div>';}).join('')
    +'</div>'
    +topMenus.map(function(m){
     var tl=m.costPct<=35?'#22c55e':m.costPct<=50?'#f59e0b':'#ef4444';
     var cat=m.category;
     var catLabel={star:'★',plowhorse:'➔',puzzle:'?',dog:'✕'}[cat]||'';
     return '<div style="display:grid;grid-template-columns:1fr 50px 60px 54px;gap:4px;padding:8px 0;border-bottom:1px solid var(--bd);align-items:center">'
      +'<div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
      +'<span style="color:'+{star:'#22c55e',plowhorse:'#3b82f6',puzzle:'#a78bfa',dog:'#ef4444'}[cat]+';margin-right:3px">'+catLabel+'</span>'
      +esc(m.name)+'</div>'
      +'<div style="font-size:11px;font-weight:700;text-align:right">'+m.qty+'개</div>'
      +'<div style="font-size:11px;font-weight:800;text-align:right;color:'+(m.cm>=0?'#22c55e':'#ef4444')+'">₩'+m.cm.toLocaleString()+'</div>'
      +'<div style="text-align:right"><span style="font-size:11px;font-weight:800;padding:2px 6px;border-radius:6px;background:'+tl+'22;color:'+tl+'">'+m.costPct+'%</span></div>'
      +'</div>';
    }).join('')
    +(menuEngineering.length>10?'<div style="font-size:10px;color:var(--t3);padding:8px 0">외 '+(menuEngineering.length-10)+'개</div>':'')
    +'<div style="display:flex;gap:10px;margin-top:8px">'
    +[['#22c55e','원가율 35% 이하 (우수)'],['#f59e0b','35~50% (보통)'],['#ef4444','50% 초과 (위험)']].map(function(l){
     return '<div style="display:flex;align-items:center;gap:4px"><div style="width:8px;height:8px;border-radius:2px;background:'+l[0]+'"></div><span style="font-size:9px;color:var(--t3)">'+l[1]+'</span></div>';
    }).join('')
    +'</div></div>';
  }

  /* ⑤ BEP 계산기 */
  html+='<div class="card" style="margin-bottom:12px">'
   +'<div style="font-size:13px;font-weight:800;margin-bottom:4px">손익분기점(BEP) 계산기</div>'
   +'<div style="font-size:10px;color:var(--t3);margin-bottom:12px">월 고정비 입력 시 최소 매출 목표 자동 계산</div>'
   +'<div style="display:flex;gap:8px;align-items:center">'
   +'<input id="bep-fixed" type="number" placeholder="월 고정비 (원)" '
   +'style="flex:1;padding:9px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;font-size:13px;color:var(--tx)" '
   +'oninput="_filoCalcBEP('+foodCostPct+')">'
   +'<span style="font-size:12px;color:var(--t3)">원</span>'
   +'</div>'
   +'<div id="bep-result" style="margin-top:10px;font-size:13px;color:var(--t3)">고정비를 입력하면 BEP가 계산됩니다</div>'
   +'</div>';

  /* ⑥ AI 분석 카드 */
  html+='<div class="card" style="background:linear-gradient(135deg,rgba(99,102,241,.06),rgba(167,139,250,.06));border:1.5px solid rgba(99,102,241,.2)">'
   +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
   +'<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#a78bfa);display:flex;align-items:center;justify-content:center">'
   +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
   +'</div>'
   +'<div>'
   +'<div style="font-size:13px;font-weight:800">AI 마진 분석</div>'
   +'<div style="font-size:10px;color:var(--t3)">'+(aiPowered?'Claude Haiku 분석':'자동 분석')+'</div>'
   +'</div>'
   +'</div>'
   +'<div style="font-size:13px;line-height:1.8;color:var(--t2)">'+esc(aiNarrative||'원가 데이터를 등록하면 AI 분석이 활성화됩니다.')+'</div>'
   +'<button onclick="_filoRenderInsights(\''+esc(did)+'\',\''+esc(ym)+'\')" '
   +'style="margin-top:12px;padding:7px 16px;background:linear-gradient(135deg,#6366f1,#a78bfa);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">다시 분석</button>'
   +'</div>';

  html+='</div>';
  content.innerHTML=html;
 }).catch(function(e){
  content.innerHTML='<div style="padding:20px;color:var(--red)">분석 오류: '+esc(e.message)+'</div>';
 });
}

/* BEP 계산 헬퍼 */
function _filoCalcBEP(foodCostPct){
 var fixedEl=document.getElementById('bep-fixed');
 var resultEl=document.getElementById('bep-result');
 if(!fixedEl||!resultEl)return;
 var fixed=parseFloat(fixedEl.value)||0;
 if(!fixed){resultEl.textContent='고정비를 입력하면 BEP가 계산됩니다';return;}
 var pct=foodCostPct>0?foodCostPct:40;
 var bep=Math.round(fixed/(1-pct/100));
 var color=bep>0?'#6366f1':'#ef4444';
 resultEl.innerHTML='<span style="font-weight:800;color:'+color+'">BEP: ₩'+bep.toLocaleString()+'</span>'
  +' <span style="color:var(--t3);font-size:11px">/ 월 (식재료원가율 '+pct+'% 기준)</span>';
}
window._filoCalcBEP=_filoCalcBEP;

/* ══════════════════════════════════════════════════════
 * AI 어시스턴트 모듈 (구 filo-ai.js 통합 — 2026-08-04)
 * ══════════════════════════════════════════════════════
 * 공개 함수:
 *   _filoPageAI(el)         — AI 인사이트 허브 페이지 (벤또 그리드)
 *   _filoAiForecast()       — AI 매출 예측 (내일 / 다음 7일)
 *   _filoAiMenuRec()        — AI 메뉴 추천 (날씨·시간대·재고)
 *   _filoAiSchedule()       — AI 직원 스케줄 최적화
 *   _filoVoiceOrderOpen()   — 음성 주문 인식 (Web Speech API)
 *   _filoAiChatToggle()     — AI CS봇 플로팅 위젯
 *   _filoAiBriefing(target) — 대시보드 한줄 브리핑 주입
 * 백엔드: _worker.js
 *   POST /api/ai-forecast · /api/ai-menu-recommend · /api/ai-schedule
 *   POST /api/ai-voice-order · /api/ai-insight · /api/cs-bot
 * ══════════════════════════════════════════════════════ */

/* ───────────────────────── 공통 유틸 ───────────────────────── */

function _aiDid() {
  return (window._CU && _CU.dealerId) || (window._cachedCompanyDoc && (_cachedCompanyDoc.dealerId || _cachedCompanyDoc.uid)) || '';
}
function _aiWon(n) {
  return '₩' + Number(n || 0).toLocaleString();
}
function _aiEsc(s) {
  if (typeof esc === 'function') return esc(s);
  var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML;
}
function _aiToast(msg) {
  if (typeof _filoToast === 'function') return _filoToast(msg);
  if (typeof _dineToast === 'function') return _dineToast(msg);
  console.log('[AI]', msg);
}

/* 스켈레톤 로더 */
function _aiSkeleton(lines) {
  var h = '';
  for (var i = 0; i < (lines || 3); i++) {
    h += '<div class="ai-skel" style="width:' + (100 - i * 12) + '%"></div>';
  }
  return h;
}

/* POST 헬퍼 — 실패해도 화면이 죽지 않도록 항상 객체를 반환한다 */
function _aiPost(path, payload) {
  var user = firebase.auth ? firebase.auth().currentUser : null;
  var tokenP = user ? user.getIdToken() : Promise.resolve('');
  return tokenP.then(function(token) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(payload || {})
    }).then(function (r) { return r.json(); })
      .catch(function (e) { return { ok: false, error: e.message }; });
  });
}

/* 카드 안에 오류를 그린다 */
function _aiErr(el, msg, retryFn) {
  if (!el) return;
  el.innerHTML =
    '<div class="ai-empty">' +
    '<div style="font-size:26px;margin-bottom:8px">[경고]</div>' +
    '<div style="font-size:12px;color:var(--t2);line-height:1.6">' + _aiEsc(msg) + '</div>' +
    (retryFn ? '<button class="ai-chip" style="margin-top:12px" onclick="' + retryFn + '">다시 시도</button>' : '') +
    '</div>';
}

/* ═════════════════════════════════════════════════════════════
   1. AI 인사이트 허브 페이지 — 벤또박스 그리드 (2026 트렌드)
   ═════════════════════════════════════════════════════════════ */
var _aiChatHistory = [];

function _filoPageAI(el) {
  if (!el) el = document.getElementById('content');
  if (!el) return;
  _aiChatHistory = [];

  el.innerHTML =
  '<style>' +
  '.ai-chat-wrap{display:flex;gap:16px;align-items:flex-start;margin-bottom:20px}' +
  '@media(max-width:680px){.ai-chat-wrap{flex-direction:column}}' +
  '.ai-chat-panel{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--b2);border:1px solid var(--bd);border-radius:16px;overflow:hidden}' +
  '.ai-chat-msgs{flex:1;padding:16px;overflow-y:auto;max-height:340px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}' +
  '.ai-msg{max-width:82%;padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5}' +
  '.ai-msg.ai{align-self:flex-start;background:var(--b3);border-bottom-left-radius:4px;color:var(--tx)}' +
  '.ai-msg.user{align-self:flex-end;background:#c9a84c;color:#0f172a;font-weight:600;border-bottom-right-radius:4px}' +
  '.ai-msg.thinking{opacity:.6}' +
  '.ai-chat-input{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--bd);background:var(--b3)}' +
  '.ai-chat-input input{flex:1;background:transparent;border:none;outline:none;color:var(--tx);font-size:13px;padding:6px 0}' +
  '.ai-chat-input button{flex-shrink:0;background:#c9a84c;border:none;border-radius:8px;color:#0f172a;font-size:12px;font-weight:800;padding:8px 14px;cursor:pointer}' +
  '.ai-quick-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}' +
  '.ai-quick-chip{background:var(--b3);border:1px solid var(--bd);border-radius:99px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;color:var(--t2);transition:border-color .15s}' +
  '.ai-quick-chip:hover{border-color:rgba(201,168,76,.5);color:#c9a84c}' +
  '</style>' +

  '<div class="ai-page">' +

    /* 히어로 */
    '<div class="ai-hero fade-up">' +
      '<div class="ai-hero-glow"></div>' +
      '<div style="position:relative;z-index:1">' +
        '<div class="ai-hero-eyebrow">FILO AI · 2026</div>' +
        '<div class="ai-hero-title">AIVO 어시스턴트</div>' +
        '<div class="ai-hero-sub" id="ai-briefing">' +
          '<span class="ai-typing">매장 데이터를 읽는 중</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* 채팅 + 벤또 2열 */
    '<div class="ai-chat-wrap">' +

      /* 채팅 패널 */
      '<div class="ai-chat-panel">' +
        '<div style="padding:12px 14px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:8px">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block"></span>' +
          '<span style="font-size:12px;font-weight:800">AIVO 채팅</span>' +
          '<span style="font-size:11px;color:var(--t3);margin-left:auto">매장 데이터 기반</span>' +
        '</div>' +
        '<div class="ai-chat-msgs" id="ai-chat-msgs">' +
          '<div class="ai-msg ai">안녕하세요! 매장 운영에 대해 무엇이든 물어보세요. 매출, 메뉴, 직원 관리 등 도와드립니다.</div>' +
        '</div>' +
        '<div class="ai-quick-chips" style="padding:8px 12px 0">' +
          '<span class="ai-quick-chip" onclick="_aiChatSend(\'오늘 매출 어때?\')">오늘 매출 어때?</span>' +
          '<span class="ai-quick-chip" onclick="_aiChatSend(\'어떤 메뉴가 잘 팔려?\')">인기 메뉴는?</span>' +
          '<span class="ai-quick-chip" onclick="_aiChatSend(\'이번 주 매출 예측해줘\')">이번 주 예측</span>' +
          '<span class="ai-quick-chip" onclick="_aiChatSend(\'재고 부족한 거 알려줘\')">재고 부족</span>' +
        '</div>' +
        '<div class="ai-chat-input">' +
          '<input id="ai-chat-inp" placeholder="매장 운영에 대해 물어보세요..." ' +
            'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();_aiChatSend();}">' +
          '<button onclick="_aiChatSend()">전송</button>' +
        '</div>' +
      '</div>' +

      /* 벤또 카드 영역 */
      '<div style="display:flex;flex-direction:column;gap:12px;width:300px;flex-shrink:0">' +

        /* ① 매출 예측 */
        '<section class="bento-item fade-up-2" id="ai-card-forecast" style="width:100%">' +
          '<header class="bento-head">' +
            '<div><h3>AI 매출 예측</h3></div>' +
            '<button class="ai-chip" onclick="_filoAiForecast()">새로고침</button>' +
          '</header>' +
          '<div class="bento-body" id="ai-forecast-body">' + _aiSkeleton(4) + '</div>' +
        '</section>' +

        /* ② 메뉴 추천 */
        '<section class="bento-item fade-up-2" id="ai-card-menu" style="width:100%">' +
          '<header class="bento-head">' +
            '<div><h3>AI 메뉴 추천</h3></div>' +
            '<button class="ai-chip" onclick="_filoAiMenuRec()">새로고침</button>' +
          '</header>' +
          '<div class="bento-body" id="ai-menu-body">' + _aiSkeleton(5) + '</div>' +
        '</section>' +

      '</div>' +
    '</div>' +

  '</div>';

  _filoAiBriefing('ai-briefing');
  _filoAiForecast();
  _filoAiMenuRec();
}

/* ═════════════════════════════════════════════════════════════
   AI 채팅 전송 / 응답 처리
   ═════════════════════════════════════════════════════════════ */
window._aiChatSend = function(preset) {
  var inp = document.getElementById('ai-chat-inp');
  var msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;
  var text = preset || (inp && inp.value.trim()) || '';
  if (!text) return;
  if (inp) inp.value = '';

  /* 사용자 메시지 */
  var uDiv = document.createElement('div');
  uDiv.className = 'ai-msg user';
  uDiv.textContent = text;
  msgs.appendChild(uDiv);

  /* 로딩 버블 */
  var thinkDiv = document.createElement('div');
  thinkDiv.className = 'ai-msg ai thinking';
  thinkDiv.textContent = '생각 중...';
  msgs.appendChild(thinkDiv);
  msgs.scrollTop = msgs.scrollHeight;

  _aiChatHistory.push({role:'user', content:text});

  var did = _aiDid();
  _aiPost('/api/ai-chat', {did: did, messages: _aiChatHistory.slice(-8)})
    .then(function(r) {
      thinkDiv.classList.remove('thinking');
      if (!r.ok) {
        thinkDiv.textContent = r.error || '응답을 가져오지 못했습니다.';
        return;
      }
      thinkDiv.textContent = r.reply;
      _aiChatHistory.push({role:'assistant', content:r.reply});
      msgs.scrollTop = msgs.scrollHeight;
    })
    .catch(function() {
      thinkDiv.textContent = '네트워크 오류가 발생했습니다.';
    });
};

/* ═════════════════════════════════════════════════════════════
   2. AI 매출 예측
   ═════════════════════════════════════════════════════════════ */
function _filoAiForecast() {
  var body = document.getElementById('ai-forecast-body');
  if (!body) return;
  var did = _aiDid();
  if (!did) { _aiErr(body, '매장 정보를 불러오지 못했습니다. 다시 로그인해 주세요.'); return; }

  body.innerHTML = _aiSkeleton(4);
  _aiPost('/api/ai-forecast', { did: did }).then(function (r) {
    if (!r.ok) { _aiErr(body, r.error || '예측을 불러오지 못했습니다.', '_filoAiForecast()'); return; }
    if (r.insufficient) {
      body.innerHTML = '<div class="ai-empty">' +
        '<div style="font-size:12px;color:var(--t2);line-height:1.6">' + _aiEsc(r.message) + '</div></div>';
      return;
    }

    var t = r.tomorrow;
    var max = Math.max.apply(null, r.week.map(function (w) { return w.high || w.amount; })) || 1;
    var trendUp = r.trend === 'up';

    body.innerHTML =
      /* 내일 예측 대형 수치 */
      '<div class="ai-metric-row">' +
        '<div class="ai-metric">' +
          '<div class="ai-metric-label">내일 (' + _aiEsc(t.date.slice(5)) + ' ' + _aiEsc(t.dow) + ')</div>' +
          '<div class="ai-metric-val" id="ai-fc-val">' + _aiWon(t.amount) + '</div>' +
          '<div class="ai-metric-range">' + _aiWon(t.low) + ' ~ ' + _aiWon(t.high) + '</div>' +
        '</div>' +
        '<div class="ai-metric-side">' +
          '<div class="ai-gauge" style="--pct:' + r.confidence + '">' +
            '<span>' + r.confidence + '<small>%</small></span>' +
          '</div>' +
          '<div class="ai-metric-label" style="text-align:center;margin-top:6px">신뢰도</div>' +
        '</div>' +
      '</div>' +

      /* 7일 예측 막대 */
      '<div class="ai-bars">' +
        r.week.map(function (w) {
          var h = Math.max(6, Math.round(w.amount / max * 100));
          return '<div class="ai-bar-col" title="' + _aiEsc(w.date) + ' ' + _aiWon(w.amount) + '">' +
            '<div class="ai-bar-track"><div class="ai-bar-fill" style="height:' + h + '%"></div></div>' +
            '<div class="ai-bar-lbl">' + _aiEsc(w.dow) + '</div></div>';
        }).join('') +
      '</div>' +

      /* 요약 지표 */
      '<div class="ai-stat-grid">' +
        '<div class="ai-stat"><span>다음 7일 합계</span><strong>' + _aiWon(r.weekTotal) + '</strong></div>' +
        '<div class="ai-stat"><span>최근 7일 대비</span><strong class="' + (r.wowPct >= 0 ? 'up' : 'down') + '">' +
          (r.wowPct >= 0 ? '▲ +' : '▼ ') + r.wowPct + '%</strong></div>' +
        '<div class="ai-stat"><span>평균 객단가</span><strong>' + _aiWon(r.avgTicket) + '</strong></div>' +
        '<div class="ai-stat"><span>추세</span><strong class="' + (trendUp ? 'up' : 'down') + '">' +
          (trendUp ? '상승' : '하락') + ' ' + _aiWon(Math.abs(r.trendPerDay)) + '/일</strong></div>' +
      '</div>' +

      /* AI 브리핑 */
      '<div class="ai-note">' +
        '<span class="ai-note-tag">' + (r.aiPowered ? 'AI 분석' : '통계 분석') + '</span>' +
        _aiEsc(r.insight) +
      '</div>' +
      '<div class="ai-foot">최근 ' + r.sampleDays + '일 · ' + r.txCount + '건 결제 기준</div>';
  });
}

/* ═════════════════════════════════════════════════════════════
   3. AI 메뉴 추천 (날씨 · 시간대 · 재고)
   ═════════════════════════════════════════════════════════════ */
function _filoAiMenuRec() {
  var body = document.getElementById('ai-menu-body');
  if (!body) return;
  var did = _aiDid();
  if (!did) { _aiErr(body, '매장 정보를 불러오지 못했습니다.'); return; }

  body.innerHTML = _aiSkeleton(5);

  function run(lat, lon) {
    var payload = { did: did };
    if (lat != null) { payload.lat = lat; payload.lon = lon; }
    _aiPost('/api/ai-menu-recommend', payload).then(function (r) {
      if (!r.ok) { _aiErr(body, r.error || '추천을 불러오지 못했습니다.', '_filoAiMenuRec()'); return; }
      if (r.insufficient) {
        body.innerHTML = '<div class="ai-empty">' +
          '<div style="font-size:12px;color:var(--t2);line-height:1.6">' + _aiEsc(r.message) + '</div></div>';
        return;
      }
      var w = r.weather;
      body.innerHTML =
        /* 날씨 · 시간대 컨텍스트 */
        '<div class="ai-ctx">' +
          '<div class="ai-ctx-item"><span class="ai-ctx-ic">' + (w ? w.icon : '○') + '</span>' +
            '<div><strong>' + (w ? _aiEsc(w.label) + ' ' + Math.round(w.temp) + '°C' : '날씨 정보 없음') + '</strong>' +
            '<small>' + r.hour + '시 · ' + _aiEsc(r.timeLabel) + '</small></div></div>' +
        '</div>' +

        /* 추천 리스트 */
        '<div class="ai-rec-list">' +
          r.recommends.map(function (m, i) {
            return '<div class="ai-rec' + (i === 0 ? ' ai-rec-top' : '') + '">' +
              '<div class="ai-rec-rank">' + (i + 1) + '</div>' +
              '<div class="ai-rec-emoji">' + _aiEsc(m.emoji) + '</div>' +
              '<div class="ai-rec-main">' +
                '<div class="ai-rec-name">' + _aiEsc(m.name) + '</div>' +
                '<div class="ai-rec-reason">' + _aiEsc(m.reason) + '</div>' +
              '</div>' +
              '<div class="ai-rec-side">' +
                '<div class="ai-rec-price">' + _aiWon(m.price) + '</div>' +
                '<div class="ai-rec-score"><i style="width:' + m.score + '%"></i></div>' +
              '</div></div>';
          }).join('') +
        '</div>' +

        /* 재고 부족 경고 */
        (r.lowStock && r.lowStock.length
          ? '<div class="ai-warn"><strong>[경고] 재고 부족으로 제외</strong>' +
            r.lowStock.map(function (m) { return '<span class="ai-warn-chip">' + _aiEsc(m.name) + ' · ' + _aiEsc(m.stockNote) + '</span>'; }).join('') +
            '</div>'
          : '') +

        '<div class="ai-note"><span class="ai-note-tag">' + (r.aiPowered ? 'AI 분석' : '규칙 분석') + '</span>' + _aiEsc(r.advice) + '</div>';
    });
  }

  /* 매장 위치 기준 날씨 — 실패하면 서버 기본값(부산)으로 폴백 */
  if (navigator.geolocation) {
    var done = false;
    var tid = setTimeout(function () { if (!done) { done = true; run(); } }, 3000);
    navigator.geolocation.getCurrentPosition(
      function (pos) { if (done) return; done = true; clearTimeout(tid); run(pos.coords.latitude, pos.coords.longitude); },
      function () { if (done) return; done = true; clearTimeout(tid); run(); },
      { timeout: 2500, maximumAge: 600000 }
    );
  } else run();
}

/* ═════════════════════════════════════════════════════════════
   7. 대시보드 한줄 브리핑
   ═════════════════════════════════════════════════════════════ */
function _filoAiBriefing(targetId) {
  var el = document.getElementById(targetId || 'ai-briefing');
  if (!el) return;
  var did = _aiDid();
  if (!did) { el.textContent = '매장 정보를 불러오는 중입니다'; return; }

  _aiPost('/api/ai-insight', { did: did }).then(function (r) {
    if (!el.isConnected) return;
    if (!r.ok) { el.textContent = '오늘의 브리핑을 불러오지 못했습니다'; return; }
    el.innerHTML = _aiEsc(r.insight) +
      (r.lowStockCount ? ' <span class="ai-hero-badge">재고 부족 ' + r.lowStockCount + '건</span>' : '');
  });
}

/* 전역 노출 (다른 모듈에서 호출) */
window._filoPageAI         = _filoPageAI;
window._filoAiForecast     = _filoAiForecast;
window._filoAiMenuRec      = _filoAiMenuRec;
window._filoAiBriefing     = _filoAiBriefing;

/* ══════════════════════════════════════════════════════
 * AIVO 마진 분석 페이지 — 프리미엄 대시보드
 * ══════════════════════════════════════════════════════ */
function _filoPageMargin(el){
 if(!el)el=document.getElementById('content');
 if(!el)return;
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did){el.innerHTML='<div style="text-align:center;padding:60px;color:#94A3B8">로그인 후 이용하세요</div>';return;}
 var now=new Date();
 var ym=now.getFullYear()+'-'+(now.getMonth()+1<10?'0':'')+(now.getMonth()+1);

 var kpiDefs=[
  {id:'kpi-revenue',label:'이번달 매출',color:'#6366f1',
   ic:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'},
  {id:'kpi-cost',label:'이번달 원가',color:'#f59e0b',
   ic:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>'},
  {id:'kpi-profit',label:'공제이익(식재료)',color:'#10b981',
   ic:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'},
  {id:'kpi-margin',label:'식재료 마진율',color:'#0ea5e9',
   ic:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>'},
 ];

 el.innerHTML='<div class="slide-up" style="max-width:1100px;margin:0 auto;padding-bottom:40px">'

  /* ── 헤더 ── */
  +'<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">'
  +'<div>'
  +'<div style="display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:.6px;margin-bottom:8px">'
  +'<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
  +'AIVO 마진 분석</div>'
  +'<div style="font-size:24px;font-weight:900;color:#0F172A;letter-spacing:-1px;line-height:1.1">마진 분석</div>'
  +'<div id="hero-sub" style="font-size:12px;color:#64748B;margin-top:4px">실시간 연동 중...</div>'
  +'</div>'
  +'<input type="month" id="mg-ym" value="'+ym+'" onchange="_filoMgTab(_mgTabIdx)" '
  +'style="padding:8px 14px;border:1.5px solid rgba(99,102,241,.25);border-radius:10px;font-size:13px;font-weight:600;color:#0F172A;background:#fff;cursor:pointer;box-shadow:0 1px 4px rgba(99,102,241,.1)">'
  +'</div>'

  /* ── 월 KPI 4개 ── */
  +'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px">'
  +kpiDefs.map(function(k){
   return '<div style="background:#fff;border:1.5px solid rgba(0,0,0,.06);border-radius:16px;padding:16px 14px;box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 12px rgba(0,0,0,.05);position:relative;overflow:hidden">'
    +'<div style="position:absolute;top:0;left:0;right:0;height:3px;background:'+k.color+';border-radius:16px 16px 0 0"></div>'
    +'<div style="display:flex;align-items:center;gap:5px;margin-bottom:10px;color:'+k.color+'">'+k.ic
    +'<span style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.4px">'+k.label+'</span></div>'
    +'<div id="'+k.id+'" style="font-size:20px;font-weight:900;color:'+k.color+';letter-spacing:-.5px">-</div>'
    +'</div>';
  }).join('')
  +'</div>'

  /* ── 오늘 실시간 ── */
  +'<div id="margin-live" style="margin-bottom:14px"></div>'

  /* ── 탭 바 ── */
  +'<div style="display:flex;gap:0;margin-bottom:14px;border-bottom:1.5px solid rgba(0,0,0,.07)">'
  +[['마진 분석','mgt-0'],['원가 등록','mgt-1'],['AI 인사이트','mgt-2']].map(function(t,i){
   var act=i===0;
   return '<button id="'+t[1]+'" onclick="_filoMgTab('+i+')" '
    +'style="padding:10px 16px;border:none;border-bottom:'+(act?'2.5px solid #6366f1':'2px solid transparent')+';cursor:pointer;font-size:13px;font-weight:'+(act?'800':'600')+';background:transparent;color:'+(act?'#6366f1':'#94A3B8')+';transition:.15s">'+t[0]+'</button>';
  }).join('')
  +'</div>'

  /* ── 탭 콘텐츠 ── */
  +'<div id="mg-content" style="background:#fff;border:1.5px solid rgba(0,0,0,.06);border-radius:16px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 12px rgba(0,0,0,.05);min-height:200px">'
  +'<div style="text-align:center;padding:30px;color:#94A3B8;font-size:13px">데이터 로딩 중...</div>'
  +'</div>'
  +'</div>';

 _filoMarginLoad();
}
window._filoPageMargin=_filoPageMargin;

