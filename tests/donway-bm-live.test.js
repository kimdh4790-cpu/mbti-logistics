// DONWAY 배민 실시간 운영현황 캡처 인식 (2026-11-24) — 배민커넥트비즈 PC 화면 캡처를 2배 키워 Tesseract(kor+eng)로 읽은 결과로 검증
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'donway-pages', 'index.html'), 'utf8');
const i = src.indexOf('var _BL_SLOTS='), j = src.indexOf('// ── 화면: 배민커넥트비즈', i);
const api = new Function(src.slice(i, j) + '\nreturn {_blParse,_blEmpty};')();
const ocr = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'bm-live-ocr.json'), 'utf8'));

test('기준 시각 · 일일 현황 · 시간 외 배달현황', () => {
  const v = api._blParse(ocr);
  assert.strictEqual(v.at, '11.24 16시 41분');
  assert.deepStrictEqual([v.acc, v.accTag, v.done, v.prog, v.can, v.rej, v.otDone, v.otRiders], [95, '양호', 127, 5, 3, 3, 9, 3]);
});
test('슬롯별 달성률 4칸 (상태 · % · 완료 · 목표)', () => {
  const v = api._blParse(ocr);
  assert.deepStrictEqual(v.slots, [
    { pct: 342.1, done: 65, tg: 19, st: '달성' },
    { pct: 344.4, done: 62, tg: 18, st: '달성' },
    { pct: 0, done: 0, tg: 30, st: '예정' },
    { pct: 0, done: 0, tg: 23, st: '예정' },
  ]);
});
test('단위 "건"을 숫자로 잘못 읽어도 글자 높이로 잘라냄 (127건 → 1272 아님)', () => {
  const v = api._blParse(ocr);
  assert.strictEqual(v.done, 127);
});
test('빈 결과도 4개 슬롯 틀은 유지', () => {
  const v = api._blParse({ lines: [] });
  assert.strictEqual(v.slots.length, 4);
  assert.strictEqual(v.done, null);
});
