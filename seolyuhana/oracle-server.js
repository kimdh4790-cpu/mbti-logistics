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
import { writeFile, readFile, mkdtemp, rm } from 'fs/promises';
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
  // 실제 ID: mf_wfm_potal_main_sch_realCorp___input (2026-09-08 확인)
  async function _findAddrInput(page) {
    const candidates = [
      // IROS Gauce 고유 셀렉터 (최우선)
      'input[id*="sch_realCorp___input"]',
      'input[placeholder*="열람·발급하려면"]',
      'input[placeholder*="주소를 입력하세요"]',
      // 일반 addr 셀렉터 (폴백)
      'input[id*="addr" i]', 'input[id*="Addr"]',
      'input[name*="addr" i]',
      '#searchAddr', 'input[placeholder*="주소"]',
      'input[placeholder*="지번"]', 'input[placeholder*="도로명"]',
    ];
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
        const allInputs = ctx.locator('input[type="text"]');
        const cnt = await allInputs.count();
        for (let i = 0; i < Math.min(cnt, 20); i++) {
          const inp = allInputs.nth(i);
          const id = await inp.getAttribute('id').catch(() => '');
          if (id && id.includes('wf_header')) continue;
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
    // 홈페이지 중앙 검색창이 이미 존재 — nav 클릭 불필요
    // (IROS 홈: "부동산 등기사항증명서를 열람·발급하려면 주소를 입력하세요.")
    console.log('[iros] 홈 검색창 사용 (nav 클릭 생략)');

    // 4단계: 주소 입력 필드 찾기
    const addrInput = await _findAddrInput(page);
    if (!addrInput) {
      const allInputCnt = await page.locator('input').count();
      throw new Error(`주소 검색창 없음. URL=${page.url()}, inputs=${allInputCnt}`);
    }
    // 주소에서 동·호수 추출 (아파트 단위 선택용)
    const dongMatch = address.match(/(\d+)\s*동/);
    const hoMatch   = address.match(/(\d+)\s*호/);
    const unitDong  = dongMatch ? dongMatch[1] : '';
    const unitHo    = hoMatch   ? hoMatch[1]   : '';
    if (unitDong || unitHo) console.log('[iros] 아파트 동/호:', unitDong||'?', '/', unitHo||'?');

    // 주소 정제: 쉼표·호수 포함 시 IROS 검색 0건
    const searchAddr = address.split(',')[0].trim()
      .replace(/\s+\d+동\s+\d+호.*/i, '').replace(/\s+\d+호.*/i, '').trim();
    console.log('[iros] 검색 주소:', searchAddr, '(원본:', address, ')');

    // 실제 타이핑 시뮬레이션 (pressSequentially → IROS 자동완성/이벤트 트리거)
    await addrInput.click({ clickCount: 3 });
    await addrInput.pressSequentially(searchAddr, { delay: 40 });
    await page.waitForTimeout(1000);

    // 검색 버튼 (돋보기 아이콘 포함) 또는 Enter
    const searchBtnSel = [
      'button[title*="검색"]', 'button[aria-label*="검색"]',
      'button[class*="search"]', 'a[class*="search"]',
      'button:has-text("검색")', 'a:has-text("검색")',
      'input[type="submit"]', 'input[type="button"][value*="검색"]',
    ].join(', ');
    const searchBtns = page.locator(searchBtnSel);
    const sbCount = await searchBtns.count();
    console.log('[iros] 검색버튼 후보 수:', sbCount);
    if (sbCount > 0) {
      const sbEh = await searchBtns.first().elementHandle().catch(() => null);
      if (sbEh) await page.evaluate(el => el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})), sbEh).catch(() => {});
      else await searchBtns.first().click({ force: true }).catch(() => {});
    } else {
      await addrInput.press('Enter');
    }
    // IROS 응답 대기 (processMsg 사라질 때까지 + 여유)
    await page.waitForTimeout(8000);

    // 5단계: 검색 후 DOM 스냅샷 (디버깅)
    {
      const allText = await page.evaluate(() =>
        Array.from(document.querySelectorAll('tr, li, div[id*="grd"], div[id*="list"]'))
          .filter(el => el.children.length < 5)
          .map(el => `[${el.tagName}#${el.id}] "${(el.textContent||'').trim().slice(0,60)}"`)
          .slice(0, 30).join('\n')
      ).catch(() => '');
      console.log('[iros] 검색후 DOM:\n' + allText.slice(0, 1000));
      // 영구 경로에 스크린샷 저장 (tmpDir 삭제 후에도 확인 가능)
      const debugDir = '/home/opc/iros-debug';
      await mkdir(debugDir, { recursive: true }).catch(() => {});
      await page.screenshot({ path: join(debugDir, 'step4-search.png'), fullPage: true }).catch(() => {});
      console.log('[iros] 스크린샷 저장:', join(debugDir, 'step4-search.png'));
    }

    // 주소 키워드로 결과 행 찾기 (뉴스 등 무관 요소 회피)
    const addrKeywords = searchAddr.replace(/^(부산|서울|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s*/, '').trim().split(' ');
    const addrKey = addrKeywords.slice(-2).join(' ');  // "수영로 668" 같은 고유 부분
    console.log('[iros] 결과 탐색 키워드:', addrKey);

    let resultRow = null;
    let resultCtx = page;

    // 1차: 주소 키워드 포함 행 찾기 (가장 정확)
    for (const ctx of [page, ...page.frames()]) {
      try {
        for (const sel of ['tr', 'li', 'div[id*="Row"], div[id*="row"]']) {
          const loc = ctx.locator(sel).filter({ hasText: addrKey }).first();
          if (await loc.count() > 0) {
            console.log('[iros] 주소키워드 매칭 행 발견:', sel);
            resultRow = loc; resultCtx = ctx; break;
          }
        }
        if (resultRow) break;
      } catch {}
    }

    // 2차: Gauce 그리드 행 (onclick/id 패턴)
    if (!resultRow) {
      for (const ctx of [page, ...page.frames()]) {
        try {
          const tbodyRows = ctx.locator('tr[onclick], tr[id*="Row"], tr[id*="grd"]').first();
          if (await tbodyRows.count() > 0) {
            console.log('[iros] Gauce 그리드 행 발견');
            resultRow = tbodyRows; resultCtx = ctx; break;
          }
        } catch {}
      }
    }

    if (!resultRow) {
      const frameUrls = page.frames().map(f => f.url()).filter(u => u && u !== 'about:blank');
      throw new Error(`"${searchAddr}" (키워드: ${addrKey}) 검색 결과 없음 (frames: ${JSON.stringify(frameUrls)})`);
    }
    console.log('[iros] 결과 행 발견, 클릭');
    console.log('[iros] 결과 행 클릭');
    // Gauce SPA 오버레이 우회: dispatchEvent → force click → JS click 순으로 시도
    const eh = await resultRow.elementHandle().catch(() => null);
    if (eh) {
      await resultCtx.evaluate(el => {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }, eh).catch(() => {});
    } else {
      await resultRow.click({ force: true, timeout: 8000 }).catch(async () => {
        console.log('[iros] force click 실패, evaluate 재시도');
        const eh2 = await resultRow.elementHandle().catch(() => null);
        if (eh2) await resultCtx.evaluate(el => el.click(), eh2).catch(() => {});
      });
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 5-1단계: 아파트 동·호수 선택 (건물 클릭 후 세부 선택 UI 나타나는 경우)
    if (unitDong || unitHo) {
      console.log('[iros] 동/호수 선택 시도:', unitDong, unitHo);
      // 동 선택 — select 또는 클릭 가능한 행
      if (unitDong) {
        for (const ctx of [page, ...page.frames()]) {
          try {
            // select 드롭다운
            const dongSelect = ctx.locator('select').filter({ hasText: new RegExp(unitDong+'동') }).first();
            if (await dongSelect.count() > 0) {
              await dongSelect.selectOption({ label: new RegExp(unitDong) });
              console.log('[iros] 동 select 선택:', unitDong);
              break;
            }
            // 테이블 행 (Gauce)
            const dongRow = ctx.locator(`tr, li`).filter({ hasText: new RegExp(`^${unitDong}동$|\\s${unitDong}동\\s`) }).first();
            if (await dongRow.count() > 0) {
              const dEh = await dongRow.elementHandle().catch(() => null);
              if (dEh) await ctx.evaluate(el => el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})), dEh).catch(() => {});
              console.log('[iros] 동 행 클릭:', unitDong);
              await page.waitForTimeout(1000);
              break;
            }
          } catch {}
        }
      }
      // 호수 선택 — input fill 또는 행 클릭
      if (unitHo) {
        let hoHandled = false;
        for (const ctx of [page, ...page.frames()]) {
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
            const hoRow = ctx.locator(`tr, li`).filter({ hasText: new RegExp(`^${unitHo}호$|\\s${unitHo}호[\\s)]`) }).first();
            if (await hoRow.count() > 0) {
              const hEh = await hoRow.elementHandle().catch(() => null);
              if (hEh) await ctx.evaluate(el => el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})), hEh).catch(() => {});
              console.log('[iros] 호수 행 클릭:', unitHo);
              hoHandled = true;
              await page.waitForTimeout(1000);
              break;
            }
          } catch {}
        }
        if (!hoHandled) console.log('[iros] 호수 선택 UI 없음 (건물 전체 등기부로 진행)');
      }
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    // 5단계 후 현재 URL + DOM 요약 로그 (디버깅)
    console.log('[iros] Step5 완료 URL:', page.url());
    {
      const stepScreenPath = join(tmpDir, 'step5.png');
      await page.screenshot({ path: stepScreenPath, fullPage: false }).catch(() => {});
      const btns = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a,button')).slice(0, 30)
          .map(el => `${el.tagName}[${el.id||el.className||''}] "${(el.textContent||'').trim().slice(0,20)}"`)
          .join(' | ')
      ).catch(() => '');
      console.log('[iros] 가시 버튼/링크:', btns.slice(0, 500));
    }

    // 6단계: 열람/발급 버튼 — 모든 컨텍스트(page + frames) 탐색
    const issueSel = [
      'button:has-text("열람")', 'a:has-text("열람")',
      'button:has-text("발급")', 'a:has-text("발급")',
      'a[onclick*="issue"]', 'button[onclick*="issue"]',
      '#issueBtn', '.btn-issue',
      'input[type="button"][value*="열람"]', 'input[type="button"][value*="발급"]',
    ].join(', ');

    let issueBtn = null;
    let issuePage = page;
    for (const ctx of [page, ...page.frames()]) {
      try {
        const loc = ctx.locator(issueSel).first();
        if (await loc.count() > 0) { issueBtn = loc; issuePage = ctx; break; }
      } catch {}
    }

    if (!issueBtn) {
      // DOM에서 열람 관련 텍스트 포함 요소 전체 덤프
      const domHint = await page.evaluate(() =>
        Array.from(document.querySelectorAll('*')).filter(el =>
          el.children.length === 0 && /열람|발급|조회|확인/.test(el.textContent||'')
        ).slice(0, 10).map(el =>
          `${el.tagName}#${el.id}.${el.className} "${(el.textContent||'').trim().slice(0,30)}"`
        ).join(' | ')
      ).catch(() => '');
      console.log('[iros] 열람/발급 버튼 못 찾음. DOM 힌트:', domHint);
      throw new Error(`열람/발급 버튼 없음 (URL: ${page.url()}, hint: ${domHint.slice(0,200)})`);
    }

    console.log('[iros] 열람/발급 버튼 클릭');
    const issueEh = await issueBtn.elementHandle().catch(() => null);
    if (issueEh) {
      await issuePage.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })), issueEh).catch(() => {});
    } else {
      await issueBtn.click({ force: true }).catch(() => {});
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    console.log('[iros] 발급버튼클릭후 URL:', page.url());

    // 전자화폐 결제
    if (emoneyNo1 && emoneyPwd) {
      try {
        const payRadioSel = 'input[value*="emoney"], input[value*="전자화폐"], label[for*="emoney"], input[value="03"]';
        const payEmoneyRadio = page.locator(payRadioSel).first();
        if (await payEmoneyRadio.count() > 0) {
          await payEmoneyRadio.click();
          await page.waitForTimeout(500);
          const emoNo1Field = page.locator('input[id*="emoneyNo1" i], input[name*="emoneyNo1" i]').first();
          const emoNo2Field = page.locator('input[id*="emoneyNo2" i], input[name*="emoneyNo2" i]').first();
          const emoPwdField = page.locator('input[id*="emoneyPwd" i], input[name*="emoneyPwd" i], input[id*="emoPwd" i]').first();
          if (await emoNo1Field.count() > 0) await emoNo1Field.fill(emoneyNo1);
          if (emoneyNo2 && await emoNo2Field.count() > 0) await emoNo2Field.fill(emoneyNo2);
          if (await emoPwdField.count() > 0) await emoPwdField.fill(emoneyPwd);
          const payBtnSel = '#payBtn, button[onclick*="pay"], .btn-pay, button:has-text("결제"), button:has-text("확인")';
          const payBtn = page.locator(payBtnSel).first();
          if (await payBtn.count() > 0) {
            await payBtn.click();
            await page.waitForTimeout(3000);
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
      // 등기부 특유 텍스트(표제부, 갑구, 을구, 접수, 순위번호 등) 확인
      const hasRegistryContent = await page.evaluate(() => {
        const txt = document.body.innerText || '';
        return /표제부|갑구|을구|소유권|순위번호|접수|등기원인|등기목적/.test(txt);
      }).catch(() => false);

      if (hasRegistryContent) {
        console.log('[iros] 뷰어에서 등기부 내용 감지 → page.pdf() 캡처');
        const pdfBuffer2 = await page.pdf({
          format: 'A4', printBackground: true,
          margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });
        await writeFile(pdfPath, pdfBuffer2);
        pdfSaved = true;
      } else {
        const curUrl = page.url();
        const bodySnip = await page.evaluate(() => (document.body.innerText||'').slice(0, 300)).catch(() => '');
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
