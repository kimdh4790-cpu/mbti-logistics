const path = require('path');
const fs = require('fs');
const os = require('os');

// Playwright: 원격 Linux(/opt) 우선, 로컬은 node_modules
let chromium;
try { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
catch(e) { chromium = require('playwright').chromium; }

// 업로드(YouTube·Instagram·Naver): Google 차단 우회를 위해 시스템 Chrome 사용
// 녹화(record-all.js): Playwright 번들 Chromium 사용 (별도 처리)
const USE_SYSTEM_CHROME = process.platform !== 'linux';

// Linux 원격 환경용 Chromium 경로
const _linuxPath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH
  || (process.platform === 'linux' && fs.existsSync(_linuxPath) ? _linuxPath : undefined);

const PROFILES_DIR = process.env.PROFILES_DIR || path.join(os.homedir(), '.mbtico-profiles');

async function getContext(platform) {
  const profileDir = path.join(PROFILES_DIR, platform);
  fs.mkdirSync(profileDir, { recursive: true });

  const opts = {
    headless: process.env.HEADLESS !== 'false',
    viewport: platform === 'instagram' ? { width: 375, height: 812 } : { width: 1280, height: 800 },
    userAgent: platform === 'instagram'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  };

  if (USE_SYSTEM_CHROME) {
    // Windows/Mac: 시스템 Chrome + 자동화 감지 우회
    opts.channel = 'chrome';
    opts.args = ['--disable-blink-features=AutomationControlled'];
  } else {
    // Linux(원격): 번들 Chromium 사용
    opts.args = ['--no-sandbox', '--disable-setuid-sandbox'];
    if (CHROMIUM_PATH) opts.executablePath = CHROMIUM_PATH;
  }

  return chromium.launchPersistentContext(profileDir, opts);
}

// 개별 스크립트에서 직접 launchPersistentContext 사용 시 참고용
function getLaunchOpts(headless) {
  if (USE_SYSTEM_CHROME) {
    return {
      channel: 'chrome',
      headless,
      args: ['--disable-blink-features=AutomationControlled'],
      viewport: { width: 1280, height: 800 },
    };
  }
  const opts = { headless, args: ['--no-sandbox', '--disable-setuid-sandbox'], viewport: { width: 1280, height: 800 } };
  if (CHROMIUM_PATH) opts.executablePath = CHROMIUM_PATH;
  return opts;
}

// 터미널에서 Enter 입력 대기 (로그인 완료 확인용)
function waitForEnter(message) {
  process.stdout.write(message || '완료 후 Enter를 누르세요...');
  return new Promise(resolve => {
    const handler = (data) => {
      process.stdin.removeListener('data', handler);
      process.stdin.pause();
      resolve();
    };
    process.stdin.resume();
    process.stdin.once('data', handler);
  });
}

module.exports = { getContext, getLaunchOpts, waitForEnter, chromium, CHROMIUM_PATH, PROFILES_DIR, USE_SYSTEM_CHROME };
