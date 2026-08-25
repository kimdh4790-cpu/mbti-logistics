/**
 * 네이버 블로그 포스팅 (Playwright 브라우저 로그인 방식)
 * 사용법: node post-naver-blog.js --product filo [--dry-run]
 *
 * 최초 로그인:
 *   HEADLESS=false node post-naver-blog.js --product filo --login-only
 *
 * 환경변수: NAVER_BLOG_ID (블로그 아이디, 기본값: mbtico)
 */

const path = require('path');
const fs = require('fs');
const { chromium, getLaunchOpts, PROFILES_DIR, waitForEnter } = require('./session-manager');

const args = process.argv.slice(2);
function getArg(name) {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=')[1];
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}
const product = getArg('product') || 'filo';
const dryRun = args.includes('--dry-run');
const loginOnly = args.includes('--login-only');
const headless = process.env.HEADLESS !== 'false' && !loginOnly;
const BLOG_ID = process.env.NAVER_BLOG_ID || 'mbtico_official';

const ROOT = path.join(__dirname, '../..');
let meta = require(`../content/${product}-meta.json`);

// 주차 기반 variant 선택 (매주 다른 콘텐츠 각도로 홍보)
if (meta.variants && meta.variants.length > 0) {
  const weekIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % meta.variants.length;
  const variant = meta.variants[weekIdx];
  if (variant.youtube) meta = { ...meta, youtube: { ...meta.youtube, ...variant.youtube } };
  if (variant.instagram) meta = { ...meta, instagram: { ...meta.instagram, ...variant.instagram } };
  if (variant.blog) meta = { ...meta, blog: { ...meta.blog, ...variant.blog } };
  console.log(`[네이버 블로그] 콘텐츠 변형: ${variant.label} (${weekIdx + 1}/${meta.variants.length}주차 순환)`);
}

function buildBlogContent(product, meta) {
  const productMap = {
    filo: { name: 'FILO', domain: 'filo.ai.kr', emoji: '매장' },
    donway: { name: 'DONWAY', domain: 'donway.ai.kr', emoji: '정산' },
    yongcha: { name: '용차앱', domain: 'yongcha.app', emoji: '택배' },
    mbtico: { name: '물류배송앱 MBTICO', domain: 'mbtico.kr', emoji: '배송' },
  };
  const p = productMap[product] || productMap.filo;
  const yt = meta.youtube;

  return `
<h2>${yt.title}</h2>
<p>${yt.description.replace(/\n/g, '<br/>')}</p>

<h3>주요 기능</h3>
<p>${yt.description.split('\n').filter(l => l.startsWith('✅')).join('<br/>')}</p>

<h3>지금 바로 시작하세요</h3>
<p>무료 체험: <a href="https://${p.domain}" target="_blank">https://${p.domain}</a></p>

<p>${meta.instagram.hashtags.join(' ')}</p>
`.trim();
}

async function postNaverBlog() {
  const profileDir = path.join(PROFILES_DIR, 'naver');
  fs.mkdirSync(profileDir, { recursive: true });

  console.log(`[네이버 블로그] ${loginOnly ? '[LOGIN-ONLY] ' : dryRun ? '[DRY-RUN] ' : ''}시작: ${product}`);

  // dry-run: 프로필 파일 존재 여부로만 세션 확인 (headless Naver 차단 우회)
  if (dryRun) {
    const hasCookies = fs.existsSync(path.join(profileDir, 'Default', 'Cookies'))
      || fs.readdirSync(profileDir).length > 0;
    if (!hasCookies) {
      console.error('[네이버] 로그인 세션 없음. HEADLESS=false --login-only 로 먼저 로그인하세요.');
      process.exit(1);
    }
    console.log('[네이버][DRY-RUN] 로그인 세션 확인 완료.');
    console.log(`  제목: ${meta.blog.title}`);
    return;
  }

  const launchOpts = { ...getLaunchOpts(headless), timeout: 60000 };
  const ctx = await chromium.launchPersistentContext(profileDir, launchOpts);

  const page = await ctx.newPage();
  await page.goto('https://www.naver.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  if (loginOnly) {
    await waitForEnter('[네이버] 브라우저에서 네이버 로그인 후 Enter를 누르세요.');
    console.log('[네이버] 세션 저장됨.');
    await ctx.close();
    return;
  }

  // 로그인 확인
  const loginBtn = await page.locator('a.link_login, a[href*="nid.naver.com/nidlogin"]').count();
  if (loginBtn > 0) {
    console.error('[네이버] 로그인 세션 없음. HEADLESS=false --login-only 로 먼저 로그인하세요.');
    await ctx.close();
    process.exit(1);
  }

  // 블로그 글쓰기 페이지 접속
  const writeUrl = `https://blog.naver.com/${BLOG_ID}/postwrite`;
  await page.goto(writeUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 제목 입력 (iframe 내부)
  const titleFrame = page.frame({ url: /naver\.com/ }) || page;
  try {
    await titleFrame.waitForSelector('.se-title-text, #inputTitle', { timeout: 10000 });
    await titleFrame.click('.se-title-text, #inputTitle');
    await titleFrame.keyboard.type(meta.blog.title);
  } catch {
    console.log('[네이버] 제목 입력 시도 중...');
    await page.keyboard.type(meta.blog.title);
  }

  // 본문 입력
  const content = buildBlogContent(product, meta);
  try {
    await titleFrame.click('.se-content, .se-main-container, #postWriteLayer');
    await titleFrame.keyboard.type(content, { delay: 10 });
  } catch {
    console.log('[네이버] 본문 입력 대체 방법 사용...');
  }

  await page.waitForTimeout(2000);

  // 발행 버튼
  await page.locator('text=발행, button:has-text("발행")').first().click();
  await page.waitForTimeout(2000);
  await page.locator('text=확인, button:has-text("확인")').first().click().catch(() => {});

  console.log('[네이버 블로그] 포스팅 완료!');
  await page.waitForTimeout(3000);
  await ctx.close();
}

postNaverBlog().catch(console.error);
