const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const ROOT = path.join(__dirname, '../..');
const scenario = require('../content/filo-scenario.json');

async function record() {
  const outputDir = path.join(ROOT, 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const ctx = await browser.newContext({
    viewport: scenario.viewport,
    recordVideo: {
      dir: outputDir,
      size: scenario.viewport,
    },
  });

  const page = await ctx.newPage();
  console.log('[FILO] 녹화 시작...');

  for (const step of scenario.steps) {
    if (step.action === 'goto') {
      console.log(`  → ${step.url}`);
      await page.goto(step.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
        return page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      });
      await page.waitForTimeout(step.wait || 2000);
    } else if (step.action === 'scroll') {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), step.y);
      await page.waitForTimeout(step.wait || 1500);
    } else if (step.action === 'screenshot') {
      const shot = path.join(outputDir, `filo-${step.label}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      console.log(`  [스크린샷] ${shot}`);
    } else if (step.action === 'wait') {
      await page.waitForTimeout(step.ms);
    }
  }

  await ctx.close();
  await browser.close();

  // Rename the generated webm to the scenario output name
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm') && !f.startsWith('filo-raw'));
  if (files.length > 0) {
    const newest = files.sort((a, b) =>
      fs.statSync(path.join(outputDir, b)).mtimeMs - fs.statSync(path.join(outputDir, a)).mtimeMs
    )[0];
    fs.renameSync(path.join(outputDir, newest), path.join(outputDir, 'filo-raw.webm'));
    console.log('[FILO] 녹화 완료: output/filo-raw.webm');
  }
}

record().catch(console.error);
