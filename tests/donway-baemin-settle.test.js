// DONWAY 배달대행 정산 — 배민 정산법(도달 구간 단가를 1건부터 전체 적용) 테스트
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'donway-pages', 'index.html'), 'utf8');
const a = src.indexOf('var _DW_EATS_DEFAULT=');
const b = src.indexOf('// ── 정산 방식 설정 모달 ──');
const api = new Function(src.slice(a, b) + '\nreturn {_DW_EATS_DEFAULT,_DW_BAEMIN_DEFAULT,_dwPlat,_dwEatsCfg,_dwEatsGross,_dwEatsBreakdown,_dwEatsCalcDriver};')();
const B = api._DW_BAEMIN_DEFAULT;
const g = (n) => api._dwEatsGross(n, B.tiers, 'flat');

test('배민 기본값: 1/200/300/400건 → 3,200/4,000/4,500/5,000, 전체 적용', () => {
  assert.strictEqual(B.tierMode, 'flat');
  assert.deepStrictEqual(B.tiers.map(t => [t.min, t.rate]), [[1, 3200], [200, 4000], [300, 4500], [400, 5000]]);
});

test('도달 구간 단가 × 전체 건수 (통화 예시)', () => {
  assert.strictEqual(g(0), 0);
  assert.strictEqual(g(17), 17 * 3200);   // 100건 미만도 3,200
  assert.strictEqual(g(199), 199 * 3200);
  assert.strictEqual(g(200), 200 * 4000);
  assert.strictEqual(g(299), 299 * 4000);
  assert.strictEqual(g(326), 326 * 4500); // 김민규 326건: 300건 초과분만이 아니라 전체 4,500
  assert.strictEqual(g(399), 399 * 4500);
  assert.strictEqual(g(400), 400 * 5000);
});

test('쿠팡 누진 방식은 그대로', () => {
  const T = api._DW_EATS_DEFAULT.tiers;
  assert.strictEqual(api._dwEatsGross(320, T), 199 * 2400 + 50 * 3600 + 50 * 4000 + 21 * 4300);
  assert.strictEqual(api._dwEatsGross(320, T, 'progressive'), api._dwEatsGross(320, T));
  assert.strictEqual(api._DW_EATS_DEFAULT.tierMode, 'progressive');
});

test('플랫폼 기본은 쿠팡, 배민 설정은 별도 키', () => {
  assert.strictEqual(api._dwPlat().key, 'coupang');
  assert.strictEqual(api._dwPlat('baemin').cfgKey, 'dwBaeminCfg');
  assert.strictEqual(api._dwEatsCfg('baemin').tierMode, 'flat');
  assert.strictEqual(api._dwEatsCfg().tierMode, 'progressive');
});

test('기사 1명 주간 계산: 326건, 마진 = 배달처리비 − 세전', () => {
  const cfg = api._dwEatsCfg('baemin');
  const days = [
    { date: '2026-11-11', orders: 40 }, { date: '2026-11-12', orders: 46 }, { date: '2026-11-13', orders: 46 },
    { date: '2026-11-14', orders: 50 }, { date: '2026-11-15', orders: 60 }, { date: '2026-11-16', orders: 42 },
    { date: '2026-11-17', orders: 42 },
  ];
  const r = api._dwEatsCalcDriver(days, 1202170, 326, cfg);
  assert.strictEqual(r.weeks.length, 1);
  assert.strictEqual(r.weeks[0].week, '2026-11-11');
  assert.strictEqual(r.gross, 326 * 4500);
  assert.strictEqual(r.coupang, 1202170); // 배민은 부가세 미포함 기본 → 그대로
  assert.strictEqual(r.company, 1202170 - 1467000);
  assert.strictEqual(r.ind, Math.round(1467000 * 0.0088));
  assert.strictEqual(r.emp, Math.round(1467000 * 0.008));
});

// 업로드 파서 (SheetJS가 있으면 실제 형식의 시트로 검증)
let XLSX = null;
try { XLSX = require('xlsx'); } catch (e) { /* 선택 */ }
test('배민 배달 내역 상세 파서', { skip: !XLSX && 'xlsx 모듈 없음' }, () => {
  const m = src.match(/function _dwParseBaemin\([\s\S]*?\n}\n/);
  assert.ok(m, '_dwParseBaemin 없음');
  const parse = new Function('XLSX', m[0] + '\nreturn _dwParseBaemin;')(XLSX);
  const hdr = ['협력사아이디', '운행일', '배달번호', '배달상태', 'User ID', '라이더명', '배달처리비'];
  const ws = XLSX.utils.aoa_to_sheet([
    hdr,
    ['X', '20261111', 'a', '전달완료', 'u1', '김민규', 2580],
    ['X', '20261111', 'b', '전달완료', 'u1', '김민규', 4580],
    ['X', '20261112', 'c', '배달취소', 'u1', '김민규', 2000],
    ['X', '20261112', 'd', '전달완료', 'u2', '김민규', 3000],
  ]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '배달 내역 상세');
  const out = parse(wb, false);
  const a1 = out.find(d => d.name === '김민규');
  assert.strictEqual(a1.orders, 2);
  assert.strictEqual(a1.amount, 7160);
  assert.deepStrictEqual(a1.days['2026-11-12'], { orders: 0, amount: 0, cancelled: 1 });
  assert.ok(out.find(d => d.name === '김민규(u2)'), '동명이인 구분');
  const inc = parse(wb, true).find(d => d.name === '김민규');
  assert.strictEqual(inc.orders, 3);
  // 쿠팡 파일(배달처리비 열 없음)은 null
  const wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet([['날짜', '성함', '총 정산 오더수']]), '일자별 정산내역');
  assert.strictEqual(parse(wb2, false), null);
});
