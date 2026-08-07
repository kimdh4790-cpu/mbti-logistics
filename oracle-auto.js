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
const HEADLESS      = process.env.HEADLESS      !== '0';   // 기본 true (서버 모드)
const RETRY_MIN     = parseInt(process.env.RETRY_MIN) || 5;
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

// ── 스크린샷 헬퍼 ─────────────────────────────────────────────────────────────

async function snap(page, name) {
  const p = path.join(__dirname, `oracle-${name}.png`);
  try { await page.screenshot({ path: p, fullPage: false }); } catch {}
  return p;
}

// ── Oracle SSO 자동 로그인 ────────────────────────────────────────────────────

async function autoLogin(page) {
  const user   = (process.env.OCI_USER   || '').trim();
  const pass   = (process.env.OCI_PASS   || '').trim();
  const tenant = (process.env.OCI_TENANT || '').trim();
  if (!user || !pass) return false;

  log('자동 로그인 시도...');

  // Cloud Account Name (tenant)
  if (tenant) {
    const tenantInput = page.locator('input[id*="cloudAccountName"], input[name*="cloudAccountName"]').first();
    if (await tenantInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      log(`  테넌트 입력: ${tenant}`);
      await tenantInput.fill(tenant);
      const nextBtn = page.locator('button[type="submit"], button:has-text("Next")').first();
      await nextBtn.click().catch(() => {});
      await page.waitForTimeout(3000);
    }
  }

  // Email / Username
  const emailSel = 'input[type="email"], input[name="username"], input[id*="userid"], input[id*="username"], input[id*="email"]';
  const emailInput = page.locator(emailSel).first();
  if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    log(`  이메일 입력: ${user}`);
    await emailInput.fill(user);
    const nextBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    await nextBtn.click().catch(() => {});
    await page.waitForTimeout(3000);
  }

  // Password
  const passInput = page.locator('input[type="password"]').first();
  if (await passInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    log('  비밀번호 입력 중...');
    await passInput.fill(pass);
    const signBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    await signBtn.click().catch(() => {});
    await page.waitForTimeout(5000);
  }

  // MFA / OTP
  const mfaSel = 'input[id*="mfa"], input[id*="otp"], input[id*="passcode"], input[placeholder*="code" i], input[autocomplete="one-time-code"]';
  const mfaInput = page.locator(mfaSel).first();
  if (await mfaInput.isVisible({ timeout: 6000 }).catch(() => false)) {
    await snap(page, 'mfa-needed');
    log('  MFA 화면 감지 — oracle-mfa-needed.png 저장');
    const otp = (process.env.OCI_OTP || '').trim();
    if (otp) {
      log(`  OTP 입력: ${otp}`);
      await mfaInput.fill(otp);
      await page.locator('button[type="submit"]').first().click().catch(() => {});
      await page.waitForTimeout(4000);
    } else {
      log('  OTP 필요 — OCI_OTP 환경변수 없음. stdin 대기...');
      process.stdout.write('  OTP 코드 입력 후 Enter: ');
      const otp2 = await new Promise(r => process.stdin.once('data', d => r(d.toString().trim())));
      await mfaInput.fill(otp2);
      await page.locator('button[type="submit"]').first().click().catch(() => {});
      await page.waitForTimeout(4000);
    }
  }

  return true;
}

// ── 로그인 감지 ───────────────────────────────────────────────────────────────

async function ensureLoggedIn(page) {
  log('오라클 콘솔 접속 중...');
  await page.goto('https://cloud.oracle.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const isLoggedIn = await page
    .locator('[aria-label="User menu"], .oci-header-user, [data-testid="user-menu"]')
    .first()
    .isVisible()
    .catch(() => false);

  if (isLoggedIn) {
    log('로그인 상태 확인');
    return;
  }

  await snap(page, 'login-page');
  log('로그인 필요 (oracle-login-page.png 저장)');

  // 환경변수 자동 로그인 시도
  const didAuto = await autoLogin(page);

  if (!didAuto && HEADLESS) {
    log('오류: 저장된 세션도 없고 OCI_USER/OCI_PASS 환경변수도 없습니다.');
    log('해결법1: HEADLESS=0 OCI_USER=xxx OCI_PASS=xxx node oracle-auto.js');
    log('해결법2: 세션 저장 후 헤드리스 재실행');
    process.exit(1);
  }

  if (!didAuto) {
    // 헤드풀 수동 로그인
    log('브라우저에서 로그인 완료 후 Enter를 누르세요...');
    await new Promise(resolve => process.stdin.once('data', resolve));
  }

  // 로그인 결과 확인
  await page.waitForTimeout(3000);
  const loggedIn = await page
    .locator('[aria-label="User menu"], .oci-header-user')
    .first()
    .isVisible()
    .catch(() => false);

  if (!loggedIn) {
    await snap(page, 'login-after');
    log('경고: 로그인 확인 불가 (oracle-login-after.png) — 계속 진행합니다');
  } else {
    await snap(page, 'login-success');
    log('로그인 성공! (oracle-login-success.png)');
  }
}

// ── 인스턴스 생성 시도 ────────────────────────────────────────────────────────

async function tryCreate(page, attempt) {
  log(`시도 #${attempt} — ${CREATE_URL}`);
  await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 폼 로딩 대기 (최대 60초)
  let formLoaded = false;
  for (let elapsed = 5; elapsed <= 60; elapsed += 5) {
    await page.waitForTimeout(5000);
    const basicInfo = await page.locator('text=Basic information').first().isVisible().catch(() => false);
    if (basicInfo) { formLoaded = true; log('  폼 로딩 확인'); break; }
    log(`  폼 대기 중 (${elapsed}s) | ${page.url()}`);
  }

  if (!formLoaded) {
    await page.screenshot({ path: path.join(__dirname, 'oracle-fail-createpage.png') });
    log(`오류: 폼 안 뜸 (URL: ${page.url()}) — 재시도 예약`);
    return false;
  }

  // ── Shape 변경: AMD → Ampere A1.Flex ──────────────────────────────────────
  log('Shape 변경: Ampere A1.Flex 선택');
  try {
    const changeBtn = page.locator('button', { hasText: /Change shape/i }).first();
    await changeBtn.waitFor({ timeout: 10000 });
    await changeBtn.click();

    await page.locator('text=Ampere').first().waitFor({ timeout: 10000 });
    await page.locator('text=Ampere').first().click();

    await page.locator('text=VM.Standard.A1.Flex').first().waitFor({ timeout: 10000 });
    await page.locator('text=VM.Standard.A1.Flex').first().click();

    // OCPU 4
    const ocpuInput = page.locator('input[aria-label*="OCPU"], input[id*="ocpu"]').first();
    await ocpuInput.fill('4');

    // Memory 24 GB
    const memInput = page.locator('input[aria-label*="memory"], input[id*="memory"]').first();
    await memInput.fill('24');

    await page.locator('button', { hasText: /Select shape/i }).first().click();
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
