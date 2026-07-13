// filo-menu.js - 메뉴관리, 레시피, 원가, 유통기한
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
   if(snap.empty)return _db.collection('menu_costs').add({dealerId:did,name:menuName,price:price,cost:0,createdAt:new Date().toISOString()});
   return snap.docs[0].ref.update({price:price,updatedAt:new Date().toISOString()});
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
  if(snap.empty)return _db.collection('menu_costs').add({dealerId:did,name:menuName,price:price,cost:suggestedCost,createdAt:new Date().toISOString()});
  return snap.docs[0].ref.update({price:price,cost:suggestedCost,updatedAt:new Date().toISOString()});
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
 _db.collection('menu_costs').add({dealerId:did,name:name,price:price,cost:cost,createdAt:new Date().toISOString()}).then(function(){
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
function _filoImportMenuExcel(input){
 var file=input.files[0];
 if(!file)return;
 var did=_CU.dealerId||_CU.uid;
 var reader=new FileReader();
 reader.onload=function(e){
  try{
   var wb=XLSX.read(e.target.result,{type:'array'});
   var ws=wb.Sheets[wb.SheetNames[0]];
   var rows=XLSX.utils.sheet_to_json(ws,{defval:''});
   if(!rows.length){alert('데이터가 없습니다.');return;}
   var batch=[];
   rows.forEach(function(r){
    var name=r['메뉴명']||r['name']||'';
    var price=parseInt(r['가격']||r['price']||0);
    var category=r['카테고리']||r['category']||'기타';
    var emoji=r['이모지']||r['emoji']||'🍽';
    var description=r['설명(참고용)']||r['설명']||r['description']||'';
    if(!name||!price)return;
    batch.push({name:name,price:price,category:category,emoji:emoji,description:description,forSale:true,dealerId:did,stock:null,minStock:null});
   });
   if(!batch.length){alert('유효한 메뉴가 없습니다.');return;}
   var db=firebase.firestore();
   /* 기존 filo_menus 삭제 후 재등록 */
   db.collection('filo_menus').where('dealerId','==',did).get().then(function(old){
    var bwD=db.batch();
    old.forEach(function(oc){bwD.delete(oc.ref);});
    return bwD.commit();
   }).then(function(){
    var bw2=db.batch();
    batch.forEach(function(m){
     var ref=db.collection('filo_menus').doc();
     bw2.set(ref,m);
    });
    return bw2.commit();
   }).then(function(){
    alert(batch.length+'개 메뉴 등록 완료! 테이블 QR에도 반영됩니다.');
    _filoPageKiosk(document.getElementById('content'));
   }).catch(function(e){alert('저장 오류: '+e.message);});
  }catch(e){alert('파일 읽기 오류: '+e.message);}
 };
 reader.readAsArrayBuffer(file);
 input.value='';
}

function _filoPageMenuMgmt(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:900px;margin:0 auto';

 /* 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px';
 hdr.innerHTML='<div><div class="page-title">🍽 메뉴 관리</div><div class="page-sub">카테고리·메뉴 추가/수정/삭제 및 이미지 등록</div></div>';
 var addBtn=document.createElement('button');
 addBtn.className='btn btn-primary btn-sm';
 addBtn.textContent='+ 메뉴 추가';
 addBtn.onclick=function(){_filoMenuAddModal(did,null,null);};
 hdr.appendChild(addBtn);
 wrap.appendChild(hdr);

 /* 카테고리 관리 */
 var catCard=document.createElement('div');
 catCard.className='card';
 catCard.style.marginBottom='14px';
 catCard.innerHTML='<div class="sec-title" style="margin-bottom:10px">📂 카테고리</div>'+
  '<div id="cat-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px"></div>'+
  '<div style="display:flex;gap:8px">'+
  '<input id="new-cat-inp" type="text" placeholder="새 카테고리명" style="flex:1;padding:9px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none">'+
  '<button onclick="_filoAddCategory(\''+did+'\')" style="padding:9px 16px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-size:13px;font-weight:700;cursor:pointer">추가</button>'+
  '</div>';
 wrap.appendChild(catCard);

 /* 메뉴 목록 */
 var menuCard=document.createElement('div');
 menuCard.className='card';
 menuCard.innerHTML='<div class="sec-title" style="margin-bottom:12px">🍽 메뉴 목록</div>'+
  '<div id="menu-mgmt-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩 중...</div></div>';
 wrap.appendChild(menuCard);

 el.appendChild(wrap);
 _filoLoadMenuMgmt(did);
}

function _filoLoadMenuMgmt(did){
 Promise.all([
  _db.collection('filo_menus').where('dealerId','==',did).get(),
  _db.collection('menu_costs').where('dealerId','==',did).get()
 ]).then(function(results){
  var snap=results[0],costSnap=results[1];
  var costMap={};
  costSnap.forEach(function(doc){var d=doc.data();if(d.name&&d.cost!=null)costMap[d.name]=+d.cost;});
  /* 카테고리 목록 */
  var cats=[];
  snap.forEach(function(doc){
   var c=doc.data().category||'기타';
   if(cats.indexOf(c)<0)cats.push(c);
  });

  var catList=document.getElementById('cat-list');
  if(catList){
   catList.innerHTML=cats.map(function(c){
    return '<div style="display:flex;align-items:center;gap:4px;padding:5px 12px;background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.2);border-radius:20px;font-size:12px;font-weight:700;color:#a78bfa">'+
     c+
     '<button onclick="_filoDeleteCategory(\''+did+'\',\''+c+'\')" style="background:none;border:none;color:#a78bfa;cursor:pointer;font-size:14px;line-height:1;padding:0 0 0 4px;opacity:.6">×</button>'+
     '</div>';
   }).join('');
  }

  /* 메뉴 목록 */
  var list=document.getElementById('menu-mgmt-list');
  if(!list)return;
  if(snap.empty){
   list.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)"><div style="font-size:32px;margin-bottom:8px">🍽</div>등록된 메뉴가 없습니다<br><div style="font-size:12px;margin-top:8px">+ 메뉴 추가 버튼으로 시작하세요</div></div>';
   return;
  }

  /* 카테고리별 그룹핑 */
  var grouped={};
  snap.forEach(function(doc){
   var d=doc.data();
   var c=d.category||'기타';
   if(!grouped[c])grouped[c]=[];
   grouped[c].push(Object.assign({_id:doc.id},d));
  });

  list.innerHTML='';
  Object.keys(grouped).sort().forEach(function(cat){
   var catDiv=document.createElement('div');
   catDiv.style.marginBottom='16px';
   catDiv.innerHTML='<div style="font-size:11px;font-weight:800;color:var(--t3);letter-spacing:.8px;text-transform:uppercase;padding:6px 0;border-bottom:1px solid var(--bd);margin-bottom:8px">'+cat+'</div>';

   var grid=document.createElement('div');
   grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px';

   grouped[cat].forEach(function(m){
    var card=document.createElement('div');
    card.style.cssText='background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);padding:12px;position:relative;transition:.2s';
    card.onmouseover=function(){this.style.borderColor='rgba(124,58,237,.3)';};
    card.onmouseout=function(){this.style.borderColor='var(--bd2)';};

    /* 이미지 or 이모지 */
    var imgDiv=document.createElement('div');
    imgDiv.style.cssText='width:100%;height:80px;border-radius:8px;overflow:hidden;background:var(--surface3);display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:32px';
    if(m.imageUrl){
     var img=document.createElement('img');
     img.src=m.imageUrl;
     img.style.cssText='width:100%;height:100%;object-fit:cover';
     img.onerror=function(){this.style.display='none';imgDiv.textContent=m.emoji||'🍽';};
     imgDiv.appendChild(img);
    } else {
     imgDiv.textContent=m.emoji||'🍽';
    }
    card.appendChild(imgDiv);

    /* 메뉴 정보 */
    var info=document.createElement('div');
    var _p=+(m.price||0),_c=costMap[m.name]||0;
    var _mg=(_p>0&&_c>0)?Math.round((_p-_c)/_p*100):null;
    var _mc=_mg!=null?(_mg>=60?'#22c55e':_mg>=40?'#eab308':'#ef4444'):'';
    var _mb=_mg!=null?(_mg>=60?'rgba(34,197,94,.15)':_mg>=40?'rgba(234,179,8,.15)':'rgba(239,68,68,.15)'):'';
    var _mH=_mg!=null?'<div style="margin-top:3px;display:flex;gap:4px;align-items:center"><span style="font-size:10px;color:var(--t3)">원가 ₩'+Number(_c).toLocaleString()+'</span><span style="padding:1px 6px;border-radius:4px;font-weight:700;font-size:10px;background:'+_mb+';color:'+_mc+'">'+_mg+'%</span></div>':'';
    info.innerHTML='<div style="font-size:13px;font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(m.name)+'</div>'+
     '<div style="font-size:13px;font-weight:900;color:#22c55e">₩'+Number(m.price||0).toLocaleString()+'</div>'+
     _mH+
     (m.stock!=null?'<div style="font-size:10px;color:var(--t3);margin-top:2px">재고: '+m.stock+'개</div>':'');
    card.appendChild(info);

    /* 수정/삭제 버튼 */
    var btns=document.createElement('div');
    btns.style.cssText='display:flex;gap:6px;margin-top:8px';
    var editBtn=document.createElement('button');
    editBtn.style.cssText='flex:1;padding:6px;background:var(--br);border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:700;cursor:pointer';
    editBtn.textContent='수정';
    (function(menu){editBtn.onclick=function(){_filoMenuAddModal(did,menu,null);};})(m);
    var delBtn=document.createElement('button');
    delBtn.style.cssText='flex:1;padding:6px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.2);border-radius:6px;color:#ef4444;font-size:11px;cursor:pointer';
    delBtn.textContent='삭제';
    (function(id){delBtn.onclick=function(){
     if(!confirm('삭제하시겠습니까?'))return;
     _db.collection('filo_menus').doc(id).delete().then(function(){
      _filoToast('🗑 삭제됐습니다');
      _filoPageMenuMgmt(document.getElementById('content'));
     });
    };})(m._id);
    btns.appendChild(editBtn);btns.appendChild(delBtn);
    card.appendChild(btns);
    grid.appendChild(card);
   });
   catDiv.appendChild(grid);
   list.appendChild(catDiv);
  });
 }).catch(function(e){
  var list=document.getElementById('menu-mgmt-list');
  if(list)list.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3)">메뉴를 불러올 수 없습니다: '+e.message+'</div>';
 });
}

function _filoMenuAddModal(did, menu, cat){
 var isEdit=!!menu;
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;background:var(--surface);border:1px solid rgba(124,58,237,.15);border-radius:var(--r-xl)';

 /* 이미지 미리보기 */
 var imgPreview=document.createElement('div');
 imgPreview.style.cssText='width:100%;height:140px;background:var(--surface2);border-radius:var(--r);display:flex;align-items:center;justify-content:center;font-size:48px;margin-bottom:14px;cursor:pointer;border:2px dashed var(--bd2);overflow:hidden;position:relative';
 imgPreview.textContent=menu?menu.emoji||'🍽':'🍽';
 if(menu&&menu.imageUrl){
  var pimg=document.createElement('img');
  pimg.src=menu.imageUrl;
  pimg.style.cssText='width:100%;height:100%;object-fit:cover';
  imgPreview.innerHTML='';
  imgPreview.appendChild(pimg);
 }

 /* 이미지 업로드 */
 var fileInp=document.createElement('input');
 fileInp.type='file';fileInp.accept='image/*';fileInp.style.display='none';
 var uploadProgress=document.createElement('div');
 uploadProgress.style.cssText='font-size:11px;color:var(--t3);text-align:center;margin-top:4px';
 var _imageUrl=menu?menu.imageUrl||'':'';

 fileInp.onchange=function(){
  var file=this.files[0];
  if(!file)return;
  if(file.size>3*1024*1024){_filoToast('이미지는 3MB 이하만 가능합니다');return;}
  uploadProgress.textContent='⏳ 업로드 중...';
  var ref=_storage.ref('filo_menus/'+did+'/'+Date.now()+'_'+file.name.replace(/[^a-zA-Z0-9.]/g,'_'));
  var task=ref.put(file);
  task.on('state_changed',
   function(snap){var pct=Math.round(snap.bytesTransferred/snap.totalBytes*100);uploadProgress.textContent=pct+'% 업로드 중...';},
   function(e){uploadProgress.textContent='❌ '+e.message;},
   function(){
    ref.getDownloadURL().then(function(url){
     _imageUrl=url;
     imgPreview.innerHTML='';
     var ni=document.createElement('img');
     ni.src=url;ni.style.cssText='width:100%;height:100%;object-fit:cover';
     imgPreview.appendChild(ni);
     uploadProgress.textContent='✅ 이미지 업로드 완료';
    });
   }
  );
 };
 imgPreview.onclick=function(){fileInp.click();};

 // 메뉴명 입력 시 이모지 자동 매핑
 setTimeout(function(){
  var nameInp=box.querySelector('#menu-name-inp');
  var emojiInp=box.querySelector('#menu-emoji-inp');
  if(!nameInp||!emojiInp)return;
  nameInp.addEventListener('input',function(){
   var nm=this.value;
   var _nm=[
    ['아이스크림','🍦'],['소프트아이스','🍦'],['선데이','🍨'],
    ['치즈케이크','🍰'],['케이크','🎂'],['마카롱','🍬'],['쿠키','🍪'],
    ['와플','🧇'],['팬케이크','🥞'],['도넛','🍩'],['파이','🥧'],
    ['초코','🍫'],['딸기','🍓'],['아메리카노','☕'],['에스프레소','☕'],
    ['라떼','🥛'],['카푸치노','☕'],['프라푸치노','🧋'],['스무디','🥤'],
    ['주스','🧃'],['에이드','🥤'],['콜라','🥤'],['사이다','🥤'],['녹차','🍵'],['차','🍵'],
    ['맥주','🍺'],['와인','🍷'],['소주','🍶'],['막걸리','🍶'],
    ['버거','🍔'],['햄버거','🍔'],['치즈버거','🍔'],
    ['후라이드','🍗'],['양념치킨','🍗'],['파닭','🍗'],['치킨','🍗'],
    ['피자','🍕'],['떡볶이','🌶️'],['순대','🍢'],['튀김','🍤'],['라볶이','🍜'],
    ['감자튀김','🍟'],['감자','🥔'],['어니언링','🧅'],['콘','🌽'],
    ['샐러드','🥗'],['치즈스틱','🧀'],['치즈','🧀'],
    ['불고기','🥩'],['갈비','🥩'],['스테이크','🥩'],['삼겹살','🥩'],
    ['새우','🦐'],['오징어','🦑'],['연어','🐟'],['참치','🐟'],
    ['김밥','🍱'],['비빔밥','🍱'],['볶음밥','🍚'],['국밥','🍲'],
    ['라면','🍜'],['우동','🍜'],['파스타','🍝'],['스파게티','🍝'],
    ['돈까스','🍛'],['카레','🍛'],['짜장','🍜'],['짬뽕','🍜'],
    ['초밥','🍣'],['회','🍣'],['규동','🍚'],
    ['세트','🎉'],['콤보','🎉'],['빵','🥐'],['크로아상','🥐'],
    ['샌드위치','🥪'],['핫도그','🌭'],['타코','🌮'],['부리또','🌯'],
   ];
   for(var i=0;i<_nm.length;i++){
    if(nm.indexOf(_nm[i][0])>=0){
     emojiInp.value=_nm[i][1];
     // 미리보기 업데이트
     var prev=box.querySelector('.img-preview-box');
     if(prev&&!prev.querySelector('img')) prev.textContent=_nm[i][1];
     break;
    }
   }
  });
 },100);

 box.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:14px">'+(isEdit?'✏️ 메뉴 수정':'➕ 메뉴 추가')+'</div>';
 box.appendChild(imgPreview);
 box.appendChild(uploadProgress);
 box.appendChild(fileInp);

 /* 이미지 제거 버튼 */
 var rmBtn=document.createElement('button');
 rmBtn.style.cssText='width:100%;padding:6px;background:none;border:none;color:var(--t3);font-size:11px;cursor:pointer;margin-bottom:10px';
 rmBtn.textContent='🗑 이미지 제거 (이모지 사용)';
 rmBtn.onclick=function(){_imageUrl='';imgPreview.innerHTML='';imgPreview.textContent=document.getElementById('menu-emoji-inp').value||'🍽';uploadProgress.textContent='';};
 box.appendChild(rmBtn);

 /* 필드들 */
 var fields=[
  {id:'menu-name-inp',l:'메뉴명 *',type:'text',ph:'아메리카노',val:menu?menu.name:''},
  {id:'menu-price-inp',l:'가격 *',type:'number',ph:'4500',val:menu?menu.price:''},
  {id:'menu-cat-inp',l:'카테고리',type:'text',ph:'커피',val:menu?menu.category||'':''},
  {id:'menu-emoji-inp',l:'이모지',type:'text',ph:'☕',val:menu?menu.emoji||'🍽':'🍽'},
  {id:'menu-stock-inp',l:'재고 수량 (선택)',type:'number',ph:'100',val:menu&&menu.stock!=null?menu.stock:''},
  {id:'menu-stock-min-inp',l:'재고 알림 기준 (선택)',type:'number',ph:'10',val:menu&&menu.stockMin!=null?menu.stockMin:''},
 ];
 fields.forEach(function(f){
  var g=document.createElement('div');g.style.marginBottom='10px';
  var l=document.createElement('label');
  l.style.cssText='font-size:10px;color:var(--t3);font-weight:700;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.6px';
  l.textContent=f.l;
  var inp=document.createElement('input');
  inp.id=f.id;inp.type=f.type;inp.placeholder=f.ph;
  if(f.val!==undefined&&f.val!=='')inp.value=f.val;
  inp.style.cssText='width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none';
  /* 이모지 변경시 미리보기 업데이트 */
  if(f.id==='menu-emoji-inp'){
   inp.oninput=function(){if(!_imageUrl)imgPreview.textContent=this.value||'🍽';};
  }
  g.appendChild(l);g.appendChild(inp);box.appendChild(g);
 });

 /* 메뉴 설명 */
 var descG=document.createElement('div');descG.style.cssText='margin-bottom:14px';
 var descL=document.createElement('label');descL.textContent='메뉴 설명 (선택)';descL.style.cssText='font-size:11px;font-weight:700;color:var(--t2);margin-bottom:6px;display:block';
 var descInp=document.createElement('textarea');descInp.id='menu-desc-inp';descInp.placeholder='예: 국내산 돼지 순대, 매콤달콤한 소스와 함께';
 descInp.style.cssText='width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none;height:70px;resize:none';
 if(menu&&menu.description)descInp.value=menu.description;
 descG.appendChild(descL);descG.appendChild(descInp);box.appendChild(descG);

 /* 판매여부 */
 var saleRow=document.createElement('div');
 saleRow.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:14px';
 var saleChk=document.createElement('input');
 saleChk.type='checkbox';saleChk.id='menu-forsale-inp';saleChk.checked=menu?menu.forSale!==false:true;
 saleChk.style.cssText='width:16px;height:16px;accent-color:var(--br);cursor:pointer';
 var saleLbl=document.createElement('label');
 saleLbl.htmlFor='menu-forsale-inp';
 saleLbl.style.cssText='font-size:13px;cursor:pointer';
 saleLbl.textContent='판매 중 (체크 해제시 품절 표시)';
 saleRow.appendChild(saleChk);saleRow.appendChild(saleLbl);
 box.appendChild(saleRow);

 /* 버튼 */
 var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:8px;margin-top:4px';
 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);cursor:pointer';
 cancelBtn.textContent='취소';cancelBtn.onclick=function(){mo.remove();};
 var saveBtn=document.createElement('button');
 saveBtn.style.cssText='flex:2;padding:11px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-weight:800;cursor:pointer';
 saveBtn.textContent=isEdit?'✅ 수정 완료':'✅ 메뉴 등록';
 saveBtn.onclick=function(){
  var name=(document.getElementById('menu-name-inp').value||'').trim();
  var price=parseInt(document.getElementById('menu-price-inp').value)||0;
  var category=(document.getElementById('menu-cat-inp').value||'기타').trim();
  var emoji=(document.getElementById('menu-emoji-inp').value||'🍽').trim();
  var stock=document.getElementById('menu-stock-inp').value!==''?parseInt(document.getElementById('menu-stock-inp').value):null;
  var stockMin=document.getElementById('menu-stock-min-inp')?parseInt(document.getElementById('menu-stock-min-inp').value||'0'):0;
  var forSale=document.getElementById('menu-forsale-inp').checked;
  if(!name){_filoToast('메뉴명을 입력하세요');return;}
  if(!price){_filoToast('가격을 입력하세요');return;}
  var description=(document.getElementById('menu-desc-inp')?document.getElementById('menu-desc-inp').value||'':'').trim();
  var data={dealerId:did,name:name,price:price,category:category,emoji:emoji,forSale:forSale,imageUrl:_imageUrl||_filoAutoImageUrl(name,category,emoji),stock:stock,minStock:null,description:description,updatedAt:new Date().toISOString()};
  var promise=isEdit?
   _db.collection('filo_menus').doc(menu._id).set(data,{merge:true}):
   _db.collection('filo_menus').add(Object.assign(data,{createdAt:new Date().toISOString()}));
  promise.then(function(ref){
   _filoToast(isEdit?'✅ 수정됐습니다! 번역 중...':'✅ 등록됐습니다! 번역 중...');
   mo.remove();
   // 재고 하한선 체크 → 푸시 알림
   if(stock!=null && stockMin>0 && stock<=stockMin) _filoStockLowAlert(name, stock, stockMin);
   // 메뉴 저장 후 자동 번역 → Firestore에 저장
   var docId=isEdit?menu._id:(ref&&ref.id);
   if(docId && name){
    var langs=['en','zh','ja'];
    var translations={};
    var descTranslations={};
    var pending=langs.length*(description?2:1);
    function done(){
     pending--;
     if(pending<=0){
      var updateData={nameTranslations:translations};
      if(description) updateData.descTranslations=descTranslations;
      _db.collection('filo_menus').doc(docId).update(updateData)
       .then(function(){_filoToast('✅ 번역 저장 완료!');})
       .catch(function(){});
      _filoPageMenuMgmt(document.getElementById('content'));
     }
    }
    langs.forEach(function(lang){
     fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,lang:lang})})
     .then(function(r){return r.json();})
     .then(function(d){translations[lang]=d.translated||name;done();})
     .catch(function(){translations[lang]=name;done();});
     if(description){
      fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:description,lang:lang})})
      .then(function(r){return r.json();})
      .then(function(d){descTranslations[lang]=d.translated||description;done();})
      .catch(function(){descTranslations[lang]=description;done();});
     }
    });
   } else {
    _filoPageMenuMgmt(document.getElementById('content'));
   }
  }).catch(function(e){_filoToast('❌ '+e.message);});
 };
 btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
 box.appendChild(btnRow);

 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
 setTimeout(function(){document.getElementById('menu-name-inp').focus();},100);
}

function _toLoadMenus(did){
 _db.collection('filo_menus').where('dealerId','==',did).get().then(function(snap){
  var menus=[];
  snap.forEach(function(doc){var d=doc.data();if(d.forSale!==false&&d.name&&d.price)menus.push(Object.assign({_id:doc.id},d));});
  if(menus.length){window._toAllMenus=menus;_toRenderMenus(menus);return;}
  return _db.collection('inventory').where('dealerId','==',did).get();
 }).then(function(snap2){
  if(!snap2)return;
  var menus=[];
  snap2.forEach(function(doc){var d=doc.data();if(d.forSale!==false&&d.name&&d.price)menus.push(Object.assign({_id:doc.id},d));});
  window._toAllMenus=menus;_toRenderMenus(menus);
 });
}

function _toRenderMenus(menus){
 var cats=['전체',...new Set(menus.map(function(m){return m.category||'기타';}))];
 var cw=document.getElementById('to-cat-wrap');
 if(cw){
  cw.innerHTML='';
  cats.forEach(function(c,i){
   var cb=document.createElement('button');
   cb.style.cssText='padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;transition:.2s;border:'+(i===0?'none;background:var(--br);color:#fff':'1px solid var(--bd2);background:transparent;color:var(--t2)');
   cb.textContent=c;
   (function(cat,el){
    el.onclick=function(){
     document.querySelectorAll('#to-cat-wrap button').forEach(function(b){b.style.background='transparent';b.style.border='1px solid var(--bd2)';b.style.color='var(--t2)';});
     el.style.background='var(--br)';el.style.border='none';el.style.color='#fff';
     _toShowMenuGrid(cat==='전체'?menus:menus.filter(function(m){return (m.category||'기타')===cat;}));
    };
   })(c,cb);
   cw.appendChild(cb);
  });
 }
 _toShowMenuGrid(menus);
}

function _toShowMenuGrid(menus){
 var grid=document.getElementById('to-menu-grid');if(!grid)return;
 grid.innerHTML='';
 menus.forEach(function(m){
  var qty=_toCart[m._id]?_toCart[m._id].qty:0;
  var card=document.createElement('div');
  card.style.cssText='background:var(--surface2);border:2px solid '+(qty>0?'rgba(124,58,237,.4)':'var(--bd2)')+';border-radius:var(--r);padding:10px;cursor:pointer;text-align:center;transition:.2s;position:relative';
  var badge=qty>0?'<div style="position:absolute;top:-6px;right:-6px;background:var(--br);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900">'+qty+'</div>':'';
  card.innerHTML=badge+
   '<div style="font-size:24px;margin-bottom:4px">'+(m.emoji||'🍽')+'</div>'+
   '<div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+m.name+'</div>'+
   '<div style="font-size:12px;font-weight:900;color:#22c55e">₩'+Number(m.price).toLocaleString()+'</div>';
  if(qty>0){
   var qRow=document.createElement('div');
   qRow.style.cssText='display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px';
   var dBtn=document.createElement('button');
   dBtn.style.cssText='width:22px;height:22px;border-radius:50%;border:none;background:var(--br);color:#fff;font-size:14px;font-weight:900;cursor:pointer';
   dBtn.textContent='−';
   var aBtn=document.createElement('button');
   aBtn.style.cssText=dBtn.style.cssText;
   aBtn.textContent='+';
   var qNum=document.createElement('span');qNum.style.cssText='font-size:13px;font-weight:900;color:#a78bfa';qNum.textContent=qty;
   (function(id,name,price){
    dBtn.onclick=function(e){e.stopPropagation();_toDecItem(id);};
    aBtn.onclick=function(e){e.stopPropagation();_toAddItem(id,name,price);};
   })(m._id,m.name,m.price);
   qRow.appendChild(dBtn);qRow.appendChild(qNum);qRow.appendChild(aBtn);
   card.appendChild(qRow);
  }
  (function(id,name,price){card.onclick=function(){_toAddItem(id,name,price);};})(m._id,m.name,m.price);
  grid.appendChild(card);
 });
}

function _filoRmAddRowDOM(wrap,invItems,selId,amount,unit){
 if(!wrap)wrap=document.getElementById('rm-ings');
 if(!wrap)return;
 var units=['g','ml','개','스푼','봉','컵','장'];

 var row=document.createElement('div');
 row.className='rm-row';
 row.style.cssText='display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:6px;margin-bottom:7px;align-items:center';

 /* 재료 선택 */
 var sel=document.createElement('select');
 sel.className='rm-item';
 sel.style.cssText='padding:8px 8px;background:var(--bg3);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:12px;outline:none';
 var defOpt=document.createElement('option');
 defOpt.value='';defOpt.textContent='재료 선택';
 sel.appendChild(defOpt);
 invItems.forEach(function(it){
  var opt=document.createElement('option');
  opt.value=it.id;opt.textContent=it.name;
  if(it.id===selId)opt.selected=true;
  sel.appendChild(opt);
 });

 /* 사용량 */
 var amtInp=document.createElement('input');
 amtInp.className='rm-amount';amtInp.type='number';amtInp.placeholder='사용량';
 amtInp.style.cssText=sel.style.cssText;
 if(amount)amtInp.value=amount;

 /* 단위 */
 var unitSel=document.createElement('select');
 unitSel.className='rm-unit';
 unitSel.style.cssText=sel.style.cssText;
 units.forEach(function(u){
  var opt=document.createElement('option');
  opt.value=u;opt.textContent=u;
  if(u===unit)opt.selected=true;
  unitSel.appendChild(opt);
 });

 /* 삭제 버튼 */
 var delBtn=document.createElement('button');
 delBtn.style.cssText='padding:8px 10px;background:var(--red-bg);border:1px solid var(--red-bd);border-radius:var(--r);color:var(--red);font-size:12px;cursor:pointer';
 delBtn.textContent='✕';
 delBtn.onclick=function(){row.remove();};

 row.appendChild(sel);row.appendChild(amtInp);row.appendChild(unitSel);row.appendChild(delBtn);
 wrap.appendChild(row);
}
function _filoRmAddRow(invOpts){
 var wrap=document.getElementById('rm-ings');
 _filoRmAddRowDOM(wrap,_rmInvItems,'','','g');
}
function _filoPageExpiry(el){
 var did=(_cachedCompanyDoc||{}).dealerId||(_cachedCompanyDoc||{}).uid||'';
 if(!did){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">로그인 후 이용하세요</div>';return;}
 el.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">⏳ 로딩 중...</div>';
 var today=new Date().toISOString().slice(0,10);
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
