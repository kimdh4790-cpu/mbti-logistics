#!/usr/bin/env node
// monitor-digest.json → 이번 주 트렌딩 강의소재 분석 → 새 YouTube 주제 합성
// 사용법: node generate-from-monitor.js
// 출력: stdout에 topic-id 출력 (weekly-cron.sh에서 캡처)

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DIGEST_PATH = path.join(ROOT, 'output', 'monitor-digest.json');
const USED_TOPICS_PATH = path.join(ROOT, 'output', 'used-topics.json');
const OUTPUT_DIR = path.join(ROOT, 'output', 'scripts');

function callClaude(prompt) {
  const body = Buffer.from(JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  }), 'utf8');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolve(data.content[0].text.trim());
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    process.stderr.write('ANTHROPIC_API_KEY 없음\n');
    process.exit(1);
  }

  // 최근 7일 digest 로드
  let recentItems = [];
  try {
    const allDigest = JSON.parse(fs.readFileSync(DIGEST_PATH, 'utf8'));
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    recentItems = allDigest
      .filter(d => d.date >= cutoff)
      .flatMap(d => d.items)
      .filter(i => i.category === '강의소재');
  } catch {
    process.stderr.write('monitor-digest.json 없음 — 기본 주제 사용\n');
  }

  // 이미 사용한 주제 목록
  let usedTopics = [];
  try { usedTopics = JSON.parse(fs.readFileSync(USED_TOPICS_PATH, 'utf8')); } catch {}

  let topicId, topicTitle;

  if (recentItems.length >= 3) {
    // 트렌딩 콘텐츠 기반 새 주제 합성
    const trendingSummary = recentItems.slice(0, 10)
      .map(i => `- [${i.channel}] ${i.title}`)
      .join('\n');

    const usedList = usedTopics.slice(-20).map(t => t.title).join(', ');

    const raw = await callClaude(`당신은 "AI 자동화 연구소" YouTube 채널 기획자입니다.
타겟: 한국 소상공인, 물류업자, 스타트업 대표

이번 주 AI 업계 트렌딩 영상 목록:
${trendingSummary}

이미 다룬 주제 (중복 금지): ${usedList || '없음'}

위 트렌딩 콘텐츠를 참고해서 "AI 자동화 연구소" 채널에 딱 맞는 새로운 YouTube 영상 주제를 1개 만들어주세요.
- 소상공인이 직접 쓸 수 있는 실용적 주제
- 트렌딩 내용에서 아이디어를 얻되 완전히 새로운 각도로
- 이미 다룬 주제와 겹치지 않게

JSON만 출력 (설명 없이):
{"id":"영문-소문자-하이픈","title":"한국어 영상 제목 (50자 이내)","keywords":["키워드1","키워드2","키워드3"],"category":"ai-automation"}`);

    const j = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    const parsed = JSON.parse(j);
    topicId = parsed.id;
    topicTitle = parsed.title;

    // 스크립트도 바로 생성
    const scriptRaw = await callClaude(`당신은 "AI 자동화 연구소" YouTube 채널 스크립트 작가입니다.
타겟: 한국 소상공인/물류업자. SPCL 프레임워크 적용.

주제: ${topicTitle}
키워드: ${parsed.keywords.join(', ')}

JSON만 출력:
{
  "title": "SEO 최적화 영상 제목 (50자 이내)",
  "description": "YouTube 설명 300자",
  "tags": ["태그1",...최대15개],
  "thumbnail_text": "썸네일 텍스트 20자 이내",
  "sections": [
    {"title":"섹션명","spcl_type":"intro|status|power|credibility|cta","duration_sec":40,"narration":"나레이션 텍스트 (자연스러운 구어체)","visual":"화면 설명"}
  ],
  "cta": "마지막 행동 유도 문구",
  "estimated_duration_min": 7
}`);

    const sj = scriptRaw.slice(scriptRaw.indexOf('{'), scriptRaw.lastIndexOf('}') + 1);
    const script = JSON.parse(sj);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${topicId}.json`),
      JSON.stringify({ ...script, topic_id: topicId }, null, 2)
    );

  } else {
    // digest 없으면 topics.json에서 미사용 주제 선택
    const topics = JSON.parse(fs.readFileSync(path.join(__dirname, 'topics.json'), 'utf8'));
    const usedIds = usedTopics.map(t => t.id);
    const available = topics.filter(t => !usedIds.includes(t.id));
    const topic = available.length > 0 ? available[0] : topics[Math.floor(Math.random() * topics.length)];
    topicId = topic.id;
    topicTitle = topic.title;
  }

  // 사용 이력 저장
  usedTopics.push({ id: topicId, title: topicTitle, date: new Date().toISOString().slice(0, 10) });
  usedTopics = usedTopics.slice(-52); // 1년치만 보관
  fs.mkdirSync(path.dirname(USED_TOPICS_PATH), { recursive: true });
  fs.writeFileSync(USED_TOPICS_PATH, JSON.stringify(usedTopics, null, 2));

  process.stdout.write(topicId);
}

main().catch(e => {
  process.stderr.write(`오류: ${e.message}\n`);
  process.exit(1);
});
