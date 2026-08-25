/**
 * MBTICO 앱 헬스체크 (Oracle Cloud 매일 22:00 KST 실행)
 * 5개 앱 URL ping → 비정상 시 콘솔 ALERT 출력 → 로그 파일에 기록
 *
 * 사용법: node scripts/health-check.js
 */

const https = require('https');
const http = require('http');

const APPS = [
  { name: 'FILO',    url: 'https://filo.ai.kr' },
  { name: 'DINE',    url: 'https://dine.ne.kr' },
  { name: 'DONWAY',  url: 'https://donway.ai.kr' },
  { name: '용차앱',  url: 'https://yongcha.app' },
  { name: 'MBTICO',  url: 'https://mbtico.kr' },
];

function ping(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve({ ok: res.statusCode < 500, status: res.statusCode, ms: Date.now() - start });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'TIMEOUT', ms: timeoutMs }); });
    req.on('error', (e) => resolve({ ok: false, status: e.code || 'ERROR', ms: Date.now() - start }));
  });
}

async function main() {
  const now = new Date().toISOString();
  console.log(`\n[헬스체크] ${now}`);

  let allOk = true;
  for (const app of APPS) {
    const res = await ping(app.url);
    const icon = res.ok ? '✓' : '✗';
    console.log(`  ${icon} ${app.name.padEnd(8)} ${String(res.status).padEnd(4)} ${res.ms}ms  ${app.url}`);
    if (!res.ok) allOk = false;
  }

  if (!allOk) {
    console.error('\n[ALERT] 일부 앱이 응답하지 않습니다. 확인 필요!');
    process.exitCode = 1;
  } else {
    console.log('\n  전체 정상');
  }
}

main().catch(err => {
  console.error('[헬스체크 오류]', err.message);
  process.exit(1);
});
