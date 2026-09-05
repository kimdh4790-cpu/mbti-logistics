/**
 * filo-order-common.js — FILO 고객 주문 공통 모듈
 * 최종수정: 2026-07-16 | 담당: 엠비티아이 김형우
 *
 * [용도]
 *   order.html (테이블QR 주문) + store.html (배달/픽업 주문) 공통 함수
 *
 * [주요 함수]
 *   _renderMenuGrid   — 메뉴 카드 그리드 렌더링
 *   _renderCatBar     — 카테고리 탭 렌더링
 *   _openMdlCommon    — 메뉴 상세 모달 열기
 *   _openMdl / _closeMdl    — order.html용 모달 (#mdl)
 *   _openTlMdl / _closeTlMdl — store.html용 모달 (#tl-mdl)
 *   _tlQty            — 모달 수량 조절
 *   _updFab           — 장바구니 FAB 업데이트
 *   _openCart / _closeCart  — 장바구니 시트 열기/닫기
 *   _cartChg          — 장바구니 수량 변경
 *   _setLang          — 언어 변경 (ko/en/zh/ja)
 *   _loadMenus        — /api/menus?did= 메뉴 로드
 *   _filoToast        — 토스트 알림 (store.js 공용)
 *   _today/_nowISO/_toDateStr/_monthStr — 날짜 유틸
 *
 * [2026-07-16 추가]
 *   _closeTlMdl/_openTlMdl — store.html #tl-mdl용 모달 함수
 *   _filoToast — store.js에서 호출 (filo-common.js 미로드 우회)
 *   _today/_nowISO/_toDateStr/_monthStr — order.js 날짜 유틸
 */

// ── 전역 오류 탐지 (QR주문·주방·스토어 전체 커버) ──────────────────────────
(function(){
 function _sendErr(data){
  try{
   data.source='order-frontend';
   data.ts=new Date().toISOString();
   data.did=new URLSearchParams(location.search).get('d')||'unknown';
   data.url=location.href.slice(0,200);
   navigator.sendBeacon?navigator.sendBeacon('/api/log-error',JSON.stringify(data))
    :fetch('/api/log-error',{method:'POST',body:JSON.stringify(data),keepalive:true}).catch(function(){});
  }catch(e){}
 }
 window.onerror=function(msg,src,line,col,err){
  _sendErr({type:'js',msg:String(msg).slice(0,300),src:String(src||'').slice(0,150),line:line||0,col:col||0,stack:err&&err.stack});
  return false;
 };
 window.onunhandledrejection=function(e){
  var r=e.reason;
  _sendErr({type:'promise',msg:String(r&&(r.message||r)).slice(0,300),stack:r&&r.stack});
 };
})();

// ── 전역 공유 변수 (order.js / store.js 와 공유) ──────────────────────────────
var _menus=[], _did='', _lang='ko', _tlCache={}, _curMdlMenu=null, _tlQtyVal=1;

// ── UI 다국어 텍스트 ────────────────────────────────────────────────────────
var _i18n_common={
 ko:{cart:'장바구니',order:'주문하기',total:'합계',fab:'주문하기',
     done:'주문 완료!',sub:'잠시 후 준비됩니다',back:'메뉴 더 담기',
     addr:'주소 입력',sold:'품절',call:'직원 호출',close:'닫기',
     qty:'수량',add:'담기',
     payTitle:'결제 방식 선택',paySub:'편하신 방법으로 결제해주세요',
     postpay:'후불 결제',postpayDesc:'식사 후 카운터에서 결제',payDefault:'기본',
     prepay:'선결제',prepayDesc:'카드·카카오페이·네이버페이',prepayBadge:'준비중',
     payCancel:'취소',
     orderNum:'주문번호',tableNum:'테이블',
     receiptQ:'주문 영수증을 받으시겠어요?',receiptYes:'받기',receiptNo:'괜찮아요',confirm:'확인',
     receiptTitle:'주문 영수증',receiptTotal:'합계',receiptFcm:'영수증 알림 받기',
     cashNotice:'현금영수증이 필요하신 경우 카운터 직원에게 문의해 주세요',
     postpayNotice:'식사 후 카운터에서 결제해 주세요',postpayNoticeSub:'결제 완료 시 영수증을 보내드려요',
     pickupTitle:'픽업 알림 안내',pickupDesc1:'음식이 준비되면 폰 알림으로 알려드려요!',
     pickupDesc2:'화면이 꺼져도 알림이 도착합니다',pickupWait:'주방에서 준비 중...',
     changeTable:'테이블 번호 변경',
     fcmTitle:'픽업 알림 안내',fcmSub:'주문하신 음식이 준비되면 휴대폰으로 알림을 보내드립니다',
     fcmAllow:'알림 허용하기',fcmDenied:'알림 권한이 거부됐습니다',fcmDeniedSub:'주소창 잠금 아이콘 → 알림 → 허용 으로 변경해주세요',fcmRetry:'다시 시도하기'},
 en:{cart:'Cart',order:'Order',total:'Total',fab:'Order',
     done:'Order Placed!',sub:'Your order is being prepared',back:'Add More',
     addr:'Enter Address',sold:'Sold Out',call:'Call Staff',close:'Close',
     qty:'Qty',add:'Add to Cart',
     payTitle:'Select Payment',paySub:'Choose your preferred payment method',
     postpay:'Pay Later',postpayDesc:'Pay at counter after meal',payDefault:'Default',
     prepay:'Pay Now',prepayDesc:'Card · KakaoPay · NaverPay',prepayBadge:'Coming Soon',
     payCancel:'Cancel',
     orderNum:'Order #',tableNum:'Table',
     receiptQ:'Would you like an order receipt?',receiptYes:'Yes',receiptNo:'No thanks',confirm:'OK',
     receiptTitle:'Order Receipt',receiptTotal:'Total',receiptFcm:'Get Receipt Alert',
     cashNotice:'For cash receipts, please ask the staff at the counter',
     postpayNotice:'Please pay at the counter after your meal',postpayNoticeSub:'A receipt will be sent when payment is complete',
     pickupTitle:'Pickup Notification',pickupDesc1:'We\'ll send a phone alert when your food is ready!',
     pickupDesc2:'Alerts arrive even when your screen is off',pickupWait:'Kitchen is preparing...',
     changeTable:'Change Table Number',
     fcmTitle:'Pickup Alert',fcmSub:'We\'ll send a notification when your order is ready',
     fcmAllow:'Allow Notifications',fcmDenied:'Notification permission denied',fcmDeniedSub:'Tap the lock icon in address bar → Notifications → Allow',fcmRetry:'Try Again'},
 zh:{cart:'购物车',order:'点餐',total:'合计',fab:'点餐',
     done:'下单成功！',sub:'请稍候，正在准备中',back:'继续点餐',
     addr:'输入地址',sold:'售罄',call:'呼叫服务员',close:'关闭',
     qty:'数量',add:'加入购物车',
     payTitle:'选择支付方式',paySub:'请选择您方便的支付方式',
     postpay:'餐后结账',postpayDesc:'用餐后在柜台结账',payDefault:'默认',
     prepay:'立即支付',prepayDesc:'银行卡·KakaoPay·NaverPay',prepayBadge:'准备中',
     payCancel:'取消',
     orderNum:'订单号',tableNum:'桌号',
     receiptQ:'需要订单收据吗？',receiptYes:'需要',receiptNo:'不用了',confirm:'确认',
     receiptTitle:'订单收据',receiptTotal:'合计',receiptFcm:'接收收据通知',
     cashNotice:'需要现金收据请向柜台工作人员咨询',
     postpayNotice:'请用餐后在柜台结账',postpayNoticeSub:'结账完成后将发送收据',
     pickupTitle:'取餐提醒',pickupDesc1:'食物准备好后将发送手机通知！',
     pickupDesc2:'即使关屏也能收到通知',pickupWait:'厨房准备中...',
     changeTable:'更改桌号',
     fcmTitle:'取餐提醒',fcmSub:'您的餐点准备好时，我们会通过手机通知您',
     fcmAllow:'允许通知',fcmDenied:'通知权限被拒绝',fcmDeniedSub:'点击地址栏锁图标 → 通知 → 允许',fcmRetry:'重试'},
 ja:{cart:'カート',order:'注文する',total:'合計',fab:'注文する',
     done:'ご注文完了！',sub:'少々お待ちください',back:'メニューに戻る',
     addr:'住所入力',sold:'売切れ',call:'スタッフ呼出',close:'閉じる',
     qty:'数量',add:'カートに追加',
     payTitle:'お支払い方法を選択',paySub:'ご希望のお支払い方法をお選びください',
     postpay:'後払い',postpayDesc:'お食事後にカウンターでお支払い',payDefault:'デフォルト',
     prepay:'事前決済',prepayDesc:'カード·KakaoPay·NaverPay',prepayBadge:'準備中',
     payCancel:'キャンセル',
     orderNum:'注文番号',tableNum:'テーブル',
     receiptQ:'注文レシートを受け取りますか？',receiptYes:'受け取る',receiptNo:'不要です',confirm:'確認',
     receiptTitle:'注文レシート',receiptTotal:'合計',receiptFcm:'レシート通知を受け取る',
     cashNotice:'現金領収書が必要な場合はカウンタースタッフにお申し付けください',
     postpayNotice:'お食事後にカウンターでお支払いください',postpayNoticeSub:'支払い完了後にレシートをお送りします',
     pickupTitle:'お知らせ',pickupDesc1:'食事の準備ができたら通知でお知らせします！',
     pickupDesc2:'画面がオフでも通知が届きます',pickupWait:'キッチンで準備中...',
     changeTable:'テーブル番号を変更',
     fcmTitle:'お知らせ設定',fcmSub:'ご注文の準備ができたらお知らせします',
     fcmAllow:'通知を許可する',fcmDenied:'通知が拒否されました',fcmDeniedSub:'アドレスバーの鍵マーク → 通知 → 許可 に変更してください',fcmRetry:'再試行'}
};

function _t(k){
 return(_i18n_common[_lang]&&_i18n_common[_lang][k])||_i18n_common.ko[k]||k;
}

// ── URL 파라미터 ────────────────────────────────────────────────────────────
function _p(k){return new URLSearchParams(location.search).get(k)||'';}

// ── 카테고리 아이콘 ──────────────────────────────────────────────────────────
var _catIco={'전체':'🍽','버거':'🍔','치킨':'🍗','피자':'🍕','분식':'🌶️','음료':'☕',
 '사이드':'🍟','디저트':'🍰','세트':'🎉','카페':'☕','한식':'🍱','양식':'🍝',
 '중식':'🥢','일식':'🍣','기타':'🍽'};

// ── 번역 캐시 ────────────────────────────────────────────────────────────────
var _tlCache={};

/* ══════════════════════════════════════════
   🎨 매장 테마 자동 적용 (고객 페이지)
   order.html / store.html 이 이 파일을 로드하므로 여기서 한 번에 처리한다.
   companies/{did} 의 theme / primaryColor / bgColor 를 읽어 적용.
   고객 페이지는 밝은 디자인이라 어두운 배경을 씌울 땐 글자색도 함께 뒤집는다.
   ══════════════════════════════════════════ */
function _ocHexRgb(hex){
 var h=String(hex||'').trim().replace('#','');
 if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
 var n=parseInt(h,16);
 if(!isFinite(n)||h.length!==6) return null;
 return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function _ocShade(hex,amt){
 var c=_ocHexRgb(hex); if(!c) return hex;
 function f(v){return Math.max(0,Math.min(255,Math.round(v+(amt>0?(255-v):v)*amt)));}
 function hx(v){var s=v.toString(16);return s.length<2?'0'+s:s;}
 return '#'+hx(f(c.r))+hx(f(c.g))+hx(f(c.b));
}
function _ocIsLight(hex){
 var c=_ocHexRgb(hex); if(!c) return true;
 return (0.299*c.r+0.587*c.g+0.114*c.b)>160;
}
var _OC_THEMES={
 cafe:{primary:'#c8a96e',bg:'#1a1209'}, korean:{primary:'#e05555',bg:'#0f0a0a'},
 japanese:{primary:'#3b82f6',bg:'#0a0f1e'}, chinese:{primary:'#f59e0b',bg:'#1a0a0a'},
 fastfood:{primary:'#f97316',bg:'#f8f9fa'}, izakaya:{primary:'#d4af37',bg:'#0a0a0a'},
 other:{primary:'#0891b2',bg:'#f8fafc'}
};
function _filoApplyCustomerTheme(co){
 co=co||{};
 var base=_OC_THEMES[String(co.theme||'').trim()]||_OC_THEMES.other;
 var primary=(co.primaryColor&&_ocHexRgb(co.primaryColor))?co.primaryColor:base.primary;
 var bg=(co.bgColor&&_ocHexRgb(co.bgColor))?co.bgColor:base.bg;
 var light=_ocIsLight(bg);
 var surface=light?_ocShade(bg,0.6):_ocShade(bg,0.07);
 var accent=_ocShade(primary,0.22);
 var r=document.documentElement; if(!r||!r.style) return;
 var S=function(k,v){r.style.setProperty(k,v);};
 /* 명세 변수 */
 S('--primary',primary); S('--accent',accent); S('--bg',bg); S('--card',surface);
 /* order/store 변수 */
 S('--brand',primary); S('--brand2',accent); S('--brand-dark',_ocShade(primary,-0.25));
 S('--brand-light',_ocShade(primary,light?0.85:-0.55));
 S('--surface',surface);
 S('--border', light?'#e2e8f0':'rgba(255,255,255,.10)');
 S('--text1', light?'#0f172a':'#f2f2ff');
 S('--text2', light?'#475569':'#a8a8c8');
 S('--text3', light?'#94a3b8':'#6b6b8a');
 /* kitchen 계열 변수도 함께 */
 S('--surface2', light?_ocShade(bg,0.45):_ocShade(bg,0.12));
 S('--bd',  light?'rgba(0,0,0,.10)':'rgba(255,255,255,.08)');
 S('--bd2', light?'rgba(0,0,0,.16)':'rgba(255,255,255,.12)');
 S('--tx',  light?'#0f172a':'#f2f2ff');
 S('--t2',  light?'#475569':'#a8a8c8');
 S('--t3',  light?'#94a3b8':'#6b6b8a');
 var meta=document.querySelector('meta[name="theme-color"]');
 if(meta) meta.setAttribute('content',primary);
}
/* dealerId를 URL에서 찾아 firebase 준비되는 대로 적용 (order.js/store.js 수정 불필요) */
(function _ocThemeAutoInit(){
 try{
  var p=new URLSearchParams(location.search);
  var did=p.get('d')||p.get('did')||p.get('dealerId')||'';
  if(!did) return;
  var tries=0;
  var t=setInterval(function(){
   tries++;
   if(typeof firebase!=='undefined' && firebase.apps && firebase.apps.length){
    clearInterval(t);
    firebase.firestore().collection('companies').doc(did).get()
     .then(function(s){ if(s.exists) _filoApplyCustomerTheme(s.data()); })
     .catch(function(){});
   } else if(tries>60){ clearInterval(t); }
  },100);
 }catch(e){}
})();

// ── 메뉴명 → 안전한 DOM id ───────────────────────────────────────────────────
// 기존 name.replace(/\W/g,'_')는 \w가 ASCII만 인식해서 한글이 전부 '_'로 바뀌었다.
// 글자 수가 같은 메뉴끼리 id가 겹쳐("김치찌개"·"된장찌개" → 둘 다 'tr-____')
// 번역문과 장바구니 배지가 엉뚱한 메뉴 카드에 표시되는 문제가 있었다.
function _menuSlug(name){
 var s=String(name==null?'':name), h=0x811c9dc5;
 for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
 return h.toString(36)+'_'+s.length;
}

// ── 메뉴 카드 렌더링 ──────────────────────────────────────────────────────────
function _renderMenuGrid(menus, gridId){
 var grid=document.getElementById(gridId||'menu-grid');
 if(!grid)return;
 grid.innerHTML='';
 // 전역 _menus 업데이트 (번역 등에서 참조)
 if(!gridId || gridId==='menu-grid') _menus = menus;
 menus.forEach(function(m){
  var item=document.createElement('div');
  item.className='mi';
  item.dataset.cat=(m.category&&m.category.trim())||'기타';
  var trId='tr-'+_menuSlug(m.name);
  var badgeId='badge-'+_menuSlug(m.name);
  var inCart=_cart[m.name]&&_cart[m.name].qty>0;
  var nameEsc=m.name.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  var ttsBtnHtml='<button class="mi-tts-btn" aria-label="음성 안내" onclick="event.stopPropagation();_ttsMenu(\''+nameEsc+'\',\'\')" ontouchend="event.stopPropagation();event.preventDefault();_ttsMenu(\''+nameEsc+'\',\'\')">'+
   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'+
   '</button>';
  if(m.imageUrl){
   item.innerHTML='<div class="mi-img-wrap">'+
    '<img class="mi-img" src="'+m.imageUrl+'" loading="lazy" alt="'+m.name+'">'+
    '<div class="mi-overlay">'+
    '<div class="mi-name-img" data-orig="'+nameEsc+'">'+m.name+'</div>'+
    '<div class="mi-tr-img" id="'+trId+'"></div>'+
    '<div class="mi-price-img">₩'+(m.price||0).toLocaleString()+'</div>'+
    '</div></div>'+
    ttsBtnHtml+
    '<div class="mi-badge'+(inCart?' on':'')+'" id="'+badgeId+'">'+(inCart?_cart[m.name].qty:'')+'</div>';
  } else {
   var _mClrs=['#c9a84c','#2563eb','#059669','#dc2626','#d97706','#db2777'];
   var _mClr=_mClrs[(m.name||'M').charCodeAt(0)%_mClrs.length];
   var _mInit=(m.name||'M')[0];
   item.innerHTML='<div class="mi-emoji-wrap" style="background:linear-gradient(135deg,'+_mClr+'22,'+_mClr+'44)">'+
    '<div style="font-size:34px;font-weight:900;color:'+_mClr+';line-height:1;font-family:Pretendard,sans-serif">'+_mInit+'</div>'+
    '</div>'+
    '<div class="mi-body">'+
    '<div class="mi-name" data-orig="'+nameEsc+'">'+m.name+'</div>'+
    '<div class="mi-tr" id="'+trId+'"></div>'+
    '<div class="mi-price">₩'+(m.price||0).toLocaleString()+'</div>'+
    '</div>'+
    ttsBtnHtml+
    '<div class="mi-badge'+(inCart?' on':'')+'" id="'+badgeId+'">'+(inCart?_cart[m.name].qty:'')+'</div>';
  }
  if(m.stock!=null&&m.stock<=0){
   var sold=document.createElement('div');
   sold.className='mi-sold';
   sold.textContent=_t('sold');
   item.appendChild(sold);
  }
  item.style.touchAction='manipulation';
  (function(menu){
   var _tx=0,_ty=0;
   item.addEventListener('touchstart',function(e){
    _tx=e.touches[0].clientX;_ty=e.touches[0].clientY;
   },{passive:true});
   item.addEventListener('touchend',function(e){
    var dx=Math.abs(e.changedTouches[0].clientX-_tx);
    var dy=Math.abs(e.changedTouches[0].clientY-_ty);
    if(dx>10||dy>10)return; // 스크롤이면 무시
    e.preventDefault();
    if(menu.stock!=null&&menu.stock<=0)return;
    _openMdlCommon(menu);
   },{passive:false});
  })(m);
  grid.appendChild(item);
 });
 // 언어 반영
 if(_lang!=='ko') _applyTranslationsToGrid(menus);
}

// ── 카테고리 바 렌더링 ────────────────────────────────────────────────────────
function _renderCatBar(menus, barId, gridId){
 var bar=document.getElementById(barId||'cat-bar');
 if(!bar)return;
 var cats=['전체'];
 menus.forEach(function(m){var c=(m.category&&m.category.trim())||'기타';if(cats.indexOf(c)<0)cats.push(c);});
 bar.innerHTML='';
 cats.forEach(function(cat,i){
  var btn=document.createElement('button');
  btn.className='cat-btn'+(i===0?' on':'');
 btn.style.touchAction='manipulation';
 btn.style.cursor='pointer';
 btn.style.webkitTapHighlightColor='transparent';
  btn.dataset.cat=cat;
  btn.innerHTML=(_catIco[cat]||'')?' <span class="cat-ico">'+(_catIco[cat]||'')+'</span>'+cat:cat;
  var _catClick=function(e){
   if(e) e.preventDefault();
   document.querySelectorAll('.cat-btn').forEach(function(b){b.classList.remove('on');});
   btn.classList.add('on');
   document.querySelectorAll('.mi').forEach(function(item){
    var itemCat=item.dataset.cat||'기타';
    item.style.display=(cat==='전체'||itemCat===cat)?'':'none';
   });
   var sa=document.getElementById('scroll-area');if(sa)sa.scrollTop=0;
  };
  btn.onclick=_catClick;
  btn.ontouchend=_catClick;
  bar.appendChild(btn);
 });
}

// ── 카드 번역 적용 ────────────────────────────────────────────────────────────
// 카드 1개 번역 결과 반영
function _applyOneTr(trId, origName, tr){
 var e=document.getElementById(trId);
 if(!e) return;
 var card=e.closest?e.closest('.mi'):null;
 var nameEl=card?card.querySelector('[data-orig]'):null;
 if(nameEl) nameEl.textContent=(tr&&tr!==origName&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(tr))?tr:origName;
 e.textContent='';
}

function _applyTranslationsToGrid(menus){
 if(_lang==='ko') return;
 var lang=_lang;
 var needApi=[];
 menus.forEach(function(m){
  var trId='tr-'+_menuSlug(m.name);
  var el=document.getElementById(trId);
  if(!el) return;
  var card=el.closest?el.closest('.mi'):null;
  var nameEl=card?card.querySelector('[data-orig]'):null;
  var ck=m.name+'_'+lang;
  // 1) 세션 캐시 → 즉시 반영
  if(_tlCache[ck]){
   if(nameEl) nameEl.textContent=_tlCache[ck];
   el.textContent='';
   return;
  }
  // 2) Firestore 저장 번역 (유효한 것만)
  if(m.nameTranslations&&m.nameTranslations[lang]){
   var saved=m.nameTranslations[lang];
   if(saved&&saved!==m.name&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(saved)){
    _tlCache[ck]=saved;
    if(nameEl) nameEl.textContent=saved;
    el.textContent='';
    return;
   }
  }
  // 3) API 필요 — 로딩 점 표시
  el.textContent='···';
  needApi.push({m:m,trId:trId,ck:ck});
 });
 if(!needApi.length) return;

 // 배치 일괄 번역 (1번 API 호출로 전체 처리 — 동시 호출 과부하 방지)
 var batchNames=needApi.map(function(i){return i.m.name;});
 var ctrl2=typeof AbortController!=='undefined'?new AbortController():null;
 var tid2=ctrl2?setTimeout(function(){ctrl2.abort();},15000):null;
 var opts2={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:batchNames,lang:lang})};
 if(ctrl2) opts2.signal=ctrl2.signal;
 // 브라우저 직접 번역 폴백 (Google free API — 브라우저에서 CORS 허용)
 function _browserTr(items,l){
  var tlMap={en:'en',zh:'zh-CN',ja:'ja'};
  var tl=tlMap[l]||'en';
  items.forEach(function(item){
   fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl='+tl+'&dt=t&q='+encodeURIComponent(item.m.name))
   .then(function(r){return r.json();})
   .then(function(gd){
    var t=(gd&&gd[0]&&gd[0][0]&&gd[0][0][0])||'';
    if(t&&t!==item.m.name&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(t)){
     _tlCache[item.ck]=t;
     if(_lang===l) _applyOneTr(item.trId,item.m.name,t);
    }
   }).catch(function(){});
  });
 }
 fetch('/api/translate-batch',opts2)
 .then(function(r){return r.json();})
 .then(function(d){
  if(ctrl2&&tid2) clearTimeout(tid2);
  if(d&&d._debug) console.log('[TR]',lang,JSON.stringify(d._debug));
  if(_lang!==lang) return;
  var map=d.translations||{};
  var missed=[];
  needApi.forEach(function(item){
   var tr=(map[item.m.name]||'').trim();
   if(tr&&tr!==item.m.name&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(tr)){
    _tlCache[item.ck]=tr;
    _applyOneTr(item.trId,item.m.name,tr);
   } else {
    missed.push(item);
    _applyOneTr(item.trId,item.m.name,'');
   }
  });
  if(missed.length) _browserTr(missed,lang);
 })
 .catch(function(){
  if(_lang!==lang) return;
  needApi.forEach(function(item){ _applyOneTr(item.trId,item.m.name,''); });
  _browserTr(needApi,lang);
 });
}

// ── 공통 모달 (_openMdlCommon) ────────────────────────────────────────────────
// order.js는 #mdl/#mdl-box, store.js는 #tl-mdl/#tl-box 사용
// 각 파일에서 _openMdl 오버라이드 가능
function _openMdlCommon(m){
 _curMdlMenu=m;
 _tlQtyVal=1;
 // 모달 박스 ID 감지
 var boxId=document.getElementById('mdl-box')?'mdl-box':'tl-box';
 var mdlId=document.getElementById('mdl')?'mdl':'tl-mdl';
 var nameId=document.getElementById('mdl-name')?'mdl-name':'tl-name';
 var priceId=document.getElementById('mdl-price')?'mdl-price':'tl-price';
 var trId=document.getElementById('mdl-tr')?'mdl-tr':'tl-tr';
 var descId=document.getElementById('mdl-desc')?'mdl-desc':'tl-desc';
 var qtyId=document.getElementById('tl-qty')?'tl-qty':'tl-qty';
 var addId=document.getElementById('mdl-add')?'mdl-add':'tl-add';

 var tlBox=document.getElementById(boxId);
 if(!tlBox)return;
 // mdl-scroll 있으면 그 안에서, 없으면 tlBox 직접 사용
 var scrollEl=document.getElementById('mdl-scroll')||tlBox;
 var oldHdr=scrollEl.querySelector('.mdl-img-full,.mdl-emoji');
 if(oldHdr)oldHdr.remove();
 var mdlContent=scrollEl.querySelector('.mdl-content');
 if(m.imageUrl){
  var img=document.createElement('img');
  img.className='mdl-img-full';img.src=m.imageUrl;img.alt=m.name;
  img.style.cssText='width:100%;max-height:320px;object-fit:contain;background:#f8fafc;display:block';
  scrollEl.insertBefore(img,mdlContent);
 } else {
  var emojiEl=document.createElement('div');
  emojiEl.className='mdl-emoji';
  var _mClrs2=['#c9a84c','#2563eb','#059669','#dc2626','#d97706','#db2777'];
  var _mClr2=_mClrs2[(m.name||'').charCodeAt(0)%_mClrs2.length];
  emojiEl.style.cssText='display:flex;align-items:center;justify-content:center;padding:24px 0';
  emojiEl.innerHTML='<div style="width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,'+_mClr2+'22,'+_mClr2+'44);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:'+_mClr2+';font-family:Pretendard,sans-serif">'+(m.name||'M')[0]+'</div>';
  scrollEl.insertBefore(emojiEl,mdlContent);
 }
 var nameEl=document.getElementById(nameId);if(nameEl)nameEl.textContent=m.name;
 // 언어가 ko가 아니면 모달 이름도 번역
 if(_lang!=='ko'&&nameEl){
  var mnCk=m.name+'_'+_lang;
  if(_tlCache[mnCk]){nameEl.textContent=_tlCache[mnCk];}
  else if(m.nameTranslations&&m.nameTranslations[_lang]&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(m.nameTranslations[_lang])){
   nameEl.textContent=m.nameTranslations[_lang];
   _tlCache[mnCk]=m.nameTranslations[_lang];
  } else {
   fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:m.name,lang:_lang})})
   .then(function(r){return r.json();})
   .then(function(d){
    if(d.translated&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(d.translated)){
     _tlCache[mnCk]=d.translated;
     if(_curMdlMenu&&_curMdlMenu.name===m.name&&nameEl)nameEl.textContent=d.translated;
    }
   }).catch(function(){});
  }
 }
 var priceEl=document.getElementById(priceId);if(priceEl)priceEl.textContent='₩'+(m.price||0).toLocaleString();
 var qtyEl=document.getElementById(qtyId);if(qtyEl)qtyEl.textContent='1';
 var addEl=document.getElementById(addId);if(addEl)addEl.textContent='담기 — ₩'+(m.price||0).toLocaleString();
 var trEl=document.getElementById(trId);if(trEl)trEl.textContent='';
 var descEl=document.getElementById(descId);if(descEl)descEl.textContent=m.description||'';
 document.getElementById(mdlId).classList.add('open');

 // 번역
 if(_lang!=='ko'){
  var ck=m.name+'_'+_lang;
  if(_tlCache[ck]){if(trEl)trEl.textContent=_tlCache[ck];}
  else if(m.nameTranslations&&m.nameTranslations[_lang]&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(m.nameTranslations[_lang])){
   _tlCache[ck]=m.nameTranslations[_lang];
   if(trEl)trEl.textContent=m.nameTranslations[_lang];
  } else {
   if(trEl)trEl.innerHTML='<span class="tl-spin"></span>';
   fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:m.name,lang:_lang})})
   .then(function(r){return r.json();})
   .then(function(d){
    var t=d.translated;
    var valid=t&&t!==m.name&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(t);
    _tlCache[ck]=valid?t:'';
    if(_curMdlMenu&&_curMdlMenu.name===m.name&&trEl)trEl.textContent=valid?t:'';
   }).catch(function(){if(trEl)trEl.textContent='';});
  }
  // 설명 번역
  if(m.description&&descEl){
   var dk=m.name+'_desc_'+_lang;
   if(_tlCache[dk]){descEl.textContent=_tlCache[dk];}
   else if(m.descTranslations&&m.descTranslations[_lang]){
    _tlCache[dk]=m.descTranslations[_lang];
    descEl.textContent=m.descTranslations[_lang];
   } else {
    fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({name:m.description,lang:_lang})})
    .then(function(r){return r.json();})
    .then(function(d){
     var t=d.translated||m.description;_tlCache[dk]=t;
     if(_curMdlMenu&&_curMdlMenu.name===m.name&&descEl)descEl.textContent=t;
    }).catch(function(){});
   }
  }
 }
 // 모달 열기
 var mdlEl = document.getElementById(mdlId);
 if(mdlEl) mdlEl.classList.add('open');
 // 메뉴 모달 열릴 때 TTS로 메뉴명 읽기 (비KO 언어 전용)
 if(_lang!=='ko'){
  setTimeout(function(){
   var ck=m.name+'_'+_lang;
   var readName=_tlCache[ck]||m.name;
   var dk=m.name+'_desc_'+_lang;
   var readDesc=_tlCache[dk]||'';
   _ttsMenu(readName, readDesc);
  }, 300);
 }
}

// ── 수량 조절 ────────────────────────────────────────────────────────────────
function _tlQty(d){
 _tlQtyVal=Math.max(1,(_tlQtyVal||1)+d);
 var qtyEl=document.getElementById('tl-qty');if(qtyEl)qtyEl.textContent=_tlQtyVal;
 var addEl=document.getElementById('mdl-add')||document.getElementById('tl-add');
 if(addEl&&_curMdlMenu)addEl.textContent='담기 — ₩'+((_curMdlMenu.price||0)*_tlQtyVal).toLocaleString();
}

// ── 장바구니 FAB 업데이트 ──────────────────────────────────────────────────────
function _updFab(){
 var total=0,cnt=0;
 Object.values(_cart).forEach(function(i){total+=i.price*i.qty;cnt+=i.qty;});
 var fab=document.getElementById('cart-fab');if(!fab)return;
 if(cnt>0){
  fab.classList.add('show');
  var fc=document.getElementById('fab-cnt');if(fc)fc.textContent=cnt;
  var fp=document.getElementById('fab-price');if(fp)fp.textContent='₩'+total.toLocaleString();
 } else {
  fab.classList.remove('show');
 }
 // 배지 업데이트
 Object.keys(_cart).forEach(function(name){
  var badgeEl=document.getElementById('badge-'+_menuSlug(name));
  if(badgeEl){
   var qty=_cart[name]?_cart[name].qty:0;
   badgeEl.textContent=qty||'';
   badgeEl.classList.toggle('on',qty>0);
  }
 });
}

// ── 장바구니 시트 열기/닫기 ──────────────────────────────────────────────────
function _openCart(){
 var list=document.getElementById('cart-list');
 if(!list)return;
 list.innerHTML='';
 var total=0;
 Object.values(_cart).forEach(function(item){
  if(!item.qty)return;
  total+=item.price*item.qty;
  var row=document.createElement('div');
  row.className='ci';
  // 이미지 또는 이모지
  var menuData=_menus.find(function(m){return m.name===item.name;});
  var mediaEl=document.createElement('div');
  if(menuData&&menuData.imageUrl){
   var img=document.createElement('img');
   img.className='ci-img';img.src=menuData.imageUrl;img.alt=item.name;
   mediaEl.appendChild(img);
  } else {
   var _cClrs=['#c9a84c','#2563eb','#059669','#dc2626','#d97706','#db2777'];
   var _cClr=_cClrs[(item.name||'').charCodeAt(0)%_cClrs.length];
   mediaEl.className='ci-emoji';
   mediaEl.style.cssText='width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,'+_cClr+'22,'+_cClr+'44);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:'+_cClr+';flex-shrink:0';
   mediaEl.textContent=(item.name||'M')[0];
  }
  var nameEl=document.createElement('div');nameEl.className='ci-name';nameEl.textContent=item.name;
  var ctrl=document.createElement('div');ctrl.className='ci-ctrl';
  var bm=document.createElement('button');bm.textContent='−';
  var qs=document.createElement('span');qs.className='ci-qty';qs.textContent=item.qty;
  var bp=document.createElement('button');bp.textContent='+';
  (function(n){
   bm.onclick=function(){_cartChg(n,-1);};
   bp.onclick=function(){_cartChg(n,1);};
  })(item.name);
  ctrl.appendChild(bm);ctrl.appendChild(qs);ctrl.appendChild(bp);
  var priceEl=document.createElement('div');priceEl.className='ci-price';
  priceEl.textContent='₩'+(item.price*item.qty).toLocaleString();
  row.appendChild(mediaEl);row.appendChild(nameEl);row.appendChild(ctrl);row.appendChild(priceEl);
  list.appendChild(row);
 });
 var tp=document.getElementById('total-price');if(tp)tp.textContent='₩'+total.toLocaleString();
 var fp=document.getElementById('fab-price');if(fp)fp.textContent='₩'+total.toLocaleString();
 var ov=document.getElementById('overlay');if(ov)ov.style.display='block';
 var cs=document.getElementById('cart-sheet');if(cs)cs.classList.add('open');
}

function _closeCart(){
 var ov=document.getElementById('overlay');if(ov)ov.style.display='none';
 var cs=document.getElementById('cart-sheet');if(cs)cs.classList.remove('open');
}

// ── 장바구니 수량 변경 ────────────────────────────────────────────────────────
function _cartChg(name,d){
 if(!_cart[name])return;
 _cart[name].qty+=d;
 if(_cart[name].qty<=0)delete _cart[name];
 _openCart();
 _updFab();
 if(!Object.keys(_cart).filter(function(k){return _cart[k]&&_cart[k].qty>0;}).length)_closeCart();
}

// ── TTS 음성 안내 ─────────────────────────────────────────────────────────────
var _TTS_LANG={ko:'ko-KR',en:'en-US',zh:'zh-TW',ja:'ja-JP'};
var _TTS_GREET={
 ko:'안녕하세요! 메뉴를 선택해 주세요.',
 en:'Welcome! Please select a menu item.',
 zh:'欢迎光临！请选择菜单。',
 ja:'いらっしゃいませ！メニューをお選びください。'
};

function _ttsSpeak(text, lang){
 if(!window.speechSynthesis||!text) return;
 window.speechSynthesis.cancel();
 var u=new SpeechSynthesisUtterance(text);
 u.lang=_TTS_LANG[lang||_lang]||'ko-KR';
 u.rate=0.95;
 u.pitch=1.05;
 // 해당 언어 음성 우선 선택
 var voices=window.speechSynthesis.getVoices();
 var matched=voices.filter(function(v){return v.lang===u.lang;});
 if(matched.length) u.voice=matched[0];
 window.speechSynthesis.speak(u);
}

function _ttsMenu(menuName, desc){
 var translatedName='';
 var ck=menuName+'_'+_lang;
 if(_lang==='ko'){
  translatedName=menuName;
 } else if(_tlCache[ck]){
  translatedName=_tlCache[ck];
 } else {
  // 캐시 없으면 원문으로 읽기
  translatedName=menuName;
 }
 var text=translatedName+(desc?' — '+desc:'');
 _ttsSpeak(text, _lang);
}

// ── 언어 변경 ────────────────────────────────────────────────────────────────
function _setLang(l){
 _lang=l;
 try{localStorage.setItem('filo_lang',l);}catch(e){}
 _tlCache={};
 ['ko','en','zh','ja'].forEach(function(x){
  var b=document.getElementById('lb-'+x);if(b)b.classList.toggle('on',x===l);
 });
 // 메뉴 이름 원문(한글) 복원 후 비언어 선택 시 번역 적용
 document.querySelectorAll('[data-orig]').forEach(function(e){e.textContent=e.dataset.orig;});
 document.querySelectorAll('[id^="tr-"]').forEach(function(e){e.textContent='';});
 // UI 텍스트 업데이트
 var els={
  'cart-title':_t('cart'),'order-btn':_t('order'),
  'total-label':_t('total'),'tl-total':_t('total'),
  'fab-label':_t('fab'),'done-title':_t('done'),
  'done-sub':_t('sub'),'done-back':_t('back'),
  'dn-back':_t('back'),'addr-btn':_t('addr'),
  // 결제 모달
  'pay-title-txt':_t('payTitle'),'pay-sub-txt':_t('paySub'),
  'postpay-name':_t('postpay'),'postpay-desc':_t('postpayDesc'),
  'pay-default-badge':_t('payDefault'),'prepay-badge':_t('prepayBadge'),
  'prepay-desc':_t('prepayDesc'),'pay-cancel-btn':_t('payCancel'),
  // 주문 완료 화면
  'receipt-q-txt':_t('receiptQ'),'receipt-yes-btn':_t('receiptYes'),'receipt-no-btn':_t('receiptNo'),'done-s2-next':_t('confirm'),
  'receipt-title-txt':_t('receiptTitle'),'receipt-total-lbl':_t('receiptTotal'),
  'cash-receipt-notice':_t('cashNotice'),
  'postpay-notice-main':_t('postpayNotice'),'postpay-notice-sub':_t('postpayNoticeSub'),
  'pickup-title-txt':_t('pickupTitle'),'pickup-desc2-txt':_t('pickupDesc2'),
  'pickup-status':_t('pickupWait'),'change-table-txt':_t('changeTable'),
  // FCM 게이트
  'fcm-title-txt':_t('fcmTitle'),'fcm-allow-btn':_t('fcmAllow'),
  'fcm-denied-title-txt':_t('fcmDenied'),'fcm-denied-sub-txt':_t('fcmDeniedSub'),
  'fcm-retry-btn':_t('fcmRetry'),'receipt-fcm-btn':_t('receiptFcm')
 };
 Object.keys(els).forEach(function(id){
  var el=document.getElementById(id);if(el&&els[id])el.textContent=els[id];
 });
 var pd1=document.getElementById('pickup-desc1-txt');
 if(pd1)pd1.textContent=_t('pickupDesc1');
 var ppn=document.getElementById('prepay-name');
 if(ppn){
  var ppnBadge=document.getElementById('prepay-badge');
  // 텍스트 노드만 변경 (배지 스팬 유지)
  Array.from(ppn.childNodes).forEach(function(n){if(n.nodeType===3)n.textContent=_t('prepay')+' ';});
  if(ppnBadge)ppnBadge.textContent=_t('prepayBadge');
 }
 // fcm-sub: <strong> 포함
 var fcmSub=document.getElementById('fcm-sub-txt');
 if(fcmSub)fcmSub.textContent=_t('fcmSub');
 // 메뉴 카드 번역 적용 (ko 복원 후 비KO 언어만 적용, 한 번만 호출)
 if(l!=='ko'&&_menus&&_menus.length) _applyTranslationsToGrid(_menus);
 // 품절 텍스트
 document.querySelectorAll('.mi-sold').forEach(function(s){s.textContent=_t('sold');});
 // 담기 버튼 텍스트 갱신
 var addBtn=document.getElementById('mdl-add')||document.getElementById('tl-add');
 if(addBtn&&_curMdlMenu){
  var p=(_curMdlMenu.price||0)*(_tlQtyVal||1);
  addBtn.textContent=_t('add')+' — ₩'+p.toLocaleString();
 }
 // TTS 버튼 노출 (비KO 언어)
 document.body.dataset.tts=(l!=='ko')?'on':'';
 // 언어 전환 TTS 인사말 (음성 목록 로드 후 실행)
 if(window.speechSynthesis){
  var _doGreet=function(){_ttsSpeak(_TTS_GREET[l]||_TTS_GREET.ko, l);};
  var _voices=window.speechSynthesis.getVoices();
  if(_voices.length) _doGreet();
  else window.speechSynthesis.onvoiceschanged=function(){window.speechSynthesis.onvoiceschanged=null;_doGreet();};
 }
}

// ── 주소 입력 팝업 ────────────────────────────────────────────────────────────
function _openAddrPopup(){
 var pop=document.createElement('div');
 pop.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
 pop.innerHTML='<div style="background:#fff;border-radius:20px;padding:24px;width:100%;max-width:420px">'+
  '<div style="font-size:16px;font-weight:900;margin-bottom:16px">배달 주소 입력</div>'+
  '<input id="_ai1" placeholder="도로명 주소 (예: 수영로 668)" style="width:100%;padding:13px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:14px;margin-bottom:8px;box-sizing:border-box;outline:none">'+
  '<input id="_ai2" placeholder="상세주소 (예: 607호)" style="width:100%;padding:13px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:14px;margin-bottom:16px;box-sizing:border-box;outline:none">'+
  '<div style="display:flex;gap:8px">'+
  '<button id="_aok" style="flex:1;padding:14px;background:#0891b2;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">확인</button>'+
  '<button id="_acl" style="flex:1;padding:14px;background:#f1f5f9;color:#64748b;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">취소</button>'+
  '</div></div>';
 document.body.appendChild(pop);
 setTimeout(function(){var el=document.getElementById('_ai1');if(el)el.focus();},100);
 document.getElementById('_aok').onclick=function(){
  var main=(document.getElementById('_ai1')||{}).value||'';
  var detail=(document.getElementById('_ai2')||{}).value||'';
  main=main.trim();detail=detail.trim();
  if(!main){_filoToast('주소를 입력해주세요');return;}
  if(typeof _addrFull!=='undefined')_addrFull=main+(detail?' '+detail:'');
  if(typeof _addr!=='undefined')_addr=main+(detail?' '+detail:'');
  var btns=document.querySelectorAll('[id^="addr-btn"]');
  btns.forEach(function(b){b.textContent=main+(detail?' '+detail:'');});
  pop.remove();
 };
 document.getElementById('_acl').onclick=function(){pop.remove();};
 pop.onclick=function(e){if(e.target===pop)pop.remove();};
}
function _closeAddrPopup(){var p=document.querySelector('[style*="z-index:9999"]');if(p)p.remove();}
function _confirmAddr(){_openAddrPopup();}
function _searchAddr(){_openAddrPopup();}

// ── 시간대별 AI 메뉴 추천 배너 ──────────────────────────────────────────────
function _renderRecommendBanner(menus){
 var bannerId='recommend-banner';
 var existing=document.getElementById(bannerId);
 if(existing)existing.remove();

 var h=new Date().getHours();
 var timeLabel=h>=6&&h<11?'아침 추천':h>=11&&h<14?'점심 추천':h>=14&&h<17?'오후 추천':h>=17&&h<21?'저녁 추천':'야식 추천';

 var timePrefs={
  morning:['커피','음료','디저트','샐러드','토스트'],
  lunch:['밥','면','정식','국','찌개','비빔밥','냉면','한식'],
  afternoon:['커피','음료','디저트','케이크','스낵'],
  dinner:['고기','치킨','피자','맥주','삼겹살','갈비','술'],
  night:['치킨','피자','족발','보쌈','야식']
 };
 var prefKey=h>=6&&h<11?'morning':h>=11&&h<14?'lunch':h>=14&&h<17?'afternoon':h>=17&&h<21?'dinner':'night';
 var prefs=timePrefs[prefKey];

 // 메뉴 점수 계산
 var scored=menus.filter(function(m){return m.stock==null||m.stock>0;}).map(function(m){
  var score=0;
  prefs.forEach(function(p,i){if(m.name.includes(p)||(m.category&&m.category.includes(p)))score+=10-i;});
  return {m:m,score:score};
 }).sort(function(a,b){return b.score-a.score;}).slice(0,5);

 if(!scored.length)return;

 var banner=document.createElement('div');
 banner.id=bannerId;
 banner.style.cssText='margin:0 0 12px;padding:12px 14px;background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(59,130,246,.08));border:1px solid rgba(201,168,76,.2);border-radius:14px;';

 var inner=document.createElement('div');
 inner.innerHTML='<div style="font-size:11px;font-weight:800;color:#a78bfa;margin-bottom:8px;letter-spacing:.5px">'+timeLabel+'</div>';
 var row=document.createElement('div');
 row.style.cssText='display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;-webkit-overflow-scrolling:touch';

 scored.forEach(function(s){
  var m=s.m;
  var card=document.createElement('div');
  card.style.cssText='min-width:64px;text-align:center;cursor:pointer;flex-shrink:0';
  // 이미지
  var imgWrap=document.createElement('div');
  imgWrap.style.cssText='width:64px;height:64px;border-radius:10px;overflow:hidden;background:rgba(201,168,76,.15);display:flex;align-items:center;justify-content:center;font-size:26px';
  if(m.imageUrl){
   var img=document.createElement('img');
   img.src=m.imageUrl;
   img.style.cssText='width:100%;height:100%;object-fit:cover';
   img.loading='lazy';
   img.onerror=function(){
    var _ec=['#c9a84c','#2563eb','#059669','#dc2626','#d97706','#db2777'];
    var _ec2=_ec[(m.name||'M').charCodeAt(0)%_ec.length];
    imgWrap.style.background='linear-gradient(135deg,'+_ec2+'22,'+_ec2+'44)';
    imgWrap.innerHTML='<div style="font-size:22px;font-weight:900;color:'+_ec2+'">'+( m.name||'M')[0]+'</div>';
   };
   imgWrap.appendChild(img);
  } else {
   var _nc=['#c9a84c','#2563eb','#059669','#dc2626','#d97706','#db2777'];
   var _nc2=_nc[(m.name||'M').charCodeAt(0)%_nc.length];
   imgWrap.style.background='linear-gradient(135deg,'+_nc2+'22,'+_nc2+'44)';
   imgWrap.innerHTML='<div style="font-size:22px;font-weight:900;color:'+_nc2+'">'+( m.name||'M')[0]+'</div>';
  }
  card.appendChild(imgWrap);
  // 이름
  var nameEl=document.createElement('div');
  nameEl.style.cssText='font-size:10px;font-weight:700;color:var(--t1);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:64px';
  nameEl.textContent=m.name;
  card.appendChild(nameEl);
  // 가격
  var priceEl=document.createElement('div');
  priceEl.style.cssText='font-size:10px;color:#22c55e;font-weight:700';
  priceEl.textContent='₩'+Number(m.price||0).toLocaleString();
  card.appendChild(priceEl);
  // 클릭 — closure로 안전하게
  (function(menu){card.onclick=function(){_openMdlCommon(menu);};
  card.ontouchend=function(e){e.preventDefault();_openMdlCommon(menu);};})(m);
  row.appendChild(card);
 });

 inner.appendChild(row);
 banner.appendChild(inner);

 var grid=document.getElementById('menu-grid');
 if(grid&&grid.parentNode)grid.parentNode.insertBefore(banner,grid);
}

// ── 번역 미리 캐시 (페이지 로드 후 백그라운드 — 언어 전환 즉시 표시용) ────────
function _prefetchTranslations(menus){
 var langs=['en','zh','ja'];
 var tlMap={en:'en',zh:'zh-CN',ja:'ja'};
 // Firestore nameTranslations 있는 것은 즉시 _tlCache 선점
 var allNeed={};
 langs.forEach(function(lang){
  var need=[];
  menus.forEach(function(m){
   var ck=m.name+'_'+lang;
   if(_tlCache[ck]) return;
   if(m.nameTranslations&&m.nameTranslations[lang]){
    var s=m.nameTranslations[lang];
    if(s&&s!==m.name&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(s)){_tlCache[ck]=s;return;}
   }
   need.push(m);
  });
  allNeed[lang]=need;
 });
 langs.forEach(function(lang,idx){
  var need=allNeed[lang];
  if(!need||!need.length) return;
  // 서버 부하 분산: en 즉시, zh +400ms, ja +800ms
  setTimeout(function(){
   var names=need.map(function(m){return m.name;});
   var tl=tlMap[lang];
   function _browserFallback(items){
    items.forEach(function(m){
     fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl='+tl+'&dt=t&q='+encodeURIComponent(m.name))
     .then(function(r){return r.json();})
     .then(function(gd){
      var t=(gd&&gd[0]&&gd[0][0]&&gd[0][0][0])||'';
      if(t&&t!==m.name&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(t)){
       _tlCache[m.name+'_'+lang]=t;
       if(_lang===lang) _applyOneTr('tr-'+_menuSlug(m.name),m.name,t);
      }
     }).catch(function(){});
    });
   }
   fetch('/api/translate-batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:names,lang:lang})})
   .then(function(r){return r.json();})
   .then(function(d){
    var map=d.translations||{};
    var missed=[];
    need.forEach(function(m){
     var tr=(map[m.name]||'').trim();
     if(tr&&tr!==m.name&&!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(tr)){
      _tlCache[m.name+'_'+lang]=tr;
      if(_lang===lang) _applyOneTr('tr-'+_menuSlug(m.name),m.name,tr);
     } else { missed.push(m); }
    });
    if(missed.length) _browserFallback(missed);
   }).catch(function(){ _browserFallback(need); });
  }, idx*400);
 });
}

// ── 메뉴 로드 (order.js / store.js 공통) ────────────────────────────────────
function _loadMenus(onDone){
 fetch('/api/menus?did='+encodeURIComponent(_did))
 .then(function(r){return r.json();})
 .then(function(d){
  _menus=d.menus||[];
  _renderCatBar(_menus,'cat-bar');
  _renderMenuGrid(_menus,'menu-grid');
  _renderRecommendBanner(_menus);
  _prefetchTranslations(_menus); // 백그라운드에서 3개 언어 미리 캐시
  if(onDone) onDone(_menus);
 }).catch(function(){
  var g=document.getElementById('menu-grid');
  if(g)g.innerHTML='<div class="empty"><div class="empty-msg">메뉴를 불러올 수 없습니다</div></div>';
 });
}

// ── 모달 열기/닫기 ──────────────────────────────────────────────────────────
function _openMdl(m){_openMdlCommon(m);}
function _closeMdl(){
 var mdl=document.getElementById('mdl');
 if(mdl)mdl.classList.remove('open');
 _curMdlMenu=null;
}

function _closeTlMdl(){
  var mdl=document.getElementById('tl-mdl');
  if(mdl)mdl.classList.remove('open');
  _curMdlMenu=null;
}
function _openTlMdl(m){_openMdlCommon(m);}

// ── 토스트 알림 ───────────────────────────────────────────────────
function _filoToast(msg, duration){
  duration = duration || 2500;
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
    'background:rgba(0,0,0,.85);color:#fff;padding:10px 20px;border-radius:20px;' +
    'font-size:14px;font-weight:600;z-index:9999;white-space:nowrap;' +
    'animation:fadeIn .2s ease;pointer-events:none;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, duration);
}

// ── 날짜 유틸 (order.js, filo-order-common.js 공용) ──
function _today(){return new Date().toISOString().slice(0,10);}
function _nowISO(){return new Date().toISOString();}
function _toDateStr(iso){return iso?iso.slice(0,10):'';}
function _monthStr(){return new Date().toISOString().slice(0,7);}
