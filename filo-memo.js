/* ================================================================
 * filo-memo.js  — 전체 앱 공통 자유 메모장
 * Firestore 컬렉션: filo_memos
 * 필드: uid, scopeId (dealerId 또는 uid), content, pinned, createdAt, updatedAt
 * ================================================================ */

(function(){
  'use strict';

  /* ── 상수 ─────────────────────────────────────────────────────── */
  var COL = 'filo_memos';
  var MAX_CONTENT = 1000;
  var ICON_MEMO = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  var ICON_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var ICON_PLUS = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  var ICON_TRASH = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  var ICON_PIN = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>';

  /* ── 상태 ─────────────────────────────────────────────────────── */
  var _open = false;
  var _unsub = null;
  var _memos = [];
  var _ready = false;
  var _badgeCount = 0;

  /* ── CSS 주입 ─────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    /* 플로팅 버튼 */
    '#_memo-fab{position:fixed;bottom:80px;right:16px;z-index:9990;width:48px;height:48px;',
    'border-radius:50%;background:#c9a84c;border:none;cursor:pointer;',
    'box-shadow:0 4px 14px rgba(201,168,76,.45);display:flex;align-items:center;',
    'justify-content:center;color:#08101f;transition:transform .18s,opacity .18s;',
    'opacity:0;pointer-events:none}',
    '#_memo-fab.visible{opacity:1;pointer-events:auto}',
    '#_memo-fab:active{transform:scale(.92)}',
    '#_memo-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;',
    'border-radius:99px;font-size:10px;font-weight:700;min-width:18px;height:18px;',
    'display:flex;align-items:center;justify-content:center;padding:0 3px;',
    'pointer-events:none;display:none}',
    /* 패널 backdrop */
    '#_memo-backdrop{position:fixed;inset:0;z-index:9991;background:rgba(0,0,0,.5);',
    'opacity:0;pointer-events:none;transition:opacity .22s}',
    '#_memo-backdrop.active{opacity:1;pointer-events:auto}',
    /* 패널 */
    '#_memo-panel{position:fixed;bottom:0;left:0;right:0;z-index:9992;',
    'background:#0d1b2e;border-radius:20px 20px 0 0;',
    'box-shadow:0 -4px 32px rgba(0,0,0,.5);',
    'transform:translateY(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);',
    'display:flex;flex-direction:column;max-height:80vh;min-height:300px}',
    '#_memo-panel.open{transform:translateY(0)}',
    /* 패널 내부 */
    '#_memo-header{padding:16px 16px 12px;display:flex;align-items:center;',
    'justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}',
    '#_memo-header-title{font-size:15px;font-weight:700;color:#e8e4d0;',
    'display:flex;align-items:center;gap:8px}',
    '#_memo-close-btn{width:32px;height:32px;border-radius:50%;border:none;',
    'background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);cursor:pointer;',
    'display:flex;align-items:center;justify-content:center}',
    '#_memo-close-btn:active{background:rgba(255,255,255,.15)}',
    /* 작성 영역 */
    '#_memo-compose{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0}',
    '#_memo-textarea{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);',
    'border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#e8e4d0;',
    'font-size:13px;line-height:1.5;padding:10px 12px;resize:none;font-family:Pretendard,sans-serif;',
    'outline:none;transition:border-color .15s}',
    '#_memo-textarea:focus{border-color:rgba(201,168,76,.6)}',
    '#_memo-compose-row{display:flex;justify-content:space-between;align-items:center;margin-top:8px}',
    '#_memo-charcount{font-size:11px;color:rgba(255,255,255,.35)}',
    '#_memo-save-btn{background:#c9a84c;color:#08101f;border:none;border-radius:8px;',
    'padding:7px 16px;font-size:13px;font-weight:700;cursor:pointer;',
    'display:flex;align-items:center;gap:5px;transition:opacity .15s}',
    '#_memo-save-btn:disabled{opacity:.4;cursor:default}',
    '#_memo-save-btn:not(:disabled):active{opacity:.8}',
    /* 목록 */
    '#_memo-list{flex:1;overflow-y:auto;padding:8px 0}',
    '._memo-empty{padding:40px 16px;text-align:center;color:rgba(255,255,255,.3);font-size:13px}',
    '._memo-item{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);',
    'display:flex;gap:10px;align-items:flex-start}',
    '._memo-item.pinned{background:rgba(201,168,76,.06)}',
    '._memo-content{flex:1;font-size:13px;color:rgba(255,255,255,.85);',
    'line-height:1.55;white-space:pre-wrap;word-break:break-all}',
    '._memo-meta{font-size:11px;color:rgba(255,255,255,.3);margin-top:4px}',
    '._memo-actions{display:flex;flex-direction:column;gap:6px;flex-shrink:0}',
    '._memo-pin-btn,._memo-del-btn{width:28px;height:28px;border-radius:7px;border:none;',
    'cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s}',
    '._memo-pin-btn{background:rgba(255,255,255,.06);color:rgba(255,255,255,.4)}',
    '._memo-pin-btn.active{background:rgba(201,168,76,.18);color:#c9a84c}',
    '._memo-pin-btn:active{opacity:.7}',
    '._memo-del-btn{background:rgba(239,68,68,.1);color:#ef4444}',
    '._memo-del-btn:active{opacity:.7}',
    '._memo-pinlabel{font-size:10px;color:#c9a84c;font-weight:700;letter-spacing:.03em}',
    /* 모바일 하단 탭바 여유 */
    '@media(max-width:600px){#_memo-fab{bottom:72px}}'
  ].join('');
  document.head.appendChild(style);

  /* ── DOM 생성 ─────────────────────────────────────────────────── */
  function _buildDOM(){
    // FAB
    var fab = document.createElement('button');
    fab.id = '_memo-fab';
    fab.innerHTML = ICON_MEMO + '<span id="_memo-badge"></span>';
    fab.setAttribute('title','메모장');
    fab.onclick = _toggle;
    document.body.appendChild(fab);

    // Backdrop
    var bd = document.createElement('div');
    bd.id = '_memo-backdrop';
    bd.onclick = _close;
    document.body.appendChild(bd);

    // Panel
    var panel = document.createElement('div');
    panel.id = '_memo-panel';
    panel.innerHTML = [
      '<div id="_memo-header">',
        '<div id="_memo-header-title">',
          ICON_MEMO,
          '<span>메모장</span>',
        '</div>',
        '<button id="_memo-close-btn" onclick="_memoClose()">'+ICON_CLOSE+'</button>',
      '</div>',
      '<div id="_memo-compose">',
        '<textarea id="_memo-textarea" rows="3" maxlength="'+MAX_CONTENT+'" placeholder="메모를 입력하세요..."></textarea>',
        '<div id="_memo-compose-row">',
          '<span id="_memo-charcount">0 / '+MAX_CONTENT+'</span>',
          '<button id="_memo-save-btn" onclick="_memoSave()" disabled>'+ICON_PLUS+' 저장</button>',
        '</div>',
      '</div>',
      '<div id="_memo-list"><div class="_memo-empty">메모가 없습니다</div></div>'
    ].join('');
    document.body.appendChild(panel);

    // textarea 이벤트
    var ta = document.getElementById('_memo-textarea');
    ta.addEventListener('input', function(){
      var len = ta.value.length;
      document.getElementById('_memo-charcount').textContent = len + ' / ' + MAX_CONTENT;
      document.getElementById('_memo-save-btn').disabled = (len === 0);
    });
  }

  /* ── scopeId 결정 (dealerId 우선, 없으면 uid) ─────────────────── */
  function _getScopeId(){
    // FILO·DINE: _CU.dealerId
    if(window._CU && window._CU.dealerId) return window._CU.dealerId;
    // 용차앱: _CU.uid or firebase.auth().currentUser.uid
    if(window._CU && window._CU.uid) return window._CU.uid;
    if(window._auth && window._auth.currentUser) return window._auth.currentUser.uid;
    if(window.firebase && window.firebase.auth && window.firebase.auth().currentUser){
      return window.firebase.auth().currentUser.uid;
    }
    return null;
  }

  function _getUid(){
    if(window._CU && window._CU.uid) return window._CU.uid;
    if(window._auth && window._auth.currentUser) return window._auth.currentUser.uid;
    if(window.firebase && window.firebase.auth && window.firebase.auth().currentUser){
      return window.firebase.auth().currentUser.uid;
    }
    return null;
  }

  function _getDb(){
    if(window._db) return window._db;
    if(window.firebase && window.firebase.firestore) return window.firebase.firestore();
    return null;
  }

  /* ── 날짜 포맷 ────────────────────────────────────────────────── */
  function _fmtDate(ts){
    if(!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var mo = d.getMonth()+1, dy = d.getDate();
    var hr = d.getHours(), mn = d.getMinutes();
    return (mo<10?'0':'')+mo+'/'+(dy<10?'0':'')+dy+' '+(hr<10?'0':'')+hr+':'+(mn<10?'0':'')+mn;
  }

  /* ── 목록 렌더 ────────────────────────────────────────────────── */
  function _renderList(){
    var el = document.getElementById('_memo-list');
    if(!el) return;
    if(!_memos.length){
      el.innerHTML = '<div class="_memo-empty">메모가 없습니다</div>';
      return;
    }
    var sorted = _memos.slice().sort(function(a,b){
      if(a.pinned && !b.pinned) return -1;
      if(!a.pinned && b.pinned) return 1;
      var at = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
      var bt = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
      return bt - at;
    });
    el.innerHTML = sorted.map(function(m){
      return [
        '<div class="_memo-item'+(m.pinned?' pinned':'')+'" data-id="'+m.id+'">',
          '<div style="flex:1">',
            m.pinned ? '<div class="_memo-pinlabel">'+ICON_PIN+' 고정됨</div>' : '',
            '<div class="_memo-content">'+_esc(m.content)+'</div>',
            '<div class="_memo-meta">'+_fmtDate(m.createdAt)+'</div>',
          '</div>',
          '<div class="_memo-actions">',
            '<button class="_memo-pin-btn'+(m.pinned?' active':'')+'" title="'+(m.pinned?'고정 해제':'고정')+'"',
              ' onclick="_memoTogglePin(\''+m.id+'\','+!!m.pinned+')">'+ICON_PIN+'</button>',
            '<button class="_memo-del-btn" title="삭제" onclick="_memoDel(\''+m.id+'\')">'+ICON_TRASH+'</button>',
          '</div>',
        '</div>'
      ].join('');
    }).join('');
  }

  function _esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Firestore 구독 ───────────────────────────────────────────── */
  function _subscribe(){
    var db = _getDb();
    var scopeId = _getScopeId();
    if(!db || !scopeId) return;
    if(_unsub){ _unsub(); _unsub=null; }
    try{
      _unsub = db.collection(COL)
        .where('scopeId','==',scopeId)
        .orderBy('createdAt','desc')
        .limit(200)
        .onSnapshot(function(snap){
          _memos = [];
          snap.forEach(function(doc){
            _memos.push(Object.assign({id:doc.id}, doc.data()));
          });
          _renderList();
          // 배지: 핀된 메모 수
          _badgeCount = _memos.filter(function(m){return m.pinned;}).length;
          _updateBadge();
        }, function(){ /* 권한 오류 무시 */ });
    }catch(e){}
  }

  function _updateBadge(){
    var b = document.getElementById('_memo-badge');
    if(!b) return;
    if(_badgeCount > 0){
      b.style.display = 'flex';
      b.textContent = _badgeCount > 9 ? '9+' : String(_badgeCount);
    } else {
      b.style.display = 'none';
    }
  }

  /* ── 저장 ────────────────────────────────────────────────────── */
  window._memoSave = function(){
    var ta = document.getElementById('_memo-textarea');
    var btn = document.getElementById('_memo-save-btn');
    if(!ta) return;
    var content = ta.value.trim();
    if(!content) return;
    var db = _getDb();
    var scopeId = _getScopeId();
    var uid = _getUid();
    if(!db || !scopeId){ _memoToast('로그인이 필요합니다'); return; }
    btn.disabled = true;
    btn.textContent = '저장 중...';
    try{
      db.collection(COL).add({
        uid: uid || scopeId,
        scopeId: scopeId,
        content: content,
        pinned: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function(){
        ta.value = '';
        document.getElementById('_memo-charcount').textContent = '0 / '+MAX_CONTENT;
        btn.innerHTML = ICON_PLUS + ' 저장';
        btn.disabled = true;
        _memoToast('메모 저장됨');
      }).catch(function(){
        btn.innerHTML = ICON_PLUS + ' 저장';
        btn.disabled = false;
        _memoToast('저장 실패');
      });
    }catch(e){
      btn.innerHTML = ICON_PLUS + ' 저장';
      btn.disabled = false;
    }
  };

  /* ── 삭제 ────────────────────────────────────────────────────── */
  window._memoDel = function(id){
    var db = _getDb();
    if(!db || !id) return;
    try{ db.collection(COL).doc(id).delete().catch(function(){}); }catch(e){}
  };

  /* ── 핀 토글 ─────────────────────────────────────────────────── */
  window._memoTogglePin = function(id, pinned){
    var db = _getDb();
    if(!db || !id) return;
    try{
      db.collection(COL).doc(id).update({
        pinned: !pinned,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function(){});
    }catch(e){}
  };

  /* ── 패널 열기/닫기 ───────────────────────────────────────────── */
  window._memoClose = _close;

  function _toggle(){
    if(_open) _close(); else _openPanel();
  }

  function _openPanel(){
    _open = true;
    _subscribe();
    document.getElementById('_memo-backdrop').classList.add('active');
    var panel = document.getElementById('_memo-panel');
    panel.classList.add('open');
    setTimeout(function(){
      var ta = document.getElementById('_memo-textarea');
      if(ta) ta.focus();
    }, 200);
  }

  function _close(){
    _open = false;
    document.getElementById('_memo-backdrop').classList.remove('active');
    document.getElementById('_memo-panel').classList.remove('open');
    if(_unsub){ _unsub(); _unsub=null; }
  }

  /* ── 토스트 (filo/dine/yongcha 공통 처리) ─────────────────────── */
  function _memoToast(msg){
    if(window._filoToast){ window._filoToast(msg); return; }
    if(window._dineToast){ window._dineToast(msg); return; }
    // 용차앱 등 자체 토스트
    var t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position:'fixed',bottom:'140px',left:'50%',transform:'translateX(-50%)',
      background:'rgba(30,30,50,.92)',color:'#e8e4d0',padding:'8px 16px',
      borderRadius:'20px',fontSize:'13px',zIndex:'99999',
      boxShadow:'0 2px 12px rgba(0,0,0,.4)',transition:'opacity .3s'
    });
    document.body.appendChild(t);
    setTimeout(function(){ t.style.opacity='0'; }, 1600);
    setTimeout(function(){ t.parentNode && t.parentNode.removeChild(t); }, 2000);
  }

  /* ── FAB 표시 제어 (로그인 감지) ─────────────────────────────── */
  function _showFab(){
    var fab = document.getElementById('_memo-fab');
    if(fab) fab.classList.add('visible');
    _ready = true;
  }
  function _hideFab(){
    var fab = document.getElementById('_memo-fab');
    if(fab) fab.classList.remove('visible');
    _ready = false;
    if(_open) _close();
  }

  /* ── 초기화 ──────────────────────────────────────────────────── */
  function _init(){
    _buildDOM();

    // FILO·DINE: filo-auth.js의 onAuthStateChanged 이후 _CU가 설정됨
    // → _CU.dealerId가 설정될 때까지 폴링
    var _pollCount = 0;
    var _poll = setInterval(function(){
      _pollCount++;
      var scopeId = _getScopeId();
      if(scopeId){
        clearInterval(_poll);
        _showFab();
        // 로그아웃 감지
        try{
          var authProvider = window.firebase && window.firebase.auth ? window.firebase.auth() : (window._auth || null);
          if(authProvider && authProvider.onAuthStateChanged){
            authProvider.onAuthStateChanged(function(u){
              if(u){ _showFab(); }
              else { _hideFab(); }
            });
          }
        }catch(e){}
      }
      if(_pollCount > 80) clearInterval(_poll); // 40초 후 포기
    }, 500);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
