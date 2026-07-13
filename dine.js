/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @description 본 소프트웨어는 유한회사 엠비티아이가 독자적으로 개발한 저작물입니다.
 *              저작권법 및 관련 법령에 의해 보호됩니다.
 *              사업자등록번호: 373-86-02536
 *              filo.ai.kr | dine.ne.kr
 * @module      dine.js
 * @description DINE 메인·로그인·대시보드·실시간연동
 */
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
          _db.collection('companies').doc(did).update({fcmToken:token,fcmTokenUpdatedAt:new Date().toISOString()}).catch(function(){});
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
 if(window._DINE_SLUG) console.log('[DINE] slug 인식:', window._DINE_SLUG);
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
     createdAt:{stringValue:new Date().toISOString()}
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
    createdAt:{stringValue:new Date().toISOString()}
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
    createdAt:{stringValue:new Date().toISOString()},
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
 var today=new Date().toISOString().slice(0,10);
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
  var today=new Date().toISOString().slice(0,10);
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
  _countUp('kpi-sales',totalSales,'₩','');
  var ePr=document.getElementById('kpi-profit');
  if(ePr){_countUp('kpi-profit',Math.max(0,todayProfit),'₩','');ePr.style.color=todayProfit>=0?'#22c55e':'#ef4444';}
  var eMg=document.getElementById('kpi-margin');
  if(eMg){eMg.textContent=marginRate+'%';eMg.style.color=marginRate>=60?'#22c55e':marginRate>=40?'#f59e0b':'#ef4444';}
  _countUp('kpi-orders',orderCnt,'','건');
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
function _dineScheduleAdd(did){
 _db.collection('staff').where('dealerId','==',did).get().then(function(snap){
  if(snap.empty){alert('등록된 직원이 없습니다');return;}
  var opts=snap.docs.map(function(d){return '<option value="'+d.id+'">'+d.data().name+'</option>';}).join('');
  var mo=document.createElement('div');mo.className='mo';
  var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
  box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">📅 근무 스케줄 등록</div>'+
   '<div class="input-group"><label>직원 *</label><select id="sch-staff" class="inp">'+opts+'</select></div>'+
   '<div class="input-group"><label>날짜 *</label><input id="sch-date" class="inp" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div>'+
   '<div style="display:flex;gap:8px">'+
   '<div class="input-group" style="flex:1"><label>출근</label><input id="sch-start" class="inp" type="time" value="09:00"></div>'+
   '<div class="input-group" style="flex:1"><label>퇴근</label><input id="sch-end" class="inp" type="time" value="18:00"></div>'+
   '</div>'+
   '<div class="input-group"><label>메모</label><input id="sch-note" class="inp" placeholder="오픈, 마감 등"></div>'+
   '<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:12px">'+
   '<input type="checkbox" id="sch-push" checked> 직원에게 푸시 알림</div>'+
   '<div style="display:flex;gap:8px;margin-top:16px">'+
   '<button class="btn btn-primary" style="flex:1" onclick="_dineScheduleSave(did_val)">저장</button>'+
   '<button class="btn btn-ghost" onclick="this.closest(cls).remove()">취소</button></div>';
  // did/cls 치환
  box.querySelector('[onclick="_dineScheduleSave(did_val)"]').onclick=function(){_dineScheduleSave(did);};
  box.querySelector('[onclick="this.closest(cls).remove()"]').onclick=function(){this.closest('.mo').remove();};
  mo.appendChild(box);mo.onclick=function(e){if(e.target===mo)mo.remove();};
  document.body.appendChild(mo);
 });
}

function _dineScheduleAddDay(staffId,staffName,date,did){
 var mo=document.createElement('div');mo.className='mo';
 var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
 box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">📅 '+staffName+' ('+date+')</div>'+
  '<div style="display:flex;gap:8px">'+
  '<div class="input-group" style="flex:1"><label>출근</label><input id="sch-start2" class="inp" type="time" value="09:00"></div>'+
  '<div class="input-group" style="flex:1"><label>퇴근</label><input id="sch-end2" class="inp" type="time" value="18:00"></div>'+
  '</div>'+
  '<div class="input-group"><label>메모</label><input id="sch-note2" class="inp" placeholder="오픈, 마감, 오후 등"></div>'+
  '<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:12px">'+
  '<input type="checkbox" id="sch-push2" checked> 직원에게 푸시</div>'+
  '<div style="display:flex;gap:8px">'+
  '<button class="btn btn-primary" style="flex:1" id="sch-save-btn">저장</button>'+
  '<button class="btn btn-ghost" id="sch-cancel-btn">취소</button></div>';
 mo.appendChild(box);
 box.querySelector('#sch-save-btn').onclick=function(){_dineScheduleSaveDirect(staffId,staffName,date,did);};
 box.querySelector('#sch-cancel-btn').onclick=function(){mo.remove();};
 mo.onclick=function(e){if(e.target===mo)mo.remove();};
 document.body.appendChild(mo);
}

function _dineScheduleSave(did){
 var staffSel=document.getElementById('sch-staff');
 var staffId=staffSel.value;
 var staffName=staffSel.options[staffSel.selectedIndex].text;
 var date=document.getElementById('sch-date').value;
 var startTime=document.getElementById('sch-start').value;
 var endTime=document.getElementById('sch-end').value;
 var note=document.getElementById('sch-note').value.trim();
 var pushOn=document.getElementById('sch-push').checked;
 if(!date){alert('날짜를 선택해주세요');return;}
 _dineScheduleSaveDo(staffId,staffName,date,startTime,endTime,note,did,pushOn);
}

function _dineScheduleSaveDirect(staffId,staffName,date,did){
 var startTime=document.getElementById('sch-start2').value;
 var endTime=document.getElementById('sch-end2').value;
 var note=document.getElementById('sch-note2').value.trim();
 var pushOn=document.getElementById('sch-push2').checked;
 _dineScheduleSaveDo(staffId,staffName,date,startTime,endTime,note,did,pushOn);
}

function _dineScheduleSaveDo(staffId,staffName,date,startTime,endTime,note,did,pushOn){
 _db.collection('dine_schedules').add({
  dealerId:did,staffId:staffId,staffName:staffName,
  date:date,startTime:startTime,endTime:endTime,
  note:note,createdAt:new Date().toISOString()
 }).then(function(){
  _dineToast('✅ 스케줄 등록됐습니다');
  document.querySelector('.mo')?.remove();
  if(pushOn){
   _db.collection('staff').doc(staffId).get().then(function(snap){
    var d=snap.data()||{};
    var tokens=((d.fcmTokens||[]).map(function(t){return t.token||t;})).filter(Boolean);
    if(d.fcmToken&&d.fcmToken.length>20) tokens.push(d.fcmToken);
    tokens=[...new Set(tokens)].filter(function(t){return t&&t.length>20;});
    if(tokens.length){
     fetch('https://donway.ai.kr/fcm/notify-drivers',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tokens:tokens,title:'📅 근무 스케줄',body:date+' '+startTime+'~'+endTime+(note?' ('+note+')':'')})
     }).catch(function(){});
     _dineToast('📱 '+staffName+'님 푸시 발송');
    }
   });
  }
  _dineSchedule(document.getElementById('content'));
 });
}

function _dineScheduleEdit(staffId,date,did){
 _db.collection('dine_schedules').where('dealerId','==',did).where('staffId','==',staffId).where('date','==',date).limit(1).get()
 .then(function(snap){
  if(snap.empty)return;
  var doc=snap.docs[0];var d=doc.data();
  var mo=document.createElement('div');mo.className='mo';
  var box=document.createElement('div');box.className='mo-box';box.style.padding='24px';
  box.innerHTML='<div style="font-size:16px;font-weight:900;margin-bottom:16px">📅 스케줄 수정 ('+d.staffName+' '+date+')</div>'+
   '<div style="display:flex;gap:8px">'+
   '<div class="input-group" style="flex:1"><label>출근</label><input id="sch-edit-start" class="inp" type="time" value="'+d.startTime+'"></div>'+
   '<div class="input-group" style="flex:1"><label>퇴근</label><input id="sch-edit-end" class="inp" type="time" value="'+d.endTime+'"></div>'+
   '</div>'+
   '<div class="input-group"><label>메모</label><input id="sch-edit-note" class="inp" value="'+(d.note||'')+'"></div>'+
   '<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:12px">'+
   '<input type="checkbox" id="sch-edit-push" checked> 수정 내용 직원에게 푸시</div>'+
   '<div style="display:flex;gap:8px;margin-top:16px">'+
   '<button class="btn btn-primary" style="flex:1" id="sch-edit-save">저장</button>'+
   '<button class="btn" style="background:#ef4444;color:#fff;flex:1" id="sch-edit-del">삭제</button>'+
   '<button class="btn btn-ghost" id="sch-edit-cancel">취소</button></div>';
  mo.appendChild(box);
  box.querySelector('#sch-edit-save').onclick=function(){_dineScheduleUpdate(doc.id,staffId,d.staffName,date,did);};
  box.querySelector('#sch-edit-del').onclick=function(){_dineScheduleDelete(doc.id,did);};
  box.querySelector('#sch-edit-cancel').onclick=function(){mo.remove();};
  mo.onclick=function(e){if(e.target===mo)mo.remove();};
  document.body.appendChild(mo);
 });
}

function _dineScheduleUpdate(docId,staffId,staffName,date,did){
 var startTime=document.getElementById('sch-edit-start').value;
 var endTime=document.getElementById('sch-edit-end').value;
 var note=document.getElementById('sch-edit-note').value.trim();
 var pushOn=document.getElementById('sch-edit-push').checked;
 _db.collection('dine_schedules').doc(docId).update({startTime:startTime,endTime:endTime,note:note,updatedAt:new Date().toISOString()})
 .then(function(){
  _dineToast('✅ 수정됐습니다');document.querySelector('.mo')?.remove();
  if(pushOn){
   _db.collection('staff').doc(staffId).get().then(function(snap){
    var d=snap.data()||{};
    var tokens=((d.fcmTokens||[]).map(function(t){return t.token||t;})).filter(Boolean);
    if(d.fcmToken) tokens.push(d.fcmToken);
    tokens=[...new Set(tokens)].filter(function(t){return t&&t.length>20;});
    if(tokens.length) fetch('https://donway.ai.kr/fcm/notify-drivers',{method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({tokens:tokens,title:'📅 스케줄 변경',body:date+' '+startTime+'~'+endTime+(note?' ('+note+')':'')})
    }).catch(function(){});
   });
  }
  _dineSchedule(document.getElementById('content'));
 });
}

function _dineScheduleDelete(docId,did){
 if(!confirm('스케줄을 삭제하시겠습니까?'))return;
 _db.collection('dine_schedules').doc(docId).delete().then(function(){
  _dineToast('🗑 삭제됐습니다');document.querySelector('.mo')?.remove();
  _dineSchedule(document.getElementById('content'));
 });
}

function _dineScheduleWeek(offset){ window._schedWeekOffset=(window._schedWeekOffset||0)+offset; _dineSchedule(document.getElementById('content')); }

// ── 실시간 급여 계산 ──
function _dineAutoPayroll(did){
 var ym=document.getElementById('pay-ym')?.value||new Date().toISOString().slice(0,7);
 var cycleFilter=document.getElementById('pay-cycle-filter')?.value||'month';
 var filterPart=document.getElementById('pay-part')?.value||'';
 var filterEmp=document.getElementById('pay-emptype')?.value||'';
 var dateFrom,dateTo;
 if(cycleFilter==='week'){
  var dw=new Date();dw.setDate(dw.getDate()-dw.getDay()+1);dateFrom=dw.toISOString().slice(0,10);
  var dw2=new Date();dw2.setDate(dw2.getDate()-dw2.getDay()+7);dateTo=dw2.toISOString().slice(0,10);
 } else if(cycleFilter==='day'){
  dateFrom=dateTo=new Date().toISOString().slice(0,10);
 } else { dateFrom=ym+'-01';dateTo=ym+'-31'; }
 if(window._payrollUnsub) window._payrollUnsub();
 _dineToast('🔄 실시간 급여 계산 중...');
 _db.collection('staff').where('dealerId','==',did).get().then(function(staffSnap){
  var staffMap={};
  staffSnap.forEach(function(doc){
   var d=doc.data();
   if(filterPart&&d.part!==filterPart) return;
   if(filterEmp&&(d.payType||'hourly')!==filterEmp) return;
   staffMap[doc.id]=d;
  });
  window._payrollUnsub=_db.collection('attendance')
   .where('dealerId','==',did).where('date','>=',dateFrom).where('date','<=',dateTo)
   .onSnapshot(function(attSnap){
    var workMap={};
    attSnap.forEach(function(doc){
     var d=doc.data();if(!staffMap[d.staffId])return;
     if(!workMap[d.staffId])workMap[d.staffId]={dateIns:{},dateOuts:{},breaks:[]};
     if(d.type==='in') workMap[d.staffId].dateIns[d.date]=d;
     else if(d.type==='out') workMap[d.staffId].dateOuts[d.date]=d;
     else if(d.type==='break_start') workMap[d.staffId].breaks.push({date:d.date,start:d.time,end:null});
     else if(d.type==='break_end'){var br=workMap[d.staffId].breaks.find(function(b){return b.date===d.date&&!b.end;});if(br)br.end=d.time;}
    });
    var list=document.getElementById('payroll-list');if(!list)return;
    var rows='';var grandNet=0;
    Object.keys(staffMap).forEach(function(sid){
     var st=staffMap[sid];var wk=workMap[sid]||{dateIns:{},dateOuts:{},breaks:[]};
     var empType=st.payType||'hourly';var hourlyWage=st.hourlyWage||MIN_WAGE;
     var monthlySalary=st.monthlySalary||2500000;var weeklyContractH=st.weeklyHours||40;
     var totalMin=0;var nightMin=0;
     Object.keys(wk.dateIns).forEach(function(date){
      var inT=new Date(wk.dateIns[date].time);
      var outT=wk.dateOuts[date]?new Date(wk.dateOuts[date].time):new Date();
      var diffMin=(outT-inT)/60000;
      var realBr=wk.breaks.filter(function(b){return b.date===date&&b.end;}).reduce(function(a,b){return a+(new Date(b.end)-new Date(b.start))/60000;},0);
      var brMin=realBr||(diffMin>=480?60:diffMin>=240?30:0);
      totalMin+=Math.max(0,diffMin-brMin);
      var ns=new Date(inT);ns.setHours(22,0,0,0);if(outT>ns)nightMin+=(outT-Math.max(inT,ns))/60000;
     });
     var workH=totalMin/60;var nightH=nightMin/60;
     var basePay=0;var nightPay=0;var weeklyPay=0;var empLabel='';
     if(empType==='monthly'){
      var calcH=monthlySalary/(weeklyContractH*4.3);
      basePay=cycleFilter==='week'?Math.round(monthlySalary/4.3):cycleFilter==='day'?Math.round(monthlySalary/22):monthlySalary;
      nightPay=Math.round(nightH*calcH*0.5);empLabel='정직원';
     } else {
      basePay=Math.round(workH*hourlyWage);nightPay=Math.round(nightH*hourlyWage*0.5);
      var wkH=cycleFilter==='week'?workH:workH/4.3;
      weeklyPay=(wkH>=weeklyContractH*0.9&&weeklyContractH>=15)?(hourlyWage*weeklyContractH/5):0;
      empLabel={'daily':'일급알바','weekly':'주급알바','biweekly':'격주알바','monthly':'월급알바'}[st.payCycle||'monthly']||'알바';
     }
     var totalPay=basePay+nightPay+Math.round(weeklyPay);
     var ins4=Math.round(totalPay*(0.0475+0.03595+0.009));var netPay=totalPay-ins4;
     grandNet+=netPay;
     var partLabel={'kitchen':'주방','hall':'홀','management':'관리'}[st.part]||'';
     rows+='<div class="card" style="padding:14px;margin-bottom:8px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
      '<div style="display:flex;align-items:center;gap:6px">'+
      '<div style="font-weight:800;font-size:14px">'+st.name+'</div>'+
      '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(0,0,0,.2);color:'+(empType==='monthly'?'#38bdf8':'#a78bfa')+'">'+empLabel+'</span>'+
      (partLabel?'<span style="font-size:10px;color:var(--t3)">'+partLabel+'</span>':'')+
      '</div>'+
      '<div style="font-size:11px;color:var(--t3)">'+(empType==='monthly'?'₩'+monthlySalary.toLocaleString()+'/월':'₩'+hourlyWage.toLocaleString()+'/시')+'</div>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px;margin-bottom:10px">'+
      '<div style="background:var(--s2);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3);font-size:9px">근무시간</div><div style="font-weight:700;color:#38bdf8">'+Math.floor(workH)+'h '+Math.round((workH%1)*60)+'m</div></div>'+
      '<div style="background:var(--s2);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3);font-size:9px">야간수당</div><div style="font-weight:700;color:#f59e0b">₩'+nightPay.toLocaleString()+'</div></div>'+
      '<div style="background:var(--s2);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3);font-size:9px">주휴수당</div><div style="font-weight:700;color:#a78bfa">₩'+Math.round(weeklyPay).toLocaleString()+'</div></div>'+
      '<div style="background:var(--s2);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3);font-size:9px">4대보험</div><div style="font-weight:700;color:#ef4444">-₩'+ins4.toLocaleString()+'</div></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--bd);padding-top:8px">'+
      '<div style="font-size:11px;color:var(--t3)">세전 ₩'+totalPay.toLocaleString()+'</div>'+
      '<div style="font-size:16px;font-weight:900;color:#22c55e">실수령 ₩'+netPay.toLocaleString()+'</div>'+
      '</div></div>';
    });
    list.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--s2);border-radius:10px;margin-bottom:12px">'+
     '<div style="font-size:12px;color:var(--t3)">실시간 계산 <span class="live-dot"></span></div>'+
     '<div style="font-size:16px;font-weight:900;color:#f59e0b">총 실수령 ₩'+grandNet.toLocaleString()+'</div>'+
     '</div>'+(rows||'<div style="text-align:center;padding:30px;color:var(--t3)">출퇴근 기록이 없습니다</div>');
   });
 });
}

function _dinePayslip(el){
 var did=_CU.dealerId;
 el.innerHTML='';
 var wrap=document.createElement('div');wrap.className='slide-up';
 var ym=new Date().toISOString().slice(0,7);
 wrap.innerHTML=
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">'+
  '<div><div class="page-title">📋 급여명세서</div><div class="page-sub">직원별 월별 명세서</div></div>'+
  '<div style="display:flex;gap:6px;align-items:center">'+
  '<input type="month" id="ps-ym" value="'+ym+'" class="inp" style="width:auto;padding:5px 10px;font-size:12px">'+
  '<button class="btn btn-primary btn-sm" data-did="'+did+'" onclick="_dinePayslipList(this.dataset.did)">조회</button>'+
  '</div></div>'+
  '<div id="ps-list"><div style="text-align:center;padding:30px;color:var(--t3)">월을 선택 후 조회하세요</div></div>';
 el.appendChild(wrap);
}

function _dinePayslipList(did){
 var ym=document.getElementById('ps-ym')?.value||new Date().toISOString().slice(0,7);
 var from=ym+'-01',to=ym+'-31';
 var list=document.getElementById('ps-list');
 if(!list)return;
 list.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3)">⏳ 로딩중...</div>';
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','>=',from).where('date','<=',to).get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(results){
  var attSnap=results[0],memSnap=results[1];
  var attMap={};
  attSnap.forEach(function(doc){var d=doc.data();if(!attMap[d.memberId])attMap[d.memberId]={ins:[],outs:[]};if(d.type==='in')attMap[d.memberId].ins.push(d);else attMap[d.memberId].outs.push(d);});
  var html='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
   '<thead><tr style="border-bottom:2px solid var(--bd);background:var(--bg3)">'+
   '<th style="padding:10px 8px;text-align:left">직원</th>'+
   '<th style="padding:10px 8px;text-align:center">파트</th>'+
   '<th style="padding:10px 8px;text-align:center">출근일</th>'+
   '<th style="padding:10px 8px;text-align:center">총근무</th>'+
   '<th style="padding:10px 8px;text-align:right">기본급</th>'+
   '<th style="padding:10px 8px;text-align:right">주휴</th>'+
   '<th style="padding:10px 8px;text-align:right">공제</th>'+
   '<th style="padding:10px 8px;text-align:right;color:#22c55e">실수령</th>'+
   '<th style="padding:10px 8px;text-align:center">명세서</th>'+
   '</tr></thead><tbody>';
  var totalNet=0;
  memSnap.forEach(function(doc){
   var m=doc.data();
   if((m.status||'active')==='resigned')return;
   var att=attMap[doc.id]||{ins:[],outs:[]};
   var r=_calcPayFull(m,att,memSnap.size,ym);
   var days=att.ins.length;
   var partColor={'kitchen':'#ef4444','hall':'#38bdf8'}[m.part]||'#a78bfa';
   totalNet+=r.netSalary;
   html+='<tr style="border-bottom:1px solid var(--bd)">'+
    '<td style="padding:10px 8px;font-weight:700">'+m.name+'</td>'+
    '<td style="padding:10px 8px;text-align:center"><span style="font-size:10px;font-weight:700;color:'+partColor+'">'+({'kitchen':'주방','hall':'홀','management':'관리'}[m.part]||'-')+'</span></td>'+
    '<td style="padding:10px 8px;text-align:center">'+days+'일</td>'+
    '<td style="padding:10px 8px;text-align:center;font-weight:700;color:var(--br)">'+r.monthlyHours+'h</td>'+
    '<td style="padding:10px 8px;text-align:right">₩'+r.basePay.toLocaleString()+'</td>'+
    '<td style="padding:10px 8px;text-align:right;color:#22c55e">'+(r.weeklyHoliday?'₩'+r.weeklyHoliday.toLocaleString():'-')+'</td>'+
    '<td style="padding:10px 8px;text-align:right;color:#ef4444">-₩'+(r.insTotal+r.taxTotal).toLocaleString()+'</td>'+
    '<td style="padding:10px 8px;text-align:right;font-weight:900;color:#22c55e">₩'+r.netSalary.toLocaleString()+'</td>'+
    '<td style="padding:10px 8px;text-align:center">'+
    '<div style="display:flex;gap:4px;justify-content:center">'+
    '<button data-mid="'+doc.id+'" data-ym="'+ym+'" onclick="_dinePayslipModal(this.dataset.mid,this.dataset.ym)" style="font-size:9px;padding:3px 7px;border:1px solid var(--bd);border-radius:5px;background:transparent;color:var(--t2);cursor:pointer">보기</button>'+
    '<button data-mid="'+doc.id+'" data-ym="'+ym+'" onclick="_dineSendPayslip(this.dataset.mid,this.dataset.ym)" style="font-size:9px;padding:3px 7px;border:1px solid rgba(8,145,178,.3);border-radius:5px;background:rgba(8,145,178,.08);color:#38bdf8;cursor:pointer">발송</button>'+
    '</div></td>'+
    '</tr>';
  });
  html+='</tbody><tfoot><tr style="border-top:2px solid var(--bd);background:var(--bg3);font-weight:800">'+
   '<td colspan="7" style="padding:10px 8px">합계</td>'+
   '<td style="padding:10px 8px;text-align:right;font-size:14px;color:#22c55e">₩'+totalNet.toLocaleString()+'</td>'+
   '<td style="padding:10px 8px;text-align:center">'+
   '<button data-did="'+did+'" data-ym="'+ym+'" onclick="_dinePayslipBulkSend(this.dataset.did,this.dataset.ym)" style="font-size:10px;padding:4px 10px;background:var(--br);border:none;border-radius:6px;color:#fff;cursor:pointer;font-weight:700">일괄발송</button>'+
   '</td></tr></tfoot></table></div>';
  list.innerHTML=html;
 });
}

function _dinePayrollLock(ym){
 _dineToast('📌 '+ym+' 급여 확정됨 (준비중)');
}

function _dinePayslipBulkSend(did,ym){
 _dineToast('📤 일괄 알림톡 발송 (준비중)');
}
function _dineAlimtalk(el){el.innerHTML='<div class="slide-up"><div class="page-title">💬 알림톡 설정</div><div class="card" style="margin-top:16px"><div style="font-size:13px;color:var(--t2)">카카오 알림톡 발송을 위해 솔라피 API 키를 등록하세요.<br><br>솔라피 API Key: <input class="inp" placeholder="API Key 입력" style="margin-top:8px"><br><button class="btn btn-primary" style="margin-top:8px">저장</button></div></div></div>';}


function _dineToast(msg){
 var t=document.createElement('div');
 t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--s2);border:1px solid var(--bd2);border-radius:12px;padding:10px 20px;font-size:13px;font-weight:700;z-index:300;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,.4)';
 t.textContent=msg;
 document.body.appendChild(t);
 setTimeout(function(){t.remove();},2500);
}

function _countUp(id,target,prefix,suffix){
 var el=document.getElementById(id);if(!el)return;
 var start=0,step=800/60,inc=target/60;
 var t=setInterval(function(){start+=inc;if(start>=target){start=target;clearInterval(t);}
  el.textContent=prefix+Math.round(start).toLocaleString()+suffix;},step);
}

// util end

