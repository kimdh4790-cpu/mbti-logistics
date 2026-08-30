#!/usr/bin/env node
/**
 * Remotion으로 DONWAY 홍보 영상 렌더링
 * 사용: node scripts/remotion/render-donway.js [--reels] [--dry-run]
 */

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
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-linux/chrome-linux/chrome',
    '/opt/pw-browsers/chromium-*/chrome-linux/chrome',
  ];
  const { execSync } = require('child_process');
  for (const c of candidates) {
    if (!c) continue;
    if (c.includes('*')) {
      try { const f = execSync(`ls ${c} 2>/dev/null | head -1`).toString().trim(); if (f && fs.existsSync(f)) return f; } catch (_) {}
    } else if (fs.existsSync(c)) { return c; }
  }
  for (const bin of ['chromium', 'chromium-browser', 'google-chrome']) {
    try { const p = execSync(`which ${bin} 2>/dev/null`).toString().trim(); if (p) return p; } catch (_) {}
  }
  return undefined;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const compositionId = reelsMode ? 'DonwayReels' : 'DonwayPromo';
  const outFile = reelsMode
    ? path.join(OUT_DIR, 'donway-reels.mp4')
    : path.join(OUT_DIR, 'donway-promo.mp4');

  console.log(`[Remotion] DONWAY 영상 렌더링 시작 (${compositionId})`);

  if (dryRun) {
    console.log('[Remotion][DRY-RUN] 렌더링 건너뜀.');
    console.log(`  출력 파일: ${outFile}`);
    return;
  }

  const chromiumPath = findChromium();
  if (chromiumPath) console.log(`[Remotion] Chromium: ${chromiumPath}`);

  const pubDir = path.join(ROOT, 'public');
  fs.mkdirSync(pubDir, { recursive: true });

  const narFile = path.join(OUT_DIR, 'donway-narration.mp3');
  let hasNarration = false;
  if (fs.existsSync(narFile)) {
    fs.copyFileSync(narFile, path.join(pubDir, 'donway-narration.mp3'));
    hasNarration = true;
    console.log('[Remotion] 나레이션 파일 복사 완료');
  } else {
    console.log('[Remotion] 나레이션 파일 없음 — 무음으로 렌더링');
  }

  const bgmFile = path.join(ROOT, 'assets/bgm/background.mp3');
  let hasBgm = false;
  if (fs.existsSync(bgmFile)) {
    fs.copyFileSync(bgmFile, path.join(pubDir, 'bgm.mp3'));
    hasBgm = true;
    console.log('[Remotion] BGM 파일 복사 완료');
  } else {
    console.log('[Remotion] BGM 파일 없음 — BGM 없이 렌더링');
  }

  console.log('[Remotion] 번들링 중...');
  const bundled = await bundle({
    entryPoint: ENTRY,
    webpackOverride: (config) => config,
    publicDir: pubDir,
  });

  console.log('[Remotion] 컴포지션 로딩...');
  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps: { hasNarration, hasBgm },
    ...(chromiumPath ? { chromiumExecutablePath: chromiumPath } : {}),
  });

  console.log(`[Remotion] 렌더링... (${composition.durationInFrames}프레임, ${composition.fps}fps)`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outFile,
    inputProps: { hasNarration, hasBgm },
    videoBitrate: '8M',
    backgroundColor: '#08101f',
    ...(chromiumPath ? { chromiumExecutablePath: chromiumPath } : {}),
    onProgress: ({ renderedFrames, totalFrames }) => {
      if (renderedFrames % 60 === 0 || renderedFrames === totalFrames) {
        const pct = Math.round((renderedFrames / totalFrames) * 100);
        process.stdout.write(`\r[Remotion] 진행: ${renderedFrames}/${totalFrames} (${pct}%)  `);
      }
    },
    logLevel: 'warn',
  });

  console.log(`\n[Remotion] 완료: ${outFile}`);
  const stat = fs.statSync(outFile);
  console.log(`[Remotion] 파일 크기: ${(stat.size / 1024 / 1024).toFixed(1)}MB`);

  if (!reelsMode) {
    const finalPath = path.join(OUT_DIR, 'donway-final.mp4');
    fs.copyFileSync(outFile, finalPath);
    console.log(`[Remotion] 복사: ${finalPath}`);
  }
}

main().catch((err) => {
  console.error('[Remotion] 오류:', err.message);
  process.exit(1);
});
