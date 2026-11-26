// DONWAY 배민 배달정산 — 이벤트(건수 초과 건당 추가 · 출근일+건수 보너스 · 직접 입력) 측정 (사용자 2026-11-26)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'donway-pages', 'index.html'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('not found ' + a); return src.slice(i, j); };
const ev = cut('var _DW_EV_TYPES=', 'function _dwEatsWS(') + cut('function _dwEatsAcc(', '// 기사 카드 \'상세내역\'');
const bs = cut('var _BS_DEF=', 'function _bsMatch(');
const win = { _bsCfg: { events: [
  { id: 'a', type: 'per', name: '151건부터', from: 151, amt: 1700 },
  { id: 'b', type: 'week', name: '주6일 170건', days: 6, min: 170, amt: 50000 },
  { id: 'c', type: 'manual', name: '친구 초대', amt: 50000 },
  { type: 'bogus' } ], evAcc: 90 } };
const api = new Function('window', ev + bs + '\nreturn {_bsC,_bsCalc,_bsDed,_dwEatsEvents};')(win);

const days = {}; for (let i = 0; i < 6; i++) days['2026-11-' + (18 + i)] = { done: 30, cancel: 0, fee: 30 * 3500, fb: {} };
const rd = { name: '테스트', days };
const wk = (r, accPct) => ({ week: '2026-11-18', weekEnd: '2026-11-24', count: r.n, rej: 0, workDays: r.days.filter(d => d.done > 0).length, acc: accPct, accLenient: true });

test('설정: 이벤트 3종만 남기고 수락률 기준 읽기', () => {
  const c = api._bsC();
  assert.strictEqual(c.events.length, 3);
  assert.strictEqual(c.evAcc, 90);
});
test('180건·6일·수락률 95%: 151~180 30건×1,700 + 5만원 + 친구 2회', () => {
  const c = api._bsC(), r = api._bsCalc(rd, { done: 190, rej: 10 }, c);
  const E = api._dwEatsEvents([wk(r, 95)], c, { c: 2 });
  assert.strictEqual(E.total, 30 * 1700 + 50000 + 2 * 50000);
  r.ev = E.total; api._bsDed(r, c);
  const base = r.gross + E.total;
  assert.strictEqual(r.inc, Math.round(base * 0.033));
  assert.strictEqual(r.net, base - r.inc - r.emp - r.ind - r.bk);
});
test('수락률 85%면 이벤트 미적용, SLA 미입력이면 일단 적용', () => {
  const c = api._bsC(), r = api._bsCalc(rd, null, c);
  assert.strictEqual(api._dwEatsEvents([wk(r, 85)], c, { c: 1 }).total, 0);
  assert.strictEqual(api._dwEatsEvents([wk(r, null)], c, { c: 1 }).total, 30 * 1700 + 50000 + 50000);
});
test('미달이면 남은 출근일·건수 안내', () => {
  const c = api._bsC();
  const d5 = {}; for (let i = 0; i < 5; i++) d5['2026-11-' + (18 + i)] = { done: 30, cancel: 0, fee: 0, fb: {} };
  const r = api._bsCalc({ name: 'x', days: d5 }, null, c);
  const E = api._dwEatsEvents([wk(r, 100)], c, {});
  const w = E.items.find(x => x.type === 'week');
  assert.strictEqual(w.ok, false);
  assert.match(w.hint, /출근 1일 · 20건 더 하면 50,000원/);
  assert.strictEqual(E.items.find(x => x.type === 'per').hint, '1건 더 타면 그 뒤로 건당 1,700원 추가');
});
