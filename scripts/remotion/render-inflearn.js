#!/usr/bin/env node
/**
 * Remotion으로 인프런 클립 홍보 영상 렌더링
 * 사용: node scripts/remotion/render-inflearn.js [--reels] [--dry-run] [--variant A|B|C|D|E|F]
 *
 * 변형 없으면 주차 기반 자동 선택 (A=카카오, B=급여, C=부가세, D=경비, E=오라클, F=AI프롬프트)
 */

const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const reelsMode = args.includes('--reels');
const dryRun = args.includes('--dry-run');

function getArg(name) {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=')[1];
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const ROOT    = path.join(__dirname, '../..');
const ENTRY   = path.join(__dirname, 'index.jsx');
const OUT_DIR = path.join(ROOT, 'output');

// ── 변형 선택 ───────────────────────────────────────────────────
const VARIANTS_FILE = path.join(ROOT, 'scripts/content/variants/inflearn-variants.json');
const NARRATION_FILE = path.join(ROOT, 'scripts/content/inflearn-narration.json');

function loadVariant(forcedKey) {
  const variants = JSON.parse(fs.readFileSync(VARIANTS_FILE, 'utf8'));
  const keys = Object.keys(variants); // A-F
  let key;
  if (forcedKey && variants[forcedKey]) {
    key = forcedKey;
  } else {
    const weekIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
    key = keys[weekIdx % keys.length];
  }
  const variant = variants[key];
  console.log(`[Remotion] 인프런 변형: ${key} — ${variant.clip} (${variant.clipId})`);
  return { key, variant };
}

function writeNarrationFromVariant(variant) {
  const narration = {
    product: 'inflearn',
    voice: variant.voice || 'ko-KR-Neural2-B',
    speedRate: variant.speedRate || 1.0,
    lines: variant.lines,
  };
  fs.writeFileSync(NARRATION_FILE, JSON.stringify(narration, null, 2), 'utf8');
  console.log(`[Remotion] 나레이션 파일 업데이트: ${variant.lines.length}줄`);
}

function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
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

  const forcedKey = getArg('variant');
  const { key: variantKey, variant } = loadVariant(forcedKey);

  // 나레이션 JSON을 variant 기반으로 덮어쓰기 (generate-narration.js가 이 파일 읽음)
  writeNarrationFromVariant(variant);

  const compositionId = reelsMode ? 'InflearnReels' : 'InflearnPromo';
  const outFile = reelsMode
    ? path.join(OUT_DIR, 'inflearn-reels.mp4')
    : path.join(OUT_DIR, 'inflearn-promo.mp4');

  console.log(`[Remotion] 인프런 홍보 영상 렌더링 시작 (${compositionId}, 변형 ${variantKey})`);

  if (dryRun) {
    console.log('[Remotion][DRY-RUN] 렌더링 건너뜀.');
    console.log(`  출력 파일: ${outFile}`);
    console.log(`  변형: ${variantKey} — ${variant.clip}`);
    return;
  }

  const chromiumPath = findChromium();
  if (chromiumPath) console.log(`[Remotion] Chromium: ${chromiumPath}`);

  const pubDir = path.join(ROOT, 'public');
  fs.mkdirSync(pubDir, { recursive: true });

  const narFile = path.join(OUT_DIR, 'inflearn-narration.mp3');
  let hasNarration = false;
  if (fs.existsSync(narFile)) {
    fs.copyFileSync(narFile, path.join(pubDir, 'inflearn-narration.mp3'));
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

  // clipVariant: Remotion 컴포지션에 전달할 변형 정보 (직렬화 가능 데이터만)
  const clipVariant = {
    key: variantKey,
    clip: variant.clip,
    clipId: variant.clipId,
    url: variant.url,
    slides: variant.slides || [],
    hashtags: variant.hashtags || [],
  };

  console.log('[Remotion] 컴포지션 로딩...');
  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps: { hasNarration, hasBgm, clipVariant },
    ...(chromiumPath ? { chromiumExecutablePath: chromiumPath } : {}),
  });

  console.log(`[Remotion] 렌더링... (${composition.durationInFrames}프레임, ${composition.fps}fps)`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outFile,
    inputProps: { hasNarration, hasBgm, clipVariant },
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
    const finalPath = path.join(OUT_DIR, 'inflearn-final.mp4');
    fs.copyFileSync(outFile, finalPath);
    console.log(`[Remotion] 복사: ${finalPath}`);
  }
}

main().catch((err) => {
  console.error('[Remotion] 오류:', err.message);
  process.exit(1);
});
