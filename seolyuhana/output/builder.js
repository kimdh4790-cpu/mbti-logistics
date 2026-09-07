/**
 * seolyuhana/output/builder.js
 * 분석 결과 → DOCX / PDF 출력 파일 생성
 *
 * Cloudflare Workers 환경: 외부 라이브러리 없음
 * DOCX: Open XML 직접 생성 (ZIP 구조)
 * PDF: Oracle Cloud /api/pdf-render 엔드포인트 경유
 */

// ────────────────────────────────────────────────────────────
// DOCX 빌더 (Open XML 직접 생성)
// ────────────────────────────────────────────────────────────

/**
 * 분석 결과를 DOCX 파일로 생성 (수정 제안 포함, 코멘트 형식)
 * @param {object} analysisData  Claude 분석 JSON
 * @param {string} serviceId
 * @param {string} originalFilename
 * @param {string} originalText  원본 문서 텍스트
 * @returns {ArrayBuffer} DOCX 바이너리
 */
export async function buildDocx(analysisData, serviceId, originalFilename, originalText) {
  const xml = buildDocxXml(analysisData, serviceId, originalText);
  return createDocxZip(xml);
}

function buildDocxXml(data, serviceId, originalText) {
  const title = getServiceLabel(serviceId);
  const now = new Date().toLocaleDateString('ko-KR');

  let body = '';

  // 표지
  body += para(`서류하나 — ${title}`, { heading: 1, color: '1a237e' });
  body += para(`분석일: ${now} | 원본 파일 기반`, { size: 20, color: '666666' });
  body += para('');

  // 서비스별 콘텐츠
  if (serviceId === 'resume_analysis') {
    body += buildResumeDocx(data, originalText);
  } else if (serviceId === 'cover_letter_analysis') {
    body += buildCoverLetterDocx(data, originalText);
  } else if (serviceId === 'cover_letter_translation') {
    body += buildTranslationDocx(data);
  } else if (serviceId === 'interview_questions') {
    body += buildInterviewDocx(data);
  } else if (['employment_contract', 'freelance_contract', 'rental_contract'].includes(serviceId)) {
    body += buildContractDocx(data, originalText);
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body}<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1440" w:right="1080" w:bottom="1440" w:left="1260" w:header="720" w:footer="720"/>
</w:sectPr></w:body></w:document>`;
}

function buildResumeDocx(data, originalText) {
  let xml = '';

  // 종합 점수
  xml += para('종합 점수', { heading: 2 });
  xml += para(`전체: ${data.score?.total || '-'} / 100`, { bold: true, size: 28 });

  if (data.score?.breakdown) {
    const br = data.score.breakdown;
    xml += table([
      ['평가 항목', '점수'],
      ...Object.entries(br).map(([k, v]) => [k, `${v} / 100`])
    ]);
  }

  xml += para('');
  xml += para('전체 총평', { heading: 2 });
  xml += para(data.overallComment || '');

  // 강점
  xml += para('');
  xml += para('강점', { heading: 2, color: '2e7d32' });
  (data.strengths || []).forEach(s => { xml += para(`• ${s}`); });

  // 개선 제안 (원본 → 수정안 테이블)
  xml += para('');
  xml += para('개선 제안', { heading: 2, color: 'c62828' });
  (data.improvements || []).forEach((imp, i) => {
    xml += para(`${i + 1}. [${imp.section}]`, { bold: true });
    xml += table([
      ['구분', '내용'],
      ['원본', imp.original || ''],
      ['수정안', imp.suggestion || ''],
      ['이유', imp.reason || '']
    ]);
    xml += para('');
  });

  // 누락 항목
  if (data.missingItems?.length) {
    xml += para('누락 항목', { heading: 2, color: 'e65100' });
    (data.missingItems).forEach(m => { xml += para(`• ${m}`); });
  }

  // 원본 텍스트 부록
  xml += para('');
  xml += para('원본 이력서 텍스트', { heading: 2, color: '546e7a' });
  xml += para(originalText || '', { size: 18 });

  return xml;
}

function buildCoverLetterDocx(data, originalText) {
  let xml = '';

  xml += para('종합 점수', { heading: 2 });
  xml += para(`전체: ${data.score?.total || '-'} / 100`, { bold: true, size: 28 });

  if (data.score?.breakdown) {
    xml += table([
      ['평가 항목', '점수'],
      ...Object.entries(data.score.breakdown).map(([k, v]) => [k, `${v} / 100`])
    ]);
  }

  xml += para('');
  xml += para('전체 총평', { heading: 2 });
  xml += para(data.overallComment || '');

  if (data.inconsistencies?.length) {
    xml += para('');
    xml += para('이력서와 불일치 항목', { heading: 2, color: 'c62828' });
    data.inconsistencies.forEach((inc, i) => {
      xml += para(`${i + 1}번 불일치`, { bold: true });
      xml += table([
        ['구분', '내용'],
        ['자소서 구절', inc.coverLetter || ''],
        ['이력서 사실', inc.resumeFact || ''],
        ['수정 제안', inc.fix || '']
      ]);
      xml += para('');
    });
  }

  xml += para('');
  xml += para('개선 제안', { heading: 2, color: 'e65100' });
  (data.improvements || []).forEach((imp, i) => {
    xml += para(`${i + 1}. [${imp.question}]`, { bold: true });
    xml += table([
      ['구분', '내용'],
      ['원본', imp.original || ''],
      ['수정안', imp.suggestion || ''],
      ['이유', imp.reason || '']
    ]);
    xml += para('');
  });

  xml += para('');
  xml += para('원본 자기소개서', { heading: 2, color: '546e7a' });
  xml += para(originalText || '', { size: 18 });

  return xml;
}

function buildTranslationDocx(data) {
  let xml = '';

  xml += para('번역 결과 (Korean → English)', { heading: 2 });
  xml += para('');

  (data.sections || []).forEach(sec => {
    xml += para(sec.title || '', { heading: 3 });
    xml += para('원문', { bold: true, color: '1565c0' });
    xml += para(sec.koreanOriginal || '', { size: 20 });
    xml += para('');
    xml += para('영문 번역', { bold: true, color: '2e7d32' });
    xml += para(sec.englishTranslation || '');
    if (sec.translatorNotes) {
      xml += para('번역 노트', { bold: true, color: '6a1b9a', size: 20 });
      xml += para(sec.translatorNotes, { size: 20, color: '6a1b9a' });
    }
    xml += para('');
  });

  if (data.glossary?.length) {
    xml += para('용어 대조표', { heading: 2 });
    xml += table([
      ['한국어', '영어', '맥락'],
      ...data.glossary.map(g => [g.korean, g.english, g.context || ''])
    ]);
  }

  if (data.culturalAdaptations?.length) {
    xml += para('');
    xml += para('문화적 표현 조정', { heading: 2 });
    data.culturalAdaptations.forEach(c => { xml += para(`• ${c}`); });
  }

  return xml;
}

function buildInterviewDocx(data) {
  let xml = '';

  (data.categoryQuestions || []).forEach(cat => {
    xml += para(cat.category, { heading: 2 });
    (cat.questions || []).forEach((q, i) => {
      xml += para(`Q${i + 1}. ${q.question}`, { bold: true });
      xml += para(`난이도: ${q.difficulty} | 면접 의도: ${q.intent}`, { size: 20, color: '666666' });
      xml += para('답변 핵심 포인트', { bold: true, color: '1565c0' });
      (q.answerGuide?.keyPoints || []).forEach(kp => { xml += para(`  • ${kp}`); });
      xml += para(`답변 시작 예시: ${q.answerGuide?.exampleOpener || ''}`, { size: 20, color: '2e7d32' });
      xml += para(`주의 사항: ${q.answerGuide?.pitfalls || ''}`, { size: 20, color: 'c62828' });
      xml += para('');
    });
  });

  if (data.tailoredInsights) {
    const ti = data.tailoredInsights;
    xml += para('개인 맞춤 인사이트', { heading: 2 });
    xml += para('어필 포인트', { bold: true, color: '2e7d32' });
    (ti.strongPoints || []).forEach(s => { xml += para(`• ${s}`); });
    xml += para('');
    xml += para('보완 필요 부분', { bold: true, color: 'c62828' });
    (ti.riskAreas || []).forEach(r => { xml += para(`• ${r}`); });
    xml += para('');
    xml += para('준비 방향', { bold: true });
    xml += para(ti.preparation || '');
  }

  return xml;
}

function buildContractDocx(data, originalText) {
  let xml = '';

  const riskColor = { '고위험': 'c62828', '중위험': 'e65100', '저위험': '2e7d32', '정상': '546e7a' };

  xml += para(`계약서 유형: ${data.contractType || '미분류'}`, { heading: 2 });
  xml += para(`전체 위험도: ${data.riskLevel || ''}`, {
    bold: true, color: riskColor[data.riskLevel] || '000000', size: 28
  });
  xml += para(data.riskSummary || '');
  xml += para('');

  xml += para('조항별 분석', { heading: 2 });
  (data.clauses || []).filter(c => c.riskLevel !== '정상').forEach((c, i) => {
    xml += para(`${i + 1}. ${c.clauseTitle}`, { bold: true });
    xml += para(`위험도: ${c.riskLevel}`, { color: riskColor[c.riskLevel] || '000000' });
    xml += table([
      ['구분', '내용'],
      ['원본 조항', c.originalText || ''],
      ['문제점', c.issue || ''],
      ['수정 제안', c.suggestedRevision || ''],
      ['관련 법령', c.legalBasis || '']
    ]);
    xml += para('');
  });

  if (data.missingClauses?.length) {
    xml += para('누락된 필수 조항', { heading: 2, color: 'c62828' });
    data.missingClauses.forEach(mc => {
      xml += para(mc.clauseName, { bold: true });
      xml += para(`근거: ${mc.legalBasis || ''}`);
      xml += para(`권장 문안: ${mc.suggestedText || ''}`, { size: 20, color: '546e7a' });
      xml += para('');
    });
  }

  xml += para('');
  xml += para(data.legalDisclaimer || '본 분석은 정보 제공 목적입니다. 변호사 검토를 권장합니다.',
    { size: 18, color: '999999' });

  xml += para('');
  xml += para('원본 계약서 전문', { heading: 2, color: '546e7a' });
  xml += para(originalText || '', { size: 18 });

  return xml;
}

// ────────────────────────────────────────────────────────────
// Open XML 헬퍼
// ────────────────────────────────────────────────────────────
function para(text, opts = {}) {
  const { heading, bold, size, color } = opts;

  let pPr = '';
  if (heading === 1) pPr = `<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>`;
  else if (heading === 2) pPr = `<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>`;
  else if (heading === 3) pPr = `<w:pPr><w:pStyle w:val="Heading3"/></w:pPr>`;

  let rPr = '';
  if (bold || size || color) {
    rPr = '<w:rPr>';
    if (bold) rPr += '<w:b/>';
    if (size) rPr += `<w:sz w:val="${size}"/>`;
    if (color) rPr += `<w:color w:val="${color}"/>`;
    rPr += '</w:rPr>';
  }

  const escaped = escapeXml(text || '');
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
}

function table(rows) {
  const tbl = rows.map(row => {
    const cells = row.map(cell => {
      return `<w:tc><w:tcPr><w:tcBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
      </w:tcBorders></w:tcPr>${para(cell)}</w:tc>`;
    }).join('');
    return `<w:tr>${cells}</w:tr>`;
  }).join('');

  return `<w:tbl><w:tblPr>
    <w:tblStyle w:val="TableGrid"/>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblBorders>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
    </w:tblBorders>
  </w:tblPr>${tbl}</w:tbl>`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ────────────────────────────────────────────────────────────
// DOCX ZIP 어셈블러 (순수 JS, deflate-raw)
// ────────────────────────────────────────────────────────────
async function createDocxZip(documentXml) {
  const files = {
    '[Content_Types].xml': CONTENT_TYPES_XML,
    '_rels/.rels': RELS_XML,
    'word/_rels/document.xml.rels': DOC_RELS_XML,
    'word/document.xml': documentXml,
    'word/styles.xml': STYLES_XML
  };

  const entries = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes   = new TextEncoder().encode(name);
    const dataBytes   = new TextEncoder().encode(content);
    const compressed  = await deflate(dataBytes);
    const crc         = crc32(dataBytes);

    const local = localFileHeader(nameBytes, compressed, dataBytes.length, crc);
    entries.push({ name: nameBytes, local, compressed, uncompSize: dataBytes.length, compSize: compressed.length, crc, offset });
    offset += local.length + compressed.length;
  }

  const centralDir = entries.map(e => centralDirEntry(e)).reduce((a, b) => concat(a, b));
  const eocd = endOfCentralDir(entries.length, centralDir.length, offset);

  const parts = [];
  for (const e of entries) { parts.push(e.local); parts.push(e.compressed); }
  parts.push(centralDir);
  parts.push(eocd);
  return concat(...parts).buffer;
}

async function deflate(data) {
  const cs = new CompressionStream('deflate-raw');
  const w = cs.writable.getWriter();
  const r = cs.readable.getReader();
  w.write(data); w.close();
  const chunks = [];
  let done = false;
  while (!done) { const { value, done: d } = await r.read(); if (value) chunks.push(value); done = d; }
  return concatUint8(chunks);
}

function concatUint8(arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total); let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

function concat(...args) {
  const arrays = args.map(a => a instanceof Uint8Array ? a : new Uint8Array(a));
  return concatUint8(arrays);
}

function localFileHeader(name, compressed, uncompSize, crc) {
  const h = new Uint8Array(30 + name.length);
  const v = new DataView(h.buffer);
  v.setUint32(0,  0x04034b50, true); // PK\x03\x04
  v.setUint16(4,  20, true);          // version needed
  v.setUint16(6,  0, true);           // flags
  v.setUint16(8,  8, true);           // deflate
  v.setUint16(10, 0, true);           // mod time
  v.setUint16(12, 0, true);           // mod date
  v.setUint32(14, crc, true);
  v.setUint32(18, compressed.length, true);
  v.setUint32(22, uncompSize, true);
  v.setUint16(26, name.length, true);
  v.setUint16(28, 0, true);
  h.set(name, 30);
  return h;
}

function centralDirEntry(e) {
  const h = new Uint8Array(46 + e.name.length);
  const v = new DataView(h.buffer);
  v.setUint32(0, 0x02014b50, true);
  v.setUint16(4, 20, true); v.setUint16(6, 20, true);
  v.setUint16(8, 0, true);  v.setUint16(10, 8, true);
  v.setUint16(12, 0, true); v.setUint16(14, 0, true);
  v.setUint32(16, e.crc, true);
  v.setUint32(20, e.compSize, true);
  v.setUint32(24, e.uncompSize, true);
  v.setUint16(28, e.name.length, true);
  v.setUint16(30, 0, true); v.setUint16(32, 0, true);
  v.setUint16(34, 0, true); v.setUint16(36, 0, true);
  v.setUint32(38, 0, true); v.setUint32(42, e.offset, true);
  h.set(e.name, 46);
  return h;
}

function endOfCentralDir(count, cdSize, cdOffset) {
  const h = new Uint8Array(22);
  const v = new DataView(h.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(4, 0, true); v.setUint16(6, 0, true);
  v.setUint16(8, count, true); v.setUint16(10, count, true);
  v.setUint32(12, cdSize, true); v.setUint32(16, cdOffset, true);
  v.setUint16(20, 0, true);
  return h;
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc & 1) ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ────────────────────────────────────────────────────────────
// OOXML 보일러플레이트
// ────────────────────────────────────────────────────────────
const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="1a237e"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="200" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="283593"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:spacing w:before="160" w:after="60"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
  </w:style>
</w:styles>`;

// ────────────────────────────────────────────────────────────
// PDF 리포트 생성 — Oracle Cloud /api/pdf-render 경유
// ────────────────────────────────────────────────────────────

/**
 * 분석 결과를 PDF로 생성 (Oracle Cloud HTML→PDF 렌더러)
 * @returns {ArrayBuffer} PDF 바이너리
 */
export async function buildPdf(analysisData, serviceId, originalFilename, env) {
  const oracleBase = env.ORACLE_CONVERTER_URL || 'http://161.33.136.154:3100';
  const html = buildReportHtml(analysisData, serviceId, originalFilename);

  const res = await fetch(`${oracleBase}/api/pdf-render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, filename: originalFilename }),
    signal: AbortSignal.timeout(60000)
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`PDF 렌더링 실패 (${res.status}): ${err}`);
  }

  return res.arrayBuffer();
}

function buildReportHtml(data, serviceId, filename) {
  const title = getServiceLabel(serviceId);
  const now = new Date().toLocaleDateString('ko-KR');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Nanum Gothic', 'Malgun Gothic', sans-serif; font-size: 11pt; color: #212121; margin: 40px; }
  h1 { color: #1a237e; border-bottom: 3px solid #1a237e; padding-bottom: 8px; }
  h2 { color: #283593; margin-top: 24px; border-left: 4px solid #C9A84C; padding-left: 10px; }
  h3 { color: #37474f; }
  .score-box { background: #e8eaf6; border-radius: 8px; padding: 16px; margin: 16px 0; display: inline-block; }
  .score-big { font-size: 36pt; font-weight: 700; color: #1a237e; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #1a237e; color: #fff; padding: 8px; text-align: left; }
  td { border: 1px solid #e0e0e0; padding: 8px; vertical-align: top; }
  tr:nth-child(even) td { background: #f5f5f5; }
  .risk-high { color: #c62828; font-weight: 700; }
  .risk-mid  { color: #e65100; font-weight: 700; }
  .risk-low  { color: #2e7d32; font-weight: 700; }
  .footer { margin-top: 40px; font-size: 9pt; color: #9e9e9e; border-top: 1px solid #e0e0e0; padding-top: 8px; }
</style>
</head>
<body>
<h1>서류하나 — ${title}</h1>
<p style="color:#666">분석일: ${now} | 원본: ${filename}</p>
${buildHtmlBody(data, serviceId)}
<div class="footer">본 분석 리포트는 AI 기반 정보 제공 서비스로, 법적 효력이 없습니다. 중요 문서는 전문가 검토를 받으세요.<br>서류하나 (seolyuhana.com) — powered by Anthropic Claude</div>
</body>
</html>`;
}

function buildHtmlBody(data, serviceId) {
  if (serviceId === 'resume_analysis') return buildResumeHtml(data);
  if (serviceId === 'cover_letter_analysis') return buildCoverHtml(data);
  if (serviceId === 'cover_letter_translation') return buildTranslationHtml(data);
  if (serviceId === 'interview_questions') return buildInterviewHtml(data);
  if (['employment_contract','freelance_contract','rental_contract'].includes(serviceId)) return buildContractHtml(data);
  return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

function buildResumeHtml(d) {
  const br = d.score?.breakdown || {};
  const rows = Object.entries(br).map(([k,v]) => `<tr><td>${k}</td><td>${v}/100</td></tr>`).join('');
  const imps = (d.improvements||[]).map((imp,i) => `
    <tr><td>${i+1}</td><td>[${imp.section}]</td><td>${imp.original||''}</td><td>${imp.suggestion||''}</td><td>${imp.reason||''}</td></tr>
  `).join('');
  const missing = (d.missingItems||[]).map(m => `<li>${m}</li>`).join('');
  return `
    <div class="score-box"><span class="score-big">${d.score?.total||'-'}</span><span>/100</span></div>
    <p>${d.overallComment||''}</p>
    <h2>항목별 점수</h2><table><tr><th>항목</th><th>점수</th></tr>${rows}</table>
    <h2>강점</h2><ul>${(d.strengths||[]).map(s=>`<li>${s}</li>`).join('')}</ul>
    <h2>개선 제안</h2>
    <table><tr><th>#</th><th>섹션</th><th>원본</th><th>수정안</th><th>이유</th></tr>${imps}</table>
    ${missing?`<h2>누락 항목</h2><ul>${missing}</ul>`:''}
  `;
}

function buildCoverHtml(d) {
  const br = d.score?.breakdown || {};
  const rows = Object.entries(br).map(([k,v]) => `<tr><td>${k}</td><td>${v}/100</td></tr>`).join('');
  const incons = (d.inconsistencies||[]).map(inc => `
    <tr><td>${inc.coverLetter||''}</td><td>${inc.resumeFact||''}</td><td>${inc.fix||''}</td></tr>
  `).join('');
  const imps = (d.improvements||[]).map(imp => `
    <tr><td>${imp.question||''}</td><td>${imp.original||''}</td><td>${imp.suggestion||''}</td><td>${imp.reason||''}</td></tr>
  `).join('');
  return `
    <div class="score-box"><span class="score-big">${d.score?.total||'-'}</span>/100</div>
    <p>${d.overallComment||''}</p>
    <h2>항목별 점수</h2><table><tr><th>항목</th><th>점수</th></tr>${rows}</table>
    <h2>이력서 불일치</h2>
    <table><tr><th>자소서 구절</th><th>이력서 사실</th><th>수정 제안</th></tr>${incons}</table>
    <h2>개선 제안</h2>
    <table><tr><th>항목</th><th>원본</th><th>수정안</th><th>이유</th></tr>${imps}</table>
  `;
}

function buildTranslationHtml(d) {
  const secs = (d.sections||[]).map(s => `
    <h3>${s.title||''}</h3>
    <p><b>원문:</b> ${s.koreanOriginal||''}</p>
    <p><b>번역:</b> ${s.englishTranslation||''}</p>
    ${s.translatorNotes?`<p style="color:#6a1b9a"><b>번역 노트:</b> ${s.translatorNotes}</p>`:''}
    <hr>
  `).join('');
  const glos = (d.glossary||[]).map(g => `<tr><td>${g.korean}</td><td>${g.english}</td><td>${g.context||''}</td></tr>`).join('');
  return `${secs}
    <h2>용어 대조표</h2>
    <table><tr><th>한국어</th><th>영어</th><th>맥락</th></tr>${glos}</table>
  `;
}

function buildInterviewHtml(d) {
  return (d.categoryQuestions||[]).map(cat => `
    <h2>${cat.category}</h2>
    ${(cat.questions||[]).map((q,i) => `
      <h3>Q${i+1}. ${q.question}</h3>
      <p><b>난이도:</b> ${q.difficulty} | <b>의도:</b> ${q.intent}</p>
      <ul>${(q.answerGuide?.keyPoints||[]).map(kp=>`<li>${kp}</li>`).join('')}</ul>
      <p style="color:#2e7d32"><b>시작 예시:</b> ${q.answerGuide?.exampleOpener||''}</p>
      <p style="color:#c62828"><b>주의:</b> ${q.answerGuide?.pitfalls||''}</p>
    `).join('')}
  `).join('');
}

function buildContractHtml(d) {
  const rc = { '고위험':'risk-high','중위험':'risk-mid','저위험':'risk-low','정상':'' };
  const clauses = (d.clauses||[]).filter(c=>c.riskLevel!=='정상').map(c => `
    <tr>
      <td>${c.clauseTitle||''}</td>
      <td class="${rc[c.riskLevel]||''}">${c.riskLevel||''}</td>
      <td>${c.issue||''}</td>
      <td>${c.suggestedRevision||''}</td>
      <td>${c.legalBasis||''}</td>
    </tr>
  `).join('');
  const missing = (d.missingClauses||[]).map(m => `
    <tr><td>${m.clauseName||''}</td><td>${m.legalBasis||''}</td><td>${m.suggestedText||''}</td></tr>
  `).join('');
  return `
    <h2>위험도: <span class="${rc[d.riskLevel]||''}">${d.riskLevel||''}</span></h2>
    <p>${d.riskSummary||''}</p>
    <h2>위험 조항</h2>
    <table><tr><th>조항</th><th>위험도</th><th>문제점</th><th>수정 제안</th><th>법령</th></tr>${clauses}</table>
    ${missing?`<h2>누락 조항</h2><table><tr><th>조항명</th><th>법령</th><th>권장 문안</th></tr>${missing}</table>`:''}
    <p style="color:#9e9e9e">${d.legalDisclaimer||''}</p>
  `;
}

// ────────────────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────────────────
function getServiceLabel(serviceId) {
  const labels = {
    resume_analysis: '이력서 분석·피드백',
    cover_letter_analysis: '자기소개서 분석·피드백',
    cover_letter_translation: '자기소개서 영문 번역',
    interview_questions: '면접 예상 질문 생성',
    employment_contract: '근로계약서 검토',
    freelance_contract: '프리랜서 계약서 검토',
    rental_contract: '전월세 계약서 검토'
  };
  return labels[serviceId] || serviceId;
}
