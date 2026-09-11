/**
 * seolyuhana/utils/parser.js
 * 파일 파싱 유틸리티 — HWP/DOCX/PDF/스캔PDF 텍스트 추출
 *
 * 실행 환경: Cloudflare Workers (_worker.js에서 import)
 * HWP 변환: Oracle Cloud LibreOffice headless (외부 API 호출)
 */

/**
 * 업로드된 파일을 분석하여 텍스트와 메타정보를 반환한다
 * @param {ArrayBuffer} buffer  파일 바이너리
 * @param {string} filename     원본 파일명
 * @param {string} mimeType     MIME 타입
 * @param {object} env          Cloudflare env (KV, secrets)
 * @returns {{ text: string, pageCount: number, method: string, scanned: boolean }}
 */
export async function parseFile(buffer, filename, mimeType, env) {
  const ext = filename.split('.').pop().toLowerCase();

  if (ext === 'hwp' || mimeType === 'application/x-hwp' || mimeType === 'application/haansofthwp') {
    return await parseHwp(buffer, filename, env);
  }
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await parseDocx(buffer);
  }
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return await parsePdf(buffer, env);
  }
  if (ext === 'txt' || mimeType === 'text/plain') {
    const text = new TextDecoder('utf-8').decode(buffer);
    return { text: text.trim(), pageCount: 1, method: 'text', scanned: false };
  }

  throw new Error(`지원하지 않는 파일 형식입니다: .${ext}`);
}

/**
 * HWP → LibreOffice → DOCX → text
 * Oracle Cloud 161.33.136.154의 /api/hwp-convert 엔드포인트 호출
 */
async function parseHwp(buffer, filename, env) {
  const oracleBase = env.ORACLE_CONVERTER_URL || 'http://161.33.136.154:8080';

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'application/x-hwp' }), filename);

  const res = await fetch(`${oracleBase}/api/hwp-convert`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60000)
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`HWP 변환 실패 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    text: data.text || '',
    pageCount: data.pageCount || 1,
    method: 'hwp_libreoffice',
    scanned: false,
    docxBuffer: data.docxBase64 ? base64ToArrayBuffer(data.docxBase64) : null
  };
}

/**
 * DOCX → mammoth.js (Cloudflare Workers 환경에서는 Oracle 프록시 경유)
 * mammoth.js는 Node.js 전용이므로 Oracle Cloud API 호출
 */
async function parseDocx(buffer) {
  // Workers 환경에서 직접 DOCX 파싱: mammoth를 쓸 수 없으므로
  // OOXML ZIP 구조에서 word/document.xml을 추출하여 텍스트 분리
  try {
    const text = await extractDocxText(buffer);
    return { text, pageCount: estimatePageCount(text), method: 'docx_xml', scanned: false };
  } catch {
    throw new Error('DOCX 파일을 읽을 수 없습니다. 파일이 손상되지 않았는지 확인해주세요.');
  }
}

/**
 * OOXML ZIP에서 word/document.xml 텍스트 추출 (Workers 내장 DecompressionStream 사용)
 */
async function extractDocxText(buffer) {
  // Cloudflare Workers에는 JSZip이 없음 → 자체 구현
  // ZIP central directory에서 word/document.xml 오프셋을 찾아 추출
  const bytes = new Uint8Array(buffer);
  const xmlBytes = findZipEntry(bytes, 'word/document.xml');
  if (!xmlBytes) throw new Error('word/document.xml 엔트리를 찾을 수 없습니다');

  const decomp = new DecompressionStream('deflate-raw');
  const writer = decomp.writable.getWriter();
  const reader = decomp.readable.getReader();
  writer.write(xmlBytes);
  writer.close();

  const chunks = [];
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    if (value) chunks.push(value);
    done = d;
  }

  const xmlText = new TextDecoder().decode(concatUint8Arrays(chunks));
  return xmlToPlainText(xmlText);
}

/**
 * ZIP ローカルファイルヘッダからエントリを検索
 */
function findZipEntry(bytes, targetName) {
  const targetBytes = new TextEncoder().encode(targetName);
  let i = 0;
  while (i < bytes.length - 30) {
    // Local file header signature: PK\x03\x04
    if (bytes[i] === 0x50 && bytes[i+1] === 0x4B && bytes[i+2] === 0x03 && bytes[i+3] === 0x04) {
      const compMethod = bytes[i+8] | (bytes[i+9] << 8);
      const compSize   = bytes[i+18] | (bytes[i+19] << 8) | (bytes[i+20] << 16) | (bytes[i+21] << 24);
      const nameLen    = bytes[i+26] | (bytes[i+27] << 8);
      const extraLen   = bytes[i+28] | (bytes[i+29] << 8);
      const nameBytes  = bytes.slice(i+30, i+30+nameLen);

      if (nameBytes.length === targetBytes.length && nameBytes.every((b, j) => b === targetBytes[j])) {
        const dataStart = i + 30 + nameLen + extraLen;
        const dataEnd   = dataStart + compSize;
        if (compMethod === 0) return bytes.slice(dataStart, dataEnd); // stored
        if (compMethod === 8) return bytes.slice(dataStart, dataEnd); // deflated
      }
      i += 30 + nameLen + extraLen + compSize;
    } else {
      i++;
    }
  }
  return null;
}

function concatUint8Arrays(arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

/** OOXML XML → 읽기 가능한 텍스트 */
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

/**
 * PDF 파싱 — 텍스트 레이어 추출 시도, 실패 시 Oracle pdftotext 폴백, 마지막에 Vision
 */
async function parsePdf(buffer, env) {
  const pageCount = countPdfPages(buffer);

  // 1차: 인워커 추출 (ASCII + CIDFont HEX)
  const text = extractPdfText(buffer);
  if (text && text.replace(/\s/g, '').length > 50) {
    return { text: text.trim(), pageCount, method: 'pdf_text', scanned: false };
  }

  // 2차: Oracle pdftotext (한글 CIDFont CMap 대응)
  const oracleText = await tryOraclePdfText(buffer, env);
  if (oracleText && oracleText.replace(/\s/g, '').length > 50) {
    return { text: oracleText.trim(), pageCount, method: 'oracle_pdf', scanned: false };
  }

  // 3차: Oracle pdftoppm → JPEG 이미지 (PDF beta 없이 Vision 가능)
  const oracleImages = await tryOraclePdfImages(buffer, env);
  if (oracleImages && oracleImages.length > 0) {
    return { text: '', pageCount, method: 'pdf_vision_images', scanned: true, images: oracleImages, rawBuffer: buffer };
  }

  // 4차: PDF 직접 전송 (anthropic-beta pdfs-2024-09-25 필요)
  return { text: '', pageCount, method: 'pdf_vision', scanned: true, rawBuffer: buffer };
}

/**
 * Oracle Cloud pdftoppm으로 PDF → JPEG 이미지 배열 반환
 */
async function tryOraclePdfImages(buffer, env) {
  try {
    const oracleBase = env.ORACLE_CONVERTER_URL || 'http://161.33.136.154:8080';
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'application/pdf' }), 'input.pdf');
    const res = await fetch(`${oracleBase}/api/pdf-to-images?maxPages=8`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(90000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.images && data.images.length > 0 ? data.images : null;
  } catch {
    return null;
  }
}

/**
 * Oracle Cloud LibreOffice로 PDF 텍스트 추출 (CIDFont 한글 PDF 대응)
 */
async function tryOraclePdfText(buffer, env) {
  try {
    const oracleBase = env.ORACLE_CONVERTER_URL || 'http://161.33.136.154:8080';
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'application/pdf' }), 'input.pdf');
    const res = await fetch(`${oracleBase}/api/pdf-text`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60000)
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.text || '';
  } catch {
    return '';
  }
}

/**
 * PDF 텍스트 스트림 파싱 (순수 JS, PDF 스펙 §7.8.3 BT/ET 블록)
 */
function extractPdfText(buffer) {
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder('latin1').decode(bytes);

  const chunks = [];
  // BT ... ET 블록에서 Tj / TJ 연산자 추출
  const btRe = /BT([\s\S]*?)ET/g;
  let m;
  while ((m = btRe.exec(raw)) !== null) {
    const block = m[1];
    // (text) Tj — 일반 ASCII/Latin
    const tjRe = /\(([^)]*)\)\s*Tj/g;
    let t;
    while ((t = tjRe.exec(block)) !== null) chunks.push(decodePdfString(t[1]));
    // <HEX> Tj — 인터넷등기소/한국 CIDFont UTF-16BE 인코딩
    const hexTjRe = /<([0-9A-Fa-f]{4,})>\s*Tj/g;
    while ((t = hexTjRe.exec(block)) !== null) chunks.push(hexToUnicode(t[1]));
    // [(arr) ...] TJ
    const TJRe = /\[([\s\S]*?)\]\s*TJ/g;
    while ((t = TJRe.exec(block)) !== null) {
      const inner = t[1];
      const arrRe = /\(([^)]*)\)/g;
      let a;
      while ((a = arrRe.exec(inner)) !== null) chunks.push(decodePdfString(a[1]));
      // HEX 배열: [<XXXX><YYYY>] TJ
      const hexArrRe = /<([0-9A-Fa-f]{4,})>/g;
      while ((a = hexArrRe.exec(inner)) !== null) chunks.push(hexToUnicode(a[1]));
    }
    chunks.push('\n');
  }
  return chunks.join('').replace(/\n{3,}/g, '\n\n').trim();
}

// CIDFont HEX → 유니코드 문자열 변환 (UTF-16BE 기준, 인터넷등기소 RIS PDF 대응)
function hexToUnicode(hex) {
  try {
    // 2바이트씩 UTF-16BE 디코딩
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    if (bytes.length % 2 === 0) {
      return new TextDecoder('utf-16be').decode(new Uint8Array(bytes));
    }
    return '';
  } catch {
    return '';
  }
}

function decodePdfString(s) {
  return s
    .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\');
}

function countPdfPages(buffer) {
  const raw = new TextDecoder('latin1').decode(new Uint8Array(buffer));
  const m = raw.match(/\/Type\s*\/Page[^s]/g);
  return m ? m.length : 1;
}

function estimatePageCount(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 400));
}

function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

/**
 * 파일 크기·페이지 수 검증
 * @param {ArrayBuffer} buffer
 * @param {string} serviceId    sly_service_config의 id
 * @param {object} serviceConfig { maxPages: number }
 */
export function validateFile(buffer, serviceId, serviceConfig) {
  const MAX_BYTES = 32 * 1024 * 1024; // 32MB (Claude Files API 한도)
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(`파일 크기가 32MB를 초과합니다 (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);
  }
  // 페이지 수는 파싱 후 체크 (parseFile 결과의 pageCount)
}

/**
 * 출력 파일명 생성 — 입력 파일명 기반, 확장자만 교체
 * @param {string} originalFilename
 * @param {'docx'|'pdf'} targetExt
 */
export function makeOutputFilename(originalFilename, targetExt) {
  const base = originalFilename.replace(/\.(hwp|docx|pdf|txt)$/i, '');
  return `${base}_서류하나.${targetExt}`;
}
