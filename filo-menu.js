/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      filo-menu.js
 * @description 메뉴관리·원가계산·마진율·재고알림·AI이미지생성
 */
// 의존성: filo-common.js
// 관련 컬렉션: filo_menus, menu_recipes, menu_costs
// ⚠️ 2026-07-12 filo-common.js에서 분리됨
//   포함: _filoRmAddRowDOM, _filoRmAddRow, _filoPageExpiry,
//          _filoLoadStockHistory, _filoAutoImageUrl (AI이미지 자동생성)
// 메뉴 저장 시 자동: 번역(EN/中/日) + AI이미지 생성(Pollinations.ai)
function _filoAutoImageUrl(name,category,emoji){
 var nameMap={
  '보리굴비':'korean dried yellow croaker fish banchan food photography',
  '낙지':'korean spicy octopus stir fry food photography',
  '전복':'korean abalone steamed food photography',
  '해물':'korean seafood dish food photography',
  '불고기':'korean beef bulgogi food photography',
  '장어':'korean grilled eel food photography',
  '비빔밥':'korean bibimbap mixed rice bowl food photography colorful',
  '물회':'korean cold raw fish soup hoe food photography',
  '홍합':'korean mussel seafood food photography',
  '꼬막':'korean cockle clam bibimbap food photography',
  '멍게':'korean sea squirt bibimbap food photography',
  '공기밥':'korean steamed white rice bowl food photography',
  '해초':'korean seaweed mussel rice bowl food photography',
  '굴비':'korean dried croaker fish meal food photography',
  '삼겹살':'korean pork belly bbq food photography',
  '갈비':'korean ribs grilled food photography',
  '냉면':'korean cold noodles food photography',
  '라면':'korean ramen noodle food photography',
  '떡볶이':'korean spicy rice cake tteokbokki food photography',
  '순대':'korean blood sausage soondae food photography',
  '김치찌개':'korean kimchi stew food photography',
  '된장찌개':'korean soybean paste stew food photography',
  '삼계탕':'korean ginseng chicken soup food photography',
  '족발':'korean pork feet food photography',
  '보쌈':'korean boiled pork wrap food photography',
  '파스타':'pasta italian food photography',
  '스테이크':'steak beef food photography',
  '샐러드':'fresh salad food photography',
  '커피':'coffee cup food photography',
  '케이크':'cake dessert food photography',
  '치킨':'korean fried chicken food photography',
  '피자':'pizza food photography',
  '버거':'burger hamburger food photography',
  '초밥':'japanese sushi food photography',
  '우동':'japanese udon noodle food photography',
  '라멘':'japanese ramen noodle food photography',
  '짜장':'korean jajangmyeon black noodle food photography',
  '짬뽕':'korean spicy seafood noodle food photography',
  '탕수육':'korean sweet sour pork food photography',
  '아메리카노':'iced americano black coffee cup food photography',
  '라떼':'cafe latte coffee art milk foam food photography',
  '카푸치노':'cappuccino coffee foam art cup food photography',
  '에스프레소':'espresso coffee shot cup food photography',
  '마키아토':'caramel macchiato coffee drink food photography',
  '콜드브루':'cold brew black coffee glass food photography',
  '아이스티':'iced tea glass drink food photography',
  '에이드':'korean ade fruit drink colorful glass food photography',
  '스무디':'smoothie fruit drink colorful glass food photography',
  '주스':'fresh juice glass drink food photography',
  '소주':'korean soju bottle shot glass drink food photography',
  '맥주':'cold beer glass mug foam food photography',
  '막걸리':'korean makgeolli rice wine bowl cup food photography',
  '와인':'wine glass red white food photography',
  '하이볼':'highball whisky cocktail glass food photography',
  '사케':'japanese sake rice wine food photography',
  '생맥주':'draft beer pint glass food photography',
  '크로와상':'croissant pastry bakery food photography',
  '스콘':'scone bakery food photography',
  '머핀':'muffin bakery cupcake food photography',
  '치즈케이크':'cheesecake dessert food photography',
  '마카롱':'macaron colorful dessert food photography',
  '와플':'waffle dessert food photography',
  '군만두':'korean fried dumplings gyoza food photography',
  '닭꼬치':'japanese yakitori chicken skewer food photography',
  '계란말이':'korean rolled omelette egg food photography',
  '감자전':'korean potato pancake jeon food photography',
  '두부':'korean tofu dish food photography',
  '오징어':'korean squid grilled food photography',
 };
 var catMap={
  '밥상':'korean table set meal banchan multiple dishes food photography',
  '프리미엄':'korean premium deluxe meal set food photography elegant',
  '단품':'korean single dish food photography',
  '사이드':'korean side dish rice food photography',
  '버거':'burger food photography',
  '치킨':'fried chicken food photography',
  '피자':'pizza food photography',
  '분식':'korean street food food photography',
  '음료':'beverage drink colorful glass food photography',
  '디저트':'dessert food photography',
  '카페':'cafe coffee drink food photography',
  '커피':'coffee cafe drink cup food photography',
  '주류':'korean alcohol beer soju drink bar food photography',
  '술':'korean alcohol beer soju drink food photography',
  '칵테일':'cocktail drink colorful glass food photography',
  '초밥':'japanese sushi roll food photography',
  '회':'korean raw fish sashimi hoe food photography',
  '면류':'korean noodle dish food photography',
  '찌개':'korean stew jjigae hot pot food photography',
  '탕':'korean soup broth hot pot food photography',
  '구이':'korean grilled meat bbq food photography',
  '볶음':'korean stir fry wok food photography',
  '튀김':'korean fried food tempura food photography',
  '전':'korean savory pancake jeon food photography',
  '한식':'korean traditional food photography',
  '중식':'chinese food photography',
  '일식':'japanese food photography',
  '양식':'western food photography',
 };
 var prompt='';
 var keys=Object.keys(nameMap);
 for(var i=0;i<keys.length;i++){
  if(name.indexOf(keys[i])>=0){prompt=nameMap[keys[i]];break;}
 }
 if(!prompt&&category&&catMap[category])prompt=catMap[category];
 if(!prompt)prompt='korean food dish food photography delicious';

 return fetch('/api/menu-image?q='+encodeURIComponent(prompt))
   .then(function(r){return r.json();})
   .then(function(d){return d.url||'';})
   .catch(function(){return '';});
}

function _filoRenderCostMgmt(did){
 var content=document.getElementById('mg-content');
 if(!content)return;
 _db.collection('menu_costs').where('dealerId','==',did).get().then(function(snap){
  var items=[];
  snap.forEach(function(doc){items.push(Object.assign({_id:doc.id},doc.data()));});
  var html='<div class="card" style="margin-bottom:12px">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:14px">메뉴 원가 등록</div>'+
  '<div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:10px;align-items:end">'+
  '<div><label style="font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:4px">메뉴명</label>'+
  '<input id="mc-name" placeholder="아이스 아메리카노" style="width:100%;padding:8px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px"></div>'+
  '<div><label style="font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:4px">판매가(원)</label>'+
  '<input id="mc-price" type="number" placeholder="4500" style="width:100%;padding:8px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px"></div>'+
  '<div><label style="font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:4px">원가(원)</label>'+
  '<input id="mc-cost" type="number" placeholder="800" style="width:100%;padding:8px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px"></div>'+
  '<button onclick="_filoSaveCost(\''+did+'\')" style="padding:9px 16px;background:var(--br);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">+ 추가</button>'+
  '</div>'+
  '<div style="font-size:10px;color:var(--t3);padding:6px 0">원가 등록 시 POS 결제에서 자동으로 마진 계산됩니다</div>'+
  '</div>';

  if(items.length){
   html+='<div class="card">'+
   '<div style="font-size:13px;font-weight:800;margin-bottom:12px">등록된 메뉴 원가 ('+items.length+'개)</div>'+
   '<div style="display:grid;grid-template-columns:1fr 70px 70px 60px auto;gap:6px;padding:0 4px 8px;border-bottom:1px solid var(--bd)">'+
   ['메뉴명','판매가','원가','마진율',''].map(function(h){return '<div style="font-size:10px;color:var(--t3);font-weight:700">'+h+'</div>';}).join('')+'</div>'+
   items.map(function(m){
    var rate=m.price>0?Math.round((m.price-m.cost)/m.price*100):0;
    var badge=rate>=60?'high':rate>=40?'mid':'low';
    return '<div class="menu-cost-row">'+
    '<div style="font-size:12px;font-weight:700">'+esc(m.name)+'</div>'+
    '<div style="font-size:12px;color:var(--t2)">₩'+Number(m.price||0).toLocaleString()+'</div>'+
    '<div style="font-size:12px;color:#ef4444">₩'+Number(m.cost||0).toLocaleString()+'</div>'+
    '<span class="margin-badge '+badge+'">'+rate+'%</span>'+
    '<button onclick="_filoDelCost(\''+did+'\',\''+m._id+'\')" style="padding:4px 8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:6px;color:#ef4444;font-size:10px;cursor:pointer">삭제</button>'+
    '</div>';
   }).join('')+'</div>';
  }
  content.innerHTML=html;
 });
}

function _filoSaveCost(did){
 var name=(document.getElementById('mc-name').value||'').trim();
 var price=parseInt(document.getElementById('mc-price').value)||0;
 var cost=parseInt(document.getElementById('mc-cost').value)||0;
 if(!name){_filoToast('메뉴명을 입력하세요');return;}
 _db.collection('menu_costs').add({dealerId:did,name:name,price:price,cost:cost,createdAt:_nowISO()}).then(function(){
  _filoToast('원가 등록 완료');
  document.getElementById('mc-name').value='';
  document.getElementById('mc-price').value='';
  document.getElementById('mc-cost').value='';
  _filoRenderCostMgmt(did);
 }).catch(function(e){_filoToast(e.message);});
}

function _filoDelCost(did,id){
 if(!confirm('삭제할까요?'))return;
 _db.collection('menu_costs').doc(id).delete().then(function(){
  _filoToast('삭제 완료');_filoRenderCostMgmt(did);
 });
}
function _filoPageExpiry(el){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">로그인 후 이용하세요</div>';return;}
 el.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">로딩 중...</div>';
 var today=_today();
 firebase.firestore().collection('inventory').where('dealerId','==',did).get().then(function(snap){
 var expired=[],warn=[],ok=[];
 snap.forEach(function(doc){
 var d=Object.assign({id:doc.id},doc.data());
 if(!d.expiryDate){ok.push(d);return;}
 if(d.expiryDate<today) expired.push(d);
 else if(d.expiryDate<=new Date(Date.now()+7*86400000).toISOString().slice(0,10)) warn.push(d);
 else ok.push(d);
 });
 var html='<div style="max-width:860px;margin:0 auto">';
 html+='<div class="card" style="margin-bottom:10px">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:12px">유통기한 등록</div>'+
 '<div style="display:grid;grid-template-columns:2fr 1fr auto;gap:8px;align-items:end">'+
 '<div class="fg"><label>품목</label><select id="exp-item" class="inp" style="font-size:12px"><option value="">-- 선택 --</option>';
 snap.forEach(function(doc){html+='<option value="'+doc.id+'">'+(doc.data().name||'')+'</option>';});
 html+='</select></div>'+
 '<div class="fg"><label>유통기한</label><input type="date" id="exp-date" class="inp"></div>'+
 '<button onclick="_filoExpSave(\''+did+'\')" style="padding:10px 12px;background:var(--br);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">저장</button>'+
 '</div></div>';
 if(expired.length){
 html+='<div class="card" style="border:2px solid #ef4444;margin-bottom:10px">'+
 '<div style="font-size:13px;font-weight:800;color:#ef4444;margin-bottom:8px">만료 ('+expired.length+'개) — 즉시 폐기</div>';
 expired.forEach(function(d){
 html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(239,68,68,.2)">'+
 '<span style="font-size:12px;font-weight:700">'+d.name+'</span>'+
 '<span style="font-size:11px;color:#ef4444;font-weight:700">'+d.expiryDate+' 만료</span></div>';
 });
 html+='</div>';
 }
 if(warn.length){
 html+='<div class="card" style="border:1px solid #f59e0b;margin-bottom:10px">'+
 '<div style="font-size:13px;font-weight:800;color:#f59e0b;margin-bottom:8px">7일 이내 만료 ('+warn.length+'개)</div>';
 warn.forEach(function(d){
 var dL=Math.ceil((new Date(d.expiryDate)-new Date(today))/86400000);
 html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(245,158,11,.2)">'+
 '<span style="font-size:12px;font-weight:700">'+d.name+'</span>'+
 '<span style="font-size:11px;color:#f59e0b;font-weight:700">D-'+dL+'</span></div>';
 });
 html+='</div>';
 }
 html+='<div class="card"><div style="font-size:13px;font-weight:800;margin-bottom:10px">전체 목록</div>';
 snap.forEach(function(doc){
 var d=doc.data();
 var dL=d.expiryDate?Math.ceil((new Date(d.expiryDate)-new Date(today))/86400000):null;
 var color=dL===null?'var(--t3)':dL<0?'#ef4444':dL<=7?'#f59e0b':'#22c55e';
 html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px">'+d.name+'</span>'+
 '<span style="font-size:11px;font-weight:700;color:'+color+'">'+
 (d.expiryDate?d.expiryDate+' (D-'+dL+')':'미등록')+'</span></div>';
 });
 html+='</div></div>';
 el.innerHTML=html;
 }).catch(function(e){el.innerHTML='<div class="card" style="color:#ef4444">'+e.message+'</div>';});
}
function _filoLoadStockHistory(did, elId, type){
 var col=type==='in'?'inventory_in':'inventory_out';
 _db.collection(col).where('dealerId','==',did).orderBy('createdAt','desc').limit(20).get()
 .then(function(snap){
 var el=document.getElementById(elId);if(!el)return;
 if(snap.empty){el.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">이력 없음</div>';return;}
 el.innerHTML=snap.docs.map(function(doc){
 var d=doc.data();
 var itemName=d.itemName||d.itemId||'';
 var icon=type==='in'?'↓':'↑';
 var color=type==='in'?'#22c55e':'#ef4444';
 var typeLabel={'sale':'판매','use':'사용','waste':'폐기','return':'반품','etc':'기타'}[d.type]||'';
 return '<div class="stock-item" style="display:flex;align-items:center;gap:10px;padding:12px 14px">'+
 '<div style="font-size:18px">'+icon+'</div>'+
 '<div style="flex:1">'+
 '<div style="font-size:13px;font-weight:700">'+esc(d.itemId||'')+(typeLabel?' · '+typeLabel:'')+'</div>'+
 '<div style="font-size:11px;color:var(--t3)">'+(d.supplier||d.memo||'')+(d.expiry?' · 유통기한:'+d.expiry:'')+'</div>'+
 '</div>'+
 '<div style="text-align:right">'+
 '<div style="font-size:15px;font-weight:900;color:'+color+'">'+(type==='in'?'+':'-')+d.qty+'개</div>'+
 '<div style="font-size:10px;color:var(--t3)">'+(d.date||'')+'</div>'+
 '</div></div>';
 }).join('');
 }).catch(function(){});
 _db.collection('inventory').where('dealerId','==',did).get().then(function(snap){
 var map={};
 snap.forEach(function(doc){map[doc.id]=doc.data().name||doc.id;});
 var el=document.getElementById(elId);if(!el)return;
 el.querySelectorAll('.stock-item').forEach(function(row,i){
 });
 }).catch(function(){});
}

// 재고 하한선 푸시 알림
function _filoStockLowAlert(menuName, stock, stockMin){
 var title='재고 부족: '+menuName;
 var body='현재 재고 '+stock+'개 (기준: '+stockMin+'개 이하)';
 // 브라우저 푸시 알림
 if('Notification' in window && Notification.permission==='granted'){
  new Notification(title,{body:body,icon:'/filo-icon-192.png',tag:'stock-'+menuName,vibrate:[200,100,200]});
 } else if('Notification' in window && Notification.permission!=='denied'){
  Notification.requestPermission().then(function(p){
   if(p==='granted') new Notification(title,{body:body,icon:'/filo-icon-192.png',tag:'stock-'+menuName});
  });
 }
 // 화면 토스트도 표시
 _filoToast(menuName+' 재고 부족 ('+stock+'개)');
}

/* ══════════════════════════════════════════
   🍽 업종별 기본 메뉴 템플릿 (filo-test.md 명세)
   업종 키는 filo-common.js 의 _FILO_THEMES 와 동일.
   q  = Pexels 검색어 (worker /api/menu-image 로 전달)
   tr = EN/中/日 번역 (등록 즉시 다국어 주문 페이지 노출)
   ══════════════════════════════════════════ */
var _FILO_MENU_TEMPLATES = {
 /* ────────────────── 카페 (30 items) ────────────────── */
 cafe: [
  {name:'에스프레소',price:3000,category:'에스프레소',q:'espresso shot cup',tr:{en:'Espresso',zh:'浓缩咖啡',ja:'エスプレッソ'}},
  {name:'아메리카노(ICE)',price:4000,category:'아메리카노',q:'iced americano coffee glass',tr:{en:'Iced Americano',zh:'冰美式',ja:'アイスアメリカーノ'}},
  {name:'아메리카노(HOT)',price:4000,category:'아메리카노',q:'hot americano coffee cup',tr:{en:'Hot Americano',zh:'热美式',ja:'ホットアメリカーノ'}},
  {name:'드립커피',price:5000,category:'아메리카노',q:'pour over drip coffee cup',tr:{en:'Drip Coffee',zh:'手冲咖啡',ja:'ドリップコーヒー'}},
  {name:'카페라떼(ICE)',price:5000,category:'라떼',q:'iced cafe latte glass',tr:{en:'Iced Cafe Latte',zh:'冰拿铁',ja:'アイスラテ'}},
  {name:'카페라떼(HOT)',price:5000,category:'라떼',q:'hot cafe latte art cup',tr:{en:'Hot Cafe Latte',zh:'热拿铁',ja:'ホットラテ'}},
  {name:'카푸치노',price:5000,category:'라떼',q:'cappuccino foam art cup',tr:{en:'Cappuccino',zh:'卡布奇诺',ja:'カプチーノ'}},
  {name:'바닐라라떼',price:5500,category:'라떼',q:'vanilla latte coffee cup',tr:{en:'Vanilla Latte',zh:'香草拿铁',ja:'バニララテ'}},
  {name:'카라멜마키아토',price:5500,category:'라떼',q:'caramel macchiato coffee drink',tr:{en:'Caramel Macchiato',zh:'焦糖玛奇朵',ja:'キャラメルマキアート'}},
  {name:'플랫화이트',price:5500,category:'라떼',q:'flat white coffee small cup',tr:{en:'Flat White',zh:'白咖啡',ja:'フラットホワイト'}},
  {name:'말차라떼(ICE)',price:5500,category:'논커피',q:'iced matcha green tea latte',tr:{en:'Iced Matcha Latte',zh:'冰抹茶拿铁',ja:'アイス抹茶ラテ'}},
  {name:'말차라떼(HOT)',price:5500,category:'논커피',q:'hot matcha green tea latte cup',tr:{en:'Hot Matcha Latte',zh:'热抹茶拿铁',ja:'ホット抹茶ラテ'}},
  {name:'초코라떼',price:5000,category:'논커피',q:'hot chocolate cocoa latte cup',tr:{en:'Chocolate Latte',zh:'巧克力拿铁',ja:'チョコレートラテ'}},
  {name:'얼그레이라떼',price:5000,category:'논커피',q:'earl grey tea latte cup',tr:{en:'Earl Grey Latte',zh:'伯爵奶茶',ja:'アールグレイラテ'}},
  {name:'히비스커스티',price:4500,category:'논커피',q:'hibiscus herbal tea red cup',tr:{en:'Hibiscus Tea',zh:'玫瑰花茶',ja:'ハイビスカスティー'}},
  {name:'자몽에이드',price:5500,category:'에이드',q:'grapefruit ade sparkling soda glass',tr:{en:'Grapefruit Ade',zh:'西柚气泡饮',ja:'グレープフルーツエード'}},
  {name:'레몬에이드',price:5500,category:'에이드',q:'lemon ade sparkling drink glass',tr:{en:'Lemon Ade',zh:'柠檬气泡饮',ja:'レモンエード'}},
  {name:'청포도에이드',price:5500,category:'에이드',q:'green grape ade soda drink',tr:{en:'Green Grape Ade',zh:'青葡萄气泡饮',ja:'グリーングレープエード'}},
  {name:'딸기에이드',price:5500,category:'에이드',q:'strawberry ade pink soda drink',tr:{en:'Strawberry Ade',zh:'草莓气泡饮',ja:'ストロベリーエード'}},
  {name:'복숭아아이스티',price:5000,category:'에이드',q:'peach iced tea glass summer',tr:{en:'Peach Iced Tea',zh:'桃子冰茶',ja:'ピーチアイスティー'}},
  {name:'크로와상',price:3500,category:'베이커리',q:'golden croissant bakery close up',tr:{en:'Croissant',zh:'可颂',ja:'クロワッサン'}},
  {name:'소금빵',price:2500,category:'베이커리',q:'salt bread roll butter baked',tr:{en:'Salt Bread',zh:'盐面包',ja:'塩パン'}},
  {name:'크림치즈베이글',price:4500,category:'베이커리',q:'cream cheese bagel sandwich',tr:{en:'Cream Cheese Bagel',zh:'奶油芝士贝果',ja:'クリームチーズベーグル'}},
  {name:'버터스콘',price:3500,category:'베이커리',q:'butter scone bakery plate',tr:{en:'Butter Scone',zh:'黄油司康',ja:'バタースコーン'}},
  {name:'마들렌(2pc)',price:3000,category:'베이커리',q:'madeleine french cake close up',tr:{en:'Madeleine (2pc)',zh:'玛德莲蛋糕(2个)',ja:'マドレーヌ(2個)'}},
  {name:'에그타르트',price:3000,category:'베이커리',q:'egg tart custard pastry',tr:{en:'Egg Tart',zh:'蛋挞',ja:'エッグタルト'}},
  {name:'뉴욕치즈케이크',price:6500,category:'디저트',q:'new york cheesecake slice plate',tr:{en:'NY Cheesecake',zh:'纽约芝士蛋糕',ja:'NYチーズケーキ'}},
  {name:'티라미수',price:6000,category:'디저트',q:'tiramisu dessert cup plate',tr:{en:'Tiramisu',zh:'提拉米苏',ja:'ティラミス'}},
  {name:'초코브라우니',price:4500,category:'디저트',q:'chocolate brownie cake fudge',tr:{en:'Chocolate Brownie',zh:'巧克力布朗尼',ja:'チョコブラウニー'}},
  {name:'딸기케이크(슬라이스)',price:7000,category:'디저트',q:'strawberry cream cake slice',tr:{en:'Strawberry Cake Slice',zh:'草莓蛋糕(片)',ja:'いちごケーキ(スライス)'}}
 ],
 /* ────────────────── 한식당 (28 items) ────────────────── */
 korean: [
  {name:'된장찌개',price:8000,category:'찌개/국',q:'korean doenjang jjigae soybean stew',tr:{en:'Soybean Paste Stew',zh:'大酱汤',ja:'テンジャンチゲ'}},
  {name:'김치찌개',price:8000,category:'찌개/국',q:'kimchi jjigae stew korean pork',tr:{en:'Kimchi Stew',zh:'泡菜汤',ja:'キムチチゲ'}},
  {name:'순두부찌개',price:8000,category:'찌개/국',q:'sundubu jjigae soft tofu stew spicy',tr:{en:'Soft Tofu Stew',zh:'嫩豆腐汤',ja:'スンドゥブチゲ'}},
  {name:'부대찌개(2인)',price:20000,category:'찌개/국',q:'budae jjigae army stew korean',tr:{en:'Army Stew (2 ppl)',zh:'部队火锅(2人)',ja:'ブデチゲ(2人前)'}},
  {name:'갈비탕',price:13000,category:'찌개/국',q:'korean galbitang short rib soup',tr:{en:'Short Rib Soup',zh:'排骨汤',ja:'カルビタン'}},
  {name:'설렁탕',price:11000,category:'찌개/국',q:'seolleongtang ox bone broth soup korean',tr:{en:'Ox Bone Soup',zh:'雪浓汤',ja:'ソルロンタン'}},
  {name:'비빔밥',price:9000,category:'밥류',q:'bibimbap korean colorful rice bowl',tr:{en:'Bibimbap',zh:'拌饭',ja:'ビビンバ'}},
  {name:'돌솥비빔밥',price:10000,category:'밥류',q:'dolsot bibimbap stone pot korean',tr:{en:'Stone Pot Bibimbap',zh:'石锅拌饭',ja:'石焼ビビンバ'}},
  {name:'제육볶음',price:10000,category:'밥류',q:'jeyuk bokkeum spicy pork stir fry',tr:{en:'Spicy Stir-fried Pork',zh:'辣炒猪肉',ja:'チェユクボックム'}},
  {name:'오징어볶음',price:10000,category:'밥류',q:'ojingeo bokkeum spicy squid stir fry',tr:{en:'Spicy Stir-fried Squid',zh:'辣炒鱿鱼',ja:'イカ炒め'}},
  {name:'닭갈비',price:11000,category:'밥류',q:'dak galbi spicy chicken stir fry korean',tr:{en:'Spicy Chicken Stir-fry',zh:'辣炒鸡肉',ja:'タッカルビ'}},
  {name:'불고기덮밥',price:11000,category:'밥류',q:'bulgogi rice bowl korean beef',tr:{en:'Bulgogi Rice Bowl',zh:'烤牛肉饭',ja:'プルコギ丼'}},
  {name:'공기밥',price:1000,category:'사이드',q:'steamed white rice bowl korean',tr:{en:'Steamed Rice',zh:'米饭',ja:'ライス'}},
  {name:'삼겹살(200g)',price:15000,category:'구이',q:'samgyeopsal pork belly grill korean',tr:{en:'Pork Belly (200g)',zh:'五花肉(200g)',ja:'サムギョプサル(200g)'}},
  {name:'목살(200g)',price:14000,category:'구이',q:'moksal pork neck grill korean',tr:{en:'Pork Neck (200g)',zh:'梅花肉(200g)',ja:'豚首肉(200g)'}},
  {name:'불고기(200g)',price:16000,category:'구이',q:'bulgogi korean marinated beef grill',tr:{en:'Bulgogi (200g)',zh:'烤牛肉(200g)',ja:'プルコギ(200g)'}},
  {name:'물냉면',price:10000,category:'면류',q:'mul naengmyeon cold buckwheat noodle soup',tr:{en:'Cold Noodle Soup',zh:'水冷面',ja:'水冷麺'}},
  {name:'비빔냉면',price:10000,category:'면류',q:'bibim naengmyeon spicy mixed cold noodles',tr:{en:'Spicy Mixed Cold Noodles',zh:'拌冷面',ja:'ビビン冷麺'}},
  {name:'칼국수',price:9000,category:'면류',q:'kalguksu knife cut noodle soup korean',tr:{en:'Knife-cut Noodle Soup',zh:'刀切面',ja:'カルグクス'}},
  {name:'잔치국수',price:8000,category:'면류',q:'janchi guksu vermicelli noodle soup',tr:{en:'Vermicelli Noodle Soup',zh:'宴会面条',ja:'ジャンチグクス'}},
  {name:'파전',price:10000,category:'전',q:'pajeon korean green onion pancake',tr:{en:'Green Onion Pancake',zh:'葱饼',ja:'パジョン'}},
  {name:'김치전',price:10000,category:'전',q:'kimchi jeon korean pancake',tr:{en:'Kimchi Pancake',zh:'泡菜煎饼',ja:'キムチチヂミ'}},
  {name:'해물파전',price:14000,category:'전',q:'haemul pajeon seafood pancake korean',tr:{en:'Seafood Green Onion Pancake',zh:'海鲜葱饼',ja:'海鮮パジョン'}},
  {name:'계란찜',price:4000,category:'사이드',q:'gyeran jjim steamed egg korean',tr:{en:'Steamed Egg',zh:'鸡蛋羹',ja:'ケランチム'}},
  {name:'두부김치',price:11000,category:'사이드',q:'dubu kimchi tofu kimchi korean',tr:{en:'Tofu & Kimchi',zh:'豆腐泡菜',ja:'豆腐キムチ'}},
  {name:'막걸리',price:5000,category:'음료',q:'makgeolli korean rice wine bowl',tr:{en:'Makgeolli',zh:'马格利',ja:'マッコリ'}},
  {name:'소주',price:4000,category:'음료',q:'soju korean spirit bottle glass',tr:{en:'Soju',zh:'烧酒',ja:'焼酎'}},
  {name:'생맥주(500ml)',price:5000,category:'음료',q:'draft beer cold glass pint',tr:{en:'Draft Beer (500ml)',zh:'生啤(500ml)',ja:'生ビール(500ml)'}}
 ],
 /* ────────────────── 일식/횟집 (30 items) ────────────────── */
 japanese: [
  {name:'연어초밥(2pc)',price:5000,category:'초밥',q:'salmon nigiri sushi pair',tr:{en:'Salmon Sushi (2pc)',zh:'三文鱼寿司(2贯)',ja:'サーモン寿司(2貫)'}},
  {name:'참치초밥(2pc)',price:5000,category:'초밥',q:'tuna nigiri sushi dark red',tr:{en:'Tuna Sushi (2pc)',zh:'金枪鱼寿司(2贯)',ja:'マグロ寿司(2貫)'}},
  {name:'광어초밥(2pc)',price:5000,category:'초밥',q:'halibut flounder sushi nigiri',tr:{en:'Flounder Sushi (2pc)',zh:'比目鱼寿司(2贯)',ja:'ヒラメ寿司(2貫)'}},
  {name:'새우초밥(2pc)',price:4000,category:'초밥',q:'prawn shrimp nigiri sushi',tr:{en:'Shrimp Sushi (2pc)',zh:'虾寿司(2贯)',ja:'エビ寿司(2貫)'}},
  {name:'우니(성게)초밥(1pc)',price:6000,category:'초밥',q:'uni sea urchin sushi nigiri',tr:{en:'Sea Urchin Sushi (1pc)',zh:'海胆寿司(1贯)',ja:'ウニ寿司(1貫)'}},
  {name:'초밥 10pc 세트',price:22000,category:'세트',q:'sushi set platter 10 pieces',tr:{en:'Sushi Set (10pc)',zh:'寿司套餐(10贯)',ja:'寿司セット(10貫)'}},
  {name:'초밥 20pc 세트',price:42000,category:'세트',q:'large sushi platter assorted 20 pieces',tr:{en:'Sushi Set (20pc)',zh:'寿司套餐(20贯)',ja:'寿司セット(20貫)'}},
  {name:'스파이시참치롤(8pc)',price:14000,category:'롤',q:'spicy tuna roll maki sushi',tr:{en:'Spicy Tuna Roll (8pc)',zh:'辣金枪鱼卷(8件)',ja:'スパイシーツナロール(8pc)'}},
  {name:'새우튀김롤(8pc)',price:13000,category:'롤',q:'shrimp tempura roll maki',tr:{en:'Shrimp Tempura Roll (8pc)',zh:'炸虾卷(8件)',ja:'エビ天巻き(8pc)'}},
  {name:'아보카도연어롤(8pc)',price:15000,category:'롤',q:'avocado salmon roll maki sushi',tr:{en:'Avocado Salmon Roll (8pc)',zh:'牛油果三文鱼卷(8件)',ja:'アボカドサーモンロール(8pc)'}},
  {name:'크런치롤(8pc)',price:14000,category:'롤',q:'crunchy roll tempura maki sushi',tr:{en:'Crunchy Roll (8pc)',zh:'脆皮卷(8件)',ja:'クランチーロール(8pc)'}},
  {name:'광어회(소)',price:38000,category:'회',q:'flounder halibut sashimi platter',tr:{en:'Flounder Sashimi (S)',zh:'比目鱼刺身(小)',ja:'ヒラメ刺身(小)'}},
  {name:'연어회(소)',price:35000,category:'회',q:'salmon sashimi plate orange slices',tr:{en:'Salmon Sashimi (S)',zh:'三文鱼刺身(小)',ja:'サーモン刺身(小)'}},
  {name:'모둠회(중)',price:55000,category:'회',q:'assorted sashimi platter premium',tr:{en:'Assorted Sashimi (M)',zh:'什锦刺身(中)',ja:'刺身盛り合わせ(中)'}},
  {name:'참치회(소)',price:42000,category:'회',q:'tuna sashimi slices plate',tr:{en:'Tuna Sashimi (S)',zh:'金枪鱼刺身(小)',ja:'マグロ刺身(小)'}},
  {name:'우동(미소/간장)',price:9000,category:'면류',q:'japanese udon noodle soup bowl',tr:{en:'Udon Noodle Soup',zh:'乌冬面',ja:'うどん'}},
  {name:'소바(냉)',price:10000,category:'면류',q:'cold soba buckwheat noodle japanese',tr:{en:'Cold Soba',zh:'冷荞麦面',ja:'冷たいそば'}},
  {name:'라멘(돈코츠)',price:12000,category:'면류',q:'tonkotsu ramen pork broth japanese',tr:{en:'Tonkotsu Ramen',zh:'猪骨拉面',ja:'豚骨ラーメン'}},
  {name:'카레우동',price:11000,category:'면류',q:'curry udon japanese noodle soup',tr:{en:'Curry Udon',zh:'咖喱乌冬',ja:'カレーうどん'}},
  {name:'새우튀김(5pc)',price:13000,category:'튀김',q:'ebi tempura shrimp fried japanese',tr:{en:'Shrimp Tempura (5pc)',zh:'炸虾(5个)',ja:'エビ天ぷら(5本)'}},
  {name:'모둠튀김',price:16000,category:'튀김',q:'assorted tempura platter japanese',tr:{en:'Assorted Tempura',zh:'什锦天妇罗',ja:'天ぷら盛り合わせ'}},
  {name:'가라아게(닭튀김)',price:10000,category:'튀김',q:'karaage japanese fried chicken',tr:{en:'Karaage',zh:'炸鸡(唐揚)',ja:'唐揚げ'}},
  {name:'닭꼬치(2개)',price:5000,category:'구이',q:'yakitori chicken skewer grill japanese',tr:{en:'Yakitori (2pc)',zh:'烤鸡串(2串)',ja:'焼き鳥(2本)'}},
  {name:'연어구이',price:16000,category:'구이',q:'grilled salmon teriyaki japanese',tr:{en:'Grilled Salmon',zh:'烤三文鱼',ja:'鮭の塩焼き'}},
  {name:'미소시루',price:2000,category:'사이드',q:'miso soup japanese bowl',tr:{en:'Miso Soup',zh:'味噌汤',ja:'みそ汁'}},
  {name:'차완무시',price:4000,category:'사이드',q:'chawanmushi steamed egg custard japanese',tr:{en:'Steamed Egg Custard',zh:'茶碗蒸',ja:'茶碗蒸し'}},
  {name:'사케(1홉)',price:9000,category:'주류',q:'sake japanese rice wine glass bottle',tr:{en:'Sake (1 go)',zh:'清酒(1合)',ja:'日本酒(1合)'}},
  {name:'하이볼',price:7000,category:'주류',q:'highball whisky soda ice glass',tr:{en:'Highball',zh:'高球酒',ja:'ハイボール'}},
  {name:'아사히 생맥주',price:6000,category:'주류',q:'asahi draft beer glass cold',tr:{en:'Asahi Draft Beer',zh:'朝日生啤',ja:'アサヒ生ビール'}},
  {name:'소주',price:4000,category:'주류',q:'soju korean spirit bottle glass',tr:{en:'Soju',zh:'烧酒',ja:'焼酎'}}
 ],
 /* ────────────────── 중식당 (22 items) ────────────────── */
 chinese: [
  {name:'짜장면',price:8000,category:'면류',q:'jajangmyeon black bean sauce noodles',tr:{en:'Jajangmyeon',zh:'炸酱面',ja:'ジャージャー麺'}},
  {name:'짬뽕',price:9000,category:'면류',q:'jjamppong spicy red seafood noodle soup',tr:{en:'Jjamppong',zh:'炒码面',ja:'チャンポン'}},
  {name:'삼선짬뽕',price:12000,category:'면류',q:'seafood noodle soup premium chinese',tr:{en:'Seafood Jjamppong',zh:'三鲜炒码面',ja:'三鮮チャンポン'}},
  {name:'울면',price:9000,category:'면류',q:'ul myeon starchy gravy noodle soup',tr:{en:'Ul-myeon',zh:'糊汤面',ja:'ウルミョン'}},
  {name:'볶음면',price:9000,category:'면류',q:'stir fried noodles chinese wok',tr:{en:'Stir-fried Noodles',zh:'炒面',ja:'焼きそば'}},
  {name:'볶음밥',price:9000,category:'밥류',q:'chinese fried rice wok',tr:{en:'Fried Rice',zh:'炒饭',ja:'チャーハン'}},
  {name:'새우볶음밥',price:11000,category:'밥류',q:'shrimp fried rice chinese',tr:{en:'Shrimp Fried Rice',zh:'虾仁炒饭',ja:'エビチャーハン'}},
  {name:'짜장밥',price:8000,category:'밥류',q:'black bean sauce rice bowl',tr:{en:'Black Bean Sauce Rice',zh:'炸酱饭',ja:'ジャージャー飯'}},
  {name:'탕수육(소)',price:20000,category:'요리',q:'tangsuyuk sweet sour pork korean chinese',tr:{en:'Sweet & Sour Pork (S)',zh:'糖醋肉(小)',ja:'酢豚(小)'}},
  {name:'탕수육(대)',price:32000,category:'요리',q:'large sweet sour pork tangsuyuk',tr:{en:'Sweet & Sour Pork (L)',zh:'糖醋肉(大)',ja:'酢豚(大)'}},
  {name:'깐풍기',price:22000,category:'요리',q:'kkanpunggi spicy crispy fried chicken chinese',tr:{en:'Kkanpunggi',zh:'干烹鸡',ja:'カンプンギ'}},
  {name:'마파두부',price:11000,category:'요리',q:'mapo tofu spicy chinese dish',tr:{en:'Mapo Tofu',zh:'麻婆豆腐',ja:'麻婆豆腐'}},
  {name:'유린기',price:19000,category:'요리',q:'yu lin chi chinese chicken garlic sauce',tr:{en:'Yuringi',zh:'油淋鸡',ja:'油淋鶏'}},
  {name:'고추잡채',price:19000,category:'요리',q:'chili pepper stir fry pork chinese',tr:{en:'Gochujabchae',zh:'青椒肉丝',ja:'チンジャオロース'}},
  {name:'군만두(6개)',price:7000,category:'만두',q:'pan fried dumplings gyoza chinese',tr:{en:'Pan-fried Dumplings (6pc)',zh:'煎饺(6个)',ja:'焼き餃子(6個)'}},
  {name:'물만두(6개)',price:7000,category:'만두',q:'boiled dumplings water chinese',tr:{en:'Boiled Dumplings (6pc)',zh:'水饺(6个)',ja:'水餃子(6個)'}},
  {name:'짜사이',price:2000,category:'사이드',q:'zha cai pickled mustard chinese side',tr:{en:'Pickled Mustard',zh:'榨菜',ja:'ザーサイ'}},
  {name:'공기밥',price:1000,category:'사이드',q:'steamed white rice bowl',tr:{en:'Steamed Rice',zh:'米饭',ja:'ライス'}},
  {name:'탕수육 소스(부먹/찍먹)',price:0,category:'사이드',q:'sweet sour sauce chinese',tr:{en:'Sweet & Sour Sauce',zh:'糖醋汁',ja:'甘酢ソース'}},
  {name:'오렌지주스',price:4000,category:'음료',q:'fresh orange juice glass',tr:{en:'Orange Juice',zh:'橙汁',ja:'オレンジジュース'}},
  {name:'콜라',price:3000,category:'음료',q:'cola soft drink can glass ice',tr:{en:'Cola',zh:'可乐',ja:'コーラ'}},
  {name:'생맥주(500ml)',price:5000,category:'음료',q:'draft beer glass cold pint',tr:{en:'Draft Beer (500ml)',zh:'生啤(500ml)',ja:'生ビール(500ml)'}}
 ],
 /* ────────────────── 분식 (26 items) ────────────────── */
 fastfood: [
  {name:'떡볶이(小)',price:4000,category:'떡볶이',q:'tteokbokki small spicy rice cake red',tr:{en:'Tteokbokki (S)',zh:'炒年糕(小)',ja:'トッポッキ(小)'}},
  {name:'떡볶이(中)',price:6000,category:'떡볶이',q:'tteokbokki medium spicy rice cake korean',tr:{en:'Tteokbokki (M)',zh:'炒年糕(中)',ja:'トッポッキ(中)'}},
  {name:'로제떡볶이',price:7000,category:'떡볶이',q:'rose tteokbokki creamy pink sauce korean',tr:{en:'Rose Tteokbokki',zh:'玫瑰炒年糕',ja:'ロゼトッポッキ'}},
  {name:'크림떡볶이',price:7000,category:'떡볶이',q:'cream white sauce tteokbokki',tr:{en:'Cream Tteokbokki',zh:'奶油炒年糕',ja:'クリームトッポッキ'}},
  {name:'라볶이',price:6500,category:'떡볶이',q:'rabokki ramen tteokbokki mixed',tr:{en:'Rabokki',zh:'拉面炒年糕',ja:'ラポッキ'}},
  {name:'순대(소)',price:4000,category:'순대/튀김',q:'sundae korean blood sausage',tr:{en:'Sundae (S)',zh:'韩国血肠(小)',ja:'スンデ(小)'}},
  {name:'순대(대)',price:7000,category:'순대/튀김',q:'sundae large portion korean sausage',tr:{en:'Sundae (L)',zh:'韩国血肠(大)',ja:'スンデ(大)'}},
  {name:'튀김(5개)',price:3000,category:'순대/튀김',q:'korean fried snacks assorted 5 pieces',tr:{en:'Fritters (5pc)',zh:'炸物(5个)',ja:'揚げ物(5個)'}},
  {name:'튀김(10개)',price:5500,category:'순대/튀김',q:'assorted fried snacks 10 pieces korean',tr:{en:'Fritters (10pc)',zh:'炸物(10个)',ja:'揚げ物(10個)'}},
  {name:'오징어튀김',price:4500,category:'순대/튀김',q:'fried squid calamari korean street food',tr:{en:'Fried Squid',zh:'炸鱿鱼',ja:'イカの天ぷら'}},
  {name:'고구마튀김(3개)',price:3000,category:'순대/튀김',q:'sweet potato tempura fried korean',tr:{en:'Sweet Potato Fritters (3pc)',zh:'炸红薯(3个)',ja:'さつまいも天ぷら(3個)'}},
  {name:'기본김밥',price:3500,category:'김밥',q:'basic gimbap seaweed rice roll',tr:{en:'Basic Gimbap',zh:'基本紫菜包饭',ja:'基本キンパ'}},
  {name:'참치김밥',price:4500,category:'김밥',q:'tuna gimbap seaweed roll korean',tr:{en:'Tuna Gimbap',zh:'金枪鱼紫菜包饭',ja:'ツナキンパ'}},
  {name:'치즈김밥',price:4000,category:'김밥',q:'cheese gimbap melted korean roll',tr:{en:'Cheese Gimbap',zh:'芝士紫菜包饭',ja:'チーズキンパ'}},
  {name:'불고기김밥',price:5000,category:'김밥',q:'bulgogi beef gimbap korean roll',tr:{en:'Bulgogi Gimbap',zh:'烤肉紫菜包饭',ja:'プルコギキンパ'}},
  {name:'명란김밥',price:5000,category:'김밥',q:'pollock roe mentaiko gimbap roll',tr:{en:'Pollock Roe Gimbap',zh:'明太子紫菜包饭',ja:'明太子キンパ'}},
  {name:'삼각김밥',price:1500,category:'김밥',q:'triangle kimbap onigiri korean',tr:{en:'Triangle Gimbap',zh:'三角紫菜包饭',ja:'三角キンパ'}},
  {name:'라면',price:4000,category:'라면/면류',q:'korean instant ramen noodle soup',tr:{en:'Ramen',zh:'泡面',ja:'ラーメン'}},
  {name:'치즈라면',price:4500,category:'라면/면류',q:'cheese ramen noodle soup melted',tr:{en:'Cheese Ramen',zh:'芝士泡面',ja:'チーズラーメン'}},
  {name:'짜파게티',price:4500,category:'라면/면류',q:'chapaghetti black bean noodle korean',tr:{en:'Chapaghetti',zh:'炸酱意面',ja:'チャパゲティ'}},
  {name:'쫄면',price:5500,category:'라면/면류',q:'jjolmyeon chewy noodle spicy cold korean',tr:{en:'Chewy Noodles',zh:'劲道凉面",ja:"ジョルミョン'}},
  {name:'비빔국수',price:5000,category:'라면/면류',q:'bibim guksu spicy mixed noodles korean',tr:{en:'Spicy Mixed Noodles',zh:'拌面",ja:"ビビン国수'}},
  {name:'오뎅(4개)',price:2500,category:'사이드',q:'odeng fish cake skewer korean',tr:{en:'Fish Cake (4pc)',zh:'鱼饼(4串)',ja:'おでん(4本)'}},
  {name:'오뎅국물(컵)',price:500,category:'사이드',q:'fish cake broth soup cup korean',tr:{en:'Fish Cake Broth',zh:'鱼饼汤',ja:'おでん汁(カップ)'}},
  {name:'만두(4개)',price:3000,category:'사이드',q:'dumpling mandu korean steamed',tr:{en:'Dumplings (4pc)',zh:'饺子(4个)',ja:'マンドゥ(4個)'}},
  {name:'콜라/사이다',price:2000,category:'음료',q:'cola soda can cold drink',tr:{en:'Cola / Cider',zh:'可乐/雪碧',ja:'コーラ/サイダー'}}
 ],
 /* ────────────────── 이자카야/술집 (26 items) ────────────────── */
 izakaya: [
  {name:'생맥주(500ml)',price:5000,category:'생맥주',q:'draft beer pint glass cold',tr:{en:'Draft Beer (500ml)',zh:'生啤(500ml)',ja:'生ビール(500ml)'}},
  {name:'생맥주(1L)',price:9000,category:'생맥주',q:'large draft beer pitcher glass',tr:{en:'Draft Beer (1L)',zh:'生啤(1L)',ja:'生ビール(1L)'}},
  {name:'수제맥주(병)',price:8000,category:'생맥주',q:'craft beer bottle artisan',tr:{en:'Craft Beer (bottle)',zh:'精酿啤酒(瓶)',ja:'クラフトビール(瓶)'}},
  {name:'소주',price:4000,category:'소주/위스키',q:'soju korean spirit bottle shot',tr:{en:'Soju',zh:'烧酒',ja:'焼酎'}},
  {name:'하이볼',price:7000,category:'소주/위스키',q:'highball whisky soda ice glass',tr:{en:'Highball',zh:'高球酒',ja:'ハイボール'}},
  {name:'소맥(맥주+소주)',price:5000,category:'소주/위스키',q:'beer soju mix drink korean',tr:{en:'Beer & Soju Mix',zh:'啤酒烧酒混合',ja:'ソメク'}},
  {name:'막걸리(750ml)',price:5000,category:'막걸리',q:'makgeolli rice wine bottle glass',tr:{en:'Makgeolli (750ml)',zh:'马格利(750ml)',ja:'マッコリ(750ml)'}},
  {name:'삼겹살구이(200g)',price:15000,category:'고기구이',q:'samgyeopsal pork belly grill table',tr:{en:'Pork Belly (200g)',zh:'烤五花肉(200g)',ja:'サムギョプサル(200g)'}},
  {name:'항정살(200g)',price:16000,category:'고기구이',q:'pork jowl collar neck grill korean',tr:{en:'Pork Jowl (200g)',zh:'梅花肉(200g)',ja:'ハンジョンサル(200g)'}},
  {name:'닭목살(200g)',price:10000,category:'고기구이',q:'chicken neck skin grill korean',tr:{en:'Chicken Neck (200g)',zh:'鸡脖子(200g)',ja:'鶏首肉(200g)'}},
  {name:'닭꼬치(2개)',price:6000,category:'고기구이',q:'yakitori chicken skewer charcoal',tr:{en:'Chicken Skewer (2pc)',zh:'鸡肉串(2串)',ja:'焼き鳥(2本)'}},
  {name:'오징어구이',price:13000,category:'해산물안주',q:'grilled squid whole charcoal',tr:{en:'Grilled Squid',zh:'烤鱿鱼',ja:'イカ焼き'}},
  {name:'낙지볶음',price:14000,category:'해산물안주',q:'nakji bokkeum spicy stir fried octopus',tr:{en:'Spicy Stir-fried Octopus',zh:'辣炒章鱼',ja:'タコ辛炒め'}},
  {name:'골뱅이무침',price:14000,category:'해산물안주',q:'golbaengi muchim spicy snail noodle',tr:{en:'Spicy Snail Salad',zh:'辣拌海螺",ja:"コンクサラダ'}},
  {name:'계란말이',price:9000,category:'안주',q:'tamagoyaki rolled egg omelette',tr:{en:'Rolled Egg Omelette',zh:'鸡蛋卷',ja:'卵焼き'}},
  {name:'감자전',price:10000,category:'안주',q:'gamjajeon potato pancake korean',tr:{en:'Potato Pancake',zh:'土豆煎饼',ja:'ジャガイモチヂミ'}},
  {name:'파전',price:11000,category:'안주',q:'pajeon scallion pancake korean',tr:{en:'Green Onion Pancake',zh:'葱饼',ja:'パジョン'}},
  {name:'두부김치',price:11000,category:'안주',q:'dubu kimchi tofu stir fry korean',tr:{en:'Tofu & Kimchi',zh:'豆腐泡菜',ja:'豆腐キムチ'}},
  {name:'불닭발',price:14000,category:'안주',q:'buldak bal spicy chicken feet korean',tr:{en:'Spicy Chicken Feet',zh:'辣鸡脚",ja:"ブルダクパル'}},
  {name:'순한닭발',price:12000,category:'안주',q:'mild chicken feet braised korean',tr:{en:'Mild Chicken Feet',zh:'酱鸡脚',ja:'甘口ダクパル'}},
  {name:'쭈꾸미볶음',price:13000,category:'안주',q:'spicy stir fried baby octopus korean',tr:{en:'Spicy Baby Octopus',zh:'辣炒章鱼崽',ja:'テナガダコ辛炒め'}},
  {name:'치즈볶음밥(마무리)',price:5000,category:'마무리',q:'cheese fried rice korean finish',tr:{en:'Cheese Fried Rice',zh:'芝士炒饭",ja:"チーズチャーハン'}},
  {name:'라면(마무리)',price:4000,category:'마무리',q:'instant ramen soup bowl korean',tr:{en:'Ramen Finish',zh:'泡面(收尾)',ja:'ラーメン(シメ)'}},
  {name:'콜라',price:3000,category:'음료',q:'cola soda can cold ice',tr:{en:'Cola',zh:'可乐',ja:'コーラ'}},
  {name:'사이다',price:3000,category:'음료',q:'lemon soda clear sparkling drink',tr:{en:'Cider',zh:'雪碧',ja:'サイダー'}},
  {name:'탄산수',price:3000,category:'음료',q:'sparkling mineral water glass bottle',tr:{en:'Sparkling Water',zh:'气泡水',ja:'炭酸水'}}
 ],
 /* ────────────────── 양식당 (31 items) ────────────────── */
 western: [
  {name:'까르보나라',price:16000,category:'파스타',q:'carbonara pasta creamy egg italian',tr:{en:'Carbonara',zh:'卡邦尼意面',ja:'カルボナーラ'}},
  {name:'알리오올리오',price:14000,category:'파스타',q:'aglio olio pasta garlic olive oil',tr:{en:'Aglio e Olio',zh:'蒜香橄榄油意面',ja:'アーリオオーリオ'}},
  {name:'아라비아타',price:14000,category:'파스타',q:'arrabbiata tomato spicy pasta italian',tr:{en:'Arrabbiata',zh:'辣番茄意面',ja:'アラビアータ'}},
  {name:'봉골레',price:15000,category:'파스타',q:'vongole clam pasta white wine',tr:{en:'Vongole',zh:'白蛤意面',ja:'ボンゴレ'}},
  {name:'로제파스타',price:16000,category:'파스타',q:'rose sauce creamy tomato pasta',tr:{en:'Rosé Pasta',zh:'玫瑰酱意面',ja:'ロゼパスタ'}},
  {name:'먹물파스타',price:17000,category:'파스타',q:'squid ink pasta black seafood',tr:{en:'Squid Ink Pasta',zh:'墨鱼汁意面',ja:'イカ墨パスタ'}},
  {name:'트뤼플크림파스타',price:19000,category:'파스타',q:'truffle cream pasta luxurious',tr:{en:'Truffle Cream Pasta',zh:'松露奶油意面',ja:'トリュフクリームパスタ'}},
  {name:'마르게리타(8인치)',price:17000,category:'피자',q:'margherita pizza tomato mozzarella basil',tr:{en:'Margherita (8")',zh:'玛格丽特披萨(8寸)',ja:'マルゲリータ(8インチ)'}},
  {name:'페퍼로니(8인치)',price:18000,category:'피자',q:'pepperoni pizza red sauce',tr:{en:'Pepperoni (8")',zh:'意大利辣肠披萨(8寸)',ja:'ペパロニ(8インチ)'}},
  {name:'포테이토(8인치)',price:17000,category:'피자',q:'potato bacon cream pizza',tr:{en:'Potato (8")',zh:'土豆培根披萨(8寸)',ja:'ポテト(8インチ)'}},
  {name:'BBQ치킨(10인치)',price:23000,category:'피자',q:'bbq chicken pizza large',tr:{en:'BBQ Chicken (10")',zh:'BBQ鸡肉披萨(10寸)',ja:'BBQチキン(10インチ)'}},
  {name:'고르곤졸라(8인치)',price:20000,category:'피자',q:'gorgonzola cheese pizza honey',tr:{en:'Gorgonzola (8")',zh:'戈尔根朱勒奶酪披萨(8寸)',ja:'ゴルゴンゾーラ(8インチ)'}},
  {name:'립아이스테이크(200g)',price:48000,category:'메인',q:'ribeye steak grilled medium rare',tr:{en:'Ribeye Steak (200g)',zh:'肋眼牛排(200g)',ja:'リブアイステーキ(200g)'}},
  {name:'안심스테이크(200g)',price:42000,category:'메인',q:'tenderloin sirloin steak plate fine dining',tr:{en:'Tenderloin Steak (200g)',zh:'菲力牛排(200g)',ja:'ヒレステーキ(200g)'}},
  {name:'치킨스테이크',price:22000,category:'메인',q:'grilled chicken breast steak sauce',tr:{en:'Chicken Steak',zh:'鸡胸肉扒',ja:'チキンステーキ'}},
  {name:'연어스테이크',price:29000,category:'메인',q:'pan seared salmon steak lemon herb',tr:{en:'Salmon Steak',zh:'三文鱼扒",ja:"サーモンステーキ'}},
  {name:'등심돈가스',price:18000,category:'메인',q:'tonkatsu pork cutlet breaded fried',tr:{en:'Pork Cutlet',zh:'猪排',ja:'ロースカツ'}},
  {name:'시저샐러드',price:13000,category:'샐러드/수프',q:'caesar salad romaine croutons parmesan',tr:{en:'Caesar Salad',zh:'凯撒沙拉',ja:'シーザーサラダ'}},
  {name:'그릭샐러드',price:13000,category:'샐러드/수프',q:'greek salad olives feta cucumber',tr:{en:'Greek Salad',zh:'希腊沙拉',ja:'グリークサラダ'}},
  {name:'어니언수프',price:9000,category:'샐러드/수프',q:'french onion soup gratin bread cheese',tr:{en:'French Onion Soup',zh:'法式洋葱汤',ja:'オニオングラタンスープ'}},
  {name:'미네스트로네',price:9000,category:'샐러드/수프',q:'minestrone vegetable soup italian',tr:{en:'Minestrone',zh:'意式蔬菜汤',ja:'ミネストローネ'}},
  {name:'감자튀김',price:6000,category:'사이드',q:'french fries crispy golden',tr:{en:'French Fries',zh:'炸薯条',ja:'フライドポテト'}},
  {name:'마늘빵',price:5000,category:'사이드',q:'garlic bread butter toast baguette',tr:{en:'Garlic Bread',zh:'蒜蓉面包",ja:"ガーリックトースト'}},
  {name:'브레드바스켓',price:4000,category:'사이드',q:'bread basket dinner rolls butter',tr:{en:'Bread Basket',zh:'面包篮',ja:'ブレッドバスケット'}},
  {name:'티라미수',price:7000,category:'디저트',q:'tiramisu dessert coffee cocoa plate',tr:{en:'Tiramisu',zh:'提拉米苏',ja:'ティラミス'}},
  {name:'판나코타',price:6500,category:'디저트',q:'panna cotta italian cream dessert',tr:{en:'Panna Cotta',zh:'意式奶冻',ja:'パンナコッタ'}},
  {name:'아포가토',price:7000,category:'디저트',q:'affogato espresso vanilla ice cream',tr:{en:'Affogato',zh:'阿芙佳朵',ja:'アフォガート'}},
  {name:'와인(하우스/글라스)',price:12000,category:'음료',q:'wine glass red white restaurant',tr:{en:'House Wine (glass)',zh:'店内葡萄酒(杯)',ja:'ハウスワイン(グラス)'}},
  {name:'상그리아(글라스)',price:10000,category:'음료',q:'sangria wine fruit glass',tr:{en:'Sangria (glass)',zh:'桑格利亚(杯)',ja:'サングリア(グラス)'}},
  {name:'아이스티',price:4000,category:'음료',q:'iced tea lemon glass',tr:{en:'Iced Tea',zh:'冰茶',ja:'アイスティー'}},
  {name:'탄산수',price:3000,category:'음료',q:'sparkling mineral water glass bottle',tr:{en:'Sparkling Water',zh:'气泡水',ja:'炭酸水'}}
 ],
 /* ────────────────── 베이커리 특화 (33 items) ────────────────── */
 bakery: [
  {name:'통밀식빵(1/2)',price:5000,category:'식빵',q:'whole wheat bread loaf half sliced',tr:{en:'Whole Wheat Bread (½)',zh:'全麦吐司(半条)',ja:'全粒粉食パン(½本)'}},
  {name:'우유식빵(1/2)',price:4500,category:'식빵',q:'milk bread soft white loaf half',tr:{en:'Milk Bread (½)',zh:'牛奶吐司(半条)',ja:'ミルク食パン(½本)'}},
  {name:'소금빵',price:2500,category:'식빵',q:'salted butter roll bread baked',tr:{en:'Salt Bread',zh:'盐面包',ja:'塩パン'}},
  {name:'BLT샌드위치',price:8500,category:'샌드위치',q:'blt sandwich bacon lettuce tomato',tr:{en:'BLT Sandwich',zh:'培根生菜番茄三明治',ja:'BLTサンドイッチ'}},
  {name:'에그마요샌드위치',price:7500,category:'샌드위치',q:'egg mayo sandwich classic',tr:{en:'Egg Mayo Sandwich',zh:'鸡蛋沙拉三明治',ja:'たまごサンドイッチ'}},
  {name:'클럽샌드위치',price:9500,category:'샌드위치',q:'club sandwich triple layer premium',tr:{en:'Club Sandwich',zh:'总汇三明治',ja:'クラブサンドイッチ'}},
  {name:'아보카도토스트',price:9000,category:'샌드위치',q:'avocado toast sourdough egg brunch',tr:{en:'Avocado Toast',zh:'牛油果吐司',ja:'アボカドトースト'}},
  {name:'플레인크루아상',price:3500,category:'크루아상',q:'plain butter croissant golden flaky',tr:{en:'Plain Croissant',zh:'原味可颂',ja:'プレーンクロワッサン'}},
  {name:'아몬드크루아상',price:4500,category:'크루아상',q:'almond croissant frangipane pastry',tr:{en:'Almond Croissant',zh:'杏仁可颂',ja:'アーモンドクロワッサン'}},
  {name:'크로플',price:5500,category:'크루아상',q:'croffle waffle croissant crispy',tr:{en:'Croffle',zh:'可颂华夫饼",ja:"クロッフル'}},
  {name:'팡도르(슈크림)',price:3500,category:'크루아상',q:'cream puff choux pastry profiterole',tr:{en:'Cream Puff',zh:'泡芙",ja:"シュークリーム'}},
  {name:'에그타르트',price:3000,category:'크루아상',q:'portuguese egg tart custard pastry',tr:{en:'Egg Tart',zh:'蛋挞',ja:'エッグタルト'}},
  {name:'베르리너(커스터드)',price:3500,category:'크루아상',q:'berliner filled doughnut custard',tr:{en:'Berliner (custard)',zh:'柏林甜甜圈(卡仕达)',ja:'ベルリーナー(カスタード)'}},
  {name:'생딸기케이크(슬라이스)',price:7500,category:'케이크',q:'fresh strawberry cream cake slice',tr:{en:'Strawberry Cake Slice',zh:'新鲜草莓蛋糕(片)',ja:'生いちごケーキ(スライス)'}},
  {name:'뉴욕치즈케이크(슬라이스)',price:7000,category:'케이크',q:'new york cheesecake rich cream slice',tr:{en:'NY Cheesecake Slice',zh:'纽约芝士蛋糕(片)',ja:'NYチーズケーキ(スライス)'}},
  {name:'초코가나슈케이크',price:7000,category:'케이크',q:'chocolate ganache cake slice rich',tr:{en:'Choco Ganache Cake',zh:'巧克力甘纳许蛋糕',ja:'チョコガナッシュケーキ'}},
  {name:'레드벨벳케이크',price:7000,category:'케이크',q:'red velvet cake cream cheese frosting',tr:{en:'Red Velvet Cake',zh:'红丝绒蛋糕',ja:'レッドベルベットケーキ'}},
  {name:'말차케이크(슬라이스)',price:7000,category:'케이크',q:'matcha green tea cake layered slice',tr:{en:'Matcha Cake Slice',zh:'抹茶蛋糕(片)',ja:'抹茶ケーキ(スライス)'}},
  {name:'얼그레이케이크',price:7000,category:'케이크',q:'earl grey tea cake lavender cream',tr:{en:'Earl Grey Cake',zh:'伯爵茶蛋糕',ja:'アールグレイケーキ'}},
  {name:'생일케이크(홀)',price:48000,category:'케이크',q:'whole birthday cake celebration',tr:{en:'Birthday Cake (whole)',zh:'生日蛋糕(整个)",ja:"バースデーケーキ(ホール)'}},
  {name:'버터쿠키(3개)',price:4500,category:'쿠키/마카롱',q:'butter cookies danish classic three',tr:{en:'Butter Cookies (3pc)',zh:'黄油饼干(3个)',ja:'バタークッキー(3個)'}},
  {name:'초코칩쿠키',price:2500,category:'쿠키/마카롱',q:'chocolate chip cookie warm baked',tr:{en:'Choco Chip Cookie',zh:'巧克力曲奇',ja:'チョコチップクッキー'}},
  {name:'브라우니',price:3500,category:'쿠키/마카롱',q:'fudgy chocolate brownie square',tr:{en:'Brownie',zh:'布朗尼",ja:"ブラウニー'}},
  {name:'마카롱(1개)',price:2500,category:'쿠키/마카롱',q:'french macaron colorful pastel',tr:{en:'Macaron (1pc)',zh:'马卡龙(1个)',ja:'マカロン(1個)'}},
  {name:'피낭시에(2개)',price:3500,category:'쿠키/마카롱',q:'financier french almond butter cake',tr:{en:'Financier (2pc)',zh:'费南雪(2个)',ja:'フィナンシェ(2個)'}},
  {name:'아메리카노(ICE)',price:4000,category:'음료',q:'iced americano coffee glass ice',tr:{en:'Iced Americano',zh:'冰美式',ja:'アイスアメリカーノ'}},
  {name:'아메리카노(HOT)',price:4000,category:'음료',q:'hot americano black coffee cup',tr:{en:'Hot Americano',zh:'热美式',ja:'ホットアメリカーノ'}},
  {name:'카페라떼',price:5000,category:'음료',q:'cafe latte art milk foam cup',tr:{en:'Cafe Latte',zh:'拿铁',ja:'カフェラテ'}},
  {name:'바닐라라떼',price:5500,category:'음료',q:'vanilla latte flavored milk coffee',tr:{en:'Vanilla Latte',zh:'香草拿铁',ja:'バニララテ'}},
  {name:'핫초코',price:5000,category:'음료',q:'hot chocolate cocoa drink mug',tr:{en:'Hot Chocolate',zh:'热巧克力',ja:'ホットチョコレート'}},
  {name:'오렌지주스(착즙)',price:6000,category:'음료',q:'fresh squeezed orange juice glass',tr:{en:'Fresh OJ',zh:'鲜榨橙汁',ja:'フレッシュオレンジジュース'}},
  {name:'딸기라떼',price:6000,category:'음료',q:'strawberry milk latte pink drink',tr:{en:'Strawberry Latte',zh:'草莓拿铁",ja:"ストロベリーラテ'}},
  {name:'레몬에이드',price:5500,category:'음료',q:'lemon ade fresh sparkling soda glass',tr:{en:'Lemon Ade',zh:'柠檬气泡饮',ja:'レモンエード'}}
 ],
 other: []
};

/** worker /api/menu-image (Pexels) 로 이미지 1장 조회. 실패하면 빈 문자열 */
function _filoFetchMenuImage(q){
 return fetch('/api/menu-image?q='+encodeURIComponent(q))
  .then(function(r){ return r.json(); })
  .then(function(d){ return (d && d.url) || ''; })
  .catch(function(){ return ''; });
}

/**
 * 업종별 기본 메뉴 자동 등록.
 * 이미 메뉴가 하나라도 있으면 아무것도 하지 않는다(덮어쓰기 방지).
 * 이미지는 등록을 막지 않도록 저장 후 백그라운드에서 순차로 채운다.
 * @returns {Promise<number>} 등록된 개수
 */
function _filoSeedDefaultMenus(did, themeKey){
 did = did || (window._CU && (_CU.dealerId||_CU.uid));
 var items=_FILO_MENU_TEMPLATES[String(themeKey||'').trim()];
 if(!did || !items || !items.length) return Promise.resolve(0);

 return _db.collection('filo_menus').where('dealerId','==',did).limit(1).get()
 .then(function(snap){
  if(!snap.empty) return 0;
  var now=(typeof _nowISO==='function')?_nowISO():new Date().toISOString();
  var batch=_db.batch();
  var refs=[];
  items.forEach(function(it){
   var ref=_db.collection('filo_menus').doc();
   refs.push({ref:ref, q:it.q});
   batch.set(ref,{
    dealerId:did, name:it.name, price:it.price,
    category:it.category, emoji:it.emoji, forSale:true,
    imageUrl:'', stock:null, minStock:null, description:'',
    nameTranslations:it.tr,
    isTemplate:true, createdAt:now, updatedAt:now
   });
  });
  return batch.commit().then(function(){
   _filoFillTemplateImages(refs);   /* 이미지는 기다리지 않는다 */
   return items.length;
  });
 });
}

/* Pexels 호출을 순차·간격을 두고 진행해 레이트 리밋과 UI 멈춤을 피한다 */
function _filoFillTemplateImages(refs){
 var i=0;
 function next(){
  if(i>=refs.length) return;
  var cur=refs[i++];
  _filoFetchMenuImage(cur.q).then(function(url){
   if(url) return cur.ref.update({imageUrl:url});
  }).catch(function(){}).then(function(){
   setTimeout(next, 700);
  });
 }
 next();
}

/** 기존 매장용 수동 실행 (메뉴가 비어 있을 때만 동작) */
function _filoSeedDefaultMenusManual(){
 var did=_CU.dealerId||_CU.uid;
 var key=(window._cachedCompanyDoc&&_cachedCompanyDoc.theme)||(window._filoTheme&&_filoTheme.theme)||'other';
 var t=_FILO_MENU_TEMPLATES[key];
 if(!t||!t.length){_filoToast('이 업종은 기본 메뉴 템플릿이 없습니다');return;}
 _filoSeedDefaultMenus(did,key).then(function(n){
  if(n>0) _filoToast('기본 메뉴 '+n+'개 등록 완료');
  else _filoToast('이미 메뉴가 있어 건너뛰었습니다');
 }).catch(function(e){_filoToast(e.message);});
}

/* ── 메뉴 이미지 일괄 갱신 (Pollinations → Pexels) ── */
function _filoRefreshAllMenuImages(did, btn){
 if(btn){btn.disabled=true;btn.textContent='갱신 중...';}
 _db.collection('filo_menus').where('dealerId','==',did).get()
 .then(function(snap){
  var menus=[];
  snap.forEach(function(doc){menus.push(Object.assign({_id:doc.id},doc.data()));});
  var need=menus.filter(function(m){
   return !m.imageUrl||m.imageUrl.indexOf('pollinations.ai')>=0;
  });
  if(!need.length){
   if(btn){btn.disabled=false;btn.textContent='이미지 일괄 갱신';}
   _filoToast('갱신할 이미지가 없습니다 (이미 Pexels 적용됨)');
   return;
  }
  _filoToast(need.length+'개 메뉴 이미지 갱신 시작...');
  var idx=0;
  function next(){
   if(idx>=need.length){
    if(btn){btn.disabled=false;btn.textContent='이미지 갱신 완료';}
    _filoToast('이미지 일괄 갱신 완료!');
    return;
   }
   var m=need[idx++];
   var q=m.name;
   _filoFetchMenuImage(q).then(function(url){
    if(!url)return;
    return _db.collection('filo_menus').doc(m._id).update({imageUrl:url});
   }).catch(function(){}).then(function(){
    if(btn)btn.textContent='갱신 중... ('+idx+'/'+need.length+')';
    setTimeout(next,800);
   });
  }
  next();
 }).catch(function(e){
  _filoToast('오류: '+e.message);
  if(btn){btn.disabled=false;btn.textContent='이미지 일괄 갱신';}
 });
}

/* ── 번역 일괄 생성 ── */
function _filoBatchTranslate(did, btn){
 if(btn){btn.disabled=true;btn.textContent='번역 중...';}
 var langs=['en','zh','ja'];
 _db.collection('filo_menus').where('dealerId','==',did).get()
 .then(function(snap){
  var menus=snap.docs.map(function(d){return Object.assign({_id:d.id},d.data());});
  var needTr=menus.filter(function(m){
   var nt=m.nameTranslations||{};
   return !nt.en||!nt.zh||!nt.ja;
  });
  if(!needTr.length){
   if(btn){btn.disabled=false;btn.textContent='번역 일괄생성';}
   _filoToast('모든 메뉴에 번역이 이미 있습니다');
   return;
  }
  _filoToast(needTr.length+'개 메뉴 번역 시작...');
  var idx=0;
  function next(){
   if(idx>=needTr.length){
    if(btn){btn.disabled=false;btn.textContent='번역 완료';}
    _filoToast('번역 완료!');
    return;
   }
   var m=needTr[idx++];
   var nt=Object.assign({},m.nameTranslations||{});
   var missing=langs.filter(function(l){return !nt[l];});
   var p=Promise.resolve();
   missing.forEach(function(lang){
    p=p.then(function(){
     return fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:m.name,lang:lang})})
     .then(function(r){return r.json();})
     .then(function(d){
      var t=d.translated;
      if(t&&t!==m.name&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(t))nt[lang]=t;
     }).catch(function(){});
    }).then(function(){return new Promise(function(res){setTimeout(res,200);});});
   });
   p.then(function(){
    return _db.collection('filo_menus').doc(m._id).update({nameTranslations:nt});
   }).then(function(){
    if(btn)btn.textContent='번역 중... ('+idx+'/'+needTr.length+')';
    setTimeout(next,100);
   }).catch(function(e){
    console.error(e);
    setTimeout(next,100);
   });
  }
  next();
 }).catch(function(e){
  _filoToast('오류: '+e.message);
  if(btn){btn.disabled=false;btn.textContent='번역 일괄생성';}
 });
}
