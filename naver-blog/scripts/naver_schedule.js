/**
 * 네이버 블로그 자동 스케줄러
 * - 월: FILO/DINE, 수: DONWAY, 금: 용차앱
 * - drafts/queue.json에서 제품별 다음 초안 순환 선택
 *
 * Usage:
 *   node scripts/naver_schedule.js --product donway --publish
 *   node scripts/naver_schedule.js --auto --publish   (오늘 요일 자동 선택)
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const QUEUE_FILE = path.join(__dirname, '..', 'drafts', 'queue.json');
const DRAFTS_DIR = path.join(__dirname, '..', 'drafts');

// 요일별 제품 (0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토)
const DAY_PRODUCT = { 1: 'filo', 3: 'donway', 5: 'yongcha' };

// 제품별 초안 파일 목록
const PRODUCT_DRAFTS = {
  filo: [
    '20260831_filo_dine_카페직원관리.json',
    '20260907_filo_직원근태관리.json',
    '20260914_filo_POS주문통합.json',
    '20260921_filo_매출분석AI.json',
  ],
  donway: [
    '20260831_donway_배달대행정산자동화.json',
    '20260903_donway_알림톡자동발송.json',
    '20260910_donway_세금계산서자동발행.json',
    '20260917_donway_요금제비교.json',
  ],
  yongcha: [
    '20260905_yongcha_소장기사직접거래.json',
    '20260912_yongcha_AI기사추천.json',
    '20260919_yongcha_단가제안.json',
    '20260926_yongcha_수수료없는거래.json',
  ],
};

function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return {};
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
}

function saveQueue(q) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2));
}

function pickNextDraft(product) {
  const queue = loadQueue();
  const drafts = PRODUCT_DRAFTS[product] || [];
  if (!drafts.length) return null;

  const idx = queue[product] || 0;
  const file = drafts[idx % drafts.length];
  queue[product] = (idx + 1) % drafts.length;
  saveQueue(queue);

  const fullPath = path.join(DRAFTS_DIR, file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  초안 파일 없음: ${file} — 건너뜀`);
    return null;
  }
  return fullPath;
}

(async () => {
  const args = process.argv.slice(2);
  const isAuto = args.includes('--auto');
  const publish = args.includes('--publish') ? '--publish' : '';

  let product;
  if (isAuto) {
    const day = new Date().getDay();
    product = DAY_PRODUCT[day];
    if (!product) {
      console.log(`오늘(${day}요일)은 발행일이 아닙니다.`);
      process.exit(0);
    }
    console.log(`📅 오늘 요일(${day}) 제품: ${product}`);
  } else {
    const pidx = args.indexOf('--product');
    product = pidx !== -1 ? args[pidx + 1] : null;
  }

  if (!product || !PRODUCT_DRAFTS[product]) {
    console.error('사용법: node scripts/naver_schedule.js --product [filo|donway|yongcha] [--publish]');
    console.error('        node scripts/naver_schedule.js --auto [--publish]');
    process.exit(1);
  }

  const draftPath = pickNextDraft(product);
  if (!draftPath) {
    console.error(`❌ ${product} 초안 없음`);
    process.exit(1);
  }

  console.log(`🚀 발행 시작: ${path.basename(draftPath)}`);
  const cmd = `node "${path.join(__dirname, 'naver_draft.js')}" --draft "${draftPath}" ${publish}`;
  console.log('>', cmd);

  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (e) {
    process.exit(e.status || 1);
  }
})();
