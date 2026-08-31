/**
 * 네이버 블로그 자동 임시저장 / 자동 발행 스크립트
 * - 입력 순서: 본문 전체 → 제목 (마지막)
 * - 한글: keyboard.insertText() 사용 (keyboard.type() IME 버그 방지)
 *
 * Usage:
 *   node scripts/naver_draft.js --draft drafts/post.json            # 임시저장
 *   node scripts/naver_draft.js --draft drafts/post.json --publish  # 자동 발행
 *   node scripts/naver_draft.js --draft drafts/post.json --dry-run  # 테스트
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROFILE_DIR = path.join(__dirname, '..', 'naver-profile');
const BLOG_ID = process.env.BLOG_ID || 'soungkyekim';
const DRY_RUN = process.argv.includes('--dry-run');
const AUTO_PUBLISH = process.argv.includes('--publish');

// --draft 플래그 또는 첫 번째 포지셔널 인수 모두 허용
const draftArgIdx = process.argv.indexOf('--draft');
const rawPath = draftArgIdx !== -1
  ? process.argv[draftArgIdx + 1]
  : process.argv.find((a, i) => i >= 2 && !a.startsWith('--') && a.endsWith('.json'));

if (!rawPath) {
  console.error('사용법: node scripts/naver_draft.js --draft drafts/post.json [--dry-run]');
  process.exit(1);
}

const draftPath = path.resolve(rawPath);
if (!fs.existsSync(draftPath)) {
  console.error('초안 파일 없음:', draftPath);
  process.exit(1);
}

const draft = JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
const { title, tags = [], place, video, blocks = [] } = draft;

const results = {
  tags: { ok: false, count: 0 },
  place: { ok: false },
  video: { ok: false },
  subtitles: { ok: 0, total: blocks.filter(b => b.type === 'subtitle').length },
};


// ── 한글/이모지 혼합 안전 입력 ─────────────────────────────────────────
async function insertText(page, text) {
  const emojiRe = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{27FF}\u{2300}-\u{23FF}]/u;
  const parts = text.split(/([\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}]+)/u);
  for (const part of parts) {
    if (!part) continue;
    if (emojiRe.test(part)) {
      await page.keyboard.type(part, { delay: 30 });
    } else {
      await page.keyboard.insertText(part);
    }
    await page.waitForTimeout(50);
  }
}

// ── 본문 클릭 (제목 오염 방지 — 본문 전용 셀렉터) ──────────────────────
// force:true — SVG 캐럿 레이어가 포인터 이벤트를 가로막는 경우 우회
async function clickBody(page) {
  await page.click('.se-section-text p.se-text-paragraph', { force: true, timeout: 15000 });
}

// ── 포맷 드롭다운 열기 (셀렉터 복수 시도) ──────────────────────────────
async function openFormatDropdown(page) {
  // Naver SE1 포맷 버튼 후보 순서대로 시도
  const fmtSelectors = [
    'button.se-text-format-toolbar-button',
    'button[class*="se-text-format"]',
    'button[class*="format-toolbar"]',
    'button[data-name="textType"]',
    '.se-toolbar button:first-child',
  ];
  for (const sel of fmtSelectors) {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      // 팝업 대기
      const popup = await page.waitForSelector(
        '.se-popup-list, [class*="se-popup"] ul, [class*="text-style"] ul',
        { state: 'visible', timeout: 8000 }
      ).catch(() => null);
      if (popup) return popup;
    }
  }
  return null;
}

// ── 소제목 블록 입력 ────────────────────────────────────────────────────
async function inputSubtitle(page, content) {
  // 1. 포맷 드롭다운 열기
  const popup = await openFormatDropdown(page);
  if (!popup) {
    console.warn('⚠️  포맷 드롭다운 못 찾음 — 소제목 없이 본문으로 입력');
    await insertText(page, content);
    await page.keyboard.press('Enter');
    return;
  }

  // 2. "소제목" 옵션 클릭
  const items = await page.$$('.se-popup-list li, [class*="se-popup"] ul li');
  let clicked = false;
  for (const item of items) {
    const txt = await item.textContent();
    if (txt && txt.includes('소제목')) {
      await item.click();
      clicked = true;
      break;
    }
  }
  if (!clicked) await page.keyboard.press('Escape');

  await page.waitForTimeout(400);

  // 3. 텍스트 입력
  await insertText(page, content);
  await page.keyboard.press('Enter');

  // 4. 본문으로 복귀
  const popup2 = await openFormatDropdown(page);
  if (popup2) {
    const items2 = await page.$$('.se-popup-list li, [class*="se-popup"] ul li');
    for (const item of items2) {
      const txt = await item.textContent();
      if (txt && (txt.includes('본문') || txt.includes('기본'))) {
        await item.click();
        break;
      }
    }
  }
  await page.waitForTimeout(300);
  results.subtitles.ok++;
}

// ── 이미지 블록 입력 ────────────────────────────────────────────────────
// 숨겨진 input[type=file]을 직접 찾아 setInputFiles()로 업로드
async function inputImage(page, block) {
  const absPath = path.resolve(block.path);
  if (!fs.existsSync(absPath)) {
    console.warn(`⚠️  이미지 파일 없음: ${absPath}`);
    return;
  }

  // 이미지 툴바 버튼 클릭
  const imgBtnSels = [
    'button[class*="image"]:not([class*="video"]):not([class*="gif"])',
    'button[title*="사진"]',
    'button[aria-label*="사진"]',
    'button[aria-label*="이미지"]',
    '.se-toolbar button:nth-child(3)',
  ];
  let clicked = false;
  for (const sel of imgBtnSels) {
    const btn = await page.$(sel).catch(() => null);
    if (btn) {
      await btn.click().catch(() => {});
      clicked = true;
      break;
    }
  }

  await page.waitForTimeout(800);

  // 숨겨진 file input에 직접 파일 설정 (filechooser 이벤트 우회)
  const fileInput = await page.$('input[type="file"]').catch(() => null);
  if (fileInput) {
    await fileInput.setInputFiles(absPath);
    await page.waitForTimeout(3000);

    // 삽입 확인 버튼
    await page.click(
      'button:has-text("확인"), button:has-text("삽입"), button[class*="confirm"], button[class*="ok"]'
    ).catch(() => {});
    await page.waitForTimeout(1000);

    // 캡션 입력
    if (block.caption) {
      const captionInput = await page.$(
        'input[placeholder*="캡션"], textarea[placeholder*="캡션"], [class*="caption"] input, [class*="caption"] textarea'
      ).catch(() => null);
      if (captionInput) {
        await captionInput.click().catch(() => {});
        await captionInput.fill(block.caption);
        await page.waitForTimeout(300);
      }
    }
    console.log(`  📸 이미지 업로드 완료: ${path.basename(block.path)}`);
  } else {
    // 파일 input 못 찾으면 플레이스홀더로 폴백
    console.warn(`⚠️  file input 못 찾음 — 플레이스홀더 삽입: ${block.path}`);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
    await page.click('.se-section-text p.se-text-paragraph', { timeout: 5000 }).catch(() => {});
    await page.keyboard.insertText(`[이미지: ${path.basename(block.path)}]`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
  }
}

// ── 동영상 업로드 ───────────────────────────────────────────────────────
async function inputVideo(page, videoInfo) {
  const { path: videoPath, title: videoTitle } = videoInfo;
  if (!fs.existsSync(path.resolve(videoPath))) {
    console.warn('⚠️  동영상 파일 없음:', videoPath);
    return;
  }

  // 툴바 동영상 버튼
  const vidBtn = await page.$('button[class*="video"], button[title*="동영상"]');
  if (!vidBtn) { console.warn('⚠️  동영상 버튼 못 찾음'); return; }
  await vidBtn.click();
  await page.waitForTimeout(1000);

  // 팝업 내 "동영상 추가" 버튼 → 파일 선택
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 8000 }),
    page.click('button[class*="add"], button:has-text("동영상 추가"), input[type="file"]').catch(() => {}),
  ]);
  if (!fileChooser) { console.warn('⚠️  동영상 파일 선택창 실패'); return; }
  await fileChooser.setFiles(path.resolve(videoPath));
  await page.waitForTimeout(2000);

  // 제목 입력 (40자 제한)
  const titleInput = await page.$('input[placeholder*="제목"], input[maxlength="40"]');
  if (titleInput) {
    await titleInput.click();
    const safeTitle = (videoTitle || title || '동영상').slice(0, 40);
    await titleInput.fill(safeTitle);
  }

  // 업로드 확인/완료 버튼
  await page.click('button[class*="confirm"], button:has-text("확인"), button:has-text("추가")').catch(() => {});
  console.log('⏳ 동영상 업로드 중 (최대 3분)...');
  await page.waitForTimeout(10000); // 최소 대기

  // 팝업 닫기 (dim 잔류 방지 — 필수)
  const closeBtn = await page.$('button[class*="close"], button[aria-label*="닫기"]');
  if (closeBtn) {
    await closeBtn.click();
  } else {
    // 강제 제거 폴백
    await page.evaluate(() => {
      document.querySelectorAll('[class*="popup"], [class*="modal"], [class*="dim"]')
        .forEach(el => { if (el.style) el.style.display = 'none'; });
    });
  }
  await page.waitForTimeout(500);
  results.video.ok = true;
}

// ── 태그 입력 ──────────────────────────────────────────────────────────
async function inputTags(page, tagList) {
  if (!tagList || tagList.length === 0) return;

  // 1차: 에디터 하단 태그 입력란 직접 탐색 (패널 열기 불필요)
  let tagInput = await page.$('input#tag-input, input[placeholder*="태그"], input[class*="tag-input"]');

  // 2차: 발행 패널 열기로 태그 입력란 접근
  if (!tagInput) {
    // 발행 패널 열기 (force 클릭으로 visibility 무시)
    const publishBtnSels = [
      'button[data-testid="seOnePublishBtn"]',
      'button:has-text("발행")',
      'button[class*="publish"]',
    ];
    for (const sel of publishBtnSels) {
      const ok = await page.click(sel, { force: true, timeout: 5000 }).then(() => true).catch(() => false);
      if (ok) break;
    }
    await page.waitForTimeout(2000);
    tagInput = await page.$('input#tag-input, input[placeholder*="태그"], input[class*="tag"]').catch(() => null);
  }

  if (!tagInput) {
    console.warn('⚠️  태그 입력란 못 찾음 — 태그 수동 입력 필요');
    await page.keyboard.press('Escape').catch(() => {});
    return;
  }

  let inserted = 0;
  for (const rawTag of tagList.slice(0, 30)) {
    const tag = rawTag.replace(/^#/, '').trim();
    if (!tag) continue;
    await tagInput.click({ force: true }).catch(() => {});
    await page.keyboard.insertText(tag);
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    inserted++;
  }

  await page.waitForTimeout(500);
  const tagAreaText = await page.$eval('[class*="tag"]', el => el.textContent).catch(() => '');
  const chipCount = tagAreaText.split('#').length - 1;
  results.tags = { ok: chipCount > 0, count: chipCount || inserted };

  // AUTO_PUBLISH: 패널 열린 채로 유지 (발행 버튼 클릭 예정)
  // 임시저장: 패널 닫기
  if (!AUTO_PUBLISH) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.querySelectorAll('[class*="dim"][style*="block"], [class*="overlay"][style*="block"]')
        .forEach(el => { if (el.style) el.style.display = 'none'; });
    }).catch(() => {});
  }
}

// ── 지도(플레이스) 첨부 ─────────────────────────────────────────────────
async function inputPlace(page, placeInfo) {
  const { query, name } = placeInfo;

  // 지도 버튼
  const mapBtn = await page.$('button[class*="map"], button[class*="location"], button[title*="장소"]');
  if (!mapBtn) { console.warn('⚠️  지도 버튼 못 찾음'); return; }
  await mapBtn.click();
  await page.waitForTimeout(1000);

  // 검색창
  const searchInput = await page.$('input[placeholder*="장소"], input[type="search"]');
  if (!searchInput) { console.warn('⚠️  장소 검색창 못 찾음'); return; }
  await searchInput.fill(query);
  await searchInput.press('Enter');
  await page.waitForTimeout(2000);

  // 결과 선택: name과 정확 일치 → 부분 포함 → 첫 번째
  const resultItems = await page.$$('[class*="result-item"], [class*="place-item"], li[class*="item"]');
  let selected = false;
  for (const item of resultItems) {
    const txt = (await item.textContent()).replace(/\s/g, '');
    const nameClean = name.replace(/\s/g, '');
    if (txt === nameClean || txt.includes(nameClean)) {
      // hover 후 "추가" 버튼 클릭 (hover 전엔 not visible)
      await item.hover();
      await page.waitForTimeout(300);
      const addBtn = await item.$('button:has-text("추가"), button[class*="add"]');
      if (addBtn) {
        await addBtn.click();
      } else {
        await item.evaluate(el => el.click()); // DOM 직접 클릭 폴백
      }
      selected = true;
      break;
    }
  }
  if (!selected && resultItems.length > 0) {
    // 첫 번째 결과
    await resultItems[0].hover();
    await page.waitForTimeout(300);
    const addBtn = await resultItems[0].$('button:has-text("추가"), button[class*="add"]');
    if (addBtn) await addBtn.click();
    else await resultItems[0].evaluate(el => el.click());
    selected = true;
  }
  if (!selected) {
    console.warn('⚠️  장소 검색 결과 없음:', query);
    // 팝업 닫기 (Escape 안 먹음 — 닫기 버튼 필수)
    const closeBtn = await page.$('button[class*="close"], button[aria-label*="닫기"]');
    if (closeBtn) await closeBtn.click();
    return;
  }

  await page.waitForTimeout(500);
  // 확인/완료 버튼 (추가 후 활성화)
  await page.click('button:has-text("확인"), button[class*="confirm"]').catch(() => {});
  await page.waitForTimeout(500);

  // 팝업 닫기 — dim 잔류 방지
  const closeBtn = await page.$('button[class*="close"], button[aria-label*="닫기"]');
  if (closeBtn) {
    await closeBtn.click();
  } else {
    await page.evaluate(() => {
      document.querySelectorAll('[class*="popup"], [class*="dim"]')
        .forEach(el => { if (el.style) el.style.display = 'none'; });
    });
  }
  await page.waitForTimeout(300);
  results.place.ok = true;
}

// ── 메인 ───────────────────────────────────────────────────────────────
(async () => {
  if (DRY_RUN) console.log('🔍 DRY-RUN 모드 — 저장 클릭 생략');
  console.log('📄 초안:', draftPath);
  console.log('📝 제목:', title);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    locale: 'ko-KR',
  });

  const page = context.pages()[0] || await context.newPage();

  // 에디터 진입 (새 글 작성 URL)
  await page.goto(`https://blog.naver.com/PostWriteForm.naver?blogId=${BLOG_ID}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // 로그인 체크 — 필요하면 로그인 페이지로 이동 후 자동 감지
  const currentUrl = page.url();
  const needLogin = currentUrl.includes('nidlogin') || currentUrl.includes('nid.naver.com') || currentUrl.includes('/login');
  if (needLogin) {
    console.log('🔑 로그인 필요 — 브라우저에서 네이버 로그인을 완료해 주세요...');
    await page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'networkidle' });
    let loggedIn = false;
    for (let i = 0; i < 36; i++) {
      await page.waitForTimeout(5000);
      const url = page.url();
      if (!url.includes('nid.naver.com') && !url.includes('nidlogin')) {
        loggedIn = true;
        break;
      }
      process.stdout.write(`\r   ⏳ 대기 중... (${(i + 1) * 5}초)`);
    }
    console.log('');
    if (!loggedIn) {
      console.error('❌ 3분 내에 로그인이 감지되지 않았습니다.');
      await context.close();
      process.exit(1);
    }
    console.log('✅ 로그인 감지 — 에디터로 이동 중...');
    await page.goto(`https://blog.naver.com/PostWriteForm.naver?blogId=${BLOG_ID}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
  }

  if (AUTO_PUBLISH) {
    console.log('🚀 자동 발행 모드');
  }

  // "작성 중인 글" 팝업 → 새로 쓰기 선택
  await page.waitForTimeout(2000);
  const popupCancel = await page.$('button.se-popup-button-cancel, button:has-text("새로 쓰기")');
  if (popupCancel) {
    await popupCancel.click();
    await page.waitForTimeout(1000);
    console.log('📋 기존 임시저장 팝업 → 새로 쓰기 선택');
  }

  await page.waitForTimeout(1500);

  // 에디터 완전 로딩 대기 (SmartEditor ONE 초기화까지 최대 30초)
  await page.waitForSelector('.se-section-text p.se-text-paragraph', { timeout: 30000 })
    .catch(async () => {
      console.error('❌ 에디터 로딩 실패. 브라우저 창을 확인하고 npm run probe 로 DOM을 점검하세요.');
      await context.close();
      process.exit(1);
    });

  // ── 본문 블록 입력 (제목은 맨 마지막에!) ─────────────────────────────
  let isFirstTextBlock = true;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = blocks[i + 1];

    if (block.type === 'text') {
      await clickBody(page);
      await insertText(page, block.content);
      // 연속 text 블록이면 빈 줄 추가
      if (nextBlock && nextBlock.type === 'text') {
        await page.keyboard.press('Enter');
      }
      await page.keyboard.press('Enter');

      // 동영상: 첫 번째 text 블록 직후 삽입 (D.I.A. 가산)
      if (isFirstTextBlock && video) {
        console.log('🎬 동영상 업로드 중...');
        await inputVideo(page, video);
        isFirstTextBlock = false;
      } else {
        isFirstTextBlock = false;
      }
    } else if (block.type === 'subtitle') {
      await clickBody(page);
      await inputSubtitle(page, block.content);
    } else if (block.type === 'image') {
      await inputImage(page, block);
    } else if (block.type === 'quote') {
      await page.click('button.se-insert-quotation-default-toolbar-button');
      await page.waitForTimeout(300);
      await insertText(page, block.content);
      await page.keyboard.press('Enter');
    } else if (block.type === 'divider') {
      await page.click('button.se-insert-horizontal-line-default-toolbar-button');
      await page.waitForTimeout(300);
    }

    console.log(`  [${i+1}/${blocks.length}] ${block.type} ✓`);
  }

  // ── 제목 입력 (본문 다 끝난 후 — 레이스 컨디션 방지) ─────────────────
  await page.waitForTimeout(500);
  await page.click('.se-title-text');
  await page.waitForTimeout(300);
  await page.keyboard.insertText(title);
  await page.waitForTimeout(300);

  // 제목 검증
  const titleActual = await page.$eval('.se-title-text', el => el.textContent.trim()).catch(() => '');
  if (!titleActual.includes(title.slice(0, 10))) {
    console.warn('⚠️  제목 불일치 — 재입력 시도');
    await page.click('.se-title-text');
    await page.keyboard.selectAll();
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(title);
  }
  console.log('✅ 제목 입력 완료');

  // ── 태그 입력 ──────────────────────────────────────────────────────
  if (tags.length > 0) {
    console.log('🏷️  태그 입력 중...');
    await inputTags(page, tags);
  }

  // ── 지도 첨부 ──────────────────────────────────────────────────────
  if (place) {
    console.log('📍 지도 첨부 중...');
    await inputPlace(page, place);
  }

  // ── 임시저장 / 발행 ─────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log('🔍 DRY-RUN: 저장 생략');
  } else if (AUTO_PUBLISH) {
    // 발행 패널이 열려 있는 상태 — 최종 발행 버튼 클릭
    const publishDoneSels = [
      'button[data-testid="seOnePublishDoneBtn"]',
      'button[class*="publishDone"]',
      'button[class*="publish-done"]',
      'button[class*="publish-submit"]',
      'button:has-text("발행하기")',
    ];
    let published = false;
    for (const sel of publishDoneSels) {
      const btn = await page.$(sel).catch(() => null);
      if (btn) {
        await btn.click();
        published = true;
        break;
      }
    }
    await page.waitForTimeout(3000);
    console.log(published ? '🚀 발행 완료' : '⚠️  발행 버튼 못 찾음 — 수동 발행 필요');
  } else {
    const saveBtn = await page.$('button[data-testid="seOneTempBtn"], button:has-text("임시저장"), button[class*="temp"]');
    if (saveBtn) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      console.log('💾 임시저장 완료');
    } else {
      console.warn('⚠️  임시저장 버튼 못 찾음 — 수동 저장 필요');
    }
  }

  // ── 이중 검증: 스크린샷 + 텍스트 덤프 ───────────────────────────────
  const screenshotPath = draftPath.replace('.json', '_screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const dumpPath = draftPath.replace('.json', '_dump.txt');
  const bodyText = await page.evaluate(() => {
    const els = document.querySelectorAll('.se-section-text p.se-text-paragraph');
    return Array.from(els).map(el => el.textContent).join('\n');
  }).catch(() => '');
  fs.writeFileSync(dumpPath, `제목: ${titleActual}\n\n본문:\n${bodyText}`);
  console.log('📸 스크린샷:', screenshotPath);
  console.log('📄 텍스트 덤프:', dumpPath);

  // ── 자동 처리 결과 블록 ────────────────────────────────────────────
  console.log('\n══════════════ 자동 처리 결과 ══════════════');
  console.log(`태그   : ${results.tags.ok ? '✅' : '❗수동 필요'} (${results.tags.count}개)`);
  console.log(`지도   : ${results.place.ok ? '✅' : place ? '❗수동 필요' : '⏭️  없음'}`);
  console.log(`동영상 : ${results.video.ok ? '✅' : video ? '❗수동 필요' : '⏭️  없음'}`);
  console.log(`소제목 : ${results.subtitles.ok}/${results.subtitles.total} ✅`);
  console.log('════════════════════════════════════════════\n');
  if (!AUTO_PUBLISH) {
    console.log('📋 수동 확인 필요:');
    console.log('   - 발행은 사람이 직접 (또는 --publish 플래그 사용)');
    console.log('   - 발행 후 24시간 수정 금지');
  }
  if (draft.sponsored) console.log('   - ⚠️  협찬 표기 육안 확인 필수');

  await context.close();
})().catch(async (err) => {
  console.error('❌ 오류:', err.message);
  console.error('💡 셀렉터 실패 시 npm run probe 로 실제 DOM 확인하세요.');
  process.exit(1);
});
