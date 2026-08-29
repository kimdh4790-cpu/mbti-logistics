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
