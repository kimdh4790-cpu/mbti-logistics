// DONWAY 배민 배달정산 — 공제 세 항목(원천징수·고용·산재) + 세무 기장비 + 취소 칸 (사용자 2026-11-23)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'donway-pages', 'index.html'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('not found ' + a); return src.slice(i, j); };
const code = cut('var _BS_DEF=', 'function _bsMatch(')
  + cut('function _bsDedRows(', '// 정산서 본문 (관리자·기사 공용)');
const api = new Function('window', code + '\nreturn {_BS_DEF,_bsC,_bsCalc,_bsDed,_bsDedRows};')({});

// 326건 3200원 미만 처리비 예시 (보장 4,500원 구간)
const rd = { name: '테스트', userId: 't1', days: { '2026-11-18': { done: 326, cancel: 2, fee: 1202170, fb: {} } } };
const c = api._bsC();

test('기본 공제율: 원천징수 3.3 · 고용 0.8 · 산재 0.88 · 세무 기장비 건당 200원', () => {
  assert.deepStrictEqual([c.wh, c.emp, c.ind, c.bkT, c.bkV], [3.3, 0.8, 0.88, 'won', 200]);
});
test('예전 통합 5.8% 저장값은 무시하고 세 항목으로', () => {
  const api2 = new Function('window', code + '\nreturn {_bsC};')({ _bsCfg: { ded: 5.8 } });
  const c2 = api2._bsC();
  assert.strictEqual(c2.ded, undefined);
  assert.strictEqual(c2.wh, 3.3);
});
test('김민규 326건 + 미션 22,000원: 세 항목 각각 + 기장비 차감', () => {
  const r = api._bsCalc(rd, { done: 330, rej: 10 }, c);
  assert.strictEqual(r.gross, 326 * 4500);
  r.mission = 22000; api._bsDed(r, c);
  const base = 1467000 + 22000;
  assert.strictEqual(r.inc, Math.round(base * 0.033));
  assert.strictEqual(r.emp, Math.round(base * 0.008));
  assert.strictEqual(r.ind, Math.round(base * 0.0088));
  assert.strictEqual(r.bk, 326 * 200);
  assert.strictEqual(r.net, base - r.inc - r.emp - r.ind - r.bk);
  assert.strictEqual(r.net, 1349648);
});
test('세무 기장비 % 방식, 0이면 줄 없음', () => {
  const r = api._bsCalc(rd, null, Object.assign({}, c, { bkT: 'pct', bkV: 1 }));
  assert.strictEqual(r.bk, Math.round(r.gross * 0.01));
  const r0 = api._bsCalc(rd, null, Object.assign({}, c, { bkV: 0 }));
  assert.strictEqual(r0.bk, 0);
  const R = (a, b) => a + '=' + b + ';';
  assert.ok(!/세무 기장비/.test(api._bsDedRows(r0, R)));
});
test('정산서 공제 줄: 항목명 + % + 금액 (기사용도 동일)', () => {
  const r = api._bsCalc(rd, null, c);
  const R = (a, b) => a + '=' + b + ';';
  const h = api._bsDedRows(r, R);
  assert.ok(h.includes('원천징수 (3.3%)'));
  assert.ok(h.includes('고용보험 (0.8%)'));
  assert.ok(h.includes('산재보험 (0.88%)'));
  assert.ok(h.includes('세무 기장비 (건당 200원 × 326건)'));
  assert.ok(!h.includes('5.8'));
});
test('SLA 취소: 입력값이 있으면 sla.can, 없으면 null', () => {
  assert.strictEqual(api._bsCalc(rd, { done: 300, rej: 5, can: 4 }, c).sla.can, 4);
  assert.strictEqual(api._bsCalc(rd, { done: 300, rej: 5 }, c).sla.can, null);
  assert.strictEqual(api._bsCalc(rd, { done: 300, rej: 5 }, c).can, 2);
});
