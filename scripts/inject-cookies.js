#!/usr/bin/env node
// Inject Chrome browser cookies into Playwright persistent profile
// Usage: node scripts/inject-cookies.js /tmp/yt-cookies.json
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROFILE_DIR = path.join(process.env.HOME, '.mbtico-profiles', 'youtube');
const cookieFile = process.argv[2];

if (!cookieFile || !fs.existsSync(cookieFile)) {
  console.error('Usage: node scripts/inject-cookies.js <cookie-json-file>');
  process.exit(1);
}

const rawCookies = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));

const sameSiteMap = { no_restriction: 'None', lax: 'Lax', strict: 'Strict' };
const cookies = rawCookies.map(c => ({
  name: c.name,
  value: c.value,
  domain: c.domain,
  path: c.path || '/',
  expires: c.expirationDate ? Math.floor(c.expirationDate) : -1,
  httpOnly: !!c.httpOnly,
  secure: !!c.secure,
  sameSite: sameSiteMap[c.sameSite] || 'Lax',
}));

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

// Also search ~/.cache/ms-playwright for any chromium
try {
  const playwrightDir = path.join(process.env.HOME, '.cache', 'ms-playwright');
  if (fs.existsSync(playwrightDir)) {
    fs.readdirSync(playwrightDir).forEach(d => {
      const p = path.join(playwrightDir, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) CHROMIUM_CANDIDATES.push(p);
    });
  }
} catch (_) {}

const CHROMIUM_PATH = CHROMIUM_CANDIDATES.find(p => fs.existsSync(p));

(async () => {
  console.log('Profile:', PROFILE_DIR);
  console.log('Chromium:', CHROMIUM_PATH || '(playwright default)');
  console.log('Cookies to inject:', cookies.length);

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  await ctx.addCookies(cookies);
  console.log('Cookies injected.');

  const page = await ctx.newPage();
  await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/yt-after-inject.png' });
  console.log('Screenshot: /tmp/yt-after-inject.png');

  const url = page.url();
  const title = await page.title();
  console.log('URL:', url);
  console.log('Title:', title);

  const hasVerifyDialog = await page.locator('text=본인임을 확인').count();
  if (hasVerifyDialog > 0) {
    console.log('FAIL: 본인 인증 dialog still showing.');
  } else {
    console.log('OK: No verification dialog. Cookie injection successful!');
  }

  await ctx.close();
})().catch(err => { console.error(err); process.exit(1); });
