const path = require('path');
const fs = require('fs');
const os = require('os');

// Playwright: 원격 Linux(/opt) 우선, 로컬은 node_modules
let chromium;
try { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
catch(e) { chromium = require('playwright').chromium; }

// Chromium: 원격 Linux 고정 경로 / 로컬은 Playwright 기본값
const _linuxPath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH
  || (process.platform === 'linux' && fs.existsSync(_linuxPath) ? _linuxPath : undefined);

const PROFILES_DIR = process.env.PROFILES_DIR || path.join(os.homedir(), '.mbtico-profiles');

async function getContext(platform) {
  const profileDir = path.join(PROFILES_DIR, platform);
  fs.mkdirSync(profileDir, { recursive: true });
  const opts = {
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    viewport: platform === 'instagram' ? { width: 375, height: 812 } : { width: 1280, height: 800 },
    userAgent: platform === 'instagram'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  };
  if (CHROMIUM_PATH) opts.executablePath = CHROMIUM_PATH;
  return chromium.launchPersistentContext(profileDir, opts);
}

module.exports = { getContext, CHROMIUM_PATH, PROFILES_DIR };
