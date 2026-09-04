#!/usr/bin/env node
// Product Hunt 신제품 수집 — SaaS / AI / No-code 카테고리 필터
// 출력: output/producthunt-digest.json

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'output', 'producthunt-digest.json');

const TOPICS = ['artificial-intelligence', 'no-code', 'saas', 'productivity', 'developer-tools'];
const RELEVANT_TAGS = ['ai', 'automation', 'no-code', 'saas', 'workflow', 'api', 'small-business', 'analytics', 'pos'];

function fetchTopic(topic) {
  return new Promise((resolve) => {
    const req = https.request(`https://www.producthunt.com/topics/${topic}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
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

function parseProducts(html, topic) {
  const products = [];
  // JSON-LD 또는 og:title 기반 파싱
  const ldRe = /"name"\s*:\s*"([^"]{5,80})"/g;
  const descRe = /"description"\s*:\s*"([^"]{10,200})"/g;

  const names = [];
  const descs = [];
  let m;
  while ((m = ldRe.exec(html)) !== null) names.push(m[1]);
  while ((m = descRe.exec(html)) !== null) descs.push(m[1]);

  // 상위 8개만
  for (let i = 0; i < Math.min(8, names.length); i++) {
    if (names[i] && !names[i].includes('Product Hunt')) {
      products.push({
        name: names[i],
        description: descs[i] || '',
        topic,
        url: `https://www.producthunt.com/topics/${topic}`,
      });
    }
  }
  return products;
}

async function main() {
  console.log(`[${new Date().toISOString()}] Product Hunt 트렌드 수집 시작`);
  const results = [];

  for (const topic of TOPICS) {
    try {
      console.log(`  토픽: ${topic}`);
      const html = await fetchTopic(topic);
      const products = parseProducts(html, topic);
      results.push(...products);
      console.log(`    → ${products.length}건`);
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ❌ ${topic}: ${err.message}`);
    }
  }

  const seen = new Set();
  const unique = results.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
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

  console.log(`\n✅ Product Hunt ${unique.length}건 수집 완료 → ${OUT}`);
  return unique;
}

export { main as collectProductHunt };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
