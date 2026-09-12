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
import { writeFile, readFile, readdir, mkdtemp, rm, mkdir } from 'fs/promises';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { chromium } from 'playwright';
import JSZip from 'jszip';
import https from 'https';

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

// ── /api/pdf-text  PDF → 텍스트 (pdftotext, 한글 CIDFont CMap 대응) ────────────
// raw binary (application/pdf) 또는 multipart/form-data 모두 지원
app.post('/api/pdf-text', async (req, res) => {
  let tmpDir = null;
  try {
    let pdfBuffer;
    const ct = req.headers['content-type'] || '';
    if (ct.startsWith('multipart/')) {
      await new Promise((resolve, reject) => {
        upload.single('file')(req, res, (err) => err ? reject(err) : resolve());
      });
      if (!req.file) return res.status(400).json({ error: '파일 없음' });
      pdfBuffer = req.file.buffer;
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      pdfBuffer = Buffer.concat(chunks);
      if (!pdfBuffer || pdfBuffer.length === 0) return res.status(400).json({ error: '파일 없음' });
    }
    tmpDir = await mkdtemp(join(tmpdir(), 'pdf-txt-'));
    const pdfPath = join(tmpDir, 'input.pdf');
    const txtPath = join(tmpDir, 'output.txt');
    await writeFile(pdfPath, pdfBuffer);
    await execFileAsync('pdftotext', ['-enc', 'UTF-8', '-layout', pdfPath, txtPath], { timeout: 60000 });
    const text = await readFile(txtPath, 'utf-8').catch(() => '');
    res.json({ text: text.trim() });
  } catch (e) {
    console.error('[pdf-text]', e.message);
    res.status(500).json({ error: e.message });
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

// ── /api/pdf-to-images  PDF → JPEG 이미지 배열 (pdftoppm, Vision용) ─────────────
// PDF beta 없이 Claude Vision에 이미지로 전송하기 위한 엔드포인트
// raw binary (application/pdf) 또는 multipart/form-data 모두 지원
app.post('/api/pdf-to-images', async (req, res) => {
  let tmpDir = null;
  try {
    let pdfBuffer;
    const ct = req.headers['content-type'] || '';
    if (ct.startsWith('multipart/')) {
      // multer로 처리
      await new Promise((resolve, reject) => {
        upload.single('file')(req, res, (err) => err ? reject(err) : resolve());
      });
      if (!req.file) return res.status(400).json({ error: '파일 없음' });
      pdfBuffer = req.file.buffer;
    } else {
      // raw binary body
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      pdfBuffer = Buffer.concat(chunks);
      if (!pdfBuffer || pdfBuffer.length === 0) return res.status(400).json({ error: '파일 없음' });
    }
    const maxPages = Math.min(parseInt(req.query.maxPages || '8', 10), 20);

    tmpDir = await mkdtemp(join(tmpdir(), 'pdf-img-'));
    const pdfPath = join(tmpDir, 'input.pdf');
    await writeFile(pdfPath, pdfBuffer);

    // 페이지 수 확인
    let totalPages = 1;
    try {
      const info = await execFileAsync('pdfinfo', [pdfPath], { timeout: 10000 });
      const m = info.stdout.match(/Pages:\s*(\d+)/);
      if (m) totalPages = parseInt(m[1], 10);
    } catch (e) {
      console.error('[pdf-to-images] pdfinfo 실패:', e.message);
    }

    const pagesToConvert = Math.min(totalPages, maxPages);
    const imgPrefix = join(tmpDir, 'page');

    console.log(`[pdf-to-images] PDF ${totalPages}p → ${pagesToConvert}p 변환 시작`);

    // pdftoppm: PDF 페이지 → JPEG (150dpi, 첫 pagesToConvert 페이지)
    await execFileAsync('pdftoppm', [
      '-jpeg', '-r', '150',
      '-l', String(pagesToConvert),
      pdfPath, imgPrefix
    ], { timeout: 90000 });

    // readdir로 실제 생성된 파일 목록 확인 (파일명 포맷 의존 제거)
    const allFiles = await readdir(tmpDir);
    const imgFiles = allFiles
      .filter(f => f.startsWith('page') && f.endsWith('.jpg'))
      .sort();

    console.log(`[pdf-to-images] 생성된 이미지: ${imgFiles.join(', ')}`);

    const images = [];
    for (const imgFile of imgFiles.slice(0, pagesToConvert)) {
      const imgData = await readFile(join(tmpDir, imgFile));
      images.push(imgData.toString('base64'));
    }

    console.log(`[pdf-to-images] 완료: ${images.length}장`);
    res.json({ images, pageCount: totalPages });
  } catch (e) {
    console.error('[pdf-to-images] 오류:', e.message, e.stack?.split('\n')[1]);
    res.status(500).json({ error: e.message });
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

// ── /api/ocr  이미지·PDF → 텍스트 (PaddleOCR, 포트 3101) ──────────────────────
app.post('/api/ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '파일 없음' });

    const OCR_PORT = process.env.OCR_PORT || '3101';
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }),
                req.file.originalname || 'file.jpg');

    const ocrRes = await fetch(`http://localhost:${OCR_PORT}/ocr`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60000)
    });

    if (!ocrRes.ok) {
      const err = await ocrRes.json().catch(() => ({}));
      throw new Error(err.error || `OCR 서버 오류 ${ocrRes.status}`);
    }

    res.json(await ocrRes.json());
  } catch (e) {
    // PaddleOCR 서버 미실행 시 명확한 안내
    if (e.cause?.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'OCR 서버 오프라인 — Oracle Cloud에서 paddle_server.py 실행 필요'
      });
    }
    console.error('[ocr]', e.message);
    res.status(500).json({ error: e.message });
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

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });

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
      viewport: { width: 1280, height: 1400 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      acceptDownloads: true,
      locale: 'ko-KR'
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // ── 전역 팝업/신규탭 감지 (context 레벨) ───────────────────────────────────────────
    // 모든 Methods 실행 중 열리는 팝업에 즉시 응답 리스너 부착 → 등기 데이터 URL 파악
    let _globalRegData = null;
    const _regLooseRe = /표제부|갑구|을구|소유권이전|순위번호|등기원인|근저당/;
    context.on('page', (newPage) => {
      console.log('[iros] CTX 새 페이지 오픈:', newPage.url());
      newPage.on('request', (req) => {
        const _u = req.url();
        if (!_u.includes('iros.go.kr') && !_u.includes('go.kr')) return;
        if (/\.(js|css|png|jpg|gif|ico|woff|ttf|map)(\?|$)/i.test(_u)) return;
        console.log('[iros] CTX팝업REQ:', req.method(), _u.slice(-120), req.postData() ? ('|body:' + (req.postData()||'').slice(0,200)) : '');
      });
      newPage.on('response', async (resp) => {
        if (_globalRegData) return;
        try {
          const _u = resp.url();
          if (!_u.includes('iros.go.kr') && !_u.includes('go.kr')) return;
          if (/\.(js|css|png|jpg|gif|ico|woff|ttf|map)(\?|$)/i.test(_u)) return;
          const _ct = resp.headers()['content-type'] || '';
          const _b = await resp.text().catch(() => '');
          if (_b.length > 50) {
            const _hasReg = _regLooseRe.test(_b);
            console.log('[iros] CTX팝업응답:', resp.status(), _ct.split(';')[0], _u.slice(-80), 'len=', _b.length, 'reg=', _hasReg, 'prev=', _b.slice(0, 200));
            if (_hasReg) {
              _globalRegData = JSON.stringify({ source: 'global_popup', url: _u, ct: _ct, body: _b.slice(0, 80000) });
              console.log('[iros] 전역 팝업 등기 캡처! URL=', _u);
            }
          }
        } catch(_) {}
      });
    });

    // XHR 모니터링 + 헤드리스 탐지 우회 — context 전체 적용 (팝업·iframe·Method U 신규 탭 포함)
    await context.addInitScript(() => {
      // 헤드리스 탐지 우회 (신규 탭에도 적용)
      try { Object.defineProperty(navigator, 'webdriver', { get: () => false }); } catch(_) {}
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

      if (window._irosXhrHooked) return;
      window._irosXhrHooked = true;
      window._irosXhrLog = [];
      window._irosXhrRegData = null;
      const _origOpen = XMLHttpRequest.prototype.open;
      const _origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(m, u) {
        this._iu = String(u || '');
        return _origOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function(body) {
        const _self = this;
        if (_self._iu && (_self._iu.includes('iros') || _self._iu.includes('.go.kr'))) {
          _self.addEventListener('loadend', function() {
            try {
              const _rt = _self.responseText || '';
              const _hasReg = /표제부|갑구|을구|소유권이전|순위번호|등기원인|근저당/.test(_rt);
              const entry = { url: _self._iu, st: _self.status, len: _rt.length, prev: _rt.slice(0, 400), reg: _hasReg };
              (window._irosXhrLog = window._irosXhrLog || []).push(entry);
              if (_hasReg && !window._irosXhrRegData) {
                window._irosXhrRegData = { url: _self._iu, body: _rt.slice(0, 80000) };
              }
            } catch(e2) {}
          });
        }
        return _origSend.apply(this, arguments);
      };
      // fetch() 후킹 (WebSquare4가 XHR 대신 fetch 사용할 경우 캡처)
      if (typeof window.fetch === 'function' && !window._irosFetchHooked) {
        window._irosFetchHooked = true;
        const _origFetch = window.fetch;
        window.fetch = async function(resource, init) {
          const _fUrl = String(typeof resource === 'string' ? resource : (resource && resource.url) || '');
          const _resp = await _origFetch.apply(this, arguments);
          if (_fUrl.includes('iros') || _fUrl.includes('.go.kr')) {
            try {
              const _clone = _resp.clone();
              const _text = await _clone.text().catch(() => '');
              const _hasReg = /표제부|갑구|을구|소유권이전|순위번호|등기원인|근저당/.test(_text);
              (window._irosXhrLog = window._irosXhrLog || []).push({ url: _fUrl, type: 'fetch', st: _resp.status, len: _text.length, prev: _text.slice(0, 400), reg: _hasReg });
              if (_hasReg && !window._irosXhrRegData) {
                window._irosXhrRegData = { url: _fUrl, body: _text.slice(0, 80000) };
              }
            } catch(_fe) {}
          }
          return _resp;
        };
      }
    });

    // 네트워크 요청 인터셉트 — IROS 검색 API 요청 로깅 (주소가 실제로 전달되는지 확인)
    page.on('request', req => {
      const url = req.url();
      if (url.includes('iros.go.kr') && (req.method() === 'POST' || url.includes('srch') || url.includes('search') || url.includes('Renf'))) {
        const body = req.postData() || '';
        console.log('[iros-net]', req.method(), url.slice(-80), '|', body.slice(0, 200));
      }
    });

    // ── 방법S: 응답 인터셉트로 PIN 캡처 ─────────────────────────────────────────────
    // IROS 백엔드 AJAX 응답에 PIN(\d{4}-\d{4}-\d{6})이 포함됨.
    // WebSquare 프론트엔드는 headless 탐지하지만 백엔드 JSON 응답은 그대로 내려옴.
    let capturedPin = null;
    page.on('response', async resp => {
      if (capturedPin) return;
      try {
        const rUrl = resp.url();
        if (!rUrl.includes('iros.go.kr')) return;
        // JS/CSS/XML 정적 파일에서 오캡처 방지 (Pm10P0SmplhlpMain.xml 등 도움말 XML 제외)
        if (/\.(xml|xsd|js|css|png|jpg|gif|ico|woff|ttf|eot|svg)(\?|$)/i.test(rUrl)) return;
        const ct = resp.headers()['content-type'] || '';
        if (!ct.includes('json') && !rUrl.includes('srch') && !rUrl.includes('Renf') && !rUrl.includes('Smpl') && !rUrl.includes('smpl') && !rUrl.includes('retrieve') && !rUrl.includes('SrchList')) return;
        const body = await resp.text().catch(() => '');
        const pins = body.match(/\d{4}-\d{4}-\d{6}/g) || [];
        // 40008000xxxxxx 패턴은 JS 상수이므로 제외
        const validPins = pins.filter(p => !p.startsWith('4000-8000'));
        if (validPins.length > 0) {
          capturedPin = validPins[0].replace(/-/g, '');
          console.log('[iros] 방법S: 응답에서 PIN 캡처:', capturedPin, rUrl.slice(-80));
        }
      } catch(_) {}
    });

    // ── 방법S3-뷰어: callMpPrtIframe / retrieveXmlDataList 응답 캡처 ──────────────────
    let _viewerAjaxContent = null;
    const _vrRe = /표제부|갑구|을구|소유권이전|순위번호|등기원인|등기목적|권리자|의무자/;
    page.on('response', async resp => {
      if (_viewerAjaxContent) return;
      try {
        const _u = resp.url();
        if (!_u.includes('iros.go.kr')) return;
        if (/\.(xml|xsd|js|css|png|jpg|gif|ico|woff|woff2|ttf|eot|svg|txt)(\?|$)/i.test(_u)) return;
        if (!_u.includes('.do')) return; // 레이아웃 XML·정적 파일 제외, API 엔드포인트만
        if (_u.includes('callMpPrtIframe') || _u.includes('retrieveXmlDataList') || _u.includes('MpPrt') || _u.includes('SmplRlrg')) {
          const _b = await resp.text().catch(() => '');
          if (_b.length > 100) {
            console.log('[iros] 뷰어응답:', resp.status(), _u.slice(-80), 'len=', _b.length, '앞300=', _b.slice(0, 300));
            if (_vrRe.test(_b)) {
              _viewerAjaxContent = _b;
              console.log('[iros] 뷰어 등기 AJAX 캡처! URL=', _u);
            }
          }
        }
      } catch (_) {}
    });

    // 1단계: index.jsp SPA shell 진입 (networkidle 대신 load 사용 — 속도 우선)
    console.log('[iros] index.jsp 로드');
    await page.goto('https://www.iros.go.kr/index.jsp', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    console.log('[iros] 진입 URL:', page.url());

    // 2단계: 로그인 처리 — IROS는 2024년부터 공동인증서/금융인증서 전용으로 전환.
    // ID/PW 로그인 엔드포인트 전부 제거됨. Playwright 자동화 불가.
    throw new Error(
      'IROS 자동 조회 불가 — 인터넷등기소가 공동인증서·금융인증서 전용으로 전환하여 ' +
      'ID/PW 로그인이 제거됐습니다. 대안: (1) Tilko API + 고유번호 직접 입력, ' +
      '(2) 인터넷등기소 직접 접속(www.iros.go.kr).'
    );

    // ── (로그인 코드 제거됨: IROS 공인인증서 전용 전환으로 자동화 불가) ──
      // ── 방법 1: IROS 홈 → 로그인 버튼 찾아 클릭 ──
      try {
        await page.goto('https://www.iros.go.kr', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/home/opc/iros-debug/iros-home.png', fullPage: false }).catch(() => {});

        // 홈 페이지 구조 덤프
        const _homeDump = await page.evaluate(() => {
          const links = [...document.querySelectorAll('a, button, span, li')]
            .filter(el => /로그인|login|mypage|마이페이지/i.test(el.textContent + (el.getAttribute('href') || '') + (el.getAttribute('onclick') || '')))
            .slice(0, 20)
            .map(el => ({ tag: el.tagName, id: el.id, text: el.textContent.trim().slice(0,30), href: (el.getAttribute('href')||'').slice(0,80), onclick: (el.getAttribute('onclick')||'').slice(0,80) }));
          return { url: location.href, title: document.title, loginLinks: links, bodyLen: document.body.innerHTML.length };
        }).catch(() => ({}));
        console.log('[iros] 홈 덤프:', JSON.stringify(_homeDump).slice(0, 1500));

        // 로그인 링크 클릭 시도
        const _loginLink = page.locator('a, button, span').filter({ hasText: /^로그인$|^Login$/ }).first();
        if (await _loginLink.count() > 0) {
          console.log('[iros] 로그인 버튼 발견 → 클릭');
          await _loginLink.click({ force: true }).catch(() => {});
          await page.waitForTimeout(3000);
          console.log('[iros] 클릭 후 URL:', page.url());
          await page.screenshot({ path: '/home/opc/iros-debug/after-login-click.png', fullPage: false }).catch(() => {});
        }
      } catch (e) { console.log('[iros] 홈 접근 오류:', e.message); }

      // 로그인 페이지에서 입력 필드 탐색
      const _loginPageDump = await page.evaluate(() => {
        const inputs = [...document.querySelectorAll('input')].map(el => ({
          id: el.id, name: el.name, type: el.type, placeholder: el.placeholder, value: el.value.slice(0,10)
        }));
        const forms = [...document.querySelectorAll('form')].map(f => ({
          id: f.id, name: f.name, action: f.action, method: f.method
        }));
        const allLinks = [...document.querySelectorAll('a, button')].filter(el => /로그인|login/i.test(el.textContent + (el.getAttribute('href')||''))).slice(0, 10).map(el => ({
          tag: el.tagName, text: el.textContent.trim().slice(0,30), href: (el.getAttribute('href')||'').slice(0,80), onclick: (el.getAttribute('onclick')||'').slice(0,80)
        }));
        return { url: location.href, title: document.title, inputs, forms, loginLinks: allLinks, bodySnip: document.body.innerHTML.slice(0, 1000) };
      }).catch(() => ({}));
      console.log('[iros] 로그인 페이지 덤프:', JSON.stringify(_loginPageDump).slice(0, 2000));

      // ── 방법 2: 발견된 폼에 자격증명 주입 ──
      const _currentUrl = page.url();
      const _hasForm = _loginPageDump.forms && _loginPageDump.forms.length > 0;
      const _hasInputs = _loginPageDump.inputs && _loginPageDump.inputs.length >= 2;

      if (_hasForm || _hasInputs) {
        console.log('[iros] 폼/입력 발견 → 자격증명 주입');
        const _fillResult = await page.evaluate(async ({ id, pw }) => {
          const idEl = document.querySelector('input[type="text"][name*="id" i], input[type="text"][id*="id" i], input[type="text"]:not([type="hidden"])');
          const pwEl = document.querySelector('input[type="password"]');
          if (!idEl || !pwEl) return `no-fields id=${!!idEl} pw=${!!pwEl}`;
          // native setter로 React/Vue 상태 우회
          const nv = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          if (nv && nv.set) { nv.set.call(idEl, id); nv.set.call(pwEl, pw); }
          idEl.value = id; pwEl.value = pw;
          ['input','change'].forEach(ev => { idEl.dispatchEvent(new Event(ev, {bubbles:true})); pwEl.dispatchEvent(new Event(ev, {bubbles:true})); });
          // 제출 버튼 클릭 또는 폼 제출
          const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button.login, button.btn-login');
          if (submitBtn) { submitBtn.click(); return 'submit-click'; }
          const form = document.querySelector('form');
          if (form) { form.submit(); return 'form-submit'; }
          return 'no-submit';
        }, { id: irosId, pw: irosPw }).catch(e => e.message);
        console.log('[iros] 주입 결과:', _fillResult);
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '/home/opc/iros-debug/after-fill.png', fullPage: false }).catch(() => {});
        _loggedIn = await _checkIrosLogin();
        console.log('[iros] 폼 주입 후 로그인:', _loggedIn, 'URL:', page.url());
      }

      // ── 방법 3: 알려진 신규 엔드포인트 직접 POST ──
      if (!_loggedIn) {
        console.log('[iros] 직접 POST 시도 (신규 엔드포인트 후보)');
        const _newCandidates = [
          // 2024년 이후 IROS 개편 추정 엔드포인트
          ['https://www.iros.go.kr/pos9/jsf/cmn/login/loginProc.xhtml', { usrId: irosId, userPwd: irosPw, loginType: 'I' }],
          ['https://www.iros.go.kr/pos9/login/loginProc.do',             { usrId: irosId, userPwd: irosPw }],
          ['https://www.iros.go.kr/login/loginProc.do',                  { usrId: irosId, userPwd: irosPw }],
          ['https://www.iros.go.kr/pos9/commonLoginProc.do',             { usrId: irosId, userPwd: irosPw, loginType: 'I' }],
        ];
        for (const [url, params] of _newCandidates) {
          const r = await page.evaluate(async ({ url, params }) => {
            try {
              const body = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
              const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, credentials: 'include', redirect: 'follow' });
              const text = await res.text().catch(() => '');
              return { ok: res.ok, status: res.status, url: res.url, body: text.slice(0, 200) };
            } catch (e) { return { error: e.message }; }
          }, { url, params }).catch(e => ({ error: e.message }));
          console.log('[iros] POST', url.slice(-50), JSON.stringify(r).slice(0, 200));
          _loggedIn = await _checkIrosLogin();
          if (_loggedIn) { console.log('[iros] POST 로그인 성공:', url); break; }
        }
      }

      page.off('request', _loginReqHandler);

      // 캡처된 POST 요청 최종 덤프
      if (_capturedPosts.length > 0) {
        console.log('[iros] 캡처된 POST 요청:', JSON.stringify(_capturedPosts).slice(0, 2000));
      } else {
        console.log('[iros] 캡처된 POST 요청 없음');
      }

      if (!_loggedIn) {
        const _finalUrl = page.url();
        console.error('[iros] 모든 로그인 방법 실패. 진단 정보:', JSON.stringify({ finalUrl: _finalUrl, capturedPosts: _capturedPosts.slice(0,3), loginPageUrl: _loginPageDump.url }));
        throw new Error(`IROS 로그인 실패. ID=${irosId} URL=${_finalUrl}`);
      }

      // 로그인 성공 후 index.jsp로 돌아가 Gauce SPA 컨텍스트 유지
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

    // 하위 블록에서 공유되는 결과 변수 (방법S 포함)
    let rlrgCount = 0;
    let directApiContent = null;

    // ── 방법S: DOM에서 PIN 재시도 후 callMpPrtIframe.do 직접 fetch ─────────────────
    // 응답 인터셉트로 못 잡았으면 DOM 텍스트에서 PIN 추출 시도
    if (!capturedPin) {
      const domPin = await page.evaluate(() => {
        const t = document.body ? document.body.innerText : '';
        const m = t.match(/\d{4}-\d{4}-\d{6}/);
        return m ? m[0].replace(/-/g, '') : '';
      }).catch(() => '');
      if (domPin) { capturedPin = domPin; console.log('[iros] 방법S: DOM PIN:', domPin); }
    }
    // capturedPin 있으면 세션 쿠키로 callMpPrtIframe.do 직접 fetch
    if (capturedPin) {
      try {
        const _sCookies = await context.cookies();
        const _sCookieStr = _sCookies.map(c => `${c.name}=${c.value}`).join('; ');
        const _sUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        const _sRegRe = /표제부|갑구|을구|소유권이전|순위번호|등기원인|등기목적|근저당권/;
        for (const _sGbn of ['1', '2']) {
          const _sUrl = `https://www.iros.go.kr/biz/Pr20ViaMpPrtCtrl/callMpPrtIframe.do?IS_NMBR_LOGIN__=null&rnum=${capturedPin}&rlrgGbn=${_sGbn}&payCl=F&smplKindCls=1`;
          console.log('[iros] 방법S: callMpPrtIframe.do fetch rlrgGbn=' + _sGbn, _sUrl.slice(-80));
          const _sResp = await fetch(_sUrl, {
            headers: { 'Cookie': _sCookieStr, 'User-Agent': _sUa, 'Referer': 'https://www.iros.go.kr/index.jsp', 'Accept': 'text/html,application/xhtml+xml,*/*' },
            redirect: 'follow'
          }).catch(() => null);
          if (!_sResp?.ok) { console.log('[iros] 방법S: HTTP', _sResp?.status); continue; }
          const _sHtml = await _sResp.text().catch(() => '');
          // JS/CSS 제거 후 텍스트에서만 키워드 검증 (JS 변수명 false positive 방지)
          const _sText = _sHtml
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          console.log('[iros] 방법S: 응답 길이=', _sHtml.length, '텍스트 길이=', _sText.length, '등기 키워드=', _sRegRe.test(_sText));
          if (_sRegRe.test(_sText) && _sText.length > 500) {
            directApiContent = JSON.stringify({ type: 'method_s', pin: capturedPin, content: _sText, html: _sHtml.slice(0, 80000) });
            rlrgCount = 999;
            console.log('[iros] 방법S: 성공! 텍스트 길이=', _sText.length);
            break;
          }
        }
      } catch (_sErr) { console.log('[iros] 방법S 오류:', _sErr.message); }
    }

    // ── 방법S2: DOM PIN → Playwright 새탭으로 callMpPrtIframe.do 렌더링 + AJAX 인터셉트 ──
    // callMpPrtIframe.do는 WebSquare SPA 껍데기만 반환. 실제 등기 데이터는 그 후 AJAX 호출로 로드됨.
    // innerText 대신 AJAX 응답(XML/JSON)을 인터셉트해야 실제 데이터를 얻을 수 있음.
    if (rlrgCount === 0) {
      const _s2Pins = await resultPage.evaluate(() => {
        const t = document.body ? document.body.innerText : '';
        const all = (t.match(/\d{4}-\d{4}-\d{6}/g) || []);
        return all.filter((p, i, a) => a.indexOf(p) === i).slice(0, 3);
      }).catch(() => []);
      console.log('[iros] 방법S2: DOM PIN 목록:', JSON.stringify(_s2Pins));
      if (_s2Pins.length > 0) {
        const _s2Re = /표제부|갑구|을구|소유권이전|순위번호|등기원인|근저당권/;
        const _s2ReLoose = /표제부|갑구|을구|소유권|순위번호|등기원인|근저당/;
        for (const _s2Pin of _s2Pins) {
          if (directApiContent) break;
          const _s2PinClean = _s2Pin.replace(/-/g, '');
          for (const _s2Gbn of ['1', '2']) {
            const _s2Url = `https://www.iros.go.kr/biz/Pr20ViaMpPrtCtrl/callMpPrtIframe.do?IS_NMBR_LOGIN__=null&rnum=${_s2PinClean}&rlrgGbn=${_s2Gbn}&payCl=F&smplKindCls=1`;
            console.log('[iros] 방법S2: Playwright 렌더링+AJAX인터셉트 PIN=', _s2Pin, 'gbn=', _s2Gbn);
            const _s2Tab = await context.newPage().catch(() => null);
            if (!_s2Tab) continue;
            let _s2AjaxContent = null;
            // AJAX 응답 인터셉트 — 등기 데이터는 JS가 아닌 별도 AJAX로 로드됨
            const _s2RespHandler = async (resp) => {
              if (_s2AjaxContent) return;
              try {
                const _rUrl = resp.url();
                if (!_rUrl.includes('iros.go.kr')) return;
                // 정적 파일 제외
                if (/\.(js|css|png|jpg|gif|ico|woff|ttf|map)(\?|$)/i.test(_rUrl)) return;
                const _ct = resp.headers()['content-type'] || '';
                // JSON/XML/데이터 응답만 처리
                if (!_ct.includes('json') && !_ct.includes('xml') && !_ct.includes('text/plain') &&
                    !_rUrl.includes('Cont') && !_rUrl.includes('Xml') && !_rUrl.includes('Data') &&
                    !_rUrl.includes('Rlrg') && !_rUrl.includes('rlrg') && !_rUrl.includes('smpl')) return;
                const _body = await resp.text().catch(() => '');
                if (_body.length < 100) return;
                if (_s2ReLoose.test(_body)) {
                  _s2AjaxContent = _body;
                  console.log('[iros] S2 AJAX 등기 응답 캡처! URL=', _rUrl.slice(-80), 'len=', _body.length, 'preview:', _body.slice(0, 200));
                }
              } catch(_) {}
            };
            _s2Tab.on('response', _s2RespHandler);
            try {
              await _s2Tab.goto(_s2Url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
              // WebSquare 초기화 및 AJAX 완료까지 대기 (networkidle 대신 고정 대기)
              await _s2Tab.waitForTimeout(12000);
              // AJAX 인터셉트로 데이터 얻었으면 우선 사용
              if (_s2AjaxContent) {
                directApiContent = JSON.stringify({ type: 'method_s2_ajax', pin: _s2Pin, content: _s2AjaxContent.slice(0, 60000) });
                rlrgCount = 999;
                console.log('[iros] 방법S2 AJAX 성공! PIN=', _s2Pin, 'gbn=', _s2Gbn);
              } else {
                // AJAX 실패 시 innerText에서도 시도 (JS 코드 제외하고 판정)
                let _s2AllText = await _s2Tab.innerText('body').catch(() => '');
                for (const _s2Frm of _s2Tab.frames()) {
                  try {
                    const _ft = await _s2Frm.innerText('body').catch(() => '');
                    if (_ft.length > 50) _s2AllText += '\n' + _ft;
                  } catch(_) {}
                }
                const _s2Html = await _s2Tab.content().catch(() => '');
                // innerText에서 JS 변수명 false positive 방지: 엄격한 키워드 조합 사용
                const _s2HasReg = _s2Re.test(_s2AllText) && _s2AllText.length > 1000;
                console.log('[iros] 방법S2 DOM PIN=', _s2Pin, 'gbn=', _s2Gbn, 'textLen=', _s2AllText.length, 'hasKw=', _s2HasReg);
                if (_s2HasReg) {
                  directApiContent = JSON.stringify({ type: 'method_s2', pin: _s2Pin, content: _s2AllText.slice(0, 50000), html: _s2Html.slice(0, 80000) });
                  rlrgCount = 999;
                  console.log('[iros] 방법S2 DOM 성공! PIN=', _s2Pin, 'gbn=', _s2Gbn, 'textLen=', _s2AllText.length);
                }
              }
            } catch (_s2Err) { console.log('[iros] 방법S2 탭오류:', _s2Err.message); }
            _s2Tab.off('response', _s2RespHandler);
            await _s2Tab.close().catch(() => {});
            if (directApiContent) break;
          }
        }
      }
    }

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

    // ── 네트워크 요청 캡처 (WebSquare AJAX API 역분석) ───────────────────────────
    const _capturedPosts = [];
    const _reqHandler = (req) => {
      const rt = req.resourceType();
      if (['xhr', 'fetch'].includes(rt) || req.url().includes('/pos9/')) {
        _capturedPosts.push({
          url: req.url().replace('https://www.iros.go.kr','').slice(0,200),
          m: req.method(),
          body: (req.postData()||'').slice(0,400),
        });
      }
    };
    resultPage.on('request', _reqHandler);

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

    // 그리드 행에서 부동산고유번호 추출 (직접 URL 이동 폴백용)
    let pinFromRow = await resultRow.evaluate(el => {
      const txt = el.innerText || el.textContent || '';
      const m = txt.match(/(\d{4}-\d{4}-\d{6})/);
      return m ? m[1] : null;
    }).catch(() => null);
    console.log('[iros] 그리드 행 PIN:', pinFromRow);

    // datalist에서 PIN 추출 (WebSquare 그리드는 innerText가 빈 경우 많음)
    if (!pinFromRow) {
      pinFromRow = await resultPage.evaluate(() => {
        try {
          const dltKey = Object.keys(window).find(k => /dlt_smpl_srch_rslt$/.test(k));
          if (dltKey && window[dltKey]) {
            const d = window[dltKey];
            // getRowData 시도
            if (typeof d.getRowData === 'function') {
              const row = d.getRowData(0);
              if (row) {
                const rnumKey = Object.keys(row).find(k => /rnum|uniq|pin/i.test(k));
                if (rnumKey) {
                  const v = String(row[rnumKey]);
                  // 13자리 숫자이면 포맷 변환
                  if (/^\d{13}$/.test(v)) return v.replace(/(\d{4})(\d{4})(\d{6})/, '$1-$2-$3');
                  const m = v.match(/(\d{4}-\d{4}-\d{6})/);
                  if (m) return m[1];
                }
                // 전체 값에서 PIN 패턴 검색
                const txt = JSON.stringify(row);
                const m2 = txt.match(/(\d{4}-?\d{4}-?\d{6})/);
                if (m2) return m2[1].replace(/(\d{4})(\d{4})(\d{6})/, '$1-$2-$3');
              }
            }
            // getAllRowData 시도
            if (typeof d.getAllRowData === 'function') {
              const all = d.getAllRowData();
              if (all && all[0]) {
                const txt = JSON.stringify(all[0]);
                const m = txt.match(/(\d{4}-?\d{4}-?\d{6})/);
                if (m) return m[1].replace(/(\d{4})(\d{4})(\d{6})/, '$1-$2-$3');
              }
            }
          }
          // 페이지 전체 텍스트에서 PIN 패턴 검색
          const all = document.body.innerText || '';
          const m3 = all.match(/(\d{4}-\d{4}-\d{6})/);
          return m3 ? m3[1] : null;
        } catch { return null; }
      }).catch(() => null);
      if (pinFromRow) console.log('[iros] datalist에서 PIN 추출:', pinFromRow);
    }

    // 그리드에서 확인된 실제 PIN으로 capturedPin 덮어쓰기 (도움말 XML 오캡처 수정)
    if (pinFromRow) {
      capturedPin = pinFromRow.replace(/-/g, '');
      console.log('[iros] capturedPin → 그리드 PIN 으로 교정:', capturedPin);
    }

    // Gauce WebSquare API로 행 선택 + UI 이벤트 발생
    // setCheckValue만 호출하면 데이터값만 바뀌고 onCheck 이벤트가 안 발생 → btn_smpl_rlrg 비활성화 유지
    const gridId = 'mf_wfm_potal_main_wfm_content_grd_smpl_srch_rslt';
    const gauceSelect = await resultPage.evaluate((gid) => {
      try {
        if (window.w2 && typeof window.w2.getById === 'function') {
          var g2 = window.w2.getById(gid);
          if (g2) {
            if (typeof g2.setCheckValue === 'function') {
              g2.setCheckValue(0, 'col_chk', 'Y');
              // onCheck 이벤트 강제 발생 (버튼 활성화 트리거)
              if (typeof g2.fireEvent === 'function') {
                try { g2.fireEvent('onCheck', { rowIndex: 0, colId: 'col_chk', value: 'Y' }); } catch(_) {}
              }
              // selectRow도 함께 (일부 버전은 selectRow가 onSelect 발생)
              if (typeof g2.selectRow === 'function') {
                try { g2.selectRow(0); } catch(_) {}
              }
              return 'w2.setCheckValue+fire';
            }
            if (typeof g2.selectRow === 'function') { g2.selectRow(0); return 'w2.selectRow(0)'; }
          }
        }
        if (window.scwin && window.scwin[gid]) {
          var g = window.scwin[gid];
          if (typeof g.setCellValue === 'function') { g.setCellValue(0, 'col_chk', 'Y'); return 'scwin.setCellValue'; }
          if (typeof g.selectRow === 'function') { g.selectRow(0); return 'scwin.selectRow(0)'; }
        }
        return 'w2_api_unavail';
      } catch(e) { return 'err:' + e.message; }
    }, gridId).catch(() => 'catch');
    console.log('[iros] Gauce WebSquare API:', gauceSelect);

    const wsApiOk = /^(w2\.|scwin\.)/.test(gauceSelect);
    let rowPopup = null;

    // WebSquare 그리드 체크박스 셀 실제 마우스 클릭 (WebSquare는 좌표 기반 이벤트 시스템)
    const cellId = `${gridId}_cell_0_0`;

    // 체크박스 셀 좌표 가져오기 (Playwright bounding box 방식)
    const getBbox = async (locOrSel) => {
      try {
        const loc = typeof locOrSel === 'string' ? resultPage.locator(locOrSel).first() : locOrSel;
        return await loc.boundingBox({ timeout: 5000 });
      } catch { return null; }
    };

    // ── 그리드 첫 행 모든 셀 ID·좌표 덤프 (어느 열이 체크박스인지 확인) ──────────────
    const allCellsInfo = await resultPage.evaluate((gid) => {
      const cells = Array.from(document.querySelectorAll(`[id^="${gid}_cell_0_"]`));
      return cells.map(el => ({
        id: el.id,
        txt: (el.textContent||'').trim().slice(0,30),
        cls: (el.className||'').slice(0,60),
        hasInput: !!el.querySelector('input'),
        hasImg: !!el.querySelector('img,svg'),
      }));
    }, gridId).catch(() => []);
    console.log('[iros] 그리드 첫 행 모든 셀:', JSON.stringify(allCellsInfo));

    // ── 페이지 JavaScript 소스에서 smpl_rlrg 참조 함수 추출 ──────────────────────────
    const scriptAnalysis = await resultPage.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent||'').join('\n');
      const found = [];
      // btn_smpl_rlrg 참조 라인 추출
      scripts.split('\n').forEach((line, i) => {
        if (/smpl_rlrg|smplRlrg|간편열람|smpl_view/i.test(line)) {
          found.push({ line: i, txt: line.trim().slice(0,200) });
        }
      });
      return found.slice(0,20);
    }).catch(() => []);
    console.log('[iros] smpl_rlrg 스크립트 참조:', JSON.stringify(scriptAnalysis));

    // ── 방법S3: 그리드 "보기" 셀 직접 클릭 + 네트워크 응답 인터셉트 ───────────────────
    // 체크박스+버튼 우회: "보기" 열(mp_prt) 직접 클릭 → WebSquare가 callMpPrtIframe 팝업 열거나 AJAX 호출
    // AJAX 응답을 인터셉트하거나 팝업 페이지에서 등기 데이터 추출
    if (rlrgCount === 0) {
      console.log('[iros] 방법S3: "보기" 셀 직접 클릭 + 응답 인터셉트');
      try {
        const _s3RegRe = /표제부|갑구|을구|소유권이전|순위번호|등기원인|근저당권/;
        const _s3RegLoose = /표제부|갑구|을구|소유권|순위번호|등기원인|근저당/;
        let _s3AjaxContent = null;

        // 응답 인터셉터 설치 (AJAX 데이터 캡처) — HTML 포함 모든 content-type
        const _s3RespHandler = async (resp) => {
          try {
            const _u = resp.url();
            if (!_u.includes('iros.go.kr')) return;
            if (/\.(js|css|png|jpg|gif|ico|woff|ttf|map)(\?|$)/i.test(_u)) return;
            const _ct = resp.headers()['content-type'] || '';
            const _st = resp.status();
            if (_s3AjaxContent) {
              // 이미 캡처됨 — URL만 로그
              console.log('[iros] S3 네트워크(skip):', _st, _ct.split(';')[0], _u.slice(-100));
              return;
            }
            // content-type 제한 없이 모든 응답 수집 (HTML 포함)
            if (!_ct.includes('json') && !_ct.includes('xml') && !_ct.includes('text/plain') &&
                !_ct.includes('text/html') && !_ct.includes('application')) {
              console.log('[iros] S3 네트워크(pass):', _st, _ct.split(';')[0], _u.slice(-100));
              return;
            }
            const _b = await resp.text().catch(() => '');
            const _hasReg = _s3RegLoose.test(_b);
            // 모든 비정적 IROS URL 로그 (본문 미리보기 포함)
            console.log('[iros] S3 네트워크:', _st, _ct.split(';')[0], _u.slice(-100), 'len=', _b.length, 'reg=', _hasReg, 'prev=', _b.slice(0, 200));
            if (_b.length < 100) return;
            if (_hasReg) {
              _s3AjaxContent = _b;
              console.log('[iros] S3 AJAX 캡처! URL=', _u.slice(-80), 'ct=', _ct.split(';')[0], 'len=', _b.length);
            }
          } catch(_) {}
        };
        resultPage.on('response', _s3RespHandler);

        // 새 팝업 감지 — 즉시 인터셉터 설치 (팝업이 열리는 순간 AJAX 캡처)
        let _s3PopupPage = null;
        let _s3PopAjax = null;
        const _s3PopPageHandler = (newPage) => {
          _s3PopupPage = newPage;
          console.log('[iros] 방법S3 팝업 열림 즉시 인터셉터 설치:', newPage.url());
          newPage.on('response', async (resp) => {
            try {
              const _u = resp.url();
              if (!_u.includes('iros.go.kr') && !_u.includes('go.kr')) return;
              if (/\.(js|css|png|jpg|gif|ico|woff|ttf|map)(\?|$)/i.test(_u)) return;
              const _ct = resp.headers()['content-type'] || '';
              console.log('[iros] S3-팝업 네트워크:', resp.status(), _ct.split(';')[0], _u.slice(-100));
              if (_s3PopAjax) return;
              const _b = await resp.text().catch(() => '');
              if (_b.length > 100 && _s3RegLoose.test(_b)) {
                _s3PopAjax = _b;
                console.log('[iros] S3-팝업 AJAX 캡처! URL=', _u.slice(-80), 'len=', _b.length);
              }
            } catch(_) {}
          });
          newPage.on('request', (req) => {
            const _u = req.url();
            if (!_u.includes('iros.go.kr') && !_u.includes('go.kr')) return;
            if (/\.(js|css|png|jpg|gif|ico|woff|ttf|map)(\?|$)/i.test(_u)) return;
            console.log('[iros] S3-팝업-REQ:', req.method(), _u.slice(-120));
          });
        };
        resultPage.context().on('page', _s3PopPageHandler);

        // ── S3-0: WebSquare4 scwin 직접 함수 호출 (DOM 클릭 전에 먼저 시도) ──────────
        // scwin = WebSquare4 이벤트 핸들러 모음. mp_prt 관련 함수가 있으면 직접 호출
        const _s3ScwinFns = await resultPage.evaluate(() => {
          try {
            const fns = [];
            for (const ns of ['scwin', 'scui', 'w2', 'fn_']) {
              const obj = window[ns] || {};
              const keys = Object.keys(obj).filter(k =>
                /mp_prt|smpl_rlrg|열람|grdSmpl|view|Prt|View|Rlrg/i.test(k)
              );
              keys.forEach(k => fns.push(`${ns}.${k}`));
            }
            // 전역 함수도 탐색
            const globalFns = Object.keys(window).filter(k =>
              typeof window[k] === 'function' && /mp_prt|smpl_rlrg|fn_prt|fnPrt|fnView/i.test(k)
            );
            globalFns.forEach(k => fns.push(`window.${k}`));
            return fns.slice(0, 30);
          } catch(e) { return []; }
        }).catch(() => []);
        console.log('[iros] scwin 뷰어 함수 목록:', JSON.stringify(_s3ScwinFns));

        // 행 선택 먼저 (WebSquare 그리드는 행 선택 후 버튼이 활성화됨)
        await resultPage.evaluate(() => {
          try {
            // WebSquare4 그리드: 첫 번째 행 선택
            for (const wsKey of ['w2', 'scwin', 'wq']) {
              const ws = window[wsKey];
              if (!ws) continue;
              const grids = ws.GridControl ? Object.values(ws.GridControl) : [];
              for (const grid of grids) {
                if (grid && grid.selectRow) { grid.selectRow(0); break; }
                if (grid && grid.setFocusedRow) { grid.setFocusedRow(0); break; }
              }
            }
            // Gauce 그리드 직접 행 선택
            const rows = document.querySelectorAll('tr[data-row_idx]');
            if (rows[0]) rows[0].click();
          } catch(e) {}
        }).catch(() => {});
        await resultPage.waitForTimeout(500);

        // mp_prt 관련 scwin 함수 직접 호출
        if (_s3ScwinFns.length > 0) {
          await resultPage.evaluate((fns) => {
            try {
              for (const fn of fns) {
                const parts = fn.split('.');
                let obj = window;
                for (const p of parts) obj = obj && obj[p];
                if (typeof obj === 'function') {
                  console.log('[ws] 호출:', fn);
                  obj(0, 'mp_prt');
                  break;
                }
              }
            } catch(e) { console.log('[ws] 함수 호출 오류:', e.message); }
          }, _s3ScwinFns).catch(() => {});
          await resultPage.waitForTimeout(2000);
        }

        // 방법S3-A: td[data-col_id="mp_prt"] — "보기" 열 TD 직접 클릭
        const _s3ViewTds = await resultPage.locator('td[data-col_id="mp_prt"]').all().catch(() => []);
        console.log('[iros] 방법S3: mp_prt TD 개수=', _s3ViewTds.length);
        if (_s3ViewTds.length > 0) {
          await _s3ViewTds[0].click({ force: true, timeout: 5000 }).catch(async () => {
            // click 실패 시 JS dispatchEvent 사용
            await resultPage.evaluate(() => {
              const td = document.querySelector('td[data-col_id="mp_prt"]');
              if (td) ['mousedown','mouseup','click'].forEach(t =>
                td.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
              );
            }).catch(() => {});
          });
          console.log('[iros] 방법S3-A: mp_prt 클릭 완료');
        } else {
          // 방법S3-B: "보기" 텍스트 버튼/셀 클릭
          const _s3BogiList = await resultPage.locator(':text-is("보기")').all().catch(() => []);
          console.log('[iros] 방법S3: "보기" 텍스트 개수=', _s3BogiList.length);
          if (_s3BogiList.length > 0) {
            await _s3BogiList[0].click({ force: true, timeout: 5000 }).catch(() => {});
            console.log('[iros] 방법S3-B: "보기" 클릭 완료');
          }
          // 방법S3-C: 링크 텍스트 "열람" 클릭
          if (_s3BogiList.length === 0) {
            const _s3YeolList = await resultPage.locator('a:text("열람"), button:text("열람"), span:text("열람")').all().catch(() => []);
            console.log('[iros] 방법S3: "열람" 텍스트 개수=', _s3YeolList.length);
            if (_s3YeolList.length > 0) {
              await _s3YeolList[0].click({ force: true, timeout: 5000 }).catch(() => {});
              console.log('[iros] 방법S3-C: "열람" 클릭 완료');
            }
          }
        }
        // 클릭 직후 스크린샷 (클릭 효과 확인)
        await resultPage.waitForTimeout(3000);
        await resultPage.screenshot({ path: '/home/opc/iros-debug/step4-s3-after-click.png', fullPage: false }).catch(() => {});

        // 클릭 후 전체 네트워크 요청 로그 (디버그 — 등기 데이터 URL 파악)
        const _s3ReqLogger = (req) => {
          const _u = req.url();
          if (!_u.includes('iros.go.kr') && !_u.includes('go.kr')) return;
          if (/\.(js|css|png|jpg|gif|ico|woff|ttf|map)(\?|$)/i.test(_u)) return;
          console.log('[iros] S3-REQ:', req.method(), _u.slice(-120));
        };
        resultPage.on('request', _s3ReqLogger);

        // AJAX 응답 또는 팝업 대기 (30초 — IROS SPA + iframe 로딩)
        await resultPage.waitForTimeout(30000);
        resultPage.off('request', _s3ReqLogger);
        resultPage.off('response', _s3RespHandler);
        resultPage.context().off('page', _s3PopPageHandler);

        // 팝업이 열렸으면 추가 대기 후 내용 확인
        if (_s3PopupPage && !_s3PopAjax) {
          console.log('[iros] 방법S3 팝업 추가 대기 10초...');
          await _s3PopupPage.waitForTimeout(10000).catch(() => {});
        }

        // AJAX 응답에서 데이터 얻었으면 성공
        if (_s3AjaxContent && _s3RegLoose.test(_s3AjaxContent)) {
          directApiContent = JSON.stringify({ type: 'method_s3_ajax', content: _s3AjaxContent.slice(0, 60000) });
          rlrgCount = 999;
          console.log('[iros] 방법S3 AJAX 성공! len=', _s3AjaxContent.length);
        }

        // 전역 팝업 캡처 확인 (context.on('page') 로 잡은 데이터)
        if (!directApiContent && _globalRegData) {
          directApiContent = _globalRegData;
          rlrgCount = 999;
          console.log('[iros] 전역 팝업에서 등기 데이터 사용!');
        }

        // XHR 로그 확인 (팝업 내 WebSquare4 XHR — addInitScript 훅)
        if (!directApiContent) {
          const _xhrLog = await resultPage.evaluate(() => window._irosXhrLog || []).catch(() => []);
          const _xhrRegData = await resultPage.evaluate(() => window._irosXhrRegData || null).catch(() => null);
          console.log('[iros] XHR 로그 count=', _xhrLog.length);
          for (const _xe of _xhrLog.slice(0, 30)) {
            console.log('[iros] XHR:', (_xe.url||'').slice(-80), 'st=', _xe.st, 'len=', _xe.len, 'reg=', _xe.reg, 'prev=', (_xe.prev||'').slice(0, 200));
          }
          if (_xhrRegData) {
            directApiContent = JSON.stringify({ type: 'method_s3_xhr', url: _xhrRegData.url, content: _xhrRegData.body });
            rlrgCount = 999;
            console.log('[iros] XHR 훅에서 등기 데이터 성공!');
          }
        }

        // WebSquare4 DataList 덤프 (modal/overlay로 이미 로드된 데이터 확인)
        if (!directApiContent) {
          const _wsData = await resultPage.evaluate(() => {
            try {
              const out = {};
              for (const wsKey of ['w2', 'websquare', 'WebSquare', 'scwin', 'wq', 'w2SPA']) {
                const ws = window[wsKey];
                if (!ws) continue;
                const dlMap = ws.DataList || ws.dataList || {};
                for (const [name, dl] of Object.entries(dlMap)) {
                  try {
                    const rc = dl.getRowCount ? dl.getRowCount() : 0;
                    if (rc > 0) {
                      out[name] = { rc, rows: [] };
                      for (let i = 0; i < Math.min(rc, 50); i++) {
                        out[name].rows.push(dl.getRow ? dl.getRow(i) : {});
                      }
                    }
                  } catch(_e2) {}
                }
              }
              return out;
            } catch(e) { return { error: e.message }; }
          }).catch(() => ({}));
          const _wsStr = JSON.stringify(_wsData);
          console.log('[iros] WebSquare DataList 덤프 len=', _wsStr.length, '앞800=', _wsStr.slice(0, 800));
          if (/표제부|갑구|을구|소유권이전|순위번호/.test(_wsStr)) {
            directApiContent = JSON.stringify({ type: 'method_s3_datalist', data: _wsData });
            rlrgCount = 999;
            console.log('[iros] WebSquare DataList 등기 데이터 성공!');
          }
        }

        // 전체 DOM 텍스트 스캔 (보기 후 modal overlay로 직접 렌더링됐을 경우)
        if (!directApiContent) {
          const _domText = await resultPage.innerText('body').catch(() => '');
          const _domReg = _s3RegRe.test(_domText);
          console.log('[iros] 보기 후 DOM len=', _domText.length, 'reg=', _domReg, '앞500=', _domText.slice(0, 500));
          if (_domReg && _domText.length > 500) {
            directApiContent = JSON.stringify({ type: 'method_s3_dom', content: _domText.slice(0, 80000) });
            rlrgCount = 999;
            console.log('[iros] DOM 렌더링 등기 데이터 성공!');
          }
          // 스크린샷 추가 (30초 후 화면 상태)
          await resultPage.screenshot({ path: '/home/opc/iros-debug/step5-s3-post30s.png', fullPage: false }).catch(() => {});
        }

        // 팝업 캡처 시도
        if (!directApiContent) {
          const _s3Popup = _s3PopupPage;
          if (_s3Popup) {
            console.log('[iros] 방법S3 팝업 내용 확인:', _s3Popup.url());
            const _s3PopText = await _s3Popup.innerText('body').catch(() => '');
            const _s3PopHtml = await _s3Popup.content().catch(() => '');
            if (_s3PopAjax && _s3RegLoose.test(_s3PopAjax)) {
              directApiContent = JSON.stringify({ type: 'method_s3_popup_ajax', url: _s3Popup.url(), content: _s3PopAjax.slice(0, 60000) });
              rlrgCount = 999;
              console.log('[iros] 방법S3 팝업 AJAX 성공!');
            } else if (_s3RegRe.test(_s3PopText) && _s3PopText.length > 500) {
              directApiContent = JSON.stringify({ type: 'method_s3_popup', url: _s3Popup.url(), content: _s3PopText.slice(0, 50000), html: _s3PopHtml.slice(0, 80000) });
              rlrgCount = 999;
              console.log('[iros] 방법S3 팝업 DOM 성공! len=', _s3PopText.length);
            } else {
              // 팝업 스크린샷 저장 (OCR 폴백용)
              console.log('[iros] 방법S3 팝업 등기 없음. textLen=', _s3PopText.length, '앞300=', _s3PopText.slice(0, 300));
              await _s3Popup.screenshot({ path: '/home/opc/iros-debug/step6-popup.png', fullPage: true }).catch(() => {});
            }
            await _s3Popup.close().catch(() => {});
          } else {
            console.log('[iros] 방법S3 팝업 없음 — iframe 또는 SPA 내 렌더링 방식일 수 있음');
          }
        }

        // ── PaddleOCR 폴백: 팝업/화면 스크린샷 → OCR 텍스트 추출 ──────────────────────
        // callMpPrtIframe.do 결과가 이미지/PDF 렌더링일 경우 OCR로 텍스트 추출
        if (!directApiContent) {
          try {
            const _ocrPort = 3101; // Oracle VM PaddleOCR 서버 포트
            const _ocrPages = [resultPage, _s3PopupPage].filter(Boolean);
            for (const _ocrPage of _ocrPages) {
              if (directApiContent) break;
              // 각 페이지 전체 스크린샷 (이미지 캡처)
              const _ocrImgPath = `/home/opc/iros-debug/step6-ocr-${Date.now()}.png`;
              await _ocrPage.screenshot({ path: _ocrImgPath, fullPage: true }).catch(() => {});
              console.log('[iros] OCR 스크린샷:', _ocrImgPath);
              // PaddleOCR 서버 호출
              const _ocrFormData = new FormData();
              const { readFileSync } = await import('fs');
              const _imgBuf = readFileSync(_ocrImgPath);
              const _imgBlob = new Blob([_imgBuf], { type: 'image/png' });
              _ocrFormData.append('file', _imgBlob, 'screen.png');
              const _ocrResp = await fetch(`http://localhost:${_ocrPort}/ocr`, {
                method: 'POST', body: _ocrFormData, signal: AbortSignal.timeout(30000)
              }).catch(() => null);
              if (!_ocrResp?.ok) { console.log('[iros] OCR 서버 오류:', _ocrResp?.status); continue; }
              const _ocrJson = await _ocrResp.json().catch(() => null);
              const _ocrText = Array.isArray(_ocrJson?.results)
                ? _ocrJson.results.map(r => Array.isArray(r) ? r.map(x => x[1]?.[0] || '').join(' ') : '').join('\n')
                : (typeof _ocrJson?.text === 'string' ? _ocrJson.text : '');
              console.log('[iros] OCR 결과 len=', _ocrText.length, 'reg=', _s3RegRe.test(_ocrText), '앞300=', _ocrText.slice(0, 300));
              if (_s3RegLoose.test(_ocrText) && _ocrText.length > 100) {
                directApiContent = JSON.stringify({ type: 'method_s3_ocr', content: _ocrText.slice(0, 80000) });
                rlrgCount = 999;
                console.log('[iros] PaddleOCR 폴백 성공!');
              }
            }
          } catch (_ocrErr) { console.log('[iros] OCR 폴백 오류:', _ocrErr.message); }
        }

        // 방법S3 실패 시 현재 페이지 iframe 확인 (callMpPrtIframe이 iframe으로 로드됐을 경우)
        if (!directApiContent) {
          const _s3Frames = resultPage.frames();
          console.log('[iros] 방법S3 iframe 목록 총', _s3Frames.length, '개');
          for (const _s3F of _s3Frames) {
            if (_s3F === resultPage.mainFrame()) continue;
            try {
              await _s3F.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
              const _fUrl = _s3F.url();
              const _fText = await _s3F.innerText('body').catch(() => '');
              const _fHtml = await _s3F.content().catch(() => '');
              console.log('[iros] S3-iframe url=', _fUrl.slice(-80), 'textLen=', _fText.length, 'htmlLen=', _fHtml.length, 'preview=', _fText.slice(0, 150));
              if (_fText.length > 200 && _s3RegRe.test(_fText)) {
                directApiContent = JSON.stringify({ type: 'method_s3_iframe', url: _fUrl, content: _fText.slice(0, 50000), html: _fHtml.slice(0, 80000) });
                rlrgCount = 999;
                console.log('[iros] 방법S3 iframe 성공! url=', _fUrl, 'len=', _fText.length);
                break;
              }
            } catch(_e) { console.log('[iros] S3-iframe 오류:', _e.message); }
          }
        }
      } catch (_s3Err) { console.log('[iros] 방법S3 오류:', _s3Err.message); }
    }

    // ── 1차: 모든 셀 순서대로 클릭해서 btn_smpl_rlrg 활성화 시도 ────────────────────
    // (rlrgCount는 방법S 블록 앞에서 이미 선언됨)
    // Gauce 그리드에서 col 0 = 행번호, col 1 = 체크박스인 경우가 많음 → col 0~4 순서대로 시도
    const cellCols = [0, 1, 2, 3, 4];
    for (const col of cellCols) {
      const cid = `${gridId}_cell_0_${col}`;
      const cellLoc = resultPage.locator(`#${cid}, [id="${cid}"]`).first();
      // 셀이 뷰포트 밖이면 먼저 스크롤 (WebSquare는 좌표가 뷰포트 안에 있어야 이벤트 처리됨)
      await resultPage.evaluate((id) => {
        const el = document.getElementById(id) || document.querySelector(`[id="${id}"]`);
        if (el) el.scrollIntoView({ block: 'center', inline: 'nearest' });
      }, cid).catch(() => {});
      await resultPage.waitForTimeout(300);
      const cellBbox = await getBbox(cellLoc);
      if (cellBbox) {
        const cx = cellBbox.x + cellBbox.width / 2;
        const cy = cellBbox.y + cellBbox.height / 2;
        console.log(`[iros] 셀 클릭 col=${col} id=${cid} x=${Math.round(cx)} y=${Math.round(cy)}`);
        await resultPage.mouse.click(cx, cy);
        await resultPage.waitForTimeout(2000);
        rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
        console.log(`[iros] col=${col} 클릭 후 btn_smpl_rlrg:`, rlrgCount);
        if (rlrgCount > 0) break;
      } else {
        console.log(`[iros] 셀 col=${col} bbox 없음`);
      }
    }

    // 1차 실패 시 첫 행 전체 bbox로 폴백
    if (rlrgCount === 0) {
      const rowBbox = await getBbox(resultRow);
      if (rowBbox) {
        // 행의 좌측 1/5 지점 (체크박스 위치 추정)
        const cx = rowBbox.x + rowBbox.width * 0.1;
        const cy = rowBbox.y + rowBbox.height / 2;
        console.log('[iros] 행 좌측 클릭:', Math.round(cx), Math.round(cy));
        await resultPage.mouse.click(cx, cy);
        await resultPage.waitForTimeout(2000);
        rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
        console.log('[iros] 행 좌측 클릭 후 btn_smpl_rlrg:', rlrgCount);
      }
    }

    if (rlrgCount === 0) {
      // 2차: 체크박스 input 직접 클릭 (fallback)
      console.log('[iros] btn_smpl_rlrg 미출현 — input checkbox 직접 클릭');
      const chkLoc = resultPage.locator(`#${cellId} input[type="checkbox"], [id="${cellId}"] input`).first();
      const chkBbox = await getBbox(chkLoc);
      if (chkBbox) {
        await resultPage.mouse.click(chkBbox.x + chkBbox.width / 2, chkBbox.y + chkBbox.height / 2);
      } else {
        await resultRow.locator('input[type="checkbox"]').first().click({ force: true, timeout: 5000 }).catch(() => {});
      }
      await resultPage.waitForTimeout(2000);
      rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
      console.log('[iros] 2차 후 btn_smpl_rlrg 출현:', rlrgCount);
    }

    // 3차 WebSquare API 재시도
    if (rlrgCount === 0) {
      const ws2 = await resultPage.evaluate((gid) => {
        try {
          if (window.w2 && typeof window.w2.getById === 'function') {
            const g = window.w2.getById(gid);
            if (g && typeof g.setCheckValue === 'function') { g.setCheckValue(0, 'col_chk', 'Y'); return 'w2.retry'; }
          }
        } catch(e) { return 'err:' + e.message; }
        return 'unavail';
      }, gridId).catch(() => 'catch');
      console.log('[iros] 3차 WebSquare API:', ws2);
      await resultPage.waitForTimeout(2000);
      rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
      console.log('[iros] 3차 후 btn_smpl_rlrg 출현:', rlrgCount);
    }

    // ── 직접 URL 이동 시도 (PIN 기반, WebSquare 체크박스 우회) ─────────────────────
    // btn_smpl_rlrg가 끝내 나타나지 않으면 부동산고유번호로 직접 뷰 페이지 이동
    let directRegistryResult = null;
    if (rlrgCount === 0 && pinFromRow) {
      const pinClean = pinFromRow.replace(/-/g, '');
      console.log('[iros] btn_smpl_rlrg 미출현 → PIN 직접 URL 시도:', pinClean);
      const directUrls = [
        `https://www.iros.go.kr/pos9/jsf/renf/selectRenf0200View.xhtml?selGbn=UNI&rnum=${pinClean}`,
        `https://www.iros.go.kr/pos9/jsf/renf/selectRenf0200View.xhtml?rnum=${pinClean}`,
        `https://www.iros.go.kr/pos9/PGetRenf0100.do?rnum=${pinClean}`,
      ];
      for (const dUrl of directUrls) {
        const dPage = await context.newPage().catch(() => null);
        if (!dPage) break;
        try {
          await dPage.goto(dUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await dPage.waitForTimeout(3000);
          const dTxt = await dPage.evaluate(() => document.body?.innerText || '').catch(() => '');
          const dHtml = await dPage.evaluate(() => document.body?.innerHTML || '').catch(() => '');
          await dPage.screenshot({ path: '/home/opc/iros-debug/step6-direct-url.png', fullPage: true }).catch(() => {});
          if (/표제부|갑구|을구|소유권|순위번호|접수|등기원인|등기목적|근저당|채권최고액|채무자|저당권|전세권/.test(dTxt)) {
            console.log('[iros] 직접 URL 성공! 등기부 검출:', dUrl);
            directRegistryResult = { text: dTxt, html: dHtml.slice(0, 80000) };
            await dPage.close().catch(() => {});
            break;
          }
          console.log('[iros] 직접 URL 등기부 없음:', dUrl, '|', dTxt.slice(0, 150));
        } catch (e) {
          console.log('[iros] 직접 URL 오류:', dUrl, e.message);
        }
        await dPage.close().catch(() => {});
      }
      if (directRegistryResult) {
        console.log('[iros] 직접 URL 경로로 등기부 추출 성공 — 즉시 응답');
        res.json({ ok: true, registryText: directRegistryResult.text, registryHtml: directRegistryResult.html, address });
        return;
      }
      // 직접 URL도 실패하면 smpl 전역 함수 직접 호출 시도
      const smplFnResult = await resultPage.evaluate(() => {
        try {
          if (typeof fn_smplRlrg === 'function') { fn_smplRlrg(); return 'fn_smplRlrg'; }
          if (typeof scwin !== 'undefined' && typeof scwin.fn_smplRlrg === 'function') { scwin.fn_smplRlrg(); return 'scwin.fn_smplRlrg'; }
          if (typeof fn_rlrg === 'function') { fn_rlrg(); return 'fn_rlrg'; }
          const fns = Object.keys(window).filter(k => typeof window[k] === 'function' && /smpl|rlrg/i.test(k));
          return fns.length ? 'found_but_not_called:' + fns.join(',') : 'no_smpl_fn';
        } catch(e) { return 'err:' + e.message; }
      }).catch(() => 'catch');
      console.log('[iros] smpl 전역 함수 호출:', smplFnResult);
      await resultPage.waitForTimeout(2000);
      rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
      console.log('[iros] smpl 함수 호출 후 btn_smpl_rlrg 출현:', rlrgCount);
    }

    // ── 네트워크 캡처 로그 분석 → IROS XHR API 직접 호출 ─────────────────────────────
    if (rlrgCount === 0) {
      await resultPage.waitForTimeout(1000);
      const capLog = _capturedPosts.slice(-20);
      console.log('[iros] 캡처된 네트워크 요청:', JSON.stringify(capLog));

      // 캡처된 요청 중 XHR/fetch 패턴에서 등기부 조회 API 찾기
      const rlrgReqs = capLog.filter(r => /rlrg|renf|smpl|view|inqr|info/i.test(r.url) && r.m === 'POST');
      if (rlrgReqs.length) {
        console.log('[iros] 등기부 관련 XHR 발견:', JSON.stringify(rlrgReqs));
        // 같은 세션 쿠키로 직접 재호출
        const firstReq = rlrgReqs[0];
        try {
          const xhrResult = await resultPage.evaluate(async (url, body) => {
            try {
              const resp = await fetch(url.startsWith('http') ? url : 'https://www.iros.go.kr' + url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
                body: body || '',
              });
              const txt = await resp.text();
              return txt.slice(0, 3000);
            } catch(e) { return 'err:' + e.message; }
          }, firstReq.url, firstReq.body);
          console.log('[iros] XHR 직접 호출 결과:', xhrResult.slice(0, 500));
          if (/표제부|갑구|을구|소유권|순위번호|등기원인/.test(xhrResult)) {
            console.log('[iros] XHR API 등기부 검출 성공!');
            res.json({ ok: true, registryText: xhrResult, registryHtml: '', address });
            return;
          }
        } catch(e) { console.log('[iros] XHR 재호출 오류:', e.message); }
      }
    }

    // ── 방법B: WebSquare 내부 전역변수 직접 변경 + onclick 핸들러 실행 ───────────────
    if (rlrgCount === 0) {
      console.log('[iros] 방법B: WebSquare 전역변수 강제 설정 + onclick 실행');
      const wsDeep = await resultPage.evaluate((gid) => {
        try {
          const results = {};
          // WebSquare 전역변수 탐색
          const gvKeys = Object.keys(window).filter(k => /gv_|_chk|smpl|rlrg/i.test(k));
          results.gvKeys = gvKeys.slice(0, 20);
          // scwin 함수 목록 중 btn_smpl_rlrg 참조하는 것 찾기
          const scFns = [];
          if (typeof scwin !== 'undefined') {
            Object.keys(scwin).forEach(k => {
              try {
                const s = (scwin[k] || '').toString();
                if (/btn_smpl_rlrg|smpl_rlrg|smplRlrg/i.test(s)) scFns.push(k);
              } catch {}
            });
          }
          results.scFns = scFns;
          // window 함수도 탐색
          const winFns = [];
          Object.keys(window).forEach(k => {
            try {
              if (typeof window[k] !== 'function') return;
              const s = window[k].toString();
              if (/btn_smpl_rlrg|smpl_rlrg|smplRlrg/i.test(s)) winFns.push(k);
            } catch {}
          });
          results.winFns = winFns;
          // gv_smpl_chk_yn 또는 유사 변수에 'Y' 대입
          ['gv_smpl_chk_yn', 'gv_chk_yn', 'smpl_chk_yn', 'gv_smpl'].forEach(gv => {
            if (typeof window[gv] !== 'undefined') { window[gv] = 'Y'; results['set_' + gv] = true; }
          });
          // btn_smpl_rlrg 요소의 onclick 직접 실행
          const btn = document.querySelector('[id*="btn_smpl_rlrg"]');
          if (btn) {
            const oc = btn.getAttribute('onclick') || '';
            results.btnOnclick = oc.slice(0,200);
            if (oc) eval(oc);
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            results.btnClicked = true;
          }
          return results;
        } catch(e) { return { err: e.message }; }
      }, gridId).catch(e => ({ err: e.message }));
      console.log('[iros] WebSquare 전역변수 탐색:', JSON.stringify(wsDeep));

      // scFns에서 발견된 함수 직접 호출
      if (wsDeep.scFns && wsDeep.scFns.length) {
        for (const fn of wsDeep.scFns) {
          await resultPage.evaluate((fnName) => {
            try { scwin[fnName](); return 'called'; } catch(e) { return 'err:' + e.message; }
          }, fn).catch(() => {});
        }
      }
      if (wsDeep.winFns && wsDeep.winFns.length) {
        for (const fn of wsDeep.winFns) {
          await resultPage.evaluate((fnName) => {
            try { window[fnName](); return 'called'; } catch(e) { return 'err:' + e.message; }
          }, fn).catch(() => {});
        }
      }
      await resultPage.waitForTimeout(2000);
      rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
      console.log('[iros] 방법B 후 btn_smpl_rlrg:', rlrgCount);
    }

    // ── 방법C: 키보드 Tab+Space로 체크박스 토글 ──────────────────────────────────────
    if (rlrgCount === 0) {
      console.log('[iros] 방법C: 키보드 Tab+Space 체크박스 토글');
      try {
        // 그리드 행 포커스 후 Tab 여러 번 → Space
        const cellEl = resultPage.locator(`[id="${cellId}"]`).first();
        if (await cellEl.count() > 0) {
          await cellEl.focus({ timeout: 3000 }).catch(() => {});
        } else {
          await resultRow.focus({ timeout: 3000 }).catch(() => {});
        }
        for (let i = 0; i < 5; i++) {
          await resultPage.keyboard.press('Tab');
          await resultPage.waitForTimeout(200);
          const focused = await resultPage.evaluate(() => document.activeElement?.id || document.activeElement?.type || 'none');
          if (/check|chk/i.test(focused)) break;
        }
        await resultPage.keyboard.press('Space');
        await resultPage.waitForTimeout(2000);
        rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
        console.log('[iros] 방법C(Tab+Space) 후 btn_smpl_rlrg:', rlrgCount);
      } catch(e) { console.log('[iros] 방법C 오류:', e.message); }
    }

    // ── 방법D: 헤더 전체선택 체크박스 클릭 ──────────────────────────────────────────
    if (rlrgCount === 0) {
      console.log('[iros] 방법D: 헤더 전체선택 체크박스 클릭');
      try {
        const hdrChk = resultPage.locator(
          `[id*="hd_chk"], [id*="hdChk"], [id*="allChk"], [id*="chkAll"], thead input[type="checkbox"], th input[type="checkbox"]`
        ).first();
        if (await hdrChk.count() > 0) {
          const hdrBox = await getBbox(hdrChk);
          if (hdrBox) {
            await resultPage.mouse.click(hdrBox.x + hdrBox.width / 2, hdrBox.y + hdrBox.height / 2);
          } else {
            await hdrChk.click({ force: true, timeout: 3000 }).catch(() => {});
          }
          await resultPage.waitForTimeout(2000);
          rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
          console.log('[iros] 방법D(헤더 전체선택) 후 btn_smpl_rlrg:', rlrgCount);
        } else {
          console.log('[iros] 방법D: 헤더 체크박스 없음');
        }
      } catch(e) { console.log('[iros] 방법D 오류:', e.message); }
    }

    // ── 방법E: 고유번호검색 탭으로 PIN 직접 입력 (완전히 다른 검색 흐름) ─────────────
    if (rlrgCount === 0 && pinFromRow) {
      console.log('[iros] 방법E: 고유번호검색 탭 직접 입력 시도 PIN=', pinFromRow);
      try {
        // 탭 클릭: id에 "pin" 또는 "고유번호" 포함
        const tabPinLoc = resultPage.locator(
          '[id*="pin_srch"], [id*="pinSrch"], [id*="tab_pin"], ' +
          '[id*="고유번호"], li:has-text("고유번호"), a:has-text("고유번호")'
        ).first();
        let pinTabClicked = false;
        if (await tabPinLoc.count() > 0) {
          await tabPinLoc.click({ force: true, timeout: 5000 }).catch(() => {});
          await resultPage.waitForTimeout(1500);
          pinTabClicked = true;
          console.log('[iros] 고유번호 탭 클릭');
        } else {
          // 페이지 소스에서 탭 ID 탐색
          const tabInfo = await resultPage.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('[id*="tab"], li, a')).filter(el =>
              /(고유번호|pin|PIN)/.test(el.id + el.textContent)
            );
            return tabs.slice(0,5).map(el => ({ id: el.id, txt: (el.textContent||'').trim().slice(0,30) }));
          });
          console.log('[iros] 고유번호 탭 후보:', JSON.stringify(tabInfo));
          if (tabInfo.length) {
            for (const ti of tabInfo) {
              const loc = resultPage.locator(`[id="${ti.id}"]`).first();
              if (await loc.count() > 0) { await loc.click({ force: true }).catch(() => {}); pinTabClicked = true; break; }
            }
          }
        }

        if (pinTabClicked) {
          await resultPage.waitForTimeout(1500);
          // PIN 입력 필드 찾기
          const pinInput = resultPage.locator('input[id*="pin" i], input[placeholder*="고유번호"], input[id*="unq"]').first();
          if (await pinInput.count() > 0) {
            const pinDash = pinFromRow; // e.g. 1843-1996-070590
            await pinInput.click({ clickCount: 3 });
            await pinInput.fill(pinDash);
            console.log('[iros] PIN 입력:', pinDash);
            await resultPage.keyboard.press('Enter');
            await resultPage.waitForTimeout(3000);
            rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
            console.log('[iros] 방법E(고유번호 검색) 후 btn_smpl_rlrg:', rlrgCount);
            // 결과 행 자동 클릭 (단일 결과면 1행)
            if (rlrgCount === 0) {
              const pinResultRow = resultPage.locator('tr').filter({ hasText: pinFromRow.replace(/-/g,'') }).first();
              if (await pinResultRow.count() > 0) {
                await pinResultRow.click({ force: true }).catch(() => {});
                await resultPage.waitForTimeout(2000);
                rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
                console.log('[iros] 방법E 행 클릭 후 btn_smpl_rlrg:', rlrgCount);
              }
            }
          } else {
            console.log('[iros] 방법E: PIN 입력 필드 없음');
          }
        }
      } catch(e) { console.log('[iros] 방법E 오류:', e.message); }
    }

    // ── 방법F: CDP 저레벨 마우스 이벤트 (Playwright mouse가 안 먹을 때) ─────────────
    if (rlrgCount === 0) {
      console.log('[iros] 방법F: CDP 저레벨 마우스 이벤트');
      try {
        const cdpSession = await context.newCDPSession(resultPage);
        // 체크박스 셀 좌표 재취득
        const chkEh = await resultPage.locator(`#${cellId}, [id="${cellId}"]`).first().elementHandle().catch(() => null)
          || await resultRow.locator('input[type="checkbox"], td').first().elementHandle().catch(() => null);
        if (chkEh) {
          const cBox = await chkEh.boundingBox().catch(() => null);
          if (cBox) {
            const mx = cBox.x + cBox.width / 2;
            const my = cBox.y + cBox.height / 2;
            await cdpSession.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mx, y: my, button: 'left', clickCount: 1 });
            await resultPage.waitForTimeout(50);
            await cdpSession.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mx, y: my, button: 'left', clickCount: 1 });
            await resultPage.waitForTimeout(2000);
            rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
            console.log('[iros] 방법F(CDP) 후 btn_smpl_rlrg:', rlrgCount);
          }
        }
        await cdpSession.detach().catch(() => {});
      } catch(e) { console.log('[iros] 방법F 오류:', e.message); }
    }

    // ── 방법G: 직접 등기부열람 상세 페이지 POST 폼 제출 ─────────────────────────────
    if (rlrgCount === 0 && pinFromRow) {
      console.log('[iros] 방법G: POST 폼 제출로 등기부열람 직접 시도');
      try {
        const pinClean = pinFromRow.replace(/-/g, '');
        const formResult = await resultPage.evaluate(async (pClean) => {
          // 세션 쿠키 포함 상태로 POST 시도 (WebSquare form submit 패턴)
          const endpoints = [
            { url: '/pos9/jsf/renf/selectRenf0200View.xhtml', body: `selGbn=UNI&rnum=${pClean}&rlrgGbn=1` },
            { url: '/pos9/PGetRenf0100.do', body: `selGbn=UNI&rnum=${pClean}` },
            { url: '/pos9/jsf/renf/selectRenf0100Info.xhtml', body: `rnum=${pClean}` },
          ];
          for (const ep of endpoints) {
            try {
              const resp = await fetch('https://www.iros.go.kr' + ep.url, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: ep.body,
              });
              const txt = await resp.text();
              if (/표제부|갑구|을구|소유권|순위번호|등기원인/.test(txt)) return { ok: true, txt: txt.slice(0, 10000), url: ep.url };
              return { ok: false, url: ep.url, status: resp.status, preview: txt.slice(0, 200) };
            } catch(e) { return { ok: false, url: ep.url, err: e.message }; }
          }
          return { ok: false, tried: endpoints.length };
        }, pinClean);
        console.log('[iros] 방법G POST 결과:', JSON.stringify(formResult).slice(0, 400));
        if (formResult.ok) {
          res.json({ ok: true, registryText: formResult.txt, registryHtml: '', address });
          return;
        }
      } catch(e) { console.log('[iros] 방법G 오류:', e.message); }
    }

    // ── 방법H: scwin.grd_smpl_srch_rslt 그리드 API로 직접 행 선택 ───────────────────
    if (rlrgCount === 0) {
      console.log('[iros] 방법H: scwin 그리드 API 직접 행 선택');
      const wsGridResult = await resultPage.evaluate((gid) => {
        try {
          const log = [];
          // WebSquare 그리드 객체 직접 접근
          if (typeof scwin !== 'undefined') {
            const gridKey = Object.keys(scwin).find(k => k.includes('grd_smpl_srch_rslt') || k.includes('smpl'));
            if (gridKey) {
              log.push('found:' + gridKey);
              const g = scwin[gridKey];
              if (g) {
                if (typeof g.selectRow === 'function') { g.selectRow(0); log.push('selectRow(0)'); }
                if (typeof g.setCheckValue === 'function') { g.setCheckValue(0, 'col_chk', 'Y'); log.push('setCheckValue'); }
                if (typeof g.setFocusedRowIndex === 'function') { g.setFocusedRowIndex(0); log.push('setFocusedRowIndex'); }
              }
            }
          }
          // 모든 Gauce/WebSquare 그리드 인스턴스 탐색
          if (window._w2 || window.w2ui || window.webSquare) {
            const ws = window._w2 || window.w2ui || window.webSquare;
            log.push('wsType:' + typeof ws);
          }
          return log;
        } catch(e) { return ['err:' + e.message]; }
      }, gridId).catch(e => ['catch:' + e.message]);
      console.log('[iros] 방법H 결과:', JSON.stringify(wsGridResult));
      await resultPage.waitForTimeout(2000);
      rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
      console.log('[iros] 방법H 후 btn_smpl_rlrg:', rlrgCount);
    }

    // ── 방법I: WebSquare datalist 체크박스값 직접 세팅 + retrievePinSrchCont submit 직접 호출 ─────
    if (rlrgCount === 0 && pinFromRow) {
      console.log('[iros] 방법I: WebSquare submit binding + datalist 직접 조작');
      const pinClean = pinFromRow.replace(/-/g, '');
      try {
        const wsResult = await resultPage.evaluate(async ({pinC, pinDash}) => {
          const log = [];
          try {
            // 1) datalist 체크 상태 강제 세팅 (WebSquare는 datalist 값으로 버튼 활성 여부 결정)
            const chkDlt = Object.keys(window).find(k => /dlt_smpl_srch_rslt_check|smpl_srch.*check/i.test(k));
            if (chkDlt && window[chkDlt]) {
              try {
                const d = window[chkDlt];
                if (typeof d.setRowData === 'function') { d.setRowData(0, { col_chk: 'Y', rnum: pinC }); log.push('datalist.setRowData'); }
                else if (typeof d.setValue === 'function') { d.setValue('col_chk', 'Y', 0); log.push('datalist.setValue'); }
                else if (typeof d.setData === 'function') { d.setData([{ col_chk: 'Y', rnum: pinC }]); log.push('datalist.setData'); }
              } catch(e2) { log.push('datalist_err:' + e2.message); }
            }
            // 2) btn_smpl_rlrg 직접 setEnable + 클릭
            const btnKeys = Object.keys(window).filter(k => /btn_smpl_rlrg/i.test(k));
            log.push('btnKeys:' + JSON.stringify(btnKeys.slice(0,5)));
            for (const bk of btnKeys) {
              const b = window[bk];
              if (b && typeof b.setEnable === 'function') { b.setEnable(true); log.push('btn.setEnable'); }
              if (b && typeof b.click === 'function') { b.click(); log.push('btn.click:' + bk); }
            }
            // 3) WebSquare submit binding 직접 호출: retrievePinSrchCont — inspect keys first
            const sbmKey = Object.keys(window).find(k => /retrievePinSrchCont/i.test(k));
            log.push('sbmKey:' + sbmKey);
            if (sbmKey && window[sbmKey]) {
              const sbm = window[sbmKey];
              // sbm 전체 속성 검사
              const sbmInspect = {
                action: sbm.action, bind: sbm.bind, ref: sbm.ref,
                instance: sbm.instance, mode: sbm.mode, method: sbm.method,
                customHandler: sbm.customHandler, errorHandler: sbm.errorHandler,
              };
              try { if (sbm.xmlNode) sbmInspect.xmlNode = (sbm.xmlNode.outerHTML||sbm.xmlNode.textContent||'').slice(0,300); } catch(xe) {}
              log.push('sbm_full:' + JSON.stringify(sbmInspect).slice(0, 600));

              // customHandler가 string이면 window path로 해석해서 호출
              if (typeof sbm.customHandler === 'string' && sbm.customHandler.trim()) {
                const hName = sbm.customHandler.trim();
                try {
                  const parts = hName.split('.');
                  let fn = window;
                  for (const p of parts) fn = fn && fn[p];
                  if (typeof fn === 'function') { fn(); log.push('customHandler_fn_called:' + hName); }
                  else { log.push('customHandler_not_fn:' + typeof fn + ':' + hName); }
                } catch(ce) { log.push('customHandler_call_err:' + ce.message); }
              }

              if (typeof sbm.submit === 'function') { sbm.submit(); log.push('sbm.submit()'); }
              else if (typeof sbm === 'function') { sbm(); log.push('sbm()'); }
              else if (typeof sbm.run === 'function') { sbm.run(); log.push('sbm.run()'); }
              else if (typeof sbm.execute === 'function') { sbm.execute(); log.push('sbm.execute()'); }
              else if (typeof sbm.send === 'function') { sbm.send(); log.push('sbm.send()'); }
              else { log.push('sbm_no_callable:' + typeof sbm); }
            }
            // 4) dlt_smpl_srch_rslt_check datalist 전체 데이터 읽기 + 그대로 body로 제출
            const chkKey2 = Object.keys(window).find(k => /dlt_smpl_srch_rslt_check/i.test(k));
            if (chkKey2 && window[chkKey2]) {
              const dc = window[chkKey2];
              let chkData = null;
              try {
                if (typeof dc.getAllRowData === 'function') chkData = dc.getAllRowData();
                else if (typeof dc.getData === 'function') chkData = dc.getData();
                else if (typeof dc.getRowData === 'function') chkData = [dc.getRowData(0)];
              } catch(de) {}
              log.push('chkDlt_data:' + JSON.stringify(chkData).slice(0,300));
              if (chkData) {
                try {
                  const r = await fetch('/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do?IS_NMBR_LOGIN__=null', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json', 'Referer': location.href },
                    body: JSON.stringify({"websquare_param": chkData})
                  });
                  const txt = await r.text();
                  log.push('chkDlt_submit:' + r.status + ':' + txt.slice(0,400));
                  if (/표제부|갑구|을구|소유권|순위번호|등기원인|등기목적/.test(txt)) return { ok: true, log, txt };
                } catch(fe) { log.push('chkDlt_fetch_err:' + fe.message); }
              }
            }
            // 5) scwin 내 retrievePinSrchCont / smplRlrg 관련 함수 탐색
            if (typeof scwin !== 'undefined') {
              const scKeys = Object.keys(scwin).filter(k => /retrievePinSrchCont|pinSrchCont|smplRlrg|fn_smpl/i.test(k));
              log.push('scKeys:' + JSON.stringify(scKeys));
              for (const scKey of scKeys) {
                try { scwin[scKey](); log.push('scwin.' + scKey + '()'); } catch(e3) { log.push('scwin.' + scKey + '_err:' + e3.message); }
              }
            }
            // 6) XHR direct: WebSquare 포맷 (IS_NMBR_LOGIN__=null + websquare_param JSON) — 다양한 body 조합
            const wsParamBodies = [
              { url: '/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do?IS_NMBR_LOGIN__=null', body: JSON.stringify({"websquare_param":{"rnum":pinC,"selGbn":"UNI","rlrgGbn":"1","smplKindCls":"1","payCl":"F"}}) },
              { url: '/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do?IS_NMBR_LOGIN__=null', body: JSON.stringify({"websquare_param":[{"rnum":pinC,"selGbn":"UNI","rlrgGbn":"1","col_chk":"Y"}]}) },
              { url: '/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do?IS_NMBR_LOGIN__=null', body: JSON.stringify({"websquare_param":{"smplSrchList":[{"rnum":pinC,"selGbn":"UNI","rlrgGbn":"1","smplKindCls":"1"}]}}) },
              { url: '/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do?IS_NMBR_LOGIN__=null', body: JSON.stringify({"websquare_param":{"conn_menu_cls_cd":"01","rnum":pinC,"selGbn":"UNI","rlrgGbn":"1"}}) },
            ];
            for (const wb of wsParamBodies) {
              try {
                const r = await fetch(wb.url, {
                  method: 'POST', credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': location.href,
                  },
                  body: wb.body,
                });
                const txt = await r.text();
                log.push('ws_status:' + r.status + ' body:' + wb.body.slice(0,80) + ' preview:' + txt.slice(0, 300));
                if (/표제부|갑구|을구|소유권|순위번호|등기원인|등기목적/.test(txt)) {
                  return { ok: true, log, txt };
                }
              } catch(er) { log.push('ws_fetch_err:' + er.message); break; }
            }
          } catch(e) { log.push('outer_err:' + e.message); }
          return { ok: false, log };
        }, {pinC: pinClean, pinDash: pinFromRow}).catch(e => ({ ok: false, log: ['evaluate_err:' + e.message] }));

        console.log('[iros] 방법I 결과:', JSON.stringify(wsResult).slice(0, 500));
        if (wsResult && wsResult.ok) {
          res.json({ ok: true, registryText: wsResult.txt, registryHtml: '', address });
          return;
        }
        await resultPage.waitForTimeout(3000);
        rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
        console.log('[iros] 방법I 후 btn_smpl_rlrg:', rlrgCount);
      } catch(e) { console.log('[iros] 방법I 오류:', e.message); }
    }

    // ── 방법J: page.waitForResponse + WebSquare submit binding 직접 트리거 ────────────
    // 핵심: 체크박스 UI 없이도 submit binding이 서버 XHR을 발생시키면 응답 본문 캡처
    if (rlrgCount === 0 && pinFromRow) {
      console.log('[iros] 방법J: waitForResponse + submit binding 직접 트리거');
      const pinClean = pinFromRow.replace(/-/g, '');
      try {
        // 1) datalist 체크 상태 강제 설정
        const dltSetResult = await resultPage.evaluate((pinC) => {
          try {
            const log = [];
            // dlt_smpl_srch_rslt (메인 결과 datalist) 첫 행 데이터 읽기
            const resKey = Object.keys(window).find(k => /dlt_smpl_srch_rslt$/.test(k));
            if (resKey && window[resKey]) {
              const d = window[resKey];
              let row0 = null;
              if (typeof d.getRowData === 'function') row0 = d.getRowData(0);
              else if (typeof d.getAllRowData === 'function') { const a = d.getAllRowData(); row0 = a && a[0]; }
              window.__iros_row0 = row0 ? JSON.stringify(row0) : null;
              log.push('row0:' + (window.__iros_row0 ? window.__iros_row0.slice(0,150) : 'null'));
            }
            // dlt_smpl_srch_rslt_check 체크 상태 설정
            const chkKey = Object.keys(window).find(k => /dlt_smpl_srch_rslt_check/i.test(k));
            if (chkKey && window[chkKey]) {
              const dc = window[chkKey];
              ['setRowData','setValue','setData'].forEach(m => {
                if (typeof dc[m] === 'function') {
                  try {
                    if (m === 'setRowData') dc.setRowData(0, { col_chk: 'Y', rnum: pinC });
                    else if (m === 'setValue') dc.setValue('col_chk', 'Y', 0);
                    else if (m === 'setData') dc.setData([{ col_chk: 'Y', rnum: pinC }]);
                    log.push('chk.' + m);
                  } catch(e2) { log.push('chk_err:' + e2.message); }
                }
              });
            }
            return log;
          } catch(e) { return ['err:' + e.message]; }
        }, pinClean);
        console.log('[iros] 방법J datalist 설정:', JSON.stringify(dltSetResult));

        // 2) waitForResponse 설정 후 submit binding 호출 (Playwright 레벨에서 응답 캡처)
        const responsePromise = resultPage.waitForResponse(
          r => r.url().includes('retrievePinSrchCont'),
          { timeout: 8000 }
        ).catch(() => null);

        // submit binding 직접 호출 (EXACT key from confirmed gvKeys)
        const sbmCallResult = await resultPage.evaluate(() => {
          try {
            const sbmKey = Object.keys(window).find(k => /sbm.*retrievePinSrchCont|retrievePinSrchCont/i.test(k));
            if (!sbmKey) return 'sbmKey_not_found';
            const sbm = window[sbmKey];
            if (!sbm) return 'sbm_null';
            if (typeof sbm.submit === 'function') { sbm.submit(); return 'sbm.submit():' + sbmKey; }
            if (typeof sbm === 'function') { sbm(); return 'sbm():' + sbmKey; }
            return 'no_submit_method:' + typeof sbm;
          } catch(e) { return 'err:' + e.message; }
        });
        console.log('[iros] 방법J submit 호출:', sbmCallResult);

        const apiResponse = await responsePromise;
        if (apiResponse) {
          const respStatus = apiResponse.status();
          const respText = await apiResponse.text().catch(() => '');
          console.log('[iros] 방법J 응답 status=' + respStatus + ' len=' + respText.length + ' preview:', respText.slice(0, 400));
          if (/표제부|갑구|을구|소유권|순위번호|등기원인|등기목적/.test(respText)) {
            console.log('[iros] 방법J 등기부 검출 성공!');
            res.json({ ok: true, registryText: respText, registryHtml: '', address });
            return;
          }
        } else {
          console.log('[iros] 방법J waitForResponse 타임아웃 (XHR 미발생)');
        }

        // 3) 직접 XHR: row0 데이터 + 다양한 파라미터 조합
        // row0는 배열 형식: ["18431996070590","건물","부산광역시...",...]
        const row0Raw = await resultPage.evaluate(() => window.__iros_row0 || null);
        const xhrResult = await resultPage.evaluate(async ({pinC, r0Raw}) => {
          let row0Rnum = pinC; // row0[0]이 rnum
          try {
            const row0 = r0Raw ? JSON.parse(r0Raw) : null;
            if (Array.isArray(row0) && row0[0]) row0Rnum = String(row0[0]);
            else if (row0 && typeof row0 === 'object' && row0.rnum) row0Rnum = row0.rnum;
          } catch(pe) {}
          const wsRequests = [
            { url: '/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do?IS_NMBR_LOGIN__=null', body: JSON.stringify({"websquare_param":{"rnum":row0Rnum,"selGbn":"UNI","rlrgGbn":"1"}}) },
            { url: '/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do?IS_NMBR_LOGIN__=null', body: JSON.stringify({"websquare_param":{"rnum":pinC,"selGbn":"UNI","rlrgGbn":"1"}}) },
            { url: '/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do?IS_NMBR_LOGIN__=null', body: JSON.stringify({"websquare_param":{"rnum":row0Rnum,"selGbn":"UNI","rlrgGbn":"1","smplKindCls":"1"}}) },
            { url: '/biz/Pr20ViaRlrgSrchCtrl/retrieveSmplSrchCont.do?IS_NMBR_LOGIN__=null', body: JSON.stringify({"websquare_param":{"rnum":row0Rnum,"selGbn":"UNI","rlrgGbn":"1"}}) },
          ];
          const results = [];
          for (const wr of wsRequests) {
            try {
              const r = await fetch(wr.url, {
                method: 'POST', credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'Accept': 'application/json, text/plain, */*',
                  'Referer': location.href,
                },
                body: wr.body,
              });
              const txt = await r.text();
              if (/표제부|갑구|을구|소유권|순위번호|등기원인|등기목적/.test(txt)) {
                return { ok: true, txt, url: wr.url };
              }
              results.push({ status: r.status, preview: txt.slice(0, 500), url: wr.url.split('/').pop() });
            } catch(e) { results.push({ err: e.message, url: wr.url.split('/').pop() }); }
          }
          return { ok: false, results };
        }, {pinC: pinClean, r0Raw: row0Raw});
        console.log('[iros] 방법J XHR:', JSON.stringify(xhrResult).slice(0, 600));
        if (xhrResult && xhrResult.ok) {
          res.json({ ok: true, registryText: xhrResult.txt, registryHtml: '', address });
          return;
        }

        await resultPage.waitForTimeout(2000);
        rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
        console.log('[iros] 방법J 후 btn_smpl_rlrg:', rlrgCount);
      } catch(e) { console.log('[iros] 방법J 오류:', e.message); }
    }

    // ── 방법K: dma_srch_param 데이터 인스턴스 직접 탐색·세팅 후 sbm.submit() ────────
    // sbm.ref = "data:json,{\"id\":\"dma_srch_param\",\"key\":\"websquare_param\"}"
    // WebSquare 제출 시 dma_srch_param 데이터 모델을 읽어 body로 직렬화함.
    // 체크박스 클릭 성공 시 자동으로 채워지는 이 모델을 직접 채워야 함.
    if (pinFromRow) {
      console.log('[iros] 방법K: dma_srch_param 인스턴스 탐색·세팅 후 sbm.submit()');
      const pinClean = pinFromRow.replace(/-/g, '');
      try {
        const kResult = await resultPage.evaluate(async (pinC) => {
          const log = [];
          try {
            // 1) dlt_smpl_srch_rslt에서 첫 번째 행 데이터 실제 추출
            const resKey = Object.keys(window).find(k => /^dlt_smpl_srch_rslt$/.test(k));
            let row0 = null;
            let row0Obj = {};
            if (resKey && window[resKey]) {
              const dl = window[resKey];
              try {
                if (typeof dl.getRowData === 'function') row0 = dl.getRowData(0);
                else if (typeof dl.getAllRowData === 'function') { const a = dl.getAllRowData(); row0 = a && a[0]; }
              } catch(re) {}
              log.push('row0_raw:' + JSON.stringify(row0).slice(0, 200));
              // 배열이면 컬럼명 매핑 시도
              if (Array.isArray(row0)) {
                const cols = ['rnum','rlrgGbn','address','selGbn','smplKindCls','payCl'];
                for (let i = 0; i < cols.length && i < row0.length; i++) row0Obj[cols[i]] = row0[i];
              } else if (row0 && typeof row0 === 'object') {
                row0Obj = row0;
              }
            }
            log.push('row0Obj:' + JSON.stringify(row0Obj).slice(0, 200));

            // 2) dma_srch_param 탐색: window 직접, scwin, w2, WebSquare 내부 레지스트리
            let dma = null;
            const candidates = [];
            // 2a) window direct
            const wDmaKey = Object.keys(window).find(k => k === 'dma_srch_param' || k.endsWith('_dma_srch_param') || k.includes('dma_srch_param'));
            if (wDmaKey) { dma = window[wDmaKey]; candidates.push('window:' + wDmaKey); }
            // 2b) scwin namespace
            if (!dma && typeof scwin !== 'undefined') {
              const scDmaKey = Object.keys(scwin).find(k => k.includes('dma_srch_param'));
              if (scDmaKey) { dma = scwin[scDmaKey]; candidates.push('scwin:' + scDmaKey); }
            }
            // 2c) DOM element (XForms instance)
            if (!dma) {
              const domEl = document.getElementById('dma_srch_param') || document.querySelector('[id*="dma_srch_param"]');
              if (domEl) { dma = domEl; candidates.push('dom:' + domEl.id); }
            }
            // 2d) w2 widget registry
            if (!dma) {
              for (const gk of ['w2','w2ui','WebSquare','websquare','$w2']) {
                if (window[gk] && typeof window[gk] === 'object') {
                  const sub = window[gk];
                  if (sub.dma_srch_param) { dma = sub.dma_srch_param; candidates.push(gk + '.dma_srch_param'); break; }
                  if (sub.widget && sub.widget.dma_srch_param) { dma = sub.widget.dma_srch_param; candidates.push(gk + '.widget.dma_srch_param'); break; }
                  if (typeof sub.getObject === 'function') {
                    try { const o = sub.getObject('dma_srch_param'); if (o) { dma = o; candidates.push(gk + '.getObject'); break; } } catch(e2) {}
                  }
                }
              }
            }
            // 2e) sbm.xmlNode에서 XForms 인스턴스 탐색
            if (!dma) {
              const sbmKey = Object.keys(window).find(k => /sbm.*retrievePinSrchCont/i.test(k) || k === 'sbm_Pr20ViaRlrgSrchCtrl_retrievePinSrchCont');
              if (sbmKey && window[sbmKey]) {
                const sbm = window[sbmKey];
                if (sbm.xmlNode && sbm.xmlNode.ownerDocument) {
                  const doc = sbm.xmlNode.ownerDocument;
                  const instanceEls = doc.querySelectorAll('[id*="dma_srch_param"],[name*="dma_srch_param"]');
                  log.push('xmlNode_instances:' + instanceEls.length + ' ' + Array.from(instanceEls).map(e => e.id||e.name).join(','));
                  if (instanceEls.length > 0) { dma = instanceEls[0]; candidates.push('sbm.xmlNode.ownerDocument'); }
                }
                // sbm 자체에 data 속성이 있을 수도
                if (!dma && sbm.data) { log.push('sbm.data:' + JSON.stringify(sbm.data).slice(0,100)); }
                if (!dma && sbm.instance) { log.push('sbm.instance:' + String(sbm.instance).slice(0,100)); }
              }
            }
            // 2f) window 전체에서 dma 접두사 키 목록 로깅
            const dmaKeys = Object.keys(window).filter(k => k.startsWith('dma_') || k.includes('srch_param'));
            log.push('dmaKeys:' + JSON.stringify(dmaKeys.slice(0,20)));
            log.push('dma_found:' + candidates.join('|') + ' type:' + (dma ? typeof dma : 'null'));

            // 3) dma 발견 시 데이터 세팅
            if (dma) {
              const setData = row0Obj.rnum ? row0Obj : { rnum: pinC, selGbn: 'UNI', rlrgGbn: '1', smplKindCls: '1', payCl: 'F' };
              const setDataArr = [setData];
              log.push('setting_dma:' + JSON.stringify(setData));
              // DOM element인 경우 textContent로 JSON 주입
              if (dma.nodeType) {
                try { dma.textContent = JSON.stringify(setDataArr); log.push('dma.textContent_set'); } catch(te) { log.push('dma.textContent_err:' + te.message); }
              } else {
                // WebSquare widget의 경우
                if (typeof dma.setData === 'function') { try { dma.setData(setDataArr); log.push('dma.setData'); } catch(e3) { log.push('dma.setData_err:' + e3.message); } }
                if (typeof dma.setRowData === 'function') { try { dma.setRowData(0, setData); log.push('dma.setRowData'); } catch(e3) { log.push('dma.setRowData_err:' + e3.message); } }
                if (typeof dma.setValue === 'function') { try { for (const [k,v] of Object.entries(setData)) dma.setValue(k, v, 0); log.push('dma.setValue'); } catch(e3) { log.push('dma.setValue_err:' + e3.message); } }
                if (typeof dma.update === 'function') { try { dma.update(setDataArr); log.push('dma.update'); } catch(e3) { log.push('dma.update_err:' + e3.message); } }
              }

              // 4) sbm.submit() 호출
              const sbmKey2 = Object.keys(window).find(k => /sbm.*retrievePinSrchCont/i.test(k) || k === 'sbm_Pr20ViaRlrgSrchCtrl_retrievePinSrchCont');
              if (sbmKey2 && window[sbmKey2]) {
                const sbm = window[sbmKey2];
                if (typeof sbm.submit === 'function') {
                  try {
                    const submitResult = await new Promise((resolve) => {
                      const origCustom = sbm.customHandler;
                      sbm.customHandler = (data) => { resolve({ from: 'customHandler', data: JSON.stringify(data).slice(0, 500) }); };
                      const origError = sbm.errorHandler;
                      sbm.errorHandler = (err) => { resolve({ from: 'errorHandler', err: String(err).slice(0, 200) }); };
                      setTimeout(() => resolve({ from: 'timeout' }), 5000);
                      sbm.submit();
                      log.push('sbm.submit_called');
                    });
                    sbm.customHandler = origCustom || '';
                    sbm.errorHandler = origError || '';
                    log.push('submit_result:' + JSON.stringify(submitResult));
                    if (submitResult.data && /표제부|갑구|을구|소유권|순위번호|등기원인|등기목적/.test(submitResult.data)) {
                      return { ok: true, log, txt: submitResult.data };
                    }
                  } catch(se) { log.push('sbm.submit_err:' + se.message); }
                }
              }
            }

            // 5) dma 없거나 submit 실패 시: row0 실제 데이터로 retrievePinSrchCont 직접 XHR
            // dlt_smpl_srch_rslt 행 데이터 컬럼명 확인을 위해 datalist 스키마 탐색
            let schemaStr = '';
            if (resKey && window[resKey]) {
              const dl = window[resKey];
              try {
                if (typeof dl.getColumnId === 'function') {
                  const cols = []; for (let i = 0; i < 20; i++) { const c = dl.getColumnId(i); if (!c) break; cols.push(c); }
                  schemaStr = cols.join(',');
                } else if (dl.info && dl.info.cols) schemaStr = JSON.stringify(dl.info.cols).slice(0, 300);
                else if (dl._cols) schemaStr = JSON.stringify(dl._cols).slice(0, 300);
                else if (dl.schema) schemaStr = JSON.stringify(dl.schema).slice(0, 300);
              } catch(ce) {}
            }
            log.push('schema:' + schemaStr);

            // 6) 최대한 많은 field 조합으로 XHR 시도
            const attempts = [
              { rnum: row0Obj.rnum || pinC, selGbn: row0Obj.selGbn || 'UNI', rlrgGbn: row0Obj.rlrgGbn || '1', smplKindCls: row0Obj.smplKindCls || '1', payCl: row0Obj.payCl || 'F', col_chk: 'Y' },
              { rnum: pinC, selGbn: 'UNI', rlrgGbn: '1', smplKindCls: '1', payCl: 'F', col_chk: 'Y' },
              { rnum: pinC, selGbn: 'UNI', rlrgGbn: '1', col_chk: 'Y' },
              row0Obj.rnum ? row0Obj : null,
            ].filter(Boolean);
            for (const body of attempts) {
              try {
                const r = await fetch('/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do?IS_NMBR_LOGIN__=null', {
                  method: 'POST', credentials: 'include',
                  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json, text/plain, */*', 'Referer': location.href },
                  body: JSON.stringify({ websquare_param: [body] }),
                });
                const txt = await r.text();
                log.push('xhrK_arr:' + r.status + ':' + JSON.stringify(body).slice(0,80) + ' preview:' + txt.slice(0, 300));
                if (/표제부|갑구|을구|소유권|순위번호|등기원인|등기목적/.test(txt)) return { ok: true, log, txt };
              } catch(fe) { log.push('xhrK_err:' + fe.message); }
            }
          } catch(e) { log.push('K_outer_err:' + e.message); }
          return { ok: false, log };
        }, pinClean).catch(e => ({ ok: false, log: ['K_evaluate_err:' + e.message] }));

        console.log('[iros] 방법K 결과:', JSON.stringify(kResult).slice(0, 800));
        if (kResult && kResult.ok) {
          res.json({ ok: true, registryText: kResult.txt, registryHtml: '', address });
          return;
        }
        await resultPage.waitForTimeout(2000);
      } catch(e) { console.log('[iros] 방법K 오류:', e.message); }
    }

    // ── 방법L: 그리드 메서드·sbm 플러그인·대안 endpoint·정확한 체크박스 클릭 ──────────
    if (pinFromRow) {
      const pinClean = pinFromRow.replace(/-/g, '');
      const pinDash  = pinFromRow;
      console.log('[iros] 방법L: grid메서드+sbm플러그인+대안endpoint+정확click');
      try {
        // L-1) cell_0_1 INPUT 정확 bounding rect → 마우스 클릭
        const cellRect = await resultPage.evaluate(() => {
          const cell = document.getElementById('mf_wfm_potal_main_wfm_content_grd_smpl_srch_rslt_cell_0_1');
          if (!cell) return null;
          const input = cell.querySelector('input') || cell;
          cell.scrollIntoView({block:'center'});
          const r = input.getBoundingClientRect();
          return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, type: input.tagName + (input.type || ''), id: input.id, html: input.outerHTML.slice(0,200) };
        }).catch(() => null);
        console.log('[iros] 방법L cellRect:', JSON.stringify(cellRect));

        if (cellRect && cellRect.cx && cellRect.cy) {
          await resultPage.mouse.move(cellRect.cx, cellRect.cy);
          await resultPage.waitForTimeout(100);
          await resultPage.mouse.click(cellRect.cx, cellRect.cy, {button:'left'});
          await resultPage.waitForTimeout(1500);
          rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
          console.log('[iros] 방법L 정확click 후 btn_smpl_rlrg:', rlrgCount);
        }

        // L-2) grid/datalist 위젯 메서드 + sbm 플러그인 탐색
        const lScanResult = await resultPage.evaluate((pinC) => {
          const log = [];
          // grid widget
          const grdKey = Object.keys(window).find(k => /grd_smpl_srch_rslt$/.test(k) && !k.includes('check'));
          if (grdKey && window[grdKey]) {
            const grd = window[grdKey];
            const ownFns = Object.keys(grd).filter(k => typeof grd[k] === 'function');
            const protoFns = [];
            let p = Object.getPrototypeOf(grd);
            while (p && p !== Object.prototype) { Object.getOwnPropertyNames(p).forEach(k => { if (typeof grd[k] === 'function' && !protoFns.includes(k)) protoFns.push(k); }); p = Object.getPrototypeOf(p); }
            log.push('grd_own:' + JSON.stringify(ownFns.slice(0,30)));
            log.push('grd_proto:' + JSON.stringify(protoFns.slice(0,40)));
            // 체크 관련 메서드 시도
            for (const fn of ['checkRow','setCheckValue','fireEvent','triggerEvent','oncheckclick','selectRow','setSelectedIndex','checkAll','rowCheck']) {
              if (typeof grd[fn] === 'function') {
                try { grd[fn](0, 'Y'); log.push('grd.' + fn + '(0,"Y")'); } catch(e) {
                  try { grd[fn](0); log.push('grd.' + fn + '(0)'); } catch(e2) { log.push('grd.' + fn + '_err:' + e2.message); }
                }
              }
            }
            if (typeof grd.fireEvent === 'function') {
              for (const ev of ['oncheckclick','oncheckChange','oncheckboxclick','onclick','onSelectChange','onrowclick']) {
                try { grd.fireEvent(ev, {rowIndex:0,colIndex:0,value:'Y',checkFlag:true}); log.push('grd.fireEvent(' + ev + ')'); }
                catch(e) { log.push('grd.fireEvent(' + ev + ')_err:' + e.message.slice(0,40)); }
              }
            }
            // datalist 컬럼 이름
            const dltKey = Object.keys(window).find(k => /^mf.*dlt_smpl_srch_rslt$/.test(k));
            if (dltKey && window[dltKey]) {
              const dl = window[dltKey];
              // getColumnId 방식
              if (typeof dl.getColumnId === 'function') {
                const cols = []; for (let i=0;i<20;i++) { const c=dl.getColumnId(i); if(!c) break; cols.push(c); }
                log.push('cols_getColumnId:' + cols.join(','));
              }
              // schema/info 직접
              for (const p of ['_colInfo','_schema','info','schema','columns','_cols']) {
                if (dl[p]) { log.push('dlt.' + p + ':' + JSON.stringify(dl[p]).slice(0,200)); break; }
              }
            }
          }
          // sbm 플러그인 탐색
          const sbmKey = Object.keys(window).find(k => /sbm.*retrievePinSrchCont/i.test(k));
          if (sbmKey && window[sbmKey]) {
            const sbm = window[sbmKey];
            log.push('sbm._pluginName:' + sbm._pluginName);
            if (sbm.parentElement) {
              const pe = sbm.parentElement;
              log.push('sbm.parentElement_id:' + pe.id + ' type:' + typeof pe + ' fns:' + Object.keys(pe).filter(k=>typeof pe[k]==='function').join(',').slice(0,100));
              // parentElement 클릭/활성화 시도
              for (const fn of ['click','activate','submit','trigger','fireEvent']) {
                if (typeof pe[fn] === 'function') { try { pe[fn](); log.push('pe.' + fn + '()'); } catch(e) { log.push('pe.' + fn + '_err:' + e.message.slice(0,40)); } }
              }
            }
            // xmlNode ownerDocument에서 dma_srch_param 탐색
            if (sbm.xmlNode && sbm.xmlNode.ownerDocument) {
              const doc = sbm.xmlNode.ownerDocument;
              const allIds = Array.from(doc.querySelectorAll('[id]')).map(e=>e.id);
              log.push('xf_doc_ids:' + allIds.slice(0,20).join(','));
              const dmaEl = doc.getElementById('dma_srch_param') || doc.querySelector('[id*="dma"]');
              if (dmaEl) {
                log.push('dmaEl:' + dmaEl.outerHTML.slice(0,300));
                try { dmaEl.textContent = JSON.stringify([{rnum:pinC,selGbn:'UNI',rlrgGbn:'1',smplKindCls:'1',payCl:'F',col_chk:'Y'}]); log.push('dmaEl_set'); } catch(e) { log.push('dmaEl_set_err:'+e.message); }
              } else {
                // xmlNode 형제 탐색
                const par = sbm.xmlNode.parentNode;
                if (par) log.push('xf_parent:' + par.tagName + ' children:' + Array.from(par.childNodes).map(c=>c.nodeName+(c.id?'#'+c.id:'')).slice(0,15).join(','));
              }
            }
          }
          return log;
        }, pinClean).catch(e => ['L2_err:' + e.message]);
        console.log('[iros] 방법L scan:', JSON.stringify(lScanResult).slice(0, 1200));

        // L-3) 대안 endpoint: retrieveLocSrchCont / retrieveRdAddrSrchCont (주소 검색 후 내용 조회)
        const lXhrResult = await resultPage.evaluate(async ({pinC, pinD}) => {
          const log = [];
          // row0에서 실제 데이터 읽기
          const dltKey = Object.keys(window).find(k => /^mf.*dlt_smpl_srch_rslt$/.test(k));
          let row0Obj = {};
          if (dltKey && window[dltKey]) {
            const dl = window[dltKey];
            try {
              let r0 = null;
              if (typeof dl.getRowData === 'function') r0 = dl.getRowData(0);
              else if (typeof dl.getAllRowData === 'function') { const a = dl.getAllRowData(); r0 = a&&a[0]; }
              if (Array.isArray(r0)) {
                // 컬럼 이름 얻기 가능하면 매핑, 아니면 인덱스로
                row0Obj = { rnum: r0[0], rlrgGbn: r0[1]==='건물'?'1':(r0[1]==='집합건물'?'2':(r0[1]==='토지'?'3':r0[1])), selGbn:'UNI', smplKindCls:'1', payCl:'F', col_chk:'Y' };
              } else if (r0 && typeof r0 === 'object') { row0Obj = { ...r0, col_chk: 'Y', payCl: 'F' }; }
            } catch(e) {}
          }
          if (!row0Obj.rnum) row0Obj = { rnum: pinC, selGbn:'UNI', rlrgGbn:'1', smplKindCls:'1', payCl:'F', col_chk:'Y' };
          log.push('row0Obj:' + JSON.stringify(row0Obj));

          const endpoints = [
            '/biz/Pr20ViaRlrgSrchCtrl/retrieveLocSrchCont.do?IS_NMBR_LOGIN__=null',
            '/biz/Pr20ViaRlrgSrchCtrl/retrieveRdAddrSrchCont.do?IS_NMBR_LOGIN__=null',
            '/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do?IS_NMBR_LOGIN__=null',
          ];
          const bodies = [
            JSON.stringify({websquare_param: [row0Obj]}),
            JSON.stringify({websquare_param: row0Obj}),
            JSON.stringify({websquare_param: [{rnum:pinC, selGbn:'UNI', rlrgGbn:'1', payCl:'F', smplKindCls:'1', col_chk:'Y', smplSmplCls:'1'}]}),
            JSON.stringify({websquare_param: [{rnum:pinC, selGbn:'LOC', rlrgGbn:'1', payCl:'F', smplKindCls:'1', col_chk:'Y'}]}),
          ];
          for (const url of endpoints) {
            for (const body of bodies.slice(0, 2)) {
              try {
                const r = await fetch(url, {
                  method:'POST', credentials:'include',
                  headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest','Accept':'application/json, text/plain, */*','Referer':location.href},
                  body,
                });
                const txt = await r.text();
                const endp = url.split('/').pop().split('?')[0];
                log.push(endp + ':' + r.status + ':' + body.slice(0,60) + ' → ' + txt.slice(0,200));
                if (/표제부|갑구|을구|소유권|순위번호|등기원인|등기목적/.test(txt)) return {ok:true, txt, log};
              } catch(e) { log.push('fetch_err:' + e.message); }
            }
          }
          return {ok:false, log};
        }, {pinC: pinClean, pinD: pinDash}).catch(e => ({ok:false, log:['L3_err:'+e.message]}));
        console.log('[iros] 방법L XHR:', JSON.stringify(lXhrResult).slice(0, 1200));
        if (lXhrResult && lXhrResult.ok) {
          res.json({ok:true, registryText:lXhrResult.txt, registryHtml:'', address});
          return;
        }

        // L-4) 고유번호 탭 입력 후 검색 (tab 내 INPUT 탐색 후 PIN 입력)
        console.log('[iros] 방법L-4: 고유번호탭 PIN 직접 입력');
        const pinRespPromise = resultPage.waitForResponse(
          r => r.url().includes('PinSrchCont') || r.url().includes('LocSrchCont'), {timeout:10000}
        ).catch(() => null);

        await resultPage.locator('[id*="pin_srch_tab"]').first().click({force:true}).catch(() => {});
        await resultPage.waitForTimeout(1500);

        const pinTabInputs = await resultPage.evaluate(() =>
          Array.from(document.querySelectorAll('input[type="text"],input:not([type])'))
            .map(el => ({id:el.id, ph:el.placeholder, val:el.value, cls:el.className.slice(0,30)}))
        ).catch(() => []);
        console.log('[iros] 방법L-4 PIN탭 입력필드:', JSON.stringify(pinTabInputs).slice(0,400));

        const parts = pinDash.split('-'); // ['1843','1996','070590']
        let filled = 0;
        for (const inp of pinTabInputs) {
          if (!inp.id || filled > 2) break;
          await resultPage.fill('#' + inp.id.replace(/:/g,'\\:'), parts[filled] || pinClean).catch(() => {});
          filled++;
        }
        if (filled === 0) {
          // 모든 input에 전체 핀 입력 시도
          await resultPage.locator('input[type="text"]').first().fill(pinDash).catch(() => {});
        }
        await resultPage.waitForTimeout(300);
        await resultPage.keyboard.press('Enter');

        const pinResp = await pinRespPromise;
        if (pinResp) {
          const txt = await pinResp.text().catch(() => '');
          console.log('[iros] 방법L-4 응답 status=' + pinResp.status() + ' preview:' + txt.slice(0,400));
          if (/표제부|갑구|을구|소유권|순위번호|등기원인|등기목적/.test(txt)) {
            res.json({ok:true, registryText:txt, registryHtml:'', address}); return;
          }
        }
        await resultPage.waitForTimeout(1500);
        rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
        console.log('[iros] 방법L 후 btn_smpl_rlrg:', rlrgCount);
      } catch(e) { console.log('[iros] 방법L 오류:', e.message); }
    }

    // ── 방법M: Playwright text locator "보기" 직접 클릭 (checkbox 우회) ──────────────
    if (rlrgCount === 0) {
      console.log('[iros] 방법M: "보기" 텍스트 버튼 직접 클릭 시도');
      try {
        // 새 팝업/탭 감지
        const newPagePromise = resultPage.context().waitForEvent('page', { timeout: 15000 }).catch(() => null);

        // waitForResponse: IROS POST XHR 감지
        const mRespPromise = resultPage.waitForResponse(
          r => r.url().includes('iros.go.kr') && r.request().method() !== 'GET',
          { timeout: 20000 }
        ).catch(() => null);

        // "보기" 버튼 목록 먼저 조사
        const bogiList = await resultPage.evaluate(() => {
          const all = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], span[role="button"]');
          return Array.from(all).filter(b => {
            const t = (b.textContent || b.value || b.innerText || '').trim();
            return t === '보기' || t.startsWith('보기');
          }).map(b => ({
            tag: b.tagName, id: b.id, cls: b.className.slice(0,40),
            txt: (b.textContent||b.value||'').trim().slice(0,10),
            vis: b.offsetParent !== null,
            rect: (() => { const r = b.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; })()
          }));
        });
        console.log('[iros] 방법M "보기" 목록:', JSON.stringify(bogiList).slice(0, 600));

        // Playwright locator로 첫 번째 "보기" 클릭
        const bogiBtns = resultPage.locator(':text-is("보기")');
        const bogiCount = await bogiBtns.count().catch(() => 0);
        console.log('[iros] 방법M locator count:', bogiCount);

        if (bogiCount > 0) {
          await bogiBtns.first().scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
          await bogiBtns.first().click({ timeout: 8000, force: true });
          console.log('[iros] 방법M: 첫 번째 "보기" 클릭 완료');
          await resultPage.waitForTimeout(2000);

          // XHR 응답 확인
          const mResp = await mRespPromise;
          if (mResp) {
            const mTxt = await mResp.text().catch(() => '');
            console.log('[iros] 방법M XHR:', mResp.url().split('/').slice(-1)[0], mResp.status(), mTxt.slice(0, 600));
          } else {
            console.log('[iros] 방법M XHR: 응답 없음 (팝업/탭 방식일 수 있음)');
          }

          // 새 탭/팝업 확인
          const newPage = await newPagePromise;
          if (newPage) {
            console.log('[iros] 방법M 새탭 열림:', newPage.url());
            await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
            const newContent = await newPage.evaluate(() => document.body.innerText.slice(0, 3000)).catch(() => '');
            console.log('[iros] 방법M 새탭 내용:', newContent.slice(0, 800));
            const newHtml = await newPage.content().catch(() => '');
            console.log('[iros] 방법M 새탭 HTML:', newHtml.slice(0, 1000));
            await newPage.close().catch(() => {});
          }

          // 현재 페이지 DOM 내용 캡처
          const afterContent = await resultPage.evaluate(() => {
            const modal = document.querySelector('[id*="layer"],[id*="modal"],[id*="pop"],[class*="layer"],[class*="modal"],[class*="pop"]');
            const modalTxt = modal ? modal.innerText.slice(0, 2000) : '';
            const allTxt = document.body.innerText.slice(0, 500);
            const rlrgBtnsNow = Array.from(document.querySelectorAll('[id*="btn_smpl_rlrg"],[id*="smpl_rlrg"]')).map(el=>({id:el.id,txt:el.textContent.trim().slice(0,20)}));
            return { modalTxt, allTxtSlice: allTxt, rlrgBtnsNow };
          });
          console.log('[iros] 방법M DOM 후:', JSON.stringify(afterContent).slice(0, 800));
          rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
        }
      } catch(e) { console.log('[iros] 방법M 오류:', e.message); }
    }

    // ── 방법N: grid 체크박스 탐색 + onclick 분석 + 네이티브 JS click ──────────────────
    if (rlrgCount === 0) {
      console.log('[iros] 방법N: grid 체크박스·onclick·JS click 종합');
      try {
        // N-0: 모든 요청 실시간 추적
        const nAllReqs = [];
        const nReqHandler = req => {
          const u = req.url();
          if (u.includes('iros.go.kr') && !u.includes('.js') && !u.includes('.css') && !u.includes('.png') && !u.includes('.gif'))
            nAllReqs.push(req.method() + ':' + u.split('/').pop().slice(0, 60));
        };
        resultPage.on('request', nReqHandler);

        // N-1: grid 내부 구조 분석 (cell_0_0 ~ cell_0_5, input 요소)
        const gridInfo = await resultPage.evaluate(() => {
          const grid = document.querySelector('[id*="grd_smpl_srch_rslt"]');
          const inputs = grid ? Array.from(grid.querySelectorAll('input')).slice(0, 6).map(i => ({
            id: i.id, type: i.type, checked: i.checked, val: i.value.slice(0, 20),
            rect: (() => { const r = i.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()
          })) : [];
          const cells = Array.from(document.querySelectorAll('[id*="cell_0_"]')).slice(0, 8).map(c => ({
            id: c.id, html: c.innerHTML.slice(0, 120)
          }));
          // 첫 번째 "보기" 버튼 onclick 분석
          const bogi = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '보기');
          const bogiInfo = bogi ? {
            outerHTML: bogi.outerHTML.slice(0, 300),
            onclick: bogi.onclick ? bogi.onclick.toString().slice(0, 200) : null,
            parentId: bogi.parentElement ? bogi.parentElement.id : null,
            parentOnclick: bogi.parentElement && bogi.parentElement.onclick ? bogi.parentElement.onclick.toString().slice(0, 200) : null,
          } : null;
          return { inputs, cells, bogiInfo };
        });
        console.log('[iros] 방법N grid분석:', JSON.stringify(gridInfo).slice(0, 1200));

        // N-2: navigator.webdriver 스푸핑 후 JS 네이티브 click
        await resultPage.evaluate(() => {
          try {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
          } catch (e) {}
          const bogi = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '보기');
          if (bogi) {
            bogi.focus();
            const ce = new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0, buttons: 1 });
            bogi.dispatchEvent(ce);
          }
        });
        await resultPage.waitForTimeout(3000);
        console.log('[iros] 방법N JS click 후 requests:', JSON.stringify(nAllReqs.splice(0)));

        // N-3: grid input[type=checkbox] 직접 클릭
        const chkSel = '[id*="grd_smpl_srch_rslt"] input[type="checkbox"], [id*="grd_smpl_srch_rslt"] input[type="radio"]';
        const chkCount = await resultPage.locator(chkSel).count().catch(() => 0);
        console.log('[iros] 방법N checkbox count:', chkCount);
        if (chkCount > 0) {
          const chkEl = resultPage.locator(chkSel).first();
          await chkEl.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
          await chkEl.click({ force: true });
          await resultPage.waitForTimeout(2000);
          const chkState = await resultPage.evaluate(() => {
            const c = document.querySelector('[id*="grd_smpl_srch_rslt"] input[type="checkbox"]');
            return c ? { checked: c.checked, id: c.id } : 'not found';
          });
          console.log('[iros] 방법N checkbox 클릭 후:', JSON.stringify(chkState));
          console.log('[iros] 방법N checkbox 클릭 requests:', JSON.stringify(nAllReqs.splice(0)));

          // 체크 후 "보기" 클릭
          await resultPage.locator(':text-is("보기")').first().click({ force: true });
          await resultPage.waitForTimeout(3000);
          console.log('[iros] 방법N 체크후보기 requests:', JSON.stringify(nAllReqs.splice(0)));
        }

        // N-4: cell_0_0 마우스 이벤트 시퀀스 (WebSquare 행선택 시뮬)
        const cell00 = await resultPage.evaluate(() => {
          const c = document.querySelector('[id*="grd_smpl_srch_rslt_cell_0_0"]');
          if (!c) return null;
          c.scrollIntoView({ block: 'center' });
          const r = c.getBoundingClientRect();
          return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
        });
        if (cell00) {
          console.log('[iros] 방법N cell_0_0 클릭:', JSON.stringify(cell00));
          await resultPage.mouse.move(cell00.x, cell00.y);
          await resultPage.mouse.down();
          await resultPage.waitForTimeout(50);
          await resultPage.mouse.up();
          await resultPage.waitForTimeout(2000);
          console.log('[iros] 방법N cell_0_0 mouse 클릭 requests:', JSON.stringify(nAllReqs.splice(0)));
        }

        resultPage.off('request', nReqHandler);
        rlrgCount = await resultPage.locator('[id*="btn_smpl_rlrg"]').count().catch(() => 0);
        console.log('[iros] 방법N 후 rlrgCount:', rlrgCount);
      } catch (e) { console.log('[iros] 방법N 오류:', e.message); }
    }

    // ── 방법O: 세션쿠키 직접 추출 + IROS REST API 직접 호출 ──────────────────────────
    // WebSquare headless 감지 우회: Playwright 브라우저 세션쿠키로 Node.js fetch() 직접 호출
    // (directApiContent는 방법S 블록 앞에서 이미 선언됨)
    if (rlrgCount === 0) {
      console.log('[iros] 방법O: 세션쿠키 추출 + 직접 HTTP 호출 시도');
      try {
        // O-1: 현재 세션의 모든 쿠키 추출
        const cookies = await resultPage.context().cookies();
        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log('[iros] 방법O 쿠키 개수:', cookies.length, '쿠키 키목록:', cookies.map(c=>c.name).join(',').slice(0,200));

        // O-2: 현재 페이지에서 sbm_* 글로벌·scwin 함수·첫 번째 행 PIN 추출
        const pageState = await resultPage.evaluate(() => {
          // sbm_* 전역 스캔
          const sbmKeys = Object.keys(window).filter(k => k.startsWith('sbm_'));
          const sbmInfo = sbmKeys.slice(0, 20).map(k => {
            const o = window[k];
            return { key: k, action: o && o.action, ref: o && o.ref, type: typeof o };
          });
          // scwin 함수 스캔
          const scwinFns = window.scwin ? Object.keys(window.scwin).filter(k => /(view|열람|smpl|rlrg|issue)/i.test(k)).slice(0,20) : [];
          // 그리드 첫 번째 행 텍스트 (주소·PIN 포함)
          const gridRows = Array.from(document.querySelectorAll('[id*="grd_smpl_srch_rslt"] tr, [id*="grid"] tr')).slice(0,3).map(r => r.innerText.slice(0,150));
          // 검색결과 PIN/고유번호 패턴 (xxxx-xxxx-xxxxxx)
          const pageText = document.body.innerText;
          const pinMatches = pageText.match(/\d{4}-\d{4}-\d{6}/g) || [];
          // XForms dma 인스턴스 스캔
          const dmaKeys = Object.keys(window).filter(k => k.startsWith('dma_')).slice(0,10);
          const dmaInfo = dmaKeys.map(k => {
            const o = window[k];
            const xml = o && o.xmlNode ? new XMLSerializer().serializeToString(o.xmlNode).slice(0,300) : '';
            return { key: k, xml };
          });
          return { sbmInfo, scwinFns, gridRows, pinMatches, dmaInfo };
        }).catch(e => ({ error: e.message }));
        console.log('[iros] 방법O 페이지상태:', JSON.stringify(pageState).slice(0, 2000));

        // O-3: 첫 번째 행 PIN으로 직접 API 호출 시도
        const irosBase = 'https://www.iros.go.kr';
        const commonHeaders = {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Content-Type': 'application/json',
          'Referer': 'https://www.iros.go.kr/index.jsp',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': cookieStr,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        };

        // PIN 목록 (pageState에서 추출한 것 + 주소 기반 검색에 필요한 파라미터)
        const pinList = (pageState.pinMatches || []).slice(0, 3);
        console.log('[iros] 방법O PIN 목록:', JSON.stringify(pinList));

        // O-0: callMpPrtIframe.do GET 직접 시도 (가장 확실한 방법)
        if (!directApiContent && pinList.length > 0) {
          console.log('[iros] 방법O-0: callMpPrtIframe.do 직접 GET 시도');
          for (const rawPin of pinList) {
            if (directApiContent) break;
            const pinClean = rawPin.replace(/-/g, '');
            for (const gbn of ['1', '2']) {
              const mpUrl = `https://www.iros.go.kr/biz/Pr20ViaMpPrtCtrl/callMpPrtIframe.do?IS_NMBR_LOGIN__=null&rnum=${pinClean}&rlrgGbn=${gbn}&payCl=F&smplKindCls=1`;
              try {
                const mpResp = await fetch(mpUrl, {
                  headers: {
                    ...commonHeaders,
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    Referer: 'https://www.iros.go.kr/index.jsp',
                  },
                  redirect: 'follow',
                }).catch(() => null);
                if (!mpResp) { console.log('[iros] 방법O-0 fetch 실패:', rawPin, gbn); continue; }
                const mpHtml = await mpResp.text().catch(() => '');
                // JS/CSS 제거 후 텍스트에서만 검증 (소재지번 등 지도JS 변수명 false positive 방지)
                const mpText = mpHtml
                  .replace(/<script[\s\S]*?<\/script>/gi, '')
                  .replace(/<style[\s\S]*?<\/style>/gi, '')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ').trim();
                console.log('[iros] 방법O-0 PIN=', rawPin, 'gbn=', gbn, 'status=', mpResp.status, 'htmlLen=', mpHtml.length, 'textLen=', mpText.length, 'preview:', mpText.slice(0, 200));
                // 엄격한 키워드 조합: JS 변수명에 나타나지 않는 복합어 사용
                if (/표제부|갑구|을구|소유권이전|순위번호|등기원인|근저당권/.test(mpText) && mpText.length > 500) {
                  console.log('[iros] 방법O-0: callMpPrtIframe 직접 fetch 성공! PIN=', rawPin, 'gbn=', gbn);
                  directApiContent = JSON.stringify({ type: 'method_o0', pin: rawPin, content: mpText, html: mpHtml.slice(0, 80000) });
                  rlrgCount = 999;
                  break;
                }
              } catch (e) { console.log('[iros] 방법O-0 오류:', e.message); }
            }
          }
        }

        // O-4: sbm_* 에서 retrieveSmplRlrgCont 계열 action URL 찾기
        const viewSbm = (pageState.sbmInfo || []).find(s => s.action && /(smpl|rlrg|view|Cont)/i.test(s.action));
        const candidateUrls = [
          '/biz/Pr20ViaRlrgSrchCtrl/retrieveSmplRlrgCont.do',
          '/biz/Pr20SmplRlrgCtrl/retrieveSmplRlrg.do',
          '/biz/Pr20ViaRlrgSrchCtrl/retrieveFreeCont.do',
          '/biz/Pr20ViaRlrgSrchCtrl/retrievePinSrchCont.do',
          '/biz/Pr20SmplRlrgCtrl/selectSmplRlrg.do',
          '/biz/Pr20SmplRlrgCtrl/retrieveRlrg.do',
          viewSbm ? viewSbm.action : null,
        ].filter(Boolean);
        console.log('[iros] 방법O 후보 URL:', JSON.stringify(candidateUrls));

        // O-5: 각 후보 URL에 직접 POST
        const firstPin = pinList[0] || '';
        const firstPinDash = firstPin.replace(/(\d{4})(\d{4})(\d{6})/, '$1-$2-$3');
        for (const relUrl of candidateUrls) {
          try {
            const fullUrl = relUrl.startsWith('http') ? relUrl : `${irosBase}${relUrl}?IS_NMBR_LOGIN__=null`;
            // 실제 IROS WebSquare dma_srch_param 파라미터 형식
            const bodyVariants = [
              // 배열 형식 (방법L에서 row0Obj와 동일)
              { websquare_param: [{ rnum: firstPin, rlrgGbn: '1', selGbn: 'UNI', smplKindCls: '1', payCl: 'F', col_chk: 'Y' }] },
              // 단일 객체 형식
              { websquare_param: { rnum: firstPin, rlrgGbn: '1', selGbn: 'UNI', smplKindCls: '1', payCl: 'F', col_chk: 'Y' } },
              // 대시 포함 PIN
              { websquare_param: [{ rnum: firstPinDash, rlrgGbn: '1', selGbn: 'UNI', smplKindCls: '1', payCl: 'F', col_chk: 'Y' }] },
              // prtAt 파라미터 명칭
              { websquare_param: { prtAt: firstPin, rlrgGbn: '1', smplKindCls: '1', payCl: 'F' } },
              // 기존 주소 기반 검색
              { websquare_param: { map: { srchGubun: '1', srchAdrs: address, pageNum: '1', pageSize: '10' } } },
              {},
            ];
            for (const body of bodyVariants) {
              const resp = await fetch(fullUrl, {
                method: 'POST',
                headers: commonHeaders,
                body: JSON.stringify(body),
              }).catch(e => ({ ok: false, _err: e.message }));
              if (resp._err) { console.log('[iros] 방법O fetch오류:', relUrl, resp._err); break; }
              const txt = await resp.text().catch(() => '');
              console.log('[iros] 방법O', relUrl, 'status:', resp.status, 'body:', txt.slice(0, 500));
              const isHtml = txt.includes('<!DOCTYPE') || txt.includes('<html') || txt.includes('document.location.href') || txt.includes('<script>');
              if (resp.status === 200 && txt.length > 100 && !isHtml && !txt.includes('"dataList":[]') && !txt.includes('"dataList": []')) {
                directApiContent = txt;
                console.log('[iros] 방법O 성공! content length:', txt.length);
                break;
              }
            }
            if (directApiContent) break;
          } catch (urlErr) { console.log('[iros] 방법O URL오류:', relUrl, urlErr.message); }
        }

        // O-6: 성공 시 rlrgCount 올려서 이후 단계 스킵 표시
        if (directApiContent) {
          rlrgCount = 999; // sentinel: 직접 API 성공
          // 디버그: 성공 내용을 파일로 저장 (확인용)
          try { writeFileSync('/tmp/iros-method-o-result.json', directApiContent); } catch(e) {}
          console.log('[iros] 방법O: 직접 API 성공 내용 전체:', directApiContent.slice(0, 1000));
          console.log('[iros] 방법O: 직접 API 성공, content 반환 준비');
        } else {
          // O-7: 실패시 보기 버튼 onclick 체인 분석 (핸들러 함수명 추출)
          const onclickInfo = await resultPage.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, td')).filter(b => (b.textContent||'').trim() === '보기' || (b.onclick||'').toString().includes('rlrg'));
            return btns.slice(0, 5).map(b => ({
              tag: b.tagName,
              id: b.id,
              onclick: b.onclick ? b.onclick.toString().slice(0, 200) : '',
              parentOnclick: b.parentElement ? (b.parentElement.onclick||'').toString().slice(0,200) : '',
              attrs: Array.from(b.attributes||[]).map(a=>({n:a.name,v:a.value.slice(0,80)})),
            }));
          }).catch(() => []);
          console.log('[iros] 방법O onclick분석:', JSON.stringify(onclickInfo).slice(0, 1500));
        }

      } catch (e) { console.log('[iros] 방법O 오류:', e.message, e.stack && e.stack.slice(0,300)); }
    }

    // ── 방법P: 팝업/새 탭 캡처 ─────────────────────────────────────────────────────────
    // "보기" 클릭 시 callMpPrtIframe.do로 팝업이 열림 → 팝업 내용 추출
    if (rlrgCount === 0) {
      console.log('[iros] 방법P: 팝업 캡처 시도');
      try {
        const popupPromise = resultPage.context().waitForEvent('page', { timeout: 20000 }).catch(() => null);
        const viewBtns = await resultPage.locator('button:has-text("보기")').all();
        console.log('[iros] 방법P 보기 버튼 수:', viewBtns.length);
        if (viewBtns.length > 0) {
          await viewBtns[0].click({ timeout: 5000 }).catch(() => {});
          const popup = await popupPromise;
          if (popup) {
            console.log('[iros] 방법P 팝업 열림 URL:', popup.url());
            await popup.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
            await resultPage.waitForTimeout(3000);
            const popupText = await popup.innerText('body').catch(() => '');
            const popupHtml = await popup.content().catch(() => '');
            console.log('[iros] 방법P 팝업 텍스트:', popupText.slice(0, 1000));
            console.log('[iros] 방법P 팝업 URL 최종:', popup.url());
            if (popupText.length > 200) {
              directApiContent = JSON.stringify({ type: 'popup_text', url: popup.url(), content: popupText, html: popupHtml.slice(0, 5000) });
              rlrgCount = 999;
              console.log('[iros] 방법P 성공! 팝업 텍스트 length:', popupText.length);
            }
            await popup.close().catch(() => {});
          } else {
            console.log('[iros] 방법P 팝업 없음 — iframe 방식으로 처리됐을 수 있음 (방법Q에서 처리)');
          }
        }
      } catch (e) { console.log('[iros] 방법P 오류:', e.message); }
    }

    // ── 방법T: WebSquare 내부 DataList에 PIN 직접 주입 → iframe이 parent DataList 읽도록 ──
    // callMpPrtIframe.do iframe은 window.parent의 dlt_smpl_srch_rslt DataList에서 rnum(PIN)을 읽음.
    // Playwright DOM 클릭으로는 WebSquare 내부 DataList가 갱신되지 않아 iframe AJAX 미발생.
    // 해결: 클릭 전에 DataList 직접 주입 + window.__iros_selected_rnum 폴백 설정.
    if (rlrgCount === 0 && capturedPin) {
      const pinDash = capturedPin.replace(/(\d{4})(\d{4})(\d{6})/, '$1-$2-$3');
      await resultPage.evaluate(({ pin, pinD }) => {
        try {
          const rowData = { rnum: pinD, selGbn: 'UNI', rlrgGbn: '1', smplKindCls: '1', payCl: 'F', col_chk: 'Y' };
          // WebSquare DataList 후보 키 탐색 (scwin 네임스페이스 포함)
          const dlCandidates = [
            'dlt_smpl_srch_rslt', 'mf_wfm_potal_main_wfm_content_dlt_smpl_srch_rslt',
            'mf_wfm_content_dlt_smpl_srch_rslt'
          ];
          dlCandidates.forEach(k => {
            const dl = window[k] || (window.scwin && window.scwin[k]);
            if (!dl) return;
            try { if (dl.setData) dl.setData([rowData]); } catch (_) {}
            try { if (dl.setRowData) dl.setRowData(0, rowData); } catch (_) {}
            try { if (dl.setCellData) { dl.setCellData(0, 'rnum', pinD); dl.setCellData(0, 'payCl', 'F'); } } catch (_) {}
          });
          // 폴백: window 전역에 직접 저장 (iframe이 window.parent.__iros_* 로 읽을 수 있도록)
          window.__iros_selected_rnum = pin;
          window.__iros_selected_rnum_dash = pinD;
          window.__iros_selected_rlrgGbn = '1';
          window.__iros_selected_payCl = 'F';
        } catch (e) { console.log('T-inject error', e.message); }
      }, { pin: capturedPin, pinD: pinDash }).catch(() => {});
      console.log('[iros] 방법T: WebSquare DataList PIN 주입 완료 PIN=', capturedPin, 'pinDash=', pinDash);
    }

    // ── 방법T2: DataList 주입 후 JS로 iframe 직접 생성 → WebSquare4 parent DataList 읽기 ──
    // 핵심: callMpPrtIframe.do 는 rnum을 URL파라미터가 아닌 window.parent.dlt_smpl_srch_rslt에서 읽음
    // → Playwright resultPage에 DataList를 세팅한 채로 iframe을 DOM에 직접 삽입하면 부모 참조 가능
    if (rlrgCount === 0 && capturedPin) {
      console.log('[iros] 방법T2: JS iframe 직접 삽입 PIN=', capturedPin);
      try {
        const pinDashT2 = capturedPin.replace(/(\d{4})(\d{4})(\d{6})/, '$1-$2-$3');
        const t2PopupPromise = resultPage.waitForEvent('popup', { timeout: 8000 }).catch(() => null);
        // iframe 삽입 (body에 직접 append)
        await resultPage.evaluate((pinD) => {
          const ifrSrc = `https://www.iros.go.kr/biz/Pr20ViaMpPrtCtrl/callMpPrtIframe.do?IS_NMBR_LOGIN__=null`;
          const ifr = document.createElement('iframe');
          ifr.id = '_iros_t2_iframe';
          ifr.src = ifrSrc;
          ifr.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;border:none;';
          document.body.appendChild(ifr);
          // iframe이 load되면 contentWindow.parent === window(resultPage) 이므로 DataList 접근 가능
        }, pinDashT2).catch(() => {});
        // 10초 대기 (WebSquare4 초기화 + AJAX)
        await resultPage.waitForTimeout(10000);
        // iframe frame 찾기
        const t2Frame = resultPage.frames().find(f => f.url().includes('callMpPrtIframe'));
        if (t2Frame) {
          const t2Text = await t2Frame.innerText('body').catch(() => '');
          const t2Log = await t2Frame.evaluate(() => window._irosXhrLog || []).catch(() => []);
          const t2RegData = await t2Frame.evaluate(() => window._irosXhrRegData || null).catch(() => null);
          console.log('[iros] 방법T2 iframe:', t2Frame.url(), 'XHR건수:', t2Log.length, '앞500:', t2Text.slice(0, 500));
          if (t2RegData) {
            directApiContent = JSON.stringify({ type: 'method_t2_xhr', url: t2RegData.url, content: t2RegData.body });
            rlrgCount = 999;
          } else if (_vrRe.test(t2Text)) {
            directApiContent = JSON.stringify({ type: 'method_t2_iframe', content: t2Text });
            rlrgCount = 999;
          } else if (t2Log.length > 0) {
            console.log('[iros] 방법T2 XHR로그(상위):', t2Log.slice(0, 3).map(x => x.url + '|' + x.len).join(', '));
          }
          if (rlrgCount === 999) {
            try { writeFileSync('/tmp/iros-method-t2-result.json', directApiContent); } catch(e) {}
            console.log('[iros] 방법T2 성공!');
          }
        } else {
          console.log('[iros] 방법T2 iframe 미생성');
        }
        // 삽입한 iframe 제거
        await resultPage.evaluate(() => { const el = document.getElementById('_iros_t2_iframe'); if (el) el.remove(); }).catch(() => {});
      } catch (e) { console.log('[iros] 방법T2 오류:', e.message); }
    }

    // ── 방법Q: _modal 제거 후 강제 클릭 → iframe 캡처 ────────────────────────────────
    if (rlrgCount === 0) {
      console.log('[iros] 방법Q: _modal 제거 + 강제 클릭 시도');
      try {
        const IFRAME_KW = /소유자|갑구|을구|순위번호|등기원인|등기목적|권리자|의무자|접수번호/;

        // Q-1: _modal / 프로세스바 / w2modal 전부 숨기기
        await resultPage.evaluate(() => {
          ['_modal', '___processbar2', '___processbar2_i'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.display = 'none'; el.style.pointerEvents = 'none'; el.style.zIndex = '-1'; }
          });
          document.querySelectorAll('.w2modal_popup, .w2modal_bg').forEach(el => {
            el.style.display = 'none'; el.style.pointerEvents = 'none'; el.style.zIndex = '-1';
          });
        }).catch(() => {});
        console.log('[iros] 방법Q _modal 제거 완료');

        const framesBefore = resultPage.frames().map(f => f.url());
        console.log('[iros] 방법Q 클릭 전 frames:', JSON.stringify(framesBefore));

        // Q-2: navigator.webdriver=false 패치 후 버튼이 실제로 visible되길 대기 (최대 10초)
        await resultPage.waitForTimeout(1500);
        const viewBtns2 = await resultPage.locator('td[data-col_id="mp_prt"]').all();
        console.log('[iros] 방법Q TD[mp_prt] 수:', viewBtns2.length);
        let clickDone = false;
        if (viewBtns2.length > 0) {
          // 일반 클릭 (webdriver=false 패치 후 visible이어야 함)
          await viewBtns2[0].click({ timeout: 5000 })
            .then(() => { clickDone = true; console.log('[iros] 방법Q 일반 클릭 성공'); })
            .catch(e => console.log('[iros] 방법Q 일반 클릭 오류:', e.message));
        }
        if (!clickDone) {
          // 내부 span/button/a 클릭 시도
          const innerBtn = resultPage.locator('td[data-col_id="mp_prt"] span, td[data-col_id="mp_prt"] button, td[data-col_id="mp_prt"] a').first();
          await innerBtn.click({ timeout: 3000 }).catch(() => {});
          clickDone = true;
          console.log('[iros] 방법Q 내부 span 클릭');
        }
        if (!clickDone) {
          await resultPage.evaluate(() => {
            const td = document.querySelector('td[data-col_id="mp_prt"]');
            if (td) {
              ['mousedown', 'mouseup', 'click'].forEach(t =>
                td.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
              );
            }
          }).catch(() => {});
          console.log('[iros] 방법Q JS MouseEvent dispatch');
          clickDone = true;
        }

        // Q-3: 뷰어 AJAX 캡처 우선 확인, 최대 40초 폴링 (false positive 수정 후 실제 iframe AJAX 대기 시간 확보)
        let _qWaited = 0;
        while (_qWaited < 40000 && rlrgCount === 0) {
          await resultPage.waitForTimeout(2000);
          _qWaited += 2000;
          if (_viewerAjaxContent) {
            console.log('[iros] 방법Q 뷰어AJAX 캡처 확인! 조기종료');
            directApiContent = JSON.stringify({ type: 'viewer_ajax', content: _viewerAjaxContent });
            rlrgCount = 999;
            break;
          }
        }

        if (rlrgCount === 0) {
          const framesAfter = resultPage.frames();
          console.log('[iros] 방법Q 클릭 후 frame 수:', framesAfter.length);
          for (const frame of framesAfter) {
            if (frame === resultPage.mainFrame()) continue;
            const frameUrl = frame.url();
            try {
              await frame.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
              const frameText = await frame.innerText('body').catch(() => '');
              const frameHtml = await frame.content().catch(() => '');
              // WebSquare DataList/Grid 직접 평가
              const wsData = await frame.evaluate(() => {
                const r = [];
                try {
                  if (window.w2 && window.w2.DataList) {
                    Object.entries(window.w2.DataList).slice(0, 15).forEach(([k, dl]) => {
                      try { r.push(k + '=' + JSON.stringify(dl.toJson ? dl.toJson() : '').slice(0, 500)); } catch (e) {}
                    });
                  }
                  const allTxt = Array.from(document.querySelectorAll('[id*="grd"],[id*="dma"],[id*="txt"],[id*="lbl"]'))
                    .map(el => el.innerText || '').filter(Boolean).join('|').slice(0, 2000);
                  if (allTxt) r.push('els=' + allTxt);
                  const bodyTxt = document.body.innerText || '';
                  if (bodyTxt.length > 50) r.push('body=' + bodyTxt.slice(0, 2000));
                } catch (e) { r.push('err=' + e.message); }
                return r.join('\n').slice(0, 5000);
              }).catch(() => '');
              console.log('[iros] 방법Q frame:', frameUrl, '| 앞300:', frameText.slice(0, 300));
              console.log('[iros] 방법Q frame WS:', wsData.slice(0, 300));
              if ((frameText.length > 100 && IFRAME_KW.test(frameText)) ||
                  (frameHtml.length > 500 && IFRAME_KW.test(frameHtml)) ||
                  (wsData.length > 100 && IFRAME_KW.test(wsData))) {
                const combined = frameText || wsData;
                directApiContent = JSON.stringify({ type: 'iframe', url: frameUrl, content: combined, html: frameHtml.slice(0, 8000), wsData });
                rlrgCount = 999;
                try { writeFileSync('/tmp/iros-method-q-result.json', directApiContent); } catch (e) {}
                console.log('[iros] 방법Q iframe 성공! length:', combined.length);
                break;
              }
            } catch (fe) { console.log('[iros] 방법Q frame 오류:', frameUrl, fe.message); }
          }
        }
      } catch (e) { console.log('[iros] 방법Q 오류:', e.message, e.stack && e.stack.slice(0, 300)); }
    }

    // ── 방법R: callMpPrtIframe.do frame에 PIN으로 직접 navigate ─────────────────────
    if (rlrgCount === 0) {
      console.log('[iros] 방법R: iframe 직접 navigate 시도');
      try {
        const IFRAME_KW_R = /소유자|갑구|을구|순위번호|등기원인|등기목적|권리자|의무자/;
        const iframeFrame = resultPage.frames().find(f => f.url().includes('callMpPrtIframe'));
        const firstPinR = await resultPage.evaluate(() => {
          const m = document.body.innerText.match(/\d{4}-\d{4}-\d{6}/);
          return m ? m[0].replace(/-/g, '') : '';
        }).catch(() => '');
        const firstPinDashR = firstPinR.replace(/(\d{4})(\d{4})(\d{6})/, '$1-$2-$3');
        console.log('[iros] 방법R iframe frame:', iframeFrame ? iframeFrame.url() : 'none', '| PIN:', firstPinR);
        if (iframeFrame && firstPinR) {
          const navUrls = [
            `https://www.iros.go.kr/biz/Pr20ViaMpPrtCtrl/callMpPrtIframe.do?IS_NMBR_LOGIN__=null&rnum=${firstPinR}&rlrgGbn=1&payCl=F&smplKindCls=1`,
            `https://www.iros.go.kr/biz/Pr20ViaMpPrtCtrl/callMpPrtIframe.do?IS_NMBR_LOGIN__=null&rnum=${firstPinDashR}&rlrgGbn=1&payCl=F&smplKindCls=1`,
          ];
          for (const navUrl of navUrls) {
            console.log('[iros] 방법R goto:', navUrl);
            // 프레임이 이미 올바른 URL에 있으면 goto 스킵 (중복 로드 방지)
            const alreadyAtUrl = iframeFrame.url().includes('callMpPrtIframe') && iframeFrame.url().includes('rnum=');
            if (!alreadyAtUrl) {
              await iframeFrame.goto(navUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => console.log('[iros] 방법R goto 오류:', e.message));
            } else {
              console.log('[iros] 방법R: 이미 올바른 URL — goto 스킵, 현재:', iframeFrame.url());
            }
            // WebSquare4 AJAX 완료 대기 (25초 — 정부 서버 느림)
            await resultPage.waitForTimeout(25000);
            const iframeText = await iframeFrame.innerText('body').catch(() => '');
            const iframeHtml = await iframeFrame.content().catch(() => '');
            const iframeXhrLog = await iframeFrame.evaluate(() => window._irosXhrLog || []).catch(() => []);
            const iframeXhrRegData = await iframeFrame.evaluate(() => window._irosXhrRegData || null).catch(() => null);
            console.log('[iros] 방법R frame URL:', iframeFrame.url(), '| 앞500:', iframeText.slice(0, 500));
            console.log('[iros] 방법R XHR건수:', iframeXhrLog.length, '| RegData:', iframeXhrRegData ? 'YES' : 'NO');
            if (iframeXhrLog.length > 0) {
              console.log('[iros] 방법R XHR로그(상위3):', iframeXhrLog.slice(0, 3).map(x => x.url + '|st=' + x.st + '|len=' + x.len + '|reg=' + x.reg).join(' / '));
            }
            if (iframeXhrRegData) {
              directApiContent = JSON.stringify({ type: 'iframe_r_xhr', url: iframeXhrRegData.url, content: iframeXhrRegData.body });
              rlrgCount = 999;
              try { writeFileSync('/tmp/iros-method-r-result.json', directApiContent); } catch(e) {}
              console.log('[iros] 방법R XHR 성공! length:', iframeXhrRegData.body.length);
              break;
            }
            if (iframeText.length > 200 && IFRAME_KW_R.test(iframeText)) {
              directApiContent = JSON.stringify({ type: 'iframe_direct', url: iframeFrame.url(), content: iframeText, html: iframeHtml.slice(0, 8000) });
              rlrgCount = 999;
              try { writeFileSync('/tmp/iros-method-r-result.json', directApiContent); } catch(e) {}
              console.log('[iros] 방법R 텍스트 성공! length:', iframeText.length);
              break;
            }
          }
        }
      } catch (e) { console.log('[iros] 방법R 오류:', e.message); }
    }

    // ── 방법S4: POST callMpPrtIframe.do (credentials:include, PIN 포함) ───────────────
    if (rlrgCount === 0 && capturedPin) {
      console.log('[iros] 방법S4: POST callMpPrtIframe.do PIN=', capturedPin);
      try {
        const s4 = await resultPage.evaluate(async (pin) => {
          try {
            const pinDash = pin.replace(/(\d{4})(\d{4})(\d{6})/, '$1-$2-$3');
            const p = new URLSearchParams({ rnum: pinDash, rlrgGbn: '1', payCl: 'F', smplKindCls: '1' });
            const r = await fetch('/biz/Pr20ViaMpPrtCtrl/callMpPrtIframe.do?IS_NMBR_LOGIN__=null', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: p.toString(),
              credentials: 'include'
            });
            const t = await r.text();
            return { status: r.status, len: t.length, body: t.slice(0, 10000) };
          } catch (e) { return { err: e.message }; }
        }, capturedPin).catch(e => ({ err: e.message }));
        console.log('[iros] 방법S4:', s4.status, 'len=', s4.len, '앞500=', (s4.body || '').slice(0, 500));
        if (s4.body && _vrRe.test(s4.body)) {
          directApiContent = JSON.stringify({ type: 'post_viewer', content: s4.body });
          rlrgCount = 999;
          try { writeFileSync('/tmp/iros-method-s4-result.json', directApiContent); } catch (e) {}
          console.log('[iros] 방법S4 등기 데이터 확보!');
        }
        // 원본 PIN(대시 없이)으로도 시도
        if (rlrgCount === 0 && s4.len < 500) {
          const s4b = await resultPage.evaluate(async (pin) => {
            try {
              const p = new URLSearchParams({ rnum: pin, rlrgGbn: '1', payCl: 'F', smplKindCls: '1' });
              const r = await fetch('/biz/Pr20ViaMpPrtCtrl/callMpPrtIframe.do?IS_NMBR_LOGIN__=null', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: p.toString(),
                credentials: 'include'
              });
              const t = await r.text();
              return { status: r.status, len: t.length, body: t.slice(0, 10000) };
            } catch (e) { return { err: e.message }; }
          }, capturedPin).catch(e => ({ err: e.message }));
          console.log('[iros] 방법S4b (원본PIN):', s4b.status, 'len=', s4b.len, '앞500=', (s4b.body || '').slice(0, 500));
          if (s4b.body && _vrRe.test(s4b.body)) {
            directApiContent = JSON.stringify({ type: 'post_viewer_raw', content: s4b.body });
            rlrgCount = 999;
            console.log('[iros] 방법S4b 등기 데이터 확보!');
          }
        }
      } catch (e) { console.log('[iros] 방법S4 오류:', e.message); }
    }

    // ── 방법S4-뷰어AJAX: 클릭 후 캡처된 뷰어 AJAX 최종 확인 ─────────────────────────
    if (rlrgCount === 0 && _viewerAjaxContent) {
      console.log('[iros] 방법S4-뷰어AJAX: 이미 캡처된 뷰어 응답 사용');
      directApiContent = JSON.stringify({ type: 'viewer_ajax_late', content: _viewerAjaxContent });
      rlrgCount = 999;
    }

    // ── 방법W: WebSquare4 scwin 함수 직접 호출 (클릭 시뮬레이션 없이) ───────────────────
    if (rlrgCount === 0 && capturedPin) {
      console.log('[iros] 방법W: scwin 함수 직접 호출 PIN=', capturedPin);
      try {
        const pinDashW = capturedPin.replace(/(\d{4})(\d{4})(\d{6})/, '$1-$2-$3');
        // 현재 scwin 함수 중 열람/조회 관련 함수 찾기
        const wFnInfo = await resultPage.evaluate(({ pin, pinD }) => {
          const cands = window.scwin ? Object.keys(window.scwin).filter(k => /(view|열람|smpl|rlrg|prt|issue|조회)/i.test(k)) : [];
          // DataList에 올바른 row 세팅
          const dlKeys = ['dlt_smpl_srch_rslt', 'mf_wfm_potal_main_wfm_content_dlt_smpl_srch_rslt', 'mf_wfm_content_dlt_smpl_srch_rslt'];
          const rowData = { rnum: pinD, selGbn: 'UNI', rlrgGbn: '1', smplKindCls: '1', payCl: 'F', col_chk: 'Y', smplPrntOrdrNo: '' };
          dlKeys.forEach(k => {
            const dl = window[k] || (window.scwin && window.scwin[k]);
            if (dl && dl.setData) try { dl.setData([rowData]); } catch(_) {}
            if (dl && dl.setRowData) try { dl.setRowData(0, rowData); } catch(_) {}
          });
          // fn_view_smpl_rlrg, fn_smpl_view, fn_rlrg_view 등 시도
          const tryFns = ['fn_view_smpl_rlrg', 'fn_smpl_rlrg_view', 'fn_smpl_view', 'fn_rlrg', 'fn_prt_view', 'fn_smplRlrgView'];
          const called = [];
          for (const fn of tryFns) {
            if (window.scwin && typeof window.scwin[fn] === 'function') {
              try { window.scwin[fn](0); called.push(fn + '(0)'); } catch(e) { called.push(fn + ':err:' + e.message); }
            }
          }
          // 발견한 후보 함수들도 첫 번째 것 호출
          if (called.length === 0 && cands.length > 0) {
            const fn = cands[0];
            try { window.scwin[fn](0); called.push(fn + '(0)-cand'); } catch(e) { called.push(fn + ':err:' + e.message); }
          }
          return { cands, called };
        }, { pin: capturedPin, pinD: pinDashW }).catch(e => ({ err: e.message }));
        console.log('[iros] 방법W scwin 후보:', JSON.stringify(wFnInfo));
        // 새 팝업 또는 응답 대기 (10초)
        const wPopupPromise = resultPage.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
        const wNewPage = await wPopupPromise;
        if (wNewPage) {
          await wNewPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
          await wNewPage.waitForTimeout(8000);
          const wText = await wNewPage.innerText('body').catch(() => '');
          const wLog = await wNewPage.evaluate(() => window._irosXhrLog || []).catch(() => []);
          const wRegData = await wNewPage.evaluate(() => window._irosXhrRegData || null).catch(() => null);
          console.log('[iros] 방법W 팝업 URL:', wNewPage.url(), 'XHR건수:', wLog.length, '본문앞300:', wText.slice(0, 300));
          await wNewPage.screenshot({ path: '/home/opc/iros-debug/step7-method-w.png', fullPage: true }).catch(() => {});
          if (wRegData) {
            directApiContent = JSON.stringify({ type: 'method_w_xhr', url: wRegData.url, content: wRegData.body });
            rlrgCount = 999;
          } else if (_vrRe.test(wText)) {
            directApiContent = JSON.stringify({ type: 'method_w_popup', content: wText });
            rlrgCount = 999;
          }
          if (rlrgCount === 999) {
            try { writeFileSync('/tmp/iros-method-w-result.json', directApiContent); } catch(e) {}
            console.log('[iros] 방법W 성공!');
          }
          await wNewPage.close().catch(() => {});
        } else {
          // 팝업 없으면 resultPage 내 iframe 확인
          await resultPage.waitForTimeout(3000);
          const wFrame = resultPage.frames().find(f => f.url().includes('callMpPrtIframe') || f.url().includes('smplRlrg'));
          if (wFrame) {
            const wFrameText = await wFrame.innerText('body').catch(() => '');
            const wFrameLog = await wFrame.evaluate(() => window._irosXhrLog || []).catch(() => []);
            console.log('[iros] 방법W iframe:', wFrame.url(), 'XHR건수:', wFrameLog.length, '앞300:', wFrameText.slice(0, 300));
            if (_vrRe.test(wFrameText)) {
              directApiContent = JSON.stringify({ type: 'method_w_iframe', content: wFrameText });
              rlrgCount = 999;
              console.log('[iros] 방법W iframe 성공!');
            }
          } else {
            console.log('[iros] 방법W 팝업/iframe 없음');
          }
        }
      } catch (e) { console.log('[iros] 방법W 오류:', e.message); }
    }

    // ── 방법U: 뷰어를 독립 신규 탭에서 열기 (parent iframe 의존 제거) ─────────────────
    if (rlrgCount === 0 && capturedPin) {
      console.log('[iros] 방법U: 독립 신규 탭에서 뷰어 열기 PIN=', capturedPin);
      let uPage;
      try {
        const pinDashU = capturedPin.replace(/(\d{4})(\d{4})(\d{6})/, '$1-$2-$3');
        uPage = await context.newPage();
        // window.opener / window.parent mock 주입 — WebSquare4 뷰어가 부모창 DataList에서 PIN 읽을 때 대비
        await uPage.addInitScript(({ pin, pinD }) => {
          const fakeRow = { rnum: pinD, selGbn: 'UNI', rlrgGbn: '1', smplKindCls: '1', payCl: 'F', col_chk: 'Y', smplPrntOrdrNo: '' };
          const fakeDl = {
            getRowData: () => fakeRow, getData: () => [fakeRow], getRowCount: () => 1,
            getValue: (col) => fakeRow[col] || '',
          };
          const fakeCtx = {};
          ['dlt_smpl_srch_rslt', 'mf_wfm_potal_main_wfm_content_dlt_smpl_srch_rslt', 'mf_wfm_content_dlt_smpl_srch_rslt'].forEach(k => { fakeCtx[k] = fakeDl; });
          fakeCtx.scwin = fakeCtx;
          fakeCtx.__iros_selected_rnum = pin;
          fakeCtx.__iros_selected_rnum_dash = pinD;
          // opener mock (팝업으로 열렸을 때 WebSquare4가 window.opener에서 데이터 읽는 경우)
          try { Object.defineProperty(window, 'opener', { get: () => fakeCtx, configurable: true }); } catch(_) {}
          // parent mock도 주입 (standalone 탭에서 window.parent === window 이지만 혹시 재정의 필요한 경우)
          window.__irosParentMock = fakeCtx;
        }, { pin: capturedPin, pinD: pinDashU });

        // 뷰어 URL — IS_NMBR_LOGIN__ 을 실제 로그인 여부와 무관하게 'Y'로 지정해보기
        const viewerUrlY = `https://www.iros.go.kr/biz/Pr20ViaMpPrtCtrl/callMpPrtIframe.do?IS_NMBR_LOGIN__=Y&rnum=${pinDashU}&rlrgGbn=1&payCl=F&smplKindCls=1&smplPrntOrdrNo=`;
        const viewerUrlN = `https://www.iros.go.kr/biz/Pr20ViaMpPrtCtrl/callMpPrtIframe.do?IS_NMBR_LOGIN__=null&rnum=${pinDashU}&rlrgGbn=1&payCl=F&smplKindCls=1&smplPrntOrdrNo=`;
        console.log('[iros] 방법U 이동:', viewerUrlY);
        await uPage.goto(viewerUrlY, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('[iros] 방법U goto 오류(Y):', e.message));
        await uPage.waitForTimeout(3000);
        // WebSquare4 초기화 상태 진단
        const uWs = await uPage.evaluate(() => {
          const urlP = Object.fromEntries(new URLSearchParams(location.search));
          const scwinKeys = window.scwin ? Object.keys(window.scwin).slice(0, 20) : [];
          const w2Keys = window.w2 ? Object.keys(window.w2).slice(0, 10) : [];
          return { url: location.href, urlParams: urlP, scwinKeys, w2Keys, hasScwin: !!window.scwin, hasW2: !!window.w2 };
        }).catch(() => ({}));
        console.log('[iros] 방법U WebSquare4 상태:', JSON.stringify(uWs));
        // 5초 시점 XHR/fetch 로그
        const uLog5 = await uPage.evaluate(() => window._irosXhrLog || []).catch(() => []);
        console.log('[iros] 방법U 5초 XHR/fetch 로그 건수:', uLog5.length, uLog5.map(x => x.url + '|' + x.len).join(', ').slice(0, 500));
        await uPage.waitForTimeout(20000);
        const uLog25 = await uPage.evaluate(() => window._irosXhrLog || []).catch(() => []);
        const uRegData = await uPage.evaluate(() => window._irosXhrRegData || null).catch(() => null);
        console.log('[iros] 방법U 25초 XHR/fetch 로그 건수:', uLog25.length, uLog25.map(x => x.url + '|' + x.len).join(', ').slice(0, 500));
        const uBodyText = await uPage.innerText('body').catch(() => '');
        const uBodyHtml = await uPage.content().catch(() => '');
        await uPage.screenshot({ path: '/home/opc/iros-debug/step7-method-u.png', fullPage: true }).catch(() => {});
        console.log('[iros] 방법U 본문 앞800:', uBodyText.slice(0, 800));
        if (uRegData) {
          console.log('[iros] 방법U 등기 데이터 XHR/fetch에서 확보!', uRegData.url, 'len=', uRegData.body.length);
          directApiContent = JSON.stringify({ type: 'method_u_xhr', url: uRegData.url, content: uRegData.body });
          rlrgCount = 999;
          try { writeFileSync('/tmp/iros-method-u-result.json', directApiContent); } catch(e) {}
        } else if (_vrRe.test(uBodyText)) {
          console.log('[iros] 방법U 본문에서 등기 키워드 발견!');
          directApiContent = JSON.stringify({ type: 'method_u_body', content: uBodyText, html: uBodyHtml.slice(0, 8000) });
          rlrgCount = 999;
          try { writeFileSync('/tmp/iros-method-u-result.json', directApiContent); } catch(e) {}
        } else if (uLog25.length === 0) {
          // XHR/fetch 0건이면 IS_NMBR_LOGIN__=null 로도 시도
          console.log('[iros] 방법U Y 실패, null로 재시도');
          await uPage.goto(viewerUrlN, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('[iros] 방법U goto 오류(N):', e.message));
          await uPage.waitForTimeout(20000);
          const uLog25n = await uPage.evaluate(() => window._irosXhrLog || []).catch(() => []);
          const uRegDataN = await uPage.evaluate(() => window._irosXhrRegData || null).catch(() => null);
          console.log('[iros] 방법U null 25초 XHR/fetch 건수:', uLog25n.length);
          const uBodyTextN = await uPage.innerText('body').catch(() => '');
          await uPage.screenshot({ path: '/home/opc/iros-debug/step7-method-u-null.png', fullPage: true }).catch(() => {});
          if (uRegDataN) {
            directApiContent = JSON.stringify({ type: 'method_u_null_xhr', url: uRegDataN.url, content: uRegDataN.body });
            rlrgCount = 999;
          } else if (_vrRe.test(uBodyTextN)) {
            directApiContent = JSON.stringify({ type: 'method_u_null_body', content: uBodyTextN });
            rlrgCount = 999;
          }
          if (rlrgCount === 999) {
            try { writeFileSync('/tmp/iros-method-u-result.json', directApiContent); } catch(e) {}
            console.log('[iros] 방법U null 성공!');
          } else {
            console.log('[iros] 방법U 완전 실패 — XHR/fetch 0건, 등기 키워드 없음');
          }
        }
      } catch (e) { console.log('[iros] 방법U 오류:', e.message); }
      finally { if (uPage) await uPage.close().catch(() => {}); }
    }

    // ── 최종 상태 스냅샷 (모든 방법 후) ──────────────────────────────────────────────
    {
      await resultPage.screenshot({ path: '/home/opc/iros-debug/step5b-all-methods.png', fullPage: true }).catch(() => {});
      const finalPageInfo = await resultPage.evaluate(() => ({
        url: location.href,
        rlrgBtns: Array.from(document.querySelectorAll('[id*="btn_smpl_rlrg"],[id*="smpl_rlrg"]')).map(el => ({ id: el.id, vis: el.style.display !== 'none', txt: el.textContent.trim().slice(0,20) })),
        allBtns: Array.from(document.querySelectorAll('button,a,input[type=button]')).filter(el => /(열람|발급|조회|간편)/.test(el.textContent || el.value || el.id)).slice(0,10).map(el => ({ id: el.id, txt: (el.textContent||el.value||'').trim().slice(0,30) })),
        capturedReqs: typeof _capturedPosts !== 'undefined' ? 'external' : 'none',
      })).catch(() => ({}));
      console.log('[iros] 최종 상태:', JSON.stringify(finalPageInfo));
    }

    // 방법S/O 직접 API 성공 시 조기 반환
    if (directApiContent) {
      console.log('[iros] 직접API 결과 반환 (방법S/O)');
      let _dac = {};
      try { _dac = JSON.parse(directApiContent); } catch(_) { _dac = { content: directApiContent, html: '' }; }
      const _dacText = _dac.content || _dac.text || directApiContent;
      const _dacHtml = _dac.html || '';
      res.json({ ok: true, registryText: _dacText, registryHtml: _dacHtml, address });
      return;
    }

    // 열람 버튼 활성화 대기
    await resultPage.waitForSelector('[id*="btn_smpl_rlrg"]', { timeout: 4000 }).catch(() => {});
    await resultPage.waitForTimeout(500);

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
    // 디버그: 체크박스 클릭 후 wfm_content 버튼 전체 상태 (disabled 포함)
    {
      const allContentBtns = await resultPage.evaluate(() => {
        return Array.from(document.querySelectorAll('[id*="wfm_content"] input[type="button"],[id*="wfm_content"] button,[id*="wfm_content"] a'))
          .map(el => ({
            id: el.id.slice(-50),
            txt: (el.textContent || el.getAttribute('value') || '').trim().slice(0, 20),
            vis: el.offsetParent !== null,
            disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
          }))
          .slice(0, 20);
      }).catch(() => []);
      console.log('[iros] content 버튼 전체:', JSON.stringify(allContentBtns));
    }
    // ⚠️ IROS SPA 특성: 상단 nav에 항상 "열람·발급" 텍스트가 있음 (중간점 ·)
    //    content area의 실제 열람 버튼은 "열람" 또는 "발급"만 포함 (중간점 없음)
    //    nav 제외 기준: id에 gnb/menu/lnb 포함, 또는 텍스트에 "·" 포함
    //    "지도위치확인"·"지도보기" 버튼은 열람 버튼이 아님 — 반드시 제외
    //    간편열람 전용 버튼: btn_smpl_rlrg (체크박스 선택 후 활성화)
    const issueCandidates = [
      // 0순위: 간편열람(smpl) 전용 버튼 ID — 체크박스 선택 후 활성화되는 열람 버튼
      '[id*="btn_smpl_rlrg"]',
      '[id*="btn_smpl_view"]',
      '[id*="btn_smpl_issue"]',
      // 1순위: input 버튼 (value에 "열람"/"발급" 정확히 포함 — nav에는 input type=button 없음)
      'input[type="button"][value*="열람"]',
      'input[type="button"][value*="발급"]',
      'input[type="button"][value*="VIEW"]',
      // 2순위: onclick 패턴 (IROS 소문자/대문자 혼용)
      'a[onclick*="열람"], a[onclick*="발급"], a[onclick*="view"], a[onclick*="View"]',
      'button[onclick*="열람"], button[onclick*="발급"]',
      // 3순위: td 내부 링크/버튼 (grid row action cell — nav에는 td 없음)
      'td > a:has-text("열람"), td > a:has-text("발급")',
      'td > button:has-text("열람"), td > button:has-text("발급")',
      // 4순위: content 영역 내 열람/발급 텍스트 포함
      '[id*="wfm_content"] a:has-text("열람"), [id*="wfm_content"] button:has-text("열람")',
      '[id*="wfm_content"] a:has-text("발급"), [id*="wfm_content"] button:has-text("발급")',
      // 5순위: ID 기반 content 버튼 — 가장 마지막 폴백 (지도/map 관련 제외)
      '[id*="wfm_content"][id*="btn_view"], [id*="wfm_content"][id*="btn_rlrg"]',
      '[id*="wfm_content"][id*="btn"]',
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
            // 지도 관련 버튼 제외 (지도위치확인, 지도보기, map 등)
            if (/지도|map|mp_cfrm/i.test(info.txt) || /mp_cfrm|btn_map|btn_mp/i.test(info.id)) continue;
            // 초기화·검색·전체선택 등 비열람 버튼 제외
            if (/초기화|smpl_init|btn_init/i.test(info.txt) || /smpl_init|btn_init/i.test(info.id)) continue;
            if (/btn_smpl_srch|btn_srch|btn_search/i.test(info.id)) continue;
            if (/^검색$|^전체선택|^전제선택|^초기화$/.test(info.txt)) continue;
            // 전세사기 피해예방 체크리스트, 전체선택 등 비열람 버튼 제외
            if (/btn_check_list|check_list|btn_chk_all/i.test(info.id)) continue;
            if (/체크리스트|피해예방|전세사기/.test(info.txt)) continue;
            // 간편열람(smpl) 전용 버튼은 vis 무관하게 포함 (체크박스 선택 직후 disabled 상태일 수 있음)
            const isSmplBtn = /btn_smpl_rlrg|btn_smpl_view|btn_smpl_issue/.test(info.id);
            if (!info.vis && !isSmplBtn) continue;
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

    console.log('[iros] 열람 버튼 클릭');
    // 간편열람: 열람 버튼 클릭 후 팝업이 열리거나 동일 페이지에 내용이 나타남 (무료 — 결제 없음)
    const [issuePopup] = await Promise.all([
      context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
      issueBtn.click({ force: true }).catch(async (e) => {
        console.log('[iros] issueBtn click 실패:', e.message, '— evaluate 폴백');
        const eh = await issueBtn.elementHandle().catch(() => null);
        if (eh) await issuePage.evaluate(el => el.click(), eh).catch(() => {});
      }),
    ]);

    // 열린 팝업 수집 (간편열람은 새 팝업창으로 내용을 보여줌)
    let viewPage = resultPage;
    if (issuePopup) {
      console.log('[iros] 열람 팝업 감지:', issuePopup.url());
      await issuePopup.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      viewPage = issuePopup;
    }
    await viewPage.waitForTimeout(2000);

    // 간편열람 확인 모달 처리 (발급 전 확인창 자동 클릭)
    for (const pg of [viewPage, resultPage]) {
      try {
        const confirmSels = [
          'button:has-text("확인")', 'button:has-text("열람")', 'button:has-text("발급")',
          'input[type="button"][value="확인"]', 'input[type="button"][value="발급"]',
          '[id*="btn_ok"]', '[id*="btn_confirm"]', '[id*="btnOk"]', '[id*="btn_smpl_ok"]',
        ];
        for (const csel of confirmSels) {
          const cloc = pg.locator(csel).first();
          if (await cloc.count().catch(() => 0) > 0 && await cloc.isVisible().catch(() => false)) {
            const ctxt = await cloc.evaluate(el => (el.textContent || el.getAttribute('value') || '').trim()).catch(() => '');
            // 확인/발급 버튼만 (취소·닫기 제외)
            if (/취소|닫기|cancel|close/i.test(ctxt)) continue;
            console.log('[iros] 확인 모달 버튼 클릭:', ctxt, csel);
            await cloc.click({ force: true, timeout: 5000 }).catch(() => {});
            await pg.waitForTimeout(2000);
            break;
          }
        }
      } catch {}
    }

    // context 내 모든 페이지에서 등기부 내용 확인 (팝업이 다른 경로로 열릴 수 있음)
    await viewPage.waitForTimeout(2000);
    const allCtxPages = context.pages();
    console.log('[iros] 열람 후 페이지 수:', allCtxPages.length, allCtxPages.map(p => p.url().slice(0, 60)));

    // 7단계: 등기부 내용 추출 (간편열람 = HTML 직접 — 다운로드 없음)
    // 등기부 키워드 정규식
    const REGISTRY_RE = /표제부|갑구|을구|소유권|순위번호|접수|등기원인|등기목적|근저당|채권최고액|채무자|저당권|전세권/;

    async function extractRegistryText(page) {
      try {
        // iframe 포함 모든 컨텍스트 확인
        const ctxList = [page, ...page.frames()];
        for (const ctx of ctxList) {
          const txt = await ctx.evaluate(() => (document.body || document.documentElement).innerText || '').catch(() => '');
          if (REGISTRY_RE.test(txt)) {
            // 표/전체 HTML도 함께 추출
            const html = await ctx.evaluate(() => (document.body || document.documentElement).innerHTML || '').catch(() => '');
            return { text: txt, html: html.slice(0, 80000) };
          }
        }
      } catch {}
      return null;
    }

    let registryExtracted = null;
    // 열람 팝업부터 체크
    for (const pg of [viewPage, ...allCtxPages]) {
      registryExtracted = await extractRegistryText(pg);
      if (registryExtracted) {
        console.log('[iros] 등기부 내용 감지 URL:', pg.url(), '텍스트 길이:', registryExtracted.text.length);
        await pg.screenshot({ path: '/home/opc/iros-debug/step7-registry.png', fullPage: true }).catch(() => {});
        break;
      }
    }

    if (!registryExtracted) {
      // 더 기다려 본 후 재시도
      await viewPage.waitForTimeout(3000);
      for (const pg of [viewPage, ...context.pages()]) {
        registryExtracted = await extractRegistryText(pg);
        if (registryExtracted) {
          console.log('[iros] 재시도 후 등기부 감지:', pg.url());
          break;
        }
      }
    }

    if (!registryExtracted) {
      const curUrl = viewPage.url();
      const bodySnip = await viewPage.evaluate(() => (document.body?.innerText||'').slice(0, 400)).catch(() => '');
      console.log('[iros] 등기부 내용 없음. URL:', curUrl, '| 내용:', bodySnip);
      await viewPage.screenshot({ path: '/home/opc/iros-debug/step7-fail.png', fullPage: true }).catch(() => {});
      throw new Error(`등기부 내용 미감지 — IROS 발급 흐름 미완료 (URL: ${curUrl})`);
    }

    console.log('[iros] 등기부 추출 성공. 텍스트:', registryExtracted.text.slice(0, 200));
    res.json({ ok: true, registryText: registryExtracted.text, registryHtml: registryExtracted.html, address });
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

// 디버그: IROS 스크린샷 반환 (step 파라미터로 선택, 기본 step4)
app.get('/api/iros-screenshot', async (req, res) => {
  try {
    const { readFile: rf, readdir: rd } = await import('fs/promises');
    const step = req.query.step || 'step4-search';
    const dir = '/home/opc/iros-debug';
    // ?list=1 이면 파일 목록 반환
    if (req.query.list) {
      const files = await rd(dir).catch(() => []);
      return res.json({ files });
    }
    const imgBuf = await rf(`${dir}/${step}.png`);
    res.setHeader('Content-Type', 'image/png');
    res.send(imgBuf);
  } catch {
    res.status(404).json({ error: '스크린샷 없음 — IROS 테스트 먼저 실행. ?list=1 로 파일 목록 확인' });
  }
});

// ── /api/iros-selftest  자동 IROS 테스트 (루틴·CI용, POST로 credentials 수신) ─────
// 사용: curl -X POST http://localhost:8080/api/iros-selftest \
//        -H 'Content-Type: application/json' \
//        -d '{"irosId":"kdh3103","irosPw":"PASSWORD","address":"부산광역시 수영구 수영로 668"}'
app.post('/api/iros-selftest', async (req, res) => {
  const {
    irosId = process.env.IROS_USER_ID,
    irosPw = process.env.IROS_USER_PW,
    address = '부산광역시 수영구 수영로 668',
  } = req.body || {};
  if (!irosId || !irosPw) {
    return res.status(400).json({ error: 'irosId/irosPw 필수 (또는 IROS_USER_ID/IROS_USER_PW 환경변수)' });
  }
  const startMs = Date.now();
  try {
    const port = process.env.PORT || 8080;
    const ctrl = new AbortController();
    const tout = setTimeout(() => ctrl.abort(), 300000);
    const resp = await fetch(`http://localhost:${port}/api/iros-fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, irosId, irosPw }),
      signal: ctrl.signal,
    });
    clearTimeout(tout);
    const data = await resp.json().catch(() => ({ ok: false, error: 'JSON parse fail' }));
    const elapsed = Date.now() - startMs;
    console.log(`[iros-selftest] ${data.ok ? 'OK' : 'FAIL'} ${elapsed}ms`);
    res.json({
      ok: data.ok,
      elapsed,
      preview: data.registryText ? data.registryText.slice(0, 300) : null,
      error: data.error || null,
      address,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, elapsed: Date.now() - startMs });
  }
});

// ── /claude-proxy  Anthropic API 중계 (Cloudflare Workers IP 차단 우회) ─────────
// Node.js 내장 https 모듈 사용 — Node < 18 fetch() 미지원 우회
app.post('/claude-proxy', (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY || req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'ANTHROPIC_API_KEY not set on Oracle VM' });
  const bodyStr = JSON.stringify(req.body);
  const reqHeaders = {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(bodyStr),
    'x-api-key': apiKey,
    'anthropic-version': req.headers['anthropic-version'] || '2023-06-01'
  };
  if (process.env.ANTHROPIC_WORKSPACE_ID) {
    reqHeaders['anthropic-workspace-id'] = process.env.ANTHROPIC_WORKSPACE_ID;
  }
  const options = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: reqHeaders,
    timeout: 120000
  };
  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => { data += chunk; });
    proxyRes.on('end', () => {
      try { res.status(proxyRes.statusCode).json(JSON.parse(data)); }
      catch (e) { res.status(proxyRes.statusCode).send(data); }
    });
  });
  proxyReq.on('error', (e) => {
    console.error('[claude-proxy] https error:', e.message);
    if (!res.headersSent) res.status(502).json({ error: e.message });
  });
  proxyReq.on('timeout', () => {
    console.error('[claude-proxy] timeout');
    proxyReq.destroy();
    if (!res.headersSent) res.status(504).json({ error: 'Upstream timeout' });
  });
  proxyReq.write(bodyStr);
  proxyReq.end();
});

process.on('uncaughtException', (err) => {
  console.error('[oracle-server] uncaughtException (프로세스 유지):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[oracle-server] unhandledRejection (프로세스 유지):', reason);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[seolyuhana-oracle] 서버 시작 port=${PORT}`);
});
