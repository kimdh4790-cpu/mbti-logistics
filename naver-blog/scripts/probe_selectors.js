/**
 * 셀렉터 진단용 DOM 덤프 — 읽기 전용, 저장 없음
 * 셀렉터 실패 시 이 스크립트로 실제 DOM 구조를 확인하고 naver_draft.js를 수정
 *
 * Usage: node scripts/probe_selectors.js
 * 출력: drafts/probe_dump.json (버튼·입력 요소 목록)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROFILE_DIR = path.join(__dirname, '..', 'naver-profile');
const BLOG_ID = process.env.BLOG_ID || 'soungkyekim';

(async () => {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1600, height: 1000 },
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto(`https://blog.naver.com/BlogTitleEditView.naver?blogId=${BLOG_ID}`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  await page.waitForTimeout(3000);

  // "작성 중인 글" 팝업 처리
  const popupCancel = await page.$('button.se-popup-button-cancel');
  if (popupCancel) await popupCancel.click();

  await page.waitForTimeout(2000);

  const dump = await page.evaluate(() => {
    const collect = (selector, label) => {
      return Array.from(document.querySelectorAll(selector)).map(el => ({
        label,
        tag: el.tagName,
        id: el.id,
        class: el.className.slice(0, 100),
        text: el.textContent.trim().slice(0, 60),
        'data-testid': el.dataset?.testid,
        title: el.title,
        type: el.type,
        placeholder: el.placeholder,
      }));
    };

    return {
      buttons: collect('button', 'button'),
      inputs: collect('input, textarea', 'input'),
      titleArea: collect('.se-title-text, [class*="title"]', 'title'),
      bodyArea: collect('.se-section-text p, [class*="se-text"]', 'body'),
      toolbar: collect('[class*="toolbar"] button, [class*="tool"] button', 'toolbar'),
    };
  });

  const dumpPath = path.join(__dirname, '..', 'drafts', 'probe_dump.json');
  fs.mkdirSync(path.dirname(dumpPath), { recursive: true });
  fs.writeFileSync(dumpPath, JSON.stringify(dump, null, 2));

  console.log('✅ DOM 덤프 저장:', dumpPath);
  console.log('버튼 수:', dump.buttons.length);
  console.log('입력 수:', dump.inputs.length);
  console.log('\n툴바 버튼 목록:');
  dump.toolbar.slice(0, 20).forEach(b => console.log(' -', b.class.split(' ')[0], '|', b.text, '|', b.title));

  console.log('\n브라우저는 열린 상태로 유지 — DOM을 직접 확인하세요. 종료하려면 Ctrl+C');
  await page.waitForTimeout(60000);
  await context.close();
})();
