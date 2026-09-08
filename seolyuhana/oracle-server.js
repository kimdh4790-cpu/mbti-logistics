/**
 * seolyuhana/oracle-server.js
 * Oracle Cloud 변환 서버 — Express.js (Playwright 기반)
 *
 * 실행: pm2 start oracle-server.js --name oracle-server
 * 의존성: express, multer, playwright (npx playwright install chromium), jszip, @xmldom/xmldom
 *
 * 엔드포인트:
 *   POST /api/hwp-convert   HWP → DOCX → 텍스트 추출
 *   POST /api/pdf-render    HTML → PDF (Playwright)
 *   POST /api/iros-fetch    인터넷등기소 자동 로그인·발급·PDF 반환
 *   GET  /health
 */

import express from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdtemp, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { chromium } from 'playwright';
import JSZip from 'jszip';

const execFileAsync = promisify(execFile);
const app = express();
const upload = multer({ limits: { fileSize: 32 * 1024 * 1024 } });

app.use(express.json({ limit: '10mb' }));

// ── /health ─────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── /api/hwp-convert  HWP → DOCX → 텍스트 ──────────────────────────────────
app.post('/api/hwp-convert', upload.single('file'), async (req, res) => {
  let tmpDir = null;
  try {
    if (!req.file) return res.status(400).json({ error: '파일 없음' });

    tmpDir = await mkdtemp(join(tmpdir(), 'hwp-'));
    const hwpPath  = join(tmpDir, req.file.originalname || 'input.hwp');
    const docxName = (req.file.originalname || 'input.hwp').replace(/\.hwp$/i, '') + '.docx';
    const docxPath = join(tmpDir, docxName);

    await writeFile(hwpPath, req.file.buffer);

    await execFileAsync('libreoffice', [
      '--headless', '--convert-to', 'docx',
      '--outdir', tmpDir, hwpPath
    ], { timeout: 60000 });

    const docxBuffer = await readFile(docxPath);
    const { text, pageCount } = await extractDocxText(docxBuffer);

    res.json({ text, pageCount, docxBase64: docxBuffer.toString('base64') });
  } catch (e) {
    console.error('[hwp-convert]', e.message);
    res.status(500).json({ error: e.message });
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

// ── /api/pdf-render  HTML → PDF ─────────────────────────────────────────────
app.post('/api/pdf-render', async (req, res) => {
  const { html, filename } = req.body || {};
  if (!html) return res.status(400).json({ error: 'html 필수' });

  let browser = null;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename || 'output.pdf')}"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (e) {
    console.error('[pdf-render]', e.message);
    res.status(500).json({ error: e.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// ── /api/iros-debug  IROS 페이지 실시간 진단 ────────────────────────────────────
app.post('/api/iros-debug', async (req, res) => {
  const { url = 'https://www.iros.go.kr/pos9/jsf/renf/selectRenf0100List.xhtml?type=B' } = req.body || {};
  let browser = null;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true
    });
    const page = await (await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ko-KR'
    })).newPage();
    page.setDefaultTimeout(30000);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);
    const info = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      inputs: [...document.querySelectorAll('input')].map(el => ({
        id: el.id, name: el.name, type: el.type,
        placeholder: el.placeholder, value: el.value.slice(0, 50)
      })),
      buttons: [...document.querySelectorAll('button, input[type=button], input[type=submit], a[onclick]')].slice(0, 20).map(el => ({
        tag: el.tagName, id: el.id, text: (el.textContent || el.value || '').trim().slice(0, 50),
        onclick: (el.getAttribute('onclick') || '').slice(0, 100)
      })),
      tables: document.querySelectorAll('table').length,
      forms: [...document.querySelectorAll('form')].map(f => ({ id: f.id, action: f.action })),
      bodyText: document.body.innerText.slice(0, 1000)
    }));
    res.json({ ok: true, info });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// ── /api/iros-pin  인터넷등기소 주소 → 고유번호 검색 (비회원, 결제 없음) ──────────
app.post('/api/iros-pin', async (req, res) => {
  const { address, regType = 'building' } = req.body || {};
  if (!address) return res.status(400).json({ error: '주소 필수' });
  let browser = null;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
             '--disable-blink-features=AutomationControlled'],
      headless: true
    });
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ko-KR'
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);

    const typeParam = regType === 'land' ? 'L' : 'B';

    // ── Step 1: Gauce SPA 메인 페이지 로드 ────────────────────────────────────────
    // IROS는 frame 기반 레이아웃: index.jsp(SPA shell) + content frame(JSF 페이지)
    // selectRenf0100List.xhtml에 직접 goto하면 서버에서 차단 → SPA 통해 nav 클릭 필요
    console.log('[iros-pin] Step1: index.jsp 로드');
    await page.goto('https://www.iros.go.kr/index.jsp', { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);

    // 로드 후 frame 상태 + 현재 입력 필드 목록 진단
    const framesBefore = page.frames().map(f => ({ url: f.url(), name: f.name() }));
    const inputsBefore = await page.evaluate(() =>
      [...document.querySelectorAll('input')].map(e => ({ id: e.id, type: e.type, ph: e.placeholder, vis: e.offsetParent !== null }))
    );
    console.log('[iros-pin] 로드 후 frame:', JSON.stringify(framesBefore));
    console.log('[iros-pin] 로드 후 inputs:', JSON.stringify(inputsBefore.slice(0, 10)));

    // ── Step 2: "간편 열람·발급" nav 클릭 (Gauce element ID) ──────────────────────
    const navId = 'mf_wfm_potal_main_wf_header_gen_depth1_0_gen_depth2_0_gen_depth3_1_grp_box3';
    const navEl = page.locator(`#${navId}`);
    if (await navEl.count() > 0) {
      console.log('[iros-pin] nav element 발견, force-click');
      await navEl.click({ force: true }).catch(e => console.log('[iros-pin] nav click err:', e.message));
    } else {
      const fbEl = page.locator('a, span, div').filter({ hasText: /간편\s*열람/ }).first();
      if (await fbEl.count() > 0) {
        console.log('[iros-pin] 텍스트 폴백 force-click');
        await fbEl.click({ force: true }).catch(() => {});
      } else {
        console.log('[iros-pin] nav element 없음');
      }
    }
    await page.waitForTimeout(5000);

    // 클릭 후 frame + input 상태
    const framesAfter = page.frames().map(f => ({ url: f.url(), name: f.name() }));
    const inputsAfter = await page.evaluate(() =>
      [...document.querySelectorAll('input')].map(e => ({ id: e.id, type: e.type, ph: e.placeholder, vis: e.offsetParent !== null }))
    );
    const iframeList = await page.evaluate(() =>
      [...document.querySelectorAll('iframe, frame')].map(f => ({ id: f.id, name: f.name, src: f.src || f.getAttribute('src') }))
    );
    console.log('[iros-pin] 클릭 후 frame:', JSON.stringify(framesAfter));
    console.log('[iros-pin] 클릭 후 inputs:', JSON.stringify(inputsAfter.slice(0, 15)));
    console.log('[iros-pin] iframe DOM:', JSON.stringify(iframeList));

    // 클릭 전에 없던 NEW 입력 필드 찾기 (vis:false→vis:true 포함)
    // beforeIds는 클릭 전 가시적(vis:true) ID만 포함 → hidden→visible 전환도 NEW로 감지
    const beforeVisIds = new Set(inputsBefore.filter(i => i.vis).map(i => i.id));
    const newInputIds = inputsAfter.filter(i => i.vis && !beforeVisIds.has(i.id)).map(i => i.id);
    console.log('[iros-pin] 새로 생긴 input IDs:', JSON.stringify(newInputIds));

    // ── Step 3: 주소 입력 필드 탐색 ─────────────────────────────────────────────
    // 1순위: 새로 생긴 addr 관련 입력 필드 (클릭 후 등장한 검색폼)
    // 2순위: 모든 frame에서 addr 속성 입력 필드
    const addrSels = [
      'input[id*="addr" i]', 'input[name*="addr" i]',
      'input[placeholder*="주소"]', 'input[placeholder*="지번"]',
      'input[placeholder*="도로명"]', 'input[placeholder*="번지"]',
    ];
    let addrInput = null;
    let targetCtx = page;

    // 새로 생긴 visible input 중 addr 관련 선택
    for (const nid of newInputIds) {
      if (!nid) continue;
      const loc = page.locator(`#${CSS.escape ? CSS.escape(nid) : nid}`).first();
      if (await loc.count() > 0 && await loc.isVisible({ timeout: 1000 }).catch(() => false)) {
        addrInput = loc;
        console.log('[iros-pin] 새 input 사용:', nid);
        break;
      }
    }

    // 모든 frame에서 addr 속성 입력 탐색
    if (!addrInput) {
      for (const frame of [page, ...page.frames()]) {
        try {
          for (const sel of addrSels) {
            const loc = frame.locator(sel).first();
            if (await loc.count() > 0) {
              const visible = await loc.isVisible({ timeout: 1000 }).catch(() => false);
              if (visible) {
                const id = await loc.getAttribute('id').catch(() => '');
                if (id && (id.includes('wf_header') || id.includes('potal_main_wf_header'))) continue;
                addrInput = loc;
                targetCtx = frame;
                console.log('[iros-pin] 주소 입력 발견! frame:', frame.url(), 'sel:', sel, 'id:', id);
                break;
              }
            }
          }
          if (addrInput) break;
        } catch {}
      }
    }

    if (!addrInput) {
      throw new Error(`주소 입력 필드 없음 | frames:${JSON.stringify(framesAfter)} | newInputs:${JSON.stringify(newInputIds)} | iframes:${JSON.stringify(iframeList)}`);
    }

    // ── Step 4: 주소 입력 ────────────────────────────────────────────────────────
    await addrInput.click({ clickCount: 3, force: true });
    await addrInput.fill(address);

    // ── Step 4.3: sch_realCorp 전체 요소 덤프 (버튼 탐색) ────────────────────
    const scrElems = await page.evaluate(() => {
      const els = [...document.querySelectorAll('[id*="sch_realCorp"]')];
      return els.map(e => ({
        tag: e.tagName,
        id: e.id,
        vis: e.offsetParent !== null,
        cls: (e.className || '').slice(0, 80),
        onclick: (e.getAttribute('onclick') || '').slice(0, 100),
        type: e.getAttribute('type') || ''
      }));
    });
    console.log('[iros-pin] sch_realCorp 요소:', JSON.stringify(scrElems));

    // ── Step 4.5: 라디오 버튼 선택 (건물/토지) ──────────────────────────────────
    const radioIdx = regType === 'land' ? 1 : 0;
    const radioElem = scrElems.find(e => e.id.includes(`rad_sch_realCorp_input_${radioIdx}`) && e.vis);
    if (radioElem) {
      await page.locator(`#${radioElem.id}`).click({ force: true }).catch(() => {});
      console.log('[iros-pin] 라디오 선택:', radioIdx === 0 ? '건물' : '토지');
    }

    // ── Step 5: 검색 트리거 ──────────────────────────────────────────────────────
    // popup 리스너 먼저 등록 + 네트워크 요청 캡처
    const popupPromise = ctx.waitForEvent('page', { timeout: 20000 }).catch(() => null);
    const searchRequests = [];
    const reqHandler = req => {
      const u = req.url();
      if (u.includes('iros') || u.includes('renf') || u.includes('Renf') || u.includes('addr') || u.includes('search')) {
        searchRequests.push({ url: u.slice(0, 200), method: req.method() });
      }
    };
    page.on('request', reqHandler);

    let searchTriggered = false;

    // 1순위: ANY element (tag 무관) with sch_realCorp___button or ___btn in ID
    const btnElem = scrElems.find(e => e.vis && (
      e.id.endsWith('___button') || e.id.endsWith('___btn') ||
      e.id.includes('___button') || e.id.includes('___btn')
    ) && !e.id.includes('input') && !e.id.includes('radio'));
    if (btnElem) {
      await page.locator(`#${btnElem.id}`).click({ force: true }).catch(e2 => console.log('[iros-pin] btn err:', e2.message));
      searchTriggered = true;
      console.log('[iros-pin] SearchBox 버튼 클릭 (덤프):', btnElem.id, btnElem.tag);
    }

    // 2순위: window.scwin WebSquare 핸들러 직접 호출
    if (!searchTriggered) {
      const jsResult = await page.evaluate(() => {
        const wid = 'mf_wfm_potal_main_sch_realCorp';
        const cands = [
          `${wid}_onSearch`, `${wid}_onClick`, `${wid}_btnSearch_onClick`,
          'fn_search', 'fn_schAddr', 'fn_schRealty', 'searchAddr', 'schAddr', 'go_search'
        ];
        if (window.scwin) {
          for (const h of cands) {
            if (typeof window.scwin[h] === 'function') {
              try { window.scwin[h](); return 'scwin:' + h; } catch(e) { continue; }
            }
          }
        }
        // Gauce/WebSquare 위젯 API 호출
        if (window.w2) {
          try {
            const wgt = window.w2.getComponentById?.(wid) || window.w2.getWidget?.(wid);
            if (wgt && typeof wgt.search === 'function') { wgt.search(); return 'w2.search'; }
          } catch {}
        }
        // 버튼처럼 보이는 sch_realCorp 요소 클릭
        const all = [...document.querySelectorAll('[id*="sch_realCorp"]')];
        for (const el of all) {
          if (!el.offsetParent) continue;
          const id = el.id;
          const cls = (el.className || '').toLowerCase();
          const tag = el.tagName.toLowerCase();
          if (id.includes('input') || id.includes('radio') || id.includes('mymenu')) continue;
          if (id.includes('button') || id.includes('btn') || cls.includes('btn') ||
              cls.includes('button') || cls.includes('search') || tag === 'a' || tag === 'button') {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return 'dispatch:' + id + ':' + tag;
          }
        }
        return null;
      });
      if (jsResult) { searchTriggered = true; console.log('[iros-pin] JS 검색:', jsResult); }
    }

    // 3순위: visible button/input/a 태그 텍스트 검색|조회
    if (!searchTriggered) {
      const searchBtns = page.locator('input[type="button"], input[type="submit"], button, a').filter({ hasText: /검색|조회/ });
      const sbCnt = await searchBtns.count();
      for (let i = 0; i < sbCnt; i++) {
        const btn = searchBtns.nth(i);
        const bid = await btn.getAttribute('id').catch(() => '');
        if (bid && (bid.includes('header') || bid.includes('depth'))) continue;
        if (await btn.isVisible().catch(() => false)) {
          await btn.click({ force: true, timeout: 5000 }).catch(() => {});
          searchTriggered = true;
          console.log('[iros-pin] 텍스트 검색 버튼 클릭:', bid);
          break;
        }
      }
    }

    // 4순위: Enter 키 (마지막 폴백)
    if (!searchTriggered) {
      await addrInput.press('Enter');
      console.log('[iros-pin] Enter 검색 (최후 폴백)');
    }

    // 검색 결과 대기 — popup or networkidle (최대 12초)
    const popup = await Promise.race([
      popupPromise,
      page.waitForLoadState('networkidle', { timeout: 12000 }).then(() => null).catch(() => null),
    ]);
    page.off('request', reqHandler);
    console.log('[iros-pin] 검색 중 요청:', JSON.stringify(searchRequests.slice(0, 15)));

    // ozReportFrame__ 폴링 (최대 15초 × 500ms)
    let ozFrame = null;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(500);
      for (const f of page.frames()) {
        const fu = f.url();
        if ((f.name() === 'ozReportFrame__' || fu.includes('ozReport') || fu.includes('renf')) &&
            fu && fu !== 'about:blank') {
          ozFrame = f;
          console.log('[iros-pin] ozReportFrame__ 로드:', fu.slice(0, 200));
          break;
        }
      }
      if (ozFrame || popup) break;
    }
    if (!ozFrame && !popup) await page.waitForTimeout(2000);

    // 검색 후 frame + body 진단
    const framesPost = page.frames().map(f => ({ url: f.url().slice(0, 120), name: f.name() }));
    console.log('[iros-pin] 검색 후 frame:', JSON.stringify(framesPost));
    const bodyPost = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    console.log('[iros-pin] 검색 후 body(2000):', bodyPost);
    if (popup) {
      console.log('[iros-pin] popup URL:', popup.url());
      const popBody = await popup.evaluate(() => document.body.innerText.slice(0, 500)).catch(() => '');
      console.log('[iros-pin] popup body:', popBody);
    }

    // ── Step 6: 결과에서 고유번호(PIN) 파싱 ──────────────────────────────────────
    // 결과는 popup 페이지 or 메인 page DOM or iframe 중 하나에 존재
    const pinPattern = /(\d{4}-\d{4}-\d{6}|\d{13,14})/;

    const extractPin = async (ctx2) => {
      return ctx2.evaluate(() => {
        const pat = /(\d{4}-\d{4}-\d{6}|\d{13,14})/;
        const els = [...document.querySelectorAll('td, span, div, p, li, a')];
        for (const el of els) {
          const t = (el.textContent || '').trim();
          const m = t.match(pat);
          if (m && m[1].length >= 13) return { pin: m[1].replace(/-/g, ''), raw: m[0], context: t.slice(0, 100) };
        }
        const attrs = [...document.querySelectorAll('[onclick], [data-pin], [data-id], [data-uniq]')];
        for (const el of attrs) {
          const oc = [el.getAttribute('onclick'), el.getAttribute('data-pin'), el.getAttribute('data-id'), el.getAttribute('data-uniq')].filter(Boolean).join('|');
          const m = oc.match(/['"]?(\d{4}-?\d{4}-?\d{6}|\d{13,14})['"]?/);
          if (m) return { pin: m[1].replace(/-/g, ''), raw: oc.slice(0, 80), context: 'attr' };
        }
        return null;
      });
    };

    // popup 먼저 확인
    let resultText = popup ? await extractPin(popup).catch(() => null) : null;

    // popup에 없으면 main page 전체 frame 탐색
    if (!resultText || !resultText.pin) {
      for (const frame of [page, ...page.frames()]) {
        try {
          const r = await extractPin(frame);
          if (r && r.pin && r.pin.length >= 13) { resultText = r; break; }
        } catch {}
      }
    }

    if (!resultText || !resultText.pin) {
      const dbg = await page.evaluate(() => ({
        url: location.href, title: document.title,
        body: document.body.innerText.slice(0, 1000)
      }));
      if (popup) {
        const pdbg = await popup.evaluate(() => ({ url: location.href, body: document.body.innerText.slice(0, 500) })).catch(() => ({}));
        throw new Error(`고유번호 파싱 실패. 주소: ${address} | main:${JSON.stringify(dbg)} | popup:${JSON.stringify(pdbg)}`);
      }
      throw new Error(`고유번호 파싱 실패. 주소: ${address} | ${JSON.stringify(dbg)}`);
    }

    res.json({ ok: true, pin: resultText.pin, raw: resultText.raw, context: resultText.context });
  } catch(e) {
    console.error('[iros-pin]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// ── /api/iros-fetch  인터넷등기소 자동 로그인·발급·PDF 반환 ────────────────────
app.post('/api/iros-fetch', async (req, res) => {
  const { address, regType = 'building', irosId, irosPw, emoneyNo1, emoneyNo2, emoneyPwd } = req.body || {};
  if (!address) return res.status(400).json({ error: '주소 필수' });
  if (!irosId || !irosPw) return res.status(400).json({ error: 'IROS 계정 정보 필수' });

  let browser = null;
  let tmpDir  = null;

  // IROS 로그인 헬퍼 — 현재 페이지에 로그인 폼이 있으면 채워서 제출
  async function _irosLogin(page) {
    try {
      // 페이지 안에 실제 로그인 폼이 있는지 확인 (로그인 페이지 URL 또는 #userId 존재)
      const curUrl = page.url();
      const hasLoginForm = curUrl.includes('login') || curUrl.includes('Login') ||
        await page.locator('#userId, input[name="userId"], input[id*="userId"]').count() > 0;
      if (!hasLoginForm) return false;

      // 팝업·레이어 로그인 폼 포함, 넓은 셀렉터로 시도
      const userSel = '#userId, input[name="userId"], input[id*="userId"], input[name="id"], input[autocomplete="username"]';
      const pwSel   = '#userPwd, input[name="userPwd"], input[id*="Pwd"], input[type="password"], input[name="pw"], input[autocomplete="current-password"]';
      await page.waitForSelector(userSel, { timeout: 8000 });
      await page.locator(userSel).first().fill(irosId);
      await page.locator(pwSel).first().fill(irosPw);

      const btnSel = '#loginBtn, button[id*="login"], button[onclick*="login"], input[type="submit"][value*="로그인"], button[type="submit"]';
      const btn = page.locator(btnSel).first();
      if (await btn.count() > 0) await btn.click();
      else await page.keyboard.press('Enter');

      await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
      console.log('[iros] 로그인 후 URL:', page.url());
      return true;
    } catch (le) {
      console.log('[iros] 로그인 폼 없음 또는 이미 로그인:', le.message);
      return false;
    }
  }

  // IROS Gauce 주소 입력 필드 탐색
  // 홈: mf_wfm_potal_main_sch_realCorp___input
  // 간편열람 콘텐츠: mf_wfm_potal_main_wfm_content_sch_realCorp___input 등 패턴
  async function _findAddrInput(page) {
    const candidates = [
      // IROS Gauce 고유 셀렉터 (최우선) — content 영역 포함
      'input[id*="sch_realCorp___input"]',
      'input[id*="content_sch"]',
      'input[id*="wfm_content"][id*="input"]',
      'input[id*="renf"][id*="input"]',
      'input[placeholder*="열람·발급하려면"]',
      'input[placeholder*="주소를 입력하세요"]',
      'input[placeholder*="부동산"]',
      // 일반 addr 셀렉터
      'input[id*="addr" i]', 'input[id*="Addr"]',
      'input[name*="addr" i]',
      '#searchAddr', 'input[placeholder*="주소"]',
      'input[placeholder*="지번"]', 'input[placeholder*="도로명"]',
    ];
    // 전체 입력 현황 로그
    for (const ctx of [page, ...page.frames()]) {
      try {
        const fUrl = ctx.url ? ctx.url() : '';
        if (fUrl === 'about:blank') continue;
        const inputs = await ctx.evaluate(() =>
          Array.from(document.querySelectorAll('input')).slice(0, 20).map(el => ({
            id: el.id, type: el.type, placeholder: el.placeholder, visible: el.offsetParent !== null
          }))
        ).catch(() => []);
        if (inputs.length > 0) {
          console.log(`[iros] inputs[${(fUrl||'main').slice(-60)}]:`, JSON.stringify(inputs));
        }
      } catch {}
    }
    for (const ctx of [page, ...page.frames()]) {
      try {
        for (const sel of candidates) {
          const loc = ctx.locator(sel).first();
          if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) return loc;
        }
      } catch {}
    }
    // 마지막 폴백: 헤더 제외 첫 번째 visible text input
    for (const ctx of [page, ...page.frames()]) {
      try {
        const allInputs = ctx.locator('input[type="text"], input:not([type])');
        const cnt = await allInputs.count();
        for (let i = 0; i < Math.min(cnt, 30); i++) {
          const inp = allInputs.nth(i);
          const id = await inp.getAttribute('id').catch(() => '');
          if (id && (id.includes('wf_header') || id.includes('login'))) continue;
          if (await inp.isVisible().catch(() => false)) return inp;
        }
      } catch {}
    }
    return null;
  }

  try {
    tmpDir  = await mkdtemp(join(tmpdir(), 'iros-'));
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
             '--disable-blink-features=AutomationControlled'],
      headless: true
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      acceptDownloads: true,
      locale: 'ko-KR'
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // 네트워크 요청 인터셉트 — IROS 검색 API 요청 로깅 (주소가 실제로 전달되는지 확인)
    page.on('request', req => {
      const url = req.url();
      if (url.includes('iros.go.kr') && (req.method() === 'POST' || url.includes('srch') || url.includes('search') || url.includes('Renf'))) {
        const body = req.postData() || '';
        console.log('[iros-net]', req.method(), url.slice(-80), '|', body.slice(0, 200));
      }
    });

    // 1단계: index.jsp SPA shell 진입 (networkidle 대신 load 사용 — 속도 우선)
    console.log('[iros] index.jsp 로드');
    await page.goto('https://www.iros.go.kr/index.jsp', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    console.log('[iros] 진입 URL:', page.url());

    // 2단계: 로그인 처리 (리다이렉트 또는 현재 페이지 폼)
    const isLoginPage = page.url().includes('login') || page.url().includes('Login') ||
      await page.locator('#userId, input[name="userId"]').count() > 0;
    if (isLoginPage) {
      console.log('[iros] 로그인 필요');
      await _irosLogin(page);
      await page.waitForTimeout(2000);
      if (page.url().includes('login') || page.url().includes('Login')) {
        throw new Error(`로그인 실패: ${page.url()}`);
      }
    }

    // 3단계: 팝업/공지 닫기 (홈 진입 시 뜨는 오버레이)
    for (const closeText of ['오늘 다시 보지 않기', '닫기', '×']) {
      const closeBtn = page.locator('a, button, span').filter({ hasText: new RegExp(`^${closeText}$`) }).first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
      }
    }

    // 3-1단계: 간편 열람·발급으로 SPA 내 이동
    // !! 중요: page.goto(selectRenf0100List.xhtml) 금지 !!
    //    JSF 직접 접근 시 WebSquare 컴포넌트 미초기화 → inputs=0
    //    반드시 index.jsp SPA 컨텍스트 내에서 nav 클릭으로 이동해야 함
    console.log('[iros] Gauce 초기화 대기 (processMsg 소멸)');
    await page.screenshot({ path: '/home/opc/iros-debug/step1-home.png', fullPage: false }).catch(() => {});

    // 홈 로드 후 프레임 목록
    const homeFrames = page.frames().map(f => f.url());
    console.log('[iros] 홈 초기 frames:', JSON.stringify(homeFrames));

    // Gauce 초기화 완료 대기 — processMsg가 사라질 때까지 최대 30초
    for (let w = 0; w < 20; w++) {
      await page.waitForTimeout(1500);
      const fUrls = page.frames().map(f => f.url());
      const hasProc = fUrls.some(u => u.includes('processMsg'));
      const realCount = fUrls.filter(u => u && u !== 'about:blank' && !u.includes('processMsg')).length;
      console.log(`[iros] Gauce 대기 tick=${w+1} frames=${fUrls.length} processMsg=${hasProc} realFrames=${realCount}`);
      if (w % 3 === 0) console.log('[iros] frame URLs:', JSON.stringify(fUrls));
      if (!hasProc) { console.log('[iros] Gauce 초기화 완료'); break; }
    }

    // 전체 프레임에서 간편 열람·발급 관련 링크 덤프 (디버깅 필수)
    for (const ctx of [page, ...page.frames()]) {
      try {
        const fUrl = ctx.url ? ctx.url() : '';
        if (fUrl === 'about:blank') continue;
        const links = await ctx.evaluate(() =>
          Array.from(document.querySelectorAll('a, button, li, span'))
            .filter(el => /열람|발급|부동산|간편|renf/.test((el.textContent||'') + (el.getAttribute('onclick')||'')))
            .slice(0, 15)
            .map(el => ({
              tag: el.tagName, id: el.id||'',
              text: (el.textContent||'').trim().replace(/\s+/g,' ').slice(0,40),
              href: (el.getAttribute('href')||'').slice(0,60),
              onclick: (el.getAttribute('onclick')||'').slice(0,80)
            }))
        ).catch(() => []);
        if (links.length > 0) {
          console.log(`[iros] nav links[${(fUrl||'main').slice(-50)}]:`, JSON.stringify(links));
        }
      } catch {}
    }

    // 간편 열람·발급 nav 클릭 — dispatchEvent 우선 (Gauce 이벤트 리스너 트리거)
    let navClicked = false;
    for (const ctx of [page, ...page.frames()]) {
      try {
        const fUrl = ctx.url ? ctx.url() : '';
        if (fUrl === 'about:blank') continue;
        const ganLink = ctx.locator('a, span, li').filter({ hasText: /간편.{0,3}열람|열람.{0,3}발급/ }).first();
        if (await ganLink.count() > 0) {
          const href = await ganLink.getAttribute('href').catch(() => '');
          const onclick = await ganLink.getAttribute('onclick').catch(() => '');
          console.log('[iros] 간편 열람·발급 발견 href=', href, 'onclick=', (onclick||'').slice(0,60));
          const el = await ganLink.elementHandle().catch(() => null);
          if (el) {
            await ctx.evaluate(e => e.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true,view:window})), el).catch(() => {});
            navClicked = true; break;
          }
          await ganLink.click({ force: true }).catch(() => {});
          navClicked = true; break;
        }
      } catch {}
    }

    // 폴백: 부동산 hover → 간편 열람·발급
    if (!navClicked) {
      for (const ctx of [page, ...page.frames()]) {
        try {
          const fUrl = ctx.url ? ctx.url() : '';
          if (fUrl === 'about:blank') continue;
          const bdsMenu = ctx.locator('li, a, button').filter({ hasText: /^부동산$/ }).first();
          if (await bdsMenu.count() > 0) {
            await bdsMenu.hover().catch(() => {});
            await page.waitForTimeout(600);
            const ganSub = ctx.locator('a, span').filter({ hasText: /간편.{0,3}열람/ }).first();
            if (await ganSub.count() > 0) {
              const el = await ganSub.elementHandle().catch(() => null);
              if (el) await ctx.evaluate(e => e.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true,view:window})), el).catch(() => {});
              else await ganSub.click({ force: true }).catch(() => {});
              navClicked = true; break;
            }
          }
        } catch {}
      }
    }

    // JS 직접 호출 폴백 (Gauce WebSquare nav 함수 패턴)
    if (!navClicked) {
      console.log('[iros] JS nav 함수 직접 호출 시도');
      const jsFns = [
        `(function(){ var el=document.querySelector('a[onclick*="renf"],a[href*="renf"],a[href*="selectRenf"]'); if(el){el.click();return 'clicked:'+el.textContent.trim().slice(0,20);} return false; })()`,
        `(function(){ if(typeof fn_goPage==='function') return fn_goPage('renf','selectRenf0100List')||'fn_goPage called'; return false; })()`,
        `(function(){ if(typeof gfn_callPage==='function') return gfn_callPage('renf/selectRenf0100List')||'gfn called'; return false; })()`,
        `(function(){ if(typeof w2){var fn=window.fn_movePage||window.fnMovePage||window.fn_go; if(fn) return fn('renf','selectRenf0100List')||'fn called';} return false; })()`,
      ];
      for (const fn of jsFns) {
        const result = await page.evaluate(fn).catch(() => false);
        console.log('[iros] JS nav 결과:', result);
        if (result) { navClicked = true; break; }
      }
    }

    console.log('[iros] nav 이동:', navClicked ? '성공' : '실패 — 현재 페이지에서 계속');

    // 콘텐츠 로드 대기 (processMsg 소멸 또는 최대 20초)
    for (let w = 0; w < 10; w++) {
      await page.waitForTimeout(2000);
      const fUrls = page.frames().map(f => f.url());
      const hasProc = fUrls.some(u => u.includes('processMsg'));
      console.log(`[iros] 콘텐츠 대기 tick=${w+1} frames=${fUrls.length} processMsg=${hasProc}`);
      if (!hasProc && w >= 1) { console.log('[iros] 콘텐츠 로드 완료'); break; }
    }
    await page.screenshot({ path: '/home/opc/iros-debug/step2-after-nav.png', fullPage: false }).catch(() => {});
    // 현재 모든 프레임 URL 로그
    console.log('[iros] nav 후 frames:', JSON.stringify(page.frames().map(f => f.url())));

    // 주소 추출 (동/호수 분리)
    const dongMatch = address.match(/(\d+)\s*동/);
    const hoMatch   = address.match(/(\d+)\s*호/);
    const unitDong  = dongMatch ? dongMatch[1] : '';
    const unitHo    = hoMatch   ? hoMatch[1]   : '';
    if (unitDong || unitHo) console.log('[iros] 아파트 동/호:', unitDong||'?', '/', unitHo||'?');

    // 주소 정제: IROS는 구/군 단위까지 포함해야 검색 결과가 나옴
    // "부산 수영구 수영로 668" → "수영구 수영로 668" (구까지 유지)
    // "서울특별시 강남구 테헤란로 152" → "강남구 테헤란로 152"
    const searchAddrFull = address.split(',')[0].trim()
      .replace(/\s+\d+동\s+\d+호.*/i, '').replace(/\s+\d+호.*/i, '').trim();
    const searchAddrShort = searchAddrFull
      // 광역시/도/특별자치시 제거 — 구/군은 유지
      .replace(/^(서울특별시?|부산광역시?|대구광역시?|인천광역시?|광주광역시?|대전광역시?|울산광역시?|세종특별자치시?|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s*/i, '')
      // 시 단독 (도시명만 + 공백) — 구/군이 바로 이어지는 경우에만 제거
      .replace(/^(서울|부산|대구|인천|광주|대전|울산|세종|수원|성남|고양|용인|창원|청주|안산|안양|전주|천안|포항|김해|남양주|화성|의정부|평택|시흥|파주|양산|진주|경주|목포|여수|순천|원주|강릉)[시]?\s+(?=[가-힣]+[구군])/, '')
      // 구/군은 제거하지 않음 — IROS 검색에 필수
      .trim();
    const searchAddr = searchAddrShort || searchAddrFull;
    console.log('[iros] 검색 주소:', searchAddr, '(원본:', address, ')');

    // 4단계: 주소 입력 필드 찾기
    const addrInput = await _findAddrInput(page);
    if (!addrInput) {
      const allInputCnt = await page.locator('input').count();
      throw new Error(`주소 검색창 없음. URL=${page.url()}, inputs=${allInputCnt}`);
    }

    // 입력 필드 소속 프레임 로그
    const addrInputFrame = await addrInput.evaluate((el) => ({
      frameUrl: el.ownerDocument.location?.href || el.baseURI,
      id: el.id, placeholder: el.placeholder
    })).catch(() => ({}));
    console.log('[iros] addrInput 프레임:', JSON.stringify(addrInputFrame));

    // 입력값 설정: WebSquare API setValue() 우선 → keyboard.type 폴백
    // fill()은 DOM value만 변경 — WebSquare는 내부 컴포넌트 상태를 별도로 관리하므로
    // fill() 후 검색 시 WebSquare가 빈 값으로 검색 → 0결과
    await addrInput.click({ clickCount: 3 }).catch(() => {});

    const w2SetResult = await page.evaluate((addr) => {
      try {
        const compId = 'mf_wfm_potal_main_sch_realCorp';
        if (window.w2 && typeof window.w2.getById === 'function') {
          const inp = window.w2.getById(compId);
          if (inp) {
            if (typeof inp.setValue === 'function') { inp.setValue(addr); return 'w2.setValue'; }
            if (typeof inp.set === 'function') { inp.set('value', addr); return 'w2.set'; }
            if (typeof inp.val === 'function') { inp.val(addr); return 'w2.val'; }
          }
        }
        if (window.scwin) {
          const inp = window.scwin[compId] || window.scwin[compId + '___input'];
          if (inp && typeof inp.setValue === 'function') { inp.setValue(addr); return 'scwin.setValue'; }
        }
        return 'no_api';
      } catch(e) { return 'err:' + e.message; }
    }, searchAddr);
    console.log('[iros] WebSquare setValue:', w2SetResult);

    if (!w2SetResult || w2SetResult === 'no_api' || w2SetResult.startsWith('err')) {
      // WebSquare API 실패 — keyboard.type으로 실제 키보드 이벤트 발생
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await page.keyboard.type(searchAddr, { delay: 30 });
      console.log('[iros] keyboard.type 폴백 입력');
    } else {
      // WebSquare API 성공해도 DOM 동기화 (inputValue() 확인용)
      await addrInput.fill(searchAddr).catch(() => {});
    }

    await page.waitForTimeout(600);
    const inputVal = await addrInput.inputValue().catch(() => '');
    console.log('[iros] 입력 설정값(DOM):', inputVal);

    // WebSquare 내부 값 검증 — 실제로 검색에 사용되는 값
    const w2GetVal = await page.evaluate(() => {
      try {
        const compId = 'mf_wfm_potal_main_sch_realCorp';
        if (window.w2 && typeof window.w2.getById === 'function') {
          const inp = window.w2.getById(compId);
          if (inp) {
            if (typeof inp.getValue === 'function') return 'w2.getValue:' + inp.getValue();
            if (typeof inp.get === 'function') return 'w2.get:' + inp.get('value');
            if (typeof inp.val === 'function') return 'w2.val:' + inp.val();
          }
        }
        if (window.scwin && window.scwin[compId]) {
          const inp = window.scwin[compId];
          if (typeof inp.getValue === 'function') return 'scwin.getValue:' + inp.getValue();
        }
        return 'no_getValue_api';
      } catch(e) { return 'err:' + e.message; }
    }).catch(() => 'catch');
    console.log('[iros] WebSquare 내부값:', w2GetVal);

    // 스크린샷 — 주소 입력 후 상태
    await page.screenshot({ path: '/home/opc/iros-debug/01-after-fill.png', fullPage: false }).catch(() => {});

    // 전체 버튼 덤프 — 실제 검색 버튼 ID 파악
    const btnDump = await page.evaluate(() => {
      try {
        return Array.from(document.querySelectorAll('a[id],button[id],input[type="button"][id],div[id*="btn_"]:not([id*="gridstart"])'))
          .map(el => ({ id: el.id, tag: el.tagName, cls: (el.className||'').substring(0,60), txt: (el.innerText||el.value||'').trim().replace(/\s+/g,' ').substring(0,40) }))
          .filter(el => el.id && el.id.length < 100 && !el.id.includes('scrollX') && !el.id.includes('_div'))
          .slice(0, 60);
      } catch(e) { return []; }
    }).catch(() => []);
    console.log('[iros] 버튼 전체 덤프:', JSON.stringify(btnDump));

    // 검색 트리거: Gauce WebSquare 내부 함수 직접 호출 (Enter 키는 Gauce 무시)
    const urlBefore = page.url();

    // 전역 검색 함수 목록 덤프
    const globalFns = await page.evaluate(() => {
      try { return Object.keys(window).filter(k => typeof window[k] === 'function' && /srch|smpl|search|fn_/i.test(k)); } catch(e) { return []; }
    }).catch(() => []);
    console.log('[iros] 전역 검색 함수:', JSON.stringify(globalFns));

    // Gauce 내부 함수 우선 시도 → 없으면 버튼 ID만 반환 (클릭은 Playwright으로)
    let jsFnResult = await page.evaluate(() => {
      try {
        if (typeof fn_smplSrch === 'function') { fn_smplSrch(); return 'fn_smplSrch'; }
        if (typeof scwin !== 'undefined' && typeof scwin.fn_smplSrch === 'function') { scwin.fn_smplSrch(); return 'scwin.fn_smplSrch'; }
        if (typeof fn_search === 'function') { fn_search(); return 'fn_search'; }
        if (typeof fn_srch === 'function') { fn_srch(); return 'fn_srch'; }
        if (typeof w2 !== 'undefined' && w2.getById) {
          var inp = w2.getById('mf_wfm_potal_main_sch_realCorp');
          if (inp && inp.fireEvent) { inp.fireEvent('onenterkey', {keyCode:13}); return 'w2.onenterkey'; }
        }
        // dispatchEvent 대신 버튼 ID만 반환 → Playwright.click()으로 클릭
        var btn = document.querySelector(
          '#mf_wfm_potal_main_btn_sch,[id*="btn_smpl_srch"],[id*="btn_sch_realCorp"],[id*="btn_sch"]:not([id*="header"]):not([id*="top_menu"]),[id*="btn_srch"]:not([id*="header"]):not([id*="top_menu"])'
        );
        return btn ? ('id:' + btn.id) : 'notfound';
      } catch(e) { return 'err:' + e.message; }
    }).catch(e => 'catch:' + e.message);
    console.log('[iros] Gauce JS 검색 결과:', jsFnResult);

    // CSS.escape는 Node.js에 없음 — ID에 특수문자 없으므로 직접 사용
    const cssId = id => '#' + id.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');

    // dispatchEvent는 WebSquare 이벤트를 태우지 않음 → Playwright 실제 클릭 필수
    if (jsFnResult && jsFnResult.startsWith('id:')) {
      const btnId = jsFnResult.slice(3);
      console.log('[iros] Playwright 직접 클릭 — btnId:', btnId);
      try {
        await page.locator(cssId(btnId)).click({ force: true, timeout: 8000 });
        jsFnResult = 'playwright_click:' + btnId;
        console.log('[iros] 검색 버튼 클릭 성공');
      } catch(e) {
        console.log('[iros] 메인 클릭 실패:', e.message, '— frame 탐색');
        for (const fr of page.frames()) {
          try {
            const fb = fr.locator(cssId(btnId));
            if (await fb.count() > 0) { await fb.click({ force: true, timeout: 5000 }); jsFnResult = 'frame_click:' + btnId; break; }
          } catch {}
        }
      }
    } else if (jsFnResult === 'notfound') {
      // 버튼 못 찾으면 Enter 키 폴백
      console.log('[iros] 버튼 없음 — Enter 폴백');
      await page.evaluate(() => {
        var el = document.getElementById('mf_wfm_potal_main_sch_realCorp___input');
        if (el) ['keydown','keypress','keyup'].forEach(t => el.dispatchEvent(new KeyboardEvent(t, {key:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true})));
      }).catch(() => {});
      await addrInput.press('Enter').catch(() => {});
    }
    console.log('[iros] 검색 최종 결과:', jsFnResult);

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/home/opc/iros-debug/02-after-trigger.png', fullPage: false }).catch(() => {});
    console.log('[iros] 검색 트리거 완료');

    // 결과 대기: processMsg는 Gauce SPA 영구 프레임이라 절대 사라지지 않음.
    // 대신 그리드 DOM 상태(rowCount>0 또는 "조회결과가 없습니다" 텍스트)로 완료 판단.
    let resultPage = page;
    let loginAttempted = false;
    for (let tick = 0; tick < 20; tick++) {
      await page.waitForTimeout(2000);

      // 1순위: 새 팝업/탭
      const allPages = context.pages();
      if (allPages.length > 1) {
        resultPage = allPages[allPages.length - 1];
        console.log('[iros] 팝업/새탭 감지 pages=', allPages.length, resultPage.url());
        await resultPage.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => {});
        break;
      }

      // 2순위: 메인 페이지 URL 변경 (내비게이션)
      const urlNow = page.url();
      if (urlNow !== urlBefore) {
        console.log('[iros] URL 변경:', urlBefore, '->', urlNow);
        break;
      }

      // 3순위: 로그인 레이어 감지
      const loginVisible = await page.locator('#userId, input[name="userId"], input[id*="userId"]').count().catch(() => 0);
      if (loginVisible > 0 && !loginAttempted) {
        console.log('[iros] 로그인 레이어 감지 — 자동 로그인');
        loginAttempted = true;
        await _irosLogin(page);
        await page.waitForTimeout(3000);
        // 로그인 후 재검색
        const addrInput2 = await _findAddrInput(page);
        if (addrInput2) {
          await addrInput2.click({ clickCount: 3 }).catch(() => {});
          await addrInput2.fill(searchAddr);
          await page.waitForTimeout(500);
          const btnId2 = await page.evaluate(() => {
            var b = document.querySelector('#mf_wfm_potal_main_btn_sch,[id*="btn_sch"]:not([id*="header"])');
            return b ? b.id : null;
          }).catch(() => null);
          if (btnId2) await page.locator(cssId(btnId2)).click({ force: true }).catch(() => {});
          else await addrInput2.press('Enter').catch(() => {});
          console.log('[iros] 로그인 후 재검색');
        }
        continue;
      }

      // 3.5순위: "검색결과가 많아" 확인 모달 처리 (결과 다수 시 IROS가 확인 요청)
      // 모달을 닫지 않으면 그리드가 영원히 로드되지 않음
      const modalDismissed = await page.evaluate(() => {
        try {
          // 방법 1: 모달 텍스트 포함 여부로 확인 모달 식별 후 확인 버튼 클릭
          const body = document.body ? document.body.innerText : '';
          const hasModal = body.includes('검색결과가 많아') || body.includes('pr20.message.info.web.via.0011');
          if (!hasModal) return false;

          // 모든 버튼/링크 중 "확인" 텍스트 가진 것 클릭
          const allBtns = Array.from(document.querySelectorAll('button, input[type="button"], a, div[class*="btn"], span[class*="btn"]'));
          const okBtn = allBtns.find(b => {
            const txt = (b.textContent || b.value || b.innerText || '').trim();
            return txt === '확인' && b.offsetParent !== null;
          });
          if (okBtn) { okBtn.click(); return 'clicked:' + (okBtn.id || okBtn.className.slice(0,30)); }

          // 방법 2: WebSquare w2popup/w2window 확인 버튼
          if (window.w2) {
            const popups = document.querySelectorAll('[id*="popup"],[id*="window"],[id*="dialog"],[id*="modal"],[id*="Pop"],[id*="Win"]');
            for (const pop of popups) {
              if (!pop.innerText || !pop.innerText.includes('많아')) continue;
              const btn = Array.from(pop.querySelectorAll('*')).find(el => {
                const t = (el.textContent || '').trim();
                return t === '확인' && el.offsetParent !== null;
              });
              if (btn) { btn.click(); return 'w2popup_clicked'; }
            }
          }
          return 'modal_found_no_btn';
        } catch(e) { return 'err:' + e.message; }
      }).catch(() => false);
      if (modalDismissed) {
        console.log('[iros] 검색결과 많음 모달 처리:', modalDismissed);
        await page.waitForTimeout(1500);
      }

      // 4순위: 그리드 상태로 검색 완료 판단
      // processMsg.html은 Gauce SPA 영구 프레임 — 절대 사라지지 않으므로 사용 불가
      const gridState = await page.evaluate(() => {
        try {
          var grid = document.getElementById('mf_wfm_potal_main_wfm_content_grd_smpl_srch_rslt');
          if (!grid) return { ready: false, reason: 'no_grid' };
          var txt = grid.innerText || '';
          var tbody = document.getElementById('mf_wfm_potal_main_wfm_content_grd_smpl_srch_rslt_body_tbody');
          var rows = tbody ? tbody.querySelectorAll('tr').length : 0;
          var noResult = txt.includes('조회결과가 없습니다');
          var hasRows = rows > 0;
          // 로딩 중 스피너 확인 (processbar 가시성으로 판단)
          var pb = document.getElementById('___processbar2_i');
          var isLoading = pb ? (pb.style.visibility !== 'hidden' && pb.style.display !== 'none') : false;
          return { ready: (noResult || hasRows) && !isLoading, rows, noResult, isLoading, reason: noResult ? 'no_result' : hasRows ? 'has_rows' : 'loading' };
        } catch(e) { return { ready: false, reason: 'err:' + e.message }; }
      }).catch(() => ({ ready: false, reason: 'catch' }));

      console.log(`[iros] tick=${tick+1} grid=${JSON.stringify(gridState)}`);
      if (gridState.ready) {
        console.log('[iros] 그리드 완료 감지 → 결과 로드 완료 (' + gridState.reason + ')');
        break;
      }
    }

    // ── 메인 페이지 그리드 직접 확인 ─────────────────────────────────────────────
    const mainGridRows = await page.evaluate(() => {
      try {
        var tbody = document.getElementById('mf_wfm_potal_main_wfm_content_grd_smpl_srch_rslt_body_tbody');
        if (!tbody) return { found: false };
        var rows = tbody.querySelectorAll('tr');
        var texts = Array.from(rows).slice(0,3).map(r => r.innerText.trim().substring(0,80));
        return { found: true, rowCount: rows.length, samples: texts };
      } catch(e) { return { found: false, err: e.message }; }
    }).catch(() => ({ found: false }));
    console.log('[iros] 메인 그리드 행 수:', JSON.stringify(mainGridRows));

    // ── Prvw 팝업 처리 ────────────────────────────────────────────────────────────
    // Pm10P0IrosPopupPrvw: IROS 간편열람 결과 팝업 OR 시스템 공지 팝업
    // 공지인 경우: 주소 입력창 없음 → 닫기 후 메인 페이지에서 재검색
    // 결과인 경우: 주소 입력창 또는 그리드 행이 있음 → 상호작용
    const isPrvwPopup = resultPage.url().includes('popup') && resultPage !== page;
    if (isPrvwPopup) {
      console.log('[iros] Prvw 팝업 감지 — 내용 파악 중...');
      await resultPage.waitForTimeout(1500);
      await resultPage.screenshot({ path: '/home/opc/iros-debug/step3-popup.png', fullPage: false }).catch(() => {});

      // 팝업 body 텍스트 로그
      const popBody = await resultPage.evaluate(() => document.body?.innerText?.slice(0, 500) || '').catch(() => '');
      console.log('[iros] 팝업 body:', popBody.slice(0, 200));

      // 팝업 내 주소 입력창 있는지 확인
      const popupInput = await _findAddrInput(resultPage);
      if (popupInput) {
        const popupInputInfo = await popupInput.evaluate(el => ({ id: el.id, placeholder: el.placeholder })).catch(() => ({}));
        console.log('[iros] 팝업 내 주소 입력창:', JSON.stringify(popupInputInfo));
        await popupInput.click({ clickCount: 3 }).catch(() => {});
        await popupInput.fill(searchAddr);
        await resultPage.waitForTimeout(500);
        // Playwright 실제 클릭으로 검색 버튼 트리거
        const popBtnId = await resultPage.evaluate(() => {
          var btn = document.querySelector('#mf_wfm_potal_main_btn_sch,[id*="btn_sch"],[id*="btn_srch"],[id*="btn_smpl"]');
          return btn ? btn.id : null;
        }).catch(() => null);
        if (popBtnId) {
          await resultPage.locator(cssId(popBtnId)).click({ force: true }).catch(() => {});
          console.log('[iros] 팝업 검색 버튼 클릭:', popBtnId);
        } else {
          await popupInput.press('Enter');
          console.log('[iros] 팝업 Enter 검색');
        }
        // processMsg는 영구 프레임 — 그리드 상태로 완료 판단
        for (let w = 0; w < 8; w++) {
          await resultPage.waitForTimeout(2000);
          const popGrid = await resultPage.evaluate(() => {
            var grid = document.getElementById('mf_wfm_potal_main_wfm_content_grd_smpl_srch_rslt');
            if (!grid) return { ready: false };
            var txt = grid.innerText || '';
            var tbody = document.getElementById('mf_wfm_potal_main_wfm_content_grd_smpl_srch_rslt_body_tbody');
            var rows = tbody ? tbody.querySelectorAll('tr').length : 0;
            return { ready: txt.includes('조회결과') || rows > 0, rows };
          }).catch(() => ({ ready: false }));
          console.log(`[iros] 팝업 검색 대기 tick=${w+1} grid=${JSON.stringify(popGrid)}`);
          if (popGrid.ready) break;
        }
      } else {
        // 주소창 없음 → 공지/알림 팝업 → 닫기 (컨텍스트 닫지 않도록 주의)
        console.log('[iros] 팝업 내 주소 입력창 없음 — 공지 닫기 시도');
        for (const closeText of ['오늘 다시 보지 않기', '×', 'X']) {
          try {
            const btn = resultPage.locator('a, button, span').filter({ hasText: new RegExp(`^${closeText}$`) }).first();
            if (await btn.count() > 0) {
              await btn.click({ force: true }).catch(() => {});
              await resultPage.waitForTimeout(500);
              console.log('[iros] 공지 팝업 닫기:', closeText);
            }
          } catch {}
        }
        // 팝업 닫힌 후 메인에서 재검색 (resultPage를 main page로 되돌림)
        resultPage = page;
        await page.waitForTimeout(1000);
      }
      await resultPage.screenshot({ path: '/home/opc/iros-debug/step3b-popup-search.png', fullPage: false }).catch(() => {});
    }

    // ── 5단계: 검색 후 전체 컨텍스트 스캔 (디버깅 + 결과 탐색) ───────────────────
    {
      const debugDir = '/home/opc/iros-debug';
      await mkdir(debugDir, { recursive: true }).catch(() => {});
      await resultPage.screenshot({ path: join(debugDir, 'step4-search.png'), fullPage: true }).catch(() => {});
      console.log('[iros] 스크린샷 저장: step4-search.png');

      // 메인 페이지 + 모든 frame body text 덤프 (cross-origin 제외)
      const ctxList = [resultPage, ...resultPage.frames()];
      for (const f of ctxList) {
        const fu = f.url ? f.url() : '';
        const ft = await f.evaluate(() => (document.body?.innerText || '').slice(0, 600)).catch(() => '');
        if (ft.trim().length > 20) {
          console.log(`[iros] ctx[${(fu||'main').slice(-80)}] body: ${ft.slice(0, 300)}`);
        }
      }

      // Gauce 그리드 셀 ID 패턴 덤프 — 모든 frame 포함
      const gridSel = 'tr[id], tr[onclick], td[id], div[id*="grd"], div[id*="grid"], ' +
        'div[id*="Row"], div[id*="Cell"], tbody, table';
      for (const f of [resultPage, ...resultPage.frames()]) {
        const fu = f.url ? f.url() : '';
        const gridEls = await f.evaluate((sel) => {
          return Array.from(document.querySelectorAll(sel)).slice(0, 30).map(el => ({
            tag: el.tagName, id: el.id || '', cls: (el.className||'').slice(0,60),
            txt: (el.textContent||'').trim().slice(0,100)
          }));
        }, gridSel).catch(() => []);
        if (gridEls.length) console.log(`[iros] 그리드[${(fu||'main').slice(-60)}]:`, JSON.stringify(gridEls.slice(0,10)));
      }
    }

    // 주소 키워드로 결과 행 찾기
    const addrKeywords = searchAddr.replace(/^(부산|서울|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s*/, '').trim().split(' ');
    const addrKey = addrKeywords.slice(-2).join(' ');
    console.log('[iros] 결과 탐색 키워드:', addrKey);

    // resultPage + 모든 frame 탐색
    const searchCtxList = [resultPage, ...resultPage.frames()];

    let resultRow = null;
    let resultCtx = resultPage;

    // 1차: 주소 키워드 포함 행 (가장 정확)
    for (const ctx of searchCtxList) {
      try {
        for (const sel of ['tr', 'li', 'div[id*="Row"]', 'div[id*="row"]', 'td']) {
          const loc = ctx.locator(sel).filter({ hasText: addrKey }).first();
          if (await loc.count() > 0) {
            console.log('[iros] 주소키워드 매칭 발견 sel=', sel, 'ctx=', (ctx.url?.() || '').slice(-60));
            resultRow = loc; resultCtx = ctx; break;
          }
        }
        if (resultRow) break;
      } catch {}
    }

    // 2차: Gauce 그리드 행 패턴 (onclick / id)
    if (!resultRow) {
      for (const ctx of searchCtxList) {
        try {
          const loc = ctx.locator('tr[onclick], tr[id*="Row"], tr[id*="grd"], tr[id*="row"]').first();
          if (await loc.count() > 0) {
            console.log('[iros] Gauce 그리드 행 발견 ctx=', (ctx.url?.() || '').slice(-60));
            resultRow = loc; resultCtx = ctx; break;
          }
        } catch {}
      }
    }

    // 3차: 첫 번째 tbody의 첫 번째 tr
    if (!resultRow) {
      for (const ctx of searchCtxList) {
        try {
          const loc = ctx.locator('tbody tr').first();
          if (await loc.count() > 0) {
            const txt = await loc.innerText().catch(() => '');
            if (txt.trim().length > 5) {
              console.log('[iros] tbody tr 폴백:', txt.slice(0,60));
              resultRow = loc; resultCtx = ctx; break;
            }
          }
        } catch {}
      }
    }

    if (!resultRow) {
      const frameUrls = resultPage.frames().map(f => f.url()).filter(u => u && u !== 'about:blank');
      throw new Error(`"${searchAddr}" (키워드: ${addrKey}) 검색 결과 없음 (resultPage=${resultPage.url()}, frames: ${JSON.stringify(frameUrls)})`);
    }
    console.log('[iros] 결과 행 클릭');

    // Gauce WebSquare API로 행 선택 (dispatchEvent 무시됨 — JS API 필요)
    const gridId = 'mf_wfm_potal_main_wfm_content_grd_smpl_srch_rslt';
    const gauceSelect = await resultPage.evaluate((gid) => {
      try {
        // scwin 네임스페이스 (WebSquare 글로벌 객체)
        if (window.scwin && window.scwin[gid]) {
          var g = window.scwin[gid];
          if (typeof g.selectRow === 'function') { g.selectRow(0); return 'scwin.selectRow(0)'; }
          if (typeof g.setCellValue === 'function') { g.setCellValue(0, 'col_chk', 'Y'); return 'scwin.setCellValue'; }
          if (typeof g.setSelectRow === 'function') { g.setSelectRow(0); return 'scwin.setSelectRow(0)'; }
        }
        // w2 네임스페이스 (WebSquare 다른 버전)
        if (window.w2 && typeof window.w2.getById === 'function') {
          var g2 = window.w2.getById(gid);
          if (g2 && typeof g2.selectRow === 'function') { g2.selectRow(0); return 'w2.selectRow(0)'; }
        }
        // 직접 DOM 이벤트 (Gauce 네임스페이스 없는 경우)
        var tbody = document.getElementById(gid + '_body_tbody');
        var firstRow = tbody && tbody.querySelector('tr');
        if (firstRow) {
          firstRow.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return 'dom.click(firstRow)';
        }
        return 'no_api';
      } catch(e) { return 'err:' + e.message; }
    }, gridId).catch(() => 'catch');
    console.log('[iros] Gauce 행 선택:', gauceSelect);
    await resultPage.waitForTimeout(1000);

    // WebSquare: 반드시 Playwright 직접 click() — dispatchEvent는 무시됨
    // 행 클릭 후 IROS는 보통 새 팝업창을 엶 → context.waitForEvent('page')로 감지
    const [rowPopup] = await Promise.all([
      context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
      resultRow.click({ force: true, timeout: 8000 }).catch(async (e) => {
        console.log('[iros] force click 실패:', e.message, '— td 자식 클릭 시도');
        const tdChild = resultRow.locator('td').first();
        await tdChild.click({ force: true, timeout: 5000 }).catch(async () => {
          const eh = await resultRow.elementHandle().catch(() => null);
          if (eh) await resultCtx.evaluate(el => el.click(), eh).catch(() => {});
        });
      }),
    ]);

    if (rowPopup) {
      console.log('[iros] 행 클릭 팝업 감지:', rowPopup.url());
      await rowPopup.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      resultPage = rowPopup;
    } else {
      await resultPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    }
    await resultPage.waitForTimeout(2000);
    await resultPage.screenshot({ path: '/home/opc/iros-debug/step5-after-row-click.png', fullPage: false }).catch(() => {});
    console.log('[iros] 행 클릭 후 URL:', resultPage.url());

    // 5-1단계: 아파트 동·호수 선택 (건물 클릭 후 세부 선택 UI 나타나는 경우)
    if (unitDong || unitHo) {
      console.log('[iros] 동/호수 선택 시도:', unitDong, unitHo);
      const unitCtxList = [resultPage, ...resultPage.frames()];

      // 동 선택 — select 또는 클릭 가능한 행
      if (unitDong) {
        for (const ctx of unitCtxList) {
          try {
            const dongSelect = ctx.locator('select').filter({ hasText: new RegExp(unitDong+'동') }).first();
            if (await dongSelect.count() > 0) {
              await dongSelect.selectOption({ label: new RegExp(unitDong) });
              console.log('[iros] 동 select 선택:', unitDong);
              break;
            }
            const dongRow = ctx.locator('tr, li').filter({ hasText: new RegExp(`^${unitDong}동$|\\s${unitDong}동\\s`) }).first();
            if (await dongRow.count() > 0) {
              await dongRow.click({ force: true }).catch(async () => {
                const dEh = await dongRow.elementHandle().catch(() => null);
                if (dEh) await ctx.evaluate(el => el.click(), dEh).catch(() => {});
              });
              console.log('[iros] 동 행 클릭:', unitDong);
              await resultPage.waitForTimeout(1000);
              break;
            }
          } catch {}
        }
      }
      // 호수 선택 — input fill 또는 행 클릭
      if (unitHo) {
        let hoHandled = false;
        for (const ctx of unitCtxList) {
          try {
            const hoInput = ctx.locator('input[id*="ho" i]:not([type="hidden"]), input[placeholder*="호"]').first();
            if (await hoInput.count() > 0 && await hoInput.isVisible().catch(() => false)) {
              await hoInput.click({ clickCount: 3 });
              await hoInput.fill(unitHo);
              await hoInput.press('Enter');
              console.log('[iros] 호수 input 입력:', unitHo);
              hoHandled = true;
              break;
            }
            const hoRow = ctx.locator('tr, li').filter({ hasText: new RegExp(`^${unitHo}호$|\\s${unitHo}호[\\s)]`) }).first();
            if (await hoRow.count() > 0) {
              await hoRow.click({ force: true }).catch(async () => {
                const hEh = await hoRow.elementHandle().catch(() => null);
                if (hEh) await ctx.evaluate(el => el.click(), hEh).catch(() => {});
              });
              console.log('[iros] 호수 행 클릭:', unitHo);
              hoHandled = true;
              await resultPage.waitForTimeout(1000);
              break;
            }
          } catch {}
        }
        if (!hoHandled) console.log('[iros] 호수 선택 UI 없음 (건물 전체 등기부로 진행)');
      }
      await resultPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      await resultPage.waitForTimeout(1000);
    }

    // 5단계 후 현재 URL + DOM 요약 로그 (디버깅)
    console.log('[iros] Step5 완료 URL:', resultPage.url());
    {
      const btns = await resultPage.evaluate(() =>
        Array.from(document.querySelectorAll('a,button')).slice(0, 30)
          .map(el => `${el.tagName}[${el.id||el.className||''}] "${(el.textContent||'').trim().slice(0,20)}"`)
          .join(' | ')
      ).catch(() => '');
      console.log('[iros] 가시 버튼/링크:', btns.slice(0, 500));
    }

    // 6단계: 열람/발급 버튼 탐색
    // ⚠️ IROS SPA 특성: 상단 nav에 항상 "열람·발급" 텍스트가 있음 (중간점 ·)
    //    content area의 실제 열람 버튼은 "열람" 또는 "발급"만 포함 (중간점 없음)
    //    nav 제외 기준: id에 gnb/menu/lnb 포함, 또는 텍스트에 "·" 포함
    const issueCandidates = [
      // ID 기반: content 영역 버튼 (gnb/메뉴 제외)
      '[id*="wfm_content"][id*="btn"]',
      // input 버튼 (value 기준 — nav에는 input type=button 없음)
      'input[type="button"][value*="열람"]',
      'input[type="button"][value*="발급"]',
      'input[type="button"][value*="VIEW"]',
      // onclick 패턴 (IROS 소문자/대문자 혼용)
      'a[onclick*="열람"], a[onclick*="발급"], a[onclick*="view"], a[onclick*="View"]',
      'button[onclick*="열람"], button[onclick*="발급"]',
      // td 내부 링크/버튼 (grid row action cell — nav에는 td 없음)
      'td > a:has-text("열람"), td > a:has-text("발급")',
      'td > button:has-text("열람"), td > button:has-text("발급")',
      // content 영역 내 any — 마지막 폴백
      '[id*="wfm_content"] a:has-text("열람"), [id*="wfm_content"] button:has-text("열람")',
      '[id*="wfm_content"] a:has-text("발급"), [id*="wfm_content"] button:has-text("발급")',
    ];

    let issueBtn = null;
    let issuePage = resultPage;
    for (const ctx of [resultPage, ...resultPage.frames()]) {
      try {
        for (const sel of issueCandidates) {
          const locs = ctx.locator(sel);
          const cnt = await locs.count().catch(() => 0);
          for (let bi = 0; bi < Math.min(cnt, 5); bi++) {
            const loc = locs.nth(bi);
            const info = await loc.evaluate(el => ({
              id: el.id || '',
              txt: (el.textContent || el.getAttribute('value') || '').trim().slice(0, 40),
              vis: el.offsetParent !== null || getComputedStyle(el).display !== 'none',
            })).catch(() => null);
            if (!info) continue;
            // nav 메뉴 제외: "·" 중간점 포함(열람·발급), gnb/menu/lnb ID
            if (info.txt.includes('·')) continue;
            if (/gnb|wf_menu|lnb|_top_|breadcrumb|_nav/i.test(info.id)) continue;
            if (!info.vis) continue;
            console.log('[iros] 열람버튼 후보:', JSON.stringify(info), '| selector:', sel);
            issueBtn = loc;
            issuePage = ctx;
            break;
          }
          if (issueBtn) break;
        }
        if (issueBtn) break;
      } catch {}
    }

    if (!issueBtn) {
      // 디버깅: 페이지의 모든 클릭 가능 요소 로그
      const domHint = await resultPage.evaluate(() => {
        return Array.from(document.querySelectorAll('a,button,input[type="button"]'))
          .filter(el => {
            const txt = (el.textContent || el.getAttribute('value') || '').trim();
            return /열람|발급|조회|확인/.test(txt) && txt.length < 30;
          })
          .slice(0, 15)
          .map(el => `${el.tagName}#${el.id} "${(el.textContent||el.getAttribute('value')||'').trim().slice(0,20)}" vis=${el.offsetParent!==null}`)
          .join(' | ');
      }).catch(() => '');
      console.log('[iros] 열람/발급 버튼 못 찾음. 전체 DOM 힌트:', domHint);
      // 스크린샷도 저장
      await resultPage.screenshot({ path: '/home/opc/iros-debug/step6-no-issue-btn.png', fullPage: true }).catch(() => {});
      throw new Error(`등기부 내용 미감지 — IROS 발급 흐름 미완료 (URL: ${resultPage.url()}, hint: ${domHint.slice(0,300)})`);
    }

    console.log('[iros] 열람/발급 버튼 클릭');
    // 열람 버튼 클릭 후 새 팝업(결제 or 뷰어) 또는 현재 페이지 변환
    const [issuePopup] = await Promise.all([
      context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
      issueBtn.click({ force: true }).catch(async (e) => {
        console.log('[iros] issueBtn click 실패:', e.message);
        const eh = await issueBtn.elementHandle().catch(() => null);
        if (eh) await issuePage.evaluate(el => el.click(), eh).catch(() => {});
      }),
    ]);
    if (issuePopup) {
      console.log('[iros] 열람 팝업 감지:', issuePopup.url());
      await issuePopup.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      resultPage = issuePopup;
    }
    await resultPage.waitForTimeout(3000);
    await resultPage.screenshot({ path: '/home/opc/iros-debug/step6-after-issue.png', fullPage: false }).catch(() => {});
    console.log('[iros] 열람 버튼 클릭 후 URL:', resultPage.url());
    console.log('[iros] 발급버튼클릭후 URL:', resultPage.url());

    // 전자화폐 결제
    if (emoneyNo1 && emoneyPwd) {
      try {
        const payRadioSel = 'input[value*="emoney"], input[value*="전자화폐"], label[for*="emoney"], input[value="03"]';
        const payEmoneyRadio = resultPage.locator(payRadioSel).first();
        if (await payEmoneyRadio.count() > 0) {
          await payEmoneyRadio.click();
          await resultPage.waitForTimeout(500);
          const emoNo1Field = resultPage.locator('input[id*="emoneyNo1" i], input[name*="emoneyNo1" i]').first();
          const emoNo2Field = resultPage.locator('input[id*="emoneyNo2" i], input[name*="emoneyNo2" i]').first();
          const emoPwdField = resultPage.locator('input[id*="emoneyPwd" i], input[name*="emoneyPwd" i], input[id*="emoPwd" i]').first();
          if (await emoNo1Field.count() > 0) await emoNo1Field.fill(emoneyNo1);
          if (emoneyNo2 && await emoNo2Field.count() > 0) await emoNo2Field.fill(emoneyNo2);
          if (await emoPwdField.count() > 0) await emoPwdField.fill(emoneyPwd);
          const payBtnSel = '#payBtn, button[onclick*="pay"], .btn-pay, button:has-text("결제"), button:has-text("확인")';
          const payBtn = resultPage.locator(payBtnSel).first();
          if (await payBtn.count() > 0) {
            await payBtn.click();
            await resultPage.waitForTimeout(3000);
          }
        }
      } catch (pe) {
        console.error('[iros] 결제 단계 오류:', pe.message);
      }
    }

    // 7단계: PDF 확보 (다운로드 이벤트 우선 → 뷰어 캡처 → 에러)
    const pdfPath = join(tmpDir, 'registry.pdf');

    // 7-1: 다운로드 이벤트 대기 (발급 클릭 후 30초)
    let pdfSaved = false;
    try {
      const dlPromise = context.waitForEvent('download', { timeout: 30000 });
      const dl = await dlPromise;
      await dl.saveAs(pdfPath);
      console.log('[iros] PDF 다운로드 성공:', pdfPath);
      pdfSaved = true;
    } catch {
      console.log('[iros] 다운로드 이벤트 없음 → 뷰어 캡처 시도');
    }

    // 7-2: 다운로드 없으면 현재 페이지에 등기부 내용이 있는지 확인
    if (!pdfSaved) {
      const hasRegistryContent = await resultPage.evaluate(() => {
        const txt = document.body.innerText || '';
        return /표제부|갑구|을구|소유권|순위번호|접수|등기원인|등기목적/.test(txt);
      }).catch(() => false);

      if (hasRegistryContent) {
        console.log('[iros] 뷰어에서 등기부 내용 감지 → page.pdf() 캡처');
        const pdfBuffer2 = await resultPage.pdf({
          format: 'A4', printBackground: true,
          margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });
        await writeFile(pdfPath, pdfBuffer2);
        pdfSaved = true;
      } else {
        const curUrl = resultPage.url();
        const bodySnip = await resultPage.evaluate(() => (document.body.innerText||'').slice(0, 300)).catch(() => '');
        console.log('[iros] 등기부 내용 없음. URL:', curUrl, '| 내용:', bodySnip);
        throw new Error(`등기부 내용 미감지 — IROS 발급 흐름 미완료 (URL: ${curUrl})`);
      }
    }

    const pdfBuffer = await readFile(pdfPath);
    res.json({ ok: true, pdfBase64: pdfBuffer.toString('base64'), address });
  } catch (e) {
    console.error('[iros-fetch]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

// ── DOCX 텍스트 추출 ─────────────────────────────────────────────────────────
async function extractDocxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const xmlFile = zip.file('word/document.xml');
  if (!xmlFile) throw new Error('word/document.xml 없음');
  const xmlText = await xmlFile.async('string');
  const text = xmlToPlainText(xmlText);
  const pageCount = Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 400));
  return { text, pageCount };
}

function xmlToPlainText(xml) {
  return xml
    .replace(/<w:br[^>]*>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 디버그: 최근 IROS 스크린샷 반환 (개발용)
app.get('/api/iros-screenshot', async (req, res) => {
  try {
    const { readFile: rf } = await import('fs/promises');
    const imgBuf = await rf('/home/opc/iros-debug/step4-search.png');
    res.setHeader('Content-Type', 'image/png');
    res.send(imgBuf);
  } catch {
    res.status(404).json({ error: '스크린샷 없음 — IROS 테스트 먼저 실행' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[seolyuhana-oracle] 서버 시작 port=${PORT}`);
});
