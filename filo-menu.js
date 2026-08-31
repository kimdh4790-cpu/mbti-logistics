/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @module      filo-menu-image.js
 * @description 메뉴 이미지 자동생성·일괄갱신 / 번역 일괄생성
 */
// 의존성: filo-common.js, _worker.js /api/menu-image, /api/translate
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

function _filoFetchMenuImage(q){
 return fetch('/api/menu-image?q='+encodeURIComponent(q))
  .then(function(r){ return r.json(); })
  .then(function(d){ return (d && d.url) || ''; })
  .catch(function(){ return ''; });
}

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


/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @module      filo-menu-templates.js
 * @description 업종별 기본 메뉴 템플릿 데이터 + 자동 등록 함수
 */
// 의존성: filo-common.js, filo-menu-image.js (_filoFetchMenuImage, _filoFillTemplateImages)
// 업종 키는 filo-common.js 의 _FILO_THEMES 와 동일.
// q  = Pexels 검색어 (worker /api/menu-image 로 전달)
// tr = EN/中/日 번역 (등록 즉시 다국어 주문 페이지 노출)
var _FILO_MENU_TEMPLATES = {
 /* ────────────────── 카페 (30 items) ────────────────── */
 cafe: [
  {name:'에스프레소',price:3000,category:'에스프레소',emoji:'☕',q:'espresso shot ceramic cup',tr:{en:'Espresso',zh:'浓缩咖啡',ja:'エスプレッソ'}},
  {name:'아메리카노(ICE)',price:4000,category:'아메리카노',emoji:'🧊',q:'iced americano tall glass ice',tr:{en:'Iced Americano',zh:'冰美式',ja:'アイスアメリカーノ'}},
  {name:'아메리카노(HOT)',price:4000,category:'아메리카노',emoji:'☕',q:'hot americano black coffee cup',tr:{en:'Hot Americano',zh:'热美式',ja:'ホットアメリカーノ'}},
  {name:'드립커피',price:5000,category:'아메리카노',emoji:'☕',q:'pour over drip coffee brew wooden table',tr:{en:'Drip Coffee',zh:'手冲咖啡',ja:'ドリップコーヒー'}},
  {name:'카페라떼(ICE)',price:5000,category:'라떼',emoji:'🥛',q:'iced cafe latte glass milk coffee',tr:{en:'Iced Cafe Latte',zh:'冰拿铁',ja:'アイスラテ'}},
  {name:'카페라떼(HOT)',price:5000,category:'라떼',emoji:'☕',q:'hot cafe latte art foam cup',tr:{en:'Hot Cafe Latte',zh:'热拿铁',ja:'ホットラテ'}},
  {name:'카푸치노',price:5000,category:'라떼',emoji:'☕',q:'cappuccino foam art white cup',tr:{en:'Cappuccino',zh:'卡布奇诺',ja:'カプチーノ'}},
  {name:'바닐라라떼',price:5500,category:'라떼',emoji:'☕',q:'vanilla latte sweet coffee drink',tr:{en:'Vanilla Latte',zh:'香草拿铁',ja:'バニララテ'}},
  {name:'카라멜마키아토',price:5500,category:'라떼',emoji:'☕',q:'caramel macchiato layered coffee drink',tr:{en:'Caramel Macchiato',zh:'焦糖玛奇朵',ja:'キャラメルマキアート'}},
  {name:'플랫화이트',price:5500,category:'라떼',emoji:'☕',q:'flat white small cup espresso milk',tr:{en:'Flat White',zh:'白咖啡',ja:'フラットホワイト'}},
  {name:'말차라떼(ICE)',price:5500,category:'논커피',emoji:'🍵',q:'iced matcha green tea latte glass',tr:{en:'Iced Matcha Latte',zh:'冰抹茶拿铁',ja:'アイス抹茶ラテ'}},
  {name:'말차라떼(HOT)',price:5500,category:'논커피',emoji:'🍵',q:'hot matcha green tea latte ceramic cup',tr:{en:'Hot Matcha Latte',zh:'热抹茶拿铁',ja:'ホット抹茶ラテ'}},
  {name:'초코라떼',price:5000,category:'논커피',emoji:'🍫',q:'hot chocolate cocoa latte mug foam',tr:{en:'Chocolate Latte',zh:'巧克力拿铁',ja:'チョコレートラテ'}},
  {name:'얼그레이라떼',price:5000,category:'논커피',emoji:'🫖',q:'earl grey tea latte warm cup',tr:{en:'Earl Grey Latte',zh:'伯爵奶茶',ja:'アールグレイラテ'}},
  {name:'히비스커스티',price:4500,category:'논커피',emoji:'🌺',q:'hibiscus herbal tea red glass pitcher',tr:{en:'Hibiscus Tea',zh:'玫瑰花茶',ja:'ハイビスカスティー'}},
  {name:'자몽에이드',price:5500,category:'에이드',emoji:'🍹',q:'grapefruit ade sparkling drink pink glass',tr:{en:'Grapefruit Ade',zh:'西柚气泡饮',ja:'グレープフルーツエード'}},
  {name:'레몬에이드',price:5500,category:'에이드',emoji:'🍋',q:'lemon ade sparkling soda fresh glass',tr:{en:'Lemon Ade',zh:'柠檬气泡饮',ja:'レモンエード'}},
  {name:'청포도에이드',price:5500,category:'에이드',emoji:'🍇',q:'green grape sparkling soda drink glass',tr:{en:'Green Grape Ade',zh:'青葡萄气泡饮',ja:'グリーングレープエード'}},
  {name:'딸기에이드',price:5500,category:'에이드',emoji:'🍓',q:'strawberry ade pink sparkling drink',tr:{en:'Strawberry Ade',zh:'草莓气泡饮',ja:'ストロベリーエード'}},
  {name:'복숭아아이스티',price:5000,category:'에이드',emoji:'🍑',q:'peach iced tea summer glass ice',tr:{en:'Peach Iced Tea',zh:'桃子冰茶',ja:'ピーチアイスティー'}},
  {name:'크로와상',price:3500,category:'베이커리',emoji:'🥐',q:'golden butter croissant bakery close up',tr:{en:'Croissant',zh:'可颂',ja:'クロワッサン'}},
  {name:'소금빵',price:2500,category:'베이커리',emoji:'🍞',q:'salt butter roll bread baked golden',tr:{en:'Salt Bread',zh:'盐面包',ja:'塩パン'}},
  {name:'크림치즈베이글',price:4500,category:'베이커리',emoji:'🥯',q:'cream cheese bagel halved spread',tr:{en:'Cream Cheese Bagel',zh:'奶油芝士贝果',ja:'クリームチーズベーグル'}},
  {name:'버터스콘',price:3500,category:'베이커리',emoji:'🧁',q:'butter scone flaky bakery plate',tr:{en:'Butter Scone',zh:'黄油司康',ja:'バタースコーン'}},
  {name:'마들렌(2pc)',price:3000,category:'베이커리',emoji:'🍪',q:'madeleine french shell cake two pieces',tr:{en:'Madeleine (2pc)',zh:'玛德莲蛋糕(2个)',ja:'マドレーヌ(2個)'}},
  {name:'에그타르트',price:3000,category:'베이커리',emoji:'🥧',q:'egg tart custard portuguese pastry',tr:{en:'Egg Tart',zh:'蛋挞',ja:'エッグタルト'}},
  {name:'뉴욕치즈케이크',price:6500,category:'디저트',emoji:'🍰',q:'new york cheesecake slice white plate',tr:{en:'NY Cheesecake',zh:'纽约芝士蛋糕',ja:'NYチーズケーキ'}},
  {name:'티라미수',price:6000,category:'디저트',emoji:'🍮',q:'tiramisu dessert cocoa dusted cup plate',tr:{en:'Tiramisu',zh:'提拉米苏',ja:'ティラミス'}},
  {name:'초코브라우니',price:4500,category:'디저트',emoji:'🍫',q:'chocolate brownie fudgy square plate',tr:{en:'Chocolate Brownie',zh:'巧克力布朗尼',ja:'チョコブラウニー'}},
  {name:'딸기케이크(슬라이스)',price:7000,category:'디저트',emoji:'🍰',q:'strawberry cream cake slice fresh berries',tr:{en:'Strawberry Cake Slice',zh:'草莓蛋糕(片)',ja:'いちごケーキ(スライス)'}}
 ],
 /* ────────────────── 한식당 (28 items) ────────────────── */
 korean: [
  {name:'된장찌개',price:8000,category:'찌개/국',emoji:'🍲',q:'korean doenjang jjigae soybean paste stew',tr:{en:'Soybean Paste Stew',zh:'大酱汤',ja:'テンジャンチゲ'}},
  {name:'김치찌개',price:8000,category:'찌개/국',emoji:'🍲',q:'kimchi jjigae stew pork tofu korean',tr:{en:'Kimchi Stew',zh:'泡菜汤',ja:'キムチチゲ'}},
  {name:'순두부찌개',price:8000,category:'찌개/국',emoji:'🍲',q:'sundubu soft tofu stew spicy korean',tr:{en:'Soft Tofu Stew',zh:'嫩豆腐汤',ja:'スンドゥブチゲ'}},
  {name:'부대찌개(2인)',price:20000,category:'찌개/국',emoji:'🍲',q:'budae jjigae army stew sausage korean',tr:{en:'Army Stew (2 ppl)',zh:'部队火锅(2人)',ja:'ブデチゲ(2人前)'}},
  {name:'갈비탕',price:14000,category:'찌개/국',emoji:'🍖',q:'galbitang short rib soup clear broth korean',tr:{en:'Short Rib Soup',zh:'排骨汤',ja:'カルビタン'}},
  {name:'설렁탕',price:12000,category:'찌개/국',emoji:'🍜',q:'seolleongtang ox bone broth milky soup',tr:{en:'Ox Bone Soup',zh:'雪浓汤',ja:'ソルロンタン'}},
  {name:'비빔밥',price:9000,category:'밥류',emoji:'🥗',q:'bibimbap colorful rice bowl vegetables egg',tr:{en:'Bibimbap',zh:'拌饭',ja:'ビビンバ'}},
  {name:'돌솥비빔밥',price:10000,category:'밥류',emoji:'🍚',q:'dolsot bibimbap sizzling stone pot korean',tr:{en:'Stone Pot Bibimbap',zh:'石锅拌饭',ja:'石焼ビビンバ'}},
  {name:'제육볶음',price:10000,category:'밥류',emoji:'🥩',q:'jeyuk bokkeum spicy pork stir fry korean',tr:{en:'Spicy Stir-fried Pork',zh:'辣炒猪肉',ja:'チェユクボックム'}},
  {name:'오징어볶음',price:10000,category:'밥류',emoji:'🦑',q:'ojingeo bokkeum spicy squid stir fry red',tr:{en:'Spicy Stir-fried Squid',zh:'辣炒鱿鱼',ja:'イカ炒め'}},
  {name:'닭갈비',price:11000,category:'밥류',emoji:'🍗',q:'dak galbi spicy chicken stir fry cheesy',tr:{en:'Spicy Chicken Stir-fry',zh:'辣炒鸡肉',ja:'タッカルビ'}},
  {name:'불고기덮밥',price:11000,category:'밥류',emoji:'🥩',q:'bulgogi rice bowl marinated beef korean',tr:{en:'Bulgogi Rice Bowl',zh:'烤牛肉饭',ja:'プルコギ丼'}},
  {name:'공기밥',price:1000,category:'사이드',emoji:'🍚',q:'steamed white rice bowl korean meal',tr:{en:'Steamed Rice',zh:'米饭',ja:'ライス'}},
  {name:'삼겹살(200g)',price:15000,category:'구이',emoji:'🥩',q:'samgyeopsal pork belly grilling table korean',tr:{en:'Pork Belly (200g)',zh:'五花肉(200g)',ja:'サムギョプサル(200g)'}},
  {name:'목살(200g)',price:14000,category:'구이',emoji:'🥩',q:'pork neck collar grill korean bbq',tr:{en:'Pork Neck (200g)',zh:'梅花肉(200g)',ja:'豚首肉(200g)'}},
  {name:'불고기(200g)',price:16000,category:'구이',emoji:'🥩',q:'bulgogi marinated beef grill pan sizzle',tr:{en:'Bulgogi (200g)',zh:'烤牛肉(200g)',ja:'プルコギ(200g)'}},
  {name:'물냉면',price:10000,category:'면류',emoji:'🍜',q:'mul naengmyeon cold buckwheat noodle soup bowl',tr:{en:'Cold Noodle Soup',zh:'水冷面',ja:'水冷麺'}},
  {name:'비빔냉면',price:10000,category:'면류',emoji:'🍜',q:'bibim naengmyeon spicy mixed cold noodles red',tr:{en:'Spicy Mixed Cold Noodles',zh:'拌冷面',ja:'ビビン冷麺'}},
  {name:'칼국수',price:9000,category:'면류',emoji:'🍜',q:'kalguksu knife cut noodle soup korean',tr:{en:'Knife-cut Noodle Soup',zh:'刀切面',ja:'カルグクス'}},
  {name:'잔치국수',price:8000,category:'면류',emoji:'🍜',q:'janchi guksu vermicelli noodle soup clear',tr:{en:'Vermicelli Noodle Soup',zh:'宴会面条',ja:'ジャンチグクス'}},
  {name:'파전',price:10000,category:'전',emoji:'🫓',q:'pajeon green onion pancake crispy korean',tr:{en:'Green Onion Pancake',zh:'葱饼',ja:'パジョン'}},
  {name:'김치전',price:10000,category:'전',emoji:'🫓',q:'kimchi jeon pancake crispy golden korean',tr:{en:'Kimchi Pancake',zh:'泡菜煎饼',ja:'キムチチヂミ'}},
  {name:'해물파전',price:14000,category:'전',emoji:'🫓',q:'haemul pajeon seafood scallion pancake',tr:{en:'Seafood Green Onion Pancake',zh:'海鲜葱饼',ja:'海鮮パジョン'}},
  {name:'계란찜',price:4000,category:'사이드',emoji:'🥚',q:'gyeran jjim steamed egg silky korean',tr:{en:'Steamed Egg',zh:'鸡蛋羹',ja:'ケランチム'}},
  {name:'두부김치',price:11000,category:'사이드',emoji:'🫕',q:'dubu kimchi tofu stir fried kimchi plate',tr:{en:'Tofu & Kimchi',zh:'豆腐泡菜',ja:'豆腐キムチ'}},
  {name:'막걸리',price:5000,category:'음료',emoji:'🍶',q:'makgeolli korean rice wine bowl white',tr:{en:'Makgeolli',zh:'马格利',ja:'マッコリ'}},
  {name:'소주',price:4000,category:'음료',emoji:'🍶',q:'soju korean spirit clear bottle glass',tr:{en:'Soju',zh:'烧酒',ja:'焼酎'}},
  {name:'생맥주(500ml)',price:5000,category:'음료',emoji:'🍺',q:'draft beer cold pint glass foam',tr:{en:'Draft Beer (500ml)',zh:'生啤(500ml)',ja:'生ビール(500ml)'}}
 ],
 /* ────────────────── 일식/횟집 (30 items) ────────────────── */
 japanese: [
  {name:'연어초밥(2pc)',price:5000,category:'초밥',emoji:'🍣',q:'salmon nigiri sushi pair plate',tr:{en:'Salmon Sushi (2pc)',zh:'三文鱼寿司(2贯)',ja:'サーモン寿司(2貫)'}},
  {name:'참치초밥(2pc)',price:5000,category:'초밥',emoji:'🍣',q:'tuna nigiri sushi dark red fish',tr:{en:'Tuna Sushi (2pc)',zh:'金枪鱼寿司(2贯)',ja:'マグロ寿司(2貫)'}},
  {name:'광어초밥(2pc)',price:5000,category:'초밥',emoji:'🍣',q:'flounder halibut nigiri sushi white fish',tr:{en:'Flounder Sushi (2pc)',zh:'比目鱼寿司(2贯)',ja:'ヒラメ寿司(2貫)'}},
  {name:'새우초밥(2pc)',price:4000,category:'초밥',emoji:'🍣',q:'prawn shrimp nigiri sushi pink',tr:{en:'Shrimp Sushi (2pc)',zh:'虾寿司(2贯)',ja:'エビ寿司(2貫)'}},
  {name:'우니(성게)초밥(1pc)',price:6000,category:'초밥',emoji:'🍣',q:'uni sea urchin sushi nigiri golden',tr:{en:'Sea Urchin Sushi (1pc)',zh:'海胆寿司(1贯)',ja:'ウニ寿司(1貫)'}},
  {name:'초밥 10pc 세트',price:22000,category:'세트',emoji:'🍱',q:'sushi set platter 10 pieces assorted',tr:{en:'Sushi Set (10pc)',zh:'寿司套餐(10贯)',ja:'寿司セット(10貫)'}},
  {name:'초밥 20pc 세트',price:42000,category:'세트',emoji:'🍱',q:'large sushi platter assorted 20 pieces premium',tr:{en:'Sushi Set (20pc)',zh:'寿司套餐(20贯)',ja:'寿司セット(20貫)'}},
  {name:'스파이시참치롤(8pc)',price:14000,category:'롤',emoji:'🌀',q:'spicy tuna roll maki sushi red',tr:{en:'Spicy Tuna Roll (8pc)',zh:'辣金枪鱼卷(8件)',ja:'スパイシーツナロール(8pc)'}},
  {name:'새우튀김롤(8pc)',price:13000,category:'롤',emoji:'🌀',q:'shrimp tempura roll maki sushi crispy',tr:{en:'Shrimp Tempura Roll (8pc)',zh:'炸虾卷(8件)',ja:'エビ天巻き(8pc)'}},
  {name:'아보카도연어롤(8pc)',price:15000,category:'롤',emoji:'🥑',q:'avocado salmon roll maki sushi green',tr:{en:'Avocado Salmon Roll (8pc)',zh:'牛油果三文鱼卷(8件)',ja:'アボカドサーモンロール(8pc)'}},
  {name:'크런치롤(8pc)',price:14000,category:'롤',emoji:'🌀',q:'crunchy tempura roll maki sushi topped',tr:{en:'Crunchy Roll (8pc)',zh:'脆皮卷(8件)',ja:'クランチーロール(8pc)'}},
  {name:'광어회(소)',price:38000,category:'회',emoji:'🐟',q:'flounder halibut sashimi thin slices plate',tr:{en:'Flounder Sashimi (S)',zh:'比目鱼刺身(小)',ja:'ヒラメ刺身(小)'}},
  {name:'연어회(소)',price:35000,category:'회',emoji:'🐟',q:'salmon sashimi orange slices garnish plate',tr:{en:'Salmon Sashimi (S)',zh:'三文鱼刺身(小)',ja:'サーモン刺身(小)'}},
  {name:'모둠회(중)',price:55000,category:'회',emoji:'🍱',q:'assorted sashimi premium platter seafood',tr:{en:'Assorted Sashimi (M)',zh:'什锦刺身(中)',ja:'刺身盛り合わせ(中)'}},
  {name:'참치회(소)',price:42000,category:'회',emoji:'🐟',q:'tuna sashimi dark red slices plate',tr:{en:'Tuna Sashimi (S)',zh:'金枪鱼刺身(小)',ja:'マグロ刺身(小)'}},
  {name:'우동(미소/간장)',price:9000,category:'면류',emoji:'🍜',q:'japanese udon noodle soup bowl broth',tr:{en:'Udon Noodle Soup',zh:'乌冬面',ja:'うどん'}},
  {name:'소바(냉)',price:10000,category:'면류',emoji:'🍜',q:'cold soba buckwheat noodle dipping sauce',tr:{en:'Cold Soba',zh:'冷荞麦面',ja:'冷たいそば'}},
  {name:'라멘(돈코츠)',price:12000,category:'면류',emoji:'🍜',q:'tonkotsu ramen pork broth rich bowl',tr:{en:'Tonkotsu Ramen',zh:'猪骨拉面',ja:'豚骨ラーメン'}},
  {name:'카레우동',price:11000,category:'면류',emoji:'🍛',q:'curry udon thick golden noodle soup',tr:{en:'Curry Udon',zh:'咖喱乌冬',ja:'カレーうどん'}},
  {name:'새우튀김(5pc)',price:13000,category:'튀김',emoji:'🍤',q:'ebi tempura shrimp fried crispy japanese',tr:{en:'Shrimp Tempura (5pc)',zh:'炸虾(5个)',ja:'エビ天ぷら(5本)'}},
  {name:'모둠튀김',price:16000,category:'튀김',emoji:'🍤',q:'assorted tempura platter mixed vegetables shrimp',tr:{en:'Assorted Tempura',zh:'什锦天妇罗',ja:'天ぷら盛り合わせ'}},
  {name:'가라아게(닭튀김)',price:10000,category:'튀김',emoji:'🍗',q:'karaage japanese fried chicken golden crispy',tr:{en:'Karaage',zh:'炸鸡(唐揚)',ja:'唐揚げ'}},
  {name:'닭꼬치(2개)',price:5000,category:'구이',emoji:'🍡',q:'yakitori chicken skewer grill charcoal',tr:{en:'Yakitori (2pc)',zh:'烤鸡串(2串)',ja:'焼き鳥(2本)'}},
  {name:'연어구이',price:16000,category:'구이',emoji:'🐟',q:'grilled salmon teriyaki glaze plate',tr:{en:'Grilled Salmon',zh:'烤三文鱼',ja:'鮭の塩焼き'}},
  {name:'미소시루',price:2000,category:'사이드',emoji:'🍵',q:'miso soup japanese bowl tofu wakame',tr:{en:'Miso Soup',zh:'味噌汤',ja:'みそ汁'}},
  {name:'차완무시',price:4000,category:'사이드',emoji:'🥚',q:'chawanmushi steamed egg custard japanese cup',tr:{en:'Steamed Egg Custard',zh:'茶碗蒸',ja:'茶碗蒸し'}},
  {name:'사케(1홉)',price:9000,category:'주류',emoji:'🍶',q:'sake japanese rice wine ceramic glass',tr:{en:'Sake (1 go)',zh:'清酒(1合)',ja:'日本酒(1合)'}},
  {name:'하이볼',price:7000,category:'주류',emoji:'🥃',q:'highball whisky soda ice tall glass',tr:{en:'Highball',zh:'高球酒',ja:'ハイボール'}},
  {name:'아사히 생맥주',price:6000,category:'주류',emoji:'🍺',q:'asahi draft beer cold foam glass',tr:{en:'Asahi Draft Beer',zh:'朝日生啤',ja:'アサヒ生ビール'}},
  {name:'소주',price:4000,category:'주류',emoji:'🍶',q:'soju clear korean spirit shot glass',tr:{en:'Soju',zh:'烧酒',ja:'焼酎'}}
 ],
 /* ────────────────── 중식당 (24 items) ────────────────── */
 chinese: [
  {name:'짜장면',price:8000,category:'면류',emoji:'🍜',q:'jajangmyeon black bean sauce noodles korean',tr:{en:'Jajangmyeon',zh:'炸酱面',ja:'ジャージャー麺'}},
  {name:'짬뽕',price:9000,category:'면류',emoji:'🍜',q:'jjamppong spicy seafood red noodle soup',tr:{en:'Jjamppong',zh:'炒码面',ja:'チャンポン'}},
  {name:'삼선짬뽕',price:12000,category:'면류',emoji:'🍜',q:'seafood premium noodle soup spicy korean chinese',tr:{en:'Seafood Jjamppong',zh:'三鲜炒码面',ja:'三鮮チャンポン'}},
  {name:'울면',price:9000,category:'면류',emoji:'🍜',q:'ul myeon starchy gravy noodle soup korean',tr:{en:'Ul-myeon',zh:'糊汤面',ja:'ウルミョン'}},
  {name:'볶음면',price:9000,category:'면류',emoji:'🍜',q:'stir fried noodles chinese wok vegetable',tr:{en:'Stir-fried Noodles',zh:'炒面',ja:'焼きそば'}},
  {name:'볶음밥',price:9000,category:'밥류',emoji:'🍚',q:'chinese fried rice wok egg scallion',tr:{en:'Fried Rice',zh:'炒饭',ja:'チャーハン'}},
  {name:'새우볶음밥',price:11000,category:'밥류',emoji:'🦐',q:'shrimp fried rice chinese plump prawns',tr:{en:'Shrimp Fried Rice',zh:'虾仁炒饭',ja:'エビチャーハン'}},
  {name:'짜장밥',price:8000,category:'밥류',emoji:'🍚',q:'black bean sauce rice bowl chinese',tr:{en:'Black Bean Sauce Rice',zh:'炸酱饭',ja:'ジャージャー飯'}},
  {name:'탕수육(소)',price:20000,category:'요리',emoji:'🍖',q:'tangsuyuk sweet sour pork crispy korean chinese',tr:{en:'Sweet & Sour Pork (S)',zh:'糖醋肉(小)',ja:'酢豚(小)'}},
  {name:'탕수육(대)',price:32000,category:'요리',emoji:'🍖',q:'large sweet sour pork platter tangsuyuk',tr:{en:'Sweet & Sour Pork (L)',zh:'糖醋肉(大)',ja:'酢豚(大)'}},
  {name:'깐풍기',price:22000,category:'요리',emoji:'🍗',q:'kkanpunggi spicy crispy chicken chinese korean',tr:{en:'Kkanpunggi',zh:'干烹鸡',ja:'カンプンギ'}},
  {name:'마파두부',price:11000,category:'요리',emoji:'🫕',q:'mapo tofu spicy silken chinese dish',tr:{en:'Mapo Tofu',zh:'麻婆豆腐',ja:'麻婆豆腐'}},
  {name:'유린기',price:19000,category:'요리',emoji:'🍗',q:'yu lin chi fried chicken garlic sauce chinese',tr:{en:'Yuringi',zh:'油淋鸡',ja:'油淋鶏'}},
  {name:'고추잡채',price:19000,category:'요리',emoji:'🫑',q:'chili pepper pork stir fry chinese wok',tr:{en:'Gochujabchae',zh:'青椒肉丝',ja:'チンジャオロース'}},
  {name:'전가복(잡탕밥)',price:13000,category:'요리',emoji:'🍲',q:'chinese mixed seafood rice bowl stew',tr:{en:'Jeonbokbap (Mixed Seafood Rice)',zh:'全家福(杂汤饭)',ja:'チャンポンライス'}},
  {name:'팔보채',price:28000,category:'요리',emoji:'🦐',q:'palbochae eight treasure seafood chinese stir fry',tr:{en:'Eight Treasure Seafood',zh:'八宝菜',ja:'八宝菜'}},
  {name:'군만두(6개)',price:7000,category:'만두',emoji:'🥟',q:'pan fried dumplings gyoza crispy brown',tr:{en:'Pan-fried Dumplings (6pc)',zh:'煎饺(6个)',ja:'焼き餃子(6個)'}},
  {name:'물만두(6개)',price:7000,category:'만두',emoji:'🥟',q:'boiled dumplings water chinese soft',tr:{en:'Boiled Dumplings (6pc)',zh:'水饺(6个)',ja:'水餃子(6個)'}},
  {name:'짜사이',price:2000,category:'사이드',emoji:'🥬',q:'zha cai pickled mustard chinese condiment',tr:{en:'Pickled Mustard',zh:'榨菜',ja:'ザーサイ'}},
  {name:'공기밥',price:1000,category:'사이드',emoji:'🍚',q:'steamed white rice bowl plain',tr:{en:'Steamed Rice',zh:'米饭',ja:'ライス'}},
  {name:'탕수육 소스(부먹/찍먹)',price:0,category:'사이드',emoji:'🫙',q:'sweet sour dipping sauce chinese bowl',tr:{en:'Sweet & Sour Sauce',zh:'糖醋汁',ja:'甘酢ソース'}},
  {name:'오렌지주스',price:4000,category:'음료',emoji:'🍊',q:'fresh orange juice glass citrus',tr:{en:'Orange Juice',zh:'橙汁',ja:'オレンジジュース'}},
  {name:'콜라',price:3000,category:'음료',emoji:'🥤',q:'cola soft drink ice glass cold',tr:{en:'Cola',zh:'可乐',ja:'コーラ'}},
  {name:'생맥주(500ml)',price:5000,category:'음료',emoji:'🍺',q:'draft beer cold pint glass foam',tr:{en:'Draft Beer (500ml)',zh:'生啤(500ml)',ja:'生ビール(500ml)'}}
 ],
 /* ────────────────── 분식 (26 items) ────────────────── */
 fastfood: [
  {name:'떡볶이(小)',price:4000,category:'떡볶이',emoji:'🌶',q:'tteokbokki small spicy rice cake red sauce',tr:{en:'Tteokbokki (S)',zh:'炒年糕(小)',ja:'トッポッキ(小)'}},
  {name:'떡볶이(中)',price:6000,category:'떡볶이',emoji:'🌶',q:'tteokbokki medium spicy rice cake street food',tr:{en:'Tteokbokki (M)',zh:'炒年糕(中)',ja:'トッポッキ(中)'}},
  {name:'로제떡볶이',price:7000,category:'떡볶이',emoji:'🍝',q:'rose tteokbokki creamy pink sauce korean',tr:{en:'Rose Tteokbokki',zh:'玫瑰炒年糕',ja:'ロゼトッポッキ'}},
  {name:'크림떡볶이',price:7000,category:'떡볶이',emoji:'🍝',q:'cream white sauce tteokbokki mild korean',tr:{en:'Cream Tteokbokki',zh:'奶油炒年糕',ja:'クリームトッポッキ'}},
  {name:'라볶이',price:6500,category:'떡볶이',emoji:'🍜',q:'rabokki ramen tteokbokki noodle mixed spicy',tr:{en:'Rabokki',zh:'拉面炒年糕',ja:'ラポッキ'}},
  {name:'순대(소)',price:4000,category:'순대/튀김',emoji:'🌭',q:'sundae korean blood sausage sliced plate',tr:{en:'Sundae (S)',zh:'韩国血肠(小)',ja:'スンデ(小)'}},
  {name:'순대(대)',price:7000,category:'순대/튀김',emoji:'🌭',q:'sundae large korean sausage tray',tr:{en:'Sundae (L)',zh:'韩国血肠(大)',ja:'スンデ(大)'}},
  {name:'튀김(5개)',price:3000,category:'순대/튀김',emoji:'🍤',q:'korean fried snacks assorted five pieces',tr:{en:'Fritters (5pc)',zh:'炸物(5个)',ja:'揚げ物(5個)'}},
  {name:'튀김(10개)',price:5500,category:'순대/튀김',emoji:'🍤',q:'assorted fried snacks ten pieces korean street',tr:{en:'Fritters (10pc)',zh:'炸物(10个)',ja:'揚げ物(10個)'}},
  {name:'오징어튀김',price:4500,category:'순대/튀김',emoji:'🦑',q:'fried squid calamari rings korean street food',tr:{en:'Fried Squid',zh:'炸鱿鱼',ja:'イカの天ぷら'}},
  {name:'고구마튀김(3개)',price:3000,category:'순대/튀김',emoji:'🍠',q:'sweet potato fries tempura three pieces',tr:{en:'Sweet Potato Fritters (3pc)',zh:'炸红薯(3个)',ja:'さつまいも天ぷら(3個)'}},
  {name:'기본김밥',price:3500,category:'김밥',emoji:'🍙',q:'basic gimbap seaweed rice roll korean',tr:{en:'Basic Gimbap',zh:'基本紫菜包饭',ja:'基本キンパ'}},
  {name:'참치김밥',price:4500,category:'김밥',emoji:'🍙',q:'tuna gimbap seaweed roll sliced korean',tr:{en:'Tuna Gimbap',zh:'金枪鱼紫菜包饭',ja:'ツナキンパ'}},
  {name:'치즈김밥',price:4000,category:'김밥',emoji:'🍙',q:'cheese gimbap melted inside korean roll',tr:{en:'Cheese Gimbap',zh:'芝士紫菜包饭',ja:'チーズキンパ'}},
  {name:'불고기김밥',price:5000,category:'김밥',emoji:'🍙',q:'bulgogi beef gimbap rice roll plate',tr:{en:'Bulgogi Gimbap',zh:'烤肉紫菜包饭',ja:'プルコギキンパ'}},
  {name:'명란김밥',price:5000,category:'김밥',emoji:'🍙',q:'pollock roe mentaiko gimbap roll sliced',tr:{en:'Pollock Roe Gimbap',zh:'明太子紫菜包饭',ja:'明太子キンパ'}},
  {name:'삼각김밥',price:1500,category:'김밥',emoji:'🍙',q:'triangle kimbap onigiri korean convenience',tr:{en:'Triangle Gimbap',zh:'三角紫菜包饭',ja:'三角キンパ'}},
  {name:'라면',price:4000,category:'라면/면류',emoji:'🍜',q:'korean instant ramen noodle soup red broth',tr:{en:'Ramen',zh:'泡面',ja:'ラーメン'}},
  {name:'치즈라면',price:4500,category:'라면/면류',emoji:'🍜',q:'cheese ramen noodle soup melted slice',tr:{en:'Cheese Ramen',zh:'芝士泡面',ja:'チーズラーメン'}},
  {name:'짜파게티',price:4500,category:'라면/면류',emoji:'🍜',q:'chapaghetti black bean noodle korean instant',tr:{en:'Chapaghetti',zh:'炸酱意面',ja:'チャパゲティ'}},
  {name:'쫄면',price:5500,category:'라면/면류',emoji:'🍜',q:'jjolmyeon chewy noodle spicy cold korean',tr:{en:'Chewy Noodles',zh:'劲道凉面',ja:'ジョルミョン'}},
  {name:'비빔국수',price:5000,category:'라면/면류',emoji:'🍜',q:'bibim guksu spicy mixed noodles korean red',tr:{en:'Spicy Mixed Noodles',zh:'拌面',ja:'ビビン국수'}},
  {name:'오뎅(4개)',price:2500,category:'사이드',emoji:'🐟',q:'odeng fish cake skewer broth korean',tr:{en:'Fish Cake (4pc)',zh:'鱼饼(4串)',ja:'おでん(4本)'}},
  {name:'오뎅국물(컵)',price:500,category:'사이드',emoji:'🫗',q:'fish cake broth soup cup warm korean',tr:{en:'Fish Cake Broth',zh:'鱼饼汤',ja:'おでん汁(カップ)'}},
  {name:'만두(4개)',price:3000,category:'사이드',emoji:'🥟',q:'mandu korean dumpling steamed plate',tr:{en:'Dumplings (4pc)',zh:'饺子(4个)',ja:'マンドゥ(4個)'}},
  {name:'콜라/사이다',price:2000,category:'음료',emoji:'🥤',q:'cola soda can cold drink ice',tr:{en:'Cola / Cider',zh:'可乐/雪碧',ja:'コーラ/サイダー'}}
 ],
 /* ────────────────── 이자카야/술집 (26 items) ────────────────── */
 izakaya: [
  {name:'생맥주(500ml)',price:5000,category:'생맥주',emoji:'🍺',q:'draft beer pint glass cold foam',tr:{en:'Draft Beer (500ml)',zh:'生啤(500ml)',ja:'生ビール(500ml)'}},
  {name:'생맥주(1L)',price:9000,category:'생맥주',emoji:'🍺',q:'large draft beer tower glass cold',tr:{en:'Draft Beer (1L)',zh:'生啤(1L)',ja:'生ビール(1L)'}},
  {name:'수제맥주(병)',price:8000,category:'생맥주',emoji:'🍺',q:'craft beer bottle artisan label cold',tr:{en:'Craft Beer (bottle)',zh:'精酿啤酒(瓶)',ja:'クラフトビール(瓶)'}},
  {name:'소주',price:4000,category:'소주/위스키',emoji:'🍶',q:'soju korean spirit bottle shot glass',tr:{en:'Soju',zh:'烧酒',ja:'焼酎'}},
  {name:'하이볼',price:7000,category:'소주/위스키',emoji:'🥃',q:'highball whisky soda tall ice glass',tr:{en:'Highball',zh:'高球酒',ja:'ハイボール'}},
  {name:'소맥(맥주+소주)',price:5000,category:'소주/위스키',emoji:'🍻',q:'beer soju mix drink korean pub',tr:{en:'Beer & Soju Mix',zh:'啤酒烧酒混合',ja:'ソメク'}},
  {name:'막걸리(750ml)',price:5000,category:'막걸리',emoji:'🍶',q:'makgeolli rice wine bottle glass white',tr:{en:'Makgeolli (750ml)',zh:'马格利(750ml)',ja:'マッコリ(750ml)'}},
  {name:'삼겹살구이(200g)',price:15000,category:'고기구이',emoji:'🥩',q:'samgyeopsal pork belly grill table sizzle',tr:{en:'Pork Belly (200g)',zh:'烤五花肉(200g)',ja:'サムギョプサル(200g)'}},
  {name:'항정살(200g)',price:16000,category:'고기구이',emoji:'🥩',q:'pork jowl collar grill korean bbq',tr:{en:'Pork Jowl (200g)',zh:'梅花肉(200g)',ja:'ハンジョンサル(200g)'}},
  {name:'닭목살(200g)',price:10000,category:'고기구이',emoji:'🍗',q:'chicken neck skin grill korean pub',tr:{en:'Chicken Neck (200g)',zh:'鸡脖子(200g)',ja:'鶏首肉(200g)'}},
  {name:'닭꼬치(2개)',price:6000,category:'고기구이',emoji:'🍡',q:'yakitori chicken skewer charcoal grill',tr:{en:'Chicken Skewer (2pc)',zh:'鸡肉串(2串)',ja:'焼き鳥(2本)'}},
  {name:'오징어구이',price:13000,category:'해산물안주',emoji:'🦑',q:'grilled whole squid charcoal smoky',tr:{en:'Grilled Squid',zh:'烤鱿鱼',ja:'イカ焼き'}},
  {name:'낙지볶음',price:14000,category:'해산물안주',emoji:'🐙',q:'nakji bokkeum spicy octopus stir fry red',tr:{en:'Spicy Stir-fried Octopus',zh:'辣炒章鱼',ja:'タコ辛炒め'}},
  {name:'골뱅이무침',price:14000,category:'해산물안주',emoji:'🐚',q:'golbaengi muchim spicy snail noodle salad',tr:{en:'Spicy Snail Salad',zh:'辣拌海螺',ja:'コンクサラダ'}},
  {name:'계란말이',price:9000,category:'안주',emoji:'🥚',q:'tamagoyaki rolled egg omelette japanese',tr:{en:'Rolled Egg Omelette',zh:'鸡蛋卷',ja:'卵焼き'}},
  {name:'감자전',price:10000,category:'안주',emoji:'🫓',q:'gamjajeon potato pancake crispy korean',tr:{en:'Potato Pancake',zh:'土豆煎饼',ja:'ジャガイモチヂミ'}},
  {name:'파전',price:11000,category:'안주',emoji:'🫓',q:'pajeon scallion pancake crispy golden',tr:{en:'Green Onion Pancake',zh:'葱饼',ja:'パジョン'}},
  {name:'두부김치',price:11000,category:'안주',emoji:'🫕',q:'dubu kimchi tofu stir fried plate pub',tr:{en:'Tofu & Kimchi',zh:'豆腐泡菜',ja:'豆腐キムチ'}},
  {name:'불닭발',price:14000,category:'안주',emoji:'🌶',q:'buldak bal spicy chicken feet red sauce',tr:{en:'Spicy Chicken Feet',zh:'辣鸡脚',ja:'ブルダクパル'}},
  {name:'순한닭발',price:12000,category:'안주',emoji:'🍗',q:'mild braised chicken feet soy glaze',tr:{en:'Mild Chicken Feet',zh:'酱鸡脚',ja:'甘口ダクパル'}},
  {name:'쭈꾸미볶음',price:13000,category:'안주',emoji:'🐙',q:'spicy stir fried baby octopus red sauce',tr:{en:'Spicy Baby Octopus',zh:'辣炒章鱼崽',ja:'テナガダコ辛炒め'}},
  {name:'치즈볶음밥(마무리)',price:5000,category:'마무리',emoji:'🍚',q:'cheese fried rice finish korean pub',tr:{en:'Cheese Fried Rice',zh:'芝士炒饭',ja:'チーズチャーハン'}},
  {name:'라면(마무리)',price:4000,category:'마무리',emoji:'🍜',q:'instant ramen noodle soup finish korean',tr:{en:'Ramen Finish',zh:'泡面(收尾)',ja:'ラーメン(シメ)'}},
  {name:'콜라',price:3000,category:'음료',emoji:'🥤',q:'cola soda can ice cold drink',tr:{en:'Cola',zh:'可乐',ja:'コーラ'}},
  {name:'사이다',price:3000,category:'음료',emoji:'🥤',q:'lemon soda clear sparkling cider glass',tr:{en:'Cider',zh:'雪碧',ja:'サイダー'}},
  {name:'탄산수',price:3000,category:'음료',emoji:'💧',q:'sparkling mineral water glass bottle clear',tr:{en:'Sparkling Water',zh:'气泡水',ja:'炭酸水'}}
 ],
 /* ────────────────── 양식당 (31 items) ────────────────── */
 western: [
  {name:'까르보나라',price:16000,category:'파스타',emoji:'🍝',q:'carbonara pasta creamy egg bacon italian',tr:{en:'Carbonara',zh:'卡邦尼意面',ja:'カルボナーラ'}},
  {name:'알리오올리오',price:14000,category:'파스타',emoji:'🍝',q:'aglio olio pasta garlic olive oil spaghetti',tr:{en:'Aglio e Olio',zh:'蒜香橄榄油意面',ja:'アーリオオーリオ'}},
  {name:'아라비아타',price:14000,category:'파스타',emoji:'🍝',q:'arrabbiata tomato spicy pasta chili italian',tr:{en:'Arrabbiata',zh:'辣番茄意面',ja:'アラビアータ'}},
  {name:'봉골레',price:15000,category:'파스타',emoji:'🍝',q:'vongole clam pasta white wine italian',tr:{en:'Vongole',zh:'白蛤意面',ja:'ボンゴレ'}},
  {name:'로제파스타',price:16000,category:'파스타',emoji:'🍝',q:'rose sauce creamy tomato pasta pink',tr:{en:'Rosé Pasta',zh:'玫瑰酱意面',ja:'ロゼパスタ'}},
  {name:'먹물파스타',price:17000,category:'파스타',emoji:'🦑',q:'squid ink pasta black seafood dramatic',tr:{en:'Squid Ink Pasta',zh:'墨鱼汁意面',ja:'イカ墨パスタ'}},
  {name:'트뤼플크림파스타',price:19000,category:'파스타',emoji:'🍝',q:'truffle cream pasta luxurious gourmet',tr:{en:'Truffle Cream Pasta',zh:'松露奶油意面',ja:'トリュフクリームパスタ'}},
  {name:'마르게리타(8인치)',price:17000,category:'피자',emoji:'🍕',q:'margherita pizza tomato mozzarella fresh basil',tr:{en:'Margherita (8")',zh:'玛格丽特披萨(8寸)',ja:'マルゲリータ(8インチ)'}},
  {name:'페퍼로니(8인치)',price:18000,category:'피자',emoji:'🍕',q:'pepperoni pizza classic red sauce melted',tr:{en:'Pepperoni (8")',zh:'意大利辣肠披萨(8寸)',ja:'ペパロニ(8インチ)'}},
  {name:'포테이토(8인치)',price:17000,category:'피자',emoji:'🍕',q:'potato bacon cream pizza white sauce',tr:{en:'Potato (8")',zh:'土豆培根披萨(8寸)',ja:'ポテト(8インチ)'}},
  {name:'BBQ치킨(10인치)',price:23000,category:'피자',emoji:'🍕',q:'bbq chicken pizza large smoked sauce',tr:{en:'BBQ Chicken (10")',zh:'BBQ鸡肉披萨(10寸)',ja:'BBQチキン(10インチ)'}},
  {name:'고르곤졸라(8인치)',price:20000,category:'피자',emoji:'🍕',q:'gorgonzola cheese pizza honey drizzle',tr:{en:'Gorgonzola (8")',zh:'戈尔根朱勒奶酪披萨(8寸)',ja:'ゴルゴンゾーラ(8インチ)'}},
  {name:'립아이스테이크(200g)',price:48000,category:'메인',emoji:'🥩',q:'ribeye steak grilled medium rare plate',tr:{en:'Ribeye Steak (200g)',zh:'肋眼牛排(200g)',ja:'リブアイステーキ(200g)'}},
  {name:'안심스테이크(200g)',price:42000,category:'메인',emoji:'🥩',q:'tenderloin steak fine dining plate sauce',tr:{en:'Tenderloin Steak (200g)',zh:'菲力牛排(200g)',ja:'ヒレステーキ(200g)'}},
  {name:'치킨스테이크',price:22000,category:'메인',emoji:'🍗',q:'grilled chicken breast steak herb sauce',tr:{en:'Chicken Steak',zh:'鸡胸肉扒',ja:'チキンステーキ'}},
  {name:'연어스테이크',price:29000,category:'메인',emoji:'🐟',q:'pan seared salmon steak lemon caper',tr:{en:'Salmon Steak',zh:'三文鱼扒',ja:'サーモンステーキ'}},
  {name:'등심돈가스',price:18000,category:'메인',emoji:'🍖',q:'tonkatsu pork loin cutlet breaded crispy',tr:{en:'Pork Cutlet',zh:'猪排',ja:'ロースカツ'}},
  {name:'시저샐러드',price:13000,category:'샐러드/수프',emoji:'🥗',q:'caesar salad romaine crouton parmesan',tr:{en:'Caesar Salad',zh:'凯撒沙拉',ja:'シーザーサラダ'}},
  {name:'그릭샐러드',price:13000,category:'샐러드/수프',emoji:'🥗',q:'greek salad feta olives cucumber tomato',tr:{en:'Greek Salad',zh:'希腊沙拉',ja:'グリークサラダ'}},
  {name:'어니언수프',price:9000,category:'샐러드/수프',emoji:'🍲',q:'french onion soup gratin bread cheese',tr:{en:'French Onion Soup',zh:'法式洋葱汤',ja:'オニオングラタンスープ'}},
  {name:'미네스트로네',price:9000,category:'샐러드/수프',emoji:'🍲',q:'minestrone vegetable soup italian hearty',tr:{en:'Minestrone',zh:'意式蔬菜汤',ja:'ミネストローネ'}},
  {name:'감자튀김',price:6000,category:'사이드',emoji:'🍟',q:'french fries crispy golden salted',tr:{en:'French Fries',zh:'炸薯条',ja:'フライドポテト'}},
  {name:'마늘빵',price:5000,category:'사이드',emoji:'🍞',q:'garlic bread butter baguette toasted',tr:{en:'Garlic Bread',zh:'蒜蓉面包',ja:'ガーリックトースト'}},
  {name:'브레드바스켓',price:4000,category:'사이드',emoji:'🍞',q:'bread basket dinner rolls butter soft',tr:{en:'Bread Basket',zh:'面包篮',ja:'ブレッドバスケット'}},
  {name:'티라미수',price:7000,category:'디저트',emoji:'🍮',q:'tiramisu dessert cocoa dusted layered',tr:{en:'Tiramisu',zh:'提拉米苏',ja:'ティラミス'}},
  {name:'판나코타',price:6500,category:'디저트',emoji:'🍮',q:'panna cotta italian cream dessert coulis',tr:{en:'Panna Cotta',zh:'意式奶冻',ja:'パンナコッタ'}},
  {name:'아포가토',price:7000,category:'디저트',emoji:'🍨',q:'affogato espresso vanilla ice cream pour',tr:{en:'Affogato',zh:'阿芙佳朵',ja:'アフォガート'}},
  {name:'와인(하우스/글라스)',price:12000,category:'음료',emoji:'🍷',q:'wine glass red white house restaurant',tr:{en:'House Wine (glass)',zh:'店内葡萄酒(杯)',ja:'ハウスワイン(グラス)'}},
  {name:'상그리아(글라스)',price:10000,category:'음료',emoji:'🍷',q:'sangria wine fruit glass red pitcher',tr:{en:'Sangria (glass)',zh:'桑格利亚(杯)',ja:'サングリア(グラス)'}},
  {name:'아이스티',price:4000,category:'음료',emoji:'🧊',q:'iced tea lemon glass cold summer',tr:{en:'Iced Tea',zh:'冰茶',ja:'アイスティー'}},
  {name:'탄산수',price:3000,category:'음료',emoji:'💧',q:'sparkling mineral water glass clean',tr:{en:'Sparkling Water',zh:'气泡水',ja:'炭酸水'}}
 ],
 /* ────────────────── 베이커리 특화 (33 items) ────────────────── */
 bakery: [
  {name:'통밀식빵(1/2)',price:5000,category:'식빵',emoji:'🍞',q:'whole wheat bread loaf half sliced rustic',tr:{en:'Whole Wheat Bread (½)',zh:'全麦吐司(半条)',ja:'全粒粉食パン(½本)'}},
  {name:'우유식빵(1/2)',price:4500,category:'식빵',emoji:'🍞',q:'milk bread soft white loaf half fluffy',tr:{en:'Milk Bread (½)',zh:'牛奶吐司(半条)',ja:'ミルク食パン(½本)'}},
  {name:'소금빵',price:2500,category:'식빵',emoji:'🍞',q:'salted butter roll baked golden crispy',tr:{en:'Salt Bread',zh:'盐面包',ja:'塩パン'}},
  {name:'BLT샌드위치',price:8500,category:'샌드위치',emoji:'🥪',q:'blt sandwich bacon lettuce tomato classic',tr:{en:'BLT Sandwich',zh:'培根生菜番茄三明治',ja:'BLTサンドイッチ'}},
  {name:'에그마요샌드위치',price:7500,category:'샌드위치',emoji:'🥪',q:'egg mayo sandwich classic soft bread',tr:{en:'Egg Mayo Sandwich',zh:'鸡蛋沙拉三明治',ja:'たまごサンドイッチ'}},
  {name:'클럽샌드위치',price:9500,category:'샌드위치',emoji:'🥪',q:'club sandwich triple decker premium layer',tr:{en:'Club Sandwich',zh:'总汇三明治',ja:'クラブサンドイッチ'}},
  {name:'아보카도토스트',price:9000,category:'샌드위치',emoji:'🥑',q:'avocado toast sourdough poached egg brunch',tr:{en:'Avocado Toast',zh:'牛油果吐司',ja:'アボカドトースト'}},
  {name:'플레인크루아상',price:3500,category:'크루아상',emoji:'🥐',q:'plain butter croissant golden flaky fresh',tr:{en:'Plain Croissant',zh:'原味可颂',ja:'プレーンクロワッサン'}},
  {name:'아몬드크루아상',price:4500,category:'크루아상',emoji:'🥐',q:'almond croissant frangipane pastry sugar',tr:{en:'Almond Croissant',zh:'杏仁可颂',ja:'アーモンドクロワッサン'}},
  {name:'크로플',price:5500,category:'크루아상',emoji:'🧇',q:'croffle croissant waffle crispy plate',tr:{en:'Croffle',zh:'可颂华夫饼',ja:'クロッフル'}},
  {name:'팡도르(슈크림)',price:3500,category:'크루아상',emoji:'🍮',q:'cream puff choux pastry custard filled',tr:{en:'Cream Puff',zh:'泡芙',ja:'シュークリーム'}},
  {name:'에그타르트',price:3000,category:'크루아상',emoji:'🥧',q:'egg tart custard portuguese pastry golden',tr:{en:'Egg Tart',zh:'蛋挞',ja:'エッグタルト'}},
  {name:'베르리너(커스터드)',price:3500,category:'크루아상',emoji:'🍩',q:'berliner filled doughnut custard cream',tr:{en:'Berliner (custard)',zh:'柏林甜甜圈(卡仕达)',ja:'ベルリーナー(カスタード)'}},
  {name:'생딸기케이크(슬라이스)',price:7500,category:'케이크',emoji:'🍰',q:'fresh strawberry cream cake slice plated',tr:{en:'Strawberry Cake Slice',zh:'新鲜草莓蛋糕(片)',ja:'生いちごケーキ(スライス)'}},
  {name:'뉴욕치즈케이크(슬라이스)',price:7000,category:'케이크',emoji:'🍰',q:'new york cheesecake rich dense slice',tr:{en:'NY Cheesecake Slice',zh:'纽约芝士蛋糕(片)',ja:'NYチーズケーキ(スライス)'}},
  {name:'초코가나슈케이크',price:7000,category:'케이크',emoji:'🍫',q:'chocolate ganache cake rich dark slice',tr:{en:'Choco Ganache Cake',zh:'巧克力甘纳许蛋糕',ja:'チョコガナッシュケーキ'}},
  {name:'레드벨벳케이크',price:7000,category:'케이크',emoji:'🍰',q:'red velvet cake cream cheese frosting slice',tr:{en:'Red Velvet Cake',zh:'红丝绒蛋糕',ja:'レッドベルベットケーキ'}},
  {name:'말차케이크(슬라이스)',price:7000,category:'케이크',emoji:'🍵',q:'matcha green tea cake layered slice',tr:{en:'Matcha Cake Slice',zh:'抹茶蛋糕(片)',ja:'抹茶ケーキ(スライス)'}},
  {name:'얼그레이케이크',price:7000,category:'케이크',emoji:'🫖',q:'earl grey tea cake lavender cream slice',tr:{en:'Earl Grey Cake',zh:'伯爵茶蛋糕',ja:'アールグレイケーキ'}},
  {name:'생일케이크(홀)',price:48000,category:'케이크',emoji:'🎂',q:'whole birthday cake celebration candles',tr:{en:'Birthday Cake (whole)',zh:'生日蛋糕(整个)',ja:'バースデーケーキ(ホール)'}},
  {name:'버터쿠키(3개)',price:4500,category:'쿠키/마카롱',emoji:'🍪',q:'butter cookies danish classic three pieces',tr:{en:'Butter Cookies (3pc)',zh:'黄油饼干(3个)',ja:'バタークッキー(3個)'}},
  {name:'초코칩쿠키',price:2500,category:'쿠키/마카롱',emoji:'🍪',q:'chocolate chip cookie warm baked gooey',tr:{en:'Choco Chip Cookie',zh:'巧克力曲奇',ja:'チョコチップクッキー'}},
  {name:'브라우니',price:3500,category:'쿠키/마카롱',emoji:'🍫',q:'fudgy chocolate brownie square dark',tr:{en:'Brownie',zh:'布朗尼',ja:'ブラウニー'}},
  {name:'마카롱(1개)',price:2500,category:'쿠키/마카롱',emoji:'🍬',q:'french macaron colorful pastel single',tr:{en:'Macaron (1pc)',zh:'马卡龙(1个)',ja:'マカロン(1個)'}},
  {name:'피낭시에(2개)',price:3500,category:'쿠키/마카롱',emoji:'🧁',q:'financier french almond butter cake two',tr:{en:'Financier (2pc)',zh:'费南雪(2个)',ja:'フィナンシェ(2個)'}},
  {name:'아메리카노(ICE)',price:4000,category:'음료',emoji:'☕',q:'iced americano tall glass coffee ice',tr:{en:'Iced Americano',zh:'冰美式',ja:'アイスアメリカーノ'}},
  {name:'아메리카노(HOT)',price:4000,category:'음료',emoji:'☕',q:'hot americano black coffee ceramic cup',tr:{en:'Hot Americano',zh:'热美式',ja:'ホットアメリカーノ'}},
  {name:'카페라떼',price:5000,category:'음료',emoji:'☕',q:'cafe latte art milk foam white cup',tr:{en:'Cafe Latte',zh:'拿铁',ja:'カフェラテ'}},
  {name:'바닐라라떼',price:5500,category:'음료',emoji:'☕',q:'vanilla latte flavored sweet coffee',tr:{en:'Vanilla Latte',zh:'香草拿铁',ja:'バニララテ'}},
  {name:'핫초코',price:5000,category:'음료',emoji:'🍫',q:'hot chocolate cocoa mug whipped cream',tr:{en:'Hot Chocolate',zh:'热巧克力',ja:'ホットチョコレート'}},
  {name:'오렌지주스(착즙)',price:6000,category:'음료',emoji:'🍊',q:'fresh squeezed orange juice glass citrus',tr:{en:'Fresh OJ',zh:'鲜榨橙汁',ja:'フレッシュオレンジジュース'}},
  {name:'딸기라떼',price:6000,category:'음료',emoji:'🍓',q:'strawberry milk latte pink drink glass',tr:{en:'Strawberry Latte',zh:'草莓拿铁',ja:'ストロベリーラテ'}},
  {name:'레몬에이드',price:5500,category:'음료',emoji:'🍋',q:'lemon ade sparkling soda fresh glass',tr:{en:'Lemon Ade',zh:'柠檬气泡饮',ja:'レモンエード'}}
 ],
 /* ────────────────── 기타/범용 (20 items) ────────────────── */
 other: [
  {name:'오늘의점심(런치세트)',price:10000,category:'세트',emoji:'🍱',q:'lunch set meal today special korean',tr:{en:"Today's Lunch Set",zh:'今日午餐套餐',ja:'本日のランチセット'}},
  {name:'된장찌개',price:8000,category:'찌개/국',emoji:'🍲',q:'doenjang jjigae soybean paste stew tofu',tr:{en:'Soybean Paste Stew',zh:'大酱汤',ja:'テンジャンチゲ'}},
  {name:'김치찌개',price:8000,category:'찌개/국',emoji:'🍲',q:'kimchi stew pork tofu korean red',tr:{en:'Kimchi Stew',zh:'泡菜汤',ja:'キムチチゲ'}},
  {name:'비빔밥',price:9000,category:'밥류',emoji:'🥗',q:'bibimbap colorful rice vegetables egg bowl',tr:{en:'Bibimbap',zh:'拌饭',ja:'ビビンバ'}},
  {name:'제육볶음',price:10000,category:'밥류',emoji:'🥩',q:'spicy pork stir fry rice korean red',tr:{en:'Spicy Stir-fried Pork',zh:'辣炒猪肉',ja:'チェユクボックム'}},
  {name:'돈가스',price:12000,category:'양식',emoji:'🍖',q:'tonkatsu pork cutlet breaded fried plate',tr:{en:'Pork Cutlet',zh:'猪排',ja:'トンカツ'}},
  {name:'파스타(오늘의)',price:13000,category:'양식',emoji:'🍝',q:'pasta of the day italian plate creamy',tr:{en:"Today's Pasta",zh:'今日意面',ja:'本日のパスタ'}},
  {name:'피자(오늘의)',price:15000,category:'양식',emoji:'🍕',q:'pizza of the day slice fresh baked',tr:{en:"Today's Pizza",zh:'今日披萨',ja:'本日のピザ'}},
  {name:'기본김밥',price:3500,category:'분식',emoji:'🍙',q:'basic gimbap seaweed rice roll sliced',tr:{en:'Basic Gimbap',zh:'基本紫菜包饭',ja:'基本キンパ'}},
  {name:'라면',price:4000,category:'분식',emoji:'🍜',q:'korean ramen noodle soup bowl spicy',tr:{en:'Ramen',zh:'泡面',ja:'ラーメン'}},
  {name:'삼겹살',price:15000,category:'구이',emoji:'🥩',q:'samgyeopsal pork belly grilling korean bbq',tr:{en:'Pork Belly',zh:'五花肉',ja:'サムギョプサル'}},
  {name:'불고기',price:13000,category:'구이',emoji:'🥩',q:'bulgogi marinated beef stir fry korean',tr:{en:'Bulgogi',zh:'烤牛肉',ja:'プルコギ'}},
  {name:'치킨(마리)',price:20000,category:'치킨',emoji:'🍗',q:'whole fried chicken golden crispy korean',tr:{en:'Whole Fried Chicken',zh:'整只炸鸡',ja:'チキン(一羽)'}},
  {name:'피자(판)',price:22000,category:'치킨',emoji:'🍕',q:'whole pizza large round baked oven',tr:{en:'Whole Pizza',zh:'整张披萨',ja:'ピザ(ホール)'}},
  {name:'커피(아메리카노)',price:4000,category:'음료',emoji:'☕',q:'americano coffee black glass hot cold',tr:{en:'Americano Coffee',zh:'美式咖啡',ja:'アメリカーノ'}},
  {name:'커피(라떼)',price:5000,category:'음료',emoji:'☕',q:'cafe latte milk coffee foam art',tr:{en:'Cafe Latte',zh:'拿铁咖啡',ja:'カフェラテ'}},
  {name:'주스(오렌지)',price:4000,category:'음료',emoji:'🍊',q:'orange juice glass fresh citrus',tr:{en:'Orange Juice',zh:'橙汁',ja:'オレンジジュース'}},
  {name:'콜라',price:3000,category:'음료',emoji:'🥤',q:'cola soft drink cold ice glass',tr:{en:'Cola',zh:'可乐',ja:'コーラ'}},
  {name:'맥주(500ml)',price:5000,category:'음료',emoji:'🍺',q:'beer cold glass foam pint draft',tr:{en:'Beer (500ml)',zh:'啤酒(500ml)',ja:'ビール(500ml)'}},
  {name:'공기밥',price:1000,category:'사이드',emoji:'🍚',q:'steamed white rice bowl plain korean',tr:{en:'Steamed Rice',zh:'米饭',ja:'ライス'}}
 ]
};

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
   _filoFillTemplateImages(refs);
   return items.length;
  });
 });
}

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


/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @module      filo-menu.js
 * @description 메뉴 원가계산·유통기한·재고이력·재고알림
 */
// 의존성: filo-common.js, filo-menu-image.js, filo-menu-templates.js
// 관련 컬렉션: filo_menus, menu_recipes, menu_costs, inventory, inventory_in, inventory_out
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

function _filoStockLowAlert(menuName, stock, stockMin){
 var title='재고 부족: '+menuName;
 var body='현재 재고 '+stock+'개 (기준: '+stockMin+'개 이하)';
 if('Notification' in window && Notification.permission==='granted'){
  new Notification(title,{body:body,icon:'/filo-icon-192.png',tag:'stock-'+menuName,vibrate:[200,100,200]});
 } else if('Notification' in window && Notification.permission!=='denied'){
  Notification.requestPermission().then(function(p){
   if(p==='granted') new Notification(title,{body:body,icon:'/filo-icon-192.png',tag:'stock-'+menuName});
  });
 }
 _filoToast(menuName+' 재고 부족 ('+stock+'개)');
}
