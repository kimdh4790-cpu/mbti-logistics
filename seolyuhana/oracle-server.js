/**
 * seolyuhana/oracle-server.js
 * Oracle Cloud 변환 서버 — Express.js
 *
 * 실행: node oracle-server.js (포트 3100)
 * 의존성: express, multer, libreoffice-convert (또는 exec libreoffice), puppeteer-core
 *
 * 엔드포인트:
 *   POST /api/hwp-convert   HWP → DOCX → 텍스트 추출
 *   POST /api/pdf-render    HTML → PDF (Puppeteer)
 *   GET  /health
 */

import express from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';
import puppeteer from 'puppeteer-core';
import { DOMParser } from '@xmldom/xmldom';
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

    // LibreOffice headless 변환
    await execFileAsync('libreoffice', [
      '--headless', '--convert-to', 'docx',
      '--outdir', tmpDir, hwpPath
    ], { timeout: 60000 });

    const docxBuffer = await readFile(docxPath);
    const { text, pageCount } = await extractDocxText(docxBuffer);

    res.json({
      text,
      pageCount,
      docxBase64: docxBuffer.toString('base64')
    });
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
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

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
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
             '--disable-blink-features=AutomationControlled'],
      headless: true,
      defaultViewport: { width: 1280, height: 900 }
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36');

    // 1단계: 인터넷등기소 메인 접속
    await page.goto('https://www.iros.go.kr/pos9/jsf/renf/index.xhtml', { waitUntil: 'networkidle2', timeout: 60000 });

    // 2단계: 아이디/비밀번호 로그인
    try {
      await page.waitForSelector('#userId, input[name="userId"]', { timeout: 10000 });
      await page.type('#userId', irosId, { delay: 50 });
      await page.type('#userPwd', irosPw, { delay: 50 });
      await page.click('#loginBtn, button[onclick*="login"], input[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
    } catch {
      // 이미 로그인됐거나 팝업 로그인 방식 — 계속 시도
    }

    // 3단계: 열람 메뉴 → 건물·토지 선택
    const searchUrl = regType === 'land'
      ? 'https://www.iros.go.kr/pos9/jsf/renf/selectRenf0101List.xhtml?type=L'
      : 'https://www.iros.go.kr/pos9/jsf/renf/selectRenf0101List.xhtml?type=B';
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // 4단계: 주소 입력 후 검색
    await page.waitForSelector('input[id*="addr"], input[id*="Addr"], #searchAddr', { timeout: 15000 });
    const addrInput = await page.$('input[id*="addr"], input[id*="Addr"], #searchAddr');
    if (!addrInput) throw new Error('주소 입력 필드를 찾을 수 없습니다');
    await addrInput.click({ clickCount: 3 });
    await addrInput.type(address, { delay: 50 });

    // 검색 버튼 클릭
    const searchBtn = await page.$('button[onclick*="search"], a[onclick*="search"], #searchBtn, .btn-search');
    if (searchBtn) await searchBtn.click();
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // 5단계: 검색 결과 첫 번째 항목 선택
    const resultRow = await page.$('table tbody tr:first-child td a, .result-list li:first-child a, #resultList tr:first-child a');
    if (!resultRow) throw new Error(`"${address}" 검색 결과가 없습니다. 더 상세한 주소(동·호수 포함)로 검색해주세요.`);
    await resultRow.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});

    // 6단계: 열람/발급 선택 → 전자화폐 결제
    const issueBtn = await page.$('a[onclick*="issue"], button[onclick*="issue"], #issueBtn, .btn-issue');
    if (issueBtn) {
      await issueBtn.click();
      await page.waitForTimeout(1500);
    }

    // 전자화폐 결제 선택
    if (emoneyNo1 && emoneyPwd) {
      try {
        const payEmoneyRadio = await page.$('input[value*="emoney"], input[value*="전자화폐"], label[for*="emoney"]');
        if (payEmoneyRadio) {
          await payEmoneyRadio.click();
          await page.waitForTimeout(500);
          // 전자화폐 번호 입력
          const emoNo1Field = await page.$('input[id*="emoneyNo1"], input[name*="emoneyNo1"]');
          const emoNo2Field = await page.$('input[id*="emoneyNo2"], input[name*="emoneyNo2"]');
          const emoPwdField  = await page.$('input[id*="emoneyPwd"], input[name*="emoneyPwd"], input[type="password"]');
          if (emoNo1Field) { await emoNo1Field.click({ clickCount: 3 }); await emoNo1Field.type(emoneyNo1, { delay: 30 }); }
          if (emoNo2Field && emoneyNo2) { await emoNo2Field.click({ clickCount: 3 }); await emoNo2Field.type(emoneyNo2, { delay: 30 }); }
          if (emoPwdField) { await emoPwdField.click({ clickCount: 3 }); await emoPwdField.type(emoneyPwd, { delay: 30 }); }
          const payBtn = await page.$('#payBtn, button[onclick*="pay"], .btn-pay');
          if (payBtn) {
            await payBtn.click();
            await page.waitForTimeout(3000);
          }
        }
      } catch (pe) {
        console.error('[iros] 결제 단계 오류:', pe.message);
      }
    }

    // 7단계: PDF 다운로드 또는 현재 페이지 PDF 출력
    const pdfPath = join(tmpDir, 'registry.pdf');
    // PDF 다운로드 링크가 있으면 클릭
    const dlLink = await page.$('a[href*=".pdf"], a[onclick*="download"], a[onclick*="pdf"], #downloadBtn');
    if (dlLink) {
      // CDP로 다운로드 처리
      const cdp = await page.target().createCDPSession();
      await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: tmpDir });
      await dlLink.click();
      // 다운로드 대기 (최대 30초)
      let waited = 0;
      let pdfExists = false;
      while (waited < 30000) {
        try { await readFile(pdfPath); pdfExists = true; break; } catch {}
        await new Promise(r => setTimeout(r, 1000));
        waited += 1000;
      }
      if (!pdfExists) {
        // 다운로드 실패 시 현재 페이지 PDF 출력
        const pdfBuffer2 = await page.pdf({ format: 'A4', printBackground: true });
        await writeFile(pdfPath, pdfBuffer2);
      }
    } else {
      // 다운로드 링크 없으면 현재 화면 PDF 출력
      const pdfBuffer2 = await page.pdf({ format: 'A4', printBackground: true });
      await writeFile(pdfPath, pdfBuffer2);
    }

    const pdfBuffer = await readFile(pdfPath);
    const base64 = pdfBuffer.toString('base64');
    res.json({ ok: true, pdfBase64: base64, address });
  } catch (e) {
    console.error('[iros-fetch]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

// ── DOCX 텍스트 추출 (JSZip + xmldom) ────────────────────────────────────────
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

const PORT = process.env.PORT || 3100;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[seolyuhana-oracle] 서버 시작 port=${PORT}`);
});
