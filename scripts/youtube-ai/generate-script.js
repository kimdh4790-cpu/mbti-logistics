#!/usr/bin/env node
// 영상 스크립트 자동 생성 — Claude API 사용
// 사용법: node generate-script.js --topic-id n8n-kakao-auto
// 출력: output/scripts/<topic-id>.json

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(ROOT, 'output', 'scripts');

const args = process.argv.slice(2);
const topicIdArg = args.find((a, i) => args[i - 1] === '--topic-id');

if (!topicIdArg) {
  console.error('사용법: node generate-script.js --topic-id <id>');
  process.exit(1);
}

const topics = JSON.parse(fs.readFileSync(path.join(__dirname, 'topics.json'), 'utf8'));
const topic = topics.find(t => t.id === topicIdArg);
if (!topic) {
  console.error(`주제를 찾을 수 없음: ${topicIdArg}`);
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateScript() {
  console.log(`스크립트 생성 중: ${topic.title}`);

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `당신은 한국 소상공인을 위한 AI 자동화 YouTube 채널 "AI 자동화 연구소"의 스크립트 작가입니다.

주제: ${topic.title}
키워드: ${topic.keywords.join(', ')}
카테고리: ${topic.category}

다음 형식으로 정확히 JSON만 출력하세요 (설명 없이):
{
  "title": "영상 제목 (한국어, SEO 최적화, 50자 이내)",
  "description": "영상 설명 (YouTube용, 300자, 키워드 자연스럽게 포함)",
  "tags": ["태그1", "태그2", ...최대 15개],
  "thumbnail_text": "썸네일에 들어갈 짧은 텍스트 (20자 이내)",
  "sections": [
    {
      "title": "섹션 제목",
      "duration_sec": 30,
      "narration": "실제 나레이션 텍스트 (자연스러운 한국어 구어체, 친근한 톤)",
      "visual": "화면에 보여줄 것 설명 (화면캡처/텍스트/다이어그램)"
    }
  ],
  "cta": "영상 마지막 행동 유도 문구 (FILO 또는 DONWAY 앱 체험으로 연결)",
  "estimated_duration_min": 7
}

섹션은 5~8개. 총 영상 길이 6~10분. 나레이션은 실제 읽을 수 있는 수준으로 상세하게.`
    }]
  });

  const raw = message.content[0].text.trim();
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}') + 1;
  const script = JSON.parse(raw.slice(jsonStart, jsonEnd));

  const outPath = path.join(OUTPUT_DIR, `${topic.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ ...script, topic_id: topic.id }, null, 2));
  console.log(`저장 완료: ${outPath}`);
  console.log(`제목: ${script.title}`);
  console.log(`예상 길이: ${script.estimated_duration_min}분`);
  console.log(`섹션 수: ${script.sections.length}개`);
}

generateScript().catch(console.error);
