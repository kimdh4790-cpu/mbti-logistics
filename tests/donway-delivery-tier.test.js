// DONWAY 배달대행 초과분 방식 정산 테스트 (donway-pages/index.html 내 함수를 직접 추출해 검증)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'donway-pages', 'index.html'), 'utf8');
function extract(name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n}\\n');
  const m = src.match(re);
  if (!m) throw new Error('function not found: ' + name);
  return m[0];
}
const code = extract('_calcExcessDriverPay');
const api = new Function(code + '\nreturn {_calcExcessDriverPay};')();
const pay = (n, cfg) => api._calcExcessDriverPay(n, cfg || {}).pay;

test('기준(200건) 이하는 기본단가만', () => {
  assert.strictEqual(pay(0), 0);
  assert.strictEqual(pay(150), 150 * 2500);
  assert.strictEqual(pay(200), 200 * 2500);
});

test('201~250건 구간은 3,600원, 초과분만 적용', () => {
  assert.strictEqual(pay(201), 200 * 2500 + 3600);
  assert.strictEqual(pay(250), 200 * 2500 + 50 * 3600); // 680,000
});

test('251~300건 구간은 4,000원', () => {
  assert.strictEqual(pay(300), 200 * 2500 + 50 * 3600 + 50 * 4000); // 880,000
});

test('301건 이상은 4,300원', () => {
  assert.strictEqual(pay(301), 880000 + 4300);
  assert.strictEqual(pay(400), 880000 + 100 * 4300);
});

test('전 건 적용(포스터 방식)과 차이 확인: 250건', () => {
  const allOrders = 250 * 4000; // 1,000,000
  assert.strictEqual(allOrders - pay(250), 320000);
});

test('cfg 오버라이드 가능', () => {
  const cfg = { excessBase: 2000, excessTiers: [{ from: 100, price: 3000 }] };
  assert.strictEqual(pay(100, cfg), 100 * 2000);
  assert.strictEqual(pay(110, cfg), 100 * 2000 + 10 * 3000);
});

// NOTE: donway-pages/index.html 원본에는 한글이 '?'로 깨진 문자열이 있어 calcNet_delivery를 직접 실행하지 못함(HEAD에서도 동일).
// 그래서 calcNet_delivery 연결부는 여기서 검증하지 않음.
