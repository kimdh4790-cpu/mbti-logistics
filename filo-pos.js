// filo-pos.js - POS 결제, 영수증, 장바구니, 분할결제, 각자계산
// 의존성: filo-common.js
// 관련 컬렉션: filo_sales, filo_menus

function _filoReceiptSelected(input){
 var file=input.files&&input.files[0];
 if(!file)return;
 var label=document.getElementById('si-receipt-label');
 if(label)label.textContent='📎 '+file.name.slice(0,20)+(file.name.length>20?'...':'');
 var preview=document.getElementById('si-receipt-preview');
 var img=document.getElementById('si-receipt-img');
 if(file.type.startsWith('image/')&&preview&&img){
  var reader=new FileReader();
  reader.onload=function(e){img.src=e.target.result;preview.style.display='block';};
  reader.readAsDataURL(file);
 }
}

function _filoPageKiosk(el){
 var did=_CU.dealerId||_CU.uid;
 _cartItems=[];
 el.innerHTML='<div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
 '<button onclick="document.getElementById(\'menu-excel-input\').click()" class="btn" style="background:var(--b3);font-size:12px">📊 메뉴 엑셀 업로드</button>'+
 '<input id="menu-excel-input" type="file" accept=".xlsx,.xls" style="display:none" onchange="_filoImportMenuExcel(this)">'+
 '<div id="kiosk-table-bar" style="display:flex;gap:6px;flex-wrap:wrap"></div>'+
 '</div>'+
 '<div class="pos-wrap">'+
 '<div style="display:flex;flex-direction:column">'+
 '<div style="padding:10px 12px;border-bottom:1px solid var(--bd);display:flex;gap:6px;flex-wrap:wrap" id="kiosk-cats"></div>'+
 '<div class="menu-grid" id="kiosk-menu">'+
 '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--t3)">⏳ 메뉴 로딩 중...</div>'+
 '</div></div>'+
 '<div class="cart-panel">'+
 '<div style="padding:14px 16px;border-bottom:1px solid var(--bd);font-size:14px;font-weight:900">🛒 주문 내역</div>'+
 '<div id="cart-list" style="flex:1;overflow-y:auto"></div>'+
 '<div style="padding:14px 16px;border-top:1px solid var(--bd)">'+
 '<div style="display:flex;justify-content:space-between;margin-bottom:10px">'+
 '<span style="font-size:13px;font-weight:700">합계</span>'+
 '<span id="cart-total" style="font-size:18px;font-weight:900;color:#22c55e">₩0</span></div>'+
 '<button class="pay-btn" onclick="_filoPay()">💳 결제하기</button>'+
 '<button onclick="_cartClear()" class="btn" style="width:100%;margin-top:6px;background:var(--b3);font-size:12px">🗑 초기화</button>'+
 '</div></div></div>';

 // 테이블 현황 바 실시간 로드 (5개씩)
 var _kioskTableUnsub=null;
 function _loadKioskTableBar(){
  var bar=document.getElementById('kiosk-table-bar');
  if(!bar)return;
  var today=new Date().toISOString().slice(0,10);
  // 주문 맵 로드
  _db.collection('filo_orders').where('dealerId','==',did).where('type','==','table')
   .onSnapshot(function(oSnap){
    var oMap={};
    oSnap.forEach(function(doc){
     var d=doc.data();
     if(d.createdAt&&d.createdAt.slice(0,10)===today&&d.status!=='cleared'){
      var k=String(d.tableNum||'');
      var k2=d.tableName||'';
      if(!k&&k2)k=k2.replace(/[^0-9]/g,'')||k2;
      var isPd=(d.status==='paid'||d.payType==='prepay');
      if(k){
       if(!oMap[k])oMap[k]={total:0,paidTotal:0,pendingTotal:0,paid:false,hasPending:false,orders:[]};
       oMap[k].total+=(d.total||0);
       oMap[k].orders.push(Object.assign({_id:doc.id},d));
       if(isPd){oMap[k].paidTotal+=(d.total||0);}else{oMap[k].pendingTotal+=(d.total||0);oMap[k].hasPending=true;}
       if(isPd&&!oMap[k].hasPending)oMap[k].paid=true;
      }
      if(k2&&k2!==k){
       if(!oMap[k2])oMap[k2]={total:0,paidTotal:0,pendingTotal:0,paid:false,hasPending:false,orders:[]};
       oMap[k2].total+=(d.total||0);
       oMap[k2].orders.push(Object.assign({_id:doc.id},d));
       if(isPd){oMap[k2].paidTotal+=(d.total||0);}else{oMap[k2].pendingTotal+=(d.total||0);oMap[k2].hasPending=true;}
       if(isPd&&!oMap[k2].hasPending)oMap[k2].paid=true;
      }
     }
    });
    // 테이블 목록 로드
    _db.collection('filo_tables').where('dealerId','==',did).get().then(function(tSnap){
     var tables=tSnap.empty?
      Array.from({length:10},function(_,i){return {num:i+1,name:'테이블 '+(i+1),status:'empty'};})
      :tSnap.docs.map(function(d){var f=d.data();return {num:f.tableNum||1,name:f.tableName||'테이블',status:f.status||'empty'};})
       .sort(function(a,b){return a.num-b.num;})
       .filter(function(t,i,arr){return arr.findIndex(function(x){return x.num===t.num;})=== i;});

     // 5개씩 페이지
     if(!window._kioskTablePage)window._kioskTablePage=0;
     var page=window._kioskTablePage;
     var chunk=tables.slice(page*5,(page+1)*5);
     bar.innerHTML='';

     // 이전/다음 버튼
     if(tables.length>5){
      var prevBtn=document.createElement('button');
      prevBtn.textContent='◀';
      prevBtn.style.cssText='padding:4px 8px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer';
      prevBtn.onclick=function(){window._kioskTablePage=Math.max(0,page-1);_loadKioskTableBar();};
      bar.appendChild(prevBtn);
     }

     chunk.forEach(function(t){
      var ord=oMap[String(t.num)]||oMap[t.name]||oMap[String(t.num).replace(/[^0-9]/g,'')];
      var hasOrder=ord&&ord.total>0;
      var isPaid=ord&&ord.paid;
      var color=t.status==='empty'?'#94a3b8':isPaid?'#818cf8':hasOrder?'#fbbf24':'#4ade80';
      var bg=t.status==='empty'?'rgba(148,163,184,.12)':isPaid?'rgba(99,102,241,.25)':hasOrder?'rgba(251,191,36,.2)':'rgba(74,222,128,.15)';
      var borderC=t.status==='empty'?'rgba(148,163,184,.3)':isPaid?'#6366f1':hasOrder?'#f59e0b':'#22c55e';
      var btn=document.createElement('button');
      btn.style.cssText='padding:6px 12px;background:'+bg+';border:1.5px solid '+borderC+';border-radius:10px;color:'+color+';font-size:11px;font-weight:800;cursor:pointer;line-height:1.5;text-align:center;min-width:72px';
      var dispHtml='<div style="color:var(--tx)">'+t.name+'</div>';
      if(hasOrder){
       if(ord.paidTotal>0)dispHtml+='<div style="font-size:10px;color:#818cf8">✅₩'+ord.paidTotal.toLocaleString()+'</div>';
       if(ord.pendingTotal>0)dispHtml+='<div style="font-size:10px;color:#fbbf24">⏳₩'+ord.pendingTotal.toLocaleString()+'</div>';
      } else {
       dispHtml+='<div style="font-size:10px;color:var(--t3)">비어있음</div>';
      }
      btn.innerHTML=dispHtml;
      (function(table,order){btn.onclick=function(){
       // POS 테이블 선택
       window._selectedTableId=table.num;
       window._selectedTableName=table.name;
       // 기존 선택 표시 초기화
       document.querySelectorAll('#kiosk-table-bar button[data-selected]').forEach(function(b){
        b.removeAttribute('data-selected');
        b.style.outline='';
       });
       btn.setAttribute('data-selected','1');
       btn.style.outline='2px solid #0891b2';
       // 주문 내역 헤더 업데이트
       var cartTitle=document.querySelector('.cart-panel div:first-child');
       if(cartTitle)cartTitle.textContent='🛒 '+table.name+' 주문';
       _filoToast('🪑 '+table.name+' 선택됨');
       // 주문 있으면 주문 내역 모달 표시
       if(order&&order.orders&&order.orders.length){
        _filoTableOrderModal(did,table,order);
       }
      };})(t,ord||null);
      bar.appendChild(btn);
     });

     if(tables.length>5){
      var nextBtn=document.createElement('button');
      nextBtn.textContent='▶';
      nextBtn.style.cssText='padding:4px 8px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer';
      nextBtn.onclick=function(){window._kioskTablePage=Math.min(Math.ceil(tables.length/5)-1,page+1);_loadKioskTableBar();};
      bar.appendChild(nextBtn);
     }
    });
   });
 }
 _loadKioskTableBar();

 // filo_menus 컬렉션에서 로드
 _db.collection('filo_menus').where('dealerId','==',did).get()
 .then(function(snap){
  if(snap.empty){
   // 메뉴 없으면 안내
   var menuEl=document.getElementById('kiosk-menu');
   if(menuEl) menuEl.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--t3)">'+
    '<div style="font-size:40px;margin-bottom:12px">🍽</div>'+
    '<div style="font-size:14px;font-weight:700;margin-bottom:8px">등록된 메뉴가 없습니다</div>'+
    '<div style="font-size:12px">메뉴 관리에서 메뉴를 추가하거나<br>엑셀 업로드로 일괄 등록하세요</div></div>';
   var catEl=document.getElementById('kiosk-cats');
   if(catEl) catEl.innerHTML='<button class="btn btn-brand btn-sm" style="border-radius:100px">전체</button>';
   return;
  }
  var menus=[];
  snap.forEach(function(doc){
   menus.push(Object.assign({_id:doc.id},doc.data()));
  });
  menus.sort(function(a,b){return (a.category||'').localeCompare(b.category||'');});
  _filoRenderKiosk(menus);
 }).catch(function(e){
  var menuEl=document.getElementById('kiosk-menu');
  if(menuEl) menuEl.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--t3)">⚠️ 메뉴 로드 실패: '+e.message+'</div>';
 });
}

function _filoRenderKiosk(menus){
 var cats=[...new Set(menus.map(function(m){return m.category||'기타';}))];
 var catEl=document.getElementById('kiosk-cats');
 if(catEl){
 catEl.innerHTML='<button onclick="_filoFilterKiosk(&quot;전체&quot;,this)" class="btn btn-brand btn-sm" style="border-radius:100px">전체</button>'+
 cats.map(function(c){return '<button onclick="_filoFilterKiosk(this.dataset.cat,this)" data-cat="'+c+'" class="btn btn-sm" style="border-radius:100px;background:var(--b3)">'+c+'</button>';}).join('');
 }
 var menuEl=document.getElementById('kiosk-menu');
 if(menuEl){
 menuEl.innerHTML=menus.map(function(m,i){
 return '<div class="menu-item pop-in stagger-'+Math.min(i+1,4)+'" data-cat="'+(m.category||'기타')+'" data-id="'+m._id+'" data-name="'+esc(m.name)+'" data-price="'+m.price+'" onclick="_cartAddFromEl(this)">'+
 '<div style="font-size:28px;margin-bottom:8px">'+(m.emoji||'🍽')+'</div>'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:4px">'+esc(m.name)+'</div>'+
 '<div style="font-size:14px;font-weight:900;color:#22c55e">₩'+m.price.toLocaleString()+'</div>'+
 (m.stock!=null?'<div style="font-size:10px;color:var(--t3);margin-top:3px">재고 '+m.stock+'개</div>':'')+'</div>';
 }).join('');
 }
 window._kioskMenus=menus;
}

function _filoFilterKiosk(cat,btn){
 document.querySelectorAll('#kiosk-cats .btn').forEach(function(b){
 b.style.background=b===btn?'var(--br)':'var(--bg3)';
 b.style.color=b===btn?'#fff':'var(--text)';
 });
 document.querySelectorAll('#kiosk-menu .menu-item').forEach(function(el){
 el.style.display=(cat==='전체'||el.dataset.cat===cat)?'':'none';
 });
}

function _cartAdd(id,name,price){
 var existing=_cartItems.find(function(c){return c.id===id;});
 if(existing){existing.qty++;}
 else{_cartItems.push({id:id,name:name,price:price,qty:1});}
 _cartRender();
 /* Ripple + 바운스 효과 */
 var btn=event&&event.target?event.target.closest('.menu-item'):null;
 if(btn){
  btn.style.transform='scale(.94)';
  btn.style.borderColor='rgba(124,58,237,.6)';
  /* Ripple */
  var ripple=document.createElement('div');
  ripple.style.cssText='position:absolute;border-radius:50%;background:rgba(124,58,237,.3);width:10px;height:10px;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);animation:ripple .5s ease both;pointer-events:none;z-index:10';
  btn.appendChild(ripple);
  setTimeout(function(){
   btn.style.transform='';
   btn.style.borderColor='';
   if(ripple.parentNode)ripple.parentNode.removeChild(ripple);
  },500);
  /* 카트 총액 바운스 */
  var tot=document.getElementById('cart-total');
  if(tot){tot.style.animation='none';tot.offsetHeight;tot.style.animation='successPop .3s cubic-bezier(.34,1.56,.64,1)';}
 }
}

function _cartRender(){
 var list=document.getElementById('cart-list');
 var totalEl=document.getElementById('cart-total');
 if(!list)return;
 if(!_cartItems.length){
 list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3);font-size:12px">메뉴를 선택하세요</div>';
 if(totalEl)totalEl.textContent='₩0';
 return;
 }
 var rawTotal=_cartItems.reduce(function(s,c){return s+c.price*c.qty;},0);
 var discount=window._posDiscount||0;
 var total=Math.max(0,rawTotal-discount);
 window._posDiscount=0; /* 결제 후 초기화 */
 list.innerHTML=_cartItems.map(function(c,i){
 return '<div class="cart-item">'+
 '<div style="flex:1">'+
 '<div style="font-size:13px;font-weight:700">'+esc(c.name)+'</div>'+
 '<div style="font-size:12px;color:var(--t3)">₩'+c.price.toLocaleString()+'</div></div>'+
 '<div style="display:flex;align-items:center;gap:6px">'+
 '<button class="qty-btn" onclick="_cartQty('+i+',-1)">−</button>'+
 '<span style="font-size:14px;font-weight:900;min-width:20px;text-align:center">'+c.qty+'</span>'+
 '<button class="qty-btn" onclick="_cartQty('+i+',1)">+</button></div></div>';
 }).join('');
 if(totalEl){
 totalEl.textContent='₩'+total.toLocaleString();
 totalEl.style.transform='scale(1.1)';
 setTimeout(function(){totalEl.style.transform='';},200);
 }
}

function _cartQty(idx,delta){
 _cartItems[idx].qty+=delta;
 if(_cartItems[idx].qty<=0)_cartItems.splice(idx,1);
 _cartRender();
}

function _cartClear(){_cartItems=[];_cartRender();}

function _filoSplitPay(total){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:440px';

 var cashInp=document.createElement('input');
 cashInp.type='number';cashInp.placeholder='현금 금액 입력';
 cashInp.style.cssText='width:100%;padding:11px 12px;background:var(--b3);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);font-size:14px;outline:none;margin-bottom:8px;box-sizing:border-box';

 var resultDiv=document.createElement('div');
 resultDiv.style.cssText='background:var(--surface2);border-radius:var(--r);padding:12px 14px;margin-bottom:14px;font-size:12px;color:var(--t3)';
 resultDiv.textContent='현금 금액을 입력하세요';

 function calcSplit(){
  var cash=parseInt(cashInp.value)||0;
  var card=Math.max(0,total-cash);
  if(cash<=0){resultDiv.innerHTML='<span style="color:var(--t3)">현금 금액을 입력하세요</span>';return;}
  if(cash>=total){resultDiv.innerHTML='<span style="color:#ef4444">현금 금액이 총액보다 큽니다</span>';return;}
  resultDiv.innerHTML=
   '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>💵 현금</span><span style="font-weight:700;color:#22c55e">₩'+cash.toLocaleString()+'</span></div>'+
   '<div style="display:flex;justify-content:space-between"><span>💳 카드</span><span style="font-weight:700;color:#0891b2">₩'+card.toLocaleString()+'</span></div>';
 }
 cashInp.oninput=calcSplit;

 var btnRow=document.createElement('div');
 btnRow.style.cssText='display:flex;gap:6px;margin-bottom:12px';
 [10000,20000,30000,50000].forEach(function(v){
  var b=document.createElement('button');
  b.textContent=(v/10000)+'만';
  b.style.cssText='flex:1;padding:8px;background:var(--surface3);border:1px solid var(--bd2);border-radius:8px;color:var(--t2);font-size:11px;cursor:pointer';
  b.onclick=function(){cashInp.value=v;calcSplit();};
  btnRow.appendChild(b);
 });

 var confirmBtn=document.createElement('button');
 confirmBtn.style.cssText='flex:2;padding:12px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-size:14px;font-weight:700;cursor:pointer';
 confirmBtn.textContent='✅ 결제 완료';
 confirmBtn.onclick=function(){
  var cash=parseInt(cashInp.value)||0;
  var card=Math.max(0,total-cash);
  if(cash<=0||cash>=total){_filoToast('금액을 확인해주세요');return;}
  mo.remove();
  _filoConfirmPay('split','💵현금₩'+cash.toLocaleString()+'+💳카드₩'+card.toLocaleString());
 };

 var cancelBtn=document.createElement('button');
 cancelBtn.style.cssText='flex:1;padding:12px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);font-size:13px;cursor:pointer';
 cancelBtn.textContent='취소';
 cancelBtn.onclick=function(){mo.remove();_filoPay();};

 var actRow=document.createElement('div');
 actRow.style.cssText='display:flex;gap:8px';
 actRow.appendChild(confirmBtn);actRow.appendChild(cancelBtn);

 var hdr=document.createElement('div');
 hdr.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:14px">✂️ 분할 결제</div>'+
  '<div style="background:var(--surface2);border-radius:var(--r);padding:12px 14px;margin-bottom:14px">'+
  '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700"><span>총액</span><span style="color:#22c55e">₩'+total.toLocaleString()+'</span></div></div>'+
  '<div style="margin-bottom:8px;font-size:12px;color:var(--t2)">현금 금액 입력</div>';

 box.appendChild(hdr);box.appendChild(cashInp);box.appendChild(btnRow);
 box.appendChild(resultDiv);box.appendChild(actRow);
 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
 setTimeout(function(){cashInp.focus();},100);
}

function _splitCalc(total){
 var cash=parseInt(document.getElementById('split-cash-inp').value)||0;
 var card=Math.max(0,total-cash);
 var res=document.getElementById('split-result');
 if(!res)return;
 if(cash<=0){res.innerHTML='<div style="font-size:12px;color:var(--t3)">현금 금액을 입력하세요</div>';return;}
 if(cash>=total){res.innerHTML='<div style="font-size:12px;color:#ef4444">현금 금액이 총액보다 큽니다</div>';return;}
 res.innerHTML=
  '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">'+
  '<span>💵 현금</span><span style="font-weight:700;color:#22c55e">₩'+cash.toLocaleString()+'</span></div>'+
  '<div style="display:flex;justify-content:space-between;font-size:13px">'+
  '<span>💳 카드</span><span style="font-weight:700;color:#0891b2">₩'+card.toLocaleString()+'</span></div>';
}

function _splitConfirm(total){
 var cash=parseInt(document.getElementById('split-cash-inp').value)||0;
 var card=Math.max(0,total-cash);
 if(cash<=0||cash>=total){_filoToast('금액을 확인해주세요');return;}
 document.querySelectorAll('.mo').forEach(function(e){e.remove();});
 _filoConfirmPay('split','💵현금₩'+cash.toLocaleString()+'+💳카드₩'+card.toLocaleString());
}

// ── 각자 계산 ──
function _filoSelfPay(){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:22px;width:100%;max-width:440px;max-height:80vh;overflow-y:auto';
 var items=_cartItems.map(function(c){return {id:c.id,name:c.name,price:c.price,qty:c.qty,emoji:c.emoji||'🍽'};});
 var checks=items.map(function(){return false;});

 function render(){
  var selected=items.filter(function(_,i){return checks[i];});
  var selTotal=selected.reduce(function(s,c){return s+c.price*c.qty;},0);
  box.innerHTML=
   '<div style="font-size:15px;font-weight:900;margin-bottom:14px">👥 각자 계산</div>'+
   '<div style="font-size:11px;color:var(--t2);margin-bottom:10px">계산할 메뉴 선택</div>'+
   items.map(function(it,i){
    return '<div onclick="_selfToggle('+i+')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:'+(checks[i]?'rgba(8,145,178,.15)':'var(--surface2)')+';border:1.5px solid '+(checks[i]?'#0891b2':'var(--bd2)')+'">'+
     '<div style="width:20px;height:20px;border-radius:50%;border:2px solid '+(checks[i]?'#0891b2':'var(--bd2)')+';background:'+(checks[i]?'#0891b2':'transparent')+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px">'+(checks[i]?'✓':'')+'</div>'+
     '<span style="flex:1;font-size:13px">'+(it.emoji||'🍽')+' '+it.name+' ×'+it.qty+'</span>'+
     '<span style="font-size:13px;font-weight:700">₩'+(it.price*it.qty).toLocaleString()+'</span></div>';
   }).join('')+
   '<div style="background:var(--surface2);border-radius:var(--r);padding:12px;margin:10px 0">'+
   '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700">'+
   '<span>선택 합계</span><span style="color:#0891b2">₩'+selTotal.toLocaleString()+'</span></div></div>'+
   '<div style="display:flex;gap:8px">'+
   '<button onclick="_selfConfirm()" style="flex:2;padding:12px;background:'+(selTotal>0?'var(--br)':'var(--bd2)')+';border:none;border-radius:var(--r);color:#fff;font-size:14px;font-weight:700;cursor:pointer">💳 선택 결제</button>'+
   '<button onclick="document.querySelectorAll(\'.mo\').forEach(function(e){e.remove();});_filoPay()" style="flex:1;padding:12px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);font-size:13px;cursor:pointer">취소</button>'+
   '</div>';
 }
 window._selfToggle=function(i){checks[i]=!checks[i];render();};
 window._selfConfirm=function(){
  var selected=items.filter(function(_,i){return checks[i];});
  if(!selected.length){_filoToast('메뉴를 선택해주세요');return;}
  var selTotal=selected.reduce(function(s,c){return s+c.price*c.qty;},0);
  var origItems=_cartItems;
  _cartItems=selected;
  document.querySelectorAll('.mo').forEach(function(e){e.remove();});
  // 결제수단 선택 모달
  var pm=document.createElement('div');pm.className='mo';
  var pb=document.createElement('div');pb.style.cssText='padding:20px;width:100%;max-width:440px';
  pb.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:6px">👥 각자 계산</div>'+
   '<div style="font-size:13px;color:var(--t2);margin-bottom:14px">결제금액: <strong style="color:#0891b2">₩'+selTotal.toLocaleString()+'</strong></div>'+
   '<div style="display:flex;gap:8px;margin-bottom:10px">'+
   '<button id="self-card-btn" style="flex:1;padding:14px;background:rgba(8,145,178,.15);border:1.5px solid #0891b2;border-radius:12px;color:#0891b2;font-size:14px;font-weight:700;cursor:pointer">💳 카드</button>'+
   '<button id="self-cash-btn" style="flex:1;padding:14px;background:rgba(34,197,94,.15);border:1.5px solid #22c55e;border-radius:12px;color:#22c55e;font-size:14px;font-weight:700;cursor:pointer">💵 현금</button>'+
   '</div>'+
   '<button id="self-cancel-btn" style="width:100%;padding:11px;background:var(--surface2);border:none;border-radius:var(--r);color:var(--t2);font-size:13px;cursor:pointer">취소</button>';
  pm.appendChild(pb);
  document.body.appendChild(pm);
  var remaining=origItems.filter(function(_,i){return !checks[i];});
  document.getElementById('self-card-btn').onclick=function(){
   pm.remove();_filoConfirmPay('card','💳 카드');
   setTimeout(function(){_cartItems=remaining;_cartRender();},500);
  };
  document.getElementById('self-cash-btn').onclick=function(){
   pm.remove();_filoConfirmPay('cash','💵 현금');
   setTimeout(function(){_cartItems=remaining;_cartRender();},500);
  };
  document.getElementById('self-cancel-btn').onclick=function(){
   pm.remove();_cartItems=origItems;_cartRender();
  };
 };
 render();
 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

function _filoShowReceipt(orderId, items, total, method, methodLabel, now){
 _lastReceiptData={orderId:orderId,items:items,total:total,method:method,methodLabel:methodLabel,now:now};
 var companyName=(_cachedCompanyDoc&&(_cachedCompanyDoc.companyName||_cachedCompanyDoc.name))||'';
 /* KST 시간 */
 var kst=new Date(now.getTime()+9*3600000);
 var timeStr=kst.getUTCFullYear()+'.'
  +(kst.getUTCMonth()+1).toString().padStart(2,'0')+'.'
  +kst.getUTCDate().toString().padStart(2,'0')+' '
  +kst.getUTCHours().toString().padStart(2,'0')+':'
  +kst.getUTCMinutes().toString().padStart(2,'0');

 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:0;width:100%;max-width:380px;overflow:hidden';

 /* 영수증 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='background:linear-gradient(135deg,#1a0e3a,#0a1628);padding:20px 24px 16px;text-align:center;position:relative';
 hdr.innerHTML='<div style="font-size:11px;color:rgba(167,139,250,.7);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">RECEIPT</div>'+
  '<div style="font-size:20px;font-weight:900;color:#fff">🧾 영수증</div>'+
  '<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px">'+companyName+'</div>'+
  '<div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px">'+timeStr+'</div>';
 box.appendChild(hdr);

 /* 바디 */
 var body=document.createElement('div');
 body.style.cssText='padding:16px 24px;background:var(--surface)';

 /* 테이블 번호 */
 var tName=window._selectedTableId?'테이블 '+window._selectedTableId:'카운터';
 var tRow=document.createElement('div');
 tRow.style.cssText='display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--bd);margin-bottom:8px';
 tRow.innerHTML='<span style="font-size:11px;color:var(--t3)">주문 위치</span><span style="font-size:12px;font-weight:700;color:#f59e0b">'+tName+'</span>';
 body.appendChild(tRow);

 /* 메뉴 목록 */
 items.forEach(function(it){
  var row=document.createElement('div');
  row.style.cssText='display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;align-items:center';
  row.innerHTML='<span style="color:var(--t2)">'+it.name+' <span style="color:var(--t3)">x'+it.qty+'</span></span>'+
   '<span style="font-weight:700">₩'+(it.price*it.qty).toLocaleString()+'</span>';
  body.appendChild(row);
 });

 /* 구분선 */
 var div=document.createElement('div');
 div.style.cssText='border-top:1px dashed var(--bd);margin:10px 0 12px';
 body.appendChild(div);

 /* 합계 */
 var total_row=document.createElement('div');
 total_row.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px';
 total_row.innerHTML='<span style="font-size:13px;font-weight:700">합계</span>'+
  '<span style="font-size:22px;font-weight:900;color:#22c55e;letter-spacing:-.5px">₩'+total.toLocaleString()+'</span>';
 body.appendChild(total_row);

 var method_row=document.createElement('div');
 method_row.style.cssText='font-size:11px;color:var(--t3);margin-bottom:16px';
 method_row.textContent='결제 수단: '+methodLabel;
 body.appendChild(method_row);

 /* 버튼 3개 */
 /* 카카오 알림톡 */
 var talkBtn=document.createElement('button');
 talkBtn.style.cssText='width:100%;padding:12px;background:linear-gradient(135deg,#ffe812,#f9d900);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;margin-bottom:8px';
 talkBtn.textContent='📱 카카오로 영수증 받기';
 talkBtn.onclick=function(){mo.remove();_filoReceiptTalk();};
 body.appendChild(talkBtn);

 /* 인쇄 + 닫기 */
 var btnRow=document.createElement('div');
 btnRow.style.cssText='display:flex;gap:8px';
 var printBtn=document.createElement('button');
 printBtn.style.cssText='flex:1;padding:11px;background:var(--br);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer';
 printBtn.textContent='🖨 인쇄';
 printBtn.onclick=function(){window.print();};
 var closeBtn=document.createElement('button');
 closeBtn.style.cssText='flex:1;padding:11px;background:var(--surface2);border:none;border-radius:10px;color:var(--t2);font-size:13px;cursor:pointer';
 closeBtn.textContent='닫기';
 closeBtn.onclick=function(){mo.remove();};
 btnRow.appendChild(printBtn);btnRow.appendChild(closeBtn);
 body.appendChild(btnRow);

 box.appendChild(body);
 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}



// ── 주문 대기 페이지 (실시간) ──
var _ordersUnsub = null;
function _filoTableSelfPay(did,order,tableNum,tableName){
 // orders 배열에서 items 펼치기
 var flatItems=[];
 if(order.orders&&order.orders.length){
  order.orders.forEach(function(ord){
   (ord.items||[]).forEach(function(it){
    flatItems.push(Object.assign({},it,{_ordId:ord.id||ord._id,qty:it.qty||1}));
   });
  });
 } else {
  flatItems=(order.items||[]).map(function(it){return Object.assign({},it,{qty:it.qty||1});});
 }
 var allItems=flatItems.map(function(it,i){return Object.assign({},it,{_idx:i});});
 var checks=allItems.map(function(){return false;});
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');
 box.style.cssText='padding:20px;width:100%;max-width:440px;max-height:80vh;overflow-y:auto';

 function render(){
  var selected=allItems.filter(function(_,i){return checks[i];});
  var selTotal=selected.reduce(function(s,c){return s+(c.price||0)*(c.qty||1);},0);
  box.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:6px">👥 각자 계산 - '+tableName+'</div>'+
   '<div style="font-size:11px;color:var(--t2);margin-bottom:10px">계산할 메뉴 선택</div>'+
   allItems.map(function(it,i){
    return '<div data-idx="'+i+'" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:'+(checks[i]?'rgba(8,145,178,.15)':'var(--surface2)')+';border:1.5px solid '+(checks[i]?'#0891b2':'var(--bd2)')+'">'+
     '<div style="width:20px;height:20px;border-radius:50%;border:2px solid '+(checks[i]?'#0891b2':'var(--bd2)')+';background:'+(checks[i]?'#0891b2':'transparent')+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;flex-shrink:0">'+(checks[i]?'✓':'')+'</div>'+
     '<span style="flex:1;font-size:13px">'+(it.emoji||'🍽')+' '+(it.name||'')+' ×'+(it.qty||1)+'</span>'+
     '<span style="font-size:13px;font-weight:700">₩'+((it.price||0)*(it.qty||1)).toLocaleString()+'</span></div>';
   }).join('')+
   '<div style="background:var(--surface2);border-radius:var(--r);padding:10px 12px;margin:10px 0;display:flex;justify-content:space-between">'+
   '<span style="font-size:13px;font-weight:700">선택 합계</span>'+
   '<span style="font-size:14px;font-weight:900;color:#0891b2">₩'+selTotal.toLocaleString()+'</span></div>'+
   '<div style="display:flex;gap:8px">'+
   '<button id="tself-card" style="flex:1;padding:12px;background:rgba(8,145,178,.15);border:1.5px solid #0891b2;border-radius:12px;color:#0891b2;font-size:13px;font-weight:700;cursor:pointer'+(selTotal<=0?';opacity:.4;pointer-events:none':'')+'">💳 카드</button>'+
   '<button id="tself-cash" style="flex:1;padding:12px;background:rgba(34,197,94,.15);border:1.5px solid #22c55e;border-radius:12px;color:#22c55e;font-size:13px;font-weight:700;cursor:pointer'+(selTotal<=0?';opacity:.4;pointer-events:none':'')+'">💵 현금</button>'+
   '<button id="tself-cancel" style="padding:12px 14px;background:var(--surface2);border:none;border-radius:12px;color:var(--t2);font-size:13px;cursor:pointer">취소</button>'+
   '</div>';

  // 클릭 이벤트
  box.querySelectorAll('[data-idx]').forEach(function(el){
   el.onclick=function(){
    var idx=parseInt(el.dataset.idx);
    checks[idx]=!checks[idx];
    render();
   };
  });
  var cardBtn=box.querySelector('#tself-card');
  var cashBtn=box.querySelector('#tself-cash');
  var cancelBtn=box.querySelector('#tself-cancel');
  function doSelfPay(method,label){
   if(selTotal<=0){_filoToast('메뉴를 선택하세요');return;}
   mo.remove();
   var now=new Date();
   var selectedItems=allItems.filter(function(_,i){return checks[i];});
   var selectedNames=selectedItems.map(function(it){return it.name;});

   // filo_sales에 선택된 항목만 저장 (DINE 연동)
   _db.collection('filo_sales').add({
    dealerId:did, type:'table', source:'qr',
    items:selectedItems.map(function(it){return {id:it.id||'',name:it.name||'',price:it.price||0,qty:it.qty||1};}),
    total:selTotal, tableNum:tableNum, tableName:tableName,
    payMethod:method, payType:'prepay', status:'done',
    date:now.toISOString().slice(0,10), createdAt:now.toISOString(), paidAt:now.toISOString()
   }).catch(function(e){console.warn('[filo_sales]',e.message);});

   // filo_orders에 paidItems 추가 방식
   if(order.orders&&order.orders.length){
    var batch=_db.batch();
    var hasBatch=false;

    // 선택된 아이템을 _ordId 기준으로 그룹핑
    var ordMap={};
    selectedItems.forEach(function(it){
     var oid=it._ordId;
     if(!oid)return;
     if(!ordMap[oid])ordMap[oid]=[];
     ordMap[oid].push(it);
    });

    order.orders.forEach(function(ord){
     var ordId=ord.id||ord._id;
     if(!ordId)return;
     var paidForThisOrd=ordMap[ordId]||[];
     if(paidForThisOrd.length===0)return; // 이 주문엔 선택된 아이템 없음

     var paidNames=paidForThisOrd.map(function(it){return it.name;});
     var unpaidItems=(ord.items||[]).filter(function(it){
      var idx=paidNames.indexOf(it.name);
      if(idx>=0){paidNames.splice(idx,1);return false;}
      return true;
     });
     var newPaidItems=paidForThisOrd.map(function(it){
      return Object.assign({},it,{payMethod:method,paidAt:now.toISOString()});
     });
     var existingPaid=ord.paidItems||[];
     var allPaidItems=existingPaid.concat(newPaidItems);

     if(unpaidItems.length===0){
      batch.update(_db.collection('filo_orders').doc(ordId),{
       status:'cleared', payMethod:method, paidAt:now.toISOString(),
       paidItems:allPaidItems, items:[]
      });
     } else {
      var unpaidTotal=unpaidItems.reduce(function(s,it){return s+(it.price||0)*(it.qty||1);},0);
      batch.update(_db.collection('filo_orders').doc(ordId),{
       paidItems:allPaidItems, items:unpaidItems, total:unpaidTotal
      });
     }
     hasBatch=true;
    });

    if(hasBatch){
     batch.commit().then(function(){
      _filoToast(label+' ₩'+selTotal.toLocaleString()+' 결제 완료! ✅');
     }).catch(function(e){_filoToast('❌ '+e.message);});
    } else {
     _filoToast(label+' ₩'+selTotal.toLocaleString()+' 결제 완료! ✅');
    }
   } else {
    _filoToast(label+' ₩'+selTotal.toLocaleString()+' 결제 완료! ✅');
   }
  }
  if(cardBtn)cardBtn.onclick=function(){doSelfPay('card','💳 카드');};
  if(cashBtn)cashBtn.onclick=function(){doSelfPay('cash','💵 현금');};
  if(cancelBtn)cancelBtn.onclick=function(){mo.remove();};
 }
 mo.appendChild(box);
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
 render();
}

// 결제 완료 처리
function _cartAddFromEl(el){
 var id=el.dataset.id||'';
 var name=el.dataset.name||'';
 var price=parseInt(el.dataset.price)||0;
 if(!id||!price)return;
 var existing=_cartItems.find(function(c){return c.id===id;});
 if(existing){existing.qty++;}
 else{_cartItems.push({id:id,name:name,price:price,qty:1});}
 _cartRender();
 el.style.transform='scale(.92)';
 setTimeout(function(){el.style.transform='';},150);
}

var _origFilterKiosk = _filoFilterKiosk;

document.addEventListener('click',function(e){
 var mc=e.target.closest('.member-card[data-id]');
 if(mc)_filoShowMemberDetail(mc.dataset.id);
 var db=e.target.closest('.del-btn[data-id]');
 if(db)_filoDeleteMember(db.dataset.id, db.dataset.name||'');
});


/* ══════════════════════════════════
   🪑 테이블 관리 페이지
   테이블 수 설정, 상태 관리, 실시간
   ══════════════════════════════════ */
function _toUpdateCart(){
 var items=Object.values(_toCart).filter(function(it){return it.qty>0;});
 var total=items.reduce(function(s,it){return s+it.price*it.qty;},0);
 var listEl=document.getElementById('to-cart-list');
 var tw=document.getElementById('to-total-wrap');
 var te=document.getElementById('to-total');
 if(listEl){
  listEl.innerHTML=!items.length?'<div style="text-align:center;padding:16px;color:var(--t3);font-size:12px">메뉴를 선택하세요</div>':
   items.map(function(it){return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd)">'+
    '<span style="font-size:13px">'+it.name+' <span style="color:var(--br)">x'+it.qty+'</span></span>'+
    '<span style="font-size:13px;font-weight:800">₩'+(it.price*it.qty).toLocaleString()+'</span></div>';}).join('');
 }
 if(tw)tw.style.display=items.length?'block':'none';
 if(te)te.textContent='₩'+total.toLocaleString();
}
