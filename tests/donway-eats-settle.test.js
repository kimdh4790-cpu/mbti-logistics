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
  assert.strictEqual(r.company, Math.round(1480000/1.1) - (w1 + w2)); // 부가세 포함 금액 → 공급가 기준 마진
  assert.strictEqual(r.tax, Math.round((w1+w2)*0.033));
  assert.strictEqual(r.emp, Math.round((w1+w2)*0.008));
  assert.strictEqual(r.ind, Math.round((w1+w2)*0.0088));
  assert.strictEqual(api._DW_EATS_DEFAULT.bkVal, 0); // 기본은 기장비 안 뗌
  assert.strictEqual(r.bk, 0);
  assert.strictEqual(r.net, r.gross - r.tax - r.emp - r.ind - r.bk);
});
test('세무 기장비: % 방식과 0원', () => {
  const d=[{date:'2026-11-16',orders:100,amount:0}];
  const rw = api._dwEatsCalcDriver(d, 0, 100, Object.assign({}, cfg, {bkVal:200}));
  assert.strictEqual(rw.bk, 100*200);
  const r = api._dwEatsCalcDriver(d, 0, 100, Object.assign({}, cfg, {bkType:'pct',bkVal:2}));
  assert.strictEqual(r.bk, Math.round(r.gross*0.02));
  const r0 = api._dwEatsCalcDriver(d, 0, 100, Object.assign({}, cfg, {bkVal:0}));
  assert.strictEqual(r0.bk, 0);
  assert.strictEqual(r0.net, r0.gross - r0.tax - r0.emp - r0.ind);
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
test('부가세: 실제 엑셀 정용주 1,840,974(포함) → 공급가 1,673,613', () => {
  const r = api._dwEatsCalcDriver([{date:'2026-06-17',orders:420}], 1840974, 420, api._DW_EATS_DEFAULT);
  assert.strictEqual(r.coupang, 1673613);
  assert.strictEqual(r.company, 1673613 - 1377900);
  const r2 = api._dwEatsCalcDriver([{date:'2026-06-17',orders:420}], 1673613, 420, Object.assign({}, api._DW_EATS_DEFAULT, {vatIncl:false}));
  assert.strictEqual(r2.coupang, 1673613);
});
test('쿠팡 실지급액(종합 시트) 직접 지정 시 그 값으로 마진 계산 — 계산기와 동일', () => {
  const r = api._dwEatsCalcDriver([{date:'2026-06-17',orders:420,amount:1840974}], 1840974, 420, api._DW_EATS_DEFAULT, 1652053);
  assert.strictEqual(r.coupang, 1652053);
  assert.strictEqual(r.company, 1652053 - 1377900);
});

// ── 2026-11-26: 단가 적용 방식(대리점 선택) + 이벤트 측정 ──
const api2 = new Function(src.slice(a, b) + '\nreturn {_dwEatsCalcDriver,_dwEatsGross,_dwEatsEvents};')();
test('도달 단가 전체 적용(flat): 250건 = 250×4000, 누진은 그대로', () => {
  assert.strictEqual(api2._dwEatsGross(250, T, 'flat'), 250*4000);
  assert.strictEqual(api2._dwEatsGross(199, T, 'flat'), 199*2400);
  assert.strictEqual(api2._dwEatsGross(320, T, 'flat'), 320*4300);
  assert.strictEqual(api2._dwEatsGross(250, T), 199*2400 + 50*3600 + 4000);
  assert.strictEqual(api2._dwEatsGross(0, T, 'flat'), 0);
});
test('이벤트: 151건부터 건당 1,700원 · 주6일+170건 5만원 · 직접 입력 · 수락률 조건', () => {
  const days = [];
  // 1주차(일~토): 6일 × 30건 = 180건, 거절 0
  for (let i = 0; i < 6; i++) days.push({date:'2026-11-'+(15+i), orders:30, amount:0, rejected:0});
  // 2주차: 5일 × 30건 = 150건, 거절 30 (수락률 83.3%)
  for (let i = 0; i < 5; i++) days.push({date:'2026-11-'+(22+i), orders:30, amount:0, rejected:6});
  const ev = [
    {id:'a', type:'per', name:'151건부터', from:151, amt:1700},
    {id:'b', type:'week', name:'주6일 170건', days:6, min:170, amt:50000},
    {id:'c', type:'manual', name:'친구 초대', amt:50000},
  ];
  const c1 = Object.assign({}, cfg, {events:ev, evAcc:0});
  const r = api2._dwEatsCalcDriver(days, 0, 330, c1, 0, {manual:{c:2}});
  const w1 = 180, w2 = 150;
  const g1 = api2._dwEatsGross(w1, T), g2 = api2._dwEatsGross(w2, T);
  const evTotal = 30*1700 /*1주차 151~180*/ + 50000 /*1주차 6일 180건*/ + 2*50000;
  assert.strictEqual(r.base, g1 + g2);
  assert.strictEqual(r.ev, evTotal);
  assert.strictEqual(r.gross, g1 + g2 + evTotal);
  assert.strictEqual(r.tax, Math.round(r.gross*0.033));
  assert.strictEqual(r.company, 0 - r.gross);
  const wk2 = r.evItems.filter(x => x.type==='week' && x.week==='2026-11-22')[0];
  assert.strictEqual(wk2.ok, false);
  assert.ok(/출근 1일/.test(wk2.hint) && /20건/.test(wk2.hint));
  const per2 = r.evItems.filter(x => x.type==='per' && x.week==='2026-11-22')[0];
  assert.strictEqual(per2.ok, false);
  assert.ok(/1건 더/.test(per2.hint));
  // 수락률 90% 조건: 1주차(100%)는 그대로, 직접 입력은 월 수락률(330/(330+30)=91.7%) 통과
  const r9 = api2._dwEatsCalcDriver(days, 0, 330, Object.assign({}, c1, {evAcc:90}), 0, {manual:{c:1}});
  assert.strictEqual(r9.ev, 30*1700 + 50000 + 50000);
  // 수락률 95%면 직접 입력 이벤트 미적용
  const r95 = api2._dwEatsCalcDriver(days, 0, 330, Object.assign({}, c1, {evAcc:95}), 0, {manual:{c:1}});
  assert.strictEqual(r95.ev, 30*1700 + 50000);
});
test('이벤트 없으면 예전 계산과 같음', () => {
  const r = api2._dwEatsCalcDriver([{date:'2026-11-16',orders:250,amount:0}], 0, 250, cfg, 0);
  assert.strictEqual(r.ev, 0);
  assert.strictEqual(r.gross, 199*2400 + 50*3600 + 4000);
});
