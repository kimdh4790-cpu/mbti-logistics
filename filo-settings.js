/**
 * @module      filo-settings.js
 * ══════════════════════════════════════════════════════
 * 역할: 설정 · 구독관리 · 알림톡 · 리뷰답글 · 세금공유 · 공지
 *
 * 의존: filo-common.js
 * ⚠️ 2026-07-15 리팩토링:
 *   _filoAddCategory / _filoDeleteCategory → filo-table.js 로 이동
 *   _toAddItem / _toDecItem → filo-table.js 로 이동
 *   _filoMarginLoadRange → filo-report.js 로 이동
 * ══════════════════════════════════════════════════════
 */
// filo-common.js에서 분리됨 (리팩토링 2026-07-13)

function _filoPageSettings(el){
 var did=_CU.dealerId||_CU.uid;
 var d=_cachedCompanyDoc||{};
 var filoPlan=(_CU&&_CU.filoPlan)?_CU.filoPlan:'trial';
 var filoPlanExpiry=(_CU&&_CU.filoPlanExpiry)?_CU.filoPlanExpiry:'';
 var planLabels={trial:'무료 체험',basic:'베이직',pro:'프로',premium:'프리미엄',franchise_hq:'프랜차이즈'};
 var planPrices={trial:'무료',basic:'문의',pro:'문의',premium:'문의',franchise_hq:'문의'};
 var planLabel=planLabels[filoPlan]||'무료 체험';
 var planPrice=planPrices[filoPlan]||'무료';
 var expiryText=filoPlanExpiry?'만료일: '+filoPlanExpiry:'7일 무료 체험 중';
 el.innerHTML='<div class="slide-up" style="max-width:600px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">설정</div>'+
 /* 구독 현황 카드 */
 '<div class="card" style="margin-bottom:16px">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
 '<h3 style="font-size:16px;font-weight:600;color:var(--tx);margin:0">구독 현황</h3>'+
 '<span style="background:var(--br);color:#000;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">'+planLabel+'</span>'+
 '</div>'+
 '<div style="font-size:22px;font-weight:700;color:var(--tx);margin-bottom:4px">'+planPrice+'</div>'+
 '<div style="font-size:13px;color:var(--t3);margin-bottom:16px">'+expiryText+'</div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
 (filoPlan!=='premium'&&filoPlan!=='franchise_hq'?'<button onclick="_filoGoPage(\'subscription\')" style="flex:1;min-width:120px;padding:10px;background:var(--br);color:#000;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">업그레이드</button>':'')+
 '<button onclick="window.open(\'https://pf.kakao.com/_xjkxnxj\',\'_blank\')" style="flex:1;min-width:100px;padding:10px;background:var(--b3);color:var(--tx);border:1px solid var(--bd);border-radius:8px;font-size:14px;cursor:pointer">해지 문의</button>'+
 '</div>'+
 '</div>'+
 '<div class="card">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:12px">회사 정보</div>'+
 '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">회사명</span>'+
 '<span style="font-size:13px;font-weight:700">'+(d.companyName||d.name||'')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">이메일</span>'+
 '<span style="font-size:13px;font-weight:700">'+(_CU.email||'')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:8px 0">'+
 '<span style="font-size:12px;color:var(--t3)">역할</span>'+
 '<span style="font-size:13px;font-weight:700">'+(_CU.role||'관리자')+'</span></div>'+
 /* 🤖 AI 리뷰 답글 — 자주 쓰는 기능 최상단 */
 '<div class="card" style="margin-top:12px">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:4px">AI 리뷰 답글</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">고객 리뷰를 붙여넣으면 AI가 답글 초안을 작성합니다</div>'+
 '<textarea id="ai-review-input" class="inp" rows="4" placeholder="리뷰 내용을 여기에 붙여넣으세요..." style="width:100%;font-size:13px;resize:vertical;min-height:100px;margin-bottom:10px"></textarea>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'+
 '<div><div style="font-size:11px;color:var(--t3);margin-bottom:4px">플랫폼</div>'+
 '<select id="ai-review-platform" class="inp" style="width:100%;font-size:14px;min-height:44px">'+
 '<option value="네이버">네이버 플레이스</option>'+
 '<option value="카카오맵">카카오맵</option>'+
 '<option value="구글">구글 리뷰</option>'+
 '</select></div>'+
 '<div><div style="font-size:11px;color:var(--t3);margin-bottom:4px">답글 톤</div>'+
 '<select id="ai-review-tone" class="inp" style="width:100%;font-size:14px;min-height:44px">'+
 '<option value="정중한">정중한</option>'+
 '<option value="친근한">친근한</option>'+
 '<option value="간결한">간결한</option>'+
 '</select></div>'+
 '</div>'+
 '<button id="ai-reply-btn" class="btn btn-brand btn-sm" style="width:100%;min-height:44px;font-size:14px" onclick="_filoAiReplyGenerate()">AI 답글 생성</button>'+
 '<div id="ai-reply-result" style="margin-top:10px"></div>'+
 '</div>'+
 /* ⭐ 리뷰 링크 설정 */
 '<div class="card" style="margin-top:12px">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:12px">⭐ 리뷰 링크 설정</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:10px">고객이 결제 후 리뷰를 남길 수 있는 링크를 등록하세요</div>'+
 '<div style="margin-bottom:8px">'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">네이버 플레이스 리뷰 URL</div>'+
 '<input id="review-naver" class="inp" placeholder="https://naver.me/..." value="'+(d.reviewUrlNaver||'')+'" style="width:100%;font-size:12px">'+
 '</div>'+
 '<div style="margin-bottom:12px">'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">카카오맵 리뷰 URL</div>'+
 '<input id="review-kakao" class="inp" placeholder="https://place.map.kakao.com/..." value="'+(d.reviewUrlKakao||'')+'" style="width:100%;font-size:12px">'+
 '</div>'+
 '<button class="btn btn-brand btn-sm" onclick="_filoSaveReviewUrls()">저장</button>'+
 '</div>'+
 /* 🎨 업종별 테마 — 매장별 독립 적용 */
 '<div class="card" style="margin-top:12px">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:12px">매장 테마</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:10px">업종을 고르면 색상이 자동 적용됩니다. 원하시면 색을 직접 지정할 수도 있습니다.</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">업종</div>'+
 '<select id="set-theme" class="inp" style="width:100%;font-size:12px;margin-bottom:10px" onchange="_filoThemePreview()">'+
 _filoThemeOptions(d.theme||'')+
 '</select>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'+
 '<div><div style="font-size:11px;color:var(--t3);margin-bottom:4px">포인트 색</div>'+
 '<input id="set-primary" type="color" value="'+(d.primaryColor||'#c9a84c')+'" oninput="_filoThemePreview(1)" style="width:100%;height:38px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;cursor:pointer"></div>'+
 '<div><div style="font-size:11px;color:var(--t3);margin-bottom:4px">배경 색</div>'+
 '<input id="set-bg" type="color" value="'+(d.bgColor||'#07071a')+'" oninput="_filoThemePreview(1)" style="width:100%;height:38px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;cursor:pointer"></div>'+
 '</div>'+
 '<div id="theme-preview" style="border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:10px">'+
 '<div style="font-size:12px;font-weight:800;margin-bottom:8px">미리보기</div>'+
 '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
 '<span id="tp-chip" style="display:inline-block;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;color:#fff">버튼</span>'+
 '<span id="tp-card" style="display:inline-block;padding:6px 14px;border-radius:8px;font-size:12px;border:1px solid var(--bd)">카드</span>'+
 '<span id="tp-accent" style="display:inline-block;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;color:#fff">강조</span>'+
 '</div></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
 '<button class="btn btn-brand btn-sm" onclick="_filoSaveTheme()">테마 저장</button>'+
 '<button class="btn btn-sm" style="background:var(--b3);color:var(--t2)" onclick="_filoResetThemeToIndustry()">업종 기본색으로</button>'+
 '<button class="btn btn-sm" style="background:var(--b3);color:var(--t2)" onclick="_filoSeedDefaultMenusManual()">기본 메뉴 등록</button>'+
 '</div>'+
 '<div style="font-size:10px;color:var(--t3);margin-top:8px">※ 테마는 이 매장에만 적용되며 주문·매장·주방 화면에도 함께 반영됩니다</div>'+
 '</div>'+
 /* 📱 NFC 태그 기록 */
 '<div class="card" style="margin-top:12px">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:4px">NFC 태그 기록</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">NTAG213 NFC 스티커를 폰에 대고 버튼을 누르면 URL이 기록됩니다. 안드로이드 크롬 전용. 아이폰은 URL 복사 후 NFC Tools 앱 사용.</div>'+
 '<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--t2)">테이블 NFC</div>'+
 '<div id="nfc-tables-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px"><div style="font-size:12px;color:var(--t3)">테이블 정보 로딩 중...</div></div>'+
 '<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--t2)">메뉴 NFC <span style="font-weight:400;color:var(--t3)">(특정 메뉴 바로 담기)</span></div>'+
 '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">'+
 '<span style="font-size:11px;color:var(--t3);white-space:nowrap">테이블 번호:</span>'+
 '<input id="nfc-table-num" class="inp" type="number" min="0" placeholder="1" style="width:70px;font-size:12px;padding:6px 8px">'+
 '</div>'+
 '<div id="nfc-menus-list" style="display:flex;flex-direction:column;gap:6px"><div style="font-size:12px;color:var(--t3)">메뉴 정보 로딩 중...</div></div>'+
 '</div>'+
 /* 📊 매출 테스트 데이터 — 개발/데모용 */
 '<div class="card" style="margin-top:12px;border:1px solid rgba(99,102,241,.25)">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:8px;color:#6366f1">매출 테스트 데이터</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">매출분석 화면 확인을 위한 7월(2026-07) 샘플 데이터를 생성합니다. 기존 데이터는 변경되지 않습니다.</div>'+
 '<button id="seed-sales-btn" class="btn btn-sm" style="background:rgba(99,102,241,.1);color:#6366f1;border:1px solid rgba(99,102,241,.3)" onclick="_filoSeedSalesData()">7월 매출 샘플 데이터 생성</button>'+
 '<div id="seed-sales-result" style="font-size:11px;margin-top:8px"></div>'+
 '</div>'+
 /* 🗑️ 데이터 관리 — 비상시만 사용, 맨 아래 */
 '<div class="card" style="margin-top:12px;border:1px solid rgba(220,38,38,.25)">'+
 '<div style="font-size:13px;font-weight:800;margin-bottom:8px;color:#ef4444">데이터 관리</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">주방화면·주문대기 중복 표시 문제가 있을 때 실행하세요. filo_sales의 테이블 임시 주문 데이터를 삭제합니다.</div>'+
 '<button class="btn btn-sm" style="background:rgba(220,38,38,.1);color:#ef4444;border:1px solid rgba(220,38,38,.3)" onclick="_filoCleanupDupOrders()">중복 주문 데이터 정리</button>'+
 '</div>'+
 '</div></div>';
 _filoThemePreview();
 _filoLoadNFCSection(did);
}

/* 업종 select 옵션 — 코드값은 filo.html #fr-industry / _FILO_THEMES 와 동일 */
function _filoThemeOptions(cur){
 var t=(typeof _FILO_THEMES!=='undefined')?_FILO_THEMES:{};
 var order=['cafe','korean','japanese','chinese','fastfood','izakaya','other'];
 var html='<option value="">업종을 선택하세요</option>';
 order.forEach(function(k){
  var m=t[k]; if(!m)return;
  html+='<option value="'+k+'"'+(cur===k?' selected':'')+'>'+m.emoji+' '+m.label+'</option>';
 });
 return html;
}

/* 미리보기 갱신. custom=1 이면 색상 입력값 우선 */
function _filoThemePreview(custom){
 var sel=document.getElementById('set-theme');
 var pi=document.getElementById('set-primary');
 var bi=document.getElementById('set-bg');
 if(!sel||!pi||!bi)return;
 var key=sel.value||'other';
 var base=(typeof _FILO_THEMES!=='undefined'&&_FILO_THEMES[key])?_FILO_THEMES[key]:{primary:'#c9a84c',bg:'#07071a'};
 if(!custom){ pi.value=base.primary; bi.value=base.bg; }
 var primary=pi.value, bg=bi.value;
 var accent=(typeof _filoShade==='function')?_filoShade(primary,0.25):primary;
 var card  =(typeof _filoShade==='function')?_filoShade(bg,(typeof _filoIsLight==='function'&&_filoIsLight(bg))?-0.04:0.06):bg;
 var box=document.getElementById('theme-preview');
 if(box){ box.style.background=bg; box.style.color=(typeof _filoIsLight==='function'&&_filoIsLight(bg))?'#14141f':'#f0f0ff'; }
 var chip=document.getElementById('tp-chip');   if(chip)chip.style.background=primary;
 var cd=document.getElementById('tp-card');     if(cd)cd.style.background=card;
 var ac=document.getElementById('tp-accent');   if(ac)ac.style.background=accent;
}

function _filoResetThemeToIndustry(){ _filoThemePreview(); _filoToast('업종 기본색으로 되돌렸습니다 (저장하려면 테마 저장)'); }

function _filoSaveTheme(){
 var did=_CU.dealerId||_CU.uid;
 var sel=document.getElementById('set-theme');
 var key=sel?sel.value:'';
 if(!key){_filoToast('업종을 선택하세요');return;}
 var primary=document.getElementById('set-primary').value;
 var bg=document.getElementById('set-bg').value;
 _db.collection('companies').doc(did).update({theme:key,primaryColor:primary,bgColor:bg,updatedAt:_nowISO()})
 .then(function(){
  if(_cachedCompanyDoc){_cachedCompanyDoc.theme=key;_cachedCompanyDoc.primaryColor=primary;_cachedCompanyDoc.bgColor=bg;}
  if(typeof _filoApplyTheme==='function')_filoApplyTheme({theme:key,primaryColor:primary,bgColor:bg});
  // 업종 변경 → 사이드바 탭 즉시 갱신
  if(typeof _buildFiloNav==='function')_buildFiloNav();
  _filoToast('테마가 저장됐어요.');
 }).catch(function(e){_filoToast(e.message);});
}
function _filoNFCWrite(url, btn){
 var origText=btn?btn.textContent:'';
 if(!('NDEFReader' in window)){
  // 아이폰/PC: 클립보드 복사
  if(navigator.clipboard){
   navigator.clipboard.writeText(url).then(function(){
    _filoToast('URL 복사됨 — NFC Tools 앱에 붙여넣기 하세요');
   }).catch(function(){_filoToast('URL: '+url);});
  } else { _filoToast('URL: '+url); }
  return;
 }
 if(btn) btn.textContent='태그에 대세요...';
 var ndef=new NDEFReader();
 ndef.write({records:[{recordType:'url',data:url}]}).then(function(){
  _filoToast('NFC 태그 기록 완료!');
  if(btn) btn.textContent=origText;
 }).catch(function(e){
  _filoToast('NFC 기록 실패: '+e.message);
  if(btn) btn.textContent=origText;
 });
}

function _filoNFCCopy(url){
 if(navigator.clipboard){
  navigator.clipboard.writeText(url).then(function(){_filoToast('URL 복사됨');}).catch(function(){});
 }
}

function _filoLoadNFCSection(did){
 var baseUrl='https://filo.ai.kr/order?d='+encodeURIComponent(did);

 // 테이블 목록 로드
 _db.collection('filo_tables').where('dealerId','==',did).orderBy('tableNum').get().then(function(snap){
  var el=document.getElementById('nfc-tables-list');
  if(!el) return;
  if(snap.empty){el.innerHTML='<div style="font-size:12px;color:var(--t3)">등록된 테이블 없음 — 테이블 관리에서 먼저 추가하세요</div>';return;}
  var rows='';
  snap.forEach(function(doc){
   var d=doc.data();
   var num=d.tableNum||doc.id;
   var name=d.tableName||d.name||('테이블 '+num);
   var url=baseUrl+'&t='+encodeURIComponent(num)+'&name='+encodeURIComponent(name);
   rows+='<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--b3);border-radius:10px">'+
    '<div style="flex:1;min-width:0">'+
    '<div style="font-size:12px;font-weight:700">'+name+'</div>'+
    '<div style="font-size:10px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+url+'</div>'+
    '</div>'+
    '<button class="btn btn-sm" style="white-space:nowrap;font-size:11px;padding:5px 10px" onclick="_filoNFCWrite(\''+url.replace(/'/g,"\\'")+"',this)\">NFC 기록</button>"+
    '<button class="btn btn-sm" style="white-space:nowrap;font-size:11px;padding:5px 10px;background:var(--b3);color:var(--t2);border:1px solid var(--bd)" onclick="_filoNFCCopy(\''+url.replace(/'/g,"\\'")+'\')">복사</button>'+
    '</div>';
  });
  el.innerHTML=rows;
 }).catch(function(){
  var el=document.getElementById('nfc-tables-list');
  if(el) el.innerHTML='<div style="font-size:12px;color:var(--t3)">테이블 로드 실패</div>';
 });

 // 메뉴 목록 로드 — 카테고리별 접기/펼치기
 _db.collection('filo_menus').where('dealerId','==',did).orderBy('category').get().then(function(snap){
  var el=document.getElementById('nfc-menus-list');
  if(!el) return;
  if(snap.empty){el.innerHTML='<div style="font-size:12px;color:var(--t3)">등록된 메뉴 없음</div>';return;}
  var cats={};
  var catOrder=[];
  snap.forEach(function(doc){
   var d=doc.data();
   if(d.forSale===false) return;
   var cat=d.category||'기타';
   if(!cats[cat]){cats[cat]=[];catOrder.push(cat);}
   cats[cat].push({id:doc.id,name:d.name||'',emoji:d.emoji||'🍽',price:d.price||0});
  });
  var html='';
  catOrder.forEach(function(cat,idx){
   var items=cats[cat];
   var cid='nfc-cat-'+idx;
   var itemsHtml=items.map(function(m){
    var safeN=m.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fff;border:1px solid var(--bd);border-radius:10px;margin-top:4px">'+
     '<div style="font-size:18px;width:26px;text-align:center;flex-shrink:0">'+m.emoji+'</div>'+
     '<div style="flex:1;min-width:0">'+
     '<div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+m.name+'</div>'+
     '<div style="font-size:10px;color:var(--t3)">₩'+(m.price||0).toLocaleString()+'</div>'+
     '</div>'+
     '<button id="nfc-m-'+m.id+'" class="btn btn-sm" style="white-space:nowrap;font-size:11px;padding:5px 8px;flex-shrink:0" onclick="_filoNFCWriteMenu(\''+safeN+'\',this)">NFC</button>'+
     '<button class="btn btn-sm" style="white-space:nowrap;font-size:11px;padding:5px 8px;background:var(--b3);color:var(--t2);border:1px solid var(--bd);flex-shrink:0" onclick="_filoNFCCopyMenu(\''+safeN+'\')">복사</button>'+
     '</div>';
   }).join('');
   html+='<div style="margin-bottom:6px">'+
    '<button onclick="(function(b){var c=document.getElementById(\''+cid+'\');var o=c.style.display!==\'none\';c.style.display=o?\'none\':\'block\';b.querySelector(\'.cat-arrow\').textContent=o?\'▼\':\'▲\';})(this)" '+
    'style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--surface2,#F4F0E8);border:1px solid var(--bd);border-radius:10px;cursor:pointer;color:var(--tx);text-align:left">'+
    '<span style="font-size:12px;font-weight:800">'+cat+' <span style="font-size:11px;color:var(--t3);font-weight:400">('+items.length+')</span></span>'+
    '<span class="cat-arrow" style="font-size:10px;color:var(--t3)">▼</span>'+
    '</button>'+
    '<div id="'+cid+'" style="display:none;padding:0 2px">'+itemsHtml+'</div>'+
    '</div>';
  });
  el.innerHTML=html||'<div style="font-size:12px;color:var(--t3)">메뉴 없음</div>';
 }).catch(function(){
  var el=document.getElementById('nfc-menus-list');
  if(el) el.innerHTML='<div style="font-size:12px;color:var(--t3)">메뉴 로드 실패</div>';
 });
}

function _filoNFCMenuUrl(menuName){
 var did=_CU.dealerId||_CU.uid;
 var tNum=(document.getElementById('nfc-table-num')||{}).value||'1';
 return 'https://filo.ai.kr/order?d='+encodeURIComponent(did)+'&t='+encodeURIComponent(tNum)+'&item='+encodeURIComponent(menuName);
}

function _filoNFCWriteMenu(menuName, btn){
 _filoNFCWrite(_filoNFCMenuUrl(menuName), btn);
}

function _filoNFCCopyMenu(menuName){
 _filoNFCCopy(_filoNFCMenuUrl(menuName));
}

function _filoCleanupDupOrders(){
 var did=_CU.dealerId||_CU.uid;
 if(!did){_filoToast('매장 정보를 불러오는 중입니다');return;}
 _filoToast('중복 데이터 정리 중...');
 fetch('/admin/cleanup-dup-orders',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({did:did})
 }).then(function(r){return r.json();})
 .then(function(data){
  if(data.ok){
   _filoToast('정리 완료 — '+data.deleted+'건 삭제됨');
  }else{
   _filoToast('오류: '+(data.error||'알 수 없음'));
  }
 }).catch(function(e){_filoToast('네트워크 오류: '+e.message);});
}
function _filoSaveReviewUrls(){
 var did=_CU.dealerId||_CU.uid;
 var naver=document.getElementById('review-naver')?.value.trim()||'';
 var kakao=document.getElementById('review-kakao')?.value.trim()||'';
 _db.collection('companies').doc(did).update({reviewUrlNaver:naver,reviewUrlKakao:kakao,updatedAt:_nowISO()})
 .then(function(){
  if(_cachedCompanyDoc){_cachedCompanyDoc.reviewUrlNaver=naver;_cachedCompanyDoc.reviewUrlKakao=kakao;}
  _filoToast('리뷰 링크 저장됨');
 }).catch(function(e){_filoToast(e.message);});
}
async function _filoAiReplyGenerate(){
 var reviewText=(document.getElementById('ai-review-input').value||'').trim();
 if(!reviewText){_filoToast('리뷰 내용을 입력하세요');return;}
 var platform=document.getElementById('ai-review-platform').value||'네이버';
 var tone=document.getElementById('ai-review-tone').value||'정중한';
 var btn=document.getElementById('ai-reply-btn');
 var resultDiv=document.getElementById('ai-reply-result');
 var user=firebase.auth().currentUser;
 if(!user){_filoToast('로그인 필요');return;}
 btn.disabled=true; btn.textContent='AI 생성 중...';
 resultDiv.innerHTML='<div style="color:var(--t3);font-size:12px;text-align:center;padding:12px">답글을 작성하는 중입니다...</div>';
 var companyName=(_cachedCompanyDoc&&(_cachedCompanyDoc.companyName||_cachedCompanyDoc.name))||'저희 매장';
 var prompt=companyName+' '+platform+' 리뷰에 달 답글을 작성해주세요.\n\n톤: '+tone+'\n리뷰 내용:\n'+reviewText+'\n\n요구사항:\n- 3~5문장 이내로 간결하게\n- 고객 의견에 공감하고 감사 표현\n- 부정적 내용은 진심으로 사과 후 개선 약속\n- 자연스러운 한국어, 이모티콘 1~2개 포함\n- 답글만 출력 (설명 없이)';
 try{
  var token=await user.getIdToken();
  var resp=await fetch('/api/claude',{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
   body:JSON.stringify({max_tokens:400,messages:[{role:'user',content:prompt}]})
  });
  var data=await resp.json();
  var text=(data.content&&data.content[0]&&data.content[0].text)||'';
  if(!text){_filoToast('AI 응답 없음');resultDiv.innerHTML='';btn.disabled=false;btn.textContent='AI 답글 생성';return;}
  window._filoAiReplyText=text;
  var safe=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  resultDiv.innerHTML='<div style="background:var(--b3);border-radius:10px;padding:12px;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-word">'+safe+'</div>'+
   '<button class="btn btn-sm" style="margin-top:8px;width:100%;min-height:44px;font-size:14px;font-weight:700;background:var(--b3);color:var(--t2);border:1px solid var(--bd)" onclick="_filoAiReplyCopy()">답글 복사</button>';
 }catch(e){
  _filoToast('오류: '+e.message.split('\n')[0]);
  resultDiv.innerHTML='';
 }
 btn.disabled=false; btn.textContent='AI 답글 생성';
}
function _filoAiReplyCopy(){
 var text=window._filoAiReplyText||'';
 if(!text)return;
 if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){_filoToast('답글이 복사됐습니다');});}
 else{_filoToast('복사 실패 — 직접 선택하여 복사하세요');}
}
var _FILO_PLAN_PRICES={basic:29000,pro:59000,premium:99000,franchise_hq:300000};
async function _filoSubscribePlan(planId){
 var price=_FILO_PLAN_PRICES[planId]||29000;
 var uid=(_CU&&(_CU.dealerId||_CU.uid))||'';
 if(!uid){_filoToast('로그인 후 이용해주세요.');return;}
 // Toss SDK 동적 로드
 if(typeof TossPayments==='undefined'){
  await new Promise(function(res,rej){
   var s=document.createElement('script');
   s.src='https://js.tosspayments.com/v1/payment';
   s.onload=res;s.onerror=rej;document.head.appendChild(s);
  });
 }
 // 클라이언트 키 조회
 var ckRes=await fetch('/api/toss-client-key').then(function(r){return r.json();}).catch(function(){return{};});
 var ck=ckRes.clientKey||'';
 if(!ck){_filoToast('결제 설정을 불러올 수 없습니다. 고객센터로 문의해주세요.');return;}
 var orderId='FILO-'+uid.slice(0,8)+'-'+Date.now()+'-'+planId;
 var planNames={basic:'베이직',pro:'프로',premium:'프리미엄',franchise_hq:'프랜차이즈'};
 var companyName=(_CU&&_CU.companyName)||(_CU&&_CU.name)||'FILO 매장';
 try{
  var tp=TossPayments(ck);
  await tp.requestPayment('카드',{
   amount:price,
   orderId:orderId,
   orderName:'FILO '+planNames[planId]+' 구독',
   successUrl:location.origin+'/filo-subscribe-success',
   failUrl:location.origin+'/filo-subscribe-fail',
   customerName:companyName
  });
 }catch(e){
  if(e.code&&e.code!=='USER_CANCEL')_filoToast('결제 오류: '+e.message);
 }
}
function _filoPageSubscription(el){
 if(!el)el=document.getElementById('mg-content')||document.getElementById('page-content');
 if(!el)return;
 var filoPlan=(_CU&&_CU.filoPlan)?_CU.filoPlan:'trial';
 var plans=[
  {id:'basic',name:'베이직',features:['POS·메뉴 관리','QR 주문','DINE 앱 포함','QR 출퇴근']},
  {id:'pro',name:'프로',features:['베이직 전체','AI 매출 예측','급여·근태','재고 관리','예약·웨이팅','다국어 번역'],recommended:true},
  {id:'premium',name:'프리미엄',features:['프로 전체','무제한 AI','회계 연동','멀티 매장','전담 CS']},
  {id:'franchise_hq',name:'프랜차이즈',features:['프리미엄 전체','가맹점 관제','메뉴 일괄 배포','통합 매출 현황']}
 ];
 var checkSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--br)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
 var cards=plans.map(function(p){
  var isCurrent=filoPlan===p.id;
  var isRec=!!p.recommended;
  var featureList=p.features.map(function(f){
   return '<li style="font-size:13px;color:var(--t2);display:flex;align-items:center;gap:6px">'+checkSvg+f+'</li>';
  }).join('');
  var prices={basic:29000,pro:59000,premium:99000,franchise_hq:300000};
  var priceLabel=(prices[p.id]||0).toLocaleString()+'원/월';
  var actionBtn=isCurrent?
   '<div style="padding:10px;text-align:center;border-radius:8px;background:#22c55e20;color:#22c55e;font-size:13px;font-weight:700">현재 플랜</div>':
   '<button onclick="_filoSubscribePlan(\''+p.id+'\')" style="display:block;width:100%;box-sizing:border-box;padding:11px;text-align:center;background:'+(isRec?'var(--br)':'transparent')+';color:'+(isRec?'#fff':'var(--br)')+';border:2px solid var(--br);border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">💳 카드로 구독 ('+priceLabel+')</button>';
  return '<div style="border:'+(isRec?'2px solid var(--br)':'1px solid var(--bd)')+';border-radius:12px;padding:16px;background:'+(isRec?'rgba(244,63,94,.03)':'var(--b3)')+';position:relative">'+
   (isRec?'<span style="position:absolute;top:-10px;right:16px;background:var(--br);color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px">추천</span>':'')+
   '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">'+
   '<div>'+
   '<div style="font-size:16px;font-weight:700;color:var(--tx)">'+p.name+'</div>'+
   '<div style="font-size:13px;color:var(--t3);margin-top:3px">'+priceLabel+' · VAT 별도</div>'+
   '</div>'+
   '</div>'+
   '<ul style="list-style:none;padding:0;margin:0 0 14px;display:flex;flex-direction:column;gap:4px">'+featureList+'</ul>'+
   actionBtn+
   '</div>';
 }).join('');
 el.innerHTML='<div style="padding:20px 0">'+
  '<h2 style="font-size:20px;font-weight:700;color:var(--tx);margin-bottom:8px">요금제 선택</h2>'+
  '<p style="font-size:14px;color:var(--t3);margin-bottom:24px">DINE 직원앱 포함 · 업종·규모별 맞춤 제안</p>'+
  '<div style="display:grid;gap:12px">'+cards+'</div>'+
  '<div style="margin-top:20px;padding:14px;background:rgba(244,63,94,.04);border:1px solid rgba(244,63,94,.15);border-radius:12px;text-align:center">'+
  '<div style="font-size:13px;font-weight:700;color:var(--tx);margin-bottom:6px">요금 문의</div>'+
  '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'+
  '<a href="tel:051-711-3103" style="padding:8px 16px;background:var(--br);color:#fff;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none">전화 051-711-3103</a>'+
  '<a href="mailto:filo-dine@donway.ai.kr" style="padding:8px 16px;border:1px solid var(--bd2);color:var(--t2);border-radius:8px;font-size:12px;font-weight:700;text-decoration:none">이메일 문의</a>'+
  '</div></div>'+
  '</div>';
}
function _filoPageTaxShare(el){
 var did=_CU.dealerId||_CU.uid;
 var d=_cachedCompanyDoc||{};
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 wrap.style.cssText='max-width:700px;margin:0 auto';

 /* 헤더 */
 var hdr=document.createElement('div');
 hdr.style.cssText='margin-bottom:20px';
 hdr.innerHTML='<div class="page-title">세무사 연동</div>'+
  '<div class="page-sub">매출 데이터를 세무사에게 자동 공유합니다</div>';
 wrap.appendChild(hdr);

 /* 현황 카드 */
 var statusCard=document.createElement('div');
 statusCard.className='hero-card';
 statusCard.style.marginBottom='16px';
 statusCard.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1">'+
  '<div><div style="font-size:11px;color:rgba(167,139,250,.7);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">연동 현황</div>'+
  '<div style="font-size:20px;font-weight:900" id="tax-status-txt">설정 안됨</div>'+
  '<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px" id="tax-status-sub">세무사 이메일을 등록하면 매월 매출 리포트를 자동 발송합니다</div>'+
  '</div>'+
  '</div>';
 wrap.appendChild(statusCard);

 /* 세무사 이메일 등록 */
 var card1=document.createElement('div');
 card1.className='card';
 card1.innerHTML='<div class="sec-title" style="margin-bottom:12px">세무사 이메일 등록</div>'+
  '<div style="display:flex;gap:8px;margin-bottom:8px">'+
  '<input id="tax-email-inp" type="email" placeholder="세무사 이메일 주소" style="flex:1;padding:11px 14px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:13px;outline:none">'+
  '<button onclick="_filoTaxSaveEmail()" style="padding:11px 16px;background:var(--br);border:none;border-radius:var(--r);color:#fff;font-size:13px;font-weight:700;cursor:pointer">저장</button>'+
  '</div>'+
  '<div style="font-size:11px;color:var(--t3)">매월 1일 전월 매출 리포트가 자동 발송됩니다</div>';
 wrap.appendChild(card1);

 /* 매출 데이터 공유 설정 */
 var card2=document.createElement('div');
 card2.className='card';
 card2.innerHTML='<div class="sec-title" style="margin-bottom:12px">공유 항목 설정</div>'+
  [
   {id:'tax-share-sales',l:'일별 매출 합계',d:'매일 총 매출액'},
   {id:'tax-share-items',l:'메뉴별 판매량',d:'품목별 판매 내역'},
   {id:'tax-share-pay',l:'결제수단별 내역',d:'카드/현금/간편결제 구분'},
   {id:'tax-share-refund',l:'취소/환불 내역',d:'환불 처리 내역 포함'},
  ].map(function(item){
   return '<div class="stat-row"><div>'+
    '<div style="font-size:13px;font-weight:700">'+item.l+'</div>'+
    '<div style="font-size:11px;color:var(--t3)">'+item.d+'</div>'+
    '</div>'+
    '<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer">'+
    '<input type="checkbox" id="'+item.id+'" checked style="opacity:0;width:0;height:0">'+
    '<span style="position:absolute;inset:0;background:#c9a84c;border-radius:24px;transition:.3s" onclick="this.style.background=this.previousElementSibling.checked?\'#c9a84c\':\'var(--surface3)\'"></span>'+
    '<span style="position:absolute;top:2px;left:2px;width:20px;height:20px;background:#fff;border-radius:50%;transition:.3s"></span>'+
    '</label></div>';
  }).join('');
 wrap.appendChild(card2);

 /* 즉시 리포트 발송 */
 var card3=document.createElement('div');
 card3.className='card';
 card3.innerHTML='<div class="sec-title" style="margin-bottom:12px">즉시 리포트 발송</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
  ['이번달 리포트','지난달 리포트','분기 리포트','연간 리포트'].map(function(t,i){
   return '<button onclick="_filoTaxSendReport(\''+['thisMonth','lastMonth','quarter','year'][i]+'\')" style="padding:12px;background:var(--surface2);border:1px solid var(--bd2);border-radius:var(--r);color:var(--tx);font-size:12px;font-weight:700;cursor:pointer;transition:.2s" onmouseover="this.style.borderColor=\'rgba(201,168,76,.4)\'" onmouseout="this.style.borderColor=\'var(--bd2)\'">'+t+'</button>';
  }).join('')+'</div>';
 wrap.appendChild(card3);

 /* 세금계산서 안내 */
 var card4=document.createElement('div');
 card4.className='card-brand';
 card4.innerHTML='<div style="font-size:13px;font-weight:800;margin-bottom:8px">세금계산서 발행 안내</div>'+
  '<div style="font-size:12px;color:var(--t2);line-height:1.7">'+
  '• POS 결제 내역이 자동으로 세무사에게 공유됩니다<br>'+
  '• 카드 매출은 카드사 자동 집계와 대조 가능합니다<br>'+
  '• DONWAY와 연동 시 부가세 신고 자료를 자동 생성합니다<br>'+
  '• 문의: <a href="tel:051-711-3103" style="color:#a78bfa">051-711-3103</a>'+
  '</div>';
 wrap.appendChild(card4);

 el.appendChild(wrap);

 /* 기존 설정 로드 */
 _db.collection('settings').doc(did+'_tax').get().then(function(snap){
  if(snap.exists){
   var data=snap.data();
   if(data.taxEmail){
    document.getElementById('tax-email-inp').value=data.taxEmail;
    document.getElementById('tax-status-txt').textContent='연동 중';
    document.getElementById('tax-status-sub').textContent=data.taxEmail+' · 매월 자동 발송';
   }
  }
 });
}

function _filoTaxSaveEmail(){
 var email=(document.getElementById('tax-email-inp').value||'').trim();
 if(!email||!email.includes('@')){_filoToast('올바른 이메일을 입력하세요');return;}
 var did=_CU.dealerId||_CU.uid;
 _db.collection('settings').doc(did+'_tax').set({
  dealerId:did,taxEmail:email,updatedAt:_nowISO()
 },{merge:true}).then(function(){
  _filoToast('세무사 이메일이 등록됐습니다');
  document.getElementById('tax-status-txt').textContent='연동 중';
  document.getElementById('tax-status-sub').textContent=email+' · 매월 자동 발송';
 });
}

function _filoPageNotices(el){
 var did=_CU.dealerId||_CU.uid;
 el.innerHTML='<div class="slide-up" style="max-width:700px;margin:0 auto">'+
 '<div style="font-size:17px;font-weight:900;margin-bottom:16px">공지사항</div>'+
 '<div id="notices-list"><div style="text-align:center;padding:30px;color:var(--t3)">로딩 중...</div></div></div>';
 _db.collection('notices').where('dealerId','==',did).orderBy('createdAt','desc').limit(20).get()
 .then(function(snap){
 var el2=document.getElementById('notices-list');if(!el2)return;
 if(snap.empty){el2.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--t3)">공지사항이 없습니다</div>';return;}
 el2.innerHTML=snap.docs.map(function(doc){
 var d=doc.data();
 return '<div class="card" style="margin-bottom:10px">'+
 '<div style="font-size:14px;font-weight:800;margin-bottom:6px">'+esc(d.title||'')+'</div>'+
 '<div style="font-size:12px;color:var(--t3);margin-bottom:8px">'+(d.createdAt||'').slice(0,10)+'</div>'+
 '<div style="font-size:13px;line-height:1.6;white-space:pre-wrap">'+esc(d.content||'')+'</div></div>';
 }).join('');
 }).catch(function(){});
}



var _tableMgmtUnsub=null;










/* ══════════════════════════════════════
   배달 주문 관리 페이지
   배민/쿠팡이츠/요기요 주문 수동 접수
   ══════════════════════════════════════ */

var _toTable=null,_toCart={};

// ── AI 리뷰 답글 생성기 ─────────────────────────────────────────────────────
function _filoPageReviewReply(el){
 var did=_CU&&(_CU.dealerId||_CU.uid)||'';
 el.innerHTML='<div style="max-width:600px;margin:0 auto">'+
  '<div style="font-size:20px;font-weight:900;margin-bottom:4px">AI 리뷰 답글</div>'+
  '<div style="font-size:12px;color:var(--t3);margin-bottom:20px">고객 리뷰를 붙여넣으면 AI가 답글을 자동 생성합니다</div>'+
  '<div style="background:var(--surface2);border:1px solid var(--bd2);border-radius:14px;padding:16px;margin-bottom:12px">'+
  '<div style="font-size:11px;font-weight:700;color:var(--t3);margin-bottom:8px">고객 리뷰</div>'+
  '<textarea id="review-input" placeholder="리뷰 내용을 붙여넣으세요..." style="width:100%;min-height:100px;background:var(--surface3);border:1px solid var(--bd);border-radius:10px;padding:12px;color:var(--tx);font-size:13px;resize:vertical;box-sizing:border-box"></textarea>'+
  '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'+
  '<button onclick="_filoGenReviewReply(1)" style="flex:1;padding:10px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);border-radius:10px;color:#a78bfa;font-weight:700;font-size:12px;cursor:pointer">긍정 답글</button>'+
  '<button onclick="_filoGenReviewReply(0)" style="flex:1;padding:10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:10px;color:#f87171;font-weight:700;font-size:12px;cursor:pointer">부정/개선 답글</button>'+
  '<button onclick="_filoGenReviewReply(2)" style="flex:1;padding:10px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);border-radius:10px;color:#22c55e;font-weight:700;font-size:12px;cursor:pointer">일반 답글</button>'+
  '</div></div>'+
  '<div id="review-result" style="display:none;background:var(--surface2);border:1px solid var(--bd2);border-radius:14px;padding:16px">'+
  '<div style="font-size:11px;font-weight:700;color:var(--t3);margin-bottom:8px">AI 생성 답글</div>'+
  '<textarea id="review-output" style="width:100%;min-height:120px;background:var(--surface3);border:1px solid var(--bd);border-radius:10px;padding:12px;color:var(--tx);font-size:13px;resize:vertical;box-sizing:border-box"></textarea>'+
  '<button onclick="navigator.clipboard.writeText(document.getElementById(\'review-output\').value).then(function(){_filoToast(\'복사됐습니다!\')})" style="width:100%;margin-top:8px;padding:10px;background:var(--br);border:none;border-radius:10px;color:#fff;font-weight:700;font-size:13px;cursor:pointer">복사하기</button>'+
  '</div>'+
  '</div>';
}

async function _filoGenReviewReply(type){
 var review=(document.getElementById('review-input')||{}).value||'';
 if(!review.trim()){_filoToast('리뷰 내용을 입력하세요');return;}
 var typeLabel=type===1?'긍정적이고 감사한':type===0?'사과하고 개선 의지를 보이는':'친절하고 전문적인';
 var compName=(_CU&&_CU.companyName)||'저희 매장';
 var resultEl=document.getElementById('review-result');
 var outputEl=document.getElementById('review-output');
 if(resultEl)resultEl.style.display='block';
 if(outputEl)outputEl.value='AI가 답글을 작성 중입니다...';

 try{
  var res2=await fetch('/api/review-reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({review:review,type:type,compName:compName})});
  var d2=await res2.json();
  if(outputEl)outputEl.value=d2.reply||'답글 생성에 실패했습니다.';
 } catch(e){
  if(outputEl)outputEl.value='답글 생성에 실패했습니다. 잠시 후 다시 시도하세요.';
 }
}

async function _filoSeedSalesData(){
 var did=_CU&&(_CU.dealerId||_CU.uid);
 if(!did){_filoToast('로그인 정보 없음');return;}
 var btn=document.getElementById('seed-sales-btn');
 var resEl=document.getElementById('seed-sales-result');
 if(btn)btn.disabled=true;
 if(resEl)resEl.textContent='생성 중... (30초 내외 소요)';
 try{
  var r=await fetch('/api/seed-sales',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({secret:'filo2026demo',did:did,month:'2026-07'})});
  var d=await r.json();
  if(d.ok){
   if(resEl)resEl.innerHTML='<span style="color:#22c55e">완료: '+d.count+'개 매출 데이터가 생성되었습니다.</span>';
   _filoToast('7월 매출 샘플 데이터 생성 완료! ('+d.count+'건)');
  } else {
   if(resEl)resEl.innerHTML='<span style="color:#ef4444">오류: '+(d.error||JSON.stringify(d))+'</span>';
   _filoToast('생성 실패: '+(d.error||'알 수 없는 오류'));
  }
 } catch(e){
  if(resEl)resEl.innerHTML='<span style="color:#ef4444">오류: '+e.message+'</span>';
  _filoToast('오류: '+e.message);
 } finally {
  if(btn)btn.disabled=false;
 }
}
