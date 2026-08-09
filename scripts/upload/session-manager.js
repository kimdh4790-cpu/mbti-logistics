const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const PROFILES_DIR = process.env.PROFILES_DIR || path.join(os.homedir(), '.mbtico-profiles');

async function getContext(platform) {
  const profileDir = path.join(PROFILES_DIR, platform);
  const ctx = await chromium.launchPersistentContext(profileDir, {
    executablePath: CHROMIUM_PATH,
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    viewport: platform === 'instagram' ? { width: 375, height: 812 } : { width: 1280, height: 800 },
    userAgent: platform === 'instagram'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  return ctx;
}

module.exports = { getContext, CHROMIUM_PATH, PROFILES_DIR };
