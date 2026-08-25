/**
 * 소셜미디어 홍보 자동화 파이프라인 진입점
 *
 * 사용법:
 *   node scripts/run-pipeline.js --product filo --steps record,compose,youtube,instagram,blog
 *   node scripts/run-pipeline.js --product all --steps record,compose
 *   node scripts/run-pipeline.js --product filo --steps youtube --dry-run
 *
 * steps 기본값: record,compose (업로드는 명시 필요)
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2);
const getArg = (flag) => {
  const a = args.find(a => a.startsWith(`${flag}=`));
  if (a) return a.split('=')[1];
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const product = getArg('--product') || 'filo';
const steps = (getArg('--steps') || 'record,compose').split(',').map(s => s.trim());
const dryRun = args.includes('--dry-run');
const PRODUCTS = ['filo', 'dine', 'donway', 'yongcha', 'mbtico'];
const targets = product === 'all' ? PRODUCTS : [product];

const ROOT = path.join(__dirname, '..');

function getBash() {
  if (process.platform !== 'win32') return 'bash';
  // Git for Windows bash 탐색
  try {
    const found = execSync('where bash', { encoding: 'utf8' }).trim().split('\n')[0].trim();
    if (found && fs.existsSync(found)) return `"${found}"`;
  } catch {}
  // Git Bash 기본 경로
  const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
  if (fs.existsSync(gitBash)) return `"${gitBash}"`;
  // WSL 폴백
  return 'wsl bash';
}

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit', cwd: ROOT, ...opts });
  if (result.status !== 0) {
    throw new Error(`명령어 실패 (exit ${result.status}): ${cmd}`);
  }
}

async function runPipeline() {
  // Oracle Cloud: CHROMIUM_PATH 자동 감지
  if (process.platform === 'linux' && !process.env.CHROMIUM_PATH) {
    const { execSync: es } = require('child_process');
    const detected = ['chromium', 'chromium-browser', '/usr/bin/chromium', '/usr/bin/chromium-browser']
      .map(p => { try { return es(`command -v ${p} 2>/dev/null`, { encoding: 'utf8' }).trim(); } catch { return ''; } })
      .filter(Boolean)[0];
    if (detected) process.env.CHROMIUM_PATH = detected;
  }

  console.log(`\n=== MBTICO 소셜미디어 파이프라인 ===`);
  console.log(`제품: ${targets.join(', ')}`);
  console.log(`단계: ${steps.join(' → ')}`);
  console.log(`Dry-run: ${dryRun}`);
  if (process.env.CHROMIUM_PATH) console.log(`Chromium: ${process.env.CHROMIUM_PATH}`);
  console.log('');

  for (const prod of targets) {
    console.log(`\n--- [${prod.toUpperCase()}] 시작 ---`);

    if (steps.includes('record')) {
      console.log(`[${prod}] Step 1: 화면 녹화`);
      run(`node scripts/capture/record-${prod}.js`);
    }

    if (steps.includes('compose')) {
      console.log(`[${prod}] Step 2: FFmpeg 편집`);
      const bash = getBash();
      run(`${bash} scripts/compose/compose-video.sh ${prod}`);
      // 썸네일은 final.mp4 있을 때만
      const finalMp4 = path.join(ROOT, 'output', `${prod}-final.mp4`);
      if (fs.existsSync(finalMp4)) {
        run(`${bash} scripts/compose/make-thumbnail.sh ${prod}`);
      }
    }

    if (steps.includes('youtube')) {
      console.log(`[${prod}] Step 3a: YouTube 업로드`);
      run(`node scripts/upload/upload-youtube.js --product ${prod}${dryRun ? ' --dry-run' : ''}`);
    }

    if (steps.includes('instagram')) {
      console.log(`[${prod}] Step 3b: Instagram 업로드`);
      run(`node scripts/upload/upload-instagram.js --product ${prod} --type reels${dryRun ? ' --dry-run' : ''}`);
    }

    if (steps.includes('blog')) {
      console.log(`[${prod}] Step 3c: 네이버 블로그 포스팅`);
      run(`node scripts/upload/post-naver-blog.js --product ${prod}${dryRun ? ' --dry-run' : ''}`);
    }

    console.log(`\n--- [${prod.toUpperCase()}] 완료 ---`);
  }

  console.log('\n=== 전체 파이프라인 완료 ===\n');
}

runPipeline().catch(err => {
  console.error('\n[파이프라인 오류]', err.message);
  process.exit(1);
});
