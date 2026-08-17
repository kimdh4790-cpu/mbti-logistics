/*
 * filo-menu-mgmt.js — FILO 메뉴 관리 (추가/수정/삭제/엑셀)
 * Copyright (c) 2024-2026 유한회사 엠비티아이
 *
 * 역할: 메뉴 CRUD, 엑셀 일괄 등록, 테이블오더 메뉴 동기화
 * 저장: filo_menus / Firebase Storage(filo_menus/{did}/)
 * 의존: filo-order-common.js, filo-auth.js
 *
 * 주요 함수:
 *   _filoPageMenuMgmt(el)     — 메뉴 관리 페이지
 *   _filoLoadMenuMgmt(el,did) — 메뉴 목록 로딩
 *   _filoMenuAddModal(m,did)  — 메뉴 추가/수정 모달
 *   _filoImportMenuExcel(inp) — 엑셀 일괄 등록
 *   _toLoadMenus/Render/Grid  — 테이블오더 메뉴
 *
 * 최종수정: 2026-07-17 | 리팩토링 분리
 */

function _filoPageMenuMgmt(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:900px;margin:0 auto';

 /* 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px';
 hdr.innerHTML='<div><div class="page-title">'+_svgIcon('utensils')+'메뉴 관리</div><div class="page-sub">카테고리·메뉴 추가/수정/삭제 및 이미지 등록</div></div>';
 var addBtn=document.createElement('button');
 addBtn.className='btn btn-primary btn-sm';
 addBtn.textContent='+ 메뉴 추가';
 addBtn.onclick=function(){_filoMenuAddModal(did,null,null);};
 hdr.appendChild(addBtn);

 // ★ 엑셀 일괄 등록 버튼
 var xlsLabel=document.createElement('label');
 xlsLabel.className='btn btn-sm';
 xlsLabel.style.cssText='background:#059669;color:#fff;cursor:pointer;font-size:12px';
 xlsLabel.innerHTML=_svgIcon('archive')+'엑셀 일괄 등록';
 var xlsInput=document.createElement('input');
 xlsInput.type='file';
 xlsInput.accept='.xlsx,.xls';
 xlsInput.style.display='none';
 xlsInput.onchange=function(){ _filoImportMenuExcel(this); };
 xlsLabel.appendChild(xlsInput);
 hdr.appendChild(xlsLabel);
 wrap.appendChild(hdr);

 /* 카테고리 관리 */
 var catCard=document.createElement('div');
 catCard.className='card';
 catCard.style.marginBottom='14px';
 catCard.innerHTML='<div class="sec-title" style="margin-bottom:10px">카테고리</div>'+
  '<div id="cat-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px"></div>'+
  '<div style="display:flex;gap:8px">'+
  '<input id="new-cat-inp" type="text" placeholder="새 카테고리명" style="flex:1;padding:9px 12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none">'+
  '<button onclick="_filoAddCategory(\''+did+'\')" style="padding:9px 16px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-size:13px;font-weight:700;cursor:pointer">추가</button>'+
  '</div>';
 wrap.appendChild(catCard);

 /* 메뉴 목록 */
 var menuCard=document.createElement('div');
 menuCard.className='card';
 menuCard.innerHTML='<div class="sec-title" style="margin-bottom:12px">메뉴 목록</div>'+
  '<div id="menu-mgmt-list"><div style="text-align:center;padding:30px;color:var(--t3)">로딩 중...</div></div>';
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
    return '<div style="display:flex;align-items:center;gap:4px;padding:5px 12px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);border-radius:20px;font-size:12px;font-weight:700;color:#a78bfa">'+
     c+
     '<button onclick="_filoDeleteCategory(\''+did+'\',\''+c+'\')" style="background:none;border:none;color:#a78bfa;cursor:pointer;font-size:14px;line-height:1;padding:0 0 0 4px;opacity:.6">×</button>'+
     '</div>';
   }).join('');
  }

  /* 메뉴 목록 */
  var list=document.getElementById('menu-mgmt-list');
  if(!list)return;
  if(snap.empty){
   list.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)"><div style="margin-bottom:8px;opacity:.4">'+ _svgIcon('utensils') +'</div>등록된 메뉴가 없습니다<br><div style="font-size:12px;margin-top:8px">+ 메뉴 추가 버튼으로 시작하세요</div></div>';
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
    card.onmouseover=function(){this.style.borderColor='rgba(201,168,76,.3)';};
    card.onmouseout=function(){this.style.borderColor='var(--bd2)';};

    /* 이미지 or 이모지 */
    var imgDiv=document.createElement('div');
    imgDiv.style.cssText='width:100%;height:80px;border-radius:8px;overflow:hidden;background:var(--surface3);display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:32px';
    if(m.imageUrl){
     var img=document.createElement('img');
     img.src=m.imageUrl;
     img.style.cssText='width:100%;height:100%;object-fit:cover';
     img.onerror=function(){this.style.display='none';imgDiv.innerHTML=m.emoji||_svgIcon('utensils');};
     imgDiv.appendChild(img);
    } else {
     imgDiv.innerHTML=m.emoji||_svgIcon('utensils');
    }
    card.appendChild(imgDiv);

    /* 메뉴 정보 */
    var info=document.createElement('div');
    var _p=+(m.price||0),_c=costMap[m.name]||0;
    var _mg=(_p>0&&_c>0)?Math.round((_p-_c)/_p*100):null;
    var _mc=_mg!=null?(_mg>=60?'#22c55e':_mg>=40?'#eab308':'#ef4444'):'';
    var _mb=_mg!=null?(_mg>=60?'rgba(34,197,94,.15)':_mg>=40?'rgba(234,179,8,.15)':'rgba(239,68,68,.15)'):'';
    var _mH=_mg!=null?'<div style="margin-top:3px;display:flex;gap:4px;align-items:center"><span style="font-size:10px;color:var(--t3)">원가 ₩'+Number(_c).toLocaleString()+'</span><span style="padding:1px 6px;border-radius:4px;font-weight:700;font-size:10px;background:'+_mb+';color:'+_mc+'">'+_mg+'%</span></div>':'';
    info.innerHTML='<div style="font-size:13px;font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx)">'+esc(m.name)+'</div>'+
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
      _filoToast('삭제됐습니다');
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
 box.style.cssText='padding:22px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;background:var(--surface);border:1px solid rgba(201,168,76,.15);border-radius:var(--r-xl)';

 /* 이미지 미리보기 */
 var imgPreview=document.createElement('div');
 imgPreview.style.cssText='width:100%;height:140px;background:var(--surface2);border-radius:var(--r);display:flex;align-items:center;justify-content:center;font-size:48px;margin-bottom:14px;cursor:pointer;border:2px dashed var(--bd2);overflow:hidden;position:relative';
 imgPreview.innerHTML=menu?(menu.emoji||_svgIcon('utensils')):_svgIcon('utensils');
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
  uploadProgress.textContent='업로드 중...';
  var ref=_storage.ref('filo_menus/'+did+'/'+Date.now()+'_'+file.name.replace(/[^a-zA-Z0-9.]/g,'_'));
  var task=ref.put(file);
  task.on('state_changed',
   function(snap){var pct=Math.round(snap.bytesTransferred/snap.totalBytes*100);uploadProgress.textContent=pct+'% 업로드 중...';},
   function(e){uploadProgress.textContent=e.message;},
   function(){
    ref.getDownloadURL().then(function(url){
     _imageUrl=url;
     imgPreview.innerHTML='';
     var ni=document.createElement('img');
     ni.src=url;ni.style.cssText='width:100%;height:100%;object-fit:cover';
     imgPreview.appendChild(ni);
     uploadProgress.textContent='이미지 업로드 완료';
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

 box.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:14px">'+(isEdit?'메뉴 수정':'메뉴 추가')+'</div>';
 box.appendChild(imgPreview);
 box.appendChild(uploadProgress);
 box.appendChild(fileInp);

 /* 이미지 제거 버튼 */
 var rmBtn=document.createElement('button');
 rmBtn.style.cssText='width:100%;padding:6px;background:none;border:none;color:var(--t3);font-size:11px;cursor:pointer;margin-bottom:10px';
 rmBtn.textContent='이미지 제거';
 rmBtn.onclick=function(){_imageUrl='';imgPreview.innerHTML='';imgPreview.innerHTML=document.getElementById('menu-emoji-inp').value||_svgIcon('utensils');uploadProgress.textContent='';};
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
   inp.oninput=function(){if(!_imageUrl)imgPreview.innerHTML=this.value||_svgIcon('utensils');};
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
 saveBtn.textContent=isEdit?'수정 완료':'메뉴 등록';
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
  var data={dealerId:did,name:name,price:price,category:category,emoji:emoji,forSale:forSale,imageUrl:_imageUrl||_filoAutoImageUrl(name,category,emoji),stock:stock,minStock:stockMin>0?stockMin:null,description:description,updatedAt:_nowISO()};
  var promise=isEdit?
   _db.collection('filo_menus').doc(menu._id).set(data,{merge:true}):
   _db.collection('filo_menus').add(Object.assign(data,{createdAt:_nowISO()}));
  promise.then(function(ref){
   _filoToast(isEdit?'수정됐습니다! 번역 중...':'등록됐습니다! 번역 중...');
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
       .then(function(){_filoToast('번역 저장 완료!');})
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
  }).catch(function(e){_filoToast(e.message);});
 };
 btnRow.appendChild(cancelBtn);btnRow.appendChild(saveBtn);
 box.appendChild(btnRow);

 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
 setTimeout(function(){document.getElementById('menu-name-inp').focus();},100);
}


function _filoImportMenuExcel(input){
 var file=input.files[0];
 if(!file)return;
 var did=_CU.dealerId||_CU.uid;
 var reader=new FileReader();
 reader.onload=function(e){
  try{
   var wb=XLSX.read(e.target.result,{type:'array'});
   var ws=wb.Sheets[wb.SheetNames[0]];
   // range:2 = 0-based → 3번째 행(category,name...)을 헤더로 인식
   var rows=XLSX.utils.sheet_to_json(ws,{defval:'',range:2});
   // 4행 한글설명 행 제거
   rows=rows.filter(function(r){ var n=String(r['name']||''); return n!=='' && n!=='메뉴명' && n.indexOf('*')<0; });
   if(!rows.length){_filoToast('데이터가 없습니다');return;}
   var batch=[];
   rows.forEach(function(r){
    // 컬럼명 유연하게 파싱 (한글/영문/괄호 포함 모두 지원)
    function col(keys){ for(var k in r){ var kl=k.replace(/[*\(\)]/g,'').trim(); for(var i=0;i<keys.length;i++){if(kl===keys[i]||k===keys[i])return r[k];} } return ''; }
    var name     = col(['메뉴명','name']) || '';
    var price    = parseInt(col(['가격','price']) || 0);
    var category = col(['카테고리','category']) || '기타';
    var emoji    = col(['이모지','emoji']) || '🍽';
    var desc     = col(['설명','description']) || '';
    var isBakery = String(col(['빵/디저트여부','isBakery','bakery'])||'').toLowerCase()==='true';
    var soldOut  = String(col(['품절여부','soldOut'])||'').toLowerCase()==='true';
    // category 키워드로 isBakery 자동 설정
    var bakeryKw=['빵','베이커리','디저트','케이크','쿠키','마카롱','타르트','스콘','머핀','도넛','크루아상','소금빵'];
    if(!isBakery) isBakery = bakeryKw.some(function(k){return (category||'').includes(k)||(name||'').includes(k);});
    if(!name||!price)return;
    var excelImg = col(['imageSearchQuery','이미지검색어']) || '';
    var autoImg  = excelImg || (typeof _filoAutoImageUrl==='function' ? _filoAutoImageUrl(name,category,emoji) : '');
    batch.push({name:name,price:price,category:category,emoji:emoji,description:desc,
      isBakery:isBakery,soldOut:soldOut,forSale:true,dealerId:did,
      imageSearchQuery:autoImg,stock:null,minStock:null});
   });
   if(!batch.length){_filoToast('유효한 메뉴가 없습니다');return;}
   var db=firebase.firestore();
   /* ★ 기존 메뉴 유지 + 새 메뉴 추가 (중복 메뉴명은 업데이트) */
   db.collection('filo_menus').where('dealerId','==',did).get().then(function(existing){
    // 기존 메뉴명 → doc ref 맵
    var existMap={};
    existing.forEach(function(doc){ existMap[doc.data().name]=doc.ref; });

    var bw=db.batch();
    var addCnt=0, updCnt=0;
    batch.forEach(function(m){
     if(existMap[m.name]){
      // 같은 이름 있으면 업데이트 (가격/카테고리 등)
      bw.update(existMap[m.name], m);
      updCnt++;
     } else {
      // 새 메뉴 추가
      bw.set(db.collection('filo_menus').doc(), m);
      addCnt++;
     }
    });
    return bw.commit().then(function(){
     _filoToast('신규 '+addCnt+'개 추가 / '+updCnt+'개 업데이트 완료!');
     _filoLoadMenuMgmt(document.getElementById('content'), did);
    });
   }).catch(function(e){_filoToast('저장 오류: '+e.message);});
  }catch(e){_filoToast('파일 읽기 오류: '+e.message);}
 };
 reader.readAsArrayBuffer(file);
 input.value='';
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
  card.style.cssText='background:var(--surface2);border:2px solid '+(qty>0?'rgba(201,168,76,.4)':'var(--bd2)')+';border-radius:var(--r);padding:10px;cursor:pointer;text-align:center;transition:.2s;position:relative';
  var badge=qty>0?'<div style="position:absolute;top:-6px;right:-6px;background:var(--br);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900">'+qty+'</div>':'';
  card.innerHTML=badge+
   '<div style="font-size:22px;margin-bottom:4px">'+(m.emoji||_svgIcon('utensils'))+'</div>'+
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
// ── QR 카드 인쇄 (프리미엄 다크 디자인) ─────────────────────
function _qrPrintCard(id, name, url, badgeLabel) {
  var wrap = document.getElementById(id);
  if(!wrap) return;
  var canvas = wrap.querySelector('canvas');
  var imgEl = wrap.querySelector('img');
  var src = canvas ? canvas.toDataURL('image/png') : (imgEl ? imgEl.src : '');
  if(!src) { _filoToast('QR 이미지 없음'); return; }
  var storeName = (_CU&&(_CU.storeName||_CU.displayName||_CU.businessName))||'';
  var badge = badgeLabel || name;
  var w = window.open('','_blank','width=440,height=560');
  if(!w||!w.document){_filoToast('팝업을 허용해주세요');return;}
  w.document.write('<html><head><meta charset="UTF-8"><title>'+name+'</title>'+
   '<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:400px;height:500px;overflow:hidden}'+
   'body{font-family:"Apple SD Gothic Neo","맑은 고딕","Noto Sans KR",sans-serif;background:#fff}'+
   '.card{width:400px;height:500px;position:relative;overflow:hidden;background:#0A0E2A}'+
   '.gold-top{height:4px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)}'+
   '.gold-bot{position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)}'+
   '.deco1{position:absolute;top:-50px;right:-50px;width:180px;height:180px;border-radius:50%;border:1px solid rgba(201,168,76,.12);z-index:0}'+
   '.deco2{position:absolute;bottom:-30px;left:-30px;width:130px;height:130px;border-radius:50%;border:1px solid rgba(201,168,76,.08);z-index:0}'+
   '.header{padding:22px 28px 14px;text-align:center;position:relative;z-index:1}'+
   '.rest-label{font-size:11px;color:rgba(201,168,76,.65);letter-spacing:4px;font-weight:500;margin-bottom:6px}'+
   '.store-name{font-size:28px;font-weight:900;color:#fff;letter-spacing:5px;line-height:1;margin-bottom:10px}'+
   '.divider{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px}'+
   '.divider-line{height:1px;width:36px;background:rgba(201,168,76,.5)}'+
   '.brand{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:3px}'+
   '.brand-filo{font-size:14px;font-weight:800;color:#00CFFF;letter-spacing:3px}'+
   '.brand-dine{font-size:14px;font-weight:800;color:#00E890;letter-spacing:3px}'+
   '.brand-dot{color:rgba(201,168,76,.7);font-size:10px}'+
   '.sub{font-size:9px;color:rgba(255,255,255,.3);letter-spacing:2px}'+
   '.sep{margin:0 28px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.3),transparent)}'+
   '.qr-wrap{padding:14px 0 10px;text-align:center;position:relative;z-index:1}'+
   '.qr-box{background:#fff;border-radius:14px;padding:10px;display:inline-block}'+
   '.badge{text-align:center;padding:2px 0 10px;position:relative;z-index:1}'+
   '.badge-inner{display:inline-flex;align-items:center;gap:8px;border:1.5px solid rgba(201,168,76,.55);border-radius:50px;padding:7px 24px;background:rgba(201,168,76,.07)}'+
   '.badge-label{font-size:11px;font-weight:700;color:rgba(201,168,76,.8);letter-spacing:2px}'+
   '.badge-name{font-size:20px;font-weight:900;color:#C9A84C;line-height:1}'+
   '.footer{text-align:center;padding:4px 0 8px;position:relative;z-index:1}'+
   '.footer p{font-size:8px;color:rgba(255,255,255,.22);letter-spacing:1.5px}'+
   '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'+
   '</style></head><body onload="window.print()">'+
   '<div class="card"><div class="gold-top"></div><div class="deco1"></div><div class="deco2"></div>'+
   '<div class="header">'+
   (storeName?'<div class="rest-label">RESTAURANT</div><div class="store-name">'+storeName+'</div>':'')+
   '<div class="divider"><div class="divider-line"></div><span style="color:#C9A84C;font-size:9px">✦</span><div class="divider-line"></div></div>'+
   '<div class="brand"><span class="brand-filo">FILO</span><span class="brand-dot">✦</span><span class="brand-dine">DINE</span></div>'+
   '<div class="sub">Scan to Order · Menu &amp; Pay</div></div>'+
   '<div class="sep"></div>'+
   '<div class="qr-wrap"><div class="qr-box"><img src="'+src+'" style="width:170px;height:170px;display:block"></div></div>'+
   '<div class="badge"><div class="badge-inner"><span class="badge-name">'+badge+'</span></div></div>'+
   '<div class="footer"><p>powered by FILO · dine.ne.kr</p></div>'+
   '<div class="gold-bot"></div></div>'+
   '</body></html>');
  w.document.close();
}

// ── QR 관리 페이지 ────────────────────────────────────────────
function _filoPageQrMgmt(el) {
  var did = _CU.dealerId||_CU.uid;
  var base = 'https://filo.ai.kr';

  function ensureQR(cb) {
    if(typeof QRCode !== 'undefined') { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = function(){ setTimeout(cb,100); };
    document.head.appendChild(s);
  }

  // 프리미엄 다크 QR 카드 DOM 생성
  var storeName = (_CU&&(_CU.storeName||_CU.displayName||_CU.businessName))||
    (window._cachedCompanyDoc&&(window._cachedCompanyDoc.companyName||window._cachedCompanyDoc.name))||'';

  function makeQrCard(id, label, badgeText, url, isBakery) {
    var outer = document.createElement('div');
    outer.style.cssText = 'position:relative;border-radius:16px;overflow:hidden;background:#0A0E2A;text-align:center;padding-bottom:4px';

    // 골드 상단 라인
    var topLine = document.createElement('div');
    topLine.style.cssText = 'height:3px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)';
    outer.appendChild(topLine);

    // 장식 원
    var deco = document.createElement('div');
    deco.style.cssText = 'position:absolute;top:-30px;right:-30px;width:100px;height:100px;border-radius:50%;border:1px solid rgba(201,168,76,.1);pointer-events:none';
    outer.appendChild(deco);

    // 헤더 (매장명 + 브랜드)
    var hdr = document.createElement('div');
    hdr.style.cssText = 'padding:10px 8px 6px;position:relative;z-index:1';
    hdr.innerHTML =
      (storeName ? '<div style="font-size:13px;font-weight:900;color:#fff;letter-spacing:3px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+storeName+'</div>' : '')+
      '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:1px">'+
      '<span style="font-size:9px;font-weight:800;color:#00CFFF;letter-spacing:2px">FILO</span>'+
      '<span style="color:rgba(201,168,76,.7);font-size:7px">✦</span>'+
      '<span style="font-size:9px;font-weight:800;color:#00E890;letter-spacing:2px">DINE</span>'+
      '</div>'+
      '<div style="font-size:7px;color:rgba(255,255,255,.3);letter-spacing:1.5px">Scan to Order</div>';
    outer.appendChild(hdr);

    // 구분선
    var sep = document.createElement('div');
    sep.style.cssText = 'margin:0 16px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.25),transparent)';
    outer.appendChild(sep);

    // QR 코드
    var qrWrap = document.createElement('div');
    qrWrap.style.cssText = 'padding:10px 0 6px;position:relative;z-index:1';
    var qrBox = document.createElement('div');
    qrBox.style.cssText = 'background:#fff;border-radius:10px;padding:7px;display:inline-block';
    var qrDiv = document.createElement('div');
    qrDiv.id = id;
    qrDiv.style.cssText = 'width:100px;height:100px';
    qrBox.appendChild(qrDiv);
    qrWrap.appendChild(qrBox);
    outer.appendChild(qrWrap);

    // 이름 배지
    var badge = document.createElement('div');
    badge.style.cssText = 'padding:4px 10px 8px;position:relative;z-index:1';
    if(isBakery) {
      // 빵/디저트: 이름 크게 + 가격 작게
      var parts = badgeText.split('₩');
      var itemName = parts[0].trim();
      var itemPrice = parts[1] ? '₩'+parts[1].trim() : '';
      badge.innerHTML =
        '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:2px;line-height:1.2">'+itemName+'</div>'+
        (itemPrice ? '<div style="font-size:12px;font-weight:700;color:#C9A84C">'+itemPrice+'</div>' : '');
    } else {
      // 테이블: 기존 pill 배지
      badge.innerHTML =
        '<div style="display:inline-flex;align-items:center;border:1.5px solid rgba(201,168,76,.5);border-radius:50px;padding:4px 14px;background:rgba(201,168,76,.07)">'+
        '<span style="font-size:13px;font-weight:900;color:#C9A84C">'+badgeText+'</span>'+
        '</div>';
    }
    outer.appendChild(badge);

    // 푸터
    var ftr = document.createElement('div');
    ftr.style.cssText = 'font-size:7px;color:rgba(255,255,255,.2);letter-spacing:1px;padding-bottom:8px;position:relative;z-index:1';
    ftr.textContent = 'powered by FILO · dine.ne.kr';
    outer.appendChild(ftr);

    // 골드 하단 라인
    var botLine = document.createElement('div');
    botLine.style.cssText = 'height:3px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)';
    outer.appendChild(botLine);

    // 버튼 행
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:4px;justify-content:center;padding:8px 8px 0';
    var dlBtn = document.createElement('button');
    dlBtn.textContent = '저장';
    dlBtn.style.cssText = 'padding:4px 8px;background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);border-radius:6px;color:#38bdf8;font-size:10px;font-weight:700;cursor:pointer';
    dlBtn.onclick = function(){ _qrDownload(id, label); };
    var prBtn = document.createElement('button');
    prBtn.textContent = '인쇄';
    prBtn.style.cssText = 'padding:4px 8px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);border-radius:6px;color:#a78bfa;font-size:10px;font-weight:700;cursor:pointer';
    (function(divId,name,qrUrl,badge){prBtn.onclick=function(){_qrPrintCard(divId,name,qrUrl,badge);};})(id,label,url,badgeText);
    var pvBtn = document.createElement('button');
    pvBtn.textContent = '미리보기';
    pvBtn.style.cssText = 'padding:4px 8px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:6px;color:#22c55e;font-size:10px;font-weight:700;cursor:pointer';
    pvBtn.onclick = function(){ window.open(url,'_blank'); };
    btnRow.appendChild(dlBtn); btnRow.appendChild(prBtn); btnRow.appendChild(pvBtn);

    // 래퍼 (카드 + 버튼)
    var wrap = document.createElement('div');
    wrap.appendChild(outer);
    wrap.appendChild(btnRow);

    ensureQR(function(){
      try{ new QRCode(qrDiv,{text:url,width:100,height:100,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M}); }
      catch(e){ qrDiv.innerHTML='<div style="font-size:9px;color:red">QR 오류</div>'; }
    });

    return wrap;
  }

  // 레이아웃
  el.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'max-width:640px;margin:0 auto';
  wrap.innerHTML =
    '<div style="font-size:17px;font-weight:900;margin-bottom:4px">QR 관리</div>'+
    '<div style="font-size:12px;color:var(--t3);margin-bottom:20px">테이블 QR과 빵·디저트 명판 QR을 한곳에서 관리해요</div>';

  // 테이블 QR 섹션
  var tableSection = document.createElement('div');
  tableSection.style.cssText = 'background:var(--b2);border-radius:12px;padding:16px;margin-bottom:16px';
  tableSection.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'+
    '<div style="font-size:14px;font-weight:800">테이블 QR</div>'+
    '<button onclick="_filoQRPrintAll()" style="padding:5px 12px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:8px;color:#22c55e;font-size:11px;font-weight:700;cursor:pointer">전체 인쇄</button>'+
    '</div>';
  var tableGrid = document.createElement('div');
  tableGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px';
  tableGrid.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:10px">로딩 중...</div>';
  tableSection.appendChild(tableGrid);
  wrap.appendChild(tableSection);

  // 빵 QR 섹션
  var bakerySection = document.createElement('div');
  bakerySection.style.cssText = 'background:var(--b2);border-radius:12px;padding:16px';
  bakerySection.innerHTML =
    '<div style="font-size:14px;font-weight:800;margin-bottom:4px">빵·디저트 명판 QR</div>'+
    '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">인쇄해서 진열대 명판에 붙여주세요!</div>';
  var bakeryGrid = document.createElement('div');
  bakeryGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px';
  bakeryGrid.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:10px">로딩 중...</div>';
  bakerySection.appendChild(bakeryGrid);
  wrap.appendChild(bakerySection);
  el.appendChild(wrap);

  // 테이블 QR 로드 (올바른 URL: /order?d=did&t=num)
  _db.collection('filo_tables').where('dealerId','==',did).get()
    .then(function(snap) {
      tableGrid.innerHTML = '';
      var tables = [];
      if(snap.empty) {
        for(var i=1;i<=10;i++) tables.push({num:i,name:'테이블 '+i});
      } else {
        var seen={};
        snap.forEach(function(d){
          var dt=d.data();
          var num=dt.tableNum||dt.tableId||1;
          var name=dt.tableName||('테이블 '+num);
          if(!seen[num]) seen[num]={num:num,name:name};
        });
        tables=Object.values(seen);
      }
      tables.sort(function(a,b){ return a.num-b.num; });
      tables.forEach(function(t) {
        var url = base + '/order?d=' + did + '&t=' + t.num + '&name=' + encodeURIComponent(t.name);
        var card = makeQrCard('qrt-'+t.num, t.name, t.name, url, false);
        tableGrid.appendChild(card);
      });
    }).catch(function(e) {
      tableGrid.innerHTML = '<div style="color:var(--red,red);font-size:12px">로딩 실패: '+e.message+'</div>';
    });

  // 빵·디저트 QR 로드
  var bakeryKw = ['빵','베이커리','디저트','케이크','쿠키','마카롱','타르트','스콘','머핀','도넛','크루아상','소금빵'];
  _db.collection('filo_menus').where('dealerId','==',did).get()
    .then(function(snap) {
      bakeryGrid.innerHTML = '';
      var menus = [];
      snap.forEach(function(d){ menus.push(Object.assign({id:d.id}, d.data())); });
      menus = menus.filter(function(m) {
        var cat = (m.category||'').toLowerCase();
        var nm = (m.name||'').toLowerCase();
        return bakeryKw.some(function(k){ return cat.includes(k)||nm.includes(k); }) || m.isBakery;
      });
      if(!menus.length) {
        bakeryGrid.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:10px">빵/디저트 카테고리 메뉴가 없어요.<br>메뉴 등록 시 카테고리를 "빵" 또는 "디저트"로 설정해주세요</div>';
        return;
      }
      menus.forEach(function(m) {
        var url = base + '/add?d=' + did +
          '&n=' + encodeURIComponent(m.name||'') +
          '&p=' + (m.price||0) +
          '&e=' + encodeURIComponent(m.emoji||'🥐');
        var displayName = (m.emoji||'🥐')+' '+(m.name||'');
        var card = makeQrCard('qrb-'+m.id, displayName, (m.name||'')+(m.price?' ₩'+(m.price).toLocaleString():''), url, true);
        bakeryGrid.appendChild(card);
      });
    }).catch(function(e) {
      bakeryGrid.innerHTML = '<div style="color:var(--red,red);font-size:12px">로딩 실패: '+e.message+'</div>';
    });
}

// 빵·디저트 QR 전용 페이지 (테이블 QR 없이 상품 QR만 표시)
function _filoBakeryQrMgmt(el) {
  var did = _CU.dealerId||_CU.uid;
  var base = 'https://filo.ai.kr';

  function ensureQR2(cb) {
    if(typeof QRCode !== 'undefined') { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = function(){ setTimeout(cb,100); };
    document.head.appendChild(s);
  }

  var storeName2 = (_CU&&(_CU.storeName||_CU.displayName||_CU.businessName))||
    (window._cachedCompanyDoc&&(window._cachedCompanyDoc.companyName||window._cachedCompanyDoc.name))||'';

  function makeItemCard(id, label, badgeText, url) {
    var outer = document.createElement('div');
    outer.style.cssText = 'position:relative;border-radius:16px;overflow:hidden;background:#0A0E2A;text-align:center;padding-bottom:4px';

    var topLine = document.createElement('div');
    topLine.style.cssText = 'height:3px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)';
    outer.appendChild(topLine);

    var deco = document.createElement('div');
    deco.style.cssText = 'position:absolute;top:-30px;right:-30px;width:100px;height:100px;border-radius:50%;border:1px solid rgba(201,168,76,.1);pointer-events:none';
    outer.appendChild(deco);

    var hdr = document.createElement('div');
    hdr.style.cssText = 'padding:10px 8px 6px;position:relative;z-index:1';
    hdr.innerHTML =
      (storeName2 ? '<div style="font-size:12px;font-weight:900;color:#fff;letter-spacing:2px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+storeName2+'</div>' : '')+
      '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:1px">'+
      '<span style="font-size:9px;font-weight:800;color:#00CFFF;letter-spacing:2px">FILO</span>'+
      '<span style="color:rgba(201,168,76,.7);font-size:7px">✦</span>'+
      '<span style="font-size:9px;font-weight:800;color:#00E890;letter-spacing:2px">DINE</span>'+
      '</div>'+
      '<div style="font-size:7px;color:rgba(255,255,255,.3);letter-spacing:1.5px">Scan to Order</div>';
    outer.appendChild(hdr);

    var sep = document.createElement('div');
    sep.style.cssText = 'margin:0 16px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.25),transparent)';
    outer.appendChild(sep);

    var qrWrap = document.createElement('div');
    qrWrap.style.cssText = 'padding:10px 0 6px;position:relative;z-index:1';
    var qrBox = document.createElement('div');
    qrBox.style.cssText = 'background:#fff;border-radius:10px;padding:7px;display:inline-block';
    var qrDiv = document.createElement('div');
    qrDiv.id = id;
    qrDiv.style.cssText = 'width:100px;height:100px';
    qrBox.appendChild(qrDiv);
    qrWrap.appendChild(qrBox);
    outer.appendChild(qrWrap);

    // 상품명 + 가격 배지
    var badge = document.createElement('div');
    badge.style.cssText = 'padding:4px 10px 8px;position:relative;z-index:1';
    var parts = badgeText.split('₩');
    var itemName = parts[0].trim();
    var itemPrice = parts[1] ? '₩'+parts[1].trim() : '';
    badge.innerHTML =
      '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:2px;line-height:1.3">'+itemName+'</div>'+
      (itemPrice ? '<div style="font-size:12px;font-weight:700;color:#C9A84C">'+itemPrice+'</div>' : '');
    outer.appendChild(badge);

    var ftr = document.createElement('div');
    ftr.style.cssText = 'font-size:7px;color:rgba(255,255,255,.2);letter-spacing:1px;padding-bottom:8px;position:relative;z-index:1';
    ftr.textContent = 'powered by FILO · dine.ne.kr';
    outer.appendChild(ftr);

    var botLine = document.createElement('div');
    botLine.style.cssText = 'height:3px;background:linear-gradient(90deg,transparent,#C9A84C,#F5D97E,#C9A84C,transparent)';
    outer.appendChild(botLine);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:4px;justify-content:center;padding:8px 8px 0';
    var dlBtn = document.createElement('button');
    dlBtn.textContent = '저장';
    dlBtn.style.cssText = 'padding:4px 8px;background:rgba(8,145,178,.15);border:1px solid rgba(8,145,178,.3);border-radius:6px;color:#38bdf8;font-size:10px;font-weight:700;cursor:pointer';
    dlBtn.onclick = function(){ _qrDownload(id, label); };
    var prBtn = document.createElement('button');
    prBtn.textContent = '인쇄';
    prBtn.style.cssText = 'padding:4px 8px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);border-radius:6px;color:#a78bfa;font-size:10px;font-weight:700;cursor:pointer';
    (function(divId,nm,qrUrl,bt){prBtn.onclick=function(){_qrPrintCard(divId,nm,qrUrl,bt);};})(id,label,url,badgeText);
    var pvBtn = document.createElement('button');
    pvBtn.textContent = '미리보기';
    pvBtn.style.cssText = 'padding:4px 8px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:6px;color:#22c55e;font-size:10px;font-weight:700;cursor:pointer';
    pvBtn.onclick = function(){ window.open(url,'_blank'); };
    btnRow.appendChild(dlBtn); btnRow.appendChild(prBtn); btnRow.appendChild(pvBtn);

    var wrap = document.createElement('div');
    wrap.appendChild(outer);
    wrap.appendChild(btnRow);

    ensureQR2(function(){
      try{ new QRCode(qrDiv,{text:url,width:100,height:100,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M}); }
      catch(e){ qrDiv.innerHTML='<div style="font-size:9px;color:red">QR 오류</div>'; }
    });

    return wrap;
  }

  el.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'max-width:640px;margin:0 auto';
  wrap.innerHTML =
    '<div style="font-size:17px;font-weight:900;margin-bottom:4px">빵·디저트 QR</div>'+
    '<div style="font-size:12px;color:var(--t3);margin-bottom:6px">진열대에 붙여주세요. 손님이 스캔하면 상품이 장바구니에 담겨요.</div>'+
    '<div style="font-size:11px;color:var(--t3);margin-bottom:20px;padding:8px 10px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:8px">'+
    '포장 → 스캔 후 결제 버튼 → 결제완료 시 직원에게 픽업 알림<br>테이블 → 스캔 후 테이블 QR 추가 스캔 → 자동으로 주문 전송</div>';

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px';
  grid.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:10px">메뉴 로딩 중...</div>';
  wrap.appendChild(grid);
  el.appendChild(wrap);

  var bakeryKw = ['빵','베이커리','디저트','케이크','쿠키','마카롱','타르트','스콘','머핀','도넛','크루아상','소금빵','파이','롤','번'];
  _db.collection('filo_menus').where('dealerId','==',did).get()
    .then(function(snap) {
      grid.innerHTML = '';
      var all = [];
      snap.forEach(function(d){ all.push(Object.assign({id:d.id}, d.data())); });

      var filtered = all.filter(function(m) {
        var cat = (m.category||'').toLowerCase();
        var nm = (m.name||'').toLowerCase();
        return bakeryKw.some(function(k){ return cat.includes(k)||nm.includes(k); }) || m.isBakery;
      });

      // 카테고리 매칭 없으면 전체 메뉴 표시 (매장이 베이커리 전체인 경우)
      var list = filtered.length ? filtered : all;

      if(!list.length) {
        grid.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:10px">등록된 메뉴가 없어요. 먼저 메뉴를 등록해주세요.</div>';
        return;
      }
      if(!filtered.length && all.length) {
        var notice = document.createElement('div');
        notice.style.cssText = 'font-size:11px;color:var(--t3);margin-bottom:12px;padding:8px;background:rgba(255,255,255,.04);border-radius:8px';
        notice.textContent = '빵/디저트 카테고리가 없어 전체 메뉴를 표시합니다. 카테고리를 "디저트"로 설정하면 해당 상품만 나타나요.';
        wrap.insertBefore(notice, grid);
      }
      list.forEach(function(m) {
        var url = base + '/add?d=' + did +
          '&n=' + encodeURIComponent(m.name||'') +
          '&p=' + (m.price||0) +
          '&e=' + encodeURIComponent(m.emoji||'🥐') +
          '&m=' + (m.id||'');
        var displayName = (m.emoji||'🥐')+' '+(m.name||'');
        var badgeText = (m.name||'')+(m.price?' ₩'+(m.price).toLocaleString():'');
        var card = makeItemCard('qrb-'+m.id, displayName, badgeText, url);
        grid.appendChild(card);
      });
    }).catch(function(e) {
      grid.innerHTML = '<div style="color:var(--red,red);font-size:12px">로딩 실패: '+e.message+'</div>';
    });
}

// QR 이미지 저장
function _qrDownload(divId, name) {
  var div = document.getElementById(divId);
  if(!div) return;
  var img = div.querySelector('img') || div.querySelector('canvas');
  if(!img) return;
  var a = document.createElement('a');
  if(img.tagName === 'CANVAS') {
    a.href = img.toDataURL('image/png');
  } else {
    a.href = img.src;
  }
  a.download = name + '_QR.png';
  a.click();
}
