const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const REGION = 'ap-tokyo-1';
const CREATE_URL = `https://cloud.oracle.com/compute/instances/create?region=${REGION}`;
const RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5분
const FORM_TIMEOUT_MS = 60 * 1000;
const USER_DATA_DIR = path.join(__dirname, '.oracle-session');

function log(msg) {
  const ts = new Date().toLocaleTimeString('ko-KR');
  console.log(`[${ts}] ${msg}`);
}

async function tryCreate(page, attempt) {
  log(`시도 #${attempt}`);

  log(`Create instance 페이지 이동: ${CREATE_URL}`);
  await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 폼 로딩 대기 — 새 UI는 위저드 구조라 "Basic information" 헤딩으로 감지
  let formLoaded = false;
  for (let elapsed = 5; elapsed <= 60; elapsed += 5) {
    await page.waitForTimeout(5000);
    const url = page.url();
    const title = await page.title();
    log(`  폼 대기 중 (${elapsed}s) URL: ${url} | 제목: ${title}`);

    const basicInfo = await page.locator('text=Basic information').first().isVisible().catch(() => false);
    if (basicInfo) {
      formLoaded = true;
      log('  폼 로딩 확인 완료');
      break;
    }
  }

  if (!formLoaded) {
    const screenshotPath = path.join(__dirname, 'oracle-fail-createpage.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    log(`화면 덤프 → ${screenshotPath}`);

    // 버튼/탭/입력 목록 출력
    const buttons = await page.locator('button, [role="tab"]').allTextContents();
    buttons.filter(t => t.trim()).forEach(t => log(`  버튼/탭: ${t.trim()}`));
    const inputs = await page.locator('input').evaluateAll(els =>
      els.map(el => el.outerHTML.replace(/>.*/, '>'))
    );
    inputs.forEach(h => log(`  입력: ${h}`));

    log(`오류: Create instance 폼이 안 뜸 (현재 URL: ${page.url()}) — region=${REGION} 확인 필요 — 5분 후 재시도`);
    return false;
  }

  // Shape 변경: AMD → Ampere A1.Flex
  log('Shape 변경 시작');
  try {
    const changeShapeBtn = page.locator('button', { hasText: /Change shape/i }).first();
    await changeShapeBtn.waitFor({ timeout: 10000 });
    await changeShapeBtn.click();
    log('  Change shape 클릭');

    // Ampere 선택
    const ampereOption = page.locator('text=Ampere').first();
    await ampereOption.waitFor({ timeout: 10000 });
    await ampereOption.click();
    log('  Ampere 선택');

    // A1.Flex 선택
    const a1Flex = page.locator('text=VM.Standard.A1.Flex').first();
    await a1Flex.waitFor({ timeout: 10000 });
    await a1Flex.click();
    log('  VM.Standard.A1.Flex 선택');

    // OCPU 4, Memory 24 설정
    const ocpuInput = page.locator('input[aria-label*="OCPU"], input[id*="ocpu"]').first();
    await ocpuInput.fill('4');
    log('  OCPU: 4');

    const memInput = page.locator('input[aria-label*="memory"], input[id*="memory"]').first();
    await memInput.fill('24');
    log('  Memory: 24GB');

    const selectShapeBtn = page.locator('button', { hasText: /Select shape/i }).first();
    await selectShapeBtn.click();
    log('  Select shape 완료');
  } catch (e) {
    log(`  Shape 변경 실패: ${e.message}`);
    const screenshotPath = path.join(__dirname, 'oracle-fail-shape.png');
    await page.screenshot({ path: screenshotPath });
    log(`화면 덤프 → ${screenshotPath}`);
    return false;
  }

  // SSH 키 — 기존 키 사용 (없으면 새로 생성)
  log('SSH 키 설정');
  try {
    const sshSection = page.locator('text=Add SSH keys').first();
    await sshSection.waitFor({ timeout: 10000 });

    const pasteKeyRadio = page.locator('label', { hasText: /Paste public keys/i }).first();
    if (await pasteKeyRadio.isVisible()) {
      await pasteKeyRadio.click();
      // 환경변수나 파일에서 SSH 공개키 읽기
      const pubKeyPath = path.join(process.env.HOME || process.env.USERPROFILE, '.ssh', 'id_rsa.pub');
      if (fs.existsSync(pubKeyPath)) {
        const pubKey = fs.readFileSync(pubKeyPath, 'utf8').trim();
        const keyTextarea = page.locator('textarea[placeholder*="ssh-rsa"], textarea[aria-label*="SSH"]').first();
        await keyTextarea.fill(pubKey);
        log('  SSH 공개키 붙여넣기 완료');
      } else {
        log('  SSH 키 파일 없음 — Generate key pair 선택');
        const generateRadio = page.locator('label', { hasText: /Generate a key pair/i }).first();
        await generateRadio.click();
      }
    }
  } catch (e) {
    log(`  SSH 키 설정 건너뜀: ${e.message}`);
  }

  // Create 버튼 클릭
  log('Create 버튼 클릭');
  try {
    const createBtn = page.locator('button', { hasText: /^Create$/ }).first();
    await createBtn.waitFor({ timeout: 10000 });
    await createBtn.click();

    // 결과 대기
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    const outOfCapacity = await page.locator('text=Out of capacity').isVisible().catch(() => false);
    const limitExceeded = await page.locator('text=LimitExceeded').isVisible().catch(() => false);

    if (outOfCapacity || limitExceeded) {
      log('  용량 없음 (Out of capacity / LimitExceeded) — 재시도');
      const screenshotPath = path.join(__dirname, 'oracle-fail-capacity.png');
      await page.screenshot({ path: screenshotPath });
      return false;
    }

    if (currentUrl.includes('/instances/') && !currentUrl.includes('/create')) {
      log(`성공! 인스턴스 생성됨: ${currentUrl}`);
      const screenshotPath = path.join(__dirname, 'oracle-success.png');
      await page.screenshot({ path: screenshotPath });
      log(`스크린샷 → ${screenshotPath}`);
      return true;
    }

    log(`  알 수 없는 결과 — URL: ${currentUrl}`);
    const screenshotPath = path.join(__dirname, 'oracle-unknown.png');
    await page.screenshot({ path: screenshotPath });
    return false;
  } catch (e) {
    log(`  Create 버튼 실패: ${e.message}`);
    return false;
  }
}

async function main() {
  log('Oracle Auto Instance Creator 시작');
  log(`대상 리전: ${REGION}`);
  log(`재시도 간격: ${RETRY_INTERVAL_MS / 60000}분`);
  log('브라우저 시작 중...');

  // 기존 세션 유지를 위해 userDataDir 사용
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: ['--start-maximized'],
    viewport: null,
  });

  const page = await browser.newPage();

  // 로그인 확인
  log('오라클 콘솔 접속 중...');
  await page.goto('https://cloud.oracle.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const isLoggedIn = await page.locator('[aria-label="User menu"], .oci-header-user').isVisible().catch(() => false);
  if (!isLoggedIn) {
    log('로그인 필요 — 브라우저에서 로그인 후 Enter를 누르세요...');
    await new Promise(resolve => process.stdin.once('data', resolve));
  } else {
    log('로그인 상태 확인');
  }

  let attempt = 0;
  while (true) {
    attempt++;
    const success = await tryCreate(page, attempt);
    if (success) {
      log('완료! 인스턴스 생성 성공');
      break;
    }
    log(`${RETRY_INTERVAL_MS / 60000}분 후 재시도...`);
    await page.waitForTimeout(RETRY_INTERVAL_MS);
  }

  await browser.close();
}

main().catch(err => {
  console.error('치명적 오류:', err);
  process.exit(1);
});
