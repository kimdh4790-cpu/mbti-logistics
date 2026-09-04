#!/usr/bin/env node
// 인프런 인기 클립·강의 트렌드 수집
// Next.js __NEXT_DATA__ JSON에서 강의 목록 파싱
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Accept-Encoding': 'identity',
      },
    }, (res) => {
      // 리다이렉트 처리
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        resolve('');
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', () => resolve(''));
    req.setTimeout(8000, () => { req.destroy(); resolve(''); });
    req.end();
  });
}

function parseItems(html, keyword) {
  const items = [];

  // 방법1: __NEXT_DATA__ JSON 파싱 (Next.js SSR)
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      // 강의 목록은 props.pageProps.courses 또는 dehydratedState 안에 있음
      const courses = findCourses(data);
      for (const c of courses.slice(0, 5)) {
        const title = c.title || c.name;
        if (title && title.length > 3) {
          items.push({
            title,
            keyword,
            price: c.price != null ? `${c.price.toLocaleString()}원` : null,
            rating: c.rating || c.score || null,
            url: c.slug ? `https://www.inflearn.com/course/${c.slug}` : `https://www.inflearn.com/courses?s=${encodeURIComponent(keyword)}`,
          });
        }
      }
    } catch {}
  }

  // 방법2: JSON-LD 파싱 폴백
  if (items.length === 0) {
    const ldRe = /<script type="application\/ld\+json">([^<]+)<\/script>/g;
    let m;
    while ((m = ldRe.exec(html)) !== null && items.length < 5) {
      try {
        const obj = JSON.parse(m[1]);
        const list = Array.isArray(obj) ? obj : [obj];
        for (const entry of list) {
          if (entry.name && (entry['@type'] === 'Course' || entry['@type'] === 'Product')) {
            items.push({ title: entry.name, keyword, price: null, rating: null, url: entry.url || '' });
          }
        }
      } catch {}
    }
  }

  // 방법3: og:title 메타 폴백 (단일 결과만)
  if (items.length === 0) {
    const ogRe = /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/;
    const ogM = html.match(ogRe);
    if (ogM && !ogM[1].includes('인프런')) {
      items.push({ title: ogM[1].trim(), keyword, price: null, rating: null, url: '' });
    }
  }

  return items;
}

function findCourses(obj, depth = 0) {
  if (depth > 8 || !obj || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) {
    // 강의 배열인지 확인
    if (obj.length > 0 && obj[0] && typeof obj[0].title === 'string') return obj;
    for (const item of obj) {
      const found = findCourses(item, depth + 1);
      if (found.length > 0) return found;
    }
    return [];
  }
  // courses, items, list, data 키 우선 탐색
  for (const key of ['courses', 'items', 'list', 'data', 'results', 'pageProps']) {
    if (obj[key]) {
      const found = findCourses(obj[key], depth + 1);
      if (found.length > 0) return found;
    }
  }
  return [];
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
  all = all.slice(0, 14);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));

  console.log(`\n✅ 인프런 ${unique.length}건 수집 완료 → ${OUT}`);
  return unique;
}

export { main as collectInflearn };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
