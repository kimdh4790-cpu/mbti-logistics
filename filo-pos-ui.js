/*
 * filo-pos-ui.js — FILO POS 화면 렌더링 + 심플/프로 모드
 * Copyright (c) 2024-2026 유한회사 엠비티아이
 *
 * 역할: POS 페이지 UI 렌더링, 테이블 결제, 영수증
 * 의존: filo-pos-core.js, filo-order-common.js
 *
 * POS UI 모드:
 *   심플 모드 — 카드형 UI (토스/페이히어 스타일, 초보 사장님)
 *   프로 모드  — 격자형 UI (기존 POS 스타일, 숙련 사장님)
 *   설정: companies/{dealerId}.posMode = 'simple' | 'pro'
 *         filo-settings → POS 화면 스타일에서 변경 가능
 *
 * 주요 함수:
 *   _filoPageKiosk(el)         — POS 메인 페이지 (모드 분기)
 *   _loadKioskTableBar(el,did) — 테이블바 + 메뉴 로딩
 *   _filoRenderKiosk(menus)    — 메뉴 격자 렌더 (프로)
 *   _filoRenderKioskSimple(ms) — 메뉴 카드 렌더 (심플) ★NEW
 *   _filoFilterKiosk(cat)      — 카테고리 필터
 *   _filoTablePay(did,...)     — 테이블 후불결제
 *   _filoTableSelfPay(...)     — 각자계산
 *   _filoShowReceipt(...)      — 영수증 출력
 *   _filoReceiptNotify(...)    — 영수증 알림
 *   render(el)                 — 테이블 렌더
 *
 * 최종수정: 2026-07-17 | 리팩토링 분리 + 심플모드 추가
 */

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


// ── POS 심플/프로 모드 전환 ─────────────────────────
function _filoPosMode(){
  // companies.posMode 또는 로컬 설정
  var cached = window._cachedCompanyDoc;
  var mode = (cached && cached.posMode) || localStorage.getItem('filo_pos_mode') || 'simple';
  return mode; // 'simple' | 'pro'
}
function _filoPosSetMode(mode){
  localStorage.setItem('filo_pos_mode', mode);
  if(window._cachedCompanyDoc) window._cachedCompanyDoc.posMode = mode;
  // Firestore에도 저장
  var did = _CU && (_CU.dealerId||_CU.uid);
  if(_db && did){
    _db.collection('companies').doc(did).update({ posMode: mode }).catch(function(){});
  }
}

function _filoPageKiosk(el){
 var did=_CU.dealerId||_CU.uid;
 _cartItems=[];
 var mode = _filoPosMode();
 // 모드 전환 버튼
 var modeBtn = '<button onclick="_filoPosSetMode(\''+( mode==='simple'?'pro':'simple' )+'\');_filoPageKiosk(document.getElementById(\'page-content\'))" '+
   'style="padding:4px 12px;border-radius:20px;border:1px solid #ddd;font-size:11px;cursor:pointer;background:'+(mode==='simple'?'#0066ff':'#f1f5f9')+';color:'+(mode==='simple'?'#fff':'#333')+'">'+
   (mode==='simple'?'⚡ 심플 모드':'🔧 프로 모드')+'</button>';

 el.innerHTML='<div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
   modeBtn +
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
  var today=_today();
  // 주문 맵 로드
  _db.collection('filo_orders').where('dealerId','==',did).where('type','==','table')
   .onSnapshot(function(oSnap){
    var oMap={};
    oSnap.forEach(function(doc){
     var d=doc.data();
     if(d.createdAt&&d.createdAt.slice(0,10)===today&&d.status!=='cancel'){
      var k=String(d.tableNum||'');
      var k2=d.tableName||'';
      if(!k&&k2)k=k2.replace(/[^0-9]/g,'')||k2;
      var isCleared=(d.status==='cleared');
      var isPd=(d.status==='paid'||d.payType==='prepay'||isCleared);
      if(k){
       if(!oMap[k])oMap[k]={total:0,paidTotal:0,pendingTotal:0,paid:false,hasPending:false,orders:[],hasCleared:false};
       oMap[k].total+=(d.total||0);
       oMap[k].orders.push(Object.assign({_id:doc.id},d));
       if(isCleared){oMap[k].paidTotal+=(d.total||0);oMap[k].hasCleared=true;}
       else if(isPd){oMap[k].paidTotal+=(d.total||0);}
       else{oMap[k].pendingTotal+=(d.total||0);oMap[k].hasPending=true;}
       if(!oMap[k].hasPending&&oMap[k].paidTotal>0)oMap[k].paid=true;
      }
      if(k2&&k2!==k){
       if(!oMap[k2])oMap[k2]={total:0,paidTotal:0,pendingTotal:0,paid:false,hasPending:false,orders:[],hasCleared:false};
       oMap[k2].total+=(d.total||0);
       oMap[k2].orders.push(Object.assign({_id:doc.id},d));
       if(isCleared){oMap[k2].paidTotal+=(d.total||0);oMap[k2].hasCleared=true;}
       else if(isPd){oMap[k2].paidTotal+=(d.total||0);}
       else{oMap[k2].pendingTotal+=(d.total||0);oMap[k2].hasPending=true;}
       if(!oMap[k2].hasPending&&oMap[k2].paidTotal>0)oMap[k2].paid=true;
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
      // filo_payments 기반으로 pendingTotal 재계산
      var dispPaid=ord?(ord.paidTotal||0):0;
      var dispPending=ord?Math.max(0,ord.total-dispPaid):0;
      var isPaid=hasOrder&&dispPending<=0&&dispPaid>0;
      var color=t.status==='empty'?'#94a3b8':isPaid?'#818cf8':hasOrder?'#fbbf24':'#4ade80';
      var bg=t.status==='empty'?'rgba(148,163,184,.12)':isPaid?'rgba(99,102,241,.25)':hasOrder?'rgba(251,191,36,.2)':'rgba(74,222,128,.15)';
      var borderC=t.status==='empty'?'rgba(148,163,184,.3)':isPaid?'#6366f1':hasOrder?'#f59e0b':'#22c55e';
      var btn=document.createElement('button');
      btn.style.cssText='padding:6px 12px;background:'+bg+';border:1.5px solid '+borderC+';border-radius:10px;color:'+color+';font-size:11px;font-weight:800;cursor:pointer;line-height:1.5;text-align:center;min-width:72px';
      var dispHtml='<div style="color:var(--tx)">'+t.name+'</div>';
      if(hasOrder){
       if(ord.orders&&ord.orders.some(function(o){return o.movedFrom;})){
        var from=ord.orders.find(function(o){return o.movedFrom;});
        dispHtml+='<div style="font-size:9px;color:#f59e0b">↔️ '+from.movedFrom+'번에서 이동</div>';
       }
       if(dispPaid>0)dispHtml+='<div style="font-size:10px;color:#818cf8">✅₩'+dispPaid.toLocaleString()+'</div>';
       if(dispPending>0)dispHtml+='<div style="font-size:10px;color:#fbbf24">⏳₩'+dispPending.toLocaleString()+'</div>';
       if(isPaid)dispHtml+='<div style="font-size:10px;color:#818cf8">✅ 전액결제</div>';
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


function _filoTablePay(did, items, total, tableNum, tableName, method, orderIds){
 if(!items||!items.length||total<=0)return;
 var now=new Date();
 var today=now.toISOString().slice(0,10);
 var methodLabel=method==='card'?'💳 카드':method==='cash'?'💵 현금':method==='kakao'?'🟡 카카오페이':'✅ '+method;

 // 1. filo_payments 저장 (결제 기록)
 _db.collection('filo_payments').add({
  dealerId:did,
  tableNum:tableNum,
  tableName:tableName,
  items:items.map(function(it){return {name:it.name||'',price:it.price||0,qty:it.qty||1,emoji:it.emoji||'🍽'};}),
  amount:total,
  method:method,
  methodLabel:methodLabel,
  payType:'table',
  orderIds:orderIds||[],
  date:today,
  paidAt:now.toISOString()
 }).then(function(){
  // 2. filo_sales 저장 (DINE 매출 연동)
  _db.collection('filo_sales').add({
   dealerId:did, type:'table', source:'pos',
   items:items, total:total,
   tableNum:tableNum, tableName:tableName,
   payMethod:method, payType:'table', status:'done',
   date:today, createdAt:now.toISOString(), paidAt:now.toISOString()
  }).catch(function(e){console.warn('[filo_sales]',e.message);});

  // 3. 전체 결제 완료 확인 → filo_orders cleared
  if(orderIds&&orderIds.length){
   _db.collection('filo_payments')
    .where('dealerId','==',did).where('tableNum','==',tableNum).where('date','==',today)
    .get().then(function(snap){
     var paidTotal=0;
     snap.forEach(function(doc){paidTotal+=doc.data().amount||0;});
     // 해당 테이블 filo_orders 합계
     _db.collection('filo_orders').where('dealerId','==',did).where('type','==','table')
      .get().then(function(oSnap){
       var orderTotal=0;
       var pendingIds=[];
       oSnap.forEach(function(doc){
        var d=doc.data();
        if((String(d.tableNum)===String(tableNum)||d.tableName===tableName)&&d.status!=='cleared'){
         orderTotal+=(d.total||0);
         pendingIds.push(doc.id);
        }
       });
       if(orderTotal>0&&paidTotal>=orderTotal&&pendingIds.length){
        var batch=_db.batch();
        pendingIds.forEach(function(id){
         batch.update(_db.collection('filo_orders').doc(id),{status:'cleared',paidAt:now.toISOString()});
        });
        batch.commit().then(function(){
          // batch 완료 후 filo_orders에서 fcmToken 수집 → FCM 영수증 자동 발송
          Promise.all([
            _db.collection('filo_orders').where('dealerId','==',did).where('tableNum','==',String(tableNum)).get(),
            _db.collection('filo_orders').where('dealerId','==',did).where('tableNum','==',parseInt(tableNum)||0).get()
          ]).then(function(results){
            var tokens=[]; var seen={};
            results.forEach(function(snap){
              snap.forEach(function(doc){
                if(seen[doc.id])return; seen[doc.id]=true;
                var tk=doc.data().fcmToken;
                if(tk&&tk.length>20&&tokens.indexOf(tk)<0)tokens.push(tk);
              });
            });
            if(!tokens.length)return;
            var iNames=items.slice(0,3).map(function(it){return it.name+(it.qty>1?' ×'+it.qty:'');}).join(' · ');
            if(items.length>3)iNames+=' 외 '+(items.length-3)+'건';
            fetch('/fcm/notify-drivers',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                tokens:tokens,
                title:methodLabel+' 완료 · ₩'+total.toLocaleString(),
                body:iNames,
                type:'receipt',
                url:'https://filo.ai.kr/order?d='+did+'&t='+tableNum+'#done'
              })
            }).then(function(r){return r.json();}).then(function(d){
              if(d.sent>0)_filoToast('📱 손님 영수증 발송 완료');
            }).catch(function(){});
          }).catch(function(){});
        }).catch(function(){});
       }
      }).catch(function(){});
    }).catch(function(){});
  }
  // 결제완료 알림 + 영수증 발송 버튼
  _filoReceiptNotify(did, tableNum, items, total, methodLabel);

 }).catch(function(e){_filoToast('❌ 결제 실패: '+e.message);});
}

// ── 테이블 각자 계산 ─────────────────────────────────────────────────────────

function _filoTableSelfPay(did,order,tableNum,tableName){
 var today=_today();

 // filo_payments에서 이미 결제된 항목 조회
 _db.collection('filo_payments')
  .where('dealerId','==',did)
  .where('tableNum','==',tableNum)
  .where('date','==',today)
  .get().then(function(paySnap){
   var paidNames=[];
   paySnap.forEach(function(doc){
    (doc.data().items||[]).forEach(function(it){paidNames.push(it.name);});
   });

   // orders에서 미결제 항목 펼치기
   var allItems=[];
   var allOrderIds=[];
   if(order.orders&&order.orders.length){
    order.orders.forEach(function(ord){
     var oid=ord.id||ord._id;
     if(oid&&allOrderIds.indexOf(oid)<0)allOrderIds.push(oid);
     (ord.items||[]).forEach(function(it){
      var pidx=paidNames.indexOf(it.name);
      if(pidx>=0){paidNames.splice(pidx,1);return;}
      allItems.push(Object.assign({},it,{_ordId:oid,qty:it.qty||1}));
     });
    });
   } else {
    (order.items||[]).forEach(function(it){
     var pidx=paidNames.indexOf(it.name);
     if(pidx>=0){paidNames.splice(pidx,1);return;}
     allItems.push(Object.assign({},it,{qty:it.qty||1}));
    });
   }

   if(!allItems.length){_filoToast('모든 항목이 이미 결제됐어요! ✅');return;}

   // 각자계산 모달 UI
   var mo=document.createElement('div');mo.className='mo';
   mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
   var box=document.createElement('div');
   box.style.cssText='background:var(--b2);border:1px solid var(--bd);border-radius:20px;padding:20px;width:100%;max-width:440px;max-height:80vh;overflow-y:auto';
   mo.appendChild(box);
   mo.onclick=function(e){if(e.target===mo)mo.remove();};
   document.body.appendChild(mo);

   var checkedMap={};
   allItems.forEach(function(_,i){checkedMap[i]=false;});


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
// ── 테이블 결제 통합 함수 ──────────────────────────────────────────────────────

function _filoReceiptNotify(did, tableNum, items, total, methodLabel) {
  // 기존 토스트 제거
  var old = document.getElementById('filo-receipt-popup');
  if(old) old.remove();

  // 팝업 생성
  var popup = document.createElement('div');
  popup.id = 'filo-receipt-popup';
  popup.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
    'background:#1e293b;border:1.5px solid rgba(8,145,178,.4);border-radius:16px;' +
    'padding:16px 18px;z-index:9999;min-width:290px;text-align:center;' +
    'box-shadow:0 8px 32px rgba(0,0,0,.5)';

  // 타이틀
  var ttl = document.createElement('div');
  ttl.style.cssText = 'font-size:14px;font-weight:800;color:#f0f0ff;margin-bottom:12px';
  ttl.textContent = '\u2705 ' + methodLabel + ' \u20a9' + total.toLocaleString() + ' \uacb0\uc81c \uc644\ub8cc!';
  popup.appendChild(ttl);

  // 버튼 행
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px';

  // 영수증 발송 버튼
  var sendBtn = document.createElement('button');
  sendBtn.style.cssText = 'flex:1;padding:9px;background:#0891b2;border:none;' +
    'border-radius:10px;color:#fff;font-size:13px;font-weight:800;cursor:pointer';
  sendBtn.textContent = '\ud83e\uddfe \uc601\uc218\uc99d \ubc1c\uc1a1';
  row.appendChild(sendBtn);

  // 닫기 버튼
  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'padding:9px 14px;background:rgba(255,255,255,.08);border:none;' +
    'border-radius:10px;color:#94a3b8;font-size:13px;cursor:pointer';
  closeBtn.textContent = '\u2715';
  closeBtn.onclick = function(){ popup.remove(); };
  row.appendChild(closeBtn);
  popup.appendChild(row);

  // 상태 메시지
  var status = document.createElement('div');
  status.style.cssText = 'font-size:11px;color:#94a3b8;margin-top:8px;display:none;line-height:1.4';
  popup.appendChild(status);

  document.body.appendChild(popup);

  // 8초 후 자동 제거
  var timer = setTimeout(function(){ popup.remove(); }, 8000);

  // 영수증 발송 클릭
  sendBtn.onclick = function() {
    sendBtn.disabled = true;
    sendBtn.textContent = '\u23f3 \ubc1c\uc1a1 \uc911...';
    status.style.display = 'block';
    status.textContent = '\uc190\ub2d8 \ud3f0\uc73c\ub85c \uc601\uc218\uc99d \ubc1c\uc1a1 \uc911...';
    clearTimeout(timer);

    _db.collection('filo_orders')
      .where('dealerId','==',did)
      .where('tableNum','==',parseInt(tableNum))
      .where('date','==',_today())
      .get().then(function(snap){
        var tok = null, ordId = null;
        snap.forEach(function(doc){
          var t = doc.data().fcmToken;
          if(t && t.length > 20){ tok = t; ordId = doc.id; }
        });
        if(!tok){
          sendBtn.textContent = '\u274c \ud1a0\ud070 \uc5c6\uc74c';
          status.textContent = '\uc190\ub2d8\uc774 \uc54c\ub9bc\uc744 \ud5c8\uc6a9\ud558\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4';
          setTimeout(function(){ popup.remove(); }, 3000);
          return;
        }
        var rUrl = 'https://filo.ai.kr/order-done?oid='+(ordId||'')+'&did='+did+'&t='+tableNum;
        var iNames = items.slice(0,3).map(function(it){
          return it.name + (it.qty>1 ? ' x'+it.qty : '');
        }).join(', ');
        if(items.length > 3) iNames += ' \uc678 '+(items.length-3)+'\uac74';
        fetch('/fcm/notify-drivers',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            tokens:[tok],
            title:'\ud83e\uddfe \uc601\uc218\uc99d \u00b7 \u20a9'+total.toLocaleString(),
            body:iNames,
            type:'receipt',
            url:rUrl
          })
        }).then(function(r){return r.json();}).then(function(d){
          if(d.sent > 0){
            sendBtn.textContent = '\u2705 \ubc1c\uc1a1\uc644\ub8cc';
            sendBtn.style.background = '#16a34a';
            status.textContent = '\uc190\ub2d8 \ud3f0\uc73c\ub85c \uc601\uc218\uc99d\uc774 \ubc1c\uc1a1\ub418\uc5c8\uc2b5\ub2c8\ub2e4!';
            setTimeout(function(){ popup.remove(); }, 3000);
          } else {
            sendBtn.textContent = '\u274c \ubc1c\uc1a1\uc2e4\ud328';
            sendBtn.disabled = false;
          }
        }).catch(function(){
          sendBtn.textContent = '\u274c \uc624\ub958';
          sendBtn.disabled = false;
        });
      }).catch(function(){
        sendBtn.textContent = '\u274c \uc870\ud68c\uc2e4\ud328';
        sendBtn.disabled = false;
      });
  };
}


   function render(){
    var selTotal=getSelTotal();
    box.innerHTML=
     '<div style="font-size:15px;font-weight:900;margin-bottom:6px">👥 각자 계산 - '+tableName+'</div>'+
     '<div style="font-size:11px;color:var(--t2);margin-bottom:10px">계산할 메뉴 선택</div>'+
     allItems.map(function(it,i){
      var on=checkedMap[i];
      return '<div data-idx="'+i+'" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:'+(on?'rgba(8,145,178,.15)':'var(--surface2)')+';border:1.5px solid '+(on?'#0891b2':'var(--bd2)')+'">'+
       '<div style="width:20px;height:20px;border-radius:50%;border:2px solid '+(on?'#0891b2':'var(--bd2)')+';background:'+(on?'#0891b2':'transparent')+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;flex-shrink:0">'+(on?'✓':'')+'</div>'+
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

    box.querySelectorAll('[data-idx]').forEach(function(el){
     el.onclick=function(){
      var idx=parseInt(el.dataset.idx);
      checkedMap[idx]=!checkedMap[idx];
      render();
     };
    });
    var cb=box.querySelector('#tself-card');
    var hb=box.querySelector('#tself-cash');
    var xb=box.querySelector('#tself-cancel');
    if(cb)cb.onclick=function(){
     var sel=allItems.filter(function(_,i){return checkedMap[i];});
     var total=getSelTotal();
     if(!sel.length||total<=0){_filoToast('메뉴를 선택하세요');return;}
     mo.remove();
     _filoTablePay(did,sel,total,tableNum,tableName,'card',allOrderIds);
    };
    if(hb)hb.onclick=function(){
     var sel=allItems.filter(function(_,i){return checkedMap[i];});
     var total=getSelTotal();
     if(!sel.length||total<=0){_filoToast('메뉴를 선택하세요');return;}
     mo.remove();
     _filoTablePay(did,sel,total,tableNum,tableName,'cash',allOrderIds);
    };
    if(xb)xb.onclick=function(){mo.remove();};
   }
   render();
  }).catch(function(e){_filoToast('❌ '+e.message);});
}



// 결제 완료 처리