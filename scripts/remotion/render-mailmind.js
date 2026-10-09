const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const isReels = args.includes('--reels');
const langArg = args.find(a => a.startsWith('--lang='));
const variantArg = args.find(a => a.startsWith('--variant='));
const lang = langArg ? langArg.split('=')[1] : (process.env.MAILMIND_LANG || 'JP');
const variant = variantArg ? variantArg.split('=')[1] : (process.env.MAILMIND_VARIANT || 'A');

const compositionId = isReels ? 'MailMindReels' : 'MailMindPromo';
const outFile = isReels ? 'output/mailmind-reels.mp4' : 'output/mailmind-promo.mp4';

// 나레이션 로드 (mailmind-variants.json)
let subtitles = null;
try {
  const variantsPath = path.join(__dirname, '../content/mailmind-variants.json');
  const variants = JSON.parse(fs.readFileSync(variantsPath, 'utf8'));
  const langData = variants.languages && variants.languages[lang];
  if (langData) {
    const variantData = langData[`variant${variant}`] || langData.variantA;
    if (variantData && variantData.narration) {
      subtitles = variantData.narration.map((line, i) => ({
        start: line.startSec,
        end: line.endSec || (line.startSec + 10),
        text: line.text,
      }));
    }
  }
} catch (e) {
  console.log('[mailmind] variants.json 로드 실패, 기본 자막 사용:', e.message);
}

// 로고 경로
const logoPath = path.join(__dirname, '../../assets/mailmind-logo.png');
const logoSrc = fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}` : null;

(async () => {
  console.log(`[mailmind] 렌더링 시작: ${compositionId} LANG=${lang} VARIANT=${variant}`);
  fs.mkdirSync('output', { recursive: true });

  const chromiumPath = process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_BROWSERS_PATH
    ? require('fs').readdirSync(process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers').length > 0
      ? require('child_process').execSync('ls /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1').toString().trim()
      : undefined
    : undefined;

  const bundled = await bundle({
    entryPoint: path.join(__dirname, 'index.jsx'),
    webpackOverride: (c) => c,
  });

  const inputProps = { lang, variant, subtitles, logoSrc };
  const composition = await selectComposition({ serveUrl: bundled, id: compositionId, inputProps });

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outFile,
    inputProps,
    ...(chromiumPath ? { chromiumOptions: { executablePath: chromiumPath } } : {}),
  });

  console.log(`[mailmind] 완료: ${outFile}`);
})().catch(err => {
  console.error('[mailmind] 렌더링 실패:', err);
  process.exit(1);
});
