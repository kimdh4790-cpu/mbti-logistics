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
function _today(){return new Date().toISOString().slice(0,10);}
function _nowISO(){return new Date().toISOString();}
function _toDateStr(iso){return iso?iso.slice(0,10):'';}
function _monthStr(){return new Date().toISOString().slice(0,7);}

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
 /* Worker API로 매장 slug 조회 (비로그인 허용) */
 fetch('/api/find-company?slug='+encodeURIComponent(code.toLowerCase())+'&platform=dine')
 .then(function(r){return r.json();}).then(function(res){
  if(!res.found){err.textContent='매장을 찾을 수 없습니다. dine.ne.kr/ 뒤 주소를 정확히 입력해주세요';return;}
  var did=res.dealerId;
  var coName=res.companyName||'';
  /* Firebase Auth 계정 생성 */
  var email=phone.replace(/-/g,'')+'@dine.staff';
  fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+DINE_APIKEY,{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({email:email,password:pw,returnSecureToken:true})
  }).then(function(r){return r.json();}).then(function(d){
   if(d.error){err.textContent='가입 실패: '+(d.error.message==='EMAIL_EXISTS'?'이미 가입된 연락처입니다':d.error.message);return;}
   /* members 컬렉션에 저장 — PATCH(upsert)로 직접 지정 경로에 저장 */
   fetch('https://firestore.googleapis.com/v1/projects/mbti-logistics/databases/(default)/documents/members/'+d.localId,{
    method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+d.idToken},
    body:JSON.stringify({fields:{
     uid:{stringValue:d.localId},dealerId:{stringValue:did},
     name:{stringValue:name},phone:{stringValue:phone},
     companyName:{stringValue:coName},role:{stringValue:'staff'},
     platform:{stringValue:'dine'},status:{stringValue:'active'},
     createdAt:{stringValue:_nowISO()}
    }})
   }).then(function(r2){
    if(r2&&r2.ok===false){
     return r2.json().then(function(e){
      err.textContent='저장 오류: '+(e.error&&e.error.message||'members 저장 실패');
     });
    }
    err.style.color='#22c55e';err.textContent='가입 완료! 로그인해주세요';
    setTimeout(function(){_dineTab('login');},1500);
   }).catch(function(e){err.textContent='저장 오류: '+e.message;});
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
 fetch('/api/find-company?slug='+encodeURIComponent(code.toLowerCase()))
 .then(function(r){return r.json();}).then(function(res){
  if(!res.found){err.textContent='매장을 찾을 수 없습니다. dine.ne.kr/ 뒤 주소를 정확히 입력해주세요';return;}
  var did=res.dealerId;
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
   err.style.color='#22c55e';err.textContent='등록 완료!';
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
 // URL 형식 입력 허용: dine.ne.kr/mbti → mbti
 store=store.replace(/^https?:\/\//,'').replace(/^dine\.ne\.kr\//,'').replace(/\/$/,'').trim();
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
   err.textContent='가입 완료! 로그인해주세요';
   setTimeout(function(){location.reload();},1500);
  });
 }).catch(function(e){err.textContent='네트워크 오류: '+e.message;});
}
var _dineToken  = null;

function _dineLogin(){
 var emailRaw = document.getElementById('li-email').value.trim();
 var pw    = document.getElementById('li-pw').value;
 var err   = document.getElementById('li-err');
 if(!emailRaw||!pw){err.textContent='이메일과 비밀번호를 입력하세요';return;}
 // 연락처 입력 시 이메일로 변환 (직원 로그인)
 var email = /^[0-9\-]+$/.test(emailRaw)
  ? emailRaw.replace(/-/g,'')+'@dine.staff'
  : emailRaw;
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
  /* Firebase SDK 인증 동기화 — _db.* 콜렉션 읽기 권한 부여 */
  _auth.signInWithEmailAndPassword(email, pw).catch(function(){});
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
     var mf=mem&&mem.fields||{};
     var isDineStaff=(mf.role&&mf.role.stringValue==='staff')&&
      (mf.platform&&mf.platform.stringValue==='dine');
     if(isDineStaff){
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
      // DONWAY 직원이거나 platform 불일치 → DINE 직원 아님
      err.textContent='DINE 직원 계정이 없습니다. 직원 가입을 먼저 해주세요';
      return;
     }
    }).catch(function(){
     _CU={uid:_lid,email:_lemail,dealerId:_lid,name:_lemail.split('@')[0],role:'owner'};
     _dineAfterLogin();
    });
   }
  }).catch(function(){
   /* companies 조회 실패 시 → 직원으로 폴백 */
   _CU={uid:_lid,email:_lemail,dealerId:_lid,name:_lemail.split('@')[0],role:'owner'};
   _dineAfterLogin();
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
 _auth.signOut().catch(function(){});
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
 // 직원 접근 제한 — 허용되지 않은 페이지 차단
 var staffAllowed=['dashboard','schedule','attend','mypay','payslip'];
 if(_CU&&_CU.role==='staff'&&staffAllowed.indexOf(p)<0) return;
 document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
 if(el)el.classList.add('active');
 var c=document.getElementById('content');
 if(p==='dashboard'){if(_CU&&_CU.role==='staff')_dineStaffDashboard(c);else _dineDashboard(c);}
 else if(p==='staff')    _dineStaff(c);
 else if(p==='attend')   _dineAttend(c);
 else if(p==='mypay')    _dineMyPayroll(c);
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
 else if(p==='crm')      _dineCrm(c);
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

/* 대시보드 아이콘 모음 (Lucide SVG) */
var _DINE_IC={
 sparkle:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L9.27 9.27 3 12l6.27 2.73L12 21l2.73-6.27L21 12l-6.27-2.73z"/></svg>',
 trending:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
 bar2:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
 pct:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
 cart:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
 users:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
 brief:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
 check:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
};

/* 대시보드 스켈레톤 로딩 플레이스홀더 */
function _dineSkelAttend(){
 var rows='';
 for(var i=0;i<3;i++) rows+='<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f3f4f6"><div style="width:32px;height:32px;border-radius:50%;background:#f3f4f6"></div><div style="flex:1"><div style="height:10px;background:#f3f4f6;border-radius:4px;margin-bottom:4px"></div><div style="height:8px;background:#f3f4f6;border-radius:4px;width:60%"></div></div></div>';
 return rows;
}
function _dineSkelLaw(){
 var rows='';
 for(var i=0;i<3;i++) rows+='<div style="padding:8px 0;border-bottom:1px solid #f3f4f6"><div style="height:10px;background:#f3f4f6;border-radius:4px;margin-bottom:4px"></div><div style="height:8px;background:#f3f4f6;border-radius:4px;width:75%"></div></div>';
 return rows;
}

/* 실시간 출퇴근 카운트 (REST 폴링) */
var _attendInterval=null;
function _dineDashboard(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');
 wrap.className='slide-up';
 var now=new Date();
 var days=['일','월','화','수','목','금','토'];

 /* ── 헤더 ── */
 var hdr=document.createElement('div');
 hdr.style.cssText='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:8px';
 hdr.innerHTML=
  '<div>'+
  '<div class="page-title" style="font-size:22px;letter-spacing:-.8px">오늘 현황</div>'+
  '<div class="page-sub" id="dash-date">'+
   now.getFullYear()+'년 '+(now.getMonth()+1)+'월 '+now.getDate()+'일 ('+days[now.getDay()]+')</div></div>'+
  '<div style="display:flex;align-items:center;gap:6px">'+
  '<span class="dine-ai-badge badge-aivo">'+_DINE_IC.sparkle+'AIVO AI</span>'+
  '<div id="dine-live-sales" style="font-size:11px;font-weight:800;color:#22c55e;display:none"></div>'+
  '</div>';
 wrap.appendChild(hdr);

 /* ── KPI 카드 (스켈레톤 → 실데이터) ── */
 var kpiDefs=[
  {id:'kpi-sales',  label:'오늘 매출', color:'#38bdf8', ic:_DINE_IC.trending},
  {id:'kpi-profit', label:'오늘 순이익',color:'#22c55e', ic:_DINE_IC.bar2},
  {id:'kpi-margin', label:'마진율',    color:'#a78bfa', ic:_DINE_IC.pct},
  {id:'kpi-orders', label:'주문 건수', color:'#8b5cf6', ic:_DINE_IC.cart},
  {id:'kpi-staff',  label:'출근 인원', color:'#38bdf8', ic:_DINE_IC.users},
  {id:'kpi-labor',  label:'인건비율',  color:'#f59e0b', ic:_DINE_IC.brief}
 ];
 var kpi=document.createElement('div');
 kpi.className='kpi-grid';
 kpiDefs.forEach(function(k){
  var card=document.createElement('div');
  card.className='kpi-card kpi-lux';
  card.style.borderTop='2px solid '+k.color;
  card.innerHTML=
   '<div style="display:flex;align-items:center;margin-bottom:10px">'+
   '<div class="kpi-ico" style="color:'+k.color+';background:'+k.color+'1a">'+k.ic+'</div>'+
   '</div>'+
   '<div class="kpi-label">'+k.label+'</div>'+
   '<div class="kpi-val skeleton-val" id="'+k.id+'" style="color:'+k.color+'">—</div>'+
   '<div class="kpi-sub skeleton-sub" id="'+k.id+'-sub">&nbsp;</div>';
  kpi.appendChild(card);
 });
 wrap.appendChild(kpi);

 /* ── 하단 그리드 ── */
 var grid=document.createElement('div');
 grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px';

 var attCard=document.createElement('div');
 attCard.className='card';
 attCard.innerHTML=
  '<div class="sec-title" style="margin-bottom:10px;display:flex;align-items:center;gap:8px">'+
  '<span class="dine-ai-badge badge-staffiq">'+_DINE_IC.check+'STAFFIQ</span>'+
  '<span class="attend-live"><span class="live-dot"></span>실시간 출퇴근</span></div>'+
  '<div id="dash-attend-list">'+_dineSkelAttend()+'</div>';
 grid.appendChild(attCard);

 var lawCard=document.createElement('div');
 lawCard.className='card';
 lawCard.innerHTML=
  '<div class="sec-title" style="margin-bottom:10px">⚖️ 근로법 알림</div>'+
  '<div id="dash-law-list">'+_dineSkelLaw()+'</div>';
 grid.appendChild(lawCard);
 wrap.appendChild(grid);

 /* ── AI 오늘의 조언 ── */
 var aiWrap=document.createElement('div');aiWrap.style.marginTop='12px';
 aiWrap.innerHTML=
  '<div class="card" id="dash-ai-card" style="border-left:3px solid #C8A356">'+
  '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'+
  '<div style="width:28px;height:28px;border-radius:8px;background:rgba(200,163,86,.15);display:flex;align-items:center;justify-content:center;color:#C8A356">'+
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L9.27 9.27 3 12l6.27 2.73L12 21l2.73-6.27L21 12l-6.27-2.73z"/></svg>'+
  '</div>'+
  '<span style="font-size:12px;font-weight:800;color:#C8A356">AIVO AI 오늘의 조언</span>'+
  '<span style="flex:1"></span>'+
  '<span style="font-size:10px;color:var(--t3)" id="dash-ai-time"></span>'+
  '</div>'+
  '<div id="dash-ai-tips" style="display:flex;flex-direction:column;gap:8px">'+
  '<div style="height:12px;background:var(--s3);border-radius:6px;width:90%;animation:av2-shim 1.2s ease-in-out infinite"></div>'+
  '<div style="height:12px;background:var(--s3);border-radius:6px;width:75%;animation:av2-shim 1.2s ease-in-out infinite .1s"></div>'+
  '<div style="height:12px;background:var(--s3);border-radius:6px;width:82%;animation:av2-shim 1.2s ease-in-out infinite .2s"></div>'+
  '</div>'+
  '</div>';
 wrap.appendChild(aiWrap);

 /* ── 채널별 실시간 주문 현황 ── */
 var chWrap=document.createElement('div');chWrap.style.marginTop='12px';
 chWrap.innerHTML=
  '<div class="card">'+
  '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'+
  '<span class="attend-live"><span class="live-dot"></span>채널별 실시간 주문</span>'+
  '<span style="flex:1"></span>'+
  '<span style="font-size:10px;color:var(--t3)" id="dash-ch-total"></span>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px" id="dash-ch-grid">'+
  ['테이블','포장','배달'].map(function(n,i){
   var c=['#38bdf8','#22c55e','#f97316'][i];
   return '<div style="border-radius:12px;padding:12px;background:rgba('+['56,189,248','34,197,94','249,115,22'][i]+',.07);border:1px solid rgba('+['56,189,248','34,197,94','249,115,22'][i]+',.18)">'+
    '<div style="font-size:10px;font-weight:700;color:'+c+';margin-bottom:6px">'+n+'</div>'+
    '<div style="font-size:22px;font-weight:900;color:'+c+'" id="ch-cnt-'+i+'">-</div>'+
    '<div style="font-size:9px;color:var(--t3);margin-top:3px" id="ch-sub-'+i+'">건</div>'+
    '</div>';
  }).join('')+
  '</div>'+
  '<div id="dash-ch-list" style="margin-top:12px;display:flex;flex-direction:column;gap:6px"></div>'+
  '</div>';
 wrap.appendChild(chWrap);

 el.appendChild(wrap);

 var today=now.toISOString().slice(0,10);
 _dineLoadDashboard(did,today);
 _dineWatchOrderChannels(did,today);
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
 // onSnapshot이 실시간 업데이트 담당 — 폴링 불필요
}

function _dineLoadDashboard(did,today){
 if(window._dineSalesUnsub)window._dineSalesUnsub();
 var costMap={},atts=[],mems=[];
 // menu_costs·attendance·members 1회 로드 후 filo_sales onSnapshot 시작
 Promise.all([
  _db.collection('menu_costs').where('dealerId','==',did).get(),
  _db.collection('attendance').where('dealerId','==',did).where('date','==',today).get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).catch(function(){return [null,null,null];}).then(function(results){
  if(results[0])results[0].forEach(function(doc){var d=doc.data();if(d.name)costMap[d.name]=+d.cost||0;});
  if(results[1])results[1].forEach(function(doc){atts.push(Object.assign({_id:doc.id},doc.data()));});
  if(results[2])results[2].forEach(function(doc){mems.push(Object.assign({_id:doc.id},doc.data()));});
  window._dineSalesUnsub=_db.collection('filo_sales')
   .where('dealerId','==',did).where('date','==',today)
   .onSnapshot(function(salesSnap){
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
  var ss=document.getElementById('kpi-sales-sub');if(ss){ss.textContent='주문 '+orderCnt+'건';ss.classList.remove('skeleton-sub');}
  var os=document.getElementById('kpi-orders-sub');if(os){os.textContent='평균 ₩'+(orderCnt?Math.round(totalSales/orderCnt).toLocaleString():0);os.classList.remove('skeleton-sub');}
  var ws=document.getElementById('kpi-staff-sub');if(ws){ws.textContent='오늘 총 '+(working.length+worked)+'명 근무';ws.classList.remove('skeleton-sub');}
  var ls=document.getElementById('kpi-labor-sub');if(ls){ls.textContent='추산 ₩'+estLabor.toLocaleString();ls.classList.remove('skeleton-sub');}
  /* margin/labor 스켈레톤 제거 */
  var emg=document.getElementById('kpi-margin');if(emg)emg.classList.remove('skeleton-val');
  var elr=document.getElementById('kpi-labor');if(elr)elr.classList.remove('skeleton-val');
  var epf=document.getElementById('kpi-profit');if(epf)epf.classList.remove('skeleton-val');
  var ess=document.getElementById('kpi-staff');if(ess)ess.classList.remove('skeleton-val');

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

  /* AI 오늘의 조언 */
  var bestMenu='';var bestCnt=0;
  var menuMap={};
  sales.forEach(function(s){(s.items||[]).forEach(function(it){menuMap[it.name]=(menuMap[it.name]||0)+(it.qty||1);});});
  Object.keys(menuMap).forEach(function(k){if(menuMap[k]>bestCnt){bestCnt=menuMap[k];bestMenu=k;}});
  _dineGenAiAdvice({totalSales:totalSales,orderCnt:orderCnt,marginRate:marginRate,laborRate:laborRate,bestMenu:bestMenu,working:working.length,estLabor:estLabor});
  },function(e){console.warn('sales:',e);});
 }).catch(function(){});
}

function _dineGenAiAdvice(d){
 var el=document.getElementById('dash-ai-tips');
 var tm=document.getElementById('dash-ai-time');
 if(!el)return;
 var tips=[];
 var h=new Date().getHours();
 /* 매출 기반 */
 if(d.orderCnt===0) tips.push({icon:'📢',color:'#f59e0b',text:'아직 오늘 주문이 없습니다. 단골 회원에게 알림톡 프로모션을 발송해 보세요.'});
 else if(d.orderCnt>=20) tips.push({icon:'🔥',color:'#22c55e',text:'오늘 주문이 활발합니다 ('+d.orderCnt+'건). 주방 직원 피로도를 확인하고 필요 시 지원 인력을 배치하세요.'});
 /* 마진 */
 if(d.marginRate<30&&d.orderCnt>0) tips.push({icon:'📉',color:'#ef4444',text:'마진율이 '+d.marginRate+'%로 낮습니다. 원가 비중이 높은 메뉴의 레시피 수율을 점검하거나 가격 조정을 검토하세요.'});
 else if(d.marginRate>=60&&d.orderCnt>0) tips.push({icon:'📈',color:'#22c55e',text:'마진율이 '+d.marginRate+'%로 양호합니다. 오늘 운영 효율이 좋습니다.'});
 /* 인건비 */
 if(d.laborRate>35&&d.orderCnt>0) tips.push({icon:'⚠️',color:'#ef4444',text:'인건비 비율이 '+d.laborRate+'%입니다. 권장 수준(25~30%)을 초과했습니다. 피크 외 시간대 스케줄 최적화를 검토하세요.'});
 else if(d.laborRate>0&&d.laborRate<=25) tips.push({icon:'✅',color:'#22c55e',text:'인건비 비율 '+d.laborRate+'% — 적정 수준입니다. 출근 '+d.working+'명 운영 효율 양호.'});
 /* 피크타임 */
 if(h>=10&&h<=11) tips.push({icon:'⏰',color:'#38bdf8',text:'점심 피크타임이 곧 시작됩니다. 식재료 전처리와 홀/주방 배치를 지금 점검하세요.'});
 else if(h>=16&&h<=17) tips.push({icon:'⏰',color:'#38bdf8',text:'저녁 피크타임 1시간 전입니다. 재료 보충과 홀 정리를 미리 해두세요.'});
 /* 베스트 메뉴 */
 if(d.bestMenu) tips.push({icon:'🏆',color:'#C8A356',text:'오늘 가장 많이 팔린 메뉴: '+d.bestMenu+' ('+d.orderCnt+'건 중 상위). 재고와 재료 준비 상태를 확인하세요.'});
 /* 최소 3개 보장 */
 if(tips.length<1) tips.push({icon:'💡',color:'#a78bfa',text:'데이터가 충분히 쌓이면 맞춤 조언을 제공합니다. 지금은 매장 설정을 점검해 보세요.'});
 tips=tips.slice(0,3);
 el.innerHTML=tips.map(function(t){
  return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:rgba(255,255,255,.03);border-radius:10px;border-left:2px solid '+t.color+'">'+
   '<span style="font-size:16px;flex-shrink:0;line-height:1.3">'+t.icon+'</span>'+
   '<span style="font-size:12px;line-height:1.6;color:var(--tx)">'+t.text+'</span>'+
  '</div>';
 }).join('');
 if(tm){var now=new Date();tm.textContent=now.getHours()+':'+String(now.getMinutes()).padStart(2,'0')+' 기준';}
}

function _dineWatchOrderChannels(did,today){
 if(window._dineChUnsub)window._dineChUnsub();
 if(!did||!_db)return;
 window._dineChUnsub=_db.collection('filo_orders')
  .where('dealerId','==',did).where('date','==',today)
  .onSnapshot(function(snap){
   var byType={table:[],takeout:[],delivery:[],phone:[]};
   var recent=[];
   snap.forEach(function(doc){
    var d=doc.data();
    var t=d.type||'table';
    if(byType[t])byType[t].push(d);else byType['table'].push(d);
    recent.push(d);
   });
   recent.sort(function(a,b){return (b.createdAt||'')>(a.createdAt||'')?1:-1;});
   var types=[
    {key:'table',label:'테이블',color:'#38bdf8',colorRgb:'56,189,248'},
    {key:'takeout',label:'포장',color:'#22c55e',colorRgb:'34,197,94'},
    {key:'delivery',label:'배달',color:'#f97316',colorRgb:'249,115,22'}
   ];
   var total=snap.size;
   var tc=document.getElementById('dash-ch-total');
   if(tc)tc.textContent='오늘 총 '+total+'건';
   types.forEach(function(tp,i){
    var arr=byType[tp.key]||[];
    var el=document.getElementById('ch-cnt-'+i);
    var sl=document.getElementById('ch-sub-'+i);
    if(el)el.textContent=arr.length;
    if(sl){
     var pending=arr.filter(function(o){return o.status==='pending';}).length;
     var done=arr.filter(function(o){return o.status==='done'||o.status==='paid';}).length;
     sl.textContent=(pending?'대기 '+pending+'건 · ':'')+'완료 '+done+'건';
    }
   });
   /* 최근 5건 */
   var list=document.getElementById('dash-ch-list');
   if(!list)return;
   if(!recent.length){list.innerHTML='<div style="text-align:center;padding:10px;color:var(--t3);font-size:12px">오늘 주문 없음</div>';return;}
   var statusInfo={
    'pending':{label:'대기',color:'#f59e0b'},
    'preparing':{label:'조리중',color:'#38bdf8'},
    'done':{label:'완료',color:'#22c55e'},
    'paid':{label:'결제',color:'#a78bfa'},
    'cancelled':{label:'취소',color:'#ef4444'}
   };
   var typeColors={table:'#38bdf8',takeout:'#22c55e',delivery:'#f97316',phone:'#a78bfa'};
   var typeLabels={table:'테이블',takeout:'포장',delivery:'배달',phone:'전화'};
   list.innerHTML=recent.slice(0,5).map(function(o){
    var si=statusInfo[o.status]||{label:o.status||'대기',color:'#6b7280'};
    var tc2=typeColors[o.type]||'#38bdf8';
    var tl=typeLabels[o.type]||'테이블';
    var items=(o.items||[]).slice(0,2).map(function(it){return it.name+(it.qty>1?' x'+it.qty:'');}).join(', ');
    if(o.items&&o.items.length>2)items+=' 외 '+(o.items.length-2)+'건';
    var timeStr='';
    if(o.createdAt){try{var dt=new Date(o.createdAt);timeStr=dt.getHours()+':'+String(dt.getMinutes()).padStart(2,'0');}catch(e){}}
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid var(--bd)">'+
     '<span style="font-size:10px;font-weight:800;color:'+tc2+';background:rgba(0,0,0,.2);padding:2px 7px;border-radius:20px;flex-shrink:0">'+tl+'</span>'+
     '<span style="flex:1;font-size:11px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+items+'</span>'+
     '<span style="font-size:11px;font-weight:800;color:var(--tx)">₩'+(o.total||0).toLocaleString()+'</span>'+
     '<span style="font-size:9px;font-weight:700;color:'+si.color+';padding:2px 6px;border-radius:20px;background:'+si.color+'22;flex-shrink:0">'+si.label+'</span>'+
     '<span style="font-size:10px;color:var(--t3);flex-shrink:0">'+timeStr+'</span>'+
    '</div>';
   }).join('');
  },function(e){console.warn('ch-orders:',e);});
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
 if(!alerts.length){lawList.innerHTML='<div style="font-size:12px;color:var(--gr);padding:8px;display:flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>근로법 이상 없음</div>';return;}
 var colorMap={yl:'rgba(245,158,11,.08)',gr:'rgba(34,197,94,.08)',rd:'rgba(239,68,68,.08)'};
 var borderMap={yl:'rgba(245,158,11,.2)',gr:'rgba(34,197,94,.2)',rd:'rgba(239,68,68,.2)'};
 var textMap={yl:'#f59e0b',gr:'#22c55e',rd:'#ef4444'};
 lawList.innerHTML=alerts.map(function(a){
  return '<div style="background:'+colorMap[a.type]+';border:1px solid '+borderMap[a.type]+';border-radius:8px;padding:8px 10px;font-size:11px;color:'+textMap[a.type]+';margin-bottom:6px">'+a.icon+' '+a.msg+'</div>';
 }).join('');
}

// ── CRM 단골 등급 ──

function _dineCrm(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 if(!document.getElementById('crm-styles')){
  var st=document.createElement('style');st.id='crm-styles';
  st.textContent=
   '.crm-tier-vip{background:linear-gradient(135deg,rgba(200,163,86,.18),rgba(200,163,86,.06));border:1px solid rgba(200,163,86,.35)}'+
   '.crm-tier-regular{background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.25)}'+
   '.crm-tier-normal{background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.18)}'+
   '.crm-tier-new{background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.18)}'+
   '.crm-mem-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd)}'+
   '.crm-mem-row:last-child{border:none}'+
   '.crm-badge{font-size:9px;font-weight:900;padding:2px 7px;border-radius:20px;flex-shrink:0}';
  document.head.appendChild(st);
 }

 wrap.innerHTML=
  '<div style="margin-bottom:20px"><div class="page-title">단골 CRM</div><div class="page-sub">고객 등급 자동 분류 · AI 프로모션 추천</div></div>'+
  /* 등급 카드 4개 */
  '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">'+
  [
   {cls:'crm-tier-vip',  label:'VIP',  desc:'10회+ 방문',     color:'#C8A356', id:'crm-vip-cnt'},
   {cls:'crm-tier-regular',label:'단골',desc:'4~9회 방문',    color:'#a78bfa', id:'crm-reg-cnt'},
   {cls:'crm-tier-normal', label:'일반',desc:'1~3회 방문',    color:'#38bdf8', id:'crm-nor-cnt'},
   {cls:'crm-tier-new',    label:'신규',desc:'이번달 가입',    color:'#22c55e', id:'crm-new-cnt'},
  ].map(function(t){
   return '<div class="'+t.cls+'" style="border-radius:14px;padding:14px 12px">'+
    '<div style="font-size:10px;font-weight:800;color:'+t.color+';margin-bottom:6px">'+t.label+'</div>'+
    '<div style="font-size:26px;font-weight:900;color:'+t.color+'" id="'+t.id+'">-</div>'+
    '<div style="font-size:10px;color:var(--t3);margin-top:3px">'+t.desc+'</div>'+
   '</div>';
  }).join('')+
  '</div>'+
  /* AI 프로모션 추천 */
  '<div class="card" style="border-left:3px solid #C8A356;margin-bottom:14px">'+
  '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'+
  '<div style="width:24px;height:24px;border-radius:7px;background:rgba(200,163,86,.15);display:flex;align-items:center;justify-content:center;color:#C8A356">'+
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L9.27 9.27 3 12l6.27 2.73L12 21l2.73-6.27L21 12l-6.27-2.73z"/></svg>'+
  '</div>'+
  '<span style="font-size:12px;font-weight:800;color:#C8A356">AI 프로모션 추천</span>'+
  '</div>'+
  '<div id="crm-promo" style="display:flex;flex-direction:column;gap:7px"></div>'+
  '</div>'+
  /* 회원 목록 */
  '<div class="card">'+
  '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'+
  '<span style="font-size:13px;font-weight:800">전체 회원</span>'+
  '<span style="flex:1"></span>'+
  '<input id="crm-search" type="text" placeholder="이름/전화 검색" style="height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--bd2);background:var(--s3);color:var(--tx);font-size:11px;width:130px" oninput="_crmFilter()">'+
  '</div>'+
  '<div id="crm-list"><div style="text-align:center;padding:30px;color:var(--t3)">불러오는 중...</div></div>'+
  '</div>';

 el.appendChild(wrap);
 _dineLoadCrm(did);
}

var _crmAllMembers=[];
function _dineLoadCrm(did){
 var now=new Date();
 var thisMonth=now.toISOString().slice(0,7);
 var cutoff90=new Date(now);cutoff90.setDate(cutoff90.getDate()-90);
 var from90=cutoff90.toISOString().slice(0,10);

 Promise.all([
  _db.collection('members').where('dealerId','==',did).get(),
  _db.collection('filo_orders').where('dealerId','==',did).where('date','>=',from90).get()
 ]).then(function(results){
  var memSnap=results[0],ordSnap=results[1];

  /* 주문 집계: memberPhone 기준 */
  var orderByPhone={};
  ordSnap.forEach(function(doc){
   var d=doc.data();
   var ph=d.memberPhone||d.phone||'';
   if(!ph)return;
   if(!orderByPhone[ph])orderByPhone[ph]={cnt:0,spend:0};
   orderByPhone[ph].cnt++;
   orderByPhone[ph].spend+=d.total||0;
  });

  var vipCnt=0,regCnt=0,norCnt=0,newCnt=0;
  var members=[];
  memSnap.forEach(function(doc){
   var m=Object.assign({_id:doc.id},doc.data());
   var ph=(m.phone||'').replace(/-/g,'');
   var ord=orderByPhone[ph]||{cnt:m.visitCount||0,spend:m.totalSpend||0};
   var cnt=ord.cnt;var spend=ord.spend;
   var tier,tierColor,tierCls;
   if(cnt>=10){tier='VIP';tierColor='#C8A356';tierCls='crm-tier-vip';vipCnt++;}
   else if(cnt>=4){tier='단골';tierColor='#a78bfa';tierCls='crm-tier-regular';regCnt++;}
   else if(cnt>=1){tier='일반';tierColor='#38bdf8';tierCls='crm-tier-normal';norCnt++;}
   else{
    var jd=(m.createdAt||m.joinDate||'');
    var isNew=jd&&jd.slice(0,7)===thisMonth;
    tier=isNew?'신규':'일반';
    tierColor=isNew?'#22c55e':'#38bdf8';
    tierCls=isNew?'crm-tier-new':'crm-tier-normal';
    if(isNew)newCnt++;else norCnt++;
   }
   members.push(Object.assign({},m,{_tier:tier,_tierColor:tierColor,_tierCls:tierCls,_cnt:cnt,_spend:spend}));
  });

  members.sort(function(a,b){
   var order={VIP:0,단골:1,일반:2,신규:3};
   return (order[a._tier]||3)-(order[b._tier]||3);
  });

  /* 등급 카드 업데이트 */
  ['crm-vip-cnt','crm-reg-cnt','crm-nor-cnt','crm-new-cnt'].forEach(function(id,i){
   var v=[vipCnt,regCnt,norCnt,newCnt][i];
   var e=document.getElementById(id);if(e)e.textContent=v+'명';
  });

  /* AI 프로모션 추천 */
  var promos=[];
  if(vipCnt>0) promos.push({color:'#C8A356',bg:'rgba(200,163,86,.1)',text:'VIP '+vipCnt+'명에게 프리미엄 서비스 쿠폰 발송 — 재방문율 유지에 효과적입니다.'});
  if(regCnt>0) promos.push({color:'#a78bfa',bg:'rgba(167,139,250,.1)',text:'단골 '+regCnt+'명에게 10% 할인 쿠폰 발송 — VIP 전환 촉진 타이밍입니다.'});
  if(newCnt>0) promos.push({color:'#22c55e',bg:'rgba(34,197,94,.1)',text:'신규 '+newCnt+'명에게 웰컴 혜택 발송 — 첫 재방문을 이끌어 단골화하세요.'});
  if(!promos.length) promos.push({color:'#C8A356',bg:'rgba(200,163,86,.1)',text:'회원 데이터가 쌓이면 맞춤 프로모션을 추천합니다. 회원 등록을 유도해 보세요.'});
  var pr=document.getElementById('crm-promo');
  if(pr)pr.innerHTML=promos.map(function(p){
   return '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:'+p.bg+';border-radius:9px;border-left:2px solid '+p.color+'">'+
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="'+p.color+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'+
    '<span style="font-size:12px;color:var(--tx)">'+p.text+'</span>'+
   '</div>';
  }).join('');

  /* 회원 목록 렌더 */
  _crmAllMembers=members;
  _crmRender(members);
 }).catch(function(e){
  var ll=document.getElementById('crm-list');
  if(ll)ll.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3)">데이터 로드 실패</div>';
 });
}

function _crmRender(list){
 var ll=document.getElementById('crm-list');if(!ll)return;
 if(!list.length){ll.innerHTML='<div style="text-align:center;padding:24px;color:var(--t3);font-size:12px">등록된 회원이 없습니다</div>';return;}
 ll.innerHTML=list.map(function(m){
  return '<div class="crm-mem-row">'+
   '<div style="width:36px;height:36px;border-radius:50%;background:'+m._tierColor+'22;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+
   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="'+m._tierColor+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'+
   '</div>'+
   '<div style="flex:1;min-width:0">'+
   '<div style="display:flex;align-items:center;gap:7px">'+
   '<span style="font-size:13px;font-weight:700">'+(m.name||'이름없음')+'</span>'+
   '<span class="crm-badge" style="background:'+m._tierColor+'22;color:'+m._tierColor+'">'+m._tier+'</span>'+
   '</div>'+
   '<div style="font-size:10px;color:var(--t3);margin-top:2px">'+(m.phone||'번호없음')+' · 방문 '+m._cnt+'회 · ₩'+m._spend.toLocaleString()+'</div>'+
   '</div>'+
   '<div style="text-align:right;flex-shrink:0">'+
   '<div style="font-size:12px;font-weight:800;color:'+m._tierColor+'">₩'+m._spend.toLocaleString()+'</div>'+
   '<div style="font-size:10px;color:var(--t3)">90일</div>'+
   '</div>'+
  '</div>';
 }).join('');
}

function _crmFilter(){
 var q=(document.getElementById('crm-search')||{}).value||'';
 q=q.toLowerCase();
 if(!q){_crmRender(_crmAllMembers);return;}
 _crmRender(_crmAllMembers.filter(function(m){
  return (m.name||'').toLowerCase().indexOf(q)>=0||(m.phone||'').indexOf(q)>=0;
 }));
}

// ── 스케줄 관련 함수 ──


// ── 실시간 급여 계산 ──


function _dineToast(msg){
 var t=document.createElement('div');
 t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--s2);border:1px solid var(--bd2);border-radius:12px;padding:10px 20px;font-size:13px;font-weight:700;z-index:9999;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,.4)';
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
