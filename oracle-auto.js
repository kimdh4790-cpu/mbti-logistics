/**
 * Oracle Cloud A1.Flex 자동 생성기
 *
 * 환경변수:
 *   OCI_REGION     ap-tokyo-1 (기본값)
 *   HEADLESS       0 = 브라우저 표시 (첫 로그인용), 1 = 헤드리스 서버 모드 (기본값)
 *   RETRY_MIN      재시도 간격(분), 기본 5
 *   NOTIFY_PHONE   성공 시 SMS 수신번호 (예: 01012345678)
 *   SOLAPI_KEY     솔라피 API 키
 *   SOLAPI_SECRET  솔라피 API 시크릿
 *   SSH_PUB_KEY    SSH 공개키 문자열 (미입력 시 ~/.ssh/id_rsa.pub 사용)
 *
 * 사용법:
 *   1) 첫 로그인: HEADLESS=0 node oracle-auto.js
 *      → 브라우저가 뜨면 오라클 로그인 → 완료 후 Enter
 *   2) 서버 자동화: node oracle-auto.js (또는 pm2/systemd로 실행)
 */

const { chromium } = require('@playwright/test');
const { createHmac } = require('crypto');
const path = require('path');
const fs   = require('fs');

const REGION        = process.env.OCI_REGION    || 'ap-tokyo-1';
const OCI_USER      = process.env.OCI_USER      || 'kimdh4790@gmail.com';
const OCI_PASS      = process.env.OCI_PASS      || 'khw3103!!';
const HEADLESS      = process.env.HEADLESS === '1';   // 기본 false (브라우저 표시)
const RETRY_MIN     = parseInt(process.env.RETRY_MIN) || 1;
const RETRY_MS      = RETRY_MIN * 60 * 1000;
const NOTIFY_PHONE  = (process.env.NOTIFY_PHONE || '').replace(/[^0-9]/g, '');
const SOLAPI_KEY    = process.env.SOLAPI_KEY    || '';
const SOLAPI_SECRET = process.env.SOLAPI_SECRET || '';
const FROM_NUM      = '05171133103';

const CREATE_URL    = `https://cloud.oracle.com/compute/instances/create?region=${REGION}`;
const USER_DATA_DIR = path.join(__dirname, '.oracle-session');

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  const line = `[${ts}] ${msg}`;
  console.log(line);
  // 로그 파일에도 기록
  try { fs.appendFileSync(path.join(__dirname, 'oracle-auto.log'), line + '\n'); } catch {}
}

async function sendSMS(text) {
  if (!SOLAPI_KEY || !SOLAPI_SECRET || !NOTIFY_PHONE) return;
  try {
    const date = new Date().toISOString();
    const salt = Math.random().toString(36).slice(2);
    const signature = createHmac('sha256', SOLAPI_SECRET).update(date + salt).digest('hex');
    const authHeader = `HMAC-SHA256 apiKey=${SOLAPI_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
    const res = await fetch('https://api.solapi.com/messages/v4/send-many/detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        messages: [{ to: NOTIFY_PHONE, from: FROM_NUM, type: 'SMS', text }]
      })
    });
    const r = await res.json();
    const ok = (r.results || []).some(x => x.statusCode === '2000');
    log(`SMS ${ok ? '발송 완료' : '실패'} → ${NOTIFY_PHONE}`);
  } catch (e) {
    log(`SMS 오류: ${e.message}`);
  }
}

function readSSHPubKey() {
  if (process.env.SSH_PUB_KEY) return process.env.SSH_PUB_KEY.trim();
  const paths = [
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.ssh', 'id_rsa.pub'),
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.ssh', 'id_ed25519.pub'),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  }
  return null;
}

// ── 자동 로그인 ──────────────────────────────────────────────────────────────
async function autoLogin(page) {
  try {
    // 이메일 입력
    const emailField = page.locator('input[type=email], input[name=email], #login-email, #idcs-signin-basic-signin-form-username').first();
    await emailField.waitFor({ timeout: 8000 });
    await emailField.fill(OCI_USER);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    // 비밀번호 입력
    const pwField = page.locator('input[type=password], input[name=password], #idcs-signin-basic-signin-form-password').first();
    await pwField.waitFor({ timeout: 8000 });
    await pwField.fill(OCI_PASS);
    await page.keyboard.press('Enter');
    log('자동 로그인 시도 완료');
    await page.waitForTimeout(3000);
    return true;
  } catch(e) {
    log('자동 로그인 실패 — 수동 로그인 필요: ' + e.message);
    return false;
  }
}

// ── 로그인 감지 ───────────────────────────────────────────────────────────────

async function ensureLoggedIn(page) {
  log('오라클 콘솔 접속 중...');
  await page.goto('https://cloud.oracle.com', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(function(e){
    if(e.message && (e.message.includes('ERR_ABORTED') || e.message.includes('net::ERR'))) {
      log('리다이렉트 감지 — 계속 진행');
    } else { throw e; }
  });
  await page.waitForTimeout(4000);

  const isLoggedIn = await page
    .locator('[aria-label="User menu"], .oci-header-user, [data-testid="user-menu"]')
    .first()
    .isVisible()
    .catch(() => false);

  if (isLoggedIn) {
    log('로그인 상태 확인');
    return;
  }

  // 자동 로그인 먼저 시도 (헤드리스/헤드풀 공통)
  log('자동 로그인 시도 중...');
  const autoOk = await autoLogin(page);
  await page.waitForTimeout(3000);

  const isLoggedIn2 = await page
    .locator('[aria-label="User menu"], .oci-header-user, [data-testid="user-menu"]')
    .first().isVisible().catch(() => false);

  if (isLoggedIn2 || autoOk) {
    log('자동 로그인 성공');
    return;
  }

  if (HEADLESS) {
    log('자동 로그인 실패 — 헤드리스 모드에서 수동 로그인 불가');
    log('해결: node oracle-auto.js (브라우저 창 뜸 → 로그인 → Enter)');
    process.exit(1);
  }

  // 헤드풀 모드: 수동 로그인 대기
  log('로그인 필요 — 브라우저에서 로그인 완료 후 Enter를 누르세요...');
  await new Promise(resolve => process.stdin.once('data', resolve));

  // 로그인 후 세션 확인
  const loggedIn = await page
    .locator('[aria-label="User menu"], .oci-header-user')
    .first()
    .isVisible()
    .catch(() => false);
  if (!loggedIn) {
    log('경고: 로그인 확인 불가 — 계속 진행합니다');
  } else {
    log('로그인 확인 완료');
  }
}

// ── 인스턴스 생성 시도 ────────────────────────────────────────────────────────

async function tryCreate(page, attempt) {
  log(`시도 #${attempt} — ${CREATE_URL}`);
  await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 폼 로딩 대기 (최대 90초) — Oracle UI 변경 대응 다중 셀렉터
  let formLoaded = false;
  for (let elapsed = 5; elapsed <= 90; elapsed += 5) {
    await page.waitForTimeout(5000);
    const checks = await Promise.all([
      page.locator('text=Basic information').first().isVisible().catch(() => false),
      page.locator('text=Image and shape').first().isVisible().catch(() => false),
      page.locator('text=Create compute instance').first().isVisible().catch(() => false),
      page.locator('button:has-text("Change shape")').first().isVisible().catch(() => false),
      page.locator('text=VM.Standard').first().isVisible().catch(() => false),
      page.locator('[aria-label="Name"], input[placeholder*="instance"]').first().isVisible().catch(() => false),
    ]);
    if (checks.some(Boolean)) { formLoaded = true; log('  폼 로딩 확인'); break; }
    log(`  폼 대기 중 (${elapsed}s) | ${page.url()}`);
    // 5초마다 스크린샷 저장 (디버그용)
    if (elapsed % 15 === 0) {
      await page.screenshot({ path: path.join(__dirname, `oracle-debug-${elapsed}s.png`) }).catch(() => {});
    }
  }

  if (!formLoaded) {
    await page.screenshot({ path: path.join(__dirname, 'oracle-fail-createpage.png') });
    log(`오류: 폼 안 뜸 (URL: ${page.url()}) — 재시도 예약`);
    return false;
  }

  // ── Shape 변경: AMD → Ampere A1.Flex ──────────────────────────────────────
  log('Shape 변경: Ampere A1.Flex 선택');
  try {
    // Change shape 버튼 (구/신 UI 대응)
    const changeBtn = page.locator('button:has-text("Change shape"), a:has-text("Change shape"), [data-test-id*="change-shape"]').first();
    await changeBtn.waitFor({ timeout: 15000 });
    await changeBtn.click();
    await page.waitForTimeout(2000);

    // Ampere 탭/라디오 선택
    const ampere = page.locator('text=Ampere, [data-value*="Ampere"], label:has-text("Ampere")').first();
    await ampere.waitFor({ timeout: 10000 });
    await ampere.click();
    await page.waitForTimeout(1000);

    // A1.Flex 선택
    const a1 = page.locator('text=VM.Standard.A1.Flex').first();
    await a1.waitFor({ timeout: 10000 });
    await a1.click();
    await page.waitForTimeout(1000);

    // OCPU 4
    const ocpuInput = page.locator('input[aria-label*="OCPU"], input[aria-label*="ocpu"], input[id*="ocpu"], input[placeholder*="OCPU"]').first();
    if (await ocpuInput.isVisible().catch(() => false)) {
      await ocpuInput.triple_click().catch(() => ocpuInput.click());
      await ocpuInput.fill('4');
    }

    // Memory 24 GB
    const memInput = page.locator('input[aria-label*="emory"], input[id*="memory"], input[placeholder*="emory"]').first();
    if (await memInput.isVisible().catch(() => false)) {
      await memInput.click();
      await memInput.fill('24');
    }

    // Select shape 확인 버튼
    const selectBtn = page.locator('button:has-text("Select shape"), button:has-text("Save changes"), button:has-text("Confirm")').first();
    if (await selectBtn.isVisible({ timeout: 5000 }).catch(() => false)) await selectBtn.click();
    await page.waitForTimeout(2000);
    log('  Shape: VM.Standard.A1.Flex / OCPU 4 / 24GB 설정 완료');
  } catch (e) {
    await page.screenshot({ path: path.join(__dirname, 'oracle-fail-shape.png') });
    log(`  Shape 변경 실패: ${e.message}`);
    return false;
  }

  // ── SSH 키 설정 ───────────────────────────────────────────────────────────
  log('SSH 키 설정');
  try {
    await page.locator('text=Add SSH keys').first().waitFor({ timeout: 10000 });

    const pasteRadio = page.locator('label', { hasText: /Paste public keys/i }).first();
    if (await pasteRadio.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pasteRadio.click();
      const pubKey = readSSHPubKey();
      if (pubKey) {
        const ta = page.locator('textarea[placeholder*="ssh-rsa"], textarea[aria-label*="SSH"]').first();
        await ta.fill(pubKey);
        log('  SSH 공개키 입력 완료');
      } else {
        log('  SSH 키 없음 — Generate key pair 사용');
        const genRadio = page.locator('label', { hasText: /Generate a key pair/i }).first();
        if (await genRadio.isVisible({ timeout: 3000 }).catch(() => false)) await genRadio.click();
      }
    }
  } catch (e) {
    log(`  SSH 키 건너뜀: ${e.message}`);
  }

  // ── Create 버튼 클릭 ──────────────────────────────────────────────────────
  log('Create 버튼 클릭');
  try {
    const createBtn = page.locator('button', { hasText: /^Create$/ }).first();
    await createBtn.waitFor({ timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    const outOfCap   = await page.locator('text=Out of capacity').isVisible().catch(() => false);
    const limitExc   = await page.locator('text=LimitExceeded').isVisible().catch(() => false);

    if (outOfCap || limitExc) {
      await page.screenshot({ path: path.join(__dirname, 'oracle-fail-capacity.png') });
      log('  용량 부족 — 재시도 예약');
      return false;
    }

    if (currentUrl.includes('/instances/') && !currentUrl.includes('/create')) {
      await page.screenshot({ path: path.join(__dirname, 'oracle-success.png') });
      log(`성공! 인스턴스 생성됨: ${currentUrl}`);
      return true;
    }

    await page.screenshot({ path: path.join(__dirname, 'oracle-unknown.png') });
    log(`  알 수 없는 결과 — URL: ${currentUrl}`);
    return false;
  } catch (e) {
    log(`  Create 실패: ${e.message}`);
    return false;
  }
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

async function main() {
  log('=== Oracle Auto Instance Creator ===');
  log(`리전: ${REGION} | 헤드리스: ${HEADLESS} | 재시도 간격: ${RETRY_MIN}분`);
  if (NOTIFY_PHONE) log(`성공 알림: ${NOTIFY_PHONE}`);

  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: HEADLESS,
    args: HEADLESS
      ? ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      : ['--start-maximized'],
    viewport: HEADLESS ? { width: 1440, height: 900 } : null,
  });

  const page = await browser.newPage();

  await ensureLoggedIn(page);

  let attempt = 0;
  while (true) {
    attempt++;
    const success = await tryCreate(page, attempt);
    if (success) {
      const msg = `[Oracle] A1.Flex 인스턴스 생성 성공! 리전: ${REGION}`;
      log(msg);
      await sendSMS(msg);
      break;
    }
    log(`${RETRY_MIN}분 후 재시도... (시도 #${attempt} 완료)`);
    await page.waitForTimeout(RETRY_MS);
  }

  await browser.close();
}

main().catch(err => {
  console.error('치명적 오류:', err);
  process.exit(1);
});
