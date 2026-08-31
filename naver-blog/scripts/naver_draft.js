/**
 * 네이버 블로그 자동 임시저장 스크립트
 * - 절대 발행하지 않음 (installPublishGuard로 코드로도 보장)
 * - 입력 순서: 본문 전체 → 제목 (마지막)
 * - 한글: keyboard.insertText() 사용 (keyboard.type() IME 버그 방지)
 *
 * Usage:
 *   node scripts/naver_draft.js --draft drafts/post.json
 *   node scripts/naver_draft.js --draft drafts/post.json --dry-run
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROFILE_DIR = path.join(__dirname, '..', 'naver-profile');
const BLOG_ID = process.env.BLOG_ID || 'soungkyekim';
const DRY_RUN = process.argv.includes('--dry-run');

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

// ── 발행 차단 가드 (절대 규칙 2 — 코드로 보장) ──────────────────────────
async function installPublishGuard(page) {
  await page.evaluate(() => {
    const block = (e) => {
      const btn = e.target.closest('button[data-testid="seOnePublishBtn"], [class*="publish"]');
      if (btn) {
        e.stopImmediatePropagation();
        e.preventDefault();
        console.warn('[PublishGuard] 발행 차단!');
        alert('[자동화 안전장치] 발행은 사람이 직접 해주세요.');
      }
    };
    document.addEventListener('click', block, true);
    window.__publishGuardInstalled = true;
  });
}

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
async function clickBody(page) {
  await page.click('.se-section-text p.se-text-paragraph', { timeout: 15000 });
}

// ── 소제목 블록 입력 ────────────────────────────────────────────────────
async function inputSubtitle(page, content) {
  // 1. 포맷 드롭다운 열기
  await page.click('button.se-text-format-toolbar-button');
  await page.waitForSelector('.se-popup-list', { state: 'visible', timeout: 3000 });

  // 2. "소제목" 옵션 클릭 (텍스트 기준)
  const items = await page.$$('.se-popup-list li');
  let clicked = false;
  for (const item of items) {
    const txt = await item.textContent();
    if (txt && txt.includes('소제목')) {
      await item.click();
      clicked = true;
      break;
    }
  }
  if (!clicked) await page.press('Escape');

  await page.waitForTimeout(300);

  // 3. 텍스트 입력
  await insertText(page, content);
  await page.keyboard.press('Enter');

  // 4. 다음 블록은 본문으로 복귀
  await page.click('button.se-text-format-toolbar-button');
  await page.waitForSelector('.se-popup-list', { state: 'visible', timeout: 3000 }).catch(() => {});
  const items2 = await page.$$('.se-popup-list li');
  for (const item of items2) {
    const txt = await item.textContent();
    if (txt && (txt.includes('본문') || txt.includes('기본'))) {
      await item.click();
      break;
    }
  }
  await page.waitForTimeout(200);
  results.subtitles.ok++;
}

// ── 이미지 블록 입력 ────────────────────────────────────────────────────
async function inputImage(page, block) {
  // 툴바 사진 버튼
  const imgBtn = await page.$('button[class*="se-photo"], button[class*="se-image"], button[title*="사진"]');
  if (!imgBtn) { console.warn('⚠️  사진 버튼 못 찾음 — probe_selectors로 확인하세요'); return; }
  await imgBtn.click();
  await page.waitForTimeout(500);

  // 팝업 내 "내 PC" or "파일 선택" 버튼
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
    page.click('button[class*="pc"], button[class*="upload"], input[type="file"]').catch(() => {}),
  ]);
  if (!fileChooser) { console.warn('⚠️  파일 선택창 열기 실패'); return; }
  await fileChooser.setFiles(path.resolve(block.path));
  await page.waitForTimeout(3000); // 업로드 대기

  // 캡션 입력 (전체 사진의 절반 정도만 — JSON에 caption 있는 경우만)
  if (block.caption) {
    const captionEl = await page.$('.se-image-caption, [class*="caption"]');
    if (captionEl) {
      await captionEl.click();
      await insertText(page, block.caption);
    }
  }
  await page.waitForTimeout(500);
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

  // 발행 패널 열기 (태그 입력란이 여기 있음)
  const publishBtn = await page.$('button[data-testid="seOnePublishBtn"], button:has-text("발행"), button[class*="publish"]');
  if (!publishBtn) { console.warn('⚠️  발행 버튼 못 찾음 (태그 입력 실패)'); return; }
  await publishBtn.click();
  await page.waitForTimeout(1500);

  // 태그 입력란
  const tagInput = await page.$('input#tag-input, input[placeholder*="태그"], input[class*="tag"]');
  if (!tagInput) { console.warn('⚠️  태그 입력란 못 찾음'); await page.press('Escape'); return; }

  let inserted = 0;
  for (const rawTag of tagList.slice(0, 30)) {
    const tag = rawTag.replace(/^#/, '').trim();
    if (!tag) continue;
    await tagInput.click();
    await page.keyboard.insertText(tag);
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    inserted++;
  }

  // 검증: 칩 개수 세기 (#으로 나누는 방식)
  await page.waitForTimeout(500);
  const tagAreaText = await page.$eval('[class*="tag"]', el => el.textContent).catch(() => '');
  const chipCount = tagAreaText.split('#').length - 1;
  results.tags = { ok: chipCount > 0, count: chipCount || inserted };

  // Escape로 패널만 닫기 (발행 버튼 절대 클릭 금지)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  // dim 잔류 확인 및 제거
  await page.evaluate(() => {
    const dim = document.querySelector('[class*="dim"][style*="block"], [class*="overlay"][style*="block"]');
    if (dim) dim.style.display = 'none';
  });
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

  // 로그인 체크
  if (page.url().includes('nidlogin')) {
    console.error('❌ 로그인 안 됨. npm run login 먼저 실행하세요.');
    await context.close();
    process.exit(1);
  }

  // 발행 차단 가드 설치 (절대 규칙 2)
  await installPublishGuard(page);
  console.log('🔒 발행 차단 가드 설치 완료');

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

  // ── 임시저장 ───────────────────────────────────────────────────────
  if (!DRY_RUN) {
    const saveBtn = await page.$('button[data-testid="seOneTempBtn"], button:has-text("임시저장"), button[class*="temp"]');
    if (saveBtn) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      console.log('💾 임시저장 완료');
    } else {
      console.warn('⚠️  임시저장 버튼 못 찾음 — 수동 저장 필요');
    }
  } else {
    console.log('🔍 DRY-RUN: 저장 생략');
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
  console.log('📋 수동 확인 필요:');
  console.log('   - 발행은 사람이 직접 (자동 발행 금지)');
  console.log('   - 발행 후 24시간 수정 금지');
  console.log('   - 타겟 활동 시간대에 발행');
  if (draft.sponsored) console.log('   - ⚠️  협찬 표기 육안 확인 필수');

  await context.close();
})().catch(async (err) => {
  console.error('❌ 오류:', err.message);
  console.error('💡 셀렉터 실패 시 npm run probe 로 실제 DOM 확인하세요.');
  process.exit(1);
});
