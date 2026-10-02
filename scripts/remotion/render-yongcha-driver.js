#!/usr/bin/env node
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const reelsMode = args.includes('--reels');
const dryRun = args.includes('--dry-run');

const ROOT  = path.join(__dirname, '../..');
const ENTRY = path.join(__dirname, 'index.jsx');
const OUT_DIR = path.join(ROOT, 'output');

function findChromium() {
  const { execSync } = require('child_process');
  const candidates = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium-linux/chrome-linux/chrome'];
  for (const c of candidates) {
    if (!c) continue;
    if (fs.existsSync(c)) return c;
  }
  for (const bin of ['chromium', 'chromium-browser', 'google-chrome']) {
    try { const p = execSync(`which ${bin} 2>/dev/null`).toString().trim(); if (p) return p; } catch (_) {}
  }
  return undefined;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const compositionId = reelsMode ? 'YongchaDriverReels' : 'YongchaDriverPromo';
  const outFile = reelsMode
    ? path.join(OUT_DIR, 'yongcha-driver-reels.mp4')
    : path.join(OUT_DIR, 'yongcha-driver-promo.mp4');

  console.log(`[Remotion] 기사 관점 영상 렌더링 (${compositionId})`);
  if (dryRun) { console.log('[DRY-RUN]', outFile); return; }

  const chromiumPath = findChromium();
  if (chromiumPath) console.log(`[Remotion] Chromium: ${chromiumPath}`);

  const pubDir = path.join(ROOT, 'public');
  fs.mkdirSync(pubDir, { recursive: true });

  const bundled = await bundle({ entryPoint: ENTRY, webpackOverride: (c) => c, publicDir: pubDir });
  const browserOpts = chromiumPath ? { browserExecutable: chromiumPath, onBrowserDownload: () => ({ onProgress: () => undefined, version: null }) } : {};

  const composition = await selectComposition({ serveUrl: bundled, id: compositionId, inputProps: { hasNarration: false, hasBgm: false }, ...browserOpts });

  await renderMedia({
    composition, serveUrl: bundled, codec: 'h264', outputLocation: outFile,
    inputProps: { hasNarration: false, hasBgm: false },
    videoBitrate: '8M', backgroundColor: '#000d1a',
    ...browserOpts,
    onProgress: ({ renderedFrames, totalFrames }) => {
      if (renderedFrames % 60 === 0 || renderedFrames === totalFrames) {
        process.stdout.write(`\r[Remotion] ${renderedFrames}/${totalFrames} (${Math.round(renderedFrames/totalFrames*100)}%)  `);
      }
    },
    logLevel: 'warn',
  });

  console.log(`\n[Remotion] 완료: ${outFile}`);
  if (!reelsMode) fs.copyFileSync(outFile, path.join(OUT_DIR, 'yongcha-driver-final.mp4'));
}

main().catch((err) => { console.error('[Remotion] 오류:', err.message); process.exit(1); });
