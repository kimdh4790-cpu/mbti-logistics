// DONWAY 배달대행 정산 — 쿠팡이츠 정산법(주간 누진 단가) 테스트
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'donway-pages', 'index.html'), 'utf8');
const a = src.indexOf('var _DW_EATS_DEFAULT=');
const b = src.indexOf('// ── 정산 방식 설정 모달 ──');
const api = new Function(src.slice(a, b) + '\nreturn {_DW_EATS_DEFAULT,_dwEatsGross,_dwEatsBreakdown,_dwEatsWeekKey,_dwEatsCalcDriver};')();
const T = api._DW_EATS_DEFAULT.tiers;
const cfg = Object.assign({}, api._DW_EATS_DEFAULT);

test('누진 단가: 320건 = 199×2400 + 50×3600 + 50×4000 + 21×4300', () => {
  assert.strictEqual(api._dwEatsGross(320, T), 199*2400 + 50*3600 + 50*4000 + 21*4300);
});
test('경계값', () => {
  assert.strictEqual(api._dwEatsGross(0, T), 0);
  assert.strictEqual(api._dwEatsGross(199, T), 199*2400);
  assert.strictEqual(api._dwEatsGross(200, T), 199*2400 + 3600);
  assert.strictEqual(api._dwEatsGross(300, T), 199*2400 + 50*3600 + 50*4000 + 4300);
});
test('쿠팡이츠 주차(일~토) 키', () => {
  assert.strictEqual(api._dwEatsWeekKey('2026-11-16'), '2026-11-15'); // 월 → 일요일
  assert.strictEqual(api._dwEatsWeekKey('2026-11-15'), '2026-11-15');
  assert.strictEqual(api._dwEatsWeekKey('2026-11-21'), '2026-11-15'); // 토
  assert.strictEqual(api._dwEatsWeekKey('2026-11-22'), '2026-11-22');
});
test('주차별로 따로 누진 적용 후 합산, 마진·공제 계산', () => {
  const days = [
    {date:'2026-11-16', orders:150, amount:600000},
    {date:'2026-11-18', orders:100, amount:400000}, // 1주차 250건
    {date:'2026-11-23', orders:120, amount:480000}, // 2주차 120건
  ];
  const r = api._dwEatsCalcDriver(days, 1480000, 370, cfg);
  const w1 = 199*2400 + 50*3600 + 1*4000;
  const w2 = 120*2400;
  assert.strictEqual(r.weeks.length, 2);
  assert.strictEqual(r.gross, w1 + w2);
  assert.strictEqual(r.company, 1480000 - (w1 + w2));
  assert.strictEqual(r.tax, Math.round((w1+w2)*0.033));
  assert.strictEqual(r.emp, Math.round((w1+w2)*0.009));
  assert.strictEqual(r.ind, Math.round((w1+w2)*0.016));
  assert.strictEqual(r.net, r.gross - r.tax - r.emp - r.ind);
});
test('세금 없음 설정', () => {
  const r = api._dwEatsCalcDriver([{date:'2026-11-16',orders:10,amount:50000}], 50000, 10, Object.assign({}, cfg, {taxRate:0}));
  assert.strictEqual(r.tax, 0);
});
