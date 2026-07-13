// filo-members.js — 회원관리, 출퇴근, 재고이력
// filo-common.js에서 분리됨 (리팩토링 2026-07-13)

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

window._filoExpSave=function(did){
 var itemId=document.getElementById('exp-item').value;
 var date=document.getElementById('exp-date').value;
 if(!itemId||!date){_filoToast('품목과 유통기한을 선택해주세요');return;}
 firebase.firestore().collection('inventory').doc(itemId).update({expiryDate:date,updatedAt:new Date().toISOString()})
 .then(function(){_filoToast('✅ 저장됨');_filoPageExpiry(document.getElementById('content'));})
 .catch(function(e){_filoToast('❌ '+e.message);});
};

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

function _filoPageMembers(el){
 var did=_CU.dealerId||_CU.uid;
 var isSA=_CU.role==='superadmin'||SUPER_ADMIN_EMAILS.indexOf(_CU.email||'')>=0;
 el.innerHTML='<div class="slide-up" style="max-width:700px;margin:0 auto">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
 '<div style="font-size:17px;font-weight:900">👤 직원 관리</div>'+
 '<button onclick="_filoShowAddMember()" class="btn btn-brand btn-sm">+ 직원 추가</button></div>'+
 '<div id="member-list"><div style="text-align:center;padding:30px;color:var(--t3)">⏳</div></div></div>';
 _filoLoadMembers(did);
}

function _filoLoadMembers(did){
 _db.collection('members').where('dealerId','==',did).orderBy('name').get()
 .then(function(snap){
 var el=document.getElementById('member-list');if(!el)return;
 if(snap.empty){el.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--t3)"><div style="font-size:32px;margin-bottom:8px">👥</div><div>직원이 없습니다</div><button onclick="_filoShowAddMember()" class="btn btn-brand" style="margin-top:12px;padding:10px 24px;width:auto">첫 직원 추가</button></div>';return;}
 el.innerHTML=snap.docs.map(function(doc,idx){
 var d=doc.data();
 var roleLabel={'admin':'관리자','staff':'직원','part':'알바'}[d.role]||'직원';
 var roleColor={'admin':'#7c3aed','staff':'#0891b2','part':'#f59e0b'}[d.role]||'#94a3b8';
 var initials=(d.name||'?').slice(0,1);
 return '<div class="member-card slide-up stagger-'+Math.min(idx+1,4)+'" data-id="'+doc.id+'" style="cursor:pointer">'+
 '<div class="avatar">'+initials+'</div>'+
 '<div style="flex:1">'+
 '<div style="font-size:14px;font-weight:800">'+esc(d.name||'')+'</div>'+
 '<div style="font-size:11px;color:var(--t3)">'+(d.phone||'')+(d.dept?' · '+d.dept:'')+'</div>'+
 '</div>'+
 '<div style="text-align:right">'+
 '<div style="font-size:11px;font-weight:700;color:'+roleColor+';background:'+roleColor+'22;padding:2px 8px;border-radius:100px">'+roleLabel+'</div>'+
 '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+(d.wage?d.wage.toLocaleString()+'원':'시급 미설정')+'</div>'+
 '</div></div>';
 }).join('');
 }).catch(function(e){var el=document.getElementById('member-list');if(el)el.innerHTML='<div style="color:var(--red);padding:20px">'+e.message+'</div>';});
}

function _filoShowAddMember(){
 var did=_CU.dealerId||_CU.uid;
 var html='<div style="padding:20px;max-width:400px;margin:0 auto">'+
 '<div style="font-size:16px;font-weight:900;margin-bottom:16px">직원 추가</div>'+
 '<div class="fg"><label>이름</label><input id="nm-name" type="text" placeholder="이름" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>전화번호</label><input id="nm-phone" type="tel" placeholder="010-0000-0000" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>역할</label>'+
 '<select id="nm-role" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px">'+
 '<option value="staff">직원</option><option value="admin">관리자</option><option value="part">알바</option></select></div>'+
 '<div class="fg"><label>시급/일급 (원)</label><input id="nm-wage" type="number" placeholder="10030" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div class="fg"><label>부서 (선택)</label><input id="nm-dept" type="text" placeholder="부서명" style="width:100%;padding:10px 12px;background:var(--b3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px"></div>'+
 '<div style="display:flex;gap:8px;margin-top:4px">'+
 '<button onclick="this.closest(".mo").remove()" class="btn" style="flex:1;background:var(--b3)">취소</button>'+
 '<button onclick="_filoAddMember()" class="btn btn-brand" style="flex:1">추가</button></div></div>';
 _filoShowModal(html);
}

function _filoAddMember(){
 var did=_CU.dealerId||_CU.uid;
 var name=document.getElementById('nm-name').value.trim();
 var phone=document.getElementById('nm-phone').value.trim();
 var role=document.getElementById('nm-role').value;
 var wage=parseInt(document.getElementById('nm-wage').value)||0;
 var dept=document.getElementById('nm-dept').value.trim();
 if(!name){_filoToast('이름을 입력하세요');return;}
 _db.collection('members').add({
 dealerId:did,name:name,phone:phone,role:role,wage:wage,dept:dept,
 createdAt:new Date().toISOString(),is_active:true
 }).then(function(){
 document.querySelector('.mo')&&document.querySelector('.mo').remove();
 _filoToast('✅ '+name+' 추가 완료');
 _filoLoadMembers(did);
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

function _filoShowMemberDetail(docId){
 _db.collection('members').doc(docId).get().then(function(snap){
 if(!snap.exists)return;
 var d=snap.data();
 var did=_CU.dealerId||_CU.uid;
 var html='<div style="padding:20px;max-width:400px;margin:0 auto">'+
 '<div style="text-align:center;margin-bottom:16px">'+
 '<div class="avatar" style="width:60px;height:60px;font-size:24px;margin:0 auto 8px">'+d.name.slice(0,1)+'</div>'+
 '<div style="font-size:17px;font-weight:900">'+esc(d.name)+'</div>'+
 '<div style="font-size:12px;color:var(--t3)">'+(d.dept||'')+'</div></div>'+
 '<div style="background:var(--b3);border-radius:12px;padding:14px;margin-bottom:14px">'+
 '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">전화번호</span><span style="font-size:13px;font-weight:700">'+(d.phone||'-')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)">'+
 '<span style="font-size:12px;color:var(--t3)">역할</span><span style="font-size:13px;font-weight:700">'+({'admin':'관리자','staff':'직원','part':'알바'}[d.role]||'직원')+'</span></div>'+
 '<div style="display:flex;justify-content:space-between;padding:6px 0">'+
 '<span style="font-size:12px;color:var(--t3)">시급</span><span style="font-size:13px;font-weight:700">'+(d.wage?(d.wage.toLocaleString()+'원'):'-')+'</span></div></div>'+
 '<div style="display:flex;gap:8px">'+
 '<button onclick="this.closest(".mo").remove()" class="btn" style="flex:1;background:var(--b3)">닫기</button>'+
 '<button class="btn del-btn" data-id="'+docId+'" data-name="'+esc(d.name)+'" style="flex:1;background:var(--red);color:#fff">삭제</button></div></div>';
 _filoShowModal(html);
 });
}

function _filoDeleteMember(docId,name){
 if(!confirm(name+' 직원을 삭제하시겠습니까?'))return;
 var did=_CU.dealerId||_CU.uid;
 _db.collection('members').doc(docId).delete().then(function(){
 document.querySelector('.mo')&&document.querySelector('.mo').remove();
 _filoToast('✅ 삭제 완료');
 _filoLoadMembers(did);
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

var _attendUnsub=null;
function _filoManualCheckin(){
 var mc=document.getElementById('manual-checkin');
 if(mc)mc.style.display=mc.style.display==='none'?'block':'none';
}

function _filoDoManualCheckin(){
 var did=_CU.dealerId||_CU.uid;
 var memberId=document.getElementById('mc-member').value;
 var type=document.getElementById('mc-type').value;
 var timeVal=document.getElementById('mc-time').value;
 if(!memberId){_filoToast('직원을 선택하세요');return;}
 if(!timeVal){_filoToast('시각을 입력하세요');return;}
 var memberSel=document.getElementById('mc-member');
 var memberName=memberSel.options[memberSel.selectedIndex].text;
 var dt=new Date(timeVal);
 _db.collection('attendance').add({
 dealerId:did,memberId:memberId,memberName:memberName,
 type:type,time:dt.toISOString(),date:dt.toISOString().slice(0,10),
 createdBy:_CU.name||_CU.userId||'',manual:true
 }).then(function(){
 _filoToast('✅ '+(type==='in'?'출근':'퇴근')+' 체크 완료');
 document.getElementById('manual-checkin').style.display='none';
 }).catch(function(e){_filoToast('❌ '+e.message);});
}

function _filoStartLiveTicker(){
 if(_liveTickerTimer)clearInterval(_liveTickerTimer);
 _filoRenderLive();
 _liveTickerTimer=setInterval(_filoRenderLive,30000);
}
function _filoRenderLive(){
 var did=_CU.dealerId||_CU.uid;
 var today=new Date().toISOString().slice(0,10);
 Promise.all([
  _db.collection('attendance').where('dealerId','==',did).where('date','==',today).where('type','==','in').get(),
  _db.collection('attendance').where('dealerId','==',did).where('date','==',today).where('type','==','out').get(),
  _db.collection('members').where('dealerId','==',did).get()
 ]).then(function(res){
  var insSnap=res[0],outsSnap=res[1],memSnap=res[2];
  var memMap={};
  memSnap.forEach(function(doc){memMap[doc.id]=doc.data();});
  var outSet={};
  outsSnap.forEach(function(doc){outSet[doc.data().memberId]=true;});
  var active=[];
  insSnap.forEach(function(doc){
   var d=doc.data();
   if(!outSet[d.memberId]){
    var mem=Object.values(memMap).find(function(m){return m.name===d.memberName;})||{};
    var inTime=new Date(d.time);
    var elapsedMin=Math.floor((Date.now()-inTime)/60000);
    var wage=mem.wage||0;
    var earned=Math.round(elapsedMin/60*wage);
    active.push({name:d.memberName||d.memberId,wage:wage,wageType:mem.wageType||'hourly',elapsedMin:elapsedMin,earned:earned,inTime:d.time});
   }
  });
  var liveEl=document.getElementById('pay-live');
  if(!liveEl)return;
  if(!active.length){liveEl.innerHTML='';return;}
  liveEl.innerHTML='<div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:12px;padding:12px 14px;margin-bottom:4px">'+
  '<div style="font-size:12px;font-weight:800;color:#22c55e;margin-bottom:8px">🟢 현재 출근 중 ('+active.length+'명)</div>'+
  active.map(function(a){
   var h=Math.floor(a.elapsedMin/60),m=a.elapsedMin%60;
   var wLabel=a.wageType==='daily'?'일급':'시급';
   return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(34,197,94,.1)">'+
   '<div><span style="font-size:13px;font-weight:800">'+esc(a.name)+'</span>'+
   '<span style="font-size:11px;color:var(--t3);margin-left:8px">'+wLabel+' '+a.wage.toLocaleString()+'원 · '+h+'h '+m+'m 근무중</span></div>'+
   '<div style="font-size:14px;font-weight:900;color:#22c55e">+₩'+a.earned.toLocaleString()+'</div></div>';
  }).join('')+
  '</div>';
 }).catch(function(){});
}

/* ── 고용유형 탭 필터 ── */
var _pwTabIdx=0;