// DONWAY 배달정산 기사·관리자 권한 분리 (사용자 2026-11-25: 기사 정산서에 '초과분 메꿈'이 보이고 관리자 내용도 볼 수 있다는 신고)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'donway-pages', 'index.html'), 'utf8');
const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('not found ' + a); return src.slice(i, j); };

const guard = cut('function _dwIsDriverAcct(', 'var MENUS = MENUS_SETTLE;');
const mk = (cu, sa) => new Function('_CU', 'isSuperAdmin', guard + '\nreturn {_dwIsDriverAcct,_DW_ADMIN_PAGES};')(cu, () => !!sa);

test('기사·직원 계정은 관리자 화면 대상, 대리점·슈퍼어드민은 아님', () => {
  assert.strictEqual(mk({ role: 'driver' })._dwIsDriverAcct(), true);
  assert.strictEqual(mk({ role: 'member' })._dwIsDriverAcct(), true);
  assert.strictEqual(mk({ role: 'dealer', dlvDriver: true })._dwIsDriverAcct(), true);
  assert.strictEqual(mk({ role: 'dealer' })._dwIsDriverAcct(), false);
  assert.strictEqual(mk({ role: 'driver' }, true)._dwIsDriverAcct(), false);
  assert.deepStrictEqual(mk({})._DW_ADMIN_PAGES.sort(), ['delivery_admin', 'delivery_drivers', 'delivery_platform', 'delivery_report', 'delivery_settle']);
});
test('대리점 정산 화면·정산서·페이지 이동 모두 기사 계정을 막음', () => {
  assert.match(cut('function pageDeliverySettle(', '\n}'), /_dwIsDriverAcct\(\)\)\{goPage\('delivery_input'\)/);
  assert.match(cut('function pageBaeminSettle(', '\n}'), /_dwIsDriverAcct\(\)\)\{goPage\('delivery_input'\)/);
  assert.match(cut('function goPage(', 'window._currentPage=page'), /_DW_ADMIN_PAGES\.indexOf\(page\)>=0\)page='delivery_input'/);
  assert.match(cut('function _bsStmtHtml(', 'var R='), /_dwIsDriverAcct\(\)\)forDriver=true/);
});
test('기사에게 보내는 정산 값에 메꿈액·메꿈 건수·일자별 내역이 없음', () => {
  const pub = cut('bm.settle={', '};');
  for (const k of ['over:', 'high:', 'days:', 'margin:']) assert.ok(!pub.includes(k), k + ' 가 기사 데이터에 들어감');
});
test('역할이 비어 있는 다른 회사 소속 계정은 대리점으로 보지 않음', () => {
  assert.match(src, /if\(!d\.role&&d\.dealerId!==user\.uid\)\{/);
});
test('Firestore: 기사 계정은 배달정산 원본(delivery_sessions)을 못 읽고 못 고침', () => {
  const line = rules.split('\n').find(l => l.includes('match /delivery_sessions/'));
  assert.match(line, /allow read: if \(canRead\(\) && notDrvAcct\(\)\) \|\| drvOwnSession\(docId\)/);
  assert.match(line, /allow update: if \(canOwn\(\) && notDrvAcct\(\)\)/);
  assert.ok(!/allow create: if canWrite\(\) \|\| isAuth\(\)/.test(line));
});

test('배달 기사 관리: 주민번호 전체 보기·복사는 대리점만 (기사 계정은 빈 값)', () => {
  const code = cut('function _bsSsnFull(', 'function _bsDrvLabel(');
  const mk2 = (cu) => new Function('_CU', 'isSuperAdmin', 'window', guard + code + '\nreturn {_bsSsnFull,_ddSsnCur,_bsSsnMask};')(cu, () => false, { _ddAll: [{ _id: 'a', ssn: '8501011234567' }], _ddEditing: 'a' });
  const dealer = mk2({ role: 'dealer' });
  assert.strictEqual(dealer._bsSsnMask('8501011234567'), '850101-1******');
  assert.strictEqual(dealer._bsSsnFull('850101-1234567'), '850101-1234567');
  assert.strictEqual(dealer._ddSsnCur(), '850101-1234567');
  assert.strictEqual(mk2({ role: 'driver' })._ddSsnCur(), '');
  assert.strictEqual(mk2({ role: 'member' })._ddSsnCur(), '');
  assert.ok(src.includes('onclick="_ddSsnToggle()">전체 보기</button>'));
});

test('기사 명단(drivers): 기사 계정은 본인 줄만, 본인 줄은 푸시 토큰만 수정, settlements 규칙은 그대로', () => {
  const m = rules.match(/match \/drivers\/\{docId\} \{[\s\S]*?\n    \}/);
  assert.ok(m, 'drivers 규칙 블록');
  const b = m[0];
  assert.match(b, /allow read: if \(canRead\(\) && !isDrvAcct\(\)\) \|\| drvOwnRow\(\);/);
  assert.match(b, /allow create: if canWrite\(\) && !isDrvAcct\(\);/);
  assert.match(b, /hasOnly\(\['fcmToken','fcmTokens','fcmUpdatedAt'\]\)/);
  assert.match(b, /allow delete: if canOwn\(\) && !isDrvAcct\(\);/);
  assert.match(rules, /function isDrvAcct\(\)[\s\S]*?!isSuperAdmin\(\)[\s\S]*?members/);
  assert.match(rules, /match \/settlements\/\{docId\}\s+\{ allow read: if canRead\(\); allow create: if canWrite\(\); allow update, delete: if canOwn\(\); \}/);
});
