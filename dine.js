/**
 * @module      dine.js
 * ══════════════════════════════════════════════════════
 * 역할: DINE 외식업 특화 플랫폼 메인 (dine.ne.kr)
 *
 * 저장 컬렉션 (FILO와 공유 Firestore):
 *   filo_orders   — 주문 (실시간 매출 집계)
 *   filo_sales    — 매출 내역
 *   filo_members  — 회원 CRM
 *   filo_bookings — 예약
 *   filo_tables   — 테이블 현황
 *
 * DINE 전용 컬렉션:
 *   dine_reviews   — 리뷰·별점
 *   dine_waiting   — 웨이팅 대기열
 *   dine_delivery  — 배달 주문
 *
 * 연동:
 *   DONWAY (donway.ai.kr) — 직원 급여·정산 자동화
 *   FILO (filo.ai.kr)     — QR 주문·재고·출퇴근
 *   Firebase Firestore     — 실시간 데이터 공유
 *
 * FCM 발송:
 *   주문 접수 → 사장님 FCM (type: 'pos')
 *   배달 완료 → 고객 FCM (type: 'receipt')
 *
 * 업종별 도메인:
 *   dine.ne.kr        — 기본
 *   *.dine.ne.kr      — 업종별 서브도메인
 *
 * 주요 함수:
 *   _dineInit()           — DINE 초기화 (slug 인식)
 *   _dineRenderDashboard() — 매출 대시보드
 *   _dineRenderWaiting()   — 웨이팅 관리
 *   _dineRenderReviews()   — 리뷰 관리
 * ══════════════════════════════════════════════════════
 */

// ── 날짜 유틸 (filo-common.js 미로드 환경용) ──────────────────────────────────
function _today(){return _today();}
function _nowISO(){return _nowISO();}
function _toDateStr(iso){return iso?iso.slice(0,10):'';}
function _monthStr(){return _monthStr();}

firebase.initializeApp({
 apiKey:'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
 authDomain:'filo.ai.kr',
 projectId:'mbti-logistics',
 storageBucket:'mbti-logistics.appspot.com',
 messagingSenderId:'862900137209',
 appId:'1:862900137209:web:filoapp'
});
var _db   = firebase.firestore();
var _auth = firebase.auth();
var _CU   = {};
// 로그인 상태 영구 유지 (새로고침·브라우저 재시작 후에도 유지)
_auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function(){});


var MIN_WAGE = 10320;
var DINE_FCM_VAPID = 'BEl62iUYgUivxIkv69yViEuiBIa40Lf1WvVB_QPL-nBelGT5LbwzMvCwMmS_-ZxCjPIe4i7E6y2bQf5zZ7X0';
function _dineInitFCM(did){
  try{
    if(!firebase.messaging) return;
    var msg=firebase.messaging();
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/firebase-messaging-sw.js').then(function(reg){
        msg.getToken({vapidKey:DINE_FCM_VAPID,serviceWorkerRegistration:reg}).then(function(token){
          if(!token) return;
          _db.collection('companies').doc(did).update({fcmToken:token,fcmTokenUpdatedAt:_nowISO()}).catch(function(){});
        }).catch(function(){});
      }).catch(function(){});
    }
    msg.onMessage(function(payload){
      var b=payload.notification&&payload.notification.body||'';
      _dineToast('🔔 '+b);
    });
  }catch(e){}
}
function _dineRequestNotifPermission(did){
  if(!('Notification' in window)) return;
  if(Notification.permission==='granted'){ _dineInitFCM(did); }
  else if(Notification.permission!=='denied'){
    Notification.requestPermission().then(function(p){ if(p==='granted') _dineInitFCM(did); });
  }
}
async function _dineSendNotif(did,memberIds,title,body,alimtalkFn){
  var tokens=[];var noTokenIds=[];
  for(var i=0;i<memberIds.length;i++){
    var snap=await _db.collection('members').doc(memberIds[i]).get();
    var d=snap.data()||{};
    var toks=((d.fcmTokens||[]).map(function(t){return t.token||t;})).filter(Boolean);
    if(d.fcmToken) toks.push(d.fcmToken);
    toks=[...new Set(toks)].filter(function(t){return t&&t.length>20;});
    if(toks.length){ tokens=tokens.concat(toks); }
    else { noTokenIds.push(memberIds[i]); }
  }
  if(tokens.length){
    fetch('https://donway.ai.kr/fcm/notify-drivers',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tokens:tokens,title:title,body:body})}).catch(function(){});
  }
  if(noTokenIds.length&&typeof alimtalkFn==='function') alimtalkFn(noTokenIds);
}

function _dineToggleSidebar(){
 var sb=document.getElementById('sidebar');
 if(!sb) return;
 if(sb.classList.contains('open')){
  sb.classList.remove('open');
 } else {
  sb.classList.add('open');
  // 사이드바 외부 클릭 시 닫기 (1회성)
  setTimeout(function(){
   function closeOnOutside(e){
    if(!sb.contains(e.target)){
     sb.classList.remove('open');
     document.removeEventListener('touchstart',closeOnOutside);
     document.removeEventListener('click',closeOnOutside);
    }
   }
   document.addEventListener('touchstart',closeOnOutside);
   document.addEventListener('click',closeOnOutside);
  },100);
 }
}

function _dineEnsureChart(cb){

 if(window.Chart)return cb();
 var s=document.createElement('script');
 s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
 s.onload=cb;document.head.appendChild(s);
}

var INS = {pension:0.0475,health:0.03595,longcare:0.1314,employ:0.009};


var DINE_APIKEY = 'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0';


(function(){
 // ── slug 인식 (URL 기반 딥링크·설정 자동로드에 활용) ──
 if(window.__DINE_SLUG__){
  window._DINE_SLUG=window.__DINE_SLUG__;
 } else {
  var _pp=location.pathname.replace(/^\//, '').split('/');
  var _rsv=['app','login','join','settle','admin','api',''];
  if(_pp[0] && _rsv.indexOf(_pp[0])===-1)
   window._DINE_SLUG=decodeURIComponent(_pp[0]);
 }
 // slug 인식 로그 제거됨
 if(window.__DINE_STORE__){
  var s=window.__DINE_STORE__;
  // 로고 아래 매장명 표시
  var sub=document.querySelector('.login-sub');
  if(sub)sub.textContent=s+' - 외식업 플랫폼';
  // 직원/회원 폼 매장명 자동입력
  setTimeout(function(){
   var sc=document.getElementById('st-code');
   var mc=document.getElementById('mb-reg-code');
   if(sc)sc.value=s;
   if(mc)mc.value=s;
   if(sc)sc.readOnly=true;
   if(mc)mc.readOnly=true;
  },100);
 }
})();

function _dineTab(t){
 ['login','staff','member'].forEach(function(id){
  var pane=document.getElementById('pane-'+id);
  var tab=document.getElementById('tab-'+id);
  if(!pane||!tab)return;
  if(id===t){
   pane.style.display='block';
   tab.style.background='var(--br)';tab.style.color='#fff';
  }else{
   pane.style.display='none';
   tab.style.background='transparent';tab.style.color='var(--t3)';
  }
 });
}


function _dineStaffJoin(){
 var name=document.getElementById('st-name').value.trim();
 var phone=document.getElementById('st-phone').value.trim();
 var code=document.getElementById('st-code').value.trim().toUpperCase();
 var pw=document.getElementById('st-pw').value;
 var err=document.getElementById('st-err');
 if(!name||!phone||!code||pw.length<6){err.textContent='모든 항목을 입력하세요 (비밀번호 6자 이상)';return;}
 err.textContent='처리 중...';
 /* 매장 코드로 companies 조회 */
 fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'platform'},op:'EQUAL',value:{stringValue:'dine'}}},{fieldFilter:{field:{fieldPath:'slug'},op:'EQUAL',value:{stringValue:code.toLowerCase()}}}]}},limit:5}})
 }).then(function(r){return r.json();}).then(function(rows){
  var docs=(rows||[]).filter(function(r){return r.document;});
  if(!docs.length){
   /* companyName 없으면 name 필드로 재시도 */
   return fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'platform'},op:'EQUAL',value:{stringValue:'dine'}}},{fieldFilter:{field:{fieldPath:'name'},op:'EQUAL',value:{stringValue:code}}}]}},limit:5}})
   }).then(function(r){return r.json();});
  }
  return rows;
 }).then(function(rows){
  var docs=(rows||[]).filter(function(r){return r.document;});
  var co=docs[0]&&docs[0].document;
  if(!co){err.textContent='매장을 찾을 수 없습니다. dine.ne.kr/ 뒤 주소를 정확히 입력해주세요';return;}
  var did=co.name.split('/').pop();
  var coName=(co.fields.companyName||co.fields.name||{}).stringValue||'';
  /* Firebase Auth 계정 생성 */
  var email=phone.replace(/-/g,'')+'@dine.staff';
  fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+DINE_APIKEY,{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({email:email,password:pw,returnSecureToken:true})
  }).then(function(r){return r.json();}).then(function(d){
   if(d.error){err.textContent='가입 실패: '+(d.error.message==='EMAIL_EXISTS'?'이미 가입된 연락처입니다':d.error.message);return;}
   /* members 컬렉션에 저장 */
   fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/members/'+d.localId,{
    method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+d.idToken},
    body:JSON.stringify({fields:{
     uid:{stringValue:d.localId},dealerId:{stringValue:did},
     name:{stringValue:name},phone:{stringValue:phone},
     companyName:{stringValue:coName},role:{stringValue:'staff'},
     platform:{stringValue:'dine'},status:{stringValue:'active'},
     createdAt:{stringValue:_nowISO()}
    }})
   }).then(function(){
    err.style.color='#22c55e';err.textContent='✅ 가입 완료! 로그인해주세요';
    setTimeout(function(){_dineTab('login');},1500);
   });
  });
 }).catch(function(e){err.textContent='오류: '+e.message;});
}


function _dineMemberJoin(){
 var name=document.getElementById('mb-reg-name').value.trim();
 var phone=document.getElementById('mb-reg-phone').value.trim();
 var birth=document.getElementById('mb-reg-birth').value;
 var code=document.getElementById('mb-reg-code').value.trim().toUpperCase();
 var err=document.getElementById('mb-reg-err');
 if(!name||!phone||!code){err.textContent='이름, 연락처, 매장 코드를 입력하세요';return;}
 err.textContent='처리 중...';
 fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'platform'},op:'EQUAL',value:{stringValue:'dine'}}},{fieldFilter:{field:{fieldPath:'slug'},op:'EQUAL',value:{stringValue:code.toLowerCase()}}}]}},limit:5}})
 }).then(function(r){return r.json();}).then(function(rows){
  var docs=(rows||[]).filter(function(r){return r.document;});
  var co=docs[0]&&docs[0].document;
  if(!co){err.textContent='매장을 찾을 수 없습니다. dine.ne.kr/ 뒤 주소를 정확히 입력해주세요';return;}
  var did=co.name.split('/').pop();
  /* filo_customers에 저장 */
  fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/filo_customers',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({fields:{
    dealerId:{stringValue:did},name:{stringValue:name},
    phone:{stringValue:phone},birth:{stringValue:birth},
    point:{integerValue:0},stamp:{integerValue:0},
    grade:{stringValue:'일반'},platform:{stringValue:'dine'},
    createdAt:{stringValue:_nowISO()}
   }})
  }).then(function(){
   err.style.color='#22c55e';err.textContent='✅ 등록 완료!';
   setTimeout(function(){
    document.getElementById('mb-reg-name').value='';
    document.getElementById('mb-reg-phone').value='';
    document.getElementById('mb-reg-birth').value='';
    document.getElementById('mb-reg-code').value='';
    err.textContent='';
   },2000);
  });
 }).catch(function(e){err.textContent='오류: '+e.message;});
}


function _dineShowRegister(){
 var box=document.querySelector('.login-box');
 box.innerHTML='<div class="login-logo">DINE</div>'+
  '<div class="login-sub" style="margin-bottom:20px">회원가입</div>'+
  '<div class="input-group" style="text-align:left"><label>매장명 *</label><input id="rg-store" class="inp" placeholder="홍길동 치킨"></div>'+
  '<div class="input-group" style="text-align:left"><label>이메일 *</label><input id="rg-email" class="inp" type="email" placeholder="example@email.com"></div>'+
  '<div class="input-group" style="text-align:left"><label>비밀번호 * (6자 이상)</label><input id="rg-pw" class="inp" type="password" placeholder="비밀번호"></div>'+
  '<div class="input-group" style="text-align:left"><label>연락처</label><input id="rg-phone" class="inp" type="tel" placeholder="010-0000-0000"></div>'+
  '<button class="btn btn-primary" style="width:100%;padding:12px;font-size:14px;margin-top:4px" onclick="_dineRegister()">가입하기</button>'+
  '<div id="rg-err" style="font-size:11px;color:var(--rd);margin-top:8px;min-height:16px"></div>'+
  '<div style="border-top:1px solid var(--bd);margin-top:14px;padding-top:12px;text-align:center">'+
  '<span style="font-size:12px;color:var(--t3)">이미 계정이 있으신가요?</span>'+
  '<button onclick="location.reload()" style="background:none;border:none;color:var(--br);font-size:12px;font-weight:700;cursor:pointer;margin-left:6px">로그인</button>'+
  '</div>';
}

function _dineRegister(){
 var store=document.getElementById('rg-store').value.trim();
 var email=document.getElementById('rg-email').value.trim();
 var pw=document.getElementById('rg-pw').value;
 var phone=document.getElementById('rg-phone').value.trim();
 var err=document.getElementById('rg-err');
 if(!store){err.textContent='매장명을 입력하세요';return;}
 if(!email){err.textContent='이메일을 입력하세요';return;}
 if(pw.length<6){err.textContent='비밀번호는 6자 이상이어야 합니다';return;}
 err.textContent='가입 중...';
 fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+DINE_APIKEY,{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:email,password:pw,returnSecureToken:true})
 }).then(function(r){return r.json();}).then(function(d){
  if(d.error){err.textContent='가입 실패: '+(d.error.message==='EMAIL_EXISTS'?'이미 사용중인 이메일입니다':d.error.message);return;}
  /* companies 컬렉션에 매장 정보 저장 */
  fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/companies/'+d.localId,{
   method:'PATCH',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+d.idToken},
   body:JSON.stringify({fields:{
    uid:{stringValue:d.localId},
    dealerId:{stringValue:d.localId},
    companyName:{stringValue:store},
    name:{stringValue:store},
    email:{stringValue:email},
    phone:{stringValue:phone},
    platform:{stringValue:'dine'},
    createdAt:{stringValue:_nowISO()},
    status:{stringValue:'active'}
   }})
  }).then(function(){
   err.style.color='var(--gr)';
   err.textContent='✅ 가입 완료! 로그인해주세요';
   setTimeout(function(){location.reload();},1500);
  });
 }).catch(function(e){err.textContent='네트워크 오류: '+e.message;});
}
var _dineToken  = null;

function _dineLogin(){
 var email = document.getElementById('li-email').value.trim();
 var pw    = document.getElementById('li-pw').value;
 var err   = document.getElementById('li-err');
 if(!email||!pw){err.textContent='이메일과 비밀번호를 입력하세요';return;}
 err.textContent='로그인 중...';
 fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+DINE_APIKEY,{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:email,password:pw,returnSecureToken:true})
 }).then(function(r){return r.json();}).then(function(d){
  if(d.error){
   var msg=d.error.message||'';
   err.textContent=msg==='INVALID_PASSWORD'||msg==='EMAIL_NOT_FOUND'?'이메일 또는 비밀번호가 올바르지 않습니다':'로그인 실패: '+msg;
   return;
  }
  err.textContent='';
  _dineToken = d.idToken;
  var _lid = d.localId; var _lemail = d.email;
  /* Firestore REST API로 companies 조회 */
  fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery',{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+d.idToken},
   body:JSON.stringify({structuredQuery:{from:[{collectionId:'companies'}],where:{fieldFilter:{field:{fieldPath:'uid'},op:'EQUAL',value:{stringValue:_lid}}},limit:1}})
  }).then(function(r){return r.json();}).then(function(rows){
   var co=null;
   if(rows&&rows[0]&&rows[0].document){
    var f=rows[0].document.fields||{};
    co={name:(f.companyName&&f.companyName.stringValue)||(f.name&&f.name.stringValue)||''};
   }
   if(co){
    // 매장주 로그인
    _CU={uid:_lid,email:_lemail,dealerId:_lid,name:(co&&co.name)||_lemail.split('@')[0],company:co,role:'owner'};
    _dineAfterLogin();
   } else {
    // 직원 로그인 시도 - members 컬렉션 조회
    fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/members/'+_lid,{
     headers:{'Authorization':'Bearer '+d.idToken}
    }).then(function(r){return r.json();}).then(function(mem){
     if(mem&&mem.fields&&mem.fields.role&&mem.fields.role.stringValue==='staff'){
      var mf=mem.fields;
      _CU={
       uid:_lid,email:_lemail,
       dealerId:(mf.dealerId&&mf.dealerId.stringValue)||_lid,
       name:(mf.name&&mf.name.stringValue)||_lemail.split('@')[0],
       role:'staff',
       staffId:_lid,
       part:(mf.part&&mf.part.stringValue)||'',
       phone:(mf.phone&&mf.phone.stringValue)||''
      };
      _dineAfterLogin();
     } else {
      _CU={uid:_lid,email:_lemail,dealerId:_lid,name:_lemail.split('@')[0],role:'owner'};
      _dineAfterLogin();
     }
    }).catch(function(){
     _CU={uid:_lid,email:_lemail,dealerId:_lid,name:_lemail.split('@')[0],role:'owner'};
     _dineAfterLogin();
    });
   }
  }).catch(function(){
   _CU={uid:_lid,email:_lemail,dealerId:_lid,name:_lemail.split('@')[0],company:null};
   if(co){
    // 매장주 로그인
    _CU.role='owner';
    _dineAfterLogin();
   } else {
    // 직원 로그인 시도
    fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/members/'+_CU.uid,{
     headers:{'Authorization':'Bearer '+d.idToken}
    }).then(function(r2){return r2.json();}).then(function(mem){
     if(mem&&mem.fields&&(mem.fields.role||{}).stringValue==='staff'){
      var mf=mem.fields;
      _CU.role='staff';
      _CU.staffId=_CU.uid;
      _CU.dealerId=(mf.dealerId&&mf.dealerId.stringValue)||_CU.uid;
      _CU.part=(mf.part&&mf.part.stringValue)||'';
      _CU.phone=(mf.phone&&mf.phone.stringValue)||'';
      _CU.name=(mf.name&&mf.name.stringValue)||_CU.name;
     } else {
      _CU.role='owner';
     }
     _dineAfterLogin();
    }).catch(function(){_CU.role='owner';_dineAfterLogin();});
   }
  });
 }).catch(function(e){err.textContent='네트워크 오류: '+e.message;});
}
document.getElementById('li-pw').addEventListener('keydown',function(e){if(e.key==='Enter')_dineLogin();});

function _dineGoFiloPage(page){
 var slug=(_CU&&_CU.dineSlug)||'';
 var base=slug?'https://filo.ai.kr/'+encodeURIComponent(slug):'https://filo.ai.kr/app';
 window.open(base+'#'+page,'_blank');
}

function _dineGoFilo(){
 var slug=(_CU&&_CU.dineSlug)||(_CU&&_CU.dealerId)||'';
 var storeName=(_CU&&_CU.companyName)||(_CU&&_CU.name)||'';
 // slug 있으면 filo.ai.kr/slug, 없으면 filo.ai.kr/app
 var url=slug?'https://filo.ai.kr/'+encodeURIComponent(slug):'https://filo.ai.kr/app';
 window.open(url,'_blank');
}

function _dineLogout(){
 if(!confirm('로그아웃하시겠습니까?'))return;
 _dineToken=null; _CU={};
 document.getElementById('login-wrap').style.display='flex';
 document.getElementById('app-wrap').style.display='none';
}

/* onAuthStateChanged는 REST 로그인 시 트리거 안 됨 - 로그아웃 감지용으로만 유지 */
_auth.onAuthStateChanged(function(u){
 if(u){
  /* SDK 로그인 세션 복원 시 (페이지 새로고침 등) - .ne.kr에서는 보통 미실행 */
  if(_CU && _CU.uid) return; /* REST 로그인 후 중복 방지 */
  _db.collection('companies').where('uid','==',u.uid).limit(1).get()
   .then(function(s){
    var co = s.empty ? null : s.docs[0].data();
    _CU = {uid:u.uid,email:u.email,dealerId:u.uid,name:(co&&co.name)||u.email.split('@')[0],company:co};
    document.getElementById('login-wrap').style.display='none';
    var aw=document.getElementById('app-wrap');aw.style.display='flex';
    document.getElementById('tb-user-name').textContent=_CU.name;
    _dinePage('dashboard',document.querySelector('.nav-item'));
    _dineUpdateSidebar();
    _dineWatchAttend();
   });
 } else {
  document.getElementById('login-wrap').style.display='flex';
  document.getElementById('app-wrap').style.display='none';
 }
});


function _dineToggleGroup(titleEl){
  titleEl.classList.toggle('collapsed');
  var items=titleEl.nextElementSibling;
  if(items&&items.classList.contains('nav-group-items')){
    items.classList.toggle('collapsed');
  }
}
function _dinePage(p,el){
 document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
 if(el)el.classList.add('active');
 var c=document.getElementById('content');
 if(p==='dashboard') _dineDashboard(c);
 else if(p==='staff')    _dineStaff(c);
 else if(p==='attend')   _dineAttend(c);
 else if(p==='payroll')  _dinePayroll(c);
 else if(p==='payslip')  _dinePayslip(c);
 else if(p==='sales')    _dineSales(c);
 else if(p==='delivery') _dineDelivery(c);
 else if(p==='settle')   _dineSettle(c);
 else if(p==='analytics') _dineAnalytics(c);
 else if(p==='table')    _dineTable(c);
 else if(p==='orders')   _dineOrders(c);
 else if(p==='schedule') _dineSchedule(c);
 else if(p==='cost')     _dineCost(c);
 else if(p==='tax')      _dineTax(c);
 else if(p==='member')   _dineMember(c);
 else if(p==='reservation') _dineReservation(c);
 else if(p==='store')    _dineStore(c);
 else if(p==='alimtalk') _dineAlimtalk(c);
}


var _attendUnsub=null;
/* ── REST API 헬퍼 ── */
function _firestoreQuery(collection, filters, token){
 var filterList=filters.map(function(f){
  return {fieldFilter:{field:{fieldPath:f.field},op:f.op||'EQUAL',value:{stringValue:f.value}}};
 });
 var query=filterList.length===1
  ?{fieldFilter:filterList[0].fieldFilter}
  :{compositeFilter:{op:'AND',filters:filterList}};
 return fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents:runQuery',{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':'Bearer '+(token||_dineToken||'')},
  body:JSON.stringify({structuredQuery:{from:[{collectionId:collection}],where:query}})
 }).then(function(r){return r.json();}).then(function(rows){
  return (rows||[]).filter(function(r){return r.document;}).map(function(r){
   var f=r.document.fields||{};
   var data={_id:r.document.name.split('/').pop()};
   Object.keys(f).forEach(function(k){
    data[k]=f[k].stringValue!==undefined?f[k].stringValue:
             f[k].integerValue!==undefined?parseInt(f[k].integerValue):
             f[k].doubleValue!==undefined?parseFloat(f[k].doubleValue):
             f[k].booleanValue!==undefined?f[k].booleanValue:
             f[k].arrayValue?f[k].arrayValue:null;
   });
   return data;
  });
 });
}

/* 실시간 출퇴근 카운트 (REST 폴링) */
var _attendInterval=null;
function _dineDashboard(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px';
 hdr.innerHTML='<div><div class="page-title">📊 오늘 현황</div><div class="page-sub" id="dash-date"></div></div>';
 var now=new Date();
 wrap.appendChild(hdr);

 var kpi=document.createElement('div');
 kpi.className='kpi-grid';
 [{id:'kpi-sales',label:'오늘 매출',icon:'💰',color:'#38bdf8'},
  {id:'kpi-profit',label:'오늘 순이익',icon:'📈',color:'#22c55e'},
  {id:'kpi-margin',label:'마진율',icon:'📊',color:'#a78bfa'},
  {id:'kpi-orders',label:'주문 건수',icon:'🛒',color:'#8b5cf6'},
  {id:'kpi-staff',label:'출근 인원',icon:'👥',color:'#38bdf8'},
  {id:'kpi-labor',label:'인건비율',icon:'💼',color:'#f59e0b'}
 ].forEach(function(k){
  var card=document.createElement('div');
  card.className='kpi-card';
  card.style.borderTop='2px solid '+k.color;
  card.innerHTML='<div class="kpi-label">'+k.icon+' '+k.label+'</div>'+
   '<div class="kpi-val" id="'+k.id+'" style="color:'+k.color+'">-</div>'+
   '<div class="kpi-sub" id="'+k.id+'-sub">로딩중</div>';
  kpi.appendChild(card);
 });
 wrap.appendChild(kpi);

 var grid=document.createElement('div');
 grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px';
 var attCard=document.createElement('div');
 attCard.className='card';
 attCard.innerHTML='<div class="sec-title" style="margin-bottom:10px"><span class="attend-live"><span class="live-dot"></span>실시간 출퇴근</span></div>'+
  '<div id="dash-attend-list"><div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">⏳ 로딩중</div></div>';
 grid.appendChild(attCard);
 var lawCard=document.createElement('div');
 lawCard.className='card';
 lawCard.innerHTML='<div class="sec-title" style="margin-bottom:10px">⚖️ 근로법 알림</div>'+
  '<div id="dash-law-list"><div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">⏳ 로딩중</div></div>';
 grid.appendChild(lawCard);
 wrap.appendChild(grid);
 el.appendChild(wrap);

 var days=['일','월','화','수','목','금','토'];
 document.getElementById('dash-date').textContent=
  now.getFullYear()+'년 '+(now.getMonth()+1)+'월 '+now.getDate()+'일 ('+days[now.getDay()]+')';

 var today=now.toISOString().slice(0,10);
 _dineLoadDashboard(did,today);
}

function _dineWatchAttend(){
 if(_attendInterval)clearInterval(_attendInterval);
 if(window._dineAttendUnsub)window._dineAttendUnsub();
 var today=_today();
 var did=_CU&&_CU.dealerId;
 if(!did||!_db)return;
 window._dineAttendUnsub=_db.collection('attendance')
  .where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(snap){
   var ins={},outs={};
   snap.forEach(function(doc){var d=doc.data();if(d.type==='in')ins[d.memberId]=d;else outs[d.memberId]=d;});
   var working=Object.keys(ins).filter(function(id){return !outs[id];}).length;
   var el=document.getElementById('tb-attend-cnt');
   if(el)el.textContent=working+'명 출근중';
   var se=document.getElementById('kpi-staff');
   if(se)se.textContent=working+'명';
  },function(e){console.warn('attend:',e);});
 // 폴링은 fallback으로만
 function loadAttend(){
 function loadAttend(){
  var today=_today();
  _firestoreQuery('attendance',[{field:'dealerId',value:_CU.dealerId},{field:'date',value:today}])
  .then(function(docs){
   var ins={},outs={};
   docs.forEach(function(d){if(d.type==='in')ins[d.memberId]=d;else outs[d.memberId]=d;});
   var working=Object.keys(ins).filter(function(id){return !outs[id];}).length;
   var el=document.getElementById('tb-attend-cnt');
   if(el)el.textContent=working+'명 출근중';
  }).catch(function(){});
 }
 loadAttend();
 _attendInterval=setInterval(loadAttend,60000);
}

function _dineLoadDashboard(did,today){
 if(window._dineSalesUnsub)window._dineSalesUnsub();
 var costMap={};
 _db.collection('menu_costs').where('dealerId','==',did).get()
  .then(function(cs){cs.forEach(function(doc){var d=doc.data();if(d.name)costMap[d.name]=+d.cost||0;});})
  .catch(function(){});
 // filo_sales 실시간 onSnapshot
 window._dineSalesUnsub=_db.collection('filo_sales')
  .where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(salesSnap){
  Promise.all([
   _db.collection('attendance').where('dealerId','==',did).where('date','==',today).get(),
   _db.collection('members').where('dealerId','==',did).get()
  ]).then(function(results){
  var attSnap=results[0],memSnap=results[1];
  var atts=[],mems=[];
  attSnap.forEach(function(doc){atts.push(Object.assign({_id:doc.id},doc.data()));});
  memSnap.forEach(function(doc){mems.push(Object.assign({_id:doc.id},doc.data()));});
  var sales=[];
  salesSnap.forEach(function(doc){sales.push(Object.assign({_id:doc.id},doc.data()));});

  /* 매출 + 원가 */
  var totalSales=0,orderCnt=0,totalCost=0;
  sales.forEach(function(d){
   if(d.status!=='cancelled'){
    totalSales+=parseInt(d.total)||0;
    orderCnt++;
    (d.items||[]).forEach(function(it){totalCost+=(costMap[it.name]||0)*(it.qty||1);});
   }
  });
  var todayProfit=totalSales-totalCost;
  var marginRate=totalSales>0?Math.round(todayProfit/totalSales*100):0;

  /* 출퇴근 */
  var ins={},outs={};
  atts.forEach(function(d){if(d.type==='in')ins[d.memberId]=d;else outs[d.memberId]=d;});
  var working=Object.keys(ins).filter(function(id){return !outs[id];});
  var worked=Object.keys(outs).length;

  /* 인건비 추산 */
  var estLabor=0;
  atts.forEach(function(d){
   if(d.type==='out'&&ins[d.memberId]){
    var h=(new Date(d.time)-new Date(ins[d.memberId].time))/3600000;
    estLabor+=Math.round(h*MIN_WAGE);
   }
  });
  var laborRate=totalSales>0?Math.round(estLabor/totalSales*100):0;

  /* KPI */
  _dineCountUp('kpi-sales',totalSales,'₩','');
  var ePr=document.getElementById('kpi-profit');
  if(ePr){_dineCountUp('kpi-profit',Math.max(0,todayProfit),'₩','');ePr.style.color=todayProfit>=0?'#22c55e':'#ef4444';}
  var eMg=document.getElementById('kpi-margin');
  if(eMg){eMg.textContent=marginRate+'%';eMg.style.color=marginRate>=60?'#22c55e':marginRate>=40?'#f59e0b':'#ef4444';}
  _dineCountUp('kpi-orders',orderCnt,'','건');
  var se=document.getElementById('kpi-staff');if(se)se.textContent=working.length+'명';
  var lr=document.getElementById('kpi-labor');if(lr)lr.textContent=laborRate+'%';
  var ss=document.getElementById('kpi-sales-sub');if(ss)ss.textContent='주문 '+orderCnt+'건';
  var os=document.getElementById('kpi-orders-sub');if(os)os.textContent='평균 ₩'+(orderCnt?Math.round(totalSales/orderCnt).toLocaleString():0);
  var ws=document.getElementById('kpi-staff-sub');if(ws)ws.textContent='오늘 총 '+(working.length+worked)+'명 근무';
  var ls=document.getElementById('kpi-labor-sub');if(ls)ls.textContent='추산 ₩'+estLabor.toLocaleString();

  /* 출퇴근 리스트 */
  var memMap={};
  mems.forEach(function(m){memMap[m._id]=m;});
  var attList=document.getElementById('dash-attend-list');
  if(attList){
   var allIds=[...new Set([...Object.keys(ins),...Object.keys(outs)])];
   if(!allIds.length){attList.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">오늘 출근 기록 없음</div>';}
   else{
    attList.innerHTML=allIds.map(function(id){
     var m=memMap[id]||{};
     var inT=ins[id]?new Date(ins[id].time).toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):'';
     var outT=outs[id]?new Date(outs[id].time).toLocaleTimeString('ko',{hour:'2-digit',minute:'2-digit'}):'';
     var isWorking=ins[id]&&!outs[id];
     var partColor={'kitchen':'#ef4444','hall':'#38bdf8'}[m.part]||'#a78bfa';
     return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)">'+
      '<div style="width:32px;height:32px;border-radius:50%;background:'+partColor+'22;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">'+
      (m.part==='kitchen'?'👨‍🍳':'🧑‍💼')+'</div>'+
      '<div style="flex:1">'+
      '<div style="font-size:13px;font-weight:700">'+(m.name||id)+'</div>'+
      '<div style="font-size:10px;color:var(--t3)">'+(m.role||'')+' · '+inT+(outT?' → '+outT:'')+'</div>'+
      '</div>'+
      '<span style="font-size:10px;font-weight:700;color:'+(isWorking?'#22c55e':'var(--t3)')+'">'+
      (isWorking?'● 근무중':'퇴근')+'</span></div>';
    }).join('');
   }
  }

  /* 근로법 알림 */
  _dineCheckLaborLaw(did,mems,atts);
  }).catch(function(e){console.warn('dashboard:',e);});
 },function(e){console.warn('sales:',e);});
}

function _dineCheckLaborLaw(did,mems,atts){
 var lawList=document.getElementById('dash-law-list');
 if(!lawList)return;
 var alerts=[];
 var now=new Date();
 mems.forEach(function(m){
  if(!m.hireDate)return;
  var hire=new Date(m.hireDate);
  var months=Math.floor((now-hire)/(30*24*3600*1000));
  if(months>0&&months<=11&&m.payType==='hourly')
   alerts.push({type:'yl',icon:'📅',msg:(m.name||'직원')+'님 입사 '+months+'개월 — 연차 '+Math.min(months,11)+'일'});
  if(months===12)
   alerts.push({type:'gr',icon:'💼',msg:(m.name||'직원')+'님 1년 근속 — 퇴직금 발생'});
  if(m.payType==='hourly'&&parseInt(m.hourlyWage)<MIN_WAGE)
   alerts.push({type:'rd',icon:'⚠️',msg:(m.name||'직원')+'님 시급 '+m.hourlyWage+'원 — 최저임금 미달!'});
 });
 if(!alerts.length){lawList.innerHTML='<div style="font-size:12px;color:var(--gr);padding:8px">✅ 근로법 이상 없음</div>';return;}
 var colorMap={yl:'rgba(245,158,11,.08)',gr:'rgba(34,197,94,.08)',rd:'rgba(239,68,68,.08)'};
 var borderMap={yl:'rgba(245,158,11,.2)',gr:'rgba(34,197,94,.2)',rd:'rgba(239,68,68,.2)'};
 var textMap={yl:'#f59e0b',gr:'#22c55e',rd:'#ef4444'};
 lawList.innerHTML=alerts.map(function(a){
  return '<div style="background:'+colorMap[a.type]+';border:1px solid '+borderMap[a.type]+';border-radius:8px;padding:8px 10px;font-size:11px;color:'+textMap[a.type]+';margin-bottom:6px">'+a.icon+' '+a.msg+'</div>';
 }).join('');
}

// ── 스케줄 관련 함수 ──


// ── 실시간 급여 계산 ──


function _dineToast(msg){
 var t=document.createElement('div');
 t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--s2);border:1px solid var(--bd2);border-radius:12px;padding:10px 20px;font-size:13px;font-weight:700;z-index:300;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,.4)';
 t.textContent=msg;
 document.body.appendChild(t);
 setTimeout(function(){t.remove();},2500);
}

function _dineCountUp(id,target,prefix,suffix){
 var el=document.getElementById(id);if(!el)return;
 var start=0,step=800/60,inc=target/60;
 var t=setInterval(function(){start+=inc;if(start>=target){start=target;clearInterval(t);}
  el.textContent=prefix+Math.round(start).toLocaleString()+suffix;},step);
}

// util end
}
