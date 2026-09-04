#!/usr/bin/env node
// 인프런 인기 클립·강의 트렌드 수집
// 키워드: AI, 자동화, n8n, 소상공인, 노코드, SaaS, 수익화
// 출력: output/inflearn-digest.json

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'output', 'inflearn-digest.json');

const KEYWORDS = [
  'n8n', 'AI 자동화', '노코드', '소상공인', 'SaaS', '수익화',
  '업무자동화', 'Claude API', '카카오 알림톡', '엑셀 자동화',
];

function fetchPage(keyword) {
  const q = encodeURIComponent(keyword);
  const url = `https://www.inflearn.com/courses?s=${q}&order=popular&types=clip`;
  return new Promise((resolve) => {
    const req = https.request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', () => resolve(''));
    req.end();
  });
}

function parseItems(html, keyword) {
  const items = [];
  // 강의 카드 타이틀 파싱 (og 태그 없이 HTML에서 직접)
  const titleRe = /<div[^>]+class="[^"]*course-title[^"]*"[^>]*>([^<]+)<\/div>/g;
  const priceRe = /(\d{1,3}(?:,\d{3})*)\s*원/g;
  const ratingRe = /(\d+\.\d+)\s*점/g;

  let m;
  while ((m = titleRe.exec(html)) !== null) {
    const title = m[1].trim();
    if (title && title.length > 3) {
      items.push({ title, keyword, url: `https://www.inflearn.com/courses?s=${encodeURIComponent(keyword)}&order=popular` });
    }
    if (items.filter(i => i.keyword === keyword).length >= 5) break;
  }

  // 가격 정보
  const prices = [];
  let pm;
  while ((pm = priceRe.exec(html)) !== null) prices.push(pm[1]);

  // 평점
  const ratings = [];
  let rm;
  while ((rm = ratingRe.exec(html)) !== null) ratings.push(parseFloat(rm[1]));

  return items.map((item, i) => ({
    ...item,
    price: prices[i] ? `${prices[i]}원` : null,
    rating: ratings[i] || null,
  }));
}

async function main() {
  console.log(`[${new Date().toISOString()}] 인프런 트렌드 수집 시작`);
  const results = [];

  for (const kw of KEYWORDS) {
    try {
      console.log(`  검색: ${kw}`);
      const html = await fetchPage(kw);
      const items = parseItems(html, kw);
      results.push(...items);
      console.log(`    → ${items.length}건`);
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(`  ❌ ${kw}: ${err.message}`);
    }
  }

  // 중복 제거 (타이틀 기준)
  const seen = new Set();
  const unique = results.filter(i => {
    if (seen.has(i.title)) return false;
    seen.add(i.title);
    return true;
  });

  const today = new Date().toISOString().slice(0, 10);
  const entry = { date: today, count: unique.length, items: unique };

  let all = [];
  try { all = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
  all.unshift(entry);
  all = all.slice(0, 14); // 2주치
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));

  console.log(`\n✅ 인프런 ${unique.length}건 수집 완료 → ${OUT}`);
  return unique;
}

export { main as collectInflearn };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
