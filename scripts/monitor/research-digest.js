#!/usr/bin/env node
// 주간 정보수집 종합 다이제스트
// 1. 인프런 트렌드 수집
// 2. Product Hunt 신제품 수집
// 3. YouTube 콘텐츠 모니터링 결과 로드
// 4. Claude Haiku로 카테고리별 요약
// 5. output/research-digest-{date}.json 저장 + SMS 발송
//
// 실행: node scripts/monitor/research-digest.js
// cron: 매주 월요일 08:00 KST (23:00 UTC 일요일)

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { collectInflearn } from './inflearn-monitor.js';
import { collectProductHunt } from './producthunt-monitor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DIGEST_PATH = path.join(ROOT, 'output', 'monitor-digest.json');
const OUT_DIR = path.join(ROOT, 'output');

async function classifyResearch(items, source) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('  ANTHROPIC_API_KEY 없음 — 분류 건너뜀');
    return items.map(i => ({ ...i, category: '미분류', reason: 'API키 없음' }));
  }

  const titles = items.slice(0, 20).map((it, idx) => `${idx + 1}. ${it.title || it.name}`).join('\n');

  const prompt = `MBTICO 관점에서 아래 ${source} 항목들을 분류해줘.
MBTICO: 소상공인 SaaS (FILO 매장관리POS, DONWAY 정산, 용차앱), "AI 자동화 연구소" YouTube+인프런 채널.

항목 목록:
${titles}

분류 기준:
- 강의소재: AI·자동화·노코드·개발·SaaS·마케팅·수익화 강의로 쓸 수 있는 것
- 앱기능: FILO(매장POS)/DONWAY(정산)/용차앱에 추가할 기능·UX 아이디어
- 수익성: 새로운 수익 모델·사업 기회·트렌드 — 돈이 될 가능성 있는 것
- 패스: 무관한 것

JSON 배열로 응답: [{"idx":1,"category":"강의소재","reason":"한줄이유"}, ...]`;

  const body = Buffer.from(JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  }), 'utf8');

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const raw = data.content[0].text;
          const j = raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
          const classifications = JSON.parse(j);
          const result = items.slice(0, 20).map((item, i) => {
            const cls = classifications.find(c => c.idx === i + 1) || {};
            return { ...item, category: cls.category || '패스', reason: cls.reason || '' };
          });
          resolve(result);
        } catch {
          resolve(items.map(i => ({ ...i, category: '패스', reason: '분류 실패' })));
        }
      });
    });
    req.on('error', () => resolve(items.map(i => ({ ...i, category: '패스', reason: '네트워크 오류' }))));
    req.write(body);
    req.end();
  });
}

async function sendSMS(message) {
  const { ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER, ADMIN_PHONE } = process.env;
  if (!ALIGO_API_KEY || !ADMIN_PHONE) return;
  const body = new URLSearchParams({
    key: ALIGO_API_KEY, user_id: ALIGO_USER_ID,
    sender: ALIGO_SENDER, receiver: ADMIN_PHONE,
    msg: message, msg_type: 'SMS',
  });
  try {
    await fetch('https://apis.aligo.in/send/', { method: 'POST', body });
  } catch {}
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`\n[${new Date().toISOString()}] 주간 정보수집 다이제스트 시작`);

  // 1. 인프런 수집
  console.log('\n▶ 인프런 트렌드 수집');
  const inflearnItems = await collectInflearn();

  // 2. Product Hunt 수집
  console.log('\n▶ Product Hunt 신제품 수집');
  const phItems = await collectProductHunt();

  // 3. YouTube 모니터링 결과 로드 (어제 실행된 것)
  let ytItems = [];
  try {
    const allDigest = JSON.parse(fs.readFileSync(DIGEST_PATH, 'utf8'));
    const latest = allDigest[0];
    if (latest && latest.items) {
      ytItems = latest.items.filter(i => i.category !== '패스');
      console.log(`\n▶ YouTube 모니터링 로드: ${ytItems.length}건 (${latest.date})`);
    }
  } catch {
    console.log('\n▶ YouTube 모니터링 결과 없음');
  }

  // 4. Claude 분류
  console.log('\n▶ Claude Haiku 분류');
  const [inflearnClassified, phClassified] = await Promise.all([
    classifyResearch(inflearnItems, '인프런'),
    classifyResearch(phItems, 'ProductHunt'),
  ]);

  const allClassified = [
    ...inflearnClassified.map(i => ({ ...i, source: '인프런' })),
    ...phClassified.map(i => ({ ...i, source: 'ProductHunt' })),
    ...ytItems.map(i => ({ ...i, source: 'YouTube', category: i.category })),
  ].filter(i => i.category !== '패스');

  // 5. 카테고리별 정리
  const byCategory = {};
  for (const item of allClassified) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  // 6. 저장
  const digest = { date: today, total: allClassified.length, byCategory };
  const outPath = path.join(OUT_DIR, `research-digest-${today}.json`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(digest, null, 2));

  // 7. 콘솔 출력
  console.log(`\n📊 주간 정보수집 결과 — ${today}`);
  console.log(`총 ${allClassified.length}건 (패스 제외)`);
  for (const [cat, items] of Object.entries(byCategory)) {
    console.log(`\n[${cat}] ${items.length}건`);
    items.slice(0, 5).forEach(i => {
      const name = i.title || i.name;
      console.log(`  • [${i.source}] ${name}`);
      if (i.reason) console.log(`    → ${i.reason}`);
    });
  }

  // 8. SMS 발송
  const smsLines = allClassified.slice(0, 5).map(
    i => `[${i.category}][${i.source}] ${(i.title || i.name || '').slice(0, 25)}`
  );
  const smsMsg = `[MBTICO 주간리서치] ${today}\n총${allClassified.length}건\n${smsLines.join('\n')}`;
  await sendSMS(smsMsg);

  console.log(`\n저장: ${outPath}`);
  return digest;
}

main().catch(console.error);
