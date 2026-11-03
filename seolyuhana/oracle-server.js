// Oracle Cloud 변환 서버 — 포트 3100
// LibreOffice HWP→DOCX + Puppeteer HTML→PDF
// 실행: node seolyuhana/oracle-server.js
// crontab: @reboot cd ~/mbti-logistics && node seolyuhana/oracle-server.js >> ~/oracle-server.log 2>&1 &

import express from 'express';
import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createServer } from 'http';

const execAsync = promisify(exec);
const app = express();
app.use(express.json({ limit: '20mb' }));

// ── POST /html-to-pdf ───────────────────────────────────────────────────────
// Body: { html: string, format?: 'A4'|'Letter', printBackground?: boolean,
//         margin?: {top,right,bottom,left} (CSS strings, default '12mm') }
// Response: application/pdf
app.post('/html-to-pdf', async (req, res) => {
  const { html, format = 'A4', printBackground = true, margin } = req.body;
  if (!html) return res.status(400).json({ error: 'html required' });

  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: '/opt/pw-browsers/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20000 });
    const pdf = await page.pdf({
      format,
      printBackground,
      margin: margin || { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    });
    res.set('Content-Type', 'application/pdf');
    res.send(Buffer.from(pdf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// ── POST /hwp-to-docx ───────────────────────────────────────────────────────
// Body: { hwpBase64: string, fileName?: string }
// Response: application/vnd.openxmlformats-officedocument.wordprocessingml.document
app.post('/hwp-to-docx', async (req, res) => {
  const { hwpBase64, fileName = 'document.hwp' } = req.body;
  if (!hwpBase64) return res.status(400).json({ error: 'hwpBase64 required' });

  let tmpDir = null;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'hwp-'));
    const hwpPath = join(tmpDir, fileName);
    await writeFile(hwpPath, Buffer.from(hwpBase64, 'base64'));

    // LibreOffice headless convert
    await execAsync(`libreoffice --headless --convert-to docx --outdir "${tmpDir}" "${hwpPath}"`, {
      timeout: 30000,
    });

    const docxName = fileName.replace(/\.hwp$/i, '.docx');
    const docxPath = join(tmpDir, docxName);
    const docxBytes = await readFile(docxPath);

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.set('Content-Disposition', `attachment; filename="${docxName}"`);
    res.send(docxBytes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (tmpDir) {
      exec(`rm -rf "${tmpDir}"`, () => {});
    }
  }
});

// ── POST /docx-to-pdf ───────────────────────────────────────────────────────
// Body: { docxBase64: string, fileName?: string }
app.post('/docx-to-pdf', async (req, res) => {
  const { docxBase64, fileName = 'document.docx' } = req.body;
  if (!docxBase64) return res.status(400).json({ error: 'docxBase64 required' });

  let tmpDir = null;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'docx-'));
    const docxPath = join(tmpDir, fileName);
    await writeFile(docxPath, Buffer.from(docxBase64, 'base64'));

    await execAsync(`libreoffice --headless --convert-to pdf --outdir "${tmpDir}" "${docxPath}"`, {
      timeout: 30000,
    });

    const pdfName = fileName.replace(/\.docx$/i, '.pdf');
    const pdfPath = join(tmpDir, pdfName);
    const pdfBytes = await readFile(pdfPath);

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${pdfName}"`);
    res.send(pdfBytes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (tmpDir) {
      exec(`rm -rf "${tmpDir}"`, () => {});
    }
  }
});

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

const PORT = process.env.PORT || 3100;
createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`oracle-server listening on port ${PORT}`);
});
