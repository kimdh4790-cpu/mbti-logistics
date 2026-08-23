#!/usr/bin/env node
/**
 * 스마트 스모크 테스트 러너
 *
 * 사용법:
 *   node scripts/test/run-smoke.js           # git diff로 변경 파일 감지 → 영향 앱만 테스트
 *   node scripts/test/run-smoke.js --all     # 전체 앱 테스트
 *   node scripts/test/run-smoke.js --app filo donway   # 특정 앱만 테스트
 *
 * npm 단축키:
 *   npm run smoke          # 변경 감지 자동
 *   npm run smoke:all      # 전체
 *   npm run smoke:filo     # FILO만
 */

const { execSync } = require('child_process');
const path = require('path');
const impactMap = require('./impact-map.json');

const SMOKE_SCRIPTS = {
  filo:    './smoke-filo.js',
  dine:    './smoke-dine.js',
  donway:  './smoke-donway.js',
  yongcha: './smoke-yongcha.js',
  mbtico:  './smoke-mbtico.js',
};

function getChangedFiles() {
  try {
    const staged = execSync('git diff --name-only HEAD', { encoding: 'utf8' }).trim();
    const unstaged = execSync('git diff --name-only', { encoding: 'utf8' }).trim();
    const all = [...staged.split('\n'), ...unstaged.split('\n')]
      .map(f => f.trim()).filter(Boolean);
    return [...new Set(all)];
  } catch {
    return [];
  }
}

function detectAffectedApps(changedFiles) {
  const affected = new Set();
  for (const file of changedFiles) {
    for (const rule of impactMap.rules) {
      if (file.includes(rule.pattern)) {
        rule.apps.forEach(a => affected.add(a));
      }
    }
  }
  return [...affected];
}

async function runSmoke(appName) {
  const scriptPath = path.join(__dirname, SMOKE_SCRIPTS[appName]);
  const { run } = require(scriptPath);
  return run();
}

async function main() {
  const args = process.argv.slice(2);
  let appsToTest = [];

  if (args.includes('--all')) {
    appsToTest = Object.keys(SMOKE_SCRIPTS);
    console.log('\n[스모크] 전체 앱 테스트 시작...\n');
  } else if (args.includes('--app')) {
    const idx = args.indexOf('--app');
    appsToTest = args.slice(idx + 1).filter(a => SMOKE_SCRIPTS[a]);
    if (appsToTest.length === 0) {
      console.error('--app 뒤에 앱 이름을 입력하세요: filo dine donway yongcha mbtico');
      process.exit(1);
    }
    console.log(`\n[스모크] 지정 앱 테스트: ${appsToTest.join(', ')}\n`);
  } else {
    const changed = getChangedFiles();
    if (changed.length === 0) {
      console.log('\n[스모크] 변경된 파일 없음 — 테스트 스킵\n');
      return;
    }
    appsToTest = detectAffectedApps(changed);
    if (appsToTest.length === 0) {
      console.log('\n[스모크] 앱에 영향 없는 파일 변경 (scripts/, assets/ 등) — 테스트 스킵\n');
      console.log(`  변경 파일: ${changed.join(', ')}`);
      return;
    }
    console.log(`\n[스모크] 변경 감지 → 영향 앱: ${appsToTest.join(', ')}`);
    console.log(`  (변경 파일: ${changed.slice(0, 5).join(', ')}${changed.length > 5 ? ` 외 ${changed.length - 5}개` : ''})\n`);
  }

  const allResults = [];
  let totalFailed = 0;
  const start = Date.now();

  for (const app of appsToTest) {
    process.stdout.write(`[${app.toUpperCase()}] 테스트 중...`);
    try {
      const results = await runSmoke(app);
      const failed = results.filter(r => !r.ok);
      totalFailed += failed.length;
      allResults.push({ app, results });
      if (failed.length === 0) {
        process.stdout.write(` OK (${results.length}/${results.length})\n`);
      } else {
        process.stdout.write(` FAIL (${results.length - failed.length}/${results.length} 통과)\n`);
        for (const r of failed) {
          const detail = r.error || `키워드 없음: ${(r.missing || []).join(', ')}`;
          console.log(`    ✗ ${r.name} — ${detail}`);
        }
      }
    } catch (e) {
      totalFailed++;
      process.stdout.write(` ERROR\n`);
      console.log(`    ${e.message.split('\n')[0]}`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n[스모크] ${appsToTest.length}개 앱, ${elapsed}초 소요`);

  if (totalFailed === 0) {
    console.log('[스모크] 전체 통과\n');
  } else {
    console.log(`[스모크] ${totalFailed}개 실패 — push 전 확인 필요\n`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
