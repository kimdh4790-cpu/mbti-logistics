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
const PRODUCTS = ['filo', 'donway', 'yongcha', 'mbtico'];
const targets = product === 'all' ? PRODUCTS : [product];

const ROOT = path.join(__dirname, '..');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit', cwd: ROOT, ...opts });
  if (result.status !== 0) {
    throw new Error(`명령어 실패 (exit ${result.status}): ${cmd}`);
  }
}

async function runPipeline() {
  console.log(`\n=== MBTICO 소셜미디어 파이프라인 ===`);
  console.log(`제품: ${targets.join(', ')}`);
  console.log(`단계: ${steps.join(' → ')}`);
  console.log(`Dry-run: ${dryRun}\n`);

  for (const prod of targets) {
    console.log(`\n--- [${prod.toUpperCase()}] 시작 ---`);

    if (steps.includes('record')) {
      console.log(`[${prod}] Step 1: 화면 녹화`);
      run(`node scripts/capture/record-${prod}.js`);
    }

    if (steps.includes('compose')) {
      console.log(`[${prod}] Step 2: FFmpeg 편집`);
      run(`bash scripts/compose/compose-video.sh ${prod}`);
      run(`bash scripts/compose/make-thumbnail.sh ${prod}`);
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
