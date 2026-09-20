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
// AbortSignal.timeout()은 CF Workers에서 불안정 → AbortController + setTimeout 사용
function _fetchT(url, opts, ms = 15000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new DOMException('timeout', 'TimeoutError')), ms);
  return fetch(url, { ...opts, signal: ac.signal }).finally(() => clearTimeout(t));
}

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

  // 이미지 파일 → Claude Vision으로 직접 분석
  const IMAGE_EXTS = ['jpg','jpeg','png','webp','gif','bmp','heic','heif'];
  const IMAGE_MIMES = ['image/jpeg','image/png','image/webp','image/gif','image/bmp','image/heic','image/heif'];
  if (IMAGE_EXTS.includes(ext) || IMAGE_MIMES.includes(mimeType)) {
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const mediaType = mimeType && IMAGE_MIMES.includes(mimeType)
      ? mimeType
      : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp'
      : 'image/jpeg';
    return {
      text: '',
      pageCount: 1,
      method: 'image_vision',
      scanned: true,
      images: [b64],
      imageMediaType: mediaType,
      rawBuffer: buffer
    };
  }

  throw new Error(`지원하지 않는 파일 형식입니다. (지원: HWP, DOCX, PDF, TXT, JPG, PNG, WEBP)`);
}

/**
 * HWP → LibreOffice → DOCX → text
 * Oracle Cloud 161.33.136.154의 /api/hwp-convert 엔드포인트 호출
 */
async function parseHwp(buffer, filename, env) {
  const oracleBase = env.ORACLE_CONVERTER_URL || 'https://oracle.mbtico.kr';

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'application/x-hwp' }), filename);

  const res = await _fetchT(`${oracleBase}/api/hwp-convert`, { method: 'POST', body: form }, 60000);

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
 * PDF 파싱 — 4단계 폴백
 * 1. 순수 JS 텍스트 추출 (비압축 BT/ET + FlateDecode 압축 해제 포함)
 * 2. Oracle pdftotext (poppler 기반, 모든 압축 형식·CIDFont 완전 지원)
 * 3. Oracle 이미지 변환 (스캔 PDF 또는 텍스트 추출 실패)
 * 4. Claude PDF document 타입 직접 전송 (최후 수단)
 */
async function parsePdf(buffer, env) {
  // 1차: 순수 JS 텍스트 추출 (비압축 + FlateDecode 자동 해제)
  // CIDFont 폰트 쓰레기 텍스트 필터링 — 한국어 비율 5% 미만이면 Oracle 폴백
  const extracted = await extractPdfText(buffer);
  const _hasKorean = t => {
    if (!t || t.length < 50) return false;
    const korean = [...t].filter(c => c >= '가' && c <= '힣').length;
    return korean / [...t].length > 0.05;
  };
  if (_hasKorean(extracted)) {
    return {
      text: extracted,
      pageCount: countPdfPages(buffer),
      method: 'pdf_text_js',
      scanned: false
    };
  }

  // 2차: Oracle pdftotext — 6초 제한 (스키마 축소로 분석시간 확보됨)
  // Oracle이 6초 내 응답하면 CIDFont 텍스트 획득 → 빠른 텍스트 분석 경로, 아니면 Vision 폴백
  const oracleText = await tryOraclePdfText(buffer, env);
  if (oracleText && oracleText.text && oracleText.text.length > 50) {
    return {
      text: oracleText.text,
      pageCount: oracleText.pageCount,
      method: 'pdf_oracle_text',
      scanned: false
    };
  }

  // 3차: Oracle 이미지 건너뜀 → Claude Vision으로 직접 폴백
  // (Oracle 이미지 변환 15초 대기 제거 — 총 처리시간 30초 이내 유지)
  return { text: '', pageCount: countPdfPages(buffer), method: 'pdf_vision', scanned: true, rawBuffer: buffer };
}

/**
 * Oracle Cloud pdftoppm으로 PDF → JPEG 이미지 배열 반환
 * raw binary body로 전송 (FormData/Blob Cloudflare Worker 호환성 문제 우회)
 */
async function tryOraclePdfImages(buffer, env) {
  try {
    const oracleBase = env.ORACLE_CONVERTER_URL || 'https://oracle.mbtico.kr';
    const res = await _fetchT(`${oracleBase}/api/pdf-to-images?maxPages=15`, {
      method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: buffer
    }, 15000);
    if (!res.ok) {
      console.error('[tryOraclePdfImages] HTTP 오류:', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json();
    return data.images && data.images.length > 0 ? data.images : null;
  } catch (e) {
    console.error('[tryOraclePdfImages] 네트워크 오류:', e.message);
    return null;
  }
}

/**
 * Oracle Cloud pdf-text: pdftotext + CIDFont HEX 폴백 (인터넷등기소 RIS PDF 포함)
 * pageCount도 함께 반환 (Oracle에서 pdfinfo로 계산)
 */
async function tryOraclePdfText(buffer, env) {
  try {
    const oracleBase = env.ORACLE_CONVERTER_URL || 'https://oracle.mbtico.kr';
    const res = await _fetchT(`${oracleBase}/api/pdf-text`, {
      method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: buffer
    }, 6000);
    if (!res.ok) {
      console.error('[tryOraclePdfText] HTTP 오류:', res.status);
      return null;
    }
    const data = await res.json();
    return { text: data.text || '', pageCount: data.pageCount || 1 };
  } catch (e) {
    console.error('[tryOraclePdfText] 네트워크 오류:', e.message);
    return null;
  }
}

/**
 * Oracle Cloud pdf-ocr: pdftoppm → PaddleOCR → 텍스트
 * 스캔 PDF 전체 페이지 텍스트 추출 (장수 제한 없음)
 */
async function tryOraclePdfOcr(buffer, env) {
  try {
    const oracleBase = env.ORACLE_CONVERTER_URL || 'https://oracle.mbtico.kr';
    const res = await _fetchT(`${oracleBase}/api/pdf-ocr?maxPages=30`, {
      method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: buffer
    }, 15000);
    if (!res.ok) {
      console.error('[tryOraclePdfOcr] HTTP 오류:', res.status);
      return '';
    }
    const data = await res.json();
    return data.text || '';
  } catch (e) {
    console.error('[tryOraclePdfOcr] 오류:', e.message);
    return '';
  }
}

/**
 * PDF 텍스트 스트림 파싱 (순수 JS, PDF 스펙 §7.8.3 BT/ET 블록)
 * 비압축 스트림 + FlateDecode 압축 스트림 자동 해제 포함
 * 인터넷등기소 RIS CIDFont HEX UTF-16BE 인코딩 완전 지원
 */
async function extractPdfText(buffer) {
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder('latin1').decode(bytes);

  const chunks = [];

  // 비압축 BT/ET 블록
  _parseBtBlocks(raw, chunks);

  // FlateDecode 압축 스트림 자동 해제 후 BT/ET 추출
  await _parseFlatecodeStreams(bytes, raw, chunks);

  return chunks.join('').replace(/\n{3,}/g, '\n\n').trim();
}

function _parseBtBlocks(raw, chunks) {
  const btRe = /BT([\s\S]*?)ET/g;
  let m;
  while ((m = btRe.exec(raw)) !== null) {
    _parseTjTJ(m[1], chunks);
  }
}

function _parseTjTJ(block, chunks) {
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

async function _parseFlatecodeStreams(bytes, raw, chunks) {
  let pos = 0;
  while (pos < raw.length - 10) {
    const sIdx = raw.indexOf('stream', pos);
    if (sIdx === -1) break;

    // stream 다음 \r\n 또는 \n이어야 유효한 스트림 시작
    let dataStart;
    if (raw[sIdx + 6] === '\r' && raw[sIdx + 7] === '\n') {
      dataStart = sIdx + 8;
    } else if (raw[sIdx + 6] === '\n') {
      dataStart = sIdx + 7;
    } else {
      pos = sIdx + 6;
      continue;
    }

    // 선행 딕셔너리 최대 600자 역방향 확인
    const dictStr = raw.slice(Math.max(0, sIdx - 600), sIdx);

    // FlateDecode 필터 확인 (/Filter /FlateDecode 또는 /Filter [/FlateDecode])
    if (!dictStr.includes('/FlateDecode') && !dictStr.includes('/Fl ') &&
        !dictStr.includes('/Fl\n') && !dictStr.includes('/Fl\r')) {
      pos = dataStart;
      continue;
    }

    // /Length N (직접 참조만)
    const lenMatch = dictStr.match(/\/Length\s+(\d+)/);
    if (!lenMatch) { pos = dataStart; continue; }
    const length = parseInt(lenMatch[1]);
    if (length < 10 || dataStart + length > bytes.length) { pos = dataStart; continue; }

    const compressed = bytes.slice(dataStart, dataStart + length);
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      writer.write(compressed);
      writer.close();

      const parts = [];
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (value) parts.push(value);
        done = d;
      }
      const decompressed = new TextDecoder('latin1').decode(concatUint8Arrays(parts));
      _parseBtBlocks(decompressed, chunks);
    } catch {
      // 압축 해제 실패 — 건너뜀
    }

    pos = dataStart + length;
  }
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
