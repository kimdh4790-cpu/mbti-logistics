#!/usr/bin/env node
// Product Hunt 신제품 수집 — RSS 피드 파싱 (API Key 불필요)
// 출력: output/producthunt-digest.json

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'output', 'producthunt-digest.json');

const RELEVANT_TAGS = ['ai', 'automation', 'no-code', 'saas', 'workflow', 'api', 'small-business', 'analytics', 'pos', 'productivity'];

function fetchRSS(url) {
  return new Promise((resolve) => {
    const req = https.request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Encoding': 'identity',
      },
    }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        fetchRSS(res.headers.location).then(resolve);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', () => resolve(''));
    req.setTimeout(10000, () => { req.destroy(); resolve(''); });
    req.end();
  });
}

function parseRSS(xml) {
  const products = [];
  // <item> 블록 추출
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null && products.length < 30) {
    const block = m[1];

    const title = extractTag(block, 'title');
    const desc = extractTag(block, 'description') || extractTag(block, 'content:encoded') || '';
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const categories = extractAllTags(block, 'category');

    if (!title || title.length < 3) continue;

    // 관련 태그 필터 (없으면 전체 포함)
    const cats = categories.map(c => c.toLowerCase());
    const isRelevant = cats.length === 0 || cats.some(c => RELEVANT_TAGS.some(t => c.includes(t)));

    products.push({
      name: decodeEntities(title),
      description: decodeEntities(desc.replace(/<[^>]+>/g, '').trim()).slice(0, 200),
      url: link || '',
      categories,
      pubDate,
      relevant: isRelevant,
    });
  }
  return products;
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}(?:[^>]*)>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractAllTags(xml, tag) {
  const re = new RegExp(`<${tag}(?:[^>]*)>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'gi');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

async function main() {
  console.log(`[${new Date().toISOString()}] Product Hunt RSS 수집 시작`);

  const xml = await fetchRSS('https://www.producthunt.com/feed');
  const all = parseRSS(xml);
  const relevant = all.filter(p => p.relevant);

  console.log(`  전체 ${all.length}건 → 관련 ${relevant.length}건`);

  const today = new Date().toISOString().slice(0, 10);
  const entry = { date: today, count: relevant.length, items: relevant };

  let history = [];
  try { history = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
  history.unshift(entry);
  history = history.slice(0, 14);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(history, null, 2));

  console.log(`\n✅ Product Hunt ${relevant.length}건 수집 완료 → ${OUT}`);
  return relevant;
}

export { main as collectProductHunt };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
