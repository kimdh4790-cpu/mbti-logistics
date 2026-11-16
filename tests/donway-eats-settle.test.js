// DONWAY 배달대행 정산 — 쿠팡이츠 정산법(주간 누진 단가) 테스트
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'donway-pages', 'index.html'), 'utf8');
const a = src.indexOf('var _DW_EATS_DEFAULT=');
const b = src.indexOf('// ── 정산 방식 설정 모달 ──');
const api = new Function(src.slice(a, b) + '\nreturn {_DW_EATS_DEFAULT,_dwEatsGross,_dwEatsBreakdown,_dwEatsWeekKey,_dwEatsCalcDriver,_dwEatsWeekMonth,_dwEatsMonthDays,_dwEatsWeekLabel};')();
const T = api._DW_EATS_DEFAULT.tiers;
const cfg = Object.assign({}, api._DW_EATS_DEFAULT, {weekStart:0}); // 기존 케이스는 일~토로 검증

test('누진 단가: 320건 = 199×2400 + 50×3600 + 50×4000 + 21×4300', () => {
  assert.strictEqual(api._dwEatsGross(320, T), 199*2400 + 50*3600 + 50*4000 + 21*4300);
});
test('경계값', () => {
  assert.strictEqual(api._dwEatsGross(0, T), 0);
  assert.strictEqual(api._dwEatsGross(199, T), 199*2400);
  assert.strictEqual(api._dwEatsGross(200, T), 199*2400 + 3600);
  assert.strictEqual(api._dwEatsGross(300, T), 199*2400 + 50*3600 + 50*4000 + 4300);
});
test('주차 키: 일~토(ws=0)', () => {
  assert.strictEqual(api._dwEatsWeekKey('2026-11-16',0), '2026-11-15'); // 월 → 일요일
  assert.strictEqual(api._dwEatsWeekKey('2026-11-15',0), '2026-11-15');
  assert.strictEqual(api._dwEatsWeekKey('2026-11-21',0), '2026-11-15'); // 토
  assert.strictEqual(api._dwEatsWeekKey('2026-11-22',0), '2026-11-22');
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
  assert.strictEqual(r.emp, Math.round((w1+w2)*0.008));
  assert.strictEqual(r.ind, Math.round((w1+w2)*0.0088));
  assert.strictEqual(r.net, r.gross - r.tax - r.emp - r.ind);
});
test('세금 없음 설정', () => {
  const r = api._dwEatsCalcDriver([{date:'2026-11-16',orders:10,amount:50000}], 50000, 10, Object.assign({}, cfg, {taxRate:0}));
  assert.strictEqual(r.tax, 0);
});
test('월 걸친 주(일~토): 토요일이 속한 달로 귀속', () => {
  assert.strictEqual(api._dwEatsWeekMonth('2026-11-29',0), '2026-12'); // 11/29(일)~12/5(토)
  assert.strictEqual(api._dwEatsWeekMonth('2026-11-28',0), '2026-11');
  assert.strictEqual(api._dwEatsWeekMonth('2026-11-01',0), '2026-11'); // 11/1(일)~11/7(토)
  const cur = [{date:'2026-11-02',orders:10,amount:1},{date:'2026-11-30',orders:20,amount:2}];
  const adj = {'2026-10-31':{orders:5,amount:3},'2026-10-25':{orders:7,amount:4}};
  // 10/31(토) 주는 10월 귀속이므로 제외, 11/30 주는 12월 귀속이므로 제외
  assert.deepStrictEqual(api._dwEatsMonthDays(cur, adj, '2026-11', 0).map(d=>d.date), ['2026-11-02']);
  assert.deepStrictEqual(api._dwEatsMonthDays(cur, {'2026-12-03':{orders:1,amount:1}}, '2026-12', 0).map(d=>d.date), ['2026-11-30','2026-12-03']);
});
test('기본 주 = 수~화 (쿠팡이츠 엑셀 2026_06-4: 6/17 수 ~ 6/23 화)', () => {
  assert.strictEqual(api._DW_EATS_DEFAULT.weekStart, 3);
  assert.strictEqual(api._dwEatsWeekKey('2026-06-17'), '2026-06-17'); // 수
  assert.strictEqual(api._dwEatsWeekKey('2026-06-23'), '2026-06-17'); // 화
  assert.strictEqual(api._dwEatsWeekKey('2026-06-24'), '2026-06-24');
  assert.strictEqual(api._dwEatsWeekLabel(3), '수~화');
  assert.strictEqual(api._dwEatsWeekLabel(2), '화~월');
  // 6/24(수)~6/30(화) → 6월, 7/1(수)~7/7(화) → 7월
  assert.strictEqual(api._dwEatsWeekMonth('2026-06-30'), '2026-06');
  assert.strictEqual(api._dwEatsWeekMonth('2026-07-01'), '2026-07');
  // 실제 엑셀 정용주1811: 7일 420건 → 한 주로 누진
  const days=[['06-17',0],['06-18',0],['06-19',0],['06-20',0],['06-21',0],['06-22',0],['06-23',0]].map((d,i)=>({date:'2026-'+d[0],orders:[60,60,60,60,60,60,60][i]}));
  const r = api._dwEatsCalcDriver(days, 0, 420, api._DW_EATS_DEFAULT);
  assert.strictEqual(r.weeks.length, 1);
  assert.strictEqual(r.gross, 199*2400 + 50*3600 + 50*4000 + 121*4300);
});
