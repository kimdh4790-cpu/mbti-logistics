/**
 * mbtico-ctrl.js — 관제센터 공통 모듈
 * 최종수정: 2026-08-04 | 담당: 엠비티아이 김형우
 *
 * [포함 기능]
 *   - Firebase 초기화 (Auth/Firestore/Storage)
 *   - 슈퍼어드민 인증 체크
 *   - 아코디언 UI 컨트롤
 *   - FCM 푸시 발송 (_ctrlNotify)
 *   - 공통 유틸 (_ctrlToast, _ctrlFmt, _ctrlBadge)
 *   - 각 섹션 로더 (대시보드/가입승인/고객사/채팅/공지/결제/AI리포트)
 *
 * [버그수정 2026-08-04]
 *   - 채팅목록 var shadowing (html 중복 선언) → 수정
 *   - 아코디언 _loaded 플래그 문제 → toggleOpen 상태 기반으로 교체
 *   - 가입승인: join_requests 대신 companies 조회 → 최초부터 통일
 *   - 대시보드 카운트업 애니메이션 추가
 *   - 테이블 정렬/필터/검색 개선 (sortKey 상태 관리)
 *   - 리스너 누수: 기존 _compUnsub 해제
 *   - feat-btn data-on 문자열 비교 버그 수정
 */

// ── Firebase 설정 ─────────────────────────────────────────────────
var _FB_CONFIG = {
  apiKey: 'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0',
  authDomain: 'mbti-logistics.firebaseapp.com',
  projectId: 'mbti-logistics',
  storageBucket: 'mbti-logistics.firebasestorage.app',
  messagingSenderId: '40761160761',
  appId: '1:40761160761:web:20545b610f03f534e949e8'
};

var _db = null, _auth = null, _storage = null;
var _CU = null;          // 현재 로그인 유저
var _unsubs = [];         // Firestore 전역 리스너 해제용
var _compUnsub = null;    // 고객사 실시간 리스너

var SA_EMAILS = ['kimdh4790@gmail.com', 'soungkyekim@naver.com'];

// ── SVG 아이콘 팩 ────────────────────────────────────────────────
var _ICONS = {
  users: '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M9 6a3 3 0 1 1 6 0A3 3 0 0 1 9 6zM17 15a5 5 0 0 0-10 0h10zM2 12a2.5 2.5 0 1 1 5 0A2.5 2.5 0 0 1 2 12zm6 3H1a4 4 0 0 1 7 0z"/></svg>',
  check: '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>',
  clock: '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5z" clip-rule="evenodd"/></svg>',
  warning: '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clip-rule="evenodd"/></svg>',
  bell: '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M4.214 3.227a.75.75 0 0 0-1.156-.956 8.97 8.97 0 0 0-1.856 3.826.75.75 0 1 0 1.466.316 7.47 7.47 0 0 1 1.546-3.186zm11.725-.956a.75.75 0 0 0-1.156.956 7.47 7.47 0 0 1 1.547 3.186.75.75 0 1 0 1.466-.316 8.97 8.97 0 0 0-1.857-3.826zM10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.91 32.91 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6zm0 15a2 2 0 0 1-1.983-1.737 31.36 31.36 0 0 0 3.966 0A2 2 0 0 1 10 17z"/></svg>',
  pause: '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5zm6 0a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5z"/></svg>',
  chat: '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M3.505 2.365A41.369 41.369 0 0 1 9 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 0 0-.577-.069 43.141 43.141 0 0 0-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 0 1 5 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914z"/><path d="M14 6c-.762 0-1.52.02-2.271.062C10.157 6.148 9 7.472 9 8.998v2.24c0 1.519 1.147 2.839 2.71 2.935a44.533 44.533 0 0 0 4.271.051 1 1 0 0 0 1.019-1v-5.24c0-1.525-1.157-2.85-2.71-2.935A44.55 44.55 0 0 0 14 6z"/></svg>',
  trend_up: '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M12.577 4.878a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V6.354l-4.062 4.062a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 0 1 0-1.06l5.378-5.378a.75.75 0 0 1 1.06 0L18.25 3.97V4.12z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M.572 14.25a.75.75 0 0 1 1.06 0L5 17.69l4.94-4.94a.75.75 0 0 1 1.06 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 0-1.06z" clip-rule="evenodd"/></svg>',
  ai: '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v1.836a.75.75 0 0 0 1.5 0V2.75zM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3.75 9.25a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1 0-1.5h1.75zM17.25 9.25a.75.75 0 0 1 0 1.5H18a.75.75 0 0 1 0-1.5h-.75zM10 15.25a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-1.5 0V16a.75.75 0 0 1 .75-.75zM4.697 4.697a.75.75 0 0 1 1.06 0l1.25 1.25a.75.75 0 0 1-1.06 1.06l-1.25-1.25a.75.75 0 0 1 0-1.06zm9.546 1.06 1.25-1.25a.75.75 0 1 1 1.06 1.06l-1.25 1.25a.75.75 0 1 1-1.06-1.06zM5.757 13.182a.75.75 0 0 1 0 1.06l-1.25 1.25a.75.75 0 0 1-1.06-1.06l1.25-1.25a.75.75 0 0 1 1.06 0zm8.485 0a.75.75 0 0 1 1.06 0l1.25 1.25a.75.75 0 1 1-1.06 1.06l-1.25-1.25a.75.75 0 0 1 0-1.06z"/></svg>'
};

// ── 초기화 ──────────────────────────────────────────────────────────
function _ctrlInit() {
  if (!firebase.apps.length) firebase.initializeApp(_FB_CONFIG);
  _db      = firebase.firestore();
  _auth    = firebase.auth();
  _storage = firebase.storage();

  _auth.onAuthStateChanged(function(user) {
    if (!user || !SA_EMAILS.includes(user.email)) {
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('main-screen').style.display  = 'none';
      return;
    }
    _CU = user;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-screen').style.display  = 'flex';
    document.getElementById('ctrl-user').textContent = user.email;
    _ctrlStartListeners();
  });
}

function _ctrlLogin() {
  var email = document.getElementById('l-email').value.trim();
  var pw    = document.getElementById('l-pw').value;
  _auth.signInWithEmailAndPassword(email, pw)
    .catch(function(e) { _ctrlToast('❌ ' + e.message); });
}

function _ctrlLogout() {
  _unsubs.forEach(function(u) { u && u(); });
  _unsubs = [];
  if (_compUnsub) { _compUnsub(); _compUnsub = null; }
  _auth.signOut();
}

// ── 슈퍼어드민 리스너 시작 ────────────────────────────────────────
function _ctrlStartListeners() {
  var u1 = _db.collection('companies')
    .where('status', '==', 'pending')
    .onSnapshot(function(snap) {
      _ctrlBadge('badge-join', snap.size);
    });
  _unsubs.push(u1);

  var u2 = _db.collection('chats')
    .onSnapshot(function(snap) {
      var total = 0;
      snap.forEach(function(d) { total += (d.data().unreadSA || 0); });
      _ctrlBadge('badge-chat', total);
    });
  _unsubs.push(u2);

  // 대시보드는 항상 열린 상태로 초기 로드
  _ctrlLoadDashboard();
}

// ── 아코디언 ─────────────────────────────────────────────────────
// 버그수정: _loaded 플래그가 toggle 방향에 관계없이 한번만 로드하던 문제
// → body.style.display 기반으로 열림/닫힘 판단, 최초 열릴 때만 로드
function _ctrlToggle(id) {
  var body = document.getElementById('acc-' + id);
  var icon = document.getElementById('ico-' + id);
  var isOpen = body.style.display !== 'none' && body.style.display !== '';
  if (isOpen) {
    body.style.display = 'none';
    icon.innerHTML = _svgChevron('right');
  } else {
    body.style.display = 'block';
    icon.innerHTML = _svgChevron('down');
    if (!body.dataset.loaded) {
      body.dataset.loaded = '1';
      var fn = {
        dashboard: _ctrlLoadDashboard,
        join:      _ctrlLoadJoin,
        companies: _ctrlLoadCompanies,
        chat:      _ctrlLoadChat,
        notice:    _ctrlLoadNotice,
        billing:   _ctrlLoadBilling,
        aireport:  _ctrlLoadAIReport
      }[id];
      if (fn) fn();
    }
  }
}

function _svgChevron(dir) {
  if (dir === 'down') return '<svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z" clip-rule="evenodd"/></svg>';
  return '<svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1-1.06 1.06L9 7.06l-2.47 2.47a.75.75 0 0 1-1.06-1.06l4.25-4.25z" clip-rule="evenodd"/></svg>';
}

// ── 공통 유틸 ────────────────────────────────────────────────────
function _ctrlToast(msg, type) {
  var t = document.createElement('div');
  t.className = 'ctrl-toast' + (type ? ' ctrl-toast-' + type : '');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.classList.add('ctrl-toast-show'); });
  setTimeout(function() {
    t.classList.remove('ctrl-toast-show');
    setTimeout(function() { t.remove(); }, 300);
  }, 3000);
}

function _ctrlBadge(id, n) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = n > 0 ? n : '';
  el.style.display = n > 0 ? 'inline-flex' : 'none';
}

function _ctrlFmtDate(val) {
  if (!val) return '-';
  if (val && typeof val.toDate === 'function') return val.toDate().toISOString().slice(0, 10);
  if (typeof val === 'string') return val.slice(0, 10);
  if (typeof val === 'number') return new Date(val).toISOString().slice(0, 10);
  return '-';
}

function _ctrlFmtTs(ts) {
  if (!ts) return '-';
  try {
    var d = (ts && typeof ts.toDate === 'function') ? ts.toDate()
          : (typeof ts === 'string' || typeof ts === 'number') ? new Date(ts)
          : ts;
    return d.toLocaleDateString('ko') + ' ' + d.toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return '-'; }
}

// ── XSS 방어 ─────────────────────────────────────────────────────
function _esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── 카운트업 애니메이션 ────────────────────────────────────────────
function _ctrlCountUp(el, target, duration) {
  duration = duration || 800;
  var start = 0;
  var startTime = null;
  var isFloat = String(target).includes('.');
  var decimals = isFloat ? (String(target).split('.')[1] || '').length : 0;
  function step(ts) {
    if (!startTime) startTime = ts;
    var progress = Math.min((ts - startTime) / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    var current = eased * target;
    el.textContent = isFloat ? current.toFixed(decimals) : Math.floor(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = isFloat ? target.toFixed(decimals) : target.toLocaleString();
  }
  requestAnimationFrame(step);
}

// ── FCM 푸시 발송 ─────────────────────────────────────────────────
function _ctrlNotify(type, dealerId, title, body, data) {
  return fetch('https://donway.ai.kr/api/ctrl-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: type, dealerId: dealerId, title: title, body: body, data: data || {} })
  }).catch(function() {});
}

// 승인 알림 (FCM + 카카오 + 이메일)
function _ctrlNotifyApproval(dealer) {
  var url  = 'https://donway.ai.kr/c/' + (dealer.slug || dealer.uid);
  var body = '가입이 승인됐습니다! 🎉\n전용URL: ' + url + '\n아이디: ' + dealer.email;
  _ctrlNotify('dealer', dealer.uid, '✅ DONWAY 가입 승인', body, {
    type: 'approval', url: url, loginId: dealer.email, slug: dealer.slug
  });
  fetch('https://donway.ai.kr/api/alimtalk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: dealer.phone || '',
      template: 'approval',
      params: { name: dealer.companyName, url: url, id: dealer.email }
    })
  }).catch(function() {});
  var svcs = dealer.services || [];
  var isFiloDine = svcs.some(function(s) {
    return ['filo','dine','table_order','kiosk','inventory'].includes(s);
  });
  var fromEmail = isFiloDine ? 'FILO·DINE <filo-dine@donway.ai.kr>' : 'DONWAY <all@donway.ai.kr>';
  var toEmails  = isFiloDine
    ? ['skypjh1101@naver.com','kimdh4790@gmail.com']
    : ['kimdh4790@gmail.com','soungkyekim@naver.com','skypjh1101@naver.com'];
  fetch('https://donway.ai.kr/api/ctrl-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'email',
      from: fromEmail,
      to: toEmails,
      subject: '[관제센터] ' + (dealer.companyName || '업체') + ' 가입 승인 완료',
      html: '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">' +
        '<h2 style="color:#0066ff">✅ 가입 승인 완료</h2>' +
        '<table style="width:100%;border-collapse:collapse">' +
        '<tr><td style="padding:8px;font-weight:700;color:#666">업체명</td><td style="padding:8px">' + _esc(dealer.companyName) + '</td></tr>' +
        '<tr style="background:#f8fafc"><td style="padding:8px;font-weight:700;color:#666">이메일</td><td style="padding:8px">' + _esc(dealer.email) + '</td></tr>' +
        '<tr><td style="padding:8px;font-weight:700;color:#666">전용URL</td><td style="padding:8px"><a href="' + url + '">' + url + '</a></td></tr>' +
        '</table>' +
        '<div style="margin-top:16px;padding:12px;background:#eff6ff;border-radius:8px;font-size:12px;color:#666">' +
        '승인자: ' + _esc(_CU ? _CU.email : '-') + ' · ' + new Date().toLocaleString('ko-KR') +
        '</div></div>'
    })
  }).catch(function() {});
}

// ── 📊 대시보드 KPI 카드 (카운트업 + 그라디언트) ──────────────────
function _ctrlLoadDashboard() {
  var c = document.getElementById('acc-dashboard');
  c.innerHTML = '<div class="ctrl-loading">로딩 중...</div>';

  Promise.all([
    _db.collection('companies').get(),
    _db.collection('companies').where('status', '==', 'pending').get()
  ]).then(function(results) {
    var all     = results[0];
    var pending = results[1];

    var total = all.size;
    var active = 0, trial = 0, suspended = 0;
    all.forEach(function(d) {
      var s = d.data().status;
      if (s === 'approved' || s === 'active') active++;
      else if (s === 'trial') trial++;
      else if (s === 'suspended') suspended++;
    });

    var soon = 0;
    var cutoff = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    var today  = new Date().toISOString().slice(0, 10);
    all.forEach(function(d) {
      var te = d.data().trialEnd || '';
      if (te >= today && te <= cutoff) soon++;
    });

    var cards = [
      { id: 'kpi-total',   label: '전체 고객사',  val: total,        icon: _ICONS.users,   grad: 'grad-blue'   },
      { id: 'kpi-active',  label: '활성',         val: active,       icon: _ICONS.check,   grad: 'grad-green'  },
      { id: 'kpi-trial',   label: '체험중',        val: trial,        icon: _ICONS.clock,   grad: 'grad-amber'  },
      { id: 'kpi-sus',     label: '정지',          val: suspended,    icon: _ICONS.pause,   grad: 'grad-red'    },
      { id: 'kpi-pending', label: '가입 대기',      val: pending.size, icon: _ICONS.bell,    grad: 'grad-purple' },
      { id: 'kpi-soon',    label: '만료 임박 7일', val: soon,         icon: _ICONS.warning, grad: 'grad-orange' }
    ];

    var html = '<div class="dash-grid">';
    cards.forEach(function(card) {
      html += '<div class="dash-card ' + card.grad + '">' +
        '<div class="dash-icon">' + card.icon + '</div>' +
        '<div class="dash-val" id="' + card.id + '">0</div>' +
        '<div class="dash-label">' + _esc(card.label) + '</div>' +
      '</div>';
    });
    html += '</div>';
    html += '<div class="ctrl-hint">※ 가입 대기 · 채팅 미읽음은 상단 뱃지에서 실시간 확인</div>';
    c.innerHTML = html;

    // 카운트업 개별 실행 (DOM 렌더 후)
    cards.forEach(function(card) {
      var el = document.getElementById(card.id);
      if (el) _ctrlCountUp(el, card.val, 900);
    });
  }).catch(function(e) {
    if (c) c.innerHTML = '<div class="ctrl-empty">오류: ' + _esc(e.message) + '</div>';
  });
}

// ── ✅ 가입 승인 ──────────────────────────────────────────────────
// 버그수정: join_requests 와 companies 중복 → companies.status=pending/hold 기준 통일
function _ctrlLoadJoin() {
  var c = document.getElementById('acc-join');
  c.innerHTML = '<div class="ctrl-loading">로딩 중...</div>';

  _db.collection('companies').limit(200).get().then(function(snap) {
    var docs = snap.docs.filter(function(d) {
      return ['pending', 'hold'].includes(d.data().status);
    });
    if (!docs.length) {
      c.innerHTML = '<div class="ctrl-empty">대기 중인 신청이 없습니다</div>';
      return;
    }
    var html = '<div class="ctrl-table-wrap"><table class="ctrl-table"><thead><tr>' +
      '<th>업체명</th><th>이메일</th><th>도메인</th><th>신청일</th><th>상태</th><th>처리</th>' +
      '</tr></thead><tbody>';
    docs.forEach(function(doc) {
      var d = doc.data(), id = doc.id;
      var statusBadge = d.status === 'pending'
        ? '<span class="badge badge-warn">대기</span>'
        : '<span class="badge badge-hold">보류</span>';
      var svcs = (d.services || []).join(',') || d.serviceType || '';
      var domain = svcs.includes('table_order') || svcs.includes('kiosk') || svcs.includes('filo')
        ? 'FILO'
        : svcs.includes('dine') ? 'DINE' : 'DONWAY';
      var createdStr = _ctrlFmtDate(d.createdAt);
      html += '<tr>' +
        '<td><b>' + _esc(d.companyName || d.name || '-') + '</b><br>' +
          '<span style="font-size:10px;color:var(--tx2)">' + _esc(d.bizNumber || '') + '</span></td>' +
        '<td style="font-size:11px">' + _esc(d.email || '-') + '</td>' +
        '<td><span class="badge badge-ok">' + _esc(domain) + '</span></td>' +
        '<td>' + _esc(createdStr) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' +
          '<button class="ctrl-btn ctrl-btn-ok" data-id="' + _esc(id) + '" onclick="_ctrlApprove(this.dataset.id)">' + _ICONS.check + ' 승인</button> ' +
          '<button class="ctrl-btn ctrl-btn-err" data-id="' + _esc(id) + '" onclick="_ctrlReject(this.dataset.id)">✕ 거절</button> ' +
          '<button class="ctrl-btn ctrl-btn-sub" data-id="' + _esc(id) + '" onclick="_ctrlHold(this.dataset.id)">' + _ICONS.pause + ' 보류</button>' +
        '</td></tr>';
    });
    html += '</tbody></table></div>';
    c.innerHTML = html;
  }).catch(function(e) {
    c.innerHTML = '<div class="ctrl-empty">오류: ' + _esc(e.message) + '</div>';
  });
}

function _ctrlApprove(dealerId) {
  _db.collection('companies').doc(dealerId).get().then(function(doc) {
    if (!doc.exists) return;
    var d = doc.data();
    var trialEnd = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    _db.collection('companies').doc(dealerId).update({
      status: 'trial',
      plan: 'trial',
      trialEnd: trialEnd,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      approvedBy: _CU.email
    });
    _ctrlNotifyApproval({
      uid: dealerId, email: d.email,
      companyName: d.companyName, phone: d.phone,
      slug: d.slug, services: d.services
    });
    _ctrlToast('✅ ' + (d.companyName || '업체') + ' 승인 완료! 알림 발송됨', 'ok');
    // 목록 새로고침
    setTimeout(function() {
      var body = document.getElementById('acc-join');
      if (body) { delete body.dataset.loaded; _ctrlLoadJoin(); }
    }, 600);
  });
}

function _ctrlReject(dealerId) {
  var reason = prompt('거절 사유 (고객에게 전달됩니다):');
  if (reason === null) return;
  _db.collection('companies').doc(dealerId).update({
    status: 'rejected',
    rejectReason: reason,
    rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    _ctrlToast('거절 처리 완료', 'err');
    var body = document.getElementById('acc-join');
    if (body) { delete body.dataset.loaded; _ctrlLoadJoin(); }
  });
}

function _ctrlHold(dealerId) {
  var memo = prompt('보류 메모:');
  if (memo === null) return;
  _db.collection('companies').doc(dealerId).update({
    status: 'hold', holdMemo: memo,
    heldAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() { _ctrlToast('⏸ 보류 처리 완료'); });
}

// ── 👥 고객사 관리 (정렬/필터/검색 개선) ─────────────────────────
var _compSearch = '', _compFilter = 'all';
var _compSort   = { key: 'companyName', asc: true };

function _ctrlLoadCompanies() {
  // 기존 리스너 정리 (누수 방지)
  if (_compUnsub) { _compUnsub(); _compUnsub = null; }

  var c = document.getElementById('acc-companies');
  c.innerHTML =
    '<div class="ctrl-toolbar">' +
      '<div class="ctrl-search-wrap">' +
        '<input id="comp-search" class="ctrl-input ctrl-input-search" placeholder="업체명/이메일 검색" ' +
          'oninput="_compSearch=this.value;_renderCompanies()" style="max-width:240px">' +
      '</div>' +
      '<select class="ctrl-select" onchange="_compFilter=this.value;_renderCompanies()">' +
        '<option value="all">전체 상태</option>' +
        '<option value="pending">가입 대기</option>' +
        '<option value="trial">체험중</option>' +
        '<option value="approved">활성</option>' +
        '<option value="active">활성(active)</option>' +
        '<option value="suspended">정지</option>' +
      '</select>' +
      '<select class="ctrl-select" onchange="_compSort.key=this.value;_renderCompanies()">' +
        '<option value="companyName">이름순</option>' +
        '<option value="trialEnd">만료일순</option>' +
        '<option value="createdAt">가입일순</option>' +
      '</select>' +
      '<button class="ctrl-btn ctrl-btn-sub" onclick="_compSort.asc=!_compSort.asc;_renderCompanies()" id="sort-dir-btn">↑ 오름차순</button>' +
    '</div>' +
    '<div id="comp-count" class="ctrl-hint" style="margin-bottom:8px"></div>' +
    '<div id="comp-list"><div class="ctrl-loading">로딩 중...</div></div>';

  _compUnsub = _db.collection('companies').limit(200)
    .onSnapshot(function(snap) {
      window._compDocs = [];
      snap.forEach(function(d) {
        var obj = d.data();
        obj._id = d.id;
        window._compDocs.push(obj);
      });
      _renderCompanies();
    }, function(e) {
      var list = document.getElementById('comp-list');
      if (list) list.innerHTML = '<div class="ctrl-empty">오류: ' + _esc(e.message) + '</div>';
    });
}

function _renderCompanies() {
  var q = (_compSearch || '').toLowerCase();
  var docs = (window._compDocs || []).filter(function(d) {
    var matchSearch = !q ||
      (d.companyName || '').toLowerCase().includes(q) ||
      (d.email || '').toLowerCase().includes(q) ||
      (d.phone || '').includes(q);
    var matchFilter = _compFilter === 'all' || d.status === _compFilter;
    return matchSearch && matchFilter;
  });

  // 정렬
  var sk = _compSort.key;
  docs.sort(function(a, b) {
    var av = a[sk] || '', bv = b[sk] || '';
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return _compSort.asc ? -1 : 1;
    if (av > bv) return _compSort.asc ? 1 : -1;
    return 0;
  });

  var btn = document.getElementById('sort-dir-btn');
  if (btn) btn.textContent = _compSort.asc ? '↑ 오름차순' : '↓ 내림차순';

  var countEl = document.getElementById('comp-count');
  if (countEl) countEl.textContent = docs.length + '개 업체';

  var c = document.getElementById('comp-list');
  if (!c) return;
  if (!docs.length) { c.innerHTML = '<div class="ctrl-empty">검색 결과 없음</div>'; return; }

  var html = '<div class="comp-cards">';
  docs.forEach(function(d) {
    var id = d._id;
    var statusMeta = {
      pending:   { color: '#f59e0b', label: '가입대기' },
      trial:     { color: '#f59e0b', label: '체험중'   },
      approved:  { color: '#22c55e', label: '활성'     },
      active:    { color: '#22c55e', label: '활성'     },
      suspended: { color: '#ef4444', label: '정지'     }
    }[d.status] || { color: '#888', label: d.status || '-' };

    html += '<div class="comp-card">' +
      '<div class="comp-card-head">' +
        '<div>' +
          '<div class="comp-name">' + _esc(d.companyName || d.name || '이름없음') + '</div>' +
          '<div class="comp-email">' + _esc(d.email || '-') + '</div>' +
        '</div>' +
        '<span class="badge" style="background:' + statusMeta.color + '20;color:' + statusMeta.color + '">' + statusMeta.label + '</span>' +
      '</div>' +
      '<div class="comp-meta">' +
        '<span>' + _ICONS.clock + ' 만료: ' + _esc(_ctrlFmtDate(d.trialEnd)) + '</span>' +
        '<span>📦 ' + _esc(d.plan || '-') + '</span>' +
        '<span>🔗 ' + _esc(d.slug || '-') + '</span>' +
        '<span>📞 ' + _esc(d.phone || '-') + '</span>' +
      '</div>' +
      '<div class="comp-actions">' +
        '<button class="ctrl-btn ctrl-btn-sub" data-id="' + _esc(id) + '" onclick="_ctrlOpenDetail(this.dataset.id)">📋 상세</button>' +
        '<button class="ctrl-btn ctrl-btn-sub" data-id="' + _esc(id) + '" data-nm="' + _esc(d.companyName || id) + '" onclick="_ctrlOpenChat(this.dataset.id,this.dataset.nm)">' + _ICONS.chat + ' 채팅</button>' +
        '<button class="ctrl-btn ctrl-btn-sub" data-id="' + _esc(id) + '" onclick="_ctrlExtendTrial(this.dataset.id)">⏰ 연장</button>' +
        (d.status !== 'suspended'
          ? '<button class="ctrl-btn ctrl-btn-err" data-id="' + _esc(id) + '" onclick="_ctrlSuspend(this.dataset.id)">' + _ICONS.pause + ' 정지</button>'
          : '<button class="ctrl-btn ctrl-btn-ok" data-id="' + _esc(id) + '" onclick="_ctrlUnsuspend(this.dataset.id)">▶ 복구</button>') +
      '</div>' +
      '<div class="comp-features">' +
        '<div class="feat-label">⚙️ 기능 토글</div>' +
        _renderFeatureToggles(id, d.services || []) +
      '</div>' +
    '</div>';
  });
  html += '</div>';
  c.innerHTML = html;
}

// ── 도메인별 기능 정의 ─────────────────────────────────────────────
var _DOMAIN_FEATURES = {
  donway: [
    { key: 'settle',     label: 'AI정산',        desc: '택배·물류·배달 정산 자동화' },
    { key: 'delivery',   label: '배달대행',        desc: '배달대행 수수료 정산' },
    { key: 'qr_payroll', label: 'QR출퇴근+급여',  desc: 'QR 근태관리 + 급여 계산' }
  ],
  filo: [
    { key: 'kiosk',          label: '키오스크/POS', desc: 'POS 결제 + 메뉴관리'          },
    { key: 'table_order',    label: '테이블오더',   desc: 'QR 테이블 주문'                },
    { key: 'inventory',      label: '재고관리',     desc: '재고 현황 + 자동발주'           },
    { key: 'qr_attend',      label: 'QR출퇴근',    desc: '직원 QR 근태관리'               },
    { key: 'reservation',    label: '예약관리',     desc: '예약 + 회원관리'                },
    { key: 'member_crm',     label: '회원CRM',      desc: '포인트 + 멤버십'               },
    { key: 'sales_analytics',label: '매출분석',     desc: '매출 리포트 + 마진'            },
    { key: 'bakery_qr',      label: '빵QR담기',     desc: '진열대 명판 QR → 테이블오더'   }
  ],
  dine: [
    { key: 'table_order',    label: '테이블오더',   desc: 'QR 테이블 주문'  },
    { key: 'dine_delivery',  label: '배달연동',     desc: '배달앱 연동 매출' },
    { key: 'sales_analytics',label: '매출분석',     desc: '일/월 매출 분석'  },
    { key: 'staff_mgmt',     label: '직원관리',     desc: '출퇴근 + 급여'    },
    { key: 'tax_invoice',    label: '세금계산서',   desc: '세무사 연동'       }
  ]
};

// 기능 토글 UI (개선: SVG 토글 슬라이더 스타일)
function _renderFeatureToggles(dealerId, services) {
  services = services || [];
  var sections = [
    { title: '📦 DONWAY', feats: _DOMAIN_FEATURES.donway },
    { title: '🍽 FILO',   feats: _DOMAIN_FEATURES.filo   },
    { title: '🌿 DINE',   feats: _DOMAIN_FEATURES.dine   }
  ];
  return sections.map(function(sec) {
    return '<div class="feat-section">' +
      '<div class="feat-section-title">' + sec.title + '</div>' +
      '<div class="feat-toggles">' +
      sec.feats.map(function(f) {
        var on = services.includes(f.key);
        // 버그수정: data-on 문자열 비교 문제 → 클로저 직접 캡처
        return '<label class="feat-toggle" title="' + _esc(f.desc) + '">' +
          '<input type="checkbox" class="feat-chk" ' + (on ? 'checked' : '') +
            ' data-did="' + _esc(dealerId) + '" data-key="' + _esc(f.key) + '"' +
            ' onchange="_ctrlToggleFeature(this.dataset.did,this.dataset.key,this.checked)">' +
          '<span class="feat-slider"></span>' +
          '<span class="feat-label-txt">' + _esc(f.label) + '</span>' +
        '</label>';
      }).join('') +
      '</div></div>';
  }).join('');
}

function _ctrlToggleFeature(dealerId, key, enable) {
  var op = enable
    ? firebase.firestore.FieldValue.arrayUnion(key)
    : firebase.firestore.FieldValue.arrayRemove(key);
  _db.collection('companies').doc(dealerId).update({ services: op })
    .then(function() {
      _ctrlToast((enable ? '✅ ' : '❌ ') + key + ' ' + (enable ? '활성화' : '비활성화'), enable ? 'ok' : 'err');
      _ctrlNotify('dealer', dealerId,
        enable ? '✅ 기능 활성화' : '❌ 기능 비활성화',
        key + ' 기능이 ' + (enable ? '활성화' : '비활성화') + '됐습니다.',
        { type: 'feature', key: key, enable: enable }
      );
    });
}

function _ctrlExtendTrial(dealerId) {
  var days = prompt('연장할 일수 (숫자만):', '30');
  if (!days || isNaN(days)) return;
  _db.collection('companies').doc(dealerId).get().then(function(doc) {
    var cur = doc.data().trialEnd || new Date().toISOString().slice(0, 10);
    var newDate = new Date(new Date(cur).getTime() + parseInt(days, 10) * 86400000).toISOString().slice(0, 10);
    _db.collection('companies').doc(dealerId).update({ trialEnd: newDate })
      .then(function() { _ctrlToast('⏰ 체험 ' + newDate + '까지 연장', 'ok'); });
  });
}

function _ctrlSuspend(dealerId) {
  if (!confirm('정지 처리하시겠습니까?')) return;
  _db.collection('companies').doc(dealerId).update({ status: 'suspended' })
    .then(function() { _ctrlToast('⏸ 정지 처리 완료', 'err'); });
}

function _ctrlUnsuspend(dealerId) {
  _db.collection('companies').doc(dealerId).update({ status: 'approved' })
    .then(function() { _ctrlToast('▶ 계정 복구 완료', 'ok'); });
}

// 고객사 상세 (서류 업로드)
function _ctrlOpenDetail(dealerId) {
  _db.collection('companies').doc(dealerId).get().then(function(doc) {
    var d = doc.data();
    var overlay = document.getElementById('detail-overlay');
    var box     = document.getElementById('detail-box');
    box.innerHTML =
      '<div class="modal-hdr">' +
        '<div class="modal-title">📋 ' + _esc(d.companyName || '고객사') + ' 상세</div>' +
        '<button class="modal-close" onclick="_ctrlCloseDetail()">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="detail-row"><b>이메일</b> ' + _esc(d.email || '-') + '</div>' +
        '<div class="detail-row"><b>연락처</b> ' + _esc(d.phone || '-') + '</div>' +
        '<div class="detail-row"><b>사업자번호</b> ' + _esc(d.bizNumber || '-') + '</div>' +
        '<div class="detail-row"><b>플랜</b> ' + _esc(d.plan || '-') + '</div>' +
        '<div class="detail-row"><b>체험만료</b> ' + _esc(_ctrlFmtDate(d.trialEnd)) + '</div>' +
        '<div class="detail-row"><b>슬러그</b> ' + _esc(d.slug || '-') + '</div>' +
        '<hr>' +
        '<div class="detail-section">📄 서류</div>' +
        _renderDocs(dealerId, d) +
      '</div>';
    overlay.style.display = 'flex';
  });
}

function _renderDocs(dealerId, d) {
  var docDefs = [
    { key: 'bizLicenseUrl', label: '사업자등록증' },
    { key: 'contractUrl',   label: '계약서'       },
    { key: 'idCardUrl',     label: '신분증 (선택)' }
  ];
  return docDefs.map(function(def) {
    var url = d[def.key];
    return '<div class="doc-row">' +
      '<span class="doc-label">' + _esc(def.label) + '</span>' +
      (url
        ? '<a href="' + url + '" target="_blank" class="ctrl-btn ctrl-btn-sub" rel="noreferrer noopener">👁 보기</a>'
        : '<span class="doc-none">미등록</span>') +
      '<label class="ctrl-btn ctrl-btn-sub" style="cursor:pointer">' +
        '📤 업로드' +
        '<input type="file" accept="image/*,.pdf" style="display:none" ' +
          'data-id="' + _esc(dealerId) + '" data-field="' + _esc(def.key) + '"' +
          ' onchange="_ctrlUploadDoc(this.dataset.id,this.dataset.field,this)">' +
      '</label>' +
    '</div>';
  }).join('');
}

function _ctrlUploadDoc(dealerId, field, input) {
  var file = input.files[0];
  if (!file) return;
  var ext  = file.name.split('.').pop();
  var path = 'companies/' + dealerId + '/' + field + '.' + ext;
  _ctrlToast('📤 업로드 중...');
  _storage.ref(path).put(file).then(function(snap) {
    return snap.ref.getDownloadURL();
  }).then(function(url) {
    var update = {};
    update[field] = url;
    update[field.replace('Url', 'UploadedAt')] = new Date().toISOString().slice(0, 10);
    return _db.collection('companies').doc(dealerId).update(update);
  }).then(function() {
    _ctrlToast('✅ 서류 업로드 완료', 'ok');
    _ctrlOpenDetail(dealerId);
  }).catch(function(e) { _ctrlToast('❌ ' + e.message, 'err'); });
}

function _ctrlCloseDetail() {
  document.getElementById('detail-overlay').style.display = 'none';
}

// ── 💬 채팅 (실시간 리스트 버그수정) ────────────────────────────
// 버그수정: _ctrlLoadChatList 내부 var html 재선언으로 루프 밖 html이 항상 빈 문자열
// → 외부 배열로 수집 후 join
var _chatDealerId = '', _chatUnsub = null;

function _ctrlLoadChat() {
  var c = document.getElementById('acc-chat');
  c.innerHTML =
    '<div class="chat-layout">' +
      '<div class="chat-list" id="chat-list"><div class="ctrl-loading">로딩 중...</div></div>' +
      '<div class="chat-room" id="chat-room">' +
        '<div class="chat-room-empty">' + _ICONS.chat + ' 좌측에서 고객사를 선택하세요</div>' +
      '</div>' +
    '</div>';
  _ctrlLoadChatList();
}

function _ctrlLoadChatList() {
  _db.collection('chats').orderBy('lastAt', 'desc')
    .onSnapshot(function(snap) {
      var list = document.getElementById('chat-list');
      if (!list) return;
      if (snap.empty) { list.innerHTML = '<div class="ctrl-empty">채팅 없음</div>'; return; }
      var items = [];
      snap.forEach(function(doc) {
        var d   = doc.data();
        var unread = d.unreadSA || 0;
        var active = _chatDealerId === doc.id ? ' chat-item-active' : '';
        items.push(
          '<div class="chat-item' + active + '" data-id="' + _esc(doc.id) + '" data-nm="' + _esc(d.companyName || doc.id) + '" onclick="_ctrlOpenChat(this.dataset.id,this.dataset.nm)">' +
            '<div class="chat-item-name">' + _esc(d.companyName || doc.id) +
              (unread ? '<span class="chat-badge">' + unread + '</span>' : '') +
            '</div>' +
            '<div class="chat-item-last">' + _esc((d.lastMsg || '').slice(0, 30)) + '</div>' +
          '</div>'
        );
      });
      list.innerHTML = items.join('');
    });
}

function _ctrlOpenChat(dealerId, companyName) {
  _chatDealerId = dealerId;
  if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; }

  _db.collection('chats').doc(dealerId).set({ unreadSA: 0 }, { merge: true });

  var room = document.getElementById('chat-room');
  if (!room) {
    var body = document.getElementById('acc-chat');
    if (body) { delete body.dataset.loaded; }
    _ctrlToggle('chat');
    setTimeout(function() { _ctrlOpenChat(dealerId, companyName); }, 500);
    return;
  }

  room.innerHTML =
    '<div class="chat-room-hdr">' +
      '<span>' + _ICONS.chat + '</span>' +
      '<span>' + _esc(companyName || dealerId) + '</span>' +
    '</div>' +
    '<div class="chat-msgs" id="chat-msgs"></div>' +
    '<div class="chat-input-row">' +
      '<input id="chat-input" class="ctrl-input" placeholder="메시지 입력... (Enter=전송)"' +
        ' onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();_ctrlSendChat();}">' +
      '<button class="ctrl-btn ctrl-btn-ok" onclick="_ctrlSendChat()">' + _ICONS.chat + ' 전송</button>' +
    '</div>';

  _chatUnsub = _db.collection('chats').doc(dealerId).collection('messages')
    .orderBy('createdAt', 'asc').limit(100)
    .onSnapshot(function(snap) {
      var msgs = document.getElementById('chat-msgs');
      if (!msgs) return;
      var items = [];
      snap.forEach(function(doc) {
        var d    = doc.data();
        var isSA = d.sender === 'sa';
        items.push(
          '<div class="chat-msg ' + (isSA ? 'chat-msg-sa' : 'chat-msg-dealer') + '">' +
            '<div class="chat-msg-text">' + _esc(d.text) + '</div>' +
            '<div class="chat-msg-time">' + _esc(_ctrlFmtTs(d.createdAt)) + '</div>' +
          '</div>'
        );
      });
      msgs.innerHTML = items.length ? items.join('') : '<div class="ctrl-empty">메시지 없음</div>';
      msgs.scrollTop = msgs.scrollHeight;
    });
}

function _ctrlSendChat() {
  if (!_chatDealerId) return;
  var input = document.getElementById('chat-input');
  var text  = (input ? input.value : '').trim();
  if (!text) return;
  input.value = '';

  var batch  = _db.batch();
  var msgRef = _db.collection('chats').doc(_chatDealerId).collection('messages').doc();
  batch.set(msgRef, {
    text: text, sender: 'sa',
    senderName: '엠비티아이 관리자',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(_db.collection('chats').doc(_chatDealerId), {
    lastMsg: text,
    lastAt:  firebase.firestore.FieldValue.serverTimestamp(),
    unreadCustomer: firebase.firestore.FieldValue.increment(1)
  }, { merge: true });
  batch.commit().then(function() {
    _ctrlNotify('dealer', _chatDealerId, '💬 관리자 메시지', text, { type: 'chat' });
  });
}

// ── 📢 공지 발송 ──────────────────────────────────────────────────
function _ctrlLoadNotice() {
  var c = document.getElementById('acc-notice');
  c.innerHTML =
    '<div class="notice-form">' +
      '<div class="ctrl-label">수신 대상</div>' +
      '<select id="n-target" class="ctrl-select">' +
        '<option value="all">전체 고객사</option>' +
        '<option value="active">활성 고객사만</option>' +
        '<option value="trial">체험 중만</option>' +
      '</select>' +
      '<div class="ctrl-label" style="margin-top:12px">제목</div>' +
      '<input id="n-title" class="ctrl-input" placeholder="공지 제목">' +
      '<div class="ctrl-label" style="margin-top:12px">내용</div>' +
      '<textarea id="n-body" class="ctrl-input" rows="4" placeholder="공지 내용" style="resize:vertical"></textarea>' +
      '<div style="margin-top:8px;font-size:12px;color:#888">✅ FCM 푸시 + Firestore notices 동시 저장</div>' +
      '<button class="ctrl-btn ctrl-btn-ok" style="margin-top:12px;width:100%" onclick="_ctrlSendNotice()">📢 발송</button>' +
    '</div>' +
    '<hr style="border-color:var(--bd);margin:16px 0">' +
    '<div class="ctrl-label">최근 공지</div>' +
    '<div id="notice-list"><div class="ctrl-loading">로딩 중...</div></div>';

  _db.collection('notices').orderBy('createdAt', 'desc').limit(10)
    .get().then(function(snap) {
      var list = document.getElementById('notice-list');
      if (!list) return;
      if (snap.empty) { list.innerHTML = '<div class="ctrl-empty">공지 없음</div>'; return; }
      var items = [];
      snap.forEach(function(doc) {
        var d = doc.data();
        items.push('<div class="notice-item">' +
          '<div class="notice-title">' + _esc(d.title || '-') + '</div>' +
          '<div class="notice-body">' + _esc((d.body || '').slice(0, 80)) + '</div>' +
          '<div class="notice-meta">' + _esc(_ctrlFmtDate(d.createdAt)) + ' · ' + _esc(d.target || '전체') + '</div>' +
        '</div>');
      });
      list.innerHTML = items.join('');
    });
}

function _ctrlSendNotice() {
  var title  = (document.getElementById('n-title').value || '').trim();
  var body   = (document.getElementById('n-body').value || '').trim();
  var target = document.getElementById('n-target').value;
  if (!title || !body) { _ctrlToast('제목과 내용을 입력하세요'); return; }

  _db.collection('notices').add({
    title: title, body: body, target: target,
    dealerId: null,
    createdAt: new Date().toISOString(),
    createdBy: _CU.email
  });
  _ctrlNotify(target === 'all' ? 'all' : 'group', target, '📢 ' + title, body, { type: 'notice' });
  _ctrlToast('📢 공지 발송 완료!', 'ok');
  document.getElementById('n-title').value = '';
  document.getElementById('n-body').value  = '';
  // 목록 새로고침
  var noticeBody = document.getElementById('acc-notice');
  if (noticeBody) { delete noticeBody.dataset.loaded; _ctrlLoadNotice(); }
}

// ── 💰 결제 현황 ──────────────────────────────────────────────────
function _ctrlLoadBilling() {
  var c = document.getElementById('acc-billing');
  c.innerHTML = '<div class="ctrl-loading">로딩 중...</div>';
  _db.collection('payment_requests').orderBy('createdAt', 'desc').limit(50)
    .get().then(function(snap) {
      if (snap.empty) { c.innerHTML = '<div class="ctrl-empty">결제 내역 없음</div>'; return; }
      var totalAmt = 0;
      var items = [];
      snap.forEach(function(doc) {
        var d = doc.data();
        totalAmt += (d.amount || 0);
        var statusColor = { paid: '#22c55e', pending: '#f59e0b', failed: '#ef4444' }[d.status] || '#888';
        items.push('<tr>' +
          '<td>' + _esc(d.companyName || '-') + '</td>' +
          '<td>' + _esc(d.plan || '-') + '</td>' +
          '<td>₩' + (d.amount || 0).toLocaleString() + '</td>' +
          '<td><span style="color:' + statusColor + '">' + _esc(d.status || '-') + '</span></td>' +
          '<td>' + _esc(_ctrlFmtDate(d.createdAt)) + '</td>' +
        '</tr>');
      });
      var html = '<div class="billing-total">이번 조회 합계: <b>₩' + totalAmt.toLocaleString() + '</b></div>' +
        '<div class="ctrl-table-wrap"><table class="ctrl-table"><thead><tr>' +
        '<th>업체명</th><th>플랜</th><th>금액</th><th>상태</th><th>일자</th>' +
        '</tr></thead><tbody>' + items.join('') + '</tbody></table></div>';
      c.innerHTML = html;
    }).catch(function(e) {
      c.innerHTML = '<div class="ctrl-empty">오류: ' + _esc(e.message) + '</div>';
    });
}

// ── 🤖 Claude AI 주간 현황 리포트 ──────────────────────────────────
var _aiReportData = null;

function _ctrlLoadAIReport() {
  var c = document.getElementById('acc-aireport');
  c.innerHTML =
    '<div class="ai-report-wrap">' +
      '<div class="ai-report-header">' +
        '<div class="ai-report-title">' + _ICONS.ai + ' Claude AI 주간 현황 리포트</div>' +
        '<button class="ctrl-btn ctrl-btn-ok" onclick="_ctrlGenAIReport()" id="ai-gen-btn">🔄 리포트 생성</button>' +
      '</div>' +
      '<div id="ai-report-out" class="ai-report-out">' +
        '<div class="ai-report-placeholder">' +
          '<div>' + _ICONS.ai + '</div>' +
          '<div>버튼을 눌러 이번 주 현황 AI 분석을 생성하세요</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function _ctrlGenAIReport() {
  var btn = document.getElementById('ai-gen-btn');
  var out = document.getElementById('ai-report-out');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 분석 중...'; }
  if (out) out.innerHTML = '<div class="ctrl-loading">Claude가 데이터를 분석하고 있습니다...</div>';

  // 1. Firestore에서 주간 데이터 수집
  var weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  Promise.all([
    _db.collection('companies').get(),
    _db.collection('chats').get(),
    _db.collection('payment_requests').get(),
    _db.collection('join_requests').limit(50).get()
  ]).then(function(results) {
    var companies = results[0];
    var chats     = results[1];
    var payments  = results[2];
    var joins     = results[3];

    var stats = {
      totalCompanies: companies.size,
      byStatus: { pending: 0, trial: 0, approved: 0, active: 0, suspended: 0 },
      totalUnread: 0,
      totalRevenue: 0,
      paidCount: 0,
      pendingJoins: 0,
      trialExpiringSoon: 0
    };

    var today  = new Date().toISOString().slice(0, 10);
    var cutoff = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    companies.forEach(function(d) {
      var s = d.data().status || 'unknown';
      if (stats.byStatus.hasOwnProperty(s)) stats.byStatus[s]++;
      var te = d.data().trialEnd || '';
      if (te >= today && te <= cutoff) stats.trialExpiringSoon++;
      if (s === 'pending') stats.pendingJoins++;
    });

    chats.forEach(function(d) { stats.totalUnread += (d.data().unreadSA || 0); });

    payments.forEach(function(d) {
      if (d.data().status === 'paid') {
        stats.totalRevenue += (d.data().amount || 0);
        stats.paidCount++;
      }
    });

    var today2 = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    var prompt = [
      '당신은 SaaS 플랫폼 운영 분석가입니다.',
      '다음은 [엠비티아이] 관제센터의 현재 데이터입니다. 한국어로 주간 현황 리포트를 작성해주세요.',
      '',
      '=== 현황 데이터 (' + today2 + ') ===',
      '전체 고객사: ' + stats.totalCompanies + '개',
      '상태별: 가입대기 ' + stats.byStatus.pending + ', 체험중 ' + stats.byStatus.trial + ', 활성(approved) ' + stats.byStatus.approved + ', 활성(active) ' + stats.byStatus.active + ', 정지 ' + stats.byStatus.suspended,
      '7일 내 만료 임박: ' + stats.trialExpiringSoon + '개',
      '채팅 미읽음: ' + stats.totalUnread + '건',
      '결제 완료 건수: ' + stats.paidCount + '건 / 총 ₩' + stats.totalRevenue.toLocaleString(),
      '',
      '=== 리포트 형식 ===',
      '1. **📊 주요 지표 요약** (2~3줄)',
      '2. **⚠️ 즉시 조치 필요 사항** (우선순위 top 3)',
      '3. **💡 운영 인사이트 및 권장 사항** (2~3가지)',
      '4. **📈 다음 주 예상 포커스**',
      '',
      '간결하고 실용적으로 작성하세요. 마크다운 사용 가능.'
    ].join('\n');

    // 2. Worker API 호출 → Claude Haiku
    return fetch('https://mbtico.kr/api/ctrl-ai-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, stats: stats })
    });
  }).then(function(resp) {
    return resp.json();
  }).then(function(data) {
    var out = document.getElementById('ai-report-out');
    var btn = document.getElementById('ai-gen-btn');
    if (btn) { btn.disabled = false; btn.textContent = '🔄 다시 생성'; }
    if (!out) return;
    if (data.error) {
      out.innerHTML = '<div class="ctrl-empty">❌ ' + _esc(data.error) + '</div>';
      return;
    }
    // 마크다운 간단 렌더링 (bold, heading, list)
    var md = (data.report || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/^#{1,3} (.+)/gm, '<h4 class="ai-h4">$1</h4>');
    md = md.replace(/^- (.+)/gm, '<li>$1</li>');
    md = md.replace(/(<li>.*<\/li>)/gs, '<ul class="ai-ul">$1</ul>');
    md = md.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
    out.innerHTML =
      '<div class="ai-report-meta">생성: ' + new Date().toLocaleString('ko-KR') + '</div>' +
      '<div class="ai-report-body">' + md + '</div>';
  }).catch(function(e) {
    var out = document.getElementById('ai-report-out');
    var btn = document.getElementById('ai-gen-btn');
    if (btn) { btn.disabled = false; btn.textContent = '🔄 리포트 생성'; }
    if (out) out.innerHTML = '<div class="ctrl-empty">❌ ' + _esc(e.message) + '</div>';
  });
}
