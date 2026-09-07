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

    // 로드 후 frame 상태 진단
    const framesBefore = page.frames().map(f => ({ url: f.url(), name: f.name() }));
    console.log('[iros-pin] 로드 후 frame 목록:', JSON.stringify(framesBefore));

    // ── Step 2: "간편 열람·발급" nav 클릭 (Gauce element ID) ──────────────────────
    // 알려진 Gauce nav element ID (이전 pm2 로그에서 확인)
    const navId = 'mf_wfm_potal_main_wf_header_gen_depth1_0_gen_depth2_0_gen_depth3_1_grp_box3';
    const navEl = page.locator(`#${navId}`);
    if (await navEl.count() > 0) {
      console.log('[iros-pin] nav element 발견, force-click');
      await navEl.click({ force: true }).catch(e => console.log('[iros-pin] nav click err:', e.message));
    } else {
      // 텍스트 기반 폴백
      const fbEl = page.locator('a, span, div').filter({ hasText: /간편\s*열람/ }).first();
      if (await fbEl.count() > 0) {
        console.log('[iros-pin] 텍스트 폴백 force-click');
        await fbEl.click({ force: true }).catch(() => {});
      } else {
        console.log('[iros-pin] nav element 없음 — Gauce ID 또는 텍스트 매칭 실패');
      }
    }
    await page.waitForTimeout(4000);

    // 클릭 후 frame 상태 + iframe src 진단
    const framesAfter = page.frames().map(f => ({ url: f.url(), name: f.name() }));
    console.log('[iros-pin] 클릭 후 frame 목록:', JSON.stringify(framesAfter));
    const iframeList = await page.evaluate(() =>
      [...document.querySelectorAll('iframe, frame')].map(f => ({ id: f.id, name: f.name, src: f.src || f.getAttribute('src') }))
    );
    console.log('[iros-pin] iframe/frame DOM:', JSON.stringify(iframeList));

    // ── Step 3: 모든 frame에서 주소 입력 필드 탐색 ───────────────────────────────
    const addrSels = [
      'input[id*="addr" i]', 'input[name*="addr" i]',
      'input[placeholder*="주소"]', 'input[placeholder*="지번"]',
      'input[placeholder*="도로명"]', 'input[placeholder*="번지"]',
      'input[type="text"]',
    ];
    let addrInput = null;
    let targetCtx = page;

    for (const frame of [page, ...page.frames()]) {
      try {
        for (const sel of addrSels) {
          const loc = frame.locator(sel).first();
          if (await loc.count() > 0) {
            const visible = await loc.isVisible({ timeout: 1000 }).catch(() => false);
            if (visible) {
              const id = await loc.getAttribute('id').catch(() => '');
              if (id && id.includes('potal_main_wf_header')) continue; // 헤더 nav 검색창 제외
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

    if (!addrInput) {
      const dbg = { framesBefore, framesAfter, iframeList,
        mainBody: await page.evaluate(() => document.body.innerText.slice(0, 400)).catch(() => '') };
      throw new Error(`주소 입력 필드 없음 | ${JSON.stringify(dbg)}`);
    }

    // ── Step 4: 주소 입력 ────────────────────────────────────────────────────────
    await addrInput.click({ clickCount: 3, force: true });
    await addrInput.fill(address);

    // ── Step 5: 검색 트리거 ──────────────────────────────────────────────────────
    let searchTriggered = false;
    const searchBtns = targetCtx.locator('input[type="button"], input[type="submit"], button')
      .filter({ hasText: /검색|조회/ });
    const sbCnt = await searchBtns.count();
    for (let i = 0; i < sbCnt; i++) {
      const btn = searchBtns.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ force: true, timeout: 5000 }).catch(() => {});
        searchTriggered = true;
        console.log('[iros-pin] 검색 버튼 force-click');
        break;
      }
    }
    if (!searchTriggered) {
      // onclick에 search/조회 포함 앵커 (헤더 nav 제외)
      const triggered = await targetCtx.evaluate(() => {
        const anchors = [...document.querySelectorAll('a[onclick]')];
        for (const a of anchors) {
          if (a.id && a.id.includes('header')) continue;
          const oc = a.getAttribute('onclick') || '';
          if (oc.toLowerCase().includes('search') || oc.includes('조회')) {
            a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return 'anchor:' + a.id;
          }
        }
        return null;
      });
      if (triggered) { searchTriggered = true; console.log('[iros-pin] JS anchor 검색:', triggered); }
    }
    if (!searchTriggered) {
      await addrInput.press('Enter');
      console.log('[iros-pin] Enter 검색');
    }
    await page.waitForTimeout(4000);
    console.log('[iros-pin] 검색 후 URL:', targetCtx === page ? page.url() : targetCtx.url());

    // ── Step 6: 결과에서 고유번호(PIN) 파싱 ──────────────────────────────────────
    const resultText = await targetCtx.evaluate(() => {
      // 테이블/스팬/div에서 XXXX-XXXX-XXXXXX 또는 13~14자리 숫자 패턴
      const els = [...document.querySelectorAll('td, span, div, p')];
      for (const el of els) {
        const t = el.textContent || '';
        const m = t.match(/\b(\d{4}-\d{4}-\d{6}|\d{13,14})\b/);
        if (m) return { pin: m[1].replace(/-/g, ''), raw: m[0], context: t.trim().slice(0, 100) };
      }
      // onclick / data 속성에서 파싱
      const linked = [...document.querySelectorAll('[onclick], [data-pin], [data-id]')];
      for (const el of linked) {
        const oc = el.getAttribute('onclick') || el.getAttribute('data-pin') || el.getAttribute('data-id') || '';
        const m = oc.match(/['"]?(\d{4}-?\d{4}-?\d{6}|\d{13,14})['"]?/);
        if (m) return { pin: m[1].replace(/-/g, ''), raw: oc.slice(0, 80), context: 'attr' };
      }
      return null;
    });

    if (!resultText || !resultText.pin) {
      const dbg = await targetCtx.evaluate(() => ({
        url: location.href, title: document.title,
        body: document.body.innerText.slice(0, 700)
      }));
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

  // 첫 번째 visible text 입력 필드 찾기 (page.evaluate 기반)
  async function _findAddrInput(page) {
    // 1순위: addr 관련 ID/name/placeholder
    const candidates = [
      'input[id*="addr" i]', 'input[id*="Addr"]',
      'input[name*="addr" i]', 'input[name*="Addr"]',
      '#searchAddr', 'input[placeholder*="주소"]',
      'input[placeholder*="지번"]', 'input[placeholder*="도로명"]',
      'input[placeholder*="번지"]',
    ];
    for (const sel of candidates) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) return loc;
    }
    // 2순위: 페이지 내 첫 번째 visible text input (form 안)
    const allInputs = page.locator('form input[type="text"], input[type="text"]');
    const cnt = await allInputs.count();
    for (let i = 0; i < Math.min(cnt, 10); i++) {
      const inp = allInputs.nth(i);
      if (await inp.isVisible().catch(() => false)) return inp;
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

    // 1단계: 인터넷등기소 검색 페이지 (networkidle — JSF JS 완전 초기화 필요)
    const typeParam = regType === 'land' ? 'L' : 'B';
    await page.goto(`https://www.iros.go.kr/pos9/jsf/renf/selectRenf0100List.xhtml?type=${typeParam}`,
      { waitUntil: 'networkidle', timeout: 60000 });
    console.log('[iros] 검색페이지 URL:', page.url());
    await page.waitForTimeout(3000);

    // 2단계: 로그인 시도 (검색 페이지가 로그인 리다이렉트된 경우)
    if (page.url().includes('login') || page.url().includes('Login')) {
      console.log('[iros] 로그인 리다이렉트 감지, 로그인 시도');
      await _irosLogin(page);
      await page.goto(`https://www.iros.go.kr/pos9/jsf/renf/selectRenf0100List.xhtml?type=${typeParam}`,
        { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(3000);
      // 재시도 후도 로그인 리다이렉트
      if (page.url().includes('login') || page.url().includes('Login')) {
        throw new Error(`로그인 실패: ${page.url()}`);
      }
    } else if (irosId && irosPw) {
      // 로그인 폼이 현재 페이지에 있으면 채우기 시도
      await _irosLogin(page);
    }

    // 4단계: 주소 입력 필드 찾기
    const addrInput = await _findAddrInput(page);
    if (!addrInput) {
      // 디버그용 스크린샷 저장
      const ssPath = join(tmpDir, 'debug.png');
      await page.screenshot({ path: ssPath, fullPage: true }).catch(() => {});
      const pageHtml = await page.content().catch(() => '');
      throw new Error(`주소 입력 필드를 찾을 수 없음. URL=${page.url()}, 입력필드 수=${await page.locator('input').count()}`);
    }
    await addrInput.click({ clickCount: 3 });
    await addrInput.fill(address);

    // 검색 버튼 클릭 또는 Enter
    const searchBtnSel = 'button[onclick*="search"], a[onclick*="search"], #searchBtn, .btn-search, button:has-text("검색"), input[type="button"][value*="검색"], input[type="submit"]';
    const searchBtn = page.locator(searchBtnSel).first();
    if (await searchBtn.count() > 0) await searchBtn.click();
    else await addrInput.press('Enter');
    await page.waitForTimeout(3000);

    // 5단계: 검색 결과 첫 번째 행 선택
    const resultSel = 'table tbody tr:first-child td a, .result-list li:first-child a, #resultList tr:first-child a, tbody tr:first-child a, .tbl-result tbody tr:first-child td a';
    const resultRow = page.locator(resultSel).first();
    if (!(await resultRow.count())) {
      throw new Error(`"${address}" 검색 결과 없음. 더 상세한 주소(동·호수 포함)로 검색해주세요.`);
    }
    await resultRow.click();
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // 6단계: 열람/발급 버튼
    const issueSel = 'a[onclick*="issue"], button[onclick*="issue"], #issueBtn, .btn-issue, button:has-text("열람"), button:has-text("발급"), a:has-text("열람"), a:has-text("발급")';
    const issueBtn = page.locator(issueSel).first();
    if (await issueBtn.count() > 0) {
      await issueBtn.click();
      await page.waitForTimeout(2000);
    }

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

    // 7단계: PDF 저장 (다운로드 링크 우선, 없으면 화면 PDF)
    const pdfPath = join(tmpDir, 'registry.pdf');
    const dlSel = 'a[href*=".pdf"], a[onclick*="download"], a[onclick*="pdf"], #downloadBtn, a:has-text("다운로드"), a:has-text("저장")';
    const dlLink = page.locator(dlSel).first();

    if (await dlLink.count() > 0) {
      try {
        const [download] = await Promise.all([
          context.waitForEvent('download', { timeout: 30000 }),
          dlLink.click()
        ]);
        await download.saveAs(pdfPath);
      } catch {
        const pdfBuffer2 = await page.pdf({ format: 'A4', printBackground: true });
        await writeFile(pdfPath, pdfBuffer2);
      }
    } else {
      const pdfBuffer2 = await page.pdf({ format: 'A4', printBackground: true });
      await writeFile(pdfPath, pdfBuffer2);
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[seolyuhana-oracle] 서버 시작 port=${PORT}`);
});
