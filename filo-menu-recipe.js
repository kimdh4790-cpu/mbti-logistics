/*
 * filo-menu-recipe.js — FILO 레시피·원가·재고 관리
 * Copyright (c) 2024-2026 유한회사 엠비티아이
 *
 * 역할: 레시피 관리, 원가 계산, 유통기한, 재고 알림
 * 저장: menu_recipes / filo_menu_costs / inventory
 * 의존: filo-order-common.js
 *
 * 주요 함수:
 *   _filoAutoImageUrl(name)    — AI 메뉴 이미지 자동 생성
 *   _filoPageRecipe(el)        — 레시피 페이지
 *   _filoLoadRecipes(el,did)   — 레시피 목록
 *   _filoRecipeModal(r,did)    — 레시피 추가/수정 모달
 *   _filoRenderCostMgmt(el)    — 원가 관리 화면
 *   _filoPageExpiry(el)        — 유통기한 관리
 *   _filoStockLowAlert(did)    — 재고 부족 알림
 *
 * 최종수정: 2026-07-17 | 리팩토링 분리
 */

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
  '크루아상':'croissant french bakery food photography',
  '소금빵':'japanese salt bread roll bakery food photography',
  '마카롱':'french macaron colorful dessert food photography',
  '스콘':'british scone bakery food photography',
  '머핀':'muffin bakery food photography',
  '도넛':'donut doughnut bakery food photography',
  '타르트':'fruit tart french pastry food photography',
  '쿠키':'cookie bakery food photography',
  '베이글':'bagel bread food photography',
  '식빵':'white bread loaf food photography',
  '바게트':'french baguette bread food photography',
  '파운드케이크':'pound cake loaf food photography',
  '치즈케이크':'cheesecake dessert food photography',
  '초코케이크':'chocolate cake dessert food photography',
  '딸기케이크':'strawberry cake dessert food photography',
  '에클레어':'eclair french pastry food photography',
  '브라우니':'brownie chocolate dessert food photography',
  '와플':'waffle dessert food photography',
  '팬케이크':'pancake stack food photography',
  '치킨':'korean fried chicken food photography',
  '피자':'pizza food photography',
  '버거':'burger hamburger food photography',
  '초밥':'japanese sushi food photography',
  '우동':'japanese udon noodle food photography',
  '라멘':'japanese ramen noodle food photography',
  '짜장':'korean jajangmyeon black noodle food photography',
  '짬뽕':'korean spicy seafood noodle food photography',
  '탕수육':'korean sweet sour pork food photography',
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
  '음료':'beverage drink food photography',
  '디저트':'dessert food photography',
  '카페':'cafe coffee food photography',
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
 var seed=name.split('').reduce(function(a,c){return a+c.charCodeAt(0)},0)%9999;
 return 'https://image.pollinations.ai/prompt/'+encodeURIComponent(prompt)+'?width=400&height=400&nologo=true&seed='+seed;
}


function _filoPageRecipe(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="slide-up" style="max-width:860px;margin:0 auto">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
 '<div><div style="font-size:17px;font-weight:900">🍽 레시피 관리</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-top:2px">메뉴별 재료·사용량 등록 → AI 원가 자동계산</div></div>'+
 '<button onclick="_filoRecipeAdd(\''+did+'\')" style="padding:8px 14px;background:var(--br);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">+ 레시피 추가</button>'+
 '</div>'+
 '<div id="recipe-list">'+
 '<div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩 중...</div>'+
 '</div></div>';
 _filoLoadRecipes(did);
}


function _filoLoadRecipes(did){
 Promise.all([
  _db.collection('menu_recipes').where('dealerId','==',did).get(),
  _db.collection('inventory').where('dealerId','==',did).get(),
  _db.collection('inventory_in').where('dealerId','==',did).orderBy('createdAt','desc').get(),
  _db.collection('menu_costs').where('dealerId','==',did).get()
 ]).then(function(res){
  /* 최신 입고단가 맵 */
  var unitPriceMap={};   /* itemId → 단위당 단가(g/ml/개) */
  var unitTypeMap={};    /* itemId → baseUnit */
  res[1].forEach(function(doc){
   var d=doc.data();
   unitTypeMap[doc.id]=d.baseUnit||'개';
  });
  res[2].forEach(function(doc){
   var d=doc.data();
   if(!d.price||d.price<=0||unitPriceMap[d.itemId])return;
   /* 입고단위 → 기본단위 환산 */
   var inUnit=d.inUnit||unitTypeMap[d.itemId]||'개';
   var unitPrice=d.price;
   if(inUnit==='kg')unitPrice=d.price/1000;       /* g당 */
   else if(inUnit==='L')unitPrice=d.price/1000;    /* ml당 */
   else if(inUnit==='g'||inUnit==='ml'||inUnit==='개')unitPrice=d.price;
   unitPriceMap[d.itemId]={perUnit:unitPrice,inUnit:inUnit,totalPrice:d.price,qty:d.qty};
  });

  /* 메뉴별 레시피 그룹핑 */
  var recipeMap={};
  res[0].forEach(function(doc){
   var d=doc.data();
   if(!recipeMap[d.menuName])recipeMap[d.menuName]=[];
   recipeMap[d.menuName].push(Object.assign({_id:doc.id},d));
  });

  /* 판매가 맵 */
  var priceMap={};
  res[3].forEach(function(doc){var d=doc.data();priceMap[d.name]=d.price||0;});

  var list=document.getElementById('recipe-list');
  if(!list)return;
  var menuNames=Object.keys(recipeMap);
  if(!menuNames.length){
   list.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">'+
   '<div style="font-size:32px;margin-bottom:8px">🍽</div>'+
   '<div>등록된 레시피가 없습니다</div>'+
   '<div style="font-size:11px;margin-top:6px">+ 레시피 추가 버튼을 눌러 시작하세요</div></div>';
   return;
  }

  list.innerHTML=menuNames.map(function(menuName){
   var ings=recipeMap[menuName];
   var totalCost=0;
   var breakdown=ings.map(function(ing){
    var up=unitPriceMap[ing.itemId]||{perUnit:0};
    var cost=Math.round(up.perUnit*ing.amount);
    totalCost+=cost;
    return {name:ing.itemName,amount:ing.amount,unit:ing.unit,perUnit:up.perUnit,cost:cost};
   });
   var salePrice=priceMap[menuName]||0;
   var margin=salePrice>0?Math.round((salePrice-totalCost)/salePrice*100):0;
   var badge=margin>=60?'high':margin>=40?'mid':'low';
   return '<div class="card" style="margin-bottom:10px">'+
   '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">'+
   '<div>'+
   '<div style="font-size:14px;font-weight:900">'+esc(menuName)+'</div>'+
   '<div style="font-size:11px;color:var(--t3);margin-top:2px">재료 '+ings.length+'종</div>'+
   '</div>'+
   '<div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px">'+
   '<div style="font-size:16px;font-weight:900;color:#ef4444">원가 ₩'+totalCost.toLocaleString()+'</div>'+
   (salePrice>0?'<div style="font-size:11px;color:var(--t2)">판매가 ₩'+salePrice.toLocaleString()+' <span class="margin-badge '+badge+'">'+margin+'%</span></div>':
   '<button onclick="_filoSetMenuPriceRecipe(\''+did+'\',\''+menuName+'\','+totalCost+')" style="font-size:10px;padding:3px 10px;background:var(--br);border:none;border-radius:6px;color:#fff;cursor:pointer">판매가 설정</button>')+
   '</div></div>'+
   /* 재료 테이블 */
   '<div style="background:var(--b3);border-radius:10px;padding:10px 12px">'+
   '<div style="display:grid;grid-template-columns:1fr 80px 60px 70px;gap:6px;padding-bottom:6px;border-bottom:1px solid var(--bd);margin-bottom:6px">'+
   ['재료명','사용량','단위','원가'].map(function(h){return '<div style="font-size:9px;color:var(--t3);font-weight:700">'+h+'</div>';}).join('')+
   breakdown.map(function(b){
    return '<div style="font-size:12px">'+esc(b.name)+'</div>'+
    '<div style="font-size:12px;color:var(--t2)">'+b.amount+'</div>'+
    '<div style="font-size:12px;color:var(--t3)">'+b.unit+'</div>'+
    '<div style="font-size:12px;font-weight:700;color:#ef4444">₩'+b.cost+'</div>';
   }).join('')+
   '</div>'+
   (ings[0]&&unitPriceMap[ings[0].itemId]?'':'<div style="font-size:10px;color:#f59e0b">⚠️ 일부 재료 입고단가 없음 → 입고 등록 필요</div>')+
   '</div>'+
   '<div style="display:flex;gap:6px;margin-top:8px">'+
   '<button onclick="_filoRecipeEdit(\''+did+'\',\''+menuName+'\')" style="flex:1;padding:7px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer">✏️ 수정</button>'+
   '<button onclick="_filoRecipeDelete(\''+did+'\',\''+menuName+'\')" style="padding:7px 12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:8px;color:#ef4444;font-size:11px;cursor:pointer">삭제</button>'+
   '</div></div>';
  }).join('');
 });
}


function _filoRecipeAdd(did){
 _filoRecipeModal(did,'','',null);
}


function _filoRecipeEdit(did,menuName){
 _db.collection('menu_recipes').where('dealerId','==',did).where('menuName','==',menuName).get().then(function(snap){
  var ings=[];snap.forEach(function(doc){ings.push(Object.assign({_id:doc.id},doc.data()));});
  _filoRecipeModal(did,menuName,'',ings);
 });
}


function _filoRecipeModal(did,menuName,salePrice,existingIngs){
 _db.collection('inventory').where('dealerId','==',did).get().then(function(invSnap){
  var invItems=[];
  invSnap.forEach(function(doc){
   invItems.push({id:doc.id,name:doc.data().name||doc.id,baseUnit:doc.data().baseUnit||'개'});
  });
  _rmInvItems=invItems;

  /* ── DOM으로 모달 생성 ── */
  var mo=document.createElement('div');
  mo.className='mo';
  var box=document.createElement('div');
  box.style.cssText='padding:22px;width:100%;max-width:520px;overflow-y:auto;max-height:85vh';

  /* 타이틀 */
  var title=document.createElement('div');
  title.style.cssText='font-size:16px;font-weight:900;margin-bottom:16px';
  title.textContent=menuName?'✏️ 레시피 수정':'🍽 레시피 추가';
  box.appendChild(title);

  /* 메뉴명 + 판매가 그리드 */
  var grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px';

  /* 메뉴명 */
  var g1=document.createElement('div');
  var l1=document.createElement('label');
  l1.style.cssText='font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.6px';
  l1.textContent='메뉴명 *';
  var inp1=document.createElement('input');
  inp1.id='rm-name';inp1.type='text';inp1.placeholder='아이스 아메리카노';
  inp1.style.cssText='width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none';
  inp1.value=menuName||'';
  if(menuName){inp1.readOnly=true;inp1.style.opacity='.6';}
  g1.appendChild(l1);g1.appendChild(inp1);

  /* 판매가 */
  var g2=document.createElement('div');
  var l2=document.createElement('label');
  l2.style.cssText=l1.style.cssText;
  l2.textContent='판매가(원)';
  var inp2=document.createElement('input');
  inp2.id='rm-price';inp2.type='number';inp2.placeholder='4500';
  inp2.style.cssText=inp1.style.cssText;
  inp2.value=salePrice||'';
  g2.appendChild(l2);g2.appendChild(inp2);

  grid.appendChild(g1);grid.appendChild(g2);
  box.appendChild(grid);

  /* 재료 목록 라벨 */
  var ingLabel=document.createElement('div');
  ingLabel.style.cssText='font-size:11px;font-weight:800;color:var(--t2);margin-bottom:8px';
  ingLabel.textContent='재료 목록';
  box.appendChild(ingLabel);

  /* 재료 행 컨테이너 */
  var ingsWrap=document.createElement('div');
  ingsWrap.id='rm-ings';
  box.appendChild(ingsWrap);

  /* 기존 재료 행 복원 */
  (existingIngs||[]).forEach(function(ing){
   _filoRmAddRowDOM(ingsWrap,invItems,ing.itemId,ing.amount,ing.unit);
  });

  /* 재료 추가 버튼 */
  var addBtn=document.createElement('button');
  addBtn.style.cssText='width:100%;padding:8px;background:var(--surface2);border:1px dashed var(--bd2);border-radius:var(--r);color:var(--t2);font-size:12px;cursor:pointer;margin-bottom:14px';
  addBtn.textContent='+ 재료 추가';
  addBtn.onclick=function(){_filoRmAddRowDOM(ingsWrap,invItems,'','','g');};
  box.appendChild(addBtn);

  /* 버튼 행 */
  var btnRow=document.createElement('div');
  btnRow.style.cssText='display:flex;gap:8px';
  var cancelBtn=document.createElement('button');
  cancelBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);font-size:13px;cursor:pointer';
  cancelBtn.textContent='취소';
  cancelBtn.onclick=function(){mo.remove();};
  var saveBtn=document.createElement('button');
  saveBtn.style.cssText='flex:2;padding:11px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-size:13px;font-weight:700;cursor:pointer';
  saveBtn.textContent='💾 저장';
  saveBtn.onclick=function(){_filoRecipeSave(did,menuName);};
  btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
  box.appendChild(btnRow);

  mo.appendChild(box);
  mo.onclick=function(e){if(e.target===mo)mo.remove();};
  document.body.appendChild(mo);

  /* 기존 재료 없으면 빈 행 1개 추가 */
  if(!(existingIngs&&existingIngs.length)){
   _filoRmAddRowDOM(ingsWrap,invItems,'','','g');
  }
 });
}

var _rmInvItems=[];
var _rmInvOpts=''; /* 호환용 */


function _filoRecipeSave(did,oldMenuName){
 var menuName=(document.getElementById('rm-name').value||'').trim();
 var price=parseInt(document.getElementById('rm-price').value)||0;
 if(!menuName){_filoToast('메뉴명을 입력하세요');return;}
 var rows=document.querySelectorAll('#rm-ings .rm-row');
 var ings=[];
 rows.forEach(function(row){
  var sel=row.querySelector('.rm-item');
  var amt=parseFloat(row.querySelector('.rm-amount').value)||0;
  var unit=row.querySelector('.rm-unit').value;
  if(sel&&sel.value&&amt>0){
   var opt=sel.options[sel.selectedIndex];
   ings.push({itemId:sel.value,itemName:opt.textContent.trim(),amount:amt,unit:unit});
  }
 });
 if(!ings.length){_filoToast('재료를 1개 이상 추가하세요');return;}
 var targetMenu=oldMenuName||menuName;
 /* 기존 삭제 후 재등록 */
 _db.collection('menu_recipes').where('dealerId','==',did).where('menuName','==',targetMenu).get().then(function(snap){
  return Promise.all(snap.docs.map(function(d){return d.ref.delete();}));
 }).then(function(){
  return Promise.all(ings.map(function(ing){
   return _db.collection('menu_recipes').add(Object.assign({dealerId:did,menuName:menuName},ing));
  }));
 }).then(function(){
  /* menu_costs 동기화 */
  return _db.collection('menu_costs').where('dealerId','==',did).where('name','==',menuName).get().then(function(snap){
   if(snap.empty)return _db.collection('menu_costs').add({dealerId:did,name:menuName,price:price,cost:0,createdAt:_nowISO()});
   return snap.docs[0].ref.update({price:price,updatedAt:_nowISO()});
  });
 }).then(function(){
  document.querySelector('.mo')&&document.querySelector('.mo').remove();
  _filoToast('✅ 레시피 저장 완료');
  _filoPageRecipe(document.getElementById('content'));
 }).catch(function(e){_filoToast('❌ '+e.message);});
}


function _filoRecipeDelete(did,menuName){
 if(!confirm('"'+menuName+'" 레시피를 삭제할까요?'))return;
 _db.collection('menu_recipes').where('dealerId','==',did).where('menuName','==',menuName).get().then(function(snap){
  return Promise.all(snap.docs.map(function(d){return d.ref.delete();}));
 }).then(function(){
  _filoToast('삭제 완료');
  _filoPageRecipe(document.getElementById('content'));
 });
}


function _filoSetMenuPriceRecipe(did,menuName,suggestedCost){
 var price=parseInt(prompt('판매가를 입력하세요\n원가: ₩'+suggestedCost.toLocaleString()+'\n권장(마진 65%): ₩'+Math.round(suggestedCost/0.35).toLocaleString()))||0;
 if(!price)return;
 _db.collection('menu_costs').where('dealerId','==',did).where('name','==',menuName).get().then(function(snap){
  if(snap.empty)return _db.collection('menu_costs').add({dealerId:did,name:menuName,price:price,cost:suggestedCost,createdAt:_nowISO()});
  return snap.docs[0].ref.update({price:price,cost:suggestedCost,updatedAt:_nowISO()});
 }).then(function(){_filoToast('✅ 판매가 저장');_filoLoadRecipes(did);});
}

/* ══════════════════════════════════════════
   👤 직원 동적 QR 페이지
   직원별 개인 QR — 30초마다 코드 변경
   GPS 검증 + 시간 검증 포함
   ══════════════════════════════════════════ */

function _filoRenderCostMgmt(did){
 var content=document.getElementById('mg-content');
 if(!content)return;
 _db.collection('menu_costs').where('dealerId','==',did).get().then(function(snap){
  var items=[];
  snap.forEach(function(doc){items.push(Object.assign({_id:doc.id},doc.data()));});
  var html='<div class="card" style="margin-bottom:12px">'+
  '<div style="font-size:13px;font-weight:800;margin-bottom:14px">⚙️ 메뉴 원가 등록</div>'+
  '<div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:10px;align-items:end">'+
  '<div><label style="font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:4px">메뉴명</label>'+
  '<input id="mc-name" placeholder="아이스 아메리카노" style="width:100%;padding:8px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px"></div>'+
  '<div><label style="font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:4px">판매가(원)</label>'+
  '<input id="mc-price" type="number" placeholder="4500" style="width:100%;padding:8px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px"></div>'+
  '<div><label style="font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:4px">원가(원)</label>'+
  '<input id="mc-cost" type="number" placeholder="800" style="width:100%;padding:8px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px"></div>'+
  '<button onclick="_filoSaveCost(\''+did+'\')" style="padding:9px 16px;background:var(--br);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">+ 추가</button>'+
  '</div>'+
  '<div style="font-size:10px;color:var(--t3);padding:6px 0">💡 원가 등록 시 POS 결제에서 자동으로 마진 계산됩니다</div>'+
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
  _filoToast('✅ 원가 등록 완료');
  document.getElementById('mc-name').value='';
  document.getElementById('mc-price').value='';
  document.getElementById('mc-cost').value='';
  _filoRenderCostMgmt(did);
 }).catch(function(e){_filoToast('❌ '+e.message);});
}


function _filoDelCost(did,id){
 if(!confirm('삭제할까요?'))return;
 _db.collection('menu_costs').doc(id).delete().then(function(){
  _filoToast('삭제 완료');_filoRenderCostMgmt(did);
 });
}

/* ── AI 인사이트 탭 ── */

function _filoPageExpiry(el){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">로그인 후 이용하세요</div>';return;}
 el.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩 중...</div>';
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
 '<div style="font-size:13px;font-weight:800;margin-bottom:12px">📝 유통기한 등록</div>'+
 '<div style="display:grid;grid-template-columns:2fr 1fr auto;gap:8px;align-items:end">'+
 '<div class="fg"><label>품목</label><select id="exp-item" class="inp" style="font-size:12px"><option value="">-- 선택 --</option>';
 snap.forEach(function(doc){html+='<option value="'+doc.id+'">'+(doc.data().name||'')+'</option>';});
 html+='</select></div>'+
 '<div class="fg"><label>유통기한</label><input type="date" id="exp-date" class="inp"></div>'+
 '<button onclick="_filoExpSave(\''+did+'\')" style="padding:10px 12px;background:var(--br);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">저장</button>'+
 '</div></div>';
 if(expired.length){
 html+='<div class="card" style="border:2px solid #ef4444;margin-bottom:10px">'+
 '<div style="font-size:13px;font-weight:800;color:#ef4444;margin-bottom:8px">🚨 만료 ('+expired.length+'개) — 즉시 폐기</div>';
 expired.forEach(function(d){
 html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(239,68,68,.2)">'+
 '<span style="font-size:12px;font-weight:700">'+d.name+'</span>'+
 '<span style="font-size:11px;color:#ef4444;font-weight:700">'+d.expiryDate+' 만료</span></div>';
 });
 html+='</div>';
 }
 if(warn.length){
 html+='<div class="card" style="border:1px solid #f59e0b;margin-bottom:10px">'+
 '<div style="font-size:13px;font-weight:800;color:#f59e0b;margin-bottom:8px">⚠️ 7일 이내 만료 ('+warn.length+'개)</div>';
 warn.forEach(function(d){
 var dL=Math.ceil((new Date(d.expiryDate)-new Date(today))/86400000);
 html+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(245,158,11,.2)">'+
 '<span style="font-size:12px;font-weight:700">'+d.name+'</span>'+
 '<span style="font-size:11px;color:#f59e0b;font-weight:700">D-'+dL+'</span></div>';
 });
 html+='</div>';
 }
 html+='<div class="card"><div style="font-size:13px;font-weight:800;margin-bottom:10px">📦 전체 목록</div>';
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
 var icon=type==='in'?'📥':'📤';
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
 var title='⚠️ 재고 부족: '+menuName;
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
 _filoToast('⚠️ '+menuName+' 재고 부족 ('+stock+'개)');
}
