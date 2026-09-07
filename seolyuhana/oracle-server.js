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

// ── /api/iros-fetch  인터넷등기소 자동 로그인·발급·PDF 반환 ────────────────────
app.post('/api/iros-fetch', async (req, res) => {
  const { address, regType = 'building', irosId, irosPw, emoneyNo1, emoneyNo2, emoneyPwd } = req.body || {};
  if (!address) return res.status(400).json({ error: '주소 필수' });
  if (!irosId || !irosPw) return res.status(400).json({ error: 'IROS 계정 정보 필수' });

  let browser = null;
  let tmpDir  = null;
  try {
    tmpDir  = await mkdtemp(join(tmpdir(), 'iros-'));
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
             '--disable-blink-features=AutomationControlled'],
      headless: true
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      acceptDownloads: true
    });
    const page = await context.newPage();

    // 1단계: 인터넷등기소 메인 접속
    await page.goto('https://www.iros.go.kr/pos9/jsf/renf/index.xhtml', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('[iros] 메인 URL:', page.url());

    // 2단계: 로그인
    try {
      await page.waitForSelector('#userId, input[name="userId"], input[id*="userId"], input[id*="Id"]', { timeout: 10000 });
      const userIdFld = page.locator('#userId, input[name="userId"], input[id*="userId"]').first();
      const userPwFld = page.locator('#userPwd, input[name="userPwd"], input[id*="Pwd"], input[type="password"]').first();
      await userIdFld.fill(irosId);
      await userPwFld.fill(irosPw);
      const loginBtn = page.locator('#loginBtn, button[onclick*="login"], input[type="submit"], button[type="submit"]').first();
      if (await loginBtn.count() > 0) await loginBtn.click();
      else await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      console.log('[iros] 로그인 후 URL:', page.url());
    } catch (le) {
      console.log('[iros] 로그인 셀렉터 없음(이미 로그인 또는 팝업):', le.message);
    }

    // 3단계: 건물·토지 검색 페이지 (selectRenf0100List = 신 JSF URL)
    const searchUrl = regType === 'land'
      ? 'https://www.iros.go.kr/pos9/jsf/renf/selectRenf0100List.xhtml?type=L'
      : 'https://www.iros.go.kr/pos9/jsf/renf/selectRenf0100List.xhtml?type=B';
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('[iros] 검색페이지 URL:', page.url(), '| 제목:', await page.title());

    // 4단계: 주소 입력 (다양한 셀렉터 폴백)
    const ADDR_SEL = [
      'input[id*="addr"]', 'input[id*="Addr"]', '#searchAddr',
      'input[placeholder*="주소"]', 'input[placeholder*="지번"]',
      'input[name*="addr"]', 'input[name*="Addr"]',
      'input[type="text"]'
    ].join(', ');
    await page.waitForSelector(ADDR_SEL, { timeout: 20000 });
    const addrInput = page.locator(ADDR_SEL).first();
    await addrInput.click({ clickCount: 3 });
    await addrInput.fill(address);

    const searchBtn = page.locator('button[onclick*="search"], a[onclick*="search"], #searchBtn, .btn-search').first();
    if (await searchBtn.count() > 0) await searchBtn.click();
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // 5단계: 첫 번째 결과 선택
    const resultRow = page.locator('table tbody tr:first-child td a, .result-list li:first-child a, #resultList tr:first-child a').first();
    if (!(await resultRow.count())) throw new Error(`"${address}" 검색 결과가 없습니다. 더 상세한 주소(동·호수 포함)로 검색해주세요.`);
    await resultRow.click();
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    // 6단계: 발급 버튼
    const issueBtn = page.locator('a[onclick*="issue"], button[onclick*="issue"], #issueBtn, .btn-issue').first();
    if (await issueBtn.count() > 0) {
      await issueBtn.click();
      await page.waitForTimeout(1500);
    }

    // 전자화폐 결제
    if (emoneyNo1 && emoneyPwd) {
      try {
        const payEmoneyRadio = page.locator('input[value*="emoney"], input[value*="전자화폐"], label[for*="emoney"]').first();
        if (await payEmoneyRadio.count() > 0) {
          await payEmoneyRadio.click();
          await page.waitForTimeout(500);
          const emoNo1Field = page.locator('input[id*="emoneyNo1"], input[name*="emoneyNo1"]').first();
          const emoNo2Field = page.locator('input[id*="emoneyNo2"], input[name*="emoneyNo2"]').first();
          const emoPwdField  = page.locator('input[id*="emoneyPwd"], input[name*="emoneyPwd"], input[type="password"]').first();
          if (await emoNo1Field.count() > 0) await emoNo1Field.fill(emoneyNo1);
          if (emoneyNo2 && await emoNo2Field.count() > 0) await emoNo2Field.fill(emoneyNo2);
          if (await emoPwdField.count() > 0) await emoPwdField.fill(emoneyPwd);
          const payBtn = page.locator('#payBtn, button[onclick*="pay"], .btn-pay').first();
          if (await payBtn.count() > 0) {
            await payBtn.click();
            await page.waitForTimeout(3000);
          }
        }
      } catch (pe) {
        console.error('[iros] 결제 단계 오류:', pe.message);
      }
    }

    // 7단계: PDF 저장
    const pdfPath = join(tmpDir, 'registry.pdf');
    const dlLink = page.locator('a[href*=".pdf"], a[onclick*="download"], a[onclick*="pdf"], #downloadBtn').first();

    if (await dlLink.count() > 0) {
      try {
        const [download] = await Promise.all([
          context.waitForEvent('download', { timeout: 30000 }),
          dlLink.click()
        ]);
        await download.saveAs(pdfPath);
      } catch {
        // 다운로드 실패 시 화면 PDF
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
