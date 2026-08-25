/**
 * MBTICO 관리자 자동화 태스크 (Oracle Cloud 실행)
 * Firebase REST 로그인 → Worker API 호출
 *
 * 사용법:
 *   node scripts/admin-tasks.js --task inv-check   # 재고부족 알림 (모든 딜러)
 *   node scripts/admin-tasks.js --task ai-warmup   # AI 예측 사전 계산 (특정 딜러)
 *   node scripts/admin-tasks.js --task all         # 전체 실행
 *
 * 필수 환경변수:
 *   MBTICO_ADMIN_EMAIL    (기본: CLAUDE.md의 soungkyekim@naver.com)
 *   MBTICO_ADMIN_PW       (환경변수로만 설정 — 코드에 평문 금지)
 *   MBTICO_FIREBASE_KEY   (Firebase Web API Key)
 *   MBTICO_DEALER_ID      (기본: 9XD2K3W1tIhIs6XM74YT0xfRFEP2)
 */

const https = require('https');

const FIREBASE_KEY = process.env.MBTICO_FIREBASE_KEY || 'AIzaSyDQmEFfLczgCuPQidunbBXqaHWgs39VMg0';
const ADMIN_EMAIL  = process.env.MBTICO_ADMIN_EMAIL  || 'soungkyekim@naver.com';
const ADMIN_PW     = process.env.MBTICO_ADMIN_PW;    // 반드시 환경변수로 주입
const DEALER_ID    = process.env.MBTICO_DEALER_ID    || '9XD2K3W1tIhIs6XM74YT0xfRFEP2';
const WORKER_BASE  = 'https://filo.ai.kr';

const args = process.argv.slice(2);
function getArg(flag) {
  const a = args.find(a => a.startsWith(`${flag}=`));
  if (a) return a.split('=')[1];
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}
const task = getArg('--task') || 'all';

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
    };
    const mod = u.protocol === 'https:' ? https : require('http');
    const req = mod.request(opts, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getFirebaseToken() {
  if (!ADMIN_PW) throw new Error('MBTICO_ADMIN_PW 환경변수가 설정되지 않았습니다.');
  const res = await post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_KEY}`,
    { email: ADMIN_EMAIL, password: ADMIN_PW, returnSecureToken: true }
  );
  if (!res.body.idToken) throw new Error(`Firebase 로그인 실패: ${JSON.stringify(res.body)}`);
  console.log('  Firebase 인증 완료');
  return res.body.idToken;
}

async function taskInvCheck(token) {
  console.log('[재고부족 알림] 실행 중...');
  const res = await post(`${WORKER_BASE}/api/inv-notify`, {
    did: DEALER_ID,
    title: '재고 부족 알림',
    body: '일부 메뉴 재료가 최소 수량 이하입니다. FILO 앱에서 확인하세요.',
  }, { Authorization: `Bearer ${token}` });
  console.log('  결과:', JSON.stringify(res.body));
}

async function taskAiWarmup(token) {
  console.log('[AI 예측 사전계산] 실행 중...');
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  const res = await post(`${WORKER_BASE}/api/ai-forecast`, {
    did: DEALER_ID,
    ym,
  }, { Authorization: `Bearer ${token}` });
  console.log('  결과:', JSON.stringify(res.body).slice(0, 200));
}

async function main() {
  console.log(`\n[admin-tasks] ${new Date().toISOString()} task=${task}`);

  let token;
  try {
    token = await getFirebaseToken();
  } catch (e) {
    console.error('인증 실패:', e.message);
    process.exit(1);
  }

  if (task === 'inv-check' || task === 'all') await taskInvCheck(token);
  if (task === 'ai-warmup' || task === 'all') await taskAiWarmup(token);

  console.log('\n[admin-tasks] 완료\n');
}

main().catch(err => {
  console.error('[admin-tasks 오류]', err.message);
  process.exit(1);
});
